# Backup before admin removal + Stimulsoft replacement (2026-11-12)

Copies taken BEFORE any change (git is not installed — this is the only undo).
Paths are relative to `C:\PC\Work\React_Fram`. To restore an item, copy it back to the same relative path.

## Deleted (full copy here)
| Path | What |
|---|---|
| `Frontend/App/app/ClientApp/Admin/` | admin dashboard |
| `Frontend/App/app/ClientApp/AdminLogin/` | admin login page |
| `Frontend/App/app/ClientApp/AdminUsers/`, `AdminRoles/`, `AdminUserPerms/`, `AdminReports/`, `AdminExternalApis/` | admin wrappers |
| `Frontend/App/app/ClientApp/Sys_UsersAdmin/`, `Sys_RolesAdmin/`, `Sys_UserPermsAdmin/`, `Sys_ReportsAdmin/`, `Sys_ExternalApisAdmin/` | admin screens |
| `Frontend/App/app/ClientApp/ScreenBuilder/` | no-code screen builder (ported to ERP Studio) |
| `Frontend/App/app/ClientApp/Shared/AdminHttp.ts` | X-Admin-Token fetch helper |
| `Frontend/App/app/ClientApp/Layouts/AdminLayout.tsx`, `AdminShell.tsx` | admin chrome |
| `Frontend/App/app/ClientApp/Shared/Reports/ReportDesigner.tsx`, `stimulsoft.ts`, `printSync.ts`, `defaultLayout.ts` | Stimulsoft files (inside the `Shared/Reports/` copy) |
| `Frontend/App/_Backup_Screens/` | ScreenBuilder timestamped copies |
| `Frontend/App/scripts/copy-stimulsoft.js` | postinstall copy script |
| `Frontend/App/public/stimulsoft/` | copied Stimulsoft assets (~11 MB) |
| `Backend/Controllers/AdminAuthController.cs` | api/admin/login + AdminTokenStore |
| `Backend/Controllers/ScreenBuilderController.cs` | api/ScreenBuilder/* (incl. execute-sql) |
| `Backend/Controllers/AdminUsersController.cs` | users/roles/permissions admin API |

## Changed (original copy here)
| Path | Change |
|---|---|
| `Frontend/App/app/ClientApp/Shared/Reports/` (whole folder, original Stimulsoft version) | rewritten: JSON renderer, viewer, templates |
| `Frontend/App/app/ClientApp/Routes.tsx` | admin routes + AdminLayout import removed |
| `Frontend/App/app/ClientApp/Layouts/MainLayout.tsx` | admin-path login bypass removed |
| `Frontend/App/app/ClientApp/SalesInvoice/SalesInvoice.ts` | `onPrint` → A4 invoice template |
| `Frontend/App/app/ClientApp/Shared/Components/Import/DynamicGrid.tsx` | comment only |
| `Frontend/App/app/ClientApp/TstOrder/TstOrder.ts` | comment only |
| `Frontend/App/app/ClientApp/Shared/ExternalApis/ExternalApi.ts` | comment only |
| `Frontend/App/app/ClientApp/Shared/Components/Import/MasterDetail.tsx`, `ModelMasterDetail.ts` | backed up, not changed |
| `Frontend/App/package.json`, `package-lock.json` | `stimulsoft-reports-js` + postinstall removed; `jsbarcode`, `qrcode`, `@types/qrcode` added |
| `Backend/Controllers/Reports/` (ReportsController, ReportModels, ReportStores) | runtime only (config/get-report/resolve-layout/run), read-only stores, LayoutFormat/LayoutJson |
| `Backend/Controllers/ExternalApis/ExternalApisController.cs` | only `Use` kept |
| `Backend/appsettings.json` | `Admin:User/Pass` removed |
| `Backend/App_Data/Reports/` | backed up, not changed |
| `CLAUDE.md` | report/print sections updated |

## Database
* `Database/Phase10_Reports_Json.sql` — additive, was run on local `ESSA_React` (columns `LayoutFormat`, `LayoutJson` + check constraint on `Sys_ReportLayouts`). No backup needed (no data changed; existing rows got `LayoutFormat='mrt'`).
* `Database/Phase10_Remove_Admin.sql` — NOT run (owner to review/run). `Sys_ScreenConfig` NOT dropped.
