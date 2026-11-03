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
import { wlr } from "../../remote/tools/protocolSchemas.js";
import { c0e } from "../hooks/servedHooks/hookSandbox.js";
import { iie } from "../../services/remoteTools/backgroundCommands.js";
import { getToolRemoteExecution } from "../../Tool.js";
import { mergeServingPolicy } from "../../services/remoteTools/pathMapping.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

/**
 * 远程/会话命令的默认策略常量：单次调用时限、命令超时上限，以及默认沙箱策略（工具默认沙箱、禁止后台、固定 cwd、清理凭据环境变量、额外读写拒绝）与审批说明文案。
 */
//@ chunk-5ghnps9r.js:1360-1886 placement
var MAX_CALL_MS = 50000,
  MAX_REQUEST_BYTES = wlr,
  MAX_IN_FLIGHT = 4,
  MAX_TIMEOUT_MS = 45000,
  DEFAULT_COMMAND_POLICY = {
    sandbox: "tool_default",
    background: "forbidden",
    pinCwd: !0,
    scrubCredentialEnv: !0,
    maxTimeoutMs: MAX_TIMEOUT_MS,
    get additionalDenyRead() {
      return c0e();
    },
    get additionalDenyWrite() {
      return c0e();
    },
  },
  APPROVALS_NOTE =
    "Approvals are asked in this session. This machine's rules and hooks still apply. Commands run as they would locally in that folder (sandboxed when its settings sandbox them), foreground only, from the project directory, without credential variables, up to 45 s each.",
  SANDBOX_OVERRIDE_INPUT_KEYS = new Set(["dangerouslyDisableSandbox", ...[]]);
//@ chunk-5ghnps9r.js:1886-2460 placement
function sandboxDefaultPolicy(e = {}) {
  return {
    name: "interim_floor",
    kind: "personal_machine",
    requireEnvelope: !0,
    admission: "device_binding",
    stance: {
      mode: "session",
      honorLocalRules: !0,
      onAsk: "session",
      askOnDestructive: e.askOnDestructive ?? !1,
      unattended: "own_record",
    },
    limits: {
      max_call_ms: MAX_CALL_MS,
      max_command_ms: DEFAULT_COMMAND_POLICY.maxTimeoutMs,
      max_request_bytes: MAX_REQUEST_BYTES,
      max_in_flight: MAX_IN_FLIGHT,
    },
    serves: (t) => iie.has(t.name) && getToolRemoteExecution(t).supported,
    constraints: (t, r) => {
      let s = getToolRemoteExecution(t);
      return mergeServingPolicy(DEFAULT_COMMAND_POLICY, s.supported ? s.tighten : void 0);
    },
    refusedInputFields: (t) => {
      let r = getToolRemoteExecution(t);
      return (r.supported ? (r.refusedInputFields ?? []) : []).filter(
        (n) => !SANDBOX_OVERRIDE_INPUT_KEYS.has(n),
      );
    },
    notes: () => APPROVALS_NOTE,
  };
}
//@ chunk-5ghnps9r.js:2460-2478 placement
var wgt = 8,
  dNt = 512;
//@ chunk-5ghnps9r.js:2478-2552 placement
function Aye() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_fhole", !1) === !0;
  } catch {
    return !1;
  }
}

export { dNt, wgt, SANDBOX_OVERRIDE_INPUT_KEYS, sandboxDefaultPolicy, Aye };
