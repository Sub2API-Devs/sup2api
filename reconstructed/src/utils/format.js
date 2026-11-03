/**
 * utils/format.ts
 *
 * 格式化工具：时长、相对时间、重置时间、文件大小、数字（compact）、日志元数据。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/format.ts
 * pieces: chunk-2a8yx6fc.js (1), chunk-4qtr4g5p.js (1), chunk-tw8fk0yz.js (30), chunk-xkeryp4t.js (2)
 * attribution: fingerprint 2, placement 2, facade-exports 25, layout 5
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import {
  getGraphemeSegmenter,
  getNumberFormat,
  getRelativeTimeFormat,
  getDateTimeFormat,
  getTimeZone,
} from "./intl.js";
import { wrapAnsi } from "../ink/wrapAnsi.js";
import { round } from "../cost-tracker.js";
import { plural } from "./stringUtils.js";
import { SHELL_HISTORY_SOURCES, ie } from "../services/autoModeSetup/pregather.js";
import { llr } from "./sessionTimeZone.js";

//@ chunk-tw8fk0yz.js:12766-13017 facade-exports
function truncatePathMiddle(e, n) {
  if (bunStringWidth(e) <= n) return e;
  if (n <= 0) return "\u2026";
  if (n < 5) return truncateToWidth(e, n);
  let index = e.lastIndexOf("/"),
    r = index >= 0 ? index : e.lastIndexOf("\\"),
    t = r >= 0 ? e.slice(r) : e,
    u = r >= 0 ? e.slice(0, r) : "",
    o = bunStringWidth(t);
  if (o >= n - 1) return truncateStartToWidth(e, n);
  let l = n - 1 - o;
  return truncateToWidthNoEllipsis(u, l) + "\u2026" + t;
}
//@ chunk-tw8fk0yz.js:13017-13186 facade-exports
function truncateToWidth(e, n) {
  if (bunStringWidth(e) <= n) return e;
  if (n <= 1) return "\u2026";
  let s = 0,
    r = "";
  for (let { segment: segment } of getGraphemeSegmenter().segment(e)) {
    let u = bunStringWidth(segment);
    if (s + u > n - 1) break;
    ((r += segment), (s += u));
  }
  return r + "\u2026";
}
//@ chunk-tw8fk0yz.js:13186-13430 facade-exports
function truncateStartToWidth(e, n) {
  if (bunStringWidth(e) <= n) return e;
  if (n <= 1) return "\u2026";
  let s = n - 1,
    r = [...getGraphemeSegmenter().segment(e)],
    t = 0,
    u = r.length;
  for (let o = r.length - 1; o >= 0; o--) {
    let l = bunStringWidth(r[o].segment);
    if (t + l > s) break;
    ((t += l), (u = o));
  }
  return `\u2026${r
    .slice(u)
    .map((o) => o.segment)
    .join("")}`;
}
//@ chunk-tw8fk0yz.js:13430-13582 facade-exports
function truncateToWidthNoEllipsis(e, n) {
  if (bunStringWidth(e) <= n) return e;
  if (n <= 0) return "";
  let s = 0,
    r = "";
  for (let { segment: segment } of getGraphemeSegmenter().segment(e)) {
    let u = bunStringWidth(segment);
    if (s + u > n) break;
    ((r += segment), (s += u));
  }
  return r;
}
//@ chunk-tw8fk0yz.js:13582-13597 layout
var Pe = 8,
  Ge = 40;
//@ chunk-tw8fk0yz.js:13597-13646 layout
function ISr(e, n) {
  return truncateToWidth(e, Math.max(Ge, n - Pe));
}
//@ chunk-tw8fk0yz.js:13646-13828 facade-exports
function truncate(e, n, s = !1) {
  let r = e;
  if (s) {
    let index = e.indexOf(`
`);
    if (index !== -1) {
      if (((r = e.substring(0, index)), bunStringWidth(r) + 1 > n)) return truncateToWidth(`${r}\u2026`, n);
      return `${r}\u2026`;
    }
  }
  if (bunStringWidth(r) <= n) return r;
  return truncateToWidth(r, n);
}
/**
 * 按显示宽度把字符串切成若干段（按字素，不拆字符）。
 */
//@ chunk-tw8fk0yz.js:13828-13987 layout
function splitByDisplayWidth(e, n) {
  let s = [],
    r = "",
    t = 0;
  for (let { segment: segment } of getGraphemeSegmenter().segment(e)) {
    let o = bunStringWidth(segment);
    if (t + o <= n) ((r += segment), (t += o));
    else {
      if (r) s.push(r);
      ((r = segment), (t = o));
    }
  }
  if (r) s.push(r);
  return s;
}
/**
 * 按宽度硬换行，超过最大行数时截断并在末行加省略号。
 */
//@ chunk-tw8fk0yz.js:13987-14180 layout
function wrapToMaxLines(e, n, s) {
  if (s <= 0 || n <= 0) return "";
  let parts = wrapAnsi(e, n, { trim: !0, hard: !0 }).split(`
`);
  if (parts.length <= s)
    return parts.join(`
`);
  let sliced = parts.slice(0, s);
  return (
    (sliced[s - 1] = truncateToWidth((sliced[s - 1] ?? "") + "\u2026", n)),
    sliced.join(`
`)
  );
}
//@ chunk-tw8fk0yz.js:14180-14228 facade-exports
function formatSecondsShort(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}
/**
 * 格式化时长（ms）：如 "1h 2m 3s"、"45s"，可选隐藏 0 单位或最大单位数。被 60+ 处使用。
 */
//@ chunk-tw8fk0yz.js:14228-14928 facade-exports = formatDuration (1)
function formatDuration(ms, options) {
  if (ms < 60000) {
    if (ms === 0) return "0s";
    if (ms < 1) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 1000).toString()}s`;
  }
  let days = Math.floor(ms / 86400000),
    hours = Math.floor((ms % 86400000) / 3600000),
    minutes = Math.floor((ms % 3600000) / 60000),
    seconds = Math.round((ms % 60000) / 1000);
  if (seconds === 60) ((seconds = 0), minutes++);
  if (minutes === 60) ((minutes = 0), hours++);
  if (hours === 24) ((hours = 0), days++);
  let hide = options?.hideTrailingZeros;
  if (options?.mostSignificantOnly) {
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
  if (days > 0) {
    if (hide && hours === 0 && minutes === 0) return `${days}d`;
    if (hide && minutes === 0) return `${days}d ${hours}h`;
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    if (hide && minutes === 0 && seconds === 0) return `${hours}h`;
    if (hide && seconds === 0) return `${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    if (hide && seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
//@ chunk-tw8fk0yz.js:14928-15022 facade-exports
function formatDurationCoarse(e) {
  let n = e >= 60000 ? Math.round(e / 60000) * 60000 : e;
  return formatDuration(n, { hideTrailingZeros: !0 });
}
//@ chunk-tw8fk0yz.js:15022-15312 facade-exports
function formatBarElapsed(e) {
  let max = Math.max(0, Math.floor(e / 1000));
  if (max < 60) return `${max}s`;
  let floored = Math.floor(max / 60);
  if (floored < 60) return `${floored}m${String(max % 60).padStart(2, "0")}s`;
  let floored_2 = Math.floor(floored / 60);
  if (floored_2 < 24) return `${floored_2}h${String(floored % 60).padStart(2, "0")}m`;
  return `${Math.floor(floored_2 / 24)}d${String(floored_2 % 24).padStart(2, "0")}h`;
}
//@ chunk-tw8fk0yz.js:15312-15460 fingerprint = getNumberFormatter (0.786)
var COMPACT_ONE_DECIMAL = { notation: "compact", maximumFractionDigits: 1, minimumFractionDigits: 1 },
  COMPACT_MAX_ONE_DECIMAL = { notation: "compact", maximumFractionDigits: 1, minimumFractionDigits: 0 };
//@ chunk-tw8fk0yz.js:15460-15576 facade-exports = getBudgetContinuationMessage (0.676)
function formatNumber(e) {
  let n = typeof e === "number" ? e : Number.NaN,
    s = n >= 1000;
  return getNumberFormat("en-US", s ? COMPACT_ONE_DECIMAL : COMPACT_MAX_ONE_DECIMAL)
    .format(n)
    .toLowerCase();
}
//@ chunk-tw8fk0yz.js:15576-15621 facade-exports
function formatTokens(count) {
  return formatNumber(count).replace(".0", "");
}
//@ chunk-tw8fk0yz.js:15621-15693 facade-exports = formatCost (1)
function formatCost(cost, maxDecimalPlaces = 4) {
  return `$${cost > 0.5 ? round(cost, 100).toFixed(2) : cost.toFixed(maxDecimalPlaces)}`;
}
//@ chunk-tw8fk0yz.js:15735-15846 facade-exports
var UNKNOWN_MODEL_COST_NOTE = "costs may be inaccurate due to usage of unknown models",
  ORG_MODEL_PRICING_NOTE = "at your organization's configured rates";
//@ chunk-tw8fk0yz.js:15846-16085 facade-exports = formatModelUsage (0.794)
function formatModelTokenCounts(e) {
  return (
    `${formatNumber(e.inputTokens)} input, ${formatNumber(e.outputTokens)} output, ${formatNumber(e.cacheReadInputTokens)} cache read, ${formatNumber(e.cacheCreationInputTokens)} cache write` +
    (e.webSearchRequests > 0 ? `, ${formatNumber(e.webSearchRequests)} web search` : "")
  );
}
//@ chunk-tw8fk0yz.js:16085-16157 facade-exports
function formatTokenEstimate(e) {
  if (e < 20) return "< 20";
  return `~${formatTokens(Math.round(e / 10) * 10)}`;
}
/**
 * 相对时间（Intl.RelativeTimeFormat，narrow/long），如 "3h ago"/"in 2d"。
 */
//@ chunk-tw8fk0yz.js:16157-16898 facade-exports = formatRelativeTime (0.965)
function formatRelativeTime(date, options = {}) {
  let {
      style: style = "narrow",
      numeric: numeric = "always",
      maxUnit: maxUnit,
      now: now = new Date(),
    } = options,
    diffInMs = date.getTime() - now.getTime(),
    diffInSeconds = Math.trunc(diffInMs / 1000),
    intervals = [
      { unit: "year", seconds: 31536000, shortUnit: "y" },
      { unit: "month", seconds: 2592000, shortUnit: "mo" },
      { unit: "week", seconds: 604800, shortUnit: "w" },
      { unit: "day", seconds: 86400, shortUnit: "d" },
      { unit: "hour", seconds: 3600, shortUnit: "h" },
      { unit: "minute", seconds: 60, shortUnit: "m" },
      { unit: "second", seconds: 1, shortUnit: "s" },
    ],
    a = maxUnit ? intervals.filter((c) => c.seconds <= 86400) : intervals;
  for (let { unit: unit, seconds: intervalSeconds, shortUnit: shortUnit } of a)
    if (Math.abs(diffInSeconds) >= intervalSeconds) {
      let value = Math.trunc(diffInSeconds / intervalSeconds);
      if (style === "narrow")
        return diffInSeconds < 0 ? `${Math.abs(value)}${shortUnit} ago` : `in ${value}${shortUnit}`;
      return getRelativeTimeFormat("long", numeric).format(value, unit);
    }
  if (style === "narrow") return diffInSeconds <= 0 ? "0s ago" : "in 0s";
  return getRelativeTimeFormat(style, "auto").format(0, "second");
}
//@ chunk-tw8fk0yz.js:16898-17021 facade-exports = formatRelativeTimeAgo (1)
function formatRelativeTimeAgo(date, options = {}) {
  let { now: now = new Date(), ...r } = options;
  if (date > now) return formatRelativeTime(date, { ...r, now: now });
  return formatRelativeTime(date, { ...r, numeric: "always", now: now });
}
//@ chunk-tw8fk0yz.js:17021-17398 facade-exports = formatLogMetadata (0.962)
function formatLogMetadata(log) {
  let sizeOrCount = log.fileSize !== void 0 ? formatFileSize(log.fileSize) : `${log.messageCount} messages`,
    s = [
      formatRelativeTimeAgo(log.modified, { style: "short" }),
      ...(log.sessionKind === "bg" ? ["bg"] : []),
      ...(log.gitBranch ? [log.gitBranch] : []),
      sizeOrCount,
    ];
  if (log.tag) s.push(`#${log.tag}`);
  if (log.agentSetting) s.push(`@${log.agentSetting}`);
  if (log.prNumber) s.push(log.prRepository ? `${log.prRepository}#${log.prNumber}` : `#${log.prNumber}`);
  return s.join(" \xB7 ");
}
//@ chunk-tw8fk0yz.js:17398-17664 layout
function getMinutesAndYear(e, n) {
  if (n === void 0) return { minutes: e.getMinutes(), year: e.getFullYear() };
  let s = new Map(
    getDateTimeFormat("en-US", { timeZone: n, year: "numeric", minute: "numeric" })
      .formatToParts(e)
      .map((r) => [r.type, r.value]),
  );
  return { minutes: Number(s.get("minute")), year: Number(s.get("year")) };
}
/**
 * 重置时间显示：今天只显示时刻，否则带月日，可附时区。
 */
//@ chunk-tw8fk0yz.js:17664-18263 facade-exports = formatResetTime (0.882)
function formatResetTime(e, n = !1, s = !0, r = !1, t) {
  if (!e) return;
  let date = new Date(e * 1000),
    now = new Date(),
    { minutes: minutes, year: year } = getMinutesAndYear(date, t),
    a = n || t !== void 0 ? ` (${t ?? getTimeZone()})` : "",
    hoursUntilReset = (date.getTime() - now.getTime()) / 3600000;
  if (r || hoursUntilReset > 24) {
    let g = {
      month: "short",
      day: "numeric",
      hour: s ? "numeric" : void 0,
      minute: !s || minutes === 0 ? void 0 : "2-digit",
      hour12: s ? !0 : void 0,
      timeZone: t,
    };
    if (year !== getMinutesAndYear(now, t).year) g.year = "numeric";
    return date.toLocaleString("en-US", g).replace(/[ \u202f]([AP]M)/i, (A, ampm) => ampm.toLowerCase()) + a;
  }
  return (
    date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: minutes === 0 ? void 0 : "2-digit",
        hour12: !0,
        timeZone: t,
      })
      .replace(/[ \u202f]([AP]M)/i, (g, ampm) => ampm.toLowerCase()) + a
  );
}
//@ chunk-tw8fk0yz.js:18263-18362 facade-exports = formatResetText (1)
function formatResetText(e, n = !1, s = !0, r = !1) {
  let dt = new Date(e);
  return `${formatResetTime(Math.floor(dt.getTime() / 1000), n, s, r)}`;
}
//@ chunk-tw8fk0yz.js:18362-18407 facade-exports
function utilizationPercent(e) {
  return Math.round(e * 1000) / 10;
}
//@ chunk-tw8fk0yz.js:18407-18451 facade-exports
function planWindowPercent(e) {
  return Math.min(utilizationPercent(e), 100);
}
//@ chunk-tw8fk0yz.js:18451-18523 facade-exports
function formatOverflowHint(e, n = "line") {
  if (e <= 0) return "";
  return `\u2026 +${e} ${plural(e, n)}`;
}
//@ chunk-tw8fk0yz.js:18523-18577 facade-exports
function formatKb(e) {
  return Math.max(1, Math.round(e / 1000));
}
/**
 * 格式化文件大小：bytes/KB/MB/GB。被 70+ 处使用。
 */
//@ chunk-xkeryp4t.js:191-420 facade-exports = formatFileSize (1)
function formatFileSize(sizeInBytes) {
  let e = sizeInBytes / 1024;
  if (e < 1) return `${sizeInBytes} bytes`;
  if (e < 1024) return `${e.toFixed(1).replace(/\.0$/, "")}KB`;
  let t = e / 1024;
  if (t < 1024) return `${t.toFixed(1).replace(/\.0$/, "")}MB`;
  return `${(t / 1024).toFixed(1).replace(/\.0$/, "")}GB`;
}
/**
 * 以十进制单位格式化字节数（B/kB/MB）。
 */
//@ chunk-xkeryp4t.js:420-558 placement
function formatBytesDecimal(r) {
  if (r < 1000) return `${r} B`;
  if (r < 999500) return `${Math.round(r / 1000)} kB`;
  return `${(r / 1e6).toFixed(1).replace(/\.0$/, "")} MB`;
}
//@ chunk-2a8yx6fc.js:19013-19287 fingerprint = formatNumber (0.645)
function formatNumber_2(number) {
  let n = new Set(),
    r = [];
  for (let o of SHELL_HISTORY_SOURCES) {
    let resolved = o.resolve(number);
    if (resolved === void 0) continue;
    let resolved_2 = ie(number.platform).resolve(resolved.path),
      a = number.platform === "windows" ? resolved_2.toLowerCase() : resolved_2;
    if (n.has(a)) continue;
    (n.add(a), r.push({ label: o.label, path: resolved.path, format: resolved.format ?? o.format }));
  }
  return r;
}
//@ chunk-4qtr4g5p.js:264-319 placement
function xk(e, o = !1, n = !0, t = !1) {
  return formatResetTime(e, o, n, t, llr());
}

export {
  formatTokenEstimate,
  formatNumber,
  formatFileSize,
  formatRelativeTime,
  truncateToWidth,
  truncateToWidthNoEllipsis,
  truncateStartToWidth,
  wrapToMaxLines,
  xk,
  formatDurationCoarse,
  formatDuration,
  truncatePathMiddle,
  formatBytesDecimal,
  formatTokens,
  formatRelativeTimeAgo,
  ISr,
  truncate,
  formatResetTime,
  formatBarElapsed,
  formatLogMetadata,
  planWindowPercent,
  utilizationPercent,
  formatOverflowHint,
  formatNumber_2,
  formatKb,
  formatResetText,
  splitByDisplayWidth,
  formatSecondsShort,
  formatModelTokenCounts,
  formatCost,
  UNKNOWN_MODEL_COST_NOTE,
  ORG_MODEL_PRICING_NOTE,
};
