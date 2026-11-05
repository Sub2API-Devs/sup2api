/**
 * keybindings/parser.ts
 *
 * 按键串/和弦解析与格式化（含平台显示）；本模块 18 个声明是误归的路径/平台工具
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/parser.ts
 * pieces: chunk-m2f3rb0f.js (8)
 * attribution: fingerprint 6, file-local 1, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-m2f3rb0f.js:1154-1779 fingerprint (2.1.88 match: parseKeystroke, 0.956)
/**
 * 把单个按键串（如 "ctrl+shift+k"）解析成 Keystroke {key, ctrl, alt, shift, meta, super}。修饰键别名：control→ctrl；opt/option→alt；cmd/command/super/win→super；键名别名：esc→escape、return→enter、del→delete、space→" "、箭头符号→up/down/left/right；其他部分小写后当主键。
 */
function parseKeystroke(input) {
  let parts = input.split("+");
  let keystroke = {
    key: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    super: false,
  };
  for (let part of parts) {
    let lower = part.toLowerCase();
    switch (lower) {
      case "ctrl":
      case "control":
        keystroke.ctrl = true;
        break;
      case "alt":
      case "opt":
      case "option":
        keystroke.alt = true;
        break;
      case "shift":
        keystroke.shift = true;
        break;
      case "meta":
        keystroke.meta = true;
        break;
      case "cmd":
      case "command":
      case "super":
      case "win":
        keystroke.super = true;
        break;
      case "esc":
        keystroke.key = "escape";
        break;
      case "return":
        keystroke.key = "enter";
        break;
      case "del":
        keystroke.key = "delete";
        break;
      case "space":
        keystroke.key = " ";
        break;
      case "\u2191":
        keystroke.key = "up";
        break;
      case "\u2193":
        keystroke.key = "down";
        break;
      case "\u2190":
        keystroke.key = "left";
        break;
      case "\u2192":
        keystroke.key = "right";
        break;
      default:
        keystroke.key = lower;
        break;
    }
  }
  return keystroke;
}
//@ chunk-m2f3rb0f.js:1779-1865 fingerprint (2.1.88 match: parseChord, 1)
/**
 * 把和弦串（空格分隔的多次按键，如 "ctrl+x ctrl+s"）解析成 Keystroke 数组；单个空格字符视为 space 键。
 */
function parseChord(input) {
  if (input === " ") return [parseKeystroke("space")];
  return input.trim().split(/\s+/).map(parseKeystroke);
}
//@ chunk-m2f3rb0f.js:1865-2059 fingerprint (2.1.88 match: keystrokeToString, 1)
/**
 * Keystroke 转回规范字符串（ctrl+alt+shift+meta+cmd+键名，键名经 keyToDisplayName），用于和弦比较的键与日志。
 */
function keystrokeToString(ks) {
  let parts = [];
  if (ks.ctrl) parts.push("ctrl");
  if (ks.alt) parts.push("alt");
  if (ks.shift) parts.push("shift");
  if (ks.meta) parts.push("meta");
  if (ks.super) parts.push("cmd");
  let displayKey = keyToDisplayName(ks.key);
  parts.push(displayKey);
  return parts.join("+");
}
//@ chunk-m2f3rb0f.js:2059-2468 fingerprint (2.1.88 match: keyToDisplayName, 0.948)
/**
 * 内部键名转显示名：escape→Esc、enter→Enter、箭头→↑↓←→、pageup→PageUp 等；其余原样。
 */
function keyToDisplayName(key) {
  switch (key) {
    case "escape":
      return "Esc";
    case " ":
      return "space";
    case "tab":
      return "tab";
    case "enter":
      return "Enter";
    case "backspace":
      return "Backspace";
    case "delete":
      return "Delete";
    case "up":
      return "\u2191";
    case "down":
      return "\u2193";
    case "left":
      return "\u2190";
    case "right":
      return "\u2192";
    case "pageup":
      return "PageUp";
    case "pagedown":
      return "PageDown";
    case "home":
      return "Home";
    case "end":
      return "End";
    default:
      return key;
  }
}
//@ chunk-m2f3rb0f.js:2468-2510 file-local
/**
 * 和弦转字符串（各步 keystrokeToString 以空格连接）。
 */
function chordToString(chord) {
  return chord.map(keystrokeToString).join(" ");
}
//@ chunk-m2f3rb0f.js:2510-2735 fingerprint (2.1.88 match: keystrokeToDisplayString, 1)
/**
 * 按平台生成给用户看的按键文字：alt/meta 在 macOS 显示 opt、其他平台 alt；super 在 macOS 显示 cmd、其他平台 super。
 */
function keystrokeToDisplayString(ks, platform = "linux") {
  let parts = [];
  if (ks.ctrl) parts.push("ctrl");
  if (ks.alt || ks.meta) parts.push(platform === "macos" ? "opt" : "alt");
  if (ks.shift) parts.push("shift");
  if (ks.super) parts.push(platform === "macos" ? "cmd" : "super");
  let displayKey = keyToDisplayName(ks.key);
  parts.push(displayKey);
  return parts.join("+");
}
//@ chunk-m2f3rb0f.js:2735-2798 layout (2.1.88 match: chordToDisplayString, 1)
/**
 * 按平台生成和弦的显示文字（各步 keystrokeToDisplayString 以空格连接）。
 */
function chordToDisplayString(chord, platform = "linux") {
  return chord.map((ks) => keystrokeToDisplayString(ks, platform)).join(" ");
}
//@ chunk-m2f3rb0f.js:2798-2939 fingerprint (2.1.88 match: parseBindings, 1)
/**
 * 把 [{context, bindings:{按键串: action|null}}] 块展开成扁平的 ParsedBinding 列表 {chord, action, context}；顺序即优先级（后者覆盖前者）。
 */
function parseBindings(blocks) {
  let bindings = [];
  for (let block of blocks)
    for (let [key, action] of Object.entries(block.bindings))
      bindings.push({
        chord: parseChord(key),
        action,
        context: block.context,
      });
  return bindings;
}
export { parseChord, parseBindings, chordToDisplayString, parseKeystroke, chordToString };
