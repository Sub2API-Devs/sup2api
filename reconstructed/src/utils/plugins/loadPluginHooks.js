/**
 * utils/plugins/loadPluginHooks.ts
 *
 * 加载插件钩子；判断函数钩子注册是否仍欠缺
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/loadPluginHooks.ts
 * pieces: chunk-czx62zen.js (1), chunk-e6aww6q8.js (44), chunk-pd0t5xas.js (5)
 * attribution: fingerprint 2, placement 16, facade-majority 15, layout 17
 */
import { identity as identity_2 } from "../identity.js";
import {
  truncateListItem,
  quotedListItem,
  formatFailureDetails_2,
  loadAllPluginsCacheOnly,
  rereadPluginsCacheOnly,
  clearPluginCache,
} from "./pluginLoader.js";
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import { plural, nfcLower } from "../stringUtils.js";
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
import { isBuiltinPluginId, getBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { providerRank } from "../../plugins/functionHooks/providerTiers.js";
import { pluginTier } from "../../plugins/functionHooks/dispatch/chain.js";
import { getPolicyAllowedSet } from "./pluginPolicy.js";
import { hookPluginLabel } from "../../plugins/functionHooks/hookDispatch.js";
import { pluginNameAliases, marketplaceOf, canonicalPluginId, pluginNamesEqual } from "./pluginIdentifier.js";
import {
  holdForRolloutFlagAtStartup,
  loadLateWhenFlagTurnsOn,
  flagValueSourceLabel,
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
import { AUTO_MODE_ENABLED_DEFAULT } from "../permissions/permissionSetup.js";
import { isSafeMode } from "../envUtils.js";
import {
  hooksModulesGateFromPayload,
  settleManagedModulesLoad,
  watchRolloutSwitchChanges,
  followRolloutSwitchOnce,
} from "./hooksModulesLoadGate.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import {
  isHookSourceAllowed,
  refreshModAdmission,
  MODS_POLICY_UNKNOWN_REASON,
  areHooksEnabled,
  notifyModsRejudged,
} from "../hooks.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  readStablePolicy,
  isDemoOrClaubbet,
  managedHooksPolicyStamp,
} from "../../plugins/functionHooks/policyGate.js";
import {
  replaceRegisteredPluginHooks,
  getRegisteredHooks,
  getIsNonInteractiveSession,
  getInlinePlugins,
  getInlinePluginsNoMcp,
  getInlinePluginUrls,
  getSyncedPluginDirs,
} from "../../bootstrap/state.js";
import { isProjectScopeTrustAccepted } from "../config.js";
import { logError } from "../log.js";
import {
  installPluginToolsServer,
  writeAllTypeRoots,
} from "../../plugins/functionHooks/toolRegisterServer.js";
import {
  resolveSeatedManagedPlugins,
  getVouchedPolicyPluginIds,
  resolveManagedPluginOrder,
  managedPluginNameSet,
  hasManagedPlugins,
  _,
  hasPluginDeclarations,
} from "./managedPlugins.js";
import {
  logHooksModulesDisabled,
  WATCH_CLOCK,
  startPluginDirWatches,
  watchPluginOptionChanges,
} from "../../plugins/functionHooks/devModsWatch.js";
import { toError, errorMessage } from "../errors.js";
import { getPluginNameFromError as getPluginNameFromError_2 } from "../../commands/plugin/PluginSettings.js";
import { pluginErrorText } from "../../types/plugin.js";
import { uniq } from "../collections.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromNumber } from "../../services/analytics/safeMetadata.js";
import { marketplaceSource } from "./pluginOptionsStorage.js";
import { jsonStringify } from "../slowOperations.js";
import { settingsChangeDetector } from "../settings/changeDetector.js";
import { subscribe_2 } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { NOT_RECORDED, pluginErrorSummary } from "./marketplaceNames.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { getHostState } from "../hostEnvironment.js";
import { enabledPluginIds } from "./pluginStartupCheck.js";
import { hasLink } from "../hasLink.js";
import {
  getVouchedAdminPolicyTier,
  getSettingsForSource,
  getAdminAuthoredPolicySettings,
  getRemotePolicyTierWithKind,
} from "../settings/settings.js";

//@ chunk-e6aww6q8.js:607082-607217 placement
var HOOKS_JSON_TOP_KEYS = new Set(["$schema", "description", "hooks", "modules", "surface"]);
var HOOK_MATCHER_KEYS = new Set(["matcher", "hooks"]);
var reportedHookKeyWarnings = identity_2(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:607217-607352 placement
function unknownMatcherKeys(e, n, r) {
  let s = `hooks.${truncateListItem(e)}[${r}]`;
  return (isPlainObject_5(n) ? Object.keys(n) : [])
    .filter((h) => !HOOK_MATCHER_KEYS.has(h))
    .map((h) => `${quotedListItem(h)} in ${s}`);
}
//@ chunk-e6aww6q8.js:607352-607462 placement
var unknownHookEntryKeys = (hooks) =>
  (isPlainObject_5(hooks) ? Object.entries(hooks) : []).flatMap(([n, r]) =>
    (Array.isArray(r) ? r : []).flatMap((s, h) => unknownMatcherKeys(n, s, h)),
  );
//@ chunk-e6aww6q8.js:607462-607773 placement
/**
 * 检查 hooks.json 顶层和各 matcher 条目的未知键；存在时按（插件, 路径, 消息）去重后记 warn 日志并调用 reportPluginProblem。
 */
function warnUnknownHooksJsonKeys(pluginName, hooksFilePath, r) {
  if (!isPlainObject_5(r)) return;
  let s = [
    ...Object.keys(r)
      .filter((key) => !HOOKS_JSON_TOP_KEYS.has(key))
      .map(quotedListItem),
    ...unknownHookEntryKeys(r.hooks),
  ];
  if (s.length === 0) return;
  let h = `hooks.json: unknown ${plural(s.length, "key")} ${formatFailureDetails_2(s)} ignored`;
  let y = `${pluginName}\x00${hooksFilePath}\x00${h}`;
  if (reportedHookKeyWarnings.has(y)) return;
  reportedHookKeyWarnings.add(y);
  logForDebugging(`Plugin ${pluginName}: ${h} (${hooksFilePath})`, {
    level: "warn",
  });
  reportPluginProblem(pluginName, h);
}
//@ chunk-e6aww6q8.js:4162230-4162375 placement
/**
 * 排队一次“带 hooks 的设置合并”广播，未在广播中时串到队列尾。
 */
function queueHookedSettingsMerge(e) {
  let n = commandSyncNameState();
  let hookedMerge = n.hookedMerge;
  if (hookedMerge.queuedFor === undefined && !hookedMerge.isAnnouncing) {
    hookedMerge.queuedFor = e;
    hookedMerge.pass = hookedMerge.pass.then(() => readMergedSettingsForPlugin(n, e));
  }
  return hookedMerge.pass;
}
//@ chunk-e6aww6q8.js:4162375-4162487 placement
function queueHookedMergeOnSettingsChange() {
  let hookedMerge = commandSyncNameState().hookedMerge;
  if (!hookedMerge.isAnnouncing) hookedMerge.unsettled = new Set();
  return queueHookedSettingsMerge("the settings changed");
}
//@ chunk-e6aww6q8.js:4162487-4163338 facade-majority = convertPluginHooksToMatchers (0.9)
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
  let r = arePluginHooksHeld(plugin);
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
          ...(r && {
            personal: true,
          }),
        });
  }
  return pluginMatchers;
}
//@ chunk-e6aww6q8.js:4163338-4163493 layout
function orderPluginsManagedFirst(e, n) {
  let r = (h) => n?.has(h.source) === true;
  let s = (h) => hasTrustedOnlyBuiltinPlugin(h.source);
  return [...e.filter(r), ...e.filter((h) => !r(h) && s(h)), ...e.filter((h) => !r(h) && !s(h))];
}
//@ chunk-e6aww6q8.js:4163493-4163666 layout
function orderPluginsForHookLoad(e, n, r) {
  let s = new Set(e.filter((y) => n?.has(y.source) === true || hasTrustedOnlyBuiltinPlugin(y.source)));
  let filtered = e.filter((y) => !s.has(y));
  return [...s, ...filtered.filter((y) => r(y)), ...filtered.filter((y) => !r(y))];
}
//@ chunk-e6aww6q8.js:4163666-4163751 layout
function orderedPluginIdsMemoizer() {
  let e = new Map();
  return (n) => {
    let r = e.get(n) ?? isManagedPluginVouched(n);
    e.set(n, r);
    return r;
  };
}
//@ chunk-e6aww6q8.js:4163751-4165246 facade-majority
/**
 * 按托管策略 prependPlugins/appendPlugins 调整插件 hooks 的顺序，并记录被遮蔽的插件。
 */
function chainOrder(e, n, r) {
  if (r.seat !== undefined) logForDebugging(r.seat);
  for (let y of r.append.filter((S) => r.prepend.includes(S)))
    logForDebugging(
      `managed plugin ${y} is named in both prependPlugins and appendPlugins; it is prepended`,
      {
        level: "warn",
      },
    );
  for (let y of r.shadowed) {
    if (inlineProblemsSeen.has(y)) continue;
    inlineProblemsSeen.add(y);
    logForDebugging(
      r.shadowedBy === "seat"
        ? `${y} in user settings ignored: your organization's plan seats ${r.outermost.join(", ")} here, so neither tier key is yours to set`
        : r.shadowedBy === "host"
          ? `${y} in user settings ignored: in a hosted session only an organization's settings place a mod above the user tier`
          : `${y} in user settings ignored: set by managed policy (this machine has managed settings, so both tier keys are the policy's)`,
    );
  }
  let s = {
    prependPlugins: {
      ids: r.prepend,
      from: r.from.prepend,
    },
    appendPlugins: {
      ids: r.append,
      from: r.from.append,
    },
  };
  for (let [key, { ids: S, from: w }] of Object.entries(s)) {
    if (w !== "none")
      logForDebugging(
        `${key} from ${w === "policy" ? "managed policy" : "user settings"}: ${S.join(", ") || "(none)"}`,
      );
    let L = new Set([...(n ?? [])].map(nfcLower));
    for (let G of S) {
      if (r.outermost.includes(G)) continue;
      let q = L.has(G);
      if (w === "user" && q) {
        logForDebugging(
          `${key} in user settings names ${G}, a managed plugin; ignored: a user key seats only the person's own plugins`,
          {
            level: "warn",
          },
        );
        continue;
      }
      if (!((w === "user" || q) && !isBuiltinPluginId(G) && e.some((Se) => nfcLower(Se.source) === G)))
        logForDebugging(
          `${key} names ${G}, which is not an enabled ${w === "user" ? "" : "managed "}plugin with a hooks module; skipped`,
        );
    }
  }
  let h = (y) => providerRank(y.source, n, r);
  return orderHooksModules(
    e.toSorted((y, S) => h(y) - h(S)),
    (y) => ({
      rank: h(y),
      tier: pluginTier(y.source, n, r),
    }),
  );
}
//@ chunk-e6aww6q8.js:4165246-4165326 layout
function firstMappedValue(e, n) {
  let found = n.find((s) => e.has(s));
  return found === undefined ? undefined : e.get(found);
}
//@ chunk-e6aww6q8.js:4165326-4166248 layout
function describeHooksModuleSkip(
  e,
  { isManaged, hooksDisabled, managedOnly, allDisabled, organization, builtinsOnly, personsHeld },
) {
  let L = [];
  let G = [];
  let q = new Map();
  let Z = personsHeld ? filterManagedHookSources(getPolicyAllowedSet(), e) : null;
  for (let Se of e) {
    let ke = pluginHooksRefusalReason(
      Se.source,
      {
        isHeld: arePluginHooksHeld(Se),
        isManaged: isManaged(Se),
        isPolicyEnabled: Z?.has(Se.source) === true,
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
    if (ke !== undefined) {
      if (Se.modulePath !== undefined) {
        logForDebugging(`hooks module ${hookPluginLabel(Se)} not loaded: ${ke}`);
        reportInlinePluginNotice(Se, `hooks module not loaded: ${ke}`);
      }
      continue;
    }
    let we = pluginNameAliases(Se);
    let Ee = firstMappedValue(q, we);
    for (let Ae of we) if (!q.has(Ae)) q.set(Ae, Se.source);
    if (Se.modulePath === undefined) continue;
    if (Ee !== undefined) {
      G.push({
        type: "hooks-module-left-out-by-name",
        source: Se.source,
        heldBy: Ee,
      });
      let Ae = "another plugin of that name loads first (a managed one, or an earlier source)";
      logForDebugging(`hooks module ${hookPluginLabel(Se)} not loaded: ${Ae}`);
      reportInlinePluginNotice(Se, `hooks module not loaded: ${Ae}`);
    } else L.push(Se);
  }
  return {
    chosen: L,
    leftOut: G,
  };
}
//@ chunk-e6aww6q8.js:4166248-4166297 layout
var isNonBuiltinHooksModule = (e) => e.modulePath !== undefined && !isBuiltinPluginId(e.source);
//@ chunk-e6aww6q8.js:4166297-4166455 layout
function hasHooksModulesAwaitingFlag(e, n) {
  let r = filterManagedHookSources(getPolicyAllowedSet(), e);
  return e.some(
    (s) =>
      isNonBuiltinHooksModule(s) &&
      describeHooksModulesTurnedOff(r?.has(s.source) === true, {
        ...n,
        builtinsOnly: false,
        personsHeld: false,
        organization: "unasked",
      }) === undefined,
  );
}
//@ chunk-e6aww6q8.js:4166455-4166570 layout
var hasLoadableOrgHooksModule = (e, n) =>
  e.some(
    (r) =>
      isNonBuiltinHooksModule(r) &&
      n?.has(r.source) === true &&
      describeHooksModulesTurnedOff(true, {
        ...hookPolicySummaryState(),
        builtinsOnly: false,
        personsHeld: false,
      }) === undefined,
  );
//@ chunk-e6aww6q8.js:4166570-4166628 layout
async function loadLateHooksWhenFlagTurnsOn(e, n) {
  if (hasHooksModulesAwaitingFlag(e, hookPolicySummaryState())) {
    await holdForRolloutFlagAtStartup();
    loadLateWhenFlagTurnsOn(n);
  }
}
//@ chunk-e6aww6q8.js:4166628-4166953 layout
function areInstalledHooksModulesHeld(e) {
  if (!areBuiltinOnlyHooksModules(e)) return false;
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
//@ chunk-e6aww6q8.js:4166953-4167518 layout
/**
 * 计算已安装 hooks 模块是否被挡住，并在注册表 hooksModulesSwitchRead 中记录：开关是否开、询问时间、是否欠载、 组织模块是否待加载、个人模块是否被排除。没有待处理项时清空该记录。
 */
function recordHooksModulesSwitchRead(pluginRegistry, n, r) {
  if (AUTO_MODE_ENABLED_DEFAULT()) markWakeBoundPassed();
  let s = areInstalledHooksModulesHeld(pluginRegistry);
  let h = hasHooksModulesAwaitingFlag(n, hookPolicySummaryState());
  let y = isAutoModeGateOpen();
  let S = y && pluginRegistry.hooksModulesWakeBound === "ahead";
  let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
  let askedAt = S ? 0 : hooksModulesSwitchRead?.askedAt || Date.now();
  let G = hooksModulesSwitchRead?.isOn === true;
  let q = s && areHooksModulesAllowed();
  let Z = hooksModulesSwitchRead?.isManagedPending === true || (q && hasLoadableOrgHooksModule(n, r));
  let Se =
    pluginRegistry.hooksModulesWakeBound !== "ahead" &&
    y &&
    areHooksModulesAllowed() &&
    AUTO_MODE_ENABLED_DEFAULT() &&
    getHookPolicyAnswerState() === "failed";
  let ke = filterManagedHookSources(getPolicyAllowedSet(), n);
  let any = n.some(
    (Ee) =>
      isNonBuiltinHooksModule(Ee) &&
      r?.has(Ee.source) !== true &&
      ke?.has(Ee.source) !== true &&
      describeHooksModulesTurnedOff(false, {
        ...hookPolicySummaryState(),
        builtinsOnly: false,
        personsHeld: false,
      }) === undefined,
  );
  pluginRegistry.hooksModulesSwitchRead =
    h || Z
      ? {
          isOn: !s || G,
          askedAt,
          isLoadOwed: y,
          isManagedPending: Z,
          isPersonsOut: Se && any,
        }
      : undefined;
  return s;
}
//@ chunk-e6aww6q8.js:4167518-4167619 layout
function markHooksModulesSwitchOff(pluginRegistry) {
  let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead !== undefined)
    pluginRegistry.hooksModulesSwitchRead = {
      ...hooksModulesSwitchRead,
      isOn: false,
    };
}
//@ chunk-e6aww6q8.js:4167619-4168043 layout
function hooksModulesLeftOutByName(e, n, vouchedPolicyPluginIds, leftOut) {
  if (!(
    !isSafeMode() &&
    describeHooksModulesTurnedOff(true, {
      ...hookPolicySummaryState(),
      builtinsOnly: false,
      personsHeld: false,
    }) === undefined
  ))
    return [];
  let y = new Set(n);
  let S = new Set([...(vouchedPolicyPluginIds ?? [])].map(nfcLower));
  let w = new Set(
    leftOut.flatMap((L) =>
      L.type === "hooks-module-left-out-by-name" && S.has(nfcLower(L.heldBy)) ? [L.source] : [],
    ),
  );
  return [...(vouchedPolicyPluginIds ?? [])]
    .filter((L) => !isBuiltinPluginId(L))
    .filter((L) => {
      let G = nfcLower(L);
      let filtered = e.filter((Se) => nfcLower(Se.source) === G);
      return !(
        filtered.length > 0 &&
        filtered.every((Se) => !isNonBuiltinHooksModule(Se) || y.has(Se) || w.has(Se.source))
      );
    });
}
//@ chunk-e6aww6q8.js:4168043-4168123 layout
function isHooksModulesFlagSettled() {
  let hookPolicyAnswerState = getHookPolicyAnswerState();
  let n = hooksModulesGateFromPayload() || AUTO_MODE_ENABLED_DEFAULT();
  return hookPolicyAnswerState === "answered" || (hookPolicyAnswerState === "failed" && n);
}
//@ chunk-e6aww6q8.js:4168123-4168169 facade-majority
/**
 * 判断组织策略是否已经超出等待期仍未读到（策略读取开启且状态不是 pending），用于决定插件钩子是否先按无策略处理。
 */
function isPolicyUnreadPastItsBounds() {
  return policySettingsUnreadable() && remoteSettingsAnswerState() !== "pending";
}
//@ chunk-e6aww6q8.js:4168169-4168276 layout
function markHooksModulesLoadOwed(pluginRegistry) {
  let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead !== undefined)
    pluginRegistry.hooksModulesSwitchRead = {
      ...hooksModulesSwitchRead,
      isLoadOwed: true,
    };
}
//@ chunk-e6aww6q8.js:4168276-4168497 layout
function isPersonModulesHeldWithLog(pluginRegistry) {
  let n = shouldHoldPersonalModuleHooks(pluginRegistry);
  if (n)
    logForDebugging(
      `a person's installed plugins' hooks modules not loaded: rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is not answered within this wake's wait; an organization's and built-in plugins load regardless`,
    );
  return n;
}
//@ chunk-e6aww6q8.js:4168497-4168694 layout
function filterPluginsForSafeMode(enabled) {
  if (!isSafeMode()) return [...enabled];
  logForDebugging(
    "Safe mode: installed plugins are disabled, none of their hooks or hooks modules load; built-in plugins load regardless",
  );
  return enabled.filter((n) => isBuiltinPluginId(n.source));
}
//@ chunk-e6aww6q8.js:4168694-4169945 fingerprint = loadPluginHooks (0.708)
/**
 * 汇总所有启用插件的 hooks：按事件把 matcher 合并（托管插件 prependPlugins/appendPlugins 排序），同一插件重复注册跳过，返回 {matchers, hooksLeftOut, loadedWithHooks}。
 */
function loadPluginHooks_2(e, policyAllowedSet) {
  let r = {
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
  let s = orderPluginsManagedFirst(e, policyAllowedSet);
  let h = new Map();
  let y = [];
  let S = new Set(s.filter((w) => w.modulePath !== undefined).map((w) => nfcLower(w.source)));
  for (let w of s) {
    if (!w.hooksConfig) continue;
    let L = pluginNameAliases(w);
    let G = firstMappedValue(h, L);
    if (G !== undefined) {
      if (
        isHookSourceAllowed(w.source) &&
        !arePluginHooksHeld(w) &&
        Object.values(convertPluginHooksToMatchers(w)).some((Z) => Z.length > 0)
      )
        y.push({
          type: "hooks-left-out-by-name",
          source: w.source,
          heldBy: G,
        });
      logForDebugging(
        `Skipping duplicate hook registration for plugin "${w.name}" from ${w.source} - already registered from another source`,
      );
      continue;
    }
    for (let plugin of L) h.set(plugin, w.source);
    logForDebugging(`Loading hooks from plugin: ${w.name}`);
    let pluginMatchers = convertPluginHooksToMatchers(w);
    for (let key of Object.keys(pluginMatchers)) {
      if (pluginMatchers[key].length > 0) S.add(nfcLower(w.source));
      r[key].push(...pluginMatchers[key]);
    }
  }
  return {
    matchers: r,
    hooksLeftOut: y,
    loadedWithHooks: S,
  };
}
//@ chunk-e6aww6q8.js:4169945-4170370 facade-majority
/**
 * 在创建 worktree 前预先注册插件的 WorktreeCreate/WorktreeRemove 钩子（只读缓存加载插件、安全模式过滤），若期间钩子状态已变化或已换过一轮则放弃；正式注册轮会替换它们。
 */
async function registerPluginWorktreeHooks(e, n) {
  let pluginRegistry = getPluginRegistry();
  let { enabled } = await readStablePolicy({
    read: () => loadAllPluginsCacheOnly(e, n),
    reread: () => rereadPluginsCacheOnly(e),
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
//@ chunk-e6aww6q8.js:4170370-4176991 facade-majority
/**
 * 注册插件 hooks 的主入口：cacheOnly 加载启用插件（安全模式只留内置），loadPluginHooks 汇总 matcher 写入会话的已注册 hooks，加载 hooks 模块（需工作区信任与 tengu_plugin_hooks_modules 开关），收集 hook-load-failed/path 错误。结果 Promise 缓存在全局 hookRegistration。
 */
async function loadPluginHooks(e, n) {
  let pluginRegistry = getPluginRegistry();
  refreshModAdmission();
  if (pluginRegistry.hookModulesAwaitTrust && isProjectScopeTrustAccepted()) clearPluginHookCache();
  let s = pluginRegistry.hookRegistration === undefined;
  let h = false;
  let y = false;
  let S;
  let w = false;
  let L;
  pluginRegistry.hookRegistration ??= (async () => {
    let G;
    let q;
    let Z = ++pluginRegistry.hookRegistrationEpoch;
    pluginRegistry.hookRegistrationOwed = false;
    w = policySettingsUnreadableSafe();
    let Se = !isProjectScopeTrustAccepted();
    pluginRegistry.hookModulesAwaitTrust = Se;
    let ke = Se && isDemoOrClaubbet();
    try {
      let we = isHooksModulesFlagSettled();
      let stablePolicy = await readStablePolicy({
        read: () => loadAllPluginsCacheOnly(e, n),
        reread: () => rereadPluginsCacheOnly(e),
      });
      let { disabled, errors } = stablePolicy;
      let Me = filterPluginsForSafeMode(stablePolicy.enabled);
      q = pluginRegistry.hookRegistration;
      let We = hooksModulesRefusalReason() !== undefined;
      if (!We)
        await loadLateHooksWhenFlagTurnsOn(Me, () => {
          if (getPluginRegistry() === pluginRegistry && pluginRegistry.hookRegistrationEpoch === Z) {
            clearPluginHookCache();
            loadPluginHooks(e, n).catch(logError);
          }
        }).catch(logError);
      if (getPluginRegistry() !== pluginRegistry) return;
      let policyAllowedSet = getPolicyAllowedSet();
      let { matchers, hooksLeftOut, loadedWithHooks } = loadPluginHooks_2(Me, policyAllowedSet);
      let pt = new Set(Me.map((Io) => Io.name));
      let filtered = errors.filter((error) => error.type === "hook-load-failed" && pt.has(error.plugin));
      let filtered_2 = errors.filter(
        (error) =>
          (error.type === "path-traversal" || error.type === "path-not-found") &&
          error.component === "hooks" &&
          error.plugin !== undefined &&
          pt.has(error.plugin),
      );
      let gt = new Set([...filtered, ...filtered_2].flatMap(getPluginNameFromError));
      let At = new Set(Me.map((Io) => nfcLower(Io.source)));
      let pluginsWithHooks = pluginRegistry.pluginsWithHooks;
      for (let Io of At) if (loadedWithHooks.has(Io) || gt.has(Io)) pluginsWithHooks.add(Io);
      if (pluginRegistry.hookSwapEpoch > Z) {
        logForDebugging("Plugin hooks: a newer registration pass already registered; keeping its hooks");
        for (let unlatchedAbsentManagedId of pluginRegistry.unlatchedAbsentManagedIds)
          if (pluginsWithHooks.has(unlatchedAbsentManagedId) && At.has(unlatchedAbsentManagedId)) {
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
        if (hookRegistrationInFlight !== undefined && hookRegistrationInFlight !== L)
          await hookRegistrationInFlight.catch(() => markHooksModulesLoadOwed(pluginRegistry));
        return;
      }
      pluginRegistry.hookSwapEpoch = Z;
      replaceRegisteredPluginHooks(matchers);
      if (pluginRegistry.hookRegistrationEpoch === Z) {
        for (let Io of At) if (!loadedWithHooks.has(Io) && !gt.has(Io)) pluginsWithHooks.delete(Io);
      }
      installPluginToolsServer();
      resolveSeatedManagedPlugins(Me);
      let vouchedPolicyPluginIds = getVouchedPolicyPluginIds();
      let qt = filterManagedHookSources(vouchedPolicyPluginIds, Me);
      let Zt = getHookPolicyAnswerState() === "failed" && !Me.some(isNonBuiltinHooksModule);
      let isSetKnown = (we && isHooksModulesFlagSettled()) || Zt;
      let pn = orderedPluginIdsMemoizer();
      let no = orderPluginsForHookLoad(orderPluginsManagedFirst(Me, qt), qt, pn);
      let admissionText = pluginRegistry.admissionText;
      let ho = !We && recordHooksModulesSwitchRead(pluginRegistry, Me, qt);
      let yn = We
        ? undefined
        : {
            ...hookPolicySummaryState(),
            isManaged: (Io) => qt?.has(Io.source) === true || pn(Io),
            builtinsOnly: ho,
            personsHeld: isPersonModulesHeldWithLog(pluginRegistry),
          };
      let Kn = isAutoModeGateOpen() && areHooksModulesAllowed();
      let Xn =
        yn !== undefined && Kn
          ? {
              ...yn,
              builtinsOnly: false,
              personsHeld: false,
            }
          : yn;
      pluginRegistry.organizationAsk.isHeld =
        Xn !== undefined &&
        no.some(
          (Io) =>
            isNonBuiltinHooksModule(Io) &&
            !arePluginHooksHeld(Io) &&
            describeHooksModulesTurnedOff(Xn.isManaged(Io), Xn) === MODS_POLICY_UNKNOWN_REASON,
        );
      let fo =
        yn === undefined
          ? {
              chosen: logHooksModulesDisabled(no),
              leftOut: [],
            }
          : describeHooksModuleSkip(no, yn);
      let chosen = fo.chosen;
      let bo = [...hooksLeftOut, ...fo.leftOut];
      if (bo.length > 0 || pluginRegistry.hooksLeftOutByName.length > 0) {
        pluginRegistry.hooksLeftOutByName = bo;
        pluginRegistry.hooksLeftOutByNameChanged.emit();
      }
      let vn = (Io) => !Se || (ke && isBuiltinPluginId(Io.source));
      let filtered_3 = chosen.filter((Io) => !vn(Io));
      if (filtered_3.length > 0)
        logForDebugging(
          "hooks modules not loaded until workspace trust is accepted: " +
            filtered_3.map((Io) => Io.name).join(", "),
        );
      let filtered_4 = chosen.filter(vn);
      let readAt = WATCH_CLOCK.now();
      if (!Se || ke) {
        G = await loadHooksModules(
          chainOrder(filtered_4, vouchedPolicyPluginIds, resolveManagedPluginOrder()),
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
        if (ho && G === undefined && pluginRegistry.hookSwapEpoch === Z)
          markHooksModulesSwitchOff(pluginRegistry);
        if (!We) {
          let isLoadFaultless =
            filtered_3.length === 0 && G === undefined && pluginRegistry.hookSwapEpoch === Z;
          let rs = {
            registry: pluginRegistry,
            isSetKnown,
            isLoadFaultless,
            unmet: hooksModulesLeftOutByName(Me, filtered_4, vouchedPolicyPluginIds, fo.leftOut),
            isDecided: hasHooksModulesAwaitingFlag(Me, hookPolicySummaryState()),
          };
          settleManagedModulesLoad(rs);
          if (!ho) updateWakeBound(rs);
        }
      }
      let un = !Se && !isSafeMode();
      startPluginDirWatches(un ? chosen : [], un ? [...Me, ...disabled] : [], {
        readAt,
        isFaulted: G !== undefined,
      });
      if (un) pluginDirsOverride.get()?.();
      if (pluginRegistry.hookSwapEpoch === Z) await writeAllTypeRoots(filtered_4, [...Me, ...disabled]);
      let reduced = Object.values(matchers).reduce(
        (sum, matchers) => sum + matchers.reduce((acc, m) => acc + m.hooks.length, 0),
        0,
      );
      logForDebugging(`Registered ${reduced} hooks from ${Me.length} plugins`);
      let $o = managedPluginNameSet();
      let yo = policyAllowedSet && $o ? new Set([...policyAllowedSet, ...$o]) : (policyAllowedSet ?? $o);
      let Ho = yo === null ? null : new Set([...yo].map(nfcLower));
      let rr = yo === null ? null : new Set([...yo].map((Io) => nfcLower(Io.slice(Io.lastIndexOf("@") + 1))));
      let br = (Io) => Ho !== null && Ho.has(nfcLower(Io));
      let Hr = (error) => {
        if (yo === null || rr === null) return false;
        if ("pluginId" in error && error.pluginId && br(error.pluginId)) return true;
        if ("source" in error) {
          if (br(error.source)) return true;
          let zo = marketplaceOf(error.source);
          if (zo !== undefined) {
            let plugin = "plugin" in error ? error.plugin : undefined;
            let Es = plugin ?? ("manifestName" in error ? error.manifestName : undefined);
            if (Es !== undefined && br(`${Es}@${zo}`)) return true;
            if (plugin === undefined) {
              let attribution = "attribution" in error ? error.attribution : undefined;
              let marketplaceName = attribution?.marketplaceName;
              if (
                [...(Ho ?? [])].some(
                  (fs) =>
                    !At.has(fs) &&
                    (fs.endsWith(`@${zo}`) ||
                      (marketplaceName !== undefined && fs.endsWith(`@${nfcLower(marketplaceName)}`))),
                )
              )
                return true;
              if (attribution !== undefined) return false;
            }
          }
        }
        if (getPluginNameFromError_2(error) !== undefined) return false;
        if ("marketplace" in error) return rr.has(nfcLower(error.marketplace));
        return true;
      };
      let filtered_5 = errors.filter((error) => isMarketplaceLevelLoadError(error) && Hr(error));
      let cs = new Set(
        errors.flatMap((error) =>
          error.type === "marketplace-blocked-by-policy" && error.sourceUnverifiable !== true
            ? [nfcLower(error.source)]
            : [],
        ),
      );
      let _r = (Io) => !At.has(Io) && !cs.has(Io);
      let Cr;
      for (let pluginsWithHook of pluginsWithHooks)
        if (br(pluginsWithHook) && _r(pluginsWithHook)) {
          Cr = pluginsWithHook;
          break;
        }
      let Vr = filtered.find(Hr) ?? filtered_2.find(Hr);
      let Oo = Vr ?? filtered_5.find((Io) => !isBenignLoadError(Io));
      S =
        Oo !== undefined
          ? `managed plugin "${getPluginNameFromError_2(Oo) ?? Oo.source}" ${Oo === Vr ? "loaded without its hooks" : "did not load"} (${pluginErrorText(Oo)})`
          : Cr !== undefined
            ? formatManagedPluginMissingMessage(Cr)
            : undefined;
      if (pluginRegistry.hookSwapEpoch === Z) {
        let Io = new Set();
        if (S === undefined && Ho !== null) {
          for (let zo of Ho) if (_r(zo)) Io.add(zo);
        }
        pluginRegistry.unlatchedAbsentManagedIds = Io;
      }
      let filtered_6 = filtered_5.filter(isBenignLoadError);
      let filtered_7 = filtered_5.filter((Io) => !isBenignLoadError(Io));
      if (filtered_6.length > 0) {
        let joined = uniq(filtered_6.map((zo) => zo.type)).join(", ");
        logForDebugging(
          `Plugin hooks: ${filtered_6.length} managed plugin(s) not materialized on this machine (${joined}: the marketplace is not registered here, its catalog is not loaded, or the plugin was never fetched) \u2014 any hooks those plugins deliver are absent this session`,
        );
      }
      if (filtered_7.length > 0) {
        let joined = uniq(filtered_7.map((zo) => zo.type)).join(", ");
        logForDebugging(
          `Plugin hooks: ${filtered_7.length} managed plugin load error(s) (${joined}) \u2014 any hooks those plugins deliver are absent this session`,
          {
            level: "warn",
          },
        );
      } else if (Cr !== undefined)
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
          plugin_count: fromNumber(Me.length),
        });
      else if (filtered_2.length > 0)
        logFeatureBad("plugin_load_hooks", "plugin_hooks_path_invalid", {
          hook_error_count: fromNumber(filtered_2.length),
          registered_hooks: fromNumber(reduced),
        });
      else if (filtered_5.length > 0 || Cr !== undefined)
        logFeatureSad("plugin_load_hooks", "managed_plugin_unloaded", {
          hook_error_count: fromNumber(filtered_5.length),
          registered_hooks: fromNumber(reduced),
        });
      else logFeatureOk("plugin_load_hooks");
    } catch (error) {
      logFeatureBad("plugin_load_hooks", "plugin_hooks_register_failed");
      throw error;
    }
    if (G !== undefined) {
      if (L !== undefined && q === L && pluginRegistry.hookRegistration === q) {
        pluginRegistry.hookRegistration = undefined;
        y = true;
      } else if (pluginRegistry.hookRegistration === q) pluginRegistry.hookRegistration = undefined;
      h = true;
      throw G.error;
    }
  })();
  if (s) {
    let hookRegistration = pluginRegistry.hookRegistration;
    L = hookRegistration;
    pluginRegistry.hookRegistrationInFlight = hookRegistration;
    pluginRegistry.hookRegistrationsInFlight.add(hookRegistration);
    let q = () => {
      pluginRegistry.hookRegistrationsInFlight.delete(hookRegistration);
      pluginRegistry.hookRegistrationEnded.emit();
    };
    hookRegistration.then(q, q);
    pluginRegistry.hookRegistrationArgs = {
      storageV5: e,
      credentials: n,
    };
    let Z = (Se) => {
      if (
        pluginRegistry.hookRegistration === hookRegistration ||
        (pluginRegistry.hookRegistration === undefined && y)
      ) {
        let we;
        for (let unlatchedAbsentManagedId of pluginRegistry.unlatchedAbsentManagedIds)
          if (pluginRegistry.pluginsWithHooks.has(unlatchedAbsentManagedId)) {
            we = formatManagedPluginMissingMessage(unlatchedAbsentManagedId);
            break;
          }
        pluginRegistry.hooksUnknownCause = Se ?? we;
        pluginRegistry.hookRegistrationRanBlind = w || policySettingsUnreadableSafe();
      } else if (pluginRegistry.hookRegistration === undefined && Se !== undefined)
        pluginRegistry.hooksUnknownCause = Se;
    };
    hookRegistration
      .then(
        () => Z(S),
        (error) => {
          if (h) {
            Z(S);
            return;
          }
          Z(describePluginLoadFailure(error));
        },
      )
      .finally(() => {
        if (pluginRegistry.hookRegistrationInFlight === hookRegistration)
          pluginRegistry.hookRegistrationInFlight = undefined;
      });
  }
  await pluginRegistry.hookRegistration;
}
//@ chunk-e6aww6q8.js:4176991-4177124 facade-majority
/**
 * 若有被推迟（owed）的插件钩子注册，执行一次 loadPluginHooks，失败只记日志。
 */
async function startOwedPluginHookRegistration(e, n) {
  if (!getPluginRegistry().hookRegistrationOwed) return;
  await loadPluginHooks(e, n).catch((error) => {
    logForDebugging(`owed plugin hook registration: ${errorMessage(error)}`);
  });
}
//@ chunk-e6aww6q8.js:4177124-4177477 facade-majority
/**
 * hooks 注册结果不确定时重试（可清插件缓存后重新注册）。
 */
async function pluginHooksUnknownCause(e) {
  let pluginRegistry = getPluginRegistry();
  await pluginRegistry.hookRegistrationInFlight?.catch(() => {});
  if (pluginRegistry.hooksUnknownCause === undefined || !areHooksEnabled()) return;
  if (e) {
    pluginRegistry.hookRegistration = undefined;
    clearPluginCache("plugin hook registration retry");
    let hookRegistrationArgs = pluginRegistry.hookRegistrationArgs;
    await loadPluginHooks(hookRegistrationArgs?.storageV5, hookRegistrationArgs?.credentials).catch(() => {});
    await pluginRegistry.hookRegistrationInFlight?.catch(() => {});
  }
  return pluginRegistry.hooksUnknownCause;
}
//@ chunk-e6aww6q8.js:4177477-4177544 facade-majority
/**
 * 等待进行中的 hooks 注册完成（忽略错误）。
 */
function pendingPluginHookRegistration() {
  return getPluginRegistry().hookRegistrationInFlight?.catch(() => {});
}
//@ chunk-e6aww6q8.js:4177544-4177624 facade-majority
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
//@ chunk-e6aww6q8.js:4177624-4177732 facade-majority
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
//@ chunk-e6aww6q8.js:4177732-4177776 facade-majority
/**
 * 清除缓存的 hooks 注册 Promise，下次调用会重新注册。
 */
function clearPluginHookCache() {
  getPluginRegistry().hookRegistration = undefined;
}
//@ chunk-e6aww6q8.js:4177776-4177901 facade-majority
/**
 * 工作区信任确认后，若有等待信任的钩子模块，重新加载插件钩子。
 */
function loadHooksModulesHeldForTrust(e, n) {
  if (getPluginRegistry().hookModulesAwaitTrust && isProjectScopeTrustAccepted())
    loadPluginHooks(e, n).catch((error) => {
      logForDebugging(`plugin hooks after workspace trust: ${errorMessage(error)}`);
    });
}
//@ chunk-e6aww6q8.js:4177901-4178267 facade-majority = pruneRemovedPluginHooks (0.868)
/**
 * 插件被移除/禁用后，从已注册 hooks 与已加载 hooks 模块中删掉它们的条目。
 */
async function pruneRemovedPluginHooks(e, n) {
  let pluginRegistry = getPluginRegistry();
  if (!getRegisteredHooks() && pluginRegistry.loadedModules.length === 0) return;
  let { enabled } = await loadAllPluginsCacheOnly(e, n);
  if (getPluginRegistry() !== pluginRegistry) return;
  let enabledRoots = new Set(enabled.map((w) => w.path));
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
//@ chunk-e6aww6q8.js:4178267-4178430 facade-majority
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
//@ chunk-e6aww6q8.js:4178430-4179640 facade-majority = setupPluginHookHotReload (0.537)
/**
 * 订阅设置变化：插件相关设置或 hooks 模块开关变化时重置并重新 registerPluginHooks（热加载），仅注册一次。
 */
function setupPluginHookHotReload(storageV5, n) {
  watchPluginOptionChanges(refreshOptions);
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.hookHotReloadUnsubscribe) return;
  pluginRegistry.hookHotReloadSettingsSnapshot = managedHooksPolicyStamp();
  pluginRegistry.hookHotReloadTierSnapshot = jsonStringify(resolveManagedPluginOrder());
  let s = () => {
    clearPluginHookCache();
    return loadPluginHooks(storageV5, n);
  };
  let h = (source) => uiLog("hooks", source);
  if (!getIsNonInteractiveSession())
    pluginRegistry.hooksModulesSwitchUnwatch = watchRolloutSwitchChanges(
      () => void followHooksModulesRollout(s, h, standDownInstalledHooksModules),
    );
  (pluginRegistry.hookRegistrationInFlight ?? Promise.resolve())
    .catch(() => {
      return;
    })
    .then(() => followRolloutSwitchOnce(s, h, standDownInstalledHooksModules))
    .catch(logError);
  function y() {
    loadPluginHooks(storageV5, n)
      .catch((error) => {
        logForDebugging(`Plugin hooks: reload failed: ${errorMessage(error)}`, {
          level: "error",
        });
      })
      .then(() => {
        if (!getIsNonInteractiveSession()) notifyModsRejudged(h);
      })
      .catch(logError);
  }
  pluginRegistry.hookHotReloadUnsubscribe = settingsChangeDetector.subscribe((G) => {
    queueHookedMergeOnSettingsChange();
    let q = pluginRegistry.admissionText !== null && refreshModAdmission();
    let Z = jsonStringify(resolveManagedPluginOrder());
    let Se = Z !== pluginRegistry.hookHotReloadTierSnapshot;
    if (q || G === "policySettings" || (G === "userSettings" && Se)) {
      let newSnapshot = managedHooksPolicyStamp();
      if (!q && newSnapshot === pluginRegistry.hookHotReloadSettingsSnapshot) {
        logForDebugging("Plugin hooks: skipping reload, plugin-affecting settings unchanged");
        return;
      }
      pluginRegistry.hookHotReloadSettingsSnapshot = newSnapshot;
      pluginRegistry.hookHotReloadTierSnapshot = Z;
      logForDebugging("Plugin hooks: reloading due to plugin-affecting settings change");
      clearPluginCache("loadPluginHooks: plugin-affecting settings changed");
      clearPluginHookCache();
      y();
    }
  });
  let hookHotReloadUnsubscribe = pluginRegistry.hookHotReloadUnsubscribe;
  let w = subscribe_2(() => {
    queueHookedSettingsMerge("the loaded plugins changed");
  });
  pluginRegistry.hookHotReloadUnsubscribe = () => {
    hookHotReloadUnsubscribe();
    w();
  };
  queueHookedSettingsMerge("the loaded plugins changed");
  if (pluginRegistry.admissionText !== null && refreshModAdmission()) {
    clearPluginHookCache();
    y();
  }
}
//@ chunk-e6aww6q8.js:4179640-4179834 placement
function describePluginLoadFailure(error) {
  let n = `plugins could not be loaded (${errorMessage(error)})`;
  try {
    let r = policySettingsUnreadableSafe();
    return r || getPolicyAllowedSet() !== null || hasManagedPlugins()
      ? `${n}${r ? ", nor could managed settings be read" : ""}`
      : undefined;
  } catch (error) {
    logError(toError(error));
    return n;
  }
}
//@ chunk-e6aww6q8.js:4179834-4179959 placement
function formatManagedPluginMissingMessage(unlatchedAbsentManagedId) {
  return `managed plugin ${unlatchedAbsentManagedId} registered hooks earlier this session and is missing from the latest plugin load`;
}
//@ chunk-e6aww6q8.js:4179959-4180181 placement = getPluginNameFromError (0.841)
function getPluginNameFromError(error) {
  let n = [];
  if ("pluginId" in error && error.pluginId) n.push(nfcLower(error.pluginId));
  if ("source" in error) {
    n.push(nfcLower(error.source));
    let r = marketplaceOf(error.source);
    if ("plugin" in error && error.plugin !== undefined && r !== undefined)
      n.push(nfcLower(`${error.plugin}@${r}`));
  }
  return n;
}
//@ chunk-e6aww6q8.js:4180181-4180565 placement
/**
 * 判断插件加载错误是否属于“预期内、无需提示”的类型：市场未找到（非注册表读失败）、被策略阻止、市场加载失败（非目录读失败）、未记录安装路径的缓存未命中。
 */
function isBenignLoadError(e) {
  switch (e.type) {
    case "marketplace-not-found":
      return e.registryReadFailed !== true && e.registrationHidden === undefined;
    case "marketplace-blocked-by-policy":
      return true;
    case "marketplace-load-failed":
      return e.catalogReadFailed !== true && e.untrustedReservedName !== true;
    case "plugin-cache-miss":
      return (
        e.installPath === NOT_RECORDED && e.registryReadFailed !== true && e.seedHasOtherVersion !== true
      );
    default:
      return false;
  }
}
//@ chunk-e6aww6q8.js:4180565-4180809 placement
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
//@ chunk-pd0t5xas.js:809-868 placement
function policySettingsUnreadableSafe() {
  try {
    return policySettingsUnreadable();
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-pd0t5xas.js:868-1057 placement
/**
 * 内置插件只能由受信设置启用时返回其规范 id。
 */
function trustedOnlyBuiltinPluginId(e) {
  if (!isBuiltinPluginId(e)) return;
  let sliced = canonicalPluginId(e).slice(0, -`@${BUILTIN}`.length);
  for (let [o, r] of getHostState().builtinPlugins)
    if (pluginNamesEqual(o, sliced))
      return r.enabledFromTrustedSettingsOnly === true ? `${o}@${BUILTIN}` : undefined;
  return;
}
//@ chunk-pd0t5xas.js:1057-1085 placement
/**
 * hasTrustedOnlyBuiltinPlugin：该插件是否只能由受信设置启用。
 */
var hasTrustedOnlyBuiltinPlugin = (e) => trustedOnlyBuiltinPluginId(e) !== undefined;
//@ chunk-pd0t5xas.js:3923-4164 placement
/**
 * 是否存在任何非内置插件（启用、带钩子、已加载模块、托管、内联、同步）。
 */
function hasNonBuiltinPluginSurface() {
  try {
    let pluginRegistry = getPluginRegistry();
    return (
      enabledPluginIds().some((o) => !isBuiltinPluginId(o)) ||
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
//@ chunk-pd0t5xas.js:4164-4368 placement
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
//@ chunk-czx62zen.js:13462-14027 fingerprint = getPluginAffectingSettingsSnapshot (0.609)
/**
 * 计算影响插件加载的设置指纹（enabledPlugins、extraKnownMarketplaces、策略等），用于判断缓存的插件加载结果是否过期。
 */
function getPluginAffectingSettingsSnapshot() {
  let merged = getVouchedAdminPolicyTier();
  let n = _(merged);
  let o = hasPluginDeclarations(n);
  let enables = o ? merged : getSettingsForSource("policySettings");
  let adminAuthoredPolicySettings = getAdminAuthoredPolicySettings();
  if (getRemotePolicyTierWithKind().servedSnapshot)
    return {
      enables,
      names: adminAuthoredPolicySettings,
    };
  if (o)
    return {
      enables,
      names: merged,
    };
  let a = new Map();
  let c = new Set();
  for (let l of n) {
    let filtered = Object.entries(l.extraKnownMarketplaces ?? {}).filter(([key]) => !c.has(nfcLower(key)));
    for (let [i, d] of filtered) a.set(i, d);
    for (let [i] of filtered) c.add(nfcLower(i));
  }
  let u = c.size > 0 || n.some((l) => l.strictKnownMarketplaces !== undefined);
  return {
    enables,
    names: u
      ? {
          extraKnownMarketplaces: Object.fromEntries(a),
          ...(merged?.strictKnownMarketplaces !== undefined && {
            strictKnownMarketplaces: merged.strictKnownMarketplaces,
          }),
        }
      : adminAuthoredPolicySettings,
  };
}
export {
  isHookRegistrationPending,
  hasNonBuiltinPluginSurface,
  loadPluginHooks,
  hasTrustedOnlyBuiltinPlugin,
  trustedOnlyBuiltinPluginId,
  chainOrder,
  queueHookedSettingsMerge,
  warnUnknownHooksJsonKeys,
  pruneRemovedPluginHooks,
  getPluginAffectingSettingsSnapshot,
  convertPluginHooksToMatchers,
  pluginHooksMayBeUnregistered,
  pendingPluginHookRegistration,
  pluginHooksUnknownCause,
  failedPluginHookRegistration,
  clearPluginHookCache,
  setupPluginHookHotReload,
  isPolicyUnreadPastItsBounds,
};
