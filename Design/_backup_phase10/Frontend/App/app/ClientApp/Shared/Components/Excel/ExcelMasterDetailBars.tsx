"use client";

// =====================================================================================
//  📄 Shared/Components/Excel/ExcelMasterDetailBars.tsx  —  إكسل لشاشات الماستر ديتيل
// -------------------------------------------------------------------------------------
//  1) ExcelMasterBar  (في القايمة)  : معاملات كتير في ملف واحد (GroupNo). كل معاملة = InsertMasterDetail لوحدها
//                                      (نفس الحفظ العادي: بيشغّل G_ProcessTrans لو الشاشة مظبوطة كده).
//                                      لو معاملة فشلت، المعاملات التانية مش بتتأثر — وبيطلع تقرير بالفاشل وسببه.
//  2) ExcelDetailsBar (جوه الفورم)  : سطور تفاصيل بس بتتضاف للفاتورة المفتوحة (مفيش حفظ لحد ما اليوزر يدوس حفظ).
//
//  الدوال المساعدة (emptyRow / recalc / buildSaveRow) بتتبعت من MasterDetail.tsx عشان مايحصلش استيراد دائري.
// =====================================================================================

import React, { useMemo } from "react";
import { SQL } from "../../CallDataBase";
import { Sys } from "../../SystemTools";
import { useSys } from "../../SystemUsing";
import { RunValidations } from "../../Validation";
import type { MasterDetailColumn, MasterDetailConfig } from "../Import/ModelMasterDetail";
import ExcelBar from "./ExcelBar";
import { buildColumnSpecs } from "./ExcelColumns";
import { isBlank } from "./ExcelCore";
import type { CommitOutcome, RecordIssue } from "./ExcelImportModal";
import { ExcelMasterDetailConfig, ImportRecord } from "./ExcelTypes";

type Row = Record<string, any>;

export interface MdExcelHelpers {
  emptyRow: (columns: MasterDetailColumn[]) => Row;
  recalc: (master: Row, details: Row[][], config: MasterDetailConfig) => { master: Row; details: Row[][] };
  buildSaveRow: (row: Row, columns: MasterDetailColumn[], skip: string[]) => Row;
}

interface CommonProps {
  config: MasterDetailConfig;
  excel: ExcelMasterDetailConfig;
  helpers: MdExcelHelpers;
}

const detailIdx = (config: MasterDetailConfig, excel: ExcelMasterDetailConfig) =>
  Math.min(Math.max(0, excel.detailIndex ?? 0), Math.max(0, config.details.length - 1));

function useSpecs(config: MasterDetailConfig, excel: ExcelMasterDetailConfig, withMaster: boolean) {
  const di = detailIdx(config, excel);
  return useMemo(() => {
    const d = config.details[di];
    const totalsFields = config.details.flatMap((x) => (x.totals || []).map((t) => t.masterField));
    const master = withMaster
      ? buildColumnSpecs(config.columns, { scope: "master", include: excel.masterColumns, exclude: excel.masterColumns && excel.masterColumns.length ? [] : [config.keyColumn, ...totalsFields], lookups: excel.lookups })
      : [];
    const detail = d
      ? buildColumnSpecs(d.columns, { scope: "detail", include: excel.detailColumns, exclude: [d.keyColumn, d.foreignKeyColumn], lookups: excel.detailLookups })
      : [];
    return { di, master, detail };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, excel.masterColumns, excel.detailColumns, excel.lookups, excel.detailLookups, withMaster]);
}

const keepValue = (values: Row, key: string) => {
  const v = values[key];
  return v === undefined || v === null || v === "" ? undefined : v;
};

// =====================================================================================
//  معاملات كتير (في القايمة)
// =====================================================================================
export function ExcelMasterBar({ config, excel, helpers, onDone }: CommonProps & { onDone?: () => void }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const { di, master: masterSpecs, detail: detailSpecs } = useSpecs(config, excel, true);
  const specs = useMemo(() => [...masterSpecs, ...detailSpecs], [masterSpecs, detailSpecs]);
  const detailCfg = config.details[di];

  // بناء الماستر + صفوف التفاصيل من معاملة الإكسل
  const build = (rec: ImportRecord) => {
    const first = rec.rows[0];
    const master: Row = helpers.emptyRow(config.columns);
    for (const c of config.columns) {
      const v = keepValue(first.values, "m." + c.field);
      if (v !== undefined) master[c.field] = v;
    }
    const rows: Row[] = rec.rows.map((r) => {
      const row = helpers.emptyRow(detailCfg ? detailCfg.columns : []);
      for (const c of detailCfg ? detailCfg.columns : []) {
        const v = keepValue(r.values, "d." + c.field);
        if (v !== undefined) row[c.field] = v;
      }
      return row;
    });
    const details = config.details.map((_, i) => (i === di ? rows : []));
    return helpers.recalc(master, details, config);
  };

  // نفس فحص الشاشة المدمج (إجباري / IsValid) على كل الأعمدة حتى اللي مش في التمبلت
  const builtIn = (final: { master: Row; details: Row[][] }): RecordIssue | null => {
    const bad = (c: MasterDetailColumn, row: Row, editableNow: boolean) => {
      if (!editableNow || c.formula) return null;
      const v = row[c.field];
      if (c.IsRequired && isBlank(v)) return c.validationMessage || (IsLangEN ? `${c.title} is required` : `${c.title} مطلوب`);
      if (c.IsValid && !isBlank(v) && !c.IsValid(v, row)) return c.validationMessage || (IsLangEN ? `Invalid value for ${c.title}` : `قيمة غير صحيحة في ${c.title}`);
      return null;
    };
    for (const c of config.columns) {
      const m = bad(c, final.master, c.insertable !== false);
      if (m) return { message: m, field: c.field, scope: "master" };
    }
    const rows = final.details[di] || [];
    for (let i = 0; i < rows.length; i++) {
      for (const c of detailCfg ? detailCfg.columns : []) {
        const m = bad(c, rows[i], c.editable !== false);
        if (m) return { message: m, rowIndex: i, field: c.field, scope: "detail" };
      }
    }
    return null;
  };

  const validateRecord = async (rec: ImportRecord): Promise<RecordIssue[]> => {
    const final = build(rec);
    const b = builtIn(final);
    if (b) return [b];
    const vErr = await RunValidations(config.validations, final.master, final.details, {
      isInsert: true,
      isLangEN: IsLangEN,
      tableName: config.tableName,
      keyColumn: config.keyColumn,
      details: config.details.map((d) => ({ tableName: d.tableName, keyColumn: d.keyColumn })),
    });
    if (!vErr) return [];
    if (vErr.detail && vErr.detail - 1 === di && vErr.rowIndex !== undefined) return [{ message: vErr.message, rowIndex: vErr.rowIndex, field: vErr.field, scope: "detail" }];
    if (vErr.field && !vErr.detail) return [{ message: vErr.message, field: vErr.field, scope: "master" }];
    return [{ message: vErr.message }];
  };

  const commit = async (recs: ImportRecord[]): Promise<CommitOutcome> => {
    // معاملة واحدة في كل مرة (chunkSize = 1) — كل معاملة ترانزاكشن مستقلة
    const rec = recs[0];
    try {
      const final = build(rec);
      const masterData = helpers.buildSaveRow(final.master, config.columns, [config.keyColumn]);
      const request: any = {
        compCode: config.compCode,
        branchCode: config.branchCode,
        keyTrType: config.keyTrType || "",
        masterKeyColumn: config.keyColumn,
        runProcessTrans: !!config.runProcessTrans,
        master: { tableName: config.tableName, data: masterData },
      };
      config.details.forEach((d, i) => {
        const dataList = (final.details[i] || []).map((r) => helpers.buildSaveRow(r, d.columns, [d.keyColumn, d.foreignKeyColumn]));
        const wrapper: any = { detailForeignKeyColumn: d.foreignKeyColumn };
        if (dataList.length > 0) wrapper.bulkInsertRequest = { tableName: d.tableName, dataList };
        request["detail_" + (i + 1)] = wrapper;
      });
      const res = await SQL.InsertMasterDetail(request, null, null);
      if (res?.IsSuccess) return { ok: true };
      return { ok: false, message: res?.ErrorMessage || "Unknown error" };
    } catch (e: any) {
      return { ok: false, message: Sys.GetErrorMessage(e) };
    }
  };

  return (
    <ExcelBar
      mode="multi"
      columns={specs}
      templateName={excel.templateName || config.tableName}
      screenTitle={excel.templateName || config.newTitle || config.tableName}
      commitKind="save"
      maxRows={excel.maxRows ?? 20000}
      maxRecords={excel.maxTransactions ?? 1000}
      chunkSize={1}
      validateRecord={validateRecord}
      commit={commit}
      onDone={() => onDone?.()}
    />
  );
}

// =====================================================================================
//  سطور تفاصيل بس (جوه الفورم المفتوح)
// =====================================================================================
export function ExcelDetailsBar({ config, excel, helpers, onAppend }: CommonProps & { onAppend: (rows: Row[]) => void }) {
  const { di, detail: detailSpecs } = useSpecs(config, excel, false);
  const detailCfg = config.details[di];

  const commit = async (recs: ImportRecord[]): Promise<CommitOutcome> => {
    try {
      const rows = recs.map((rec) => {
        const row = helpers.emptyRow(detailCfg.columns);
        for (const c of detailCfg.columns) {
          const v = keepValue(rec.rows[0].values, "d." + c.field);
          if (v !== undefined) row[c.field] = v;
        }
        return row;
      });
      onAppend(rows);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message || String(e) };
    }
  };

  return (
    <ExcelBar
      mode="details"
      compact
      columns={detailSpecs}
      templateName={(excel.templateName || config.tableName) + "_" + (detailCfg?.tableName || "details")}
      screenTitle={detailCfg?.title}
      templateLabel={["تحميل نموذج الأصناف", "Download lines template"]}
      importLabel={["استيراد أصناف من Excel", "Import lines from Excel"]}
      commitKind="append"
      maxRows={excel.maxRows ?? 20000}
      maxRecords={excel.maxRows ?? 20000}
      commit={commit}
    />
  );
}
