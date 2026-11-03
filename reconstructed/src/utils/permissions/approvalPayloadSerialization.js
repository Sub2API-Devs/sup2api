/**
 * utils/permissions/approvalPayloadSerialization.ts
 *
 * 2.1.316 新增：按预算序列化审批载荷值；为显示相同的标签消歧等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qvp68pt5.js (63)
 * attribution: placement 63
 */
import { stripNonPrintable, wrapLongLines, GRAPHEME_TRUNCATION_MARKER_RE } from "../truncateGraphemes.js";
import { truncateToLength, getFirstLine } from "../stringUtils.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth, truncate } from "../format.js";
import { jsonStringify } from "../slowOperations.js";
import { INVALID_TOOL_NAME_TEXT, identityFreeze, identityFreeze2 } from "../deepFreezePlainData.js";

//@ chunk-qvp68pt5.js:429-483 placement
var DEFAULT_IGNORABLE_CHAR_RE = /\p{Default_Ignorable_Code_Point}/u;
var FORMAT_CHAR_RE = /\p{Cf}/u;
//@ chunk-qvp68pt5.js:483-580 placement
function isPreservedJoinerCodePoint(n) {
  return (
    (n >= 8204 && n <= 8207) ||
    n === 1564 ||
    (n >= 65024 && n <= 65039) ||
    (n >= 6155 && n <= 6159) ||
    n === 10240
  );
}
//@ chunk-qvp68pt5.js:580-699 placement
function isUnsafeDisplayChar(n, t) {
  return (
    DEFAULT_IGNORABLE_CHAR_RE.test(n) ||
    n === "\u2028" ||
    n === "\u2029" ||
    n === "\u2800" ||
    (t >= 55296 && t <= 57343) ||
    t === 1109742 ||
    FORMAT_CHAR_RE.test(n)
  );
}
//@ chunk-qvp68pt5.js:699-776 placement
/**
 * 是否含需要处理的显示字符。
 */
function hasDisplayUnsafeChar(n) {
  for (let t of n) if (isUnsafeDisplayChar(t, t.codePointAt(0) ?? 0)) return true;
  return false;
}
//@ chunk-qvp68pt5.js:776-813 placement
function isReplacableUnsafeChar(n, t) {
  return isUnsafeDisplayChar(n, t) && !isPreservedJoinerCodePoint(t);
}
//@ chunk-qvp68pt5.js:813-901 placement
function replaceCharsByPredicate(n, t) {
  let e = "";
  for (let r of n) e += t(r, r.codePointAt(0) ?? 0) ? "\uFFFD" : r;
  return e;
}
//@ chunk-qvp68pt5.js:901-1103 placement
function replaceUnsafeChars(n, t) {
  let list = Array.from(n);
  let r = "";
  for (let j = 0; j < list.length; j++) {
    let i = list[j] ?? "";
    r += t(
      i,
      i.codePointAt(0) ?? 0,
      list[j - 1]?.codePointAt(0) ?? Number.NaN,
      list[j + 1]?.codePointAt(0) ?? Number.NaN,
    )
      ? "\uFFFD"
      : i;
  }
  return r;
}
//@ chunk-qvp68pt5.js:1103-1136 placement
/**
 * 去掉不安全显示字符。
 */
function stripUnsafeChars(n) {
  return stripNonPrintable(replaceCharsByPredicate(n, isReplacableUnsafeChar));
}
//@ chunk-qvp68pt5.js:1136-1167 placement
/**
 * sanitizeForDisplay：逐字符清洗后的显示文本。
 */
function sanitizeForDisplay(n) {
  return fixBrokenSequences(stripAllUnsafeDisplayChars(n));
}
//@ chunk-qvp68pt5.js:1167-1199 placement
function stripAllUnsafeDisplayChars(n) {
  return stripNonPrintable(replaceCharsByPredicate(n, isUnsafeDisplayChar));
}
//@ chunk-qvp68pt5.js:1199-1217 placement
/**
 * 显示长度上限与主机名长度上限。
 */
var MAX_DISPLAY_UNITS = 2000;
var MAX_HOSTNAME_LENGTH = 253;
//@ chunk-qvp68pt5.js:1217-1283 placement
/**
 * hostnameLengthAllowance：允许的主机名长度（末尾单个点加 1）。
 */
function hostnameLengthAllowance(n) {
  return MAX_HOSTNAME_LENGTH + (n.endsWith(".") && !n.endsWith("..") ? 1 : 0);
}
//@ chunk-qvp68pt5.js:1283-1297 placement
/**
 * 审批载荷序列化上限。
 */
var MAX_PAYLOAD_UNITS = 200000;
//@ chunk-qvp68pt5.js:1297-1335 placement
function fitsWithinUnits(n, maxUnits = MAX_DISPLAY_UNITS) {
  return truncateToLength(n, maxUnits) === n;
}
//@ chunk-qvp68pt5.js:1335-1383 placement
/**
 * 文本是否需要边栏显示（多行或过长）。
 */
function needsGutter(n) {
  return (
    n.includes(`
`) || bunStringWidth(n) > 80
  );
}
//@ chunk-qvp68pt5.js:1383-1465 placement
/**
 * truncateForDisplayText：截断到显示上限并补省略号。
 */
function truncateForDisplayText(n) {
  let t = truncateToLength(n, MAX_DISPLAY_UNITS);
  let replaced = t.replace(/\t/g, " ");
  return t === n ? replaced : `${replaced}\u2026`;
}
//@ chunk-qvp68pt5.js:1465-1551 placement
function hasVisibleWidth(n) {
  return bunStringWidth(n.replace(/[\uFE0E\uFE0F\u180B-\u180F\u2800]/gu, "").trim()) > 0;
}
//@ chunk-qvp68pt5.js:1551-1613 placement
function stripZeroWidthChars(n) {
  return Array.from(n)
    .filter((t) => hasRenderedWidth(t))
    .join("");
}
//@ chunk-qvp68pt5.js:1613-1686 placement
function hasRenderedWidth(n) {
  return bunStringWidth(n.replace(/[\uFE0E\uFE0F\u180B-\u180F]/gu, "")) > 0;
}
//@ chunk-qvp68pt5.js:1686-1705 placement
var MAX_ZERO_WIDTH_RUN = 8;
var COMBINING_MARK_RE = /\p{M}/u;
//@ chunk-qvp68pt5.js:1705-1745 placement
/**
 * isCombiningOrZeroWidth：组合标记或无渲染宽度。
 */
function isCombiningOrZeroWidth(n) {
  return COMBINING_MARK_RE.test(n) || !hasRenderedWidth(n);
}
//@ chunk-qvp68pt5.js:1745-1953 placement
/**
 * 用替换字符标记残缺序列。
 */
function markBrokenSequences(n) {
  let t = "";
  let e = 0;
  let r = false;
  for (let o of n) {
    if (
      o ===
      `
`
    ) {
      if (r) {
        t += "\uFFFD";
        r = false;
      }
      t += o;
      e = 0;
      continue;
    }
    if (!isCombiningOrZeroWidth(o)) {
      if (r) {
        t += "\uFFFD";
        r = false;
      }
      t += o;
      e = 0;
      continue;
    }
    if (e < MAX_ZERO_WIDTH_RUN) {
      t += o;
      e++;
      continue;
    }
    r = true;
  }
  return r ? `${t}\uFFFD` : t;
}
//@ chunk-qvp68pt5.js:1953-1984 placement
function fixBrokenSequences(n) {
  return stripNonPrintable(markBrokenSequences(n));
}
//@ chunk-qvp68pt5.js:1984-2120 placement
function trimToVisible(n) {
  let list = Array.from(n);
  let e = 0;
  let r = list.length;
  while (e < r && !hasVisibleWidth(list[e] ?? "")) e++;
  while (r > e && !hasVisibleWidth(list[r - 1] ?? "")) r--;
  return list.slice(e, r).join("");
}
//@ chunk-qvp68pt5.js:2120-2190 placement
function firstOrLastVisibleChar(n, t) {
  let list = Array.from(trimToVisible(n));
  return t === "end" ? list.at(-1) : list[0];
}
//@ chunk-qvp68pt5.js:2190-2233 placement
function endsWithEllipsis(n) {
  return firstOrLastVisibleChar(n, "end") === "\u2026";
}
//@ chunk-qvp68pt5.js:2233-2403 placement
/**
 * 去掉末尾的省略号（及其后的不可见字符），可连续多个。
 */
function stripTrailingEllipsis(n) {
  let list = Array.from(n);
  let e = list.length;
  for (;;) {
    let r = e;
    while (r > 0 && !hasVisibleWidth(list[r - 1] ?? "")) r--;
    if (r > 0 && list[r - 1] === "\u2026") {
      e = r - 1;
      continue;
    }
    break;
  }
  return list.slice(0, e).join("");
}
//@ chunk-qvp68pt5.js:2403-2563 placement
/**
 * 文本是否干净（无替换字符）。
 */
function isCleanText(n) {
  let t = [];
  let e = false;
  for (let r of Array.from(n)) {
    if (
      r !==
        `
` &&
      !hasVisibleWidth(r)
    ) {
      e = true;
      continue;
    }
    if (r === "\uFFFD" && e) {
      e = false;
      continue;
    }
    e = false;
    t.push(r);
  }
  return hasVisibleWidth(t.join(""));
}
//@ chunk-qvp68pt5.js:2563-2612 placement
function isIdentifierName(n) {
  return /^[A-Za-z_$][\w$]*$/.test(n);
}
//@ chunk-qvp68pt5.js:2612-2642 placement
/**
 * renderableText：清洗后可直接显示的文本。
 */
function renderableText(n) {
  return sanitizeForDisplay(n);
}
//@ chunk-qvp68pt5.js:2642-2832 placement
/**
 * 清洗用于显示的文本：变体选择符、零宽连接符、蒙古文变体选择符按上下文保留，其余不安全字符替换为 U+FFFD，再去掉不可打印字符。
 */
function sanitizeDisplayText(n) {
  return fixBrokenSequences(
    stripNonPrintable(
      replaceUnsafeChars(n, (t, e, r, o) => {
        if (e === 65038 || e === 65039) return !(r > 127 || o === 8419);
        if (e === 8204 || e === 8205) return !(r > 127 && o > 127);
        if (e >= 6155 && e <= 6159) return !(r > 127);
        return isUnsafeDisplayChar(t, e);
      }),
    ),
  );
}
//@ chunk-qvp68pt5.js:2832-2955 placement
/**
 * 是否有可见文本。
 */
function hasVisibleText(n) {
  if (n === undefined) return false;
  let trimmed = sanitizeForDisplay(n)
    .replace(/\uFFFD/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed !== "" && bunStringWidth(trimmed) > 0;
}
//@ chunk-qvp68pt5.js:2955-2973 placement
/**
 * 短标签宽度与截断长度。
 */
var SHORT_LABEL_WIDTH = 48;
var MAX_RAW_DISPLAY_CHARS = 256;
//@ chunk-qvp68pt5.js:2973-3076 placement
/**
 * 生成短标签。
 */
function shortLabel(n) {
  let t = renderableText(truncateToLength(n, MAX_RAW_DISPLAY_CHARS));
  let trimmed = t.replace(/\s+/g, " ").trim();
  return truncateToWidth(quoteIfAmbiguous(trimmed, t, n.length > MAX_RAW_DISPLAY_CHARS), SHORT_LABEL_WIDTH);
}
//@ chunk-qvp68pt5.js:3076-3176 placement
/**
 * 值与原文相同且原文无引号、不含特殊字符时原样返回，否则返回 JSON 字符串形式。
 */
function quoteIfAmbiguous(n, t, e = false) {
  let r =
    firstOrLastVisibleChar(n, "start") === '"' ||
    firstOrLastVisibleChar(n, "end") === '"' ||
    endsWithEllipsis(n);
  return n === t && !r && !e ? n : jsonStringify(t);
}
//@ chunk-qvp68pt5.js:3176-3269 placement
function makeShortLabel(n) {
  let t = renderableText(truncateToLength(n, MAX_RAW_DISPLAY_CHARS));
  let trimmed = t.replace(/\s+/g, " ").trim();
  return quoteIfAmbiguous(trimmed, t, n.length > MAX_RAW_DISPLAY_CHARS);
}
//@ chunk-qvp68pt5.js:3269-3305 placement
/**
 * 是否在标签长度内。
 */
function fitsLabelLimit(n) {
  return truncateToLength(n, MAX_RAW_DISPLAY_CHARS) === n;
}
//@ chunk-qvp68pt5.js:3305-3754 placement
/**
 * 为显示相同的标签消歧。
 */
function disambiguateLabels(n, t) {
  let e = new Map();
  let r = (s) => t(s).normalize("NFC");
  for (let s of n) {
    let a = r(s);
    let u = e.get(a) ?? new Set();
    u.add(s);
    e.set(a, u);
  }
  let o = (s) =>
    jsonStringify(truncateToLength(s, MAX_DISPLAY_UNITS)).replace(
      /[\u007f-\uffff]/g,
      (a) => `\\u${a.charCodeAt(0).toString(16).padStart(4, "0")}`,
    ) + (s.length > MAX_DISPLAY_UNITS ? "\u2026" : "");
  let i = new Map();
  return n.map((s) => {
    let a = r(s);
    if ((e.get(a)?.size ?? 0) <= 1) return t(s);
    let u = o(s);
    let l = i.get(u) ?? new Map();
    i.set(u, l);
    let c = l.get(s) ?? l.size + 1;
    l.set(s, c);
    return c > 1 ? `${u} (#${c})` : u;
  });
}
//@ chunk-qvp68pt5.js:3754-4102 placement
/**
 * 生成唯一的显示名。
 */
function uniqueDisplayNames(cwd) {
  let t = new Map();
  for (let i of cwd) t.set(i, isIdentifierName(i) ? i : jsonStringify(sanitizeForDisplay(i)));
  let e = new Map();
  for (let i of t.values()) e.set(i, (e.get(i) ?? 0) + 1);
  let nfcCollisions = findNfcCollisions(cwd);
  let o = new Map();
  for (let i of cwd) {
    let s = t.get(i) ?? "";
    let a = (e.get(s) ?? 0) > 1 || nfcCollisions.has(i.normalize("NFC"));
    o.set(
      i,
      a
        ? jsonStringify(i).replace(
            /[\u007f-\uffff]/g,
            (u) => `\\u${u.charCodeAt(0).toString(16).padStart(4, "0")}`,
          )
        : s,
    );
  }
  return o;
}
//@ chunk-qvp68pt5.js:4102-4247 placement = setCwdState (1)
function findNfcCollisions(cwd) {
  let t = new Map();
  let e = new Set();
  for (let r of cwd) {
    let normalized = r.normalize("NFC");
    let i = t.get(normalized);
    if (i !== undefined && i !== r) e.add(normalized);
    else t.set(normalized, r);
  }
  return e;
}
//@ chunk-qvp68pt5.js:4247-4315 placement
/**
 * 标签或空串。
 */
function labelOrEmpty(n) {
  return typeof n === "string" && hasNoVisibleText(n) ? "" : String(safeLabel(n));
}
//@ chunk-qvp68pt5.js:4315-4391 placement
/**
 * 安全的标签文本。
 */
function safeLabel(n) {
  let t = typeof n === "string" && !hasNoVisibleText(n) ? n : INVALID_TOOL_NAME_TEXT;
  return identityFreeze(shortLabel(t));
}
//@ chunk-qvp68pt5.js:4391-4439 placement
/**
 * hasNoVisibleText：字符串为空或没有可见宽度。
 */
function hasNoVisibleText(n) {
  return n === "" || bunStringWidth(truncateToLength(n, MAX_RAW_DISPLAY_CHARS)) === 0;
}
//@ chunk-qvp68pt5.js:4439-4526 placement
function humanizeSnakeCase(n) {
  return n
    .replace(/_+/g, " ")
    .trim()
    .replace(/\b\w/g, (t) => t.toUpperCase());
}
//@ chunk-qvp68pt5.js:4526-4848 placement
/**
 * MCP 服务器的显示标签。
 */
function mcpServerLabel(mcpInfo) {
  let t = truncateToLength(
    (mcpInfo.scope === "claudeai" ? mcpInfo.displayName : undefined) ?? "",
    MAX_RAW_DISPLAY_CHARS,
  );
  let e = truncateToLength(mcpInfo.title ?? "", MAX_RAW_DISPLAY_CHARS);
  let r = sanitizeDisplayText(truncateToLength(mcpInfo.serverName, MAX_RAW_DISPLAY_CHARS));
  let o = hasVisibleText(t) ? sanitizeDisplayText(t) : isCleanText(r) ? r : "(unnamed server)";
  let i = truncateToLength(mcpInfo.toolName, MAX_RAW_DISPLAY_CHARS);
  let s = renderableText(humanizeSnakeCase(i));
  let a = renderableText(i);
  let u = hasVisibleText(e)
    ? sanitizeDisplayText(e)
    : isCleanText(s)
      ? s
      : isCleanText(a)
        ? a
        : "(unnamed tool)";
  return identityFreeze(truncateToWidth(`${o} \u2014 ${u}`.replace(/\s+/g, " ").trim(), SHORT_LABEL_WIDTH));
}
//@ chunk-qvp68pt5.js:4848-4900 placement
/**
 * displayLabelOrUnnamedTool：标签或 “(unnamed tool)” 回退。
 */
function displayLabelOrUnnamedTool(n) {
  return identityFreeze(labelOr(n, "(unnamed tool)"));
}
//@ chunk-qvp68pt5.js:4900-4948 placement
/**
 * 标签干净时用它，否则用回退值。
 */
function labelOr(n, t) {
  let e = shortLabel(n);
  return isCleanText(e) ? e : t;
}
//@ chunk-qvp68pt5.js:4948-5080 placement
/**
 * 审批显示字段（文本与是否需边栏）。
 */
function displayField(n) {
  if (typeof n !== "string")
    return {
      text: identityFreeze(""),
      needsGutter: false,
    };
  let t = fixBrokenSequences(stripUnsafeChars(truncateForDisplayText(n)));
  return {
    text: identityFreeze(t),
    needsGutter: needsGutter(t),
  };
}
//@ chunk-qvp68pt5.js:5080-5230 placement
/**
 * 简单文本的显示形式（不安全时 null）。
 */
function plainDisplay(n) {
  if (typeof n !== "string") return null;
  if (!fitsLabelLimit(n) || n.trim() === "" || bunStringWidth(n) === 0) return null;
  if (markBrokenSequences(n) !== n) return null;
  return {
    display: identityFreeze(makeShortLabel(n)),
  };
}
//@ chunk-qvp68pt5.js:5230-5329 placement
var WITHHELD_VALUE_TEXT = "(value cannot be shown in full \u2014 approval withheld; one-time options only)";
var MAX_PAYLOAD_ELEMENTS = 1e4;
var MAX_PAYLOAD_DEPTH = 64;
//@ chunk-qvp68pt5.js:5329-7263 placement
/**
 * 按预算序列化审批载荷值。
 */
function serializePayloadValue(n, t, e = 0) {
  if (typeof n === "string") {
    if (n.length + 2 > t.unitsRemaining) throw Error("payload exceeds the serialization budget");
    let i = jsonStringify(n);
    t.unitsRemaining -= i.length;
    if (t.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    return i;
  }
  if (typeof n === "number") {
    let i = Number.isFinite(n) ? String(n) : "null";
    t.unitsRemaining -= i.length;
    if (t.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    return i;
  }
  if (typeof n === "boolean" || n === null) {
    t.unitsRemaining -= String(n).length;
    if (t.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    return String(n);
  }
  if (typeof n === "bigint") throw Error("bigint payload cannot be serialized");
  if (typeof n !== "object") return;
  if (e >= MAX_PAYLOAD_DEPTH) throw Error("payload exceeds the serialization depth wall");
  if (Array.isArray(n)) {
    let i = n.length;
    if (typeof i !== "number" || !Number.isSafeInteger(i) || i < 0)
      throw Error("payload length is not an honest array length");
    t.elementsRemaining -= i;
    if (t.elementsRemaining < 0) throw Error("payload exceeds the element serialization wall");
    t.unitsRemaining -= 2 + (i > 0 ? i - 1 : 0);
    if (t.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    let s = [];
    for (let j = 0; j < i; j++) {
      let u = serializePayloadValue(n[j], t, e + 1);
      if (u === undefined) {
        t.unitsRemaining -= 4;
        if (t.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
        s.push("null");
      } else s.push(u);
    }
    return `[${s.join(",")}]`;
  }
  let entries = Object.entries(n);
  t.elementsRemaining -= entries.length;
  if (t.elementsRemaining < 0) throw Error("payload exceeds the element serialization wall");
  t.unitsRemaining -= 2;
  if (t.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
  let o = [];
  for (let [i, s] of entries) {
    let a = serializePayloadValue(s, t, e + 1);
    if (a === undefined) continue;
    if (i.length + 2 > t.unitsRemaining) throw Error("payload exceeds the serialization budget");
    let u = jsonStringify(i);
    t.unitsRemaining -= u.length + 1 + (o.length > 0 ? 1 : 0);
    if (t.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    o.push(`${u}:${a}`);
  }
  return `{${o.join(",")}}`;
}
//@ chunk-qvp68pt5.js:7263-7357 placement
/**
 * serializePayloadSafely：序列化审批载荷，超限时返回 undefined。
 */
function serializePayloadSafely(
  n,
  unitsRemaining = MAX_DISPLAY_UNITS,
  elementsRemaining = MAX_PAYLOAD_ELEMENTS,
) {
  try {
    return serializePayloadValue(n, {
      unitsRemaining,
      elementsRemaining,
    });
  } catch {
    return;
  }
}
//@ chunk-qvp68pt5.js:7357-7801 placement
/**
 * 序列化审批载荷（完整/截断/隐藏）。
 */
function serializeApprovalPayload(n, t) {
  let e = typeof n === "string" ? n : serializePayloadSafely(n, t?.maxUnits);
  if (e === undefined)
    return {
      kind: "withheld",
      marker: identityFreeze(WITHHELD_VALUE_TEXT),
    };
  if (!fitsWithinUnits(e, t?.maxUnits))
    return {
      kind: "withheld",
      marker: identityFreeze(WITHHELD_VALUE_TEXT),
    };
  let r = t?.softWrap ? wrapLongLines(e) : e;
  let replaced = (t?.scrub === "key" ? stripAllUnsafeDisplayChars(r) : stripUnsafeChars(r)).replace(
    /\t/g,
    " ",
  );
  let i = t?.softWrap
    ? replaced.replaceAll(
        `
`,
        "",
      )
    : replaced;
  if (GRAPHEME_TRUNCATION_MARKER_RE.test(i))
    return {
      kind: "withheld",
      marker: identityFreeze(WITHHELD_VALUE_TEXT),
    };
  if (markBrokenSequences(replaced) !== replaced)
    return {
      kind: "withheld",
      marker: identityFreeze(WITHHELD_VALUE_TEXT),
    };
  return {
    kind: "full",
    text: identityFreeze(replaced),
    needsGutter: needsGutter(replaced),
  };
}
//@ chunk-qvp68pt5.js:7801-7853 placement
/**
 * 文本是否含可疑字符。
 */
function hasSuspiciousText(n) {
  let t = stripUnsafeChars(n);
  return GRAPHEME_TRUNCATION_MARKER_RE.test(t) || markBrokenSequencesChanged(t);
}
//@ chunk-qvp68pt5.js:7853-7885 placement
/**
 * hasBrokenSequences：去掉不安全字符后是否仍有残缺序列。
 */
function hasBrokenSequences(n) {
  return markBrokenSequencesChanged(stripUnsafeChars(n));
}
//@ chunk-qvp68pt5.js:7885-7916 placement
function markBrokenSequencesChanged(n) {
  return markBrokenSequences(n) !== n;
}
//@ chunk-qvp68pt5.js:7916-8142 placement
/**
 * 列表类文本的标签。
 */
function listLabel(n) {
  let t = renderableText(truncateToLength(n, MAX_RAW_DISPLAY_CHARS));
  let trimmed = t.replace(/\s+/g, " ").trim();
  return quoteIfAmbiguous(
    trimmed,
    t,
    trimmed.includes(",") ||
      trimmed.includes(";") ||
      stripZeroWidthChars(trimmed).includes(" and ") ||
      stripZeroWidthChars(trimmed).startsWith("and ") ||
      stripZeroWidthChars(trimmed).endsWith(" and") ||
      n.length > MAX_RAW_DISPLAY_CHARS ||
      markBrokenSequences(truncateToLength(n, MAX_RAW_DISPLAY_CHARS)) !==
        truncateToLength(n, MAX_RAW_DISPLAY_CHARS),
  );
}
//@ chunk-qvp68pt5.js:8142-8194 placement
/**
 * 消歧后的标签列表。
 */
function uniqueLabels(n, t = makeShortLabel) {
  return disambiguateLabels(n, t).map((e) => identityFreeze(e));
}
//@ chunk-qvp68pt5.js:8194-8258 placement
/**
 * 把换行替换为替换字符。
 */
function replaceLineBreaks(n) {
  return n.replace(/[\n\r\u2028\u2029]/g, "\uFFFD");
}
//@ chunk-qvp68pt5.js:8258-8645 placement
/**
 * 序列化审批列表。
 */
function serializeApprovalList(n, t) {
  let mapped = n.map((l) => serializeApprovalPayload(l, t));
  let r = new Map();
  n.forEach((l, c) => {
    let y = mapped[c];
    if (y.kind === "full" && !r.has(l)) r.set(l, replaceLineBreaks(y.text).replace(/\s+/g, " ").trim());
  });
  let filtered = n.filter((l, c) => mapped[c].kind === "full");
  let i = uniqueLabels(filtered, (l) => r.get(l) ?? "");
  let s = [];
  let a = 0;
  let u = 0;
  for (let l of mapped)
    if (l.kind === "full")
      s.push({
        text: String(i[a++]),
        withheld: false,
      });
    else {
      u += 1;
      s.push({
        text: `${l.marker} (#${u})`,
        withheld: true,
      });
    }
  return s;
}
//@ chunk-qvp68pt5.js:8645-8717 placement
/**
 * 显示文本。
 */
function displayText(n) {
  if (typeof n !== "string") return identityFreeze2("");
  return identityFreeze2(stripUnsafeChars(n));
}
//@ chunk-qvp68pt5.js:8717-8880 placement
/**
 * 把字符串转为审批界面标签：清洗、制表符换空格、首行须干净且无歧义，再截断到 24 字符。
 */
function toApprovalLabel(n) {
  if (typeof n !== "string") return null;
  let replaced = sanitizeDisplayText(truncateToLength(n, MAX_RAW_DISPLAY_CHARS)).replace(/\t/g, " ");
  if (!isCleanText(getFirstLine(replaced))) return null;
  if (endsWithEllipsis(getFirstLine(replaced))) return null;
  return identityFreeze(truncate(replaced, 24, true));
}
//@ chunk-qvp68pt5.js:8880-8983 placement
/**
 * 模板标签函数：拼接模板片段与插值（空值视为空串）后做规整。
 */
function approvalLabelTemplate(n, ...t) {
  let e = n[0] ?? "";
  for (let i = 0; i < t.length; i++) {
    e += t[i] ?? "";
    e += n[i + 1] ?? "";
  }
  return identityFreeze(e);
}
export {
  fitsLabelLimit,
  hasDisplayUnsafeChar,
  listLabel,
  disambiguateLabels,
  uniqueLabels,
  needsGutter,
  displayField,
  markBrokenSequences,
  uniqueDisplayNames,
  stripUnsafeChars,
  hasVisibleText,
  SHORT_LABEL_WIDTH,
  serializeApprovalPayload,
  replaceLineBreaks,
  toApprovalLabel,
  sanitizeForDisplay,
  renderableText,
  isCleanText,
  stripTrailingEllipsis,
  labelOr,
  labelOrEmpty,
  MAX_PAYLOAD_UNITS,
  hostnameLengthAllowance,
  plainDisplay,
  hasNoVisibleText,
  safeLabel,
  hasSuspiciousText,
  displayText,
  MAX_RAW_DISPLAY_CHARS,
  quoteIfAmbiguous,
  approvalLabelTemplate,
  serializePayloadSafely,
  displayLabelOrUnnamedTool,
  sanitizeDisplayText,
  isCombiningOrZeroWidth,
  MAX_DISPLAY_UNITS,
  truncateForDisplayText,
  shortLabel,
  mcpServerLabel,
  serializeApprovalList,
  hasBrokenSequences,
};
