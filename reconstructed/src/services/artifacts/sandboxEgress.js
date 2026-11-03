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
import { uC, vS } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { Ct } from "./attestation.js";

/**
 * 记录（或撤销）某环境的沙箱出口网络设置，并写调试日志。
 */
//@ chunk-jv307fw4.js:21112-21352 placement
function setSandboxEgress(e, n) {
  let r = getLiveState();
  if (n === void 0) {
    if (r.sandboxEgress.delete(e)) logForDebugging(`[artifact] sandbox egress setting for ${e} withdrawn`);
    return;
  }
  (r.sandboxEgress.set(e, { setting: n, at: Date.now() }),
    logForDebugging(`[artifact] sandbox egress setting for ${e}: ${n}`));
}
/**
 * 判断当前环境沙箱出口网络是否关闭：不在 Cowork 时按远程环境给出 undefined/false；有未过期记录时返回 setting 是否为 disabled。
 */
//@ chunk-jv307fw4.js:21352-21536 placement
function isSandboxEgressDisabled(e = claudeAiEnvironment()) {
  if (!uC()) return env.CLAUDE_CODE_REMOTE === !0 && !vS() ? void 0 : !1;
  let n = getLiveState().sandboxEgress.get(e);
  if (n === void 0 || Date.now() - n.at >= Ct) return;
  return n.setting === "disabled";
}

export { setSandboxEgress, isSandboxEgressDisabled };
