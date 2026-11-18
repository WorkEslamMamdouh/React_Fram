# 08 — Wave 0 + Wave 1 Technical Design (التصميم الفني للموجة صفر والموجة الأولى)

| Item | Value |
|---|---|
| Status | Design only. No product code was changed. This document is the build spec. |
| Date | 2026-11-12 |
| Based on | `07_Research_New_Ideas.md` (sections A, B, C, D), `CLAUDE.md`, `02` (Studio architecture), `04` (QA report), `05` (report format), ERP Studio `README.md` + code |
| Products | Framework runtime `C:\PC\Work\React_Fram` · ERP Studio `C:\PC\Work\ERP_Studio` · **new** ERP Device Bridge `C:\PC\Work\ERP_DeviceBridge` |
| Contract version | **`wave1-v1`** (written to `Sys_RuntimeSettings['Contract.Version']` by the runtime and checked by Studio) |
| Graphify | Index of `React_Fram` at commit `4feeef3` (7 days old) used for `ManageDataSQLController` fan-out; everything else checked by direct code reading. |

### Corrections to the research (07)
1. **`BuildWhereUltraFast` is already fixed** (`Backend/Controllers/GateWay/Services/WhereParameterizer.cs`, 31/31 live checks, `04` §2). It is **not** planned again. Device / printer / branch ids such as `= 15` are safe.
2. Two Wave 0 security items are added that the research only hinted at:
   - `ManageDataSQLController` has `[Authorize]` commented out (`04` §6.1). Anyone can Query/Insert/Delete without a token.
   - `Sys_Users.USER_PASSWORD` is plain text, and `AuthController.Login` builds SQL by string concatenation with the password in a **GET query string** (SQL injection + passwords in IIS logs). `G_SearchFrom.ts` / `G_DynamicSelect.ts` read `Sys_Users` through the open Query API, so passwords and tokens can be read by any caller today.

### How to read this document
- §1 decisions, §2 architecture, §3 the two parallel packages, **§4 the shared contracts (the only thing the two implementers need to agree on)**.
- §5 Wave 0, §6 Wave 1 items (each: files, DB, API, UI, config, security, tests, acceptance).
- §7 Device Bridge, §8 Studio, §9 full DDL, §10 test plan, §11 risks, §12 out of scope.

---

## 1. Key decisions (القرارات)

| # | Decision | Why |
|---|---|---|
| D1 | **Studio never talks to the runtime API or to bridges.** Studio writes configuration rows and command rows into the project DB; the runtime reads them and acts (dispatcher polls every 2 s). | The two products stay decoupled (different hosts, Studio may not reach the runtime). Studio already reaches the project DB. Parallel build with one contract. |
| D2 | **DDL is owned by Package F** (`React_Fram/Database/Phase11_*.sql`). The DDL text in §9 is the contract; S builds against a test DB created from §9. | One owner per table. |
| D3 | Studio writes only to an **explicit table + column allow-list** (§4.1), and only when the user has the permission, the environment is not read-only, and a `DbObjectGrant` gives `CanSaveTo` on that table (existing `ObjectAllowList` rules, deny wins). Fixed parameterised SQL only (Dapper), no dynamic SQL. | "Studio writes to the project DB only through allowed-object rules". |
| D4 | Password hashing = **ASP.NET Core Identity `PasswordHasher<T>` V3 format** (PBKDF2, the class is in the ASP.NET Core shared framework, no package). Studio already uses the same class for its own users. Migration on successful login + optional bulk job. Plain text kept until the owner switches it off. | Same format in both products; backward compatible. |
| D5 | Data API auth is a **filter with three modes** `Off / Audit / Enforce` (config). Ship in `Audit` (logs anonymous calls, blocks nothing), switch to `Enforce` after one clean week. Sensitive columns are stripped/blocked in every mode. | Does not break unknown anonymous callers on day one. |
| D6 | Realtime = **ASP.NET Core SignalR** (in the shared framework, no server package). Two hubs: `/hubs/app` (users, JWT) and `/hubs/devices` (bridges, device token). Clients: `@microsoft/signalr` (MIT), `Microsoft.AspNetCore.SignalR.Client` (MIT). Falls back to SSE / long polling when IIS WebSockets is off. | Research C-01. |
| D7 | Background jobs = **own small scheduler** (`BackgroundService` + DB tables `Sys_Jobs` / `Sys_JobRuns` + `sp_getapplock` lease) + **Cronos** (MIT) for cron parsing. No Hangfire (LGPL + paid Pro), no Quartz store schema. | Studio can edit job rows directly; small, no license questions. |
| D8 | Print **rendering happens in the browser** (existing `rf-report/1` renderer → self-contained HTML). The bridge receives HTML (A4 / receipt / label-raster) or raw bytes (ZPL/TSPL from a server-filled template). The bridge never needs a copy of the report renderer. | No second renderer to keep in sync; Arabic shaping = browser. |
| D9 | Bridge = .NET 9 **Windows Service** + a small **WebView2 renderer exe** (child process). Transports in v1: **Windows spooler RAW** and **TCP 9100**. IPP, serial, PDF, loopback API, auto-update are Wave 2. | Smallest thing that covers A4 + 80/58 mm + labels + drawer. |
| D10 | **Fallback printer is handled by the server** (child job to the fallback printer, maybe on another bridge). The bridge only retries 3 times and reports `failed`. | Fallback may live on a different PC. |
| D11 | Attendance: one raw table for every source (push, pull, CSV, manual), unique key `(DeviceId, DeviceUserId, PunchLocal, State)`. ZKTeco ADMS receiver in the runtime; ZKTeco TCP 4370 pull in the bridge (own clean-room C# client from MIT docs, **no GPL code copied**). | Research B.2–B.4. |
| D12 | Custom fields **without touching business tables**: values live in one side table `Sys_RecordExtra (EntityCode, RecordKey, ExtraJson)`. Wire format: a `__extra` object inside the normal `Data` JSON. | "No schema change" literally; promotion to a real column is Wave 2. |
| D13 | Audit capture is **inside the same SQL transaction** as the save, behind a savepoint, so an audit failure never loses the user's save unless `Audit:FailClosed=true`. | Correct history without new outage risk. |
| D14 | Document numbering = DB procedure `Sys_NextDocNo` (UPDLOCK/HOLDLOCK counter row) called **inside the save transaction** by `ManageDataSQLController` when a binding exists → gapless by construction. | Research C-03. |
| D15 | Every new controller action name must **not** be one of the names `AutoDecryptFilter` decrypts (`Query, GetDataFromSql, Insert, Insert-list, Update, Update-list, Delete, Bulk-Insert, Bulk-Update`). The filter is global and matches by action name only. | Avoids surprise "decryption" of device payloads. |
| D16 | New framework C# files: **CRLF**. `Tools/CreatePageReact` is **not changed** in Wave 1 (C# 7.3). New screen options are written only to `.studio.json`, never to `@CreatePageReact-Settings`. | CLAUDE.md constraints. |
| D17 | Nothing in this wave touches `C:\inetpub`, IIS configuration files, or Tailscale. IIS settings that help (WebSockets feature, AlwaysRunning) are **owner actions**, documented in §5.4, and the design works without them (SignalR falls back; jobs catch up). | Constraint. |

---

## 2. Architecture overview

```
                      ┌──────────────────────── ERP Studio (separate host) ───────────────────────┐
                      │ Devices · Printers & Routing · Attendance (shift designer) · Numbering ·  │
                      │ Custom fields · Jobs · Audit policy                                        │
                      │ RuntimeWriteGuard: perm + env not read-only + DbObjectGrant SaveTo +      │
                      │ table/column allow-list  →  fixed Dapper SQL  →  EXEC Sys_BumpConfigVersion│
                      └───────────────┬───────────────────────────────────────────────────────────┘
                                      │ SQL (config rows, command rows, job-run requests) — reads status
                                      ▼
   ┌────────────────────────── Project DB (ESSA_React) ──────────────────────────────────────────────┐
   │ Sys_RuntimeSettings  Sys_AuditLog/Policy  Sys_Jobs/JobRuns  Sys_Devices/Pairing/Commands         │
   │ Sys_Printers/PrintRoutes/PrintStations/ItemStationMap/PrintTemplates/PrintJobs  Sys_RuntimeKeys  │
   │ Att_* (raw, map, punch, shift, roster, holiday, summary, exception, period, csv profile)        │
   │ Sys_DocSeries/Counter/Binding  Sys_CustomFieldEntity/Def  Sys_RecordExtra                        │
   └───────────────▲─────────────────────────────────────────────────────────────▲───────────────────┘
                   │ SqlClient                                                     │
   ┌───────────────┴─────────── Framework API (ASP.NET Core 9) ───────────────────┴──────────────┐
   │ auth (hash+migrate, refresh)  ManageDataSQL (+auth filter, sensitive guard, audit, extra,    │
   │ numbering)  /hubs/app  /hubs/devices  api/print/*  api/devices/*  /iclock/* (ADMS)           │
   │ api/att/*  api/numbering/*  api/meta/custom-fields  api/audit/*                               │
   │ BackgroundServices: JobScheduler · DeviceCommandDispatcher · PrintJobDispatcher               │
   └───────▲───────────────────────────────▲──────────────────────────────▲───────────────────────┘
           │ HTTPS + /hubs/app (JWT)        │ wss /hubs/devices (device token, outbound)   │ HTTP push
   Browser (PC/tablet/phone)        ERP Device Bridge (branch PC, Windows Service)   ZKTeco ADMS clocks
   printDocument → resolve →        SQLite queue · WebView2 renderer · ESC/POS raster ·
   render HTML → api/print/jobs     ZPL · spooler RAW · TCP 9100 · ZK TCP 4370 pull
```

---

## 3. Work packages (الحزمتين المتوازيتين)

### 3.1 Package F — framework + Device Bridge
Owner of: everything under `C:\PC\Work\React_Fram` (Backend, Frontend/App, Database, Tests, Tools/Checks) and everything under `C:\PC\Work\ERP_DeviceBridge`.

| Milestone | Content | Est. (1 dev) |
|---|---|---|
| F0 (day 1–2) | Phase11 SQL scripts exactly as §9 (unblocks S's test DB) | 2 d |
| F1 | Wave 0: W0-1 password hashing, W0-2 data-API auth + sensitive guard, W0-3 JWT hardening + refresh, W0-5 settings/audit base | 1 wk |
| F2 | W1-1 realtime hubs, W1-2 jobs scheduler, device auth + pairing + command dispatcher | 1.5 wk |
| F3 | Bridge v1 (service, queue, renderer, ESC/POS raster, ZPL, spooler, 9100, installer) + W1-4 print API/frontend `printDocument` | 2.5 wk |
| F4 | W1-5 attendance: ADMS receiver, ZK TCP client in bridge, ingest, mapper, CSV import, shift engine, 5 runtime screens | 2.5 wk |
| F5 | W1-9 numbering, W1-10 custom fields, W1-11 audit trail + record history | 1.5 wk |
| F6 | Hardening, Tools/Checks smoke scripts, docs update (`CLAUDE.md` section), regression of existing screens | 1 wk |

### 3.2 Package S — ERP Studio
Owner of: everything under `C:\PC\Work\ERP_Studio`.

| Milestone | Content | Est. (1 dev) |
|---|---|---|
| S0 | Migrations 005/006, permissions, `RuntimeConfigTables` allow-list, `RuntimeWriteGuard`, `RuntimeConfigGateway`, status endpoint + banner, grant preset | 1 wk |
| S1 | Devices page (bridges, pairing code, attendance devices wizard, terminals, command runner, user mapping) | 1.5 wk |
| S2 | Printers & Routing page (printers, discover, test, routes grid, effective-printer tester, stations, templates, print log) | 1.5 wk |
| S3 | Attendance page (settings, employee source, shift designer + simulator, roster, holidays, CSV profiles, processing, periods) | 1.5 wk |
| S4 | Numbering designer, Custom fields, Jobs, Audit policy + runtime audit log pages; codegen options (§4.12) | 1.5 wk |

### 3.3 No-overlap rules
- F never edits files in `ERP_Studio`; S never edits files in `React_Fram` or `ERP_DeviceBridge`.
- S may **run** the Phase11 scripts on its own test DB (read-only use of F's artifact) or create the DB from §9 directly.
- Any contract change → bump `wave1-v1` → `wave1-v2` in this document first.
- Integration day (end of F5/S4): §10.4 checklist, run by both.

---

## 4. Shared contracts (العقود المشتركة)

### 4.1 Table ownership and Studio write allow-list

`S-ops` = what Studio may do. Columns not listed under "Studio columns" are runtime-owned and **must never be written by Studio**. Every Studio write is followed by `EXEC dbo.Sys_BumpConfigVersion @Area` and an `Sys_AuditLog` row with `Source='studio'`.

| Table | Area | S-ops | Studio columns (write) | Runtime-owned columns |
|---|---|---|---|---|
| `Sys_RuntimeSettings` | per key | update/insert **only keys** with prefix `Att.` or exactly `Print.ReprintPermission`, `Audit.RetentionDays` | `SettingValue, UpdatedBy` | all other keys (`Schema.*`, `Contract.*`, `Config.Version*`, `Runtime.PublicUrl`, `Bridge.LatestVersion`) |
| `Sys_Devices` | devices | insert, update, deactivate (no delete) | `DeviceKind, Vendor, Name, CompCode, BranchCode, BridgeDeviceId, SerialNo, Host, Port, SecretsEnc, TimeZoneId, DirectionMode, PullIntervalMin, SettingsJson, IsActive, CreatedBy, UpdatedBy`; on **revoke only**: `TokenHash = NULL, RevokedAtUtc = SYSUTCDATETIME(), IsActive = 0` | `TokenHash, PairedAtUtc, IsOnline, LastSeenAtUtc, AgentVersion, MachineName, CapabilitiesJson, InstalledPrintersJson, SyncStateJson, LastPunchLocal, LastSyncAtUtc, LastError, ClockDriftSec, TerminalKey` |
| `Sys_DevicePairing` | devices | insert | all except `UsedAtUtc` | `UsedAtUtc` |
| `Sys_DeviceCommands` | devices | insert (`Source='studio'`), read | `DeviceId, CommandType, ArgsJson, RequestedBy, Source, ExpiresAtUtc` | `Status, ResultJson, Error, SentAtUtc, DoneAtUtc` |
| `Sys_Printers`, `Sys_PrintRoutes`, `Sys_PrintStations`, `Sys_ItemStationMap`, `Sys_PrintTemplates` | printing | insert, update, delete | all except identity/RowVer | — |
| `Sys_PrintJobs` | printing | read only | — | all |
| `Att_Settings`, `Att_Shift`, `Att_Roster`, `Att_Holiday`, `Att_DeviceUserMap`, `Att_CsvProfile` | attendance | insert, update, delete | all except identity/RowVer | — |
| `Att_Period` | attendance | insert; update `Status, LockedBy, LockedAtUtc` | those | — |
| `Att_RawPunch`, `Att_Punch`, `Att_DailySummary`, `Att_Exception` | attendance | read only | — | all |
| `Sys_Jobs` | jobs | update only | `CronExpr, TimeZoneId, ParamsJson, IsEnabled, TimeoutSec, UpdatedBy` | `JobType, LastRunId, NextRunAtUtc` (rows are seeded by F) |
| `Sys_JobRuns` | jobs | insert `Status='queued'`, read | `JobCode, ParamsJson, TriggeredBy ('studio:{userId}'), Status` | everything else |
| `Sys_DocSeries`, `Sys_DocSeriesBinding` | numbering | insert, update, delete (series delete only when it has no counter row) | all except identity/RowVer | — |
| `Sys_DocSeriesCounter` | numbering | read only | — | all |
| `Sys_CustomFieldEntity`, `Sys_CustomFieldDef` | customfields | insert, update, delete (def delete = `IsActive=0` when values exist) | all except identity/RowVer | — |
| `Sys_RecordExtra` | customfields | read only | — | all |
| `Sys_AuditPolicy` | audit | insert, update, delete | all | — |
| `Sys_AuditLog` | audit | insert (`Source='studio'`), read | `Source, Action, UserCode, CompCode, BranchCode, TableName, RecordKey, ChangesJson` | — |
| `Sys_RuntimeKeys` | — | read only (`Kid, PublicKeyPem` where `IsActive=1`) | — | all |

Execute grants Studio needs: `dbo.Sys_BumpConfigVersion` (P), `dbo.Sys_PrintRouteCandidates` (IF), `dbo.Sys_FormatDocNo` (FN).

### 4.2 Optimistic concurrency
Every Studio-editable table has `RowVer ROWVERSION`. Studio sends `rowVer` (base64) on update/delete: `... WHERE <pk> = @id AND RowVer = @rowVer`; 0 rows → HTTP 409 `{code:"row_changed"}`.

### 4.3 Config version (when the runtime must reload)
- `EXEC dbo.Sys_BumpConfigVersion @Area` where `@Area IN ('devices','printing','attendance','numbering','customfields','jobs','audit','settings')` increments `Config.Version` and `Config.Version.<area>`.
- Runtime polls `Config.Version` every 10 s; on change it reloads that area's cache, re-runs `dbo.Att_RebuildViews` for `attendance`/`settings`, and sends `ConfigChanged` to every connected bridge for `devices`/`printing`.
- Effect time after a Studio save: **≤ 15 s**.

### 4.4 Password hash format
- Column `Sys_Users.USER_PasswordHash NVARCHAR(256)`.
- Value = `new PasswordHasher<object>().HashPassword(null!, password)` (Identity V3, base64). Verify with `VerifyHashedPassword`; on `SuccessRehashNeeded` the runtime rewrites the hash.
- Whoever sets a password (runtime change-password, Studio app-users page later) writes `USER_PasswordHash`, sets `PasswordMigratedAt = SYSUTCDATETIME()`, and writes `USER_PASSWORD = N''` (empty, never the password). An empty `USER_PASSWORD` must never authenticate.

### 4.5 Pairing code
- 8 characters from Crockford base32 `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, shown as `XXXX-XXXX`, generated with a CSPRNG (≈ 40 bits).
- Normalisation (both sides): upper-case, remove `-` and spaces, `O→0`, `I→1`, `L→1`.
- `CodeHash = lower-hex( SHA-256( UTF-8( "pair:v1:" + normalized ) ) )`.
- Valid 10 minutes (`ExpiresAtUtc`), single use (`UsedAtUtc`). Studio shows the plain code once and never stores it.

### 4.6 Device token
- Format: `d1.{DeviceId}.{secret}` where `secret` = 32 random bytes, base64url without padding (43 chars).
- `Sys_Devices.TokenHash = lower-hex(SHA-256(UTF-8(secret)))`, compared with `CryptographicOperations.FixedTimeEquals`.
- Sent as `Authorization: Bearer d1.{id}.{secret}` (HTTP and SignalR), or `?access_token=` on the hub URL when headers are impossible.
- Valid while `IsActive=1 AND TokenHash IS NOT NULL AND RevokedAtUtc IS NULL`.

### 4.7 Sealed device secrets (`Sys_Devices.SecretsEnc`)
- The runtime creates an RSA-3072 key pair on first start if `Sys_RuntimeKeys` has no active row: public key PEM in `Sys_RuntimeKeys`, private key in `Backend/App_Data/keys/{Kid}.key` protected with DPAPI `LocalMachine`.
- Studio seals: `SecretsEnc = "rsa1:" + Kid + ":" + base64( RSA-OAEP-SHA256( UTF-8(json) ) )`, json ≤ 300 bytes, e.g. `{"commKey":12345}` or `{"apiUser":"x","apiPassword":"y"}`.
- Studio never reads secrets back (UI shows "set / not set"). The runtime decrypts only to send the value inside `BridgeConfig` over the authenticated hub.
- Key loss (server moved without the key file) → secrets must be re-entered in Studio. Documented in the runtime README section.

### 4.8 Runtime settings keys (`Sys_RuntimeSettings`)

| Key | Writer | Default | Meaning |
|---|---|---|---|
| `Schema.Phase11` | script | `1` | Phase11 schema installed |
| `Contract.Version` | runtime (startup) | `wave1-v1` | Studio refuses runtime pages on mismatch |
| `Config.Version`, `Config.Version.<area>` | `Sys_BumpConfigVersion` | `0` | §4.3 |
| `Runtime.PublicUrl` | runtime (from `Runtime:PublicUrl`) | `''` | Base URL shown by Studio for install command / ADMS address |
| `Bridge.LatestVersion` | runtime/owner | `1.0.0` | Bridge shows "update available" |
| `Print.ReprintPermission` | Studio | `PRINT` | `PRINT` or `CUSTOM1`..`CUSTOM9` needed for reprints |
| `Audit.RetentionDays` | Studio | `730` | Purge job retention |
| `Att.EmployeeSource` | Studio | `G_D_Employees` | Table/view with employees |
| `Att.EmpIdColumn` / `Att.EmpCodeColumn` / `Att.EmpNameColumn` / `Att.EmpBranchColumn` / `Att.EmpCompColumn` | Studio | `EmpID` / `EmpCode` / `Emp_Name` / `''` / `''` | Column names (validated by both sides against `sys.columns`) |

### 4.9 Device hub (SignalR) — `/hubs/devices`, scheme `Device`

All payloads JSON, camelCase, `v: 1`. Method names are exact.

**Bridge → server (hub methods)**

| Method | Argument | Returns | Notes |
|---|---|---|---|
| `Hello` | `HelloDto` | `BridgeConfig` | First call after every connect |
| `Heartbeat` | `HeartbeatDto` | — | every `heartbeatSec` (30) |
| `JobAccepted` | `string jobId` | — | after the job is stored in SQLite |
| `JobStatus` | `JobStatusDto` | — | `printing`, `printed`, `failed`, `expired` |
| `CommandResult` | `CommandResultDto` | — | |

**Server → bridge (client handlers)**

| Name | Argument |
|---|---|
| `JobOffer` | `JobEnvelope` |
| `Command` | `CommandEnvelope` |
| `ConfigChanged` | `{ v:1, configVersion:"18" }` → bridge calls `Hello` again |
| `Revoked` | `{ v:1, reason:"revoked" }` → bridge stops connecting, keeps queue, logs error |

```jsonc
// HelloDto
{ "v":1, "agentVersion":"1.0.0", "machineName":"BR5-TILL2", "osVersion":"Windows 10.0.19045",
  "queueDepth":0, "pendingOutbox":0,
  "installedPrinters":[{"name":"EPSON TM-T20III","isDefault":true,"port":"USB001","driver":"EPSON TM-T20III Receipt"}],
  "capabilities":["print.html","print.raster","print.raw","drawer","att.zk-tcp"] }

// BridgeConfig
{ "v":1, "deviceId":12, "name":"Branch 5 bridge", "compCode":1, "branchCode":5,
  "serverTimeUtc":"2026-11-12T08:00:00Z", "configVersion":"18", "heartbeatSec":30,
  "latestAgentVersion":"1.0.0", "logLevel":"Information",
  "printers":[ PrinterDto ],
  "attendanceDevices":[{ "deviceId":31, "name":"Gate clock", "vendor":"zk-tcp", "host":"192.168.1.201", "port":4370,
      "commKey":0, "timeZoneId":"Egypt Standard Time", "pullIntervalMin":10, "realtime":false,
      "autoSetTime":true, "lastPunchLocal":"2026-11-12T07:58:10" }] }

// PrinterDto
{ "printerId":7, "name":"Till-2 Epson", "kind":"receipt80", "transport":"spooler", "target":"EPSON TM-T20III",
  "language":"escpos-raster", "paperWidthMm":80, "paperHeightMm":null, "dpi":203, "dotsWidth":576,
  "hasDrawer":true, "drawerPin":0, "drawerOnMs":50, "drawerOffMs":500, "cutMode":"partial", "codePage":null }

// HeartbeatDto
{ "queueDepth":0, "pendingOutbox":0, "uptimeSec":3600, "clockUtc":"2026-11-12T08:00:30Z",
  "printers":[{"printerId":7,"state":"ok"}] }          // ok | offline | paper-out | error | unknown

// JobEnvelope
{ "v":1, "jobId":"0b6c…", "docKey":"POS_Receipt", "isReprint":false,
  "createdAtUtc":"…", "expiresAtUtc":"…",
  "copies":1, "copyWatermark":false, "openDrawer":true,
  "printer": PrinterDto,
  "payload":{ "kind":"html", "url":"/api/devices/jobs/0b6c…/payload", "sha256":"<hex>", "bytes":48211 } }

// JobStatusDto
{ "jobId":"0b6c…", "status":"printed", "attempts":1, "error":null, "atUtc":"…", "uncertain":false }

// CommandEnvelope
{ "v":1, "commandId":901, "type":"printer.test", "targetDeviceId":12, "args":{ "printerId":7 }, "expiresAtUtc":"…" }

// CommandResultDto
{ "commandId":901, "ok":true, "error":null, "result":{ } }
```

Rules:
- The server re-offers every job with `Status IN ('queued','sent')` and `ExpiresAtUtc > now` when a bridge connects (`Hello`). The bridge ignores a `jobId` it already has (`INSERT OR IGNORE`) and re-sends its final status if the job is finished.
- `MaximumReceiveMessageSize` on the device hub = 64 KB. Large data (payloads, punches, logs) always goes over HTTP.
- Group per bridge: `device:{DeviceId}`.

### 4.10 Device commands (`Sys_DeviceCommands.CommandType`)

| Type | Target | Args | Result (`ResultJson`) |
|---|---|---|---|
| `printers.discover` | bridge | `{ "scanLan": false }` | `{ "installed":[{name,isDefault,port,driver,isNetwork}], "network":[{ "ip":"192.168.1.50","port9100":true }] }` |
| `printer.test` | bridge | `{ "printerId":7, "openDrawer":false }` | `{ "printed":true, "ms":840 }` |
| `drawer.test` | bridge | `{ "printerId":7 }` | `{ "opened":true }` |
| `att.test` | attendance (zk-tcp) | `{}` | `{ "serialNo":"…", "firmware":"…", "deviceTime":"2026-11-12T08:00:03", "driftSec":3, "userCount":120, "logCount":5400, "last5":[{u,t,s,v}] }` |
| `att.users.read` | attendance (zk-tcp) | `{}` | `{ "users":[{ "deviceUserId":"105","name":"Ahmed","card":null }] }` |
| `att.pull.now` | attendance (zk-tcp) | `{}` | `{ "read":5400, "uploaded":12 }` |
| `att.settime` | attendance (zk-tcp) | `{}` | `{ "driftBeforeSec":95 }` |
| `att.user.upsert` | attendance (zk-adms) | `{ "deviceUserId":"105","name":"Ahmed" }` | `{ "return":0 }` |
| `att.user.delete` | attendance (zk-adms) | `{ "deviceUserId":"105" }` | `{ "return":0 }` |
| `att.reboot` | attendance (zk-adms) | `{}` | `{ "return":0 }` |
| `bridge.logs.upload` | bridge | `{ "days":1 }` | `{ "uploaded":true, "bytes":12000 }` |

Routing by the runtime dispatcher: `zk-tcp` devices → `Command` to the device's `BridgeDeviceId` group (`targetDeviceId` = the attendance device); `zk-adms` → returned on `/iclock/getrequest`; `bridge` → its own group. Default expiry 60 s (discover 120 s). Expired → `Status='expired'`. Studio polls `GET …/commands/{id}` every 1.5 s.

### 4.11 Print route resolution (shared by runtime and Studio's tester)
- Function `dbo.Sys_PrintRouteCandidates(@DocKey, @Station, @CompCode, @BranchCode, @UserID, @TerminalDeviceId)` returns **all** matching active routes with `Score`; callers take `ORDER BY Score DESC, Priority DESC, RouteId DESC`.
- Weights (powers of two, so the most specific dimension always wins): **Station 64 · exact DocKey 32 (vs `*`) · Terminal 16 · User 8 · Branch 4 · Company 2**.
- A route with `Station` set matches only when the same station is requested; a request without a station never matches station routes.
- `CHECK (BranchCode IS NULL OR CompCode IS NOT NULL)` (branch codes are per company).

Test vectors (both packages): routes R1 `* / comp 1 → P_A4`; R2 `POS_Receipt / comp 1 / br 5 → P_T1`; R3 `POS_Receipt / comp 1 / terminal T2 → P_T2`; R4 `KitchenTicket / station GRILL / comp 1 / br 5 → P_K1`; R5 `* / comp 1 / terminal T2 → P_T2b`.

| Query (doc, station, comp, br, user, terminal) | Winner | Scores |
|---|---|---|
| SalesInvoice, –, 1, 5, 9, T2 | R5 | R1=2, R5=18 |
| POS_Receipt, –, 1, 5, 9, T2 | R3 | R1=2, R2=38, R3=50, R5=18 |
| POS_Receipt, –, 1, 5, 9, T9 | R2 | R1=2, R2=38 |
| KitchenTicket, GRILL, 1, 5, 9, T9 | R4 | R1=2, R4=102 |
| KitchenTicket, –, 1, 5, 9, T2 | R5 | R4 excluded, R1=2, R5=18 |
| POS_Receipt, –, 2, 5, 9, T9 | none → viewer | – |

### 4.12 Screen props (Studio codegen ↔ framework components)
New optional props on `DynamicGrid` and `MasterDetail` (F implements, S's generator emits **only when the option is set**):

| Prop | Type | Default | Effect |
|---|---|---|---|
| `printDocKey` | `string` | – | Print action uses `printDocument({ docKey, moduleCode, reportCode, row })`; falls back to the current behaviour when there is no route |
| `autoPrintOnSave` | `boolean` | `false` | After a successful save, print silently if the route says `AutoPrintOnSave=1` |
| `customFieldsEntity` | `string` | – | Load `Sys_CustomFieldDef` for that entity, add grid columns + form inputs, send/receive `__extra` |
| `enableHistory` | `boolean` | `false` | Adds the "History / السجل" row action (record audit trail) |

`.studio.json` additions (S): `"print": { "docKey": "SalesInvoice", "autoPrintOnSave": false }`, `"extras": { "customFieldsEntity": "Customers", "enableHistory": true }`. Not written into `@CreatePageReact-Settings`.

### 4.13 Document number pattern grammar (shared by `Sys_FormatDocNo`, Studio `DocNoFormatter.cs` and `docNo.ts`)
- Tokens: `{YYYY}` `{YY}` `{MM}` `{DD}` (document date), `{FY}` (financial year, else year of date), `{CO}` `{BR}` `{TERM}` (company, branch, terminal device id; NULL → 0) with optional width `{BR:3}` (1–9, left zero-pad, never truncates), `{#…#}` sequence padded to the number of `#` (1–12, never truncates).
- Exactly one `{#…}` token. Other text is literal. Pattern ≤ 100 chars; result ≤ 100 chars. Unknown `{…}` tokens are a validation error in Studio and left as text by SQL.

| Pattern | seq | CO | BR | TERM | Date | FY | Result |
|---|---|---|---|---|---|---|---|
| `INV-{BR}-{YYYY}-{#####}` | 42 | 1 | 3 | – | 2026-11-12 | – | `INV-3-2026-00042` |
| `{CO:2}{BR:3}/{YY}{MM}/{####}` | 7 | 1 | 12 | – | 2026-01-05 | – | `01012/2601/0007` |
| `POS{TERM:2}-{DD}{MM}-{###}` | 1234 | 1 | 1 | 5 | 2026-03-09 | – | `POS05-0903-1234` |
| `R-{FY}-{#}` | 9 | 1 | 1 | – | 2026-02-01 | 2025 | `R-2025-9` |
| `X{BR:3}-{##}` | 3 | 1 | NULL | – | 2026-02-01 | – | `X000-03` |

### 4.14 Shift engine rules v1 (runtime `ShiftEngine.cs` = Studio `shiftMath.ts` simulator)
Inputs: shift (`StartTime`, `EndTime`, cross-midnight when `EndTime <= StartTime`, `BreakMinutes`, `BreakIsPaid`, `GraceInMin`, `GraceOutMin`, `LateFromStart`, `OtAfterMin`, `OtRoundingMin`, `OtBeforeStart`, `EarlyInWindowMin`, `LateOutWindowMin`, `IsFlexible`, `RequiredMinutes`), work date `D`, approved non-ignored punches.

1. `SchedIn = D + Start`; `SchedOut = D + End (+1 day if cross)`. Window = `[SchedIn − EarlyInWindowMin, SchedOut + LateOutWindowMin]`.
2. Punches in the window, sorted. `ActualIn` = first, `ActualOut` = last (v1 always first-in/last-out; device direction is informational).
3. 0 punches: workday → `IsAbsent=1, Status='absent'`; weekend/holiday → `Status='off'/'holiday'`.
4. 1 punch: before the shift midpoint → in (`missing_out` exception), else out (`missing_in`); `Status='incomplete'`, `WorkedMin=0`.
5. `d = ActualIn − SchedIn` (whole minutes): `LateMin = d > GraceIn ? (LateFromStart ? d : d − GraceIn) : 0`.
6. `e = SchedOut − ActualOut`: `EarlyLeaveMin = e > GraceOut ? (LateFromStart ? e : e − GraceOut) : 0`.
7. `WorkedMin = max(0, (ActualOut − ActualIn) − (BreakIsPaid ? 0 : BreakMinutes))`.
8. `after = ActualOut − SchedOut`: `OtMin = after >= OtAfterMin ? floor(after / R) * R : 0` with `R = max(1, OtRoundingMin)`; plus the same rule for `SchedIn − ActualIn` when `OtBeforeStart = 1`.
9. Flexible: no late/early; `OtMin` from `WorkedMin − RequiredMinutes` with the same threshold/rounding; shortfall → `EarlyLeaveMin`.
10. Punches on a weekend/holiday: `OtMin = floor(WorkedMin / R) * R`, `Status='off'`/`'holiday'`.
11. Status priority: `absent > incomplete > late > early > ok`.

Vectors (shift 09:00–17:00, grace in 15 / out 10, `LateFromStart=1`, break 60 unpaid, OT after 30, rounding 15):

| # | Punches | Late | Early | Worked | OT | Status |
|---|---|---|---|---|---|---|
| V1 | 08:55, 17:05 | 0 | 0 | 430 | 0 | ok |
| V2 | 09:20, 17:00 | 20 | 0 | 400 | 0 | late |
| V3 | 09:10, 16:45 | 0 | 15 | 395 | 0 | early |
| V4 | 09:00, 18:40 | 0 | 0 | 520 | 90 | ok |
| V5 | night 22:00–06:00, D=2026-11-12: 21:50, next day 06:20 | 0 | 0 | 450 | 0 | ok |
| V6 | 09:05 only | 0 | 0 | 0 | 0 | incomplete (+ `missing_out`) |
| V7 | V2 with `LateFromStart=0` | 5 | 0 | 400 | 0 | late |

### 4.15 Enumerations (exact strings)
- `Sys_Devices.DeviceKind`: `bridge`, `attendance`, `terminal`. `Vendor`: `zk-tcp`, `zk-adms`, `csv` (Wave 1); `biostar2`, `hikvision`, `anviz` reserved.
- `Sys_Printers.Kind`: `a4`, `a5`, `receipt80`, `receipt58`, `label`, `kitchen`. `Transport`: `spooler`, `tcp9100`. `Language`: `html`, `escpos-raster`, `zpl`, `zpl-raster`, `tspl`. `CutMode`: `none`, `partial`, `full`.
- `Sys_PrintJobs.Status`: `queued`, `sent`, `accepted`, `printing`, `printed`, `failed`, `expired`, `fallback`, `cancelled`.
- `Sys_DeviceCommands.Status`: `queued`, `sent`, `done`, `failed`, `expired`.
- `Sys_JobRuns.Status`: `queued`, `running`, `succeeded`, `failed`, `cancelled`, `timeout`.
- `Att_RawPunch.State`: 0 in, 1 out, 2 break-out, 3 break-in, 4 OT-in, 5 OT-out, 255 unknown. `Source`: `push`, `pull`, `csv`, `manual`.
- `Att_Exception.ExType`: `unknown_user`, `missing_in`, `missing_out`, `no_shift`, `clock_drift`.
- `Sys_AuditLog.Source`: `runtime`, `studio`, `bridge`, `device`, `job`. `Action`: `I`, `U`, `D`, `BULK_I`, `BULK_U`, `LOGIN`, `LOGIN_FAIL`, `PWD_MIGRATE`, `PWD_CHANGE`, `PRINT`, `REPRINT`, `DRAWER`, `PAIR`, `REVOKE`, `CONFIG`, `ADMS_UNKNOWN`, `PUNCH_MANUAL`, `PERIOD_LOCK`, `PERIOD_UNLOCK`.

---

## 5. Wave 0 — prerequisites (Package F unless marked)

### W0-1 Hashed passwords with migration on login (تشفير كلمات المرور)

**Files (F)**
| Path | Change |
|---|---|
| `Backend/Controllers/AuthController.cs` | Add `POST api/auth/login` (body), `POST api/auth/refresh`, `POST api/auth/change-password`; keep `GET api/auth/login` behind `Auth:AllowLegacyGetLogin`. All SQL parameterised. |
| `Backend/Controllers/Auth/PasswordService.cs` (new) | Verify/migrate/lockout logic (below). |
| `Backend/Controllers/Auth/AuthModels.cs` (new) | `LoginRequest {Username, Password}`, `ChangePasswordRequest {OldPassword, NewPassword}`. |
| `Backend/Controllers/Jobs/Handlers/PasswordMigrateHandler.cs` (new, after W1-2) | Job `auth.hash.migrate`: hashes every remaining plain-text password in batches of 200. |
| `Backend/Program.cs` | Register `PasswordService`, `AddRateLimiter` policy `login` (10/min/IP), `UseRateLimiter()`. |
| `Frontend/App/app/ClientApp/Login/Login.ts` | `CallAPI_Login` uses `method:"POST"`; if the response is 404/405 (old backend) it retries once with GET. |
| `Database/Phase11_00_Security.sql` | Columns `USER_PasswordHash, PasswordMigratedAt, FailedLoginCount, LockoutUntil` (§9). |

**Login algorithm (`PasswordService.LoginAsync`)**
1. `SELECT TOP 1 * FROM Sys_Users WHERE USER_CODE = @u AND ISNULL(USER_ACTIVE,0) = 1` (parameter).
2. `LockoutUntil > now` → fail (generic message, same as wrong password).
3. If `USER_PasswordHash` is not empty → `VerifyHashedPassword`; `SuccessRehashNeeded` → rewrite hash.
4. Else if `Auth:AllowPlaintextFallback` and `USER_PASSWORD <> N''` and constant-time equal → success → in the same request: `USER_PasswordHash = hash, PasswordMigratedAt = now`, and if `Auth:ClearPlaintextOnMigrate` then `USER_PASSWORD = N''`. Audit `PWD_MIGRATE`.
5. Failure → `FailedLoginCount += 1`; at `Auth:LockoutThreshold` (5) set `LockoutUntil = now + Auth:LockoutMinutes` (15). Audit `LOGIN_FAIL` (user code only, never the password).
6. Success → `FailedLoginCount = 0, LockoutUntil = NULL`, token, unchanged response model `{ Token, Sys_Company, Sys_Branch, Sys_ControlYear }`. Audit `LOGIN`.

**API**
- `POST api/auth/login` body `{ "Username":"admin", "Password":"…" }` → `BaseResponse` string, `Response = { Token, Sys_Company[], Sys_Branch[], Sys_ControlYear[] }` (same as today).
- `POST api/auth/refresh` (JWT, not expired) → `{ Token }` new 5 h token; also updates `Sys_Users.Token`.
- `POST api/auth/change-password` (JWT) body `{ OldPassword, NewPassword }` → `{ ok:true }`; min length 6 (configurable `Auth:MinPasswordLength`).

**Config** `"Auth": { "AllowLegacyGetLogin": true, "AllowPlaintextFallback": true, "ClearPlaintextOnMigrate": false, "LockoutThreshold": 5, "LockoutMinutes": 15, "TokenHours": 5, "MinPasswordLength": 6 }`.
Rollout: week 1 defaults above → after confirming no other program reads `USER_PASSWORD`: `ClearPlaintextOnMigrate=true`, run job `auth.hash.migrate`, then `AllowPlaintextFallback=false`, `AllowLegacyGetLogin=false`.

**Security** password never logged; GET login disabled by config later (query strings land in IIS logs); rate limit per IP; lockout per user; generic error text.

**Tests** (`Tests/ERP.Tests`) `PasswordServiceTests`: hash user OK; plaintext user migrates (hash written, plaintext kept/cleared per flag); empty plaintext never authenticates; lockout after 5; rehash path; SQL injection string as username returns "not found". `Tools/Checks/Wave0_AuthCheck.ps1`: live login POST, GET (flag on/off), refresh.

**Acceptance** existing users log in unchanged; after first login `USER_PasswordHash` is set; login form shows the same messages; `GET` with `AllowLegacyGetLogin=false` returns 404; 6th wrong attempt within 15 min is refused.

### W0-2 Auth on the data API + sensitive-data guard (حماية واجهة البيانات)

**Files (F)**
| Path | Change |
|---|---|
| `Backend/Controllers/GateWay/Security/DataApiAuthFilter.cs` (new) | `IAsyncAuthorizationFilter`. Mode from `Security:DataApiAuth`. `Off`: nothing. `Audit`: if `!User.Identity.IsAuthenticated` → log one warning per (action, table, IP) per 10 min, continue. `Enforce`: return HTTP **401** (frontend already handles 401 in `SystemTools.handleUnauthorized`). Exception: `Query` on tables listed in `Security:AnonymousQueryTables`. |
| `Backend/Controllers/GateWay/Security/SensitiveDataGuard.cs` (new) | Static rules: **reads** of `Sys_Users`, `IQ_Sys_Users` drop columns `USER_PASSWORD, USER_PASSWORD2, USER_PasswordHash, Token` from every row; reads of `Sys_Devices` drop `TokenHash, SecretsEnc`. **Writes** (any ManageDataSQL write path) to `Sys_Users` reject those columns; writes to `Sys_AuditLog, Sys_DevicePairing, Sys_RuntimeKeys, Sys_PrintJobs, Sys_DeviceCommands, Sys_Devices, Att_RawPunch, Sys_DocSeriesCounter, Sys_RecordExtra` are rejected (they have dedicated APIs). Table name compared case-insensitively after trimming `[dbo].`/brackets. |
| `Backend/Controllers/GateWay/ManageDataSQLController.cs` | `[ServiceFilter(typeof(DataApiAuthFilter))]`; constructor DI; call `SensitiveDataGuard` in Query/GetDataFromSql (post-process rows) and in every write action (pre-check). `IsProc=true` queries are not filtered by table (procs are trusted server code). |
| `Backend/Program.cs` | Register filter + guard; config binding. |

**Config** `"Security": { "DataApiAuth": "Audit", "AnonymousQueryTables": [] }`. Rollout: `Audit` 1 week → read the log for anonymous callers (expected: none after login; `Register` uses `api/auth` only) → `Enforce`.

**Tests** filter modes (unit with fake `HttpContext`); guard strips columns; guard blocks writes; `Tools/Checks/Wave0_AuthCheck.ps1`: anonymous Query → 200 in Audit / 401 in Enforce; `WhereLiveCheck.ps1` re-run with a token (31/31 must still pass).

**Acceptance** all existing screens work logged in (QA_E2E list in `Database/QA_TestData.md`); `SQL.Select("Sys_Users")` returns no password/token columns; in `Enforce` an anonymous `curl` to `api/ManageDataSQL/Query` gets 401.

### W0-3 JWT hardening + sliding refresh
- `Program.cs`: key from configuration (`Jwt:Key`, overridable by env var `Jwt__Key`); log a **warning** at startup when the key is shorter than 32 bytes (no hard fail in Wave 0, so the current deploy keeps working). Owner sets a 32+ char key in the app pool environment (changing it logs everybody out once).
- `JwtService.GenerateToken_obj`: expiry from `Auth:TokenHours`, `DateTime.UtcNow`.
- JwtBearer `Events.OnMessageReceived`: read `access_token` query for paths starting with `/hubs/app`.
- Frontend `Shared/SystemTools.ts`: after `setAuthToken`, decode `exp` (no library, base64 JSON) and schedule `POST api/auth/refresh` 30 min before expiry while the tab is open; on failure do nothing (the existing 401 flow handles it).
- Tests: token with config expiry; refresh rejects expired token; frontend `tsc`.
- Acceptance: a POS tab left open 6 h stays logged in; Swagger still works.

### W0-4 Hosting readiness (owner actions, documented only)
Not executed by the implementers (no IIS/inetpub/Tailscale changes):
1. Enable the IIS **WebSocket Protocol** feature (else SignalR uses SSE/long polling — works, slower).
2. App pool: one worker process (no web garden) **or** add the Redis backplane later; `Start Mode = AlwaysRunning` and idle time-out 0 so jobs run at night. Without it, jobs catch up on the next request / bridge heartbeat (bridges send a heartbeat every 30 s, which keeps the site awake anyway).
3. Set `Jwt__Key` and `Runtime__PublicUrl` in the app pool environment.
4. ADMS clocks need to reach `/iclock/*` on the public URL. If the API is only reachable over a private network, use the bridge ADMS relay (W1-6b) instead.

### W0-5 Runtime settings + audit log base
`Phase11_00_Security.sql` creates `Sys_RuntimeSettings`, `Sys_AuditLog` (append-only trigger), `Sys_BumpConfigVersion`, `Sys_AuditPurge` (§9.1). `Backend/Controllers/Audit/AuditWriter.cs` (new): `WriteAsync(con?, tran?, AuditEntry)` used by W0-1 and later items. At startup the runtime upserts `Contract.Version`, `Runtime.PublicUrl`.

---

## 6. Wave 1 items

### W1-1 Realtime hub (التحديث اللحظي) — F

**Files**
| Path | Content |
|---|---|
| `Backend/Controllers/Realtime/AppHub.cs` | `[Authorize]` (JWT). On connect: add to `user:{UserID}`. `Subscribe(string channel, int compCode, int branchCode)`: verify membership (`Sys_RoleUsers WHERE UserID=@u AND CompCode=@c AND BranchCode=@b AND ISActive=1`), channel ∈ `print, devices, att, jobs` → add to `co:{c}:br:{b}:{channel}`. `Unsubscribe(...)`. |
| `Backend/Controllers/Realtime/DeviceHub.cs` | `[Authorize(AuthenticationSchemes="Device")]`, methods of §4.9. |
| `Backend/Controllers/Realtime/DeviceConnectionRegistry.cs` | `ConcurrentDictionary<int deviceId, string connectionId>`; on connect sets `IsOnline=1, LastSeenAtUtc`; on disconnect `IsOnline=0`. |
| `Backend/Controllers/Realtime/RealtimeNotifier.cs` | `NotifyUserAsync(userId, msg)`, `NotifyGroupAsync(comp, branch, channel, msg)`. |
| `Backend/Controllers/Realtime/RealtimeContracts.cs` | DTOs §4.9 + `RealtimeMessage`. |
| `Backend/Program.cs` | `AddSignalR()`, `MapHub<AppHub>("/hubs/app")`, `MapHub<DeviceHub>("/hubs/devices", o => o.ApplicationMaxBufferSize = 65536)`. |
| `Frontend/App/package.json` | `"@microsoft/signalr": "8.0.7"` |
| `Frontend/App/app/ClientApp/Shared/Realtime/realtime.ts` | Singleton `HubConnection` to `API_BASE_URL` origin + `/hubs/app`, `accessTokenFactory: getAuthToken`, `withAutomaticReconnect()`, lazy start on first subscribe, re-subscribe after reconnect. |
| `Frontend/App/app/ClientApp/Shared/Realtime/useRealtime.ts` | `useRealtime(channel, handler, { compCode, branchCode })` hook; unsubscribes on unmount. |

**Message envelope (server → browser, method `Notify`)**
```jsonc
{ "channel":"print", "type":"print.job", "compCode":1, "branchCode":5, "at":"2026-11-12T08:00:00Z",
  "data":{ "jobId":"…", "status":"printed", "printerName":"Till-2 Epson", "error":null } }
// other types: "device.status" {deviceId,name,isOnline} · "att.punch" {deviceId,deviceUserId,empId,punchLocal}
//              "job.run" {runId,jobCode,status}
```
**Security** JWT required; group join validated server-side; no client-to-client messages.
**Tests** hub auth (no token → 401 on negotiate); subscribe to a foreign branch → `HubException`; `Tools/Checks/Wave1_Smoke.ps1` connects with the .NET client.
**Acceptance** a print job status toast arrives within 1 s of the bridge report; works with WebSockets off (long polling).

### W1-2 Background jobs & scheduler (المهام المجدولة) — F (+ S page)

**Files (F)** `Backend/Controllers/Jobs/IJobHandler.cs` (`string JobType; Task<JobResult> RunAsync(JobContext, CancellationToken)`), `JobScheduler.cs` (`BackgroundService`), `JobStore.cs` (SQL), `Handlers/*.cs`: `AttMapHandler` (`att.map`), `AttProcessHandler` (`att.process`), `PrintExpireHandler` (`print.expire`), `DeviceOfflineSweepHandler` (`device.sweep`), `DeviceTimeSyncHandler` (`device.timesync`), `AuditPurgeHandler` (`audit.purge`), `PrintPurgeHandler` (`print.purge`), `PasswordMigrateHandler` (`auth.hash.migrate`). NuGet `Cronos` (MIT).

**Algorithm** every `Jobs:TickSeconds` (15):
1. For enabled jobs with `CronExpr` where `NextRunAtUtc <= now` (or NULL): insert `Sys_JobRuns(Status='queued', TriggeredBy='schedule')`, set `NextRunAtUtc` = next cron occurrence in `TimeZoneId` (Windows id; NULL = server local).
2. Claim: `UPDATE TOP (1) Sys_JobRuns WITH (READPAST, ROWLOCK) SET Status='running', StartedAtUtc=…, Host=… OUTPUT inserted.* WHERE Status='queued' ORDER BY RunId` (via CTE). Before running take `sp_getapplock @Resource='job:'+JobCode, @LockOwner='Session', @LockTimeout=0` on a dedicated connection; if not granted → set back to `queued`.
3. Run with `TimeoutSec`; write `succeeded/failed/timeout`, `Message`, `ResultJson`; notify channel `jobs`.
4. Missed runs while the site was down: only one catch-up run per job (not one per missed slot).

**Seeded jobs** (§9.2): `att.map` every minute (enabled), `att.process` `*/15 * * * *` (disabled until Studio enables), `print.expire` every minute, `device.sweep` every minute, `device.timesync` `0 3 * * *` (disabled), `audit.purge` `30 2 * * *`, `print.purge` `0 3 * * *`, `auth.hash.migrate` on-demand only.

**Security** Studio can only change schedule/params of seeded job codes and queue runs; handlers are code; `ParamsJson` validated per handler (unknown keys ignored, ranges checked).
**Tests** cron next-run; claim is exclusive (two schedulers on one DB → one run); timeout; catch-up rule.
**Acceptance** a run queued by Studio starts within 15 s; two app instances never run the same job at the same time.

### W1-3 ERP Device Bridge v1 — F (full spec §7)
Server side pieces (F, `Backend/Controllers/Devices/`):
| File | Content |
|---|---|
| `DeviceAuthenticationHandler.cs` | Scheme `Device` (§4.6). Claims: `device_id`, `comp`, `branch`, `kind`. Caches valid tokens 30 s. |
| `DevicesController.cs` | Endpoints below. Route `api/devices`. Action names: `Pair, JobPayload, UploadPunches, UploadLogs, Status`. |
| `PairingService.cs` | §4.5/§4.6; rate limit policy `pair` (10/min/IP). |
| `DeviceCommandDispatcher.cs` | `BackgroundService`, every 2 s: queued commands → hub / ADMS queue; expiry. Every 10 s: disconnect devices that are revoked/inactive (`Revoked` message then `Context.Abort()`). |
| `PrintJobDispatcher.cs` | Re-offers jobs on `Hello`; 30 s sweep for `sent` jobs not accepted within 60 s (re-offer). |
| `RuntimeKeyStore.cs` | §4.7 key creation/decrypt. |

**Endpoints (device APIs return plain JSON, not the BaseResponse string)**
- `POST api/devices/pair` (anonymous, rate-limited) `{ "code":"7KQ2-M9XD", "machineName":"BR5-TILL2", "agentVersion":"1.0.0", "osVersion":"…" }` → `200 { "deviceId":12, "deviceToken":"d1.12.<secret>", "hubUrl":"https://host/hubs/devices", "apiBaseUrl":"https://host/api/", "name":"Branch 5 bridge", "compCode":1, "branchCode":5 }`; bad/expired/used code → `400 { "error":"invalid_code" }`. Pairing an already paired device replaces its token (re-install).
- `GET api/devices/jobs/{jobId}/payload` (Device) → payload JSON (§7.6). Only the bridge the job was offered to; 410 when purged/expired.
- `POST api/devices/att/punches` (Device) `{ "attendanceDeviceId":31, "batchId":"guid", "deviceClockLocal":"2026-11-12T08:00:03", "records":[{"u":"105","t":"2026-11-12T08:55:03","s":0,"v":1,"w":"0"}] }` (≤ 1000 records) → `{ "ok":true, "inserted":12, "duplicates":988, "lastPunchLocal":"…" }`. The attendance device must belong to this bridge (`BridgeDeviceId`). `batchId` is logged for idempotency (re-sent batch → only duplicates).
- `POST api/devices/logs` (Device) text/plain ≤ 2 MB → stored under `Backend/App_Data/bridge-logs/{deviceId}/` (rotated, 7 days).
- `GET api/devices/Status?compCode=&branchCode=` (JWT) → BaseResponse `[ { deviceId, name, kind, isOnline, lastSeenAtUtc, agentVersion } ]`.

### W1-4 Printer routing + `printDocument` (توجيه الطابعات) — F (+ S page W1-8)

**Files (F)**
| Path | Content |
|---|---|
| `Backend/Controllers/Printing/PrintController.cs` | Route `api/print`. Actions `Resolve`, `CreateJob`, `JobInfo`, `Reprint`, `Retry`, `OpenDrawer`. |
| `Backend/Controllers/Printing/PrintService.cs` | Route resolve (calls `Sys_PrintRouteCandidates`), terminal auto-registration, job insert, offer, status handling, fallback child job, TTL. |
| `Backend/Controllers/Printing/PrintTemplateFiller.cs` | `{{Field}}` placeholders for `zpl`/`tspl` templates; ZPL: template must contain `^FH_` before data fields; values escaped `_`→`_5F`, `^`→`_5E`, `~`→`_7E`; TSPL: `"` → `\["]`. Max 64 KB output. |
| `Backend/Controllers/Common/PermissionChecker.cs` | `HasAsync(userId, module, comp, branch, flag)` — same SQL as `ReportsController.HasPrint` but any flag (`PRINT, VIEW, CUSTOM1..9, CREATE, EDIT, DELETE`). (ReportsController left untouched.) |
| `Frontend/App/app/ClientApp/Shared/Printing/PrintTypes.ts`, `PrintApi.ts`, `terminal.ts`, `printDocument.ts` | Client side. |
| `Frontend/App/app/ClientApp/Shared/Reports/renderHeadless.tsx` (new) | Renders `ReportDocument` for `{reportCode,row|filters}` or `{layout,data}` into a hidden container (createRoot), waits fonts/images (same rule as `printReport`), returns `{ html, widthMm, heightMm }`. |
| `Frontend/App/app/ClientApp/Shared/Reports/renderer/print.ts` | Extract the HTML string builder of `printReport` into exported `buildPrintableHtml(pagesHtml, o, { assetBase? })`; `printReport` calls it (no behaviour change). `assetBase="https://rf-assets.bridge/"` rewrites `/fonts/Cairo/Cairo.ttf` and drops `<base>`. Images that are not `data:` are converted to data URIs (≤ 512 KB each, else dropped with a warning). |
| `Shared/Components/Import/DynamicGrid.tsx`, `ModelGrid.ts`, `MasterDetail.tsx`, `ModelMasterDetail.ts` | Props §4.12. MasterDetail print precedence: `onPrint(row)` prop > `printDocKey` → `printDocument` > `report.transaction` → `openReport` > "coming soon" message. |
| `ClientApp/Sys_PrintLog/Sys_PrintLog.ts` + `page.tsx` | Runtime screen: DynamicGrid over `Sys_PrintJobs` (read-only, no payload column), extra actions "Reprint" (permission §4.8), "Retry". |

**`printDocument` flow (browser)**
```ts
printDocument(o: { docKey: string; moduleCode: string; reportCode?: string; row?: any;
  filters?: Record<string, any>; recordKey?: string | number; station?: string; copies?: number;
  isReprint?: boolean; silentIfNoRoute?: boolean }): Promise<{ mode: "bridge" | "viewer" | "none"; jobIds: string[] }>
```
1. `POST api/print/Resolve` `{ docKey, station, compCode, branchCode, terminalKey }` → `{ mode:"bridge"|"viewer", reason?, route:{ routeId, layoutCode, copies, autoPrintOnSave, openDrawer }, printer:{ printerId, name, kind, language, paperWidthMm, paperHeightMm, isOnline } }`.
2. `viewer` → `openReport({ reportCode, row|filters })` (unless `silentIfNoRoute` → `none`). Bridge offline also returns `viewer` with `reason:"bridge_offline"` for interactive prints.
3. `language ∈ {html, escpos-raster, zpl-raster}` → `renderHeadless({ reportCode: route.layoutCode ?? reportCode, row|filters })` → `buildPrintableHtml(..., { assetBase })`.
4. `POST api/print/CreateJob` → `{ mode:"bridge", jobs:[{ jobId, printerName, status:"sent" }] }`; toast on `print.job` realtime messages.

`CreateJob` request:
```jsonc
{ "docKey":"POS_Receipt", "moduleCode":"QA_E2E_POS", "reportCode":"QA_E2E_RECEIPT_80", "recordKey":"5512",
  "compCode":1, "branchCode":5, "terminalKey":"7c1e…", "routeId":4, "station":null, "copies":null, "isReprint":false,
  "payload": { "kind":"html", "html":"<!doctype html>…", "widthMm":80, "heightMm":null, "landscape":false }
  // or { "kind":"data", "fields":{ "ItemName":"…", "Barcode":"622…" } } for zpl / tspl template printers
}
```
Server checks: JWT; `PRINT` on `moduleCode` (reprint: `Print.ReprintPermission`); `routeId` is still a candidate for this scope; payload ≤ `Printing:MaxPayloadBytes` (4 MB); html must start with `<!doctype html>`; `kind` matches printer language. Inserts `Sys_PrintJobs` (`ExpiresAtUtc = now + route.TtlMin ?? (kind kitchen ? 15 : 60)` min), offers to `device:{bridgeId}`, audits `PRINT`/`REPRINT`.

Other endpoints: `GET api/print/JobInfo?jobId=` → status row; `POST api/print/Reprint {jobId}` (clones payload if not purged, else `410` → client calls `printDocument({isReprint:true})`); `POST api/print/Retry {jobId}` (failed/expired only); `POST api/print/OpenDrawer {terminalKey, reason}` → needs `CUSTOM1` on module `Sys_PrintLog`, test job `kind:"test", variant:"drawer"`, audit `DRAWER`.

**Bridge status → server**: `printed` / `failed` / `expired` update the row; on `failed` with `FallbackPrinterId` and no child yet → child job (`ParentJobId`) on the fallback printer, parent `Status='fallback'`, user notified. `print.expire` job marks `queued/sent/accepted` rows past `ExpiresAtUtc` as `expired`.

**Terminal identity** `terminal.ts`: `localStorage['erp_terminal_key']` = `crypto.randomUUID()` (fallback random). Server auto-creates `Sys_Devices(DeviceKind='terminal', Name='Terminal-'+first 4 chars, TerminalKey, CompCode, BranchCode)` on first Resolve; Studio renames it. Terminal identity only selects printers; it is not a security boundary.

**Kitchen stations** screens call `printDocument({ docKey:"KitchenTicket", station })` once per station with the lines of that station (`Sys_ItemStationMap` by item or category; helper `groupLinesByStation(lines, map)` in `Shared/Printing/stations.ts`).

**Tests** route vectors §4.11 against a test DB (`ERP_TEST_DB` env var; skipped when absent); template escaping; payload size/permission checks; `Wave1_Smoke.ps1`: resolve → create job → fake bridge (bridge console mode with `--fake-printer`) prints → status `printed`.
**Acceptance** SalesInvoice with no route opens today's viewer (no regression); POS receipt with a route prints silently on the till printer in < 3 s on LAN; unplugging the printer → 3 retries → fallback printer prints + toast; expired kitchen ticket is not printed after 15 min; reprint needs the configured permission and is audited.

### W1-5 Attendance hub (مركز الحضور) — F

**Files (F) `Backend/Controllers/Attendance/`**
| File | Content |
|---|---|
| `IclockController.cs` | `[AllowAnonymous] [Route("iclock")]`, actions `Cdata` (GET+POST `cdata`), `GetRequest` (GET `getrequest`), `DeviceCmd` (POST `devicecmd`). Reads raw body as text (max `Attendance:AdmsMaxBodyBytes` 1 MB); responds `text/plain`. Rate limit 120/min/IP. |
| `AdmsProtocol.cs` | Pure parser/formatter (testable): handshake response, ATTLOG lines, OPERLOG ignore-but-store, command text, devicecmd results. |
| `PunchIngestService.cs` | Bulk insert raw punches (TVP or `SqlBulkCopy` into `#p`, then `INSERT … SELECT … WHERE NOT EXISTS`), computes `PunchUtc` from device `TimeZoneId`, updates `LastPunchLocal/LastSyncAtUtc`, notifies `att.punch`, queues `att.map`. |
| `PunchMapper.cs` | `att.map`: raw rows `IsMapped=0` → employee via `Att_DeviceUserMap` (device-specific first, then global, by `ValidFrom/ValidTo`), else auto-match `DeviceUserId = EmpCode` when `Att_Settings.AutoMatchByCode=1`; insert `Att_Punch`; double-tap within `DoubleTapSec` → `IsIgnored=1, IgnoreReason='double-tap'`; unknown → `Att_Exception('unknown_user')` (one open row per device user). |
| `ShiftEngine.cs` | Pure function §4.14. |
| `RosterResolver.cs` | Shift for (emp, date): employee roster > branch roster > company roster (then `Priority`, latest `FromDate`); rotation `PatternJson`; `DefaultShiftId`; weekend days; holidays. |
| `AttProcessService.cs` | `att.process` (params `{ from, to, compCode, branchCode?, empIds? }`, default `daysBack` from settings): skips dates inside locked `Att_Period`; replaces `Att_DailySummary` rows and open exceptions of the range per employee in one transaction per employee. |
| `CsvPunchParser.cs` | Profile-driven CSV (delimiter, header, columns by name or 1-based index, date format, state map). |
| `AttendanceController.cs` | Route `api/att`: `ImportCsv`, `Process`, `RunInfo`, `ManualPunch`, `ApproveManualPunch`, `ResolveException`. |

**ADMS behaviour** (verify against a real clock; keep `RawPayload`)
- `GET /iclock/cdata?SN=…&options=all` → unknown/inactive SN: `OK` + audit `ADMS_UNKNOWN` (max once per SN per hour), nothing stored. Known SN → text:
  `GET OPTION FROM: {SN}\nATTLOGStamp={stamp}\nOPERLOGStamp=9999\nATTPHOTOStamp=None\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:05\nTransInterval=1\nTransFlag=TransData AttLog\nTimeZone={offsetHours}\nRealtime=1\nEncrypt=None\n` (stamp from `SyncStateJson`, else `None`).
- `POST /iclock/cdata?SN=…&table=ATTLOG&Stamp=…` → lines `PIN\tYYYY-MM-DD HH:MM:SS\tStatus\tVerify\tWorkcode…` → raw rows `Source='push'` → `OK: {lineCount}`. `OPERLOG` and other tables → `OK: n` (stored only in log file).
- `GET /iclock/getrequest?SN=…` → `OK` or pending commands, one per line `C:{CommandId}:{text}`; commands set `sent`. Text: `att.user.upsert` → `DATA UPDATE USERINFO PIN={pin}\tName={name}\tPri=0`; `att.user.delete` → `DATA DELETE USERINFO PIN={pin}`; `att.reboot` → `REBOOT`.
- `POST /iclock/devicecmd?SN=…` body lines `ID={id}&Return={code}&CMD={cmd}` → command `done` (Return 0) / `failed`.
- Optional per-device IP allow-list in `SettingsJson.allowedIps`. Each request updates `LastSeenAtUtc`.

**Runtime API (JWT, BaseResponse)**
- `POST api/att/ImportCsv` multipart `file`, `profileCode`, `deviceId`, `dryRun` → `{ rows, inserted, duplicates, errors:[{ line, message }] }` (≤ 10 MB, ≤ 200k rows). Permission `CREATE` on `Att_Import`.
- `POST api/att/Process` `{ compCode, branchCode?, from, to, empIds? }` → `{ runId }` (queues `att.process`). Permission `CUSTOM1` on `Att_Daily`.
- `GET api/att/RunInfo?runId=` → run row.
- `POST api/att/ManualPunch` `{ empId, punchLocal, direction:"I"|"O", reason }` → `{ punchId }` (`ApprovalStatus='pending'`). `CREATE` on `Att_ManualPunch`.
- `POST api/att/ApproveManualPunch` `{ punchId, approve:true|false }` → `CUSTOM1` on `Att_ManualPunch`; audit `PUNCH_MANUAL`.
- `POST api/att/ResolveException` `{ exceptionId, action:"map"|"ignore", empId? }` → map creates `Att_DeviceUserMap` (global) and re-queues `att.map`. `EDIT` on `Att_Exceptions`.

**Runtime screens (F, `ClientApp/<Name>/<Name>.ts` + `page.tsx`, registered by `Phase11_08_Modules.sql`, added to `Routes.tsx` and `Resources.ts`)**
| MODULE_CODE | Screen |
|---|---|
| `Att_Daily` | DynamicGrid over `IQ_Att_DailySummary` (filters date range, branch, status), action "Recalculate" |
| `Att_Exceptions` | DynamicGrid over `IQ_Att_Exception` (open), actions "Map to employee", "Ignore" |
| `Att_ManualPunch` | DynamicGrid over `IQ_Att_Punch` where `IsManual=1`, add + approve/reject |
| `Att_Import` | CSV upload with profile select, dry run preview table, import |
| `Sys_PrintLog` | W1-4 |

**Tests** `AdmsProtocolTests` (handshake text, ATTLOG parse incl. bad lines, devicecmd parse); `CsvPunchParserTests`; `ShiftEngineTests` (V1–V7); `RosterResolverTests` (rotation, priority, holiday); `PunchMapperTests` (validity dates, double-tap); `ERP_DeviceBridge/tools/FakeAdmsDevice` replays a captured session; integration: re-sending the same ATTLOG twice inserts once.
**Acceptance** a ZKTeco clock with ADMS pointed at the server shows punches in `Att_Daily` within 1 min; CSV import twice = no duplicates; locked period is never recalculated; V1–V7 match.

### W1-6 ZKTeco TCP pull via bridge (+ W1-6b optional ADMS relay) — F
Bridge worker spec in §7.8. Server side = `UploadPunches` (W1-3) + commands §4.10.
**W1-6b (optional, do when a site's clocks cannot reach the server):** the bridge hosts a local HTTP listener (`http://0.0.0.0:{port}/iclock/*`, Kestrel, default port 8088, off by default) and forwards each request body + query to `POST api/devices/AdmsRelay` (Device auth) which calls the same `AdmsProtocol` handler and returns the text the clock expects. The SN must belong to an attendance device whose `BridgeDeviceId` = this bridge.

### W1-7 Shift engine basics — F (see W1-5 `ShiftEngine.cs`, `RosterResolver.cs`, `AttProcessService.cs`); designer is S (W1-8 attendance page).

### W1-8 Studio pages: Devices · Printers & Routing · Attendance (+ shift designer) — S (spec §8)

### W1-9 Document numbering designer (مصمم ترقيم المستندات) — F runtime + S designer
**F files** `Backend/Controllers/Numbering/NumberingService.cs`, `NumberingController.cs` (route `api/numbering`, actions `Next`, `Preview`), hook in `ManageDataSQLController` (§6.12). DB `Phase11_05_Numbering.sql`.
- Binding hook: on `Insert`, `insert-list`, `InsertMasterDetail` (master table, and detail tables if bound): for each active `Sys_DocSeriesBinding` row of the table, if the column is missing, NULL, empty, `0` or `"AUTO"` (or `OverwriteClientValue=1`) → `EXEC Sys_NextDocNo` **with the same connection and transaction**, taking `@CompCode`/`@BranchCode`/`@DocDate` from the bound columns of the row. The returned row (InsertedRow) carries the number.
- `POST api/numbering/Next` `{ docKey, compCode, branchCode, terminalKey?, docDate?, finYear? }` → `{ docNo, seqNo, seriesId }` (for screens that must show the number before saving). Refused for `IsGapless=1` series (`409 gapless_series`). Permission: any logged-in member of comp/branch.
- `GET api/numbering/Preview?docKey=&compCode=&branchCode=` → `{ nextDocNo }` (formats `LastNo+Step` without consuming).
- Do **not** bind tables whose number is set by `G_ProcessTrans`.
**Tests** pattern vectors §4.13 via `Sys_FormatDocNo`; 50 parallel inserts → 50 distinct consecutive numbers; rollback leaves no gap; yearly reset.
**Acceptance** two cashiers saving at the same time never get the same number; deleting a series in use is refused.

### W1-10 Custom fields without schema changes (حقول إضافية) — F runtime + S designer
**F files** `Backend/Controllers/CustomFields/CustomFieldService.cs`, `CustomFieldsController.cs` (route `api/meta`, action `CustomFields`); hooks in `ManageDataSQLController`; `TableModel` gets `public bool IncludeExtra { get; set; } = false;` (`SharedModel.cs`). Frontend: `Shared/CustomFields/CustomFieldTypes.ts`, `useCustomFields.ts`, `customFieldColumns.ts` (columns named `cf_<FieldCode>`, built inside the grid's `useMemo`), `CustomFieldInput.tsx`; `CallDataBase.ts` passes `IncludeExtra`; `DynamicGrid`/`MasterDetail` prop `customFieldsEntity`; `Validation.ts` rules generated from defs (required, min/max, maxLength, regex).
- `GET api/meta/CustomFields?entity=Customers&compCode=1` → `{ entity:{ entityCode, tableName, keyColumn, moduleCode }, fields:[{ fieldCode, labelA, labelE, fieldType, isRequired, maxLength, minValue, maxValue, regex, options:[{v,a,e}], lookup:{table,value,label}, defaultValue, showInGrid, showInForm, isReadOnly, sortOrder, groupName }] }` (active defs for `CompCode IS NULL OR CompCode=@c`).
- Write: `Data` may contain `"__extra": { "CarPlate":"ABC 123", "VIP":true }`. The controller removes `__extra` from the dictionary **before** the insert/update (so old tables never see it), validates against defs (unknown code → 400, type coercion, required only on insert), and upserts `Sys_RecordExtra` in the same transaction (merge: keys present overwrite, `null` removes). Record key = `InsertedId` or the `KeyColumn` value.
- Read: `IncludeExtra=true` → after the page is loaded, one query `SELECT RecordKey, ExtraJson FROM Sys_RecordExtra WHERE EntityCode=@e AND RecordKey IN (…)` (≤ page size) and each row gets `"__extra":{…}`. Entity is found by `NameTable` = `TableName` or `ViewName`.
- Lookup fields: table must exist; label/value columns validated against `sys.columns`; options loaded through the normal Query API (so the auth filter applies).
- Filtering/sorting by custom fields: Wave 2.
**Tests** split/merge; validation; no `__extra` → identical SQL to today; master-detail master extras.
**Acceptance** admin adds "Car plate" in Studio → visible in the Customers grid/form after reload, saved and read back, no ALTER TABLE run.

### W1-11 Audit trail & record history (سجل التعديلات) — F runtime + S policy page
**F files** `Backend/Controllers/Audit/AuditService.cs` (policy cache, capture), `AuditWriter.cs` (W0-5), `AuditController.cs` (route `api/audit`, action `History`); `Shared/Audit/AuditApi.ts`, `RecordHistory.tsx` (modal list: time, user, action, field → old → new); `enableHistory` prop.
- Capture (only tables in `Sys_AuditPolicy` with `IsEnabled=1`): Update/Delete load old rows first (`SELECT * … WHERE key IN (…)` same transaction); Insert uses `InsertedRow`; Update diff = provided fields whose value changed; never store `ExcludeColumns` or the sensitive columns of W0-2; strings > 1000 chars truncated. Written inside the save transaction after `SAVE TRANSACTION audit_sp`; on audit error roll back to the savepoint and log (unless `Audit:FailClosed=true`). `bulk-*` → one summary row (`BULK_I`/`BULK_U`, count).
- `POST api/audit/History` `{ moduleCode, tableName, recordKey, compCode, branchCode, page, pageSize }` → `{ rows:[{ auditId, atUtc, action, userCode, source, changes:[{ f, o, n }] }], total }`. Allowed when the user has `VIEW` on `moduleCode` **and** `Sys_AuditPolicy.ModuleCode = moduleCode` for that table (or the user's role `IsAdmin=1`).
- `audit.purge` job: `EXEC Sys_AuditPurge @RetentionDays` (sets `SESSION_CONTEXT('audit_purge')=1`).
**Tests** diff; exclusions; savepoint behaviour (forced audit failure keeps the save); trigger blocks UPDATE/DELETE; purge only older rows.
**Acceptance** editing a price on an audited table shows "Price 10 → 12 by user X at time" in History; audit table cannot be edited with plain SQL.

### 6.12 `ManageDataSQLController` change summary (hot path, F)
Constructor DI: `SensitiveDataGuard`, `AuditService`, `CustomFieldService`, `NumberingService`, `ILogger`. Pipeline per write (inside the existing `ExecuteTransaction` lambda, using `InsertAutoWithResult` / `UpdateAutoWithResult` / `DeleteList` which already take `(con, tran)`):
`guard.CheckWrite → extra = customFields.Split(dict) → numbering.Fill(con,tran,table,dict) → old = audit.LoadOld(con,tran,…) → existing call → customFields.Save(con,tran,…) → audit.Capture(con,tran,…)`.
Each step is a no-op (no SQL) when its cached config has no row for the table. Response shapes are unchanged. Feature flags `Features:CustomFields`, `Features:Numbering`, `Audit:Enabled` switch steps off. Regression gate: `WhereLiveCheck.ps1` 31/31, all `QA_E2E_*` screens save/load, SalesInvoice master-detail save/print.

---

## 7. ERP Device Bridge v1 (جسر الأجهزة) — Package F, `C:\PC\Work\ERP_DeviceBridge`

### 7.1 Solution structure
```
ERP_DeviceBridge/
├─ ERP_DeviceBridge.sln
├─ README.md                      (install, pair, troubleshoot — Egyptian Arabic + English commands)
├─ src/
│  ├─ Bridge.Core/                net9.0-windows class library
│  │  ├─ Contracts/               HelloDto, BridgeConfig, PrinterDto, JobEnvelope, JobStatusDto, CommandEnvelope, CommandResultDto, PunchBatch (§4.9)
│  │  ├─ Config/BridgePaths.cs, BridgeSettings.cs        (%ProgramData%\ERP_DeviceBridge\…)
│  │  ├─ Security/DpapiSecretStore.cs                    (ProtectedData LocalMachine + fixed entropy)
│  │  ├─ Queue/BridgeDb.cs, JobRepository.cs, OutboxRepository.cs, PunchRepository.cs, KvRepository.cs
│  │  ├─ Printing/
│  │  │   ├─ RawPrinter.cs          winspool OpenPrinter/StartDocPrinter("RAW")/WritePrinter/EndDocPrinter/ClosePrinter
│  │  │   ├─ PrinterStatus.cs       GetPrinter level 2 status bits (offline, paper out, error)
│  │  │   ├─ Tcp9100Transport.cs    connect 3 s timeout, write, graceful close
│  │  │   ├─ EscPosBuilder.cs       init, raster GS v 0, cut GS V, drawer ESC p, feed
│  │  │   ├─ RasterConverter.cs     PNG → gray → scale to dotsWidth → Floyd–Steinberg/threshold → 1-bit rows
│  │  │   ├─ ZplBuilder.cs          ^GFA from 1-bit image, ^PQ copies
│  │  │   ├─ InstalledPrinters.cs   EnumPrinters
│  │  │   └─ LanScanner.cs          /24 TCP 9100 probe, 200 ms, 64 parallel
│  │  ├─ Rendering/IHtmlRenderer.cs, RendererProcessClient.cs (starts Bridge.Renderer.exe, JSON over stdin/stdout)
│  │  ├─ Jobs/JobProcessor.cs      per-printer serial queue, retries, TTL, watermark injection
│  │  └─ Attendance/ZkTeco/        ZkTcpClient.cs, ZkPacket.cs, ZkCommands.cs, ZkTime.cs, ZkRecordParser.cs, ZkCommKey.cs
│  ├─ Bridge.Service/             net9.0-windows Worker, exe name ErpDeviceBridge.exe
│  │  ├─ Program.cs               UseWindowsService(); CLI verbs (§7.10)
│  │  ├─ HubWorker.cs             SignalR client, Hello/Heartbeat, handlers
│  │  ├─ JobWorker.cs, OutboxWorker.cs, AttendancePullWorker.cs, CommandHandlers.cs, PayloadClient.cs
│  │  └─ appsettings.json         log level only (no secrets)
│  └─ Bridge.Renderer/            net9.0-windows WinForms exe (hidden), Microsoft.Web.WebView2
│     └─ Program.cs               actions print-html, render-png
├─ assets/fonts/Cairo/Cairo.ttf  (SIL OFL), assets/testpage.html, assets/testpage.zpl
├─ installer/install.ps1, uninstall.ps1, upgrade.ps1
├─ tests/Bridge.Tests/            xUnit
└─ tools/FakeZkDevice/ (TCP 4370 simulator), tools/FakeAdmsDevice/ (HTTP ADMS client replay)
```
NuGet (all permissive): `Microsoft.Extensions.Hosting.WindowsServices`, `Microsoft.AspNetCore.SignalR.Client`, `Microsoft.Data.Sqlite`, `Microsoft.Web.WebView2`, `System.Drawing.Common`, `Serilog.Extensions.Hosting` + `Serilog.Sinks.File` (Apache-2.0), `xunit`. No ESC-POS-.NET dependency (own 5-command builder). Publish: `dotnet publish -c Release -r win-x64 --self-contained true` (no .NET install on branch PCs). Requires WebView2 Evergreen runtime (present on Windows 11 and most Windows 10; installer checks and prints the free download link).

### 7.2 Files on the PC
`C:\Program Files\ERP_DeviceBridge\` (binaries, assets) · `%ProgramData%\ERP_DeviceBridge\bridge.json` (`serverUrl, apiBaseUrl, hubUrl, deviceId, logLevel`) · `secret.bin` (DPAPI, ACL: service SID + Administrators) · `queue.db` · `payloads\` · `webview2\` (user data folder) · `logs\bridge-YYYYMMDD.log` (14 days).

### 7.3 Pairing flow
1. Studio: "Add bridge" → inserts `Sys_Devices(kind bridge, comp, branch, name)` + `Sys_DevicePairing(CodeHash, ExpiresAtUtc = now+10 min)` → shows `XXXX-XXXX` and the command line: `powershell -ExecutionPolicy Bypass -File install.ps1 -Server https://<Runtime.PublicUrl> -Code XXXX-XXXX`.
2. `install.ps1` (admin) copies files, creates the service, then runs `ErpDeviceBridge.exe pair --server … --code …`.
3. `pair` → `POST api/devices/pair` → receives `deviceToken` → `secret.bin` (DPAPI) + `bridge.json`.
4. Service starts → connects `/hubs/devices` with the token → `Hello` → `BridgeConfig`; Studio sees the green dot (`IsOnline`).
5. Rotate = new pairing code for the same device + `pair` again. Revoke = Studio sets `TokenHash NULL, IsActive 0` → runtime sends `Revoked` within 15 s, later connects get 401; the bridge stops retrying for 1 h, logs "revoked — pair again".

### 7.4 SignalR client
`HubConnectionBuilder().WithUrl(hubUrl, o => o.AccessTokenProvider = () => token).WithAutomaticReconnect(new[]{0,2,5,10,30,60 s… capped 60 s}).Build()`; after the built-in policy gives up, a loop restarts every 60 s forever. Handlers `JobOffer`, `Command`, `ConfigChanged`, `Revoked`. Heartbeat timer `heartbeatSec`. TLS validation default (no custom bypass; a dev flag `--insecure-dev` only in Debug builds).

### 7.5 SQLite queue (`queue.db`, WAL mode)
```sql
CREATE TABLE IF NOT EXISTS jobs (job_id TEXT PRIMARY KEY, envelope_json TEXT NOT NULL, payload_path TEXT,
  status TEXT NOT NULL,              -- received|downloaded|printing|printed|failed|expired|uncertain
  attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT, expires_at TEXT NOT NULL,
  last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, -- job_status|command_result|job_accepted
  body TEXT NOT NULL, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS punches (device_id INTEGER NOT NULL, device_user_id TEXT NOT NULL, punch_local TEXT NOT NULL,
  state INTEGER NOT NULL, verify INTEGER, work_code TEXT, uploaded INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, device_user_id, punch_local, state));
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
```
- `JobOffer` → `INSERT OR IGNORE` → `JobAccepted` → download payload (sha256 check) → process.
- Status flips to `printing` **before** writing to the printer and `printed` right after success. On service start, rows left in `printing` become `uncertain` and are reported as `failed` with `uncertain:true` (never auto-reprinted → no duplicate receipts; the operator reprints from `Sys_PrintLog`).
- Outbox survives restarts; sent in order when connected; rows deleted after the hub call returns.
- Punches: uploaded in batches of 500; rows kept 30 days for re-upload/debug.

### 7.6 Print pipelines
Payload JSON (from `GET api/devices/jobs/{id}/payload`):
`{ "kind":"html", "html":"…", "widthMm":80, "heightMm":null, "landscape":false }` · `{ "kind":"raw", "language":"zpl", "dataBase64":"…" }` · `{ "kind":"test", "variant":"default"|"drawer" }`.

| Printer language | Steps |
|---|---|
| `html` (A4/A5) | Renderer `print-html`: WebView2 `NavigateToString` (assets mapped with `SetVirtualHostNameToFolderMapping("rf-assets.bridge", assets)`), wait `document.fonts.ready`, `PrintAsync(CoreWebView2PrintSettings{ PrinterName, Copies=1, PageWidth/Height (inches), margins 0, ShouldPrintBackgrounds=true, ShouldPrintHeaderAndFooter=false, Orientation })` once per copy (copy 2..n get the watermark). |
| `escpos-raster` (80/58 mm, Arabic safe) | Renderer `render-png` via DevTools `Page.captureScreenshot { format:"png", captureBeyondViewport:true, clip:{x:0,y:0,width:W,height:H,scale:dpi/96} }` with viewport width = paper width in CSS px → `RasterConverter` scale to `dotsWidth` (576 for 80 mm, 384 for 58 mm unless set) → Floyd–Steinberg (option `threshold`) → bytes: `ESC @` → [`ESC p m t1 t2` when `openDrawer`] → `GS v 0 0 xL xH yL yH data` in bands of ≤ 256 rows → feed 4 lines → cut (`GS V 66 0` partial / `GS V 65 0` full / none). Drawer timing `t1 = drawerOnMs/2`, `t2 = drawerOffMs/2` (Epson units of 2 ms, verify per model), `m = drawerPin` (0 = pin 2, 1 = pin 5). |
| `zpl-raster` (labels with Arabic) | Same PNG → 1-bit → `^XA^PW{dots}^LL{rows}^FO0,0^GFA,{total},{total},{bytesPerRow},{hex}^FS^PQ{copies}^XZ`. |
| `zpl` / `tspl` | `raw` payload from the server template filler → written as is, `copies` times (ZPL also allows `^PQ` in the template). |
| `test` | Built-in `testpage.html` (Arabic + English text, Code128 + QR as inline SVG) through the printer's pipeline; `testpage.zpl` for `zpl`; `drawer` = drawer kick only. |

Watermark (`copyWatermark`): copies 2..n of html-based jobs get `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font:700 28pt Cairo;opacity:.18;transform:rotate(-30deg)">نسخة / COPY</div>` injected before `</body>`.
Transports: `spooler` → `RawPrinter.Send(target, bytes, docName="ERP "+jobId)` for raw/raster; html uses the WebView2 print path. `tcp9100` → `Tcp9100Transport.Send(host:port, bytes)`; html on tcp9100 is invalid (Studio blocks it).
Retries: 3 attempts, backoff 2 s / 5 s / 15 s, then `failed` (server does fallback). TTL checked before each attempt.

**Renderer process contract** `ErpDeviceBridge.Renderer.exe` reads one JSON request from stdin, writes one JSON result to stdout, exits:
`{ "action":"print-html", "htmlPath":"…", "printerName":"…", "widthMm":210, "heightMm":297, "landscape":false }` → `{ "ok":true, "status":"Succeeded" }`; `{ "action":"render-png", "htmlPath":"…", "widthMm":80, "dpi":203 }` → `{ "ok":true, "pngPath":"…", "widthPx":576, "heightPx":1400 }`. Timeout 30 s (killed). One renderer at a time (semaphore).
**Session-0 spike (first task of F3):** prove WebView2 printing + capture works when launched from the service account. If it fails, switch `IHtmlRenderer` to the **user-session helper**: the same exe started at user logon (HKLM `Run` key, `--agent`) listening on named pipe `\\.\pipe\ErpDeviceBridge.Render` (ACL: service SID only). Raw/ESC/POS/ZPL paths do not depend on it.

### 7.7 Printer discovery and status
`printers.discover`: `EnumPrinters(PRINTER_ENUM_LOCAL|PRINTER_ENUM_CONNECTIONS)` + optional LAN scan. Note in README: printers must be installed **for all users** (local/TCP-IP port); per-user `\\server\printer` connections are invisible to the service → use `tcp9100`. `Heartbeat.printers[].state` from `GetPrinter` level 2 (`PRINTER_STATUS_OFFLINE`, `PAPER_OUT`, `ERROR`) when the driver reports it, else `unknown`.

### 7.8 ZKTeco TCP 4370 client (clean-room from MIT/public protocol notes: openzk reference, zk-protocol doc; do **not** copy GPL pyzk code)
- Framing (TCP): `50 50 82 7D` + `uint32 LE length` + payload; payload = `cmd u16 | checksum u16 | session u16 | reply u16 | data`. Checksum = one's complement of the 16-bit sum over the payload with checksum field = 0.
- Commands used: `CONNECT 1000`, `EXIT 1001`, `ENABLEDEVICE 1002`, `DISABLEDEVICE 1003`, `AUTH 1102` (comm key), `GET_VERSION 1100`, `OPTIONS_RRQ 11` (`~SerialNumber`, `~Platform`), `GET_FREE_SIZES 50` (user/log counts), `GET_TIME 201`, `SET_TIME 202`, `PREPARE_BUFFER 1503` + `READ_BUFFER 1504` + `FREE_DATA 1502` for large reads, `ATTLOG_RRQ 13`, `USERTEMP_RRQ 9` (users), replies `ACK_OK 2000`, `ACK_ERROR 2001`, `ACK_DATA 2002`, `ACK_UNAUTH 2005`, `PREPARE_DATA 1500`, `DATA 1501`. Verify each value on a real device.
- Time decode: `t` u32 → `second = t%60; t/=60; minute = t%60; t/=60; hour = t%24; t/=24; day = t%31+1; t/=31; month = t%12+1; t/=12; year = t+2000`. Encode is the inverse.
- Attendance record sizes 8 / 16 / 40 bytes (record size = data length / log count); 40-byte layout `uid u16 | user_id char[24] | status u8 | time u32 | punch u8 | reserved[8]`.
- Comm key: the device's `AUTH` reply to `CONNECT` asks for a key derived from (comm key, session id); implement from the protocol notes with test vectors captured from a real device (`tools/FakeZkDevice` replays them).
- Pull worker per device: every `pullIntervalMin` (default 10): connect → `DISABLEDEVICE` → read all logs → `ENABLEDEVICE` → `EXIT`; keep records with `punch_local > lastPunchLocal − 10 min`; insert into local `punches`; upload. Read device time → `ClockDriftSec`; if `|drift| > 120` and `autoSetTime` → `SET_TIME` with the bridge's local time (bridge PC must use NTP). Errors → `LastError` via heartbeat; exponential backoff to 30 min. Clearing device logs is **not** done in v1. UDP-only devices: not supported (use ADMS or CSV).
- Large logs: a full read of 100k records ≈ 4 MB per pull; README recommends 10–15 min interval or ADMS; realtime events (`REG_EVENT`) are Wave 2.

### 7.9 Installer (`installer/install.ps1`, no paid tools)
```powershell
param([Parameter(Mandatory)][string]$Server, [Parameter(Mandatory)][string]$Code,
      [string]$InstallDir = "$env:ProgramFiles\ERP_DeviceBridge", [switch]$UseLocalSystem)
# 1. require admin; check WebView2 runtime (HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5})
# 2. copy files; create %ProgramData%\ERP_DeviceBridge
# 3. sc.exe create ErpDeviceBridge binPath= "`"$InstallDir\ErpDeviceBridge.exe`"" start= delayed-auto DisplayName= "ERP Device Bridge"
#    + obj= "NT SERVICE\ErpDeviceBridge" (virtual account; -UseLocalSystem falls back to LocalSystem)
# 4. sc.exe description ErpDeviceBridge "ERP printing and attendance bridge"
#    sc.exe failure ErpDeviceBridge reset= 86400 actions= restart/5000/restart/5000/restart/60000 ; sc.exe failureflag ErpDeviceBridge 1
# 5. icacls "%ProgramData%\ERP_DeviceBridge" /grant "NT SERVICE\ErpDeviceBridge:(OI)(CI)M"
# 6. & "$InstallDir\ErpDeviceBridge.exe" pair --server $Server --code $Code   (fails → stop, service not started)
# 7. sc.exe start ErpDeviceBridge ; & ErpDeviceBridge.exe status
```
`uninstall.ps1` (`sc.exe stop`, `sc.exe delete`, `-KeepData` default on). `upgrade.ps1` (stop, copy, start; queue kept). Releases are a zip + `SHA256SUMS.txt`; code signing and auto-update are Wave 2 (no paid certificate now). Virtual account with `sc.exe` must be verified on Windows 10 19045; fallback `-UseLocalSystem`.

### 7.10 CLI verbs (`ErpDeviceBridge.exe`)
`pair --server URL --code CODE` · `unpair` · `status` (paired?, connected?, queue depth, last error) · `console` (run in foreground) · `printers` · `test-print --printer NAME --lang escpos-raster|html|zpl [--drawer]` · `zk-test --host IP [--port 4370] [--key 0]` · `--fake-printer` (console mode: writes jobs to `payloads\fake\` instead of printing; used by smoke tests).

### 7.11 Bridge security
Outbound only (no listening port unless W1-6b relay is enabled). Accepts only known job/command types; no file paths, no shell commands, no arbitrary URLs (payload URL must be on `apiBaseUrl` host). Secret in DPAPI; logs never contain the token or comm keys. Service runs as a virtual account.

### 7.12 Bridge tests
`EscPosBuilderTests` (golden bytes for init/cut/drawer/raster header), `RasterConverterTests` (golden 1-bit output for a fixed PNG), `ZplBuilderTests` (^GFA sizes), `ZkPacketTests` (checksum, framing), `ZkTimeTests` (encode/decode round trip, known values), `ZkRecordParserTests` (8/16/40-byte samples), `JobRepositoryTests` (idempotent offer, uncertain on restart), `OutboxTests`. Manual matrix (`README`): Epson TM-T20 (USB, spooler), Xprinter 80 mm (TCP 9100), Zebra GK420 (ZPL), A4 laser, ZKTeco K40/MB360 (TCP + ADMS).

---

## 8. ERP Studio — Package S

### 8.1 Migrations
`Database/Migrations/005_Wave1_Permissions.sql` and `006_Wave1_RuntimeConfig.sql` — full DDL in §9.9 (idempotent, `USE [ERP_Studio]`, same style as 001–004; `RunMigrations.ps1` picks them up by name order).

### 8.2 Backend files
| Path | Content |
|---|---|
| `Studio.Domain/Permissions.cs` | Constants `RuntimeView="runtime.view"`, `DeviceManage="device.manage"`, `DevicePair="device.pair"`, `PrintManage="print.manage"`, `AttendanceManage="attendance.manage"`, `AttendanceProcess="attendance.process"`, `AttendanceLock="attendance.lock"`, `NumberingManage="numbering.manage"`, `CustomFieldsManage="customfields.manage"`, `JobsManage="jobs.manage"`, `AuditManage="audit.manage"`. |
| `Studio.Domain/Runtime/RuntimeRows.cs` | Row classes for every §9 table Studio touches. |
| `Studio.Application/Runtime/RuntimeConfigTables.cs` | §4.1 as code: table → area, allowed ops, Studio columns. Single source used by the guard and tests. |
| `Studio.Application/Runtime/PairingCode.cs` | §4.5 generate/normalize/hash. |
| `Studio.Application/Runtime/DocNoFormatter.cs` + `PatternValidator.cs` | §4.13. |
| `Studio.Application/Runtime/CronValidator.cs` | Cronos (MIT) parse, next 5 occurrences for the UI. |
| `Studio.Application/Runtime/RuntimeValidators.cs` | Shift (times, windows ≥ 0, grace < shift length), route (printer exists/active; html printer not on tcp9100; `BranchCode` needs `CompCode`; copies 1–10), device (vendor fields; ADMS `SerialNo` required; zk-tcp host/port + bridge required), custom field (code regex, type options), settings (identifier regex `^[A-Za-z_][A-Za-z0-9_]{0,127}$` + exists in `sys.columns` of the employee source). |
| `Studio.Application/Abstractions.cs` | `IRuntimeConfigGateway`, `IRuntimeSecretSealer`. |
| `Studio.Infrastructure/TargetDb/RuntimeConfigGateway.cs` | Fixed Dapper SQL per table (CRUD with RowVer, reads, `Sys_PrintRouteCandidates`, `Sys_FormatDocNo`, command insert/poll, job-run insert, schema/contract checks). One transaction per save + `Sys_BumpConfigVersion` + `Sys_AuditLog` insert. |
| `Studio.Infrastructure/Security/RuntimeSecretSealer.cs` | §4.7 (`RSA.ImportFromPem`, `Encrypt(…, RSAEncryptionPadding.OaepSHA256)`). |
| `Studio.Infrastructure/DependencyInjection.cs` | Register the above. |
| `Studio.Api/Services/RuntimeWriteGuard.cs` | For every write: (1) permission (project-scoped), (2) `ProjectEnvironment.IsReadOnly = 0` (default is 1 → message "make the environment writable first"), (3) `Schema.Phase11` present and `Contract.Version = wave1-v1`, (4) `ObjectAllowList.IsAllowed("dbo", table, "U", DbCapability.SaveTo)`, (5) table/op/columns ∈ `RuntimeConfigTables`, (6) write `studio.RuntimeConfigChange` + `IAuditLogger` (`runtime.config.<area>`). Reads need `DbCapability.See`. Secrets replaced by `***` in logs. |
| `Studio.Api/Controllers/Runtime/RuntimeStatusController.cs` … `RuntimeAuditController.cs` | §8.3, route prefix `api/projects/{projectId:int}/runtime`, `?envId=` optional (default env), rate limit `metadata`. |
| `Studio.Api/Controllers/AccessController.cs` | `POST db-grants/presets/runtime-wave1 { studioRoleId }` (perm `db.objects.grant`): adds role grants — `CanSaveTo` on §4.1 write tables, `CanSee` on read tables, `CanExecute` on the 3 routines. |
| `Studio.Application/Screens/StudioScreen.cs`, `ScreenCodeGenerator.cs`, `ScreenValidator.cs` | `print` and `extras` options (§4.12); validator: `docKey` regex `^[A-Za-z0-9_\-]{1,100}$`; golden files updated (`UPDATE_GOLDEN=1`). |

### 8.3 Studio API (JSON camelCase; errors `{ code, message }`)
Prefix `api/projects/{projectId}/runtime`.

| Method + path | Perm | Request → Response |
|---|---|---|
| `GET status` | runtime.view | → `{ envId, envName, isReadOnly, phase11:"1"\|null, contract:"wave1-v1"\|null, configVersion, runtimePublicUrl, missingObjects:[], grants:{ "Sys_Devices":{ see, saveTo } … } }` |
| `GET devices?kind=` | runtime.view | → `[DeviceRow]` (`hasToken`, `hasSecrets` instead of `TokenHash`/`SecretsEnc`; `rowVer`) |
| `POST devices` | device.manage | `{ kind, name, compCode, branchCode, vendor?, bridgeDeviceId?, serialNo?, host?, port?, timeZoneId?, directionMode?, pullIntervalMin?, settings? }` → `DeviceRow` |
| `PUT devices/{id}` | device.manage | same + `rowVer` → `DeviceRow` |
| `PUT devices/{id}/secrets` | device.manage | `{ commKey?, apiUser?, apiPassword? }` → 204 |
| `POST devices/{id}/pairing-code` | device.pair | → `{ code:"7KQ2-M9XD", expiresAtUtc, installCommand }` |
| `POST devices/{id}/revoke` | device.pair | → `DeviceRow` |
| `POST devices/{id}/commands` | device.manage | `{ type, args }` (§4.10) → `{ commandId }` |
| `GET commands/{commandId}` | runtime.view | → `{ commandId, status, result, error, doneAtUtc }` |
| `GET devices/{id}/punches?top=20` | runtime.view | → `[{ rawId, deviceUserId, punchLocal, state, verifyMode, source, receivedAtUtc, mapStatus }]` |
| `GET printers` / `POST` / `PUT {id}` / `DELETE {id}` | print.manage (GET runtime.view) | `PrinterRow` |
| `GET routes` / `POST` / `PUT {id}` / `DELETE {id}` | print.manage | `RouteRow` |
| `POST printing/explain` | runtime.view | `{ docKey, station?, compCode, branchCode, userId?, terminalDeviceId? }` → `{ winner, candidates:[{ routeId, score, priority, printerName, matched:{ station, docKeyExact, terminal, user, branch, comp } }] }` |
| `GET/POST/PUT/DELETE stations`, `GET/PUT item-stations` (bulk), `GET/POST/PUT/DELETE templates` | print.manage | rows |
| `GET printing/jobs?from&to&status&docKey&page` | runtime.view | paged `{ rows, total }` (no payload) |
| `GET/PUT attendance/settings?compCode` | attendance.manage | `Att_Settings` row + employee-source keys |
| `GET attendance/employee-columns?source=` | attendance.manage | → `[ column names ]` (allowed objects only) |
| `GET/POST/PUT/DELETE attendance/shifts`, `roster`, `holidays`, `csv-profiles` | attendance.manage | rows |
| `GET attendance/user-map?deviceId=` | attendance.manage | → `{ deviceUsers:[{ deviceUserId, name, source }], maps:[…], employees:[{ empId, empCode, empName }] }` (device users from the last `att.users.read` result + distinct raw ids) |
| `PUT attendance/user-map` | attendance.manage | `{ deviceId\|null, items:[{ deviceUserId, empId, validFrom, validTo }] }` |
| `GET attendance/periods`, `POST attendance/periods`, `POST attendance/periods/{id}/lock` / `unlock` | attendance.lock | rows |
| `POST attendance/process` | attendance.process | `{ compCode, branchCode?, from, to }` → `{ runId }` |
| `GET/POST/PUT/DELETE numbering/series`, `numbering/bindings` | numbering.manage | rows |
| `POST numbering/preview` | runtime.view | `{ pattern, seqNo, compCode, branchCode, date, finYear?, terminalDeviceId? }` → `{ studio, db, match }` |
| `GET numbering/counters?seriesId=` | runtime.view | `[{ periodKey, lastNo }]` |
| `GET/POST/PUT/DELETE customfields/entities`, `customfields/defs`, `PUT customfields/defs/order` | customfields.manage | rows |
| `GET jobs`, `PUT jobs/{code}`, `POST jobs/{code}/run`, `GET jobs/runs?jobCode&page` | jobs.manage (GET runtime.view) | `{ cronExpr, timeZoneId, isEnabled, paramsJson, timeoutSec, rowVer }`; run → `{ runId }` |
| `GET/POST/PUT/DELETE audit/policies`, `GET audit/log?table&key&user&action&from&to&page` | audit.manage / runtime.view | rows / paged |

### 8.4 Frontend (Next.js static export, Stitch design, AR/EN, help "مثال" on every page)
| Path | Content |
|---|---|
| `Frontend/app/project/{devices,printing,attendance,numbering,custom-fields,jobs,audit-policy}/page.tsx` | Thin wrappers (same as existing pages). |
| `src/components/AppShell.tsx` | New nav group "إعدادات التشغيل / Runtime" (shown with `runtime.view`). |
| `src/features/runtime/shared/{api.ts, RuntimeGuard.tsx, CommandRunner.tsx, RowVerConflict.tsx}` | Typed client; banner when schema/contract/grants/read-only env block writes (with the fix for each); polling command helper; 409 dialog. |
| `src/features/devices/{DevicesPage, BridgesTab, AddBridgeDialog, PairCodeDialog, AttendanceDevicesTab, AddDeviceWizard, DeviceTestPanel, TerminalsTab, UserMappingGrid}.tsx` | Wizard per vendor: ZK ADMS shows server host/port/path from `Runtime.PublicUrl`; ZK TCP asks IP/port/comm key/bridge; CSV links to profiles. Test = `att.test` (shows last 5 punches, drift). Online dot from `IsOnline` + `LastSeenAtUtc` (auto refresh 10 s). |
| `src/features/printing/{PrintingPage, PrintersTab, DiscoverDialog, RoutesTab, EffectivePrinterTester, StationsTab, ItemStationBoard, TemplatesTab, PrintLogTab}.tsx` | Routes grid columns `Document · Company · Branch · User · Terminal · Station → Printer · Fallback · Copies · Watermark · Auto-print · Drawer · Layout · TTL · Priority`; tester calls `printing/explain` and explains "why"; station board drag-and-drop categories → stations. |
| `src/features/attendance/{AttendancePage, SettingsTab, EmployeeSourceForm, ShiftDesigner, ShiftTimeline, ShiftSimulator, RosterTab, RotationEditor, HolidaysTab, CsvProfilesTab, ProcessingTab, PeriodsTab}.tsx`, `shiftMath.ts` | Shift cards with a 24/48 h timeline (early window, grace, shift, break, OT start); simulator runs `shiftMath.ts` (§4.14) on typed punches; processing tab enables/schedules `att.process` and queues a recalculation. |
| `src/features/numbering/{NumberingPage, SeriesEditor, PatternBuilder, BindingsTab}.tsx`, `docNo.ts` | Token chips, live preview (TS) + "check with DB" (`numbering/preview`). |
| `src/features/customfields/{CustomFieldsPage, EntityEditor, FieldEditor, FieldPreview}.tsx` | Drag to reorder; preview of the input as the runtime will show it. |
| `src/features/jobs/{JobsPage, CronInput}.tsx` | Cron presets (every 15 min, nightly), next runs, run now, last runs. |
| `src/features/auditpolicy/{AuditPolicyPage, RuntimeAuditLog}.tsx` | Table picker (allowed objects), exclude columns, module code. |
| `src/features/screens/stepsMore.tsx` | Print step: "Doc key", "Auto-print on save"; extras: "Custom fields entity", "History". |
| `src/i18n/{ar,en,guide.ar,guide.en}.ts` | Keys + help examples. |

### 8.5 Studio tests
xUnit `Studio.Tests/Runtime/`: `RuntimeConfigTablesTests` (no table outside §4.1; Studio columns never include runtime-owned columns), `RuntimeWriteGuardTests` (missing perm / read-only env / no SaveTo grant / deny grant / unknown column → refused), `PairingCodeTests` (alphabet, normalisation, hash vector: `pair:v1:7KQ2M9XD` hashed the same as F), `DocNoFormatterTests` (§4.13 vectors), `RuntimeSecretSealerTests` (round trip with a test key pair; format prefix), `CronValidatorTests`, `RuntimeValidatorsTests`; golden codegen tests for print/extras options; integration tests against a DB created from §9 when `STUDIO_TEST_RUNTIME_DB` is set (route vectors §4.11 via `printing/explain`, preview parity). Vitest: `docNo.test.ts` (§4.13), `shiftMath.test.ts` (§4.14 V1–V7).

### 8.6 Studio acceptance
- A user without `device.pair` cannot create a pairing code (server 403, button hidden).
- With a read-only environment every save shows the guard banner; nothing is written.
- Pairing code works once, within 10 min, and is never visible again.
- The effective-printer tester returns the §4.11 winners.
- Shift simulator matches V1–V7; numbering preview "studio" = "db" for the §4.13 vectors.
- Every Studio write appears in `studio.RuntimeConfigChange`, `studio.AuditLog` and the project's `Sys_AuditLog (Source='studio')`.

---

## 9. Full DDL (idempotent scripts)

All framework scripts: `SET NOCOUNT ON;`, guarded by `IF OBJECT_ID(...) IS NULL` / `COL_LENGTH`, no `USE` (run against the selected DB, like `Phase10_*`), UTF-8 (`sqlcmd -f 65001`). SQL Server 2016+ (compat ≥ 130 for `ISJSON`, `SESSION_CONTEXT`, `CREATE OR ALTER`).

### 9.1 `React_Fram\Database\Phase11_00_Security.sql`
```sql
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_Users', N'U') IS NULL
BEGIN RAISERROR(N'Sys_Users not found - wrong database. Nothing changed.', 16, 1); SET NOEXEC ON; END
GO
IF COL_LENGTH(N'dbo.Sys_Users', N'USER_PasswordHash') IS NULL ALTER TABLE dbo.Sys_Users ADD USER_PasswordHash NVARCHAR(256) NULL;
IF COL_LENGTH(N'dbo.Sys_Users', N'PasswordMigratedAt') IS NULL ALTER TABLE dbo.Sys_Users ADD PasswordMigratedAt DATETIME2(0) NULL;
IF COL_LENGTH(N'dbo.Sys_Users', N'FailedLoginCount') IS NULL
    ALTER TABLE dbo.Sys_Users ADD FailedLoginCount INT NOT NULL CONSTRAINT DF_Sys_Users_FailedLoginCount DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.Sys_Users', N'LockoutUntil') IS NULL ALTER TABLE dbo.Sys_Users ADD LockoutUntil DATETIME2(0) NULL;
GO
IF OBJECT_ID(N'dbo.Sys_RuntimeSettings', N'U') IS NULL
CREATE TABLE dbo.Sys_RuntimeSettings (
    SettingKey   VARCHAR(100)   NOT NULL CONSTRAINT PK_Sys_RuntimeSettings PRIMARY KEY,
    SettingValue NVARCHAR(4000) NULL,
    UpdatedAt    DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_RuntimeSettings_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedBy    NVARCHAR(100)  NULL,
    RowVer       ROWVERSION     NOT NULL
);
GO
DECLARE @s TABLE (K VARCHAR(100), V NVARCHAR(4000));
INSERT INTO @s VALUES ('Config.Version', N'0'), ('Runtime.PublicUrl', N''), ('Bridge.LatestVersion', N'1.0.0'),
 ('Print.ReprintPermission', N'PRINT'), ('Audit.RetentionDays', N'730'),
 ('Att.EmployeeSource', N'G_D_Employees'), ('Att.EmpIdColumn', N'EmpID'), ('Att.EmpCodeColumn', N'EmpCode'),
 ('Att.EmpNameColumn', N'Emp_Name'), ('Att.EmpBranchColumn', N''), ('Att.EmpCompColumn', N'');
INSERT INTO dbo.Sys_RuntimeSettings (SettingKey, SettingValue, UpdatedBy)
SELECT s.K, s.V, N'Phase11' FROM @s s WHERE NOT EXISTS (SELECT 1 FROM dbo.Sys_RuntimeSettings x WHERE x.SettingKey = s.K);
MERGE dbo.Sys_RuntimeSettings AS t USING (SELECT 'Schema.Phase11' AS K, N'1' AS V) AS s ON t.SettingKey = s.K
WHEN MATCHED THEN UPDATE SET SettingValue = s.V, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'Phase11'
WHEN NOT MATCHED THEN INSERT (SettingKey, SettingValue, UpdatedBy) VALUES (s.K, s.V, N'Phase11');
GO
CREATE OR ALTER PROCEDURE dbo.Sys_BumpConfigVersion @Area VARCHAR(40)
AS
BEGIN
    SET NOCOUNT ON;
    IF @Area NOT IN ('devices','printing','attendance','numbering','customfields','jobs','audit','settings')
        THROW 51001, N'Unknown config area.', 1;
    UPDATE dbo.Sys_RuntimeSettings SET SettingValue = CAST(TRY_CAST(SettingValue AS BIGINT) + 1 AS NVARCHAR(40)),
           UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @Area
    WHERE SettingKey = 'Config.Version';
    DECLARE @k VARCHAR(100) = 'Config.Version.' + @Area;
    IF EXISTS (SELECT 1 FROM dbo.Sys_RuntimeSettings WHERE SettingKey = @k)
        UPDATE dbo.Sys_RuntimeSettings SET SettingValue = CAST(TRY_CAST(SettingValue AS BIGINT) + 1 AS NVARCHAR(40)),
               UpdatedAt = SYSUTCDATETIME() WHERE SettingKey = @k;
    ELSE INSERT INTO dbo.Sys_RuntimeSettings (SettingKey, SettingValue, UpdatedBy) VALUES (@k, N'1', @Area);
END
GO
IF OBJECT_ID(N'dbo.Sys_AuditLog', N'U') IS NULL
CREATE TABLE dbo.Sys_AuditLog (
    AuditId       BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_AuditLog PRIMARY KEY,
    AtUtc         DATETIME2(3)   NOT NULL CONSTRAINT DF_Sys_AuditLog_AtUtc DEFAULT (SYSUTCDATETIME()),
    Source        VARCHAR(10)    NOT NULL,
    Action        VARCHAR(20)    NOT NULL,
    UserID        INT            NULL,
    UserCode      NVARCHAR(100)  NULL,
    CompCode      INT            NULL,
    BranchCode    INT            NULL,
    ModuleCode    NVARCHAR(100)  NULL,
    TableName     NVARCHAR(128)  NULL,
    RecordKey     NVARCHAR(200)  NULL,
    ChangesJson   NVARCHAR(MAX)  NULL,
    ClientIp      VARCHAR(45)    NULL,
    CorrelationId UNIQUEIDENTIFIER NULL,
    CONSTRAINT CK_Sys_AuditLog_Source CHECK (Source IN ('runtime','studio','bridge','device','job'))
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_AuditLog_Record')
    CREATE INDEX IX_Sys_AuditLog_Record ON dbo.Sys_AuditLog (TableName, RecordKey, AuditId DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_AuditLog_At')
    CREATE INDEX IX_Sys_AuditLog_At ON dbo.Sys_AuditLog (AtUtc);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_AuditLog_User')
    CREATE INDEX IX_Sys_AuditLog_User ON dbo.Sys_AuditLog (UserID, AtUtc);
GO
CREATE OR ALTER TRIGGER dbo.TR_Sys_AuditLog_AppendOnly ON dbo.Sys_AuditLog INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND ISNULL(CAST(SESSION_CONTEXT(N'audit_purge') AS INT), 0) = 1
    BEGIN
        DELETE a FROM dbo.Sys_AuditLog a JOIN deleted d ON d.AuditId = a.AuditId;   -- not re-fired (INSTEAD OF)
        RETURN;
    END
    ;THROW 51000, N'Sys_AuditLog is append-only.', 1;
END
GO
CREATE OR ALTER PROCEDURE dbo.Sys_AuditPurge @RetentionDays INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @RetentionDays < 30 THROW 51002, N'Retention must be at least 30 days.', 1;
    EXEC sys.sp_set_session_context @key = N'audit_purge', @value = 1;
    DELETE TOP (50000) FROM dbo.Sys_AuditLog WHERE AtUtc < DATEADD(DAY, -@RetentionDays, SYSUTCDATETIME());
    EXEC sys.sp_set_session_context @key = N'audit_purge', @value = 0;
END
GO
SET NOEXEC OFF;
GO
```

### 9.2 `Phase11_01_Jobs.sql`
```sql
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_Jobs', N'U') IS NULL
CREATE TABLE dbo.Sys_Jobs (
    JobCode       VARCHAR(60)   NOT NULL CONSTRAINT PK_Sys_Jobs PRIMARY KEY,
    JobType       VARCHAR(60)   NOT NULL,
    NameA         NVARCHAR(150) NOT NULL,
    NameE         NVARCHAR(150) NOT NULL,
    CronExpr      VARCHAR(100)  NULL,               -- 5-field cron; NULL = on demand only
    TimeZoneId    VARCHAR(64)   NULL,               -- Windows id; NULL = server local
    ParamsJson    NVARCHAR(MAX) NULL,
    IsEnabled     BIT           NOT NULL CONSTRAINT DF_Sys_Jobs_IsEnabled DEFAULT (0),
    TimeoutSec    INT           NOT NULL CONSTRAINT DF_Sys_Jobs_TimeoutSec DEFAULT (600),
    LastRunId     BIGINT        NULL,
    NextRunAtUtc  DATETIME2(0)  NULL,
    UpdatedAt     DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_Jobs_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedBy     NVARCHAR(100) NULL,
    RowVer        ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_Jobs_Params CHECK (ParamsJson IS NULL OR ISJSON(ParamsJson) = 1),
    CONSTRAINT CK_Sys_Jobs_Timeout CHECK (TimeoutSec BETWEEN 10 AND 86400)
);
GO
IF OBJECT_ID(N'dbo.Sys_JobRuns', N'U') IS NULL
CREATE TABLE dbo.Sys_JobRuns (
    RunId         BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_JobRuns PRIMARY KEY,
    JobCode       VARCHAR(60)    NOT NULL CONSTRAINT FK_Sys_JobRuns_Job REFERENCES dbo.Sys_Jobs (JobCode),
    Status        VARCHAR(10)    NOT NULL CONSTRAINT DF_Sys_JobRuns_Status DEFAULT ('queued'),
    TriggeredBy   NVARCHAR(100)  NOT NULL,           -- schedule | user:{id} | studio:{id} | system
    ParamsJson    NVARCHAR(MAX)  NULL,
    QueuedAtUtc   DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_JobRuns_Queued DEFAULT (SYSUTCDATETIME()),
    StartedAtUtc  DATETIME2(0)   NULL,
    FinishedAtUtc DATETIME2(0)   NULL,
    Host          NVARCHAR(100)  NULL,
    Message       NVARCHAR(2000) NULL,
    ResultJson    NVARCHAR(MAX)  NULL,
    CONSTRAINT CK_Sys_JobRuns_Status CHECK (Status IN ('queued','running','succeeded','failed','cancelled','timeout')),
    CONSTRAINT CK_Sys_JobRuns_Params CHECK (ParamsJson IS NULL OR ISJSON(ParamsJson) = 1)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_JobRuns_Queue')
    CREATE INDEX IX_Sys_JobRuns_Queue ON dbo.Sys_JobRuns (Status, RunId) INCLUDE (JobCode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_JobRuns_Job')
    CREATE INDEX IX_Sys_JobRuns_Job ON dbo.Sys_JobRuns (JobCode, RunId DESC);
GO
DECLARE @j TABLE (Code VARCHAR(60), JType VARCHAR(60), NameA NVARCHAR(150), NameE NVARCHAR(150), Cron VARCHAR(100), Params NVARCHAR(400), Enabled BIT, Timeout INT);
INSERT INTO @j VALUES
 ('att.map',           'att.map',           N'ربط البصمات بالموظفين',   N'Map raw punches',          '* * * * *',    NULL,                1, 120),
 ('att.process',       'att.process',       N'حساب الحضور اليومي',      N'Process daily attendance', '*/15 * * * *', N'{"daysBack":2}',   0, 1800),
 ('print.expire',      'print.expire',      N'إنهاء مهام الطباعة القديمة', N'Expire print jobs',     '* * * * *',    NULL,                1, 60),
 ('print.purge',       'print.purge',       N'تنظيف ملفات الطباعة',     N'Purge print payloads',     '0 3 * * *',    N'{"days":7}',       1, 600),
 ('device.sweep',      'device.sweep',      N'متابعة حالة الأجهزة',     N'Device offline sweep',     '* * * * *',    NULL,                1, 60),
 ('device.timesync',   'device.timesync',   N'ضبط ساعة الأجهزة',        N'Device time sync',         '0 3 * * *',    NULL,                0, 600),
 ('audit.purge',       'audit.purge',       N'تنظيف سجل التعديلات',     N'Audit purge',              '30 2 * * *',   NULL,                1, 1800),
 ('auth.hash.migrate', 'auth.hash.migrate', N'تشفير كلمات المرور',      N'Hash plain passwords',     NULL,           N'{"batch":200}',    1, 1800);
INSERT INTO dbo.Sys_Jobs (JobCode, JobType, NameA, NameE, CronExpr, ParamsJson, IsEnabled, TimeoutSec, UpdatedBy)
SELECT Code, JType, NameA, NameE, Cron, Params, Enabled, Timeout, N'Phase11' FROM @j j
WHERE NOT EXISTS (SELECT 1 FROM dbo.Sys_Jobs x WHERE x.JobCode = j.Code);
UPDATE x SET NameA = j.NameA, NameE = j.NameE FROM dbo.Sys_Jobs x JOIN @j j ON j.Code = x.JobCode;
GO
```

### 9.3 `Phase11_02_Devices.sql`
```sql
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_Devices', N'U') IS NULL
CREATE TABLE dbo.Sys_Devices (
    DeviceId          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_Devices PRIMARY KEY,
    DeviceKind        VARCHAR(12)    NOT NULL,
    Vendor            VARCHAR(20)    NULL,
    Name              NVARCHAR(100)  NOT NULL,
    CompCode          INT            NOT NULL,
    BranchCode        INT            NULL,
    BridgeDeviceId    INT            NULL CONSTRAINT FK_Sys_Devices_Bridge REFERENCES dbo.Sys_Devices (DeviceId),
    SerialNo          NVARCHAR(50)   NULL,
    Host              NVARCHAR(255)  NULL,
    Port              INT            NULL,
    SecretsEnc        NVARCHAR(MAX)  NULL,
    TimeZoneId        VARCHAR(64)    NULL,
    DirectionMode     VARCHAR(10)    NOT NULL CONSTRAINT DF_Sys_Devices_Dir DEFAULT ('by-state'),
    PullIntervalMin   INT            NOT NULL CONSTRAINT DF_Sys_Devices_Pull DEFAULT (10),
    TerminalKey       UNIQUEIDENTIFIER NULL,
    SettingsJson      NVARCHAR(MAX)  NULL,
    IsActive          BIT            NOT NULL CONSTRAINT DF_Sys_Devices_IsActive DEFAULT (1),
    -- runtime-owned
    TokenHash         CHAR(64)       NULL,
    PairedAtUtc       DATETIME2(0)   NULL,
    RevokedAtUtc      DATETIME2(0)   NULL,
    IsOnline          BIT            NOT NULL CONSTRAINT DF_Sys_Devices_IsOnline DEFAULT (0),
    LastSeenAtUtc     DATETIME2(0)   NULL,
    AgentVersion      VARCHAR(30)    NULL,
    MachineName       NVARCHAR(100)  NULL,
    CapabilitiesJson  NVARCHAR(MAX)  NULL,
    InstalledPrintersJson NVARCHAR(MAX) NULL,
    SyncStateJson     NVARCHAR(1000) NULL,
    LastPunchLocal    DATETIME2(0)   NULL,
    LastSyncAtUtc     DATETIME2(0)   NULL,
    LastError         NVARCHAR(1000) NULL,
    ClockDriftSec     INT            NULL,
    CreatedAtUtc      DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_Devices_Created DEFAULT (SYSUTCDATETIME()),
    CreatedBy         NVARCHAR(100)  NULL,
    UpdatedAtUtc      DATETIME2(0)   NULL,
    UpdatedBy         NVARCHAR(100)  NULL,
    RowVer            ROWVERSION     NOT NULL,
    CONSTRAINT CK_Sys_Devices_Kind   CHECK (DeviceKind IN ('bridge','attendance','terminal')),
    CONSTRAINT CK_Sys_Devices_Vendor CHECK (Vendor IS NULL OR Vendor IN ('zk-tcp','zk-adms','csv','biostar2','hikvision','anviz')),
    CONSTRAINT CK_Sys_Devices_Dir    CHECK (DirectionMode IN ('in','out','both','by-state')),
    CONSTRAINT CK_Sys_Devices_Pull   CHECK (PullIntervalMin BETWEEN 1 AND 1440),
    CONSTRAINT CK_Sys_Devices_VendorKind CHECK ((DeviceKind = 'attendance' AND Vendor IS NOT NULL) OR (DeviceKind <> 'attendance' AND Vendor IS NULL)),
    CONSTRAINT CK_Sys_Devices_Settings CHECK (SettingsJson IS NULL OR ISJSON(SettingsJson) = 1)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Sys_Devices_Serial')
    CREATE UNIQUE INDEX UX_Sys_Devices_Serial ON dbo.Sys_Devices (Vendor, SerialNo) WHERE SerialNo IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Sys_Devices_Terminal')
    CREATE UNIQUE INDEX UX_Sys_Devices_Terminal ON dbo.Sys_Devices (TerminalKey) WHERE TerminalKey IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_Devices_Scope')
    CREATE INDEX IX_Sys_Devices_Scope ON dbo.Sys_Devices (CompCode, BranchCode, DeviceKind);
GO
IF OBJECT_ID(N'dbo.Sys_DevicePairing', N'U') IS NULL
CREATE TABLE dbo.Sys_DevicePairing (
    PairingId     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_DevicePairing PRIMARY KEY,
    DeviceId      INT           NOT NULL CONSTRAINT FK_Sys_DevicePairing_Device REFERENCES dbo.Sys_Devices (DeviceId),
    CodeHash      CHAR(64)      NOT NULL,
    ExpiresAtUtc  DATETIME2(0)  NOT NULL,
    UsedAtUtc     DATETIME2(0)  NULL,
    CreatedBy     NVARCHAR(100) NOT NULL,
    CreatedAtUtc  DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_DevicePairing_Created DEFAULT (SYSUTCDATETIME())
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_DevicePairing_Code')
    CREATE INDEX IX_Sys_DevicePairing_Code ON dbo.Sys_DevicePairing (CodeHash) INCLUDE (ExpiresAtUtc, UsedAtUtc, DeviceId);
GO
IF OBJECT_ID(N'dbo.Sys_DeviceCommands', N'U') IS NULL
CREATE TABLE dbo.Sys_DeviceCommands (
    CommandId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_DeviceCommands PRIMARY KEY,
    DeviceId      INT            NOT NULL CONSTRAINT FK_Sys_DeviceCommands_Device REFERENCES dbo.Sys_Devices (DeviceId),
    CommandType   VARCHAR(40)    NOT NULL,
    ArgsJson      NVARCHAR(MAX)  NULL,
    Status        VARCHAR(10)    NOT NULL CONSTRAINT DF_Sys_DeviceCommands_Status DEFAULT ('queued'),
    ResultJson    NVARCHAR(MAX)  NULL,
    Error         NVARCHAR(1000) NULL,
    RequestedBy   NVARCHAR(100)  NOT NULL,
    Source        VARCHAR(10)    NOT NULL,
    CreatedAtUtc  DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_DeviceCommands_Created DEFAULT (SYSUTCDATETIME()),
    SentAtUtc     DATETIME2(0)   NULL,
    DoneAtUtc     DATETIME2(0)   NULL,
    ExpiresAtUtc  DATETIME2(0)   NOT NULL,
    CONSTRAINT CK_Sys_DeviceCommands_Status CHECK (Status IN ('queued','sent','done','failed','expired')),
    CONSTRAINT CK_Sys_DeviceCommands_Source CHECK (Source IN ('studio','runtime','job')),
    CONSTRAINT CK_Sys_DeviceCommands_Type CHECK (CommandType IN ('printers.discover','printer.test','drawer.test','att.test','att.users.read',
        'att.pull.now','att.settime','att.user.upsert','att.user.delete','att.reboot','bridge.logs.upload')),
    CONSTRAINT CK_Sys_DeviceCommands_Args CHECK (ArgsJson IS NULL OR ISJSON(ArgsJson) = 1)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_DeviceCommands_Queue')
    CREATE INDEX IX_Sys_DeviceCommands_Queue ON dbo.Sys_DeviceCommands (Status, DeviceId) INCLUDE (ExpiresAtUtc);
GO
IF OBJECT_ID(N'dbo.Sys_RuntimeKeys', N'U') IS NULL
CREATE TABLE dbo.Sys_RuntimeKeys (
    Kid          VARCHAR(20)   NOT NULL CONSTRAINT PK_Sys_RuntimeKeys PRIMARY KEY,
    Algorithm    VARCHAR(20)   NOT NULL CONSTRAINT DF_Sys_RuntimeKeys_Alg DEFAULT ('RSA-OAEP-256'),
    PublicKeyPem NVARCHAR(MAX) NOT NULL,
    IsActive     BIT           NOT NULL CONSTRAINT DF_Sys_RuntimeKeys_Active DEFAULT (1),
    CreatedAtUtc DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_RuntimeKeys_Created DEFAULT (SYSUTCDATETIME())
);
GO
```

### 9.4 `Phase11_03_Printing.sql`
```sql
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_Devices', N'U') IS NULL
BEGIN RAISERROR(N'Run Phase11_02_Devices.sql first.', 16, 1); SET NOEXEC ON; END
GO
IF OBJECT_ID(N'dbo.Sys_Printers', N'U') IS NULL
CREATE TABLE dbo.Sys_Printers (
    PrinterId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_Printers PRIMARY KEY,
    BridgeDeviceId INT           NOT NULL CONSTRAINT FK_Sys_Printers_Bridge REFERENCES dbo.Sys_Devices (DeviceId),
    CompCode       INT           NOT NULL,
    BranchCode     INT           NULL,
    Name           NVARCHAR(100) NOT NULL,
    Kind           VARCHAR(12)   NOT NULL,
    Transport      VARCHAR(10)   NOT NULL,
    Target         NVARCHAR(255) NOT NULL,       -- Windows printer name or ip:port
    Language       VARCHAR(16)   NOT NULL,
    PaperWidthMm   DECIMAL(6,1)  NULL,
    PaperHeightMm  DECIMAL(6,1)  NULL,
    Dpi            INT           NOT NULL CONSTRAINT DF_Sys_Printers_Dpi DEFAULT (203),
    DotsWidth      INT           NULL,
    HasDrawer      BIT           NOT NULL CONSTRAINT DF_Sys_Printers_HasDrawer DEFAULT (0),
    DrawerPin      TINYINT       NOT NULL CONSTRAINT DF_Sys_Printers_DrawerPin DEFAULT (0),
    DrawerOnMs     INT           NOT NULL CONSTRAINT DF_Sys_Printers_DrawerOn DEFAULT (50),
    DrawerOffMs    INT           NOT NULL CONSTRAINT DF_Sys_Printers_DrawerOff DEFAULT (500),
    CutMode        VARCHAR(8)    NOT NULL CONSTRAINT DF_Sys_Printers_Cut DEFAULT ('partial'),
    CodePage       INT           NULL,
    IsActive       BIT           NOT NULL CONSTRAINT DF_Sys_Printers_IsActive DEFAULT (1),
    UpdatedAt      DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_Printers_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy      NVARCHAR(100) NULL,
    RowVer         ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_Printers_Kind CHECK (Kind IN ('a4','a5','receipt80','receipt58','label','kitchen')),
    CONSTRAINT CK_Sys_Printers_Transport CHECK (Transport IN ('spooler','tcp9100')),
    CONSTRAINT CK_Sys_Printers_Language CHECK (Language IN ('html','escpos-raster','zpl','zpl-raster','tspl')),
    CONSTRAINT CK_Sys_Printers_HtmlSpooler CHECK (NOT (Language = 'html' AND Transport <> 'spooler')),
    CONSTRAINT CK_Sys_Printers_Pin CHECK (DrawerPin IN (0,1)),
    CONSTRAINT CK_Sys_Printers_CutMode CHECK (CutMode IN ('none','partial','full')),
    CONSTRAINT CK_Sys_Printers_Dpi CHECK (Dpi BETWEEN 96 AND 600)
);
GO
IF OBJECT_ID(N'dbo.Sys_PrintStations', N'U') IS NULL
CREATE TABLE dbo.Sys_PrintStations (
    CompCode    INT           NOT NULL,
    StationCode VARCHAR(30)   NOT NULL,
    NameA       NVARCHAR(100) NOT NULL,
    NameE       NVARCHAR(100) NOT NULL,
    IsActive    BIT           NOT NULL CONSTRAINT DF_Sys_PrintStations_IsActive DEFAULT (1),
    RowVer      ROWVERSION    NOT NULL,
    CONSTRAINT PK_Sys_PrintStations PRIMARY KEY (CompCode, StationCode)
);
GO
IF OBJECT_ID(N'dbo.Sys_ItemStationMap', N'U') IS NULL
CREATE TABLE dbo.Sys_ItemStationMap (
    MapId       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_ItemStationMap PRIMARY KEY,
    CompCode    INT          NOT NULL,
    BranchCode  INT          NULL,
    CategoryId  INT          NULL,
    ItemId      INT          NULL,
    StationCode VARCHAR(30)  NOT NULL,
    RowVer      ROWVERSION   NOT NULL,
    CONSTRAINT FK_Sys_ItemStationMap_Station FOREIGN KEY (CompCode, StationCode) REFERENCES dbo.Sys_PrintStations (CompCode, StationCode),
    CONSTRAINT CK_Sys_ItemStationMap_Target CHECK (CategoryId IS NOT NULL OR ItemId IS NOT NULL)
);
GO
IF OBJECT_ID(N'dbo.Sys_PrintTemplates', N'U') IS NULL
CREATE TABLE dbo.Sys_PrintTemplates (
    TemplateCode VARCHAR(50)   NOT NULL CONSTRAINT PK_Sys_PrintTemplates PRIMARY KEY,
    Language     VARCHAR(10)   NOT NULL,
    NameA        NVARCHAR(100) NOT NULL,
    NameE        NVARCHAR(100) NOT NULL,
    Body         NVARCHAR(MAX) NOT NULL,
    WidthMm      DECIMAL(6,1)  NULL,
    HeightMm     DECIMAL(6,1)  NULL,
    SampleJson   NVARCHAR(MAX) NULL,
    UpdatedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_PrintTemplates_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy    NVARCHAR(100) NULL,
    RowVer       ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_PrintTemplates_Language CHECK (Language IN ('zpl','tspl')),
    CONSTRAINT CK_Sys_PrintTemplates_Sample CHECK (SampleJson IS NULL OR ISJSON(SampleJson) = 1)
);
GO
IF OBJECT_ID(N'dbo.Sys_PrintRoutes', N'U') IS NULL
CREATE TABLE dbo.Sys_PrintRoutes (
    RouteId           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_PrintRoutes PRIMARY KEY,
    DocKey            NVARCHAR(100) NOT NULL,                 -- ReportCode / MODULE_CODE / doc type / '*'
    Station           VARCHAR(30)   NULL,
    CompCode          INT           NULL,
    BranchCode        INT           NULL,
    UserID            INT           NULL,
    TerminalDeviceId  INT           NULL CONSTRAINT FK_Sys_PrintRoutes_Terminal REFERENCES dbo.Sys_Devices (DeviceId),
    PrinterId         INT           NOT NULL CONSTRAINT FK_Sys_PrintRoutes_Printer REFERENCES dbo.Sys_Printers (PrinterId),
    FallbackPrinterId INT           NULL CONSTRAINT FK_Sys_PrintRoutes_Fallback REFERENCES dbo.Sys_Printers (PrinterId),
    Copies            TINYINT       NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Copies DEFAULT (1),
    CopyWatermark     BIT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Watermark DEFAULT (0),
    AutoPrintOnSave   BIT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Auto DEFAULT (0),
    OpenDrawer        BIT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Drawer DEFAULT (0),
    LayoutCode        NVARCHAR(100) NULL,                     -- report code override (e.g. 58 mm variant)
    TemplateCode      VARCHAR(50)   NULL CONSTRAINT FK_Sys_PrintRoutes_Template REFERENCES dbo.Sys_PrintTemplates (TemplateCode),
    TtlMin            INT           NULL,
    Priority          INT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Priority DEFAULT (0),
    IsActive          BIT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_IsActive DEFAULT (1),
    Note              NVARCHAR(200) NULL,
    UpdatedAt         DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy         NVARCHAR(100) NULL,
    RowVer            ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_PrintRoutes_Copies CHECK (Copies BETWEEN 1 AND 10),
    CONSTRAINT CK_Sys_PrintRoutes_Branch CHECK (BranchCode IS NULL OR CompCode IS NOT NULL),
    CONSTRAINT CK_Sys_PrintRoutes_Ttl CHECK (TtlMin IS NULL OR TtlMin BETWEEN 1 AND 10080),
    CONSTRAINT CK_Sys_PrintRoutes_Fallback CHECK (FallbackPrinterId IS NULL OR FallbackPrinterId <> PrinterId)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_PrintRoutes_Doc')
    CREATE INDEX IX_Sys_PrintRoutes_Doc ON dbo.Sys_PrintRoutes (DocKey, IsActive) INCLUDE (Station, CompCode, BranchCode, UserID, TerminalDeviceId, PrinterId, Priority);
GO
IF OBJECT_ID(N'dbo.Sys_PrintJobs', N'U') IS NULL
CREATE TABLE dbo.Sys_PrintJobs (
    JobId             UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Sys_PrintJobs_JobId DEFAULT (NEWSEQUENTIALID()) CONSTRAINT PK_Sys_PrintJobs PRIMARY KEY,
    ParentJobId       UNIQUEIDENTIFIER NULL,
    DocKey            NVARCHAR(100)  NOT NULL,
    ReportCode        NVARCHAR(100)  NULL,
    ModuleCode        NVARCHAR(100)  NULL,
    RecordKey         NVARCHAR(200)  NULL,
    CompCode          INT            NOT NULL,
    BranchCode        INT            NULL,
    UserID            INT            NULL,
    TerminalDeviceId  INT            NULL,
    Station           VARCHAR(30)    NULL,
    RouteId           INT            NULL,
    PrinterId         INT            NOT NULL,
    FallbackPrinterId INT            NULL,
    BridgeDeviceId    INT            NOT NULL,
    Copies            TINYINT        NOT NULL,
    CopyWatermark     BIT            NOT NULL CONSTRAINT DF_Sys_PrintJobs_Watermark DEFAULT (0),
    OpenDrawer        BIT            NOT NULL CONSTRAINT DF_Sys_PrintJobs_Drawer DEFAULT (0),
    PayloadKind       VARCHAR(6)     NOT NULL,
    PayloadJson       NVARCHAR(MAX)  NULL,          -- NULL after purge
    PayloadSha256     CHAR(64)       NULL,
    PayloadBytes      INT            NULL,
    Status            VARCHAR(10)    NOT NULL CONSTRAINT DF_Sys_PrintJobs_Status DEFAULT ('queued'),
    Attempts          INT            NOT NULL CONSTRAINT DF_Sys_PrintJobs_Attempts DEFAULT (0),
    Error             NVARCHAR(1000) NULL,
    IsReprint         BIT            NOT NULL CONSTRAINT DF_Sys_PrintJobs_Reprint DEFAULT (0),
    CreatedAtUtc      DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_PrintJobs_Created DEFAULT (SYSUTCDATETIME()),
    SentAtUtc         DATETIME2(0)   NULL,
    PrintedAtUtc      DATETIME2(0)   NULL,
    ExpiresAtUtc      DATETIME2(0)   NOT NULL,
    PayloadPurgedAtUtc DATETIME2(0)  NULL,
    CONSTRAINT CK_Sys_PrintJobs_Status CHECK (Status IN ('queued','sent','accepted','printing','printed','failed','expired','fallback','cancelled')),
    CONSTRAINT CK_Sys_PrintJobs_Kind CHECK (PayloadKind IN ('html','raw','test'))
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_PrintJobs_Bridge')
    CREATE INDEX IX_Sys_PrintJobs_Bridge ON dbo.Sys_PrintJobs (BridgeDeviceId, Status) INCLUDE (ExpiresAtUtc);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_PrintJobs_Doc')
    CREATE INDEX IX_Sys_PrintJobs_Doc ON dbo.Sys_PrintJobs (DocKey, RecordKey);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_PrintJobs_Created')
    CREATE INDEX IX_Sys_PrintJobs_Created ON dbo.Sys_PrintJobs (CreatedAtUtc);
GO
CREATE OR ALTER FUNCTION dbo.Sys_PrintRouteCandidates
    (@DocKey NVARCHAR(100), @Station VARCHAR(30), @CompCode INT, @BranchCode INT, @UserID INT, @TerminalDeviceId INT)
RETURNS TABLE
AS RETURN
SELECT r.RouteId, r.PrinterId, r.FallbackPrinterId, r.Copies, r.CopyWatermark, r.AutoPrintOnSave, r.OpenDrawer,
       r.LayoutCode, r.TemplateCode, r.TtlMin, r.Priority,
       CAST(CASE WHEN r.Station IS NOT NULL THEN 1 ELSE 0 END AS BIT)          AS MatchStation,
       CAST(CASE WHEN r.DocKey <> N'*' THEN 1 ELSE 0 END AS BIT)               AS MatchDocKeyExact,
       CAST(CASE WHEN r.TerminalDeviceId IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS MatchTerminal,
       CAST(CASE WHEN r.UserID IS NOT NULL THEN 1 ELSE 0 END AS BIT)           AS MatchUser,
       CAST(CASE WHEN r.BranchCode IS NOT NULL THEN 1 ELSE 0 END AS BIT)       AS MatchBranch,
       CAST(CASE WHEN r.CompCode IS NOT NULL THEN 1 ELSE 0 END AS BIT)         AS MatchComp,
       (CASE WHEN r.Station IS NOT NULL THEN 64 ELSE 0 END) + (CASE WHEN r.DocKey <> N'*' THEN 32 ELSE 0 END)
     + (CASE WHEN r.TerminalDeviceId IS NOT NULL THEN 16 ELSE 0 END) + (CASE WHEN r.UserID IS NOT NULL THEN 8 ELSE 0 END)
     + (CASE WHEN r.BranchCode IS NOT NULL THEN 4 ELSE 0 END) + (CASE WHEN r.CompCode IS NOT NULL THEN 2 ELSE 0 END) AS Score
FROM dbo.Sys_PrintRoutes r
JOIN dbo.Sys_Printers p ON p.PrinterId = r.PrinterId AND p.IsActive = 1
WHERE r.IsActive = 1
  AND (r.DocKey = @DocKey OR r.DocKey = N'*')
  AND (r.Station IS NULL OR r.Station = @Station)
  AND (r.CompCode IS NULL OR r.CompCode = @CompCode)
  AND (r.BranchCode IS NULL OR r.BranchCode = @BranchCode)
  AND (r.UserID IS NULL OR r.UserID = @UserID)
  AND (r.TerminalDeviceId IS NULL OR r.TerminalDeviceId = @TerminalDeviceId);
GO
SET NOEXEC OFF;
GO
```

### 9.5 `Phase11_04_Attendance.sql`
```sql
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_Devices', N'U') IS NULL OR OBJECT_ID(N'dbo.Sys_RuntimeSettings', N'U') IS NULL
BEGIN RAISERROR(N'Run Phase11_00 and Phase11_02 first.', 16, 1); SET NOEXEC ON; END
GO
IF OBJECT_ID(N'dbo.Att_Settings', N'U') IS NULL
CREATE TABLE dbo.Att_Settings (
    CompCode         INT          NOT NULL CONSTRAINT PK_Att_Settings PRIMARY KEY,
    AutoMatchByCode  BIT          NOT NULL CONSTRAINT DF_Att_Settings_Auto DEFAULT (1),
    DoubleTapSec     INT          NOT NULL CONSTRAINT DF_Att_Settings_Tap DEFAULT (120),
    WeekendDays      VARCHAR(20)  NOT NULL CONSTRAINT DF_Att_Settings_Weekend DEFAULT ('5'),   -- 0=Sun..6=Sat, comma list
    DefaultShiftId   INT          NULL,
    ProcessDaysBack  INT          NOT NULL CONSTRAINT DF_Att_Settings_Back DEFAULT (2),
    UpdatedAt        DATETIME2(0) NOT NULL CONSTRAINT DF_Att_Settings_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy        NVARCHAR(100) NULL,
    RowVer           ROWVERSION   NOT NULL,
    CONSTRAINT CK_Att_Settings_Tap CHECK (DoubleTapSec BETWEEN 0 AND 3600),
    CONSTRAINT CK_Att_Settings_Back CHECK (ProcessDaysBack BETWEEN 0 AND 62),
    CONSTRAINT CK_Att_Settings_Weekend CHECK (WeekendDays NOT LIKE '%[^0-6,]%')
);
GO
IF OBJECT_ID(N'dbo.Att_RawPunch', N'U') IS NULL
CREATE TABLE dbo.Att_RawPunch (
    RawId         BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Att_RawPunch PRIMARY KEY,
    DeviceId      INT            NOT NULL CONSTRAINT FK_Att_RawPunch_Device REFERENCES dbo.Sys_Devices (DeviceId),
    DeviceUserId  NVARCHAR(30)   NOT NULL,
    PunchLocal    DATETIME2(0)   NOT NULL,
    PunchUtc      DATETIME2(0)   NULL,
    State         TINYINT        NOT NULL CONSTRAINT DF_Att_RawPunch_State DEFAULT (255),
    VerifyMode    TINYINT        NULL,
    WorkCode      NVARCHAR(20)   NULL,
    Source        VARCHAR(6)     NOT NULL,
    RawPayload    NVARCHAR(1000) NULL,
    ReceivedAtUtc DATETIME2(0)   NOT NULL CONSTRAINT DF_Att_RawPunch_Received DEFAULT (SYSUTCDATETIME()),
    IsMapped      BIT            NOT NULL CONSTRAINT DF_Att_RawPunch_IsMapped DEFAULT (0),
    MapStatus     VARCHAR(10)    NULL,
    CONSTRAINT CK_Att_RawPunch_Source CHECK (Source IN ('push','pull','csv','manual')),
    CONSTRAINT CK_Att_RawPunch_MapStatus CHECK (MapStatus IS NULL OR MapStatus IN ('ok','unknown','ignored')),
    CONSTRAINT UQ_Att_RawPunch UNIQUE (DeviceId, DeviceUserId, PunchLocal, State)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Att_RawPunch_Unmapped')
    CREATE INDEX IX_Att_RawPunch_Unmapped ON dbo.Att_RawPunch (RawId) WHERE IsMapped = 0;
GO
IF OBJECT_ID(N'dbo.Att_DeviceUserMap', N'U') IS NULL
CREATE TABLE dbo.Att_DeviceUserMap (
    MapId        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Att_DeviceUserMap PRIMARY KEY,
    DeviceId     INT           NULL CONSTRAINT FK_Att_DeviceUserMap_Device REFERENCES dbo.Sys_Devices (DeviceId),
    DeviceUserId NVARCHAR(30)  NOT NULL,
    EmpID        INT           NOT NULL,
    ValidFrom    DATE          NOT NULL CONSTRAINT DF_Att_DeviceUserMap_From DEFAULT ('2000-01-01'),
    ValidTo      DATE          NULL,
    CreatedBy    NVARCHAR(100) NULL,
    CreatedAtUtc DATETIME2(0)  NOT NULL CONSTRAINT DF_Att_DeviceUserMap_Created DEFAULT (SYSUTCDATETIME()),
    RowVer       ROWVERSION    NOT NULL,
    CONSTRAINT CK_Att_DeviceUserMap_Dates CHECK (ValidTo IS NULL OR ValidTo >= ValidFrom),
    CONSTRAINT UQ_Att_DeviceUserMap UNIQUE (DeviceId, DeviceUserId, ValidFrom)
);
GO
IF OBJECT_ID(N'dbo.Att_Punch', N'U') IS NULL
CREATE TABLE dbo.Att_Punch (
    PunchId        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Att_Punch PRIMARY KEY,
    CompCode       INT           NOT NULL,
    BranchCode     INT           NULL,
    EmpID          INT           NOT NULL,
    PunchLocal     DATETIME2(0)  NOT NULL,
    PunchUtc       DATETIME2(0)  NULL,
    Direction      CHAR(1)       NULL,
    DeviceId       INT           NULL,
    RawId          BIGINT        NULL,
    Source         VARCHAR(6)    NOT NULL,
    IsManual       BIT           NOT NULL CONSTRAINT DF_Att_Punch_Manual DEFAULT (0),
    ManualReason   NVARCHAR(300) NULL,
    ApprovalStatus VARCHAR(10)   NOT NULL CONSTRAINT DF_Att_Punch_Approval DEFAULT ('approved'),
    ApprovedBy     INT           NULL,
    ApprovedAtUtc  DATETIME2(0)  NULL,
    IsIgnored      BIT           NOT NULL CONSTRAINT DF_Att_Punch_Ignored DEFAULT (0),
    IgnoreReason   VARCHAR(20)   NULL,
    CreatedBy      INT           NULL,
    CreatedAtUtc   DATETIME2(0)  NOT NULL CONSTRAINT DF_Att_Punch_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_Att_Punch_Direction CHECK (Direction IS NULL OR Direction IN ('I','O')),
    CONSTRAINT CK_Att_Punch_Approval CHECK (ApprovalStatus IN ('pending','approved','rejected')),
    CONSTRAINT CK_Att_Punch_Source CHECK (Source IN ('push','pull','csv','manual')),
    CONSTRAINT CK_Att_Punch_ManualReason CHECK (IsManual = 0 OR ManualReason IS NOT NULL)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Att_Punch_Emp')
    CREATE INDEX IX_Att_Punch_Emp ON dbo.Att_Punch (EmpID, PunchLocal) INCLUDE (IsIgnored, ApprovalStatus);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Att_Punch_Raw')
    CREATE UNIQUE INDEX UX_Att_Punch_Raw ON dbo.Att_Punch (RawId) WHERE RawId IS NOT NULL;
GO
IF OBJECT_ID(N'dbo.Att_Shift', N'U') IS NULL
CREATE TABLE dbo.Att_Shift (
    ShiftId          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Att_Shift PRIMARY KEY,
    CompCode         INT           NOT NULL,
    Code             VARCHAR(30)   NOT NULL,
    NameA            NVARCHAR(100) NOT NULL,
    NameE            NVARCHAR(100) NOT NULL,
    StartTime        TIME(0)       NOT NULL,
    EndTime          TIME(0)       NOT NULL,          -- EndTime <= StartTime = cross midnight
    IsFlexible       BIT           NOT NULL CONSTRAINT DF_Att_Shift_Flex DEFAULT (0),
    RequiredMinutes  INT           NULL,
    BreakMinutes     INT           NOT NULL CONSTRAINT DF_Att_Shift_Break DEFAULT (0),
    BreakIsPaid      BIT           NOT NULL CONSTRAINT DF_Att_Shift_BreakPaid DEFAULT (0),
    GraceInMin       INT           NOT NULL CONSTRAINT DF_Att_Shift_GraceIn DEFAULT (0),
    GraceOutMin      INT           NOT NULL CONSTRAINT DF_Att_Shift_GraceOut DEFAULT (0),
    LateFromStart    BIT           NOT NULL CONSTRAINT DF_Att_Shift_LateFromStart DEFAULT (1),
    EarlyInWindowMin INT           NOT NULL CONSTRAINT DF_Att_Shift_EarlyWin DEFAULT (240),
    LateOutWindowMin INT           NOT NULL CONSTRAINT DF_Att_Shift_LateWin DEFAULT (360),
    OtAfterMin       INT           NOT NULL CONSTRAINT DF_Att_Shift_OtAfter DEFAULT (30),
    OtRoundingMin    INT           NOT NULL CONSTRAINT DF_Att_Shift_OtRound DEFAULT (15),
    OtBeforeStart    BIT           NOT NULL CONSTRAINT DF_Att_Shift_OtBefore DEFAULT (0),
    Color            VARCHAR(9)    NULL,
    IsActive         BIT           NOT NULL CONSTRAINT DF_Att_Shift_IsActive DEFAULT (1),
    UpdatedAt        DATETIME2(0)  NOT NULL CONSTRAINT DF_Att_Shift_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy        NVARCHAR(100) NULL,
    RowVer           ROWVERSION    NOT NULL,
    CONSTRAINT UQ_Att_Shift_Code UNIQUE (CompCode, Code),
    CONSTRAINT CK_Att_Shift_Mins CHECK (BreakMinutes >= 0 AND GraceInMin >= 0 AND GraceOutMin >= 0 AND EarlyInWindowMin >= 0
        AND LateOutWindowMin >= 0 AND OtAfterMin >= 0 AND OtRoundingMin >= 0),
    CONSTRAINT CK_Att_Shift_Flex CHECK (IsFlexible = 0 OR RequiredMinutes BETWEEN 1 AND 1440)
);
GO
IF OBJECT_ID(N'dbo.Att_Roster', N'U') IS NULL
CREATE TABLE dbo.Att_Roster (
    RosterId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Att_Roster PRIMARY KEY,
    CompCode    INT           NOT NULL,
    BranchCode  INT           NULL,
    EmpID       INT           NULL,                 -- NULL = all employees of comp/branch
    ShiftId     INT           NULL CONSTRAINT FK_Att_Roster_Shift REFERENCES dbo.Att_Shift (ShiftId),
    PatternJson NVARCHAR(MAX) NULL,                 -- {"anchor":"2026-11-01","days":["DAY","DAY","NIGHT","OFF"]} (shift codes or OFF)
    FromDate    DATE          NOT NULL,
    ToDate      DATE          NULL,
    Priority    INT           NOT NULL CONSTRAINT DF_Att_Roster_Priority DEFAULT (0),
    UpdatedAt   DATETIME2(0)  NOT NULL CONSTRAINT DF_Att_Roster_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy   NVARCHAR(100) NULL,
    RowVer      ROWVERSION    NOT NULL,
    CONSTRAINT CK_Att_Roster_Target CHECK ((ShiftId IS NOT NULL AND PatternJson IS NULL) OR (ShiftId IS NULL AND PatternJson IS NOT NULL AND ISJSON(PatternJson) = 1)),
    CONSTRAINT CK_Att_Roster_Dates CHECK (ToDate IS NULL OR ToDate >= FromDate)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Att_Roster_Scope')
    CREATE INDEX IX_Att_Roster_Scope ON dbo.Att_Roster (CompCode, EmpID, FromDate);
GO
IF OBJECT_ID(N'dbo.Att_Holiday', N'U') IS NULL
CREATE TABLE dbo.Att_Holiday (
    HolidayId   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Att_Holiday PRIMARY KEY,
    CompCode    INT           NOT NULL,
    BranchCode  INT           NULL,
    HolidayDate DATE          NOT NULL,
    NameA       NVARCHAR(100) NOT NULL,
    NameE       NVARCHAR(100) NOT NULL,
    IsPaid      BIT           NOT NULL CONSTRAINT DF_Att_Holiday_Paid DEFAULT (1),
    RowVer      ROWVERSION    NOT NULL,
    CONSTRAINT UQ_Att_Holiday UNIQUE (CompCode, BranchCode, HolidayDate)
);
GO
IF OBJECT_ID(N'dbo.Att_DailySummary', N'U') IS NULL
CREATE TABLE dbo.Att_DailySummary (
    EmpID          INT          NOT NULL,
    WorkDate       DATE         NOT NULL,
    CompCode       INT          NOT NULL,
    BranchCode     INT          NULL,
    ShiftId        INT          NULL,
    DayType        VARCHAR(8)   NOT NULL,
    SchedIn        DATETIME2(0) NULL,
    SchedOut       DATETIME2(0) NULL,
    ActualIn       DATETIME2(0) NULL,
    ActualOut      DATETIME2(0) NULL,
    PunchCount     INT          NOT NULL CONSTRAINT DF_Att_Daily_Punches DEFAULT (0),
    WorkedMin      INT          NOT NULL CONSTRAINT DF_Att_Daily_Worked DEFAULT (0),
    LateMin        INT          NOT NULL CONSTRAINT DF_Att_Daily_Late DEFAULT (0),
    EarlyLeaveMin  INT          NOT NULL CONSTRAINT DF_Att_Daily_Early DEFAULT (0),
    OtMin          INT          NOT NULL CONSTRAINT DF_Att_Daily_Ot DEFAULT (0),
    BreakMin       INT          NOT NULL CONSTRAINT DF_Att_Daily_Break DEFAULT (0),
    IsAbsent       BIT          NOT NULL CONSTRAINT DF_Att_Daily_Absent DEFAULT (0),
    Status         VARCHAR(10)  NOT NULL,
    ExceptionCount INT          NOT NULL CONSTRAINT DF_Att_Daily_Exc DEFAULT (0),
    CalcAtUtc      DATETIME2(0) NOT NULL CONSTRAINT DF_Att_Daily_Calc DEFAULT (SYSUTCDATETIME()),
    CalcRunId      BIGINT       NULL,
    CONSTRAINT PK_Att_DailySummary PRIMARY KEY (EmpID, WorkDate),
    CONSTRAINT CK_Att_Daily_DayType CHECK (DayType IN ('work','weekend','holiday','off')),
    CONSTRAINT CK_Att_Daily_Status CHECK (Status IN ('ok','late','early','absent','incomplete','off','holiday'))
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Att_Daily_Date')
    CREATE INDEX IX_Att_Daily_Date ON dbo.Att_DailySummary (CompCode, WorkDate, BranchCode);
GO
IF OBJECT_ID(N'dbo.Att_Exception', N'U') IS NULL
CREATE TABLE dbo.Att_Exception (
    ExceptionId   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Att_Exception PRIMARY KEY,
    CompCode      INT           NOT NULL,
    EmpID         INT           NULL,
    WorkDate      DATE          NULL,
    DeviceId      INT           NULL,
    DeviceUserId  NVARCHAR(30)  NULL,
    ExType        VARCHAR(20)   NOT NULL,
    Details       NVARCHAR(500) NULL,
    Status        VARCHAR(10)   NOT NULL CONSTRAINT DF_Att_Exception_Status DEFAULT ('open'),
    ResolvedBy    INT           NULL,
    ResolvedAtUtc DATETIME2(0)  NULL,
    CreatedAtUtc  DATETIME2(0)  NOT NULL CONSTRAINT DF_Att_Exception_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_Att_Exception_Type CHECK (ExType IN ('unknown_user','missing_in','missing_out','no_shift','clock_drift')),
    CONSTRAINT CK_Att_Exception_Status CHECK (Status IN ('open','resolved','ignored'))
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Att_Exception_EmpDay')
    CREATE UNIQUE INDEX UX_Att_Exception_EmpDay ON dbo.Att_Exception (EmpID, WorkDate, ExType) WHERE EmpID IS NOT NULL AND Status = 'open';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Att_Exception_DevUser')
    CREATE UNIQUE INDEX UX_Att_Exception_DevUser ON dbo.Att_Exception (DeviceId, DeviceUserId, ExType) WHERE EmpID IS NULL AND Status = 'open';
GO
IF OBJECT_ID(N'dbo.Att_Period', N'U') IS NULL
CREATE TABLE dbo.Att_Period (
    PeriodId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Att_Period PRIMARY KEY,
    CompCode    INT           NOT NULL,
    BranchCode  INT           NULL,
    FromDate    DATE          NOT NULL,
    ToDate      DATE          NOT NULL,
    Status      VARCHAR(8)    NOT NULL CONSTRAINT DF_Att_Period_Status DEFAULT ('open'),
    LockedBy    NVARCHAR(100) NULL,
    LockedAtUtc DATETIME2(0)  NULL,
    RowVer      ROWVERSION    NOT NULL,
    CONSTRAINT CK_Att_Period_Dates CHECK (ToDate >= FromDate),
    CONSTRAINT CK_Att_Period_Status CHECK (Status IN ('open','locked'))
);
GO
IF OBJECT_ID(N'dbo.Att_CsvProfile', N'U') IS NULL
CREATE TABLE dbo.Att_CsvProfile (
    ProfileCode     VARCHAR(30)   NOT NULL CONSTRAINT PK_Att_CsvProfile PRIMARY KEY,
    CompCode        INT           NOT NULL,
    NameA           NVARCHAR(100) NOT NULL,
    NameE           NVARCHAR(100) NOT NULL,
    Delimiter       NCHAR(1)      NOT NULL CONSTRAINT DF_Att_Csv_Delim DEFAULT (N','),
    HasHeader       BIT           NOT NULL CONSTRAINT DF_Att_Csv_Header DEFAULT (1),
    Encoding        VARCHAR(12)   NOT NULL CONSTRAINT DF_Att_Csv_Enc DEFAULT ('utf-8'),
    ColUserId       NVARCHAR(50)  NOT NULL,          -- header name or 1-based index
    ColDateTime     NVARCHAR(50)  NULL,
    ColDate         NVARCHAR(50)  NULL,
    ColTime         NVARCHAR(50)  NULL,
    ColState        NVARCHAR(50)  NULL,
    DateTimeFormat  VARCHAR(40)   NOT NULL CONSTRAINT DF_Att_Csv_Fmt DEFAULT ('yyyy-MM-dd HH:mm:ss'),
    StateMapJson    NVARCHAR(400) NULL,              -- {"C/In":0,"C/Out":1}
    DefaultDeviceId INT           NULL CONSTRAINT FK_Att_Csv_Device REFERENCES dbo.Sys_Devices (DeviceId),
    RowVer          ROWVERSION    NOT NULL,
    CONSTRAINT CK_Att_Csv_Cols CHECK (ColDateTime IS NOT NULL OR (ColDate IS NOT NULL AND ColTime IS NOT NULL)),
    CONSTRAINT CK_Att_Csv_Map CHECK (StateMapJson IS NULL OR ISJSON(StateMapJson) = 1)
);
GO
CREATE OR ALTER PROCEDURE dbo.Att_RebuildViews
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @src SYSNAME, @id SYSNAME, @code SYSNAME, @name SYSNAME, @join NVARCHAR(400), @cols NVARCHAR(400), @sql NVARCHAR(MAX);
    SELECT @src  = MAX(CASE WHEN SettingKey = 'Att.EmployeeSource' THEN SettingValue END),
           @id   = MAX(CASE WHEN SettingKey = 'Att.EmpIdColumn'    THEN SettingValue END),
           @code = MAX(CASE WHEN SettingKey = 'Att.EmpCodeColumn'  THEN SettingValue END),
           @name = MAX(CASE WHEN SettingKey = 'Att.EmpNameColumn'  THEN SettingValue END)
    FROM dbo.Sys_RuntimeSettings WHERE SettingKey LIKE 'Att.%';
    IF @src IS NOT NULL AND OBJECT_ID(N'dbo.' + QUOTENAME(@src)) IS NOT NULL
       AND COL_LENGTH(N'dbo.' + QUOTENAME(@src), @id) IS NOT NULL
       AND COL_LENGTH(N'dbo.' + QUOTENAME(@src), @code) IS NOT NULL
       AND COL_LENGTH(N'dbo.' + QUOTENAME(@src), @name) IS NOT NULL
    BEGIN
        SET @join = N' LEFT JOIN dbo.' + QUOTENAME(@src) + N' e ON e.' + QUOTENAME(@id) + N' = x.EmpID';
        SET @cols = N', CAST(e.' + QUOTENAME(@code) + N' AS NVARCHAR(50)) AS EmpCode, CAST(e.' + QUOTENAME(@name) + N' AS NVARCHAR(200)) AS EmpName';
    END
    ELSE
    BEGIN
        SET @join = N'';
        SET @cols = N', CAST(NULL AS NVARCHAR(50)) AS EmpCode, CAST(NULL AS NVARCHAR(200)) AS EmpName';
    END
    SET @sql = N'CREATE OR ALTER VIEW dbo.IQ_Att_DailySummary AS SELECT x.*' + @cols + N' FROM dbo.Att_DailySummary x' + @join;
    EXEC sys.sp_executesql @sql;
    SET @sql = N'CREATE OR ALTER VIEW dbo.IQ_Att_Exception AS SELECT x.*' + @cols + N', d.Name AS DeviceName FROM dbo.Att_Exception x'
             + @join + N' LEFT JOIN dbo.Sys_Devices d ON d.DeviceId = x.DeviceId';
    EXEC sys.sp_executesql @sql;
    SET @sql = N'CREATE OR ALTER VIEW dbo.IQ_Att_Punch AS SELECT x.*' + @cols + N', d.Name AS DeviceName FROM dbo.Att_Punch x'
             + @join + N' LEFT JOIN dbo.Sys_Devices d ON d.DeviceId = x.DeviceId';
    EXEC sys.sp_executesql @sql;
END
GO
EXEC dbo.Att_RebuildViews;
GO
SET NOEXEC OFF;
GO
```

### 9.6 `Phase11_05_Numbering.sql`
```sql
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_DocSeries', N'U') IS NULL
CREATE TABLE dbo.Sys_DocSeries (
    SeriesId         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_DocSeries PRIMARY KEY,
    DocKey           NVARCHAR(100) NOT NULL,
    CompCode         INT           NOT NULL,
    BranchCode       INT           NULL,
    TerminalDeviceId INT           NULL,
    NameA            NVARCHAR(100) NOT NULL,
    NameE            NVARCHAR(100) NOT NULL,
    Pattern          NVARCHAR(100) NOT NULL,
    ResetPolicy      VARCHAR(8)    NOT NULL CONSTRAINT DF_Sys_DocSeries_Reset DEFAULT ('yearly'),
    StartNo          BIGINT        NOT NULL CONSTRAINT DF_Sys_DocSeries_Start DEFAULT (1),
    Step             INT           NOT NULL CONSTRAINT DF_Sys_DocSeries_Step DEFAULT (1),
    IsGapless        BIT           NOT NULL CONSTRAINT DF_Sys_DocSeries_Gapless DEFAULT (0),
    ValidFrom        DATE          NULL,
    ValidTo          DATE          NULL,
    Priority         INT           NOT NULL CONSTRAINT DF_Sys_DocSeries_Priority DEFAULT (0),
    IsActive         BIT           NOT NULL CONSTRAINT DF_Sys_DocSeries_IsActive DEFAULT (1),
    UpdatedAt        DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_DocSeries_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy        NVARCHAR(100) NULL,
    RowVer           ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_DocSeries_Reset CHECK (ResetPolicy IN ('never','yearly','monthly','daily','finyear')),
    CONSTRAINT CK_Sys_DocSeries_Step CHECK (Step BETWEEN 1 AND 1000 AND StartNo >= 0),
    CONSTRAINT CK_Sys_DocSeries_Pattern CHECK (Pattern LIKE N'%{#%}%'),
    CONSTRAINT CK_Sys_DocSeries_Dates CHECK (ValidTo IS NULL OR ValidFrom IS NULL OR ValidTo >= ValidFrom)
);
GO
IF OBJECT_ID(N'dbo.Sys_DocSeriesCounter', N'U') IS NULL
CREATE TABLE dbo.Sys_DocSeriesCounter (
    SeriesId     INT          NOT NULL CONSTRAINT FK_Sys_DocSeriesCounter_Series REFERENCES dbo.Sys_DocSeries (SeriesId),
    PeriodKey    VARCHAR(10)  NOT NULL,     -- '-' | '2026' | '2026-11' | '2026-11-12' | 'FY2026'
    LastNo       BIGINT       NOT NULL,
    UpdatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_Sys_DocSeriesCounter_Updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Sys_DocSeriesCounter PRIMARY KEY (SeriesId, PeriodKey)
);
GO
IF OBJECT_ID(N'dbo.Sys_DocSeriesBinding', N'U') IS NULL
CREATE TABLE dbo.Sys_DocSeriesBinding (
    TableName            NVARCHAR(128) NOT NULL,
    ColumnName           NVARCHAR(128) NOT NULL,
    DocKey               NVARCHAR(100) NOT NULL,
    CompColumn           NVARCHAR(128) NOT NULL CONSTRAINT DF_Sys_DocSeriesBinding_Comp DEFAULT (N'CompCode'),
    BranchColumn         NVARCHAR(128) NULL CONSTRAINT DF_Sys_DocSeriesBinding_Branch DEFAULT (N'BranchCode'),
    DateColumn           NVARCHAR(128) NULL,
    OverwriteClientValue BIT           NOT NULL CONSTRAINT DF_Sys_DocSeriesBinding_Overwrite DEFAULT (0),
    IsActive             BIT           NOT NULL CONSTRAINT DF_Sys_DocSeriesBinding_IsActive DEFAULT (1),
    RowVer               ROWVERSION    NOT NULL,
    CONSTRAINT PK_Sys_DocSeriesBinding PRIMARY KEY (TableName, ColumnName)
);
GO
CREATE OR ALTER FUNCTION dbo.Sys_FormatDocNo
    (@Pattern NVARCHAR(100), @SeqNo BIGINT, @CompCode INT, @BranchCode INT, @DocDate DATE, @FinYear INT, @TerminalDeviceId INT)
RETURNS NVARCHAR(200)
AS
BEGIN
    DECLARE @r NVARCHAR(400) = @Pattern, @p INT, @e INT, @w INT, @tok NVARCHAR(20), @val NVARCHAR(40), @v2 NVARCHAR(60), @name NVARCHAR(10), @i INT;
    SET @r = REPLACE(@r, N'{YYYY}', CONVERT(NCHAR(4), YEAR(@DocDate)));
    SET @r = REPLACE(@r, N'{YY}',   RIGHT(CONVERT(NCHAR(4), YEAR(@DocDate)), 2));
    SET @r = REPLACE(@r, N'{MM}',   RIGHT(N'0' + CONVERT(NVARCHAR(2), MONTH(@DocDate)), 2));
    SET @r = REPLACE(@r, N'{DD}',   RIGHT(N'0' + CONVERT(NVARCHAR(2), DAY(@DocDate)), 2));
    SET @r = REPLACE(@r, N'{FY}',   CONVERT(NVARCHAR(4), ISNULL(@FinYear, YEAR(@DocDate))));
    SET @i = 1;
    WHILE @i <= 3
    BEGIN
        SET @name = CHOOSE(@i, N'{CO', N'{BR', N'{TERM');
        SET @val  = CHOOSE(@i, CONVERT(NVARCHAR(20), ISNULL(@CompCode, 0)), CONVERT(NVARCHAR(20), ISNULL(@BranchCode, 0)),
                               CONVERT(NVARCHAR(20), ISNULL(@TerminalDeviceId, 0)));
        SET @p = CHARINDEX(@name, @r);
        WHILE @p > 0
        BEGIN
            SET @e = CHARINDEX(N'}', @r, @p);
            IF @e = 0 BREAK;
            SET @tok = SUBSTRING(@r, @p + LEN(@name), @e - @p - LEN(@name));
            SET @w = CASE WHEN @tok = N'' THEN 0 WHEN @tok LIKE N':[1-9]' THEN CAST(RIGHT(@tok, 1) AS INT) ELSE -1 END;
            IF @w < 0 BREAK;                                        -- unknown token: left as text
            SET @v2 = CASE WHEN LEN(@val) < @w THEN REPLICATE(N'0', @w - LEN(@val)) + @val ELSE @val END;
            SET @r = STUFF(@r, @p, @e - @p + 1, @v2);
            SET @p = CHARINDEX(@name, @r, @p + LEN(@v2));
        END
        SET @i += 1;
    END
    SET @p = CHARINDEX(N'{#', @r);
    IF @p > 0
    BEGIN
        SET @e = CHARINDEX(N'}', @r, @p);
        IF @e > 0 AND SUBSTRING(@r, @p + 1, @e - @p - 1) NOT LIKE N'%[^#]%'
        BEGIN
            SET @w = @e - @p - 1;
            SET @val = CONVERT(NVARCHAR(20), @SeqNo);
            SET @v2 = CASE WHEN LEN(@val) < @w THEN REPLICATE(N'0', @w - LEN(@val)) + @val ELSE @val END;
            SET @r = STUFF(@r, @p, @e - @p + 1, @v2);
        END
    END
    RETURN LEFT(@r, 200);
END
GO
CREATE OR ALTER PROCEDURE dbo.Sys_NextDocNo
    @DocKey NVARCHAR(100), @CompCode INT, @BranchCode INT = NULL, @TerminalDeviceId INT = NULL,
    @DocDate DATE = NULL, @FinYear INT = NULL,
    @DocNo NVARCHAR(200) OUTPUT, @SeriesId INT = NULL OUTPUT, @SeqNo BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    SET @DocDate = ISNULL(@DocDate, CAST(GETDATE() AS DATE));
    DECLARE @Pattern NVARCHAR(100), @Reset VARCHAR(8), @Start BIGINT, @Step INT, @PeriodKey VARCHAR(10);
    SELECT TOP (1) @SeriesId = s.SeriesId, @Pattern = s.Pattern, @Reset = s.ResetPolicy, @Start = s.StartNo, @Step = s.Step
    FROM dbo.Sys_DocSeries s
    WHERE s.IsActive = 1 AND s.DocKey = @DocKey AND s.CompCode = @CompCode
      AND (s.BranchCode IS NULL OR s.BranchCode = @BranchCode)
      AND (s.TerminalDeviceId IS NULL OR s.TerminalDeviceId = @TerminalDeviceId)
      AND (s.ValidFrom IS NULL OR s.ValidFrom <= @DocDate) AND (s.ValidTo IS NULL OR s.ValidTo >= @DocDate)
    ORDER BY (CASE WHEN s.TerminalDeviceId IS NOT NULL THEN 4 ELSE 0 END) + (CASE WHEN s.BranchCode IS NOT NULL THEN 2 ELSE 0 END) DESC,
             s.Priority DESC, s.SeriesId DESC;
    IF @SeriesId IS NULL THROW 51010, N'No active numbering series for this document.', 1;
    SET @PeriodKey = CASE @Reset WHEN 'yearly'  THEN CONVERT(CHAR(4), YEAR(@DocDate))
                                 WHEN 'monthly' THEN CONVERT(CHAR(7), @DocDate, 126)
                                 WHEN 'daily'   THEN CONVERT(CHAR(10), @DocDate, 126)
                                 WHEN 'finyear' THEN 'FY' + CONVERT(VARCHAR(4), ISNULL(@FinYear, YEAR(@DocDate)))
                                 ELSE '-' END;
    DECLARE @own BIT = CASE WHEN @@TRANCOUNT = 0 THEN 1 ELSE 0 END;
    IF @own = 1 BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM dbo.Sys_DocSeriesCounter WITH (UPDLOCK, HOLDLOCK) WHERE SeriesId = @SeriesId AND PeriodKey = @PeriodKey)
        INSERT INTO dbo.Sys_DocSeriesCounter (SeriesId, PeriodKey, LastNo) VALUES (@SeriesId, @PeriodKey, @Start - @Step);
    UPDATE dbo.Sys_DocSeriesCounter WITH (UPDLOCK)
       SET @SeqNo = LastNo = LastNo + @Step, UpdatedAtUtc = SYSUTCDATETIME()
     WHERE SeriesId = @SeriesId AND PeriodKey = @PeriodKey;
    IF @own = 1 COMMIT;
    SET @DocNo = dbo.Sys_FormatDocNo(@Pattern, @SeqNo, @CompCode, @BranchCode, @DocDate, @FinYear, @TerminalDeviceId);
END
GO
```

### 9.7 `Phase11_06_CustomFields.sql`
```sql
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_CustomFieldEntity', N'U') IS NULL
CREATE TABLE dbo.Sys_CustomFieldEntity (
    EntityCode VARCHAR(60)   NOT NULL CONSTRAINT PK_Sys_CustomFieldEntity PRIMARY KEY,
    TableName  NVARCHAR(128) NOT NULL,
    ViewName   NVARCHAR(128) NULL,
    KeyColumn  NVARCHAR(128) NOT NULL,
    ModuleCode NVARCHAR(100) NULL,
    NameA      NVARCHAR(100) NOT NULL,
    NameE      NVARCHAR(100) NOT NULL,
    IsActive   BIT           NOT NULL CONSTRAINT DF_Sys_CustomFieldEntity_IsActive DEFAULT (1),
    RowVer     ROWVERSION    NOT NULL,
    CONSTRAINT UQ_Sys_CustomFieldEntity_Table UNIQUE (TableName)
);
GO
IF OBJECT_ID(N'dbo.Sys_CustomFieldDef', N'U') IS NULL
CREATE TABLE dbo.Sys_CustomFieldDef (
    FieldId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_CustomFieldDef PRIMARY KEY,
    EntityCode   VARCHAR(60)    NOT NULL CONSTRAINT FK_Sys_CustomFieldDef_Entity REFERENCES dbo.Sys_CustomFieldEntity (EntityCode),
    FieldCode    VARCHAR(40)    NOT NULL,
    LabelA       NVARCHAR(100)  NOT NULL,
    LabelE       NVARCHAR(100)  NOT NULL,
    FieldType    VARCHAR(10)    NOT NULL,
    IsRequired   BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Req DEFAULT (0),
    MaxLength    INT            NULL,
    MinValue     DECIMAL(18,4)  NULL,
    MaxValue     DECIMAL(18,4)  NULL,
    Regex        NVARCHAR(200)  NULL,
    OptionsJson  NVARCHAR(MAX)  NULL,          -- [{"v":"A","a":"...","e":"..."}]
    LookupJson   NVARCHAR(1000) NULL,          -- {"table":"...","value":"...","label":"..."}
    DefaultValue NVARCHAR(200)  NULL,
    ShowInGrid   BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Grid DEFAULT (1),
    ShowInForm   BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Form DEFAULT (1),
    IsReadOnly   BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_RO DEFAULT (0),
    SortOrder    INT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Sort DEFAULT (0),
    GroupName    NVARCHAR(60)   NULL,
    CompCode     INT            NULL,
    IsActive     BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_IsActive DEFAULT (1),
    UpdatedAt    DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy    NVARCHAR(100)  NULL,
    RowVer       ROWVERSION     NOT NULL,
    CONSTRAINT UQ_Sys_CustomFieldDef UNIQUE (EntityCode, FieldCode),
    CONSTRAINT CK_Sys_CustomFieldDef_Type CHECK (FieldType IN ('text','textarea','int','decimal','date','datetime','bool','select','lookup')),
    CONSTRAINT CK_Sys_CustomFieldDef_Code CHECK (FieldCode NOT LIKE '%[^A-Za-z0-9_]%' AND FieldCode LIKE '[A-Za-z]%'),
    CONSTRAINT CK_Sys_CustomFieldDef_Options CHECK (OptionsJson IS NULL OR ISJSON(OptionsJson) = 1),
    CONSTRAINT CK_Sys_CustomFieldDef_Lookup CHECK (LookupJson IS NULL OR ISJSON(LookupJson) = 1),
    CONSTRAINT CK_Sys_CustomFieldDef_Select CHECK (FieldType <> 'select' OR OptionsJson IS NOT NULL),
    CONSTRAINT CK_Sys_CustomFieldDef_LookupReq CHECK (FieldType <> 'lookup' OR LookupJson IS NOT NULL)
);
GO
IF OBJECT_ID(N'dbo.Sys_RecordExtra', N'U') IS NULL
CREATE TABLE dbo.Sys_RecordExtra (
    EntityCode   VARCHAR(60)   NOT NULL,
    RecordKey    NVARCHAR(100) NOT NULL,
    ExtraJson    NVARCHAR(MAX) NOT NULL,
    UpdatedAtUtc DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_RecordExtra_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy    INT           NULL,
    CONSTRAINT PK_Sys_RecordExtra PRIMARY KEY (EntityCode, RecordKey),
    CONSTRAINT CK_Sys_RecordExtra_Json CHECK (ISJSON(ExtraJson) = 1)
);
GO
```

### 9.8 `Phase11_07_Audit.sql` and `Phase11_08_Modules.sql`
```sql
-- Phase11_07_Audit.sql
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_AuditPolicy', N'U') IS NULL
CREATE TABLE dbo.Sys_AuditPolicy (
    TableName      NVARCHAR(128)  NOT NULL CONSTRAINT PK_Sys_AuditPolicy PRIMARY KEY,
    ModuleCode     NVARCHAR(100)  NULL,
    KeyColumn      NVARCHAR(128)  NULL,
    AuditInsert    BIT            NOT NULL CONSTRAINT DF_Sys_AuditPolicy_I DEFAULT (1),
    AuditUpdate    BIT            NOT NULL CONSTRAINT DF_Sys_AuditPolicy_U DEFAULT (1),
    AuditDelete    BIT            NOT NULL CONSTRAINT DF_Sys_AuditPolicy_D DEFAULT (1),
    ExcludeColumns NVARCHAR(1000) NULL,          -- comma list
    IsEnabled      BIT            NOT NULL CONSTRAINT DF_Sys_AuditPolicy_Enabled DEFAULT (1),
    UpdatedAt      DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_AuditPolicy_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy      NVARCHAR(100)  NULL,
    RowVer         ROWVERSION     NOT NULL
);
GO
```
`Phase11_08_Modules.sql`: inserts the menu group `Menu_Attendance` (`MODULE_TYPE='M'`, same pattern as `Add_CashTypes_Module.sql`) and calls `EXEC dbo.Sys_RegisterModule` for `Att_Daily`, `Att_Exceptions`, `Att_ManualPunch`, `Att_Import` (menu `Menu_Attendance`, `@AllowCustom = 1`) and `Sys_PrintLog` (`@AllowCustom = 1`); idempotent; ends with a check `SELECT … FROM IQ_Sys_RoleModule WHERE MODULE_CODE IN (…)`. Implementer verifies the exact `Sys_RegisterModule` parameters in `Phase4_Permissions.sql`.
`Phase11_99_Verify.sql`: lists every Phase11 object with `OBJECT_ID(...) IS NOT NULL` → `OK/MISSING`, runs the §4.13 vectors through `Sys_FormatDocNo` and prints PASS/FAIL.

### 9.9 ERP Studio migrations
```sql
/* ERP Studio - 005 (wave 1): runtime configuration permissions (idempotent). */
USE [ERP_Studio];
GO
SET NOCOUNT ON;
GO
DECLARE @p TABLE (Code VARCHAR(60), Grp VARCHAR(40), NameEn NVARCHAR(150), NameAr NVARCHAR(150), DescEn NVARCHAR(400), DescAr NVARCHAR(400), Scoped BIT, Sort INT);
INSERT INTO @p VALUES
 ('runtime.view',        'Runtime', N'View runtime settings',  N'عرض إعدادات التشغيل',   N'See devices, printers, attendance, numbering, jobs and audit settings.', N'مشاهدة الأجهزة والطابعات والحضور والترقيم والمهام والسجل.', 1, 800),
 ('device.manage',       'Runtime', N'Manage devices',         N'إدارة الأجهزة',          N'Add and edit bridges, clocks and terminals; send test commands.',     N'إضافة وتعديل الأجسام المحلية والساعات والأجهزة وإرسال أوامر الاختبار.', 1, 810),
 ('device.pair',         'Runtime', N'Pair / revoke bridges',  N'ربط وإلغاء الأجسام',     N'Create pairing codes and revoke bridges.',                            N'عمل كود ربط وإلغاء ربط جسم محلي.', 1, 820),
 ('print.manage',        'Runtime', N'Manage printing',        N'إدارة الطباعة',          N'Printers, routes, stations and label templates.',                     N'الطابعات والتوجيه والمحطات وقوالب الملصقات.', 1, 830),
 ('attendance.manage',   'Runtime', N'Manage attendance',      N'إدارة الحضور',           N'Shifts, roster, holidays, mapping and CSV profiles.',                 N'الورديات والجداول والإجازات والربط وملفات CSV.', 1, 840),
 ('attendance.process',  'Runtime', N'Recalculate attendance', N'إعادة حساب الحضور',      N'Queue attendance processing.',                                        N'تشغيل حساب الحضور.', 1, 850),
 ('attendance.lock',     'Runtime', N'Lock attendance periods',N'قفل فترات الحضور',       N'Lock and unlock attendance periods.',                                 N'قفل وفتح فترات الحضور.', 1, 860),
 ('numbering.manage',    'Runtime', N'Manage numbering',       N'إدارة الترقيم',          N'Document number series and bindings.',                                N'سلاسل ترقيم المستندات وربطها.', 1, 870),
 ('customfields.manage', 'Runtime', N'Manage custom fields',   N'إدارة الحقول الإضافية',  N'Extra fields for screens without changing tables.',                   N'حقول إضافية للشاشات من غير تعديل الجداول.', 1, 880),
 ('jobs.manage',         'Runtime', N'Manage jobs',            N'إدارة المهام المجدولة',  N'Schedules and manual runs of background jobs.',                       N'مواعيد المهام وتشغيلها يدوياً.', 1, 890),
 ('audit.manage',        'Runtime', N'Manage audit policy',    N'إدارة سجل التعديلات',    N'Choose which tables keep change history.',                            N'تحديد الجداول اللي بيتسجل تعديلها.', 1, 900);
MERGE studio.StudioPermission AS t
USING @p AS s ON t.PermissionCode = s.Code
WHEN MATCHED THEN UPDATE SET GroupCode = s.Grp, NameEn = s.NameEn, NameAr = s.NameAr, DescEn = s.DescEn, DescAr = s.DescAr, IsProjectScoped = s.Scoped, SortOrder = s.Sort
WHEN NOT MATCHED THEN INSERT (PermissionCode, GroupCode, NameEn, NameAr, DescEn, DescAr, IsProjectScoped, SortOrder)
                      VALUES (s.Code, s.Grp, s.NameEn, s.NameAr, s.DescEn, s.DescAr, s.Scoped, s.Sort);
GO
;WITH map AS (
    SELECT r.RoleId, p.PermissionCode
    FROM studio.StudioRole r
    JOIN studio.StudioPermission p ON p.GroupCode = 'Runtime' AND (
           r.Code IN ('SuperAdmin','ProjectOwner','AppAdmin')
        OR (r.Code = 'Viewer' AND p.PermissionCode = 'runtime.view'))
)
INSERT INTO studio.StudioRolePermission (RoleId, PermissionCode)
SELECT m.RoleId, m.PermissionCode FROM map m
WHERE NOT EXISTS (SELECT 1 FROM studio.StudioRolePermission x WHERE x.RoleId = m.RoleId AND x.PermissionCode = m.PermissionCode);
GO

/* ERP Studio - 006 (wave 1): history of Studio writes to project databases (idempotent). */
USE [ERP_Studio];
GO
SET NOCOUNT ON;
GO
IF OBJECT_ID(N'studio.RuntimeConfigChange', N'U') IS NULL
CREATE TABLE studio.RuntimeConfigChange (
    ChangeId   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RuntimeConfigChange PRIMARY KEY,
    ProjectId  INT            NOT NULL CONSTRAINT FK_RCC_Project REFERENCES studio.Project(ProjectId),
    EnvId      INT            NOT NULL CONSTRAINT FK_RCC_Env REFERENCES studio.ProjectEnvironment(EnvId),
    UserId     INT            NOT NULL CONSTRAINT FK_RCC_User REFERENCES studio.StudioUser(UserId),
    Area       VARCHAR(20)    NOT NULL,
    TableName  SYSNAME        NOT NULL,
    RecordKey  NVARCHAR(200)  NULL,
    Action     VARCHAR(10)    NOT NULL,
    BeforeJson NVARCHAR(MAX)  NULL,
    AfterJson  NVARCHAR(MAX)  NULL,
    AtUtc      DATETIME2(0)   NOT NULL CONSTRAINT DF_RCC_At DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_RCC_Action CHECK (Action IN ('insert','update','delete','command','pair','revoke','run'))
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RuntimeConfigChange_Project')
    CREATE INDEX IX_RuntimeConfigChange_Project ON studio.RuntimeConfigChange (ProjectId, EnvId, ChangeId DESC);
GO
IF NOT EXISTS (SELECT 1 FROM studio.StudioSetting WHERE [Key] = 'RuntimeContractVersion')
    INSERT INTO studio.StudioSetting ([Key], [Value], IsSecret) VALUES ('RuntimeContractVersion', N'wave1-v1', 0);
GO
```

---

## 10. Test plan

### 10.1 Framework (F)
- New `Tests/ERP.Tests/ERP.Tests.csproj` (xUnit, references `Backend/ERP.csproj`). **Placed outside `Backend/`** so the Web SDK glob does not compile tests into the API.
- Unit: PasswordService, DataApiAuthFilter, SensitiveDataGuard, AdmsProtocol, CsvPunchParser, ShiftEngine (V1–V7), RosterResolver, PunchMapper, PrintTemplateFiller, PairingService (hash vector), DeviceAuthenticationHandler, JobScheduler cron/claim (with fake store).
- DB integration (run when `ERP_TEST_DB` is set; a throwaway DB with Phase11 scripts): route vectors §4.11, numbering vectors §4.13 + 50-way concurrency, audit trigger, custom-field round trip, punch dedupe.
- Frontend: `npx tsc --noEmit`, `npm run build`, ESLint on changed/new files; browser check of Login, a grid screen, SalesInvoice save/print, `Att_Daily`, `Sys_PrintLog` at 375/768/1366 px EN/AR.
- Scripts: `Tools/Checks/Wave0_AuthCheck.ps1`, `Tools/Checks/Wave1_Smoke.ps1` (login → resolve → job → fake bridge → printed; FakeAdmsDevice push → raw rows; process → summary), re-run `WhereLiveCheck.ps1` with a token.

### 10.2 Bridge (F) — §7.12 + manual hardware matrix.

### 10.3 Studio (S) — §8.5; `dotnet test ERP_Studio.sln`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

### 10.4 Integration day checklist (both packages, test DB + one PC with the bridge)
1. Run Phase11_00..08 + 99 (all OK) and Studio 005/006.
2. Studio status page: contract `wave1-v1`, grants preset applied, environment writable.
3. Studio adds a bridge → code → `install.ps1` → green dot ≤ 30 s.
4. Studio Discover → installed printers listed; add receipt printer; Test print prints Arabic.
5. Studio route `POS_Receipt` → till printer, drawer on; runtime POS receipt prints silently, drawer opens, toast arrives.
6. Studio revokes the bridge → offline ≤ 15 s; re-pair works.
7. Studio adds ZK TCP clock on the bridge → Test shows last 5 punches; mapping grid lists device users; map one.
8. FakeAdmsDevice (or real ADMS clock) → punches appear; `att.process` run from Studio → `Att_Daily` rows match V-vectors for seeded punches.
9. Numbering series + binding on a test table → two parallel inserts → consecutive numbers; Studio preview "studio = db".
10. Custom field on a test entity → visible and saved in the runtime grid.
11. Audit policy on a test table → History shows the change; Studio writes visible in `Sys_AuditLog (Source='studio')`.
12. Data API in `Enforce` → all checked screens still work logged in.

---

## 11. Risks (المخاطر)

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **WebView2 inside a Windows service (session 0)** is not an officially supported setup; printing/capture may fail. | A4 and Arabic receipts | First task of F3 is a spike; fallback = user-session renderer agent over a named pipe (§7.6). Raw ESC/POS/ZPL paths do not depend on it. |
| 2 | **ZKTeco TCP protocol** is reverse-engineered; comm-key auth and record formats vary by firmware; full log reads are heavy. | Pull attendance | Clean-room client from MIT docs, test vectors captured from real devices, keep raw data, ADMS as the preferred path, 10–15 min interval, supported-models list. No GPL code copied. |
| 3 | **`ManageDataSQLController` hot-path changes** (guard, audit, extras, numbering) can regress every screen. | All screens | Each step is a no-op without config; feature flags; same response shapes; regression gate (§6.12). |
| 4 | **Turning on data-API auth** breaks an unknown anonymous caller (other app, script, pre-login page). | Outage | `Audit` mode first, log review, `AnonymousQueryTables` escape hatch, then `Enforce`. |
| 5 | **Plain-text password column** may be read by another program sharing the DB. | Login of that program | Plain text kept until the owner sets `ClearPlaintextOnMigrate`; bulk migration is on-demand only. |
| 6 | **IIS hosting**: WebSockets off, app-pool idle shutdown, web garden. | Realtime latency, late jobs, split SignalR groups | SignalR fallback transports; bridge heartbeats keep the site warm; catch-up runs; one worker process (documented owner actions §5.4). |
| 7 | **ADMS reachability / plain HTTP**: clocks may not reach a server that is only on a private network, and send SN in clear text. | Push attendance | SN allow-list, rate limit, IP allow-list, store-only behaviour; W1-6b bridge relay. |
| 8 | **Studio writes to a production DB** directly. | Wrong config live | Environment read-only by default, permissions, SaveTo grants, RowVer conflicts, full change history (`RuntimeConfigChange` + `Sys_AuditLog`), config version reload instead of restarts. |
| 9 | **Contract drift** between parallel teams. | Integration slip | This document is the contract (`wave1-v1`), shared test vectors (§4.11, §4.13, §4.14, §4.5), runtime/Studio contract-version check, integration checklist §10.4. |
| 10 | Duplicate receipts after a crash mid-print. | Customer confusion | `printing → uncertain` rule, never auto-reprint uncertain jobs; reprint is explicit and audited. |
| 11 | Biometric privacy (templates). | Legal | Wave 1 never copies fingerprint/face templates; only user ids/names. |
| 12 | Runtime private key loss (server moved). | Comm keys unreadable | README note; Studio "secrets not set" warning; re-enter in Studio. |

---

## 12. Out of scope for Wave 1 (Wave 2+)
Hikvision ISAPI, Suprema BioStar 2, Anviz (vendors reserved in enums) · IPP/serial transports, PDF printing, bridge loopback API, auto-update and code signing · realtime ZK events (`REG_EVENT`) · central enrollment / template copy · filtering/sorting by custom fields and promotion to real columns · workflow/approvals, notifications (C-06/C-07) · Studio app-users page (must follow §4.4 when built) · `Tools/CreatePageReact` support for the new options · Redis backplane · payroll handoff after period lock.
