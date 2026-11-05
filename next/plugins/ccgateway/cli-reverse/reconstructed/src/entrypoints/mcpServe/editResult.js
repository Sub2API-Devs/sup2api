/**
 * entrypoints/mcpServe/editResult.ts
 *
 * 2.1.316 新增。为 mcp serve 的编辑结果附加 claudecode/editResult 元数据。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-298p3epx.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { logError } from "../../utils/log.js";

//@ chunk-298p3epx.js:298-334 placement
var CLAUDECODE_EDITRESULT = "claudecode/editResult";
var EDIT_RESULT_V1 = "1";
//@ chunk-298p3epx.js:334-383 placement
function asksForEditResult(args, meta) {
  return args === EDIT && isPlainObject(meta) && meta[CLAUDECODE_EDITRESULT] === EDIT_RESULT_V1;
}
//@ chunk-298p3epx.js:383-605 placement
/**
 * 为 mcp serve 的编辑结果附加 claudecode/editResult 元数据。
 */
async function withEditResult(result, meta) {
  if (result.isError === true || meta.subagentFrameResult === undefined) return result;
  try {
    if ((await meta.subagentFrameResultHolds?.()) === false) return result;
  } catch (error) {
    logError(error);
    return result;
  }
  return {
    ...result,
    _meta: {
      ...result._meta,
      [CLAUDECODE_EDITRESULT]: meta.subagentFrameResult,
    },
  };
}
export { asksForEditResult, withEditResult };
