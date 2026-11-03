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
function armedAskOf(e, o) {
  let sliced = o
    .flatMap((s) => [`@@ -${s.oldStart} +${s.newStart} @@`, ...s.lines])
    .slice(0, MAX_LINES_PER_FILE);
  return {
    path: e,
    text: `The user attached the diff of ${e} from the diff pane to this prompt:
${sliced.join(`
`)}`,
    lines: sliced.length,
  };
}
//@ chunk-wyqg6m3h.js:11748-11820 placement
var ASK_CUT_NOTE = "(The rest of this diff was cut: it did not fit in the prompt.)";
//@ chunk-wyqg6m3h.js:11820-12004 placement
function fittedAskTextOf(e, o) {
  if (e.length <= o) return e;
  let r = [],
    s = ASK_CUT_NOTE.length;
  for (let a of e.split(`
`)) {
    let i = a.length + 1;
    if (s + i > o) break;
    (r.push(a), (s += i));
  }
  return r.length > 1
    ? `${r.join(`
`)}
${ASK_CUT_NOTE}`
    : void 0;
}

export { ASK_CUT_NOTE, armedAskOf, fittedAskTextOf };
