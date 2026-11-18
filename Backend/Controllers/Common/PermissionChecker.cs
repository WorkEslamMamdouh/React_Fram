#nullable enable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ERP.Common;

namespace ERP.Common
{
    // W1-4: permission check against IQ_Sys_RoleModule for any flag.
    public class PermissionChecker
    {
        private static readonly HashSet<string> Flags = new(StringComparer.OrdinalIgnoreCase)
        { "PRINT","VIEW","CREATE","EDIT","DELETE","EXECUTE","CUSTOM1","CUSTOM2","CUSTOM3","CUSTOM4","CUSTOM5","CUSTOM6","CUSTOM7","CUSTOM8","CUSTOM9" };

        public async Task<bool> HasAsync(int userId, string moduleCode, int compCode, int branchCode, string flag)
        {
            if (!Flags.Contains(flag)) return false; // whitelist guards the column name
            var col = flag.ToUpperInvariant();
            var sql = $"SELECT TOP 1 1 FROM dbo.IQ_Sys_RoleModule WHERE UserID=@u AND MODULE_CODE=@m AND CompCode=@c AND [{col}]=1";
            var row = await RuntimeDb.FirstAsync(sql, ("@u", userId), ("@m", moduleCode), ("@c", compCode));
            return row != null;
        }
    }
}
