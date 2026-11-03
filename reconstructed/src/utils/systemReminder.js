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
function isTagNameCharCode(t) {
  return (
    (t >= CHAR_CODE_A && t <= CHAR_CODE_Z) ||
    (t >= 65 && t <= 90) ||
    (t >= 48 && t <= 57) ||
    t === 95 ||
    t === 45
  );
}
//@ chunk-bbtre4r8.js:12043-12117 placement
function scanTagNameEnd(t, e) {
  let r = e;
  while (r < t.length && isTagNameCharCode(t.charCodeAt(r))) r++;
  return r;
}
//@ chunk-bbtre4r8.js:12117-12378 placement
/**
 * 扫描文本中所有 "</tag>" 形式的闭标签，按标签名记录其位置列表。
 */
function indexClosingTags(t) {
  let e = new Map();
  let index = t.indexOf("</");
  while (index !== -1) {
    let code = t.charCodeAt(index + 2);
    if (code < CHAR_CODE_A || code > CHAR_CODE_Z) {
      index = t.indexOf("</", index + 2);
      continue;
    }
    let o = scanTagNameEnd(t, index + 3);
    if (t.charCodeAt(o) === CHAR_CODE_GT) {
      let sliced = t.slice(index + 2, o);
      let i = e.get(sliced);
      if (i) i.push(index);
      else e.set(sliced, [index]);
    }
    index = t.indexOf("</", o);
  }
  return e;
}
//@ chunk-bbtre4r8.js:12378-13018 placement
function wrapInSystemReminder(t) {
  if (!t.includes("</")) return t;
  let e = indexClosingTags(t);
  if (e.size === 0) return t;
  let r = new Map();
  let s = [];
  let o = 0;
  let a = -1;
  let index = t.indexOf("<");
  while (index !== -1) {
    let code = t.charCodeAt(index + 1);
    if (code < CHAR_CODE_A || code > CHAR_CODE_Z) {
      index = t.indexOf("<", index + 1);
      continue;
    }
    let c = scanTagNameEnd(t, index + 2);
    let m = -1;
    if (c < t.length) {
      if (t.charCodeAt(c) === CHAR_CODE_GT) m = c + 1;
      else if (WHITESPACE_RE.test(t[c])) {
        if (a < c) {
          a = t.indexOf(">", c);
          if (a === -1) break;
        }
        m = a + 1;
      }
    }
    if (m !== -1) {
      let sliced = t.slice(index + 1, c);
      let g = e.get(sliced);
      if (g) {
        let d = r.get(sliced) ?? 0;
        while (d < g.length && g[d] < m) d++;
        r.set(sliced, d);
        if (d < g.length) {
          let A = g[d] + sliced.length + 3;
          if (t.charCodeAt(A) === CHAR_CODE_NEWLINE) A++;
          s.push(t.slice(o, index));
          o = A;
          index = t.indexOf("<", A);
          continue;
        }
      }
    }
    index = t.indexOf("<", c);
  }
  if (o === 0) return t;
  s.push(t.slice(o));
  return s.join("");
}
//@ chunk-bbtre4r8.js:13018-13049 placement
function wrapAndTrimReminder(t) {
  return wrapInSystemReminder(flattenPastedBlocks(t));
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
function unwrapReminderText(t) {
  return wrapAndTrimReminder(t).trim();
}
//@ chunk-bbtre4r8.js:13117-13204 placement
/**
 * 取纯文本部分再包 reminder，用于关键词检测。
 */
function plainTextFromReminder(t) {
  return unwrapReminderText(
    splitPastedContentBlocks(t).flatMap((e) => (e.kind === "text" ? [e.text] : [])).join(`
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
function parseReminderHeader(t) {
  if (!t.startsWith(REMINDER_ID_OPEN_PREFIX)) return;
  let e = REMINDER_ID_OPEN_PREFIX.length;
  let sliced = t.slice(e, e + REMINDER_ID_BYTES + REMINDER_ID_SUFFIX.length + 1);
  let index = sliced.indexOf(REMINDER_ID_SUFFIX);
  let o = index === -1 ? undefined : sliced.slice(0, index);
  return isValidReminderId(o) &&
    sliced.startsWith(
      `${REMINDER_ID_SUFFIX}
`,
      index,
    )
    ? o
    : undefined;
}
//@ chunk-bbtre4r8.js:13598-13637 placement
/**
 * 文本是否以合法的 reminder 头开始。
 */
function hasReminderHeader(t) {
  return parseReminderHeader(t) !== undefined;
}
//@ chunk-bbtre4r8.js:13637-13658 placement
var sliced = SYSTEM_REMINDER_OPEN.slice(0, -1);
//@ chunk-bbtre4r8.js:13658-13743 placement
/**
 * 文本是否以裸的 `<system-reminder` 开头并紧跟空白。
 */
function isBareReminderOpen(t) {
  return t.startsWith(sliced) && /[\s\x1c-\x1f\x85]/.test(t.charAt(sliced.length));
}
//@ chunk-bbtre4r8.js:13743-13795 placement
/**
 * 把裸 reminder 开标签转义为 `&lt;`。
 */
function escapeBareReminderOpen(t) {
  return isBareReminderOpen(t) ? `&lt;${t.slice(1)}` : t;
}
//@ chunk-bbtre4r8.js:13795-13945 placement
/**
 * 去掉文本中所有 system-reminder 块。
 */
function stripSystemReminders(raw) {
  let e = raw;
  let index = e.indexOf(SYSTEM_REMINDER_OPEN);
  while (index >= 0) {
    let index_2 = e.indexOf(REMINDER_CLOSE_TAG, index);
    if (index_2 < 0) break;
    e = e.slice(0, index) + e.slice(index_2 + REMINDER_CLOSE_TAG.length);
    index = e.indexOf(SYSTEM_REMINDER_OPEN);
  }
  return e;
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
