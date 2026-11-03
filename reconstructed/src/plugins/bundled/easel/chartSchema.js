/**
 * plugins/bundled/easel/chartSchema.ts
 *
 * 2.1.316 新增：easel 图表工具的输入模式与图表种类定义（line/columns/sparks/bars/share）、宽字符表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3s7ydtfd.js (71)
 * attribution: placement 71
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import { registerEasel } from "./easelPlugin.js";

//@ chunk-3s7ydtfd.js:227-237 placement
var ms = {};
//@ chunk-3s7ydtfd.js:237-277 placement
Ar(ms, { default: () => ms, register: () => registerEasel });
//@ chunk-3s7ydtfd.js:277-337 placement
var N = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
/**
 * JSON 路径的一步：[] 取数组全部元素，* 取对象全部值，其余按下标/键取。
 */
//@ chunk-3s7ydtfd.js:337-542 placement
function stepPathSegment(e, t) {
  if (t === "[]") return Array.isArray(e) ? e : [];
  if (t === "*") return N(e) ? Object.values(e) : [];
  let o = Array.isArray(e) && e[Number(t)] !== void 0,
    r = N(e) && e[t] !== void 0;
  return o ? [e[Number(t)]] : r ? [e[t]] : [];
}
/**
 * 按点分 JSON 路径（支持 [] 与 *）从值中选出所有匹配项。
 */
//@ chunk-3s7ydtfd.js:542-652 placement
function selectPath(e, t = "") {
  let o = [e];
  for (let r of t.split(".").filter((s) => s !== "")) o = o.flatMap((s) => stepPathSegment(s, r));
  return o;
}
/**
 * 工具结果的文本：字符串直接用，否则拼接 [].text，空时用默认值。
 */
//@ chunk-3s7ydtfd.js:652-765 placement
function toolResultText(e, t = "") {
  return typeof e === "string"
    ? e || t
    : selectPath(e, "[].text").filter((r) => typeof r === "string").join(`
`) || t;
}
/**
 * 工具调用记录转为 easel 用的 {id, tool, input, storedResult, text}。
 */
//@ chunk-3s7ydtfd.js:765-871 placement
var toChartableToolUse = (e) => ({
  id: e.tool_use_id,
  tool: e.tool,
  input: e.input,
  storedResult: e.result,
  text: toolResultText(e.result, e.text),
});
/**
 * 从消息列表收集所有有文本且非错误的工具调用。
 */
//@ chunk-3s7ydtfd.js:871-993 placement
function collectToolUses(e) {
  return (Array.isArray(e) ? e.flatMap((o) => o.toolUses) : []).flatMap((o) =>
    o.text === void 0 || o.isError ? [] : [toChartableToolUse(o)],
  );
}
//@ chunk-3s7ydtfd.js:993-1003 placement
var Pl = 24;
//@ chunk-3s7ydtfd.js:1003-1012 placement
var Dl = 4;
//@ chunk-3s7ydtfd.js:1012-1022 placement
var Ul = 24;
//@ chunk-3s7ydtfd.js:1022-1031 placement
var Ct = 8;
//@ chunk-3s7ydtfd.js:1031-1041 placement
var Fl = 40;
//@ chunk-3s7ydtfd.js:1041-1050 placement
var Bl = 4;
//@ chunk-3s7ydtfd.js:1050-1060 placement
var jl = 40;
//@ chunk-3s7ydtfd.js:1060-1069 placement
var Be = 3;
//@ chunk-3s7ydtfd.js:1069-1079 placement
var fs = 10;
/**
 * 图表种类表：line、columns、sparks、bars、share 的名称、复数、默认/最大序列数。
 */
//@ chunk-3s7ydtfd.js:1079-1471 placement
var CHART_FORMS = {
  line: { label: "line chart", plural: "series", defaultCount: Ct, maxCount: Ct },
  columns: { label: "column chart", plural: "series", defaultCount: Dl, maxCount: Bl },
  sparks: { label: "sparklines", plural: "series", defaultCount: Ul, maxCount: jl },
  bars: { label: "bar chart", plural: "bars", singular: "bar", defaultCount: Pl, maxCount: Fl },
  share: { label: "share bar", plural: "parts", singular: "part", defaultCount: Ct, maxCount: Ct },
};
//@ chunk-3s7ydtfd.js:1471-1570 placement
function jo(e, t) {
  let { plural: plural, singular: singular = plural } = CHART_FORMS[e];
  return `${t.toLocaleString("en-US")} ${t === 1 ? singular : plural}`;
}
//@ chunk-3s7ydtfd.js:1570-1580 placement
var $l = 40;
//@ chunk-3s7ydtfd.js:1580-1590 placement
var ls = 12;
//@ chunk-3s7ydtfd.js:1590-1634 placement
var xs = { type: "array", items: { type: "string" } };
/**
 * easel chart 工具的 JSON Schema（data、form、x、y、combine 等字段及说明）。
 */
//@ chunk-3s7ydtfd.js:1634-4312 placement
var CHART_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: !1,
  properties: {
    data: {
      anyOf: [{ type: "string" }, { type: "array", items: { type: "object" } }],
      description:
        "Leave it out to chart the tool result just before this call, as it is: do not type a result again. Where it holds several tables, x and y pick the one with those columns. Or the id of an earlier result, as a refusal lists them. Or the table itself, as records or as text, only for numbers no tool returned.",
    },
    x: { type: "string", description: "the column along the chart: times, or the categories of bars" },
    form: {
      enum: ["line", "columns", "bars", "sparks", "share"],
      description:
        "if left out, a line over times and bars over names. line, columns and sparks need times in x: over names they are drawn as bars. columns stand on zero, one per day, month or other even step. sparks are a small row for each series, on one scale: for many series. bars are horizontal, one per category. share is the parts of a whole as one bar, what a pie shows: its values are summed",
    },
    y: {
      ...xs,
      description: `the value columns. Lines share a plot where they have one unit and their largest values are within ${fs} times of each other, columns only where they stack. ${Be} plots at most, and the rest are named`,
    },
    by: {
      ...xs,
      description: "columns that split the rows into series. With combine and no by, nothing is split",
    },
    combine: {
      enum: ["sum", "mean", "max", "min"],
      description:
        'how rows that share an x, and a series, become one. "sum" also says the values add, which turns on totals and shares, and stacks columns',
    },
    top: {
      type: "integer",
      minimum: 1,
      description: `how many to draw: ${CHART_FORMS.bars.defaultCount} bars if left out and ${CHART_FORMS.bars.maxCount} at most, ${CHART_FORMS.line.maxCount} lines at most, ${CHART_FORMS.sparks.defaultCount} sparks and ${CHART_FORMS.sparks.maxCount} at most, ${CHART_FORMS.share.maxCount} parts of a share beside one for the rest, ${CHART_FORMS.columns.maxCount} series of columns where they stack, else ${Be}. The largest are kept, largest first, and the rest are counted`,
    },
    unit: {
      type: "string",
      description: "ms, KB, %, $: what bare numbers are in. Values that carry a unit keep it",
    },
    zone: {
      enum: ["utc", "local"],
      description:
        "the zone that times are shown in, utc if left out. Times that name no zone are shown as written",
    },
    log: {
      type: "boolean",
      description: "a log scale, for lines. Values at or below zero are counted and left out",
    },
    marks: {
      type: "array",
      maxItems: ls,
      items: {
        type: "object",
        additionalProperties: !1,
        required: ["at"],
        properties: {
          at: { type: "string", description: "a time, spelled as in x" },
          label: { type: "string", description: "short" },
        },
      },
      description: `events on a chart over time, ${ls} at most: a rule and a label each. One outside the times drawn is said instead`,
    },
    title: { type: "string", description: "short" },
  },
};
//@ chunk-3s7ydtfd.js:4312-4375 placement
var K = (e, t) => `${e.toLocaleString("en-US")} ${e === 1 ? t : `${t}s`}`;
//@ chunk-3s7ydtfd.js:4375-4458 placement
function Et(e, t, o) {
  let r = e.length - t;
  return r > 0 ? [...e.slice(0, t), `and ${K(r, o)}`] : e;
}
//@ chunk-3s7ydtfd.js:4458-4515 placement
var Jl = /[\s\u{115F}\u{1160}\u{2800}\u{3164}\u{FFA0}]+/gu;
//@ chunk-3s7ydtfd.js:4515-4541 placement
var Vl = /[\uD800-\uDBFF]$/;
//@ chunk-3s7ydtfd.js:4541-4588 placement
var Zl = /\s*[\n\r\u{2028}\u{2029}\u0085][^]*$/u;
//@ chunk-3s7ydtfd.js:4588-4601 placement
var ql = / +/g;
//@ chunk-3s7ydtfd.js:4601-4619 placement
var Wo = /^[ -~]*$/;
//@ chunk-3s7ydtfd.js:4619-4642 placement
var ex = /[\p{L}\p{N}]/u;
//@ chunk-3s7ydtfd.js:4642-4678 placement
var ox = /[\p{C}\u{FE00}-\u{FE0F}]/gu;
//@ chunk-3s7ydtfd.js:4678-4751 placement
var rx = /[\p{Cc}\u{E0000}-\u{E007F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
//@ chunk-3s7ydtfd.js:4751-4819 placement
var sx = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u{20E3}/u;
//@ chunk-3s7ydtfd.js:4819-4895 placement
var mx = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F}|\u{20E3}/u;
//@ chunk-3s7ydtfd.js:4895-5349 placement
var WIDE_CHAR_PATTERN = new RegExp(
  "[" +
    String.raw`\u{1100}-\u{115F}\u{2329}\u{232A}\u{2630}-\u{2637}` +
    String.raw`\u{268A}-\u{268F}\u{2E80}-\u{303E}\u{3041}-\u{3247}` +
    String.raw`\u{3250}-\u{A4C6}\u{A960}-\u{A97C}\u{AC00}-\u{D7A3}` +
    String.raw`\u{F900}-\u{FAFF}\u{FE10}-\u{FE19}\u{FE30}-\u{FE6B}` +
    String.raw`\u{FF01}-\u{FF60}\u{FFE0}-\u{FFE6}\u{16FE0}-\u{18DF2}` +
    String.raw`\u{1AFF0}-\u{1B2FB}\u{1D300}-\u{1D376}\u{1F200}-\u{1F265}` +
    String.raw`\u{20000}-\u{3FFFD}` +
    "]",
  "u",
);
//@ chunk-3s7ydtfd.js:5349-5512 placement
var regExp = new RegExp(
  "[" +
    String.raw`\p{Mn}\p{Me}\u{1160}-\u{11FF}\u{200B}-\u{200F}` +
    String.raw`\u{D7B0}-\u{D7FB}` +
    "]|" +
    String.raw`(?=[\u{0900}-\u{0D63}])\p{Mc}`,
  "u",
);
//@ chunk-3s7ydtfd.js:5512-5528 placement
var At = "\u2026";
//@ chunk-3s7ydtfd.js:5528-5596 placement
function ds(e, t) {
  return e.length > t ? e.slice(0, t).replace(Vl, "") + At : e;
}
//@ chunk-3s7ydtfd.js:5596-5628 placement
var xx = new Intl.Segmenter("en");
//@ chunk-3s7ydtfd.js:5628-5714 placement
function Ce(e) {
  return Wo.test(e) ? e.split("") : Array.from(xx.segment(e), (o) => o.segment);
}
//@ chunk-3s7ydtfd.js:5714-5725 placement
var cx = 1.5;
//@ chunk-3s7ydtfd.js:5725-5736 placement
var yx = 120;
//@ chunk-3s7ydtfd.js:5736-5745 placement
var Ho = 1;
//@ chunk-3s7ydtfd.js:5745-5754 placement
var Tx = 2;
//@ chunk-3s7ydtfd.js:5754-5763 placement
var gx = 2;
//@ chunk-3s7ydtfd.js:5763-5772 placement
var Ox = 2;
//@ chunk-3s7ydtfd.js:5772-5816 placement
var ys = (e, t) => e.reduce((o, r) => (t(r) ? o + 1 : o), 0);
//@ chunk-3s7ydtfd.js:5816-5852 placement
var U = (e) => [...new Set(e).values()];
//@ chunk-3s7ydtfd.js:5852-6267 placement
function groupIndexBy(e, t) {
  let o = [],
    r = [];
  for (let l of e) (o.push(l), r.push(t(l)));
  let s = [...new Set(r).values()],
    p = new Map(s.map((l, u) => [l, u])),
    mapped = r.map((l) => p.get(l) ?? 0),
    mapped_2 = s.map(() => 0);
  for (let l of mapped) mapped_2[l] = (mapped_2[l] ?? 0) + 1;
  let a = [],
    f = 0;
  for (let l of mapped_2) (a.push(f), (f += l));
  let i = [...a],
    x = [...o];
  for (let [l, u] of o.entries()) {
    let d = mapped[l] ?? 0,
      c = i[d] ?? 0;
    ((x[c] = u), (i[d] = c + 1));
  }
  return new Map(
    s.map((l, u) => {
      let d = a[u] ?? 0;
      return [l, x.slice(d, d + (mapped_2[u] ?? 0))];
    }),
  );
}
//@ chunk-3s7ydtfd.js:6267-6314 placement
var ne = (e) => [...Array.from({ length: e }).keys()];
//@ chunk-3s7ydtfd.js:6314-6401 placement
function $o(e, t, o) {
  let r = [],
    s = o;
  for (let p of e) ((s += t(p)), r.push({ part: p, end: s }));
  return r;
}
/**
 * 求和；结果小到可视为浮点误差时返回 0。
 */
//@ chunk-3s7ydtfd.js:6401-6528 placement
function stableSum(e) {
  let reduced = e.reduce((r, s) => r + s, 0),
    reduced_2 = e.reduce((r, s) => r + Math.abs(s), 0);
  return Math.abs(reduced) > e.length * Number.EPSILON * reduced_2 ? reduced : 0;
}
//@ chunk-3s7ydtfd.js:6528-6616 placement
function Go(e, t, o) {
  let r = [],
    s = 0;
  for (let p of e) {
    if (((s += o(p)), s > t)) break;
    r.push(p);
  }
  return r;
}
//@ chunk-3s7ydtfd.js:6616-6730 placement = returnValue (1)
function returnValue(e, t) {
  let o = [],
    values = t.values();
  for (let s of e) {
    let p = values.next();
    if (p.done) break;
    o.push([s, p.value]);
  }
  return o;
}
/**
 * 文本显示宽度（ASCII 快速路径，宽字符与特殊字素计 2）。
 */
//@ chunk-3s7ydtfd.js:6730-6884 placement
function displayWidth(e) {
  if (Wo.test(e)) return e.length;
  let o = 0;
  for (let r of Ce(e))
    if (mx.test(r)) o += gx;
    else for (let p of r) if (!regExp.test(p)) o += WIDE_CHAR_PATTERN.test(p) ? Ox : 1;
  return o;
}
/**
 * 超过宽度时保留首尾、中间用省略号截断。
 */
//@ chunk-3s7ydtfd.js:6884-7051 placement
function truncateMiddle(e, t) {
  if (displayWidth(e) <= t) return e;
  if (t < Ho) return "";
  let r = Ce(e),
    ceil = Math.ceil((t - Ho) / Tx);
  return (
    Go(r, ceil, displayWidth).join("") +
    At +
    Go(r.toReversed(), t - Ho - ceil, displayWidth)
      .toReversed()
      .join("")
  );
}
//@ chunk-3s7ydtfd.js:7051-7112 placement
function hs(e) {
  let matches = sx.test(e);
  return e.replace(matches ? rx : ox, "");
}
/**
 * 清洗单元格文本：截断、替换控制字符与特殊空白后按宽度截断。
 */
//@ chunk-3s7ydtfd.js:7112-7264 placement
function cleanCellText(e, t = yx) {
  let replaced = ds(e, t * cx)
      .trim()
      .replace(Zl, At)
      .replace(Jl, " "),
    matches = Wo.test(replaced);
  return truncateMiddle((matches ? replaced : Ce(replaced).map(hs).join("")).replace(ql, " ").trim(), t);
}
/**
 * 深拷贝对象并清洗其中所有字符串（相同字符串复用结果）。
 */
//@ chunk-3s7ydtfd.js:7264-7413 placement
function cleanAllStrings(e) {
  let t = new Map();
  return JSON.parse(JSON.stringify(e), (o, r) => {
    if (typeof r !== "string") return r;
    let p = t.get(r) ?? cleanCellText(r);
    return (t.set(r, p), p);
  });
}
//@ chunk-3s7ydtfd.js:7413-7462 placement
var Ts = (e, t) => `${At}${[...e].slice(t).join("")}`;
//@ chunk-3s7ydtfd.js:7462-7677 placement
function measureLabelWidth(e, t) {
  let [o = [], ...r] = e.map((m) => [...m]),
    s =
      o
        .slice(
          0,
          Math.max(
            0,
            o.findIndex((m, n) => r.some((a) => a[n] !== m)),
          ),
        )
        .findLastIndex((m) => !ex.test(m)) + 1,
    p = s > 0 && e.some((m) => displayWidth(m) > t);
  return e.map((m) => truncateMiddle(p ? Ts(m, s) : m, t));
}
/**
 * 按单词把文本折行到宽度 t（单词超长时截断）。
 */
//@ chunk-3s7ydtfd.js:7677-7832 placement
function wrapToWidth(e, t, o = t) {
  let r = [""];
  for (let s of e.split(" ")) {
    let p = truncateMiddle(s, o),
      trimStart = `${r.at(-1)} ${p}`.trimStart();
    displayWidth(trimStart) <= t || trimStart === p ? (r[r.length - 1] = trimStart) : r.push(p);
  }
  return r;
}
//@ chunk-3s7ydtfd.js:7832-7877 placement
var Ss = (e, t) => (Object.hasOwn(e, t) ? e[t] : void 0);
/**
 * 生成对象字段的校验错误映射函数（未知字段报 “is not a field”）。
 */
//@ chunk-3s7ydtfd.js:7877-8069 placement
var fieldErrorsFor =
  (e) =>
  ([t, o]) => {
    let r = Ss(e.properties, t);
    return r
      ? e.errorsAt(o, r, `${e.prefix}${t}`).map((s) => `${s} (${r.description})`)
      : [e.prefix + cleanCellText(t, $l) + ` is not a field: those are ${e.fieldNames}`];
  };
//@ chunk-3s7ydtfd.js:8069-8106 placement
var Os = (e) => (e === null ? "null" : typeof e);
//@ chunk-3s7ydtfd.js:8106-8154 placement = isTextField (0.816)
var isTextField = (s) => (Number.isInteger(s) ? "integer" : Os(s));
//@ chunk-3s7ydtfd.js:8154-8197 placement
var Cs = (e) => (Array.isArray(e) ? "array" : isTextField(e));
/**
 * 按简化 JSON Schema（anyOf/enum/type/minimum/maxItems/items/properties/required）校验值，返回错误信息列表。
 */
//@ chunk-3s7ydtfd.js:8197-9049 placement
function validateAgainstSchema(e, t, o) {
  let { anyOf: anyOf, items: items, properties: properties, required: required = [] } = t;
  if (anyOf?.some((c) => validateAgainstSchema(e, c, o).length === 0)) return [];
  if (anyOf) return [`${o} must be ${anyOf.map((c) => c.type).join(" or ")}`];
  if (t.enum?.some((c) => c === e)) return [];
  if (t.enum) return [`${o} must be one of ${t.enum.join(", ")}`];
  let f = Cs(e);
  if (t.type !== f) return [`${o || "the call"} must be ${t.type}, not ${f}`];
  if (typeof e === "number" && e < (t.minimum ?? -1 / 0)) return [`${o} must be at least ${t.minimum}`];
  if (Array.isArray(e) && e.length > (t.maxItems ?? 1 / 0)) return [`${o} must hold at most ${t.maxItems}`];
  if (Array.isArray(e) && items) return e.flatMap((c, g) => validateAgainstSchema(c, items, `${o}[${g}]`));
  if (!(N(e) && properties !== void 0)) return [];
  let d = o === "" ? "" : `${o}.`;
  return [
    ...required.filter((c) => !Object.hasOwn(e, c)).map((c) => `${d}${c} is missing`),
    ...Object.entries(e).flatMap(
      fieldErrorsFor({
        properties: properties,
        prefix: d,
        fieldNames: Object.keys(properties).join(", "),
        errorsAt: validateAgainstSchema,
      }),
    ),
  ];
}
//@ chunk-3s7ydtfd.js:9049-9073 placement
var Xo = (e) => validateAgainstSchema(e, CHART_INPUT_SCHEMA, "");
//@ chunk-3s7ydtfd.js:9073-9102 placement
var jx = (e) => Xo(e).length === 0;

export {
  stableSum,
  CHART_INPUT_SCHEMA,
  collectToolUses,
  selectPath,
  N,
  cleanCellText,
  U,
  returnValue,
  groupIndexBy,
  K,
  ne,
  ys,
  cleanAllStrings,
  CHART_FORMS,
  truncateMiddle,
  Et,
  jo,
  fs,
  Be,
  Go,
  displayWidth,
  measureLabelWidth,
  wrapToWidth,
  $o,
  Ce,
  jx,
  Xo,
  toolResultText,
};
