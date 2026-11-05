-- =====================================================================================
--  Phase7_Reports.sql   ***  REVIEW BEFORE RUNNING  ***
--  المرحلة 7: التقارير والطباعة (Stimulsoft Reports.JS)
-- -------------------------------------------------------------------------------------
--  السكربت ده ماتشغّلش لسه. اقراه الأول، وبعدين شغّله على ESSA_React.
--  - مش لازم تشغّله عشان التقارير تشتغل: الباك إند بيخزّن التعريفات والتصاميم كملفات
--    تحت Backend/App_Data/Reports. أول ما الجداول دي تتعمل الباك بيستخدمها تلقائي
--    (بيفحص كل 30 ثانية) — والملفات القديمة مابتتنقلش لوحدها.
--  - Idempotent: ينفع يتشغّل أكتر من مرة. مفيش DROP لأي حاجة.
--
--  الأقسام:
--    A) Sys_Reports        تعريف التقرير (كود، اسم، نوع قائمة/مستند، الشاشة، الإجراء)
--    B) Sys_ReportParams   ربط باراميترات الإجراء (فلتر / جلسة / ثابت / trid)
--    C) Sys_ReportLayouts  تصاميم التقرير (نطاق: الكل / شركة / فرع) + المقاس والاتجاه والهوامش
--    D) تسجيل شاشة إدارة التقارير Sys_ReportsAdmin تحت Menu_Admin
-- =====================================================================================
USE [ESSA_React];
GO

SET NOCOUNT ON;
GO

-- A) Sys_Reports ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Sys_Reports', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sys_Reports
    (
        ReportCode   NVARCHAR(100)  NOT NULL CONSTRAINT PK_Sys_Reports PRIMARY KEY,
        NameA        NVARCHAR(200)  NULL,
        NameE        NVARCHAR(200)  NULL,
        Kind         VARCHAR(20)    NOT NULL CONSTRAINT DF_Sys_Reports_Kind DEFAULT ('list'),
        MODULE_CODE  NVARCHAR(100)  NULL,          -- الشاشة اللي صلاحية PRINT بتاعتها مطلوبة (فاضي = أي مستخدم داخل)
        ProcName     NVARCHAR(256)  NULL,
        IsActive     BIT            NOT NULL CONSTRAINT DF_Sys_Reports_IsActive DEFAULT (1),
        CreatedAt    DATETIME       NULL CONSTRAINT DF_Sys_Reports_Created DEFAULT (GETDATE()),
        UpdatedAt    DATETIME       NULL CONSTRAINT DF_Sys_Reports_Updated DEFAULT (GETDATE()),
        CONSTRAINT CK_Sys_Reports_Kind CHECK (Kind IN ('list', 'transaction'))
    );
    PRINT N'A) اتعمل الجدول Sys_Reports';
END
ELSE PRINT N'A) الجدول Sys_Reports موجود بالفعل';
GO

-- B) Sys_ReportParams ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.Sys_ReportParams', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sys_ReportParams
    (
        ReportCode   NVARCHAR(100)  NOT NULL,
        ParamName    NVARCHAR(128)  NOT NULL,      -- اسم الباراميتر من غير @
        Source       VARCHAR(20)    NOT NULL,      -- filter | session | const | trid
        SourceValue  NVARCHAR(400)  NULL,          -- حقل الفلتر (أو Field.from / Field.to) | CompCode.. | قيمة ثابتة | عمود المفتاح
        SortOrder    INT            NOT NULL CONSTRAINT DF_Sys_ReportParams_Sort DEFAULT (0),
        CONSTRAINT PK_Sys_ReportParams PRIMARY KEY (ReportCode, ParamName),
        CONSTRAINT FK_Sys_ReportParams_Reports FOREIGN KEY (ReportCode) REFERENCES dbo.Sys_Reports (ReportCode),
        CONSTRAINT CK_Sys_ReportParams_Source CHECK (Source IN ('filter', 'session', 'const', 'trid'))
    );
    PRINT N'B) اتعمل الجدول Sys_ReportParams';
END
ELSE PRINT N'B) الجدول Sys_ReportParams موجود بالفعل';
GO

-- C) Sys_ReportLayouts ---------------------------------------------------------------
IF OBJECT_ID(N'dbo.Sys_ReportLayouts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sys_ReportLayouts
    (
        LayoutId     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_ReportLayouts PRIMARY KEY,
        ReportCode   NVARCHAR(100)  NOT NULL,
        Scope        VARCHAR(10)    NOT NULL,      -- all | company | branch  (الأخص يكسب: فرع > شركة > الكل)
        CompCode     INT            NULL,
        BranchCode   INT            NULL,
        PaperSize    VARCHAR(20)    NOT NULL CONSTRAINT DF_Sys_ReportLayouts_Paper DEFAULT ('A4'),   -- A4 | A5 | Letter | Thermal80 | Thermal58 | Custom
        Orientation  VARCHAR(10)    NOT NULL CONSTRAINT DF_Sys_ReportLayouts_Orient DEFAULT ('portrait'),
        MarginsJson  NVARCHAR(400)  NULL,          -- {"left":1,"right":1,"top":1,"bottom":1,"customWidth":..,"customHeight":..} بالسنتيمتر
        LayoutMrt    NVARCHAR(MAX)  NULL,          -- ملف تصميم Stimulsoft (.mrt)
        IsDefault    BIT            NOT NULL CONSTRAINT DF_Sys_ReportLayouts_Default DEFAULT (0),
        UpdatedAt    DATETIME       NULL CONSTRAINT DF_Sys_ReportLayouts_Updated DEFAULT (GETDATE()),
        UpdatedBy    NVARCHAR(100)  NULL,
        CONSTRAINT FK_Sys_ReportLayouts_Reports FOREIGN KEY (ReportCode) REFERENCES dbo.Sys_Reports (ReportCode),
        CONSTRAINT CK_Sys_ReportLayouts_Scope CHECK (Scope IN ('all', 'company', 'branch')),
        CONSTRAINT CK_Sys_ReportLayouts_Orient CHECK (Orientation IN ('portrait', 'landscape'))
    );
    CREATE INDEX IX_Sys_ReportLayouts_Lookup ON dbo.Sys_ReportLayouts (ReportCode, Scope, CompCode, BranchCode);
    PRINT N'C) اتعمل الجدول Sys_ReportLayouts';
END
ELSE PRINT N'C) الجدول Sys_ReportLayouts موجود بالفعل';
GO

-- D) شاشة إدارة التقارير (محتاج Phase4_Permissions.sql اتشغّل قبله: الإجراء Sys_RegisterModule + Menu_Admin) -------------
IF OBJECT_ID(N'dbo.Sys_RegisterModule', N'P') IS NOT NULL
BEGIN
    EXEC dbo.Sys_RegisterModule N'Sys_ReportsAdmin', N'إدارة التقارير', N'Reports', N'Menu_Admin', N'S', 50, N'', N'indigo';
    PRINT N'D) اتسجّلت الشاشة Sys_ReportsAdmin (اخرج وادخل تاني عشان تظهر في القايمة)';
END
ELSE PRINT N'D) الإجراء Sys_RegisterModule مش موجود - شغّل Phase4_Permissions.sql الأول';
GO

-- ملاحظة: لو عايز تنقل التعريفات والتصاميم اللي اتعملت كملفات للجداول: افتح Backend/App_Data/Reports
-- (definitions.json / layouts.json / layouts/*.mrt) وانقلها يدوي أو أعد حفظها من شاشة إدارة التقارير بعد تشغيل السكربت.
