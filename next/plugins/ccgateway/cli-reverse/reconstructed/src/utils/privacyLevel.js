/**
 * utils/privacyLevel.ts
 *
 * 隐私级别 default / no-telemetry / essential-traffic 的判定与仅必要流量原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/privacyLevel.ts
 * pieces: chunk-my2r02mp.js (4)
 * attribution: fingerprint 3, file-local 1
 */
import { isEnvTruthy } from "./envUtils.js";

//@ chunk-my2r02mp.js:14213-14433 fingerprint (2.1.88 match: getPrivacyLevel, 0.92)
/**
 * 隐私级别：CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC→essential-traffic；DISABLE_TELEMETRY 或 DO_NOT_TRACK→no-telemetry；否则 default。
 */
function getPrivacyLevel() {
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return "essential-traffic";
  if (process.env.DISABLE_TELEMETRY) return "no-telemetry";
  if (isEnvTruthy(process.env.DO_NOT_TRACK)) return "no-telemetry";
  return "default";
}
//@ chunk-my2r02mp.js:14433-14482 fingerprint (2.1.88 match: isEssentialTrafficOnly, 1)
/**
 * 是否仅必要流量（essential-traffic）。
 */
function isEssentialTrafficOnly() {
  return getPrivacyLevel() === "essential-traffic";
}
//@ chunk-my2r02mp.js:14482-14521 file-local
/**
 * 隐私级别不是 default（关闭 1P/Datadog/GrowthBook/BigQuery 指标）。
 */
function isTelemetryDisabled() {
  return getPrivacyLevel() !== "default";
}
//@ chunk-my2r02mp.js:14521-14653 fingerprint (2.1.88 match: getEssentialTrafficOnlyReason, 1)
/**
 * 返回导致仅必要流量的环境变量名（CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC）或 null。
 */
function getEssentialTrafficOnlyReason() {
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC";
  return null;
}
export { isEssentialTrafficOnly, getEssentialTrafficOnlyReason, isTelemetryDisabled, getPrivacyLevel };
