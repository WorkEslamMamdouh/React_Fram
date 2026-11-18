-- =====================================================================================
--  QA_E2E_Schema.sql  -  end-to-end test data for ERP Studio + framework screens
--  Every object starts with QA_E2E_ (tables, views, procedures, function, indexes).
--  Idempotent: tables are created only when missing and seeded only when empty;
--  views / procedures use CREATE OR ALTER. Running it again changes nothing.
--  Remove everything with Database/QA_E2E_Drop.sql.
--  Covers: categories -> types -> items (cascading filters), customers (Profile360),
--  sales header/details + views with totals (master-detail, A4 invoice, grouped list),
--  cost-center tree, restaurant areas/tables/menu/orders (FloorPlan, TouchPOS, KDS, 80mm receipt),
--  gaming devices/sessions (TileBoard), doctors/appointments (Scheduler), tasks (Kanban),
--  members (Wizard), scan tasks/stock (ScanTask), KPI views (Dashboard), 200k-row log (paging).
-- =====================================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

-- ------------------------------------------------------------------ helper: EAN-13 check digit
CREATE OR ALTER FUNCTION dbo.QA_E2E_fnEan13 (@Base12 VARCHAR(12))
RETURNS VARCHAR(13)
AS
BEGIN
    DECLARE @i INT = 1, @sum INT = 0;
    WHILE @i <= 12
    BEGIN
        SET @sum += CAST(SUBSTRING(@Base12, @i, 1) AS INT) * CASE WHEN @i % 2 = 0 THEN 3 ELSE 1 END;
        SET @i += 1;
    END
    RETURN @Base12 + CAST((10 - @sum % 10) % 10 AS VARCHAR(1));
END
GO

-- =====================================================================================
-- 1) Catalog: categories -> types -> items
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_Category', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_Category (
    CategoryID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_Category PRIMARY KEY,
    CompCode   INT NOT NULL CONSTRAINT DF_QA_E2E_Category_Comp DEFAULT (1),
    NameAr     NVARCHAR(100) NOT NULL,
    NameEn     NVARCHAR(100) NOT NULL,
    Color      VARCHAR(20) NULL,
    IsMenu     BIT NOT NULL CONSTRAINT DF_QA_E2E_Category_IsMenu DEFAULT (0),
    SortOrder  INT NOT NULL CONSTRAINT DF_QA_E2E_Category_Sort DEFAULT (0),
    IsActive   BIT NOT NULL CONSTRAINT DF_QA_E2E_Category_Active DEFAULT (1)
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_ItemType', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_ItemType (
    TypeID     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_ItemType PRIMARY KEY,
    CategoryID INT NOT NULL CONSTRAINT FK_QA_E2E_ItemType_Category REFERENCES dbo.QA_E2E_Category (CategoryID),
    NameAr     NVARCHAR(100) NOT NULL,
    NameEn     NVARCHAR(100) NOT NULL,
    IsActive   BIT NOT NULL CONSTRAINT DF_QA_E2E_ItemType_Active DEFAULT (1)
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_Item', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_Item (
    ItemID     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_Item PRIMARY KEY,
    CompCode   INT NOT NULL CONSTRAINT DF_QA_E2E_Item_Comp DEFAULT (1),
    CategoryID INT NOT NULL CONSTRAINT FK_QA_E2E_Item_Category REFERENCES dbo.QA_E2E_Category (CategoryID),
    TypeID     INT NOT NULL CONSTRAINT FK_QA_E2E_Item_Type REFERENCES dbo.QA_E2E_ItemType (TypeID),
    ItemCode   VARCHAR(20) NOT NULL,
    Barcode    VARCHAR(20) NULL,
    NameAr     NVARCHAR(150) NOT NULL,
    NameEn     NVARCHAR(150) NOT NULL,
    Price      DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_Item_Price DEFAULT (0),
    Cost       DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_Item_Cost DEFAULT (0),
    Unit       NVARCHAR(20) NULL,
    Copies     INT NOT NULL CONSTRAINT DF_QA_E2E_Item_Copies DEFAULT (1),
    IsActive   BIT NOT NULL CONSTRAINT DF_QA_E2E_Item_Active DEFAULT (1),
    CreatedAt  DATETIME NOT NULL CONSTRAINT DF_QA_E2E_Item_Created DEFAULT (GETDATE())
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_QA_E2E_Item_Type')
    CREATE INDEX IX_QA_E2E_Item_Type ON dbo.QA_E2E_Item (TypeID) INCLUDE (NameAr, NameEn, Barcode);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_Category)
BEGIN
    INSERT INTO dbo.QA_E2E_Category (NameAr, NameEn, Color, IsMenu, SortOrder) VALUES
    (N'إلكترونيات', N'Electronics', '#3B82F6', 0, 1),
    (N'بقالة', N'Groceries', '#10B981', 0, 2),
    (N'أدوات مكتبية', N'Stationery', '#8B5CF6', 0, 3),
    (N'ملابس', N'Clothing', '#F59E0B', 0, 4),
    (N'أدوات منزلية', N'Home', '#06B6D4', 0, 5),
    (N'لعب أطفال', N'Toys', '#F43F5E', 0, 6),
    -- restaurant menu categories (TouchPOS)
    (N'مشويات', N'Grill', '#EF4444', 1, 11),
    (N'بيتزا', N'Pizza', '#F97316', 1, 12),
    (N'سلطات', N'Salads', '#22C55E', 1, 13),
    (N'مشروبات', N'Drinks', '#0EA5E9', 1, 14),
    (N'حلويات', N'Desserts', '#D946EF', 1, 15);

    -- 4 types per retail category
    INSERT INTO dbo.QA_E2E_ItemType (CategoryID, NameAr, NameEn)
    SELECT c.CategoryID, c.NameAr + N' - ' + t.Ar, c.NameEn + N' - ' + t.En
    FROM dbo.QA_E2E_Category c
    CROSS JOIN (VALUES (1, N'اقتصادي', N'Basic'), (2, N'قياسي', N'Standard'), (3, N'ممتاز', N'Premium'), (4, N'مستورد', N'Imported')) t(n, Ar, En)
    WHERE c.IsMenu = 0
    ORDER BY c.CategoryID, t.n;

    -- 50 items per type (1,200 items)
    ;WITH n AS (SELECT TOP 50 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_Item (CategoryID, TypeID, ItemCode, NameAr, NameEn, Price, Cost, Unit, Copies)
    SELECT t.CategoryID, t.TypeID,
           'IT' + RIGHT('00' + CAST(t.TypeID AS VARCHAR(3)), 2) + RIGHT('000' + CAST(n.k AS VARCHAR(4)), 3),
           N'صنف ' + t.NameAr + N' ' + CAST(n.k AS NVARCHAR(5)),
           t.NameEn + N' item ' + CAST(n.k AS NVARCHAR(5)),
           CAST(5 + ((t.TypeID * 37 + n.k * 13) % 950) + (n.k % 4) * 0.25 AS DECIMAL(18,2)),
           CAST((5 + ((t.TypeID * 37 + n.k * 13) % 950)) * 0.7 AS DECIMAL(18,2)),
           CASE n.k % 3 WHEN 0 THEN N'Box' WHEN 1 THEN N'Piece' ELSE N'Kg' END,
           1 + n.k % 3
    FROM dbo.QA_E2E_ItemType t CROSS JOIN n
    ORDER BY t.TypeID, n.k;

    UPDATE dbo.QA_E2E_Item SET Barcode = dbo.QA_E2E_fnEan13('622' + RIGHT('000000000' + CAST(ItemID AS VARCHAR(9)), 9));
    UPDATE dbo.QA_E2E_Item SET IsActive = 0 WHERE ItemID % 41 = 0;
    PRINT N'1) catalog seeded';
END
GO

-- =====================================================================================
-- 2) Customers (+ notes / events for Profile360)
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_Customer', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_Customer (
    CustomerID  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_Customer PRIMARY KEY,
    CompCode    INT NOT NULL CONSTRAINT DF_QA_E2E_Customer_Comp DEFAULT (1),
    CustCode    VARCHAR(20) NOT NULL,
    NameAr      NVARCHAR(150) NOT NULL,
    NameEn      NVARCHAR(150) NOT NULL,
    Phone       VARCHAR(20) NULL,
    Email       VARCHAR(100) NULL,
    City        NVARCHAR(50) NULL,
    Status      VARCHAR(20) NOT NULL CONSTRAINT DF_QA_E2E_Customer_Status DEFAULT ('active'),
    CreditLimit DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_Customer_Limit DEFAULT (0),
    Notes       NVARCHAR(400) NULL,
    CreatedAt   DATETIME NOT NULL CONSTRAINT DF_QA_E2E_Customer_Created DEFAULT (GETDATE())
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_CustomerNote', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_CustomerNote (
    NoteID     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_CustomerNote PRIMARY KEY,
    CustomerID INT NOT NULL CONSTRAINT FK_QA_E2E_CustomerNote_Customer REFERENCES dbo.QA_E2E_Customer (CustomerID),
    NoteText   NVARCHAR(1000) NOT NULL,
    UserName   NVARCHAR(50) NULL,
    CreatedAt  DATETIME NOT NULL CONSTRAINT DF_QA_E2E_CustomerNote_Created DEFAULT (GETDATE())
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_CustomerEvent', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_CustomerEvent (
    EventID    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_CustomerEvent PRIMARY KEY,
    CustomerID INT NOT NULL CONSTRAINT FK_QA_E2E_CustomerEvent_Customer REFERENCES dbo.QA_E2E_Customer (CustomerID),
    EventTime  DATETIME NOT NULL,
    Title      NVARCHAR(200) NOT NULL,
    Note       NVARCHAR(400) NULL,
    UserName   NVARCHAR(50) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_Customer)
BEGIN
    ;WITH n AS (SELECT TOP 60 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects),
    names AS (SELECT * FROM (VALUES
        (0, N'أحمد', N'Ahmed'), (1, N'محمد', N'Mohamed'), (2, N'منى', N'Mona'), (3, N'سارة', N'Sara'), (4, N'خالد', N'Khaled'),
        (5, N'هالة', N'Hala'), (6, N'يوسف', N'Youssef'), (7, N'ريم', N'Reem'), (8, N'عمر', N'Omar'), (9, N'نور', N'Nour')) v(i, Ar, En)),
    fam AS (SELECT * FROM (VALUES
        (0, N'السيد', N'El-Sayed'), (1, N'حسن', N'Hassan'), (2, N'إبراهيم', N'Ibrahim'), (3, N'عادل', N'Adel'), (4, N'فاروق', N'Farouk'), (5, N'سليم', N'Selim')) v(i, Ar, En)),
    city AS (SELECT * FROM (VALUES (0, N'القاهرة'), (1, N'الجيزة'), (2, N'الإسكندرية'), (3, N'المنصورة')) v(i, Ar))
    INSERT INTO dbo.QA_E2E_Customer (CustCode, NameAr, NameEn, Phone, Email, City, Status, CreditLimit, Notes, CreatedAt)
    SELECT 'C' + RIGHT('0000' + CAST(n.k AS VARCHAR(5)), 4),
           nm.Ar + N' ' + f.Ar, nm.En + N' ' + f.En,
           '010' + RIGHT('00000000' + CAST(10000000 + n.k * 7919 AS VARCHAR(10)), 8),
           LOWER(nm.En) + CAST(n.k AS VARCHAR(5)) + '@example.com',
           c.Ar,
           CASE WHEN n.k % 13 = 0 THEN 'blocked' WHEN n.k % 7 = 0 THEN 'vip' ELSE 'active' END,
           (n.k % 5) * 5000,
           CASE WHEN n.k % 4 = 0 THEN N'عميل جملة' ELSE NULL END,
           DATEADD(DAY, -n.k * 9, CAST(GETDATE() AS DATE))
    FROM n
    JOIN names nm ON nm.i = n.k % 10
    JOIN fam f ON f.i = n.k % 6
    JOIN city c ON c.i = n.k % 4;

    INSERT INTO dbo.QA_E2E_CustomerNote (CustomerID, NoteText, UserName, CreatedAt)
    SELECT CustomerID, N'اتصل يسأل عن العروض الجديدة', N'sales1', DATEADD(DAY, -3, GETDATE()) FROM dbo.QA_E2E_Customer WHERE CustomerID % 2 = 0
    UNION ALL
    SELECT CustomerID, N'Prefers delivery after 5 pm', N'sales2', DATEADD(DAY, -10, GETDATE()) FROM dbo.QA_E2E_Customer WHERE CustomerID % 3 = 0;

    INSERT INTO dbo.QA_E2E_CustomerEvent (CustomerID, EventTime, Title, Note, UserName)
    SELECT CustomerID, CreatedAt, N'تم تسجيل العميل', NULL, N'admin' FROM dbo.QA_E2E_Customer
    UNION ALL
    SELECT CustomerID, DATEADD(DAY, -2, GETDATE()), N'زيارة مندوب', N'Visit by sales rep', N'sales1' FROM dbo.QA_E2E_Customer WHERE CustomerID % 5 = 0;
    PRINT N'2) customers seeded';
END
GO

-- =====================================================================================
-- 3) Sales invoices (header + details; LineTotal and NetAmount are computed columns)
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_SalesHeader', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_SalesHeader (
    SaleID      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_SalesHeader PRIMARY KEY,
    CompCode    INT NOT NULL CONSTRAINT DF_QA_E2E_SalesHeader_Comp DEFAULT (1),
    BranchCode  INT NOT NULL CONSTRAINT DF_QA_E2E_SalesHeader_Branch DEFAULT (1),
    InvoiceNo   INT NOT NULL,
    SaleDate    DATE NOT NULL,
    CustomerID  INT NOT NULL CONSTRAINT FK_QA_E2E_SalesHeader_Customer REFERENCES dbo.QA_E2E_Customer (CustomerID),
    PaymentType INT NOT NULL CONSTRAINT DF_QA_E2E_SalesHeader_Pay DEFAULT (0),   -- 0 cash, 1 credit
    TotalAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_SalesHeader_Total DEFAULT (0),
    Discount    DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_SalesHeader_Disc DEFAULT (0),
    VatAmount   DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_SalesHeader_Vat DEFAULT (0),
    NetAmount   AS (TotalAmount - Discount + VatAmount),
    Remarks     NVARCHAR(400) NULL,
    CreatedBy   NVARCHAR(50) NULL,
    CreatedAt   DATETIME NOT NULL CONSTRAINT DF_QA_E2E_SalesHeader_Created DEFAULT (GETDATE())
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_SalesDetail', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_SalesDetail (
    DetailID  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_SalesDetail PRIMARY KEY,
    SaleID    INT NOT NULL CONSTRAINT FK_QA_E2E_SalesDetail_Header REFERENCES dbo.QA_E2E_SalesHeader (SaleID) ON DELETE CASCADE,
    ItemID    INT NOT NULL CONSTRAINT FK_QA_E2E_SalesDetail_Item REFERENCES dbo.QA_E2E_Item (ItemID),
    Qty       DECIMAL(18,3) NOT NULL CONSTRAINT DF_QA_E2E_SalesDetail_Qty DEFAULT (1),
    Price     DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_SalesDetail_Price DEFAULT (0),
    LineTotal AS (CAST(Qty * Price AS DECIMAL(18,2))) PERSISTED,
    Notes     NVARCHAR(200) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_QA_E2E_SalesDetail_Sale')
    CREATE INDEX IX_QA_E2E_SalesDetail_Sale ON dbo.QA_E2E_SalesDetail (SaleID);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_SalesHeader)
BEGIN
    ;WITH n AS (SELECT TOP 400 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_SalesHeader (InvoiceNo, SaleDate, CustomerID, PaymentType, Remarks, CreatedBy, CreatedAt)
    SELECT 100000 + n.k,
           DATEADD(DAY, -((n.k * 7) % 120), CAST(GETDATE() AS DATE)),
           1 + (n.k * 17) % 60,
           CASE WHEN n.k % 3 = 0 THEN 1 ELSE 0 END,
           CASE WHEN n.k % 10 = 0 THEN N'توصيل للمنزل' ELSE NULL END,
           N'qa_seed', DATEADD(DAY, -((n.k * 7) % 120), GETDATE())
    FROM n ORDER BY n.k;

    ;WITH l AS (SELECT TOP 5 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS j FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_SalesDetail (SaleID, ItemID, Qty, Price)
    SELECT h.SaleID, i.ItemID, 1 + (h.SaleID + l.j) % 6, i.Price
    FROM dbo.QA_E2E_SalesHeader h
    JOIN l ON l.j <= 1 + h.SaleID % 5
    JOIN dbo.QA_E2E_Item i ON i.ItemID = 1 + (h.SaleID * 31 + l.j * 97) % 1200;

    UPDATE h SET TotalAmount = x.Total, Discount = CASE WHEN h.SaleID % 4 = 0 THEN ROUND(x.Total * 0.05, 2) ELSE 0 END,
                 VatAmount = ROUND((x.Total - CASE WHEN h.SaleID % 4 = 0 THEN ROUND(x.Total * 0.05, 2) ELSE 0 END) * 0.14, 2)
    FROM dbo.QA_E2E_SalesHeader h
    JOIN (SELECT SaleID, SUM(LineTotal) AS Total FROM dbo.QA_E2E_SalesDetail GROUP BY SaleID) x ON x.SaleID = h.SaleID;
    PRINT N'3) sales seeded';
END
GO

CREATE OR ALTER VIEW dbo.QA_E2E_IQ_Sales AS
SELECT h.SaleID, h.CompCode, h.BranchCode, h.InvoiceNo, h.SaleDate, h.CustomerID, h.PaymentType,
       h.TotalAmount, h.Discount, h.VatAmount, h.NetAmount, h.Remarks, h.CreatedBy, h.CreatedAt,
       c.CustCode, c.NameAr AS CustomerNameAr, c.NameEn AS CustomerNameEn, c.Phone AS CustomerPhone, c.City,
       CASE h.PaymentType WHEN 1 THEN N'آجل' ELSE N'نقدي' END AS PaymentNameAr,
       CASE h.PaymentType WHEN 1 THEN N'Credit' ELSE N'Cash' END AS PaymentNameEn,
       ISNULL(d.LinesCount, 0) AS LinesCount, ISNULL(d.LinesTotal, 0) AS LinesTotal, ISNULL(d.QtyTotal, 0) AS QtyTotal
FROM dbo.QA_E2E_SalesHeader h
JOIN dbo.QA_E2E_Customer c ON c.CustomerID = h.CustomerID
LEFT JOIN (SELECT SaleID, COUNT(*) AS LinesCount, SUM(LineTotal) AS LinesTotal, SUM(Qty) AS QtyTotal
           FROM dbo.QA_E2E_SalesDetail GROUP BY SaleID) d ON d.SaleID = h.SaleID;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_IQ_SalesDetail AS
SELECT d.DetailID, d.SaleID, d.ItemID, d.Qty, d.Price, d.LineTotal, d.Notes,
       i.ItemCode, i.Barcode, i.NameAr AS ItemNameAr, i.NameEn AS ItemNameEn, i.Unit
FROM dbo.QA_E2E_SalesDetail d
JOIN dbo.QA_E2E_Item i ON i.ItemID = d.ItemID;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_IQ_Customer360 AS
SELECT c.CustomerID, c.CompCode, c.CustCode, c.NameAr, c.NameEn, c.Phone, c.Email, c.City, c.Status, c.CreditLimit, c.Notes, c.CreatedAt,
       ISNULL(s.InvoicesCount, 0) AS InvoicesCount, ISNULL(s.SalesTotal, 0) AS SalesTotal,
       ISNULL(s.CreditTotal, 0) AS Balance, s.LastSaleDate,
       (SELECT COUNT(*) FROM dbo.QA_E2E_CustomerNote n WHERE n.CustomerID = c.CustomerID) AS NotesCount
FROM dbo.QA_E2E_Customer c
LEFT JOIN (SELECT CustomerID, COUNT(*) AS InvoicesCount, SUM(NetAmount) AS SalesTotal,
                  SUM(CASE WHEN PaymentType = 1 THEN NetAmount ELSE 0 END) AS CreditTotal, MAX(SaleDate) AS LastSaleDate
           FROM dbo.QA_E2E_SalesHeader GROUP BY CustomerID) s ON s.CustomerID = c.CustomerID;
GO

-- =====================================================================================
-- 4) Cost-center tree
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_CostCenter', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_CostCenter (
    CCID       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_CostCenter PRIMARY KEY,
    CompCode   INT NOT NULL CONSTRAINT DF_QA_E2E_CostCenter_Comp DEFAULT (1),
    CCCode     VARCHAR(30) NOT NULL,
    ParentCode VARCHAR(30) NULL,
    NameAr     NVARCHAR(150) NOT NULL,
    NameEn     NVARCHAR(150) NULL,
    CCLevel    INT NOT NULL CONSTRAINT DF_QA_E2E_CostCenter_Level DEFAULT (1),
    IsLeaf     BIT NOT NULL CONSTRAINT DF_QA_E2E_CostCenter_Leaf DEFAULT (0),
    IsActive   BIT NOT NULL CONSTRAINT DF_QA_E2E_CostCenter_Active DEFAULT (1)
);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_CostCenter)
BEGIN
    INSERT INTO dbo.QA_E2E_CostCenter (CCCode, ParentCode, NameAr, NameEn, CCLevel, IsLeaf) VALUES
    ('1', NULL, N'الإدارة العامة', N'Head office', 1, 0),
    ('2', NULL, N'الفروع', N'Branches', 1, 0),
    ('3', NULL, N'المطعم', N'Restaurant', 1, 0);
    ;WITH n AS (SELECT TOP 6 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_CostCenter (CCCode, ParentCode, NameAr, NameEn, CCLevel, IsLeaf)
    SELECT p.CCCode + RIGHT('0' + CAST(n.k AS VARCHAR(2)), 2), p.CCCode, p.NameAr + N' - قسم ' + CAST(n.k AS NVARCHAR(2)), p.NameEn + N' - dept ' + CAST(n.k AS NVARCHAR(2)), 2, 0
    FROM dbo.QA_E2E_CostCenter p CROSS JOIN n WHERE p.CCLevel = 1;
    ;WITH n AS (SELECT TOP 4 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_CostCenter (CCCode, ParentCode, NameAr, NameEn, CCLevel, IsLeaf)
    SELECT p.CCCode + RIGHT('0' + CAST(n.k AS VARCHAR(2)), 2), p.CCCode, p.NameAr + N' / وحدة ' + CAST(n.k AS NVARCHAR(2)), p.NameEn + N' / unit ' + CAST(n.k AS NVARCHAR(2)), 3, 1
    FROM dbo.QA_E2E_CostCenter p CROSS JOIN n WHERE p.CCLevel = 2;
    UPDATE dbo.QA_E2E_CostCenter SET IsActive = 0 WHERE CCCode IN ('20601', '30502');
    PRINT N'4) cost centers seeded';
END
GO

-- =====================================================================================
-- 5) Restaurant: areas, tables, menu, orders (+ views for FloorPlan / POS / KDS / receipt)
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_RestArea', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_RestArea (
    AreaID INT NOT NULL CONSTRAINT PK_QA_E2E_RestArea PRIMARY KEY,
    NameAr NVARCHAR(100) NOT NULL,
    NameEn NVARCHAR(100) NOT NULL
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_RestTable', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_RestTable (
    TableID  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_RestTable PRIMARY KEY,
    AreaID   INT NOT NULL CONSTRAINT FK_QA_E2E_RestTable_Area REFERENCES dbo.QA_E2E_RestArea (AreaID),
    TableNo  NVARCHAR(10) NOT NULL,
    X        INT NOT NULL, Y INT NOT NULL, W INT NOT NULL, H INT NOT NULL,
    Shape    VARCHAR(10) NOT NULL CONSTRAINT DF_QA_E2E_RestTable_Shape DEFAULT ('rect'),
    Seats    INT NOT NULL CONSTRAINT DF_QA_E2E_RestTable_Seats DEFAULT (4),
    Status   VARCHAR(20) NOT NULL CONSTRAINT DF_QA_E2E_RestTable_Status DEFAULT ('free'),
    OpenedAt DATETIME NULL,
    Guests   INT NULL,
    Waiter   NVARCHAR(50) NULL
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_MenuItem', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_MenuItem (
    MenuItemID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_MenuItem PRIMARY KEY,
    CategoryID INT NOT NULL CONSTRAINT FK_QA_E2E_MenuItem_Category REFERENCES dbo.QA_E2E_Category (CategoryID),
    NameAr     NVARCHAR(100) NOT NULL,
    NameEn     NVARCHAR(100) NOT NULL,
    Price      DECIMAL(18,2) NOT NULL,
    Barcode    VARCHAR(20) NULL,
    Station    VARCHAR(20) NOT NULL CONSTRAINT DF_QA_E2E_MenuItem_Station DEFAULT ('kitchen'),
    Available  BIT NOT NULL CONSTRAINT DF_QA_E2E_MenuItem_Available DEFAULT (1),
    SortOrder  INT NOT NULL CONSTRAINT DF_QA_E2E_MenuItem_Sort DEFAULT (0)
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_RestOrder', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_RestOrder (
    OrderID       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_RestOrder PRIMARY KEY,
    CompCode      INT NOT NULL CONSTRAINT DF_QA_E2E_RestOrder_Comp DEFAULT (1),
    OrderNo       INT NOT NULL,
    TableID       INT NULL CONSTRAINT FK_QA_E2E_RestOrder_Table REFERENCES dbo.QA_E2E_RestTable (TableID),
    OrderType     VARCHAR(10) NOT NULL CONSTRAINT DF_QA_E2E_RestOrder_Type DEFAULT ('dine'),
    CreatedAt     DATETIME NOT NULL CONSTRAINT DF_QA_E2E_RestOrder_Created DEFAULT (GETDATE()),
    Status        VARCHAR(10) NOT NULL CONSTRAINT DF_QA_E2E_RestOrder_Status DEFAULT ('open'),    -- open | paid
    KitchenStatus VARCHAR(10) NOT NULL CONSTRAINT DF_QA_E2E_RestOrder_Kitchen DEFAULT ('new'),  -- new | started | done
    BumpedAt      DATETIME NULL,
    Waiter        NVARCHAR(50) NULL,
    Guests        INT NULL,
    ServicePct    DECIMAL(5,2) NOT NULL CONSTRAINT DF_QA_E2E_RestOrder_Service DEFAULT (12),
    TaxPct        DECIMAL(5,2) NOT NULL CONSTRAINT DF_QA_E2E_RestOrder_Tax DEFAULT (14),
    Notes         NVARCHAR(200) NULL
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_RestOrderLine', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_RestOrderLine (
    LineID     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_RestOrderLine PRIMARY KEY,
    OrderID    INT NOT NULL CONSTRAINT FK_QA_E2E_RestOrderLine_Order REFERENCES dbo.QA_E2E_RestOrder (OrderID) ON DELETE CASCADE,
    MenuItemID INT NOT NULL CONSTRAINT FK_QA_E2E_RestOrderLine_Item REFERENCES dbo.QA_E2E_MenuItem (MenuItemID),
    Qty        DECIMAL(18,2) NOT NULL,
    Price      DECIMAL(18,2) NOT NULL,
    LineTotal  AS (CAST(Qty * Price AS DECIMAL(18,2))) PERSISTED,
    Note       NVARCHAR(200) NULL,
    Done       BIT NOT NULL CONSTRAINT DF_QA_E2E_RestOrderLine_Done DEFAULT (0)
);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_RestArea)
BEGIN
    INSERT INTO dbo.QA_E2E_RestArea (AreaID, NameAr, NameEn) VALUES (1, N'الصالة الرئيسية', N'Main hall'), (2, N'الجنينة', N'Garden');

    ;WITH n AS (SELECT TOP 16 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_RestTable (AreaID, TableNo, X, Y, W, H, Shape, Seats, Status, OpenedAt, Guests, Waiter)
    SELECT CASE WHEN n.k < 12 THEN 1 ELSE 2 END,
           CASE WHEN n.k < 12 THEN N'T' ELSE N'G' END + CAST(n.k + 1 AS NVARCHAR(3)),
           40 + ((n.k % 12) % 4) * 220, 40 + ((n.k % 12) / 4) * 180,
           CASE WHEN n.k % 3 = 0 THEN 120 ELSE 150 END, CASE WHEN n.k % 3 = 0 THEN 120 ELSE 100 END,
           CASE WHEN n.k % 3 = 0 THEN 'round' ELSE 'rect' END,
           CASE WHEN n.k % 3 = 0 THEN 2 WHEN n.k % 3 = 1 THEN 4 ELSE 6 END,
           CASE n.k % 6 WHEN 0 THEN 'free' WHEN 1 THEN 'occupied' WHEN 2 THEN 'reserved' WHEN 3 THEN 'occupied' WHEN 4 THEN 'bill' ELSE 'cleaning' END,
           CASE WHEN n.k % 6 IN (1, 3, 4) THEN DATEADD(MINUTE, -(10 + n.k * 4), GETDATE()) END,
           CASE WHEN n.k % 6 IN (1, 3, 4) THEN 2 + n.k % 3 END,
           CASE WHEN n.k % 2 = 0 THEN N'Hany' ELSE N'Samy' END
    FROM n ORDER BY n.k;

    INSERT INTO dbo.QA_E2E_MenuItem (CategoryID, NameAr, NameEn, Price, Barcode, Station, SortOrder, Available)
    SELECT c.CategoryID, v.Ar, v.En, v.Price, '29' + RIGHT('00000' + CAST(v.Sort AS VARCHAR(5)), 5), v.Station, v.Sort, v.Avail
    FROM (VALUES
        ('Grill', N'كباب', N'Kebab', 180.00, 'grill', 1, 1), ('Grill', N'كفتة', N'Kofta', 150.00, 'grill', 2, 1),
        ('Grill', N'فراخ مشوية', N'Grilled chicken', 160.00, 'grill', 3, 1), ('Grill', N'ريش ضاني', N'Lamb chops', 320.00, 'grill', 4, 1),
        ('Grill', N'طاجن', N'Tagine', 140.00, 'grill', 5, 0),
        ('Pizza', N'بيتزا مارجريتا', N'Margherita', 120.00, 'pizza', 6, 1), ('Pizza', N'بيتزا خضار', N'Vegetable pizza', 125.00, 'pizza', 7, 1),
        ('Pizza', N'بيتزا سجق', N'Sausage pizza', 145.00, 'pizza', 8, 1), ('Pizza', N'بيتزا سي فود', N'Seafood pizza', 210.00, 'pizza', 9, 1),
        ('Salads', N'سلطة خضرا', N'Green salad', 35.00, 'cold', 10, 1), ('Salads', N'طحينة', N'Tahini', 20.00, 'cold', 11, 1),
        ('Salads', N'بابا غنوج', N'Baba ghanoush', 30.00, 'cold', 12, 1), ('Salads', N'سلطة سيزر', N'Caesar salad', 75.00, 'cold', 13, 1),
        ('Drinks', N'مياه', N'Water', 10.00, 'bar', 14, 1), ('Drinks', N'كولا', N'Cola', 20.00, 'bar', 15, 1),
        ('Drinks', N'عصير مانجا', N'Mango juice', 45.00, 'bar', 16, 1), ('Drinks', N'شاي', N'Tea', 15.00, 'bar', 17, 1),
        ('Drinks', N'قهوة تركي', N'Turkish coffee', 25.00, 'bar', 18, 1),
        ('Desserts', N'أم علي', N'Om Ali', 55.00, 'cold', 19, 1), ('Desserts', N'كنافة', N'Kunafa', 60.00, 'cold', 20, 1),
        ('Desserts', N'رز بلبن', N'Rice pudding', 35.00, 'cold', 21, 1)
    ) v(Cat, Ar, En, Price, Station, Sort, Avail)
    JOIN dbo.QA_E2E_Category c ON c.NameEn = v.Cat AND c.IsMenu = 1;

    -- one open order per occupied / bill table (live KDS + floor amounts), plus 60 paid orders (receipts)
    INSERT INTO dbo.QA_E2E_RestOrder (OrderNo, TableID, OrderType, CreatedAt, Status, KitchenStatus, Waiter, Guests, Notes)
    SELECT 5000 + t.TableID, t.TableID, 'dine', t.OpenedAt, 'open',
           CASE WHEN t.Status = 'bill' THEN 'done' WHEN t.TableID % 2 = 0 THEN 'started' ELSE 'new' END,
           t.Waiter, t.Guests, CASE WHEN t.TableID % 4 = 0 THEN N'من غير بصل' END
    FROM dbo.QA_E2E_RestTable t WHERE t.Status IN ('occupied', 'bill');
    INSERT INTO dbo.QA_E2E_RestOrder (OrderNo, TableID, OrderType, CreatedAt, Status, KitchenStatus, Waiter, Notes)
    VALUES (5101, NULL, 'take', DATEADD(MINUTE, -6, GETDATE()), 'open', 'new', N'Counter', N'Takeaway - customer waiting'),
           (5102, NULL, 'take', DATEADD(MINUTE, -17, GETDATE()), 'open', 'started', N'Counter', NULL);
    ;WITH n AS (SELECT TOP 60 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_RestOrder (OrderNo, TableID, OrderType, CreatedAt, Status, KitchenStatus, BumpedAt, Waiter, Guests)
    SELECT 4000 + n.k, 1 + n.k % 16, CASE WHEN n.k % 5 = 0 THEN 'take' ELSE 'dine' END,
           DATEADD(HOUR, -n.k * 5, GETDATE()), 'paid', 'done', DATEADD(MINUTE, 20, DATEADD(HOUR, -n.k * 5, GETDATE())), N'Hany', 2 + n.k % 4
    FROM n;

    ;WITH l AS (SELECT TOP 4 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS j FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_RestOrderLine (OrderID, MenuItemID, Qty, Price, Note, Done)
    SELECT o.OrderID, m.MenuItemID, 1 + (o.OrderID + l.j) % 3, m.Price,
           CASE WHEN (o.OrderID + l.j) % 7 = 0 THEN N'زيادة شطة' END,
           CASE WHEN o.KitchenStatus = 'done' OR (o.KitchenStatus = 'started' AND l.j = 1) THEN 1 ELSE 0 END
    FROM dbo.QA_E2E_RestOrder o
    JOIN l ON l.j <= 2 + o.OrderID % 3
    JOIN dbo.QA_E2E_MenuItem m ON m.MenuItemID = 1 + (o.OrderID * 7 + l.j * 5) % 21;
    PRINT N'5) restaurant seeded';
END
GO

CREATE OR ALTER VIEW dbo.QA_E2E_MenuCategory AS
SELECT CategoryID, NameAr, NameEn, Color, SortOrder FROM dbo.QA_E2E_Category WHERE IsMenu = 1 AND IsActive = 1;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_IQ_TableStatus AS
SELECT t.TableID, t.AreaID, t.TableNo, t.X, t.Y, t.W, t.H, t.Shape, t.Seats, t.Status, t.OpenedAt, t.Guests, t.Waiter,
       a.NameAr AS AreaNameAr, a.NameEn AS AreaNameEn,
       ISNULL((SELECT SUM(l.LineTotal) FROM dbo.QA_E2E_RestOrder o JOIN dbo.QA_E2E_RestOrderLine l ON l.OrderID = o.OrderID
               WHERE o.TableID = t.TableID AND o.Status = 'open'), 0) AS Amount
FROM dbo.QA_E2E_RestTable t JOIN dbo.QA_E2E_RestArea a ON a.AreaID = t.AreaID;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_IQ_RestOrder AS
SELECT o.OrderID, o.CompCode, o.OrderNo, o.TableID, t.TableNo, o.OrderType, o.CreatedAt, o.Status, o.KitchenStatus, o.BumpedAt,
       o.Waiter, o.Guests, o.Notes, o.ServicePct, o.TaxPct,
       ISNULL(x.SubTotal, 0) AS SubTotal,
       CAST(ISNULL(x.SubTotal, 0) * o.ServicePct / 100 AS DECIMAL(18,2)) AS Service,
       CAST(ISNULL(x.SubTotal, 0) * (1 + o.ServicePct / 100) * o.TaxPct / 100 AS DECIMAL(18,2)) AS Tax,
       CAST(ISNULL(x.SubTotal, 0) * (1 + o.ServicePct / 100) * (1 + o.TaxPct / 100) AS DECIMAL(18,2)) AS Total,
       ISNULL(x.ItemsCount, 0) AS ItemsCount
FROM dbo.QA_E2E_RestOrder o
LEFT JOIN dbo.QA_E2E_RestTable t ON t.TableID = o.TableID
LEFT JOIN (SELECT OrderID, SUM(LineTotal) AS SubTotal, SUM(Qty) AS ItemsCount FROM dbo.QA_E2E_RestOrderLine GROUP BY OrderID) x ON x.OrderID = o.OrderID;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_IQ_RestOrderLine AS
SELECT l.LineID, l.OrderID, l.MenuItemID, l.Qty, l.Price, l.LineTotal, l.Note, l.Done,
       m.NameAr AS ItemNameAr, m.NameEn AS ItemNameEn, m.Station
FROM dbo.QA_E2E_RestOrderLine l JOIN dbo.QA_E2E_MenuItem m ON m.MenuItemID = l.MenuItemID;
GO
-- KDS tickets: open orders (+ orders bumped in the last 2 hours for recall); items as JSON
CREATE OR ALTER VIEW dbo.QA_E2E_IQ_KitchenTickets AS
SELECT o.OrderID AS TicketID, o.OrderNo, t.TableNo, o.OrderType, o.CreatedAt, o.KitchenStatus AS Status, o.Notes, o.BumpedAt,
       (SELECT l.LineID AS id, m.NameEn AS name, l.Qty AS qty, l.Note AS note, m.Station AS station, l.Done AS done
        FROM dbo.QA_E2E_RestOrderLine l JOIN dbo.QA_E2E_MenuItem m ON m.MenuItemID = l.MenuItemID
        WHERE l.OrderID = o.OrderID FOR JSON PATH) AS ItemsJson
FROM dbo.QA_E2E_RestOrder o
LEFT JOIN dbo.QA_E2E_RestTable t ON t.TableID = o.TableID
WHERE o.Status = 'open' OR o.BumpedAt > DATEADD(HOUR, -2, GETDATE());
GO

-- =====================================================================================
-- 6) Gaming lounge: devices (live) + session history
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_GameDevice', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_GameDevice (
    DeviceID       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_GameDevice PRIMARY KEY,
    Name           NVARCHAR(50) NOT NULL,
    Type           VARCHAR(20) NOT NULL,      -- PS5 | PS4 | Billiard
    Room           NVARCHAR(50) NOT NULL,
    Status         VARCHAR(20) NOT NULL CONSTRAINT DF_QA_E2E_GameDevice_Status DEFAULT ('free'),
    StartedAt      DATETIME NULL,
    PausedMs       BIGINT NOT NULL CONSTRAINT DF_QA_E2E_GameDevice_PausedMs DEFAULT (0),
    PausedAt       DATETIME NULL,
    Mode           VARCHAR(10) NULL,           -- single | multi
    PrepaidMinutes INT NULL,
    ItemsAmount    DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_GameDevice_Items DEFAULT (0),
    Customer       NVARCHAR(100) NULL
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_GameSession', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_GameSession (
    SessionID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_GameSession PRIMARY KEY,
    DeviceID  INT NOT NULL CONSTRAINT FK_QA_E2E_GameSession_Device REFERENCES dbo.QA_E2E_GameDevice (DeviceID),
    StartedAt DATETIME NOT NULL,
    EndedAt   DATETIME NULL,
    Mode      VARCHAR(10) NULL,
    Amount    DECIMAL(18,2) NOT NULL CONSTRAINT DF_QA_E2E_GameSession_Amount DEFAULT (0),
    Customer  NVARCHAR(100) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_GameDevice)
BEGIN
    ;WITH n AS (SELECT TOP 14 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_GameDevice (Name, Type, Room, Status, StartedAt, PausedMs, PausedAt, Mode, PrepaidMinutes, ItemsAmount, Customer)
    SELECT CASE WHEN n.k <= 6 THEN N'PS5 #' WHEN n.k <= 10 THEN N'PS4 #' ELSE N'Billiard #' END + CAST(n.k AS NVARCHAR(3)),
           CASE WHEN n.k <= 6 THEN 'PS5' WHEN n.k <= 10 THEN 'PS4' ELSE 'Billiard' END,
           CASE WHEN n.k <= 6 THEN N'VIP' WHEN n.k <= 10 THEN N'Hall' ELSE N'Billiard room' END,
           CASE n.k % 4 WHEN 0 THEN 'free' WHEN 3 THEN 'paused' ELSE 'running' END,
           CASE WHEN n.k % 4 <> 0 THEN DATEADD(MINUTE, -(15 + n.k * 9), GETDATE()) END,
           CASE WHEN n.k % 4 = 3 THEN 300000 ELSE 0 END,
           CASE WHEN n.k % 4 = 3 THEN DATEADD(MINUTE, -2, GETDATE()) END,
           CASE WHEN n.k % 4 = 0 THEN NULL WHEN n.k % 2 = 0 THEN 'multi' ELSE 'single' END,
           CASE WHEN n.k IN (1, 5) THEN 60 WHEN n.k = 2 THEN 30 END,
           CASE WHEN n.k % 3 = 0 THEN 45 ELSE 0 END,
           CASE WHEN n.k % 4 <> 0 THEN N'Guest ' + CAST(n.k AS NVARCHAR(3)) END
    FROM n ORDER BY n.k;
    ;WITH n AS (SELECT TOP 200 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_GameSession (DeviceID, StartedAt, EndedAt, Mode, Amount, Customer)
    SELECT 1 + n.k % 14, DATEADD(HOUR, -n.k * 3, GETDATE()), DATEADD(MINUTE, 45 + n.k % 90, DATEADD(HOUR, -n.k * 3, GETDATE())),
           CASE WHEN n.k % 2 = 0 THEN 'multi' ELSE 'single' END, 40 + (n.k % 9) * 10, N'Guest ' + CAST(n.k AS NVARCHAR(5))
    FROM n;
    PRINT N'6) gaming seeded';
END
GO

-- =====================================================================================
-- 7) Clinic: doctors + appointments (Scheduler)
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_Doctor', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_Doctor (
    DoctorID  INT NOT NULL CONSTRAINT PK_QA_E2E_Doctor PRIMARY KEY,
    NameAr    NVARCHAR(100) NOT NULL,
    NameEn    NVARCHAR(100) NOT NULL,
    Color     VARCHAR(20) NULL,
    WorkStart VARCHAR(5) NULL,
    WorkEnd   VARCHAR(5) NULL
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_Appointment', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_Appointment (
    AppID       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_Appointment PRIMARY KEY,
    DoctorID    INT NOT NULL CONSTRAINT FK_QA_E2E_Appointment_Doctor REFERENCES dbo.QA_E2E_Doctor (DoctorID),
    CustomerID  INT NULL CONSTRAINT FK_QA_E2E_Appointment_Customer REFERENCES dbo.QA_E2E_Customer (CustomerID),
    PatientName NVARCHAR(150) NOT NULL,
    StartAt     DATETIME NOT NULL,
    Duration    INT NOT NULL CONSTRAINT DF_QA_E2E_Appointment_Duration DEFAULT (30),
    AppType     NVARCHAR(50) NULL,
    Status      VARCHAR(20) NOT NULL CONSTRAINT DF_QA_E2E_Appointment_Status DEFAULT ('booked'),
    Notes       NVARCHAR(200) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_QA_E2E_Appointment_Start')
    CREATE INDEX IX_QA_E2E_Appointment_Start ON dbo.QA_E2E_Appointment (StartAt);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_Doctor)
BEGIN
    INSERT INTO dbo.QA_E2E_Doctor (DoctorID, NameAr, NameEn, Color, WorkStart, WorkEnd) VALUES
    (1, N'د. سامي', N'Dr. Sami', '#0D9488', '09:00', '17:00'),
    (2, N'د. هالة', N'Dr. Hala', '#8B5CF6', '12:00', '20:00'),
    (3, N'د. كريم', N'Dr. Karim', '#F97316', '10:00', '18:00');
    -- 4 weeks around today, 09:00..19:30 slots
    ;WITH n AS (SELECT TOP 420 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_Appointment (DoctorID, CustomerID, PatientName, StartAt, Duration, AppType, Status)
    SELECT 1 + n.k % 3, 1 + n.k % 60, c.NameAr,
           DATEADD(MINUTE, ((n.k * 7) % 22) * 30, DATEADD(HOUR, 9, CAST(DATEADD(DAY, (n.k % 28) - 14, CAST(GETDATE() AS DATE)) AS DATETIME))),
           CASE WHEN n.k % 5 = 0 THEN 60 ELSE 30 END,
           CASE n.k % 3 WHEN 0 THEN N'كشف' WHEN 1 THEN N'متابعة' ELSE N'استشارة' END,
           CASE WHEN (n.k % 28) < 14 THEN CASE WHEN n.k % 9 = 0 THEN 'noshow' ELSE 'done' END
                WHEN n.k % 4 = 0 THEN 'arrived' ELSE 'booked' END
    FROM n JOIN dbo.QA_E2E_Customer c ON c.CustomerID = 1 + n.k % 60;
    PRINT N'7) appointments seeded';
END
GO

-- =====================================================================================
-- 8) Kanban tasks
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_Task', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_Task (
    TaskID    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_Task PRIMARY KEY,
    Title     NVARCHAR(200) NOT NULL,
    Customer  NVARCHAR(150) NULL,
    Stage     VARCHAR(20) NOT NULL CONSTRAINT DF_QA_E2E_Task_Stage DEFAULT ('new'),   -- new | progress | review | done
    Priority  VARCHAR(10) NOT NULL CONSTRAINT DF_QA_E2E_Task_Priority DEFAULT ('normal'),
    Amount    DECIMAL(18,2) NULL,
    DueDate   DATE NULL,
    Owner     NVARCHAR(50) NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_QA_E2E_Task_Created DEFAULT (GETDATE())
);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_Task)
BEGIN
    ;WITH n AS (SELECT TOP 120 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects)
    INSERT INTO dbo.QA_E2E_Task (Title, Customer, Stage, Priority, Amount, DueDate, Owner, CreatedAt)
    SELECT CASE n.k % 4 WHEN 0 THEN N'عرض سعر رقم ' WHEN 1 THEN N'Follow up #' WHEN 2 THEN N'تركيب أجهزة ' ELSE N'Support ticket #' END + CAST(n.k AS NVARCHAR(5)),
           c.NameAr,
           CASE WHEN n.k % 10 < 4 THEN 'new' WHEN n.k % 10 < 7 THEN 'progress' WHEN n.k % 10 < 8 THEN 'review' ELSE 'done' END,
           CASE WHEN n.k % 6 = 0 THEN 'high' WHEN n.k % 6 = 1 THEN 'low' ELSE 'normal' END,
           (n.k % 20) * 750, DATEADD(DAY, (n.k % 30) - 10, CAST(GETDATE() AS DATE)),
           CASE n.k % 3 WHEN 0 THEN N'Mona' WHEN 1 THEN N'Omar' ELSE N'Reem' END,
           DATEADD(DAY, -n.k, GETDATE())
    FROM n JOIN dbo.QA_E2E_Customer c ON c.CustomerID = 1 + n.k % 60;
    PRINT N'8) tasks seeded';
END
GO

-- =====================================================================================
-- 9) Gym members (Wizard target table)
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_Member', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_Member (
    MemberID   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_Member PRIMARY KEY,
    FullName   NVARCHAR(150) NOT NULL,
    Phone      VARCHAR(20) NOT NULL,
    Email      VARCHAR(100) NULL,
    PlanCode   VARCHAR(10) NOT NULL,
    HasTrainer BIT NOT NULL CONSTRAINT DF_QA_E2E_Member_Trainer DEFAULT (0),
    TrainerID  INT NULL,
    Weight     DECIMAL(6,2) NULL,
    StartDate  DATE NULL,
    CreatedAt  DATETIME NOT NULL CONSTRAINT DF_QA_E2E_Member_Created DEFAULT (GETDATE())
);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_Member)
    INSERT INTO dbo.QA_E2E_Member (FullName, Phone, PlanCode, HasTrainer, StartDate) VALUES
    (N'هاني فؤاد', '01011112222', 'm1', 0, CAST(GETDATE() AS DATE)),
    (N'Laila Samir', '01233334444', 'm3', 1, CAST(GETDATE() AS DATE));
GO

-- =====================================================================================
-- 10) Warehouse: stock + scan tasks
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_Stock', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_Stock (
    StockID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_Stock PRIMARY KEY,
    ItemID  INT NOT NULL CONSTRAINT FK_QA_E2E_Stock_Item REFERENCES dbo.QA_E2E_Item (ItemID),
    Bin     VARCHAR(20) NOT NULL,
    Qty     DECIMAL(18,3) NOT NULL CONSTRAINT DF_QA_E2E_Stock_Qty DEFAULT (0)
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_ScanTask', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_ScanTask (
    TaskID    INT NOT NULL CONSTRAINT PK_QA_E2E_ScanTask PRIMARY KEY,
    TaskNo    VARCHAR(20) NOT NULL,
    Kind      VARCHAR(20) NOT NULL,     -- receive | pick | count
    Title     NVARCHAR(150) NOT NULL,
    Status    VARCHAR(20) NOT NULL CONSTRAINT DF_QA_E2E_ScanTask_Status DEFAULT ('open'),
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_QA_E2E_ScanTask_Created DEFAULT (GETDATE())
);
GO
IF OBJECT_ID(N'dbo.QA_E2E_ScanTaskLine', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_ScanTaskLine (
    LineID      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_ScanTaskLine PRIMARY KEY,
    TaskID      INT NOT NULL CONSTRAINT FK_QA_E2E_ScanTaskLine_Task REFERENCES dbo.QA_E2E_ScanTask (TaskID),
    ItemID      INT NOT NULL CONSTRAINT FK_QA_E2E_ScanTaskLine_Item REFERENCES dbo.QA_E2E_Item (ItemID),
    ExpectedQty DECIMAL(18,3) NOT NULL,
    ScannedQty  DECIMAL(18,3) NOT NULL CONSTRAINT DF_QA_E2E_ScanTaskLine_Scanned DEFAULT (0),
    Bin         VARCHAR(20) NULL,
    Batch       VARCHAR(20) NULL,
    ExpiryDate  DATE NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_Stock)
BEGIN
    INSERT INTO dbo.QA_E2E_Stock (ItemID, Bin, Qty)
    SELECT ItemID, 'A-' + RIGHT('0' + CAST(1 + ItemID % 20 AS VARCHAR(2)), 2) + '-' + CAST(1 + ItemID % 5 AS VARCHAR(1)), (ItemID * 13) % 200
    FROM dbo.QA_E2E_Item;
    INSERT INTO dbo.QA_E2E_ScanTask (TaskID, TaskNo, Kind, Title) VALUES
    (1, 'GRN-1045', 'receive', N'استلام أمر شراء 1045'),
    (2, 'PICK-77', 'pick', N'Pick order #77'),
    (3, 'CNT-A01', 'count', N'جرد الرف A-01');
    INSERT INTO dbo.QA_E2E_ScanTaskLine (TaskID, ItemID, ExpectedQty, Bin, Batch, ExpiryDate)
    SELECT 1, ItemID, 2 + ItemID % 5, s.Bin, 'B' + CAST(ItemID AS VARCHAR(6)), CASE WHEN ItemID = 26 THEN DATEADD(DAY, -5, CAST(GETDATE() AS DATE)) ELSE DATEADD(MONTH, 6, CAST(GETDATE() AS DATE)) END
    FROM dbo.QA_E2E_Stock s WHERE ItemID IN (1, 2, 3, 26, 51, 52)
    UNION ALL
    SELECT 2, ItemID, 1 + ItemID % 3, s.Bin, NULL, NULL FROM dbo.QA_E2E_Stock s WHERE ItemID BETWEEN 100 AND 107;
    PRINT N'10) warehouse seeded';
END
GO
-- items list view (needs QA_E2E_Stock)
CREATE OR ALTER VIEW dbo.QA_E2E_IQ_Item AS
SELECT i.ItemID, i.CompCode, i.CategoryID, i.TypeID, i.ItemCode, i.Barcode, i.NameAr, i.NameEn, i.Price, i.Cost, i.Unit, i.Copies, i.IsActive, i.CreatedAt,
       c.NameAr AS CategoryNameAr, c.NameEn AS CategoryNameEn, t.NameAr AS TypeNameAr, t.NameEn AS TypeNameEn,
       ISNULL((SELECT SUM(s.Qty) FROM dbo.QA_E2E_Stock s WHERE s.ItemID = i.ItemID), 0) AS StockQty
FROM dbo.QA_E2E_Item i
JOIN dbo.QA_E2E_Category c ON c.CategoryID = i.CategoryID
JOIN dbo.QA_E2E_ItemType t ON t.TypeID = i.TypeID;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_IQ_ScanLines AS
SELECT l.LineID, l.TaskID, t.TaskNo, l.ItemID, i.ItemCode, i.NameAr AS ItemNameAr, i.NameEn AS ItemNameEn,
       i.Barcode AS Barcodes, l.ExpectedQty, l.ScannedQty, l.Bin, l.Batch, l.ExpiryDate
FROM dbo.QA_E2E_ScanTaskLine l
JOIN dbo.QA_E2E_ScanTask t ON t.TaskID = l.TaskID
JOIN dbo.QA_E2E_Item i ON i.ItemID = l.ItemID;
GO

-- =====================================================================================
-- 11) KPI views (aggregated; one row set per Period = 7 / 30 / 90 days)
-- =====================================================================================
CREATE OR ALTER VIEW dbo.QA_E2E_VW_KpiSales AS
SELECT p.Period,
       ISNULL(SUM(CASE WHEN h.SaleDate > DATEADD(DAY, -p.Period, CAST(GETDATE() AS DATE)) THEN h.NetAmount END), 0) AS Sales,
       ISNULL(SUM(CASE WHEN h.SaleDate <= DATEADD(DAY, -p.Period, CAST(GETDATE() AS DATE)) AND h.SaleDate > DATEADD(DAY, -2 * p.Period, CAST(GETDATE() AS DATE)) THEN h.NetAmount END), 0) AS SalesPrev,
       COUNT(CASE WHEN h.SaleDate > DATEADD(DAY, -p.Period, CAST(GETDATE() AS DATE)) THEN 1 END) AS Invoices,
       COUNT(CASE WHEN h.SaleDate <= DATEADD(DAY, -p.Period, CAST(GETDATE() AS DATE)) AND h.SaleDate > DATEADD(DAY, -2 * p.Period, CAST(GETDATE() AS DATE)) THEN 1 END) AS InvoicesPrev,
       (SELECT COUNT(*) FROM dbo.QA_E2E_Customer) AS Customers,
       (SELECT COUNT(*) FROM dbo.QA_E2E_RestTable WHERE Status IN ('occupied', 'bill')) AS BusyTables
FROM (VALUES (7), (30), (90)) p(Period)
CROSS JOIN dbo.QA_E2E_SalesHeader h
GROUP BY p.Period;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_VW_SalesByDay AS
SELECT p.Period, h.SaleDate AS Day, CONVERT(VARCHAR(5), h.SaleDate, 101) AS DayLabel,
       SUM(h.NetAmount) AS Sales, CAST(15000 AS DECIMAL(18,2)) AS Target
FROM (VALUES (7), (30), (90)) p(Period)
JOIN dbo.QA_E2E_SalesHeader h ON h.SaleDate > DATEADD(DAY, -p.Period, CAST(GETDATE() AS DATE))
GROUP BY p.Period, h.SaleDate;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_VW_SalesByCategory AS
SELECT p.Period, c.NameEn AS Category, c.NameAr AS CategoryAr, SUM(d.LineTotal) AS Value
FROM (VALUES (7), (30), (90)) p(Period)
JOIN dbo.QA_E2E_SalesHeader h ON h.SaleDate > DATEADD(DAY, -p.Period, CAST(GETDATE() AS DATE))
JOIN dbo.QA_E2E_SalesDetail d ON d.SaleID = h.SaleID
JOIN dbo.QA_E2E_Item i ON i.ItemID = d.ItemID
JOIN dbo.QA_E2E_Category c ON c.CategoryID = i.CategoryID
GROUP BY p.Period, c.NameEn, c.NameAr;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_VW_TopItems AS
SELECT p.Period, i.NameEn AS Item, i.NameAr AS ItemAr, SUM(d.Qty) AS Qty, SUM(d.LineTotal) AS Amount
FROM (VALUES (7), (30), (90)) p(Period)
JOIN dbo.QA_E2E_SalesHeader h ON h.SaleDate > DATEADD(DAY, -p.Period, CAST(GETDATE() AS DATE))
JOIN dbo.QA_E2E_SalesDetail d ON d.SaleID = h.SaleID
JOIN dbo.QA_E2E_Item i ON i.ItemID = d.ItemID
GROUP BY p.Period, i.NameEn, i.NameAr;
GO
CREATE OR ALTER VIEW dbo.QA_E2E_VW_Alerts AS
SELECT p.Period, a.AlertID, a.Text, a.Level
FROM (VALUES (7), (30), (90)) p(Period)
CROSS JOIN (
    SELECT 1 AS AlertID, N'Items out of stock: ' + CAST(COUNT(*) AS NVARCHAR(10)) AS Text, 'critical' AS Level FROM dbo.QA_E2E_Stock WHERE Qty = 0
    UNION ALL SELECT 2, N'Blocked customers: ' + CAST(COUNT(*) AS NVARCHAR(10)), 'warning' FROM dbo.QA_E2E_Customer WHERE Status = 'blocked'
    UNION ALL SELECT 3, N'Tables waiting for the bill: ' + CAST(COUNT(*) AS NVARCHAR(10)), 'info' FROM dbo.QA_E2E_RestTable WHERE Status = 'bill'
) a;
GO

-- =====================================================================================
-- 12) Big table: 200,000 rows (pagination vs infinite scroll)
-- =====================================================================================
IF OBJECT_ID(N'dbo.QA_E2E_BigLog', N'U') IS NULL
CREATE TABLE dbo.QA_E2E_BigLog (
    LogID      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QA_E2E_BigLog PRIMARY KEY,
    CompCode   INT NOT NULL CONSTRAINT DF_QA_E2E_BigLog_Comp DEFAULT (1),
    LogDate    DATETIME NOT NULL,
    CategoryID INT NOT NULL,
    ItemID     INT NOT NULL,
    Qty        DECIMAL(18,3) NOT NULL,
    Amount     DECIMAL(18,2) NOT NULL,
    Status     VARCHAR(10) NOT NULL,
    Note       NVARCHAR(100) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM dbo.QA_E2E_BigLog)
BEGIN
    ;WITH n AS (SELECT TOP 200000 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k FROM sys.all_objects a CROSS JOIN sys.all_objects b)
    INSERT INTO dbo.QA_E2E_BigLog WITH (TABLOCK) (LogDate, CategoryID, ItemID, Qty, Amount, Status, Note)
    SELECT DATEADD(MINUTE, -n.k * 3, GETDATE()), 1 + n.k % 6, 1 + (n.k * 7) % 1200, 1 + n.k % 10,
           CAST(((n.k * 37) % 100000) / 100.0 AS DECIMAL(18,2)),
           CASE n.k % 5 WHEN 0 THEN 'void' WHEN 1 THEN 'pending' ELSE 'ok' END,
           N'Row ' + CAST(n.k AS NVARCHAR(10))
    FROM n;
    PRINT N'12) big log seeded (200k rows)';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_QA_E2E_BigLog_Category')
    CREATE INDEX IX_QA_E2E_BigLog_Category ON dbo.QA_E2E_BigLog (CompCode, CategoryID, LogID);
GO

-- =====================================================================================
-- 13) Report procedures (rf-report/1 data: Data = header/rows, Data2 = lines)
-- =====================================================================================
CREATE OR ALTER PROCEDURE dbo.QA_E2E_Rpt_SalesInvoice @TrID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.QA_E2E_IQ_Sales WHERE SaleID = @TrID;
    SELECT * FROM dbo.QA_E2E_IQ_SalesDetail WHERE SaleID = @TrID ORDER BY DetailID;
END
GO
CREATE OR ALTER PROCEDURE dbo.QA_E2E_Rpt_RestReceipt @TrID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.QA_E2E_IQ_RestOrder WHERE OrderID = @TrID;
    SELECT * FROM dbo.QA_E2E_IQ_RestOrderLine WHERE OrderID = @TrID ORDER BY LineID;
END
GO
CREATE OR ALTER PROCEDURE dbo.QA_E2E_Rpt_ItemLabels @CategoryID INT = NULL, @TypeID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 240 ItemID, ItemCode, Barcode, NameAr AS ItemName, NameEn AS ItemNameEn, Price, Copies, CategoryNameAr, TypeNameAr
    FROM dbo.QA_E2E_IQ_Item
    WHERE IsActive = 1 AND (@CategoryID IS NULL OR CategoryID = @CategoryID) AND (@TypeID IS NULL OR TypeID = @TypeID)
    ORDER BY ItemID;
END
GO
CREATE OR ALTER PROCEDURE dbo.QA_E2E_Rpt_SalesByCustomer @FromDate DATE = NULL, @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CustomerNameAr, CustomerNameEn, City, InvoiceNo, SaleDate, PaymentNameAr, PaymentNameEn, TotalAmount, Discount, VatAmount, NetAmount
    FROM dbo.QA_E2E_IQ_Sales
    WHERE (@FromDate IS NULL OR SaleDate >= @FromDate) AND (@ToDate IS NULL OR SaleDate <= @ToDate)
    ORDER BY City, CustomerNameAr, SaleDate;
END
GO

PRINT N'QA_E2E schema ready.';
SELECT 'QA_E2E_Item' AS T, COUNT(*) AS N FROM dbo.QA_E2E_Item UNION ALL
SELECT 'QA_E2E_Customer', COUNT(*) FROM dbo.QA_E2E_Customer UNION ALL
SELECT 'QA_E2E_SalesHeader', COUNT(*) FROM dbo.QA_E2E_SalesHeader UNION ALL
SELECT 'QA_E2E_SalesDetail', COUNT(*) FROM dbo.QA_E2E_SalesDetail UNION ALL
SELECT 'QA_E2E_RestOrder', COUNT(*) FROM dbo.QA_E2E_RestOrder UNION ALL
SELECT 'QA_E2E_Appointment', COUNT(*) FROM dbo.QA_E2E_Appointment UNION ALL
SELECT 'QA_E2E_BigLog', COUNT(*) FROM dbo.QA_E2E_BigLog;
GO
