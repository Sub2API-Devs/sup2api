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

//@ chunk-3s7ydtfd.js:22902-23118 placement = saveTag (0.566)
function saveTag(scope) {
  let t = typeof scope === "string" ? scope.split(",") : [];
  let r = t.length <= MAX_SERIES_PAIRS ? t.map((p) => METRIC_KEY_RE.exec(p)?.[1]) : [];
  return r.length > 0 && !r.includes(undefined) && uniqueValues(r).length === r.length
    ? Object.fromEntries(
        returnValue(
          r.map((p) => `${p} tag`),
          t,
        ),
      )
    : scope;
}
//@ chunk-3s7ydtfd.js:23118-23198 placement
/**
 * Datadog 指标对象（expression/scope/pointlist）
 */
var datadogPointlist = (e, pointlist) => ({
  metric: selectPath(e, "expression")[0],
  scope: selectPath(e, "scope")[0],
  pointlist,
});
//@ chunk-3s7ydtfd.js:23198-23229 placement
/**
 * 起始时间 + 间隔算第 n 个点的时刻
 */
var fixedIntervalPoint = (ms, t) => (o, r) => [ms + r * t, o];
//@ chunk-3s7ydtfd.js:23229-23413 placement
/**
 * 读起始时间 + 间隔的数值序列（start_time/interval_ms/values）。
 */
function readFixedIntervalValues(e) {
  let timeCell = parseTimeCell(String(selectPath(e, "start_time")[0]));
  return timeCell.kind === "time" && timeCell.isZoned
    ? selectPath(e, "values")
        .flatMap((r) => String(r).split(","))
        .map(fixedIntervalPoint(timeCell.ms, Number(selectPath(e, "interval_ms")[0])))
    : [];
}
//@ chunk-3s7ydtfd.js:23413-23509 placement
/**
 * 合并定间隔数值与分箱点
 */
var datadogSeriesPoints = (e) =>
  datadogPointlist(e, [
    ...readFixedIntervalValues(e),
    ...selectPath(e, "binned.[]").map((t) => [selectPath(t, "start_time")[0], selectPath(t, "avg")[0]]),
  ]);
//@ chunk-3s7ydtfd.js:23509-23598 placement
/**
 * 把 Datadog 指标数组展开成 series
 */
function expandDatadogSeries(e) {
  return selectPath(e, "[].expression").length > 0
    ? {
        series: selectPath(e, "[]").map((o) => datadogSeriesPoints(o)),
      }
    : e;
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
function describeColumn(name, t) {
  let o = groupIndexBy(t, cellKind);
  let filtered = [...o.keys()].filter((key) => key !== "empty");
  return {
    name,
    cells: t,
    cellsByKind: o,
    soleKind: filtered.length === 1 ? filtered[0] : undefined,
  };
}
//@ chunk-3s7ydtfd.js:23832-23900 placement
/**
 * 按列推断角色
 */
var describeTableColumns = (table) =>
  table.columns.map((column, o) =>
    describeColumn(
      column,
      table.rows.map((r) => r[o] ?? null),
    ),
  );
//@ chunk-3s7ydtfd.js:23900-24022 placement
/**
 * 不区分大小写匹配唯一的列名，否则原样返回。
 */
function matchColumnName(e, t) {
  let [o, ...r] = e.columns.filter((column) => column.toLowerCase() === t.toLowerCase());
  return o !== undefined && r.length === 0 ? o : t;
}
//@ chunk-3s7ydtfd.js:24022-24126 placement
/**
 * 表头像文本行（不是数据）。
 */
var hasTextHeader = (e) =>
  e.every((t) => cellKind(t.name) === "text") ||
  e.some((t) => t.name !== "" && !t.cellsByKind.has(cellKind(t.name)));
//@ chunk-3s7ydtfd.js:24126-24201 placement
/**
 * 全是时间且可解析
 */
var isAllTimeColumn = (e) => e.soleKind === "text" && (e.cellsByKind.get("text") ?? []).every(isTimeCell);
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
var isTableTooLarge = (e, t) => e > MAX_TABLE_ROWS_READ || e * t > MAX_TABLE_CELLS;
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
var isColumnName = (e) => (t) => matchColumnName(e, t);
//@ chunk-3s7ydtfd.js:24365-24401 placement
/**
 * 拼出 {form,x,y,...}
 */
var chartRequest = (form, t, o) => ({
  form,
  x: t,
  ...o,
});
//@ chunk-3s7ydtfd.js:24401-24434 placement
/**
 * 含数字
 */
var hasDigit = (e) => /\d/.test(String(e));
//@ chunk-3s7ydtfd.js:24434-24457 placement
/**
 * 不等于给定值
 */
var isDifferentFrom = (e) => (t) => t !== e;
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
var noSuchColumnError = (e, t) => ({
  code: "no_such_column",
  why: `it has no column ${e.join(", ")}` + (t.roles ? METRICS_COLUMNS_NOTE : ""),
});
//@ chunk-3s7ydtfd.js:24644-24723 placement
/**
 * 单列且值有重复
 */
var isSingleColumnSeries = (e, t) =>
  e.length === 0 || (e.length === 1 && new Set(t.cells).size < t.cells.length);
//@ chunk-3s7ydtfd.js:24723-24773 placement
/**
 * bars 要单列，其他至少一列
 */
var hasEnoughYColumns = (e, t) => (t === "bars" ? e.length === 1 : e.length >= 1);
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
var differsByTime = (e, t) => e.cells.some((cell, r) => timeMsOfCell(cell) !== timeMsOfCell(t.cells[r]));
//@ chunk-3s7ydtfd.js:24898-24917 placement
/**
 * 列名
 */
var columnName = (e) => e.name;
//@ chunk-3s7ydtfd.js:24917-25428 placement
function inferColumnRoles(e, t) {
  let filtered = e.filter((d) => d.name !== "");
  let filtered_2 = filtered.filter((d) => d.soleKind === "text");
  let filtered_3 = filtered.filter((d) => d.soleKind === "number");
  let filtered_4 = filtered.filter(
    (d) =>
      d.cellsByKind.get("time")?.length === d.cells.length && new Set(d.cells).size >= UNNAMED_COLUMN_LIMIT,
  );
  let m = filtered_4.length > 0;
  let [n, ...a] = m ? filtered_4 : filtered_2;
  if (!(n !== undefined && a.length === 0)) return;
  let i = m ? filtered_3.filter((d) => differsByTime(d, n)) : filtered_3;
  let filtered_5 = filtered_2.filter((d) => d !== n);
  let l = t ?? (m ? "line" : "bars");
  return 1 + filtered_5.length + filtered_3.length === filtered.length &&
    isSingleColumnSeries(filtered_5, n) &&
    (m || l === "bars") &&
    (t !== undefined || !isAllTimeColumn(n)) &&
    hasEnoughYColumns(i, l)
    ? {
        form: l,
        x: n.name,
        y: i.map(columnName),
        by: filtered_5.map(columnName),
      }
    : undefined;
}
//@ chunk-3s7ydtfd.js:25428-25511 placement
/**
 * 文本列且非全时间
 */
function isTextBarsColumn(e, t) {
  let found = e.find((r) => r.name === t);
  return found?.soleKind === "text" && !isAllTimeColumn(found);
}
//@ chunk-3s7ydtfd.js:25511-25547 placement
/**
 * 文本列用 bars，否则 line
 */
var defaultFormForColumn = (e, t) => (isTextBarsColumn(e, t) ? "bars" : "line");
//@ chunk-3s7ydtfd.js:25547-27038 placement
/**
 * 根据请求（form/x/y）从表中取出序列，报告缺列、无行、重名等问题。
 */
function readChartData(e, t) {
  let o = t.form === undefined ? undefined : FORM_TO_RENDER_KIND[t.form];
  let roles = o === "bars" ? undefined : e.roles;
  let s = roles ? [] : describeTableColumns(e);
  let p = roles ?? inferColumnRoles(s, o);
  let m = t.x === undefined ? p?.x : matchColumnName(e, t.x);
  let n = isColumnName(e);
  let filtered = uniqueValues(t.y?.map(n) ?? p?.y ?? []).filter(isDifferentFrom(m));
  let filtered_2 = (t.by?.map(n) ?? (t.combine === undefined ? p?.by : undefined) ?? []).filter(
    isDifferentFrom(m),
  );
  if (e.rows.length === 0)
    return {
      code: "no_rows",
      why: "it has no rows",
    };
  if (new Set(e.columns).size < e.columns.length)
    return {
      code: "names_repeat",
      why: "two of its columns share a name, so a name does not pick one. Pass the rows as data, each column under a name of its own",
    };
  if (m === undefined) {
    let found = s.find(isAllTimeColumn);
    if (found)
      return {
        code: "dates_unread",
        why: `${found.name} looks like dates, in a spelling that is not read (${found.cells[0]}). ${TIME_FORMATS_HINT}`,
      };
    let filtered_2 = s.filter((w) => w.soleKind === "time");
    let c = filtered_2[0];
    let size = new Set(c?.cells).size;
    if (c && filtered_2.length === 1 && size < UNNAMED_COLUMN_LIMIT)
      return {
        code: "few_times",
        why: `${c.name} holds ${formatCount(size, "time")}, too few to find the time axis unasked (that takes ${UNNAMED_COLUMN_LIMIT}). Name x and y`,
      };
    if (!((e.listColumns ?? []).length > 0 || s.some((w) => w.cells.some(hasDigit))))
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
      why: `say which columns are y, the values to draw. Rows are not counted: for how many rows share a ${m}, pass the counts as data`,
    };
  let filtered_3 = [m, ...filtered, ...filtered_2].filter((u) => !e.columns.includes(u));
  return filtered_3.length > 0
    ? noSuchColumnError(filtered_3, e)
    : chartRequest(o ?? p?.form ?? defaultFormForColumn(s, m), m, {
        y: filtered,
        by: filtered_2,
      });
}
//@ chunk-3s7ydtfd.js:27038-27067 placement
/**
 * 表来源（path 或 source）
 */
var tableSource = (e) => e.path ?? e.source;
//@ chunk-3s7ydtfd.js:27067-27297 placement
var TABLE_SHAPES = (e, t, o) => ({
  source: e.name,
  y: uniqueValues(t.flatMap((r) => r.y)),
  points: o.flatMap((r) =>
    rangeIndices(r.pointCount).map((s) =>
      Object.fromEntries([...r.labels, ...r.cellsByKey.map(([p, m]) => [p, m[s]])]),
    ),
  ),
  isSeries: true,
  isReadAtInstants: e.isReadAtInstants,
});
//@ chunk-3s7ydtfd.js:27297-27437 placement
/**
 * 按指标格式生成表（行过多时不保留）。
 */
function finishMetricsTable(e, t) {
  let o = isTableTooLarge(
    Math.max(0, ...t.map((r) => r.labels.length + r.cellsByKey.length)),
    stableSum(t.map((r) => r.pointCount)),
  );
  return TABLE_SHAPES(e, t, o ? [] : t);
}
//@ chunk-3s7ydtfd.js:27437-27684 placement
var GRAFANA_FIELDS = (e) =>
  selectPath(e, "schema.fields.[]").map((t, o) => ({
    name: String(selectPath(t, "name")[0]),
    displayName: selectPath(t, "config.displayNameFromDS")[0],
    type: selectPath(t, "type")[0],
    labels: selectPath(t, "labels")[0],
    unit: cleanCellText(String(selectPath(t, "config.unit")[0] ?? "")),
    cells: selectPath(e, `data.values.${o}.[]`),
  }));
//@ chunk-3s7ydtfd.js:27684-27769 placement
/**
 * 数值加单位后缀
 */
function withUnitLabel(e, t) {
  return t !== "" && parseNumberWithUnit(`1 ${t}`).kind === "number" && e !== null ? `${e} ${t}` : e;
}
//@ chunk-3s7ydtfd.js:27769-27965 placement
/**
 * 给 Grafana 字段起显示名并按单位换算单元格。
 */
var renameGrafanaField = (e, t, o) => (r) => {
  let s = r.displayName ?? selectPath(e, "schema.name")[0];
  let m = o && Boolean(s) ? String(s) : `${r.name} ${selectPath(e, "schema.refId")[0]}`;
  return {
    ...r,
    name: t ? r.name : m,
    cells: r.cells.map((cell) => withUnitLabel(cell, r.unit)),
  };
};
//@ chunk-3s7ydtfd.js:27965-28338 placement
function inferCellType(e, t, o) {
  let r = GRAFANA_FIELDS(e);
  let filtered = r.filter((n) => n.type === "number");
  let filtered_2 = r.filter((n) => n.type === "string");
  let cells = r.find((n) => n.type === "time")?.cells ?? [];
  return [
    ...groupIndexBy(filtered.map(renameGrafanaField(e, o, t && filtered.length === 1)), (n) =>
      JSON.stringify(n.labels),
    ).values(),
  ].map((n) => ({
    labels: labelEntries(n[0], "labels"),
    y: n.map((a) => a.name),
    pointCount: cells.length,
    cellsByKey: [...[...filtered_2, ...n].map((a) => [a.name, a.cells]), ["time", cells]],
  }));
}
//@ chunk-3s7ydtfd.js:28338-28700 placement
function readGrafanaFrames(e) {
  let path = selectPath(e, "results.*");
  let mapped = (path.length > 0 ? path : selectPath(e, "data")).map((r) => selectPath(r, "frames.[]"));
  return {
    ...finishMetricsTable(
      {
        name: GRAFANA,
        isReadAtInstants: mapped
          .flat()
          .every((r) => selectPath(r, "schema.meta.custom.resultType")[0] === "matrix"),
      },
      mapped.flatMap((r) => r.flatMap((s) => inferCellType(s, r.length === 1, mapped.length === 1))),
    ),
    isSeries: mapped
      .flat()
      .every((r) => String(selectPath(r, "schema.meta.type")[0]).startsWith("timeseries")),
  };
}
//@ chunk-3s7ydtfd.js:28700-29052 placement
function readInfluxSeries(e) {
  let [t] = selectPath(e, "scope");
  if (!(isPlainObject(e) && typeof t === "string")) return e;
  let [r, s, p, m] = METRIC_SELECTOR_RE.exec(String(e.metric)) ?? [];
  let n = r !== undefined;
  let a = new Set(n ? t.split(",") : selectPath(e, "tag_set.[]").map(String));
  a.delete(WILDCARD);
  return {
    ...e,
    metric: n ? s : e.metric,
    scope:
      (n ? (p ?? "") : t)
        .split(",")
        .filter((f) => !a.has(f))
        .join(",") || WILDCARD,
    group: [...a].join(",") || undefined,
    functions: m || undefined,
  };
}
//@ chunk-3s7ydtfd.js:29052-29328 placement
function readDatadogSeries(e) {
  if (!(isPlainObject(e) && selectPath(e, "series.[].pointlist").length > 0)) return e;
  let mapped = selectPath(e, "series.[]").map(readInfluxSeries);
  let mapped_2 = mapped.map((m) =>
    isPlainObject(m)
      ? {
          ...m,
          scope: saveTag(m.scope),
        }
      : m,
  );
  let path = selectPath(mapped_2, "[].scope");
  let p =
    path.every((m) => m === WILDCARD || isPlainObject(m)) &&
    uniqueValues(path.flatMap((m) => (isPlainObject(m) ? Object.keys(m) : []))).length <= MAX_SERIES_PAIRS;
  return {
    ...e,
    series: p ? mapped_2 : mapped,
  };
}
//@ chunk-3s7ydtfd.js:29328-29353 placement
/**
 * 按字段单位换算
 */
var fieldUnitConverter = (e) => (t) => withUnitLabel(t, e);
//@ chunk-3s7ydtfd.js:29353-29425 placement
/**
 * 取字段单位标签
 */
function fieldUnitOf(e, t) {
  let unit = t.unit;
  return unit !== undefined ? cleanCellText(selectPath(e, unit).join("/")) : "";
}
//@ chunk-3s7ydtfd.js:29425-29551 placement
/**
 * 单个指标系列转为 time/value 表。
 */
var metricsSeriesTable = (e, t, o) => ({
  labels: t.labels.flatMap((label) => labelEntries(e, label)),
  y: [VALUE],
  pointCount: o.length,
  cellsByKey: [
    ["time", selectPath(e, t.time)],
    [VALUE, o],
  ],
});
//@ chunk-3s7ydtfd.js:29551-29627 placement
/**
 * 指标字段转表
 */
var metricsFieldTables = (e, t) =>
  selectPath(e, t.series).map((o) =>
    metricsSeriesTable(o, t, selectPath(o, t.value).map(fieldUnitConverter(fieldUnitOf(o, t)))),
  );
//@ chunk-3s7ydtfd.js:29627-29769 placement
/**
 * 按标签组合统计不同系列数。
 */
var countDistinctSeries = (e, t) =>
  uniqueValues(
    selectPath(e, t.series).map((o) =>
      JSON.stringify(
        Object.entries(Object.fromEntries(t.labels.flatMap((label) => labelEntries(o, label)))).toSorted(),
      ),
    ),
  ).length;
//@ chunk-3s7ydtfd.js:29769-29984 placement
/**
 * 依次尝试 Grafana、Datadog 与其他指标格式读出表。
 */
function readMetricsTable(e) {
  let grafanaFrames = readGrafanaFrames(e);
  if (grafanaFrames.points.length > 0) return grafanaFrames;
  let r = expandDatadogSeries(e);
  let datadogSeries = readDatadogSeries(r);
  let p = datadogSeries === r ? [r] : [datadogSeries, r];
  for (let m of METRICS_FORMATS)
    for (let n of p) {
      let a = metricsFieldTables(n, m);
      let f = finishMetricsTable(m, hasUniformPointCounts(a) ? a : []);
      if (f.points.length > 0 && countDistinctSeries(n, m) >= countDistinctSeries(r, m)) return f;
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
var TABLE_SOURCE_LABELS = [
  ...DELIMITED_FORMATS.map((e) => e.source),
  ALIGNED_COLUMNS_LABEL,
  COLUMNS_ROWS_LABEL,
  JSON_LABEL,
  JSON_LINES_LABEL,
  XML_ROWS_LABEL,
  ...METRICS_FORMAT_NAMES,
];
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
var unnamedColumnsTable = (e, t) => ({
  source: `${t}${NO_HEADER_LABEL}`,
  hasMadeUpNames: true,
  isCut: false,
  columns: [...(e[0] ?? []).keys()].map((key) => `column ${key + 1}`),
  rows: e,
});
//@ chunk-3s7ydtfd.js:31059-31135 placement
/**
 * 有表头则用，否则造 column N
 */
function tableWithOrWithoutHeader(e, t) {
  let table = makeTable(t, e[0] ?? [], e.slice(1));
  return hasTextHeader(describeTableColumns(table)) ? table : unnamedColumnsTable(e, t);
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
var isUniformObjectArray = (e) =>
  e.length > 1 && e.every(isPlainObject) && uniqueValues(e.map((t) => Object.keys(t).join())).length === 1;
//@ chunk-3s7ydtfd.js:31300-31411 placement
/**
 * 截取第一行 JSON 开始到最后一行 JSON 结束的行。
 */
function trimToJsonBlock(lines) {
  let index = lines.findIndex((r) => JSON_OPEN_ONLY_RE.test(r));
  return index >= 0 ? lines.slice(index, lines.findLastIndex((r) => JSON_CLOSE_ONLY_RE.test(r)) + 1) : [];
}
//@ chunk-3s7ydtfd.js:31411-31546 placement
/**
 * 值在指定深度下是否还有子值。
 */
function hasNestedValues(e, t) {
  let o = [e];
  for (let r = 0; r <= t; r += 1)
    o = o.flatMap((s) => (typeof s === "object" && s !== null ? Object.values(s) : []));
  return o.length > 0;
}
//@ chunk-3s7ydtfd.js:31546-31624 placement
/**
 * 解析 JSON，嵌套过深则放弃
 */
function tryParseJson(e) {
  try {
    let parsed = JSON.parse(e);
    return hasNestedValues(parsed, MAX_NESTED_DEPTH) ? undefined : parsed;
  } catch {
    return;
  }
}
//@ chunk-3s7ydtfd.js:31624-31940 placement
function flattenObjectRows(e) {
  let t = tryParseJson(e);
  if (t !== undefined)
    return {
      values: [t],
      unparsedLines: 0,
    };
  let lines = e.split(`
`);
  let r = tryParseJson(
    trimToJsonBlock(lines).join(`
`),
  );
  if (r !== undefined)
    return {
      values: [r],
      unparsedLines: 0,
    };
  let filtered = lines.filter((line) => JSON_OPEN_WITH_MORE_RE.test(line));
  let mapped = filtered.map((m) => tryParseJson(m));
  return {
    values: mapped.filter((m) => m !== undefined),
    unparsedLines: countWhere(
      returnValue(filtered, mapped),
      ([m, n]) => n === undefined && JSON_OBJECT_LINE_RE.test(m),
    ),
  };
}
//@ chunk-3s7ydtfd.js:31940-32000 placement
/**
 * 定长且无对象的数组
 */
var isFlatTupleOf = (e) => (t) => Array.isArray(t) && t.length === e && !t.some(isPlainObject);
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
var rowCellsForColumns = (e) => (t) =>
  (isPlainObject(t) ? e.map((r) => t[r]) : selectPath(t, "[]")).map(toCellValue);
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
var flattenObject = (e, t) =>
  Object.entries(e).flatMap(([key, value]) => {
    let column = `${t}${key}`;
    if (typeof value !== "object" || value === null) return [singleCell(column, toCellValue(value))];
    return Array.isArray(value) && value.some((m) => typeof m === "object" && m !== null)
      ? [emptyListCell(column)]
      : flattenObject(value, `${column}.`);
  });
//@ chunk-3s7ydtfd.js:32441-32816 placement
/**
 * 对象数组展平为表（列过多时放弃）。
 */
function readObjectRows(e, source, path) {
  let r = [];
  let s = 0;
  for (let i of e) {
    let x = flattenObject(i, "");
    r.push(x);
    s += x.length;
    if (isTableTooLarge(1, s)) return [];
  }
  let p = r.flat();
  let m = uniqueValues(p.map((i) => i.column));
  if (isTableTooLarge(m.length, e.length)) return [];
  let rows = r.map((i) => mapKeysToValues(m, new Map(i.map((x) => [x.column, x.cell]))));
  let listColumns = uniqueValues(p.filter((i) => i.isList).map((i) => i.column));
  return [
    {
      source,
      path,
      columns: m,
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
var objectToRowCells = (e) => (t) => rangeIndices(e).map((o) => toCellValue(t[o]));
//@ chunk-3s7ydtfd.js:32858-32932 placement
/**
 * 无对象的数组
 */
var isScalarArray = (e) => Array.isArray(e) && !e.some((t) => typeof t === "object" && t !== null);
//@ chunk-3s7ydtfd.js:32932-33169 placement
/**
 * 二维数组（首行为表头）读为表。
 */
function readArrayRows(path, path_2) {
  let reduced = path.reduce((acc, f) => Math.max(acc, selectPath(f, "[]").length), 0);
  if (!(
    path.length >= MIN_TABLE_COLUMNS &&
    reduced >= MIN_TABLE_ROWS &&
    !isTableTooLarge(reduced, path.length) &&
    path.every(isScalarArray)
  ))
    return [];
  let [s = [], ...p] = path.map(objectToRowCells(reduced));
  let table = makeTable(
    JSON_LABEL,
    s.map((a) => String(a ?? "")),
    p,
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
var zeroTimeForm = (e, by) => ({
  form: "line",
  x: "time",
  y: e.y,
  by,
});
//@ chunk-3s7ydtfd.js:33219-33382 placement
/**
 * 为表补上系列/时刻与列角色。
 */
function withColumnRoles(metricsTable) {
  let t = ["time", ...metricsTable.y];
  return (o) => ({
    ...o,
    isSeries: metricsTable.isSeries,
    isReadAtInstants: metricsTable.isReadAtInstants,
    roles: zeroTimeForm(
      metricsTable,
      o.columns.filter((column) => !t.includes(column)),
    ),
  });
}
//@ chunk-3s7ydtfd.js:33382-34173 placement
/**
 * 从 JSON 结果中找到最像表格的数组并读出列。
 */
function readJsonTable(e, readTablesFromText, o = {}) {
  let { path, source = JSON_LABEL } = o;
  if (typeof e === "string") return readTablesFromText(e);
  if (typeof e !== "object" || e === null) return [];
  let metricsTable = readMetricsTable(e);
  if (metricsTable) {
    let objectRows = readObjectRows(metricsTable.points, metricsTable.source);
    return uniqueValues(metricsTable.points.map((point) => point.time)).length < UNNAMED_COLUMN_LIMIT
      ? objectRows
      : objectRows.map(withColumnRoles(metricsTable));
  }
  let mapped = selectPath(e, "columns.[]").map((u) => String(selectPath(u, "name")[0] ?? u));
  let path_2 = selectPath(e, "rows.[]");
  if (mapped.length > 0 && !isTableTooLarge(mapped.length, path_2.length))
    return [makeTable(COLUMNS_ROWS_LABEL, mapped, path_2.map(rowCellsForColumns(mapped)))];
  if (typeof selectPath(e, "range")[0] === "string" && selectPath(e, "majorDimension")[0] === "ROWS")
    return readArrayRows(selectPath(e, "values.[]"), path === undefined ? "values" : `${path}.values`);
  if (Array.isArray(e)) return e.length > 0 && e.every(isPlainObject) ? readObjectRows(e, source, path) : [];
  let values = Object.values(e);
  let x = selectPath(values[0], "[]").length;
  return values.length >= MIN_TABLE_ROWS && values.every(isFlatTupleOf(x))
    ? [
        jsonTable(
          path,
          Object.keys(e),
          rangeIndices(x).map((u) => values.map((d) => toCellValue(d[u]))),
        ),
      ]
    : Object.entries(e).flatMap(([key, value]) =>
        readJsonTable(value, readTablesFromText, {
          path: path === undefined ? key : `${path}.${key}`,
        }),
      );
}
//@ chunk-3s7ydtfd.js:34173-34233 placement
/**
 * 按区间截取每行
 */
var columnSlice = (e) => (t) => e.map((o) => t.slice(o.from, o.until).trim());
//@ chunk-3s7ydtfd.js:34233-34306 placement
/**
 * 按列宽补齐
 */
var padColumns = (e, t) => e.map((o) => o.slice(t.from, t.until).padEnd(t.until - t.from));
//@ chunk-3s7ydtfd.js:34306-34460 placement
/**
 * 等宽文本表中相邻列能否合并。
 */
var isAlignedSplit = (e, t) =>
  !t.some((o) => o.trim().includes(" ")) &&
  !e.some((o) => o.trim().includes("  ")) &&
  (!e.some((o) => /^ +\S/.test(o)) || !e.some((o) => /\S +$/.test(o)));
//@ chunk-3s7ydtfd.js:34460-34564 placement
/**
 * 两个相邻列区间能否合并。
 */
var canMergeColumns = (e, t) => (o, r) => {
  let s = {
    from: o.from,
    until: r.until,
  };
  return o.until === r.from - 1 && isAlignedSplit(padColumns(e, s), padColumns(t, s));
};
//@ chunk-3s7ydtfd.js:34564-34616 placement
/**
 * 表头各段都可读
 */
var areAllReadableCells = (e) => (e[0] ?? "").trim().split(/ +/).every(isUnreadableCell);
//@ chunk-3s7ydtfd.js:34616-34659 placement
/**
 * 正文里有读不出的格
 */
var bodyHasUnreadable = (e) => (t) => padColumns(e, t).slice(1).some(isUnreadableCell);
//@ chunk-3s7ydtfd.js:34659-34778 placement
/**
 * 列区间内是否有内容。
 */
var hasColumnContent = (e, t, o) => (r) => {
  let [s = "", ...p] = padColumns(e, r);
  return (s.trim() !== "" || !(o && r.from !== t[0]?.from)) && p.join("").trim() !== "";
};
//@ chunk-3s7ydtfd.js:34778-35054 placement
/**
 * 合并等宽文本表中应属同一列的区间。
 */
function mergeColumnRanges(e, t, o) {
  let r = bodyHasUnreadable(t);
  let s = hasColumnContent(t, e, areAllReadableCells(t));
  let p = canMergeColumns(t, o);
  let filtered = returnValue(e, e.slice(1)).filter(([f, i]) => f.until === i.from - 1);
  let n = filtered.length < e.length - 1 && filtered.every(([f, i]) => p(f, i));
  let a = [];
  for (let f of e) {
    let last = a.at(-1);
    if (last && p(last, f) && (n || !s(last) || !s(f) || (r(last) && r(f)))) last.until = f.until;
    else
      a.push({
        ...f,
      });
  }
  return a;
}
//@ chunk-3s7ydtfd.js:35054-35381 placement
/**
 * 按空白列切分等宽文本表。
 */
function readAlignedTable(e) {
  let t = [];
  for (let m of e) for (let i = 0; i < m.length; i++) t[i] ||= m[i] !== " ";
  let filtered = [...t.keys()].filter((key) => t[key]);
  let mapped = returnValue(
    filtered.filter((m) => !t[m - 1]),
    filtered.filter((m) => !t[m + 1]),
  ).map(([m, n]) => ({
    from: m,
    until: n + 1,
  }));
  if (isTableTooLarge(mapped.length, e.length)) return [];
  let filtered_2 = e.filter((m) => !TABLE_RULE_CHARS_RE.test(m));
  return filtered_2.map(
    columnSlice(
      mergeColumnRanges(
        mapped,
        filtered_2,
        e.filter((m) => TABLE_RULE_CHARS_RE.test(m)),
      ),
    ),
  );
}
//@ chunk-3s7ydtfd.js:35381-35497 placement
/**
 * 表是否有一列全为数字。
 */
var hasNumericColumn = ([e = [], ...t]) =>
  t.length > 0 &&
  e.length >= MIN_TABLE_ROWS &&
  [...e.keys()].some((key) => t.every((r) => parseNumberWithUnit(r[key] ?? "").kind === "number"));
//@ chunk-3s7ydtfd.js:35497-35555 placement
/**
 * 非空且不是纯分隔线
 */
var isUsableHeaderCell = (e) => e !== "" && (!TABLE_RULE_CHARS_RE.test(e) || e.trim().includes(" "));
//@ chunk-3s7ydtfd.js:35555-35699 placement
/**
 * 从文本中读出所有等宽表。
 */
function readAlignedTables(e) {
  let filtered = e
    .split(BLANK_LINE_RUN_RE)
    .map((o) =>
      readAlignedTable(
        o
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
    tables: filtered.map((o) => tableWithOrWithoutHeader(o, ALIGNED_COLUMNS_LABEL)),
  };
}
//@ chunk-3s7ydtfd.js:35699-35968 placement
/**
 * 把列数一致的连续行分组为表。
 */
function groupConsistentRows(e) {
  let t = [];
  let o = [];
  for (let [r, s] of e.entries()) {
    let p = s.length >= MIN_TABLE_ROWS && s.length <= MAX_TABLE_ROWS_READ && s.some((f) => f !== "");
    let m = o[0]?.length ?? s.length;
    if (p && s.length === m) {
      o.push(s);
      continue;
    }
    if (!(p && e[r + 1]?.length === m)) {
      t.push(o);
      o = p ? [s] : [];
    }
  }
  t.push(o);
  return t.filter((r) => r.length >= MIN_TABLE_COLUMNS);
}
//@ chunk-3s7ydtfd.js:35968-36372 placement
function parseCsvCell(e, t) {
  let regExp = new RegExp(
    `[ ]*(?:"(?<quoted>(?:[^"]|"")*)"[ ]*|(?<plain>[^\\n]*?))(?<end>${t.pattern.source}|\\n)`,
    "gy",
  );
  let r = [];
  let s = [];
  for (let { groups = {} } of `${e}
`.matchAll(regExp)) {
    s.push(groups.quoted?.replaceAll('""', '"') ?? groups.plain ?? "");
    if (
      groups.end ===
      `
`
    ) {
      r.push(s);
      s = [];
    }
  }
  return [...r, s].map((p) =>
    (t.pattern.test("|") && p[0] === "" && p.at(-1) === "" ? p.slice(1, -1) : p).map((n) =>
      n.trim().replace(MARKDOWN_EMPHASIS_RE, "").replace(MARKDOWN_LINK_RE, "$1"),
    ),
  );
}
//@ chunk-3s7ydtfd.js:36372-36414 placement
/**
 * 附上未解析行
 */
var withUnparsedLines = (unparsedLines) => (t) => ({
  ...t,
  unparsedLines,
});
//@ chunk-3s7ydtfd.js:36414-36637 placement
/**
 * 按分隔符读表。
 */
function readDelimitedTables(e, t) {
  let filtered = parseCsvCell(e, t).filter((p) => !TABLE_RULE_CHARS_RE.test(p.join("")));
  let r = groupConsistentRows(filtered);
  let s = r.flat();
  return {
    lineCount: s.flatMap((p) =>
      p.join("").split(`
`),
    ).length,
    tables: r
      .map((p) => tableWithOrWithoutHeader(p, t.source))
      .map(withUnparsedLines(countWhere(filtered, (p) => p.length >= MIN_TABLE_ROWS) - s.length)),
  };
}
//@ chunk-3s7ydtfd.js:36637-36670 placement
/**
 * 覆盖了全部行
 */
var coversLineCount = (e) => (t) => t.lineCount === e;
//@ chunk-3s7ydtfd.js:36670-36822 placement
/**
 * 尝试各种文本表格式，取覆盖行数最多的结果。
 */
function readTextTables(e) {
  let t = [
    ...DELIMITED_FORMATS.filter((o) => o.pattern.test(e)).map((o) => readDelimitedTables(e, o)),
    readAlignedTables(e),
  ];
  return t.find(coversLineCount(Math.max(...t.map((o) => o.lineCount))))?.tables ?? [];
}
//@ chunk-3s7ydtfd.js:36822-36882 placement
/**
 * 是 XML 行片段
 */
var isXmlRows = (e) =>
  RESULTS_TRUNCATED_RE.test(e) || e.lastIndexOf(XML_ROW_OPEN) > e.lastIndexOf(XML_ROW_CLOSE);
//@ chunk-3s7ydtfd.js:36882-37132 placement
var HTML_ENTITIES = (e) =>
  e
    .replace(XML_ENTITY_RE, (t, o, r) => {
      let s = o === undefined ? Number(r) : Number.parseInt(o, 16);
      return s <= 1114111 ? String.fromCodePoint(s) : t;
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
function readHtmlCell(e) {
  let groups = XML_FIELD_RE.exec(e)?.groups;
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
function readXmlRows(e) {
  let sliced = e.slice(e.lastIndexOf(XML_ROW_OPEN));
  return new Map(sliced.split(XML_FIELD_OPEN).slice(1).flatMap(readHtmlCell));
}
//@ chunk-3s7ydtfd.js:37355-37615 placement
/**
 * 从 HTML/XML 片段读表。
 */
function readHtmlTable(e) {
  if (!e.trimStart().startsWith("<")) return [];
  let mapped = e
    .split(XML_ROW_CLOSE)
    .slice(0, -1)
    .filter((p) => p.includes(XML_ROW_OPEN))
    .map(readXmlRows);
  let r = uniqueValues(mapped.flatMap((p) => [...p.keys()]));
  if (!(r.length > 0 && !isTableTooLarge(r.length, mapped.length))) return [];
  return isXmlRows(e)
    ? [CUT_TEXT_TABLE()]
    : [
        makeTable(
          XML_ROWS_LABEL,
          r,
          mapped.map((p) => mapKeysToValues(r, p)),
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
var regExp_5 = new RegExp(`^(?:${TRUNCATION_MARKERS.map((e) => e.source).join("|")})$`, "im");
//@ chunk-3s7ydtfd.js:37844-37886 placement
/**
 * 未解析行放前面
 */
var withUnparsedLinesFirst = (unparsedLines) => (t) => ({
  unparsedLines,
  ...t,
});
//@ chunk-3s7ydtfd.js:37886-38165 placement
/**
 * 从工具结果文本读表：截断检测、HTML、JSON 行、文本表，并清洗字符串。
 */
function readTablesFromText(e) {
  let replaced = e.replace(BOM_OR_SGR_RE, "").replaceAll(
    `\r
`,
    `
`,
  );
  if (regExp_5.test(replaced)) return [CUT_TEXT_TABLE()];
  let htmlTable = readHtmlTable(replaced);
  if (htmlTable.length > 0) return cleanAllStrings(htmlTable);
  let { values, unparsedLines } = flattenObjectRows(replaced);
  if (values.length === 0) return cleanAllStrings(readTextTables(replaced));
  let m = isUniformObjectArray(values);
  return cleanAllStrings(
    (m
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
var toSnakeLabel = (e) => e.toLowerCase().replaceAll(" ", "_");
//@ chunk-3s7ydtfd.js:38213-38232 placement
var JSON_PATH = "json_path";
//@ chunk-3s7ydtfd.js:38232-38248 placement
var UNREAD = "unread";
//@ chunk-3s7ydtfd.js:38248-38317 placement
/**
 * 表来源的展示键
 */
function formatLabel(e) {
  return e.path !== undefined ? JSON_PATH : toSnakeLabel(e.source.replace(NO_HEADER_LABEL, ""));
}
//@ chunk-3s7ydtfd.js:38317-38346 placement
/**
 * 可接受的来源键集合
 */
var TABLE_SOURCE_KEYS = [...TABLE_SOURCE_LABELS.map(toSnakeLabel), JSON_PATH, UNREAD];
//@ chunk-3s7ydtfd.js:38346-38392 placement
/**
 * 向下取 2 的幂
 */
var floorPow2 = (e) => (e < 1 ? 0 : 2 ** Math.floor(Math.log2(e)));
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
var buildEaselTelemetryEvent = (e, t) => ({
  event: "easel_chart",
  props: {
    outcome: {
      value: e.outcome,
      of: ["drawn", ...CHART_OUTCOME_CODES],
    },
    form: {
      value: e.form,
      of: [...Object.keys(CHART_FORMS), "unnamed"],
    },
    format: {
      value: e.format,
      of: TABLE_SOURCE_KEYS,
    },
    data_from: {
      value: e.dataFrom,
      of: DATA_SOURCE_KINDS,
    },
    series_bucket: floorPow2(e.seriesCount),
    point_bucket: floorPow2(e.pointCount),
    elapsed_ms_bucket: floorPow2(t.elapsedMs),
    is_form_named: e.isFormNamed,
    has_left_out: e.hasLeftOut,
    is_form_replaced: e.isFormReplaced,
    is_asked: t.isAsked,
    is_in_subagent: t.isInSubagent,
    is_on_terminal: t.surfaces.includes("terminal"),
    is_on_app: t.surfaces.some((surface) => surface !== "terminal"),
  },
});
//@ chunk-3s7ydtfd.js:39432-39609 placement
/**
 * 图表结果的特性遥测（省略数据或换了形式记为 sad）。
 */
function chartOutcomeTelemetry(feature, t) {
  if (t.hasLeftOut)
    return {
      feature,
      kind: "sad",
      reason: "data_left_out",
    };
  return t.isFormReplaced
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
var badUsageEvent = (feature, t) => ({
  feature,
  kind: "bad",
  reason: t.outcome,
});
//@ chunk-3s7ydtfd.js:39665-39760 placement
/**
 * 按 chart/auto 与结果生成用量事件
 */
function usageEventFor(e, isAsked) {
  let feature = isAsked ? "easel_chart" : "easel_auto";
  return e.outcome === "drawn" ? chartOutcomeTelemetry(feature, e) : badUsageEvent(feature, e);
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
var failedUsageWithForm = (e, dataFrom) => ({
  ...FAILED_USAGE,
  form: e.form ?? "unnamed",
  isFormNamed: e.form !== undefined,
  dataFrom,
});
//@ chunk-3s7ydtfd.js:40062-40269 placement
function describeNamesReadAsBars(chartRequestData, chartRequestData_2, o) {
  if (chartRequestData_2.kind === "data")
    return chartRequestData_2.series.length <= (o.top ?? CHART_FORMS.bars.defaultCount)
      ? chartRequestData_2
      : chartRequestData;
  return {
    ...chartRequestData_2,
    problem: {
      ...chartRequestData_2.problem,
      why: `${o.x ?? "x"} holds names, not times, so bars were read. ` + chartRequestData_2.problem.why,
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
var formatCountPart = (e, t, o = "") => (e > 0 ? [`${formatCount(e, t)}${o}`] : []);
//@ chunk-3s7ydtfd.js:40342-40352 placement
/**
 * true
 */
var ALLOW_MODEL_ONLY_NOTES = true;
//@ chunk-3s7ydtfd.js:40352-40403 placement
var areAllNumbers = (e) => e.every((t) => parseNumberWithUnit(t, ALLOW_MODEL_ONLY_NOTES).kind === "number");
//@ chunk-3s7ydtfd.js:40403-40458 placement
var numberAxisHint = (e) => (areAllNumbers(e) ? ", read as numbers if named as y" : "");
//@ chunk-3s7ydtfd.js:40458-40510 placement
var previewColumnValues = (e) =>
  e.slice(0, TABLE_DESC_SLACK).map((t) => truncateMiddle(String(t), MAX_COLUMN_DESCRIPTION_CHARS));
//@ chunk-3s7ydtfd.js:40510-40555 placement
var formatColumnValuePreview = (e) => ` (${previewColumnValues(e).join(", ")})${numberAxisHint(e)}`;
//@ chunk-3s7ydtfd.js:40555-40624 placement
var areAllZonedTimes = (e) => e.map((t) => parseTimeCell(t)).every((t) => t.kind === "time" && t.isZoned);
//@ chunk-3s7ydtfd.js:40624-40677 placement
var timeAxisHint = (e) => (areAllZonedTimes(e) ? ", read as times if named as x" : "");
//@ chunk-3s7ydtfd.js:40677-40884 placement
/**
 * 列的类型计数摘要（数字/时间/文本）。
 */
function columnKindSummary(e) {
  let t = uniqueValues(e.cellsByKind.get("text") ?? []);
  let o = e.cellsByKind.get("number") ?? [];
  return [
    ...formatCountPart(o.length, "number", timeAxisHint(o)),
    ...formatCountPart(e.cellsByKind.get("time")?.length ?? 0, "time"),
    ...formatCountPart(t.length, "text", formatColumnValuePreview(t)),
  ];
}
//@ chunk-3s7ydtfd.js:40884-41012 placement
var describeNonScalarColumn = (e) =>
  e
    ? "lists, which are not read. Pass one row for each item as data, with the fields beside the list repeated"
    : "empty";
//@ chunk-3s7ydtfd.js:41012-41086 placement
/**
 * 单表列结构描述
 */
var describeTableColumn = (e, listColumns = []) =>
  `${e.name}: ` + (columnKindSummary(e).join(", ") || describeNonScalarColumn(listColumns.includes(e.name)));
//@ chunk-3s7ydtfd.js:41086-41137 placement = renderToolUseRejectedMessage (0.792)
var renderToolUseRejectedMessage = (e) => `${tableSource(e)}, ${formatCount(e.rows.length, "row")}:`;
//@ chunk-3s7ydtfd.js:41137-41244 placement
/**
 * 生成表各列的摘要行（多表时加表头）。
 */
var describeTableColumns_2 = (e, t) => (o) => {
  let r = elideList(
    describeTableColumns(o).map((s) => describeTableColumn(s, o.listColumns)),
    e,
    "more column",
  );
  return t ? [renderToolUseRejectedMessage(o), ...r] : r;
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
