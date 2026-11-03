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
  Ip,
  ty,
  parseTimeCell,
  parseNumberWithUnit,
  sr,
  TIME_FORMATS_HINT,
  labelEntries,
  GRAFANA,
  ry,
  vt,
  VALUE,
  METRICS_FORMATS,
  Np,
  DELIMITED_FORMATS,
  qc,
  toCellValue,
  Ft,
  jt,
} from "./parseValues.js";
import {
  U,
  returnValue,
  selectPath,
  groupIndexBy,
  K,
  ne,
  stableSum,
  cleanCellText,
  N,
  ys,
  cleanAllStrings,
  CHART_FORMS,
  truncateMiddle,
  Et,
} from "./chartSchema.js";

//@ chunk-3s7ydtfd.js:22902-23118 placement = saveTag (0.566)
function saveTag(e) {
  let t = typeof e === "string" ? e.split(",") : [],
    r = t.length <= Ip ? t.map((p) => ty.exec(p)?.[1]) : [];
  return r.length > 0 && !r.includes(void 0) && U(r).length === r.length
    ? Object.fromEntries(
        returnValue(
          r.map((p) => `${p} tag`),
          t,
        ),
      )
    : e;
}
//@ chunk-3s7ydtfd.js:23118-23198 placement
var wp = (e, t) => ({
  metric: selectPath(e, "expression")[0],
  scope: selectPath(e, "scope")[0],
  pointlist: t,
});
//@ chunk-3s7ydtfd.js:23198-23229 placement
var kp = (e, t) => (o, r) => [e + r * t, o];
/**
 * 读起始时间 + 间隔的数值序列（start_time/interval_ms/values）。
 */
//@ chunk-3s7ydtfd.js:23229-23413 placement
function readFixedIntervalValues(e) {
  let t = parseTimeCell(String(selectPath(e, "start_time")[0]));
  return t.kind === "time" && t.isZoned
    ? selectPath(e, "values")
        .flatMap((r) => String(r).split(","))
        .map(kp(t.ms, Number(selectPath(e, "interval_ms")[0])))
    : [];
}
//@ chunk-3s7ydtfd.js:23413-23509 placement
var Dp = (e) =>
  wp(e, [
    ...readFixedIntervalValues(e),
    ...selectPath(e, "binned.[]").map((t) => [selectPath(t, "start_time")[0], selectPath(t, "avg")[0]]),
  ]);
//@ chunk-3s7ydtfd.js:23509-23598 placement
function Up(e) {
  return selectPath(e, "[].expression").length > 0 ? { series: selectPath(e, "[]").map((o) => Dp(o)) } : e;
}
//@ chunk-3s7ydtfd.js:23598-23689 placement
function nt(e) {
  let t = parseNumberWithUnit(e),
    { kind: kind } = t.kind === "unread" ? parseTimeCell(e) : t;
  return kind === "unread" ? "text" : kind;
}
/**
 * 列信息：按单元格类型分组，判断是否只有一种类型。
 */
//@ chunk-3s7ydtfd.js:23689-23832 placement
function describeColumn(e, t) {
  let o = groupIndexBy(t, nt),
    filtered = [...o.keys()].filter((s) => s !== "empty");
  return { name: e, cells: t, cellsByKind: o, soleKind: filtered.length === 1 ? filtered[0] : void 0 };
}
//@ chunk-3s7ydtfd.js:23832-23900 placement
var at = (e) =>
  e.columns.map((column, o) =>
    describeColumn(
      column,
      e.rows.map((row) => row[o] ?? null),
    ),
  );
/**
 * 不区分大小写匹配唯一的列名，否则原样返回。
 */
//@ chunk-3s7ydtfd.js:23900-24022 placement
function matchColumnName(e, t) {
  let [o, ...r] = e.columns.filter((column) => column.toLowerCase() === t.toLowerCase());
  return o !== void 0 && r.length === 0 ? o : t;
}
/**
 * 表头像文本行（不是数据）。
 */
//@ chunk-3s7ydtfd.js:24022-24126 placement
var hasTextHeader = (e) =>
  e.every((t) => nt(t.name) === "text") || e.some((t) => t.name !== "" && !t.cellsByKind.has(nt(t.name)));
//@ chunk-3s7ydtfd.js:24126-24201 placement
var Ke = (e) => e.soleKind === "text" && (e.cellsByKind.get("text") ?? []).every(sr);
//@ chunk-3s7ydtfd.js:24201-24215 placement
var yy = 262144;
//@ chunk-3s7ydtfd.js:24215-24226 placement
var xr = 200;
//@ chunk-3s7ydtfd.js:24226-24235 placement
var Ht = 3;
//@ chunk-3s7ydtfd.js:24235-24262 placement
var Re = (e, t) => e > xr || e * t > yy;
//@ chunk-3s7ydtfd.js:24262-24340 placement
var Sy = { line: "line", columns: "columns", bars: "bars", sparks: "line", share: "bars" };
//@ chunk-3s7ydtfd.js:24340-24365 placement
var vp = (e) => (t) => matchColumnName(e, t);
//@ chunk-3s7ydtfd.js:24365-24401 placement
var Wp = (e, t, o) => ({ form: e, x: t, ...o });
//@ chunk-3s7ydtfd.js:24401-24434 placement
var Hp = (e) => /\d/.test(String(e));
//@ chunk-3s7ydtfd.js:24434-24457 placement
var ur = (e) => (t) => t !== e;
//@ chunk-3s7ydtfd.js:24457-24549 placement
var Ey = ". It was read as a metrics format, into the columns below: x and y can be left out";
//@ chunk-3s7ydtfd.js:24549-24644 placement
var Gp = (e, t) => ({
  code: "no_such_column",
  why: `it has no column ${e.join(", ")}` + (t.roles ? Ey : ""),
});
//@ chunk-3s7ydtfd.js:24644-24723 placement
var Xp = (e, t) => e.length === 0 || (e.length === 1 && new Set(t.cells).size < t.cells.length);
//@ chunk-3s7ydtfd.js:24723-24773 placement
var Kp = (e, t) => (t === "bars" ? e.length === 1 : e.length >= 1);
//@ chunk-3s7ydtfd.js:24773-24840 placement
function dr(e = null) {
  let t = parseTimeCell(e);
  return t.kind === "time" ? t.ms : void 0;
}
//@ chunk-3s7ydtfd.js:24840-24898 placement
var zp = (e, t) => e.cells.some((cell, r) => dr(cell) !== dr(t.cells[r]));
//@ chunk-3s7ydtfd.js:24898-24917 placement
var cr = (e) => e.name;
//@ chunk-3s7ydtfd.js:24917-25428 placement
function inferColumnRoles(e, t) {
  let filtered = e.filter((d) => d.name !== ""),
    filtered_2 = filtered.filter((d) => d.soleKind === "text"),
    filtered_3 = filtered.filter((d) => d.soleKind === "number"),
    filtered_4 = filtered.filter(
      (d) => d.cellsByKind.get("time")?.length === d.cells.length && new Set(d.cells).size >= Ht,
    ),
    m = filtered_4.length > 0,
    [n, ...a] = m ? filtered_4 : filtered_2;
  if (!(n !== void 0 && a.length === 0)) return;
  let i = m ? filtered_3.filter((d) => zp(d, n)) : filtered_3,
    filtered_5 = filtered_2.filter((d) => d !== n),
    l = t ?? (m ? "line" : "bars");
  return 1 + filtered_5.length + filtered_3.length === filtered.length &&
    Xp(filtered_5, n) &&
    (m || l === "bars") &&
    (t !== void 0 || !Ke(n)) &&
    Kp(i, l)
    ? { form: l, x: n.name, y: i.map(cr), by: filtered_5.map(cr) }
    : void 0;
}
//@ chunk-3s7ydtfd.js:25428-25511 placement
function Jp(e, t) {
  let found = e.find((r) => r.name === t);
  return found?.soleKind === "text" && !Ke(found);
}
//@ chunk-3s7ydtfd.js:25511-25547 placement
var Vp = (e, t) => (Jp(e, t) ? "bars" : "line");
/**
 * 根据请求（form/x/y）从表中取出序列，报告缺列、无行、重名等问题。
 */
//@ chunk-3s7ydtfd.js:25547-27038 placement
function readChartData(e, t) {
  let o = t.form === void 0 ? void 0 : Sy[t.form],
    r = o === "bars" ? void 0 : e.roles,
    s = r ? [] : at(e),
    p = r ?? inferColumnRoles(s, o),
    m = t.x === void 0 ? p?.x : matchColumnName(e, t.x),
    n = vp(e),
    filtered = U(t.y?.map(n) ?? p?.y ?? []).filter(ur(m)),
    filtered_2 = (t.by?.map(n) ?? (t.combine === void 0 ? p?.by : void 0) ?? []).filter(ur(m));
  if (e.rows.length === 0) return { code: "no_rows", why: "it has no rows" };
  if (new Set(e.columns).size < e.columns.length)
    return {
      code: "names_repeat",
      why: "two of its columns share a name, so a name does not pick one. Pass the rows as data, each column under a name of its own",
    };
  if (m === void 0) {
    let found = s.find(Ke);
    if (found)
      return {
        code: "dates_unread",
        why: `${found.name} looks like dates, in a spelling that is not read (${found.cells[0]}). ${TIME_FORMATS_HINT}`,
      };
    let filtered_2 = s.filter((w) => w.soleKind === "time"),
      c = filtered_2[0],
      size = new Set(c?.cells).size;
    if (c && filtered_2.length === 1 && size < Ht)
      return {
        code: "few_times",
        why: `${c.name} holds ${K(size, "time")}, too few to find the time axis unasked (that takes ${Ht}). Name x and y`,
      };
    if (!((e.listColumns ?? []).length > 0 || s.some((w) => w.cells.some(Hp))))
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
    ? Gp(filtered_3, e)
    : Wp(o ?? p?.form ?? Vp(s, m), m, { y: filtered, by: filtered_2 });
}
//@ chunk-3s7ydtfd.js:27038-27067 placement
var yr = (e) => e.path ?? e.source;
//@ chunk-3s7ydtfd.js:27067-27297 placement
var TABLE_SHAPES = (e, t, o) => ({
  source: e.name,
  y: U(t.flatMap((r) => r.y)),
  points: o.flatMap((r) =>
    ne(r.pointCount).map((s) =>
      Object.fromEntries([...r.labels, ...r.cellsByKey.map(([p, m]) => [p, m[s]])]),
    ),
  ),
  isSeries: !0,
  isReadAtInstants: e.isReadAtInstants,
});
/**
 * 按指标格式生成表（行过多时不保留）。
 */
//@ chunk-3s7ydtfd.js:27297-27437 placement
function finishMetricsTable(e, t) {
  let o = Re(
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
function Xt(e, t) {
  return t !== "" && parseNumberWithUnit(`1 ${t}`).kind === "number" && e !== null ? `${e} ${t}` : e;
}
/**
 * 给 Grafana 字段起显示名并按单位换算单元格。
 */
//@ chunk-3s7ydtfd.js:27769-27965 placement
var renameGrafanaField = (e, t, o) => (r) => {
  let s = r.displayName ?? selectPath(e, "schema.name")[0],
    m = o && Boolean(s) ? String(s) : `${r.name} ${selectPath(e, "schema.refId")[0]}`;
  return { ...r, name: t ? r.name : m, cells: r.cells.map((cell) => Xt(cell, r.unit)) };
};
//@ chunk-3s7ydtfd.js:27965-28338 placement
function inferCellType(e, t, o) {
  let r = GRAFANA_FIELDS(e),
    filtered = r.filter((n) => n.type === "number"),
    filtered_2 = r.filter((n) => n.type === "string"),
    m = r.find((n) => n.type === "time")?.cells ?? [];
  return [
    ...groupIndexBy(filtered.map(renameGrafanaField(e, o, t && filtered.length === 1)), (n) =>
      JSON.stringify(n.labels),
    ).values(),
  ].map((n) => ({
    labels: labelEntries(n[0], "labels"),
    y: n.map((a) => a.name),
    pointCount: m.length,
    cellsByKey: [...[...filtered_2, ...n].map((a) => [a.name, a.cells]), ["time", m]],
  }));
}
//@ chunk-3s7ydtfd.js:28338-28700 placement
function readGrafanaFrames(e) {
  let t = selectPath(e, "results.*"),
    mapped = (t.length > 0 ? t : selectPath(e, "data")).map((r) => selectPath(r, "frames.[]"));
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
  if (!(N(e) && typeof t === "string")) return e;
  let [r, s, p, m] = ry.exec(String(e.metric)) ?? [],
    n = r !== void 0,
    a = new Set(n ? t.split(",") : selectPath(e, "tag_set.[]").map(String));
  return (
    a.delete(vt),
    {
      ...e,
      metric: n ? s : e.metric,
      scope:
        (n ? (p ?? "") : t)
          .split(",")
          .filter((f) => !a.has(f))
          .join(",") || vt,
      group: [...a].join(",") || void 0,
      functions: m || void 0,
    }
  );
}
//@ chunk-3s7ydtfd.js:29052-29328 placement
function readDatadogSeries(e) {
  if (!(N(e) && selectPath(e, "series.[].pointlist").length > 0)) return e;
  let mapped = selectPath(e, "series.[]").map(readInfluxSeries),
    mapped_2 = mapped.map((m) => (N(m) ? { ...m, scope: saveTag(m.scope) } : m)),
    s = selectPath(mapped_2, "[].scope"),
    p = s.every((m) => m === vt || N(m)) && U(s.flatMap((m) => (N(m) ? Object.keys(m) : []))).length <= Ip;
  return { ...e, series: p ? mapped_2 : mapped };
}
//@ chunk-3s7ydtfd.js:29328-29353 placement
var pm = (e) => (t) => Xt(t, e);
//@ chunk-3s7ydtfd.js:29353-29425 placement
function mm(e, t) {
  let unit = t.unit;
  return unit !== void 0 ? cleanCellText(selectPath(e, unit).join("/")) : "";
}
/**
 * 单个指标系列转为 time/value 表。
 */
//@ chunk-3s7ydtfd.js:29425-29551 placement
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
var am = (e, t) =>
  selectPath(e, t.series).map((o) => metricsSeriesTable(o, t, selectPath(o, t.value).map(pm(mm(o, t)))));
/**
 * 按标签组合统计不同系列数。
 */
//@ chunk-3s7ydtfd.js:29627-29769 placement
var countDistinctSeries = (e, t) =>
  U(
    selectPath(e, t.series).map((o) =>
      JSON.stringify(
        Object.entries(Object.fromEntries(t.labels.flatMap((label) => labelEntries(o, label)))).toSorted(),
      ),
    ),
  ).length;
/**
 * 依次尝试 Grafana、Datadog 与其他指标格式读出表。
 */
//@ chunk-3s7ydtfd.js:29769-29984 placement
function readMetricsTable(e) {
  let t = readGrafanaFrames(e);
  if (t.points.length > 0) return t;
  let r = Up(e),
    s = readDatadogSeries(r),
    p = s === r ? [r] : [s, r];
  for (let m of METRICS_FORMATS)
    for (let n of p) {
      let a = am(n, m),
        f = finishMetricsTable(m, Np(a) ? a : []);
      if (f.points.length > 0 && countDistinctSeries(n, m) >= countDistinctSeries(r, m)) return f;
    }
  return;
}
//@ chunk-3s7ydtfd.js:29984-30009 placement
var fm = "aligned columns";
//@ chunk-3s7ydtfd.js:30009-30029 placement
var im = "JSON lines";
//@ chunk-3s7ydtfd.js:30029-30043 placement
var zt = "JSON";
//@ chunk-3s7ydtfd.js:30043-30069 placement
var lm = "columns and rows";
//@ chunk-3s7ydtfd.js:30069-30094 placement
var xm = " with no header";
//@ chunk-3s7ydtfd.js:30094-30117 placement
var nh = '<field name="';
//@ chunk-3s7ydtfd.js:30117-30133 placement
var um = "</row>";
//@ chunk-3s7ydtfd.js:30133-30148 placement
var Tr = "<row>";
//@ chunk-3s7ydtfd.js:30148-30166 placement
var dm = "XML rows";
//@ chunk-3s7ydtfd.js:30166-30221 placement
var ah = [...DELIMITED_FORMATS.map((e) => e.source), fm, lm, zt, im, dm, ...qc];
//@ chunk-3s7ydtfd.js:30221-30230 placement
var it = 2;
//@ chunk-3s7ydtfd.js:30230-30240 placement
var ih = 32;
//@ chunk-3s7ydtfd.js:30240-30249 placement
var cm = 2;
//@ chunk-3s7ydtfd.js:30249-30322 placement
var de = (e, t, o) => ({ source: e, columns: t, rows: o, hasMadeUpNames: !1, isCut: !1 });
//@ chunk-3s7ydtfd.js:30322-30343 placement
var dh = /\n(?: *\n)+/;
//@ chunk-3s7ydtfd.js:30343-30363 placement
var yh = /^[\]}]\s*$/;
//@ chunk-3s7ydtfd.js:30363-30382 placement
var hh = /^\s*[[{]./;
//@ chunk-3s7ydtfd.js:30382-30401 placement
var Th = /^[[{]\s*$/;
//@ chunk-3s7ydtfd.js:30401-30421 placement
var Sh = /^\s*\[?\{"/;
//@ chunk-3s7ydtfd.js:30421-30509 placement
var Yt = /^[-+|:=\s\u2500\u2502\u250C\u252C\u2510\u251C\u253C\u2524\u2514\u2534\u2518]+$/;
//@ chunk-3s7ydtfd.js:30509-30542 placement
var Oh = /^[*`]+|(?<![*`])[*`]+$/g;
//@ chunk-3s7ydtfd.js:30542-30575 placement
var _h = /^\[([^\]]*)\]\([^)]*\)$/;
//@ chunk-3s7ydtfd.js:30575-30610 placement
var Lh = /^\uFEFF|\u001B\[[0-9;]*m/g;
//@ chunk-3s7ydtfd.js:30610-30659 placement
var Ah = /<results\b[^>]{0,200}\btruncated="true"/;
//@ chunk-3s7ydtfd.js:30659-30737 placement
var bh = /^(?<name>[^"]*)"(?<attributes>[^>]*?)(?:\/>|>(?<text>.*?)<\/field>)/s;
//@ chunk-3s7ydtfd.js:30737-30766 placement
var Rh = /(?:^|\s)null="true"/;
//@ chunk-3s7ydtfd.js:30766-30811 placement
var Ih = /&#(?:x([0-9a-f]{1,6})|(\d{1,7}));/gi;
//@ chunk-3s7ydtfd.js:30811-30880 placement
var Mh = /[.\u2026 \t]*\[[^\]\n]{0,99}truncated[^\]\n]{0,99}\][. \t]*/;
//@ chunk-3s7ydtfd.js:30880-30931 placement
var wh = /[\u2502|] *[\d,]+ rows \([\d,]+ shown\).*/;
/**
 * 无表头时用 “column N” 作为列名的表。
 */
//@ chunk-3s7ydtfd.js:30931-31059 placement
var unnamedColumnsTable = (e, t) => ({
  source: `${t}${xm}`,
  hasMadeUpNames: !0,
  isCut: !1,
  columns: [...(e[0] ?? []).keys()].map((o) => `column ${o + 1}`),
  rows: e,
});
//@ chunk-3s7ydtfd.js:31059-31135 placement
function Jt(e, t) {
  let o = de(t, e[0] ?? [], e.slice(1));
  return hasTextHeader(at(o)) ? o : unnamedColumnsTable(e, t);
}
//@ chunk-3s7ydtfd.js:31135-31216 placement
var Vt = () => ({ source: "a cut text", columns: [], rows: [], hasMadeUpNames: !1, isCut: !0 });
//@ chunk-3s7ydtfd.js:31216-31300 placement
var hm = (e) => e.length > 1 && e.every(N) && U(e.map((t) => Object.keys(t).join())).length === 1;
/**
 * 截取第一行 JSON 开始到最后一行 JSON 结束的行。
 */
//@ chunk-3s7ydtfd.js:31300-31411 placement
function trimToJsonBlock(e) {
  let index = e.findIndex((r) => Th.test(r));
  return index >= 0 ? e.slice(index, e.findLastIndex((r) => yh.test(r)) + 1) : [];
}
/**
 * 值在指定深度下是否还有子值。
 */
//@ chunk-3s7ydtfd.js:31411-31546 placement
function hasNestedValues(e, t) {
  let o = [e];
  for (let r = 0; r <= t; r += 1)
    o = o.flatMap((s) => (typeof s === "object" && s !== null ? Object.values(s) : []));
  return o.length > 0;
}
//@ chunk-3s7ydtfd.js:31546-31624 placement
function Zt(e) {
  try {
    let parsed = JSON.parse(e);
    return hasNestedValues(parsed, ih) ? void 0 : parsed;
  } catch {
    return;
  }
}
//@ chunk-3s7ydtfd.js:31624-31940 placement
function flattenObjectRows(e) {
  let t = Zt(e);
  if (t !== void 0) return { values: [t], unparsedLines: 0 };
  let parts = e.split(`
`),
    r = Zt(
      trimToJsonBlock(parts).join(`
`),
    );
  if (r !== void 0) return { values: [r], unparsedLines: 0 };
  let filtered = parts.filter((m) => hh.test(m)),
    mapped = filtered.map((m) => Zt(m));
  return {
    values: mapped.filter((m) => m !== void 0),
    unparsedLines: ys(returnValue(filtered, mapped), ([m, n]) => n === void 0 && Sh.test(m)),
  };
}
//@ chunk-3s7ydtfd.js:31940-32000 placement
var Om = (e) => (t) => Array.isArray(t) && t.length === e && !t.some(N);
//@ chunk-3s7ydtfd.js:32000-32081 placement
var _m = (e, t, o) => ({ source: zt, path: e, columns: t, rows: o, hasMadeUpNames: !1, isCut: !1 });
//@ chunk-3s7ydtfd.js:32081-32140 placement
var Cm = (e) => (t) => (N(t) ? e.map((r) => t[r]) : selectPath(t, "[]")).map(toCellValue);
//@ chunk-3s7ydtfd.js:32140-32184 placement
var Lm = (e, t) => ({ column: e, cell: t, isList: !1 });
//@ chunk-3s7ydtfd.js:32184-32229 placement
var Em = (e) => ({ column: e, cell: null, isList: !0 });
/**
 * 把对象展平为 “a.b” 列（数组中有对象时作为列表列）。
 */
//@ chunk-3s7ydtfd.js:32229-32441 placement
var flattenObject = (e, t) =>
  Object.entries(e).flatMap(([o, r]) => {
    let s = `${t}${o}`;
    if (typeof r !== "object" || r === null) return [Lm(s, toCellValue(r))];
    return Array.isArray(r) && r.some((m) => typeof m === "object" && m !== null)
      ? [Em(s)]
      : flattenObject(r, `${s}.`);
  });
/**
 * 对象数组展平为表（列过多时放弃）。
 */
//@ chunk-3s7ydtfd.js:32441-32816 placement
function readObjectRows(e, t, o) {
  let r = [],
    s = 0;
  for (let i of e) {
    let x = flattenObject(i, "");
    if ((r.push(x), (s += x.length), Re(1, s))) return [];
  }
  let flat = r.flat(),
    m = U(flat.map((i) => i.column));
  if (Re(m.length, e.length)) return [];
  let mapped = r.map((i) => Ft(m, new Map(i.map((x) => [x.column, x.cell])))),
    f = U(flat.filter((i) => i.isList).map((i) => i.column));
  return [{ source: t, path: o, columns: m, rows: mapped, listColumns: f, hasMadeUpNames: !1, isCut: !1 }];
}
//@ chunk-3s7ydtfd.js:32816-32858 placement
var Am = (e) => (t) => ne(e).map((o) => toCellValue(t[o]));
//@ chunk-3s7ydtfd.js:32858-32932 placement
var bm = (e) => Array.isArray(e) && !e.some((t) => typeof t === "object" && t !== null);
/**
 * 二维数组（首行为表头）读为表。
 */
//@ chunk-3s7ydtfd.js:32932-33169 placement
function readArrayRows(e, t) {
  let reduced = e.reduce((a, f) => Math.max(a, selectPath(f, "[]").length), 0);
  if (!(e.length >= cm && reduced >= it && !Re(reduced, e.length) && e.every(bm))) return [];
  let [s = [], ...p] = e.map(Am(reduced)),
    m = de(
      zt,
      s.map((a) => String(a ?? "")),
      p,
    );
  return hasTextHeader(at(m)) ? [{ ...m, path: t }] : [];
}
//@ chunk-3s7ydtfd.js:33169-33219 placement
var Im = (e, t) => ({ form: "line", x: "time", y: e.y, by: t });
/**
 * 为表补上系列/时刻与列角色。
 */
//@ chunk-3s7ydtfd.js:33219-33382 placement
function withColumnRoles(e) {
  let t = ["time", ...e.y];
  return (o) => ({
    ...o,
    isSeries: e.isSeries,
    isReadAtInstants: e.isReadAtInstants,
    roles: Im(
      e,
      o.columns.filter((column) => !t.includes(column)),
    ),
  });
}
/**
 * 从 JSON 结果中找到最像表格的数组并读出列。
 */
//@ chunk-3s7ydtfd.js:33382-34173 placement
function readJsonTable(e, t, o = {}) {
  let { path: path, source: source = zt } = o;
  if (typeof e === "string") return t(e);
  if (typeof e !== "object" || e === null) return [];
  let p = readMetricsTable(e);
  if (p) {
    let u = readObjectRows(p.points, p.source);
    return U(p.points.map((point) => point.time)).length < Ht ? u : u.map(withColumnRoles(p));
  }
  let mapped = selectPath(e, "columns.[]").map((u) => String(selectPath(u, "name")[0] ?? u)),
    n = selectPath(e, "rows.[]");
  if (mapped.length > 0 && !Re(mapped.length, n.length)) return [de(lm, mapped, n.map(Cm(mapped)))];
  if (typeof selectPath(e, "range")[0] === "string" && selectPath(e, "majorDimension")[0] === "ROWS")
    return readArrayRows(selectPath(e, "values.[]"), path === void 0 ? "values" : `${path}.values`);
  if (Array.isArray(e)) return e.length > 0 && e.every(N) ? readObjectRows(e, source, path) : [];
  let values = Object.values(e),
    x = selectPath(values[0], "[]").length;
  return values.length >= it && values.every(Om(x))
    ? [
        _m(
          path,
          Object.keys(e),
          ne(x).map((u) => values.map((d) => toCellValue(d[u]))),
        ),
      ]
    : Object.entries(e).flatMap(([u, d]) =>
        readJsonTable(d, t, { path: path === void 0 ? u : `${path}.${u}` }),
      );
}
//@ chunk-3s7ydtfd.js:34173-34233 placement
var Mm = (e) => (t) => e.map((o) => t.slice(o.from, o.until).trim());
//@ chunk-3s7ydtfd.js:34233-34306 placement
var Ne = (e, t) => e.map((o) => o.slice(t.from, t.until).padEnd(t.until - t.from));
/**
 * 等宽文本表中相邻列能否合并。
 */
//@ chunk-3s7ydtfd.js:34306-34460 placement
var isAlignedSplit = (e, t) =>
  !t.some((o) => o.trim().includes(" ")) &&
  !e.some((o) => o.trim().includes("  ")) &&
  (!e.some((o) => /^ +\S/.test(o)) || !e.some((o) => /\S +$/.test(o)));
/**
 * 两个相邻列区间能否合并。
 */
//@ chunk-3s7ydtfd.js:34460-34564 placement
var canMergeColumns = (e, t) => (o, r) => {
  let s = { from: o.from, until: r.until };
  return o.until === r.from - 1 && isAlignedSplit(Ne(e, s), Ne(t, s));
};
//@ chunk-3s7ydtfd.js:34564-34616 placement
var Pm = (e) => (e[0] ?? "").trim().split(/ +/).every(jt);
//@ chunk-3s7ydtfd.js:34616-34659 placement
var Dm = (e) => (t) => Ne(e, t).slice(1).some(jt);
/**
 * 列区间内是否有内容。
 */
//@ chunk-3s7ydtfd.js:34659-34778 placement
var hasColumnContent = (e, t, o) => (r) => {
  let [s = "", ...p] = Ne(e, r);
  return (s.trim() !== "" || !(o && r.from !== t[0]?.from)) && p.join("").trim() !== "";
};
/**
 * 合并等宽文本表中应属同一列的区间。
 */
//@ chunk-3s7ydtfd.js:34778-35054 placement
function mergeColumnRanges(e, t, o) {
  let r = Dm(t),
    s = hasColumnContent(t, e, Pm(t)),
    p = canMergeColumns(t, o),
    filtered = returnValue(e, e.slice(1)).filter(([f, i]) => f.until === i.from - 1),
    n = filtered.length < e.length - 1 && filtered.every(([f, i]) => p(f, i)),
    a = [];
  for (let f of e) {
    let at = a.at(-1);
    at && p(at, f) && (n || !s(at) || !s(f) || (r(at) && r(f))) ? (at.until = f.until) : a.push({ ...f });
  }
  return a;
}
/**
 * 按空白列切分等宽文本表。
 */
//@ chunk-3s7ydtfd.js:35054-35381 placement
function readAlignedTable(e) {
  let t = [];
  for (let m of e) for (let n = 0; n < m.length; n++) t[n] ||= m[n] !== " ";
  let filtered = [...t.keys()].filter((m) => t[m]),
    mapped = returnValue(
      filtered.filter((m) => !t[m - 1]),
      filtered.filter((m) => !t[m + 1]),
    ).map(([m, n]) => ({ from: m, until: n + 1 }));
  if (Re(mapped.length, e.length)) return [];
  let filtered_2 = e.filter((m) => !Yt.test(m));
  return filtered_2.map(
    Mm(
      mergeColumnRanges(
        mapped,
        filtered_2,
        e.filter((m) => Yt.test(m)),
      ),
    ),
  );
}
/**
 * 表是否有一列全为数字。
 */
//@ chunk-3s7ydtfd.js:35381-35497 placement
var hasNumericColumn = ([e = [], ...t]) =>
  t.length > 0 &&
  e.length >= it &&
  [...e.keys()].some((o) => t.every((r) => parseNumberWithUnit(r[o] ?? "").kind === "number"));
//@ chunk-3s7ydtfd.js:35497-35555 placement
var vm = (e) => e !== "" && (!Yt.test(e) || e.trim().includes(" "));
/**
 * 从文本中读出所有等宽表。
 */
//@ chunk-3s7ydtfd.js:35555-35699 placement
function readAlignedTables(e) {
  let filtered = e
    .split(dh)
    .map((o) =>
      readAlignedTable(
        o
          .split(
            `
`,
          )
          .filter(vm),
      ),
    )
    .filter(hasNumericColumn);
  return { lineCount: filtered.flat().length, tables: filtered.map((o) => Jt(o, fm)) };
}
/**
 * 把列数一致的连续行分组为表。
 */
//@ chunk-3s7ydtfd.js:35699-35968 placement
function groupConsistentRows(e) {
  let t = [],
    o = [];
  for (let [r, s] of e.entries()) {
    let p = s.length >= it && s.length <= xr && s.some((f) => f !== ""),
      m = o[0]?.length ?? s.length;
    if (p && s.length === m) {
      o.push(s);
      continue;
    }
    if (!(p && e[r + 1]?.length === m)) (t.push(o), (o = p ? [s] : []));
  }
  return (t.push(o), t.filter((r) => r.length >= cm));
}
//@ chunk-3s7ydtfd.js:35968-36372 placement
function parseCsvCell(e, t) {
  let regExp = new RegExp(
      `[ ]*(?:"(?<quoted>(?:[^"]|"")*)"[ ]*|(?<plain>[^\\n]*?))(?<end>${t.pattern.source}|\\n)`,
      "gy",
    ),
    r = [],
    s = [];
  for (let { groups: groups = {} } of `${e}
`.matchAll(regExp))
    if (
      (s.push(groups.quoted?.replaceAll('""', '"') ?? groups.plain ?? ""),
      groups.end ===
        `
`)
    )
      (r.push(s), (s = []));
  return [...r, s].map((p) =>
    (t.pattern.test("|") && p[0] === "" && p.at(-1) === "" ? p.slice(1, -1) : p).map((n) =>
      n.trim().replace(Oh, "").replace(_h, "$1"),
    ),
  );
}
//@ chunk-3s7ydtfd.js:36372-36414 placement
var Gm = (e) => (t) => ({ ...t, unparsedLines: e });
/**
 * 按分隔符读表。
 */
//@ chunk-3s7ydtfd.js:36414-36637 placement
function readDelimitedTables(e, t) {
  let filtered = parseCsvCell(e, t).filter((p) => !Yt.test(p.join(""))),
    r = groupConsistentRows(filtered),
    flat = r.flat();
  return {
    lineCount: flat.flatMap((p) =>
      p.join("").split(`
`),
    ).length,
    tables: r.map((p) => Jt(p, t.source)).map(Gm(ys(filtered, (p) => p.length >= it) - flat.length)),
  };
}
//@ chunk-3s7ydtfd.js:36637-36670 placement
var Km = (e) => (t) => t.lineCount === e;
/**
 * 尝试各种文本表格式，取覆盖行数最多的结果。
 */
//@ chunk-3s7ydtfd.js:36670-36822 placement
function readTextTables(e) {
  let t = [
    ...DELIMITED_FORMATS.filter((o) => o.pattern.test(e)).map((o) => readDelimitedTables(e, o)),
    readAlignedTables(e),
  ];
  return t.find(Km(Math.max(...t.map((o) => o.lineCount))))?.tables ?? [];
}
//@ chunk-3s7ydtfd.js:36822-36882 placement
var Ym = (e) => Ah.test(e) || e.lastIndexOf(Tr) > e.lastIndexOf(um);
//@ chunk-3s7ydtfd.js:36882-37132 placement
var HTML_ENTITIES = (e) =>
  e
    .replace(Ih, (t, o, r) => {
      let s = o === void 0 ? Number(r) : Number.parseInt(o, 16);
      return s <= 1114111 ? String.fromCodePoint(s) : t;
    })
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
/**
 * 解析一个 HTML 单元格（名称与文本）。
 */
//@ chunk-3s7ydtfd.js:37132-37258 placement
function readHtmlCell(e) {
  let t = bh.exec(e)?.groups;
  return t !== void 0
    ? [[HTML_ENTITIES(t.name ?? ""), Rh.test(t.attributes ?? "") ? null : HTML_ENTITIES(t.text ?? "")]]
    : [];
}
//@ chunk-3s7ydtfd.js:37258-37355 placement
function Vm(e) {
  let sliced = e.slice(e.lastIndexOf(Tr));
  return new Map(sliced.split(nh).slice(1).flatMap(readHtmlCell));
}
/**
 * 从 HTML/XML 片段读表。
 */
//@ chunk-3s7ydtfd.js:37355-37615 placement
function readHtmlTable(e) {
  if (!e.trimStart().startsWith("<")) return [];
  let mapped = e
      .split(um)
      .slice(0, -1)
      .filter((p) => p.includes(Tr))
      .map(Vm),
    r = U(mapped.flatMap((p) => [...p.keys()]));
  if (!(r.length > 0 && !Re(r.length, mapped.length))) return [];
  return Ym(e)
    ? [Vt()]
    : [
        de(
          dm,
          r,
          mapped.map((p) => Ft(r, p)),
        ),
      ];
}
/**
 * 结果被截断/持久化时的标记。
 */
//@ chunk-3s7ydtfd.js:37615-37777 placement
var TRUNCATION_MARKERS = [
  /<persisted-output>/,
  /<truncated-output>/,
  /Output too large.*/,
  /\(output truncated[^)\n]*\)/,
  wh,
  Mh,
  /Error: result \(.* exceeds maximum allowed tokens.*/,
];
//@ chunk-3s7ydtfd.js:37777-37844 placement
var regExp_5 = new RegExp(`^(?:${TRUNCATION_MARKERS.map((e) => e.source).join("|")})$`, "im");
//@ chunk-3s7ydtfd.js:37844-37886 placement
var en = (e) => (t) => ({ unparsedLines: e, ...t });
/**
 * 从工具结果文本读表：截断检测、HTML、JSON 行、文本表，并清洗字符串。
 */
//@ chunk-3s7ydtfd.js:37886-38165 placement
function readTablesFromText(e) {
  let replaced = e.replace(Lh, "").replaceAll(
    `\r
`,
    `
`,
  );
  if (regExp_5.test(replaced)) return [Vt()];
  let r = readHtmlTable(replaced);
  if (r.length > 0) return cleanAllStrings(r);
  let { values: values, unparsedLines: unparsedLines } = flattenObjectRows(replaced);
  if (values.length === 0) return cleanAllStrings(readTextTables(replaced));
  let m = hm(values);
  return cleanAllStrings(
    (m
      ? readJsonTable(values, readTablesFromText, { source: im })
      : values.flatMap((n) => readJsonTable(n, readTablesFromText))
    ).map(en(unparsedLines)),
  );
}
//@ chunk-3s7ydtfd.js:38165-38213 placement
var eo = (e) => e.toLowerCase().replaceAll(" ", "_");
//@ chunk-3s7ydtfd.js:38213-38232 placement
var JSON_PATH = "json_path";
//@ chunk-3s7ydtfd.js:38232-38248 placement
var UNREAD = "unread";
//@ chunk-3s7ydtfd.js:38248-38317 placement
function rn(e) {
  return e.path !== void 0 ? JSON_PATH : eo(e.source.replace(xm, ""));
}
//@ chunk-3s7ydtfd.js:38317-38346 placement
var sn = [...ah.map(eo), JSON_PATH, UNREAD];
//@ chunk-3s7ydtfd.js:38346-38392 placement
var oo = (e) => (e < 1 ? 0 : 2 ** Math.floor(Math.log2(e)));
/**
 * 图表结果代码（drawn 以外的 bad_call、no_result、data_not_found、too_long 等）。
 */
//@ chunk-3s7ydtfd.js:38392-38809 placement
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
var jT = ["off", "skips_servers"];
//@ chunk-3s7ydtfd.js:38840-38896 placement
var vT = ["last_result", "result_id", "text", "rows", "none"];
//@ chunk-3s7ydtfd.js:38896-39432 placement
var buildEaselTelemetryEvent = (e, t) => ({
  event: "easel_chart",
  props: {
    outcome: { value: e.outcome, of: ["drawn", ...CHART_OUTCOME_CODES] },
    form: { value: e.form, of: [...Object.keys(CHART_FORMS), "unnamed"] },
    format: { value: e.format, of: sn },
    data_from: { value: e.dataFrom, of: vT },
    series_bucket: oo(e.seriesCount),
    point_bucket: oo(e.pointCount),
    elapsed_ms_bucket: oo(t.elapsedMs),
    is_form_named: e.isFormNamed,
    has_left_out: e.hasLeftOut,
    is_form_replaced: e.isFormReplaced,
    is_asked: t.isAsked,
    is_in_subagent: t.isInSubagent,
    is_on_terminal: t.surfaces.includes("terminal"),
    is_on_app: t.surfaces.some((surface) => surface !== "terminal"),
  },
});
/**
 * 图表结果的特性遥测（省略数据或换了形式记为 sad）。
 */
//@ chunk-3s7ydtfd.js:39432-39609 placement
function chartOutcomeTelemetry(e, t) {
  if (t.hasLeftOut) return { feature: e, kind: "sad", reason: "data_left_out" };
  return t.isFormReplaced ? { feature: e, kind: "sad", reason: "form_replaced" } : { feature: e, kind: "ok" };
}
//@ chunk-3s7ydtfd.js:39609-39665 placement
var nn = (e, t) => ({ feature: e, kind: "bad", reason: t.outcome });
//@ chunk-3s7ydtfd.js:39665-39760 placement
function XT(e, t) {
  let o = t ? "easel_chart" : "easel_auto";
  return e.outcome === "drawn" ? chartOutcomeTelemetry(o, e) : nn(o, e);
}
/**
 * 失败时的默认用量记录。
 */
//@ chunk-3s7ydtfd.js:39760-39901 placement
var FAILED_USAGE = {
  outcome: "failed",
  form: "unnamed",
  isFormNamed: !1,
  format: UNREAD,
  dataFrom: "none",
  seriesCount: 0,
  pointCount: 0,
  hasLeftOut: !1,
  isFormReplaced: !1,
};
//@ chunk-3s7ydtfd.js:39901-39976 placement
var YT = (e) => ({ event: "easel_settings", props: { auto_charts: { value: e, of: jT } } });
//@ chunk-3s7ydtfd.js:39976-40062 placement
var an = (e, t) => ({
  ...FAILED_USAGE,
  form: e.form ?? "unnamed",
  isFormNamed: e.form !== void 0,
  dataFrom: t,
});
//@ chunk-3s7ydtfd.js:40062-40269 placement
function describeNamesReadAsBars(e, t, o) {
  if (t.kind === "data") return t.series.length <= (o.top ?? CHART_FORMS.bars.defaultCount) ? t : e;
  return {
    ...t,
    problem: {
      ...t.problem,
      why: `${o.x ?? "x"} holds names, not times, so bars were read. ` + t.problem.why,
    },
  };
}
/**
 * 表格列摘要最多输出 12 行（多表时平分）。
 */
//@ chunk-3s7ydtfd.js:40269-40279 placement
var ln = 12;
//@ chunk-3s7ydtfd.js:40279-40289 placement
var rS = 32;
//@ chunk-3s7ydtfd.js:40289-40298 placement
var sS = 3;
//@ chunk-3s7ydtfd.js:40298-40342 placement
var formatCountPart = (e, t, o = "") => (e > 0 ? [`${K(e, t)}${o}`] : []);
//@ chunk-3s7ydtfd.js:40342-40352 placement
var nS = !0;
//@ chunk-3s7ydtfd.js:40352-40403 placement
var areAllNumbers = (e) => e.every((t) => parseNumberWithUnit(t, nS).kind === "number");
//@ chunk-3s7ydtfd.js:40403-40458 placement
var numberAxisHint = (e) => (areAllNumbers(e) ? ", read as numbers if named as y" : "");
//@ chunk-3s7ydtfd.js:40458-40510 placement
var previewColumnValues = (e) => e.slice(0, sS).map((t) => truncateMiddle(String(t), rS));
//@ chunk-3s7ydtfd.js:40510-40555 placement
var formatColumnValuePreview = (e) => ` (${previewColumnValues(e).join(", ")})${numberAxisHint(e)}`;
//@ chunk-3s7ydtfd.js:40555-40624 placement
var areAllZonedTimes = (e) => e.map((t) => parseTimeCell(t)).every((t) => t.kind === "time" && t.isZoned);
//@ chunk-3s7ydtfd.js:40624-40677 placement
var timeAxisHint = (e) => (areAllZonedTimes(e) ? ", read as times if named as x" : "");
/**
 * 列的类型计数摘要（数字/时间/文本）。
 */
//@ chunk-3s7ydtfd.js:40677-40884 placement
function columnKindSummary(e) {
  let t = U(e.cellsByKind.get("text") ?? []),
    o = e.cellsByKind.get("number") ?? [];
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
var On = (e, t = []) =>
  `${e.name}: ` + (columnKindSummary(e).join(", ") || describeNonScalarColumn(t.includes(e.name)));
//@ chunk-3s7ydtfd.js:41086-41137 placement = renderToolUseRejectedMessage (0.792)
var renderToolUseRejectedMessage = (e) => `${yr(e)}, ${K(e.rows.length, "row")}:`;
/**
 * 生成表各列的摘要行（多表时加表头）。
 */
//@ chunk-3s7ydtfd.js:41137-41244 placement
var describeTableColumns = (e, t) => (o) => {
  let r = Et(
    at(o).map((s) => On(s, o.listColumns)),
    e,
    "more column",
  );
  return t ? [renderToolUseRejectedMessage(o), ...r] : r;
};
/**
 * 为表格数据生成列摘要（列类型计数与示例值），多个表时附表头行；与 EnterPlanMode 无关（切分错误）。
 */
//@ chunk-3s7ydtfd.js:41244-41306 placement
var gS = (e) => e.flatMap(describeTableColumns(Math.floor(ln / e.length), e.length > 1));

export {
  matchColumnName,
  readChartData,
  yr,
  readTablesFromText,
  xr,
  rn,
  ln,
  FAILED_USAGE,
  an,
  describeNamesReadAsBars,
  gS,
  YT,
  XT,
  buildEaselTelemetryEvent,
};
