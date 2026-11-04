/**
 * plugins/bundled/easel/timeFormat.ts
 *
 * 2.1.316 新增：easel 坐标轴时间格式化（月份名、刻度步长）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (30)
 * attribution: placement 30
 */
import {
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
} from "./easelMessages.js";

//@ chunk-3s7ydtfd.js:11293-11336 placement (2.1.88 match: parseISOString, 1)
var parseISOString = (s) => Date.UTC(s[0] ?? 0, ...s.slice(1));
//@ chunk-3s7ydtfd.js:11336-11412 placement
/**
 * 周末或周首日
 */
function isWeekendOrFirst(ms, zone) {
  let utcDay = new Date(parseISOString(logEaselError(ms, zone))).getUTCDay();
  return utcDay === 0 || utcDay === SATURDAY_DAY_INDEX;
}
//@ chunk-3s7ydtfd.js:11412-11459 placement
/**
 * 周序号
 */
var weekIndex = (ms, zone) =>
  Math.floor(
    (parseISOString(logEaselError(ms, zone)) / MS_PER_DAY + ISO_WEEK_OFFSET_DAYS) / DAYS_PER_WEEK_TICKS,
  );
//@ chunk-3s7ydtfd.js:11459-11532 placement
/**
 * 跨周但无周末点
 */
var spansWeeksWithoutWeekend = (times, zone) =>
  weekIndex(times.at(-1) ?? 0, zone) - weekIndex(times[0] ?? 0, zone) >= MIN_WEEKS_SPANNED &&
  !times.some((ms) => isWeekendOrFirst(ms, zone));
//@ chunk-3s7ydtfd.js:11532-11605 placement
/**
 * 时间在区间的相对位置
 */
var positionRatio = (axisSpan) => (ms) =>
  axisSpan.untilMs > axisSpan.fromMs
    ? (ms - axisSpan.fromMs) / (axisSpan.untilMs - axisSpan.fromMs)
    : FALLBACK_POSITION_RATIO;
//@ chunk-3s7ydtfd.js:11605-11805 placement
var TIME_TICK_STEPS = (timeline, indexByStart) => (ms) => {
  let periodIndex =
    indexByStart.get(ms) ?? timeline.periodStarts.findLastIndex((periodStart) => periodStart <= ms);
  let periodStart = timeline.periodStarts[periodIndex] ?? timeline.axisSpan.fromMs;
  return (
    (periodIndex +
      (ms - periodStart) /
        ((timeline.periodStarts[periodIndex + 1] ?? timeline.axisSpan.untilMs) - periodStart)) /
    timeline.periodStarts.length
  );
};
//@ chunk-3s7ydtfd.js:11805-11914 placement
/**
 * 按周期起点或时间跨度确定刻度步长。
 */
function tickStepsFor(timeline) {
  return timeline.periodStarts.length > 0
    ? TIME_TICK_STEPS(
        timeline,
        new Map(timeline.periodStarts.map((periodStart, index) => [periodStart, index])),
      )
    : positionRatio(timeline.axisSpan);
}
//@ chunk-3s7ydtfd.js:11914-11937 placement
/**
 * 日期字段全零模板
 */
var DATE_FIELD_ZEROES = [0, 0, 1, 0, 0, 0, 0];
//@ chunk-3s7ydtfd.js:11937-11983 placement
/**
 * 字段序号过滤器
 */
var ranksChangingFields = (changedFields) => (unit) =>
  changedFields.some((fieldIndex) => fieldIndex >= unit.fieldIndex);
//@ chunk-3s7ydtfd.js:11983-12107 placement
/**
 * 默认时间步长（按时间字段的变化选单位）。
 */
var defaultTimeStep = (times, zone) => ({
  unit:
    EASEL_PROMPT_HINT.findLast(
      ranksChangingFields(
        times.map((ms) =>
          logEaselError(ms, zone).findLastIndex((value, index) => value !== DATE_FIELD_ZEROES[index]),
        ),
      ),
    ) ?? EASEL_PROMPT_HINT[SECONDS_FIELD_INDEX],
  count: 1,
  skipsWeekends: false,
});
//@ chunk-3s7ydtfd.js:12107-12175 placement
var parts = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
//@ chunk-3s7ydtfd.js:12175-12223 placement
/**
 * 时区偏移量
 */
var zoneOffsetMs = (ms, context) =>
  context.zone === "UTC" ? 0 : parseISOString(logEaselError(ms, context.zone)) - ms;
//@ chunk-3s7ydtfd.js:12223-12315 placement
/**
 * 把 UTC 时间换算到当地
 */
function localizeTimestamp(ms, context) {
  let isoString = parseISOString(ms);
  let dayBefore = isoString - zoneOffsetMs(isoString - MS_PER_DAY, context);
  let localized = isoString - zoneOffsetMs(dayBefore, context);
  return localized + zoneOffsetMs(localized, context) === isoString
    ? localized
    : Math.max(dayBefore, localized);
}
//@ chunk-3s7ydtfd.js:12315-12491 placement
/**
 * 按步长从起点生成直到结束时间的各周期起点。
 */
function periodStarts(context) {
  let { start, step } = context;
  let { fieldIndex } = step.unit;
  let starts = [];
  let fieldValue = start[fieldIndex] ?? 0;
  let ms = localizeTimestamp(start, context);
  while (ms <= context.untilMs) {
    if (ms > (starts.at(-1) ?? -1 / 0)) starts.push(ms);
    fieldValue += step.count;
    ms = localizeTimestamp(start.with(fieldIndex, fieldValue), context);
  }
  return starts;
}
//@ chunk-3s7ydtfd.js:12491-12517 placement
/**
 * 集合包含判断
 */
var hasInSet = (set) => (value) => set.has(value);
//@ chunk-3s7ydtfd.js:12517-12554 placement
/**
 * 步长覆盖的毫秒数
 */
var stepSpan = (step) => step.unit.typicalMs * step.count;
//@ chunk-3s7ydtfd.js:12554-12643 placement
/**
 * 刻度起点与终点
 */
var tickContext = (step, span) => ({
  start: logEaselError(span.fromMs, span.zone),
  step,
  untilMs: span.untilMs + TICK_OVERHANG_STEPS * stepSpan(step),
  zone: span.zone,
});
//@ chunk-3s7ydtfd.js:12643-12813 placement
/**
 * 用某步长生成时间网格，所有读数都落在网格上才返回。
 */
function tryTimeGrid(times, step, span) {
  let starts = periodStarts(tickContext(step, span));
  if (!times.every(hasInSet(new Set(starts)))) return null;
  let filtered = starts.filter((ms) => ms <= span.untilMs);
  return {
    step,
    periodStarts: filtered,
    endMs: starts[filtered.length] ?? span.untilMs,
  };
}
//@ chunk-3s7ydtfd.js:12813-12850 placement
/**
 * 跨度小于一天只用 UTC
 */
var zonesFor = (medianMs, zone) => (medianMs < MS_PER_DAY ? ["UTC"] : ["UTC", zone]);
//@ chunk-3s7ydtfd.js:12850-12903 placement
/**
 * 该字段不同
 */
var differsAtField = (a, b) => (unit) => a[unit.fieldIndex] !== b[unit.fieldIndex];
//@ chunk-3s7ydtfd.js:12903-12949 placement
/**
 * 构造时间范围
 */
var timeRange = (fromMs, untilMs, zone) => ({
  fromMs,
  untilMs,
  zone,
});
//@ chunk-3s7ydtfd.js:12949-13012 placement
/**
 * 中位数
 */
var medianValue = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / HALF_DIVISOR)] ?? 0;
//@ chunk-3s7ydtfd.js:13012-13144 placement
/**
 * 由单位与跨度生成步长（按天时可跳过周末）。
 */
function makeTimeStep(unit, medianMs, allowWeekendSkip) {
  let max = Math.max(1, Math.round(medianMs / unit.typicalMs));
  let skipsWeekends = allowWeekendSkip && unit.fieldIndex === DAY_FIELD_INDEX && max === 1;
  return {
    unit,
    count: max,
    skipsWeekends,
  };
}
//@ chunk-3s7ydtfd.js:13144-13573 placement
function formatTimeTick(times, timeline, allowWeekendSkip) {
  let { zone } = timeline;
  let fromMs = times[0];
  let untilMs = times.at(-1);
  if (!(fromMs !== undefined && untilMs !== undefined && times.length >= MIN_DECIMALS_TICKS)) return null;
  let mapped = times.slice(1).map((ms, index) => ms - (times[index] ?? ms));
  let medianStep = medianValue(mapped);
  if ((untilMs - fromMs) / medianStep > times.length * MAX_LABEL_RATIO) return null;
  let referenceMs = times[mapped.indexOf(medianStep)] ?? fromMs;
  for (let candidateZone of zonesFor(medianStep, zone)) {
    let unit = EASEL_PROMPT_HINT.findLast(
      differsAtField(
        logEaselError(referenceMs, candidateZone),
        logEaselError(referenceMs + medianStep, candidateZone),
      ),
    );
    if (!unit) return null;
    let timeStep = makeTimeStep(unit, medianStep, allowWeekendSkip);
    let grid = tryTimeGrid(times, timeStep, timeRange(fromMs, untilMs, candidateZone));
    if (grid)
      return {
        ...grid,
        periodStarts: grid.periodStarts.filter(
          (periodStart) => !(timeStep.skipsWeekends && isWeekendOrFirst(periodStart, zone)),
        ),
      };
  }
  return null;
}
//@ chunk-3s7ydtfd.js:13573-13601 placement
/**
 * 某字段变化
 */
var fieldChanged = (expected) => (value, index) => value !== expected[index];
//@ chunk-3s7ydtfd.js:13601-13780 placement
/**
 * 刻度标签上下文：时区与公共前缀字段。
 */
function tickLabelContext(timeline, ms) {
  let dataSpan = timeline.dataSpan;
  let fromFields = logEaselError(dataSpan.fromMs, dataSpan.zone);
  let index = fromFields.findIndex(fieldChanged(logEaselError(dataSpan.untilMs, dataSpan.zone)));
  return {
    zone: dataSpan.zone,
    areTicks: !ALLOW_ZONED_TIME,
    fieldsBefore: logEaselError(ms, dataSpan.zone).slice(0, index === -1 ? fromFields.length : index),
  };
}
//@ chunk-3s7ydtfd.js:13780-14217 placement
function pickTickStep(times, step, context) {
  let { fieldIndex } = step.unit;
  let labels = [];
  let fieldsBefore = context.fieldsBefore;
  for (let ms of times) {
    let fileds = logEaselError(ms, context.zone);
    let [year, month, day, hour, minute, second] = fileds;
    let yearChanged = year !== fieldsBefore[YEAR_FIELD_INDEX];
    let showDate =
      fieldIndex >= MONTH_FIELD_INDEX &&
      (fieldIndex <= DAY_FIELD_INDEX ||
        yearChanged ||
        month !== fieldsBefore[MONTH_FIELD_INDEX] ||
        day !== fieldsBefore[DAY_FIELD_INDEX]);
    let showYear = fieldIndex === YEAR_FIELD_INDEX || yearChanged;
    let showTime =
      fieldIndex > DAY_FIELD_INDEX &&
      !(context.areTicks && showDate && hour === 0 && minute === 0 && second === 0);
    let partsOut = [];
    if (showDate) {
      let isMonthOnly = fieldIndex === MONTH_FIELD_INDEX;
      partsOut.push(isMonthOnly ? `${parts[month]}` : `${parts[month]} ${day}`);
    }
    if (showYear) partsOut.push(String(year));
    if (showTime) {
      let withSeconds = fieldIndex === SECONDS_FIELD_INDEX;
      partsOut.push(
        (withSeconds ? [hour, minute, second] : [hour, minute])
          .map((value) => String(value).padStart(TIME_PART_PAD_WIDTH, "0"))
          .join(":"),
      );
    }
    labels.push(partsOut.join(" "));
    fieldsBefore = fileds;
  }
  return labels;
}
//@ chunk-3s7ydtfd.js:14217-14266 placement
/**
 * 某时刻的刻度文本
 */
var tickTextAt = (timeline, ms) =>
  pickTickStep([ms], timeline.precision, tickLabelContext(timeline, ms))[0] ?? "";
//@ chunk-3s7ydtfd.js:14266-14316 placement
/**
 * 构造步长对象
 */
var tickStep = (unit, count) => ({
  unit,
  count,
  skipsWeekends: false,
});
//@ chunk-3s7ydtfd.js:14316-14396 placement
var TICK_STEPS_BY_SPAN = EASEL_PROMPT_HINT.flatMap((unit) =>
  unit.counts.map((count) => tickStep(unit, count)),
).toSorted((a, b) => stepSpan(a) - stepSpan(b));
export {
  pickTickStep,
  TICK_STEPS_BY_SPAN,
  stepSpan,
  periodStarts,
  isWeekendOrFirst,
  parts,
  parseISOString,
  spansWeeksWithoutWeekend,
  formatTimeTick,
  defaultTimeStep,
  tickTextAt,
  tickStepsFor,
};
