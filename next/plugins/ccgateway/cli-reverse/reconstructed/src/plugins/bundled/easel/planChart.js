/**
 * plugins/bundled/easel/planChart.ts
 *
 * 2.1.316 新增：easel 绘图前的检查与规划：日期拼写、时区混用、单位混用、占比合计、行数上限
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7stfs6p0.js (92)
 * attribution: placement 92
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  matchColumnName,
  readChartData,
  tableSource,
  readTablesFromText,
  MAX_TABLE_ROWS_READ,
} from "./readTable.js";
import {
  uniqueValues,
  stableSum,
  groupIndexBy,
  formatCount,
  truncateMiddle,
  elideList,
  rangeIndices,
} from "./chartSchema.js";
import {
  isTimeCell,
  TIME_FORMATS_HINT,
  parseNumberWithUnit,
  parseTimeCell,
  scaledNumber,
} from "./parseValues.js";
import { unreadNumber } from "./easelMessages.js";
import { spansWeeksWithoutWeekend, formatTimeTick, defaultTimeStep, pickTickStep } from "./timeFormat.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7stfs6p0.js:41306-41316 placement
/**
 * true
 */
var ARE_TICK_FIELDS_ALL = true;
//@ chunk-7stfs6p0.js:41316-41455 placement
/**
 * 同一组标签同一时刻是否有多个读数。
 */
function hasDuplicateReadings(chartData) {
  let mapped = chartData.readings
    .filter((reading) => reading.value !== null)
    .map((reading) => JSON.stringify([reading.groupLabels, reading.ms]));
  return new Set(mapped).size < mapped.length;
}
//@ chunk-7stfs6p0.js:41455-41464 placement
/**
 * 5
 */
var MAX_LISTED_TABLES = 5;
//@ chunk-7stfs6p0.js:41464-41475 placement
/**
 * 120
 */
var MAX_LABEL_TEXT = 120;
//@ chunk-7stfs6p0.js:41475-41484 placement
/**
 * 3
 */
var MAX_LISTED_NAMES = 3;
//@ chunk-7stfs6p0.js:41484-41493 placement
/**
 * 3
 */
var MAX_JOINED_NAMES = 3;
//@ chunk-7stfs6p0.js:41493-41506 placement
/**
 * 65536
 */
var MAX_DATA_TEXT_BYTES = 65536;
//@ chunk-7stfs6p0.js:41506-41517 placement
/**
 * 240
 */
var MAX_TABLE_ROWS = 240;
//@ chunk-7stfs6p0.js:41517-41526 placement
/**
 * 8
 */
var MAX_LISTED_COLUMNS = 8;
//@ chunk-7stfs6p0.js:41526-41535 placement
/**
 * 2
 */
var MIN_ROWS_FOR_CHART = 2;
//@ chunk-7stfs6p0.js:41535-41554 placement
/**
 * 以 ] 或 } 结尾
 */
var JSON_END_RE = /[\]}]\s*$/;
//@ chunk-7stfs6p0.js:41554-41572 placement
/**
 * 以 [ 或 { 开头
 */
var JSON_START_RE = /^\s*[[{]/;
//@ chunk-7stfs6p0.js:41572-41603 placement
/**
 * 以数字开头
 */
var LEADING_NUMBER_RE = /^[^\p{L}\p{N}]*\p{N}/u;
//@ chunk-7stfs6p0.js:41603-41662 placement
/**
 * 列名都能匹配
 */
var allColumnsMatch = (columns) => (table) =>
  columns.every((column) => table.columns.includes(matchColumnName(table, column)));
//@ chunk-7stfs6p0.js:41662-41730 placement
/**
 * 能读出数据且非 bars
 */
function isSingleTableReadable(table, request) {
  let chartData = readChartData(table, request);
  return !("code" in chartData) && chartData.form !== "bars";
}
//@ chunk-7stfs6p0.js:41730-41776 placement
/**
 * 请求里点名的列
 */
var requestColumns = (request) => [request.x ?? [], request.y ?? [], request.by ?? []].flat();
//@ chunk-7stfs6p0.js:41776-41879 placement
/**
 * 多个表时按列名与请求筛选出唯一匹配的表。
 */
function pickMatchingTables(tablesFromText, request) {
  let candidates =
    tablesFromText.length === 1
      ? tablesFromText
      : tablesFromText.filter(allColumnsMatch(requestColumns(request)));
  return candidates.length === 1
    ? candidates
    : candidates.filter((table) => isSingleTableReadable(table, request));
}
//@ chunk-7stfs6p0.js:41879-41919 placement
/**
 * 去重后取前 N 个拼接
 */
var joinFirstNames = (names) => uniqueValues(names).slice(0, MAX_JOINED_NAMES).join(", ");
//@ chunk-7stfs6p0.js:41919-42545 placement
/**
 * 检查时间列（未识别的日期拼写、非时间数字、名称而非时间）。
 */
function checkTimeColumn(roles, reading) {
  let { unreadXCells } = reading;
  let names = unreadXCells.filter(isTimeCell);
  let noReadings = reading.readings.length === 0;
  if (names.length > 0 && (noReadings || names.length === unreadXCells.length))
    return {
      code: "dates_unread",
      why: `${roles.x} holds dates in a spelling that is not read (${joinFirstNames(names)}). ${TIME_FORMATS_HINT}`,
    };
  let names_2 = unreadXCells.filter((unreadXCell) => parseNumberWithUnit(unreadXCell).kind === "number");
  if (names_2.length > 0)
    return {
      code: "x_not_times",
      why: `${roles.x} holds numbers that are not times (${joinFirstNames(names_2)}). A line, columns and sparks run over times. For one bar for each, pass form: "bars"`,
    };
  return noReadings && unreadXCells.length > 0
    ? {
        code: "x_not_times",
        why: `${roles.x} holds names, not times (${joinFirstNames(unreadXCells)}). A line, columns and sparks run over times: for names, pass form: "bars"`,
        fitsBars: true,
      }
    : undefined;
}
//@ chunk-7stfs6p0.js:42545-43356 placement
/**
 * 检查时区混用、整列未读、多行共享同一 x 等。
 */
function checkTimeline({ reading, roles, request, series }) {
  if (new Set(reading.readings.map((reading) => reading.isZoned)).size > 1)
    return {
      code: "zones_mixed",
      why: `${roles.x} mixes times that name a zone with times that name none`,
    };
  let problem = checkTimeColumn(roles, reading);
  if (problem !== undefined) return problem;
  let found = reading.droppedColumns.find((droppedColumn) => droppedColumn.isEntireColumn);
  if (found !== undefined)
    return {
      code: "column_unread",
      why: `a whole column was not read. ${found.sentence}`,
    };
  if (request.combine === undefined && hasDuplicateReadings(reading))
    return {
      code: "rows_share_x",
      why: `several rows share one ${roles.x}; name the columns to split by, or how to combine them (sum, mean, max, min)`,
    };
  if (!(series.length > 0))
    return {
      code: "no_values",
      why: `no cell of ${roles.y.join(", ")} holds a number`,
    };
  let [droppedColumn] = reading.droppedColumns;
  return roles.form === "bars" && droppedColumn !== undefined
    ? {
        code: "bars_partly_unread",
        why: `bars rank a whole list, and part of this one was not read. ${droppedColumn.sentence}`,
      }
    : undefined;
}
//@ chunk-7stfs6p0.js:43356-43443 placement
/**
 * sum/mean/max/min
 */
var AGGREGATORS = {
  sum: stableSum,
  mean: (values) => stableSum(values) / values.length,
  max: (values) => Math.max(...values),
  min: (values) => Math.min(...values),
};
//@ chunk-7stfs6p0.js:43443-43526 placement
/**
 * 最后一点可能仍在累积
 */
var LAST_PERIOD_FILLING_NOTE = "the last point may still be filling: its period had not ended at the call";
//@ chunk-7stfs6p0.js:43526-43589 placement
/**
 * 建议减少行数
 */
var FEWER_ROWS_HINT = "Ask for fewer rows or a shorter span, then chart that";
//@ chunk-7stfs6p0.js:43589-44654 placement
/**
 * 占比图检查：各部分需相加为整体，否则拒绝或提示 combine。
 */
function checkShareChart({ roles, request, series, timeline }) {
  let flattened = series.flatMap((series) => series.samples.map((sample) => sample.value ?? 0));
  let any = flattened.some((value) => value < 0);
  if (request.form === "share" && request.combine !== "sum")
    return {
      code: "share_not_summed",
      why: "a share is the parts of a whole, which add up. Leave combine out, or draw bars",
    };
  if (request.form === "share" && (any || stableSum(flattened) <= 0))
    return {
      code: "share_not_whole",
      why: "the parts of a whole are at or above zero and add up to more. Draw bars",
    };
  if (request.log === true && (request.form ?? roles.form) !== "line")
    return {
      code: "log_not_line",
      why: "only a line has a log scale: all else stands on zero, which a log scale does not have. Draw a line",
    };
  if (roles.form === "columns" && timeline.periodStarts.length === 0)
    return {
      code: "uneven_step",
      why: `the times of ${roles.x} keep no even step (that takes two or more, with few gaps), so a column cannot stand for a period. Rows are not put in buckets of time: pass one row for each period, or draw a line, or pass zone: "local" if the periods are local days`,
    };
  return roles.form === "columns" && any
    ? {
        code: "column_below_zero",
        why: "a column stands on zero and a value is below zero. Draw a line",
      }
    : undefined;
}
//@ chunk-7stfs6p0.js:44654-44709 placement
/**
 * bars 且名字是编的则不用 y
 */
var columnsForForm = (roles, request) => (roles.hasMadeUpNames && request.form === "bars" ? [] : request.y);
//@ chunk-7stfs6p0.js:44709-45228 placement
function describeNotDrawn(mark) {
  let label = mark.mark.label === undefined ? "" : mark.mark.label;
  let timeCell = parseTimeCell(mark.mark.at);
  let prefix = `${label === "" ? "mark" : `mark ${label}`} at ${mark.mark.at} not drawn:`;
  if (!(mark.drawnForm !== "bars" && mark.drawnForm !== "share")) return `${prefix} it has no times`;
  if (mark.drawnForm === "sparks") return `${prefix} sparks have no time axis`;
  if (timeCell.kind !== "time") return `${prefix} ${timeCell.why}`;
  if (timeCell.ms < mark.axisSpan.fromMs || timeCell.ms > mark.axisSpan.untilMs)
    return `${prefix} outside the times drawn`;
  return timeCell.isZoned !== mark.isZoned
    ? `${prefix} name a zone in both the mark and the times, or in neither`
    : {
        ms: timeCell.ms,
        label,
      };
}
//@ chunk-7stfs6p0.js:45228-45298 placement
/**
 * 取单元值
 */
var cellReader = (columnIndex) => (column, row) => {
  let index = columnIndex.get(column);
  return index === undefined ? null : (row[index] ?? null);
};
//@ chunk-7stfs6p0.js:45298-45468 placement
/**
 * 单元格转为读数（时间、分组标签、数值、单位）。
 */
var toReading = (time, baseLabels, chartData) => (column, value) => ({
  ms: time.ms,
  isZoned: time.isZoned,
  column,
  groupLabels: chartData.y.length > 1 ? [...baseLabels, column] : baseLabels,
  value: value.kind === "number" ? value.value : null,
  unit: value.kind === "number" ? value.unit : null,
});
//@ chunk-7stfs6p0.js:45468-45553 placement
/**
 * 按列单位换算
 */
function applyUnitToCell(numberWithUnit, override) {
  let unit = override.unit;
  return numberWithUnit.kind === "number" && !numberWithUnit.unit && !!unit
    ? scaledNumber(numberWithUnit.value, unit)
    : numberWithUnit;
}
//@ chunk-7stfs6p0.js:45553-45592 placement
/**
 * 对数刻度无法表示的读数
 */
var LOG_SCALE_REJECT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7stfs6p0.js:45553", () => {
  LOG_SCALE_REJECT = unreadNumber("a log scale cannot show it");
});
//@ chunk-7stfs6p0.js:45592-45629 placement
/**
 * 零点时间值
 */
var ZERO_TIME = {
  kind: "time",
  ms: 0,
  isZoned: false,
};
//@ chunk-7stfs6p0.js:45629-46632 placement
function describeBarsUnread(table, chartData, request) {
  let readCell = cellReader(new Map(table.columns.map((column, index) => [column, index])));
  let firstRow = table.rows[0] ?? [];
  let filtered = chartData.by.filter((column) =>
    table.rows.some((row) => readCell(column, row) !== readCell(column, firstRow)),
  );
  let isBars = chartData.form === "bars";
  let labelColumns = isBars ? [chartData.x, ...filtered] : filtered;
  let readings = [];
  let dropped = [];
  let unreadXCells = [];
  for (let row of table.rows) {
    let xCell = isBars ? ZERO_TIME : parseTimeCell(readCell(chartData.x, row));
    if (xCell.kind === "unread") unreadXCells.push(readCell(chartData.x, row));
    if (xCell.kind !== "time") {
      dropped.push({
        column: chartData.x,
        quote: `${readCell(chartData.x, row)} (${xCell.why})`,
      });
      continue;
    }
    let reading = toReading(
      xCell,
      labelColumns.map((column) => String(readCell(column, row) ?? "") || `no ${column}`),
      chartData,
    );
    for (let column of chartData.y) {
      let raw = readCell(column, row);
      let parsed = applyUnitToCell(parseNumberWithUnit(raw, request.y !== undefined), request);
      let value =
        request.log === true && parsed.kind === "number" && parsed.value <= 0 ? LOG_SCALE_REJECT : parsed;
      if (value.kind === "unread")
        dropped.push({
          column,
          quote: `${raw} (${value.why})`,
        });
      readings.push(reading(column, value));
    }
  }
  let unitsByColumn = new Map();
  for (let [column, readingList] of groupIndexBy(readings, (reading) => reading.column))
    unitsByColumn.set(
      column,
      uniqueValues(readingList.map((reading) => reading.unit).filter((unit) => unit !== null)),
    );
  return {
    readings,
    units: unitsByColumn,
    sharedLabels: chartData.by
      .filter((column) => !filtered.includes(column))
      .map((column) => String(readCell(column, firstRow) ?? "")),
    droppedColumns: [...groupIndexBy(dropped, (drop) => drop.column)].map(([column, drops]) => ({
      isEntireColumn: drops.length === table.rows.length,
      sentence:
        `${formatCount(drops.length, "cell")} of ${column} not read: ` +
        drops
          .slice(0, MAX_JOINED_NAMES)
          .map((drop) => drop.quote)
          .join(", "),
    })),
    unreadXCells,
  };
}
//@ chunk-7stfs6p0.js:46632-46672 placement
/**
 * 至少一个非空值
 */
var hasAnyValue = (series) => series.some((series) => series.value !== null);
//@ chunk-7stfs6p0.js:46672-46699 placement
/**
 * 条件或拆分判断
 */
var orHasSplit = (hasSplit, reads, zone) => hasSplit || spansWeeksWithoutWeekend(reads, zone);
//@ chunk-7stfs6p0.js:46699-46821 placement
/**
 * 合并同一时刻的多个读数。
 */
var combineSamplesAt = (groups, combine) => (ms) => {
  let filtered = (groups.get(ms) ?? []).map((sample) => sample.value).filter((value) => value !== null);
  return {
    ms,
    value: filtered.length > 0 ? combine(filtered) : null,
  };
};
//@ chunk-7stfs6p0.js:46821-46885 placement
/**
 * 系列标题
 */
var seriesTitle = (reads, options) =>
  truncateMiddle(reads[0]?.groupLabels.join(" ") || options.fallbackName, MAX_LABEL_TEXT);
//@ chunk-7stfs6p0.js:46885-46938 placement
/**
 * 去重排序的时间戳
 */
var sortedUniqueTimes = (reads) => uniqueValues(reads.map((read) => read.ms)).toSorted((a, b) => a - b);
//@ chunk-7stfs6p0.js:46938-47140 placement
/**
 * 由读数生成一个系列（单位、名称、按周期的样本）。
 */
function buildSeries(reads, context, hasSplit) {
  let times = sortedUniqueTimes(reads);
  let column = reads[0]?.column ?? "";
  return {
    unit: context.reading.units.get(column)?.[0] ?? "",
    name: seriesTitle(reads, context),
    measure: column,
    samples: (
      formatTimeTick(times, context, orHasSplit(hasSplit, times, context.zone))?.periodStarts ?? times
    ).map(
      combineSamplesAt(
        groupIndexBy(reads, (read) => read.ms),
        context.combine,
      ),
    ),
  };
}
//@ chunk-7stfs6p0.js:47140-47400 placement
/**
 * 按分组生成全部时间序列与空系列名，并计算时间网格。
 */
function buildTimeSeries(options) {
  let series = [];
  let emptyNames = [];
  let byLabels = groupIndexBy(options.reading.readings, (read) => JSON.stringify(read.groupLabels));
  let times = sortedUniqueTimes([...byLabels.values()].filter(hasAnyValue).flat());
  let hasSplit = spansWeeksWithoutWeekend(times, options.zone);
  for (let reads of byLabels.values())
    if (hasAnyValue(reads)) series.push(buildSeries(reads, options, hasSplit));
    else emptyNames.push(seriesTitle(reads, options));
  return {
    series,
    emptyNames,
    times,
    grid: formatTimeTick(times, options, hasSplit),
  };
}
//@ chunk-7stfs6p0.js:47400-47455 placement
/**
 * 生成拒绝结果
 */
var refusedResult = (problem, tables = []) => ({
  kind: "refused",
  problem,
  tables,
});
//@ chunk-7stfs6p0.js:47455-47509 placement
/**
 * 带表名的拒绝结果
 */
var refuseWithTable = (table, refusal) =>
  refusedResult(
    {
      ...refusal,
      why: `${tableSource(table)}: ${refusal.why}`,
    },
    [table],
  );
//@ chunk-7stfs6p0.js:47509-47682 placement
/**
 * 系列标题（列名或共享标签）。
 */
function seriesTitle_2(columns, request, reading) {
  let columnLabel =
    columns.length > MAX_LISTED_COLUMNS ? formatCount(columns.length, "column") : columns.join(", ");
  let noYColumn = request.y === undefined;
  return truncateMiddle(
    (noYColumn ? reading.sharedLabels : [columnLabel, ...reading.sharedLabels])
      .filter((label) => label !== "")
      .join(" ") || columnLabel,
    MAX_TABLE_ROWS,
  );
}
//@ chunk-7stfs6p0.js:47682-47772 placement
/**
 * 求时间范围
 */
function timeRangeOf(source) {
  let first = source.times[0] ?? 0;
  return {
    fromMs: first,
    untilMs: source.times.at(-1) ?? first,
    zone: source.zone,
  };
}
//@ chunk-7stfs6p0.js:47772-47829 placement
/**
 * 刻度起点（不走字段）
 */
var tickTimeStart = (source) => ({
  zone: source.zone,
  areTicks: !ARE_TICK_FIELDS_ALL,
  fieldsBefore: [],
});
//@ chunk-7stfs6p0.js:47829-48155 placement
function defaultFormFor(source) {
  let dataSpan = timeRangeOf(source);
  let precision = defaultTimeStep(source.times, source.zone);
  let grid = source.readAs === "columns" ? source.grid : null;
  let isBars = source.readAs === "bars";
  let joined = pickTickStep(
    uniqueValues([dataSpan.fromMs, dataSpan.untilMs]),
    precision,
    tickTimeStart(source),
  ).join(" \u2192 ");
  return {
    dataSpan,
    axisSpan: grid
      ? {
          ...dataSpan,
          untilMs: grid.endMs,
        }
      : dataSpan,
    precision,
    step: source.grid?.step ?? precision,
    spanLabels: isBars ? [] : [source.isZoned ? `${joined} ${source.zone}` : joined],
    periodStarts: grid?.periodStarts ?? [],
  };
}
//@ chunk-7stfs6p0.js:48155-48870 placement
function checkUnitsMixed(reading, chartRequest, request) {
  let unitsPerColumn = [...reading.units.values()];
  if (unitsPerColumn.some((units) => units.length > 1)) {
    let mapped = unitsPerColumn.flat().map((unit) => unit || "none");
    let hasNoUnit = mapped.includes("none") && new Set(mapped).size === MIN_ROWS_FOR_CHART;
    return {
      code: "units_mixed",
      why:
        `the values of a column carry different units (${mapped.join(", ")}). ` +
        (hasNoUnit
          ? "Name what the bare numbers are in as unit"
          : "Convert them to one unit, or chart the rows of each unit in a call of its own"),
    };
  }
  let columnsByUnit = groupIndexBy(reading.units.keys(), (column) => reading.units.get(column)?.[0] ?? "");
  return (chartRequest.form === "bars" || request.form === "sparks") && columnsByUnit.size > 1
    ? {
        code: "units_differ",
        why:
          (request.form === "sparks" ? "sparks" : "bars") +
          " share one scale, and the y columns are in different units (" +
          [...columnsByUnit]
            .map(([unit, columns]) => `${columns.join(", ")} in ${unit || "no unit"}`)
            .join("; ") +
          "). Call once for each unit",
      }
    : undefined;
}
//@ chunk-7stfs6p0.js:48870-49934 placement
function describeMissingValues(source, request, context) {
  let chartData = readChartData(source, request);
  if ("code" in chartData) return refuseWithTable(source, chartData);
  let form = request.form ?? chartData.form;
  let reading = describeBarsUnread(source, chartData, request);
  let subject = seriesTitle_2(columnsForForm(source, chartData), request, reading);
  let any = reading.readings.some((reading) => reading.isZoned);
  let zone = any ? context.zone : "UTC";
  let { series, emptyNames, times, grid } = buildTimeSeries({
    reading,
    fallbackName: subject,
    combine: AGGREGATORS[request.combine ?? "sum"],
    zone,
  });
  let timeline = defaultFormFor({
    times,
    grid,
    readAs: chartData.form,
    zone,
    isZoned: any,
  });
  let problem =
    checkUnitsMixed(reading, chartData, request) ??
    checkTimeline({
      reading,
      roles: chartData,
      request,
      series,
    }) ??
    checkShareChart({
      roles: chartData,
      request,
      series,
      timeline,
    });
  if (problem !== undefined) return refuseWithTable(source, problem);
  let mapped = (request.marks ?? []).map((mark) =>
    describeNotDrawn({
      mark,
      drawnForm: form,
      axisSpan: timeline.axisSpan,
      isZoned: any,
    }),
  );
  let lastPeriodFilling =
    source.isReadAtInstants !== true &&
    any &&
    grid !== null &&
    context.nowMs !== null &&
    context.nowMs >= timeline.dataSpan.untilMs &&
    context.nowMs < grid.endMs;
  let hasEmptySeries = emptyNames.length > 0;
  let leftOutNotes = elideList(
    reading.droppedColumns.map((droppedColumn) => droppedColumn.sentence),
    MAX_LISTED_TABLES,
    "more column",
  );
  let notes = [
    ...(hasEmptySeries
      ? [
          `${emptyNames.length} with no value, not drawn: ` +
            truncateMiddle(emptyNames.join(", "), MAX_LABEL_TEXT),
        ]
      : []),
    ...mapped.filter((markResult) => typeof markResult === "string"),
    ...(lastPeriodFilling ? [LAST_PERIOD_FILLING_NOTE] : []),
  ];
  return {
    kind: "data",
    form,
    source: source.source,
    path: source.path,
    isSeries: source.isSeries === true,
    subject,
    hasCombinedRows: hasDuplicateReadings(reading),
    series,
    timeline,
    marks: mapped.filter((markResult) => typeof markResult !== "string").toSorted((a, b) => a.ms - b.ms),
    leftOutNotes,
    notes,
  };
}
//@ chunk-7stfs6p0.js:49934-50082 placement
/**
 * 表中没有任何时间值。
 */
function hasNoTimeValues({ rows, listColumns = [] }) {
  return (
    listColumns.length === 0 &&
    rows.every((row) =>
      row.every(
        (cell) =>
          cell === null ||
          !(LEADING_NUMBER_RE.test(String(cell)) || isTimeCell(cell) || parseTimeCell(cell).kind === "time"),
      ),
    )
  );
}
//@ chunk-7stfs6p0.js:50082-51328 placement
/**
 * 读取请求数据（64 KiB 上限、截断检测）并解析为表。
 */
function readChartRequestData(text, request, context) {
  if (text.length >= MAX_DATA_TEXT_BYTES)
    return refusedResult({
      code: "too_long",
      why: `The data is 64 KiB or longer: too long to chart, and it may be cut short. ${FEWER_ROWS_HINT}`,
    });
  let tablesFromText = readTablesFromText(text);
  if (tablesFromText.some((table) => table.isCut))
    return refusedResult({
      code: "cut_short",
      why: `That result was cut short or saved to a file, so part of it is missing. ${FEWER_ROWS_HINT}`,
    });
  if (!(tablesFromText.length > 0)) {
    let isCutJson = JSON_START_RE.test(text) && !JSON_END_RE.test(text);
    return refusedResult(
      isCutJson
        ? {
            code: "cut_short",
            why: `That result is JSON that does not close, so it was cut short. ${FEWER_ROWS_HINT}`,
          }
        : {
            code: "no_table_read",
            why: `That result holds no rows: it has no table and no list of records of ${MAX_TABLE_ROWS_READ} columns or fewer. Pass the rows as data, as JSON records or as the text of a CSV, TSV or markdown table, with only the columns to chart`,
          },
    );
  }
  let [picked, ...otherPicked] = pickMatchingTables(tablesFromText, request);
  if (picked === undefined || otherPicked.length > 0)
    return refusedResult(
      {
        code: "table_unpicked",
        why: `That result is not a table: there are ${tablesFromText.length} in it. To pick one, name a column that only it has, or pass its rows as data`,
      },
      tablesFromText.slice(0, MAX_LISTED_NAMES),
    );
  let chart = describeMissingValues(picked, request, context);
  let unparsedLines = picked.unparsedLines ?? 0;
  let filtered = tablesFromText.filter((table) => table !== picked && !hasNoTimeValues(table));
  let hasOtherTables = filtered.length > 0;
  let hasUnparsedLines = unparsedLines > 0;
  let parts = [
    ...(hasOtherTables ? [formatCount(filtered.length, "other table")] : []),
    ...(hasUnparsedLines ? [`${formatCount(unparsedLines, "line")} outside any table`] : []),
  ];
  return chart.kind === "refused" || parts.length === 0
    ? chart
    : {
        ...chart,
        leftOutNotes: [
          ...chart.leftOutNotes,
          "only part of that result is charted: it also holds " + parts.join(" and "),
        ],
      };
}
//@ chunk-7stfs6p0.js:51328-51355 placement
/**
 * 取第一个值
 */
var firstValue = (series) => series.values[0] ?? 0;
//@ chunk-7stfs6p0.js:51355-51366 placement
/**
 * 1e9
 */
var SI_GIGA_ALT = 1e9;
//@ chunk-7stfs6p0.js:51366-51375 placement
/**
 * 小数位只求到 1 位时至少补到 2 位
 */
var MIN_TRAILING_DECIMALS = 2;
//@ chunk-7stfs6p0.js:51375-51385 placement
/**
 * 10
 */
var MAX_SIGNIFICANT_DIGITS = 10;
//@ chunk-7stfs6p0.js:51385-51396 placement
/**
 * 100
 */
var MAX_DECIMALS = 100;
//@ chunk-7stfs6p0.js:51396-51415 placement
/**
 * 1e-9
 */
var NEGLIGIBLE = 0.000000001;
//@ chunk-7stfs6p0.js:51415-51424 placement
/**
 * 5
 */
var LABEL_DECIMALS = 5;
//@ chunk-7stfs6p0.js:51424-51434 placement
/**
 * 10
 */
var PRECISION_BASE = 10;
//@ chunk-7stfs6p0.js:51434-51444 placement
/**
 * 10
 */
var PRECISION_BASE_ALT = 10;
//@ chunk-7stfs6p0.js:51444-51455 placement
/**
 * 1e6
 */
var SI_MEGA_ALT = 1e6;
//@ chunk-7stfs6p0.js:51455-51466 placement
/**
 * 1e4
 */
var LARGE_VALUE_THRESHOLD = 1e4;
//@ chunk-7stfs6p0.js:51466-51475 placement
/**
 * 单位换算倍率的展开上限
 */
var UNIT_DECIMALS_MAX = 3;
//@ chunk-7stfs6p0.js:51475-51484 placement
/**
 * 数值跨度的展开上限
 */
var VALUE_DECIMALS_MAX = 2;
//@ chunk-7stfs6p0.js:51484-51493 placement
/**
 * 挑单位后缀时小数位的上限
 */
var SUFFIX_DECIMALS_MAX = 2;
//@ chunk-7stfs6p0.js:51493-51503 placement
/**
 * 12
 */
var MAX_TICK_COUNT = 12;
//@ chunk-7stfs6p0.js:51503-51524 placement
/**
 * 1e12
 */
var SI_TERA_ALT = 1000000000000;
//@ chunk-7stfs6p0.js:51524-51537 placement
/**
 * 86400
 */
var SECONDS_PER_DAY_ALT = 86400;
//@ chunk-7stfs6p0.js:51537-51549 placement
/**
 * 3600
 */
var SECONDS_PER_HOUR_ALT = 3600;
//@ chunk-7stfs6p0.js:51549-51565 placement
/**
 * 1e-6
 */
var SI_MICRO_ALT = 0.000001;
//@ chunk-7stfs6p0.js:51565-51578 placement
/**
 * 1e-3
 */
var SI_MILLI_ALT = 0.001;
//@ chunk-7stfs6p0.js:51578-51588 placement
/**
 * 60
 */
var SECONDS_PER_MINUTE_ALT = 60;
//@ chunk-7stfs6p0.js:51588-51607 placement
/**
 * 1e-9
 */
var SI_NANO_ALT = 0.000000001;
//@ chunk-7stfs6p0.js:51607-51631 placement
/**
 * 1e15
 */
var SI_PETA_ALT = 1000000000000000;
//@ chunk-7stfs6p0.js:51631-51643 placement
/**
 * 1000
 */
var SI_KILO_ALT = 1000;
//@ chunk-7stfs6p0.js:51643-51731 placement
/**
 * 按数量级算小数位
 */
function decimalsForValue(value, precision) {
  return value > 0
    ? Math.min(Math.max(0, precision - 1 - Math.floor(Math.log10(value) + NEGLIGIBLE)), MAX_DECIMALS)
    : 0;
}
//@ chunk-7stfs6p0.js:51731-51815 placement
/**
 * 千分位格式化绝对值
 */
var formatAbsoluteWithDecimals = (value, decimals) =>
  Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: value === 0 ? 0 : decimals,
  });
//@ chunk-7stfs6p0.js:51815-51838 placement
/**
 * 负数前缀
 */
var signPrefix = (value) => (value < 0 ? "-" : "");
//@ chunk-7stfs6p0.js:51838-52220 placement
function clampSeriesCount(format, values) {
  let mapped = values.map((value) => value * format.multiplesPerUnit);
  let decimalsFit = (decimals) =>
    mapped.some((scaled) => {
      let abs = Math.abs(scaled);
      let rounded = Number(abs.toFixed(decimals));
      return (
        Math.abs(rounded - abs) > NEGLIGIBLE * abs &&
        (decimals < format.decimals || Math.floor(Math.log10(rounded)) > Math.floor(Math.log10(abs)))
      );
    });
  let decimals = 0;
  while (decimalsFit(decimals)) decimals++;
  if (decimals === 1 && format.before !== "" && format.after === "") decimals = MIN_TRAILING_DECIMALS;
  return mapped.map((scaled) => {
    let rounded = Number(scaled.toFixed(decimals));
    return (
      signPrefix(rounded) +
      format.before +
      formatAbsoluteWithDecimals(rounded, decimals) +
      (rounded === 0 ? format.afterZero : format.after)
    );
  });
}
//@ chunk-7stfs6p0.js:52220-52249 placement
/**
 * ""/M/G/T
 */
var SI_MULTIPLIERS_NO_B = {
  "": 1,
  M: SI_MEGA_ALT,
  G: SI_GIGA_ALT,
  T: SI_TERA_ALT,
};
//@ chunk-7stfs6p0.js:52249-52315 placement
/**
 * 按单位与大值修正小数位
 */
var decimalsForUnit = (max, spread, isCurrency) => (multiple) =>
  Math.max(
    isCurrency && max < LARGE_VALUE_THRESHOLD ? MIN_TRAILING_DECIMALS : 0,
    decimalsForValue(max / multiple, UNIT_DECIMALS_MAX),
    decimalsForValue(spread / multiple, VALUE_DECIMALS_MAX),
  );
//@ chunk-7stfs6p0.js:52315-52344 placement
/**
 * ""/M/B/T
 */
var SI_MULTIPLIERS_BYTES = {
  "": 1,
  M: SI_MEGA_ALT,
  B: SI_GIGA_ALT,
  T: SI_TERA_ALT,
};
//@ chunk-7stfs6p0.js:52344-52359 placement
/**
 * 1/2/5
 */
var NICE_STEPS = [1, 2, 5];
//@ chunk-7stfs6p0.js:52359-52395 placement
/**
 * 四种货币符号
 */
var CURRENCY_SIGNS = ["$", "\u20AC", "\xA3", "\xA5"];
//@ chunk-7stfs6p0.js:52395-52494 placement
/**
 * 时间/字节/百分比单位组
 */
var UNIT_GROUPS = [
  {
    ns: SI_NANO_ALT,
    µs: SI_MICRO_ALT,
    ms: SI_MILLI_ALT,
    s: 1,
    min: SECONDS_PER_MINUTE_ALT,
    h: SECONDS_PER_HOUR_ALT,
    d: SECONDS_PER_DAY_ALT,
  },
  {
    B: 1,
    kB: SI_KILO_ALT,
    MB: SI_MEGA_ALT,
    GB: SI_GIGA_ALT,
    TB: SI_TERA_ALT,
    PB: SI_PETA_ALT,
  },
  {
    "%": 1,
  },
];
//@ chunk-7stfs6p0.js:52494-52895 placement
function summarizeSeries(unit, values) {
  let found = UNIT_GROUPS.find((group) => Object.hasOwn(group, unit));
  let isCurrency = CURRENCY_SIGNS.includes(unit);
  let multiples = found ?? (isCurrency ? SI_MULTIPLIERS_BYTES : SI_MULTIPLIERS_NO_B);
  let max = Math.max(...values.map(Math.abs));
  let decimalsFor = decimalsForUnit(max, Math.max(...values) - Math.min(...values), isCurrency);
  let filtered = Object.entries(multiples).filter(
    ([, value], index) => index === 0 || value <= (max === 0 ? 1 : max),
  );
  let [suffix, multiple] = filtered
    .filter(([, multiple]) => decimalsFor(multiple) <= SUFFIX_DECIMALS_MAX)
    .at(-1) ??
    filtered.at(-1) ?? ["", 1];
  let unitSuffix =
    multiples === SI_MULTIPLIERS_NO_B && unit !== "" ? ` ${truncateMiddle(unit, MAX_TICK_COUNT)}` : "";
  return {
    multiplesPerUnit: 1 / multiple,
    before: isCurrency ? unit : "",
    after: `${suffix}${unitSuffix}`,
    afterZero: found ? suffix : unitSuffix,
    decimals: decimalsFor(multiple),
  };
}
//@ chunk-7stfs6p0.js:52895-52934 placement
/**
 * 按单位生成系列标签
 */
var unitLabel = (value, unit) => clampSeriesCount(summarizeSeries(unit, [value]), [value])[0] ?? "";
//@ chunk-7stfs6p0.js:52934-53140 placement
/**
 * 按系列单位格式化数值（必要时提高精度）。
 */
function formatSeriesValues(unit, values, options = {}) {
  let { peers = values, minWritten = 0 } = options;
  let summary = summarizeSeries(unit, peers);
  return Math.min(...[...values, ...peers].filter((value) => value !== 0).map(Math.abs)) *
    summary.multiplesPerUnit <
    Math.max(minWritten, LABEL_DECIMALS / MAX_SIGNIFICANT_DIGITS ** summary.decimals)
    ? values.map((value) => unitLabel(value, unit))
    : clampSeriesCount(summary, values);
}
//@ chunk-7stfs6p0.js:53140-53175 placement
/**
 * 精度基数
 */
var precisionBase = (max) => (max === 0 ? 1 : Math.abs(max) / PRECISION_BASE);
//@ chunk-7stfs6p0.js:53175-53211 placement
/**
 * 差值可忽略即相等
 */
var nearlyEqual = (from, to) => !(to - from > NEGLIGIBLE * Math.abs(to));
//@ chunk-7stfs6p0.js:53211-53291 placement
/**
 * 提高精度
 */
var withMoreDecimals = (format, step) => ({
  ...format,
  multiplesPerUnit: 1,
  decimals: Math.max(format.decimals, decimalsForValue(step, 1)),
});
//@ chunk-7stfs6p0.js:53291-53650 placement
/**
 * 线性坐标轴刻度：选整齐的步长，返回刻度与位置函数。
 */
function linearAxisTicks(format, [min, max], maxAxisSteps) {
  let scaledMin = min * format.multiplesPerUnit;
  let scaledMax = max * format.multiplesPerUnit;
  let rawStep =
    (nearlyEqual(scaledMin, scaledMax) ? precisionBase(scaledMax) : scaledMax - scaledMin) / maxAxisSteps;
  let magnitude = MAX_SIGNIFICANT_DIGITS ** Math.floor(Math.log10(rawStep));
  let step =
    magnitude * (NICE_STEPS.find((candidate) => candidate * magnitude >= rawStep) ?? PRECISION_BASE_ALT);
  let floored = Math.floor(scaledMin / step + NEGLIGIBLE);
  let base = floored * step;
  let max_2 = Math.max(1, Math.ceil((scaledMax - base) / step - NEGLIGIBLE));
  return {
    ticks: clampSeriesCount(
      withMoreDecimals(format, step),
      rangeIndices(max_2 + 1).map((index) => (floored + index) * step),
    ).map((label, tickIndex) => ({
      position: tickIndex / max_2,
      label,
    })),
    positionOf: (value) => (value * format.multiplesPerUnit - base) / (max_2 * step),
  };
}
//@ chunk-7stfs6p0.js:53650-53899 placement
/**
 * 对数坐标轴刻度。
 */
function logAxisTicks(format, [min, max], maxAxisSteps) {
  let floored = Math.floor(Math.log10(min) + NEGLIGIBLE);
  let max_2 = Math.max(1, Math.ceil(Math.log10(max) - NEGLIGIBLE) - floored);
  let decadeStep = Math.ceil(max_2 / maxAxisSteps);
  let steps = Math.ceil(max_2 / decadeStep);
  return {
    ticks: rangeIndices(steps + 1).map((index) => ({
      position: index / steps,
      label: unitLabel(MAX_SIGNIFICANT_DIGITS ** (floored + index * decadeStep), format),
    })),
    positionOf: (value) => (Math.log10(value) - floored) / (steps * decadeStep),
  };
}
//@ chunk-7stfs6p0.js:53899-54522 placement
var CHART_THEME_COLORS = {
  title: {
    host: undefined,
    light: "#1f1f1f",
    dark: "#f2f0eb",
  },
  words: {
    host: undefined,
    light: "#2b2b2b",
    dark: "#e6e4df",
  },
  quiet: {
    host: "ansi256(8)",
    light: "#6b6b6b",
    dark: "#a3a19b",
  },
  blue: {
    host: "ansi256(4)",
    light: "#2a6fdb",
    dark: "#6ea8ff",
  },
  orange: {
    host: "ansi256(3)",
    light: "#b85c00",
    dark: "#f0a04b",
  },
  green: {
    host: "ansi256(2)",
    light: "#1a7f4e",
    dark: "#5fc98f",
  },
  pink: {
    host: "ansi256(5)",
    light: "#b0307f",
    dark: "#ee82c4",
  },
  teal: {
    host: "ansi256(6)",
    light: "#0b7c8a",
    dark: "#5cc8d6",
  },
  red: {
    host: "ansi256(1)",
    light: "#c0392b",
    dark: "#ff8a7a",
  },
  violet: {
    host: "ansi256(13)",
    light: "#6f42c1",
    dark: "#b794f6",
  },
  olive: {
    host: "ansi256(10)",
    light: "#5c7a00",
    dark: "#b5d94c",
  },
};
export {
  firstValue,
  formatSeriesValues,
  logAxisTicks,
  linearAxisTicks,
  summarizeSeries,
  CHART_THEME_COLORS,
  MAX_LISTED_NAMES,
  readChartRequestData,
};
