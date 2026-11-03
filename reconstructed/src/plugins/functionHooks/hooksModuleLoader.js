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
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { ge } from "../../utils/identity.js";
import { getPrintOutputFormat, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { writeToStderr } from "../../utils/process.js";
import { marketplaceOf, pluginDisplayKey } from "../../utils/plugins/pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE } from "../../utils/telemetry/pluginTelemetry.js";
import { stripControlChars as stripControlChars_3 } from "../../utils/settings/writeQueues.js";
import { lCn, describeMatcher, ZUi } from "../../utils/hooks/functionHookMatchers.js";
import { reportPluginProblem, pluginStorageKey, moduleMatcherAdmits, q4o, dkt } from "./hooksWorkerClient.js";
import { adviseUiRenderMatcher } from "./sites/uiSites.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { HOOK_EVENTS as HOOK_EVENTS_2, isHookEvent, isPluginDefinedEvent } from "./hookApiSurface.js";
import {
  CORE_ORIGIN,
  isEventPattern,
  matchesEventPattern,
  jeo,
  vSi,
  matchesEventForPlugin,
  hooksModuleFiles,
} from "./eventPatterns.js";
import { HooksError, Aos, SIe, _xt, lpr } from "./hooksErrors.js";
import { tiersBeneath } from "./builtinHooksModule.js";
import {
  telemetryStreamRefusal,
  kqs,
  listLinkedFiles,
  scanHooksModule,
  scanSealedHooksModule,
} from "./hooksModuleScan.js";
import { isOfficialMarketplacePlugin, classifyPluginOrigin } from "./panes.js";
import { nCn } from "./moduleLoader.js";
import { to } from "../../utils/valueSlot.js";
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
import { Wq } from "../../utils/plugins/loadPluginHooks.js";
import { pickNonSensitiveOptions, readSealedPluginTexts, x$t } from "./sealedPlugins.js";
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
import { R6r, x6r, isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { getVouchedPolicyPluginIds, resolveManagedPluginOrder } from "../../utils/plugins/managedPlugins.js";
import { resolveManagedPluginDigests } from "../../utils/plugins/managedPluginSeating.js";
import { pluginTier, createWithheldElementWarner, freeze_4 as freeze_4_2 } from "./dispatch/chain.js";
import { cpr } from "../../utils/permissions/permissions.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { lp, G3 } from "./surfaceBinding.js";
import { M$e } from "../../services/mcp/mcpClientCapabilities.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logError } from "../../utils/log.js";
import { jbi, Bbi } from "./vm/boundaryCopy.js";
import { isBuiltinPluginId, getBuiltinPlugin } from "../builtinPlugins.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { buildElementTable } from "./ui/elements.js";
import { createSurfaceAnswerCache, Oeo, noStreamingOps } from "./vm/moduleLoader.js";
import { registerHooksModule } from "./api/register.js";
import { uniq, count } from "../../utils/collections.js";
import { ensureNativeHost, ensureEnvironmentHost, initHooksHost } from "./hooksWorkerHost.js";
import { releaseWaitingCalls, GAe } from "./commandApi.js";
import { fLr, vOn } from "./modLoadTelemetry.js";
import { dispatchHookCall, hookPluginLabel, Yni } from "./hookDispatch.js";
import { _ee } from "../../utils/cloudTrash.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { assertPluginHooksAdmitted } from "../../utils/hooks/hookPolicyHold.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  glt,
  Woe,
  publishRenderPlugins,
  forgetPlugin,
  liftWithholdings,
  resetWithholdings,
  mlt,
  foldBaseForRespawn,
  foldBaseWithout,
  aBn,
  withheldNounsOf,
  reportWorkerCrashWithholdings,
  jes,
  Ges,
  recordRefoldResult,
} from "./sameThreadHost.js";
import {
  Rx,
  shownPluginInfo,
  admitBuiltModules,
  bBn,
  judgePluginRegister,
  registerJudges,
  describeRegisterRefusal,
} from "./pluginRegister.js";
import {
  findReloadTriggerEvent,
  ABn,
  engineCreateFailedError,
  abandonIfWorkerDied,
  buildEngineApi,
} from "./engineCreate.js";
import { providerRank } from "./providerTiers.js";
import { dependencyRefMatches, qualifyDependency } from "../../utils/plugins/dependencyResolver.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS } from "./dispatch/slowHookReports.js";
import { freeze_3 as freeze_3_2 } from "./ui/renderSites.js";
import { Y3 } from "./mcpServerHooks.js";
import { qY } from "./mcpApi.js";
import { XAe, ZV, l4 } from "./apiDispatch.js";
import { emit } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { ser } from "./ui/renderInstances.js";
import { gMe } from "./promptApi.js";
import { isStoredLoginPinned } from "../../cli/headlessCloud/attachServe.js";
import { IT } from "../hooksModules/loadedModuleFilters.js";

//@ chunk-e6aww6q8.js:733946-733981 placement
var kFt = ge(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:733981-734014 placement
var Jpe = ge([], (e) => {
  e.length = 0;
});
//@ chunk-e6aww6q8.js:734014-734086 placement
function Zpe() {
  return getPrintOutputFormat() === "text" && env.CLAUDE_CODE_SESSION_KIND !== "bg";
}
//@ chunk-e6aww6q8.js:734086-734165 placement
function bNi() {
  let splice = Jpe.splice(0);
  if (!Zpe()) return;
  for (let n of splice)
    writeToStderr(`${n}
`);
}
//@ chunk-e6aww6q8.js:734165-734200 placement
var Uje = ge(new Set(), (e) => e.clear());
/**
 * 非交互会话里，内联插件的问题输出到 stderr（去重；格式化输出时先缓存）。
 */
//@ chunk-e6aww6q8.js:734200-734378 placement
function reportInlinePluginNotice(e, n) {
  let r = marketplaceOf(e.source) === INLINE_PLUGIN_MARKETPLACE;
  if (!getIsNonInteractiveSession() || !r) return;
  let s = stripControlChars_3(`${e.name}: ${n}`);
  if (Uje.has(s)) return;
  if ((Uje.add(s), getPrintOutputFormat() === null)) {
    Jpe.push(s);
    return;
  }
  if (Zpe())
    writeToStderr(`${s}
`);
}
/**
 * 在所有宿主的进行中分发上执行回调。
 */
//@ chunk-e6aww6q8.js:734378-734603 placement
function withInFlightDispatches(e, n, r) {
  let filtered = [e.state.environmentHost, e.state.nativeHost].filter((h) => h !== void 0);
  return r(n, { [Symbol.iterator]: () => filtered.flatMap((h) => [...h.inFlight()]).values() }, (h) =>
    filtered.map((y) => y.nameOf(h)).find((y) => y !== void 0),
  );
}
/**
 * 取 tool.call 事件中的工具名。
 */
//@ chunk-e6aww6q8.js:734603-734705 placement
function toolNameOfCall(e, n) {
  let r = e === "tool.call" && "tool" in n ? n.tool : void 0;
  return typeof r === "string" ? r : void 0;
}
//@ chunk-e6aww6q8.js:734751-734782 placement
var wFt = () => AsyncResource.bind((e) => e());
//@ chunk-e6aww6q8.js:734782-734823 placement
var TFt = (e, n, r) => ({ ...e, ...n, options: r });
//@ chunk-e6aww6q8.js:734823-734891 placement
var jje = (e) => (e.startsWith("!") ? e.slice(1) : e).startsWith(`${lCn}.`);
//@ chunk-e6aww6q8.js:734891-735062 placement
function warnProtoPatterns(e, n) {
  for (let r of new Set(n.map((s) => s.pattern)))
    if (jje(r) && !r.startsWith("!"))
      reportPluginProblem(e, `registered ${r}; that name cannot be a noun, so this hook is never run`);
}
//@ chunk-e6aww6q8.js:735062-735333 placement
function adviseUiRenderMatchers(e, n) {
  for (let { pattern: pattern, matcher: matcher } of n) {
    if (!(pattern === "ui.render" && matcher !== void 0)) continue;
    try {
      let y = adviseUiRenderMatcher(matcher);
      if (y !== void 0)
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
    ...HOOK_EVENTS_2,
    ...Object.entries(r).flatMap(([h, y]) =>
      y.owner !== CORE_ORIGIN ? y.methods.map((method) => `${h}.${method}`) : [],
    ),
  ];
  for (let h of n) {
    if (jje(h)) continue;
    if (isEventPattern(h)) {
      let startsWith = h.startsWith("!"),
        q = startsWith ? h.slice(1) : h;
      if (!s.some((Se) => matchesEventPattern(q, Se)))
        throw new HooksError(
          `${e}: registered on("${h}"), ` +
            (startsWith ? "whose negated pattern selects no event" : "which selects no event"),
        );
      continue;
    }
    if (isHookEvent(h)) continue;
    let index = h.indexOf("."),
      sliced = h.slice(0, index),
      sliced_2 = h.slice(index + 1),
      L = Object.hasOwn(r, sliced) ? r[sliced] : void 0;
    if (!L) throw new HooksError(`${e}: registered ${h}, but no loaded plugin provides $.${sliced}`);
    if (L.owner === CORE_ORIGIN)
      throw new HooksError(
        `${e}: registered ${h}, which is a call on core's $.${sliced} that is not an event`,
      );
    if (!L.methods.includes(sliced_2))
      throw new HooksError(`${e}: registered ${h}, but $.${sliced} (${L.owner}) has no method ${sliced_2}`);
  }
}
/**
 * 校验扫描到的 next.to 目标：只有托管插件可用，且目标须在该层允许的下层之中。
 */
//@ chunk-e6aww6q8.js:736099-736506 placement
function checkNextToAllowed(e, n, r) {
  let s = tiersBeneath(r);
  for (let h of n.nextTo ?? []) {
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
/**
 * 校验注册的事件：必须是已知事件或插件自定义事件，且出现在模块扫描结果里。
 */
//@ chunk-e6aww6q8.js:736506-736889 placement
function checkRegisteredEvents(e, n, r) {
  for (let s of r) {
    let h = jeo(s);
    if (h !== void 0) throw new HooksError(`${e}: registered ${h}`);
    let y = isHookEvent(s),
      S = vSi(s);
    if (S !== void 0 && !isHookEvent(S) && !isPluginDefinedEvent(S))
      throw new HooksError(`${e}: registered "${s}", which is not an event`);
    if (
      !n.hooks.some(
        (hook) =>
          hook === s || (y && isEventPattern(hook) && matchesEventForPlugin(hook, s, { isBuiltin: !1 })),
      )
    )
      throw new HooksError(
        `${e}: registered ${s}, which the scan of its hooks module did not see (host check)`,
      );
  }
}
//@ chunk-e6aww6q8.js:743601-743796 placement
function checkScanPolicy(e, n, r) {
  let s = telemetryStreamRefusal(n, { isBuiltin: isOfficialMarketplacePlugin(r) });
  if (s !== void 0) throw new HooksError(`${e}: hooks module not loaded; ${s} (policy/scan)`);
  let h = kqs(n);
  if (h !== void 0) logForDebugging(`${e}: hooks telemetry for: ${h}`);
}
//@ chunk-e6aww6q8.js:762691-762704 placement
var T7 = nCn();
//@ chunk-e6aww6q8.js:762704-762740 placement
var EBr = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:762740-762812 placement
function O$t(e) {
  let n = EBr.get();
  return n?.pluginId === e ? n.options : void 0;
}
//@ chunk-e6aww6q8.js:762812-763072 placement
function warnOptionsOutsideChoices(e, n, r) {
  for (let [s, h] of Object.entries(n)) {
    let y = r[s]?.options;
    if (y !== void 0 && isOutsideOptions(r[s], h)) {
      let w = r[s]?.default,
        L = w === void 0 ? "unset" : `the default, ${String(w)}`;
      reportPluginProblem(
        e,
        `option ${s} in settings is not one of ${y.join(", ")}; it reads as ${L}`,
        "once",
      );
    }
  }
}
/**
 * 读取并校验插件 userConfig 选项：取设置中的值（项目设置不读）、补默认值并校验；不合法时内置插件抛错，其他回退为默认值。
 */
//@ chunk-e6aww6q8.js:763072-763791 placement
async function resolvePluginOptions(e) {
  let n = e.manifest.userConfig ?? {};
  if (Object.keys(n).length === 0) return {};
  (clearPluginOptionsCache(),
    T7.set(marketplaceSource(e), {
      before: T7.get(marketplaceSource(e))?.now,
      now: pluginOptionsFingerprint(marketplaceSource(e)),
    }));
  let r = O$t(marketplaceSource(e)) ?? (await loadPluginOptions(marketplaceSource(e))),
    s =
      "pluginConfigs[" +
      pluginIdAliases(marketplaceSource(e))
        .map((S) => JSON.stringify(S))
        .join(" or ") +
      "].options";
  if (Object.keys(r).length === 0)
    logForDebugging(
      `plugin ${e.name}: no ${s} in user, --settings or managed settings (project settings are not read); every option is its default`,
    );
  warnOptionsOutsideChoices(e.name, r, n);
  let h = applyUserConfigDefaults(r, n),
    y = validateUserConfig(h, n);
  if (!y.valid) {
    let S = Wq(marketplaceSource(e)),
      w = `${e.name}: options do not fit plugin.json userConfig: ${y.errors.join("; ")} (settings.json ${s})`;
    if (!S) throw new HooksError(w);
    return (
      logForDebugging(`${w} \u2014 loading on its defaults instead`, { level: "error" }),
      applyUserConfigDefaults({}, n)
    );
  }
  return h;
}
/**
 * 插件当前非敏感选项及其稳定 JSON 文本（用于比较是否变化）。
 */
//@ chunk-e6aww6q8.js:763791-763978 placement
function pluginOptionsSnapshot(e) {
  let n = pickNonSensitiveOptions(
    applyUserConfigDefaults(
      trustedPluginSetting(marketplaceSource(e)).options ?? {},
      e.manifest.userConfig ?? {},
    ),
    e,
  );
  return {
    options: n,
    text: jsonStringify(Object.fromEntries(Object.entries(n).toSorted(([r], [s]) => r.localeCompare(s)))),
  };
}
//@ chunk-e6aww6q8.js:763978-764059 placement
var Ewo = () =>
  TRUSTED_SETTING_SOURCES.find(
    (e) =>
      getSettingsForSource(e) === null &&
      getSettingsParseErrorsForSource(e).some((n) => n.severity !== "warning"),
  );
/**
 * 加载插件的一个界面模块：读取、链接、检查导出，返回模块或问题。
 */
//@ chunk-e6aww6q8.js:764103-764429 placement
async function loadSurfaceModule(e, n, r) {
  let s = resolve_12(n, ...e.split("/")),
    { source: source, graph: graph } = await loadHooksModuleGraph(s, n, r),
    S = graph.files.get(s),
    w = S ? findSurfaceComponent(S.scanned.program) : { problem: "was not linked" };
  if ("problem" in w) throw new HooksError(`${r}: surface module ${e.split("/").join(sep_23)} ` + w.problem);
  return { module: e, modulePath: s, component: w.component, source: source, ...listLinkedFiles(graph, s) };
}
/**
 * 依次加载插件的所有界面模块。
 */
//@ chunk-e6aww6q8.js:764429-764540 placement
async function loadSurfaceModules(e, n, r) {
  if (!e || e.length === 0) return;
  let s = [];
  for (let h of e) s.push(await loadSurfaceModule(h, n, r));
  return s;
}
/**
 * 为插件的 hooks 模块准备加载参数：检查准入与命名冲突、读取选项、扫描（或使用密封文本）、加载界面模块、确定层级并校验 next.to 与策略。
 */
//@ chunk-e6aww6q8.js:764540-765457 placement
async function prepareHooksModuleArgs(e, n, r) {
  let s = hooksModulesRefusalReason();
  if (s !== void 0) throw new HookAdmissionError(n.name, s);
  if (
    (R6r.set(() => getVouchedPolicyPluginIds()),
    x6r.set((Se) => (resolveManagedPluginDigests(Se) ?? []).length > 0),
    getPreToolStageOrder().includes(n.name))
  )
    throw new HooksError(
      `${n.name}: hooks module not loaded; the name is the engine's own chain member (plugin.json name)`,
    );
  let h = await readSealedPluginTexts(e, n, r),
    y = await resolvePluginOptions(n),
    S =
      h === void 0
        ? await scanHooksModule(r, n.path, n.name)
        : await scanSealedHooksModule({ modulePath: r, pluginRoot: n.path, pluginName: n.name, texts: h });
  if (h !== void 0 && (S.scan.clients ?? []).length > 0)
    throw new NotOrganizationPluginError(n.name, "it names surface modules");
  let L = await loadSurfaceModules(S.scan.clients, n.path, n.name),
    G = marketplaceSource(n),
    q = h === void 0 ? getVouchedPolicyPluginIds() : x$t(G, getVouchedPolicyPluginIds()),
    Z = pluginTier(G, q, resolveManagedPluginOrder());
  return (
    checkNextToAllowed(n.name, S.scan, Z),
    checkScanPolicy(n.name, S.scan, G),
    {
      modulePath: r,
      pluginName: n.name,
      pluginRoot: n.path,
      pluginStorageId: G,
      tier: Z,
      isPersons: cpr(G, q),
      scan: S.scan,
      source: S.source,
      linked: S.linked,
      links: S.links,
      options: y,
      ...(L !== void 0 && { surfaceModules: L }),
      ...(h !== void 0 && { sealed: !0 }),
      ...(!isFreshHeronEnabled() && { isLeavingUncopied: !0 }),
    }
  );
}
//@ chunk-e6aww6q8.js:765457-765505 placement
var N$t = (e, n) => `${e}: not loaded within ${n}ms`;
//@ chunk-e6aww6q8.js:765505-765583 placement
function Fme(e) {
  let n = Aos(e);
  if (n === void 0) return errorMessage(e);
  return `${errorMessage(e)} (${n})`;
}
//@ chunk-e6aww6q8.js:765583-765662 placement
async function P3n() {
  (getHostState().agentDefinitions.clear(), await lp()?.refreshAgents());
}
//@ chunk-e6aww6q8.js:765662-765717 placement
var cWe = (e) => `${pluginDisplayKey(e.plugin, e.pluginId)}:` + e.spec.name;
/**
 * 插件登记的代理表：只列出可用插件的代理，支持登记与查询。
 */
//@ chunk-e6aww6q8.js:765717-766018 placement
function createRegisteredAgentsTable(e) {
  return {
    list: () => [...e().values()].filter((n) => M$e(n.plugin)),
    held: (n) => {
      let r = e().get(n);
      return r !== void 0 && M$e(r.plugin) ? r : void 0;
    },
    register: (n) => {
      e().set(cWe(n), n);
    },
    forget: (n) => {
      let r = e(),
        filtered = [...r.values()].filter((h) => h.plugin === n);
      for (let h of filtered) r.delete(cWe(h));
      return filtered.length > 0;
    },
  };
}
//@ chunk-e6aww6q8.js:766018-766057 placement
var fWe = createRegisteredAgentsTable(() => getPluginRegistry().registeredAgents);
//@ chunk-e6aww6q8.js:766057-766112 placement
function ID(e) {
  if (fWe.forget(e)) P3n().catch((n) => logError(n));
}
//@ chunk-e6aww6q8.js:3701193-3701373 placement
function installJsxGlobals() {
  let e = globalThis;
  for (let [n, r] of Object.entries({ h: jbi, Fragment: Bbi }))
    if (e[n] === void 0)
      Object.defineProperty(e, n, { value: r, writable: !0, configurable: !0, enumerable: !1 });
}
/**
 * 若是内置插件，返回其内嵌的 hooks 模块对象。
 */
//@ chunk-e6aww6q8.js:3701373-3701505 placement
function builtinModuleOf(e) {
  if (!isBuiltinPluginId(e.pluginStorageId)) return;
  let n = getBuiltinPlugin(e.pluginName)?.hooksModule;
  return n !== void 0 && "module" in n ? n.module : void 0;
}
//@ chunk-e6aww6q8.js:3701505-3701623 placement
function createUiResolveCopier(e) {
  let n = createWithheldElementWarner(e);
  return (r, s) =>
    isPlainObject_4(r)
      ? Object.freeze(
          Object.assign(
            Object.create(null),
            buildElementTable(r, (h) => h, n(s)),
          ),
        )
      : r;
}
/**
 * 校验 hooks 模块导出：必须是二进制内置的模块或函数形式，next 等字段类型正确。
 */
//@ chunk-e6aww6q8.js:3701623-3703563 placement
var validateHooksModuleExports = async (e, n, r = {}) => {
  let { pluginName: pluginName } = n,
    h = builtinModuleOf(n);
  if (!h)
    throw new HooksError(
      `${pluginName}: not a hooks module the binary carries; it loads in the plugin sandbox, not natively`,
    );
  installJsxGlobals();
  let y = r.framed ?? ((Me, We) => We()),
    S = !1,
    weakMap = new WeakMap(),
    L = createSurfaceAnswerCache(createUiResolveCopier(pluginName));
  function G(Me) {
    if (S) throw SIe(pluginName);
    if (typeof Me !== "function") throw new HooksError(`${pluginName}: not a function`);
    return Me;
  }
  let q = async (Me, We, ze) => await Reflect.apply(G(Me), ze, We),
    Z = (Me) => {
      if (!(typeof Me === "object" && Me !== null && "next" in Me && typeof Me.next === "function"))
        throw new HooksError(
          `${pluginName}: a hook on a streaming event returns its async generator; got ${Me === null ? "null" : typeof Me}`,
        );
      return Me;
    },
    Se = (Me) =>
      typeof Me === "function" && Object.prototype.toString.call(Me) === "[object AsyncGeneratorFunction]";
  async function ke(...Me) {
    let [We, ze, lt] = Me;
    try {
      return await e(We, ze, lt);
    } catch (error) {
      if (typeof error === "object" && error)
        weakMap.set(error, { plugin: pluginName, op: We, message: errorMessage(error) });
      throw S ? _xt(error, Oeo(weakMap, error)) : error;
    }
  }
  function we(Me, We, ze) {
    let lt = (r.hostStream ?? noStreamingOps)(Me, We, ze);
    return (lt.result.catch((Je) => (S ? _xt(Je, lpr(pluginName, Me, errorMessage(Je))) : Je)), lt);
  }
  let Ee = () => void (S = !0);
  function Ae(Me) {
    return Me instanceof AbortSignal ? { signal: Me, unlink: () => {} } : void 0;
  }
  r.signal?.addEventListener("abort", Ee, { once: !0 });
  let Ie;
  try {
    if (
      ((Ie = await registerHooksModule({
        loaded: h,
        args: n,
        host: ke,
        hostStream: we,
        resolvedTable: L.read,
        invoke: q,
        iterate: Z,
        streamIn: (Me) => Me,
        isGeneratorHook: Se,
        wrapMethod: (Me) => Me,
        signalFrom: Ae,
        makeSignal: () => {
          let abortController = new AbortController();
          return { signal: abortController.signal, abort: (We) => abortController.abort(We) };
        },
        copyMatcher: (Me) => Me,
        stamped: (Me) => Me(),
        framed: y,
      })),
      r.signal?.aborted === !0)
    )
      throw new HooksError(`${pluginName}: unloaded while its module loaded`);
  } catch (error) {
    throw (Ee(), error);
  }
  return {
    activation: Ie,
    invoke: q,
    invokeSync: (Me, We) => G(Me)(We),
    applyIn: (Me, We, ...ze) => Reflect.apply(G(We), Me, ze),
    cloneIn: (Me) => Me,
    argumentFor: (Me) => Me,
    freezeForNext: (Me) => Object.freeze(Me),
    leaving: (Me) => Me,
    nextFor: (Me) => Me,
    streamNextFor: (Me) => Me,
    storeResolved: L.store,
    dispose: () => {
      (Ee(), Ie.dispose());
    },
    opFailureOf: (Me) => Oeo(weakMap, Me),
    ownsValue: () => !1,
  };
};
//@ chunk-e6aww6q8.js:3703563-3703578 placement
var AOn = (e) => e;
/**
 * 为模块注册表建立按事件的索引：匹配的注册项、是否监听、是否有 catch、组合 matcher。
 */
//@ chunk-e6aww6q8.js:3703578-3704164 placement
function createRegistrationIndex(e, n) {
  let r = new Map();
  function s(y) {
    let S = r.get(y);
    if (S === void 0)
      ((S = e.flatMap((w, L) => (matchesEventForPlugin(w.pattern, y, n) ? [L] : []))), r.set(y, S));
    return S;
  }
  let h = (y, S = []) =>
    s(y).flatMap((w) => {
      let L = e[w];
      return L === void 0 || S.includes(w) ? [] : [L];
    });
  return {
    patterns: uniq(e.map((y) => y.pattern)),
    registrationsFor: s,
    standingFor: h,
    hooks: (y, S) => h(y, S).length > 0,
    catches: (y, S, w) =>
      h(y, S).some((L) => L.caught === !0 && (L.matcher === void 0 || w?.(L.matcher) !== !1)),
    hasCatch: (y) => e[y]?.caught === !0,
    matcherFor: (y, S) => {
      let w;
      for (let [L, G] of h(y, S).entries()) {
        if (G.matcher === void 0) return;
        w = L === 0 ? G.matcher : [w, G.matcher];
      }
      return w;
    },
  };
}
//@ chunk-e6aww6q8.js:3704164-3704243 placement
function yoe(e, n, r) {
  return e().kind === "unloaded" ? Promise.reject(new HooksError(n)) : r();
}
/**
 * 描述 hooks 模块的当前状态（live、unloaded、retiring、dead、error）。
 */
//@ chunk-e6aww6q8.js:3704243-3705997 placement
async function describeHooksModuleState(e, n) {
  let r = hooksModulesRefusalReason();
  if (r !== void 0) throw new HookAdmissionError(n.pluginName, r);
  let h = builtinModuleOf(n) !== void 0 ? ensureNativeHost(e) : void 0,
    y = h ?? ensureEnvironmentHost(e),
    S = ++e.state.environmentCounter,
    load = await y.load(S, n);
  try {
    checkRegisteredEvents(
      n.pluginName,
      n.scan,
      load.registered.map((Ee) => Ee.pattern),
    );
  } catch (error) {
    throw (y.unload(S), error);
  }
  let L = pluginStorageKey(n);
  (adviseUiRenderMatchers(L, load.registered),
    warnProtoPatterns(n.pluginName, load.registered),
    getPluginRegistry().moduleSeats.set(n.pluginName, n.tier),
    e.state.environmentArgs.set(S, n));
  let G = { kind: "live" },
    q = 0,
    Z = `hooks module ${L} unloaded`;
  function Se() {
    if (G.kind === "live" || G.kind === "retiring") {
      ((G = { kind: "unloaded", retired: G.kind === "retiring" }), e.state.environmentArgs.delete(S));
      try {
        y.unload(S);
      } finally {
        releaseWaitingCalls(e.state.sentCalls, S);
      }
    }
  }
  function ke() {
    let died = y.died;
    return died !== void 0 && G.kind !== "unloaded" ? { kind: "dead", reason: died } : G;
  }
  let we = AOn({
    name: n.pluginName,
    label: L,
    tier: n.tier,
    ...createRegistrationIndex(load.registered, {
      isBuiltin: isOfficialMarketplacePlugin(n.pluginStorageId),
    }),
    args: n,
    environmentId: S,
    hopKey: y,
    ...(h !== void 0 && { link: (Ee) => h.link(S, Ee), streamLinks: (Ee) => h.linkStreams(S, Ee) }),
    status: ke,
    enter: () => {
      ((q += 1), fLr(n.pluginStorageId));
    },
    leave() {
      if (((q -= 1), G.kind === "retiring" && q === 0)) Se();
    },
    dispatch: (Ee, Ae, Ie) =>
      dispatchHookCall({
        members: [we],
        event: Ee,
        e: Ae,
        call: Ie,
        signal: Ie.signal,
        hookOrigin: void 0,
        origin: Ie.origin,
        floors: freeze_4_2,
      }),
    discard: Se,
    retire() {
      (GAe(n.pluginName),
        ID(n.pluginName),
        e.state.environmentArgs.delete(S),
        _ee.forgetPresses(n.pluginName));
      try {
        G3()?.forget(n.pluginName);
      } catch (error) {
        logForDebugging(`${n.pluginName}: ${errorMessage(error)}`, { level: "error" });
      }
      if (G.kind === "live") G = { kind: "retiring" };
      if (q === 0) Se();
    },
    resolveTables: (Ee) =>
      yoe(
        () => G,
        Z,
        () => y.resolveTables(S, Ee),
      ),
    build: (Ee, Ae) =>
      yoe(
        () => G,
        Z,
        () => y.build(S, Ee, Ae),
      ),
    callInterface: (Ee, Ae) =>
      yoe(
        () => G,
        Z,
        () => y.callInterface(S, Ee, Ae),
      ),
    press: (Ee, Ae) =>
      yoe(
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
var iEt = 1e4;
/**
 * 复制注册子句（模式、matcher 与 caught）。
 */
//@ chunk-e6aww6q8.js:3706009-3706161 placement
var copyRegistrations = (e, n) =>
  e.map(({ pattern: pattern, matcher: matcher, caught: caught }) => ({
    pattern: pattern,
    ...(matcher !== void 0 && { matcher: ZUi(matcher, `${n}: on("${pattern}", matcher)`) }),
    ...(caught === !0 && { caught: caught }),
  }));
/**
 * 重载前重新扫描插件的 hooks 模块并重算层级；组织插件与密封插件有额外限制。
 */
//@ chunk-e6aww6q8.js:3706161-3706953 placement
async function rescanHooksModuleArgs(e, n, r) {
  if (r) or();
  let pluginStorageId = n.pluginStorageId;
  if (resolveManagedPluginDigests(pluginStorageId) !== void 0) {
    if (r?.modulePath === void 0)
      throw new NotOrganizationPluginError(n.pluginName, "no entry the host holds can be proved");
    return prepareHooksModuleArgs(e, r, r.modulePath);
  }
  if (n.sealed === !0)
    throw new NotOrganizationPluginError(
      n.pluginName,
      "a proved module of this name may not come back from disk",
    );
  assertPluginHooksAdmitted(e, { pluginName: n.pluginName, pluginId: pluginStorageId, plugin: r });
  let y = r?.modulePath ?? n.modulePath,
    S = r?.path ?? n.pluginRoot,
    w = r?.name ?? n.pluginName,
    L = await scanHooksModule(y, S, w),
    { surfaceModules: surfaceModules, ...q } = n,
    Z = await loadSurfaceModules(L.scan.clients, S, w),
    Se = { ...q, ...(Z !== void 0 && { surfaceModules: Z }) },
    ke = pluginTier(n.pluginStorageId, getVouchedPolicyPluginIds(), resolveManagedPluginOrder()),
    we = cpr(n.pluginStorageId, getVouchedPolicyPluginIds());
  if ((checkNextToAllowed(w, L.scan, ke), checkScanPolicy(w, L.scan, n.pluginStorageId), !r))
    return { ...Se, ...L, tier: ke, isPersons: we };
  return TFt({ ...Se, modulePath: y, tier: ke, isPersons: we }, L, await resolvePluginOptions(r));
}
//@ chunk-e6aww6q8.js:3706953-3706989 placement
var r2r = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:4053009-4053100 placement
function zoe(e, n, r) {
  if (!(e instanceof HookAdmissionError))
    (logFeatureBad("plugin_function_hooks_load", n, classifyPluginOrigin(r)), vOn(r, n));
}
//@ chunk-e6aww6q8.js:4053100-4053221 placement
async function reprepareFromPlugin(e, n) {
  if (n?.modulePath === void 0) return;
  let r = await prepareHooksModuleArgs(e.state, n, n.modulePath);
  return (glt(e.state, r), r);
}
//@ chunk-e6aww6q8.js:4053221-4053303 placement
function nF(e, n) {
  let r = errorMessage(n),
    s = `${e}: `;
  return r.startsWith(s) ? r.slice(s.length) : r;
}
//@ chunk-e6aww6q8.js:4053303-4053389 placement
function I4(e, n, r) {
  let s = `hooks module did not load: ${nF(e, n)}`;
  if ((reportPluginProblem(e, s), r)) reportInlinePluginNotice(r, s);
}
//@ chunk-e6aww6q8.js:4053389-4053425 placement
function qoe(e, n, r) {
  I4(e, errorMessage(n) + Rx, r);
}
//@ chunk-e6aww6q8.js:4053425-4053473 placement
var TBn = (e, n) => e.find((r) => r.name === n[0]?.hook);
/**
 * 判断加载这组模块时是否需要整组重新折叠 engine.create，返回原因文字（无需则 undefined）。
 */
//@ chunk-e6aww6q8.js:4062208-4063156 placement
function describeRefoldReason(
  e,
  { live: live, declaring: declaring, kept: kept, leaving: leaving, unloaded: unloaded },
) {
  let S = new Map(live.map((ke) => [ke.name, ke])),
    w = new Map(declaring.map((ke) => [ke.pluginName, ke])),
    L = new Set([...S.keys(), ...e.state.knownArgs.keys(), ...w.keys()]);
  for (let ke of L) {
    if (kept.has(ke) || unloaded.has(ke)) continue;
    let we = e.state.knownArgs.get(ke),
      Ee = w.get(ke),
      flattened = [we, Ee].flatMap((ze) => (ze ? [ze.scan] : [])),
      Ie = findReloadTriggerEvent({ live: S.get(ke), scans: flattened });
    if (!Ie) continue;
    let Me = S.has(ke) || we !== void 0;
    return `${ke} hooks ${Ie} and ${!Ee ? "leaves" : Me ? "loads afresh" : "joins"}`;
  }
  let G = leaving[0] ?? e.state.crashedWithholders.keys().next().value;
  if (G !== void 0) return `${G} crashed with its withholdings standing`;
  if (e.state.lastEndedBy !== void 0) return `${e.state.lastEndedBy} ended the last fold without next`;
  if (!e.state.isSetRecord) return ABn;
  let flattened = live.flatMap((ke) => (kept.get(ke.name) === ke ? [ke.name] : [])),
    flattened_2 = declaring.flatMap((ke) => (kept.has(ke.pluginName) ? [ke.pluginName] : []));
  return flattened.some((ke, we) => flattened_2[we] !== ke) ? "the kept modules change order" : void 0;
}
//@ chunk-e6aww6q8.js:4063156-4063273 placement
function handlesCommandRun(e, n) {
  return (
    e.hooks.some((hook) => matchesEventPattern(hook, "command.run")) &&
    (e.runCommands === void 0 || e.runCommands.includes(n))
  );
}
//@ chunk-e6aww6q8.js:4063273-4063333 placement
function xlt(e) {
  return e.calls.includes("command.register");
}
/**
 * 取插件适用的准入文本。
 */
//@ chunk-e6aww6q8.js:4063376-4063479 placement
function admissionTextFor(e) {
  let admissionText = getPluginRegistry().admissionText;
  if (admissionText === null) return admissionText;
  return e !== void 0 && isModuleAdmitted(e) ? admissionText : e?.judgedUnder;
}
//@ chunk-e6aww6q8.js:4063479-4063613 placement
function recordOptionsReloadFailure(e, n, r) {
  e.state.optionsReloadFailures.set(n.name, {
    generation: e.state.generations.get(n.name),
    wanted: pluginOptionsSnapshot(n).text,
    error: r,
  });
}
//@ chunk-e6aww6q8.js:4063613-4063643 placement
var OBn = (e) => providerRank(e, getVouchedPolicyPluginIds(), resolveManagedPluginOrder());
//@ chunk-e6aww6q8.js:4063643-4063758 placement
function providerRankOf(e) {
  return e.sealed === !0
    ? providerRank(
        e.pluginStorageId,
        x$t(e.pluginStorageId, getVouchedPolicyPluginIds()),
        resolveManagedPluginOrder(),
      )
    : OBn(e.pluginStorageId);
}
/**
 * 插件 n 的 manifest.dependencies 是否引用插件 e。
 */
//@ chunk-e6aww6q8.js:4063758-4063869 placement = findReverseDependents (0.826)
function findReverseDependents(pluginId, plugins) {
  return (
    plugins !== pluginId &&
    (pluginId.manifest.dependencies ?? []).some((r) =>
      dependencyRefMatches(qualifyDependency(r, pluginId.source), plugins.source, pluginId.source),
    )
  );
}
/**
 * 按依赖关系对插件做拓扑排序（同层保持原顺序），并找出依赖环。
 */
//@ chunk-e6aww6q8.js:4063869-4064754 placement
function orderByDependencies(e, n) {
  let r = new Set(e),
    s = new Map(e.map((ke) => [ke, uniq(n(ke)).filter((we) => we !== ke && r.has(we))])),
    h = new Map();
  for (let ke of e) {
    let we = new Set(),
      Ee = [...(s.get(ke) ?? [])];
    for (let Ae = Ee.pop(); Ae; Ae = Ee.pop()) if (!we.has(Ae)) (we.add(Ae), Ee.push(...(s.get(Ae) ?? [])));
    h.set(ke, we);
  }
  let y = (ke, we) => h.get(ke)?.has(we) === !0 && h.get(we)?.has(ke) === !0,
    S = [];
  for (let ke of e) {
    let filtered = e.filter((Ae) => Ae === ke || y(ke, Ae));
    if (filtered.length > 1 && filtered[0] === ke) S.push(filtered);
  }
  let w = new Map(
      e.map((ke, we) => [
        ke,
        [...(s.get(ke) ?? []).filter((Ee) => !y(ke, Ee)), ...e.slice(we + 1).filter((Ee) => y(ke, Ee))],
      ]),
    ),
    groupBy = Map.groupBy([...w.values()].flat(), (ke) => ke),
    G = new Map(e.map((ke) => [ke, groupBy.get(ke)?.length ?? 0])),
    q = (ke) => G.get(ke) === 0,
    Z = [],
    Se = e;
  while (Se.length > 0) {
    let max = Math.max(Se.findIndex(q), 0);
    for (let we of Se.slice(max, max + 1)) {
      Z.push(we);
      for (let Ee of w.get(we) ?? []) G.set(Ee, (G.get(Ee) ?? 0) - 1);
    }
    Se = Se.toSpliced(max, 1);
  }
  return { order: Z, cycles: S };
}
/**
 * 按提供者层级与依赖关系排列 hooks 模块顺序，并说明冲突时谁优先。
 */
//@ chunk-e6aww6q8.js:4064754-4065681 placement
function orderHooksModules(e, n) {
  let mapped = e.map((S) => ({ plugin: S, ...n(S) })),
    s = new Map(
      mapped.map((S) => {
        let filtered = mapped.filter((L) => findReverseDependents(S.plugin, L.plugin));
        for (let L of filtered) {
          let G = L.rank < S.rank,
            Z =
              L.tier === S.tier
                ? `placed outside it in the ${L.tier} tier; that place wins`
                : `in the ${L.tier} tier, outside the ${S.tier} tier; tier order wins`;
          if (G)
            logForDebugging(
              `hooks module order: ${S.plugin.source} depends on ${L.plugin.source}, which is ${Z}, so ${L.plugin.source} stays outer`,
              { level: "warn" },
            );
        }
        return [S, filtered];
      }),
    ),
    h = [];
  for (let S of Map.groupBy(mapped, (w) => w.rank).values()) {
    let w = orderByDependencies(S, (L) => s.get(L) ?? []);
    for (let cycle of w.cycles)
      logForDebugging(
        `hooks module order: ${cycle.map((G) => G.plugin.source).join(", ")} depend on one another in a cycle; that dependency order is refused and they register in the order they were chosen in`,
        { level: "error" },
      );
    h.push(...w.order.map((L) => L.plugin));
  }
  if (h.some((S, w) => S !== e[w]))
    logForDebugging("hooks module order: dependencies register " + h.map((S) => S.source).join(", "));
  return h;
}
/**
 * 让密封插件按指定顺序排在其他插件前面。
 */
//@ chunk-e6aww6q8.js:4065681-4066023 placement
function orderSealedModules(e, n) {
  if (!e.some((h) => h.sealed === !0)) return e;
  let s = new Map(e.map((h) => [h.pluginName, h]));
  return orderHooksModules(
    e.toSorted((h, y) => providerRankOf(h) - providerRankOf(y)).flatMap((h) => n.get(h.pluginName) ?? []),
    (h) => {
      let y = s.get(h.name);
      if (y === void 0) throw Error("a plugin was placed with no declaration");
      return { rank: providerRankOf(y), tier: y.tier };
    },
  ).flatMap((h) => s.get(h.name) ?? []);
}
//@ chunk-e6aww6q8.js:4066023-4066254 placement
function logModsBackOn(e, n) {
  let { modsOffAt: modsOffAt } = e.state,
    s = count(n, (h) => builtinModuleOf(h.args) === void 0);
  if (modsOffAt === void 0 || s === 0) return;
  ((e.state.modsOffAt = void 0),
    logFeatureOk("plugin_function_hooks_worker_mods", {
      off_s: Math.max(0, Math.floor((Date.now() - modsOffAt) / SLOW_HOOK_REPORT_INTERVAL_MS)),
      worker_mods: s,
    }));
}
//@ chunk-e6aww6q8.js:4066254-4066278 placement
var Dlt = /\bimport\s*\(/;
/**
 * 判断已加载模块的参数与展示是否与新的完全一致（且源码不含动态 import），可复用。
 */
//@ chunk-e6aww6q8.js:4066321-4066445 placement
function isModuleUnchanged(e, n, r) {
  return (
    !Dlt.test(n.source) &&
    !n.linked.some((s) => Dlt.test(s.source)) &&
    isDeepStrictEqual_17(e.args, n) &&
    isDeepStrictEqual_17(e.shown, shownPluginInfo(n, r))
  );
}
//@ chunk-e6aww6q8.js:4066445-4066512 placement
var pOe = () => (env.CLAUDE_CODE_HOOKS_SAME_THREAD ? "same-thread" : "worker");
//@ chunk-e6aww6q8.js:4066512-4066751 placement
function reusableLoadedModule(e, n, r) {
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === n.pluginName),
    environmentHost = e.state.environmentHost;
  return found !== void 0 &&
    found.status().kind === "live" &&
    (found.hopKey === e.state.nativeHost ||
      (found.hopKey === environmentHost && environmentHost.kind === pOe())) &&
    isModuleUnchanged(found, n, r) &&
    isModuleAdmitted(found)
    ? found
    : void 0;
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
/**
 * 让每个活动模块重新解析各 UI 组件的元素表（考虑其他模块的 ui.resolve 钩子），失败时保留旧表。
 */
//@ chunk-e6aww6q8.js:4066961-4067284 placement
async function resolveElementTables(e) {
  await Promise.all(
    e
      .filter((n) => n.status().kind === "live")
      .map((n) =>
        n
          .resolveTables(
            freeze_3_2.map((r) => ({
              surface: r.surface,
              component: r.component,
              environments: uiResolveEnvironments(e, n, r),
            })),
          )
          .catch((r) => {
            logForDebugging(
              `hooks module ${n.label}: its element tables were not resolved (${errorMessage(r)}); it keeps the ones it had`,
              { level: "error" },
            );
          }),
      ),
  );
}
/**
 * 加载声明的整组 hooks 模块：未变的保留、变化的全量重载，并记录失败与遥测。
 */
//@ chunk-e6aww6q8.js:4067284-4072469 placement
async function loadHooksModuleSet(e, n, r) {
  let s = getPluginRegistry(),
    loadedModules = s.loadedModules,
    y = (rn) =>
      r.judgedUnder === void 0 ? admissionTextFor(loadedModules.find((pn) => pn.name === rn)) : r.judgedUnder,
    S = new Set(loadedModules.map((rn) => rn.name));
  admissionChangedListener.set(() => {
    (Woe(), publishRenderPlugins(e));
  });
  let w = new Map(),
    L = [],
    G = new Map(),
    q = new Set(e.state.knownArgs.keys()),
    Z = new Set();
  e.state.unattributedCrashes = 0;
  let Se = new Set(n.map((rn) => rn.name));
  for (let rn of n) {
    if (rn.modulePath === void 0) continue;
    w.set(rn.name, rn);
    try {
      let pn = await prepareHooksModuleArgs(e.state, rn, rn.modulePath),
        no = reusableLoadedModule(e, pn, rn);
      if (no !== void 0) G.set(no.name, no);
      L.push(no?.args ?? pn);
    } catch (error) {
      let no = error instanceof NotOrganizationPluginError || error instanceof HookAdmissionRefusal;
      if (no) w.delete(rn.name);
      if (error instanceof HookAdmissionRefusal) {
        logForDebugging(Fme(error));
        continue;
      }
      if (
        (zoe(error, "declaration_failed", { pluginStorageId: marketplaceSource(rn), pluginRoot: rn.path }),
        logForDebugging(`hooks module ${hookPluginLabel(rn)} failed to load: ` + Fme(error), {
          level: "error",
        }),
        !no)
      )
        recordOptionsReloadFailure(e, rn, error);
      S.has(rn.name) ? qoe(rn.name, error, rn) : I4(rn.name, error, rn);
    }
  }
  (L.splice(0, 1 / 0, ...orderSealedModules(L, w)),
    (r.scans = L.map((rn) => rn.scan)),
    r.read.resolve(),
    e.state.loadingRead.emit());
  let mapped = L.map((rn) => rn.pluginName),
    we = new Set(mapped),
    Ee = new Set(
      L.flatMap((rn) => {
        let pn = e.state.unloadedSteps.get(rn.pluginName);
        return pn !== void 0 &&
          isModuleUnchanged(pn, rn, w.get(rn.pluginName)) &&
          isDeepStrictEqual_16(
            pn.order,
            mapped.filter((hn) => pn.order.includes(hn)),
          )
          ? [rn.pluginName]
          : [];
      }),
    ),
    Ae = (rn) => G.get(rn.name) === rn,
    filtered = [...e.state.crashedWithholders.keys()].filter((rn) => !Se.has(rn));
  for (let rn of filtered) (e.state.crashedWithholders.delete(rn), e.state.withholdings.delete(rn));
  function Me() {
    let rn = new Set([...q].filter((no) => !e.state.knownArgs.has(no)));
    e.state.knownPlugins.clear();
    for (let [no, hn] of w) e.state.knownPlugins.set(no, hn);
    for (let no of L) if (!rn.has(no.pluginName) && !Z.has(no.pluginName)) glt(e.state, no);
    let pn = new Set([
      ...[...e.state.crashedWithholders.keys()].filter((no) => !Se.has(no)),
      ...[...e.state.knownArgs.keys()].filter((no) => Z.has(no) || !we.has(no)),
    ]);
    for (let no of pn) forgetPlugin(no, e);
    if (pn.size > 0) liftWithholdings(e.state, pn);
  }
  function We(rn) {
    for (let pn of rn) if (!Ae(pn)) pn.discard();
    Me();
  }
  function ze(rn) {
    let loadedModules = s.loadedModules,
      no = new Set(rn),
      hn = new Set(rn.map((ho) => ho.name));
    s.loadedModules = rn;
    for (let ho of rn) e.state.crashedWithholders.delete(ho.name);
    Me();
    for (let ho of loadedModules) {
      if (!no.has(ho)) ho.retire();
      if (!hn.has(ho.name)) {
        (Y3(ho.name), qY(ho.name), GAe(ho.name), ID(ho.name));
        let yn = e.state.unloadedSteps.get(ho.name);
        if (yn !== void 0 && Ee.has(ho.name))
          qoe(
            ho.name,
            engineCreateFailedError(ho.name, { stage: "engine.create", reason: yn.reason }),
            w.get(ho.name),
          );
      }
    }
    if ((publishRenderPlugins(e), logModsBackOn(e, rn), loadedModules.length !== 0 || rn.length !== 0)) Woe();
    (XAe(rn), (e.state.isSetRecord = !0));
  }
  if (w.size === 0) {
    (resetWithholdings(e.state), ze([]));
    return;
  }
  let filtered_2 = L.filter((rn) => !Ee.has(rn.pluginName)),
    filtered_3 = loadedModules.filter((rn) => !Ee.has(rn.name)),
    nt =
      filtered.length === 0 &&
      [...e.state.knownArgs.keys()].every((rn) => we.has(rn)) &&
      filtered_2.length === filtered_3.length &&
      filtered_2.every((rn, pn) => G.get(rn.pluginName) === filtered_3[pn]);
  if (!nt) Ee.clear();
  if (e.state.isSetRecord && nt && filtered_3.length === loadedModules.length) {
    Me();
    let joined = loadedModules.map((pn) => pn.name).join(", ");
    logForDebugging(`hooks modules unchanged, kept as loaded: ${joined}`);
    return;
  }
  let yt =
    G.size === 0
      ? void 0
      : describeRefoldReason(e, {
          live: loadedModules,
          declaring: L,
          kept: G,
          leaving: filtered,
          unloaded: Ee,
        });
  if (yt !== void 0) (G.clear(), logForDebugging(`hooks modules reloaded in full: ${yt}`));
  let flattened = L.flatMap((rn) => G.get(rn.pluginName) ?? []),
    At = new Set(flattened.map((rn) => rn.name)),
    It = new Set([...loadedModules.map((rn) => rn.name), ...q, ...mapped].filter((rn) => !At.has(rn))),
    Yt = new Set(),
    qt = new Set(At),
    Zt = new Map();
  e.state.isSetRecord = !1;
  try {
    for (;;) {
      let rn = [];
      for (let Xn of L) {
        if (At.has(Xn.pluginName) || Z.has(Xn.pluginName) || Yt.has(Xn.pluginName) || Ee.has(Xn.pluginName))
          continue;
        (q.add(Xn.pluginName), glt(e.state, Xn));
        try {
          let To = await describeHooksModuleState(e, Xn);
          ((To.shown = shownPluginInfo(Xn, w.get(Xn.pluginName))),
            (To.judgedUnder = y(Xn.pluginName)),
            rn.push(To),
            e.state.unadmitted.add(To.environmentId),
            Zt.set(To.environmentId, To),
            mlt(Xn.pluginName, e),
            logFeatureOk("plugin_function_hooks_load", classifyPluginOrigin(Xn)),
            logForDebugging(
              `hooks module ${To.label} loaded (${To.hopKey.kind}, environment ${To.environmentId}, tier ${To.tier}); events: ` +
                q4o(To.patterns),
            ));
        } catch (error) {
          if (
            (Yt.add(Xn.pluginName),
            zoe(error, "module_load_failed", Xn),
            logForDebugging(`hooks module ${pluginStorageKey(Xn)} failed to load: ` + Fme(error), {
              level: "error",
            }),
            abandonIfWorkerDied(e, rn, "the load"))
          ) {
            Me();
            return;
          }
          let bo = w.get(Xn.pluginName);
          S.has(Xn.pluginName) ? qoe(Xn.pluginName, error, bo) : I4(Xn.pluginName, error, bo);
        }
      }
      if (At.size > 0) {
        let joined = [...At].join(", ");
        logForDebugging(`hooks modules kept as loaded, unchanged: ${joined}`);
      }
      let pn = At.size === 0,
        no = await buildEngineApi(
          e,
          rn,
          pn
            ? foldBaseForRespawn(
                e,
                rn.map((Xn) => Xn.name),
              )
            : foldBaseWithout(e.state, It, mapped),
        );
      if (e.state.environmentHost?.died !== void 0) {
        We(no);
        return;
      }
      let hn = new Map([...no, ...flattened].map((Xn) => [Xn.name, Xn])),
        { admitted: admitted, refused: refused } = await admitBuiltModules(e, {
          built: mapped.flatMap((Xn) => hn.get(Xn) ?? []),
          plugins: w,
          seated: qt,
          serving: S,
        });
      for (let Xn of refused) Z.add(Xn.name);
      if (e.state.environmentHost?.died !== void 0) {
        We(admitted);
        return;
      }
      let filtered = refused.filter((Xn) => Xn.hooks("engine.create"));
      if (filtered.length !== 0) {
        logForDebugging(
          `hooks modules ${dkt(filtered)} refused after the engine.create fold ran with them; the set folds again without`,
        );
        for (let Xn of admitted) if ((qt.add(Xn.name), !Ae(Xn))) Xn.discard();
        continue;
      }
      for (let Xn of rn)
        if (!no.includes(Xn)) {
          let fo = engineCreateFailedError(Xn.name, e.state.buildFailures.get(Xn.name));
          (S.has(Xn.name) ? qoe(Xn.name, fo, w.get(Xn.name)) : I4(Xn.name, fo, w.get(Xn.name)),
            vOn(Xn.args, "fold_failed"));
        }
      if (
        (await bBn(e, admitted, () => resolveElementTables(admitted)),
        e.state.environmentHost?.died !== void 0)
      ) {
        We(admitted);
        return;
      }
      ze(admitted);
      return;
    }
  } finally {
    e.state.admitting = void 0;
    for (let [rn, pn] of Zt) if (e.state.unadmitted.has(rn)) pn.discard();
  }
}
//@ chunk-e6aww6q8.js:4072469-4072580 placement
function isLaterPlugin(e, n) {
  let r = [...n.state.knownPlugins.keys()],
    index = r.indexOf(e);
  return (h) => index !== -1 && r.indexOf(h.name) > index;
}
//@ chunk-e6aww6q8.js:4072580-4072604 placement
var kns = (e) => providerRankOf(e.args);
//@ chunk-e6aww6q8.js:4072604-4072714 placement
function needsFullReload(e, n, r) {
  let s = n.state.knownArgs.get(e);
  return findReloadTriggerEvent({ live: r, scans: s ? [s.scan] : [] }) !== void 0 || aBn(e, n);
}
//@ chunk-e6aww6q8.js:4072714-4072797 placement
function BBn(e) {
  let n = [];
  for (let r of e)
    try {
      r.retire();
    } catch (error) {
      n.push(error);
    }
  return n;
}
/**
 * 某插件使 hooks worker 崩溃时：记遥测、报告插件问题（列出仍保持扣留的 $ 名称）并发出失败事件。
 */
//@ chunk-e6aww6q8.js:4072797-4073208 placement
function reportWorkerCrash({ state: state }, n, { reason: reason, fields: fields }) {
  let h = state.knownArgs.get(n);
  if (h === void 0) return;
  logFeatureBad("plugin_function_hooks_load", "crashed_worker", { ...classifyPluginOrigin(h), ...fields });
  let mapped = withheldNounsOf(state, n).map((w) => `$.${w}`),
    S = mapped.length > 0;
  (reportPluginProblem(
    n,
    `${n} was unloaded: it crashed the hooks worker` +
      (S ? `; what it withheld (${mapped.join(", ")}) stays withheld until it reloads or is disabled` : ""),
  ),
    emit({ plugin: n, event: "*", reason: reason, effect: Yni, hasOverrun: !1 }));
}
/**
 * 卸载一组 hooks 模块，记录退役时抛出的错误。
 */
//@ chunk-e6aww6q8.js:4073208-4073829 placement
async function unloadHooksModules(e, n, r) {
  let s = typeof r === "string" ? void 0 : r,
    h = getPluginRegistry(),
    filtered = h.loadedModules.filter((loadedModule) => n.has(loadedModule.name)),
    filtered_2 = h.loadedModules.filter((loadedModule) => !n.has(loadedModule.name)),
    any = [...n].some((q) =>
      needsFullReload(
        q,
        e,
        filtered.find((Z) => Z.name === q),
      ),
    );
  if (((h.loadedModules = filtered_2), any)) e.state.isSetRecord = !1;
  for (let q of n) {
    if (s !== void 0) reportWorkerCrash(e, q, s);
    forgetPlugin(q, e);
  }
  s !== void 0 ? reportWorkerCrashWithholdings(e.state, n) : liftWithholdings(e.state, n);
  let G = BBn(filtered);
  if (
    (publishRenderPlugins(e),
    Woe(),
    XAe(h.loadedModules),
    logForDebugging(
      `hooks modules unloaded: ${[...n].map((q) => filtered.find((Z) => Z.name === q)?.label ?? q).join(", ")} (${s?.reason ?? r})`,
    ),
    await resolveElementTables(filtered_2),
    ser(),
    G.length > 0)
  )
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
function xns(e, n, r) {
  let s = insertionIndex(e, r.rank(n), r);
  return [...e.slice(0, s), n, ...e.slice(s)];
}
/**
 * 按名字重载一个 hooks 模块；worker 中途死亡、模块被移出声明集等情况都给出原因。
 */
//@ chunk-e6aww6q8.js:4074165-4076943 placement
async function reloadHooksModuleByName(e, n) {
  let r = getPluginRegistry(),
    found = r.loadedModules.find((loadedModule) => loadedModule.name === e),
    h = n.state.knownPlugins.get(e),
    y = found?.args ?? n.state.knownArgs.get(e) ?? (await reprepareFromPlugin(n, h));
  if (!y) throw new HooksError(`no hooks module named ${e} is loaded or declared`);
  let S = y,
    w = (Et) => `${e}: the hooks worker died during the reload (${Et}); the respawn reloads the declared set`;
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
  let startTime = performance.now(),
    loadedModules = r.loadedModules,
    Se = needsFullReload(e, n, found) || findReloadTriggerEvent({ live: void 0, scans: [G.scan] }) !== void 0;
  n.state.isSetRecord = n.state.isSetRecord && !Se;
  let ke = { rank: kns, isBeneath: isLaterPlugin(e, n) },
    we = found ? loadedModules.indexOf(found) : insertionIndex(loadedModules, providerRankOf(G), ke),
    Ee = await judgePluginRegister({
      args: G,
      plugin: h,
      judges: registerJudges({
        before: loadedModules.slice(0, we),
        after: loadedModules.slice(found ? we + 1 : we),
        isNative: Boolean(builtinModuleOf(G)),
        tier: G.tier,
      }),
    });
  if (Ee) {
    let Et = describeRegisterRefusal(Ee) + (found ? Rx : ""),
      yt = new Set([e]);
    if (found) await unloadHooksModules(n, yt, Et);
    else (forgetPlugin(e, n), liftWithholdings(n.state, yt));
    return { refused: Et, ms: performance.now() - startTime };
  }
  (L("was admitted"), n.state.knownArgs.set(e, G));
  let Ae,
    Ie,
    Me = jes(n.state, e),
    We = Ges(n.state),
    ze = n.state.withholdings.get(e);
  function lt() {
    if (n.state.knownArgs.has(e)) n.state.knownArgs.set(e, S);
    (ze ? n.state.withholdings.set(e, ze) : n.state.withholdings.delete(e), recordRefoldResult(n.state, We));
  }
  try {
    ((Ae = await describeHooksModuleState(n, G)),
      (Ae.shown = shownPluginInfo(G, h)),
      (Ae.judgedUnder = admissionTextFor(found)),
      ([Ie] = await withUnadmitted(n, Ae, () => buildEngineApi(n, [Ae], Me))));
  } catch (error) {
    throw (lt(), error);
  }
  if (!Ie) {
    lt();
    let any = [...n.state.buildFailures.keys()].some((qt) => qt !== e);
    if (any) {
      let qt = { scans: void 0, read: Promise.withResolvers(), judgedUnder: void 0 };
      (n.state.loading.add(qt),
        await loadHooksModuleSet(n, [...n.state.knownPlugins.values()], qt).finally(() => {
          (n.state.loading.delete(qt), qt.read.resolve(), n.state.loadingRead.emit());
        }));
    }
    let yt = n.state.environmentHost?.died,
      found_2 = r.loadedModules.find((loadedModule) => any && yt === void 0 && loadedModule.name === e);
    if (found_2 !== void 0) {
      let qt = performance.now() - startTime;
      return (
        logForDebugging(
          `hooks module ${found_2.label} reloaded with the whole set in ${qt.toFixed(1)}ms; events: ` +
            q4o(found_2.patterns),
        ),
        { events: [...found_2.patterns], ms: qt }
      );
    }
    let At = n.state.buildFailures.get(e),
      It = any && At === void 0,
      Yt = any && found !== void 0;
    throw new HooksError(
      yt === void 0
        ? `${e}: ` +
            (It
              ? "not loaded by the fold of the whole set"
              : `${At?.stage ?? "engine.create"} failed on reload` +
                (At === void 0 ? "" : ` (${At.reason})`)) +
            (Yt ? Rx : "")
        : w(yt),
    );
  }
  let Je = found
    ? r.loadedModules.map((loadedModule) => (loadedModule === found ? Ae : loadedModule))
    : xns(r.loadedModules, Ae, ke);
  await resolveElementTables(Je);
  let nt = n.state.environmentHost?.died;
  if (nt !== void 0) throw (lt(), new HooksError(w(nt)));
  ((r.loadedModules = Je),
    n.state.unloadedSteps.clear(),
    found?.retire(),
    n.state.crashedWithholders.delete(e),
    mlt(e, n),
    publishRenderPlugins(n),
    logModsBackOn(n, [Ae]),
    Woe(),
    gMe(e),
    XAe(r.loadedModules));
  let pt = performance.now() - startTime;
  return (
    logForDebugging(`hooks module ${Ae.label} reloaded in ${pt.toFixed(1)}ms; events: ` + q4o(Ae.patterns)),
    { events: [...Ae.patterns], ms: pt }
  );
}
//@ chunk-e6aww6q8.js:4076943-4076964 placement
class Wj extends HooksError {}
/**
 * 执行重载，失败时包装为说明插件仍在旧版本运行的错误。
 */
//@ chunk-e6aww6q8.js:4076964-4077156 placement
async function wrapReloadError(e, n) {
  let r = getPluginRegistry(),
    found = r.loadedModules.find((loadedModule) => loadedModule.name === e);
  try {
    return await n();
  } catch (error) {
    throw found?.status().kind === "live" && r.loadedModules.includes(found)
      ? new Wj(errorMessage(error), { cause: error })
      : error;
  }
}
//@ chunk-e6aww6q8.js:4077156-4077210 placement
var Flt = (e, n) => n.state.queue(() => wrapReloadError(e, () => reloadHooksModuleByName(e, n)));
/**
 * 开始加载一批模块：设置重载器并登记加载状态。
 */
//@ chunk-e6aww6q8.js:4077210-4077474 placement
function startLoadingModules(e, n, r) {
  (ZV.setReloader((h) => Flt(h, e)), isStoredLoginPinned());
  let s = { scans: void 0, read: Promise.withResolvers(), judgedUnder: r };
  return (
    e.state.loading.add(s),
    e.state
      .queue(() => loadHooksModuleSet(e, n, s))
      .finally(() => {
        (e.state.loading.delete(s), s.read.resolve(), e.state.loadingRead.emit());
      })
  );
}
//@ chunk-e6aww6q8.js:4077474-4077561 placement
async function WBn(e) {
  await Promise.all([...e.state.loading].map((n) => n.read.promise));
}
/**
 * 判断正在加载的模块中是否有处理某 command.run 的。
 */
//@ chunk-e6aww6q8.js:4077561-4077663 placement
function isLoadingCommandRun(e, n) {
  return [...e.state.loading].some(
    (r) => r.scans === void 0 || r.scans.some((scan) => handlesCommandRun(scan, n)),
  );
}
/**
 * 判断正在加载或已知的模块中是否有处理任何 command.run 的。
 */
//@ chunk-e6aww6q8.js:4077663-4077809 placement
function isLoadingAnyCommandRun(e) {
  return (
    [...e.state.loading].some((n) => n.scans === void 0 || n.scans.some(xlt)) ||
    [...e.state.knownArgs.values()].some((n) => xlt(n.scan))
  );
}
/**
 * 列出插件 hooks 模块的文件。
 */
//@ chunk-e6aww6q8.js:4077809-4077986 placement
function hooksModuleFilesOf(e, n) {
  let r = IT(e) ?? n.state.knownArgs.get(e);
  if (r) return hooksModuleFiles(r).map((y) => y.file);
  let s = n.state.knownPlugins.get(e);
  return s !== void 0 && s.modulePath === void 0 ? [] : void 0;
}
/**
 * 卸载已被禁用或卸载的插件的 hooks 模块（排队执行）。
 */
//@ chunk-e6aww6q8.js:4077986-4078339 placement
var unloadDisabledPlugins = (e, n) =>
  e.state.queue(async () => {
    function r(h) {
      let y = e.state.knownPlugins.get(h);
      if (y === void 0) return l4(e.state, h);
      return marketplaceSource(y);
    }
    let s = new Set(
      [...e.state.knownArgs.keys(), ...e.state.knownPlugins.keys()].filter((h) => !n.has(r(h))),
    );
    if (s.size === 0) return;
    for (let h of s) e.state.knownPlugins.delete(h);
    await unloadHooksModules(e, s, "plugin disabled or uninstalled");
  });
/**
 * 插件选项（options）状态文案：不能解析、被扣留、失败、已重载、被拒绝。
 */
//@ chunk-e6aww6q8.js:4078382-4079470 placement
var HOOKS_OPTIONS_STATUS_TEXT = (e, n) =>
  e.state.queue(async () => {
    let optionsReloadFailures = e.state.optionsReloadFailures,
      s = Ewo(),
      h = `${s} does not parse; options not read`;
    async function y(w, L) {
      if (!(Object.keys(L.manifest.userConfig ?? {}).length > 0)) return;
      if (s !== void 0) return { name: w, kind: "held", reason: h };
      let q = pluginOptionsSnapshot(L),
        Z =
          getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === w)?.args ??
          e.state.knownArgs.get(w);
      if (Z !== void 0 && isDeepStrictEqual_18(q.options, pickNonSensitiveOptions(Z.options, L))) {
        optionsReloadFailures.delete(w);
        return;
      }
      let ke = optionsReloadFailures.get(w),
        we = e.state.generations.get(w);
      if (ke !== void 0 && ke.wanted === q.text && (Z === void 0 || ke.generation === we))
        return { name: w, kind: "failing", error: ke.error };
      try {
        let Ae = await n(w);
        if (Ae.refused === void 0)
          return (
            optionsReloadFailures.delete(w),
            { name: w, kind: "reloaded", result: Ae, recovers: ke !== void 0 }
          );
        return (
          optionsReloadFailures.set(w, {
            generation: e.state.generations.get(w),
            wanted: q.text,
            error: new HooksError(Ae.refused),
          }),
          { name: w, kind: "refused", result: Ae }
        );
      } catch (error) {
        return (
          optionsReloadFailures.set(w, { generation: we, wanted: q.text, error: error }),
          { name: w, kind: "failed", error: error }
        );
      }
    }
    for (let w of optionsReloadFailures.keys())
      if (!e.state.knownPlugins.has(w)) optionsReloadFailures.delete(w);
    let S = [];
    for (let [w, L] of e.state.knownPlugins) {
      let G = await y(w, L);
      if (G !== void 0) S.push(G);
    }
    return S;
  });
/**
 * 合并插件记录：清单与 hooks 配置未变时保留原记录。
 */
//@ chunk-e6aww6q8.js:4079513-4079732 placement
function mergePluginRecord(e, n) {
  let r = { ...n.manifest, name: e.manifest.name };
  return e.modulePath === n.modulePath &&
    isDeepStrictEqual_19(e.manifest, r) &&
    isDeepStrictEqual_19(e.hooksConfig, n.hooksConfig)
    ? e
    : { ...e, manifest: r, hooksConfig: n.hooksConfig, modulePath: n.modulePath };
}
/**
 * 重新读取已知插件记录（排队执行），manifest 不再指定 hooks 模块时卸载；返回前后的模块路径。
 */
//@ chunk-e6aww6q8.js:4079732-4080103 placement
var retargetKnownPlugin = (e, n, r) =>
  n.state.queue(async () => {
    let s = n.state.knownPlugins.get(e);
    if (s === void 0) return;
    let h = await wrapReloadError(e, () => r(s)),
      y =
        getPluginRegistry().loadedModules.some((loadedModule) => loadedModule.name === e) ||
        n.state.knownArgs.has(e);
    if ((n.state.knownPlugins.set(e, mergePluginRecord(s, h)), h.modulePath === void 0 && y))
      await unloadHooksModules(n, new Set([e]), "its manifest names no hooks module now");
    return { before: s.modulePath, now: h.modulePath };
  });
/**
 * 记录 worker 中 mods 被关闭（数量与时间）。
 */
//@ chunk-e6aww6q8.js:4080103-4080272 placement
function logModsTurnedOff(e, n) {
  let r = count(n, (s) => builtinModuleOf(s) !== void 0);
  ((e.state.modsOffAt = Date.now()),
    logFeatureBad("plugin_function_hooks_worker_mods", "turned_off", {
      worker_mods: n.length - r,
      native_mods: r,
    }));
}
//@ chunk-e6aww6q8.js:4116682-4117078 placement
var {
  loadHooksModules: loadHooksModules,
  mayHookCommand: mayHookCommand,
  mayRegisterCommands: mayRegisterCommands,
  loadingScansRead: loadingScansRead,
  onLoadingScansRead: onLoadingScansRead,
  pruneHooksModules: pruneHooksModules,
  reloadHooksModule: reloadHooksModule,
  retryUnloadedModules: retryUnloadedModules,
  refreshOptions: refreshOptions,
  retargetHooksModule: retargetHooksModule,
  loadedFilesOf: loadedFilesOf,
  buildInterfaces: buildInterfaces,
  routeInterfaceCall: routeInterfaceCall,
  runHostOp: runHostOp,
  retireEnvironmentHost: retireEnvironmentHost,
  opsDelivered: opsDelivered,
  workInFlight: workInFlight,
  applyPendingInvalidations: applyPendingInvalidations,
} = initHooksHost();

export {
  r2r,
  bNi,
  retryUnloadedModules,
  opsDelivered,
  applyPendingInvalidations,
  loadingScansRead,
  mayRegisterCommands,
  mayHookCommand,
  onLoadingScansRead,
  loadHooksModules,
  EBr,
  workInFlight,
  loadSurfaceModules,
  mergePluginRecord,
  P3n,
  kFt,
  orderHooksModules,
  reportInlinePluginNotice,
  pruneHooksModules,
  refreshOptions,
  iEt,
  fWe,
  toolNameOfCall,
  N$t,
  copyRegistrations,
  ID,
  pluginOptionsSnapshot,
  reportUnmatchedHookRegistrations,
  TBn,
  zoe,
  builtinModuleOf,
  logModsTurnedOff,
  isModuleUnchanged,
  describeHooksModuleState,
  admissionTextFor,
  Fme,
  resolveElementTables,
  reportWorkerCrash,
  wFt,
  unloadHooksModules,
  pOe,
  validateHooksModuleExports,
  withInFlightDispatches,
  WBn,
  isLoadingAnyCommandRun,
  startLoadingModules,
  isLoadingCommandRun,
  unloadDisabledPlugins,
  Flt,
  HOOKS_OPTIONS_STATUS_TEXT,
  wrapReloadError,
  reloadHooksModuleByName,
  retargetKnownPlugin,
  hooksModuleFilesOf,
  nF,
  Wj,
  T7,
  retargetHooksModule,
  findReverseDependents,
  loadedFilesOf,
  reloadHooksModule,
};
