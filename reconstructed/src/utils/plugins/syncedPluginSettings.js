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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import { B2 } from "../permissions/permissionRulePayload.js";
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
import { skillOverrideWithSource, BC } from "../commandPredicates.js";
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
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { logEvent } from "../../services/analytics/index.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { ST } from "../../plugins/functionHooks/policyGate.js";
import { getClaudeConfigDirOrNull } from "../envUtils.js";
import { SKILLS_SYNC_DIR, stripInvisibleChars as stripInvisibleChars_3 } from "./syncedItems.js";
import { E2e } from "../claudeAiSync/syncOwnedRoot.js";
import { readSyncedSkillIds, readDirNameSet } from "../../skills/loadSkillsDir.js";

//@ chunk-e6aww6q8.js:4492219-4492387 placement
function collectSyncedSkillOverrides(e) {
  if (!B2()) return null;
  let n = new Set(e.merged),
    filtered = e.synced.filter((h) => h.enabled && n.has(h)),
    s = filtered.length === 0 ? new Map() : collectSkillOffOverrides();
  return s.size === 0 ? null : collectSyncedPluginSettings(e, filtered, s);
}
/**
 * 收集各设置源中已同步插件的启用状态。
 */
//@ chunk-e6aww6q8.js:4492387-4493632 placement
async function collectSyncedPluginSettings(e, n, r) {
  let index = e.sourcesHighFirst.indexOf("localSettings"),
    h = canWriteLocalSettings() ? getSettingsForSourceWriteSeed("localSettings")?.enabledPlugins : void 0,
    mapped = e.enabledPluginsIndexed.map((Se, ke) =>
      ke !== index ? Se : h === void 0 ? void 0 : groupEnabledPlugins(h),
    ),
    S = new Set(
      e.merged
        .filter((Se) => isRequiredPlugin(Se.source, Se.installationPreference))
        .flatMap((Se) => computeDependencyClosure(Se.source, e.merged).closure)
        .map(nfcLower),
    ),
    filtered = n.filter((Se) => {
      let ke = findPluginSetting(Se.source, mapped),
        we = ke === void 0 ? void 0 : e.sourcesHighFirst[ke.index];
      return !(
        we === "localSettings" ||
        we === "flagSettings" ||
        we === "policySettings" ||
        isRequiredPlugin(Se.source, Se.installationPreference) ||
        S.has(nfcLower(Se.source))
      );
    }),
    pluginIdOf = e.pluginIdOf(),
    G = new Map(),
    results = await Promise.all(
      filtered.map(async (Se) => {
        let ke =
            r.get(Se.name) === !0 && !isSyncedSkillTurnedOff(Se.name)
              ? await findSkillFolderPlugins(Se)
              : void 0,
          we =
            ke !== void 0 &&
            skillOverrideWithSource({ ...ke, source: "plugin", pluginInfo: { repository: Se.source } }) ===
              void 0
              ? new Map([...r].filter(([Ee]) => Ee !== Se.name))
              : r;
        return { plugin: Se, mine: we, byName: await resolveSyncedPluginEnabled(Se, we) };
      }),
    ),
    Z = { held: [], toWrite: [], following: [] };
  for (let { plugin: plugin, mine: mine, byName: byName } of results) {
    let Ee = pluginIdOf(plugin),
      Ae;
    if (Ee !== void 0) {
      let Ie = basename_64(dirname_73(plugin.path)),
        Me = mine === r ? G.get(Ie) : void 0;
      if (Me === void 0) {
        if (((Me = mapSkillOverridesToPlugins(Ie, mine)), mine === r)) G.set(Ie, Me);
      }
      Ae = (await Me).get(Ee);
    }
    if (Ae !== void 0 || byName !== void 0) {
      if ((Z.held.push(plugin), Ae === !0 || byName === !0)) Z.toWrite.push(plugin);
    } else if (mine !== r) Z.following.push(plugin);
  }
  return Z;
}
//@ chunk-e6aww6q8.js:4493632-4493735 placement
function isSyncedSkillTurnedOff(e) {
  return SOURCES.some(
    (n) =>
      isSettingSourceEnabled(n) &&
      [withSyncedSkillPrefix(e), e].some((r) => BC(getSettingsForSource(n)?.skillOverrides, r) === "off"),
  );
}
//@ chunk-e6aww6q8.js:4493735-4493977 placement
async function resolveSyncedPluginEnabled(e, n) {
  let r;
  for (let s of await listPluginSkillCommands(e))
    for (let h of pluginSkillAliases(s)) {
      let y = hasSyncedSkillPrefix(h) ? n.get(stripSyncedSkillPrefix(h)) : void 0;
      if (y !== void 0) r = y || r === !0;
      if (
        (env.CLAUDE_CODE_SYNC_SKILLS || env.CLAUDE_CODE_SYNC_SESSION_REFS) &&
        n.has(`skills_${stripSyncedSkillPrefix(h)}`)
      )
        r ??= !1;
    }
  return r;
}
/**
 * 把需关闭的同步插件写到本地设置（失败记 warn）。
 */
//@ chunk-e6aww6q8.js:4493977-4494296 placement
function persistSyncedPluginsOff(e, n) {
  if (e.length === 0) return Promise.resolve();
  return writeSyncedPluginsOffToLocalSettings(
    e.map((r) => r.source),
    n,
  ).catch((r) =>
    logForDebugging(
      `Turned off a synced plugin in local settings for a claude.ai skill that was turned off, but could not record that the plugin list already reflects it, so the plugins may be read again: ${errorMessage(r)}`,
      { level: "warn" },
    ),
  );
}
/**
 * 本地设置可写（受信、未入库）时，把尚未记录的同步插件写成 false；设置有不可保留的校验错误或由副本回答时跳过。 失败只记 warn（每次加载时仍会被挡住）。
 */
//@ chunk-e6aww6q8.js:4494296-4495395 placement
async function writeSyncedPluginsOffToLocalSettings(e, n) {
  let r,
    s,
    h,
    y,
    S = [],
    w = null;
  try {
    let L = getSettingsFilePathForSource("localSettings");
    if (!isWorkspacePersistedTrusted() || !canWriteLocalSettings() || L === void 0) return;
    if (
      (await runInSettingsWriteQueue(L, () => Promise.resolve()),
      getSettingsFilePathForSource("localSettings") !== L)
    )
      return;
    w = (
      await updateSettingsForSourceWithTransform("localSettings", (G) => {
        let q = G?.enabledPlugins,
          Z = isPlainObject_4(q) ? [groupEnabledPlugins(q)] : [],
          filtered = e.filter((Ee) => findPluginSetting(Ee, Z) === void 0),
          ke = isRepoTierAnsweredByACopy("localSettings");
        if (
          ((s ??= getLocalSettingsValidationErrors().some((Ee) => !Ee.preserveOnWrite)),
          r === void 0 && !ke && !s && filtered.length > 0)
        )
          ((y = n()), (S = filtered));
        ((r ??= ke || s ? 0 : filtered.length), (h ??= s && !ke && filtered.length > 0));
        let fromEntries = Object.fromEntries(filtered.map((Ee) => [Ee, !1]));
        return ke || s || filtered.length === 0 ? null : { enabledPlugins: fromEntries };
      })
    ).error;
  } catch (error) {
    w = error;
  }
  if (w !== null)
    logForDebugging(
      `Could not turn off a synced plugin in local settings for a claude.ai skill that was turned off; it is held off at each load instead: ${errorMessage(w)}`,
      { level: "warn" },
    );
  else if (h === !0)
    logForDebugging(
      "Did not turn off a synced plugin in local settings for a claude.ai skill that was turned off: the file has validation warnings, and writing it would delete the entries they name. It is held off at each load instead.",
    );
  else if (r !== void 0 && r > 0) {
    if ((logEvent("tengu_synced_skill_off_saved_on_plugin", { count: r }), y !== void 0))
      await remarkPluginLoadsForSettings(S, y);
  }
}
/**
 * 设置变化不影响已加载结果时更新其读取标记。
 */
//@ chunk-e6aww6q8.js:4495395-4495794 placement
async function remarkPluginLoadsForSettings(e, n) {
  let r = settingsWithPluginsOff(n, e);
  if (r === void 0) return;
  let s = new Set(e.map(nfcLower)),
    h = getPluginRegistry(),
    y = [];
  for (let S of [h.pluginLoad, h.pluginLoadCacheOnly]) {
    if (S === void 0 || h.pluginLoadMarks.get(S) !== n) continue;
    let w = await S.catch(() => {
      return;
    });
    if (
      w?.readUnder === n &&
      h.pluginLoadMarks.get(S) === n &&
      !w.enabled.some((L) => s.has(nfcLower(L.source)))
    )
      y.push([S, w]);
  }
  for (let [S, w] of y) ((w.readUnder = r), h.pluginLoadMarks.set(S, r));
}
//@ chunk-e6aww6q8.js:4495794-4495977 placement
function settingsWithPluginsOff(e, n) {
  try {
    let r = jsonParse(e);
    if (!isPlainObject_4(r) || !isPlainObject_4(r.enabledPlugins)) return;
    return (
      (r.enabledPlugins = ST({ ...r.enabledPlugins, ...Object.fromEntries(n.map((s) => [s, !1])) })),
      jsonStringify(r)
    );
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4495977-4496078 placement
function canWriteLocalSettings() {
  return (
    isSettingSourceEnabled("localSettings") &&
    !isRepoTierAnsweredByACopy("localSettings") &&
    !isLocalSettingsGitTracked({ onIndeterminate: "untracked" })
  );
}
/**
 * 各设置源中把技能设为 off/user-invocable-only 的覆盖。
 */
//@ chunk-e6aww6q8.js:4496078-4496634 placement
function collectSkillOffOverrides() {
  let e = canWriteLocalSettings() ? getSettingsForSourceWriteSeed("localSettings")?.skillOverrides : void 0,
    n = new Map();
  for (let y of SOURCES)
    if (isSettingSourceEnabled(y)) {
      let S = getSettingsForSource(y)?.skillOverrides ?? {};
      for (let [w, L] of Object.entries(S))
        if (!n.has(w)) {
          let G = y === "userSettings" || (y === "localSettings" && BC(e, w) !== void 0);
          n.set(w, { value: L, own: G });
        }
    }
  let r = ["policySettings", "flagSettings"],
    s = (y) => r.some((S) => BC(getSettingsForSource(S)?.skillOverrides, y) !== void 0),
    h = new Map();
  for (let [y, { value: S, own: w }] of n) {
    let L = hasSyncedSkillPrefix(y),
      G = L ? stripSyncedSkillPrefix(y) : y,
      q = withSyncedSkillPrefix(G);
    if ((S === "off" || S === "user-invocable-only") && !s(y) && (L || (!n.has(q) && !s(q))))
      h.set(G, w || h.get(G) === !0);
  }
  return h;
}
/**
 * 技能覆盖映射到同步插件 id。
 */
//@ chunk-e6aww6q8.js:4496634-4496936 placement
async function mapSkillOverridesToPlugins(e, n) {
  let r = new Map(),
    s = getClaudeConfigDirOrNull();
  if (s === null) return r;
  let h = join_125(s, SKILLS_SYNC_DIR);
  if (!(await E2e(h, e))) return r;
  let y = join_125(h, e),
    [S, w] = await Promise.all([readSyncedSkillIds(y), readDirNameSet(y)]);
  for (let [L, G] of n) {
    let q = w === void 0 || w.has(L) ? S.get(stripInvisibleChars_3(L))?.pluginId : void 0;
    if (q !== void 0) r.set(q, (G && w !== void 0) || r.get(q) === !0);
  }
  return r;
}

export { collectSyncedSkillOverrides, persistSyncedPluginsOff };
