/**
 * entrypoints/mcpServe/editResult.ts
 *
 * 2.1.316 新增。为 mcp serve 的编辑结果附加 claudecode/editResult 元数据。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dfyz39v9.js (3)
 * attribution: placement 3
 */
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { logError } from "../../utils/log.js";

//@ chunk-dfyz39v9.js:298-334 placement
var CLAUDECODE_EDITRESULT = "claudecode/editResult",
  u = "1";
//@ chunk-dfyz39v9.js:334-383 placement
function asksForEditResult(o, t) {
  return o === FILE_EDIT_TOOL_NAME && isPlainObject(t) && t[CLAUDECODE_EDITRESULT] === u;
}
/**
 * 为 mcp serve 的编辑结果附加 claudecode/editResult 元数据。
 */
//@ chunk-dfyz39v9.js:383-605 placement
async function withEditResult(o, t) {
  if (o.isError === !0 || t.subagentFrameResult === void 0) return o;
  try {
    if ((await t.subagentFrameResultHolds?.()) === !1) return o;
  } catch (error) {
    return (logError(error), o);
  }
  return { ...o, _meta: { ...o._meta, [CLAUDECODE_EDITRESULT]: t.subagentFrameResult } };
}

export { asksForEditResult, withEditResult };
