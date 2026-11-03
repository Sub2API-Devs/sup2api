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
/**
 * 单位说明
 */
var UNIT_HINT = {};
//@ chunk-3s7ydtfd.js:237-277 placement
Ar(UNIT_HINT, {
  default: () => UNIT_HINT,
  register: () => registerEasel,
});
//@ chunk-3s7ydtfd.js:277-337 placement
/**
 * 普通对象
 */
var isPlainObject = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
//@ chunk-3s7ydtfd.js:337-542 placement
/**
 * JSON 路径的一步：[] 取数组全部元素，* 取对象全部值，其余按下标/键取。
 */
function stepPathSegment(e, t) {
  if (t === "[]") return Array.isArray(e) ? e : [];
  if (t === "*") return isPlainObject(e) ? Object.values(e) : [];
  let o = Array.isArray(e) && e[Number(t)] !== undefined;
  let r = isPlainObject(e) && e[t] !== undefined;
  return o ? [e[Number(t)]] : r ? [e[t]] : [];
}
//@ chunk-3s7ydtfd.js:542-652 placement
/**
 * 按点分 JSON 路径（支持 [] 与 *）从值中选出所有匹配项。
 */
function selectPath(e, t = "") {
  let o = [e];
  for (let r of t.split(".").filter((s) => s !== "")) o = o.flatMap((s) => stepPathSegment(s, r));
  return o;
}
//@ chunk-3s7ydtfd.js:652-765 placement
/**
 * 工具结果的文本：字符串直接用，否则拼接 [].text，空时用默认值。
 */
function toolResultText(e, text = "") {
  return typeof e === "string"
    ? e || text
    : selectPath(e, "[].text").filter((r) => typeof r === "string").join(`
`) || text;
}
//@ chunk-3s7ydtfd.js:765-871 placement
/**
 * 工具调用记录转为 easel 用的 {id, tool, input, storedResult, text}。
 */
var toChartableToolUse = (e) => ({
  id: e.tool_use_id,
  tool: e.tool,
  input: e.input,
  storedResult: e.result,
  text: toolResultText(e.result, e.text),
});
//@ chunk-3s7ydtfd.js:871-993 placement
/**
 * 从消息列表收集所有有文本且非错误的工具调用。
 */
function collectToolUses(e) {
  return (Array.isArray(e) ? e.flatMap((o) => o.toolUses) : []).flatMap((o) =>
    o.text === undefined || o.isError ? [] : [toChartableToolUse(o)],
  );
}
//@ chunk-3s7ydtfd.js:993-1003 placement
/**
 * 24
 */
var BARS_DEFAULT_COUNT = 24;
//@ chunk-3s7ydtfd.js:1003-1012 placement
/**
 * 柱状图默认 4 个系列
 */
var COLUMNS_DEFAULT_SERIES = 4;
//@ chunk-3s7ydtfd.js:1012-1022 placement
/**
 * 迷你图默认 24 条
 */
var SPARKS_DEFAULT_SERIES = 24;
//@ chunk-3s7ydtfd.js:1022-1031 placement
/**
 * 折线/占比默认 8 个
 */
var LINE_DEFAULT_SERIES = 8;
//@ chunk-3s7ydtfd.js:1031-1041 placement
/**
 * 条形图最多 40 条
 */
var BARS_MAX_SERIES = 40;
//@ chunk-3s7ydtfd.js:1041-1050 placement
/**
 * 柱状图最多 4 个系列
 */
var COLUMNS_MAX_SERIES = 4;
//@ chunk-3s7ydtfd.js:1050-1060 placement
/**
 * 迷你图最多 40 条
 */
var SPARKS_MAX_SERIES = 40;
//@ chunk-3s7ydtfd.js:1060-1069 placement
/**
 * 3
 */
var MAX_COMBINED_SERIES = 3;
//@ chunk-3s7ydtfd.js:1069-1079 placement
/**
 * 10
 */
var MAX_EVENTS = 10;
//@ chunk-3s7ydtfd.js:1079-1471 placement
/**
 * 图表种类表：line、columns、sparks、bars、share 的名称、复数、默认/最大序列数。
 */
var CHART_FORMS = {
  line: {
    label: "line chart",
    plural: "series",
    defaultCount: LINE_DEFAULT_SERIES,
    maxCount: LINE_DEFAULT_SERIES,
  },
  columns: {
    label: "column chart",
    plural: "series",
    defaultCount: COLUMNS_DEFAULT_SERIES,
    maxCount: COLUMNS_MAX_SERIES,
  },
  sparks: {
    label: "sparklines",
    plural: "series",
    defaultCount: SPARKS_DEFAULT_SERIES,
    maxCount: SPARKS_MAX_SERIES,
  },
  bars: {
    label: "bar chart",
    plural: "bars",
    singular: "bar",
    defaultCount: BARS_DEFAULT_COUNT,
    maxCount: BARS_MAX_SERIES,
  },
  share: {
    label: "share bar",
    plural: "parts",
    singular: "part",
    defaultCount: LINE_DEFAULT_SERIES,
    maxCount: LINE_DEFAULT_SERIES,
  },
};
//@ chunk-3s7ydtfd.js:1471-1570 placement
/**
 * “N 单位(复数)”
 */
function formatCountWithUnit(form, t) {
  let { plural, singular = plural } = CHART_FORMS[form];
  return `${t.toLocaleString("en-US")} ${t === 1 ? singular : plural}`;
}
//@ chunk-3s7ydtfd.js:1570-1580 placement
/**
 * 40
 */
var MAX_FIELD_NAME_CHARS = 40;
//@ chunk-3s7ydtfd.js:1580-1590 placement
/**
 * 12
 */
var MAX_EVENTS_ON_CHART = 12;
//@ chunk-3s7ydtfd.js:1590-1634 placement
/**
 * 字符串数组 schema
 */
var STRING_ARRAY_SCHEMA = {
  type: "array",
  items: {
    type: "string",
  },
};
//@ chunk-3s7ydtfd.js:1634-4312 placement
/**
 * easel chart 工具的 JSON Schema（data、form、x、y、combine 等字段及说明）。
 */
var CHART_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    data: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "array",
          items: {
            type: "object",
          },
        },
      ],
      description:
        "Leave it out to chart the tool result just before this call, as it is: do not type a result again. Where it holds several tables, x and y pick the one with those columns. Or the id of an earlier result, as a refusal lists them. Or the table itself, as records or as text, only for numbers no tool returned.",
    },
    x: {
      type: "string",
      description: "the column along the chart: times, or the categories of bars",
    },
    form: {
      enum: ["line", "columns", "bars", "sparks", "share"],
      description:
        "if left out, a line over times and bars over names. line, columns and sparks need times in x: over names they are drawn as bars. columns stand on zero, one per day, month or other even step. sparks are a small row for each series, on one scale: for many series. bars are horizontal, one per category. share is the parts of a whole as one bar, what a pie shows: its values are summed",
    },
    y: {
      ...STRING_ARRAY_SCHEMA,
      description: `the value columns. Lines share a plot where they have one unit and their largest values are within ${MAX_EVENTS} times of each other, columns only where they stack. ${MAX_COMBINED_SERIES} plots at most, and the rest are named`,
    },
    by: {
      ...STRING_ARRAY_SCHEMA,
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
      description: `how many to draw: ${CHART_FORMS.bars.defaultCount} bars if left out and ${CHART_FORMS.bars.maxCount} at most, ${CHART_FORMS.line.maxCount} lines at most, ${CHART_FORMS.sparks.defaultCount} sparks and ${CHART_FORMS.sparks.maxCount} at most, ${CHART_FORMS.share.maxCount} parts of a share beside one for the rest, ${CHART_FORMS.columns.maxCount} series of columns where they stack, else ${MAX_COMBINED_SERIES}. The largest are kept, largest first, and the rest are counted`,
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
      maxItems: MAX_EVENTS_ON_CHART,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["at"],
        properties: {
          at: {
            type: "string",
            description: "a time, spelled as in x",
          },
          label: {
            type: "string",
            description: "short",
          },
        },
      },
      description: `events on a chart over time, ${MAX_EVENTS_ON_CHART} at most: a rule and a label each. One outside the times drawn is said instead`,
    },
    title: {
      type: "string",
      description: "short",
    },
  },
};
//@ chunk-3s7ydtfd.js:4312-4375 placement
/**
 * N 单数/复数
 */
var formatCount = (e, t) => `${e.toLocaleString("en-US")} ${e === 1 ? t : `${t}s`}`;
//@ chunk-3s7ydtfd.js:4375-4458 placement
/**
 * 列表截断加 “and N more”
 */
function elideList(e, t, o) {
  let r = e.length - t;
  return r > 0 ? [...e.slice(0, t), `and ${formatCount(r, o)}`] : e;
}
//@ chunk-3s7ydtfd.js:4458-4515 placement
/**
 * 各类宽空白
 */
var WIDE_SPACE_RE = /[\s\u{115F}\u{1160}\u{2800}\u{3164}\u{FFA0}]+/gu;
//@ chunk-3s7ydtfd.js:4515-4541 placement
/**
 * 结尾孤立代理项
 */
var LONE_SURROGATE_TAIL_RE = /[\uD800-\uDBFF]$/;
//@ chunk-3s7ydtfd.js:4541-4588 placement
/**
 * 从首个换行到结尾
 */
var LINE_BREAK_TAIL_RE = /\s*[\n\r\u{2028}\u{2029}\u0085][^]*$/u;
//@ chunk-3s7ydtfd.js:4588-4601 placement
/**
 * 连续空格
 */
var SPACES_RE = / +/g;
//@ chunk-3s7ydtfd.js:4601-4619 placement
/**
 * 纯 ASCII 可打印
 */
var ASCII_ONLY_RE = /^[ -~]*$/;
//@ chunk-3s7ydtfd.js:4619-4642 placement
/**
 * 字母或数字
 */
var ALNUM_RE = /[\p{L}\p{N}]/u;
//@ chunk-3s7ydtfd.js:4642-4678 placement
/**
 * 控制字符与变体选择符
 */
var CONTROL_OR_VS_RE = /[\p{C}\u{FE00}-\u{FE0F}]/gu;
//@ chunk-3s7ydtfd.js:4678-4751 placement
/**
 * 控制字符、标签字符与双向控制符
 */
var FORMAT_CONTROL_RE = /[\p{Cc}\u{E0000}-\u{E007F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
//@ chunk-3s7ydtfd.js:4751-4819 placement
/**
 * emoji 判断
 */
var EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u{20E3}/u;
//@ chunk-3s7ydtfd.js:4819-4895 placement
/**
 * 默认 emoji 呈现
 */
var EMOJI_PRESENTATION_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F}|\u{20E3}/u;
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
/**
 * "…"
 */
var ELLIPSIS = "\u2026";
//@ chunk-3s7ydtfd.js:5528-5596 placement
/**
 * 按码元截断且不切断代理对
 */
function truncateCodeUnitsSafe(e, t) {
  return e.length > t ? e.slice(0, t).replace(LONE_SURROGATE_TAIL_RE, "") + ELLIPSIS : e;
}
//@ chunk-3s7ydtfd.js:5596-5628 placement
/**
 * 英文字素分段器
 */
var graphemeSegmenter = new Intl.Segmenter("en");
//@ chunk-3s7ydtfd.js:5628-5714 placement
/**
 * 拆成字素（ASCII 直接按字符）
 */
function splitGraphemes(e) {
  return ASCII_ONLY_RE.test(e) ? e.split("") : Array.from(graphemeSegmenter.segment(e), (o) => o.segment);
}
//@ chunk-3s7ydtfd.js:5714-5725 placement
/**
 * 1.5
 */
var TRUNCATE_HEADROOM = 1.5;
//@ chunk-3s7ydtfd.js:5725-5736 placement
/**
 * 120
 */
var MAX_CELL_CHARS = 120;
//@ chunk-3s7ydtfd.js:5736-5745 placement
/**
 * 1
 */
var MIN_CELL_CHARS = 1;
//@ chunk-3s7ydtfd.js:5745-5754 placement
/**
 * 截断时给省略号预留的宽度
 */
var ELLIPSIS_CELLS = 2;
//@ chunk-3s7ydtfd.js:5754-5763 placement
/**
 * emoji 占 2 列
 */
var EMOJI_DISPLAY_WIDTH = 2;
//@ chunk-3s7ydtfd.js:5763-5772 placement
/**
 * 宽字符占 2 列
 */
var WIDE_CHAR_DISPLAY_WIDTH = 2;
//@ chunk-3s7ydtfd.js:5772-5816 placement
/**
 * 统计满足谓词的个数
 */
var countWhere = (e, t) => e.reduce((acc, r) => (t(r) ? acc + 1 : acc), 0);
//@ chunk-3s7ydtfd.js:5816-5852 placement
/**
 * 去重
 */
var uniqueValues = (e) => [...new Set(e).values()];
//@ chunk-3s7ydtfd.js:5852-6267 placement
function groupIndexBy(e, t) {
  let o = [];
  let r = [];
  for (let l of e) {
    o.push(l);
    r.push(t(l));
  }
  let s = [...new Set(r).values()];
  let p = new Map(s.map((l, u) => [l, u]));
  let mapped = r.map((l) => p.get(l) ?? 0);
  let mapped_2 = s.map(() => 0);
  for (let l of mapped) mapped_2[l] = (mapped_2[l] ?? 0) + 1;
  let a = [];
  let f = 0;
  for (let l of mapped_2) {
    a.push(f);
    f += l;
  }
  let i = [...a];
  let x = [...o];
  for (let [l, u] of o.entries()) {
    let d = mapped[l] ?? 0;
    let c = i[d] ?? 0;
    x[c] = u;
    i[d] = c + 1;
  }
  return new Map(
    s.map((l, u) => {
      let d = a[u] ?? 0;
      return [l, x.slice(d, d + (mapped_2[u] ?? 0))];
    }),
  );
}
//@ chunk-3s7ydtfd.js:6267-6314 placement
/**
 * 0..n-1 的数组
 */
var rangeIndices = (e) => [
  ...Array.from({
    length: e,
  }).keys(),
];
//@ chunk-3s7ydtfd.js:6314-6401 placement
/**
 * 前缀和（带部分与结尾）
 */
function prefixSums(parts, t, o) {
  let r = [];
  let end = o;
  for (let p of parts) {
    end += t(p);
    r.push({
      part: p,
      end,
    });
  }
  return r;
}
//@ chunk-3s7ydtfd.js:6401-6528 placement
/**
 * 求和；结果小到可视为浮点误差时返回 0。
 */
function stableSum(e) {
  let reduced = e.reduce((acc, s) => acc + s, 0);
  let reduced_2 = e.reduce((acc, s) => acc + Math.abs(s), 0);
  return Math.abs(reduced) > e.length * Number.EPSILON * reduced_2 ? reduced : 0;
}
//@ chunk-3s7ydtfd.js:6528-6616 placement
/**
 * 按预算取前缀
 */
function takeWhileBudget(e, t, displayWidth) {
  let r = [];
  let s = 0;
  for (let p of e) {
    s += displayWidth(p);
    if (s > t) break;
    r.push(p);
  }
  return r;
}
//@ chunk-3s7ydtfd.js:6616-6730 placement = returnValue (1)
function returnValue(e, t) {
  let o = [];
  let values = t.values();
  for (let s of e) {
    let p = values.next();
    if (p.done) break;
    o.push([s, p.value]);
  }
  return o;
}
//@ chunk-3s7ydtfd.js:6730-6884 placement
/**
 * 文本显示宽度（ASCII 快速路径，宽字符与特殊字素计 2）。
 */
function displayWidth(e) {
  if (ASCII_ONLY_RE.test(e)) return e.length;
  let o = 0;
  for (let r of splitGraphemes(e))
    if (EMOJI_PRESENTATION_RE.test(r)) o += EMOJI_DISPLAY_WIDTH;
    else for (let p of r) if (!regExp.test(p)) o += WIDE_CHAR_PATTERN.test(p) ? WIDE_CHAR_DISPLAY_WIDTH : 1;
  return o;
}
//@ chunk-3s7ydtfd.js:6884-7051 placement
/**
 * 超过宽度时保留首尾、中间用省略号截断。
 */
function truncateMiddle(e, t) {
  if (displayWidth(e) <= t) return e;
  if (t < MIN_CELL_CHARS) return "";
  let r = splitGraphemes(e);
  let s = Math.ceil((t - MIN_CELL_CHARS) / ELLIPSIS_CELLS);
  return (
    takeWhileBudget(r, s, displayWidth).join("") +
    ELLIPSIS +
    takeWhileBudget(r.toReversed(), t - MIN_CELL_CHARS - s, displayWidth)
      .toReversed()
      .join("")
  );
}
//@ chunk-3s7ydtfd.js:7051-7112 placement
/**
 * 去掉控制字符的字素
 */
function cleanGrapheme(e) {
  let matches = EMOJI_RE.test(e);
  return e.replace(matches ? FORMAT_CONTROL_RE : CONTROL_OR_VS_RE, "");
}
//@ chunk-3s7ydtfd.js:7112-7264 placement
/**
 * 清洗单元格文本：截断、替换控制字符与特殊空白后按宽度截断。
 */
function cleanCellText(e, t = MAX_CELL_CHARS) {
  let replaced = truncateCodeUnitsSafe(e, t * TRUNCATE_HEADROOM)
    .trim()
    .replace(LINE_BREAK_TAIL_RE, ELLIPSIS)
    .replace(WIDE_SPACE_RE, " ");
  let matches = ASCII_ONLY_RE.test(replaced);
  return truncateMiddle(
    (matches ? replaced : splitGraphemes(replaced).map(cleanGrapheme).join(""))
      .replace(SPACES_RE, " ")
      .trim(),
    t,
  );
}
//@ chunk-3s7ydtfd.js:7264-7413 placement
/**
 * 深拷贝对象并清洗其中所有字符串（相同字符串复用结果）。
 */
function cleanAllStrings(e) {
  let t = new Map();
  return JSON.parse(JSON.stringify(e), (o, r) => {
    if (typeof r !== "string") return r;
    let p = t.get(r) ?? cleanCellText(r);
    t.set(r, p);
    return p;
  });
}
//@ chunk-3s7ydtfd.js:7413-7462 placement
/**
 * 前缀省略号截断
 */
var ellipsisPrefix = (e, t) => `${ELLIPSIS}${[...e].slice(t).join("")}`;
//@ chunk-3s7ydtfd.js:7462-7677 placement
function measureLabelWidth(fullNames, t) {
  let [o = [], ...r] = fullNames.map((m) => [...m]);
  let s =
    o
      .slice(
        0,
        Math.max(
          0,
          o.findIndex((m, n) => r.some((a) => a[n] !== m)),
        ),
      )
      .findLastIndex((m) => !ALNUM_RE.test(m)) + 1;
  let p = s > 0 && fullNames.some((m) => displayWidth(m) > t);
  return fullNames.map((m) => truncateMiddle(p ? ellipsisPrefix(m, s) : m, t));
}
//@ chunk-3s7ydtfd.js:7677-7832 placement
/**
 * 按单词把文本折行到宽度 t（单词超长时截断）。
 */
function wrapToWidth(e, columns, o = columns) {
  let r = [""];
  for (let s of e.split(" ")) {
    let p = truncateMiddle(s, o);
    let m = `${r.at(-1)} ${p}`.trimStart();
    if (displayWidth(m) <= columns || m === p) r[r.length - 1] = m;
    else r.push(p);
  }
  return r;
}
//@ chunk-3s7ydtfd.js:7832-7877 placement
/**
 * 自有属性值或 undefined
 */
var ownOrUndefined = (properties, t) => (Object.hasOwn(properties, t) ? properties[t] : undefined);
//@ chunk-3s7ydtfd.js:7877-8069 placement
/**
 * 生成对象字段的校验错误映射函数（未知字段报 “is not a field”）。
 */
var fieldErrorsFor =
  (e) =>
  ([t, o]) => {
    let r = ownOrUndefined(e.properties, t);
    return r
      ? e.errorsAt(o, r, `${e.prefix}${t}`).map((s) => `${s} (${r.description})`)
      : [e.prefix + cleanCellText(t, MAX_FIELD_NAME_CHARS) + ` is not a field: those are ${e.fieldNames}`];
  };
//@ chunk-3s7ydtfd.js:8069-8106 placement
/**
 * null 或 typeof
 */
var valueKind = (e) => (e === null ? "null" : typeof e);
//@ chunk-3s7ydtfd.js:8106-8154 placement = isTextField (0.816)
var isTextField = (s) => (Number.isInteger(s) ? "integer" : valueKind(s));
//@ chunk-3s7ydtfd.js:8154-8197 placement
/**
 * array 或文本类型
 */
var schemaKindOf = (e) => (Array.isArray(e) ? "array" : isTextField(e));
//@ chunk-3s7ydtfd.js:8197-9049 placement
/**
 * 按简化 JSON Schema（anyOf/enum/type/minimum/maxItems/items/properties/required）校验值，返回错误信息列表。
 */
function validateAgainstSchema(e, t, o) {
  let { anyOf, items, properties, required = [] } = t;
  if (anyOf?.some((c) => validateAgainstSchema(e, c, o).length === 0)) return [];
  if (anyOf) return [`${o} must be ${anyOf.map((c) => c.type).join(" or ")}`];
  if (t.enum?.some((c) => c === e)) return [];
  if (t.enum) return [`${o} must be one of ${t.enum.join(", ")}`];
  let f = schemaKindOf(e);
  if (t.type !== f) return [`${o || "the call"} must be ${t.type}, not ${f}`];
  if (typeof e === "number" && e < (t.minimum ?? -1 / 0)) return [`${o} must be at least ${t.minimum}`];
  if (Array.isArray(e) && e.length > (t.maxItems ?? 1 / 0)) return [`${o} must hold at most ${t.maxItems}`];
  if (Array.isArray(e) && items) return e.flatMap((c, g) => validateAgainstSchema(c, items, `${o}[${g}]`));
  if (!(isPlainObject(e) && properties !== undefined)) return [];
  let d = o === "" ? "" : `${o}.`;
  return [
    ...required.filter((c) => !Object.hasOwn(e, c)).map((c) => `${d}${c} is missing`),
    ...Object.entries(e).flatMap(
      fieldErrorsFor({
        properties,
        prefix: d,
        fieldNames: Object.keys(properties).join(", "),
        errorsAt: validateAgainstSchema,
      }),
    ),
  ];
}
//@ chunk-3s7ydtfd.js:9049-9073 placement
/**
 * 校验图表输入
 */
var validateChartInput = (e) => validateAgainstSchema(e, CHART_INPUT_SCHEMA, "");
//@ chunk-3s7ydtfd.js:9073-9102 placement
/**
 * 图表输入是否合法
 */
var isValidChartInput = (e) => validateChartInput(e).length === 0;
export {
  stableSum,
  CHART_INPUT_SCHEMA,
  collectToolUses,
  selectPath,
  isPlainObject,
  cleanCellText,
  uniqueValues,
  returnValue,
  groupIndexBy,
  formatCount,
  rangeIndices,
  countWhere,
  cleanAllStrings,
  CHART_FORMS,
  truncateMiddle,
  elideList,
  formatCountWithUnit,
  MAX_EVENTS,
  MAX_COMBINED_SERIES,
  takeWhileBudget,
  displayWidth,
  measureLabelWidth,
  wrapToWidth,
  prefixSums,
  splitGraphemes,
  isValidChartInput,
  validateChartInput,
  toolResultText,
};
