/* =====================================================================================
   TEST OBJECTS -- removes everything created by Test_ScreenBuilder_Schema.sql
   Drops only objects named TST_* / IQ_TST_* / TST_Rpt_* / TST_Proc_*  (nothing else).
   NOTE: it does NOT remove Sys_ScreenConfig / Sys_Modules / Sys_Reports rows that the
         ScreenBuilder created for the test screens -- delete those from the admin screens.
   ===================================================================================== */
USE [ESSA_React];
GO
SET NOCOUNT ON;
GO

-- procedures
IF OBJECT_ID(N'dbo.TST_Rpt_OrderList', N'P')          IS NOT NULL DROP PROCEDURE dbo.TST_Rpt_OrderList;
IF OBJECT_ID(N'dbo.TST_Rpt_SalesByCategory', N'P')    IS NOT NULL DROP PROCEDURE dbo.TST_Rpt_SalesByCategory;
IF OBJECT_ID(N'dbo.TST_Rpt_CustomerStatement', N'P')  IS NOT NULL DROP PROCEDURE dbo.TST_Rpt_CustomerStatement;
IF OBJECT_ID(N'dbo.TST_Rpt_OrderPrint', N'P')         IS NOT NULL DROP PROCEDURE dbo.TST_Rpt_OrderPrint;
IF OBJECT_ID(N'dbo.TST_Rpt_ItemsBarcode', N'P')       IS NOT NULL DROP PROCEDURE dbo.TST_Rpt_ItemsBarcode;
IF OBJECT_ID(N'dbo.TST_Rpt_Dashboard', N'P')          IS NOT NULL DROP PROCEDURE dbo.TST_Rpt_Dashboard;
IF OBJECT_ID(N'dbo.TST_Proc_PostOrder', N'P')         IS NOT NULL DROP PROCEDURE dbo.TST_Proc_PostOrder;
IF OBJECT_ID(N'dbo.TST_Proc_CancelOrder', N'P')       IS NOT NULL DROP PROCEDURE dbo.TST_Proc_CancelOrder;
IF OBJECT_ID(N'dbo.TST_Proc_RecalcOrder', N'P')       IS NOT NULL DROP PROCEDURE dbo.TST_Proc_RecalcOrder;
GO

-- views
IF OBJECT_ID(N'dbo.IQ_TST_Expense', N'V')          IS NOT NULL DROP VIEW dbo.IQ_TST_Expense;
IF OBJECT_ID(N'dbo.IQ_TST_Order', N'V')            IS NOT NULL DROP VIEW dbo.IQ_TST_Order;
IF OBJECT_ID(N'dbo.IQ_TST_OrderLine', N'V')        IS NOT NULL DROP VIEW dbo.IQ_TST_OrderLine;
IF OBJECT_ID(N'dbo.IQ_TST_OrderPayment', N'V')     IS NOT NULL DROP VIEW dbo.IQ_TST_OrderPayment;
IF OBJECT_ID(N'dbo.IQ_TST_OpeningStock', N'V')     IS NOT NULL DROP VIEW dbo.IQ_TST_OpeningStock;
IF OBJECT_ID(N'dbo.IQ_TST_OpeningStockLine', N'V') IS NOT NULL DROP VIEW dbo.IQ_TST_OpeningStockLine;
GO

-- tables (children first)
IF OBJECT_ID(N'dbo.TST_OpeningStockLine', N'U') IS NOT NULL DROP TABLE dbo.TST_OpeningStockLine;
IF OBJECT_ID(N'dbo.TST_OpeningStock', N'U')     IS NOT NULL DROP TABLE dbo.TST_OpeningStock;
IF OBJECT_ID(N'dbo.TST_OrderPayment', N'U')     IS NOT NULL DROP TABLE dbo.TST_OrderPayment;
IF OBJECT_ID(N'dbo.TST_OrderLine', N'U')        IS NOT NULL DROP TABLE dbo.TST_OrderLine;
IF OBJECT_ID(N'dbo.TST_Order', N'U')            IS NOT NULL DROP TABLE dbo.TST_Order;
IF OBJECT_ID(N'dbo.TST_Expense', N'U')          IS NOT NULL DROP TABLE dbo.TST_Expense;
IF OBJECT_ID(N'dbo.TST_Item', N'U')             IS NOT NULL DROP TABLE dbo.TST_Item;
IF OBJECT_ID(N'dbo.TST_Customer', N'U')         IS NOT NULL DROP TABLE dbo.TST_Customer;
IF OBJECT_ID(N'dbo.TST_Warehouse', N'U')        IS NOT NULL DROP TABLE dbo.TST_Warehouse;
IF OBJECT_ID(N'dbo.TST_Unit', N'U')             IS NOT NULL DROP TABLE dbo.TST_Unit;
IF OBJECT_ID(N'dbo.TST_Category', N'U')         IS NOT NULL DROP TABLE dbo.TST_Category;
GO

PRINT N'TST objects dropped';
GO
