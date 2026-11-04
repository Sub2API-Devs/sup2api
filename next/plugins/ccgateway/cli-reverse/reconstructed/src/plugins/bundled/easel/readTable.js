/**
 * plugins/bundled/easel/readTable.ts
 *
 * 2.1.316 新增：easel 从工具结果中读表：JSON 路径、指标格式、CSV/Markdown 表、列角色推断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (159)
 * attribution: placement 159
 */
import {
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
} from "./parseValues.js";
import {
  uniqueValues,
  returnValue,
  selectPath,
  groupIndexBy,
  formatCount,
  rangeIndices,
  stableSum,
  cleanCellText,
  isPlainObject,
  countWhere,
  cleanAllStrings,
  CHART_FORMS,
  truncateMiddle,
  elideList,
} from "./chartSchema.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-3s7ydtfd.js:22902-23118 placement (2.1.88 match: saveTag, 0.566)
function saveTag(scope) {
  let parts = typeof scope === "string" ? scope.split(",") : [];
  let keys = parts.length <= MAX_SERIES_PAIRS ? parts.map((part) => METRIC_KEY_RE.exec(part)?.[1]) : [];
  return keys.length > 0 && !keys.includes(undefined) && uniqueValues(keys).length === keys.length
    ? Object.fromEntries(
        returnValue(
          keys.map((key) => `${key} tag`),
          parts,
        ),
      )
    : scope;
}
//@ chunk-3s7ydtfd.js:23118-23198 placement
/**
 * Datadog 指标对象（expression/scope/pointlist）
 */
var datadogPointlist = (series, pointlist) => ({
  metric: selectPath(series, "expression")[0],
  scope: selectPath(series, "scope")[0],
  pointlist,
});
//@ chunk-3s7ydtfd.js:23198-23229 placement
/**
 * 起始时间 + 间隔算第 n 个点的时刻
 */
var fixedIntervalPoint = (ms, intervalMs) => (value, index) => [ms + index * intervalMs, value];
//@ chunk-3s7ydtfd.js:23229-23413 placement
/**
 * 读起始时间 + 间隔的数值序列（start_time/interval_ms/values）。
 */
function readFixedIntervalValues(series) {
  let timeCell = parseTimeCell(String(selectPath(series, "start_time")[0]));
  return timeCell.kind === "time" && timeCell.isZoned
    ? selectPath(series, "values")
        .flatMap((values) => String(values).split(","))
        .map(fixedIntervalPoint(timeCell.ms, Number(selectPath(series, "interval_ms")[0])))
    : [];
}
//@ chunk-3s7ydtfd.js:23413-23509 placement
/**
 * 合并定间隔数值与分箱点
 */
var datadogSeriesPoints = (series) =>
  datadogPointlist(series, [
    ...readFixedIntervalValues(series),
    ...selectPath(series, "binned.[]").map((bin) => [
      selectPath(bin, "start_time")[0],
      selectPath(bin, "avg")[0],
    ]),
  ]);
//@ chunk-3s7ydtfd.js:23509-23598 placement
/**
 * 把 Datadog 指标数组展开成 series
 */
function expandDatadogSeries(value) {
  return selectPath(value, "[].expression").length > 0
    ? {
        series: selectPath(value, "[]").map((series) => datadogSeriesPoints(series)),
      }
    : value;
}
//@ chunk-3s7ydtfd.js:23598-23689 placement
/**
 * text/number/time 三选一
 */
function cellKind(name) {
  let numberWithUnit = parseNumberWithUnit(name);
  let { kind } = numberWithUnit.kind === "unread" ? parseTimeCell(name) : numberWithUnit;
  return kind === "unread" ? "text" : kind;
}
//@ chunk-3s7ydtfd.js:23689-23832 placement
/**
 * 列信息：按单元格类型分组，判断是否只有一种类型。
 */
function describeColumn(name, cells) {
  let byKind = groupIndexBy(cells, cellKind);
  let filtered = [...byKind.keys()].filter((key) => key !== "empty");
  return {
    name,
    cells,
    cellsByKind: byKind,
    soleKind: filtered.length === 1 ? filtered[0] : undefined,
  };
}
//@ chunk-3s7ydtfd.js:23832-23900 placement
/**
 * 按列推断角色
 */
var describeTableColumns = (table) =>
  table.columns.map((column, index) =>
    describeColumn(
      column,
      table.rows.map((row) => row[index] ?? null),
    ),
  );
//@ chunk-3s7ydtfd.js:23900-24022 placement
/**
 * 不区分大小写匹配唯一的列名，否则原样返回。
 */
function matchColumnName(table, name) {
  let [match, ...others] = table.columns.filter((column) => column.toLowerCase() === name.toLowerCase());
  return match !== undefined && others.length === 0 ? match : name;
}
//@ chunk-3s7ydtfd.js:24022-24126 placement
/**
 * 表头像文本行（不是数据）。
 */
var hasTextHeader = (columns) =>
  columns.every((column) => cellKind(column.name) === "text") ||
  columns.some((column) => column.name !== "" && !column.cellsByKind.has(cellKind(column.name)));
//@ chunk-3s7ydtfd.js:24126-24201 placement
/**
 * 全是时间且可解析
 */
var isAllTimeColumn = (column) =>
  column.soleKind === "text" && (column.cellsByKind.get("text") ?? []).every(isTimeCell);
//@ chunk-3s7ydtfd.js:24201-24215 placement
/**
 * 262144
 */
var MAX_TABLE_CELLS = 262144;
//@ chunk-3s7ydtfd.js:24215-24226 placement
/**
 * 200
 */
var MAX_TABLE_ROWS_READ = 200;
//@ chunk-3s7ydtfd.js:24226-24235 placement
/**
 * 3
 */
var UNNAMED_COLUMN_LIMIT = 3;
//@ chunk-3s7ydtfd.js:24235-24262 placement
/**
 * 行数或总格数超限
 */
var isTableTooLarge = (rows, columns) => rows > MAX_TABLE_ROWS_READ || rows * columns > MAX_TABLE_CELLS;
//@ chunk-3s7ydtfd.js:24262-24340 placement
/**
 * 图形式到渲染种类
 */
var FORM_TO_RENDER_KIND = {
  line: "line",
  columns: "columns",
  bars: "bars",
  sparks: "line",
  share: "bars",
};
//@ chunk-3s7ydtfd.js:24340-24365 placement
/**
 * 列名匹配器
 */
var isColumnName = (table) => (name) => matchColumnName(table, name);
//@ chunk-3s7ydtfd.js:24365-24401 placement
/**
 * 拼出 {form,x,y,...}
 */
var chartRequest = (form, x, rest) => ({
  form,
  x,
  ...rest,
});
//@ chunk-3s7ydtfd.js:24401-24434 placement
/**
 * 含数字
 */
var hasDigit = (value) => /\d/.test(String(value));
//@ chunk-3s7ydtfd.js:24434-24457 placement
/**
 * 不等于给定值
 */
var isDifferentFrom = (value) => (candidate) => candidate !== value;
//@ chunk-3s7ydtfd.js:24457-24549 placement
/**
 * 按指标格式读入的说明
 */
var METRICS_COLUMNS_NOTE =
  ". It was read as a metrics format, into the columns below: x and y can be left out";
//@ chunk-3s7ydtfd.js:24549-24644 placement
/**
 * 缺列错误
 */
var noSuchColumnError = (names, request) => ({
  code: "no_such_column",
  why: `it has no column ${names.join(", ")}` + (request.roles ? METRICS_COLUMNS_NOTE : ""),
});
//@ chunk-3s7ydtfd.js:24644-24723 placement
/**
 * 单列且值有重复
 */
var isSingleColumnSeries = (names, column) =>
  names.length === 0 || (names.length === 1 && new Set(column.cells).size < column.cells.length);
//@ chunk-3s7ydtfd.js:24723-24773 placement
/**
 * bars 要单列，其他至少一列
 */
var hasEnoughYColumns = (names, form) => (form === "bars" ? names.length === 1 : names.length >= 1);
//@ chunk-3s7ydtfd.js:24773-24840 placement
/**
 * 单元格时间戳
 */
function timeMsOfCell(cell = null) {
  let timeCell = parseTimeCell(cell);
  return timeCell.kind === "time" ? timeCell.ms : undefined;
}
//@ chunk-3s7ydtfd.js:24840-24898 placement
/**
 * 任一格时间不同
 */
var differsByTime = (column, otherColumn) =>
  column.cells.some((cell, index) => timeMsOfCell(cell) !== timeMsOfCell(otherColumn.cells[index]));
//@ chunk-3s7ydtfd.js:24898-24917 placement
/**
 * 列名
 */
var columnName = (column) => column.name;
//@ chunk-3s7ydtfd.js:24917-25428 placement
function inferColumnRoles(columns, form) {
  let filtered = columns.filter((column) => column.name !== "");
  let filtered_2 = filtered.filter((column) => column.soleKind === "text");
  let filtered_3 = filtered.filter((column) => column.soleKind === "number");
  let filtered_4 = filtered.filter(
    (column) =>
      column.cellsByKind.get("time")?.length === column.cells.length &&
      new Set(column.cells).size >= UNNAMED_COLUMN_LIMIT,
  );
  let isTimeBased = filtered_4.length > 0;
  let [xColumn, ...otherCandidates] = isTimeBased ? filtered_4 : filtered_2;
  if (!(xColumn !== undefined && otherCandidates.length === 0)) return;
  let yColumns = isTimeBased ? filtered_3.filter((column) => differsByTime(column, xColumn)) : filtered_3;
  let names = filtered_2.filter((column) => column !== xColumn);
  let resolvedForm = form ?? (isTimeBased ? "line" : "bars");
  return 1 + names.length + filtered_3.length === filtered.length &&
    isSingleColumnSeries(names, xColumn) &&
    (isTimeBased || resolvedForm === "bars") &&
    (form !== undefined || !isAllTimeColumn(xColumn)) &&
    hasEnoughYColumns(yColumns, resolvedForm)
    ? {
        form: resolvedForm,
        x: xColumn.name,
        y: yColumns.map(columnName),
        by: names.map(columnName),
      }
    : undefined;
}
//@ chunk-3s7ydtfd.js:25428-25511 placement
/**
 * 文本列且非全时间
 */
function isTextBarsColumn(columns, name) {
  let column = columns.find((column) => column.name === name);
  return column?.soleKind === "text" && !isAllTimeColumn(column);
}
//@ chunk-3s7ydtfd.js:25511-25547 placement
/**
 * 文本列用 bars，否则 line
 */
var defaultFormForColumn = (columns, xName) => (isTextBarsColumn(columns, xName) ? "bars" : "line");
//@ chunk-3s7ydtfd.js:25547-27038 placement
/**
 * 根据请求（form/x/y）从表中取出序列，报告缺列、无行、重名等问题。
 */
function readChartData(table, request) {
  let renderKind = request.form === undefined ? undefined : FORM_TO_RENDER_KIND[request.form];
  let roles = renderKind === "bars" ? undefined : table.roles;
  let describedColumns = roles ? [] : describeTableColumns(table);
  let inferredRoles = roles ?? inferColumnRoles(describedColumns, renderKind);
  let xName = request.x === undefined ? inferredRoles?.x : matchColumnName(table, request.x);
  let asColumnName = isColumnName(table);
  let filtered = uniqueValues(request.y?.map(asColumnName) ?? inferredRoles?.y ?? []).filter(
    isDifferentFrom(xName),
  );
  let filtered_2 = (
    request.by?.map(asColumnName) ??
    (request.combine === undefined ? inferredRoles?.by : undefined) ??
    []
  ).filter(isDifferentFrom(xName));
  if (table.rows.length === 0)
    return {
      code: "no_rows",
      why: "it has no rows",
    };
  if (new Set(table.columns).size < table.columns.length)
    return {
      code: "names_repeat",
      why: "two of its columns share a name, so a name does not pick one. Pass the rows as data, each column under a name of its own",
    };
  if (xName === undefined) {
    let found = describedColumns.find(isAllTimeColumn);
    if (found)
      return {
        code: "dates_unread",
        why: `${found.name} looks like dates, in a spelling that is not read (${found.cells[0]}). ${TIME_FORMATS_HINT}`,
      };
    let filtered_2 = describedColumns.filter((column) => column.soleKind === "time");
    let onlyTimeColumn = filtered_2[0];
    let size = new Set(onlyTimeColumn?.cells).size;
    if (onlyTimeColumn && filtered_2.length === 1 && size < UNNAMED_COLUMN_LIMIT)
      return {
        code: "few_times",
        why: `${onlyTimeColumn.name} holds ${formatCount(size, "time")}, too few to find the time axis unasked (that takes ${UNNAMED_COLUMN_LIMIT}). Name x and y`,
      };
    if (!(
      (table.listColumns ?? []).length > 0 || describedColumns.some((column) => column.cells.some(hasDigit))
    ))
      return {
        code: "no_numbers",
        why: "no column holds a number, so there is nothing to draw. Rows are not counted: pass the counts as data",
      };
    return {
      code: "no_x",
      why: filtered.length > 0 ? "say which column is x" : "say which column is x and which are y",
    };
  }
  if (filtered.length === 0)
    return {
      code: "no_y",
      why: `say which columns are y, the values to draw. Rows are not counted: for how many rows share a ${xName}, pass the counts as data`,
    };
  let names = [xName, ...filtered, ...filtered_2].filter((name) => !table.columns.includes(name));
  return names.length > 0
    ? noSuchColumnError(names, table)
    : chartRequest(
        renderKind ?? inferredRoles?.form ?? defaultFormForColumn(describedColumns, xName),
        xName,
        {
          y: filtered,
          by: filtered_2,
        },
      );
}
//@ chunk-3s7ydtfd.js:27038-27067 placement
/**
 * 表来源（path 或 source）
 */
var tableSource = (table) => table.path ?? table.source;
//@ chunk-3s7ydtfd.js:27067-27297 placement
var TABLE_SHAPES = (series, points, shapes) => ({
  source: series.name,
  y: uniqueValues(points.flatMap((point) => point.y)),
  points: shapes.flatMap((shape) =>
    rangeIndices(shape.pointCount).map((index) =>
      Object.fromEntries([...shape.labels, ...shape.cellsByKey.map(([key, cells]) => [key, cells[index]])]),
    ),
  ),
  isSeries: true,
  isReadAtInstants: series.isReadAtInstants,
});
//@ chunk-3s7ydtfd.js:27297-27437 placement
/**
 * 按指标格式生成表（行过多时不保留）。
 */
function finishMetricsTable(series, shapes) {
  let isTooLarge = isTableTooLarge(
    Math.max(0, ...shapes.map((shape) => shape.labels.length + shape.cellsByKey.length)),
    stableSum(shapes.map((shape) => shape.pointCount)),
  );
  return TABLE_SHAPES(series, shapes, isTooLarge ? [] : shapes);
}
//@ chunk-3s7ydtfd.js:27437-27684 placement
var GRAFANA_FIELDS = (response) =>
  selectPath(response, "schema.fields.[]").map((field, index) => ({
    name: String(selectPath(field, "name")[0]),
    displayName: selectPath(field, "config.displayNameFromDS")[0],
    type: selectPath(field, "type")[0],
    labels: selectPath(field, "labels")[0],
    unit: cleanCellText(String(selectPath(field, "config.unit")[0] ?? "")),
    cells: selectPath(response, `data.values.${index}.[]`),
  }));
//@ chunk-3s7ydtfd.js:27684-27769 placement
/**
 * 数值加单位后缀
 */
function withUnitLabel(label, unit) {
  return unit !== "" && parseNumberWithUnit(`1 ${unit}`).kind === "number" && label !== null
    ? `${label} ${unit}`
    : label;
}
//@ chunk-3s7ydtfd.js:27769-27965 placement
/**
 * 给 Grafana 字段起显示名并按单位换算单元格。
 */
var renameGrafanaField = (response, useAlias, isSingleField) => (field) => {
  let alias = field.displayName ?? selectPath(response, "schema.name")[0];
  let name =
    isSingleField && Boolean(alias)
      ? String(alias)
      : `${field.name} ${selectPath(response, "schema.refId")[0]}`;
  return {
    ...field,
    name: useAlias ? field.name : name,
    cells: field.cells.map((cell) => withUnitLabel(cell, field.unit)),
  };
};
//@ chunk-3s7ydtfd.js:27965-28338 placement
function inferCellType(response, preferName, useAlias) {
  let fields = GRAFANA_FIELDS(response);
  let filtered = fields.filter((field) => field.type === "number");
  let filtered_2 = fields.filter((field) => field.type === "string");
  let cells = fields.find((field) => field.type === "time")?.cells ?? [];
  return [
    ...groupIndexBy(
      filtered.map(renameGrafanaField(response, useAlias, preferName && filtered.length === 1)),
      (field) => JSON.stringify(field.labels),
    ).values(),
  ].map((group) => ({
    labels: labelEntries(group[0], "labels"),
    y: group.map((field) => field.name),
    pointCount: cells.length,
    cellsByKey: [...[...filtered_2, ...group].map((field) => [field.name, field.cells]), ["time", cells]],
  }));
}
//@ chunk-3s7ydtfd.js:28338-28700 placement
function readGrafanaFrames(response) {
  let path = selectPath(response, "results.*");
  let mapped = (path.length > 0 ? path : selectPath(response, "data")).map((result) =>
    selectPath(result, "frames.[]"),
  );
  return {
    ...finishMetricsTable(
      {
        name: GRAFANA,
        isReadAtInstants: mapped
          .flat()
          .every((frame) => selectPath(frame, "schema.meta.custom.resultType")[0] === "matrix"),
      },
      mapped.flatMap((frames) =>
        frames.flatMap((frame) => inferCellType(frame, frames.length === 1, mapped.length === 1)),
      ),
    ),
    isSeries: mapped
      .flat()
      .every((frame) => String(selectPath(frame, "schema.meta.type")[0]).startsWith("timeseries")),
  };
}
//@ chunk-3s7ydtfd.js:28700-29052 placement
function readInfluxSeries(value) {
  let [scope] = selectPath(value, "scope");
  if (!(isPlainObject(value) && typeof scope === "string")) return value;
  let [wholeMatch, metric, tags, functions] = METRIC_SELECTOR_RE.exec(String(value.metric)) ?? [];
  let isMetricSelector = wholeMatch !== undefined;
  let keptTags = new Set(isMetricSelector ? scope.split(",") : selectPath(value, "tag_set.[]").map(String));
  keptTags.delete(WILDCARD);
  return {
    ...value,
    metric: isMetricSelector ? metric : value.metric,
    scope:
      (isMetricSelector ? (tags ?? "") : scope)
        .split(",")
        .filter((tag) => !keptTags.has(tag))
        .join(",") || WILDCARD,
    group: [...keptTags].join(",") || undefined,
    functions: functions || undefined,
  };
}
//@ chunk-3s7ydtfd.js:29052-29328 placement
function readDatadogSeries(response) {
  if (!(isPlainObject(response) && selectPath(response, "series.[].pointlist").length > 0)) return response;
  let mapped = selectPath(response, "series.[]").map(readInfluxSeries);
  let mapped_2 = mapped.map((series) =>
    isPlainObject(series)
      ? {
          ...series,
          scope: saveTag(series.scope),
        }
      : series,
  );
  let path = selectPath(mapped_2, "[].scope");
  let canSaveTags =
    path.every((scope) => scope === WILDCARD || isPlainObject(scope)) &&
    uniqueValues(path.flatMap((scope) => (isPlainObject(scope) ? Object.keys(scope) : []))).length <=
      MAX_SERIES_PAIRS;
  return {
    ...response,
    series: canSaveTags ? mapped_2 : mapped,
  };
}
//@ chunk-3s7ydtfd.js:29328-29353 placement
/**
 * 按字段单位换算
 */
var fieldUnitConverter = (unit) => (cell) => withUnitLabel(cell, unit);
//@ chunk-3s7ydtfd.js:29353-29425 placement
/**
 * 取字段单位标签
 */
function fieldUnitOf(response, field) {
  let unit = field.unit;
  return unit !== undefined ? cleanCellText(selectPath(response, unit).join("/")) : "";
}
//@ chunk-3s7ydtfd.js:29425-29551 placement
/**
 * 单个指标系列转为 time/value 表。
 */
var metricsSeriesTable = (series, shape, values) => ({
  labels: shape.labels.flatMap((label) => labelEntries(series, label)),
  y: [VALUE],
  pointCount: values.length,
  cellsByKey: [
    ["time", selectPath(series, shape.time)],
    [VALUE, values],
  ],
});
//@ chunk-3s7ydtfd.js:29551-29627 placement
/**
 * 指标字段转表
 */
var metricsFieldTables = (response, format) =>
  selectPath(response, format.series).map((series) =>
    metricsSeriesTable(
      series,
      format,
      selectPath(series, format.value).map(fieldUnitConverter(fieldUnitOf(series, format))),
    ),
  );
//@ chunk-3s7ydtfd.js:29627-29769 placement
/**
 * 按标签组合统计不同系列数。
 */
var countDistinctSeries = (response, format) =>
  uniqueValues(
    selectPath(response, format.series).map((series) =>
      JSON.stringify(
        Object.entries(
          Object.fromEntries(format.labels.flatMap((label) => labelEntries(series, label))),
        ).toSorted(),
      ),
    ),
  ).length;
//@ chunk-3s7ydtfd.js:29769-29984 placement
/**
 * 依次尝试 Grafana、Datadog 与其他指标格式读出表。
 */
function readMetricsTable(response) {
  let grafanaFrames = readGrafanaFrames(response);
  if (grafanaFrames.points.length > 0) return grafanaFrames;
  let expanded = expandDatadogSeries(response);
  let datadogSeries = readDatadogSeries(expanded);
  let candidates = datadogSeries === expanded ? [expanded] : [datadogSeries, expanded];
  for (let format of METRICS_FORMATS)
    for (let candidate of candidates) {
      let tables = metricsFieldTables(candidate, format);
      let table = finishMetricsTable(format, hasUniformPointCounts(tables) ? tables : []);
      if (
        table.points.length > 0 &&
        countDistinctSeries(candidate, format) >= countDistinctSeries(expanded, format)
      )
        return table;
    }
  return;
}
//@ chunk-3s7ydtfd.js:29984-30009 placement
/**
 * "aligned columns"
 */
var ALIGNED_COLUMNS_LABEL = "aligned columns";
//@ chunk-3s7ydtfd.js:30009-30029 placement
/**
 * "JSON lines"
 */
var JSON_LINES_LABEL = "JSON lines";
//@ chunk-3s7ydtfd.js:30029-30043 placement
/**
 * "JSON"
 */
var JSON_LABEL = "JSON";
//@ chunk-3s7ydtfd.js:30043-30069 placement
/**
 * "columns and rows"
 */
var COLUMNS_ROWS_LABEL = "columns and rows";
//@ chunk-3s7ydtfd.js:30069-30094 placement
/**
 * " with no header"
 */
var NO_HEADER_LABEL = " with no header";
//@ chunk-3s7ydtfd.js:30094-30117 placement
/**
 * <field name="
 */
var XML_FIELD_OPEN = '<field name="';
//@ chunk-3s7ydtfd.js:30117-30133 placement
/**
 * </row>
 */
var XML_ROW_CLOSE = "</row>";
//@ chunk-3s7ydtfd.js:30133-30148 placement
/**
 * <row>
 */
var XML_ROW_OPEN = "<row>";
//@ chunk-3s7ydtfd.js:30148-30166 placement
/**
 * "XML rows"
 */
var XML_ROWS_LABEL = "XML rows";
//@ chunk-3s7ydtfd.js:30166-30221 placement
/**
 * 全部可识别的表来源名
 */
var TABLE_SOURCE_LABELS; // deferred: uses DELIMITED_FORMATS (./parseValues.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3s7ydtfd.js:30166", () => {
  TABLE_SOURCE_LABELS = [
    ...DELIMITED_FORMATS.map((format) => format.source),
    ALIGNED_COLUMNS_LABEL,
    COLUMNS_ROWS_LABEL,
    JSON_LABEL,
    JSON_LINES_LABEL,
    XML_ROWS_LABEL,
    ...METRICS_FORMAT_NAMES,
  ];
});
//@ chunk-3s7ydtfd.js:30221-30230 placement
/**
 * 2
 */
var MIN_TABLE_ROWS = 2;
//@ chunk-3s7ydtfd.js:30230-30240 placement
/**
 * 32
 */
var MAX_NESTED_DEPTH = 32;
//@ chunk-3s7ydtfd.js:30240-30249 placement
/**
 * 2
 */
var MIN_TABLE_COLUMNS = 2;
//@ chunk-3s7ydtfd.js:30249-30322 placement
/**
 * 构造表对象
 */
var makeTable = (source, columns, rows) => ({
  source,
  columns,
  rows,
  hasMadeUpNames: false,
  isCut: false,
});
//@ chunk-3s7ydtfd.js:30322-30343 placement
/**
 * 连续空行
 */
var BLANK_LINE_RUN_RE = /\n(?: *\n)+/;
//@ chunk-3s7ydtfd.js:30343-30363 placement
/**
 * 只有收尾括号
 */
var JSON_CLOSE_ONLY_RE = /^[\]}]\s*$/;
//@ chunk-3s7ydtfd.js:30363-30382 placement
/**
 * 开头括号后还有内容
 */
var JSON_OPEN_WITH_MORE_RE = /^\s*[[{]./;
//@ chunk-3s7ydtfd.js:30382-30401 placement
/**
 * 只有开头括号
 */
var JSON_OPEN_ONLY_RE = /^[[{]\s*$/;
//@ chunk-3s7ydtfd.js:30401-30421 placement
/**
 * 以 { " 开头的行
 */
var JSON_OBJECT_LINE_RE = /^\s*\[?\{"/;
//@ chunk-3s7ydtfd.js:30421-30509 placement
/**
 * 表格分隔线字符
 */
var TABLE_RULE_CHARS_RE = /^[-+|:=\s\u2500\u2502\u250C\u252C\u2510\u251C\u253C\u2524\u2514\u2534\u2518]+$/;
//@ chunk-3s7ydtfd.js:30509-30542 placement
/**
 * 首尾的 * 或 `
 */
var MARKDOWN_EMPHASIS_RE = /^[*`]+|(?<![*`])[*`]+$/g;
//@ chunk-3s7ydtfd.js:30542-30575 placement
/**
 * [文本](链接)
 */
var MARKDOWN_LINK_RE = /^\[([^\]]*)\]\([^)]*\)$/;
//@ chunk-3s7ydtfd.js:30575-30610 placement
/**
 * BOM 与 ANSI 颜色
 */
var BOM_OR_SGR_RE = /^\uFEFF|\u001B\[[0-9;]*m/g;
//@ chunk-3s7ydtfd.js:30610-30659 placement
/**
 * <results truncated="true">
 */
var RESULTS_TRUNCATED_RE = /<results\b[^>]{0,200}\btruncated="true"/;
//@ chunk-3s7ydtfd.js:30659-30737 placement
/**
 * <field name="…">…</field>
 */
var XML_FIELD_RE = /^(?<name>[^"]*)"(?<attributes>[^>]*?)(?:\/>|>(?<text>.*?)<\/field>)/s;
//@ chunk-3s7ydtfd.js:30737-30766 placement
/**
 * null="true"
 */
var XML_NULL_ATTR_RE = /(?:^|\s)null="true"/;
//@ chunk-3s7ydtfd.js:30766-30811 placement
/**
 * 数字实体
 */
var XML_ENTITY_RE = /&#(?:x([0-9a-f]{1,6})|(\d{1,7}));/gi;
//@ chunk-3s7ydtfd.js:30811-30880 placement
/**
 * “[…truncated…]” 提示
 */
var TRUNCATION_NOTE_RE = /[.\u2026 \t]*\[[^\]\n]{0,99}truncated[^\]\n]{0,99}\][. \t]*/;
//@ chunk-3s7ydtfd.js:30880-30931 placement
/**
 * “N rows (M shown)”
 */
var ROWS_COUNTER_RE = /[\u2502|] *[\d,]+ rows \([\d,]+ shown\).*/;
//@ chunk-3s7ydtfd.js:30931-31059 placement
/**
 * 无表头时用 “column N” 作为列名的表。
 */
var unnamedColumnsTable = (rows, source) => ({
  source: `${source}${NO_HEADER_LABEL}`,
  hasMadeUpNames: true,
  isCut: false,
  columns: [...(rows[0] ?? []).keys()].map((key) => `column ${key + 1}`),
  rows,
});
//@ chunk-3s7ydtfd.js:31059-31135 placement
/**
 * 有表头则用，否则造 column N
 */
function tableWithOrWithoutHeader(rows, source) {
  let table = makeTable(source, rows[0] ?? [], rows.slice(1));
  return hasTextHeader(describeTableColumns(table)) ? table : unnamedColumnsTable(rows, source);
}
//@ chunk-3s7ydtfd.js:31135-31216 placement
/**
 * 被截断文本的空表
 */
var CUT_TEXT_TABLE = () => ({
  source: "a cut text",
  columns: [],
  rows: [],
  hasMadeUpNames: false,
  isCut: true,
});
//@ chunk-3s7ydtfd.js:31216-31300 placement
/**
 * 同键的普通对象数组
 */
var isUniformObjectArray = (values) =>
  values.length > 1 &&
  values.every(isPlainObject) &&
  uniqueValues(values.map((value) => Object.keys(value).join())).length === 1;
//@ chunk-3s7ydtfd.js:31300-31411 placement
/**
 * 截取第一行 JSON 开始到最后一行 JSON 结束的行。
 */
function trimToJsonBlock(lines) {
  let index = lines.findIndex((line) => JSON_OPEN_ONLY_RE.test(line));
  return index >= 0
    ? lines.slice(index, lines.findLastIndex((line) => JSON_CLOSE_ONLY_RE.test(line)) + 1)
    : [];
}
//@ chunk-3s7ydtfd.js:31411-31546 placement
/**
 * 值在指定深度下是否还有子值。
 */
function hasNestedValues(value, maxDepth) {
  let level = [value];
  for (let depth = 0; depth <= maxDepth; depth += 1)
    level = level.flatMap((value) =>
      typeof value === "object" && value !== null ? Object.values(value) : [],
    );
  return level.length > 0;
}
//@ chunk-3s7ydtfd.js:31546-31624 placement
/**
 * 解析 JSON，嵌套过深则放弃
 */
function tryParseJson(text) {
  try {
    let parsed = JSON.parse(text);
    return hasNestedValues(parsed, MAX_NESTED_DEPTH) ? undefined : parsed;
  } catch {
    return;
  }
}
//@ chunk-3s7ydtfd.js:31624-31940 placement
function flattenObjectRows(text) {
  let parsed = tryParseJson(text);
  if (parsed !== undefined)
    return {
      values: [parsed],
      unparsedLines: 0,
    };
  let lines = text.split(`
`);
  let blockParsed = tryParseJson(
    trimToJsonBlock(lines).join(`
`),
  );
  if (blockParsed !== undefined)
    return {
      values: [blockParsed],
      unparsedLines: 0,
    };
  let filtered = lines.filter((line) => JSON_OPEN_WITH_MORE_RE.test(line));
  let mapped = filtered.map((line) => tryParseJson(line));
  return {
    values: mapped.filter((value) => value !== undefined),
    unparsedLines: countWhere(
      returnValue(filtered, mapped),
      ([line, value]) => value === undefined && JSON_OBJECT_LINE_RE.test(line),
    ),
  };
}
//@ chunk-3s7ydtfd.js:31940-32000 placement
/**
 * 定长且无对象的数组
 */
var isFlatTupleOf = (length) => (value) =>
  Array.isArray(value) && value.length === length && !value.some(isPlainObject);
//@ chunk-3s7ydtfd.js:32000-32081 placement
/**
 * 构造 JSON 来源的表
 */
var jsonTable = (path, columns, rows) => ({
  source: JSON_LABEL,
  path,
  columns,
  rows,
  hasMadeUpNames: false,
  isCut: false,
});
//@ chunk-3s7ydtfd.js:32081-32140 placement
/**
 * 按列名取单元格
 */
var rowCellsForColumns = (columns) => (value) =>
  (isPlainObject(value) ? columns.map((column) => value[column]) : selectPath(value, "[]")).map(toCellValue);
//@ chunk-3s7ydtfd.js:32140-32184 placement
/**
 * 单格描述
 */
var singleCell = (column, cell) => ({
  column,
  cell,
  isList: false,
});
//@ chunk-3s7ydtfd.js:32184-32229 placement
/**
 * 空的列表格
 */
var emptyListCell = (column) => ({
  column,
  cell: null,
  isList: true,
});
//@ chunk-3s7ydtfd.js:32229-32441 placement
/**
 * 把对象展平为 “a.b” 列（数组中有对象时作为列表列）。
 */
var flattenObject = (value, prefix) =>
  Object.entries(value).flatMap(([key, value]) => {
    let column = `${prefix}${key}`;
    if (typeof value !== "object" || value === null) return [singleCell(column, toCellValue(value))];
    return Array.isArray(value) && value.some((item) => typeof item === "object" && item !== null)
      ? [emptyListCell(column)]
      : flattenObject(value, `${column}.`);
  });
//@ chunk-3s7ydtfd.js:32441-32816 placement
/**
 * 对象数组展平为表（列过多时放弃）。
 */
function readObjectRows(values, source, path) {
  let entries = [];
  let cellCount = 0;
  for (let value of values) {
    let cells = flattenObject(value, "");
    entries.push(cells);
    cellCount += cells.length;
    if (isTableTooLarge(1, cellCount)) return [];
  }
  let cells = entries.flat();
  let columns = uniqueValues(cells.map((cell) => cell.column));
  if (isTableTooLarge(columns.length, values.length)) return [];
  let rows = entries.map((entry) =>
    mapKeysToValues(columns, new Map(entry.map((cell) => [cell.column, cell.cell]))),
  );
  let listColumns = uniqueValues(cells.filter((cell) => cell.isList).map((cell) => cell.column));
  return [
    {
      source,
      path,
      columns,
      rows,
      listColumns,
      hasMadeUpNames: false,
      isCut: false,
    },
  ];
}
//@ chunk-3s7ydtfd.js:32816-32858 placement
/**
 * 对象按列展开
 */
var objectToRowCells = (length) => (tuple) => rangeIndices(length).map((index) => toCellValue(tuple[index]));
//@ chunk-3s7ydtfd.js:32858-32932 placement
/**
 * 无对象的数组
 */
var isScalarArray = (value) =>
  Array.isArray(value) && !value.some((item) => typeof item === "object" && item !== null);
//@ chunk-3s7ydtfd.js:32932-33169 placement
/**
 * 二维数组（首行为表头）读为表。
 */
function readArrayRows(path, path_2) {
  let reduced = path.reduce((acc, array) => Math.max(acc, selectPath(array, "[]").length), 0);
  if (!(
    path.length >= MIN_TABLE_COLUMNS &&
    reduced >= MIN_TABLE_ROWS &&
    !isTableTooLarge(reduced, path.length) &&
    path.every(isScalarArray)
  ))
    return [];
  let [header = [], ...rows] = path.map(objectToRowCells(reduced));
  let table = makeTable(
    JSON_LABEL,
    header.map((cell) => String(cell ?? "")),
    rows,
  );
  return hasTextHeader(describeTableColumns(table))
    ? [
        {
          ...table,
          path: path_2,
        },
      ]
    : [];
}
//@ chunk-3s7ydtfd.js:33169-33219 placement
/**
 * 补上 time 形式的请求
 */
var zeroTimeForm = (shape, by) => ({
  form: "line",
  x: "time",
  y: shape.y,
  by,
});
//@ chunk-3s7ydtfd.js:33219-33382 placement
/**
 * 为表补上系列/时刻与列角色。
 */
function withColumnRoles(shape) {
  let reservedColumns = ["time", ...shape.y];
  return (table) => ({
    ...table,
    isSeries: shape.isSeries,
    isReadAtInstants: shape.isReadAtInstants,
    roles: zeroTimeForm(
      shape,
      table.columns.filter((column) => !reservedColumns.includes(column)),
    ),
  });
}
//@ chunk-3s7ydtfd.js:33382-34173 placement
/**
 * 从 JSON 结果中找到最像表格的数组并读出列。
 */
function readJsonTable(value, readTablesFromText, options = {}) {
  let { path, source = JSON_LABEL } = options;
  if (typeof value === "string") return readTablesFromText(value);
  if (typeof value !== "object" || value === null) return [];
  let metricsTable = readMetricsTable(value);
  if (metricsTable) {
    let objectRows = readObjectRows(metricsTable.points, metricsTable.source);
    return uniqueValues(metricsTable.points.map((point) => point.time)).length < UNNAMED_COLUMN_LIMIT
      ? objectRows
      : objectRows.map(withColumnRoles(metricsTable));
  }
  let columns = selectPath(value, "columns.[]").map((entry) => String(selectPath(entry, "name")[0] ?? entry));
  let path_2 = selectPath(value, "rows.[]");
  if (columns.length > 0 && !isTableTooLarge(columns.length, path_2.length))
    return [makeTable(COLUMNS_ROWS_LABEL, columns, path_2.map(rowCellsForColumns(columns)))];
  if (typeof selectPath(value, "range")[0] === "string" && selectPath(value, "majorDimension")[0] === "ROWS")
    return readArrayRows(selectPath(value, "values.[]"), path === undefined ? "values" : `${path}.values`);
  if (Array.isArray(value))
    return value.length > 0 && value.every(isPlainObject) ? readObjectRows(value, source, path) : [];
  let values = Object.values(value);
  let width = selectPath(values[0], "[]").length;
  return values.length >= MIN_TABLE_ROWS && values.every(isFlatTupleOf(width))
    ? [
        jsonTable(
          path,
          Object.keys(value),
          rangeIndices(width).map((index) => values.map((column) => toCellValue(column[index]))),
        ),
      ]
    : Object.entries(value).flatMap(([key, value]) =>
        readJsonTable(value, readTablesFromText, {
          path: path === undefined ? key : `${path}.${key}`,
        }),
      );
}
//@ chunk-3s7ydtfd.js:34173-34233 placement
/**
 * 按区间截取每行
 */
var columnSlice = (slices) => (line) => slices.map((slice) => line.slice(slice.from, slice.until).trim());
//@ chunk-3s7ydtfd.js:34233-34306 placement
/**
 * 按列宽补齐
 */
var padColumns = (cells, slice) =>
  cells.map((cell) => cell.slice(slice.from, slice.until).padEnd(slice.until - slice.from));
//@ chunk-3s7ydtfd.js:34306-34460 placement
/**
 * 等宽文本表中相邻列能否合并。
 */
var isAlignedSplit = (lines, firstRow) =>
  !firstRow.some((cell) => cell.trim().includes(" ")) &&
  !lines.some((line) => line.trim().includes("  ")) &&
  (!lines.some((line) => /^ +\S/.test(line)) || !lines.some((line) => /\S +$/.test(line)));
//@ chunk-3s7ydtfd.js:34460-34564 placement
/**
 * 两个相邻列区间能否合并。
 */
var canMergeColumns = (firstRow, body) => (left, right) => {
  let range = {
    from: left.from,
    until: right.until,
  };
  return (
    left.until === right.from - 1 && isAlignedSplit(padColumns(firstRow, range), padColumns(body, range))
  );
};
//@ chunk-3s7ydtfd.js:34564-34616 placement
/**
 * 表头各段都可读
 */
var areAllReadableCells = (lines) => (lines[0] ?? "").trim().split(/ +/).every(isUnreadableCell);
//@ chunk-3s7ydtfd.js:34616-34659 placement
/**
 * 正文里有读不出的格
 */
var bodyHasUnreadable = (body) => (range) => padColumns(body, range).slice(1).some(isUnreadableCell);
//@ chunk-3s7ydtfd.js:34659-34778 placement
/**
 * 列区间内是否有内容。
 */
var hasColumnContent = (body, ranges, skipFirst) => (range) => {
  let [head = "", ...rest] = padColumns(body, range);
  return (
    (head.trim() !== "" || !(skipFirst && range.from !== ranges[0]?.from)) && rest.join("").trim() !== ""
  );
};
//@ chunk-3s7ydtfd.js:34778-35054 placement
/**
 * 合并等宽文本表中应属同一列的区间。
 */
function mergeColumnRanges(ranges, body, ruleLines) {
  let bodyUnreadable = bodyHasUnreadable(body);
  let hasContent = hasColumnContent(body, ranges, areAllReadableCells(body));
  let canMerge = canMergeColumns(body, ruleLines);
  let filtered = returnValue(ranges, ranges.slice(1)).filter(
    ([left, right]) => left.until === right.from - 1,
  );
  let onlyAdjacentPairs =
    filtered.length < ranges.length - 1 && filtered.every(([left, right]) => canMerge(left, right));
  let merged = [];
  for (let range of ranges) {
    let last = merged.at(-1);
    if (
      last &&
      canMerge(last, range) &&
      (onlyAdjacentPairs ||
        !hasContent(last) ||
        !hasContent(range) ||
        (bodyUnreadable(last) && bodyUnreadable(range)))
    )
      last.until = range.until;
    else
      merged.push({
        ...range,
      });
  }
  return merged;
}
//@ chunk-3s7ydtfd.js:35054-35381 placement
/**
 * 按空白列切分等宽文本表。
 */
function readAlignedTable(lines) {
  let usedColumns = [];
  for (let line of lines) for (let i = 0; i < line.length; i++) usedColumns[i] ||= line[i] !== " ";
  let filtered = [...usedColumns.keys()].filter((key) => usedColumns[key]);
  let ranges = returnValue(
    filtered.filter((index) => !usedColumns[index - 1]),
    filtered.filter((index) => !usedColumns[index + 1]),
  ).map(([from, until]) => ({
    from,
    until: until + 1,
  }));
  if (isTableTooLarge(ranges.length, lines.length)) return [];
  let body = lines.filter((line) => !TABLE_RULE_CHARS_RE.test(line));
  return body.map(
    columnSlice(
      mergeColumnRanges(
        ranges,
        body,
        lines.filter((line) => TABLE_RULE_CHARS_RE.test(line)),
      ),
    ),
  );
}
//@ chunk-3s7ydtfd.js:35381-35497 placement
/**
 * 表是否有一列全为数字。
 */
var hasNumericColumn = ([header = [], ...rows]) =>
  rows.length > 0 &&
  header.length >= MIN_TABLE_ROWS &&
  [...header.keys()].some((key) =>
    rows.every((row) => parseNumberWithUnit(row[key] ?? "").kind === "number"),
  );
//@ chunk-3s7ydtfd.js:35497-35555 placement
/**
 * 非空且不是纯分隔线
 */
var isUsableHeaderCell = (cell) =>
  cell !== "" && (!TABLE_RULE_CHARS_RE.test(cell) || cell.trim().includes(" "));
//@ chunk-3s7ydtfd.js:35555-35699 placement
/**
 * 从文本中读出所有等宽表。
 */
function readAlignedTables(text) {
  let filtered = text
    .split(BLANK_LINE_RUN_RE)
    .map((block) =>
      readAlignedTable(
        block
          .split(
            `
`,
          )
          .filter(isUsableHeaderCell),
      ),
    )
    .filter(hasNumericColumn);
  return {
    lineCount: filtered.flat().length,
    tables: filtered.map((rows) => tableWithOrWithoutHeader(rows, ALIGNED_COLUMNS_LABEL)),
  };
}
//@ chunk-3s7ydtfd.js:35699-35968 placement
/**
 * 把列数一致的连续行分组为表。
 */
function groupConsistentRows(rows) {
  let groups = [];
  let current = [];
  for (let [index, row] of rows.entries()) {
    let isUsable =
      row.length >= MIN_TABLE_ROWS && row.length <= MAX_TABLE_ROWS_READ && row.some((cell) => cell !== "");
    let width = current[0]?.length ?? row.length;
    if (isUsable && row.length === width) {
      current.push(row);
      continue;
    }
    if (!(isUsable && rows[index + 1]?.length === width)) {
      groups.push(current);
      current = isUsable ? [row] : [];
    }
  }
  groups.push(current);
  return groups.filter((group) => group.length >= MIN_TABLE_COLUMNS);
}
//@ chunk-3s7ydtfd.js:35968-36372 placement
function parseCsvCell(text, format) {
  let regExp = new RegExp(
    `[ ]*(?:"(?<quoted>(?:[^"]|"")*)"[ ]*|(?<plain>[^\\n]*?))(?<end>${format.pattern.source}|\\n)`,
    "gy",
  );
  let rows = [];
  let row = [];
  for (let { groups = {} } of `${text}
`.matchAll(regExp)) {
    row.push(groups.quoted?.replaceAll('""', '"') ?? groups.plain ?? "");
    if (
      groups.end ===
      `
`
    ) {
      rows.push(row);
      row = [];
    }
  }
  return [...rows, row].map((row) =>
    (format.pattern.test("|") && row[0] === "" && row.at(-1) === "" ? row.slice(1, -1) : row).map((cell) =>
      cell.trim().replace(MARKDOWN_EMPHASIS_RE, "").replace(MARKDOWN_LINK_RE, "$1"),
    ),
  );
}
//@ chunk-3s7ydtfd.js:36372-36414 placement
/**
 * 附上未解析行
 */
var withUnparsedLines = (unparsedLines) => (table) => ({
  ...table,
  unparsedLines,
});
//@ chunk-3s7ydtfd.js:36414-36637 placement
/**
 * 按分隔符读表。
 */
function readDelimitedTables(text, format) {
  let rows = parseCsvCell(text, format).filter((row) => !TABLE_RULE_CHARS_RE.test(row.join("")));
  let groups = groupConsistentRows(rows);
  let rows_2 = groups.flat();
  return {
    lineCount: rows_2.flatMap((row) =>
      row.join("").split(`
`),
    ).length,
    tables: groups
      .map((rows) => tableWithOrWithoutHeader(rows, format.source))
      .map(withUnparsedLines(countWhere(rows, (row) => row.length >= MIN_TABLE_ROWS) - rows_2.length)),
  };
}
//@ chunk-3s7ydtfd.js:36637-36670 placement
/**
 * 覆盖了全部行
 */
var coversLineCount = (count) => (result) => result.lineCount === count;
//@ chunk-3s7ydtfd.js:36670-36822 placement
/**
 * 尝试各种文本表格式，取覆盖行数最多的结果。
 */
function readTextTables(text) {
  let results = [
    ...DELIMITED_FORMATS.filter((format) => format.pattern.test(text)).map((format) =>
      readDelimitedTables(text, format),
    ),
    readAlignedTables(text),
  ];
  return results.find(coversLineCount(Math.max(...results.map((result) => result.lineCount))))?.tables ?? [];
}
//@ chunk-3s7ydtfd.js:36822-36882 placement
/**
 * 是 XML 行片段
 */
var isXmlRows = (text) =>
  RESULTS_TRUNCATED_RE.test(text) || text.lastIndexOf(XML_ROW_OPEN) > text.lastIndexOf(XML_ROW_CLOSE);
//@ chunk-3s7ydtfd.js:36882-37132 placement
var HTML_ENTITIES = (text) =>
  text
    .replace(XML_ENTITY_RE, (entity, hex, decimal) => {
      let codePoint = hex === undefined ? Number(decimal) : Number.parseInt(hex, 16);
      return codePoint <= 1114111 ? String.fromCodePoint(codePoint) : entity;
    })
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
//@ chunk-3s7ydtfd.js:37132-37258 placement
/**
 * 解析一个 HTML 单元格（名称与文本）。
 */
function readHtmlCell(text) {
  let groups = XML_FIELD_RE.exec(text)?.groups;
  return groups !== undefined
    ? [
        [
          HTML_ENTITIES(groups.name ?? ""),
          XML_NULL_ATTR_RE.test(groups.attributes ?? "") ? null : HTML_ENTITIES(groups.text ?? ""),
        ],
      ]
    : [];
}
//@ chunk-3s7ydtfd.js:37258-37355 placement
/**
 * 读 XML 片段里的行
 */
function readXmlRows(text) {
  let sliced = text.slice(text.lastIndexOf(XML_ROW_OPEN));
  return new Map(sliced.split(XML_FIELD_OPEN).slice(1).flatMap(readHtmlCell));
}
//@ chunk-3s7ydtfd.js:37355-37615 placement
/**
 * 从 HTML/XML 片段读表。
 */
function readHtmlTable(text) {
  if (!text.trimStart().startsWith("<")) return [];
  let mapped = text
    .split(XML_ROW_CLOSE)
    .slice(0, -1)
    .filter((rowText) => rowText.includes(XML_ROW_OPEN))
    .map(readXmlRows);
  let columns = uniqueValues(mapped.flatMap((row) => [...row.keys()]));
  if (!(columns.length > 0 && !isTableTooLarge(columns.length, mapped.length))) return [];
  return isXmlRows(text)
    ? [CUT_TEXT_TABLE()]
    : [
        makeTable(
          XML_ROWS_LABEL,
          columns,
          mapped.map((row) => mapKeysToValues(columns, row)),
        ),
      ];
}
//@ chunk-3s7ydtfd.js:37615-37777 placement
/**
 * 结果被截断/持久化时的标记。
 */
var TRUNCATION_MARKERS = [
  /<persisted-output>/,
  /<truncated-output>/,
  /Output too large.*/,
  /\(output truncated[^)\n]*\)/,
  ROWS_COUNTER_RE,
  TRUNCATION_NOTE_RE,
  /Error: result \(.* exceeds maximum allowed tokens.*/,
];
//@ chunk-3s7ydtfd.js:37777-37844 placement
var regExp_5; // deferred: uses TRUNCATION_MARKERS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3s7ydtfd.js:37777", () => {
  regExp_5 = new RegExp(`^(?:${TRUNCATION_MARKERS.map((marker) => marker.source).join("|")})$`, "im");
});
//@ chunk-3s7ydtfd.js:37844-37886 placement
/**
 * 未解析行放前面
 */
var withUnparsedLinesFirst = (unparsedLines) => (table) => ({
  unparsedLines,
  ...table,
});
//@ chunk-3s7ydtfd.js:37886-38165 placement
/**
 * 从工具结果文本读表：截断检测、HTML、JSON 行、文本表，并清洗字符串。
 */
function readTablesFromText(text) {
  let text_2 = text.replace(BOM_OR_SGR_RE, "").replaceAll(
    `\r
`,
    `
`,
  );
  if (regExp_5.test(text_2)) return [CUT_TEXT_TABLE()];
  let htmlTable = readHtmlTable(text_2);
  if (htmlTable.length > 0) return cleanAllStrings(htmlTable);
  let { values, unparsedLines } = flattenObjectRows(text_2);
  if (values.length === 0) return cleanAllStrings(readTextTables(text_2));
  let isJsonLines = isUniformObjectArray(values);
  return cleanAllStrings(
    (isJsonLines
      ? readJsonTable(values, readTablesFromText, {
          source: JSON_LINES_LABEL,
        })
      : values.flatMap((value) => readJsonTable(value, readTablesFromText))
    ).map(withUnparsedLinesFirst(unparsedLines)),
  );
}
//@ chunk-3s7ydtfd.js:38165-38213 placement
/**
 * 小写并把空格换成下划线
 */
var toSnakeLabel = (word) => word.toLowerCase().replaceAll(" ", "_");
//@ chunk-3s7ydtfd.js:38213-38232 placement
var JSON_PATH = "json_path";
//@ chunk-3s7ydtfd.js:38232-38248 placement
var UNREAD = "unread";
//@ chunk-3s7ydtfd.js:38248-38317 placement
/**
 * 表来源的展示键
 */
function formatLabel(table) {
  return table.path !== undefined ? JSON_PATH : toSnakeLabel(table.source.replace(NO_HEADER_LABEL, ""));
}
//@ chunk-3s7ydtfd.js:38317-38346 placement
/**
 * 可接受的来源键集合
 */
var TABLE_SOURCE_KEYS; // deferred: uses TABLE_SOURCE_LABELS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3s7ydtfd.js:38317", () => {
  TABLE_SOURCE_KEYS = [...TABLE_SOURCE_LABELS.map(toSnakeLabel), JSON_PATH, UNREAD];
});
//@ chunk-3s7ydtfd.js:38346-38392 placement
/**
 * 向下取 2 的幂
 */
var floorPow2 = (value) => (value < 1 ? 0 : 2 ** Math.floor(Math.log2(value)));
//@ chunk-3s7ydtfd.js:38392-38809 placement
/**
 * 图表结果代码（drawn 以外的 bad_call、no_result、data_not_found、too_long 等）。
 */
var CHART_OUTCOME_CODES = [
  "bad_call",
  "no_result",
  "data_not_found",
  "too_long",
  "cut_short",
  "no_table_read",
  "table_unpicked",
  "no_rows",
  "names_repeat",
  "dates_unread",
  "few_times",
  "no_numbers",
  "no_x",
  "no_y",
  "no_such_column",
  "units_mixed",
  "units_differ",
  "zones_mixed",
  "x_not_times",
  "column_unread",
  "rows_share_x",
  "no_values",
  "bars_partly_unread",
  "share_not_summed",
  "share_not_whole",
  "log_not_line",
  "uneven_step",
  "column_below_zero",
  "failed",
];
//@ chunk-3s7ydtfd.js:38809-38840 placement
/**
 * off/skips_servers
 */
var AUTO_CHART_MODES = ["off", "skips_servers"];
//@ chunk-3s7ydtfd.js:38840-38896 placement
/**
 * last_result/result_id/text/rows/none
 */
var DATA_SOURCE_KINDS = ["last_result", "result_id", "text", "rows", "none"];
//@ chunk-3s7ydtfd.js:38896-39432 placement
var buildEaselTelemetryEvent = (usage, info) => ({
  event: "easel_chart",
  props: {
    outcome: {
      value: usage.outcome,
      of: ["drawn", ...CHART_OUTCOME_CODES],
    },
    form: {
      value: usage.form,
      of: [...Object.keys(CHART_FORMS), "unnamed"],
    },
    format: {
      value: usage.format,
      of: TABLE_SOURCE_KEYS,
    },
    data_from: {
      value: usage.dataFrom,
      of: DATA_SOURCE_KINDS,
    },
    series_bucket: floorPow2(usage.seriesCount),
    point_bucket: floorPow2(usage.pointCount),
    elapsed_ms_bucket: floorPow2(info.elapsedMs),
    is_form_named: usage.isFormNamed,
    has_left_out: usage.hasLeftOut,
    is_form_replaced: usage.isFormReplaced,
    is_asked: info.isAsked,
    is_in_subagent: info.isInSubagent,
    is_on_terminal: info.surfaces.includes("terminal"),
    is_on_app: info.surfaces.some((surface) => surface !== "terminal"),
  },
});
//@ chunk-3s7ydtfd.js:39432-39609 placement
/**
 * 图表结果的特性遥测（省略数据或换了形式记为 sad）。
 */
function chartOutcomeTelemetry(feature, usage) {
  if (usage.hasLeftOut)
    return {
      feature,
      kind: "sad",
      reason: "data_left_out",
    };
  return usage.isFormReplaced
    ? {
        feature,
        kind: "sad",
        reason: "form_replaced",
      }
    : {
        feature,
        kind: "ok",
      };
}
//@ chunk-3s7ydtfd.js:39609-39665 placement
/**
 * 失败的用量事件
 */
var badUsageEvent = (feature, usage) => ({
  feature,
  kind: "bad",
  reason: usage.outcome,
});
//@ chunk-3s7ydtfd.js:39665-39760 placement
/**
 * 按 chart/auto 与结果生成用量事件
 */
function usageEventFor(usage, isAsked) {
  let feature = isAsked ? "easel_chart" : "easel_auto";
  return usage.outcome === "drawn" ? chartOutcomeTelemetry(feature, usage) : badUsageEvent(feature, usage);
}
//@ chunk-3s7ydtfd.js:39760-39901 placement
/**
 * 失败时的默认用量记录。
 */
var FAILED_USAGE = {
  outcome: "failed",
  form: "unnamed",
  isFormNamed: false,
  format: UNREAD,
  dataFrom: "none",
  seriesCount: 0,
  pointCount: 0,
  hasLeftOut: false,
  isFormReplaced: false,
};
//@ chunk-3s7ydtfd.js:39901-39976 placement
/**
 * 设置项事件
 */
var easelSettingsEvent = (value) => ({
  event: "easel_settings",
  props: {
    auto_charts: {
      value,
      of: AUTO_CHART_MODES,
    },
  },
});
//@ chunk-3s7ydtfd.js:39976-40062 placement
/**
 * 失败用量带形式与来源
 */
var failedUsageWithForm = (request, dataFrom) => ({
  ...FAILED_USAGE,
  form: request.form ?? "unnamed",
  isFormNamed: request.form !== undefined,
  dataFrom,
});
//@ chunk-3s7ydtfd.js:40062-40269 placement
function describeNamesReadAsBars(fallbackLabel, chartRequestData, request) {
  if (chartRequestData.kind === "data")
    return chartRequestData.series.length <= (request.top ?? CHART_FORMS.bars.defaultCount)
      ? chartRequestData
      : fallbackLabel;
  return {
    ...chartRequestData,
    problem: {
      ...chartRequestData.problem,
      why: `${request.x ?? "x"} holds names, not times, so bars were read. ` + chartRequestData.problem.why,
    },
  };
}
//@ chunk-3s7ydtfd.js:40269-40279 placement
/**
 * 表格列摘要最多输出 12 行（多表时平分）。
 */
var MAX_TABLE_DESCRIPTION_CHARS = 12;
//@ chunk-3s7ydtfd.js:40279-40289 placement
/**
 * 32
 */
var MAX_COLUMN_DESCRIPTION_CHARS = 32;
//@ chunk-3s7ydtfd.js:40289-40298 placement
/**
 * 3
 */
var TABLE_DESC_SLACK = 3;
//@ chunk-3s7ydtfd.js:40298-40342 placement
var formatCountPart = (count, unit, suffix = "") =>
  count > 0 ? [`${formatCount(count, unit)}${suffix}`] : [];
//@ chunk-3s7ydtfd.js:40342-40352 placement
/**
 * true
 */
var ALLOW_MODEL_ONLY_NOTES = true;
//@ chunk-3s7ydtfd.js:40352-40403 placement
var areAllNumbers = (values) =>
  values.every((value) => parseNumberWithUnit(value, ALLOW_MODEL_ONLY_NOTES).kind === "number");
//@ chunk-3s7ydtfd.js:40403-40458 placement
var numberAxisHint = (values) => (areAllNumbers(values) ? ", read as numbers if named as y" : "");
//@ chunk-3s7ydtfd.js:40458-40510 placement
var previewColumnValues = (cells) =>
  cells.slice(0, TABLE_DESC_SLACK).map((cell) => truncateMiddle(String(cell), MAX_COLUMN_DESCRIPTION_CHARS));
//@ chunk-3s7ydtfd.js:40510-40555 placement
var formatColumnValuePreview = (cells) =>
  ` (${previewColumnValues(cells).join(", ")})${numberAxisHint(cells)}`;
//@ chunk-3s7ydtfd.js:40555-40624 placement
var areAllZonedTimes = (cells) =>
  cells.map((cell) => parseTimeCell(cell)).every((parsed) => parsed.kind === "time" && parsed.isZoned);
//@ chunk-3s7ydtfd.js:40624-40677 placement
var timeAxisHint = (cells) => (areAllZonedTimes(cells) ? ", read as times if named as x" : "");
//@ chunk-3s7ydtfd.js:40677-40884 placement
/**
 * 列的类型计数摘要（数字/时间/文本）。
 */
function columnKindSummary(column) {
  let texts = uniqueValues(column.cellsByKind.get("text") ?? []);
  let numbers = column.cellsByKind.get("number") ?? [];
  return [
    ...formatCountPart(numbers.length, "number", timeAxisHint(numbers)),
    ...formatCountPart(column.cellsByKind.get("time")?.length ?? 0, "time"),
    ...formatCountPart(texts.length, "text", formatColumnValuePreview(texts)),
  ];
}
//@ chunk-3s7ydtfd.js:40884-41012 placement
var describeNonScalarColumn = (isList) =>
  isList
    ? "lists, which are not read. Pass one row for each item as data, with the fields beside the list repeated"
    : "empty";
//@ chunk-3s7ydtfd.js:41012-41086 placement
/**
 * 单表列结构描述
 */
var describeTableColumn = (column, listColumns = []) =>
  `${column.name}: ` +
  (columnKindSummary(column).join(", ") || describeNonScalarColumn(listColumns.includes(column.name)));
//@ chunk-3s7ydtfd.js:41086-41137 placement (2.1.88 match: renderToolUseRejectedMessage, 0.792)
var renderToolUseRejectedMessage = (table) =>
  `${tableSource(table)}, ${formatCount(table.rows.length, "row")}:`;
//@ chunk-3s7ydtfd.js:41137-41244 placement
/**
 * 生成表各列的摘要行（多表时加表头）。
 */
var describeTableColumns_2 = (limit, withHeader) => (table) => {
  let lines = elideList(
    describeTableColumns(table).map((column) => describeTableColumn(column, table.listColumns)),
    limit,
    "more column",
  );
  return withHeader ? [renderToolUseRejectedMessage(table), ...lines] : lines;
};
//@ chunk-3s7ydtfd.js:41244-41306 placement
/**
 * 为表格数据生成列摘要（列类型计数与示例值），多个表时附表头行；与 EnterPlanMode 无关（切分错误）。
 */
var describeTables = (tables) =>
  tables.flatMap(
    describeTableColumns_2(Math.floor(MAX_TABLE_DESCRIPTION_CHARS / tables.length), tables.length > 1),
  );
export {
  matchColumnName,
  readChartData,
  tableSource,
  readTablesFromText,
  MAX_TABLE_ROWS_READ,
  formatLabel,
  MAX_TABLE_DESCRIPTION_CHARS,
  FAILED_USAGE,
  failedUsageWithForm,
  describeNamesReadAsBars,
  describeTables,
  easelSettingsEvent,
  usageEventFor,
  buildEaselTelemetryEvent,
};
