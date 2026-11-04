/**
 * remote/remotePermissionBridge.ts
 *
 * 远程权限桥：为远程权限请求合成本地 assistant 消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/remote/remotePermissionBridge.ts
 * pieces: chunk-1qpz7qcd.js (1)
 * attribution: fingerprint 1
 */
import { randomUUID } from "crypto";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";

//@ chunk-1qpz7qcd.js:25296-25657 fingerprint (2.1.88 match: createSyntheticAssistantMessage, 0.52)
/**
 * 构造一条合成的 assistant 消息（文本内容、stop_sequence、空 usage），用于在本地展示远程会话的权限请求上下文。
 */
function createSyntheticAssistantMessage(text, sessionId) {
  return {
    type: "assistant",
    message: {
      diagnostics: null,
      id: randomUUID(),
      container: null,
      model: SYNTHETIC_MODEL,
      role: "assistant",
      stop_details: null,
      stop_reason: "stop_sequence",
      stop_sequence: "",
      type: "message",
      usage: {
        ...EMPTY_USAGE,
      },
      content: [
        {
          type: "text",
          text,
          citations: null,
        },
      ],
      context_management: null,
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
export { createSyntheticAssistantMessage };
