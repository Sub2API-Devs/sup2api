/**
 * utils/replStateNote.ts
 *
 * 压缩后提示模型 REPL VM 状态是否保留的 note：生成受限长度的绑定名清单并严格校验其形状，非该形状即视为不是 note（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5r0xewha.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { TS_IDENTIFIER_RE } from "../plugins/functionHooks/types/toolTypesDts.js";

//@ chunk-5r0xewha.js:228-581 placement
/**
 * REPL VM 状态 note 的绑定条数上限 40、单项长度上限 80、总长上限 4000。note 里单个绑定名的长度上限 80。REPL VM 状态 note 的开头句。note 全文的匹配上限 4000。解析 note 全文的正则（无绑定、仅数量、列举名字加剩余数）。
 */
var MAX_KEPT_BINDINGS = 40;
var MAX_NOTE_CHARS = 80;
var KEPT_STATE_LEAD = "Your REPL VM state was kept across this compaction";
var MAX_PARSED_NOTE_CHARS = 4000;
var KEPT_STATE_RE = new RegExp(
  `^${KEPT_STATE_LEAD}(?:; no bindings are defined in it\\.|\\. (\\d{1,9}) bindings? (?:is|are) still defined in it, with names this note does not list\\.|\\. These bindings are still defined: ((?:\`[^\`]+\`, )*\`[^\`]+\`)(?:, and (\\d{1,9}) more this note does not list)?\\.)$`,
);
//@ chunk-5r0xewha.js:581-627 placement
/**
 * 判定单个绑定名是否可作为 note 的合法词。
 */
function isSafeBindingName(name) {
  return name.length <= MAX_NOTE_CHARS && TS_IDENTIFIER_RE.test(name);
}
//@ chunk-5r0xewha.js:627-970 placement
/**
 * 按绑定名列表与剩余数生成 note 文案。
 */
function renderKeptStateNote(names, moreCount) {
  if (names.length === 0 && moreCount === 0) return `${KEPT_STATE_LEAD}; no bindings are defined in it.`;
  if (names.length === 0)
    return `${KEPT_STATE_LEAD}. ${moreCount} binding${moreCount === 1 ? " is" : "s are"} still defined in it, with names this note does not list.`;
  return `${KEPT_STATE_LEAD}. These bindings are still defined: ${names.map((name) => `\`${name}\``).join(", ")}${moreCount > 0 ? `, and ${moreCount} more this note does not list` : ""}.`;
}
//@ chunk-5r0xewha.js:970-1043 placement
/**
 * 取前 40 个合法绑定名生成 note。
 */
function buildKeptStateNote(names) {
  let kept = names.filter(isSafeBindingName).slice(0, MAX_KEPT_BINDINGS);
  return renderKeptStateNote(kept, names.length - kept.length);
}
//@ chunk-5r0xewha.js:1043-1259 placement
/**
 * 校验一段文本是否是本模块能生成的 REPL 状态 note。
 */
function isKeptStateNote(text) {
  if (text.length > MAX_PARSED_NOTE_CHARS) return false;
  let match = KEPT_STATE_RE.exec(text);
  if (match === null) return false;
  let names = match[2] === undefined ? [] : match[2].split(", ").map((name) => name.slice(1, -1));
  let moreCount = Number(match[1] ?? match[3] ?? 0);
  if (names.length > MAX_KEPT_BINDINGS || !names.every(isSafeBindingName)) return false;
  return renderKeptStateNote(names, moreCount) === text;
}
export { isKeptStateNote, buildKeptStateNote };
