/* eslint-disable */
// Micro-benchmarks for the pattern helpers (real source files, transpiled on the fly).
// Usage (from repo root):  node Tools/Checks/PatternBench/bench.js
// Needs Frontend/App/node_modules (typescript + react) to be installed.
"use strict";
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const APP = path.join(ROOT, "Frontend", "App");
const PAT = path.join(APP, "app", "ClientApp", "Shared", "Components", "Import", "Patterns");
const ts = require(path.join(APP, "node_modules", "typescript"));

// ---- tiny loader: transpile .ts/.tsx from the Patterns folder, stub app-only modules ----
const STUBS = {
  CallDataBase: { SQL: { Select: async () => ({ data: [], totalCount: 0 }) } },
  SystemUsing: { useSys: (sel) => sel({ lang: "en", IsDark: false }) },
  useInfiniteSentinel: { useInfiniteSentinel: () => null },
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  const base = path.basename(req);
  if (STUBS[base]) return "stub:" + base;
  if (req.startsWith(".") && parent && parent.filename && parent.filename.startsWith(PAT)) {
    for (const ext of [".ts", ".tsx"]) {
      const f = path.resolve(path.dirname(parent.filename), req + ext);
      if (fs.existsSync(f)) return f;
    }
  }
  if (req === "react" || req === "react-dom" || req.startsWith("react/") || req.startsWith("react-dom/"))
    return origResolve.call(this, path.join(APP, "node_modules", req), parent, ...rest);
  return origResolve.call(this, req, parent, ...rest);
};
const origLoad = Module._load;
Module._load = function (req, parent, ...rest) {
  const base = path.basename(req);
  if (STUBS[base]) return STUBS[base];
  return origLoad.call(this, req, parent, ...rest);
};
for (const ext of [".ts", ".tsx"]) {
  require.extensions[ext] = function (m, filename) {
    const src = fs.readFileSync(filename, "utf8");
    const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
    m._compile(out.outputText, filename);
  };
}

const posCart = require(path.join(PAT, "posCart.ts"));
const pricing = require(path.join(PAT, "sessionPricing.ts"));
const scan = require(path.join(PAT, "scanParse.ts"));
const kit = require(path.join(PAT, "patternKit.tsx"));

function bench(name, iterations, fn) {
  for (let i = 0; i < Math.min(200, iterations); i++) fn(i); // warm-up
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const ms = performance.now() - t0;
  const per = (ms * 1000) / iterations;
  console.log(`${name.padEnd(58)} ${String(iterations).padStart(7)} runs  total ${ms.toFixed(1).padStart(8)} ms  ${per.toFixed(2).padStart(9)} µs/op`);
  return per;
}
async function benchAsync(name, iterations, fn) {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) await fn(i);
  const ms = performance.now() - t0;
  console.log(`${name.padEnd(58)} ${String(iterations).padStart(7)} runs  total ${ms.toFixed(1).padStart(8)} ms  ${(ms / iterations).toFixed(2).padStart(9)} ms/op`);
}

(async () => {
  console.log(`node ${process.version}\n`);

  // ---------------- posCart ----------------
  console.log("== posCart");
  const mkLines = (n) => Array.from({ length: n }, (_, i) => ({
    key: "k" + i, itemId: i % 300, name: "Item " + i, unitPrice: 10 + (i % 50), qty: 1 + (i % 3),
    modifiers: i % 4 ? [] : [{ groupId: 1, optionId: "l", label: "Large", priceDelta: 5 }], discountPct: i % 10 === 0 ? 5 : 0,
  }));
  const cfg = { tax: { rate: 14, inclusive: true }, serviceChargePercent: 12, decimals: 2 };
  const l20 = mkLines(20), l200 = mkLines(200), l2000 = mkLines(2000);
  bench("cartTotals 20 lines", 100000, () => posCart.cartTotals(l20, 5, cfg));
  bench("cartTotals 200 lines", 10000, () => posCart.cartTotals(l200, 5, cfg));
  bench("cartTotals 2000 lines", 1000, () => posCart.cartTotals(l2000, 5, cfg));
  const mods = [{ groupId: 1, optionId: "l" }, { groupId: 2, optionId: "x" }];
  bench("add-to-cart merge scan (findIndex+sameLine) 200 lines", 10000, (i) => l200.findIndex((l) => posCart.sameLine(l, i % 300, mods)));
  const t = posCart.cartTotals([{ key: "a", itemId: 1, name: "a", unitPrice: 100, qty: 1, modifiers: [], discountPct: 0 }], 0, cfg);
  console.log(`  sanity: 100 incl. 14% VAT + 12% service -> total ${t.total}, tax ${t.tax}, service ${t.serviceCharge}`);

  // ---------------- sessionPricing ----------------
  console.log("\n== sessionPricing (computeSessionCharge, per tile per tick)");
  const pr = { unit: "block", blockMinutes: 15, rounding: "up", minimumCharge: 10, graceMinutes: 3,
    rates: [{ type: "PS5", mode: "single", perHour: 40, bands: [{ from: "00:00", to: "06:00", perHour: 30 }, { from: "18:00", to: "23:59", perHour: 50, days: [4, 5] }] },
            { type: "PS5", mode: "multi", perHour: 60 }, { type: "Billiard", perHour: 50 }] };
  const now = Date.now();
  const sess = (mins, segs) => ({ pricing: pr, type: "PS5", mode: "single", start: new Date(now - mins * 60000).toISOString(), now, pausedMs: 0, segments: segs });
  bench("30 min session", 20000, () => pricing.computeSessionCharge(sess(30)));
  bench("3 h session", 5000, () => pricing.computeSessionCharge(sess(180)));
  bench("12 h session, 2 mode segments", 1000, () => pricing.computeSessionCharge(sess(720, [{ mode: "single", start: new Date(now - 720 * 60000).toISOString() }, { mode: "multi", start: new Date(now - 300 * 60000).toISOString() }])));
  // equality check vs. the original (unoptimised) per-minute algorithm
  {
    const hm = (s) => { const [h, m] = s.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
    const refRateAt = (rule, at) => { if (!rule) return 0; const mins = at.getHours() * 60 + at.getMinutes();
      for (const b of rule.bands || []) { if (b.days && b.days.length && !b.days.includes(at.getDay())) continue; const f = hm(b.from), t = hm(b.to);
        if (f <= t ? mins >= f && mins < t : mins >= f || mins < t) return b.perHour; } return rule.perHour; };
    let mismatches = 0;
    for (let k = 0; k < 300; k++) {
      const mins = (k * 37) % 2000 + 1;
      const inp = sess(mins, k % 3 ? undefined : [{ mode: "single", start: new Date(now - mins * 60000).toISOString() }, { mode: "multi", start: new Date(now - (mins / 2) * 60000).toISOString() }]);
      inp.now = now - (k * 7919 * 60000) % (7 * 86400000);
      inp.start = new Date(inp.now - mins * 60000).toISOString();
      const got = pricing.computeSessionCharge(inp);
      // reference amount
      const startMs = new Date(inp.start).getTime(), endMs = inp.now, grace = pr.graceMinutes;
      const minutes = Math.max(0, endMs - startMs) / 60000; let billable = Math.max(0, minutes - grace);
      billable = Math.ceil(billable / pr.blockMinutes - 1e-9) * pr.blockMinutes;
      const segs = (inp.segments && inp.segments.length ? inp.segments : [{ mode: inp.mode, start: inp.start }]).map((s) => ({ mode: s.mode, at: new Date(s.start).getTime() })).sort((a, b) => a.at - b.at);
      let amount = 0; const total = Math.min(billable, 2880);
      for (let i = 0; i < total; i++) { const t = startMs + (grace + i) * 60000; let mode = segs[0].mode; for (const s of segs) if (s.at <= t) mode = s.mode; amount += refRateAt(pricing.findRate(pr, "PS5", mode), new Date(t)) / 60; }
      amount = Math.round(amount * 100) / 100; if (minutes > 0) amount = Math.max(amount, pr.minimumCharge);
      if (Math.abs(amount - got.timeAmount) > 1e-9) mismatches++;
    }
    console.log(`  equality vs original algorithm: ${300 - mismatches}/300 identical`);
  }
  const per48 = bench("48 h session (worst case, capped loop)", 300, () => pricing.computeSessionCharge(sess(2880)));
  const per3 = bench("TileBoard tick: 40 tiles x 3 h (x2 calls/tick)", 500, () => { for (let k = 0; k < 80; k++) pricing.computeSessionCharge(sess(180)); });
  console.log(`  => 40 running 3h tiles cost ~${(per3 / 1000).toFixed(2)} ms per 1 s tick; one 48 h tile ~${(per48 / 1000).toFixed(2)} ms`);

  // ---------------- scanParse ----------------
  console.log("\n== scanParse");
  const scaleRule = { prefixes: ["21", "22"], itemCodeLength: 5, valueLength: 5, valueType: "weight", divisor: 1000 };
  bench("plain EAN-13", 200000, () => scan.parseScan("6221234567890", { gs1: true, scale: scaleRule }));
  bench("GS1 parenthesised (01)(10)(17)(21)", 200000, () => scan.parseScan("(01)06221234567890(10)AB12(17)271231(21)SN99", { gs1: true }));
  bench("GS1 raw with GS separators", 200000, () => scan.parseScan("0106221234567890" + "10AB12\x1d" + "17271200" + "30" + "12", { gs1: true }));
  bench("scale barcode 21 + item + weight", 200000, () => scan.parseScan("2112345012508", { scale: scaleRule }));
  const p1 = scan.parseScan("0106221234567890" + "10AB12\x1d" + "17271200" + "3012", { gs1: true });
  const p2 = scan.parseScan("2112345012508", { scale: scaleRule });
  console.log(`  sanity: raw GS1 -> lookup ${p1.lookup}, batch ${p1.batch}, expiry ${p1.expiry}, qty ${p1.qty}; scale -> item ${p2.lookup}, qty ${p2.qty}`);

  // ---------------- paged data over 100k mock rows ----------------
  console.log("\n== paged data (createLocalProvider + usePagedData append/dedupe) over 100,000 rows");
  const N = 100000;
  const rows = Array.from({ length: N }, (_, i) => ({ ItemID: i + 1, CategoryID: i % 20, NameEn: "Item " + i, Barcode: String(6220000000000 + i), Price: (i % 500) + 0.5 }));
  const src = { tableName: "Items", keyField: "ItemID", orderBy: "NameEn" };
  const provider = kit.createLocalProvider({ Items: rows }, 0);
  await benchAsync("page 1 (pageSize 40), sort by NameEn", 20, () => provider({ source: src, page: 1, pageSize: 40 }));
  await benchAsync("page 1, where CategoryID = 7", 20, () => provider({ source: src, where: { CategoryID: 7 }, page: 1, pageSize: 40 }));
  await benchAsync("page 1, search 'item 99' in 2 fields", 20, () => provider({ source: src, search: { text: "item 99", fields: ["NameEn", "Barcode"] }, page: 1, pageSize: 40 }));
  await benchAsync("page 2500 (last), no sort", 20, () => provider({ source: { tableName: "Items", keyField: "ItemID" }, page: 2500, pageSize: 40 }));
  // usePagedData append path: same code as the hook (Set of keys + filter + concat), loading 100k in pages of 100
  {
    let acc = [];
    const t0 = performance.now();
    let worst = 0;
    for (let pg = 1; pg <= N / 100; pg++) {
      const page = rows.slice((pg - 1) * 100, pg * 100);
      const s0 = performance.now();
      const seen = new Set(acc.map((r) => r.ItemID));
      acc = acc.concat(page.filter((r) => !seen.has(r.ItemID)));
      worst = Math.max(worst, performance.now() - s0);
    }
    const ms = performance.now() - t0;
    console.log(`${"append/dedupe 1000 pages x 100 -> 100k rows (hook logic)".padEnd(58)} total ${ms.toFixed(1)} ms, slowest single append ${worst.toFixed(2)} ms (at ${acc.length} rows)`);
  }
  // VirtualList window math
  {
    const itemHeight = 44, viewH = 700, overscan = 6;
    let maxRendered = 0;
    for (let st = 0; st < N * itemHeight; st += 997) {
      const q = Math.floor(st / itemHeight) * itemHeight;
      const start = Math.max(0, Math.floor(q / itemHeight) - overscan);
      const end = Math.min(N, Math.ceil((q + viewH) / itemHeight) + 1 + overscan);
      maxRendered = Math.max(maxRendered, end - start);
      const firstVisible = Math.floor(st / itemHeight), lastVisible = Math.min(N - 1, Math.floor((st + viewH - 1) / itemHeight));
      if (firstVisible < start || lastVisible >= end) { console.log("  VirtualList GAP at scrollTop " + st); break; }
    }
    console.log(`  VirtualList (100k rows, row 44px, view 700px): max rows mounted = ${maxRendered}, no gaps across ${Math.floor(N * itemHeight / 997)} scroll positions`);
  }
})();
