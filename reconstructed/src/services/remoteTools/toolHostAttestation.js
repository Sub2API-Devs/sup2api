/**
 * services/remoteTools/toolHostAttestation.ts
 *
 * 2.1.316 新增：工具宿主证明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0ajrnwwf.js (6)
 * attribution: placement 6
 */
import { jqo } from "../../utils/teleport/securityTier.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { getAttestationFilterPolicy } from "../../bridge/trustedDevice.js";
import { resolveEffectiveAttestation } from "../../bridge/attestationGate.js";
import { normalizeAttestationStatus } from "../../bridge/deviceAttestation.js";
import { SERVED_CALLS_UNATTESTED } from "../../remote/tools/toolHostsNotice.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * 读取工具宿主认证模式：关闭、观察或强制（读取开关失败时为观察）。
 */
//@ chunk-0ajrnwwf.js:418-625 placement
function attestationMode() {
  if (!jqo()) return "off";
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_vast_tulip", !1) === !0 ? "enforce" : "observe";
  } catch {
    return (
      logForDebugging("tool host attestation: reading tengu_vast_tulip threw; observing", { level: "warn" }),
      "observe"
    );
  }
}
//@ chunk-0ajrnwwf.js:625-815 placement
function attestationVerdict(e) {
  let o = getAttestationFilterPolicy(),
    {
      status: status,
      meetsLevel: meetsLevel,
      configException: configException,
    } = resolveEffectiveAttestation(e, o, { isCloudWorker: !1 });
  return {
    status: status,
    verdict: !o.enforce
      ? "not_policed"
      : meetsLevel
        ? "pass"
        : configException
          ? "config_exception"
          : "below_floor",
  };
}
//@ chunk-0ajrnwwf.js:815-889 placement
function Cye(e) {
  let o = attestationMode();
  return o === "off" ? void 0 : { mode: o, ...attestationVerdict(normalizeAttestationStatus(e)) };
}
//@ chunk-0ajrnwwf.js:889-959 placement
function PTe(e) {
  return e?.mode === "enforce" && e.verdict === "below_floor";
}
//@ chunk-0ajrnwwf.js:959-1037 placement
function BBn() {
  let e = Cye("UNSPECIFIED");
  return { attestation: e, heldBack: PTe(e) };
}
/**
 * 向通知通道报告"有未经认证的远程调用"，通道抛错时只记日志。
 */
//@ chunk-0ajrnwwf.js:1037-1200 placement
function noticeUnattestedServedCalls(e) {
  try {
    e?.(SERVED_CALLS_UNATTESTED, REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested"]);
  } catch (error) {
    logForDebugging(
      `[remote-tools] the notice sink threw on ${SERVED_CALLS_UNATTESTED}: ${errorMessage(error)}`,
      { level: "error" },
    );
  }
}

export { Cye, PTe, attestationMode, BBn, noticeUnattestedServedCalls };
