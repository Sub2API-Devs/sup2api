/**
 * tools/REPLTool/scriptCallFrame.ts
 *
 * 把脚本内层调用转成 tool_progress 帧（inner_call / repl_call 两种形状）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5q2ddgj9.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-5q2ddgj9.js:226-696 placement
/**
 * 把脚本内层调用转成 tool_progress 帧（inner_call 与 repl_call 两种形状，可带 input_withheld 标记）。
 */
function scriptCallFrame({ toolUseID, parentToolUseID, data, withheldInput }) {
  if (data.scriptHelper === true) return;
  let toolInput = withheldInput ?? (isPlainObject(data.toolInput) ? data.toolInput : {});
  return {
    type: "tool_progress",
    tool_use_id: toolUseID,
    tool_name: data.toolName,
    parent_tool_use_id: parentToolUseID,
    elapsed_time_seconds: 0,
    inner_call: {
      tool_name: data.toolName,
      tool_input: toolInput,
      tool_use_id: data.toolUseId,
      phase: data.phase,
      ...(withheldInput !== undefined && {
        input_withheld: true,
      }),
    },
    repl_call: {
      inner_tool_name: data.toolName,
      inner_tool_input: toolInput,
      inner_tool_use_id: data.toolUseId,
      phase: data.phase,
    },
  };
}
export { scriptCallFrame };
