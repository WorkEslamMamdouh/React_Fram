# 02 - ERP Studio: Architecture and Admin Removal from the Framework

| Item | Value |
|---|---|
| Status | Design / analysis only. No existing code was changed. |
| Date | 2026-11-12 |
| Framework repo | `C:\PC\Work\React_Fram` (GitHub `WorkEslamMamdouh/React_Fram`) |
| Studio location (owner decision) | `C:\PC\Work\ERP_Studio`, a separate repo **outside** the framework: `ERP_Studio/Backend`, `ERP_Studio/Frontend`, `ERP_Studio/Database` |
| Studio stack (owner decision) | ASP.NET Core 9 + Next.js (static export) + SQL Server, the same stack as the framework |
| Reports (owner decision) | Our **own** visual report designer with JSON layouts. Stimulsoft is removed and no paid license is needed. The framework keeps only a small runtime renderer. |
| Admin in framework (owner decision) | **Removed right after the split.** Section 1.4 lists exactly what to delete. |
| Sources inspected | Graphify index (commit `4feeef3`, 6 days old) plus direct reads of every file named below. Line counts were taken from the working tree. |

---

## 0. Executive summary

1. **What moves to ERP Studio:** every feature that designs the application (ScreenBuilder, search-function manager, report designer, report definitions and layouts, module registration). It also takes every feature that administers the application across companies (users, roles, permission matrix, per-user overrides, external API keys). Studio is a hosted web app. It reads a project from **GitHub**, edits it, and **commits back through the GitHub REST Git Data API**, so no git binary is needed. It connects to the project's SQL Server with a connection string the user enters, and only shows the DB objects that user is allowed to see.
2. **What stays in the framework runtime:** login, menus and permission **reading** (`IQ_Sys_RoleModule`), the generic `ManageDataSQLController`, the screen runtime components (`DynamicGrid`, `MasterDetail`, `TreeScreen`, `AdvancedFilter`, `Validation`), `openReport()` with a **new small JSON report renderer**, the report run endpoints (`run`, `get-report`, `resolve-layout`), and the external API **use** endpoint.
3. **Reports:** a **band-based React designer** in Studio saves a JSON layout (`rf-report/1`). The same renderer package draws it as HTML/CSS in Studio preview, in the runtime viewer, and as PDF. PDF comes from the browser's own print-to-PDF, or optionally from headless Chromium on the server. Browser rendering is chosen because it handles Arabic letter shaping and RTL correctly. Most PDF libraries that draw text themselves (pdf-lib, pdfme, jsPDF) get this wrong.
4. **Top risks:** (1) security of the Studio, which stores GitHub write tokens and DB connection strings; (2) Git conflicts and drift when developers hand-edit generated files; (3) version mismatch between the generator and each project's framework; (4) reaching customer databases from a hosted server; (5) Arabic/RTL print fidelity and the effort of building the report designer. The full list is in section 7.

---

## 1. Inventory of existing admin features (framework repo)

### 1.1 Frontend (`Frontend/App/app/ClientApp`)

| Folder / file | Lines | What it does today | Decision | Dependencies to cut |
|---|---|---|---|---|
| `AdminLogin/page.tsx` | ~150 | Login form for the single super-admin (`api/admin/login`). Stores `admin_token` in localStorage. | **Delete.** Studio has its own login. | `Routes.tsx` entry `AdminLogin: NotLayout` |
| `Admin/page.tsx` | 78 | Admin dashboard cards linking to ScreenBuilder, AdminReports, AdminUsers, AdminRoles, AdminUserPerms, AdminExternalApis | **Delete.** Becomes the Studio project home. | `Layouts/AdminShell` |
| `AdminUsers/`, `AdminRoles/`, `AdminUserPerms/`, `AdminReports/`, `AdminExternalApis/` (`page.tsx` each) | ~17 each | Thin wrappers that render the `Sys_*Admin` views in `mode="admin"` (X-Admin-Token, all companies) | **Delete** | `AdminShell`, `Sys_*Admin/*View.tsx` |
| `Sys_UsersAdmin/` (`Sys_UsersAdmin.ts`, `UsersAdminView.tsx`, `AdminApi.ts`, `AdminUi.tsx`, `useScreenPerm.ts`, `page.tsx`) | - | Users screen with two auth modes: `jwt` (an ERP user with module permission) or `admin` (token). Also holds the shared admin UI kit (`AdminUi`) and API helper (`AdminApi`). | **Delete.** It moves to Studio as "App users" and runs against the target DB. | `Shared/AdminHttp`, `AdminUsersController`. Imported by `Sys_RolesAdmin`, `Sys_UserPermsAdmin`, `Sys_ReportsAdmin`, `Sys_ExternalApisAdmin`. |
| `Sys_RolesAdmin/` (`Sys_RolesAdmin.ts`, `RolesAdminView.tsx`, `PermissionMatrix.tsx`, `page.tsx`) | - | Roles plus the permission matrix (EXECUTE/CREATE/EDIT/DELETE/PRINT/VIEW/CUSTOM1-9) | **Delete**, moves to Studio (`PermissionMatrix` is ported) | `Sys_UsersAdmin/AdminApi`, `AdminUi`, `useScreenPerm` |
| `Sys_UserPermsAdmin/` | - | Per-user overrides per company/branch (`Sys_UserModule`) | **Delete**, moves to Studio | same as above |
| `Sys_ReportsAdmin/` (`Sys_ReportsAdmin.ts`, `ReportsAdminView.tsx`, `page.tsx`) | - | Report definitions (proc + parameter mapping), layouts per scope (all/company/branch), opens the Stimulsoft designer | **Delete**, moves to Studio (Reports module) | `Shared/Reports/ReportApi`, `ReportDesigner`, `ReportTypes`, `AdminUi` |
| `Sys_ExternalApisAdmin/` | - | Enable/disable external APIs, save keys, test | **Delete**, moves to Studio (Integrations) | `Shared/AdminHttp`, admin actions of `ExternalApisController` |
| `ScreenBuilder/` (whole folder, 33 files, ~7,700 lines) | see below | No-code screen builder | **Delete from framework**, **port to Studio** | see 1.1.1 |
| `Shared/AdminHttp.ts` | 70 | `adminFetch` with `X-Admin-Token`, `AuthMode` type, redirect to AdminLogin | **Delete** | `import type { AuthMode }` is used by `Shared/Reports/stimulsoft.ts`, `ReportDesigner.tsx` and `ReportApi.ts`. All three are deleted or rewritten. |
| `Layouts/AdminLayout.tsx`, `Layouts/AdminShell.tsx` | 42 / - | Gate on `admin_token` plus the admin chrome | **Delete** | `Routes.tsx` imports `AdminLayout` |
| `Routes.tsx` | 99 | Layout map. Lines 55-65 hold the admin routes. | **Edit:** remove `AdminLogin`, `Admin`, `ScreenBuilder`, `AdminReports`, `AdminUsers`, `AdminRoles`, `AdminUserPerms`, `AdminExternalApis` and the `AdminLayout` import | - |
| `Shared/Reports/` (Stimulsoft based) | 1,325 total | `ReportDesigner.tsx` (320), `ReportViewer.tsx` (254), `stimulsoft.ts` (167), `ReportService.ts` (125), `ReportTypes.ts` (119), `defaultLayout.ts` (110), `ReportApi.ts` (60), `printSync.ts` (47), `openReport.tsx` (23) | **Replace** with the runtime renderer (section 3.6). Delete `ReportDesigner.tsx`, `stimulsoft.ts`, `printSync.ts`, `defaultLayout.ts` (Stimulsoft API). Rewrite `ReportViewer.tsx`, `ReportService.ts`, `ReportApi.ts` (no admin calls), `ReportTypes.ts`. **Keep the `openReport()` signature.** | `openReport` is called by `Shared/Components/Import/DynamicGrid.tsx` (lines 26, 1320, 1992), `MasterDetail.tsx` (36, 558) and generated screens (`TstOrder.ts`). |
| `_Backup_Screens/` (under `Frontend/App`) | many | Timestamped copies written by `ScreenBuilder save-files` | **Delete.** Git history replaces it. | `ScreenBuilderController.SaveFiles` |
| `package.json` | - | `stimulsoft-reports-js 2026.4.2` and `postinstall: node scripts/copy-stimulsoft.js` | **Edit:** remove the dependency and postinstall. **Delete** `scripts/copy-stimulsoft.js` and any copied Stimulsoft assets under `public/`. | - |

#### 1.1.1 ScreenBuilder internals (what is ported to Studio)

| File | Lines | Role | Port notes |
|---|---|---|---|
| `types/ScreenConfig.ts` | 521 | ScreenConfig v4/v5 model (Grid / MasterDetail / Tree, fields, details 1..5, validations, rules, filters, tree settings, inline status, print/excel) | Becomes `@erp-studio/screen-schema`. **Cut:** `import { FilterFieldType } from "../../Shared/Components/Import/AdvancedFilter"`. Copy the union type into the schema package. |
| `utils/codeGenerator.ts` | 1,025 | Config v5 to `<Module>.ts` + `page.tsx`. It emits imports of `../Shared/SystemUsing`, `DynamicGrid`, `MasterDetail`, `TreeScreen`, `../Shared/Reports/openReport`. | Becomes `@erp-studio/codegen`, **versioned per framework version** (section 2.6). The imports it emits must match the runtime that stays in the framework. |
| `utils/configConverter.ts` | 303 | v3 (CreatePageReact WinForms) and v4/v5 conversion | Port as-is (it lets screens made by the desktop tool open in Studio) |
| `utils/validateConfig.ts` | 77 | Config validation | Port and extend into plain-language messages (section 4.6) |
| `utils/sqlApi.ts` | 211 | `fetch` to `api/screenbuilder/*` with `X-Admin-Token`. Sends server/user/password from the browser. | **Rewrite** as the Studio API client. The browser never sends connection details again. |
| `utils/dbMeta.ts` | 52 | Metadata cache hook (tables, columns, procs) | Port. Its source becomes the Studio API, filtered by permissions. |
| `utils/examples.ts`, `components/ExamplesModal.tsx` | 173 / 47 | Ready-made examples | Become the **Templates gallery** seed |
| `utils/layoutOps.ts` | 137 | Designer layout operations | Port |
| `store/useScreenBuilder.ts` | 263 | zustand store | Port and wrap with undo/redo (`zundo`) |
| `ScreenBuilder.ts`, `page.tsx` | 391 / 250 | Hook + view (uses `useSys`, `Sys` from framework Shared) | Port. Replace `useSys`/`Sys` with Studio equivalents (language, messages, loader). |
| `components/*` (Toolbar, Setup, SetupWizard, WelcomeScreen, Fields, Details, Validations, Preview, LiveCanvas, Properties, ComponentPanel, BottomPanel, ConnectionPanel, SearchManagerModal, HelpPanel) | ~3,300 | UI | Port. `ConnectionPanel` becomes "Project, Environment" (no raw server/password fields). `HelpPanel` (328 lines) is the base of contextual help. |
| `components/designer/*` (DesignerView 474, PropsPanel 469, ScreenModals 181, PrintExcelTab 176, ExcelBox 140, catalog 64) | ~1,500 | Drag-and-drop designer, print/excel settings | Port. `PrintExcelTab`/`ScreenModals` currently import `Shared/Reports/printSync`, `ReportDesigner`, `ReportApi`. Re-point them to the Studio Reports module. |

### 1.2 Backend (`Backend/Controllers`)

| File | What it does | Decision | Notes / security findings |
|---|---|---|---|
| `AdminAuthController.cs` (48 lines) + `AdminTokenStore` | `api/admin/login` compares against `appsettings Admin:User/Pass` (plain text). It issues an in-memory GUID token valid 24h. | **Delete** | The token is lost on restart and there is one shared admin. Studio replaces it with real users. |
| `ScreenBuilderController.cs` (1,026 lines) | `connect`, `tables`, `columns`, `resources`, `procs`, `proc-params`, `distinct-values`, `validate-condition`, `register-module`, `config-save`, `config-list`, `read-screen`, `scan-screens`, `save-files` (writes `.ts`, `page.tsx`, CSS, patches `Shared/Resources.ts`, writes `Database/Add_<M>_Module.sql`), search-function CRUD on `Shared/G_SearchFrom.ts`, **`execute-sql` (runs any SQL batch)** | **Delete.** The logic is ported into Studio (`TargetDbGateway`, `RepoWriter`, `ResourcesPatcher`, `SearchFromPatcher`). | `execute-sql` runs arbitrary SQL. `connect` accepts any server, which is an SSRF-like risk. Files are written into the running server's disk. Studio must **not** copy these behaviours. |
| `AdminUsersController.cs` | `Lookups`, `ListUsers`, `GetUser`, `SaveUser`, `SetPassword`, `SetUserActive`, `ListRoles`, `SaveRole`, `GetRoleMatrix`, `SaveRoleMatrix`, `GetUserMatrix`, `SaveUserMatrix`. Uses JWT plus module permission, or X-Admin-Token. | **Delete.** Studio gets the same operations against the target DB. | Passwords are stored as **plain text** in `Sys_Users.USER_Password` (comment line 19). Studio should offer hashing as a later framework change (section 7). |
| `Reports/ReportsController.cs` (663 lines), `ReportModels.cs`, `ReportStores.cs` | Design side: `list-reports`, `save-report`, `delete-report`, `list-layouts`, `get-layout`, `save-layout`, `delete-layout`, `set-default-layout`, `duplicate-layout`, `procs`, `proc-params`, `lookups`. Runtime side: `config`, `get-report`, `resolve-layout`, `run`. | **Split.** Delete the design actions, `IsAdminUser`, `RequireAdmin`, the `X-Admin-Token` branch in `GetCtx`, the `Sample` mode and the `UserId` override in `RunRequest`. Keep `get-report`, `resolve-layout`, `run`. Reduce `config` to `{ RowCap }` (drop `LicenseKey`, `CanDesign`). Keep `FileReportStore`/`DbReportStore` read paths and drop their write paths. `Validate()` (Stimulsoft `Pages` check) is deleted. | `resolve-layout` must also return the new `LayoutFormat` (section 3.5). |
| `ExternalApis/ExternalApisController.cs` | Admin: `List`, `Toggle`, `SetKey`, `Test`, `Call`. Runtime: `Use` (any JWT user, enabled APIs only). | **Split.** Delete `List`, `Toggle`, `SetKey`, `Test`, `Call` and the `AccessLevel`/admin-token code. Keep `Use`. | `ExternalApiService.cs` and `ExternalApiCatalog.cs` stay. They decrypt `ApiKeyEnc` with AES-GCM using `ExternalApis:EncryptionKey` (falls back to `Jwt:Key`). Section 2.8 explains how Studio writes keys the runtime can read. |
| `Program.cs` | CORS `AllowAll`, JWT, `AutoDecryptFilter` registered 3 times | **Edit only if needed.** Nothing admin-specific. Recommend later restricting CORS to the app origin (separate task). | - |
| `appsettings.json` | `Admin:User`, `Admin:Pass` (plain text), `Stimulsoft:LicenseKey` (if present) | **Delete** these keys | - |
| `App_Data/Reports/*.json\|*.mrt` (FileReportStore) | File storage for report definitions and layouts when the `Sys_Reports*` tables do not exist | Keep the read path for a transition. New layouts are JSON (section 3.5). Convert or delete the `.mrt` files after migration. | - |

### 1.3 Database scripts (`Database/`)

| Script | Objects | Runtime or Studio | Decision |
|---|---|---|---|
| `Phase2_Suggested_Indexes.sql` | indexes only | Runtime (DBA) | Keep |
| `Phase3_UserMenu_Favorites.sql` | `Sys_UserMenu` | Runtime | Keep |
| `Phase4_Permissions.sql` | `Sys_Role.IsAdmin`, `Sys_UserModule` key change, **`dbo.Sys_RegisterModule`**, registration of the menu group `Menu_Admin` + `Sys_UsersAdmin`, `Sys_RolesAdmin`, `Sys_UserPermsAdmin` | Mixed | Keep sections A-C (the runtime needs `IsAdmin` and the Studio calls `Sys_RegisterModule`). **New cleanup script** removes the admin module rows (section 1.4). |
| `Phase5_ScreenBuilder.sql` | `Sys_ScreenConfig` | Studio-only mirror of screen JSON | **Drop the table** after migration. The config moves into the repo (`<Module>.studio.json`, section 2.6). Keep the script file for history or delete it. |
| `Phase6_Excel.sql` | indexes | Runtime | Keep |
| `Phase7_Reports.sql` | `Sys_Reports`, `Sys_ReportParams`, `Sys_ReportLayouts` (+ registration of `Sys_ReportsAdmin`) | Runtime reads them, Studio writes them | Keep the tables. **New migration** adds `LayoutFormat` and `LayoutJson` and remove the `Sys_ReportsAdmin` module rows (section 3.5). |
| `Phase9_ExternalApis.sql` | `Sys_ExternalApis` (+ registration of `Sys_ExternalApisAdmin`) | Runtime reads, Studio writes | Keep the table. Remove the module registration rows. |
| `Test_ScreenBuilder_Schema.sql` (52 KB) / `Test_ScreenBuilder_Drop.sql` | Test tables, views and procs for the builder | Studio test fixtures | **Move** to `ERP_Studio/Database/TestFixtures/` |
| `Add_<Module>_Module.sql` (CashTypes, FinancialType, SalesInvoice, ...) | Per-screen module and permission rows | Runtime (project content) | Keep. Studio keeps writing new ones into the project repo. |
| `Create_Sales_Tables.sql`, `Fix_G_ProcessTrans.sql` | App schema | Runtime | Keep |

### 1.4 Exact deletion list for the "remove admin" step

**Frontend (delete):**
```
Frontend/App/app/ClientApp/Admin/
Frontend/App/app/ClientApp/AdminLogin/
Frontend/App/app/ClientApp/AdminUsers/
Frontend/App/app/ClientApp/AdminRoles/
Frontend/App/app/ClientApp/AdminUserPerms/
Frontend/App/app/ClientApp/AdminReports/
Frontend/App/app/ClientApp/AdminExternalApis/
Frontend/App/app/ClientApp/Sys_UsersAdmin/
Frontend/App/app/ClientApp/Sys_RolesAdmin/
Frontend/App/app/ClientApp/Sys_UserPermsAdmin/
Frontend/App/app/ClientApp/Sys_ReportsAdmin/
Frontend/App/app/ClientApp/Sys_ExternalApisAdmin/
Frontend/App/app/ClientApp/ScreenBuilder/
Frontend/App/app/ClientApp/Shared/AdminHttp.ts
Frontend/App/app/ClientApp/Layouts/AdminLayout.tsx
Frontend/App/app/ClientApp/Layouts/AdminShell.tsx
Frontend/App/app/ClientApp/Shared/Reports/ReportDesigner.tsx
Frontend/App/app/ClientApp/Shared/Reports/stimulsoft.ts
Frontend/App/app/ClientApp/Shared/Reports/printSync.ts
Frontend/App/app/ClientApp/Shared/Reports/defaultLayout.ts
Frontend/App/_Backup_Screens/
Frontend/App/scripts/copy-stimulsoft.js  (+ copied Stimulsoft assets in public/, if any)
```
**Frontend (edit):** `Routes.tsx` (remove the 8 admin routes and the `AdminLayout` import); `package.json` (remove `stimulsoft-reports-js` and `postinstall`); `Shared/Reports/ReportViewer.tsx`, `ReportService.ts`, `ReportApi.ts`, `ReportTypes.ts`, `openReport.tsx` (rewrite to the JSON renderer while keeping the `openReport` signature).

**Backend (delete):** `Controllers/AdminAuthController.cs`, `Controllers/ScreenBuilderController.cs`, `Controllers/AdminUsersController.cs`.
**Backend (edit):** `Reports/ReportsController.cs` (keep `config`/`get-report`/`resolve-layout`/`run` only, with no admin token), `Reports/ReportStores.cs` (read-only + `LayoutFormat`), `ExternalApis/ExternalApisController.cs` (keep `Use` only), `appsettings.json` (remove `Admin:*`, `Stimulsoft:*`).

**Database (new script `Database/Phase10_Remove_Admin.sql`, idempotent, review before running):**
- Delete `Sys_RoleModule`, `Sys_UserModule` and `Sys_Modules` rows for `MODULE_CODE IN ('Sys_UsersAdmin','Sys_RolesAdmin','Sys_UserPermsAdmin','Sys_ReportsAdmin','Sys_ExternalApisAdmin')` and the `Menu_Admin` group, if it becomes empty. Also remove `Sys_UserMenu` favorites that point to them.
- `ALTER TABLE Sys_ReportLayouts ADD LayoutFormat VARCHAR(10) NOT NULL DEFAULT 'mrt', LayoutJson NVARCHAR(MAX) NULL`
- After migration: `DROP TABLE Sys_ScreenConfig` (optional, as a separate, explicitly approved step).
- **Do not drop:** `Sys_RegisterModule`, `Sys_Role.IsAdmin`, `Sys_Reports*`, `Sys_ExternalApis`, `IQ_Sys_RoleModule`.

### 1.5 What the runtime must keep (do not delete)

| Piece | Why |
|---|---|
| `AuthController` (`api/auth/login`), `JwtService`, `AutoDecryptFilter`, `CryptoHelper`, `ManageDataSQLController`, `SQLServer.cs` | All generated screens use them |
| `IQ_Sys_RoleModule`, `Sys_Modules`, `Sys_RoleModule`, `Sys_UserModule`, `Sys_RoleUsers`, `Sys_ControlYear`, `Sys_Role.IsAdmin`, `Shared/Permissions.ts`, `usePermissions` | Menu and permission **reading** (rules in CLAUDE.md). Studio writes these rows, the runtime only reads them. |
| `dbo.Sys_RegisterModule` | Studio calls it when publishing a screen |
| `Shared/Components/Import/*` (`DynamicGrid`, `MasterDetail`, `ModelMasterDetail`, `TreeScreen`, `AdvancedFilter`, `Validation`), `Shared/SystemUsing.ts`, `SystemTools.ts`, `CallDataBase.ts`, `Resources.ts`, `G_SearchFrom.ts` | Screen runtime used by generated code |
| `Shared/Reports/openReport.tsx` + **new** JSON renderer (section 3.6) | Print buttons in `DynamicGrid`/`MasterDetail`/generated screens |
| `ReportsController` run-side actions, `Sys_Reports*` tables | Running reports |
| `ExternalApisController.Use`, `ExternalApiService`, `ExternalApiCatalog`, `Shared/ExternalApis/ExternalApi.ts`, `Sys_ExternalApis` | Screens that call external APIs |
| `Layouts/HomeLayout`, `LoginLayout`, `NotLayout`, `MainLayout` | App chrome |

### 1.6 `Tools/CreatePageReact` (WinForms, .NET 4.6.1)

| Item | Detail |
|---|---|
| What it is | The desktop generator (`Form4_GridPage.cs` UI/DB/save, `Form4_GridPage.Gen.cs` templates, `GridScreenSettings.cs` v3 settings, `Form5_SearchBuilder.cs`, `SQL/*` metadata, `React_Code/*` writers). It writes files to the local disk and appends the `// @CreatePageReact-Settings: {json}` marker. |
| Decision | **Freeze, then retire.** It is not part of the runtime. Keep it in the repo as read-only legacy (or move it to `ERP_Studio/Legacy/`) until all v3 screens have been opened and re-saved once in Studio. Studio keeps reading the `@CreatePageReact-Settings` marker through `configConverter.ts`. |
| Dependencies | None from the runtime. C# 7.3 / CRLF rules apply only while the tool is kept. |

---

## 2. ERP Studio architecture

### 2.1 Context

```
 Browser (desktop / tablet / phone)
        │  HTTPS (JWT access token + httpOnly refresh cookie)
        ▼
 ┌────────────────────── ERP Studio server (IIS or Linux) ──────────────────────┐
 │  Studio.Api (ASP.NET Core 9) ── serves Studio Frontend (Next.js static export)│
 │    ├─ Auth / Users / Roles / Permissions            ─► Studio DB (SQL Server) │
 │    ├─ Projects / Environments / Access              ─► Studio DB              │
 │    ├─ GitHub gateway (REST, Git Data API)           ─► api.github.com         │
 │    ├─ Target DB gateway (metadata, sample data,     ─► Project SQL Server     │
 │    │   module registration, report data)                (per environment)     │
 │    ├─ Publish pipeline (queue per repo)                                       │
 │    └─ PDF service (optional headless Chromium)                                │
 └───────────────────────────────────────────────────────────────────────────────┘
 Project runtime (unchanged deployment) ◄── CI/CD on push (GitHub Actions, optional)
```

### 2.2 Folder layout (`C:\PC\Work\ERP_Studio`)

```
ERP_Studio/
├─ Backend/
│  ├─ ERP_Studio.sln
│  ├─ src/
│  │  ├─ Studio.Api/                 Controllers, auth, rate limits, static hosting of Frontend/out
│  │  │   Controllers/ AuthController, MeController, UsersController, RolesController,
│  │  │                ProjectsController, EnvironmentsController, AccessController,
│  │  │                RepoController, DbMetaController, ScreensController, SearchFnController,
│  │  │                ReportsController, AppUsersController (target DB users/roles/matrix),
│  │  │                IntegrationsController, TemplatesController, PublishController, AuditController
│  │  ├─ Studio.Application/         PermissionEvaluator, PublishService, ScreenService, ReportService,
│  │  │                              ConflictResolver, ObjectAllowList, Validation
│  │  ├─ Studio.Domain/              Entities, enums, permission codes
│  │  └─ Studio.Infrastructure/
│  │      ├─ Persistence/            StudioDbContext (EF Core 9) or Dapper repositories
│  │      ├─ GitHub/                 GitHubClient (typed HttpClient), GitHubAppTokenProvider, RepoReader, RepoWriter
│  │      ├─ TargetDb/               TargetDbGateway (Microsoft.Data.SqlClient), MetadataReader, ModuleRegistrar
│  │      ├─ Patchers/               ResourcesPatcher (port of UpsertKeys), SearchFromPatcher (port of FindSearchBlock)
│  │      ├─ Security/               SecretProtector (AES-GCM envelope), PasswordHasher, TotpService
│  │      └─ Pdf/                    ChromiumPdfRenderer (optional, PuppeteerSharp or Microsoft.Playwright)
│  └─ tests/ Studio.Tests, Studio.IntegrationTests
├─ Frontend/
│  ├─ package.json                  next 16 (output:"export"), react 19, tailwind 3, zustand 5, zundo, @dnd-kit/*
│  ├─ app/                          routes: /login, /projects, /p (project shell; ids in query string, see note)
│  ├─ src/design-system/            tokens.css, tailwind preset, components (section 4.8)
│  ├─ src/features/
│  │   ├─ screen-builder/           ported from React_Fram ScreenBuilder
│  │   ├─ report-designer/          new
│  │   ├─ app-users/                ported Sys_UsersAdmin / Roles / UserPerms (target DB)
│  │   ├─ integrations/             ported Sys_ExternalApisAdmin
│  │   ├─ templates/, help/, projects/, studio-admin/
│  └─ src/i18n/ en.ts, ar.ts
├─ Packages/                        TypeScript packages (npm workspaces)
│  ├─ screen-schema/                ScreenConfig v5 types + JSON Schema
│  ├─ codegen/                      codegen per framework version: codegen/v1 (current React_Fram), v2 ...
│  ├─ report-schema/                rf-report/1 JSON Schema + types
│  └─ report-renderer/              React renderer (HTML/CSS) + barcode/QR/chart/format helpers
├─ Database/
│  ├─ Migrations/ 001_Init.sql, 002_Seed_Permissions.sql, ...
│  ├─ TargetBootstrap/              scripts Studio can apply to a target DB (Sys_RegisterModule, Phase7 add-ons)
│  └─ TestFixtures/                 moved Test_ScreenBuilder_Schema.sql / _Drop.sql
├─ Templates/                       built-in screen and report templates (JSON) per business
└─ Deploy/ iis/web.config, linux/erp-studio.service, linux/nginx.conf, docker/Dockerfile
```

Note: Next.js static export cannot pre-render unknown dynamic segments. Use query-string routing (`/p/screens?project=12&module=SalesInvoice`) or a client router inside one page, which the framework already does with `ClientApp/<Name>`.

### 2.3 Studio DB schema (`ERP_Studio` database)

All tables are in schema `studio`. Times are `DATETIME2(0)` in UTC. `RowVersion ROWVERSION` is on editable rows for optimistic concurrency.

| Table | Columns (type, notes) |
|---|---|
| `StudioUser` | `UserId INT IDENTITY PK`, `Email NVARCHAR(256) UNIQUE`, `UserName NVARCHAR(100) UNIQUE`, `DisplayName NVARCHAR(200)`, `PasswordHash NVARCHAR(400)` (ASP.NET Identity PBKDF2 v3 or Argon2id), `IsActive BIT`, `IsSuperAdmin BIT`, `PreferredLang CHAR(2)` ('ar'/'en'), `Theme VARCHAR(10)` ('light'/'dark'/'system'), `MfaEnabled BIT`, `MfaSecretEnc NVARCHAR(400)`, `FailedLoginCount INT`, `LockoutUntil DATETIME2`, `MustChangePassword BIT`, `LastLoginAt DATETIME2`, `CreatedAt`, `CreatedBy INT`, `UpdatedAt`, `RowVersion` |
| `StudioRefreshToken` | `TokenId BIGINT PK`, `UserId FK`, `TokenHash VARBINARY(32)` (SHA-256), `ExpiresAt`, `RevokedAt`, `ReplacedByTokenId`, `CreatedIp VARCHAR(45)`, `UserAgent NVARCHAR(300)`, `CreatedAt` |
| `StudioPermission` (catalog) | `PermissionCode VARCHAR(60) PK`, `GroupCode VARCHAR(40)`, `NameEn`, `NameAr`, `DescEn`, `DescAr`, `IsProjectScoped BIT`, `SortOrder INT` |
| `StudioRole` | `RoleId INT PK`, `Code VARCHAR(40) UNIQUE`, `NameEn`, `NameAr`, `IsSystem BIT`, `CreatedAt` |
| `StudioRolePermission` | `RoleId FK`, `PermissionCode FK`, PK(RoleId, PermissionCode) |
| `StudioUserRole` | `UserId FK`, `RoleId FK`, `ProjectId INT NULL` (NULL = all projects the user can access), PK(UserId, RoleId, ProjectId) |
| `StudioUserPermission` (override) | `UserId`, `ProjectId NULL`, `PermissionCode`, `IsGranted BIT` (1 grant, 0 explicit deny), `GrantedBy`, `GrantedAt` |
| `Project` | `ProjectId INT PK`, `Code VARCHAR(50) UNIQUE`, `Name NVARCHAR(200)`, `Description`, `RepoOwner VARCHAR(100)`, `RepoName VARCHAR(100)`, `DefaultBranch VARCHAR(100)`, `FrontendRoot VARCHAR(200)` ('Frontend/App'), `ClientAppPath VARCHAR(200)` ('app/ClientApp'), `DatabaseRoot VARCHAR(200)` ('Database'), `FrameworkVersion VARCHAR(20)` (read from manifest), `GitAuthMode VARCHAR(10)` ('app'/'pat'), `GitInstallationId BIGINT NULL`, `GitTokenEnc NVARCHAR(MAX) NULL`, `GitTokenHint VARCHAR(10)` (last 4), `GitTokenExpiresAt`, `CommitMode VARCHAR(12)` ('direct'/'branch_pr'), `RuntimeKeyPublicPem NVARCHAR(MAX) NULL` (section 2.8), `IsActive BIT`, `CreatedBy`, `CreatedAt`, `UpdatedAt`, `RowVersion` |
| `ProjectEnvironment` | `EnvId INT PK`, `ProjectId FK`, `Name NVARCHAR(50)` (Development/Test/Production), `ConnStringEnc NVARCHAR(MAX)`, `ServerHint NVARCHAR(200)` (display only), `DatabaseName NVARCHAR(128)`, `IsDefault BIT`, `IsReadOnly BIT` (no registration or writes), `AllowApplySql BIT`, `LastTestedAt`, `LastTestOk BIT`, `LastTestMessage NVARCHAR(400)`, `CreatedBy`, `CreatedAt`, `RowVersion` |
| `ProjectUserConnection` (optional per-user connection) | `UserId`, `EnvId`, `ConnStringEnc`, `UpdatedAt`, PK(UserId, EnvId). Used when the owner wants every user to type their own SQL login. |
| `ProjectUserAccess` | `ProjectId`, `UserId`, `AccessLevel VARCHAR(10)` ('viewer'/'editor'/'owner'), `GrantedBy`, `GrantedAt`, `ExpiresAt NULL`, PK(ProjectId, UserId) |
| `DbObjectGrant` (allowed DB objects) | `GrantId INT PK`, `ProjectId FK`, `UserId INT NULL`, `StudioRoleId INT NULL` (exactly one of UserId/RoleId), `SchemaName SYSNAME` ('dbo' or '*'), `ObjectPattern NVARCHAR(128)` (exact name, `Sales_*` prefix, or `*`), `ObjectType CHAR(2)` ('U' table, 'V' view, 'P' procedure, 'FN' scalar fn, 'IF'/'TF' table fn, '*' any), `CanSee BIT`, `CanUseAsSource BIT` (grid/list source), `CanSaveTo BIT` (insert/update/delete target), `CanExecute BIT` (procs/functions in reports/actions), `IsDeny BIT` (deny wins), `GrantedBy`, `GrantedAt` |
| `ScreenIndex` (cache of repo scan) | `ProjectId`, `ModuleCode VARCHAR(100)`, `ScreenType VARCHAR(20)`, `MainTable`, `FolderPath`, `TsBlobSha CHAR(40)`, `ConfigBlobSha CHAR(40)`, `ConfigSource VARCHAR(20)` ('studio-json'/'marker-v5'/'marker-v3'/'none'), `IsHandEdited BIT`, `LastScanCommitSha CHAR(40)`, PK(ProjectId, ModuleCode) |
| `ScreenDraft` | `DraftId BIGINT PK`, `ProjectId`, `ModuleCode`, `UserId`, `ConfigJson NVARCHAR(MAX)`, `ConfigVersion INT`, `BaseCommitSha CHAR(40)`, `BaseConfigBlobSha CHAR(40)`, `Status VARCHAR(12)` ('draft'/'publishing'/'published'/'conflict'), `UpdatedAt`, `RowVersion` |
| `EditLock` | `ProjectId`, `ResourceKey NVARCHAR(300)` ('screen:SalesInvoice', 'report:INV_A4'), `UserId`, `AcquiredAt`, `ExpiresAt` (soft lock, 15 min heartbeat), PK(ProjectId, ResourceKey) |
| `ReportDraft` | `DraftId`, `ProjectId`, `ReportCode`, `UserId`, `DefinitionJson`, `LayoutJson`, `BaseCommitSha`, `Status`, `UpdatedAt` |
| `Template` | `TemplateId INT PK`, `Kind VARCHAR(10)` ('screen'/'report'/'bundle'), `Business VARCHAR(30)` ('retail','restaurant','clinic','accounting','inventory','hr','services','general'), `Code`, `NameEn`, `NameAr`, `DescEn`, `DescAr`, `PreviewImage NVARCHAR(400)`, `PayloadJson NVARCHAR(MAX)`, `RequiredObjectsJson NVARCHAR(MAX)` (e.g. needs a table with a date + amount), `MinFrameworkVersion`, `IsBuiltIn BIT`, `IsActive BIT`, `CreatedBy`, `CreatedAt` |
| `Publish` | `PublishId BIGINT PK`, `ProjectId`, `UserId`, `Kind VARCHAR(20)` ('screen'/'report'/'search'/'bulk'), `TargetKey`, `Branch`, `BaseCommitSha`, `NewCommitSha`, `PrNumber INT NULL`, `PrUrl`, `CommitMessage NVARCHAR(500)`, `FilesJson NVARCHAR(MAX)` (path, action, blob sha, size), `DbActionsJson NVARCHAR(MAX)` (register-module, report rows), `Status VARCHAR(12)` ('queued'/'running'/'done'/'failed'/'conflict'), `ErrorMessage`, `QueuedAt`, `StartedAt`, `FinishedAt` |
| `RepoFileCache` (optional, or a disk cache) | `ProjectId`, `BlobSha CHAR(40)`, `Path`, `ContentGz VARBINARY(MAX)`, `FetchedAt`, PK(ProjectId, BlobSha) |
| `AuditLog` | `AuditId BIGINT PK`, `At`, `UserId`, `ProjectId NULL`, `Action VARCHAR(60)` ('login','screen.publish','db.register','grant.change', ...), `TargetType`, `TargetKey`, `DetailsJson`, `Ip`, `UserAgent`, `CorrelationId UNIQUEIDENTIFIER`. Insert-only (deny UPDATE/DELETE to the app login). |
| `StudioSetting` | `Key VARCHAR(100) PK`, `Value NVARCHAR(MAX)`, `IsSecret BIT` |

**Seeded permission catalog (`StudioPermission`):**

| Group | Codes |
|---|---|
| Projects | `project.view`, `project.create`, `project.edit`, `project.delete`, `project.env.manage` (add/edit connection strings), `project.access.manage` |
| Screens | `screen.view`, `screen.create`, `screen.edit`, `screen.delete`, `screen.publish`, `screen.search.manage` |
| Reports | `report.view`, `report.create`, `report.design`, `report.delete`, `report.publish`, `report.layout.company` (company/branch overrides) |
| Database | `db.objects.grant` (manage `DbObjectGrant`), `db.module.register`, `db.sql.apply` (apply generated DDL/DML to an env with `AllowApplySql`) |
| App administration (target DB) | `app.users.manage`, `app.roles.manage`, `app.perms.manage`, `app.integrations.manage` |
| Studio administration | `studio.users.manage`, `studio.roles.manage`, `studio.templates.manage`, `studio.audit.view` |
| Git | `git.branch.choose`, `git.pr.merge` (if the PR flow is used) |

**Seeded roles:** `SuperAdmin` (everything, global), `ProjectOwner`, `ScreenDesigner` (screen.* without delete, report.view), `ReportDesigner`, `AppAdmin` (app.*), `Viewer`.

**Effective permission** = `IsSuperAdmin` OR (has `ProjectUserAccess` for the project AND (union of role permissions for global and project roles, plus user grants) minus user denies). Every API action declares `[RequirePermission("screen.publish")]`. A policy handler resolves the project from the route or body.

### 2.4 GitHub integration (REST only, no git binary)

**Authentication (stored per project):**

| Option | Use | Notes |
|---|---|---|
| **GitHub App** (recommended) | Install the "ERP Studio" app on the repo with `Contents: read & write`, `Pull requests: read & write`, `Metadata: read` | Studio signs a JWT with the app private key (RS256), then exchanges it for a 1-hour installation token (`POST /app/installations/{id}/access_tokens`). No long-lived user token is stored. Per-repo scope. |
| Fine-grained PAT (fallback) | Single owner, quick start | Repository-scoped, `Contents RW` + `Pull requests RW`, with an expiry date. Stored encrypted (`GitTokenEnc`). The UI shows only the last 4 characters and the expiry date. |

**Reading the project**

| Step | Endpoint |
|---|---|
| Resolve branch head | `GET /repos/{o}/{r}/git/ref/heads/{branch}` gives the commit sha |
| Full tree | `GET /repos/{o}/{r}/git/trees/{commitTreeSha}?recursive=1`. If `truncated: true`, walk only `{FrontendRoot}/{ClientAppPath}` and `{DatabaseRoot}` non-recursively per folder. |
| File content | `GET /repos/{o}/{r}/git/blobs/{sha}` (base64). Cache by blob sha (immutable). Use `If-None-Match` ETags to save rate limit. |
| Manifest | `.erp-studio/project.json` (section 2.6). Absent means a "legacy project": Studio offers to create it in the first commit. |
| Screen scan | For each `ClientApp/<Name>/<Name>.ts` containing `const TableName =`: read `<Name>.studio.json` first, else the `// @ScreenBuilder-Settings:` marker (v5), else `// @CreatePageReact-Settings:` (v3, then `configConverter`). This is the same logic as today's `scan-screens`. |

**Writing one atomic commit (several files)**

```
1  head = GET  /git/ref/heads/{branch}                         -> headSha (must equal draft.BaseCommitSha or be re-checked)
2  base = GET  /git/commits/{headSha}                          -> baseTreeSha
3  for each changed binary/large file: POST /git/blobs {content, encoding:"base64"} -> blobSha
4  tree = POST /git/trees { base_tree: baseTreeSha,
                            tree: [ {path, mode:"100644", type:"blob", content|sha},
                                    {path, mode:"100644", type:"blob", sha:null}   // delete ] }
5  commit = POST /git/commits { message, tree, parents:[headSha],
                                author:{ name: studioUser.DisplayName, email: studioUser.Email } }
6  PATCH /git/refs/heads/{branch} { sha: commit.sha, force:false }
       ├─ 200 -> done (store NewCommitSha, update ScreenIndex)
       └─ 422 "not a fast forward" -> conflict handling below
```

**Typical file set of one screen publish**

| Path (relative to repo) | Action |
|---|---|
| `{FE}/app/ClientApp/<M>/<M>.ts`, `page.tsx` | create/update (generated) |
| `{FE}/app/ClientApp/<M>/<M>.studio.json` | create/update (source of truth config) |
| `{FE}/public/StyleDesign/Pages/<M>/<M>EN.css`, `<M>AR.css` | create only if missing |
| `{FE}/app/ClientApp/Shared/Resources.ts` | patched (port of `UpsertKeys`) |
| `{FE}/app/ClientApp/Shared/G_SearchFrom.ts` | patched only when search functions changed |
| `{DB}/Add_<M>_Module.sql` | create/update |
| `{FE}/app/ClientApp/Reports/<CODE>.report.json` | for reports (section 3.5) |

**Path guard (server side, mandatory):** only paths under the allowed roots in the manifest are accepted. These are always rejected: `.github/**`, `**/*.cs`, `**/*.csproj`, `package.json`, `next.config.*`, `Backend/**`, and any `..` or absolute path. The module name must match `^[A-Za-z_][A-Za-z0-9_]*$`. Size limit per file is 1 MB. This prevents a Studio user from injecting CI workflows or backend code.

**Conflict handling**

| Situation | Behaviour |
|---|---|
| Head moved, but none of our paths changed since `BaseCommitSha` (`GET /compare/{base}...{head}` lists files) | Rebuild the tree on the new head and retry automatically (up to 3 times). Shared files (`Resources.ts`, `G_SearchFrom.ts`) are always **re-patched on the new head content**, never overwritten from an old copy. |
| One of our generated files changed in between | Show "Someone changed this screen after you opened it". Options: *Reload theirs* / *Keep mine (overwrite)* (needs `screen.publish`) / *Open as new branch + PR*. Because the source is `<M>.studio.json`, a JSON 3-way merge per field is possible (phase 6). |
| Generated `.ts`/`page.tsx` was hand-edited by a developer (its sha differs from the sha Studio recorded at last publish, and the config did not change) | Mark `IsHandEdited`. Warn before regenerating: "A developer edited the code of this screen by hand. Saving from Studio will replace those edits." Offer *Publish to a branch + PR* instead. |
| Protected branch (`422`/`403` on ref update) | Automatically switch to `CommitMode=branch_pr`: create `studio/<user>/<module>-<yyyyMMddHHmm>`, commit there, `POST /pulls`. |

**Serialization and limits:** one in-process queue per repository (`Channel<PublishJob>` + `SemaphoreSlim` per ProjectId) so Studio never races itself. Respect `X-RateLimit-Remaining` and secondary limits (back off on 403/429 with `Retry-After`). Library: a plain typed `HttpClient` (no dependency), or **Octokit.NET (MIT)**, which wraps the Git Data API.

**Token and secret storage:** `SecretProtector` uses AES-256-GCM envelope encryption. The master key comes from an environment variable or a key vault (`STUDIO_MASTER_KEY`), never from `appsettings.json` in the repo. Each secret gets a random nonce and the ciphertext is stored with a key id so keys can rotate. Secrets are **write-only** in the API: the UI shows the hint only. ASP.NET Data Protection keys (cookies, antiforgery) are persisted to a folder protected by a certificate (Linux) or DPAPI-NG (IIS).

**Local developers (no git on this machine):** after Studio commits, developers need the changes. Options: install Git for Windows or GitHub Desktop (recommended), or download a ZIP from GitHub. Optional: a GitHub Actions workflow in the project repo builds and deploys the runtime on push to `main`. Studio must never write that workflow (path guard).

### 2.5 Connecting to the target project DB

| Topic | Design |
|---|---|
| Input | The user pastes a connection string per environment (or uses a field form: server, DB, auth). Studio parses it with `SqlConnectionStringBuilder`, forces `Encrypt=True` (allowing `TrustServerCertificate` only with a warning), `ConnectTimeout=10`, `ApplicationIntent` unchanged, `Application Name=ERP_Studio`. It is tested before saving. |
| Who can add it | `project.env.manage` only. Optional server allow-list (`StudioSetting: AllowedDbHosts`) to stop the server being used to probe internal hosts (SSRF). |
| Recommended SQL login | A dedicated login, e.g. `erp_studio`. **Read:** `VIEW DEFINITION`, `SELECT` on `sys.*` metadata, `SELECT` on allowed objects (sample data). **Write:** `EXECUTE` on `dbo.Sys_RegisterModule`, `INSERT/UPDATE/DELETE` on `Sys_Modules`, `Sys_RoleModule`, `Sys_UserModule`, `Sys_Role`, `Sys_RoleUsers`, `Sys_Users`, `Sys_Reports`, `Sys_ReportParams`, `Sys_ReportLayouts`, `Sys_ExternalApis`. **DDL** only through a separate, optional "apply SQL" connection when `AllowApplySql = 1`. |
| Metadata endpoints | `GET objects` (tables, views, procs, functions from `sys.objects`/`sys.procedures`/`sys.sql_modules`, with `type IN ('U','V','P','FN','IF','TF')`), `GET columns` (same query as today's `ScreenBuilderController.Columns`: identity, computed, PK, view-only = NotInDb), `GET proc-params` (`sys.parameters` + `sys.dm_exec_describe_first_result_set_for_object`), `GET fn-params`, `GET foreign-keys` (`sys.foreign_keys`, used for auto lookups), `GET resources` (`G_Resources`), `GET sample?object=&top=20` (allowed objects only, read-only, `SET ROWCOUNT`, `READ UNCOMMITTED` optional), `POST distinct-values`, `POST validate-condition` (ported from today, with the same keyword block list). |
| Permission filter | Every metadata/sample call runs through `ObjectAllowList.Check(userId, projectId, schema, name, type, capability)`. Deny wins. Patterns are compiled once per request. The **save/publish** validator re-checks every table, view, proc and function referenced in the config (main table, view, details, lookups `selectTable`, search functions, report proc), so a user cannot hand-craft JSON to reach a hidden object. |
| Identifier safety | Names are validated against `sys.objects` (exists, type) and quoted with `QUOTENAME`. Values are always `SqlParameter`. There is **no general execute-SQL endpoint**. |
| Registering a screen | `EXEC dbo.Sys_RegisterModule @MODULE_CODE, @MODULE_DESCA, @MODULE_DESCE, @MODULE_MENU, @MODULE_TYPE, @MODULE_SORT, @Url_Image, @Icon_Color, @AllowCustom` (as today). If the proc is missing, Studio offers `TargetBootstrap/Phase4_Sys_RegisterModule.sql` (needs `db.sql.apply`). Optionally it grants roles chosen in the wizard by inserting `Sys_RoleModule` rows. Everything runs in one transaction and is logged in `Publish.DbActionsJson`. |
| Order on publish | 1) validate, 2) generate files, 3) Git commit, 4) DB registration on the chosen environment. If step 4 fails, the commit stays and the publish shows "Code saved, menu registration failed (reason). [Retry registration]". The step is idempotent. |
| Reach | The Studio server must reach the customer SQL Server. If it cannot (on-prem DB behind NAT), a later "Studio Connector" (a small outbound-only agent next to the DB using WebSocket/SignalR) relays metadata calls. This is out of scope for v1 (risk 4). |

### 2.6 Framework conventions Studio relies on (small additions to the framework repo)

| Addition | Purpose |
|---|---|
| `.erp-studio/project.json` | `{ "frameworkVersion": "1.0", "frontendRoot": "Frontend/App", "clientAppPath": "app/ClientApp", "databaseRoot": "Database", "reportsPath": "Frontend/App/app/ClientApp/Reports", "resourcesFile": "app/ClientApp/Shared/Resources.ts", "searchFile": "app/ClientApp/Shared/G_SearchFrom.ts", "allowedWriteRoots": [...] }` |
| `<Module>/<Module>.studio.json` | The screen config is stored as a real file. The marker comment is still written for backward compatibility. A JSON file can be diffed and merged, while the single-line marker cannot. |
| `frameworkVersion`, then `@erp-studio/codegen/v{n}` | Studio picks the generator matching the project's runtime components API. A project newer than Studio is opened read-only. |
| Later (optional): split `Shared/Resources.ts` and `G_SearchFrom.ts` per module | These two shared files are the main conflict hot spots |

### 2.7 Studio security model (summary)

| Layer | Control |
|---|---|
| Transport | HTTPS only, HSTS, TLS 1.2+ |
| Auth | Username/email + password (hashed), lockout after 5 failures, **TOTP MFA** (required for SuperAdmin and anyone with `project.env.manage`), 15-minute JWT access token in memory, 14-day rotating refresh token in an httpOnly `Secure` `SameSite=Strict` cookie with reuse detection |
| Authorization | Permission policies per action + project access + DB object allow-list (2.3/2.5). Server-side always; the UI only hides buttons. |
| Secrets | AES-GCM envelope (2.4), write-only, never logged (Serilog destructuring filters) |
| Input | Identifier regexes and `sys.objects` checks, path guard on commits, JSON Schema validation of screen/report configs, size limits |
| Generated code | Generator escapes every string literal (as today's `q()`/`EscJs`). Conditions with `{row.X}`/`{session.X}` are kept as data, not code. The publish validator rejects configs whose conditions contain `;`, `--`, `/*` or write keywords (port of `BadCondition`). |
| Abuse | ASP.NET Core rate limiter (login 10/min/IP, metadata 120/min/user), CORS limited to the Studio origin, CSRF safe (bearer token + SameSite cookie), security headers (CSP, X-Frame-Options DENY except the preview iframe on the same origin) |
| Audit | Every login, grant change, publish, DB registration and secret change goes to `AuditLog` with a correlation id. Viewable with `studio.audit.view`. |
| Framework note | The XOR payload "encryption" in the runtime is obfuscation, not security, and is not reused in Studio |

### 2.8 External API keys written by Studio

The runtime decrypts `Sys_ExternalApis.ApiKeyEnc` with its own `ExternalApis:EncryptionKey`. Studio must write values the runtime can read **without knowing the runtime key in plain text**.

- **Recommended:** the runtime gets a one-time RSA key pair (the private key stays in runtime config). The public key is pasted into the Studio project (`RuntimeKeyPublicPem`). Studio stores `ApiKeyEnc = "rsa1:" + RSA-OAEP(SHA-256)(key)`. `ExternalApiService` learns to read the `rsa1:` prefix and keeps reading old AES values.
- **Fallback:** store the runtime's AES key as a Studio secret per environment and encrypt with AES-GCM, exactly as `ExternalApiService` does today.

### 2.9 Deployment

| Target | Steps |
|---|---|
| **IIS (Windows Server)** | Install the .NET 9 Hosting Bundle. Create an app pool with "No Managed Code" and its own identity. Publish `Studio.Api` with `Frontend/out` copied into `wwwroot` (one site, one origin). Add an HTTPS binding (win-acme / Let's Encrypt). Set env vars `STUDIO_MASTER_KEY`, `ConnectionStrings__Studio`, `GitHubApp__PrivateKeyPath`. Data Protection keys go to `D:\ErpStudio\keys` with DPAPI-NG. Enable WebSockets if live updates are used later. |
| **Linux** | `dotnet publish -c Release` to `/opt/erp-studio`. systemd unit `erp-studio.service` (Kestrel on `127.0.0.1:5080`). nginx reverse proxy with TLS (certbot), `client_max_body_size 20m`, forwarded headers. Data Protection keys go to `/var/lib/erp-studio/keys` protected by an X.509 cert. Alternatively, a Docker image `mcr.microsoft.com/dotnet/aspnet:9.0` with the headless Chromium layer for PDF. |
| Studio DB | SQL Server (any edition), DB `ERP_Studio`, migrations from `ERP_Studio/Database/Migrations`. Nightly backup. The app login cannot UPDATE/DELETE `AuditLog`. |
| Observability | Serilog to file/Seq, `/health` (DB, GitHub reachability), request correlation ids |
| Background work | In-process hosted service for the publish queue and draft cleanup. Hangfire is not needed in v1. |

---

## 3. Report system: own JSON band designer (replaces Stimulsoft)

### 3.1 Evaluation

| Option | License | Arabic/RTL in PDF | Ease for non-programmers | Verdict |
|---|---|---|---|---|
| Stimulsoft Reports.JS (current) | Commercial (license key, otherwise watermark) | Good | **Too hard** (owner feedback); huge bundle | Remove |
| DevExpress / Telerik / Bold Reports / ActiveReportsJS | Commercial | Good | Professional but complex, banded UIs aimed at developers | Rejected (paid, complex) |
| pdfme (designer + generator) | MIT | Weak: draws text with pdf-lib, so Arabic shaping and bidi are not reliable | Simple | Rejected as renderer; good UX reference |
| jsPDF / pdf-lib / pdfmake direct | MIT | Weak to partial Arabic shaping | n/a | Rejected |
| jsreport | LGPL/commercial | Good (Chrome) | Developer-oriented (HTML templates) | Rejected |
| Carbone (Word/LibreOffice templates) | Community license (non-OSI) | Good | Needs Word skills; no 80mm/labels comfort | Rejected |
| **Own band designer in React → HTML/CSS renderer → browser print / headless Chromium PDF** | Our code + MIT/Apache libs | **Best**: the browser does Arabic shaping, bidi and fonts (Cairo) | Designed for the owner (wizard + templates) | **Recommended** |

### 3.2 Layout model (`rf-report/1`)

```jsonc
{
  "schema": "rf-report/1",
  "code": "INV_A4", "nameAr": "فاتورة ضريبية", "nameEn": "Tax invoice",
  "kind": "document",                        // document (one record + lines) | list (grouped)
  "page": { "size": "A4", "orientation": "portrait", "width": null, "height": null,   // mm when Custom / Thermal (height auto)
            "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 }, "dir": "auto" },
  "data": { "source": { "type": "proc", "name": "dbo.Rpt_SalesInvoice" },
            "params": [ { "name": "TrID", "from": "row", "value": "TrID" },
                        { "name": "CompCode", "from": "session", "value": "CompCode" } ],
            "tables": { "Data": "header", "Data2": "lines" } },   // multiple result sets
  "styles": { "base": { "font": "Cairo", "size": 10, "color": "#0b1c30" }, "th": { ... } },
  "bands": [
    { "type": "reportHeader", "elements": [ ... ] },
    { "type": "pageHeader",   "repeat": true, "elements": [ ... ] },
    { "type": "groupHeader",  "groupBy": "BranchName", "keepTogether": true, "elements": [ ... ] },
    { "type": "detail",       "table": "lines", "layout": "table",
      "columns": [ { "field": "ItemName", "titleAr": "الصنف", "width": "40%" },
                   { "field": "Qty", "format": "n2", "align": "end" },
                   { "field": "Total", "format": "n2", "aggregate": "sum" } ] },
    { "type": "groupFooter",  "groupBy": "BranchName", "elements": [ { "type": "text", "value": "{{sum(Total)}}" } ] },
    { "type": "reportFooter", "elements": [ { "type": "qr", "value": "{{zatcaQr()}}" },
                                            { "type": "text", "value": "{{tafqeet(header.NetTotal, 'SAR')}}" } ] },
    { "type": "pageFooter",   "elements": [ { "type": "text", "value": "{{page}} / {{pages}}" } ] }
  ]
}
```

- **Band types:** reportHeader, pageHeader, groupHeader (n levels), detail, groupFooter, reportFooter, pageFooter. Each band has `layout: "flow"` (stacked rows/columns, the default and the easiest) or `layout: "absolute"` (mm positions, used for labels and pre-printed forms).
- **Elements:** text, field, image/logo (company logo from `Company.LogoBase64`), line, box, table (auto columns), barcode (Code128, EAN-13, Code39, ITF), QR (incl. ZATCA TLV), chart (bar/line/pie/donut), page number, date/time, signature box, sub-table (second result set), spacer, page break.
- **Expressions:** a safe mini-language. `{{Field}}`, `{{header.X}}`, `{{Company.CompNameA}}`, aggregates `sum/count/avg/min/max` in group, report or page scope, formats `n0/n2/c/date/dateTime/percent`, and helpers `tafqeet()` (amount to Arabic words), `zatcaQr()`, `if(cond,a,b)`. It is parsed into an AST and evaluated with no `eval`. JSONLogic (MIT) is an alternative internal form.
- **Paper presets:** A4, A5, Letter, Thermal 80mm (72mm printable, height auto), Thermal 58mm, label sheets (e.g. A4 3×8 = 70×37mm, single 50×25mm / 40×30mm rolls), Custom.

### 3.3 Libraries (all permissive)

| Need | Library | License |
|---|---|---|
| Drag and drop / sorting in the designer | `@dnd-kit/core`, `@dnd-kit/sortable` | MIT |
| Move/resize in absolute bands | `react-moveable` (or `react-rnd`) | MIT |
| Undo/redo | `zundo` (zustand temporal middleware) | MIT |
| Pagination for screen preview (page X of Y, running headers/footers) | `pagedjs` | MIT |
| Barcodes | `bwip-js` (many symbologies, SVG) or `JsBarcode` | MIT |
| QR | `qrcode` | MIT |
| Charts in reports (SVG, prints sharply) | Apache **ECharts** (SVG renderer) | Apache-2.0 |
| Excel export | `exceljs` (already in the framework) | MIT |
| Server PDF (optional, for email or archive) | **PuppeteerSharp** (MIT) or **Microsoft.Playwright for .NET** (Apache-2.0) + Chromium | MIT / Apache-2.0 (Chromium BSD) |
| Fonts | Cairo (OFL, already in `/fonts/Cairo`), Inter (OFL) | OFL-1.1 |

Note: the framework already depends on `apexcharts`. Check its current license terms before using it in printed reports. ECharts is chosen to stay on Apache-2.0.

### 3.4 Studio report designer UX

1. **Wizard:** *What do you want to print?* (Invoice A4 / Receipt 80mm / Barcode labels / List with groups and totals / Statement / Chart summary) → pick data (allowed procs/views only) → map parameters (auto-match `@CompCode` to session, `@TrID` to row) → auto-layout from the result columns → open the designer.
2. **Designer:** a band list on the left, the page canvas in the center (real mm scale, zoom, rulers in absolute bands) and properties on the right with an example in every section. Drag a field from the "Data" panel onto a band. A "Totals" toggle on a numeric column adds `sum` to the group and report footers.
3. **Preview** with real sample data (`run` with Sample through Studio's own DB connection, capped at 200 rows), page navigation, desktop/phone, plus *Print test* and *Download PDF*.
4. **Scope:** the default layout goes into the repo. Company/branch overrides go into the target DB (3.5).

### 3.5 Storage

| What | Where | Why |
|---|---|---|
| Report definition (code, names, kind, MODULE_CODE, proc, param mapping) | Target DB `Sys_Reports` + `Sys_ReportParams` (existing tables, written by Studio) **and** `Reports/<CODE>.report.json` in the repo | The DB is what `run` reads. The repo copy is versioned. |
| Default layout (scope = all) | Repo `Frontend/App/app/ClientApp/Reports/<CODE>.layout.json` **and** mirrored into `Sys_ReportLayouts` (`Scope='all'`, `LayoutFormat='json'`) | The runtime resolves layouts from the DB as today. The repo provides history and review. |
| Company/branch overrides | `Sys_ReportLayouts` only (`Scope='company'/'branch'`, `LayoutFormat='json'`, `LayoutJson`) | Tenant data, not code |
| Old Stimulsoft layouts | `LayoutFormat='mrt'` (`LayoutMrt`) | Kept unread by the new renderer. The viewer falls back to an **auto layout** (header + table of all columns, the equivalent of today's `defaultLayout.ts`) until a JSON layout is designed. No `.mrt` conversion is attempted. |

DB migration (in `Phase10_Remove_Admin.sql` or a separate `Phase11_Report_Json.sql`): add `LayoutFormat VARCHAR(10) NOT NULL DEFAULT('mrt')` and `LayoutJson NVARCHAR(MAX) NULL` to `Sys_ReportLayouts`. `ReportsController.resolve-layout` returns `LayoutFormat` and `LayoutJson`.

### 3.6 Runtime renderer kept in the framework (small)

| File (in `Frontend/App/app/ClientApp/Shared/Reports/`) | Responsibility | Size target |
|---|---|---|
| `openReport.tsx` | **Unchanged signature** `openReport({ reportCode, row?, trId?, filters?, title?, moduleCode? })`. It mounts the viewer in a temporary root (as today). | ~25 lines |
| `ReportService.ts` (rewritten) | `get-report`, map parameters (filter/session/row/const, as today), `run`, `resolve-layout`. No admin calls. | ~120 lines |
| `ReportViewer.tsx` (rewritten) | Modal: toolbar (print, PDF, Excel, zoom, page nav, parameters side panel), RTL aware | ~200 lines |
| `renderer/` = vendored copy of `@erp-studio/report-renderer` (`ReportDocument.tsx`, `bands.tsx`, `elements/*`, `expr.ts`, `format.ts`, `aggregate.ts`, `tafqeet.ts`, `zatca.ts`, `print.css`) | Pure function `render(layout, data, company, lang)` to React HTML with `@page { size: ... }` CSS. Printing uses `window.print()` from an isolated iframe. 80mm uses `@page { size: 80mm auto; margin: 0 }`. Table headers repeat through `<thead>`. Page numbers use CSS counters or pagedjs. | ~1,200-1,500 lines, + `bwip-js`, `qrcode`, `echarts` lazy-loaded only if the layout uses them |
| `autoLayout.ts` | Builds a JSON layout from result columns when no layout exists (replaces `defaultLayout.ts`) | ~80 lines |
| `ReportTypes.ts` | Runtime types (definition, layout meta, `rf-report/1` types) | ~120 lines |

**Distribution:** Studio publishes renderer updates as a normal commit ("Update report renderer to 1.3.0") into `Shared/Reports/renderer/` with a `VERSION` file, so the runtime has no npm dependency on Studio. The renderer is versioned with `frameworkVersion`. Studio's preview always uses the same renderer version as the project.

**Server PDF (optional):** a small `POST api/Reports/pdf` in the runtime or Studio that loads the viewer page in headless Chromium and returns `page.pdf()`. It is not needed for printing. It is useful for email or WhatsApp sending and archiving.

---

## 4. UX for non-programmers

### 4.1 Wizard-first creation

| Step | What the user sees | Smart defaults |
|---|---|---|
| 1. What are you building? | Cards: *Simple list (Grid)*, *Document with lines (Master-Detail)*, *Tree (chart of accounts / cost centers)*, *Report*, *Start from template* | - |
| 2. Pick your data | Only allowed tables/views with friendly names (from `G_Resources` or a column description). Search box. "Recently used". | The view is auto-suggested when `IQ_<Table>` exists (framework convention: save to `I_TR_Sales`, list from `IQ_TR_Sales`) |
| 3. Choose fields | A checklist with a live mini preview | Hide identity/computed/`CompCode`/`BranchCode`/audit columns. Computed columns become read-only (`IsSave:false`). Foreign keys become lookups automatically. |
| 4. Titles and menu | Arabic + English names (prefilled from resources), menu group, icon picker | Module code is derived from the table name and validated |
| 5. Permissions | "Which roles can open / add / edit / delete / print?" toggles per role | Admin roles (`IsAdmin=1`) get everything (as `Sys_RegisterModule` does) |
| 6. Review and publish | Summary + "what will be saved" (files, DB rows) in plain words | Commit message is generated, e.g. "Studio: add screen SalesInvoice (by Ahmed)" |

The advanced designer (today's DesignerView + tabs) stays one click away: *Open in designer*.

### 4.2 Templates gallery per business

Retail/POS (items, customers, sales invoice, receipt 80mm, shelf labels), Restaurant (menu items, orders, kitchen ticket 80mm), Clinic (patients, appointments, invoice), Accounting (chart of accounts tree, journal voucher, cost centers, cash types), Inventory (warehouses, stock transfer, opening stock, barcode labels), HR (employees, attendance, payslip A4), Services (contracts, maintenance requests). Each template declares `RequiredObjectsJson`. The gallery shows *Ready* when matching objects exist, otherwise *Needs a table like ...*. The existing `utils/examples.ts` entries are the seed.

### 4.3 Contextual help with an example in every section

Every panel and property group has a **?** that opens a side sheet (port of `HelpPanel.tsx`) with: one-sentence explanation in plain Arabic/English, a **concrete example** (e.g. "Visible when: show *Cheque number* only when *Payment type* = Cheque"), a **Try it** button that applies the example to a sandbox copy, and a link to a 30-second GIF. Help text lives in `src/help/{ar,en}/*.md` so it can be translated and reviewed.

### 4.4 Live preview desktop / tablet / mobile

A preview iframe at 1280 / 820 / 390 px widths with orientation toggle and light/dark. It uses sample rows from the target DB (allowed objects only, 20 rows) or generated fake data when there is no connection. Fidelity: v1 uses a schema-driven preview renderer inside Studio, which mirrors DynamicGrid/MasterDetail/TreeScreen styles (today's LiveCanvas/PreviewTab approach). Later, the runtime components could be extracted into a versioned package shared by both, for exact fidelity.

### 4.5 Cascading filter builder

UI: each filter has **Depends on: [filter A]** and **Show only values where [column] = [A's value]**. Stored as `selectCondition: "CityId = {filter.CityId}"` (the `{filter.X}` placeholder is already supported by the generator). Generated behaviour: when A changes, B clears and reloads its options. With several levels (Country → City → District), each level clears the ones below. Validation catches loops ("City depends on District, which depends on City") and missing parents. The same mechanism applies inside forms with `{row.X}` (field B depends on field A).

### 4.6 Undo/redo, autosave, validation

- **Undo/redo:** `zundo` on the builder store, with typing coalesced into one step per 500 ms, `Ctrl+Z / Ctrl+Y` (`Cmd` on Mac), toolbar buttons and a History panel ("Added field Qty", "Changed title"). History is limited to 100 steps.
- **Autosave** of drafts to `ScreenDraft` every 10 seconds and on blur. "Restore draft?" appears on reopen. A soft `EditLock` shows "Mona is editing this screen".
- **Validation** (port and extend `validateConfig.ts`) runs live. Each message has a **severity** (error blocks publish, warning allows it), **plain language**, a **Fix** button that jumps to the field, and both languages. Examples: "The list has no columns yet. Choose at least one field to show." / "Field *Customer* is required but it is hidden on the add form, so users can never fill it." / "*Total* is calculated by the database, so it will be shown but not saved."

### 4.7 Arabic / English and RTL

`<html dir>` and `lang` switch at runtime. Only CSS logical properties are used (`ms-*`, `me-*`, `ps-*`, `start-*`, `text-start`). Cairo is used for Arabic and Inter for Latin, with tabular numbers (`tnum`) for amounts. Mixed codes are isolated with `<bdi dir="ltr">`. All Studio strings are in `i18n/{ar,en}.ts`. The canvas mirrors itself in Arabic mode, and drag handles and arrows flip.

### 4.8 Studio design system (from `Design/Stitch/export`)

The Stitch export defines two themes (`bilingual_enterprise_erp` light, `bilingual_enterprise_dark`) and reference screens: `no_code_screen_builder`, `report_viewer`, `users_permissions`, `login_branch_selector`, `mobile_slide_out_menu`, `sales_invoices_*`, `new_sales_invoice_*`, `new_invoice_mobile`. The `no_code_screen_builder` screenshot already shows the target Studio layout: a properties panel, a canvas with filter/header/lines/footer zones, a components palette with a hint card, and a top toolbar with device toggles, undo/redo, Excel, print settings, preview and "Save & publish".

**Tokens (`src/design-system/tokens.css`):**

| Token | Light | Dark |
|---|---|---|
| `--bg` (canvas) | `#F8FAFC` | `#0B1120` |
| `--surface-1` (cards/panels) | `#FFFFFF` | `#0F172A` |
| `--surface-2` (headers, hover) | `#F1F5F9` | `#1E293B` |
| `--surface-3` (selected/popover) | `#E2E8F0` | `#334155` |
| `--border` | `#E2E8F0` | `#1E293B` |
| `--border-strong` | `#CBD5E1` | `#334155` |
| `--text` | `#0F172A` | `#F8FAFC` |
| `--text-muted` | `#45464D` / `#64748B` | `#94A3B8` |
| `--primary` (main commands) | `#0F172A` (hover `#1E293B`) | `#14B8A6` (text `#0B1120`) |
| `--accent` (focus, selection, secondary action) | `#0D9488` (hover `#0F766E`) | `#14B8A6` (pressed `#0D9488`) |
| `--accent-2` (analytics/info highlights) | `#06B6D4` | `#06B6D4` |
| `--success` / tint | `#10B981` / `#ECFDF5` | `#10B981` / `rgba(16,185,129,.12)` |
| `--warning` / tint | `#F59E0B` / `#FFFBEB` | `#F59E0B` / `rgba(245,158,11,.12)` |
| `--danger` / tint | `#F43F5E` / `#FFF1F2` | `#F43F5E` / `rgba(244,63,94,.12)` |
| `--info` / tint | `#0284C7` / `#F0F9FF` | `#0284C7` / dark tint |
| Focus ring | `0 0 0 3px rgba(13,148,136,.15)` + border `#0D9488` | `0 0 0 1px #14B8A6, 0 0 12px rgba(20,184,166,.25)` |
| Elevation 1-4 | slate-tinted shadows from DESIGN.md (`rgba(15,23,42,.04)` … `.12`), modal backdrop `rgba(15,23,42,.45)` | tonal tiers + 1px borders, modal shadow `rgba(0,0,0,.6)` |
| Radius | sm 4px, controls 8px, cards 12px, chips 6px or pill | 12px controls/cards, chips 6px |

**Typography:** `headline-xl` 28/36 bold (mobile 22/28), `headline-lg` 22/28 600 (mobile 18/24), `headline-md` 18/24 600, `headline-sm` 15/20 600, `body-lg` 15/22, `body-md` 13/18, `body-sm` 12/16, `label-md` 13/18 500, `label-sm` 11/14 600 tracking .04em. Font stack AR: `'Cairo','Inter',sans-serif` with line-height +4-6%. EN: `'Inter','Cairo',sans-serif`. Numbers use `font-variant-numeric: tabular-nums`.

**Layout:** desktop ≥1280 uses 12 columns, 2rem margin, 1.5rem gutter, sidebar 260px or 72px collapsed. Tablet 768-1279 uses 8 columns with the sidebar as a drawer. Mobile <768 uses 4 columns, 1rem margin, tables become stacked cards, and touch targets are 44px.

**Components** (Studio library, Tailwind preset + headless React): Button (primary / accent / outline / destructive / ghost; 36px, 44px touch), Input/Select/Combobox/DatePicker (36px, RTL prefix side), Checkbox/Radio/Switch (16px, accent checked), Badge (22px, status pairs), Card/KPI, DataTable (40/48px rows, sticky header, zebra `#FAFCFF`, selected tint `rgba(13,148,136,.05)`), Tabs, Drawer/BottomSheet (mobile properties), Modal, Toast (maps to the framework's success/error/warning/info), Stepper (wizard), EmptyState with illustration + example, HelpSheet, DeviceFrame (preview), PermissionMatrix (port), Canvas zones (dashed drop targets as in the Stitch builder), Topbar (project switcher, environment badge such as "Production" in red, language toggle, theme toggle, user menu).

**Mobile builder mode:** the palette becomes a bottom drawer, adding is tap-to-add (drag stays optional), properties open in a full-height bottom sheet, the canvas is a single column, and the preview defaults to the phone frame. Report design on a phone is limited to *edit texts/fields and preview*. Absolute-band positioning needs a tablet or desktop and the UI says so.

---

## 5. Phased implementation plan

| Phase | Scope | Deliverables | Est. |
|---|---|---|---|
| **0. Decisions and repo prep** | Create `C:\PC\Work\ERP_Studio` and its GitHub repo. Register the GitHub App. Add `.erp-studio/project.json` to React_Fram. Agree the `frameworkVersion = 1.0` baseline. | Repo skeleton, manifest, this doc approved | 3-5 days |
| **1. Studio foundation** | Backend solution, Studio DB migrations, auth (password, lockout, refresh, MFA), Studio users/roles/permissions, projects, environments (encrypted connection strings + test), project access, `DbObjectGrant` UI, audit, design system shell (light/dark, AR/EN, responsive) | Login → project list → project settings, working on phone and desktop | 3 weeks |
| **2. Read the project** | GitHub gateway (tree, blobs, cache), screen scan (studio.json / v5 marker / v3 marker), metadata endpoints filtered by grants, sample data | "Screens" page lists existing screens and opens them read-only in the builder | 2 weeks |
| **3. Screen builder port + publish** | Port ScreenBuilder (schema, codegen v1, converter, validate, designer, tabs), replace `sqlApi` with the Studio API, drafts, locks, undo/redo, Git Data API commit (atomic, path guard, conflict auto-rebase, PR fallback), Resources/G_SearchFrom patchers, `Sys_RegisterModule` + role grants, search-function manager | Create/edit a Grid, Master-Detail or Tree screen from a phone and see it committed on GitHub and registered in the DB | 4 weeks |
| **4. App administration in Studio** | Port users / roles / matrix / per-user overrides / external APIs against the target DB (logic of `AdminUsersController` moved into Studio), RSA key for API keys | Owner manages ERP users and permissions from Studio | 2 weeks |
| **5. Non-programmer UX** | Wizard, templates gallery per business, help sheets with examples, device preview, cascading filter builder, plain-language validation, empty states | A non-programmer builds a simple screen end-to-end with no help | 3 weeks |
| **6. Report designer + runtime renderer** | `rf-report/1` schema, renderer package, designer (bands, flow + absolute, barcode/QR/chart, totals, groups), report wizard + templates (A4 invoice, 80mm receipt, labels, grouped list), Studio report admin (definitions, params, scopes), DB migration `LayoutFormat/LayoutJson`, runtime `ReportViewer`/`ReportService` rewrite, optional server PDF | Print an A4 tax invoice, an 80mm receipt and a label sheet from the runtime, with no Stimulsoft | 5-6 weeks |
| **7. Remove admin from the framework** | Apply section 1.4 in one branch: delete files, split `ReportsController`/`ExternalApisController`, `Routes.tsx`, `package.json`, `Phase10_Remove_Admin.sql`. Build and smoke-test every existing screen (TestPage, CashTypes, FinancialType, SalesInvoice, CostCenterTree, Tst*), print buttons and login. | Clean runtime release | 1 week |
| **8. Hardening** | Penetration test checklist, rate limits, backups, IIS + Linux deploy scripts, monitoring, JSON 3-way merge for conflicts, optional Studio Connector for on-prem DBs, optional password hashing migration for `Sys_Users` | Production readiness | 2+ weeks |

**Ordering note on the owner's "remove immediately" decision:** phase 7 can be pulled forward to right after phase 3 (screens) and phase 4 (users/permissions). Printing must keep working, though. Either finish phase 6's runtime renderer first, or ship phase 7 with the **auto-layout-only** viewer (prints a clean header + table for every report) until designed JSON layouts exist. Do not delete `Shared/Reports` without a replacement, because `DynamicGrid` and `MasterDetail` import `openReport`.

---

## 6. Studio API surface (v1, all JSON, all permission-checked)

| Area | Endpoints |
|---|---|
| Auth | `POST auth/login`, `POST auth/mfa`, `POST auth/refresh`, `POST auth/logout`, `GET me`, `POST me/password` |
| Studio admin | `GET/POST/PUT users`, `POST users/{id}/reset-password`, `GET/POST roles`, `PUT roles/{id}/permissions`, `PUT users/{id}/roles`, `PUT users/{id}/permissions`, `GET audit` |
| Projects | `GET/POST/PUT projects`, `POST projects/{id}/git/connect`, `POST projects/{id}/git/test`, `GET/POST/PUT projects/{id}/environments`, `POST environments/{id}/test`, `GET/PUT projects/{id}/access`, `GET/PUT projects/{id}/db-grants` |
| Repo | `GET projects/{id}/repo/branches`, `GET repo/tree`, `GET repo/file?path=`, `POST repo/rescan` |
| DB metadata | `GET db/objects`, `GET db/columns`, `GET db/proc-params`, `GET db/fn-params`, `GET db/foreign-keys`, `GET db/resources`, `GET db/sample`, `POST db/distinct-values`, `POST db/validate-condition` |
| Screens | `GET screens`, `GET screens/{module}`, `PUT screens/{module}/draft`, `POST screens/{module}/lock`, `POST screens/{module}/validate`, `POST screens/{module}/generate` (preview of files), `POST screens/{module}/publish`, `DELETE screens/{module}` (commit deleting files + optional module unregister) |
| Search functions | `GET/PUT/DELETE search-functions` |
| Reports | `GET/PUT/DELETE reports`, `GET/PUT reports/{code}/layouts`, `POST reports/{code}/sample-run`, `POST reports/{code}/publish`, `POST reports/pdf` |
| App admin (target DB) | `app-users/*`, `app-roles/*`, `app-matrix/*`, `integrations/*` (same operations as today's `AdminUsersController` / `ExternalApisController` admin side) |
| Publish | `GET publishes`, `GET publishes/{id}`, `POST publishes/{id}/retry-db` |
| Templates | `GET templates?kind=&business=`, `POST/PUT templates` |

---

## 7. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **Studio is a high-value target**: it stores GitHub write access and DB connection strings for many projects, and generated code ships to production | Critical | GitHub App (short-lived tokens, per-repo), AES-GCM envelope with the master key outside the repo, write-only secrets, MFA, least-privilege SQL login, commit path guard (no `.github/`, no backend code), no generic execute-SQL, full audit, rate limits |
| 2 | **Git conflicts and drift**: developers hand-edit generated files, or two Studio users edit the same screen; shared files (`Resources.ts`, `G_SearchFrom.ts`) collide | High | `<Module>.studio.json` as the source of truth, blob-sha tracking with `IsHandEdited` warning, re-patching shared files on the latest head, auto-rebase when paths do not overlap, PR fallback, soft edit locks, later JSON 3-way merge, later split of shared files per module |
| 3 | **Generator vs framework version skew**: generated code imports `DynamicGrid`/`MasterDetail`/`TreeScreen`/`openReport` APIs that may differ per project version | High | `frameworkVersion` manifest, versioned `codegen/vN`, read-only mode for unknown versions, contract tests that compile generated samples against each supported framework version |
| 4 | **Reaching customer DBs** from a hosted server (firewalls, NAT, latency, exposing SQL to the internet) | High | Per-environment test, host allow-list, TLS to SQL, read-only option; v2 "Studio Connector" outbound agent; Production marked clearly in red |
| 5 | **Report designer effort and Arabic print fidelity** (pagination, repeated headers, 80mm, labels, ZATCA QR, number-to-words) | High | Browser rendering (correct Arabic shaping) instead of pdf-lib, start with flow layout + 4 templates, absolute bands only for labels, pagedjs/Chromium tested early on real thermal printers, auto-layout fallback so printing never breaks |
| 6 | Removing admin "immediately" breaks printing or menus | Medium | Exact list in 1.4, keep `openReport` signature, ship the auto-layout viewer before deleting Stimulsoft, smoke-test checklist, DB cleanup script reviewed before running |
| 7 | Preview fidelity differs from the real runtime | Medium | Shared styles/tokens; later extract the runtime components into a versioned package used by both |
| 8 | GitHub API limits / outages | Low-Medium | Blob cache by sha, ETags, per-repo queue, back-off, publish retry |
| 9 | Plain-text passwords in `Sys_Users` (runtime) become visible to Studio app-admin features | Medium | Never show passwords (reset only); plan a hashing migration in the framework `AuthController` (separate approved task) |
| 10 | No git on the owner's machine: local copy gets out of date after Studio commits | Low | Install GitHub Desktop / Git for Windows, or rely on CI deploy from GitHub |
| 11 | Known framework bug `BuildWhereUltraFast` (`"= 1"` replace breaks `"= 15"`) can affect generated conditions | Medium | Validator warns on conditions with `= 1x` patterns until fixed in the framework |

---

## 8. Open questions for the owner

1. Commit mode default: commit **directly to `main`**, or a branch + Pull Request per publish?
2. Should every Studio user type their own SQL login per environment (`ProjectUserConnection`), or does the project owner enter one shared connection per environment?
3. Is a **GitHub App** acceptable, or start with a fine-grained personal token?
4. Hosting target for Studio: IIS on an existing Windows server, or a Linux VPS?
5. Is server-side PDF (headless Chromium) needed in v1, for example for WhatsApp/email invoices, or is browser printing enough?
