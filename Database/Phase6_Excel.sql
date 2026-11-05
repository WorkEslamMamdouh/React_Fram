-- =====================================================================================
--  Phase 6 (Excel import) -- OPTIONAL SQL.   *** REVIEW BEFORE RUNNING ***   (NOT RUN)
-- -------------------------------------------------------------------------------------
--  The Excel feature needs NO new database objects. Nothing here is required.
--  These are only suggested indexes that speed up matching of codes/names when a file
--  with thousands of rows is imported (lookups use  WHERE <code> IN (...)  batches).
--  Run on a copy first. Safe to re-run (guards on index name).
-- =====================================================================================
USE [ESSA_React];
GO

-- Items by code (lookup: D_I_Items.ItemCode)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_P6_D_I_Items_Comp_Code' AND object_id = OBJECT_ID(N'dbo.D_I_Items'))
    CREATE NONCLUSTERED INDEX IX_P6_D_I_Items_Comp_Code ON dbo.D_I_Items (CompCode, ItemCode) INCLUDE (ItemName, UnitPrice, CostPrice);
GO

-- Customers by code (lookup: D_Customer.CustomerCODE)
-- (بيتخطى لو CustomerCODE نوعه nvarchar(max) — الـ max مينفعش يتعمله فهرس)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_P6_D_Customer_Comp_Code' AND object_id = OBJECT_ID(N'dbo.D_Customer'))
   AND COL_LENGTH(N'dbo.D_Customer', N'CustomerCODE') > 0
    EXEC (N'CREATE NONCLUSTERED INDEX IX_P6_D_Customer_Comp_Code ON dbo.D_Customer (CompCode, CustomerCODE) INCLUDE (NAMEA)');
GO
