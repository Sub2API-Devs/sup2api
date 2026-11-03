/**
 * ink/events/input-event.ts
 *
 * 输入事件与「是否可打印文本输入」判断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/input-event.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */

/**
 * 按键是否产生文字输入：带 Ctrl/Meta/Super 或是回车、Esc、方向、Tab、翻页、Home/End、滚轮时为否。
 */
//@ chunk-18hwfzwa.js:1209724-1209978 fingerprint = parseKey (0.636)
function isTextInputKey(event) {
  if (event.ctrl || event.meta || event.superKey) return !1;
  switch (event.key) {
    case "return":
    case "escape":
    case "up":
    case "down":
    case "left":
    case "right":
    case "tab":
    case "pageup":
    case "pagedown":
    case "home":
    case "end":
    case "wheelup":
    case "wheeldown":
      return !1;
    default:
      return !0;
  }
}

export { isTextInputKey };
