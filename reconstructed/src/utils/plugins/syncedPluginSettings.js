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
function collectSyncedSkillOverrides(e) {
  if (!areSkillsConvertedAsPlugins()) return null;
  let n = new Set(e.merged);
  let filtered = e.synced.filter((h) => h.enabled && n.has(h));
  let s = filtered.length === 0 ? new Map() : collectSkillOffOverrides();
  return s.size === 0 ? null : collectSyncedPluginSettings(e, filtered, s);
}
//@ chunk-e6aww6q8.js:4492387-4493632 placement
/**
 * 收集各设置源中已同步插件的启用状态。
 */
async function collectSyncedPluginSettings(e, n, r) {
  let index = e.sourcesHighFirst.indexOf("localSettings");
  let enabledPlugins = canWriteLocalSettings()
    ? getSettingsForSourceWriteSeed("localSettings")?.enabledPlugins
    : undefined;
  let mapped = e.enabledPluginsIndexed.map((Se, ke) =>
    ke !== index ? Se : enabledPlugins === undefined ? undefined : groupEnabledPlugins(enabledPlugins),
  );
  let S = new Set(
    e.merged
      .filter((Se) => isRequiredPlugin(Se.source, Se.installationPreference))
      .flatMap((Se) => computeDependencyClosure(Se.source, e.merged).closure)
      .map(nfcLower),
  );
  let filtered = n.filter((Se) => {
    let pluginSetting = findPluginSetting(Se.source, mapped);
    let we = pluginSetting === undefined ? undefined : e.sourcesHighFirst[pluginSetting.index];
    return !(
      we === "localSettings" ||
      we === "flagSettings" ||
      we === "policySettings" ||
      isRequiredPlugin(Se.source, Se.installationPreference) ||
      S.has(nfcLower(Se.source))
    );
  });
  let L = e.pluginIdOf();
  let G = new Map();
  let results = await Promise.all(
    filtered.map(async (Se) => {
      let ke =
        r.get(Se.name) === true && !isSyncedSkillTurnedOff(Se.name)
          ? await findSkillFolderPlugins(Se)
          : undefined;
      let we =
        ke !== undefined &&
        skillOverrideWithSource({
          ...ke,
          source: "plugin",
          pluginInfo: {
            repository: Se.source,
          },
        }) === undefined
          ? new Map([...r].filter(([Ee]) => Ee !== Se.name))
          : r;
      return {
        plugin: Se,
        mine: we,
        byName: await resolveSyncedPluginEnabled(Se, we),
      };
    }),
  );
  let Z = {
    held: [],
    toWrite: [],
    following: [],
  };
  for (let { plugin, mine, byName } of results) {
    let Ee = L(plugin);
    let Ae;
    if (Ee !== undefined) {
      let Ie = basename(dirname(plugin.path));
      let Me = mine === r ? G.get(Ie) : undefined;
      if (Me === undefined) {
        Me = mapSkillOverridesToPlugins(Ie, mine);
        if (mine === r) G.set(Ie, Me);
      }
      Ae = (await Me).get(Ee);
    }
    if (Ae !== undefined || byName !== undefined) {
      Z.held.push(plugin);
      if (Ae === true || byName === true) Z.toWrite.push(plugin);
    } else if (mine !== r) Z.following.push(plugin);
  }
  return Z;
}
//@ chunk-e6aww6q8.js:4493632-4493735 placement
function isSyncedSkillTurnedOff(name) {
  return SOURCES.some(
    (n) =>
      isSettingSourceEnabled(n) &&
      [withSyncedSkillPrefix(name), name].some(
        (r) => ownLookup(getSettingsForSource(n)?.skillOverrides, r) === "off",
      ),
  );
}
//@ chunk-e6aww6q8.js:4493735-4493977 placement
async function resolveSyncedPluginEnabled(e, n) {
  let r;
  for (let s of await listPluginSkillCommands(e))
    for (let h of pluginSkillAliases(s)) {
      let y = hasSyncedSkillPrefix(h) ? n.get(stripSyncedSkillPrefix(h)) : undefined;
      if (y !== undefined) r = y || r === true;
      if (
        (env.CLAUDE_CODE_SYNC_SKILLS || env.CLAUDE_CODE_SYNC_SESSION_REFS) &&
        n.has(`skills_${stripSyncedSkillPrefix(h)}`)
      )
        r ??= false;
    }
  return r;
}
//@ chunk-e6aww6q8.js:4493977-4494296 placement
/**
 * 把需关闭的同步插件写到本地设置（失败记 warn）。
 */
function persistSyncedPluginsOff(toWrite, managedHooksPolicyStamp) {
  if (toWrite.length === 0) return Promise.resolve();
  return writeSyncedPluginsOffToLocalSettings(
    toWrite.map((r) => r.source),
    managedHooksPolicyStamp,
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
async function writeSyncedPluginsOffToLocalSettings(e, n) {
  let r;
  let s;
  let h;
  let y;
  let S = [];
  let w = null;
  try {
    let settingsFilePathForSource = getSettingsFilePathForSource("localSettings");
    if (!isWorkspacePersistedTrusted() || !canWriteLocalSettings() || settingsFilePathForSource === undefined)
      return;
    await runInSettingsWriteQueue(settingsFilePathForSource, () => Promise.resolve());
    if (getSettingsFilePathForSource("localSettings") !== settingsFilePathForSource) return;
    w = (
      await updateSettingsForSourceWithTransform("localSettings", (G) => {
        let enabledPlugins = G?.enabledPlugins;
        let Z = isPlainObject_5(enabledPlugins) ? [groupEnabledPlugins(enabledPlugins)] : [];
        let filtered = e.filter((Ee) => findPluginSetting(Ee, Z) === undefined);
        let ke = isRepoTierAnsweredByACopy("localSettings");
        s ??= getLocalSettingsValidationErrors().some((Ee) => !Ee.preserveOnWrite);
        if (r === undefined && !ke && !s && filtered.length > 0) {
          y = n();
          S = filtered;
        }
        r ??= ke || s ? 0 : filtered.length;
        h ??= s && !ke && filtered.length > 0;
        let enabledPlugins_2 = Object.fromEntries(filtered.map((Ee) => [Ee, false]));
        return ke || s || filtered.length === 0
          ? null
          : {
              enabledPlugins: enabledPlugins_2,
            };
      })
    ).error;
  } catch (error) {
    w = error;
  }
  if (w !== null)
    logForDebugging(
      `Could not turn off a synced plugin in local settings for a claude.ai skill that was turned off; it is held off at each load instead: ${errorMessage(w)}`,
      {
        level: "warn",
      },
    );
  else if (h === true)
    logForDebugging(
      "Did not turn off a synced plugin in local settings for a claude.ai skill that was turned off: the file has validation warnings, and writing it would delete the entries they name. It is held off at each load instead.",
    );
  else if (r !== undefined && r > 0) {
    logEvent("tengu_synced_skill_off_saved_on_plugin", {
      count: r,
    });
    if (y !== undefined) await remarkPluginLoadsForSettings(S, y);
  }
}
//@ chunk-e6aww6q8.js:4495395-4495794 placement
/**
 * 设置变化不影响已加载结果时更新其读取标记。
 */
async function remarkPluginLoadsForSettings(e, n) {
  let r = settingsWithPluginsOff(n, e);
  if (r === undefined) return;
  let s = new Set(e.map(nfcLower));
  let pluginRegistry = getPluginRegistry();
  let y = [];
  for (let S of [pluginRegistry.pluginLoad, pluginRegistry.pluginLoadCacheOnly]) {
    if (S === undefined || pluginRegistry.pluginLoadMarks.get(S) !== n) continue;
    let w = await S.catch(() => {
      return;
    });
    if (
      w?.readUnder === n &&
      pluginRegistry.pluginLoadMarks.get(S) === n &&
      !w.enabled.some((L) => s.has(nfcLower(L.source)))
    )
      y.push([S, w]);
  }
  for (let [S, w] of y) {
    w.readUnder = r;
    pluginRegistry.pluginLoadMarks.set(S, r);
  }
}
//@ chunk-e6aww6q8.js:4495794-4495977 placement
function settingsWithPluginsOff(e, n) {
  try {
    let r = jsonParse(e);
    if (!isPlainObject_5(r) || !isPlainObject_5(r.enabledPlugins)) return;
    r.enabledPlugins = sortedEntries({
      ...r.enabledPlugins,
      ...Object.fromEntries(n.map((s) => [s, false])),
    });
    return jsonStringify(r);
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
  let n = new Map();
  for (let y of SOURCES)
    if (isSettingSourceEnabled(y)) {
      let skillOverrides_2 = getSettingsForSource(y)?.skillOverrides ?? {};
      for (let [key, value] of Object.entries(skillOverrides_2))
        if (!n.has(key)) {
          let own =
            y === "userSettings" || (y === "localSettings" && ownLookup(skillOverrides, key) !== undefined);
          n.set(key, {
            value,
            own,
          });
        }
    }
  let r = ["policySettings", "flagSettings"];
  let s = (y) => r.some((S) => ownLookup(getSettingsForSource(S)?.skillOverrides, y) !== undefined);
  let h = new Map();
  for (let [y, { value: S, own: w }] of n) {
    let L = hasSyncedSkillPrefix(y);
    let G = L ? stripSyncedSkillPrefix(y) : y;
    let q = withSyncedSkillPrefix(G);
    if ((S === "off" || S === "user-invocable-only") && !s(y) && (L || (!n.has(q) && !s(q))))
      h.set(G, w || h.get(G) === true);
  }
  return h;
}
//@ chunk-e6aww6q8.js:4496634-4496936 placement
/**
 * 技能覆盖映射到同步插件 id。
 */
async function mapSkillOverridesToPlugins(e, mine) {
  let r = new Map();
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  if (claudeConfigDirOrNull === null) return r;
  let h = join(claudeConfigDirOrNull, SKILLS_SYNC_DIR_2);
  if (!(await hasSyncMarker(h, e))) return r;
  let y = join(h, e);
  let [syncedSkillIds, dirNameSet] = await Promise.all([readSyncedSkillIds(y), readDirNameSet(y)]);
  for (let [L, G] of mine) {
    let pluginId =
      dirNameSet === undefined || dirNameSet.has(L)
        ? syncedSkillIds.get(stripInvisibleChars_3(L))?.pluginId
        : undefined;
    if (pluginId !== undefined) r.set(pluginId, (G && dirNameSet !== undefined) || r.get(pluginId) === true);
  }
  return r;
}
export { collectSyncedSkillOverrides, persistSyncedPluginsOff };
