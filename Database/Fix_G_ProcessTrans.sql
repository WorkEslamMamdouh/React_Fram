USE [ESSA_React]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*
  ===================================================================================
  تعديل 2026-10-25:
   1) @Ok بقى بيرجع 1 لو نجح و 0 لو فشل (عشان يتفق مع الخادم ManageDataSQLController)
   2) لو الإجراء اتنادى جوه transaction مفتوحة من الخادم، بيستخدم SAVE TRANSACTION
      بدل ما يفتح ويقفل transaction لوحده، عشان الـ ROLLBACK ميلغيش شغل الخادم كله
   3) أي خطأ جوه الإجراء (زي Z_A_CreateAccount) بيرجع رسالته الحقيقية للشاشة
   4) أي @TrType مش متعرّف هنا = فشل (@Ok = 0)
  ===================================================================================

  تجربة:
  DECLARE @TrNo INT, @Ok INT;
  EXEC G_ProcessTrans 1, 1, 'CashBox', 'Update', 1, @TrNo OUTPUT, @Ok OUTPUT;
  SELECT @TrNo AS TrNo, @Ok AS Ok;     -- لازم Ok = 1
*/
-- =============================================
-- Author:		<Dr. Mahroos Amer >
-- Create date: <27-06-2018>
-- Description:	<Process transactions and generate serial ,,>
-- =============================================
ALTER PROCEDURE [dbo].[G_ProcessTrans]
	@Comp int ,
	@Branch  int ,
	@TrType nvarchar(50) ,  -- نوع الحركة  مثلاً: 'CashBox'
	@OpMode nvarchar(10) ,  -- 'Add': بعد الإضافة , 'Update': بعد التعديل , 'Delete': بعد الحذف
	@TrID int ,
	@TrNo int output ,
	@Ok  int output         -- ✅ 1 = نجح  ,  0 = فشل
AS
BEGIN
	declare @r as int = 1   -- داخلياً: 0 = نجح , أي رقم تاني = فشل (زي ما كان)
	, @Tn int ,@Stat int , @tp int  ,   @FinType int  ,  @TrTypeTrans int  , @ntype as nvarchar(20)
	, @RefTrID int , @Amt Float  , @cash bit , @transcode int ,@IsCredit bit,@CustomerID int , @SupplierID int,@DueAmount  numeric(18, 2)
	, @dt smalldatetime , @yr int  , @Flag bit  , @GTrNo as int  ,@invType INT ,@SlsInvSrc int , @ID int  ,@USERID bigint,@IsCash bit
	, @DocNO nvarchar(100) ,@UserCode nvarchar(50) ,@Debit numeric(18, 2) ,@Credit numeric(18, 2)
	, @Acc_Code nvarchar(25)  , @FromAcc_Code nvarchar(25)  , @CREATED_BY nvarchar(50)  ,@UPDATED_BY nvarchar(50) ,@VoucherNo int , @IsPosted bit ,@IDUserCreate bigint,
	@AutoCode bit

	SET NOCOUNT ON;

	DECLARE @FinYear int
	SET @FinYear = Year(getdate())

	SET @Ok = 0

	-- ✅ لو الخادم فاتح transaction نستخدم نقطة حفظ، غير كده نفتح transaction عادي
	DECLARE @OuterTran int = @@TRANCOUNT;
	IF @OuterTran = 0
		BEGIN TRANSACTION;
	ELSE
		SAVE TRANSACTION G_ProcessTrans_SP;

	BEGIN TRY

	--------------------------------------------------------------------
	-- DEFINITION
	--------------------------------------------------------------------

		if @TrType = 'CashBox'
		begin
			Set @TrNo = 1

			if @OpMode = 'Add'
			begin
				EXEC Z_A_CreateAccount @Comp, @Branch, 'CashBox', @TrID;
			End

			if @OpMode = 'Update'
			begin
				EXEC Z_A_CreateAccount @Comp, @Branch, 'CashBox', @TrID;
			End

			if @OpMode = 'Delete'
			begin
				EXEC Z_A_CreateAccount @Comp, @Branch, 'CashBox', @TrID;
			End

			set @r = 0
		END

	--------------------------------------------------------------------
	-- ➕ أي نوع حركة جديد يتضاف هنا بنفس الشكل:
	--    if @TrType = 'NewType' begin ... set @r = 0 END
	--------------------------------------------------------------------

	END TRY
	BEGIN CATCH
		-- ✅ خطأ: نرجّع اللي اتعمل في الإجراء بس، ونبعت رسالة الخطأ الحقيقية
		IF @OuterTran = 0
		BEGIN
			IF @@TRANCOUNT > 0 ROLLBACK;
		END
		ELSE IF XACT_STATE() = 1
			ROLLBACK TRANSACTION G_ProcessTrans_SP;

		SET @Ok = 0;
		THROW;
	END CATCH

	--------------------------------------------------------------------
	IF @r = 0
	BEGIN
		IF @OuterTran = 0 COMMIT;   -- لو الخادم فاتح transaction هو اللي هيعمل COMMIT
		SET @Ok = 1;                -- ✅ نجح
	END
	ELSE
	BEGIN
		IF @OuterTran = 0
			ROLLBACK;
		ELSE
			ROLLBACK TRANSACTION G_ProcessTrans_SP;
		SET @Ok = 0;                -- ❌ فشل (أو نوع حركة مش متعرّف)
	END
	--------------------------------------------------------------------

	RETURN
END
GO
