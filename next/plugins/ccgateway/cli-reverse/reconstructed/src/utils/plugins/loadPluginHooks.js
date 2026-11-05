/**
 * utils/plugins/loadPluginHooks.ts
 *
 * 加载插件钩子；判断函数钩子注册是否仍欠缺
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/loadPluginHooks.ts
 * pieces: chunk-5xgkngpb.js (44), chunk-r7hswen6.js (1), chunk-tt36reb3.js (5)
 * attribution: placement 16, facade-majority 15, layout 17, fingerprint 2
 */
import {
  getVouchedAdminPolicyTier,
  getSettingsForSource,
  getAdminAuthoredPolicySettings,
  getRemotePolicyTierWithKind,
} from "../settings/settings.js";
import {
  policySettings_2,
  hasPluginDeclarations,
  hasManagedPlugins,
  resolveSeatedManagedPlugins,
  getVouchedPolicyPluginIds,
  resolveManagedPluginOrder,
  managedPluginNameSet,
} from "./managedPlugins.js";
import { nfcLower, plural } from "../stringUtils.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import { logError } from "../log.js";
import { toError, errorMessage } from "../errors.js";
import { isBuiltinPluginId, getBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { canonicalPluginId, pluginNamesEqual, pluginNameAliases, marketplaceOf } from "./pluginIdentifier.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { getHostState } from "../hostEnvironment.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { enabledPluginIds } from "./pluginStartupCheck.js";
import { hasLink } from "../hasLink.js";
import {
  getInlinePlugins,
  getInlinePluginsNoMcp,
  getInlinePluginUrls,
  getSyncedPluginDirs,
  replaceRegisteredPluginHooks,
  getRegisteredHooks,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import {
  areHooksEnabled,
  isHookSourceAllowed,
  refreshModAdmission,
  MODS_POLICY_UNKNOWN_REASON,
  notifyModsRejudged,
} from "../hooks.js";
import { identity as identity_2 } from "../identity.js";
import {
  truncateListItem,
  quotedListItem,
  formatFailureDetails_2,
  loadAllPluginsCacheOnly,
  rereadPluginsCacheOnly,
  clearPluginCache,
} from "./pluginLoader.js";
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import { logForDebugging } from "../debug.js";
import {
  reportPluginProblem,
  pluginDirsOverride,
  uiLog,
} from "../../plugins/functionHooks/hooksWorkerClient.js";
import { commandSyncNameState } from "../settings/commandSyncNames.js";
import { readMergedSettingsForPlugin } from "../../plugins/functionHooks/settingsReadApi.js";
import { arePluginHooksHeld } from "../permissions/permissionsLoader.js";
import {
  isManagedPluginVouched,
  filterManagedHookSources,
  pluginHooksRefusalReason,
  describeHooksModulesTurnedOff,
  hookPolicySummaryState,
  areBuiltinOnlyHooksModules,
  getHookPolicyAnswerState,
  remoteSettingsAnswerState,
  shouldHoldPersonalModuleHooks,
} from "../hooks/hookPolicyHold.js";
import {
  inlineProblemsSeen,
  orderHooksModules,
  reportInlinePluginNotice,
  loadHooksModules,
  pruneHooksModules,
  refreshOptions,
} from "../../plugins/functionHooks/hooksModuleLoader.js";
import { providerRank } from "../../plugins/functionHooks/providerTiers.js";
import { pluginTier } from "../../plugins/functionHooks/dispatch/chain.js";
import { getPolicyAllowedSet } from "./pluginPolicy.js";
import { hookPluginLabel } from "../../plugins/functionHooks/hookDispatch.js";
import {
  holdForRolloutFlagAtStartup,
  loadLateWhenFlagTurnsOn,
  flagValueSourceLabel,
  isHooksModulesGateDisabled,
  markWakeBoundPassed,
  isAutoModeGateOpen,
  updateWakeBound,
  followHooksModulesRollout,
} from "./hooksModulesRollout.js";
import {
  areHooksModulesAllowed,
  hooksModulesRefusalReason,
} from "../../services/analytics/growthbookCredentials.js";
import { PLUGIN_HOOKS_MODULES_GATE } from "../../services/analytics/growthbook.js";
import { isSafeMode } from "../envUtils.js";
import {
  hooksModulesGateFromPayload,
  settleManagedModulesLoad,
  watchRolloutSwitchChanges,
  followRolloutSwitchOnce,
} from "./hooksModulesLoadGate.js";
import {
  readStablePolicy,
  isDemoOrClaubbet,
  managedHooksPolicyStamp,
} from "../../plugins/functionHooks/policyGate.js";
import { isProjectScopeTrustAccepted } from "../config.js";
import {
  installPluginToolsServer,
  writeAllTypeRoots,
} from "../../plugins/functionHooks/toolRegisterServer.js";
import {
  logHooksModulesDisabled,
  WATCH_CLOCK,
  startPluginDirWatches,
  watchPluginOptionChanges,
} from "../../plugins/functionHooks/devModsWatch.js";
import { getPluginNameFromError as getPluginNameFromError_2 } from "../../commands/plugin/PluginSettings.js";
import { pluginErrorText } from "../../types/plugin.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromNumber } from "../../services/analytics/safeMetadata.js";
import { marketplaceSource } from "./pluginOptionsStorage.js";
import { jsonStringify } from "../slowOperations.js";
import { settingsChangeDetector } from "../settings/changeDetector.js";
import { subscribe_2 as subscribe_2_2 } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { NOT_RECORDED, pluginErrorSummary } from "./marketplaceNames.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-r7hswen6.js:13465-14030 fingerprint (2.1.88 match: getPluginAffectingSettingsSnapshot, 0.609)
/**
 * 计算影响插件加载的设置指纹（enabledPlugins、extraKnownMarketplaces、策略等），用于判断缓存的插件加载结果是否过期。
 */
function getPluginAffectingSettingsSnapshot() {
  let merged = getVouchedAdminPolicyTier();
  let tiers = policySettings_2(merged);
  let hasPluginDecls = hasPluginDeclarations(tiers);
  let enables = hasPluginDecls ? merged : getSettingsForSource("policySettings");
  let adminAuthoredPolicySettings = getAdminAuthoredPolicySettings();
  if (getRemotePolicyTierWithKind().servedSnapshot)
    return {
      enables,
      names: adminAuthoredPolicySettings,
    };
  if (hasPluginDecls)
    return {
      enables,
      names: merged,
    };
  let mergedMarketplaces = new Map();
  let seenNames = new Set();
  for (let tier of tiers) {
    let filtered = Object.entries(tier.extraKnownMarketplaces ?? {}).filter(
      ([key]) => !seenNames.has(nfcLower(key)),
    );
    for (let [name, declaration] of filtered) mergedMarketplaces.set(name, declaration);
    for (let [name] of filtered) seenNames.add(nfcLower(name));
  }
  let hasStrict = seenNames.size > 0 || tiers.some((tier) => tier.strictKnownMarketplaces !== undefined);
  return {
    enables,
    names: hasStrict
      ? {
          extraKnownMarketplaces: Object.fromEntries(mergedMarketplaces),
          ...(merged?.strictKnownMarketplaces !== undefined && {
            strictKnownMarketplaces: merged.strictKnownMarketplaces,
          }),
        }
      : adminAuthoredPolicySettings,
  };
}
//@ chunk-tt36reb3.js:849-908 placement
function policySettingsUnreadableSafe() {
  try {
    return policySettingsUnreadable();
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-tt36reb3.js:908-1097 placement
/**
 * 内置插件只能由受信设置启用时返回其规范 id。
 */
function trustedOnlyBuiltinPluginId(pluginId) {
  if (!isBuiltinPluginId(pluginId)) return;
  let sliced = canonicalPluginId(pluginId).slice(0, -`@${BUILTIN}`.length);
  for (let [name, entry] of getHostState().builtinPlugins)
    if (pluginNamesEqual(name, sliced))
      return entry.enabledFromTrustedSettingsOnly === true ? `${name}@${BUILTIN}` : undefined;
  return;
}
//@ chunk-tt36reb3.js:1097-1125 placement
/**
 * hasTrustedOnlyBuiltinPlugin：该插件是否只能由受信设置启用。
 */
var hasTrustedOnlyBuiltinPlugin = (pluginId) => trustedOnlyBuiltinPluginId(pluginId) !== undefined;
//@ chunk-tt36reb3.js:4261-4502 placement
/**
 * 是否存在任何非内置插件（启用、带钩子、已加载模块、托管、内联、同步）。
 */
function hasNonBuiltinPluginSurface() {
  try {
    let pluginRegistry = getPluginRegistry();
    return (
      enabledPluginIds().some((pluginId) => !isBuiltinPluginId(pluginId)) ||
      [...pluginRegistry.pluginsWithHooks].some((pluginsWithHook) => !isBuiltinPluginId(pluginsWithHook)) ||
      pluginRegistry.loadedModules.some((loadedModule) => !hasLink(loadedModule)) ||
      hasManagedPlugins() ||
      policySettingsUnreadable() ||
      getInlinePlugins().length > 0 ||
      getInlinePluginsNoMcp().length > 0 ||
      getInlinePluginUrls().length > 0 ||
      getSyncedPluginDirs().length > 0
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-tt36reb3.js:4502-4706 placement
/**
 * 函数钩子注册是否还没完成：欠缺、进行中、原因未知、盲跑或托管设置不可读，且开关允许并存在非内置插件；出错保守返回 true。
 */
function isHookRegistrationPending() {
  try {
    let pluginRegistry = getPluginRegistry();
    return (
      (pluginRegistry.hookRegistrationOwed ||
        pluginRegistry.hookRegistrationInFlight !== undefined ||
        pluginRegistry.hooksUnknownCause !== undefined ||
        pluginRegistry.hookRegistrationRanBlind ||
        policySettingsUnreadableSafe()) &&
      areHooksEnabled() &&
      hasNonBuiltinPluginSurface()
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-5xgkngpb.js:617166-617301 placement
var HOOKS_JSON_TOP_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOOK_MATCHER_KEYS;
var reportedHookKeyWarnings;
deferInit("chunk-5xgkngpb.js:617166", () => {
  HOOKS_JSON_TOP_KEYS = new Set(["$schema", "description", "hooks", "modules", "surface"]);
  HOOK_MATCHER_KEYS = new Set(["matcher", "hooks"]);
  reportedHookKeyWarnings = identity_2(new Set(), (set) => set.clear());
});
//@ chunk-5xgkngpb.js:617301-617436 placement
function unknownMatcherKeys(eventName, matcher, index) {
  let path = `hooks.${truncateListItem(eventName)}[${index}]`;
  return (isPlainObject_6(matcher) ? Object.keys(matcher) : [])
    .filter((key) => !HOOK_MATCHER_KEYS.has(key))
    .map((key) => `${quotedListItem(key)} in ${path}`);
}
//@ chunk-5xgkngpb.js:617436-617546 placement
var unknownHookEntryKeys = (hooks) =>
  (isPlainObject_6(hooks) ? Object.entries(hooks) : []).flatMap(([eventName, matchers]) =>
    (Array.isArray(matchers) ? matchers : []).flatMap((matcher, index) =>
      unknownMatcherKeys(eventName, matcher, index),
    ),
  );
//@ chunk-5xgkngpb.js:617546-617857 placement
/**
 * 检查 hooks.json 顶层和各 matcher 条目的未知键；存在时按（插件, 路径, 消息）去重后记 warn 日志并调用 reportPluginProblem。
 */
function warnUnknownHooksJsonKeys(pluginName, hooksFilePath, hooksJson) {
  if (!isPlainObject_6(hooksJson)) return;
  let problems = [
    ...Object.keys(hooksJson)
      .filter((key) => !HOOKS_JSON_TOP_KEYS.has(key))
      .map(quotedListItem),
    ...unknownHookEntryKeys(hooksJson.hooks),
  ];
  if (problems.length === 0) return;
  let message = `hooks.json: unknown ${plural(problems.length, "key")} ${formatFailureDetails_2(problems)} ignored`;
  let cacheKey = `${pluginName}\x00${hooksFilePath}\x00${message}`;
  if (reportedHookKeyWarnings.has(cacheKey)) return;
  reportedHookKeyWarnings.add(cacheKey);
  logForDebugging(`Plugin ${pluginName}: ${message} (${hooksFilePath})`, {
    level: "warn",
  });
  reportPluginProblem(pluginName, message);
}
//@ chunk-5xgkngpb.js:4268571-4268716 placement
/**
 * 排队一次“带 hooks 的设置合并”广播，未在广播中时串到队列尾。
 */
function queueHookedSettingsMerge(pluginId) {
  let state = commandSyncNameState();
  let hookedMerge = state.hookedMerge;
  if (hookedMerge.queuedFor === undefined && !hookedMerge.isAnnouncing) {
    hookedMerge.queuedFor = pluginId;
    hookedMerge.pass = hookedMerge.pass.then(() => readMergedSettingsForPlugin(state, pluginId));
  }
  return hookedMerge.pass;
}
//@ chunk-5xgkngpb.js:4268716-4268828 placement
function queueHookedMergeOnSettingsChange() {
  let hookedMerge = commandSyncNameState().hookedMerge;
  if (!hookedMerge.isAnnouncing) hookedMerge.unsettled = new Set();
  return queueHookedSettingsMerge("the settings changed");
}
//@ chunk-5xgkngpb.js:4268828-4269679 facade-majority (2.1.88 match: convertPluginHooksToMatchers, 0.9)
/**
 * 把一个插件的 hooksConfig 转成 按事件名分组的 matcher 列表（每个 matcher 附带 pluginRoot、pluginId 等来源信息）。
 */
function convertPluginHooksToMatchers(plugin) {
  let pluginMatchers = {
    PreToolUse: [],
    PostToolUse: [],
    PostToolUseFailure: [],
    PostToolBatch: [],
    PermissionDenied: [],
    Notification: [],
    UserPromptSubmit: [],
    UserPromptExpansion: [],
    SessionStart: [],
    SessionEnd: [],
    Stop: [],
    StopFailure: [],
    SubagentStart: [],
    SubagentStop: [],
    PreCompact: [],
    PostCompact: [],
    PreModelSwitch: [],
    PostModelSwitch: [],
    PermissionRequest: [],
    Setup: [],
    TeammateIdle: [],
    TaskCreated: [],
    TaskCompleted: [],
    Elicitation: [],
    ElicitationResult: [],
    ConfigChange: [],
    WorktreeCreate: [],
    WorktreeRemove: [],
    InstructionsLoaded: [],
    CwdChanged: [],
    FileChanged: [],
    DirectoryAdded: [],
    MessageDisplay: [],
  };
  if (!plugin.hooksConfig) return pluginMatchers;
  let held = arePluginHooksHeld(plugin);
  for (let [event, matchers] of Object.entries(plugin.hooksConfig)) {
    let hookEvent = event;
    if (!pluginMatchers[hookEvent]) continue;
    for (let matcher of matchers)
      if (matcher.hooks.length > 0)
        pluginMatchers[hookEvent].push({
          matcher: matcher.matcher,
          hooks: matcher.hooks,
          pluginRoot: plugin.path,
          pluginName: plugin.name,
          pluginId: plugin.source,
          ...(held && {
            personal: true,
          }),
        });
  }
  return pluginMatchers;
}
//@ chunk-5xgkngpb.js:4269679-4269834 layout
function orderPluginsManagedFirst(plugins, managedIds) {
  let isManaged = (plugin) => managedIds?.has(plugin.source) === true;
  let isTrustedBuiltin = (plugin) => hasTrustedOnlyBuiltinPlugin(plugin.source);
  return [
    ...plugins.filter(isManaged),
    ...plugins.filter((plugin) => !isManaged(plugin) && isTrustedBuiltin(plugin)),
    ...plugins.filter((plugin) => !isManaged(plugin) && !isTrustedBuiltin(plugin)),
  ];
}
//@ chunk-5xgkngpb.js:4269834-4270007 layout
function orderPluginsForHookLoad(plugins, managedIds, isVouched) {
  let preferred = new Set(
    plugins.filter(
      (plugin) => managedIds?.has(plugin.source) === true || hasTrustedOnlyBuiltinPlugin(plugin.source),
    ),
  );
  let filtered = plugins.filter((plugin) => !preferred.has(plugin));
  return [
    ...preferred,
    ...filtered.filter((plugin) => isVouched(plugin)),
    ...filtered.filter((plugin) => !isVouched(plugin)),
  ];
}
//@ chunk-5xgkngpb.js:4270007-4270092 layout
function orderedPluginIdsMemoizer() {
  let memo = new Map();
  return (pluginId) => {
    let vouched = memo.get(pluginId) ?? isManagedPluginVouched(pluginId);
    memo.set(pluginId, vouched);
    return vouched;
  };
}
//@ chunk-5xgkngpb.js:4270092-4271587 facade-majority
/**
 * 按托管策略 prependPlugins/appendPlugins 调整插件 hooks 的顺序，并记录被遮蔽的插件。
 */
function chainOrder(modules, managedIds, plan) {
  if (plan.seat !== undefined) logForDebugging(plan.seat);
  for (let id of plan.append.filter((id) => plan.prepend.includes(id)))
    logForDebugging(
      `managed plugin ${id} is named in both prependPlugins and appendPlugins; it is prepended`,
      {
        level: "warn",
      },
    );
  for (let key of plan.shadowed) {
    if (inlineProblemsSeen.has(key)) continue;
    inlineProblemsSeen.add(key);
    logForDebugging(
      plan.shadowedBy === "seat"
        ? `${key} in user settings ignored: your organization's plan seats ${plan.outermost.join(", ")} here, so neither tier key is yours to set`
        : plan.shadowedBy === "host"
          ? `${key} in user settings ignored: in a hosted session only an organization's settings place a mod above the user tier`
          : `${key} in user settings ignored: set by managed policy (this machine has managed settings, so both tier keys are the policy's)`,
    );
  }
  let tiers = {
    prependPlugins: {
      ids: plan.prepend,
      from: plan.from.prepend,
    },
    appendPlugins: {
      ids: plan.append,
      from: plan.from.append,
    },
  };
  for (let [key, { ids, from }] of Object.entries(tiers)) {
    if (from !== "none")
      logForDebugging(
        `${key} from ${from === "policy" ? "managed policy" : "user settings"}: ${ids.join(", ") || "(none)"}`,
      );
    let managedSet = new Set([...(managedIds ?? [])].map(nfcLower));
    for (let id of ids) {
      if (plan.outermost.includes(id)) continue;
      let isManaged = managedSet.has(id);
      if (from === "user" && isManaged) {
        logForDebugging(
          `${key} in user settings names ${id}, a managed plugin; ignored: a user key seats only the person's own plugins`,
          {
            level: "warn",
          },
        );
        continue;
      }
      if (!(
        (from === "user" || isManaged) &&
        !isBuiltinPluginId(id) &&
        modules.some((loadedPlugin) => nfcLower(loadedPlugin.source) === id)
      ))
        logForDebugging(
          `${key} names ${id}, which is not an enabled ${from === "user" ? "" : "managed "}plugin with a hooks module; skipped`,
        );
    }
  }
  let rankOf = (loadedPlugin) => providerRank(loadedPlugin.source, managedIds, plan);
  return orderHooksModules(
    modules.toSorted((left, right) => rankOf(left) - rankOf(right)),
    (loadedPlugin) => ({
      rank: rankOf(loadedPlugin),
      tier: pluginTier(loadedPlugin.source, managedIds, plan),
    }),
  );
}
//@ chunk-5xgkngpb.js:4271587-4271667 layout
function firstMappedValue(map, keys) {
  let found = keys.find((key) => map.has(key));
  return found === undefined ? undefined : map.get(found);
}
//@ chunk-5xgkngpb.js:4271667-4272591 layout
function describeHooksModuleSkip(
  modules,
  { isManaged, hooksDisabled, managedOnly, allDisabled, organization, builtinsOnly, personsHeld },
) {
  let chosen = [];
  let leftOut = [];
  let nameOwner = new Map();
  let allowedSet = personsHeld ? filterManagedHookSources(getPolicyAllowedSet(), modules) : null;
  for (let loadedPlugin of modules) {
    let refusal = pluginHooksRefusalReason(
      loadedPlugin.source,
      {
        isHeld: arePluginHooksHeld(loadedPlugin),
        isManaged: isManaged(loadedPlugin),
        isPolicyEnabled: allowedSet?.has(loadedPlugin.source) === true,
      },
      {
        hooksDisabled,
        managedOnly,
        allDisabled,
        organization,
        builtinsOnly,
        personsHeld,
      },
    );
    if (refusal !== undefined) {
      if (loadedPlugin.modulePath !== undefined) {
        logForDebugging(`hooks module ${hookPluginLabel(loadedPlugin)} not loaded: ${refusal}`);
        reportInlinePluginNotice(loadedPlugin, `hooks module not loaded: ${refusal}`);
      }
      continue;
    }
    let aliases = pluginNameAliases(loadedPlugin);
    let owner = firstMappedValue(nameOwner, aliases);
    for (let alias of aliases) if (!nameOwner.has(alias)) nameOwner.set(alias, loadedPlugin.source);
    if (loadedPlugin.modulePath === undefined) continue;
    if (owner !== undefined) {
      leftOut.push({
        type: "hooks-module-left-out-by-name",
        source: loadedPlugin.source,
        heldBy: owner,
      });
      let reason = "another plugin of that name loads first (a managed one, or an earlier source)";
      logForDebugging(`hooks module ${hookPluginLabel(loadedPlugin)} not loaded: ${reason}`);
      reportInlinePluginNotice(loadedPlugin, `hooks module not loaded: ${reason}`);
    } else chosen.push(loadedPlugin);
  }
  return {
    chosen,
    leftOut,
  };
}
//@ chunk-5xgkngpb.js:4272591-4272640 layout
var isNonBuiltinHooksModule = (loadedPlugin) =>
  loadedPlugin.modulePath !== undefined && !isBuiltinPluginId(loadedPlugin.source);
//@ chunk-5xgkngpb.js:4272640-4272798 layout
function hasHooksModulesAwaitingFlag(modules, policy) {
  let allowedSet = filterManagedHookSources(getPolicyAllowedSet(), modules);
  return modules.some(
    (loadedPlugin) =>
      isNonBuiltinHooksModule(loadedPlugin) &&
      describeHooksModulesTurnedOff(allowedSet?.has(loadedPlugin.source) === true, {
        ...policy,
        builtinsOnly: false,
        personsHeld: false,
        organization: "unasked",
      }) === undefined,
  );
}
//@ chunk-5xgkngpb.js:4272798-4272913 layout
var hasLoadableOrgHooksModule = (modules, allowedSet) =>
  modules.some(
    (loadedPlugin) =>
      isNonBuiltinHooksModule(loadedPlugin) &&
      allowedSet?.has(loadedPlugin.source) === true &&
      describeHooksModulesTurnedOff(true, {
        ...hookPolicySummaryState(),
        builtinsOnly: false,
        personsHeld: false,
      }) === undefined,
  );
//@ chunk-5xgkngpb.js:4272913-4272971 layout
async function loadLateHooksWhenFlagTurnsOn(modules, onLoad) {
  if (hasHooksModulesAwaitingFlag(modules, hookPolicySummaryState())) {
    await holdForRolloutFlagAtStartup();
    loadLateWhenFlagTurnsOn(onLoad);
  }
}
//@ chunk-5xgkngpb.js:4272971-4273296 layout
function areInstalledHooksModulesHeld(modules) {
  if (!areBuiltinOnlyHooksModules(modules)) return false;
  if (areHooksModulesAllowed()) {
    logForDebugging(
      `installed plugins' hooks modules not loaded: rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is not answered yet in this wake; built-in plugins load regardless`,
    );
    return true;
  }
  logForDebugging(
    `installed plugins' hooks modules not loaded: rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is off, ` +
      flagValueSourceLabel() +
      "; built-in plugins load regardless",
  );
  return true;
}
//@ chunk-5xgkngpb.js:4273296-4273864 layout
/**
 * 计算已安装 hooks 模块是否被挡住，并在注册表 hooksModulesSwitchRead 中记录：开关是否开、询问时间、是否欠载、 组织模块是否待加载、个人模块是否被排除。没有待处理项时清空该记录。
 */
function recordHooksModulesSwitchRead(modules, modules_2, allowedSet) {
  if (isHooksModulesGateDisabled()) markWakeBoundPassed();
  let held = areInstalledHooksModulesHeld(modules);
  let awaitingFlag = hasHooksModulesAwaitingFlag(modules_2, hookPolicySummaryState());
  let gateOpen = isAutoModeGateOpen();
  let wakeAhead = gateOpen && modules.hooksModulesWakeBound === "ahead";
  let hooksModulesSwitchRead = modules.hooksModulesSwitchRead;
  let askedAt = wakeAhead ? 0 : hooksModulesSwitchRead?.askedAt || Date.now();
  let wasOn = hooksModulesSwitchRead?.isOn === true;
  let flagOn = held && areHooksModulesAllowed();
  let managedPending =
    hooksModulesSwitchRead?.isManagedPending === true ||
    (flagOn && hasLoadableOrgHooksModule(modules_2, allowedSet));
  let personsOut =
    modules.hooksModulesWakeBound !== "ahead" &&
    gateOpen &&
    areHooksModulesAllowed() &&
    isHooksModulesGateDisabled() &&
    getHookPolicyAnswerState() === "failed";
  let policyAllowedSet = filterManagedHookSources(getPolicyAllowedSet(), modules_2);
  let any = modules_2.some(
    (loadedPlugin) =>
      isNonBuiltinHooksModule(loadedPlugin) &&
      allowedSet?.has(loadedPlugin.source) !== true &&
      policyAllowedSet?.has(loadedPlugin.source) !== true &&
      describeHooksModulesTurnedOff(false, {
        ...hookPolicySummaryState(),
        builtinsOnly: false,
        personsHeld: false,
      }) === undefined,
  );
  modules.hooksModulesSwitchRead =
    awaitingFlag || managedPending
      ? {
          isOn: !held || wasOn,
          askedAt,
          isLoadOwed: gateOpen,
          isManagedPending: managedPending,
          isPersonsOut: personsOut && any,
        }
      : undefined;
  return held;
}
//@ chunk-5xgkngpb.js:4273864-4273965 layout
function markHooksModulesSwitchOff(pluginRegistry) {
  let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead !== undefined)
    pluginRegistry.hooksModulesSwitchRead = {
      ...hooksModulesSwitchRead,
      isOn: false,
    };
}
//@ chunk-5xgkngpb.js:4273965-4274389 layout
function hooksModulesLeftOutByName(modules, enabledModules, managedIds, leftOut) {
  if (!(
    !isSafeMode() &&
    describeHooksModulesTurnedOff(true, {
      ...hookPolicySummaryState(),
      builtinsOnly: false,
      personsHeld: false,
    }) === undefined
  ))
    return [];
  let enabledSet = new Set(enabledModules);
  let vouchedSet = new Set([...(managedIds ?? [])].map(nfcLower));
  let heldOutSources = new Set(
    leftOut.flatMap((entry) =>
      entry.type === "hooks-module-left-out-by-name" && vouchedSet.has(nfcLower(entry.heldBy))
        ? [entry.source]
        : [],
    ),
  );
  return [...(managedIds ?? [])]
    .filter((id) => !isBuiltinPluginId(id))
    .filter((id) => {
      let lowered = nfcLower(id);
      let filtered = modules.filter((loadedPlugin) => nfcLower(loadedPlugin.source) === lowered);
      return !(
        filtered.length > 0 &&
        filtered.every(
          (loadedPlugin) =>
            !isNonBuiltinHooksModule(loadedPlugin) ||
            enabledSet.has(loadedPlugin) ||
            heldOutSources.has(loadedPlugin.source),
        )
      );
    });
}
//@ chunk-5xgkngpb.js:4274389-4274469 layout
function isHooksModulesFlagSettled() {
  let hookPolicyAnswerState = getHookPolicyAnswerState();
  let overridden = hooksModulesGateFromPayload() || isHooksModulesGateDisabled();
  return hookPolicyAnswerState === "answered" || (hookPolicyAnswerState === "failed" && overridden);
}
//@ chunk-5xgkngpb.js:4274469-4274515 facade-majority
/**
 * 判断组织策略是否已经超出等待期仍未读到（策略读取开启且状态不是 pending），用于决定插件钩子是否先按无策略处理。
 */
function isPolicyUnreadPastItsBounds() {
  return policySettingsUnreadable() && remoteSettingsAnswerState() !== "pending";
}
//@ chunk-5xgkngpb.js:4274515-4274622 layout
function markHooksModulesLoadOwed(pluginRegistry) {
  let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead !== undefined)
    pluginRegistry.hooksModulesSwitchRead = {
      ...hooksModulesSwitchRead,
      isLoadOwed: true,
    };
}
//@ chunk-5xgkngpb.js:4274622-4274843 layout
function isPersonModulesHeldWithLog(registry) {
  let held = shouldHoldPersonalModuleHooks(registry);
  if (held)
    logForDebugging(
      `a person's installed plugins' hooks modules not loaded: rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is not answered within this wake's wait; an organization's and built-in plugins load regardless`,
    );
  return held;
}
//@ chunk-5xgkngpb.js:4274843-4275040 layout
function filterPluginsForSafeMode(enabled) {
  if (!isSafeMode()) return [...enabled];
  logForDebugging(
    "Safe mode: installed plugins are disabled, none of their hooks or hooks modules load; built-in plugins load regardless",
  );
  return enabled.filter((plugin) => isBuiltinPluginId(plugin.source));
}
//@ chunk-5xgkngpb.js:4275040-4276299 fingerprint (2.1.88 match: loadPluginHooks, 0.708)
/**
 * 汇总所有启用插件的 hooks：按事件把 matcher 合并（托管插件 prependPlugins/appendPlugins 排序），同一插件重复注册跳过，返回 {matchers, hooksLeftOut, loadedWithHooks}。
 */
function loadPluginHooks_2(plugins, managedIds) {
  let matchers = {
    PreToolUse: [],
    PostToolUse: [],
    PostToolUseFailure: [],
    PostToolBatch: [],
    PermissionDenied: [],
    Notification: [],
    UserPromptSubmit: [],
    UserPromptExpansion: [],
    SessionStart: [],
    SessionEnd: [],
    Stop: [],
    StopFailure: [],
    SubagentStart: [],
    SubagentStop: [],
    PreCompact: [],
    PostCompact: [],
    PreModelSwitch: [],
    PostModelSwitch: [],
    PermissionRequest: [],
    Setup: [],
    TeammateIdle: [],
    TaskCreated: [],
    TaskCompleted: [],
    Elicitation: [],
    ElicitationResult: [],
    ConfigChange: [],
    WorktreeCreate: [],
    WorktreeRemove: [],
    InstructionsLoaded: [],
    CwdChanged: [],
    FileChanged: [],
    DirectoryAdded: [],
    MessageDisplay: [],
  };
  let ordered = orderPluginsManagedFirst(plugins, managedIds);
  let nameOwner = new Map();
  let hooksLeftOut = [];
  let loadedWithHooks = new Set(
    ordered.filter((plugin) => plugin.modulePath !== undefined).map((plugin) => nfcLower(plugin.source)),
  );
  for (let plugin of ordered) {
    if (!plugin.hooksConfig) continue;
    let aliases = pluginNameAliases(plugin);
    let owner = firstMappedValue(nameOwner, aliases);
    if (owner !== undefined) {
      if (
        isHookSourceAllowed(plugin.source) &&
        !arePluginHooksHeld(plugin) &&
        Object.values(convertPluginHooksToMatchers(plugin)).some((list) => list.length > 0)
      )
        hooksLeftOut.push({
          type: "hooks-left-out-by-name",
          source: plugin.source,
          heldBy: owner,
        });
      logForDebugging(
        `Skipping duplicate hook registration for plugin "${plugin.name}" from ${plugin.source} - already registered from another source`,
      );
      continue;
    }
    for (let plugin_2 of aliases) nameOwner.set(plugin_2, plugin.source);
    logForDebugging(`Loading hooks from plugin: ${plugin.name}`);
    let pluginMatchers = convertPluginHooksToMatchers(plugin);
    for (let key of Object.keys(pluginMatchers)) {
      if (pluginMatchers[key].length > 0) loadedWithHooks.add(nfcLower(plugin.source));
      matchers[key].push(...pluginMatchers[key]);
    }
  }
  return {
    matchers,
    hooksLeftOut,
    loadedWithHooks,
  };
}
//@ chunk-5xgkngpb.js:4276299-4276724 facade-majority
/**
 * 在创建 worktree 前预先注册插件的 WorktreeCreate/WorktreeRemove 钩子（只读缓存加载插件、安全模式过滤），若期间钩子状态已变化或已换过一轮则放弃；正式注册轮会替换它们。
 */
async function registerPluginWorktreeHooks(storageV5, credentials) {
  let pluginRegistry = getPluginRegistry();
  let { enabled } = await readStablePolicy({
    read: () => loadAllPluginsCacheOnly(storageV5, credentials),
    reread: () => rereadPluginsCacheOnly(storageV5),
  });
  if (getPluginRegistry() !== pluginRegistry || pluginRegistry.hookSwapEpoch > 0) return;
  let { matchers } = loadPluginHooks_2(filterPluginsForSafeMode(enabled), getPolicyAllowedSet());
  replaceRegisteredPluginHooks({
    WorktreeCreate: matchers.WorktreeCreate,
    WorktreeRemove: matchers.WorktreeRemove,
  });
  logForDebugging(
    `Plugin hooks: registered ${matchers.WorktreeCreate.length} WorktreeCreate and ${matchers.WorktreeRemove.length} WorktreeRemove matcher(s) ahead of the worktree; the registration pass replaces them`,
  );
}
//@ chunk-5xgkngpb.js:4276724-4283358 facade-majority
/**
 * 注册插件 hooks 的主入口：cacheOnly 加载启用插件（安全模式只留内置），loadPluginHooks 汇总 matcher 写入会话的已注册 hooks，加载 hooks 模块（需工作区信任与 tengu_plugin_hooks_modules 开关），收集 hook-load-failed/path 错误。结果 Promise 缓存在全局 hookRegistration。
 */
async function loadPluginHooks(storageV5, credentials) {
  let pluginRegistry = getPluginRegistry();
  refreshModAdmission();
  if (pluginRegistry.hookModulesAwaitTrust && isProjectScopeTrustAccepted()) clearPluginHookCache();
  let isFirst = pluginRegistry.hookRegistration === undefined;
  let failedOurselves = false;
  let superseded = false;
  let unknownCause;
  let ranBlind = false;
  let previousRegistration;
  pluginRegistry.hookRegistration ??= (async () => {
    let modulesResult;
    let registration;
    let epoch = ++pluginRegistry.hookRegistrationEpoch;
    pluginRegistry.hookRegistrationOwed = false;
    ranBlind = policySettingsUnreadableSafe();
    let trustPending = !isProjectScopeTrustAccepted();
    pluginRegistry.hookModulesAwaitTrust = trustPending;
    let demoTolerant = trustPending && isDemoOrClaubbet();
    try {
      let flagSettled = isHooksModulesFlagSettled();
      let stablePolicy = await readStablePolicy({
        read: () => loadAllPluginsCacheOnly(storageV5, credentials),
        reread: () => rereadPluginsCacheOnly(storageV5),
      });
      let { disabled, errors } = stablePolicy;
      let plugins = filterPluginsForSafeMode(stablePolicy.enabled);
      registration = pluginRegistry.hookRegistration;
      let modulesRefused = hooksModulesRefusalReason() !== undefined;
      if (!modulesRefused)
        await loadLateHooksWhenFlagTurnsOn(plugins, () => {
          if (getPluginRegistry() === pluginRegistry && pluginRegistry.hookRegistrationEpoch === epoch) {
            clearPluginHookCache();
            loadPluginHooks(storageV5, credentials).catch(logError);
          }
        }).catch(logError);
      if (getPluginRegistry() !== pluginRegistry) return;
      let policyAllowedSet = getPolicyAllowedSet();
      let { matchers, hooksLeftOut, loadedWithHooks } = loadPluginHooks_2(plugins, policyAllowedSet);
      let pluginNames = new Set(plugins.map((plugin) => plugin.name));
      let filtered = errors.filter(
        (error) => error.type === "hook-load-failed" && pluginNames.has(error.plugin),
      );
      let filtered_2 = errors.filter(
        (error) =>
          (error.type === "path-traversal" || error.type === "path-not-found") &&
          error.component === "hooks" &&
          error.plugin !== undefined &&
          pluginNames.has(error.plugin),
      );
      let faultyIds = new Set([...filtered, ...filtered_2].flatMap(getPluginNameFromError));
      let enabledIds = new Set(plugins.map((plugin) => nfcLower(plugin.source)));
      let pluginsWithHooks = pluginRegistry.pluginsWithHooks;
      for (let id of enabledIds) if (loadedWithHooks.has(id) || faultyIds.has(id)) pluginsWithHooks.add(id);
      if (pluginRegistry.hookSwapEpoch > epoch) {
        logForDebugging("Plugin hooks: a newer registration pass already registered; keeping its hooks");
        for (let unlatchedAbsentManagedId of pluginRegistry.unlatchedAbsentManagedIds)
          if (pluginsWithHooks.has(unlatchedAbsentManagedId) && enabledIds.has(unlatchedAbsentManagedId)) {
            logForDebugging(
              `Plugin hooks: ${unlatchedAbsentManagedId} was seen with hooks by an earlier load but dropped in the registered one \u2014 hooks unknown`,
              {
                level: "warn",
              },
            );
            pluginRegistry.hooksUnknownCause = formatManagedPluginMissingMessage(unlatchedAbsentManagedId);
            break;
          }
        let hookRegistrationInFlight = pluginRegistry.hookRegistrationInFlight;
        if (hookRegistrationInFlight !== undefined && hookRegistrationInFlight !== previousRegistration)
          await hookRegistrationInFlight.catch(() => markHooksModulesLoadOwed(pluginRegistry));
        return;
      }
      pluginRegistry.hookSwapEpoch = epoch;
      replaceRegisteredPluginHooks(matchers);
      if (pluginRegistry.hookRegistrationEpoch === epoch) {
        for (let id of enabledIds)
          if (!loadedWithHooks.has(id) && !faultyIds.has(id)) pluginsWithHooks.delete(id);
      }
      installPluginToolsServer();
      resolveSeatedManagedPlugins(plugins);
      let managedIds = getVouchedPolicyPluginIds();
      let managedModules = filterManagedHookSources(managedIds, plugins);
      let noNonBuiltin = getHookPolicyAnswerState() === "failed" && !plugins.some(isNonBuiltinHooksModule);
      let isSetKnown = (flagSettled && isHooksModulesFlagSettled()) || noNonBuiltin;
      let memo = orderedPluginIdsMemoizer();
      let orderedModules = orderPluginsForHookLoad(
        orderPluginsManagedFirst(plugins, managedModules),
        managedModules,
        memo,
      );
      let admissionText = pluginRegistry.admissionText;
      let builtinsOnly =
        !modulesRefused && recordHooksModulesSwitchRead(pluginRegistry, plugins, managedModules);
      let skipOptions = modulesRefused
        ? undefined
        : {
            ...hookPolicySummaryState(),
            isManaged: (hookModule) => managedModules?.has(hookModule.source) === true || memo(hookModule),
            builtinsOnly,
            personsHeld: isPersonModulesHeldWithLog(pluginRegistry),
          };
      let autoGateOn = isAutoModeGateOpen() && areHooksModulesAllowed();
      let effectiveOptions =
        skipOptions !== undefined && autoGateOn
          ? {
              ...skipOptions,
              builtinsOnly: false,
              personsHeld: false,
            }
          : skipOptions;
      pluginRegistry.organizationAsk.isHeld =
        effectiveOptions !== undefined &&
        orderedModules.some(
          (hookModule) =>
            isNonBuiltinHooksModule(hookModule) &&
            !arePluginHooksHeld(hookModule) &&
            describeHooksModulesTurnedOff(effectiveOptions.isManaged(hookModule), effectiveOptions) ===
              MODS_POLICY_UNKNOWN_REASON,
        );
      let skipResult =
        skipOptions === undefined
          ? {
              chosen: logHooksModulesDisabled(orderedModules),
              leftOut: [],
            }
          : describeHooksModuleSkip(orderedModules, skipOptions);
      let chosen = skipResult.chosen;
      let leftOut = [...hooksLeftOut, ...skipResult.leftOut];
      if (leftOut.length > 0 || pluginRegistry.hooksLeftOutByName.length > 0) {
        pluginRegistry.hooksLeftOutByName = leftOut;
        pluginRegistry.hooksLeftOutByNameChanged.emit();
      }
      let isLoadAllowed = (hookModule) =>
        !trustPending || (demoTolerant && isBuiltinPluginId(hookModule.source));
      let filtered_3 = chosen.filter((hookModule) => !isLoadAllowed(hookModule));
      if (filtered_3.length > 0)
        logForDebugging(
          "hooks modules not loaded until workspace trust is accepted: " +
            filtered_3.map((hookModule) => hookModule.name).join(", "),
        );
      let filtered_4 = chosen.filter(isLoadAllowed);
      let readAt = WATCH_CLOCK.now();
      if (!trustPending || demoTolerant) {
        modulesResult = await loadHooksModules(
          chainOrder(filtered_4, managedIds, resolveManagedPluginOrder()),
          admissionText,
        ).then(
          () => {
            return;
          },
          (error) => {
            logError(toError(error));
            return {
              error,
            };
          },
        );
        if (builtinsOnly && modulesResult === undefined && pluginRegistry.hookSwapEpoch === epoch)
          markHooksModulesSwitchOff(pluginRegistry);
        if (!modulesRefused) {
          let isLoadFaultless =
            filtered_3.length === 0 && modulesResult === undefined && pluginRegistry.hookSwapEpoch === epoch;
          let outcome = {
            registry: pluginRegistry,
            isSetKnown,
            isLoadFaultless,
            unmet: hooksModulesLeftOutByName(plugins, filtered_4, managedIds, skipResult.leftOut),
            isDecided: hasHooksModulesAwaitingFlag(plugins, hookPolicySummaryState()),
          };
          settleManagedModulesLoad(outcome);
          if (!builtinsOnly) updateWakeBound(outcome);
        }
      }
      let watchesAllowed = !trustPending && !isSafeMode();
      startPluginDirWatches(watchesAllowed ? chosen : [], watchesAllowed ? [...plugins, ...disabled] : [], {
        readAt,
        isFaulted: modulesResult !== undefined,
      });
      if (watchesAllowed) pluginDirsOverride.get()?.();
      if (pluginRegistry.hookSwapEpoch === epoch)
        await writeAllTypeRoots(filtered_4, [...plugins, ...disabled]);
      let reduced = Object.values(matchers).reduce(
        (sum, matchers) => sum + matchers.reduce((acc, m) => acc + m.hooks.length, 0),
        0,
      );
      logForDebugging(`Registered ${reduced} hooks from ${plugins.length} plugins`);
      let managedNames = managedPluginNameSet();
      let managedSet =
        policyAllowedSet && managedNames
          ? new Set([...policyAllowedSet, ...managedNames])
          : (policyAllowedSet ?? managedNames);
      let loweredManaged = managedSet === null ? null : new Set([...managedSet].map(nfcLower));
      let marketplaces =
        managedSet === null
          ? null
          : new Set([...managedSet].map((id) => nfcLower(id.slice(id.lastIndexOf("@") + 1))));
      let isManagedId = (id) => loweredManaged !== null && loweredManaged.has(nfcLower(id));
      let isManagedError = (error) => {
        if (managedSet === null || marketplaces === null) return false;
        if ("pluginId" in error && error.pluginId && isManagedId(error.pluginId)) return true;
        if ("source" in error) {
          if (isManagedId(error.source)) return true;
          let marketplace = marketplaceOf(error.source);
          if (marketplace !== undefined) {
            let plugin = "plugin" in error ? error.plugin : undefined;
            let pluginName = plugin ?? ("manifestName" in error ? error.manifestName : undefined);
            if (pluginName !== undefined && isManagedId(`${pluginName}@${marketplace}`)) return true;
            if (plugin === undefined) {
              let attribution = "attribution" in error ? error.attribution : undefined;
              let marketplaceName = attribution?.marketplaceName;
              if (
                [...(loweredManaged ?? [])].some(
                  (managedId) =>
                    !enabledIds.has(managedId) &&
                    (managedId.endsWith(`@${marketplace}`) ||
                      (marketplaceName !== undefined && managedId.endsWith(`@${nfcLower(marketplaceName)}`))),
                )
              )
                return true;
              if (attribution !== undefined) return false;
            }
          }
        }
        if (getPluginNameFromError_2(error) !== undefined) return false;
        if ("marketplace" in error) return marketplaces.has(nfcLower(error.marketplace));
        return true;
      };
      let filtered_5 = errors.filter((error) => isMarketplaceLevelLoadError(error) && isManagedError(error));
      let policyBlocked = new Set(
        errors.flatMap((error) =>
          error.type === "marketplace-blocked-by-policy" && error.sourceUnverifiable !== true
            ? [nfcLower(error.source)]
            : [],
        ),
      );
      let isUnseen = (id) => !enabledIds.has(id) && !policyBlocked.has(id);
      let staleHookedId;
      for (let pluginsWithHook of pluginsWithHooks)
        if (isManagedId(pluginsWithHook) && isUnseen(pluginsWithHook)) {
          staleHookedId = pluginsWithHook;
          break;
        }
      let relevantError = filtered.find(isManagedError) ?? filtered_2.find(isManagedError);
      let reportedError = relevantError ?? filtered_5.find((error) => !isBenignLoadError(error));
      unknownCause =
        reportedError !== undefined
          ? `managed plugin "${getPluginNameFromError_2(reportedError) ?? reportedError.source}" ${reportedError === relevantError ? "loaded without its hooks" : "did not load"} (${pluginErrorText(reportedError)})`
          : staleHookedId !== undefined
            ? formatManagedPluginMissingMessage(staleHookedId)
            : undefined;
      if (pluginRegistry.hookSwapEpoch === epoch) {
        let absentIds = new Set();
        if (unknownCause === undefined && loweredManaged !== null) {
          for (let id of loweredManaged) if (isUnseen(id)) absentIds.add(id);
        }
        pluginRegistry.unlatchedAbsentManagedIds = absentIds;
      }
      let filtered_6 = filtered_5.filter(isBenignLoadError);
      let filtered_7 = filtered_5.filter((error) => !isBenignLoadError(error));
      if (filtered_6.length > 0) {
        let joined = normalizeCaseForComparison_2(filtered_6.map((error) => error.type)).join(", ");
        logForDebugging(
          `Plugin hooks: ${filtered_6.length} managed plugin(s) not materialized on this machine (${joined}: the marketplace is not registered here, its catalog is not loaded, or the plugin was never fetched) \u2014 any hooks those plugins deliver are absent this session`,
        );
      }
      if (filtered_7.length > 0) {
        let joined = normalizeCaseForComparison_2(filtered_7.map((error) => error.type)).join(", ");
        logForDebugging(
          `Plugin hooks: ${filtered_7.length} managed plugin load error(s) (${joined}) \u2014 any hooks those plugins deliver are absent this session`,
          {
            level: "warn",
          },
        );
      } else if (staleHookedId !== undefined)
        logForDebugging(
          "Plugin hooks: a managed plugin that registered hooks earlier this session did not load \u2014 hooks unknown",
          {
            level: "warn",
          },
        );
      if (filtered.length > 0)
        logFeatureBad("plugin_load_hooks", "plugin_hooks_file_load_failed", {
          hook_error_count: fromNumber(filtered.length),
          registered_hooks: fromNumber(reduced),
          plugin_count: fromNumber(plugins.length),
        });
      else if (filtered_2.length > 0)
        logFeatureBad("plugin_load_hooks", "plugin_hooks_path_invalid", {
          hook_error_count: fromNumber(filtered_2.length),
          registered_hooks: fromNumber(reduced),
        });
      else if (filtered_5.length > 0 || staleHookedId !== undefined)
        logFeatureSad("plugin_load_hooks", "managed_plugin_unloaded", {
          hook_error_count: fromNumber(filtered_5.length),
          registered_hooks: fromNumber(reduced),
        });
      else logFeatureOk("plugin_load_hooks");
    } catch (error) {
      logFeatureBad("plugin_load_hooks", "plugin_hooks_register_failed");
      throw error;
    }
    if (modulesResult !== undefined) {
      if (
        previousRegistration !== undefined &&
        registration === previousRegistration &&
        pluginRegistry.hookRegistration === registration
      ) {
        pluginRegistry.hookRegistration = undefined;
        superseded = true;
      } else if (pluginRegistry.hookRegistration === registration)
        pluginRegistry.hookRegistration = undefined;
      failedOurselves = true;
      throw modulesResult.error;
    }
  })();
  if (isFirst) {
    let hookRegistration = pluginRegistry.hookRegistration;
    previousRegistration = hookRegistration;
    pluginRegistry.hookRegistrationInFlight = hookRegistration;
    pluginRegistry.hookRegistrationsInFlight.add(hookRegistration);
    let onDone = () => {
      pluginRegistry.hookRegistrationsInFlight.delete(hookRegistration);
      pluginRegistry.hookRegistrationEnded.emit();
    };
    hookRegistration.then(onDone, onDone);
    pluginRegistry.hookRegistrationArgs = {
      storageV5,
      credentials,
    };
    let settleCause = (cause) => {
      if (
        pluginRegistry.hookRegistration === hookRegistration ||
        (pluginRegistry.hookRegistration === undefined && superseded)
      ) {
        let missingCause;
        for (let unlatchedAbsentManagedId of pluginRegistry.unlatchedAbsentManagedIds)
          if (pluginRegistry.pluginsWithHooks.has(unlatchedAbsentManagedId)) {
            missingCause = formatManagedPluginMissingMessage(unlatchedAbsentManagedId);
            break;
          }
        pluginRegistry.hooksUnknownCause = cause ?? missingCause;
        pluginRegistry.hookRegistrationRanBlind = ranBlind || policySettingsUnreadableSafe();
      } else if (pluginRegistry.hookRegistration === undefined && cause !== undefined)
        pluginRegistry.hooksUnknownCause = cause;
    };
    hookRegistration
      .then(
        () => settleCause(unknownCause),
        (error) => {
          if (failedOurselves) {
            settleCause(unknownCause);
            return;
          }
          settleCause(describePluginLoadFailure(error));
        },
      )
      .finally(() => {
        if (pluginRegistry.hookRegistrationInFlight === hookRegistration)
          pluginRegistry.hookRegistrationInFlight = undefined;
      });
  }
  await pluginRegistry.hookRegistration;
}
//@ chunk-5xgkngpb.js:4283358-4283491 facade-majority
/**
 * 若有被推迟（owed）的插件钩子注册，执行一次 loadPluginHooks，失败只记日志。
 */
async function startOwedPluginHookRegistration(storageV5, credentials) {
  if (!getPluginRegistry().hookRegistrationOwed) return;
  await loadPluginHooks(storageV5, credentials).catch((error) => {
    logForDebugging(`owed plugin hook registration: ${errorMessage(error)}`);
  });
}
//@ chunk-5xgkngpb.js:4283491-4283844 facade-majority
/**
 * hooks 注册结果不确定时重试（可清插件缓存后重新注册）。
 */
async function pluginHooksUnknownCause(retry) {
  let pluginRegistry = getPluginRegistry();
  await pluginRegistry.hookRegistrationInFlight?.catch(() => {});
  if (pluginRegistry.hooksUnknownCause === undefined || !areHooksEnabled()) return;
  if (retry) {
    pluginRegistry.hookRegistration = undefined;
    clearPluginCache("plugin hook registration retry");
    let hookRegistrationArgs = pluginRegistry.hookRegistrationArgs;
    await loadPluginHooks(hookRegistrationArgs?.storageV5, hookRegistrationArgs?.credentials).catch(() => {});
    await pluginRegistry.hookRegistrationInFlight?.catch(() => {});
  }
  return pluginRegistry.hooksUnknownCause;
}
//@ chunk-5xgkngpb.js:4283844-4283911 facade-majority
/**
 * 等待进行中的 hooks 注册完成（忽略错误）。
 */
function pendingPluginHookRegistration() {
  return getPluginRegistry().hookRegistrationInFlight?.catch(() => {});
}
//@ chunk-5xgkngpb.js:4283911-4283991 facade-majority
/**
 * 返回 hooks 注册的错误信息（成功为 undefined）。
 */
async function failedPluginHookRegistration() {
  return getPluginRegistry().hookRegistration?.then(
    () => {
      return;
    },
    (error) => errorMessage(error),
  );
}
//@ chunk-5xgkngpb.js:4283991-4284099 facade-majority
/**
 * hooks 注册是否仍在进行或结果未知。
 */
function pluginHooksMayBeUnregistered() {
  let pluginRegistry = getPluginRegistry();
  return (
    areHooksEnabled() &&
    (pluginRegistry.hookRegistrationInFlight !== undefined || pluginRegistry.hooksUnknownCause !== undefined)
  );
}
//@ chunk-5xgkngpb.js:4284099-4284143 facade-majority
/**
 * 清除缓存的 hooks 注册 Promise，下次调用会重新注册。
 */
function clearPluginHookCache() {
  getPluginRegistry().hookRegistration = undefined;
}
//@ chunk-5xgkngpb.js:4284143-4284268 facade-majority
/**
 * 工作区信任确认后，若有等待信任的钩子模块，重新加载插件钩子。
 */
function loadHooksModulesHeldForTrust(storageV5, credentials) {
  if (getPluginRegistry().hookModulesAwaitTrust && isProjectScopeTrustAccepted())
    loadPluginHooks(storageV5, credentials).catch((error) => {
      logForDebugging(`plugin hooks after workspace trust: ${errorMessage(error)}`);
    });
}
//@ chunk-5xgkngpb.js:4284268-4284634 facade-majority (2.1.88 match: pruneRemovedPluginHooks, 0.868)
/**
 * 插件被移除/禁用后，从已注册 hooks 与已加载 hooks 模块中删掉它们的条目。
 */
async function pruneRemovedPluginHooks(storageV5, credentials) {
  let pluginRegistry = getPluginRegistry();
  if (!getRegisteredHooks() && pluginRegistry.loadedModules.length === 0) return;
  let { enabled } = await loadAllPluginsCacheOnly(storageV5, credentials);
  if (getPluginRegistry() !== pluginRegistry) return;
  let enabledRoots = new Set(enabled.map((plugin) => plugin.path));
  await pruneHooksModules(new Set(enabled.map(marketplaceSource)));
  if (getPluginRegistry() !== pluginRegistry) return;
  let current = getRegisteredHooks();
  if (!current) return;
  let survivors = {};
  for (let [event, matchers] of Object.entries(current)) {
    let kept = matchers.filter((m) => "pluginRoot" in m && enabledRoots.has(m.pluginRoot));
    if (kept.length > 0) survivors[event] = kept;
  }
  replaceRegisteredPluginHooks(survivors);
}
//@ chunk-5xgkngpb.js:4284634-4284797 facade-majority
/**
 * 清理不再需要的插件钩子模块（hooks worker 模块）：保留已启用/已禁用插件及当前已加载模块对应的存储 id，其余 prune。
 */
async function standDownInstalledHooksModules() {
  let { enabled, disabled } = getBuiltinPlugins();
  await pruneHooksModules(
    new Set([
      ...[...enabled, ...disabled].map(marketplaceSource),
      ...getPluginRegistry()
        .loadedModules.map((loadedModule) => loadedModule.args.pluginStorageId)
        .filter(isBuiltinPluginId),
    ]),
  );
}
//@ chunk-5xgkngpb.js:4284797-4286010 facade-majority (2.1.88 match: setupPluginHookHotReload, 0.537)
/**
 * 订阅设置变化：插件相关设置或 hooks 模块开关变化时重置并重新 registerPluginHooks（热加载），仅注册一次。
 */
function setupPluginHookHotReload(storageV5, credentials) {
  watchPluginOptionChanges(refreshOptions);
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.hookHotReloadUnsubscribe) return;
  pluginRegistry.hookHotReloadSettingsSnapshot = managedHooksPolicyStamp();
  pluginRegistry.hookHotReloadTierSnapshot = jsonStringify(resolveManagedPluginOrder());
  let reload = () => {
    clearPluginHookCache();
    return loadPluginHooks(storageV5, credentials);
  };
  let tell = (source) => uiLog("hooks", source);
  if (!getIsNonInteractiveSession())
    pluginRegistry.hooksModulesSwitchUnwatch = watchRolloutSwitchChanges(
      () => void followHooksModulesRollout(reload, tell, standDownInstalledHooksModules),
    );
  (pluginRegistry.hookRegistrationInFlight ?? Promise.resolve())
    .catch(() => {
      return;
    })
    .then(() => followRolloutSwitchOnce(reload, tell, standDownInstalledHooksModules))
    .catch(logError);
  function reloadWithNotice() {
    loadPluginHooks(storageV5, credentials)
      .catch((error) => {
        logForDebugging(`Plugin hooks: reload failed: ${errorMessage(error)}`, {
          level: "error",
        });
      })
      .then(() => {
        if (!getIsNonInteractiveSession()) notifyModsRejudged(tell);
      })
      .catch(logError);
  }
  pluginRegistry.hookHotReloadUnsubscribe = settingsChangeDetector.subscribe((source) => {
    queueHookedMergeOnSettingsChange();
    let admissionRefreshed = pluginRegistry.admissionText !== null && refreshModAdmission();
    let tierStamp = jsonStringify(resolveManagedPluginOrder());
    let tierChanged = tierStamp !== pluginRegistry.hookHotReloadTierSnapshot;
    if (admissionRefreshed || source === "policySettings" || (source === "userSettings" && tierChanged)) {
      let newSnapshot = managedHooksPolicyStamp();
      if (!admissionRefreshed && newSnapshot === pluginRegistry.hookHotReloadSettingsSnapshot) {
        logForDebugging("Plugin hooks: skipping reload, plugin-affecting settings unchanged");
        return;
      }
      pluginRegistry.hookHotReloadSettingsSnapshot = newSnapshot;
      pluginRegistry.hookHotReloadTierSnapshot = tierStamp;
      logForDebugging("Plugin hooks: reloading due to plugin-affecting settings change");
      clearPluginCache("loadPluginHooks: plugin-affecting settings changed");
      clearPluginHookCache();
      reloadWithNotice();
    }
  });
  let hookHotReloadUnsubscribe = pluginRegistry.hookHotReloadUnsubscribe;
  let unsubscribe = subscribe_2_2(() => {
    queueHookedSettingsMerge("the loaded plugins changed");
  });
  pluginRegistry.hookHotReloadUnsubscribe = () => {
    hookHotReloadUnsubscribe();
    unsubscribe();
  };
  queueHookedSettingsMerge("the loaded plugins changed");
  if (pluginRegistry.admissionText !== null && refreshModAdmission()) {
    clearPluginHookCache();
    reloadWithNotice();
  }
}
//@ chunk-5xgkngpb.js:4286010-4286204 placement
function describePluginLoadFailure(error) {
  let message = `plugins could not be loaded (${errorMessage(error)})`;
  try {
    let unreadable = policySettingsUnreadableSafe();
    return unreadable || getPolicyAllowedSet() !== null || hasManagedPlugins()
      ? `${message}${unreadable ? ", nor could managed settings be read" : ""}`
      : undefined;
  } catch (error) {
    logError(toError(error));
    return message;
  }
}
//@ chunk-5xgkngpb.js:4286204-4286329 placement
function formatManagedPluginMissingMessage(pluginId) {
  return `managed plugin ${pluginId} registered hooks earlier this session and is missing from the latest plugin load`;
}
//@ chunk-5xgkngpb.js:4286329-4286551 placement (2.1.88 match: getPluginNameFromError, 0.842)
function getPluginNameFromError(error) {
  let names = [];
  if ("pluginId" in error && error.pluginId) names.push(nfcLower(error.pluginId));
  if ("source" in error) {
    names.push(nfcLower(error.source));
    let marketplace = marketplaceOf(error.source);
    if ("plugin" in error && error.plugin !== undefined && marketplace !== undefined)
      names.push(nfcLower(`${error.plugin}@${marketplace}`));
  }
  return names;
}
//@ chunk-5xgkngpb.js:4286551-4286935 placement
/**
 * 判断插件加载错误是否属于“预期内、无需提示”的类型：市场未找到（非注册表读失败）、被策略阻止、市场加载失败（非目录读失败）、未记录安装路径的缓存未命中。
 */
function isBenignLoadError(error) {
  switch (error.type) {
    case "marketplace-not-found":
      return error.registryReadFailed !== true && error.registrationHidden === undefined;
    case "marketplace-blocked-by-policy":
      return true;
    case "marketplace-load-failed":
      return error.catalogReadFailed !== true && error.untrustedReservedName !== true;
    case "plugin-cache-miss":
      return (
        error.installPath === NOT_RECORDED &&
        error.registryReadFailed !== true &&
        error.seedHasOtherVersion !== true
      );
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:4286935-4287179 placement
function isMarketplaceLevelLoadError(error) {
  return (
    pluginErrorSummary(error) ||
    (error.type === "path-not-found" && error.plugin === undefined) ||
    error.type === "marketplace-load-failed" ||
    error.type === "marketplace-not-found" ||
    error.type === "plugin-not-found" ||
    (error.type === "marketplace-blocked-by-policy" && error.sourceUnverifiable === true)
  );
}
export {
  isHookRegistrationPending,
  hasNonBuiltinPluginSurface,
  pruneRemovedPluginHooks,
  loadPluginHooks,
  isPolicyUnreadPastItsBounds,
  warnUnknownHooksJsonKeys,
  pendingPluginHookRegistration,
  pluginHooksUnknownCause,
  failedPluginHookRegistration,
  queueHookedSettingsMerge,
  clearPluginHookCache,
  hasTrustedOnlyBuiltinPlugin,
  pluginHooksMayBeUnregistered,
  getPluginAffectingSettingsSnapshot,
  trustedOnlyBuiltinPluginId,
  setupPluginHookHotReload,
  chainOrder,
  convertPluginHooksToMatchers,
  loadHooksModulesHeldForTrust,
  registerPluginWorktreeHooks,
  standDownInstalledHooksModules,
  startOwedPluginHookRegistration,
};
