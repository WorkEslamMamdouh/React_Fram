-- =====================================================================================
--  Phase10_Reports_Json.sql  -  JSON report layouts (rf-report/1) beside the old Stimulsoft ones
--  Adds to Sys_ReportLayouts:
--    LayoutFormat VARCHAR(10) NOT NULL DEFAULT 'mrt'   -- json | mrt
--    LayoutJson   NVARCHAR(MAX) NULL                   -- the rf-report/1 layout (Docs/Studio/05_Report_Layout_Format.md)
--  Additive and idempotent (safe to run many times). Old rows stay 'mrt' and the runtime
--  shows them with the automatic layout until ERP Studio saves a JSON layout.
--  Nothing is dropped: LayoutMrt stays for history.
-- =====================================================================================
SET NOCOUNT ON;

IF OBJECT_ID('dbo.Sys_ReportLayouts', 'U') IS NULL
BEGIN
    PRINT 'Sys_ReportLayouts not found - run Database/Phase7_Reports.sql first. Nothing changed.';
    RETURN;
END

IF COL_LENGTH('dbo.Sys_ReportLayouts', 'LayoutFormat') IS NULL
BEGIN
    ALTER TABLE dbo.Sys_ReportLayouts ADD LayoutFormat VARCHAR(10) NOT NULL
        CONSTRAINT DF_Sys_ReportLayouts_LayoutFormat DEFAULT ('mrt') WITH VALUES;
    PRINT 'Added Sys_ReportLayouts.LayoutFormat';
END
ELSE PRINT 'Sys_ReportLayouts.LayoutFormat already exists';

IF COL_LENGTH('dbo.Sys_ReportLayouts', 'LayoutJson') IS NULL
BEGIN
    ALTER TABLE dbo.Sys_ReportLayouts ADD LayoutJson NVARCHAR(MAX) NULL;
    PRINT 'Added Sys_ReportLayouts.LayoutJson';
END
ELSE PRINT 'Sys_ReportLayouts.LayoutJson already exists';
GO

-- only json | mrt allowed
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Sys_ReportLayouts_LayoutFormat')
   AND COL_LENGTH('dbo.Sys_ReportLayouts', 'LayoutFormat') IS NOT NULL
    ALTER TABLE dbo.Sys_ReportLayouts WITH CHECK ADD CONSTRAINT CK_Sys_ReportLayouts_LayoutFormat CHECK (LayoutFormat IN ('json', 'mrt'));
GO

-- LayoutMrt was NOT NULL in some installs: a JSON layout has no MRT text
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Sys_ReportLayouts') AND name = 'LayoutMrt' AND is_nullable = 0)
    ALTER TABLE dbo.Sys_ReportLayouts ALTER COLUMN LayoutMrt NVARCHAR(MAX) NULL;
GO

SELECT LayoutFormat, COUNT(*) AS Layouts FROM dbo.Sys_ReportLayouts GROUP BY LayoutFormat;
