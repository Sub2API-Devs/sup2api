/**
 * components/shell/shellOutputClip.ts
 *
 * 2.1.316 新增：shell 输出的裁剪显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cqn8yadz.js (3)
 * attribution: placement 3
 */
import { qa } from "../../utils/stripAnsi.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { stripPrefix } from "../../utils/stringUtils.js";

//@ chunk-cqn8yadz.js:594-606 placement
var CLIP_HEAD_LINES = 5,
  G = 5;
//@ chunk-cqn8yadz.js:1961-2067 placement
function isShellOutputClipped({ output: output, fullOutput: fullOutput, totalLines: totalLines }, i) {
  if (!fullOutput.trim()) return !1;
  return (totalLines ?? 0) > CLIP_HEAD_LINES || clipShellOutput(output, i).clipped;
}
//@ chunk-cqn8yadz.js:2067-2435 placement
function clipShellOutput(b, m) {
  let max = Math.max(1, m - G),
    filtered = qa(b.trim())
      .replace(
        /\r\n?/g,
        `
`,
      )
      .split(
        `
`,
      )
      .filter((a) => a),
    l = [],
    u = 0,
    o = filtered.length;
  while (o > 0 && u < CLIP_HEAD_LINES) {
    let a = filtered[--o],
      parts = wrapAnsi(a, max, { hard: !0, trim: !1 }).split(`
`),
      t = CLIP_HEAD_LINES - u;
    if (parts.length > t)
      return (
        l.unshift(stripPrefix(parts.slice(-t).join(""), " ")),
        {
          text: l.join(`
`),
          clipped: !0,
          dropped: o,
        }
      );
    (l.unshift(a), (u += parts.length));
  }
  return {
    text: l.join(`
`),
    clipped: o > 0,
    dropped: o,
  };
}

export { isShellOutputClipped, clipShellOutput, CLIP_HEAD_LINES };
