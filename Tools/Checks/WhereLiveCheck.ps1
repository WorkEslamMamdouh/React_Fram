# Live check for WhereParameterizer / BuildWhereUltraFast against the real DB.
# Sends each condition through api/ManageDataSQL/Query (XOR-encrypted exactly like Sys.CallApiEncrypted)
# and compares the returned key list with a direct SQL query on the same condition.
# Usage: powershell -File Tools\Checks\WhereLiveCheck.ps1 [-Api http://localhost:49475]
param([string]$Api = "http://localhost:49475")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$cs = (Get-Content (Join-Path $root "Backend\appsettings.json") -Raw | ConvertFrom-Json).ConnectionStrings.cs
$keyBytes = [Convert]::FromBase64String("QDYxOUA2MTlANjE5QA==")

function Enc([string]$t) {
    $b = [Text.Encoding]::UTF8.GetBytes($t)
    for ($i = 0; $i -lt $b.Length; $i++) { $b[$i] = $b[$i] -bxor $keyBytes[$i % $keyBytes.Length] }
    [Convert]::ToBase64String($b)
}

function Direct([string]$table, [string]$key, [string]$cond) {
    $con = New-Object System.Data.SqlClient.SqlConnection $cs; $con.Open()
    try {
        $cmd = $con.CreateCommand(); $cmd.CommandText = "SELECT [$key] FROM $table WHERE $cond ORDER BY [$key]"
        $rd = $cmd.ExecuteReader(); $ids = New-Object System.Collections.Generic.List[string]
        while ($rd.Read()) { $ids.Add([string]$rd[0]) }; $rd.Close(); return ,$ids
    } finally { $con.Close() }
}

function ViaApi([string]$table, [string]$key, [string]$cond) {
    $body = ConvertTo-Json -Depth 5 @(@{ NameTable = (Enc $table); Condition = (Enc $cond); OrderByID = (Enc $key); OrderType = "ASC" })
    $raw = Invoke-WebRequest -UseBasicParsing -Uri "$Api/api/ManageDataSQL/Query" -Method Post -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body))
    $obj = $raw.Content | ConvertFrom-Json
    if ($obj -is [string]) { $obj = $obj | ConvertFrom-Json }
    if (-not $obj.IsSuccess) { throw "API error: $($obj.ErrorMessage)" }
    $rows = @($obj.Response[0]) | Where-Object { $_ -ne $null -and -not $_.__IsMetaData }
    $ids = @($rows | ForEach-Object { [string]$_.$key } | Sort-Object { [int]$_ })
    return ,$ids
}

$cases = @(
    @("TST_Item", "ItemID", "ItemID = 15"),
    @("TST_Item", "ItemID", "ItemID = 1"),
    @("TST_Item", "ItemID", "CategoryID = 1 AND ItemID = 15"),
    @("TST_Item", "ItemID", "IsActive = 1 AND ItemID = 15"),
    @("TST_Item", "ItemID", "ItemID=150"),
    @("TST_Item", "ItemID", "Price = 480.140"),
    @("TST_Item", "ItemID", "Price >= 955.28"),
    @("TST_Item", "ItemID", "Price = 1.5"),
    @("TST_Item", "ItemID", "ItemID <> 15 AND CategoryID = 10"),
    @("TST_Item", "ItemID", "ItemID != 1"),
    @("TST_Item", "ItemID", "ItemID > -1 AND CategoryID = -5"),
    @("TST_Item", "ItemID", "ItemID IN (1, 15, 150) AND IsActive = 1"),
    @("TST_Item", "ItemID", "Code = 'IT0006'"),
    @("TST_Item", "ItemID", "Code = N'IT0006' OR Code = N'IT0012'"),
    @("TST_Item", "ItemID", "NameE = N'O''Brien' OR ItemID = 15"),
    @("TST_Item", "ItemID", "NameE <> N'O''Brien'"),
    @("TST_Item", "ItemID", "NameE LIKE '%a=1%' OR ItemID = 15"),
    @("TST_Item", "ItemID", "NameE LIKE N'%Deluxe%' AND CategoryID = 10"),
    @("TST_Item", "ItemID", "[ItemID] = 15"),
    @("TST_Item", "ItemID", "NULLIF(Barcode, '') IS NOT NULL AND ItemID = 15"),
    @("TST_Item", "ItemID", "Barcode = NULL"),
    @("TST_Item", "ItemID", "(CompCode = 1) AND (CategoryID = 10 OR CategoryID = 1)"),
    @("TST_Item", "ItemID", "CompCode = 1 AND IsActive = 1"),
    @("TST_Item", "ItemID", "CAST(ItemID AS NVARCHAR(100)) IN (N'1', N'15') AND CompCode = 1"),
    @("TST_Item", "ItemID", " CompCode = 1 and CategoryID = 10 "),
    @("TST_Order", "OrderID", "TrDate = '2025-01-01'"),
    @("TST_Order", "OrderID", "TrDate >= '2026-01-01' AND TrDate <= '2026-03-31' AND Status = 1"),
    @("TST_Order", "OrderID", "TrDate BETWEEN '2026-01-01' AND '2026-02-01' AND BranchCode = 1"),
    @("TST_Order", "OrderID", "CAST(TrDate AS date) = '2025-01-01' OR OrderID = 15"),
    @("TST_Expense", "ExpenseID", "Amount = 100 OR Amount = 100.5"),
    @("TST_Expense", "ExpenseID", "CompCode = 1 AND BranchCode = 1 AND Status = 1")
)

$fail = 0; $pass = 0
foreach ($c in $cases) {
    try {
        $d = Direct $c[0] $c[1] $c[2]
        $a = ViaApi $c[0] $c[1] $c[2]
        $ok = (($d -join ",") -eq ($a -join ","))
        if ($ok) { $pass++ ; $s = "PASS" } else { $fail++ ; $s = "FAIL" }
        "{0}  {1,-12} rows direct={2,-5} api={3,-5} {4}" -f $s, $c[0], $d.Count, $a.Count, $c[2]
    } catch { $fail++; "ERROR {0} :: {1} :: {2}" -f $c[0], $c[2], $_.Exception.Message }
}
"----"
"passed=$pass failed=$fail"
if ($fail -gt 0) { exit 1 } else { exit 0 }
