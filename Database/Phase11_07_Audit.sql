-- Phase11_07_Audit.sql  (Wave 1 - audit policy; Sys_AuditLog itself is in Phase11_00)  Idempotent.
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
