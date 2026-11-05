"use client";

// =====================================================================================
//  RunProc.ts  (Phase 5)  -  تشغيل إجراء مخزن (Stored Procedure) من الشاشات المتولدة
//  بيستخدم نفس ManageDataSQL/Query (TableModel.IsProc) - مفيش API جديد.
//  rows = الصفوف اللي الإجراء رجّعها (ممكن تكون فاضية).
// =====================================================================================

import { Querys } from "./CallDataBase";
import { TableModel } from "./Entities";

export interface RunProcResult { ok: boolean; rows: any[]; error?: string }

export async function RunProc(proc: string, params: Record<string, any> = {}): Promise<RunProcResult> {
  try {
    const t = new TableModel();
    t.NameTable = proc;
    t.IsProc = true;
    t.parameters = params;
    const res = await Querys([t], null, null);
    if (typeof res === "string") return { ok: false, rows: [], error: res };
    const first = Array.isArray(res) ? res[0] : res;
    const rows = first ? Object.keys(first).filter((k) => !isNaN(Number(k))).map((k) => first[k]) : [];
    return { ok: true, rows };
  } catch (e: any) {
    return { ok: false, rows: [], error: String(e?.message || e) };
  }
}
