-- =====================================================================================
--  QA_E2E_Drop.sql  -  removes EVERYTHING created for the end-to-end Studio test
--    * menu/permission rows of the QA_E2E_ screens (Sys_Modules, Sys_RoleModule, Sys_UserModule, favorites)
--    * report definitions/layouts with codes QA_E2E_ (Sys_Reports, Sys_ReportParams, Sys_ReportLayouts)
--    * every dbo object whose name starts with QA_E2E_ (views, procedures, function, tables)
--  Nothing else is touched. Safe to run many times.
--  Then delete the folders Frontend/App/app/ClientApp/QA_E2E_* and Database/Add_QA_E2E_*.sql,
--  Database/Report_QA_E2E_*_Layout.sql and Frontend/App/app/ClientApp/Reports/QA_E2E_*.layout.json.
-- =====================================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

-- 1) screen rows
IF OBJECT_ID(N'dbo.Sys_UserMenu', N'U') IS NOT NULL
    EXEC (N'DELETE FROM dbo.Sys_UserMenu WHERE MODULE_CODE LIKE N''QA[_]E2E[_]%''');
IF OBJECT_ID(N'dbo.Sys_UserModule', N'U') IS NOT NULL
    DELETE FROM dbo.Sys_UserModule WHERE MODULE_CODE LIKE N'QA[_]E2E[_]%';
DELETE FROM dbo.Sys_RoleModule WHERE MODULE_CODE LIKE N'QA[_]E2E[_]%';
DELETE FROM dbo.Sys_Modules    WHERE MODULE_CODE LIKE N'QA[_]E2E[_]%';

-- 2) reports
IF OBJECT_ID(N'dbo.Sys_ReportLayouts', N'U') IS NOT NULL
    DELETE FROM dbo.Sys_ReportLayouts WHERE ReportCode LIKE N'QA[_]E2E[_]%';
IF OBJECT_ID(N'dbo.Sys_ReportParams', N'U') IS NOT NULL
    DELETE FROM dbo.Sys_ReportParams WHERE ReportCode LIKE N'QA[_]E2E[_]%';
IF OBJECT_ID(N'dbo.Sys_Reports', N'U') IS NOT NULL
    DELETE FROM dbo.Sys_Reports WHERE ReportCode LIKE N'QA[_]E2E[_]%';

COMMIT;
PRINT N'QA_E2E module and report rows removed';
GO

-- 3) objects: views + procedures + functions first, then tables (children before parents)
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'DROP VIEW dbo.' + QUOTENAME(name) + N';' + CHAR(10)
FROM sys.views WHERE schema_id = SCHEMA_ID('dbo') AND name LIKE N'QA[_]E2E[_]%';
SELECT @sql += N'DROP PROCEDURE dbo.' + QUOTENAME(name) + N';' + CHAR(10)
FROM sys.procedures WHERE schema_id = SCHEMA_ID('dbo') AND name LIKE N'QA[_]E2E[_]%';
SELECT @sql += N'DROP FUNCTION dbo.' + QUOTENAME(name) + N';' + CHAR(10)
FROM sys.objects WHERE schema_id = SCHEMA_ID('dbo') AND type IN ('FN', 'IF', 'TF') AND name LIKE N'QA[_]E2E[_]%';
EXEC sp_executesql @sql;
GO

DECLARE @left INT = 1, @guard INT = 0, @sql NVARCHAR(MAX);
WHILE @left > 0 AND @guard < 20
BEGIN
    SET @sql = N'';
    -- tables that no other remaining QA_E2E_ table references
    SELECT @sql += N'DROP TABLE dbo.' + QUOTENAME(t.name) + N';' + CHAR(10)
    FROM sys.tables t
    WHERE t.schema_id = SCHEMA_ID('dbo') AND t.name LIKE N'QA[_]E2E[_]%'
      AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys fk
                      WHERE fk.referenced_object_id = t.object_id AND fk.parent_object_id <> t.object_id);
    IF @sql <> N'' EXEC sp_executesql @sql;
    SELECT @left = COUNT(*) FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo') AND name LIKE N'QA[_]E2E[_]%';
    SET @guard += 1;
END
DECLARE @remaining INT = (SELECT COUNT(*) FROM sys.objects WHERE name LIKE N'QA[_]E2E[_]%' AND type IN ('U', 'V', 'P', 'FN', 'IF', 'TF'));
PRINT N'QA_E2E objects removed. Remaining QA_E2E_ objects: ' + CAST(@remaining AS NVARCHAR(10));
GO
