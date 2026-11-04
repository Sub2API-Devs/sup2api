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
import { isRunningFromVersionsDir_2 } from "../../utils/deepLink/registerProtocol.js";
import { getTeammateAgentId, getDisableSlashCommands } from "../../bootstrap/state.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import {
  isGrowthBookFreshOrOverridden,
  resolveMaxVersionConfig,
  TENGU_FANCY_WAND,
  restartVersionTarget,
} from "./versionTargets.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasGrowthBookOverride,
  getAllGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:2039771-2039933 placement
/**
 * canRestartInPlace：TTY、macOS/Linux、非后台、非远程。
 */
function canRestartInPlace() {
  if (!resetCursor()) return false;
  let platform = getPlatform();
  if (platform !== "macos" && platform !== "linux") return false;
  if (!isRunningFromVersionsDir_2()) return false;
  if (getTeammateAgentId() !== undefined) return false;
  if (isBgSession()) return false;
  return !isRemoteSessionAvailable() && !getDisableSlashCommands();
}
//@ chunk-e6aww6q8.js:2039933-2039999 placement
/**
 * /restart 命令的可用性：可原地重启、GrowthBook 新鲜或被覆盖、且满足其他前置条件。
 */
function canRestartCommandRun() {
  return (
    canRestartInPlace() &&
    isGrowthBookFreshOrOverridden() &&
    resolveMaxVersionConfig() === undefined &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FANCY_WAND, false) === true
  );
}
//@ chunk-e6aww6q8.js:2039999-2040076 placement
/**
 * isRestartFlagOn：tengu_fancy_wand。
 */
function isRestartFlagOn() {
  if (!isGrowthBookFreshOrOverridden()) return false;
  return hasGrowthBookOverride(TENGU_FANCY_WAND)
    ? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FANCY_WAND, false) === true
    : getAllGrowthBookFeatures()[TENGU_FANCY_WAND] === true;
}
//@ chunk-e6aww6q8.js:2040076-2040111 placement
/**
 * isRestartCommandEnabled：/restart 的 isEnabled。
 */
function isRestartCommandEnabled() {
  return canRestartInPlace() && isRestartFlagOn();
}
//@ chunk-e6aww6q8.js:2040111-2040494 placement
/**
 * /restart 命令对象（local）；描述：{let e=TGt();return(e.kind==="newer"||e.kind==="older")&&rJn()===void 0?`Restart on ${e.version} and keep this session`:"Restart Claude Code；别名 ["update"]；isEnabled: Mrn；isHidden: {return!Mrn()}；实现 chunk-egxcxk6h.js 的 hzi。
 */
var restartCommandDefinition = {
  type: "local",
  name: "restart",
  aliases: ["update"],
  get description() {
    let target = restartVersionTarget();
    return (target.kind === "newer" || target.kind === "older") && resolveMaxVersionConfig() === undefined
      ? `Restart on ${target.version} and keep this session`
      : "Restart Claude Code and keep this session";
  },
  supportsNonInteractive: false,
  isEnabled: isRestartCommandEnabled,
  get isHidden() {
    return !isRestartCommandEnabled();
  },
  get fleetHostCall() {
    return;
  },
  load: () => import("./restart.js"),
};
var restartCommand = restartCommandDefinition;
export { restartCommand, canRestartCommandRun };
