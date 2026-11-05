/**
 * utils/format.ts
 *
 * 格式化工具：时长、相对时间、重置时间、文件大小、数字（compact）、日志元数据。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/format.ts
 * pieces: chunk-8h0sw7zg.js (1), chunk-8n1fbght.js (30), chunk-fta1hp2w.js (1), chunk-j78f68ax.js (2)
 * attribution: placement 2, facade-exports 25, layout 5, fingerprint 2
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
import { effectiveSessionTimeZone } from "./sessionTimeZone.js";
import { SHELL_HISTORY_SOURCES, getPathModuleForPlatform } from "../services/autoModeSetup/pregather.js";

//@ chunk-j78f68ax.js:191-420 facade-exports (2.1.88 match: formatFileSize, 1)
/**
 * 格式化文件大小：bytes/KB/MB/GB。被 70+ 处使用。
 */
function formatFileSize(sizeInBytes) {
  let kb = sizeInBytes / 1024;
  if (kb < 1) return `${sizeInBytes} bytes`;
  if (kb < 1024) return `${kb.toFixed(1).replace(/\.0$/, "")}KB`;
  let mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1).replace(/\.0$/, "")}MB`;
  return `${(mb / 1024).toFixed(1).replace(/\.0$/, "")}GB`;
}
//@ chunk-j78f68ax.js:420-558 placement
/**
 * 以十进制单位格式化字节数（B/kB/MB）。
 */
function formatBytesDecimal(bytes) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 999500) return `${Math.round(bytes / 1000)} kB`;
  return `${(bytes / 1e6).toFixed(1).replace(/\.0$/, "")} MB`;
}
//@ chunk-8n1fbght.js:12780-13031 facade-exports
function truncatePathMiddle(text, maxWidth) {
  if (bunStringWidth(text) <= maxWidth) return text;
  if (maxWidth <= 0) return "\u2026";
  if (maxWidth < 5) return truncateToWidth(text, maxWidth);
  let index = text.lastIndexOf("/");
  let sepIndex = index >= 0 ? index : text.lastIndexOf("\\");
  let tail = sepIndex >= 0 ? text.slice(sepIndex) : text;
  let head = sepIndex >= 0 ? text.slice(0, sepIndex) : "";
  let tailWidth = bunStringWidth(tail);
  if (tailWidth >= maxWidth - 1) return truncateStartToWidth(text, maxWidth);
  let headWidth = maxWidth - 1 - tailWidth;
  return truncateToWidthNoEllipsis(head, headWidth) + "\u2026" + tail;
}
//@ chunk-8n1fbght.js:13031-13200 facade-exports
function truncateToWidth(text, maxWidth) {
  if (bunStringWidth(text) <= maxWidth) return text;
  if (maxWidth <= 1) return "\u2026";
  let width = 0;
  let result = "";
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    let segWidth = bunStringWidth(segment);
    if (width + segWidth > maxWidth - 1) break;
    result += segment;
    width += segWidth;
  }
  return result + "\u2026";
}
//@ chunk-8n1fbght.js:13200-13444 facade-exports
function truncateStartToWidth(text, maxWidth) {
  if (bunStringWidth(text) <= maxWidth) return text;
  if (maxWidth <= 1) return "\u2026";
  let budgetWidth = maxWidth - 1;
  let segments = [...getGraphemeSegmenter().segment(text)];
  let tailWidth = 0;
  let startIndex = segments.length;
  for (let i = segments.length - 1; i >= 0; i--) {
    let segWidth = bunStringWidth(segments[i].segment);
    if (tailWidth + segWidth > budgetWidth) break;
    tailWidth += segWidth;
    startIndex = i;
  }
  return `\u2026${segments
    .slice(startIndex)
    .map((segmentEntry) => segmentEntry.segment)
    .join("")}`;
}
//@ chunk-8n1fbght.js:13444-13596 facade-exports
function truncateToWidthNoEllipsis(text, maxWidth) {
  if (bunStringWidth(text) <= maxWidth) return text;
  if (maxWidth <= 0) return "";
  let width = 0;
  let result = "";
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    let segWidth = bunStringWidth(segment);
    if (width + segWidth > maxWidth) break;
    result += segment;
    width += segWidth;
  }
  return result;
}
//@ chunk-8n1fbght.js:13596-13611 layout
var ROW_CHROME_COLUMNS = 8;
var MIN_WRAPPED_COLUMNS = 40;
//@ chunk-8n1fbght.js:13611-13660 layout
/**
 * 按剩余可用宽度截断文本（总宽减去行首装饰宽度）。
 */
function truncateToRemainingWidth(text, maxWidth) {
  return truncateToWidth(text, Math.max(MIN_WRAPPED_COLUMNS, maxWidth - ROW_CHROME_COLUMNS));
}
//@ chunk-8n1fbght.js:13660-13842 facade-exports
function truncate(text, maxWidth, singleLine = false) {
  let candidate = text;
  if (singleLine) {
    let index = text.indexOf(`
`);
    if (index !== -1) {
      candidate = text.substring(0, index);
      if (bunStringWidth(candidate) + 1 > maxWidth) return truncateToWidth(`${candidate}\u2026`, maxWidth);
      return `${candidate}\u2026`;
    }
  }
  if (bunStringWidth(candidate) <= maxWidth) return candidate;
  return truncateToWidth(candidate, maxWidth);
}
//@ chunk-8n1fbght.js:13842-14001 layout
/**
 * 按显示宽度把字符串切成若干段（按字素，不拆字符）。
 */
function splitByDisplayWidth(text, maxWidth) {
  let chunks = [];
  let current = "";
  let currentWidth = 0;
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    let segWidth = bunStringWidth(segment);
    if (currentWidth + segWidth <= maxWidth) {
      current += segment;
      currentWidth += segWidth;
    } else {
      if (current) chunks.push(current);
      current = segment;
      currentWidth = segWidth;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
//@ chunk-8n1fbght.js:14001-14194 layout
/**
 * 按宽度硬换行，超过最大行数时截断并在末行加省略号。
 */
function wrapToMaxLines(text, width, maxLines) {
  if (maxLines <= 0 || width <= 0) return "";
  let lines = wrapAnsi(text, width, {
    trim: true,
    hard: true,
  }).split(`
`);
  if (lines.length <= maxLines)
    return lines.join(`
`);
  let sliced = lines.slice(0, maxLines);
  sliced[maxLines - 1] = truncateToWidth((sliced[maxLines - 1] ?? "") + "\u2026", width);
  return sliced.join(`
`);
}
//@ chunk-8n1fbght.js:14194-14242 facade-exports
function formatSecondsShort(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}
//@ chunk-8n1fbght.js:14242-14942 facade-exports (2.1.88 match: formatDuration, 1)
/**
 * 格式化时长（ms）：如 "1h 2m 3s"、"45s"，可选隐藏 0 单位或最大单位数。被 60+ 处使用。
 */
function formatDuration(ms, options) {
  if (ms < 60000) {
    if (ms === 0) return "0s";
    if (ms < 1) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 1000).toString()}s`;
  }
  let days = Math.floor(ms / 86400000);
  let hours = Math.floor((ms % 86400000) / 3600000);
  let minutes = Math.floor((ms % 3600000) / 60000);
  let seconds = Math.round((ms % 60000) / 1000);
  if (seconds === 60) {
    seconds = 0;
    minutes++;
  }
  if (minutes === 60) {
    minutes = 0;
    hours++;
  }
  if (hours === 24) {
    hours = 0;
    days++;
  }
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
//@ chunk-8n1fbght.js:14942-15036 facade-exports
function formatDurationCoarse(ms) {
  let roundedMs = ms >= 60000 ? Math.round(ms / 60000) * 60000 : ms;
  return formatDuration(roundedMs, {
    hideTrailingZeros: true,
  });
}
//@ chunk-8n1fbght.js:15036-15326 facade-exports
function formatBarElapsed(elapsedMs) {
  let max = Math.max(0, Math.floor(elapsedMs / 1000));
  if (max < 60) return `${max}s`;
  let floored = Math.floor(max / 60);
  if (floored < 60) return `${floored}m${String(max % 60).padStart(2, "0")}s`;
  let floored_2 = Math.floor(floored / 60);
  if (floored_2 < 24) return `${floored_2}h${String(floored % 60).padStart(2, "0")}m`;
  return `${Math.floor(floored_2 / 24)}d${String(floored_2 % 24).padStart(2, "0")}h`;
}
//@ chunk-8n1fbght.js:15326-15474 fingerprint (2.1.88 match: getNumberFormatter, 0.787)
var COMPACT_ONE_DECIMAL = {
  notation: "compact",
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
};
var COMPACT_MAX_ONE_DECIMAL = {
  notation: "compact",
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
};
//@ chunk-8n1fbght.js:15474-15590 facade-exports (2.1.88 match: getBudgetContinuationMessage, 0.673)
function formatNumber(value) {
  let number = typeof value === "number" ? value : Number.NaN;
  let useOneDecimal = number >= 1000;
  return getNumberFormat("en-US", useOneDecimal ? COMPACT_ONE_DECIMAL : COMPACT_MAX_ONE_DECIMAL)
    .format(number)
    .toLowerCase();
}
//@ chunk-8n1fbght.js:15590-15635 facade-exports
function formatTokens(count) {
  return formatNumber(count).replace(".0", "");
}
//@ chunk-8n1fbght.js:15635-15707 facade-exports (2.1.88 match: formatCost, 1)
function formatCost(cost, maxDecimalPlaces = 4) {
  return `$${cost > 0.5 ? round(cost, 100).toFixed(2) : cost.toFixed(maxDecimalPlaces)}`;
}
//@ chunk-8n1fbght.js:15749-15860 facade-exports
var UNKNOWN_MODEL_COST_NOTE = "costs may be inaccurate due to usage of unknown models";
var ORG_MODEL_PRICING_NOTE = "at your organization's configured rates";
//@ chunk-8n1fbght.js:15860-16099 facade-exports (2.1.88 match: formatModelUsage, 0.795)
function formatModelTokenCounts(usage) {
  return (
    `${formatNumber(usage.inputTokens)} input, ${formatNumber(usage.outputTokens)} output, ${formatNumber(usage.cacheReadInputTokens)} cache read, ${formatNumber(usage.cacheCreationInputTokens)} cache write` +
    (usage.webSearchRequests > 0 ? `, ${formatNumber(usage.webSearchRequests)} web search` : "")
  );
}
//@ chunk-8n1fbght.js:16099-16171 facade-exports
function formatTokenEstimate(tokens) {
  if (tokens < 20) return "< 20";
  return `~${formatTokens(Math.round(tokens / 10) * 10)}`;
}
//@ chunk-8n1fbght.js:16171-16912 facade-exports (2.1.88 match: formatRelativeTime, 0.965)
/**
 * 相对时间（Intl.RelativeTimeFormat，narrow/long），如 "3h ago"/"in 2d"。
 */
function formatRelativeTime(date, options = {}) {
  let { style = "narrow", numeric = "always", maxUnit, now = new Date() } = options;
  let diffInMs = date.getTime() - now.getTime();
  let diffInSeconds = Math.trunc(diffInMs / 1000);
  let intervals = [
    {
      unit: "year",
      seconds: 31536000,
      shortUnit: "y",
    },
    {
      unit: "month",
      seconds: 2592000,
      shortUnit: "mo",
    },
    {
      unit: "week",
      seconds: 604800,
      shortUnit: "w",
    },
    {
      unit: "day",
      seconds: 86400,
      shortUnit: "d",
    },
    {
      unit: "hour",
      seconds: 3600,
      shortUnit: "h",
    },
    {
      unit: "minute",
      seconds: 60,
      shortUnit: "m",
    },
    {
      unit: "second",
      seconds: 1,
      shortUnit: "s",
    },
  ];
  let intervalsToTry = maxUnit ? intervals.filter((interval) => interval.seconds <= 86400) : intervals;
  for (let { unit, seconds: intervalSeconds, shortUnit } of intervalsToTry)
    if (Math.abs(diffInSeconds) >= intervalSeconds) {
      let value = Math.trunc(diffInSeconds / intervalSeconds);
      if (style === "narrow")
        return diffInSeconds < 0 ? `${Math.abs(value)}${shortUnit} ago` : `in ${value}${shortUnit}`;
      return getRelativeTimeFormat("long", numeric).format(value, unit);
    }
  if (style === "narrow") return diffInSeconds <= 0 ? "0s ago" : "in 0s";
  return getRelativeTimeFormat(style, "auto").format(0, "second");
}
//@ chunk-8n1fbght.js:16912-17035 facade-exports (2.1.88 match: formatRelativeTimeAgo, 1)
function formatRelativeTimeAgo(date, options = {}) {
  let { now = new Date(), ...restOptions } = options;
  if (date > now)
    return formatRelativeTime(date, {
      ...restOptions,
      now,
    });
  return formatRelativeTime(date, {
    ...restOptions,
    numeric: "always",
    now,
  });
}
//@ chunk-8n1fbght.js:17035-17412 facade-exports (2.1.88 match: formatLogMetadata, 0.962)
function formatLogMetadata(log) {
  let sizeOrCount =
    log.fileSize !== undefined ? formatFileSize(log.fileSize) : `${log.messageCount} messages`;
  let parts = [
    formatRelativeTimeAgo(log.modified, {
      style: "short",
    }),
    ...(log.sessionKind === "bg" ? ["bg"] : []),
    ...(log.gitBranch ? [log.gitBranch] : []),
    sizeOrCount,
  ];
  if (log.tag) parts.push(`#${log.tag}`);
  if (log.agentSetting) parts.push(`@${log.agentSetting}`);
  if (log.prNumber) parts.push(log.prRepository ? `${log.prRepository}#${log.prNumber}` : `#${log.prNumber}`);
  return parts.join(" \xB7 ");
}
//@ chunk-8n1fbght.js:17412-17678 layout
function getMinutesAndYear(date, timeZone) {
  if (timeZone === undefined)
    return {
      minutes: date.getMinutes(),
      year: date.getFullYear(),
    };
  let partsByName = new Map(
    getDateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      minute: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    minutes: Number(partsByName.get("minute")),
    year: Number(partsByName.get("year")),
  };
}
//@ chunk-8n1fbght.js:17678-18277 facade-exports (2.1.88 match: formatResetTime, 0.883)
/**
 * 重置时间显示：今天只显示时刻，否则带月日，可附时区。
 */
function formatResetTime(
  timestampInSeconds,
  includeTimeZone = false,
  showTime = true,
  forceDate = false,
  timeZone,
) {
  if (!timestampInSeconds) return;
  let date = new Date(timestampInSeconds * 1000);
  let now = new Date();
  let { minutes, year } = getMinutesAndYear(date, timeZone);
  let zoneSuffix = includeTimeZone || timeZone !== undefined ? ` (${timeZone ?? getTimeZone()})` : "";
  let hoursUntilReset = (date.getTime() - now.getTime()) / 3600000;
  if (forceDate || hoursUntilReset > 24) {
    let dateOptions = {
      month: "short",
      day: "numeric",
      hour: showTime ? "numeric" : undefined,
      minute: !showTime || minutes === 0 ? undefined : "2-digit",
      hour12: showTime ? true : undefined,
      timeZone,
    };
    if (year !== getMinutesAndYear(now, timeZone).year) dateOptions.year = "numeric";
    return (
      date
        .toLocaleString("en-US", dateOptions)
        .replace(/[ \u202f]([AP]M)/i, (_match, ampm) => ampm.toLowerCase()) + zoneSuffix
    );
  }
  return (
    date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: minutes === 0 ? undefined : "2-digit",
        hour12: true,
        timeZone,
      })
      .replace(/[ \u202f]([AP]M)/i, (_match, ampm) => ampm.toLowerCase()) + zoneSuffix
  );
}
//@ chunk-8n1fbght.js:18277-18376 facade-exports (2.1.88 match: formatResetText, 1)
function formatResetText(resetsAt, includeTimeZone = false, showTime = true, forceDate = false) {
  let dt = new Date(resetsAt);
  return `${formatResetTime(Math.floor(dt.getTime() / 1000), includeTimeZone, showTime, forceDate)}`;
}
//@ chunk-8n1fbght.js:18376-18421 facade-exports
function utilizationPercent(utilization) {
  return Math.round(utilization * 1000) / 10;
}
//@ chunk-8n1fbght.js:18421-18465 facade-exports
function planWindowPercent(utilization) {
  return Math.min(utilizationPercent(utilization), 100);
}
//@ chunk-8n1fbght.js:18465-18537 facade-exports
function formatOverflowHint(count, noun = "line") {
  if (count <= 0) return "";
  return `\u2026 +${count} ${plural(count, noun)}`;
}
//@ chunk-8n1fbght.js:18537-18591 facade-exports
function formatKb(hiddenChars) {
  return Math.max(1, Math.round(hiddenChars / 1000));
}
//@ chunk-8h0sw7zg.js:264-319 placement
/**
 * 用本地化格式渲染重置时间。
 */
function formatResetTimeWithLocale(resetsAt, includeTimeZone = false, showTime = true, forceDate = false) {
  return formatResetTime(resetsAt, includeTimeZone, showTime, forceDate, effectiveSessionTimeZone());
}
//@ chunk-fta1hp2w.js:19079-19353 fingerprint (2.1.88 match: formatNumber, 0.645)
function formatNumber_2(number) {
  let seenPaths = new Set();
  let results = [];
  for (let source of SHELL_HISTORY_SOURCES) {
    let resolved = source.resolve(number);
    if (resolved === undefined) continue;
    let resolved_2 = getPathModuleForPlatform(number.platform).resolve(resolved.path);
    let normalizedPath = number.platform === "windows" ? resolved_2.toLowerCase() : resolved_2;
    if (seenPaths.has(normalizedPath)) continue;
    seenPaths.add(normalizedPath);
    results.push({
      label: source.label,
      path: resolved.path,
      format: resolved.format ?? source.format,
    });
  }
  return results;
}
export {
  formatFileSize,
  truncateToWidth,
  formatDurationCoarse,
  truncate,
  formatResetTimeWithLocale,
  formatDuration,
  formatNumber,
  formatTokens,
  formatRelativeTime,
  truncatePathMiddle,
  formatResetTime,
  formatTokenEstimate,
  formatLogMetadata,
  utilizationPercent,
  planWindowPercent,
  formatModelTokenCounts,
  formatCost,
  UNKNOWN_MODEL_COST_NOTE,
  ORG_MODEL_PRICING_NOTE,
  formatRelativeTimeAgo,
  formatBarElapsed,
  formatOverflowHint,
  formatKb,
  truncateToWidthNoEllipsis,
  truncateStartToWidth,
  wrapToMaxLines,
  truncateToRemainingWidth,
  formatNumber_2,
  formatResetText,
  formatBytesDecimal,
  splitByDisplayWidth,
  formatSecondsShort,
};
