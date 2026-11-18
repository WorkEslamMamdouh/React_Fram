# 07 — Research: Printer Routing, Attendance Devices, and New Flexibility Ideas (بحث: توجيه الطباعة، أجهزة البصمة، وأفكار جديدة)

| Item | Value |
|---|---|
| Status | Research and design only. No code was changed. |
| Date | 2026-11-12 |
| Products | Framework runtime `C:\PC\Work\React_Fram` and ERP Studio `C:\PC\Work\ERP_Studio` |
| Inputs read | `CLAUDE.md`, `Docs/Studio/01..06`, `ERP_Studio/README.md`, `ERP_Studio/Docs/*`, Graphify index of `React_Fram` (commit `4feeef3`, 7 days old) for print-related code (`ReportViewer.tsx`, `renderer/print`, `PrintConfigV5`, `PrintExcelTab`) |
| Builds on | `01` section P28 (Device Integration Console) and the "Device Bridge (X5)" note, `01` section 6.3 (printing) and 6.5 (realtime), `02` section 2.5 (the "Studio Connector" idea) |
| Web sources | Listed in section 9. Facts that come from only one third-party source are marked **(verify)**. |

---

## 0. Executive summary

1. **Printer routing (توجيه الطابعات):** build our own **ERP Device Bridge (جسر الأجهزة)**. It is a small .NET 9 Windows Service on each branch PC. It opens an **outbound** secure WebSocket (SignalR) to the framework API, receives print jobs, and prints silently. It prints A4/HTML through an embedded **WebView2** (same Arabic shaping as the browser), raw **ESC/POS** for 80/58 mm receipts (with cash-drawer kick), and raw **ZPL/TSPL** for labels. It prints through the Windows spooler (RAW datatype) or straight to TCP 9100. A rule table `Sys_PrintRoutes` picks the printer. The most specific rule wins: device > user > branch > company > default. Each rule also sets copies, auto-print-on-save and a fallback printer. Studio gets a **Printers & Routing** page. QZ Tray is a good backup option but costs about **$599/year** for silent signed printing. Browser kiosk printing can only reach the default printer, so it suits a single-printer till only.
2. **Attendance (أجهزة الحضور والبصمة):** use a **hybrid** design. (a) The **server** gets a **push receiver** for devices that call out: ZKTeco ADMS/iClock (`/iclock/cdata`, `/iclock/getrequest`), Hikvision ISAPI listening mode (`httpHosts`) and Anviz CrossChex Cloud webhooks. (b) The same **Device Bridge** pulls from LAN-only devices: ZKTeco TCP 4370, the Suprema BioStar 2 local server (REST + WebSocket), and Hikvision `AcsEvent` search. Every source writes into one **raw punch table** that never loses data (unique key = device serial + device user id + time). A mapping table links the device user id to the employee. A **shift engine** then builds daily attendance (late, early leave, overtime, absence) and hands it to HR/payroll.
3. **Wave 1:** the Device Bridge with printer routing, the attendance hub, and five flexibility enablers: realtime hub (SignalR), background jobs, document numbering designer, custom fields, and audit trail. Fix the known `BuildWhereUltraFast` bug first. Device and branch ids such as `= 15` would hit it.

---

## A. Printer routing (توجيه الطباعة)

### A.1 Requirements

| # | Requirement | Notes |
|---|---|---|
| R1 | Choose a printer per **report / screen / document type** | e.g. `SalesInvoice` goes to A4 laser, `POS_Receipt` to the 80 mm thermal, `ItemLabel` to the Zebra |
| R2 | Override per **company / branch / user / device (terminal)** | Cashier 2 in branch 5 prints receipts to "Till-2 Epson" |
| R3 | **Kitchen / station routing** | Order lines are split by item category to station (Grill, Drinks, Dessert), and each station has its own printer |
| R4 | **Silent printing** (no browser dialog) | Mandatory for POS, KDS chits and labels |
| R5 | **Cash drawer kick** | ESC/POS `ESC p m t1 t2` (hex `1B 70 …`). Pin 2 (m=0) or pin 5 (m=1). Timing is in 100 ms units. Common default is `0,120,240` (Epson). |
| R6 | **Auto-print on save** | e.g. a receipt after payment, kitchen chits after "Send order" |
| R7 | **Copies** | e.g. 2 copies of the delivery note, the second with a "COPY / نسخة" watermark |
| R8 | **Fallback printer** | If the primary is offline or out of paper, go to printer B and alert |
| R9 | **Formats** | A4/A5 (HTML/PDF), thermal 80/58 mm (ESC/POS text or raster), labels (ZPL/TSPL/EPL or PDF at label size) |
| R10 | **Arabic on thermal printers** | Most printers lack a good Arabic code page, so render the receipt as an **image** (ESC/POS raster `GS v 0`). This repeats `01` section 6.3. |
| R11 | **Offline / queue** | Jobs must survive a dropped connection and a PC restart, with no duplicate prints |
| R12 | **Print log and reprint** | Who printed what, when and where. Reprint permission (CUSTOM permission). |

### A.2 Approaches compared

| Approach | Silent | Choose printer per job | Raw ESC/POS / ZPL / drawer | Works from phone/tablet | Offline | Cost / license | Verdict |
|---|---|---|---|---|---|---|---|
| **1. Own Device Bridge** (.NET 9 Worker Service, outbound SignalR + optional loopback HTTP) | Yes | Yes (any installed or network printer) | Yes | **Yes**. The job goes through the server to the bridge, so any device can print to the branch printers. | Yes (local SQLite queue) | Our code. Libraries are MIT/BSD (A.4). | **Recommended** |
| **2. QZ Tray** (Java tray app, JS API over localhost WebSocket) | Yes, but only with a signed certificate from the paid tier. The free/demo build shows warning dialogs. | Yes | Yes (raw ESC/POS/ZPL, pixel/PDF) | No. Only the browser on the same PC. | Partial (no server queue) | Official store: Premium Support **$599/yr** (less on multi-year), Company Branded **$2,999/yr**. A third-party listing shows $749 / $3,499 **(verify)**. | Good fallback or quick start. Adds Java and a yearly fee. Does not cover attendance. |
| **3. Browser kiosk printing** (`--kiosk --kiosk-printing`, or the `SilentPrintingEnabled` policy) | Yes | **No**, only the default printer and the last-used settings | No raw commands. No drawer, unless the printer driver opens it. | No | No | Free | Only for a **single-printer till**. Version behaviour varies. The managed policy is reported for Chrome on Windows from v144 **(verify)**. |
| **4. Server-side printing** (API prints to IPP or raw TCP 9100) | Yes | Yes | Yes | Yes | Server queue | Free. SharpIppNext is MIT. | Works **only when the server is on the same LAN** as the printers (single-site on-prem). It cannot reach branch printers behind NAT. Keep it as a "network printer" transport inside the bridge design. |
| **5. Cloud print services** (Google Cloud Print **was shut down at the end of 2020**; commercial relays such as PrintNode) | Yes | Yes | Some | Yes | Vendor | Per-printer subscription | Puts every receipt through a third-party cloud and adds a monthly cost. Not recommended. |
| **6. WebUSB / Web Serial from the browser** | Yes, after a one-time permission | USB devices only | Yes | Chrome/Edge desktop only | No | Free | Fragile on Windows: a USB printer that has a Windows driver usually cannot be claimed by WebUSB. Optional for very small shops only. |

**Why the bridge wins:** one component also solves the other device needs in `01` P28: attendance pull, scales, customer display, lab analyzers. It works from tablets and phones because routing happens on the server. It is the only option with a real queue, fallback, logs and no yearly fee.

### A.3 Recommended architecture: ERP Device Bridge (جسر الأجهزة)

```
 Browser (PC / tablet / phone)                       Framework API (ASP.NET Core 9)
   Save invoice ──► ManageDataSQL ... ──► PrintService.Enqueue(job) ──► Sys_PrintJobs (queued)
   or "Print" button ─► POST api/print/jobs              │ resolve route (Sys_PrintRoutes)
                                                        ▼
                                           SignalR hub /hubs/devices  (group = device:{DeviceId})
                                                        │  wss (outbound from branch, works behind NAT)
 Branch PC ─────────────────────────────────────────────┘
  ERP Device Bridge (Windows Service, .NET 9)
   ├─ Connection: SignalR client, device token, auto-reconnect, heartbeat
   ├─ Local queue: SQLite (jobs, status, retries)  ── survives restart / offline
   ├─ Renderers:
   │    HTML/A4  → WebView2 (offscreen) → PrintAsync(PrinterName, copies, paper)  [same Arabic shaping as browser]
   │    Receipt  → ESC/POS text, or WebView2 capture → bitmap → ESC/POS raster (Arabic safe)
   │    Label    → ZPL / TSPL template fill (raw) or PDF at label size
   │    PDF      → PDFium (BSD) render → spooler
   ├─ Transports: Windows spooler RAW (winspool OpenPrinter/StartDocPrinter "RAW"),
   │              TCP 9100 (raw), IPP (SharpIppNext), serial/COM
   ├─ Devices:    cash drawer kick, printer status (paper/offline when supported)
   ├─ Attendance: pull workers (section B)
   └─ Loopback API http://127.0.0.1:{port} (optional, same-PC fast path / offline POS)
```

**Job flow:**
1. The screen calls `printDocument({ docType, reportCode, row | filters, copies?, printerHint? })`, or the save action has `autoPrint: true`.
2. The API resolves the route (A.5), renders data (`api/Reports/run`), and stores `Sys_PrintJobs` with a **JobId (GUID)**. The JobId is the idempotency key.
3. The hub pushes the job to the bridge group. The bridge stores it locally **before** acknowledging, prints it, then reports `printed` / `failed(reason)`.
4. On failure the bridge retries 3 times with backoff, then sends the job to the **fallback printer**, then raises an alert (realtime toast plus a notification).
5. Jobs that wait longer than the TTL (e.g. 15 min for kitchen chits) expire. This stops stale chits from printing an hour later.

**Offline POS:** when the server is unreachable, the POS page (PWA, idea C-11) posts to the bridge's loopback API with a session token. The bridge prints locally and later uploads the print log. Plan for Chrome's newer permission checks on requests from a public site to loopback/private addresses **(verify current Chrome rules)**. The outbound SignalR path avoids this for the online case.

### A.4 Libraries (all permissive)

| Need | Library | License | Notes |
|---|---|---|---|
| ESC/POS commands, drawer | **ESC-POS-.NET** (lukevp) | MIT | Serial/USB (virtual COM)/Ethernet/WiFi, drawer pin 2/5. No releases are listed and 87 issues are open, so we may wrap or fork it. |
| IPP to network printers | **SharpIppNext** | MIT | IPP 1.0–2.2, netstandard2.0 + net10.0, no dependencies |
| HTML render + print | **Microsoft Edge WebView2** (runtime ships with Windows 10/11) | Microsoft runtime, free to redistribute | `CoreWebView2.PrintAsync(settings)` with printer name, copies and paper size. Same engine as the runtime viewer, so Arabic and RTL match the screen. |
| PDF render | PDFium (via a .NET wrapper) | BSD-3 (PDFium) | Check the wrapper's license |
| Local queue | Microsoft.Data.Sqlite | MIT | |
| Service host | .NET Worker Service + `Microsoft.Extensions.Hosting.WindowsServices` | MIT | Installed as a Windows Service with an MSI (WiX, MS-RL) or a signed self-installer |
| Realtime | ASP.NET Core SignalR client | MIT | Already planned in `01` section 6.5 |

Raw printing to an installed printer uses the Win32 `winspool.drv` API (`OpenPrinter` → `StartDocPrinter` with datatype `"RAW"` → `WritePrinter`). The standard Microsoft "RawPrinterHelper" pattern needs no extra library.

### A.5 Data model in the target DB (written by Studio, read by the runtime)

| Table | Key columns |
|---|---|
| `Sys_Devices` (shared with attendance) | `DeviceId`, `CompanyId`, `BranchId`, `DeviceKind` ('bridge','printer','attendance','scale','display'), `Name`, `TokenHash`, `PairedAt`, `LastSeenAt`, `AgentVersion`, `TimeZoneId`, `IsActive` |
| `Sys_Printers` | `PrinterId`, `BridgeDeviceId`, `Name`, `Kind` ('a4','receipt80','receipt58','label','kitchen'), `Transport` ('spooler','tcp9100','ipp','serial'), `Target` (Windows printer name / `ip:port` / URL / COM), `Language` ('html','escpos','escpos-raster','zpl','tspl'), `PaperWidthMm`, `Dpi`, `HasDrawer`, `DrawerPin`, `CodePage`, `IsActive` |
| `Sys_PrintRoutes` | `RouteId`, `DocKey` (ReportCode or `MODULE_CODE` or doc type, `*` allowed), `Station` (kitchen station code, nullable), `CompanyId`, `BranchId`, `UserId`, `DeviceId` (terminal), all nullable (null = any), `PrinterId`, `FallbackPrinterId`, `Copies`, `AutoPrintOnSave`, `OpenDrawer`, `LayoutCode` (override the report layout, e.g. 58 mm variant), `Priority`, `IsActive` |
| `Sys_PrintStations` + `Sys_ItemStationMap` | Station codes and item-category-to-station mapping for kitchen/bar splitting |
| `Sys_PrintJobs` | `JobId` GUID, `DocKey`, `RecordKey`, `PrinterId`, `Copies`, `PayloadRef`, `Status` ('queued','sent','printed','failed','expired','fallback'), `Attempts`, `Error`, `CreatedBy`, `CreatedAt`, `PrintedAt`, `IsReprint` |

**Resolution rule:** the rule with the highest specificity wins (DeviceId=4, UserId=3, BranchId=2, CompanyId=1, exact DocKey +8 over `*`), then `Priority`. This follows the permission precedence the team already uses ("user row beats role row").

**Terminal identity:** each browser or tablet gets a **terminal id** when it is registered once (stored in localStorage plus a server row). Device-level routes then work for phones and tablets too.

### A.6 Security

| Topic | Design |
|---|---|
| Pairing | An admin clicks "Add bridge" in Studio (or in the runtime for branch managers with a CUSTOM permission) and gets a **6-digit code valid 10 minutes**. The installer asks for the server URL and the code. The server exchanges it for a random 256-bit **device secret**. Only its SHA-256 hash is stored (`TokenHash`). The bridge stores it with Windows DPAPI (LocalMachine). |
| Channel | Outbound **WSS only** (TLS 1.2+). The device token is sent in the SignalR access token. The hub authorizes per device and joins only `device:{id}` and its company/branch. Revoking or rotating the token in Studio disconnects the bridge at once. |
| Job integrity | Jobs come only from the server, through the authenticated channel. The bridge never accepts arbitrary commands, only the job types it knows. It accepts no file paths and no shell commands. |
| Loopback API | Binds to `127.0.0.1` only. It needs a short-lived token issued by the server to the logged-in user for that terminal and checks `Origin` against the allowed app origin (no `*`). It is off by default. |
| Updates | The installer and updates are code-signed. The bridge auto-updates from a signed manifest and checks the hash. |
| Audit | Pairing, revocation, reprints and drawer kicks without a sale go to the audit trail (idea C-05). |

### A.7 Studio configuration (Printers & Routing page / صفحة الطابعات والتوجيه)

1. **Bridges (الأجسام المحلية):** a list with an online dot, last seen, version, branch, and buttons Pair / Rotate token / Revoke.
2. **Printers:** "Discover" asks the bridge for installed Windows printers and scans the LAN for port 9100/IPP. The user picks a kind (A4 / receipt 80 / receipt 58 / label / kitchen) and clicks **Test print**, which prints a sample page with Arabic text, a barcode and a QR code, and can open the drawer.
3. **Routes:** a rule grid with columns *Document · Company · Branch · User · Terminal · Station → Printer · Fallback · Copies · Auto-print · Drawer · Layout*. It has an "Effective printer" tester: pick a user, terminal and document, and it shows the winning rule and why.
4. **Kitchen stations:** stations plus drag-and-drop mapping of item categories to stations.
5. **Screen builder link:** the Print/Excel tab (today's `PrintConfigV5`, `PrintExcelTab`) adds a "Doc key", "Auto-print on save" and "Default copies". The generated `onPrint` calls `printDocument`. If no route or bridge exists, it falls back to the current `openReport` viewer (backward compatible).

---

## B. Attendance and fingerprint devices (أجهزة الحضور والبصمة)

### B.1 Device families

| Vendor / family | Integration methods | Realtime | Enrollment | Notes |
|---|---|---|---|---|
| **ZKTeco standalone (TCP)** | Pull over **TCP/UDP 4370** with the vendor **zkemkeeper** COM SDK (Windows only, needs DLL registration, watch x86/x64), or the reverse-engineered protocol | Realtime events while connected (SDK `OnAttTransactionEx`) | Set user, card and password. Copy fingerprint templates between devices. | Open-source clients exist in **Python (openzk, MIT; pyzk)** and **Node (zkteco-js MIT, zkteco-terminal MIT)**. No well-maintained **MIT C#** library was found. NuGet `BiometricZktecoDeviceCommunication` is MIT but depends on a vendor SDK package of unknown license. **Plan: write our own small C# client** from the documented community protocol notes, or use ADMS. |
| **ZKTeco ADMS / iClock "PUSH SDK"** | The device calls **our server** over HTTP: `/iclock/cdata` (handshake + `ATTLOG`/`OPERLOG` upload), `/iclock/getrequest` (command polling / heartbeat), `/iclock/devicecmd` (command results) | Yes. Punches arrive within seconds. | Server queues commands (`DATA UPDATE USERINFO`, delete user, set time, reboot) and returns them on `getrequest` | No public official spec. ZKTeco has a 2012 "General Introduction of PUSH SDK" PDF. Endpoint behaviour is confirmed by several open-source servers (Laravel/Odoo packages). Many firmwares use **plain HTTP** and identify by **serial number (SN)** only, so protect it (B.5). |
| **Suprema BioStar 2** | Devices talk to the BioStar 2 **server**. We integrate with its **API**: REST JSON (`POST /api/login` → `bs-session-id`, `POST /api/events/search` with ISO-8601 dates) and a **WebSocket** for realtime events | Yes (WebSocket. Suprema recommends it over REST polling for live logs.) | REST user APIs (users, cards, fingerprints) | "New Local API" since BioStar 2.7.10. Check the API licensing policy per site (Suprema publishes an API license policy). |
| **Hikvision access control / face terminals (ISAPI)** | (a) **Listening mode**: configure `/ISAPI/Event/notification/httpHosts` so the terminal POSTs events to our URL. (b) **Pull**: `POST /ISAPI/AccessControl/AcsEvent?format=json` with time range and paging | Yes (listening mode) | `/ISAPI/AccessControl/UserInfo/Record`, face/card/fingerprint data endpoints | Capability varies by model and firmware: check `httpHosts/capabilities` first. A 2026 report says `serialNo` paging is **not** a safe completeness check, so de-duplicate by our own key and re-pull overlapping windows. Digest auth. |
| **Anviz** | **CrossChex Cloud**: token API (API key + secret, regional base URL) plus **webhooks** that push attendance. On-prem CrossChex has a vendor SDK. | Yes (webhook) | Via CrossChex | API access may need "developer mode" enabled per account, and the documentation is thin. |
| **Generic / others** (eSSL, Realand, Virdi, etc.) | **CSV/Excel import** with a column mapper, or an exported database file | No | Manual | Many eSSL devices are ZKTeco ADMS-compatible. |

### B.2 Recommended architecture: hybrid "Attendance Hub" (مركز الحضور)

```
  PUSH devices (internet-capable)                 PULL devices (LAN only)
  ZK ADMS ─┐  Hikvision httpHosts ─┐  Anviz webhook ─┐      ZK TCP 4370 ─┐  BioStar2 server ─┐  Hikvision AcsEvent ─┐
           ▼                       ▼                 ▼                   ▼                    ▼                      ▼
  Framework API: /iclock/*, /api/att/hik/{deviceKey}, /api/att/anviz/{key}     ERP Device Bridge (branch PC): pull workers
  (Attendance Push Receiver — thin, writes raw + returns fast)                   every N min + realtime where supported,
           │                                                                     uploads batches over SignalR/HTTPS
           └──────────────────────────────┬──────────────────────────────────────┘
                                          ▼
              Att_RawPunch (append-only, unique: DeviceId + DeviceUserId + PunchLocalTime [+ verify mode])
                                          ▼  mapping (Att_DeviceUserMap / EnrollNo = EmployeeCode)
              Att_Punch (EmployeeId, PunchUtc, PunchLocal, Direction, DeviceId, Source, IsManual, IsIgnored)
                                          ▼  background job (Wave 1 idea C-02) / on demand
              Shift engine → Att_DailySummary (scheduled in/out, actual, late, early, OT, absence, exceptions)
                                          ▼  period close
              HR / Payroll handoff (overtime hours, deductions, leave reconciliation) — read-only after lock
```

**Why hybrid:** push gives realtime with no software at the branch, which is best for cloud-hosted customers. Many installed clocks are LAN-only or have old firmware, and BioStar 2 runs on the customer's own server. The bridge that A already needs covers those cases at no extra install cost.

### B.3 Data model

| Table | Purpose / key columns |
|---|---|
| `Sys_Devices` (shared) | `DeviceKind='attendance'`, `Vendor` ('zk','zk-adms','biostar2','hikvision','anviz','csv'), `SerialNo`, `Host`, `Port`, `CommKeyEnc`/`ApiUserEnc`/`ApiPassEnc`, `BranchId`, `TimeZoneId` (IANA or Windows id), `DirectionMode` ('in','out','both','by-state'), `PullIntervalMin`, `LastPunchAt`, `LastSyncAt`, `PushKey` (random URL secret for webhooks) |
| `Att_RawPunch` | `RawId`, `DeviceId`, `DeviceUserId` (string), `PunchLocal` (device time, no zone), `PunchUtc` (computed with the device time zone), `VerifyMode` (finger/face/card/pwd), `State` (in/out/break), `WorkCode`, `RawPayload`, `ReceivedAt`, `Source` ('push','pull','csv','manual'). **UNIQUE**(`DeviceId`,`DeviceUserId`,`PunchLocal`,`State`). |
| `Att_DeviceUserMap` | `DeviceId` (nullable = all devices), `DeviceUserId`, `EmployeeId`, `ValidFrom`, `ValidTo`. A user id that is reused after an employee leaves stays correct because of the dates. |
| `Att_Punch` | Clean punches per employee. Manual punches need a reason and an approver. Ignored double taps are kept but flagged. |
| `Att_Shift`, `Att_ShiftRule`, `Att_Roster` | Shift times, cross-midnight flag, grace minutes, break rules, OT thresholds (daily/weekly), rounding, weekend/holiday calendar, flexible-hours mode. Roster = employee/group to shift by date range or rotation pattern. |
| `Att_DailySummary`, `Att_Exception` | Daily results and exceptions (missing out, single punch, unknown device user) for an exception inbox (pattern P16) |
| `Att_Command` | Queue of device commands (enroll, delete, set time) with status. Used by ADMS `getrequest` and by bridge workers. |

### B.4 Rules that make it correct

| Topic | Rule |
|---|---|
| Duplicates | (1) DB unique key on the raw table, so re-pulls and retries are harmless. (2) A configurable **double-tap window** (default 2 min) marks repeats as ignored, not deleted. (3) Pulls overlap the last window by 10 minutes on purpose. |
| Time zones | Devices store **local time without a zone**. Each device has a time zone. Store both local and UTC. Daily attendance uses the **branch's local date**. The server sends **set time** commands daily (ADMS command / SDK `SetDeviceTime`) and logs clock drift greater than 2 min as a warning. |
| Cross-midnight shifts | Assign a punch to the shift whose window (start − X h, end + Y h) contains it, not to the calendar date. |
| Direction | Use the device state if it is reliable. Otherwise first-in/last-out per shift, or alternate. This is configurable per device. |
| Mapping | Default auto-match: `DeviceUserId = Employee.EmployeeCode` (or `AttendanceNo` column). Unknown ids go to an exception list with a "map to employee" action. Mappings are per device or global. |
| Multi-branch | Employees can punch at any branch. The device's branch is stored on each punch for reports and visit tracking. |
| Enrollment | Two modes: (a) **enroll on the device**. HR enters the employee code as the device user id, and the server only syncs names. (b) **central enrollment**. The server pushes the user (and card/PIN) to selected devices through commands, and copies fingerprint/face templates from the first device to the others. Templates are vendor-specific. |
| Privacy | Fingerprint and face templates are **sensitive biometric data**. Egypt's Personal Data Protection Law (No. 151 of 2020) and Saudi PDPL both treat biometrics as sensitive. Prefer keeping templates **on devices only**. If they are copied, encrypt them at rest, limit access with a permission, keep a consent record, and add a delete-on-termination job. **(Get legal confirmation for each country.)** |
| HR handoff | After the attendance **period is locked**, publish totals (worked hours, OT by rate class, late minutes, absences) to payroll inputs. Later edits need an unlock with an audit entry. |

### B.5 Security of the push receiver

- ADMS devices often support only HTTP and identify themselves by SN. Accept **only registered SNs**, optionally limit source IPs, put the receiver on its own path with rate limits, and **never** let a device command change anything except its own punches and command results. Offer a **"terminate TLS at a branch bridge"** option (the bridge acts as the local ADMS server and relays over WSS) for customers who refuse plain HTTP over the internet.
- Hikvision and Anviz webhooks use a **secret path key** (`/api/att/hik/{PushKey}`) plus the device serial check. Every receiver writes raw rows, returns 200 quickly, and leaves processing to a background job.

### B.6 Studio configuration (Devices & Attendance / الأجهزة والحضور)

1. **Devices:** add a device with a vendor wizard. *ZKTeco ADMS* shows the exact server URL/port to type on the clock. *ZKTeco TCP* asks for IP, port 4370, comm key and which bridge. *BioStar 2* asks for server URL, API user and the bridge. *Hikvision* asks for IP and credentials, then Studio sets `httpHosts` itself when the capability exists. *Anviz* asks for the API key, secret and region. *CSV* opens a column mapper. Each device has a **Test** button (connect, read device info, read the last 5 punches) and a live status dot.
2. **User mapping:** a grid of device users next to employees, with auto-match, bulk map and "push employee to device".
3. **Shifts & rules designer:** shift cards with a visual timeline, grace and OT settings, rotation patterns, holidays.
4. **Processing:** schedule (every 15 min or nightly), recalculate a period, lock a period.
5. **Screen templates** (generated by the builder): Daily attendance, Exceptions inbox, Manual punch request + approval, Monthly timesheet report, Late/OT report.

---

## C. More ideas for flexibility ("works for any business") (أفكار إضافية للمرونة)

Effort: **S** ≤ 1 week, **M** 2–4 weeks, **L** > 1 month (one developer). Product: **F** framework runtime, **S** Studio, **F+S** both.

| ID | Idea (Arabic) | Value | Effort | Product | Dependencies |
|---|---|---|---|---|---|
| C-01 | **Realtime hub — SignalR** (التحديث اللحظي) | Live KDS, floor plans, inboxes, print-job status, device status. Required by A and B. Groups per `company:branch:channel`, snapshot + deltas (as in `01` 6.5). | M | F | IIS WebSockets enabled; JWT for hubs |
| C-02 | **Background jobs & scheduler** (المهام المجدولة) | Attendance processing, report emails, e-invoice submission retries, cleanup, recurring documents. Hangfire core is LGPL-3.0 (commercial use allowed; Pro is paid) or Quartz.NET (Apache-2.0). Studio has a "Jobs" page with cron, last run, logs. | M | F+S | DB tables for job store |
| C-03 | **Document numbering designer** (مصمم ترقيم المستندات) | Patterns like `INV-{BR}-{YYYY}-{#####}` per doc type/company/branch/year/terminal, reset policy, offline blocks for POS, gapless option (ETA/ZATCA). | S–M | F+S | Concurrency-safe sequence (`sp_getapplock` or SQL `SEQUENCE`) |
| C-04 | **Custom fields without schema change** (حقول إضافية بدون تعديل القاعدة) | Admin adds "Car plate" to customers. Stored in `Sys_CustomFieldDef` + one `ExtraJson NVARCHAR(MAX)` column per table (SQL `JSON_VALUE` for filters, computed+indexed columns for hot fields). Rendered automatically by `DynamicGrid`/`MasterDetail`. | M | F+S | Components read field defs; Validation.ts support |
| C-05 | **Audit trail & record history** (سجل التعديلات وتاريخ السجل) | Who changed what (old → new) per field, restore a version, "History" tab on every record. Captured centrally in `ManageDataSQLController` (one place for all writes). SQL temporal tables are an option for key tables. | M | F | Central write path (already exists) |
| C-06 | **Workflow / approval designer** (مصمم سير العمل والموافقات) | Statuses, transitions, approver rules (role, manager, amount > X), SLA/escalation, delegation, approve from notification. Feeds the Approval Inbox (P16) and Kanban (P06). | L | F+S | C-01, C-07, C-02 |
| C-07 | **Notifications center** (مركز الإشعارات) — in-app, email (SMTP/MailKit MIT), SMS (local gateways), **WhatsApp Business Cloud API**, Web Push | Template designer with placeholders `{Customer.Name}`, per-event rules, user preferences, delivery log, retry. WhatsApp business-initiated messages need pre-approved templates and are billed per message by Meta. | M | F+S | C-02; ExternalApis (keys) |
| C-08 | **Formula & computed fields** (حقول محسوبة بمعادلات) | Excel-like expressions (`Qty * Price * (1 - Disc/100)`) evaluated the same way on client and server. One small expression engine shared by the screen builder, report designer and validations. Avoids DB computed columns for business logic. | M | F+S | Report designer formula builder already exists (reuse) |
| C-09 | **Multi-currency & tax engine** (تعدد العملات ومحرك الضرائب) | Exchange rates by date, document currency vs base currency, tax groups (VAT, table tax, withholding), inclusive/exclusive prices, rounding rules per country. | L | F | C-04 for extra tax attributes |
| C-10 | **E-invoicing connectors: Egypt ETA (e-invoice + e-receipt), Saudi ZATCA Phase 2** (الفاتورة والإيصال الإلكتروني) | Mandatory for many customers. ETA: signing (USB token/HSM for invoices; e-receipts need POS registration per outlet, UUID chain, QR), preprod vs prod endpoints. ZATCA: UBL 2.1 XML, CSID onboarding, clearance (B2B) / reporting (B2C), QR, cryptographic stamp. Waves 23 and 24 (2026) are past; a Wave 25 notice (SAR 187,500 threshold, due 2027-02-01) appears in one source **(verify)**. | L | F (+S config) | C-02 (retry queue), C-03 (gapless numbers), C-09, bridge for USB signing token |
| C-11 | **Mobile PWA + offline** (تطبيق موبايل بدون إنترنت) | Static export already fits a service worker. Offline POS, stock count and driver tasks (`01` 6.6) with IndexedDB queues and client GUIDs. Install to home screen. | L | F | C-03 (offline series), C-01 |
| C-12 | **Barcode / QR / RFID scanning** (قراءة الباركود والـ QR) | Camera scanning in the browser (ZXing-js, Apache-2.0, or the native `BarcodeDetector` where available). Scale-barcode parsing (prefix 2x + PLU + weight/price), GS1 parsing. RFID through keyboard-wedge readers or the bridge. | S–M | F | none |
| C-13 | **Weighing scales** (الموازين) | Serial protocols through the bridge (live weight into a field), or label-printing scales feeding scale barcodes (C-12). | M | F | Device Bridge |
| C-14 | **Payment terminals** (أجهزة الدفع بالبطاقة) | ECR integration through the bridge (vendor SDK per bank/terminal in Egypt and KSA), amount push, result pull, reconciliation report. No card data ever touches our system. | L (per vendor) | F | Device Bridge, C-05 |
| C-15 | **Customer display / kiosk / TV** (شاشة العميل والكشك) | Second-screen web page synced through SignalR (cart, total, QR to pay, ads). Kiosk mode with device token (P17/P27). | S–M | F | C-01, terminal identity (A.5) |
| C-16 | **Attachments & file store** (المرفقات والملفات) | Attach to any record, camera capture, preview, versioning. Storage provider is pluggable (disk / SQL FILESTREAM / S3-compatible), with virus-scan hook and size quotas. | M | F | C-05 |
| C-17 | **Import / export templates** (قوالب الاستيراد والتصدير) | Excel/CSV mapper (P30) with validation preview, dry run, upsert by key, error file download. Saved templates per screen. Master-detail import. | M | F+S | Validation.ts reuse |
| C-18 | **Dashboards designer** (مصمم لوحات المؤشرات) | KPI tiles, charts, tables from allowed procs/views, filters shared across widgets, per-role dashboards, drill-down to screens. | L | S (design) + F (render) | Report data API (`api/Reports/run`) |
| C-19 | **API connectors & webhooks** (الربط مع الأنظمة الخارجية) | Outbound webhooks on events (record saved, status changed) with HMAC signature and retries. Inbound generic REST endpoints per screen with API keys and scopes. Connector templates (Shopify, WooCommerce, accounting, SMS). | M–L | F+S | C-02, existing ExternalApis |
| C-20 | **AI assistant for building screens and reports from plain Arabic** (مساعد ذكاء اصطناعي لبناء الشاشات بالعربي) | "عايز شاشة فواتير مشتريات فيها المورد والأصناف والضريبة" → the assistant proposes a ScreenConfig v5 / rf-report JSON from **allowed DB objects only**, which then goes through the normal validator, preview and PR. It never runs SQL. | M–L | S | Screen schema + validator (exist), DbObjectGrant filter |
| C-21 | **Plugin / extension model** (نظام الإضافات) | Signed packages that add screens (generated code), SQL scripts, report layouts, connectors and bridge drivers. Has a manifest with framework version range. Installed and uninstalled from Studio as one PR. | L | F+S | Versioned codegen (`02` 2.6) |
| C-22 | **Screen & report versioning with rollback** (إصدارات الشاشات والرجوع) | Git already stores history. Add a Studio "History" view per screen with a visual diff of `.studio.json`, and "Restore this version" (new PR). | S–M | S | Exists partly (PRs) |
| C-23 | **Staging vs production environments in Studio** (بيئة تجربة وبيئة تشغيل) | Publish to a `staging` branch + test DB first, then "Promote to production" (merge + run registration scripts on the prod environment). `ProjectEnvironment` already models environments. | M | S | CI/CD in project repo (optional) |
| C-24 | **Per-tenant theming & branding** (هوية بصرية لكل شركة) | Logo, colours, fonts, print header/footer per company/branch, as CSS tokens in the DB. Applies to screens, POS, TV and reports. | S–M | F+S | Design tokens (Stitch) |
| C-25 | **Row-level & field-level security** (صلاحيات على مستوى الصف والحقل) | Own branch / own records / assigned only. Hide cost price from the cashier. Manager PIN override for void/discount. Extends `IQ_Sys_RoleModule` with policy rows. Applied centrally in `SQLServer.cs` queries. | M–L | F+S | Fix `BuildWhereUltraFast` first |
| C-26 | **Localization quality (RTL, digits, Hijri, amounts in words)** (جودة العربي والاتجاه) | CSS logical properties lint, Arabic-Indic digits option, Hijri display, tafqeet (amount in words AR/EN) shared by screens and reports, bilingual print layouts. | S–M | F | none |
| C-27 | **Accessibility (WCAG 2.2 AA)** (سهولة الاستخدام لذوي الاحتياجات) | Keyboard navigation in grids, focus order, ARIA on generated components, contrast checks in the Studio theme editor. Also helps government/enterprise tenders. | M | F+S | Component library |
| C-28 | **Performance at scale** (الأداء مع البيانات الكبيرة) | Server-side paging/filtering everywhere (already started), keyset pagination for big tables, async export jobs (C-02), read-replica connection for reports, query plan regression tests, response caching of lookups, indexes advisor in Studio from `sys.dm_db_missing_index_*`. | M (ongoing) | F+S | C-02 |
| C-29 | **Multi-company / branch / fiscal-year scoping as metadata** (تعدد الشركات والفروع كإعداد) | Studio marks a table as "company-scoped" or "branch-scoped" once. The runtime then injects the filter and default values everywhere. This removes repeated hand-coding and is a big "any business" enabler. | M | F+S | C-25 |
| C-30 | **Business templates / vertical packs** (حزم جاهزة لكل نشاط) | One-click installation of a vertical (restaurant, clinic, retail, HR): tables, screens, reports, print routes, attendance rules, roles. Built on C-21 and the existing Templates gallery. | L | S | C-21, most Wave 1–2 items |
| C-31 | **Health & telemetry console** (مراقبة صحة النظام) | Devices online/offline, failed print jobs, push receiver errors, job failures, slow queries, alert by notification. | S–M | F+S | C-01, C-02, C-07 |
| C-32 | **Secure password storage in the runtime** (تشفير كلمات المرور) | `Sys_Users.USER_Password` is plain text today (`02` 1.2). Hash with PBKDF2/Argon2 and migrate on next login. A prerequisite for selling to larger customers. | S | F+S | Login + Studio app-users page |

---

## D. Roadmap (خطة التنفيذ)

### Wave 0 — prerequisites (do first, small)
| Item | Why |
|---|---|
| Fix `BuildWhereUltraFast` `"= 1"` replace bug | Device, printer, branch and route ids (`= 15`, `= 12`) would be corrupted in filters |
| C-32 hashed passwords | Security baseline before exposing device and push endpoints |
| Enable WebSockets on IIS for the runtime site | Needed by SignalR (C-01) |

### Wave 1 — must do now
| # | Item | Effort | Notes |
|---|---|---|---|
| 1 | **C-01 Realtime hub (SignalR)** | M | Foundation for bridge, KDS, inbox, device status |
| 2 | **C-02 Background jobs & scheduler** | M | Attendance processing, print TTL/expiry, retries |
| 3 | **ERP Device Bridge v1** (A.3) with pairing, local queue, auto-update | L | Shared by printing and attendance pull |
| 4 | **Printer routing** (A.5 tables, `printDocument` API, route resolver, ESC/POS + raster Arabic receipts, ZPL labels, WebView2 A4, drawer, copies, fallback, auto-print) + Studio "Printers & Routing" page | L | Keep `openReport` viewer as fallback |
| 5 | **Attendance hub** (B.2–B.4): ZK ADMS receiver + ZK TCP pull via bridge + CSV import first; Hikvision listening + BioStar 2 + Anviz next in the same wave if time allows | L | Start with ZKTeco (most common locally) |
| 6 | **Studio "Devices & Attendance"** page + shift/rules designer + screen templates | M | |
| 7 | **C-03 Document numbering designer** | S–M | Needed by POS offline and e-invoicing |
| 8 | **C-04 Custom fields** | M | Biggest "any business" enabler with lowest risk |
| 9 | **C-05 Audit trail** | M | Needed for reprints, manual punches, approvals |

### Wave 2 — next
C-07 Notifications · C-06 Workflow/approvals · C-10 ETA + ZATCA connectors (with C-09 tax/currency) · C-12 Barcode/QR scanning · C-15 Customer display · C-16 Attachments · C-17 Import/export templates · C-25 Row/field security + C-29 scoping metadata · C-22 Versioning UI · C-23 Staging → production · C-31 Health console.

### Wave 3 — later
C-11 PWA offline · C-13 Scales · C-14 Payment terminals · C-18 Dashboards designer · C-19 Connectors & webhooks · C-20 AI assistant · C-21 Plugin model · C-30 Vertical packs · C-24 Theming · C-26/C-27 localization and accessibility hardening · C-28 Performance program (ongoing from Wave 1).

### Main risks
| Risk | Mitigation |
|---|---|
| Device firmware differences (ADMS/ISAPI vary by model) | A device "capability probe" on Test. Keep a supported-models list from real tests. |
| No official public ADMS spec | Build against real devices and open-source references. Keep the raw payload for re-parsing. |
| Bridge install/maintenance at many branches | Signed MSI, auto-update, health console (C-31), remote log upload |
| Biometric privacy law | Templates stay on devices by default. Legal review per country. |
| Plain-HTTP ADMS over the internet | Bridge-relay option, SN allow-list, rate limits |
| Chrome changes to loopback/private-network access | Primary path is outbound SignalR. Loopback is only an offline fallback. |

---

## 9. Sources

Printing
- QZ Tray Premium Support pricing — https://buy.qz.io/Premium-Support-_p_13.html
- QZ Tray Company Branded — https://buy.qz.io/Company-Branded-Premium-Support_p_19.html
- Third-party QZ Tray listing (different prices) — https://www.itechguides.com/products/qz-tray/
- Chromium kiosk-printing bug thread — https://groups.google.com/a/chromium.org/g/chromium-bugs/c/BW_OjJSj4qk
- Kiosk printing how-to (default printer only) — https://pikr.helpscoutdocs.com/article/58-disable-print-previews-of-shipping-labels-in-chrome
- SilentPrintingEnabled policy (Samsung Internet docs; Chrome policy of the same name reported for Windows v144, verify on Chrome Enterprise policy list) — https://developer.samsung.com/browser/policy/silent-printing-enabled.html
- ESC/POS drawer kick command — https://www.manualslib.com/manual/1216163/Epson-Tm-T88v.html?page=76 , https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/receipt.html , https://apu-lb2.umd.com.au/itd/an/an142.pdf , https://github.com/f/escpos-php
- ESC-POS-.NET (MIT) — https://github.com/lukevp/ESC-POS-.NET
- SharpIppNext (MIT) — https://www.nuget.org/packages/SharpIppNext
- Non-standard drawer printers — https://forum.sambapos.com/t/specify-font-for-controlling-printer-drawer-kick/11424

Attendance
- ZKTeco PUSH SDK introduction — https://cdn.tvc.mx/media/92189/General-Introduction-of-PUSH-SDK-Protocol.pdf
- ADMS endpoints in open-source servers — https://packagist.org/packages/dewanlab/laravel-zkteco-adms-core , https://github.com/xeechaun/ZKTecoPushSDK , https://laraplugins.io/plugins/syofyanzuhad/filament-zkteco-adms?page=1
- ZK TCP protocol references — https://kengggg.github.io/openzk/reference/protocol/ , https://uithub.com/adrobinoga/zk-protocol , https://github.com/icarome/pyzk , https://cdn.jsdelivr.net/npm/zkteco-js@1.7.2/README.md , https://unpkg.com/zkteco-terminal@0.2.5/README.md
- NuGet BiometricZktecoDeviceCommunication — https://www.nuget.org/packages/BiometricZktecoDeviceCommunication/
- Suprema BioStar 2 API — https://support.supremainc.com/en/support/solutions/articles/24000054050--biostar-2-api-how-to-retrieve-the-event-logs-through-biostar-2-new-local-api , https://support.supremainc.com/en/support/solutions/articles/24000022040--biostar-2-how-to-get-the-real-time-event-logs-through-web-socket-method , https://support.supremainc.com/en/support/solutions/articles/24000072557-biostar-2-new-local-api-quick-start-guide-5-retrieve-log-data , https://support.supremainc.com/en/support/solutions/articles/24000047721--biostar-2-license-policy-of-biostar2-api , https://supremainc.com/en/support/development-tools_biostar-2-api.asp
- Hikvision ISAPI — https://soporte.syscom.mx/en/articles/12248649-for-developers-configure-alarm-server-on-hikvision-ip-camera-to-receive-alerts-via-http-post-from-isapi , https://www.scribd.com/document/833701192/ISAPI-Person-Based-Access-Control , https://ipcamtalk.com/posts/989382/ , https://ipcamtalk.com/goto/post?id=969887
- Anviz CrossChex Cloud — https://community.anviz.com/t/how-to-use-api-to-get-the-records-from-the-crosschex-cloud/726 , https://pypi.org/project/crosschexcloudapi/

E-invoicing
- Egypt e-receipt — https://www.wafeq.com/en-eg/tax-and-reporting/e-receipt-system , https://docs.ecosire.com/odoo-modules/egypt-eta-einvoicing , https://invoicedataextraction.com/blog/egypt-e-receipt-requirements , https://www.avalara.com/vatlive/en/country-guides/africa-and-middle-east/egypt-vat/egyptian-e-invoicing.html
- ZATCA waves — https://www.ey.com/en_gl/technical/tax-alerts/saudi-arabia-announces-24th-wave-of-phase-2-e-invoicing-integration , https://www.cleartax.com/sa/zatca-wave24-einvoicing-in-saudi-arabia , https://lookuptax.com/docs/einvoicing/zatca-fatoora-saudi-arabia-einvoicing-zakat-tax-and-customs-authority (Wave 25, verify)

Not verified on the web in this pass (from general knowledge; confirm before relying on them): Google Cloud Print shutdown date (end of 2020), WebView2 `PrintAsync` printer-name support, Hangfire LGPL-3.0 / Quartz.NET Apache-2.0, ZXing-js Apache-2.0, Egypt PDPL No. 151/2020 biometric classification, WhatsApp Cloud API template rules, Chrome Local Network Access prompts.
