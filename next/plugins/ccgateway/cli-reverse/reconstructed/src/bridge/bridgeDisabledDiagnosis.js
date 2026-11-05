/**
 * bridge/bridgeDisabledDiagnosis.ts
 *
 * 诊断远程控制因遥测/非必要流量开关而关闭的原因（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-my2r02mp.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isEnvTruthy } from "../utils/envUtils.js";

//@ chunk-my2r02mp.js:14653-14897 placement
/**
 * 识别因 DISABLE_TELEMETRY / DO_NOT_TRACK / 非必要流量开关而关闭远程控制的原因
 */
function diagnoseBridgeDisabledByEnv() {
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC";
  if (process.env.DISABLE_TELEMETRY) return "DISABLE_TELEMETRY";
  if (isEnvTruthy(process.env.DO_NOT_TRACK)) return "DO_NOT_TRACK";
  return null;
}
export { diagnoseBridgeDisabledByEnv };
