-- Phase11_02_Devices.sql  (Wave 1 - devices, pairing, commands, runtime keys)  Idempotent.
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
