-- =====================================================================================
--  إضافة شاشة "أنواع الحسابات المالية" (FinancialType) في Sys_Modules و Sys_RoleModule
--  قاعدة البيانات: ESSA_React
--  السكريبت ينفع يتشغل أكتر من مرة من غير ما يكرر حاجة
-- =====================================================================================
USE [ESSA_React];
GO

SET NOCOUNT ON;

-- =========================
-- الإعدادات (غيّرها لو محتاج)
-- =========================
DECLARE @ModuleCode NVARCHAR(100) = N'FinancialType';      -- لازم = اسم الفولدر في ClientApp
DECLARE @DescA      NVARCHAR(200) = N'أنواع الحسابات المالية';
DECLARE @DescE      NVARCHAR(200) = N'Financial Account Types';
DECLARE @ParentMenu NVARCHAR(100) = N'';               -- كود القائمة الأب، أو '' تظهر في أول القائمة
                                                        -- ⚠️ متخليهاش NULL (القائمة الجانبية بتقع)
DECLARE @IconColor  NVARCHAR(50)  = N'indigo';        -- لون الأيقونة (ألوان Tailwind: blue, emerald, yellow ...)

-- الأدوار اللي هتشوف الشاشة
-- افتراضياً: كل دور عليه مستخدمين فعالين في Sys_RoleUsers
-- (القالب IQ_Sys_RoleModule أصلاً مش بيعرض غير الأدوار دي)
-- لو عايز دور معين بس: امسح السطر اللي فيه SELECT وحط مثلاً:  INSERT INTO @Roles VALUES (1);
DECLARE @Roles TABLE (RoleId INT PRIMARY KEY);
INSERT INTO @Roles (RoleId) SELECT DISTINCT RoleId FROM dbo.Sys_RoleUsers WHERE ISActive = 1;

-- ترتيب الشاشة: آخر واحدة تحت نفس القائمة
DECLARE @Sort INT = ISNULL((SELECT MAX(MODULE_SORT) FROM dbo.Sys_Modules
                            WHERE ISNULL(MODULE_MENU, N'') = @ParentMenu), 0) + 1;

BEGIN TRY
    BEGIN TRAN;

    -- =========================
    -- 1) Sys_Modules
    -- =========================
    IF NOT EXISTS (SELECT 1 FROM dbo.Sys_Modules WHERE MODULE_CODE = @ModuleCode)
    BEGIN
        INSERT INTO dbo.Sys_Modules
            (MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image, Icon_Color,
             MODULE_TYPE, MODULE_SORT, IS_Show,
             [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
             CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9,
             AVAILABLE, Images_Enabled)
        VALUES
            (@ModuleCode, @ParentMenu, @DescE, @DescA, N'', @IconColor,
             N'S', @Sort, 1,                    -- 'S' = شاشة ('M' = قائمة)
             1, 1, 1, 1, 1,
             0, 0, 0, 0, 0, 0, 0, 0, 0,
             1, 0);
        PRINT N'✅ اتضافت في Sys_Modules';
    END
    ELSE
        PRINT N'ℹ️ موجودة بالفعل في Sys_Modules';

    -- =========================
    -- 2) Sys_RoleModule  (صلاحيات كاملة لكل دور في @Roles)
    -- =========================
    INSERT INTO dbo.Sys_RoleModule
        (RoleId, MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image, Icon_Color,
         MODULE_TYPE, MODULE_SORT, IS_Show,
         EXECUTE, [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
         CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9,
         ViewImages, EditImages, Prc_Preference)
    SELECT
         r.RoleId, m.MODULE_CODE, m.MODULE_MENU, m.MODULE_DESCE, m.MODULE_DESCA, m.Url_Image, m.Icon_Color,
         m.MODULE_TYPE, m.MODULE_SORT, 1,
         1, 1, 1, 1, 1, 1,                      -- EXECUTE و IS_Show لازم 1 عشان تظهر في القائمة
         0, 0, 0, 0, 0, 0, 0, 0, 0,
         0, 0, 1
    FROM @Roles r
    CROSS JOIN dbo.Sys_Modules m
    WHERE m.MODULE_CODE = @ModuleCode
      AND NOT EXISTS (SELECT 1 FROM dbo.Sys_RoleModule x
                      WHERE x.RoleId = r.RoleId AND x.MODULE_CODE = @ModuleCode);

    PRINT N'✅ اتضافت لـ ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' دور في Sys_RoleModule';

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    PRINT N'❌ حصل خطأ ومفيش حاجة اتحفظت: ' + ERROR_MESSAGE();
END CATCH;
GO

-- =========================
-- 3) تأكيد: لازم تلاقي الشاشة هنا
--    هتلاقي صف لكل (دور × شركة × سنة مالية) لأن القالب بيربط بـ Sys_ControlYear
--    لازم EXECUTE = 1 و IS_Show = 1 عشان تظهر في القائمة
-- =========================
SELECT RoleId, CompCode, FIN_YEAR, MODULE_CODE, MODULE_DESCA, MODULE_MENU, MODULE_TYPE, IS_Show, EXECUTE
FROM dbo.IQ_Sys_RoleModule
WHERE MODULE_CODE = N'FinancialType';
