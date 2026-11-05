/**
 * keybindings/match.ts
 *
 * 并入旧版已有路径：按键匹配。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/match.ts
 * pieces: chunk-m2f3rb0f.js (5)
 * attribution: fingerprint 2, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSingleKeyActionInContexts, keystrokesEqual, getActionChord } from "./resolver.js";
import { chordToDisplayString } from "./parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { getPlatform } from "../utils/platform.js";
import { isMacOptionChar, MACOS_OPTION_CHAR_TO_KEY } from "./shortcutFormat.js";

//@ chunk-m2f3rb0f.js:18180-18412 fingerprint (2.1.88 match: getKeyName, 0.754)
/**
 * 按键事件名到绑定键名的映射（return→enter 等，含 wheelup/wheeldown）。
 */
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
//@ chunk-m2f3rb0f.js:19736-19966 fingerprint (2.1.88 match: matchesBinding, 0.473)
/**
 * 找出上下文 A 的单键绑定在上下文 B 里会被解释成别的动作的那些动作（用于冲突提示）。
 */
function findShadowedActions(contextA, contextB, bindings) {
  let shadowed = new Set();
  for (let entry of bindings) {
    let keystroke = entry.chord[0];
    if (entry.context !== contextA || entry.chord.length !== 1 || entry.action === null || !keystroke)
      continue;
    let actionA = getSingleKeyActionInContexts(keystroke, [contextA, "Global"], bindings);
    let actionB = getSingleKeyActionInContexts(keystroke, [contextB, "Global"], bindings);
    if (actionA === entry.action && actionB && actionB !== actionA) shadowed.add(actionB);
  }
  return shadowed;
}
//@ chunk-m2f3rb0f.js:19966-20099 placement
function chordsEqual(left, chord) {
  if (left.length !== chord.length) return false;
  for (let k = 0; k < left.length; k++) {
    let leftKey = left[k];
    let rightKey = chord[k];
    if (!leftKey || !rightKey || !keystrokesEqual(leftKey, rightKey)) return false;
  }
  return true;
}
//@ chunk-m2f3rb0f.js:20099-20159 placement
function getActionDisplayText(action, context, bindings) {
  let actionChord = getActionChord(action, context, bindings);
  return actionChord ? chordToDisplayString(actionChord, getShortcutDisplayPlatform()) : actionChord;
}
//@ chunk-m2f3rb0f.js:20159-20571 placement
/**
 * 把 Ink 按键事件转成 Keystroke：enter 用换行字符；macOS 的 Option 特殊字符还原为 alt+键；事件名查表或单字符小写；大写字母隐含 shift（非字母符号的 shift 不算）；alt 与 meta 合并。
 */
function keyEventToKeystroke(keyEvent) {
  let key =
    keyEvent.name === "enter"
      ? `
`
      : keyEvent.key;
  let alt = keyEvent.meta;
  if (getPlatform() === "macos" && !keyEvent.meta && !keyEvent.ctrl && isMacOptionChar(key)) {
    key = MACOS_OPTION_CHAR_TO_KEY[key];
    alt = true;
  }
  let keyName = KEY_EVENT_NAME_TO_KEY[keyEvent.name] ?? (key.length === 1 ? key.toLowerCase() : null);
  if (!keyName) return null;
  let shift =
    !(
      keyEvent.shift &&
      key.length === 1 &&
      keyEvent.name.length === 1 &&
      key !== keyEvent.name &&
      key.toLowerCase() === key.toUpperCase()
    ) &&
    (keyEvent.shift || (key.length === 1 && key !== key.toLowerCase() && key === key.toUpperCase()));
  return {
    key: keyName,
    ctrl: keyEvent.ctrl,
    alt,
    shift,
    meta: alt,
    super: keyEvent.superKey,
  };
}
export { findShadowedActions, getActionDisplayText, keyEventToKeystroke, chordsEqual };
