"use client";

// نافذة "افتح شاشة موجودة" + نافذة "حفظ وتسجيل" (Phase 5)
import React, { useEffect, useMemo, useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { Sys } from "../../../Shared/SystemTools";
import { useScreenBuilder } from "../../store/useScreenBuilder";
import { generateHookFile, generatePageFile } from "../../utils/codeGenerator";
import { checkConfig, importFromTs } from "../../utils/validateConfig";
import { parseSettingsFromTs, convertV3toV4 } from "../../utils/configConverter";
import { normalizeConfig, ScreenConfigV5 } from "../../types/ScreenConfig";
import { SqlConnection, scanScreens, listConfigs, readScreen, saveFiles, saveConfigJson, registerModule, ScannedScreen } from "../../utils/sqlApi";

const btn = "h-9 px-4 rounded-lg text-[13px] font-medium transition";

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-erp-overlay p-4" onClick={onClose}>
      <div className={`bg-erp-surface rounded-xl shadow-erp-4 border border-erp-border w-full ${wide ? "max-w-3xl" : "max-w-xl"} max-h-[88vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-4 h-12 border-b border-erp-border shrink-0">
          <span className="text-[15px] font-semibold text-erp-text">{title}</span>
          <button className="ms-auto text-erp-text-muted hover:text-erp-text" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ============================ افتح شاشة ============================
export function OpenScreenModal({ connection, connected, projectPath, onClose }: { connection: SqlConnection; connected: boolean; projectPath: string; onClose: () => void }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const loadConfig = useScreenBuilder((s) => s.loadConfig);
  const [screens, setScreens] = useState<ScannedScreen[]>([]);
  const [dbCfgs, setDbCfgs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      if (!projectPath) { setMsg(t("Project path is not set (sidebar).", "مسار المشروع مش متحدد (القايمة الجانبية).")); return; }
      const r = await scanScreens(projectPath).catch((e) => ({ success: false, error: String(e), screens: [] as ScannedScreen[] }));
      if (r.success) setScreens(r.screens || []); else setMsg(r.error || "");
      if (connected) {
        const c = await listConfigs(connection).catch(() => null);
        if (c?.success && c.configs) setDbCfgs(Object.fromEntries(c.configs.map((x) => [x.module, x.json])));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function open(s: ScannedScreen) {
    let cfg: ScreenConfigV5 | null = null;
    if (dbCfgs[s.name]) { try { cfg = normalizeConfig(JSON.parse(dbCfgs[s.name])); } catch { /* fallthrough */ } }
    if (!cfg && s.hasSettings && s.settingsJson) {
      try {
        const raw = JSON.parse(s.settingsJson);
        // ماركر v3 (الأداة الديسك توب) مفاتيحه PascalCase → لازم يتحوّل الأول، وإلا الشاشة بتتفتح فاضية
        cfg = normalizeConfig(raw && !raw.version && (raw.Version || raw.Module) ? convertV3toV4(raw) : raw);
      } catch { /* fallthrough */ }
    }
    if (!cfg) {
      const r = await readScreen(projectPath, s.name).catch(() => null);
      if (r?.success && r.text) {
        const p = parseSettingsFromTs(r.text);
        cfg = p.v4 || importFromTs(r.text, s.name);
        if (!p.v4) await Sys.Alert("This screen has no settings marker. It was imported best-effort (table and columns only). Review everything before saving.", "الشاشة دي ملهاش ماركر إعدادات. اتستوردت بأفضل جهد (الجدول والأعمدة بس). راجع كل حاجة قبل الحفظ.", "warning");
      }
    }
    if (!cfg) { setMsg(t("Could not read this screen.", "مقدرتش أقرا الشاشة دي.")); return; }
    loadConfig(cfg);
    onClose();
    Sys.ShowMessage(`Opened ${s.name} (not saved)`, `اتفتحت ${s.name} (من غير حفظ)`, "info");
  }

  const list = useMemo(() => screens.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase())), [screens, q]);
  return (
    <Modal title={t("Open an existing screen", "افتح شاشة موجودة")} onClose={onClose} wide>
      <input className="w-full h-9 rounded-lg border border-erp-border-strong bg-erp-surface px-3 text-[13px] mb-3" placeholder={t("Search…", "بحث…")} value={q} onChange={(e) => setQ(e.target.value)} />
      {msg && <div className="text-[12px] text-erp-danger mb-2">{msg}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map((s) => (
          <button key={s.name} onClick={() => open(s)} className="text-start rounded-lg border border-erp-border p-3 hover:border-erp-accent hover:bg-erp-surface-2 transition">
            <div className="font-semibold text-[13px] text-erp-text flex items-center gap-2">{s.name}
              {dbCfgs[s.name] && <span className="text-[10px] px-1.5 rounded bg-erp-accent-soft text-erp-accent">DB</span>}
              {!s.hasSettings && !dbCfgs[s.name] && <span className="text-[10px] px-1.5 rounded bg-amber-100 text-amber-700">{t("no marker", "بدون ماركر")}</span>}
            </div>
            <div className="text-[11px] text-erp-text-subtle">{s.screenType} · {s.table}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ============================ حفظ وتسجيل ============================
export function SaveRegisterModal({ connection, connected, projectPath, dbScriptsPath, onClose }: { connection: SqlConnection; connected: boolean; projectPath: string; dbScriptsPath: string; onClose: () => void }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const config = useScreenBuilder((s) => s.config);
  const [doRegister, setDoRegister] = useState(true);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ ok: boolean | null; text: string }[]>([]);
  const check = useMemo(() => checkConfig(config, t), [config, IsLangEN]);
  void dbScriptsPath;

  async function run() {
    if (check.errors.length) return;
    if (!projectPath) { setLog([{ ok: false, text: t("Project path is missing (sidebar).", "مسار المشروع ناقص (القايمة الجانبية).") }]); return; }
    const ok = await Sys.Confirm(
      `Save screen "${config.module}" into the project? Existing files of this screen are backed up first (_Backup_Screens).`,
      `حفظ الشاشة "${config.module}" في المشروع؟ الملفات القديمة للشاشة دي هتتنسخ احتياطي الأول (_Backup_Screens).`,
      { okEn: "Save", okAr: "حفظ" });
    if (!ok) return;
    setBusy(true);
    const out: { ok: boolean | null; text: string }[] = [];
    const push = (ok: boolean | null, text: string) => { out.push({ ok, text }); setLog([...out]); };
    try {
      const name = config.module;
      const key = name.charAt(0).toLowerCase() + name.slice(1);
      const r1 = await saveFiles({
        projectPath, module: name, tsCode: generateHookFile(config), tsxCode: generatePageFile(config), sqlCode: "",
        resources: [
          { key: `${key}_title`, en: config.titleEn || name, ar: config.titleAr || name },
          { key: `${key}_subtitle`, en: config.subEn || "", ar: config.subAr || "" },
          { key: `${key}_refresh`, en: "Refresh", ar: "تحديث" },
        ],
      });
      if (!r1.success) { push(false, t("Saving files failed: ", "فشل حفظ الملفات: ") + r1.error); setBusy(false); return; }
      (r1.messages || []).forEach((m) => push(true, m));
      if (!connected) { push(null, t("Not connected to the database: config JSON + menu registration skipped.", "مش متصل بالقاعدة: حفظ الإعدادات والتسجيل في القايمة اتخطوا.")); setBusy(false); return; }
      const r2 = await saveConfigJson(connection, name, JSON.stringify(config)).catch((e) => ({ success: false, error: String(e), missingTable: false }));
      if (r2.success) push(true, t("Screen config saved in Sys_ScreenConfig", "إعدادات الشاشة اتحفظت في Sys_ScreenConfig"));
      else push(null, r2.missingTable ? t("Sys_ScreenConfig table not found (run Database/Phase5_ScreenBuilder.sql) - config is still inside the screen file marker.", "جدول Sys_ScreenConfig مش موجود (شغّل Database/Phase5_ScreenBuilder.sql) - الإعدادات لسه موجودة جوه ماركر ملف الشاشة.") : t("Config JSON not saved: ", "الإعدادات ما اتحفظتش: ") + r2.error);
      if (doRegister) {
        const r3 = await registerModule(connection, { module: name, descA: config.titleAr || name, descE: config.titleEn || name, menu: config.permissions.parentMenu, type: "S", sort: config.menuSort, icon: config.icon, color: config.iconColor }).catch((e) => ({ success: false, error: String(e), sort: 0, messages: [] as string[] }));
        if (r3.success) push(true, t(`Registered in the menu (sort ${r3.sort}) with admin permissions. Log out and log in again to see it.`, `اتسجلت في القايمة (ترتيب ${r3.sort}) وصلاحيات الأدمن كاملة. اخرج وادخل تاني عشان تظهر.`));
        else push(false, t("Menu registration failed: ", "تسجيل القايمة فشل: ") + (r3 as any).error);
      }
      useScreenBuilder.setState({ isDirty: false });
      try { localStorage.removeItem("screenbuilder_draft_v5"); } catch { /* ignore */ }   // الشاشة اتحفظت → المسودة مابقتش لازمة
    } catch (e: any) { push(false, String(e?.message || e)); }
    setBusy(false);
  }

  return (
    <Modal title={t("Save & register screen", "حفظ وتسجيل الشاشة")} onClose={onClose}>
      <div className="space-y-3 text-[13px] text-erp-text">
        <div><b>{config.module || "—"}</b> · {config.table} · {config.screenType}</div>
        {check.errors.map((e, i) => <div key={i} className="text-erp-danger"><i className="fa-solid fa-circle-xmark me-1" />{e}</div>)}
        {check.warnings.map((e, i) => <div key={i} className="text-amber-600"><i className="fa-solid fa-triangle-exclamation me-1" />{e}</div>)}
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[var(--erp-accent)]" checked={doRegister} onChange={(e) => setDoRegister(e.target.checked)} />
          {t("Register in the menu (Sys_RegisterModule) with admin permissions", "سجّل في القايمة (Sys_RegisterModule) بصلاحيات الأدمن")}</label>
        {log.length > 0 && (
          <div className="rounded-lg border border-erp-border bg-erp-surface-2 p-3 space-y-1">
            {log.map((l, i) => (
              <div key={i} className={l.ok === true ? "text-erp-success" : l.ok === false ? "text-erp-danger" : "text-amber-600"}>
                <i className={`fa-solid ${l.ok === true ? "fa-check" : l.ok === false ? "fa-xmark" : "fa-triangle-exclamation"} me-1`} />{l.text}
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button className={`${btn} border border-erp-border-strong`} onClick={onClose}>{t("Close", "إغلاق")}</button>
          <button className={`${btn} bg-erp-accent text-white hover:bg-erp-accent-hover disabled:opacity-40`} disabled={busy || check.errors.length > 0} onClick={run}>
            {busy ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-floppy-disk me-1" />}{t("Save", "حفظ")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
