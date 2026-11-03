/**
 * components/PromptInput/inputModes.ts
 *
 * 输入模式辅助（! 前缀为 bash 模式、按模式前缀拼接/去除）；本模块大部分被误归（propose_skills 工具代码，见过程文档）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/inputModes.ts
 * pieces: chunk-74a0twcp.js (5)
 * attribution: shared-adjacent 1, fingerprint 1, layout 1, placement 2
 */

//@ chunk-74a0twcp.js:191-262 shared-adjacent = prependModeCharacterToInput (1)
function prependModeCharacterToInput(input, mode) {
  switch (mode) {
    case "bash":
      return `!${input}`;
    default:
      return input;
  }
}
//@ chunk-74a0twcp.js:262-326 fingerprint = getModeFromInput (1)
function getModeFromInput(input) {
  if (input.startsWith("!")) return "bash";
  return "prompt";
}
//@ chunk-74a0twcp.js:326-388 layout = getValueFromInput (1)
function stripModePrefix(input) {
  if (getModeFromInput(input) === "prompt") return input;
  return input.slice(1);
}
/**
 * 字符是否是进入 bash 模式的 "!"。
 */
//@ chunk-74a0twcp.js:388-419 placement
function isBashModeChar(t) {
  return t === "!";
}
/**
 * 判断用户是否在空输入或行首键入了模式前缀字符（如 ! 或 #）以切换输入模式。
 */
//@ chunk-74a0twcp.js:419-571 placement
function isModeCharTyped({ nextValue: nextValue, value: r, cursorOffset: cursorOffset, mode: mode }) {
  let e = getModeFromInput(nextValue);
  if (cursorOffset !== 0 || e === "prompt" || e === mode) return !1;
  return nextValue.length === r.length + 1 || r.length === 0;
}

export { stripModePrefix, getModeFromInput, prependModeCharacterToInput, isModeCharTyped, isBashModeChar };
