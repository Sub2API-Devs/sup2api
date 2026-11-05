/**
 * remote/remotePermissionBridge.ts
 *
 * 远程权限桥：为远程权限请求合成本地 assistant 消息
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/remote/remotePermissionBridge.ts
 * pieces: chunk-ck4jrdtf.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { SYNTHETIC_MODEL } from "../utils/messages.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";

//@ chunk-ck4jrdtf.js:25799-26160 fingerprint (2.1.88 match: createSyntheticAssistantMessage, 0.54)
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
