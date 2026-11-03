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
  uniqueValues,
  formatCountWithUnit,
  MAX_EVENTS,
  groupIndexBy,
  formatCount,
  MAX_COMBINED_SERIES,
  CHART_FORMS,
  elideList,
  takeWhileBudget,
  displayWidth,
  measureLabelWidth,
  rangeIndices,
  truncateMiddle,
  wrapToWidth,
  prefixSums,
  splitGraphemes,
} from "./chartSchema.js";
import {
  firstValue,
  formatSeriesValues,
  logAxisTicks,
  linearAxisTicks,
  summarizeSeries,
} from "./planChart.js";
import { tableSource } from "./readTable.js";
import { tickTextAt, tickStepsFor } from "./timeFormat.js";
import { parseNumberCell } from "./parseValues.js";

//@ chunk-3s7ydtfd.js:54522-54592 placement = AGENT_COLORS (0.646)
/**
 * 队友颜色轮换表。
 */
var AGENT_COLORS = ["blue", "orange", "green", "pink", "teal", "red", "violet", "olive"];
//@ chunk-3s7ydtfd.js:54592-54606 placement
var BLUE = "blue";
//@ chunk-3s7ydtfd.js:54606-54617 placement
/**
 * 100
 */
var MAX_ROW_CHARS = 100;
//@ chunk-3s7ydtfd.js:54617-54627 placement
/**
 * 10
 */
var MAX_ROW_INK = 10;
//@ chunk-3s7ydtfd.js:54627-54636 placement
/**
 * 3
 */
var MIN_BAR_HEIGHT = 3;
//@ chunk-3s7ydtfd.js:54636-54647 placement
/**
 * 0.1
 */
var MIN_BAR_RATIO = 0.1;
//@ chunk-3s7ydtfd.js:54647-54656 placement
/**
 * 2
 */
var MIN_LANE_HEIGHT = 2;
//@ chunk-3s7ydtfd.js:54656-54675 placement
/**
 * 1e-9
 */
var NEGLIGIBLE_VALUE = 0.000000001;
//@ chunk-3s7ydtfd.js:54675-54684 placement
/**
 * 2
 */
var MIN_PLOT_HEIGHT = 2;
//@ chunk-3s7ydtfd.js:54684-54696 placement
/**
 * 8000
 */
var MAX_PLOT_WIDTH = 8000;
//@ chunk-3s7ydtfd.js:54696-54705 placement
/**
 * 2
 */
var MIN_SPARK_ROWS = 2;
//@ chunk-3s7ydtfd.js:54705-54714 placement
/**
 * 2
 */
var MIN_SHARE_SEGS = 2;
//@ chunk-3s7ydtfd.js:54714-54723 placement
/**
 * 1
 */
var MIN_LEGEND_ROWS = 1;
//@ chunk-3s7ydtfd.js:54723-54733 placement
/**
 * 16
 */
var DEFAULT_TABLE_WIDTH = 16;
//@ chunk-3s7ydtfd.js:54733-54743 placement
/**
 * 24
 */
var DEFAULT_TABLE_HEIGHT = 24;
//@ chunk-3s7ydtfd.js:54743-54769 placement
/**
 * 取首个系列的单位
 */
var firstSeriesUnit = (e) => e[0]?.unit ?? "";
//@ chunk-3s7ydtfd.js:54769-54782 placement
/**
 * 红色
 */
var RED = "red";
//@ chunk-3s7ydtfd.js:54782-55209 placement
function pickSeriesColors(e, t, o) {
  let r = stableSum(t);
  let mapped = e.map(firstValue);
  let max = Math.max(...e.map((l) => l.size));
  let m = max === 0 ? 1 : max;
  let filtered = AGENT_COLORS.filter((l) => l !== RED);
  let a = o.measures.length <= filtered.length;
  let f = new Map(a ? returnValue(o.measures, filtered) : []);
  let x =
    o.isSummed && r > 0 && t.every((l) => l >= 0)
      ? formatSeriesValues(
          "%",
          mapped.map((l) => (MAX_ROW_CHARS * l) / r),
        ).map((l) => [["", "", l]])
      : mapped.map(() => []);
  return returnValue(e, returnValue(formatSeriesValues(firstSeriesUnit(e), mapped), x)).map(
    ([l, [u, d]]) => ({
      key: "",
      name: l.name,
      stats: [["", u, ""], ...d],
      ink: firstValue(l) < 0 ? RED : (f.get(l.measure) ?? BLUE),
      relativeLength: firstValue(l) / m,
    }),
  );
}
//@ chunk-3s7ydtfd.js:55209-55232 placement
/**
 * 柱状图合计行
 */
var TOTAL_ROW = {
  key: "",
  ink: BLUE,
};
//@ chunk-3s7ydtfd.js:55232-55343 placement
/**
 * 柱状图的合计行。
 */
var totalRow = (e, t) => ({
  ...TOTAL_ROW,
  name: "total",
  stats: [
    [
      "",
      formatSeriesValues(firstSeriesUnit(e), [stableSum(t)], {
        peers: e.map(firstValue),
      })[0] ?? "",
      "",
    ],
  ],
  relativeLength: 0,
});
//@ chunk-3s7ydtfd.js:55343-55675 placement
function describeBarsLimit(e) {
  let t = e.request.combine === "sum";
  let r =
    e.request.top !== undefined || e.selection.cutSeries.length > 0 ? e.selection.topSeries : e.allSeries;
  let flattened = e.allSeries.flatMap((n) => n.values);
  let p = pickSeriesColors(r, flattened, {
    isSummed: t,
    measures: uniqueValues(e.allSeries.map((n) => n.measure)),
  });
  let rows = t ? [...p, totalRow(r, flattened)] : p;
  return {
    form: "bars",
    header: e.frame.header,
    rows,
    notes: e.frame.notes,
  };
}
//@ chunk-3s7ydtfd.js:55675-55814 placement
/**
 * 给系列补上非空值列表与最大绝对值。
 */
function withSeriesValues(e) {
  let filtered = e.samples.map((sample) => sample.value).filter((o) => o !== null);
  return {
    ...e,
    values: filtered,
    size: Math.max(...filtered.map(Math.abs)),
    isOthers: false,
  };
}
//@ chunk-3s7ydtfd.js:55814-55856 placement
/**
 * 名字用逗号拼接
 */
var joinNames = (e) => e.map((t) => t.name).join(", ");
//@ chunk-3s7ydtfd.js:55856-55935 placement
/**
 * “这是最大值”/“这 N 个最大”
 */
function largestNote(drawnAloneCount) {
  return drawnAloneCount === 1 ? "this is the largest" : `these are the ${drawnAloneCount} largest`;
}
//@ chunk-3s7ydtfd.js:55935-56441 placement
function describeGroupedOthers(e) {
  let t = e.cutSeries.length;
  if (t === 0) return [];
  let o = e.form === "bars" && t >= MAX_ROW_INK * e.drawnAloneCount;
  let r = t <= MIN_BAR_HEIGHT;
  let s =
    `${formatCountWithUnit(e.form, t)} ` +
    (e.isRestDrawnAsOne ? "drawn as one" : "not shown") +
    (r ? ` (${joinNames(e.cutSeries)})` : "") +
    `: ${largestNote(e.drawnAloneCount)} of ` +
    (e.drawnAloneCount + t).toLocaleString("en-US") +
    (o ? ". For a distribution, pass counts per range" : "");
  return e.top !== undefined && e.top > e.formLimit
    ? [
        s,
        `top ${e.top}: a chart draws at most ${formatCountWithUnit(e.form, e.formLimit)}` +
          (e.isRestDrawnAsOne ? ", and the rest as one" : ""),
      ]
    : [s];
}
//@ chunk-3s7ydtfd.js:56441-56717 placement
/**
 * 按单位与量级把系列分组到同一坐标轴。
 */
function groupSeriesByScale(drawnSeries, t) {
  let o = [];
  let r = new Map();
  let s = [];
  for (let p of drawnSeries) {
    let m = r.get(p.unit) ?? o.length;
    let n = o[m];
    if (n !== undefined && (t || p.size === 0 || n.size <= p.size * MAX_EVENTS)) s.push(m);
    else {
      r.set(p.unit, o.length);
      s.push(o.length);
      o.push(p);
    }
  }
  return [...groupIndexBy(returnValue(drawnSeries, s), (p) => p[1]).values()].map((p) => p.map((m) => m[0]));
}
//@ chunk-3s7ydtfd.js:56717-56776 placement
/**
 * 图的标题/事实/来源
 */
var plotFrame = (e, t, facts) => ({
  title: t.title ?? "",
  facts,
  source: tableSource(e),
});
//@ chunk-3s7ydtfd.js:56776-56961 placement
/**
 * 按时刻求各系列之和。
 */
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
      return {
        ms: t,
        value: filtered.length > 0 ? stableSum(filtered) : null,
      };
    });
//@ chunk-3s7ydtfd.js:56961-57038 placement
/**
 * 同一时刻求和的系列
 */
var sumSeries = (e, name) =>
  withSeriesValues({
    unit: firstSeriesUnit(e),
    name,
    measure: e[0]?.measure ?? "",
    samples: sumSamplesByTime(e),
  });
//@ chunk-3s7ydtfd.js:57038-57358 placement
function describeTotalColumn(e, plural) {
  if (e.length <= MIN_LANE_HEIGHT) return [];
  let o = new Map(sumSeries(e, "").samples.map(({ ms, value: p }) => [ms, p]));
  let r = ({ ms, value: p }) =>
    p !== null && Math.abs(MIN_PLOT_HEIGHT * p - (o.get(ms) ?? 0)) <= NEGLIGIBLE_VALUE * Math.abs(p);
  return e
    .filter((s) => s.size > 0 && s.samples.every(r))
    .map((s) => `${s.name} equals the sum of the other ${plural}: if it is their total, leave it out`);
}
//@ chunk-3s7ydtfd.js:57358-57491 placement
/**
 * 系列峰值所在时刻的标签。
 */
function peakTimeLabel(e, t) {
  let o = {
    ms: 0,
    value: -1 / 0,
  };
  for (let { ms, value: s } of e.samples)
    if (s !== null && s > o.value)
      o = {
        ms,
        value: s,
      };
  return tickTextAt(t, o.ms);
}
//@ chunk-3s7ydtfd.js:57491-57607 placement
/**
 * “total max X at T” 说明。
 */
function totalPeakNote(e, timeline) {
  let o = sumSeries(e, "total");
  let [r = ""] = formatSeriesValues(o.unit, [Math.max(...o.values)]);
  return `total max ${r} at ${peakTimeLabel(o, timeline)}`;
}
//@ chunk-3s7ydtfd.js:57607-57640 placement
/**
 * 按名字比较
 */
var byName = (e, t) => (e.name < t.name ? -1 : 1);
//@ chunk-3s7ydtfd.js:57640-57698 placement
/**
 * 合并出的 “N others”
 */
var othersSeries = (e) => ({
  ...sumSeries(e, `${e.length} others`),
  isOthers: true,
});
//@ chunk-3s7ydtfd.js:57698-57922 placement
/**
 * 按大小选前若干系列，其余合并为 “others”。
 */
function pickTopSeries(e, t, o) {
  let sliced = e
    .toSorted((m, n) => (m.size !== n.size ? n.size - m.size : byName(m, n)))
    .slice(0, o && e.length === t + 1 ? t + 1 : t);
  let filtered = e.filter((m) => !sliced.includes(m));
  let p = o && filtered.length > 0;
  return {
    topSeries: sliced,
    cutSeries: filtered,
    drawnSeries: p ? [...sliced, othersSeries(filtered)] : sliced,
  };
}
//@ chunk-3s7ydtfd.js:57922-57950 placement
/**
 * 弱化样式行
 */
var QUIET_ROW = {
  key: "",
  ink: "quiet",
};
//@ chunk-3s7ydtfd.js:57950-58009 placement
var mapped = returnValue([..."abcdefgh"], AGENT_COLORS).map(([e, t]) => ({
  key: e,
  ink: t,
}));
//@ chunk-3s7ydtfd.js:58009-58267 placement
/**
 * 占比图布局（各项份额与颜色）。
 */
function layoutShareChart(e, t, o) {
  let flattened = o.flatMap((m) => m.values);
  let s = new Map(returnValue(t.topSeries, mapped));
  let rows = returnValue(
    pickSeriesColors(t.drawnSeries, flattened, {
      isSummed: true,
      measures: [],
    }),
    t.drawnSeries,
  ).map(([m, n]) => ({
    ...m,
    ...(s.get(n) ?? QUIET_ROW),
    share: firstValue(n) / stableSum(flattened),
  }));
  return {
    form: "share",
    header: e.header,
    rows,
    notes: e.notes,
  };
}
//@ chunk-3s7ydtfd.js:58267-58351 placement
/**
 * 迷你图结果对象
 */
var sparksFrame = (e, rows, medianStep) => ({
  form: "sparks",
  header: e.header,
  rows,
  medianStep,
  notes: e.notes,
});
//@ chunk-3s7ydtfd.js:58351-58511 placement
/**
 * 缺失样本的说明。
 */
function missingSampleNotes(e) {
  let t = stableSum(e.map((r) => r.samples.length - r.values.length));
  return t > 0 ? [`${formatCount(t, "missing sample")}, left blank where the gap is wide enough to see`] : [];
}
//@ chunk-3s7ydtfd.js:58511-58612 placement
/**
 * 列图的行（名称、统计、线段）。
 */
var toColumnRow =
  (e, t) =>
  ([o, [r, s]]) => ({
    ...e.identityOf(o),
    name: o.name,
    stats: s,
    stretches: r.map((p) => p.map(t)),
  });
//@ chunk-3s7ydtfd.js:58612-58667 placement
/**
 * 折线的坐标函数
 */
var linePoint = (e, t) => (o) => ({
  x: e(o.ms),
  y: t.positionOf(o.top),
});
//@ chunk-3s7ydtfd.js:58667-59164 placement
function summarizeSparkStat({ seriesOfPlot, axisValues, timeline, isSummed }) {
  let s = firstSeriesUnit(seriesOfPlot);
  let mapped = seriesOfPlot.map((l) => l.values);
  let m = (l) =>
    formatSeriesValues(s, l, {
      peers: axisValues,
      minWritten: MIN_LEGEND_ROWS,
    });
  let n = m(mapped.map((l) => Math.max(...l)));
  let a = m(mapped.map((l) => l.at(-1) ?? 0));
  let f = m(mapped.map((l) => Math.min(...l)));
  let i = m(mapped.map((l) => stableSum(l) / l.length));
  let x = formatSeriesValues(s, mapped.map(stableSum));
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
//@ chunk-3s7ydtfd.js:59164-59283 placement
/**
 * 坐标轴上下文（系列映射、值、时间线、是否求和）。
 */
var axisContext = (e, axisValues) => ({
  seriesOfPlot: e.seriesOfPlot,
  axisValues,
  timeline: e.data.timeline,
  isSummed: e.request.combine === "sum",
});
//@ chunk-3s7ydtfd.js:59283-59827 placement
function layoutColumns(e) {
  let t = e.data.form === "columns";
  let o = new Map();
  let r = [];
  for (let f of e.seriesOfPlot) {
    let i = [];
    let x = [];
    for (let sample of f.samples)
      if (sample.value === null) {
        i.push(x);
        x = [];
      } else {
        let u = (t ? (o.get(sample.ms) ?? 0) : 0) + sample.value;
        o.set(sample.ms, u);
        x.push({
          ms: sample.ms,
          top: u,
        });
      }
    i.push(x);
    r.push(i.filter((l) => l.length > 0));
  }
  let axisValues = r.flat(MIN_SPARK_ROWS).map((f) => f.top);
  let p = firstSeriesUnit(e.seriesOfPlot);
  let m = [t ? 0 : Math.min(...axisValues), Math.max(...axisValues)];
  let a =
    e.request.log === true
      ? logAxisTicks(p, m, e.maxAxisSteps)
      : linearAxisTicks(summarizeSeries(p, axisValues), m, e.maxAxisSteps);
  return {
    ticks: a.ticks,
    rows: returnValue(e.seriesOfPlot, returnValue(r, summarizeSparkStat(axisContext(e, axisValues)))).map(
      toColumnRow(e, linePoint(tickStepsFor(e.data.timeline), a)),
    ),
  };
}
//@ chunk-3s7ydtfd.js:59827-59861 placement
/**
 * 单图 5 个系列、多图 2 个
 */
var PLOT_LIMITS = {
  onePlot: 5,
  severalPlots: 2,
};
//@ chunk-3s7ydtfd.js:59861-60312 placement
function describeStretch({ topSeries, frame: { header, notes }, request, data: s }) {
  let { ticks, rows } = layoutColumns({
    seriesOfPlot: topSeries,
    identityOf: () => TOTAL_ROW,
    maxAxisSteps: PLOT_LIMITS.onePlot,
    request,
    data: s,
  });
  let n = tickStepsFor(s.timeline);
  let a = topSeries
    .flatMap((f) => {
      let mapped = f.samples.map((sample) => n(sample.ms));
      return returnValue(mapped, mapped.slice(1)).map(([x, l]) => l - x);
    })
    .toSorted((f, i) => f - i);
  return sparksFrame(
    {
      header: {
        ...header,
        facts: [...header.facts, `each from ${ticks[0]?.label} to ${ticks.at(-1)?.label}`],
      },
      notes: [...notes, ...missingSampleNotes(topSeries)],
    },
    rows,
    a[Math.floor(a.length / MIN_SHARE_SEGS)] ?? 1,
  );
}
//@ chunk-3s7ydtfd.js:60312-60484 placement
/**
 * 多条折线在同一列靠得太近。
 */
function hasCrowdedLines(e) {
  let t = new Map();
  for (let o of e.rows.flatMap((r) => r.stretches.flat())) {
    let r = o.y - (t.get(o.x) ?? 0);
    if (e.rows.length > 1 && r > 0 && r < MIN_BAR_RATIO) return true;
    t.set(o.x, o.y);
  }
  return false;
}
//@ chunk-3s7ydtfd.js:60484-60803 placement
/**
 * 按请求里 y 的顺序排列系列分组。
 */
function orderSeriesByRequest(e, t, request) {
  let mapped = t.series.map((a) => a.name);
  let mapped_2 = (request.y ?? []).map((a) => a.toLowerCase());
  if (!(
    mapped.length > 1 &&
    mapped.every((a) => mapped_2.includes(a.toLowerCase())) &&
    e.flat().length === mapped.length
  ))
    return e;
  let m = (a) => mapped.indexOf(a.name);
  let n = (a) => Math.min(...a.map(m));
  return e.map((a) => a.toSorted((f, i) => m(f) - m(i))).toSorted((a, f) => n(a) - n(f));
}
//@ chunk-3s7ydtfd.js:60803-60892 placement
/**
 * 时间刻度标签
 */
function tickLabelFor(timeline) {
  let t = tickStepsFor(timeline);
  return (o) => ({
    position: t(o.ms),
    when: tickTextAt(timeline, o.ms),
    label: o.label,
  });
}
//@ chunk-3s7ydtfd.js:60892-61942 placement
/**
 * 把序列分配到一个或多个图（同单位共享，柱状最多若干组）。
 */
function layoutPlots(e) {
  let t = e.data.form === "columns";
  let o = orderSeriesByRequest(e.groups.slice(0, MAX_COMBINED_SERIES), e.data, e.request);
  let r = o.flat();
  let s = e.groups.slice(MAX_COMBINED_SERIES).flat();
  let p = new Map(
    returnValue(
      r.filter((T) => !T.isOthers),
      r.length > 1 ? mapped : [TOTAL_ROW],
    ),
  );
  let identityOf = (T) => p.get(T) ?? QUIET_ROW;
  let maxAxisSteps = PLOT_LIMITS[o.length > 1 ? "severalPlots" : "onePlot"];
  let mapped_2 = o.map((seriesOfPlot) =>
    layoutColumns({
      seriesOfPlot,
      identityOf,
      maxAxisSteps,
      request: e.request,
      data: e.data,
    }),
  );
  let f = e.data.timeline.periodStarts.length;
  let i = r.length > o.length;
  let x = `${f} columns do not fit, so they are drawn as ${i ? "lines, one for each series" : "a line"}`;
  let l = s.length > 0;
  let u = f > DEFAULT_TABLE_HEIGHT;
  let d = t && mapped_2.some(hasCrowdedLines);
  let notes = [
    ...e.frame.notes,
    ...(l
      ? [
          `${formatCountWithUnit(e.data.form, s.length)} not shown (${joinNames(s)}): a chart has at most ${MAX_COMBINED_SERIES} plots`,
        ]
      : []),
    ...missingSampleNotes(r),
  ];
  let modelOnlyNotes = [
    ...(u ? [`on a screen under about ${f + DEFAULT_TABLE_WIDTH} characters wide, ${x}`] : []),
    ...(d ? ["in a terminal, parts of a column thinner than a row may not show"] : []),
  ];
  return {
    form: t ? "columns" : "line",
    header: e.frame.header,
    plots: mapped_2,
    timeline: e.data.timeline,
    marks: e.data.marks.map(tickLabelFor(e.data.timeline)),
    notes,
    mergedColumnsNote: x,
    thinPartsNote: "the thinnest parts of a column are too thin to show here",
    modelOnlyNotes,
  };
}
//@ chunk-3s7ydtfd.js:61942-62983 placement
/**
 * 决定绘制方式（合并、对数刻度、序列上限）。
 */
function planChartLayout(e, t) {
  let o = t.combine === "sum";
  let r = e.form === "columns" && !o;
  let mapped = e.series.map(withSeriesValues);
  let p =
    e.form === "share" ||
    (e.form === "columns" && o && mapped.every((l) => l.unit === firstSeriesUnit(mapped)));
  let m = r ? MAX_COMBINED_SERIES : CHART_FORMS[e.form].maxCount;
  let n = pickTopSeries(mapped, Math.min(t.top ?? CHART_FORMS[e.form].defaultCount, m), p);
  let a = e.hasCombinedRows && !o;
  let f = e.form === "columns" && p && mapped.length > 1;
  let header = plotFrame(e, t, [
    ...(e.subject === "" ? [] : [e.subject]),
    ...e.timeline.spanLabels,
    ...(t.log ? ["log scale"] : []),
    ...(a ? [`rows combined by ${t.combine}`] : []),
    ...(f ? [totalPeakNote(mapped, e.timeline)] : []),
  ]);
  let notes = [
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
        frame: {
          header,
          notes,
        },
        selection: n,
        allSeries: mapped,
        request: t,
      });
    case "share":
      return layoutShareChart(
        {
          header,
          notes,
        },
        n,
        mapped,
      );
    case "sparks":
      return describeStretch({
        topSeries: n.topSeries,
        frame: {
          header,
          notes,
        },
        request: t,
        data: e,
      });
    case "line":
    case "columns":
      return layoutPlots({
        groups: r
          ? n.topSeries.map((l) => [l])
          : groupSeriesByScale(n.drawnSeries, e.form === "columns" || t.log === true),
        frame: {
          header,
          notes,
        },
        request: t,
        data: e,
      });
  }
}
//@ chunk-3s7ydtfd.js:62983-63070 placement
/**
 * 标记点文本
 */
function markLabel(e) {
  return e.label !== "" ? `mark at ${e.when}: ${e.label}` : `mark at ${e.when}`;
}
//@ chunk-3s7ydtfd.js:63070-63137 placement
/**
 * 汇总注释
 */
var allNotes = (e) => ("plots" in e ? [...e.notes, ...e.modelOnlyNotes] : e.notes);
//@ chunk-3s7ydtfd.js:63137-63153 placement = SEP_WIDTH (1)
var SEP_WIDTH = " \xB7 ";
//@ chunk-3s7ydtfd.js:63153-63217 placement
/**
 * 带引号的标题
 */
var quotedPlotTitle = (header) => (header.title === "" ? "" : ` "${header.title.replaceAll('"', "'")}"`);
//@ chunk-3s7ydtfd.js:63217-63725 placement
function renderLegend(e) {
  let joined = [
    `${CHART_FORMS[e.form].label}` + quotedPlotTitle(e.header),
    ...e.header.facts,
    `from ${e.header.source}`,
  ].join(SEP_WIDTH);
  let mapped = ("plots" in e ? e.plots.flatMap((plot) => plot.rows) : e.rows).map((s) => {
    let p = "stretches" in s ? s.stretches.flat().length : 0;
    return (
      `- ${s.name}: ` +
      [
        ...s.stats.map((stat) => stat.filter((n) => n !== "").join(" ")),
        ...(p > 0 ? [formatCount(p, "point")] : []),
      ].join(SEP_WIDTH)
    );
  });
  let r = [
    ...("plots" in e ? e.marks : []).map((s) => markLabel(s)),
    ...allNotes(e).map((s) => `note: ${s}`),
  ];
  return [
    joined,
    ...elideList(
      mapped,
      takeWhileBudget(
        mapped,
        MAX_PLOT_WIDTH -
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
/**
 * 展示名数量相符
 */
var hasExactlyNames = (e) => (t) => new Set(t.shownNames.values()).size === e;
//@ chunk-3s7ydtfd.js:63782-63876 placement
/**
 * 是否还有空间
 */
var hasRoomFor = (rowLayout, t, o) => (r, s) => {
  let p = s < rowLayout.lane.statsBeforeNames;
  return rowLayout.widthPastKey - r.end >= (p ? t : o);
};
//@ chunk-3s7ydtfd.js:63876-63885 placement
/**
 * 2
 */
var MIN_LANE_GAP = 2;
//@ chunk-3s7ydtfd.js:63885-63894 placement
/**
 * 4
 */
var KEY_COLUMN_WIDTH = 4;
//@ chunk-3s7ydtfd.js:63894-63903 placement
/**
 * 2
 */
var MIN_STATS_WIDTH = 2;
//@ chunk-3s7ydtfd.js:63903-63912 placement
/**
 * 2
 */
var MIN_LANE_WIDTH = 2;
//@ chunk-3s7ydtfd.js:63912-63925 placement
/**
 * 0.125
 */
var BAR_FRACTION = 0.125;
//@ chunk-3s7ydtfd.js:63925-63936 placement
/**
 * 0.5
 */
var HALF = 0.5;
//@ chunk-3s7ydtfd.js:63936-63949 placement
/**
 * 0.125
 */
var BAR_GAP_FRACTION = 0.125;
//@ chunk-3s7ydtfd.js:63949-63958 placement
/**
 * 2
 */
var MIN_SEGMENT = 2;
//@ chunk-3s7ydtfd.js:63958-63969 placement
/**
 * 0.4
 */
var SHARE_MIN_FRACTION = 0.4;
//@ chunk-3s7ydtfd.js:63969-63978 placement
/**
 * 8
 */
var MAX_LEGEND_ENTRIES = 8;
//@ chunk-3s7ydtfd.js:63978-63987 placement
/**
 * 2
 */
var LANE_WIDTH_DIVISOR = 2;
//@ chunk-3s7ydtfd.js:63987-63996 placement
/**
 * 1
 */
var TITLE_ROW_INDEX = 1;
//@ chunk-3s7ydtfd.js:63996-64006 placement
/**
 * 40
 */
var MIN_PLOT_WIDTH = 40;
//@ chunk-3s7ydtfd.js:64006-64016 placement
/**
 * 16
 */
var AXIS_LABEL_INDENT = 16;
//@ chunk-3s7ydtfd.js:64016-64025 placement
/**
 * 8
 */
var MIN_AXIS_WIDTH = 8;
//@ chunk-3s7ydtfd.js:64025-64034 placement
/**
 * 2
 */
var MIN_CHART_WIDTH = 2;
//@ chunk-3s7ydtfd.js:64034-64043 placement
/**
 * 1
 */
var MIN_ROWS_TO_DRAW = 1;
//@ chunk-3s7ydtfd.js:64043-64058 placement
/**
 * 1048576
 */
var BAR_SCALE = 1048576;
//@ chunk-3s7ydtfd.js:64058-64069 placement
/**
 * 0.5
 */
var MARK_FRACTION = 0.5;
//@ chunk-3s7ydtfd.js:64069-64078 placement
/**
 * 2
 */
var MIN_MARK_ROWS = 2;
//@ chunk-3s7ydtfd.js:64078-64087 placement
/**
 * 1
 */
var MIN_LEGEND_COLUMN = 1;
//@ chunk-3s7ydtfd.js:64087-64096 placement
/**
 * 1
 */
var DEFAULT_ROW_OPTIONS = 1;
//@ chunk-3s7ydtfd.js:64096-64385 placement
/**
 * 行布局的输入（名称是否已在标题中、缩进、键宽）。
 */
function prepareRowLayout(e) {
  let t = e.rows.length === 1 ? e.rows[0] : undefined;
  let o = t !== undefined && e.headerTexts.includes(t.name);
  let s = e.rows.some((p) => p.key) ? MIN_SEGMENT : 0;
  return {
    rows: e.rows,
    lane: e.lane,
    fullNames: o ? [] : e.rows.map((p) => p.name),
    isNamedInHeader: o,
    indent: Math.max(0, e.left - MIN_LANE_GAP),
    keyWidth: s,
    widthPastKey: e.columns - s - MIN_LANE_GAP,
  };
}
//@ chunk-3s7ydtfd.js:64385-64421 placement
/**
 * 最长显示宽度
 */
var maxDisplayWidth = (e) => Math.max(0, ...e.map(displayWidth));
//@ chunk-3s7ydtfd.js:64421-64484 placement
/**
 * 计算列位置
 */
var columnPositions = (e, lane, o) =>
  o ? Math.min(Math.floor(e / LANE_WIDTH_DIVISOR), e - lane.minWidth - DEFAULT_ROW_OPTIONS) : e;
//@ chunk-3s7ydtfd.js:64484-64851 placement
/**
 * 计算行的列位置：名称、色道、统计列。
 */
function computeRowLayout(rowLayout, t) {
  let o = rowLayout.lane.minWidth > 0;
  let r = rowLayout.widthPastKey - (t.at(-1)?.end ?? 0);
  let s = o && r >= MAX_LEGEND_ENTRIES + rowLayout.lane.minWidth;
  let p = measureLabelWidth(rowLayout.fullNames, columnPositions(r, rowLayout.lane, s));
  let m = rowLayout.isNamedInHeader ? Math.min(rowLayout.indent, r) : maxDisplayWidth(p);
  let n = s ? r - m - DEFAULT_ROW_OPTIONS : 0;
  let a = rowLayout.keyWidth + m + (s ? DEFAULT_ROW_OPTIONS + n : 0);
  return {
    wantsLane: o,
    keyWidth: rowLayout.keyWidth,
    shownNames: new Map(returnValue(rowLayout.rows, p)),
    laneLeft: rowLayout.keyWidth + m + DEFAULT_ROW_OPTIONS,
    laneWidth: n,
    statsLeft: a > 0 ? a + MIN_LANE_GAP : 0,
    statColumns: t,
  };
}
//@ chunk-3s7ydtfd.js:64851-64972 placement
/**
 * 名称列的最小宽度。
 */
var minNameWidth = (rowLayout, columns) =>
  Math.max(
    Math.min(
      rowLayout.isNamedInHeader ? rowLayout.indent : maxDisplayWidth(rowLayout.fullNames),
      columns * SHARE_MIN_FRACTION,
    ),
    rowLayout.lane.minWidth > 0 ? MAX_LEGEND_ENTRIES + rowLayout.lane.minWidth : 0,
  );
//@ chunk-3s7ydtfd.js:64972-64987 placement
var COLUMN_INDEXES = [0, 1, 2];
//@ chunk-3s7ydtfd.js:64987-65041 placement
var maxStatsLength = (rows) => Math.max(0, ...rows.map((t) => t.stats.length));
//@ chunk-3s7ydtfd.js:65041-65247 placement = rollFrom (0.363)
function layoutStatColumns(rows) {
  let t = [];
  let o = -MIN_LANE_GAP;
  for (let r of rangeIndices(maxStatsLength(rows))) {
    o += MIN_LANE_GAP - DEFAULT_ROW_OPTIONS;
    let s = [];
    for (let p of COLUMN_INDEXES) {
      let rarity = maxDisplayWidth(rows.map((n) => n.stats[r]?.[p] ?? ""));
      o += rarity > 0 ? DEFAULT_ROW_OPTIONS + rarity : 0;
      s.push({
        start: o - rarity,
        width: rarity,
      });
    }
    t.push({
      parts: s,
      end: o,
    });
  }
  return t;
}
//@ chunk-3s7ydtfd.js:65247-65487 placement
/**
 * 选择能放下的统计列数并计算行布局。
 */
function layoutRows(e) {
  let rowLayout = prepareRowLayout(e);
  let filtered = layoutStatColumns(e.rows).filter(
    hasRoomFor(
      rowLayout,
      Math.min(maxDisplayWidth(rowLayout.fullNames), MAX_LEGEND_ENTRIES),
      minNameWidth(rowLayout, e.columns),
    ),
  );
  return (
    rangeIndices(Math.max(0, filtered.length - e.lane.statsBeforeNames) + 1)
      .map((r) => computeRowLayout(rowLayout, filtered.slice(0, filtered.length - r)))
      .find(hasExactlyNames(new Set(rowLayout.fullNames).size)) ?? computeRowLayout(rowLayout, filtered)
  );
}
//@ chunk-3s7ydtfd.js:65487-65540 placement
/**
 * 带色道的行布局
 */
var laneFrame = (shapes, t, laneLeft) => ({
  shapes,
  rows: t + 1,
  lane: {
    x: laneLeft,
    y: t,
  },
});
//@ chunk-3s7ydtfd.js:65540-65621 placement
/**
 * 文字图形
 */
var textShape = (e) => ({
  kind: "text",
  at: e.at,
  text: e.text,
  ink: e.ink,
  isAboutPartsLeftOut: false,
});
//@ chunk-3s7ydtfd.js:65621-65672 placement
/**
 * 空白文本返回空数组
 */
function textShapeOrEmpty(e) {
  return e.text.trim() === "" ? [] : [textShape(e)];
}
//@ chunk-3s7ydtfd.js:65672-65707 placement
/**
 * 名字前留白
 */
var keyPadding = (e, t, o) => (t > 0 ? e.width - displayWidth(o) : 0);
//@ chunk-3s7ydtfd.js:65707-65747 placement
/**
 * 名称的颜色
 */
var nameInk = (e, t) => (e.wantsLane ? "title" : t.ink);
//@ chunk-3s7ydtfd.js:65747-65786 placement
/**
 * 统计列的颜色
 */
var statInk = (e, t, o) => (o === TITLE_ROW_INDEX ? nameInk(e, t) : "quiet");
//@ chunk-3s7ydtfd.js:65786-66149 placement
/**
 * 画一行的键、名称与统计值。
 */
function drawRowLabels(e, t, o) {
  let shapes = [
    ...textShapeOrEmpty({
      at: {
        x: 0,
        y: o,
      },
      text: t.key,
      ink: t.ink,
    }),
    ...textShapeOrEmpty({
      at: {
        x: e.keyWidth,
        y: o,
      },
      text: e.shownNames.get(t) ?? "",
      ink: e.wantsLane ? "words" : "title",
    }),
  ];
  for (let [s, p] of e.statColumns.entries())
    for (let [m, n] of p.parts.entries()) {
      let a = t.stats[s]?.[m] ?? "";
      shapes.push(
        ...textShapeOrEmpty({
          at: {
            x: e.statsLeft + n.start + keyPadding(n, m, a),
            y: o,
          },
          text: a,
          ink: statInk(e, t, m),
        }),
      );
    }
  return laneFrame(shapes, o, e.laneLeft);
}
//@ chunk-3s7ydtfd.js:66149-66188 placement
/**
 * 默认列布局
 */
var DEFAULT_LANE_OPTIONS = {
  minWidth: 0,
  statsBeforeNames: 1,
};
//@ chunk-3s7ydtfd.js:66188-66227 placement
/**
 * 最窄列布局
 */
var MIN_LANE_OPTIONS = {
  minWidth: 8,
  statsBeforeNames: 1,
};
//@ chunk-3s7ydtfd.js:66227-66360 placement
/**
 * 柱形（宽度按相对长度，负值加斜线）。
 */
var barShape = (at, t, o) => ({
  kind: "bar",
  at,
  width: Math.max(BAR_GAP_FRACTION, Math.abs(t.relativeLength) * o.laneWidth),
  ink: t.ink,
  isHatched: t.relativeLength < 0,
});
//@ chunk-3s7ydtfd.js:66360-66605 placement
/**
 * 画柱状图的各行。
 */
function drawBarRows(e, rows, headerTexts) {
  let r = layoutRows({
    rows,
    columns: e.columns,
    lane: MIN_LANE_OPTIONS,
    headerTexts,
    left: 0,
  });
  return {
    shapes: rows.flatMap((s, p) => {
      let m = drawRowLabels(r, s, e.rows + p);
      return s.relativeLength !== 0 && r.laneWidth > 0 ? [...m.shapes, barShape(m.lane, s, r)] : m.shapes;
    }),
    rows: e.rows + rows.length,
  };
}
//@ chunk-3s7ydtfd.js:66605-66637 placement
/**
 * 按精度取整
 */
var roundToScale = (e) => Math.round(e * BAR_SCALE) / BAR_SCALE;
//@ chunk-3s7ydtfd.js:66637-66681 placement
/**
 * 键标记
 */
var laneKeyMark = (e, row) => ({
  key: e.key,
  ink: e.ink,
  row,
});
//@ chunk-3s7ydtfd.js:66681-66770 placement
/**
 * 最后一个伸展段的标记
 */
function lastStretchMark(e, t) {
  let last = e.stretches.at(-1)?.at(-1);
  return last ? [laneKeyMark(e, Math.floor(t(last.y)))] : [];
}
//@ chunk-3s7ydtfd.js:66770-66841 placement
/**
 * 按行分组标记
 */
var groupMarksByRow = (e, t) =>
  groupIndexBy(
    e.filter((o) => o.key).flatMap((o) => lastStretchMark(o, t)),
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
    Math.min(
      rowsPerTick(CHART_ROW_DENSITIES.at(e - 1) ?? Math.min(...CHART_ROW_DENSITIES), t),
      KEY_COLUMN_WIDTH,
    ),
  );
//@ chunk-3s7ydtfd.js:66964-67030 placement
var ticksInRange = (e, t, o) => e.ticks.filter((tick) => tick.position >= t && tick.position <= o);
//@ chunk-3s7ydtfd.js:67030-67227 placement
function unstackColumnRows(rows) {
  let t = new Map();
  let o = [];
  for (let r of rows) {
    o.push({
      ...r,
      stretches: r.stretches.map((stretch) =>
        stretch.map((p) => ({
          x: p.x,
          y: p.y - (t.get(p.x) ?? 0),
        })),
      ),
    });
    for (let stretch of r.stretches.flat()) t.set(stretch.x, stretch.y);
  }
  return o;
}
//@ chunk-3s7ydtfd.js:67227-67610 placement
function layoutPlotRows(plot, t, o) {
  let r = t.form === "columns";
  let s = r && !o ? unstackColumnRows(plot.rows) : plot.rows;
  let mapped = s.flatMap((T) => T.stretches.flat()).map((T) => T.y);
  let m = r ? 0 : Math.min(...mapped);
  let max = Math.max(...mapped);
  let a = plot.ticks.length - 1;
  let f = ticksInRange(plot, m, max).length >= MIN_STATS_WIDTH;
  let i = f ? m : 0;
  let x = f ? max : 1;
  let u = max > m ? chartRowScale(t.plots.length, (x - i) * a) : 1;
  let d = (T) => roundToScale((1 - T) * a * u);
  let c = (T) => Math.round(d(T));
  let g = (T) => HALF + d(T) - c(x);
  return {
    ...plot,
    rows: s,
    yOf: g,
    height: c(i) - c(x) + 1,
    endKeys: groupMarksByRow(o ? [] : s, g),
  };
}
//@ chunk-3s7ydtfd.js:67610-67674 placement
function keyColumnWidth(plots) {
  return plots.some((o) => o.rows.some((r) => r.key)) ? MIN_SEGMENT : 0;
}
//@ chunk-3s7ydtfd.js:67674-67787 placement
function endKeysWidth(e) {
  let max = Math.max(0, ...e.flatMap((o) => [...o.endKeys.values()]).map((o) => o.length));
  return max > 0 ? DEFAULT_ROW_OPTIONS + max : 0;
}
//@ chunk-3s7ydtfd.js:67787-67952 placement
function columnAreaLayout(e, t, o) {
  let max = Math.max(1, t - 1);
  let s = (m) => e + Math.floor(roundToScale(m * o)) * t;
  let tickXOf = (m) => Math.min(s(m), s((o - 1) / o)) + max / MIN_LANE_WIDTH;
  return {
    left: e,
    width: t * o,
    columnWidth: max,
    xOf: s,
    tickXOf,
  };
}
//@ chunk-3s7ydtfd.js:67952-68044 placement
function continuousAreaLayout(e, t) {
  let o = (r) => e + r * (t - HALF);
  return {
    left: e,
    width: t,
    columnWidth: 0,
    xOf: o,
    tickXOf: o,
  };
}
//@ chunk-3s7ydtfd.js:68044-68179 placement
function layoutChartArea(plots, t, o) {
  let r = maxDisplayWidth(plots.flatMap((n) => n.ticks.map((tick) => tick.label))) + MIN_MARK_ROWS;
  let s = t - r;
  let p = o > 0 ? Math.floor(s / o) : 0;
  return p === 0 ? continuousAreaLayout(r, s) : columnAreaLayout(r, p, o);
}
//@ chunk-3s7ydtfd.js:68179-68366 placement
function layoutPlots_2(e, columns) {
  let plots = e.plots;
  let r = layoutChartArea(plots, columns - keyColumnWidth(plots), e.timeline.periodStarts.length);
  let s = r.columnWidth > 0;
  let mapped = plots.map((plot) => layoutPlotRows(plot, e, s));
  return s
    ? {
        area: r,
        drawnPlots: mapped,
      }
    : {
        area: layoutChartArea(plots, columns - endKeysWidth(mapped), 0),
        drawnPlots: mapped,
      };
}
//@ chunk-3s7ydtfd.js:68366-68416 placement
var axisRowShape = (at, gridWidth) => ({
  kind: "axisRow",
  at,
  gridWidth,
});
//@ chunk-3s7ydtfd.js:68416-68472 placement
var flattenThinStack = (e) =>
  e.map((t, o) => ({
    ink: t.ink,
    height: o > 0 ? 0 : BAR_GAP_FRACTION,
  }));
//@ chunk-3s7ydtfd.js:68472-68538 placement
var stackShape = (at, t, parts) => ({
  kind: "stack",
  at,
  width: t.columnWidth,
  parts,
});
//@ chunk-3s7ydtfd.js:68538-68711 placement
var toColumnStack =
  (e, area) =>
  ([o, r]) => {
    let s = [];
    let p = {
      y: e,
      position: 0,
    };
    for (let m of r) {
      if (m.position > p.position)
        s.push({
          height: p.y - m.y,
          ink: m.ink,
        });
      p = m;
    }
    return stackShape(
      {
        x: o,
        y: e,
      },
      area,
      e - p.y < BAR_GAP_FRACTION ? flattenThinStack(s) : s,
    );
  };
//@ chunk-3s7ydtfd.js:68711-68828 placement
var groupPointsByColumn = (e) =>
  groupIndexBy(
    e.rows.flatMap((t) =>
      t.stretches.flat().map((stretch) => ({
        ...e.toCells(stretch),
        position: stretch.y,
        ink: t.ink,
      })),
    ),
    (t) => t.x,
  );
//@ chunk-3s7ydtfd.js:68828-68890 placement
var columnStacks = (e) =>
  [...groupPointsByColumn(e)].map(
    toColumnStack(
      e.toCells({
        x: 0,
        y: 0,
      }).y,
      e.area,
    ),
  );
//@ chunk-3s7ydtfd.js:68890-68954 placement
var markFlag = (area) => (t) => ({
  x: area.tickXOf(t.position),
  text: truncateMiddle(t.label, AXIS_LABEL_INDENT),
});
//@ chunk-3s7ydtfd.js:68954-68999 placement
var lineShape = (points, ink) => ({
  kind: "line",
  ink,
  points,
});
//@ chunk-3s7ydtfd.js:68999-69098 placement = diff (0.798)
var pointSegment = (prev, next) =>
  [prev.x - HALF, prev.x + HALF].map((o) => ({
    x: Math.max(next.left, Math.min(o, next.left + next.width - BAR_FRACTION)),
    y: prev.y,
  }));
//@ chunk-3s7ydtfd.js:69098-69270 placement = diff (0.794)
var decimateLinePoints = (e) =>
  [...groupIndexBy(e, (t) => Math.floor(t.x / HALF)).values()].flatMap((t) => {
    let o = t.toSorted((s, p) => s.y - p.y);
    let r = [t[0], o[0], o.at(-1), t.at(-1)];
    return t.filter((s) => r.includes(s));
  });
//@ chunk-3s7ydtfd.js:69270-69312 placement
var linePoints = (e, area) => (e.length > 1 ? decimateLinePoints(e) : pointSegment(e[0], area));
//@ chunk-3s7ydtfd.js:69312-69508 placement
function splitLineRuns(e) {
  let t = [];
  let o = [];
  let r = -1 / 0;
  for (let [s, ...p] of e) {
    if (s === undefined) continue;
    let m = p.length === 0 ? HALF : 0;
    if (s.x - m - r < MIN_LEGEND_COLUMN) o.push(s, ...p);
    else {
      let a = [s, ...p];
      t.push(a);
      o = a;
    }
    r = (p.at(-1) ?? s).x + m;
  }
  return t;
}
//@ chunk-3s7ydtfd.js:69508-69667 placement
function lineShapes({ rows, area, toCells }) {
  let r = [];
  for (let s of rows.toReversed())
    for (let p of splitLineRuns(s.stretches.map((stretch) => stretch.map(toCells))))
      r.push(lineShape(linePoints(p, area), s.ink));
  return r;
}
//@ chunk-3s7ydtfd.js:69667-69756 placement
var axisTickRow = (e, area) =>
  rangeIndices(area.width)
    .map((o) => (e.some((s) => s.column === o) ? "\u252C" : "\u2500"))
    .join("");
//@ chunk-3s7ydtfd.js:69756-69851 placement
var xAxisShapes = (e, t) =>
  textShapeOrEmpty({
    at: {
      x: e.area.left - 1,
      y: e.room.rows,
    },
    text: `\u2514${axisTickRow(t, e.area)}`,
    ink: "quiet",
  });
//@ chunk-3s7ydtfd.js:69851-69938 placement
var xLabelShapes = (e, area, o) =>
  e.flatMap((r) =>
    textShapeOrEmpty({
      at: {
        x: area.left + r.start,
        y: o,
      },
      text: r.text,
      ink: "quiet",
    }),
  );
//@ chunk-3s7ydtfd.js:69938-70018 placement
var periodPosition = (timeline) => (t) =>
  (timeline.periodStarts.findIndex((periodStart) => periodStart >= t) + MARK_FRACTION) /
  timeline.periodStarts.length;
//@ chunk-3s7ydtfd.js:70018-70072 placement
var columnOfTime = (area, t) => (o) => Math.floor(area.tickXOf(t(o)) - area.left);
//@ chunk-3s7ydtfd.js:70072-70253 placement
function xAxisLabels(e) {
  let t = e.area.columnWidth > 0;
  let columnOf = columnOfTime(e.area, t ? periodPosition(e.timeline) : tickStepsFor(e.timeline));
  return parseNumberCell(e.timeline.dataSpan, e.timeline.step, {
    columns: e.area.width,
    columnOf,
    areCentred: t,
  });
}
//@ chunk-3s7ydtfd.js:70253-70563 placement
function drawXAxis(e) {
  let t = xAxisLabels(e);
  let o = e.room.rows + 1;
  let r = [];
  let s = o + 1;
  let p;
  for (let flag of e.flags.filter((flag) => flag.text !== "")) {
    let n = displayWidth(flag.text);
    let floored = Math.floor(Math.min(flag.x, e.room.columns - n));
    if (p === undefined || floored < p) s += 1;
    r.push(
      ...textShapeOrEmpty({
        at: {
          x: floored,
          y: s - 1,
        },
        text: flag.text,
        ink: "words",
      }),
    );
    p = floored + n + DEFAULT_ROW_OPTIONS;
  }
  return {
    shapes: [...xAxisShapes(e, t), ...xLabelShapes(t, e.area, o), ...r],
    rows: s,
  };
}
//@ chunk-3s7ydtfd.js:70563-70616 placement
var toPlotCells = (area, drawnPlot, o) => (r) => ({
  x: area.xOf(r.x),
  y: o + drawnPlot.yOf(r.y),
});
//@ chunk-3s7ydtfd.js:70616-71621 placement
function drawLineOrColumnChart({ room, chart, plotsLayout, headerTexts }) {
  let { area, drawnPlots } = plotsLayout;
  let m = area.columnWidth > 0;
  let n = layoutRows({
    rows: drawnPlots.flatMap((drawnPlot) => drawnPlot.rows),
    columns: room.columns,
    lane: DEFAULT_LANE_OPTIONS,
    headerTexts,
    left: area.left,
  });
  let a = n.shownNames.size + n.statColumns.length > 0;
  let mapped = chart.marks.map(markFlag(area));
  let i = m ? columnStacks : lineShapes;
  let x = [];
  let rows = room.rows;
  for (let drawnPlot of drawnPlots) {
    for (let L of a ? drawnPlot.rows : []) {
      let _ = drawRowLabels(n, L, rows);
      x.push(_.shapes);
      rows = _.rows;
    }
    let g = rows;
    let T = g + drawnPlot.height;
    for (let L = g; L < T; L++) {
      let found = drawnPlot.ticks.find((tick) => g + Math.floor(drawnPlot.yOf(tick.position)) === L);
      let label = found?.label ?? "";
      x.push(
        textShapeOrEmpty({
          at: {
            x: area.left - MIN_MARK_ROWS - displayWidth(label),
            y: L,
          },
          text: label,
          ink: "quiet",
        }),
        [
          axisRowShape(
            {
              x: area.left - 1,
              y: L,
            },
            found ? area.width + HALF : 0,
          ),
        ],
      );
    }
    x.push(
      i({
        rows: drawnPlot.rows,
        area,
        toCells: toPlotCells(area, drawnPlot, g),
      }),
    );
    for (let [L, _] of drawnPlot.endKeys)
      for (let [w, A] of _.entries())
        x.push(
          textShapeOrEmpty({
            at: {
              x: area.left + area.width + DEFAULT_ROW_OPTIONS + w,
              y: g + L,
            },
            text: A.key,
            ink: A.ink,
          }),
        );
    x.push(
      mapped.map((L) =>
        lineShape(
          [g, T - BAR_FRACTION].map((_) => ({
            x: L.x,
            y: _,
          })),
          "quiet",
        ),
      ),
    );
    rows = T;
  }
  let u = drawXAxis({
    room: {
      columns: room.columns,
      rows,
    },
    timeline: chart.timeline,
    area,
    flags: mapped,
  });
  let d = chart.form === "columns" && !m;
  return {
    shapes: [...x.flat(), ...u.shapes],
    rows: u.rows,
    notes: d ? [chart.mergedColumnsNote] : [],
  };
}
//@ chunk-3s7ydtfd.js:71621-71680 placement
var bandShape = (rows, parts) => ({
  kind: "band",
  at: {
    x: 0,
    y: rows,
  },
  rows: MIN_CHART_WIDTH,
  parts,
});
//@ chunk-3s7ydtfd.js:71680-71752 placement
var shareKeyShape = (e, t) =>
  textShapeOrEmpty({
    at: {
      x: Math.floor(e.middle),
      y: t,
    },
    text: e.key,
    ink: e.ink,
  });
//@ chunk-3s7ydtfd.js:71752-71799 placement
var sharePart = (e, t, o) => ({
  ...e,
  width: t,
  middle: o - t / MIN_LANE_WIDTH,
});
//@ chunk-3s7ydtfd.js:71799-72215 placement
function drawShareBar(e, rows) {
  let mapped = rows.map((i) => (i.share > 0 ? Math.max(i.share * e.columns, MIN_ROWS_TO_DRAW) : 0));
  let r = stableSum(mapped) - e.columns;
  let index = mapped.indexOf(Math.max(...mapped));
  let parts = [];
  let m = 0;
  for (let [i, x] of rows.entries()) {
    let l = (mapped[i] ?? 0) - (i === index ? r : 0);
    if (l > 0) {
      m += l;
      parts.push(sharePart(x, l, m));
    }
  }
  let n = e.rows + MIN_CHART_WIDTH;
  let a = n + 1;
  let f = layoutRows({
    rows,
    columns: e.columns,
    lane: DEFAULT_LANE_OPTIONS,
    headerTexts: [],
    left: 0,
  });
  return {
    shapes: [
      bandShape(e.rows, parts),
      ...parts.flatMap((i) => shareKeyShape(i, n)),
      ...rows.flatMap((i, x) => drawRowLabels(f, i, a + x).shapes),
    ],
    rows: a + rows.length,
  };
}
//@ chunk-3s7ydtfd.js:72215-72264 placement
var fartherFrom = (e, t, o) => (Math.abs(t - e) >= Math.abs(o - e) ? t : o);
//@ chunk-3s7ydtfd.js:72264-72311 placement
var bucketIndex = (e) => (t) => Math.min(e - 1, Math.floor(t * e));
//@ chunk-3s7ydtfd.js:72311-72571 placement = diff (0.806)
function resampleSparkline(prev, next) {
  let list = Array.from(Array(next), () => null);
  let mapped = prev.flat().map((m) => m.y);
  let s = stableSum(mapped) / mapped.length;
  let p = bucketIndex(next);
  for (let m of prev)
    for (let [n, a] of m.entries()) {
      let f = p(a.x);
      let max = Math.max(f, p(m[n + 1]?.x ?? a.x) - 1);
      for (let x = f; x <= max; x++)
        list[x] = Math.max(BAR_GAP_FRACTION, fartherFrom(s, a.y, list[x] ?? a.y));
    }
  return list;
}
//@ chunk-3s7ydtfd.js:72571-72670 placement
var sparklineHeights = (e, t, o) =>
  resampleSparkline(e.stretches, o).flatMap((r) => Array.from(Array(Math.floor(t.laneWidth / o)), () => r));
//@ chunk-3s7ydtfd.js:72670-72710 placement
var SPARK_LANE = {
  minWidth: 16,
  statsBeforeNames: 0,
};
//@ chunk-3s7ydtfd.js:72710-72764 placement
var stripShape = (at, heights, ink) => ({
  kind: "strip",
  at,
  heights,
  ink,
});
//@ chunk-3s7ydtfd.js:72764-73043 placement
function drawSparklines(e, t, headerTexts) {
  let r = layoutRows({
    rows: t.rows,
    columns: e.columns,
    lane: SPARK_LANE,
    headerTexts,
    left: 0,
  });
  let min = Math.min(r.laneWidth, Math.round(1 / t.medianStep) + 1);
  return {
    shapes: t.rows.flatMap((p, m) => {
      let n = drawRowLabels(r, p, e.rows + m);
      return [...n.shapes, stripShape(n.lane, sparklineHeights(p, r, min), p.ink)];
    }),
    rows: e.rows + t.rows.length,
  };
}
//@ chunk-3s7ydtfd.js:73043-73341 placement
function drawChartBody(e, t, headerTexts) {
  switch (e.form) {
    case "bars":
      return {
        ...drawBarRows(t, e.rows, headerTexts),
        notes: [],
      };
    case "share":
      return {
        ...drawShareBar(t, e.rows),
        notes: [],
      };
    case "sparks":
      return {
        ...drawSparklines(t, e, headerTexts),
        notes: [],
      };
    case "line":
    case "columns": {
      let r = layoutPlots_2(e, t.columns);
      return r.area.width >= MIN_AXIS_WIDTH
        ? drawLineOrColumnChart({
            room: t,
            chart: e,
            plotsLayout: r,
            headerTexts,
          })
        : undefined;
    }
  }
}
//@ chunk-3s7ydtfd.js:73341-73490 placement
function wrappedTextRows(e, t, ink) {
  let flattened = t.flatMap((s) => wrapToWidth(s, e.columns));
  return {
    shapes: flattened.flatMap((text, p) =>
      textShapeOrEmpty({
        at: {
          x: 0,
          y: e.rows + p,
        },
        text,
        ink,
      }),
    ),
    rows: e.rows + flattened.length,
  };
}
//@ chunk-3s7ydtfd.js:73490-73570 placement
var headerFactShape = (rows, t, o) =>
  textShapeOrEmpty({
    at: {
      x: t + DEFAULT_ROW_OPTIONS,
      y: rows - 1,
    },
    text: `${SEP_WIDTH.trimStart()}${o}`,
    ink: "quiet",
  });
//@ chunk-3s7ydtfd.js:73570-73583 placement
var SEPARATOR_WIDTH = displayWidth(SEP_WIDTH);
//@ chunk-3s7ydtfd.js:73583-73893 placement
function drawHeader(e, header) {
  let filtered = [header.title, ...header.facts].filter((m) => m !== "");
  let r = [];
  let rows = e.rows;
  let p = 0;
  for (let [m, n] of filtered.entries()) {
    let a = p + SEPARATOR_WIDTH + displayWidth(n);
    if (m === 0 || a > e.columns) {
      let i = wrappedTextRows(
        {
          columns: e.columns,
          rows,
        },
        [n],
        m === 0 ? "title" : "quiet",
      );
      r.push(...i.shapes);
      rows = i.rows;
      p = displayWidth(n);
    } else {
      r.push(...headerFactShape(rows, p, n));
      p = a;
    }
  }
  return {
    shapes: r,
    rows,
    texts: filtered,
  };
}
//@ chunk-3s7ydtfd.js:73893-73949 placement
var chartResult = (columns, t) => ({
  columns,
  rows: t.rows,
  shapes: t.shapes,
});
//@ chunk-3s7ydtfd.js:73949-74006 placement
var chartAsText = (e, columns) =>
  chartResult(
    columns,
    wrappedTextRows(
      {
        columns,
        rows: 0,
      },
      renderLegend(e),
      "words",
    ),
  );
//@ chunk-3s7ydtfd.js:74006-74091 placement
var partsLeftOutShape = (text, t) => ({
  kind: "text",
  at: {
    x: 0,
    y: t,
  },
  text,
  ink: "quiet",
  isAboutPartsLeftOut: true,
});
//@ chunk-3s7ydtfd.js:74091-74195 placement
function drawThinPartsNote(e, thinPartsNote) {
  let o = wrapToWidth(thinPartsNote, e.columns);
  return {
    shapes: o.map((r, s) => partsLeftOutShape(r, e.rows + s)),
    rows: e.rows + o.length,
  };
}
//@ chunk-3s7ydtfd.js:74195-74581 placement
function layoutChart(e, columns) {
  if (columns < MIN_PLOT_WIDTH) return chartAsText(e, columns);
  let o = drawHeader(
    {
      columns,
      rows: 0,
    },
    e.header,
  );
  let r = drawChartBody(
    e,
    {
      columns,
      rows: o.rows,
    },
    o.texts,
  );
  if (r === undefined) return chartAsText(e, columns);
  let s = wrappedTextRows(
    {
      columns,
      rows: r.rows,
    },
    [...e.notes, ...r.notes],
    "quiet",
  );
  let m =
    e.form === "columns"
      ? drawThinPartsNote(
          {
            columns,
            rows: s.rows,
          },
          e.thinPartsNote,
        )
      : {
          shapes: [],
          rows: s.rows,
        };
  return chartResult(columns, {
    shapes: [...o.shapes, ...r.shapes, ...s.shapes, ...m.shapes],
    rows: m.rows,
  });
}
//@ chunk-3s7ydtfd.js:74581-74628 placement
var glyphCell = (glyph, ink, background) => ({
  glyph,
  ink,
  background,
});
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
    .map((i) => ({
      ink: i.ink,
      size: Math.min(i.to, t + EIGHTHS) - Math.max(i.from, t),
    }))
    .filter((i) => i.size >= MIN_PART_EIGHTHS);
  let s = filtered.toSorted((i, x) => x.size - i.size);
  let [p] = s;
  if (p === undefined) return;
  let rounded = Math.round((e.at(-1)?.to ?? t) - t);
  if (rounded < EIGHTHS) {
    let i = o[rounded];
    return i
      ? {
          glyph: i,
          ink: p.ink,
        }
      : undefined;
  }
  let [n = p, a] = topTwoParts(filtered, s);
  let glyph = o[Math.round((n.size / (n.size + (a?.size ?? 0))) * EIGHTHS)];
  return glyph
    ? glyphCell(glyph, n.ink, a?.ink)
    : {
        glyph: FULL_BLOCK,
        ink: p.ink,
      };
}
//@ chunk-3s7ydtfd.js:75203-75239 placement
var GRID_DOT = {
  glyph: "\u2508",
  ink: "quiet",
};
//@ chunk-3s7ydtfd.js:75239-75273 placement
var axisGlyph = (gridWidth) => (gridWidth > 0 ? "\u2524" : "\u2502");
//@ chunk-3s7ydtfd.js:75273-75303 placement
var BLANK_CELL = {
  glyph: BLANK,
  ink: "words",
};
//@ chunk-3s7ydtfd.js:75303-75622 placement
function createGlyphGrid(e) {
  let list = Array.from(
    {
      length: e.rows * e.columns,
    },
    () => BLANK_CELL,
  );
  function o(r) {
    return Number.isInteger(r.x) && Number.isInteger(r.y) && r.x >= 0 && r.x < e.columns
      ? r.y * e.columns + r.x
      : -1;
  }
  return {
    cellAt: (r) => list[o(r)],
    set: (r, s) => {
      let p = o(r);
      if (list[p] !== undefined) list[p] = s;
    },
    rows: () => rangeIndices(e.rows).map((r) => list.slice(r * e.columns, (r + 1) * e.columns)),
  };
}
//@ chunk-3s7ydtfd.js:75622-75679 placement
var thinTopGlyph = (e, t) => ({
  glyph: t < THIN_TOP_EIGHTHS ? "\u2501" : "\u2580",
  ink: e.ink,
});
//@ chunk-3s7ydtfd.js:75679-75754 placement
var LOWER_EIGHTHS = ["", "\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587"];
//@ chunk-3s7ydtfd.js:75754-75784 placement
var BRAILLE_DOT_BITS = [1, 2, 4, 64, 8, 16, 32, 128];
//@ chunk-3s7ydtfd.js:75784-75859 placement
var LEFT_EIGHTHS = ["", "\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589"];
//@ chunk-3s7ydtfd.js:75859-75897 placement
var partRange = (from, to, ink) => ({
  from,
  to,
  ink,
});
//@ chunk-3s7ydtfd.js:75897-75994 placement
function stackRanges(parts, t, o) {
  let r = (part) => t(part) * EIGHTHS;
  return prefixSums(parts, r, o).map(({ part, end }) => partRange(end - r(part), end, part.ink));
}
//@ chunk-3s7ydtfd.js:75994-76330 placement
function drawStack(glyphGrid, { at, width, parts }) {
  let s = Math.ceil(at.y);
  let p = (s - at.y) * EIGHTHS;
  let m = stackRanges(parts, (f) => f.height, p);
  let to = m.at(-1)?.to ?? 0;
  let a = new Set();
  for (let f = 0; f < to; f += EIGHTHS) {
    let i = blendEighthGlyph(m, f, LOWER_EIGHTHS);
    if (i === undefined) continue;
    let l = f < p ? thinTopGlyph(i, to - p) : i;
    a.add(l.ink).add(l.background);
    for (let j = 0; j < Math.round(width); j++)
      glyphGrid.set(
        {
          x: at.x + j,
          y: s - 1 - f / EIGHTHS,
        },
        l,
      );
  }
  return parts.every((part) => a.has(part.ink));
}
//@ chunk-3s7ydtfd.js:76330-76557 placement
function drawBar(glyphGrid, { at, width, ink, isHatched }) {
  let p = LEFT_EIGHTHS[Math.max(1, Math.round(width * EIGHTHS))];
  if (p !== undefined && !isHatched) {
    glyphGrid.set(at, {
      glyph: p,
      ink,
    });
    return;
  }
  for (let i = 0; i < Math.max(1, Math.round(width)); i++)
    glyphGrid.set(
      {
        x: at.x + i,
        y: at.y,
      },
      {
        glyph: isHatched ? MEDIUM_SHADE : LOWER_THREE_QUARTERS,
        ink,
      },
    );
}
//@ chunk-3s7ydtfd.js:76557-76647 placement
var brailleDotBit = (e, t) =>
  BRAILLE_DOT_BITS[
    Math.floor((e - Math.floor(e)) * BRAILLE_COLS) * BRAILLE_ROWS +
      Math.floor((t - Math.floor(t)) * BRAILLE_ROWS)
  ] ?? 0;
//@ chunk-3s7ydtfd.js:76647-76695 placement
var countBits = (bits) => BRAILLE_DOT_BITS.reduce((acc, o) => ((bits & o) === 0 ? acc : acc + 1), 0);
//@ chunk-3s7ydtfd.js:76695-76727 placement
var hasBitCount = (e) => (t) => countBits(t.bits) === e;
//@ chunk-3s7ydtfd.js:76727-77053 placement
function mergeBrailleCell(e, t) {
  let lines = e.lines ?? [];
  let r = [
    ...lines.filter((line) => line.ink !== t.ink),
    {
      ink: t.ink,
      bits: (lines.find((line) => line.ink === t.ink)?.bits ?? 0) | t.bits,
    },
  ];
  let filtered = r.filter((m) => m.ink !== "quiet");
  let p = filtered.length > 0 ? filtered : r;
  return {
    glyph: String.fromCodePoint(BRAILLE_BASE + p.reduce((acc, n) => acc | n.bits, 0)),
    ink: p.findLast(hasBitCount(Math.max(...p.map((m) => countBits(m.bits)))))?.ink ?? t.ink,
    lines: r,
  };
}
//@ chunk-3s7ydtfd.js:77053-77408 placement
function drawBrailleLine(glyphGrid, { points, ink }) {
  for (let [r, s] of points.entries()) {
    let p = points[r - 1] ?? s;
    let m = Math.ceil(Math.max(Math.abs(s.x - p.x) * BRAILLE_COLS, Math.abs(s.y - p.y) * BRAILLE_ROWS, 1));
    for (let j = 0; j <= m; j++) {
      let a = p.x + ((s.x - p.x) * j) / m;
      let f = p.y + ((s.y - p.y) * j) / m;
      let i = {
        x: Math.floor(a),
        y: Math.floor(f),
      };
      let x = glyphGrid.cellAt(i);
      if (!x || !(x.glyph === BLANK || x === GRID_DOT || x.lines !== undefined)) continue;
      glyphGrid.set(
        i,
        mergeBrailleCell(x, {
          ink,
          bits: brailleDotBit(a, f),
        }),
      );
    }
  }
}
//@ chunk-3s7ydtfd.js:77408-77595 placement
function drawText(glyphGrid, { at, text, ink }) {
  let rounded = Math.round(at.x);
  for (let p of splitGraphemes(text)) {
    let m = displayWidth(p);
    glyphGrid.set(
      {
        x: rounded,
        y: at.y,
      },
      {
        glyph: p,
        ink,
      },
    );
    for (let i = 1; i < m; i++)
      glyphGrid.set(
        {
          x: rounded + i,
          y: at.y,
        },
        {
          glyph: "",
          ink,
        },
      );
    rounded += m;
  }
}
//@ chunk-3s7ydtfd.js:77595-77658 placement
var cellToRun = (e) => ({
  text: e.glyph,
  ink: e.ink,
  background: e.background,
});
//@ chunk-3s7ydtfd.js:77658-77883 placement
function rowToRuns(e) {
  let t = [];
  for (let o of e.slice(0, e.findLastIndex((r) => r.glyph !== BLANK) + 1)) {
    let last = t.at(-1);
    if (
      last &&
      ((last.ink === o.ink && last.background === o.background) ||
        (o.glyph === BLANK && last.background === undefined))
    )
      last.text += o.glyph;
    else t.push(cellToRun(o));
  }
  return t;
}
//@ chunk-3s7ydtfd.js:77883-77920 placement
var sparkGlyph = (height) => LOWER_EIGHTHS[Math.round(height * EIGHTHS)] ?? FULL_BLOCK;
//@ chunk-3s7ydtfd.js:77920-78608 placement
function rasterizeChart(e) {
  let glyphGrid = createGlyphGrid(e);
  let o = false;
  let r = 0;
  for (let shape of e.shapes)
    switch (shape.kind) {
      case "text": {
        if (shape.isAboutPartsLeftOut && !o) r += 1;
        else drawText(glyphGrid, shape);
        break;
      }
      case "bar":
        drawBar(glyphGrid, shape);
        break;
      case "stack":
        o = !drawStack(glyphGrid, shape) || o;
        break;
      case "line":
        drawBrailleLine(glyphGrid, shape);
        break;
      case "strip": {
        let { at, heights, ink } = shape;
        heights.forEach((height, f) => {
          if (height !== null)
            glyphGrid.set(
              {
                x: at.x + f,
                y: at.y,
              },
              {
                glyph: sparkGlyph(height),
                ink,
              },
            );
        });
        break;
      }
      case "band": {
        let { at, rows, parts } = shape;
        let a = stackRanges(parts, (f) => f.width, 0);
        for (let f = 0; f < (a.at(-1)?.to ?? 0); f += EIGHTHS) {
          let i = blendEighthGlyph(a, f, LEFT_EIGHTHS);
          for (let j = 0; i !== undefined && j < rows; j++)
            glyphGrid.set(
              {
                x: at.x + f / EIGHTHS,
                y: at.y + j,
              },
              i,
            );
        }
        break;
      }
      case "axisRow": {
        let { at, gridWidth } = shape;
        glyphGrid.set(at, {
          glyph: axisGlyph(gridWidth),
          ink: "quiet",
        });
        for (let i = 1; i < gridWidth; i++)
          glyphGrid.set(
            {
              x: at.x + i,
              y: at.y,
            },
            GRID_DOT,
          );
        break;
      }
    }
  return glyphGrid
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
var hasSvgHeight = (part) => svgY(part.height) !== svgY(0);
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
  return svgLine(
    {
      x: t,
      y: e.at.y,
    },
    {
      x: t,
      y: e.at.y + 1,
    },
  );
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
  MIN_PLOT_WIDTH,
};
