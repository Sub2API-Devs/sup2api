/**
 * state/statusLineWidth.ts
 *
 * 2.1.316 新增：状态栏宽度状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:88087-88151 placement
/**
 * 状态行宽度可选档位（w25…unlimited）。
 */
var STATUS_LINE_WIDTH_STEPS = ["w25", "w50", "w100", "w200", "unlimited"];
var UNLIMITED = "unlimited";
//@ chunk-5xgkngpb.js:88151-88245 placement
/**
 * 在档位表中前后移动 n 档并返回结果。
 */
function stepStatusLineWidth(attentionBudget, step) {
  let index = STATUS_LINE_WIDTH_STEPS.indexOf(attentionBudget);
  let max = Math.max(0, Math.min(STATUS_LINE_WIDTH_STEPS.length - 1, index + step));
  return STATUS_LINE_WIDTH_STEPS[max];
}
export { UNLIMITED, stepStatusLineWidth };
