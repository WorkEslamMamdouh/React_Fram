# Paged-query latency through api/ManageDataSQL/Query (same encrypted payload as the frontend).
# Usage: powershell -File Tools\Checks\QueryLatency.ps1 [-Api http://localhost:49475] [-Table TST_OrderLine] [-Key LineID] [-Runs 30]
param([string]$Api = "http://localhost:49475", [string]$Table = "TST_OrderLine", [string]$Key = "LineID", [int]$Runs = 30)

$keyBytes = [Convert]::FromBase64String("QDYxOUA2MTlANjE5QA==")
function Enc([string]$t) {
    if (-not $t) { return $t }
    $b = [Text.Encoding]::UTF8.GetBytes($t)
    for ($i = 0; $i -lt $b.Length; $i++) { $b[$i] = $b[$i] -bxor $keyBytes[$i % $keyBytes.Length] }
    [Convert]::ToBase64String($b)
}
function Call($model) {
    $body = ConvertTo-Json -Depth 5 @($model)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $raw = Invoke-WebRequest -UseBasicParsing -Uri "$Api/api/ManageDataSQL/Query" -Method Post -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body))
    $sw.Stop()
    $obj = $raw.Content | ConvertFrom-Json
    if ($obj -is [string]) { $obj = $obj | ConvertFrom-Json }
    if (-not $obj.IsSuccess) { throw "API error: $($obj.ErrorMessage)" }
    $rows = @($obj.Response[0])
    $meta = $rows | Where-Object { $_.__IsMetaData } | Select-Object -First 1
    [pscustomobject]@{ Client = $sw.Elapsed.TotalMilliseconds; Server = [double]$obj.ExecutionTimeMs; Rows = @($rows | Where-Object { -not $_.__IsMetaData }).Count; Total = $meta.__TotalCount }
}
function Stats($name, $list) {
    $c = @($list | ForEach-Object Client | Sort-Object); $s = @($list | ForEach-Object Server | Sort-Object)
    $p = { param($a, $q) $a[[Math]::Min($a.Count - 1, [int][Math]::Floor($a.Count * $q))] }
    "{0,-46} rows={1,-4} total={2,-6} client p50={3,6:N1} p95={4,6:N1} ms | server p50={5,5:N0} p95={6,5:N0} ms" -f $name, $list[0].Rows, $list[0].Total, (& $p $c 0.5), (& $p $c 0.95), (& $p $s 0.5), (& $p $s 0.95)
}

$null = Call @{ NameTable = (Enc $Table); Condition = ""; OrderByID = (Enc $Key); OrderType = "ASC"; IsPage = $true; PageNumber = 1; PageSize = 25 } # warm-up
$scenarios = @(
    @{ n = "page 1 x25, total count";          m = @{ IsPage = $true; PageNumber = 1;  PageSize = 25; ReturnTotalCount = $true; Condition = "" } },
    @{ n = "page 50 x25, total count";         m = @{ IsPage = $true; PageNumber = 50; PageSize = 25; ReturnTotalCount = $true; Condition = "" } },
    @{ n = "page 1 x100, total, where Qty >= 1"; m = @{ IsPage = $true; PageNumber = 1; PageSize = 100; ReturnTotalCount = $true; Condition = "Qty >= 1" } },
    @{ n = "page 1 x40, where ItemID = 15";    m = @{ IsPage = $true; PageNumber = 1; PageSize = 40; ReturnTotalCount = $true; Condition = "ItemID = 15" } },
    @{ n = "all rows (no paging)";              m = @{ IsPage = $false; Condition = "" } }
)
foreach ($sc in $scenarios) {
    $res = @()
    for ($r = 0; $r -lt $Runs; $r++) {
        $m = @{ NameTable = (Enc $Table); OrderByID = (Enc $Key); OrderType = "ASC" }
        foreach ($k in $sc.m.Keys) { $m[$k] = $sc.m[$k] }
        $m.Condition = Enc $m.Condition
        $res += Call $m
    }
    Stats $sc.n $res
}
