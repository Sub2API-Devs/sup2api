/**
 * commands/restart/index.ts
 *
 * 2.1.316 新增：/restart 命令：重启会话并可切换版本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { resetCursor } from "../../main.js";
import { getPlatform } from "../../utils/platform.js";
import { isRunningFromVersionsDir } from "../../utils/deepLink/registerProtocol.js";
import { getTeammateAgentId, getDisableSlashCommands } from "../../bootstrap/state.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { wt } from "../../remote/remoteMode.js";
import { Orn, resolveMaxVersionConfig, TENGU_FANCY_WAND, restartVersionTarget } from "./versionTargets.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasGrowthBookOverride,
  getAllGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";

/**
 * canRestartInPlace：TTY、macOS/Linux、非后台、非远程。
 */
//@ chunk-e6aww6q8.js:2039771-2039933 placement
function canRestartInPlace() {
  if (!resetCursor()) return !1;
  let e = getPlatform();
  if (e !== "macos" && e !== "linux") return !1;
  if (!isRunningFromVersionsDir()) return !1;
  if (getTeammateAgentId() !== void 0) return !1;
  if (isBgSession()) return !1;
  return !wt() && !getDisableSlashCommands();
}
//@ chunk-e6aww6q8.js:2039933-2039999 placement
function Y3s() {
  return (
    canRestartInPlace() &&
    Orn() &&
    resolveMaxVersionConfig() === void 0 &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FANCY_WAND, !1) === !0
  );
}
/**
 * isRestartFlagOn：tengu_fancy_wand。
 */
//@ chunk-e6aww6q8.js:2039999-2040076 placement
function isRestartFlagOn() {
  if (!Orn()) return !1;
  return hasGrowthBookOverride(TENGU_FANCY_WAND)
    ? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FANCY_WAND, !1) === !0
    : getAllGrowthBookFeatures()[TENGU_FANCY_WAND] === !0;
}
/**
 * isRestartCommandEnabled：/restart 的 isEnabled。
 */
//@ chunk-e6aww6q8.js:2040076-2040111 placement
function isRestartCommandEnabled() {
  return canRestartInPlace() && isRestartFlagOn();
}
/**
 * /restart 命令对象（local）；描述：{let e=TGt();return(e.kind==="newer"||e.kind==="older")&&rJn()===void 0?`Restart on ${e.version} and keep this session`:"Restart Claude Code；别名 ["update"]；isEnabled: Mrn；isHidden: {return!Mrn()}；实现 chunk-egxcxk6h.js 的 hzi。
 */
//@ chunk-e6aww6q8.js:2040111-2040494 placement
var restartCommandDefinition = {
    type: "local",
    name: "restart",
    aliases: ["update"],
    get description() {
      let e = restartVersionTarget();
      return (e.kind === "newer" || e.kind === "older") && resolveMaxVersionConfig() === void 0
        ? `Restart on ${e.version} and keep this session`
        : "Restart Claude Code and keep this session";
    },
    supportsNonInteractive: !1,
    isEnabled: isRestartCommandEnabled,
    get isHidden() {
      return !isRestartCommandEnabled();
    },
    get fleetHostCall() {
      return;
    },
    load: () => import("./chunk-egxcxk6h.js"),
  },
  restartCommand = restartCommandDefinition;

export { restartCommand, Y3s };
