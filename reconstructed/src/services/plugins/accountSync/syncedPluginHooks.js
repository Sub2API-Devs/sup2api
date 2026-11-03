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

//@ chunk-f9asxqh1.js:7717-8021 placement
/**
 * 从所有会话钩子注册表中移除属于给定技能根目录的钩子，返回移除数量，有移除时广播钩子存储变化。
 */
function removeSkillRootHooks(e) {
  if (e.size === 0) return 0;
  let n = 0;
  for (let s of liveWeakRefs(getSessionHookRegistries()))
    for (let [r, f] of s) {
      let y = {};
      let S = n;
      for (let h of HOOK_EVENTS) {
        let w = [];
        for (let b of f.hooks[h] ?? [])
          if (b.skillRoot !== undefined && e.has(b.skillRoot)) n += b.hooks.length;
          else w.push(b);
        if (w.length > 0) y[h] = w;
      }
      if (n > S)
        s.set(r, {
          ...f,
          hooks: y,
        });
    }
  if (n > 0) emitHookStoresChanged();
  return n;
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
  sync_off: (e) => `${e} sync is off (a setting or the organization's policy).`,
  account_change: () => "A sign-out, or a sign-in not verified as the same account.",
  skill_gone: () => "Those skills are gone from this account's list or from the disk.",
};
//@ chunk-f9asxqh1.js:8296-8400 placement
/**
 * 列出当前会话钩子中位于指定目录之下的技能根目录集合。
 */
function skillRootsUnder(e) {
  let n = e + sep;
  let s = new Set();
  for (let { skillRoot } of getAllSessionHookEntries()) if (skillRoot?.startsWith(n)) s.add(skillRoot);
  return s;
}
//@ chunk-f9asxqh1.js:8400-8544 placement
/**
 * 移除指定技能根目录的同步钩子，并按原因（同步关闭、账号变化、技能消失）记录调试日志与诊断事件。
 */
function removeSyncedSkillHooks(e, n, s) {
  let r = removeSkillRootHooks(n);
  if (r === 0) return;
  logForDebugging(`Hooks of ${e.hooksOf} removed: ${r}. ${HOOK_REMOVAL_REASONS[s](e.sync)}`);
  logForDiagnosticsNoPII("info", e.event, {
    count: r,
    reason: s,
  });
}
//@ chunk-f9asxqh1.js:8544-8664 placement
var PLUGINS_SYNC_HOOK_LABELS = {
  sync: "Plugins",
  hooksOf: "synced plugins' skills",
  event: "plugins_sync_skill_hooks_removed",
};
var refusalsLogged = new HostScoped(() => new Set());
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
  let e = syncedPluginsFolder();
  if (e !== undefined) onProcessRootHost(refusalsLogged).add(e);
}
//@ chunk-f9asxqh1.js:8891-8965 placement
/**
 * 取已记录拒绝的根目录集合（含同步插件目录）。
 */
function refusedRoots() {
  let e = new Set(onProcessRootHost(refusalsLogged));
  let n = syncedPluginsFolder();
  if (n !== undefined) e.add(n);
  return e;
}
//@ chunk-f9asxqh1.js:8965-9011 placement
/**
 * 判断是否属于同步市场的插件。
 */
function isSyncedMarketplace(e) {
  return e !== undefined && marketplaceSuffix(e) === SYNCED;
}
//@ chunk-f9asxqh1.js:9011-9107 placement
/**
 * 找出某路径所属的同步根目录。
 */
function syncedRootsUnder(e, n) {
  if (!isSyncedMarketplace(e) || n === undefined) return [];
  return [...refusedRoots()].filter((s) => n.startsWith(s + sep));
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
function skillKeyFromPath(e, n) {
  let [s = ""] = n.slice(e.length + 1).split(sep);
  return stripInvisibleChars(stripGenerationSuffix(s));
}
//@ chunk-f9asxqh1.js:9259-9569 placement
/**
 * 检查同步插件技能是否仍在账号最近一次完整插件列表里：不在时返回 not_listed，列表读取失败返回 list_unreadable。
 */
function notListedReason(e, n, s) {
  try {
    let lastCompleteSyncedPluginList = getLastCompleteSyncedPluginList();
    let found = n.map((S) => S + sep + e).find((S) => s.startsWith(S + sep));
    if (
      lastCompleteSyncedPluginList === null ||
      lastCompleteSyncedPluginList.bucket !== e ||
      found === undefined
    )
      return;
    let y = skillKeyFromPath(found, s);
    return Array.from(lastCompleteSyncedPluginList.dirsById.values()).some((S) => S.has(y))
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
function otherAccountReason(e, n, s) {
  if (e === null) return "no_account";
  return n.some((r) => s.startsWith(r + sep + e + sep)) ? undefined : "other_account";
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
function refusalTextFor(e) {
  return SYNCED_SKILL_REFUSAL_TEXT[e];
}
//@ chunk-f9asxqh1.js:10218-10473 placement
/**
 * 记录同步插件技能在缺少钩子或 allowed-tools 授权下运行的警告与诊断事件。
 */
function logSyncedSkillRestricted(e, n, s) {
  let joined = [
    ...(s.hooks ? ["its hooks"] : []),
    ...(s.grant ? ["the tools its allowed-tools grants"] : []),
  ].join(" and without ");
  logForDebugging(`Plugin skill '${e}' runs without ${joined}: ${SYNCED_SKILL_REFUSAL_TEXT[n]}.`, {
    level: "warn",
  });
  logForDiagnosticsNoPII("info", "plugins_sync_skill_hooks_refused", {
    reason: n,
  });
}
//@ chunk-f9asxqh1.js:10473-10607 placement
/**
 * 记录同步插件命令被拒绝执行的警告与诊断事件。
 */
function logSyncedCommandRefused(e, n) {
  logForDebugging(`Plugin command '${e}' was not run: ${SYNCED_SKILL_REFUSAL_TEXT[n]}.`, {
    level: "warn",
  });
  logForDiagnosticsNoPII("info", "plugins_sync_command_refused", {
    reason: n,
  });
}
//@ chunk-f9asxqh1.js:10607-10695 placement
/**
 * 立即移除已下架插件的技能钩子。
 */
function removeDelistedSkillHooksNow(e) {
  let n = new Set();
  for (let s of refusedRoots()) for (let r of skillRootsUnder(s)) n.add(r);
  removeSyncedSkillHooks(PLUGINS_SYNC_HOOK_LABELS, n, e);
}
//@ chunk-f9asxqh1.js:10695-10975 placement
/**
 * 插件同步一轮结束后，移除已从账号列表下架且不再列出的插件技能的钩子；失败时记录诊断并返回 false。
 */
function removeDelistedSkillHooks({ bucket, delistedDirs, listedDirs }) {
  try {
    let r = new Set();
    for (let f of refusedRoots()) {
      let y = f + sep + bucket;
      for (let S of skillRootsUnder(y)) {
        let h = skillKeyFromPath(y, S);
        if (delistedDirs.has(h) && !listedDirs.has(h)) r.add(S);
      }
    }
    removeSyncedSkillHooks(PLUGINS_SYNC_HOOK_LABELS, r, "skill_gone");
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
  let e = isAccountSyncEligibleHere() && !getPluginsSyncVetoed();
  setAccountPluginsSyncEnabled(e);
  return e;
}
//@ chunk-f9asxqh1.js:11179-11241 placement
/**
 * 重新判定同步是否被否决。
 */
function refreshSyncVeto() {
  let e = isSyncSettingsUnreliable(PLUGINS_SYNC_SETTING);
  setPluginsSyncVetoed(e);
  if (e && isAccountSyncDeniedHere()) removeDelistedSkillHooksNow("sync_off");
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
function isNotFoundServerError(e) {
  return e.kind === "server_error" && e.status === 404 && e.error === "not_found_error";
}
//@ chunk-f9asxqh1.js:12566-12633 placement
/**
 * 判断错误是否属于“不该继续同步”的拒绝。
 */
function isSyncRefusal(e) {
  return e.status === 403 || e.kind === "no_scope" || isNotFoundServerError(e);
}
//@ chunk-f9asxqh1.js:12749-12840 placement
/**
 * 错误响应信封的 schema。
 */
var errorEnvelopeSchema = DoctorLazy(() =>
  create({
    error: create({
      type: create_2().optional(),
      message: create_2().nullish().catch(undefined),
    }),
  }),
);
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
