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
import { resolve, resolve as resolve_2 } from "path";
import { ge } from "../../utils/identity.js";
import {
  kos,
  findImpossibleObjectMatcher,
  pd,
  impossibleMatcherMessage,
  rpr,
  gxt,
  isPlainDataObject,
  opr,
} from "../../utils/hooks/functionHookMatchers.js";
import { lookupPathTable } from "../../utils/pathTable.js";
import { Nae, cR } from "./sites/siteRules.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { logForDebugging } from "../../utils/debug.js";
import { to } from "../../utils/valueSlot.js";
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
var De = ge(new Map(), (e) => e.clear());
//@ chunk-vr8smdd9.js:1745-1779 placement
var Le = ge(new Set(), (e) => e.clear());
/**
 * matcher 未命中时，检查是否因路径不存在等原因，按模块/事件/路径去重打印一次警告。
 */
//@ chunk-vr8smdd9.js:1779-2021 placement
function warnMatcherMiss(e, r, n) {
  let s = `${e.name}#${e.environmentId} ${r}`,
    a = De.get(s) ?? 0;
  if (a >= kos) return;
  De.set(s, a + 1);
  let f = findImpossibleObjectMatcher(e.matcherFor(r), n);
  if (f === void 0) return;
  let m = `${s} ${f.path}`;
  if (Le.has(m)) return;
  (Le.add(m), pd().log(impossibleMatcherMessage(e.name, r, f), "warn"));
}
/**
 * 判断模块对某事件的 matcher 是否接受载荷（worker 模块用 rpr、原生模块用 gxt），不接受时可能告警。
 */
//@ chunk-vr8smdd9.js:2021-2176 placement
function moduleMatcherAdmits(e, r, n) {
  let matcherFor = e.matcherFor(r),
    a = e.hopKey.kind === "worker";
  if (matcherFor === void 0) return !0;
  let f = lookupPathTable(r),
    m = a ? rpr(matcherFor, n, f) : gxt(matcherFor, n, f);
  if (!m) warnMatcherMiss(e, r, n);
  return m;
}
//@ chunk-vr8smdd9.js:2176-2258 placement
function he(e, r, n) {
  let index = e.findIndex((f) => moduleMatcherAdmits(f, r, n));
  return index === -1 ? [] : e.slice(index);
}
/**
 * 按事件的固定键判断模块是否有能处理该载荷的 catch。
 */
//@ chunk-vr8smdd9.js:2258-2435 placement
function moduleCatchesEvent(e, r, n) {
  let s = isPlainDataObject(n)
    ? Object.fromEntries((Nae(r).pinnedKeys ?? []).filter((a) => Object.hasOwn(n, a)).map((a) => [a, n[a]]))
    : {};
  return e.catches(r, void 0, (a) => opr(a, s, lookupPathTable(r)));
}
/**
 * 过滤出状态为 live 且策略文本一致的模块。
 */
//@ chunk-vr8smdd9.js:2435-2952 placement
function liveModulesForDispatch(e, r) {
  let n = [];
  for (let s of e) {
    if (!isModuleAdmitted(s)) {
      logForDebugging(
        `hooks module ${s.label}: judged under a policy text other than the one in force (during ${r}); passing on`,
      );
      continue;
    }
    let status = s.status();
    if (status.kind !== "live") {
      let f = status.kind === "retiring" || (status.kind === "unloaded" && status.retired),
        m = status.kind === "unloaded";
      logForDebugging(
        `hooks module ${f ? `${s.label}: its environment was retired by a reload during ${r}` : m ? `${s.label}: its environment was unloaded (during ${r})` : `${s.label}: ${status.reason} (during ${r})`}; passing on`,
      );
      continue;
    }
    n.push(s);
  }
  return n;
}
//@ chunk-vr8smdd9.js:2952-2983 placement
var ye = (e, r, n) => he(liveModulesForDispatch(e, r), r, n);
/**
 * 插件目录相关的可重置全局槽。
 */
//@ chunk-vr8smdd9.js:2983-3019 placement
var pluginDirsOverride = ge(to(), (e) => e.set(void 0));
//@ chunk-vr8smdd9.js:3019-3055 placement
var ipe = ge(to(), (e) => e.set(void 0));
//@ chunk-vr8smdd9.js:3055-3091 placement
var QKt = ge(to(), (e) => e.set(void 0));
//@ chunk-vr8smdd9.js:3091-3151 placement
function K4o() {
  return env.CLAUDE_CODE_PLUGIN_DIR_WATCH ?? !getIsNonInteractiveSession();
}
/**
 * 过滤插件目录：保留显式指定的，排除被禁用列表里的。
 */
//@ chunk-vr8smdd9.js:3183-3339 placement
function filterPluginDirs(e) {
  let r = new Set((ipe.get() ?? []).map((s) => resolve(s))),
    n = new Set((QKt.get() ?? []).map((s) => resolve(s)));
  return e.filter((s) => r.has(resolve(s)) || !n.has(resolve(s)));
}
/**
 * 需要监视的 --plugin-dir 目录（受 CLAUDE_CODE_PLUGIN_DIR_WATCH 与开发模式控制）。
 */
//@ chunk-vr8smdd9.js:3371-3531 placement
function watchedPluginDirs(e) {
  if (K4o()) return filterPluginDirs(e);
  let r = new Set((ipe.get() ?? []).map((s) => resolve_2(s)));
  return env.CLAUDE_CODE_PLUGIN_DIR_WATCH === !1 ? [] : e.filter((s) => r.has(resolve_2(s)));
}
//@ chunk-vr8smdd9.js:3531-3561 placement
var SYr = () => [...getInlinePlugins(), ...getInlinePluginsNoMcp()];
/**
 * 是否有 UI 日志接收方。
 */
//@ chunk-vr8smdd9.js:3561-3593 placement
var hasUiLogSink = () => watchedPluginDirs(SYr()).length > 0;
//@ chunk-vr8smdd9.js:3593-3605 placement
var Gtr = 1e4;
/**
 * 截断过长的 $.ui.log 文本。
 */
//@ chunk-vr8smdd9.js:3605-3665 placement
function truncateUiLog(e) {
  return e.length <= Gtr ? e : `${truncateToLength(e, Gtr)}\u2026`;
}
//@ chunk-vr8smdd9.js:3665-3676 placement
var We = 100;
/**
 * 插件 $.ui.log：写调试日志并送到 UI（无接收方时暂存）。
 */
//@ chunk-vr8smdd9.js:3676-3887 placement
function uiLog(e, r, n = "again") {
  let s = truncateUiLog(r),
    a = getPluginRegistry();
  if ((logForDebugging(`[${e}] $.ui.log: ${s}`), a.uiLogSink)) {
    a.uiLogSink({ plugin: e, text: s }, n);
    return;
  }
  if (a.pendingUiLog.length < We) a.pendingUiLog = [...a.pendingUiLog, { plugin: e, text: s }];
}
/**
 * 报告插件问题：有 UI 时显示，否则记错误日志。
 */
//@ chunk-vr8smdd9.js:3887-3980 placement
function reportPluginProblem(e, r, n = "again") {
  if (hasUiLogSink()) {
    uiLog(e, truncateToLength(r, cR), n);
    return;
  }
  logForDebugging(`${e}: ${r}`, { level: "error" });
}
//@ chunk-vr8smdd9.js:3980-4065 placement
var Re = (e, r) =>
  e.filter((n) => {
    let status = n.status();
    return status.kind === "dead" && status.reason === r;
  });
/**
 * 来源是否为改写过的。
 */
//@ chunk-vr8smdd9.js:4065-4117 placement
var isRewrittenOrigin = (e) => typeof e !== "string" && "rewritten" in e;
/**
 * 把调用来源（插件名、{plugin, registration} 或改写来源）编码为稳定字符串键。
 */
//@ chunk-vr8smdd9.js:4117-4241 placement
function originKey(e) {
  let r = isRewrittenOrigin(e),
    n = r ? e.of : e,
    a = typeof n === "string" ? [n] : [n.plugin, n.registration];
  return JSON.stringify([r, ...a]);
}
//@ chunk-vr8smdd9.js:4241-4325 placement = _temp0 (1)
function we(e, r, n) {
  let s = typeof e === "string",
    a = !s && "plugin" in e;
  return s ? e : a ? r(e) : n;
}
//@ chunk-vr8smdd9.js:4325-4402 placement
var Ktr = (e) => we(e, (r) => `${r.plugin}#${r.registration}`, "/rewritten beneath");
/**
 * 取来源的插件名。
 */
//@ chunk-vr8smdd9.js:4402-4442 placement
var originPlugin = (e) => we(e, (r) => r.plugin, void 0);
/**
 * 从来源链中取某插件出现的注册序号；出现插件名本身时返回 "every"。
 */
//@ chunk-vr8smdd9.js:4442-4627 placement
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
function Qo(e, r) {
  let n = e ?? [],
    s = n.length - 1;
  return { caller: registrationsOfPlugin(n.slice(s), r), above: registrationsOfPlugin(n.slice(0, s), r) };
}
/**
 * 比较两个调用来源是否相同（字符串、插件+注册序号或改写来源）。
 */
//@ chunk-vr8smdd9.js:4726-4949 placement
function sameOrigin(e, r) {
  if (typeof e === "string" || typeof r === "string") return e === r;
  let s = "plugin" in e && "plugin" in r,
    a = "rewritten" in e && "rewritten" in r;
  return s ? e.plugin === r.plugin && e.registration === r.registration : a && sameOrigin(e.of, r.of);
}
/**
 * 按调用链缓存借出模块的弱映射。
 */
//@ chunk-vr8smdd9.js:4949-4977 placement
var lentModulesByChain = io(() => new WeakMap());
//@ chunk-vr8smdd9.js:4977-5019 placement
var MFi = (e) => (e ?? []).map(originKey).join(" > ");
//@ chunk-vr8smdd9.js:5019-5061 placement
var EYr = (e) => (e ?? []).map(Ktr).join(" > ");
//@ chunk-vr8smdd9.js:5061-5109 placement
var DFi = (e) => Object.freeze({ rewritten: !0, of: e });
/**
 * 生成 $.name.method 标签。
 */
//@ chunk-vr8smdd9.js:5109-5152 placement
var apiMethodLabel = ({ name: e, method: method }) => `$.${e}.${method}`;
//@ chunk-vr8smdd9.js:5152-5197 placement
var q4o = (e) => Array.from(e).join(",") || "none";
//@ chunk-vr8smdd9.js:5197-5277 placement
var LFi = "the hooks worker was replaced; the plugin stays loaded for its .catch";
//@ chunk-vr8smdd9.js:5277-5321 placement
var dkt = (e) => e.map((r) => r.label).join(", ");
/**
 * 插件存储键（storageId 或 storageId+name）。
 */
//@ chunk-vr8smdd9.js:5321-5411 placement
function pluginStorageKey({ pluginName: pluginName, pluginStorageId: pluginStorageId }) {
  return pluginStorageId.startsWith(`${pluginName}@`) ? pluginStorageId : `${pluginStorageId}+${pluginName}`;
}
//@ chunk-vr8smdd9.js:5411-5463 placement
var Vni = (e) => `next() result not cloneable: ${errorMessage(e)}`;

export {
  ipe,
  filterPluginDirs,
  uiLog,
  reportPluginProblem,
  pluginDirsOverride,
  originPlugin,
  pluginStorageKey,
  moduleMatcherAdmits,
  q4o,
  dkt,
  truncateUiLog,
  hasUiLogSink,
  originKey,
  sameOrigin,
  lentModulesByChain,
  Ktr,
  apiMethodLabel,
  isRewrittenOrigin,
  DFi,
  EYr,
  Gtr,
  Vni,
  LFi,
  watchedPluginDirs,
  QKt,
  K4o,
  SYr,
  MFi,
  Qo,
  registrationsOfPlugin,
  moduleCatchesEvent,
  Re,
  liveModulesForDispatch,
  ye,
  warnMatcherMiss,
  he,
};
