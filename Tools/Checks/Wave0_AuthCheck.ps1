param([string]$BaseUrl = "http://localhost:5000", [string]$User = "admin", [string]$Pass = "admin")
# Wave 0 live checks: POST login, legacy GET login, refresh, and the data-API auth mode.
$ErrorActionPreference = "Continue"
function Try-Json($resp) { try { return ($resp.Content | ConvertFrom-Json) } catch { return $null } }

Write-Host "== POST api/auth/login =="
try {
  $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body (@{Username=$User;Password=$Pass}|ConvertTo-Json) -UseBasicParsing
  $j = Try-Json $r
  $tok = ($j.Response.Token)
  Write-Host ("  status={0} tokenReceived={1}" -f $r.StatusCode, [bool]$tok)
} catch { Write-Host "  POST login error: $($_.Exception.Message)"; $tok = $null }

Write-Host "== GET api/auth/login (legacy flag) =="
try { $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login?Username=$User&Password=$Pass" -Method GET -UseBasicParsing; Write-Host "  status=$($r.StatusCode)" }
catch { Write-Host "  GET login status/err: $($_.Exception.Response.StatusCode.value__) $($_.Exception.Message)" }

if ($tok) {
  Write-Host "== POST api/auth/refresh =="
  try { $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/refresh" -Method POST -Headers @{Authorization="Bearer $tok"} -UseBasicParsing; Write-Host "  status=$($r.StatusCode)" }
  catch { Write-Host "  refresh err: $($_.Exception.Message)" }
}

Write-Host "== Anonymous ManageDataSQL/Query (Audit=200 / Enforce=401) =="
try {
  $body = ConvertTo-Json @(@{ NameTable = "Sys_Modules"; Condition = "" })
  $r = Invoke-WebRequest -Uri "$BaseUrl/api/ManageDataSQL/Query" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
  Write-Host "  status=$($r.StatusCode) (200 = Audit mode allows anonymous)"
} catch { Write-Host "  status=$($_.Exception.Response.StatusCode.value__) (401 = Enforce mode)" }
