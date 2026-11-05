/**
 * utils/formatBriefTimestamp.ts
 *
 * brief 模式的时间戳格式（今天只显示时刻，否则带日期）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/formatBriefTimestamp.ts
 * pieces: chunk-6s14nyc9.js (2), chunk-czq1j3j2.js (1), chunk-pnx1prpt.js (4)
 * attribution: affinity 1, fingerprint 3, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-6s14nyc9.js:383-397 affinity
var timestampCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6s14nyc9.js:383", () => {
  timestampCache = new Map();
});
//@ chunk-6s14nyc9.js:397-509 fingerprint (2.1.88 match: getLocale, 0.668)
function getLocale() {
  let raw = env.LC_ALL || env.LC_TIME || env.LANG || "";
  if (timestampCache.has(raw)) return timestampCache.get(raw);
  let locale = normalizeLocaleTag(raw);
  timestampCache.set(raw, locale);
  return locale;
}
//@ chunk-pnx1prpt.js:959-969 placement
/**
 * 简短时间戳命名空间对象（内部缓存的挂载点）。
 */
var BriefTimestampNamespace = {};
//@ chunk-pnx1prpt.js:969-1038 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pnx1prpt.js:969", () => {
  __export(BriefTimestampNamespace, {
    default: () => BriefTimestampNamespace,
    deliveredBy: () => deliveredBy,
    useUserMessageSite: () => useUserMessageSite,
  });
});
//@ chunk-pnx1prpt.js:1038-1424 placement
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
//@ chunk-pnx1prpt.js:1424-1688 fingerprint (2.1.88 match: formatBriefTimestamp, 0.766)
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
//@ chunk-czq1j3j2.js:1177318-1177448 fingerprint (2.1.88 match: startOfDay, 1)
function startOfDay(startDate, endDate) {
  let toDayStartMs = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((toDayStartMs(endDate) - toDayStartMs(startDate)) / 86400000);
}
export { getLocale, startOfDay, formatBriefTimestamp, BriefTimestampNamespace };
