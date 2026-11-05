/**
 * plugins/bundled/easel/renderChart.ts
 *
 * 2.1.316 新增：easel 终端图表渲染：颜色、分组、"其他"合并、折线/柱状/迷你图/占比条布局
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7stfs6p0.js (214)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7stfs6p0.js:54522-54592 placement (2.1.88 match: AGENT_COLORS, 0.646)
/**
 * 队友颜色轮换表。
 */
var AGENT_COLORS = ["blue", "orange", "green", "pink", "teal", "red", "violet", "olive"];
//@ chunk-7stfs6p0.js:54592-54606 placement
var BLUE = "blue";
//@ chunk-7stfs6p0.js:54606-54617 placement
/**
 * 100
 */
var MAX_ROW_CHARS = 100;
//@ chunk-7stfs6p0.js:54617-54627 placement
/**
 * 10
 */
var MAX_ROW_INK = 10;
//@ chunk-7stfs6p0.js:54627-54636 placement
/**
 * 3
 */
var MIN_BAR_HEIGHT = 3;
//@ chunk-7stfs6p0.js:54636-54647 placement
/**
 * 0.1
 */
var MIN_BAR_RATIO = 0.1;
//@ chunk-7stfs6p0.js:54647-54656 placement
/**
 * 2
 */
var MIN_LANE_HEIGHT = 2;
//@ chunk-7stfs6p0.js:54656-54675 placement
/**
 * 1e-9
 */
var NEGLIGIBLE_VALUE = 0.000000001;
//@ chunk-7stfs6p0.js:54675-54684 placement
/**
 * 2
 */
var MIN_PLOT_HEIGHT = 2;
//@ chunk-7stfs6p0.js:54684-54696 placement
/**
 * 8000
 */
var MAX_PLOT_WIDTH = 8000;
//@ chunk-7stfs6p0.js:54696-54705 placement
/**
 * 2
 */
var MIN_SPARK_ROWS = 2;
//@ chunk-7stfs6p0.js:54705-54714 placement
/**
 * 2
 */
var MIN_SHARE_SEGS = 2;
//@ chunk-7stfs6p0.js:54714-54723 placement
/**
 * 1
 */
var MIN_LEGEND_ROWS = 1;
//@ chunk-7stfs6p0.js:54723-54733 placement
/**
 * 16
 */
var DEFAULT_TABLE_WIDTH = 16;
//@ chunk-7stfs6p0.js:54733-54743 placement
/**
 * 24
 */
var DEFAULT_TABLE_HEIGHT = 24;
//@ chunk-7stfs6p0.js:54743-54769 placement
/**
 * 取首个系列的单位
 */
var firstSeriesUnit = (series) => series[0]?.unit ?? "";
//@ chunk-7stfs6p0.js:54769-54782 placement
/**
 * 红色
 */
var RED = "red";
//@ chunk-7stfs6p0.js:54782-55209 placement
function pickSeriesColors(series, values, options) {
  let total = stableSum(values);
  let mapped = series.map(firstValue);
  let max = Math.max(...series.map((series) => series.size));
  let maxAbsolute = max === 0 ? 1 : max;
  let filtered = AGENT_COLORS.filter((color) => color !== RED);
  let canDistinguish = options.measures.length <= filtered.length;
  let inkByMeasure = new Map(canDistinguish ? returnValue(options.measures, filtered) : []);
  let extraStats =
    options.isSummed && total > 0 && values.every((value) => value >= 0)
      ? formatSeriesValues(
          "%",
          mapped.map((value) => (MAX_ROW_CHARS * value) / total),
        ).map((fraction) => [["", "", fraction]])
      : mapped.map(() => []);
  return returnValue(
    series,
    returnValue(formatSeriesValues(firstSeriesUnit(series), mapped), extraStats),
  ).map(([series, [label, stats]]) => ({
    key: "",
    name: series.name,
    stats: [["", label, ""], ...stats],
    ink: firstValue(series) < 0 ? RED : (inkByMeasure.get(series.measure) ?? BLUE),
    relativeLength: firstValue(series) / maxAbsolute,
  }));
}
//@ chunk-7stfs6p0.js:55209-55232 placement
/**
 * 柱状图合计行
 */
var TOTAL_ROW = {
  key: "",
  ink: BLUE,
};
//@ chunk-7stfs6p0.js:55232-55343 placement
/**
 * 柱状图的合计行。
 */
var totalRow = (series, values) => ({
  ...TOTAL_ROW,
  name: "total",
  stats: [
    [
      "",
      formatSeriesValues(firstSeriesUnit(series), [stableSum(values)], {
        peers: series.map(firstValue),
      })[0] ?? "",
      "",
    ],
  ],
  relativeLength: 0,
});
//@ chunk-7stfs6p0.js:55343-55675 placement
function describeBarsLimit(context) {
  let isSummed = context.request.combine === "sum";
  let shownSeries =
    context.request.top !== undefined || context.selection.cutSeries.length > 0
      ? context.selection.topSeries
      : context.allSeries;
  let flattened = context.allSeries.flatMap((series) => series.values);
  let rows = pickSeriesColors(shownSeries, flattened, {
    isSummed,
    measures: uniqueValues(context.allSeries.map((series) => series.measure)),
  });
  let rows_2 = isSummed ? [...rows, totalRow(shownSeries, flattened)] : rows;
  return {
    form: "bars",
    header: context.frame.header,
    rows: rows_2,
    notes: context.frame.notes,
  };
}
//@ chunk-7stfs6p0.js:55675-55814 placement
/**
 * 给系列补上非空值列表与最大绝对值。
 */
function withSeriesValues(series) {
  let filtered = series.samples.map((sample) => sample.value).filter((value) => value !== null);
  return {
    ...series,
    values: filtered,
    size: Math.max(...filtered.map(Math.abs)),
    isOthers: false,
  };
}
//@ chunk-7stfs6p0.js:55814-55856 placement
/**
 * 名字用逗号拼接
 */
var joinNames = (series) => series.map((series) => series.name).join(", ");
//@ chunk-7stfs6p0.js:55856-55935 placement
/**
 * “这是最大值”/“这 N 个最大”
 */
function largestNote(drawnAloneCount) {
  return drawnAloneCount === 1 ? "this is the largest" : `these are the ${drawnAloneCount} largest`;
}
//@ chunk-7stfs6p0.js:55935-56441 placement
function describeGroupedOthers(context) {
  let cutCount = context.cutSeries.length;
  if (cutCount === 0) return [];
  let tooManyToGroup = context.form === "bars" && cutCount >= MAX_ROW_INK * context.drawnAloneCount;
  let namesFit = cutCount <= MIN_BAR_HEIGHT;
  let note =
    `${formatCountWithUnit(context.form, cutCount)} ` +
    (context.isRestDrawnAsOne ? "drawn as one" : "not shown") +
    (namesFit ? ` (${joinNames(context.cutSeries)})` : "") +
    `: ${largestNote(context.drawnAloneCount)} of ` +
    (context.drawnAloneCount + cutCount).toLocaleString("en-US") +
    (tooManyToGroup ? ". For a distribution, pass counts per range" : "");
  return context.top !== undefined && context.top > context.formLimit
    ? [
        note,
        `top ${context.top}: a chart draws at most ${formatCountWithUnit(context.form, context.formLimit)}` +
          (context.isRestDrawnAsOne ? ", and the rest as one" : ""),
      ]
    : [note];
}
//@ chunk-7stfs6p0.js:56441-56717 placement
/**
 * 按单位与量级把系列分组到同一坐标轴。
 */
function groupSeriesByScale(drawnSeries, isBars) {
  let groups = [];
  let groupOfUnit = new Map();
  let groupIndex = [];
  for (let series of drawnSeries) {
    let existingGroup = groupOfUnit.get(series.unit) ?? groups.length;
    let group = groups[existingGroup];
    if (group !== undefined && (isBars || series.size === 0 || group.size <= series.size * MAX_EVENTS))
      groupIndex.push(existingGroup);
    else {
      groupOfUnit.set(series.unit, groups.length);
      groupIndex.push(groups.length);
      groups.push(series);
    }
  }
  return [...groupIndexBy(returnValue(drawnSeries, groupIndex), (pair) => pair[1]).values()].map((pairs) =>
    pairs.map((pair) => pair[0]),
  );
}
//@ chunk-7stfs6p0.js:56717-56776 placement
/**
 * 图的标题/事实/来源
 */
var plotFrame = (table, options, facts) => ({
  title: options.title ?? "",
  facts,
  source: tableSource(table),
});
//@ chunk-7stfs6p0.js:56776-56961 placement
/**
 * 按时刻求各系列之和。
 */
var sumSamplesByTime = (series) =>
  [
    ...groupIndexBy(
      series.flatMap((series) => series.samples),
      (sample) => sample.ms,
    ),
  ]
    .toSorted(([a], [b]) => a - b)
    .map(([ms, samples]) => {
      let filtered = samples.map((sample) => sample.value).filter((value) => value !== null);
      return {
        ms,
        value: filtered.length > 0 ? stableSum(filtered) : null,
      };
    });
//@ chunk-7stfs6p0.js:56961-57038 placement
/**
 * 同一时刻求和的系列
 */
var sumSeries = (series, name) =>
  withSeriesValues({
    unit: firstSeriesUnit(series),
    name,
    measure: series[0]?.measure ?? "",
    samples: sumSamplesByTime(series),
  });
//@ chunk-7stfs6p0.js:57038-57358 placement
function describeTotalColumn(series, plural) {
  if (series.length <= MIN_LANE_HEIGHT) return [];
  let sumByMs = new Map(sumSeries(series, "").samples.map(({ ms, value }) => [ms, value]));
  let isEqual = ({ ms, value }) =>
    value !== null &&
    Math.abs(MIN_PLOT_HEIGHT * value - (sumByMs.get(ms) ?? 0)) <= NEGLIGIBLE_VALUE * Math.abs(value);
  return series
    .filter((series) => series.size > 0 && series.samples.every(isEqual))
    .map(
      (series) => `${series.name} equals the sum of the other ${plural}: if it is their total, leave it out`,
    );
}
//@ chunk-7stfs6p0.js:57358-57491 placement
/**
 * 系列峰值所在时刻的标签。
 */
function peakTimeLabel(series, timeline) {
  let peak = {
    ms: 0,
    value: -1 / 0,
  };
  for (let { ms, value } of series.samples)
    if (value !== null && value > peak.value)
      peak = {
        ms,
        value,
      };
  return tickTextAt(timeline, peak.ms);
}
//@ chunk-7stfs6p0.js:57491-57607 placement
/**
 * “total max X at T” 说明。
 */
function totalPeakNote(series, timeline) {
  let totalSeries = sumSeries(series, "total");
  let [peakLabel = ""] = formatSeriesValues(totalSeries.unit, [Math.max(...totalSeries.values)]);
  return `total max ${peakLabel} at ${peakTimeLabel(totalSeries, timeline)}`;
}
//@ chunk-7stfs6p0.js:57607-57640 placement
/**
 * 按名字比较
 */
var byName = (a, b) => (a.name < b.name ? -1 : 1);
//@ chunk-7stfs6p0.js:57640-57698 placement
/**
 * 合并出的 “N others”
 */
var othersSeries = (series) => ({
  ...sumSeries(series, `${series.length} others`),
  isOthers: true,
});
//@ chunk-7stfs6p0.js:57698-57922 placement
/**
 * 按大小选前若干系列，其余合并为 “others”。
 */
function pickTopSeries(series, top, isRestDrawnAsOne) {
  let sliced = series
    .toSorted((a, b) => (a.size !== b.size ? b.size - a.size : byName(a, b)))
    .slice(0, isRestDrawnAsOne && series.length === top + 1 ? top + 1 : top);
  let series_2 = series.filter((series) => !sliced.includes(series));
  let hasCut = isRestDrawnAsOne && series_2.length > 0;
  return {
    topSeries: sliced,
    cutSeries: series_2,
    drawnSeries: hasCut ? [...sliced, othersSeries(series_2)] : sliced,
  };
}
//@ chunk-7stfs6p0.js:57922-57950 placement
/**
 * 弱化样式行
 */
var QUIET_ROW = {
  key: "",
  ink: "quiet",
};
//@ chunk-7stfs6p0.js:57950-58009 placement
var mapped; // deferred: uses returnValue (./chartSchema.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7stfs6p0.js:57950", () => {
  mapped = returnValue([..."abcdefgh"], AGENT_COLORS).map(([key, color]) => ({
    key,
    ink: color,
  }));
});
//@ chunk-7stfs6p0.js:58009-58267 placement
/**
 * 占比图布局（各项份额与颜色）。
 */
function layoutShareChart(frame, selection, series) {
  let flattened = series.flatMap((series) => series.values);
  let nameByInk = new Map(returnValue(selection.topSeries, mapped));
  let rows = returnValue(
    pickSeriesColors(selection.drawnSeries, flattened, {
      isSummed: true,
      measures: [],
    }),
    selection.drawnSeries,
  ).map(([series, label]) => ({
    ...series,
    ...(nameByInk.get(label) ?? QUIET_ROW),
    share: firstValue(label) / stableSum(flattened),
  }));
  return {
    form: "share",
    header: frame.header,
    rows,
    notes: frame.notes,
  };
}
//@ chunk-7stfs6p0.js:58267-58351 placement
/**
 * 迷你图结果对象
 */
var sparksFrame = (frame, rows, medianStep) => ({
  form: "sparks",
  header: frame.header,
  rows,
  medianStep,
  notes: frame.notes,
});
//@ chunk-7stfs6p0.js:58351-58511 placement
/**
 * 缺失样本的说明。
 */
function missingSampleNotes(series) {
  let missingCount = stableSum(series.map((series) => series.samples.length - series.values.length));
  return missingCount > 0
    ? [`${formatCount(missingCount, "missing sample")}, left blank where the gap is wide enough to see`]
    : [];
}
//@ chunk-7stfs6p0.js:58511-58612 placement
/**
 * 列图的行（名称、统计、线段）。
 */
var toColumnRow =
  (context, toLine) =>
  ([series, [columns, stats]]) => ({
    ...context.identityOf(series),
    name: series.name,
    stats,
    stretches: columns.map((column) => column.map(toLine)),
  });
//@ chunk-7stfs6p0.js:58612-58667 placement
/**
 * 折线的坐标函数
 */
var linePoint = (xOf, axis) => (point) => ({
  x: xOf(point.ms),
  y: axis.positionOf(point.top),
});
//@ chunk-7stfs6p0.js:58667-59164 placement
function summarizeSparkStat({ seriesOfPlot, axisValues, timeline, isSummed }) {
  let unit = firstSeriesUnit(seriesOfPlot);
  let mapped = seriesOfPlot.map((series) => series.values);
  let formatValues = (values) =>
    formatSeriesValues(unit, values, {
      peers: axisValues,
      minWritten: MIN_LEGEND_ROWS,
    });
  let maxStats = formatValues(mapped.map((values) => Math.max(...values)));
  let lastStats = formatValues(mapped.map((values) => values.at(-1) ?? 0));
  let minStats = formatValues(mapped.map((values) => Math.min(...values)));
  let meanStats = formatValues(mapped.map((values) => stableSum(values) / values.length));
  let totalStats = formatSeriesValues(unit, mapped.map(stableSum));
  return seriesOfPlot.map((series, index) => {
    if (series.values.length === 1) return [["last", lastStats[index] ?? "", ""]];
    let stats = [
      ["max", maxStats[index] ?? "", `at ${peakTimeLabel(series, timeline)}`],
      ["last", lastStats[index] ?? "", ""],
      ["min", minStats[index] ?? "", ""],
      ["mean", meanStats[index] ?? "", ""],
    ];
    return isSummed ? [...stats, ["total", totalStats[index] ?? "", ""]] : stats;
  });
}
//@ chunk-7stfs6p0.js:59164-59283 placement
/**
 * 坐标轴上下文（系列映射、值、时间线、是否求和）。
 */
var axisContext = (context, axisValues) => ({
  seriesOfPlot: context.seriesOfPlot,
  axisValues,
  timeline: context.data.timeline,
  isSummed: context.request.combine === "sum",
});
//@ chunk-7stfs6p0.js:59283-59827 placement
function layoutColumns(context) {
  let isColumns = context.data.form === "columns";
  let runningStack = new Map();
  let stretches = [];
  for (let series of context.seriesOfPlot) {
    let seriesStretches = [];
    let current = [];
    for (let sample of series.samples)
      if (sample.value === null) {
        seriesStretches.push(current);
        current = [];
      } else {
        let top = (isColumns ? (runningStack.get(sample.ms) ?? 0) : 0) + sample.value;
        runningStack.set(sample.ms, top);
        current.push({
          ms: sample.ms,
          top,
        });
      }
    seriesStretches.push(current);
    stretches.push(seriesStretches.filter((stretch) => stretch.length > 0));
  }
  let axisValues = stretches.flat(MIN_SPARK_ROWS).map((stretch) => stretch.top);
  let unit = firstSeriesUnit(context.seriesOfPlot);
  let range = [isColumns ? 0 : Math.min(...axisValues), Math.max(...axisValues)];
  let axis =
    context.request.log === true
      ? logAxisTicks(unit, range, context.maxAxisSteps)
      : linearAxisTicks(summarizeSeries(unit, axisValues), range, context.maxAxisSteps);
  return {
    ticks: axis.ticks,
    rows: returnValue(
      context.seriesOfPlot,
      returnValue(stretches, summarizeSparkStat(axisContext(context, axisValues))),
    ).map(toColumnRow(context, linePoint(tickStepsFor(context.data.timeline), axis))),
  };
}
//@ chunk-7stfs6p0.js:59827-59861 placement
/**
 * 单图 5 个系列、多图 2 个
 */
var PLOT_LIMITS = {
  onePlot: 5,
  severalPlots: 2,
};
//@ chunk-7stfs6p0.js:59861-60312 placement
function describeStretch({ topSeries, frame: { header, notes }, request, data }) {
  let { ticks, rows } = layoutColumns({
    seriesOfPlot: topSeries,
    identityOf: () => TOTAL_ROW,
    maxAxisSteps: PLOT_LIMITS.onePlot,
    request,
    data,
  });
  let tickSteps = tickStepsFor(data.timeline);
  let deltas = topSeries
    .flatMap((series) => {
      let mapped = series.samples.map((sample) => tickSteps(sample.ms));
      return returnValue(mapped, mapped.slice(1)).map(([from, to]) => to - from);
    })
    .toSorted((a, b) => a - b);
  return sparksFrame(
    {
      header: {
        ...header,
        facts: [...header.facts, `each from ${ticks[0]?.label} to ${ticks.at(-1)?.label}`],
      },
      notes: [...notes, ...missingSampleNotes(topSeries)],
    },
    rows,
    deltas[Math.floor(deltas.length / MIN_SHARE_SEGS)] ?? 1,
  );
}
//@ chunk-7stfs6p0.js:60312-60484 placement
/**
 * 多条折线在同一列靠得太近。
 */
function hasCrowdedLines(layout) {
  let lastY = new Map();
  for (let point of layout.rows.flatMap((row) => row.stretches.flat())) {
    let gap = point.y - (lastY.get(point.x) ?? 0);
    if (layout.rows.length > 1 && gap > 0 && gap < MIN_BAR_RATIO) return true;
    lastY.set(point.x, point.y);
  }
  return false;
}
//@ chunk-7stfs6p0.js:60484-60803 placement
/**
 * 按请求里 y 的顺序排列系列分组。
 */
function orderSeriesByRequest(groups, data, request) {
  let mapped = data.series.map((series) => series.name);
  let mapped_2 = (request.y ?? []).map((name) => name.toLowerCase());
  if (!(
    mapped.length > 1 &&
    mapped.every((name) => mapped_2.includes(name.toLowerCase())) &&
    groups.flat().length === mapped.length
  ))
    return groups;
  let requestIndexOf = (series) => mapped.indexOf(series.name);
  let groupIndexOf = (group) => Math.min(...group.map(requestIndexOf));
  return groups
    .map((group) => group.toSorted((a, b) => requestIndexOf(a) - requestIndexOf(b)))
    .toSorted((groupA, groupB) => groupIndexOf(groupA) - groupIndexOf(groupB));
}
//@ chunk-7stfs6p0.js:60803-60892 placement
/**
 * 时间刻度标签
 */
function tickLabelFor(timeline) {
  let tickSteps = tickStepsFor(timeline);
  return (mark) => ({
    position: tickSteps(mark.ms),
    when: tickTextAt(timeline, mark.ms),
    label: mark.label,
  });
}
//@ chunk-7stfs6p0.js:60892-61942 placement
/**
 * 把序列分配到一个或多个图（同单位共享，柱状最多若干组）。
 */
function layoutPlots(context) {
  let isColumns = context.data.form === "columns";
  let groups = orderSeriesByRequest(
    context.groups.slice(0, MAX_COMBINED_SERIES),
    context.data,
    context.request,
  );
  let shown = groups.flat();
  let overflow = context.groups.slice(MAX_COMBINED_SERIES).flat();
  let identityBySeries = new Map(
    returnValue(
      shown.filter((series) => !series.isOthers),
      shown.length > 1 ? mapped : [TOTAL_ROW],
    ),
  );
  let identityOf = (series) => identityBySeries.get(series) ?? QUIET_ROW;
  let maxAxisSteps = PLOT_LIMITS[groups.length > 1 ? "severalPlots" : "onePlot"];
  let mapped_2 = groups.map((seriesOfPlot) =>
    layoutColumns({
      seriesOfPlot,
      identityOf,
      maxAxisSteps,
      request: context.request,
      data: context.data,
    }),
  );
  let columnCount = context.data.timeline.periodStarts.length;
  let isMultiple = shown.length > groups.length;
  let mergedNote = `${columnCount} columns do not fit, so they are drawn as ${isMultiple ? "lines, one for each series" : "a line"}`;
  let hasOverflow = overflow.length > 0;
  let isNarrow = columnCount > DEFAULT_TABLE_HEIGHT;
  let isCrowded = isColumns && mapped_2.some(hasCrowdedLines);
  let notes = [
    ...context.frame.notes,
    ...(hasOverflow
      ? [
          `${formatCountWithUnit(context.data.form, overflow.length)} not shown (${joinNames(overflow)}): a chart has at most ${MAX_COMBINED_SERIES} plots`,
        ]
      : []),
    ...missingSampleNotes(shown),
  ];
  let modelOnlyNotes = [
    ...(isNarrow
      ? [`on a screen under about ${columnCount + DEFAULT_TABLE_WIDTH} characters wide, ${mergedNote}`]
      : []),
    ...(isCrowded ? ["in a terminal, parts of a column thinner than a row may not show"] : []),
  ];
  return {
    form: isColumns ? "columns" : "line",
    header: context.frame.header,
    plots: mapped_2,
    timeline: context.data.timeline,
    marks: context.data.marks.map(tickLabelFor(context.data.timeline)),
    notes,
    mergedColumnsNote: mergedNote,
    thinPartsNote: "the thinnest parts of a column are too thin to show here",
    modelOnlyNotes,
  };
}
//@ chunk-7stfs6p0.js:61942-62983 placement
/**
 * 决定绘制方式（合并、对数刻度、序列上限）。
 */
function planChartLayout(chartRequestData, request) {
  let isSummed = request.combine === "sum";
  let isCombinedColumns = chartRequestData.form === "columns" && !isSummed;
  let series = chartRequestData.series.map(withSeriesValues);
  let isRestDrawnAsOne =
    chartRequestData.form === "share" ||
    (chartRequestData.form === "columns" &&
      isSummed &&
      series.every((series_2) => series_2.unit === firstSeriesUnit(series)));
  let formLimit = isCombinedColumns ? MAX_COMBINED_SERIES : CHART_FORMS[chartRequestData.form].maxCount;
  let selection = pickTopSeries(
    series,
    Math.min(request.top ?? CHART_FORMS[chartRequestData.form].defaultCount, formLimit),
    isRestDrawnAsOne,
  );
  let hasCombinedRows = chartRequestData.hasCombinedRows && !isSummed;
  let showsTotalPeak = chartRequestData.form === "columns" && isRestDrawnAsOne && series.length > 1;
  let header = plotFrame(chartRequestData, request, [
    ...(chartRequestData.subject === "" ? [] : [chartRequestData.subject]),
    ...chartRequestData.timeline.spanLabels,
    ...(request.log ? ["log scale"] : []),
    ...(hasCombinedRows ? [`rows combined by ${request.combine}`] : []),
    ...(showsTotalPeak ? [totalPeakNote(series, chartRequestData.timeline)] : []),
  ]);
  let notes = [
    ...chartRequestData.leftOutNotes,
    ...chartRequestData.notes,
    ...describeGroupedOthers({
      form: chartRequestData.form,
      cutSeries: selection.cutSeries,
      drawnAloneCount: selection.topSeries.length,
      isRestDrawnAsOne,
      formLimit,
      top: request.top,
    }),
    ...(isSummed ? describeTotalColumn(series, CHART_FORMS[chartRequestData.form].plural) : []),
  ];
  switch (chartRequestData.form) {
    case "bars":
      return describeBarsLimit({
        frame: {
          header,
          notes,
        },
        selection,
        allSeries: series,
        request,
      });
    case "share":
      return layoutShareChart(
        {
          header,
          notes,
        },
        selection,
        series,
      );
    case "sparks":
      return describeStretch({
        topSeries: selection.topSeries,
        frame: {
          header,
          notes,
        },
        request,
        data: chartRequestData,
      });
    case "line":
    case "columns":
      return layoutPlots({
        groups: isCombinedColumns
          ? selection.topSeries.map((series) => [series])
          : groupSeriesByScale(
              selection.drawnSeries,
              chartRequestData.form === "columns" || request.log === true,
            ),
        frame: {
          header,
          notes,
        },
        request,
        data: chartRequestData,
      });
  }
}
//@ chunk-7stfs6p0.js:62983-63070 placement
/**
 * 标记点文本
 */
function markLabel(mark) {
  return mark.label !== "" ? `mark at ${mark.when}: ${mark.label}` : `mark at ${mark.when}`;
}
//@ chunk-7stfs6p0.js:63070-63137 placement
/**
 * 汇总注释
 */
var allNotes = (layout) => ("plots" in layout ? [...layout.notes, ...layout.modelOnlyNotes] : layout.notes);
//@ chunk-7stfs6p0.js:63137-63153 placement (2.1.88 match: SEP_WIDTH, 1)
var SEP = " \xB7 ";
//@ chunk-7stfs6p0.js:63153-63217 placement
/**
 * 带引号的标题
 */
var quotedPlotTitle = (header) => (header.title === "" ? "" : ` "${header.title.replaceAll('"', "'")}"`);
//@ chunk-7stfs6p0.js:63217-63725 placement
function renderLegend(layout) {
  let joined = [
    `${CHART_FORMS[layout.form].label}` + quotedPlotTitle(layout.header),
    ...layout.header.facts,
    `from ${layout.header.source}`,
  ].join(SEP);
  let mapped = ("plots" in layout ? layout.plots.flatMap((plot) => plot.rows) : layout.rows).map((row) => {
    let pointCount = "stretches" in row ? row.stretches.flat().length : 0;
    return (
      `- ${row.name}: ` +
      [
        ...row.stats.map((stat) => stat.filter((part) => part !== "").join(" ")),
        ...(pointCount > 0 ? [formatCount(pointCount, "point")] : []),
      ].join(SEP)
    );
  });
  let tailLines = [
    ...("plots" in layout ? layout.marks : []).map((mark) => markLabel(mark)),
    ...allNotes(layout).map((note) => `note: ${note}`),
  ];
  return [
    joined,
    ...elideList(
      mapped,
      takeWhileBudget(
        mapped,
        MAX_PLOT_WIDTH -
          [joined, ...tailLines].join(`
`).length,
        (line) => line.length + 1,
      ).length,
      "more row",
    ),
    ...tailLines,
  ];
}
//@ chunk-7stfs6p0.js:63725-63782 placement
/**
 * 展示名数量相符
 */
var hasExactlyNames = (count) => (rowLayout) => new Set(rowLayout.shownNames.values()).size === count;
//@ chunk-7stfs6p0.js:63782-63876 placement
/**
 * 是否还有空间
 */
var hasRoomFor = (rowLayout, statsWidth, nameWidth) => (range, index) => {
  let isStat = index < rowLayout.lane.statsBeforeNames;
  return rowLayout.widthPastKey - range.end >= (isStat ? statsWidth : nameWidth);
};
//@ chunk-7stfs6p0.js:63876-63885 placement
/**
 * 2
 */
var MIN_LANE_GAP = 2;
//@ chunk-7stfs6p0.js:63885-63894 placement
/**
 * 4
 */
var KEY_COLUMN_WIDTH = 4;
//@ chunk-7stfs6p0.js:63894-63903 placement
/**
 * 2
 */
var MIN_STATS_WIDTH = 2;
//@ chunk-7stfs6p0.js:63903-63912 placement
/**
 * 2
 */
var MIN_LANE_WIDTH = 2;
//@ chunk-7stfs6p0.js:63912-63925 placement
/**
 * 0.125
 */
var BAR_FRACTION = 0.125;
//@ chunk-7stfs6p0.js:63925-63936 placement
/**
 * 0.5
 */
var HALF = 0.5;
//@ chunk-7stfs6p0.js:63936-63949 placement
/**
 * 0.125
 */
var BAR_GAP_FRACTION = 0.125;
//@ chunk-7stfs6p0.js:63949-63958 placement
/**
 * 2
 */
var MIN_SEGMENT = 2;
//@ chunk-7stfs6p0.js:63958-63969 placement
/**
 * 0.4
 */
var SHARE_MIN_FRACTION = 0.4;
//@ chunk-7stfs6p0.js:63969-63978 placement
/**
 * 8
 */
var MAX_LEGEND_ENTRIES = 8;
//@ chunk-7stfs6p0.js:63978-63987 placement
/**
 * 2
 */
var LANE_WIDTH_DIVISOR = 2;
//@ chunk-7stfs6p0.js:63987-63996 placement
/**
 * 1
 */
var TITLE_ROW_INDEX = 1;
//@ chunk-7stfs6p0.js:63996-64006 placement
/**
 * 40
 */
var MIN_PLOT_WIDTH = 40;
//@ chunk-7stfs6p0.js:64006-64016 placement
/**
 * 16
 */
var AXIS_LABEL_INDENT = 16;
//@ chunk-7stfs6p0.js:64016-64025 placement
/**
 * 8
 */
var MIN_AXIS_WIDTH = 8;
//@ chunk-7stfs6p0.js:64025-64034 placement
/**
 * 2
 */
var MIN_CHART_WIDTH = 2;
//@ chunk-7stfs6p0.js:64034-64043 placement
/**
 * 1
 */
var MIN_ROWS_TO_DRAW = 1;
//@ chunk-7stfs6p0.js:64043-64058 placement
/**
 * 1048576
 */
var BAR_SCALE = 1048576;
//@ chunk-7stfs6p0.js:64058-64069 placement
/**
 * 0.5
 */
var MARK_FRACTION = 0.5;
//@ chunk-7stfs6p0.js:64069-64078 placement
/**
 * 2
 */
var MIN_MARK_ROWS = 2;
//@ chunk-7stfs6p0.js:64078-64087 placement
/**
 * 1
 */
var MIN_LEGEND_COLUMN = 1;
//@ chunk-7stfs6p0.js:64087-64096 placement
/**
 * 1
 */
var DEFAULT_ROW_OPTIONS = 1;
//@ chunk-7stfs6p0.js:64096-64385 placement
/**
 * 行布局的输入（名称是否已在标题中、缩进、键宽）。
 */
function prepareRowLayout(options) {
  let onlyRow = options.rows.length === 1 ? options.rows[0] : undefined;
  let isNamedInHeader = onlyRow !== undefined && options.headerTexts.includes(onlyRow.name);
  let keyWidth = options.rows.some((row) => row.key) ? MIN_SEGMENT : 0;
  return {
    rows: options.rows,
    lane: options.lane,
    fullNames: isNamedInHeader ? [] : options.rows.map((row) => row.name),
    isNamedInHeader,
    indent: Math.max(0, options.left - MIN_LANE_GAP),
    keyWidth,
    widthPastKey: options.columns - keyWidth - MIN_LANE_GAP,
  };
}
//@ chunk-7stfs6p0.js:64385-64421 placement
/**
 * 最长显示宽度
 */
var maxDisplayWidth = (names) => Math.max(0, ...names.map(displayWidth));
//@ chunk-7stfs6p0.js:64421-64484 placement
/**
 * 计算列位置
 */
var columnPositions = (columns, lane, isSplit) =>
  isSplit
    ? Math.min(Math.floor(columns / LANE_WIDTH_DIVISOR), columns - lane.minWidth - DEFAULT_ROW_OPTIONS)
    : columns;
//@ chunk-7stfs6p0.js:64484-64851 placement
/**
 * 计算行的列位置：名称、色道、统计列。
 */
function computeRowLayout(rowLayout, statColumns) {
  let hasLane = rowLayout.lane.minWidth > 0;
  let widthPastStats = rowLayout.widthPastKey - (statColumns.at(-1)?.end ?? 0);
  let canShowLane = hasLane && widthPastStats >= MAX_LEGEND_ENTRIES + rowLayout.lane.minWidth;
  let names = measureLabelWidth(
    rowLayout.fullNames,
    columnPositions(widthPastStats, rowLayout.lane, canShowLane),
  );
  let nameWidth = rowLayout.isNamedInHeader
    ? Math.min(rowLayout.indent, widthPastStats)
    : maxDisplayWidth(names);
  let laneWidth = canShowLane ? widthPastStats - nameWidth - DEFAULT_ROW_OPTIONS : 0;
  let statsLeft = rowLayout.keyWidth + nameWidth + (canShowLane ? DEFAULT_ROW_OPTIONS + laneWidth : 0);
  return {
    wantsLane: hasLane,
    keyWidth: rowLayout.keyWidth,
    shownNames: new Map(returnValue(rowLayout.rows, names)),
    laneLeft: rowLayout.keyWidth + nameWidth + DEFAULT_ROW_OPTIONS,
    laneWidth,
    statsLeft: statsLeft > 0 ? statsLeft + MIN_LANE_GAP : 0,
    statColumns,
  };
}
//@ chunk-7stfs6p0.js:64851-64972 placement
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
//@ chunk-7stfs6p0.js:64972-64987 placement
var COLUMN_INDEXES = [0, 1, 2];
//@ chunk-7stfs6p0.js:64987-65041 placement
var maxStatsLength = (rows) => Math.max(0, ...rows.map((row) => row.stats.length));
//@ chunk-7stfs6p0.js:65041-65247 placement (2.1.88 match: rollFrom, 0.364)
function layoutStatColumns(rows) {
  let columns = [];
  let end = -MIN_LANE_GAP;
  for (let groupIndex of rangeIndices(maxStatsLength(rows))) {
    end += MIN_LANE_GAP - DEFAULT_ROW_OPTIONS;
    let parts = [];
    for (let partIndex of COLUMN_INDEXES) {
      let rarity = maxDisplayWidth(rows.map((row) => row.stats[groupIndex]?.[partIndex] ?? ""));
      end += rarity > 0 ? DEFAULT_ROW_OPTIONS + rarity : 0;
      parts.push({
        start: end - rarity,
        width: rarity,
      });
    }
    columns.push({
      parts,
      end,
    });
  }
  return columns;
}
//@ chunk-7stfs6p0.js:65247-65487 placement
/**
 * 选择能放下的统计列数并计算行布局。
 */
function layoutRows(options) {
  let rowLayout = prepareRowLayout(options);
  let statColumns = layoutStatColumns(options.rows).filter(
    hasRoomFor(
      rowLayout,
      Math.min(maxDisplayWidth(rowLayout.fullNames), MAX_LEGEND_ENTRIES),
      minNameWidth(rowLayout, options.columns),
    ),
  );
  return (
    rangeIndices(Math.max(0, statColumns.length - options.lane.statsBeforeNames) + 1)
      .map((extraColumns) =>
        computeRowLayout(rowLayout, statColumns.slice(0, statColumns.length - extraColumns)),
      )
      .find(hasExactlyNames(new Set(rowLayout.fullNames).size)) ?? computeRowLayout(rowLayout, statColumns)
  );
}
//@ chunk-7stfs6p0.js:65487-65540 placement
/**
 * 带色道的行布局
 */
var laneFrame = (shapes, y, laneLeft) => ({
  shapes,
  rows: y + 1,
  lane: {
    x: laneLeft,
    y,
  },
});
//@ chunk-7stfs6p0.js:65540-65621 placement
/**
 * 文字图形
 */
var textShape = (shape) => ({
  kind: "text",
  at: shape.at,
  text: shape.text,
  ink: shape.ink,
  isAboutPartsLeftOut: false,
});
//@ chunk-7stfs6p0.js:65621-65672 placement
/**
 * 空白文本返回空数组
 */
function textShapeOrEmpty(shape) {
  return shape.text.trim() === "" ? [] : [textShape(shape)];
}
//@ chunk-7stfs6p0.js:65672-65707 placement
/**
 * 名字前留白
 */
var keyPadding = (part, partIndex, text) => (partIndex > 0 ? part.width - displayWidth(text) : 0);
//@ chunk-7stfs6p0.js:65707-65747 placement
/**
 * 名称的颜色
 */
var nameInk = (rowLayout, row) => (rowLayout.wantsLane ? "title" : row.ink);
//@ chunk-7stfs6p0.js:65747-65786 placement
/**
 * 统计列的颜色
 */
var statInk = (rowLayout, row, partIndex) =>
  partIndex === TITLE_ROW_INDEX ? nameInk(rowLayout, row) : "quiet";
//@ chunk-7stfs6p0.js:65786-66149 placement
/**
 * 画一行的键、名称与统计值。
 */
function drawRowLabels(rowLayout, row, y) {
  let shapes = [
    ...textShapeOrEmpty({
      at: {
        x: 0,
        y,
      },
      text: row.key,
      ink: row.ink,
    }),
    ...textShapeOrEmpty({
      at: {
        x: rowLayout.keyWidth,
        y,
      },
      text: rowLayout.shownNames.get(row) ?? "",
      ink: rowLayout.wantsLane ? "words" : "title",
    }),
  ];
  for (let [groupIndex, group] of rowLayout.statColumns.entries())
    for (let [partIndex, part] of group.parts.entries()) {
      let text = row.stats[groupIndex]?.[partIndex] ?? "";
      shapes.push(
        ...textShapeOrEmpty({
          at: {
            x: rowLayout.statsLeft + part.start + keyPadding(part, partIndex, text),
            y,
          },
          text,
          ink: statInk(rowLayout, row, partIndex),
        }),
      );
    }
  return laneFrame(shapes, y, rowLayout.laneLeft);
}
//@ chunk-7stfs6p0.js:66149-66188 placement
/**
 * 默认列布局
 */
var DEFAULT_LANE_OPTIONS = {
  minWidth: 0,
  statsBeforeNames: 1,
};
//@ chunk-7stfs6p0.js:66188-66227 placement
/**
 * 最窄列布局
 */
var MIN_LANE_OPTIONS = {
  minWidth: 8,
  statsBeforeNames: 1,
};
//@ chunk-7stfs6p0.js:66227-66360 placement
/**
 * 柱形（宽度按相对长度，负值加斜线）。
 */
var barShape = (at, row, rowLayout) => ({
  kind: "bar",
  at,
  width: Math.max(BAR_GAP_FRACTION, Math.abs(row.relativeLength) * rowLayout.laneWidth),
  ink: row.ink,
  isHatched: row.relativeLength < 0,
});
//@ chunk-7stfs6p0.js:66360-66605 placement
/**
 * 画柱状图的各行。
 */
function drawBarRows(frame, rows, headerTexts) {
  let rowLayout = layoutRows({
    rows,
    columns: frame.columns,
    lane: MIN_LANE_OPTIONS,
    headerTexts,
    left: 0,
  });
  return {
    shapes: rows.flatMap((row, index) => {
      let labels = drawRowLabels(rowLayout, row, frame.rows + index);
      return row.relativeLength !== 0 && rowLayout.laneWidth > 0
        ? [...labels.shapes, barShape(labels.lane, row, rowLayout)]
        : labels.shapes;
    }),
    rows: frame.rows + rows.length,
  };
}
//@ chunk-7stfs6p0.js:66605-66637 placement
/**
 * 按精度取整
 */
var roundToScale = (value) => Math.round(value * BAR_SCALE) / BAR_SCALE;
//@ chunk-7stfs6p0.js:66637-66681 placement
/**
 * 键标记
 */
var laneKeyMark = (row, row_2) => ({
  key: row.key,
  ink: row.ink,
  row: row_2,
});
//@ chunk-7stfs6p0.js:66681-66770 placement
/**
 * 最后一个伸展段的标记
 */
function lastStretchMark(row, yOf) {
  let last = row.stretches.at(-1)?.at(-1);
  return last ? [laneKeyMark(row, Math.floor(yOf(last.y)))] : [];
}
//@ chunk-7stfs6p0.js:66770-66841 placement
/**
 * 按行分组标记
 */
var groupMarksByRow = (rows, yOf) =>
  groupIndexBy(
    rows.filter((row) => row.key).flatMap((row) => lastStretchMark(row, yOf)),
    (mark) => mark.row,
  );
//@ chunk-7stfs6p0.js:66841-66857 placement
var CHART_ROW_DENSITIES = [11, 7, 5];
//@ chunk-7stfs6p0.js:66857-66891 placement
var rowsPerTick = (rows, ticks) => Math.floor((rows - 1) / ticks);
//@ chunk-7stfs6p0.js:66891-66964 placement
var chartRowScale = (plotCount, valueSpan) =>
  Math.max(
    1,
    Math.min(
      rowsPerTick(CHART_ROW_DENSITIES.at(plotCount - 1) ?? Math.min(...CHART_ROW_DENSITIES), valueSpan),
      KEY_COLUMN_WIDTH,
    ),
  );
//@ chunk-7stfs6p0.js:66964-67030 placement
var ticksInRange = (plot, from, to) =>
  plot.ticks.filter((tick) => tick.position >= from && tick.position <= to);
//@ chunk-7stfs6p0.js:67030-67227 placement
function unstackColumnRows(rows) {
  let lastY = new Map();
  let out = [];
  for (let row of rows) {
    out.push({
      ...row,
      stretches: row.stretches.map((stretch) =>
        stretch.map((point) => ({
          x: point.x,
          y: point.y - (lastY.get(point.x) ?? 0),
        })),
      ),
    });
    for (let stretch of row.stretches.flat()) lastY.set(stretch.x, stretch.y);
  }
  return out;
}
//@ chunk-7stfs6p0.js:67227-67610 placement
function layoutPlotRows(plot, layout, isSinglePlot) {
  let isColumns = layout.form === "columns";
  let rows = isColumns && !isSinglePlot ? unstackColumnRows(plot.rows) : plot.rows;
  let mapped = rows.flatMap((row) => row.stretches.flat()).map((point) => point.y);
  let minY = isColumns ? 0 : Math.min(...mapped);
  let max = Math.max(...mapped);
  let lastTickIndex = plot.ticks.length - 1;
  let hasStatsRoom = ticksInRange(plot, minY, max).length >= MIN_STATS_WIDTH;
  let baseY = hasStatsRoom ? minY : 0;
  let topY = hasStatsRoom ? max : 1;
  let rowScale = max > minY ? chartRowScale(layout.plots.length, (topY - baseY) * lastTickIndex) : 1;
  let rawRow = (y) => roundToScale((1 - y) * lastTickIndex * rowScale);
  let rowOf = (y) => Math.round(rawRow(y));
  let yOf = (y) => HALF + rawRow(y) - rowOf(topY);
  return {
    ...plot,
    rows,
    yOf,
    height: rowOf(baseY) - rowOf(topY) + 1,
    endKeys: groupMarksByRow(isSinglePlot ? [] : rows, yOf),
  };
}
//@ chunk-7stfs6p0.js:67610-67674 placement
function keyColumnWidth(plots) {
  return plots.some((plot) => plot.rows.some((row) => row.key)) ? MIN_SEGMENT : 0;
}
//@ chunk-7stfs6p0.js:67674-67787 placement
function endKeysWidth(rows) {
  let max = Math.max(0, ...rows.flatMap((row) => [...row.endKeys.values()]).map((mark) => mark.length));
  return max > 0 ? DEFAULT_ROW_OPTIONS + max : 0;
}
//@ chunk-7stfs6p0.js:67787-67952 placement
function columnAreaLayout(left, columnWidth, columnCount) {
  let max = Math.max(1, columnWidth - 1);
  let xOf = (fraction) => left + Math.floor(roundToScale(fraction * columnCount)) * columnWidth;
  let tickXOf = (tick) => Math.min(xOf(tick), xOf((columnCount - 1) / columnCount)) + max / MIN_LANE_WIDTH;
  return {
    left,
    width: columnWidth * columnCount,
    columnWidth: max,
    xOf,
    tickXOf,
  };
}
//@ chunk-7stfs6p0.js:67952-68044 placement
function continuousAreaLayout(left, width) {
  let xOf = (fraction) => left + fraction * (width - HALF);
  return {
    left,
    width,
    columnWidth: 0,
    xOf,
    tickXOf: xOf,
  };
}
//@ chunk-7stfs6p0.js:68044-68179 placement
function layoutChartArea(plots, width, columnCount) {
  let labelWidth =
    maxDisplayWidth(plots.flatMap((plot) => plot.ticks.map((tick) => tick.label))) + MIN_MARK_ROWS;
  let areaWidth = width - labelWidth;
  let cellWidth = columnCount > 0 ? Math.floor(areaWidth / columnCount) : 0;
  return cellWidth === 0
    ? continuousAreaLayout(labelWidth, areaWidth)
    : columnAreaLayout(labelWidth, cellWidth, columnCount);
}
//@ chunk-7stfs6p0.js:68179-68366 placement
function layoutPlots_2(layout, columns) {
  let plots = layout.plots;
  let area = layoutChartArea(plots, columns - keyColumnWidth(plots), layout.timeline.periodStarts.length);
  let isColumns = area.columnWidth > 0;
  let rows = plots.map((plot) => layoutPlotRows(plot, layout, isColumns));
  return isColumns
    ? {
        area,
        drawnPlots: rows,
      }
    : {
        area: layoutChartArea(plots, columns - endKeysWidth(rows), 0),
        drawnPlots: rows,
      };
}
//@ chunk-7stfs6p0.js:68366-68416 placement
var axisRowShape = (at, gridWidth) => ({
  kind: "axisRow",
  at,
  gridWidth,
});
//@ chunk-7stfs6p0.js:68416-68472 placement
var flattenThinStack = (parts) =>
  parts.map((part, index) => ({
    ink: part.ink,
    height: index > 0 ? 0 : BAR_GAP_FRACTION,
  }));
//@ chunk-7stfs6p0.js:68472-68538 placement
var stackShape = (at, area, parts) => ({
  kind: "stack",
  at,
  width: area.columnWidth,
  parts,
});
//@ chunk-7stfs6p0.js:68538-68711 placement
var toColumnStack =
  (baseline, area) =>
  ([x, points]) => {
    let parts = [];
    let previous = {
      y: baseline,
      position: 0,
    };
    for (let point of points) {
      if (point.position > previous.position)
        parts.push({
          height: previous.y - point.y,
          ink: point.ink,
        });
      previous = point;
    }
    return stackShape(
      {
        x,
        y: baseline,
      },
      area,
      baseline - previous.y < BAR_GAP_FRACTION ? flattenThinStack(parts) : parts,
    );
  };
//@ chunk-7stfs6p0.js:68711-68828 placement
var groupPointsByColumn = (plot) =>
  groupIndexBy(
    plot.rows.flatMap((row) =>
      row.stretches.flat().map((stretch) => ({
        ...plot.toCells(stretch),
        position: stretch.y,
        ink: row.ink,
      })),
    ),
    (point) => point.x,
  );
//@ chunk-7stfs6p0.js:68828-68890 placement
var columnStacks = (plot) =>
  [...groupPointsByColumn(plot)].map(
    toColumnStack(
      plot.toCells({
        x: 0,
        y: 0,
      }).y,
      plot.area,
    ),
  );
//@ chunk-7stfs6p0.js:68890-68954 placement
var markFlag = (area) => (mark) => ({
  x: area.tickXOf(mark.position),
  text: truncateMiddle(mark.label, AXIS_LABEL_INDENT),
});
//@ chunk-7stfs6p0.js:68954-68999 placement
var lineShape = (points, ink) => ({
  kind: "line",
  ink,
  points,
});
//@ chunk-7stfs6p0.js:68999-69098 placement (2.1.88 match: diff, 0.8)
var pointSegment = (prev, next) =>
  [prev.x - HALF, prev.x + HALF].map((x) => ({
    x: Math.max(next.left, Math.min(x, next.left + next.width - BAR_FRACTION)),
    y: prev.y,
  }));
//@ chunk-7stfs6p0.js:69098-69270 placement (2.1.88 match: diff, 0.795)
var decimateLinePoints = (points) =>
  [...groupIndexBy(points, (point) => Math.floor(point.x / HALF)).values()].flatMap((points) => {
    let sorted = points.toSorted((a, b) => a.y - b.y);
    let kept = [points[0], sorted[0], sorted.at(-1), points.at(-1)];
    return points.filter((point) => kept.includes(point));
  });
//@ chunk-7stfs6p0.js:69270-69312 placement
var linePoints = (points, area) =>
  points.length > 1 ? decimateLinePoints(points) : pointSegment(points[0], area);
//@ chunk-7stfs6p0.js:69312-69508 placement
function splitLineRuns(stretches) {
  let runs = [];
  let current = [];
  let lastX = -1 / 0;
  for (let [first, ...rest] of stretches) {
    if (first === undefined) continue;
    let lead = rest.length === 0 ? HALF : 0;
    if (first.x - lead - lastX < MIN_LEGEND_COLUMN) current.push(first, ...rest);
    else {
      let run = [first, ...rest];
      runs.push(run);
      current = run;
    }
    lastX = (rest.at(-1) ?? first).x + lead;
  }
  return runs;
}
//@ chunk-7stfs6p0.js:69508-69667 placement
function lineShapes({ rows, area, toCells }) {
  let shapes = [];
  for (let row of rows.toReversed())
    for (let run of splitLineRuns(row.stretches.map((stretch) => stretch.map(toCells))))
      shapes.push(lineShape(linePoints(run, area), row.ink));
  return shapes;
}
//@ chunk-7stfs6p0.js:69667-69756 placement
var axisTickRow = (markCells, area) =>
  rangeIndices(area.width)
    .map((index) => (markCells.some((mark) => mark.column === index) ? "\u252C" : "\u2500"))
    .join("");
//@ chunk-7stfs6p0.js:69756-69851 placement
var xAxisShapes = (layout, labels) =>
  textShapeOrEmpty({
    at: {
      x: layout.area.left - 1,
      y: layout.room.rows,
    },
    text: `\u2514${axisTickRow(labels, layout.area)}`,
    ink: "quiet",
  });
//@ chunk-7stfs6p0.js:69851-69938 placement
var xLabelShapes = (labels, area, y) =>
  labels.flatMap((label) =>
    textShapeOrEmpty({
      at: {
        x: area.left + label.start,
        y,
      },
      text: label.text,
      ink: "quiet",
    }),
  );
//@ chunk-7stfs6p0.js:69938-70018 placement
var periodPosition = (timeline) => (ms) =>
  (timeline.periodStarts.findIndex((periodStart) => periodStart >= ms) + MARK_FRACTION) /
  timeline.periodStarts.length;
//@ chunk-7stfs6p0.js:70018-70072 placement
var columnOfTime = (area, steps) => (ms) => Math.floor(area.tickXOf(steps(ms)) - area.left);
//@ chunk-7stfs6p0.js:70072-70253 placement
function xAxisLabels(layout) {
  let isColumns = layout.area.columnWidth > 0;
  let columnOf = columnOfTime(
    layout.area,
    isColumns ? periodPosition(layout.timeline) : tickStepsFor(layout.timeline),
  );
  return parseNumberCell(layout.timeline.dataSpan, layout.timeline.step, {
    columns: layout.area.width,
    columnOf,
    areCentred: isColumns,
  });
}
//@ chunk-7stfs6p0.js:70253-70563 placement
function drawXAxis(layout) {
  let labels = xAxisLabels(layout);
  let labelRow = layout.room.rows + 1;
  let flagShapes = [];
  let rows = labelRow + 1;
  let lastEnd;
  for (let flag of layout.flags.filter((flag) => flag.text !== "")) {
    let width = displayWidth(flag.text);
    let floored = Math.floor(Math.min(flag.x, layout.room.columns - width));
    if (lastEnd === undefined || floored < lastEnd) rows += 1;
    flagShapes.push(
      ...textShapeOrEmpty({
        at: {
          x: floored,
          y: rows - 1,
        },
        text: flag.text,
        ink: "words",
      }),
    );
    lastEnd = floored + width + DEFAULT_ROW_OPTIONS;
  }
  return {
    shapes: [...xAxisShapes(layout, labels), ...xLabelShapes(labels, layout.area, labelRow), ...flagShapes],
    rows,
  };
}
//@ chunk-7stfs6p0.js:70563-70616 placement
var toPlotCells = (area, drawnPlot, baseRow) => (point) => ({
  x: area.xOf(point.x),
  y: baseRow + drawnPlot.yOf(point.y),
});
//@ chunk-7stfs6p0.js:70616-71621 placement
function drawLineOrColumnChart({ room, chart, plotsLayout, headerTexts }) {
  let { area, drawnPlots } = plotsLayout;
  let isColumns = area.columnWidth > 0;
  let rowLabels = layoutRows({
    rows: drawnPlots.flatMap((drawnPlot) => drawnPlot.rows),
    columns: room.columns,
    lane: DEFAULT_LANE_OPTIONS,
    headerTexts,
    left: area.left,
  });
  let hasLabels = rowLabels.shownNames.size + rowLabels.statColumns.length > 0;
  let mapped = chart.marks.map(markFlag(area));
  let drawSeries = isColumns ? columnStacks : lineShapes;
  let shapes = [];
  let rows = room.rows;
  for (let drawnPlot of drawnPlots) {
    for (let row of hasLabels ? drawnPlot.rows : []) {
      let labels = drawRowLabels(rowLabels, row, rows);
      shapes.push(labels.shapes);
      rows = labels.rows;
    }
    let plotTop = rows;
    let plotEnd = plotTop + drawnPlot.height;
    for (let row = plotTop; row < plotEnd; row++) {
      let found = drawnPlot.ticks.find((tick) => plotTop + Math.floor(drawnPlot.yOf(tick.position)) === row);
      let label = found?.label ?? "";
      shapes.push(
        textShapeOrEmpty({
          at: {
            x: area.left - MIN_MARK_ROWS - displayWidth(label),
            y: row,
          },
          text: label,
          ink: "quiet",
        }),
        [
          axisRowShape(
            {
              x: area.left - 1,
              y: row,
            },
            found ? area.width + HALF : 0,
          ),
        ],
      );
    }
    shapes.push(
      drawSeries({
        rows: drawnPlot.rows,
        area,
        toCells: toPlotCells(area, drawnPlot, plotTop),
      }),
    );
    for (let [row, marks] of drawnPlot.endKeys)
      for (let [column, mark] of marks.entries())
        shapes.push(
          textShapeOrEmpty({
            at: {
              x: area.left + area.width + DEFAULT_ROW_OPTIONS + column,
              y: plotTop + row,
            },
            text: mark.key,
            ink: mark.ink,
          }),
        );
    shapes.push(
      mapped.map((flag) =>
        lineShape(
          [plotTop, plotEnd - BAR_FRACTION].map((y) => ({
            x: flag.x,
            y,
          })),
          "quiet",
        ),
      ),
    );
    rows = plotEnd;
  }
  let axis = drawXAxis({
    room: {
      columns: room.columns,
      rows,
    },
    timeline: chart.timeline,
    area,
    flags: mapped,
  });
  let mergedColumns = chart.form === "columns" && !isColumns;
  return {
    shapes: [...shapes.flat(), ...axis.shapes],
    rows: axis.rows,
    notes: mergedColumns ? [chart.mergedColumnsNote] : [],
  };
}
//@ chunk-7stfs6p0.js:71621-71680 placement
var bandShape = (rows, parts) => ({
  kind: "band",
  at: {
    x: 0,
    y: rows,
  },
  rows: MIN_CHART_WIDTH,
  parts,
});
//@ chunk-7stfs6p0.js:71680-71752 placement
var shareKeyShape = (part, y) =>
  textShapeOrEmpty({
    at: {
      x: Math.floor(part.middle),
      y,
    },
    text: part.key,
    ink: part.ink,
  });
//@ chunk-7stfs6p0.js:71752-71799 placement
var sharePart = (row, width, end) => ({
  ...row,
  width,
  middle: end - width / MIN_LANE_WIDTH,
});
//@ chunk-7stfs6p0.js:71799-72215 placement
function drawShareBar(frame, rows) {
  let mapped = rows.map((row) => (row.share > 0 ? Math.max(row.share * frame.columns, MIN_ROWS_TO_DRAW) : 0));
  let overflow = stableSum(mapped) - frame.columns;
  let index = mapped.indexOf(Math.max(...mapped));
  let parts = [];
  let end = 0;
  for (let [rowIndex, row] of rows.entries()) {
    let width = (mapped[rowIndex] ?? 0) - (rowIndex === index ? overflow : 0);
    if (width > 0) {
      end += width;
      parts.push(sharePart(row, width, end));
    }
  }
  let labelRow = frame.rows + MIN_CHART_WIDTH;
  let labelRows = labelRow + 1;
  let rowLabels = layoutRows({
    rows,
    columns: frame.columns,
    lane: DEFAULT_LANE_OPTIONS,
    headerTexts: [],
    left: 0,
  });
  return {
    shapes: [
      bandShape(frame.rows, parts),
      ...parts.flatMap((part) => shareKeyShape(part, labelRow)),
      ...rows.flatMap((row, index) => drawRowLabels(rowLabels, row, labelRows + index).shapes),
    ],
    rows: labelRows + rows.length,
  };
}
//@ chunk-7stfs6p0.js:72215-72264 placement
var fartherFrom = (target, a, b) => (Math.abs(a - target) >= Math.abs(b - target) ? a : b);
//@ chunk-7stfs6p0.js:72264-72311 placement
var bucketIndex = (bucketCount) => (x) => Math.min(bucketCount - 1, Math.floor(x * bucketCount));
//@ chunk-7stfs6p0.js:72311-72571 placement (2.1.88 match: diff, 0.806)
function resampleSparkline(prev, next) {
  let list = Array.from(Array(next), () => null);
  let mapped = prev.flat().map((point) => point.y);
  let meanY = stableSum(mapped) / mapped.length;
  let bucketOf = bucketIndex(next);
  for (let stretch of prev)
    for (let [index, point] of stretch.entries()) {
      let fromBucket = bucketOf(point.x);
      let max = Math.max(fromBucket, bucketOf(stretch[index + 1]?.x ?? point.x) - 1);
      for (let bucket = fromBucket; bucket <= max; bucket++)
        list[bucket] = Math.max(BAR_GAP_FRACTION, fartherFrom(meanY, point.y, list[bucket] ?? point.y));
    }
  return list;
}
//@ chunk-7stfs6p0.js:72571-72670 placement
var sparklineHeights = (row, rowLayout, step) =>
  resampleSparkline(row.stretches, step).flatMap((height) =>
    Array.from(Array(Math.floor(rowLayout.laneWidth / step)), () => height),
  );
//@ chunk-7stfs6p0.js:72670-72710 placement
var SPARK_LANE = {
  minWidth: 16,
  statsBeforeNames: 0,
};
//@ chunk-7stfs6p0.js:72710-72764 placement
var stripShape = (at, heights, ink) => ({
  kind: "strip",
  at,
  heights,
  ink,
});
//@ chunk-7stfs6p0.js:72764-73043 placement
function drawSparklines(frame, chart, headerTexts) {
  let rowLayout = layoutRows({
    rows: chart.rows,
    columns: frame.columns,
    lane: SPARK_LANE,
    headerTexts,
    left: 0,
  });
  let min = Math.min(rowLayout.laneWidth, Math.round(1 / chart.medianStep) + 1);
  return {
    shapes: chart.rows.flatMap((row, index) => {
      let labels = drawRowLabels(rowLayout, row, frame.rows + index);
      return [...labels.shapes, stripShape(labels.lane, sparklineHeights(row, rowLayout, min), row.ink)];
    }),
    rows: frame.rows + chart.rows.length,
  };
}
//@ chunk-7stfs6p0.js:73043-73341 placement
function drawChartBody(chart, frame, headerTexts) {
  switch (chart.form) {
    case "bars":
      return {
        ...drawBarRows(frame, chart.rows, headerTexts),
        notes: [],
      };
    case "share":
      return {
        ...drawShareBar(frame, chart.rows),
        notes: [],
      };
    case "sparks":
      return {
        ...drawSparklines(frame, chart, headerTexts),
        notes: [],
      };
    case "line":
    case "columns": {
      let plotsLayout = layoutPlots_2(chart, frame.columns);
      return plotsLayout.area.width >= MIN_AXIS_WIDTH
        ? drawLineOrColumnChart({
            room: frame,
            chart,
            plotsLayout,
            headerTexts,
          })
        : undefined;
    }
  }
}
//@ chunk-7stfs6p0.js:73341-73490 placement
function wrappedTextRows(room, lines, ink) {
  let flattened = lines.flatMap((line) => wrapToWidth(line, room.columns));
  return {
    shapes: flattened.flatMap((text, index) =>
      textShapeOrEmpty({
        at: {
          x: 0,
          y: room.rows + index,
        },
        text,
        ink,
      }),
    ),
    rows: room.rows + flattened.length,
  };
}
//@ chunk-7stfs6p0.js:73490-73570 placement
var headerFactShape = (rows, x, fact) =>
  textShapeOrEmpty({
    at: {
      x: x + DEFAULT_ROW_OPTIONS,
      y: rows - 1,
    },
    text: `${SEP.trimStart()}${fact}`,
    ink: "quiet",
  });
//@ chunk-7stfs6p0.js:73570-73583 placement
var SEPARATOR_WIDTH; // deferred: uses displayWidth (./chartSchema.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7stfs6p0.js:73570", () => {
  SEPARATOR_WIDTH = displayWidth(SEP);
});
//@ chunk-7stfs6p0.js:73583-73893 placement
function drawHeader(room, header) {
  let filtered = [header.title, ...header.facts].filter((part) => part !== "");
  let shapes = [];
  let rows = room.rows;
  let lastEnd = 0;
  for (let [index, part] of filtered.entries()) {
    let end = lastEnd + SEPARATOR_WIDTH + displayWidth(part);
    if (index === 0 || end > room.columns) {
      let wrapped = wrappedTextRows(
        {
          columns: room.columns,
          rows,
        },
        [part],
        index === 0 ? "title" : "quiet",
      );
      shapes.push(...wrapped.shapes);
      rows = wrapped.rows;
      lastEnd = displayWidth(part);
    } else {
      shapes.push(...headerFactShape(rows, lastEnd, part));
      lastEnd = end;
    }
  }
  return {
    shapes,
    rows,
    texts: filtered,
  };
}
//@ chunk-7stfs6p0.js:73893-73949 placement
var chartResult = (columns, body) => ({
  columns,
  rows: body.rows,
  shapes: body.shapes,
});
//@ chunk-7stfs6p0.js:73949-74006 placement
var chartAsText = (chart, columns) =>
  chartResult(
    columns,
    wrappedTextRows(
      {
        columns,
        rows: 0,
      },
      renderLegend(chart),
      "words",
    ),
  );
//@ chunk-7stfs6p0.js:74006-74091 placement
var partsLeftOutShape = (text, y) => ({
  kind: "text",
  at: {
    x: 0,
    y,
  },
  text,
  ink: "quiet",
  isAboutPartsLeftOut: true,
});
//@ chunk-7stfs6p0.js:74091-74195 placement
function drawThinPartsNote(room, thinPartsNote) {
  let lines = wrapToWidth(thinPartsNote, room.columns);
  return {
    shapes: lines.map((line, index) => partsLeftOutShape(line, room.rows + index)),
    rows: room.rows + lines.length,
  };
}
//@ chunk-7stfs6p0.js:74195-74581 placement
function layoutChart(chart, columns) {
  if (columns < MIN_PLOT_WIDTH) return chartAsText(chart, columns);
  let header = drawHeader(
    {
      columns,
      rows: 0,
    },
    chart.header,
  );
  let body = drawChartBody(
    chart,
    {
      columns,
      rows: header.rows,
    },
    header.texts,
  );
  if (body === undefined) return chartAsText(chart, columns);
  let noteRows = wrappedTextRows(
    {
      columns,
      rows: body.rows,
    },
    [...chart.notes, ...body.notes],
    "quiet",
  );
  let thinNote =
    chart.form === "columns"
      ? drawThinPartsNote(
          {
            columns,
            rows: noteRows.rows,
          },
          chart.thinPartsNote,
        )
      : {
          shapes: [],
          rows: noteRows.rows,
        };
  return chartResult(columns, {
    shapes: [...header.shapes, ...body.shapes, ...noteRows.shapes, ...thinNote.shapes],
    rows: thinNote.rows,
  });
}
//@ chunk-7stfs6p0.js:74581-74628 placement
var glyphCell = (glyph, ink, background) => ({
  glyph,
  ink,
  background,
});
//@ chunk-7stfs6p0.js:74628-74639 placement
var MIN_PART_EIGHTHS = 0.5;
//@ chunk-7stfs6p0.js:74639-74648 placement
var MAX_BLEND_PARTS = 2;
//@ chunk-7stfs6p0.js:74648-74657 placement
var EIGHTHS = 8;
//@ chunk-7stfs6p0.js:74657-74666 placement
var THIN_TOP_EIGHTHS = 3;
//@ chunk-7stfs6p0.js:74666-74679 placement
var BRAILLE_BASE = 10240;
//@ chunk-7stfs6p0.js:74679-74688 placement
var BRAILLE_COLS = 2;
//@ chunk-7stfs6p0.js:74688-74697 placement
var BRAILLE_ROWS = 4;
//@ chunk-7stfs6p0.js:74697-74708 placement
var BLANK = " ";
//@ chunk-7stfs6p0.js:74708-74724 placement
var FULL_BLOCK = "\u2588";
//@ chunk-7stfs6p0.js:74724-74740 placement
var LOWER_THREE_QUARTERS = "\u2586";
//@ chunk-7stfs6p0.js:74740-74756 placement
var MEDIUM_SHADE = "\u2592";
//@ chunk-7stfs6p0.js:74756-74811 placement
var topTwoParts = (parts, sorted) => parts.filter((part) => sorted.slice(0, MAX_BLEND_PARTS).includes(part));
//@ chunk-7stfs6p0.js:74811-75203 placement
function blendEighthGlyph(parts, base, glyphs) {
  let parts_2 = parts
    .map((part) => ({
      ink: part.ink,
      size: Math.min(part.to, base + EIGHTHS) - Math.max(part.from, base),
    }))
    .filter((part) => part.size >= MIN_PART_EIGHTHS);
  let sorted = parts_2.toSorted((a, b) => b.size - a.size);
  let [largest] = sorted;
  if (largest === undefined) return;
  let rounded = Math.round((parts.at(-1)?.to ?? base) - base);
  if (rounded < EIGHTHS) {
    let glyph = glyphs[rounded];
    return glyph
      ? {
          glyph,
          ink: largest.ink,
        }
      : undefined;
  }
  let [primary = largest, secondary] = topTwoParts(parts_2, sorted);
  let glyph = glyphs[Math.round((primary.size / (primary.size + (secondary?.size ?? 0))) * EIGHTHS)];
  return glyph
    ? glyphCell(glyph, primary.ink, secondary?.ink)
    : {
        glyph: FULL_BLOCK,
        ink: largest.ink,
      };
}
//@ chunk-7stfs6p0.js:75203-75239 placement
var GRID_DOT = {
  glyph: "\u2508",
  ink: "quiet",
};
//@ chunk-7stfs6p0.js:75239-75273 placement
var axisGlyph = (gridWidth) => (gridWidth > 0 ? "\u2524" : "\u2502");
//@ chunk-7stfs6p0.js:75273-75303 placement
var BLANK_CELL = {
  glyph: BLANK,
  ink: "words",
};
//@ chunk-7stfs6p0.js:75303-75622 placement
function createGlyphGrid(size) {
  let list = Array.from(
    {
      length: size.rows * size.columns,
    },
    () => BLANK_CELL,
  );
  function indexOf(position) {
    return Number.isInteger(position.x) &&
      Number.isInteger(position.y) &&
      position.x >= 0 &&
      position.x < size.columns
      ? position.y * size.columns + position.x
      : -1;
  }
  return {
    cellAt: (position) => list[indexOf(position)],
    set: (position, cell) => {
      let cellIndex = indexOf(position);
      if (list[cellIndex] !== undefined) list[cellIndex] = cell;
    },
    rows: () =>
      rangeIndices(size.rows).map((row) => list.slice(row * size.columns, (row + 1) * size.columns)),
  };
}
//@ chunk-7stfs6p0.js:75622-75679 placement
var thinTopGlyph = (part, remaining) => ({
  glyph: remaining < THIN_TOP_EIGHTHS ? "\u2501" : "\u2580",
  ink: part.ink,
});
//@ chunk-7stfs6p0.js:75679-75754 placement
var LOWER_EIGHTHS = ["", "\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587"];
//@ chunk-7stfs6p0.js:75754-75784 placement
var BRAILLE_DOT_BITS = [1, 2, 4, 64, 8, 16, 32, 128];
//@ chunk-7stfs6p0.js:75784-75859 placement
var LEFT_EIGHTHS = ["", "\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589"];
//@ chunk-7stfs6p0.js:75859-75897 placement
var partRange = (from, to, ink) => ({
  from,
  to,
  ink,
});
//@ chunk-7stfs6p0.js:75897-75994 placement
function stackRanges(parts, heightOf, offset) {
  let eighthsOf = (part) => heightOf(part) * EIGHTHS;
  return prefixSums(parts, eighthsOf, offset).map(({ part, end }) =>
    partRange(end - eighthsOf(part), end, part.ink),
  );
}
//@ chunk-7stfs6p0.js:75994-76330 placement
function drawStack(glyphGrid, { at, width, parts }) {
  let row = Math.ceil(at.y);
  let subRow = (row - at.y) * EIGHTHS;
  let ranges = stackRanges(parts, (part) => part.height, subRow);
  let to = ranges.at(-1)?.to ?? 0;
  let inks = new Set();
  for (let eighth = 0; eighth < to; eighth += EIGHTHS) {
    let cell = blendEighthGlyph(ranges, eighth, LOWER_EIGHTHS);
    if (cell === undefined) continue;
    let painted = eighth < subRow ? thinTopGlyph(cell, to - subRow) : cell;
    inks.add(painted.ink).add(painted.background);
    for (let j = 0; j < Math.round(width); j++)
      glyphGrid.set(
        {
          x: at.x + j,
          y: row - 1 - eighth / EIGHTHS,
        },
        painted,
      );
  }
  return parts.every((part) => inks.has(part.ink));
}
//@ chunk-7stfs6p0.js:76330-76557 placement
function drawBar(glyphGrid, { at, width, ink, isHatched }) {
  let glyph = LEFT_EIGHTHS[Math.max(1, Math.round(width * EIGHTHS))];
  if (glyph !== undefined && !isHatched) {
    glyphGrid.set(at, {
      glyph,
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
//@ chunk-7stfs6p0.js:76557-76647 placement
var brailleDotBit = (x, y) =>
  BRAILLE_DOT_BITS[
    Math.floor((x - Math.floor(x)) * BRAILLE_COLS) * BRAILLE_ROWS +
      Math.floor((y - Math.floor(y)) * BRAILLE_ROWS)
  ] ?? 0;
//@ chunk-7stfs6p0.js:76647-76695 placement
var countBits = (bits) => BRAILLE_DOT_BITS.reduce((acc, bit) => ((bits & bit) === 0 ? acc : acc + 1), 0);
//@ chunk-7stfs6p0.js:76695-76727 placement
var hasBitCount = (count) => (line) => countBits(line.bits) === count;
//@ chunk-7stfs6p0.js:76727-77053 placement
function mergeBrailleCell(cell, addition) {
  let lines = cell.lines ?? [];
  let mergedLines = [
    ...lines.filter((line) => line.ink !== addition.ink),
    {
      ink: addition.ink,
      bits: (lines.find((line) => line.ink === addition.ink)?.bits ?? 0) | addition.bits,
    },
  ];
  let filtered = mergedLines.filter((line) => line.ink !== "quiet");
  let visible = filtered.length > 0 ? filtered : mergedLines;
  return {
    glyph: String.fromCodePoint(BRAILLE_BASE + visible.reduce((acc, line) => acc | line.bits, 0)),
    ink:
      visible.findLast(hasBitCount(Math.max(...visible.map((line) => countBits(line.bits)))))?.ink ??
      addition.ink,
    lines: mergedLines,
  };
}
//@ chunk-7stfs6p0.js:77053-77408 placement
function drawBrailleLine(glyphGrid, { points, ink }) {
  for (let [index, point] of points.entries()) {
    let from = points[index - 1] ?? point;
    let steps = Math.ceil(
      Math.max(Math.abs(point.x - from.x) * BRAILLE_COLS, Math.abs(point.y - from.y) * BRAILLE_ROWS, 1),
    );
    for (let j = 0; j <= steps; j++) {
      let dotX = from.x + ((point.x - from.x) * j) / steps;
      let dotY = from.y + ((point.y - from.y) * j) / steps;
      let position = {
        x: Math.floor(dotX),
        y: Math.floor(dotY),
      };
      let cell = glyphGrid.cellAt(position);
      if (!cell || !(cell.glyph === BLANK || cell === GRID_DOT || cell.lines !== undefined)) continue;
      glyphGrid.set(
        position,
        mergeBrailleCell(cell, {
          ink,
          bits: brailleDotBit(dotX, dotY),
        }),
      );
    }
  }
}
//@ chunk-7stfs6p0.js:77408-77595 placement
function drawText(glyphGrid, { at, text, ink }) {
  let rounded = Math.round(at.x);
  for (let grapheme of splitGraphemes(text)) {
    let width = displayWidth(grapheme);
    glyphGrid.set(
      {
        x: rounded,
        y: at.y,
      },
      {
        glyph: grapheme,
        ink,
      },
    );
    for (let i = 1; i < width; i++)
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
    rounded += width;
  }
}
//@ chunk-7stfs6p0.js:77595-77658 placement
var cellToRun = (cell) => ({
  text: cell.glyph,
  ink: cell.ink,
  background: cell.background,
});
//@ chunk-7stfs6p0.js:77658-77883 placement
function rowToRuns(cells) {
  let runs = [];
  for (let cell of cells.slice(0, cells.findLastIndex((cell) => cell.glyph !== BLANK) + 1)) {
    let last = runs.at(-1);
    if (
      last &&
      ((last.ink === cell.ink && last.background === cell.background) ||
        (cell.glyph === BLANK && last.background === undefined))
    )
      last.text += cell.glyph;
    else runs.push(cellToRun(cell));
  }
  return runs;
}
//@ chunk-7stfs6p0.js:77883-77920 placement
var sparkGlyph = (height) => LOWER_EIGHTHS[Math.round(height * EIGHTHS)] ?? FULL_BLOCK;
//@ chunk-7stfs6p0.js:77920-78608 placement
function rasterizeChart(chart) {
  let glyphGrid = createGlyphGrid(chart);
  let dropped = false;
  let droppedRows = 0;
  for (let shape of chart.shapes)
    switch (shape.kind) {
      case "text": {
        if (shape.isAboutPartsLeftOut && !dropped) droppedRows += 1;
        else drawText(glyphGrid, shape);
        break;
      }
      case "bar":
        drawBar(glyphGrid, shape);
        break;
      case "stack":
        dropped = !drawStack(glyphGrid, shape) || dropped;
        break;
      case "line":
        drawBrailleLine(glyphGrid, shape);
        break;
      case "strip": {
        let { at, heights, ink } = shape;
        heights.forEach((height, index) => {
          if (height !== null)
            glyphGrid.set(
              {
                x: at.x + index,
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
        let ranges = stackRanges(parts, (part) => part.width, 0);
        for (let eighth = 0; eighth < (ranges.at(-1)?.to ?? 0); eighth += EIGHTHS) {
          let cell = blendEighthGlyph(ranges, eighth, LEFT_EIGHTHS);
          for (let j = 0; cell !== undefined && j < rows; j++)
            glyphGrid.set(
              {
                x: at.x + eighth / EIGHTHS,
                y: at.y + j,
              },
              cell,
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
    .slice(0, chart.rows - droppedRows)
    .map(rowToRuns);
}
//@ chunk-7stfs6p0.js:78608-78669 placement
var svgFill = (ink, extraAttrs = "") => `fill="var(--${ink})"${extraAttrs} data-series="${ink}"`;
//@ chunk-7stfs6p0.js:78669-78678 placement
var SVG_HALF = 2;
//@ chunk-7stfs6p0.js:78678-78689 placement
var SVG_THIN_BAR = 0.7;
//@ chunk-7stfs6p0.js:78689-78700 placement
var SVG_TEXT_DY = 4.5;
//@ chunk-7stfs6p0.js:78700-78710 placement
var SVG_ROW_HEIGHT = 18;
//@ chunk-7stfs6p0.js:78710-78721 placement
var SVG_HALF_CELL = 0.5;
//@ chunk-7stfs6p0.js:78721-78730 placement
var SVG_COL_WIDTH = 8;
//@ chunk-7stfs6p0.js:78730-78742 placement
var SVG_FONT_SIZE = 13.3;
//@ chunk-7stfs6p0.js:78742-78755 placement
var SVG_STROKE = 0.125;
//@ chunk-7stfs6p0.js:78755-78766 placement
var SVG_BAND_PAD = 0.1;
//@ chunk-7stfs6p0.js:78766-78796 placement
var svgY = (row) => (row * SVG_ROW_HEIGHT).toFixed(1);
//@ chunk-7stfs6p0.js:78796-78829 placement
var hasSvgHeight = (part) => svgY(part.height) !== svgY(0);
//@ chunk-7stfs6p0.js:78829-78858 placement
var svgX = (column) => (column * SVG_COL_WIDTH).toFixed(1);
//@ chunk-7stfs6p0.js:78858-78891 placement
var svgPoint = (x, y) => `${svgX(x)},${svgY(y)}`;
//@ chunk-7stfs6p0.js:78891-79008 placement
var svgLine = (from, to, extraAttrs = "") =>
  `<line${extraAttrs} x1="${svgX(from.x)}" y1="${svgY(from.y)}" x2="${svgX(to.x)}" y2="${svgY(to.y)}" stroke="var(--quiet)"/>`;
//@ chunk-7stfs6p0.js:79008-79082 placement (2.1.88 match: diff, 1)
function svgTickLine(line) {
  let x = line.at.x + SVG_HALF_CELL;
  return svgLine(
    {
      x,
      y: line.at.y,
    },
    {
      x,
      y: line.at.y + 1,
    },
  );
}
//@ chunk-7stfs6p0.js:79082-79187 placement
var bandPartRect = (cell, entry) => ({
  x: entry.end - entry.part.width,
  y: cell.at.y + SVG_BAND_PAD,
  width: entry.part.width,
  height: cell.rows - SVG_HALF * SVG_BAND_PAD,
  ink: entry.part.ink,
});
//@ chunk-7stfs6p0.js:79187-79265 placement (2.1.88 match: unionRect, 0.845)
var thinBarRect = (bar) => ({
  x: bar.at.x,
  y: bar.at.y + (1 - SVG_THIN_BAR) / SVG_HALF,
  width: bar.width,
  height: SVG_THIN_BAR,
  ink: bar.ink,
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
