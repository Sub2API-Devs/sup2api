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
import { ge } from "../identity.js";
import {
  rUe,
  zG,
  formatFailureDetails_2,
  loadAllPluginsCacheOnly,
  rereadPluginsCacheOnly,
  clearPluginCache,
} from "./pluginLoader.js";
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { plural, nfcLower } from "../stringUtils.js";
import { logForDebugging } from "../debug.js";
import {
  reportPluginProblem,
  pluginDirsOverride,
  uiLog,
} from "../../plugins/functionHooks/hooksWorkerClient.js";
import { is } from "../settings/commandSyncNames.js";
import { readMergedSettingsForPlugin } from "../../plugins/functionHooks/settingsReadApi.js";
import { arePluginHooksHeld } from "../permissions/permissionsLoader.js";
import {
  iWe,
  F0,
  pluginHooksRefusalReason,
  describeHooksModulesTurnedOff,
  ZP,
  oWe,
  getHookPolicyAnswerState,
  remoteSettingsAnswerState,
  sWe,
} from "../hooks/hookPolicyHold.js";
import {
  kFt,
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
  gFi,
  markWakeBoundPassed,
  BF,
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
  D4o,
  settleManagedModulesLoad,
  watchRolloutSwitchChanges,
  followRolloutSwitchOnce,
} from "./hooksModulesLoadGate.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import { Klr, refreshModAdmission, MODS_POLICY_UNKNOWN_REASON, oae, notifyModsRejudged } from "../hooks.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { tdt, JKe, k6 } from "../../plugins/functionHooks/policyGate.js";
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
import { zps, writeAllTypeRoots } from "../../plugins/functionHooks/toolRegisterServer.js";
import {
  resolveSeatedManagedPlugins,
  getVouchedPolicyPluginIds,
  resolveManagedPluginOrder,
  Xmi,
  hasManagedPlugins,
  _,
  ne,
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
var HOOKS_JSON_TOP_KEYS = new Set(["$schema", "description", "hooks", "modules", "surface"]),
  HOOK_MATCHER_KEYS = new Set(["matcher", "hooks"]),
  reportedHookKeyWarnings = ge(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:607217-607352 placement
function unknownMatcherKeys(e, n, r) {
  let s = `hooks.${rUe(e)}[${r}]`;
  return (isPlainObject_4(n) ? Object.keys(n) : [])
    .filter((h) => !HOOK_MATCHER_KEYS.has(h))
    .map((h) => `${zG(h)} in ${s}`);
}
//@ chunk-e6aww6q8.js:607352-607462 placement
var unknownHookEntryKeys = (e) =>
  (isPlainObject_4(e) ? Object.entries(e) : []).flatMap(([n, r]) =>
    (Array.isArray(r) ? r : []).flatMap((s, h) => unknownMatcherKeys(n, s, h)),
  );
/**
 * 检查 hooks.json 顶层和各 matcher 条目的未知键；存在时按（插件, 路径, 消息）去重后记 warn 日志并调用 reportPluginProblem。
 */
//@ chunk-e6aww6q8.js:607462-607773 placement
function warnUnknownHooksJsonKeys(e, n, r) {
  if (!isPlainObject_4(r)) return;
  let s = [
    ...Object.keys(r)
      .filter((S) => !HOOKS_JSON_TOP_KEYS.has(S))
      .map(zG),
    ...unknownHookEntryKeys(r.hooks),
  ];
  if (s.length === 0) return;
  let h = `hooks.json: unknown ${plural(s.length, "key")} ${formatFailureDetails_2(s)} ignored`,
    y = `${e}\x00${n}\x00${h}`;
  if (reportedHookKeyWarnings.has(y)) return;
  (reportedHookKeyWarnings.add(y),
    logForDebugging(`Plugin ${e}: ${h} (${n})`, { level: "warn" }),
    reportPluginProblem(e, h));
}
/**
 * 排队一次“带 hooks 的设置合并”广播，未在广播中时串到队列尾。
 */
//@ chunk-e6aww6q8.js:4162230-4162375 placement
function queueHookedSettingsMerge(e) {
  let n = is(),
    hookedMerge = n.hookedMerge;
  if (hookedMerge.queuedFor === void 0 && !hookedMerge.isAnnouncing)
    ((hookedMerge.queuedFor = e),
      (hookedMerge.pass = hookedMerge.pass.then(() => readMergedSettingsForPlugin(n, e))));
  return hookedMerge.pass;
}
//@ chunk-e6aww6q8.js:4162375-4162487 placement
function queueHookedMergeOnSettingsChange() {
  let hookedMerge = is().hookedMerge;
  if (!hookedMerge.isAnnouncing) hookedMerge.unsettled = new Set();
  return queueHookedSettingsMerge("the settings changed");
}
/**
 * 把一个插件的 hooksConfig 转成 按事件名分组的 matcher 列表（每个 matcher 附带 pluginRoot、pluginId 等来源信息）。
 */
//@ chunk-e6aww6q8.js:4162487-4163338 facade-majority = convertPluginHooksToMatchers (0.9)
function convertPluginHooksToMatchers(plugin) {
  let n = {
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
  if (!plugin.hooksConfig) return n;
  let r = arePluginHooksHeld(plugin);
  for (let [s, h] of Object.entries(plugin.hooksConfig)) {
    let hookEvent = s;
    if (!n[hookEvent]) continue;
    for (let matcher of h)
      if (matcher.hooks.length > 0)
        n[hookEvent].push({
          matcher: matcher.matcher,
          hooks: matcher.hooks,
          pluginRoot: plugin.path,
          pluginName: plugin.name,
          pluginId: plugin.source,
          ...(r && { personal: !0 }),
        });
  }
  return n;
}
//@ chunk-e6aww6q8.js:4163338-4163493 layout
function orderPluginsManagedFirst(e, n) {
  let r = (h) => n?.has(h.source) === !0,
    s = (h) => Wq(h.source);
  return [...e.filter(r), ...e.filter((h) => !r(h) && s(h)), ...e.filter((h) => !r(h) && !s(h))];
}
//@ chunk-e6aww6q8.js:4163493-4163666 layout
function orderPluginsForHookLoad(e, n, r) {
  let s = new Set(e.filter((y) => n?.has(y.source) === !0 || Wq(y.source))),
    filtered = e.filter((y) => !s.has(y));
  return [...s, ...filtered.filter((y) => r(y)), ...filtered.filter((y) => !r(y))];
}
//@ chunk-e6aww6q8.js:4163666-4163751 layout
function nms() {
  let e = new Map();
  return (n) => {
    let r = e.get(n) ?? iWe(n);
    return (e.set(n, r), r);
  };
}
/**
 * 按托管策略 prependPlugins/appendPlugins 调整插件 hooks 的顺序，并记录被遮蔽的插件。
 */
//@ chunk-e6aww6q8.js:4163751-4165246 facade-majority
function chainOrder(e, n, r) {
  if (r.seat !== void 0) logForDebugging(r.seat);
  for (let y of r.append.filter((S) => r.prepend.includes(S)))
    logForDebugging(
      `managed plugin ${y} is named in both prependPlugins and appendPlugins; it is prepended`,
      { level: "warn" },
    );
  for (let y of r.shadowed) {
    if (kFt.has(y)) continue;
    (kFt.add(y),
      logForDebugging(
        r.shadowedBy === "seat"
          ? `${y} in user settings ignored: your organization's plan seats ${r.outermost.join(", ")} here, so neither tier key is yours to set`
          : r.shadowedBy === "host"
            ? `${y} in user settings ignored: in a hosted session only an organization's settings place a mod above the user tier`
            : `${y} in user settings ignored: set by managed policy (this machine has managed settings, so both tier keys are the policy's)`,
      ));
  }
  let s = {
    prependPlugins: { ids: r.prepend, from: r.from.prepend },
    appendPlugins: { ids: r.append, from: r.from.append },
  };
  for (let [y, { ids: S, from: w }] of Object.entries(s)) {
    if (w !== "none")
      logForDebugging(
        `${y} from ${w === "policy" ? "managed policy" : "user settings"}: ${S.join(", ") || "(none)"}`,
      );
    let L = new Set([...(n ?? [])].map(nfcLower));
    for (let G of S) {
      if (r.outermost.includes(G)) continue;
      let q = L.has(G);
      if (w === "user" && q) {
        logForDebugging(
          `${y} in user settings names ${G}, a managed plugin; ignored: a user key seats only the person's own plugins`,
          { level: "warn" },
        );
        continue;
      }
      if (!((w === "user" || q) && !isBuiltinPluginId(G) && e.some((Se) => nfcLower(Se.source) === G)))
        logForDebugging(
          `${y} names ${G}, which is not an enabled ${w === "user" ? "" : "managed "}plugin with a hooks module; skipped`,
        );
    }
  }
  let h = (y) => providerRank(y.source, n, r);
  return orderHooksModules(
    e.toSorted((y, S) => h(y) - h(S)),
    (y) => ({ rank: h(y), tier: pluginTier(y.source, n, r) }),
  );
}
//@ chunk-e6aww6q8.js:4165246-4165326 layout
function firstMappedValue(e, n) {
  let found = n.find((s) => e.has(s));
  return found === void 0 ? void 0 : e.get(found);
}
//@ chunk-e6aww6q8.js:4165326-4166248 layout
function describeHooksModuleSkip(
  e,
  {
    isManaged: isManaged,
    hooksDisabled: hooksDisabled,
    managedOnly: managedOnly,
    allDisabled: allDisabled,
    organization: organization,
    builtinsOnly: builtinsOnly,
    personsHeld: personsHeld,
  },
) {
  let L = [],
    G = [],
    q = new Map(),
    Z = personsHeld ? F0(getPolicyAllowedSet(), e) : null;
  for (let Se of e) {
    let ke = pluginHooksRefusalReason(
      Se.source,
      { isHeld: arePluginHooksHeld(Se), isManaged: isManaged(Se), isPolicyEnabled: Z?.has(Se.source) === !0 },
      {
        hooksDisabled: hooksDisabled,
        managedOnly: managedOnly,
        allDisabled: allDisabled,
        organization: organization,
        builtinsOnly: builtinsOnly,
        personsHeld: personsHeld,
      },
    );
    if (ke !== void 0) {
      if (Se.modulePath !== void 0)
        (logForDebugging(`hooks module ${hookPluginLabel(Se)} not loaded: ${ke}`),
          reportInlinePluginNotice(Se, `hooks module not loaded: ${ke}`));
      continue;
    }
    let we = pluginNameAliases(Se),
      Ee = firstMappedValue(q, we);
    for (let Ae of we) if (!q.has(Ae)) q.set(Ae, Se.source);
    if (Se.modulePath === void 0) continue;
    if (Ee !== void 0) {
      G.push({ type: "hooks-module-left-out-by-name", source: Se.source, heldBy: Ee });
      let Ae = "another plugin of that name loads first (a managed one, or an earlier source)";
      (logForDebugging(`hooks module ${hookPluginLabel(Se)} not loaded: ${Ae}`),
        reportInlinePluginNotice(Se, `hooks module not loaded: ${Ae}`));
    } else L.push(Se);
  }
  return { chosen: L, leftOut: G };
}
//@ chunk-e6aww6q8.js:4166248-4166297 layout
var isNonBuiltinHooksModule = (e) => e.modulePath !== void 0 && !isBuiltinPluginId(e.source);
//@ chunk-e6aww6q8.js:4166297-4166455 layout
function hasHooksModulesAwaitingFlag(e, n) {
  let r = F0(getPolicyAllowedSet(), e);
  return e.some(
    (s) =>
      isNonBuiltinHooksModule(s) &&
      describeHooksModulesTurnedOff(r?.has(s.source) === !0, {
        ...n,
        builtinsOnly: !1,
        personsHeld: !1,
        organization: "unasked",
      }) === void 0,
  );
}
//@ chunk-e6aww6q8.js:4166455-4166570 layout
var hasLoadableOrgHooksModule = (e, n) =>
  e.some(
    (r) =>
      isNonBuiltinHooksModule(r) &&
      n?.has(r.source) === !0 &&
      describeHooksModulesTurnedOff(!0, { ...ZP(), builtinsOnly: !1, personsHeld: !1 }) === void 0,
  );
//@ chunk-e6aww6q8.js:4166570-4166628 layout
async function sms(e, n) {
  if (hasHooksModulesAwaitingFlag(e, ZP())) (await holdForRolloutFlagAtStartup(), loadLateWhenFlagTurnsOn(n));
}
//@ chunk-e6aww6q8.js:4166628-4166953 layout
function areInstalledHooksModulesHeld(e) {
  if (!oWe(e)) return !1;
  if (areHooksModulesAllowed())
    return (
      logForDebugging(
        `installed plugins' hooks modules not loaded: rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is not answered yet in this wake; built-in plugins load regardless`,
      ),
      !0
    );
  return (
    logForDebugging(
      `installed plugins' hooks modules not loaded: rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is off, ` +
        gFi() +
        "; built-in plugins load regardless",
    ),
    !0
  );
}
/**
 * 计算已安装 hooks 模块是否被挡住，并在注册表 hooksModulesSwitchRead 中记录：开关是否开、询问时间、是否欠载、 组织模块是否待加载、个人模块是否被排除。没有待处理项时清空该记录。
 */
//@ chunk-e6aww6q8.js:4166953-4167518 layout
function recordHooksModulesSwitchRead(e, n, r) {
  if (AUTO_MODE_ENABLED_DEFAULT()) markWakeBoundPassed();
  let s = areInstalledHooksModulesHeld(e),
    h = hasHooksModulesAwaitingFlag(n, ZP()),
    y = BF(),
    S = y && e.hooksModulesWakeBound === "ahead",
    hooksModulesSwitchRead = e.hooksModulesSwitchRead,
    L = S ? 0 : hooksModulesSwitchRead?.askedAt || Date.now(),
    G = hooksModulesSwitchRead?.isOn === !0,
    q = s && areHooksModulesAllowed(),
    Z = hooksModulesSwitchRead?.isManagedPending === !0 || (q && hasLoadableOrgHooksModule(n, r)),
    Se =
      e.hooksModulesWakeBound !== "ahead" &&
      y &&
      areHooksModulesAllowed() &&
      AUTO_MODE_ENABLED_DEFAULT() &&
      getHookPolicyAnswerState() === "failed",
    ke = F0(getPolicyAllowedSet(), n),
    any = n.some(
      (Ee) =>
        isNonBuiltinHooksModule(Ee) &&
        r?.has(Ee.source) !== !0 &&
        ke?.has(Ee.source) !== !0 &&
        describeHooksModulesTurnedOff(!1, { ...ZP(), builtinsOnly: !1, personsHeld: !1 }) === void 0,
    );
  return (
    (e.hooksModulesSwitchRead =
      h || Z
        ? { isOn: !s || G, askedAt: L, isLoadOwed: y, isManagedPending: Z, isPersonsOut: Se && any }
        : void 0),
    s
  );
}
//@ chunk-e6aww6q8.js:4167518-4167619 layout
function markHooksModulesSwitchOff(e) {
  let hooksModulesSwitchRead = e.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead !== void 0) e.hooksModulesSwitchRead = { ...hooksModulesSwitchRead, isOn: !1 };
}
//@ chunk-e6aww6q8.js:4167619-4168043 layout
function hooksModulesLeftOutByName(e, n, r, s) {
  if (!(
    !isSafeMode() &&
    describeHooksModulesTurnedOff(!0, { ...ZP(), builtinsOnly: !1, personsHeld: !1 }) === void 0
  ))
    return [];
  let y = new Set(n),
    S = new Set([...(r ?? [])].map(nfcLower)),
    w = new Set(
      s.flatMap((L) =>
        L.type === "hooks-module-left-out-by-name" && S.has(nfcLower(L.heldBy)) ? [L.source] : [],
      ),
    );
  return [...(r ?? [])]
    .filter((L) => !isBuiltinPluginId(L))
    .filter((L) => {
      let G = nfcLower(L),
        filtered = e.filter((Se) => nfcLower(Se.source) === G);
      return !(
        filtered.length > 0 &&
        filtered.every((Se) => !isNonBuiltinHooksModule(Se) || y.has(Se) || w.has(Se.source))
      );
    });
}
//@ chunk-e6aww6q8.js:4168043-4168123 layout
function isHooksModulesFlagSettled() {
  let e = getHookPolicyAnswerState(),
    n = D4o() || AUTO_MODE_ENABLED_DEFAULT();
  return e === "answered" || (e === "failed" && n);
}
/**
 * 判断组织策略是否已经超出等待期仍未读到（策略读取开启且状态不是 pending），用于决定插件钩子是否先按无策略处理。
 */
//@ chunk-e6aww6q8.js:4168123-4168169 facade-majority
function isPolicyUnreadPastItsBounds() {
  return policySettingsUnreadable() && remoteSettingsAnswerState() !== "pending";
}
//@ chunk-e6aww6q8.js:4168169-4168276 layout
function markHooksModulesLoadOwed(e) {
  let hooksModulesSwitchRead = e.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead !== void 0)
    e.hooksModulesSwitchRead = { ...hooksModulesSwitchRead, isLoadOwed: !0 };
}
//@ chunk-e6aww6q8.js:4168276-4168497 layout
function isPersonModulesHeldWithLog(e) {
  let n = sWe(e);
  if (n)
    logForDebugging(
      `a person's installed plugins' hooks modules not loaded: rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is not answered within this wake's wait; an organization's and built-in plugins load regardless`,
    );
  return n;
}
//@ chunk-e6aww6q8.js:4168497-4168694 layout
function filterPluginsForSafeMode(e) {
  if (!isSafeMode()) return [...e];
  return (
    logForDebugging(
      "Safe mode: installed plugins are disabled, none of their hooks or hooks modules load; built-in plugins load regardless",
    ),
    e.filter((n) => isBuiltinPluginId(n.source))
  );
}
/**
 * 汇总所有启用插件的 hooks：按事件把 matcher 合并（托管插件 prependPlugins/appendPlugins 排序），同一插件重复注册跳过，返回 {matchers, hooksLeftOut, loadedWithHooks}。
 */
//@ chunk-e6aww6q8.js:4168694-4169945 fingerprint = loadPluginHooks (0.708)
function loadPluginHooks_2(e, n) {
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
    },
    s = orderPluginsManagedFirst(e, n),
    h = new Map(),
    y = [],
    S = new Set(s.filter((w) => w.modulePath !== void 0).map((w) => nfcLower(w.source)));
  for (let w of s) {
    if (!w.hooksConfig) continue;
    let L = pluginNameAliases(w),
      G = firstMappedValue(h, L);
    if (G !== void 0) {
      if (
        Klr(w.source) &&
        !arePluginHooksHeld(w) &&
        Object.values(convertPluginHooksToMatchers(w)).some((Z) => Z.length > 0)
      )
        y.push({ type: "hooks-left-out-by-name", source: w.source, heldBy: G });
      logForDebugging(
        `Skipping duplicate hook registration for plugin "${w.name}" from ${w.source} - already registered from another source`,
      );
      continue;
    }
    for (let plugin of L) h.set(plugin, w.source);
    logForDebugging(`Loading hooks from plugin: ${w.name}`);
    let pluginMatchers = convertPluginHooksToMatchers(w);
    for (let Z of Object.keys(pluginMatchers)) {
      if (pluginMatchers[Z].length > 0) S.add(nfcLower(w.source));
      r[Z].push(...pluginMatchers[Z]);
    }
  }
  return { matchers: r, hooksLeftOut: y, loadedWithHooks: S };
}
/**
 * 在创建 worktree 前预先注册插件的 WorktreeCreate/WorktreeRemove 钩子（只读缓存加载插件、安全模式过滤），若期间钩子状态已变化或已换过一轮则放弃；正式注册轮会替换它们。
 */
//@ chunk-e6aww6q8.js:4169945-4170370 facade-majority
async function registerPluginWorktreeHooks(e, n) {
  let r = getPluginRegistry(),
    { enabled: enabled } = await tdt({
      read: () => loadAllPluginsCacheOnly(e, n),
      reread: () => rereadPluginsCacheOnly(e),
    });
  if (getPluginRegistry() !== r || r.hookSwapEpoch > 0) return;
  let { matchers: matchers } = loadPluginHooks_2(filterPluginsForSafeMode(enabled), getPolicyAllowedSet());
  (replaceRegisteredPluginHooks({
    WorktreeCreate: matchers.WorktreeCreate,
    WorktreeRemove: matchers.WorktreeRemove,
  }),
    logForDebugging(
      `Plugin hooks: registered ${matchers.WorktreeCreate.length} WorktreeCreate and ${matchers.WorktreeRemove.length} WorktreeRemove matcher(s) ahead of the worktree; the registration pass replaces them`,
    ));
}
/**
 * 注册插件 hooks 的主入口：cacheOnly 加载启用插件（安全模式只留内置），loadPluginHooks 汇总 matcher 写入会话的已注册 hooks，加载 hooks 模块（需工作区信任与 tengu_plugin_hooks_modules 开关），收集 hook-load-failed/path 错误。结果 Promise 缓存在全局 hookRegistration。
 */
//@ chunk-e6aww6q8.js:4170370-4176991 facade-majority
async function loadPluginHooks(e, n) {
  let r = getPluginRegistry();
  if ((refreshModAdmission(), r.hookModulesAwaitTrust && isProjectScopeTrustAccepted()))
    clearPluginHookCache();
  let s = r.hookRegistration === void 0,
    h = !1,
    y = !1,
    S,
    w = !1,
    L;
  if (
    ((r.hookRegistration ??= (async () => {
      let G,
        q,
        Z = ++r.hookRegistrationEpoch;
      ((r.hookRegistrationOwed = !1), (w = Ibn()));
      let Se = !isProjectScopeTrustAccepted();
      r.hookModulesAwaitTrust = Se;
      let ke = Se && JKe();
      try {
        let we = isHooksModulesFlagSettled(),
          Ee = await tdt({
            read: () => loadAllPluginsCacheOnly(e, n),
            reread: () => rereadPluginsCacheOnly(e),
          }),
          { disabled: disabled, errors: errors } = Ee,
          Me = filterPluginsForSafeMode(Ee.enabled);
        q = r.hookRegistration;
        let We = hooksModulesRefusalReason() !== void 0;
        if (!We)
          await sms(Me, () => {
            if (getPluginRegistry() === r && r.hookRegistrationEpoch === Z)
              (clearPluginHookCache(), loadPluginHooks(e, n).catch(logError));
          }).catch(logError);
        if (getPluginRegistry() !== r) return;
        let ze = getPolicyAllowedSet(),
          {
            matchers: matchers,
            hooksLeftOut: hooksLeftOut,
            loadedWithHooks: loadedWithHooks,
          } = loadPluginHooks_2(Me, ze),
          pt = new Set(Me.map((Io) => Io.name)),
          filtered = errors.filter((Io) => Io.type === "hook-load-failed" && pt.has(Io.plugin)),
          filtered_2 = errors.filter(
            (Io) =>
              (Io.type === "path-traversal" || Io.type === "path-not-found") &&
              Io.component === "hooks" &&
              Io.plugin !== void 0 &&
              pt.has(Io.plugin),
          ),
          gt = new Set([...filtered, ...filtered_2].flatMap(getPluginNameFromError)),
          At = new Set(Me.map((Io) => nfcLower(Io.source))),
          pluginsWithHooks = r.pluginsWithHooks;
        for (let Io of At) if (loadedWithHooks.has(Io) || gt.has(Io)) pluginsWithHooks.add(Io);
        if (r.hookSwapEpoch > Z) {
          logForDebugging("Plugin hooks: a newer registration pass already registered; keeping its hooks");
          for (let unlatchedAbsentManagedId of r.unlatchedAbsentManagedIds)
            if (pluginsWithHooks.has(unlatchedAbsentManagedId) && At.has(unlatchedAbsentManagedId)) {
              (logForDebugging(
                `Plugin hooks: ${unlatchedAbsentManagedId} was seen with hooks by an earlier load but dropped in the registered one \u2014 hooks unknown`,
                { level: "warn" },
              ),
                (r.hooksUnknownCause = formatManagedPluginMissingMessage(unlatchedAbsentManagedId)));
              break;
            }
          let hookRegistrationInFlight = r.hookRegistrationInFlight;
          if (hookRegistrationInFlight !== void 0 && hookRegistrationInFlight !== L)
            await hookRegistrationInFlight.catch(() => markHooksModulesLoadOwed(r));
          return;
        }
        if (((r.hookSwapEpoch = Z), replaceRegisteredPluginHooks(matchers), r.hookRegistrationEpoch === Z)) {
          for (let Io of At) if (!loadedWithHooks.has(Io) && !gt.has(Io)) pluginsWithHooks.delete(Io);
        }
        (zps(), resolveSeatedManagedPlugins(Me));
        let Yt = getVouchedPolicyPluginIds(),
          qt = F0(Yt, Me),
          Zt = getHookPolicyAnswerState() === "failed" && !Me.some(isNonBuiltinHooksModule),
          rn = (we && isHooksModulesFlagSettled()) || Zt,
          pn = nms(),
          no = orderPluginsForHookLoad(orderPluginsManagedFirst(Me, qt), qt, pn),
          admissionText = r.admissionText,
          ho = !We && recordHooksModulesSwitchRead(r, Me, qt),
          yn = We
            ? void 0
            : {
                ...ZP(),
                isManaged: (Io) => qt?.has(Io.source) === !0 || pn(Io),
                builtinsOnly: ho,
                personsHeld: isPersonModulesHeldWithLog(r),
              },
          Kn = BF() && areHooksModulesAllowed(),
          Xn = yn !== void 0 && Kn ? { ...yn, builtinsOnly: !1, personsHeld: !1 } : yn;
        r.organizationAsk.isHeld =
          Xn !== void 0 &&
          no.some(
            (Io) =>
              isNonBuiltinHooksModule(Io) &&
              !arePluginHooksHeld(Io) &&
              describeHooksModulesTurnedOff(Xn.isManaged(Io), Xn) === MODS_POLICY_UNKNOWN_REASON,
          );
        let fo =
            yn === void 0
              ? { chosen: logHooksModulesDisabled(no), leftOut: [] }
              : describeHooksModuleSkip(no, yn),
          chosen = fo.chosen,
          bo = [...hooksLeftOut, ...fo.leftOut];
        if (bo.length > 0 || r.hooksLeftOutByName.length > 0)
          ((r.hooksLeftOutByName = bo), r.hooksLeftOutByNameChanged.emit());
        let vn = (Io) => !Se || (ke && isBuiltinPluginId(Io.source)),
          filtered_3 = chosen.filter((Io) => !vn(Io));
        if (filtered_3.length > 0)
          logForDebugging(
            "hooks modules not loaded until workspace trust is accepted: " +
              filtered_3.map((Io) => Io.name).join(", "),
          );
        let filtered_4 = chosen.filter(vn),
          now = WATCH_CLOCK.now();
        if (!Se || ke) {
          if (
            ((G = await loadHooksModules(
              chainOrder(filtered_4, Yt, resolveManagedPluginOrder()),
              admissionText,
            ).then(
              () => {
                return;
              },
              (zo) => (logError(toError(zo)), { error: zo }),
            )),
            ho && G === void 0 && r.hookSwapEpoch === Z)
          )
            markHooksModulesSwitchOff(r);
          if (!We) {
            let zo = filtered_3.length === 0 && G === void 0 && r.hookSwapEpoch === Z,
              rs = {
                registry: r,
                isSetKnown: rn,
                isLoadFaultless: zo,
                unmet: hooksModulesLeftOutByName(Me, filtered_4, Yt, fo.leftOut),
                isDecided: hasHooksModulesAwaitingFlag(Me, ZP()),
              };
            if ((settleManagedModulesLoad(rs), !ho)) updateWakeBound(rs);
          }
        }
        let un = !Se && !isSafeMode();
        if (
          (startPluginDirWatches(un ? chosen : [], un ? [...Me, ...disabled] : [], {
            readAt: now,
            isFaulted: G !== void 0,
          }),
          un)
        )
          pluginDirsOverride.get()?.();
        if (r.hookSwapEpoch === Z) await writeAllTypeRoots(filtered_4, [...Me, ...disabled]);
        let reduced = Object.values(matchers).reduce(
          (Io, zo) => Io + zo.reduce((rs, Es) => rs + Es.hooks.length, 0),
          0,
        );
        logForDebugging(`Registered ${reduced} hooks from ${Me.length} plugins`);
        let $o = Xmi(),
          yo = ze && $o ? new Set([...ze, ...$o]) : (ze ?? $o),
          Ho = yo === null ? null : new Set([...yo].map(nfcLower)),
          rr = yo === null ? null : new Set([...yo].map((Io) => nfcLower(Io.slice(Io.lastIndexOf("@") + 1)))),
          br = (Io) => Ho !== null && Ho.has(nfcLower(Io)),
          Hr = (Io) => {
            if (yo === null || rr === null) return !1;
            if ("pluginId" in Io && Io.pluginId && br(Io.pluginId)) return !0;
            if ("source" in Io) {
              if (br(Io.source)) return !0;
              let zo = marketplaceOf(Io.source);
              if (zo !== void 0) {
                let rs = "plugin" in Io ? Io.plugin : void 0,
                  Es = rs ?? ("manifestName" in Io ? Io.manifestName : void 0);
                if (Es !== void 0 && br(`${Es}@${zo}`)) return !0;
                if (rs === void 0) {
                  let Nr = "attribution" in Io ? Io.attribution : void 0,
                    Is = Nr?.marketplaceName;
                  if (
                    [...(Ho ?? [])].some(
                      (fs) =>
                        !At.has(fs) &&
                        (fs.endsWith(`@${zo}`) || (Is !== void 0 && fs.endsWith(`@${nfcLower(Is)}`))),
                    )
                  )
                    return !0;
                  if (Nr !== void 0) return !1;
                }
              }
            }
            if (getPluginNameFromError_2(Io) !== void 0) return !1;
            if ("marketplace" in Io) return rr.has(nfcLower(Io.marketplace));
            return !0;
          },
          filtered_5 = errors.filter((Io) => isMarketplaceLevelLoadError(Io) && Hr(Io)),
          cs = new Set(
            errors.flatMap((Io) =>
              Io.type === "marketplace-blocked-by-policy" && Io.sourceUnverifiable !== !0
                ? [nfcLower(Io.source)]
                : [],
            ),
          ),
          _r = (Io) => !At.has(Io) && !cs.has(Io),
          Cr;
        for (let Io of pluginsWithHooks)
          if (br(Io) && _r(Io)) {
            Cr = Io;
            break;
          }
        let Vr = filtered.find(Hr) ?? filtered_2.find(Hr),
          Oo = Vr ?? filtered_5.find((Io) => !isBenignLoadError(Io));
        if (
          ((S =
            Oo !== void 0
              ? `managed plugin "${getPluginNameFromError_2(Oo) ?? Oo.source}" ${Oo === Vr ? "loaded without its hooks" : "did not load"} (${pluginErrorText(Oo)})`
              : Cr !== void 0
                ? formatManagedPluginMissingMessage(Cr)
                : void 0),
          r.hookSwapEpoch === Z)
        ) {
          let Io = new Set();
          if (S === void 0 && Ho !== null) {
            for (let zo of Ho) if (_r(zo)) Io.add(zo);
          }
          r.unlatchedAbsentManagedIds = Io;
        }
        let filtered_6 = filtered_5.filter(isBenignLoadError),
          filtered_7 = filtered_5.filter((Io) => !isBenignLoadError(Io));
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
            { level: "warn" },
          );
        } else if (Cr !== void 0)
          logForDebugging(
            "Plugin hooks: a managed plugin that registered hooks earlier this session did not load \u2014 hooks unknown",
            { level: "warn" },
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
        else if (filtered_5.length > 0 || Cr !== void 0)
          logFeatureSad("plugin_load_hooks", "managed_plugin_unloaded", {
            hook_error_count: fromNumber(filtered_5.length),
            registered_hooks: fromNumber(reduced),
          });
        else logFeatureOk("plugin_load_hooks");
      } catch (error) {
        throw (logFeatureBad("plugin_load_hooks", "plugin_hooks_register_failed"), error);
      }
      if (G !== void 0) {
        if (L !== void 0 && q === L && r.hookRegistration === q) ((r.hookRegistration = void 0), (y = !0));
        else if (r.hookRegistration === q) r.hookRegistration = void 0;
        throw ((h = !0), G.error);
      }
    })()),
    s)
  ) {
    let hookRegistration = r.hookRegistration;
    ((L = hookRegistration),
      (r.hookRegistrationInFlight = hookRegistration),
      r.hookRegistrationsInFlight.add(hookRegistration));
    let q = () => {
      (r.hookRegistrationsInFlight.delete(hookRegistration), r.hookRegistrationEnded.emit());
    };
    (hookRegistration.then(q, q), (r.hookRegistrationArgs = { storageV5: e, credentials: n }));
    let Z = (Se) => {
      if (r.hookRegistration === hookRegistration || (r.hookRegistration === void 0 && y)) {
        let we;
        for (let unlatchedAbsentManagedId of r.unlatchedAbsentManagedIds)
          if (r.pluginsWithHooks.has(unlatchedAbsentManagedId)) {
            we = formatManagedPluginMissingMessage(unlatchedAbsentManagedId);
            break;
          }
        ((r.hooksUnknownCause = Se ?? we), (r.hookRegistrationRanBlind = w || Ibn()));
      } else if (r.hookRegistration === void 0 && Se !== void 0) r.hooksUnknownCause = Se;
    };
    hookRegistration
      .then(
        () => Z(S),
        (Se) => {
          if (h) {
            Z(S);
            return;
          }
          Z(describePluginLoadFailure(Se));
        },
      )
      .finally(() => {
        if (r.hookRegistrationInFlight === hookRegistration) r.hookRegistrationInFlight = void 0;
      });
  }
  await r.hookRegistration;
}
/**
 * 若有被推迟（owed）的插件钩子注册，执行一次 loadPluginHooks，失败只记日志。
 */
//@ chunk-e6aww6q8.js:4176991-4177124 facade-majority
async function startOwedPluginHookRegistration(e, n) {
  if (!getPluginRegistry().hookRegistrationOwed) return;
  await loadPluginHooks(e, n).catch((r) => {
    logForDebugging(`owed plugin hook registration: ${errorMessage(r)}`);
  });
}
/**
 * hooks 注册结果不确定时重试（可清插件缓存后重新注册）。
 */
//@ chunk-e6aww6q8.js:4177124-4177477 facade-majority
async function pluginHooksUnknownCause(e) {
  let n = getPluginRegistry();
  if ((await n.hookRegistrationInFlight?.catch(() => {}), n.hooksUnknownCause === void 0 || !oae())) return;
  if (e) {
    ((n.hookRegistration = void 0), clearPluginCache("plugin hook registration retry"));
    let hookRegistrationArgs = n.hookRegistrationArgs;
    (await loadPluginHooks(hookRegistrationArgs?.storageV5, hookRegistrationArgs?.credentials).catch(
      () => {},
    ),
      await n.hookRegistrationInFlight?.catch(() => {}));
  }
  return n.hooksUnknownCause;
}
/**
 * 等待进行中的 hooks 注册完成（忽略错误）。
 */
//@ chunk-e6aww6q8.js:4177477-4177544 facade-majority
function pendingPluginHookRegistration() {
  return getPluginRegistry().hookRegistrationInFlight?.catch(() => {});
}
/**
 * 返回 hooks 注册的错误信息（成功为 undefined）。
 */
//@ chunk-e6aww6q8.js:4177544-4177624 facade-majority
async function failedPluginHookRegistration() {
  return getPluginRegistry().hookRegistration?.then(
    () => {
      return;
    },
    (e) => errorMessage(e),
  );
}
/**
 * hooks 注册是否仍在进行或结果未知。
 */
//@ chunk-e6aww6q8.js:4177624-4177732 facade-majority
function pluginHooksMayBeUnregistered() {
  let e = getPluginRegistry();
  return oae() && (e.hookRegistrationInFlight !== void 0 || e.hooksUnknownCause !== void 0);
}
/**
 * 清除缓存的 hooks 注册 Promise，下次调用会重新注册。
 */
//@ chunk-e6aww6q8.js:4177732-4177776 facade-majority
function clearPluginHookCache() {
  getPluginRegistry().hookRegistration = void 0;
}
/**
 * 工作区信任确认后，若有等待信任的钩子模块，重新加载插件钩子。
 */
//@ chunk-e6aww6q8.js:4177776-4177901 facade-majority
function loadHooksModulesHeldForTrust(e, n) {
  if (getPluginRegistry().hookModulesAwaitTrust && isProjectScopeTrustAccepted())
    loadPluginHooks(e, n).catch((r) => {
      logForDebugging(`plugin hooks after workspace trust: ${errorMessage(r)}`);
    });
}
/**
 * 插件被移除/禁用后，从已注册 hooks 与已加载 hooks 模块中删掉它们的条目。
 */
//@ chunk-e6aww6q8.js:4177901-4178267 facade-majority = pruneRemovedPluginHooks (0.868)
async function pruneRemovedPluginHooks(e, n) {
  let r = getPluginRegistry();
  if (!getRegisteredHooks() && r.loadedModules.length === 0) return;
  let { enabled: enabled } = await loadAllPluginsCacheOnly(e, n);
  if (getPluginRegistry() !== r) return;
  let enabledRoots = new Set(enabled.map((w) => w.path));
  if ((await pruneHooksModules(new Set(enabled.map(marketplaceSource))), getPluginRegistry() !== r)) return;
  let current = getRegisteredHooks();
  if (!current) return;
  let survivors = {};
  for (let [w, L] of Object.entries(current)) {
    let kept = L.filter((q) => "pluginRoot" in q && enabledRoots.has(q.pluginRoot));
    if (kept.length > 0) survivors[w] = kept;
  }
  replaceRegisteredPluginHooks(survivors);
}
/**
 * 清理不再需要的插件钩子模块（hooks worker 模块）：保留已启用/已禁用插件及当前已加载模块对应的存储 id，其余 prune。
 */
//@ chunk-e6aww6q8.js:4178267-4178430 facade-majority
async function standDownInstalledHooksModules() {
  let { enabled: enabled, disabled: disabled } = getBuiltinPlugins();
  await pruneHooksModules(
    new Set([
      ...[...enabled, ...disabled].map(marketplaceSource),
      ...getPluginRegistry()
        .loadedModules.map((loadedModule) => loadedModule.args.pluginStorageId)
        .filter(isBuiltinPluginId),
    ]),
  );
}
/**
 * 订阅设置变化：插件相关设置或 hooks 模块开关变化时重置并重新 registerPluginHooks（热加载），仅注册一次。
 */
//@ chunk-e6aww6q8.js:4178430-4179640 facade-majority = setupPluginHookHotReload (0.537)
function setupPluginHookHotReload(e, n) {
  watchPluginOptionChanges(refreshOptions);
  let r = getPluginRegistry();
  if (r.hookHotReloadUnsubscribe) return;
  ((r.hookHotReloadSettingsSnapshot = k6()),
    (r.hookHotReloadTierSnapshot = jsonStringify(resolveManagedPluginOrder())));
  let s = () => (clearPluginHookCache(), loadPluginHooks(e, n)),
    h = (source) => uiLog("hooks", source);
  if (!getIsNonInteractiveSession())
    r.hooksModulesSwitchUnwatch = watchRolloutSwitchChanges(
      () => void followHooksModulesRollout(s, h, standDownInstalledHooksModules),
    );
  (r.hookRegistrationInFlight ?? Promise.resolve())
    .catch(() => {
      return;
    })
    .then(() => followRolloutSwitchOnce(s, h, standDownInstalledHooksModules))
    .catch(logError);
  function y() {
    loadPluginHooks(e, n)
      .catch((G) => {
        logForDebugging(`Plugin hooks: reload failed: ${errorMessage(G)}`, { level: "error" });
      })
      .then(() => {
        if (!getIsNonInteractiveSession()) notifyModsRejudged(h);
      })
      .catch(logError);
  }
  r.hookHotReloadUnsubscribe = settingsChangeDetector.subscribe((G) => {
    queueHookedMergeOnSettingsChange();
    let q = r.admissionText !== null && refreshModAdmission(),
      Z = jsonStringify(resolveManagedPluginOrder()),
      Se = Z !== r.hookHotReloadTierSnapshot;
    if (q || G === "policySettings" || (G === "userSettings" && Se)) {
      let newSnapshot = k6();
      if (!q && newSnapshot === r.hookHotReloadSettingsSnapshot) {
        logForDebugging("Plugin hooks: skipping reload, plugin-affecting settings unchanged");
        return;
      }
      ((r.hookHotReloadSettingsSnapshot = newSnapshot),
        (r.hookHotReloadTierSnapshot = Z),
        logForDebugging("Plugin hooks: reloading due to plugin-affecting settings change"),
        clearPluginCache("loadPluginHooks: plugin-affecting settings changed"),
        clearPluginHookCache(),
        y());
    }
  });
  let hookHotReloadUnsubscribe = r.hookHotReloadUnsubscribe,
    w = subscribe_2(() => {
      queueHookedSettingsMerge("the loaded plugins changed");
    });
  if (
    ((r.hookHotReloadUnsubscribe = () => {
      (hookHotReloadUnsubscribe(), w());
    }),
    queueHookedSettingsMerge("the loaded plugins changed"),
    r.admissionText !== null && refreshModAdmission())
  )
    (clearPluginHookCache(), y());
}
//@ chunk-e6aww6q8.js:4179640-4179834 placement
function describePluginLoadFailure(e) {
  let n = `plugins could not be loaded (${errorMessage(e)})`;
  try {
    let r = Ibn();
    return r || getPolicyAllowedSet() !== null || hasManagedPlugins()
      ? `${n}${r ? ", nor could managed settings be read" : ""}`
      : void 0;
  } catch (error) {
    return (logError(toError(error)), n);
  }
}
//@ chunk-e6aww6q8.js:4179834-4179959 placement
function formatManagedPluginMissingMessage(e) {
  return `managed plugin ${e} registered hooks earlier this session and is missing from the latest plugin load`;
}
//@ chunk-e6aww6q8.js:4179959-4180181 placement = getPluginNameFromError (0.841)
function getPluginNameFromError(error) {
  let n = [];
  if ("pluginId" in error && error.pluginId) n.push(nfcLower(error.pluginId));
  if ("source" in error) {
    n.push(nfcLower(error.source));
    let r = marketplaceOf(error.source);
    if ("plugin" in error && error.plugin !== void 0 && r !== void 0)
      n.push(nfcLower(`${error.plugin}@${r}`));
  }
  return n;
}
/**
 * 判断插件加载错误是否属于“预期内、无需提示”的类型：市场未找到（非注册表读失败）、被策略阻止、市场加载失败（非目录读失败）、未记录安装路径的缓存未命中。
 */
//@ chunk-e6aww6q8.js:4180181-4180565 placement
function isBenignLoadError(e) {
  switch (e.type) {
    case "marketplace-not-found":
      return e.registryReadFailed !== !0 && e.registrationHidden === void 0;
    case "marketplace-blocked-by-policy":
      return !0;
    case "marketplace-load-failed":
      return e.catalogReadFailed !== !0 && e.untrustedReservedName !== !0;
    case "plugin-cache-miss":
      return e.installPath === NOT_RECORDED && e.registryReadFailed !== !0 && e.seedHasOtherVersion !== !0;
    default:
      return !1;
  }
}
//@ chunk-e6aww6q8.js:4180565-4180809 placement
function isMarketplaceLevelLoadError(e) {
  return (
    pluginErrorSummary(e) ||
    (e.type === "path-not-found" && e.plugin === void 0) ||
    e.type === "marketplace-load-failed" ||
    e.type === "marketplace-not-found" ||
    e.type === "plugin-not-found" ||
    (e.type === "marketplace-blocked-by-policy" && e.sourceUnverifiable === !0)
  );
}
//@ chunk-pd0t5xas.js:809-868 placement
function Ibn() {
  try {
    return policySettingsUnreadable();
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 内置插件只能由受信设置启用时返回其规范 id。
 */
//@ chunk-pd0t5xas.js:868-1057 placement
function trustedOnlyBuiltinPluginId(e) {
  if (!isBuiltinPluginId(e)) return;
  let sliced = canonicalPluginId(e).slice(0, -`@${BUILTIN}`.length);
  for (let [o, r] of getHostState().builtinPlugins)
    if (pluginNamesEqual(o, sliced))
      return r.enabledFromTrustedSettingsOnly === !0 ? `${o}@${BUILTIN}` : void 0;
  return;
}
//@ chunk-pd0t5xas.js:1057-1085 placement
var Wq = (e) => trustedOnlyBuiltinPluginId(e) !== void 0;
/**
 * 是否存在任何非内置插件（启用、带钩子、已加载模块、托管、内联、同步）。
 */
//@ chunk-pd0t5xas.js:3923-4164 placement
function hasNonBuiltinPluginSurface() {
  try {
    let e = getPluginRegistry();
    return (
      enabledPluginIds().some((o) => !isBuiltinPluginId(o)) ||
      [...e.pluginsWithHooks].some((o) => !isBuiltinPluginId(o)) ||
      e.loadedModules.some((loadedModule) => !hasLink(loadedModule)) ||
      hasManagedPlugins() ||
      policySettingsUnreadable() ||
      getInlinePlugins().length > 0 ||
      getInlinePluginsNoMcp().length > 0 ||
      getInlinePluginUrls().length > 0 ||
      getSyncedPluginDirs().length > 0
    );
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 函数钩子注册是否还没完成：欠缺、进行中、原因未知、盲跑或托管设置不可读，且开关允许并存在非内置插件；出错保守返回 true。
 */
//@ chunk-pd0t5xas.js:4164-4368 placement
function isHookRegistrationPending() {
  try {
    let e = getPluginRegistry();
    return (
      (e.hookRegistrationOwed ||
        e.hookRegistrationInFlight !== void 0 ||
        e.hooksUnknownCause !== void 0 ||
        e.hookRegistrationRanBlind ||
        Ibn()) &&
      oae() &&
      hasNonBuiltinPluginSurface()
    );
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 计算影响插件加载的设置指纹（enabledPlugins、extraKnownMarketplaces、策略等），用于判断缓存的插件加载结果是否过期。
 */
//@ chunk-czx62zen.js:13462-14027 fingerprint = getPluginAffectingSettingsSnapshot (0.609)
function getPluginAffectingSettingsSnapshot() {
  let merged = getVouchedAdminPolicyTier(),
    n = _(merged),
    o = ne(n),
    s = o ? merged : getSettingsForSource("policySettings"),
    r = getAdminAuthoredPolicySettings();
  if (getRemotePolicyTierWithKind().servedSnapshot) return { enables: s, names: r };
  if (o) return { enables: s, names: merged };
  let a = new Map(),
    c = new Set();
  for (let l of n) {
    let filtered = Object.entries(l.extraKnownMarketplaces ?? {}).filter(([i]) => !c.has(nfcLower(i)));
    for (let [i, d] of filtered) a.set(i, d);
    for (let [i] of filtered) c.add(nfcLower(i));
  }
  let u = c.size > 0 || n.some((l) => l.strictKnownMarketplaces !== void 0);
  return {
    enables: s,
    names: u
      ? {
          extraKnownMarketplaces: Object.fromEntries(a),
          ...(merged?.strictKnownMarketplaces !== void 0 && {
            strictKnownMarketplaces: merged.strictKnownMarketplaces,
          }),
        }
      : r,
  };
}

export {
  isHookRegistrationPending,
  hasNonBuiltinPluginSurface,
  loadPluginHooks,
  Wq,
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
