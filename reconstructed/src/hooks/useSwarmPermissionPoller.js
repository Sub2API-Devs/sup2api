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
import { ci } from "../utils/swarm/hostState.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { isConsentRow } from "../components/permissions/consentRows.js";

//@ chunk-rha5p3kj.js:300-545 fingerprint = parsePermissionUpdates (1)
function parsePermissionUpdates(raw) {
  if (!Array.isArray(raw)) return [];
  let schema = permissionUpdateSchema(),
    valid = [];
  for (let entry of raw) {
    let result = schema.safeParse(entry);
    if (result.success) valid.push(result.data);
    else
      logForDebugging(
        `[SwarmPermissionPoller] Dropping malformed permissionUpdate entry: ${result.error.message}`,
        { level: "warn" },
      );
  }
  return valid;
}
//@ chunk-rha5p3kj.js:545-686 fingerprint = registerPermissionCallback (0.778)
function registerPermissionCallback(callback) {
  (ci().swarmPermissions.pending.set(callback.requestId, callback),
    logForDebugging(`[SwarmPermissionPoller] Registered callback for request ${callback.requestId}`));
}
//@ chunk-rha5p3kj.js:686-810 fingerprint = unregisterPermissionCallback (0.736)
function unregisterPermissionCallback(requestId) {
  (ci().swarmPermissions.pending.delete(requestId),
    logForDebugging(`[SwarmPermissionPoller] Unregistered callback for request ${requestId}`));
}
//@ chunk-rha5p3kj.js:810-870 layout
function Yjs(e) {
  return ci().swarmPermissions.pending.has(e);
}
//@ chunk-rha5p3kj.js:870-915 layout
function Xjs() {
  ci().swarmPermissions.clear();
}
//@ chunk-rha5p3kj.js:915-924 layout
var d = !0;
/**
 * 校验领导的批准回复是否对应本请求。
 */
//@ chunk-rha5p3kj.js:924-1251 layout
function matchApprovalReply(e, n) {
  let s = n.toolUseId === void 0 ? d : n.toolUseId === e.toolUseId,
    approvedRequest = n.approvedRequest,
    i =
      approvedRequest === void 0
        ? d
        : approvedRequest.tool_use_id === e.toolUseId && approvedRequest.tool_name === e.toolName,
    r = approvedRequest === void 0 ? d : approvedRequest.input_digest === e.inputDigest;
  if (!s || !i) return "mismatch";
  if (!r) return "input_digest_mismatch";
  return n.toolUseId === void 0 || approvedRequest === void 0 ? "unbound" : "bound";
}
/**
 * 处理领导经 mailbox 回复的权限响应：校验输入摘要（不匹配则拒绝），调用注册的回调并应用 permissionUpdates。
 */
//@ chunk-rha5p3kj.js:1251-2283 fingerprint = processMailboxPermissionResponse (0.411)
function processMailboxPermissionResponse(params) {
  let pending = ci().swarmPermissions.pending,
    callback = pending.get(params.requestId);
  if (!callback)
    return (
      logForDebugging(
        `[SwarmPermissionPoller] No callback registered for mailbox response ${jsonStringify(params.requestId)}`,
      ),
      !1
    );
  pending.delete(params.requestId);
  let o = matchApprovalReply(callback, params);
  if (o === "mismatch" || o === "input_digest_mismatch") {
    let approvedRequest = params.approvedRequest,
      r = params.decision === "approved" ? "approval" : "denial",
      l =
        o === "input_digest_mismatch"
          ? `this ${jsonStringify(callback.toolName)} call (${jsonStringify(callback.toolUseId)}), but its input digest differs`
          : `${approvedRequest ? `${jsonStringify(approvedRequest.tool_name)} (${jsonStringify(approvedRequest.tool_use_id)})` : jsonStringify(params.toolUseId)}, not this ${jsonStringify(callback.toolName)} call (${jsonStringify(callback.toolUseId)})`;
    return (
      logForDebugging(
        `[SwarmPermissionPoller] Refusing ${r} for request ${jsonStringify(params.requestId)}: the leader answered ${l}`,
        { level: "warn" },
      ),
      callback.onRefuse(`The ${r} did not describe this tool call, so it was refused.`, r),
      !0
    );
  }
  if (
    (logForDebugging(
      `[SwarmPermissionPoller] Processing mailbox response for request ${jsonStringify(params.requestId)}: ${params.decision} (${o})`,
    ),
    o === "unbound")
  )
    callback.onUnboundVerdict();
  if (params.decision === "approved") {
    let permissionUpdates = parsePermissionUpdates(params.permissionUpdates),
      updatedInput = params.updatedInput;
    callback.onAllow(updatedInput, permissionUpdates);
  } else callback.onReject(params.feedback);
  return !0;
}
//@ chunk-rha5p3kj.js:2283-2439 fingerprint = registerSandboxPermissionCallback (0.734)
function registerSandboxPermissionCallback(callback) {
  (ci().swarmPermissions.pendingSandbox.set(callback.requestId, callback),
    logForDebugging(`[SwarmPermissionPoller] Registered sandbox callback for request ${callback.requestId}`));
}
//@ chunk-rha5p3kj.js:2439-2506 layout
function Qjs(e) {
  return ci().swarmPermissions.pendingSandbox.has(e);
}
//@ chunk-rha5p3kj.js:2506-3072 fingerprint = processSandboxPermissionResponse (0.603)
function processSandboxPermissionResponse(params) {
  let pendingSandbox = ci().swarmPermissions.pendingSandbox,
    callback = pendingSandbox.get(params.requestId);
  if (!callback)
    return (
      logForDebugging(
        `[SwarmPermissionPoller] No sandbox callback registered for request ${jsonStringify(params.requestId)}`,
      ),
      !1
    );
  if ((pendingSandbox.delete(params.requestId), callback.host !== params.host))
    return (
      logForDebugging(
        `[SwarmPermissionPoller] Refusing sandbox ${params.allow === !0 ? "allow" : "deny"} for request ${jsonStringify(params.requestId)}: the leader answered for ${jsonStringify(params.host)}, not ${jsonStringify(callback.host)}`,
        { level: "warn" },
      ),
      callback.resolve(!1),
      !0
    );
  return (
    logForDebugging(
      `[SwarmPermissionPoller] Processing sandbox response for request ${jsonStringify(params.requestId)}: allow=${jsonStringify(params.allow)}`,
    ),
    callback.resolve(params.allow),
    !0
  );
}
//@ chunk-18hwfzwa.js:1389942-1390271 fingerprint = processResponse (0.348)
function processResponse(h, x, D, L) {
  switch (h) {
    case "yes":
      return { behavior: "allow", updatedInput: x.input, ...(L && { feedback: L }) };
    case "yes-apply-suggestions": {
      if (D === null || !isConsentRow(D)) return { behavior: "allow", updatedInput: x.input };
      return { behavior: "allow", updatedInput: x.input, permissionUpdates: D.applies };
    }
    case "no":
      return { behavior: "deny", ...(L && { feedback: L }) };
  }
}

export {
  registerSandboxPermissionCallback,
  processResponse,
  registerPermissionCallback,
  unregisterPermissionCallback,
  Yjs,
  processMailboxPermissionResponse,
  Qjs,
  processSandboxPermissionResponse,
  Xjs,
};
