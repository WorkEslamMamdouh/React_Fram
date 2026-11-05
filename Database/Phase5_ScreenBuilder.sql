/* =====================================================================================
   Phase 5 - ScreenBuilder (no-code)          *** REVIEW BEFORE RUNNING ***
   -------------------------------------------------------------------------------------
   Idempotent: safe to run more than once. Nothing here is required for the app to work;
   the builder simply skips saving the screen JSON (with a warning) if the table is missing.

   1) dbo.Sys_ScreenConfig : stores the v5 screen config JSON per screen (MODULE_CODE)
   ===================================================================================== */
IF OBJECT_ID(N'dbo.Sys_ScreenConfig', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sys_ScreenConfig
    (
        ModuleCode  NVARCHAR(100)  NOT NULL CONSTRAINT PK_Sys_ScreenConfig PRIMARY KEY,
        ConfigJson  NVARCHAR(MAX)  NOT NULL,
        Version     INT            NOT NULL CONSTRAINT DF_Sys_ScreenConfig_Version DEFAULT (5),
        UpdatedAt   DATETIME       NOT NULL CONSTRAINT DF_Sys_ScreenConfig_UpdatedAt DEFAULT (GETDATE()),
        UpdatedBy   NVARCHAR(100)  NULL
    );
    PRINT N'Sys_ScreenConfig created';
END
ELSE
    PRINT N'Sys_ScreenConfig already exists';
GO
