/**
 * utils/codeMode/scriptErrorMessages.ts
 *
 * 脚本错误结果文案：错误 id 前缀、是否显示在调用上、被扣留的脚本调用 id（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c7pfs23n.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { createAssistantMessage, createUserMessage } from "../messages.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";

//@ chunk-c7pfs23n.js:302-322 placement
var REPL_ERROR = "repl-error-";
//@ chunk-c7pfs23n.js:322-857 placement
/**
 * 构造脚本报错的虚拟 tool_use/tool_result 对（带 repl-error- 前缀 id、可带停止原因与扣留 id）。
 */
function replErrorMessages(message, { clientsDrawCalls, shownOnCall, stoppedBy, withheldScriptToolUseId }) {
  let toolUseId = `${REPL_ERROR}${randomUUID()}`;
  let remoteVisibility = clientsDrawCalls && {
    visibleToRemoteClients: true,
  };
  return [
    {
      ...createAssistantMessage({
        content: [
          {
            type: "tool_use",
            id: toolUseId,
            name: REPL_TOOL_NAME,
            input: {},
          },
        ],
        isVirtual: true,
      }),
      ...remoteVisibility,
      ...(shownOnCall && {
        scriptErrorCopy: true,
      }),
    },
    {
      ...createUserMessage({
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUseId,
            content: message,
            is_error: true,
          },
        ],
        toolUseResult: {
          error: message,
          ...(stoppedBy !== undefined && {
            stoppedBy,
          }),
          ...(shownOnCall && {
            shownOnCall: true,
          }),
        },
        isVirtual: true,
      }),
      turnCompanion: true,
      ...remoteVisibility,
      ...(clientsDrawCalls && {
        remoteToolResult: {
          kind: "stored",
          text: message,
        },
      }),
      ...(withheldScriptToolUseId !== undefined && {
        withheldScriptToolUseId,
      }),
    },
  ];
}
export { replErrorMessages };
