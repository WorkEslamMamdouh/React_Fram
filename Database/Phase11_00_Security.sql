-- Phase11_00_Security.sql  (Wave 0)
-- Hashed passwords columns + lockout, Sys_RuntimeSettings, Sys_BumpConfigVersion,
-- Sys_AuditLog (append-only) + Sys_AuditPurge. Idempotent. Run against the project DB (ESSA_React).
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
