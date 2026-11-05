/**
 * plugins/bundled/claudeTest/progress.ts
 *
 * 2.1.316 新增：Claude Test 解析测试代理的 progress.ndjson 与 names/decisions，得到运行进度
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mhn0amzz.js (27)
 * attribution: placement 27
 */
import { SPEC_FILE_NAME_PATTERN, isPlainObjectNonArray } from "./appFacts.js";
import { isValidSpecName, collapseAndTruncate, APP_STOPPED_LABELS, APP_STATE_LABELS } from "./runState.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-mhn0amzz.js:48132-48225 placement
/**
 * 取出规格文件名 stem
 */
function specStems(fileNames) {
  return fileNames
    .map((fileName) => SPEC_FILE_NAME_PATTERN.exec(fileName)?.[1])
    .filter((stem) => stem !== undefined)
    .sort()
    .slice(0, 50);
}
//@ chunk-mhn0amzz.js:48225-48354 placement
/**
 * 解析不超过 256KB 的 JSON 对象，否则 null。
 */
function parseJsonObject(text) {
  if (typeof text !== "string" || text.length > 262144) return null;
  try {
    let parsed = JSON.parse(text);
    return isPlainObjectNonArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
//@ chunk-mhn0amzz.js:48354-48424 placement
/**
 * 解析 names/areas 映射（最多 500）
 */
function parseNamesMap(value) {
  return new Map(isPlainObjectNonArray(value) ? Object.entries(value).slice(0, 500) : []);
}
//@ chunk-mhn0amzz.js:48424-48519 placement
/**
 * 限定范围的整数秒
 */
function asSeconds(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e7
    ? Math.round(value)
    : null;
}
//@ chunk-mhn0amzz.js:48519-50455 placement
/**
 * 解析 progress.ndjson（start/claim/PASS/FAIL/BLOCKED 事件）与 names.json、decisions.json，得到运行快照。
 */
function parseRunProgress(runFolder) {
  let filtered = String(runFolder.progress ?? "")
    .split(
      `
`,
      2000,
    )
    .map(parseJsonObject)
    .filter((entry) => entry !== null);
  let found = filtered.find((startEvent) => startEvent.event === "start");
  if (found === undefined) return null;
  let jsonObject = parseJsonObject(runFolder.names);
  let namesMap = parseNamesMap(jsonObject?.names);
  let namesMap_2 = parseNamesMap(jsonObject?.areas);
  let dataStems = jsonObject?.data;
  let dataAdds = new Set(Array.isArray(dataStems) ? dataStems.slice(0, 500).filter(isValidSpecName) : []);
  let drop = parseJsonObject(runFolder.decisions)?.drop;
  let dropped = new Set(Array.isArray(drop) ? drop.slice(0, 500).filter(isValidSpecName) : []);
  let verdicts = new Map();
  let claims = new Map();
  for (let entry of filtered) {
    let { spec, verdict, s: seconds } = entry;
    if (entry.event === "claim" && isValidSpecName(spec)) claims.set(spec, asSeconds(seconds));
    if (isValidSpecName(spec) && (verdict === "PASS" || verdict === "FAIL" || verdict === "BLOCKED")) {
      verdicts.delete(spec);
      verdicts.set(spec, {
        verdict,
        s: asSeconds(seconds),
      });
    }
  }
  let startStems = Array.isArray(found.specs) ? found.specs.slice(0, 500).filter(isValidSpecName) : [];
  let stems = [];
  for (let stem of [...startStems, ...verdicts.keys()]) {
    if (stems.includes(stem) || dropped.has(stem) || stems.length >= 50) continue;
    if (runFolder.hasResults && !verdicts.has(stem)) continue;
    stems.push(stem);
  }
  let sorted = [...verdicts.entries()]
    .filter(([, value]) => value.s !== null)
    .sort((a, b) => (a[1].s ?? 0) - (b[1].s ?? 0));
  let durations = new Map();
  let prevEnd = 0;
  for (let [stem, entry] of sorted) {
    let claimedAt = claims.get(stem);
    durations.set(stem, Math.max(0, (entry.s ?? 0) - (claimedAt ?? prevEnd)));
    prevEnd = entry.s ?? prevEnd;
  }
  let lanes = new Map([...claims.entries()].filter(([stem]) => !verdicts.has(stem) && !dropped.has(stem)));
  let mapped = stems.map((stem) => {
    let rawName = namesMap.get(stem);
    let name = typeof rawName === "string" ? collapseAndTruncate(rawName, 140) : undefined;
    let rawArea = namesMap_2.get(stem);
    return {
      stem,
      name: name !== undefined && name !== "" ? name : collapseAndTruncate(stem, 140),
      area: typeof rawArea === "string" && APP_STOPPED_LABELS.test(rawArea) ? rawArea : null,
      verdict: verdicts.get(stem)?.verdict ?? null,
      seconds: durations.get(stem) ?? null,
      addsData: dataAdds.has(stem),
    };
  });
  let last = [...verdicts.keys()].filter((key) => stems.includes(key)).at(-1);
  let startedAt = typeof found.at === "string" ? Date.parse(found.at) : NaN;
  let results = runFolder.hasResults ? parseJsonObject(runFolder.results) : null;
  let seconds = results?.seconds;
  let skipped = results?.skipped;
  return {
    rows: mapped,
    app: typeof jsonObject?.app === "string" && APP_STATE_LABELS.test(jsonObject.app) ? jsonObject.app : null,
    started: true,
    finished: runFolder.hasResults,
    hasLog: runFolder.hasLog === true,
    running: runFolder.hasResults
      ? null
      : (mapped.find((row) => (claims.size > 0 ? lanes.has(row.stem) : row.verdict === null))?.stem ?? null),
    ...(claims.size > 0 &&
      !runFolder.hasResults && {
        lanesRunning: lanes,
      }),
    lastDone: last ?? null,
    startedAtMs: Number.isFinite(startedAt) ? startedAt : null,
    doneAtS: Math.max(0, ...[...verdicts.values()].map((verdict) => verdict.s ?? 0)),
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
//@ chunk-mhn0amzz.js:50455-50623 placement
/**
 * 毫秒格式化为 “1h 2m 3s” / “2m 3s” / “3s”。
 */
function formatElapsed(ms) {
  let max = Math.max(0, Math.floor(ms / 1000));
  let seconds = max % 60;
  let minutes = Math.floor(max / 60) % 60;
  let floored = Math.floor(max / 3600);
  if (floored > 0) return `${floored}h ${minutes}m ${seconds}s`;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
//@ chunk-mhn0amzz.js:50623-50810 placement
/**
 * 按终端（ghostty/darwin/其他）选择的旋转符号帧。
 */
var SPINNER_FRAMES = {
  ghostty: ["\xB7", "\u2722", "\u2733", "\u2736", "\u273B", "\u273B"],
  darwin: ["\xB7", "\u2722", "\u2733", "\u2736", "\u273B", "\u273D"],
  other: ["\xB7", "\u2722", "*", "\u2736", "\u273B", "\u273D"],
};
//@ chunk-mhn0amzz.js:50810-51054 placement
function supportsInlineImages(env) {
  let frames =
    env.term === "xterm-ghostty"
      ? SPINNER_FRAMES.ghostty
      : env.platform === "darwin"
        ? SPINNER_FRAMES.darwin
        : SPINNER_FRAMES.other;
  let isGhostty = env.term === "xterm-ghostty" || env.termProgram === "ghostty";
  return {
    spinner: [...frames, ...frames.toReversed()],
    fill: isGhostty ? "\u2588" : "\u25B0",
    empty: isGhostty ? "\u2591" : "\u25B1",
  };
}
//@ chunk-mhn0amzz.js:51054-51068 placement
/**
 * 内联图片能力
 */
var INLINE_IMAGE_SUPPORT; // deferred: uses supportsInlineImages of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mhn0amzz.js:51054", () => {
  INLINE_IMAGE_SUPPORT = supportsInlineImages({});
});
//@ chunk-mhn0amzz.js:51068-51141 placement
/**
 * 按时间取 spinner 帧
 */
function spinnerGlyph(now, caps = INLINE_IMAGE_SUPPORT) {
  return caps.spinner[Math.floor(now / 250) % caps.spinner.length];
}
//@ chunk-mhn0amzz.js:51141-51262 placement
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
//@ chunk-mhn0amzz.js:51262-51312 placement
/**
 * 拼接 spans 文本
 */
function joinSpans(spans) {
  return spans.map((span) => span.text).join("");
}
//@ chunk-mhn0amzz.js:51312-51394 placement
/**
 * 超长截断加省略号
 */
function truncateWithEllipsis(text, maxWidth) {
  if (text.length <= maxWidth) return text;
  return maxWidth <= 0 ? "" : `${text.slice(0, maxWidth - 1)}\u2026`;
}
//@ chunk-mhn0amzz.js:51394-51588 placement
/**
 * 按单词把文本折行到宽度 n。
 */
function wrapWords(text, width) {
  if (text.length <= width) return [text];
  let lines = [];
  let current = "";
  for (let word of text.split(" "))
    if (current !== "" && current.length + 1 + word.length > width) {
      lines.push(current);
      current = word;
    } else current = current === "" ? word : `${current} ${word}`;
  lines.push(current);
  return lines.map((line) => truncateWithEllipsis(line, width));
}
//@ chunk-mhn0amzz.js:51588-51696 placement
/**
 * 由文本片段生成折行的文本块。
 */
function textBlock(width, ...spans) {
  let filtered = spans.filter((span) => span.text !== "");
  return {
    kind: "text",
    text: wrapWords(joinSpans(filtered), width).join(`
`),
    spans: filtered,
  };
}
//@ chunk-mhn0amzz.js:51696-51734 placement
/**
 * 空文本 span
 */
var EMPTY_TEXT_SPAN = {
  kind: "text",
  text: "",
  spans: [],
};
//@ chunk-mhn0amzz.js:51734-51934 placement
/**
 * 计算折行位置（优先在 “· ” 之后断开）。
 */
function findWrapPoints(text, width) {
  let points = [];
  let start = 0;
  while (text.length - start > width) {
    let limit = start + width;
    let found = -1;
    for (let index = limit; index > start; index -= 1)
      if (text[index] === " " && text[index - 1] === "\xB7") {
        found = index;
        break;
      }
    if (found === -1) found = text.lastIndexOf(" ", limit);
    if (found <= start) break;
    points.push(found);
    start = found + 1;
  }
  return points;
}
//@ chunk-mhn0amzz.js:51934-52087 placement
/**
 * 在片段的指定位置插入换行。
 */
function insertLineBreaks(spans, wrapPoints) {
  let offset = 0;
  return spans.map((span) => {
    let chars = [...span.text];
    let spanStart = offset;
    offset += span.text.length;
    for (let point of wrapPoints)
      if (point >= spanStart && point < offset)
        chars[point - spanStart] = `
`;
    return {
      ...span,
      text: chars.join(""),
    };
  });
}
//@ chunk-mhn0amzz.js:52087-52498 placement
/**
 * 生成面板行：前导标记、正文（可折行）和右侧文字。
 */
function buildRow(width, lead, body, right, wrap = false) {
  let spans = body.filter((span) => span.text !== "");
  let leadText = joinSpans(lead);
  let max = Math.max(0, width - leadText.length - (right === null ? 0 : right.text.length + 1));
  if (wrap && right === null && max > 0) {
    let wrapPoints = findWrapPoints(joinSpans(spans), max);
    let wrappedBody = insertLineBreaks(spans, wrapPoints);
    return {
      kind: "row",
      text: joinSpans(wrappedBody)
        .split(
          `
`,
        )
        .map(
          (line, index) =>
            (index === 0 ? leadText : " ".repeat(leadText.length)) + truncateWithEllipsis(line, max),
        ).join(`
`),
      lead,
      body: wrappedBody,
      right,
      wraps: true,
    };
  }
  let bodyText = truncateWithEllipsis(joinSpans(spans), max);
  return {
    kind: "row",
    text: right === null ? leadText + bodyText : `${leadText}${bodyText.padEnd(max)} ${right.text}`,
    lead,
    body: spans,
    right,
  };
}
//@ chunk-mhn0amzz.js:52498-52817 placement
/**
 * 用 “·” 连接的条目列表按宽度折行并缩进。
 */
function buildItemsBlock(width, indent, items, tone) {
  let mapped = items.map((item, index) => (index < items.length - 1 ? `${item} \xB7` : item));
  let max = Math.max(1, width - indent);
  let lines = [];
  let current = "";
  for (let item of mapped)
    if (current !== "" && current.length + 1 + item.length > max) {
      lines.push(current);
      current = item;
    } else current = current === "" ? item : `${current} ${item}`;
  if (current !== "") lines.push(current);
  return {
    kind: "items",
    text: lines.map((line) => " ".repeat(indent) + truncateWithEllipsis(line, max)).join(`
`),
    indent,
    items: mapped,
    ...(tone === undefined
      ? {}
      : {
          tone,
        }),
  };
}
//@ chunk-mhn0amzz.js:52817-52884 placement
/**
 * 生成带前导空格的条目
 */
function spacedItem(mark, gap = "  ") {
  return [
    ...(gap === ""
      ? []
      : [
          {
            text: gap,
          },
        ]),
    mark,
    {
      text: " ",
    },
  ];
}
//@ chunk-mhn0amzz.js:52884-52968 placement
/**
 * 该规格是否在并行通道中运行
 */
function isLaneRunning(run, stem) {
  return run.lanesRunning !== undefined ? run.lanesRunning.has(stem) : stem === run.running;
}
//@ chunk-mhn0amzz.js:52968-53148 placement
/**
 * 并行通道中某规格已运行的秒数。
 */
function laneElapsedSeconds(run, stem, readAt) {
  let laneSince = run.lanesRunning?.get(stem);
  if (laneSince === undefined || laneSince === null || run.startedAtMs === null)
    return secondsSinceLastDone(run, readAt);
  let rounded = Math.round((readAt - run.startedAtMs) / 1000 - laneSince);
  return rounded >= 0 && rounded < 86400 ? rounded : null;
}
//@ chunk-mhn0amzz.js:53148-53348 placement
/**
 * 运行总耗时（秒）。
 */
function runElapsedSeconds(run, doneRows, readAt) {
  if (run.finished) return run.seconds ?? run.doneAtS;
  if (run.startedAtMs === null || (run.rows.length > 0 && doneRows === run.rows.length)) return run.doneAtS;
  return Math.max(run.doneAtS, Math.floor((readAt - run.startedAtMs) / 1000));
}
//@ chunk-mhn0amzz.js:53348-53480 placement
/**
 * 距上一项完成已过去的秒数。
 */
function secondsSinceLastDone(run, readAt) {
  if (run.startedAtMs === null) return null;
  let rounded = Math.round((readAt - run.startedAtMs) / 1000 - run.doneAtS);
  return rounded >= 0 && rounded < 86400 ? rounded : null;
}
//@ chunk-mhn0amzz.js:53480-53604 placement
/**
 * 按平均耗时估计剩余时间（取整到 5 秒）。
 */
function estimateRemainingSeconds(elapsedSeconds, doneCount, totalCount, lastDoneSeconds = 0) {
  if (doneCount === 0 || elapsedSeconds <= 0) return null;
  let remaining = (elapsedSeconds / doneCount) * (totalCount - doneCount) - Math.max(0, lastDoneSeconds);
  return remaining <= 0 ? 0 : Math.max(5, Math.round(remaining / 5) * 5);
}
//@ chunk-mhn0amzz.js:53604-53615 placement
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
