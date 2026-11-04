/**
 * plugins/bundled/easel/parseValues.ts
 *
 * 2.1.316 新增：easel 读取单元格：ISO 8601 时间、周、epoch、时长、带单位/货币的数字
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (61)
 * attribution: placement 61
 */
import {
  DAY_FIELD_INDEX,
  ARE_TICK_LABELS,
  HALF_DIVISOR,
  MIN_CELL_GAP,
  logEaselError,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  SI_KILO,
  SI_MEGA,
  SI_GIGA,
  SI_TERA,
  BYTES_PER_GIB,
  BYTES_PER_KIB,
  SI_PETA,
  BYTES_PER_MIB,
  SI_NANO,
  SI_MICRO,
  SI_MILLI,
  PERCENT_SCALE,
  checkMagnitude,
  DEFAULT_DECIMALS,
  unreadNumber,
  MS_PER_SECOND,
  MS_PER_MICROSECOND,
  MS_PER_NANOSECOND,
  DAYS_PER_WEEK_ISO,
  DAYS_PER_WEEK_OFFSET,
  DAYS_PER_YEAR_LEAP_BOUND,
  ZONE_UNKNOWN,
  MINUTES_PER_HOUR,
  MS_PER_MINUTE,
  IS_ZONED_TIME,
  MCP_EASEL_CHART,
} from "./easelMessages.js";
import {
  pickTickStep,
  TICK_STEPS_BY_SPAN,
  stepSpan,
  periodStarts,
  isWeekendOrFirst,
  parts,
  parseISOString,
} from "./timeFormat.js";
import {
  stableSum,
  CHART_INPUT_SCHEMA,
  collectToolUses,
  selectPath,
  isPlainObject,
  cleanCellText,
} from "./chartSchema.js";
import { deferInit, beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 7 modules closed by ./chartSchema.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/plugins/bundled/easel/chartSchema.js");
//@ chunk-3s7ydtfd.js:14396-14457 placement = UNDEFINED_VALUE (0.472)
function snapToStep(value, step) {
  return step.unit.fieldIndex === DAY_FIELD_INDEX ? value : value - (value % step.count);
}
//@ chunk-3s7ydtfd.js:14457-14514 placement
/**
 * 时间刻度起点对象
 */
var timeTickStart = (tick, fieldsBefore) => ({
  zone: tick.zone,
  areTicks: ARE_TICK_LABELS,
  fieldsBefore,
});
//@ chunk-3s7ydtfd.js:14514-14638 placement
/**
 * 时间刻度序列起点（按步长对齐）。
 */
var buildTickSeries = (start, step, bounds) => ({
  start: [...start.slice(0, step.unit.fieldIndex), snapToStep(start[step.unit.fieldIndex], step)],
  step,
  untilMs: bounds.untilMs,
  zone: bounds.zone,
});
//@ chunk-3s7ydtfd.js:14638-14810 placement
/**
 * 计算刻度标签的位置（居中或左对齐，夹在列内）。
 */
var placeTickLabel = (labels, layout) => (value, index) => {
  let text = labels[index] ?? "";
  let column = layout.columnOf(value);
  return {
    text,
    column,
    start: Math.min(
      Math.max(0, column - (layout.areCentred ? Math.floor((text.length - 1) / HALF_DIVISOR) : 0)),
      layout.columns - text.length,
    ),
  };
};
//@ chunk-3s7ydtfd.js:14810-14949 placement
/**
 * 布置刻度标签，重叠时返回空数组。
 */
var layoutTickLabels = (dataSpan, layout) => (ticks, step) => {
  let mapped = ticks.map(placeTickLabel(pickTickStep(ticks, step, dataSpan), layout));
  return mapped.every(
    (label, index) =>
      label.start >= 0 &&
      label.start + label.text.length + MIN_CELL_GAP <= (mapped[index + 1]?.start ?? 1 / 0),
  )
    ? mapped
    : [];
};
//@ chunk-3s7ydtfd.js:14949-15242 placement
function parseNumberCell(dataSpan, step, layout) {
  let errorContext = logEaselError(dataSpan.fromMs, dataSpan.zone);
  let placeLabels = layoutTickLabels(timeTickStart(dataSpan, errorContext), layout);
  for (let stepCandidate of TICK_STEPS_BY_SPAN) {
    if (
      stepSpan(stepCandidate) < stepSpan(step) ||
      (dataSpan.untilMs - dataSpan.fromMs) / stepSpan(stepCandidate) > layout.columns
    )
      continue;
    let candidate = placeLabels(
      periodStarts(buildTickSeries(errorContext, stepCandidate, dataSpan)).filter(
        (ms) =>
          ms >= dataSpan.fromMs &&
          !(
            step.skipsWeekends &&
            stepCandidate.unit.fieldIndex === DAY_FIELD_INDEX &&
            isWeekendOrFirst(ms, dataSpan.zone)
          ),
      ),
      stepCandidate,
    );
    if (candidate.length > 0) return candidate;
  }
  return placeLabels([dataSpan.fromMs], step);
}
//@ chunk-3s7ydtfd.js:15242-15277 placement
/**
 * 月份名+日期模式
 */
var MONTH_DAY_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:15242", () => {
  MONTH_DAY_PATTERN = `(?:${parts.join("|")})[a-z]*`;
});
//@ chunk-3s7ydtfd.js:15277-15443 placement
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:15277", () => {
  regExp_2 = new RegExp(
    String.raw`^(?:\d{1,2}([./-])\d{1,2}\1\d{4}\b|\d{1,2}/\d{1,2}/\d{2}\b|` +
      String.raw`\d{1,2}[./]\d{4}\b|${MONTH_DAY_PATTERN} \d{1,2}$|` +
      String.raw`\d{1,2} ${MONTH_DAY_PATTERN}$)`,
  );
});
//@ chunk-3s7ydtfd.js:15443-15485 placement
/**
 * 是否为时间格式的单元格
 */
var isTimeCell = (value) => regExp_2.test(String(value ?? "").trim());
//@ chunk-3s7ydtfd.js:15485-15587 placement
var TIME_OF_DAY_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:15485", () => {
  TIME_OF_DAY_PATTERN =
    String.raw`(?<hour>\d\d):(?<minute>\d\d)` + String.raw`(?::(?<second>\d\d)(?<fraction>\.\d+)?)?`;
});
//@ chunk-3s7ydtfd.js:15587-15670 placement
/**
 * 时区后缀模式
 */
var ZONE_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:15587", () => {
  ZONE_PATTERN = String.raw`\s?(?<zone>Z|UTC|GMT|[-+]\d\d(?::?\d\d)?)` + String.raw`(?: UTC)?`;
});
//@ chunk-3s7ydtfd.js:15670-15725 placement
/**
 * 空/NaN/None 等空值模式
 */
var EMPTY_CELL_RE = /^(?:--?|null|none|nan|n\/a|na|\\n|[-+]inf)?$/i;
//@ chunk-3s7ydtfd.js:15725-15860 placement
var regExp_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:15725", () => {
  regExp_3 = new RegExp(
    String.raw`^(?:(?<days>\d+)d ?)?(?:(?<hours>\d+)h ?)?` +
      String.raw`(?:(?<minutes>\d+)m ?)?(?:(?<seconds>[\d.]+)s)?$`,
  );
});
//@ chunk-3s7ydtfd.js:15860-15880 placement
/**
 * 只含数字与 .E+
 */
var NUMERICISH_RE = /^[\d.E+]+$/;
//@ chunk-3s7ydtfd.js:15880-15946 placement
/**
 * 年-W周-日
 */
var ISO_WEEK_RE = /^(?<year>\d{4})-?W(?<week>\d\d)(?:-?(?<weekday>[1-7]))?$/;
//@ chunk-3s7ydtfd.js:15946-16004 placement
/**
 * ±HH:MM 偏移
 */
var ZONE_OFFSET_RE = /^(?<sign>[-+])(?<hours>\d\d):?(?<minutes>\d\d)?$/;
//@ chunk-3s7ydtfd.js:16004-16051 placement
/**
 * 天/时/分/秒 的秒数
 */
var TIME_UNIT_SECONDS = {
  days: SECONDS_PER_DAY,
  hours: SECONDS_PER_HOUR,
  minutes: SECONDS_PER_MINUTE,
  seconds: 1,
};
//@ chunk-3s7ydtfd.js:16051-16110 placement
/**
 * k/K/M/B/T 的倍数
 */
var SI_MULTIPLIERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:16051", () => {
  SI_MULTIPLIERS = new Map(
    Object.entries({
      k: SI_KILO,
      K: SI_KILO,
      M: SI_MEGA,
      B: SI_GIGA,
      T: SI_TERA,
    }),
  );
});
//@ chunk-3s7ydtfd.js:16110-16123 placement
/**
 * 1024⁴
 */
var BYTES_PER_TIB = BYTES_PER_GIB * BYTES_PER_KIB;
//@ chunk-3s7ydtfd.js:16123-16427 placement
var NUMBER_PATTERN = [
  [
    "",
    {
      k: SI_KILO,
      K: SI_KILO,
      M: SI_MEGA,
      G: SI_GIGA,
      T: SI_TERA,
      short: 1,
      none: 1,
    },
  ],
  [
    "B",
    {
      B: 1,
      kB: SI_KILO,
      KB: SI_KILO,
      MB: SI_MEGA,
      GB: SI_GIGA,
      TB: SI_TERA,
      PB: SI_PETA,
    },
  ],
  [
    "B",
    {
      Ki: BYTES_PER_KIB,
      Mi: BYTES_PER_MIB,
      Gi: BYTES_PER_GIB,
      Ti: BYTES_PER_TIB,
    },
  ],
  [
    "B",
    {
      KiB: BYTES_PER_KIB,
      MiB: BYTES_PER_MIB,
      GiB: BYTES_PER_GIB,
      TiB: BYTES_PER_TIB,
    },
  ],
  [
    "B",
    {
      bytes: 1,
      decbytes: 1,
    },
  ],
  [
    "s",
    {
      ns: SI_NANO,
      us: SI_MICRO,
      µs: SI_MICRO,
      ms: SI_MILLI,
      s: 1,
    },
  ],
  [
    "s",
    {
      min: SECONDS_PER_MINUTE,
      h: SECONDS_PER_HOUR,
      d: SECONDS_PER_DAY,
    },
  ],
  [
    "%",
    {
      "%": 1,
      percent: 1,
      percentunit: PERCENT_SCALE,
    },
  ],
];
//@ chunk-3s7ydtfd.js:16427-16516 placement
/**
 * 单位 → {unit, size}
 */
var UNIT_SIZE_TABLE; // deferred: uses NUMBER_PATTERN of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3s7ydtfd.js:16427", () => {
  UNIT_SIZE_TABLE = new Map(
    NUMBER_PATTERN.flatMap(([unit, sizes]) =>
      Object.entries(sizes).map(([key, value]) => [
        key,
        {
          unit,
          size: value,
        },
      ]),
    ),
  );
});
//@ chunk-3s7ydtfd.js:16516-16596 placement
/**
 * 乘单位大小后校验量级
 */
function applyUnitSize(value, suffix) {
  let { unit, size } = UNIT_SIZE_TABLE.get(suffix) ?? {
    unit: suffix,
    size: 1,
  };
  return checkMagnitude(value * size, unit);
}
//@ chunk-3s7ydtfd.js:16596-16664 placement
/**
 * 货币优先按 SI 倍数，否则按单位表
 */
function scaledNumber(value, suffix, currency) {
  return currency !== undefined
    ? checkMagnitude(value * (SI_MULTIPLIERS.get(suffix) ?? 1), currency)
    : applyUnitSize(value, suffix);
}
//@ chunk-3s7ydtfd.js:16664-16844 placement
/**
 * 由数字正则匹配组（符号、整数、小数、指数、单位、货币）得到数值。
 */
function numberFromMatch(groups) {
  let { sign, currency, suffix = "" } = groups;
  let { integer = "0", fraction = "", exponent = "0" } = groups;
  let combined = Number(`${integer.replaceAll(",", "")}${fraction}e${exponent}`);
  return scaledNumber(sign === "" || sign === "+" ? combined : -combined, suffix, currency);
}
//@ chunk-3s7ydtfd.js:16844-16940 placement
/**
 * 数字正则的整数/小数部分
 */
var NUMBER_INTEGER_PART; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:16844", () => {
  NUMBER_INTEGER_PART =
    String.raw`(?=\.?\d)(?<integer>\d{1,3}(?:,\d{3})+|\d+)?` + String.raw`(?<fraction>\.\d+)?`;
});
//@ chunk-3s7ydtfd.js:16940-16987 placement
/**
 * 指数部分
 */
var NUMBER_EXPONENT_PART; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:16940", () => {
  NUMBER_EXPONENT_PART = String.raw`(?:e(?<exponent>[-+]?\d+))?`;
});
//@ chunk-3s7ydtfd.js:16987-17064 placement
/**
 * 符号与货币前缀
 */
var NUMBER_SIGN_CURRENCY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:16987", () => {
  NUMBER_SIGN_CURRENCY = String.raw`^(?<sign>[-+\u2212(]?)(?<currency>[$\u20AC\u00A3\u00A5])?`;
});
//@ chunk-3s7ydtfd.js:17064-17151 placement
/**
 * 空格、后缀与收尾
 */
var NUMBER_SUFFIX_PART; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:17064", () => {
  NUMBER_SUFFIX_PART = String.raw`(?<space>\s?)` + String.raw`(?<suffix>[a-z\u00B5%]*(?:\/[a-z]+)?)\)?$`;
});
//@ chunk-3s7ydtfd.js:17151-17256 placement
var TIME_FORMATS_HINT =
  'Times are read as ISO 8601 (2026-09-07, 2026-W37), epoch numbers, "7 Sep 2026" or "Sep 7, 2026"';
//@ chunk-3s7ydtfd.js:17256-17291 placement
var regExp_4; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:17256", () => {
  regExp_4 = new RegExp(
    NUMBER_SIGN_CURRENCY + NUMBER_INTEGER_PART + NUMBER_EXPONENT_PART + NUMBER_SUFFIX_PART,
    "i",
  );
});
//@ chunk-3s7ydtfd.js:17291-17728 placement
/**
 * 解析数字（千分位、指数、货币、单位后缀），返回值或 empty/not a number。
 */
function parseNumberWithUnit(value, allowBareSuffix = false) {
  if (typeof value === "number") return checkMagnitude(value, "");
  let trimmed = String(value ?? "").trim();
  if (EMPTY_CELL_RE.test(trimmed))
    return {
      kind: "empty",
      why: "empty",
    };
  let groups = regExp_3.exec(trimmed)?.groups ?? {};
  let mapped = Object.entries(TIME_UNIT_SECONDS)
    .filter(([key]) => groups[key] !== undefined)
    .map(([key, value]) => Number(groups[key]) * value);
  if (mapped.length >= DEFAULT_DECIMALS) return checkMagnitude(stableSum(mapped), "s");
  let groups_2 = regExp_4.exec(trimmed)?.groups;
  if (!groups_2) return unreadNumber("not a number");
  let [unitPart = ""] = (groups_2.suffix ?? "").split("/");
  return groups_2.space === "" && !allowBareSuffix && unitPart !== "" && !UNIT_SIZE_TABLE.has(unitPart)
    ? unreadNumber("not a number")
    : numberFromMatch(groups_2);
}
//@ chunk-3s7ydtfd.js:17728-17782 placement
/**
 * 位数 → 毫秒倍数
 */
var DIGIT_COUNT_TO_MS = {
  9: MS_PER_SECOND,
  10: MS_PER_SECOND,
  12: 1,
  13: 1,
  15: MS_PER_MICROSECOND,
  16: MS_PER_MICROSECOND,
  18: MS_PER_NANOSECOND,
  19: MS_PER_NANOSECOND,
};
//@ chunk-3s7ydtfd.js:17782-17827 placement
/**
 * 时间读数值
 */
var timeValue = (ms, isZoned) => ({
  kind: "time",
  ms,
  isZoned,
});
//@ chunk-3s7ydtfd.js:17827-17873 placement
/**
 * ISO 周里第几天
 */
var weekdayIndex = (isoString) =>
  (new Date(isoString).getUTCDay() + DAYS_PER_WEEK_ISO - 1) % DAYS_PER_WEEK_ISO;
//@ chunk-3s7ydtfd.js:17873-17915 placement
/**
 * ISO 周对应年份
 */
var isoWeekYear = (year, dayOfYear) =>
  logEaselError(parseISOString([year, 0, dayOfYear + DAYS_PER_WEEK_OFFSET - 1]), "UTC")[0];
//@ chunk-3s7ydtfd.js:17915-18081 placement
/**
 * ISO 周（年-W周-日）转时间戳，不存在的周返回错误。
 */
function isoWeekToMs(groups) {
  let year = Number(groups.year);
  let week = Number(groups.week);
  let dayOfYear =
    DAYS_PER_YEAR_LEAP_BOUND -
    weekdayIndex(parseISOString([year, 0, DAYS_PER_YEAR_LEAP_BOUND])) +
    (week - 1) * DAYS_PER_WEEK_ISO;
  return week < 1 || isoWeekYear(year, dayOfYear) !== year
    ? unreadNumber("no such week")
    : timeValue(parseISOString([year, 0, dayOfYear + Number(groups.weekday ?? 1) - 1]), ZONE_UNKNOWN);
}
//@ chunk-3s7ydtfd.js:18081-18109 placement
/**
 * 某字段是否不同
 */
var fieldDiffersAt = (expected) => (combined, index) => combined !== expected[index];
//@ chunk-3s7ydtfd.js:18109-18300 placement
/**
 * 按时区偏移与小数秒修正时间戳。
 */
function applyZoneOffset(isoString, groups) {
  let groups_2 = ZONE_OFFSET_RE.exec(groups.zone ?? "")?.groups ?? {};
  let offsetMinutes = Number(groups_2.hours ?? 0) * MINUTES_PER_HOUR + Number(groups_2.minutes ?? 0);
  return timeValue(
    isoString -
      (groups_2.sign === "-" ? -offsetMinutes : offsetMinutes) * MS_PER_MINUTE +
      Math.round(Number(groups.fraction ?? "0") * MS_PER_SECOND),
    groups.zone !== undefined,
  );
}
//@ chunk-3s7ydtfd.js:18300-18551 placement
function describeDate(groups) {
  let { year, month = "1", day = "1", monthName } = groups;
  let { hour = "0", minute = "0", second = "0" } = groups;
  let mapped = [
    year,
    monthName === undefined ? Number(month) - 1 : parts.findIndex((prefix) => monthName.startsWith(prefix)),
    day,
    hour,
    minute,
    second,
  ].map(Number);
  let isoString = parseISOString(mapped);
  return mapped.some(fieldDiffersAt(logEaselError(isoString, "UTC")))
    ? unreadNumber("no such date")
    : applyZoneOffset(isoString, groups);
}
//@ chunk-3s7ydtfd.js:18551-18574 placement
/**
 * 带时区的时刻模式
 */
var FULL_TIME_PATTERN; // deferred: uses TIME_OF_DAY_PATTERN of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3s7ydtfd.js:18551", () => {
  FULL_TIME_PATTERN = TIME_OF_DAY_PATTERN + `(?:${ZONE_PATTERN})?`;
});
//@ chunk-3s7ydtfd.js:18574-19053 placement
var DATE_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3s7ydtfd.js:18574", () => {
  DATE_PATTERNS = [
    String.raw`^(?<year>\d{4})(?:[-/](?<month>\d\d)(?:[-/](?<day>\d\d)` +
      String.raw`(?:[T ]${FULL_TIME_PATTERN})?)?)?$`,
    String.raw`^(?:[A-Z][a-z]{2}, )?(?<day>\d{1,2}) ` +
      String.raw`(?<monthName>[A-Z][a-z]+) (?<year>\d{4})` +
      String.raw`(?: ${FULL_TIME_PATTERN})?$`,
    String.raw`^(?<monthName>[A-Z][a-z]+) (?<day>\d{1,2}), (?<year>\d{4})` +
      String.raw`(?: ${FULL_TIME_PATTERN})?$`,
    String.raw`^(?<year>\d{4})(?<month>\d\d)(?<day>\d\d)T` +
      String.raw`(?<hour>\d\d)(?<minute>\d\d)(?<second>\d\d)(?<zone>Z)$`,
  ].map((pattern) => new RegExp(pattern));
});
//@ chunk-3s7ydtfd.js:19053-19373 placement
/**
 * 解析时间单元格（ISO 日期、周、epoch 数字等），返回毫秒或错误。
 */
function parseTimeCell(value) {
  let trimmed = String(value ?? "").trim();
  if (EMPTY_CELL_RE.test(trimmed))
    return {
      kind: "empty",
      why: "empty",
    };
  let numeric = NUMERICISH_RE.test(trimmed) ? Number(trimmed) : NaN;
  let unitMs = DIGIT_COUNT_TO_MS[String(Math.trunc(numeric)).length];
  if (!Number.isNaN(numeric) && unitMs !== undefined) return timeValue(numeric * unitMs, IS_ZONED_TIME);
  for (let pattern of DATE_PATTERNS) {
    let groups = pattern.exec(trimmed)?.groups;
    if (groups) return describeDate(groups);
  }
  let groups = ISO_WEEK_RE.exec(trimmed)?.groups;
  return groups ? isoWeekToMs(groups) : unreadNumber("not a time");
}
//@ chunk-3s7ydtfd.js:19373-20372 placement
/**
 * easel chart 工具的描述（给模型看：从已有数据画一张图，告诉用户要点）。
 */
var CHART_TOOL_DESCRIPTION = `Draws one chart from data you already have, and answers with what was read, drawn and left out. The person sees the chart, not this answer: tell them the headline number and pass on the "note:" lines.
The data is a table under 64 KiB: JSON records, CSV, TSV, a markdown or SQL table, aligned shell output. Name x and y. You may leave them out where there is one way to read it: metric results from Prometheus, Grafana and Datadog (these may be charted unasked), one column of times beside nothing but numbers, or beside one column of names too where the times repeat, or one column of names beside one of numbers (bars). Nothing is guessed: a call that leaves a choice open is refused with the columns that were found, so call again. Rows are not counted or put in buckets of time: pass counts. ${TIME_FORMATS_HINT}.
It reads no file, and no result that the host cut or saved to a file: query less. A file that a tool read comes with a number before each line: pass its rows as data, without the numbers.`;
//@ chunk-3s7ydtfd.js:20372-20424 placement
/**
 * easel chart 工具定义
 */
var CHART_TOOL_DEF; // deferred: uses CHART_INPUT_SCHEMA (./chartSchema.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3s7ydtfd.js:20372", () => {
  CHART_TOOL_DEF = {
    name: "chart",
    description: CHART_TOOL_DESCRIPTION,
    inputSchema: CHART_INPUT_SCHEMA,
  };
});
//@ chunk-3s7ydtfd.js:20424-20682 placement
function lastUserMessageIndex(messages, toolUseId) {
  let list = Array.isArray(messages) ? messages : [];
  let lastIndex = list.findLastIndex((message) => message.role === "user" && !message.toolResults?.length);
  let flattened = list.slice(lastIndex + 1).flatMap((message) => message.toolUses);
  let index = flattened.findIndex((toolUse) => toolUse.tool_use_id === toolUseId);
  return flattened
    .slice(0, index < 0 ? undefined : index)
    .some((toolUse) => toolUse.text === undefined && toolUse.tool !== MCP_EASEL_CHART);
}
//@ chunk-3s7ydtfd.js:20682-20911 placement
/**
 * 读会话消息中的工具调用；若该调用的消息尚未出现则按延迟表等待重试。
 */
async function waitForToolUses(ctx, target, waits) {
  let { agentId } = target;
  let [firstWait, ...restWaits] = waits;
  let messages = await ctx.session.messages(
    agentId
      ? {
          agentId,
        }
      : {},
  );
  if (firstWait === undefined || !lastUserMessageIndex(messages, target.tool_use_id))
    return Array.isArray(messages) ? collectToolUses(messages) : undefined;
  await ctx.clock.sleep(firstWait, {
    signal: target.signal,
  });
  return waitForToolUses(ctx, target, restWaits);
}
//@ chunk-3s7ydtfd.js:20911-20955 placement
/**
 * 改成 bars 且去 log
 */
var asBarsForm = (form) => ({
  ...form,
  form: "bars",
  log: undefined,
});
//@ chunk-3s7ydtfd.js:20955-21086 placement
/**
 * 单元格值标准化：基本类型原样，空为 null，其他转 JSON 字符串。
 */
function toCellValue(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? value
    : value === undefined || value === null
      ? null
      : JSON.stringify(value);
}
//@ chunk-3s7ydtfd.js:21086-21127 placement
/**
 * 按索引表取列值
 */
var mapKeysToValues = (keys, valueByKey) => keys.map((key) => valueByKey.get(key) ?? null);
//@ chunk-3s7ydtfd.js:21127-21286 placement
/**
 * 分隔符表格式：制表符、竖线表、CSV、分号。
 */
var DELIMITED_FORMATS = [
  {
    source: "tab-separated",
    pattern: /\t/,
  },
  {
    source: "pipe table",
    pattern: /[|\u2502]/,
  },
  {
    source: "CSV",
    pattern: /,/,
  },
  {
    source: "semicolon-separated",
    pattern: /;/,
  },
];
//@ chunk-3s7ydtfd.js:21286-21343 placement
/**
 * 数值与时间都解析不了
 */
var isUnreadableCell = (cell) =>
  parseNumberWithUnit(cell).kind === "unread" && parseTimeCell(cell).kind === "unread";
//@ chunk-3s7ydtfd.js:21343-21360 placement
var GRAFANA = "Grafana";
//@ chunk-3s7ydtfd.js:21360-21371 placement
/**
 * "*"
 */
var WILDCARD = "*";
//@ chunk-3s7ydtfd.js:21371-21386 placement
var VALUE = "value";
//@ chunk-3s7ydtfd.js:21386-21543 placement
/**
 * 取路径上的标签：对象展开为键值对，标量转为单项。
 */
function labelEntries(row, label) {
  let [labelValue] = selectPath(row, label);
  let isObject = isPlainObject(labelValue);
  let isMissing = labelValue === undefined || labelValue === WILDCARD;
  return isObject
    ? Object.entries(labelValue).map(([key, value]) => [
        key,
        typeof value === "string" ? cleanCellText(value) : value,
      ])
    : isMissing
      ? []
      : [[label, cleanCellText(String(labelValue))]];
}
//@ chunk-3s7ydtfd.js:21543-21553 placement
/**
 * 12
 */
var MAX_SERIES_PAIRS = 12;
//@ chunk-3s7ydtfd.js:21553-22669 placement
/**
 * 可识别的指标格式（Prometheus、Datadog、Grafana 等）的序列/标签/时间/值路径。
 */
var METRICS_FORMATS = [
  {
    name: "Prometheus",
    series: "[]",
    labels: ["metric"],
    time: "values.[].0",
    value: "values.[].1",
    isReadAtInstants: true,
  },
  {
    name: "Datadog",
    series: "series.[]",
    labels: ["metric", "scope", "group", "functions"],
    time: "pointlist.[].0",
    value: "pointlist.[].1",
    isReadAtInstants: false,
    unit: "unit.[].short_name",
  },
  {
    name: "named-series",
    series: "series.[]",
    labels: ["name"],
    time: "data.[].0",
    value: "data.[].1",
    isReadAtInstants: false,
  },
  {
    name: "Datadog-buckets",
    series: "data.buckets.[]",
    labels: ["by"],
    time: "computes.*.[].time",
    value: "computes.*.[].value",
    isReadAtInstants: false,
  },
  {
    name: "Graphite",
    series: "[]",
    labels: ["target"],
    time: "datapoints.[].1",
    value: "datapoints.[].0",
    isReadAtInstants: false,
  },
  {
    name: "CloudWatch",
    series: "MetricDataResults.[]",
    labels: ["Label"],
    time: "Timestamps.[]",
    value: "Values.[]",
    isReadAtInstants: false,
  },
  {
    name: "Cloud-Monitoring",
    series: "timeSeries.[]",
    labels: ["metric.labels"],
    time: "points.[].interval.endTime",
    value: "points.[].value.*",
    isReadAtInstants: true,
  },
  {
    name: "Cost-Explorer",
    series: "",
    labels: [],
    time: "ResultsByTime.[].TimePeriod.Start",
    value: "ResultsByTime.[].Total.*.Amount",
    isReadAtInstants: false,
    unit: "ResultsByTime.0.Total.*.Unit",
  },
];
//@ chunk-3s7ydtfd.js:22669-22704 placement
/**
 * 指标格式名（含 grafana）
 */
var METRICS_FORMAT_NAMES; // deferred: uses METRICS_FORMATS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3s7ydtfd.js:22669", () => {
  METRICS_FORMAT_NAMES = [...METRICS_FORMATS.map((format) => format.name), GRAFANA];
});
//@ chunk-3s7ydtfd.js:22704-22782 placement
/**
 * 各系列点数一致
 */
var hasUniformPointCounts = (seriesList) =>
  seriesList.every((series) => series.cellsByKey.every(([, values]) => values.length === series.pointCount));
//@ chunk-3s7ydtfd.js:22782-22816 placement
/**
 * key:value 形式的指标名
 */
var METRIC_KEY_RE = /^([\w./-]+):[^\s,(){}]+$/;
//@ chunk-3s7ydtfd.js:22816-22902 placement
/**
 * Prometheus 选择器语法
 */
var METRIC_SELECTOR_RE = /^((?:[\w.]+:)?[\w.-]+)\{([^{}]*)\}(?: by \{[^{}]*\})?((?:\.\w+\([^()]*\))*)$/;
export {
  MAX_SERIES_PAIRS,
  METRIC_KEY_RE,
  parseTimeCell,
  parseNumberWithUnit,
  isTimeCell,
  TIME_FORMATS_HINT,
  labelEntries,
  GRAFANA,
  METRIC_SELECTOR_RE,
  WILDCARD,
  VALUE,
  METRICS_FORMATS,
  hasUniformPointCounts,
  DELIMITED_FORMATS,
  METRICS_FORMAT_NAMES,
  toCellValue,
  mapKeysToValues,
  isUnreadableCell,
  scaledNumber,
  parseNumberCell,
  asBarsForm,
  CHART_TOOL_DEF,
  waitForToolUses,
};
