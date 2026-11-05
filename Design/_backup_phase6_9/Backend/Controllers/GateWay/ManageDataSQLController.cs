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
    public class ManageDataSQLController : ControllerBase
    {
        private readonly SQLServer _service = new SQLServer();

        [HttpPost("GetDataFromSql")]
        public async Task<IActionResult> GetDataFromSql([FromBody] List<TableModel> Entity)
        {
            var Res = await _service.Get_DataFromSql(Entity);
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
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    var dict = _service.JsonToDictionary(request.Data);
                    return await _service.Insert( request.TableName, dict);
                });
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
                var result = await _service.ExecuteTransaction(async (con, tran) =>
                {
                    var dict = _service.JsonToDictionary(request.Data);
                    return await _service.UpdateAuto(con, tran, request.TableName, dict, request.KeyColumn);
                });
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
                            deleteTasks.Add(_service.DeleteListByForeignKey(con, tran,
                                detail.Delete_Details.TableName,
                                foreignKeyColumn,
                                detail.Delete_Details.Ids.Cast<object>().ToList()));
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

                    void AddInsertTask(DetailWrapper? detail)
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

                            insertTasks.Add(_service.BulkInsertUltraFast(con, tran,
                                detail.BulkInsertRequest.TableName, detailList));
                            insertTableNames.Add(detail.BulkInsertRequest.TableName);
                        }
                    }

                    AddInsertTask(request.Detail_1);
                    AddInsertTask(request.Detail_2);
                    AddInsertTask(request.Detail_3);
                    AddInsertTask(request.Detail_4);
                    AddInsertTask(request.Detail_5);

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
                            deleteTasks.Add(_service.DeleteListByForeignKey(con, tran,
                                detail.Delete_Details.TableName,
                                foreignKeyColumn,
                                detail.Delete_Details.Ids.Cast<object>().ToList()));
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

                    void AddInsertTask(DetailWrapper? detail)
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

                            insertTasks.Add(_service.BulkInsertUltraFast(con, tran,
                                detail.BulkInsertRequest.TableName, detailList));
                            insertTableNames.Add(detail.BulkInsertRequest.TableName);
                        }
                    }

                    AddInsertTask(request.Detail_1);
                    AddInsertTask(request.Detail_2);
                    AddInsertTask(request.Detail_3);
                    AddInsertTask(request.Detail_4);
                    AddInsertTask(request.Detail_5);

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

                    void AddDeleteTask(DetailWrapper? detail)
                    {
                        if (detail?.Delete_Details != null && detail.Delete_Details.DeleteAllRelated && request.Master.Id > 0)
                        {
                            // ✅ استخدام DetailForeignKeyColumn إذا موجود، وإلا استخدم MasterKeyColumn
                            string foreignKeyColumn = detail.DetailForeignKeyColumn ?? request.MasterKeyColumn;

                            deleteTasks.Add(_service.DeleteAllRelatedByMasterId(
                                con, tran,
                                detail.Delete_Details.TableName,
                                foreignKeyColumn,
                                request.Master.Id));
                        }
                    }

                    AddDeleteTask(request.Detail_1);
                    AddDeleteTask(request.Detail_2);
                    AddDeleteTask(request.Detail_3);
                    AddDeleteTask(request.Detail_4);
                    AddDeleteTask(request.Detail_5);

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