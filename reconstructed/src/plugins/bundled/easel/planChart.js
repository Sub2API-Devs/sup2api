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
import { matchColumnName, readChartData, yr, readTablesFromText, xr } from "./readTable.js";
import { U, stableSum, groupIndexBy, K, truncateMiddle, Et, ne } from "./chartSchema.js";
import { sr, TIME_FORMATS_HINT, parseNumberWithUnit, parseTimeCell, mr } from "./parseValues.js";
import { W } from "./easelMessages.js";
import { Bs, formatTimeTick, defaultTimeStep, pickTickStep } from "./timeFormat.js";

//@ chunk-3s7ydtfd.js:41306-41316 placement
var OS = !0;
/**
 * 同一组标签同一时刻是否有多个读数。
 */
//@ chunk-3s7ydtfd.js:41316-41455 placement
function hasDuplicateReadings(e) {
  let mapped = e.readings
    .filter((reading) => reading.value !== null)
    .map((o) => JSON.stringify([o.groupLabels, o.ms]));
  return new Set(mapped).size < mapped.length;
}
//@ chunk-3s7ydtfd.js:41455-41464 placement
var LS = 5;
//@ chunk-3s7ydtfd.js:41464-41475 placement
var En = 120;
//@ chunk-3s7ydtfd.js:41475-41484 placement
var An = 3;
//@ chunk-3s7ydtfd.js:41484-41493 placement
var bn = 3;
//@ chunk-3s7ydtfd.js:41493-41506 placement
var AS = 65536;
//@ chunk-3s7ydtfd.js:41506-41517 placement
var RS = 240;
//@ chunk-3s7ydtfd.js:41517-41526 placement
var IS = 8;
//@ chunk-3s7ydtfd.js:41526-41535 placement
var MS = 2;
//@ chunk-3s7ydtfd.js:41535-41554 placement
var kS = /[\]}]\s*$/;
//@ chunk-3s7ydtfd.js:41554-41572 placement
var PS = /^\s*[[{]/;
//@ chunk-3s7ydtfd.js:41572-41603 placement
var DS = /^[^\p{L}\p{N}]*\p{N}/u;
//@ chunk-3s7ydtfd.js:41603-41662 placement
var Rn = (e) => (t) => e.every((o) => t.columns.includes(matchColumnName(t, o)));
//@ chunk-3s7ydtfd.js:41662-41730 placement
function In(e, t) {
  let o = readChartData(e, t);
  return !("code" in o) && o.form !== "bars";
}
//@ chunk-3s7ydtfd.js:41730-41776 placement
var Nn = (e) => [e.x ?? [], e.y ?? [], e.by ?? []].flat();
/**
 * 多个表时按列名与请求筛选出唯一匹配的表。
 */
//@ chunk-3s7ydtfd.js:41776-41879 placement
function pickMatchingTables(e, t) {
  let r = e.length === 1 ? e : e.filter(Rn(Nn(t)));
  return r.length === 1 ? r : r.filter((p) => In(p, t));
}
//@ chunk-3s7ydtfd.js:41879-41919 placement
var po = (e) => U(e).slice(0, bn).join(", ");
/**
 * 检查时间列（未识别的日期拼写、非时间数字、名称而非时间）。
 */
//@ chunk-3s7ydtfd.js:41919-42545 placement
function checkTimeColumn(e, t) {
  let { unreadXCells: unreadXCells } = t,
    filtered = unreadXCells.filter(sr),
    s = t.readings.length === 0;
  if (filtered.length > 0 && (s || filtered.length === unreadXCells.length))
    return {
      code: "dates_unread",
      why: `${e.x} holds dates in a spelling that is not read (${po(filtered)}). ${TIME_FORMATS_HINT}`,
    };
  let filtered_2 = unreadXCells.filter((f) => parseNumberWithUnit(f).kind === "number");
  if (filtered_2.length > 0)
    return {
      code: "x_not_times",
      why: `${e.x} holds numbers that are not times (${po(filtered_2)}). A line, columns and sparks run over times. For one bar for each, pass form: "bars"`,
    };
  return s && unreadXCells.length > 0
    ? {
        code: "x_not_times",
        why: `${e.x} holds names, not times (${po(unreadXCells)}). A line, columns and sparks run over times: for names, pass form: "bars"`,
        fitsBars: !0,
      }
    : void 0;
}
/**
 * 检查时区混用、整列未读、多行共享同一 x 等。
 */
//@ chunk-3s7ydtfd.js:42545-43356 placement
function checkTimeline({ reading: reading, roles: roles, request: request, series: series }) {
  if (new Set(reading.readings.map((reading) => reading.isZoned)).size > 1)
    return { code: "zones_mixed", why: `${roles.x} mixes times that name a zone with times that name none` };
  let p = checkTimeColumn(roles, reading);
  if (p !== void 0) return p;
  let found = reading.droppedColumns.find((droppedColumn) => droppedColumn.isEntireColumn);
  if (found !== void 0)
    return { code: "column_unread", why: `a whole column was not read. ${found.sentence}` };
  if (request.combine === void 0 && hasDuplicateReadings(reading))
    return {
      code: "rows_share_x",
      why: `several rows share one ${roles.x}; name the columns to split by, or how to combine them (sum, mean, max, min)`,
    };
  if (!(series.length > 0))
    return { code: "no_values", why: `no cell of ${roles.y.join(", ")} holds a number` };
  let [f] = reading.droppedColumns;
  return roles.form === "bars" && f !== void 0
    ? {
        code: "bars_partly_unread",
        why: `bars rank a whole list, and part of this one was not read. ${f.sentence}`,
      }
    : void 0;
}
//@ chunk-3s7ydtfd.js:43356-43443 placement
var Pn = {
  sum: stableSum,
  mean: (e) => stableSum(e) / e.length,
  max: (e) => Math.max(...e),
  min: (e) => Math.min(...e),
};
//@ chunk-3s7ydtfd.js:43443-43526 placement
var XS = "the last point may still be filling: its period had not ended at the call";
//@ chunk-3s7ydtfd.js:43526-43589 placement
var Rr = "Ask for fewer rows or a shorter span, then chart that";
/**
 * 占比图检查：各部分需相加为整体，否则拒绝或提示 combine。
 */
//@ chunk-3s7ydtfd.js:43589-44654 placement
function checkShareChart({ roles: roles, request: request, series: series, timeline: timeline }) {
  let flattened = series.flatMap((x) => x.samples.map((sample) => sample.value ?? 0)),
    any = flattened.some((x) => x < 0);
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
  if (request.log === !0 && (request.form ?? roles.form) !== "line")
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
    ? { code: "column_below_zero", why: "a column stands on zero and a value is below zero. Draw a line" }
    : void 0;
}
//@ chunk-3s7ydtfd.js:44654-44709 placement
var Un = (e, t) => (e.hasMadeUpNames && t.form === "bars" ? [] : t.y);
//@ chunk-3s7ydtfd.js:44709-45228 placement
function describeNotDrawn(e) {
  let t = e.mark.label === void 0 ? "" : e.mark.label,
    o = parseTimeCell(e.mark.at),
    r = `${t === "" ? "mark" : `mark ${t}`} at ${e.mark.at} not drawn:`;
  if (!(e.drawnForm !== "bars" && e.drawnForm !== "share")) return `${r} it has no times`;
  if (e.drawnForm === "sparks") return `${r} sparks have no time axis`;
  if (o.kind !== "time") return `${r} ${o.why}`;
  if (o.ms < e.axisSpan.fromMs || o.ms > e.axisSpan.untilMs) return `${r} outside the times drawn`;
  return o.isZoned !== e.isZoned
    ? `${r} name a zone in both the mark and the times, or in neither`
    : { ms: o.ms, label: t };
}
//@ chunk-3s7ydtfd.js:45228-45298 placement
var Bn = (e) => (t, o) => {
  let r = e.get(t);
  return r === void 0 ? null : (o[r] ?? null);
};
/**
 * 单元格转为读数（时间、分组标签、数值、单位）。
 */
//@ chunk-3s7ydtfd.js:45298-45468 placement
var toReading = (e, t, o) => (r, s) => ({
  ms: e.ms,
  isZoned: e.isZoned,
  column: r,
  groupLabels: o.y.length > 1 ? [...t, r] : t,
  value: s.kind === "number" ? s.value : null,
  unit: s.kind === "number" ? s.unit : null,
});
//@ chunk-3s7ydtfd.js:45468-45553 placement
function vn(e, t) {
  let unit = t.unit;
  return e.kind === "number" && !e.unit && !!unit ? mr(e.value, unit) : e;
}
//@ chunk-3s7ydtfd.js:45553-45592 placement
var Wn = W("a log scale cannot show it");
//@ chunk-3s7ydtfd.js:45592-45629 placement
var tg = { kind: "time", ms: 0, isZoned: !1 };
//@ chunk-3s7ydtfd.js:45629-46632 placement
function describeBarsUnread(e, t, o) {
  let r = Bn(new Map(e.columns.map((column, u) => [column, u]))),
    s = e.rows[0] ?? [],
    filtered = t.by.filter((l) => e.rows.some((row) => r(l, row) !== r(l, s))),
    m = t.form === "bars",
    n = m ? [t.x, ...filtered] : filtered,
    a = [],
    f = [],
    i = [];
  for (let row of e.rows) {
    let u = m ? tg : parseTimeCell(r(t.x, row));
    if (u.kind === "unread") i.push(r(t.x, row));
    if (u.kind !== "time") {
      f.push({ column: t.x, quote: `${r(t.x, row)} (${u.why})` });
      continue;
    }
    let g = toReading(
      u,
      n.map((T) => String(r(T, row) ?? "") || `no ${T}`),
      t,
    );
    for (let T of t.y) {
      let L = r(T, row),
        _ = vn(parseNumberWithUnit(L, o.y !== void 0), o),
        A = o.log === !0 && _.kind === "number" && _.value <= 0 ? Wn : _;
      if (A.kind === "unread") f.push({ column: T, quote: `${L} (${A.why})` });
      a.push(g(T, A));
    }
  }
  let x = new Map();
  for (let [l, u] of groupIndexBy(a, (d) => d.column))
    x.set(l, U(u.map((d) => d.unit).filter((d) => d !== null)));
  return {
    readings: a,
    units: x,
    sharedLabels: t.by.filter((l) => !filtered.includes(l)).map((l) => String(r(l, s) ?? "")),
    droppedColumns: [...groupIndexBy(f, (l) => l.column)].map(([l, u]) => ({
      isEntireColumn: u.length === e.rows.length,
      sentence:
        `${K(u.length, "cell")} of ${l} not read: ` +
        u
          .slice(0, bn)
          .map((d) => d.quote)
          .join(", "),
    })),
    unreadXCells: i,
  };
}
//@ chunk-3s7ydtfd.js:46632-46672 placement
var Nr = (e) => e.some((t) => t.value !== null);
//@ chunk-3s7ydtfd.js:46672-46699 placement
var Gn = (e, t, o) => e || Bs(t, o);
/**
 * 合并同一时刻的多个读数。
 */
//@ chunk-3s7ydtfd.js:46699-46821 placement
var combineSamplesAt = (e, t) => (o) => {
  let filtered = (e.get(o) ?? []).map((s) => s.value).filter((s) => s !== null);
  return { ms: o, value: filtered.length > 0 ? t(filtered) : null };
};
//@ chunk-3s7ydtfd.js:46821-46885 placement
var mo = (e, t) => truncateMiddle(e[0]?.groupLabels.join(" ") || t.fallbackName, En);
//@ chunk-3s7ydtfd.js:46885-46938 placement
var no = (e) => U(e.map((t) => t.ms)).toSorted((t, o) => t - o);
/**
 * 由读数生成一个系列（单位、名称、按周期的样本）。
 */
//@ chunk-3s7ydtfd.js:46938-47140 placement
function buildSeries(e, t, o) {
  let r = no(e),
    s = e[0]?.column ?? "";
  return {
    unit: t.reading.units.get(s)?.[0] ?? "",
    name: mo(e, t),
    measure: s,
    samples: (formatTimeTick(r, t, Gn(o, r, t.zone))?.periodStarts ?? r).map(
      combineSamplesAt(
        groupIndexBy(e, (p) => p.ms),
        t.combine,
      ),
    ),
  };
}
/**
 * 按分组生成全部时间序列与空系列名，并计算时间网格。
 */
//@ chunk-3s7ydtfd.js:47140-47400 placement
function buildTimeSeries(e) {
  let t = [],
    o = [],
    r = groupIndexBy(e.reading.readings, (m) => JSON.stringify(m.groupLabels)),
    s = no([...r.values()].filter(Nr).flat()),
    p = Bs(s, e.zone);
  for (let m of r.values()) Nr(m) ? t.push(buildSeries(m, e, p)) : o.push(mo(m, e));
  return { series: t, emptyNames: o, times: s, grid: formatTimeTick(s, e, p) };
}
//@ chunk-3s7ydtfd.js:47400-47455 placement
var Me = (e, t = []) => ({ kind: "refused", problem: e, tables: t });
//@ chunk-3s7ydtfd.js:47455-47509 placement
var Mr = (e, t) => Me({ ...t, why: `${yr(e)}: ${t.why}` }, [e]);
/**
 * 系列标题（列名或共享标签）。
 */
//@ chunk-3s7ydtfd.js:47509-47682 placement
function seriesTitle(e, t, o) {
  let s = e.length > IS ? K(e.length, "column") : e.join(", "),
    p = t.y === void 0;
  return truncateMiddle(
    (p ? o.sharedLabels : [s, ...o.sharedLabels]).filter((m) => m !== "").join(" ") || s,
    RS,
  );
}
//@ chunk-3s7ydtfd.js:47682-47772 placement
function Jn(e) {
  let t = e.times[0] ?? 0;
  return { fromMs: t, untilMs: e.times.at(-1) ?? t, zone: e.zone };
}
//@ chunk-3s7ydtfd.js:47772-47829 placement
var Vn = (e) => ({ zone: e.zone, areTicks: !OS, fieldsBefore: [] });
//@ chunk-3s7ydtfd.js:47829-48155 placement
function defaultFormFor(e) {
  let t = Jn(e),
    o = defaultTimeStep(e.times, e.zone),
    r = e.readAs === "columns" ? e.grid : null,
    s = e.readAs === "bars",
    joined = pickTickStep(U([t.fromMs, t.untilMs]), o, Vn(e)).join(" \u2192 ");
  return {
    dataSpan: t,
    axisSpan: r ? { ...t, untilMs: r.endMs } : t,
    precision: o,
    step: e.grid?.step ?? o,
    spanLabels: s ? [] : [e.isZoned ? `${joined} ${e.zone}` : joined],
    periodStarts: r?.periodStarts ?? [],
  };
}
//@ chunk-3s7ydtfd.js:48155-48870 placement
function checkUnitsMixed(e, t, o) {
  let r = [...e.units.values()];
  if (r.some((n) => n.length > 1)) {
    let mapped = r.flat().map((f) => f || "none"),
      a = mapped.includes("none") && new Set(mapped).size === MS;
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
  return (t.form === "bars" || o.form === "sparks") && p.size > 1
    ? {
        code: "units_differ",
        why:
          (o.form === "sparks" ? "sparks" : "bars") +
          " share one scale, and the y columns are in different units (" +
          [...p].map(([n, a]) => `${a.join(", ")} in ${n || "no unit"}`).join("; ") +
          "). Call once for each unit",
      }
    : void 0;
}
//@ chunk-3s7ydtfd.js:48870-49934 placement
function describeMissingValues(e, t, o) {
  let r = readChartData(e, t);
  if ("code" in r) return Mr(e, r);
  let p = t.form ?? r.form,
    m = describeBarsUnread(e, r, t),
    n = seriesTitle(Un(e, r), t, m),
    any = m.readings.some((reading) => reading.isZoned),
    f = any ? o.zone : "UTC",
    {
      series: series,
      emptyNames: emptyNames,
      times: times,
      grid: grid,
    } = buildTimeSeries({ reading: m, fallbackName: n, combine: Pn[t.combine ?? "sum"], zone: f }),
    d = defaultFormFor({ times: times, grid: grid, readAs: r.form, zone: f, isZoned: any }),
    c =
      checkUnitsMixed(m, r, t) ??
      checkTimeline({ reading: m, roles: r, request: t, series: series }) ??
      checkShareChart({ roles: r, request: t, series: series, timeline: d });
  if (c !== void 0) return Mr(e, c);
  let mapped = (t.marks ?? []).map((A) =>
      describeNotDrawn({ mark: A, drawnForm: p, axisSpan: d.axisSpan, isZoned: any }),
    ),
    T =
      e.isReadAtInstants !== !0 &&
      any &&
      grid !== null &&
      o.nowMs !== null &&
      o.nowMs >= d.dataSpan.untilMs &&
      o.nowMs < grid.endMs,
    L = emptyNames.length > 0,
    _ = Et(
      m.droppedColumns.map((droppedColumn) => droppedColumn.sentence),
      LS,
      "more column",
    ),
    w = [
      ...(L
        ? [`${emptyNames.length} with no value, not drawn: ` + truncateMiddle(emptyNames.join(", "), En)]
        : []),
      ...mapped.filter((A) => typeof A === "string"),
      ...(T ? [XS] : []),
    ];
  return {
    kind: "data",
    form: p,
    source: e.source,
    path: e.path,
    isSeries: e.isSeries === !0,
    subject: n,
    hasCombinedRows: hasDuplicateReadings(m),
    series: series,
    timeline: d,
    marks: mapped.filter((A) => typeof A !== "string").toSorted((A, Fe) => A.ms - Fe.ms),
    leftOutNotes: _,
    notes: w,
  };
}
/**
 * 表中没有任何时间值。
 */
//@ chunk-3s7ydtfd.js:49934-50082 placement
function hasNoTimeValues({ rows: rows, listColumns: listColumns = [] }) {
  return (
    listColumns.length === 0 &&
    rows.every((o) =>
      o.every((r) => r === null || !(DS.test(String(r)) || sr(r) || parseTimeCell(r).kind === "time")),
    )
  );
}
/**
 * 读取请求数据（64 KiB 上限、截断检测）并解析为表。
 */
//@ chunk-3s7ydtfd.js:50082-51328 placement
function readChartRequestData(e, t, o) {
  if (e.length >= AS)
    return Me({
      code: "too_long",
      why: `The data is 64 KiB or longer: too long to chart, and it may be cut short. ${Rr}`,
    });
  let s = readTablesFromText(e);
  if (s.some((T) => T.isCut))
    return Me({
      code: "cut_short",
      why: `That result was cut short or saved to a file, so part of it is missing. ${Rr}`,
    });
  if (!(s.length > 0)) {
    let T = PS.test(e) && !kS.test(e);
    return Me(
      T
        ? { code: "cut_short", why: `That result is JSON that does not close, so it was cut short. ${Rr}` }
        : {
            code: "no_table_read",
            why: `That result holds no rows: it has no table and no list of records of ${xr} columns or fewer. Pass the rows as data, as JSON records or as the text of a CSV, TSV or markdown table, with only the columns to chart`,
          },
    );
  }
  let [n, ...a] = pickMatchingTables(s, t);
  if (n === void 0 || a.length > 0)
    return Me(
      {
        code: "table_unpicked",
        why: `That result is not a table: there are ${s.length} in it. To pick one, name a column that only it has, or pass its rows as data`,
      },
      s.slice(0, An),
    );
  let i = describeMissingValues(n, t, o),
    x = n.unparsedLines ?? 0,
    filtered = s.filter((T) => T !== n && !hasNoTimeValues(T)),
    u = filtered.length > 0,
    d = x > 0,
    c = [
      ...(u ? [K(filtered.length, "other table")] : []),
      ...(d ? [`${K(x, "line")} outside any table`] : []),
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
var ye = (e) => e.values[0] ?? 0;
//@ chunk-3s7ydtfd.js:51355-51366 placement
var kr = 1e9;
//@ chunk-3s7ydtfd.js:51366-51375 placement
var ta = 2;
//@ chunk-3s7ydtfd.js:51375-51385 placement
var Pr = 10;
//@ chunk-3s7ydtfd.js:51385-51396 placement
var jg = 100;
//@ chunk-3s7ydtfd.js:51396-51415 placement
var we = 0.000000001;
//@ chunk-3s7ydtfd.js:51415-51424 placement
var Wg = 5;
//@ chunk-3s7ydtfd.js:51424-51434 placement
var $g = 10;
//@ chunk-3s7ydtfd.js:51434-51444 placement
var Gg = 10;
//@ chunk-3s7ydtfd.js:51444-51455 placement
var Dr = 1e6;
//@ chunk-3s7ydtfd.js:51455-51466 placement
var Kg = 1e4;
//@ chunk-3s7ydtfd.js:51466-51475 placement
var zg = 3;
//@ chunk-3s7ydtfd.js:51475-51484 placement
var Yg = 2;
//@ chunk-3s7ydtfd.js:51484-51493 placement
var Jg = 2;
//@ chunk-3s7ydtfd.js:51493-51503 placement
var Vg = 12;
//@ chunk-3s7ydtfd.js:51503-51524 placement
var Ur = 1000000000000;
//@ chunk-3s7ydtfd.js:51524-51537 placement
var qg = 86400;
//@ chunk-3s7ydtfd.js:51537-51549 placement
var Qg = 3600;
//@ chunk-3s7ydtfd.js:51549-51565 placement
var eO = 0.000001;
//@ chunk-3s7ydtfd.js:51565-51578 placement
var tO = 0.001;
//@ chunk-3s7ydtfd.js:51578-51588 placement
var oO = 60;
//@ chunk-3s7ydtfd.js:51588-51607 placement
var rO = 0.000000001;
//@ chunk-3s7ydtfd.js:51607-51631 placement
var pO = 1000000000000000;
//@ chunk-3s7ydtfd.js:51631-51643 placement
var mO = 1000;
//@ chunk-3s7ydtfd.js:51643-51731 placement
function xt(e, t) {
  return e > 0 ? Math.min(Math.max(0, t - 1 - Math.floor(Math.log10(e) + we)), jg) : 0;
}
//@ chunk-3s7ydtfd.js:51731-51815 placement
var oa = (e, t) => Math.abs(e).toLocaleString("en-US", { minimumFractionDigits: e === 0 ? 0 : t });
//@ chunk-3s7ydtfd.js:51815-51838 placement
var ra = (e) => (e < 0 ? "-" : "");
//@ chunk-3s7ydtfd.js:51838-52220 placement
function clampSeriesCount(e, t) {
  let mapped = t.map((m) => m * e.multiplesPerUnit),
    r = (m) =>
      mapped.some((n) => {
        let abs = Math.abs(n),
          f = Number(abs.toFixed(m));
        return (
          Math.abs(f - abs) > we * abs &&
          (m < e.decimals || Math.floor(Math.log10(f)) > Math.floor(Math.log10(abs)))
        );
      }),
    s = 0;
  while (r(s)) s++;
  if (s === 1 && e.before !== "" && e.after === "") s = ta;
  return mapped.map((m) => {
    let n = Number(m.toFixed(s));
    return ra(n) + e.before + oa(n, s) + (n === 0 ? e.afterZero : e.after);
  });
}
//@ chunk-3s7ydtfd.js:52220-52249 placement
var Fr = { "": 1, M: Dr, G: kr, T: Ur };
//@ chunk-3s7ydtfd.js:52249-52315 placement
var sa = (e, t, o) => (r) => Math.max(o && e < Kg ? ta : 0, xt(e / r, zg), xt(t / r, Yg));
//@ chunk-3s7ydtfd.js:52315-52344 placement
var pa = { "": 1, M: Dr, B: kr, T: Ur };
//@ chunk-3s7ydtfd.js:52344-52359 placement
var cO = [1, 2, 5];
//@ chunk-3s7ydtfd.js:52359-52395 placement
var hO = ["$", "\u20AC", "\xA3", "\xA5"];
//@ chunk-3s7ydtfd.js:52395-52494 placement
var ma = [
  { ns: rO, µs: eO, ms: tO, s: 1, min: oO, h: Qg, d: qg },
  { B: 1, kB: mO, MB: Dr, GB: kr, TB: Ur, PB: pO },
  { "%": 1 },
];
//@ chunk-3s7ydtfd.js:52494-52895 placement
function summarizeSeries(e, t) {
  let found = ma.find((l) => Object.hasOwn(l, e)),
    included = hO.includes(e),
    s = found ?? (included ? pa : Fr),
    max = Math.max(...t.map(Math.abs)),
    m = sa(max, Math.max(...t) - Math.min(...t), included),
    filtered = Object.entries(s).filter(([, l], u) => u === 0 || l <= (max === 0 ? 1 : max)),
    [a, f] = filtered.filter(([, l]) => m(l) <= Jg).at(-1) ?? filtered.at(-1) ?? ["", 1],
    x = s === Fr && e !== "" ? ` ${truncateMiddle(e, Vg)}` : "";
  return {
    multiplesPerUnit: 1 / f,
    before: included ? e : "",
    after: `${a}${x}`,
    afterZero: found ? a : x,
    decimals: m(f),
  };
}
//@ chunk-3s7ydtfd.js:52895-52934 placement
var fo = (e, t) => clampSeriesCount(summarizeSeries(t, [e]), [e])[0] ?? "";
/**
 * 按系列单位格式化数值（必要时提高精度）。
 */
//@ chunk-3s7ydtfd.js:52934-53140 placement
function formatSeriesValues(e, t, o = {}) {
  let { peers: peers = t, minWritten: minWritten = 0 } = o,
    p = summarizeSeries(e, peers);
  return Math.min(...[...t, ...peers].filter((n) => n !== 0).map(Math.abs)) * p.multiplesPerUnit <
    Math.max(minWritten, Wg / Pr ** p.decimals)
    ? t.map((n) => fo(n, e))
    : clampSeriesCount(p, t);
}
//@ chunk-3s7ydtfd.js:53140-53175 placement
var na = (e) => (e === 0 ? 1 : Math.abs(e) / $g);
//@ chunk-3s7ydtfd.js:53175-53211 placement
var aa = (e, t) => !(t - e > we * Math.abs(t));
//@ chunk-3s7ydtfd.js:53211-53291 placement
var fa = (e, t) => ({ ...e, multiplesPerUnit: 1, decimals: Math.max(e.decimals, xt(t, 1)) });
/**
 * 线性坐标轴刻度：选整齐的步长，返回刻度与位置函数。
 */
//@ chunk-3s7ydtfd.js:53291-53650 placement
function linearAxisTicks(e, [t, o], r) {
  let s = t * e.multiplesPerUnit,
    p = o * e.multiplesPerUnit,
    m = (aa(s, p) ? na(p) : p - s) / r,
    n = Pr ** Math.floor(Math.log10(m)),
    a = n * (cO.find((l) => l * n >= m) ?? Gg),
    floored = Math.floor(s / a + we),
    i = floored * a,
    max = Math.max(1, Math.ceil((p - i) / a - we));
  return {
    ticks: clampSeriesCount(
      fa(e, a),
      ne(max + 1).map((l) => (floored + l) * a),
    ).map((l, u) => ({ position: u / max, label: l })),
    positionOf: (l) => (l * e.multiplesPerUnit - i) / (max * a),
  };
}
/**
 * 对数坐标轴刻度。
 */
//@ chunk-3s7ydtfd.js:53650-53899 placement
function logAxisTicks(e, [t, o], r) {
  let floored = Math.floor(Math.log10(t) + we),
    max = Math.max(1, Math.ceil(Math.log10(o) - we) - floored),
    ceil = Math.ceil(max / r),
    ceil_2 = Math.ceil(max / ceil);
  return {
    ticks: ne(ceil_2 + 1).map((a) => ({ position: a / ceil_2, label: fo(Pr ** (floored + a * ceil), e) })),
    positionOf: (a) => (Math.log10(a) - floored) / (ceil_2 * ceil),
  };
}
//@ chunk-3s7ydtfd.js:53899-54522 placement
var CHART_THEME_COLORS = {
  title: { host: void 0, light: "#1f1f1f", dark: "#f2f0eb" },
  words: { host: void 0, light: "#2b2b2b", dark: "#e6e4df" },
  quiet: { host: "ansi256(8)", light: "#6b6b6b", dark: "#a3a19b" },
  blue: { host: "ansi256(4)", light: "#2a6fdb", dark: "#6ea8ff" },
  orange: { host: "ansi256(3)", light: "#b85c00", dark: "#f0a04b" },
  green: { host: "ansi256(2)", light: "#1a7f4e", dark: "#5fc98f" },
  pink: { host: "ansi256(5)", light: "#b0307f", dark: "#ee82c4" },
  teal: { host: "ansi256(6)", light: "#0b7c8a", dark: "#5cc8d6" },
  red: { host: "ansi256(1)", light: "#c0392b", dark: "#ff8a7a" },
  violet: { host: "ansi256(13)", light: "#6f42c1", dark: "#b794f6" },
  olive: { host: "ansi256(10)", light: "#5c7a00", dark: "#b5d94c" },
};

export {
  ye,
  formatSeriesValues,
  logAxisTicks,
  linearAxisTicks,
  summarizeSeries,
  CHART_THEME_COLORS,
  An,
  readChartRequestData,
};
