/**
 * utils/sandbox/sandboxDefaultPolicy.ts
 *
 * 沙箱默认策略（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5ghnps9r.js (4)
 * attribution: placement 4
 */
import { MAX_RESULT_BYTES } from "../../remote/tools/protocolSchemas.js";
import { strictRealpathCache } from "../hooks/servedHooks/hookSandbox.js";
import { DEVICE_PASSTHROUGH_TOOL_NAMES } from "../../services/remoteTools/backgroundCommands.js";
import { getToolRemoteExecution } from "../../Tool.js";
import { mergeServingPolicy } from "../../services/remoteTools/pathMapping.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-5ghnps9r.js:1360-1886 placement
/**
 * 远程/会话命令的默认策略常量：单次调用时限、命令超时上限，以及默认沙箱策略（工具默认沙箱、禁止后台、固定 cwd、清理凭据环境变量、额外读写拒绝）与审批说明文案。
 */
var MAX_CALL_MS = 50000;
var MAX_REQUEST_BYTES = MAX_RESULT_BYTES;
var MAX_IN_FLIGHT = 4;
var MAX_TIMEOUT_MS = 45000;
var DEFAULT_COMMAND_POLICY = {
  sandbox: "tool_default",
  background: "forbidden",
  pinCwd: true,
  scrubCredentialEnv: true,
  maxTimeoutMs: MAX_TIMEOUT_MS,
  get additionalDenyRead() {
    return strictRealpathCache();
  },
  get additionalDenyWrite() {
    return strictRealpathCache();
  },
};
var APPROVALS_NOTE =
  "Approvals are asked in this session. This machine's rules and hooks still apply. Commands run as they would locally in that folder (sandboxed when its settings sandbox them), foreground only, from the project directory, without credential variables, up to 45 s each.";
var SANDBOX_OVERRIDE_INPUT_KEYS = new Set(["dangerouslyDisableSandbox", ...[]]);
//@ chunk-5ghnps9r.js:1886-2460 placement
function sandboxDefaultPolicy(e = {}) {
  return {
    name: "interim_floor",
    kind: "personal_machine",
    requireEnvelope: true,
    admission: "device_binding",
    stance: {
      mode: "session",
      honorLocalRules: true,
      onAsk: "session",
      askOnDestructive: e.askOnDestructive ?? false,
      unattended: "own_record",
    },
    limits: {
      max_call_ms: MAX_CALL_MS,
      max_command_ms: DEFAULT_COMMAND_POLICY.maxTimeoutMs,
      max_request_bytes: MAX_REQUEST_BYTES,
      max_in_flight: MAX_IN_FLIGHT,
    },
    serves: (t) => DEVICE_PASSTHROUGH_TOOL_NAMES.has(t.name) && getToolRemoteExecution(t).supported,
    constraints: (t, r) => {
      let toolRemoteExecution = getToolRemoteExecution(t);
      return mergeServingPolicy(
        DEFAULT_COMMAND_POLICY,
        toolRemoteExecution.supported ? toolRemoteExecution.tighten : undefined,
      );
    },
    refusedInputFields: (t) => {
      let toolRemoteExecution = getToolRemoteExecution(t);
      return (toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : []).filter(
        (n) => !SANDBOX_OVERRIDE_INPUT_KEYS.has(n),
      );
    },
    notes: () => APPROVALS_NOTE,
  };
}
//@ chunk-5ghnps9r.js:2460-2478 placement
/**
 * SANDBOX_MAX_DEPTH：沙箱默认策略的深度上限；SANDBOX_MAX_PATH_LENGTH：沙箱默认策略的路径长度上限（同一声明共 2 个绑定）。
 */
var SANDBOX_MAX_DEPTH = 8;
var SANDBOX_MAX_PATH_LENGTH = 512;
//@ chunk-5ghnps9r.js:2478-2552 placement
/**
 * violinFholeEnabled：沙箱默认策略开关（tengu_violin_fhole）。
 */
function violinFholeEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_fhole", false) === true;
  } catch {
    return false;
  }
}
export {
  SANDBOX_MAX_PATH_LENGTH,
  SANDBOX_MAX_DEPTH,
  SANDBOX_OVERRIDE_INPUT_KEYS,
  sandboxDefaultPolicy,
  violinFholeEnabled,
};
