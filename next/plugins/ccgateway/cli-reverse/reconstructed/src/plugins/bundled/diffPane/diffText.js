/**
 * plugins/bundled/diffPane/diffText.ts
 *
 * 2.1.316 新增：diff 面板询问文本截断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wyqg6m3h.js (3)
 * attribution: placement 3
 */
import { MAX_LINES_PER_FILE } from "./hooks.js";

//@ chunk-wyqg6m3h.js:11524-11748 placement
function armedAskOf(path, hunks) {
  let sliced = hunks
    .flatMap((hunk) => [`@@ -${hunk.oldStart} +${hunk.newStart} @@`, ...hunk.lines])
    .slice(0, MAX_LINES_PER_FILE);
  return {
    path,
    text: `The user attached the diff of ${path} from the diff pane to this prompt:
${sliced.join(`
`)}`,
    lines: sliced.length,
  };
}
//@ chunk-wyqg6m3h.js:11748-11820 placement
var ASK_CUT_NOTE = "(The rest of this diff was cut: it did not fit in the prompt.)";
//@ chunk-wyqg6m3h.js:11820-12004 placement
function fittedAskTextOf(text, maxChars) {
  if (text.length <= maxChars) return text;
  let lines = [];
  let usedChars = ASK_CUT_NOTE.length;
  for (let line of text.split(`
`)) {
    let lineChars = line.length + 1;
    if (usedChars + lineChars > maxChars) break;
    lines.push(line);
    usedChars += lineChars;
  }
  return lines.length > 1
    ? `${lines.join(`
`)}
${ASK_CUT_NOTE}`
    : undefined;
}
export { ASK_CUT_NOTE, armedAskOf, fittedAskTextOf };
