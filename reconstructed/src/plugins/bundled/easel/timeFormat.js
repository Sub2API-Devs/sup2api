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
  Iu,
  He,
  vu,
  Wu,
  bu,
  Mu,
  EASEL_PROMPT_HINT,
  Ps,
  Eu,
  ks,
  We,
  Pu,
  ku,
  zu,
  Ds,
  Qo,
  Uu,
} from "./easelMessages.js";

//@ chunk-3s7ydtfd.js:11293-11336 placement = parseISOString (1)
var parseISOString = (s) => Date.UTC(s[0] ?? 0, ...s.slice(1));
//@ chunk-3s7ydtfd.js:11336-11412 placement
function $e(e, t) {
  let uTCDay = new Date(parseISOString(logEaselError(e, t))).getUTCDay();
  return uTCDay === 0 || uTCDay === Iu;
}
//@ chunk-3s7ydtfd.js:11412-11459 placement
var tr = (e, t) => Math.floor((parseISOString(logEaselError(e, t)) / He + vu) / Wu);
//@ chunk-3s7ydtfd.js:11459-11532 placement
var Bs = (e, t) => tr(e.at(-1) ?? 0, t) - tr(e[0] ?? 0, t) >= bu && !e.some((o) => $e(o, t));
//@ chunk-3s7ydtfd.js:11532-11605 placement
var js = (e) => (t) => (e.untilMs > e.fromMs ? (t - e.fromMs) / (e.untilMs - e.fromMs) : Mu);
//@ chunk-3s7ydtfd.js:11605-11805 placement
var TIME_TICK_STEPS = (e, t) => (o) => {
  let r = t.get(o) ?? e.periodStarts.findLastIndex((p) => p <= o),
    s = e.periodStarts[r] ?? e.axisSpan.fromMs;
  return (r + (o - s) / ((e.periodStarts[r + 1] ?? e.axisSpan.untilMs) - s)) / e.periodStarts.length;
};
/**
 * 按周期起点或时间跨度确定刻度步长。
 */
//@ chunk-3s7ydtfd.js:11805-11914 placement
function tickStepsFor(e) {
  return e.periodStarts.length > 0
    ? TIME_TICK_STEPS(e, new Map(e.periodStarts.map((periodStart, r) => [periodStart, r])))
    : js(e.axisSpan);
}
//@ chunk-3s7ydtfd.js:11914-11937 placement
var Ws = [0, 0, 1, 0, 0, 0, 0];
//@ chunk-3s7ydtfd.js:11937-11983 placement
var Hs = (e) => (t) => e.some((o) => o >= t.fieldIndex);
/**
 * 默认时间步长（按时间字段的变化选单位）。
 */
//@ chunk-3s7ydtfd.js:11983-12107 placement
var defaultTimeStep = (e, t) => ({
  unit:
    EASEL_PROMPT_HINT.findLast(Hs(e.map((o) => logEaselError(o, t).findLastIndex((r, s) => r !== Ws[s])))) ??
    EASEL_PROMPT_HINT[Ps],
  count: 1,
  skipsWeekends: !1,
});
//@ chunk-3s7ydtfd.js:12107-12175 placement
var parts = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
//@ chunk-3s7ydtfd.js:12175-12223 placement
var wt = (e, t) => (t.zone === "UTC" ? 0 : parseISOString(logEaselError(e, t.zone)) - e);
//@ chunk-3s7ydtfd.js:12223-12315 placement
function or(e, t) {
  let o = parseISOString(e),
    r = o - wt(o - He, t),
    s = o - wt(r, t);
  return s + wt(s, t) === o ? s : Math.max(r, s);
}
/**
 * 按步长从起点生成直到结束时间的各周期起点。
 */
//@ chunk-3s7ydtfd.js:12315-12491 placement
function periodStarts(e) {
  let { start: start, step: step } = e,
    { fieldIndex: fieldIndex } = step.unit,
    s = [],
    p = start[fieldIndex] ?? 0,
    m = or(start, e);
  while (m <= e.untilMs) {
    if (m > (s.at(-1) ?? -1 / 0)) s.push(m);
    ((p += step.count), (m = or(start.with(fieldIndex, p), e)));
  }
  return s;
}
//@ chunk-3s7ydtfd.js:12491-12517 placement
var Gs = (e) => (t) => e.has(t);
//@ chunk-3s7ydtfd.js:12517-12554 placement
var ae = (e) => e.unit.typicalMs * e.count;
//@ chunk-3s7ydtfd.js:12554-12643 placement
var Xs = (e, t) => ({
  start: logEaselError(t.fromMs, t.zone),
  step: e,
  untilMs: t.untilMs + Eu * ae(e),
  zone: t.zone,
});
/**
 * 用某步长生成时间网格，所有读数都落在网格上才返回。
 */
//@ chunk-3s7ydtfd.js:12643-12813 placement
function tryTimeGrid(e, t, o) {
  let r = periodStarts(Xs(t, o));
  if (!e.every(Gs(new Set(r)))) return null;
  let filtered = r.filter((m) => m <= o.untilMs);
  return { step: t, periodStarts: filtered, endMs: r[filtered.length] ?? o.untilMs };
}
//@ chunk-3s7ydtfd.js:12813-12850 placement
var zs = (e, t) => (e < He ? ["UTC"] : ["UTC", t]);
//@ chunk-3s7ydtfd.js:12850-12903 placement
var Ys = (e, t) => (o) => e[o.fieldIndex] !== t[o.fieldIndex];
//@ chunk-3s7ydtfd.js:12903-12949 placement
var Js = (e, t, o) => ({ fromMs: e, untilMs: t, zone: o });
//@ chunk-3s7ydtfd.js:12949-13012 placement
var Vs = (e) => e.toSorted((t, o) => t - o)[Math.floor(e.length / ks)] ?? 0;
/**
 * 由单位与跨度生成步长（按天时可跳过周末）。
 */
//@ chunk-3s7ydtfd.js:13012-13144 placement
function makeTimeStep(e, t, o) {
  let max = Math.max(1, Math.round(t / e.typicalMs)),
    s = o && e.fieldIndex === We && max === 1;
  return { unit: e, count: max, skipsWeekends: s };
}
//@ chunk-3s7ydtfd.js:13144-13573 placement
function formatTimeTick(e, t, o) {
  let { zone: zone } = t,
    s = e[0],
    at = e.at(-1);
  if (!(s !== void 0 && at !== void 0 && e.length >= Pu)) return null;
  let mapped = e.slice(1).map((x, l) => x - (e[l] ?? x)),
    a = Vs(mapped);
  if ((at - s) / a > e.length * ku) return null;
  let i = e[mapped.indexOf(a)] ?? s;
  for (let x of zs(a, zone)) {
    let last = EASEL_PROMPT_HINT.findLast(Ys(logEaselError(i, x), logEaselError(i + a, x)));
    if (!last) return null;
    let u = makeTimeStep(last, a, o),
      d = tryTimeGrid(e, u, Js(s, at, x));
    if (d)
      return {
        ...d,
        periodStarts: d.periodStarts.filter((periodStart) => !(u.skipsWeekends && $e(periodStart, zone))),
      };
  }
  return null;
}
//@ chunk-3s7ydtfd.js:13573-13601 placement
var Qs = (e) => (t, o) => t !== e[o];
/**
 * 刻度标签上下文：时区与公共前缀字段。
 */
//@ chunk-3s7ydtfd.js:13601-13780 placement
function tickLabelContext(e, t) {
  let dataSpan = e.dataSpan,
    r = logEaselError(dataSpan.fromMs, dataSpan.zone),
    index = r.findIndex(Qs(logEaselError(dataSpan.untilMs, dataSpan.zone)));
  return {
    zone: dataSpan.zone,
    areTicks: !zu,
    fieldsBefore: logEaselError(t, dataSpan.zone).slice(0, index === -1 ? r.length : index),
  };
}
//@ chunk-3s7ydtfd.js:13780-14217 placement
function pickTickStep(e, t, o) {
  let { fieldIndex: fieldIndex } = t.unit,
    s = [],
    fieldsBefore = o.fieldsBefore;
  for (let m of e) {
    let n = logEaselError(m, o.zone),
      [a, f, i, x, l, u] = n,
      d = a !== fieldsBefore[Ds],
      c = fieldIndex >= Qo && (fieldIndex <= We || d || f !== fieldsBefore[Qo] || i !== fieldsBefore[We]),
      g = fieldIndex === Ds || d,
      T = fieldIndex > We && !(o.areTicks && c && x === 0 && l === 0 && u === 0),
      L = [];
    if (c) {
      let _ = fieldIndex === Qo;
      L.push(_ ? `${parts[f]}` : `${parts[f]} ${i}`);
    }
    if (g) L.push(String(a));
    if (T) {
      let _ = fieldIndex === Ps;
      L.push((_ ? [x, l, u] : [x, l]).map((w) => String(w).padStart(Uu, "0")).join(":"));
    }
    (s.push(L.join(" ")), (fieldsBefore = n));
  }
  return s;
}
//@ chunk-3s7ydtfd.js:14217-14266 placement
var tp = (e, t) => pickTickStep([t], e.precision, tickLabelContext(e, t))[0] ?? "";
//@ chunk-3s7ydtfd.js:14266-14316 placement
var op = (e, t) => ({ unit: e, count: t, skipsWeekends: !1 });
//@ chunk-3s7ydtfd.js:14316-14396 placement
var toSorted = EASEL_PROMPT_HINT.flatMap((e) => e.counts.map((count) => op(e, count))).toSorted(
  (e, t) => ae(e) - ae(t),
);

export {
  pickTickStep,
  toSorted,
  ae,
  periodStarts,
  $e,
  parts,
  parseISOString,
  Bs,
  formatTimeTick,
  defaultTimeStep,
  tp,
  tickStepsFor,
};
