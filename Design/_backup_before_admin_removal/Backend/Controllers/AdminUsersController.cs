using GateWay.App;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;

// =====================================================================================
//  AdminUsersController  -  إدارة المستخدمين والأدوار والصلاحيات (المرحلة 4)
//  - كل النداءات محتاجة JWT (Authorization: Bearer ...) + صلاحية EXECUTE على شاشة الإدارة
//    (Sys_UsersAdmin / Sys_RolesAdmin / Sys_UserPermsAdmin) والكتابة محتاجة CREATE أو EDIT.
//  - كل الكتابة جوه ترانزاكشن واحد وباراميترات (مفيش دمج نصوص في الـ SQL).
//  - كلمة السر محفوظة نص عادي في Sys_Users.USER_Password (نفس نظام الدخول الحالي AuthController).
//  - مفيش حذف نهائي لمستخدم: التعطيل بس (USER_ACTIVE = 0).
// =====================================================================================
namespace ERP.Controllers
{
    using Row = Dictionary<string, object>;

    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]   // auth is checked in Begin(): JWT + module permission, or X-Admin-Token (super admin)
    public class AdminUsersController : ControllerBase
    {
        private const string ModUsers = "Sys_UsersAdmin";
        private const string ModRoles = "Sys_RolesAdmin";
        private const string ModUserPerms = "Sys_UserPermsAdmin";

        private static readonly string[] PermKeys =
        {
            "EXECUTE", "CREATE", "EDIT", "DELETE", "PRINT", "VIEW",
            "CUSTOM1", "CUSTOM2", "CUSTOM3", "CUSTOM4", "CUSTOM5", "CUSTOM6", "CUSTOM7", "CUSTOM8", "CUSTOM9"
        };

        // ------------------------------------------------------------------ models
        public class ListUsersRequest { public string Search { get; set; } public int? Active { get; set; } public int Page { get; set; } = 1; public int PageSize { get; set; } = 25; }
        public class UserIdRequest { public int UserId { get; set; } }
        public class AssignmentDto { public int RoleId { get; set; } public int CompCode { get; set; } public int BranchCode { get; set; } }
        public class SaveUserRequest
        {
            public int UserId { get; set; }
            public string UserCode { get; set; }
            public string UserName { get; set; }
            public string Email { get; set; }
            public bool Active { get; set; } = true;
            public long? EmpId { get; set; }
            public string Password { get; set; }
            public List<AssignmentDto> Assignments { get; set; } = new List<AssignmentDto>();
        }
        public class SetPasswordRequest { public int UserId { get; set; } public string NewPassword { get; set; } }
        public class SetActiveRequest { public int UserId { get; set; } public bool Active { get; set; } }
        public class SaveRoleRequest
        {
            public int RoleId { get; set; } = -1;     // -1 = جديد
            public string DescA { get; set; }
            public string DescE { get; set; }
            public string Remarks { get; set; }
            public bool IsAvailable { get; set; } = true;
            public int? CompCode { get; set; }
            public bool? IsAdmin { get; set; }
        }
        public class RoleIdRequest { public int RoleId { get; set; } }
        public class PermRow { public string ModuleCode { get; set; } public Dictionary<string, bool> Perms { get; set; } = new Dictionary<string, bool>(); }
        public class SaveRoleMatrixRequest { public int RoleId { get; set; } public List<PermRow> Rows { get; set; } = new List<PermRow>(); }
        public class UserMatrixRequest { public int UserId { get; set; } public int CompCode { get; set; } public int BranchCode { get; set; } }
        public class SaveUserMatrixRequest
        {
            public int UserId { get; set; }
            public int CompCode { get; set; }
            public int BranchCode { get; set; }
            public List<PermRow> Rows { get; set; } = new List<PermRow>();
            public List<string> RemoveModules { get; set; } = new List<string>();
        }

        // ------------------------------------------------------------------ helpers
        private static SqlConnection Open()
        {
            var c = new SqlConnection(ConnectionString.connectionString);
            c.Open();
            return c;
        }

        private static SqlParameter P(string name, object value) => new SqlParameter(name, value ?? DBNull.Value);

        private static async Task<List<Row>> Rows(SqlConnection c, SqlTransaction t, string sql, params SqlParameter[] ps)
        {
            using var cmd = new SqlCommand(sql, c, t) { CommandTimeout = 60 };
            if (ps != null && ps.Length > 0) cmd.Parameters.AddRange(ps);
            var list = new List<Row>();
            using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var d = new Row();
                for (int i = 0; i < r.FieldCount; i++) d[r.GetName(i)] = r.IsDBNull(i) ? null : r.GetValue(i);
                list.Add(d);
            }
            return list;
        }

        private static async Task<int> Exec(SqlConnection c, SqlTransaction t, string sql, params SqlParameter[] ps)
        {
            using var cmd = new SqlCommand(sql, c, t) { CommandTimeout = 60 };
            if (ps != null && ps.Length > 0) cmd.Parameters.AddRange(ps);
            return await cmd.ExecuteNonQueryAsync();
        }

        private static async Task<object> Scalar(SqlConnection c, SqlTransaction t, string sql, params SqlParameter[] ps)
        {
            using var cmd = new SqlCommand(sql, c, t) { CommandTimeout = 60 };
            if (ps != null && ps.Length > 0) cmd.Parameters.AddRange(ps);
            var v = await cmd.ExecuteScalarAsync();
            return v == DBNull.Value ? null : v;
        }

        private int CurrentUserId()
        {
            var v = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(v, out var id) ? id : 0;
        }

        private IActionResult Fail(string msg, HttpStatusCode code = HttpStatusCode.BadRequest) =>
            Ok(JsonConvert.SerializeObject(new BaseResponse(code, msg)));
        private IActionResult Good(object data) => Ok(JsonConvert.SerializeObject(new BaseResponse(data)));

        /// صلاحية المستخدم الحالي على شاشة (أو أكتر): اليوزر الأول وإلا الدور — نفس منطق الفرونت.
        private static async Task<bool> HasAccess(SqlConnection c, int userId, string[] modules, bool write)
        {
            if (userId <= 0) return false;
            foreach (var m in modules)
            {
                var avail = await Scalar(c, null, "SELECT ISNULL(AVAILABLE,1) FROM Sys_Modules WHERE MODULE_CODE=@m", P("@m", m));
                if (avail == null || Convert.ToInt32(avail) != 1) continue;

                var rows = await Rows(c, null, "SELECT [EXECUTE],[CREATE],[EDIT] FROM Sys_UserModule WHERE UserID=@u AND MODULE_CODE=@m", P("@u", userId), P("@m", m));
                if (rows.Count == 0)
                    rows = await Rows(c, null,
                        @"SELECT rm.[EXECUTE], rm.[CREATE], rm.[EDIT] FROM Sys_RoleModule rm
                          WHERE rm.MODULE_CODE=@m AND rm.RoleId IN (SELECT RoleId FROM Sys_RoleUsers WHERE UserID=@u AND ISActive=1)",
                        P("@u", userId), P("@m", m));

                bool ok = rows.Any(r => B(r["EXECUTE"]) && (!write || B(r["CREATE"]) || B(r["EDIT"])));
                if (ok) return true;
            }
            return false;
        }

        private static bool B(object v) => v != null && v != DBNull.Value && (v is bool b ? b : Convert.ToInt32(v) != 0);

        private async Task<(SqlConnection con, IActionResult denied)> Begin(string[] modules, bool write)
        {
            // X-Admin-Token (admin portal) = super admin: skips the module-permission check only
            if (AdminTokenStore.IsValid(Request.Headers["X-Admin-Token"].ToString())) return (Open(), null);
            if (CurrentUserId() <= 0) return (null, Unauthorized());
            var c = Open();
            if (!await HasAccess(c, CurrentUserId(), modules, write))
            {
                c.Dispose();
                return (null, Fail("You do not have permission for this operation / ليس لديك صلاحية لهذه العملية", HttpStatusCode.Forbidden));
            }
            return (c, null);
        }

        private static string LikeEscape(string s) => s.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

        private static async Task<bool> ColumnExists(SqlConnection c, SqlTransaction t, string table, string col) =>
            await Scalar(c, t, "SELECT COL_LENGTH(@t,@c)", P("@t", "dbo." + table), P("@c", col)) != null;

        private IActionResult Err(Exception ex)
        {
            if (ex is SqlException sx)
            {
                if (sx.Number == 2627 || sx.Number == 2601)
                    return Fail("Duplicate key. If this happens when saving user overrides, run the Sys_UserModule key change in Database/Phase4_Permissions.sql (section B). / تكرار مفتاح — لو بتحفظ استثناءات يوزر شغّل القسم B في Phase4_Permissions.sql");
                if (sx.Number == 8152)
                    return Fail("Value too long for column (Sys_UserModule.MODULE_CODE is NVARCHAR(20): see Phase4_Permissions.sql section B). / القيمة أطول من العمود");
            }
            return Fail(ex.Message);
        }

        // ------------------------------------------------------------------ lookups
        [HttpPost("Lookups")]
        public async Task<IActionResult> Lookups()
        {
            var (c, denied) = await Begin(new[] { ModUsers, ModRoles, ModUserPerms }, false);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    bool hasAdmin = await ColumnExists(c, null, "Sys_Role", "IsAdmin");
                    var companies = await Rows(c, null, "SELECT CompCode,NameA,NameE,IsActive FROM Sys_Company ORDER BY CompCode");
                    var branches = await Rows(c, null, "SELECT CompCode,BranchCode,BranchDescA,BranchDescE,IsActive FROM Sys_Branch ORDER BY CompCode,BranchCode");
                    var roles = await Rows(c, null, "SELECT RoleId,DescA,DescE,IsAvailable FROM Sys_Role ORDER BY RoleId");
                    return Good(new { companies, branches, roles, hasIsAdmin = hasAdmin });
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        // ------------------------------------------------------------------ users
        [HttpPost("ListUsers")]
        public async Task<IActionResult> ListUsers([FromBody] ListUsersRequest req)
        {
            var (c, denied) = await Begin(new[] { ModUsers, ModUserPerms }, false);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    req ??= new ListUsersRequest();
                    int page = Math.Max(1, req.Page);
                    int size = Math.Min(200, Math.Max(1, req.PageSize));
                    string s = (req.Search ?? "").Trim();
                    string like = "%" + LikeEscape(s) + "%";
                    object active = req.Active.HasValue ? (object)req.Active.Value : DBNull.Value;

                    string where = @"WHERE (@s = N'' OR u.USER_CODE LIKE @like OR u.USER_NAME LIKE @like OR u.USER_Email LIKE @like)
                                     AND (@a IS NULL OR ISNULL(u.USER_ACTIVE,0) = @a)";
                    var ps = new[] { P("@s", s), P("@like", like), new SqlParameter("@a", active) };

                    var total = Convert.ToInt32(await Scalar(c, null, "SELECT COUNT(*) FROM Sys_Users u " + where,
                        P("@s", s), P("@like", like), new SqlParameter("@a", active)));

                    var rows = await Rows(c, null, $@"
SELECT u.UserID, u.USER_CODE, u.USER_NAME, u.USER_Email, ISNULL(u.USER_ACTIVE,0) AS USER_ACTIVE, u.EmpID, u.LastLogin, u.CreatedAt,
  (SELECT COUNT(DISTINCT ru.CompCode)  FROM Sys_RoleUsers ru WHERE ru.UserID=u.UserID AND ru.ISActive=1 AND ru.RoleId<>0) AS Companies,
  (SELECT COUNT(*) FROM (SELECT DISTINCT ru.CompCode, ru.BranchCode FROM Sys_RoleUsers ru WHERE ru.UserID=u.UserID AND ru.ISActive=1 AND ru.RoleId<>0) b) AS Branches,
  (SELECT STRING_AGG(x.DescA, N', ') FROM (SELECT DISTINCT r.DescA FROM Sys_RoleUsers ru JOIN Sys_Role r ON r.RoleId=ru.RoleId WHERE ru.UserID=u.UserID AND ru.ISActive=1 AND ru.RoleId<>0) x) AS RolesA,
  (SELECT STRING_AGG(x.DescE, N', ') FROM (SELECT DISTINCT r.DescE FROM Sys_RoleUsers ru JOIN Sys_Role r ON r.RoleId=ru.RoleId WHERE ru.UserID=u.UserID AND ru.ISActive=1 AND ru.RoleId<>0) x) AS RolesE
FROM Sys_Users u {where}
ORDER BY u.UserID
OFFSET {(page - 1) * size} ROWS FETCH NEXT {size} ROWS ONLY",
                        P("@s", s), P("@like", like), new SqlParameter("@a", active));

                    var counts = (await Rows(c, null, @"SELECT COUNT(*) AS Total,
                        SUM(CASE WHEN ISNULL(USER_ACTIVE,0)=1 THEN 1 ELSE 0 END) AS Active,
                        SUM(CASE WHEN ISNULL(USER_ACTIVE,0)=0 THEN 1 ELSE 0 END) AS Inactive FROM Sys_Users")).First();

                    return Good(new { rows, total, counts });
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        [HttpPost("GetUser")]
        public async Task<IActionResult> GetUser([FromBody] UserIdRequest req)
        {
            var (c, denied) = await Begin(new[] { ModUsers, ModUserPerms }, false);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    var user = (await Rows(c, null,
                        "SELECT UserID, USER_CODE, USER_NAME, USER_Email, ISNULL(USER_ACTIVE,0) AS USER_ACTIVE, EmpID FROM Sys_Users WHERE UserID=@u", P("@u", req.UserId))).FirstOrDefault();
                    if (user == null) return Fail("User not found / المستخدم غير موجود");
                    var assignments = await Rows(c, null,
                        "SELECT RoleId, CompCode, BranchCode FROM Sys_RoleUsers WHERE UserID=@u AND ISActive=1 AND RoleId<>0 ORDER BY CompCode, BranchCode, RoleId", P("@u", req.UserId));
                    return Good(new { user, assignments });
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        [HttpPost("SaveUser")]
        public async Task<IActionResult> SaveUser([FromBody] SaveUserRequest req)
        {
            var (c, denied) = await Begin(new[] { ModUsers }, true);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    int me = CurrentUserId();
                    string code = (req.UserCode ?? "").Trim();
                    string name = (req.UserName ?? "").Trim();
                    string email = (req.Email ?? "").Trim();
                    bool isNew = req.UserId <= 0;

                    if (code.Length == 0) return Fail("User code is required / كود المستخدم مطلوب");
                    if (code.Length > 50) return Fail("User code max 50 chars / كود المستخدم 50 حرف بالكتير");
                    if (name.Length == 0) return Fail("User name is required / اسم المستخدم مطلوب");
                    if (email.Length > 30) return Fail("Email max 30 chars (database column limit) / الإيميل 30 حرف بالكتير");
                    if (isNew)
                    {
                        if (string.IsNullOrEmpty(req.Password) || req.Password.Length < 4) return Fail("Password min 4 chars / كلمة السر 4 حروف على الأقل");
                    }
                    if (!string.IsNullOrEmpty(req.Password) && req.Password.Length > 20) return Fail("Password max 20 chars (database column limit) / كلمة السر 20 حرف بالكتير");
                    if (!isNew && !req.Active && req.UserId == me) return Fail("You cannot deactivate your own account / مينفعش تعطّل حسابك");

                    var assignments = (req.Assignments ?? new List<AssignmentDto>())
                        .GroupBy(a => (a.RoleId, a.CompCode, a.BranchCode)).Select(g => g.First()).ToList();
                    if (assignments.Any(a => a.RoleId == 0)) return Fail("RoleId 0 is managed automatically / الدور 0 بيتضاف تلقائي");

                    using var t = (SqlTransaction)await c.BeginTransactionAsync(IsolationLevel.Serializable);
                    try
                    {
                        // كود فريد (بدون حساسية لحالة الحروف)
                        var dup = Convert.ToInt32(await Scalar(c, t, "SELECT COUNT(*) FROM Sys_Users WITH (UPDLOCK, HOLDLOCK) WHERE UPPER(USER_CODE)=UPPER(@c) AND UserID<>@id",
                            P("@c", code), P("@id", isNew ? 0 : req.UserId)));
                        if (dup > 0) { t.Rollback(); return Fail("User code already exists / كود المستخدم موجود قبل كده"); }

                        // تحقق من الأدوار والفروع
                        foreach (var a in assignments)
                        {
                            var roleOk = await Scalar(c, t, "SELECT 1 FROM Sys_Role WHERE RoleId=@r AND ISNULL(IsAvailable,0)=1", P("@r", a.RoleId));
                            if (roleOk == null) { t.Rollback(); return Fail("Role " + a.RoleId + " is not available / الدور غير متاح"); }
                            var brOk = await Scalar(c, t, "SELECT 1 FROM Sys_Branch WHERE CompCode=@c AND BranchCode=@b", P("@c", a.CompCode), P("@b", a.BranchCode));
                            if (brOk == null) { t.Rollback(); return Fail("Branch " + a.CompCode + "/" + a.BranchCode + " not found / الفرع غير موجود"); }
                        }

                        string meCode = Convert.ToString(await Scalar(c, t, "SELECT USER_CODE FROM Sys_Users WHERE UserID=@u", P("@u", me))) ?? "";
                        if (meCode.Length > 50) meCode = meCode.Substring(0, 50);
                        int userId = req.UserId;
                        if (isNew)
                        {
                            userId = Convert.ToInt32(await Scalar(c, t, @"
INSERT INTO Sys_Users (USER_CODE, USER_NAME, USER_Email, USER_Password, USER_ACTIVE, USER_Status, EmpID, ChangePasswordDate, CreatedAt, CreatedBy)
VALUES (@c, @n, @e, @p, @a, 1, @emp, GETDATE(), GETDATE(), @by);
SELECT CAST(SCOPE_IDENTITY() AS INT);",
                                P("@c", code), P("@n", name), P("@e", email), P("@p", req.Password), P("@a", req.Active), P("@emp", req.EmpId.HasValue ? (object)req.EmpId.Value : null), P("@by", meCode)));
                        }
                        else
                        {
                            var n = await Exec(c, t, @"
UPDATE Sys_Users SET USER_CODE=@c, USER_NAME=@n, USER_Email=@e, USER_ACTIVE=@a, EmpID=@emp, UpdatedAt=GETDATE(), UpdatedBy=@by,
  USER_Password = CASE WHEN @p IS NULL OR @p = N'' THEN USER_Password ELSE @p END,
  ChangePasswordDate = CASE WHEN @p IS NULL OR @p = N'' THEN ChangePasswordDate ELSE GETDATE() END
WHERE UserID=@id",
                                P("@c", code), P("@n", name), P("@e", email), P("@a", req.Active), P("@emp", req.EmpId.HasValue ? (object)req.EmpId.Value : null),
                                P("@by", meCode), P("@p", req.Password), P("@id", userId));
                            if (n == 0) { t.Rollback(); return Fail("User not found / المستخدم غير موجود"); }
                        }

                        await SyncAssignments(c, t, userId, assignments);
                        t.Commit();
                        return Good(new { userId });
                    }
                    catch { try { t.Rollback(); } catch { } throw; }
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        /// الأدوار المطلوبة + صف الدور 0 (الإعدادات العامة/الاستثناءات) لكل شركة/فرع — الباقي بيتعطّل (مش بيتمسح).
        private static async Task SyncAssignments(SqlConnection c, SqlTransaction t, int userId, List<AssignmentDto> assignments)
        {
            var desired = new HashSet<(int, int, int)>(assignments.Select(a => (a.RoleId, a.CompCode, a.BranchCode)));
            foreach (var cb in assignments.Select(a => (a.CompCode, a.BranchCode)).Distinct()) desired.Add((0, cb.CompCode, cb.BranchCode));

            var existing = await Rows(c, t, "SELECT RoleId, CompCode, BranchCode, ISActive FROM Sys_RoleUsers WITH (UPDLOCK) WHERE UserID=@u", P("@u", userId));
            var existingKeys = new Dictionary<(int, int, int), bool>();
            foreach (var r in existing) existingKeys[(Convert.ToInt32(r["RoleId"]), Convert.ToInt32(r["CompCode"]), Convert.ToInt32(r["BranchCode"]))] = B(r["ISActive"]);

            foreach (var k in desired)
            {
                if (existingKeys.TryGetValue(k, out var act))
                {
                    if (!act) await Exec(c, t, "UPDATE Sys_RoleUsers SET ISActive=1 WHERE UserID=@u AND RoleId=@r AND CompCode=@c AND BranchCode=@b", P("@u", userId), P("@r", k.Item1), P("@c", k.Item2), P("@b", k.Item3));
                }
                else
                    await Exec(c, t, "INSERT INTO Sys_RoleUsers (UserID, RoleId, CompCode, BranchCode, ISActive) VALUES (@u,@r,@c,@b,1)", P("@u", userId), P("@r", k.Item1), P("@c", k.Item2), P("@b", k.Item3));
            }
            foreach (var kv in existingKeys.Where(x => x.Value && !desired.Contains(x.Key)))
                await Exec(c, t, "UPDATE Sys_RoleUsers SET ISActive=0 WHERE UserID=@u AND RoleId=@r AND CompCode=@c AND BranchCode=@b", P("@u", userId), P("@r", kv.Key.Item1), P("@c", kv.Key.Item2), P("@b", kv.Key.Item3));
        }

        [HttpPost("SetPassword")]
        public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest req)
        {
            var (c, denied) = await Begin(new[] { ModUsers }, true);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    if (string.IsNullOrEmpty(req.NewPassword) || req.NewPassword.Length < 4) return Fail("Password min 4 chars / كلمة السر 4 حروف على الأقل");
                    if (req.NewPassword.Length > 20) return Fail("Password max 20 chars (database column limit) / كلمة السر 20 حرف بالكتير");
                    var n = await Exec(c, null, "UPDATE Sys_Users SET USER_Password=@p, ChangePasswordDate=GETDATE(), UpdatedAt=GETDATE() WHERE UserID=@u", P("@p", req.NewPassword), P("@u", req.UserId));
                    if (n == 0) return Fail("User not found / المستخدم غير موجود");
                    return Good(new { updated = n });
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        [HttpPost("SetUserActive")]
        public async Task<IActionResult> SetUserActive([FromBody] SetActiveRequest req)
        {
            var (c, denied) = await Begin(new[] { ModUsers }, true);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    if (!req.Active && req.UserId == CurrentUserId()) return Fail("You cannot deactivate your own account / مينفعش تعطّل حسابك");
                    var n = await Exec(c, null, "UPDATE Sys_Users SET USER_ACTIVE=@a, UpdatedAt=GETDATE() WHERE UserID=@u", P("@a", req.Active), P("@u", req.UserId));
                    if (n == 0) return Fail("User not found / المستخدم غير موجود");
                    return Good(new { updated = n });
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        // ------------------------------------------------------------------ roles
        [HttpPost("ListRoles")]
        public async Task<IActionResult> ListRoles()
        {
            var (c, denied) = await Begin(new[] { ModRoles }, false);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    bool hasAdmin = await ColumnExists(c, null, "Sys_Role", "IsAdmin");
                    var rows = await Rows(c, null, $@"
SELECT r.RoleId, r.DescA, r.DescE, r.Remarks, ISNULL(r.IsAvailable,0) AS IsAvailable, r.CompCode,
  {(hasAdmin ? "ISNULL(r.IsAdmin,0)" : "CAST(0 AS BIT)")} AS IsAdmin,
  (SELECT COUNT(DISTINCT ru.UserID) FROM Sys_RoleUsers ru WHERE ru.RoleId=r.RoleId AND ru.ISActive=1) AS Users,
  (SELECT COUNT(*) FROM Sys_RoleModule rm WHERE rm.RoleId=r.RoleId AND rm.[EXECUTE]=1) AS Modules
FROM Sys_Role r ORDER BY r.RoleId");
                    return Good(new { rows, hasIsAdmin = hasAdmin });
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        [HttpPost("SaveRole")]
        public async Task<IActionResult> SaveRole([FromBody] SaveRoleRequest req)
        {
            var (c, denied) = await Begin(new[] { ModRoles }, true);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    string da = (req.DescA ?? "").Trim(), de = (req.DescE ?? "").Trim(), rem = (req.Remarks ?? "").Trim();
                    if (da.Length == 0 || de.Length == 0) return Fail("Arabic and English names are required / الاسم العربي والإنجليزي مطلوبين");
                    if (da.Length > 100 || de.Length > 100 || rem.Length > 100) return Fail("Max 100 chars / 100 حرف بالكتير");
                    if (req.RoleId == 0) return Fail("Role 0 (general settings) cannot be edited / الدور 0 (إعدادات عامة) مينفعش يتعدّل");

                    bool hasAdmin = await ColumnExists(c, null, "Sys_Role", "IsAdmin");
                    using var t = (SqlTransaction)await c.BeginTransactionAsync(IsolationLevel.Serializable);
                    try
                    {
                        int roleId = req.RoleId;
                        if (roleId < 0)
                        {
                            roleId = Convert.ToInt32(await Scalar(c, t, "SELECT ISNULL(MAX(RoleId),0)+1 FROM Sys_Role WITH (UPDLOCK, HOLDLOCK)"));
                            await Exec(c, t, "INSERT INTO Sys_Role (RoleId, DescA, DescE, Remarks, IsAvailable, CompCode, IsShowable, RoleType) VALUES (@id,@a,@e,@r,@av,@cc,1,1)",
                                P("@id", roleId), P("@a", da), P("@e", de), P("@r", rem), P("@av", req.IsAvailable), P("@cc", req.CompCode ?? 1));
                        }
                        else
                        {
                            var n = await Exec(c, t, "UPDATE Sys_Role SET DescA=@a, DescE=@e, Remarks=@r, IsAvailable=@av WHERE RoleId=@id",
                                P("@a", da), P("@e", de), P("@r", rem), P("@av", req.IsAvailable), P("@id", roleId));
                            if (n == 0) { t.Rollback(); return Fail("Role not found / الدور غير موجود"); }
                        }
                        if (hasAdmin && req.IsAdmin.HasValue)
                            await Exec(c, t, "UPDATE Sys_Role SET IsAdmin=@x WHERE RoleId=@id", P("@x", req.IsAdmin.Value), P("@id", roleId));
                        t.Commit();
                        return Good(new { roleId });
                    }
                    catch { try { t.Rollback(); } catch { } throw; }
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        // ------------------------------------------------------------------ matrices
        private const string ModuleSelect = @"
m.MODULE_CODE, m.MODULE_MENU, m.MODULE_DESCA, m.MODULE_DESCE, m.MODULE_TYPE, m.MODULE_SORT, m.IS_Show, ISNULL(m.AVAILABLE,0) AS AVAILABLE,
m.[CREATE] AS A_CREATE, m.EDIT AS A_EDIT, m.[DELETE] AS A_DELETE, m.[PRINT] AS A_PRINT, m.[VIEW] AS A_VIEW,
ISNULL(m.CUSTOM1,0) AS A_CUSTOM1, ISNULL(m.CUSTOM2,0) AS A_CUSTOM2, ISNULL(m.CUSTOM3,0) AS A_CUSTOM3, ISNULL(m.CUSTOM4,0) AS A_CUSTOM4, ISNULL(m.CUSTOM5,0) AS A_CUSTOM5,
ISNULL(m.CUSTOM6,0) AS A_CUSTOM6, ISNULL(m.CUSTOM7,0) AS A_CUSTOM7, ISNULL(m.CUSTOM8,0) AS A_CUSTOM8, ISNULL(m.CUSTOM9,0) AS A_CUSTOM9,
m.CUSTOM1_DESC, m.CUSTOM2_DESC, m.CUSTOM3_DESC, m.CUSTOM4_DESC, m.CUSTOM5_DESC, m.CUSTOM6_DESC, m.CUSTOM7_DESC, m.CUSTOM8_DESC, m.CUSTOM9_DESC";

        private static object ModuleDto(Row m, Row val, bool hasRow, Row inherited = null)
        {
            var allow = new Dictionary<string, bool> { ["EXECUTE"] = B(m["AVAILABLE"]) };
            foreach (var k in PermKeys.Skip(1)) allow[k] = B(m["A_" + k]);
            var desc = new Dictionary<string, string>();
            for (int i = 1; i <= 9; i++) desc["CUSTOM" + i] = Convert.ToString(m["CUSTOM" + i + "_DESC"] ?? "");
            Dictionary<string, bool> Vals(Row r) { if (r == null) return null; var d = new Dictionary<string, bool>(); foreach (var k in PermKeys) d[k] = B(r[k]); return d; }
            return new
            {
                code = m["MODULE_CODE"],
                menu = Convert.ToString(m["MODULE_MENU"] ?? ""),
                descA = Convert.ToString(m["MODULE_DESCA"] ?? ""),
                descE = Convert.ToString(m["MODULE_DESCE"] ?? ""),
                type = Convert.ToString(m["MODULE_TYPE"] ?? "").Trim(),
                sort = m["MODULE_SORT"],
                allow,
                desc,
                value = Vals(val),
                hasRow,
                inherited = Vals(inherited)
            };
        }

        [HttpPost("GetRoleMatrix")]
        public async Task<IActionResult> GetRoleMatrix([FromBody] RoleIdRequest req)
        {
            var (c, denied) = await Begin(new[] { ModRoles }, false);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    var mods = await Rows(c, null, "SELECT " + ModuleSelect + " FROM Sys_Modules m ORDER BY ISNULL(m.MODULE_MENU,N''), m.MODULE_SORT, m.MODULE_CODE");
                    var vals = (await Rows(c, null, "SELECT * FROM Sys_RoleModule WHERE RoleId=@r", P("@r", req.RoleId)))
                        .ToDictionary(r => Convert.ToString(r["MODULE_CODE"]), r => r, StringComparer.OrdinalIgnoreCase);
                    var list = mods.Select(m => { vals.TryGetValue(Convert.ToString(m["MODULE_CODE"]), out var v); return ModuleDto(m, v, v != null); }).ToList();
                    return Good(new { modules = list });
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        private static string PermUpdateSql(string table, string where) =>
            "UPDATE " + table + " SET " + string.Join(", ", PermKeys.Select(k => "[" + k + "]=@" + k)) + " WHERE " + where;

        private static List<SqlParameter> PermParams(Dictionary<string, bool> perms)
        {
            var ps = new List<SqlParameter>();
            foreach (var k in PermKeys) ps.Add(P("@" + k, perms != null && perms.TryGetValue(k, out var v) && v));
            return ps;
        }

        [HttpPost("SaveRoleMatrix")]
        public async Task<IActionResult> SaveRoleMatrix([FromBody] SaveRoleMatrixRequest req)
        {
            var (c, denied) = await Begin(new[] { ModRoles }, true);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    if (await Scalar(c, null, "SELECT 1 FROM Sys_Role WHERE RoleId=@r", P("@r", req.RoleId)) == null) return Fail("Role not found / الدور غير موجود");
                    using var t = (SqlTransaction)await c.BeginTransactionAsync();
                    try
                    {
                        int saved = 0;
                        foreach (var row in req.Rows ?? new List<PermRow>())
                        {
                            if (await Scalar(c, t, "SELECT 1 FROM Sys_Modules WHERE MODULE_CODE=@m", P("@m", row.ModuleCode)) == null) { t.Rollback(); return Fail("Unknown module " + row.ModuleCode); }
                            var ps = PermParams(row.Perms); ps.Add(P("@r", req.RoleId)); ps.Add(P("@m", row.ModuleCode));
                            var n = await Exec(c, t, PermUpdateSql("Sys_RoleModule", "RoleId=@r AND MODULE_CODE=@m"), ps.ToArray());
                            if (n == 0)
                            {
                                ps = PermParams(row.Perms); ps.Add(P("@r", req.RoleId)); ps.Add(P("@m", row.ModuleCode));
                                await Exec(c, t, @"INSERT INTO Sys_RoleModule (RoleId, MODULE_CODE, [EXECUTE],[CREATE],EDIT,[DELETE],[PRINT],[VIEW],CUSTOM1,CUSTOM2,CUSTOM3,CUSTOM4,CUSTOM5,CUSTOM6,CUSTOM7,CUSTOM8,CUSTOM9, ViewImages, EditImages, Prc_Preference)
VALUES (@r, @m, @EXECUTE,@CREATE,@EDIT,@DELETE,@PRINT,@VIEW,@CUSTOM1,@CUSTOM2,@CUSTOM3,@CUSTOM4,@CUSTOM5,@CUSTOM6,@CUSTOM7,@CUSTOM8,@CUSTOM9, 0, 0, 1)", ps.ToArray());
                            }
                            saved++;
                        }
                        t.Commit();
                        return Good(new { saved });
                    }
                    catch { try { t.Rollback(); } catch { } throw; }
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        [HttpPost("GetUserMatrix")]
        public async Task<IActionResult> GetUserMatrix([FromBody] UserMatrixRequest req)
        {
            var (c, denied) = await Begin(new[] { ModUserPerms }, false);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    var mods = await Rows(c, null, "SELECT " + ModuleSelect + " FROM Sys_Modules m ORDER BY ISNULL(m.MODULE_MENU,N''), m.MODULE_SORT, m.MODULE_CODE");
                    var ov = (await Rows(c, null, "SELECT * FROM Sys_UserModule WHERE UserID=@u AND ISNULL(CompCode,0)=@c AND ISNULL(BranchCode,0)=@b",
                        P("@u", req.UserId), P("@c", req.CompCode), P("@b", req.BranchCode)))
                        .ToDictionary(r => Convert.ToString(r["MODULE_CODE"]), r => r, StringComparer.OrdinalIgnoreCase);

                    // الأدوار الفعالة لليوزر في الشركة (الفرونت بيقرا صفوف الدور لأي فرع في الشركة)
                    var roleIds = (await Rows(c, null, "SELECT DISTINCT RoleId FROM Sys_RoleUsers WHERE UserID=@u AND ISActive=1 AND (@c=0 OR CompCode=@c)",
                        P("@u", req.UserId), P("@c", req.CompCode))).Select(r => Convert.ToInt32(r["RoleId"])).ToList();
                    var roleRows = roleIds.Count == 0 ? new List<Row>() :
                        await Rows(c, null, "SELECT * FROM Sys_RoleModule WHERE RoleId IN (" + string.Join(",", roleIds) + ")");
                    var inh = roleRows.GroupBy(r => Convert.ToString(r["MODULE_CODE"]), StringComparer.OrdinalIgnoreCase)
                        .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r["Prc_Preference"] == null ? 0 : Convert.ToInt32(r["Prc_Preference"])).ThenBy(r => Convert.ToInt32(r["RoleId"])).First(), StringComparer.OrdinalIgnoreCase);

                    var roles = await Rows(c, null, @"SELECT DISTINCT r.RoleId, r.DescA, r.DescE FROM Sys_RoleUsers ru JOIN Sys_Role r ON r.RoleId=ru.RoleId
                        WHERE ru.UserID=@u AND ru.ISActive=1 AND (@c=0 OR ru.CompCode=@c) AND ru.RoleId<>0", P("@u", req.UserId), P("@c", req.CompCode));

                    var list = mods.Select(m =>
                    {
                        var code = Convert.ToString(m["MODULE_CODE"]);
                        ov.TryGetValue(code, out var o); inh.TryGetValue(code, out var i);
                        return ModuleDto(m, o, o != null, i);
                    }).ToList();
                    return Good(new { modules = list, roles });
                }
                catch (Exception ex) { return Err(ex); }
            }
        }

        [HttpPost("SaveUserMatrix")]
        public async Task<IActionResult> SaveUserMatrix([FromBody] SaveUserMatrixRequest req)
        {
            var (c, denied) = await Begin(new[] { ModUserPerms }, true);
            if (denied != null) return denied;
            using (c)
            {
                try
                {
                    if (await Scalar(c, null, "SELECT 1 FROM Sys_Users WHERE UserID=@u", P("@u", req.UserId)) == null) return Fail("User not found / المستخدم غير موجود");
                    if (req.CompCode != 0 || req.BranchCode != 0)
                        if (await Scalar(c, null, "SELECT 1 FROM Sys_Branch WHERE CompCode=@c AND BranchCode=@b", P("@c", req.CompCode), P("@b", req.BranchCode)) == null)
                            return Fail("Branch not found / الفرع غير موجود");

                    using var t = (SqlTransaction)await c.BeginTransactionAsync();
                    try
                    {
                        // صفوف الاستثناء بتظهر في IQ_Sys_RoleModule وفي استعلام الدخول بس لو لليوزر صف Sys_RoleUsers بـ RoleId = 0 في الشركة/الفرع
                        if (req.CompCode != 0 && req.BranchCode != 0 &&
                            await Scalar(c, t, "SELECT 1 FROM Sys_RoleUsers WHERE UserID=@u AND RoleId=0 AND CompCode=@c AND BranchCode=@b", P("@u", req.UserId), P("@c", req.CompCode), P("@b", req.BranchCode)) == null)
                            await Exec(c, t, "INSERT INTO Sys_RoleUsers (UserID, RoleId, CompCode, BranchCode, ISActive) VALUES (@u,0,@c,@b,1)", P("@u", req.UserId), P("@c", req.CompCode), P("@b", req.BranchCode));
                        else if (req.CompCode != 0 && req.BranchCode != 0)
                            await Exec(c, t, "UPDATE Sys_RoleUsers SET ISActive=1 WHERE UserID=@u AND RoleId=0 AND CompCode=@c AND BranchCode=@b AND ISNULL(ISActive,0)=0", P("@u", req.UserId), P("@c", req.CompCode), P("@b", req.BranchCode));

                        int saved = 0, removed = 0;
                        foreach (var row in req.Rows ?? new List<PermRow>())
                        {
                            if (await Scalar(c, t, "SELECT 1 FROM Sys_Modules WHERE MODULE_CODE=@m", P("@m", row.ModuleCode)) == null) { t.Rollback(); return Fail("Unknown module " + row.ModuleCode); }
                            string key = "UserID=@u AND ISNULL(CompCode,0)=@cc AND ISNULL(BranchCode,0)=@bb AND MODULE_CODE=@m";
                            List<SqlParameter> Full() { var p = PermParams(row.Perms); p.Add(P("@u", req.UserId)); p.Add(P("@cc", req.CompCode)); p.Add(P("@bb", req.BranchCode)); p.Add(P("@m", row.ModuleCode)); return p; }
                            var n = await Exec(c, t, PermUpdateSql("Sys_UserModule", key), Full().ToArray());
                            if (n == 0)
                                await Exec(c, t, @"INSERT INTO Sys_UserModule (UserID, CompCode, BranchCode, MODULE_CODE, [EXECUTE],[CREATE],EDIT,[DELETE],[PRINT],[VIEW],CUSTOM1,CUSTOM2,CUSTOM3,CUSTOM4,CUSTOM5,CUSTOM6,CUSTOM7,CUSTOM8,CUSTOM9, ViewImages, EditImages, Prc_Preference)
VALUES (@u, @cc, @bb, @m, @EXECUTE,@CREATE,@EDIT,@DELETE,@PRINT,@VIEW,@CUSTOM1,@CUSTOM2,@CUSTOM3,@CUSTOM4,@CUSTOM5,@CUSTOM6,@CUSTOM7,@CUSTOM8,@CUSTOM9, 0, 0, 1)", Full().ToArray());
                            saved++;
                        }
                        foreach (var code in req.RemoveModules ?? new List<string>())
                            removed += await Exec(c, t, "DELETE FROM Sys_UserModule WHERE UserID=@u AND ISNULL(CompCode,0)=@cc AND ISNULL(BranchCode,0)=@bb AND MODULE_CODE=@m",
                                P("@u", req.UserId), P("@cc", req.CompCode), P("@bb", req.BranchCode), P("@m", code));
                        t.Commit();
                        return Good(new { saved, removed });
                    }
                    catch { try { t.Rollback(); } catch { } throw; }
                }
                catch (Exception ex) { return Err(ex); }
            }
        }
    }
}
