/**
 * utils/permissions/approvalPayloadSerialization.ts
 *
 * 2.1.316 新增：按预算序列化审批载荷值；为显示相同的标签消歧等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b73m1002.js (63)
 * attribution: placement 63
 */
import { stripNonPrintable, wrapLongLines, GRAPHEME_TRUNCATION_MARKER_RE } from "../truncateGraphemes.js";
import { truncateToLength, getFirstLine } from "../stringUtils.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth, truncate } from "../format.js";
import { jsonStringify } from "../slowOperations.js";
import { INVALID_TOOL_NAME_TEXT } from "../../components/permissions/consentRows.js";
import { identityFreeze, identityFreeze2 } from "../deepFreezePlainData.js";

//@ chunk-b73m1002.js:428-482 placement
var DEFAULT_IGNORABLE_CHAR_RE = /\p{Default_Ignorable_Code_Point}/u;
var FORMAT_CHAR_RE = /\p{Cf}/u;
//@ chunk-b73m1002.js:482-579 placement
function isPreservedJoinerCodePoint(codePoint) {
  return (
    (codePoint >= 8204 && codePoint <= 8207) ||
    codePoint === 1564 ||
    (codePoint >= 65024 && codePoint <= 65039) ||
    (codePoint >= 6155 && codePoint <= 6159) ||
    codePoint === 10240
  );
}
//@ chunk-b73m1002.js:579-698 placement
function isUnsafeDisplayChar(char, codePoint) {
  return (
    DEFAULT_IGNORABLE_CHAR_RE.test(char) ||
    char === "\u2028" ||
    char === "\u2029" ||
    char === "\u2800" ||
    (codePoint >= 55296 && codePoint <= 57343) ||
    codePoint === 1109742 ||
    FORMAT_CHAR_RE.test(char)
  );
}
//@ chunk-b73m1002.js:698-775 placement
/**
 * 是否含需要处理的显示字符。
 */
function hasDisplayUnsafeChar(text) {
  for (let char of text) if (isUnsafeDisplayChar(char, char.codePointAt(0) ?? 0)) return true;
  return false;
}
//@ chunk-b73m1002.js:775-812 placement
function isReplacableUnsafeChar(char, codePoint) {
  return isUnsafeDisplayChar(char, codePoint) && !isPreservedJoinerCodePoint(codePoint);
}
//@ chunk-b73m1002.js:812-900 placement
function replaceCharsByPredicate(text, shouldReplace) {
  let result = "";
  for (let char of text) result += shouldReplace(char, char.codePointAt(0) ?? 0) ? "\uFFFD" : char;
  return result;
}
//@ chunk-b73m1002.js:900-1102 placement
function replaceUnsafeChars(text, shouldReplace) {
  let list = Array.from(text);
  let result = "";
  for (let j = 0; j < list.length; j++) {
    let char = list[j] ?? "";
    result += shouldReplace(
      char,
      char.codePointAt(0) ?? 0,
      list[j - 1]?.codePointAt(0) ?? Number.NaN,
      list[j + 1]?.codePointAt(0) ?? Number.NaN,
    )
      ? "\uFFFD"
      : char;
  }
  return result;
}
//@ chunk-b73m1002.js:1102-1135 placement
/**
 * 去掉不安全显示字符。
 */
function stripUnsafeChars(text) {
  return stripNonPrintable(replaceCharsByPredicate(text, isReplacableUnsafeChar));
}
//@ chunk-b73m1002.js:1135-1166 placement
/**
 * sanitizeForDisplay：逐字符清洗后的显示文本。
 */
function sanitizeForDisplay(text) {
  return fixBrokenSequences(stripAllUnsafeDisplayChars(text));
}
//@ chunk-b73m1002.js:1166-1198 placement
function stripAllUnsafeDisplayChars(text) {
  return stripNonPrintable(replaceCharsByPredicate(text, isUnsafeDisplayChar));
}
//@ chunk-b73m1002.js:1198-1216 placement
/**
 * 显示长度上限与主机名长度上限。
 */
var MAX_DISPLAY_UNITS = 2000;
var MAX_HOSTNAME_LENGTH = 253;
//@ chunk-b73m1002.js:1216-1282 placement
/**
 * hostnameLengthAllowance：允许的主机名长度（末尾单个点加 1）。
 */
function hostnameLengthAllowance(hostname) {
  return MAX_HOSTNAME_LENGTH + (hostname.endsWith(".") && !hostname.endsWith("..") ? 1 : 0);
}
//@ chunk-b73m1002.js:1282-1296 placement
/**
 * 审批载荷序列化上限。
 */
var MAX_PAYLOAD_UNITS = 200000;
//@ chunk-b73m1002.js:1296-1333 placement
function fitsWithinUnits(text, maxUnits = MAX_DISPLAY_UNITS) {
  return truncateToLength(text, maxUnits) === text;
}
//@ chunk-b73m1002.js:1333-1381 placement
/**
 * 文本是否需要边栏显示（多行或过长）。
 */
function needsGutter(text) {
  return (
    text.includes(`
`) || bunStringWidth(text) > 80
  );
}
//@ chunk-b73m1002.js:1381-1462 placement
/**
 * truncateForDisplayText：截断到显示上限并补省略号。
 */
function truncateForDisplayText(text) {
  let truncated = truncateToLength(text, MAX_DISPLAY_UNITS);
  let replaced = truncated.replace(/\t/g, " ");
  return truncated === text ? replaced : `${replaced}\u2026`;
}
//@ chunk-b73m1002.js:1462-1548 placement
function hasVisibleWidth(text) {
  return bunStringWidth(text.replace(/[\uFE0E\uFE0F\u180B-\u180F\u2800]/gu, "").trim()) > 0;
}
//@ chunk-b73m1002.js:1548-1610 placement
function stripZeroWidthChars(text) {
  return Array.from(text)
    .filter((char) => hasRenderedWidth(char))
    .join("");
}
//@ chunk-b73m1002.js:1610-1683 placement
function hasRenderedWidth(char) {
  return bunStringWidth(char.replace(/[\uFE0E\uFE0F\u180B-\u180F]/gu, "")) > 0;
}
//@ chunk-b73m1002.js:1683-1704 placement
var MAX_ZERO_WIDTH_RUN = 8;
var COMBINING_MARK_RE = /\p{M}/u;
//@ chunk-b73m1002.js:1704-1744 placement
/**
 * isCombiningOrZeroWidth：组合标记或无渲染宽度。
 */
function isCombiningOrZeroWidth(char) {
  return COMBINING_MARK_RE.test(char) || !hasRenderedWidth(char);
}
//@ chunk-b73m1002.js:1744-1954 placement
/**
 * 用替换字符标记残缺序列。
 */
function markBrokenSequences(text) {
  let result = "";
  let runLength = 0;
  let pendingReplacement = false;
  for (let char of text) {
    if (
      char ===
      `
`
    ) {
      if (pendingReplacement) {
        result += "\uFFFD";
        pendingReplacement = false;
      }
      result += char;
      runLength = 0;
      continue;
    }
    if (!isCombiningOrZeroWidth(char)) {
      if (pendingReplacement) {
        result += "\uFFFD";
        pendingReplacement = false;
      }
      result += char;
      runLength = 0;
      continue;
    }
    if (runLength < MAX_ZERO_WIDTH_RUN) {
      result += char;
      runLength++;
      continue;
    }
    pendingReplacement = true;
  }
  return pendingReplacement ? `${result}\uFFFD` : result;
}
//@ chunk-b73m1002.js:1954-1985 placement
function fixBrokenSequences(text) {
  return stripNonPrintable(markBrokenSequences(text));
}
//@ chunk-b73m1002.js:1985-2121 placement
function trimToVisible(text) {
  let list = Array.from(text);
  let start = 0;
  let end = list.length;
  while (start < end && !hasVisibleWidth(list[start] ?? "")) start++;
  while (end > start && !hasVisibleWidth(list[end - 1] ?? "")) end--;
  return list.slice(start, end).join("");
}
//@ chunk-b73m1002.js:2121-2191 placement
function firstOrLastVisibleChar(text, edge) {
  let list = Array.from(trimToVisible(text));
  return edge === "end" ? list.at(-1) : list[0];
}
//@ chunk-b73m1002.js:2191-2234 placement
function endsWithEllipsis(text) {
  return firstOrLastVisibleChar(text, "end") === "\u2026";
}
//@ chunk-b73m1002.js:2234-2404 placement
/**
 * 去掉末尾的省略号（及其后的不可见字符），可连续多个。
 */
function stripTrailingEllipsis(text) {
  let list = Array.from(text);
  let end = list.length;
  for (;;) {
    let index = end;
    while (index > 0 && !hasVisibleWidth(list[index - 1] ?? "")) index--;
    if (index > 0 && list[index - 1] === "\u2026") {
      end = index - 1;
      continue;
    }
    break;
  }
  return list.slice(0, end).join("");
}
//@ chunk-b73m1002.js:2404-2564 placement
/**
 * 文本是否干净（无替换字符）。
 */
function isCleanText(text) {
  let visible = [];
  let skippingHidden = false;
  for (let char of Array.from(text)) {
    if (
      char !==
        `
` &&
      !hasVisibleWidth(char)
    ) {
      skippingHidden = true;
      continue;
    }
    if (char === "\uFFFD" && skippingHidden) {
      skippingHidden = false;
      continue;
    }
    skippingHidden = false;
    visible.push(char);
  }
  return hasVisibleWidth(visible.join(""));
}
//@ chunk-b73m1002.js:2564-2613 placement
function isIdentifierName(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name);
}
//@ chunk-b73m1002.js:2613-2643 placement
/**
 * renderableText：清洗后可直接显示的文本。
 */
function renderableText(text) {
  return sanitizeForDisplay(text);
}
//@ chunk-b73m1002.js:2643-2833 placement
/**
 * 清洗用于显示的文本：变体选择符、零宽连接符、蒙古文变体选择符按上下文保留，其余不安全字符替换为 U+FFFD，再去掉不可打印字符。
 */
function sanitizeDisplayText(text) {
  return fixBrokenSequences(
    stripNonPrintable(
      replaceUnsafeChars(text, (char, codePoint, prevCodePoint, nextCodePoint) => {
        if (codePoint === 65038 || codePoint === 65039)
          return !(prevCodePoint > 127 || nextCodePoint === 8419);
        if (codePoint === 8204 || codePoint === 8205) return !(prevCodePoint > 127 && nextCodePoint > 127);
        if (codePoint >= 6155 && codePoint <= 6159) return !(prevCodePoint > 127);
        return isUnsafeDisplayChar(char, codePoint);
      }),
    ),
  );
}
//@ chunk-b73m1002.js:2833-2956 placement
/**
 * 是否有可见文本。
 */
function hasVisibleText(text) {
  if (text === undefined) return false;
  let trimmed = sanitizeForDisplay(text)
    .replace(/\uFFFD/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed !== "" && bunStringWidth(trimmed) > 0;
}
//@ chunk-b73m1002.js:2956-2974 placement
/**
 * 短标签宽度与截断长度。
 */
var SHORT_LABEL_WIDTH = 48;
var MAX_RAW_DISPLAY_CHARS = 256;
//@ chunk-b73m1002.js:2974-3076 placement
/**
 * 生成短标签。
 */
function shortLabel(text) {
  let rendered = renderableText(truncateToLength(text, MAX_RAW_DISPLAY_CHARS));
  let trimmed = rendered.replace(/\s+/g, " ").trim();
  return truncateToWidth(
    quoteIfAmbiguous(trimmed, rendered, text.length > MAX_RAW_DISPLAY_CHARS),
    SHORT_LABEL_WIDTH,
  );
}
//@ chunk-b73m1002.js:3076-3176 placement
/**
 * 值与原文相同且原文无引号、不含特殊字符时原样返回，否则返回 JSON 字符串形式。
 */
function quoteIfAmbiguous(label, rawLabel, wasTruncated = false) {
  let isAmbiguous =
    firstOrLastVisibleChar(label, "start") === '"' ||
    firstOrLastVisibleChar(label, "end") === '"' ||
    endsWithEllipsis(label);
  return label === rawLabel && !isAmbiguous && !wasTruncated ? label : jsonStringify(rawLabel);
}
//@ chunk-b73m1002.js:3176-3268 placement
function makeShortLabel(text) {
  let rendered = renderableText(truncateToLength(text, MAX_RAW_DISPLAY_CHARS));
  let trimmed = rendered.replace(/\s+/g, " ").trim();
  return quoteIfAmbiguous(trimmed, rendered, text.length > MAX_RAW_DISPLAY_CHARS);
}
//@ chunk-b73m1002.js:3268-3303 placement
/**
 * 是否在标签长度内。
 */
function fitsLabelLimit(text) {
  return truncateToLength(text, MAX_RAW_DISPLAY_CHARS) === text;
}
//@ chunk-b73m1002.js:3303-3751 placement
/**
 * 为显示相同的标签消歧。
 */
function disambiguateLabels(labels, format) {
  let byNormalized = new Map();
  let normalizeLabel = (label) => format(label).normalize("NFC");
  for (let label of labels) {
    let normalized = normalizeLabel(label);
    let group = byNormalized.get(normalized) ?? new Set();
    group.add(label);
    byNormalized.set(normalized, group);
  }
  let escapeLabel = (label) =>
    jsonStringify(truncateToLength(label, MAX_DISPLAY_UNITS)).replace(
      /[\u007f-\uffff]/g,
      (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
    ) + (label.length > MAX_DISPLAY_UNITS ? "\u2026" : "");
  let usedSuffixes = new Map();
  return labels.map((label) => {
    let normalized = normalizeLabel(label);
    if ((byNormalized.get(normalized)?.size ?? 0) <= 1) return format(label);
    let escaped = escapeLabel(label);
    let suffixByLabel = usedSuffixes.get(escaped) ?? new Map();
    usedSuffixes.set(escaped, suffixByLabel);
    let suffix = suffixByLabel.get(label) ?? suffixByLabel.size + 1;
    suffixByLabel.set(label, suffix);
    return suffix > 1 ? `${escaped} (#${suffix})` : escaped;
  });
}
//@ chunk-b73m1002.js:3751-4099 placement
/**
 * 生成唯一的显示名。
 */
function uniqueDisplayNames(cwd) {
  let labels = new Map();
  for (let name of cwd)
    labels.set(name, isIdentifierName(name) ? name : jsonStringify(sanitizeForDisplay(name)));
  let counts = new Map();
  for (let label of labels.values()) counts.set(label, (counts.get(label) ?? 0) + 1);
  let nfcCollisions = findNfcCollisions(cwd);
  let result = new Map();
  for (let name of cwd) {
    let label = labels.get(name) ?? "";
    let isAmbiguous = (counts.get(label) ?? 0) > 1 || nfcCollisions.has(name.normalize("NFC"));
    result.set(
      name,
      isAmbiguous
        ? jsonStringify(name).replace(
            /[\u007f-\uffff]/g,
            (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
          )
        : label,
    );
  }
  return result;
}
//@ chunk-b73m1002.js:4099-4244 placement (2.1.88 match: setCwdState, 1)
function findNfcCollisions(cwd) {
  let firstByName = new Map();
  let collisions = new Set();
  for (let name of cwd) {
    let normalized = name.normalize("NFC");
    let existing = firstByName.get(normalized);
    if (existing !== undefined && existing !== name) collisions.add(normalized);
    else firstByName.set(normalized, name);
  }
  return collisions;
}
//@ chunk-b73m1002.js:4244-4312 placement
/**
 * 标签或空串。
 */
function labelOrEmpty(label) {
  return typeof label === "string" && hasNoVisibleText(label) ? "" : String(safeLabel(label));
}
//@ chunk-b73m1002.js:4312-4388 placement
/**
 * 安全的标签文本。
 */
function safeLabel(label) {
  let source = typeof label === "string" && !hasNoVisibleText(label) ? label : INVALID_TOOL_NAME_TEXT;
  return identityFreeze(shortLabel(source));
}
//@ chunk-b73m1002.js:4388-4435 placement
/**
 * hasNoVisibleText：字符串为空或没有可见宽度。
 */
function hasNoVisibleText(text) {
  return text === "" || bunStringWidth(truncateToLength(text, MAX_RAW_DISPLAY_CHARS)) === 0;
}
//@ chunk-b73m1002.js:4435-4522 placement
function humanizeSnakeCase(text) {
  return text
    .replace(/_+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
//@ chunk-b73m1002.js:4522-4840 placement
/**
 * MCP 服务器的显示标签。
 */
function mcpServerLabel(mcpInfo) {
  let displayName = truncateToLength(
    (mcpInfo.scope === "claudeai" ? mcpInfo.displayName : undefined) ?? "",
    MAX_RAW_DISPLAY_CHARS,
  );
  let title = truncateToLength(mcpInfo.title ?? "", MAX_RAW_DISPLAY_CHARS);
  let serverName = sanitizeDisplayText(truncateToLength(mcpInfo.serverName, MAX_RAW_DISPLAY_CHARS));
  let serverLabel = hasVisibleText(displayName)
    ? sanitizeDisplayText(displayName)
    : isCleanText(serverName)
      ? serverName
      : "(unnamed server)";
  let toolName = truncateToLength(mcpInfo.toolName, MAX_RAW_DISPLAY_CHARS);
  let humanizedToolName = renderableText(humanizeSnakeCase(toolName));
  let rawToolName = renderableText(toolName);
  let toolLabel = hasVisibleText(title)
    ? sanitizeDisplayText(title)
    : isCleanText(humanizedToolName)
      ? humanizedToolName
      : isCleanText(rawToolName)
        ? rawToolName
        : "(unnamed tool)";
  return identityFreeze(
    truncateToWidth(`${serverLabel} \u2014 ${toolLabel}`.replace(/\s+/g, " ").trim(), SHORT_LABEL_WIDTH),
  );
}
//@ chunk-b73m1002.js:4840-4892 placement
/**
 * displayLabelOrUnnamedTool：标签或 “(unnamed tool)” 回退。
 */
function displayLabelOrUnnamedTool(label) {
  return identityFreeze(labelOr(label, "(unnamed tool)"));
}
//@ chunk-b73m1002.js:4892-4940 placement
/**
 * 标签干净时用它，否则用回退值。
 */
function labelOr(text, fallback) {
  let label = shortLabel(text);
  return isCleanText(label) ? label : fallback;
}
//@ chunk-b73m1002.js:4940-5072 placement
/**
 * 审批显示字段（文本与是否需边栏）。
 */
function displayField(value) {
  if (typeof value !== "string")
    return {
      text: identityFreeze(""),
      needsGutter: false,
    };
  let text = fixBrokenSequences(stripUnsafeChars(truncateForDisplayText(value)));
  return {
    text: identityFreeze(text),
    needsGutter: needsGutter(text),
  };
}
//@ chunk-b73m1002.js:5072-5222 placement
/**
 * 简单文本的显示形式（不安全时 null）。
 */
function plainDisplay(text) {
  if (typeof text !== "string") return null;
  if (!fitsLabelLimit(text) || text.trim() === "" || bunStringWidth(text) === 0) return null;
  if (markBrokenSequences(text) !== text) return null;
  return {
    display: identityFreeze(makeShortLabel(text)),
  };
}
//@ chunk-b73m1002.js:5222-5321 placement
var WITHHELD_VALUE_TEXT = "(value cannot be shown in full \u2014 approval withheld; one-time options only)";
var MAX_PAYLOAD_ELEMENTS = 1e4;
var MAX_PAYLOAD_DEPTH = 64;
//@ chunk-b73m1002.js:5321-7255 placement
/**
 * 按预算序列化审批载荷值。
 */
function serializePayloadValue(value, budget, depth = 0) {
  if (typeof value === "string") {
    if (value.length + 2 > budget.unitsRemaining) throw Error("payload exceeds the serialization budget");
    let encoded = jsonStringify(value);
    budget.unitsRemaining -= encoded.length;
    if (budget.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    return encoded;
  }
  if (typeof value === "number") {
    let numberText = Number.isFinite(value) ? String(value) : "null";
    budget.unitsRemaining -= numberText.length;
    if (budget.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    return numberText;
  }
  if (typeof value === "boolean" || value === null) {
    budget.unitsRemaining -= String(value).length;
    if (budget.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    return String(value);
  }
  if (typeof value === "bigint") throw Error("bigint payload cannot be serialized");
  if (typeof value !== "object") return;
  if (depth >= MAX_PAYLOAD_DEPTH) throw Error("payload exceeds the serialization depth wall");
  if (Array.isArray(value)) {
    let length = value.length;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0)
      throw Error("payload length is not an honest array length");
    budget.elementsRemaining -= length;
    if (budget.elementsRemaining < 0) throw Error("payload exceeds the element serialization wall");
    budget.unitsRemaining -= 2 + (length > 0 ? length - 1 : 0);
    if (budget.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    let parts = [];
    for (let j = 0; j < length; j++) {
      let serialized = serializePayloadValue(value[j], budget, depth + 1);
      if (serialized === undefined) {
        budget.unitsRemaining -= 4;
        if (budget.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
        parts.push("null");
      } else parts.push(serialized);
    }
    return `[${parts.join(",")}]`;
  }
  let entries = Object.entries(value);
  budget.elementsRemaining -= entries.length;
  if (budget.elementsRemaining < 0) throw Error("payload exceeds the element serialization wall");
  budget.unitsRemaining -= 2;
  if (budget.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
  let pairs = [];
  for (let [key, itemValue] of entries) {
    let serializedItem = serializePayloadValue(itemValue, budget, depth + 1);
    if (serializedItem === undefined) continue;
    if (key.length + 2 > budget.unitsRemaining) throw Error("payload exceeds the serialization budget");
    let encodedKey = jsonStringify(key);
    budget.unitsRemaining -= encodedKey.length + 1 + (pairs.length > 0 ? 1 : 0);
    if (budget.unitsRemaining < 0) throw Error("payload exceeds the serialization budget");
    pairs.push(`${encodedKey}:${serializedItem}`);
  }
  return `{${pairs.join(",")}}`;
}
//@ chunk-b73m1002.js:7255-7349 placement
/**
 * serializePayloadSafely：序列化审批载荷，超限时返回 undefined。
 */
function serializePayloadSafely(
  payload,
  unitsRemaining = MAX_DISPLAY_UNITS,
  elementsRemaining = MAX_PAYLOAD_ELEMENTS,
) {
  try {
    return serializePayloadValue(payload, {
      unitsRemaining,
      elementsRemaining,
    });
  } catch {
    return;
  }
}
//@ chunk-b73m1002.js:7349-7793 placement
/**
 * 序列化审批载荷（完整/截断/隐藏）。
 */
function serializeApprovalPayload(payload, options) {
  let serialized = typeof payload === "string" ? payload : serializePayloadSafely(payload, options?.maxUnits);
  if (serialized === undefined)
    return {
      kind: "withheld",
      marker: identityFreeze(WITHHELD_VALUE_TEXT),
    };
  if (!fitsWithinUnits(serialized, options?.maxUnits))
    return {
      kind: "withheld",
      marker: identityFreeze(WITHHELD_VALUE_TEXT),
    };
  let wrapped = options?.softWrap ? wrapLongLines(serialized) : serialized;
  let replaced = (
    options?.scrub === "key" ? stripAllUnsafeDisplayChars(wrapped) : stripUnsafeChars(wrapped)
  ).replace(/\t/g, " ");
  let joined = options?.softWrap
    ? replaced.replaceAll(
        `
`,
        "",
      )
    : replaced;
  if (GRAPHEME_TRUNCATION_MARKER_RE.test(joined))
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
//@ chunk-b73m1002.js:7793-7845 placement
/**
 * 文本是否含可疑字符。
 */
function hasSuspiciousText(text) {
  let stripped = stripUnsafeChars(text);
  return GRAPHEME_TRUNCATION_MARKER_RE.test(stripped) || markBrokenSequencesChanged(stripped);
}
//@ chunk-b73m1002.js:7845-7877 placement
/**
 * hasBrokenSequences：去掉不安全字符后是否仍有残缺序列。
 */
function hasBrokenSequences(text) {
  return markBrokenSequencesChanged(stripUnsafeChars(text));
}
//@ chunk-b73m1002.js:7877-7908 placement
function markBrokenSequencesChanged(text) {
  return markBrokenSequences(text) !== text;
}
//@ chunk-b73m1002.js:7908-8131 placement
/**
 * 列表类文本的标签。
 */
function listLabel(text) {
  let rendered = renderableText(truncateToLength(text, MAX_RAW_DISPLAY_CHARS));
  let text_2 = rendered.replace(/\s+/g, " ").trim();
  return quoteIfAmbiguous(
    text_2,
    rendered,
    text_2.includes(",") ||
      text_2.includes(";") ||
      stripZeroWidthChars(text_2).includes(" and ") ||
      stripZeroWidthChars(text_2).startsWith("and ") ||
      stripZeroWidthChars(text_2).endsWith(" and") ||
      text.length > MAX_RAW_DISPLAY_CHARS ||
      markBrokenSequences(truncateToLength(text, MAX_RAW_DISPLAY_CHARS)) !==
        truncateToLength(text, MAX_RAW_DISPLAY_CHARS),
  );
}
//@ chunk-b73m1002.js:8131-8183 placement
/**
 * 消歧后的标签列表。
 */
function uniqueLabels(labels, makeLabel = makeShortLabel) {
  return disambiguateLabels(labels, makeLabel).map((label) => identityFreeze(label));
}
//@ chunk-b73m1002.js:8183-8247 placement
/**
 * 把换行替换为替换字符。
 */
function replaceLineBreaks(text) {
  return text.replace(/[\n\r\u2028\u2029]/g, "\uFFFD");
}
//@ chunk-b73m1002.js:8247-8634 placement
/**
 * 序列化审批列表。
 */
function serializeApprovalList(values, options) {
  let mapped = values.map((value) => serializeApprovalPayload(value, options));
  let labelsByValue = new Map();
  values.forEach((value, index) => {
    let serialized = mapped[index];
    if (serialized.kind === "full" && !labelsByValue.has(value))
      labelsByValue.set(value, replaceLineBreaks(serialized.text).replace(/\s+/g, " ").trim());
  });
  let filtered = values.filter((value, index) => mapped[index].kind === "full");
  let labels = uniqueLabels(filtered, (value) => labelsByValue.get(value) ?? "");
  let segments = [];
  let labelIndex = 0;
  let withheldCount = 0;
  for (let entry of mapped)
    if (entry.kind === "full")
      segments.push({
        text: String(labels[labelIndex++]),
        withheld: false,
      });
    else {
      withheldCount += 1;
      segments.push({
        text: `${entry.marker} (#${withheldCount})`,
        withheld: true,
      });
    }
  return segments;
}
//@ chunk-b73m1002.js:8634-8706 placement
/**
 * 显示文本。
 */
function displayText(value) {
  if (typeof value !== "string") return identityFreeze2("");
  return identityFreeze2(stripUnsafeChars(value));
}
//@ chunk-b73m1002.js:8706-8868 placement
/**
 * 把字符串转为审批界面标签：清洗、制表符换空格、首行须干净且无歧义，再截断到 24 字符。
 */
function toApprovalLabel(raw) {
  if (typeof raw !== "string") return null;
  let replaced = sanitizeDisplayText(truncateToLength(raw, MAX_RAW_DISPLAY_CHARS)).replace(/\t/g, " ");
  if (!isCleanText(getFirstLine(replaced))) return null;
  if (endsWithEllipsis(getFirstLine(replaced))) return null;
  return identityFreeze(truncate(replaced, 24, true));
}
//@ chunk-b73m1002.js:8868-8971 placement
/**
 * 模板标签函数：拼接模板片段与插值（空值视为空串）后做规整。
 */
function approvalLabelTemplate(strings, ...values) {
  let result = strings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    result += values[i] ?? "";
    result += strings[i + 1] ?? "";
  }
  return identityFreeze(result);
}
export {
  hasDisplayUnsafeChar,
  MAX_DISPLAY_UNITS,
  hasVisibleText,
  fitsLabelLimit,
  disambiguateLabels,
  plainDisplay,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  displayField,
  needsGutter,
  labelOrEmpty,
  markBrokenSequences,
  replaceLineBreaks,
  stripUnsafeChars,
  toApprovalLabel,
  hasSuspiciousText,
  listLabel,
  uniqueLabels,
  uniqueDisplayNames,
  SHORT_LABEL_WIDTH,
  sanitizeForDisplay,
  renderableText,
  isCleanText,
  stripTrailingEllipsis,
  labelOr,
  hostnameLengthAllowance,
  hasNoVisibleText,
  safeLabel,
  displayText,
  approvalLabelTemplate,
  MAX_RAW_DISPLAY_CHARS,
  quoteIfAmbiguous,
  MAX_ZERO_WIDTH_RUN,
  serializePayloadSafely,
  displayLabelOrUnnamedTool,
  sanitizeDisplayText,
  shortLabel,
  truncateForDisplayText,
  mcpServerLabel,
  hasBrokenSequences,
  serializeApprovalList,
  isCombiningOrZeroWidth,
};
