/**
 * plugins/functionHooks/hooksWorkerClient.ts
 *
 * 2.1.316 新增：过滤出状态为 live 且策略文本一致的模块；插件 $.ui.log：写调试日志并送到 UI（无接收方时暂存）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vr8smdd9.js (40)
 * attribution: placement 40
 */
import { resolve } from "path";
import { identity } from "../../utils/identity.js";
import {
  MAX_SERIALIZED_MATCHER_CHARS,
  findImpossibleObjectMatcher,
  matcherLog,
  impossibleMatcherMessage,
  matchesLiteralMatcher,
  matchesRegExpMatcher,
  isPlainDataObject,
  matchesFields,
} from "../../utils/hooks/functionHookMatchers.js";
import { lookupPathTable } from "../../utils/pathTable.js";
import { envSiteRuleFor, MAX_KEPT_TEXT_CHARS } from "./sites/siteRules.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { logForDebugging } from "../../utils/debug.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { env } from "../../utils/env.js";
import {
  getIsNonInteractiveSession,
  getInlinePlugins,
  getInlinePluginsNoMcp,
} from "../../bootstrap/state.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vr8smdd9.js:1711-1745 placement
/**
 * 匹配警告去重表
 */
var matcherWarned; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr8smdd9.js:1711", () => {
  matcherWarned = identity(new Map(), (map) => map.clear());
});
//@ chunk-vr8smdd9.js:1745-1779 placement
/**
 * 已警告集合
 */
var warnedSets; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr8smdd9.js:1745", () => {
  warnedSets = identity(new Set(), (set) => set.clear());
});
//@ chunk-vr8smdd9.js:1779-2021 placement
/**
 * matcher 未命中时，检查是否因路径不存在等原因，按模块/事件/路径去重打印一次警告。
 */
function warnMatcherMiss(secondModule, event, detail) {
  let key = `${secondModule.name}#${secondModule.environmentId} ${event}`;
  let count = matcherWarned.get(key) ?? 0;
  if (count >= MAX_SERIALIZED_MATCHER_CHARS) return;
  matcherWarned.set(key, count + 1);
  let reason = findImpossibleObjectMatcher(secondModule.matcherFor(event), detail);
  if (reason === undefined) return;
  let message = `${key} ${reason.path}`;
  if (warnedSets.has(message)) return;
  warnedSets.add(message);
  matcherLog().log(impossibleMatcherMessage(secondModule.name, event, reason), "warn");
}
//@ chunk-vr8smdd9.js:2021-2176 placement
/**
 * 判断模块对某事件的 matcher 是否接受载荷（worker 模块用 rpr、原生模块用 gxt），不接受时可能告警。
 */
function moduleMatcherAdmits(thirdModule, event, e) {
  let matcher = thirdModule.matcherFor(event);
  let isWorkerHop = thirdModule.hopKey.kind === "worker";
  if (matcher === undefined) return true;
  let names = lookupPathTable(event);
  let passed = isWorkerHop
    ? matchesLiteralMatcher(matcher, e, names)
    : matchesRegExpMatcher(matcher, e, names);
  if (!passed) warnMatcherMiss(thirdModule, event, e);
  return passed;
}
//@ chunk-vr8smdd9.js:2176-2258 placement
/**
 * 从首个匹配处取模块
 */
function modulesFromMatcher(modules, event, e) {
  let index = modules.findIndex((fourthModule) => moduleMatcherAdmits(fourthModule, event, e));
  return index === -1 ? [] : modules.slice(index);
}
//@ chunk-vr8smdd9.js:2258-2435 placement
/**
 * 按事件的固定键判断模块是否有能处理该载荷的 catch。
 */
function moduleCatchesEvent(fifthModule, event, e) {
  let pinned = isPlainDataObject(e)
    ? Object.fromEntries(
        (envSiteRuleFor(event).pinnedKeys ?? [])
          .filter((key) => Object.hasOwn(e, key))
          .map((key) => [key, e[key]]),
      )
    : {};
  return fifthModule.catches(event, undefined, (change) =>
    matchesFields(change, pinned, lookupPathTable(event)),
  );
}
//@ chunk-vr8smdd9.js:2435-2952 placement
/**
 * 过滤出状态为 live 且策略文本一致的模块。
 */
function liveModulesForDispatch(members, event) {
  let live = [];
  for (let n6Module of members) {
    if (!isModuleAdmitted(n6Module)) {
      logForDebugging(
        `hooks module ${n6Module.label}: judged under a policy text other than the one in force (during ${event}); passing on`,
      );
      continue;
    }
    let status = n6Module.status();
    if (status.kind !== "live") {
      let wasRetired = status.kind === "retiring" || (status.kind === "unloaded" && status.retired);
      let wasUnloaded = status.kind === "unloaded";
      logForDebugging(
        `hooks module ${wasRetired ? `${n6Module.label}: its environment was retired by a reload during ${event}` : wasUnloaded ? `${n6Module.label}: its environment was unloaded (during ${event})` : `${n6Module.label}: ${status.reason} (during ${event})`}; passing on`,
      );
      continue;
    }
    live.push(n6Module);
  }
  return live;
}
//@ chunk-vr8smdd9.js:2952-2983 placement
/**
 * 参与分发的模块
 */
var dispatchModules = (members, event, e) =>
  modulesFromMatcher(liveModulesForDispatch(members, event), event, e);
//@ chunk-vr8smdd9.js:2983-3019 placement
/**
 * 插件目录相关的可重置全局槽。
 */
var pluginDirsOverride; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr8smdd9.js:2983", () => {
  pluginDirsOverride = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-vr8smdd9.js:3019-3055 placement
/**
 * 插件目录槽
 */
var pluginDirSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr8smdd9.js:3019", () => {
  pluginDirSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-vr8smdd9.js:3055-3091 placement
/**
 * 目录监视槽
 */
var pluginDirWatchSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr8smdd9.js:3055", () => {
  pluginDirWatchSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-vr8smdd9.js:3091-3151 placement
/**
 * 是否监视插件目录
 */
function isPluginDirWatchOn() {
  return env.CLAUDE_CODE_PLUGIN_DIR_WATCH ?? !getIsNonInteractiveSession();
}
//@ chunk-vr8smdd9.js:3183-3339 placement
/**
 * 过滤插件目录：保留显式指定的，排除被禁用列表里的。
 */
function filterPluginDirs(dirs) {
  let pluginDirs = new Set((pluginDirSlot.get() ?? []).map((dir) => resolve(dir)));
  let watchDirs = new Set((pluginDirWatchSlot.get() ?? []).map((dir) => resolve(dir)));
  return dirs.filter((dir) => pluginDirs.has(resolve(dir)) || !watchDirs.has(resolve(dir)));
}
//@ chunk-vr8smdd9.js:3371-3531 placement
/**
 * 需要监视的 --plugin-dir 目录（受 CLAUDE_CODE_PLUGIN_DIR_WATCH 与开发模式控制）。
 */
function watchedPluginDirs(dirs) {
  if (isPluginDirWatchOn()) return filterPluginDirs(dirs);
  let pluginDirs = new Set((pluginDirSlot.get() ?? []).map((dir) => resolve(dir)));
  return env.CLAUDE_CODE_PLUGIN_DIR_WATCH === false ? [] : dirs.filter((dir) => pluginDirs.has(resolve(dir)));
}
//@ chunk-vr8smdd9.js:3531-3561 placement
/**
 * 内联插件列表
 */
var inlinePlugins = () => [...getInlinePlugins(), ...getInlinePluginsNoMcp()];
//@ chunk-vr8smdd9.js:3561-3593 placement
/**
 * 是否有 UI 日志接收方。
 */
var hasUiLogSink = () => watchedPluginDirs(inlinePlugins()).length > 0;
//@ chunk-vr8smdd9.js:3593-3605 placement
/**
 * $.ui.log 写日志时的文本截断上限 10000 字符，超出部分用省略号代替。
 */
var MAX_UI_LOG_CHARS = 1e4;
//@ chunk-vr8smdd9.js:3605-3665 placement
/**
 * 截断过长的 $.ui.log 文本。
 */
function truncateUiLog(text) {
  return text.length <= MAX_UI_LOG_CHARS ? text : `${truncateToLength(text, MAX_UI_LOG_CHARS)}\u2026`;
}
//@ chunk-vr8smdd9.js:3665-3676 placement
/**
 * 100
 */
var MAX_UI_LOG_ENTRIES = 100;
//@ chunk-vr8smdd9.js:3676-3887 placement
/**
 * 插件 $.ui.log：写调试日志并送到 UI（无接收方时暂存）。
 */
function uiLog(name, text, repeat = "again") {
  let truncated = truncateUiLog(text);
  let pluginRegistry = getPluginRegistry();
  logForDebugging(`[${name}] $.ui.log: ${truncated}`);
  if (pluginRegistry.uiLogSink) {
    pluginRegistry.uiLogSink(
      {
        plugin: name,
        text: truncated,
      },
      repeat,
    );
    return;
  }
  if (pluginRegistry.pendingUiLog.length < MAX_UI_LOG_ENTRIES)
    pluginRegistry.pendingUiLog = [
      ...pluginRegistry.pendingUiLog,
      {
        plugin: name,
        text: truncated,
      },
    ];
}
//@ chunk-vr8smdd9.js:3887-3980 placement
/**
 * 报告插件问题：有 UI 时显示，否则记错误日志。
 */
function reportPluginProblem(plugin, problem, repeat = "again") {
  if (hasUiLogSink()) {
    uiLog(plugin, truncateToLength(problem, MAX_KEPT_TEXT_CHARS), repeat);
    return;
  }
  logForDebugging(`${plugin}: ${problem}`, {
    level: "error",
  });
}
//@ chunk-vr8smdd9.js:3980-4065 placement
/**
 * 找因某原因死的模块
 */
var deadModulesFor = (modules, reason) =>
  modules.filter((n7Module) => {
    let status = n7Module.status();
    return status.kind === "dead" && status.reason === reason;
  });
//@ chunk-vr8smdd9.js:4065-4117 placement
/**
 * 来源是否为改写过的。
 */
var isRewrittenOrigin = (frame) => typeof frame !== "string" && "rewritten" in frame;
//@ chunk-vr8smdd9.js:4117-4241 placement
/**
 * 把调用来源（插件名、{plugin, registration} 或改写来源）编码为稳定字符串键。
 */
function originKey(frame) {
  let isRewritten = isRewrittenOrigin(frame);
  let inner = isRewritten ? frame.of : frame;
  let parts = typeof inner === "string" ? [inner] : [inner.plugin, inner.registration];
  return JSON.stringify([isRewritten, ...parts]);
}
//@ chunk-vr8smdd9.js:4241-4325 placement = _temp0 (1)
/**
 * 来源标签
 */
function sourceLabel(source, labelOf, fallback) {
  let isString = typeof source === "string";
  let isFrame = !isString && "plugin" in source;
  return isString ? source : isFrame ? labelOf(source) : fallback;
}
//@ chunk-vr8smdd9.js:4325-4402 placement
/**
 * 来源展示名
 */
var originLabel = (source) =>
  sourceLabel(
    source,
    (secondFrame) => `${secondFrame.plugin}#${secondFrame.registration}`,
    "/rewritten beneath",
  );
//@ chunk-vr8smdd9.js:4402-4442 placement
/**
 * 取来源的插件名。
 */
var originPlugin = (source) => sourceLabel(source, (thirdFrame) => thirdFrame.plugin, undefined);
//@ chunk-vr8smdd9.js:4442-4627 placement
/**
 * 从来源链中取某插件出现的注册序号；出现插件名本身时返回 "every"。
 */
function registrationsOfPlugin(chain, plugin) {
  let keys = new Set();
  for (let frame of chain ?? []) {
    if (originPlugin(frame) !== plugin) continue;
    if (typeof frame === "string") return "every";
    if ("registration" in frame) keys.add(frame.registration);
  }
  return [...keys].sort((secondA, b) => secondA - b);
}
//@ chunk-vr8smdd9.js:4627-4726 placement
/**
 * 分出调用者与上层
 */
function splitCallerChain(chain, plugin) {
  let frames = chain ?? [];
  let lastIndex = frames.length - 1;
  return {
    caller: registrationsOfPlugin(frames.slice(lastIndex), plugin),
    above: registrationsOfPlugin(frames.slice(0, lastIndex), plugin),
  };
}
//@ chunk-vr8smdd9.js:4726-4949 placement
/**
 * 比较两个调用来源是否相同（字符串、插件+注册序号或改写来源）。
 */
function sameOrigin(thirdA, b) {
  if (typeof thirdA === "string" || typeof b === "string") return thirdA === b;
  let areFrames = "plugin" in thirdA && "plugin" in b;
  let bothRewritten = "rewritten" in thirdA && "rewritten" in b;
  return areFrames
    ? thirdA.plugin === b.plugin && thirdA.registration === b.registration
    : bothRewritten && sameOrigin(thirdA.of, b.of);
}
//@ chunk-vr8smdd9.js:4949-4977 placement
/**
 * 按调用链缓存借出模块的弱映射。
 */
var lentModulesByChain; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vr8smdd9.js:4949", () => {
  lentModulesByChain = memoizeAlias(() => new WeakMap());
});
//@ chunk-vr8smdd9.js:4977-5019 placement
/**
 * 来源链文本
 */
var originChainText = (chain) => (chain ?? []).map(originKey).join(" > ");
//@ chunk-vr8smdd9.js:5019-5061 placement
/**
 * 带标签的来源链
 */
var labeledOriginChain = (chain) => (chain ?? []).map(originLabel).join(" > ");
//@ chunk-vr8smdd9.js:5061-5109 placement
/**
 * 标记“被下层改写”
 */
var rewrittenMarker = (of) =>
  Object.freeze({
    rewritten: true,
    of,
  });
//@ chunk-vr8smdd9.js:5109-5152 placement
/**
 * 生成 $.name.method 标签。
 */
var apiMethodLabel = ({ name: interfaceName, method }) => `$.${interfaceName}.${method}`;
//@ chunk-vr8smdd9.js:5152-5197 placement
/**
 * 集合拼成字符串
 */
var joinedKeys = (patterns) => Array.from(patterns).join(",") || "none";
//@ chunk-vr8smdd9.js:5197-5277 placement
/**
 * worker 被替换
 */
var WORKER_REPLACED_TEXT = "the hooks worker was replaced; the plugin stays loaded for its .catch";
//@ chunk-vr8smdd9.js:5277-5321 placement
/**
 * 拼接标签
 */
var joinLabels = (members) => members.map((member) => member.label).join(", ");
//@ chunk-vr8smdd9.js:5321-5411 placement
/**
 * 插件存储键（storageId 或 storageId+name）。
 */
function pluginStorageKey({ pluginName, pluginStorageId }) {
  return pluginStorageId.startsWith(`${pluginName}@`) ? pluginStorageId : `${pluginStorageId}+${pluginName}`;
}
//@ chunk-vr8smdd9.js:5411-5463 placement
/**
 * next() 结果不可克隆
 */
var NEXT_NOT_CLONEABLE = (error) => `next() result not cloneable: ${errorMessage(error)}`;
export {
  pluginDirSlot,
  filterPluginDirs,
  uiLog,
  reportPluginProblem,
  pluginDirsOverride,
  originPlugin,
  pluginStorageKey,
  moduleMatcherAdmits,
  joinedKeys,
  joinLabels,
  truncateUiLog,
  hasUiLogSink,
  originKey,
  sameOrigin,
  lentModulesByChain,
  originLabel,
  apiMethodLabel,
  isRewrittenOrigin,
  rewrittenMarker,
  labeledOriginChain,
  MAX_UI_LOG_CHARS,
  NEXT_NOT_CLONEABLE,
  WORKER_REPLACED_TEXT,
  watchedPluginDirs,
  pluginDirWatchSlot,
  isPluginDirWatchOn,
  inlinePlugins,
  originChainText,
  splitCallerChain,
  registrationsOfPlugin,
  moduleCatchesEvent,
  deadModulesFor,
  liveModulesForDispatch,
  dispatchModules,
  warnMatcherMiss,
  modulesFromMatcher,
};
