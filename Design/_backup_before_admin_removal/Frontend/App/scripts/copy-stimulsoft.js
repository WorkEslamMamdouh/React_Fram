// بينسخ ملفات Stimulsoft الجاهزة من node_modules لـ public/stimulsoft
// (بيشتغل لوحده بعد npm install عن طريق postinstall). شوف Shared/Reports/stimulsoft.ts.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "stimulsoft-reports-js", "Scripts");
const dst = path.join(__dirname, "..", "public", "stimulsoft");
const files = [
  "stimulsoft.reports.pack.js",
  "stimulsoft.dashboards.pack.js",
  "stimulsoft.viewer.pack.js",
  "stimulsoft.designer.pack.js",
];

if (!fs.existsSync(src)) {
  console.warn("[copy-stimulsoft] stimulsoft-reports-js not installed — skipped");
  process.exit(0);
}
fs.mkdirSync(dst, { recursive: true });
for (const f of files) fs.copyFileSync(path.join(src, f), path.join(dst, f));
console.log(`[copy-stimulsoft] copied ${files.length} files to public/stimulsoft`);
