/**
 * utils/plugins/syncedPluginSettings.ts
 *
 * 2.1.316 新增：已同步插件设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import { basename, dirname, join } from "path";
import { areSkillsConvertedAsPlugins } from "../permissions/permissionRulePayload.js";
import {
  getSettingsForSourceWriteSeed,
  getSettingsForSource,
  getSettingsFilePathForSource,
  runInSettingsWriteQueue,
  updateSettingsForSourceWithTransform,
  isRepoTierAnsweredByACopy,
  getLocalSettingsValidationErrors,
} from "../settings/settings.js";
import { groupEnabledPlugins, isRequiredPlugin, findPluginSetting } from "./pluginIdentifier.js";
import { computeDependencyClosure } from "./pluginPolicy.js";
import { nfcLower } from "../stringUtils.js";
import { findSkillFolderPlugins, listPluginSkillCommands } from "./skillFolderPlugins.js";
import { skillOverrideWithSource, ownLookup } from "../commandPredicates.js";
import { SOURCES, isSettingSourceEnabled } from "../settings/constants.js";
import {
  withSyncedSkillPrefix,
  pluginSkillAliases,
  hasSyncedSkillPrefix,
  stripSyncedSkillPrefix,
} from "../../skills/syncedSkills.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isWorkspacePersistedTrusted, isLocalSettingsGitTracked } from "../config.js";
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import { logEvent } from "../../services/analytics/index.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { sortedEntries } from "../../plugins/functionHooks/policyGate.js";
import { getClaudeConfigDirOrNull } from "../envUtils.js";
import { SKILLS_SYNC_DIR_2, stripInvisibleChars as stripInvisibleChars_3 } from "./syncedItems.js";
import { hasSyncMarker } from "../claudeAiSync/syncOwnedRoot.js";
import { readSyncedSkillIds, readDirNameSet } from "../../skills/loadSkillsDir.js";

//@ chunk-e6aww6q8.js:4492219-4492387 placement
function collectSyncedSkillOverrides(input) {
  if (!areSkillsConvertedAsPlugins()) return null;
  let mergedSet = new Set(input.merged);
  let syncedPlugins = input.synced.filter((plugin) => plugin.enabled && mergedSet.has(plugin));
  let overrides = syncedPlugins.length === 0 ? new Map() : collectSkillOffOverrides();
  return overrides.size === 0 ? null : collectSyncedPluginSettings(input, syncedPlugins, overrides);
}
//@ chunk-e6aww6q8.js:4492387-4493632 placement
/**
 * 收集各设置源中已同步插件的启用状态。
 */
async function collectSyncedPluginSettings(input, syncedPlugins, overrides) {
  let index = input.sourcesHighFirst.indexOf("localSettings");
  let enabledPlugins = canWriteLocalSettings()
    ? getSettingsForSourceWriteSeed("localSettings")?.enabledPlugins
    : undefined;
  let mapped = input.enabledPluginsIndexed.map((entry, index_2) =>
    index_2 !== index
      ? entry
      : enabledPlugins === undefined
        ? undefined
        : groupEnabledPlugins(enabledPlugins),
  );
  let requiredClosure = new Set(
    input.merged
      .filter((plugin) => isRequiredPlugin(plugin.source, plugin.installationPreference))
      .flatMap((plugin) => computeDependencyClosure(plugin.source, input.merged).closure)
      .map(nfcLower),
  );
  let filtered = syncedPlugins.filter((plugin) => {
    let pluginSetting = findPluginSetting(plugin.source, mapped);
    let source = pluginSetting === undefined ? undefined : input.sourcesHighFirst[pluginSetting.index];
    return !(
      source === "localSettings" ||
      source === "flagSettings" ||
      source === "policySettings" ||
      isRequiredPlugin(plugin.source, plugin.installationPreference) ||
      requiredClosure.has(nfcLower(plugin.source))
    );
  });
  let pluginIdOf = input.pluginIdOf();
  let folderOverridesCache = new Map();
  let results = await Promise.all(
    filtered.map(async (plugin) => {
      let folderPlugin =
        overrides.get(plugin.name) === true && !isSyncedSkillTurnedOff(plugin.name)
          ? await findSkillFolderPlugins(plugin)
          : undefined;
      let effectiveOverrides =
        folderPlugin !== undefined &&
        skillOverrideWithSource({
          ...folderPlugin,
          source: "plugin",
          pluginInfo: {
            repository: plugin.source,
          },
        }) === undefined
          ? new Map([...overrides].filter(([name]) => name !== plugin.name))
          : overrides;
      return {
        plugin,
        mine: effectiveOverrides,
        byName: await resolveSyncedPluginEnabled(plugin, effectiveOverrides),
      };
    }),
  );
  let result = {
    held: [],
    toWrite: [],
    following: [],
  };
  for (let { plugin, mine, byName } of results) {
    let pluginId = pluginIdOf(plugin);
    let state;
    if (pluginId !== undefined) {
      let bucket = basename(dirname(plugin.path));
      let pending = mine === overrides ? folderOverridesCache.get(bucket) : undefined;
      if (pending === undefined) {
        pending = mapSkillOverridesToPlugins(bucket, mine);
        if (mine === overrides) folderOverridesCache.set(bucket, pending);
      }
      state = (await pending).get(pluginId);
    }
    if (state !== undefined || byName !== undefined) {
      result.held.push(plugin);
      if (state === true || byName === true) result.toWrite.push(plugin);
    } else if (mine !== overrides) result.following.push(plugin);
  }
  return result;
}
//@ chunk-e6aww6q8.js:4493632-4493735 placement
function isSyncedSkillTurnedOff(name) {
  return SOURCES.some(
    (source) =>
      isSettingSourceEnabled(source) &&
      [withSyncedSkillPrefix(name), name].some(
        (name) => ownLookup(getSettingsForSource(source)?.skillOverrides, name) === "off",
      ),
  );
}
//@ chunk-e6aww6q8.js:4493735-4493977 placement
async function resolveSyncedPluginEnabled(plugin, overrides) {
  let enabled;
  for (let skill of await listPluginSkillCommands(plugin))
    for (let alias of pluginSkillAliases(skill)) {
      let value = hasSyncedSkillPrefix(alias) ? overrides.get(stripSyncedSkillPrefix(alias)) : undefined;
      if (value !== undefined) enabled = value || enabled === true;
      if (
        (env.CLAUDE_CODE_SYNC_SKILLS || env.CLAUDE_CODE_SYNC_SESSION_REFS) &&
        overrides.has(`skills_${stripSyncedSkillPrefix(alias)}`)
      )
        enabled ??= false;
    }
  return enabled;
}
//@ chunk-e6aww6q8.js:4493977-4494296 placement
/**
 * 把需关闭的同步插件写到本地设置（失败记 warn）。
 */
function persistSyncedPluginsOff(toWrite, managedStamp) {
  if (toWrite.length === 0) return Promise.resolve();
  return writeSyncedPluginsOffToLocalSettings(
    toWrite.map((plugin) => plugin.source),
    managedStamp,
  ).catch((error) =>
    logForDebugging(
      `Turned off a synced plugin in local settings for a claude.ai skill that was turned off, but could not record that the plugin list already reflects it, so the plugins may be read again: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    ),
  );
}
//@ chunk-e6aww6q8.js:4494296-4495395 placement
/**
 * 本地设置可写（受信、未入库）时，把尚未记录的同步插件写成 false；设置有不可保留的校验错误或由副本回答时跳过。 失败只记 warn（每次加载时仍会被挡住）。
 */
async function writeSyncedPluginsOffToLocalSettings(pluginIds, managedStamp) {
  let savedCount;
  let hasValidationWarnings;
  let skippedForWarnings;
  let newStamp;
  let remarked = [];
  let writeError = null;
  try {
    let key = getSettingsFilePathForSource("localSettings");
    if (!isWorkspacePersistedTrusted() || !canWriteLocalSettings() || key === undefined) return;
    await runInSettingsWriteQueue(key, () => Promise.resolve());
    if (getSettingsFilePathForSource("localSettings") !== key) return;
    writeError = (
      await updateSettingsForSourceWithTransform("localSettings", (settings) => {
        let enabledPlugins = settings?.enabledPlugins;
        let indexed = isPlainObject_5(enabledPlugins) ? [groupEnabledPlugins(enabledPlugins)] : [];
        let filtered = pluginIds.filter((id) => findPluginSetting(id, indexed) === undefined);
        let isRepoTierAnswered = isRepoTierAnsweredByACopy("localSettings");
        hasValidationWarnings ??= getLocalSettingsValidationErrors().some((error) => !error.preserveOnWrite);
        if (
          savedCount === undefined &&
          !isRepoTierAnswered &&
          !hasValidationWarnings &&
          filtered.length > 0
        ) {
          newStamp = managedStamp();
          remarked = filtered;
        }
        savedCount ??= isRepoTierAnswered || hasValidationWarnings ? 0 : filtered.length;
        skippedForWarnings ??= hasValidationWarnings && !isRepoTierAnswered && filtered.length > 0;
        let enabledPlugins_2 = Object.fromEntries(filtered.map((id) => [id, false]));
        return isRepoTierAnswered || hasValidationWarnings || filtered.length === 0
          ? null
          : {
              enabledPlugins: enabledPlugins_2,
            };
      })
    ).error;
  } catch (error) {
    writeError = error;
  }
  if (writeError !== null)
    logForDebugging(
      `Could not turn off a synced plugin in local settings for a claude.ai skill that was turned off; it is held off at each load instead: ${errorMessage(writeError)}`,
      {
        level: "warn",
      },
    );
  else if (skippedForWarnings === true)
    logForDebugging(
      "Did not turn off a synced plugin in local settings for a claude.ai skill that was turned off: the file has validation warnings, and writing it would delete the entries they name. It is held off at each load instead.",
    );
  else if (savedCount !== undefined && savedCount > 0) {
    logEvent("tengu_synced_skill_off_saved_on_plugin", {
      count: savedCount,
    });
    if (newStamp !== undefined) await remarkPluginLoadsForSettings(remarked, newStamp);
  }
}
//@ chunk-e6aww6q8.js:4495395-4495794 placement
/**
 * 设置变化不影响已加载结果时更新其读取标记。
 */
async function remarkPluginLoadsForSettings(pluginIds, stamp) {
  let newStamp = settingsWithPluginsOff(stamp, pluginIds);
  if (newStamp === undefined) return;
  let lowered = new Set(pluginIds.map(nfcLower));
  let pluginRegistry = getPluginRegistry();
  let updates = [];
  for (let load of [pluginRegistry.pluginLoad, pluginRegistry.pluginLoadCacheOnly]) {
    if (load === undefined || pluginRegistry.pluginLoadMarks.get(load) !== stamp) continue;
    let result = await load.catch(() => {
      return;
    });
    if (
      result?.readUnder === stamp &&
      pluginRegistry.pluginLoadMarks.get(load) === stamp &&
      !result.enabled.some((plugin) => lowered.has(nfcLower(plugin.source)))
    )
      updates.push([load, result]);
  }
  for (let [load, result] of updates) {
    result.readUnder = newStamp;
    pluginRegistry.pluginLoadMarks.set(load, newStamp);
  }
}
//@ chunk-e6aww6q8.js:4495794-4495977 placement
function settingsWithPluginsOff(text, pluginIds) {
  try {
    let settings = jsonParse(text);
    if (!isPlainObject_5(settings) || !isPlainObject_5(settings.enabledPlugins)) return;
    settings.enabledPlugins = sortedEntries({
      ...settings.enabledPlugins,
      ...Object.fromEntries(pluginIds.map((id) => [id, false])),
    });
    return jsonStringify(settings);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4495977-4496078 placement
function canWriteLocalSettings() {
  return (
    isSettingSourceEnabled("localSettings") &&
    !isRepoTierAnsweredByACopy("localSettings") &&
    !isLocalSettingsGitTracked({
      onIndeterminate: "untracked",
    })
  );
}
//@ chunk-e6aww6q8.js:4496078-4496634 placement
/**
 * 各设置源中把技能设为 off/user-invocable-only 的覆盖。
 */
function collectSkillOffOverrides() {
  let skillOverrides = canWriteLocalSettings()
    ? getSettingsForSourceWriteSeed("localSettings")?.skillOverrides
    : undefined;
  let resolved = new Map();
  for (let source of SOURCES)
    if (isSettingSourceEnabled(source)) {
      let skillOverrides_2 = getSettingsForSource(source)?.skillOverrides ?? {};
      for (let [key, value] of Object.entries(skillOverrides_2))
        if (!resolved.has(key)) {
          let own =
            source === "userSettings" ||
            (source === "localSettings" && ownLookup(skillOverrides, key) !== undefined);
          resolved.set(key, {
            value,
            own,
          });
        }
    }
  let lockedSources = ["policySettings", "flagSettings"];
  let isLocked = (name) =>
    lockedSources.some(
      (source) => ownLookup(getSettingsForSource(source)?.skillOverrides, name) !== undefined,
    );
  let offOverrides = new Map();
  for (let [key, { value, own }] of resolved) {
    let hasPrefix = hasSyncedSkillPrefix(key);
    let baseName = hasPrefix ? stripSyncedSkillPrefix(key) : key;
    let prefixedName = withSyncedSkillPrefix(baseName);
    if (
      (value === "off" || value === "user-invocable-only") &&
      !isLocked(key) &&
      (hasPrefix || (!resolved.has(prefixedName) && !isLocked(prefixedName)))
    )
      offOverrides.set(baseName, own || offOverrides.get(baseName) === true);
  }
  return offOverrides;
}
//@ chunk-e6aww6q8.js:4496634-4496936 placement
/**
 * 技能覆盖映射到同步插件 id。
 */
async function mapSkillOverridesToPlugins(bucket, mine) {
  let result = new Map();
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  if (claudeConfigDirOrNull === null) return result;
  let syncDir = join(claudeConfigDirOrNull, SKILLS_SYNC_DIR_2);
  if (!(await hasSyncMarker(syncDir, bucket))) return result;
  let bucketDir = join(syncDir, bucket);
  let [syncedSkillIds, dirNameSet] = await Promise.all([
    readSyncedSkillIds(bucketDir),
    readDirNameSet(bucketDir),
  ]);
  for (let [skillName, value] of mine) {
    let pluginId =
      dirNameSet === undefined || dirNameSet.has(skillName)
        ? syncedSkillIds.get(stripInvisibleChars_3(skillName))?.pluginId
        : undefined;
    if (pluginId !== undefined)
      result.set(pluginId, (value && dirNameSet !== undefined) || result.get(pluginId) === true);
  }
  return result;
}
export { collectSyncedSkillOverrides, persistSyncedPluginsOff };
