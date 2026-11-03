/**
 * plugins/bundled/easel/planChart.ts
 *
 * 2.1.316 新增：easel 绘图前的检查与规划：日期拼写、时区混用、单位混用、占比合计、行数上限
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (92)
 * attribution: placement 92
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

//@ chunk-3s7ydtfd.js:41306-41316 placement
/**
 * true
 */
var ARE_TICK_FIELDS_ALL = true;
//@ chunk-3s7ydtfd.js:41316-41455 placement
/**
 * 同一组标签同一时刻是否有多个读数。
 */
function hasDuplicateReadings(e) {
  let mapped = e.readings
    .filter((reading) => reading.value !== null)
    .map((reading) => JSON.stringify([reading.groupLabels, reading.ms]));
  return new Set(mapped).size < mapped.length;
}
//@ chunk-3s7ydtfd.js:41455-41464 placement
/**
 * 5
 */
var MAX_LISTED_TABLES = 5;
//@ chunk-3s7ydtfd.js:41464-41475 placement
/**
 * 120
 */
var MAX_LABEL_TEXT = 120;
//@ chunk-3s7ydtfd.js:41475-41484 placement
/**
 * 3
 */
var MAX_LISTED_NAMES = 3;
//@ chunk-3s7ydtfd.js:41484-41493 placement
/**
 * 3
 */
var MAX_JOINED_NAMES = 3;
//@ chunk-3s7ydtfd.js:41493-41506 placement
/**
 * 65536
 */
var MAX_DATA_TEXT_BYTES = 65536;
//@ chunk-3s7ydtfd.js:41506-41517 placement
/**
 * 240
 */
var MAX_TABLE_ROWS = 240;
//@ chunk-3s7ydtfd.js:41517-41526 placement
/**
 * 8
 */
var MAX_LISTED_COLUMNS = 8;
//@ chunk-3s7ydtfd.js:41526-41535 placement
/**
 * 2
 */
var MIN_ROWS_FOR_CHART = 2;
//@ chunk-3s7ydtfd.js:41535-41554 placement
/**
 * 以 ] 或 } 结尾
 */
var JSON_END_RE = /[\]}]\s*$/;
//@ chunk-3s7ydtfd.js:41554-41572 placement
/**
 * 以 [ 或 { 开头
 */
var JSON_START_RE = /^\s*[[{]/;
//@ chunk-3s7ydtfd.js:41572-41603 placement
/**
 * 以数字开头
 */
var LEADING_NUMBER_RE = /^[^\p{L}\p{N}]*\p{N}/u;
//@ chunk-3s7ydtfd.js:41603-41662 placement
/**
 * 列名都能匹配
 */
var allColumnsMatch = (e) => (t) => e.every((o) => t.columns.includes(matchColumnName(t, o)));
//@ chunk-3s7ydtfd.js:41662-41730 placement
/**
 * 能读出数据且非 bars
 */
function isSingleTableReadable(e, t) {
  let chartData = readChartData(e, t);
  return !("code" in chartData) && chartData.form !== "bars";
}
//@ chunk-3s7ydtfd.js:41730-41776 placement
/**
 * 请求里点名的列
 */
var requestColumns = (e) => [e.x ?? [], e.y ?? [], e.by ?? []].flat();
//@ chunk-3s7ydtfd.js:41776-41879 placement
/**
 * 多个表时按列名与请求筛选出唯一匹配的表。
 */
function pickMatchingTables(tablesFromText, t) {
  let r =
    tablesFromText.length === 1 ? tablesFromText : tablesFromText.filter(allColumnsMatch(requestColumns(t)));
  return r.length === 1 ? r : r.filter((p) => isSingleTableReadable(p, t));
}
//@ chunk-3s7ydtfd.js:41879-41919 placement
/**
 * 去重后取前 N 个拼接
 */
var joinFirstNames = (e) => uniqueValues(e).slice(0, MAX_JOINED_NAMES).join(", ");
//@ chunk-3s7ydtfd.js:41919-42545 placement
/**
 * 检查时间列（未识别的日期拼写、非时间数字、名称而非时间）。
 */
function checkTimeColumn(roles, reading) {
  let { unreadXCells } = reading;
  let filtered = unreadXCells.filter(isTimeCell);
  let s = reading.readings.length === 0;
  if (filtered.length > 0 && (s || filtered.length === unreadXCells.length))
    return {
      code: "dates_unread",
      why: `${roles.x} holds dates in a spelling that is not read (${joinFirstNames(filtered)}). ${TIME_FORMATS_HINT}`,
    };
  let filtered_2 = unreadXCells.filter((unreadXCell) => parseNumberWithUnit(unreadXCell).kind === "number");
  if (filtered_2.length > 0)
    return {
      code: "x_not_times",
      why: `${roles.x} holds numbers that are not times (${joinFirstNames(filtered_2)}). A line, columns and sparks run over times. For one bar for each, pass form: "bars"`,
    };
  return s && unreadXCells.length > 0
    ? {
        code: "x_not_times",
        why: `${roles.x} holds names, not times (${joinFirstNames(unreadXCells)}). A line, columns and sparks run over times: for names, pass form: "bars"`,
        fitsBars: true,
      }
    : undefined;
}
//@ chunk-3s7ydtfd.js:42545-43356 placement
/**
 * 检查时区混用、整列未读、多行共享同一 x 等。
 */
function checkTimeline({ reading, roles, request, series }) {
  if (new Set(reading.readings.map((reading) => reading.isZoned)).size > 1)
    return {
      code: "zones_mixed",
      why: `${roles.x} mixes times that name a zone with times that name none`,
    };
  let p = checkTimeColumn(roles, reading);
  if (p !== undefined) return p;
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
  let [f] = reading.droppedColumns;
  return roles.form === "bars" && f !== undefined
    ? {
        code: "bars_partly_unread",
        why: `bars rank a whole list, and part of this one was not read. ${f.sentence}`,
      }
    : undefined;
}
//@ chunk-3s7ydtfd.js:43356-43443 placement
/**
 * sum/mean/max/min
 */
var AGGREGATORS = {
  sum: stableSum,
  mean: (e) => stableSum(e) / e.length,
  max: (e) => Math.max(...e),
  min: (e) => Math.min(...e),
};
//@ chunk-3s7ydtfd.js:43443-43526 placement
/**
 * 最后一点可能仍在累积
 */
var LAST_PERIOD_FILLING_NOTE = "the last point may still be filling: its period had not ended at the call";
//@ chunk-3s7ydtfd.js:43526-43589 placement
/**
 * 建议减少行数
 */
var FEWER_ROWS_HINT = "Ask for fewer rows or a shorter span, then chart that";
//@ chunk-3s7ydtfd.js:43589-44654 placement
/**
 * 占比图检查：各部分需相加为整体，否则拒绝或提示 combine。
 */
function checkShareChart({ roles, request, series, timeline }) {
  let flattened = series.flatMap((x) => x.samples.map((sample) => sample.value ?? 0));
  let any = flattened.some((x) => x < 0);
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
//@ chunk-3s7ydtfd.js:44654-44709 placement
/**
 * bars 且名字是编的则不用 y
 */
var columnsForForm = (e, chartData) => (e.hasMadeUpNames && chartData.form === "bars" ? [] : chartData.y);
//@ chunk-3s7ydtfd.js:44709-45228 placement
function describeNotDrawn(e) {
  let label = e.mark.label === undefined ? "" : e.mark.label;
  let timeCell = parseTimeCell(e.mark.at);
  let r = `${label === "" ? "mark" : `mark ${label}`} at ${e.mark.at} not drawn:`;
  if (!(e.drawnForm !== "bars" && e.drawnForm !== "share")) return `${r} it has no times`;
  if (e.drawnForm === "sparks") return `${r} sparks have no time axis`;
  if (timeCell.kind !== "time") return `${r} ${timeCell.why}`;
  if (timeCell.ms < e.axisSpan.fromMs || timeCell.ms > e.axisSpan.untilMs)
    return `${r} outside the times drawn`;
  return timeCell.isZoned !== e.isZoned
    ? `${r} name a zone in both the mark and the times, or in neither`
    : {
        ms: timeCell.ms,
        label,
      };
}
//@ chunk-3s7ydtfd.js:45228-45298 placement
/**
 * 取单元值
 */
var cellReader = (e) => (t, o) => {
  let r = e.get(t);
  return r === undefined ? null : (o[r] ?? null);
};
//@ chunk-3s7ydtfd.js:45298-45468 placement
/**
 * 单元格转为读数（时间、分组标签、数值、单位）。
 */
var toReading = (e, t, o) => (r, s) => ({
  ms: e.ms,
  isZoned: e.isZoned,
  column: r,
  groupLabels: o.y.length > 1 ? [...t, r] : t,
  value: s.kind === "number" ? s.value : null,
  unit: s.kind === "number" ? s.unit : null,
});
//@ chunk-3s7ydtfd.js:45468-45553 placement
/**
 * 按列单位换算
 */
function applyUnitToCell(numberWithUnit, t) {
  let unit = t.unit;
  return numberWithUnit.kind === "number" && !numberWithUnit.unit && !!unit
    ? scaledNumber(numberWithUnit.value, unit)
    : numberWithUnit;
}
//@ chunk-3s7ydtfd.js:45553-45592 placement
/**
 * 对数刻度无法表示的读数
 */
var LOG_SCALE_REJECT = unreadNumber("a log scale cannot show it");
//@ chunk-3s7ydtfd.js:45592-45629 placement
/**
 * 零点时间值
 */
var ZERO_TIME = {
  kind: "time",
  ms: 0,
  isZoned: false,
};
//@ chunk-3s7ydtfd.js:45629-46632 placement
function describeBarsUnread(e, chartData, o) {
  let r = cellReader(new Map(e.columns.map((column, u) => [column, u])));
  let s = e.rows[0] ?? [];
  let filtered = chartData.by.filter((l) => e.rows.some((u) => r(l, u) !== r(l, s)));
  let m = chartData.form === "bars";
  let n = m ? [chartData.x, ...filtered] : filtered;
  let a = [];
  let f = [];
  let i = [];
  for (let l of e.rows) {
    let u = m ? ZERO_TIME : parseTimeCell(r(chartData.x, l));
    if (u.kind === "unread") i.push(r(chartData.x, l));
    if (u.kind !== "time") {
      f.push({
        column: chartData.x,
        quote: `${r(chartData.x, l)} (${u.why})`,
      });
      continue;
    }
    let reading = toReading(
      u,
      n.map((T) => String(r(T, l) ?? "") || `no ${T}`),
      chartData,
    );
    for (let T of chartData.y) {
      let L = r(T, l);
      let _ = applyUnitToCell(parseNumberWithUnit(L, o.y !== undefined), o);
      let A = o.log === true && _.kind === "number" && _.value <= 0 ? LOG_SCALE_REJECT : _;
      if (A.kind === "unread")
        f.push({
          column: T,
          quote: `${L} (${A.why})`,
        });
      a.push(reading(T, A));
    }
  }
  let x = new Map();
  for (let [l, u] of groupIndexBy(a, (d) => d.column))
    x.set(l, uniqueValues(u.map((d) => d.unit).filter((d) => d !== null)));
  return {
    readings: a,
    units: x,
    sharedLabels: chartData.by.filter((l) => !filtered.includes(l)).map((l) => String(r(l, s) ?? "")),
    droppedColumns: [...groupIndexBy(f, (l) => l.column)].map(([l, u]) => ({
      isEntireColumn: u.length === e.rows.length,
      sentence:
        `${formatCount(u.length, "cell")} of ${l} not read: ` +
        u
          .slice(0, MAX_JOINED_NAMES)
          .map((d) => d.quote)
          .join(", "),
    })),
    unreadXCells: i,
  };
}
//@ chunk-3s7ydtfd.js:46632-46672 placement
/**
 * 至少一个非空值
 */
var hasAnyValue = (e) => e.some((t) => t.value !== null);
//@ chunk-3s7ydtfd.js:46672-46699 placement
/**
 * 条件或拆分判断
 */
var orHasSplit = (e, t, zone) => e || spansWeeksWithoutWeekend(t, zone);
//@ chunk-3s7ydtfd.js:46699-46821 placement
/**
 * 合并同一时刻的多个读数。
 */
var combineSamplesAt = (e, combine) => (o) => {
  let filtered = (e.get(o) ?? []).map((s) => s.value).filter((s) => s !== null);
  return {
    ms: o,
    value: filtered.length > 0 ? combine(filtered) : null,
  };
};
//@ chunk-3s7ydtfd.js:46821-46885 placement
/**
 * 系列标题
 */
var seriesTitle = (e, t) => truncateMiddle(e[0]?.groupLabels.join(" ") || t.fallbackName, MAX_LABEL_TEXT);
//@ chunk-3s7ydtfd.js:46885-46938 placement
/**
 * 去重排序的时间戳
 */
var sortedUniqueTimes = (e) => uniqueValues(e.map((t) => t.ms)).toSorted((t, o) => t - o);
//@ chunk-3s7ydtfd.js:46938-47140 placement
/**
 * 由读数生成一个系列（单位、名称、按周期的样本）。
 */
function buildSeries(e, t, o) {
  let r = sortedUniqueTimes(e);
  let column = e[0]?.column ?? "";
  return {
    unit: t.reading.units.get(column)?.[0] ?? "",
    name: seriesTitle(e, t),
    measure: column,
    samples: (formatTimeTick(r, t, orHasSplit(o, r, t.zone))?.periodStarts ?? r).map(
      combineSamplesAt(
        groupIndexBy(e, (p) => p.ms),
        t.combine,
      ),
    ),
  };
}
//@ chunk-3s7ydtfd.js:47140-47400 placement
/**
 * 按分组生成全部时间序列与空系列名，并计算时间网格。
 */
function buildTimeSeries(e) {
  let t = [];
  let o = [];
  let r = groupIndexBy(e.reading.readings, (m) => JSON.stringify(m.groupLabels));
  let s = sortedUniqueTimes([...r.values()].filter(hasAnyValue).flat());
  let p = spansWeeksWithoutWeekend(s, e.zone);
  for (let m of r.values())
    if (hasAnyValue(m)) t.push(buildSeries(m, e, p));
    else o.push(seriesTitle(m, e));
  return {
    series: t,
    emptyNames: o,
    times: s,
    grid: formatTimeTick(s, e, p),
  };
}
//@ chunk-3s7ydtfd.js:47400-47455 placement
/**
 * 生成拒绝结果
 */
var refusedResult = (problem, tables = []) => ({
  kind: "refused",
  problem,
  tables,
});
//@ chunk-3s7ydtfd.js:47455-47509 placement
/**
 * 带表名的拒绝结果
 */
var refuseWithTable = (e, t) =>
  refusedResult(
    {
      ...t,
      why: `${tableSource(e)}: ${t.why}`,
    },
    [e],
  );
//@ chunk-3s7ydtfd.js:47509-47682 placement
/**
 * 系列标题（列名或共享标签）。
 */
function seriesTitle_2(e, t, o) {
  let s = e.length > MAX_LISTED_COLUMNS ? formatCount(e.length, "column") : e.join(", ");
  let p = t.y === undefined;
  return truncateMiddle(
    (p ? o.sharedLabels : [s, ...o.sharedLabels]).filter((m) => m !== "").join(" ") || s,
    MAX_TABLE_ROWS,
  );
}
//@ chunk-3s7ydtfd.js:47682-47772 placement
/**
 * 求时间范围
 */
function timeRangeOf(e) {
  let t = e.times[0] ?? 0;
  return {
    fromMs: t,
    untilMs: e.times.at(-1) ?? t,
    zone: e.zone,
  };
}
//@ chunk-3s7ydtfd.js:47772-47829 placement
/**
 * 刻度起点（不走字段）
 */
var tickTimeStart = (e) => ({
  zone: e.zone,
  areTicks: !ARE_TICK_FIELDS_ALL,
  fieldsBefore: [],
});
//@ chunk-3s7ydtfd.js:47829-48155 placement
function defaultFormFor(e) {
  let t = timeRangeOf(e);
  let o = defaultTimeStep(e.times, e.zone);
  let grid = e.readAs === "columns" ? e.grid : null;
  let s = e.readAs === "bars";
  let joined = pickTickStep(uniqueValues([t.fromMs, t.untilMs]), o, tickTimeStart(e)).join(" \u2192 ");
  return {
    dataSpan: t,
    axisSpan: grid
      ? {
          ...t,
          untilMs: grid.endMs,
        }
      : t,
    precision: o,
    step: e.grid?.step ?? o,
    spanLabels: s ? [] : [e.isZoned ? `${joined} ${e.zone}` : joined],
    periodStarts: grid?.periodStarts ?? [],
  };
}
//@ chunk-3s7ydtfd.js:48155-48870 placement
function checkUnitsMixed(e, chartData, o) {
  let r = [...e.units.values()];
  if (r.some((n) => n.length > 1)) {
    let mapped = r.flat().map((f) => f || "none");
    let a = mapped.includes("none") && new Set(mapped).size === MIN_ROWS_FOR_CHART;
    return {
      code: "units_mixed",
      why:
        `the values of a column carry different units (${mapped.join(", ")}). ` +
        (a
          ? "Name what the bare numbers are in as unit"
          : "Convert them to one unit, or chart the rows of each unit in a call of its own"),
    };
  }
  let p = groupIndexBy(e.units.keys(), (n) => e.units.get(n)?.[0] ?? "");
  return (chartData.form === "bars" || o.form === "sparks") && p.size > 1
    ? {
        code: "units_differ",
        why:
          (o.form === "sparks" ? "sparks" : "bars") +
          " share one scale, and the y columns are in different units (" +
          [...p].map(([n, a]) => `${a.join(", ")} in ${n || "no unit"}`).join("; ") +
          "). Call once for each unit",
      }
    : undefined;
}
//@ chunk-3s7ydtfd.js:48870-49934 placement
function describeMissingValues(e, t, o) {
  let chartData = readChartData(e, t);
  if ("code" in chartData) return refuseWithTable(e, chartData);
  let form = t.form ?? chartData.form;
  let m = describeBarsUnread(e, chartData, t);
  let n = seriesTitle_2(columnsForForm(e, chartData), t, m);
  let any = m.readings.some((reading) => reading.isZoned);
  let zone = any ? o.zone : "UTC";
  let { series, emptyNames, times, grid } = buildTimeSeries({
    reading: m,
    fallbackName: n,
    combine: AGGREGATORS[t.combine ?? "sum"],
    zone,
  });
  let d = defaultFormFor({
    times,
    grid,
    readAs: chartData.form,
    zone,
    isZoned: any,
  });
  let c =
    checkUnitsMixed(m, chartData, t) ??
    checkTimeline({
      reading: m,
      roles: chartData,
      request: t,
      series,
    }) ??
    checkShareChart({
      roles: chartData,
      request: t,
      series,
      timeline: d,
    });
  if (c !== undefined) return refuseWithTable(e, c);
  let mapped = (t.marks ?? []).map((mark) =>
    describeNotDrawn({
      mark,
      drawnForm: form,
      axisSpan: d.axisSpan,
      isZoned: any,
    }),
  );
  let T =
    e.isReadAtInstants !== true &&
    any &&
    grid !== null &&
    o.nowMs !== null &&
    o.nowMs >= d.dataSpan.untilMs &&
    o.nowMs < grid.endMs;
  let L = emptyNames.length > 0;
  let leftOutNotes = elideList(
    m.droppedColumns.map((droppedColumn) => droppedColumn.sentence),
    MAX_LISTED_TABLES,
    "more column",
  );
  let notes = [
    ...(L
      ? [
          `${emptyNames.length} with no value, not drawn: ` +
            truncateMiddle(emptyNames.join(", "), MAX_LABEL_TEXT),
        ]
      : []),
    ...mapped.filter((A) => typeof A === "string"),
    ...(T ? [LAST_PERIOD_FILLING_NOTE] : []),
  ];
  return {
    kind: "data",
    form,
    source: e.source,
    path: e.path,
    isSeries: e.isSeries === true,
    subject: n,
    hasCombinedRows: hasDuplicateReadings(m),
    series,
    timeline: d,
    marks: mapped.filter((A) => typeof A !== "string").toSorted((A, Fe) => A.ms - Fe.ms),
    leftOutNotes,
    notes,
  };
}
//@ chunk-3s7ydtfd.js:49934-50082 placement
/**
 * 表中没有任何时间值。
 */
function hasNoTimeValues({ rows, listColumns = [] }) {
  return (
    listColumns.length === 0 &&
    rows.every((o) =>
      o.every(
        (r) =>
          r === null ||
          !(LEADING_NUMBER_RE.test(String(r)) || isTimeCell(r) || parseTimeCell(r).kind === "time"),
      ),
    )
  );
}
//@ chunk-3s7ydtfd.js:50082-51328 placement
/**
 * 读取请求数据（64 KiB 上限、截断检测）并解析为表。
 */
function readChartRequestData(e, t, o) {
  if (e.length >= MAX_DATA_TEXT_BYTES)
    return refusedResult({
      code: "too_long",
      why: `The data is 64 KiB or longer: too long to chart, and it may be cut short. ${FEWER_ROWS_HINT}`,
    });
  let tablesFromText = readTablesFromText(e);
  if (tablesFromText.some((T) => T.isCut))
    return refusedResult({
      code: "cut_short",
      why: `That result was cut short or saved to a file, so part of it is missing. ${FEWER_ROWS_HINT}`,
    });
  if (!(tablesFromText.length > 0)) {
    let T = JSON_START_RE.test(e) && !JSON_END_RE.test(e);
    return refusedResult(
      T
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
  let [n, ...a] = pickMatchingTables(tablesFromText, t);
  if (n === undefined || a.length > 0)
    return refusedResult(
      {
        code: "table_unpicked",
        why: `That result is not a table: there are ${tablesFromText.length} in it. To pick one, name a column that only it has, or pass its rows as data`,
      },
      tablesFromText.slice(0, MAX_LISTED_NAMES),
    );
  let i = describeMissingValues(n, t, o);
  let unparsedLines = n.unparsedLines ?? 0;
  let filtered = tablesFromText.filter((T) => T !== n && !hasNoTimeValues(T));
  let u = filtered.length > 0;
  let d = unparsedLines > 0;
  let c = [
    ...(u ? [formatCount(filtered.length, "other table")] : []),
    ...(d ? [`${formatCount(unparsedLines, "line")} outside any table`] : []),
  ];
  return i.kind === "refused" || c.length === 0
    ? i
    : {
        ...i,
        leftOutNotes: [
          ...i.leftOutNotes,
          "only part of that result is charted: it also holds " + c.join(" and "),
        ],
      };
}
//@ chunk-3s7ydtfd.js:51328-51355 placement
/**
 * 取第一个值
 */
var firstValue = (e) => e.values[0] ?? 0;
//@ chunk-3s7ydtfd.js:51355-51366 placement
/**
 * 1e9
 */
var SI_GIGA_ALT = 1e9;
//@ chunk-3s7ydtfd.js:51366-51375 placement
/**
 * 小数位只求到 1 位时至少补到 2 位
 */
var MIN_TRAILING_DECIMALS = 2;
//@ chunk-3s7ydtfd.js:51375-51385 placement
/**
 * 10
 */
var MAX_SIGNIFICANT_DIGITS = 10;
//@ chunk-3s7ydtfd.js:51385-51396 placement
/**
 * 100
 */
var MAX_DECIMALS = 100;
//@ chunk-3s7ydtfd.js:51396-51415 placement
/**
 * 1e-9
 */
var NEGLIGIBLE = 0.000000001;
//@ chunk-3s7ydtfd.js:51415-51424 placement
/**
 * 5
 */
var LABEL_DECIMALS = 5;
//@ chunk-3s7ydtfd.js:51424-51434 placement
/**
 * 10
 */
var PRECISION_BASE = 10;
//@ chunk-3s7ydtfd.js:51434-51444 placement
/**
 * 10
 */
var PRECISION_BASE_ALT = 10;
//@ chunk-3s7ydtfd.js:51444-51455 placement
/**
 * 1e6
 */
var SI_MEGA_ALT = 1e6;
//@ chunk-3s7ydtfd.js:51455-51466 placement
/**
 * 1e4
 */
var LARGE_VALUE_THRESHOLD = 1e4;
//@ chunk-3s7ydtfd.js:51466-51475 placement
/**
 * 单位换算倍率的展开上限
 */
var UNIT_DECIMALS_MAX = 3;
//@ chunk-3s7ydtfd.js:51475-51484 placement
/**
 * 数值跨度的展开上限
 */
var VALUE_DECIMALS_MAX = 2;
//@ chunk-3s7ydtfd.js:51484-51493 placement
/**
 * 挑单位后缀时小数位的上限
 */
var SUFFIX_DECIMALS_MAX = 2;
//@ chunk-3s7ydtfd.js:51493-51503 placement
/**
 * 12
 */
var MAX_TICK_COUNT = 12;
//@ chunk-3s7ydtfd.js:51503-51524 placement
/**
 * 1e12
 */
var SI_TERA_ALT = 1000000000000;
//@ chunk-3s7ydtfd.js:51524-51537 placement
/**
 * 86400
 */
var SECONDS_PER_DAY_ALT = 86400;
//@ chunk-3s7ydtfd.js:51537-51549 placement
/**
 * 3600
 */
var SECONDS_PER_HOUR_ALT = 3600;
//@ chunk-3s7ydtfd.js:51549-51565 placement
/**
 * 1e-6
 */
var SI_MICRO_ALT = 0.000001;
//@ chunk-3s7ydtfd.js:51565-51578 placement
/**
 * 1e-3
 */
var SI_MILLI_ALT = 0.001;
//@ chunk-3s7ydtfd.js:51578-51588 placement
/**
 * 60
 */
var SECONDS_PER_MINUTE_ALT = 60;
//@ chunk-3s7ydtfd.js:51588-51607 placement
/**
 * 1e-9
 */
var SI_NANO_ALT = 0.000000001;
//@ chunk-3s7ydtfd.js:51607-51631 placement
/**
 * 1e15
 */
var SI_PETA_ALT = 1000000000000000;
//@ chunk-3s7ydtfd.js:51631-51643 placement
/**
 * 1000
 */
var SI_KILO_ALT = 1000;
//@ chunk-3s7ydtfd.js:51643-51731 placement
/**
 * 按数量级算小数位
 */
function decimalsForValue(e, t) {
  return e > 0 ? Math.min(Math.max(0, t - 1 - Math.floor(Math.log10(e) + NEGLIGIBLE)), MAX_DECIMALS) : 0;
}
//@ chunk-3s7ydtfd.js:51731-51815 placement
/**
 * 千分位格式化绝对值
 */
var formatAbsoluteWithDecimals = (e, t) =>
  Math.abs(e).toLocaleString("en-US", {
    minimumFractionDigits: e === 0 ? 0 : t,
  });
//@ chunk-3s7ydtfd.js:51815-51838 placement
/**
 * 负数前缀
 */
var signPrefix = (e) => (e < 0 ? "-" : "");
//@ chunk-3s7ydtfd.js:51838-52220 placement
function clampSeriesCount(e, t) {
  let mapped = t.map((m) => m * e.multiplesPerUnit);
  let r = (m) =>
    mapped.some((n) => {
      let a = Math.abs(n);
      let f = Number(a.toFixed(m));
      return (
        Math.abs(f - a) > NEGLIGIBLE * a &&
        (m < e.decimals || Math.floor(Math.log10(f)) > Math.floor(Math.log10(a)))
      );
    });
  let s = 0;
  while (r(s)) s++;
  if (s === 1 && e.before !== "" && e.after === "") s = MIN_TRAILING_DECIMALS;
  return mapped.map((m) => {
    let n = Number(m.toFixed(s));
    return signPrefix(n) + e.before + formatAbsoluteWithDecimals(n, s) + (n === 0 ? e.afterZero : e.after);
  });
}
//@ chunk-3s7ydtfd.js:52220-52249 placement
/**
 * ""/M/G/T
 */
var SI_MULTIPLIERS_NO_B = {
  "": 1,
  M: SI_MEGA_ALT,
  G: SI_GIGA_ALT,
  T: SI_TERA_ALT,
};
//@ chunk-3s7ydtfd.js:52249-52315 placement
/**
 * 按单位与大值修正小数位
 */
var decimalsForUnit = (e, t, o) => (r) =>
  Math.max(
    o && e < LARGE_VALUE_THRESHOLD ? MIN_TRAILING_DECIMALS : 0,
    decimalsForValue(e / r, UNIT_DECIMALS_MAX),
    decimalsForValue(t / r, VALUE_DECIMALS_MAX),
  );
//@ chunk-3s7ydtfd.js:52315-52344 placement
/**
 * ""/M/B/T
 */
var SI_MULTIPLIERS_BYTES = {
  "": 1,
  M: SI_MEGA_ALT,
  B: SI_GIGA_ALT,
  T: SI_TERA_ALT,
};
//@ chunk-3s7ydtfd.js:52344-52359 placement
/**
 * 1/2/5
 */
var NICE_STEPS = [1, 2, 5];
//@ chunk-3s7ydtfd.js:52359-52395 placement
/**
 * 四种货币符号
 */
var CURRENCY_SIGNS = ["$", "\u20AC", "\xA3", "\xA5"];
//@ chunk-3s7ydtfd.js:52395-52494 placement
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
//@ chunk-3s7ydtfd.js:52494-52895 placement
function summarizeSeries(e, t) {
  let found = UNIT_GROUPS.find((l) => Object.hasOwn(l, e));
  let included = CURRENCY_SIGNS.includes(e);
  let s = found ?? (included ? SI_MULTIPLIERS_BYTES : SI_MULTIPLIERS_NO_B);
  let max = Math.max(...t.map(Math.abs));
  let m = decimalsForUnit(max, Math.max(...t) - Math.min(...t), included);
  let filtered = Object.entries(s).filter(([, value], u) => u === 0 || value <= (max === 0 ? 1 : max));
  let [a, f] = filtered.filter(([, l]) => m(l) <= SUFFIX_DECIMALS_MAX).at(-1) ?? filtered.at(-1) ?? ["", 1];
  let x = s === SI_MULTIPLIERS_NO_B && e !== "" ? ` ${truncateMiddle(e, MAX_TICK_COUNT)}` : "";
  return {
    multiplesPerUnit: 1 / f,
    before: included ? e : "",
    after: `${a}${x}`,
    afterZero: found ? a : x,
    decimals: m(f),
  };
}
//@ chunk-3s7ydtfd.js:52895-52934 placement
/**
 * 按单位生成系列标签
 */
var unitLabel = (e, t) => clampSeriesCount(summarizeSeries(t, [e]), [e])[0] ?? "";
//@ chunk-3s7ydtfd.js:52934-53140 placement
/**
 * 按系列单位格式化数值（必要时提高精度）。
 */
function formatSeriesValues(e, t, o = {}) {
  let { peers = t, minWritten = 0 } = o;
  let p = summarizeSeries(e, peers);
  return Math.min(...[...t, ...peers].filter((n) => n !== 0).map(Math.abs)) * p.multiplesPerUnit <
    Math.max(minWritten, LABEL_DECIMALS / MAX_SIGNIFICANT_DIGITS ** p.decimals)
    ? t.map((n) => unitLabel(n, e))
    : clampSeriesCount(p, t);
}
//@ chunk-3s7ydtfd.js:53140-53175 placement
/**
 * 精度基数
 */
var precisionBase = (e) => (e === 0 ? 1 : Math.abs(e) / PRECISION_BASE);
//@ chunk-3s7ydtfd.js:53175-53211 placement
/**
 * 差值可忽略即相等
 */
var nearlyEqual = (e, t) => !(t - e > NEGLIGIBLE * Math.abs(t));
//@ chunk-3s7ydtfd.js:53211-53291 placement
/**
 * 提高精度
 */
var withMoreDecimals = (e, t) => ({
  ...e,
  multiplesPerUnit: 1,
  decimals: Math.max(e.decimals, decimalsForValue(t, 1)),
});
//@ chunk-3s7ydtfd.js:53291-53650 placement
/**
 * 线性坐标轴刻度：选整齐的步长，返回刻度与位置函数。
 */
function linearAxisTicks(e, [t, o], maxAxisSteps) {
  let s = t * e.multiplesPerUnit;
  let p = o * e.multiplesPerUnit;
  let m = (nearlyEqual(s, p) ? precisionBase(p) : p - s) / maxAxisSteps;
  let n = MAX_SIGNIFICANT_DIGITS ** Math.floor(Math.log10(m));
  let a = n * (NICE_STEPS.find((l) => l * n >= m) ?? PRECISION_BASE_ALT);
  let floored = Math.floor(s / a + NEGLIGIBLE);
  let i = floored * a;
  let max = Math.max(1, Math.ceil((p - i) / a - NEGLIGIBLE));
  return {
    ticks: clampSeriesCount(
      withMoreDecimals(e, a),
      rangeIndices(max + 1).map((l) => (floored + l) * a),
    ).map((label, u) => ({
      position: u / max,
      label,
    })),
    positionOf: (l) => (l * e.multiplesPerUnit - i) / (max * a),
  };
}
//@ chunk-3s7ydtfd.js:53650-53899 placement
/**
 * 对数坐标轴刻度。
 */
function logAxisTicks(e, [t, o], maxAxisSteps) {
  let floored = Math.floor(Math.log10(t) + NEGLIGIBLE);
  let max = Math.max(1, Math.ceil(Math.log10(o) - NEGLIGIBLE) - floored);
  let m = Math.ceil(max / maxAxisSteps);
  let n = Math.ceil(max / m);
  return {
    ticks: rangeIndices(n + 1).map((a) => ({
      position: a / n,
      label: unitLabel(MAX_SIGNIFICANT_DIGITS ** (floored + a * m), e),
    })),
    positionOf: (a) => (Math.log10(a) - floored) / (n * m),
  };
}
//@ chunk-3s7ydtfd.js:53899-54522 placement
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
