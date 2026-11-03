/**
 * bridge/bridgeDisabledDiagnosis.ts
 *
 * 诊断远程控制因遥测/非必要流量开关而关闭的原因（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bbtre4r8.js (1)
 * attribution: placement 1
 */
import { isEnvTruthy } from "../utils/envUtils.js";

/**
 * 识别因 DISABLE_TELEMETRY / DO_NOT_TRACK / 非必要流量开关而关闭远程控制的原因
 */
//@ chunk-bbtre4r8.js:14503-14747 placement
function diagnoseBridgeDisabledByEnv() {
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC";
  if (process.env.DISABLE_TELEMETRY) return "DISABLE_TELEMETRY";
  if (isEnvTruthy(process.env.DO_NOT_TRACK)) return "DO_NOT_TRACK";
  return null;
}

export { diagnoseBridgeDisabledByEnv };
