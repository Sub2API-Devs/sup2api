/**
 * utils/systemReminder.ts
 *
 * system-reminder 标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bbtre4r8.js (19)
 * attribution: placement 19
 */
import { flattenPastedBlocks, splitPastedContentBlocks } from "./pastedContent.js";

//@ chunk-bbtre4r8.js:11935-11967 placement
var CHAR_CODE_A = 97;
var CHAR_CODE_Z = 122;
var CHAR_CODE_GT = 62;
var CHAR_CODE_NEWLINE = 10;
var WHITESPACE_RE = /\s/;
//@ chunk-bbtre4r8.js:11967-12043 placement
function isTagNameCharCode(charCode) {
  return (
    (charCode >= CHAR_CODE_A && charCode <= CHAR_CODE_Z) ||
    (charCode >= 65 && charCode <= 90) ||
    (charCode >= 48 && charCode <= 57) ||
    charCode === 95 ||
    charCode === 45
  );
}
//@ chunk-bbtre4r8.js:12043-12117 placement
function scanTagNameEnd(text, start) {
  let endIndex = start;
  while (endIndex < text.length && isTagNameCharCode(text.charCodeAt(endIndex))) endIndex++;
  return endIndex;
}
//@ chunk-bbtre4r8.js:12117-12378 placement
/**
 * 扫描文本中所有 "</tag>" 形式的闭标签，按标签名记录其位置列表。
 */
function indexClosingTags(text) {
  let closingIndexes = new Map();
  let index = text.indexOf("</");
  while (index !== -1) {
    let code = text.charCodeAt(index + 2);
    if (code < CHAR_CODE_A || code > CHAR_CODE_Z) {
      index = text.indexOf("</", index + 2);
      continue;
    }
    let nameEnd = scanTagNameEnd(text, index + 3);
    if (text.charCodeAt(nameEnd) === CHAR_CODE_GT) {
      let sliced = text.slice(index + 2, nameEnd);
      let name = closingIndexes.get(sliced);
      if (name) name.push(index);
      else closingIndexes.set(sliced, [index]);
    }
    index = text.indexOf("</", nameEnd);
  }
  return closingIndexes;
}
//@ chunk-bbtre4r8.js:12378-13018 placement
function wrapInSystemReminder(text) {
  if (!text.includes("</")) return text;
  let closingIndexes = indexClosingTags(text);
  if (closingIndexes.size === 0) return text;
  let replacements = new Map();
  let parts = [];
  let lastEnd = 0;
  let openStart = -1;
  let index = text.indexOf("<");
  while (index !== -1) {
    let code = text.charCodeAt(index + 1);
    if (code < CHAR_CODE_A || code > CHAR_CODE_Z) {
      index = text.indexOf("<", index + 1);
      continue;
    }
    let nameEnd = scanTagNameEnd(text, index + 2);
    let closeStart = -1;
    if (nameEnd < text.length) {
      if (text.charCodeAt(nameEnd) === CHAR_CODE_GT) closeStart = nameEnd + 1;
      else if (WHITESPACE_RE.test(text[nameEnd])) {
        if (openStart < nameEnd) {
          openStart = text.indexOf(">", nameEnd);
          if (openStart === -1) break;
        }
        closeStart = openStart + 1;
      }
    }
    if (closeStart !== -1) {
      let sliced = text.slice(index + 1, nameEnd);
      let closeEnd = closingIndexes.get(sliced);
      if (closeEnd) {
        let name = replacements.get(sliced) ?? 0;
        while (name < closeEnd.length && closeEnd[name] < closeStart) name++;
        replacements.set(sliced, name);
        if (name < closeEnd.length) {
          let tail = closeEnd[name] + sliced.length + 3;
          if (text.charCodeAt(tail) === CHAR_CODE_NEWLINE) tail++;
          parts.push(text.slice(lastEnd, index));
          lastEnd = tail;
          index = text.indexOf("<", tail);
          continue;
        }
      }
    }
    index = text.indexOf("<", nameEnd);
  }
  if (lastEnd === 0) return text;
  parts.push(text.slice(lastEnd));
  return parts.join("");
}
//@ chunk-bbtre4r8.js:13018-13049 placement
function wrapAndTrimReminder(text) {
  return wrapInSystemReminder(flattenPastedBlocks(text));
}
//@ chunk-bbtre4r8.js:13049-13082 placement
/**
 * 尽量解包 system-reminder，失败返回原文。
 */
function textOrReminderWrapped(title) {
  return unwrapReminderText(title) || title;
}
//@ chunk-bbtre4r8.js:13082-13117 placement
/**
 * 包一层 system-reminder 后 trim。
 */
function unwrapReminderText(text) {
  return wrapAndTrimReminder(text).trim();
}
//@ chunk-bbtre4r8.js:13117-13204 placement
/**
 * 取纯文本部分再包 reminder，用于关键词检测。
 */
function plainTextFromReminder(text) {
  return unwrapReminderText(
    splitPastedContentBlocks(text).flatMap((block) => (block.kind === "text" ? [block.text] : [])).join(`
`),
  );
}
//@ chunk-bbtre4r8.js:13204-13356 placement
/**
 * system-reminder 的开/闭标签、带 id 形式的前后缀、id 长度与校验正则。
 */
var SYSTEM_REMINDER_OPEN = "<system-reminder>";
var REMINDER_CLOSE_TAG = "</system-reminder>";
var REMINDER_ID_OPEN_PREFIX = '<system-reminder id="';
var REMINDER_ID_CLOSE_PREFIX = '</system-reminder id="';
var REMINDER_ID_SUFFIX = '">';
var MAX_REMINDER_ID_CHARS = 16;
var REMINDER_ID_RE = /^[0-9a-f]{16,32}$/;
var REMINDER_ID_BYTES = 32;
//@ chunk-bbtre4r8.js:13356-13410 placement
/**
 * 字符串是否是合法的 reminder id（16–32 位十六进制）。
 */
function isValidReminderId(reminderId) {
  return typeof reminderId === "string" && REMINDER_ID_RE.test(reminderId);
}
//@ chunk-bbtre4r8.js:13410-13598 placement
/**
 * 文本以固定前缀开头时，解析其后到分隔标记前的标识并校验，合法时返回。
 */
function parseReminderHeader(text) {
  if (!text.startsWith(REMINDER_ID_OPEN_PREFIX)) return;
  let prefixLength = REMINDER_ID_OPEN_PREFIX.length;
  let sliced = text.slice(prefixLength, prefixLength + REMINDER_ID_BYTES + REMINDER_ID_SUFFIX.length + 1);
  let index = sliced.indexOf(REMINDER_ID_SUFFIX);
  let suffixIndex = index === -1 ? undefined : sliced.slice(0, index);
  return isValidReminderId(suffixIndex) &&
    sliced.startsWith(
      `${REMINDER_ID_SUFFIX}
`,
      index,
    )
    ? suffixIndex
    : undefined;
}
//@ chunk-bbtre4r8.js:13598-13637 placement
/**
 * 文本是否以合法的 reminder 头开始。
 */
function hasReminderHeader(text) {
  return parseReminderHeader(text) !== undefined;
}
//@ chunk-bbtre4r8.js:13637-13658 placement
var sliced = SYSTEM_REMINDER_OPEN.slice(0, -1);
//@ chunk-bbtre4r8.js:13658-13743 placement
/**
 * 文本是否以裸的 `<system-reminder` 开头并紧跟空白。
 */
function isBareReminderOpen(text) {
  return text.startsWith(sliced) && /[\s\x1c-\x1f\x85]/.test(text.charAt(sliced.length));
}
//@ chunk-bbtre4r8.js:13743-13795 placement
/**
 * 把裸 reminder 开标签转义为 `&lt;`。
 */
function escapeBareReminderOpen(text) {
  return isBareReminderOpen(text) ? `&lt;${text.slice(1)}` : text;
}
//@ chunk-bbtre4r8.js:13795-13945 placement
/**
 * 去掉文本中所有 system-reminder 块。
 */
function stripSystemReminders(raw) {
  let text = raw;
  let index = text.indexOf(SYSTEM_REMINDER_OPEN);
  while (index >= 0) {
    let index_2 = text.indexOf(REMINDER_CLOSE_TAG, index);
    if (index_2 < 0) break;
    text = text.slice(0, index) + text.slice(index_2 + REMINDER_CLOSE_TAG.length);
    index = text.indexOf(SYSTEM_REMINDER_OPEN);
  }
  return text;
}
//@ chunk-bbtre4r8.js:13945-14017 placement
var IDE_CONTEXT_TAG_RE = /<(ide_opened_file|ide_selection)(?:\s[^>]*)?>[\s\S]*?<\/\1>\n?/g;
//@ chunk-bbtre4r8.js:14017-14063 placement
/**
 * 去掉 IDE 上下文的 ide_opened_file/ide_selection 标签。
 */
function stripIdeContextTags(userMessageText) {
  return userMessageText.replace(IDE_CONTEXT_TAG_RE, "").trim();
}
export {
  SYSTEM_REMINDER_OPEN,
  REMINDER_CLOSE_TAG,
  hasReminderHeader,
  parseReminderHeader,
  escapeBareReminderOpen,
  isBareReminderOpen,
  isValidReminderId,
  stripIdeContextTags,
  REMINDER_ID_OPEN_PREFIX,
  REMINDER_ID_SUFFIX,
  REMINDER_ID_CLOSE_PREFIX,
  textOrReminderWrapped,
  unwrapReminderText,
  MAX_REMINDER_ID_CHARS,
  stripSystemReminders,
  plainTextFromReminder,
};
