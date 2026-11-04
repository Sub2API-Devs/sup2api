/**
 * services/artifacts/sandboxEgress.ts
 *
 * 2.1.316 新增：沙箱出站检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (2)
 * attribution: placement 2
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { logForDebugging } from "../../utils/debug.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { isRemoteEnvironmentAny, isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { ATTESTATION_KIND_TTL_MS } from "./attestation.js";

//@ chunk-jv307fw4.js:21112-21352 placement
/**
 * 记录（或撤销）某环境的沙箱出口网络设置，并写调试日志。
 */
function setSandboxEgress(env, envArg) {
  let liveState = getLiveState();
  if (envArg === undefined) {
    if (liveState.sandboxEgress.delete(env))
      logForDebugging(`[artifact] sandbox egress setting for ${env} withdrawn`);
    return;
  }
  liveState.sandboxEgress.set(env, {
    setting: envArg,
    at: Date.now(),
  });
  logForDebugging(`[artifact] sandbox egress setting for ${env}: ${envArg}`);
}
//@ chunk-jv307fw4.js:21352-21536 placement
/**
 * 判断当前环境沙箱出口网络是否关闭：不在 Cowork 时按远程环境给出 undefined/false；有未过期记录时返回 setting 是否为 disabled。
 */
function isSandboxEgressDisabled(env_2 = claudeAiEnvironment()) {
  if (!isRemoteEnvironmentAny())
    return env.CLAUDE_CODE_REMOTE === true && !isBridgeEnvironment() ? undefined : false;
  let egress = getLiveState().sandboxEgress.get(env_2);
  if (egress === undefined || Date.now() - egress.at >= ATTESTATION_KIND_TTL_MS) return;
  return egress.setting === "disabled";
}
export { setSandboxEgress, isSandboxEgressDisabled };
