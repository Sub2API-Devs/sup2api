/**
 * engine/sessionAppend.ts
 *
 * 2.1.316 新增：查询引擎的会话追加。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8fb5jme0.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { rowWithContent, filledRow } from "./renderedRows.js";
import { summarizeMessageForExport } from "../plugins/functionHooks/api/sessionAppend.js";
import { safeDeepEqual } from "../plugins/functionHooks/apiDispatch.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-8fb5jme0.js:16240-16609 placement
var appendCoreOf = (options, row, onApplied) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (input) => {
    let rewritten = rowWithContent(row, input.message);
    let message = options.fills || row.type === "assistant" ? filledRow(row, rewritten) : rewritten;
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
