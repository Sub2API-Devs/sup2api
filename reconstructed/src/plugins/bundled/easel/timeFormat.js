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

//@ chunk-3s7ydtfd.js:11293-11336 placement = parseISOString (1)
var parseISOString = (s) => Date.UTC(s[0] ?? 0, ...s.slice(1));
//@ chunk-3s7ydtfd.js:11336-11412 placement
/**
 * 周末或周首日
 */
function isWeekendOrFirst(e, zone) {
  let utcDay = new Date(parseISOString(logEaselError(e, zone))).getUTCDay();
  return utcDay === 0 || utcDay === SATURDAY_DAY_INDEX;
}
//@ chunk-3s7ydtfd.js:11412-11459 placement
/**
 * 周序号
 */
var weekIndex = (e, t) =>
  Math.floor((parseISOString(logEaselError(e, t)) / MS_PER_DAY + ISO_WEEK_OFFSET_DAYS) / DAYS_PER_WEEK_TICKS);
//@ chunk-3s7ydtfd.js:11459-11532 placement
/**
 * 跨周但无周末点
 */
var spansWeeksWithoutWeekend = (e, t) =>
  weekIndex(e.at(-1) ?? 0, t) - weekIndex(e[0] ?? 0, t) >= MIN_WEEKS_SPANNED &&
  !e.some((o) => isWeekendOrFirst(o, t));
//@ chunk-3s7ydtfd.js:11532-11605 placement
/**
 * 时间在区间的相对位置
 */
var positionRatio = (axisSpan) => (t) =>
  axisSpan.untilMs > axisSpan.fromMs
    ? (t - axisSpan.fromMs) / (axisSpan.untilMs - axisSpan.fromMs)
    : FALLBACK_POSITION_RATIO;
//@ chunk-3s7ydtfd.js:11605-11805 placement
var TIME_TICK_STEPS = (e, t) => (o) => {
  let r = t.get(o) ?? e.periodStarts.findLastIndex((periodStart) => periodStart <= o);
  let s = e.periodStarts[r] ?? e.axisSpan.fromMs;
  return (r + (o - s) / ((e.periodStarts[r + 1] ?? e.axisSpan.untilMs) - s)) / e.periodStarts.length;
};
//@ chunk-3s7ydtfd.js:11805-11914 placement
/**
 * 按周期起点或时间跨度确定刻度步长。
 */
function tickStepsFor(timeline) {
  return timeline.periodStarts.length > 0
    ? TIME_TICK_STEPS(timeline, new Map(timeline.periodStarts.map((periodStart, r) => [periodStart, r])))
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
var ranksChangingFields = (e) => (t) => e.some((o) => o >= t.fieldIndex);
//@ chunk-3s7ydtfd.js:11983-12107 placement
/**
 * 默认时间步长（按时间字段的变化选单位）。
 */
var defaultTimeStep = (times, zone) => ({
  unit:
    EASEL_PROMPT_HINT.findLast(
      ranksChangingFields(
        times.map((o) => logEaselError(o, zone).findLastIndex((r, s) => r !== DATE_FIELD_ZEROES[s])),
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
var zoneOffsetMs = (e, t) => (t.zone === "UTC" ? 0 : parseISOString(logEaselError(e, t.zone)) - e);
//@ chunk-3s7ydtfd.js:12223-12315 placement
/**
 * 把 UTC 时间换算到当地
 */
function localizeTimestamp(e, t) {
  let isoString = parseISOString(e);
  let r = isoString - zoneOffsetMs(isoString - MS_PER_DAY, t);
  let s = isoString - zoneOffsetMs(r, t);
  return s + zoneOffsetMs(s, t) === isoString ? s : Math.max(r, s);
}
//@ chunk-3s7ydtfd.js:12315-12491 placement
/**
 * 按步长从起点生成直到结束时间的各周期起点。
 */
function periodStarts(e) {
  let { start, step } = e;
  let { fieldIndex } = step.unit;
  let s = [];
  let p = start[fieldIndex] ?? 0;
  let m = localizeTimestamp(start, e);
  while (m <= e.untilMs) {
    if (m > (s.at(-1) ?? -1 / 0)) s.push(m);
    p += step.count;
    m = localizeTimestamp(start.with(fieldIndex, p), e);
  }
  return s;
}
//@ chunk-3s7ydtfd.js:12491-12517 placement
/**
 * 集合包含判断
 */
var hasInSet = (e) => (t) => e.has(t);
//@ chunk-3s7ydtfd.js:12517-12554 placement
/**
 * 步长覆盖的毫秒数
 */
var stepSpan = (e) => e.unit.typicalMs * e.count;
//@ chunk-3s7ydtfd.js:12554-12643 placement
/**
 * 刻度起点与终点
 */
var tickContext = (e, t) => ({
  start: logEaselError(t.fromMs, t.zone),
  step: e,
  untilMs: t.untilMs + TICK_OVERHANG_STEPS * stepSpan(e),
  zone: t.zone,
});
//@ chunk-3s7ydtfd.js:12643-12813 placement
/**
 * 用某步长生成时间网格，所有读数都落在网格上才返回。
 */
function tryTimeGrid(e, timeStep, o) {
  let r = periodStarts(tickContext(timeStep, o));
  if (!e.every(hasInSet(new Set(r)))) return null;
  let filtered = r.filter((m) => m <= o.untilMs);
  return {
    step: timeStep,
    periodStarts: filtered,
    endMs: r[filtered.length] ?? o.untilMs,
  };
}
//@ chunk-3s7ydtfd.js:12813-12850 placement
/**
 * 跨度小于一天只用 UTC
 */
var zonesFor = (e, zone) => (e < MS_PER_DAY ? ["UTC"] : ["UTC", zone]);
//@ chunk-3s7ydtfd.js:12850-12903 placement
/**
 * 该字段不同
 */
var differsAtField = (e, t) => (o) => e[o.fieldIndex] !== t[o.fieldIndex];
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
var medianValue = (e) => e.toSorted((t, o) => t - o)[Math.floor(e.length / HALF_DIVISOR)] ?? 0;
//@ chunk-3s7ydtfd.js:13012-13144 placement
/**
 * 由单位与跨度生成步长（按天时可跳过周末）。
 */
function makeTimeStep(e, t, o) {
  let max = Math.max(1, Math.round(t / e.typicalMs));
  let skipsWeekends = o && e.fieldIndex === DAY_FIELD_INDEX && max === 1;
  return {
    unit: e,
    count: max,
    skipsWeekends,
  };
}
//@ chunk-3s7ydtfd.js:13144-13573 placement
function formatTimeTick(e, t, o) {
  let { zone } = t;
  let fromMs = e[0];
  let untilMs = e.at(-1);
  if (!(fromMs !== undefined && untilMs !== undefined && e.length >= MIN_DECIMALS_TICKS)) return null;
  let mapped = e.slice(1).map((x, l) => x - (e[l] ?? x));
  let a = medianValue(mapped);
  if ((untilMs - fromMs) / a > e.length * MAX_LABEL_RATIO) return null;
  let i = e[mapped.indexOf(a)] ?? fromMs;
  for (let x of zonesFor(a, zone)) {
    let last = EASEL_PROMPT_HINT.findLast(differsAtField(logEaselError(i, x), logEaselError(i + a, x)));
    if (!last) return null;
    let timeStep = makeTimeStep(last, a, o);
    let d = tryTimeGrid(e, timeStep, timeRange(fromMs, untilMs, x));
    if (d)
      return {
        ...d,
        periodStarts: d.periodStarts.filter(
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
var fieldChanged = (e) => (t, o) => t !== e[o];
//@ chunk-3s7ydtfd.js:13601-13780 placement
/**
 * 刻度标签上下文：时区与公共前缀字段。
 */
function tickLabelContext(e, t) {
  let dataSpan = e.dataSpan;
  let r = logEaselError(dataSpan.fromMs, dataSpan.zone);
  let index = r.findIndex(fieldChanged(logEaselError(dataSpan.untilMs, dataSpan.zone)));
  return {
    zone: dataSpan.zone,
    areTicks: !ALLOW_ZONED_TIME,
    fieldsBefore: logEaselError(t, dataSpan.zone).slice(0, index === -1 ? r.length : index),
  };
}
//@ chunk-3s7ydtfd.js:13780-14217 placement
function pickTickStep(e, t, o) {
  let { fieldIndex } = t.unit;
  let s = [];
  let fieldsBefore = o.fieldsBefore;
  for (let m of e) {
    let n = logEaselError(m, o.zone);
    let [a, f, i, x, l, u] = n;
    let d = a !== fieldsBefore[YEAR_FIELD_INDEX];
    let c =
      fieldIndex >= MONTH_FIELD_INDEX &&
      (fieldIndex <= DAY_FIELD_INDEX ||
        d ||
        f !== fieldsBefore[MONTH_FIELD_INDEX] ||
        i !== fieldsBefore[DAY_FIELD_INDEX]);
    let g = fieldIndex === YEAR_FIELD_INDEX || d;
    let T = fieldIndex > DAY_FIELD_INDEX && !(o.areTicks && c && x === 0 && l === 0 && u === 0);
    let L = [];
    if (c) {
      let _ = fieldIndex === MONTH_FIELD_INDEX;
      L.push(_ ? `${parts[f]}` : `${parts[f]} ${i}`);
    }
    if (g) L.push(String(a));
    if (T) {
      let _ = fieldIndex === SECONDS_FIELD_INDEX;
      L.push((_ ? [x, l, u] : [x, l]).map((w) => String(w).padStart(TIME_PART_PAD_WIDTH, "0")).join(":"));
    }
    s.push(L.join(" "));
    fieldsBefore = n;
  }
  return s;
}
//@ chunk-3s7ydtfd.js:14217-14266 placement
/**
 * 某时刻的刻度文本
 */
var tickTextAt = (e, ms) => pickTickStep([ms], e.precision, tickLabelContext(e, ms))[0] ?? "";
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
var rp = EASEL_PROMPT_HINT.flatMap((e) => e.counts.map((count) => tickStep(e, count))).toSorted(
  (e, t) => stepSpan(e) - stepSpan(t),
);
export {
  pickTickStep,
  rp,
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
