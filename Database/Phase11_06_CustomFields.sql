-- Phase11_06_CustomFields.sql  (Wave 1 - custom fields, no schema change)  Idempotent.
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Sys_CustomFieldEntity', N'U') IS NULL
CREATE TABLE dbo.Sys_CustomFieldEntity (
    EntityCode VARCHAR(60)   NOT NULL CONSTRAINT PK_Sys_CustomFieldEntity PRIMARY KEY,
    TableName  NVARCHAR(128) NOT NULL,
    ViewName   NVARCHAR(128) NULL,
    KeyColumn  NVARCHAR(128) NOT NULL,
    ModuleCode NVARCHAR(100) NULL,
    NameA      NVARCHAR(100) NOT NULL,
    NameE      NVARCHAR(100) NOT NULL,
    IsActive   BIT           NOT NULL CONSTRAINT DF_Sys_CustomFieldEntity_IsActive DEFAULT (1),
    RowVer     ROWVERSION    NOT NULL,
    CONSTRAINT UQ_Sys_CustomFieldEntity_Table UNIQUE (TableName)
);
GO
IF OBJECT_ID(N'dbo.Sys_CustomFieldDef', N'U') IS NULL
CREATE TABLE dbo.Sys_CustomFieldDef (
    FieldId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_CustomFieldDef PRIMARY KEY,
    EntityCode   VARCHAR(60)    NOT NULL CONSTRAINT FK_Sys_CustomFieldDef_Entity REFERENCES dbo.Sys_CustomFieldEntity (EntityCode),
    FieldCode    VARCHAR(40)    NOT NULL,
    LabelA       NVARCHAR(100)  NOT NULL,
    LabelE       NVARCHAR(100)  NOT NULL,
    FieldType    VARCHAR(10)    NOT NULL,
    IsRequired   BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Req DEFAULT (0),
    MaxLength    INT            NULL,
    MinValue     DECIMAL(18,4)  NULL,
    MaxValue     DECIMAL(18,4)  NULL,
    Regex        NVARCHAR(200)  NULL,
    OptionsJson  NVARCHAR(MAX)  NULL,          -- [{"v":"A","a":"...","e":"..."}]
    LookupJson   NVARCHAR(1000) NULL,          -- {"table":"...","value":"...","label":"..."}
    DefaultValue NVARCHAR(200)  NULL,
    ShowInGrid   BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Grid DEFAULT (1),
    ShowInForm   BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Form DEFAULT (1),
    IsReadOnly   BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_RO DEFAULT (0),
    SortOrder    INT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Sort DEFAULT (0),
    GroupName    NVARCHAR(60)   NULL,
    CompCode     INT            NULL,
    IsActive     BIT            NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_IsActive DEFAULT (1),
    UpdatedAt    DATETIME2(0)   NOT NULL CONSTRAINT DF_Sys_CustomFieldDef_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy    NVARCHAR(100)  NULL,
    RowVer       ROWVERSION     NOT NULL,
    CONSTRAINT UQ_Sys_CustomFieldDef UNIQUE (EntityCode, FieldCode),
    CONSTRAINT CK_Sys_CustomFieldDef_Type CHECK (FieldType IN ('text','textarea','int','decimal','date','datetime','bool','select','lookup')),
    CONSTRAINT CK_Sys_CustomFieldDef_Code CHECK (FieldCode NOT LIKE '%[^A-Za-z0-9_]%' AND FieldCode LIKE '[A-Za-z]%'),
    CONSTRAINT CK_Sys_CustomFieldDef_Options CHECK (OptionsJson IS NULL OR ISJSON(OptionsJson) = 1),
    CONSTRAINT CK_Sys_CustomFieldDef_Lookup CHECK (LookupJson IS NULL OR ISJSON(LookupJson) = 1),
    CONSTRAINT CK_Sys_CustomFieldDef_Select CHECK (FieldType <> 'select' OR OptionsJson IS NOT NULL),
    CONSTRAINT CK_Sys_CustomFieldDef_LookupReq CHECK (FieldType <> 'lookup' OR LookupJson IS NOT NULL)
);
GO
IF OBJECT_ID(N'dbo.Sys_RecordExtra', N'U') IS NULL
CREATE TABLE dbo.Sys_RecordExtra (
    EntityCode   VARCHAR(60)   NOT NULL,
    RecordKey    NVARCHAR(100) NOT NULL,
    ExtraJson    NVARCHAR(MAX) NOT NULL,
    UpdatedAtUtc DATETIME2(0)  NOT NULL CONSTRAINT DF_Sys_RecordExtra_Updated DEFAULT (SYSUTCDATETIME()),
    UpdatedBy    INT           NULL,
    CONSTRAINT PK_Sys_RecordExtra PRIMARY KEY (EntityCode, RecordKey),
    CONSTRAINT CK_Sys_RecordExtra_Json CHECK (ISJSON(ExtraJson) = 1)
);
GO
