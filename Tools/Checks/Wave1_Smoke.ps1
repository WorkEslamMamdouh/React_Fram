param(
  [string]$Server = "100.79.55.38,1433",
  [string]$Db = "ESSA_React",
  [string]$SqlUser = "sa",
  [string]$SqlPass = "619619"
)
# Wave 1 DB smoke: Phase11 objects present, contract version, numbering vectors, print-route resolution test vectors (4.11).
$q = @"
SET NOCOUNT ON;
PRINT '-- contract --';
SELECT SettingKey, SettingValue FROM dbo.Sys_RuntimeSettings WHERE SettingKey IN ('Schema.Phase11','Contract.Version','Config.Version');
PRINT '-- route resolution (4.11 vectors) --';
IF OBJECT_ID('tempdb..#p') IS NOT NULL DROP TABLE #p;
-- NOTE: requires printers/routes seeded; this prints the candidate scores for a sample query.
SELECT TOP 5 * FROM dbo.Sys_PrintRouteCandidates(N'POS_Receipt', NULL, 1, 5, 9, NULL) ORDER BY Score DESC, Priority DESC, RouteId DESC;
PRINT '-- numbering vector --';
SELECT dbo.Sys_FormatDocNo(N'INV-{BR}-{YYYY}-{#####}', 42, 1, 3, '2026-11-12', NULL, NULL) AS DocNo_expect_INV_3_2026_00042;
"@
sqlcmd -S $Server -U $SqlUser -P $SqlPass -d $Db -I -f 65001 -Q $q
