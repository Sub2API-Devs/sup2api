/**
 * utils/timeFormat.ts
 *
 * 2.1.316 新增：时间与时长格式化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hzbq5ybv.js (23)
 * attribution: placement 23
 */
import { firstLineOf, truncateToLength, stripFormatChars, wh } from "./stringUtils.js";
import { getDateTimeFormat, withTimeZone } from "./intl.js";
import { Uct } from "./config.js";
import { resolveSetting } from "./settings/userIntentSettings.js";
import { getLocale } from "./formatBriefTimestamp.js";

//@ chunk-hzbq5ybv.js:510-519 placement
var b = 64;
//@ chunk-hzbq5ybv.js:519-699 placement
function normalizeLocaleTag(t) {
  if (!t || t === "C" || t === "POSIX" || t.length > b) return;
  let e = firstLineOf(firstLineOf(t, "."), "@");
  if (!e) return;
  let replaced = e.replaceAll("_", "-");
  try {
    return (new Intl.DateTimeFormat(replaced), replaced);
  } catch {
    return;
  }
}
//@ chunk-hzbq5ybv.js:699-988 placement
var STRFTIME_PART_OPTIONS = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  },
  SHORT_WEEKDAY_OPTIONS = { weekday: "short", calendar: "gregory" },
  LONG_WEEKDAY_OPTIONS = { weekday: "long", calendar: "gregory" },
  SHORT_MONTH_OPTIONS = { month: "short", calendar: "gregory" },
  LONG_MONTH_OPTIONS = { month: "long", calendar: "gregory" };
/**
 * 在指定时区按 strftime 模式格式化日期，支持 %Y/%m/%d/%H/%M/%S/%p/%a/%b/%z/%F/%T 等及 %- 不补零。
 */
//@ chunk-hzbq5ybv.js:988-2275 placement
function strftimeFormat(pattern, date, { locale: locale, timeZone: timeZone }) {
  let formatToParts = getDateTimeFormat("en-US", withTimeZone(STRFTIME_PART_OPTIONS, timeZone)).formatToParts(
      date,
    ),
    fields = {};
  for (let part of formatToParts) fields[part.type] = part.value;
  let year = Number(fields.year),
    month = Number(fields.month),
    day = Number(fields.day),
    hour = Number(fields.hour),
    hour12 = ((hour + 11) % 12) + 1,
    uTCDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return pattern.replace(/%(-?)([\s\S])/g, (T, noPad, spec) => {
    switch (spec) {
      case "Y":
        return String(year);
      case "y":
        return a(year % 100, noPad);
      case "C":
        return a(Math.floor(year / 100), noPad);
      case "m":
        return a(month, noPad);
      case "d":
        return a(day, noPad);
      case "e":
        return D(day, noPad);
      case "j":
        return x(parseISOString(year, month, day), noPad);
      case "u":
        return String(uTCDay === 0 ? 7 : uTCDay);
      case "w":
        return String(uTCDay);
      case "H":
        return a(hour, noPad);
      case "k":
        return D(hour, noPad);
      case "I":
        return a(hour12, noPad);
      case "l":
        return D(hour12, noPad);
      case "M":
        return a(Number(fields.minute), noPad);
      case "S":
        return a(Number(fields.second), noPad);
      case "p":
        return hour < 12 ? "AM" : "PM";
      case "P":
        return hour < 12 ? "am" : "pm";
      case "s":
        return String(Math.floor(date.getTime() / 1000));
      case "a":
        return d(date, locale, timeZone, SHORT_WEEKDAY_OPTIONS);
      case "A":
        return d(date, locale, timeZone, LONG_WEEKDAY_OPTIONS);
      case "b":
      case "h":
        return d(date, locale, timeZone, SHORT_MONTH_OPTIONS);
      case "B":
        return d(date, locale, timeZone, LONG_MONTH_OPTIONS);
      case "Z":
        return fields.timeZoneName ?? "";
      case "z":
        return formatUtcOffset(date, year, month, day, hour, fields);
      case "F":
        return `${year}-${a(month, "")}-${a(day, "")}`;
      case "D":
        return `${a(month, "")}/${a(day, "")}/${a(year % 100, "")}`;
      case "T":
        return `${a(hour, "")}:${fields.minute}:${fields.second}`;
      case "R":
        return `${a(hour, "")}:${fields.minute}`;
      case "r":
        return `${a(hour12, "")}:${fields.minute}:${fields.second} ${hour < 12 ? "AM" : "PM"}`;
      case "%":
        return "%";
      default:
        return T;
    }
  });
}
//@ chunk-hzbq5ybv.js:2275-2336 placement
function a(t, e) {
  return e ? String(t) : String(t).padStart(2, "0");
}
//@ chunk-hzbq5ybv.js:2336-2397 placement
function x(t, e) {
  return e ? String(t) : String(t).padStart(3, "0");
}
//@ chunk-hzbq5ybv.js:2397-2458 placement
function D(t, e) {
  return e ? String(t) : String(t).padStart(2, " ");
}
//@ chunk-hzbq5ybv.js:2458-2529 placement = parseISOString (1)
function parseISOString(t, e, r) {
  return (Date.UTC(t, e - 1, r) - Date.UTC(t, 0, 1)) / 86400000 + 1;
}
//@ chunk-hzbq5ybv.js:2529-2581 placement
function d(t, e, r, s) {
  return getDateTimeFormat(e, withTimeZone(s, r)).format(t);
}
//@ chunk-hzbq5ybv.js:2581-2842 placement
function formatUtcOffset(t, e, r, s, g, o) {
  let UTC = Date.UTC(e, r - 1, s, g, Number(o.minute), Number(o.second)),
    n = Math.floor(t.getTime() / 1000) * 1000,
    rounded = Math.round((UTC - n) / 60000),
    m = rounded < 0 ? "-" : "+",
    abs = Math.abs(rounded);
  return `${m}${String(Math.floor(abs / 60)).padStart(2, "0")}${String(abs % 60).padStart(2, "0")}`;
}
//@ chunk-hzbq5ybv.js:2842-2852 placement
var F = 100;
//@ chunk-hzbq5ybv.js:2852-2891 placement
function RHr(t) {
  return truncateToLength(stripFormatChars(wh(t)), F);
}
//@ chunk-hzbq5ybv.js:2891-3174 placement
function resolveTimeFormat(t, e) {
  let found = Uct.find((o) => o === t);
  if (found === "24-hour-utc") return { kind: "preset", preset: found, timeZone: "UTC" };
  let s = E(e);
  if (found) return { kind: "preset", preset: found, timeZone: s };
  let g = RHr(t);
  return g.includes("%")
    ? { kind: "pattern", pattern: g, timeZone: s }
    : { kind: "preset", preset: "auto", timeZone: s };
}
//@ chunk-hzbq5ybv.js:3174-3253 placement
function E(t) {
  if (!t) return;
  try {
    return (getDateTimeFormat("en-US", { timeZone: t }), t);
  } catch {
    return;
  }
}
//@ chunk-hzbq5ybv.js:3253-3429 placement
function presetFormatOptions(t, e, r) {
  switch (e) {
    case "auto":
      return withTimeZone(t, r);
    case "12-hour":
      return withTimeZone({ ...t, hourCycle: "h12" }, r);
    case "24-hour":
    case "24-hour-utc":
      return withTimeZone({ ...t, hourCycle: "h23" }, r);
  }
}
/**
 * 按时间格式预设格式化日期；24 小时 UTC 预设在最后的分/秒后加 Z。
 */
//@ chunk-hzbq5ybv.js:3429-3679 placement
function formatWithPreset(t, e, r, s) {
  let g = getDateTimeFormat(r, presetFormatOptions(e, t.preset, t.timeZone));
  if (t.preset !== "24-hour-utc") return g.format(s);
  let formatToParts = g.formatToParts(s),
    lastIndex = formatToParts.findLastIndex((n) => n.type === "minute" || n.type === "second");
  return formatToParts.map((n, c) => (c === lastIndex ? `${n.value}Z` : n.value)).join("");
}
//@ chunk-hzbq5ybv.js:3679-3741 placement
function l(t, e, r, s) {
  return truncateToLength(strftimeFormat(t, r, { locale: s, timeZone: e }), F);
}
//@ chunk-hzbq5ybv.js:3741-3867 placement
var CLOCK_TIME_OPTIONS = {
  "2-digit": { hour: "2-digit", minute: "2-digit", hourCycle: "h12" },
  numeric: { hour: "numeric", minute: "2-digit", hourCycle: "h12" },
};
/**
 * 格式化时刻：自定义模式走 strftime，否则按预设输出时:分。
 */
//@ chunk-hzbq5ybv.js:3867-3975 placement
function formatClockTime(t, e, r, s = "2-digit") {
  return t.kind === "pattern"
    ? l(t.pattern, t.timeZone, e, r)
    : formatWithPreset(t, CLOCK_TIME_OPTIONS[s], "en-US", e);
}
//@ chunk-hzbq5ybv.js:3975-4114 placement
var FULL_TIMESTAMP_OPTIONS = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
};
/**
 * 格式化完整时间戳 YYYY-MM-DD HH:MM:SS，附上午/下午与时区名（UTC 预设加 Z）；自定义模式走 strftime。
 */
//@ chunk-hzbq5ybv.js:4114-4501 placement
function formatFullTimestamp(t, e, r, s) {
  let g = t.timeZone ?? s;
  if (t.kind === "pattern") return l(t.pattern, g, e, r);
  let o = presetFormatOptions(FULL_TIMESTAMP_OPTIONS, t.preset, g),
    formatToParts = getDateTimeFormat("en-US", o).formatToParts(e),
    n = {};
  for (let p of formatToParts) n[p.type] = p.value;
  let c = n.dayPeriod ? ` ${n.dayPeriod}` : "",
    m = "";
  if (t.preset === "24-hour-utc") m = "Z";
  else if (n.timeZoneName) m = ` ${n.timeZoneName}`;
  return `${n.year}-${n.month}-${n.day} ${n.hour}:${n.minute}:${n.second}${c}${m}`;
}
//@ chunk-hzbq5ybv.js:4501-4580 placement
function eUt() {
  return resolveTimeFormat(resolveSetting("timeFormat", "auto").value, resolveSetting("timeZone", "").value);
}
//@ chunk-hzbq5ybv.js:4580-4622 placement
function cjs(t, e, r) {
  return l(t, e, r, getLocale());
}

export { eUt, formatWithPreset, cjs, normalizeLocaleTag, formatFullTimestamp, formatClockTime, RHr };
