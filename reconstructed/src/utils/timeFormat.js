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
  let line = firstLineOf(firstLineOf(raw, "."), "@");
  if (!line) return;
  let replaced = line.replaceAll("_", "-");
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
  let patternCache = getDateTimeFormat("en-US", withTimeZone(STRFTIME_PART_OPTIONS, timeZone)).formatToParts(
    date,
  );
  let fields = {};
  for (let part of patternCache) fields[part.type] = part.value;
  let year = Number(fields.year);
  let month = Number(fields.month);
  let day = Number(fields.day);
  let hour = Number(fields.hour);
  let hour12 = ((hour + 11) % 12) + 1;
  let utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return pattern.replace(/%(-?)([\s\S])/g, (partCache, noPad, spec) => {
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
        return partCache;
    }
  });
}
//@ chunk-hzbq5ybv.js:2275-2336 placement
function padTwo(value, noPad) {
  return noPad ? String(value) : String(value).padStart(2, "0");
}
//@ chunk-hzbq5ybv.js:2336-2397 placement
function padThree(isoString, noPad) {
  return noPad ? String(isoString) : String(isoString).padStart(3, "0");
}
//@ chunk-hzbq5ybv.js:2397-2458 placement
function padTwoSpace(value, noPad) {
  return noPad ? String(value) : String(value).padStart(2, " ");
}
//@ chunk-hzbq5ybv.js:2458-2529 placement = parseISOString (1)
function parseISOString(year, month, day) {
  return (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000 + 1;
}
//@ chunk-hzbq5ybv.js:2529-2581 placement
function formatWithDateTimeFormat(date, locale, timeZone, pattern) {
  return getDateTimeFormat(locale, withTimeZone(pattern, timeZone)).format(date);
}
//@ chunk-hzbq5ybv.js:2581-2842 placement
function formatUtcOffset(date, year, month, day, hour, fields) {
  let timestamp = Date.UTC(year, month - 1, day, hour, Number(fields.minute), Number(fields.second));
  let dateSeconds = Math.floor(date.getTime() / 1000) * 1000;
  let rounded = Math.round((timestamp - dateSeconds) / 60000);
  let sign = rounded < 0 ? "-" : "+";
  let offsetMinutes = Math.abs(rounded);
  return `${sign}${String(Math.floor(offsetMinutes / 60)).padStart(2, "0")}${String(offsetMinutes % 60).padStart(2, "0")}`;
}
//@ chunk-hzbq5ybv.js:2842-2852 placement
var MAX_TIME_FORMAT_CHARS = 100;
//@ chunk-hzbq5ybv.js:2852-2891 placement
/**
 * 清洗时间格式串并截断到 100 字符。
 */
function sanitizeTimeFormat(format) {
  return truncateToLength(stripFormatChars(printableText(format)), MAX_TIME_FORMAT_CHARS);
}
//@ chunk-hzbq5ybv.js:2891-3174 placement
function resolveTimeFormat(format, preset) {
  let found = AUTO_CONNECT_LABELS.find((label) => label === format);
  if (found === "24-hour-utc")
    return {
      kind: "preset",
      preset: found,
      timeZone: "UTC",
    };
  let timeZone = validTimeZone(preset);
  if (found)
    return {
      kind: "preset",
      preset: found,
      timeZone,
    };
  let cleaned = sanitizeTimeFormat(format);
  return cleaned.includes("%")
    ? {
        kind: "pattern",
        pattern: cleaned,
        timeZone,
      }
    : {
        kind: "preset",
        preset: "auto",
        timeZone,
      };
}
//@ chunk-hzbq5ybv.js:3174-3253 placement
function validTimeZone(timeZone) {
  if (!timeZone) return;
  try {
    getDateTimeFormat("en-US", {
      timeZone,
    });
    return timeZone;
  } catch {
    return;
  }
}
//@ chunk-hzbq5ybv.js:3253-3429 placement
function presetFormatOptions(pattern, preset, timeZone) {
  switch (preset) {
    case "auto":
      return withTimeZone(pattern, timeZone);
    case "12-hour":
      return withTimeZone(
        {
          ...pattern,
          hourCycle: "h12",
        },
        timeZone,
      );
    case "24-hour":
    case "24-hour-utc":
      return withTimeZone(
        {
          ...pattern,
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
function formatWithPreset(date, preset, locale, timeZone) {
  let dateTimeFormat = getDateTimeFormat(locale, presetFormatOptions(preset, date.preset, date.timeZone));
  if (date.preset !== "24-hour-utc") return dateTimeFormat.format(timeZone);
  let dateTimeFormat_2 = dateTimeFormat.formatToParts(timeZone);
  let lastIndex = dateTimeFormat_2.findLastIndex((part) => part.type === "minute" || part.type === "second");
  return dateTimeFormat_2
    .map((part, index) => (index === lastIndex ? `${part.value}Z` : part.value))
    .join("");
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
function formatClockTime(format, timeZone, locale, timeZone_2 = "2-digit") {
  return format.kind === "pattern"
    ? formatCustomPattern(format.pattern, format.timeZone, timeZone, locale)
    : formatWithPreset(format, CLOCK_TIME_OPTIONS[timeZone_2], "en-US", timeZone);
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
function formatFullTimestamp(format, date, locale, timeZone) {
  let timeZone_2 = format.timeZone ?? timeZone;
  if (format.kind === "pattern") return formatCustomPattern(format.pattern, timeZone_2, date, locale);
  let options = presetFormatOptions(FULL_TIMESTAMP_OPTIONS, format.preset, timeZone_2);
  let parts = getDateTimeFormat("en-US", options).formatToParts(date);
  let byType = {};
  for (let part of parts) byType[part.type] = part.value;
  let dayPeriodSuffix = byType.dayPeriod ? ` ${byType.dayPeriod}` : "";
  let zoneSuffix = "";
  if (format.preset === "24-hour-utc") zoneSuffix = "Z";
  else if (byType.timeZoneName) zoneSuffix = ` ${byType.timeZoneName}`;
  return `${byType.year}-${byType.month}-${byType.day} ${byType.hour}:${byType.minute}:${byType.second}${dayPeriodSuffix}${zoneSuffix}`;
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
  normalizeLocaleTag,
  resolvedTimeFormat,
  formatWithPreset,
  formatCustomPatternForLocale,
  formatFullTimestamp,
  formatClockTime,
  sanitizeTimeFormat,
};
