using GateWay.App;
using GateWay.Filters; // ✅ إضافة الـ using
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ActionConstraints;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace GateWay.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    //[Authorize]
    [ServiceFilter(typeof(AutoDecryptFilter))]
    [ServiceFilter(typeof(GateWay.Security.DataApiAuthFilter))]
    public class ManageDataSQLController : ControllerBase
    {
        private readonly SQLServer _service = new SQLServer();
        private readonly GateWay.Security.SensitiveDataGuard _guard;
        private readonly ERP.Numbering.NumberingService _numbering;
        private readonly ERP.CustomFields.CustomFieldService _customFields;
        private readonly ERP.Audit.AuditService _audit;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _cfg;

        public ManageDataSQLController(GateWay.Security.SensitiveDataGuard guard,
            ERP.Numbering.NumberingService numbering, ERP.CustomFields.CustomFieldService customFields,
            ERP.Audit.AuditService audit, Microsoft.Extensions.Configuration.IConfiguration cfg)
        {
            _guard = guard;
            _numbering = numbering;
            _customFields = customFields;
            _audit = audit;
            _cfg = cfg;
        }

        private bool FeatNumbering => _cfg.GetValue<bool?>("Features:Numbering") ?? true;
        private bool FeatCustomFields => _cfg.GetValue<bool?>("Features:CustomFields") ?? true;
        private int? CurrentUserId => int.TryParse(User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) ? id : (int?)null;

        // §6.12: does any save-pipeline step apply to this table? (cheap cached checks; plain screens skip the hook)
        private async Task<bool> PipelineAppliesAsync(string table, bool hasExtra)
        {
            if (hasExtra && FeatCustomFields) return true;
            if (FeatNumbering && await _numbering.HasBindingAsync(table)) return true;
            if (FeatCustomFields && await _customFields.HasEntityAsync(table)) return true;
            if (await _audit.GetPolicyAsync(table) != null) return true;
            return false;
        }

        [HttpPost("GetDataFromSql")]
        public async Task<IActionResult> GetDataFromSql([FromBody] List<TableModel> Entity)
        {
            var Res = await _service.Get_DataFromSql(Entity);
            // W0-2: redact sensitive columns (procs trusted)
            if (Res != null && Entity != null)
                for (int i = 0; i < Entity.Count && i < Res.Count; i++)
                    if (!Entity[i].IsProc)
                        _guard.Redact(Entity[i].NameTable, Res[i]);
            return Ok(JsonConvert.SerializeObject(Res));
        }

        // 🔥 SELECT - يدعم Tables و Stored Procedures
        [HttpPost("Query")]
        public async Task<IActionResult> Query([FromBody] List<TableModel> tables)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                var results = new List<Dictionary<string, object>>[tables.Count];

                await Parallel.ForEachAsync(
                    tables.Select((item, index) => (item, index)),
                    new ParallelOptions { MaxDegreeOfParallelism = 10 },
                    async (data, ct) =>
                    {
                        var cacheKey = $"select_{data.item.NameTable}_{data.item.Condition}";

                        switch (data.item.CacheFlag)
                        {
                            case 1: // ✅ Get from cache
                                var cachedRes = await _service.Get_DataFromSql(data.item, true, cacheKey);
                                results[data.index] = cachedRes;
                                break;

                            case 2: // ✅ Delete cache and get fresh data
                                await _service.DeleteCacheByKey(cacheKey);
                                var freshRes = await _service.Get_DataFromSql(data.item, false, cacheKey);
                                results[data.index] = freshRes;
                                break;

                            case 3: // ✅ Force refresh (delete + get + recache)
                                await _service.DeleteCacheByKey(cacheKey);
                                var refreshedRes = await _service.Get_DataFromSql(data.item, true, cacheKey);
                                results[data.index] = refreshedRes;
                                break;

                            default: // ✅ No cache
                                var normalRes = await _service.Get_DataFromSql(data.item, false, null);
                                results[data.index] = normalRes;
                                break;
                        }
                    });

                // W0-2: strip sensitive columns from table reads (procs are trusted).
                for (int i = 0; i < tables.Count; i++)
                    if (!tables[i].IsProc)
                        _guard.Redact(tables[i].NameTable, results[i]);

                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(results, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, ex.Message)));
            }
        }
        // 🔥 INSERT Single
        [HttpPost("Insert")]
        public async Task<IActionResult> Insert([FromBody] InsertRequest request)
        {
            try
            { 

                var sw = Stopwatch.StartNew();
                var dict = _service.JsonToDictionary(request.Data);
                var extra = _customFields.SplitExtra(dict);   // §6.12: remove __extra before the insert
                _guard.CheckWrite(request.TableName, dict.Keys); // W0-2
                object result;
                if (!await PipelineAppliesAsync(request.TableName, extra != null))
                {
                    // plain screen: original path, byte-for-byte unchanged
                    result = await _service.Insert(request.TableName, dict);
                }
                else
                {
                    var uid = CurrentUserId;
                    result = await _service.ExecuteTransaction(async (con, tran) =>
                    {
                        if (FeatNumbering) await _numbering.FillAsync(con, tran, request.TableName, dict);     // gapless number inside the tran
                        var ins = await _service.InsertAutoWithResult(con, tran, request.TableName, dict);
                        var recordKey = ins.InsertedId?.ToString();
                        if (extra != null && FeatCustomFields && recordKey != null)
                            await _customFields.SaveExtraAsync(con, tran, request.TableName, recordKey, extra, uid);
                        var pol = await _audit.GetPolicyAsync(request.TableName);
                        if (pol != null && pol.AuditInsert)
                            await _audit.CaptureAsync(con, tran, "I", pol, request.TableName, recordKey, null, ins.InsertedRow ?? dict, uid, null, null);
                        return (object)ins;
                    });
                }
                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, ex.Message)));
            }
        }

        // 🔥 INSERT Multiple
        [HttpPost("insert-list")]
        public async Task<IActionResult> InsertList([FromBody] InsertListRequest request)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                var dataList = request.DataList.Select(d => _service.JsonToDictionary(d)).ToList();
                _guard.CheckWrite(request.TableName); // W0-2
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    return await _service.InsertAuto(con, tran, request.TableName, dataList);
                });
                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, ex.Message)));
            }
        }

        // 🔥 UPDATE Single
        [HttpPut("Update")]
        public async Task<IActionResult> Update([FromBody] UpdateRequest request)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                var dict = _service.JsonToDictionary(request.Data);
                var extra = _customFields.SplitExtra(dict);   // §6.12
                _guard.CheckWrite(request.TableName, dict.Keys); // W0-2
                int result;
                if (!await PipelineAppliesAsync(request.TableName, extra != null))
                {
                    result = await _service.ExecuteTransaction(async (con, tran) =>
                        await _service.UpdateAuto(con, tran, request.TableName, dict, request.KeyColumn));
                }
                else
                {
                    var uid = CurrentUserId;
                    var keyCol = string.IsNullOrEmpty(request.KeyColumn) ? "Id" : request.KeyColumn;
                    object? keyVal = dict.TryGetValue(keyCol, out var kv) ? kv : null;
                    result = await _service.ExecuteTransaction(async (con, tran) =>
                    {
                        var pol = await _audit.GetPolicyAsync(request.TableName);
                        System.Collections.Generic.Dictionary<string, object?>? oldRow = null;
                        if (pol != null && pol.AuditUpdate && keyVal != null)
                            oldRow = await _audit.LoadOldAsync(con, tran, request.TableName, keyCol, keyVal);
                        var rows = await _service.UpdateAuto(con, tran, request.TableName, dict, keyCol);
                        var recordKey = keyVal?.ToString();
                        if (extra != null && FeatCustomFields && recordKey != null)
                            await _customFields.SaveExtraAsync(con, tran, request.TableName, recordKey, extra, uid);
                        if (pol != null && pol.AuditUpdate)
                            await _audit.CaptureAsync(con, tran, "U", pol, request.TableName, recordKey, oldRow, dict, uid, null, null);
                        return rows;
                    });
                }
                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, ex.Message)));
            }
        }

        // 🔥 UPDATE Multiple
        [HttpPut("update-list")]
        public async Task<IActionResult> UpdateList([FromBody] UpdateListRequest request)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                var dataList = request.DataList.Select(d => _service.JsonToDictionary(d)).ToList();
                _guard.CheckWrite(request.TableName); // W0-2
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    return await _service.UpdateAuto(con, tran, request.TableName, dataList, request.KeyColumn);
                });
                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, ex.Message)));
            }
        }

        // 🔥 DELETE
        [HttpDelete("delete")]
        public async Task<IActionResult> Delete([FromBody] DeleteRequest request)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                _guard.CheckWrite(request.TableName); // W0-2
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    return await _service.DeleteList(con, tran, request.TableName, request.Ids.Cast<object>().ToList(), request.KeyColumn);
                });
                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, ex.Message)));
            }
        }

        // 🔥 BULK INSERT
        [HttpPost("bulk-insert")]
        public async Task<IActionResult> BulkInsert([FromBody] BulkInsertRequest request)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                var dataList = request.DataList.Select(d => _service.JsonToDictionary(d)).ToList();
                _guard.CheckWrite(request.TableName); // W0-2
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    return await _service.BulkInsertUltraFast(con, tran, request.TableName, dataList);
                });
                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, ex.Message)));
            }
        }

        // 🔥 BULK UPDATE
        [HttpPut("bulk-update")]
        public async Task<IActionResult> BulkUpdate([FromBody] BulkUpdateRequest request)
        {
            try
            {
                var sw = Stopwatch.StartNew();
                var dataList = request.DataList.Select(d => _service.JsonToDictionary(d)).ToList();
                _guard.CheckWrite(request.TableName); // W0-2
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    return await _service.BulkUpdateUltraFast(con, tran, request.TableName, dataList, request.KeyColumn);
                });
                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, ex.Message)));
            }
        }


        //**********************************************


        [HttpPost("InsertMasterDetail")]
        public async Task<IActionResult> InsertMasterDetail([FromBody] ModelInsertMasterDetail request)
        {
            var sw = Stopwatch.StartNew();

            if (request == null)
                return BadRequest(new BaseResponse(HttpStatusCode.BadRequest, "Invalid request"));

            try
            {
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    // 1️⃣ INSERT MASTER
                    var masterDict = _service.JsonToDictionary(request.Master.Data);
                    var masterResult = await _service.InsertAutoWithResult(con, tran,
                        request.Master.TableName, masterDict);

                    // ✅ استخراج Master ID باستخدام MasterKeyColumn
                    object masterId = masterResult.InsertedId;
                    if (masterId == null && masterDict.ContainsKey(request.MasterKeyColumn))
                        masterId = masterDict[request.MasterKeyColumn];

                    // 2️⃣ DELETE DETAILS
                    var deleteTasks = new List<Task<int>>();
                    var deleteTableNames = new List<string>();

                    // ✅ دالة مساعدة للحذف مع دعم Foreign Key مختلف
                    async Task ProcessDeleteDetails(DetailWrapper? detail, string detailName)
                    {
                        if (detail?.Delete_Details?.Ids?.Any() == true)
                        {
                            // ✅ استخدام DetailForeignKeyColumn إذا موجود، وإلا استخدم MasterKeyColumn
                            string foreignKeyColumn = detail.DetailForeignKeyColumn ?? request.MasterKeyColumn;

                            // ✅ تحديث الـ Ids في الـ Detail (إذا لزم الأمر)
                            // ملاحظة: هنا نفترض أن Ids هي قيم المفتاح الأجنبي، وليست المفتاح الأساسي للـ Detail
                            deleteTasks.Add(Task.FromResult(await _service.DeleteListByForeignKey(con, tran,
                                detail.Delete_Details.TableName,
                                foreignKeyColumn,
                                detail.Delete_Details.Ids.Cast<object>().ToList())));
                            deleteTableNames.Add(detail.Delete_Details.TableName);
                        }
                    }

                    await ProcessDeleteDetails(request.Detail_1, "Detail_1");
                    await ProcessDeleteDetails(request.Detail_2, "Detail_2");
                    await ProcessDeleteDetails(request.Detail_3, "Detail_3");
                    await ProcessDeleteDetails(request.Detail_4, "Detail_4");
                    await ProcessDeleteDetails(request.Detail_5, "Detail_5");

                    var deleteResults = deleteTasks.Any() ? await Task.WhenAll(deleteTasks) : Array.Empty<int>();

                    // 3️⃣ INSERT DETAILS
                    var insertTasks = new List<Task<int>>();
                    var insertTableNames = new List<string>();

                    async Task AddInsertTask(DetailWrapper? detail)
                    {
                        if (detail?.BulkInsertRequest?.DataList?.Any() == true)
                        {
                            var detailList = detail.BulkInsertRequest.DataList
                                .Select(d => _service.JsonToDictionary(d))
                                .ToList();

                            // ✅ استخدام DetailForeignKeyColumn إذا موجود، وإلا استخدم MasterKeyColumn
                            string foreignKeyColumn = detail.DetailForeignKeyColumn ?? request.MasterKeyColumn;

                            Parallel.ForEach(detailList, item =>
                            {
                                item[foreignKeyColumn] = masterId;
                            });

                            // تنفيذ تسلسلي: نفس الـ connection/transaction مابيدعمش MARS (أكتر من تفصيلة كانت بتفشل)
                            insertTasks.Add(Task.FromResult(await _service.BulkInsertUltraFast(con, tran,
                                detail.BulkInsertRequest.TableName, detailList)));
                            insertTableNames.Add(detail.BulkInsertRequest.TableName);
                        }
                    }

                    await AddInsertTask(request.Detail_1);
                    await AddInsertTask(request.Detail_2);
                    await AddInsertTask(request.Detail_3);
                    await AddInsertTask(request.Detail_4);
                    await AddInsertTask(request.Detail_5);

                    var insertResults = insertTasks.Any() ? await Task.WhenAll(insertTasks) : Array.Empty<int>();

                    // 4️⃣ RUN STORED PROCEDURE
                    int? trNo = null;
                    int? ok = null;
                    int? returnValue = null;

                    if (request.RunProcessTrans)
                    {
                        var spResult = await _service.RunProcessTrans(
                            con, tran,
                            request.CompCode,
                            request.BranchCode,
                            request.KeyTrType ?? "",
                            "Add",
                            Convert.ToInt32(masterId)
                        );

                        returnValue = spResult.ReturnValue;
                        trNo = spResult.TrNo;
                        ok = spResult.Ok;

                        if (ok != 1)
                        {
                            throw new Exception($"ProcessTrans failed: ReturnValue={returnValue}, TrNo={trNo}, Ok={ok}");
                        }
                    }

                    return new
                    {
                        Master = new
                        {
                            Id = masterId,
                            RowsAffected = masterResult.RowsAffected,
                            Data = masterResult.InsertedRow
                        },
                        ProcessTrans = trNo.HasValue ? new
                        {
                            ReturnValue = returnValue,
                            TrNo = trNo,
                            Ok = ok,
                            IsSuccess = ok == 1
                        } : null,
                        Deleted = deleteTableNames.Zip(deleteResults, (table, count) => new { Table = table, Count = count }).ToList(),
                        Inserted = insertTableNames.Zip(insertResults, (table, count) => new { Table = table, Count = count }).ToList(),
                        Summary = new
                        {
                            HasDetails = insertTasks.Any(),
                            HasDeletes = deleteTasks.Any(),
                            HasProcessTrans = request.RunProcessTrans,
                            TotalTimeMs = sw.ElapsedMilliseconds
                        }
                    };
                });

                // مسح Cache
                var affectedTables = new HashSet<string> { request.Master.TableName };
                var detailTables = new[]
                {
            request.Detail_1?.BulkInsertRequest?.TableName,
            request.Detail_2?.BulkInsertRequest?.TableName,
            request.Detail_3?.BulkInsertRequest?.TableName,
            request.Detail_4?.BulkInsertRequest?.TableName,
            request.Detail_5?.BulkInsertRequest?.TableName
        };

                foreach (var table in detailTables)
                {
                    if (!string.IsNullOrEmpty(table))
                        affectedTables.Add(table);
                }

                SQLServer.ClearTablesCache(affectedTables);

                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                sw.Stop();
                return StatusCode(500, JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.InternalServerError, ex.Message)));
            }
        }
        [HttpPut("UpdateMasterDetail")]
        public async Task<IActionResult> UpdateMasterDetail([FromBody] ModelUpdateMasterDetail request)
        {
            var sw = Stopwatch.StartNew();

            if (request == null)
                return BadRequest(new BaseResponse(HttpStatusCode.BadRequest, "Invalid request"));

            try
            {
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    // 1️⃣ UPDATE MASTER
                    var masterDict = _service.JsonToDictionary(request.Master.Data);
                    var masterResult = await _service.UpdateAutoWithResult(con, tran,
                        request.Master.TableName, masterDict, request.Master.KeyColumn);

                    // ✅ استخراج Master ID باستخدام MasterKeyColumn
                    object masterId = masterResult.UpdatedId ?? masterResult.UpdatedIds.FirstOrDefault();
                    if (masterId == null && masterDict.ContainsKey(request.MasterKeyColumn))
                        masterId = masterDict[request.MasterKeyColumn];

                    // 2️⃣ DELETE DETAILS (باستخدام DeleteAllRelated أو Ids محددة)
                    var deleteTasks = new List<Task<int>>();
                    var deleteTableNames = new List<string>();

                    async Task ProcessDeleteDetails(DetailWrapper? detail)
                    {
                        if (detail?.Delete_Details == null) return;

                        // ✅ استخدام DetailForeignKeyColumn إذا موجود، وإلا استخدم MasterKeyColumn
                        string foreignKeyColumn = detail.DetailForeignKeyColumn ?? request.MasterKeyColumn;

                        if (detail.Delete_Details.DeleteAllRelated && Convert.ToInt32(masterId) > 0)
                        {
                            // ✅ حذف كل التفاصيل المرتبطة (أسرع طريقة)
                            var result = await _service.DeleteAllRelatedByMasterId(con, tran,
                                detail.Delete_Details.TableName,
                                foreignKeyColumn,
                                Convert.ToInt32(masterId));
                            deleteTableNames.Add(detail.Delete_Details.TableName);
                            deleteTasks.Add(Task.FromResult(result.RowsAffected));
                        }
                        else if (detail.Delete_Details.Ids?.Any() == true)
                        {
                            // ✅ حذف تفاصيل محددة
                            deleteTasks.Add(Task.FromResult(await _service.DeleteListByForeignKey(con, tran,
                                detail.Delete_Details.TableName,
                                foreignKeyColumn,
                                detail.Delete_Details.Ids.Cast<object>().ToList())));
                            deleteTableNames.Add(detail.Delete_Details.TableName);
                        }
                    }

                    await ProcessDeleteDetails(request.Detail_1);
                    await ProcessDeleteDetails(request.Detail_2);
                    await ProcessDeleteDetails(request.Detail_3);
                    await ProcessDeleteDetails(request.Detail_4);
                    await ProcessDeleteDetails(request.Detail_5);

                    var deleteResults = deleteTasks.Any() ? await Task.WhenAll(deleteTasks) : Array.Empty<int>();

                    // 3️⃣ INSERT DETAILS
                    var insertTasks = new List<Task<int>>();
                    var insertTableNames = new List<string>();

                    async Task AddInsertTask(DetailWrapper? detail)
                    {
                        if (detail?.BulkInsertRequest?.DataList?.Any() == true)
                        {
                            var detailList = detail.BulkInsertRequest.DataList
                                .Select(d => _service.JsonToDictionary(d))
                                .ToList();

                            // ✅ استخدام DetailForeignKeyColumn إذا موجود، وإلا استخدم MasterKeyColumn
                            string foreignKeyColumn = detail.DetailForeignKeyColumn ?? request.MasterKeyColumn;

                            Parallel.ForEach(detailList, item =>
                            {
                                item[foreignKeyColumn] = masterId;
                            });

                            // تنفيذ تسلسلي: نفس الـ connection/transaction مابيدعمش MARS (أكتر من تفصيلة كانت بتفشل)
                            insertTasks.Add(Task.FromResult(await _service.BulkInsertUltraFast(con, tran,
                                detail.BulkInsertRequest.TableName, detailList)));
                            insertTableNames.Add(detail.BulkInsertRequest.TableName);
                        }
                    }

                    await AddInsertTask(request.Detail_1);
                    await AddInsertTask(request.Detail_2);
                    await AddInsertTask(request.Detail_3);
                    await AddInsertTask(request.Detail_4);
                    await AddInsertTask(request.Detail_5);

                    var insertResults = insertTasks.Any() ? await Task.WhenAll(insertTasks) : Array.Empty<int>();

                    // 4️⃣ RUN STORED PROCEDURE
                    int? trNo = null;
                    int? ok = null;
                    int? returnValue = null;

                    if (request.RunProcessTrans)
                    {
                        var spResult = await _service.RunProcessTrans(
                            con, tran,
                            request.CompCode,
                            request.BranchCode,
                            request.KeyTrType ?? "",
                            "Update",
                            Convert.ToInt32(masterId)
                        );

                        returnValue = spResult.ReturnValue;
                        trNo = spResult.TrNo;
                        ok = spResult.Ok;

                        if (ok != 1)
                        {
                            throw new Exception($"ProcessTrans failed: ReturnValue={returnValue}, TrNo={trNo}, Ok={ok}");
                        }
                    }

                    return new
                    {
                        Master = new
                        {
                            Id = masterId,
                            RowsAffected = masterResult.RowsAffected,
                            OldData = masterResult.OldRow,
                            NewData = masterResult.UpdatedRow
                        },
                        ProcessTrans = trNo.HasValue ? new
                        {
                            ReturnValue = returnValue,
                            TrNo = trNo,
                            Ok = ok,
                            IsSuccess = ok == 1
                        } : null,
                        Deleted = deleteTableNames.Zip(deleteResults, (table, count) => new { Table = table, Count = count }).ToList(),
                        Inserted = insertTableNames.Zip(insertResults, (table, count) => new { Table = table, Count = count }).ToList(),
                        Summary = new
                        {
                            HasDetails = insertTasks.Any(),
                            HasDeletes = deleteTasks.Any(),
                            HasProcessTrans = request.RunProcessTrans,
                            TotalTimeMs = sw.ElapsedMilliseconds
                        }
                    };
                });

                // مسح Cache الجداول المتأثرة
                var affectedTables = new HashSet<string> { request.Master.TableName };

                var detailTables = new[]
                {
            request.Detail_1?.BulkInsertRequest?.TableName,
            request.Detail_2?.BulkInsertRequest?.TableName,
            request.Detail_3?.BulkInsertRequest?.TableName,
            request.Detail_4?.BulkInsertRequest?.TableName,
            request.Detail_5?.BulkInsertRequest?.TableName
        };

                foreach (var table in detailTables)
                {
                    if (!string.IsNullOrEmpty(table))
                        affectedTables.Add(table);
                }

                SQLServer.ClearTablesCache(affectedTables);

                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                sw.Stop();
                return StatusCode(500, JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.InternalServerError, ex.Message)));
            }
        }

        [HttpDelete("DeleteMasterDetail")]
        public async Task<IActionResult> DeleteMasterDetail([FromBody] ModelDeleteMasterDetail request)
        {
            var sw = Stopwatch.StartNew();

            if (request == null)
                return BadRequest(new BaseResponse(HttpStatusCode.BadRequest, "Invalid request"));

            try
            {
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    // 1️⃣ جلب البيانات القديمة قبل الحذف
                    Dictionary<string, object>? oldMasterData = null;
                    if (request.Master.Id > 0 && !string.IsNullOrEmpty(request.Master.KeyColumn))
                    {
                        oldMasterData = await _service.GetById(con, tran,
                            request.Master.TableName,
                            request.Master.KeyColumn,
                            request.Master.Id);
                    }

                    // 2️⃣ حذف جميع التفاصيل (بأسرع طريقة - Query واحدة لكل جدول)
                    var deletedDetails = new Dictionary<string, int>();
                    var deleteTasks = new List<Task<(string TableName, int RowsAffected)>>();

                    async Task AddDeleteTask(DetailWrapper? detail)
                    {
                        if (detail?.Delete_Details != null && detail.Delete_Details.DeleteAllRelated && request.Master.Id > 0)
                        {
                            // ✅ استخدام DetailForeignKeyColumn إذا موجود، وإلا استخدم MasterKeyColumn
                            string foreignKeyColumn = detail.DetailForeignKeyColumn ?? request.MasterKeyColumn;

                            // تسلسلي (نفس الـ connection/transaction مابيدعمش MARS)
                            deleteTasks.Add(Task.FromResult(await _service.DeleteAllRelatedByMasterId(
                                con, tran,
                                detail.Delete_Details.TableName,
                                foreignKeyColumn,
                                request.Master.Id)));
                        }
                    }

                    await AddDeleteTask(request.Detail_1);
                    await AddDeleteTask(request.Detail_2);
                    await AddDeleteTask(request.Detail_3);
                    await AddDeleteTask(request.Detail_4);
                    await AddDeleteTask(request.Detail_5);

                    if (deleteTasks.Any())
                    {
                        var deleteResults = await Task.WhenAll(deleteTasks);
                        foreach (var (tableName, rowsAffected) in deleteResults)
                        {
                            deletedDetails[tableName] = rowsAffected;
                        }
                    }

                    // 3️⃣ حذف Master نفسه
                    int masterRowsAffected = 0;
                    if (request.Master.Id > 0 && !string.IsNullOrEmpty(request.Master.KeyColumn))
                    {
                        masterRowsAffected = await _service.DeleteList(con, tran,
                            request.Master.TableName,
                            new List<object> { request.Master.Id },
                            request.Master.KeyColumn);
                    }

                    // 4️⃣ تشغيل Stored Procedure (إذا مطلوب)
                    int? trNo = null;
                    int? ok = null;
                    int? returnValue = null;

                    if (request.RunProcessTrans)
                    {
                        var spResult = await _service.RunProcessTrans(
                            con, tran,
                            request.CompCode,
                            request.BranchCode,
                            request.KeyTrType ?? "",
                            "Delete",
                            request.Master.Id
                        );

                        returnValue = spResult.ReturnValue;
                        trNo = spResult.TrNo;
                        ok = spResult.Ok;

                        if (ok != 1)
                        {
                            throw new Exception($"ProcessTrans failed: ReturnValue={returnValue}, TrNo={trNo}, Ok={ok}");
                        }
                    }

                    return new
                    {
                        Master = new
                        {
                            Id = request.Master.Id,
                            RowsAffected = masterRowsAffected,
                            DeletedData = oldMasterData,
                            KeyColumn = request.Master.KeyColumn,
                            TableName = request.Master.TableName
                        },
                        ProcessTrans = trNo.HasValue ? new
                        {
                            ReturnValue = returnValue,
                            TrNo = trNo,
                            Ok = ok,
                            IsSuccess = ok == 1
                        } : null,
                        DeletedDetails = deletedDetails.Select(kv => new { Table = kv.Key, Count = kv.Value }).ToList(),
                        Summary = new
                        {
                            HasDetails = deleteTasks.Any(),
                            HasProcessTrans = request.RunProcessTrans,
                            MasterDeleted = masterRowsAffected > 0,
                            TotalTimeMs = sw.ElapsedMilliseconds
                        }
                    };
                });

                // مسح Cache الجداول المتأثرة
                var affectedTables = new HashSet<string> { request.Master.TableName };

                var detailTables = new[]
                {
            request.Detail_1?.Delete_Details?.TableName,
            request.Detail_2?.Delete_Details?.TableName,
            request.Detail_3?.Delete_Details?.TableName,
            request.Detail_4?.Delete_Details?.TableName,
            request.Detail_5?.Delete_Details?.TableName
        };

                foreach (var table in detailTables)
                {
                    if (!string.IsNullOrEmpty(table))
                        affectedTables.Add(table);
                }

                SQLServer.ClearTablesCache(affectedTables);

                sw.Stop();
                return Ok(JsonConvert.SerializeObject(new BaseResponse(result, sw.ElapsedMilliseconds)));
            }
            catch (Exception ex)
            {
                sw.Stop();
                return StatusCode(500, JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.InternalServerError, ex.Message)));
            }
        }


    }
}