/**
 * plugins/bundled/easel/chartSchema.ts
 *
 * 2.1.316 新增：easel 图表工具的输入模式与图表种类定义（line/columns/sparks/bars/share）、宽字符表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7stfs6p0.js (71)
 * attribution: placement 71
 */
import { __export } from "../../../../runtime/bun-runtime.js";
import { registerEasel } from "./easelPlugin.js";
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-7stfs6p0.js:227-237 placement
/**
 * 单位说明
 */
var UNIT_HINT = {};
//@ chunk-7stfs6p0.js:237-277 placement
__export(UNIT_HINT, {
  default: () => UNIT_HINT,
  register: () => registerEasel,
});
//@ chunk-7stfs6p0.js:277-337 placement
/**
 * 普通对象
 */
var isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
//@ chunk-7stfs6p0.js:337-542 placement
/**
 * JSON 路径的一步：[] 取数组全部元素，* 取对象全部值，其余按下标/键取。
 */
function stepPathSegment(current, segment) {
  if (segment === "[]") return Array.isArray(current) ? current : [];
  if (segment === "*") return isPlainObject(current) ? Object.values(current) : [];
  let isArrayIndex = Array.isArray(current) && current[Number(segment)] !== undefined;
  let isKey = isPlainObject(current) && current[segment] !== undefined;
  return isArrayIndex ? [current[Number(segment)]] : isKey ? [current[segment]] : [];
}
//@ chunk-7stfs6p0.js:542-652 placement
/**
 * 按点分 JSON 路径（支持 [] 与 *）从值中选出所有匹配项。
 */
function selectPath(value, path = "") {
  let nodes = [value];
  for (let segment of path.split(".").filter((part) => part !== ""))
    nodes = nodes.flatMap((node) => stepPathSegment(node, segment));
  return nodes;
}
//@ chunk-7stfs6p0.js:652-765 placement
/**
 * 工具结果的文本：字符串直接用，否则拼接 [].text，空时用默认值。
 */
function toolResultText(result, text = "") {
  return typeof result === "string"
    ? result || text
    : selectPath(result, "[].text").filter((text) => typeof text === "string").join(`
`) || text;
}
//@ chunk-7stfs6p0.js:765-871 placement
/**
 * 工具调用记录转为 easel 用的 {id, tool, input, storedResult, text}。
 */
var toChartableToolUse = (toolUse) => ({
  id: toolUse.tool_use_id,
  tool: toolUse.tool,
  input: toolUse.input,
  storedResult: toolUse.result,
  text: toolResultText(toolUse.result, toolUse.text),
});
//@ chunk-7stfs6p0.js:871-993 placement
/**
 * 从消息列表收集所有有文本且非错误的工具调用。
 */
function collectToolUses(messages) {
  return (Array.isArray(messages) ? messages.flatMap((message) => message.toolUses) : []).flatMap(
    (toolUse) => (toolUse.text === undefined || toolUse.isError ? [] : [toChartableToolUse(toolUse)]),
  );
}
//@ chunk-7stfs6p0.js:993-1003 placement
/**
 * 24
 */
var BARS_DEFAULT_COUNT = 24;
//@ chunk-7stfs6p0.js:1003-1012 placement
/**
 * 柱状图默认 4 个系列
 */
var COLUMNS_DEFAULT_SERIES = 4;
//@ chunk-7stfs6p0.js:1012-1022 placement
/**
 * 迷你图默认 24 条
 */
var SPARKS_DEFAULT_SERIES = 24;
//@ chunk-7stfs6p0.js:1022-1031 placement
/**
 * 折线/占比默认 8 个
 */
var LINE_DEFAULT_SERIES = 8;
//@ chunk-7stfs6p0.js:1031-1041 placement
/**
 * 条形图最多 40 条
 */
var BARS_MAX_SERIES = 40;
//@ chunk-7stfs6p0.js:1041-1050 placement
/**
 * 柱状图最多 4 个系列
 */
var COLUMNS_MAX_SERIES = 4;
//@ chunk-7stfs6p0.js:1050-1060 placement
/**
 * 迷你图最多 40 条
 */
var SPARKS_MAX_SERIES = 40;
//@ chunk-7stfs6p0.js:1060-1069 placement
/**
 * 3
 */
var MAX_COMBINED_SERIES = 3;
//@ chunk-7stfs6p0.js:1069-1079 placement
/**
 * 10
 */
var MAX_EVENTS = 10;
//@ chunk-7stfs6p0.js:1079-1471 placement
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
//@ chunk-7stfs6p0.js:1471-1570 placement
/**
 * “N 单位(复数)”
 */
function formatCountWithUnit(form, count) {
  let { plural, singular = plural } = CHART_FORMS[form];
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}
//@ chunk-7stfs6p0.js:1570-1580 placement
/**
 * 40
 */
var MAX_FIELD_NAME_CHARS = 40;
//@ chunk-7stfs6p0.js:1580-1590 placement
/**
 * 12
 */
var MAX_EVENTS_ON_CHART = 12;
//@ chunk-7stfs6p0.js:1590-1634 placement
/**
 * 字符串数组 schema
 */
var STRING_ARRAY_SCHEMA = {
  type: "array",
  items: {
    type: "string",
  },
};
//@ chunk-7stfs6p0.js:1634-4312 placement
/**
 * easel chart 工具的 JSON Schema（data、form、x、y、combine 等字段及说明）。
 */
var CHART_INPUT_SCHEMA; // deferred: uses STRING_ARRAY_SCHEMA of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7stfs6p0.js:1634", () => {
  CHART_INPUT_SCHEMA = {
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
});
//@ chunk-7stfs6p0.js:4312-4375 placement
/**
 * N 单数/复数
 */
var formatCount = (count, unit) => `${count.toLocaleString("en-US")} ${count === 1 ? unit : `${unit}s`}`;
//@ chunk-7stfs6p0.js:4375-4458 placement
/**
 * 列表截断加 “and N more”
 */
function elideList(items, limit, unit) {
  let restCount = items.length - limit;
  return restCount > 0 ? [...items.slice(0, limit), `and ${formatCount(restCount, unit)}`] : items;
}
//@ chunk-7stfs6p0.js:4458-4515 placement
/**
 * 各类宽空白
 */
var WIDE_SPACE_RE = /[\s\u{115F}\u{1160}\u{2800}\u{3164}\u{FFA0}]+/gu;
//@ chunk-7stfs6p0.js:4515-4541 placement
/**
 * 结尾孤立代理项
 */
var LONE_SURROGATE_TAIL_RE = /[\uD800-\uDBFF]$/;
//@ chunk-7stfs6p0.js:4541-4588 placement
/**
 * 从首个换行到结尾
 */
var LINE_BREAK_TAIL_RE = /\s*[\n\r\u{2028}\u{2029}\u0085][^]*$/u;
//@ chunk-7stfs6p0.js:4588-4601 placement
/**
 * 连续空格
 */
var SPACES_RE = / +/g;
//@ chunk-7stfs6p0.js:4601-4619 placement
/**
 * 纯 ASCII 可打印
 */
var ASCII_ONLY_RE = /^[ -~]*$/;
//@ chunk-7stfs6p0.js:4619-4642 placement
/**
 * 字母或数字
 */
var ALNUM_RE = /[\p{L}\p{N}]/u;
//@ chunk-7stfs6p0.js:4642-4678 placement
/**
 * 控制字符与变体选择符
 */
var CONTROL_OR_VS_RE = /[\p{C}\u{FE00}-\u{FE0F}]/gu;
//@ chunk-7stfs6p0.js:4678-4751 placement
/**
 * 控制字符、标签字符与双向控制符
 */
var FORMAT_CONTROL_RE = /[\p{Cc}\u{E0000}-\u{E007F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
//@ chunk-7stfs6p0.js:4751-4819 placement
/**
 * emoji 判断
 */
var EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u{20E3}/u;
//@ chunk-7stfs6p0.js:4819-4895 placement
/**
 * 默认 emoji 呈现
 */
var EMOJI_PRESENTATION_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F}|\u{20E3}/u;
//@ chunk-7stfs6p0.js:4895-5349 placement
var WIDE_CHAR_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7stfs6p0.js:4895", () => {
  WIDE_CHAR_PATTERN = new RegExp(
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
});
//@ chunk-7stfs6p0.js:5349-5512 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7stfs6p0.js:5349", () => {
  regExp = new RegExp(
    "[" +
      String.raw`\p{Mn}\p{Me}\u{1160}-\u{11FF}\u{200B}-\u{200F}` +
      String.raw`\u{D7B0}-\u{D7FB}` +
      "]|" +
      String.raw`(?=[\u{0900}-\u{0D63}])\p{Mc}`,
    "u",
  );
});
//@ chunk-7stfs6p0.js:5512-5528 placement
/**
 * "…"
 */
var ELLIPSIS = "\u2026";
//@ chunk-7stfs6p0.js:5528-5596 placement
/**
 * 按码元截断且不切断代理对
 */
function truncateCodeUnitsSafe(text, maxChars) {
  return text.length > maxChars
    ? text.slice(0, maxChars).replace(LONE_SURROGATE_TAIL_RE, "") + ELLIPSIS
    : text;
}
//@ chunk-7stfs6p0.js:5596-5628 placement
/**
 * 英文字素分段器
 */
var graphemeSegmenter; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7stfs6p0.js:5596", () => {
  graphemeSegmenter = new Intl.Segmenter("en");
});
//@ chunk-7stfs6p0.js:5628-5714 placement
/**
 * 拆成字素（ASCII 直接按字符）
 */
function splitGraphemes(text) {
  return ASCII_ONLY_RE.test(text)
    ? text.split("")
    : Array.from(graphemeSegmenter.segment(text), (grapheme) => grapheme.segment);
}
//@ chunk-7stfs6p0.js:5714-5725 placement
/**
 * 1.5
 */
var TRUNCATE_HEADROOM = 1.5;
//@ chunk-7stfs6p0.js:5725-5736 placement
/**
 * 120
 */
var MAX_CELL_CHARS = 120;
//@ chunk-7stfs6p0.js:5736-5745 placement
/**
 * 1
 */
var MIN_CELL_CHARS = 1;
//@ chunk-7stfs6p0.js:5745-5754 placement
/**
 * 截断时给省略号预留的宽度
 */
var ELLIPSIS_CELLS = 2;
//@ chunk-7stfs6p0.js:5754-5763 placement
/**
 * emoji 占 2 列
 */
var EMOJI_DISPLAY_WIDTH = 2;
//@ chunk-7stfs6p0.js:5763-5772 placement
/**
 * 宽字符占 2 列
 */
var WIDE_CHAR_DISPLAY_WIDTH = 2;
//@ chunk-7stfs6p0.js:5772-5816 placement
/**
 * 统计满足谓词的个数
 */
var countWhere = (items, predicate) => items.reduce((acc, item) => (predicate(item) ? acc + 1 : acc), 0);
//@ chunk-7stfs6p0.js:5816-5852 placement
/**
 * 去重
 */
var uniqueValues = (values) => [...new Set(values).values()];
//@ chunk-7stfs6p0.js:5852-6267 placement
function groupIndexBy(items, keyOf) {
  let values = [];
  let keys = [];
  for (let item of items) {
    values.push(item);
    keys.push(keyOf(item));
  }
  let uniqueKeys = [...new Set(keys).values()];
  let groupIndexOf = new Map(uniqueKeys.map((key, index) => [key, index]));
  let mapped = keys.map((key) => groupIndexOf.get(key) ?? 0);
  let mapped_2 = uniqueKeys.map(() => 0);
  for (let groupIndex of mapped) mapped_2[groupIndex] = (mapped_2[groupIndex] ?? 0) + 1;
  let offsets = [];
  let running = 0;
  for (let count of mapped_2) {
    offsets.push(running);
    running += count;
  }
  let cursors = [...offsets];
  let ordered = [...values];
  for (let [index, value] of values.entries()) {
    let groupIndex = mapped[index] ?? 0;
    let slot = cursors[groupIndex] ?? 0;
    ordered[slot] = value;
    cursors[groupIndex] = slot + 1;
  }
  return new Map(
    uniqueKeys.map((key, groupIndex) => {
      let start = offsets[groupIndex] ?? 0;
      return [key, ordered.slice(start, start + (mapped_2[groupIndex] ?? 0))];
    }),
  );
}
//@ chunk-7stfs6p0.js:6267-6314 placement
/**
 * 0..n-1 的数组
 */
var rangeIndices = (count) => [
  ...Array.from({
    length: count,
  }).keys(),
];
//@ chunk-7stfs6p0.js:6314-6401 placement
/**
 * 前缀和（带部分与结尾）
 */
function prefixSums(parts, widthOf, start) {
  let out = [];
  let end = start;
  for (let part of parts) {
    end += widthOf(part);
    out.push({
      part,
      end,
    });
  }
  return out;
}
//@ chunk-7stfs6p0.js:6401-6528 placement
/**
 * 求和；结果小到可视为浮点误差时返回 0。
 */
function stableSum(values) {
  let reduced = values.reduce((acc, value) => acc + value, 0);
  let reduced_2 = values.reduce((acc, value) => acc + Math.abs(value), 0);
  return Math.abs(reduced) > values.length * Number.EPSILON * reduced_2 ? reduced : 0;
}
//@ chunk-7stfs6p0.js:6528-6616 placement
/**
 * 按预算取前缀
 */
function takeWhileBudget(items, budget, displayWidth) {
  let taken = [];
  let used = 0;
  for (let item of items) {
    used += displayWidth(item);
    if (used > budget) break;
    taken.push(item);
  }
  return taken;
}
//@ chunk-7stfs6p0.js:6616-6730 placement (2.1.88 match: returnValue, 1)
function returnValue(keys, values) {
  let pairs = [];
  let values_2 = values.values();
  for (let key of keys) {
    let next = values_2.next();
    if (next.done) break;
    pairs.push([key, next.value]);
  }
  return pairs;
}
//@ chunk-7stfs6p0.js:6730-6884 placement
/**
 * 文本显示宽度（ASCII 快速路径，宽字符与特殊字素计 2）。
 */
function displayWidth(text) {
  if (ASCII_ONLY_RE.test(text)) return text.length;
  let width = 0;
  for (let grapheme of splitGraphemes(text))
    if (EMOJI_PRESENTATION_RE.test(grapheme)) width += EMOJI_DISPLAY_WIDTH;
    else
      for (let char of grapheme)
        if (!regExp.test(char)) width += WIDE_CHAR_PATTERN.test(char) ? WIDE_CHAR_DISPLAY_WIDTH : 1;
  return width;
}
//@ chunk-7stfs6p0.js:6884-7051 placement
/**
 * 超过宽度时保留首尾、中间用省略号截断。
 */
function truncateMiddle(text, maxWidth) {
  if (displayWidth(text) <= maxWidth) return text;
  if (maxWidth < MIN_CELL_CHARS) return "";
  let graphemes = splitGraphemes(text);
  let headWidth = Math.ceil((maxWidth - MIN_CELL_CHARS) / ELLIPSIS_CELLS);
  return (
    takeWhileBudget(graphemes, headWidth, displayWidth).join("") +
    ELLIPSIS +
    takeWhileBudget(graphemes.toReversed(), maxWidth - MIN_CELL_CHARS - headWidth, displayWidth)
      .toReversed()
      .join("")
  );
}
//@ chunk-7stfs6p0.js:7051-7112 placement
/**
 * 去掉控制字符的字素
 */
function cleanGrapheme(grapheme) {
  let matches = EMOJI_RE.test(grapheme);
  return grapheme.replace(matches ? FORMAT_CONTROL_RE : CONTROL_OR_VS_RE, "");
}
//@ chunk-7stfs6p0.js:7112-7264 placement
/**
 * 清洗单元格文本：截断、替换控制字符与特殊空白后按宽度截断。
 */
function cleanCellText(text, maxChars = MAX_CELL_CHARS) {
  let replaced = truncateCodeUnitsSafe(text, maxChars * TRUNCATE_HEADROOM)
    .trim()
    .replace(LINE_BREAK_TAIL_RE, ELLIPSIS)
    .replace(WIDE_SPACE_RE, " ");
  let matches = ASCII_ONLY_RE.test(replaced);
  return truncateMiddle(
    (matches ? replaced : splitGraphemes(replaced).map(cleanGrapheme).join(""))
      .replace(SPACES_RE, " ")
      .trim(),
    maxChars,
  );
}
//@ chunk-7stfs6p0.js:7264-7413 placement
/**
 * 深拷贝对象并清洗其中所有字符串（相同字符串复用结果）。
 */
function cleanAllStrings(value) {
  let cache = new Map();
  return JSON.parse(JSON.stringify(value), (key, value) => {
    if (typeof value !== "string") return value;
    let cleaned = cache.get(value) ?? cleanCellText(value);
    cache.set(value, cleaned);
    return cleaned;
  });
}
//@ chunk-7stfs6p0.js:7413-7462 placement
/**
 * 前缀省略号截断
 */
var ellipsisPrefix = (text, count) => `${ELLIPSIS}${[...text].slice(count).join("")}`;
//@ chunk-7stfs6p0.js:7462-7677 placement
function measureLabelWidth(fullNames, maxWidth) {
  let [first = [], ...rest] = fullNames.map((name) => [...name]);
  let commonChars =
    first
      .slice(
        0,
        Math.max(
          0,
          first.findIndex((char, index) => rest.some((other) => other[index] !== char)),
        ),
      )
      .findLastIndex((char) => !ALNUM_RE.test(char)) + 1;
  let needsPrefix = commonChars > 0 && fullNames.some((name) => displayWidth(name) > maxWidth);
  return fullNames.map((name) =>
    truncateMiddle(needsPrefix ? ellipsisPrefix(name, commonChars) : name, maxWidth),
  );
}
//@ chunk-7stfs6p0.js:7677-7832 placement
/**
 * 按单词把文本折行到宽度 t（单词超长时截断）。
 */
function wrapToWidth(text, maxWidth, wordWidth = maxWidth) {
  let lines = [""];
  for (let word of text.split(" ")) {
    let trimmedWord = truncateMiddle(word, wordWidth);
    let candidate = `${lines.at(-1)} ${trimmedWord}`.trimStart();
    if (displayWidth(candidate) <= maxWidth || candidate === trimmedWord) lines[lines.length - 1] = candidate;
    else lines.push(trimmedWord);
  }
  return lines;
}
//@ chunk-7stfs6p0.js:7832-7877 placement
/**
 * 自有属性值或 undefined
 */
var ownOrUndefined = (properties, key) => (Object.hasOwn(properties, key) ? properties[key] : undefined);
//@ chunk-7stfs6p0.js:7877-8069 placement
/**
 * 生成对象字段的校验错误映射函数（未知字段报 “is not a field”）。
 */
var fieldErrorsFor =
  (context) =>
  ([key, value]) => {
    let fieldSchema = ownOrUndefined(context.properties, key);
    return fieldSchema
      ? context
          .errorsAt(value, fieldSchema, `${context.prefix}${key}`)
          .map((error) => `${error} (${fieldSchema.description})`)
      : [
          context.prefix +
            cleanCellText(key, MAX_FIELD_NAME_CHARS) +
            ` is not a field: those are ${context.fieldNames}`,
        ];
  };
//@ chunk-7stfs6p0.js:8069-8106 placement
/**
 * null 或 typeof
 */
var valueKind = (value) => (value === null ? "null" : typeof value);
//@ chunk-7stfs6p0.js:8106-8154 placement (2.1.88 match: isTextField, 0.816)
var isTextField = (s) => (Number.isInteger(s) ? "integer" : valueKind(s));
//@ chunk-7stfs6p0.js:8154-8197 placement
/**
 * array 或文本类型
 */
var schemaKindOf = (schema) => (Array.isArray(schema) ? "array" : isTextField(schema));
//@ chunk-7stfs6p0.js:8197-9049 placement
/**
 * 按简化 JSON Schema（anyOf/enum/type/minimum/maxItems/items/properties/required）校验值，返回错误信息列表。
 */
function validateAgainstSchema(value, schema, path) {
  let { anyOf, items, properties, required = [] } = schema;
  if (anyOf?.some((option) => validateAgainstSchema(value, option, path).length === 0)) return [];
  if (anyOf) return [`${path} must be ${anyOf.map((option) => option.type).join(" or ")}`];
  if (schema.enum?.some((enumValue) => enumValue === value)) return [];
  if (schema.enum) return [`${path} must be one of ${schema.enum.join(", ")}`];
  let kind = schemaKindOf(value);
  if (schema.type !== kind) return [`${path || "the call"} must be ${schema.type}, not ${kind}`];
  if (typeof value === "number" && value < (schema.minimum ?? -1 / 0))
    return [`${path} must be at least ${schema.minimum}`];
  if (Array.isArray(value) && value.length > (schema.maxItems ?? 1 / 0))
    return [`${path} must hold at most ${schema.maxItems}`];
  if (Array.isArray(value) && items)
    return value.flatMap((item, index) => validateAgainstSchema(item, items, `${path}[${index}]`));
  if (!(isPlainObject(value) && properties !== undefined)) return [];
  let prefix = path === "" ? "" : `${path}.`;
  return [
    ...required.filter((key) => !Object.hasOwn(value, key)).map((key) => `${prefix}${key} is missing`),
    ...Object.entries(value).flatMap(
      fieldErrorsFor({
        properties,
        prefix,
        fieldNames: Object.keys(properties).join(", "),
        errorsAt: validateAgainstSchema,
      }),
    ),
  ];
}
//@ chunk-7stfs6p0.js:9049-9073 placement
/**
 * 校验图表输入
 */
var validateChartInput = (input) => validateAgainstSchema(input, CHART_INPUT_SCHEMA, "");
//@ chunk-7stfs6p0.js:9073-9102 placement
/**
 * 图表输入是否合法
 */
var isValidChartInput = (input) => validateChartInput(input).length === 0;

// The import cycle this module closes (7 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/plugins/bundled/easel/chartSchema.js");
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
  UNIT_HINT,
};
