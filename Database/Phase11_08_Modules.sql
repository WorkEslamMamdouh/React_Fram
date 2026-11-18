-- Phase11_08_Modules.sql  (Wave 1 - register attendance + print-log runtime screens)  Idempotent.
-- Depends on dbo.Sys_RegisterModule (Phase4_Permissions.sql). Run against the project DB (ESSA_React).
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_RegisterModule', N'P') IS NULL
BEGIN RAISERROR(N'Run Phase4_Permissions.sql first (dbo.Sys_RegisterModule missing).', 16, 1); SET NOEXEC ON; END
GO
-- 1) Menu group for attendance (MODULE_TYPE = 'M' = menu)
EXEC dbo.Sys_RegisterModule
     @MODULE_CODE  = N'Menu_Attendance',
     @MODULE_DESCA = N'الحضور والانصراف',
     @MODULE_DESCE = N'Attendance',
     @MODULE_MENU  = N'',
     @MODULE_TYPE  = N'M',
     @Icon_Color   = N'teal',
     @AllowCustom  = 0;
GO
-- 2) Attendance screens (under the Menu_Attendance group), with CUSTOM permissions enabled
EXEC dbo.Sys_RegisterModule @MODULE_CODE=N'Att_Daily',       @MODULE_DESCA=N'الحضور اليومي',       @MODULE_DESCE=N'Daily Attendance',   @MODULE_MENU=N'Menu_Attendance', @MODULE_TYPE=N'S', @Icon_Color=N'teal',   @AllowCustom=1;
EXEC dbo.Sys_RegisterModule @MODULE_CODE=N'Att_Exceptions',  @MODULE_DESCA=N'استثناءات الحضور',     @MODULE_DESCE=N'Attendance Exceptions', @MODULE_MENU=N'Menu_Attendance', @MODULE_TYPE=N'S', @Icon_Color=N'amber', @AllowCustom=1;
EXEC dbo.Sys_RegisterModule @MODULE_CODE=N'Att_ManualPunch', @MODULE_DESCA=N'طلبات البصمة اليدوية', @MODULE_DESCE=N'Manual Punch',        @MODULE_MENU=N'Menu_Attendance', @MODULE_TYPE=N'S', @Icon_Color=N'sky',   @AllowCustom=1;
EXEC dbo.Sys_RegisterModule @MODULE_CODE=N'Att_Import',      @MODULE_DESCA=N'استيراد البصمات (CSV)', @MODULE_DESCE=N'Attendance Import',   @MODULE_MENU=N'Menu_Attendance', @MODULE_TYPE=N'S', @Icon_Color=N'violet',@AllowCustom=1;
GO
-- 3) Print log screen (standalone)
EXEC dbo.Sys_RegisterModule @MODULE_CODE=N'Sys_PrintLog',    @MODULE_DESCA=N'سجل الطباعة',          @MODULE_DESCE=N'Print Log',          @MODULE_MENU=N'', @MODULE_TYPE=N'S', @Icon_Color=N'slate', @AllowCustom=1;
GO
-- 4) Confirmation
SELECT MODULE_CODE, MODULE_DESCA, MODULE_MENU, MODULE_TYPE, IS_Show, [EXECUTE]
FROM dbo.IQ_Sys_RoleModule
WHERE MODULE_CODE IN (N'Att_Daily', N'Att_Exceptions', N'Att_ManualPunch', N'Att_Import', N'Sys_PrintLog')
ORDER BY MODULE_CODE;
GO
SET NOEXEC OFF;
GO
