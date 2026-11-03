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
import { Ar } from "../../runtime/bun-runtime.js";
import { deliveredBy, useUserMessageSite, startOfDayMs } from "../components/messages/UserMessageSite.js";
import {
  resolvedTimeFormat,
  formatWithPreset,
  formatCustomPatternForLocale,
  normalizeLocaleTag,
} from "./timeFormat.js";
import { getDateTimeFormat, withTimeZone } from "./intl.js";
import { env } from "./env.js";

//@ chunk-j64mp9kq.js:959-969 placement
/**
 * 简短时间戳命名空间对象（内部缓存的挂载点）。
 */
var BriefTimestampNamespace = {};
//@ chunk-j64mp9kq.js:969-1038 placement
Ar(BriefTimestampNamespace, {
  default: () => BriefTimestampNamespace,
  deliveredBy: () => deliveredBy,
  useUserMessageSite: () => useUserMessageSite,
});
//@ chunk-j64mp9kq.js:1038-1424 placement
/**
 * brief 模式的时间戳格式：今天只显示时刻，一周内显示星期加时刻，更早显示日期；支持预设或自定义时间格式与会话时区。
 */
function formatBriefTimestamp(i, t = new Date()) {
  let date = new Date(i);
  if (Number.isNaN(date.getTime())) return "";
  let locale = getLocale();
  let a = resolvedTimeFormat();
  let { timeZone } = a;
  let f = startOfDayMs(t, timeZone) - startOfDayMs(date, timeZone);
  let rounded = Math.round(f / 86400000);
  let u = "older";
  if (rounded === 0) u = "today";
  else if (rounded > 0 && rounded < 7) u = "week";
  if (a.kind === "preset") return formatWithPreset(a, TIMESTAMP_FORMATS[u], locale, date);
  let p = formatCustomPatternForLocale(a.pattern, timeZone, date);
  if (u === "today") return p;
  let C = getDateTimeFormat(locale, withTimeZone(DATE_PART_FORMATS[u], timeZone)).format(date);
  return u === "week" ? `${C} ${p}` : `${C}, ${p}`;
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
//@ chunk-hzbq5ybv.js:384-398 affinity
var timestampCache = new Map();
//@ chunk-hzbq5ybv.js:398-510 fingerprint = getLocale (0.668)
function getLocale() {
  let raw = env.LC_ALL || env.LC_TIME || env.LANG || "";
  if (timestampCache.has(raw)) return timestampCache.get(raw);
  let e = normalizeLocaleTag(raw);
  timestampCache.set(raw, e);
  return e;
}
//@ chunk-18hwfzwa.js:1146536-1146666 fingerprint = startOfDay (1)
function startOfDay(h, x) {
  let D = (L) => new Date(L.getFullYear(), L.getMonth(), L.getDate()).getTime();
  return Math.round((D(x) - D(h)) / 86400000);
}
export { formatBriefTimestamp, startOfDay, getLocale, BriefTimestampNamespace };
