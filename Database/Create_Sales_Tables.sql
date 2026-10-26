-- =====================================================================================
--  جداول وقوالب فواتير المبيعات (أعمدة أساسية)
--  ⚠️ السكريبت بيعمل الجدول أو القالب بس لو مش موجود — لو موجود مش بيلمسه
--     ولو جداولك موجودة بأعمدة مختلفة: افتح شاشة SalesInvoice في برنامج الديسك توب
--     وهو هيقرا أعمدتك الحقيقية وتظبط الشاشة عليها
--  قاعدة البيانات: ESSA_React
-- =====================================================================================
USE [ESSA_React];
GO

-- =========================
-- 1) رأس الفاتورة
-- =========================
IF OBJECT_ID(N'dbo.I_TR_Sales', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.I_TR_Sales
    (
        SaleID          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_I_TR_Sales PRIMARY KEY,
        CompCode        INT            NOT NULL,
        BranchCode      INT            NOT NULL,
        TrNo            INT            NULL,              -- رقم الفاتورة (بيتملى من G_ProcessTrans لما تشغّله)
        TrDate          DATE           NOT NULL CONSTRAINT DF_I_TR_Sales_TrDate DEFAULT (CAST(GETDATE() AS DATE)),
        CustomerName    NVARCHAR(200)  NOT NULL,
        PaymentType     INT            NOT NULL CONSTRAINT DF_I_TR_Sales_PaymentType DEFAULT (0),   -- 0 نقدي / 1 آجل
        Remarks         NVARCHAR(500)  NULL,
        TotalAmount     DECIMAL(18,2)  NOT NULL CONSTRAINT DF_I_TR_Sales_Total DEFAULT (0),          -- مجموع الأصناف
        DiscountAmount  DECIMAL(18,2)  NOT NULL CONSTRAINT DF_I_TR_Sales_Discount DEFAULT (0),
        VatAmount       DECIMAL(18,2)  NOT NULL CONSTRAINT DF_I_TR_Sales_Vat DEFAULT (0),
        NetAmount       DECIMAL(18,2)  NOT NULL CONSTRAINT DF_I_TR_Sales_Net DEFAULT (0),
        CreatedAt       DATETIME       NOT NULL CONSTRAINT DF_I_TR_Sales_CreatedAt DEFAULT (GETDATE())
    );
    PRINT N'✅ اتعمل الجدول I_TR_Sales';
END
ELSE PRINT N'ℹ️ الجدول I_TR_Sales موجود قبل كده (متلمسش)';
GO

-- =========================
-- 2) أصناف الفاتورة
-- =========================
IF OBJECT_ID(N'dbo.I_TR_SaleDetails', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.I_TR_SaleDetails
    (
        SaleDetailID    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_I_TR_SaleDetails PRIMARY KEY,
        SaleID          INT            NOT NULL,          -- الربط برأس الفاتورة
        ItemName        NVARCHAR(200)  NOT NULL,
        Qty             DECIMAL(18,3)  NOT NULL CONSTRAINT DF_I_TR_SaleDetails_Qty DEFAULT (1),
        UnitPrice       DECIMAL(18,2)  NOT NULL CONSTRAINT DF_I_TR_SaleDetails_Price DEFAULT (0),
        DiscountPrc     DECIMAL(5,2)   NOT NULL CONSTRAINT DF_I_TR_SaleDetails_DiscPrc DEFAULT (0),
        Total           DECIMAL(18,2)  NOT NULL CONSTRAINT DF_I_TR_SaleDetails_Total DEFAULT (0),   -- الكمية × السعر - الخصم
        Remarks         NVARCHAR(300)  NULL,
        CONSTRAINT FK_I_TR_SaleDetails_Sales FOREIGN KEY (SaleID) REFERENCES dbo.I_TR_Sales (SaleID)
    );
    CREATE INDEX IX_I_TR_SaleDetails_SaleID ON dbo.I_TR_SaleDetails (SaleID);
    PRINT N'✅ اتعمل الجدول I_TR_SaleDetails';
END
ELSE PRINT N'ℹ️ الجدول I_TR_SaleDetails موجود قبل كده (متلمسش)';
GO

-- =========================
-- 3) قالب العرض للفواتير (القائمة)
-- =========================
IF OBJECT_ID(N'dbo.IQ_TR_Sales', N'V') IS NULL
    EXEC(N'
CREATE VIEW dbo.IQ_TR_Sales
AS
SELECT  s.*,
        (SELECT COUNT(*) FROM dbo.I_TR_SaleDetails d WHERE d.SaleID = s.SaleID) AS ItemsCount
FROM    dbo.I_TR_Sales s');
ELSE PRINT N'ℹ️ القالب IQ_TR_Sales موجود قبل كده (متلمسش)';
GO

-- =========================
-- 4) قالب العرض للأصناف
-- =========================
IF OBJECT_ID(N'dbo.IQ_TR_SaleDetails', N'V') IS NULL
    EXEC(N'
CREATE VIEW dbo.IQ_TR_SaleDetails
AS
SELECT  d.*,
        s.CompCode,
        s.BranchCode,
        s.TrDate
FROM    dbo.I_TR_SaleDetails d
JOIN    dbo.I_TR_Sales s ON s.SaleID = d.SaleID');
ELSE PRINT N'ℹ️ القالب IQ_TR_SaleDetails موجود قبل كده (متلمسش)';
GO

-- تأكيد
SELECT o.name AS [Object], o.type_desc AS [Kind], COUNT(c.column_id) AS [Columns]
FROM sys.objects o JOIN sys.columns c ON c.object_id = o.object_id
WHERE o.name IN ('I_TR_Sales', 'IQ_TR_Sales', 'I_TR_SaleDetails', 'IQ_TR_SaleDetails')
GROUP BY o.name, o.type_desc;
