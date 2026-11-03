/**
 * plugins/functionHooks/pluginRegister.ts
 *
 * 2.1.316 新增：plugin.register 钩子：决定插件是否被接纳
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import { makeCoreEvent } from "./coreHandlers.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { MAX_KEPT_TEXT_CHARS } from "./sites/siteRules.js";
import { ENGINE, Hbi, reportChainFailure } from "./dispatch/chain.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { hookMembersFor } from "./hookDispatch.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasLink } from "../../utils/hasLink.js";
import { hasUiLogSink, reportPluginProblem, uiLog } from "./hooksWorkerClient.js";
import { reportInlinePluginNotice } from "./hooksModuleLoader.js";
import { UI_INVALIDATORS } from "./sameThreadHost.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:4050417-4050464 placement
/**
 * plugin.register 事件定义
 */
var PLUGIN_REGISTER_EVENT = makeCoreEvent("plugin.register", () => ({
  allow: true,
}));
//@ chunk-e6aww6q8.js:4050464-4050594 placement
/**
 * plugin.register 拒绝说明："refused by <插件>: 原因" 或 "refused at plugin.register: 原因"。
 */
function describeRegisterRefusal({ by, reason }) {
  let r = truncateToLength(reason, MAX_KEPT_TEXT_CHARS);
  if (by === undefined) return `refused at plugin.register: ${r}`;
  return `refused by ${by}: ${r}`;
}
//@ chunk-e6aww6q8.js:4050594-4050725 placement
/**
 * 在钩子链轨迹里找最后一个以指定字段值作答的插件步骤。
 */
var findAnsweringStep = (e, n, r) =>
  e.findLast(
    (s) =>
      s.plugin !== ENGINE &&
      (s.outcome === "returned" || s.outcome === "caught") &&
      isPlainObject_5(s.returned) &&
      s.returned[n] === r,
  );
//@ chunk-e6aww6q8.js:4050725-4050766 placement
/**
 * 拒绝的插件
 */
var refusingPlugin = (e, refuse) => findAnsweringStep(e, "refuse", refuse)?.plugin;
//@ chunk-e6aww6q8.js:4050766-4050892 placement
function usesOfScan(scan) {
  let { hooks, calls, env, state } = scan;
  return {
    events: hooks,
    calls,
    ...(env !== undefined && {
      env,
    }),
    ...(state !== undefined && {
      state,
    }),
  };
}
//@ chunk-e6aww6q8.js:4050892-4051064 placement
/**
 * plugin.register 事件里展示给评判插件的信息：名字、层级、根目录、版本、来源与用到的事件/调用/环境变量/状态。
 */
function shownPluginInfo(e, n) {
  let version = n?.manifest.version;
  return {
    name: e.pluginName,
    tier: e.tier,
    root: e.pluginRoot,
    ...(version !== undefined && {
      version,
    }),
    provenance: e.pluginStorageId,
    uses: usesOfScan(e.scan),
  };
}
//@ chunk-e6aww6q8.js:4051064-4051518 placement
/**
 * 运行 plugin.register 钩子链评判一个插件是否接纳；被拒绝时返回拒绝者与原因并记录日志。
 */
async function judgePluginRegister({ args, plugin, judges }) {
  let s = shownPluginInfo(args, plugin);
  let h = Hbi;
  let mapped = hookMembersFor("plugin.register", undefined, {
    among: judges,
    e: s,
  }).map((G) => ({
    ...G,
    hop: undefined,
  }));
  let S = await reportChainFailure({
    e: s,
    handlers: [...mapped, PLUGIN_REGISTER_EVENT.core],
    site: PLUGIN_REGISTER_EVENT.site,
    trace: (G) => {
      h = G;
    },
  });
  let w = `plugin.register: ${s.name} (${s.tier}, ${s.provenance}), judged by ${mapped.map((G) => G.name).join(", ") || "core alone"}: `;
  if (S.refuse === undefined) {
    logForDebugging(`${w}admitted`);
    return;
  }
  let L = {
    by: refusingPlugin(h, S.refuse),
    reason: S.refuse,
  };
  logForDebugging(`${w}${describeRegisterRefusal(L)}`);
  return L;
}
//@ chunk-e6aww6q8.js:4051518-4051698 placement
/**
 * 选出评判某插件的已接纳插件：用户层插件由之前的全部插件评判，否则只由非用户层（及原生）插件评判。
 */
function registerJudges({ before, after, isNative, tier }) {
  let h = tier === "user";
  let y = h ? before : before.filter((w) => w.tier !== "user");
  let filtered = after.filter((w) => (h ? w.tier !== "user" : hasLink(w)));
  return isNative ? y.filter(hasLink) : [...y, ...filtered];
}
//@ chunk-e6aww6q8.js:4051698-4051813 placement
var admissionOrder = (built) => [
  ...built.filter(hasLink),
  ...built.filter((n) => !hasLink(n) && n.tier !== "user"),
  ...built.filter((n) => !hasLink(n) && n.tier === "user"),
];
//@ chunk-e6aww6q8.js:4051813-4051861 placement
/**
 * 上报注册拒绝
 */
function reportRegisterRefusal(name, n) {
  if (!hasUiLogSink()) return;
  reportPluginProblem(name, describeRegisterRefusal(n));
}
//@ chunk-e6aww6q8.js:4051861-4051910 placement
/**
 * 之前版本已卸载
 */
var PREVIOUS_VERSION_UNLOADED = "; the version loaded before is unloaded";
//@ chunk-e6aww6q8.js:4051910-4051983 placement
/**
 * 记录拒绝文本
 */
function logRegisterRefusal(name, n, r) {
  let s = describeRegisterRefusal(n) + PREVIOUS_VERSION_UNLOADED;
  uiLog(name, truncateToLength(s, MAX_KEPT_TEXT_CHARS));
  if (r !== undefined) reportInlinePluginNotice(r, s);
}
//@ chunk-e6aww6q8.js:4051983-4052767 placement
/**
 * 依次让已构建的模块经过 plugin.register 评判：接纳的移出未接纳集合，拒绝的报告并丢弃；返回接纳与拒绝列表。
 */
async function admitBuiltModules(e, { built, plugins, seated = new Set(), serving = new Set() }) {
  let y = new Set();
  let S = [];
  e.state.building = built.filter((w) => e.state.unadmitted.has(w.environmentId));
  e.state.admitting = [];
  try {
    for (let w of admissionOrder(built)) {
      let index = built.indexOf(w);
      let G = seated.has(w.name)
        ? undefined
        : await judgePluginRegister({
            args: w.args,
            plugin: plugins.get(w.name),
            judges: registerJudges({
              before: built.slice(0, index).filter((q) => y.has(q)),
              after: built.slice(index + 1).filter((q) => y.has(q)),
              isNative: hasLink(w),
              tier: w.tier,
            }),
          });
      if (G === undefined) {
        e.state.unadmitted.delete(w.environmentId);
        w.shown ??= shownPluginInfo(w.args, plugins.get(w.name));
        y.add(w);
        e.state.admitting = built.filter((q) => y.has(q));
        continue;
      }
      if (serving.has(w.name)) logRegisterRefusal(w.name, G, plugins.get(w.name));
      else reportRegisterRefusal(w.name, G);
      if (e.state.unadmitted.has(w.environmentId)) w.discard();
      S.push(w);
    }
  } finally {
    e.state.building = undefined;
  }
  return {
    admitted: built.filter((w) => y.has(w)),
    refused: S,
  };
}
//@ chunk-e6aww6q8.js:4052767-4052818 placement
/**
 * 准入期间执行
 */
function runWhileAdmitting(e, admitting, r) {
  e.state.admitting = admitting;
  return r();
}
//@ chunk-e6aww6q8.js:4052818-4053009 placement
/**
 * 执行积压的 $.ui.invalidate 缓存失效（逐个捕获错误），然后清空。
 */
function applyPendingUiInvalidations(hooksHost) {
  for (let pendingInvalidation of hooksHost.state.pendingInvalidations)
    try {
      UI_INVALIDATORS[pendingInvalidation]();
    } catch (error) {
      logForDebugging(
        `$.ui.invalidate("${pendingInvalidation}"): the cache drop threw: ` + errorMessage(error),
        {
          level: "error",
        },
      );
    }
  hooksHost.state.pendingInvalidations.clear();
}
export {
  findAnsweringStep,
  PREVIOUS_VERSION_UNLOADED,
  shownPluginInfo,
  admitBuiltModules,
  runWhileAdmitting,
  judgePluginRegister,
  registerJudges,
  describeRegisterRefusal,
  applyPendingUiInvalidations,
};
