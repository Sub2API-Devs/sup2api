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
import { isSecurityTierEnabled } from "../../utils/teleport/securityTier.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { getAttestationFilterPolicy } from "../../bridge/trustedDevice.js";
import { resolveEffectiveAttestation } from "../../bridge/attestationGate.js";
import { normalizeAttestationStatus } from "../../bridge/deviceAttestation.js";
import { SERVED_CALLS_UNATTESTED } from "../../remote/tools/toolHostsNotice.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-0ajrnwwf.js:418-625 placement
/**
 * 读取工具宿主认证模式：关闭、观察或强制（读取开关失败时为观察）。
 */
function attestationMode() {
  if (!isSecurityTierEnabled()) return "off";
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_vast_tulip", false) === true ? "enforce" : "observe";
  } catch {
    logForDebugging("tool host attestation: reading tengu_vast_tulip threw; observing", {
      level: "warn",
    });
    return "observe";
  }
}
//@ chunk-0ajrnwwf.js:625-815 placement
function attestationVerdict(e) {
  let attestationFilterPolicy = getAttestationFilterPolicy();
  let { status, meetsLevel, configException } = resolveEffectiveAttestation(e, attestationFilterPolicy, {
    isCloudWorker: false,
  });
  return {
    status,
    verdict: !attestationFilterPolicy.enforce
      ? "not_policed"
      : meetsLevel
        ? "pass"
        : configException
          ? "config_exception"
          : "below_floor",
  };
}
//@ chunk-0ajrnwwf.js:815-889 placement
/**
 * 由宿主状态生成证明结论；证明模式为关闭时返回 undefined。
 */
function attestationFor(attestationStatus) {
  let o = attestationMode();
  return o === "off"
    ? undefined
    : {
        mode: o,
        ...attestationVerdict(normalizeAttestationStatus(attestationStatus)),
      };
}
//@ chunk-0ajrnwwf.js:889-959 placement
/**
 * 是否处于强制模式且证明等级低于下限（需要暂扣调用）。
 */
function isBelowFloorEnforced(e) {
  return e?.mode === "enforce" && e.verdict === "below_floor";
}
//@ chunk-0ajrnwwf.js:959-1037 placement
/**
 * 以未知状态得出证明结果与是否需要暂扣。
 */
function unknownAttestationResult() {
  let e = attestationFor("UNSPECIFIED");
  return {
    attestation: e,
    heldBack: isBelowFloorEnforced(e),
  };
}
//@ chunk-0ajrnwwf.js:1037-1200 placement
/**
 * 向通知通道报告"有未经认证的远程调用"，通道抛错时只记日志。
 */
function noticeUnattestedServedCalls(onNotice) {
  try {
    onNotice?.(
      SERVED_CALLS_UNATTESTED,
      REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested"],
    );
  } catch (error) {
    logForDebugging(
      `[remote-tools] the notice sink threw on ${SERVED_CALLS_UNATTESTED}: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
}
export {
  attestationFor,
  isBelowFloorEnforced,
  attestationMode,
  unknownAttestationResult,
  noticeUnattestedServedCalls,
};
