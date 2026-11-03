/**
 * cli/print/authAndPolicyRefresh.ts
 *
 * 2.1.316 新增：认证变化后刷新依赖设置，处理“按原样写入”读文件的服务状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (6)
 * attribution: placement 6
 */
import { refreshRemoteManagedSettings } from "../../services/remoteManagedSettings/loader.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { errorKindForTelemetry } from "../../services/policyLimits/startupGate.js";
import { refreshPolicyLimits } from "../../services/policyLimits/PolicyLimitsClient.js";
import { isTransportBacked } from "../transportState.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_PROUD_PEARL } from "../../services/api/withRetry.js";
import { isPolicyVerdictAbsentOrHipaa } from "../../utils/messages/systemInit.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-tyg7f3ek.js:32339-32639 placement
/**
 * claude_authenticate 后刷新远程托管设置与策略限制，失败只记日志。
 */
function refreshAuthDependentSettings(storageV5, credentials) {
  refreshRemoteManagedSettings(undefined, storageV5, credentials).catch((error) =>
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `claude_authenticate: the settings refresh threw (${errorKindForTelemetry(error)})`,
        "claude_authenticate: the settings refresh threw",
      ),
    ),
  );
  refreshPolicyLimits().catch((error) =>
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `claude_authenticate: the policy refresh threw (${errorKindForTelemetry(error)})`,
        "claude_authenticate: the policy refresh threw",
      ),
    ),
  );
}
//@ chunk-tyg7f3ek.js:32639-32676 placement
function isReadFileAsWrittenServed(session) {
  return readFileAsWrittenUnservedReason(session) === undefined;
}
//@ chunk-tyg7f3ek.js:32676-32781 placement
/**
 * 判断 read_file as_written 是否可用：lane 会话恒可用，否则受 HIPAA/策略应答与开关限制。
 */
function readFileAsWrittenUnservedReason(e) {
  if (isTransportBacked(e)) return "lane";
  let n =
    policyReasonForAsWritten() ??
    (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PROUD_PEARL, false) === true ? undefined : "switched_off");
  logAsWrittenServingChange(e, n);
  return n;
}
//@ chunk-tyg7f3ek.js:32781-32890 placement
function policyReasonForAsWritten() {
  try {
    return !isPolicyVerdictAbsentOrHipaa()
      ? undefined
      : hasComplianceTaint("hipaa")
        ? "hipaa"
        : "no_policy_answer";
  } catch {
    return "no_policy_answer";
  }
}
//@ chunk-tyg7f3ek.js:32890-33040 placement
var AS_WRITTEN_UNSERVED_TEXT = {
  hipaa: "the organization is marked hipaa",
  no_policy_answer: "no answer yet from /api/claude_code/policy_limits",
};
var FILE_AS_WRITTEN_SERVED_SLOT = new SessionRootSlot(() => ({
  last: undefined,
}));
//@ chunk-tyg7f3ek.js:33040-33333 placement
function logAsWrittenServingChange(e, n) {
  let r = FILE_AS_WRITTEN_SERVED_SLOT.of(e);
  let s;
  if (n === "hipaa" || n === "no_policy_answer") {
    if (n === r.last) return;
    r.last = n;
    s = `read_file as_written is not served: ${AS_WRITTEN_UNSERVED_TEXT[n]} (${n})`;
  } else if (n === undefined && r.last !== undefined) {
    r.last = undefined;
    s = "read_file as_written is served now";
  } else return;
  try {
    logForDebugging(s, {
      level: "warn",
    });
  } catch {}
}
export { readFileAsWrittenUnservedReason, refreshAuthDependentSettings, isReadFileAsWrittenServed };
