/* =====================================================================
   Phase 9 - External APIs (free public APIs) : settings table + admin screen
   REVIEW BEFORE RUNNING  (idempotent: safe to run more than once)
   Target DB: ESSA_React

   What it does:
     1) Creates table dbo.Sys_ExternalApis  (one row per API code from the
        backend catalog: enabled flag, ENCRYPTED api key, last test result).
        The API definitions themselves live in code
        (Backend/Controllers/ExternalApis/ExternalApiCatalog.cs), not here.
     2) Registers the admin screen  Sys_ExternalApisAdmin  in the menu
        (Menu_Admin) through dbo.Sys_RegisterModule (admin gets all permissions).

   Notes:
     - The feature works WITHOUT this script (settings go to
       Backend/App_Data/external-apis.json and admin roles are allowed by
       Sys_Role.IsAdmin = 1). Once this table exists the backend uses it
       automatically (within ~30 seconds) and the JSON file is no longer read.
       Settings/keys saved in the JSON file are NOT copied: re-enter the keys.
     - ApiKeyEnc is AES-GCM ciphertext (never plain text).
     - No existing object is altered or dropped.
   ===================================================================== */

-- 1) Sys_ExternalApis ---------------------------------------------------
IF OBJECT_ID(N'dbo.Sys_ExternalApis', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sys_ExternalApis
    (
        Code         NVARCHAR(50)   NOT NULL CONSTRAINT PK_Sys_ExternalApis PRIMARY KEY,
        IsEnabled    BIT            NOT NULL CONSTRAINT DF_Sys_ExternalApis_IsEnabled DEFAULT (0),
        ApiKeyEnc    NVARCHAR(1000) NULL,
        LastTestAt   DATETIME2(0)   NULL,
        LastTestOk   BIT            NULL,
        LastTestMs   INT            NULL,
        LastTestMsg  NVARCHAR(400)  NULL,
        UpdatedAt    DATETIME2(0)   NULL,
        UpdatedBy    INT            NULL,
        Notes        NVARCHAR(400)  NULL
    );
END
GO

-- 2) Register the admin screen -----------------------------------------
IF OBJECT_ID(N'dbo.Sys_RegisterModule', N'P') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.Sys_Modules WHERE MODULE_CODE = N'Sys_ExternalApisAdmin')
BEGIN
    EXEC dbo.Sys_RegisterModule N'Sys_ExternalApisAdmin', N'الخدمات الخارجية (APIs)', N'External APIs', N'Menu_Admin', N'S', 30, N'', N'teal';
END
GO
