-- Phase11_03_Printing.sql  (Wave 1 - printers, routes, stations, templates, jobs)  Idempotent.
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_Devices', N'U') IS NULL
BEGIN RAISERROR(N'Run Phase11_02_Devices.sql first.', 16, 1); SET NOEXEC ON; END
GO
IF OBJECT_ID(N'dbo.Sys_Printers', N'U') IS NULL
CREATE TABLE dbo.Sys_Printers (
    PrinterId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_Printers PRIMARY KEY,
    BridgeDeviceId INT           NOT NULL CONSTRAINT FK_Sys_Printers_Bridge REFERENCES dbo.Sys_Devices (DeviceId),
    CompCode       INT           NOT NULL,
    BranchCode     INT           NULL,
    Name           NVARCHAR(100) NOT NULL,
    Kind           VARCHAR(12)   NOT NULL,
    Transport      VARCHAR(10)   NOT NULL,
    Target         NVARCHAR(255) NOT NULL,       -- Windows printer name or ip:port
    Language       VARCHAR(16)   NOT NULL,
    PaperWidthMm   DECIMAL(6,1)  NULL,
    PaperHeightMm  DECIMAL(6,1)  NULL,
    Dpi            INT           NOT NULL CONSTRAINT DF_Sys_Printers_Dpi DEFAULT (203),
    DotsWidth      INT           NULL,
    HasDrawer      BIT           NOT NULL CONSTRAINT DF_Sys_Printers_HasDrawer DEFAULT (0),
    DrawerPin      TINYINT       NOT NULL CONSTRAINT DF_Sys_Printers_DrawerPin DEFAULT (0),
    DrawerOnMs     INT           NOT NULL CONSTRAINT DF_Sys_Printers_DrawerOn DEFAULT (50),
    DrawerOffMs    INT           NOT NULL CONSTRAINT DF_Sys_Printers_DrawerOff DEFAULT (500),
    CutMode        VARCHAR(8)    NOT NULL CONSTRAINT DF_Sys_Printers_Cut DEFAULT ('partial'),
    CodePage       INT           NULL,
    IsActive       BIT           NOT NULL CONSTRAINT DF_Sys_Printers_IsActive DEFAULT (1),
    UpdatedAt      DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_Printers_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy      NVARCHAR(100) NULL,
    RowVer         ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_Printers_Kind CHECK (Kind IN ('a4','a5','receipt80','receipt58','label','kitchen')),
    CONSTRAINT CK_Sys_Printers_Transport CHECK (Transport IN ('spooler','tcp9100')),
    CONSTRAINT CK_Sys_Printers_Language CHECK (Language IN ('html','escpos-raster','zpl','zpl-raster','tspl')),
    CONSTRAINT CK_Sys_Printers_HtmlSpooler CHECK (NOT (Language = 'html' AND Transport <> 'spooler')),
    CONSTRAINT CK_Sys_Printers_Pin CHECK (DrawerPin IN (0,1)),
    CONSTRAINT CK_Sys_Printers_CutMode CHECK (CutMode IN ('none','partial','full')),
    CONSTRAINT CK_Sys_Printers_Dpi CHECK (Dpi BETWEEN 96 AND 600)
);
GO
IF OBJECT_ID(N'dbo.Sys_PrintStations', N'U') IS NULL
CREATE TABLE dbo.Sys_PrintStations (
    CompCode    INT           NOT NULL,
    StationCode VARCHAR(30)   NOT NULL,
    NameA       NVARCHAR(100) NOT NULL,
    NameE       NVARCHAR(100) NOT NULL,
    IsActive    BIT           NOT NULL CONSTRAINT DF_Sys_PrintStations_IsActive DEFAULT (1),
    RowVer      ROWVERSION    NOT NULL,
    CONSTRAINT PK_Sys_PrintStations PRIMARY KEY (CompCode, StationCode)
);
GO
IF OBJECT_ID(N'dbo.Sys_ItemStationMap', N'U') IS NULL
CREATE TABLE dbo.Sys_ItemStationMap (
    MapId       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_ItemStationMap PRIMARY KEY,
    CompCode    INT          NOT NULL,
    BranchCode  INT          NULL,
    CategoryId  INT          NULL,
    ItemId      INT          NULL,
    StationCode VARCHAR(30)  NOT NULL,
    RowVer      ROWVERSION   NOT NULL,
    CONSTRAINT FK_Sys_ItemStationMap_Station FOREIGN KEY (CompCode, StationCode) REFERENCES dbo.Sys_PrintStations (CompCode, StationCode),
    CONSTRAINT CK_Sys_ItemStationMap_Target CHECK (CategoryId IS NOT NULL OR ItemId IS NOT NULL)
);
GO
IF OBJECT_ID(N'dbo.Sys_PrintTemplates', N'U') IS NULL
CREATE TABLE dbo.Sys_PrintTemplates (
    TemplateCode VARCHAR(50)   NOT NULL CONSTRAINT PK_Sys_PrintTemplates PRIMARY KEY,
    Language     VARCHAR(10)   NOT NULL,
    NameA        NVARCHAR(100) NOT NULL,
    NameE        NVARCHAR(100) NOT NULL,
    Body         NVARCHAR(MAX) NOT NULL,
    WidthMm      DECIMAL(6,1)  NULL,
    HeightMm     DECIMAL(6,1)  NULL,
    SampleJson   NVARCHAR(MAX) NULL,
    UpdatedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_PrintTemplates_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy    NVARCHAR(100) NULL,
    RowVer       ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_PrintTemplates_Language CHECK (Language IN ('zpl','tspl')),
    CONSTRAINT CK_Sys_PrintTemplates_Sample CHECK (SampleJson IS NULL OR ISJSON(SampleJson) = 1)
);
GO
IF OBJECT_ID(N'dbo.Sys_PrintRoutes', N'U') IS NULL
CREATE TABLE dbo.Sys_PrintRoutes (
    RouteId           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_PrintRoutes PRIMARY KEY,
    DocKey            NVARCHAR(100) NOT NULL,                 -- ReportCode / MODULE_CODE / doc type / '*'
    Station           VARCHAR(30)   NULL,
    CompCode          INT           NULL,
    BranchCode        INT           NULL,
    UserID            INT           NULL,
    TerminalDeviceId  INT           NULL CONSTRAINT FK_Sys_PrintRoutes_Terminal REFERENCES dbo.Sys_Devices (DeviceId),
    PrinterId         INT           NOT NULL CONSTRAINT FK_Sys_PrintRoutes_Printer REFERENCES dbo.Sys_Printers (PrinterId),
    FallbackPrinterId INT           NULL CONSTRAINT FK_Sys_PrintRoutes_Fallback REFERENCES dbo.Sys_Printers (PrinterId),
    Copies            TINYINT       NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Copies DEFAULT (1),
    CopyWatermark     BIT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Watermark DEFAULT (0),
    AutoPrintOnSave   BIT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Auto DEFAULT (0),
    OpenDrawer        BIT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Drawer DEFAULT (0),
    LayoutCode        NVARCHAR(100) NULL,                     -- report code override (e.g. 58 mm variant)
    TemplateCode      VARCHAR(50)   NULL CONSTRAINT FK_Sys_PrintRoutes_Template REFERENCES dbo.Sys_PrintTemplates (TemplateCode),
    TtlMin            INT           NULL,
    Priority          INT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Priority DEFAULT (0),
    IsActive          BIT           NOT NULL CONSTRAINT DF_Sys_PrintRoutes_IsActive DEFAULT (1),
    Note              NVARCHAR(200) NULL,
    UpdatedAt         DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_PrintRoutes_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy         NVARCHAR(100) NULL,
    RowVer            ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_PrintRoutes_Copies CHECK (Copies BETWEEN 1 AND 10),
    CONSTRAINT CK_Sys_PrintRoutes_Branch CHECK (BranchCode IS NULL OR CompCode IS NOT NULL),
    CONSTRAINT CK_Sys_PrintRoutes_Ttl CHECK (TtlMin IS NULL OR TtlMin BETWEEN 1 AND 10080),
    CONSTRAINT CK_Sys_PrintRoutes_Fallback CHECK (FallbackPrinterId IS NULL OR FallbackPrinterId <> PrinterId)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_PrintRoutes_Doc')
    CREATE INDEX IX_Sys_PrintRoutes_Doc ON dbo.Sys_PrintRoutes (DocKey, IsActive) INCLUDE (Station, CompCode, BranchCode, UserID, TerminalDeviceId, PrinterId, Priority);
GO
IF OBJECT_ID(N'dbo.Sys_PrintJobs', N'U') IS NULL
CREATE TABLE dbo.Sys_PrintJobs (
    JobId             UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Sys_PrintJobs_JobId DEFAULT (NEWSEQUENTIALID()) CONSTRAINT PK_Sys_PrintJobs PRIMARY KEY,
    ParentJobId       UNIQUEIDENTIFIER NULL,
    DocKey            NVARCHAR(100)  NOT NULL,
    ReportCode        NVARCHAR(100)  NULL,
    ModuleCode        NVARCHAR(100)  NULL,
    RecordKey         NVARCHAR(200)  NULL,
    CompCode          INT            NOT NULL,
    BranchCode        INT            NULL,
    UserID            INT            NULL,
    TerminalDeviceId  INT            NULL,
    Station           VARCHAR(30)    NULL,
    RouteId           INT            NULL,
    PrinterId         INT            NOT NULL,
    FallbackPrinterId INT            NULL,
    BridgeDeviceId    INT            NOT NULL,
    Copies            TINYINT        NOT NULL,
    CopyWatermark     BIT            NOT NULL CONSTRAINT DF_Sys_PrintJobs_Watermark DEFAULT (0),
    OpenDrawer        BIT            NOT NULL CONSTRAINT DF_Sys_PrintJobs_Drawer DEFAULT (0),
    PayloadKind       VARCHAR(6)     NOT NULL,
    PayloadJson       NVARCHAR(MAX)  NULL,          -- NULL after purge
    PayloadSha256     CHAR(64)       NULL,
    PayloadBytes      INT            NULL,
    Status            VARCHAR(10)    NOT NULL CONSTRAINT DF_Sys_PrintJobs_Status DEFAULT ('queued'),
    Attempts          INT            NOT NULL CONSTRAINT DF_Sys_PrintJobs_Attempts DEFAULT (0),
    Error             NVARCHAR(1000) NULL,
    IsReprint         BIT            NOT NULL CONSTRAINT DF_Sys_PrintJobs_Reprint DEFAULT (0),
    CreatedAtUtc      DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_PrintJobs_Created DEFAULT (SYSUTCDATETIME()),
    SentAtUtc         DATETIME2(0)   NULL,
    PrintedAtUtc      DATETIME2(0)   NULL,
    ExpiresAtUtc      DATETIME2(0)   NOT NULL,
    PayloadPurgedAtUtc DATETIME2(0)  NULL,
    CONSTRAINT CK_Sys_PrintJobs_Status CHECK (Status IN ('queued','sent','accepted','printing','printed','failed','expired','fallback','cancelled')),
    CONSTRAINT CK_Sys_PrintJobs_Kind CHECK (PayloadKind IN ('html','raw','test'))
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_PrintJobs_Bridge')
    CREATE INDEX IX_Sys_PrintJobs_Bridge ON dbo.Sys_PrintJobs (BridgeDeviceId, Status) INCLUDE (ExpiresAtUtc);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_PrintJobs_Doc')
    CREATE INDEX IX_Sys_PrintJobs_Doc ON dbo.Sys_PrintJobs (DocKey, RecordKey);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_PrintJobs_Created')
    CREATE INDEX IX_Sys_PrintJobs_Created ON dbo.Sys_PrintJobs (CreatedAtUtc);
GO
CREATE OR ALTER FUNCTION dbo.Sys_PrintRouteCandidates
    (@DocKey NVARCHAR(100), @Station VARCHAR(30), @CompCode INT, @BranchCode INT, @UserID INT, @TerminalDeviceId INT)
RETURNS TABLE
AS RETURN
SELECT r.RouteId, r.PrinterId, r.FallbackPrinterId, r.Copies, r.CopyWatermark, r.AutoPrintOnSave, r.OpenDrawer,
       r.LayoutCode, r.TemplateCode, r.TtlMin, r.Priority,
       CAST(CASE WHEN r.Station IS NOT NULL THEN 1 ELSE 0 END AS BIT)          AS MatchStation,
       CAST(CASE WHEN r.DocKey <> N'*' THEN 1 ELSE 0 END AS BIT)               AS MatchDocKeyExact,
       CAST(CASE WHEN r.TerminalDeviceId IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS MatchTerminal,
       CAST(CASE WHEN r.UserID IS NOT NULL THEN 1 ELSE 0 END AS BIT)           AS MatchUser,
       CAST(CASE WHEN r.BranchCode IS NOT NULL THEN 1 ELSE 0 END AS BIT)       AS MatchBranch,
       CAST(CASE WHEN r.CompCode IS NOT NULL THEN 1 ELSE 0 END AS BIT)         AS MatchComp,
       (CASE WHEN r.Station IS NOT NULL THEN 64 ELSE 0 END) + (CASE WHEN r.DocKey <> N'*' THEN 32 ELSE 0 END)
     + (CASE WHEN r.TerminalDeviceId IS NOT NULL THEN 16 ELSE 0 END) + (CASE WHEN r.UserID IS NOT NULL THEN 8 ELSE 0 END)
     + (CASE WHEN r.BranchCode IS NOT NULL THEN 4 ELSE 0 END) + (CASE WHEN r.CompCode IS NOT NULL THEN 2 ELSE 0 END) AS Score
FROM dbo.Sys_PrintRoutes r
JOIN dbo.Sys_Printers p ON p.PrinterId = r.PrinterId AND p.IsActive = 1
WHERE r.IsActive = 1
  AND (r.DocKey = @DocKey OR r.DocKey = N'*')
  AND (r.Station IS NULL OR r.Station = @Station)
  AND (r.CompCode IS NULL OR r.CompCode = @CompCode)
  AND (r.BranchCode IS NULL OR r.BranchCode = @BranchCode)
  AND (r.UserID IS NULL OR r.UserID = @UserID)
  AND (r.TerminalDeviceId IS NULL OR r.TerminalDeviceId = @TerminalDeviceId);
GO
SET NOEXEC OFF;
GO
