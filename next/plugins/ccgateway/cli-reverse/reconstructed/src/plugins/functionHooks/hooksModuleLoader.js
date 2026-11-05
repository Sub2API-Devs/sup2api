/**
 * plugins/functionHooks/hooksModuleLoader.ts
 *
 * 2.1.316 新增：插件 hooks 模块的加载、重载、卸载与顺序编排
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (95)
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
import { pluginTier, createWithheldElementWarner, NO_FLOORS } from "./dispatch/chain.js";
import { hasSimilarMarketplaceRef } from "../../utils/plugins/marketplaceNames.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { currentSurfaceBinding, surfaceComposer } from "./surfaceBinding.js";
import { isModuleAdmittedByName } from "../../services/mcp/mcpClientCapabilities.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logError } from "../../utils/log.js";
import { vmCreateElement, vmFragment } from "./vm/boundaryCopy.js";
import { isBuiltinPluginId, getBuiltinPlugin } from "../builtinPlugins.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { buildElementTable } from "./ui/elements.js";
import { createSurfaceAnswerCache, cachedResolveAnswer, noStreamingOps } from "./vm/moduleLoader.js";
import { registerHooksModule } from "./api/register.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
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
import { countWhere } from "../../utils/collections.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS_2 } from "./dispatch/slowHookReports.js";
import { RENDER_SITE_PAIRS } from "./ui/renderSites.js";
import { clearBackdropFor } from "./sessionApi.js";
import { forgetMcpServerFor } from "./mcpServerHooks.js";
import { forgetMcpConnectsFor } from "./mcpApi.js";
import { noteWorkersLoaded, workerSlots, storageIdOf } from "./apiDispatch.js";
import { emit } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { invalidateAll } from "./ui/renderInstances.js";
import { forgetSessionStartCall } from "./promptApi.js";
import { isStoredLoginPinned } from "../../cli/headlessCloud/attachServe.js";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:744475-744510 placement
/**
 * 内联问题去重集
 */
var inlineProblemsSeen; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:744475", () => {
  inlineProblemsSeen = identity_2(new Set(), (set) => set.clear());
});
//@ chunk-5xgkngpb.js:744510-744543 placement
/**
 * 延迟输出的问题行
 */
var deferredProblemLines; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:744510", () => {
  deferredProblemLines = identity_2([], (lines) => {
    lines.length = 0;
  });
});
//@ chunk-5xgkngpb.js:744543-744614 placement
/**
 * 文本输出且非 bg 会话
 */
function isPlainTextSession() {
  return getPrintOutputFormat() === "text" && env.CLAUDE_CODE_SESSION_KIND !== "bg";
}
//@ chunk-5xgkngpb.js:744614-744693 placement
/**
 * 输出延迟的问题
 */
function flushDeferredProblems() {
  let lines = deferredProblemLines.splice(0);
  if (!isPlainTextSession()) return;
  for (let line of lines)
    writeToStderr(`${line}
`);
}
//@ chunk-5xgkngpb.js:744693-744728 placement
/**
 * 已报告的内联问题
 */
var reportedInlineProblems; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:744693", () => {
  reportedInlineProblems = identity_2(new Set(), (set) => set.clear());
});
//@ chunk-5xgkngpb.js:744728-744905 placement
/**
 * 非交互会话里，内联插件的问题输出到 stderr（去重；格式化输出时先缓存）。
 */
function reportInlinePluginNotice(notice, text) {
  let isInline = marketplaceOf(notice.source) === INLINE_PLUGIN_MARKETPLACE;
  if (!getIsNonInteractiveSession() || !isInline) return;
  let line = stripControlChars_3(`${notice.name}: ${text}`);
  if (reportedInlineProblems.has(line)) return;
  reportedInlineProblems.add(line);
  if (getPrintOutputFormat() === null) {
    deferredProblemLines.push(line);
    return;
  }
  if (isPlainTextSession())
    writeToStderr(`${line}
`);
}
//@ chunk-5xgkngpb.js:744905-745130 placement
/**
 * 在所有宿主的进行中分发上执行回调。
 */
function withInFlightDispatches(runtime, e, fn) {
  let filtered = [runtime.state.environmentHost, runtime.state.nativeHost].filter(
    (host) => host !== undefined,
  );
  return fn(
    e,
    {
      [Symbol.iterator]: () => filtered.flatMap((host) => [...host.inFlight()]).values(),
    },
    (id) => filtered.map((secondHost) => secondHost.nameOf(id)).find((thirdName) => thirdName !== undefined),
  );
}
//@ chunk-5xgkngpb.js:745130-745232 placement
/**
 * 取 tool.call 事件中的工具名。
 */
function toolNameOfCall(event, payload) {
  let tool = event === "tool.call" && "tool" in payload ? payload.tool : undefined;
  return typeof tool === "string" ? tool : undefined;
}
//@ chunk-5xgkngpb.js:745278-745309 placement
/**
 * 绑定 async 资源
 */
var bindAsyncResource = () => AsyncResource.bind((value) => value());
//@ chunk-5xgkngpb.js:745309-745350 placement
/**
 * 合并出带 options 的对象
 */
var withOptions = (a, b, options) => ({
  ...a,
  ...b,
  options,
});
//@ chunk-5xgkngpb.js:745350-745418 placement
/**
 * 以 ! 或内部前缀开头
 */
var isPrivateEventName = (event) =>
  (event.startsWith("!") ? event.slice(1) : event).startsWith(`${PROTO_KEY}.`);
//@ chunk-5xgkngpb.js:745418-745589 placement
function warnProtoPatterns(pluginName, registered) {
  for (let pattern of new Set(registered.map((registration) => registration.pattern)))
    if (isPrivateEventName(pattern) && !pattern.startsWith("!"))
      reportPluginProblem(
        pluginName,
        `registered ${pattern}; that name cannot be a noun, so this hook is never run`,
      );
}
//@ chunk-5xgkngpb.js:745589-745860 placement
function adviseUiRenderMatchers(pluginName, registered) {
  for (let { pattern, matcher } of registered) {
    if (!(pattern === "ui.render" && matcher !== undefined)) continue;
    try {
      let item = adviseUiRenderMatcher(matcher);
      if (item !== undefined)
        logForDebugging(`hooks module ${pluginName}: on("ui.render", ${describeMatcher(matcher)}) ${item}`, {
          level: "warn",
        });
    } catch (error) {
      logForDebugging(`hooks module ${pluginName}: ui.render matcher advice failed: ` + errorMessage(error));
    }
  }
}
//@ chunk-5xgkngpb.js:745860-746626 placement
function reportUnmatchedHookRegistrations(pluginName, patterns, table) {
  let known = [
    ...HOOK_EVENTS_2_2,
    ...Object.entries(table).flatMap(([key, value]) =>
      value.owner !== CORE_ORIGIN ? value.methods.map((method) => `${key}.${method}`) : [],
    ),
  ];
  for (let pattern of patterns) {
    if (isPrivateEventName(pattern)) continue;
    if (isEventPattern(pattern)) {
      let isNegated = pattern.startsWith("!");
      let body = isNegated ? pattern.slice(1) : pattern;
      if (!known.some((name) => matchesEventPattern(body, name)))
        throw new HooksError(
          `${pluginName}: registered on("${pattern}"), ` +
            (isNegated ? "whose negated pattern selects no event" : "which selects no event"),
        );
      continue;
    }
    if (isHookEvent(pattern)) continue;
    let index = pattern.indexOf(".");
    let sliced = pattern.slice(0, index);
    let sliced_2 = pattern.slice(index + 1);
    let entry = Object.hasOwn(table, sliced) ? table[sliced] : undefined;
    if (!entry)
      throw new HooksError(`${pluginName}: registered ${pattern}, but no loaded plugin provides $.${sliced}`);
    if (entry.owner === CORE_ORIGIN)
      throw new HooksError(
        `${pluginName}: registered ${pattern}, which is a call on core's $.${sliced} that is not an event`,
      );
    if (!entry.methods.includes(sliced_2))
      throw new HooksError(
        `${pluginName}: registered ${pattern}, but $.${sliced} (${entry.owner}) has no method ${sliced_2}`,
      );
  }
}
//@ chunk-5xgkngpb.js:746626-747033 placement
/**
 * 校验扫描到的 next.to 目标：只有托管插件可用，且目标须在该层允许的下层之中。
 */
function checkNextToAllowed(options, scan, tier) {
  let allowed = tiersBeneath(tier);
  for (let to of scan.nextTo ?? []) {
    if (allowed.length === 0)
      throw new HooksError(
        `${options}: hooks module not loaded; next.to is available to managed plugins (prependPlugins / appendPlugins) only, and this plugin is ${tier} (policy/scan)`,
      );
    if (!allowed.includes(to))
      throw new HooksError(
        `${options}: hooks module not loaded; next.to("${to}") skips nothing from ${tier}; a ${tier} plugin may continue at ${allowed.join(", ")} (policy/scan)`,
      );
  }
}
//@ chunk-5xgkngpb.js:747033-747416 placement
/**
 * 校验注册的事件：必须是已知事件或插件自定义事件，且出现在模块扫描结果里。
 */
function checkRegisteredEvents(pluginName, scan, secondPluginName) {
  for (let pattern of secondPluginName) {
    let problem = eventPatternError(pattern);
    if (problem !== undefined) throw new HooksError(`${pluginName}: registered ${problem}`);
    let secondProblem = isHookEvent(pattern);
    let event = nameOfEventPattern(pattern);
    if (event !== undefined && !isHookEvent(event) && !isPluginDefinedEvent(event))
      throw new HooksError(`${pluginName}: registered "${pattern}", which is not an event`);
    if (
      !scan.hooks.some(
        (hook) =>
          hook === pattern ||
          (secondProblem &&
            isEventPattern(hook) &&
            matchesEventForPlugin(hook, pattern, {
              isBuiltin: false,
            })),
      )
    )
      throw new HooksError(
        `${pluginName}: registered ${pattern}, which the scan of its hooks module did not see (host check)`,
      );
  }
}
//@ chunk-5xgkngpb.js:754190-754385 placement
function checkScanPolicy(pluginName, scan, args) {
  let refusal = telemetryStreamRefusal(scan, {
    isBuiltin: isOfficialMarketplacePlugin(args),
  });
  if (refusal !== undefined)
    throw new HooksError(`${pluginName}: hooks module not loaded; ${refusal} (policy/scan)`);
  let item = telemetryRefSummary(scan);
  if (item !== undefined) logForDebugging(`${pluginName}: hooks telemetry for: ${item}`);
}
//@ chunk-5xgkngpb.js:773288-773301 placement
/**
 * 宿主状态
 */
var hostStateRef; // deferred: uses createMemoMap (./moduleLoader.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:773288", () => {
  hostStateRef = createMemoMap();
});
//@ chunk-5xgkngpb.js:773301-773337 placement
/**
 * 已加载插件的选项
 */
var loadedPluginOptions; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:773301", () => {
  loadedPluginOptions = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-5xgkngpb.js:773337-773409 placement
/**
 * 取某插件的选项
 */
function pluginOptionsFor(pluginId) {
  let current = loadedPluginOptions.get();
  return current?.pluginId === pluginId ? current.options : undefined;
}
//@ chunk-5xgkngpb.js:773409-773669 placement
function warnOptionsOutsideChoices(name, userConfig, userConfig_2) {
  for (let [key, value] of Object.entries(userConfig)) {
    let options = userConfig_2[key]?.options;
    if (options !== undefined && isOutsideOptions(userConfig_2[key], value)) {
      let field = userConfig_2[key]?.default;
      let entry = field === undefined ? "unset" : `the default, ${String(field)}`;
      reportPluginProblem(
        name,
        `option ${key} in settings is not one of ${options.join(", ")}; it reads as ${entry}`,
        "once",
      );
    }
  }
}
//@ chunk-5xgkngpb.js:773669-774387 placement
/**
 * 读取并校验插件 userConfig 选项：取设置中的值（项目设置不读）、补默认值并校验；不合法时内置插件抛错，其他回退为默认值。
 */
async function resolvePluginOptions(plugin) {
  let userConfig = plugin.manifest.userConfig ?? {};
  if (Object.keys(userConfig).length === 0) return {};
  clearPluginOptionsCache();
  hostStateRef.set(marketplaceSource(plugin), {
    before: hostStateRef.get(marketplaceSource(plugin))?.now,
    now: pluginOptionsFingerprint(marketplaceSource(plugin)),
  });
  let entries =
    pluginOptionsFor(marketplaceSource(plugin)) ?? (await loadPluginOptions(marketplaceSource(plugin)));
  let opts =
    "pluginConfigs[" +
    pluginIdAliases(marketplaceSource(plugin))
      .map((entry) => JSON.stringify(entry))
      .join(" or ") +
    "].options";
  if (Object.keys(entries).length === 0)
    logForDebugging(
      `plugin ${plugin.name}: no ${opts} in user, --settings or managed settings (project settings are not read); every option is its default`,
    );
  warnOptionsOutsideChoices(plugin.name, entries, userConfig);
  let key = applyUserConfigDefaults(entries, userConfig);
  let value = validateUserConfig(key, userConfig);
  if (!value.valid) {
    let secondOptions = hasTrustedOnlyBuiltinPlugin(marketplaceSource(plugin));
    let merged = `${plugin.name}: options do not fit plugin.json userConfig: ${value.errors.join("; ")} (settings.json ${opts})`;
    if (!secondOptions) throw new HooksError(merged);
    logForDebugging(`${merged} \u2014 loading on its defaults instead`, {
      level: "error",
    });
    return applyUserConfigDefaults({}, userConfig);
  }
  return key;
}
//@ chunk-5xgkngpb.js:774387-774574 placement
/**
 * 插件当前非敏感选项及其稳定 JSON 文本（用于比较是否变化）。
 */
function pluginOptionsSnapshot(serverName) {
  let name = pickNonSensitiveOptions(
    applyUserConfigDefaults(
      trustedPluginSetting(marketplaceSource(serverName)).options ?? {},
      serverName.manifest.userConfig ?? {},
    ),
    serverName,
  );
  return {
    options: name,
    text: jsonStringify(
      Object.fromEntries(
        Object.entries(name).toSorted(([snapshot], [broken]) => snapshot.localeCompare(broken)),
      ),
    ),
  };
}
//@ chunk-5xgkngpb.js:774574-774655 placement
/**
 * 找不可读的受信设置源
 */
var findBrokenTrustedSetting = () =>
  TRUSTED_SETTING_SOURCES.find(
    (source) =>
      getSettingsForSource(source) === null &&
      getSettingsParseErrorsForSource(source).some((broken) => broken.severity !== "warning"),
  );
//@ chunk-5xgkngpb.js:774699-775025 placement
/**
 * 加载插件的一个界面模块：读取、链接、检查导出，返回模块或问题。
 */
async function loadSurfaceModule(clientPath, pluginRoot, pluginName) {
  let resolved = resolve_2(pluginRoot, ...clientPath.split("/"));
  let { source, graph } = await loadHooksModuleGraph(resolved, pluginRoot, pluginName);
  let entry = graph.files.get(resolved);
  let secondEntry = entry
    ? findSurfaceComponent(entry.scanned.program)
    : {
        problem: "was not linked",
      };
  if ("problem" in secondEntry)
    throw new HooksError(
      `${pluginName}: surface module ${clientPath.split("/").join(sep)} ` + secondEntry.problem,
    );
  return {
    module: clientPath,
    modulePath: resolved,
    component: secondEntry.component,
    source,
    ...listLinkedFiles(graph, resolved),
  };
}
//@ chunk-5xgkngpb.js:775025-775136 placement
/**
 * 依次加载插件的所有界面模块。
 */
async function loadSurfaceModules(clients, pluginRoot, pluginName) {
  if (!clients || clients.length === 0) return;
  let loaded = [];
  for (let client of clients) loaded.push(await loadSurfaceModule(client, pluginRoot, pluginName));
  return loaded;
}
//@ chunk-5xgkngpb.js:775136-776056 placement
/**
 * 为插件的 hooks 模块准备加载参数：检查准入与命名冲突、读取选项、扫描（或使用密封文本）、加载界面模块、确定层级并校验 next.to 与策略。
 */
async function prepareHooksModuleArgs(loaderContext, plugin, modulePath) {
  let refusal = hooksModulesRefusalReason();
  if (refusal !== undefined) throw new HookAdmissionError(plugin.name, refusal);
  moduleAdmissionCache.set(() => getVouchedPolicyPluginIds());
  moduleAdmissionCacheB.set((id) => (resolveManagedPluginDigests(id) ?? []).length > 0);
  if (getPreToolStageOrder().includes(plugin.name))
    throw new HooksError(
      `${plugin.name}: hooks module not loaded; the name is the engine's own chain member (plugin.json name)`,
    );
  let sealedPluginTexts = await readSealedPluginTexts(loaderContext, plugin, modulePath);
  let options = await resolvePluginOptions(plugin);
  let scan =
    sealedPluginTexts === undefined
      ? await scanHooksModule(modulePath, plugin.path, plugin.name)
      : await scanSealedHooksModule({
          modulePath,
          pluginRoot: plugin.path,
          pluginName: plugin.name,
          texts: sealedPluginTexts,
        });
  if (sealedPluginTexts !== undefined && (scan.scan.clients ?? []).length > 0)
    throw new NotOrganizationPluginError(plugin.name, "it names surface modules");
  let surfaceModules = await loadSurfaceModules(scan.scan.clients, plugin.path, plugin.name);
  let storageId = marketplaceSource(plugin);
  let vouched =
    sealedPluginTexts === undefined
      ? getVouchedPolicyPluginIds()
      : withSealedPlugin(storageId, getVouchedPolicyPluginIds());
  let tier = pluginTier(storageId, vouched, resolveManagedPluginOrder());
  checkNextToAllowed(plugin.name, scan.scan, tier);
  checkScanPolicy(plugin.name, scan.scan, storageId);
  return {
    modulePath,
    pluginName: plugin.name,
    pluginRoot: plugin.path,
    pluginStorageId: storageId,
    tier,
    isPersons: hasSimilarMarketplaceRef(storageId, vouched),
    scan: scan.scan,
    source: scan.source,
    linked: scan.linked,
    links: scan.links,
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
//@ chunk-5xgkngpb.js:776056-776104 placement
/**
 * 未在 N 毫秒内加载
 */
var notLoadedWithinText = (pluginName, thirdPluginName) =>
  `${pluginName}: not loaded within ${thirdPluginName}ms`;
//@ chunk-5xgkngpb.js:776104-776182 placement
/**
 * 错误文本加 cause
 */
function errorWithCause(error) {
  let cause = causeString(error);
  if (cause === undefined) return errorMessage(error);
  return `${errorMessage(error)} (${cause})`;
}
//@ chunk-5xgkngpb.js:776182-776261 placement
/**
 * 清空并刷新代理定义
 */
async function refreshAgentsAndDefinitions() {
  getHostState().agentDefinitions.clear();
  await currentSurfaceBinding()?.refreshAgents();
}
//@ chunk-5xgkngpb.js:776261-776316 placement
/**
 * 插件代理的唯一键
 */
var agentRegistrationKey = (spec) => `${pluginDisplayKey(spec.plugin, spec.pluginId)}:` + spec.spec.name;
//@ chunk-5xgkngpb.js:776316-776617 placement
/**
 * 插件登记的代理表：只列出可用插件的代理，支持登记与查询。
 */
function createRegisteredAgentsTable(getTable) {
  return {
    list: () => [...getTable().values()].filter((entry) => isModuleAdmittedByName(entry.plugin)),
    held: (key) => {
      let entry = getTable().get(key);
      return entry !== undefined && isModuleAdmittedByName(entry.plugin) ? entry : undefined;
    },
    register: (spec) => {
      getTable().set(agentRegistrationKey(spec), spec);
    },
    forget: (plugin) => {
      let table = getTable();
      let filtered = [...table.values()].filter((entry) => entry.plugin === plugin);
      for (let entry of filtered) table.delete(agentRegistrationKey(entry));
      return filtered.length > 0;
    },
  };
}
//@ chunk-5xgkngpb.js:776617-776656 placement
/**
 * 插件登记的代理表
 */
var registeredAgentsTable; // deferred: uses createRegisteredAgentsTable of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:776617", () => {
  registeredAgentsTable = createRegisteredAgentsTable(() => getPluginRegistry().registeredAgents);
});
//@ chunk-5xgkngpb.js:776656-776711 placement
/**
 * 忘掉登记的代理并刷新
 */
function forgetRegisteredAgent(plugin) {
  if (registeredAgentsTable.forget(plugin)) refreshAgentsAndDefinitions().catch((error) => logError(error));
}
//@ chunk-5xgkngpb.js:3796881-3797061 placement
function installJsxGlobals() {
  let target = globalThis;
  for (let [key, value] of Object.entries({
    h: vmCreateElement,
    Fragment: vmFragment,
  }))
    if (target[key] === undefined)
      Object.defineProperty(target, key, {
        value,
        writable: true,
        configurable: true,
        enumerable: false,
      });
}
//@ chunk-5xgkngpb.js:3797061-3797193 placement
/**
 * 若是内置插件，返回其内嵌的 hooks 模块对象。
 */
function builtinModuleOf(args) {
  if (!isBuiltinPluginId(args.pluginStorageId)) return;
  let hooksModule = getBuiltinPlugin(args.pluginName)?.hooksModule;
  return hooksModule !== undefined && "module" in hooksModule ? hooksModule.module : undefined;
}
//@ chunk-5xgkngpb.js:3797193-3797311 placement
function createUiResolveCopier(name) {
  let withheldElementWarner = createWithheldElementWarner(name);
  return (value, kind) =>
    isPlainObject_6(value)
      ? Object.freeze(
          Object.assign(
            Object.create(null),
            buildElementTable(value, (problem) => problem, withheldElementWarner(kind)),
          ),
        )
      : value;
}
//@ chunk-5xgkngpb.js:3797311-3799253 placement
/**
 * 组装 hooks 模块运行期：host 代理、流式 hook 校验（必须返回 async generator）、参数/返回值直通、卸载信号处理；返回 activation 与 store/dispose。
 */
var assembleHooksModuleRuntime = async (invokeHost, args, options = {}) => {
  let { pluginName } = args;
  let builtin = builtinModuleOf(args);
  if (!builtin)
    throw new HooksError(
      `${pluginName}: not a hooks module the binary carries; it loads in the plugin sandbox, not natively`,
    );
  installJsxGlobals();
  let framed = options.framed ?? ((params, body) => body());
  let isUnloaded = false;
  let weakMap = new WeakMap();
  let surfaceAnswerCache = createSurfaceAnswerCache(createUiResolveCopier(pluginName));
  function requireFn(fn) {
    if (isUnloaded) throw envUnloadedError(pluginName);
    if (typeof fn !== "function") throw new HooksError(`${pluginName}: not a function`);
    return fn;
  }
  let invoke = async (fn, args, thisArg) => await Reflect.apply(requireFn(fn), thisArg, args);
  let iterate = (stream) => {
    if (!(
      typeof stream === "object" &&
      stream !== null &&
      "next" in stream &&
      typeof stream.next === "function"
    ))
      throw new HooksError(
        `${pluginName}: a hook on a streaming event returns its async generator; got ${stream === null ? "null" : typeof stream}`,
      );
    return stream;
  };
  let isGeneratorHook = (fn) =>
    typeof fn === "function" && Object.prototype.toString.call(fn) === "[object AsyncGeneratorFunction]";
  async function host(...args) {
    let [op, payload, extra] = args;
    try {
      return await invokeHost(op, payload, extra);
    } catch (error) {
      if (typeof error === "object" && error)
        weakMap.set(error, {
          plugin: pluginName,
          op,
          message: errorMessage(error),
        });
      throw isUnloaded ? tagError(error, cachedResolveAnswer(weakMap, error)) : error;
    }
  }
  function hostStream(op, payload, extra) {
    let streamed = (options.hostStream ?? noStreamingOps)(op, payload, extra);
    streamed.result.catch((error) =>
      isUnloaded ? tagError(error, tagPayload(pluginName, op, errorMessage(error))) : error,
    );
    return streamed;
  }
  let markUnloaded = () => void (isUnloaded = true);
  function signalFrom(value) {
    return value instanceof AbortSignal
      ? {
          signal: value,
          unlink: () => {},
        }
      : undefined;
  }
  options.signal?.addEventListener("abort", markUnloaded, {
    once: true,
  });
  let activation;
  try {
    activation = await registerHooksModule({
      loaded: builtin,
      args,
      host,
      hostStream,
      resolvedTable: surfaceAnswerCache.read,
      invoke,
      iterate,
      streamIn: (stream) => stream,
      isGeneratorHook,
      wrapMethod: (fn) => fn,
      signalFrom,
      makeSignal: () => {
        let abortController = new AbortController();
        return {
          signal: abortController.signal,
          abort: (reason) => abortController.abort(reason),
        };
      },
      copyMatcher: (matcher) => matcher,
      stamped: (fn) => fn(),
      framed,
    });
    if (options.signal?.aborted === true)
      throw new HooksError(`${pluginName}: unloaded while its module loaded`);
  } catch (error) {
    markUnloaded();
    throw error;
  }
  return {
    activation,
    invoke,
    invokeSync: (fn, arg) => requireFn(fn)(arg),
    applyIn: (thisArg, fn, ...args) => Reflect.apply(requireFn(fn), thisArg, args),
    cloneIn: (value) => value,
    argumentFor: (arg) => arg,
    freezeForNext: (value) => Object.freeze(value),
    leaving: (value) => value,
    nextFor: (value) => value,
    streamNextFor: (value) => value,
    storeResolved: surfaceAnswerCache.store,
    dispose: () => {
      markUnloaded();
      activation.dispose();
    },
    opFailureOf: (error) => cachedResolveAnswer(weakMap, error),
    ownsValue: () => false,
  };
};
//@ chunk-5xgkngpb.js:3799253-3799268 placement
/**
 * 原样返回
 */
var identityOf = (value) => value;
//@ chunk-5xgkngpb.js:3799268-3799854 placement
/**
 * 为模块注册表建立按事件的索引：匹配的注册项、是否监听、是否有 catch、组合 matcher。
 */
function createRegistrationIndex(registered, options) {
  let cache = new Map();
  function registrationsFor(event) {
    let indices = cache.get(event);
    if (indices === undefined) {
      indices = registered.flatMap((registration, index) =>
        matchesEventForPlugin(registration.pattern, event, options) ? [index] : [],
      );
      cache.set(event, indices);
    }
    return indices;
  }
  let standingFor = (event, leftOut = []) =>
    registrationsFor(event).flatMap((index) => {
      let registration = registered[index];
      return registration === undefined || leftOut.includes(index) ? [] : [registration];
    });
  return {
    patterns: normalizeCaseForComparison_2(registered.map((registration) => registration.pattern)),
    registrationsFor,
    standingFor,
    hooks: (event, leftOut) => standingFor(event, leftOut).length > 0,
    catches: (event, leftOut, matcherCheck) =>
      standingFor(event, leftOut).some(
        (registration) =>
          registration.caught === true &&
          (registration.matcher === undefined || matcherCheck?.(registration.matcher) !== false),
      ),
    hasCatch: (index) => registered[index]?.caught === true,
    matcherFor: (event, leftOut) => {
      let matcher;
      for (let [index, registration] of standingFor(event, leftOut).entries()) {
        if (registration.matcher === undefined) return;
        matcher = index === 0 ? registration.matcher : [matcher, registration.matcher];
      }
      return matcher;
    },
  };
}
//@ chunk-5xgkngpb.js:3799854-3799933 placement
/**
 * 未加载则拒绝
 */
function rejectIfUnloaded(statusOf, message, fn) {
  return statusOf().kind === "unloaded" ? Promise.reject(new HooksError(message)) : fn();
}
//@ chunk-5xgkngpb.js:3799933-3801692 placement
/**
 * 加载并登记一个 hooks 模块：查 environment 上限、建 environment、登记 moduleSeats/environmentArgs，返回带 enter/leave/dispatch/discard/retire/resolveTables/build/press 的模块记录。
 */
async function loadAndRegisterHooksModule(runtime, args) {
  let refusal = hooksModulesRefusalReason();
  if (refusal !== undefined) throw new HookAdmissionError(args.pluginName, refusal);
  let nativeHost = builtinModuleOf(args) !== undefined ? ensureNativeHost(runtime) : undefined;
  let host = nativeHost ?? ensureEnvironmentHost(runtime);
  let envId = ++runtime.state.environmentCounter;
  let loaded = await host.load(envId, args);
  try {
    checkRegisteredEvents(
      args.pluginName,
      args.scan,
      loaded.registered.map((registration) => registration.pattern),
    );
  } catch (error) {
    host.unload(envId);
    throw error;
  }
  let label = pluginStorageKey(args);
  adviseUiRenderMatchers(label, loaded.registered);
  warnProtoPatterns(args.pluginName, loaded.registered);
  getPluginRegistry().moduleSeats.set(args.pluginName, args.tier);
  runtime.state.environmentArgs.set(envId, args);
  let lifecycle = {
    kind: "live",
  };
  let activeCalls = 0;
  let unloadText = `hooks module ${label} unloaded`;
  function discard() {
    if (lifecycle.kind === "live" || lifecycle.kind === "retiring") {
      lifecycle = {
        kind: "unloaded",
        retired: lifecycle.kind === "retiring",
      };
      runtime.state.environmentArgs.delete(envId);
      try {
        host.unload(envId);
      } finally {
        releaseWaitingCalls(runtime.state.sentCalls, envId);
      }
    }
  }
  function status() {
    let died = host.died;
    return died !== undefined && lifecycle.kind !== "unloaded"
      ? {
          kind: "dead",
          reason: died,
        }
      : lifecycle;
  }
  let secondModule = identityOf({
    name: args.pluginName,
    label,
    tier: args.tier,
    ...createRegistrationIndex(loaded.registered, {
      isBuiltin: isOfficialMarketplacePlugin(args.pluginStorageId),
    }),
    args,
    environmentId: envId,
    hopKey: host,
    ...(nativeHost !== undefined && {
      link: (readOn) => nativeHost.link(envId, readOn),
      streamLinks: (readStream) => nativeHost.linkStreams(envId, readStream),
    }),
    status,
    enter: () => {
      activeCalls += 1;
      countModLoadEvent(args.pluginStorageId);
    },
    leave() {
      activeCalls -= 1;
      if (lifecycle.kind === "retiring" && activeCalls === 0) discard();
    },
    dispatch: (event, payload, ctx) =>
      dispatchHookCall({
        members: [secondModule],
        event,
        e: payload,
        call: ctx,
        signal: ctx.signal,
        hookOrigin: undefined,
        origin: ctx.origin,
        floors: NO_FLOORS,
      }),
    discard,
    retire() {
      forgetCachedDescribe(args.pluginName);
      forgetRegisteredAgent(args.pluginName);
      runtime.state.environmentArgs.delete(envId);
      moveToCloudTrash.forgetPresses(args.pluginName);
      try {
        surfaceComposer()?.forget(args.pluginName);
      } catch (error) {
        logForDebugging(`${args.pluginName}: ${errorMessage(error)}`, {
          level: "error",
        });
      }
      if (lifecycle.kind === "live")
        lifecycle = {
          kind: "retiring",
        };
      if (activeCalls === 0) discard();
    },
    resolveTables: (entry) =>
      rejectIfUnloaded(
        () => lifecycle,
        unloadText,
        () => host.resolveTables(envId, entry),
      ),
    build: (payload, ctx) =>
      rejectIfUnloaded(
        () => lifecycle,
        unloadText,
        () => host.build(envId, payload, ctx),
      ),
    callInterface: (payload, ctx) =>
      rejectIfUnloaded(
        () => lifecycle,
        unloadText,
        () => host.callInterface(envId, payload, ctx),
      ),
    press: (payload, ctx) =>
      rejectIfUnloaded(
        () => lifecycle,
        unloadText,
        () => host.press(envId, payload, ctx),
      ),
    releasePresses: (payload) => {
      if (lifecycle.kind !== "unloaded") host.releasePresses(envId, payload);
    },
  });
  return secondModule;
}
//@ chunk-5xgkngpb.js:3801692-3801704 placement
/**
 * hooks 宿主等待 worker 就绪的默认超时 10 秒；插件自己的 init 可覆盖。
 */
var HOOKS_READY_TIMEOUT_MS = 1e4;
//@ chunk-5xgkngpb.js:3801704-3801856 placement
/**
 * 复制注册子句（模式、matcher 与 caught）。
 */
var copyRegistrations = (registrations, options) =>
  registrations.map(({ pattern, matcher, caught }) => ({
    pattern,
    ...(matcher !== undefined && {
      matcher: reviveMatcherDefault(matcher, `${options}: on("${pattern}", matcher)`),
    }),
    ...(caught === true && {
      caught,
    }),
  }));
//@ chunk-5xgkngpb.js:3801856-3802651 placement
/**
 * 重载前重新扫描插件的 hooks 模块并重算层级；组织插件与密封插件有额外限制。
 */
async function rescanHooksModuleArgs(state, args, reread) {
  if (reread) invalidateCommandNames();
  let pluginStorageId = args.pluginStorageId;
  if (resolveManagedPluginDigests(pluginStorageId) !== undefined) {
    if (reread?.modulePath === undefined)
      throw new NotOrganizationPluginError(args.pluginName, "no entry the host holds can be proved");
    return prepareHooksModuleArgs(state, reread, reread.modulePath);
  }
  if (args.sealed === true)
    throw new NotOrganizationPluginError(
      args.pluginName,
      "a proved module of this name may not come back from disk",
    );
  assertPluginHooksAdmitted(state, {
    pluginName: args.pluginName,
    pluginId: pluginStorageId,
    plugin: reread,
  });
  let modulePath = reread?.modulePath ?? args.modulePath;
  let secondArgs = reread?.path ?? args.pluginRoot;
  let secondSecondArgs = reread?.name ?? args.pluginName;
  let nextArgs = await scanHooksModule(modulePath, secondArgs, secondSecondArgs);
  let { surfaceModules, ...fresh } = args;
  let surfaceModules_2 = await loadSurfaceModules(nextArgs.scan.clients, secondArgs, secondSecondArgs);
  let secondFresh = {
    ...fresh,
    ...(surfaceModules_2 !== undefined && {
      surfaceModules: surfaceModules_2,
    }),
  };
  let thirdFresh = pluginTier(args.pluginStorageId, getVouchedPolicyPluginIds(), resolveManagedPluginOrder());
  let isPersons = hasSimilarMarketplaceRef(args.pluginStorageId, getVouchedPolicyPluginIds());
  checkNextToAllowed(secondSecondArgs, nextArgs.scan, thirdFresh);
  checkScanPolicy(secondSecondArgs, nextArgs.scan, args.pluginStorageId);
  if (!reread)
    return {
      ...secondFresh,
      ...nextArgs,
      tier: thirdFresh,
      isPersons,
    };
  return withOptions(
    {
      ...secondFresh,
      modulePath,
      tier: thirdFresh,
      isPersons,
    },
    nextArgs,
    await resolvePluginOptions(reread),
  );
}
//@ chunk-5xgkngpb.js:3802651-3802687 placement
/**
 * worker 加载上报器
 */
var workersLoadedReporter; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3802651", () => {
  workersLoadedReporter = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-5xgkngpb.js:4158855-4158946 placement
/**
 * 记录加载失败
 */
function logHookLoadFailure(error, feature, args) {
  if (!(error instanceof HookAdmissionError)) {
    logFeatureBad("plugin_function_hooks_load", feature, classifyPluginOrigin(args));
    logModLoadFailed(args, feature);
  }
}
//@ chunk-5xgkngpb.js:4158946-4159067 placement
async function reprepareFromPlugin(runtime, plugin) {
  if (plugin?.modulePath === undefined) return;
  let hooksModuleArgs = await prepareHooksModuleArgs(runtime.state, plugin, plugin.modulePath);
  setKnownArgs(runtime.state, hooksModuleArgs);
  return hooksModuleArgs;
}
//@ chunk-5xgkngpb.js:4159067-4159149 placement
/**
 * 去掉 “插件名: ” 前缀
 */
function stripPluginPrefix(pluginName, error) {
  let message = errorMessage(error);
  let prefix = `${pluginName}: `;
  return message.startsWith(prefix) ? message.slice(prefix.length) : message;
}
//@ chunk-5xgkngpb.js:4159149-4159235 placement
/**
 * 上报模块加载失败
 */
function reportHookLoadFailure(pluginName, error, notice) {
  let message = `hooks module did not load: ${stripPluginPrefix(pluginName, error)}`;
  reportPluginProblem(pluginName, message);
  if (notice) reportInlinePluginNotice(notice, message);
}
//@ chunk-5xgkngpb.js:4159235-4159271 placement
/**
 * 上报重载失败
 */
function reportReloadFailure(name, error, notice) {
  reportHookLoadFailure(name, errorMessage(error) + PREVIOUS_VERSION_UNLOADED, notice);
}
//@ chunk-5xgkngpb.js:4159271-4159319 placement
/**
 * 按名字找钩子成员
 */
var findHookMemberByName = (modules, failed) =>
  modules.find((loadedModule) => loadedModule.name === failed[0]?.hook);
//@ chunk-5xgkngpb.js:4168062-4169012 placement
/**
 * 判断加载这组模块时是否需要整组重新折叠 engine.create，返回原因文字（无需则 undefined）。
 */
function describeRefoldReason(runtime, { live, declaring, kept, leaving, unloaded }) {
  let liveByName = new Map(live.map((loadedModule) => [loadedModule.name, loadedModule]));
  let declaringByName = new Map(declaring.map((args) => [args.pluginName, args]));
  let names = new Set([...liveByName.keys(), ...runtime.state.knownArgs.keys(), ...declaringByName.keys()]);
  for (let name of names) {
    if (kept.has(name) || unloaded.has(name)) continue;
    let known = runtime.state.knownArgs.get(name);
    let declared = declaringByName.get(name);
    let scans = [known, declared].flatMap((scanArgs) => (scanArgs ? [scanArgs.scan] : []));
    let reloadTriggerEvent = findReloadTriggerEvent({
      live: liveByName.get(name),
      scans,
    });
    if (!reloadTriggerEvent) continue;
    let wasLive = liveByName.has(name) || known !== undefined;
    return `${name} hooks ${reloadTriggerEvent} and ${!declared ? "leaves" : wasLive ? "loads afresh" : "joins"}`;
  }
  let crashedWithholder = leaving[0] ?? runtime.state.crashedWithholders.keys().next().value;
  if (crashedWithholder !== undefined) return `${crashedWithholder} crashed with its withholdings standing`;
  if (runtime.state.lastEndedBy !== undefined)
    return `${runtime.state.lastEndedBy} ended the last fold without next`;
  if (!runtime.state.isSetRecord) return PARTIAL_REFOLD_TEXT;
  let flattened = live.flatMap((thirdModule) =>
    kept.get(thirdModule.name) === thirdModule ? [thirdModule.name] : [],
  );
  let flattened_2 = declaring.flatMap((thirdArgs) =>
    kept.has(thirdArgs.pluginName) ? [thirdArgs.pluginName] : [],
  );
  return flattened.some((name, index) => flattened_2[index] !== name)
    ? "the kept modules change order"
    : undefined;
}
//@ chunk-5xgkngpb.js:4169012-4169129 placement
function handlesCommandRun(scan, command) {
  return (
    scan.hooks.some((hook) => matchesEventPattern(hook, "command.run")) &&
    (scan.runCommands === undefined || scan.runCommands.includes(command))
  );
}
//@ chunk-5xgkngpb.js:4169129-4169189 placement
/**
 * 该次扫描要重折叠
 */
function needsRefoldScan(scan) {
  return scan.calls.includes("command.register");
}
//@ chunk-5xgkngpb.js:4169232-4169335 placement
/**
 * 取插件适用的准入文本。
 */
function admissionTextFor(loadedModule) {
  let admissionText = getPluginRegistry().admissionText;
  if (admissionText === null) return admissionText;
  return loadedModule !== undefined && isModuleAdmitted(loadedModule)
    ? admissionText
    : loadedModule?.judgedUnder;
}
//@ chunk-5xgkngpb.js:4169335-4169469 placement
function recordOptionsReloadFailure(runtime, args, error) {
  runtime.state.optionsReloadFailures.set(args.name, {
    generation: runtime.state.generations.get(args.name),
    wanted: pluginOptionsSnapshot(args).text,
    error,
  });
}
//@ chunk-5xgkngpb.js:4169469-4169499 placement
/**
 * 插件提供者层级
 */
var pluginProviderRank = (plugin) =>
  providerRank(plugin, getVouchedPolicyPluginIds(), resolveManagedPluginOrder());
//@ chunk-5xgkngpb.js:4169499-4169614 placement
function providerRankOf(loadedModule) {
  return loadedModule.sealed === true
    ? providerRank(
        loadedModule.pluginStorageId,
        withSealedPlugin(loadedModule.pluginStorageId, getVouchedPolicyPluginIds()),
        resolveManagedPluginOrder(),
      )
    : pluginProviderRank(loadedModule.pluginStorageId);
}
//@ chunk-5xgkngpb.js:4169614-4169725 placement (2.1.88 match: findReverseDependents, 0.826)
/**
 * 插件 n 的 manifest.dependencies 是否引用插件 e。
 */
function findReverseDependents(pluginId, plugins) {
  return (
    plugins !== pluginId &&
    (pluginId.manifest.dependencies ?? []).some((dependency) =>
      dependencyRefMatches(qualifyDependency(dependency, pluginId.source), plugins.source, pluginId.source),
    )
  );
}
//@ chunk-5xgkngpb.js:4169725-4170613 placement
/**
 * 按依赖关系对插件做拓扑排序（同层保持原顺序），并找出依赖环。
 */
function orderByDependencies(items, getDeps) {
  let known = new Set(items);
  let depsByName = new Map(
    items.map((item) => [
      item,
      normalizeCaseForComparison_2(getDeps(item)).filter((dep) => dep !== item && known.has(dep)),
    ]),
  );
  let closure = new Map();
  for (let item of items) {
    let seen = new Set();
    let stack = [...(depsByName.get(item) ?? [])];
    for (let dep = stack.pop(); dep; dep = stack.pop())
      if (!seen.has(dep)) {
        seen.add(dep);
        stack.push(...(depsByName.get(dep) ?? []));
      }
    closure.set(item, seen);
  }
  let areMutual = (a, b) => closure.get(a)?.has(b) === true && closure.get(b)?.has(a) === true;
  let cycles = [];
  for (let item of items) {
    let filtered = items.filter((other) => other === item || areMutual(item, other));
    if (filtered.length > 1 && filtered[0] === item) cycles.push(filtered);
  }
  let successors = new Map(
    items.map((item, index) => [
      item,
      [
        ...(depsByName.get(item) ?? []).filter((dep) => !areMutual(item, dep)),
        ...items.slice(index + 1).filter((other) => areMutual(item, other)),
      ],
    ]),
  );
  let reverse = Map.groupBy([...successors.values()].flat(), (successor) => successor);
  let pending = new Map(items.map((item) => [item, reverse.get(item)?.length ?? 0]));
  let isFree = (item) => pending.get(item) === 0;
  let order = [];
  let remaining = items;
  while (remaining.length > 0) {
    let max = Math.max(remaining.findIndex(isFree), 0);
    for (let item of remaining.slice(max, max + 1)) {
      order.push(item);
      for (let successor of successors.get(item) ?? [])
        pending.set(successor, (pending.get(successor) ?? 0) - 1);
    }
    remaining = remaining.toSpliced(max, 1);
  }
  return {
    order,
    cycles,
  };
}
//@ chunk-5xgkngpb.js:4170613-4171542 placement
/**
 * 按提供者层级与依赖关系排列 hooks 模块顺序，并说明冲突时谁优先。
 */
function orderHooksModules(plugins, infoOf) {
  let mapped = plugins.map((plugin) => ({
    plugin,
    ...infoOf(plugin),
  }));
  let dependentsByName = new Map(
    mapped.map((entry) => {
      let filtered = mapped.filter((other) => findReverseDependents(entry.plugin, other.plugin));
      for (let dependent of filtered) {
        let isInner = dependent.rank < entry.rank;
        let why =
          dependent.tier === entry.tier
            ? `placed outside it in the ${dependent.tier} tier; that place wins`
            : `in the ${dependent.tier} tier, outside the ${entry.tier} tier; tier order wins`;
        if (isInner)
          logForDebugging(
            `hooks module order: ${entry.plugin.source} depends on ${dependent.plugin.source}, which is ${why}, so ${dependent.plugin.source} stays outer`,
            {
              level: "warn",
            },
          );
      }
      return [entry, filtered];
    }),
  );
  let order = [];
  for (let rankGroup of Map.groupBy(mapped, (rank) => rank.rank).values()) {
    let inner = orderByDependencies(rankGroup, (entry) => dependentsByName.get(entry) ?? []);
    for (let cycle of inner.cycles)
      logForDebugging(
        `hooks module order: ${cycle.map((entry) => entry.plugin.source).join(", ")} depend on one another in a cycle; that dependency order is refused and they register in the order they were chosen in`,
        {
          level: "error",
        },
      );
    order.push(...inner.order.map((entry) => entry.plugin));
  }
  if (order.some((plugin, index) => plugin !== plugins[index]))
    logForDebugging(
      "hooks module order: dependencies register " + order.map((plugin) => plugin.source).join(", "),
    );
  return order;
}
//@ chunk-5xgkngpb.js:4171542-4171884 placement
/**
 * 让密封插件按指定顺序排在其他插件前面。
 */
function orderSealedModules(args, infoByName) {
  if (!args.some((args) => args.sealed === true)) return args;
  let byName = new Map(args.map((args) => [args.pluginName, args]));
  return orderHooksModules(
    args
      .toSorted((fourthArgs, order) => providerRankOf(fourthArgs) - providerRankOf(order))
      .flatMap((fifthArgs) => infoByName.get(fifthArgs.pluginName) ?? []),
    (n6Args) => {
      let secondByName = byName.get(n6Args.name);
      if (secondByName === undefined) throw Error("a plugin was placed with no declaration");
      return {
        rank: providerRankOf(secondByName),
        tier: secondByName.tier,
      };
    },
  ).flatMap((args) => byName.get(args.name) ?? []);
}
//@ chunk-5xgkngpb.js:4171884-4172115 placement
function logModsBackOn(runtime, admitted) {
  let { modsOffAt } = runtime.state;
  let nonBuiltinCount = countWhere(
    admitted,
    (fourthModule) => builtinModuleOf(fourthModule.args) === undefined,
  );
  if (modsOffAt === undefined || nonBuiltinCount === 0) return;
  runtime.state.modsOffAt = undefined;
  logFeatureOk("plugin_function_hooks_worker_mods", {
    off_s: Math.max(0, Math.floor((Date.now() - modsOffAt) / SLOW_HOOK_REPORT_INTERVAL_MS_2)),
    worker_mods: nonBuiltinCount,
  });
}
//@ chunk-5xgkngpb.js:4172115-4172139 placement
/**
 * import( 检测
 */
var DYNAMIC_IMPORT_RE = /\bimport\s*\(/;
//@ chunk-5xgkngpb.js:4172182-4172306 placement
/**
 * 判断已加载模块的参数与展示是否与新的完全一致（且源码不含动态 import），可复用。
 */
function isModuleUnchanged(args, next, info) {
  return (
    !DYNAMIC_IMPORT_RE.test(next.source) &&
    !next.linked.some((link) => DYNAMIC_IMPORT_RE.test(link.source)) &&
    isDeepStrictEqual(args.args, next) &&
    isDeepStrictEqual(args.shown, shownPluginInfo(next, info))
  );
}
//@ chunk-5xgkngpb.js:4172306-4172373 placement
/**
 * same-thread 或 worker
 */
var hookHostKind = () => (env.CLAUDE_CODE_HOOKS_SAME_THREAD ? "same-thread" : "worker");
//@ chunk-5xgkngpb.js:4172373-4172612 placement
function reusableLoadedModule(runtime, hooksModuleArgs, plugin) {
  let found = getPluginRegistry().loadedModules.find(
    (loadedModule) => loadedModule.name === hooksModuleArgs.pluginName,
  );
  let environmentHost = runtime.state.environmentHost;
  return found !== undefined &&
    found.status().kind === "live" &&
    (found.hopKey === runtime.state.nativeHost ||
      (found.hopKey === environmentHost && environmentHost.kind === hookHostKind())) &&
    isModuleUnchanged(found, hooksModuleArgs, plugin) &&
    isModuleAdmitted(found)
    ? found
    : undefined;
}
//@ chunk-5xgkngpb.js:4172612-4172822 placement
function uiResolveEnvironments(admitted, pluginName, resolvedTable) {
  let out = [];
  for (let fifthModule of admitted) {
    if (
      fifthModule === pluginName ||
      !fifthModule.hooks("ui.resolve") ||
      !isModuleAdmitted(fifthModule) ||
      fifthModule.status().kind !== "live" ||
      fifthModule.hopKey !== pluginName.hopKey
    )
      continue;
    if (!moduleMatcherAdmits(fifthModule, "ui.resolve", resolvedTable)) continue;
    out.push(fifthModule.environmentId);
  }
  return out;
}
//@ chunk-5xgkngpb.js:4172822-4173145 placement
/**
 * 让每个活动模块重新解析各 UI 组件的元素表（考虑其他模块的 ui.resolve 钩子），失败时保留旧表。
 */
async function resolveElementTables(admitted) {
  await Promise.all(
    admitted
      .filter((n6Module) => n6Module.status().kind === "live")
      .map((entry) =>
        entry
          .resolveTables(
            RENDER_SITE_PAIRS.map((resolved) => ({
              surface: resolved.surface,
              component: resolved.component,
              environments: uiResolveEnvironments(admitted, entry, resolved),
            })),
          )
          .catch((error) => {
            logForDebugging(
              `hooks module ${entry.label}: its element tables were not resolved (${errorMessage(error)}); it keeps the ones it had`,
              {
                level: "error",
              },
            );
          }),
      ),
  );
}
//@ chunk-5xgkngpb.js:4173145-4178348 placement
/**
 * 加载声明的整组 hooks 模块：未变的保留、变化的全量重载，并记录失败与遥测。
 */
async function loadHooksModuleSet(runtime, plugins, options) {
  let pluginRegistry = getPluginRegistry();
  let loadedModules = pluginRegistry.loadedModules;
  let judgedUnderOf = (pluginName) =>
    options.judgedUnder === undefined
      ? admissionTextFor(loadedModules.find((loadedModule) => loadedModule.name === pluginName))
      : options.judgedUnder;
  let servingNames = new Set(loadedModules.map((loadedModule) => loadedModule.name));
  admissionChangedListener.set(() => {
    invalidateAllHookedCaches();
    publishRenderPlugins(runtime);
  });
  let declaringByName = new Map();
  let argsList = [];
  let reusableByName = new Map();
  let knownNames = new Set(runtime.state.knownArgs.keys());
  let refusedNames = new Set();
  runtime.state.unattributedCrashes = 0;
  let declaredNames = new Set(plugins.map((plugin) => plugin.name));
  for (let plugin of plugins) {
    if (plugin.modulePath === undefined) continue;
    declaringByName.set(plugin.name, plugin);
    try {
      let hooksModuleArgs = await prepareHooksModuleArgs(runtime.state, plugin, plugin.modulePath);
      let reusable = reusableLoadedModule(runtime, hooksModuleArgs, plugin);
      if (reusable !== undefined) reusableByName.set(reusable.name, reusable);
      argsList.push(reusable?.args ?? hooksModuleArgs);
    } catch (error) {
      let isAdmissionError =
        error instanceof NotOrganizationPluginError || error instanceof HookAdmissionRefusal;
      if (isAdmissionError) declaringByName.delete(plugin.name);
      if (error instanceof HookAdmissionRefusal) {
        logForDebugging(errorWithCause(error));
        continue;
      }
      logHookLoadFailure(error, "declaration_failed", {
        pluginStorageId: marketplaceSource(plugin),
        pluginRoot: plugin.path,
      });
      logForDebugging(`hooks module ${hookPluginLabel(plugin)} failed to load: ` + errorWithCause(error), {
        level: "error",
      });
      if (!isAdmissionError) recordOptionsReloadFailure(runtime, plugin, error);
      if (servingNames.has(plugin.name)) reportReloadFailure(plugin.name, error, plugin);
      else reportHookLoadFailure(plugin.name, error, plugin);
    }
  }
  argsList.splice(0, 1 / 0, ...orderSealedModules(argsList, declaringByName));
  options.scans = argsList.map((nextArgs) => nextArgs.scan);
  options.read.resolve();
  runtime.state.loadingRead.emit();
  let order = argsList.map((args) => args.pluginName);
  let orderSet = new Set(order);
  let unloadedNames = new Set(
    argsList.flatMap((args) => {
      let step = runtime.state.unloadedSteps.get(args.pluginName);
      return step !== undefined &&
        isModuleUnchanged(step, args, declaringByName.get(args.pluginName)) &&
        isDeepStrictEqual(
          step.order,
          order.filter((name) => step.order.includes(name)),
        )
        ? [args.pluginName]
        : [];
    }),
  );
  let isReusable = (n7Module) => reusableByName.get(n7Module.name) === n7Module;
  let filtered = [...runtime.state.crashedWithholders.keys()].filter((key) => !declaredNames.has(key));
  for (let name of filtered) {
    runtime.state.crashedWithholders.delete(name);
    runtime.state.withholdings.delete(name);
  }
  function forgetDeparted() {
    let departed = new Set([...knownNames].filter((name) => !runtime.state.knownArgs.has(name)));
    runtime.state.knownPlugins.clear();
    for (let [name, args] of declaringByName) runtime.state.knownPlugins.set(name, args);
    for (let args of argsList)
      if (!departed.has(args.pluginName) && !refusedNames.has(args.pluginName))
        setKnownArgs(runtime.state, args);
    let orphans = new Set([
      ...[...runtime.state.crashedWithholders.keys()].filter((key) => !declaredNames.has(key)),
      ...[...runtime.state.knownArgs.keys()].filter((key) => refusedNames.has(key) || !orderSet.has(key)),
    ]);
    for (let name of orphans) forgetPlugin(name, runtime);
    if (orphans.size > 0) liftWithholdings(runtime.state, orphans);
  }
  function discardUnadmitted(admitted) {
    for (let n8Module of admitted) if (!isReusable(n8Module)) n8Module.discard();
    forgetDeparted();
  }
  function commitAdmitted(admitted) {
    let loadedModules = pluginRegistry.loadedModules;
    let admittedSet = new Set(admitted);
    let admittedNames = new Set(admitted.map((n9Module) => n9Module.name));
    pluginRegistry.loadedModules = admitted;
    for (let n10Module of admitted) runtime.state.crashedWithholders.delete(n10Module.name);
    forgetDeparted();
    for (let loadedModule of loadedModules) {
      if (!admittedSet.has(loadedModule)) {
        loadedModule.retire();
        clearBackdropFor(loadedModule.name);
      }
      if (!admittedNames.has(loadedModule.name)) {
        forgetMcpServerFor(loadedModule.name);
        forgetMcpConnectsFor(loadedModule.name);
        forgetCachedDescribe(loadedModule.name);
        forgetRegisteredAgent(loadedModule.name);
        let step = runtime.state.unloadedSteps.get(loadedModule.name);
        if (step !== undefined && unloadedNames.has(loadedModule.name))
          reportReloadFailure(
            loadedModule.name,
            engineCreateFailedError(loadedModule.name, {
              stage: "engine.create",
              reason: step.reason,
            }),
            declaringByName.get(loadedModule.name),
          );
      }
    }
    publishRenderPlugins(runtime);
    logModsBackOn(runtime, admitted);
    if (loadedModules.length !== 0 || admitted.length !== 0) invalidateAllHookedCaches();
    noteWorkersLoaded(admitted);
    runtime.state.isSetRecord = true;
  }
  if (declaringByName.size === 0) {
    resetWithholdings(runtime.state);
    commitAdmitted([]);
    return;
  }
  let filtered_2 = argsList.filter((args) => !unloadedNames.has(args.pluginName));
  let filtered_3 = loadedModules.filter((loadedModule) => !unloadedNames.has(loadedModule.name));
  let isUnchanged =
    filtered.length === 0 &&
    [...runtime.state.knownArgs.keys()].every((key) => orderSet.has(key)) &&
    filtered_2.length === filtered_3.length &&
    filtered_2.every((args, index) => reusableByName.get(args.pluginName) === filtered_3[index]);
  if (!isUnchanged) unloadedNames.clear();
  if (runtime.state.isSetRecord && isUnchanged && filtered_3.length === loadedModules.length) {
    forgetDeparted();
    let joined = loadedModules.map((loadedModule) => loadedModule.name).join(", ");
    logForDebugging(`hooks modules unchanged, kept as loaded: ${joined}`);
    return;
  }
  let reason =
    reusableByName.size === 0
      ? undefined
      : describeRefoldReason(runtime, {
          live: loadedModules,
          declaring: argsList,
          kept: reusableByName,
          leaving: filtered,
          unloaded: unloadedNames,
        });
  if (reason !== undefined) {
    reusableByName.clear();
    logForDebugging(`hooks modules reloaded in full: ${reason}`);
  }
  let flattened = argsList.flatMap((args) => reusableByName.get(args.pluginName) ?? []);
  let keptNames = new Set(flattened.map((n11Module) => n11Module.name));
  let goneNames = new Set(
    [...loadedModules.map((loadedModule) => loadedModule.name), ...knownNames, ...order].filter(
      (name) => !keptNames.has(name),
    ),
  );
  let attemptedNames = new Set();
  let seated = new Set(keptNames);
  let loads = new Map();
  runtime.state.isSetRecord = false;
  try {
    for (;;) {
      let loadedNow = [];
      for (let args of argsList) {
        if (
          keptNames.has(args.pluginName) ||
          refusedNames.has(args.pluginName) ||
          attemptedNames.has(args.pluginName) ||
          unloadedNames.has(args.pluginName)
        )
          continue;
        knownNames.add(args.pluginName);
        setKnownArgs(runtime.state, args);
        try {
          let n12Module = await loadAndRegisterHooksModule(runtime, args);
          n12Module.shown = shownPluginInfo(args, declaringByName.get(args.pluginName));
          n12Module.judgedUnder = judgedUnderOf(args.pluginName);
          loadedNow.push(n12Module);
          runtime.state.unadmitted.add(n12Module.environmentId);
          loads.set(n12Module.environmentId, n12Module);
          bumpGeneration(args.pluginName, runtime);
          logFeatureOk("plugin_function_hooks_load", classifyPluginOrigin(args));
          logForDebugging(
            `hooks module ${n12Module.label} loaded (${n12Module.hopKey.kind}, environment ${n12Module.environmentId}, tier ${n12Module.tier}); events: ` +
              joinedKeys(n12Module.patterns),
          );
        } catch (error) {
          attemptedNames.add(args.pluginName);
          logHookLoadFailure(error, "module_load_failed", args);
          logForDebugging(`hooks module ${pluginStorageKey(args)} failed to load: ` + errorWithCause(error), {
            level: "error",
          });
          if (abandonIfWorkerDied(runtime, loadedNow, "the load")) {
            forgetDeparted();
            return;
          }
          let plugin = declaringByName.get(args.pluginName);
          if (servingNames.has(args.pluginName)) reportReloadFailure(args.pluginName, error, plugin);
          else reportHookLoadFailure(args.pluginName, error, plugin);
        }
      }
      if (keptNames.size > 0) {
        let joined = [...keptNames].join(", ");
        logForDebugging(`hooks modules kept as loaded, unchanged: ${joined}`);
      }
      let isFirstFold = keptNames.size === 0;
      let engineApi = await buildEngineApi(
        runtime,
        loadedNow,
        isFirstFold
          ? foldBaseForRespawn(
              runtime,
              loadedNow.map((n13Module) => n13Module.name),
            )
          : foldBaseWithout_2(runtime.state, goneNames, order),
      );
      if (runtime.state.environmentHost?.died !== undefined) {
        discardUnadmitted(engineApi);
        return;
      }
      let builtByName = new Map([...engineApi, ...flattened].map((n14Module) => [n14Module.name, n14Module]));
      let { admitted, refused } = await admitBuiltModules(runtime, {
        built: order.flatMap((name) => builtByName.get(name) ?? []),
        plugins: declaringByName,
        seated,
        serving: servingNames,
      });
      for (let n15Module of refused) refusedNames.add(n15Module.name);
      if (runtime.state.environmentHost?.died !== undefined) {
        discardUnadmitted(admitted);
        return;
      }
      let filtered = refused.filter((n16Module) => n16Module.hooks("engine.create"));
      if (filtered.length !== 0) {
        logForDebugging(
          `hooks modules ${joinLabels(filtered)} refused after the engine.create fold ran with them; the set folds again without`,
        );
        for (let n17Module of admitted) {
          seated.add(n17Module.name);
          if (!isReusable(n17Module)) n17Module.discard();
        }
        continue;
      }
      for (let n18Module of loadedNow)
        if (!engineApi.includes(n18Module)) {
          let error = engineCreateFailedError(
            n18Module.name,
            runtime.state.buildFailures.get(n18Module.name),
          );
          if (servingNames.has(n18Module.name))
            reportReloadFailure(n18Module.name, error, declaringByName.get(n18Module.name));
          else reportHookLoadFailure(n18Module.name, error, declaringByName.get(n18Module.name));
          logModLoadFailed(n18Module.args, "fold_failed");
        }
      await runWhileAdmitting(runtime, admitted, () => resolveElementTables(admitted));
      if (runtime.state.environmentHost?.died !== undefined) {
        discardUnadmitted(admitted);
        return;
      }
      commitAdmitted(admitted);
      return;
    }
  } finally {
    runtime.state.admitting = undefined;
    for (let [envId, n19Module] of loads) if (runtime.state.unadmitted.has(envId)) n19Module.discard();
  }
}
//@ chunk-5xgkngpb.js:4178348-4178459 placement
function isLaterPlugin(name, runtime) {
  let names = [...runtime.state.knownPlugins.keys()];
  let index = names.indexOf(name);
  return (other) => index !== -1 && names.indexOf(other.name) > index;
}
//@ chunk-5xgkngpb.js:4178459-4178483 placement
/**
 * 取参数的层级
 */
var providerRankOfArgs = (args) => providerRankOf(args.args);
//@ chunk-5xgkngpb.js:4178483-4178593 placement
function needsFullReload(pluginName, runtime, live) {
  let args = runtime.state.knownArgs.get(pluginName);
  return (
    findReloadTriggerEvent({
      live,
      scans: args ? [args.scan] : [],
    }) !== undefined || isCrashedOrWithholding(pluginName, runtime)
  );
}
//@ chunk-5xgkngpb.js:4178593-4178676 placement
/**
 * 逐个退役模块并收集错误
 */
function retireModules(modules) {
  let errors = [];
  for (let n20Module of modules)
    try {
      n20Module.retire();
    } catch (error) {
      errors.push(error);
    }
  return errors;
}
//@ chunk-5xgkngpb.js:4178676-4179087 placement
/**
 * 某插件使 hooks worker 崩溃时：记遥测、报告插件问题（列出仍保持扣留的 $ 名称）并发出失败事件。
 */
function reportWorkerCrash({ state }, name, { reason, fields }) {
  let args = state.knownArgs.get(name);
  if (args === undefined) return;
  logFeatureBad("plugin_function_hooks_load", "crashed_worker", {
    ...classifyPluginOrigin(args),
    ...fields,
  });
  let mapped = withheldNounsOf(state, name).map((host) => `$.${host}`);
  let line = mapped.length > 0;
  reportPluginProblem(
    name,
    `${name} was unloaded: it crashed the hooks worker` +
      (line
        ? `; what it withheld (${mapped.join(", ")}) stays withheld until it reloads or is disabled`
        : ""),
  );
  emit({
    plugin: name,
    event: "*",
    reason,
    effect: PLUGIN_UNLOADED_TEXT,
    hasOverrun: false,
  });
}
//@ chunk-5xgkngpb.js:4179087-4179712 placement
/**
 * 卸载一组 hooks 模块，记录退役时抛出的错误。
 */
async function unloadHooksModules(runtime, names, reason) {
  let crash = typeof reason === "string" ? undefined : reason;
  let pluginRegistry = getPluginRegistry();
  let modules = pluginRegistry.loadedModules.filter((loadedModule) => names.has(loadedModule.name));
  let filtered = pluginRegistry.loadedModules.filter((loadedModule) => !names.has(loadedModule.name));
  let any = [...names].some((name) =>
    needsFullReload(
      name,
      runtime,
      modules.find((n21Module) => n21Module.name === name),
    ),
  );
  pluginRegistry.loadedModules = filtered;
  if (any) runtime.state.isSetRecord = false;
  for (let name of names) {
    if (crash !== undefined) reportWorkerCrash(runtime, name, crash);
    forgetPlugin(name, runtime);
  }
  if (crash !== undefined) reportWorkerCrashWithholdings(runtime.state, names);
  else liftWithholdings(runtime.state, names);
  let retired = retireModules(modules);
  publishRenderPlugins(runtime);
  invalidateAllHookedCaches();
  noteWorkersLoaded(pluginRegistry.loadedModules);
  logForDebugging(
    `hooks modules unloaded: ${[...names].map((name) => modules.find((n22Module) => n22Module.name === name)?.label ?? name).join(", ")} (${crash?.reason ?? reason})`,
  );
  await resolveElementTables(filtered);
  invalidateAll();
  if (retired.length > 0)
    throw AggregateError(
      retired,
      "a hooks module threw as it retired: " + retired.map(errorMessage).join("; "),
    );
}
//@ chunk-5xgkngpb.js:4179712-4179851 placement
async function withUnadmitted(runtime, n23Module, fn) {
  runtime.state.unadmitted.add(n23Module.environmentId);
  try {
    return await fn();
  } finally {
    runtime.state.unadmitted.delete(n23Module.environmentId);
  }
}
//@ chunk-5xgkngpb.js:4179851-4179963 placement
function insertionIndex(modules, rank, order) {
  let index = modules.findIndex(
    (n24Module) =>
      order.rank(n24Module) > rank || (order.rank(n24Module) === rank && order.isBeneath(n24Module)),
  );
  return index === -1 ? modules.length : index;
}
//@ chunk-5xgkngpb.js:4179963-4180048 placement
/**
 * 按层级插入模块
 */
function insertByRank(modules, n25Module, order) {
  let index = insertionIndex(modules, order.rank(n25Module), order);
  return [...modules.slice(0, index), n25Module, ...modules.slice(index)];
}
//@ chunk-5xgkngpb.js:4180048-4182838 placement
/**
 * 按名字重载一个 hooks 模块；worker 中途死亡、模块被移出声明集等情况都给出原因。
 */
async function reloadHooksModuleByName(name, runtime) {
  let pluginRegistry = getPluginRegistry();
  let live = pluginRegistry.loadedModules.find((loadedModule) => loadedModule.name === name);
  let plugin = runtime.state.knownPlugins.get(name);
  let args = live?.args ?? runtime.state.knownArgs.get(name) ?? (await reprepareFromPlugin(runtime, plugin));
  if (!args) throw new HooksError(`no hooks module named ${name} is loaded or declared`);
  let previousArgs = args;
  let diedText = (died) =>
    `${name}: the hooks worker died during the reload (${died}); the respawn reloads the declared set`;
  function ensureStillDeclared(stage) {
    if (!runtime.state.knownArgs.has(name))
      throw new HooksError(
        `${name}: unloaded while its reload ${stage} (` +
          (runtime.state.environmentHost?.died ?? "it left the declared set") +
          "); not reloaded",
      );
  }
  let rescanned = await rescanHooksModuleArgs(runtime.state, args, plugin);
  ensureStillDeclared("read its args");
  let startTime = performance.now();
  let loadedModules = pluginRegistry.loadedModules;
  let secondStartTime =
    needsFullReload(name, runtime, live) ||
    findReloadTriggerEvent({
      live: undefined,
      scans: [rescanned.scan],
    }) !== undefined;
  runtime.state.isSetRecord = runtime.state.isSetRecord && !secondStartTime;
  let order = {
    rank: providerRankOfArgs,
    isBeneath: isLaterPlugin(name, runtime),
  };
  let insertAt = live
    ? loadedModules.indexOf(live)
    : insertionIndex(loadedModules, providerRankOf(rescanned), order);
  let refusal = await judgePluginRegister({
    args: rescanned,
    plugin,
    judges: registerJudges({
      before: loadedModules.slice(0, insertAt),
      after: loadedModules.slice(live ? insertAt + 1 : insertAt),
      isNative: Boolean(builtinModuleOf(rescanned)),
      tier: rescanned.tier,
    }),
  });
  if (refusal) {
    let reason = describeRegisterRefusal(refusal) + (live ? PREVIOUS_VERSION_UNLOADED : "");
    let secondNames = new Set([name]);
    if (live) await unloadHooksModules(runtime, secondNames, reason);
    else {
      forgetPlugin(name, runtime);
      liftWithholdings(runtime.state, secondNames);
    }
    return {
      refused: reason,
      ms: performance.now() - startTime,
    };
  }
  ensureStillDeclared("was admitted");
  runtime.state.knownArgs.set(name, rescanned);
  let n26Module;
  let thirdNext;
  let foldBase = foldBaseWithout(runtime.state, name);
  let summary = lastFoldSummary(runtime.state);
  let withholdings = runtime.state.withholdings.get(name);
  function restore() {
    if (runtime.state.knownArgs.has(name)) runtime.state.knownArgs.set(name, previousArgs);
    if (withholdings) runtime.state.withholdings.set(name, withholdings);
    else runtime.state.withholdings.delete(name);
    recordRefoldResult(runtime.state, summary);
  }
  try {
    n26Module = await loadAndRegisterHooksModule(runtime, rescanned);
    n26Module.shown = shownPluginInfo(rescanned, plugin);
    n26Module.judgedUnder = admissionTextFor(live);
    [thirdNext] = await withUnadmitted(runtime, n26Module, () =>
      buildEngineApi(runtime, [n26Module], foldBase),
    );
  } catch (error) {
    restore();
    throw error;
  }
  if (!thirdNext) {
    restore();
    let any = [...runtime.state.buildFailures.keys()].some((key) => key !== name);
    if (any) {
      let secondLoad = {
        scans: undefined,
        read: Promise.withResolvers(),
        judgedUnder: undefined,
      };
      runtime.state.loading.add(secondLoad);
      await loadHooksModuleSet(runtime, [...runtime.state.knownPlugins.values()], secondLoad).finally(() => {
        runtime.state.loading.delete(secondLoad);
        secondLoad.read.resolve();
        runtime.state.loadingRead.emit();
      });
    }
    let died = runtime.state.environmentHost?.died;
    let found = pluginRegistry.loadedModules.find(
      (loadedModule) => any && died === undefined && loadedModule.name === name,
    );
    if (found !== undefined) {
      let ms = performance.now() - startTime;
      logForDebugging(
        `hooks module ${found.label} reloaded with the whole set in ${ms.toFixed(1)}ms; events: ` +
          joinedKeys(found.patterns),
      );
      return {
        events: [...found.patterns],
        ms,
      };
    }
    let failure = runtime.state.buildFailures.get(name);
    let missedFold = any && failure === undefined;
    let hadPrevious = any && live !== undefined;
    throw new HooksError(
      died === undefined
        ? `${name}: ` +
            (missedFold
              ? "not loaded by the fold of the whole set"
              : `${failure?.stage ?? "engine.create"} failed on reload` +
                (failure === undefined ? "" : ` (${failure.reason})`)) +
            (hadPrevious ? PREVIOUS_VERSION_UNLOADED : "")
        : diedText(died),
    );
  }
  let modules = live
    ? pluginRegistry.loadedModules.map((loadedModule) => (loadedModule === live ? n26Module : loadedModule))
    : insertByRank(pluginRegistry.loadedModules, n26Module, order);
  await resolveElementTables(modules);
  let died = runtime.state.environmentHost?.died;
  if (died !== undefined) {
    restore();
    throw new HooksError(diedText(died));
  }
  pluginRegistry.loadedModules = modules;
  runtime.state.unloadedSteps.clear();
  live?.retire();
  runtime.state.crashedWithholders.delete(name);
  bumpGeneration(name, runtime);
  publishRenderPlugins(runtime);
  logModsBackOn(runtime, [n26Module]);
  invalidateAllHookedCaches();
  clearBackdropFor(name);
  forgetSessionStartCall(name);
  noteWorkersLoaded(pluginRegistry.loadedModules);
  let ms = performance.now() - startTime;
  logForDebugging(
    `hooks module ${n26Module.label} reloaded in ${ms.toFixed(1)}ms; events: ` +
      joinedKeys(n26Module.patterns),
  );
  return {
    events: [...n26Module.patterns],
    ms,
  };
}
//@ chunk-5xgkngpb.js:4182838-4182859 placement
/**
 * 重载失败错误类
 */
let ReloadFailedError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4182838", () => {
  ReloadFailedError = class ReloadFailedError extends HooksError {};
});
//@ chunk-5xgkngpb.js:4182859-4183051 placement
/**
 * 执行重载，失败时包装为说明插件仍在旧版本运行的错误。
 */
async function wrapReloadError(name, fn) {
  let pluginRegistry = getPluginRegistry();
  let found = pluginRegistry.loadedModules.find((loadedModule) => loadedModule.name === name);
  try {
    return await fn();
  } catch (error) {
    throw found?.status().kind === "live" && pluginRegistry.loadedModules.includes(found)
      ? new ReloadFailedError(errorMessage(error), {
          cause: error,
        })
      : error;
  }
}
//@ chunk-5xgkngpb.js:4183051-4183105 placement
/**
 * 排队重载模块
 */
var queueReload = (name, runtime) =>
  runtime.state.queue(() => wrapReloadError(name, () => reloadHooksModuleByName(name, runtime)));
//@ chunk-5xgkngpb.js:4183105-4183369 placement
/**
 * 开始加载一批模块：设置重载器并登记加载状态。
 */
function startLoadingModules(runtime, plugins, judgedUnder) {
  workerSlots.setReloader((name) => queueReload(name, runtime));
  isStoredLoginPinned();
  let load = {
    scans: undefined,
    read: Promise.withResolvers(),
    judgedUnder,
  };
  runtime.state.loading.add(load);
  return runtime.state
    .queue(() => loadHooksModuleSet(runtime, plugins, load))
    .finally(() => {
      runtime.state.loading.delete(load);
      load.read.resolve();
      runtime.state.loadingRead.emit();
    });
}
//@ chunk-5xgkngpb.js:4183369-4183456 placement
/**
 * 等待所有模块读取
 */
async function waitForModuleReads(hooksHost) {
  await Promise.all([...hooksHost.state.loading].map((thirdLoad) => thirdLoad.read.promise));
}
//@ chunk-5xgkngpb.js:4183456-4183558 placement
/**
 * 判断正在加载的模块中是否有处理某 command.run 的。
 */
function isLoadingCommandRun(hooksHost, command) {
  return [...hooksHost.state.loading].some(
    (fourthLoad) =>
      fourthLoad.scans === undefined || fourthLoad.scans.some((scan) => handlesCommandRun(scan, command)),
  );
}
//@ chunk-5xgkngpb.js:4183558-4183704 placement
/**
 * 判断正在加载或已知的模块中是否有处理任何 command.run 的。
 */
function isLoadingAnyCommandRun(hooksHost) {
  return (
    [...hooksHost.state.loading].some(
      (fifthLoad) => fifthLoad.scans === undefined || fifthLoad.scans.some(needsRefoldScan),
    ) || [...hooksHost.state.knownArgs.values()].some((knownArg) => needsRefoldScan(knownArg.scan))
  );
}
//@ chunk-5xgkngpb.js:4183704-4183881 placement
/**
 * 列出插件 hooks 模块的文件。
 */
function hooksModuleFilesOf(name, hooksHost) {
  let args = loadedModuleArgs(name) ?? hooksHost.state.knownArgs.get(name);
  if (args) return hooksModuleFiles(args).map((file) => file.file);
  let plugin = hooksHost.state.knownPlugins.get(name);
  return plugin !== undefined && plugin.modulePath === undefined ? [] : undefined;
}
//@ chunk-5xgkngpb.js:4183881-4184234 placement
/**
 * 卸载已被禁用或卸载的插件的 hooks 模块（排队执行）。
 */
var unloadDisabledPlugins = (hooksHost, mode) =>
  hooksHost.state.queue(async () => {
    function storageOf(name) {
      let plugin = hooksHost.state.knownPlugins.get(name);
      if (plugin === undefined) return storageIdOf(hooksHost.state, name);
      return marketplaceSource(plugin);
    }
    let disabled = new Set(
      [...hooksHost.state.knownArgs.keys(), ...hooksHost.state.knownPlugins.keys()].filter(
        (name) => !mode.has(storageOf(name)),
      ),
    );
    if (disabled.size === 0) return;
    for (let fourthName of disabled) hooksHost.state.knownPlugins.delete(fourthName);
    await unloadHooksModules(hooksHost, disabled, "plugin disabled or uninstalled");
  });
//@ chunk-5xgkngpb.js:4184277-4185369 placement
/**
 * 插件选项（options）状态文案：不能解析、被扣留、失败、已重载、被拒绝。
 */
var HOOKS_OPTIONS_STATUS_TEXT = (hooksHost, attemptLoad) =>
  hooksHost.state.queue(async () => {
    let optionsReloadFailures = hooksHost.state.optionsReloadFailures;
    let brokenTrustedSetting = findBrokenTrustedSetting();
    let reason = `${brokenTrustedSetting} does not parse; options not read`;
    async function statusOf(name, serverName) {
      if (!(Object.keys(serverName.manifest.userConfig ?? {}).length > 0)) return;
      if (brokenTrustedSetting !== undefined)
        return {
          name,
          kind: "held",
          reason,
        };
      let secondReason = pluginOptionsSnapshot(serverName);
      let brokenSource =
        getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === name)?.args ??
        hooksHost.state.knownArgs.get(name);
      if (
        brokenSource !== undefined &&
        isDeepStrictEqual(secondReason.options, pickNonSensitiveOptions(brokenSource.options, serverName))
      ) {
        optionsReloadFailures.delete(name);
        return;
      }
      let outputs = optionsReloadFailures.get(name);
      let plugin = hooksHost.state.generations.get(name);
      if (
        outputs !== undefined &&
        outputs.wanted === secondReason.text &&
        (brokenSource === undefined || outputs.generation === plugin)
      )
        return {
          name,
          kind: "failing",
          error: outputs.error,
        };
      try {
        let failure = await attemptLoad(name);
        if (failure.refused === undefined) {
          optionsReloadFailures.delete(name);
          return {
            name,
            kind: "reloaded",
            result: failure,
            recovers: outputs !== undefined,
          };
        }
        optionsReloadFailures.set(name, {
          generation: hooksHost.state.generations.get(name),
          wanted: secondReason.text,
          error: new HooksError(failure.refused),
        });
        return {
          name,
          kind: "refused",
          result: failure,
        };
      } catch (error) {
        optionsReloadFailures.set(name, {
          generation: plugin,
          wanted: secondReason.text,
          error,
        });
        return {
          name,
          kind: "failed",
          error,
        };
      }
    }
    for (let key of optionsReloadFailures.keys())
      if (!hooksHost.state.knownPlugins.has(key)) optionsReloadFailures.delete(key);
    let options = [];
    for (let [want, secondWant] of hooksHost.state.knownPlugins) {
      let have = await statusOf(want, secondWant);
      if (have !== undefined) options.push(have);
    }
    return options;
  });
//@ chunk-5xgkngpb.js:4185412-4185631 placement
/**
 * 合并插件记录：清单与 hooks 配置未变时保留原记录。
 */
function mergePluginRecord(record, next) {
  let manifest = {
    ...next.manifest,
    name: record.manifest.name,
  };
  return record.modulePath === next.modulePath &&
    isDeepStrictEqual(record.manifest, manifest) &&
    isDeepStrictEqual(record.hooksConfig, next.hooksConfig)
    ? record
    : {
        ...record,
        manifest,
        hooksConfig: next.hooksConfig,
        modulePath: next.modulePath,
      };
}
//@ chunk-5xgkngpb.js:4185631-4186002 placement
/**
 * 重新读取已知插件记录（排队执行），manifest 不再指定 hooks 模块时卸载；返回前后的模块路径。
 */
var retargetKnownPlugin = (name, hooksHost, fn) =>
  hooksHost.state.queue(async () => {
    let plugin = hooksHost.state.knownPlugins.get(name);
    if (plugin === undefined) return;
    let next = await wrapReloadError(name, () => fn(plugin));
    let hasLive =
      getPluginRegistry().loadedModules.some((loadedModule) => loadedModule.name === name) ||
      hooksHost.state.knownArgs.has(name);
    hooksHost.state.knownPlugins.set(name, mergePluginRecord(plugin, next));
    if (next.modulePath === undefined && hasLive)
      await unloadHooksModules(hooksHost, new Set([name]), "its manifest names no hooks module now");
    return {
      before: plugin.modulePath,
      now: next.modulePath,
    };
  });
//@ chunk-5xgkngpb.js:4186002-4186171 placement
/**
 * 记录 worker 中 mods 被关闭（数量与时间）。
 */
function logModsTurnedOff(runtime, modules) {
  let builtinCount = countWhere(modules, (n27Module) => builtinModuleOf(n27Module) !== undefined);
  runtime.state.modsOffAt = Date.now();
  logFeatureBad("plugin_function_hooks_worker_mods", "turned_off", {
    worker_mods: modules.length - builtinCount,
    native_mods: builtinCount,
  });
}
//@ chunk-5xgkngpb.js:4222636-4223032 placement
var loadHooksModules; // deferred: uses initHooksHost (./hooksWorkerHost.js) of its import cycle while loading; runs once the cycle is complete
var mayHookCommand;
var mayRegisterCommands;
var loadingScansRead;
var onLoadingScansRead;
var pruneHooksModules;
var reloadHooksModule;
var retryUnloadedModules;
var refreshOptions;
var retargetHooksModule;
var loadedFilesOf;
var buildInterfaces;
var routeInterfaceCall;
var runHostOp;
var retireEnvironmentHost;
var opsDelivered;
var workInFlight;
var applyPendingInvalidations;
deferInit("chunk-5xgkngpb.js:4222636", () => {
  ({
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
  } = initHooksHost());
});
export {
  retryUnloadedModules,
  loadSurfaceModules,
  opsDelivered,
  applyPendingInvalidations,
  flushDeferredProblems,
  HOOKS_READY_TIMEOUT_MS,
  inlineProblemsSeen,
  orderHooksModules,
  reportInlinePluginNotice,
  loadHooksModules,
  pruneHooksModules,
  refreshOptions,
  workersLoadedReporter,
  registeredAgentsTable,
  refreshAgentsAndDefinitions,
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
  loadAndRegisterHooksModule,
  admissionTextFor,
  errorWithCause,
  resolveElementTables,
  reportWorkerCrash,
  bindAsyncResource,
  unloadHooksModules,
  hookHostKind,
  assembleHooksModuleRuntime,
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
  mergePluginRecord,
  retargetHooksModule,
  findReverseDependents,
  loadedFilesOf,
  reloadHooksModule,
  loadingScansRead,
  mayRegisterCommands,
  mayHookCommand,
  onLoadingScansRead,
  loadedPluginOptions,
  workInFlight,
};
