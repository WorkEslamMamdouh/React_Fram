#nullable enable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json.Linq;
using ERP.Common;

namespace ERP.CustomFields
{
    // W1-10: custom fields without schema change. Values live in Sys_RecordExtra; wire format is a __extra object.
    public class CustomFieldService
    {
        // cached set of entity table names so plain screens skip the hook
        private static HashSet<string>? _entityTables;
        private static DateTime _expiry = DateTime.MinValue;
        private static readonly System.Threading.SemaphoreSlim _lock = new(1, 1);

        public async Task<bool> HasEntityAsync(string table)
        {
            var t = Strip(table);
            if (_entityTables == null || DateTime.UtcNow >= _expiry)
            {
                await _lock.WaitAsync();
                try
                {
                    if (_entityTables == null || DateTime.UtcNow >= _expiry)
                    {
                        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        try { foreach (var r in await RuntimeDb.QueryAsync("SELECT TableName FROM dbo.Sys_CustomFieldEntity WHERE IsActive=1")) set.Add(Strip(RuntimeDb.S(r["TableName"]) ?? "")); }
                        catch { }
                        _entityTables = set; _expiry = DateTime.UtcNow.AddSeconds(30);
                    }
                }
                finally { _lock.Release(); }
            }
            return _entityTables!.Contains(t);
        }

        public async Task<object?> GetDefsAsync(string entity, int? compCode)
        {
            var ent = await RuntimeDb.FirstAsync(
                "SELECT EntityCode, TableName, ViewName, KeyColumn, ModuleCode FROM dbo.Sys_CustomFieldEntity WHERE EntityCode=@e AND IsActive=1", ("@e", entity));
            if (ent == null) return null;
            var defs = await RuntimeDb.QueryAsync(
                "SELECT FieldCode, LabelA, LabelE, FieldType, IsRequired, MaxLength, MinValue, MaxValue, Regex, OptionsJson, LookupJson, DefaultValue, ShowInGrid, ShowInForm, IsReadOnly, SortOrder, GroupName " +
                "FROM dbo.Sys_CustomFieldDef WHERE EntityCode=@e AND IsActive=1 AND (CompCode IS NULL OR CompCode=@c) ORDER BY SortOrder, FieldId",
                ("@e", entity), ("@c", (object?)compCode));
            var fields = new List<object>();
            foreach (var d in defs)
                fields.Add(new
                {
                    fieldCode = RuntimeDb.S(d["FieldCode"]),
                    labelA = RuntimeDb.S(d["LabelA"]),
                    labelE = RuntimeDb.S(d["LabelE"]),
                    fieldType = RuntimeDb.S(d["FieldType"]),
                    isRequired = Convert.ToBoolean(d["IsRequired"]),
                    maxLength = RuntimeDb.NI(d["MaxLength"]),
                    minValue = d["MinValue"],
                    maxValue = d["MaxValue"],
                    regex = RuntimeDb.S(d["Regex"]),
                    options = ParseJson(RuntimeDb.S(d["OptionsJson"])),
                    lookup = ParseJson(RuntimeDb.S(d["LookupJson"])),
                    defaultValue = RuntimeDb.S(d["DefaultValue"]),
                    showInGrid = Convert.ToBoolean(d["ShowInGrid"]),
                    showInForm = Convert.ToBoolean(d["ShowInForm"]),
                    isReadOnly = Convert.ToBoolean(d["IsReadOnly"]),
                    sortOrder = RuntimeDb.I(d["SortOrder"]),
                    groupName = RuntimeDb.S(d["GroupName"])
                });
            return new
            {
                entity = new { entityCode = RuntimeDb.S(ent["EntityCode"]), tableName = RuntimeDb.S(ent["TableName"]), keyColumn = RuntimeDb.S(ent["KeyColumn"]), moduleCode = RuntimeDb.S(ent["ModuleCode"]) },
                fields
            };
        }

        // Remove "__extra" from the write dict and return its object (or null). Call BEFORE insert/update so old tables never see it.
        public JObject? SplitExtra(Dictionary<string, object> dict)
        {
            if (!dict.TryGetValue("__extra", out var v)) return null;
            dict.Remove("__extra");
            try { return v is JObject jo ? jo : JObject.Parse(v?.ToString() ?? "{}"); }
            catch { return null; }
        }

        // Upsert Sys_RecordExtra (merge: keys present overwrite, null removes). recordKey = inserted id or key value.
        public async Task SaveExtraAsync(SqlConnection con, SqlTransaction? tran, string tableName, string recordKey, JObject extra, int? userId)
        {
            var ent = await RuntimeDb.QueryAsync(con, tran, "SELECT EntityCode FROM dbo.Sys_CustomFieldEntity WHERE TableName=@t AND IsActive=1", ("@t", Strip(tableName)));
            if (ent.Count == 0) return;
            var entityCode = RuntimeDb.S(ent[0]["EntityCode"])!;
            var existing = await RuntimeDb.QueryAsync(con, tran, "SELECT ExtraJson FROM dbo.Sys_RecordExtra WHERE EntityCode=@e AND RecordKey=@k", ("@e", entityCode), ("@k", recordKey));
            JObject merged = existing.Count > 0 ? JObject.Parse(RuntimeDb.S(existing[0]["ExtraJson"]) ?? "{}") : new JObject();
            foreach (var p in extra.Properties())
            {
                if (p.Value.Type == JTokenType.Null) merged.Remove(p.Name);
                else merged[p.Name] = p.Value;
            }
            await RuntimeDb.ExecuteAsync(con, tran,
                "MERGE dbo.Sys_RecordExtra AS t USING (SELECT @e AS EntityCode, @k AS RecordKey) s ON t.EntityCode=s.EntityCode AND t.RecordKey=s.RecordKey " +
                "WHEN MATCHED THEN UPDATE SET ExtraJson=@j, UpdatedAtUtc=SYSUTCDATETIME(), UpdatedBy=@u " +
                "WHEN NOT MATCHED THEN INSERT (EntityCode, RecordKey, ExtraJson, UpdatedBy) VALUES (@e,@k,@j,@u);",
                ("@e", entityCode), ("@k", recordKey), ("@j", merged.ToString(Newtonsoft.Json.Formatting.None)), ("@u", (object?)userId));
        }

        private static object? ParseJson(string? s) { if (string.IsNullOrEmpty(s)) return null; try { return JToken.Parse(s!); } catch { return null; } }
        private static string Strip(string t) { t = t.Replace("[", "").Replace("]", ""); int i = t.LastIndexOf('.'); return (i >= 0 ? t.Substring(i + 1) : t).Trim(); }
    }
}
