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
var appendCoreOf = (options, row, onApplied) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (input) => {
    let rewritten = rowWithContent(row, input.message);
    let message = options.fills || row.type === "assistant" ? mergeMessageInPlace(row, rewritten) : rewritten;
    let summarized = summarizeMessageForExport(message);
    if (rewritten === row && !safeDeepEqual(input.message.content, summarized.content))
      logForDebugging(
        `session.append: a rewrite of row ${row.uuid} is not kept: what it changed is pinned, rendered per request or carries media`,
      );
    if (!options.fills) options.keep([message]);
    onApplied(message);
    return {
      message: summarized,
      uuid: row.uuid,
    };
  },
});
export { appendCoreOf };
