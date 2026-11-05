/* =====================================================================================
   TEST OBJECTS -- safe to drop later  (Database/Test_ScreenBuilder_Drop.sql removes all of it)
   -------------------------------------------------------------------------------------
   Purpose : end-to-end test of the no-code ScreenBuilder (grid / masterDetail / tree, filters,
             cascading dropdowns, action buttons, Excel import) and of the report system
             (list / grouped / statement / transaction print / labels / chart-only).
   Naming  : tables  TST_*        views  IQ_TST_*        procs  TST_Rpt_* (reports) and TST_Proc_* (buttons)
   Rules   : - idempotent (IF OBJECT_ID IS NULL for tables, CREATE OR ALTER for views/procs,
               seed only when the target table is empty).
             - does NOT touch any existing (production) object. Does NOT modify G_ProcessTrans:
               the test screens must be built with runProcessTrans = false (no TST TrType branch).
               Because of that TrNo is NOT generated on insert: it is nullable, seeded for posted
               orders, and assigned by TST_Proc_PostOrder when still NULL.
   Data    : CompCode = 1, BranchCode 1 and 2 (real Sys_Branch rows of company 1).
   Database: ESSA_React
   ===================================================================================== */
USE [ESSA_React];
GO
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

/* =====================================================================================
   1) LOOKUP TABLES
   ===================================================================================== */

-- 1.1 Category (tree)
IF OBJECT_ID(N'dbo.TST_Category', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_Category
    (
        CategoryID  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_Category PRIMARY KEY,
        CompCode    INT            NOT NULL,
        ParentID    INT            NULL,
        Code        NVARCHAR(30)   NOT NULL,
        NameA       NVARCHAR(200)  NOT NULL,
        NameE       NVARCHAR(200)  NULL,
        [Level]     INT            NOT NULL CONSTRAINT DF_TST_Category_Level DEFAULT (1),
        IsActive    BIT            NOT NULL CONSTRAINT DF_TST_Category_Active DEFAULT (1),
        CONSTRAINT FK_TST_Category_Parent FOREIGN KEY (ParentID) REFERENCES dbo.TST_Category (CategoryID)
    );
    PRINT N'created TST_Category';
END
GO

-- 1.2 Unit
IF OBJECT_ID(N'dbo.TST_Unit', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_Unit
    (
        UnitID      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_Unit PRIMARY KEY,
        CompCode    INT            NOT NULL,
        Code        NVARCHAR(30)   NOT NULL,
        NameA       NVARCHAR(100)  NOT NULL,
        NameE       NVARCHAR(100)  NULL,
        IsActive    BIT            NOT NULL CONSTRAINT DF_TST_Unit_Active DEFAULT (1)
    );
    PRINT N'created TST_Unit';
END
GO

-- 1.3 Warehouse (company + branch)
IF OBJECT_ID(N'dbo.TST_Warehouse', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_Warehouse
    (
        WarehouseID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_Warehouse PRIMARY KEY,
        CompCode    INT            NOT NULL,
        BranchCode  INT            NOT NULL,
        Code        NVARCHAR(30)   NOT NULL,
        NameA       NVARCHAR(200)  NOT NULL,
        NameE       NVARCHAR(200)  NULL,
        IsActive    BIT            NOT NULL CONSTRAINT DF_TST_Warehouse_Active DEFAULT (1)
    );
    PRINT N'created TST_Warehouse';
END
GO

-- 1.4 Customer
IF OBJECT_ID(N'dbo.TST_Customer', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_Customer
    (
        CustomerID  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_Customer PRIMARY KEY,
        CompCode    INT            NOT NULL,
        Code        NVARCHAR(30)   NOT NULL,
        NameA       NVARCHAR(200)  NOT NULL,
        NameE       NVARCHAR(200)  NULL,
        Phone       NVARCHAR(30)   NULL,
        Email       NVARCHAR(100)  NULL,
        CreditLimit DECIMAL(18,2)  NOT NULL CONSTRAINT DF_TST_Customer_Credit DEFAULT (0),
        City        NVARCHAR(100)  NULL,
        IsActive    BIT            NOT NULL CONSTRAINT DF_TST_Customer_Active DEFAULT (1)
    );
    PRINT N'created TST_Customer';
END
GO

-- 1.5 Item
IF OBJECT_ID(N'dbo.TST_Item', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_Item
    (
        ItemID      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_Item PRIMARY KEY,
        CompCode    INT            NOT NULL,
        Code        NVARCHAR(30)   NOT NULL,
        NameA       NVARCHAR(200)  NOT NULL,
        NameE       NVARCHAR(200)  NULL,
        CategoryID  INT            NULL,
        UnitID      INT            NULL,
        Price       DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_Item_Price DEFAULT (0),
        Cost        DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_Item_Cost DEFAULT (0),
        Barcode     NVARCHAR(50)   NULL,
        IsActive    BIT            NOT NULL CONSTRAINT DF_TST_Item_Active DEFAULT (1),
        CONSTRAINT FK_TST_Item_Category FOREIGN KEY (CategoryID) REFERENCES dbo.TST_Category (CategoryID),
        CONSTRAINT FK_TST_Item_Unit     FOREIGN KEY (UnitID)     REFERENCES dbo.TST_Unit (UnitID)
    );
    PRINT N'created TST_Item';
END
GO

/* =====================================================================================
   2) GRID SCREEN TARGET : TST_Expense (+ view)
      CategoryID dropdown, ItemID dropdown cascading on category, CustomerID dropdown.
      Status: 0 pending / 1 approved / 2 rejected
   ===================================================================================== */
IF OBJECT_ID(N'dbo.TST_Expense', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_Expense
    (
        ExpenseID   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_Expense PRIMARY KEY,
        CompCode    INT            NOT NULL,
        BranchCode  INT            NOT NULL,
        ExpenseDate DATE           NOT NULL CONSTRAINT DF_TST_Expense_Date DEFAULT (CAST(GETDATE() AS DATE)),
        Amount      DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_Expense_Amount DEFAULT (0),
        CategoryID  INT            NULL,
        ItemID      INT            NULL,
        CustomerID  INT            NULL,
        Notes       NVARCHAR(500)  NULL,
        Status      INT            NOT NULL CONSTRAINT DF_TST_Expense_Status DEFAULT (0),
        CreatedBy   NVARCHAR(100)  NULL,
        CreatedAt   DATETIME       NOT NULL CONSTRAINT DF_TST_Expense_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_TST_Expense_Category FOREIGN KEY (CategoryID) REFERENCES dbo.TST_Category (CategoryID),
        CONSTRAINT FK_TST_Expense_Item     FOREIGN KEY (ItemID)     REFERENCES dbo.TST_Item (ItemID),
        CONSTRAINT FK_TST_Expense_Customer FOREIGN KEY (CustomerID) REFERENCES dbo.TST_Customer (CustomerID)
    );
    PRINT N'created TST_Expense';
END
GO

CREATE OR ALTER VIEW dbo.IQ_TST_Expense
AS
SELECT  e.ExpenseID, e.CompCode, e.BranchCode, e.ExpenseDate, e.Amount,
        e.CategoryID, c.Code AS CategoryCode, c.NameA AS CategoryNameA, c.NameE AS CategoryNameE,
        e.ItemID,     i.Code AS ItemCode,     i.NameA AS ItemNameA,     i.NameE AS ItemNameE,
        e.CustomerID, u.Code AS CustomerCode, u.NameA AS CustomerNameA, u.NameE AS CustomerNameE,
        e.Notes, e.Status,
        CASE e.Status WHEN 0 THEN N'معلّق'  WHEN 1 THEN N'معتمد'   WHEN 2 THEN N'مرفوض'   ELSE N'' END AS StatusTextA,
        CASE e.Status WHEN 0 THEN N'Pending' WHEN 1 THEN N'Approved' WHEN 2 THEN N'Rejected' ELSE N'' END AS StatusTextE,
        e.CreatedBy, e.CreatedAt
FROM    dbo.TST_Expense e
        LEFT JOIN dbo.TST_Category c ON c.CategoryID = e.CategoryID
        LEFT JOIN dbo.TST_Item     i ON i.ItemID     = e.ItemID
        LEFT JOIN dbo.TST_Customer u ON u.CustomerID = e.CustomerID;
GO

/* =====================================================================================
   3) MASTER-DETAIL TARGET (2 details): TST_Order + TST_OrderLine + TST_OrderPayment
      Status: 0 draft / 1 posted / 2 cancelled      PaymentType: 0 cash / 1 credit / 2 card
      LineTotal is a COMPUTED column -> read-only, must not be saved by the builder (IsSave=false).
   ===================================================================================== */
IF OBJECT_ID(N'dbo.TST_Order', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_Order
    (
        OrderID     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_Order PRIMARY KEY,
        CompCode    INT            NOT NULL,
        BranchCode  INT            NOT NULL,
        TrNo        INT            NULL,
        TrDate      DATE           NOT NULL CONSTRAINT DF_TST_Order_TrDate DEFAULT (CAST(GETDATE() AS DATE)),
        CustomerID  INT            NULL,
        WarehouseID INT            NULL,
        Status      INT            NOT NULL CONSTRAINT DF_TST_Order_Status DEFAULT (0),
        PaymentType INT            NOT NULL CONSTRAINT DF_TST_Order_PayType DEFAULT (0),
        Notes       NVARCHAR(500)  NULL,
        Total       DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_Order_Total DEFAULT (0),
        Discount    DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_Order_Discount DEFAULT (0),
        Net         DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_Order_Net DEFAULT (0),
        CreatedBy   NVARCHAR(100)  NULL,
        CreatedAt   DATETIME       NOT NULL CONSTRAINT DF_TST_Order_CreatedAt DEFAULT (GETDATE()),
        UpdatedBy   NVARCHAR(100)  NULL,
        UpdatedAt   DATETIME       NULL,
        CONSTRAINT FK_TST_Order_Customer  FOREIGN KEY (CustomerID)  REFERENCES dbo.TST_Customer (CustomerID),
        CONSTRAINT FK_TST_Order_Warehouse FOREIGN KEY (WarehouseID) REFERENCES dbo.TST_Warehouse (WarehouseID)
    );
    PRINT N'created TST_Order';
END
GO

IF OBJECT_ID(N'dbo.TST_OrderLine', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_OrderLine
    (
        LineID      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_OrderLine PRIMARY KEY,
        OrderID     INT            NOT NULL,
        ItemID      INT            NOT NULL,
        Qty         DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_OrderLine_Qty DEFAULT (1),
        UnitPrice   DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_OrderLine_Price DEFAULT (0),
        DiscountPrc DECIMAL(5,2)   NOT NULL CONSTRAINT DF_TST_OrderLine_Disc DEFAULT (0),
        LineTotal   AS (CONVERT(DECIMAL(18,3), [Qty] * [UnitPrice] * (1 - [DiscountPrc] / 100.0))),
        Notes       NVARCHAR(300)  NULL,
        CONSTRAINT FK_TST_OrderLine_Order FOREIGN KEY (OrderID) REFERENCES dbo.TST_Order (OrderID),
        CONSTRAINT FK_TST_OrderLine_Item  FOREIGN KEY (ItemID)  REFERENCES dbo.TST_Item (ItemID)
    );
    PRINT N'created TST_OrderLine';
END
GO

IF OBJECT_ID(N'dbo.TST_OrderPayment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_OrderPayment
    (
        PaymentID   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_OrderPayment PRIMARY KEY,
        OrderID     INT            NOT NULL,
        PayDate     DATE           NOT NULL CONSTRAINT DF_TST_OrderPayment_Date DEFAULT (CAST(GETDATE() AS DATE)),
        Method      INT            NOT NULL CONSTRAINT DF_TST_OrderPayment_Method DEFAULT (0),   -- 0 cash / 1 card / 2 transfer / 3 cheque
        Amount      DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_OrderPayment_Amount DEFAULT (0),
        Notes       NVARCHAR(300)  NULL,
        CONSTRAINT FK_TST_OrderPayment_Order FOREIGN KEY (OrderID) REFERENCES dbo.TST_Order (OrderID)
    );
    PRINT N'created TST_OrderPayment';
END
GO

CREATE OR ALTER VIEW dbo.IQ_TST_Order
AS
SELECT  o.OrderID, o.CompCode, o.BranchCode, o.TrNo, o.TrDate,
        o.CustomerID,  c.Code AS CustomerCode, c.NameA AS CustomerNameA, c.NameE AS CustomerNameE,
        c.Phone AS CustomerPhone, c.City AS CustomerCity,
        o.WarehouseID, w.Code AS WarehouseCode, w.NameA AS WarehouseNameA, w.NameE AS WarehouseNameE,
        o.Status,
        CASE o.Status WHEN 0 THEN N'مسودة' WHEN 1 THEN N'مرحّل' WHEN 2 THEN N'ملغي'     ELSE N'' END AS StatusTextA,
        CASE o.Status WHEN 0 THEN N'Draft' WHEN 1 THEN N'Posted' WHEN 2 THEN N'Cancelled' ELSE N'' END AS StatusTextE,
        o.PaymentType,
        CASE o.PaymentType WHEN 0 THEN N'نقدي' WHEN 1 THEN N'آجل'   WHEN 2 THEN N'بطاقة' ELSE N'' END AS PaymentTypeTextA,
        CASE o.PaymentType WHEN 0 THEN N'Cash' WHEN 1 THEN N'Credit' WHEN 2 THEN N'Card'  ELSE N'' END AS PaymentTypeTextE,
        o.Notes, o.Total, o.Discount, o.Net,
        ISNULL(p.PaidAmount, 0)               AS PaidAmount,
        o.Net - ISNULL(p.PaidAmount, 0)       AS RemainAmount,
        o.CreatedBy, o.CreatedAt, o.UpdatedBy, o.UpdatedAt
FROM    dbo.TST_Order o
        LEFT JOIN dbo.TST_Customer  c ON c.CustomerID  = o.CustomerID
        LEFT JOIN dbo.TST_Warehouse w ON w.WarehouseID = o.WarehouseID
        LEFT JOIN (SELECT OrderID, SUM(Amount) AS PaidAmount FROM dbo.TST_OrderPayment GROUP BY OrderID) p ON p.OrderID = o.OrderID;
GO

CREATE OR ALTER VIEW dbo.IQ_TST_OrderLine
AS
SELECT  l.LineID, l.OrderID, o.CompCode, o.BranchCode, o.TrNo, o.TrDate,
        l.ItemID, i.Code AS ItemCode, i.NameA AS ItemNameA, i.NameE AS ItemNameE, i.Barcode,
        i.CategoryID, i.UnitID, u.NameA AS UnitNameA, u.NameE AS UnitNameE,
        l.Qty, l.UnitPrice, l.DiscountPrc, l.LineTotal, l.Notes
FROM    dbo.TST_OrderLine l
        JOIN dbo.TST_Order o ON o.OrderID = l.OrderID
        LEFT JOIN dbo.TST_Item i ON i.ItemID = l.ItemID
        LEFT JOIN dbo.TST_Unit u ON u.UnitID = i.UnitID;
GO

CREATE OR ALTER VIEW dbo.IQ_TST_OrderPayment
AS
SELECT  p.PaymentID, p.OrderID, o.CompCode, o.BranchCode, o.TrNo, p.PayDate, p.Method,
        CASE p.Method WHEN 0 THEN N'نقدي' WHEN 1 THEN N'بطاقة' WHEN 2 THEN N'تحويل' WHEN 3 THEN N'شيك'   ELSE N'' END AS MethodTextA,
        CASE p.Method WHEN 0 THEN N'Cash' WHEN 1 THEN N'Card'  WHEN 2 THEN N'Transfer' WHEN 3 THEN N'Cheque' ELSE N'' END AS MethodTextE,
        p.Amount, p.Notes
FROM    dbo.TST_OrderPayment p
        JOIN dbo.TST_Order o ON o.OrderID = p.OrderID;
GO

/* =====================================================================================
   4) OPENING BALANCE TARGETS (Excel multiTransaction / detailsOnly)  -- left EMPTY on purpose
   ===================================================================================== */
IF OBJECT_ID(N'dbo.TST_OpeningStock', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_OpeningStock
    (
        OpeningID   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_OpeningStock PRIMARY KEY,
        CompCode    INT            NOT NULL,
        BranchCode  INT            NOT NULL,
        WarehouseID INT            NOT NULL,
        TrNo        INT            NULL,
        TrDate      DATE           NOT NULL CONSTRAINT DF_TST_OpeningStock_Date DEFAULT (CAST(GETDATE() AS DATE)),
        Notes       NVARCHAR(500)  NULL,
        CreatedBy   NVARCHAR(100)  NULL,
        CreatedAt   DATETIME       NOT NULL CONSTRAINT DF_TST_OpeningStock_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_TST_OpeningStock_Warehouse FOREIGN KEY (WarehouseID) REFERENCES dbo.TST_Warehouse (WarehouseID)
    );
    PRINT N'created TST_OpeningStock';
END
GO

IF OBJECT_ID(N'dbo.TST_OpeningStockLine', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TST_OpeningStockLine
    (
        LineID      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TST_OpeningStockLine PRIMARY KEY,
        OpeningID   INT            NOT NULL,
        ItemID      INT            NOT NULL,
        Qty         DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_OpeningStockLine_Qty DEFAULT (0),
        Cost        DECIMAL(18,3)  NOT NULL CONSTRAINT DF_TST_OpeningStockLine_Cost DEFAULT (0),
        TotalCost   AS (CONVERT(DECIMAL(18,3), [Qty] * [Cost])),
        CONSTRAINT FK_TST_OpeningStockLine_Master FOREIGN KEY (OpeningID) REFERENCES dbo.TST_OpeningStock (OpeningID),
        CONSTRAINT FK_TST_OpeningStockLine_Item   FOREIGN KEY (ItemID)    REFERENCES dbo.TST_Item (ItemID)
    );
    PRINT N'created TST_OpeningStockLine';
END
GO

CREATE OR ALTER VIEW dbo.IQ_TST_OpeningStock
AS
SELECT  s.OpeningID, s.CompCode, s.BranchCode, s.WarehouseID, w.Code AS WarehouseCode, w.NameA AS WarehouseNameA, w.NameE AS WarehouseNameE,
        s.TrNo, s.TrDate, s.Notes, s.CreatedBy, s.CreatedAt
FROM    dbo.TST_OpeningStock s
        LEFT JOIN dbo.TST_Warehouse w ON w.WarehouseID = s.WarehouseID;
GO

CREATE OR ALTER VIEW dbo.IQ_TST_OpeningStockLine
AS
SELECT  l.LineID, l.OpeningID, s.CompCode, s.BranchCode, l.ItemID, i.Code AS ItemCode, i.NameA AS ItemNameA, i.NameE AS ItemNameE,
        l.Qty, l.Cost, l.TotalCost
FROM    dbo.TST_OpeningStockLine l
        JOIN dbo.TST_OpeningStock s ON s.OpeningID = l.OpeningID
        LEFT JOIN dbo.TST_Item i ON i.ItemID = l.ItemID;
GO

/* =====================================================================================
   8) INDEXES  (created before the seed so that FK/lookup joins are fast)
   ===================================================================================== */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Category_Comp_Parent' AND object_id = OBJECT_ID(N'dbo.TST_Category'))
    CREATE INDEX IX_TST_Category_Comp_Parent ON dbo.TST_Category (CompCode, ParentID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_TST_Category_Comp_Code' AND object_id = OBJECT_ID(N'dbo.TST_Category'))
    CREATE UNIQUE INDEX UX_TST_Category_Comp_Code ON dbo.TST_Category (CompCode, Code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Unit_Comp' AND object_id = OBJECT_ID(N'dbo.TST_Unit'))
    CREATE INDEX IX_TST_Unit_Comp ON dbo.TST_Unit (CompCode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Warehouse_Comp_Branch' AND object_id = OBJECT_ID(N'dbo.TST_Warehouse'))
    CREATE INDEX IX_TST_Warehouse_Comp_Branch ON dbo.TST_Warehouse (CompCode, BranchCode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_TST_Customer_Comp_Code' AND object_id = OBJECT_ID(N'dbo.TST_Customer'))
    CREATE UNIQUE INDEX UX_TST_Customer_Comp_Code ON dbo.TST_Customer (CompCode, Code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_TST_Item_Comp_Code' AND object_id = OBJECT_ID(N'dbo.TST_Item'))
    CREATE UNIQUE INDEX UX_TST_Item_Comp_Code ON dbo.TST_Item (CompCode, Code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Item_Comp_Category' AND object_id = OBJECT_ID(N'dbo.TST_Item'))
    CREATE INDEX IX_TST_Item_Comp_Category ON dbo.TST_Item (CompCode, CategoryID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Item_Barcode' AND object_id = OBJECT_ID(N'dbo.TST_Item'))
    CREATE INDEX IX_TST_Item_Barcode ON dbo.TST_Item (Barcode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Expense_Comp_Branch_Date' AND object_id = OBJECT_ID(N'dbo.TST_Expense'))
    CREATE INDEX IX_TST_Expense_Comp_Branch_Date ON dbo.TST_Expense (CompCode, BranchCode, ExpenseDate) INCLUDE (Amount, Status, CategoryID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Expense_Category' AND object_id = OBJECT_ID(N'dbo.TST_Expense'))
    CREATE INDEX IX_TST_Expense_Category ON dbo.TST_Expense (CategoryID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Expense_Status' AND object_id = OBJECT_ID(N'dbo.TST_Expense'))
    CREATE INDEX IX_TST_Expense_Status ON dbo.TST_Expense (CompCode, Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Order_Comp_Branch_Date' AND object_id = OBJECT_ID(N'dbo.TST_Order'))
    CREATE INDEX IX_TST_Order_Comp_Branch_Date ON dbo.TST_Order (CompCode, BranchCode, TrDate) INCLUDE (Status, CustomerID, Net);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Order_Customer' AND object_id = OBJECT_ID(N'dbo.TST_Order'))
    CREATE INDEX IX_TST_Order_Customer ON dbo.TST_Order (CustomerID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_Order_Status' AND object_id = OBJECT_ID(N'dbo.TST_Order'))
    CREATE INDEX IX_TST_Order_Status ON dbo.TST_Order (CompCode, BranchCode, Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_TST_Order_Comp_Branch_TrNo' AND object_id = OBJECT_ID(N'dbo.TST_Order'))
    CREATE UNIQUE INDEX UX_TST_Order_Comp_Branch_TrNo ON dbo.TST_Order (CompCode, BranchCode, TrNo) WHERE TrNo IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_OrderLine_Order' AND object_id = OBJECT_ID(N'dbo.TST_OrderLine'))
    CREATE INDEX IX_TST_OrderLine_Order ON dbo.TST_OrderLine (OrderID) INCLUDE (ItemID, Qty, UnitPrice, DiscountPrc);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_OrderLine_Item' AND object_id = OBJECT_ID(N'dbo.TST_OrderLine'))
    CREATE INDEX IX_TST_OrderLine_Item ON dbo.TST_OrderLine (ItemID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_OrderPayment_Order' AND object_id = OBJECT_ID(N'dbo.TST_OrderPayment'))
    CREATE INDEX IX_TST_OrderPayment_Order ON dbo.TST_OrderPayment (OrderID) INCLUDE (PayDate, Amount);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_OpeningStock_Comp_Branch_Date' AND object_id = OBJECT_ID(N'dbo.TST_OpeningStock'))
    CREATE INDEX IX_TST_OpeningStock_Comp_Branch_Date ON dbo.TST_OpeningStock (CompCode, BranchCode, TrDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TST_OpeningStockLine_Opening' AND object_id = OBJECT_ID(N'dbo.TST_OpeningStockLine'))
    CREATE INDEX IX_TST_OpeningStockLine_Opening ON dbo.TST_OpeningStockLine (OpeningID);
GO

/* =====================================================================================
   7) SEED DATA  (deterministic, set-based; each block runs only if its table is empty)
   ===================================================================================== */

-- 7.1 Categories : 3 levels, 12 nodes (3 + 5 + 4). Leaves: BEV-HOT, BEV-COLD, FOOD-SNK, PHN-ACC, HOME-KIT, CLOT-MEN
IF NOT EXISTS (SELECT 1 FROM dbo.TST_Category)
BEGIN
    INSERT dbo.TST_Category (CompCode, ParentID, Code, NameA, NameE, [Level], IsActive)
    VALUES (1, NULL, N'FOOD', N'أغذية ومشروبات', N'Food & Beverage', 1, 1),
           (1, NULL, N'ELEC', N'إلكترونيات',      N'Electronics',     1, 1),
           (1, NULL, N'CLOT', N'ملابس',           N'Clothing',        1, 1);

    INSERT dbo.TST_Category (CompCode, ParentID, Code, NameA, NameE, [Level], IsActive)
    SELECT 1, p.CategoryID, v.Code, v.NameA, v.NameE, 2, 1
    FROM (VALUES (N'FOOD-BEV', N'FOOD', N'مشروبات',         N'Beverages'),
                 (N'FOOD-SNK', N'FOOD', N'وجبات خفيفة',     N'Snacks'),
                 (N'ELEC-PHN', N'ELEC', N'الموبايلات',      N'Phones'),
                 (N'ELEC-HOME',N'ELEC', N'أجهزة منزلية',    N'Home Appliances'),
                 (N'CLOT-MEN', N'CLOT', N'ملابس رجالي',     N'Men Wear')) v(Code, ParentCode, NameA, NameE)
         JOIN dbo.TST_Category p ON p.CompCode = 1 AND p.Code = v.ParentCode;

    INSERT dbo.TST_Category (CompCode, ParentID, Code, NameA, NameE, [Level], IsActive)
    SELECT 1, p.CategoryID, v.Code, v.NameA, v.NameE, 3, 1
    FROM (VALUES (N'BEV-HOT',  N'FOOD-BEV',  N'مشروبات ساخنة',   N'Hot Drinks'),
                 (N'BEV-COLD', N'FOOD-BEV',  N'مشروبات باردة',   N'Cold Drinks'),
                 (N'PHN-ACC',  N'ELEC-PHN',  N'إكسسوارات موبايل',N'Phone Accessories'),
                 (N'HOME-KIT', N'ELEC-HOME', N'أدوات مطبخ',      N'Kitchen Tools')) v(Code, ParentCode, NameA, NameE)
         JOIN dbo.TST_Category p ON p.CompCode = 1 AND p.Code = v.ParentCode;
END
GO

-- 7.2 Units (4)
IF NOT EXISTS (SELECT 1 FROM dbo.TST_Unit)
    INSERT dbo.TST_Unit (CompCode, Code, NameA, NameE, IsActive)
    VALUES (1, N'PCS', N'قطعة', N'Piece', 1),
           (1, N'BOX', N'علبة', N'Box',   1),
           (1, N'KG',  N'كيلو', N'Kilogram', 1),
           (1, N'LTR', N'لتر',  N'Liter', 1);
GO

-- 7.3 Warehouses (3): two in branch 1, one in branch 2
IF NOT EXISTS (SELECT 1 FROM dbo.TST_Warehouse)
    INSERT dbo.TST_Warehouse (CompCode, BranchCode, Code, NameA, NameE, IsActive)
    VALUES (1, 1, N'WH01', N'المخزن الرئيسي',    N'Main Warehouse',   1),
           (1, 1, N'WH02', N'مخزن المعرض',       N'Showroom Warehouse', 1),
           (1, 2, N'WH03', N'مخزن الفرع الثاني', N'Branch 2 Warehouse', 1);
GO

-- 7.4 Customers (40) : 10 first names x 4 family names
IF NOT EXISTS (SELECT 1 FROM dbo.TST_Customer)
BEGIN
    ;WITH N AS (SELECT TOP (40) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.all_objects a CROSS JOIN sys.all_objects b),
    F AS (SELECT * FROM (VALUES (0,N'أحمد',N'Ahmed'),(1,N'محمد',N'Mohamed'),(2,N'محمود',N'Mahmoud'),(3,N'مصطفى',N'Mostafa'),(4,N'علي',N'Ali'),
                                (5,N'حسن',N'Hassan'),(6,N'إبراهيم',N'Ibrahim'),(7,N'يوسف',N'Youssef'),(8,N'خالد',N'Khaled'),(9,N'عمر',N'Omar')) x(i,A,E)),
    L AS (SELECT * FROM (VALUES (0,N'الشريف',N'El-Sherif'),(1,N'السيد',N'El-Sayed'),(2,N'منصور',N'Mansour'),(3,N'عبد الله',N'Abdallah')) x(i,A,E)),
    C AS (SELECT * FROM (VALUES (0,N'القاهرة'),(1,N'الجيزة'),(2,N'الإسكندرية'),(3,N'المنصورة'),(4,N'أسيوط')) x(i,A))
    INSERT dbo.TST_Customer (CompCode, Code, NameA, NameE, Phone, Email, CreditLimit, City, IsActive)
    SELECT 1,
           N'C' + RIGHT(N'000' + CAST(N.n AS NVARCHAR(10)), 3),
           F.A + N' ' + L.A,
           F.E + N' ' + L.E,
           N'010' + RIGHT(N'00000000' + CAST(10000000 + (N.n * 7919) % 90000000 AS NVARCHAR(12)), 8),
           N'cust' + CAST(N.n AS NVARCHAR(10)) + N'@test.local',
           CAST(5000 * (1 + N.n % 10) AS DECIMAL(18,2)),
           C.A,
           CASE WHEN N.n % 17 = 0 THEN 0 ELSE 1 END
    FROM N
         JOIN F ON F.i = (N.n - 1) % 10
         JOIN L ON L.i = ((N.n - 1) / 10) % 4
         JOIN C ON C.i = N.n % 5;
END
GO

-- 7.5 Items (200) on the 6 leaf categories
IF NOT EXISTS (SELECT 1 FROM dbo.TST_Item)
BEGIN
    ;WITH N AS (SELECT TOP (200) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.all_objects a CROSS JOIN sys.all_objects b),
    T AS (SELECT * FROM (VALUES (N'BEV-COLD',N'مشروب بارد',N'Cold drink'),(N'BEV-HOT',N'مشروب ساخن',N'Hot drink'),(N'CLOT-MEN',N'ملابس رجالي',N'Men wear'),
                                (N'FOOD-SNK',N'وجبة خفيفة',N'Snack'),(N'HOME-KIT',N'أداة مطبخ',N'Kitchen tool'),(N'PHN-ACC',N'إكسسوار موبايل',N'Phone accessory')) x(Code,A,E)),
    Leaf AS (SELECT c.CategoryID, c.Code, ROW_NUMBER() OVER (ORDER BY c.Code) AS rn
             FROM dbo.TST_Category c
             WHERE c.CompCode = 1 AND NOT EXISTS (SELECT 1 FROM dbo.TST_Category x WHERE x.ParentID = c.CategoryID)),
    U AS (SELECT UnitID, ROW_NUMBER() OVER (ORDER BY UnitID) AS rn FROM dbo.TST_Unit WHERE CompCode = 1),
    V AS (SELECT * FROM (VALUES (0,N'ممتاز',N'Premium'),(1,N'عادي',N'Regular'),(2,N'فاخر',N'Deluxe'),(3,N'اقتصادي',N'Economy')) x(i,A,E))
    INSERT dbo.TST_Item (CompCode, Code, NameA, NameE, CategoryID, UnitID, Price, Cost, Barcode, IsActive)
    SELECT 1,
           N'IT' + RIGHT(N'0000' + CAST(N.n AS NVARCHAR(10)), 4),
           T.A + N' ' + V.A + N' ' + CAST(N.n AS NVARCHAR(10)),
           T.E + N' ' + V.E + N' ' + CAST(N.n AS NVARCHAR(10)),
           Leaf.CategoryID,
           U.UnitID,
           CAST(5 + ((CHECKSUM(N.n * 7919) & 2147483647) % 99500) / 100.0 AS DECIMAL(18,3)),
           CAST((5 + ((CHECKSUM(N.n * 7919) & 2147483647) % 99500) / 100.0) * 0.7 AS DECIMAL(18,3)),
           N'62200' + RIGHT(N'00000000' + CAST(N.n AS NVARCHAR(10)), 8),
           CASE WHEN N.n % 23 = 0 THEN 0 ELSE 1 END
    FROM N
         JOIN Leaf ON Leaf.rn = 1 + N.n % 6
         JOIN T ON T.Code = Leaf.Code
         JOIN U ON U.rn = 1 + N.n % 4
         JOIN V ON V.i = N.n % 4;
END
GO

-- 7.6 Expenses (~1500, 2025-01-01 .. 2026-10-31, branches 1/2, 1 of 3 without item)
IF NOT EXISTS (SELECT 1 FROM dbo.TST_Expense)
BEGIN
    DECLARE @custCnt INT = (SELECT COUNT(*) FROM dbo.TST_Customer WHERE CompCode = 1);
    DECLARE @itemCnt INT = (SELECT COUNT(*) FROM dbo.TST_Item WHERE CompCode = 1);
    ;WITH N AS (SELECT TOP (1500) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.all_objects a CROSS JOIN sys.all_objects b),
    Cu AS (SELECT CustomerID, ROW_NUMBER() OVER (ORDER BY CustomerID) AS rn FROM dbo.TST_Customer WHERE CompCode = 1),
    It AS (SELECT ItemID, CategoryID, ROW_NUMBER() OVER (ORDER BY ItemID) AS rn FROM dbo.TST_Item WHERE CompCode = 1),
    Cat AS (SELECT CategoryID, ROW_NUMBER() OVER (ORDER BY CategoryID) AS rn FROM dbo.TST_Category WHERE CompCode = 1)
    INSERT dbo.TST_Expense (CompCode, BranchCode, ExpenseDate, Amount, CategoryID, ItemID, CustomerID, Notes, Status, CreatedBy, CreatedAt)
    SELECT 1,
           1 + N.n % 2,
           DATEADD(DAY, (N.n - 1) * 669 / 1499, CAST('20250101' AS DATE)),
           CAST(20 + ((CHECKSUM(N.n * 104729) & 2147483647) % 300000) / 100.0 AS DECIMAL(18,3)),
           COALESCE(It.CategoryID, Cat.CategoryID),
           It.ItemID,
           CASE WHEN N.n % 4 = 0 THEN NULL ELSE Cu.CustomerID END,
           N'مصروف تجريبي رقم ' + CAST(N.n AS NVARCHAR(10)) + N' / Test expense #' + CAST(N.n AS NVARCHAR(10)),
           CASE WHEN N.n % 13 = 0 THEN 2 WHEN N.n % 5 = 0 THEN 0 ELSE 1 END,
           N'seed',
           DATEADD(DAY, (N.n - 1) * 669 / 1499, CAST('20250101' AS DATETIME))
    FROM N
         LEFT JOIN Cu  ON Cu.rn  = 1 + (N.n * 7) % @custCnt
         LEFT JOIN It  ON It.rn  = 1 + (N.n * 11) % @itemCnt AND N.n % 3 <> 0
         JOIN Cat ON Cat.rn = 1 + N.n % 12;
END
GO

-- 7.7 Orders (600): status 20% draft (no TrNo yet), 10% cancelled, 70% posted
IF NOT EXISTS (SELECT 1 FROM dbo.TST_Order)
BEGIN
    DECLARE @custCnt INT = (SELECT COUNT(*) FROM dbo.TST_Customer WHERE CompCode = 1);
    DECLARE @wh1 INT = (SELECT WarehouseID FROM dbo.TST_Warehouse WHERE CompCode = 1 AND Code = N'WH01');
    DECLARE @wh2 INT = (SELECT WarehouseID FROM dbo.TST_Warehouse WHERE CompCode = 1 AND Code = N'WH02');
    DECLARE @wh3 INT = (SELECT WarehouseID FROM dbo.TST_Warehouse WHERE CompCode = 1 AND Code = N'WH03');
    ;WITH N AS (SELECT TOP (600) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.all_objects a CROSS JOIN sys.all_objects b),
    Cu AS (SELECT CustomerID, ROW_NUMBER() OVER (ORDER BY CustomerID) AS rn FROM dbo.TST_Customer WHERE CompCode = 1),
    B AS (SELECT n, 1 + n % 2 AS br,
                 CASE WHEN n % 10 IN (0, 1) THEN 0 WHEN n % 10 = 9 THEN 2 ELSE 1 END AS st
          FROM N),
    X AS (SELECT B.*, ROW_NUMBER() OVER (PARTITION BY br ORDER BY n) AS seqNo FROM B)
    INSERT dbo.TST_Order (CompCode, BranchCode, TrNo, TrDate, CustomerID, WarehouseID, Status, PaymentType, Notes, Total, Discount, Net, CreatedBy, CreatedAt)
    SELECT 1, X.br,
           CASE WHEN X.st = 0 THEN NULL ELSE X.seqNo END,
           DATEADD(DAY, (X.n - 1) * 669 / 599, CAST('20250101' AS DATE)),
           Cu.CustomerID,
           CASE WHEN X.br = 2 THEN @wh3 WHEN X.n % 4 = 0 THEN @wh1 ELSE @wh2 END,
           X.st,
           X.n % 3,
           N'طلب تجريبي ' + CAST(X.n AS NVARCHAR(10)) + N' / Test order ' + CAST(X.n AS NVARCHAR(10)),
           0, 0, 0,
           N'seed',
           DATEADD(DAY, (X.n - 1) * 669 / 599, CAST('20250101' AS DATETIME))
    FROM X
         JOIN Cu ON Cu.rn = 1 + (X.n * 7) % @custCnt
    ORDER BY X.n;
END
GO

-- 7.8 Order lines (1..8 per order) + totals
IF NOT EXISTS (SELECT 1 FROM dbo.TST_OrderLine)
BEGIN
    DECLARE @itemCnt INT = (SELECT COUNT(*) FROM dbo.TST_Item WHERE CompCode = 1);
    ;WITH K AS (SELECT * FROM (VALUES (1),(2),(3),(4),(5),(6),(7),(8)) x(k)),
    O AS (SELECT OrderID, ROW_NUMBER() OVER (ORDER BY OrderID) AS rn FROM dbo.TST_Order WHERE CompCode = 1),
    It AS (SELECT ItemID, Price, ROW_NUMBER() OVER (ORDER BY ItemID) AS rn FROM dbo.TST_Item WHERE CompCode = 1)
    INSERT dbo.TST_OrderLine (OrderID, ItemID, Qty, UnitPrice, DiscountPrc, Notes)
    SELECT O.OrderID, It.ItemID,
           CAST(1 + (O.rn * K.k * 3) % 9 AS DECIMAL(18,3)),
           It.Price,
           CAST(CASE (O.rn + K.k) % 5 WHEN 0 THEN 5 WHEN 1 THEN 10 ELSE 0 END AS DECIMAL(5,2)),
           NULL
    FROM O
         JOIN K ON K.k <= 1 + (O.rn * 5) % 8
         JOIN It ON It.rn = 1 + (O.rn * 13 + K.k * 29) % @itemCnt
    ORDER BY O.OrderID, K.k;

    UPDATE o
       SET Total    = s.T,
           Discount = CASE WHEN o.OrderID % 4 = 0 THEN CAST(ROUND(s.T * 0.05, 3) AS DECIMAL(18,3)) ELSE 0 END
    FROM dbo.TST_Order o
         JOIN (SELECT OrderID, SUM(LineTotal) AS T FROM dbo.TST_OrderLine GROUP BY OrderID) s ON s.OrderID = o.OrderID;

    UPDATE dbo.TST_Order SET Net = Total - Discount;
END
GO

-- 7.9 Payments (0..2) on posted orders only
IF NOT EXISTS (SELECT 1 FROM dbo.TST_OrderPayment)
BEGIN
    ;WITH K AS (SELECT * FROM (VALUES (1),(2)) x(k)),
    O AS (SELECT OrderID, TrDate, PaymentType, Net, ROW_NUMBER() OVER (ORDER BY OrderID) AS rn
          FROM dbo.TST_Order WHERE CompCode = 1 AND Status = 1)
    INSERT dbo.TST_OrderPayment (OrderID, PayDate, Method, Amount, Notes)
    SELECT O.OrderID,
           DATEADD(DAY, K.k * 3, O.TrDate),
           (O.rn + K.k) % 4,
           CAST(CASE WHEN O.rn % 3 = 1 THEN O.Net * CASE WHEN O.PaymentType = 1 THEN 0.5 ELSE 1.0 END
                     WHEN K.k = 1 THEN O.Net * 0.6
                     ELSE O.Net * 0.4 END AS DECIMAL(18,3)),
           N'دفعة ' + CAST(K.k AS NVARCHAR(5)) + N' / Payment ' + CAST(K.k AS NVARCHAR(5))
    FROM O
         JOIN K ON (O.rn % 3 = 1 AND K.k = 1) OR (O.rn % 3 = 2);
END
GO

/* =====================================================================================
   5) REPORT PROCEDURES (read-only SELECTs; first result set = Data, then Data2, Data3...)
   ===================================================================================== */

-- 5.1 Flat list (ungrouped list report). Filters: branch / dates / customer / status.
CREATE OR ALTER PROCEDURE dbo.TST_Rpt_OrderList
    @CompCode   INT,
    @BranchCode INT  = NULL,
    @FromDate   DATE = NULL,
    @ToDate     DATE = NULL,
    @CustomerID INT  = NULL,
    @Status     INT  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT  OrderID, BranchCode, TrNo, TrDate, CustomerCode, CustomerNameA, CustomerNameE, WarehouseNameA, WarehouseNameE,
            Status, StatusTextA, StatusTextE, PaymentTypeTextA, PaymentTypeTextE,
            Total, Discount, Net, PaidAmount, RemainAmount, Notes
    FROM    dbo.IQ_TST_Order
    WHERE   CompCode = @CompCode
        AND (@BranchCode IS NULL OR BranchCode = @BranchCode)
        AND (@FromDate   IS NULL OR TrDate >= @FromDate)
        AND (@ToDate     IS NULL OR TrDate <= @ToDate)
        AND (@CustomerID IS NULL OR CustomerID = @CustomerID)
        AND (@Status     IS NULL OR Status = @Status)
    ORDER BY TrDate, BranchCode, OrderID;
END
GO

-- 5.2 Sales by category > item (posted orders). Group by TopCategory / Category, subtotals Qty + Amount, chart on Amount.
CREATE OR ALTER PROCEDURE dbo.TST_Rpt_SalesByCategory
    @CompCode INT,
    @FromDate DATE = NULL,
    @ToDate   DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT  COALESCE(g.CategoryID, p.CategoryID, c.CategoryID)  AS TopCategoryID,
            COALESCE(g.NameA, p.NameA, c.NameA)                 AS TopCategoryNameA,
            COALESCE(g.NameE, p.NameE, c.NameE)                 AS TopCategoryNameE,
            c.CategoryID, c.Code AS CategoryCode, c.NameA AS CategoryNameA, c.NameE AS CategoryNameE,
            i.ItemID, i.Code AS ItemCode, i.NameA AS ItemNameA, i.NameE AS ItemNameE,
            SUM(l.Qty)                    AS Qty,
            SUM(l.LineTotal)              AS Amount,
            COUNT(DISTINCT o.OrderID)     AS OrdersCount
    FROM    dbo.TST_OrderLine l
            JOIN dbo.TST_Order    o ON o.OrderID    = l.OrderID
            JOIN dbo.TST_Item     i ON i.ItemID     = l.ItemID
            JOIN dbo.TST_Category c ON c.CategoryID = i.CategoryID
            LEFT JOIN dbo.TST_Category p ON p.CategoryID = c.ParentID
            LEFT JOIN dbo.TST_Category g ON g.CategoryID = p.ParentID
    WHERE   o.CompCode = @CompCode AND o.Status = 1
        AND (@FromDate IS NULL OR o.TrDate >= @FromDate)
        AND (@ToDate   IS NULL OR o.TrDate <= @ToDate)
    GROUP BY COALESCE(g.CategoryID, p.CategoryID, c.CategoryID), COALESCE(g.NameA, p.NameA, c.NameA), COALESCE(g.NameE, p.NameE, c.NameE),
             c.CategoryID, c.Code, c.NameA, c.NameE, i.ItemID, i.Code, i.NameA, i.NameE
    ORDER BY TopCategoryNameA, CategoryNameA, ItemCode;

    -- Data2: إجمالي جاهز لكل فئة رئيسية (للرسم البياني — Stimulsoft مابيجمعش القيم المتكررة لوحده)
    SELECT  COALESCE(g.CategoryID, p.CategoryID, c.CategoryID)  AS TopCategoryID,
            COALESCE(g.NameA, p.NameA, c.NameA)                 AS TopCategoryNameA,
            COALESCE(g.NameE, p.NameE, c.NameE)                 AS TopCategoryNameE,
            SUM(l.Qty)       AS Qty,
            SUM(l.LineTotal) AS Amount
    FROM    dbo.TST_OrderLine l
            JOIN dbo.TST_Order    o ON o.OrderID    = l.OrderID
            JOIN dbo.TST_Item     i ON i.ItemID     = l.ItemID
            JOIN dbo.TST_Category c ON c.CategoryID = i.CategoryID
            LEFT JOIN dbo.TST_Category p ON p.CategoryID = c.ParentID
            LEFT JOIN dbo.TST_Category g ON g.CategoryID = p.ParentID
    WHERE   o.CompCode = @CompCode AND o.Status = 1
        AND (@FromDate IS NULL OR o.TrDate >= @FromDate)
        AND (@ToDate   IS NULL OR o.TrDate <= @ToDate)
    GROUP BY COALESCE(g.CategoryID, p.CategoryID, c.CategoryID), COALESCE(g.NameA, p.NameA, c.NameA), COALESCE(g.NameE, p.NameE, c.NameE)
    ORDER BY Amount DESC;
END
GO

-- 5.3 Customer statement with running balance (group by customer). Posted orders = debit, their payments = credit.
--     @CustomerID NULL = all customers. Movements before @FromDate collapse into one OPEN row.
CREATE OR ALTER PROCEDURE dbo.TST_Rpt_CustomerStatement
    @CompCode   INT,
    @CustomerID INT  = NULL,
    @FromDate   DATE = NULL,
    @ToDate     DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @F DATE = ISNULL(@FromDate, CAST('19000101' AS DATE));
    DECLARE @T DATE = ISNULL(@ToDate,   CAST('29991231' AS DATE));

    ;WITH Mov AS (
        SELECT o.CustomerID, o.TrDate AS DocDate, 1 AS DocOrder, N'INV' AS DocType, o.OrderID AS DocID, o.TrNo AS DocNo,
               CAST(o.Net AS DECIMAL(18,3)) AS Debit, CAST(0 AS DECIMAL(18,3)) AS Credit
        FROM   dbo.TST_Order o
        WHERE  o.CompCode = @CompCode AND o.Status = 1 AND o.CustomerID IS NOT NULL
           AND (@CustomerID IS NULL OR o.CustomerID = @CustomerID) AND o.TrDate <= @T
        UNION ALL
        SELECT o.CustomerID, p.PayDate, 2, N'PAY', p.PaymentID, o.TrNo,
               CAST(0 AS DECIMAL(18,3)), CAST(p.Amount AS DECIMAL(18,3))
        FROM   dbo.TST_OrderPayment p
               JOIN dbo.TST_Order o ON o.OrderID = p.OrderID
        WHERE  o.CompCode = @CompCode AND o.Status = 1 AND o.CustomerID IS NOT NULL
           AND (@CustomerID IS NULL OR o.CustomerID = @CustomerID) AND p.PayDate <= @T
    ),
    Opening AS (
        SELECT CustomerID, SUM(Debit - Credit) AS Bal
        FROM   Mov WHERE DocDate < @F
        GROUP BY CustomerID HAVING SUM(Debit - Credit) <> 0
    ),
    R AS (
        SELECT CustomerID, @F AS DocDate, 0 AS DocOrder, N'OPEN' AS DocType, 0 AS DocID, CAST(NULL AS INT) AS DocNo,
               CAST(CASE WHEN Bal > 0 THEN Bal ELSE 0 END AS DECIMAL(18,3)) AS Debit,
               CAST(CASE WHEN Bal < 0 THEN -Bal ELSE 0 END AS DECIMAL(18,3)) AS Credit
        FROM   Opening
        UNION ALL
        SELECT CustomerID, DocDate, DocOrder, DocType, DocID, DocNo, Debit, Credit
        FROM   Mov WHERE DocDate >= @F
    )
    SELECT  r.CustomerID, c.Code AS CustomerCode, c.NameA AS CustomerNameA, c.NameE AS CustomerNameE, c.Phone AS CustomerPhone,
            r.DocDate AS TrDate, r.DocType,
            CASE r.DocType WHEN N'OPEN' THEN N'رصيد سابق' WHEN N'INV' THEN N'فاتورة' ELSE N'تحصيل' END AS DocTypeTextA,
            CASE r.DocType WHEN N'OPEN' THEN N'Opening'   WHEN N'INV' THEN N'Invoice' ELSE N'Payment' END AS DocTypeTextE,
            r.DocID, r.DocNo, r.Debit, r.Credit,
            SUM(r.Debit - r.Credit) OVER (PARTITION BY r.CustomerID ORDER BY r.DocDate, r.DocOrder, r.DocID
                                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS Balance
    FROM    R r
            JOIN dbo.TST_Customer c ON c.CustomerID = r.CustomerID
    ORDER BY c.Code, r.DocDate, r.DocOrder, r.DocID;
END
GO

-- 5.4 Transaction print : 3 result sets  Data = header, Data2 = lines, Data3 = payments.
CREATE OR ALTER PROCEDURE dbo.TST_Rpt_OrderPrint
    @CompCode   INT,
    @BranchCode INT,
    @TrID       INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Data : header (one row)
    SELECT  o.OrderID, o.CompCode, o.BranchCode, o.TrNo, o.TrDate,
            o.CustomerID, o.CustomerCode, o.CustomerNameA, o.CustomerNameE, o.CustomerPhone, o.CustomerCity,
            o.WarehouseNameA, o.WarehouseNameE, o.Status, o.StatusTextA, o.StatusTextE,
            o.PaymentTypeTextA, o.PaymentTypeTextE, o.Notes, o.Total, o.Discount, o.Net, o.PaidAmount, o.RemainAmount,
            CAST(ISNULL(o.TrNo, 0) AS NVARCHAR(20))                                                   AS BarcodeText,
            N'TSTORD|' + CAST(o.CompCode AS NVARCHAR(10)) + N'|' + CAST(o.BranchCode AS NVARCHAR(10))
                       + N'|' + CAST(ISNULL(o.TrNo, 0) AS NVARCHAR(20)) + N'|' + CONVERT(NVARCHAR(10), o.TrDate, 23)
                       + N'|' + CONVERT(NVARCHAR(40), o.Net)                                          AS QRText
    FROM    dbo.IQ_TST_Order o
    WHERE   o.OrderID = @TrID AND o.CompCode = @CompCode AND o.BranchCode = @BranchCode;

    -- Data2 : lines
    SELECT  ROW_NUMBER() OVER (ORDER BY l.LineID) AS Ser,
            l.LineID, l.OrderID, l.ItemCode, l.ItemNameA, l.ItemNameE, l.Barcode, l.UnitNameA, l.UnitNameE,
            l.Qty, l.UnitPrice, l.DiscountPrc, l.LineTotal
    FROM    dbo.IQ_TST_OrderLine l
    WHERE   l.OrderID = @TrID AND l.CompCode = @CompCode AND l.BranchCode = @BranchCode
    ORDER BY l.LineID;

    -- Data3 : payments
    SELECT  ROW_NUMBER() OVER (ORDER BY p.PaymentID) AS Ser,
            p.PaymentID, p.OrderID, p.PayDate, p.Method, p.MethodTextA, p.MethodTextE, p.Amount, p.Notes
    FROM    dbo.IQ_TST_OrderPayment p
    WHERE   p.OrderID = @TrID AND p.CompCode = @CompCode AND p.BranchCode = @BranchCode
    ORDER BY p.PaymentID;
END
GO

-- 5.5 Barcode labels (a parent category includes all its descendants)
CREATE OR ALTER PROCEDURE dbo.TST_Rpt_ItemsBarcode
    @CompCode   INT,
    @CategoryID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH Cats AS (
        SELECT CategoryID FROM dbo.TST_Category WHERE CompCode = @CompCode AND CategoryID = @CategoryID
        UNION ALL
        SELECT c.CategoryID FROM dbo.TST_Category c JOIN Cats p ON c.ParentID = p.CategoryID
    )
    SELECT  i.ItemID, i.Code AS ItemCode, i.NameA AS ItemNameA, i.NameE AS ItemNameE, i.Barcode, i.Price,
            c.NameA AS CategoryNameA, c.NameE AS CategoryNameE, u.NameA AS UnitNameA, u.NameE AS UnitNameE
    FROM    dbo.TST_Item i
            LEFT JOIN dbo.TST_Category c ON c.CategoryID = i.CategoryID
            LEFT JOIN dbo.TST_Unit     u ON u.UnitID     = i.UnitID
    WHERE   i.CompCode = @CompCode AND i.IsActive = 1 AND i.Barcode IS NOT NULL
        AND (@CategoryID IS NULL OR i.CategoryID IN (SELECT CategoryID FROM Cats))
    ORDER BY c.NameA, i.Code
    OPTION (MAXRECURSION 20);
END
GO

-- 5.6 Dashboard : always 12 rows (one per month) for a chart-only report
CREATE OR ALTER PROCEDURE dbo.TST_Rpt_Dashboard
    @CompCode INT,
    @Year     INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Y INT = ISNULL(@Year, YEAR(GETDATE()));
    SELECT  @Y AS ReportYear, m.MonthNo, m.MonthNameA, m.MonthNameE,
            ISNULL(s.OrdersCount, 0)  AS OrdersCount,
            ISNULL(s.SalesNet, 0)     AS SalesNet,
            ISNULL(pm.PaymentsTotal, 0) AS PaymentsTotal,
            ISNULL(ex.ExpensesTotal, 0) AS ExpensesTotal
    FROM    (VALUES (1,N'يناير',N'Jan'),(2,N'فبراير',N'Feb'),(3,N'مارس',N'Mar'),(4,N'أبريل',N'Apr'),(5,N'مايو',N'May'),(6,N'يونيو',N'Jun'),
                    (7,N'يوليو',N'Jul'),(8,N'أغسطس',N'Aug'),(9,N'سبتمبر',N'Sep'),(10,N'أكتوبر',N'Oct'),(11,N'نوفمبر',N'Nov'),(12,N'ديسمبر',N'Dec')) m(MonthNo, MonthNameA, MonthNameE)
            LEFT JOIN (SELECT MONTH(TrDate) AS MonthNo, COUNT(*) AS OrdersCount, SUM(Net) AS SalesNet
                       FROM dbo.TST_Order WHERE CompCode = @CompCode AND Status = 1 AND YEAR(TrDate) = @Y GROUP BY MONTH(TrDate)) s ON s.MonthNo = m.MonthNo
            LEFT JOIN (SELECT MONTH(p.PayDate) AS MonthNo, SUM(p.Amount) AS PaymentsTotal
                       FROM dbo.TST_OrderPayment p JOIN dbo.TST_Order o ON o.OrderID = p.OrderID
                       WHERE o.CompCode = @CompCode AND o.Status = 1 AND YEAR(p.PayDate) = @Y GROUP BY MONTH(p.PayDate)) pm ON pm.MonthNo = m.MonthNo
            LEFT JOIN (SELECT MONTH(ExpenseDate) AS MonthNo, SUM(Amount) AS ExpensesTotal
                       FROM dbo.TST_Expense WHERE CompCode = @CompCode AND Status <> 2 AND YEAR(ExpenseDate) = @Y GROUP BY MONTH(ExpenseDate)) ex ON ex.MonthNo = m.MonthNo
    ORDER BY m.MonthNo;
END
GO

/* =====================================================================================
   6) ACTION PROCEDURES FOR BUILDER BUTTONS  (write only to TST_ tables)
      Result contract (no OUTPUT params, so the builder can map every parameter):
        one row:  Ok (1 success / 0 failure), MsgA, MsgE, + extra info columns
      Params for buttons: @OrderID <- row / key column, @UserID <- session UserID.
   ===================================================================================== */

-- 6.1 Recalculate Total / Net from the lines (draft orders only)
CREATE OR ALTER PROCEDURE dbo.TST_Proc_RecalcOrder
    @OrderID INT,
    @UserID  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Status INT, @Disc DECIMAL(18,3), @Total DECIMAL(18,3), @Net DECIMAL(18,3);

    SELECT @Status = Status, @Disc = Discount FROM dbo.TST_Order WHERE OrderID = @OrderID;
    IF @Status IS NULL
    BEGIN
        SELECT 0 AS Ok, N'الطلب غير موجود' AS MsgA, N'Order not found' AS MsgE, CAST(NULL AS DECIMAL(18,3)) AS Total, CAST(NULL AS DECIMAL(18,3)) AS Net;
        RETURN;
    END
    IF @Status <> 0
    BEGIN
        SELECT 0 AS Ok, N'لا يمكن إعادة الحساب إلا للمسودة' AS MsgA, N'Only draft orders can be recalculated' AS MsgE, CAST(NULL AS DECIMAL(18,3)) AS Total, CAST(NULL AS DECIMAL(18,3)) AS Net;
        RETURN;
    END

    SELECT @Total = ISNULL(SUM(LineTotal), 0) FROM dbo.TST_OrderLine WHERE OrderID = @OrderID;
    SET @Net = CASE WHEN @Total - @Disc < 0 THEN 0 ELSE @Total - @Disc END;

    UPDATE dbo.TST_Order
       SET Total = @Total, Net = @Net, UpdatedBy = CAST(@UserID AS NVARCHAR(20)), UpdatedAt = GETDATE()
     WHERE OrderID = @OrderID;

    SELECT 1 AS Ok, N'تمت إعادة الحساب' AS MsgA, N'Recalculated' AS MsgE, @Total AS Total, @Net AS Net;
END
GO

-- 6.2 Post a draft order: validation + totals + TrNo (if still NULL) + Status = 1
CREATE OR ALTER PROCEDURE dbo.TST_Proc_PostOrder
    @OrderID INT,
    @UserID  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Own BIT = CASE WHEN @@TRANCOUNT = 0 THEN 1 ELSE 0 END;
    DECLARE @Comp INT, @Br INT, @Status INT, @Cust INT, @PayType INT, @TrNo INT, @Disc DECIMAL(18,3);
    DECLARE @Total DECIMAL(18,3), @Net DECIMAL(18,3), @Lines INT, @Limit DECIMAL(18,2), @Out DECIMAL(18,3);

    SELECT @Comp = CompCode, @Br = BranchCode, @Status = Status, @Cust = CustomerID, @PayType = PaymentType, @TrNo = TrNo, @Disc = Discount
    FROM dbo.TST_Order WHERE OrderID = @OrderID;

    IF @Comp IS NULL
    BEGIN
        SELECT 0 AS Ok, N'الطلب غير موجود' AS MsgA, N'Order not found' AS MsgE, CAST(NULL AS INT) AS TrNo; RETURN;
    END
    IF @Status <> 0
    BEGIN
        SELECT 0 AS Ok, N'الطلب ليس مسودة (مرحّل أو ملغي بالفعل)' AS MsgA, N'Order is not a draft (already posted or cancelled)' AS MsgE, @TrNo AS TrNo; RETURN;
    END
    IF @Cust IS NULL
    BEGIN
        SELECT 0 AS Ok, N'اختر العميل أولاً' AS MsgA, N'Customer is required' AS MsgE, @TrNo AS TrNo; RETURN;
    END

    SELECT @Lines = COUNT(*), @Total = ISNULL(SUM(LineTotal), 0) FROM dbo.TST_OrderLine WHERE OrderID = @OrderID;
    IF @Lines = 0
    BEGIN
        SELECT 0 AS Ok, N'الطلب لا يحتوي على أصناف' AS MsgA, N'Order has no lines' AS MsgE, @TrNo AS TrNo; RETURN;
    END
    IF EXISTS (SELECT 1 FROM dbo.TST_OrderLine WHERE OrderID = @OrderID AND (Qty <= 0 OR UnitPrice < 0))
    BEGIN
        SELECT 0 AS Ok, N'كمية أو سعر غير صالح في أحد الأصناف' AS MsgA, N'Invalid quantity or price in a line' AS MsgE, @TrNo AS TrNo; RETURN;
    END

    SET @Net = CASE WHEN @Total - @Disc < 0 THEN 0 ELSE @Total - @Disc END;

    -- credit limit check for credit orders
    IF @PayType = 1
    BEGIN
        SELECT @Limit = CreditLimit FROM dbo.TST_Customer WHERE CustomerID = @Cust;
        SELECT @Out = ISNULL(SUM(o.Net), 0) - ISNULL(SUM(p.Paid), 0)
        FROM dbo.TST_Order o
             LEFT JOIN (SELECT OrderID, SUM(Amount) AS Paid FROM dbo.TST_OrderPayment GROUP BY OrderID) p ON p.OrderID = o.OrderID
        WHERE o.CustomerID = @Cust AND o.Status = 1 AND o.PaymentType = 1;
        IF ISNULL(@Limit, 0) > 0 AND ISNULL(@Out, 0) + @Net > @Limit
        BEGIN
            SELECT 0 AS Ok, N'تجاوز حد الائتمان للعميل' AS MsgA, N'Customer credit limit exceeded' AS MsgE, @TrNo AS TrNo; RETURN;
        END
    END

    BEGIN TRY
        IF @Own = 1 BEGIN TRAN; ELSE SAVE TRANSACTION TST_PostOrder;

        IF @TrNo IS NULL
            SELECT @TrNo = ISNULL(MAX(TrNo), 0) + 1 FROM dbo.TST_Order WITH (UPDLOCK, HOLDLOCK) WHERE CompCode = @Comp AND BranchCode = @Br;

        UPDATE dbo.TST_Order
           SET Total = @Total, Net = @Net, TrNo = @TrNo, Status = 1,
               UpdatedBy = CAST(@UserID AS NVARCHAR(20)), UpdatedAt = GETDATE()
         WHERE OrderID = @OrderID AND Status = 0;

        IF @@ROWCOUNT = 0
            RAISERROR(N'Order state changed', 16, 1);

        IF @Own = 1 COMMIT TRAN;
        SELECT 1 AS Ok, N'تم ترحيل الطلب' AS MsgA, N'Order posted' AS MsgE, @TrNo AS TrNo;
    END TRY
    BEGIN CATCH
        IF @Own = 1 BEGIN IF @@TRANCOUNT > 0 ROLLBACK TRAN; END
        ELSE IF XACT_STATE() = 1 ROLLBACK TRANSACTION TST_PostOrder;
        SELECT 0 AS Ok, ERROR_MESSAGE() AS MsgA, ERROR_MESSAGE() AS MsgE, CAST(NULL AS INT) AS TrNo;
    END CATCH
END
GO

-- 6.3 Cancel a draft/posted order (not allowed when payments exist). @Reason is appended to Notes.
CREATE OR ALTER PROCEDURE dbo.TST_Proc_CancelOrder
    @OrderID INT,
    @UserID  INT = NULL,
    @Reason  NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Status INT;
    SELECT @Status = Status FROM dbo.TST_Order WHERE OrderID = @OrderID;

    IF @Status IS NULL
    BEGIN
        SELECT 0 AS Ok, N'الطلب غير موجود' AS MsgA, N'Order not found' AS MsgE; RETURN;
    END
    IF @Status = 2
    BEGIN
        SELECT 0 AS Ok, N'الطلب ملغي بالفعل' AS MsgA, N'Order is already cancelled' AS MsgE; RETURN;
    END
    IF EXISTS (SELECT 1 FROM dbo.TST_OrderPayment WHERE OrderID = @OrderID)
    BEGIN
        SELECT 0 AS Ok, N'لا يمكن إلغاء طلب عليه دفعات، احذف الدفعات أولاً' AS MsgA, N'Cannot cancel an order that has payments; delete the payments first' AS MsgE; RETURN;
    END

    UPDATE dbo.TST_Order
       SET Status = 2,
           Notes = LEFT(ISNULL(Notes, N'') + CASE WHEN @Reason IS NULL OR @Reason = N'' THEN N'' ELSE N' | ' + @Reason END, 500),
           UpdatedBy = CAST(@UserID AS NVARCHAR(20)), UpdatedAt = GETDATE()
     WHERE OrderID = @OrderID AND Status <> 2;

    SELECT 1 AS Ok, N'تم إلغاء الطلب' AS MsgA, N'Order cancelled' AS MsgE;
END
GO

/* =====================================================================================
   9) SUMMARY
   ===================================================================================== */
SELECT N'TST_Category' AS ObjectName, COUNT(*) AS Rows FROM dbo.TST_Category
UNION ALL SELECT N'TST_Unit',             COUNT(*) FROM dbo.TST_Unit
UNION ALL SELECT N'TST_Warehouse',        COUNT(*) FROM dbo.TST_Warehouse
UNION ALL SELECT N'TST_Customer',         COUNT(*) FROM dbo.TST_Customer
UNION ALL SELECT N'TST_Item',             COUNT(*) FROM dbo.TST_Item
UNION ALL SELECT N'TST_Expense',          COUNT(*) FROM dbo.TST_Expense
UNION ALL SELECT N'TST_Order',            COUNT(*) FROM dbo.TST_Order
UNION ALL SELECT N'TST_OrderLine',        COUNT(*) FROM dbo.TST_OrderLine
UNION ALL SELECT N'TST_OrderPayment',     COUNT(*) FROM dbo.TST_OrderPayment
UNION ALL SELECT N'TST_OpeningStock',     COUNT(*) FROM dbo.TST_OpeningStock
UNION ALL SELECT N'TST_OpeningStockLine', COUNT(*) FROM dbo.TST_OpeningStockLine;
GO
