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
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-vr8smdd9.js:1711-1745 placement
/**
 * 匹配警告去重表
 */
var matcherWarned = identity(new Map(), (e) => e.clear());
//@ chunk-vr8smdd9.js:1745-1779 placement
/**
 * 已警告集合
 */
var warnedSets = identity(new Set(), (e) => e.clear());
//@ chunk-vr8smdd9.js:1779-2021 placement
/**
 * matcher 未命中时，检查是否因路径不存在等原因，按模块/事件/路径去重打印一次警告。
 */
function warnMatcherMiss(e, r, n) {
  let s = `${e.name}#${e.environmentId} ${r}`;
  let a = matcherWarned.get(s) ?? 0;
  if (a >= MAX_SERIALIZED_MATCHER_CHARS) return;
  matcherWarned.set(s, a + 1);
  let impossibleObjectMatcher = findImpossibleObjectMatcher(e.matcherFor(r), n);
  if (impossibleObjectMatcher === undefined) return;
  let m = `${s} ${impossibleObjectMatcher.path}`;
  if (warnedSets.has(m)) return;
  warnedSets.add(m);
  matcherLog().log(impossibleMatcherMessage(e.name, r, impossibleObjectMatcher), "warn");
}
//@ chunk-vr8smdd9.js:2021-2176 placement
/**
 * 判断模块对某事件的 matcher 是否接受载荷（worker 模块用 rpr、原生模块用 gxt），不接受时可能告警。
 */
function moduleMatcherAdmits(e, r, n) {
  let s = e.matcherFor(r);
  let a = e.hopKey.kind === "worker";
  if (s === undefined) return true;
  let names = lookupPathTable(r);
  let m = a ? matchesLiteralMatcher(s, n, names) : matchesRegExpMatcher(s, n, names);
  if (!m) warnMatcherMiss(e, r, n);
  return m;
}
//@ chunk-vr8smdd9.js:2176-2258 placement
/**
 * 从首个匹配处取模块
 */
function modulesFromMatcher(e, r, n) {
  let index = e.findIndex((f) => moduleMatcherAdmits(f, r, n));
  return index === -1 ? [] : e.slice(index);
}
//@ chunk-vr8smdd9.js:2258-2435 placement
/**
 * 按事件的固定键判断模块是否有能处理该载荷的 catch。
 */
function moduleCatchesEvent(e, event, n) {
  let s = isPlainDataObject(n)
    ? Object.fromEntries(
        (envSiteRuleFor(event).pinnedKeys ?? []).filter((a) => Object.hasOwn(n, a)).map((a) => [a, n[a]]),
      )
    : {};
  return e.catches(event, undefined, (a) => matchesFields(a, s, lookupPathTable(event)));
}
//@ chunk-vr8smdd9.js:2435-2952 placement
/**
 * 过滤出状态为 live 且策略文本一致的模块。
 */
function liveModulesForDispatch(e, event) {
  let n = [];
  for (let s of e) {
    if (!isModuleAdmitted(s)) {
      logForDebugging(
        `hooks module ${s.label}: judged under a policy text other than the one in force (during ${event}); passing on`,
      );
      continue;
    }
    let a = s.status();
    if (a.kind !== "live") {
      let f = a.kind === "retiring" || (a.kind === "unloaded" && a.retired);
      let m = a.kind === "unloaded";
      logForDebugging(
        `hooks module ${f ? `${s.label}: its environment was retired by a reload during ${event}` : m ? `${s.label}: its environment was unloaded (during ${event})` : `${s.label}: ${a.reason} (during ${event})`}; passing on`,
      );
      continue;
    }
    n.push(s);
  }
  return n;
}
//@ chunk-vr8smdd9.js:2952-2983 placement
/**
 * 参与分发的模块
 */
var dispatchModules = (members, event, n) =>
  modulesFromMatcher(liveModulesForDispatch(members, event), event, n);
//@ chunk-vr8smdd9.js:2983-3019 placement
/**
 * 插件目录相关的可重置全局槽。
 */
var pluginDirsOverride = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-vr8smdd9.js:3019-3055 placement
/**
 * 插件目录槽
 */
var pluginDirSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-vr8smdd9.js:3055-3091 placement
/**
 * 目录监视槽
 */
var pluginDirWatchSlot = identity(createValueSlot(), (e) => e.set(undefined));
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
function filterPluginDirs(e) {
  let r = new Set((pluginDirSlot.get() ?? []).map((s) => resolve(s)));
  let n = new Set((pluginDirWatchSlot.get() ?? []).map((s) => resolve(s)));
  return e.filter((s) => r.has(resolve(s)) || !n.has(resolve(s)));
}
//@ chunk-vr8smdd9.js:3371-3531 placement
/**
 * 需要监视的 --plugin-dir 目录（受 CLAUDE_CODE_PLUGIN_DIR_WATCH 与开发模式控制）。
 */
function watchedPluginDirs(e) {
  if (isPluginDirWatchOn()) return filterPluginDirs(e);
  let r = new Set((pluginDirSlot.get() ?? []).map((s) => resolve(s)));
  return env.CLAUDE_CODE_PLUGIN_DIR_WATCH === false ? [] : e.filter((s) => r.has(resolve(s)));
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
function truncateUiLog(e) {
  return e.length <= MAX_UI_LOG_CHARS ? e : `${truncateToLength(e, MAX_UI_LOG_CHARS)}\u2026`;
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
function uiLog(e, r, n = "again") {
  let s = truncateUiLog(r);
  let pluginRegistry = getPluginRegistry();
  logForDebugging(`[${e}] $.ui.log: ${s}`);
  if (pluginRegistry.uiLogSink) {
    pluginRegistry.uiLogSink(
      {
        plugin: e,
        text: s,
      },
      n,
    );
    return;
  }
  if (pluginRegistry.pendingUiLog.length < MAX_UI_LOG_ENTRIES)
    pluginRegistry.pendingUiLog = [
      ...pluginRegistry.pendingUiLog,
      {
        plugin: e,
        text: s,
      },
    ];
}
//@ chunk-vr8smdd9.js:3887-3980 placement
/**
 * 报告插件问题：有 UI 时显示，否则记错误日志。
 */
function reportPluginProblem(e, r, n = "again") {
  if (hasUiLogSink()) {
    uiLog(e, truncateToLength(r, MAX_KEPT_TEXT_CHARS), n);
    return;
  }
  logForDebugging(`${e}: ${r}`, {
    level: "error",
  });
}
//@ chunk-vr8smdd9.js:3980-4065 placement
/**
 * 找因某原因死的模块
 */
var deadModulesFor = (e, r) =>
  e.filter((n) => {
    let s = n.status();
    return s.kind === "dead" && s.reason === r;
  });
//@ chunk-vr8smdd9.js:4065-4117 placement
/**
 * 来源是否为改写过的。
 */
var isRewrittenOrigin = (e) => typeof e !== "string" && "rewritten" in e;
//@ chunk-vr8smdd9.js:4117-4241 placement
/**
 * 把调用来源（插件名、{plugin, registration} 或改写来源）编码为稳定字符串键。
 */
function originKey(frame) {
  let r = isRewrittenOrigin(frame);
  let n = r ? frame.of : frame;
  let a = typeof n === "string" ? [n] : [n.plugin, n.registration];
  return JSON.stringify([r, ...a]);
}
//@ chunk-vr8smdd9.js:4241-4325 placement = _temp0 (1)
/**
 * 来源标签
 */
function sourceLabel(e, r, n) {
  let s = typeof e === "string";
  let a = !s && "plugin" in e;
  return s ? e : a ? r(e) : n;
}
//@ chunk-vr8smdd9.js:4325-4402 placement
/**
 * 来源展示名
 */
var originLabel = (frame) => sourceLabel(frame, (r) => `${r.plugin}#${r.registration}`, "/rewritten beneath");
//@ chunk-vr8smdd9.js:4402-4442 placement
/**
 * 取来源的插件名。
 */
var originPlugin = (e) => sourceLabel(e, (r) => r.plugin, undefined);
//@ chunk-vr8smdd9.js:4442-4627 placement
/**
 * 从来源链中取某插件出现的注册序号；出现插件名本身时返回 "every"。
 */
function registrationsOfPlugin(e, r) {
  let n = new Set();
  for (let s of e ?? []) {
    if (originPlugin(s) !== r) continue;
    if (typeof s === "string") return "every";
    if ("registration" in s) n.add(s.registration);
  }
  return [...n].sort((s, a) => s - a);
}
//@ chunk-vr8smdd9.js:4627-4726 placement
/**
 * 分出调用者与上层
 */
function splitCallerChain(e, name) {
  let n = e ?? [];
  let s = n.length - 1;
  return {
    caller: registrationsOfPlugin(n.slice(s), name),
    above: registrationsOfPlugin(n.slice(0, s), name),
  };
}
//@ chunk-vr8smdd9.js:4726-4949 placement
/**
 * 比较两个调用来源是否相同（字符串、插件+注册序号或改写来源）。
 */
function sameOrigin(e, r) {
  if (typeof e === "string" || typeof r === "string") return e === r;
  let s = "plugin" in e && "plugin" in r;
  let a = "rewritten" in e && "rewritten" in r;
  return s ? e.plugin === r.plugin && e.registration === r.registration : a && sameOrigin(e.of, r.of);
}
//@ chunk-vr8smdd9.js:4949-4977 placement
/**
 * 按调用链缓存借出模块的弱映射。
 */
var lentModulesByChain = io(() => new WeakMap());
//@ chunk-vr8smdd9.js:4977-5019 placement
/**
 * 来源链文本
 */
var originChainText = (e) => (e ?? []).map(originKey).join(" > ");
//@ chunk-vr8smdd9.js:5019-5061 placement
/**
 * 带标签的来源链
 */
var labeledOriginChain = (e) => (e ?? []).map(originLabel).join(" > ");
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
var apiMethodLabel = ({ name: e, method }) => `$.${e}.${method}`;
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
var joinLabels = (e) => e.map((r) => r.label).join(", ");
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
