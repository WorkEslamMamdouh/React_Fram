#nullable enable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using ERP.Common;

namespace ERP.Attendance
{
    public class PunchRecord
    {
        public string DeviceUserId { get; set; } = "";
        public DateTime PunchLocal { get; set; }
        public int State { get; set; } = 255;
        public int? Verify { get; set; }
        public string? WorkCode { get; set; }
        public string? Raw { get; set; }
    }

    public class IngestResult
    {
        public int Inserted { get; set; }
        public int Duplicates { get; set; }
        public DateTime? LastPunchLocal { get; set; }
    }

    // W1-5: append-only raw punch ingest with dedupe on (DeviceId, DeviceUserId, PunchLocal, State).
    public class PunchIngestService
    {
        public async Task<IngestResult> IngestAsync(int deviceId, string source, IEnumerable<PunchRecord> records)
        {
            var result = new IngestResult();
            using var con = await RuntimeDb.OpenAsync();

            // device time zone for PunchUtc
            var tzId = RuntimeDb.S((await RuntimeDb.QueryAsync(con, null, "SELECT TimeZoneId FROM dbo.Sys_Devices WHERE DeviceId=@id", ("@id", deviceId)))
                        is { Count: > 0 } rows ? rows[0]["TimeZoneId"] : null);
            TimeZoneInfo? tz = null;
            if (!string.IsNullOrEmpty(tzId)) { try { tz = TimeZoneInfo.FindSystemTimeZoneById(tzId); } catch { } }

            foreach (var rec in records)
            {
                DateTime? utc = null;
                if (tz != null) { try { utc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(rec.PunchLocal, DateTimeKind.Unspecified), tz); } catch { } }

                const string sql =
                    "INSERT INTO dbo.Att_RawPunch (DeviceId, DeviceUserId, PunchLocal, PunchUtc, State, VerifyMode, WorkCode, Source, RawPayload) " +
                    "SELECT @d,@u,@t,@utc,@s,@v,@w,@src,@raw " +
                    "WHERE NOT EXISTS (SELECT 1 FROM dbo.Att_RawPunch WHERE DeviceId=@d AND DeviceUserId=@u AND PunchLocal=@t AND State=@s);";
                using var cmd = new SqlCommand(sql, con);
                cmd.Parameters.AddWithValue("@d", deviceId);
                cmd.Parameters.AddWithValue("@u", rec.DeviceUserId);
                cmd.Parameters.AddWithValue("@t", rec.PunchLocal);
                cmd.Parameters.AddWithValue("@utc", (object?)utc ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@s", (byte)(rec.State & 0xFF));
                cmd.Parameters.AddWithValue("@v", (object?)(rec.Verify.HasValue ? (byte)(rec.Verify.Value & 0xFF) : (byte?)null) ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@w", (object?)rec.WorkCode ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@src", source);
                cmd.Parameters.AddWithValue("@raw", (object?)(rec.Raw?.Length > 1000 ? rec.Raw.Substring(0, 1000) : rec.Raw) ?? DBNull.Value);
                int n = await cmd.ExecuteNonQueryAsync();
                if (n > 0) result.Inserted++; else result.Duplicates++;
                if (result.LastPunchLocal == null || rec.PunchLocal > result.LastPunchLocal) result.LastPunchLocal = rec.PunchLocal;
            }

            if (result.Inserted > 0 && result.LastPunchLocal != null)
                await RuntimeDb.ExecuteAsync(con, null,
                    "UPDATE dbo.Sys_Devices SET LastPunchLocal=@lp, LastSyncAtUtc=SYSUTCDATETIME() WHERE DeviceId=@id",
                    ("@lp", result.LastPunchLocal.Value), ("@id", deviceId));

            return result;
        }
    }
}
