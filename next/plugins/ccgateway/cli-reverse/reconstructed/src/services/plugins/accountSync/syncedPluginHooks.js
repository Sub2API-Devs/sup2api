/**
 * services/plugins/accountSync/syncedPluginHooks.ts
 *
 * 2.1.316 新增：同步插件的钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f9asxqh1.js (41)
 * attribution: placement 41
 */
import { sep, resolve, join } from "path";
import { liveWeakRefs, logForDiagnosticsNoPII } from "../../../utils/diagLogs.js";
import {
  getSessionHookRegistries,
  SessionHooksRegistry,
  getAllSessionHookEntries,
} from "../../../utils/hooks/sessionHooks.js";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import {
  emitHookStoresChanged,
  onProcessRootHost,
  getLastCompleteSyncedPluginList,
  getPluginsSyncVetoed,
  setAccountPluginsSyncEnabled,
  setPluginsSyncVetoed,
  getSyncedPluginDirs,
} from "../../../bootstrap/state.js";
import { logForDebugging } from "../../../utils/debug.js";
import { HostScoped } from "../../../utils/hostScoped.js";
import { getClaudeConfigDirOrNull } from "../../../utils/envUtils.js";
import {
  SKILLS_SYNCED_STAGING,
  getSyncBucket,
  accountBucket,
  stripInvisibleChars,
  stripGenerationSuffix,
} from "../../../utils/plugins/syncedItems.js";
import { getErrnoCode, errorMessage } from "../../../utils/errors.js";
import { marketplaceSuffix } from "../../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../../utils/telemetry/pluginTelemetry.js";
import { logError } from "../../../utils/log.js";
import {
  isSyncSettingsUnreliable,
  isPolicyUnresolved,
  isFlagOn,
  isFirstPartyClaudeAiSession,
  isSyncEligibleHere,
  isAccountSyncEligible,
  isAccountSyncDenied,
} from "./pluginsScopeGate.js";
import { env } from "../../../utils/env.js";
import { isCustomizationDisabled } from "../../../utils/settings/customizationDisabled.js";
import { isSettingSourceEnabled } from "../../../utils/settings/constants.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { create, create_2 } from "../../../../vendor/zod/lib/index.mjs";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-f9asxqh1.js:7717-8021 placement
/**
 * 从所有会话钩子注册表中移除属于给定技能根目录的钩子，返回移除数量，有移除时广播钩子存储变化。
 */
function removeSkillRootHooks(roots) {
  if (roots.size === 0) return 0;
  let removedCount = 0;
  for (let registry of liveWeakRefs(getSessionHookRegistries()))
    for (let [registryKey, entry] of registry) {
      let keptByEvent = {};
      let removedBefore = removedCount;
      for (let event of HOOK_EVENTS) {
        let keptMatchers = [];
        for (let matcherEntry of entry.hooks[event] ?? [])
          if (matcherEntry.skillRoot !== undefined && roots.has(matcherEntry.skillRoot))
            removedCount += matcherEntry.hooks.length;
          else keptMatchers.push(matcherEntry);
        if (keptMatchers.length > 0) keptByEvent[event] = keptMatchers;
      }
      if (removedCount > removedBefore)
        registry.set(registryKey, {
          ...entry,
          hooks: keptByEvent,
        });
    }
  if (removedCount > 0) emitHookStoresChanged();
  return removedCount;
}
//@ chunk-f9asxqh1.js:8021-8050 placement
/**
 * 创建会话级的同步钩子注册表。
 */
function createSessionHooksRegistry() {
  return new SessionHooksRegistry();
}
//@ chunk-f9asxqh1.js:8050-8296 placement
var HOOK_REMOVAL_REASONS = {
  sync_off: (what) => `${what} sync is off (a setting or the organization's policy).`,
  account_change: () => "A sign-out, or a sign-in not verified as the same account.",
  skill_gone: () => "Those skills are gone from this account's list or from the disk.",
};
//@ chunk-f9asxqh1.js:8296-8400 placement
/**
 * 列出当前会话钩子中位于指定目录之下的技能根目录集合。
 */
function skillRootsUnder(root) {
  let rootPrefix = root + sep;
  let skillRoots = new Set();
  for (let { skillRoot } of getAllSessionHookEntries())
    if (skillRoot?.startsWith(rootPrefix)) skillRoots.add(skillRoot);
  return skillRoots;
}
//@ chunk-f9asxqh1.js:8400-8544 placement
/**
 * 移除指定技能根目录的同步钩子，并按原因（同步关闭、账号变化、技能消失）记录调试日志与诊断事件。
 */
function removeSyncedSkillHooks(labels, roots, reason) {
  let removedCount = removeSkillRootHooks(roots);
  if (removedCount === 0) return;
  logForDebugging(
    `Hooks of ${labels.hooksOf} removed: ${removedCount}. ${HOOK_REMOVAL_REASONS[reason](labels.sync)}`,
  );
  logForDiagnosticsNoPII("info", labels.event, {
    count: removedCount,
    reason,
  });
}
//@ chunk-f9asxqh1.js:8544-8664 placement
var PLUGINS_SYNC_HOOK_LABELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var refusalsLogged;
deferInit("chunk-f9asxqh1.js:8544", () => {
  PLUGINS_SYNC_HOOK_LABELS = {
    sync: "Plugins",
    hooksOf: "synced plugins' skills",
    event: "plugins_sync_skill_hooks_removed",
  };
  refusalsLogged = new HostScoped(() => new Set());
});
//@ chunk-f9asxqh1.js:8664-8837 placement
function syncedPluginsFolder() {
  try {
    let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
    return claudeConfigDirOrNull === null
      ? undefined
      : resolve(join(claudeConfigDirOrNull, SKILLS_SYNCED_STAGING));
  } catch (error) {
    logForDebugging(
      `The synced plugins' folder could not be made absolute (${getErrnoCode(error) ?? errorMessage(error)})`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-f9asxqh1.js:8837-8891 placement
/**
 * 把同步插件目录标记为已记录拒绝。
 */
function markSyncedFolderRefused() {
  let folder = syncedPluginsFolder();
  if (folder !== undefined) onProcessRootHost(refusalsLogged).add(folder);
}
//@ chunk-f9asxqh1.js:8891-8965 placement
/**
 * 取已记录拒绝的根目录集合（含同步插件目录）。
 */
function refusedRoots() {
  let roots = new Set(onProcessRootHost(refusalsLogged));
  let syncedFolder = syncedPluginsFolder();
  if (syncedFolder !== undefined) roots.add(syncedFolder);
  return roots;
}
//@ chunk-f9asxqh1.js:8965-9011 placement
/**
 * 判断是否属于同步市场的插件。
 */
function isSyncedMarketplace(source) {
  return source !== undefined && marketplaceSuffix(source) === SYNCED;
}
//@ chunk-f9asxqh1.js:9011-9107 placement
/**
 * 找出某路径所属的同步根目录。
 */
function syncedRootsUnder(marketplace, path) {
  if (!isSyncedMarketplace(marketplace) || path === undefined) return [];
  return [...refusedRoots()].filter((root) => path.startsWith(root + sep));
}
//@ chunk-f9asxqh1.js:9107-9184 placement
/**
 * 读取同步用的存储桶/前缀（失败返回 null）。
 */
async function readSyncBucket() {
  try {
    return (await getSyncBucket()) ?? accountBucket();
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-f9asxqh1.js:9184-9259 placement
/**
 * 从路径取技能键（去掉不可见字符）。
 */
function skillKeyFromPath(root, path) {
  let [segment = ""] = path.slice(root.length + 1).split(sep);
  return stripInvisibleChars(stripGenerationSuffix(segment));
}
//@ chunk-f9asxqh1.js:9259-9569 placement
/**
 * 检查同步插件技能是否仍在账号最近一次完整插件列表里：不在时返回 not_listed，列表读取失败返回 list_unreadable。
 */
function notListedReason(bucket, roots, path) {
  try {
    let lastCompleteSyncedPluginList = getLastCompleteSyncedPluginList();
    let found = roots
      .map((root) => root + sep + bucket)
      .find((dirPrefix) => path.startsWith(dirPrefix + sep));
    if (
      lastCompleteSyncedPluginList === null ||
      lastCompleteSyncedPluginList.bucket !== bucket ||
      found === undefined
    )
      return;
    let skillKey = skillKeyFromPath(found, path);
    return Array.from(lastCompleteSyncedPluginList.dirsById.values()).some((dirs) => dirs.has(skillKey))
      ? undefined
      : "not_listed";
  } catch (error) {
    logForDiagnosticsNoPII("warn", "plugins_sync_last_list_unreadable");
    logError(error);
    return "list_unreadable";
  }
}
//@ chunk-f9asxqh1.js:9569-9685 placement
/**
 * 检查同步插件技能目录是否属于当前账号：无账号返回 no_account，属于其他账号返回 other_account。
 */
function otherAccountReason(bucket, roots, path) {
  if (bucket === null) return "no_account";
  return roots.some((root) => path.startsWith(root + sep + bucket + sep)) ? undefined : "other_account";
}
//@ chunk-f9asxqh1.js:9685-10190 placement
/**
 * 同步插件技能/命令被限制时给出的原因文案表（同步关闭、其他账号、无账号、不在列表、列表不可读、找不到目录）。
 */
var SYNCED_SKILL_REFUSAL_TEXT = {
  sync_off:
    "plugins sync is turned off in the person's own settings, in an admin's, or by the organization's policy",
  other_account: "its plugin was synced for another account",
  no_account: "no account could be resolved for its synced plugin",
  not_listed: "the account's latest complete list of plugins does not hold its plugin's folder",
  list_unreadable: "this session's record of the account's plugins could not be read",
  no_folder: "its plugin's folder could not be found under the synced plugins' folder",
};
//@ chunk-f9asxqh1.js:10190-10218 placement
/**
 * 取某拒绝原因的说明文本。
 */
function refusalTextFor(reason) {
  return SYNCED_SKILL_REFUSAL_TEXT[reason];
}
//@ chunk-f9asxqh1.js:10218-10473 placement
/**
 * 记录同步插件技能在缺少钩子或 allowed-tools 授权下运行的警告与诊断事件。
 */
function logSyncedSkillRestricted(skillName, reason, lost) {
  let joined = [
    ...(lost.hooks ? ["its hooks"] : []),
    ...(lost.grant ? ["the tools its allowed-tools grants"] : []),
  ].join(" and without ");
  logForDebugging(
    `Plugin skill '${skillName}' runs without ${joined}: ${SYNCED_SKILL_REFUSAL_TEXT[reason]}.`,
    {
      level: "warn",
    },
  );
  logForDiagnosticsNoPII("info", "plugins_sync_skill_hooks_refused", {
    reason,
  });
}
//@ chunk-f9asxqh1.js:10473-10607 placement
/**
 * 记录同步插件命令被拒绝执行的警告与诊断事件。
 */
function logSyncedCommandRefused(commandName, reason) {
  logForDebugging(`Plugin command '${commandName}' was not run: ${SYNCED_SKILL_REFUSAL_TEXT[reason]}.`, {
    level: "warn",
  });
  logForDiagnosticsNoPII("info", "plugins_sync_command_refused", {
    reason,
  });
}
//@ chunk-f9asxqh1.js:10607-10695 placement
/**
 * 立即移除已下架插件的技能钩子。
 */
function removeDelistedSkillHooksNow(reason) {
  let rootsToRemove = new Set();
  for (let root of refusedRoots()) for (let skillRoot of skillRootsUnder(root)) rootsToRemove.add(skillRoot);
  removeSyncedSkillHooks(PLUGINS_SYNC_HOOK_LABELS, rootsToRemove, reason);
}
//@ chunk-f9asxqh1.js:10695-10975 placement
/**
 * 插件同步一轮结束后，移除已从账号列表下架且不再列出的插件技能的钩子；失败时记录诊断并返回 false。
 */
function removeDelistedSkillHooks({ bucket, delistedDirs, listedDirs }) {
  try {
    let rootsToRemove = new Set();
    for (let root of refusedRoots()) {
      let bucketRoot = root + sep + bucket;
      for (let skillRoot of skillRootsUnder(bucketRoot)) {
        let skillKey = skillKeyFromPath(bucketRoot, skillRoot);
        if (delistedDirs.has(skillKey) && !listedDirs.has(skillKey)) rootsToRemove.add(skillRoot);
      }
    }
    removeSyncedSkillHooks(PLUGINS_SYNC_HOOK_LABELS, rootsToRemove, "skill_gone");
    return true;
  } catch (error) {
    logForDiagnosticsNoPII("warn", "plugins_sync_skill_hooks_removal_failed");
    logError(error);
    return false;
  }
}
//@ chunk-f9asxqh1.js:10975-11125 placement
var PLUGINS_SYNC_SETTING = {
  settingKey: "syncClaudeAiPlugins",
  policyKey: "allow_account_plugins_sync",
  flagName: "tengu_claudeai_plugins_sync_enabled",
  isTierInPlay: () => syncSettingsEnabled(),
};
//@ chunk-f9asxqh1.js:11125-11179 placement
/**
 * 刷新并返回账号插件同步是否启用。
 */
function enableAccountPluginsSync() {
  refreshSyncVeto();
  let enabled = isAccountSyncEligibleHere() && !getPluginsSyncVetoed();
  setAccountPluginsSyncEnabled(enabled);
  return enabled;
}
//@ chunk-f9asxqh1.js:11179-11241 placement
/**
 * 重新判定同步是否被否决。
 */
function refreshSyncVeto() {
  let unreliable = isSyncSettingsUnreliable(PLUGINS_SYNC_SETTING);
  setPluginsSyncVetoed(unreliable);
  if (unreliable && isAccountSyncDeniedHere()) removeDelistedSkillHooksNow("sync_off");
}
//@ chunk-f9asxqh1.js:11241-11273 placement
/**
 * 同步是否被否决。
 */
function isPluginsSyncVetoed() {
  refreshSyncVeto();
  return getPluginsSyncVetoed();
}
//@ chunk-f9asxqh1.js:11273-11301 placement
/**
 * 同步是否处于暂停/关闭状态。
 */
function isSyncPaused() {
  return isAccountSyncDeniedHere();
}
//@ chunk-f9asxqh1.js:11301-11346 placement
/**
 * 插件同步是否被策略拒绝。
 */
function isPluginsSyncDenied() {
  return !isSyncPaused() && (isPluginsSyncVetoed() || isPolicyUnresolved(PLUGINS_SYNC_SETTING));
}
//@ chunk-f9asxqh1.js:11346-11389 placement
/**
 * 是否存在同步内容。
 */
function hasSyncedContent() {
  return getSyncedPluginDirs().length > 0 || isSyncWanted();
}
//@ chunk-f9asxqh1.js:11389-11424 placement
/**
 * 是否希望启用同步。
 */
function isSyncWanted() {
  return hasSyncEnv() || isFlagSyncWanted();
}
//@ chunk-f9asxqh1.js:11424-11465 placement
/**
 * 开关打开且环境满足时的同步意愿。
 */
function isFlagSyncWanted() {
  return !hasSyncEnv() && isFlagOn(PLUGINS_SYNC_SETTING) && isFirstPartyClaudeAiSession();
}
//@ chunk-f9asxqh1.js:11465-11500 placement
/**
 * 同步能力是否可用。
 */
function isSyncAvailable() {
  return hasSyncEnv() || isFirstPartyClaudeAiSession();
}
//@ chunk-f9asxqh1.js:11500-11549 placement
/**
 * 插件同步是否开启（开关+环境+设置）。
 */
function isPluginsSyncOn() {
  return (
    isFlagOn(PLUGINS_SYNC_SETTING) &&
    isFirstPartyClaudeAiSession() &&
    syncSettingsEnabled() &&
    !isPluginsSyncVetoed()
  );
}
//@ chunk-f9asxqh1.js:11549-11576 placement
/**
 * 插件同步开关本身是否打开。
 */
function isPluginsSyncFlagOn() {
  return isFlagOn(PLUGINS_SYNC_SETTING);
}
//@ chunk-f9asxqh1.js:11576-11658 placement
/**
 * 是否设置了同步相关环境变量。
 */
function hasSyncEnv() {
  return env.CLAUDE_CODE_SYNC_PLUGINS || env.CLAUDE_CODE_SYNC_SESSION_REFS;
}
//@ chunk-f9asxqh1.js:11658-11687 placement
/**
 * 同步资格。
 */
function isPluginsSyncEligible() {
  return isSyncEligibleHere(PLUGINS_SYNC_SETTING);
}
//@ chunk-f9asxqh1.js:11687-11743 placement
/**
 * 同步相关设置是否启用。
 */
function syncSettingsEnabled() {
  return !isCustomizationDisabled("plugins") && isSettingSourceEnabled("userSettings");
}
//@ chunk-f9asxqh1.js:11743-11771 placement
/**
 * 当前是否满足账号同步资格。
 */
function isAccountSyncEligibleHere() {
  return isAccountSyncEligible(PLUGINS_SYNC_SETTING);
}
//@ chunk-f9asxqh1.js:11771-11800 placement
/**
 * 当前是否被判定不允许同步。
 */
function isAccountSyncDeniedHere() {
  return isAccountSyncDenied(PLUGINS_SYNC_SETTING);
}
//@ chunk-f9asxqh1.js:12474-12566 placement
/**
 * 判断是否为 404 not_found_error。
 */
function isNotFoundServerError(answer) {
  return answer.kind === "server_error" && answer.status === 404 && answer.error === "not_found_error";
}
//@ chunk-f9asxqh1.js:12566-12633 placement
/**
 * 判断错误是否属于“不该继续同步”的拒绝。
 */
function isSyncRefusal(answer) {
  return answer.status === 403 || answer.kind === "no_scope" || isNotFoundServerError(answer);
}
//@ chunk-f9asxqh1.js:12749-12840 placement
/**
 * 错误响应信封的 schema。
 */
var errorEnvelopeSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-f9asxqh1.js:12749", () => {
  errorEnvelopeSchema = DoctorLazy(() =>
    create({
      error: create({
        type: create_2().optional(),
        message: create_2().nullish().catch(undefined),
      }),
    }),
  );
});
export {
  createSessionHooksRegistry,
  isPluginsSyncVetoed,
  isSyncPaused,
  refusalTextFor,
  isPluginsSyncOn,
  enableAccountPluginsSync,
  isPluginsSyncFlagOn,
  isSyncWanted,
  isSyncAvailable,
  logSyncedSkillRestricted,
  markSyncedFolderRefused,
  hasSyncedContent,
  syncSettingsEnabled,
  skillKeyFromPath,
  isPluginsSyncEligible,
  removeDelistedSkillHooksNow,
  refreshSyncVeto,
  isFlagSyncWanted,
  removeSyncedSkillHooks,
  skillRootsUnder,
  isPluginsSyncDenied,
  isNotFoundServerError,
  isSyncRefusal,
  removeDelistedSkillHooks,
  isAccountSyncDeniedHere,
  hasSyncEnv,
  syncedRootsUnder,
  isSyncedMarketplace,
  readSyncBucket,
  otherAccountReason,
  notListedReason,
  logSyncedCommandRefused,
  errorEnvelopeSchema,
};
