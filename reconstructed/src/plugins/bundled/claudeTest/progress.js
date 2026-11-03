/**
 * plugins/bundled/claudeTest/progress.ts
 *
 * 2.1.316 新增：Claude Test 解析测试代理的 progress.ndjson 与 names/decisions，得到运行进度
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (27)
 * attribution: placement 27
 */
import { SPEC_FILE_NAME_PATTERN, G } from "./appFacts.js";
import { nt, collapseAndTruncate, Sl, Er } from "./runState.js";

//@ chunk-ae5g0zb5.js:46894-46987 placement
function mn(e) {
  return e
    .map((n) => SPEC_FILE_NAME_PATTERN.exec(n)?.[1])
    .filter((n) => n !== void 0)
    .sort()
    .slice(0, 50);
}
/**
 * 解析不超过 256KB 的 JSON 对象，否则 null。
 */
//@ chunk-ae5g0zb5.js:46987-47116 placement
function parseJsonObject(e) {
  if (typeof e !== "string" || e.length > 262144) return null;
  try {
    let parsed = JSON.parse(e);
    return G(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
//@ chunk-ae5g0zb5.js:47116-47186 placement
function ms(e) {
  return new Map(G(e) ? Object.entries(e).slice(0, 500) : []);
}
//@ chunk-ae5g0zb5.js:47186-47281 placement
function gs(e) {
  return typeof e === "number" && Number.isFinite(e) && e >= 0 && e <= 1e7 ? Math.round(e) : null;
}
/**
 * 解析 progress.ndjson（start/claim/PASS/FAIL/BLOCKED 事件）与 names.json、decisions.json，得到运行快照。
 */
//@ chunk-ae5g0zb5.js:47281-49217 placement
function parseRunProgress(e) {
  let filtered = String(e.progress ?? "")
      .split(
        `
`,
        2000,
      )
      .map(parseJsonObject)
      .filter((R) => R !== null),
    found = filtered.find((R) => R.event === "start");
  if (found === void 0) return null;
  let o = parseJsonObject(e.names),
    s = ms(o?.names),
    a = ms(o?.areas),
    i = o?.data,
    c = new Set(Array.isArray(i) ? i.slice(0, 500).filter(nt) : []),
    _ = parseJsonObject(e.decisions)?.drop,
    S = new Set(Array.isArray(_) ? _.slice(0, 500).filter(nt) : []),
    w = new Map(),
    f = new Map();
  for (let R of filtered) {
    let { spec: spec, verdict: verdict, s: ye } = R;
    if (R.event === "claim" && nt(spec)) f.set(spec, gs(ye));
    if (nt(spec) && (verdict === "PASS" || verdict === "FAIL" || verdict === "BLOCKED"))
      (w.delete(spec), w.set(spec, { verdict: verdict, s: gs(ye) }));
  }
  let b = Array.isArray(found.specs) ? found.specs.slice(0, 500).filter(nt) : [],
    P = [];
  for (let R of [...b, ...w.keys()]) {
    if (P.includes(R) || S.has(R) || P.length >= 50) continue;
    if (e.hasResults && !w.has(R)) continue;
    P.push(R);
  }
  let sorted = [...w.entries()].filter(([, R]) => R.s !== null).sort((R, V) => (R[1].s ?? 0) - (V[1].s ?? 0)),
    O = new Map(),
    j = 0;
  for (let [R, V] of sorted) {
    let Z = f.get(R);
    (O.set(R, Math.max(0, (V.s ?? 0) - (Z ?? j))), (j = V.s ?? j));
  }
  let se = new Map([...f.entries()].filter(([R]) => !w.has(R) && !S.has(R))),
    mapped = P.map((R) => {
      let V = s.get(R),
        Z = typeof V === "string" ? collapseAndTruncate(V, 140) : void 0,
        ye = a.get(R);
      return {
        stem: R,
        name: Z !== void 0 && Z !== "" ? Z : collapseAndTruncate(R, 140),
        area: typeof ye === "string" && Sl.test(ye) ? ye : null,
        verdict: w.get(R)?.verdict ?? null,
        seconds: O.get(R) ?? null,
        addsData: c.has(R),
      };
    }),
    at = [...w.keys()].filter((R) => P.includes(R)).at(-1),
    ce = typeof found.at === "string" ? Date.parse(found.at) : NaN,
    pe = e.hasResults ? parseJsonObject(e.results) : null,
    ie = pe?.seconds,
    he = pe?.skipped;
  return {
    rows: mapped,
    app: typeof o?.app === "string" && Er.test(o.app) ? o.app : null,
    started: !0,
    finished: e.hasResults,
    hasLog: e.hasLog === !0,
    running: e.hasResults
      ? null
      : (mapped.find((R) => (f.size > 0 ? se.has(R.stem) : R.verdict === null))?.stem ?? null),
    ...(f.size > 0 && !e.hasResults && { lanesRunning: se }),
    lastDone: at ?? null,
    startedAtMs: Number.isFinite(ce) ? ce : null,
    doneAtS: Math.max(0, ...[...w.values()].map((R) => R.s ?? 0)),
    seconds: typeof ie === "number" && Number.isInteger(ie) && ie >= 0 && ie <= 1e7 ? ie : null,
    ...(typeof he === "number" && Number.isInteger(he) && he >= 1 && he <= 1e4 && { skipped: he }),
  };
}
/**
 * 毫秒格式化为 “1h 2m 3s” / “2m 3s” / “3s”。
 */
//@ chunk-ae5g0zb5.js:49217-49385 placement
function formatElapsed(e) {
  let max = Math.max(0, Math.floor(e / 1000)),
    r = max % 60,
    o = Math.floor(max / 60) % 60,
    floored = Math.floor(max / 3600);
  if (floored > 0) return `${floored}h ${o}m ${r}s`;
  return o > 0 ? `${o}m ${r}s` : `${r}s`;
}
/**
 * 按终端（ghostty/darwin/其他）选择的旋转符号帧。
 */
//@ chunk-ae5g0zb5.js:49385-49572 placement
var SPINNER_FRAMES = {
  ghostty: ["\xB7", "\u2722", "\u2733", "\u2736", "\u273B", "\u273B"],
  darwin: ["\xB7", "\u2722", "\u2733", "\u2736", "\u273B", "\u273D"],
  other: ["\xB7", "\u2722", "*", "\u2736", "\u273B", "\u273D"],
};
//@ chunk-ae5g0zb5.js:49572-49816 placement
function supportsInlineImages(e) {
  let n =
      e.term === "xterm-ghostty"
        ? SPINNER_FRAMES.ghostty
        : e.platform === "darwin"
          ? SPINNER_FRAMES.darwin
          : SPINNER_FRAMES.other,
    r = e.term === "xterm-ghostty" || e.termProgram === "ghostty";
  return {
    spinner: [...n, ...n.toReversed()],
    fill: r ? "\u2588" : "\u25B0",
    empty: r ? "\u2591" : "\u25B1",
  };
}
//@ chunk-ae5g0zb5.js:49816-49830 placement
var Zs = supportsInlineImages({});
//@ chunk-ae5g0zb5.js:49830-49903 placement
function Il(e, n = Zs) {
  return n.spinner[Math.floor(e / 250) % n.spinner.length];
}
/**
 * 结论标记与色调、布局常量。
 */
//@ chunk-ae5g0zb5.js:49903-50024 placement
var VERDICT_MARKS = { PASS: "\u2713", FAIL: "\u2717", BLOCKED: "\u26A0" },
  VERDICT_TONES = { PASS: "success", FAIL: "error", BLOCKED: "warning" },
  Cl = 3,
  Dl = 30,
  Fl = 6;
//@ chunk-ae5g0zb5.js:50024-50074 placement
function ot(e) {
  return e.map((n) => n.text).join("");
}
//@ chunk-ae5g0zb5.js:50074-50156 placement
function fn(e, n) {
  if (e.length <= n) return e;
  return n <= 0 ? "" : `${e.slice(0, n - 1)}\u2026`;
}
/**
 * 按单词把文本折行到宽度 n。
 */
//@ chunk-ae5g0zb5.js:50156-50350 placement
function wrapWords(e, n) {
  if (e.length <= n) return [e];
  let r = [],
    o = "";
  for (let s of e.split(" "))
    if (o !== "" && o.length + 1 + s.length > n) (r.push(o), (o = s));
    else o = o === "" ? s : `${o} ${s}`;
  return (r.push(o), r.map((s) => fn(s, n)));
}
/**
 * 由文本片段生成折行的文本块。
 */
//@ chunk-ae5g0zb5.js:50350-50458 placement
function textBlock(e, ...n) {
  let filtered = n.filter((o) => o.text !== "");
  return {
    kind: "text",
    text: wrapWords(ot(filtered), e).join(`
`),
    spans: filtered,
  };
}
//@ chunk-ae5g0zb5.js:50458-50496 placement
var Ve = { kind: "text", text: "", spans: [] };
/**
 * 计算折行位置（优先在 “· ” 之后断开）。
 */
//@ chunk-ae5g0zb5.js:50496-50696 placement
function findWrapPoints(e, n) {
  let r = [],
    o = 0;
  while (e.length - o > n) {
    let s = o + n,
      a = -1;
    for (let i = s; i > o; i -= 1)
      if (e[i] === " " && e[i - 1] === "\xB7") {
        a = i;
        break;
      }
    if (a === -1) a = e.lastIndexOf(" ", s);
    if (a <= o) break;
    (r.push(a), (o = a + 1));
  }
  return r;
}
/**
 * 在片段的指定位置插入换行。
 */
//@ chunk-ae5g0zb5.js:50696-50849 placement
function insertLineBreaks(e, n) {
  let r = 0;
  return e.map((o) => {
    let s = [...o.text],
      a = r;
    r += o.text.length;
    for (let i of n)
      if (i >= a && i < r)
        s[i - a] = `
`;
    return { ...o, text: s.join("") };
  });
}
/**
 * 生成面板行：前导标记、正文（可折行）和右侧文字。
 */
//@ chunk-ae5g0zb5.js:50849-51260 placement
function buildRow(e, n, r, o, s = !1) {
  let filtered = r.filter((S) => S.text !== ""),
    i = ot(n),
    max = Math.max(0, e - i.length - (o === null ? 0 : o.text.length + 1));
  if (s && o === null && max > 0) {
    let S = findWrapPoints(ot(filtered), max),
      w = insertLineBreaks(filtered, S);
    return {
      kind: "row",
      text: ot(w)
        .split(
          `
`,
        )
        .map((f, b) => (b === 0 ? i : " ".repeat(i.length)) + fn(f, max)).join(`
`),
      lead: n,
      body: w,
      right: o,
      wraps: !0,
    };
  }
  let _ = fn(ot(filtered), max);
  return {
    kind: "row",
    text: o === null ? i + _ : `${i}${_.padEnd(max)} ${o.text}`,
    lead: n,
    body: filtered,
    right: o,
  };
}
/**
 * 用 “·” 连接的条目列表按宽度折行并缩进。
 */
//@ chunk-ae5g0zb5.js:51260-51579 placement
function buildItemsBlock(e, n, r, o) {
  let mapped = r.map((_, S) => (S < r.length - 1 ? `${_} \xB7` : _)),
    max = Math.max(1, e - n),
    i = [],
    c = "";
  for (let _ of mapped)
    if (c !== "" && c.length + 1 + _.length > max) (i.push(c), (c = _));
    else c = c === "" ? _ : `${c} ${_}`;
  if (c !== "") i.push(c);
  return {
    kind: "items",
    text: i.map((_) => " ".repeat(n) + fn(_, max)).join(`
`),
    indent: n,
    items: mapped,
    ...(o === void 0 ? {} : { tone: o }),
  };
}
//@ chunk-ae5g0zb5.js:51579-51646 placement
function Te(e, n = "  ") {
  return [...(n === "" ? [] : [{ text: n }]), e, { text: " " }];
}
//@ chunk-ae5g0zb5.js:51646-51730 placement
function kt(e, n) {
  return e.lanesRunning !== void 0 ? e.lanesRunning.has(n) : n === e.running;
}
/**
 * 并行通道中某规格已运行的秒数。
 */
//@ chunk-ae5g0zb5.js:51730-51910 placement
function laneElapsedSeconds(e, n, r) {
  let o = e.lanesRunning?.get(n);
  if (o === void 0 || o === null || e.startedAtMs === null) return secondsSinceLastDone(e, r);
  let rounded = Math.round((r - e.startedAtMs) / 1000 - o);
  return rounded >= 0 && rounded < 86400 ? rounded : null;
}
/**
 * 运行总耗时（秒）。
 */
//@ chunk-ae5g0zb5.js:51910-52110 placement
function runElapsedSeconds(e, n, r) {
  if (e.finished) return e.seconds ?? e.doneAtS;
  if (e.startedAtMs === null || (e.rows.length > 0 && n === e.rows.length)) return e.doneAtS;
  return Math.max(e.doneAtS, Math.floor((r - e.startedAtMs) / 1000));
}
/**
 * 距上一项完成已过去的秒数。
 */
//@ chunk-ae5g0zb5.js:52110-52242 placement
function secondsSinceLastDone(e, n) {
  if (e.startedAtMs === null) return null;
  let rounded = Math.round((n - e.startedAtMs) / 1000 - e.doneAtS);
  return rounded >= 0 && rounded < 86400 ? rounded : null;
}
/**
 * 按平均耗时估计剩余时间（取整到 5 秒）。
 */
//@ chunk-ae5g0zb5.js:52242-52366 placement
function estimateRemainingSeconds(e, n, r, o = 0) {
  if (n === 0 || e <= 0) return null;
  let s = (e / n) * (r - n) - Math.max(0, o);
  return s <= 0 ? 0 : Math.max(5, Math.round(s / 5) * 5);
}
//@ chunk-ae5g0zb5.js:52366-52377 placement
var Ul = 1e4;

export {
  parseJsonObject,
  parseRunProgress,
  mn,
  Ul,
  runElapsedSeconds,
  buildRow,
  Te,
  buildItemsBlock,
  textBlock,
  VERDICT_TONES,
  kt,
  Dl,
  Fl,
  Zs,
  formatElapsed,
  laneElapsedSeconds,
  Il,
  Ve,
  secondsSinceLastDone,
  estimateRemainingSeconds,
  ot,
  Cl,
  VERDICT_MARKS,
  supportsInlineImages,
};
