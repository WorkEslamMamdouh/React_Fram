/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  ScanTask — P21 شاشة المسح بالباركود (موبايل/هاندهيلد أولًا)
//  - خانة مسح كبيرة دايمًا عليها الفوكس (الإسكانر بيكتب فيها + Enter) + كاميرا لو مدعومة
//  - حلقة الخطوات: موقع → صنف → كمية → تأكيد (حسب config.steps)
//  - GS1 (تشغيلة/صلاحية/سيريال) + باركود الميزان، منع المنتهي، حد الزيادة
//  - صوت/اهتزاز للنجاح والخطأ، التقدم بيتحفظ محليًا (يكمل من غير نت) لحد "إنهاء"
// =====================================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type { ScanEvent, ScanParsed, ScanStepKind, ScanTaskConfig } from "./ModelScanTask";
import { parseScan } from "./scanParse";
import { ShowConfirm } from "../../DialogModal";
import { btnClass, cardClass, sqlDataProvider, useLangKit } from "./patternKit";

export interface ScanTaskProps {
  config: ScanTaskConfig;
  /** السطور المتوقعة (أو من config.lines.source) */
  lines?: Record<string, any>[];
  provider?: DataProvider;
  /** جرد أعمى/صنف مش في القايمة: دوّر على الصنف بالكود (رجّع صف أو null) */
  onLookup?: (parsed: ScanParsed) => Promise<Record<string, any> | null> | Record<string, any> | null;
  /** إنهاء المهمة — رجّع false لو الحفظ فشل */
  onComplete: (events: ScanEvent[], totals: Record<string, number>) => Promise<boolean | void> | boolean | void;
}

function beep(ok: boolean) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 1200 : 220;
    o.connect(g); g.connect(ctx.destination);
    g.gain.value = 0.08;
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.08 : 0.35));
    o.onended = () => ctx.close();
  } catch { /* مفيش صوت */ }
}

export default function ScanTask({ config, lines: linesProp, provider = sqlDataProvider, onLookup, onComplete }: ScanTaskProps) {
  const { t, lt, dir } = useLangKit();
  const L = config.lines;
  const steps: ScanStepKind[] = config.steps && config.steps.length ? config.steps : config.qtyMode === "ask" ? ["item", "qty"] : ["item"];
  const blind = config.mode === "blind";
  const storeKey = config.id ? `scan-task:${config.id}` : "";

  const [loaded, setLoaded] = useState<Record<string, any>[]>([]);
  const [extra, setExtra] = useState<Record<string, any>[]>([]); // أصناف مش في القايمة (جرد أعمى)
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [location, setLocation] = useState("");
  const [pending, setPending] = useState<{ line: Record<string, any>; parsed: ScanParsed } | null>(null);
  const [qtyStr, setQtyStr] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [camOn, setCamOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // بعد أول render (مش وقت الـ render) عشان مايحصلش اختلاف بين HTML المتولد مسبقًا والمتصفح (hydration)
  const [camSupported, setCamSupported] = useState(false);
  useEffect(() => { setCamSupported("BarcodeDetector" in window && !!navigator.mediaDevices); }, []);

  useEffect(() => {
    if (linesProp || !L.source) return;
    provider({ source: L.source, page: 0, pageSize: 0 }).then((r) => setLoaded(r.rows)).catch(() => setLoaded([]));
  }, [linesProp, L.source, provider]);

  // استرجاع التقدم المحفوظ — الحفظ مستني لحد ما الاسترجاع يخلص (restored)،
  // وإلا أول render كان بيكتب events فاضية فوق التقدم المحفوظ (بيبان في StrictMode)
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!storeKey) return;
    try {
      const s = JSON.parse(window.localStorage.getItem(storeKey) || "null");
      if (s?.events) { setEvents(s.events); setExtra(s.extra || []); }
    } catch { /* */ }
    setRestored(true);
  }, [storeKey]);
  useEffect(() => {
    if (!storeKey || !restored) return;
    try { window.localStorage.setItem(storeKey, JSON.stringify({ events, extra })); } catch { /* */ }
  }, [storeKey, restored, events, extra]);

  const lines = useMemo(() => [...(linesProp || loaded), ...extra], [linesProp, loaded, extra]);
  const totals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of events) if (e.lineKey !== undefined) m[String(e.lineKey)] = (m[String(e.lineKey)] || 0) + e.qty;
    return m;
  }, [events]);
  const expectedOf = (l: Record<string, any>) => (L.expectedQtyField ? Number(l[L.expectedQtyField]) || 0 : 0);
  const doneCount = lines.filter((l) => (totals[String(l[L.keyField])] || 0) >= expectedOf(l) && expectedOf(l) > 0).length;
  const expectedLines = lines.filter((l) => expectedOf(l) > 0).length;

  const focus = useCallback(() => setTimeout(() => inputRef.current?.focus(), 30), []);
  useEffect(() => { focus(); }, [stepIdx, focus]);

  const feedback = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    if (config.feedback?.sound !== false) beep(ok);
    if (config.feedback?.vibrate !== false && navigator.vibrate) navigator.vibrate(ok ? 40 : [80, 60, 80]);
  };

  const record = async (line: Record<string, any>, parsed: ScanParsed, qty: number) => {
    const key = String(line[L.keyField]);
    const exp = expectedOf(line);
    const after = (totals[key] || 0) + qty;
    const overPct = config.tolerance?.overPercent ?? (blind ? Infinity : 0);
    if (!blind && exp > 0 && after > exp * (1 + overPct / 100) + 1e-9) {
      if ((config.tolerance?.rule || "block") === "block") { feedback(false, t(`Over expected (${exp})`, `أكتر من المتوقع (${exp})`)); return false; }
      if (!(await ShowConfirm(`Quantity exceeds expected (${exp}). Continue?`, `الكمية أكتر من المتوقع (${exp}). تكمل؟`))) return false;
    }
    setEvents((ev) => [...ev, {
      at: new Date().toISOString(), code: parsed.raw, lineKey: line[L.keyField], location: location || undefined, qty,
      batch: parsed.batch, expiry: parsed.expiry, serial: parsed.serial,
    }]);
    feedback(true, `${line[L.nameField]}  +${qty}`);
    return true;
  };

  const findLine = async (parsed: ScanParsed): Promise<Record<string, any> | null> => {
    const hit = lines.find((l) => String(l[L.barcodeField] ?? "").split(",").map((s) => s.trim()).includes(parsed.lookup)
      || String(l[L.itemField]) === parsed.lookup);
    if (hit) return hit;
    if (!onLookup) return null;
    const found = await onLookup(parsed);
    if (!found) return null;
    const existing = lines.find((l) => String(l[L.itemField]) === String(found[L.itemField]));
    if (existing) return existing;
    if (blind) { setExtra((x) => [...x, found]); return found; }
    return null;
  };

  const submit = async (raw: string) => {
    const value = raw.trim();
    setCode("");
    if (!value || busy) return;
    setBusy(true);
    try {
      const step = steps[stepIdx];
      if (step === "location") {
        setLocation(value);
        feedback(true, `${t("Location", "الموقع")}: ${value}`);
        setStepIdx((i) => (i + 1) % steps.length);
        return;
      }
      if (step === "qty") {
        const n = Number(value);
        if (!pending || !(n > 0)) { feedback(false, t("Enter a valid quantity", "اكتب كمية صحيحة")); return; }
        if (await record(pending.line, pending.parsed, n)) { setPending(null); setQtyStr(""); setStepIdx((i) => (i + 1) % steps.length); }
        return;
      }
      if (step === "item") {
        const parsed = parseScan(value, { gs1: config.gs1, scale: config.scaleBarcode });
        const line = await findLine(parsed);
        if (!line) { feedback(false, t(`Not in this task: ${value}`, `مش موجود في المهمة: ${value}`)); return; }
        if (L.locationField && location && line[L.locationField] && String(line[L.locationField]) !== location) {
          feedback(false, t(`Wrong location — expected ${line[L.locationField]}`, `موقع غلط — المفروض ${line[L.locationField]}`)); return;
        }
        if (config.blockExpired && parsed.expiry && parsed.expiry < new Date().toISOString().substring(0, 10)) {
          feedback(false, t(`Expired (${parsed.expiry})`, `منتهي الصلاحية (${parsed.expiry})`)); return;
        }
        const nextStep = steps[stepIdx + 1];
        if (nextStep === "qty" && parsed.qty === undefined) {
          setPending({ line, parsed });
          feedback(true, String(line[L.nameField]));
          setStepIdx(stepIdx + 1);
          return;
        }
        if (await record(line, parsed, parsed.qty ?? 1)) setStepIdx((i) => (nextStep === "qty" ? (i + 2) % steps.length : (i + 1) % steps.length));
        return;
      }
      if (step === "confirm") setStepIdx(0);
    } finally { setBusy(false); focus(); }
  };

  // ---------- كاميرا ----------
  // الحلقة بتشتغل مرة واحدة، فلازم تنادي آخر نسخة من submit (الخطوة/الكميات/السطور الحالية) مش نسخة أول render
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    if (!camOn || !camSupported) return;
    let stream: MediaStream | null = null;
    let stop = false;
    const Det = (window as any).BarcodeDetector;
    const det = new Det();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        let last = "";
        while (!stop) {
          const codes = videoRef.current ? await det.detect(videoRef.current) : [];
          const v = codes?.[0]?.rawValue;
          if (v && v !== last) { last = v; await submitRef.current(v); setTimeout(() => { last = ""; }, 1500); }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch { setCamOn(false); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((tr) => tr.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn]);

  const finish = async () => {
    const short = lines.filter((l) => expectedOf(l) > 0 && (totals[String(l[L.keyField])] || 0) < expectedOf(l)).length;
    if (short && !blind && !(await ShowConfirm(`${short} line(s) are short. Finish anyway?`, `فيه ${short} سطر ناقص. تنهي برضه؟`))) return;
    const ok = await onComplete(events, totals);
    if (ok === false) return;
    setEvents([]); setExtra([]); setLocation(""); setStepIdx(0);
    if (storeKey) try { window.localStorage.removeItem(storeKey); } catch { /* */ }
  };

  const undo = () => { setEvents((ev) => ev.slice(0, -1)); feedback(true, t("Last scan removed", "اتمسحت آخر مسحة")); };

  const step = steps[stepIdx];
  const prompt: Record<ScanStepKind, string> = {
    location: t("Scan LOCATION", "امسح الموقع"),
    item: t("Scan ITEM", "امسح الصنف"),
    qty: pending ? `${t("Quantity for", "الكمية لـ")} ${pending.line[L.nameField]}` : t("Quantity", "الكمية"),
    confirm: t("Confirm", "تأكيد"),
  };

  return (
    <div className="space-y-3 text-erp-text max-w-3xl mx-auto" dir={dir}>
      <div className={`${cardClass} p-3 space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold truncate">{lt(config.title)}</h2>
          {!blind && expectedLines > 0 && <span className="num text-[14px] font-semibold">{doneCount}/{expectedLines}</span>}
        </div>
        {!blind && expectedLines > 0 && (
          <div className="h-2 rounded-full bg-erp-surface-2 overflow-hidden"><div className="h-full bg-erp-success transition-all" style={{ width: `${(doneCount / expectedLines) * 100}%` }} /></div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {steps.map((s, i) => (
            <span key={s + i} className={`h-7 px-2.5 inline-flex items-center rounded-full text-[12px] font-semibold ${i === stepIdx ? "bg-erp-accent text-white" : "bg-erp-surface-2 text-erp-text-muted"}`}>{i + 1}. {prompt[s].split(" ").slice(0, 2).join(" ")}</span>
          ))}
          {location && <span className="h-7 px-2.5 inline-flex items-center rounded-full text-[12px] bg-erp-accent-soft text-erp-accent">📍 {location}</span>}
        </div>
        <div className="text-center text-xl md:text-2xl font-bold py-1">{prompt[step]}</div>
        <form onSubmit={(e) => { e.preventDefault(); submit(step === "qty" ? qtyStr || code : code); }} className="flex gap-2">
          {step === "qty" ? (
            <input ref={inputRef} type="number" inputMode="decimal" value={qtyStr} onChange={(e) => setQtyStr(e.target.value)}
              className="flex-1 min-w-0 w-full h-14 rounded-xl border-2 border-erp-accent px-4 text-2xl num text-center bg-erp-surface" placeholder="1" />
          ) : (
            <input ref={inputRef} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} dir="ltr"
              className="flex-1 min-w-0 w-full h-14 rounded-xl border-2 border-erp-accent px-4 text-xl num bg-erp-surface" placeholder="▌▌▌ ▌▌ ▌▌▌" />
          )}
          <button type="submit" className={btnClass("primary", "lg")} disabled={busy}>OK</button>
          {config.allowCamera && camSupported && (
            <button type="button" className={btnClass(camOn ? "danger" : "gray", "lg")} onClick={() => setCamOn((c) => !c)} aria-label={t("Camera", "كاميرا")}>📷</button>
          )}
        </form>
        {camOn && <video ref={videoRef} className="w-full max-h-64 rounded-xl bg-black object-cover" muted playsInline />}
        {msg && (
          <div role="status" className={`rounded-xl px-4 py-3 text-[15px] font-semibold ${msg.ok ? "bg-erp-success-bg text-erp-success-text" : "bg-erp-danger-bg text-erp-danger-text"}`}>
            {msg.ok ? "✔" : "✖"} {msg.text}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={btnClass("gray", "lg")} onClick={undo} disabled={!events.length}>↶ {t("Undo last", "إلغاء آخر مسحة")}</button>
          <button type="button" className={btnClass("success", "lg")} onClick={finish} disabled={!events.length}>✔ {t("Finish", "إنهاء")}</button>
        </div>
      </div>

      <div className={`${cardClass} divide-y divide-erp-border`}>
        {lines.map((l) => {
          const k = String(l[L.keyField]);
          const got = totals[k] || 0;
          const exp = expectedOf(l);
          const state = blind ? (got > 0 ? "done" : "todo") : got === 0 ? "todo" : got < exp ? "partial" : got === exp ? "done" : "over";
          const color = state === "done" ? "var(--erp-success)" : state === "partial" ? "var(--erp-warning)" : state === "over" ? "var(--erp-danger)" : "var(--erp-border-strong)";
          return (
            <div key={k} className="flex items-center gap-3 px-3 py-2.5" style={{ borderInlineStart: `4px solid ${color}` }}>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold truncate">{String(l[L.nameField] ?? "")}</div>
                <div className="text-[12px] text-erp-text-muted num truncate">{String(l[L.barcodeField] ?? "")}{L.locationField && l[L.locationField] ? ` · 📍 ${l[L.locationField]}` : ""}</div>
              </div>
              <div className="num text-lg font-bold shrink-0">{got}{!blind && exp ? <span className="text-erp-text-muted text-sm"> / {exp}</span> : null}</div>
            </div>
          );
        })}
        {lines.length === 0 && <div className="p-6 text-center text-[13px] text-erp-text-subtle">{t("Scan items to start", "امسح الأصناف عشان تبدأ")}</div>}
      </div>
    </div>
  );
}
