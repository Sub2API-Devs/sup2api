/**
 * utils/formatBriefTimestamp.ts
 *
 * brief 模式的时间戳格式（今天只显示时刻，否则带日期）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/formatBriefTimestamp.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-hzbq5ybv.js (2), chunk-j64mp9kq.js (4)
 * attribution: fingerprint 3, affinity 1, placement 3
 */
import { env } from "./env.js";
import {
  normalizeLocaleTag,
  resolvedTimeFormat,
  formatWithPreset,
  formatCustomPatternForLocale,
} from "./timeFormat.js";
import { __export } from "../../runtime/bun-runtime.js";
import { deliveredBy, useUserMessageSite, startOfDayMs } from "../components/messages/UserMessageSite.js";
import { getDateTimeFormat, withTimeZone } from "./intl.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hzbq5ybv.js:384-398 affinity
var timestampCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hzbq5ybv.js:384", () => {
  timestampCache = new Map();
});
//@ chunk-hzbq5ybv.js:398-510 fingerprint = getLocale (0.668)
function getLocale() {
  let raw = env.LC_ALL || env.LC_TIME || env.LANG || "";
  if (timestampCache.has(raw)) return timestampCache.get(raw);
  let locale = normalizeLocaleTag(raw);
  timestampCache.set(raw, locale);
  return locale;
}
//@ chunk-j64mp9kq.js:959-969 placement
/**
 * 简短时间戳命名空间对象（内部缓存的挂载点）。
 */
var BriefTimestampNamespace = {};
//@ chunk-j64mp9kq.js:969-1038 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j64mp9kq.js:969", () => {
  __export(BriefTimestampNamespace, {
    default: () => BriefTimestampNamespace,
    deliveredBy: () => deliveredBy,
    useUserMessageSite: () => useUserMessageSite,
  });
});
//@ chunk-j64mp9kq.js:1038-1424 placement
/**
 * brief 模式的时间戳格式：今天只显示时刻，一周内显示星期加时刻，更早显示日期；支持预设或自定义时间格式与会话时区。
 */
function formatBriefTimestamp(timestamp, now = new Date()) {
  let date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  let locale = getLocale();
  let timeFormat = resolvedTimeFormat();
  let { timeZone } = timeFormat;
  let dayDiffMs = startOfDayMs(now, timeZone) - startOfDayMs(date, timeZone);
  let rounded = Math.round(dayDiffMs / 86400000);
  let bucket = "older";
  if (rounded === 0) bucket = "today";
  else if (rounded > 0 && rounded < 7) bucket = "week";
  if (timeFormat.kind === "preset")
    return formatWithPreset(timeFormat, TIMESTAMP_FORMATS[bucket], locale, date);
  let timeText = formatCustomPatternForLocale(timeFormat.pattern, timeZone, date);
  if (bucket === "today") return timeText;
  let dateText = getDateTimeFormat(locale, withTimeZone(DATE_PART_FORMATS[bucket], timeZone)).format(date);
  return bucket === "week" ? `${dateText} ${timeText}` : `${dateText}, ${timeText}`;
}
//@ chunk-j64mp9kq.js:1424-1688 fingerprint = formatBriefTimestamp (0.766)
var TIMESTAMP_FORMATS = {
  today: {
    hour: "numeric",
    minute: "2-digit",
  },
  week: {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  },
  older: {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
};
var DATE_PART_FORMATS = {
  week: {
    weekday: "long",
  },
  older: {
    weekday: "long",
    month: "short",
    day: "numeric",
  },
};
//@ chunk-18hwfzwa.js:1146536-1146666 fingerprint = startOfDay (1)
function startOfDay(startDate, endDate) {
  let toDayStartMs = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((toDayStartMs(endDate) - toDayStartMs(startDate)) / 86400000);
}
export { formatBriefTimestamp, startOfDay, getLocale, BriefTimestampNamespace };
