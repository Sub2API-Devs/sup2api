/**
 * hooks/useSwarmPermissionPoller.ts
 *
 * 队友侧权限回复轮询：注册回调，处理领导经 mailbox 回复的权限/沙箱批准，校验输入摘要。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSwarmPermissionPoller.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-rha5p3kj.js (11)
 * attribution: fingerprint 7, layout 5
 */
import { permissionUpdateSchema } from "../utils/hooks/hookSpecificOutput.js";
import { logForDebugging } from "../utils/debug.js";
import { swarmHostState } from "../utils/swarm/hostState.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { isConsentRow } from "../components/permissions/consentRows.js";

//@ chunk-rha5p3kj.js:300-545 fingerprint = parsePermissionUpdates (1)
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
//@ chunk-rha5p3kj.js:545-686 fingerprint = registerPermissionCallback (0.778)
function registerPermissionCallback(callback) {
  swarmHostState().swarmPermissions.pending.set(callback.requestId, callback);
  logForDebugging(`[SwarmPermissionPoller] Registered callback for request ${callback.requestId}`);
}
//@ chunk-rha5p3kj.js:686-810 fingerprint = unregisterPermissionCallback (0.736)
function unregisterPermissionCallback(requestId) {
  swarmHostState().swarmPermissions.pending.delete(requestId);
  logForDebugging(`[SwarmPermissionPoller] Unregistered callback for request ${requestId}`);
}
//@ chunk-rha5p3kj.js:810-870 layout
/**
 * 函数 hasPendingSwarmPermission（该 id 有未决 swarm 权限）；位于「队友侧权限回复轮询：注册回调，处理领导经 mailbox 回复的权限/沙箱批准，校验输入摘要」模块。
 */
function hasPendingSwarmPermission(toolUseId) {
  return swarmHostState().swarmPermissions.pending.has(toolUseId);
}
//@ chunk-rha5p3kj.js:870-915 layout
/**
 * 函数 clearSwarmPermissions（清空 swarm 权限）；位于「队友侧权限回复轮询：注册回调，处理领导经 mailbox 回复的权限/沙箱批准，校验输入摘要」模块。
 */
function clearSwarmPermissions() {
  swarmHostState().swarmPermissions.clear();
}
//@ chunk-rha5p3kj.js:915-924 layout
var SWARM_POLLING_ENABLED = true;
//@ chunk-rha5p3kj.js:924-1251 layout
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
//@ chunk-rha5p3kj.js:1251-2283 fingerprint = processMailboxPermissionResponse (0.411)
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
//@ chunk-rha5p3kj.js:2283-2439 fingerprint = registerSandboxPermissionCallback (0.734)
function registerSandboxPermissionCallback(callback) {
  swarmHostState().swarmPermissions.pendingSandbox.set(callback.requestId, callback);
  logForDebugging(`[SwarmPermissionPoller] Registered sandbox callback for request ${callback.requestId}`);
}
//@ chunk-rha5p3kj.js:2439-2506 layout
/**
 * 函数 hasPendingSandboxPermission（该 id 有未决沙箱权限）；位于「队友侧权限回复轮询：注册回调，处理领导经 mailbox 回复的权限/沙箱批准，校验输入摘要」模块。
 */
function hasPendingSandboxPermission(toolUseId) {
  return swarmHostState().swarmPermissions.pendingSandbox.has(toolUseId);
}
//@ chunk-rha5p3kj.js:2506-3072 fingerprint = processSandboxPermissionResponse (0.603)
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
//@ chunk-18hwfzwa.js:1389942-1390271 fingerprint = processResponse (0.348)
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
  registerSandboxPermissionCallback,
  processResponse,
  registerPermissionCallback,
  unregisterPermissionCallback,
  hasPendingSwarmPermission,
  processMailboxPermissionResponse,
  hasPendingSandboxPermission,
  processSandboxPermissionResponse,
  clearSwarmPermissions,
};
