// ============================================================
// Code Generator — ScreenConfigV4 → .ts + page.tsx
// ============================================================

import {
  ScreenConfigV4, FieldConfigV4, DetailConfigV4, ValidationConfigV4,
} from "../types/ScreenConfig";
import { convertV4toV3 } from "./configConverter";

// ============================================================
// Helpers
// ============================================================

function q(s: string): string { return JSON.stringify(s); }
function camel(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1); }
function pascal(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text.split("\n").map(l => l ? pad + l : l).join("\n");
}

function fieldToColumnCode(f: FieldConfigV4, varPrefix: string = ""): string {
  const lines: string[] = ["{"];
  lines.push(`  field: ${q(f.field)},`);
  lines.push(`  title: t(${q(f.titleEn)}, ${q(f.titleAr)}),`);

  if (f.inputType === "number") {
    lines.push(`  type: "number",`);
    lines.push(`  inputType: "number",`);
  } else if (f.inputType === "date") {
    lines.push(`  type: "date",`);
    lines.push(`  inputType: "date",`);
  } else if (f.inputType === "checkbox") {
    lines.push(`  type: "checkbox",`);
  } else if (f.inputType === "textarea") {
    lines.push(`  inputType: "textarea",`);
  } else if (f.inputType === "select" && f.options) {
    lines.push(`  inputType: "select",`);
    lines.push(`  selectOptions: [${parseSelectOptions(f.options)}],`);
  }

  if (f.width !== 150) lines.push(`  width: ${f.width},`);

  if (!f.inGrid) lines.push(`  IsVisibleDisplayInGrid: false,`);
  if (!f.inForm) {
    lines.push(`  editable: false,`);
    lines.push(`  insertable: false,`);
  }
  if (f.required) lines.push(`  IsRequired: true,`);

  if (f.formula) lines.push(`  formula: ${q(f.formula)},`);

  const isSave = !f.formula && f.inForm;
  lines.push(`  IsSave: ${isSave},`);

  if (!f.search) lines.push(`  IsSearchColumn: false,`);

  if (f.defaultValue) {
    const dv = f.defaultValue;
    if (dv === "CompCode" || dv === "BranchCode" || dv === "UserID" || dv === "FinYear" || dv === "Today") {
      lines.push(`  DefaultValue: ${varPrefix}${dv},`);
    } else if (dv === "true" || dv === "false") {
      lines.push(`  DefaultValue: ${dv},`);
    } else if (!isNaN(Number(dv))) {
      lines.push(`  DefaultValue: ${dv},`);
    } else {
      lines.push(`  DefaultValue: ${q(dv)},`);
    }
  }

  if (f.auto) {
    const autoMap: Record<string, string> = {
      CompCode: "CompCode", BranchCode: "BranchCode", UserID: "UserID", FinYear: "FinYear",
    };
    if (autoMap[f.auto]) {
      lines.push(`  DefaultValue: ${varPrefix}${autoMap[f.auto]},`);
      lines.push(`  IsVisibleDisplayInGrid: false,`);
      lines.push(`  editable: false,`);
      lines.push(`  insertable: false,`);
    }
  }

  if (f.searchFn) {
    lines.push(`  SearchFn: ${q(f.searchFn)},`);
    if (f.searchCond) lines.push(`  SearchCond: ${q(f.searchCond)},`);
    if (f.fillFrom) lines.push(`  FillFrom: ${q(f.fillFrom)},`);
  }

  if (f.order !== 99) lines.push(`  SortFieldInEditAndAdd: ${f.order},`);

  if (f.dateDisplayFormat) lines.push(`  dateDisplayFormat: ${q(f.dateDisplayFormat)},`);
  if (f.dateMode === "datetime") lines.push(`  dateMode: "datetime",`);
  if (f.align && f.align !== "left") lines.push(`  align: ${q(f.align)},`);
  if (f.visibleInCreate === false) lines.push(`  visibleInCreate: false,`);
  if (f.visibleInEdit === false) lines.push(`  visibleInEdit: false,`);
  if (f.visibleInView === false) lines.push(`  visibleInView: false,`);

  lines.push("},");
  return lines.join("\n");
}

function parseSelectOptions(opts: string): string {
  if (!opts) return "";
  return opts.split("|").map(o => {
    const [val, lab] = o.split(":");
    return `{ value: ${q(val || "")}, label: ${q(lab || val || "")} }`;
  }).join(", ");
}

function validationToCode(v: ValidationConfigV4): string {
  const parts: string[] = ["{"];
  if (v.detail > 0) parts.push(`  detail: ${v.detail},`);
  parts.push(`  type: ${q(v.type)},`);
  parts.push(`  field: ${q(v.field)},`);
  if (v.when !== "both") parts.push(`  when: ${q(v.when)},`);
  if (v.operator) parts.push(`  operator: ${q(v.operator)},`);
  if (v.compareTo) parts.push(`  compareTo: ${q(v.compareTo)},`);
  if (v.value) parts.push(`  value: ${q(v.value)},`);
  if (v.min) parts.push(`  min: ${q(v.min)},`);
  if (v.max) parts.push(`  max: ${q(v.max)},`);
  if (v.pattern) parts.push(`  pattern: ${q(v.pattern)},`);
  if (v.table) parts.push(`  table: ${q(v.table)},`);
  if (v.condition) parts.push(`  condition: ${q(v.condition)},`);
  if (v.code) parts.push(`  code: ${q(v.code)},`);
  parts.push(`  messageAr: ${q(v.messageAr)},`);
  parts.push(`  messageEn: ${q(v.messageEn)},`);
  parts.push("},");
  return parts.join("\n");
}

// ============================================================
// Generate .ts (logic hook)
// ============================================================

export function generateHookFile(cfg: ScreenConfigV4): string {
  const name = cfg.module || "NewScreen";
  const isGrid = cfg.screenType === "Grid";

  const imports = [
    `import { useMemo } from "react";`,
    `import { useSys } from "../Shared/SystemUsing";`,
    `import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";`,
  ];

  if (cfg.validations.length > 0) {
    imports.push(`import { ValidationRule } from "../Shared/Validation";`);
  }

  if (!isGrid) {
    imports.push(`import { MasterDetailColumn, MasterDetailConfig } from "../Shared/Components/Import/ModelMasterDetail";`);
  }

  if (cfg.fields.some(f => f.inFilter) || cfg.listFields.some(f => f.inFilter)) {
    imports.push(`import { FilterFieldConfig } from "../Shared/Components/Import/AdvancedFilter";`);
  }

  const needsAutoVars = cfg.fields.some(f => f.auto) || cfg.details.some(d => d.fields.some(f => f.auto));

  // --- constants ---
  const constants: string[] = [
    `const TableName = ${q(cfg.table)};`,
  ];
  if (!isGrid && cfg.view) constants.push(`const ViewName = ${q(cfg.view)};`);
  constants.push(`const KeyColumn = ${q(cfg.keyColumn)};`);
  if (cfg.processTrans) {
    constants.push(`const TrType = ${q(cfg.trType)};`);
    constants.push(`const RunProcessTrans = true;`);
  } else {
    constants.push(`const TrType = "";`);
    constants.push(`const RunProcessTrans = false;`);
  }

  // --- columns code ---
  const columnsType = isGrid ? "DynamicGridColumn" : "MasterDetailColumn";
  const fieldsCode = cfg.fields.map(f => fieldToColumnCode(f)).join("\n");

  // --- list columns ---
  let listColumnsCode = "";
  if (!isGrid && cfg.listFields.length > 0) {
    listColumnsCode = cfg.listFields.map(f => fieldToColumnCode(f)).join("\n");
  }

  // --- details ---
  let detailColumnsCode = "";
  const detailMemoNames: string[] = [];
  for (let i = 0; i < cfg.details.length; i++) {
    const d = cfg.details[i];
    const dName = `Detail${i + 1}Columns`;
    detailMemoNames.push(dName);
    const dFields = d.fields.map(f => fieldToColumnCode(f)).join("\n");
    detailColumnsCode += `
  const ${dName} = useMemo<${columnsType}[]>(
    () => [
${indent(dFields, 6)}
    ],
    [IsLangEN${needsAutoVars ? ", CompCode, BranchCode" : ""}]
  );
`;
  }

  // --- filter fields ---
  const filterableFields = isGrid ? cfg.fields.filter(f => f.inFilter) : cfg.listFields.filter(f => f.inFilter);
  let filterCode = "";
  if (filterableFields.length > 0) {
    const fItems = filterableFields.map((f, i) => {
      const parts = [
        `{ field: ${q(f.field)}, label: t(${q(f.titleEn)}, ${q(f.titleAr)}), type: ${q(guessFilterType(f))}`,
      ];
      parts.push(`, sortOrder: ${i + 1} }`);
      return parts.join("");
    }).join(",\n");
    filterCode = `
  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
${indent(fItems, 6)}
    ],
    [IsLangEN]
  );`;
  }

  // --- validations ---
  let validationsCode = "";
  if (cfg.validations.length > 0) {
    const vItems = cfg.validations.map(v => validationToCode(v)).join("\n");
    validationsCode = `
  const Validations = useMemo<ValidationRule[]>(
    () => [
${indent(vItems, 6)}
    ],
    [IsLangEN]
  );`;
  }

  // --- build Config for MasterDetail ---
  let configCode = "";
  if (!isGrid) {
    const detailsArr = cfg.details.map((d, i) => {
      const totalsStr = d.totals ? parseTotals(d.totals) : "[]";
      return `        {
          title: t(${q(d.titleEn)}, ${q(d.titleAr)}),
          tableName: ${q(d.table)},
          viewName: ${q(d.view || "")},
          keyColumn: ${q(d.keyColumn)},
          foreignKeyColumn: ${q(d.foreignKey)},
          columns: Detail${i + 1}Columns,
          totals: ${totalsStr},
          orderBy: ${q(d.orderBy || d.keyColumn)},
        }`;
    }).join(",\n");

    const memoDeps = [
      "IsLangEN", "CompCode", "BranchCode", "MasterColumns", "ListColumns",
      ...detailMemoNames, "FilterFields",
      cfg.validations.length > 0 ? "Validations" : "",
    ].filter(Boolean).join(", ");

    configCode = `
  const Config = useMemo<MasterDetailConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      columns: MasterColumns,
      listColumns: ListColumns,
      details: [
${detailsArr}
      ],
      condition: \`CompCode = \${CompCode} AND BranchCode = \${BranchCode}\`,
      orderBy: ${q(cfg.orderBy || cfg.keyColumn)},
      orderType: ${q(cfg.orderType)},
      pageSize: ${cfg.pageSize},
      filterFields: FilterFields,
      compCode: CompCode,
      branchCode: BranchCode,
      keyTrType: TrType,
      runProcessTrans: RunProcessTrans,
      ${cfg.validations.length > 0 ? "validations: Validations," : ""}
      enableInsert: ${cfg.permissions.insert},
      enableUpdate: ${cfg.permissions.edit},
      enableDelete: ${cfg.permissions.delete},
      newTitle: t(${q("New " + cfg.titleEn)}, ${q("إضافة " + cfg.titleAr)}),
      editTitle: t(${q(cfg.titleEn)}, ${q(cfg.titleAr)}),
    }),
    [${memoDeps}]
  );`;
  }

  // --- return ---
  let returnObj: string;
  if (isGrid) {
    returnObj = `  return {
    IsLangEN,
    IsDark,
    gridKey,
    RefreshGrid,
    grid: {
      TableName,
      KeyColumn,
      TrType,
      RunProcessTrans,
      Condition,
      CompCode,
      BranchCode,
      Columns,
      FilterFields,
    },
  };`;
  } else {
    returnObj = `  return {
    IsLangEN,
    IsDark,
    Config,
  };`;
  }

  // --- assemble ---
  const v3json = JSON.stringify(convertV4toV3(cfg));
  const v4json = JSON.stringify(cfg);

  const body = `"use client";

${imports.join("\n")}

// =======================
// #region ثوابت الشاشة
// =======================
${constants.join("\n")}
// #endregion

// =======================
// ${name}
// =======================
export function ${name}() {
  // =======================
  // #region UsingSystem
  // =======================
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);

  const CompCode = Session?.CurrentEnvironment?.CompCode || 1;
  const BranchCode = Session?.CurrentEnvironment?.BranchCode || 1;${needsAutoVars ? `
  const UserID = Session?.CurrentEnvironment?.UserID || 0;
  const FinYear = Session?.CurrentEnvironment?.FinYear || new Date().getFullYear();` : ""}
  const Today = new Date().toISOString().substring(0, 10);
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
${isGrid ? `
  const [gridKey, setGridKey] = useState(0);
  function RefreshGrid() { setGridKey((k) => k + 1); }
` : ""}
  const Condition = \`CompCode = \${CompCode}\`;

  // =======================
  // #region الأعمدة
  // =======================
  const ${isGrid ? "Columns" : "MasterColumns"} = useMemo<${columnsType}[]>(
    () => [
${indent(fieldsCode, 6)}
    ],
    [IsLangEN${needsAutoVars ? ", CompCode, BranchCode" : ""}]
  );
${!isGrid && listColumnsCode ? `
  const ListColumns = useMemo<${columnsType}[]>(
    () => [
${indent(listColumnsCode, 6)}
    ],
    [IsLangEN]
  );
` : ""}${detailColumnsCode}
  // #endregion
${filterCode}
${validationsCode}
${configCode}

${returnObj}
}
// @CreatePageReact-Settings: ${v3json}
// @ScreenBuilder-Settings: ${v4json}
`;

  // fix useState import for grid
  if (isGrid) {
    return body.replace(
      `import { useMemo } from "react";`,
      `import { useMemo, useState } from "react";`
    );
  }

  return body;
}

// ============================================================
// Generate page.tsx
// ============================================================

export function generatePageFile(cfg: ScreenConfigV4): string {
  const name = cfg.module || "NewScreen";
  const isGrid = cfg.screenType === "Grid";
  const icon = cfg.icon || "fa-table-list";

  if (isGrid) {
    return `"use client";

import { ${name} } from "./${name}";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}EN.css" />
  ) : (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}AR.css" />
  );

  const page = ${name}();
  return <${name}Page {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof ${name}>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function ${name}Page(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;
  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500" : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-4 space-y-4">
        <div className={\`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 \${card}\`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
              <i className="fa-solid ${icon}"></i>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">{L.${camel(name)}_title}</h1>
              <p className={\`text-sm \${muted}\`}>{L.${camel(name)}_subtitle}</p>
            </div>
          </div>
          <button onClick={p.RefreshGrid} className={\`px-4 py-2 rounded-xl border-2 font-medium transition \${btnSecondary}\`}>
            <i className="fa-solid fa-rotate mx-1"></i> {L.${camel(name)}_refresh}
          </button>
        </div>

        <DynamicGrid
          key={p.gridKey}
          tableName={p.grid.TableName}
          keyColumn={p.grid.KeyColumn}
          columns={p.grid.Columns}
          condition={p.grid.Condition}
          orderBy={p.grid.KeyColumn}
          orderType="${cfg.orderType}"
          pageSize={${cfg.pageSize}}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType={p.grid.TrType}
          runProcessTrans={p.grid.RunProcessTrans}
          height="calc(100vh - 140px)"
          enableInsert={${cfg.permissions.insert}}
          enableUpdate={${cfg.permissions.edit}}
          enableDelete={${cfg.permissions.delete}}
          enableSearch={true}
          enableExport={${cfg.permissions.export}}
          enableSort={true}
          enableAdvancedFilter={true}
          filterFields={p.grid.FilterFields}
        />
      </div>
    </>
  );
}
`;
  }

  // MasterDetail page
  return `"use client";

import { ${name} } from "./${name}";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import MasterDetail from "../Shared/Components/Import/MasterDetail";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}EN.css" />
  ) : (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}AR.css" />
  );

  const page = ${name}();
  return <${name}Page {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof ${name}>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function ${name}Page(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;
  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";

  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-4 space-y-4">
        <div className={\`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex items-center gap-3 \${card}\`}>
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
            <i className="fa-solid ${icon}"></i>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold truncate">{L.${camel(name)}_title}</h1>
            <p className={\`text-sm \${muted}\`}>{L.${camel(name)}_subtitle}</p>
          </div>
        </div>

        <MasterDetail config={p.Config} />
      </div>
    </>
  );
}
`;
}

// ============================================================
// Utility
// ============================================================

function guessFilterType(f: FieldConfigV4): string {
  if (f.inputType === "date") return "date";
  if (f.inputType === "number") return "number";
  if (f.inputType === "checkbox") return "boolean";
  if (f.inputType === "select") return "select";
  return "text";
}

function parseTotals(totals: string): string {
  if (!totals) return "[]";
  return "[" + totals.split("|").map(t => {
    const [mf, df, tp] = t.split(":");
    return `{ masterField: ${q(mf || "")}, detailField: ${q(df || "")}, type: ${q(tp || "sum")} }`;
  }).join(", ") + "]";
}

// ============================================================
// Generate SQL Permissions Script
// ============================================================

export function generateSqlScript(cfg: ScreenConfigV4, database: string): string {
  const p = cfg.permissions;
  const module = cfg.module;
  const titleAr = cfg.titleAr || module;
  const titleEn = cfg.titleEn || module;
  const parentMenu = p.parentMenu || "";
  const iconColor = cfg.iconColor || "indigo";
  const icon = cfg.icon || "fa-table-list";
  const rolesStr = p.roles;

  return `USE [${database}]
GO

DECLARE @ModuleCode NVARCHAR(100) = N'${module}'
DECLARE @TitleAr NVARCHAR(200) = N'${titleAr}'
DECLARE @TitleEn NVARCHAR(200) = N'${titleEn}'
DECLARE @ParentMenu NVARCHAR(100) = N'${parentMenu}'
DECLARE @IconColor NVARCHAR(50) = N'${iconColor}'
DECLARE @Icon NVARCHAR(100) = N'${icon}'

DECLARE @Roles TABLE (RoleId INT)
${rolesStr
    ? rolesStr.split(",").map(r => `INSERT INTO @Roles VALUES (${r.trim()})`).join("\n")
    : `INSERT INTO @Roles SELECT RoleId FROM Sys_RoleUsers WHERE IsActive = 1 GROUP BY RoleId`
  }

DECLARE @Sort INT = ISNULL((SELECT MAX(MODULE_SORT) FROM Sys_Modules WHERE MODULE_MENU = @ParentMenu), 0) + 1

BEGIN TRANSACTION
BEGIN TRY

    IF NOT EXISTS (SELECT 1 FROM Sys_Modules WHERE MODULE_CODE = @ModuleCode)
    BEGIN
        INSERT INTO Sys_Modules (MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Icon_Color, MODULE_ICON,
            MODULE_SORT, [EXECUTE], [CREATE], [EDIT], [DELETE], [PRINT], [VIEW], [CUSTOM], AVAILABLE)
        VALUES (@ModuleCode, @ParentMenu, @TitleEn, @TitleAr, @IconColor, @Icon,
            @Sort, 1, 1, 1, 1, 1, 1, 0, 1)
    END

    INSERT INTO Sys_RoleModule (RoleId, MODULE_CODE, UserID,
        [EXECUTE], [CREATE], [EDIT], [DELETE], [PRINT], [VIEW], [CUSTOM],
        MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Icon_Color, MODULE_ICON, MODULE_SORT, IS_Show)
    SELECT r.RoleId, @ModuleCode, 0,
        1, 1, 1, 1, 1, 1, 0,
        @ParentMenu, @TitleEn, @TitleAr, @IconColor, @Icon, @Sort, 1
    FROM @Roles r
    WHERE NOT EXISTS (
        SELECT 1 FROM Sys_RoleModule rm
        WHERE rm.RoleId = r.RoleId AND rm.MODULE_CODE = @ModuleCode AND rm.UserID = 0
    )

    COMMIT TRANSACTION
    PRINT 'Module [' + @ModuleCode + '] added successfully.'
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION
    PRINT 'Error: ' + ERROR_MESSAGE()
END CATCH
GO
${cfg.processTrans ? `
-- G_ProcessTrans branch for TrType = '${cfg.trType}'
-- Add this inside G_ProcessTrans:
/*
IF @TrType = '${cfg.trType}'
BEGIN
    SAVE TRANSACTION SavePoint_${cfg.trType}
    BEGIN TRY
        -- Your logic here
        SET @Ok = 1
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION SavePoint_${cfg.trType}
        SET @Ok = 0
        SET @Msg = ERROR_MESSAGE()
    END CATCH
END
*/
` : ""}`;
}

// ============================================================
// Generate Resources.ts entries
// ============================================================

export function generateResourcesEntries(cfg: ScreenConfigV4): { en: string; ar: string } {
  const name = camel(cfg.module || "newScreen");
  const en = [
    `  ${name}_title: "${cfg.titleEn || cfg.module}",`,
    `  ${name}_subtitle: "${cfg.subEn || ""}",`,
    `  ${name}_refresh: "Refresh",`,
  ].join("\n");
  const ar = [
    `  ${name}_title: "${cfg.titleAr || cfg.module}",`,
    `  ${name}_subtitle: "${cfg.subAr || ""}",`,
    `  ${name}_refresh: "تحديث",`,
  ].join("\n");
  return { en, ar };
}

// ============================================================
// Generate Routes.tsx entry
// ============================================================

export function generateRoutesEntry(module: string): string {
  return `  ${module}: HomeLayout,`;
}
