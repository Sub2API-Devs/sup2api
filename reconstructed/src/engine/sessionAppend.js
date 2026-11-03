/**
 * engine/sessionAppend.ts
 *
 * 2.1.316 新增：查询引擎的会话追加。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1nk4j4sn.js (1)
 * attribution: placement 1
 */
import { rowWithContent, mergeMessageInPlace } from "./renderedRows.js";
import { summarizeMessageForExport } from "../plugins/functionHooks/api/sessionAppend.js";
import { safeDeepEqual } from "../plugins/functionHooks/apiDispatch.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-1nk4j4sn.js:15092-15461 placement
var appendCoreOf = (e, o, r) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  run: async (n) => {
    let p = rowWithContent(o, n.message),
      i = e.fills || o.type === "assistant" ? mergeMessageInPlace(o, p) : p,
      a = summarizeMessageForExport(i);
    if (p === o && !safeDeepEqual(n.message.content, a.content))
      logForDebugging(
        `session.append: a rewrite of row ${o.uuid} is not kept: what it changed is pinned, rendered per request or carries media`,
      );
    if (!e.fills) e.keep([i]);
    return (r(i), { message: a, uuid: o.uuid });
  },
});

export { appendCoreOf };
