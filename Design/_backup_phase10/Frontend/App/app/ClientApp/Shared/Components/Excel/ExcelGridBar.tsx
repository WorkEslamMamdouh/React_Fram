"use client";

// =====================================================================================
//  📄 Shared/Components/Excel/ExcelGridBar.tsx  —  إكسل لشاشات الجريد (DynamicGrid)
// -------------------------------------------------------------------------------------
//  كل صف في الإكسل = سجل جديد في الجدول.
//  الحفظ:
//    • الافتراضي: bulk-insert (SqlBulkCopy) — الدفعة كلها في ترانزاكشن واحدة (chunkSize صف، الافتراضي 200).
//      لو الدفعة فشلت، كل صف فيها بيتجرّب لوحده (إدراج عادي) عشان نعرف الغلط فين.
//    • allOrNothing: الملف كله في ترانزاكشن واحدة — أي فشل = مفيش حاجة تتحفظ.
//    • لو الشاشة بتشغّل G_ProcessTrans (keyTrType + runProcessTrans): كل صف InsertMasterDetail لوحده
//      (نفس الحفظ العادي بالظبط) — وساعتها allOrNothing مش ممكن لأن كل صف ترانزاكشن.
// =====================================================================================

import React, { useMemo } from "react";
import { Sys } from "../../SystemTools";
import { SQL } from "../../CallDataBase";
import type { DynamicGridColumn } from "../Import/ModelGrid";
import ExcelBar from "./ExcelBar";
import { buildColumnSpecs } from "./ExcelColumns";
import { isBlank } from "./ExcelCore";
import type { CommitOutcome, RecordIssue } from "./ExcelImportModal";
import { ExcelGridConfig, ImportRecord } from "./ExcelTypes";

export interface ExcelGridBarProps {
  excel: ExcelGridConfig;
  columns: DynamicGridColumn[];
  tableName: string;
  keyColumn: string;
  compCode: number;
  branchCode: number;
  keyTrType?: string;
  runProcessTrans?: boolean;
  beforeSave?: (row: Record<string, any>, isInsert: boolean) => Promise<string | null> | string | null;
  title?: string;
  onDone?: () => void;
}

const dbName = (c: DynamicGridColumn) => c.NameDataBase || c.field;

export function resultMessage(res: any): string {
  if (!res) return "Unknown error";
  return res.ErrorMessage || res.message || "Unknown error";
}

export default function ExcelGridBar(p: ExcelGridBarProps) {
  const { excel, columns } = p;
  const specCols = useMemo(
    () => buildColumnSpecs(columns, { scope: "master", include: excel.columns, exclude: excel.columns && excel.columns.length ? [] : [p.keyColumn], lookups: excel.lookups }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, excel.columns, excel.lookups, p.keyColumn],
  );

  const perRowProc = !!(p.runProcessTrans && p.keyTrType);
  const allOrNothing = !!excel.allOrNothing && !perRowProc;

  // صف بنفس شكل الفورم (openAddForm): الافتراضي ثم قيم الإكسل
  const formRow = (rec: ImportRecord): Record<string, any> => {
    const values = rec.rows[0].values;
    const row: Record<string, any> = {};
    for (const c of columns) {
      row[c.field] = c.DefaultValue !== undefined && c.DefaultValue !== null ? c.DefaultValue : c.type === "checkbox" ? false : "";
      const v = values["m." + c.field];
      if (v !== undefined && v !== null && v !== "") row[c.field] = v;
    }
    return row;
  };
  const formSave = (row: Record<string, any>) => {
    const out: Record<string, any> = {};
    for (const c of columns) if (c.IsSave !== false) out[dbName(c)] = row[c.field];
    return out;
  };

  const validateRecord = p.beforeSave
    ? async (rec: ImportRecord): Promise<RecordIssue[]> => {
        const msg = await p.beforeSave!(formRow(rec), true);
        return msg ? [{ message: msg, rowIndex: 0 }] : [];
      }
    : undefined;

  const insertOne = async (rec: ImportRecord, withProc: boolean): Promise<CommitOutcome> => {
    const res = await SQL.InsertMasterDetail(
      {
        compCode: p.compCode,
        branchCode: p.branchCode,
        keyTrType: p.keyTrType || "",
        masterKeyColumn: p.keyColumn,
        runProcessTrans: withProc,
        master: { tableName: p.tableName, data: formSave(formRow(rec)) },
      } as any,
      null,
      null,
    );
    return res?.IsSuccess ? { ok: true } : { ok: false, message: resultMessage(res) };
  };

  const bulkInsert = async (recs: ImportRecord[]): Promise<CommitOutcome> => {
    // صفوف بأسلوب SqlBulkCopy: الفاضي = null (الافتراضي بتاع القاعدة يتطبق)، والأعمدة الفاضية في كل الصفوف بتتشال
    const cols = columns.filter((c) => c.IsSave !== false);
    const rows = recs.map((rec) => {
      const values = rec.rows[0].values;
      const r: Record<string, any> = {};
      for (const c of cols) {
        let v = values["m." + c.field];
        if (isBlank(v)) v = c.DefaultValue !== undefined && c.DefaultValue !== null && c.DefaultValue !== "" ? c.DefaultValue : c.type === "checkbox" ? false : null;
        r[dbName(c)] = v;
      }
      return r;
    });
    const used = cols.map(dbName).filter((n) => rows.some((r) => r[n] !== null && r[n] !== undefined));
    const dataList = rows.map((r) => {
      const o: Record<string, any> = {};
      for (const n of used) o[n] = r[n];
      return o;
    });
    let res: any = await Sys.CallApi({ method: "POST", controller: "ManageDataSQL", action: "bulk-insert", data: { TableName: p.tableName, DataList: dataList } });
    if (typeof res === "string") { try { res = JSON.parse(res); } catch { /* keep */ } }
    return res?.IsSuccess ? { ok: true } : { ok: false, message: resultMessage(res) };
  };

  const commit = async (recs: ImportRecord[]): Promise<CommitOutcome> => {
    try {
      if (perRowProc) {
        for (const rec of recs) {
          const o = await insertOne(rec, true);
          if (!o.ok) return o;
        }
        return { ok: true };
      }
      if (recs.length === 1 && !allOrNothing) return await insertOne(recs[0], false);
      return await bulkInsert(recs);
    } catch (e: any) {
      return { ok: false, message: Sys.GetErrorMessage(e) };
    }
  };

  return (
    <ExcelBar
      mode="grid"
      columns={specCols}
      templateName={excel.templateName || p.tableName}
      screenTitle={p.title || excel.templateName || p.tableName}
      commitKind="save"
      maxRows={excel.maxRows ?? 5000}
      maxRecords={excel.maxRows ?? 5000}
      allOrNothing={allOrNothing}
      chunkSize={perRowProc ? 1 : excel.chunkSize ?? 200}
      validateRecord={validateRecord}
      commit={commit}
      onDone={() => p.onDone?.()}
    />
  );
}
