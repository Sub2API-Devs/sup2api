/**
 * components/PromptInput/utils.ts
 *
 * 输入工具：vim 模式是否开启、可打印字符判断、换行说明（shift+⏎ / \⏎）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/utils.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-q8cyy466.js (2), chunk-tzghj6zv.js (1)
 * attribution: fingerprint 3, affinity 1
 */
import { supportsShiftEnter, hasUsedBackslashReturn } from "../../commands/terminalSetup/terminalSetup.js";

//@ chunk-tzghj6zv.js:5821-5963 fingerprint (2.1.88 match: getNewlineInstructions, 0.753)
function getNewlineInstructions() {
  if (supportsShiftEnter()) return "shift + \u23CE for newline";
  return hasUsedBackslashReturn() ? "\\\u23CE for newline" : "backslash (\\) + return (\u23CE) for newline";
}
//@ chunk-18hwfzwa.js:50897-51162 fingerprint (2.1.88 match: isNonSpacePrintable, 0.892)
function isNonSpacePrintable(input, key) {
  return (
    input !== "" &&
    !key.ctrl &&
    !key.meta &&
    !key.super &&
    !key.escape &&
    !key.tab &&
    !key.return &&
    !key.backspace &&
    !key.delete &&
    !key.upArrow &&
    !key.downArrow &&
    !key.leftArrow &&
    !key.rightArrow &&
    !key.pageUp &&
    !key.pageDown &&
    !key.home &&
    !key.end &&
    !key.wheelUp &&
    !key.wheelDown &&
    !/[\x00-\x1f\x7f]/.test(input)
  );
}
//@ chunk-q8cyy466.js:17186-17242 affinity
var MODE_LABELS = {
  vim: "Editor mode",
  "output-style": "Output style",
};
//@ chunk-q8cyy466.js:17242-17324 fingerprint (2.1.88 match: isVimModeEnabled, 0.406)
function isVimModeEnabled(mode) {
  let target = mode && MODE_LABELS[mode] ? mode : "vim";
  return `/${target} moved \u2192 ${MODE_LABELS[target]} in /config`;
}
export { isNonSpacePrintable, getNewlineInstructions, isVimModeEnabled };
