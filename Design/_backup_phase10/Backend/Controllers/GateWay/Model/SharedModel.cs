

using System;
using System.Collections.Generic;
using System.Text.Json;

namespace GateWay.App
{

    static partial class ConnectionString
    {
        public static string connectionString { get; set; }
        public static string CompanyEmail { get; set; }
        public static string CompanyPassEmail { get; set; }
        public static string Url_APITax { get; set; }
        public static string PathSaveData { get; set; }
        public static string FlageRun { get; set; }
        public static string FlageRun_Redis { get; set; }

    }



    public class TableModel
    {
        public string NameTable { get; set; } = string.Empty;
        public string? Condition { get; set; } = "";
        public string? OrderByID { get; set; } = "";
        public string? OrderType { get; set; } = "DESC";
        public bool? IsPage { get; set; } = false;
        public int? PageNumber { get; set; } = 0;
        public int PageSize { get; set; } = 0;
        public int Top { get; set; } = 0;
        public bool IsProc { get; set; } = false;
        public bool IsExec { get; set; } = false;
        public int CacheFlag { get; set; } = 0;
        public string? SearchValue { get; set; } = "";
        public Dictionary<string, object>? parameters { get; set; }
        public List<string>? SelectedColumns { get; set; } = null;
        public List<string>? ExcludeColumns { get; set; } = null;
        public List<string>? SearchInColumns { get; set; } = null;
        public bool ReturnTotalCount { get; set; } = false;  // ✅ جديد: لو true هيرجع العدد الإجمالي كمان
    }

    public class InsertRequest
    {
        public string TableName { get; set; } = string.Empty;
        public JsonElement Data { get; set; }
    }

    public class InsertListRequest
    {
        public string TableName { get; set; } = string.Empty;
        public List<JsonElement> DataList { get; set; } = new();
    }

    public class UpdateRequest
    {
        public string TableName { get; set; } = string.Empty;
        public string KeyColumn { get; set; } = "Id";
        public JsonElement Data { get; set; }
    }

    public class UpdateListRequest
    {
        public string TableName { get; set; } = string.Empty;
        public string KeyColumn { get; set; } = "Id";
        public List<JsonElement> DataList { get; set; } = new();
    }

    public class DeleteRequest
    {
        public string TableName { get; set; } = string.Empty;
        public string KeyColumn { get; set; } = "Id";
        public List<int> Ids { get; set; } = new();
        public bool DeleteAllRelated { get; set; } = false;  // ✅ أضف هذا السطر
    }


    public class BulkInsertRequest
    {
        public string TableName { get; set; } = string.Empty;
        public List<JsonElement> DataList { get; set; } = new();
    }

    public class BulkUpdateRequest
    {
        public string TableName { get; set; } = string.Empty;
        public string KeyColumn { get; set; } = "Id";
        public List<JsonElement> DataList { get; set; } = new();
    }


    public class ModelUpdateMasterDetail
    {
        // ✅基本信息
        public int CompCode { get; set; }
        public int BranchCode { get; set; }
        public string? KeyTrType { get; set; } = "";
        public string MasterKeyColumn { get; set; } = "";

        // ✅ هل نشغل الـ SP بعد الإدخال؟
        public bool RunProcessTrans { get; set; } = false;  // افتراضي: لا

        // ✅ Master (إجباري)
        public UpdateRequest Master { get; set; } = new();

        // ✅ Details (كلهم اختياريين)
        public DetailWrapper? Detail_1 { get; set; }
        public DetailWrapper? Detail_2 { get; set; }
        public DetailWrapper? Detail_3 { get; set; }
        public DetailWrapper? Detail_4 { get; set; }
        public DetailWrapper? Detail_5 { get; set; }
    }


    public class ModelInsertMasterDetail
    {
        // ✅基本信息
        public int CompCode { get; set; }
        public int BranchCode { get; set; }
        public string? KeyTrType { get; set; } = "";
        public string MasterKeyColumn { get; set; } = "";

        // ✅ هل نشغل الـ SP بعد الإدخال؟
        public bool RunProcessTrans { get; set; } = false;  // افتراضي: لا

        // ✅ Master (إجباري)
        public InsertRequest Master { get; set; } = new();

        // ✅ Details (كلهم اختياريين)
        public DetailWrapper? Detail_1 { get; set; }
        public DetailWrapper? Detail_2 { get; set; }
        public DetailWrapper? Detail_3 { get; set; }
        public DetailWrapper? Detail_4 { get; set; }
        public DetailWrapper? Detail_5 { get; set; }
    }

    // ✅ Update DetailWrapper لدعم Foreign Key مختلف لكل Detail
    public class DetailWrapper
    {
        public BulkInsertRequest? BulkInsertRequest { get; set; }
        public DeleteRequest? Delete_Details { get; set; }

        // ✅ جديد: اسم العمود الأجنبي في جدول الـ Detail (لو مختلف عن الـ Master)
        public string? DetailForeignKeyColumn { get; set; }
    }



    #region 📦 TableModel
    public class ResponseModel
    {
        public bool ResponseState { get; set; }

        public int TrNo { get; set; }
    }

    public class ModelDeleteMasterDetail
    {
        public int CompCode { get; set; }
        public int BranchCode { get; set; }
        public string KeyTrType { get; set; } = "";
        public string MasterKeyColumn { get; set; } = "";
        public bool RunProcessTrans { get; set; } = false;

        public DeleteMasterModel Master { get; set; } = new();
        public DetailWrapper? Detail_1 { get; set; }
        public DetailWrapper? Detail_2 { get; set; }
        public DetailWrapper? Detail_3 { get; set; }
        public DetailWrapper? Detail_4 { get; set; }
        public DetailWrapper? Detail_5 { get; set; }
    }

    public class DeleteMasterModel
    {
        public string TableName { get; set; } = string.Empty;
        public string KeyColumn { get; set; } = "Id";
        public int Id { get; set; }
    }


    #endregion

    #region 📦 CacheStatus Class

    public class CacheStatus
    {
        public bool IsRedisEnabled { get; set; }
        public bool IsRedisConnected { get; set; }
        public bool IsAutoCacheEnabled { get; set; }
        public bool IsMemoryCacheFallbackEnabled { get; set; }
        public int CacheDurationSeconds { get; set; }
        public List<string> AllowedTables { get; set; } = new();
        public List<string> ExcludedTables { get; set; } = new();
        public int MinRecordsForCache { get; set; }

        public string GetStatusText()
        {
            if (!IsAutoCacheEnabled)
                return "❌ Auto Cache is DISABLED";

            if (IsRedisEnabled && IsRedisConnected)
                return $"✅ Redis Cache ENABLED (Duration: {CacheDurationSeconds}s)";

            if (IsMemoryCacheFallbackEnabled)
                return $"🟡 Memory Cache Fallback ENABLED (Redis is OFF)";

            return "❌ All Caches are DISABLED";
        }

        public string GetAllowedTablesText()
        {
            if (AllowedTables == null || AllowedTables.Count == 0)
                return "ALL TABLES";
            return string.Join(", ", AllowedTables);
        }

        public string GetExcludedTablesText()
        {
            if (ExcludedTables == null || ExcludedTables.Count == 0)
                return "NONE";
            return string.Join(", ", ExcludedTables);
        }
    }

    #endregion

    #region 📦 كلاس معلومات الجدول

    public class TableSchema
    {
        public List<ColumnInfo> Columns { get; set; } = new();
        public Dictionary<string, ColumnInfo> ColumnMap { get; set; } = new();
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }

    public class ColumnInfo
    {
        public string Name { get; set; } = string.Empty;
        public string DataType { get; set; } = string.Empty;
        public bool IsString { get; set; }
        public bool IsNumeric { get; set; }
        public bool IsDate { get; set; }
        public bool IsNullable { get; set; }
        public bool IsIdColumn { get; set; }
        public int MaxLength { get; set; }
    }


    public class InsertResult
    {
        public int RowsAffected { get; set; }
        public object InsertedId { get; set; }
        public Dictionary<string, object> InsertedRow { get; set; }
        public bool HasIdentity => InsertedId != null;
    }
    public class UpdateResult
    {
        public int RowsAffected { get; set; }
        public object? UpdatedId { get; set; }
        public List<object> UpdatedIds { get; set; } = new();
        public Dictionary<string, object>? UpdatedRow { get; set; }
        public List<Dictionary<string, object>> UpdatedRows { get; set; } = new();
        public Dictionary<string, object>? OldRow { get; set; }
        public List<Dictionary<string, object>> OldRows { get; set; } = new();
        public bool IsSuccess => RowsAffected > 0;
    }


    public class PerformanceStats
    {
        public long TotalQueries { get; set; }
        public long TotalCacheHits { get; set; }
        public long TotalCacheMisses { get; set; }
        public double CacheHitRate { get; set; }
        public long TotalErrors { get; set; }
        public double ErrorRate { get; set; }
        public double AverageQueryTimeMs { get; set; }
        public double UptimeSeconds { get; set; }
    }

    #endregion

}
