/**
 * components/permissions/ToolParameterDisplay.tsx
 *
 * 2.1.316 新增：权限对话框中的工具参数卡片与格式化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e8j1zzj.js (20)
 * attribution: placement 20
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Blockquote } from "../Blockquote.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { describeUnparsedInput } from "../../utils/json.js";
import { GRAPHEME_TRUNCATION_MARKER_RE } from "../../utils/truncateGraphemes.js";
import { slackChannelUrl } from "../../tools/MCPTool/slackSend.js";
import { languageSubLanguageMap } from "../../utils/highlight/boundedHighlight.js";
import { canonicalLanguageName } from "../../utils/highlight/pluginLanguages.js";

//@ chunk-0e8j1zzj.js:30168-30172 placement
init_react_production();
//@ chunk-0e8j1zzj.js:30172-30221 placement
function isValueStyle(o) {
  let { style } = o;
  return style === "value";
}
//@ chunk-0e8j1zzj.js:30221-30270 placement
function isNotValueStyle(o) {
  let { style } = o;
  return style !== "value";
}
//@ chunk-0e8j1zzj.js:30270-30362 placement
function renderParameterText(o, de) {
  let { text, style } = o;
  return jsxProd_default(
    Text,
    {
      bold: style === "question",
      children: text,
    },
    de,
  );
}
//@ chunk-0e8j1zzj.js:30362-30445 placement
function renderParameterValue(o, K) {
  let { text } = o;
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children: text,
    },
    `value-${K}`,
  );
}
//@ chunk-0e8j1zzj.js:30445-30692 placement
var PARAM_DISPLAY_LIMITS = 12;
var VALUE_WRAP_WIDTH = 60;
var MAX_PARAMETER_VALUE_CHARS = PARAM_DISPLAY_LIMITS * VALUE_WRAP_WIDTH;
var PARAMETER_VALUE_MAX_LINES = 4;
var ARTIFACT_LINK_RE =
  /^(?:replacing|source|into|type|artifact)(?: \d+)?: https?:\/\/[^\s/]+\/(?:[^\s/]+\/)*(?:artifact|frame)\/(?:[A-Za-z0-9_-]*-)?(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[A-Za-z0-9_-]{22})\/?$/;
//@ chunk-0e8j1zzj.js:30692-30781 placement
function truncateMiddle(o, t) {
  if (bunStringWidth(o) <= t) return o;
  let d = truncateToWidthNoEllipsis(o, Math.floor(t / 2));
  return d + truncateStartToWidth(o, t - bunStringWidth(d));
}
//@ chunk-0e8j1zzj.js:30781-31371 placement
function cardHeaderRows(o, t) {
  let max = Math.max(1, t);
  let c = [
    ...(o.question === undefined
      ? []
      : [
          {
            text: o.question,
            style: "question",
          },
        ]),
    ...o.lines.map((text) => ({
      text,
      style: "line",
    })),
    ...o.values.map((text) => ({
      text,
      style: "value",
    })),
  ];
  let m = -1;
  let flattened = c.flatMap(({ text, style }) => {
    let replaced = text.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
    let f = style === "value" ? (m += 1) : undefined;
    return style === "value" && !ARTIFACT_LINK_RE.test(replaced)
      ? [
          {
            text: truncateMiddle(replaced, max),
            style,
            value: f,
          },
        ]
      : wrapAnsi(style === "value" ? replaced : text, max, {
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
            ...(f !== undefined && {
              value: f,
            }),
          }));
  });
  return {
    rows: flattened,
    gutter:
      o.values.length > 0 ||
      o.lines.length > 0 ||
      flattened.length > c.length ||
      c.some(({ text }) => needsGutter(text)),
  };
}
//@ chunk-0e8j1zzj.js:31371-32738 placement
/**
 * 权限对话框中以卡片形式展示工具参数行（问题、字段、代码块）。
 */
function ParameterCard(props) {
  let d = w(31);
  let { card } = props;
  if (card.rows.length === 0) {
    return null;
  }
  let c;
  let m;
  let u;
  let i;
  let flexDirection;
  let k;
  let f;
  let g;
  let multiline;
  let flexDirection_2;
  if (d[0] !== card.gutter || d[1] !== card.rows) {
    let filtered = card.rows.filter(isValueStyle);
    let filtered_2 = card.rows.filter(isNotValueStyle);
    let T = card.rows.length <= PARAM_DISPLAY_LIMITS;
    let v = filtered;
    if (!T) {
      let I = PARAM_DISPLAY_LIMITS - 3;
      let L = 0;
      while (L < filtered.length) {
        let b = filtered[L].value;
        let E = L;
        while (E < filtered.length && filtered[E].value === b) E = E + 1;
        if (E > I) {
          break;
        }
        L = E;
      }
      v = filtered.slice(0, L);
    }
    i = filtered.length - v.length;
    let W = PARAM_DISPLAY_LIMITS - 1 - v.length - (i > 0 ? 1 : 0);
    let le = T ? filtered_2 : filtered_2.slice(0, Math.max(1, W));
    let V = filtered_2.length - le.length;
    u = Box;
    flexDirection_2 = "column";
    m = Blockquote;
    multiline = card.gutter;
    c = Box;
    flexDirection = "column";
    k = le.map(renderParameterText);
    if (d[12] !== V) {
      f =
        V > 0 &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["\u2026 (+", V, " more lines)"],
        });
      d[12] = V;
      d[13] = f;
    } else f = d[13];
    g = v.map(renderParameterValue);
    d[0] = card.gutter;
    d[1] = card.rows;
    d[2] = c;
    d[3] = m;
    d[4] = u;
    d[5] = i;
    d[6] = flexDirection;
    d[7] = k;
    d[8] = f;
    d[9] = g;
    d[10] = multiline;
    d[11] = flexDirection_2;
  } else {
    c = d[2];
    m = d[3];
    u = d[4];
    i = d[5];
    flexDirection = d[6];
    k = d[7];
    f = d[8];
    g = d[9];
    multiline = d[10];
    flexDirection_2 = d[11];
  }
  let X;
  if (d[14] !== i) {
    X =
      i > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["\u2026 (+", i, " more lines)"],
      });
    d[14] = i;
    d[15] = X;
  } else X = d[15];
  let children;
  if (d[16] !== c || d[17] !== flexDirection || d[18] !== k || d[19] !== f || d[20] !== g || d[21] !== X) {
    children = jsxProd_default_2(c, {
      flexDirection,
      children: [k, f, g, X],
    });
    d[16] = c;
    d[17] = flexDirection;
    d[18] = k;
    d[19] = f;
    d[20] = g;
    d[21] = X;
    d[22] = children;
  } else children = d[22];
  let children_2;
  if (d[23] !== m || d[24] !== multiline || d[25] !== children) {
    children_2 = jsxProd_default(m, {
      multiline,
      children,
    });
    d[23] = m;
    d[24] = multiline;
    d[25] = children;
    d[26] = children_2;
  } else children_2 = d[26];
  let F;
  if (d[27] !== u || d[28] !== flexDirection_2 || d[29] !== children_2) {
    F = jsxProd_default(u, {
      flexDirection: flexDirection_2,
      children: children_2,
    });
    d[27] = u;
    d[28] = flexDirection_2;
    d[29] = children_2;
    d[30] = F;
  } else F = d[30];
  return F;
}
//@ chunk-0e8j1zzj.js:32738-32742 placement
init_react_production();
//@ chunk-0e8j1zzj.js:32742-32787 placement
var MAX_TOOL_INPUT_CHARS = 200000;
var DEFAULT_TOOL_INPUT_LIMIT = MAX_TOOL_INPUT_CHARS;
var SMALL_INPUT_CHARS = 1e4;
var SMALL_INPUT_LINES = 1000;
var LARGE_INPUT_CHARS = 200000;
//@ chunk-0e8j1zzj.js:32787-32844 placement
function isShortString(o) {
  return typeof o === "string" && o.length <= 256;
}
//@ chunk-0e8j1zzj.js:32844-32977 placement
var PARAM_VALUE_MAX_WIDTH = 80;
var CHANNEL_PARAM_KEYS = new Set(["channel_id", "channel"]);
var TIMESTAMP_PARAM_KEYS = new Set(["ts", "thread_ts"]);
var SLACK_TS_RE = /^\d{10}\.\d{6}$/;
var YEAR_RE = /\b\d{4}\b/;
var CLOCK_TIME_RE = /\d{1,2}:\d{2}/;
//@ chunk-0e8j1zzj.js:32977-33060 placement
function fitsInline(o, t, d, c) {
  return (
    bunStringWidth(o) + 2 + bunStringWidth(t) + (d === undefined ? 0 : bunStringWidth(d) + 3) <=
    Math.min(PARAM_VALUE_MAX_WIDTH, c - 2)
  );
}
//@ chunk-0e8j1zzj.js:33060-33070 placement
var INLINE_LABEL_MAX = 64;
//@ chunk-0e8j1zzj.js:33070-35033 placement
/**
 * 把工具参数值格式化为限长的显示文本（字符串、数组、对象递归截断）。
 */
function formatParamValue(
  o,
  t,
  d = 0,
  c = {
    remaining: SMALL_INPUT_CHARS,
    unitsRemaining: MAX_TOOL_INPUT_CHARS,
  },
) {
  if (typeof o === "string") {
    if (o.length + 2 > c.unitsRemaining) throw Error("value exceeds the units display budget");
    let m = jsonStringify(o);
    c.unitsRemaining -= m.length;
    if (c.unitsRemaining < 0) throw Error("value exceeds the units display budget");
    return m;
  }
  if (o === null || typeof o === "number" || typeof o === "boolean") {
    let m = String(o);
    c.unitsRemaining -= m.length;
    if (c.unitsRemaining < 0) throw Error("value exceeds the units display budget");
    return m;
  }
  if (d >= INLINE_LABEL_MAX) throw Error("value exceeds the display depth bound");
  if (Array.isArray(o)) {
    if (o.length === 0) return "[]";
    let m = o.length;
    if (typeof m !== "number" || !Number.isSafeInteger(m) || m < 0)
      throw Error("value exceeds the element display budget");
    c.remaining -= m;
    if (c.remaining < 0) throw Error("value exceeds the element display budget");
    let u = [];
    for (let k = 0; k < m; k++) u.push(formatParamValue(o[k], t + 1, d + 1, c));
    if (
      u.every(
        (k) =>
          !k.includes(`
`),
      )
    ) {
      let k = `[${u.join(", ")}]`;
      if (bunStringWidth(k) <= PARAM_VALUE_MAX_WIDTH) return k;
    }
    let i = "  ".repeat(t + 1);
    let h = "  ".repeat(t);
    return `[
${u.map((k) => i + k).join(`,
`)}
${h}]`;
  }
  if (typeof o === "object") {
    let entries = Object.entries(o);
    if (entries.length === 0) return "{}";
    c.remaining -= entries.length;
    if (c.remaining < 0) throw Error("value exceeds the element display budget");
    for (let [f] of entries) {
      if (f.length > LARGE_INPUT_CHARS) throw Error("nested key exceeds the display bound");
      if (f.length > c.unitsRemaining) throw Error("keys exceed the units display budget");
      if (markBrokenSequences(f) !== f) throw Error("nested key display would drop code points");
      c.unitsRemaining -= f.length;
    }
    let u = uniqueDisplayNames(entries.map(([f]) => f));
    for (let [f] of entries) {
      let g = u.get(f) ?? f;
      if (g.length > f.length) {
        c.unitsRemaining -= g.length - f.length;
        if (c.unitsRemaining < 0) throw Error("keys exceed the units display budget");
      }
    }
    let mapped = entries.map(([f, g]) => `${u.get(f) ?? f}: ${formatParamValue(g, t + 1, d + 1, c)}`);
    if (
      mapped.every(
        (f) =>
          !f.includes(`
`),
      )
    ) {
      let f = `{ ${mapped.join(", ")} }`;
      if (bunStringWidth(f) <= PARAM_VALUE_MAX_WIDTH) return f;
    }
    let h = "  ".repeat(t + 1);
    let k = "  ".repeat(t);
    return `{
${mapped.map((f) => h + f).join(`,
`)}
${k}}`;
  }
  if (typeof o === "bigint") throw Error("bigint value cannot be rendered");
  return "undefined";
}
//@ chunk-0e8j1zzj.js:35033-35141 placement
var ISO_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:[Zz]|[+-]\d{2}:?\d{2})?$/;
//@ chunk-0e8j1zzj.js:35141-36021 placement
function parseLineRange(o) {
  let trimmed = o.trim();
  let match = trimmed.match(ISO_DATETIME_RE);
  if (!match) return null;
  let c = Number(match[1] ?? "");
  let m = Number(match[2] ?? "");
  let u = Number(match[3] ?? "");
  let i = Number(match[4] ?? "");
  let h = Number(match[5] ?? "");
  let k = match[6] === undefined ? 0 : Number(match[6]);
  if (c < 100) return null;
  let utcDate = new Date(Date.UTC(c, m, 0)).getUTCDate();
  if (m < 1 || m > 12 || u < 1 || u > utcDate) return null;
  if (i > 24 || h > 59 || k > 59 || (i === 24 && (h > 0 || k > 0))) return null;
  let timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  if (!/(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
    let date = new Date(Date.UTC(c, m - 1, u, i, h));
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
  let N = Date.UTC(c, m - 1, u, i, h, k);
  if (Math.abs(timestamp - N) > 50400000) return null;
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
//@ chunk-0e8j1zzj.js:36021-39940 placement
/**
 * 把工具输入对象拆成可展示的行（内联、多行、代码、链接等），超长时截断。
 */
function buildParameterRows(o, paramFormatHints, d = PARAM_VALUE_MAX_WIDTH) {
  if (o === null || typeof o !== "object" || Array.isArray(o))
    return [
      {
        kind: "inline",
        key: "input",
        text: "(parameters are not an object \u2014 deny unless expected)",
        unrenderable: true,
      },
    ];
  let entries = Object.entries(o);
  let m = describeUnparsedInput(o);
  if (m !== null)
    return [
      {
        kind: "inline",
        key: "input",
        text: m,
        unrenderable: true,
        parseFailureSentinel: true,
      },
    ];
  let u = [];
  let i = entries.length;
  if (i > SMALL_INPUT_LINES)
    return [
      {
        kind: "inline",
        key: "input",
        text: `(${i} parameters \u2014 too many to show \u2014 deny unless expected)`,
        unrenderable: true,
      },
    ];
  let h = [];
  let k = 0;
  let f = 0;
  for (let [x, A] of entries) {
    if (x.length > MAX_TOOL_INPUT_CHARS) {
      k += 1;
      continue;
    }
    h.push(x);
    f += x.length;
    if (typeof A === "string" && A.length <= MAX_TOOL_INPUT_CHARS) f += A.length;
  }
  if (f > DEFAULT_TOOL_INPUT_LIMIT)
    return [
      {
        kind: "inline",
        key: "input",
        text: `(parameters total ${f.toLocaleString()} characters \u2014 too much to show \u2014 deny unless expected)`,
        unrenderable: true,
      },
    ];
  if (k > 0)
    u.push({
      kind: "inline",
      key: "input",
      text: `(${k} parameter ${k === 1 ? "name is" : "names are"} too large to show \u2014 deny unless expected)`,
      unrenderable: true,
    });
  let g = uniqueDisplayNames(h);
  let M = entries.find(([x]) => x === "language")?.[1];
  let N = 0;
  for (let [x, A] of entries) {
    if (x.length > MAX_TOOL_INPUT_CHARS) continue;
    let T = g.get(x) ?? x;
    if (markBrokenSequences(x) !== x) {
      N += 1;
      continue;
    }
    if (typeof A === "string") {
      if (A.length > MAX_TOOL_INPUT_CHARS) {
        let F = `(value of ${A.length.toLocaleString()} characters cannot be shown \u2014 deny unless expected)`;
        if (!fitsInline(T, F, undefined, d))
          u.push({
            kind: "block",
            key: T,
            text: F,
            unrenderable: true,
          });
        else
          u.push({
            kind: "inline",
            key: T,
            text: F,
            unrenderable: true,
          });
        continue;
      }
      let b = stripUnsafeChars(A);
      let E = markBrokenSequences(b);
      if (GRAPHEME_TRUNCATION_MARKER_RE.test(E) || E !== b) {
        let F = `(value of ${A.length.toLocaleString()} characters cannot be shown in full \u2014 deny unless expected)`;
        if (!fitsInline(T, F, undefined, d))
          u.push({
            kind: "block",
            key: T,
            text: F,
            unrenderable: true,
          });
        else
          u.push({
            kind: "inline",
            key: T,
            text: F,
            unrenderable: true,
          });
        continue;
      }
      let text = E.replace(/\t/g, " ");
      if (
        E.includes(`
`) ||
        bunStringWidth(E) > PARAM_VALUE_MAX_WIDTH
      ) {
        let language = x === "code" && isShortString(M) ? stripUnsafeChars(M) : undefined;
        u.push({
          kind: "block",
          key: T,
          text,
          language,
        });
        continue;
      }
      let le = jsonStringify(E);
      let V = paramFormatHints?.[x] === "date-time" && YEAR_RE.test(E) && CLOCK_TIME_RE.test(E);
      let Y =
        TIMESTAMP_PARAM_KEYS.has(x) && SLACK_TS_RE.test(E)
          ? (parseLineRange(new Date(Number(E) * 1000).toISOString()) ?? undefined)
          : V || ISO_DATETIME_RE.test(E)
            ? (parseLineRange(E) ?? undefined)
            : undefined;
      if (!fitsInline(T, le, Y, d)) {
        let language = x === "code" && isShortString(M) ? stripUnsafeChars(M) : undefined;
        u.push({
          kind: "block",
          key: T,
          text,
          annotation: Y,
          language,
        });
        continue;
      }
      let linkUrl = CHANNEL_PARAM_KEYS.has(x)
        ? (slackChannelUrl(E) ?? undefined)
        : /^https?:\/\/\S+$/.test(E) && !hasDisplayUnsafeChar(E)
          ? E
          : undefined;
      u.push({
        kind: "inline",
        key: T,
        text: le,
        linkUrl,
        annotation: Y,
      });
      continue;
    }
    if (A === null || typeof A === "number" || typeof A === "boolean") {
      let b = String(A);
      if (!fitsInline(T, b, undefined, d)) {
        u.push({
          kind: "block",
          key: T,
          text: b,
        });
        continue;
      }
      u.push({
        kind: "inline",
        key: T,
        text: b,
      });
      continue;
    }
    let v;
    let I = "";
    let L = 0;
    try {
      let b = formatParamValue(A, 0);
      L = b.length;
      if (b.length > MAX_TOOL_INPUT_CHARS) {
        let E = `(value of ${b.length.toLocaleString()} formatted characters cannot be shown \u2014 deny unless expected)`;
        if (!fitsInline(T, E, undefined, d))
          u.push({
            kind: "block",
            key: T,
            text: E,
            unrenderable: true,
          });
        else
          u.push({
            kind: "inline",
            key: T,
            text: E,
            unrenderable: true,
          });
        continue;
      }
      I = stripUnsafeChars(b);
      v = markBrokenSequences(I);
    } catch {
      if (
        !fitsInline(
          T,
          "(value too large or too deeply nested to render \u2014 deny unless expected)",
          undefined,
          d,
        )
      )
        u.push({
          kind: "block",
          key: T,
          text: "(value too large or too deeply nested to render \u2014 deny unless expected)",
          unrenderable: true,
        });
      else
        u.push({
          kind: "inline",
          key: T,
          text: "(value too large or too deeply nested to render \u2014 deny unless expected)",
          unrenderable: true,
        });
      continue;
    }
    f += L;
    if (f > DEFAULT_TOOL_INPUT_LIMIT)
      return [
        {
          kind: "inline",
          key: "input",
          text: `(parameters total over ${DEFAULT_TOOL_INPUT_LIMIT.toLocaleString()} rendered characters \u2014 too much to show \u2014 deny unless expected)`,
          unrenderable: true,
        },
      ];
    if (GRAPHEME_TRUNCATION_MARKER_RE.test(v) || markBrokenSequences(I) !== I) {
      let b = `(value of ${L.toLocaleString()} formatted characters cannot be shown in full \u2014 deny unless expected)`;
      if (!fitsInline(T, b, undefined, d))
        u.push({
          kind: "block",
          key: T,
          text: b,
          unrenderable: true,
        });
      else
        u.push({
          kind: "inline",
          key: T,
          text: b,
          unrenderable: true,
        });
      continue;
    }
    if (
      !v.includes(`
`) &&
      fitsInline(T, v, undefined, d)
    )
      u.push({
        kind: "inline",
        key: T,
        text: v,
      });
    else
      u.push({
        kind: "block",
        key: T,
        text: v,
        language: "javascript",
      });
  }
  if (N > 0)
    u.push({
      kind: "inline",
      key: "input",
      text: `(${N} parameter ${N === 1 ? "name" : "names"} cannot be shown in full \u2014 deny unless expected)`,
      unrenderable: true,
    });
  return u;
}
//@ chunk-0e8j1zzj.js:39940-40067 placement
function canHighlightAsCode(prop, t) {
  return (
    prop.language !== undefined &&
    t !== null &&
    languageSubLanguageMap(prop.text, canonicalLanguageName(prop.language) ?? prop.language) &&
    t.supportsLanguage(prop.language)
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
