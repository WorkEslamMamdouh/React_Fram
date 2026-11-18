-- Phase11_05_Numbering.sql  (Wave 1 - document numbering)  Idempotent.
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_DocSeries', N'U') IS NULL
CREATE TABLE dbo.Sys_DocSeries (
    SeriesId         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_DocSeries PRIMARY KEY,
    DocKey           NVARCHAR(100) NOT NULL,
    CompCode         INT           NOT NULL,
    BranchCode       INT           NULL,
    TerminalDeviceId INT           NULL,
    NameA            NVARCHAR(100) NOT NULL,
    NameE            NVARCHAR(100) NOT NULL,
    Pattern          NVARCHAR(100) NOT NULL,
    ResetPolicy      VARCHAR(8)    NOT NULL CONSTRAINT DF_Sys_DocSeries_Reset DEFAULT ('yearly'),
    StartNo          BIGINT        NOT NULL CONSTRAINT DF_Sys_DocSeries_Start DEFAULT (1),
    Step             INT           NOT NULL CONSTRAINT DF_Sys_DocSeries_Step DEFAULT (1),
    IsGapless        BIT           NOT NULL CONSTRAINT DF_Sys_DocSeries_Gapless DEFAULT (0),
    ValidFrom        DATE          NULL,
    ValidTo          DATE          NULL,
    Priority         INT           NOT NULL CONSTRAINT DF_Sys_DocSeries_Priority DEFAULT (0),
    IsActive         BIT           NOT NULL CONSTRAINT DF_Sys_DocSeries_IsActive DEFAULT (1),
    UpdatedAt        DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_DocSeries_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy        NVARCHAR(100) NULL,
    RowVer           ROWVERSION    NOT NULL,
    CONSTRAINT CK_Sys_DocSeries_Reset CHECK (ResetPolicy IN ('never','yearly','monthly','daily','finyear')),
    CONSTRAINT CK_Sys_DocSeries_Step CHECK (Step BETWEEN 1 AND 1000 AND StartNo >= 0),
    CONSTRAINT CK_Sys_DocSeries_Pattern CHECK (Pattern LIKE N'%{#%}%'),
    CONSTRAINT CK_Sys_DocSeries_Dates CHECK (ValidTo IS NULL OR ValidFrom IS NULL OR ValidTo >= ValidFrom)
);
GO
IF OBJECT_ID(N'dbo.Sys_DocSeriesCounter', N'U') IS NULL
CREATE TABLE dbo.Sys_DocSeriesCounter (
    SeriesId     INT          NOT NULL CONSTRAINT FK_Sys_DocSeriesCounter_Series REFERENCES dbo.Sys_DocSeries (SeriesId),
    PeriodKey    VARCHAR(10)  NOT NULL,     -- '-' | '2026' | '2026-11' | '2026-11-12' | 'FY2026'
    LastNo       BIGINT       NOT NULL,
    UpdatedAtUtc DATETIME2(0) NOT NULL CONSTRAINT DF_Sys_DocSeriesCounter_Updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Sys_DocSeriesCounter PRIMARY KEY (SeriesId, PeriodKey)
);
GO
IF OBJECT_ID(N'dbo.Sys_DocSeriesBinding', N'U') IS NULL
CREATE TABLE dbo.Sys_DocSeriesBinding (
    TableName            NVARCHAR(128) NOT NULL,
    ColumnName           NVARCHAR(128) NOT NULL,
    DocKey               NVARCHAR(100) NOT NULL,
    CompColumn           NVARCHAR(128) NOT NULL CONSTRAINT DF_Sys_DocSeriesBinding_Comp DEFAULT (N'CompCode'),
    BranchColumn         NVARCHAR(128) NULL CONSTRAINT DF_Sys_DocSeriesBinding_Branch DEFAULT (N'BranchCode'),
    DateColumn           NVARCHAR(128) NULL,
    OverwriteClientValue BIT           NOT NULL CONSTRAINT DF_Sys_DocSeriesBinding_Overwrite DEFAULT (0),
    IsActive             BIT           NOT NULL CONSTRAINT DF_Sys_DocSeriesBinding_IsActive DEFAULT (1),
    RowVer               ROWVERSION    NOT NULL,
    CONSTRAINT PK_Sys_DocSeriesBinding PRIMARY KEY (TableName, ColumnName)
);
GO
CREATE OR ALTER FUNCTION dbo.Sys_FormatDocNo
    (@Pattern NVARCHAR(100), @SeqNo BIGINT, @CompCode INT, @BranchCode INT, @DocDate DATE, @FinYear INT, @TerminalDeviceId INT)
RETURNS NVARCHAR(200)
AS
BEGIN
    DECLARE @r NVARCHAR(400) = @Pattern, @p INT, @e INT, @w INT, @tok NVARCHAR(20), @val NVARCHAR(40), @v2 NVARCHAR(60), @name NVARCHAR(10), @i INT;
    SET @r = REPLACE(@r, N'{YYYY}', CONVERT(NCHAR(4), YEAR(@DocDate)));
    SET @r = REPLACE(@r, N'{YY}',   RIGHT(CONVERT(NCHAR(4), YEAR(@DocDate)), 2));
    SET @r = REPLACE(@r, N'{MM}',   RIGHT(N'0' + CONVERT(NVARCHAR(2), MONTH(@DocDate)), 2));
    SET @r = REPLACE(@r, N'{DD}',   RIGHT(N'0' + CONVERT(NVARCHAR(2), DAY(@DocDate)), 2));
    SET @r = REPLACE(@r, N'{FY}',   CONVERT(NVARCHAR(4), ISNULL(@FinYear, YEAR(@DocDate))));
    SET @i = 1;
    WHILE @i <= 3
    BEGIN
        SET @name = CHOOSE(@i, N'{CO', N'{BR', N'{TERM');
        SET @val  = CHOOSE(@i, CONVERT(NVARCHAR(20), ISNULL(@CompCode, 0)), CONVERT(NVARCHAR(20), ISNULL(@BranchCode, 0)),
                               CONVERT(NVARCHAR(20), ISNULL(@TerminalDeviceId, 0)));
        SET @p = CHARINDEX(@name, @r);
        WHILE @p > 0
        BEGIN
            SET @e = CHARINDEX(N'}', @r, @p);
            IF @e = 0 BREAK;
            SET @tok = SUBSTRING(@r, @p + LEN(@name), @e - @p - LEN(@name));
            SET @w = CASE WHEN @tok = N'' THEN 0 WHEN @tok LIKE N':[1-9]' THEN CAST(RIGHT(@tok, 1) AS INT) ELSE -1 END;
            IF @w < 0 BREAK;                                        -- unknown token: left as text
            SET @v2 = CASE WHEN LEN(@val) < @w THEN REPLICATE(N'0', @w - LEN(@val)) + @val ELSE @val END;
            SET @r = STUFF(@r, @p, @e - @p + 1, @v2);
            SET @p = CHARINDEX(@name, @r, @p + LEN(@v2));
        END
        SET @i += 1;
    END
    SET @p = CHARINDEX(N'{#', @r);
    IF @p > 0
    BEGIN
        SET @e = CHARINDEX(N'}', @r, @p);
        IF @e > 0 AND SUBSTRING(@r, @p + 1, @e - @p - 1) NOT LIKE N'%[^#]%'
        BEGIN
            SET @w = @e - @p - 1;
            SET @val = CONVERT(NVARCHAR(20), @SeqNo);
            SET @v2 = CASE WHEN LEN(@val) < @w THEN REPLICATE(N'0', @w - LEN(@val)) + @val ELSE @val END;
            SET @r = STUFF(@r, @p, @e - @p + 1, @v2);
        END
    END
    RETURN LEFT(@r, 200);
END
GO
CREATE OR ALTER PROCEDURE dbo.Sys_NextDocNo
    @DocKey NVARCHAR(100), @CompCode INT, @BranchCode INT = NULL, @TerminalDeviceId INT = NULL,
    @DocDate DATE = NULL, @FinYear INT = NULL,
    @DocNo NVARCHAR(200) OUTPUT, @SeriesId INT = NULL OUTPUT, @SeqNo BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    SET @DocDate = ISNULL(@DocDate, CAST(GETDATE() AS DATE));
    DECLARE @Pattern NVARCHAR(100), @Reset VARCHAR(8), @Start BIGINT, @Step INT, @PeriodKey VARCHAR(10);
    SELECT TOP (1) @SeriesId = s.SeriesId, @Pattern = s.Pattern, @Reset = s.ResetPolicy, @Start = s.StartNo, @Step = s.Step
    FROM dbo.Sys_DocSeries s
    WHERE s.IsActive = 1 AND s.DocKey = @DocKey AND s.CompCode = @CompCode
      AND (s.BranchCode IS NULL OR s.BranchCode = @BranchCode)
      AND (s.TerminalDeviceId IS NULL OR s.TerminalDeviceId = @TerminalDeviceId)
      AND (s.ValidFrom IS NULL OR s.ValidFrom <= @DocDate) AND (s.ValidTo IS NULL OR s.ValidTo >= @DocDate)
    ORDER BY (CASE WHEN s.TerminalDeviceId IS NOT NULL THEN 4 ELSE 0 END) + (CASE WHEN s.BranchCode IS NOT NULL THEN 2 ELSE 0 END) DESC,
             s.Priority DESC, s.SeriesId DESC;
    IF @SeriesId IS NULL THROW 51010, N'No active numbering series for this document.', 1;
    SET @PeriodKey = CASE @Reset WHEN 'yearly'  THEN CONVERT(CHAR(4), YEAR(@DocDate))
                                 WHEN 'monthly' THEN CONVERT(CHAR(7), @DocDate, 126)
                                 WHEN 'daily'   THEN CONVERT(CHAR(10), @DocDate, 126)
                                 WHEN 'finyear' THEN 'FY' + CONVERT(VARCHAR(4), ISNULL(@FinYear, YEAR(@DocDate)))
                                 ELSE '-' END;
    DECLARE @own BIT = CASE WHEN @@TRANCOUNT = 0 THEN 1 ELSE 0 END;
    IF @own = 1 BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM dbo.Sys_DocSeriesCounter WITH (UPDLOCK, HOLDLOCK) WHERE SeriesId = @SeriesId AND PeriodKey = @PeriodKey)
        INSERT INTO dbo.Sys_DocSeriesCounter (SeriesId, PeriodKey, LastNo) VALUES (@SeriesId, @PeriodKey, @Start - @Step);
    UPDATE dbo.Sys_DocSeriesCounter WITH (UPDLOCK)
       SET @SeqNo = LastNo = LastNo + @Step, UpdatedAtUtc = SYSUTCDATETIME()
     WHERE SeriesId = @SeriesId AND PeriodKey = @PeriodKey;
    IF @own = 1 COMMIT;
    SET @DocNo = dbo.Sys_FormatDocNo(@Pattern, @SeqNo, @CompCode, @BranchCode, @DocDate, @FinYear, @TerminalDeviceId);
END
GO
