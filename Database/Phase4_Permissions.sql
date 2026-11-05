-- =====================================================================================
--  Phase4_Permissions.sql   ***  REVIEW BEFORE RUNNING  ***
--  المرحلة 4: إدارة المستخدمين والصلاحيات
-- -------------------------------------------------------------------------------------
--  السكربت ده ماتشغّلش لسه. اقراه الأول، وبعدين شغّله على ESSA_React.
--  - Idempotent: ينفع يتشغّل أكتر من مرة من غير ما يكرر حاجة.
--  - مابيعملش DROP لأي جدول أو عمود أو بيانات. (القسم B بيغيّر مفتاح جدول Sys_UserModule
--    بـ DROP/ADD للـ PRIMARY KEY والفهرس بس — جوه ترانزاكشن، وبيتأكد قبلها.)
--
--  الأقسام:
--    A) عمود Sys_Role.IsAdmin  (تعريف "دور الأدمن")
--    B) تعديل مفتاح Sys_UserModule  ← لازم عشان شاشة "صلاحيات خاصة بمستخدم"
--    C) الإجراء Sys_RegisterModule  (تسجيل شاشة جديدة + إعطاء الأدمن كل الصلاحيات)
--    D) تسجيل شاشات المرحلة 4 (مجموعة قايمة + 3 شاشات)
--    E) (اختياري / معطّل) تعديل الفيو IQ_Sys_RoleModule — مكتوب كتعليق، شيل التعليق لو عايزه
-- =====================================================================================
USE [ESSA_React];
GO

SET NOCOUNT ON;
GO

-- =====================================================================================
-- A) تعريف دور الأدمن:  Sys_Role.IsAdmin (BIT, NULL)
--    الدور اللي IsAdmin = 1 (وفعّال IsAvailable = 1) بياخد تلقائي كل صلاحيات أي شاشة
--    بتتسجّل بالإجراء Sys_RegisterModule.
--    الأدوار الحالية: 1 = مطور (Developer) ، 2 = مدير (Administrator) -> بيتعلّموا أدمن هنا.
--    غيّر السطر اللي تحت لو عايز أدوار تانية.
-- =====================================================================================
IF COL_LENGTH('dbo.Sys_Role', 'IsAdmin') IS NULL
BEGIN
    ALTER TABLE dbo.Sys_Role ADD IsAdmin BIT NULL;
    PRINT N'A) اتضاف العمود Sys_Role.IsAdmin';
END
ELSE
    PRINT N'A) العمود Sys_Role.IsAdmin موجود بالفعل';
GO

-- تعليم الأدوار 1 و 2 كأدمن (بس لو لسه مالهمش قيمة)
UPDATE dbo.Sys_Role SET IsAdmin = 1 WHERE RoleId IN (1, 2) AND IsAdmin IS NULL;
DECLARE @adminCount INT = (SELECT COUNT(*) FROM dbo.Sys_Role WHERE IsAdmin = 1);
PRINT N'A) الأدوار الأدمن: ' + CAST(@adminCount AS NVARCHAR(10));
GO

-- =====================================================================================
-- B) Sys_UserModule: المفتاح الأساسي دلوقتي = MODULE_CODE بس (يعني صف واحد للشاشة لكل
--    المستخدمين!) وعمود MODULE_CODE فيه NVARCHAR(20) وCompCode/BranchCode بيقبلوا NULL.
--    عشان صلاحيات مستخدم + شركة + فرع نغيّر المفتاح لـ (UserID, CompCode, BranchCode, MODULE_CODE).
--    * NULL في CompCode/BranchCode بيتحوّل لـ 0 (الفيو أصلًا بيعمل ISNULL(..,0) فمفيش فرق في المعنى)
--    * MODULE_CODE بيتوسّع لـ NVARCHAR(100) زي Sys_Modules.
--    مفيش Foreign Keys ولا Triggers على الجدول (اتأكدنا). بيتنفّذ مرة واحدة بس.
-- =====================================================================================
IF EXISTS (
    SELECT 1
    FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    WHERE i.object_id = OBJECT_ID('dbo.Sys_UserModule') AND i.is_primary_key = 1
    GROUP BY i.index_id
    HAVING COUNT(*) = 1
)
BEGIN
    BEGIN TRY
        BEGIN TRAN;

        DECLARE @pk SYSNAME = (SELECT name FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Sys_UserModule') AND is_primary_key = 1);
        DECLARE @sql NVARCHAR(MAX);

        IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Sys_UserModule') AND name = 'IX_Sys_UserModule_User')
            DROP INDEX IX_Sys_UserModule_User ON dbo.Sys_UserModule;

        SET @sql = N'ALTER TABLE dbo.Sys_UserModule DROP CONSTRAINT ' + QUOTENAME(@pk);
        EXEC (@sql);

        UPDATE dbo.Sys_UserModule SET CompCode = 0   WHERE CompCode IS NULL;
        UPDATE dbo.Sys_UserModule SET BranchCode = 0 WHERE BranchCode IS NULL;

        ALTER TABLE dbo.Sys_UserModule ALTER COLUMN CompCode    INT NOT NULL;
        ALTER TABLE dbo.Sys_UserModule ALTER COLUMN BranchCode  INT NOT NULL;
        ALTER TABLE dbo.Sys_UserModule ALTER COLUMN MODULE_CODE NVARCHAR(100) NOT NULL;

        ALTER TABLE dbo.Sys_UserModule ADD CONSTRAINT PK_Sys_UserModule_User_Comp_Branch_Module
            PRIMARY KEY CLUSTERED (UserID, CompCode, BranchCode, MODULE_CODE);

        COMMIT;
        PRINT N'B) اتغيّر مفتاح Sys_UserModule إلى (UserID, CompCode, BranchCode, MODULE_CODE)';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        PRINT N'B) حصل خطأ ومفيش حاجة اتغيّرت';
        THROW;
    END CATCH;
END
ELSE
    PRINT N'B) مفتاح Sys_UserModule اتغيّر قبل كده (أو مش بالشكل القديم) — اتخطّى';
GO

-- =====================================================================================
-- C) الإجراء Sys_RegisterModule
--    - بيعمل Insert/Update لـ Sys_Modules  (AVAILABLE = 1)
--        * الشاشة الجديدة: صلاحيات CREATE/EDIT/DELETE/PRINT/VIEW = 1  و CUSTOM1..9 = @AllowCustom (الافتراضي 0)
--        * الشاشة الموجودة: بيحدّث الوصف/القايمة/النوع/الترتيب/الأيقونة/اللون بس لو القيمة مش NULL،
--          ويخلّي AVAILABLE = 1. مابيلمسش أعلام الصلاحيات.
--    - بيدّي كل أدوار الأدمن (Sys_Role.IsAdmin = 1 و IsAvailable = 1) صلاحيات كاملة في Sys_RoleModule
--      (EXECUTE = 1 + كل صلاحية الشاشة نفسها مفتوحة).
--    - @MODULE_TYPE: 'M' = مجموعة قايمة ، 'S' = شاشة React جديدة (القيم القديمة 'p' شاشات الـ TypeScript القديمة).
--    - @MODULE_MENU: كود مجموعة القايمة (MODULE_CODE بتاع صف النوع M) أو '' للمستوى الأول.
--    مثال:  EXEC dbo.Sys_RegisterModule N'MyScreen', N'شاشتي', N'My Screen', N'Menu_Admin', N'S', 40, N'', N'indigo';
-- =====================================================================================
CREATE OR ALTER PROCEDURE dbo.Sys_RegisterModule
    @MODULE_CODE  NVARCHAR(100),
    @MODULE_DESCA NVARCHAR(100),
    @MODULE_DESCE NVARCHAR(100),
    @MODULE_MENU  NVARCHAR(100) = NULL,
    @MODULE_TYPE  NCHAR(1)      = N'S',
    @MODULE_SORT  INT           = NULL,
    @Url_Image    NVARCHAR(200) = NULL,
    @Icon_Color   NVARCHAR(200) = NULL,
    @AllowCustom  BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@MODULE_CODE)), N'') = N''
    BEGIN
        RAISERROR(N'MODULE_CODE is required', 16, 1);
        RETURN;
    END

    DECLARE @own BIT = CASE WHEN @@TRANCOUNT = 0 THEN 1 ELSE 0 END;
    BEGIN TRY
        IF @own = 1 BEGIN TRAN;

        IF NOT EXISTS (SELECT 1 FROM dbo.Sys_Modules WHERE MODULE_CODE = @MODULE_CODE)
        BEGIN
            DECLARE @Sort INT = ISNULL(@MODULE_SORT,
                ISNULL((SELECT MAX(MODULE_SORT) FROM dbo.Sys_Modules WHERE ISNULL(MODULE_MENU, N'') = ISNULL(@MODULE_MENU, N'')), 0) + 1);

            INSERT INTO dbo.Sys_Modules
                (MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image, Icon_Color,
                 MODULE_TYPE, MODULE_SORT, IS_Show,
                 [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
                 CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9,
                 AVAILABLE, Images_Enabled)
            VALUES
                (@MODULE_CODE, ISNULL(@MODULE_MENU, N''), @MODULE_DESCE, @MODULE_DESCA, ISNULL(@Url_Image, N''), ISNULL(@Icon_Color, N'indigo'),
                 ISNULL(@MODULE_TYPE, N'S'), @Sort, 1,
                 1, 1, 1, 1, 1,
                 @AllowCustom, @AllowCustom, @AllowCustom, @AllowCustom, @AllowCustom, @AllowCustom, @AllowCustom, @AllowCustom, @AllowCustom,
                 1, 0);
            PRINT N'Sys_Modules: اتضافت ' + @MODULE_CODE;
        END
        ELSE
        BEGIN
            UPDATE dbo.Sys_Modules SET
                MODULE_DESCA = ISNULL(@MODULE_DESCA, MODULE_DESCA),
                MODULE_DESCE = ISNULL(@MODULE_DESCE, MODULE_DESCE),
                MODULE_MENU  = ISNULL(@MODULE_MENU,  MODULE_MENU),
                MODULE_TYPE  = ISNULL(@MODULE_TYPE,  MODULE_TYPE),
                MODULE_SORT  = ISNULL(@MODULE_SORT,  MODULE_SORT),
                Url_Image    = ISNULL(@Url_Image,    Url_Image),
                Icon_Color   = ISNULL(@Icon_Color,   Icon_Color),
                AVAILABLE    = 1
            WHERE MODULE_CODE = @MODULE_CODE;
            PRINT N'Sys_Modules: اتحدّثت ' + @MODULE_CODE;
        END

        -- أدوار الأدمن: صلاحيات كاملة (EXECUTE + كل اللي الشاشة نفسها بتسمح بيه)
        UPDATE rm SET
            [EXECUTE] = 1,
            [CREATE] = ISNULL(m.[CREATE], 0), EDIT = ISNULL(m.EDIT, 0), [DELETE] = ISNULL(m.[DELETE], 0),
            [PRINT] = ISNULL(m.[PRINT], 0), [VIEW] = ISNULL(m.[VIEW], 0),
            CUSTOM1 = ISNULL(m.CUSTOM1, 0), CUSTOM2 = ISNULL(m.CUSTOM2, 0), CUSTOM3 = ISNULL(m.CUSTOM3, 0),
            CUSTOM4 = ISNULL(m.CUSTOM4, 0), CUSTOM5 = ISNULL(m.CUSTOM5, 0), CUSTOM6 = ISNULL(m.CUSTOM6, 0),
            CUSTOM7 = ISNULL(m.CUSTOM7, 0), CUSTOM8 = ISNULL(m.CUSTOM8, 0), CUSTOM9 = ISNULL(m.CUSTOM9, 0)
        FROM dbo.Sys_RoleModule rm
        JOIN dbo.Sys_Modules m ON m.MODULE_CODE = rm.MODULE_CODE
        JOIN dbo.Sys_Role r    ON r.RoleId = rm.RoleId AND r.IsAdmin = 1 AND ISNULL(r.IsAvailable, 0) = 1
        WHERE rm.MODULE_CODE = @MODULE_CODE;

        INSERT INTO dbo.Sys_RoleModule
            (RoleId, MODULE_CODE, [EXECUTE], [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
             CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9,
             ViewImages, EditImages, Prc_Preference)
        SELECT r.RoleId, m.MODULE_CODE, 1,
               ISNULL(m.[CREATE], 0), ISNULL(m.EDIT, 0), ISNULL(m.[DELETE], 0), ISNULL(m.[PRINT], 0), ISNULL(m.[VIEW], 0),
               ISNULL(m.CUSTOM1, 0), ISNULL(m.CUSTOM2, 0), ISNULL(m.CUSTOM3, 0), ISNULL(m.CUSTOM4, 0), ISNULL(m.CUSTOM5, 0),
               ISNULL(m.CUSTOM6, 0), ISNULL(m.CUSTOM7, 0), ISNULL(m.CUSTOM8, 0), ISNULL(m.CUSTOM9, 0),
               0, 0, 1
        FROM dbo.Sys_Role r
        CROSS JOIN dbo.Sys_Modules m
        WHERE r.IsAdmin = 1 AND ISNULL(r.IsAvailable, 0) = 1
          AND m.MODULE_CODE = @MODULE_CODE
          AND NOT EXISTS (SELECT 1 FROM dbo.Sys_RoleModule x WHERE x.RoleId = r.RoleId AND x.MODULE_CODE = m.MODULE_CODE);

        PRINT N'Sys_RoleModule: صلاحيات كاملة لأدوار الأدمن على ' + @MODULE_CODE;

        IF @own = 1 COMMIT;
    END TRY
    BEGIN CATCH
        IF @own = 1 AND @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- =====================================================================================
-- D) تسجيل شاشات المرحلة 4
--    مجموعة قايمة:  Menu_Admin  (النوع M)  — "الإعدادات والإدارة"
--    الشاشات (النوع S):
--       Sys_UsersAdmin      المستخدمين
--       Sys_RolesAdmin      الأدوار والصلاحيات
--       Sys_UserPermsAdmin  صلاحيات خاصة بمستخدم
--    ملحوظة: الباك إند (AdminUsersController) بيتحقق من صلاحية EXECUTE على الأكواد دي بالظبط.
-- =====================================================================================
EXEC dbo.Sys_RegisterModule N'Menu_Admin',         N'الإعدادات والإدارة',        N'Settings & Administration', N'',           N'M', 25, N'', N'indigo';
EXEC dbo.Sys_RegisterModule N'Sys_UsersAdmin',     N'المستخدمين',               N'Users',                     N'Menu_Admin', N'S', 26, N'', N'indigo';
EXEC dbo.Sys_RegisterModule N'Sys_RolesAdmin',     N'الأدوار والصلاحيات',        N'Roles & Permissions',       N'Menu_Admin', N'S', 27, N'', N'indigo';
EXEC dbo.Sys_RegisterModule N'Sys_UserPermsAdmin', N'صلاحيات خاصة بمستخدم',      N'User Permission Overrides', N'Menu_Admin', N'S', 28, N'', N'indigo';
GO

PRINT N'Phase4_Permissions.sql: القسم A-D خلص.';
GO

-- =====================================================================================
-- E) (اختياري — معطّل) تصحيح الفيو IQ_Sys_RoleModule لصفوف المستخدم
--
--  اللي اتفحص (قراءة بس من القاعدة):
--   * الفيو بيعمل INNER JOIN مع (Sys_RoleUsers الفعّالة مجمّعة بـ CompCode, RoleId) على RoleId.
--     صفوف Sys_UserModule بتتحول لـ RoleId = 0 فبتعدّي من الـ JOIN بس لو في الشركة دي
--     أي مستخدم عنده صف Sys_RoleUsers فعّال بـ RoleId = 0. (المستخدمين 1 و 2 عندهم الصف ده في الشركتين 1 و 2.)
--   * استعلام الدخول في LoginCompany.ts كمان فيه شرط:  RoleId in (select RoleId from Sys_RoleUsers where UserID = me)
--     يعني اليوزر نفسه لازم يكون ليه صف RoleId = 0.
--   * الصف الوحيد في Sys_UserModule حاليًا (UserID 2, Customer) كودـه مش في Sys_Modules فالفيو بيتجاهله.
--
--  الحل الحالي (من غير تغيير الفيو): شاشات المرحلة 4 (حفظ المستخدم / حفظ استثناءات المستخدم) بتضيف
--  صف Sys_RoleUsers بـ RoleId = 0 لكل (شركة، فرع) تلقائي. ده نفس العرف الموجود في البيانات.
--
--  تعديل الفيو ده (لو عايزه): بيربط صفوف المستخدم بـ UserID + CompCode بدل RoleId.
--    قبل: صف استثناء يوزر بيظهر بس لو أي يوزر عنده RoleId = 0 في الشركة.
--    بعد: بيظهر لو اليوزر نفسه فعّال في الشركة (من غير ما يحتاج RoleId = 0).
--  نفس الأعمدة بالظبط ونفس المعنى. صفوف الأدوار ماتتغيّرش.
--  تنبيه: عشان يكتمل لازم شرط استعلام الدخول في LoginCompany.ts يبقى
--     (RoleId in (select RoleId from Sys_RoleUsers where UserID = X) or RoleId = 0)
--  (الملف ده خارج نطاق المرحلة 4، اتكتب في التقرير). لحد ما ده يحصل، سيب القسم E معطّل.
--
--  للتفعيل: شيل علامة "-- " من أول كل سطر تحت (بما فيها GO) وشغّلهم.
-- =====================================================================================
-- GO
-- ALTER VIEW [dbo].[IQ_Sys_RoleModule]
-- AS
-- SELECT RoleComp.CompCode, ISNULL(GCont.Status, 0) AS StatusCompany, ISNULL(GCont.FinYear, 0) AS FIN_YEAR, RolMod.RoleId, RolMod.MODULE_CODE, (CASE WHEN ISNULL(RolMod.MODULE_MENU, '') 
--                   <> '' THEN isnull(RolMod.MODULE_MENU, '') ELSE isnull(Modu.MODULE_MENU, '') END) AS MODULE_MENU, (CASE WHEN ISNULL(RolMod.MODULE_DESCE, '') <> '' THEN isnull(RolMod.MODULE_DESCE, '') 
--                   ELSE isnull(Modu.MODULE_DESCE, '') END) AS MODULE_DESCE, (CASE WHEN ISNULL(RolMod.MODULE_DESCA, '') <> '' THEN isnull(RolMod.MODULE_DESCA, '') ELSE isnull(Modu.MODULE_DESCA, '') END) AS MODULE_DESCA, 
--                   (CASE WHEN ISNULL(RolMod.Url_Image, '') <> '' THEN isnull(RolMod.Url_Image, '') ELSE isnull(Modu.Url_Image, '') END) AS Url_Image,
-- 				  (CASE WHEN ISNULL(RolMod.Icon_Color, '') <> '' THEN isnull(RolMod.Icon_Color, '') ELSE isnull(Modu.Icon_Color, '') END) AS Icon_Color,
-- 				  (CASE WHEN ISNULL(RolMod.MODULE_TYPE, '') <> '' THEN isnull(RolMod.MODULE_TYPE, '') 
--                   ELSE isnull(Modu.MODULE_TYPE, '') END) AS MODULE_TYPE, (CASE WHEN ISNULL(RolMod.MODULE_SORT, 0) <> 0 THEN isnull(RolMod.MODULE_SORT, 100000) ELSE isnull(Modu.MODULE_SORT, 100000) END) AS MODULE_SORT, 
--                   (CASE WHEN ISNULL(RolMod.IS_Show, - 1) <> - 1 THEN isnull(RolMod.IS_Show, 0) ELSE isnull(Modu.IS_Show, 0) END) AS IS_Show, (CASE WHEN Modu.AVAILABLE = 1 THEN RolMod.[EXECUTE] ELSE Modu.AVAILABLE END) AS [EXECUTE], 
--                   (CASE WHEN ISNULL(GCont.[Status], 0) = 0 THEN CASE WHEN Modu.[CREATE] = 1 THEN RolMod.[CREATE] ELSE Modu.[CREATE] END ELSE 'false' END) AS [CREATE], (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.EDIT = 1 THEN RolMod.EDIT ELSE Modu.EDIT END ELSE 'false' END) AS EDIT, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.[DELETE] = 1 THEN RolMod.[DELETE] ELSE Modu.[DELETE] END ELSE 'false' END) AS [DELETE], (CASE WHEN ISNULL(GCont.[Status], 0) IN (0, 1) 
--                   THEN CASE WHEN Modu.[PRINT] = 1 THEN RolMod.[PRINT] ELSE Modu.[PRINT] END ELSE 'false' END) AS [PRINT], (CASE WHEN ISNULL(GCont.[Status], 0) IN (0, 1) 
--                   THEN CASE WHEN Modu.[VIEW] = 1 THEN RolMod.[VIEW] ELSE Modu.[VIEW] END ELSE 'false' END) AS [VIEW], (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM1 = 1 THEN RolMod.CUSTOM1 ELSE Modu.CUSTOM1 END ELSE 'false' END) AS CUSTOM1, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM2 = 1 THEN RolMod.CUSTOM2 ELSE Modu.CUSTOM2 END ELSE 'false' END) AS CUSTOM2, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM3 = 1 THEN RolMod.CUSTOM3 ELSE Modu.CUSTOM3 END ELSE 'false' END) AS CUSTOM3, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM4 = 1 THEN RolMod.CUSTOM4 ELSE Modu.CUSTOM4 END ELSE 'false' END) AS CUSTOM4, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM5 = 1 THEN RolMod.CUSTOM5 ELSE Modu.CUSTOM5 END ELSE 'false' END) AS CUSTOM5, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM6 = 1 THEN RolMod.CUSTOM6 ELSE Modu.CUSTOM6 END ELSE 'false' END) AS CUSTOM6, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM7 = 1 THEN RolMod.CUSTOM7 ELSE Modu.CUSTOM7 END ELSE 'false' END) AS CUSTOM7, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM8 = 1 THEN RolMod.CUSTOM8 ELSE Modu.CUSTOM8 END ELSE 'false' END) AS CUSTOM8, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.CUSTOM9 = 1 THEN RolMod.CUSTOM9 ELSE Modu.CUSTOM9 END ELSE 'false' END) AS CUSTOM9, (CASE WHEN ISNULL(GCont.[Status], 0) 
--                   = 0 THEN CASE WHEN Modu.Images_Enabled = 1 THEN RolMod.ViewImages ELSE Modu.Images_Enabled END ELSE 'false' END) AS IsArchive, ISNULL(RolMod.Prc_Preference, 0) AS Prc_Preference, ISNULL(RolMod.UserID, 0) AS UserID, 
--                   ISNULL(RolMod.CompCode, 0) AS User_CompCode, ISNULL(RolMod.BranchCode, 0) AS User_BranchCode
-- FROM     (SELECT 0 AS UserID, 0 AS CompCode, 0 AS BranchCode, RoleId, MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image,Icon_Color, MODULE_TYPE, MODULE_SORT, IS_Show, [EXECUTE], [CREATE], EDIT, [DELETE], 
--                                     [PRINT], [VIEW], CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9, ViewImages, EditImages, Prc_Preference
--                   FROM      dbo.Sys_RoleModule AS EntRolMod
--                   UNION ALL
--                   SELECT ISNULL(UserID, 0) AS UserID, ISNULL(CompCode, 0) AS CompCode, ISNULL(BranchCode, 0) AS BranchCode, 0 AS RoleId, MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image, Icon_Color,MODULE_TYPE, 
--                                     MODULE_SORT, IS_Show, [EXECUTE], [CREATE], EDIT, [DELETE], [PRINT], [VIEW], CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9, ViewImages, EditImages, 
--                                     Prc_Preference
--                   FROM     dbo.Sys_UserModule AS UserMod) AS RolMod INNER JOIN
--                   dbo.Sys_Modules AS Modu ON RolMod.MODULE_CODE = Modu.MODULE_CODE INNER JOIN
--                       (SELECT CompCode, RoleId, 0 AS UserID            -- أدوار: (شركة، دور) زي الأصلي
--                        FROM      dbo.Sys_RoleUsers
--                        WHERE   (ISActive = 1)
--                        GROUP BY CompCode, RoleId
--                        UNION ALL
--                        SELECT CompCode, 0 AS RoleId, UserID   -- يوزرز: (شركة، يوزر) -- مش محتاج صف RoleId = 0
--                        FROM      dbo.Sys_RoleUsers
--                        WHERE   (ISActive = 1)
--                        GROUP BY CompCode, UserID) AS RoleComp
--                   ON (RolMod.UserID = 0 AND RoleComp.UserID = 0 AND RolMod.RoleId = RoleComp.RoleId)
--                   OR (RolMod.UserID <> 0 AND RoleComp.UserID = RolMod.UserID) LEFT OUTER JOIN
--                   dbo.Sys_ControlYear AS GCont ON GCont.CompCode = RoleComp.CompCode
-- GO
