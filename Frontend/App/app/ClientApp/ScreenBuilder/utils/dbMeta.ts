"use client";

// قراءة معلومات القاعدة للمصمم (جداول / أعمدة / إجراءات) مع كاش بسيط
import { useEffect, useRef, useState, useCallback } from "react";
import { SqlConnection, SqlColumn, loadColumns, loadProcs, loadProcParams, ProcParam, ProcColumn } from "./sqlApi";

export interface DbObject { name: string; type: string }

export interface DbMeta {
  connection: SqlConnection;
  connected: boolean;
  objects: DbObject[];
  procs: string[];
  /** أعمدة جدول/فيو (كاش) */
  columns: (table: string) => SqlColumn[] | undefined;
  ensureColumns: (table: string) => void;
  /** إجراء: باراميترات + أعمدة النتيجة */
  procInfo: (name: string) => Promise<{ params: ProcParam[]; columns: ProcColumn[]; error?: string }>;
  version: number;
}

export function useDbMeta(connection: SqlConnection, connected: boolean, objects: DbObject[]): DbMeta {
  const cache = useRef(new Map<string, SqlColumn[]>());
  const pending = useRef(new Set<string>());
  const [version, setVersion] = useState(0);
  const [procs, setProcs] = useState<string[]>([]);
  const dbName = connection.database;

  useEffect(() => {
    cache.current.clear();
    pending.current.clear();
    setProcs([]);
    if (!connected || !dbName) return;
    let off = false;
    loadProcs(connection).then((r) => { if (!off && r.success && r.procs) setProcs(r.procs.map((p) => p.name)); }).catch(() => { });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, dbName]);

  const ensureColumns = useCallback((table: string) => {
    if (!table || !connected || cache.current.has(table) || pending.current.has(table)) return;
    pending.current.add(table);
    loadColumns(connection, table).then((r) => {
      if (r.success && r.columns) cache.current.set(table, r.columns);
      else cache.current.set(table, []);
    }).catch(() => cache.current.set(table, [])).finally(() => { pending.current.delete(table); setVersion((v) => v + 1); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, connection.server, connection.database, connection.user]);

  const procInfo = useCallback(async (name: string) => {
    try {
      const r = await loadProcParams(connection, name);
      if (!r.success) return { params: [], columns: [], error: r.error };
      return { params: r.parameters || [], columns: r.columns || [], error: r.columnsWarning ? "" : undefined };
    } catch (e: any) { return { params: [], columns: [], error: String(e?.message || e) }; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.server, connection.database, connection.user]);

  return { connection, connected, objects, procs, columns: (t) => cache.current.get(t), ensureColumns, procInfo, version };
}
