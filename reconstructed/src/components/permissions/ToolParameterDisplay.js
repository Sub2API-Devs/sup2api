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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { X1e } from "../../utils/truncateGraphemes.js";
import { slackChannelUrl } from "../../tools/MCPTool/slackSend.js";
import { I2o } from "../../utils/highlight/boundedHighlight.js";
import { canonicalLanguageName } from "../../utils/highlight/pluginLanguages.js";

//@ chunk-0e8j1zzj.js:30168-30172 placement
j();
//@ chunk-0e8j1zzj.js:30172-30221 placement
function cl(o) {
  let { style: style } = o;
  return style === "value";
}
//@ chunk-0e8j1zzj.js:30221-30270 placement
function ul(o) {
  let { style: style } = o;
  return style !== "value";
}
//@ chunk-0e8j1zzj.js:30270-30362 placement
function pl(o, de) {
  let { text: text, style: style } = o;
  return e(Text, { bold: style === "question", children: text }, de);
}
//@ chunk-0e8j1zzj.js:30362-30445 placement
function ml(o, K) {
  let { text: text } = o;
  return e(Text, { dimColor: !0, children: text }, `value-${K}`);
}
//@ chunk-0e8j1zzj.js:30445-30692 placement
var PARAM_DISPLAY_LIMITS = 12,
  pn = 60,
  _o = PARAM_DISPLAY_LIMITS * pn,
  Eo = 4,
  Qa =
    /^(?:replacing|source|into|type|artifact)(?: \d+)?: https?:\/\/[^\s/]+\/(?:[^\s/]+\/)*(?:artifact|frame)\/(?:[A-Za-z0-9_-]*-)?(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[A-Za-z0-9_-]{22})\/?$/;
//@ chunk-0e8j1zzj.js:30692-30781 placement
function Ja(o, t) {
  if (bunStringWidth(o) <= t) return o;
  let d = truncateToWidthNoEllipsis(o, Math.floor(t / 2));
  return d + truncateStartToWidth(o, t - bunStringWidth(d));
}
//@ chunk-0e8j1zzj.js:30781-31371 placement
function cardHeaderRows(o, t) {
  let max = Math.max(1, t),
    c = [
      ...(o.question === void 0 ? [] : [{ text: o.question, style: "question" }]),
      ...o.lines.map((line) => ({ text: line, style: "line" })),
      ...o.values.map((i) => ({ text: i, style: "value" })),
    ],
    m = -1,
    flattened = c.flatMap(({ text: text, style: style }) => {
      let replaced = text.replace(/\r\n|[\r\n\u2028\u2029]/g, " "),
        f = style === "value" ? (m += 1) : void 0;
      return style === "value" && !Qa.test(replaced)
        ? [{ text: Ja(replaced, max), style: style, value: f }]
        : wrapAnsi(style === "value" ? replaced : text, max, { trim: !0, hard: !0 })
            .split(
              `
`,
            )
            .map((g) => ({ text: truncateToWidth(g, max), style: style, ...(f !== void 0 && { value: f }) }));
    });
  return {
    rows: flattened,
    gutter:
      o.values.length > 0 ||
      o.lines.length > 0 ||
      flattened.length > c.length ||
      c.some(({ text: text }) => needsGutter(text)),
  };
}
/**
 * 权限对话框中以卡片形式展示工具参数行（问题、字段、代码块）。
 */
//@ chunk-0e8j1zzj.js:31371-32738 placement
function ParameterCard(o) {
  let d = w(31),
    { card: card } = o;
  if (card.rows.length === 0) {
    return null;
  }
  let c, m, u, i, h, k, f, g, M, N;
  if (d[0] !== card.gutter || d[1] !== card.rows) {
    let filtered = card.rows.filter(cl);
    let filtered_2 = card.rows.filter(ul);
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
    N = "column";
    m = Blockquote;
    M = card.gutter;
    c = Box;
    h = "column";
    k = le.map(pl);
    if (d[12] !== V)
      ((f = V > 0 && r(Text, { dimColor: !0, children: ["\u2026 (+", V, " more lines)"] })),
        (d[12] = V),
        (d[13] = f));
    else f = d[13];
    g = v.map(ml);
    ((d[0] = card.gutter),
      (d[1] = card.rows),
      (d[2] = c),
      (d[3] = m),
      (d[4] = u),
      (d[5] = i),
      (d[6] = h),
      (d[7] = k),
      (d[8] = f),
      (d[9] = g),
      (d[10] = M),
      (d[11] = N));
  } else
    ((c = d[2]),
      (m = d[3]),
      (u = d[4]),
      (i = d[5]),
      (h = d[6]),
      (k = d[7]),
      (f = d[8]),
      (g = d[9]),
      (M = d[10]),
      (N = d[11]));
  let X;
  if (d[14] !== i)
    ((X = i > 0 && r(Text, { dimColor: !0, children: ["\u2026 (+", i, " more lines)"] })),
      (d[14] = i),
      (d[15] = X));
  else X = d[15];
  let Y;
  if (d[16] !== c || d[17] !== h || d[18] !== k || d[19] !== f || d[20] !== g || d[21] !== X)
    ((Y = r(c, { flexDirection: h, children: [k, f, g, X] })),
      (d[16] = c),
      (d[17] = h),
      (d[18] = k),
      (d[19] = f),
      (d[20] = g),
      (d[21] = X),
      (d[22] = Y));
  else Y = d[22];
  let z;
  if (d[23] !== m || d[24] !== M || d[25] !== Y)
    ((z = e(m, { multiline: M, children: Y })), (d[23] = m), (d[24] = M), (d[25] = Y), (d[26] = z));
  else z = d[26];
  let F;
  if (d[27] !== u || d[28] !== N || d[29] !== z)
    ((F = e(u, { flexDirection: N, children: z })), (d[27] = u), (d[28] = N), (d[29] = z), (d[30] = F));
  else F = d[30];
  return F;
}
//@ chunk-0e8j1zzj.js:32738-32742 placement
j();
//@ chunk-0e8j1zzj.js:32742-32787 placement
var st = 200000,
  No = st,
  fl = 1e4,
  gl = 1000,
  hl = 200000;
//@ chunk-0e8j1zzj.js:32787-32844 placement
function gi(o) {
  return typeof o === "string" && o.length <= 256;
}
//@ chunk-0e8j1zzj.js:32844-32977 placement
var PARAM_VALUE_MAX_WIDTH = 80,
  CHANNEL_PARAM_KEYS = new Set(["channel_id", "channel"]),
  TIMESTAMP_PARAM_KEYS = new Set(["ts", "thread_ts"]),
  SLACK_TS_RE = /^\d{10}\.\d{6}$/,
  YEAR_RE = /\b\d{4}\b/,
  CLOCK_TIME_RE = /\d{1,2}:\d{2}/;
//@ chunk-0e8j1zzj.js:32977-33060 placement
function Ue(o, t, d, c) {
  return (
    bunStringWidth(o) + 2 + bunStringWidth(t) + (d === void 0 ? 0 : bunStringWidth(d) + 3) <=
    Math.min(PARAM_VALUE_MAX_WIDTH, c - 2)
  );
}
//@ chunk-0e8j1zzj.js:33060-33070 placement
var wl = 64;
/**
 * 把工具参数值格式化为限长的显示文本（字符串、数组、对象递归截断）。
 */
//@ chunk-0e8j1zzj.js:33070-35033 placement
function formatParamValue(o, t, d = 0, c = { remaining: fl, unitsRemaining: st }) {
  if (typeof o === "string") {
    if (o.length + 2 > c.unitsRemaining) throw Error("value exceeds the units display budget");
    let m = jsonStringify(o);
    if (((c.unitsRemaining -= m.length), c.unitsRemaining < 0))
      throw Error("value exceeds the units display budget");
    return m;
  }
  if (o === null || typeof o === "number" || typeof o === "boolean") {
    let m = String(o);
    if (((c.unitsRemaining -= m.length), c.unitsRemaining < 0))
      throw Error("value exceeds the units display budget");
    return m;
  }
  if (d >= wl) throw Error("value exceeds the display depth bound");
  if (Array.isArray(o)) {
    if (o.length === 0) return "[]";
    let m = o.length;
    if (typeof m !== "number" || !Number.isSafeInteger(m) || m < 0)
      throw Error("value exceeds the element display budget");
    if (((c.remaining -= m), c.remaining < 0)) throw Error("value exceeds the element display budget");
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
    let repeat = "  ".repeat(t + 1),
      repeat_2 = "  ".repeat(t);
    return `[
${u.map((k) => repeat + k).join(`,
`)}
${repeat_2}]`;
  }
  if (typeof o === "object") {
    let entries = Object.entries(o);
    if (entries.length === 0) return "{}";
    if (((c.remaining -= entries.length), c.remaining < 0))
      throw Error("value exceeds the element display budget");
    for (let [f] of entries) {
      if (f.length > hl) throw Error("nested key exceeds the display bound");
      if (f.length > c.unitsRemaining) throw Error("keys exceed the units display budget");
      if (markBrokenSequences(f) !== f) throw Error("nested key display would drop code points");
      c.unitsRemaining -= f.length;
    }
    let u = uniqueDisplayNames(entries.map(([f]) => f));
    for (let [f] of entries) {
      let g = u.get(f) ?? f;
      if (g.length > f.length) {
        if (((c.unitsRemaining -= g.length - f.length), c.unitsRemaining < 0))
          throw Error("keys exceed the units display budget");
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
    let repeat = "  ".repeat(t + 1),
      repeat_2 = "  ".repeat(t);
    return `{
${mapped.map((f) => repeat + f).join(`,
`)}
${repeat_2}}`;
  }
  if (typeof o === "bigint") throw Error("bigint value cannot be rendered");
  return "undefined";
}
//@ chunk-0e8j1zzj.js:35033-35141 placement
var ISO_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:[Zz]|[+-]\d{2}:?\d{2})?$/;
//@ chunk-0e8j1zzj.js:35141-36021 placement
function parseLineRange(o) {
  let trimmed = o.trim(),
    match = trimmed.match(ISO_DATETIME_RE);
  if (!match) return null;
  let c = Number(match[1] ?? ""),
    m = Number(match[2] ?? ""),
    u = Number(match[3] ?? ""),
    i = Number(match[4] ?? ""),
    h = Number(match[5] ?? ""),
    k = match[6] === void 0 ? 0 : Number(match[6]);
  if (c < 100) return null;
  let uTCDate = new Date(Date.UTC(c, m, 0)).getUTCDate();
  if (m < 1 || m > 12 || u < 1 || u > uTCDate) return null;
  if (i > 24 || h > 59 || k > 59 || (i === 24 && (h > 0 || k > 0))) return null;
  let parse = Date.parse(trimmed);
  if (Number.isNaN(parse)) return null;
  if (!/(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
    let date = new Date(Date.UTC(c, m - 1, u, i, h)),
      date_2 = new Date(parse);
    if (
      date_2.getFullYear() !== date.getUTCFullYear() ||
      date_2.getMonth() !== date.getUTCMonth() ||
      date_2.getDate() !== date.getUTCDate() ||
      date_2.getHours() !== date.getUTCHours() ||
      date_2.getMinutes() !== date.getUTCMinutes()
    )
      return null;
  }
  let UTC = Date.UTC(c, m - 1, u, i, h, k);
  if (Math.abs(parse - UTC) > 50400000) return null;
  return new Date(parse).toLocaleString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
/**
 * 把工具输入对象拆成可展示的行（内联、多行、代码、链接等），超长时截断。
 */
//@ chunk-0e8j1zzj.js:36021-39940 placement
function buildParameterRows(o, t, d = PARAM_VALUE_MAX_WIDTH) {
  if (o === null || typeof o !== "object" || Array.isArray(o))
    return [
      {
        kind: "inline",
        key: "input",
        text: "(parameters are not an object \u2014 deny unless expected)",
        unrenderable: !0,
      },
    ];
  let entries = Object.entries(o),
    m = describeUnparsedInput(o);
  if (m !== null)
    return [{ kind: "inline", key: "input", text: m, unrenderable: !0, parseFailureSentinel: !0 }];
  let u = [],
    i = entries.length;
  if (i > gl)
    return [
      {
        kind: "inline",
        key: "input",
        text: `(${i} parameters \u2014 too many to show \u2014 deny unless expected)`,
        unrenderable: !0,
      },
    ];
  let h = [],
    k = 0,
    f = 0;
  for (let [x, A] of entries) {
    if (x.length > st) {
      k += 1;
      continue;
    }
    if ((h.push(x), (f += x.length), typeof A === "string" && A.length <= st)) f += A.length;
  }
  if (f > No)
    return [
      {
        kind: "inline",
        key: "input",
        text: `(parameters total ${f.toLocaleString()} characters \u2014 too much to show \u2014 deny unless expected)`,
        unrenderable: !0,
      },
    ];
  if (k > 0)
    u.push({
      kind: "inline",
      key: "input",
      text: `(${k} parameter ${k === 1 ? "name is" : "names are"} too large to show \u2014 deny unless expected)`,
      unrenderable: !0,
    });
  let g = uniqueDisplayNames(h),
    M = entries.find(([x]) => x === "language")?.[1],
    N = 0;
  for (let [x, A] of entries) {
    if (x.length > st) continue;
    let T = g.get(x) ?? x;
    if (markBrokenSequences(x) !== x) {
      N += 1;
      continue;
    }
    if (typeof A === "string") {
      if (A.length > st) {
        let F = `(value of ${A.length.toLocaleString()} characters cannot be shown \u2014 deny unless expected)`;
        if (!Ue(T, F, void 0, d)) u.push({ kind: "block", key: T, text: F, unrenderable: !0 });
        else u.push({ kind: "inline", key: T, text: F, unrenderable: !0 });
        continue;
      }
      let b = stripUnsafeChars(A),
        E = markBrokenSequences(b);
      if (X1e.test(E) || E !== b) {
        let F = `(value of ${A.length.toLocaleString()} characters cannot be shown in full \u2014 deny unless expected)`;
        if (!Ue(T, F, void 0, d)) u.push({ kind: "block", key: T, text: F, unrenderable: !0 });
        else u.push({ kind: "inline", key: T, text: F, unrenderable: !0 });
        continue;
      }
      let replaced = E.replace(/\t/g, " ");
      if (
        E.includes(`
`) ||
        bunStringWidth(E) > PARAM_VALUE_MAX_WIDTH
      ) {
        let F = x === "code" && gi(M) ? stripUnsafeChars(M) : void 0;
        u.push({ kind: "block", key: T, text: replaced, language: F });
        continue;
      }
      let le = jsonStringify(E),
        V = t?.[x] === "date-time" && YEAR_RE.test(E) && CLOCK_TIME_RE.test(E),
        Y =
          TIMESTAMP_PARAM_KEYS.has(x) && SLACK_TS_RE.test(E)
            ? (parseLineRange(new Date(Number(E) * 1000).toISOString()) ?? void 0)
            : V || ISO_DATETIME_RE.test(E)
              ? (parseLineRange(E) ?? void 0)
              : void 0;
      if (!Ue(T, le, Y, d)) {
        let F = x === "code" && gi(M) ? stripUnsafeChars(M) : void 0;
        u.push({ kind: "block", key: T, text: replaced, annotation: Y, language: F });
        continue;
      }
      let z = CHANNEL_PARAM_KEYS.has(x)
        ? (slackChannelUrl(E) ?? void 0)
        : /^https?:\/\/\S+$/.test(E) && !hasDisplayUnsafeChar(E)
          ? E
          : void 0;
      u.push({ kind: "inline", key: T, text: le, linkUrl: z, annotation: Y });
      continue;
    }
    if (A === null || typeof A === "number" || typeof A === "boolean") {
      let b = String(A);
      if (!Ue(T, b, void 0, d)) {
        u.push({ kind: "block", key: T, text: b });
        continue;
      }
      u.push({ kind: "inline", key: T, text: b });
      continue;
    }
    let v,
      I = "",
      L = 0;
    try {
      let b = formatParamValue(A, 0);
      if (((L = b.length), b.length > st)) {
        let E = `(value of ${b.length.toLocaleString()} formatted characters cannot be shown \u2014 deny unless expected)`;
        if (!Ue(T, E, void 0, d)) u.push({ kind: "block", key: T, text: E, unrenderable: !0 });
        else u.push({ kind: "inline", key: T, text: E, unrenderable: !0 });
        continue;
      }
      ((I = stripUnsafeChars(b)), (v = markBrokenSequences(I)));
    } catch {
      if (!Ue(T, "(value too large or too deeply nested to render \u2014 deny unless expected)", void 0, d))
        u.push({
          kind: "block",
          key: T,
          text: "(value too large or too deeply nested to render \u2014 deny unless expected)",
          unrenderable: !0,
        });
      else
        u.push({
          kind: "inline",
          key: T,
          text: "(value too large or too deeply nested to render \u2014 deny unless expected)",
          unrenderable: !0,
        });
      continue;
    }
    if (((f += L), f > No))
      return [
        {
          kind: "inline",
          key: "input",
          text: `(parameters total over ${No.toLocaleString()} rendered characters \u2014 too much to show \u2014 deny unless expected)`,
          unrenderable: !0,
        },
      ];
    if (X1e.test(v) || markBrokenSequences(I) !== I) {
      let b = `(value of ${L.toLocaleString()} formatted characters cannot be shown in full \u2014 deny unless expected)`;
      if (!Ue(T, b, void 0, d)) u.push({ kind: "block", key: T, text: b, unrenderable: !0 });
      else u.push({ kind: "inline", key: T, text: b, unrenderable: !0 });
      continue;
    }
    if (
      !v.includes(`
`) &&
      Ue(T, v, void 0, d)
    )
      u.push({ kind: "inline", key: T, text: v });
    else u.push({ kind: "block", key: T, text: v, language: "javascript" });
  }
  if (N > 0)
    u.push({
      kind: "inline",
      key: "input",
      text: `(${N} parameter ${N === 1 ? "name" : "names"} cannot be shown in full \u2014 deny unless expected)`,
      unrenderable: !0,
    });
  return u;
}
//@ chunk-0e8j1zzj.js:39940-40067 placement
function canHighlightAsCode(o, t) {
  return (
    o.language !== void 0 &&
    t !== null &&
    I2o(o.text, canonicalLanguageName(o.language) ?? o.language) &&
    t.supportsLanguage(o.language)
  );
}

export { canHighlightAsCode, pn, buildParameterRows, _o, cardHeaderRows, Eo, ParameterCard };
