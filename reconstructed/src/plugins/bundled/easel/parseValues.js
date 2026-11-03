/**
 * plugins/bundled/easel/parseValues.ts
 *
 * 2.1.316 新增：easel 读取单元格：ISO 8601 时间、周、epoch、时长、带单位/货币的数字
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (61)
 * attribution: placement 61
 */
import {
  We,
  Ju,
  ks,
  Bu,
  logEaselError,
  Es,
  As,
  bs,
  ve,
  Jo,
  Yo,
  Vo,
  st,
  je,
  ou,
  rt,
  eu,
  Ns,
  Qx,
  tu,
  checkMagnitude,
  Vx,
  W,
  zo,
  Rs,
  Is,
  Ko,
  su,
  Ms,
  du,
  mu,
  nu,
  xu,
  MCP_EASEL_CHART,
} from "./easelMessages.js";
import { pickTickStep, toSorted, ae, periodStarts, $e, parts, parseISOString } from "./timeFormat.js";
import {
  stableSum,
  CHART_INPUT_SCHEMA,
  collectToolUses,
  selectPath,
  N,
  cleanCellText,
} from "./chartSchema.js";

//@ chunk-3s7ydtfd.js:14396-14457 placement = UNDEFINED_VALUE (0.472)
function snapToStep(e, t) {
  return t.unit.fieldIndex === We ? e : e - (e % t.count);
}
//@ chunk-3s7ydtfd.js:14457-14514 placement
var pp = (e, t) => ({ zone: e.zone, areTicks: Ju, fieldsBefore: t });
/**
 * 时间刻度序列起点（按步长对齐）。
 */
//@ chunk-3s7ydtfd.js:14514-14638 placement
var buildTickSeries = (e, t, o) => ({
  start: [...e.slice(0, t.unit.fieldIndex), snapToStep(e[t.unit.fieldIndex], t)],
  step: t,
  untilMs: o.untilMs,
  zone: o.zone,
});
/**
 * 计算刻度标签的位置（居中或左对齐，夹在列内）。
 */
//@ chunk-3s7ydtfd.js:14638-14810 placement
var placeTickLabel = (e, t) => (o, r) => {
  let s = e[r] ?? "",
    columnOf = t.columnOf(o);
  return {
    text: s,
    column: columnOf,
    start: Math.min(
      Math.max(0, columnOf - (t.areCentred ? Math.floor((s.length - 1) / ks) : 0)),
      t.columns - s.length,
    ),
  };
};
/**
 * 布置刻度标签，重叠时返回空数组。
 */
//@ chunk-3s7ydtfd.js:14810-14949 placement
var layoutTickLabels = (e, t) => (o, r) => {
  let mapped = o.map(placeTickLabel(pickTickStep(o, r, e), t));
  return mapped.every(
    (m, n) => m.start >= 0 && m.start + m.text.length + Bu <= (mapped[n + 1]?.start ?? 1 / 0),
  )
    ? mapped
    : [];
};
//@ chunk-3s7ydtfd.js:14949-15242 placement
function parseNumberCell(e, t, o) {
  let r = logEaselError(e.fromMs, e.zone),
    s = layoutTickLabels(pp(e, r), o);
  for (let p of toSorted) {
    if (ae(p) < ae(t) || (e.untilMs - e.fromMs) / ae(p) > o.columns) continue;
    let n = s(
      periodStarts(buildTickSeries(r, p, e)).filter(
        (f) => f >= e.fromMs && !(t.skipsWeekends && p.unit.fieldIndex === We && $e(f, e.zone)),
      ),
      p,
    );
    if (n.length > 0) return n;
  }
  return s([e.fromMs], t);
}
//@ chunk-3s7ydtfd.js:15242-15277 placement
var rr = `(?:${parts.join("|")})[a-z]*`;
//@ chunk-3s7ydtfd.js:15277-15443 placement
var regExp_2 = new RegExp(
  String.raw`^(?:\d{1,2}([./-])\d{1,2}\1\d{4}\b|\d{1,2}/\d{1,2}/\d{2}\b|` +
    String.raw`\d{1,2}[./]\d{4}\b|${rr} \d{1,2}$|` +
    String.raw`\d{1,2} ${rr}$)`,
);
//@ chunk-3s7ydtfd.js:15443-15485 placement
var sr = (e) => regExp_2.test(String(e ?? "").trim());
//@ chunk-3s7ydtfd.js:15485-15587 placement
var TIME_OF_DAY_PATTERN =
  String.raw`(?<hour>\d\d):(?<minute>\d\d)` + String.raw`(?::(?<second>\d\d)(?<fraction>\.\d+)?)?`;
//@ chunk-3s7ydtfd.js:15587-15670 placement
var Hd = String.raw`\s?(?<zone>Z|UTC|GMT|[-+]\d\d(?::?\d\d)?)` + String.raw`(?: UTC)?`;
//@ chunk-3s7ydtfd.js:15670-15725 placement
var ip = /^(?:--?|null|none|nan|n\/a|na|\\n|[-+]inf)?$/i;
//@ chunk-3s7ydtfd.js:15725-15860 placement
var regExp_3 = new RegExp(
  String.raw`^(?:(?<days>\d+)d ?)?(?:(?<hours>\d+)h ?)?` +
    String.raw`(?:(?<minutes>\d+)m ?)?(?:(?<seconds>[\d.]+)s)?$`,
);
//@ chunk-3s7ydtfd.js:15860-15880 placement
var Kd = /^[\d.E+]+$/;
//@ chunk-3s7ydtfd.js:15880-15946 placement
var zd = /^(?<year>\d{4})-?W(?<week>\d\d)(?:-?(?<weekday>[1-7]))?$/;
//@ chunk-3s7ydtfd.js:15946-16004 placement
var Jd = /^(?<sign>[-+])(?<hours>\d\d):?(?<minutes>\d\d)?$/;
//@ chunk-3s7ydtfd.js:16004-16051 placement
var lp = { days: Es, hours: As, minutes: bs, seconds: 1 };
//@ chunk-3s7ydtfd.js:16051-16110 placement
var xp = new Map(Object.entries({ k: ve, K: ve, M: Jo, B: Yo, T: Vo }));
//@ chunk-3s7ydtfd.js:16110-16123 placement
var pr = st * je;
//@ chunk-3s7ydtfd.js:16123-16427 placement
var NUMBER_PATTERN = [
  ["", { k: ve, K: ve, M: Jo, G: Yo, T: Vo, short: 1, none: 1 }],
  ["B", { B: 1, kB: ve, KB: ve, MB: Jo, GB: Yo, TB: Vo, PB: ou }],
  ["B", { Ki: je, Mi: rt, Gi: st, Ti: pr }],
  ["B", { KiB: je, MiB: rt, GiB: st, TiB: pr }],
  ["B", { bytes: 1, decbytes: 1 }],
  ["s", { ns: eu, us: Ns, µs: Ns, ms: Qx, s: 1 }],
  ["s", { min: bs, h: As, d: Es }],
  ["%", { "%": 1, percent: 1, percentunit: tu }],
];
//@ chunk-3s7ydtfd.js:16427-16516 placement
var Pt = new Map(
  NUMBER_PATTERN.flatMap(([e, t]) => Object.entries(t).map(([o, r]) => [o, { unit: e, size: r }])),
);
//@ chunk-3s7ydtfd.js:16516-16596 placement
function dp(e, t) {
  let { unit: unit, size: size } = Pt.get(t) ?? { unit: t, size: 1 };
  return checkMagnitude(e * size, unit);
}
//@ chunk-3s7ydtfd.js:16596-16664 placement
function mr(e, t, o) {
  return o !== void 0 ? checkMagnitude(e * (xp.get(t) ?? 1), o) : dp(e, t);
}
/**
 * 由数字正则匹配组（符号、整数、小数、指数、单位、货币）得到数值。
 */
//@ chunk-3s7ydtfd.js:16664-16844 placement
function numberFromMatch(e) {
  let { sign: sign, currency: currency, suffix: suffix = "" } = e,
    { integer: integer = "0", fraction: fraction = "", exponent: exponent = "0" } = e,
    n = Number(`${integer.replaceAll(",", "")}${fraction}e${exponent}`);
  return mr(sign === "" || sign === "+" ? n : -n, suffix, currency);
}
//@ chunk-3s7ydtfd.js:16844-16940 placement
var pc = String.raw`(?=\.?\d)(?<integer>\d{1,3}(?:,\d{3})+|\d+)?` + String.raw`(?<fraction>\.\d+)?`;
//@ chunk-3s7ydtfd.js:16940-16987 placement
var mc = String.raw`(?:e(?<exponent>[-+]?\d+))?`;
//@ chunk-3s7ydtfd.js:16987-17064 placement
var nc = String.raw`^(?<sign>[-+\u2212(]?)(?<currency>[$\u20AC\u00A3\u00A5])?`;
//@ chunk-3s7ydtfd.js:17064-17151 placement
var ac = String.raw`(?<space>\s?)` + String.raw`(?<suffix>[a-z\u00B5%]*(?:\/[a-z]+)?)\)?$`;
//@ chunk-3s7ydtfd.js:17151-17256 placement
var TIME_FORMATS_HINT =
  'Times are read as ISO 8601 (2026-09-07, 2026-W37), epoch numbers, "7 Sep 2026" or "Sep 7, 2026"';
//@ chunk-3s7ydtfd.js:17256-17291 placement
var regExp_4 = new RegExp(nc + pc + mc + ac, "i");
/**
 * 解析数字（千分位、指数、货币、单位后缀），返回值或 empty/not a number。
 */
//@ chunk-3s7ydtfd.js:17291-17728 placement
function parseNumberWithUnit(e, t = !1) {
  if (typeof e === "number") return checkMagnitude(e, "");
  let trimmed = String(e ?? "").trim();
  if (ip.test(trimmed)) return { kind: "empty", why: "empty" };
  let p = regExp_3.exec(trimmed)?.groups ?? {},
    mapped = Object.entries(lp)
      .filter(([x]) => p[x] !== void 0)
      .map(([x, l]) => Number(p[x]) * l);
  if (mapped.length >= Vx) return checkMagnitude(stableSum(mapped), "s");
  let a = regExp_4.exec(trimmed)?.groups;
  if (!a) return W("not a number");
  let [f = ""] = (a.suffix ?? "").split("/");
  return a.space === "" && !t && f !== "" && !Pt.has(f) ? W("not a number") : numberFromMatch(a);
}
//@ chunk-3s7ydtfd.js:17728-17782 placement
var Tp = { 9: zo, 10: zo, 12: 1, 13: 1, 15: Rs, 16: Rs, 18: Is, 19: Is };
//@ chunk-3s7ydtfd.js:17782-17827 placement
var Ge = (e, t) => ({ kind: "time", ms: e, isZoned: t });
//@ chunk-3s7ydtfd.js:17827-17873 placement
var Sp = (e) => (new Date(e).getUTCDay() + Ko - 1) % Ko;
//@ chunk-3s7ydtfd.js:17873-17915 placement
var gp = (e, t) => logEaselError(parseISOString([e, 0, t + su - 1]), "UTC")[0];
/**
 * ISO 周（年-W周-日）转时间戳，不存在的周返回错误。
 */
//@ chunk-3s7ydtfd.js:17915-18081 placement
function isoWeekToMs(e) {
  let t = Number(e.year),
    o = Number(e.week),
    r = Ms - Sp(parseISOString([t, 0, Ms])) + (o - 1) * Ko;
  return o < 1 || gp(t, r) !== t
    ? W("no such week")
    : Ge(parseISOString([t, 0, r + Number(e.weekday ?? 1) - 1]), du);
}
//@ chunk-3s7ydtfd.js:18081-18109 placement
var _p = (e) => (t, o) => t !== e[o];
/**
 * 按时区偏移与小数秒修正时间戳。
 */
//@ chunk-3s7ydtfd.js:18109-18300 placement
function applyZoneOffset(e, t) {
  let o = Jd.exec(t.zone ?? "")?.groups ?? {},
    r = Number(o.hours ?? 0) * mu + Number(o.minutes ?? 0);
  return Ge(
    e - (o.sign === "-" ? -r : r) * nu + Math.round(Number(t.fraction ?? "0") * zo),
    t.zone !== void 0,
  );
}
//@ chunk-3s7ydtfd.js:18300-18551 placement
function describeDate(e) {
  let { year: year, month: month = "1", day: day = "1", monthName: monthName } = e,
    { hour: hour = "0", minute: minute = "0", second: second = "0" } = e,
    mapped = [
      year,
      monthName === void 0 ? Number(month) - 1 : parts.findIndex((l) => monthName.startsWith(l)),
      day,
      hour,
      minute,
      second,
    ].map(Number),
    i = parseISOString(mapped);
  return mapped.some(_p(logEaselError(i, "UTC"))) ? W("no such date") : applyZoneOffset(i, e);
}
//@ chunk-3s7ydtfd.js:18551-18574 placement
var Dt = TIME_OF_DAY_PATTERN + `(?:${Hd})?`;
//@ chunk-3s7ydtfd.js:18574-19053 placement
var DATE_PATTERNS = [
  String.raw`^(?<year>\d{4})(?:[-/](?<month>\d\d)(?:[-/](?<day>\d\d)` + String.raw`(?:[T ]${Dt})?)?)?$`,
  String.raw`^(?:[A-Z][a-z]{2}, )?(?<day>\d{1,2}) ` +
    String.raw`(?<monthName>[A-Z][a-z]+) (?<year>\d{4})` +
    String.raw`(?: ${Dt})?$`,
  String.raw`^(?<monthName>[A-Z][a-z]+) (?<day>\d{1,2}), (?<year>\d{4})` + String.raw`(?: ${Dt})?$`,
  String.raw`^(?<year>\d{4})(?<month>\d\d)(?<day>\d\d)T` +
    String.raw`(?<hour>\d\d)(?<minute>\d\d)(?<second>\d\d)(?<zone>Z)$`,
].map((e) => new RegExp(e));
/**
 * 解析时间单元格（ISO 日期、周、epoch 数字等），返回毫秒或错误。
 */
//@ chunk-3s7ydtfd.js:19053-19373 placement
function parseTimeCell(e) {
  let trimmed = String(e ?? "").trim();
  if (ip.test(trimmed)) return { kind: "empty", why: "empty" };
  let r = Kd.test(trimmed) ? Number(trimmed) : NaN,
    s = Tp[String(Math.trunc(r)).length];
  if (!Number.isNaN(r) && s !== void 0) return Ge(r * s, xu);
  for (let n of DATE_PATTERNS) {
    let a = n.exec(trimmed)?.groups;
    if (a) return describeDate(a);
  }
  let m = zd.exec(trimmed)?.groups;
  return m ? isoWeekToMs(m) : W("not a time");
}
/**
 * easel chart 工具的描述（给模型看：从已有数据画一张图，告诉用户要点）。
 */
//@ chunk-3s7ydtfd.js:19373-20372 placement
var CHART_TOOL_DESCRIPTION = `Draws one chart from data you already have, and answers with what was read, drawn and left out. The person sees the chart, not this answer: tell them the headline number and pass on the "note:" lines.
The data is a table under 64 KiB: JSON records, CSV, TSV, a markdown or SQL table, aligned shell output. Name x and y. You may leave them out where there is one way to read it: metric results from Prometheus, Grafana and Datadog (these may be charted unasked), one column of times beside nothing but numbers, or beside one column of names too where the times repeat, or one column of names beside one of numbers (bars). Nothing is guessed: a call that leaves a choice open is refused with the columns that were found, so call again. Rows are not counted or put in buckets of time: pass counts. ${TIME_FORMATS_HINT}.
It reads no file, and no result that the host cut or saved to a file: query less. A file that a tool read comes with a number before each line: pass its rows as data, without the numbers.`;
//@ chunk-3s7ydtfd.js:20372-20424 placement
var Rc = { name: "chart", description: CHART_TOOL_DESCRIPTION, inputSchema: CHART_INPUT_SCHEMA };
//@ chunk-3s7ydtfd.js:20424-20682 placement
function lastUserMessageIndex(e, t) {
  let o = Array.isArray(e) ? e : [],
    lastIndex = o.findLastIndex((m) => m.role === "user" && !m.toolResults?.length),
    flattened = o.slice(lastIndex + 1).flatMap((m) => m.toolUses),
    index = flattened.findIndex((m) => m.tool_use_id === t);
  return flattened
    .slice(0, index < 0 ? void 0 : index)
    .some((m) => m.text === void 0 && m.tool !== MCP_EASEL_CHART);
}
/**
 * 读会话消息中的工具调用；若该调用的消息尚未出现则按延迟表等待重试。
 */
//@ chunk-3s7ydtfd.js:20682-20911 placement
async function waitForToolUses(e, t, o) {
  let { agentId: agentId } = t,
    [s, ...p] = o,
    messages = await e.session.messages(agentId ? { agentId: agentId } : {});
  if (s === void 0 || !lastUserMessageIndex(messages, t.tool_use_id))
    return Array.isArray(messages) ? collectToolUses(messages) : void 0;
  return (await e.clock.sleep(s, { signal: t.signal }), waitForToolUses(e, t, p));
}
//@ chunk-3s7ydtfd.js:20911-20955 placement
var Ut = (e) => ({ ...e, form: "bars", log: void 0 });
/**
 * 单元格值标准化：基本类型原样，空为 null，其他转 JSON 字符串。
 */
//@ chunk-3s7ydtfd.js:20955-21086 placement
function toCellValue(e) {
  return typeof e === "string" || typeof e === "number" || typeof e === "boolean"
    ? e
    : e === void 0 || e === null
      ? null
      : JSON.stringify(e);
}
//@ chunk-3s7ydtfd.js:21086-21127 placement
var Ft = (e, t) => e.map((o) => t.get(o) ?? null);
/**
 * 分隔符表格式：制表符、竖线表、CSV、分号。
 */
//@ chunk-3s7ydtfd.js:21127-21286 placement
var DELIMITED_FORMATS = [
  { source: "tab-separated", pattern: /\t/ },
  { source: "pipe table", pattern: /[|\u2502]/ },
  { source: "CSV", pattern: /,/ },
  { source: "semicolon-separated", pattern: /;/ },
];
//@ chunk-3s7ydtfd.js:21286-21343 placement
var jt = (e) => parseNumberWithUnit(e).kind === "unread" && parseTimeCell(e).kind === "unread";
//@ chunk-3s7ydtfd.js:21343-21360 placement
var GRAFANA = "Grafana";
//@ chunk-3s7ydtfd.js:21360-21371 placement
var vt = "*";
//@ chunk-3s7ydtfd.js:21371-21386 placement
var VALUE = "value";
/**
 * 取路径上的标签：对象展开为键值对，标量转为单项。
 */
//@ chunk-3s7ydtfd.js:21386-21543 placement
function labelEntries(e, t) {
  let [o] = selectPath(e, t),
    r = N(o),
    s = o === void 0 || o === vt;
  return r
    ? Object.entries(o).map(([p, m]) => [p, typeof m === "string" ? cleanCellText(m) : m])
    : s
      ? []
      : [[t, cleanCellText(String(o))]];
}
//@ chunk-3s7ydtfd.js:21543-21553 placement
var Ip = 12;
/**
 * 可识别的指标格式（Prometheus、Datadog、Grafana 等）的序列/标签/时间/值路径。
 */
//@ chunk-3s7ydtfd.js:21553-22669 placement
var METRICS_FORMATS = [
  {
    name: "Prometheus",
    series: "[]",
    labels: ["metric"],
    time: "values.[].0",
    value: "values.[].1",
    isReadAtInstants: !0,
  },
  {
    name: "Datadog",
    series: "series.[]",
    labels: ["metric", "scope", "group", "functions"],
    time: "pointlist.[].0",
    value: "pointlist.[].1",
    isReadAtInstants: !1,
    unit: "unit.[].short_name",
  },
  {
    name: "named-series",
    series: "series.[]",
    labels: ["name"],
    time: "data.[].0",
    value: "data.[].1",
    isReadAtInstants: !1,
  },
  {
    name: "Datadog-buckets",
    series: "data.buckets.[]",
    labels: ["by"],
    time: "computes.*.[].time",
    value: "computes.*.[].value",
    isReadAtInstants: !1,
  },
  {
    name: "Graphite",
    series: "[]",
    labels: ["target"],
    time: "datapoints.[].1",
    value: "datapoints.[].0",
    isReadAtInstants: !1,
  },
  {
    name: "CloudWatch",
    series: "MetricDataResults.[]",
    labels: ["Label"],
    time: "Timestamps.[]",
    value: "Values.[]",
    isReadAtInstants: !1,
  },
  {
    name: "Cloud-Monitoring",
    series: "timeSeries.[]",
    labels: ["metric.labels"],
    time: "points.[].interval.endTime",
    value: "points.[].value.*",
    isReadAtInstants: !0,
  },
  {
    name: "Cost-Explorer",
    series: "",
    labels: [],
    time: "ResultsByTime.[].TimePeriod.Start",
    value: "ResultsByTime.[].Total.*.Amount",
    isReadAtInstants: !1,
    unit: "ResultsByTime.0.Total.*.Unit",
  },
];
//@ chunk-3s7ydtfd.js:22669-22704 placement
var qc = [...METRICS_FORMATS.map((e) => e.name), GRAFANA];
//@ chunk-3s7ydtfd.js:22704-22782 placement
var Np = (e) => e.every((t) => t.cellsByKey.every(([, o]) => o.length === t.pointCount));
//@ chunk-3s7ydtfd.js:22782-22816 placement
var ty = /^([\w./-]+):[^\s,(){}]+$/;
//@ chunk-3s7ydtfd.js:22816-22902 placement
var ry = /^((?:[\w.]+:)?[\w.-]+)\{([^{}]*)\}(?: by \{[^{}]*\})?((?:\.\w+\([^()]*\))*)$/;

export {
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
  mr,
  parseNumberCell,
  Ut,
  Rc,
  waitForToolUses,
};
