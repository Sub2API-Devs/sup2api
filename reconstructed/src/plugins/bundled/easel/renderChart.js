/**
 * plugins/bundled/easel/renderChart.ts
 *
 * 2.1.316 新增：easel 终端图表渲染：颜色、分组、"其他"合并、折线/柱状/迷你图/占比条布局
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (214)
 * attribution: placement 214
 */
import {
  stableSum,
  returnValue,
  U,
  jo,
  fs,
  groupIndexBy,
  K,
  Be,
  CHART_FORMS,
  Et,
  Go,
  displayWidth,
  measureLabelWidth,
  ne,
  truncateMiddle,
  wrapToWidth,
  $o,
  Ce,
} from "./chartSchema.js";
import { ye, formatSeriesValues, logAxisTicks, linearAxisTicks, summarizeSeries } from "./planChart.js";
import { yr } from "./readTable.js";
import { tp, tickStepsFor } from "./timeFormat.js";
import { parseNumberCell } from "./parseValues.js";

/**
 * 队友颜色轮换表。
 */
//@ chunk-3s7ydtfd.js:54522-54592 placement = AGENT_COLORS (0.646)
var AGENT_COLORS = ["blue", "orange", "green", "pink", "teal", "red", "violet", "olive"];
//@ chunk-3s7ydtfd.js:54592-54606 placement
var BLUE = "blue";
//@ chunk-3s7ydtfd.js:54606-54617 placement
var zO = 100;
//@ chunk-3s7ydtfd.js:54617-54627 placement
var JO = 10;
//@ chunk-3s7ydtfd.js:54627-54636 placement
var VO = 3;
//@ chunk-3s7ydtfd.js:54636-54647 placement
var qO = 0.1;
//@ chunk-3s7ydtfd.js:54647-54656 placement
var e_ = 2;
//@ chunk-3s7ydtfd.js:54656-54675 placement
var t_ = 0.000000001;
//@ chunk-3s7ydtfd.js:54675-54684 placement
var o_ = 2;
//@ chunk-3s7ydtfd.js:54684-54696 placement
var s_ = 8000;
//@ chunk-3s7ydtfd.js:54696-54705 placement
var m_ = 2;
//@ chunk-3s7ydtfd.js:54705-54714 placement
var a_ = 2;
//@ chunk-3s7ydtfd.js:54714-54723 placement
var i_ = 1;
//@ chunk-3s7ydtfd.js:54723-54733 placement
var x_ = 16;
//@ chunk-3s7ydtfd.js:54733-54743 placement
var u_ = 24;
//@ chunk-3s7ydtfd.js:54743-54769 placement
var V = (e) => e[0]?.unit ?? "";
//@ chunk-3s7ydtfd.js:54769-54782 placement
var RED = "red";
//@ chunk-3s7ydtfd.js:54782-55209 placement
function pickSeriesColors(e, t, o) {
  let r = stableSum(t),
    mapped = e.map(ye),
    max = Math.max(...e.map((l) => l.size)),
    m = max === 0 ? 1 : max,
    filtered = AGENT_COLORS.filter((l) => l !== RED),
    a = o.measures.length <= filtered.length,
    f = new Map(a ? returnValue(o.measures, filtered) : []),
    x =
      o.isSummed && r > 0 && t.every((l) => l >= 0)
        ? formatSeriesValues(
            "%",
            mapped.map((l) => (zO * l) / r),
          ).map((l) => [["", "", l]])
        : mapped.map(() => []);
  return returnValue(e, returnValue(formatSeriesValues(V(e), mapped), x)).map(([l, [u, d]]) => ({
    key: "",
    name: l.name,
    stats: [["", u, ""], ...d],
    ink: ye(l) < 0 ? RED : (f.get(l.measure) ?? BLUE),
    relativeLength: ye(l) / m,
  }));
}
//@ chunk-3s7ydtfd.js:55209-55232 placement
var Ve = { key: "", ink: BLUE };
/**
 * 柱状图的合计行。
 */
//@ chunk-3s7ydtfd.js:55232-55343 placement
var totalRow = (e, t) => ({
  ...Ve,
  name: "total",
  stats: [["", formatSeriesValues(V(e), [stableSum(t)], { peers: e.map(ye) })[0] ?? "", ""]],
  relativeLength: 0,
});
//@ chunk-3s7ydtfd.js:55343-55675 placement
function describeBarsLimit(e) {
  let t = e.request.combine === "sum",
    r = e.request.top !== void 0 || e.selection.cutSeries.length > 0 ? e.selection.topSeries : e.allSeries,
    flattened = e.allSeries.flatMap((allSery) => allSery.values),
    p = pickSeriesColors(r, flattened, {
      isSummed: t,
      measures: U(e.allSeries.map((allSery) => allSery.measure)),
    }),
    m = t ? [...p, totalRow(r, flattened)] : p;
  return { form: "bars", header: e.frame.header, rows: m, notes: e.frame.notes };
}
/**
 * 给系列补上非空值列表与最大绝对值。
 */
//@ chunk-3s7ydtfd.js:55675-55814 placement
function withSeriesValues(e) {
  let filtered = e.samples.map((sample) => sample.value).filter((o) => o !== null);
  return { ...e, values: filtered, size: Math.max(...filtered.map(Math.abs)), isOthers: !1 };
}
//@ chunk-3s7ydtfd.js:55814-55856 placement
var uo = (e) => e.map((t) => t.name).join(", ");
//@ chunk-3s7ydtfd.js:55856-55935 placement
function ua(e) {
  return e === 1 ? "this is the largest" : `these are the ${e} largest`;
}
//@ chunk-3s7ydtfd.js:55935-56441 placement
function describeGroupedOthers(e) {
  let t = e.cutSeries.length;
  if (t === 0) return [];
  let o = e.form === "bars" && t >= JO * e.drawnAloneCount,
    r = t <= VO,
    s =
      `${jo(e.form, t)} ` +
      (e.isRestDrawnAsOne ? "drawn as one" : "not shown") +
      (r ? ` (${uo(e.cutSeries)})` : "") +
      `: ${ua(e.drawnAloneCount)} of ` +
      (e.drawnAloneCount + t).toLocaleString("en-US") +
      (o ? ". For a distribution, pass counts per range" : "");
  return e.top !== void 0 && e.top > e.formLimit
    ? [
        s,
        `top ${e.top}: a chart draws at most ${jo(e.form, e.formLimit)}` +
          (e.isRestDrawnAsOne ? ", and the rest as one" : ""),
      ]
    : [s];
}
/**
 * 按单位与量级把系列分组到同一坐标轴。
 */
//@ chunk-3s7ydtfd.js:56441-56717 placement
function groupSeriesByScale(e, t) {
  let o = [],
    r = new Map(),
    s = [];
  for (let p of e) {
    let m = r.get(p.unit) ?? o.length,
      n = o[m];
    if (n !== void 0 && (t || p.size === 0 || n.size <= p.size * fs)) s.push(m);
    else (r.set(p.unit, o.length), s.push(o.length), o.push(p));
  }
  return [...groupIndexBy(returnValue(e, s), (p) => p[1]).values()].map((p) => p.map((m) => m[0]));
}
//@ chunk-3s7ydtfd.js:56717-56776 placement
var ya = (e, t, o) => ({ title: t.title ?? "", facts: o, source: yr(e) });
/**
 * 按时刻求各系列之和。
 */
//@ chunk-3s7ydtfd.js:56776-56961 placement
var sumSamplesByTime = (e) =>
  [
    ...groupIndexBy(
      e.flatMap((t) => t.samples),
      (t) => t.ms,
    ),
  ]
    .toSorted(([t], [o]) => t - o)
    .map(([t, o]) => {
      let filtered = o.map((s) => s.value).filter((s) => s !== null);
      return { ms: t, value: filtered.length > 0 ? stableSum(filtered) : null };
    });
//@ chunk-3s7ydtfd.js:56961-57038 placement
var Ze = (e, t) =>
  withSeriesValues({ unit: V(e), name: t, measure: e[0]?.measure ?? "", samples: sumSamplesByTime(e) });
//@ chunk-3s7ydtfd.js:57038-57358 placement
function describeTotalColumn(e, t) {
  if (e.length <= e_) return [];
  let o = new Map(Ze(e, "").samples.map(({ ms: ms, value: p }) => [ms, p])),
    r = ({ ms: ms, value: p }) => p !== null && Math.abs(o_ * p - (o.get(ms) ?? 0)) <= t_ * Math.abs(p);
  return e
    .filter((s) => s.size > 0 && s.samples.every(r))
    .map((s) => `${s.name} equals the sum of the other ${t}: if it is their total, leave it out`);
}
/**
 * 系列峰值所在时刻的标签。
 */
//@ chunk-3s7ydtfd.js:57358-57491 placement
function peakTimeLabel(e, t) {
  let o = { ms: 0, value: -1 / 0 };
  for (let { ms: ms, value: s } of e.samples) if (s !== null && s > o.value) o = { ms: ms, value: s };
  return tp(t, o.ms);
}
/**
 * “total max X at T” 说明。
 */
//@ chunk-3s7ydtfd.js:57491-57607 placement
function totalPeakNote(e, t) {
  let o = Ze(e, "total"),
    [r = ""] = formatSeriesValues(o.unit, [Math.max(...o.values)]);
  return `total max ${r} at ${peakTimeLabel(o, t)}`;
}
//@ chunk-3s7ydtfd.js:57607-57640 placement
var ga = (e, t) => (e.name < t.name ? -1 : 1);
//@ chunk-3s7ydtfd.js:57640-57698 placement
var Oa = (e) => ({ ...Ze(e, `${e.length} others`), isOthers: !0 });
/**
 * 按大小选前若干系列，其余合并为 “others”。
 */
//@ chunk-3s7ydtfd.js:57698-57922 placement
function pickTopSeries(e, t, o) {
  let sliced = e
      .toSorted((m, n) => (m.size !== n.size ? n.size - m.size : ga(m, n)))
      .slice(0, o && e.length === t + 1 ? t + 1 : t),
    filtered = e.filter((m) => !sliced.includes(m)),
    p = o && filtered.length > 0;
  return { topSeries: sliced, cutSeries: filtered, drawnSeries: p ? [...sliced, Oa(filtered)] : sliced };
}
//@ chunk-3s7ydtfd.js:57922-57950 placement
var yo = { key: "", ink: "quiet" };
//@ chunk-3s7ydtfd.js:57950-58009 placement
var mapped = returnValue([..."abcdefgh"], AGENT_COLORS).map(([e, t]) => ({ key: e, ink: t }));
/**
 * 占比图布局（各项份额与颜色）。
 */
//@ chunk-3s7ydtfd.js:58009-58267 placement
function layoutShareChart(e, t, o) {
  let flattened = o.flatMap((m) => m.values),
    s = new Map(returnValue(t.topSeries, mapped)),
    mapped_2 = returnValue(
      pickSeriesColors(t.drawnSeries, flattened, { isSummed: !0, measures: [] }),
      t.drawnSeries,
    ).map(([m, n]) => ({ ...m, ...(s.get(n) ?? yo), share: ye(n) / stableSum(flattened) }));
  return { form: "share", header: e.header, rows: mapped_2, notes: e.notes };
}
//@ chunk-3s7ydtfd.js:58267-58351 placement
var La = (e, t, o) => ({ form: "sparks", header: e.header, rows: t, medianStep: o, notes: e.notes });
/**
 * 缺失样本的说明。
 */
//@ chunk-3s7ydtfd.js:58351-58511 placement
function missingSampleNotes(e) {
  let t = stableSum(e.map((r) => r.samples.length - r.values.length));
  return t > 0 ? [`${K(t, "missing sample")}, left blank where the gap is wide enough to see`] : [];
}
/**
 * 列图的行（名称、统计、线段）。
 */
//@ chunk-3s7ydtfd.js:58511-58612 placement
var toColumnRow =
  (e, t) =>
  ([o, [r, s]]) => ({ ...e.identityOf(o), name: o.name, stats: s, stretches: r.map((p) => p.map(t)) });
//@ chunk-3s7ydtfd.js:58612-58667 placement
var Aa = (e, t) => (o) => ({ x: e(o.ms), y: t.positionOf(o.top) });
//@ chunk-3s7ydtfd.js:58667-59164 placement
function summarizeSparkStat({
  seriesOfPlot: seriesOfPlot,
  axisValues: axisValues,
  timeline: timeline,
  isSummed: isSummed,
}) {
  let s = V(seriesOfPlot),
    mapped = seriesOfPlot.map((l) => l.values),
    m = (l) => formatSeriesValues(s, l, { peers: axisValues, minWritten: i_ }),
    n = m(mapped.map((l) => Math.max(...l))),
    a = m(mapped.map((l) => l.at(-1) ?? 0)),
    f = m(mapped.map((l) => Math.min(...l))),
    i = m(mapped.map((l) => stableSum(l) / l.length)),
    x = formatSeriesValues(s, mapped.map(stableSum));
  return seriesOfPlot.map((l, u) => {
    if (l.values.length === 1) return [["last", a[u] ?? "", ""]];
    let d = [
      ["max", n[u] ?? "", `at ${peakTimeLabel(l, timeline)}`],
      ["last", a[u] ?? "", ""],
      ["min", f[u] ?? "", ""],
      ["mean", i[u] ?? "", ""],
    ];
    return isSummed ? [...d, ["total", x[u] ?? "", ""]] : d;
  });
}
/**
 * 坐标轴上下文（系列映射、值、时间线、是否求和）。
 */
//@ chunk-3s7ydtfd.js:59164-59283 placement
var axisContext = (e, t) => ({
  seriesOfPlot: e.seriesOfPlot,
  axisValues: t,
  timeline: e.data.timeline,
  isSummed: e.request.combine === "sum",
});
//@ chunk-3s7ydtfd.js:59283-59827 placement
function layoutColumns(e) {
  let t = e.data.form === "columns",
    o = new Map(),
    r = [];
  for (let f of e.seriesOfPlot) {
    let i = [],
      x = [];
    for (let sample of f.samples)
      if (sample.value === null) (i.push(x), (x = []));
      else {
        let u = (t ? (o.get(sample.ms) ?? 0) : 0) + sample.value;
        (o.set(sample.ms, u), x.push({ ms: sample.ms, top: u }));
      }
    (i.push(x), r.push(i.filter((l) => l.length > 0)));
  }
  let mapped = r.flat(m_).map((f) => f.top),
    p = V(e.seriesOfPlot),
    m = [t ? 0 : Math.min(...mapped), Math.max(...mapped)],
    a =
      e.request.log === !0
        ? logAxisTicks(p, m, e.maxAxisSteps)
        : linearAxisTicks(summarizeSeries(p, mapped), m, e.maxAxisSteps);
  return {
    ticks: a.ticks,
    rows: returnValue(e.seriesOfPlot, returnValue(r, summarizeSparkStat(axisContext(e, mapped)))).map(
      toColumnRow(e, Aa(tickStepsFor(e.data.timeline), a)),
    ),
  };
}
//@ chunk-3s7ydtfd.js:59827-59861 placement
var Ia = { onePlot: 5, severalPlots: 2 };
//@ chunk-3s7ydtfd.js:59861-60312 placement
function describeStretch({
  topSeries: topSeries,
  frame: { header: t, notes: o },
  request: request,
  data: s,
}) {
  let { ticks: ticks, rows: rows } = layoutColumns({
      seriesOfPlot: topSeries,
      identityOf: () => Ve,
      maxAxisSteps: Ia.onePlot,
      request: request,
      data: s,
    }),
    n = tickStepsFor(s.timeline),
    toSorted = topSeries
      .flatMap((f) => {
        let mapped = f.samples.map((sample) => n(sample.ms));
        return returnValue(mapped, mapped.slice(1)).map(([x, l]) => l - x);
      })
      .toSorted((f, i) => f - i);
  return La(
    {
      header: { ...t, facts: [...t.facts, `each from ${ticks[0]?.label} to ${ticks.at(-1)?.label}`] },
      notes: [...o, ...missingSampleNotes(topSeries)],
    },
    rows,
    toSorted[Math.floor(toSorted.length / a_)] ?? 1,
  );
}
/**
 * 多条折线在同一列靠得太近。
 */
//@ chunk-3s7ydtfd.js:60312-60484 placement
function hasCrowdedLines(e) {
  let t = new Map();
  for (let o of e.rows.flatMap((row) => row.stretches.flat())) {
    let r = o.y - (t.get(o.x) ?? 0);
    if (e.rows.length > 1 && r > 0 && r < qO) return !0;
    t.set(o.x, o.y);
  }
  return !1;
}
/**
 * 按请求里 y 的顺序排列系列分组。
 */
//@ chunk-3s7ydtfd.js:60484-60803 placement
function orderSeriesByRequest(e, t, o) {
  let mapped = t.series.map((sery) => sery.name),
    mapped_2 = (o.y ?? []).map((a) => a.toLowerCase());
  if (!(
    mapped.length > 1 &&
    mapped.every((a) => mapped_2.includes(a.toLowerCase())) &&
    e.flat().length === mapped.length
  ))
    return e;
  let m = (a) => mapped.indexOf(a.name),
    n = (a) => Math.min(...a.map(m));
  return e.map((a) => a.toSorted((f, i) => m(f) - m(i))).toSorted((a, f) => n(a) - n(f));
}
//@ chunk-3s7ydtfd.js:60803-60892 placement
function ka(e) {
  let t = tickStepsFor(e);
  return (o) => ({ position: t(o.ms), when: tp(e, o.ms), label: o.label });
}
/**
 * 把序列分配到一个或多个图（同单位共享，柱状最多若干组）。
 */
//@ chunk-3s7ydtfd.js:60892-61942 placement
function layoutPlots(e) {
  let t = e.data.form === "columns",
    o = orderSeriesByRequest(e.groups.slice(0, Be), e.data, e.request),
    flat = o.flat(),
    flat_2 = e.groups.slice(Be).flat(),
    p = new Map(
      returnValue(
        flat.filter((T) => !T.isOthers),
        flat.length > 1 ? mapped : [Ve],
      ),
    ),
    m = (T) => p.get(T) ?? yo,
    n = Ia[o.length > 1 ? "severalPlots" : "onePlot"],
    mapped_2 = o.map((T) =>
      layoutColumns({ seriesOfPlot: T, identityOf: m, maxAxisSteps: n, request: e.request, data: e.data }),
    ),
    f = e.data.timeline.periodStarts.length,
    i = flat.length > o.length,
    x = `${f} columns do not fit, so they are drawn as ${i ? "lines, one for each series" : "a line"}`,
    l = flat_2.length > 0,
    u = f > u_,
    d = t && mapped_2.some(hasCrowdedLines),
    c = [
      ...e.frame.notes,
      ...(l
        ? [`${jo(e.data.form, flat_2.length)} not shown (${uo(flat_2)}): a chart has at most ${Be} plots`]
        : []),
      ...missingSampleNotes(flat),
    ],
    g = [
      ...(u ? [`on a screen under about ${f + x_} characters wide, ${x}`] : []),
      ...(d ? ["in a terminal, parts of a column thinner than a row may not show"] : []),
    ];
  return {
    form: t ? "columns" : "line",
    header: e.frame.header,
    plots: mapped_2,
    timeline: e.data.timeline,
    marks: e.data.marks.map(ka(e.data.timeline)),
    notes: c,
    mergedColumnsNote: x,
    thinPartsNote: "the thinnest parts of a column are too thin to show here",
    modelOnlyNotes: g,
  };
}
/**
 * 决定绘制方式（合并、对数刻度、序列上限）。
 */
//@ chunk-3s7ydtfd.js:61942-62983 placement
function planChartLayout(e, t) {
  let o = t.combine === "sum",
    r = e.form === "columns" && !o,
    mapped = e.series.map(withSeriesValues),
    p = e.form === "share" || (e.form === "columns" && o && mapped.every((l) => l.unit === V(mapped))),
    m = r ? Be : CHART_FORMS[e.form].maxCount,
    n = pickTopSeries(mapped, Math.min(t.top ?? CHART_FORMS[e.form].defaultCount, m), p),
    a = e.hasCombinedRows && !o,
    f = e.form === "columns" && p && mapped.length > 1,
    i = ya(e, t, [
      ...(e.subject === "" ? [] : [e.subject]),
      ...e.timeline.spanLabels,
      ...(t.log ? ["log scale"] : []),
      ...(a ? [`rows combined by ${t.combine}`] : []),
      ...(f ? [totalPeakNote(mapped, e.timeline)] : []),
    ]),
    x = [
      ...e.leftOutNotes,
      ...e.notes,
      ...describeGroupedOthers({
        form: e.form,
        cutSeries: n.cutSeries,
        drawnAloneCount: n.topSeries.length,
        isRestDrawnAsOne: p,
        formLimit: m,
        top: t.top,
      }),
      ...(o ? describeTotalColumn(mapped, CHART_FORMS[e.form].plural) : []),
    ];
  switch (e.form) {
    case "bars":
      return describeBarsLimit({
        frame: { header: i, notes: x },
        selection: n,
        allSeries: mapped,
        request: t,
      });
    case "share":
      return layoutShareChart({ header: i, notes: x }, n, mapped);
    case "sparks":
      return describeStretch({ topSeries: n.topSeries, frame: { header: i, notes: x }, request: t, data: e });
    case "line":
    case "columns":
      return layoutPlots({
        groups: r
          ? n.topSeries.map((topSery) => [topSery])
          : groupSeriesByScale(n.drawnSeries, e.form === "columns" || t.log === !0),
        frame: { header: i, notes: x },
        request: t,
        data: e,
      });
  }
}
//@ chunk-3s7ydtfd.js:62983-63070 placement
function Da(e) {
  return e.label !== "" ? `mark at ${e.when}: ${e.label}` : `mark at ${e.when}`;
}
//@ chunk-3s7ydtfd.js:63070-63137 placement
var Ua = (e) => ("plots" in e ? [...e.notes, ...e.modelOnlyNotes] : e.notes);
//@ chunk-3s7ydtfd.js:63137-63153 placement = SEP_WIDTH (1)
var SEP_WIDTH = " \xB7 ";
//@ chunk-3s7ydtfd.js:63153-63217 placement
var Ba = (e) => (e.title === "" ? "" : ` "${e.title.replaceAll('"', "'")}"`);
//@ chunk-3s7ydtfd.js:63217-63725 placement
function renderLegend(e) {
  let joined = [
      `${CHART_FORMS[e.form].label}` + Ba(e.header),
      ...e.header.facts,
      `from ${e.header.source}`,
    ].join(SEP_WIDTH),
    mapped = ("plots" in e ? e.plots.flatMap((plot) => plot.rows) : e.rows).map((s) => {
      let p = "stretches" in s ? s.stretches.flat().length : 0;
      return (
        `- ${s.name}: ` +
        [
          ...s.stats.map((stat) => stat.filter((n) => n !== "").join(" ")),
          ...(p > 0 ? [K(p, "point")] : []),
        ].join(SEP_WIDTH)
      );
    }),
    r = [...("plots" in e ? e.marks : []).map((s) => Da(s)), ...Ua(e).map((s) => `note: ${s}`)];
  return [
    joined,
    ...Et(
      mapped,
      Go(
        mapped,
        s_ -
          [joined, ...r].join(`
`).length,
        (s) => s.length + 1,
      ).length,
      "more row",
    ),
    ...r,
  ];
}
//@ chunk-3s7ydtfd.js:63725-63782 placement
var va = (e) => (t) => new Set(t.shownNames.values()).size === e;
//@ chunk-3s7ydtfd.js:63782-63876 placement
var Wa = (e, t, o) => (r, s) => {
  let p = s < e.lane.statsBeforeNames;
  return e.widthPastKey - r.end >= (p ? t : o);
};
//@ chunk-3s7ydtfd.js:63876-63885 placement
var yt = 2;
//@ chunk-3s7ydtfd.js:63885-63894 placement
var bC = 4;
//@ chunk-3s7ydtfd.js:63894-63903 placement
var RC = 2;
//@ chunk-3s7ydtfd.js:63903-63912 placement
var Ha = 2;
//@ chunk-3s7ydtfd.js:63912-63925 placement
var $a = 0.125;
//@ chunk-3s7ydtfd.js:63925-63936 placement
var ke = 0.5;
//@ chunk-3s7ydtfd.js:63936-63949 placement
var Oo = 0.125;
//@ chunk-3s7ydtfd.js:63949-63958 placement
var Ga = 2;
//@ chunk-3s7ydtfd.js:63958-63969 placement
var MC = 0.4;
//@ chunk-3s7ydtfd.js:63969-63978 placement
var Hr = 8;
//@ chunk-3s7ydtfd.js:63978-63987 placement
var wC = 2;
//@ chunk-3s7ydtfd.js:63987-63996 placement
var PC = 1;
//@ chunk-3s7ydtfd.js:63996-64006 placement
var Xa = 40;
//@ chunk-3s7ydtfd.js:64006-64016 placement
var UC = 16;
//@ chunk-3s7ydtfd.js:64016-64025 placement
var BC = 8;
//@ chunk-3s7ydtfd.js:64025-64034 placement
var Ka = 2;
//@ chunk-3s7ydtfd.js:64034-64043 placement
var vC = 1;
//@ chunk-3s7ydtfd.js:64043-64058 placement
var za = 1048576;
//@ chunk-3s7ydtfd.js:64058-64069 placement
var $C = 0.5;
//@ chunk-3s7ydtfd.js:64069-64078 placement
var Ya = 2;
//@ chunk-3s7ydtfd.js:64078-64087 placement
var XC = 1;
//@ chunk-3s7ydtfd.js:64087-64096 placement
var pe = 1;
/**
 * 行布局的输入（名称是否已在标题中、缩进、键宽）。
 */
//@ chunk-3s7ydtfd.js:64096-64385 placement
function prepareRowLayout(e) {
  let t = e.rows.length === 1 ? e.rows[0] : void 0,
    o = t !== void 0 && e.headerTexts.includes(t.name),
    s = e.rows.some((row) => row.key) ? Ga : 0;
  return {
    rows: e.rows,
    lane: e.lane,
    fullNames: o ? [] : e.rows.map((row) => row.name),
    isNamedInHeader: o,
    indent: Math.max(0, e.left - yt),
    keyWidth: s,
    widthPastKey: e.columns - s - yt,
  };
}
//@ chunk-3s7ydtfd.js:64385-64421 placement
var me = (e) => Math.max(0, ...e.map(displayWidth));
//@ chunk-3s7ydtfd.js:64421-64484 placement
var Va = (e, t, o) => (o ? Math.min(Math.floor(e / wC), e - t.minWidth - pe) : e);
/**
 * 计算行的列位置：名称、色道、统计列。
 */
//@ chunk-3s7ydtfd.js:64484-64851 placement
function computeRowLayout(e, t) {
  let o = e.lane.minWidth > 0,
    r = e.widthPastKey - (t.at(-1)?.end ?? 0),
    s = o && r >= Hr + e.lane.minWidth,
    p = measureLabelWidth(e.fullNames, Va(r, e.lane, s)),
    m = e.isNamedInHeader ? Math.min(e.indent, r) : me(p),
    n = s ? r - m - pe : 0,
    a = e.keyWidth + m + (s ? pe + n : 0);
  return {
    wantsLane: o,
    keyWidth: e.keyWidth,
    shownNames: new Map(returnValue(e.rows, p)),
    laneLeft: e.keyWidth + m + pe,
    laneWidth: n,
    statsLeft: a > 0 ? a + yt : 0,
    statColumns: t,
  };
}
/**
 * 名称列的最小宽度。
 */
//@ chunk-3s7ydtfd.js:64851-64972 placement
var minNameWidth = (e, t) =>
  Math.max(
    Math.min(e.isNamedInHeader ? e.indent : me(e.fullNames), t * MC),
    e.lane.minWidth > 0 ? Hr + e.lane.minWidth : 0,
  );
//@ chunk-3s7ydtfd.js:64972-64987 placement
var COLUMN_INDEXES = [0, 1, 2];
//@ chunk-3s7ydtfd.js:64987-65041 placement
var maxStatsLength = (e) => Math.max(0, ...e.map((t) => t.stats.length));
//@ chunk-3s7ydtfd.js:65041-65247 placement = rollFrom (0.363)
function layoutStatColumns(rows) {
  let t = [],
    o = -yt;
  for (let r of ne(maxStatsLength(rows))) {
    o += yt - pe;
    let s = [];
    for (let p of COLUMN_INDEXES) {
      let rarity = me(rows.map((n) => n.stats[r]?.[p] ?? ""));
      ((o += rarity > 0 ? pe + rarity : 0), s.push({ start: o - rarity, width: rarity }));
    }
    t.push({ parts: s, end: o });
  }
  return t;
}
/**
 * 选择能放下的统计列数并计算行布局。
 */
//@ chunk-3s7ydtfd.js:65247-65487 placement
function layoutRows(e) {
  let t = prepareRowLayout(e),
    filtered = layoutStatColumns(e.rows).filter(
      Wa(t, Math.min(me(t.fullNames), Hr), minNameWidth(t, e.columns)),
    );
  return (
    ne(Math.max(0, filtered.length - e.lane.statsBeforeNames) + 1)
      .map((r) => computeRowLayout(t, filtered.slice(0, filtered.length - r)))
      .find(va(new Set(t.fullNames).size)) ?? computeRowLayout(t, filtered)
  );
}
//@ chunk-3s7ydtfd.js:65487-65540 placement
var tf = (e, t, o) => ({ shapes: e, rows: t + 1, lane: { x: o, y: t } });
//@ chunk-3s7ydtfd.js:65540-65621 placement
var of = (e) => ({ kind: "text", at: e.at, text: e.text, ink: e.ink, isAboutPartsLeftOut: !1 });
//@ chunk-3s7ydtfd.js:65621-65672 placement
function I(e) {
  return e.text.trim() === "" ? [] : [of(e)];
}
//@ chunk-3s7ydtfd.js:65672-65707 placement
var rf = (e, t, o) => (t > 0 ? e.width - displayWidth(o) : 0);
//@ chunk-3s7ydtfd.js:65707-65747 placement
var sf = (e, t) => (e.wantsLane ? "title" : t.ink);
//@ chunk-3s7ydtfd.js:65747-65786 placement
var pf = (e, t, o) => (o === PC ? sf(e, t) : "quiet");
/**
 * 画一行的键、名称与统计值。
 */
//@ chunk-3s7ydtfd.js:65786-66149 placement
function drawRowLabels(e, t, o) {
  let r = [
    ...I({ at: { x: 0, y: o }, text: t.key, ink: t.ink }),
    ...I({
      at: { x: e.keyWidth, y: o },
      text: e.shownNames.get(t) ?? "",
      ink: e.wantsLane ? "words" : "title",
    }),
  ];
  for (let [s, p] of e.statColumns.entries())
    for (let [m, n] of p.parts.entries()) {
      let a = t.stats[s]?.[m] ?? "";
      r.push(...I({ at: { x: e.statsLeft + n.start + rf(n, m, a), y: o }, text: a, ink: pf(e, t, m) }));
    }
  return tf(r, o, e.laneLeft);
}
//@ chunk-3s7ydtfd.js:66149-66188 placement
var _o = { minWidth: 0, statsBeforeNames: 1 };
//@ chunk-3s7ydtfd.js:66188-66227 placement
var mf = { minWidth: 8, statsBeforeNames: 1 };
/**
 * 柱形（宽度按相对长度，负值加斜线）。
 */
//@ chunk-3s7ydtfd.js:66227-66360 placement
var barShape = (e, t, o) => ({
  kind: "bar",
  at: e,
  width: Math.max(Oo, Math.abs(t.relativeLength) * o.laneWidth),
  ink: t.ink,
  isHatched: t.relativeLength < 0,
});
/**
 * 画柱状图的各行。
 */
//@ chunk-3s7ydtfd.js:66360-66605 placement
function drawBarRows(e, t, o) {
  let r = layoutRows({ rows: t, columns: e.columns, lane: mf, headerTexts: o, left: 0 });
  return {
    shapes: t.flatMap((s, p) => {
      let m = drawRowLabels(r, s, e.rows + p);
      return s.relativeLength !== 0 && r.laneWidth > 0 ? [...m.shapes, barShape(m.lane, s, r)] : m.shapes;
    }),
    rows: e.rows + t.length,
  };
}
//@ chunk-3s7ydtfd.js:66605-66637 placement
var Co = (e) => Math.round(e * za) / za;
//@ chunk-3s7ydtfd.js:66637-66681 placement
var ff = (e, t) => ({ key: e.key, ink: e.ink, row: t });
//@ chunk-3s7ydtfd.js:66681-66770 placement
function lf(e, t) {
  let o = e.stretches.at(-1)?.at(-1);
  return o ? [ff(e, Math.floor(t(o.y)))] : [];
}
//@ chunk-3s7ydtfd.js:66770-66841 placement
var xf = (e, t) =>
  groupIndexBy(
    e.filter((o) => o.key).flatMap((o) => lf(o, t)),
    (o) => o.row,
  );
//@ chunk-3s7ydtfd.js:66841-66857 placement
var CHART_ROW_DENSITIES = [11, 7, 5];
//@ chunk-3s7ydtfd.js:66857-66891 placement
var rowsPerTick = (e, t) => Math.floor((e - 1) / t);
//@ chunk-3s7ydtfd.js:66891-66964 placement
var chartRowScale = (e, t) =>
  Math.max(
    1,
    Math.min(rowsPerTick(CHART_ROW_DENSITIES.at(e - 1) ?? Math.min(...CHART_ROW_DENSITIES), t), bC),
  );
//@ chunk-3s7ydtfd.js:66964-67030 placement
var ticksInRange = (e, t, o) => e.ticks.filter((tick) => tick.position >= t && tick.position <= o);
//@ chunk-3s7ydtfd.js:67030-67227 placement
function unstackColumnRows(e) {
  let t = new Map(),
    o = [];
  for (let r of e) {
    o.push({
      ...r,
      stretches: r.stretches.map((stretche) => stretche.map((p) => ({ x: p.x, y: p.y - (t.get(p.x) ?? 0) }))),
    });
    for (let s of r.stretches.flat()) t.set(s.x, s.y);
  }
  return o;
}
//@ chunk-3s7ydtfd.js:67227-67610 placement
function layoutPlotRows(e, t, o) {
  let r = t.form === "columns",
    s = r && !o ? unstackColumnRows(e.rows) : e.rows,
    mapped = s.flatMap((T) => T.stretches.flat()).map((T) => T.y),
    m = r ? 0 : Math.min(...mapped),
    max = Math.max(...mapped),
    a = e.ticks.length - 1,
    f = ticksInRange(e, m, max).length >= RC,
    i = f ? m : 0,
    x = f ? max : 1,
    u = max > m ? chartRowScale(t.plots.length, (x - i) * a) : 1,
    d = (T) => Co((1 - T) * a * u),
    c = (T) => Math.round(d(T)),
    g = (T) => ke + d(T) - c(x);
  return { ...e, rows: s, yOf: g, height: c(i) - c(x) + 1, endKeys: xf(o ? [] : s, g) };
}
//@ chunk-3s7ydtfd.js:67610-67674 placement
function keyColumnWidth(e) {
  return e.some((o) => o.rows.some((row) => row.key)) ? Ga : 0;
}
//@ chunk-3s7ydtfd.js:67674-67787 placement
function endKeysWidth(e) {
  let max = Math.max(0, ...e.flatMap((o) => [...o.endKeys.values()]).map((o) => o.length));
  return max > 0 ? pe + max : 0;
}
//@ chunk-3s7ydtfd.js:67787-67952 placement
function columnAreaLayout(e, t, o) {
  let max = Math.max(1, t - 1),
    s = (m) => e + Math.floor(Co(m * o)) * t,
    p = (m) => Math.min(s(m), s((o - 1) / o)) + max / Ha;
  return { left: e, width: t * o, columnWidth: max, xOf: s, tickXOf: p };
}
//@ chunk-3s7ydtfd.js:67952-68044 placement
function continuousAreaLayout(e, t) {
  let o = (r) => e + r * (t - ke);
  return { left: e, width: t, columnWidth: 0, xOf: o, tickXOf: o };
}
//@ chunk-3s7ydtfd.js:68044-68179 placement
function layoutChartArea(e, t, o) {
  let r = me(e.flatMap((n) => n.ticks.map((tick) => tick.label))) + Ya,
    s = t - r,
    p = o > 0 ? Math.floor(s / o) : 0;
  return p === 0 ? continuousAreaLayout(r, s) : columnAreaLayout(r, p, o);
}
//@ chunk-3s7ydtfd.js:68179-68366 placement
function layoutPlots_2(e, t) {
  let plots = e.plots,
    r = layoutChartArea(plots, t - keyColumnWidth(plots), e.timeline.periodStarts.length),
    s = r.columnWidth > 0,
    mapped = plots.map((m) => layoutPlotRows(m, e, s));
  return s
    ? { area: r, drawnPlots: mapped }
    : { area: layoutChartArea(plots, t - endKeysWidth(mapped), 0), drawnPlots: mapped };
}
//@ chunk-3s7ydtfd.js:68366-68416 placement
var axisRowShape = (e, t) => ({ kind: "axisRow", at: e, gridWidth: t });
//@ chunk-3s7ydtfd.js:68416-68472 placement
var flattenThinStack = (e) => e.map((t, o) => ({ ink: t.ink, height: o > 0 ? 0 : Oo }));
//@ chunk-3s7ydtfd.js:68472-68538 placement
var stackShape = (e, t, o) => ({ kind: "stack", at: e, width: t.columnWidth, parts: o });
//@ chunk-3s7ydtfd.js:68538-68711 placement
var toColumnStack =
  (e, t) =>
  ([o, r]) => {
    let s = [],
      p = { y: e, position: 0 };
    for (let m of r) {
      if (m.position > p.position) s.push({ height: p.y - m.y, ink: m.ink });
      p = m;
    }
    return stackShape({ x: o, y: e }, t, e - p.y < Oo ? flattenThinStack(s) : s);
  };
//@ chunk-3s7ydtfd.js:68711-68828 placement
var groupPointsByColumn = (e) =>
  groupIndexBy(
    e.rows.flatMap((row) =>
      row.stretches.flat().map((o) => ({ ...e.toCells(o), position: o.y, ink: row.ink })),
    ),
    (t) => t.x,
  );
//@ chunk-3s7ydtfd.js:68828-68890 placement
var columnStacks = (e) => [...groupPointsByColumn(e)].map(toColumnStack(e.toCells({ x: 0, y: 0 }).y, e.area));
//@ chunk-3s7ydtfd.js:68890-68954 placement
var markFlag = (e) => (t) => ({ x: e.tickXOf(t.position), text: truncateMiddle(t.label, UC) });
//@ chunk-3s7ydtfd.js:68954-68999 placement
var lineShape = (e, t) => ({ kind: "line", ink: t, points: e });
//@ chunk-3s7ydtfd.js:68999-69098 placement = diff (0.798)
var pointSegment = (prev, next) =>
  [prev.x - ke, prev.x + ke].map((o) => ({
    x: Math.max(next.left, Math.min(o, next.left + next.width - $a)),
    y: prev.y,
  }));
//@ chunk-3s7ydtfd.js:69098-69270 placement = diff (0.794)
var decimateLinePoints = (e) =>
  [...groupIndexBy(e, (t) => Math.floor(t.x / ke)).values()].flatMap((t) => {
    let toSorted = t.toSorted((s, p) => s.y - p.y),
      r = [t[0], toSorted[0], toSorted.at(-1), t.at(-1)];
    return t.filter((s) => r.includes(s));
  });
//@ chunk-3s7ydtfd.js:69270-69312 placement
var linePoints = (e, t) => (e.length > 1 ? decimateLinePoints(e) : pointSegment(e[0], t));
//@ chunk-3s7ydtfd.js:69312-69508 placement
function splitLineRuns(e) {
  let t = [],
    o = [],
    r = -1 / 0;
  for (let [s, ...p] of e) {
    if (s === void 0) continue;
    let m = p.length === 0 ? ke : 0;
    if (s.x - m - r < XC) o.push(s, ...p);
    else {
      let a = [s, ...p];
      (t.push(a), (o = a));
    }
    r = (p.at(-1) ?? s).x + m;
  }
  return t;
}
//@ chunk-3s7ydtfd.js:69508-69667 placement
function lineShapes({ rows: rows, area: area, toCells: toCells }) {
  let r = [];
  for (let s of rows.toReversed())
    for (let p of splitLineRuns(s.stretches.map((stretche) => stretche.map(toCells))))
      r.push(lineShape(linePoints(p, area), s.ink));
  return r;
}
//@ chunk-3s7ydtfd.js:69667-69756 placement
var axisTickRow = (e, t) =>
  ne(t.width)
    .map((o) => (e.some((s) => s.column === o) ? "\u252C" : "\u2500"))
    .join("");
//@ chunk-3s7ydtfd.js:69756-69851 placement
var xAxisShapes = (e, t) =>
  I({ at: { x: e.area.left - 1, y: e.room.rows }, text: `\u2514${axisTickRow(t, e.area)}`, ink: "quiet" });
//@ chunk-3s7ydtfd.js:69851-69938 placement
var xLabelShapes = (e, t, o) =>
  e.flatMap((r) => I({ at: { x: t.left + r.start, y: o }, text: r.text, ink: "quiet" }));
//@ chunk-3s7ydtfd.js:69938-70018 placement
var periodPosition = (e) => (t) =>
  (e.periodStarts.findIndex((periodStart) => periodStart >= t) + $C) / e.periodStarts.length;
//@ chunk-3s7ydtfd.js:70018-70072 placement
var columnOfTime = (e, t) => (o) => Math.floor(e.tickXOf(t(o)) - e.left);
//@ chunk-3s7ydtfd.js:70072-70253 placement
function xAxisLabels(e) {
  let t = e.area.columnWidth > 0,
    o = columnOfTime(e.area, t ? periodPosition(e.timeline) : tickStepsFor(e.timeline));
  return parseNumberCell(e.timeline.dataSpan, e.timeline.step, {
    columns: e.area.width,
    columnOf: o,
    areCentred: t,
  });
}
//@ chunk-3s7ydtfd.js:70253-70563 placement
function drawXAxis(e) {
  let t = xAxisLabels(e),
    o = e.room.rows + 1,
    r = [],
    s = o + 1,
    p;
  for (let m of e.flags.filter((flag) => flag.text !== "")) {
    let n = displayWidth(m.text),
      floored = Math.floor(Math.min(m.x, e.room.columns - n));
    if (p === void 0 || floored < p) s += 1;
    (r.push(...I({ at: { x: floored, y: s - 1 }, text: m.text, ink: "words" })), (p = floored + n + pe));
  }
  return { shapes: [...xAxisShapes(e, t), ...xLabelShapes(t, e.area, o), ...r], rows: s };
}
//@ chunk-3s7ydtfd.js:70563-70616 placement
var toPlotCells = (e, t, o) => (r) => ({ x: e.xOf(r.x), y: o + t.yOf(r.y) });
//@ chunk-3s7ydtfd.js:70616-71621 placement
function drawLineOrColumnChart({
  room: room,
  chart: chart,
  plotsLayout: plotsLayout,
  headerTexts: headerTexts,
}) {
  let { area: area, drawnPlots: drawnPlots } = plotsLayout,
    m = area.columnWidth > 0,
    n = layoutRows({
      rows: drawnPlots.flatMap((c) => c.rows),
      columns: room.columns,
      lane: _o,
      headerTexts: headerTexts,
      left: area.left,
    }),
    a = n.shownNames.size + n.statColumns.length > 0,
    mapped = chart.marks.map(markFlag(area)),
    i = m ? columnStacks : lineShapes,
    x = [],
    rows = room.rows;
  for (let c of drawnPlots) {
    for (let L of a ? c.rows : []) {
      let _ = drawRowLabels(n, L, rows);
      (x.push(_.shapes), (rows = _.rows));
    }
    let g = rows,
      T = g + c.height;
    for (let L = g; L < T; L++) {
      let found = c.ticks.find((tick) => g + Math.floor(c.yOf(tick.position)) === L),
        w = found?.label ?? "";
      x.push(I({ at: { x: area.left - Ya - displayWidth(w), y: L }, text: w, ink: "quiet" }), [
        axisRowShape({ x: area.left - 1, y: L }, found ? area.width + ke : 0),
      ]);
    }
    x.push(i({ rows: c.rows, area: area, toCells: toPlotCells(area, c, g) }));
    for (let [L, _] of c.endKeys)
      for (let [w, A] of _.entries())
        x.push(I({ at: { x: area.left + area.width + pe + w, y: g + L }, text: A.key, ink: A.ink }));
    (x.push(
      mapped.map((L) =>
        lineShape(
          [g, T - $a].map((_) => ({ x: L.x, y: _ })),
          "quiet",
        ),
      ),
    ),
      (rows = T));
  }
  let u = drawXAxis({
      room: { columns: room.columns, rows: rows },
      timeline: chart.timeline,
      area: area,
      flags: mapped,
    }),
    d = chart.form === "columns" && !m;
  return { shapes: [...x.flat(), ...u.shapes], rows: u.rows, notes: d ? [chart.mergedColumnsNote] : [] };
}
//@ chunk-3s7ydtfd.js:71621-71680 placement
var bandShape = (e, t) => ({ kind: "band", at: { x: 0, y: e }, rows: Ka, parts: t });
//@ chunk-3s7ydtfd.js:71680-71752 placement
var shareKeyShape = (e, t) => I({ at: { x: Math.floor(e.middle), y: t }, text: e.key, ink: e.ink });
//@ chunk-3s7ydtfd.js:71752-71799 placement
var sharePart = (e, t, o) => ({ ...e, width: t, middle: o - t / Ha });
//@ chunk-3s7ydtfd.js:71799-72215 placement
function drawShareBar(e, t) {
  let mapped = t.map((i) => (i.share > 0 ? Math.max(i.share * e.columns, vC) : 0)),
    r = stableSum(mapped) - e.columns,
    index = mapped.indexOf(Math.max(...mapped)),
    p = [],
    m = 0;
  for (let [i, x] of t.entries()) {
    let l = (mapped[i] ?? 0) - (i === index ? r : 0);
    if (l > 0) ((m += l), p.push(sharePart(x, l, m)));
  }
  let n = e.rows + Ka,
    a = n + 1,
    f = layoutRows({ rows: t, columns: e.columns, lane: _o, headerTexts: [], left: 0 });
  return {
    shapes: [
      bandShape(e.rows, p),
      ...p.flatMap((i) => shareKeyShape(i, n)),
      ...t.flatMap((i, x) => drawRowLabels(f, i, a + x).shapes),
    ],
    rows: a + t.length,
  };
}
//@ chunk-3s7ydtfd.js:72215-72264 placement
var fartherFrom = (e, t, o) => (Math.abs(t - e) >= Math.abs(o - e) ? t : o);
//@ chunk-3s7ydtfd.js:72264-72311 placement
var bucketIndex = (e) => (t) => Math.min(e - 1, Math.floor(t * e));
//@ chunk-3s7ydtfd.js:72311-72571 placement = diff (0.806)
function resampleSparkline(prev, next) {
  let list = Array.from(Array(next), () => null),
    mapped = prev.flat().map((m) => m.y),
    s = stableSum(mapped) / mapped.length,
    p = bucketIndex(next);
  for (let m of prev)
    for (let [n, a] of m.entries()) {
      let f = p(a.x),
        max = Math.max(f, p(m[n + 1]?.x ?? a.x) - 1);
      for (let x = f; x <= max; x++) list[x] = Math.max(Oo, fartherFrom(s, a.y, list[x] ?? a.y));
    }
  return list;
}
//@ chunk-3s7ydtfd.js:72571-72670 placement
var sparklineHeights = (e, t, o) =>
  resampleSparkline(e.stretches, o).flatMap((r) => Array.from(Array(Math.floor(t.laneWidth / o)), () => r));
//@ chunk-3s7ydtfd.js:72670-72710 placement
var SPARK_LANE = { minWidth: 16, statsBeforeNames: 0 };
//@ chunk-3s7ydtfd.js:72710-72764 placement
var stripShape = (e, t, o) => ({ kind: "strip", at: e, heights: t, ink: o });
//@ chunk-3s7ydtfd.js:72764-73043 placement
function drawSparklines(e, t, o) {
  let r = layoutRows({ rows: t.rows, columns: e.columns, lane: SPARK_LANE, headerTexts: o, left: 0 }),
    min = Math.min(r.laneWidth, Math.round(1 / t.medianStep) + 1);
  return {
    shapes: t.rows.flatMap((row, m) => {
      let n = drawRowLabels(r, row, e.rows + m);
      return [...n.shapes, stripShape(n.lane, sparklineHeights(row, r, min), row.ink)];
    }),
    rows: e.rows + t.rows.length,
  };
}
//@ chunk-3s7ydtfd.js:73043-73341 placement
function drawChartBody(e, t, o) {
  switch (e.form) {
    case "bars":
      return { ...drawBarRows(t, e.rows, o), notes: [] };
    case "share":
      return { ...drawShareBar(t, e.rows), notes: [] };
    case "sparks":
      return { ...drawSparklines(t, e, o), notes: [] };
    case "line":
    case "columns": {
      let r = layoutPlots_2(e, t.columns);
      return r.area.width >= BC
        ? drawLineOrColumnChart({ room: t, chart: e, plotsLayout: r, headerTexts: o })
        : void 0;
    }
  }
}
//@ chunk-3s7ydtfd.js:73341-73490 placement
function wrappedTextRows(e, t, o) {
  let flattened = t.flatMap((s) => wrapToWidth(s, e.columns));
  return {
    shapes: flattened.flatMap((s, p) => I({ at: { x: 0, y: e.rows + p }, text: s, ink: o })),
    rows: e.rows + flattened.length,
  };
}
//@ chunk-3s7ydtfd.js:73490-73570 placement
var headerFactShape = (e, t, o) =>
  I({ at: { x: t + pe, y: e - 1 }, text: `${SEP_WIDTH.trimStart()}${o}`, ink: "quiet" });
//@ chunk-3s7ydtfd.js:73570-73583 placement
var SEPARATOR_WIDTH = displayWidth(SEP_WIDTH);
//@ chunk-3s7ydtfd.js:73583-73893 placement
function drawHeader(e, t) {
  let filtered = [t.title, ...t.facts].filter((m) => m !== ""),
    r = [],
    rows = e.rows,
    p = 0;
  for (let [m, n] of filtered.entries()) {
    let a = p + SEPARATOR_WIDTH + displayWidth(n);
    if (m === 0 || a > e.columns) {
      let i = wrappedTextRows({ columns: e.columns, rows: rows }, [n], m === 0 ? "title" : "quiet");
      (r.push(...i.shapes), (rows = i.rows), (p = displayWidth(n)));
    } else (r.push(...headerFactShape(rows, p, n)), (p = a));
  }
  return { shapes: r, rows: rows, texts: filtered };
}
//@ chunk-3s7ydtfd.js:73893-73949 placement
var chartResult = (e, t) => ({ columns: e, rows: t.rows, shapes: t.shapes });
//@ chunk-3s7ydtfd.js:73949-74006 placement
var chartAsText = (e, t) =>
  chartResult(t, wrappedTextRows({ columns: t, rows: 0 }, renderLegend(e), "words"));
//@ chunk-3s7ydtfd.js:74006-74091 placement
var partsLeftOutShape = (e, t) => ({
  kind: "text",
  at: { x: 0, y: t },
  text: e,
  ink: "quiet",
  isAboutPartsLeftOut: !0,
});
//@ chunk-3s7ydtfd.js:74091-74195 placement
function drawThinPartsNote(e, t) {
  let o = wrapToWidth(t, e.columns);
  return { shapes: o.map((r, s) => partsLeftOutShape(r, e.rows + s)), rows: e.rows + o.length };
}
//@ chunk-3s7ydtfd.js:74195-74581 placement
function layoutChart(e, t) {
  if (t < Xa) return chartAsText(e, t);
  let o = drawHeader({ columns: t, rows: 0 }, e.header),
    r = drawChartBody(e, { columns: t, rows: o.rows }, o.texts);
  if (r === void 0) return chartAsText(e, t);
  let s = wrappedTextRows({ columns: t, rows: r.rows }, [...e.notes, ...r.notes], "quiet"),
    m =
      e.form === "columns"
        ? drawThinPartsNote({ columns: t, rows: s.rows }, e.thinPartsNote)
        : { shapes: [], rows: s.rows };
  return chartResult(t, { shapes: [...o.shapes, ...r.shapes, ...s.shapes, ...m.shapes], rows: m.rows });
}
//@ chunk-3s7ydtfd.js:74581-74628 placement
var glyphCell = (e, t, o) => ({ glyph: e, ink: t, background: o });
//@ chunk-3s7ydtfd.js:74628-74639 placement
var MIN_PART_EIGHTHS = 0.5;
//@ chunk-3s7ydtfd.js:74639-74648 placement
var MAX_BLEND_PARTS = 2;
//@ chunk-3s7ydtfd.js:74648-74657 placement
var EIGHTHS = 8;
//@ chunk-3s7ydtfd.js:74657-74666 placement
var THIN_TOP_EIGHTHS = 3;
//@ chunk-3s7ydtfd.js:74666-74679 placement
var BRAILLE_BASE = 10240;
//@ chunk-3s7ydtfd.js:74679-74688 placement
var BRAILLE_COLS = 2;
//@ chunk-3s7ydtfd.js:74688-74697 placement
var BRAILLE_ROWS = 4;
//@ chunk-3s7ydtfd.js:74697-74708 placement
var BLANK = " ";
//@ chunk-3s7ydtfd.js:74708-74724 placement
var FULL_BLOCK = "\u2588";
//@ chunk-3s7ydtfd.js:74724-74740 placement
var LOWER_THREE_QUARTERS = "\u2586";
//@ chunk-3s7ydtfd.js:74740-74756 placement
var MEDIUM_SHADE = "\u2592";
//@ chunk-3s7ydtfd.js:74756-74811 placement
var topTwoParts = (e, t) => e.filter((o) => t.slice(0, MAX_BLEND_PARTS).includes(o));
//@ chunk-3s7ydtfd.js:74811-75203 placement
function blendEighthGlyph(e, t, o) {
  let filtered = e
      .map((i) => ({ ink: i.ink, size: Math.min(i.to, t + EIGHTHS) - Math.max(i.from, t) }))
      .filter((i) => i.size >= MIN_PART_EIGHTHS),
    toSorted = filtered.toSorted((i, x) => x.size - i.size),
    [p] = toSorted;
  if (p === void 0) return;
  let rounded = Math.round((e.at(-1)?.to ?? t) - t);
  if (rounded < EIGHTHS) {
    let i = o[rounded];
    return i ? { glyph: i, ink: p.ink } : void 0;
  }
  let [n = p, a] = topTwoParts(filtered, toSorted),
    f = o[Math.round((n.size / (n.size + (a?.size ?? 0))) * EIGHTHS)];
  return f ? glyphCell(f, n.ink, a?.ink) : { glyph: FULL_BLOCK, ink: p.ink };
}
//@ chunk-3s7ydtfd.js:75203-75239 placement
var GRID_DOT = { glyph: "\u2508", ink: "quiet" };
//@ chunk-3s7ydtfd.js:75239-75273 placement
var axisGlyph = (e) => (e > 0 ? "\u2524" : "\u2502");
//@ chunk-3s7ydtfd.js:75273-75303 placement
var BLANK_CELL = { glyph: BLANK, ink: "words" };
//@ chunk-3s7ydtfd.js:75303-75622 placement
function createGlyphGrid(e) {
  let list = Array.from({ length: e.rows * e.columns }, () => BLANK_CELL);
  function o(r) {
    return Number.isInteger(r.x) && Number.isInteger(r.y) && r.x >= 0 && r.x < e.columns
      ? r.y * e.columns + r.x
      : -1;
  }
  return {
    cellAt: (r) => list[o(r)],
    set: (r, s) => {
      let p = o(r);
      if (list[p] !== void 0) list[p] = s;
    },
    rows: () => ne(e.rows).map((r) => list.slice(r * e.columns, (r + 1) * e.columns)),
  };
}
//@ chunk-3s7ydtfd.js:75622-75679 placement
var thinTopGlyph = (e, t) => ({ glyph: t < THIN_TOP_EIGHTHS ? "\u2501" : "\u2580", ink: e.ink });
//@ chunk-3s7ydtfd.js:75679-75754 placement
var LOWER_EIGHTHS = ["", "\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587"];
//@ chunk-3s7ydtfd.js:75754-75784 placement
var BRAILLE_DOT_BITS = [1, 2, 4, 64, 8, 16, 32, 128];
//@ chunk-3s7ydtfd.js:75784-75859 placement
var LEFT_EIGHTHS = ["", "\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589"];
//@ chunk-3s7ydtfd.js:75859-75897 placement
var partRange = (e, t, o) => ({ from: e, to: t, ink: o });
//@ chunk-3s7ydtfd.js:75897-75994 placement
function stackRanges(e, t, o) {
  let r = (s) => t(s) * EIGHTHS;
  return $o(e, r, o).map(({ part: part, end: end }) => partRange(end - r(part), end, part.ink));
}
//@ chunk-3s7ydtfd.js:75994-76330 placement
function drawStack(e, { at: at, width: width, parts: parts }) {
  let ceil = Math.ceil(at.y),
    p = (ceil - at.y) * EIGHTHS,
    m = stackRanges(parts, (f) => f.height, p),
    n = m.at(-1)?.to ?? 0,
    a = new Set();
  for (let f = 0; f < n; f += EIGHTHS) {
    let i = blendEighthGlyph(m, f, LOWER_EIGHTHS);
    if (i === void 0) continue;
    let l = f < p ? thinTopGlyph(i, n - p) : i;
    a.add(l.ink).add(l.background);
    for (let u = 0; u < Math.round(width); u++) e.set({ x: at.x + u, y: ceil - 1 - f / EIGHTHS }, l);
  }
  return parts.every((f) => a.has(f.ink));
}
//@ chunk-3s7ydtfd.js:76330-76557 placement
function drawBar(e, { at: at, width: width, ink: ink, isHatched: isHatched }) {
  let p = LEFT_EIGHTHS[Math.max(1, Math.round(width * EIGHTHS))];
  if (p !== void 0 && !isHatched) {
    e.set(at, { glyph: p, ink: ink });
    return;
  }
  for (let n = 0; n < Math.max(1, Math.round(width)); n++)
    e.set({ x: at.x + n, y: at.y }, { glyph: isHatched ? MEDIUM_SHADE : LOWER_THREE_QUARTERS, ink: ink });
}
//@ chunk-3s7ydtfd.js:76557-76647 placement
var brailleDotBit = (e, t) =>
  BRAILLE_DOT_BITS[
    Math.floor((e - Math.floor(e)) * BRAILLE_COLS) * BRAILLE_ROWS +
      Math.floor((t - Math.floor(t)) * BRAILLE_ROWS)
  ] ?? 0;
//@ chunk-3s7ydtfd.js:76647-76695 placement
var countBits = (e) => BRAILLE_DOT_BITS.reduce((t, o) => ((e & o) === 0 ? t : t + 1), 0);
//@ chunk-3s7ydtfd.js:76695-76727 placement
var hasBitCount = (e) => (t) => countBits(t.bits) === e;
//@ chunk-3s7ydtfd.js:76727-77053 placement
function mergeBrailleCell(e, t) {
  let o = e.lines ?? [],
    r = [
      ...o.filter((m) => m.ink !== t.ink),
      { ink: t.ink, bits: (o.find((m) => m.ink === t.ink)?.bits ?? 0) | t.bits },
    ],
    filtered = r.filter((m) => m.ink !== "quiet"),
    p = filtered.length > 0 ? filtered : r;
  return {
    glyph: String.fromCodePoint(BRAILLE_BASE + p.reduce((m, n) => m | n.bits, 0)),
    ink: p.findLast(hasBitCount(Math.max(...p.map((m) => countBits(m.bits)))))?.ink ?? t.ink,
    lines: r,
  };
}
//@ chunk-3s7ydtfd.js:77053-77408 placement
function drawBrailleLine(e, { points: points, ink: ink }) {
  for (let [r, s] of points.entries()) {
    let p = points[r - 1] ?? s,
      ceil = Math.ceil(Math.max(Math.abs(s.x - p.x) * BRAILLE_COLS, Math.abs(s.y - p.y) * BRAILLE_ROWS, 1));
    for (let n = 0; n <= ceil; n++) {
      let a = p.x + ((s.x - p.x) * n) / ceil,
        f = p.y + ((s.y - p.y) * n) / ceil,
        i = { x: Math.floor(a), y: Math.floor(f) },
        cellAt = e.cellAt(i);
      if (!cellAt || !(cellAt.glyph === BLANK || cellAt === GRID_DOT || cellAt.lines !== void 0)) continue;
      e.set(i, mergeBrailleCell(cellAt, { ink: ink, bits: brailleDotBit(a, f) }));
    }
  }
}
//@ chunk-3s7ydtfd.js:77408-77595 placement
function drawText(e, { at: at, text: text, ink: ink }) {
  let rounded = Math.round(at.x);
  for (let p of Ce(text)) {
    let m = displayWidth(p);
    e.set({ x: rounded, y: at.y }, { glyph: p, ink: ink });
    for (let n = 1; n < m; n++) e.set({ x: rounded + n, y: at.y }, { glyph: "", ink: ink });
    rounded += m;
  }
}
//@ chunk-3s7ydtfd.js:77595-77658 placement
var cellToRun = (e) => ({ text: e.glyph, ink: e.ink, background: e.background });
//@ chunk-3s7ydtfd.js:77658-77883 placement
function rowToRuns(e) {
  let t = [];
  for (let o of e.slice(0, e.findLastIndex((r) => r.glyph !== BLANK) + 1)) {
    let at = t.at(-1);
    at &&
    ((at.ink === o.ink && at.background === o.background) || (o.glyph === BLANK && at.background === void 0))
      ? (at.text += o.glyph)
      : t.push(cellToRun(o));
  }
  return t;
}
//@ chunk-3s7ydtfd.js:77883-77920 placement
var sparkGlyph = (e) => LOWER_EIGHTHS[Math.round(e * EIGHTHS)] ?? FULL_BLOCK;
//@ chunk-3s7ydtfd.js:77920-78608 placement
function rasterizeChart(e) {
  let t = createGlyphGrid(e),
    o = !1,
    r = 0;
  for (let shape of e.shapes)
    switch (shape.kind) {
      case "text": {
        shape.isAboutPartsLeftOut && !o ? (r += 1) : drawText(t, shape);
        break;
      }
      case "bar":
        drawBar(t, shape);
        break;
      case "stack":
        o = !drawStack(t, shape) || o;
        break;
      case "line":
        drawBrailleLine(t, shape);
        break;
      case "strip": {
        let { at: at, heights: heights, ink: ink } = shape;
        heights.forEach((a, f) => {
          if (a !== null) t.set({ x: at.x + f, y: at.y }, { glyph: sparkGlyph(a), ink: ink });
        });
        break;
      }
      case "band": {
        let { at: at, rows: rows, parts: parts } = shape,
          a = stackRanges(parts, (f) => f.width, 0);
        for (let f = 0; f < (a.at(-1)?.to ?? 0); f += EIGHTHS) {
          let i = blendEighthGlyph(a, f, LEFT_EIGHTHS);
          for (let x = 0; i !== void 0 && x < rows; x++) t.set({ x: at.x + f / EIGHTHS, y: at.y + x }, i);
        }
        break;
      }
      case "axisRow": {
        let { at: at, gridWidth: gridWidth } = shape;
        t.set(at, { glyph: axisGlyph(gridWidth), ink: "quiet" });
        for (let n = 1; n < gridWidth; n++) t.set({ x: at.x + n, y: at.y }, GRID_DOT);
        break;
      }
    }
  return t
    .rows()
    .slice(0, e.rows - r)
    .map(rowToRuns);
}
//@ chunk-3s7ydtfd.js:78608-78669 placement
var svgFill = (e, t = "") => `fill="var(--${e})"${t} data-series="${e}"`;
//@ chunk-3s7ydtfd.js:78669-78678 placement
var SVG_HALF = 2;
//@ chunk-3s7ydtfd.js:78678-78689 placement
var SVG_THIN_BAR = 0.7;
//@ chunk-3s7ydtfd.js:78689-78700 placement
var SVG_TEXT_DY = 4.5;
//@ chunk-3s7ydtfd.js:78700-78710 placement
var SVG_ROW_HEIGHT = 18;
//@ chunk-3s7ydtfd.js:78710-78721 placement
var SVG_HALF_CELL = 0.5;
//@ chunk-3s7ydtfd.js:78721-78730 placement
var SVG_COL_WIDTH = 8;
//@ chunk-3s7ydtfd.js:78730-78742 placement
var SVG_FONT_SIZE = 13.3;
//@ chunk-3s7ydtfd.js:78742-78755 placement
var SVG_STROKE = 0.125;
//@ chunk-3s7ydtfd.js:78755-78766 placement
var SVG_BAND_PAD = 0.1;
//@ chunk-3s7ydtfd.js:78766-78796 placement
var svgY = (e) => (e * SVG_ROW_HEIGHT).toFixed(1);
//@ chunk-3s7ydtfd.js:78796-78829 placement
var hasSvgHeight = (e) => svgY(e.height) !== svgY(0);
//@ chunk-3s7ydtfd.js:78829-78858 placement
var svgX = (e) => (e * SVG_COL_WIDTH).toFixed(1);
//@ chunk-3s7ydtfd.js:78858-78891 placement
var svgPoint = (e, t) => `${svgX(e)},${svgY(t)}`;
//@ chunk-3s7ydtfd.js:78891-79008 placement
var svgLine = (e, t, o = "") =>
  `<line${o} x1="${svgX(e.x)}" y1="${svgY(e.y)}" x2="${svgX(t.x)}" y2="${svgY(t.y)}" stroke="var(--quiet)"/>`;
//@ chunk-3s7ydtfd.js:79008-79082 placement = diff (1)
function svgTickLine(e) {
  let t = e.at.x + SVG_HALF_CELL;
  return svgLine({ x: t, y: e.at.y }, { x: t, y: e.at.y + 1 });
}
//@ chunk-3s7ydtfd.js:79082-79187 placement
var bandPartRect = (e, t) => ({
  x: t.end - t.part.width,
  y: e.at.y + SVG_BAND_PAD,
  width: t.part.width,
  height: e.rows - SVG_HALF * SVG_BAND_PAD,
  ink: t.part.ink,
});
//@ chunk-3s7ydtfd.js:79187-79265 placement = unionRect (0.845)
var thinBarRect = (e) => ({
  x: e.at.x,
  y: e.at.y + (1 - SVG_THIN_BAR) / SVG_HALF,
  width: e.width,
  height: SVG_THIN_BAR,
  ink: e.ink,
});

export {
  SVG_HALF_CELL,
  svgLine,
  svgPoint,
  svgX,
  svgY,
  svgFill,
  SVG_STROKE,
  SVG_HALF,
  SVG_BAND_PAD,
  SVG_ROW_HEIGHT,
  SVG_TEXT_DY,
  thinBarRect,
  hasSvgHeight,
  svgTickLine,
  bandPartRect,
  SVG_FONT_SIZE,
  SVG_COL_WIDTH,
  planChartLayout,
  renderLegend,
  rasterizeChart,
  layoutChart,
  Xa,
};
