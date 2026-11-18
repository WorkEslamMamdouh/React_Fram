-- Phase11_01_Jobs.sql  (Wave 1 - background jobs)  Idempotent.
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
