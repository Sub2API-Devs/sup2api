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
import { SPEC_FILE_NAME_PATTERN, isPlainObjectNonArray } from "./appFacts.js";
import { isValidSpecName, collapseAndTruncate, APP_STOPPED_LABELS, APP_STATE_LABELS } from "./runState.js";

//@ chunk-ae5g0zb5.js:46894-46987 placement
/**
 * 取出规格文件名 stem
 */
function specStems(e) {
  return e
    .map((n) => SPEC_FILE_NAME_PATTERN.exec(n)?.[1])
    .filter((n) => n !== undefined)
    .sort()
    .slice(0, 50);
}
//@ chunk-ae5g0zb5.js:46987-47116 placement
/**
 * 解析不超过 256KB 的 JSON 对象，否则 null。
 */
function parseJsonObject(e) {
  if (typeof e !== "string" || e.length > 262144) return null;
  try {
    let parsed = JSON.parse(e);
    return isPlainObjectNonArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
//@ chunk-ae5g0zb5.js:47116-47186 placement
/**
 * 解析 names/areas 映射（最多 500）
 */
function parseNamesMap(e) {
  return new Map(isPlainObjectNonArray(e) ? Object.entries(e).slice(0, 500) : []);
}
//@ chunk-ae5g0zb5.js:47186-47281 placement
/**
 * 限定范围的整数秒
 */
function asSeconds(e) {
  return typeof e === "number" && Number.isFinite(e) && e >= 0 && e <= 1e7 ? Math.round(e) : null;
}
//@ chunk-ae5g0zb5.js:47281-49217 placement
/**
 * 解析 progress.ndjson（start/claim/PASS/FAIL/BLOCKED 事件）与 names.json、decisions.json，得到运行快照。
 */
function parseRunProgress(e) {
  let filtered = String(e.progress ?? "")
    .split(
      `
`,
      2000,
    )
    .map(parseJsonObject)
    .filter((R) => R !== null);
  let found = filtered.find((R) => R.event === "start");
  if (found === undefined) return null;
  let jsonObject = parseJsonObject(e.names);
  let namesMap = parseNamesMap(jsonObject?.names);
  let namesMap_2 = parseNamesMap(jsonObject?.areas);
  let i = jsonObject?.data;
  let c = new Set(Array.isArray(i) ? i.slice(0, 500).filter(isValidSpecName) : []);
  let drop = parseJsonObject(e.decisions)?.drop;
  let S = new Set(Array.isArray(drop) ? drop.slice(0, 500).filter(isValidSpecName) : []);
  let w = new Map();
  let f = new Map();
  for (let R of filtered) {
    let { spec, verdict, s: ye } = R;
    if (R.event === "claim" && isValidSpecName(spec)) f.set(spec, asSeconds(ye));
    if (isValidSpecName(spec) && (verdict === "PASS" || verdict === "FAIL" || verdict === "BLOCKED")) {
      w.delete(spec);
      w.set(spec, {
        verdict,
        s: asSeconds(ye),
      });
    }
  }
  let b = Array.isArray(found.specs) ? found.specs.slice(0, 500).filter(isValidSpecName) : [];
  let P = [];
  for (let R of [...b, ...w.keys()]) {
    if (P.includes(R) || S.has(R) || P.length >= 50) continue;
    if (e.hasResults && !w.has(R)) continue;
    P.push(R);
  }
  let sorted = [...w.entries()].filter(([, R]) => R.s !== null).sort((R, V) => (R[1].s ?? 0) - (V[1].s ?? 0));
  let O = new Map();
  let j = 0;
  for (let [R, V] of sorted) {
    let Z = f.get(R);
    O.set(R, Math.max(0, (V.s ?? 0) - (Z ?? j)));
    j = V.s ?? j;
  }
  let se = new Map([...f.entries()].filter(([R]) => !w.has(R) && !S.has(R)));
  let mapped = P.map((R) => {
    let V = namesMap.get(R);
    let Z = typeof V === "string" ? collapseAndTruncate(V, 140) : undefined;
    let ye = namesMap_2.get(R);
    return {
      stem: R,
      name: Z !== undefined && Z !== "" ? Z : collapseAndTruncate(R, 140),
      area: typeof ye === "string" && APP_STOPPED_LABELS.test(ye) ? ye : null,
      verdict: w.get(R)?.verdict ?? null,
      seconds: O.get(R) ?? null,
      addsData: c.has(R),
    };
  });
  let last = [...w.keys()].filter((key) => P.includes(key)).at(-1);
  let ce = typeof found.at === "string" ? Date.parse(found.at) : NaN;
  let pe = e.hasResults ? parseJsonObject(e.results) : null;
  let seconds = pe?.seconds;
  let skipped = pe?.skipped;
  return {
    rows: mapped,
    app: typeof jsonObject?.app === "string" && APP_STATE_LABELS.test(jsonObject.app) ? jsonObject.app : null,
    started: true,
    finished: e.hasResults,
    hasLog: e.hasLog === true,
    running: e.hasResults
      ? null
      : (mapped.find((R) => (f.size > 0 ? se.has(R.stem) : R.verdict === null))?.stem ?? null),
    ...(f.size > 0 &&
      !e.hasResults && {
        lanesRunning: se,
      }),
    lastDone: last ?? null,
    startedAtMs: Number.isFinite(ce) ? ce : null,
    doneAtS: Math.max(0, ...[...w.values()].map((R) => R.s ?? 0)),
    seconds:
      typeof seconds === "number" && Number.isInteger(seconds) && seconds >= 0 && seconds <= 1e7
        ? seconds
        : null,
    ...(typeof skipped === "number" &&
      Number.isInteger(skipped) &&
      skipped >= 1 &&
      skipped <= 1e4 && {
        skipped,
      }),
  };
}
//@ chunk-ae5g0zb5.js:49217-49385 placement
/**
 * 毫秒格式化为 “1h 2m 3s” / “2m 3s” / “3s”。
 */
function formatElapsed(e) {
  let max = Math.max(0, Math.floor(e / 1000));
  let r = max % 60;
  let o = Math.floor(max / 60) % 60;
  let floored = Math.floor(max / 3600);
  if (floored > 0) return `${floored}h ${o}m ${r}s`;
  return o > 0 ? `${o}m ${r}s` : `${r}s`;
}
//@ chunk-ae5g0zb5.js:49385-49572 placement
/**
 * 按终端（ghostty/darwin/其他）选择的旋转符号帧。
 */
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
        : SPINNER_FRAMES.other;
  let r = e.term === "xterm-ghostty" || e.termProgram === "ghostty";
  return {
    spinner: [...n, ...n.toReversed()],
    fill: r ? "\u2588" : "\u25B0",
    empty: r ? "\u2591" : "\u25B1",
  };
}
//@ chunk-ae5g0zb5.js:49816-49830 placement
/**
 * 内联图片能力
 */
var INLINE_IMAGE_SUPPORT = supportsInlineImages({});
//@ chunk-ae5g0zb5.js:49830-49903 placement
/**
 * 按时间取 spinner 帧
 */
function spinnerGlyph(e, n = INLINE_IMAGE_SUPPORT) {
  return n.spinner[Math.floor(e / 250) % n.spinner.length];
}
//@ chunk-ae5g0zb5.js:49903-50024 placement
/**
 * PASS/FAIL/BLOCKED 的符号
 */
var VERDICT_MARKS = {
  PASS: "\u2713",
  FAIL: "\u2717",
  BLOCKED: "\u26A0",
};
var VERDICT_TONES = {
  PASS: "success",
  FAIL: "error",
  BLOCKED: "warning",
};
var MAX_THREAD_ROWS = 3;
var DEFAULT_PANE_WIDTH = 30;
var MIN_PANE_WIDTH = 6;
//@ chunk-ae5g0zb5.js:50024-50074 placement
/**
 * 拼接 spans 文本
 */
function joinSpans(e) {
  return e.map((n) => n.text).join("");
}
//@ chunk-ae5g0zb5.js:50074-50156 placement
/**
 * 超长截断加省略号
 */
function truncateWithEllipsis(e, n) {
  if (e.length <= n) return e;
  return n <= 0 ? "" : `${e.slice(0, n - 1)}\u2026`;
}
//@ chunk-ae5g0zb5.js:50156-50350 placement
/**
 * 按单词把文本折行到宽度 n。
 */
function wrapWords(e, n) {
  if (e.length <= n) return [e];
  let r = [];
  let o = "";
  for (let s of e.split(" "))
    if (o !== "" && o.length + 1 + s.length > n) {
      r.push(o);
      o = s;
    } else o = o === "" ? s : `${o} ${s}`;
  r.push(o);
  return r.map((s) => truncateWithEllipsis(s, n));
}
//@ chunk-ae5g0zb5.js:50350-50458 placement
/**
 * 由文本片段生成折行的文本块。
 */
function textBlock(e, ...n) {
  let filtered = n.filter((o) => o.text !== "");
  return {
    kind: "text",
    text: wrapWords(joinSpans(filtered), e).join(`
`),
    spans: filtered,
  };
}
//@ chunk-ae5g0zb5.js:50458-50496 placement
/**
 * 空文本 span
 */
var EMPTY_TEXT_SPAN = {
  kind: "text",
  text: "",
  spans: [],
};
//@ chunk-ae5g0zb5.js:50496-50696 placement
/**
 * 计算折行位置（优先在 “· ” 之后断开）。
 */
function findWrapPoints(e, n) {
  let r = [];
  let o = 0;
  while (e.length - o > n) {
    let s = o + n;
    let a = -1;
    for (let i = s; i > o; i -= 1)
      if (e[i] === " " && e[i - 1] === "\xB7") {
        a = i;
        break;
      }
    if (a === -1) a = e.lastIndexOf(" ", s);
    if (a <= o) break;
    r.push(a);
    o = a + 1;
  }
  return r;
}
//@ chunk-ae5g0zb5.js:50696-50849 placement
/**
 * 在片段的指定位置插入换行。
 */
function insertLineBreaks(e, wrapPoints) {
  let r = 0;
  return e.map((o) => {
    let s = [...o.text];
    let a = r;
    r += o.text.length;
    for (let i of wrapPoints)
      if (i >= a && i < r)
        s[i - a] = `
`;
    return {
      ...o,
      text: s.join(""),
    };
  });
}
//@ chunk-ae5g0zb5.js:50849-51260 placement
/**
 * 生成面板行：前导标记、正文（可折行）和右侧文字。
 */
function buildRow(e, n, r, o, s = false) {
  let filtered = r.filter((S) => S.text !== "");
  let i = joinSpans(n);
  let max = Math.max(0, e - i.length - (o === null ? 0 : o.text.length + 1));
  if (s && o === null && max > 0) {
    let wrapPoints = findWrapPoints(joinSpans(filtered), max);
    let w = insertLineBreaks(filtered, wrapPoints);
    return {
      kind: "row",
      text: joinSpans(w)
        .split(
          `
`,
        )
        .map((line, b) => (b === 0 ? i : " ".repeat(i.length)) + truncateWithEllipsis(line, max)).join(`
`),
      lead: n,
      body: w,
      right: o,
      wraps: true,
    };
  }
  let _ = truncateWithEllipsis(joinSpans(filtered), max);
  return {
    kind: "row",
    text: o === null ? i + _ : `${i}${_.padEnd(max)} ${o.text}`,
    lead: n,
    body: filtered,
    right: o,
  };
}
//@ chunk-ae5g0zb5.js:51260-51579 placement
/**
 * 用 “·” 连接的条目列表按宽度折行并缩进。
 */
function buildItemsBlock(e, n, r, o) {
  let mapped = r.map((_, S) => (S < r.length - 1 ? `${_} \xB7` : _));
  let max = Math.max(1, e - n);
  let i = [];
  let c = "";
  for (let _ of mapped)
    if (c !== "" && c.length + 1 + _.length > max) {
      i.push(c);
      c = _;
    } else c = c === "" ? _ : `${c} ${_}`;
  if (c !== "") i.push(c);
  return {
    kind: "items",
    text: i.map((_) => " ".repeat(n) + truncateWithEllipsis(_, max)).join(`
`),
    indent: n,
    items: mapped,
    ...(o === undefined
      ? {}
      : {
          tone: o,
        }),
  };
}
//@ chunk-ae5g0zb5.js:51579-51646 placement
/**
 * 生成带前导空格的条目
 */
function spacedItem(mark, n = "  ") {
  return [
    ...(n === ""
      ? []
      : [
          {
            text: n,
          },
        ]),
    mark,
    {
      text: " ",
    },
  ];
}
//@ chunk-ae5g0zb5.js:51646-51730 placement
/**
 * 该规格是否在并行通道中运行
 */
function isLaneRunning(e, stem) {
  return e.lanesRunning !== undefined ? e.lanesRunning.has(stem) : stem === e.running;
}
//@ chunk-ae5g0zb5.js:51730-51910 placement
/**
 * 并行通道中某规格已运行的秒数。
 */
function laneElapsedSeconds(e, stem, r) {
  let o = e.lanesRunning?.get(stem);
  if (o === undefined || o === null || e.startedAtMs === null) return secondsSinceLastDone(e, r);
  let rounded = Math.round((r - e.startedAtMs) / 1000 - o);
  return rounded >= 0 && rounded < 86400 ? rounded : null;
}
//@ chunk-ae5g0zb5.js:51910-52110 placement
/**
 * 运行总耗时（秒）。
 */
function runElapsedSeconds(e, n, r) {
  if (e.finished) return e.seconds ?? e.doneAtS;
  if (e.startedAtMs === null || (e.rows.length > 0 && n === e.rows.length)) return e.doneAtS;
  return Math.max(e.doneAtS, Math.floor((r - e.startedAtMs) / 1000));
}
//@ chunk-ae5g0zb5.js:52110-52242 placement
/**
 * 距上一项完成已过去的秒数。
 */
function secondsSinceLastDone(e, n) {
  if (e.startedAtMs === null) return null;
  let rounded = Math.round((n - e.startedAtMs) / 1000 - e.doneAtS);
  return rounded >= 0 && rounded < 86400 ? rounded : null;
}
//@ chunk-ae5g0zb5.js:52242-52366 placement
/**
 * 按平均耗时估计剩余时间（取整到 5 秒）。
 */
function estimateRemainingSeconds(e, n, r, o = 0) {
  if (n === 0 || e <= 0) return null;
  let s = (e / n) * (r - n) - Math.max(0, o);
  return s <= 0 ? 0 : Math.max(5, Math.round(s / 5) * 5);
}
//@ chunk-ae5g0zb5.js:52366-52377 placement
/**
 * 10000
 */
var RUN_STALE_MS = 1e4;
export {
  parseJsonObject,
  parseRunProgress,
  specStems,
  RUN_STALE_MS,
  runElapsedSeconds,
  buildRow,
  spacedItem,
  buildItemsBlock,
  textBlock,
  VERDICT_TONES,
  isLaneRunning,
  DEFAULT_PANE_WIDTH,
  MIN_PANE_WIDTH,
  INLINE_IMAGE_SUPPORT,
  formatElapsed,
  laneElapsedSeconds,
  spinnerGlyph,
  EMPTY_TEXT_SPAN,
  secondsSinceLastDone,
  estimateRemainingSeconds,
  joinSpans,
  MAX_THREAD_ROWS,
  VERDICT_MARKS,
  supportsInlineImages,
};
