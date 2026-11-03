/**
 * utils/claudeAiSync/syncedSkillAccess.ts
 *
 * 2.1.316 新增：已同步技能的访问控制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (14)
 * attribution: placement 14
 */
import { realpath } from "fs/promises";
import { isSyncedSkill, isKilledHostCatalogSkill } from "../commandPredicates.js";
import { refreshVetoAndRead } from "./skillsSync.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import {
  isSyncPaused,
  syncedRootsUnder,
  isSyncedMarketplace,
  readSyncBucket,
  otherAccountReason,
  notListedReason,
  isPluginsSyncVetoed,
  logSyncedCommandRefused as logSyncedCommandRefused_2,
  refusalTextFor,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { sanitizeTelemetryString } from "../sanitization.js";
import { logForDebugging } from "../debug.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { findGitRoot, findGitRootRecheckingNegative } from "../git.js";
import { ANY_PATTERN } from "../attributionFileClasses.js";

//@ chunk-e6aww6q8.js:1657467-1657508 placement
/**
 * 已同步技能不可用时返回原因，否则检查是否是宿主目录技能被清除。
 */
function syncedSkillRefusalReason(e) {
  return isSyncedSkill(e) ? refreshVetoAndRead() : isKilledHostCatalogSkill(e);
}
//@ chunk-e6aww6q8.js:1657508-1657542 placement
var TENGU_IMMUTABLE_LADYBUG = "tengu_immutable_ladybug";
//@ chunk-e6aww6q8.js:1657542-1657582 placement
/**
 * 读取 tengu_immutable_ladybug 开关。
 */
function isImmutableLadybugOn() {
  return readFlagWithOverride(TENGU_IMMUTABLE_LADYBUG, {
    safe: true,
  });
}
//@ chunk-e6aww6q8.js:1657582-1657617 placement
/**
 * 开关开启且另有条件成立。
 */
function isImmutableLadybugActive() {
  return isImmutableLadybugOn() && isSyncPaused();
}
//@ chunk-e6aww6q8.js:1657617-1657792 placement
function getSyncedPluginRoots(e) {
  let pluginSource = e.type === "prompt" ? e.pluginSource : undefined;
  if (pluginSource === undefined) return;
  let r = syncedRootsUnder(pluginSource.sourceName, pluginSource.pluginPath);
  return r.length > 0
    ? {
        folder: pluginSource.pluginPath,
        roots: r,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:1657792-1658000 placement
/**
 * 判断已同步插件的技能能否使用：无目录时（被拒且适用时）返回 no_folder；同步关闭返回 sync_off；否则按同步状态判断。
 */
async function checkSyncedSkillAccess(e, n, r = "not judged") {
  let s = syncedRootsUnder(e, n);
  if (n === undefined || s.length === 0)
    return r === "refused" && isSyncedMarketplace(e) && isImmutableLadybugOn() ? "no_folder" : undefined;
  if (!isImmutableLadybugOn()) return;
  if (isSkillSyncOffReason()) return "sync_off";
  return syncedSkillAccessReason(await readSyncBucket(), s, n);
}
//@ chunk-e6aww6q8.js:1658000-1658088 placement
/**
 * 判断同步技能访问被拒的原因（属于他人账号或未在列表中）。
 */
function syncedSkillAccessReason(e, n, r) {
  let s = otherAccountReason(e, n, r);
  if (s !== undefined || e === null) return s;
  return notListedReason(e, n, r);
}
//@ chunk-e6aww6q8.js:1658088-1658123 placement
/**
 * 技能同步关闭时返回原因。
 */
function isSkillSyncOffReason() {
  return isPluginsSyncVetoed() && isSyncPaused();
}
//@ chunk-e6aww6q8.js:1658123-1658225 placement
/**
 * 检查命令所属同步插件的访问权限（按插件来源名与路径）。
 */
function checkCommandSyncedAccess(command) {
  let pluginSource = command.type === "prompt" ? command.pluginSource : undefined;
  return checkSyncedSkillAccess(pluginSource?.sourceName, pluginSource?.pluginPath);
}
//@ chunk-e6aww6q8.js:1658225-1658261 placement
/**
 * 记录某个同步命令被拒（名称脱敏）。
 */
function logSyncedCommandRefused(command, n) {
  logSyncedCommandRefused_2(sanitizeTelemetryString(command.name), n);
}
//@ chunk-e6aww6q8.js:1658261-1658413 placement
/**
 * 记录同步插件某部分被拒（调试日志与无 PII 诊断）。
 */
function logSyncedPartRefused(e, agentType, r) {
  logForDebugging(
    `Synced plugin's ${e} refused for '${sanitizeTelemetryString(agentType)}': ${refusalTextFor(r)}.`,
    {
      level: "warn",
    },
  );
  logForDiagnosticsNoPII("info", "plugins_sync_part_refused", {
    part: e,
    reason: r,
  });
}
//@ chunk-e6aww6q8.js:1658413-1658446 placement
/**
 * 判断值是否已定义。
 */
function isDefined(e) {
  return e !== undefined;
}
//@ chunk-e6aww6q8.js:1658446-1658727 placement
/**
 * 找出因同步状态不能使用的已同步插件命令，返回命令到原因的映射。
 */
async function findRefusedSyncedCommands(e) {
  let flattened = e.flatMap((y) => {
    let syncedPluginRoots = getSyncedPluginRoots(y);
    return syncedPluginRoots === undefined
      ? []
      : [
          {
            command: y,
            ...syncedPluginRoots,
          },
        ];
  });
  if (flattened.length === 0 || !isImmutableLadybugOn()) return new Map();
  let r = new Map();
  let s = isSkillSyncOffReason();
  let h = s ? null : await readSyncBucket();
  for (let { command, roots, folder } of flattened) {
    let L = s ? "sync_off" : syncedSkillAccessReason(h, roots, folder);
    if (isDefined(L)) r.set(command, L);
  }
  return r;
}
//@ chunk-e6aww6q8.js:1658806-1659046 placement
/**
 * 解析技能的 git 根：项目技能取其所在仓库根，否则回退到给定目录的仓库根，再取真实路径。
 */
async function resolveSkillGitRoot(e, cwdOrNull) {
  let r =
    e.type === "prompt" && e.source === "projectSettings" ? (e.skillRoot ?? e.skillFile?.path) : undefined;
  let s = r === undefined ? null : findGitRoot(r);
  if (s === null && cwdOrNull === null) return;
  let h = s ?? (cwdOrNull === null ? null : findGitRootRecheckingNegative(cwdOrNull));
  return h === null ? ANY_PATTERN : realpath(h).catch(() => h);
}
export {
  checkSyncedSkillAccess,
  logSyncedPartRefused,
  findRefusedSyncedCommands,
  logSyncedCommandRefused,
  checkCommandSyncedAccess,
  syncedSkillRefusalReason,
  isDefined,
  resolveSkillGitRoot,
  isImmutableLadybugActive,
};
