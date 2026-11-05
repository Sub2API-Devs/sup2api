/**
 * plugins/bundled/easel/easelMessages.ts
 *
 * 2.1.316 新增：easel 的结果文本（未绘制原因、自动图表提示、策略禁用）与工具名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7stfs6p0.js (65)
 * attribution: placement 65
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-7stfs6p0.js:9102-9197 placement
/**
 * 自动图表的提示句
 */
var AUTO_CHART_HINT = "easel made an auto chart from this result. Chart it again only for a different chart.";
//@ chunk-7stfs6p0.js:9197-9301 placement
var EASEL_FAILED_MESSAGE =
  "Not drawn. easel failed on this call. The fault is its own, and the same call will fail again.";
//@ chunk-7stfs6p0.js:9301-9412 placement
var NO_CONVERSATION_MESSAGE =
  "Not drawn. The session keeps no conversation for this call, and every call made here will be refused.";
//@ chunk-7stfs6p0.js:9412-9439 placement
var MCP_EASEL_CHART = "mcp__easel__chart";
//@ chunk-7stfs6p0.js:9439-9535 placement
/**
 * 组织策略禁用 easel 的说明
 */
var POLICY_WITHHOLDS_TEXT =
  "Not drawn. This organization's policy withholds easel, and every call will be refused.";
//@ chunk-7stfs6p0.js:9535-9661 placement
var CHART_TOOL_HINT = `If a tool named ${MCP_EASEL_CHART} is available, call it when numbers over time or across categories would be clearer as a chart.`;
//@ chunk-7stfs6p0.js:9661-9694 placement
/**
 * 1e24：数值上限
 */
var MAX_ABS_NUMBER = 1000000000000000000000000;
//@ chunk-7stfs6p0.js:9694-9728 placement
/**
 * 1e-24：数值下限
 */
var MIN_ABS_NUMBER = 0.000000000000000000000001;
//@ chunk-7stfs6p0.js:9728-9737 placement
/**
 * 7
 */
var DAYS_PER_WEEK_ISO = 7;
//@ chunk-7stfs6p0.js:9737-9749 placement
/**
 * 1000
 */
var MS_PER_SECOND = 1000;
//@ chunk-7stfs6p0.js:9749-9762 placement
/**
 * 86400
 */
var SECONDS_PER_DAY = 86400;
//@ chunk-7stfs6p0.js:9762-9774 placement
/**
 * 3600
 */
var SECONDS_PER_HOUR = 3600;
//@ chunk-7stfs6p0.js:9774-9784 placement
/**
 * 60
 */
var SECONDS_PER_MINUTE = 60;
//@ chunk-7stfs6p0.js:9784-9797 placement
/**
 * 0.001
 */
var MS_PER_MICROSECOND = 0.001;
//@ chunk-7stfs6p0.js:9797-9813 placement
/**
 * 1e-6
 */
var MS_PER_NANOSECOND = 0.000001;
//@ chunk-7stfs6p0.js:9813-9822 placement
/**
 * 2
 */
var DEFAULT_DECIMALS = 2;
//@ chunk-7stfs6p0.js:9822-9833 placement
/**
 * 1e9
 */
var SI_GIGA = 1e9;
//@ chunk-7stfs6p0.js:9833-9845 placement
/**
 * 1024
 */
var BYTES_PER_KIB = 1024;
//@ chunk-7stfs6p0.js:9845-9856 placement
/**
 * 1e6
 */
var SI_MEGA = 1e6;
//@ chunk-7stfs6p0.js:9856-9868 placement
/**
 * 1000
 */
var SI_KILO = 1000;
//@ chunk-7stfs6p0.js:9868-9889 placement
/**
 * 1e12
 */
var SI_TERA = 1000000000000;
//@ chunk-7stfs6p0.js:9889-9905 placement
/**
 * 1e-6
 */
var SI_MICRO = 0.000001;
//@ chunk-7stfs6p0.js:9905-9918 placement
/**
 * 1e-3
 */
var SI_MILLI = 0.001;
//@ chunk-7stfs6p0.js:9918-9937 placement
/**
 * 1e-9
 */
var SI_NANO = 0.000000001;
//@ chunk-7stfs6p0.js:9937-9948 placement
/**
 * 100
 */
var PERCENT_SCALE = 100;
//@ chunk-7stfs6p0.js:9948-9972 placement
/**
 * 1e15
 */
var SI_PETA = 1000000000000000;
//@ chunk-7stfs6p0.js:9972-9981 placement
/**
 * 4
 */
var DAYS_PER_YEAR_LEAP_BOUND = 4;
//@ chunk-7stfs6p0.js:9981-9990 placement
/**
 * 4
 */
var DAYS_PER_WEEK_OFFSET = 4;
//@ chunk-7stfs6p0.js:9990-10000 placement
/**
 * 60
 */
var MINUTES_PER_HOUR = 60;
//@ chunk-7stfs6p0.js:10000-10013 placement
/**
 * 60000
 */
var MS_PER_MINUTE = 60000;
//@ chunk-7stfs6p0.js:10013-10048 placement
/**
 * 返回 {kind:"unread", why} 表示该单元格不是可识别的数值。
 */
var unreadNumber = (why) => ({
  kind: "unread",
  why,
});
//@ chunk-7stfs6p0.js:10048-10106 placement
/**
 * 把数值与单位包装成 {kind:"number", value, unit}（0 视为无单位）。
 */
var numericValue = (value, unit) => ({
  kind: "number",
  value,
  unit: value === 0 ? null : unit,
});
//@ chunk-7stfs6p0.js:10106-10215 placement
/**
 * 数值过大或过小时返回错误，否则生成带单位的数值。
 */
function checkMagnitude(value, unit) {
  let abs = Math.abs(value);
  if (!(abs <= MAX_ABS_NUMBER)) return unreadNumber("too large");
  return abs > 0 && abs < MIN_ABS_NUMBER ? unreadNumber("too small") : numericValue(value, unit);
}
//@ chunk-7stfs6p0.js:10215-10225 placement
/**
 * 时区已知占位 true
 */
var IS_ZONED_TIME = true;
//@ chunk-7stfs6p0.js:10225-10235 placement
/**
 * 时区未知占位 false
 */
var ZONE_UNKNOWN = false;
//@ chunk-7stfs6p0.js:10235-10248 placement
/**
 * 1024²
 */
var BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB;
//@ chunk-7stfs6p0.js:10248-10261 placement
/**
 * 1024³
 */
var BYTES_PER_GIB = BYTES_PER_MIB * BYTES_PER_KIB;
//@ chunk-7stfs6p0.js:10261-10270 placement
/**
 * 6
 */
var TIME_FIELD_COUNT = 6;
//@ chunk-7stfs6p0.js:10270-10283 placement
/**
 * 30.44
 */
var DAYS_PER_MONTH_AVG = 30.44;
//@ chunk-7stfs6p0.js:10283-10297 placement
/**
 * 365.25
 */
var DAYS_PER_YEAR_AVG = 365.25;
//@ chunk-7stfs6p0.js:10297-10312 placement
/**
 * 3600000
 */
var MS_PER_HOUR = 3600000;
//@ chunk-7stfs6p0.js:10312-10325 placement
/**
 * 60000
 */
var MS_PER_MINUTE_FIELD = 60000;
//@ chunk-7stfs6p0.js:10325-10334 placement
/**
 * 时间字段里的「日」
 */
var DAY_FIELD_INDEX = 2;
//@ chunk-7stfs6p0.js:10334-10350 placement
/**
 * 86400000
 */
var MS_PER_DAY = 86400000;
//@ chunk-7stfs6p0.js:10350-10359 placement
/**
 * 刻度范围外多留 2 步
 */
var TICK_OVERHANG_STEPS = 2;
//@ chunk-7stfs6p0.js:10359-10368 placement
/**
 * 取中位数/居中所用的 2
 */
var HALF_DIVISOR = 2;
//@ chunk-7stfs6p0.js:10368-10377 placement
/**
 * 至少跨 2 周才换周刻度
 */
var MIN_WEEKS_SPANNED = 2;
//@ chunk-7stfs6p0.js:10377-10386 placement
/**
 * getUTCDay 的周六
 */
var SATURDAY_DAY_INDEX = 6;
//@ chunk-7stfs6p0.js:10386-10397 placement
/**
 * 区间为空时的位置比例
 */
var FALLBACK_POSITION_RATIO = 0.5;
//@ chunk-7stfs6p0.js:10397-10406 placement
/**
 * 标签总宽不能超过刻度的 5 倍
 */
var MAX_LABEL_RATIO = 5;
//@ chunk-7stfs6p0.js:10406-10415 placement
/**
 * 至少 2 个刻度才出标签
 */
var MIN_DECIMALS_TICKS = 2;
//@ chunk-7stfs6p0.js:10415-10424 placement
/**
 * 时间字段里的「秒」
 */
var SECONDS_FIELD_INDEX = 5;
//@ chunk-7stfs6p0.js:10424-10436 placement
/**
 * 1000
 */
var MS_PER_SECOND_FIELD = 1000;
//@ chunk-7stfs6p0.js:10436-10445 placement
/**
 * 时/分/秒补零宽度
 */
var TIME_PART_PAD_WIDTH = 2;
//@ chunk-7stfs6p0.js:10445-10454 placement
/**
 * 时间字段里的「月」
 */
var MONTH_FIELD_INDEX = 1;
//@ chunk-7stfs6p0.js:10454-10463 placement
/**
 * 时间字段里的「年」
 */
var YEAR_FIELD_INDEX = 0;
//@ chunk-7stfs6p0.js:10463-10472 placement
/**
 * 合并文本片段时至少隔 3 格
 */
var MIN_CELL_GAP = 3;
//@ chunk-7stfs6p0.js:10472-10481 placement
/**
 * ISO 周按周四划分的偏移
 */
var ISO_WEEK_OFFSET_DAYS = 3;
//@ chunk-7stfs6p0.js:10481-10490 placement
/**
 * 7 天一星期
 */
var DAYS_PER_WEEK_TICKS = 7;
//@ chunk-7stfs6p0.js:10490-10573 placement
/**
 * 返回一个按入参缓存的函数（Map 记忆化）。
 */
function memoize(compute) {
  let cache = new Map();
  return (key) => {
    let value = cache.get(key) ?? compute(key);
    cache.set(key, value);
    return value;
  };
}
//@ chunk-7stfs6p0.js:10573-10672 placement
/**
 * 按小时区缓存 sv-SE 的短日期+时间格式化器。
 */
var timeFormatterFor = memoize(
  (timeZone) =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      dateStyle: "short",
      timeStyle: "medium",
    }),
);
//@ chunk-7stfs6p0.js:10672-10959 placement
function logEaselError(ms, zone) {
  let fractionMs = ms - Math.floor(ms / MS_PER_SECOND_FIELD) * MS_PER_SECOND_FIELD;
  if (zone === "UTC") {
    let date = new Date(ms);
    return [
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      fractionMs,
    ];
  }
  let [year = 0, month = 1, day = 1, hour = 0, minute = 0, second = 0] = timeFormatterFor(zone)
    .format(ms)
    .split(/[- :]/, TIME_FIELD_COUNT)
    .map(Number);
  return [year, month - 1, day, hour, minute, second, fractionMs];
}
//@ chunk-7stfs6p0.js:10959-11273 placement
var EASEL_PROMPT_HINT = [
  {
    fieldIndex: 0,
    typicalMs: DAYS_PER_YEAR_AVG * MS_PER_DAY,
    counts: [1, 2, 5, 10, 20, 50, 100],
  },
  {
    fieldIndex: 1,
    typicalMs: DAYS_PER_MONTH_AVG * MS_PER_DAY,
    counts: [1, 3, 6],
  },
  {
    fieldIndex: 2,
    typicalMs: MS_PER_DAY,
    counts: [1, 2, 4, 7, 14],
  },
  {
    fieldIndex: 3,
    typicalMs: MS_PER_HOUR,
    counts: [1, 2, 3, 6, 12],
  },
  {
    fieldIndex: 4,
    typicalMs: MS_PER_MINUTE_FIELD,
    counts: [1, 2, 5, 10, 15, 30],
  },
  {
    fieldIndex: 5,
    typicalMs: MS_PER_SECOND_FIELD,
    counts: [1, 2, 5, 10, 15, 30],
  },
];
//@ chunk-7stfs6p0.js:11273-11283 placement
/**
 * true
 */
var ALLOW_ZONED_TIME = true;
//@ chunk-7stfs6p0.js:11283-11293 placement
/**
 * true
 */
var ARE_TICK_LABELS = true;
export {
  logEaselError,
  SATURDAY_DAY_INDEX,
  MS_PER_DAY,
  ISO_WEEK_OFFSET_DAYS,
  DAYS_PER_WEEK_TICKS,
  MIN_WEEKS_SPANNED,
  FALLBACK_POSITION_RATIO,
  EASEL_PROMPT_HINT,
  SECONDS_FIELD_INDEX,
  TICK_OVERHANG_STEPS,
  HALF_DIVISOR,
  DAY_FIELD_INDEX,
  MIN_DECIMALS_TICKS,
  MAX_LABEL_RATIO,
  ALLOW_ZONED_TIME,
  YEAR_FIELD_INDEX,
  MONTH_FIELD_INDEX,
  TIME_PART_PAD_WIDTH,
  ARE_TICK_LABELS,
  MIN_CELL_GAP,
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
  AUTO_CHART_HINT,
  CHART_TOOL_HINT,
  POLICY_WITHHOLDS_TEXT,
  NO_CONVERSATION_MESSAGE,
  EASEL_FAILED_MESSAGE,
};
