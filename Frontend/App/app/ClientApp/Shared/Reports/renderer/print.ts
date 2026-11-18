// =====================================================================================
//  print.ts  -  ستايل التقرير + الطباعة من iframe معزول (@page بمقاس الورق)
//   PDF = نفس الطباعة ← المستخدم يختار "Save as PDF" (المتصفح بيرسم العربي صح).
// =====================================================================================

export const REPORT_CSS = `
@font-face{font-family:"RF Cairo";src:url("/fonts/Cairo/Cairo.ttf") format("truetype");font-weight:100 900;font-display:block}
.rf-doc{font-family:"RF Cairo",Cairo,Tahoma,sans-serif;font-size:9.5pt;color:#0b1c30;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rf-doc *{box-sizing:border-box}
.rf-measure{position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none}
.rf-page{background:#fff;color:#0b1c30;position:relative;overflow:hidden;margin:0 auto 16px;box-shadow:0 2px 14px rgba(15,23,42,.18);zoom:var(--rf-zoom,1)}
.rf-page-inner{display:flex;flex-direction:column;height:100%}
.rf-body{flex:0 0 auto}
.rf-pf-wrap{margin-top:auto}
.rf-band{width:100%}
.rf-flow{display:flex;flex-wrap:wrap;align-items:flex-start;width:100%}
.rf-abs{position:relative;width:100%}
.rf-el{overflow-wrap:anywhere;min-width:0}
.rf-row{display:flex;flex-wrap:nowrap;align-items:flex-start}
.rf-col{display:flex;flex-direction:column;align-items:stretch}
.rf-col>.rf-el{flex:0 0 auto!important;max-width:100%!important}
.rf-text,.rf-rect{white-space:pre-line}
.rf-table{width:100%;border-collapse:collapse;table-layout:fixed}
.rf-table th,.rf-table td{border:0.2mm solid #cbd5e1;padding:0.9mm 1.4mm;text-align:start;vertical-align:top;overflow-wrap:anywhere}
.rf-table th{background:#eef2f7;font-weight:700}
.rf-zebra td{background:#f8fafc}
.rf-totals td{font-weight:700;background:#f1f5f9}
.rf-label{color:#475569}
.rf-rect{border:0.2mm solid #94a3b8;padding:1.5mm}
.rf-sign{text-align:center;padding-top:8mm}
.rf-sign-line{border-top:0.2mm solid #334155;margin:0 4mm 1mm}
.rf-svg svg{display:block}
.rf-labels{display:grid;align-content:start}
.rf-label-cell{overflow:hidden;padding:1.2mm;position:relative}
.rf-outline{outline:0.1mm dashed #cbd5e1;outline-offset:-0.1mm}
.rf-chart-title{font-weight:700;text-align:center}
.rf-chart-empty{color:#64748b;text-align:center;padding:4mm}
.rf-bad{color:#b91c1c;font-size:8pt}
@media print{
  .rf-page{box-shadow:none!important;margin:0!important;zoom:1!important;break-after:page;page-break-after:always}
  .rf-page:last-child{break-after:auto;page-break-after:auto}
}
`;

export interface PrintOptions {
  widthMm: number;
  heightMm: number | null;
  title?: string;
  dir?: string;
  lang?: string;
}

/** يطبع صفحات التقرير الموجودة جوه container (عناصر .rf-page) */
export function printReport(container: HTMLElement, o: PrintOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const pages = Array.from(container.querySelectorAll<HTMLElement>(".rf-page"));
    if (!pages.length) { reject(new Error("Nothing to print")); return; }
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    const size = `${o.widthMm}mm ${o.heightMm ? o.heightMm + "mm" : "auto"}`;
    const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
    doc.open();
    doc.write(`<!doctype html><html lang="${o.lang ?? "ar"}" dir="${o.dir ?? "rtl"}"><head><meta charset="utf-8"><base href="${location.origin}/"><title>${esc(o.title ?? "Report")}</title>
<style>${REPORT_CSS}
@page{size:${size};margin:0}
html,body{margin:0;padding:0;background:#fff}
</style></head><body><div class="rf-doc" dir="${o.dir ?? "rtl"}" lang="${o.lang ?? "ar"}">${pages.map((p) => p.outerHTML).join("")}</div></body></html>`);
    doc.close();
    const win = iframe.contentWindow!;
    const done = () => { setTimeout(() => iframe.remove(), 1000); resolve(); };
    const go = () => {
      try { win.focus(); win.print(); } catch (e) { iframe.remove(); reject(e); return; }
      done();
    };
    const fontsReady: Promise<any> = (doc as any).fonts?.ready ?? Promise.resolve();
    const imgs = Array.from(doc.images).map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); })));
    Promise.race([Promise.all([fontsReady, ...imgs]), new Promise((r) => setTimeout(r, 2500))]).then(() => setTimeout(go, 50));
  });
}
