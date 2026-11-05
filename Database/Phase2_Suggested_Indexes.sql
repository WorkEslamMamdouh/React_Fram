-- =====================================================================================
--  Phase 2 - SUGGESTED INDEXES            *** REVIEW BEFORE RUNNING ***
--  Database : ESSA_React
--
--  * Nothing here was executed by the assistant. Read every block, adjust column names to your
--    real schema (some tables are wider than the Create_*.sql scripts), then run what you want.
--  * Every block is idempotent: it only creates the index when the table AND the columns exist
--    and the index name does not exist yet. Safe to re-run.
--  * Indexes speed up reads (paging / filter / sort) but cost a little on every INSERT/UPDATE
--    and use disk. Test on a copy first for big tables. Use ONLINE = ON on Enterprise edition
--    for large live tables (add  WITH (ONLINE = ON)  to the CREATE INDEX statements).
--
--  How the screens query (so the indexes match):
--    DynamicGrid  : SELECT * FROM <table|view> WHERE CompCode = @x [AND BranchCode = @y]
--                   [AND <filters: LIKE / = / date range>] ORDER BY <sortCol>, <KeyColumn>
--                   OFFSET .. FETCH NEXT .. , plus COUNT(*) with the same WHERE.
--    Date filters : "col >= 'yyyymmdd' AND col < DATEADD(day,1,'yyyymmdd')"  (index friendly)
--    Text filters : LIKE N'%text%'  (leading wildcard = cannot use a normal index; consider
--                   full-text search later for very large text columns)
-- =====================================================================================
USE [ESSA_React];
GO
SET NOCOUNT ON;
GO

-- -------------------------------------------------------------------------------------
-- 1) I_TR_Sales  (SalesInvoice list via IQ_TR_Sales, SalesApproval grid)
--    Filter by company/branch + date, sort by SaleID (PK clustered already) or date.
-- -------------------------------------------------------------------------------------
-- 1a) Company + Branch + Sale date (most common list filter / sort)
IF OBJECT_ID(N'dbo.I_TR_Sales', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'BranchCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'SaleDate') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_I_TR_Sales_Comp_Branch_SaleDate' AND object_id = OBJECT_ID(N'dbo.I_TR_Sales'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_I_TR_Sales_Comp_Branch_SaleDate
            ON dbo.I_TR_Sales (CompCode, BranchCode, SaleDate DESC, SaleID DESC)');
-- (If your table uses TrDate instead of SaleDate - as in Create_Sales_Tables.sql - use this one)
IF OBJECT_ID(N'dbo.I_TR_Sales', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'BranchCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'TrDate') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_I_TR_Sales_Comp_Branch_TrDate' AND object_id = OBJECT_ID(N'dbo.I_TR_Sales'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_I_TR_Sales_Comp_Branch_TrDate
            ON dbo.I_TR_Sales (CompCode, BranchCode, TrDate DESC, SaleID DESC)');

-- 1b) Status chips / approval filter
IF OBJECT_ID(N'dbo.I_TR_Sales', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'Status') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_I_TR_Sales_Comp_Status' AND object_id = OBJECT_ID(N'dbo.I_TR_Sales'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_I_TR_Sales_Comp_Status
            ON dbo.I_TR_Sales (CompCode, Status) INCLUDE (SaleID)');

-- 1c) Customer lookups (exact / prefix match; LIKE ''%x%'' will not use it)
IF OBJECT_ID(N'dbo.I_TR_Sales', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_Sales', N'CustomerName') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_I_TR_Sales_Comp_Customer' AND object_id = OBJECT_ID(N'dbo.I_TR_Sales'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_I_TR_Sales_Comp_Customer
            ON dbo.I_TR_Sales (CompCode, CustomerName)');
GO

-- -------------------------------------------------------------------------------------
-- 2) I_TR_SaleDetails  (detail rows loaded by SaleID when opening / editing an invoice)
--    Create_Sales_Tables.sql already creates IX_I_TR_SaleDetails_SaleID. Only add if missing.
-- -------------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.I_TR_SaleDetails', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.I_TR_SaleDetails', N'SaleID') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE object_id = OBJECT_ID(N'dbo.I_TR_SaleDetails') AND type_desc = N'NONCLUSTERED'
                     AND EXISTS (SELECT 1 FROM sys.index_columns ic
                                 JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                                 WHERE ic.object_id = sys.indexes.object_id AND ic.index_id = sys.indexes.index_id
                                   AND ic.key_ordinal = 1 AND c.name = N'SaleID'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_I_TR_SaleDetails_SaleID_P2 ON dbo.I_TR_SaleDetails (SaleID)');
GO

-- -------------------------------------------------------------------------------------
-- 3) I_TR_FinancialTransactions  (FinTrans_Expenses grid: CompCode + BranchCode, sort by key)
-- -------------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.I_TR_FinancialTransactions', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.I_TR_FinancialTransactions', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_FinancialTransactions', N'BranchCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_FinancialTransactions', N'TransactionDate') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_I_TR_FinTrans_Comp_Branch_Date' AND object_id = OBJECT_ID(N'dbo.I_TR_FinancialTransactions'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_I_TR_FinTrans_Comp_Branch_Date
            ON dbo.I_TR_FinancialTransactions (CompCode, BranchCode, TransactionDate DESC, TransactionID DESC)');

IF OBJECT_ID(N'dbo.I_TR_FinancialTransactions', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.I_TR_FinancialTransactions', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_FinancialTransactions', N'BranchCode') > 0
   AND COL_LENGTH(N'dbo.I_TR_FinancialTransactions', N'TrType') > 0
   AND COL_LENGTH(N'dbo.I_TR_FinancialTransactions', N'Status') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_I_TR_FinTrans_Comp_Branch_TrType_Status' AND object_id = OBJECT_ID(N'dbo.I_TR_FinancialTransactions'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_I_TR_FinTrans_Comp_Branch_TrType_Status
            ON dbo.I_TR_FinancialTransactions (CompCode, BranchCode, TrType, Status)');
GO

-- -------------------------------------------------------------------------------------
-- 4) G_D_Employees  (Employees grid: CompCode, optional Status / branch filters, sort by EmpID)
-- -------------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.G_D_Employees', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.G_D_Employees', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.G_D_Employees', N'BranchCode') > 0
   AND COL_LENGTH(N'dbo.G_D_Employees', N'Status') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_G_D_Employees_Comp_Branch_Status' AND object_id = OBJECT_ID(N'dbo.G_D_Employees'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_G_D_Employees_Comp_Branch_Status
            ON dbo.G_D_Employees (CompCode, BranchCode, Status) INCLUDE (EmpID)');

IF OBJECT_ID(N'dbo.G_D_Employees', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.G_D_Employees', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.G_D_Employees', N'Emp_Name') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_G_D_Employees_Comp_Name' AND object_id = OBJECT_ID(N'dbo.G_D_Employees'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_G_D_Employees_Comp_Name
            ON dbo.G_D_Employees (CompCode, Emp_Name)');
GO

-- -------------------------------------------------------------------------------------
-- 5) Small lookup tables filtered by CompCode (CashTypes, FinancialType, Cost Center)
--    These are usually small; the indexes mainly help COUNT(*) + ORDER BY with paging.
-- -------------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.D_A_CashTypes', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.D_A_CashTypes', N'CompCode') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_D_A_CashTypes_CompCode' AND object_id = OBJECT_ID(N'dbo.D_A_CashTypes'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_D_A_CashTypes_CompCode ON dbo.D_A_CashTypes (CompCode)');

IF OBJECT_ID(N'dbo.D_A_FinancialType', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.D_A_FinancialType', N'CompCode') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_D_A_FinancialType_CompCode' AND object_id = OBJECT_ID(N'dbo.D_A_FinancialType'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_D_A_FinancialType_CompCode ON dbo.D_A_FinancialType (CompCode)');

IF OBJECT_ID(N'dbo.A_Cost_Center', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.A_Cost_Center', N'CompCode') > 0
   AND COL_LENGTH(N'dbo.A_Cost_Center', N'CC_CODE') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_A_Cost_Center_Comp_Code' AND object_id = OBJECT_ID(N'dbo.A_Cost_Center'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_A_Cost_Center_Comp_Code ON dbo.A_Cost_Center (CompCode, CC_CODE)');
GO

-- -------------------------------------------------------------------------------------
-- 6) Lookup / search tables used by dropdowns and search windows (server-side search + paging)
--    A_ACCOUNT (accounts), Sys_Users (users). Sorted by key (PK) and searched by name/code.
--    Prefix searches (LIKE 'abc%') can use these; '%abc%' scans (fine for tens of thousands of rows).
-- -------------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.A_ACCOUNT', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.A_ACCOUNT', N'ACC_CODE') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_A_ACCOUNT_ACC_CODE' AND object_id = OBJECT_ID(N'dbo.A_ACCOUNT'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_A_ACCOUNT_ACC_CODE ON dbo.A_ACCOUNT (ACC_CODE)');

IF OBJECT_ID(N'dbo.Sys_Users', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Sys_Users', N'USER_NAME') > 0
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sys_Users_USER_NAME' AND object_id = OBJECT_ID(N'dbo.Sys_Users'))
    EXEC (N'CREATE NONCLUSTERED INDEX IX_Sys_Users_USER_NAME ON dbo.Sys_Users (USER_NAME)');
GO

-- -------------------------------------------------------------------------------------
-- 7) NOT covered (columns unknown from the code): D_B_RE_UnitFloor (TestPage). Add an index on
--    its CompCode / filter columns after checking the real table definition.
-- -------------------------------------------------------------------------------------

-- Quick check: list the indexes created by this script
-- SELECT OBJECT_NAME(object_id) AS TableName, name FROM sys.indexes
-- WHERE name LIKE N'IX[_]%' AND (name LIKE N'%Comp%' OR name LIKE N'%P2') ORDER BY 1, 2;
