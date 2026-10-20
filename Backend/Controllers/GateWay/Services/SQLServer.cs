using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using System;
using System.Buffers;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace GateWay.App
{
    /// <summary>
    /// 🚀 ULTIMATE PERFORMANCE EDITION - أقصى أداء مع Redis Cache تلقائي + Monitoring + Query Builder + Column Selection
    /// </summary>
    public class SQLServer
    {

       
        public class QueryResult
        {
            private readonly Task<List<Dictionary<string, object>>> _task;
            private List<Dictionary<string, object>> _cachedResult;

            public QueryResult(Task<List<Dictionary<string, object>>> task)
            {
                _task = task;
            }

            public async Task<List<Dictionary<string, object>>> ToListAsync()
            {
                _cachedResult ??= await _task;
                return _cachedResult;
            }

            public async Task<Dictionary<string, object>> FirstAsync()
            {
                var list = await ToListAsync();
                return list.First();
            }

            public async Task<Dictionary<string, object>> FirstOrDefaultAsync()
            {
                var list = await ToListAsync();
                return list.FirstOrDefault();
            }

            public async Task<Dictionary<string, object>> LastAsync()
            {
                var list = await ToListAsync();
                return list.Last();
            }

            public async Task<Dictionary<string, object>> LastOrDefaultAsync()
            {
                var list = await ToListAsync();
                return list.LastOrDefault();
            }

            public async Task<Dictionary<string, object>> SingleAsync()
            {
                var list = await ToListAsync();
                return list.Single();
            }

            public async Task<Dictionary<string, object>> SingleOrDefaultAsync()
            {
                var list = await ToListAsync();
                return list.SingleOrDefault();
            }
        }
        #region ⚡ الإعدادات الفائقة السرعة

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, string> _identityCache = new();
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, string> _primaryKeyCache = new();
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, TableSchema> _schemaCache = new();

        private static int _commandTimeout = 300;
        private static int _bulkBatchSize = 10000;
        private static int _maxConnections = 100;
        private static int _minConnections = 10;
        private static int _connectionTimeout = 30;

        private static readonly SemaphoreSlim _connectionPool = new(_maxConnections);

        // 📊 Monitoring
        private static readonly PerformanceCounter _performanceCounter = new();

        // 🔥 Redis & Memory Cache
        private static IDistributedCache? _redisCache;
        private static IMemoryCache? _memoryCache;
        private static bool _useRedis = false;
        private static int _cacheDurationSeconds = 60;

        // ✅ Flags للتحكم في Cache
        private static bool _enableRedis = true;              // تفعيل/إيقاف Redis Cache
        private static bool _enableAutoCache = true;          // تفعيل/إيقاف الـ Cache التلقائي
        private static bool _useMemoryCacheFallback = true;   // استخدام Memory Cache كبديل

        // ✅ NEW: قائمة الجداول المسموح لها بالـ Cache (إذا كانت فارغة => كل الجداول)
        private static List<string> _cacheAllowedTables = new List<string>();
        // ✅ NEW: قائمة الجداول المستثناة من الـ Cache (تتجاوز القائمة المسموحة)
        private static List<string> _cacheExcludedTables = new List<string>();
        private static int _minRecordsForCache = 1;

        #endregion

        #region 🏗️ Constructor & Configuration

        public SQLServer()
        {
            ConfigureConnectionPool();
        }

        /// <summary>
        /// إعدادات Connection Pool المحسنة
        /// </summary>
        private void ConfigureConnectionPool()
        {
            var connectionStringBuilder = new SqlConnectionStringBuilder(ConnectionString.connectionString)
            {
                MaxPoolSize = _maxConnections,
                MinPoolSize = _minConnections,
                ConnectTimeout = _connectionTimeout,
                Pooling = true,
                LoadBalanceTimeout = 30,
                ConnectRetryCount = 3,
                ConnectRetryInterval = 10
            };

            ConnectionString.connectionString = connectionStringBuilder.ToString();
        }

        /// <summary>
        /// تفعيل Redis Cache مع إمكانية التحكم
        /// </summary>
        public static void ConfigureRedis(IDistributedCache redisCache, int durationSeconds = 300, bool enable = true)
        {
            _redisCache = redisCache;
            _useRedis = enable && redisCache != null;
            _cacheDurationSeconds = durationSeconds;
            _enableRedis = enable;

            if (enable)
                Console.WriteLine($"✅ Redis Cache configured and ENABLED (Duration: {durationSeconds}s)");
            else
                Console.WriteLine("❌ Redis Cache DISABLED by configuration");
        }

        /// <summary>
        /// تفعيل Memory Cache كبديل
        /// </summary>
        public static void ConfigureMemoryCache(IMemoryCache memoryCache, int durationSeconds = 300, bool enable = true)
        {
            _memoryCache = memoryCache;
            _cacheDurationSeconds = durationSeconds;
            _useMemoryCacheFallback = enable;

            if (enable && (_redisCache == null || !_enableRedis))
                Console.WriteLine("✅ Memory Cache configured as FALLBACK");
        }

        /// <summary>
        /// ✅ تفعيل/إيقاف Redis Cache (للتحكم السريع)
        /// </summary>
        public static void SetRedisEnabled(bool enabled)
        {
            _enableRedis = enabled;
            _useRedis = enabled && _redisCache != null;

            Console.WriteLine($"🔄 Redis Cache {(enabled ? "ENABLED" : "DISABLED")}");
        }

        /// <summary>
        /// ✅ تفعيل/إيقاف الـ Cache التلقائي بالكامل
        /// </summary>
        public static void SetAutoCacheEnabled(bool enabled)
        {
            _enableAutoCache = enabled;
            Console.WriteLine($"🔄 Auto Cache {(enabled ? "ENABLED" : "DISABLED")}");
        }

        /// <summary>
        /// ✅ تفعيل/إيقاف Memory Cache Fallback
        /// </summary>
        public static void SetMemoryCacheFallback(bool enabled)
        {
            _useMemoryCacheFallback = enabled;
            Console.WriteLine($"🔄 Memory Cache Fallback {(enabled ? "ENABLED" : "DISABLED")}");
        }

        /// <summary>
        /// ✅ تعيين قائمة الجداول المسموح لها بالـ Cache (فارغة = كل الجداول)
        /// </summary>
        /// <param name="tableNames">قائمة أسماء الجداول (مثال: new List<string> { "Users", "Products", "Orders" })</param>
        public static void SetAllowedTablesForCache(List<string> tableNames)
        {
            _cacheAllowedTables = tableNames ?? new List<string>();
            Console.WriteLine($"✅ Allowed tables for cache: {(tableNames == null || tableNames.Count == 0 ? "ALL TABLES" : string.Join(", ", tableNames))}");
        }

        /// <summary>
        /// ✅ إضافة جدول إلى قائمة الجداول المسموح لها بالـ Cache
        /// </summary>
        public static void AddAllowedTable(string tableName)
        {
            if (!_cacheAllowedTables.Contains(tableName))
                _cacheAllowedTables.Add(tableName);
            Console.WriteLine($"✅ Table '{tableName}' ADDED to allowed cache list");
        }

        /// <summary>
        /// ✅ إزالة جدول من قائمة الجداول المسموح لها بالـ Cache
        /// </summary>
        public static void RemoveAllowedTable(string tableName)
        {
            _cacheAllowedTables.Remove(tableName);
            Console.WriteLine($"❌ Table '{tableName}' REMOVED from allowed cache list");
        }

        /// <summary>
        /// ✅ تفعيل Cache لجدول معين (اختصار لإضافة الجدول للقائمة المسموحة)
        /// </summary>
        public static void EnableCacheForTable(string tableName)
        {
            AddAllowedTable(tableName);
        }

        /// <summary>
        /// ✅ إيقاف Cache لجدول معين (اختصار لإضافة الجدول للقائمة المستثناة)
        /// </summary>
        public static void DisableCacheForTable(string tableName)
        {
            if (!_cacheExcludedTables.Contains(tableName))
                _cacheExcludedTables.Add(tableName);
            Console.WriteLine($"🚫 Table '{tableName}' excluded from cache");
        }

        /// <summary>
        /// ✅ استبعاد جدول من الـ Cache التلقائي
        /// </summary>
        public static void ExcludeTableFromCache(string tableName)
        {
            DisableCacheForTable(tableName);
        }

        /// <summary>
        /// ✅ إزالة استبعاد جدول
        /// </summary>
        public static void IncludeTableInCache(string tableName)
        {
            _cacheExcludedTables.Remove(tableName);
            Console.WriteLine($"✅ Table '{tableName}' included in cache");
        }

        /// <summary>
        /// ✅ التحقق مما إذا كان الجدول مسموح له بالـ Cache
        /// </summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private static bool IsTableAllowedForCache(string tableName)
        {
            if (_cacheExcludedTables.Contains(tableName))
                return false;

            if (_cacheAllowedTables == null || _cacheAllowedTables.Count == 0)
                return true;

            return _cacheAllowedTables.Contains(tableName);
        }

        /// <summary>
        /// ✅ الحصول على حالة الـ Cache الحالية
        /// </summary>
        public static CacheStatus GetCacheStatus()
        {
            return new CacheStatus
            {
                IsRedisEnabled = _enableRedis && _redisCache != null,
                IsRedisConnected = _redisCache != null,
                IsAutoCacheEnabled = _enableAutoCache,
                IsMemoryCacheFallbackEnabled = _useMemoryCacheFallback,
                CacheDurationSeconds = _cacheDurationSeconds,
                AllowedTables = _cacheAllowedTables.ToList(),
                ExcludedTables = _cacheExcludedTables.ToList(),
                MinRecordsForCache = _minRecordsForCache
            };
        }

        /// <summary>
        /// تحديث إعدادات الـ Connection Pool
        /// </summary>
        public static void UpdatePoolSettings(int maxConnections, int minConnections, int connectionTimeout)
        {
            _maxConnections = maxConnections;
            _minConnections = minConnections;
            _connectionTimeout = connectionTimeout;
        }

        /// <summary>
        /// التحقق مما إذا كان يجب استخدام Cache تلقائي
        /// </summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private bool ShouldUseAutoCache(TableModel item)
        {
            if (!_enableAutoCache) return false;
            if (item.IsProc) return false;

            if (!IsTableAllowedForCache(item.NameTable)) return false;

            if (item.Top > 0 && item.Top < _minRecordsForCache) return false;
            if (item.IsPage == true && item.PageSize < _minRecordsForCache) return false;

            return true;
        }

        #endregion

        #region 🔥 Query Builder - بناء استعلامات احترافي

        public QueryBuilder Query(string tableName)
        {
            return new QueryBuilder(this, tableName);
        }

        public class QueryBuilder
        {
            private readonly SQLServer _service;
            private string _tableName;
            private List<string> _selectedColumns = new List<string> { "*" };
            private string? _whereCondition;
            private string? _orderBy;
            private string _orderDirection = "ASC";
            private int? _top;
            private int? _pageNumber;
            private int? _pageSize;
            private List<string> _groupBy = new List<string>();
            private string? _having;
            private List<JoinClause> _joins = new List<JoinClause>();
            private Dictionary<string, object> _parameters = new Dictionary<string, object>();
            private bool? _useCache;

            public QueryBuilder(SQLServer service, string tableName)
            {
                _service = service;
                _tableName = tableName;
            }

            public QueryBuilder Select(params string[] columns)
            {
                if (columns != null && columns.Length > 0)
                    _selectedColumns = columns.ToList();
                return this;
            }

            public QueryBuilder Join(string joinTable, string onCondition, string joinType = "INNER")
            {
                _joins.Add(new JoinClause
                {
                    JoinTable = joinTable,
                    OnCondition = onCondition,
                    JoinType = joinType
                });
                return this;
            }

            public QueryBuilder Where(string condition, object? value = null)
            {
                if (value != null)
                {
                    string paramName = $"@p{_parameters.Count}";
                    _whereCondition = condition.Replace("?", paramName);
                    _parameters[paramName.TrimStart('@')] = value;
                }
                else
                {
                    _whereCondition = condition;
                }
                return this;
            }

            public QueryBuilder Where(string condition, Dictionary<string, object> parameters)
            {
                _whereCondition = condition;
                foreach (var param in parameters)
                {
                    _parameters[param.Key] = param.Value;
                }
                return this;
            }

            public QueryBuilder OrderBy(string column, string direction = "ASC")
            {
                _orderBy = column;
                _orderDirection = direction.ToUpper();
                return this;
            }

            public QueryBuilder Take(int top)
            {
                _top = top;
                return this;
            }

            public QueryBuilder Paginate(int pageNumber, int pageSize)
            {
                _pageNumber = pageNumber;
                _pageSize = pageSize;
                return this;
            }

            public QueryBuilder GroupBy(params string[] columns)
            {
                _groupBy.AddRange(columns);
                return this;
            }

            public QueryBuilder Having(string condition)
            {
                _having = condition;
                return this;
            }

            public QueryBuilder WithCache(bool useCache = true)
            {
                _useCache = useCache;
                return this;
            }

            public string Build()
            {
                var query = new StringBuilder();

                query.Append("SELECT ");
                if (_top.HasValue)
                    query.Append($"TOP {_top.Value} ");
                query.AppendLine(string.Join(", ", _selectedColumns.Select(c => c == "*" ? c : $"[{c}]")));

                query.AppendLine($"FROM [{_tableName}]");

                foreach (var join in _joins)
                {
                    query.AppendLine($"{join.JoinType} JOIN [{join.JoinTable}] ON {join.OnCondition}");
                }

                if (!string.IsNullOrEmpty(_whereCondition))
                {
                    query.AppendLine($"WHERE {_whereCondition}");
                }

                if (_groupBy.Any())
                {
                    query.AppendLine($"GROUP BY {string.Join(", ", _groupBy.Select(c => $"[{c}]"))}");
                }

                if (!string.IsNullOrEmpty(_having))
                {
                    query.AppendLine($"HAVING {_having}");
                }

                if (!string.IsNullOrEmpty(_orderBy))
                {
                    query.AppendLine($"ORDER BY [{_orderBy}] {_orderDirection}");
                }

                if (_pageNumber.HasValue && _pageSize.HasValue)
                {
                    if (string.IsNullOrEmpty(_orderBy))
                        query.AppendLine("ORDER BY (SELECT NULL)");
                    query.AppendLine($"OFFSET {(_pageNumber.Value - 1) * _pageSize.Value} ROWS");
                    query.AppendLine($"FETCH NEXT {_pageSize.Value} ROWS ONLY");
                }

                query.AppendLine("OPTION (RECOMPILE)");

                return query.ToString();
            }

            public async Task<List<Dictionary<string, object>>> ExecuteAsync()
            {
                var query = Build();
                var parameters = _parameters.ToDictionary(
                    p => "@" + p.Key,
                    p => new SqlParameter("@" + p.Key, p.Value ?? DBNull.Value)
                );

                bool useCache = _useCache ?? _service.ShouldUseAutoCache(new TableModel { NameTable = _tableName });

                if (useCache)
                {
                    var cacheKey = $"{_tableName}_{query.GetHashCode()}";
                    return await _service.ExecuteQueryWithCache(query, parameters.Values.ToList(), cacheKey);
                }

                return await _service.ExecuteRawQuery(query, parameters.Values.ToList());
            }

            private class JoinClause
            {
                public string JoinTable { get; set; } = string.Empty;
                public string OnCondition { get; set; } = string.Empty;
                public string JoinType { get; set; } = "INNER";
            }
        }

        #endregion

        #region 🔥 SELECT مع Column Selection و Cache تلقائي

        public async Task<List<List<Dictionary<string, object>>>> Get_DataFromSql(
            List<TableModel> Entity, bool? useCache = null, string? cacheKey = null)
        {
            var results = new List<Dictionary<string, object>>[Entity.Count];

            await Parallel.ForEachAsync(
                Entity.Select((item, index) => (item, index)),
                new ParallelOptions { MaxDegreeOfParallelism = 10 },
                async (data, ct) =>
                {
                    var list = await ProcessSelectUltraFast(data.item, useCache, cacheKey);
                    results[data.index] = list;
                });

            // ترجع لستة من الليستات (كل لسته فيها بيانات عنصر واحد من Entity)
            return results.ToList();
        }

        public QueryResult Select(string NameTable, string Condition = "", int PageSize = 0, int PageNumber = 0)
        {

            TableModel Entity = new TableModel();
            Entity.NameTable = NameTable;
            Entity.Condition = Condition;
            Entity.PageSize = PageSize;
            Entity.PageNumber = PageNumber;

            var task = ProcessSelectUltraFast(Entity, false, null);
            return new QueryResult(task);
        }


        public async Task<InsertResult> Insert(string NameTable, object Obj)
        {
            JsonElement _Data = System.Text.Json.JsonSerializer.SerializeToElement(Obj);

            InsertRequest request = new InsertRequest
            {
                TableName = NameTable,
                Data = _Data
            };

            var result = await ExecuteTransaction(async (con, tran) =>
            {
                var dict = JsonToDictionary(request.Data);
                return await InsertAutoWithResult(con, tran, request.TableName, dict);
            });
            
            return result;
        }

        public async Task<int> InsertList(string NameTable, List<object> ListObj)
        {
            JsonElement jsonArray = System.Text.Json.JsonSerializer.SerializeToElement(ListObj);

            List<JsonElement> _Data = jsonArray.EnumerateArray().ToList();

            InsertListRequest request = new InsertListRequest
            {
                TableName = NameTable,
                DataList = _Data
            };
            var dataList = request.DataList.Select(d => JsonToDictionary(d)).ToList();
            var result = await ExecuteTransaction(async (con, tran) =>
            {
                return await InsertAuto(con, tran, request.TableName, dataList);
            });
            return result;
        }



        public async Task<int> Update(string NameTable, string Primarykey,object Obj)
        {
            JsonElement _Data = System.Text.Json.JsonSerializer.SerializeToElement(Obj);

            UpdateRequest request = new UpdateRequest
            {
                TableName = NameTable,
                KeyColumn = Primarykey,
                Data = _Data
            };

            var result = await ExecuteTransaction(async (con, tran) =>
            {
                var dict = JsonToDictionary(request.Data);
                return await UpdateAuto(con, tran, request.TableName, dict, request.KeyColumn);
            });

            return result;
        }



        public async Task<int> UpdateList(string NameTable, string Primarykey, List<object> ListObj)
        {
            JsonElement jsonArray = System.Text.Json.JsonSerializer.SerializeToElement(ListObj);

            List<JsonElement> _Data = jsonArray.EnumerateArray().ToList();

            UpdateListRequest request = new UpdateListRequest
            {
                TableName = NameTable,
                KeyColumn = Primarykey,
                DataList = _Data
            };

            var dataList = request.DataList.Select(d => JsonToDictionary(d)).ToList();
            var result = await ExecuteTransaction(async (con, tran) =>
            {
                return await UpdateAuto(con, tran, request.TableName, dataList, request.KeyColumn);
            });

            return result;
        }


        public async Task<int> Delete(string NameTable, string Primarykey, List<int> Ids)
        {
            DeleteRequest request = new DeleteRequest
            {
                TableName = NameTable,
                KeyColumn = Primarykey,
                Ids = Ids
            };

            var result = await ExecuteTransaction(async (con, tran) =>
            {
                return await DeleteList(con, tran, request.TableName, request.Ids.Cast<object>().ToList(), request.KeyColumn);
            });

            return result;
        }




        public async Task<List<Dictionary<string, object>>> Get_DataFromSql(TableModel Entity, bool? useCache = null, string? cacheKey = null)
        {
            return await ProcessSelectUltraFast(Entity, useCache, cacheKey);
        }

        [MethodImpl(MethodImplOptions.AggressiveOptimization)]
        private async Task<List<Dictionary<string, object>>> ProcessSelectUltraFast(TableModel item, bool? useCache = null, string? cacheKey = null)
        {
            bool shouldUseCache = useCache ?? ShouldUseAutoCache(item);

            if (shouldUseCache)
            {
                var key = cacheKey ?? await BuildCacheKeyWithVersion(item);
                var cachedResult = await GetFromCache(key);
                if (cachedResult != null)
                {
                    _performanceCounter.RecordCacheHit();
                    return cachedResult;
                }
                _performanceCounter.RecordCacheMiss();
            }

            List<Dictionary<string, object>> result;

            if (item.IsProc)
            {
                result = await ProcessStoredProcedure(item);
            }
            else if (!string.IsNullOrWhiteSpace(item.SearchValue))
            {
                result = await SearchTable(item);
            }
            else if (item.SelectedColumns != null && item.SelectedColumns.Any())
            {
                result = await ProcessSelectWithColumns(item);
            }
            else
            {
                result = await ProcessSelectStandard(item);
            }

            if (shouldUseCache && result != null)
            {
                var key = cacheKey ?? await BuildCacheKeyWithVersion(item);
                await SetInCache(key, result);
            }

            _performanceCounter.RecordQuery();
            return result;
        }

        private async Task<List<Dictionary<string, object>>> ProcessSelectWithColumns(TableModel item)
        {
            item.Condition ??= "";
            item.OrderByID ??= "1";
            item.OrderType ??= "DESC";

            var (whereClause, parameters) = BuildWhereUltraFast(item.Condition);

            if (item.IsPage == true && item.PageSize > 0)
            {
                parameters ??= new List<SqlParameter>();
                parameters.Add(new SqlParameter("@PageNumber", item.PageNumber ?? 1));
                parameters.Add(new SqlParameter("@PageSize", item.PageSize));
            }

            string columns = item.SelectedColumns!.Any()
                ? string.Join(", ", item.SelectedColumns.Select(c => $"[{c}]"))
                : "*";

            string query = BuildSelectQuery(item, whereClause, columns);
            return await ExecuteQueryUltraFast(query, parameters);
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private string BuildSelectQuery(TableModel item, string whereClause, string columns)
        {
            string orderType = item.OrderType?.ToUpper() == "ASC" ? "ASC" : "DESC";

            if (item.IsPage == true && item.PageSize > 0)
            {
                return $@"
                    SELECT {columns} FROM {item.NameTable}
                    {whereClause}
                    ORDER BY {item.OrderByID} {orderType}
                    OFFSET (@PageNumber - 1) * @PageSize ROWS
                    FETCH NEXT @PageSize ROWS ONLY
                    OPTION (RECOMPILE, FAST {item.PageSize})";
            }
            else if (item.Top > 0)
            {
                return $@"
                    SELECT TOP {item.Top} {columns} FROM {item.NameTable}
                    {whereClause}
                    ORDER BY {item.OrderByID} {orderType}
                    OPTION (RECOMPILE, FAST {item.Top})";
            }
            else
            {
                return $@"
                    SELECT {columns} FROM {item.NameTable}
                    {whereClause}
                    OPTION (RECOMPILE)";
            }
        }

        private async Task<List<Dictionary<string, object>>> ProcessSelectStandard(TableModel item)
        {
            item.Condition ??= "";
            item.OrderByID ??= "1";
            item.OrderType ??= "DESC";

            var (whereClause, parameters) = BuildWhereUltraFast(item.Condition);

            // ✅ بناء query لجلب العدد الإجمالي
            string countQuery = $@"
        SELECT COUNT(*) as TotalCount FROM {item.NameTable}
        {whereClause}
        OPTION (RECOMPILE)";

            if (item.IsPage == true && item.PageSize > 0)
            {
                parameters ??= new List<SqlParameter>();
                parameters.Add(new SqlParameter("@PageNumber", item.PageNumber ?? 1));
                parameters.Add(new SqlParameter("@PageSize", item.PageSize));
            }

            string query = BuildQueryWithRecompile(item, whereClause);

            // ✅ تنفيذ الطلبيتين بشكل متوازي أو متسلسل
            var totalCountTask = item.ReturnTotalCount ? ExecuteScalarAsync(countQuery, parameters) : Task.FromResult<object?>(null);
            var dataTask = ExecuteQueryUltraFast(query, parameters);

            await Task.WhenAll(totalCountTask, dataTask);

            var data = await dataTask;

            if (item.ReturnTotalCount && data.Count > 0)
            {
                var totalCount = Convert.ToInt32(await totalCountTask ?? data.Count);

                // ✅ إضافة العدد الإجمالي كـ metadata في أول عنصر أو في الـ return
                var result = new List<Dictionary<string, object>>();
                var metaRow = new Dictionary<string, object>
                {
                    ["__TotalCount"] = totalCount,
                    ["__IsMetaData"] = true
                };
                result.Add(metaRow);
                result.AddRange(data);
                return result;
            }

            return data;
        }
        private async Task<object?> ExecuteScalarAsync(string query, List<SqlParameter>? parameters = null)
        {
            await _connectionPool.WaitAsync();
            try
            {
                using var con = new SqlConnection(ConnectionString.connectionString);
                await con.OpenAsync();

                using var cmd = new SqlCommand(query, con) { CommandTimeout = _commandTimeout };
                if (parameters != null && parameters.Count > 0)
                    cmd.Parameters.AddRange(parameters.ToArray());

                return await cmd.ExecuteScalarAsync();
            }
            finally
            {
                _connectionPool.Release();
            }
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private string BuildQueryWithRecompile(TableModel item, string whereClause)
        {
            string orderType = item.OrderType?.ToUpper() == "ASC" ? "ASC" : "DESC";

            if (item.IsPage == true && item.PageSize > 0)
            {
                return $@"
                    SELECT * FROM {item.NameTable}
                    {whereClause}
                    ORDER BY {item.OrderByID} {orderType}
                    OFFSET (@PageNumber - 1) * @PageSize ROWS
                    FETCH NEXT @PageSize ROWS ONLY
                    OPTION (RECOMPILE, FAST {item.PageSize})";
            }
            else if (item.Top > 0)
            {
                return $@"
                    SELECT TOP {item.Top} * FROM {item.NameTable}
                    {whereClause}
                    ORDER BY {item.OrderByID} {orderType}
                    OPTION (RECOMPILE, FAST {item.Top})";
            }
            else
            {
                return $@"
                    SELECT * FROM {item.NameTable}
                    {whereClause}
                    OPTION (RECOMPILE)";
            }
        }

        #endregion

        #region 🔥 Redis & Memory Cache Implementation

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private async Task<List<Dictionary<string, object>>?> GetFromCache(string cacheKey)
        {
            if (!_enableRedis && !_useMemoryCacheFallback)
                return null;

            try
            {
                if (_enableRedis && _useRedis && _redisCache != null)
                {
                    var cached = await _redisCache.GetStringAsync(cacheKey);
                    if (!string.IsNullOrEmpty(cached))
                    {
                        _performanceCounter.RecordCacheHit();
                        return System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(cached);
                    }
                }

                if (_useMemoryCacheFallback && _memoryCache != null)
                {
                    if (_memoryCache.TryGetValue(cacheKey, out List<Dictionary<string, object>>? cached))
                    {
                        _performanceCounter.RecordCacheHit();
                        return cached;
                    }
                }
            }
            catch (Exception ex)
            {
                if (_useMemoryCacheFallback && _memoryCache != null)
                {
                    if (_memoryCache.TryGetValue(cacheKey, out List<Dictionary<string, object>>? cached))
                    {
                        _performanceCounter.RecordCacheHit();
                        return cached;
                    }
                }
                Console.WriteLine($"⚠️ Cache error: {ex.Message}");
            }

            _performanceCounter.RecordCacheMiss();
            return null;
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private async Task SetInCache(string cacheKey, List<Dictionary<string, object>> data)
        {
            if (!_enableRedis && !_useMemoryCacheFallback)
                return;

            try
            {
                var absoluteExpiration = TimeSpan.FromSeconds(_cacheDurationSeconds);

                if (_enableRedis && _useRedis && _redisCache != null)
                {
                    var options = new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = absoluteExpiration
                    };
                    var json = System.Text.Json.JsonSerializer.Serialize(data);
                    await _redisCache.SetStringAsync(cacheKey, json, options);
                }
                else if (_useMemoryCacheFallback && _memoryCache != null)
                {
                    var options = new MemoryCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = absoluteExpiration,
                        Priority = CacheItemPriority.High
                    };
                    _memoryCache.Set(cacheKey, data, options);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Failed to save to cache: {ex.Message}");
            }
        }

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, long> _tableVersions = new();

        /// <summary>
        /// الحصول على نسخة الجدول الحالية
        /// </summary>
        private async Task<long> GetTableVersion(string tableName)
        {
            if (_tableVersions.TryGetValue(tableName, out var cachedVersion))
                return cachedVersion;

            string query = @"
        SELECT ISNULL(CONVERT(BIGINT, CONVERT(VARBINARY(8), MAX(last_user_update))), 0)
        FROM sys.dm_db_index_usage_stats ius
        INNER JOIN sys.tables t ON ius.object_id = t.object_id
        WHERE t.name = @tableName";

            using var con = new SqlConnection(ConnectionString.connectionString);
            using var cmd = new SqlCommand(query, con);
            cmd.Parameters.AddWithValue("@tableName", tableName);

            await con.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();
            var version = result != DBNull.Value ? Convert.ToInt64(result) : DateTime.Now.Ticks;

            _tableVersions[tableName] = version;
            return version;
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private long GetTableVersionFast(string tableName)
        {
            return _tableVersions.GetOrAdd(tableName, DateTime.Now.Ticks);
        }

        /// <summary>
        /// تحديث نسخة الجدول (بعد أي تعديل)
        /// </summary>
        private void UpdateTableVersion(string tableName)
        {
            var newVersion = DateTime.Now.Ticks;
            _tableVersions[tableName] = newVersion;
        }

        /// <summary>
        /// بناء Cache Key مع النسخة
        /// </summary>
        private async Task<string> BuildCacheKeyWithVersion(TableModel item)
        {
            var version = GetTableVersionFast(item.NameTable);
            var baseKey = BuildCacheKey(item);
            return $"{baseKey}_v{version}";
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private string BuildCacheKey(TableModel item)
        {
            var key = new StringBuilder();
            key.Append(item.NameTable);
            key.Append($"_{item.Condition ?? ""}");
            key.Append($"_{item.OrderByID ?? "1"}_{item.OrderType ?? "DESC"}");
            key.Append($"_{item.IsPage}_{item.PageNumber}_{item.PageSize}");
            key.Append($"_{item.Top}");
            key.Append($"_{item.SearchValue ?? ""}");

            if (item.SelectedColumns != null)
                key.Append($"_{string.Join(",", item.SelectedColumns)}");

            return Convert.ToBase64String(Encoding.UTF8.GetBytes(key.ToString()));
        }

        public async Task<List<Dictionary<string, object>>> ExecuteQueryWithCache(string query, List<SqlParameter>? parameters = null, string? cacheKey = null)
        {
            var key = cacheKey ?? Convert.ToBase64String(Encoding.UTF8.GetBytes(query));

            var cached = await GetFromCache(key);
            if (cached != null)
            {
                _performanceCounter.RecordCacheHit();
                return cached;
            }

            _performanceCounter.RecordCacheMiss();
            var result = await ExecuteRawQuery(query, parameters);
            await SetInCache(key, result);

            return result;
        }

        public async Task<List<Dictionary<string, object>>> ExecuteRawQuery(string query, List<SqlParameter>? parameters = null)
        {
            var sw = Stopwatch.StartNew();
            try
            {
                var result = await ExecuteQueryUltraFast(query, parameters);
                sw.Stop();
                _performanceCounter.RecordQueryTime(sw.ElapsedMilliseconds);
                return result;
            }
            catch (Exception ex)
            {
                _performanceCounter.RecordError();
                throw;
            }
        }

        #endregion

        #region 📊 Monitoring & Performance

        public class PerformanceCounter
        {
            private long _totalQueries = 0;
            private long _totalCacheHits = 0;
            private long _totalCacheMisses = 0;
            private long _totalErrors = 0;
            private readonly Stopwatch _uptime = Stopwatch.StartNew();
            private long _totalQueryTimeMs = 0;
            private long _queryCount = 0;

            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            public void RecordQuery() => Interlocked.Increment(ref _totalQueries);

            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            public void RecordCacheHit() => Interlocked.Increment(ref _totalCacheHits);

            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            public void RecordCacheMiss() => Interlocked.Increment(ref _totalCacheMisses);

            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            public void RecordError() => Interlocked.Increment(ref _totalErrors);

            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            public void RecordQueryTime(long ms)
            {
                Interlocked.Increment(ref _queryCount);
                Interlocked.Add(ref _totalQueryTimeMs, ms);
            }

            public PerformanceStats GetStats()
            {
                double avgTime = _queryCount > 0 ? (double)_totalQueryTimeMs / _queryCount : 0;
                long totalQueries = _totalQueries;

                return new PerformanceStats
                {
                    TotalQueries = totalQueries,
                    TotalCacheHits = _totalCacheHits,
                    TotalCacheMisses = _totalCacheMisses,
                    CacheHitRate = totalQueries > 0 ? (double)_totalCacheHits / totalQueries * 100 : 0,
                    TotalErrors = _totalErrors,
                    ErrorRate = totalQueries > 0 ? (double)_totalErrors / totalQueries * 100 : 0,
                    AverageQueryTimeMs = avgTime,
                    UptimeSeconds = _uptime.Elapsed.TotalSeconds
                };
            }
        }


        public PerformanceStats GetPerformanceStats()
        {
            return _performanceCounter.GetStats();
        }

        public string GetPrometheusMetrics()
        {
            var stats = GetPerformanceStats();
            var sb = new StringBuilder();

            sb.AppendLine("# HELP management_sql_total_queries Total number of queries executed");
            sb.AppendLine($"management_sql_total_queries {stats.TotalQueries}");

            sb.AppendLine("# HELP management_sql_cache_hit_rate Cache hit rate percentage");
            sb.AppendLine($"management_sql_cache_hit_rate {stats.CacheHitRate:F2}");

            sb.AppendLine("# HELP management_sql_error_rate Error rate percentage");
            sb.AppendLine($"management_sql_error_rate {stats.ErrorRate:F2}");

            sb.AppendLine("# HELP management_sql_avg_query_time_ms Average query time in milliseconds");
            sb.AppendLine($"management_sql_avg_query_time_ms {stats.AverageQueryTimeMs:F2}");

            sb.AppendLine("# HELP management_sql_uptime_seconds Uptime in seconds");
            sb.AppendLine($"management_sql_uptime_seconds {stats.UptimeSeconds:F0}");

            return sb.ToString();
        }

        #endregion

        #region 🔥 STORED PROCEDURES

        public async Task<List<Dictionary<string, object>>> ExecuteStoredProcedure(string procName, Dictionary<string, object>? parameters = null)
        {
            return await ExecuteStoredProcedure(new TableModel
            {
                NameTable = procName,
                IsProc = true,
                parameters = parameters
            });
        }

       
        public async Task<List<Dictionary<string, object>>> ExecuteStoredProcedure(TableModel item)
        {
            if (!item.IsProc)
                throw new ArgumentException("IsProc must be true for stored procedure execution");
            return await ProcessStoredProcedure(item);
        }

        private async Task<List<Dictionary<string, object>>> ProcessStoredProcedure(TableModel item)
        {
            var results = new List<Dictionary<string, object>>();

            await _connectionPool.WaitAsync();
            try
            {
                using var con = new SqlConnection(ConnectionString.connectionString);
                await con.OpenAsync();

                using var cmd = new SqlCommand(item.NameTable, con)
                {
                    CommandTimeout = _commandTimeout,
                    CommandType = CommandType.StoredProcedure
                };

                if (item.parameters != null && item.parameters.Count > 0)
                {
                    foreach (var param in item.parameters)
                    {
                        cmd.Parameters.AddWithValue($"@{param.Key}", param.Value ?? DBNull.Value);
                    }
                }

                using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess);

                var fieldCount = reader.FieldCount;
                var fieldNames = new string[fieldCount];
                for (int i = 0; i < fieldCount; i++)
                    fieldNames[i] = reader.GetName(i);

                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>(fieldCount);
                    for (int i = 0; i < fieldCount; i++)
                    {
                        row[fieldNames[i]] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    }
                    results.Add(row);
                }

                return results;
            }
            finally
            {
                _connectionPool.Release();
            }
        }

        public async Task<T?> ExecuteStoredProcedureScalar<T>(string procName, Dictionary<string, object>? parameters = null)
        {
            await _connectionPool.WaitAsync();
            try
            {
                using var con = new SqlConnection(ConnectionString.connectionString);
                await con.OpenAsync();

                using var cmd = new SqlCommand(procName, con)
                {
                    CommandTimeout = _commandTimeout,
                    CommandType = CommandType.StoredProcedure
                };

                if (parameters != null && parameters.Count > 0)
                {
                    foreach (var param in parameters)
                    {
                        cmd.Parameters.AddWithValue($"@{param.Key}", param.Value ?? DBNull.Value);
                    }
                }

                var result = await cmd.ExecuteScalarAsync();
                return result == DBNull.Value ? default : (T?)result;
            }
            finally
            {
                _connectionPool.Release();
            }
        }

        public async Task<int> ExecuteStoredProcedureNonQuery(string procName, Dictionary<string, object>? parameters = null)
        {
            return await ExecuteStoredProcedureNonQuery(new TableModel
            {
                NameTable = procName,
                IsExec = true,
                parameters = parameters
            });
        }

        public async Task<int> ExecuteStoredProcedureNonQuery(TableModel item)
        {
            if (!item.IsExec && !item.IsProc)
                throw new ArgumentException("IsExec or IsProc must be true");

            await _connectionPool.WaitAsync();
            try
            {
                using var con = new SqlConnection(ConnectionString.connectionString);
                await con.OpenAsync();

                using var cmd = new SqlCommand(item.NameTable, con)
                {
                    CommandTimeout = _commandTimeout,
                    CommandType = CommandType.StoredProcedure
                };

                if (item.parameters != null && item.parameters.Count > 0)
                {
                    foreach (var param in item.parameters)
                    {
                        cmd.Parameters.AddWithValue($"@{param.Key}", param.Value ?? DBNull.Value);
                    }
                }

                return await cmd.ExecuteNonQueryAsync();
            }
            finally
            {
                _connectionPool.Release();
            }
        }

        #endregion

        #region 🔥 INSERT

        public async Task<int> InsertAuto(SqlConnection con, SqlTransaction? tran, string table, object data)
        {
            if (data is Dictionary<string, object> single)
                return await InsertOneUltraFast(con, tran, table, single);
            else if (data is List<Dictionary<string, object>> list)
            {
                if (list.Count < 500)
                    return await InsertListUltraFast(con, tran, table, list);
                else
                    return await BulkInsertUltraFast(con, tran, table, list);
            }
            throw new ArgumentException("Unsupported data type");
        }

        private async Task<int> InsertOneUltraFast(SqlConnection con, SqlTransaction? tran, string table, Dictionary<string, object> data)
        {
            var identityColumn = await GetIdentityColumnCached(con, tran, table);

            var filtered = data
                .Where(k => identityColumn == null || !k.Key.Equals(identityColumn, StringComparison.OrdinalIgnoreCase))
                .ToDictionary(k => k.Key, v => v.Value);

            var columns = string.Join(",", filtered.Keys.Select(k => $"[{k}]"));
            var values = string.Join(",", filtered.Keys.Select(k => "@" + k));

            string query = $"INSERT INTO {table} ({columns}) VALUES ({values})";
            if (identityColumn != null)
                query += "; SELECT SCOPE_IDENTITY();";

            using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
            foreach (var p in filtered)
                cmd.Parameters.AddWithValue("@" + p.Key, p.Value ?? DBNull.Value);

            if (identityColumn != null)
            {
                var result = await cmd.ExecuteScalarAsync();
                return Convert.ToInt32(result);
            }
            UpdateTableVersion(table);
            return await cmd.ExecuteNonQueryAsync();
        }

        private async Task<int> InsertListUltraFast(SqlConnection con, SqlTransaction? tran, string table, List<Dictionary<string, object>> data)
        {
            if (data.Count == 0) return 0;

            var identityColumn = await GetIdentityColumnCached(con, tran, table);
            var keys = data[0].Keys
                .Where(k => identityColumn == null || !k.Equals(identityColumn, StringComparison.OrdinalIgnoreCase))
                .ToList();

            var parameters = new List<SqlParameter>();
            var valueStrings = new List<string>();

            int rowIndex = 0;
            foreach (var row in data)
            {
                var paramNames = new List<string>();
                foreach (var key in keys)
                {
                    string paramName = $"@p{rowIndex}_{key}";
                    paramNames.Add(paramName);
                    parameters.Add(new SqlParameter(paramName, row[key] ?? DBNull.Value));
                }
                valueStrings.Add($"({string.Join(",", paramNames)})");
                rowIndex++;
            }

            string query = $@"
                INSERT INTO {table} ({string.Join(",", keys.Select(k => $"[{k}]"))}) 
                VALUES {string.Join(",", valueStrings)}";

            using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
            cmd.Parameters.AddRange(parameters.ToArray());
            UpdateTableVersion(table);
            return await cmd.ExecuteNonQueryAsync();
        }

        public async Task<int> BulkInsertUltraFast(SqlConnection con, SqlTransaction? tran, string table, List<Dictionary<string, object>> data)
        {
            if (data == null || data.Count == 0) return 0;

            var identityColumn = await GetIdentityColumnCached(con, tran, table);

            using var bulk = new SqlBulkCopy(con, SqlBulkCopyOptions.TableLock, tran)
            {
                DestinationTableName = table,
                BatchSize = _bulkBatchSize,
                BulkCopyTimeout = _commandTimeout,
                EnableStreaming = true
            };

            var dt = new DataTable();
            var columns = data[0].Keys
                .Where(k => identityColumn == null || k != identityColumn)
                .ToList();

            foreach (var col in columns)
            {
                dt.Columns.Add(col, typeof(object));
                bulk.ColumnMappings.Add(col, col);
            }

            foreach (var row in data)
            {
                var values = new object[columns.Count];
                for (int i = 0; i < columns.Count; i++)
                {
                    var col = columns[i];
                    values[i] = row.ContainsKey(col) ? row[col] ?? DBNull.Value : DBNull.Value;
                }
                dt.Rows.Add(values);
            }

            await bulk.WriteToServerAsync(dt);
            UpdateTableVersion(table);
            return data.Count;
        }

        #endregion

        #region 🔥 UPDATE

        public async Task<UpdateResult> UpdateAutoWithResult(SqlConnection con, SqlTransaction? tran, string table, object data, string? key = null)
        {
            if (string.IsNullOrEmpty(key))
            {
                key = await GetPrimaryKeyCached(con, tran, table);
                if (string.IsNullOrEmpty(key))
                    throw new InvalidOperationException($"No primary key found for {table}");
            }

            var result = new UpdateResult();

            if (data is Dictionary<string, object> single)
            {
                // 🔥 جلب البيانات القديمة قبل التحديث
                if (single.ContainsKey(key))
                {
                    result.OldRow = await GetById(con, tran, table, key, single[key]);
                }

                result.RowsAffected = await UpdateOneUltraFast(con, tran, table, single, key);

                if (result.RowsAffected > 0 && single.ContainsKey(key))
                {
                    result.UpdatedId = single[key];
                    // 🔥 جلب البيانات الجديدة بعد التحديث
                    result.UpdatedRow = await GetById(con, tran, table, key, single[key]);
                }
            }
            else if (data is List<Dictionary<string, object>> list)
            {
                result.UpdatedIds = new List<object>();
                result.UpdatedRows = new List<Dictionary<string, object>>();
                result.OldRows = new List<Dictionary<string, object>>();

                foreach (var item in list)
                {
                    // 🔥 جلب البيانات القديمة
                    if (item.ContainsKey(key))
                    {
                        result.OldRows.Add(await GetById(con, tran, table, key, item[key]));
                    }

                    var rows = await UpdateOneUltraFast(con, tran, table, item, key);
                    result.RowsAffected += rows;

                    if (rows > 0 && item.ContainsKey(key))
                    {
                        result.UpdatedIds.Add(item[key]);
                        // 🔥 جلب البيانات الجديدة
                        result.UpdatedRows.Add(await GetById(con, tran, table, key, item[key]));
                    }
                }

                if (result.UpdatedIds.Count == 1)
                {
                    result.UpdatedId = result.UpdatedIds[0];
                    result.UpdatedRow = result.UpdatedRows.FirstOrDefault();
                    result.OldRow = result.OldRows.FirstOrDefault();
                }
            }
            else
            {
                throw new ArgumentException("Unsupported data type");
            }

            UpdateTableVersion(table);
            return result;
        }
        // 6. لو محتاج تعمل BulkUpdateUltraFastWithResult
        private async Task<(int rowsAffected, List<object> updatedIds)> BulkUpdateUltraFastWithResult(
            SqlConnection con,
            SqlTransaction? tran,
            string table,
            List<Dictionary<string, object>> list,
            string key)
        {
            // هنا بتنفذ Bulk Update
            // وترجع عدد الصفوف المتأثرة + الـ IDs اللي اتعملها Update

            var updatedIds = new List<object>();
            int rowsAffected = 0;

            // مثال باستخدام SqlBulkCopy أو Table-Valued Parameter
            // ... الكود الخاص بالـ Bulk Update ...

            // بعد التنفيذ:
            foreach (var item in list)
            {
                if (item.ContainsKey(key))
                    updatedIds.Add(item[key]);
            }

            return (rowsAffected, updatedIds);
        }
        public async Task<int> UpdateAuto(SqlConnection con, SqlTransaction? tran, string table, object data, string? key = null)
        {
            if (string.IsNullOrEmpty(key))
            {
                key = await GetPrimaryKeyCached(con, tran, table);
                if (string.IsNullOrEmpty(key))
                    throw new InvalidOperationException($"No primary key found for {table}");
            }

            if (data is Dictionary<string, object> single)
                return await UpdateOneUltraFast(con, tran, table, single, key);
            else if (data is List<Dictionary<string, object>> list)
            {
                if (list.Count < 500)
                    return await UpdateListUltraFast(con, tran, table, list, key);
                else
                    return await BulkUpdateUltraFast(con, tran, table, list, key);
            }
            throw new ArgumentException("Unsupported data type");
        }

        private async Task<int> UpdateOneUltraFast(SqlConnection con, SqlTransaction? tran, string table, Dictionary<string, object> data, string key)
        {
            var setClause = string.Join(",", data.Keys
                .Where(k => k != key)
                .Select(k => $"[{k}] = @{k}"));

            string query = $@"
                UPDATE {table} 
                SET {setClause} 
                WHERE [{key}] = @{key}
                OPTION (RECOMPILE)";

            using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
            foreach (var p in data)
                cmd.Parameters.AddWithValue("@" + p.Key, p.Value ?? DBNull.Value);

            UpdateTableVersion(table);
            return await cmd.ExecuteNonQueryAsync();
        }

        private async Task<int> UpdateListUltraFast(SqlConnection con, SqlTransaction? tran, string table, List<Dictionary<string, object>> data, string key)
        {
            var columns = data[0].Keys.Where(k => k != key).ToList();
            var setClauses = new List<string>();

            foreach (var col in columns)
            {
                var whenCases = new List<string>();
                for (int i = 0; i < data.Count; i++)
                {
                    whenCases.Add($"WHEN @p{i}_{key} THEN @p{i}_{col}");
                }
                setClauses.Add($"[{col}] = CASE [{key}] {string.Join(" ", whenCases)} END");
            }

            var parameters = new List<SqlParameter>();
            for (int i = 0; i < data.Count; i++)
            {
                parameters.Add(new SqlParameter($"@p{i}_{key}", data[i][key] ?? DBNull.Value));
                foreach (var col in columns)
                {
                    parameters.Add(new SqlParameter($"@p{i}_{col}", data[i][col] ?? DBNull.Value));
                }
            }

            string query = $@"
                UPDATE {table} 
                SET {string.Join(",", setClauses)}
                WHERE [{key}] IN ({string.Join(",", data.Select((_, i) => $"@p{i}_{key}"))})
                OPTION (RECOMPILE)";

            using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
            cmd.Parameters.AddRange(parameters.ToArray());

            UpdateTableVersion(table);
            return await cmd.ExecuteNonQueryAsync();
        }

        public async Task<int> BulkUpdateUltraFast(SqlConnection con, SqlTransaction? tran, string table, List<Dictionary<string, object>> data, string key)
        {
            string tempTable = $"#Temp_{Guid.NewGuid():N}";

            try
            {
                var columns = data[0].Keys.ToList();

                string createTemp = $@"
                    SELECT TOP 0 
                        {string.Join(", ", columns.Select(c => $"CAST(NULL AS NVARCHAR(MAX)) AS [{c}]"))}
                    INTO {tempTable}
                    FROM {table}";

                using (var cmd = new SqlCommand(createTemp, con, tran))
                    await cmd.ExecuteNonQueryAsync();

                using (var bulk = new SqlBulkCopy(con, SqlBulkCopyOptions.Default, tran)
                {
                    DestinationTableName = tempTable,
                    BatchSize = _bulkBatchSize
                })
                {
                    var dt = new DataTable();
                    foreach (var col in columns)
                    {
                        dt.Columns.Add(col);
                        bulk.ColumnMappings.Add(col, col);
                    }

                    foreach (var row in data)
                    {
                        dt.Rows.Add(columns.Select(c => row.ContainsKey(c) ? row[c] ?? DBNull.Value : DBNull.Value).ToArray());
                    }

                    await bulk.WriteToServerAsync(dt);
                }

                var setClause = string.Join(",", columns
                    .Where(c => c != key)
                    .Select(c => $"T.[{c}] = S.[{c}]"));

                string mergeQuery = $@"
                    MERGE {table} AS T
                    USING {tempTable} AS S
                    ON T.[{key}] = S.[{key}]
                    WHEN MATCHED THEN
                        UPDATE SET {setClause}
                    OPTION (RECOMPILE, HASH JOIN);";

                int affected;
                using (var cmd = new SqlCommand(mergeQuery, con, tran))
                {
                    cmd.CommandTimeout = _commandTimeout;
                    affected = await cmd.ExecuteNonQueryAsync();
                }

                UpdateTableVersion(table);
                return affected;
            }
            finally
            {
                using var dropCmd = new SqlCommand($"DROP TABLE {tempTable}", con, tran);
                await dropCmd.ExecuteNonQueryAsync();
            }
        }

        #endregion

        #region 🔥 DELETE

        public async Task<int> DeleteList(SqlConnection con, SqlTransaction? tran, string table, List<object> ids, string? key = null)
        {
            if (ids == null || ids.Count == 0) return 0;

            if (string.IsNullOrEmpty(key))
            {
                key = await GetPrimaryKeyCached(con, tran, table);
                if (string.IsNullOrEmpty(key))
                    throw new InvalidOperationException($"No primary key found for {table}");
            }

            if (ids.Count > 1000)
            {
                return await DeleteBatchUltraFast(con, tran, table, ids, key);
            }

            var paramNames = ids.Select((_, i) => $"@id{i}").ToList();
            string query = $@"
                DELETE FROM {table} 
                WHERE [{key}] IN ({string.Join(",", paramNames)})
                OPTION (RECOMPILE)";

            using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
            for (int i = 0; i < ids.Count; i++)
                cmd.Parameters.AddWithValue($"@id{i}", ids[i] ?? DBNull.Value);

            UpdateTableVersion(table);
            return await cmd.ExecuteNonQueryAsync();
        }

        private async Task<int> DeleteBatchUltraFast(SqlConnection con, SqlTransaction? tran, string table, List<object> ids, string key)
        {
            int batchSize = 1000;
            int totalDeleted = 0;

            for (int i = 0; i < ids.Count; i += batchSize)
            {
                var batch = ids.Skip(i).Take(batchSize).ToList();
                var paramNames = batch.Select((_, idx) => $"@id{idx}").ToList();

                string query = $@"
                    DELETE FROM {table} 
                    WHERE [{key}] IN ({string.Join(",", paramNames)})
                    OPTION (RECOMPILE, MAXDOP 2)";

                using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
                for (int j = 0; j < batch.Count; j++)
                    cmd.Parameters.AddWithValue($"@id{j}", batch[j] ?? DBNull.Value);

                totalDeleted += await cmd.ExecuteNonQueryAsync();
            }

            UpdateTableVersion(table);
            return totalDeleted;
        }

        #endregion

        #region 🔍 SEARCH

        private (string whereClause, List<SqlParameter> parameters) BuildSearchCondition(TableModel item)
        {
            if (string.IsNullOrWhiteSpace(item.SearchValue))
                return ("", new List<SqlParameter>());

            var parameters = new List<SqlParameter>();
            var searchPattern = $"%{item.SearchValue}%";
            string existingCondition = item.Condition ?? "";
            var columns = GetTableColumns(item.NameTable).Result;

            if (columns == null || columns.Count == 0)
                return ("", new List<SqlParameter>());

            var searchConditions = new List<string>();

            foreach (var col in columns)
            {
                if (col.IsIdColumn) continue;

                if (item.ExcludeColumns != null && item.ExcludeColumns.Any(c => c.Equals(col.Name, StringComparison.OrdinalIgnoreCase)))
                    continue;

                if (item.SearchInColumns != null && item.SearchInColumns.Any() &&
                    !item.SearchInColumns.Any(c => c.Equals(col.Name, StringComparison.OrdinalIgnoreCase)))
                    continue;

                if (col.IsString)
                {
                    string paramName = $"@search_{col.Name}";
                    searchConditions.Add($"[{col.Name}] LIKE {paramName}");
                    parameters.Add(new SqlParameter(paramName, searchPattern));
                }
                else if (col.IsNumeric && int.TryParse(item.SearchValue, out _))
                {
                    string paramName = $"@searchNum_{col.Name}";
                    searchConditions.Add($"[{col.Name}] = {paramName}");
                    parameters.Add(new SqlParameter(paramName, Convert.ToInt32(item.SearchValue)));
                }
            }

            if (searchConditions.Count == 0)
                return ("", new List<SqlParameter>());

            string searchClause = string.Join(" OR ", searchConditions);

            if (!string.IsNullOrEmpty(existingCondition))
            {
                return ($"WHERE ({existingCondition}) AND ({searchClause})", parameters);
            }

            return ($"WHERE {searchClause}", parameters);
        }

        public async Task<List<Dictionary<string, object>>> SearchTable(TableModel item)
        {
            if (string.IsNullOrWhiteSpace(item.SearchValue))
                return await Get_DataFromSql(item);

            var (searchWhere, searchParams) = BuildSearchCondition(item);
            var (whereClause, whereParams) = BuildWhereUltraFast(item.Condition ?? "");

            var allParams = new List<SqlParameter>();
            if (searchParams != null) allParams.AddRange(searchParams);
            if (whereParams != null) allParams.AddRange(whereParams);

            string finalWhere = "";
            if (!string.IsNullOrEmpty(searchWhere) && !string.IsNullOrEmpty(whereClause))
            {
                finalWhere = whereClause + " AND " + searchWhere.Replace("WHERE", "");
            }
            else if (!string.IsNullOrEmpty(searchWhere))
            {
                finalWhere = searchWhere;
            }
            else if (!string.IsNullOrEmpty(whereClause))
            {
                finalWhere = whereClause;
            }

            string orderType = item.OrderType?.ToUpper() == "ASC" ? "ASC" : "DESC";
            string orderBy = string.IsNullOrEmpty(item.OrderByID) ? "1" : item.OrderByID;

            string query;
            if (item.IsPage == true && item.PageSize > 0)
            {
                query = $@"
                    SELECT * FROM {item.NameTable}
                    {finalWhere}
                    ORDER BY {orderBy} {orderType}
                    OFFSET (@PageNumber - 1) * @PageSize ROWS
                    FETCH NEXT @PageSize ROWS ONLY
                    OPTION (RECOMPILE)";

                allParams.Add(new SqlParameter("@PageNumber", item.PageNumber ?? 1));
                allParams.Add(new SqlParameter("@PageSize", item.PageSize));
            }
            else if (item.Top > 0)
            {
                query = $@"
                    SELECT TOP {item.Top} * FROM {item.NameTable}
                    {finalWhere}
                    ORDER BY {orderBy} {orderType}
                    OPTION (RECOMPILE)";
            }
            else
            {
                query = $@"
                    SELECT * FROM {item.NameTable}
                    {finalWhere}
                    OPTION (RECOMPILE)";
            }

            return await ExecuteQueryUltraFast(query, allParams);
        }

        #endregion

        #region 🔧 Helper Methods

        private SqlParameter[] CloneParameters(List<SqlParameter>? parameters)
        {
            if (parameters == null || parameters.Count == 0)
                return Array.Empty<SqlParameter>();

            var cloned = new SqlParameter[parameters.Count];
            for (int i = 0; i < parameters.Count; i++)
            {
                var original = parameters[i];
                cloned[i] = new SqlParameter(original.ParameterName, original.Value ?? DBNull.Value)
                {
                    SqlDbType = original.SqlDbType,
                    Size = original.Size,
                    Precision = original.Precision,
                    Scale = original.Scale,
                    Direction = original.Direction
                };
            }
            return cloned;
        }

        private async Task<List<Dictionary<string, object>>> ExecuteQueryUltraFast(string query, List<SqlParameter>? parameters = null)
        {
            var list = new List<Dictionary<string, object>>();

            await _connectionPool.WaitAsync();
            try
            {
                using var con = new SqlConnection(ConnectionString.connectionString);
                await con.OpenAsync();

                using var cmd = new SqlCommand(query, con) { CommandTimeout = _commandTimeout };

                // ✅ استخدام النسخة الجديدة المكررة
                if (parameters != null && parameters.Count > 0)
                {
                    cmd.Parameters.AddRange(CloneParameters(parameters));
                }

                using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess);

                var fieldCount = reader.FieldCount;
                var fieldNames = new string[fieldCount];
                for (int i = 0; i < fieldCount; i++)
                    fieldNames[i] = reader.GetName(i);

                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>(fieldCount);
                    for (int i = 0; i < fieldCount; i++)
                    {
                        row[fieldNames[i]] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    }
                    list.Add(row);
                }

                return list;
            }
            finally
            {
                _connectionPool.Release();
            }
        }
        private async Task<string?> GetIdentityColumnCached(SqlConnection con, SqlTransaction? tran, string table)
        {
            if (_identityCache.TryGetValue(table, out var cached))
                return cached;

            string query = @"
                SELECT TOP 1 c.name 
                FROM sys.columns c
                INNER JOIN sys.tables t ON c.object_id = t.object_id
                WHERE t.name = @table AND c.is_identity = 1";

            using var cmd = new SqlCommand(query, con, tran);
            cmd.Parameters.AddWithValue("@table", table);

            var result = await cmd.ExecuteScalarAsync();
            string? identityCol = result?.ToString();

            _identityCache[table] = identityCol!;
            return identityCol;
        }

        private async Task<string?> GetPrimaryKeyCached(SqlConnection con, SqlTransaction? tran, string table)
        {
            if (_primaryKeyCache.TryGetValue(table, out var cached))
                return cached;

            string query = @"
                SELECT COL_NAME(ic.object_id, ic.column_id)
                FROM sys.indexes i
                INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                WHERE i.is_primary_key = 1 AND OBJECT_NAME(i.object_id) = @table";

            using var cmd = new SqlCommand(query, con, tran);
            cmd.Parameters.AddWithValue("@table", table);

            var result = await cmd.ExecuteScalarAsync();
            string? pkCol = result?.ToString();

            _primaryKeyCache[table] = pkCol!;
            return pkCol;
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private (string, List<SqlParameter>) BuildWhereUltraFast(string condition)
        {
            if (string.IsNullOrWhiteSpace(condition))
                return ("", new List<SqlParameter>());

            var parameters = new List<SqlParameter>();
            int index = 0;

            // ✅ استخدام Span للاستبدال (أسرع)
            var matches = s_regex.Matches(condition);

            // لو مفيش matches ارجع فوراً
            if (matches.Count == 0)
                return ("WHERE " + condition, parameters);

            foreach (Match match in matches)
            {
                string originalValue = match.Groups[1].ValueSpan.ToString(); // Span أسرع
                string paramName = $"@p{index++}";

                object val;

                // استخدام Length مرة واحدة
                int len = originalValue.Length;

                if (len >= 2 && originalValue[0] == 'N' && originalValue[1] == '\'')
                {
                    val = originalValue.Substring(2, len - 3);
                }
                else if (len >= 1 && originalValue[0] == '\'')
                {
                    val = originalValue.Substring(1, len - 2);
                }
                else if (len == 4 && (originalValue[0] == 'N' || originalValue[0] == 'n') &&
                         (originalValue[1] == 'U' || originalValue[1] == 'u') &&
                         (originalValue[2] == 'L' || originalValue[2] == 'l') &&
                         (originalValue[3] == 'L' || originalValue[3] == 'l'))
                {
                    val = DBNull.Value;
                }
                else
                {
                    // ترتيب المحاولات حسب الأكثر شيوعاً في بياناتك
                    if (int.TryParse(originalValue, out int intVal))
                        val = intVal;
                    else if (decimal.TryParse(originalValue, out decimal decVal))
                        val = decVal;
                    else if (long.TryParse(originalValue, out long longVal))
                        val = longVal;
                    else
                        val = originalValue;
                }

                parameters.Add(new SqlParameter(paramName, val));

                // 🚀 استخدام StringBuilder للاستبدال إذا كان فيه matches كتير
                condition = condition.Replace(match.Value, $"= {paramName}");
            }

            return ("WHERE " + condition, parameters);
        }

        // 🚀 إضافة RegexOptions.NonBacktracking لو target .NET 7+
        private static readonly Regex s_regex = new Regex(
            @"=\s*(N?'[^']*'|'[^']*'|\d+|NULL)",
            RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.NonBacktracking
        );

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, List<ColumnInfo>> _columnsCache = new();

        private async Task<List<ColumnInfo>> GetTableColumns(string tableName)
        {
            if (_columnsCache.TryGetValue(tableName, out var cached))
                return cached;

            await _connectionPool.WaitAsync();
            try
            {
                using var con = new SqlConnection(ConnectionString.connectionString);
                await con.OpenAsync();

                string query = @"
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = @tableName
                    ORDER BY ORDINAL_POSITION";

                using var cmd = new SqlCommand(query, con);
                cmd.Parameters.AddWithValue("@tableName", tableName);

                using var reader = await cmd.ExecuteReaderAsync();

                var columns = new List<ColumnInfo>();
                while (await reader.ReadAsync())
                {
                    var columnName = reader.GetString(0);
                    var dataType = reader.GetString(1);

                    columns.Add(new ColumnInfo
                    {
                        Name = columnName,
                        DataType = dataType,
                        IsString = dataType.Contains("char") || dataType.Contains("text") || dataType.Contains("varchar"),
                        IsNumeric = dataType.Contains("int") || dataType.Contains("decimal") || dataType.Contains("float") || dataType.Contains("numeric"),
                        IsDate = dataType.Contains("date") || dataType.Contains("datetime"),
                        IsNullable = reader.GetString(2) == "YES",
                        IsIdColumn = columnName.Equals("Id", StringComparison.OrdinalIgnoreCase) ||
                                    columnName.Equals("ID", StringComparison.OrdinalIgnoreCase) ||
                                    columnName.EndsWith("Id", StringComparison.OrdinalIgnoreCase)
                    });
                }

                _columnsCache[tableName] = columns;
                return columns;
            }
            finally
            {
                _connectionPool.Release();
            }
        }

        #endregion

        #region 🔄 Transaction
        public async Task<InsertResult> InsertAutoWithResult(SqlConnection con, SqlTransaction? tran, string table, object data)
        {
            if (data is Dictionary<string, object> single)
                return await InsertOneWithResult(con, tran, table, single);
            else if (data is List<Dictionary<string, object>> list)
            {
                var result = new InsertResult();
                foreach (var item in list)
                {
                    var singleResult = await InsertOneWithResult(con, tran, table, item);
                    result.RowsAffected += singleResult.RowsAffected;
                    if (result.InsertedId == null && singleResult.InsertedId != null)
                        result.InsertedId = singleResult.InsertedId;
                }
                return result;
            }
            throw new ArgumentException("Unsupported data type");
        }

        private async Task<InsertResult> InsertOneWithResult(SqlConnection con, SqlTransaction? tran, string table, Dictionary<string, object> data)
        {
            var identityColumn = await GetIdentityColumnCached(con, tran, table);

            var filtered = data
                .Where(k => identityColumn == null || !k.Key.Equals(identityColumn, StringComparison.OrdinalIgnoreCase))
                .ToDictionary(k => k.Key, v => v.Value);

            var columns = string.Join(",", filtered.Keys.Select(k => $"[{k}]"));
            var values = string.Join(",", filtered.Keys.Select(k => "@" + k));

            string query = $"INSERT INTO {table} ({columns}) VALUES ({values})";

            object insertedId = null;

            if (identityColumn != null)
            {
                query += "; SELECT SCOPE_IDENTITY() AS NewId;";
                using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
                foreach (var p in filtered)
                    cmd.Parameters.AddWithValue("@" + p.Key, p.Value ?? DBNull.Value);

                insertedId = await cmd.ExecuteScalarAsync();

                // جلب الصف المدرج بالكامل
                var insertedRow = await GetById(con, tran, table, identityColumn, insertedId);

                UpdateTableVersion(table);

                return new InsertResult
                {
                    RowsAffected = 1,
                    InsertedId = insertedId,
                    InsertedRow = insertedRow
                };
            }
            else
            {
                using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
                foreach (var p in filtered)
                    cmd.Parameters.AddWithValue("@" + p.Key, p.Value ?? DBNull.Value);

                var rowsAffected = await cmd.ExecuteNonQueryAsync();
                UpdateTableVersion(table);

                return new InsertResult
                {
                    RowsAffected = rowsAffected,
                    InsertedId = null,
                    InsertedRow = data
                };
            }
        }
        public async Task<Dictionary<string, object>> GetById(SqlConnection con, SqlTransaction? tran, string table, string idColumn, object idValue)
        {
            string query = $"SELECT * FROM {table} WHERE [{idColumn}] = @Id";

            using var cmd = new SqlCommand(query, con, tran);
            cmd.Parameters.AddWithValue("@Id", idValue);

            using var reader = await cmd.ExecuteReaderAsync();

            var dict = new Dictionary<string, object>();

            if (await reader.ReadAsync())
            {
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    dict[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                }
            }

            return dict;
        }
        public async Task<T> ExecuteTransaction<T>(Func<SqlConnection, SqlTransaction, Task<T>> action)
        {
            using var con = new SqlConnection(ConnectionString.connectionString);
            await con.OpenAsync();

            using var tran = con.BeginTransaction(IsolationLevel.ReadCommitted);

            try
            {
                var result = await action(con, tran);
                await tran.CommitAsync();
                return result;
            }
            catch
            {
                await tran.RollbackAsync();
                throw;
            }
        }


        public QueryResult SelectFrom(string NameTable, string Condition = "", int PageSize = 0, int PageNumber = 0, bool ReturnTotalCount = false, string OrderByID = "", string OrderType = "DESC", string SearchValue = "", List<string>? SelectedColumns = null, List<string>? SearchInColumns = null)
        {

            TableModel Entity = new TableModel();
            Entity.NameTable = NameTable;
            Entity.Condition = Condition;
            Entity.PageSize = PageSize;
            Entity.PageNumber = PageNumber;
            Entity.ReturnTotalCount = ReturnTotalCount;
            Entity.OrderByID = OrderByID;
            Entity.OrderType = OrderType;
            Entity.SearchValue = SearchValue;
            Entity.SelectedColumns = SelectedColumns;
            Entity.SearchInColumns = SearchInColumns;
            Entity.IsPage = PageNumber > 0 ? true : false;

            var task = ProcessSelectUltraFast(Entity, false, null);
            return new QueryResult(task);
        }


        


        public async Task ExecuteTransaction(Func<SqlConnection, SqlTransaction, Task> action)
        {
            await ExecuteTransaction(async (con, tran) =>
            {
                await action(con, tran);
                return true;
            });
        }

        #endregion

        #region 📊 Helpers

        public async Task<int> ExecuteNonQueryAsync(string sql, List<SqlParameter>? parameters = null)
        {
            await _connectionPool.WaitAsync();

            try
            {
                using var con = new SqlConnection(ConnectionString.connectionString);
                await con.OpenAsync();

                using var cmd = new SqlCommand(sql, con)
                {
                    CommandTimeout = _commandTimeout
                };

                if (parameters != null && parameters.Count > 0)
                    cmd.Parameters.AddRange(parameters.ToArray());

                return await cmd.ExecuteNonQueryAsync();
            }
            finally
            {
                _connectionPool.Release();
            }
        }
        public Dictionary<string, object> JsonToDictionary(JsonElement element)
        {
            var dict = new Dictionary<string, object>();

            foreach (var prop in element.EnumerateObject())
            {
                dict[prop.Name] = prop.Value.ValueKind switch
                {
                    JsonValueKind.Object => JsonToDictionary(prop.Value),
                    JsonValueKind.Array => prop.Value.EnumerateArray().Select(x => JsonToDictionary(x)).ToList(),
                    JsonValueKind.Number => prop.Value.TryGetInt64(out var l) ? l : prop.Value.GetDouble(),
                    JsonValueKind.String => prop.Value.GetString()!,
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Null => null!,
                    _ => prop.Value.ToString()
                };
            }

            return dict;
        }

        public void ClearCache()
        {
            _identityCache.Clear();
            _primaryKeyCache.Clear();
            _columnsCache.Clear();
            _schemaCache.Clear();
            _tableVersions.Clear();
        }

        public async Task<bool> DeleteCacheByKey(string cacheKey)
        {
            if (string.IsNullOrEmpty(cacheKey))
                return false;

            bool deleted = false;

            try
            {
                // 1️⃣ حذف من Redis Cache لو موجود
                if (_enableRedis && _useRedis && _redisCache != null)
                {
                    await _redisCache.RemoveAsync(cacheKey);
                    deleted = true;
                    Console.WriteLine($"🗑️ Redis Cache deleted: {cacheKey}");
                }

                // 2️⃣ حذف من Memory Cache لو موجود
                if (_useMemoryCacheFallback && _memoryCache != null)
                {
                    _memoryCache.Remove(cacheKey);
                    deleted = true;
                    Console.WriteLine($"🗑️ Memory Cache deleted: {cacheKey}");
                }

                return deleted;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Error deleting cache key '{cacheKey}': {ex.Message}");
                return false;
            }
        }


   









        // ✅ النسخة التي تعمل داخل Transaction (مع con و tran)
        public async Task<(int ReturnValue, int TrNo, int Ok)> RunProcessTrans(
            SqlConnection con,
            SqlTransaction tran,
            int comp,
            int branch,
            string trType,
            string opMode,
            int trId)
        {
            using var cmd = new SqlCommand("G_ProcessTrans", con, tran)
            {
                CommandType = CommandType.StoredProcedure,
                CommandTimeout = 60
            };

            // ✅ Input Parameters
            cmd.Parameters.AddWithValue("@Comp", comp);
            cmd.Parameters.AddWithValue("@Branch", branch);
            cmd.Parameters.AddWithValue("@TrType", trType);
            cmd.Parameters.AddWithValue("@OpMode", opMode);
            cmd.Parameters.AddWithValue("@TrID", trId);

            // ✅ Output Parameters
            var pTrNo = new SqlParameter("@TrNo", SqlDbType.Int) { Direction = ParameterDirection.Output };
            var pOk = new SqlParameter("@Ok", SqlDbType.Int) { Direction = ParameterDirection.Output };
            cmd.Parameters.Add(pTrNo);
            cmd.Parameters.Add(pOk);

            // ✅ Return Value
            var pReturn = new SqlParameter("@return_value", SqlDbType.Int) { Direction = ParameterDirection.ReturnValue };
            cmd.Parameters.Add(pReturn);

            // ✅ تنفيذ (مباشر من قاعدة البيانات، بدون Cache)
            await cmd.ExecuteNonQueryAsync();

            return (
                ReturnValue: pReturn.Value != DBNull.Value ? Convert.ToInt32(pReturn.Value) : 0,
                TrNo: pTrNo.Value != DBNull.Value ? Convert.ToInt32(pTrNo.Value) : 0,
                Ok: pOk.Value != DBNull.Value ? Convert.ToInt32(pOk.Value) : 0
            );
        }

        // ✅ نسخة بدون Transaction (للاستخدام العادي)
        public async Task<(int ReturnValue, int TrNo, int Ok)> RunProcessTrans(
            int comp,
            int branch,
            string trType,
            string opMode,
            int trId)
        {
            return await ExecuteTransaction(async (con, tran) =>
            {
                return await RunProcessTrans(con, tran, comp, branch, trType, opMode, trId);
            });
        }


        /// <summary>
        /// أسرع طريقة لحذف جميع التفاصيل المرتبطة بـ Master ID
        /// </summary>
        public async Task<(string TableName, int RowsAffected)> DeleteAllRelatedByMasterId(
            SqlConnection con,
            SqlTransaction? tran,
            string tableName,
            string foreignKeyColumn,
            int masterId)
        {
            // 🔥 Query واحدة فقط تحذف كل حاجة
            string query = $"DELETE FROM {tableName} WHERE [{foreignKeyColumn}] = @MasterId";

            using var cmd = new SqlCommand(query, con, tran);
            cmd.Parameters.AddWithValue("@MasterId", masterId);

            int rowsAffected = await cmd.ExecuteNonQueryAsync();
            UpdateTableVersion(tableName);

            return (tableName, rowsAffected);
        }

        /// <summary>
        /// حذف بواسطة Foreign Key (أسرع طريقة)
        /// </summary>
        public async Task<int> DeleteListByForeignKey(
            SqlConnection con,
            SqlTransaction? tran,
            string table,
            string foreignKeyColumn,
            List<object> foreignKeyValues)
        {
            if (foreignKeyValues == null || foreignKeyValues.Count == 0) return 0;

            var paramNames = foreignKeyValues.Select((_, i) => $"@fk{i}").ToList();
            string query = $@"
        DELETE FROM {table} 
        WHERE [{foreignKeyColumn}] IN ({string.Join(",", paramNames)})
        OPTION (RECOMPILE)";

            using var cmd = new SqlCommand(query, con, tran) { CommandTimeout = _commandTimeout };
            for (int i = 0; i < foreignKeyValues.Count; i++)
                cmd.Parameters.AddWithValue($"@fk{i}", foreignKeyValues[i] ?? DBNull.Value);

            UpdateTableVersion(table);
            return await cmd.ExecuteNonQueryAsync();
        }
        public static void ClearTableCache(string tableName)
        {
            if (string.IsNullOrEmpty(tableName)) return;

            // حذف Cache Key للجدول
            var keysToRemove = _tableVersions.Keys
                .Where(k => k.StartsWith(tableName, StringComparison.OrdinalIgnoreCase))
                .ToList();

            foreach (var key in keysToRemove)
            {
                _tableVersions.TryRemove(key, out _);
            }

            // تحديث النسخة عشان تجبر تحديث الـ Cache
            var newVersion = DateTime.Now.Ticks;
            _tableVersions[tableName] = newVersion;

            Console.WriteLine($"🗑️ Cache cleared for table: {tableName}");
        }

        /// <summary>
        /// مسح Cache مجموعة جداول
        /// </summary>
        public static void ClearTablesCache(IEnumerable<string> tableNames)
        {
            foreach (var table in tableNames)
            {
                ClearTableCache(table);
            }
        }

        /// <summary>
        /// مسح كل الـ Cache
        /// </summary>
        public static void ClearAllCache()
        {
            _tableVersions.Clear();
            _identityCache.Clear();
            _primaryKeyCache.Clear();
            _columnsCache.Clear();
            _schemaCache.Clear();

            Console.WriteLine("🗑️ All caches cleared!");
        }

        #endregion
    }



    #region 📦 ConnectionString


    #endregion
}