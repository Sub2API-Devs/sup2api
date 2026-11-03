/**
 * plugins/functionHooks/hooksModuleLoader.ts
 *
 * 2.1.316 新增：插件 hooks 模块的加载、重载、卸载与顺序编排
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (95)
 * attribution: placement 95
 */
import { AsyncResource } from "async_hooks";
import { resolve as resolve_2, sep } from "path";
import { isDeepStrictEqual } from "util";
import { identity as identity_2 } from "../../utils/identity.js";
import { getPrintOutputFormat, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { writeToStderr } from "../../utils/process.js";
import { marketplaceOf, pluginDisplayKey } from "../../utils/plugins/pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE } from "../../utils/telemetry/pluginTelemetry.js";
import { stripControlChars as stripControlChars_3 } from "../../utils/settings/writeQueues.js";
import { PROTO_KEY, describeMatcher, reviveMatcherDefault } from "../../utils/hooks/functionHookMatchers.js";
import {
  reportPluginProblem,
  pluginStorageKey,
  moduleMatcherAdmits,
  joinedKeys,
  joinLabels,
} from "./hooksWorkerClient.js";
import { adviseUiRenderMatcher } from "./sites/uiSites.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { HOOK_EVENTS_2 as HOOK_EVENTS_2_2, isHookEvent, isPluginDefinedEvent } from "./hookApiSurface.js";
import {
  CORE_ORIGIN,
  isEventPattern,
  matchesEventPattern,
  eventPatternError,
  nameOfEventPattern,
  matchesEventForPlugin,
  hooksModuleFiles,
} from "./eventPatterns.js";
import { HooksError, causeString, envUnloadedError, tagError, tagPayload } from "./hooksErrors.js";
import { tiersBeneath } from "./builtinHooksModule.js";
import {
  telemetryStreamRefusal,
  telemetryRefSummary,
  listLinkedFiles,
  scanHooksModule,
  scanSealedHooksModule,
} from "./hooksModuleScan.js";
import { isOfficialMarketplacePlugin, classifyPluginOrigin } from "./panes.js";
import { createMemoMap } from "./moduleLoader.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import {
  isOutsideOptions,
  clearPluginOptionsCache,
  marketplaceSource,
  pluginOptionsFingerprint,
  loadPluginOptions,
  applyUserConfigDefaults,
  TRUSTED_SETTING_SOURCES,
} from "../../utils/plugins/pluginOptionsStorage.js";
import { pluginIdAliases, trustedPluginSetting } from "../../utils/plugins/pluginConfigSources.js";
import { validateUserConfig } from "../../utils/plugins/mcpbHandler.js";
import { hasTrustedOnlyBuiltinPlugin } from "../../utils/plugins/loadPluginHooks.js";
import { pickNonSensitiveOptions, readSealedPluginTexts, withSealedPlugin } from "./sealedPlugins.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getSettingsForSource, getSettingsParseErrorsForSource } from "../../utils/settings/settings.js";
import { loadHooksModuleGraph } from "./moduleScan.js";
import { findSurfaceComponent } from "./clientSurfaceScan.js";
import { hooksModulesRefusalReason } from "../../services/analytics/growthbookCredentials.js";
import {
  HookAdmissionError,
  getPreToolStageOrder,
  NotOrganizationPluginError,
  isFreshHeronEnabled,
  admissionChangedListener,
  HookAdmissionRefusal,
} from "../../utils/hooks.js";
import {
  moduleAdmissionCache,
  moduleAdmissionCacheB,
  isModuleAdmitted,
} from "../../utils/plugins/functionHooks/admission.js";
import { getVouchedPolicyPluginIds, resolveManagedPluginOrder } from "../../utils/plugins/managedPlugins.js";
import { resolveManagedPluginDigests } from "../../utils/plugins/managedPluginSeating.js";
import { pluginTier, createWithheldElementWarner, Y6t } from "./dispatch/chain.js";
import { copsSimilar } from "../../utils/permissions/permissions.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { currentSurfaceBinding, surfaceComposer } from "./surfaceBinding.js";
import { isModuleAdmittedByName } from "../../services/mcp/mcpClientCapabilities.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logError } from "../../utils/log.js";
import { vmCreateElement, vmFragment } from "./vm/boundaryCopy.js";
import { isBuiltinPluginId, getBuiltinPlugin } from "../builtinPlugins.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { buildElementTable } from "./ui/elements.js";
import { createSurfaceAnswerCache, cachedResolveAnswer, noStreamingOps } from "./vm/moduleLoader.js";
import { registerHooksModule } from "./api/register.js";
import { uniq, count } from "../../utils/collections.js";
import { ensureNativeHost, ensureEnvironmentHost, initHooksHost } from "./hooksWorkerHost.js";
import { releaseWaitingCalls, forgetCachedDescribe } from "./commandApi.js";
import { countModLoadEvent, logModLoadFailed } from "./modLoadTelemetry.js";
import { dispatchHookCall, hookPluginLabel, PLUGIN_UNLOADED_TEXT } from "./hookDispatch.js";
import { moveToCloudTrash } from "../../utils/cloudTrash.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { assertPluginHooksAdmitted } from "../../utils/hooks/hookPolicyHold.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  setKnownArgs,
  invalidateAllHookedCaches,
  publishRenderPlugins,
  forgetPlugin,
  liftWithholdings,
  resetWithholdings,
  bumpGeneration,
  foldBaseForRespawn,
  foldBaseWithout_2,
  isCrashedOrWithholding,
  withheldNounsOf,
  reportWorkerCrashWithholdings,
  foldBaseWithout,
  lastFoldSummary,
  recordRefoldResult,
} from "./sameThreadHost.js";
import {
  PREVIOUS_VERSION_UNLOADED,
  shownPluginInfo,
  admitBuiltModules,
  runWhileAdmitting,
  judgePluginRegister,
  registerJudges,
  describeRegisterRefusal,
} from "./pluginRegister.js";
import {
  findReloadTriggerEvent,
  PARTIAL_REFOLD_TEXT,
  engineCreateFailedError,
  abandonIfWorkerDied,
  buildEngineApi,
} from "./engineCreate.js";
import { providerRank } from "./providerTiers.js";
import { dependencyRefMatches, qualifyDependency } from "../../utils/plugins/dependencyResolver.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS_2 } from "./dispatch/slowHookReports.js";
import { TUi } from "./ui/renderSites.js";
import { forgetMcpServerFor } from "./mcpServerHooks.js";
import { forgetMcpConnectsFor } from "./mcpApi.js";
import { noteWorkersLoaded, workerSlots, storageIdOf } from "./apiDispatch.js";
import { emit } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { invalidateAll } from "./ui/renderInstances.js";
import { forgetSessionStartCall } from "./promptApi.js";
import { isStoredLoginPinned } from "../../cli/headlessCloud/attachServe.js";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";

//@ chunk-e6aww6q8.js:733946-733981 placement
/**
 * 内联问题去重集
 */
var inlineProblemsSeen = identity_2(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:733981-734014 placement
/**
 * 延迟输出的问题行
 */
var deferredProblemLines = identity_2([], (e) => {
  e.length = 0;
});
//@ chunk-e6aww6q8.js:734014-734086 placement
/**
 * 文本输出且非 bg 会话
 */
function isPlainTextSession() {
  return getPrintOutputFormat() === "text" && env.CLAUDE_CODE_SESSION_KIND !== "bg";
}
//@ chunk-e6aww6q8.js:734086-734165 placement
/**
 * 输出延迟的问题
 */
function flushDeferredProblems() {
  let e = deferredProblemLines.splice(0);
  if (!isPlainTextSession()) return;
  for (let n of e)
    writeToStderr(`${n}
`);
}
//@ chunk-e6aww6q8.js:734165-734200 placement
/**
 * 已报告的内联问题
 */
var reportedInlineProblems = identity_2(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:734200-734378 placement
/**
 * 非交互会话里，内联插件的问题输出到 stderr（去重；格式化输出时先缓存）。
 */
function reportInlinePluginNotice(e, n) {
  let r = marketplaceOf(e.source) === INLINE_PLUGIN_MARKETPLACE;
  if (!getIsNonInteractiveSession() || !r) return;
  let s = stripControlChars_3(`${e.name}: ${n}`);
  if (reportedInlineProblems.has(s)) return;
  reportedInlineProblems.add(s);
  if (getPrintOutputFormat() === null) {
    deferredProblemLines.push(s);
    return;
  }
  if (isPlainTextSession())
    writeToStderr(`${s}
`);
}
//@ chunk-e6aww6q8.js:734378-734603 placement
/**
 * 在所有宿主的进行中分发上执行回调。
 */
function withInFlightDispatches(e, n, r) {
  let filtered = [e.state.environmentHost, e.state.nativeHost].filter((h) => h !== undefined);
  return r(
    n,
    {
      [Symbol.iterator]: () => filtered.flatMap((h) => [...h.inFlight()]).values(),
    },
    (h) => filtered.map((y) => y.nameOf(h)).find((y) => y !== undefined),
  );
}
//@ chunk-e6aww6q8.js:734603-734705 placement
/**
 * 取 tool.call 事件中的工具名。
 */
function toolNameOfCall(event, payload) {
  let tool = event === "tool.call" && "tool" in payload ? payload.tool : undefined;
  return typeof tool === "string" ? tool : undefined;
}
//@ chunk-e6aww6q8.js:734751-734782 placement
/**
 * 绑定 async 资源
 */
var bindAsyncResource = () => AsyncResource.bind((e) => e());
//@ chunk-e6aww6q8.js:734782-734823 placement
/**
 * 合并出带 options 的对象
 */
var withOptions = (e, n, options) => ({
  ...e,
  ...n,
  options,
});
//@ chunk-e6aww6q8.js:734823-734891 placement
/**
 * 以 ! 或内部前缀开头
 */
var isPrivateEventName = (e) => (e.startsWith("!") ? e.slice(1) : e).startsWith(`${PROTO_KEY}.`);
//@ chunk-e6aww6q8.js:734891-735062 placement
function warnProtoPatterns(pluginName, registered) {
  for (let r of new Set(registered.map((s) => s.pattern)))
    if (isPrivateEventName(r) && !r.startsWith("!"))
      reportPluginProblem(
        pluginName,
        `registered ${r}; that name cannot be a noun, so this hook is never run`,
      );
}
//@ chunk-e6aww6q8.js:735062-735333 placement
function adviseUiRenderMatchers(e, registered) {
  for (let { pattern, matcher } of registered) {
    if (!(pattern === "ui.render" && matcher !== undefined)) continue;
    try {
      let y = adviseUiRenderMatcher(matcher);
      if (y !== undefined)
        logForDebugging(`hooks module ${e}: on("ui.render", ${describeMatcher(matcher)}) ${y}`, {
          level: "warn",
        });
    } catch (error) {
      logForDebugging(`hooks module ${e}: ui.render matcher advice failed: ` + errorMessage(error));
    }
  }
}
//@ chunk-e6aww6q8.js:735333-736099 placement
function reportUnmatchedHookRegistrations(e, n, r) {
  let s = [
    ...HOOK_EVENTS_2_2,
    ...Object.entries(r).flatMap(([key, value]) =>
      value.owner !== CORE_ORIGIN ? value.methods.map((method) => `${key}.${method}`) : [],
    ),
  ];
  for (let h of n) {
    if (isPrivateEventName(h)) continue;
    if (isEventPattern(h)) {
      let G = h.startsWith("!");
      let q = G ? h.slice(1) : h;
      if (!s.some((Se) => matchesEventPattern(q, Se)))
        throw new HooksError(
          `${e}: registered on("${h}"), ` +
            (G ? "whose negated pattern selects no event" : "which selects no event"),
        );
      continue;
    }
    if (isHookEvent(h)) continue;
    let index = h.indexOf(".");
    let sliced = h.slice(0, index);
    let sliced_2 = h.slice(index + 1);
    let L = Object.hasOwn(r, sliced) ? r[sliced] : undefined;
    if (!L) throw new HooksError(`${e}: registered ${h}, but no loaded plugin provides $.${sliced}`);
    if (L.owner === CORE_ORIGIN)
      throw new HooksError(
        `${e}: registered ${h}, which is a call on core's $.${sliced} that is not an event`,
      );
    if (!L.methods.includes(sliced_2))
      throw new HooksError(`${e}: registered ${h}, but $.${sliced} (${L.owner}) has no method ${sliced_2}`);
  }
}
//@ chunk-e6aww6q8.js:736099-736506 placement
/**
 * 校验扫描到的 next.to 目标：只有托管插件可用，且目标须在该层允许的下层之中。
 */
function checkNextToAllowed(e, scan, r) {
  let s = tiersBeneath(r);
  for (let h of scan.nextTo ?? []) {
    if (s.length === 0)
      throw new HooksError(
        `${e}: hooks module not loaded; next.to is available to managed plugins (prependPlugins / appendPlugins) only, and this plugin is ${r} (policy/scan)`,
      );
    if (!s.includes(h))
      throw new HooksError(
        `${e}: hooks module not loaded; next.to("${h}") skips nothing from ${r}; a ${r} plugin may continue at ${s.join(", ")} (policy/scan)`,
      );
  }
}
//@ chunk-e6aww6q8.js:736506-736889 placement
/**
 * 校验注册的事件：必须是已知事件或插件自定义事件，且出现在模块扫描结果里。
 */
function checkRegisteredEvents(pluginName, scan, r) {
  for (let s of r) {
    let h = eventPatternError(s);
    if (h !== undefined) throw new HooksError(`${pluginName}: registered ${h}`);
    let y = isHookEvent(s);
    let S = nameOfEventPattern(s);
    if (S !== undefined && !isHookEvent(S) && !isPluginDefinedEvent(S))
      throw new HooksError(`${pluginName}: registered "${s}", which is not an event`);
    if (
      !scan.hooks.some(
        (hook) =>
          hook === s ||
          (y &&
            isEventPattern(hook) &&
            matchesEventForPlugin(hook, s, {
              isBuiltin: false,
            })),
      )
    )
      throw new HooksError(
        `${pluginName}: registered ${s}, which the scan of its hooks module did not see (host check)`,
      );
  }
}
//@ chunk-e6aww6q8.js:743601-743796 placement
function checkScanPolicy(e, scan, r) {
  let s = telemetryStreamRefusal(scan, {
    isBuiltin: isOfficialMarketplacePlugin(r),
  });
  if (s !== undefined) throw new HooksError(`${e}: hooks module not loaded; ${s} (policy/scan)`);
  let h = telemetryRefSummary(scan);
  if (h !== undefined) logForDebugging(`${e}: hooks telemetry for: ${h}`);
}
//@ chunk-e6aww6q8.js:762691-762704 placement
/**
 * 宿主状态
 */
var hostStateRef = createMemoMap();
//@ chunk-e6aww6q8.js:762704-762740 placement
/**
 * 已加载插件的选项
 */
var loadedPluginOptions = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:762740-762812 placement
/**
 * 取某插件的选项
 */
function pluginOptionsFor(e) {
  let n = loadedPluginOptions.get();
  return n?.pluginId === e ? n.options : undefined;
}
//@ chunk-e6aww6q8.js:762812-763072 placement
function warnOptionsOutsideChoices(name, n, userConfig) {
  for (let [key, value] of Object.entries(n)) {
    let options = userConfig[key]?.options;
    if (options !== undefined && isOutsideOptions(userConfig[key], value)) {
      let w = userConfig[key]?.default;
      let L = w === undefined ? "unset" : `the default, ${String(w)}`;
      reportPluginProblem(
        name,
        `option ${key} in settings is not one of ${options.join(", ")}; it reads as ${L}`,
        "once",
      );
    }
  }
}
//@ chunk-e6aww6q8.js:763072-763791 placement
/**
 * 读取并校验插件 userConfig 选项：取设置中的值（项目设置不读）、补默认值并校验；不合法时内置插件抛错，其他回退为默认值。
 */
async function resolvePluginOptions(e) {
  let userConfig = e.manifest.userConfig ?? {};
  if (Object.keys(userConfig).length === 0) return {};
  clearPluginOptionsCache();
  hostStateRef.set(marketplaceSource(e), {
    before: hostStateRef.get(marketplaceSource(e))?.now,
    now: pluginOptionsFingerprint(marketplaceSource(e)),
  });
  let r = pluginOptionsFor(marketplaceSource(e)) ?? (await loadPluginOptions(marketplaceSource(e)));
  let s =
    "pluginConfigs[" +
    pluginIdAliases(marketplaceSource(e))
      .map((S) => JSON.stringify(S))
      .join(" or ") +
    "].options";
  if (Object.keys(r).length === 0)
    logForDebugging(
      `plugin ${e.name}: no ${s} in user, --settings or managed settings (project settings are not read); every option is its default`,
    );
  warnOptionsOutsideChoices(e.name, r, userConfig);
  let h = applyUserConfigDefaults(r, userConfig);
  let y = validateUserConfig(h, userConfig);
  if (!y.valid) {
    let S = hasTrustedOnlyBuiltinPlugin(marketplaceSource(e));
    let w = `${e.name}: options do not fit plugin.json userConfig: ${y.errors.join("; ")} (settings.json ${s})`;
    if (!S) throw new HooksError(w);
    logForDebugging(`${w} \u2014 loading on its defaults instead`, {
      level: "error",
    });
    return applyUserConfigDefaults({}, userConfig);
  }
  return h;
}
//@ chunk-e6aww6q8.js:763791-763978 placement
/**
 * 插件当前非敏感选项及其稳定 JSON 文本（用于比较是否变化）。
 */
function pluginOptionsSnapshot(serverName) {
  let n = pickNonSensitiveOptions(
    applyUserConfigDefaults(
      trustedPluginSetting(marketplaceSource(serverName)).options ?? {},
      serverName.manifest.userConfig ?? {},
    ),
    serverName,
  );
  return {
    options: n,
    text: jsonStringify(Object.fromEntries(Object.entries(n).toSorted(([r], [s]) => r.localeCompare(s)))),
  };
}
//@ chunk-e6aww6q8.js:763978-764059 placement
/**
 * 找不可读的受信设置源
 */
var findBrokenTrustedSetting = () =>
  TRUSTED_SETTING_SOURCES.find(
    (e) =>
      getSettingsForSource(e) === null &&
      getSettingsParseErrorsForSource(e).some((n) => n.severity !== "warning"),
  );
//@ chunk-e6aww6q8.js:764103-764429 placement
/**
 * 加载插件的一个界面模块：读取、链接、检查导出，返回模块或问题。
 */
async function loadSurfaceModule(e, n, r) {
  let s = resolve_2(n, ...e.split("/"));
  let { source, graph } = await loadHooksModuleGraph(s, n, r);
  let S = graph.files.get(s);
  let w = S
    ? findSurfaceComponent(S.scanned.program)
    : {
        problem: "was not linked",
      };
  if ("problem" in w) throw new HooksError(`${r}: surface module ${e.split("/").join(sep)} ` + w.problem);
  return {
    module: e,
    modulePath: s,
    component: w.component,
    source,
    ...listLinkedFiles(graph, s),
  };
}
//@ chunk-e6aww6q8.js:764429-764540 placement
/**
 * 依次加载插件的所有界面模块。
 */
async function loadSurfaceModules(clients, n, r) {
  if (!clients || clients.length === 0) return;
  let s = [];
  for (let h of clients) s.push(await loadSurfaceModule(h, n, r));
  return s;
}
//@ chunk-e6aww6q8.js:764540-765457 placement
/**
 * 为插件的 hooks 模块准备加载参数：检查准入与命名冲突、读取选项、扫描（或使用密封文本）、加载界面模块、确定层级并校验 next.to 与策略。
 */
async function prepareHooksModuleArgs(state, n, modulePath) {
  let s = hooksModulesRefusalReason();
  if (s !== undefined) throw new HookAdmissionError(n.name, s);
  moduleAdmissionCache.set(() => getVouchedPolicyPluginIds());
  moduleAdmissionCacheB.set((Se) => (resolveManagedPluginDigests(Se) ?? []).length > 0);
  if (getPreToolStageOrder().includes(n.name))
    throw new HooksError(
      `${n.name}: hooks module not loaded; the name is the engine's own chain member (plugin.json name)`,
    );
  let sealedPluginTexts = await readSealedPluginTexts(state, n, modulePath);
  let options = await resolvePluginOptions(n);
  let S =
    sealedPluginTexts === undefined
      ? await scanHooksModule(modulePath, n.path, n.name)
      : await scanSealedHooksModule({
          modulePath,
          pluginRoot: n.path,
          pluginName: n.name,
          texts: sealedPluginTexts,
        });
  if (sealedPluginTexts !== undefined && (S.scan.clients ?? []).length > 0)
    throw new NotOrganizationPluginError(n.name, "it names surface modules");
  let surfaceModules = await loadSurfaceModules(S.scan.clients, n.path, n.name);
  let G = marketplaceSource(n);
  let q =
    sealedPluginTexts === undefined
      ? getVouchedPolicyPluginIds()
      : withSealedPlugin(G, getVouchedPolicyPluginIds());
  let Z = pluginTier(G, q, resolveManagedPluginOrder());
  checkNextToAllowed(n.name, S.scan, Z);
  checkScanPolicy(n.name, S.scan, G);
  return {
    modulePath,
    pluginName: n.name,
    pluginRoot: n.path,
    pluginStorageId: G,
    tier: Z,
    isPersons: copsSimilar(G, q),
    scan: S.scan,
    source: S.source,
    linked: S.linked,
    links: S.links,
    options,
    ...(surfaceModules !== undefined && {
      surfaceModules,
    }),
    ...(sealedPluginTexts !== undefined && {
      sealed: true,
    }),
    ...(!isFreshHeronEnabled() && {
      isLeavingUncopied: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:765457-765505 placement
/**
 * 未在 N 毫秒内加载
 */
var notLoadedWithinText = (pluginName, n) => `${pluginName}: not loaded within ${n}ms`;
//@ chunk-e6aww6q8.js:765505-765583 placement
/**
 * 错误文本加 cause
 */
function errorWithCause(error) {
  let n = causeString(error);
  if (n === undefined) return errorMessage(error);
  return `${errorMessage(error)} (${n})`;
}
//@ chunk-e6aww6q8.js:765583-765662 placement
/**
 * 清空并刷新代理定义
 */
async function refreshAgentsAndDefinitions() {
  getHostState().agentDefinitions.clear();
  await currentSurfaceBinding()?.refreshAgents();
}
//@ chunk-e6aww6q8.js:765662-765717 placement
/**
 * 插件代理的唯一键
 */
var agentRegistrationKey = (e) => `${pluginDisplayKey(e.plugin, e.pluginId)}:` + e.spec.name;
//@ chunk-e6aww6q8.js:765717-766018 placement
/**
 * 插件登记的代理表：只列出可用插件的代理，支持登记与查询。
 */
function createRegisteredAgentsTable(e) {
  return {
    list: () => [...e().values()].filter((n) => isModuleAdmittedByName(n.plugin)),
    held: (n) => {
      let r = e().get(n);
      return r !== undefined && isModuleAdmittedByName(r.plugin) ? r : undefined;
    },
    register: (n) => {
      e().set(agentRegistrationKey(n), n);
    },
    forget: (n) => {
      let r = e();
      let filtered = [...r.values()].filter((h) => h.plugin === n);
      for (let h of filtered) r.delete(agentRegistrationKey(h));
      return filtered.length > 0;
    },
  };
}
//@ chunk-e6aww6q8.js:766018-766057 placement
/**
 * 插件登记的代理表
 */
var registeredAgentsTable = createRegisteredAgentsTable(() => getPluginRegistry().registeredAgents);
//@ chunk-e6aww6q8.js:766057-766112 placement
/**
 * 忘掉登记的代理并刷新
 */
function forgetRegisteredAgent(e) {
  if (registeredAgentsTable.forget(e)) refreshAgentsAndDefinitions().catch((error) => logError(error));
}
//@ chunk-e6aww6q8.js:3701193-3701373 placement
function installJsxGlobals() {
  let e = globalThis;
  for (let [key, value] of Object.entries({
    h: vmCreateElement,
    Fragment: vmFragment,
  }))
    if (e[key] === undefined)
      Object.defineProperty(e, key, {
        value,
        writable: true,
        configurable: true,
        enumerable: false,
      });
}
//@ chunk-e6aww6q8.js:3701373-3701505 placement
/**
 * 若是内置插件，返回其内嵌的 hooks 模块对象。
 */
function builtinModuleOf(e) {
  if (!isBuiltinPluginId(e.pluginStorageId)) return;
  let hooksModule = getBuiltinPlugin(e.pluginName)?.hooksModule;
  return hooksModule !== undefined && "module" in hooksModule ? hooksModule.module : undefined;
}
//@ chunk-e6aww6q8.js:3701505-3701623 placement
function createUiResolveCopier(pluginName) {
  let withheldElementWarner = createWithheldElementWarner(pluginName);
  return (r, s) =>
    isPlainObject_5(r)
      ? Object.freeze(
          Object.assign(
            Object.create(null),
            buildElementTable(r, (h) => h, withheldElementWarner(s)),
          ),
        )
      : r;
}
//@ chunk-e6aww6q8.js:3701623-3703563 placement
/**
 * 校验 hooks 模块导出：必须是二进制内置的模块或函数形式，next 等字段类型正确。
 */
var validateHooksModuleExports = async (e, n, r = {}) => {
  let { pluginName } = n;
  let h = builtinModuleOf(n);
  if (!h)
    throw new HooksError(
      `${pluginName}: not a hooks module the binary carries; it loads in the plugin sandbox, not natively`,
    );
  installJsxGlobals();
  let framed = r.framed ?? ((Me, We) => We());
  let S = false;
  let weakMap = new WeakMap();
  let surfaceAnswerCache = createSurfaceAnswerCache(createUiResolveCopier(pluginName));
  function G(Me) {
    if (S) throw envUnloadedError(pluginName);
    if (typeof Me !== "function") throw new HooksError(`${pluginName}: not a function`);
    return Me;
  }
  let invoke = async (Me, We, ze) => await Reflect.apply(G(Me), ze, We);
  let iterate = (Me) => {
    if (!(typeof Me === "object" && Me !== null && "next" in Me && typeof Me.next === "function"))
      throw new HooksError(
        `${pluginName}: a hook on a streaming event returns its async generator; got ${Me === null ? "null" : typeof Me}`,
      );
    return Me;
  };
  let isGeneratorHook = (Me) =>
    typeof Me === "function" && Object.prototype.toString.call(Me) === "[object AsyncGeneratorFunction]";
  async function ke(...Me) {
    let [We, ze, lt] = Me;
    try {
      return await e(We, ze, lt);
    } catch (error) {
      if (typeof error === "object" && error)
        weakMap.set(error, {
          plugin: pluginName,
          op: We,
          message: errorMessage(error),
        });
      throw S ? tagError(error, cachedResolveAnswer(weakMap, error)) : error;
    }
  }
  function we(Me, We, ze) {
    let lt = (r.hostStream ?? noStreamingOps)(Me, We, ze);
    lt.result.catch((error) =>
      S ? tagError(error, tagPayload(pluginName, Me, errorMessage(error))) : error,
    );
    return lt;
  }
  let Ee = () => void (S = true);
  function Ae(Me) {
    return Me instanceof AbortSignal
      ? {
          signal: Me,
          unlink: () => {},
        }
      : undefined;
  }
  r.signal?.addEventListener("abort", Ee, {
    once: true,
  });
  let Ie;
  try {
    Ie = await registerHooksModule({
      loaded: h,
      args: n,
      host: ke,
      hostStream: we,
      resolvedTable: surfaceAnswerCache.read,
      invoke,
      iterate,
      streamIn: (Me) => Me,
      isGeneratorHook,
      wrapMethod: (Me) => Me,
      signalFrom: Ae,
      makeSignal: () => {
        let abortController = new AbortController();
        return {
          signal: abortController.signal,
          abort: (We) => abortController.abort(We),
        };
      },
      copyMatcher: (Me) => Me,
      stamped: (Me) => Me(),
      framed,
    });
    if (r.signal?.aborted === true) throw new HooksError(`${pluginName}: unloaded while its module loaded`);
  } catch (error) {
    Ee();
    throw error;
  }
  return {
    activation: Ie,
    invoke,
    invokeSync: (Me, We) => G(Me)(We),
    applyIn: (Me, We, ...ze) => Reflect.apply(G(We), Me, ze),
    cloneIn: (Me) => Me,
    argumentFor: (Me) => Me,
    freezeForNext: (Me) => Object.freeze(Me),
    leaving: (Me) => Me,
    nextFor: (Me) => Me,
    streamNextFor: (Me) => Me,
    storeResolved: surfaceAnswerCache.store,
    dispose: () => {
      Ee();
      Ie.dispose();
    },
    opFailureOf: (Me) => cachedResolveAnswer(weakMap, Me),
    ownsValue: () => false,
  };
};
//@ chunk-e6aww6q8.js:3703563-3703578 placement
/**
 * 原样返回
 */
var identityOf = (e) => e;
//@ chunk-e6aww6q8.js:3703578-3704164 placement
/**
 * 为模块注册表建立按事件的索引：匹配的注册项、是否监听、是否有 catch、组合 matcher。
 */
function createRegistrationIndex(registered, n) {
  let r = new Map();
  function s(y) {
    let S = r.get(y);
    if (S === undefined) {
      S = registered.flatMap((w, L) => (matchesEventForPlugin(w.pattern, y, n) ? [L] : []));
      r.set(y, S);
    }
    return S;
  }
  let h = (y, S = []) =>
    s(y).flatMap((w) => {
      let L = registered[w];
      return L === undefined || S.includes(w) ? [] : [L];
    });
  return {
    patterns: uniq(registered.map((y) => y.pattern)),
    registrationsFor: s,
    standingFor: h,
    hooks: (y, S) => h(y, S).length > 0,
    catches: (y, S, w) =>
      h(y, S).some((L) => L.caught === true && (L.matcher === undefined || w?.(L.matcher) !== false)),
    hasCatch: (y) => registered[y]?.caught === true,
    matcherFor: (y, S) => {
      let w;
      for (let [L, G] of h(y, S).entries()) {
        if (G.matcher === undefined) return;
        w = L === 0 ? G.matcher : [w, G.matcher];
      }
      return w;
    },
  };
}
//@ chunk-e6aww6q8.js:3704164-3704243 placement
/**
 * 未加载则拒绝
 */
function rejectIfUnloaded(e, n, r) {
  return e().kind === "unloaded" ? Promise.reject(new HooksError(n)) : r();
}
//@ chunk-e6aww6q8.js:3704243-3705997 placement
/**
 * 描述 hooks 模块的当前状态（live、unloaded、retiring、dead、error）。
 */
async function describeHooksModuleState(e, n) {
  let r = hooksModulesRefusalReason();
  if (r !== undefined) throw new HookAdmissionError(n.pluginName, r);
  let h = builtinModuleOf(n) !== undefined ? ensureNativeHost(e) : undefined;
  let y = h ?? ensureEnvironmentHost(e);
  let S = ++e.state.environmentCounter;
  let w = await y.load(S, n);
  try {
    checkRegisteredEvents(
      n.pluginName,
      n.scan,
      w.registered.map((Ee) => Ee.pattern),
    );
  } catch (error) {
    y.unload(S);
    throw error;
  }
  let L = pluginStorageKey(n);
  adviseUiRenderMatchers(L, w.registered);
  warnProtoPatterns(n.pluginName, w.registered);
  getPluginRegistry().moduleSeats.set(n.pluginName, n.tier);
  e.state.environmentArgs.set(S, n);
  let G = {
    kind: "live",
  };
  let q = 0;
  let Z = `hooks module ${L} unloaded`;
  function Se() {
    if (G.kind === "live" || G.kind === "retiring") {
      G = {
        kind: "unloaded",
        retired: G.kind === "retiring",
      };
      e.state.environmentArgs.delete(S);
      try {
        y.unload(S);
      } finally {
        releaseWaitingCalls(e.state.sentCalls, S);
      }
    }
  }
  function ke() {
    let died = y.died;
    return died !== undefined && G.kind !== "unloaded"
      ? {
          kind: "dead",
          reason: died,
        }
      : G;
  }
  let we = identityOf({
    name: n.pluginName,
    label: L,
    tier: n.tier,
    ...createRegistrationIndex(w.registered, {
      isBuiltin: isOfficialMarketplacePlugin(n.pluginStorageId),
    }),
    args: n,
    environmentId: S,
    hopKey: y,
    ...(h !== undefined && {
      link: (Ee) => h.link(S, Ee),
      streamLinks: (Ee) => h.linkStreams(S, Ee),
    }),
    status: ke,
    enter: () => {
      q += 1;
      countModLoadEvent(n.pluginStorageId);
    },
    leave() {
      q -= 1;
      if (G.kind === "retiring" && q === 0) Se();
    },
    dispatch: (event, Ae, Ie) =>
      dispatchHookCall({
        members: [we],
        event,
        e: Ae,
        call: Ie,
        signal: Ie.signal,
        hookOrigin: undefined,
        origin: Ie.origin,
        floors: Y6t,
      }),
    discard: Se,
    retire() {
      forgetCachedDescribe(n.pluginName);
      forgetRegisteredAgent(n.pluginName);
      e.state.environmentArgs.delete(S);
      moveToCloudTrash.forgetPresses(n.pluginName);
      try {
        surfaceComposer()?.forget(n.pluginName);
      } catch (error) {
        logForDebugging(`${n.pluginName}: ${errorMessage(error)}`, {
          level: "error",
        });
      }
      if (G.kind === "live")
        G = {
          kind: "retiring",
        };
      if (q === 0) Se();
    },
    resolveTables: (Ee) =>
      rejectIfUnloaded(
        () => G,
        Z,
        () => y.resolveTables(S, Ee),
      ),
    build: (Ee, Ae) =>
      rejectIfUnloaded(
        () => G,
        Z,
        () => y.build(S, Ee, Ae),
      ),
    callInterface: (Ee, Ae) =>
      rejectIfUnloaded(
        () => G,
        Z,
        () => y.callInterface(S, Ee, Ae),
      ),
    press: (Ee, Ae) =>
      rejectIfUnloaded(
        () => G,
        Z,
        () => y.press(S, Ee, Ae),
      ),
    releasePresses: (Ee) => {
      if (G.kind !== "unloaded") y.releasePresses(S, Ee);
    },
  });
  return we;
}
//@ chunk-e6aww6q8.js:3705997-3706009 placement
/**
 * hooks 宿主等待 worker 就绪的默认超时 10 秒；插件自己的 init 可覆盖。
 */
var HOOKS_READY_TIMEOUT_MS = 1e4;
//@ chunk-e6aww6q8.js:3706009-3706161 placement
/**
 * 复制注册子句（模式、matcher 与 caught）。
 */
var copyRegistrations = (e, n) =>
  e.map(({ pattern, matcher, caught }) => ({
    pattern,
    ...(matcher !== undefined && {
      matcher: reviveMatcherDefault(matcher, `${n}: on("${pattern}", matcher)`),
    }),
    ...(caught === true && {
      caught,
    }),
  }));
//@ chunk-e6aww6q8.js:3706161-3706953 placement
/**
 * 重载前重新扫描插件的 hooks 模块并重算层级；组织插件与密封插件有额外限制。
 */
async function rescanHooksModuleArgs(state, n, r) {
  if (r) invalidateCommandNames();
  let pluginStorageId = n.pluginStorageId;
  if (resolveManagedPluginDigests(pluginStorageId) !== undefined) {
    if (r?.modulePath === undefined)
      throw new NotOrganizationPluginError(n.pluginName, "no entry the host holds can be proved");
    return prepareHooksModuleArgs(state, r, r.modulePath);
  }
  if (n.sealed === true)
    throw new NotOrganizationPluginError(
      n.pluginName,
      "a proved module of this name may not come back from disk",
    );
  assertPluginHooksAdmitted(state, {
    pluginName: n.pluginName,
    pluginId: pluginStorageId,
    plugin: r,
  });
  let modulePath = r?.modulePath ?? n.modulePath;
  let S = r?.path ?? n.pluginRoot;
  let w = r?.name ?? n.pluginName;
  let L = await scanHooksModule(modulePath, S, w);
  let { surfaceModules, ...q } = n;
  let surfaceModules_2 = await loadSurfaceModules(L.scan.clients, S, w);
  let Se = {
    ...q,
    ...(surfaceModules_2 !== undefined && {
      surfaceModules: surfaceModules_2,
    }),
  };
  let ke = pluginTier(n.pluginStorageId, getVouchedPolicyPluginIds(), resolveManagedPluginOrder());
  let isPersons = copsSimilar(n.pluginStorageId, getVouchedPolicyPluginIds());
  checkNextToAllowed(w, L.scan, ke);
  checkScanPolicy(w, L.scan, n.pluginStorageId);
  if (!r)
    return {
      ...Se,
      ...L,
      tier: ke,
      isPersons,
    };
  return withOptions(
    {
      ...Se,
      modulePath,
      tier: ke,
      isPersons,
    },
    L,
    await resolvePluginOptions(r),
  );
}
//@ chunk-e6aww6q8.js:3706953-3706989 placement
/**
 * worker 加载上报器
 */
var workersLoadedReporter = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:4053009-4053100 placement
/**
 * 记录加载失败
 */
function logHookLoadFailure(e, n, r) {
  if (!(e instanceof HookAdmissionError)) {
    logFeatureBad("plugin_function_hooks_load", n, classifyPluginOrigin(r));
    logModLoadFailed(r, n);
  }
}
//@ chunk-e6aww6q8.js:4053100-4053221 placement
async function reprepareFromPlugin(e, n) {
  if (n?.modulePath === undefined) return;
  let hooksModuleArgs = await prepareHooksModuleArgs(e.state, n, n.modulePath);
  setKnownArgs(e.state, hooksModuleArgs);
  return hooksModuleArgs;
}
//@ chunk-e6aww6q8.js:4053221-4053303 placement
/**
 * 去掉 “插件名: ” 前缀
 */
function stripPluginPrefix(e, n) {
  let r = errorMessage(n);
  let s = `${e}: `;
  return r.startsWith(s) ? r.slice(s.length) : r;
}
//@ chunk-e6aww6q8.js:4053303-4053389 placement
/**
 * 上报模块加载失败
 */
function reportHookLoadFailure(e, error, r) {
  let s = `hooks module did not load: ${stripPluginPrefix(e, error)}`;
  reportPluginProblem(e, s);
  if (r) reportInlinePluginNotice(r, s);
}
//@ chunk-e6aww6q8.js:4053389-4053425 placement
/**
 * 上报重载失败
 */
function reportReloadFailure(name, error, r) {
  reportHookLoadFailure(name, errorMessage(error) + PREVIOUS_VERSION_UNLOADED, r);
}
//@ chunk-e6aww6q8.js:4053425-4053473 placement
/**
 * 按名字找钩子成员
 */
var findHookMemberByName = (e, n) => e.find((r) => r.name === n[0]?.hook);
//@ chunk-e6aww6q8.js:4062208-4063156 placement
/**
 * 判断加载这组模块时是否需要整组重新折叠 engine.create，返回原因文字（无需则 undefined）。
 */
function describeRefoldReason(e, { live, declaring, kept, leaving, unloaded }) {
  let S = new Map(live.map((ke) => [ke.name, ke]));
  let w = new Map(declaring.map((ke) => [ke.pluginName, ke]));
  let L = new Set([...S.keys(), ...e.state.knownArgs.keys(), ...w.keys()]);
  for (let ke of L) {
    if (kept.has(ke) || unloaded.has(ke)) continue;
    let we = e.state.knownArgs.get(ke);
    let Ee = w.get(ke);
    let scans = [we, Ee].flatMap((ze) => (ze ? [ze.scan] : []));
    let reloadTriggerEvent = findReloadTriggerEvent({
      live: S.get(ke),
      scans,
    });
    if (!reloadTriggerEvent) continue;
    let Me = S.has(ke) || we !== undefined;
    return `${ke} hooks ${reloadTriggerEvent} and ${!Ee ? "leaves" : Me ? "loads afresh" : "joins"}`;
  }
  let G = leaving[0] ?? e.state.crashedWithholders.keys().next().value;
  if (G !== undefined) return `${G} crashed with its withholdings standing`;
  if (e.state.lastEndedBy !== undefined) return `${e.state.lastEndedBy} ended the last fold without next`;
  if (!e.state.isSetRecord) return PARTIAL_REFOLD_TEXT;
  let flattened = live.flatMap((ke) => (kept.get(ke.name) === ke ? [ke.name] : []));
  let flattened_2 = declaring.flatMap((ke) => (kept.has(ke.pluginName) ? [ke.pluginName] : []));
  return flattened.some((ke, we) => flattened_2[we] !== ke) ? "the kept modules change order" : undefined;
}
//@ chunk-e6aww6q8.js:4063156-4063273 placement
function handlesCommandRun(scan, n) {
  return (
    scan.hooks.some((hook) => matchesEventPattern(hook, "command.run")) &&
    (scan.runCommands === undefined || scan.runCommands.includes(n))
  );
}
//@ chunk-e6aww6q8.js:4063273-4063333 placement
/**
 * 该次扫描要重折叠
 */
function needsRefoldScan(scan) {
  return scan.calls.includes("command.register");
}
//@ chunk-e6aww6q8.js:4063376-4063479 placement
/**
 * 取插件适用的准入文本。
 */
function admissionTextFor(e) {
  let admissionText = getPluginRegistry().admissionText;
  if (admissionText === null) return admissionText;
  return e !== undefined && isModuleAdmitted(e) ? admissionText : e?.judgedUnder;
}
//@ chunk-e6aww6q8.js:4063479-4063613 placement
function recordOptionsReloadFailure(e, n, error) {
  e.state.optionsReloadFailures.set(n.name, {
    generation: e.state.generations.get(n.name),
    wanted: pluginOptionsSnapshot(n).text,
    error,
  });
}
//@ chunk-e6aww6q8.js:4063613-4063643 placement
/**
 * 插件提供者层级
 */
var pluginProviderRank = (pluginStorageId) =>
  providerRank(pluginStorageId, getVouchedPolicyPluginIds(), resolveManagedPluginOrder());
//@ chunk-e6aww6q8.js:4063643-4063758 placement
function providerRankOf(e) {
  return e.sealed === true
    ? providerRank(
        e.pluginStorageId,
        withSealedPlugin(e.pluginStorageId, getVouchedPolicyPluginIds()),
        resolveManagedPluginOrder(),
      )
    : pluginProviderRank(e.pluginStorageId);
}
//@ chunk-e6aww6q8.js:4063758-4063869 placement = findReverseDependents (0.826)
/**
 * 插件 n 的 manifest.dependencies 是否引用插件 e。
 */
function findReverseDependents(pluginId, plugins) {
  return (
    plugins !== pluginId &&
    (pluginId.manifest.dependencies ?? []).some((r) =>
      dependencyRefMatches(qualifyDependency(r, pluginId.source), plugins.source, pluginId.source),
    )
  );
}
//@ chunk-e6aww6q8.js:4063869-4064754 placement
/**
 * 按依赖关系对插件做拓扑排序（同层保持原顺序），并找出依赖环。
 */
function orderByDependencies(e, n) {
  let r = new Set(e);
  let s = new Map(e.map((ke) => [ke, uniq(n(ke)).filter((we) => we !== ke && r.has(we))]));
  let h = new Map();
  for (let ke of e) {
    let we = new Set();
    let Ee = [...(s.get(ke) ?? [])];
    for (let Ae = Ee.pop(); Ae; Ae = Ee.pop())
      if (!we.has(Ae)) {
        we.add(Ae);
        Ee.push(...(s.get(Ae) ?? []));
      }
    h.set(ke, we);
  }
  let y = (ke, we) => h.get(ke)?.has(we) === true && h.get(we)?.has(ke) === true;
  let S = [];
  for (let ke of e) {
    let filtered = e.filter((Ae) => Ae === ke || y(ke, Ae));
    if (filtered.length > 1 && filtered[0] === ke) S.push(filtered);
  }
  let w = new Map(
    e.map((ke, we) => [
      ke,
      [...(s.get(ke) ?? []).filter((Ee) => !y(ke, Ee)), ...e.slice(we + 1).filter((Ee) => y(ke, Ee))],
    ]),
  );
  let L = Map.groupBy([...w.values()].flat(), (ke) => ke);
  let G = new Map(e.map((ke) => [ke, L.get(ke)?.length ?? 0]));
  let q = (ke) => G.get(ke) === 0;
  let Z = [];
  let Se = e;
  while (Se.length > 0) {
    let max = Math.max(Se.findIndex(q), 0);
    for (let we of Se.slice(max, max + 1)) {
      Z.push(we);
      for (let Ee of w.get(we) ?? []) G.set(Ee, (G.get(Ee) ?? 0) - 1);
    }
    Se = Se.toSpliced(max, 1);
  }
  return {
    order: Z,
    cycles: S,
  };
}
//@ chunk-e6aww6q8.js:4064754-4065681 placement
/**
 * 按提供者层级与依赖关系排列 hooks 模块顺序，并说明冲突时谁优先。
 */
function orderHooksModules(e, n) {
  let mapped = e.map((S) => ({
    plugin: S,
    ...n(S),
  }));
  let s = new Map(
    mapped.map((S) => {
      let filtered = mapped.filter((L) => findReverseDependents(S.plugin, L.plugin));
      for (let L of filtered) {
        let G = L.rank < S.rank;
        let Z =
          L.tier === S.tier
            ? `placed outside it in the ${L.tier} tier; that place wins`
            : `in the ${L.tier} tier, outside the ${S.tier} tier; tier order wins`;
        if (G)
          logForDebugging(
            `hooks module order: ${S.plugin.source} depends on ${L.plugin.source}, which is ${Z}, so ${L.plugin.source} stays outer`,
            {
              level: "warn",
            },
          );
      }
      return [S, filtered];
    }),
  );
  let h = [];
  for (let S of Map.groupBy(mapped, (w) => w.rank).values()) {
    let w = orderByDependencies(S, (L) => s.get(L) ?? []);
    for (let cycle of w.cycles)
      logForDebugging(
        `hooks module order: ${cycle.map((G) => G.plugin.source).join(", ")} depend on one another in a cycle; that dependency order is refused and they register in the order they were chosen in`,
        {
          level: "error",
        },
      );
    h.push(...w.order.map((L) => L.plugin));
  }
  if (h.some((S, w) => S !== e[w]))
    logForDebugging("hooks module order: dependencies register " + h.map((S) => S.source).join(", "));
  return h;
}
//@ chunk-e6aww6q8.js:4065681-4066023 placement
/**
 * 让密封插件按指定顺序排在其他插件前面。
 */
function orderSealedModules(e, n) {
  if (!e.some((h) => h.sealed === true)) return e;
  let s = new Map(e.map((h) => [h.pluginName, h]));
  return orderHooksModules(
    e.toSorted((h, y) => providerRankOf(h) - providerRankOf(y)).flatMap((h) => n.get(h.pluginName) ?? []),
    (h) => {
      let y = s.get(h.name);
      if (y === undefined) throw Error("a plugin was placed with no declaration");
      return {
        rank: providerRankOf(y),
        tier: y.tier,
      };
    },
  ).flatMap((h) => s.get(h.name) ?? []);
}
//@ chunk-e6aww6q8.js:4066023-4066254 placement
function logModsBackOn(e, n) {
  let { modsOffAt } = e.state;
  let s = count(n, (h) => builtinModuleOf(h.args) === undefined);
  if (modsOffAt === undefined || s === 0) return;
  e.state.modsOffAt = undefined;
  logFeatureOk("plugin_function_hooks_worker_mods", {
    off_s: Math.max(0, Math.floor((Date.now() - modsOffAt) / SLOW_HOOK_REPORT_INTERVAL_MS_2)),
    worker_mods: s,
  });
}
//@ chunk-e6aww6q8.js:4066254-4066278 placement
/**
 * import( 检测
 */
var DYNAMIC_IMPORT_RE = /\bimport\s*\(/;
//@ chunk-e6aww6q8.js:4066321-4066445 placement
/**
 * 判断已加载模块的参数与展示是否与新的完全一致（且源码不含动态 import），可复用。
 */
function isModuleUnchanged(e, n, r) {
  return (
    !DYNAMIC_IMPORT_RE.test(n.source) &&
    !n.linked.some((s) => DYNAMIC_IMPORT_RE.test(s.source)) &&
    isDeepStrictEqual(e.args, n) &&
    isDeepStrictEqual(e.shown, shownPluginInfo(n, r))
  );
}
//@ chunk-e6aww6q8.js:4066445-4066512 placement
/**
 * same-thread 或 worker
 */
var hookHostKind = () => (env.CLAUDE_CODE_HOOKS_SAME_THREAD ? "same-thread" : "worker");
//@ chunk-e6aww6q8.js:4066512-4066751 placement
function reusableLoadedModule(e, hooksModuleArgs, r) {
  let found = getPluginRegistry().loadedModules.find(
    (loadedModule) => loadedModule.name === hooksModuleArgs.pluginName,
  );
  let environmentHost = e.state.environmentHost;
  return found !== undefined &&
    found.status().kind === "live" &&
    (found.hopKey === e.state.nativeHost ||
      (found.hopKey === environmentHost && environmentHost.kind === hookHostKind())) &&
    isModuleUnchanged(found, hooksModuleArgs, r) &&
    isModuleAdmitted(found)
    ? found
    : undefined;
}
//@ chunk-e6aww6q8.js:4066751-4066961 placement
function uiResolveEnvironments(e, n, r) {
  let s = [];
  for (let h of e) {
    if (
      h === n ||
      !h.hooks("ui.resolve") ||
      !isModuleAdmitted(h) ||
      h.status().kind !== "live" ||
      h.hopKey !== n.hopKey
    )
      continue;
    if (!moduleMatcherAdmits(h, "ui.resolve", r)) continue;
    s.push(h.environmentId);
  }
  return s;
}
//@ chunk-e6aww6q8.js:4066961-4067284 placement
/**
 * 让每个活动模块重新解析各 UI 组件的元素表（考虑其他模块的 ui.resolve 钩子），失败时保留旧表。
 */
async function resolveElementTables(e) {
  await Promise.all(
    e
      .filter((n) => n.status().kind === "live")
      .map((n) =>
        n
          .resolveTables(
            TUi.map((r) => ({
              surface: r.surface,
              component: r.component,
              environments: uiResolveEnvironments(e, n, r),
            })),
          )
          .catch((error) => {
            logForDebugging(
              `hooks module ${n.label}: its element tables were not resolved (${errorMessage(error)}); it keeps the ones it had`,
              {
                level: "error",
              },
            );
          }),
      ),
  );
}
//@ chunk-e6aww6q8.js:4067284-4072469 placement
/**
 * 加载声明的整组 hooks 模块：未变的保留、变化的全量重载，并记录失败与遥测。
 */
async function loadHooksModuleSet(e, n, r) {
  let pluginRegistry = getPluginRegistry();
  let loadedModules = pluginRegistry.loadedModules;
  let y = (pluginName) =>
    r.judgedUnder === undefined
      ? admissionTextFor(loadedModules.find((loadedModule) => loadedModule.name === pluginName))
      : r.judgedUnder;
  let S = new Set(loadedModules.map((loadedModule) => loadedModule.name));
  admissionChangedListener.set(() => {
    invalidateAllHookedCaches();
    publishRenderPlugins(e);
  });
  let w = new Map();
  let L = [];
  let G = new Map();
  let q = new Set(e.state.knownArgs.keys());
  let Z = new Set();
  e.state.unattributedCrashes = 0;
  let Se = new Set(n.map((rn) => rn.name));
  for (let rn of n) {
    if (rn.modulePath === undefined) continue;
    w.set(rn.name, rn);
    try {
      let hooksModuleArgs = await prepareHooksModuleArgs(e.state, rn, rn.modulePath);
      let no = reusableLoadedModule(e, hooksModuleArgs, rn);
      if (no !== undefined) G.set(no.name, no);
      L.push(no?.args ?? hooksModuleArgs);
    } catch (error) {
      let no = error instanceof NotOrganizationPluginError || error instanceof HookAdmissionRefusal;
      if (no) w.delete(rn.name);
      if (error instanceof HookAdmissionRefusal) {
        logForDebugging(errorWithCause(error));
        continue;
      }
      logHookLoadFailure(error, "declaration_failed", {
        pluginStorageId: marketplaceSource(rn),
        pluginRoot: rn.path,
      });
      logForDebugging(`hooks module ${hookPluginLabel(rn)} failed to load: ` + errorWithCause(error), {
        level: "error",
      });
      if (!no) recordOptionsReloadFailure(e, rn, error);
      if (S.has(rn.name)) reportReloadFailure(rn.name, error, rn);
      else reportHookLoadFailure(rn.name, error, rn);
    }
  }
  L.splice(0, 1 / 0, ...orderSealedModules(L, w));
  r.scans = L.map((rn) => rn.scan);
  r.read.resolve();
  e.state.loadingRead.emit();
  let order = L.map((rn) => rn.pluginName);
  let we = new Set(order);
  let Ee = new Set(
    L.flatMap((rn) => {
      let pn = e.state.unloadedSteps.get(rn.pluginName);
      return pn !== undefined &&
        isModuleUnchanged(pn, rn, w.get(rn.pluginName)) &&
        isDeepStrictEqual(
          pn.order,
          order.filter((hn) => pn.order.includes(hn)),
        )
        ? [rn.pluginName]
        : [];
    }),
  );
  let Ae = (rn) => G.get(rn.name) === rn;
  let filtered = [...e.state.crashedWithholders.keys()].filter((key) => !Se.has(key));
  for (let rn of filtered) {
    e.state.crashedWithholders.delete(rn);
    e.state.withholdings.delete(rn);
  }
  function Me() {
    let rn = new Set([...q].filter((no) => !e.state.knownArgs.has(no)));
    e.state.knownPlugins.clear();
    for (let [no, hn] of w) e.state.knownPlugins.set(no, hn);
    for (let no of L) if (!rn.has(no.pluginName) && !Z.has(no.pluginName)) setKnownArgs(e.state, no);
    let pn = new Set([
      ...[...e.state.crashedWithholders.keys()].filter((key) => !Se.has(key)),
      ...[...e.state.knownArgs.keys()].filter((key) => Z.has(key) || !we.has(key)),
    ]);
    for (let no of pn) forgetPlugin(no, e);
    if (pn.size > 0) liftWithholdings(e.state, pn);
  }
  function We(admitted) {
    for (let pn of admitted) if (!Ae(pn)) pn.discard();
    Me();
  }
  function ze(admitted) {
    let loadedModules = pluginRegistry.loadedModules;
    let no = new Set(admitted);
    let hn = new Set(admitted.map((ho) => ho.name));
    pluginRegistry.loadedModules = admitted;
    for (let ho of admitted) e.state.crashedWithholders.delete(ho.name);
    Me();
    for (let loadedModule of loadedModules) {
      if (!no.has(loadedModule)) loadedModule.retire();
      if (!hn.has(loadedModule.name)) {
        forgetMcpServerFor(loadedModule.name);
        forgetMcpConnectsFor(loadedModule.name);
        forgetCachedDescribe(loadedModule.name);
        forgetRegisteredAgent(loadedModule.name);
        let yn = e.state.unloadedSteps.get(loadedModule.name);
        if (yn !== undefined && Ee.has(loadedModule.name))
          reportReloadFailure(
            loadedModule.name,
            engineCreateFailedError(loadedModule.name, {
              stage: "engine.create",
              reason: yn.reason,
            }),
            w.get(loadedModule.name),
          );
      }
    }
    publishRenderPlugins(e);
    logModsBackOn(e, admitted);
    if (loadedModules.length !== 0 || admitted.length !== 0) invalidateAllHookedCaches();
    noteWorkersLoaded(admitted);
    e.state.isSetRecord = true;
  }
  if (w.size === 0) {
    resetWithholdings(e.state);
    ze([]);
    return;
  }
  let filtered_2 = L.filter((rn) => !Ee.has(rn.pluginName));
  let filtered_3 = loadedModules.filter((loadedModule) => !Ee.has(loadedModule.name));
  let nt =
    filtered.length === 0 &&
    [...e.state.knownArgs.keys()].every((key) => we.has(key)) &&
    filtered_2.length === filtered_3.length &&
    filtered_2.every((rn, pn) => G.get(rn.pluginName) === filtered_3[pn]);
  if (!nt) Ee.clear();
  if (e.state.isSetRecord && nt && filtered_3.length === loadedModules.length) {
    Me();
    let joined = loadedModules.map((loadedModule) => loadedModule.name).join(", ");
    logForDebugging(`hooks modules unchanged, kept as loaded: ${joined}`);
    return;
  }
  let yt =
    G.size === 0
      ? undefined
      : describeRefoldReason(e, {
          live: loadedModules,
          declaring: L,
          kept: G,
          leaving: filtered,
          unloaded: Ee,
        });
  if (yt !== undefined) {
    G.clear();
    logForDebugging(`hooks modules reloaded in full: ${yt}`);
  }
  let flattened = L.flatMap((rn) => G.get(rn.pluginName) ?? []);
  let At = new Set(flattened.map((rn) => rn.name));
  let It = new Set(
    [...loadedModules.map((loadedModule) => loadedModule.name), ...q, ...order].filter((rn) => !At.has(rn)),
  );
  let Yt = new Set();
  let qt = new Set(At);
  let Zt = new Map();
  e.state.isSetRecord = false;
  try {
    for (;;) {
      let rn = [];
      for (let Xn of L) {
        if (At.has(Xn.pluginName) || Z.has(Xn.pluginName) || Yt.has(Xn.pluginName) || Ee.has(Xn.pluginName))
          continue;
        q.add(Xn.pluginName);
        setKnownArgs(e.state, Xn);
        try {
          let To = await describeHooksModuleState(e, Xn);
          To.shown = shownPluginInfo(Xn, w.get(Xn.pluginName));
          To.judgedUnder = y(Xn.pluginName);
          rn.push(To);
          e.state.unadmitted.add(To.environmentId);
          Zt.set(To.environmentId, To);
          bumpGeneration(Xn.pluginName, e);
          logFeatureOk("plugin_function_hooks_load", classifyPluginOrigin(Xn));
          logForDebugging(
            `hooks module ${To.label} loaded (${To.hopKey.kind}, environment ${To.environmentId}, tier ${To.tier}); events: ` +
              joinedKeys(To.patterns),
          );
        } catch (error) {
          Yt.add(Xn.pluginName);
          logHookLoadFailure(error, "module_load_failed", Xn);
          logForDebugging(`hooks module ${pluginStorageKey(Xn)} failed to load: ` + errorWithCause(error), {
            level: "error",
          });
          if (abandonIfWorkerDied(e, rn, "the load")) {
            Me();
            return;
          }
          let bo = w.get(Xn.pluginName);
          if (S.has(Xn.pluginName)) reportReloadFailure(Xn.pluginName, error, bo);
          else reportHookLoadFailure(Xn.pluginName, error, bo);
        }
      }
      if (At.size > 0) {
        let joined = [...At].join(", ");
        logForDebugging(`hooks modules kept as loaded, unchanged: ${joined}`);
      }
      let pn = At.size === 0;
      let engineApi = await buildEngineApi(
        e,
        rn,
        pn
          ? foldBaseForRespawn(
              e,
              rn.map((Xn) => Xn.name),
            )
          : foldBaseWithout_2(e.state, It, order),
      );
      if (e.state.environmentHost?.died !== undefined) {
        We(engineApi);
        return;
      }
      let hn = new Map([...engineApi, ...flattened].map((Xn) => [Xn.name, Xn]));
      let { admitted, refused } = await admitBuiltModules(e, {
        built: order.flatMap((Xn) => hn.get(Xn) ?? []),
        plugins: w,
        seated: qt,
        serving: S,
      });
      for (let Xn of refused) Z.add(Xn.name);
      if (e.state.environmentHost?.died !== undefined) {
        We(admitted);
        return;
      }
      let filtered = refused.filter((Xn) => Xn.hooks("engine.create"));
      if (filtered.length !== 0) {
        logForDebugging(
          `hooks modules ${joinLabels(filtered)} refused after the engine.create fold ran with them; the set folds again without`,
        );
        for (let Xn of admitted) {
          qt.add(Xn.name);
          if (!Ae(Xn)) Xn.discard();
        }
        continue;
      }
      for (let Xn of rn)
        if (!engineApi.includes(Xn)) {
          let fo = engineCreateFailedError(Xn.name, e.state.buildFailures.get(Xn.name));
          if (S.has(Xn.name)) reportReloadFailure(Xn.name, fo, w.get(Xn.name));
          else reportHookLoadFailure(Xn.name, fo, w.get(Xn.name));
          logModLoadFailed(Xn.args, "fold_failed");
        }
      await runWhileAdmitting(e, admitted, () => resolveElementTables(admitted));
      if (e.state.environmentHost?.died !== undefined) {
        We(admitted);
        return;
      }
      ze(admitted);
      return;
    }
  } finally {
    e.state.admitting = undefined;
    for (let [rn, pn] of Zt) if (e.state.unadmitted.has(rn)) pn.discard();
  }
}
//@ chunk-e6aww6q8.js:4072469-4072580 placement
function isLaterPlugin(e, n) {
  let r = [...n.state.knownPlugins.keys()];
  let index = r.indexOf(e);
  return (h) => index !== -1 && r.indexOf(h.name) > index;
}
//@ chunk-e6aww6q8.js:4072580-4072604 placement
/**
 * 取参数的层级
 */
var providerRankOfArgs = (e) => providerRankOf(e.args);
//@ chunk-e6aww6q8.js:4072604-4072714 placement
function needsFullReload(e, n, live) {
  let s = n.state.knownArgs.get(e);
  return (
    findReloadTriggerEvent({
      live,
      scans: s ? [s.scan] : [],
    }) !== undefined || isCrashedOrWithholding(e, n)
  );
}
//@ chunk-e6aww6q8.js:4072714-4072797 placement
/**
 * 逐个退役模块并收集错误
 */
function retireModules(e) {
  let n = [];
  for (let r of e)
    try {
      r.retire();
    } catch (error) {
      n.push(error);
    }
  return n;
}
//@ chunk-e6aww6q8.js:4072797-4073208 placement
/**
 * 某插件使 hooks worker 崩溃时：记遥测、报告插件问题（列出仍保持扣留的 $ 名称）并发出失败事件。
 */
function reportWorkerCrash({ state }, n, { reason, fields }) {
  let h = state.knownArgs.get(n);
  if (h === undefined) return;
  logFeatureBad("plugin_function_hooks_load", "crashed_worker", {
    ...classifyPluginOrigin(h),
    ...fields,
  });
  let mapped = withheldNounsOf(state, n).map((w) => `$.${w}`);
  let S = mapped.length > 0;
  reportPluginProblem(
    n,
    `${n} was unloaded: it crashed the hooks worker` +
      (S ? `; what it withheld (${mapped.join(", ")}) stays withheld until it reloads or is disabled` : ""),
  );
  emit({
    plugin: n,
    event: "*",
    reason,
    effect: PLUGIN_UNLOADED_TEXT,
    hasOverrun: false,
  });
}
//@ chunk-e6aww6q8.js:4073208-4073829 placement
/**
 * 卸载一组 hooks 模块，记录退役时抛出的错误。
 */
async function unloadHooksModules(e, n, r) {
  let s = typeof r === "string" ? undefined : r;
  let pluginRegistry = getPluginRegistry();
  let filtered = pluginRegistry.loadedModules.filter((loadedModule) => n.has(loadedModule.name));
  let filtered_2 = pluginRegistry.loadedModules.filter((loadedModule) => !n.has(loadedModule.name));
  let any = [...n].some((q) =>
    needsFullReload(
      q,
      e,
      filtered.find((Z) => Z.name === q),
    ),
  );
  pluginRegistry.loadedModules = filtered_2;
  if (any) e.state.isSetRecord = false;
  for (let q of n) {
    if (s !== undefined) reportWorkerCrash(e, q, s);
    forgetPlugin(q, e);
  }
  if (s !== undefined) reportWorkerCrashWithholdings(e.state, n);
  else liftWithholdings(e.state, n);
  let G = retireModules(filtered);
  publishRenderPlugins(e);
  invalidateAllHookedCaches();
  noteWorkersLoaded(pluginRegistry.loadedModules);
  logForDebugging(
    `hooks modules unloaded: ${[...n].map((q) => filtered.find((Z) => Z.name === q)?.label ?? q).join(", ")} (${s?.reason ?? r})`,
  );
  await resolveElementTables(filtered_2);
  invalidateAll();
  if (G.length > 0)
    throw AggregateError(G, "a hooks module threw as it retired: " + G.map(errorMessage).join("; "));
}
//@ chunk-e6aww6q8.js:4073829-4073968 placement
async function withUnadmitted(e, n, r) {
  e.state.unadmitted.add(n.environmentId);
  try {
    return await r();
  } finally {
    e.state.unadmitted.delete(n.environmentId);
  }
}
//@ chunk-e6aww6q8.js:4073968-4074080 placement
function insertionIndex(e, n, r) {
  let index = e.findIndex((h) => r.rank(h) > n || (r.rank(h) === n && r.isBeneath(h)));
  return index === -1 ? e.length : index;
}
//@ chunk-e6aww6q8.js:4074080-4074165 placement
/**
 * 按层级插入模块
 */
function insertByRank(loadedModules, n, r) {
  let s = insertionIndex(loadedModules, r.rank(n), r);
  return [...loadedModules.slice(0, s), n, ...loadedModules.slice(s)];
}
//@ chunk-e6aww6q8.js:4074165-4076943 placement
/**
 * 按名字重载一个 hooks 模块；worker 中途死亡、模块被移出声明集等情况都给出原因。
 */
async function reloadHooksModuleByName(e, n) {
  let pluginRegistry = getPluginRegistry();
  let live = pluginRegistry.loadedModules.find((loadedModule) => loadedModule.name === e);
  let h = n.state.knownPlugins.get(e);
  let y = live?.args ?? n.state.knownArgs.get(e) ?? (await reprepareFromPlugin(n, h));
  if (!y) throw new HooksError(`no hooks module named ${e} is loaded or declared`);
  let S = y;
  let w = (died) =>
    `${e}: the hooks worker died during the reload (${died}); the respawn reloads the declared set`;
  function L(Et) {
    if (!n.state.knownArgs.has(e))
      throw new HooksError(
        `${e}: unloaded while its reload ${Et} (` +
          (n.state.environmentHost?.died ?? "it left the declared set") +
          "); not reloaded",
      );
  }
  let G = await rescanHooksModuleArgs(n.state, y, h);
  L("read its args");
  let startTime = performance.now();
  let loadedModules = pluginRegistry.loadedModules;
  let Se =
    needsFullReload(e, n, live) ||
    findReloadTriggerEvent({
      live: undefined,
      scans: [G.scan],
    }) !== undefined;
  n.state.isSetRecord = n.state.isSetRecord && !Se;
  let ke = {
    rank: providerRankOfArgs,
    isBeneath: isLaterPlugin(e, n),
  };
  let we = live ? loadedModules.indexOf(live) : insertionIndex(loadedModules, providerRankOf(G), ke);
  let Ee = await judgePluginRegister({
    args: G,
    plugin: h,
    judges: registerJudges({
      before: loadedModules.slice(0, we),
      after: loadedModules.slice(live ? we + 1 : we),
      isNative: Boolean(builtinModuleOf(G)),
      tier: G.tier,
    }),
  });
  if (Ee) {
    let Et = describeRegisterRefusal(Ee) + (live ? PREVIOUS_VERSION_UNLOADED : "");
    let yt = new Set([e]);
    if (live) await unloadHooksModules(n, yt, Et);
    else {
      forgetPlugin(e, n);
      liftWithholdings(n.state, yt);
    }
    return {
      refused: Et,
      ms: performance.now() - startTime,
    };
  }
  L("was admitted");
  n.state.knownArgs.set(e, G);
  let Ae;
  let Ie;
  let Me = foldBaseWithout(n.state, e);
  let We = lastFoldSummary(n.state);
  let ze = n.state.withholdings.get(e);
  function lt() {
    if (n.state.knownArgs.has(e)) n.state.knownArgs.set(e, S);
    if (ze) n.state.withholdings.set(e, ze);
    else n.state.withholdings.delete(e);
    recordRefoldResult(n.state, We);
  }
  try {
    Ae = await describeHooksModuleState(n, G);
    Ae.shown = shownPluginInfo(G, h);
    Ae.judgedUnder = admissionTextFor(live);
    [Ie] = await withUnadmitted(n, Ae, () => buildEngineApi(n, [Ae], Me));
  } catch (error) {
    lt();
    throw error;
  }
  if (!Ie) {
    lt();
    let any = [...n.state.buildFailures.keys()].some((key) => key !== e);
    if (any) {
      let qt = {
        scans: undefined,
        read: Promise.withResolvers(),
        judgedUnder: undefined,
      };
      n.state.loading.add(qt);
      await loadHooksModuleSet(n, [...n.state.knownPlugins.values()], qt).finally(() => {
        n.state.loading.delete(qt);
        qt.read.resolve();
        n.state.loadingRead.emit();
      });
    }
    let died = n.state.environmentHost?.died;
    let found = pluginRegistry.loadedModules.find(
      (loadedModule) => any && died === undefined && loadedModule.name === e,
    );
    if (found !== undefined) {
      let qt = performance.now() - startTime;
      logForDebugging(
        `hooks module ${found.label} reloaded with the whole set in ${qt.toFixed(1)}ms; events: ` +
          joinedKeys(found.patterns),
      );
      return {
        events: [...found.patterns],
        ms: qt,
      };
    }
    let At = n.state.buildFailures.get(e);
    let It = any && At === undefined;
    let Yt = any && live !== undefined;
    throw new HooksError(
      died === undefined
        ? `${e}: ` +
            (It
              ? "not loaded by the fold of the whole set"
              : `${At?.stage ?? "engine.create"} failed on reload` +
                (At === undefined ? "" : ` (${At.reason})`)) +
            (Yt ? PREVIOUS_VERSION_UNLOADED : "")
        : w(died),
    );
  }
  let Je = live
    ? pluginRegistry.loadedModules.map((loadedModule) => (loadedModule === live ? Ae : loadedModule))
    : insertByRank(pluginRegistry.loadedModules, Ae, ke);
  await resolveElementTables(Je);
  let died = n.state.environmentHost?.died;
  if (died !== undefined) {
    lt();
    throw new HooksError(w(died));
  }
  pluginRegistry.loadedModules = Je;
  n.state.unloadedSteps.clear();
  live?.retire();
  n.state.crashedWithholders.delete(e);
  bumpGeneration(e, n);
  publishRenderPlugins(n);
  logModsBackOn(n, [Ae]);
  invalidateAllHookedCaches();
  forgetSessionStartCall(e);
  noteWorkersLoaded(pluginRegistry.loadedModules);
  let pt = performance.now() - startTime;
  logForDebugging(
    `hooks module ${Ae.label} reloaded in ${pt.toFixed(1)}ms; events: ` + joinedKeys(Ae.patterns),
  );
  return {
    events: [...Ae.patterns],
    ms: pt,
  };
}
//@ chunk-e6aww6q8.js:4076943-4076964 placement
/**
 * 重载失败错误类
 */
class ReloadFailedError extends HooksError {}
//@ chunk-e6aww6q8.js:4076964-4077156 placement
/**
 * 执行重载，失败时包装为说明插件仍在旧版本运行的错误。
 */
async function wrapReloadError(e, n) {
  let pluginRegistry = getPluginRegistry();
  let found = pluginRegistry.loadedModules.find((loadedModule) => loadedModule.name === e);
  try {
    return await n();
  } catch (error) {
    throw found?.status().kind === "live" && pluginRegistry.loadedModules.includes(found)
      ? new ReloadFailedError(errorMessage(error), {
          cause: error,
        })
      : error;
  }
}
//@ chunk-e6aww6q8.js:4077156-4077210 placement
/**
 * 排队重载模块
 */
var queueReload = (e, n) => n.state.queue(() => wrapReloadError(e, () => reloadHooksModuleByName(e, n)));
//@ chunk-e6aww6q8.js:4077210-4077474 placement
/**
 * 开始加载一批模块：设置重载器并登记加载状态。
 */
function startLoadingModules(hooksHost, n, judgedUnder) {
  workerSlots.setReloader((h) => queueReload(h, hooksHost));
  isStoredLoginPinned();
  let s = {
    scans: undefined,
    read: Promise.withResolvers(),
    judgedUnder,
  };
  hooksHost.state.loading.add(s);
  return hooksHost.state
    .queue(() => loadHooksModuleSet(hooksHost, n, s))
    .finally(() => {
      hooksHost.state.loading.delete(s);
      s.read.resolve();
      hooksHost.state.loadingRead.emit();
    });
}
//@ chunk-e6aww6q8.js:4077474-4077561 placement
/**
 * 等待所有模块读取
 */
async function waitForModuleReads(hooksHost) {
  await Promise.all([...hooksHost.state.loading].map((n) => n.read.promise));
}
//@ chunk-e6aww6q8.js:4077561-4077663 placement
/**
 * 判断正在加载的模块中是否有处理某 command.run 的。
 */
function isLoadingCommandRun(hooksHost, n) {
  return [...hooksHost.state.loading].some(
    (r) => r.scans === undefined || r.scans.some((scan) => handlesCommandRun(scan, n)),
  );
}
//@ chunk-e6aww6q8.js:4077663-4077809 placement
/**
 * 判断正在加载或已知的模块中是否有处理任何 command.run 的。
 */
function isLoadingAnyCommandRun(hooksHost) {
  return (
    [...hooksHost.state.loading].some((n) => n.scans === undefined || n.scans.some(needsRefoldScan)) ||
    [...hooksHost.state.knownArgs.values()].some((knownArg) => needsRefoldScan(knownArg.scan))
  );
}
//@ chunk-e6aww6q8.js:4077809-4077986 placement
/**
 * 列出插件 hooks 模块的文件。
 */
function hooksModuleFilesOf(e, hooksHost) {
  let r = loadedModuleArgs(e) ?? hooksHost.state.knownArgs.get(e);
  if (r) return hooksModuleFiles(r).map((y) => y.file);
  let s = hooksHost.state.knownPlugins.get(e);
  return s !== undefined && s.modulePath === undefined ? [] : undefined;
}
//@ chunk-e6aww6q8.js:4077986-4078339 placement
/**
 * 卸载已被禁用或卸载的插件的 hooks 模块（排队执行）。
 */
var unloadDisabledPlugins = (hooksHost, n) =>
  hooksHost.state.queue(async () => {
    function r(h) {
      let y = hooksHost.state.knownPlugins.get(h);
      if (y === undefined) return storageIdOf(hooksHost.state, h);
      return marketplaceSource(y);
    }
    let s = new Set(
      [...hooksHost.state.knownArgs.keys(), ...hooksHost.state.knownPlugins.keys()].filter(
        (h) => !n.has(r(h)),
      ),
    );
    if (s.size === 0) return;
    for (let h of s) hooksHost.state.knownPlugins.delete(h);
    await unloadHooksModules(hooksHost, s, "plugin disabled or uninstalled");
  });
//@ chunk-e6aww6q8.js:4078382-4079470 placement
/**
 * 插件选项（options）状态文案：不能解析、被扣留、失败、已重载、被拒绝。
 */
var HOOKS_OPTIONS_STATUS_TEXT = (hooksHost, n) =>
  hooksHost.state.queue(async () => {
    let optionsReloadFailures = hooksHost.state.optionsReloadFailures;
    let brokenTrustedSetting = findBrokenTrustedSetting();
    let reason = `${brokenTrustedSetting} does not parse; options not read`;
    async function y(w, serverName) {
      if (!(Object.keys(serverName.manifest.userConfig ?? {}).length > 0)) return;
      if (brokenTrustedSetting !== undefined)
        return {
          name: w,
          kind: "held",
          reason,
        };
      let q = pluginOptionsSnapshot(serverName);
      let Z =
        getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === w)?.args ??
        hooksHost.state.knownArgs.get(w);
      if (Z !== undefined && isDeepStrictEqual(q.options, pickNonSensitiveOptions(Z.options, serverName))) {
        optionsReloadFailures.delete(w);
        return;
      }
      let ke = optionsReloadFailures.get(w);
      let we = hooksHost.state.generations.get(w);
      if (ke !== undefined && ke.wanted === q.text && (Z === undefined || ke.generation === we))
        return {
          name: w,
          kind: "failing",
          error: ke.error,
        };
      try {
        let Ae = await n(w);
        if (Ae.refused === undefined) {
          optionsReloadFailures.delete(w);
          return {
            name: w,
            kind: "reloaded",
            result: Ae,
            recovers: ke !== undefined,
          };
        }
        optionsReloadFailures.set(w, {
          generation: hooksHost.state.generations.get(w),
          wanted: q.text,
          error: new HooksError(Ae.refused),
        });
        return {
          name: w,
          kind: "refused",
          result: Ae,
        };
      } catch (error) {
        optionsReloadFailures.set(w, {
          generation: we,
          wanted: q.text,
          error,
        });
        return {
          name: w,
          kind: "failed",
          error,
        };
      }
    }
    for (let key of optionsReloadFailures.keys())
      if (!hooksHost.state.knownPlugins.has(key)) optionsReloadFailures.delete(key);
    let S = [];
    for (let [w, L] of hooksHost.state.knownPlugins) {
      let G = await y(w, L);
      if (G !== undefined) S.push(G);
    }
    return S;
  });
//@ chunk-e6aww6q8.js:4079513-4079732 placement
/**
 * 合并插件记录：清单与 hooks 配置未变时保留原记录。
 */
function mergePluginRecord(e, n) {
  let r = {
    ...n.manifest,
    name: e.manifest.name,
  };
  return e.modulePath === n.modulePath &&
    isDeepStrictEqual(e.manifest, r) &&
    isDeepStrictEqual(e.hooksConfig, n.hooksConfig)
    ? e
    : {
        ...e,
        manifest: r,
        hooksConfig: n.hooksConfig,
        modulePath: n.modulePath,
      };
}
//@ chunk-e6aww6q8.js:4079732-4080103 placement
/**
 * 重新读取已知插件记录（排队执行），manifest 不再指定 hooks 模块时卸载；返回前后的模块路径。
 */
var retargetKnownPlugin = (e, hooksHost, r) =>
  hooksHost.state.queue(async () => {
    let s = hooksHost.state.knownPlugins.get(e);
    if (s === undefined) return;
    let h = await wrapReloadError(e, () => r(s));
    let y =
      getPluginRegistry().loadedModules.some((loadedModule) => loadedModule.name === e) ||
      hooksHost.state.knownArgs.has(e);
    hooksHost.state.knownPlugins.set(e, mergePluginRecord(s, h));
    if (h.modulePath === undefined && y)
      await unloadHooksModules(hooksHost, new Set([e]), "its manifest names no hooks module now");
    return {
      before: s.modulePath,
      now: h.modulePath,
    };
  });
//@ chunk-e6aww6q8.js:4080103-4080272 placement
/**
 * 记录 worker 中 mods 被关闭（数量与时间）。
 */
function logModsTurnedOff(e, n) {
  let r = count(n, (s) => builtinModuleOf(s) !== undefined);
  e.state.modsOffAt = Date.now();
  logFeatureBad("plugin_function_hooks_worker_mods", "turned_off", {
    worker_mods: n.length - r,
    native_mods: r,
  });
}
//@ chunk-e6aww6q8.js:4116682-4117078 placement
var {
  loadHooksModules,
  mayHookCommand,
  mayRegisterCommands,
  loadingScansRead,
  onLoadingScansRead,
  pruneHooksModules,
  reloadHooksModule,
  retryUnloadedModules,
  refreshOptions,
  retargetHooksModule,
  loadedFilesOf,
  buildInterfaces,
  routeInterfaceCall,
  runHostOp,
  retireEnvironmentHost,
  opsDelivered,
  workInFlight,
  applyPendingInvalidations,
} = initHooksHost();
export {
  workersLoadedReporter,
  flushDeferredProblems,
  retryUnloadedModules,
  opsDelivered,
  applyPendingInvalidations,
  loadingScansRead,
  mayRegisterCommands,
  mayHookCommand,
  onLoadingScansRead,
  loadHooksModules,
  loadedPluginOptions,
  workInFlight,
  loadSurfaceModules,
  mergePluginRecord,
  refreshAgentsAndDefinitions,
  inlineProblemsSeen,
  orderHooksModules,
  reportInlinePluginNotice,
  pruneHooksModules,
  refreshOptions,
  HOOKS_READY_TIMEOUT_MS,
  registeredAgentsTable,
  toolNameOfCall,
  notLoadedWithinText,
  copyRegistrations,
  forgetRegisteredAgent,
  pluginOptionsSnapshot,
  reportUnmatchedHookRegistrations,
  findHookMemberByName,
  logHookLoadFailure,
  builtinModuleOf,
  logModsTurnedOff,
  isModuleUnchanged,
  describeHooksModuleState,
  admissionTextFor,
  errorWithCause,
  resolveElementTables,
  reportWorkerCrash,
  bindAsyncResource,
  unloadHooksModules,
  hookHostKind,
  validateHooksModuleExports,
  withInFlightDispatches,
  waitForModuleReads,
  isLoadingAnyCommandRun,
  startLoadingModules,
  isLoadingCommandRun,
  unloadDisabledPlugins,
  queueReload,
  HOOKS_OPTIONS_STATUS_TEXT,
  wrapReloadError,
  reloadHooksModuleByName,
  retargetKnownPlugin,
  hooksModuleFilesOf,
  stripPluginPrefix,
  ReloadFailedError,
  hostStateRef,
  retargetHooksModule,
  findReverseDependents,
  loadedFilesOf,
  reloadHooksModule,
};
