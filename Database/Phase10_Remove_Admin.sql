-- =====================================================================================
--  Phase10_Remove_Admin.sql  -  remove the old in-framework admin screens from the menu/permissions
--  (the admin UI moved to ERP Studio). Idempotent. REVIEW BEFORE RUNNING - not run automatically.
--
--  Deletes rows only (no tables are dropped):
--    Sys_UserMenu   favorites/menu entries pointing to the admin modules (and to Menu_Admin if it is removed)
--    Sys_UserModule / Sys_RoleModule permission rows of the admin modules
--    Sys_Modules    the admin modules, and the Menu_Admin group if nothing else is left under it
--
--  NOT touched (the runtime still needs them): Sys_RegisterModule, Sys_Role.IsAdmin, Sys_Reports*,
--  Sys_ExternalApis, IQ_Sys_RoleModule.  Sys_ScreenConfig is NOT dropped here (separate, approved step).
--  Wrapped in one transaction: any error rolls everything back.
-- =====================================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Mods TABLE (MODULE_CODE NVARCHAR(100) PRIMARY KEY);
INSERT @Mods VALUES (N'Sys_UsersAdmin'), (N'Sys_RolesAdmin'), (N'Sys_UserPermsAdmin'), (N'Sys_ReportsAdmin'), (N'Sys_ExternalApisAdmin');

-- what will be removed (preview)
SELECT m.MODULE_CODE, m.MODULE_MENU, m.MODULE_DESCE FROM dbo.Sys_Modules m WHERE m.MODULE_CODE IN (SELECT MODULE_CODE FROM @Mods) OR m.MODULE_CODE = N'Menu_Admin';

BEGIN TRAN;

IF OBJECT_ID('dbo.Sys_UserMenu', 'U') IS NOT NULL
BEGIN
    DELETE FROM dbo.Sys_UserMenu WHERE MODULE_CODE IN (SELECT MODULE_CODE FROM @Mods);
    PRINT CONCAT('Sys_UserMenu rows deleted: ', @@ROWCOUNT);
END

IF OBJECT_ID('dbo.Sys_UserModule', 'U') IS NOT NULL
BEGIN
    DELETE FROM dbo.Sys_UserModule WHERE MODULE_CODE IN (SELECT MODULE_CODE FROM @Mods);
    PRINT CONCAT('Sys_UserModule rows deleted: ', @@ROWCOUNT);
END

IF OBJECT_ID('dbo.Sys_RoleModule', 'U') IS NOT NULL
BEGIN
    DELETE FROM dbo.Sys_RoleModule WHERE MODULE_CODE IN (SELECT MODULE_CODE FROM @Mods);
    PRINT CONCAT('Sys_RoleModule rows deleted: ', @@ROWCOUNT);
END

DELETE FROM dbo.Sys_Modules WHERE MODULE_CODE IN (SELECT MODULE_CODE FROM @Mods);
PRINT CONCAT('Sys_Modules rows deleted: ', @@ROWCOUNT);

-- the Menu_Admin group only if it is now empty
IF NOT EXISTS (SELECT 1 FROM dbo.Sys_Modules WHERE MODULE_MENU = N'Menu_Admin')
   AND (OBJECT_ID('dbo.Sys_UserMenu', 'U') IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.Sys_UserMenu WHERE ParentCode = N'Menu_Admin'))
BEGIN
    IF OBJECT_ID('dbo.Sys_UserMenu', 'U') IS NOT NULL DELETE FROM dbo.Sys_UserMenu WHERE MODULE_CODE = N'Menu_Admin';
    IF OBJECT_ID('dbo.Sys_UserModule', 'U') IS NOT NULL DELETE FROM dbo.Sys_UserModule WHERE MODULE_CODE = N'Menu_Admin';
    IF OBJECT_ID('dbo.Sys_RoleModule', 'U') IS NOT NULL DELETE FROM dbo.Sys_RoleModule WHERE MODULE_CODE = N'Menu_Admin';
    DELETE FROM dbo.Sys_Modules WHERE MODULE_CODE = N'Menu_Admin';
    PRINT 'Menu_Admin group removed (it was empty).';
END
ELSE PRINT 'Menu_Admin kept: other modules or user menu entries still use it.';

COMMIT;

-- optional, separate decision (do NOT run without the owner's approval):
-- DROP TABLE dbo.Sys_ScreenConfig;
