/* =====================================================================
   Phase 3 - Per-user menu ordering + favorites
   REVIEW BEFORE RUNNING  (idempotent: safe to run more than once)

   What it does:
     1) Creates table  Sys_UserMenu  (per user + company menu order / hidden flag)
     2) Adds a NULLable column  SortOrder  to  Sys_Favorites  (favorites order)
        - no existing column is dropped or altered
        - existing unique index UX_Favorites_User_Page (UserId, MODULE_CODE)
          already exists, so no new index is added on Sys_Favorites.
          (Favorites are therefore per user, shared across companies.)
   Target DB: ESSA_React
   ===================================================================== */

-- 1) Sys_UserMenu ------------------------------------------------------
IF OBJECT_ID(N'dbo.Sys_UserMenu', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sys_UserMenu
    (
        Id           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sys_UserMenu PRIMARY KEY,
        UserID       INT           NOT NULL,
        CompCode     INT           NOT NULL,
        MODULE_CODE  NVARCHAR(100) NOT NULL,
        ParentCode   NVARCHAR(100) NULL,
        SortOrder    INT           NOT NULL,
        IsHidden     BIT           NOT NULL CONSTRAINT DF_Sys_UserMenu_IsHidden DEFAULT (0),
        UpdatedAt    DATETIME      NULL     CONSTRAINT DF_Sys_UserMenu_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_Sys_UserMenu_User_Comp_Module UNIQUE (UserID, CompCode, MODULE_CODE)
    );
    PRINT 'Sys_UserMenu created.';
END
ELSE
    PRINT 'Sys_UserMenu already exists - skipped.';
GO

-- 2) Sys_Favorites.SortOrder (nullable) --------------------------------
IF OBJECT_ID(N'dbo.Sys_Favorites', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Sys_Favorites', N'SortOrder') IS NULL
BEGIN
    ALTER TABLE dbo.Sys_Favorites ADD SortOrder INT NULL;
    PRINT 'Sys_Favorites.SortOrder added.';
END
ELSE
    PRINT 'Sys_Favorites.SortOrder already exists (or table missing) - skipped.';
GO

-- 3) Back-fill SortOrder for existing favorites (by CreatedAt, then id) -
IF COL_LENGTH(N'dbo.Sys_Favorites', N'SortOrder') IS NOT NULL
BEGIN
    ;WITH x AS (
        SELECT FavoriteId,
               ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY CreatedAt, FavoriteId) AS rn
        FROM dbo.Sys_Favorites
        WHERE SortOrder IS NULL
    )
    UPDATE f SET f.SortOrder = x.rn
    FROM dbo.Sys_Favorites f JOIN x ON x.FavoriteId = f.FavoriteId;
END
GO
