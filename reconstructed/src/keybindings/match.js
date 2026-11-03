/**
 * keybindings/match.ts
 *
 * 并入旧版已有路径：按键匹配。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/match.ts
 * pieces: chunk-x1mwqya5.js (5)
 * attribution: fingerprint 2, placement 3
 */
import { getSingleKeyActionInContexts, keystrokesEqual, getActionChord } from "./resolver.js";
import { chordToDisplayString } from "./parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { getPlatform } from "../utils/platform.js";
import { isMacOptionChar, MACOS_OPTION_CHAR_TO_KEY } from "./shortcutFormat.js";

/**
 * 按键事件名到绑定键名的映射（return→enter 等，含 wheelup/wheeldown）。
 */
//@ chunk-x1mwqya5.js:18182-18414 fingerprint = getKeyName (0.754)
var KEY_EVENT_NAME_TO_KEY = {
  escape: "escape",
  return: "enter",
  tab: "tab",
  backspace: "backspace",
  delete: "delete",
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  pageup: "pageup",
  pagedown: "pagedown",
  wheelup: "wheelup",
  wheeldown: "wheeldown",
  home: "home",
  end: "end",
};
/**
 * 找出上下文 A 的单键绑定在上下文 B 里会被解释成别的动作的那些动作（用于冲突提示）。
 */
//@ chunk-x1mwqya5.js:19738-19968 fingerprint = matchesBinding (0.472)
function findShadowedActions(contextA, contextB, bindings) {
  let shadowed = new Set();
  for (let entry of bindings) {
    let keystroke = entry.chord[0];
    if (entry.context !== contextA || entry.chord.length !== 1 || entry.action === null || !keystroke)
      continue;
    let actionA = getSingleKeyActionInContexts(keystroke, [contextA, "Global"], bindings),
      actionB = getSingleKeyActionInContexts(keystroke, [contextB, "Global"], bindings);
    if (actionA === entry.action && actionB && actionB !== actionA) shadowed.add(actionB);
  }
  return shadowed;
}
//@ chunk-x1mwqya5.js:19968-20101 placement
function chordsEqual(n, r) {
  if (n.length !== r.length) return !1;
  for (let e = 0; e < n.length; e++) {
    let s = n[e],
      l = r[e];
    if (!s || !l || !keystrokesEqual(s, l)) return !1;
  }
  return !0;
}
//@ chunk-x1mwqya5.js:20101-20161 placement
function getActionDisplayText(n, r, e) {
  let s = getActionChord(n, r, e);
  return s ? chordToDisplayString(s, getShortcutDisplayPlatform()) : s;
}
/**
 * 把 Ink 按键事件转成 Keystroke：enter 用换行字符；macOS 的 Option 特殊字符还原为 alt+键；事件名查表或单字符小写；大写字母隐含 shift（非字母符号的 shift 不算）；alt 与 meta 合并。
 */
//@ chunk-x1mwqya5.js:20161-20573 placement
function keyEventToKeystroke(n) {
  let key =
      n.name === "enter"
        ? `
`
        : n.key,
    alt = n.meta;
  if (getPlatform() === "macos" && !n.meta && !n.ctrl && isMacOptionChar(key))
    ((key = MACOS_OPTION_CHAR_TO_KEY[key]), (alt = !0));
  let keyName = KEY_EVENT_NAME_TO_KEY[n.name] ?? (key.length === 1 ? key.toLowerCase() : null);
  if (!keyName) return null;
  let shift =
    !(
      n.shift &&
      key.length === 1 &&
      n.name.length === 1 &&
      key !== n.name &&
      key.toLowerCase() === key.toUpperCase()
    ) &&
    (n.shift || (key.length === 1 && key !== key.toLowerCase() && key === key.toUpperCase()));
  return { key: keyName, ctrl: n.ctrl, alt: alt, shift: shift, meta: alt, super: n.superKey };
}

export { findShadowedActions, keyEventToKeystroke, getActionDisplayText, chordsEqual };
