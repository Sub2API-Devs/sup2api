/**
 * hooks/useSwarmPermissionPoller.ts
 *
 * 队友侧权限回复轮询：注册回调，处理领导经 mailbox 回复的权限/沙箱批准，校验输入摘要。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSwarmPermissionPoller.ts
 * pieces: chunk-czq1j3j2.js (1), chunk-pzfssawg.js (11)
 * attribution: fingerprint 7, layout 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { permissionUpdateSchema } from "../utils/hooks/hookSpecificOutput.js";
import { logForDebugging } from "../utils/debug.js";
import { swarmHostState } from "../utils/swarm/hostState.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { isConsentRow } from "../components/permissions/consentRows.js";

//@ chunk-pzfssawg.js:300-545 fingerprint (2.1.88 match: parsePermissionUpdates, 1)
function parsePermissionUpdates(raw) {
  if (!Array.isArray(raw)) return [];
  let schema = permissionUpdateSchema();
  let valid = [];
  for (let entry of raw) {
    let result = schema.safeParse(entry);
    if (result.success) valid.push(result.data);
    else
      logForDebugging(
        `[SwarmPermissionPoller] Dropping malformed permissionUpdate entry: ${result.error.message}`,
        {
          level: "warn",
        },
      );
  }
  return valid;
}
//@ chunk-pzfssawg.js:545-686 fingerprint (2.1.88 match: registerPermissionCallback, 0.779)
function registerPermissionCallback(callback) {
  swarmHostState().swarmPermissions.pending.set(callback.requestId, callback);
  logForDebugging(`[SwarmPermissionPoller] Registered callback for request ${callback.requestId}`);
}
//@ chunk-pzfssawg.js:686-810 fingerprint (2.1.88 match: unregisterPermissionCallback, 0.737)
function unregisterPermissionCallback(requestId) {
  swarmHostState().swarmPermissions.pending.delete(requestId);
  logForDebugging(`[SwarmPermissionPoller] Unregistered callback for request ${requestId}`);
}
//@ chunk-pzfssawg.js:810-870 layout
/**
 * 函数 hasPendingSwarmPermission（该 id 有未决 swarm 权限）；位于「队友侧权限回复轮询：注册回调，处理领导经 mailbox 回复的权限/沙箱批准，校验输入摘要」模块。
 */
function hasPendingSwarmPermission(toolUseId) {
  return swarmHostState().swarmPermissions.pending.has(toolUseId);
}
//@ chunk-pzfssawg.js:870-915 layout
/**
 * 函数 clearSwarmPermissions（清空 swarm 权限）；位于「队友侧权限回复轮询：注册回调，处理领导经 mailbox 回复的权限/沙箱批准，校验输入摘要」模块。
 */
function clearSwarmPermissions() {
  swarmHostState().swarmPermissions.clear();
}
//@ chunk-pzfssawg.js:915-924 layout
var SWARM_POLLING_ENABLED = true;
//@ chunk-pzfssawg.js:924-1251 layout
/**
 * 校验领导的批准回复是否对应本请求。
 */
function matchApprovalReply(callback, params) {
  let toolUseMatches =
    params.toolUseId === undefined ? SWARM_POLLING_ENABLED : params.toolUseId === callback.toolUseId;
  let approvedRequest = params.approvedRequest;
  let requestMatches =
    approvedRequest === undefined
      ? SWARM_POLLING_ENABLED
      : approvedRequest.tool_use_id === callback.toolUseId && approvedRequest.tool_name === callback.toolName;
  let digestMatches =
    approvedRequest === undefined
      ? SWARM_POLLING_ENABLED
      : approvedRequest.input_digest === callback.inputDigest;
  if (!toolUseMatches || !requestMatches) return "mismatch";
  if (!digestMatches) return "input_digest_mismatch";
  return params.toolUseId === undefined || approvedRequest === undefined ? "unbound" : "bound";
}
//@ chunk-pzfssawg.js:1251-2283 fingerprint (2.1.88 match: processMailboxPermissionResponse, 0.416)
/**
 * 处理领导经 mailbox 回复的权限响应：校验输入摘要（不匹配则拒绝），调用注册的回调并应用 permissionUpdates。
 */
function processMailboxPermissionResponse(params) {
  let pending = swarmHostState().swarmPermissions.pending;
  let callback = pending.get(params.requestId);
  if (!callback) {
    logForDebugging(
      `[SwarmPermissionPoller] No callback registered for mailbox response ${jsonStringify(params.requestId)}`,
    );
    return false;
  }
  pending.delete(params.requestId);
  let matchKind = matchApprovalReply(callback, params);
  if (matchKind === "mismatch" || matchKind === "input_digest_mismatch") {
    let approvedRequest = params.approvedRequest;
    let decisionKind = params.decision === "approved" ? "approval" : "denial";
    let answerDescription =
      matchKind === "input_digest_mismatch"
        ? `this ${jsonStringify(callback.toolName)} call (${jsonStringify(callback.toolUseId)}), but its input digest differs`
        : `${approvedRequest ? `${jsonStringify(approvedRequest.tool_name)} (${jsonStringify(approvedRequest.tool_use_id)})` : jsonStringify(params.toolUseId)}, not this ${jsonStringify(callback.toolName)} call (${jsonStringify(callback.toolUseId)})`;
    logForDebugging(
      `[SwarmPermissionPoller] Refusing ${decisionKind} for request ${jsonStringify(params.requestId)}: the leader answered ${answerDescription}`,
      {
        level: "warn",
      },
    );
    callback.onRefuse(
      `The ${decisionKind} did not describe this tool call, so it was refused.`,
      decisionKind,
    );
    return true;
  }
  logForDebugging(
    `[SwarmPermissionPoller] Processing mailbox response for request ${jsonStringify(params.requestId)}: ${params.decision} (${matchKind})`,
  );
  if (matchKind === "unbound") callback.onUnboundVerdict();
  if (params.decision === "approved") {
    let permissionUpdates = parsePermissionUpdates(params.permissionUpdates);
    let updatedInput = params.updatedInput;
    callback.onAllow(updatedInput, permissionUpdates);
  } else callback.onReject(params.feedback);
  return true;
}
//@ chunk-pzfssawg.js:2283-2439 fingerprint (2.1.88 match: registerSandboxPermissionCallback, 0.733)
function registerSandboxPermissionCallback(callback) {
  swarmHostState().swarmPermissions.pendingSandbox.set(callback.requestId, callback);
  logForDebugging(`[SwarmPermissionPoller] Registered sandbox callback for request ${callback.requestId}`);
}
//@ chunk-pzfssawg.js:2439-2506 layout
/**
 * 函数 hasPendingSandboxPermission（该 id 有未决沙箱权限）；位于「队友侧权限回复轮询：注册回调，处理领导经 mailbox 回复的权限/沙箱批准，校验输入摘要」模块。
 */
function hasPendingSandboxPermission(toolUseId) {
  return swarmHostState().swarmPermissions.pendingSandbox.has(toolUseId);
}
//@ chunk-pzfssawg.js:2506-3072 fingerprint (2.1.88 match: processSandboxPermissionResponse, 0.603)
function processSandboxPermissionResponse(params) {
  let pendingSandbox = swarmHostState().swarmPermissions.pendingSandbox;
  let callback = pendingSandbox.get(params.requestId);
  if (!callback) {
    logForDebugging(
      `[SwarmPermissionPoller] No sandbox callback registered for request ${jsonStringify(params.requestId)}`,
    );
    return false;
  }
  pendingSandbox.delete(params.requestId);
  if (callback.host !== params.host) {
    logForDebugging(
      `[SwarmPermissionPoller] Refusing sandbox ${params.allow === true ? "allow" : "deny"} for request ${jsonStringify(params.requestId)}: the leader answered for ${jsonStringify(params.host)}, not ${jsonStringify(callback.host)}`,
      {
        level: "warn",
      },
    );
    callback.resolve(false);
    return true;
  }
  logForDebugging(
    `[SwarmPermissionPoller] Processing sandbox response for request ${jsonStringify(params.requestId)}: allow=${jsonStringify(params.allow)}`,
  );
  callback.resolve(params.allow);
  return true;
}
//@ chunk-czq1j3j2.js:1412711-1413040 fingerprint (2.1.88 match: processResponse, 0.349)
function processResponse(choice, payload, consentRow, feedback) {
  switch (choice) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(feedback && {
          feedback,
        }),
      };
    case "yes-apply-suggestions": {
      if (consentRow === null || !isConsentRow(consentRow))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: consentRow.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
        ...(feedback && {
          feedback,
        }),
      };
  }
}
export {
  registerPermissionCallback,
  processMailboxPermissionResponse,
  unregisterPermissionCallback,
  clearSwarmPermissions,
  registerSandboxPermissionCallback,
  processResponse,
  hasPendingSwarmPermission,
  hasPendingSandboxPermission,
  processSandboxPermissionResponse,
};
