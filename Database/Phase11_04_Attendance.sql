-- Phase11_04_Attendance.sql  (Wave 1 - attendance)  Idempotent.
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
