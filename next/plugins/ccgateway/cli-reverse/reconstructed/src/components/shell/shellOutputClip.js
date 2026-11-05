/**
 * components/shell/shellOutputClip.ts
 *
 * 2.1.316 新增：shell 输出的裁剪显示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6yg63dqr.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { stripPrefix } from "../../utils/stringUtils.js";

//@ chunk-6yg63dqr.js:627-639 placement
var CLIP_HEAD_LINES = 5;
var SHELL_OUTPUT_CLIP = 5;
//@ chunk-6yg63dqr.js:1994-2100 placement
function isShellOutputClipped({ output, fullOutput, totalLines }, columns) {
  if (!fullOutput.trim()) return false;
  return (totalLines ?? 0) > CLIP_HEAD_LINES || clipShellOutput(output, columns).clipped;
}
//@ chunk-6yg63dqr.js:2100-2468 placement
function clipShellOutput(output, columns) {
  let max = Math.max(1, columns - SHELL_OUTPUT_CLIP);
  let filtered = stripAnsiPerLine(output.trim())
    .replace(
      /\r\n?/g,
      `
`,
    )
    .split(
      `
`,
    )
    .filter((line) => line);
  let keptLines = [];
  let keptCount = 0;
  let index = filtered.length;
  while (index > 0 && keptCount < CLIP_HEAD_LINES) {
    let line = filtered[--index];
    let lines = wrapAnsi(line, max, {
      hard: true,
      trim: false,
    }).split(`
`);
    let budget = CLIP_HEAD_LINES - keptCount;
    if (lines.length > budget) {
      keptLines.unshift(stripPrefix(lines.slice(-budget).join(""), " "));
      return {
        text: keptLines.join(`
`),
        clipped: true,
        dropped: index,
      };
    }
    keptLines.unshift(line);
    keptCount += lines.length;
  }
  return {
    text: keptLines.join(`
`),
    clipped: index > 0,
    dropped: index,
  };
}
export { clipShellOutput, CLIP_HEAD_LINES, isShellOutputClipped };
