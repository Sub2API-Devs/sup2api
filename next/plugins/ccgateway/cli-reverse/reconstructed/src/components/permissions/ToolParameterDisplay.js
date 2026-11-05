/**
 * components/permissions/ToolParameterDisplay.tsx
 *
 * 2.1.316 新增：权限对话框中的工具参数卡片与格式化
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8prszgkd.js (21)
 * attribution: placement 20, layout 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidthNoEllipsis, truncateStartToWidth, truncateToWidth } from "../../utils/format.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import {
  needsGutter,
  markBrokenSequences,
  uniqueDisplayNames,
  stripUnsafeChars,
  hasDisplayUnsafeChar,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { Blockquote } from "../Blockquote.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { describeUnparsedInput } from "../../utils/json.js";
import { GRAPHEME_TRUNCATION_MARKER_RE } from "../../utils/truncateGraphemes.js";
import { slackChannelUrl } from "../../tools/MCPTool/slackSend.js";
import { languageSubLanguageMap } from "../../utils/highlight/boundedHighlight.js";
import { canonicalLanguageName } from "../../utils/highlight/pluginLanguages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8prszgkd.js:34713-34717 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:34713", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:37418-37422 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:37418", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:39530-39581 placement
function isValueStyle(parameter) {
  let { style } = parameter;
  return style === "value";
}
//@ chunk-8prszgkd.js:39581-39632 placement
function isNotValueStyle(parameter) {
  let { style } = parameter;
  return style !== "value";
}
//@ chunk-8prszgkd.js:39632-39720 placement
function renderParameterText(parameter, key) {
  let { text, style } = parameter;
  return jsxProd_default(
    Text,
    {
      bold: style === "question",
      children: text,
    },
    key,
  );
}
//@ chunk-8prszgkd.js:39720-39803 placement
function renderParameterValue(parameter, index) {
  let { text } = parameter;
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children: text,
    },
    `value-${index}`,
  );
}
//@ chunk-8prszgkd.js:39803-40054 placement
var PARAM_DISPLAY_LIMITS = 12;
var VALUE_WRAP_WIDTH = 60;
var MAX_PARAMETER_VALUE_CHARS = PARAM_DISPLAY_LIMITS * VALUE_WRAP_WIDTH;
var PARAMETER_VALUE_MAX_LINES = 4;
var ARTIFACT_LINK_RE =
  /^(?:replacing|source|into|type|artifact)(?: \d+)?: https?:\/\/[^\s/]+\/(?:[^\s/]+\/)*(?:artifact|frame)\/(?:[A-Za-z0-9_-]*-)?(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[A-Za-z0-9_-]{22})\/?$/;
//@ chunk-8prszgkd.js:40054-40143 placement
function truncateMiddle(text, width) {
  if (bunStringWidth(text) <= width) return text;
  let head = truncateToWidthNoEllipsis(text, Math.floor(width / 2));
  return head + truncateStartToWidth(text, width - bunStringWidth(head));
}
//@ chunk-8prszgkd.js:40143-40734 placement
function cardHeaderRows(header, columns) {
  let max = Math.max(1, columns);
  let rows = [
    ...(header.question === undefined
      ? []
      : [
          {
            text: header.question,
            style: "question",
          },
        ]),
    ...header.lines.map((text) => ({
      text,
      style: "line",
    })),
    ...header.values.map((text) => ({
      text,
      style: "value",
    })),
  ];
  let titleRow = -1;
  let flattened = rows.flatMap(({ text, style }) => {
    let text_2 = text.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
    let valueRow = style === "value" ? (titleRow += 1) : undefined;
    return style === "value" && !ARTIFACT_LINK_RE.test(text_2)
      ? [
          {
            text: truncateMiddle(text_2, max),
            style,
            value: valueRow,
          },
        ]
      : wrapAnsi(style === "value" ? text_2 : text, max, {
          trim: true,
          hard: true,
        })
          .split(
            `
`,
          )
          .map((line) => ({
            text: truncateToWidth(line, max),
            style,
            ...(valueRow !== undefined && {
              value: valueRow,
            }),
          }));
  });
  return {
    rows: flattened,
    gutter:
      header.values.length > 0 ||
      header.lines.length > 0 ||
      flattened.length > rows.length ||
      rows.some(({ text }) => needsGutter(text)),
  };
}
//@ chunk-8prszgkd.js:40734-42106 placement
/**
 * 权限对话框中以卡片形式展示工具参数行（问题、字段、代码块）。
 */
function ParameterCard(props) {
  let $ = useMemoCache(31);
  let { card } = props;
  if (card.rows.length === 0) {
    return null;
  }
  let BoxComponent;
  let BlockquoteComponent;
  let outerBoxComponent;
  let hiddenValueCount;
  let flexDirection;
  let nonValueRows;
  let moreLinesNode;
  let valueRows;
  let multiline;
  let flexDirection_2;
  if ($[0] !== card.gutter || $[1] !== card.rows) {
    let filtered = card.rows.filter(isValueStyle);
    let filtered_2 = card.rows.filter(isNotValueStyle);
    let fitsAll = card.rows.length <= PARAM_DISPLAY_LIMITS;
    let shownValues = filtered;
    if (!fitsAll) {
      let limit = PARAM_DISPLAY_LIMITS - 3;
      let idx = 0;
      while (idx < filtered.length) {
        let value = filtered[idx].value;
        let end = idx;
        while (end < filtered.length && filtered[end].value === value) end = end + 1;
        if (end > limit) {
          break;
        }
        idx = end;
      }
      shownValues = filtered.slice(0, idx);
    }
    hiddenValueCount = filtered.length - shownValues.length;
    let remaining = PARAM_DISPLAY_LIMITS - 1 - shownValues.length - (hiddenValueCount > 0 ? 1 : 0);
    let shownOthers = fitsAll ? filtered_2 : filtered_2.slice(0, Math.max(1, remaining));
    let hiddenOtherCount = filtered_2.length - shownOthers.length;
    outerBoxComponent = Box;
    flexDirection_2 = "column";
    BlockquoteComponent = Blockquote;
    multiline = card.gutter;
    BoxComponent = Box;
    flexDirection = "column";
    nonValueRows = shownOthers.map(renderParameterText);
    if ($[12] !== hiddenOtherCount) {
      moreLinesNode =
        hiddenOtherCount > 0 &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["\u2026 (+", hiddenOtherCount, " more lines)"],
        });
      $[12] = hiddenOtherCount;
      $[13] = moreLinesNode;
    } else moreLinesNode = $[13];
    valueRows = shownValues.map(renderParameterValue);
    $[0] = card.gutter;
    $[1] = card.rows;
    $[2] = BoxComponent;
    $[3] = BlockquoteComponent;
    $[4] = outerBoxComponent;
    $[5] = hiddenValueCount;
    $[6] = flexDirection;
    $[7] = nonValueRows;
    $[8] = moreLinesNode;
    $[9] = valueRows;
    $[10] = multiline;
    $[11] = flexDirection_2;
  } else {
    BoxComponent = $[2];
    BlockquoteComponent = $[3];
    outerBoxComponent = $[4];
    hiddenValueCount = $[5];
    flexDirection = $[6];
    nonValueRows = $[7];
    moreLinesNode = $[8];
    valueRows = $[9];
    multiline = $[10];
    flexDirection_2 = $[11];
  }
  let moreValuesNode;
  if ($[14] !== hiddenValueCount) {
    moreValuesNode =
      hiddenValueCount > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["\u2026 (+", hiddenValueCount, " more lines)"],
      });
    $[14] = hiddenValueCount;
    $[15] = moreValuesNode;
  } else moreValuesNode = $[15];
  let children;
  if (
    $[16] !== BoxComponent ||
    $[17] !== flexDirection ||
    $[18] !== nonValueRows ||
    $[19] !== moreLinesNode ||
    $[20] !== valueRows ||
    $[21] !== moreValuesNode
  ) {
    children = jsxProd_default_2(BoxComponent, {
      flexDirection,
      children: [nonValueRows, moreLinesNode, valueRows, moreValuesNode],
    });
    $[16] = BoxComponent;
    $[17] = flexDirection;
    $[18] = nonValueRows;
    $[19] = moreLinesNode;
    $[20] = valueRows;
    $[21] = moreValuesNode;
    $[22] = children;
  } else children = $[22];
  let children_2;
  if ($[23] !== BlockquoteComponent || $[24] !== multiline || $[25] !== children) {
    children_2 = jsxProd_default(BlockquoteComponent, {
      multiline,
      children,
    });
    $[23] = BlockquoteComponent;
    $[24] = multiline;
    $[25] = children;
    $[26] = children_2;
  } else children_2 = $[26];
  let cardElement;
  if ($[27] !== outerBoxComponent || $[28] !== flexDirection_2 || $[29] !== children_2) {
    cardElement = jsxProd_default(outerBoxComponent, {
      flexDirection: flexDirection_2,
      children: children_2,
    });
    $[27] = outerBoxComponent;
    $[28] = flexDirection_2;
    $[29] = children_2;
    $[30] = cardElement;
  } else cardElement = $[30];
  return cardElement;
}
//@ chunk-8prszgkd.js:42106-42110 layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:42106", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:42110-42155 placement
var MAX_TOOL_INPUT_CHARS = 200000;
var DEFAULT_TOOL_INPUT_LIMIT = MAX_TOOL_INPUT_CHARS;
var SMALL_INPUT_CHARS = 1e4;
var SMALL_INPUT_LINES = 1000;
var LARGE_INPUT_CHARS = 200000;
//@ chunk-8prszgkd.js:42155-42212 placement
function isShortString(value) {
  return typeof value === "string" && value.length <= 256;
}
//@ chunk-8prszgkd.js:42212-42345 placement
var PARAM_VALUE_MAX_WIDTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CHANNEL_PARAM_KEYS;
var TIMESTAMP_PARAM_KEYS;
var SLACK_TS_RE;
var YEAR_RE;
var CLOCK_TIME_RE;
deferInit("chunk-8prszgkd.js:42212", () => {
  PARAM_VALUE_MAX_WIDTH = 80;
  CHANNEL_PARAM_KEYS = new Set(["channel_id", "channel"]);
  TIMESTAMP_PARAM_KEYS = new Set(["ts", "thread_ts"]);
  SLACK_TS_RE = /^\d{10}\.\d{6}$/;
  YEAR_RE = /\b\d{4}\b/;
  CLOCK_TIME_RE = /\d{1,2}:\d{2}/;
});
//@ chunk-8prszgkd.js:42345-42428 placement
function fitsInline(label, value, hint, columns) {
  return (
    bunStringWidth(label) + 2 + bunStringWidth(value) + (hint === undefined ? 0 : bunStringWidth(hint) + 3) <=
    Math.min(PARAM_VALUE_MAX_WIDTH, columns - 2)
  );
}
//@ chunk-8prszgkd.js:42428-42438 placement
var INLINE_LABEL_MAX = 64;
//@ chunk-8prszgkd.js:42438-44401 placement
/**
 * 把工具参数值格式化为限长的显示文本（字符串、数组、对象递归截断）。
 */
function formatParamValue(
  value,
  depth,
  level = 0,
  budget = {
    remaining: SMALL_INPUT_CHARS,
    unitsRemaining: MAX_TOOL_INPUT_CHARS,
  },
) {
  if (typeof value === "string") {
    if (value.length + 2 > budget.unitsRemaining) throw Error("value exceeds the units display budget");
    let quoted = jsonStringify(value);
    budget.unitsRemaining -= quoted.length;
    if (budget.unitsRemaining < 0) throw Error("value exceeds the units display budget");
    return quoted;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    let primitive = String(value);
    budget.unitsRemaining -= primitive.length;
    if (budget.unitsRemaining < 0) throw Error("value exceeds the units display budget");
    return primitive;
  }
  if (level >= INLINE_LABEL_MAX) throw Error("value exceeds the display depth bound");
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    let length = value.length;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0)
      throw Error("value exceeds the element display budget");
    budget.remaining -= length;
    if (budget.remaining < 0) throw Error("value exceeds the element display budget");
    let parts = [];
    for (let index = 0; index < length; index++)
      parts.push(formatParamValue(value[index], depth + 1, level + 1, budget));
    if (
      parts.every(
        (part) =>
          !part.includes(`
`),
      )
    ) {
      let inline = `[${parts.join(", ")}]`;
      if (bunStringWidth(inline) <= PARAM_VALUE_MAX_WIDTH) return inline;
    }
    let innerIndent = "  ".repeat(depth + 1);
    let outerIndent = "  ".repeat(depth);
    return `[
${parts.map((part) => innerIndent + part).join(`,
`)}
${outerIndent}]`;
  }
  if (typeof value === "object") {
    let entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    budget.remaining -= entries.length;
    if (budget.remaining < 0) throw Error("value exceeds the element display budget");
    for (let [key] of entries) {
      if (key.length > LARGE_INPUT_CHARS) throw Error("nested key exceeds the display bound");
      if (key.length > budget.unitsRemaining) throw Error("keys exceed the units display budget");
      if (markBrokenSequences(key) !== key) throw Error("nested key display would drop code points");
      budget.unitsRemaining -= key.length;
    }
    let displayNames = uniqueDisplayNames(entries.map(([key]) => key));
    for (let [key] of entries) {
      let displayName = displayNames.get(key) ?? key;
      if (displayName.length > key.length) {
        budget.unitsRemaining -= displayName.length - key.length;
        if (budget.unitsRemaining < 0) throw Error("keys exceed the units display budget");
      }
    }
    let mapped = entries.map(
      ([key, nested]) =>
        `${displayNames.get(key) ?? key}: ${formatParamValue(nested, depth + 1, level + 1, budget)}`,
    );
    if (
      mapped.every(
        (line) =>
          !line.includes(`
`),
      )
    ) {
      let inline = `{ ${mapped.join(", ")} }`;
      if (bunStringWidth(inline) <= PARAM_VALUE_MAX_WIDTH) return inline;
    }
    let innerIndent = "  ".repeat(depth + 1);
    let outerIndent = "  ".repeat(depth);
    return `{
${mapped.map((line) => innerIndent + line).join(`,
`)}
${outerIndent}}`;
  }
  if (typeof value === "bigint") throw Error("bigint value cannot be rendered");
  return "undefined";
}
//@ chunk-8prszgkd.js:44401-44509 placement
var ISO_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:[Zz]|[+-]\d{2}:?\d{2})?$/;
//@ chunk-8prszgkd.js:44509-45389 placement
function parseLineRange(range) {
  let trimmed = range.trim();
  let match = trimmed.match(ISO_DATETIME_RE);
  if (!match) return null;
  let startLine = Number(match[1] ?? "");
  let endLine = Number(match[2] ?? "");
  let rangeEnd = Number(match[3] ?? "");
  let column = Number(match[4] ?? "");
  let endColumn = Number(match[5] ?? "");
  let second = match[6] === undefined ? 0 : Number(match[6]);
  if (startLine < 100) return null;
  let utcDate = new Date(Date.UTC(startLine, endLine, 0)).getUTCDate();
  if (endLine < 1 || endLine > 12 || rangeEnd < 1 || rangeEnd > utcDate) return null;
  if (column > 24 || endColumn > 59 || second > 59 || (column === 24 && (endColumn > 0 || second > 0)))
    return null;
  let timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  if (!/(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
    let date = new Date(Date.UTC(startLine, endLine - 1, rangeEnd, column, endColumn));
    let date_2 = new Date(timestamp);
    if (
      date_2.getFullYear() !== date.getUTCFullYear() ||
      date_2.getMonth() !== date.getUTCMonth() ||
      date_2.getDate() !== date.getUTCDate() ||
      date_2.getHours() !== date.getUTCHours() ||
      date_2.getMinutes() !== date.getUTCMinutes()
    )
      return null;
  }
  let rangeTimestamp = Date.UTC(startLine, endLine - 1, rangeEnd, column, endColumn, second);
  if (Math.abs(timestamp - rangeTimestamp) > 50400000) return null;
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
//@ chunk-8prszgkd.js:45389-49307 placement
/**
 * 把工具输入对象拆成可展示的行（内联、多行、代码、链接等），超长时截断。
 */
function buildParameterRows(input, paramFormatHints, maxWidth = PARAM_VALUE_MAX_WIDTH) {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    return [
      {
        kind: "inline",
        key: "input",
        text: "(parameters are not an object \u2014 deny unless expected)",
        unrenderable: true,
      },
    ];
  let entries = Object.entries(input);
  let parseFailure = describeUnparsedInput(input);
  if (parseFailure !== null)
    return [
      {
        kind: "inline",
        key: "input",
        text: parseFailure,
        unrenderable: true,
        parseFailureSentinel: true,
      },
    ];
  let rows = [];
  let entryCount = entries.length;
  if (entryCount > SMALL_INPUT_LINES)
    return [
      {
        kind: "inline",
        key: "input",
        text: `(${entryCount} parameters \u2014 too many to show \u2014 deny unless expected)`,
        unrenderable: true,
      },
    ];
  let shownNames = [];
  let oversizedCount = 0;
  let totalChars = 0;
  for (let [name, value] of entries) {
    if (name.length > MAX_TOOL_INPUT_CHARS) {
      oversizedCount += 1;
      continue;
    }
    shownNames.push(name);
    totalChars += name.length;
    if (typeof value === "string" && value.length <= MAX_TOOL_INPUT_CHARS) totalChars += value.length;
  }
  if (totalChars > DEFAULT_TOOL_INPUT_LIMIT)
    return [
      {
        kind: "inline",
        key: "input",
        text: `(parameters total ${totalChars.toLocaleString()} characters \u2014 too much to show \u2014 deny unless expected)`,
        unrenderable: true,
      },
    ];
  if (oversizedCount > 0)
    rows.push({
      kind: "inline",
      key: "input",
      text: `(${oversizedCount} parameter ${oversizedCount === 1 ? "name is" : "names are"} too large to show \u2014 deny unless expected)`,
      unrenderable: true,
    });
  let uniqueNames = uniqueDisplayNames(shownNames);
  let languageValue = entries.find(([name]) => name === "language")?.[1];
  let unrenderableNameCount = 0;
  for (let [name, value] of entries) {
    if (name.length > MAX_TOOL_INPUT_CHARS) continue;
    let displayName = uniqueNames.get(name) ?? name;
    if (markBrokenSequences(name) !== name) {
      unrenderableNameCount += 1;
      continue;
    }
    if (typeof value === "string") {
      if (value.length > MAX_TOOL_INPUT_CHARS) {
        let blockNotice = `(value of ${value.length.toLocaleString()} characters cannot be shown \u2014 deny unless expected)`;
        if (!fitsInline(displayName, blockNotice, undefined, maxWidth))
          rows.push({
            kind: "block",
            key: displayName,
            text: blockNotice,
            unrenderable: true,
          });
        else
          rows.push({
            kind: "inline",
            key: displayName,
            text: blockNotice,
            unrenderable: true,
          });
        continue;
      }
      let sanitized = stripUnsafeChars(value);
      let marked = markBrokenSequences(sanitized);
      if (GRAPHEME_TRUNCATION_MARKER_RE.test(marked) || marked !== sanitized) {
        let notice = `(value of ${value.length.toLocaleString()} characters cannot be shown in full \u2014 deny unless expected)`;
        if (!fitsInline(displayName, notice, undefined, maxWidth))
          rows.push({
            kind: "block",
            key: displayName,
            text: notice,
            unrenderable: true,
          });
        else
          rows.push({
            kind: "inline",
            key: displayName,
            text: notice,
            unrenderable: true,
          });
        continue;
      }
      let text = marked.replace(/\t/g, " ");
      if (
        marked.includes(`
`) ||
        bunStringWidth(marked) > PARAM_VALUE_MAX_WIDTH
      ) {
        let language =
          name === "code" && isShortString(languageValue) ? stripUnsafeChars(languageValue) : undefined;
        rows.push({
          kind: "block",
          key: displayName,
          text,
          language,
        });
        continue;
      }
      let quoted = jsonStringify(marked);
      let looksLikeDate =
        paramFormatHints?.[name] === "date-time" && YEAR_RE.test(marked) && CLOCK_TIME_RE.test(marked);
      let annotation =
        TIMESTAMP_PARAM_KEYS.has(name) && SLACK_TS_RE.test(marked)
          ? (parseLineRange(new Date(Number(marked) * 1000).toISOString()) ?? undefined)
          : looksLikeDate || ISO_DATETIME_RE.test(marked)
            ? (parseLineRange(marked) ?? undefined)
            : undefined;
      if (!fitsInline(displayName, quoted, annotation, maxWidth)) {
        let language =
          name === "code" && isShortString(languageValue) ? stripUnsafeChars(languageValue) : undefined;
        rows.push({
          kind: "block",
          key: displayName,
          text,
          annotation,
          language,
        });
        continue;
      }
      let linkUrl = CHANNEL_PARAM_KEYS.has(name)
        ? (slackChannelUrl(marked) ?? undefined)
        : /^https?:\/\/\S+$/.test(marked) && !hasDisplayUnsafeChar(marked)
          ? marked
          : undefined;
      rows.push({
        kind: "inline",
        key: displayName,
        text: quoted,
        linkUrl,
        annotation,
      });
      continue;
    }
    if (value === null || typeof value === "number" || typeof value === "boolean") {
      let primitiveText = String(value);
      if (!fitsInline(displayName, primitiveText, undefined, maxWidth)) {
        rows.push({
          kind: "block",
          key: displayName,
          text: primitiveText,
        });
        continue;
      }
      rows.push({
        kind: "inline",
        key: displayName,
        text: primitiveText,
      });
      continue;
    }
    let formatted;
    let sanitizedText = "";
    let formattedLength = 0;
    try {
      let formattedRaw = formatParamValue(value, 0);
      formattedLength = formattedRaw.length;
      if (formattedRaw.length > MAX_TOOL_INPUT_CHARS) {
        let notice = `(value of ${formattedRaw.length.toLocaleString()} formatted characters cannot be shown \u2014 deny unless expected)`;
        if (!fitsInline(displayName, notice, undefined, maxWidth))
          rows.push({
            kind: "block",
            key: displayName,
            text: notice,
            unrenderable: true,
          });
        else
          rows.push({
            kind: "inline",
            key: displayName,
            text: notice,
            unrenderable: true,
          });
        continue;
      }
      sanitizedText = stripUnsafeChars(formattedRaw);
      formatted = markBrokenSequences(sanitizedText);
    } catch {
      if (
        !fitsInline(
          displayName,
          "(value too large or too deeply nested to render \u2014 deny unless expected)",
          undefined,
          maxWidth,
        )
      )
        rows.push({
          kind: "block",
          key: displayName,
          text: "(value too large or too deeply nested to render \u2014 deny unless expected)",
          unrenderable: true,
        });
      else
        rows.push({
          kind: "inline",
          key: displayName,
          text: "(value too large or too deeply nested to render \u2014 deny unless expected)",
          unrenderable: true,
        });
      continue;
    }
    totalChars += formattedLength;
    if (totalChars > DEFAULT_TOOL_INPUT_LIMIT)
      return [
        {
          kind: "inline",
          key: "input",
          text: `(parameters total over ${DEFAULT_TOOL_INPUT_LIMIT.toLocaleString()} rendered characters \u2014 too much to show \u2014 deny unless expected)`,
          unrenderable: true,
        },
      ];
    if (
      GRAPHEME_TRUNCATION_MARKER_RE.test(formatted) ||
      markBrokenSequences(sanitizedText) !== sanitizedText
    ) {
      let notice = `(value of ${formattedLength.toLocaleString()} formatted characters cannot be shown in full \u2014 deny unless expected)`;
      if (!fitsInline(displayName, notice, undefined, maxWidth))
        rows.push({
          kind: "block",
          key: displayName,
          text: notice,
          unrenderable: true,
        });
      else
        rows.push({
          kind: "inline",
          key: displayName,
          text: notice,
          unrenderable: true,
        });
      continue;
    }
    if (
      !formatted.includes(`
`) &&
      fitsInline(displayName, formatted, undefined, maxWidth)
    )
      rows.push({
        kind: "inline",
        key: displayName,
        text: formatted,
      });
    else
      rows.push({
        kind: "block",
        key: displayName,
        text: formatted,
        language: "javascript",
      });
  }
  if (unrenderableNameCount > 0)
    rows.push({
      kind: "inline",
      key: "input",
      text: `(${unrenderableNameCount} parameter ${unrenderableNameCount === 1 ? "name" : "names"} cannot be shown in full \u2014 deny unless expected)`,
      unrenderable: true,
    });
  return rows;
}
//@ chunk-8prszgkd.js:49307-49434 placement
function canHighlightAsCode(prop, highlight) {
  return (
    prop.language !== undefined &&
    highlight !== null &&
    languageSubLanguageMap(prop.text, canonicalLanguageName(prop.language) ?? prop.language) &&
    highlight.supportsLanguage(prop.language)
  );
}
export {
  canHighlightAsCode,
  VALUE_WRAP_WIDTH,
  buildParameterRows,
  MAX_PARAMETER_VALUE_CHARS,
  cardHeaderRows,
  PARAMETER_VALUE_MAX_LINES,
  ParameterCard,
};
