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
import { firstLineOf, truncateToLength, stripFormatChars, printableText } from "./stringUtils.js";
import { getDateTimeFormat, withTimeZone } from "./intl.js";
import { AUTO_CONNECT_LABELS } from "./config.js";
import { resolveSetting } from "./settings/userIntentSettings.js";
import { getLocale } from "./formatBriefTimestamp.js";

//@ chunk-hzbq5ybv.js:510-519 placement
var MAX_LOCALE_TAG_CHARS = 64;
//@ chunk-hzbq5ybv.js:519-699 placement
function normalizeLocaleTag(raw) {
  if (!raw || raw === "C" || raw === "POSIX" || raw.length > MAX_LOCALE_TAG_CHARS) return;
  let e = firstLineOf(firstLineOf(raw, "."), "@");
  if (!e) return;
  let replaced = e.replaceAll("_", "-");
  try {
    new Intl.DateTimeFormat(replaced);
    return replaced;
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
};
var SHORT_WEEKDAY_OPTIONS = {
  weekday: "short",
  calendar: "gregory",
};
var LONG_WEEKDAY_OPTIONS = {
  weekday: "long",
  calendar: "gregory",
};
var SHORT_MONTH_OPTIONS = {
  month: "short",
  calendar: "gregory",
};
var LONG_MONTH_OPTIONS = {
  month: "long",
  calendar: "gregory",
};
//@ chunk-hzbq5ybv.js:988-2275 placement
/**
 * 在指定时区按 strftime 模式格式化日期，支持 %Y/%m/%d/%H/%M/%S/%p/%a/%b/%z/%F/%T 等及 %- 不补零。
 */
function strftimeFormat(pattern, date, { locale, timeZone }) {
  let g = getDateTimeFormat("en-US", withTimeZone(STRFTIME_PART_OPTIONS, timeZone)).formatToParts(date);
  let fields = {};
  for (let part of g) fields[part.type] = part.value;
  let year = Number(fields.year);
  let month = Number(fields.month);
  let day = Number(fields.day);
  let hour = Number(fields.hour);
  let hour12 = ((hour + 11) % 12) + 1;
  let utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return pattern.replace(/%(-?)([\s\S])/g, (T, noPad, spec) => {
    switch (spec) {
      case "Y":
        return String(year);
      case "y":
        return padTwo(year % 100, noPad);
      case "C":
        return padTwo(Math.floor(year / 100), noPad);
      case "m":
        return padTwo(month, noPad);
      case "d":
        return padTwo(day, noPad);
      case "e":
        return padTwoSpace(day, noPad);
      case "j":
        return padThree(parseISOString(year, month, day), noPad);
      case "u":
        return String(utcDay === 0 ? 7 : utcDay);
      case "w":
        return String(utcDay);
      case "H":
        return padTwo(hour, noPad);
      case "k":
        return padTwoSpace(hour, noPad);
      case "I":
        return padTwo(hour12, noPad);
      case "l":
        return padTwoSpace(hour12, noPad);
      case "M":
        return padTwo(Number(fields.minute), noPad);
      case "S":
        return padTwo(Number(fields.second), noPad);
      case "p":
        return hour < 12 ? "AM" : "PM";
      case "P":
        return hour < 12 ? "am" : "pm";
      case "s":
        return String(Math.floor(date.getTime() / 1000));
      case "a":
        return formatWithDateTimeFormat(date, locale, timeZone, SHORT_WEEKDAY_OPTIONS);
      case "A":
        return formatWithDateTimeFormat(date, locale, timeZone, LONG_WEEKDAY_OPTIONS);
      case "b":
      case "h":
        return formatWithDateTimeFormat(date, locale, timeZone, SHORT_MONTH_OPTIONS);
      case "B":
        return formatWithDateTimeFormat(date, locale, timeZone, LONG_MONTH_OPTIONS);
      case "Z":
        return fields.timeZoneName ?? "";
      case "z":
        return formatUtcOffset(date, year, month, day, hour, fields);
      case "F":
        return `${year}-${padTwo(month, "")}-${padTwo(day, "")}`;
      case "D":
        return `${padTwo(month, "")}/${padTwo(day, "")}/${padTwo(year % 100, "")}`;
      case "T":
        return `${padTwo(hour, "")}:${fields.minute}:${fields.second}`;
      case "R":
        return `${padTwo(hour, "")}:${fields.minute}`;
      case "r":
        return `${padTwo(hour12, "")}:${fields.minute}:${fields.second} ${hour < 12 ? "AM" : "PM"}`;
      case "%":
        return "%";
      default:
        return T;
    }
  });
}
//@ chunk-hzbq5ybv.js:2275-2336 placement
function padTwo(t, noPad) {
  return noPad ? String(t) : String(t).padStart(2, "0");
}
//@ chunk-hzbq5ybv.js:2336-2397 placement
function padThree(isoString, noPad) {
  return noPad ? String(isoString) : String(isoString).padStart(3, "0");
}
//@ chunk-hzbq5ybv.js:2397-2458 placement
function padTwoSpace(t, noPad) {
  return noPad ? String(t) : String(t).padStart(2, " ");
}
//@ chunk-hzbq5ybv.js:2458-2529 placement = parseISOString (1)
function parseISOString(year, month, day) {
  return (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000 + 1;
}
//@ chunk-hzbq5ybv.js:2529-2581 placement
function formatWithDateTimeFormat(date, locale, timeZone, s) {
  return getDateTimeFormat(locale, withTimeZone(s, timeZone)).format(date);
}
//@ chunk-hzbq5ybv.js:2581-2842 placement
function formatUtcOffset(date, year, month, day, hour, fields) {
  let u = Date.UTC(year, month - 1, day, hour, Number(fields.minute), Number(fields.second));
  let n = Math.floor(date.getTime() / 1000) * 1000;
  let rounded = Math.round((u - n) / 60000);
  let m = rounded < 0 ? "-" : "+";
  let p = Math.abs(rounded);
  return `${m}${String(Math.floor(p / 60)).padStart(2, "0")}${String(p % 60).padStart(2, "0")}`;
}
//@ chunk-hzbq5ybv.js:2842-2852 placement
var MAX_TIME_FORMAT_CHARS = 100;
//@ chunk-hzbq5ybv.js:2852-2891 placement
/**
 * 清洗时间格式串并截断到 100 字符。
 */
function sanitizeTimeFormat(t) {
  return truncateToLength(stripFormatChars(printableText(t)), MAX_TIME_FORMAT_CHARS);
}
//@ chunk-hzbq5ybv.js:2891-3174 placement
function resolveTimeFormat(t, e) {
  let found = AUTO_CONNECT_LABELS.find((o) => o === t);
  if (found === "24-hour-utc")
    return {
      kind: "preset",
      preset: found,
      timeZone: "UTC",
    };
  let timeZone = validTimeZone(e);
  if (found)
    return {
      kind: "preset",
      preset: found,
      timeZone,
    };
  let g = sanitizeTimeFormat(t);
  return g.includes("%")
    ? {
        kind: "pattern",
        pattern: g,
        timeZone,
      }
    : {
        kind: "preset",
        preset: "auto",
        timeZone,
      };
}
//@ chunk-hzbq5ybv.js:3174-3253 placement
function validTimeZone(t) {
  if (!t) return;
  try {
    getDateTimeFormat("en-US", {
      timeZone: t,
    });
    return t;
  } catch {
    return;
  }
}
//@ chunk-hzbq5ybv.js:3253-3429 placement
function presetFormatOptions(t, preset, timeZone) {
  switch (preset) {
    case "auto":
      return withTimeZone(t, timeZone);
    case "12-hour":
      return withTimeZone(
        {
          ...t,
          hourCycle: "h12",
        },
        timeZone,
      );
    case "24-hour":
    case "24-hour-utc":
      return withTimeZone(
        {
          ...t,
          hourCycle: "h23",
        },
        timeZone,
      );
  }
}
//@ chunk-hzbq5ybv.js:3429-3679 placement
/**
 * 按时间格式预设格式化日期；24 小时 UTC 预设在最后的分/秒后加 Z。
 */
function formatWithPreset(t, e, r, s) {
  let dateTimeFormat = getDateTimeFormat(r, presetFormatOptions(e, t.preset, t.timeZone));
  if (t.preset !== "24-hour-utc") return dateTimeFormat.format(s);
  let o = dateTimeFormat.formatToParts(s);
  let lastIndex = o.findLastIndex((n) => n.type === "minute" || n.type === "second");
  return o.map((n, c) => (c === lastIndex ? `${n.value}Z` : n.value)).join("");
}
//@ chunk-hzbq5ybv.js:3679-3741 placement
function formatCustomPattern(pattern, timeZone, date, locale) {
  return truncateToLength(
    strftimeFormat(pattern, date, {
      locale,
      timeZone,
    }),
    MAX_TIME_FORMAT_CHARS,
  );
}
//@ chunk-hzbq5ybv.js:3741-3867 placement
var CLOCK_TIME_OPTIONS = {
  "2-digit": {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h12",
  },
  numeric: {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  },
};
//@ chunk-hzbq5ybv.js:3867-3975 placement
/**
 * 格式化时刻：自定义模式走 strftime，否则按预设输出时:分。
 */
function formatClockTime(t, date, locale, s = "2-digit") {
  return t.kind === "pattern"
    ? formatCustomPattern(t.pattern, t.timeZone, date, locale)
    : formatWithPreset(t, CLOCK_TIME_OPTIONS[s], "en-US", date);
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
//@ chunk-hzbq5ybv.js:4114-4501 placement
/**
 * 格式化完整时间戳 YYYY-MM-DD HH:MM:SS，附上午/下午与时区名（UTC 预设加 Z）；自定义模式走 strftime。
 */
function formatFullTimestamp(t, date, locale, s) {
  let timeZone = t.timeZone ?? s;
  if (t.kind === "pattern") return formatCustomPattern(t.pattern, timeZone, date, locale);
  let o = presetFormatOptions(FULL_TIMESTAMP_OPTIONS, t.preset, timeZone);
  let u = getDateTimeFormat("en-US", o).formatToParts(date);
  let n = {};
  for (let p of u) n[p.type] = p.value;
  let c = n.dayPeriod ? ` ${n.dayPeriod}` : "";
  let m = "";
  if (t.preset === "24-hour-utc") m = "Z";
  else if (n.timeZoneName) m = ` ${n.timeZoneName}`;
  return `${n.year}-${n.month}-${n.day} ${n.hour}:${n.minute}:${n.second}${c}${m}`;
}
//@ chunk-hzbq5ybv.js:4501-4580 placement
/**
 * 按设置解析出当前生效的时间格式与格式串。
 */
function resolvedTimeFormat() {
  return resolveTimeFormat(resolveSetting("timeFormat", "auto").value, resolveSetting("timeZone", "").value);
}
//@ chunk-hzbq5ybv.js:4580-4622 placement
/**
 * 用当前 locale 按自定义模式格式化。
 */
function formatCustomPatternForLocale(pattern, timeZone, date) {
  return formatCustomPattern(pattern, timeZone, date, getLocale());
}
export {
  resolvedTimeFormat,
  formatWithPreset,
  formatCustomPatternForLocale,
  normalizeLocaleTag,
  formatFullTimestamp,
  formatClockTime,
  sanitizeTimeFormat,
};
