/**
 * remote/tools/reauthoredRequest.ts
 *
 * request_reauthored 闸门：把 check/run/decline 步骤还原成工具调用请求（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d7jrrm3a.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { REMOTE_TOOL_PROTOCOL_VERSION, SERVER_VERDICT_KEY } from "./protocolConstants.js";
import { clampToMaxPageSize } from "./callResults.js";
import { parseCallEnvelope } from "./protocolSchemas.js";
import { pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-d7jrrm3a.js:274-310 placement
/**
 * request_reauthored 的闸门标记值与 5 秒余量。
 */
var REQUEST_REAUTHORED = "request_reauthored";
var EXPIRY_MARGIN_MS = 5000;
//@ chunk-d7jrrm3a.js:310-986 placement
/**
 * 把 reauthored 请求的 check/run/decline 步骤还原成带闸门标记的工具调用请求。
 */
function buildRemoteCallEnvelope(request, marker) {
  if (marker.gate_mark !== REQUEST_REAUTHORED || request.tool_use_id !== marker.tool_use_id)
    return {
      ok: false,
      why: "malformed",
    };
  let base = {
    v: REMOTE_TOOL_PROTOCOL_VERSION,
    call_id: request.tool_use_id,
    expires_in_ms: clampToMaxPageSize(marker.deadline_ms - EXPIRY_MARGIN_MS),
  };
  let caller = {
    kind: "ccr_container",
    tool_host_interface: request.tool_host_interface,
  };
  switch (request.step) {
    case "check":
      return {
        ok: false,
        why: "malformed",
      };
    case "run":
      return parseCallEnvelope({
        ...base,
        caller: {
          ...caller,
          permission_mode: request.permission_context.mode,
          model: request.main_loop_model,
          ...pickAlias(request, [SERVER_VERDICT_KEY, "conversation_id", "compaction_id"]),
        },
        ...(request.approval !== undefined && {
          approval: {
            ask_id: request.approval.ask_digest,
            decision: "allow",
            ...pickAlias(request.approval, ["attested", "permission_updates"]),
          },
        }),
      });
    case "decline":
      return parseCallEnvelope({
        ...base,
        caller,
        approval: {
          ask_id: request.ask_digest,
          decision: "deny",
        },
      });
  }
}
export { buildRemoteCallEnvelope, REQUEST_REAUTHORED };
