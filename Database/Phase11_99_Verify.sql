-- Phase11_99_Verify.sql  (idempotent, read-only) - checks Phase11 objects and runs the numbering vectors (contract wave1-v1 / spec 4.13).
SET NOCOUNT ON;
PRINT N'===== Phase11 object check =====';
DECLARE @objs TABLE (Name SYSNAME, Kind VARCHAR(10));
INSERT INTO @objs VALUES
 ('dbo.Sys_RuntimeSettings','U'),('dbo.Sys_AuditLog','U'),('dbo.Sys_AuditPolicy','U'),
 ('dbo.Sys_BumpConfigVersion','P'),('dbo.Sys_AuditPurge','P'),
 ('dbo.Sys_Jobs','U'),('dbo.Sys_JobRuns','U'),
 ('dbo.Sys_Devices','U'),('dbo.Sys_DevicePairing','U'),('dbo.Sys_DeviceCommands','U'),('dbo.Sys_RuntimeKeys','U'),
 ('dbo.Sys_Printers','U'),('dbo.Sys_PrintStations','U'),('dbo.Sys_ItemStationMap','U'),('dbo.Sys_PrintTemplates','U'),
 ('dbo.Sys_PrintRoutes','U'),('dbo.Sys_PrintJobs','U'),('dbo.Sys_PrintRouteCandidates','IF'),
 ('dbo.Att_Settings','U'),('dbo.Att_RawPunch','U'),('dbo.Att_DeviceUserMap','U'),('dbo.Att_Punch','U'),
 ('dbo.Att_Shift','U'),('dbo.Att_Roster','U'),('dbo.Att_Holiday','U'),('dbo.Att_DailySummary','U'),
 ('dbo.Att_Exception','U'),('dbo.Att_Period','U'),('dbo.Att_CsvProfile','U'),('dbo.Att_RebuildViews','P'),
 ('dbo.IQ_Att_DailySummary','V'),('dbo.IQ_Att_Exception','V'),('dbo.IQ_Att_Punch','V'),
 ('dbo.Sys_DocSeries','U'),('dbo.Sys_DocSeriesCounter','U'),('dbo.Sys_DocSeriesBinding','U'),
 ('dbo.Sys_FormatDocNo','FN'),('dbo.Sys_NextDocNo','P'),
 ('dbo.Sys_CustomFieldEntity','U'),('dbo.Sys_CustomFieldDef','U'),('dbo.Sys_RecordExtra','U');
SELECT Name, Kind, CASE WHEN OBJECT_ID(Name, Kind) IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS Status FROM @objs ORDER BY Kind, Name;
DECLARE @missing INT = (SELECT COUNT(*) FROM @objs WHERE OBJECT_ID(Name, Kind) IS NULL);
PRINT N'Missing objects: ' + CAST(@missing AS NVARCHAR(10));

PRINT N'===== Numbering vectors (4.13) =====';
IF OBJECT_ID(N'dbo.Sys_FormatDocNo', N'FN') IS NOT NULL
BEGIN
    DECLARE @v TABLE (Idx INT, Pattern NVARCHAR(100), SeqNo BIGINT, CO INT, BR INT, TERM INT, D DATE, FY INT, Expected NVARCHAR(200));
    INSERT INTO @v VALUES
     (1, N'INV-{BR}-{YYYY}-{#####}',       42,   1, 3,    NULL, '2026-11-12', NULL, N'INV-3-2026-00042'),
     (2, N'{CO:2}{BR:3}/{YY}{MM}/{####}',   7,   1, 12,   NULL, '2026-01-05', NULL, N'01012/2601/0007'),
     (3, N'POS{TERM:2}-{DD}{MM}-{###}',  1234,   1, 1,    5,    '2026-03-09', NULL, N'POS05-0903-1234'),
     (4, N'R-{FY}-{#}',                     9,   1, 1,    NULL, '2026-02-01', 2025, N'R-2025-9'),
     (5, N'X{BR:3}-{##}',                   3,   1, NULL, NULL, '2026-02-01', NULL, N'X000-03');
    SELECT Idx, Pattern, Expected,
           dbo.Sys_FormatDocNo(Pattern, SeqNo, CO, BR, D, FY, TERM) AS Actual,
           CASE WHEN dbo.Sys_FormatDocNo(Pattern, SeqNo, CO, BR, D, FY, TERM) = Expected THEN 'PASS' ELSE 'FAIL' END AS Result
    FROM @v ORDER BY Idx;
    DECLARE @fail INT = (SELECT COUNT(*) FROM @v WHERE dbo.Sys_FormatDocNo(Pattern, SeqNo, CO, BR, D, FY, TERM) <> Expected);
    PRINT N'Numbering FAIL count: ' + CAST(@fail AS NVARCHAR(10)) + N' (0 = all vectors pass)';
END
ELSE PRINT N'Sys_FormatDocNo missing - run Phase11_05 first.';
GO
