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
import { gh } from "./coreHandlers.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { cR } from "./sites/siteRules.js";
import { ENGINE, freeze_5 as freeze_5_2, reportChainFailure } from "./dispatch/chain.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { hookMembersFor } from "./hookDispatch.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasLink } from "../../utils/hasLink.js";
import { hasUiLogSink, reportPluginProblem, uiLog } from "./hooksWorkerClient.js";
import { reportInlinePluginNotice } from "./hooksModuleLoader.js";
import { UI_INVALIDATORS } from "./sameThreadHost.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:4050417-4050464 placement
var ylt = gh("plugin.register", () => ({ allow: !0 }));
/**
 * plugin.register 拒绝说明："refused by <插件>: 原因" 或 "refused at plugin.register: 原因"。
 */
//@ chunk-e6aww6q8.js:4050464-4050594 placement
function describeRegisterRefusal({ by: by, reason: reason }) {
  let r = truncateToLength(reason, cR);
  if (by === void 0) return `refused at plugin.register: ${r}`;
  return `refused by ${by}: ${r}`;
}
/**
 * 在钩子链轨迹里找最后一个以指定字段值作答的插件步骤。
 */
//@ chunk-e6aww6q8.js:4050594-4050725 placement
var findAnsweringStep = (e, n, r) =>
  e.findLast(
    (s) =>
      s.plugin !== ENGINE &&
      (s.outcome === "returned" || s.outcome === "caught") &&
      isPlainObject_4(s.returned) &&
      s.returned[n] === r,
  );
//@ chunk-e6aww6q8.js:4050725-4050766 placement
var mBn = (e, n) => findAnsweringStep(e, "refuse", n)?.plugin;
//@ chunk-e6aww6q8.js:4050766-4050892 placement
function usesOfScan(e) {
  let { hooks: hooks, calls: calls, env: env, state: state } = e;
  return {
    events: hooks,
    calls: calls,
    ...(env !== void 0 && { env: env }),
    ...(state !== void 0 && { state: state }),
  };
}
/**
 * plugin.register 事件里展示给评判插件的信息：名字、层级、根目录、版本、来源与用到的事件/调用/环境变量/状态。
 */
//@ chunk-e6aww6q8.js:4050892-4051064 placement
function shownPluginInfo(e, n) {
  let r = n?.manifest.version;
  return {
    name: e.pluginName,
    tier: e.tier,
    root: e.pluginRoot,
    ...(r !== void 0 && { version: r }),
    provenance: e.pluginStorageId,
    uses: usesOfScan(e.scan),
  };
}
/**
 * 运行 plugin.register 钩子链评判一个插件是否接纳；被拒绝时返回拒绝者与原因并记录日志。
 */
//@ chunk-e6aww6q8.js:4051064-4051518 placement
async function judgePluginRegister({ args: args, plugin: plugin, judges: judges }) {
  let s = shownPluginInfo(args, plugin),
    h = freeze_5_2,
    mapped = hookMembersFor("plugin.register", void 0, { among: judges, e: s }).map((G) => ({
      ...G,
      hop: void 0,
    })),
    S = await reportChainFailure({
      e: s,
      handlers: [...mapped, ylt.core],
      site: ylt.site,
      trace: (G) => {
        h = G;
      },
    }),
    w = `plugin.register: ${s.name} (${s.tier}, ${s.provenance}), judged by ${mapped.map((G) => G.name).join(", ") || "core alone"}: `;
  if (S.refuse === void 0) {
    logForDebugging(`${w}admitted`);
    return;
  }
  let L = { by: mBn(h, S.refuse), reason: S.refuse };
  return (logForDebugging(`${w}${describeRegisterRefusal(L)}`), L);
}
/**
 * 选出评判某插件的已接纳插件：用户层插件由之前的全部插件评判，否则只由非用户层（及原生）插件评判。
 */
//@ chunk-e6aww6q8.js:4051518-4051698 placement
function registerJudges({ before: before, after: after, isNative: isNative, tier: tier }) {
  let h = tier === "user",
    y = h ? before : before.filter((w) => w.tier !== "user"),
    filtered = after.filter((w) => (h ? w.tier !== "user" : hasLink(w)));
  return isNative ? y.filter(hasLink) : [...y, ...filtered];
}
//@ chunk-e6aww6q8.js:4051698-4051813 placement
var admissionOrder = (e) => [
  ...e.filter(hasLink),
  ...e.filter((n) => !hasLink(n) && n.tier !== "user"),
  ...e.filter((n) => !hasLink(n) && n.tier === "user"),
];
//@ chunk-e6aww6q8.js:4051813-4051861 placement
function SBn(e, n) {
  if (!hasUiLogSink()) return;
  reportPluginProblem(e, describeRegisterRefusal(n));
}
//@ chunk-e6aww6q8.js:4051861-4051910 placement
var Rx = "; the version loaded before is unloaded";
//@ chunk-e6aww6q8.js:4051910-4051983 placement
function kBn(e, n, r) {
  let s = describeRegisterRefusal(n) + Rx;
  if ((uiLog(e, truncateToLength(s, cR)), r !== void 0)) reportInlinePluginNotice(r, s);
}
/**
 * 依次让已构建的模块经过 plugin.register 评判：接纳的移出未接纳集合，拒绝的报告并丢弃；返回接纳与拒绝列表。
 */
//@ chunk-e6aww6q8.js:4051983-4052767 placement
async function admitBuiltModules(
  e,
  { built: built, plugins: plugins, seated: seated = new Set(), serving: serving = new Set() },
) {
  let y = new Set(),
    S = [];
  ((e.state.building = built.filter((w) => e.state.unadmitted.has(w.environmentId))),
    (e.state.admitting = []));
  try {
    for (let w of admissionOrder(built)) {
      let index = built.indexOf(w),
        G = seated.has(w.name)
          ? void 0
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
      if (G === void 0) {
        (e.state.unadmitted.delete(w.environmentId),
          (w.shown ??= shownPluginInfo(w.args, plugins.get(w.name))),
          y.add(w),
          (e.state.admitting = built.filter((q) => y.has(q))));
        continue;
      }
      if (
        (serving.has(w.name) ? kBn(w.name, G, plugins.get(w.name)) : SBn(w.name, G),
        e.state.unadmitted.has(w.environmentId))
      )
        w.discard();
      S.push(w);
    }
  } finally {
    e.state.building = void 0;
  }
  return { admitted: built.filter((w) => y.has(w)), refused: S };
}
//@ chunk-e6aww6q8.js:4052767-4052818 placement
function bBn(e, n, r) {
  return ((e.state.admitting = n), r());
}
/**
 * 执行积压的 $.ui.invalidate 缓存失效（逐个捕获错误），然后清空。
 */
//@ chunk-e6aww6q8.js:4052818-4053009 placement
function applyPendingUiInvalidations(e) {
  for (let pendingInvalidation of e.state.pendingInvalidations)
    try {
      UI_INVALIDATORS[pendingInvalidation]();
    } catch (error) {
      logForDebugging(
        `$.ui.invalidate("${pendingInvalidation}"): the cache drop threw: ` + errorMessage(error),
        { level: "error" },
      );
    }
  e.state.pendingInvalidations.clear();
}

export {
  findAnsweringStep,
  Rx,
  shownPluginInfo,
  admitBuiltModules,
  bBn,
  judgePluginRegister,
  registerJudges,
  describeRegisterRefusal,
  applyPendingUiInvalidations,
};
