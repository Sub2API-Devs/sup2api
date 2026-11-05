/**
 * cli/print/authAndPolicyRefresh.ts
 *
 * 2.1.316 新增：认证变化后刷新依赖设置，处理“按原样写入”读文件的服务状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (7)
 * attribution: placement 6, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { refreshRemoteManagedSettings } from "../../services/remoteManagedSettings/loader.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { errorKindForTelemetry } from "../../services/policyLimits/startupGate.js";
import { refreshPolicyLimits } from "../../services/policyLimits/PolicyLimitsClient.js";
import { isTransportBacked } from "../transportState.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_PROUD_PEARL, TENGU_PATIENT_WALNUT } from "../../services/api/withRetry.js";
import { isPolicyVerdictAbsentOrHipaa } from "../../utils/messages/systemInit.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:35012-35313 placement
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
//@ chunk-0yw3taqg.js:51117-51154 placement
function isReadFileAsWrittenServed(params) {
  return readFileAsWrittenUnservedReason(params) === undefined;
}
//@ chunk-0yw3taqg.js:51154-51259 placement
/**
 * 判断 read_file as_written 是否可用：lane 会话恒可用，否则受 HIPAA/策略应答与开关限制。
 */
function readFileAsWrittenUnservedReason(params) {
  if (isTransportBacked(params)) return "lane";
  let reason =
    policyReasonForAsWritten() ??
    (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PROUD_PEARL, false) === true ? undefined : "switched_off");
  logAsWrittenServingChange(params, reason);
  return reason;
}
//@ chunk-0yw3taqg.js:51259-51295 layout
function isAsWrittenSearchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PATIENT_WALNUT, false) === true;
}
//@ chunk-0yw3taqg.js:51295-51404 placement
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
//@ chunk-0yw3taqg.js:51404-51554 placement
var AS_WRITTEN_UNSERVED_TEXT; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var FILE_AS_WRITTEN_SERVED_SLOT;
deferInit("chunk-0yw3taqg.js:51404", () => {
  AS_WRITTEN_UNSERVED_TEXT = {
    hipaa: "the organization is marked hipaa",
    no_policy_answer: "no answer yet from /api/claude_code/policy_limits",
  };
  FILE_AS_WRITTEN_SERVED_SLOT = new SessionRootSlot(() => ({
    last: undefined,
  }));
});
//@ chunk-0yw3taqg.js:51554-51847 placement
function logAsWrittenServingChange(params, reason) {
  let slot = FILE_AS_WRITTEN_SERVED_SLOT.of(params);
  let message;
  if (reason === "hipaa" || reason === "no_policy_answer") {
    if (reason === slot.last) return;
    slot.last = reason;
    message = `read_file as_written is not served: ${AS_WRITTEN_UNSERVED_TEXT[reason]} (${reason})`;
  } else if (reason === undefined && slot.last !== undefined) {
    slot.last = undefined;
    message = "read_file as_written is served now";
  } else return;
  try {
    logForDebugging(message, {
      level: "warn",
    });
  } catch {}
}
export {
  isAsWrittenSearchEnabled,
  readFileAsWrittenUnservedReason,
  refreshAuthDependentSettings,
  isReadFileAsWrittenServed,
};
