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
import { ENGINE, EMPTY_TRACE, reportChainFailure } from "./dispatch/chain.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { hookMembersFor } from "./hookDispatch.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasLink } from "../../utils/hasLink.js";
import { hasUiLogSink, reportPluginProblem, uiLog } from "./hooksWorkerClient.js";
import { reportInlinePluginNotice } from "./hooksModuleLoader.js";
import { UI_INVALIDATORS } from "./sameThreadHost.js";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4050417-4050464 placement
/**
 * plugin.register 事件定义
 */
var PLUGIN_REGISTER_EVENT; // deferred: uses makeCoreEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4050417", () => {
  PLUGIN_REGISTER_EVENT = makeCoreEvent("plugin.register", () => ({
    allow: true,
  }));
});
//@ chunk-e6aww6q8.js:4050464-4050594 placement
/**
 * plugin.register 拒绝说明："refused by <插件>: 原因" 或 "refused at plugin.register: 原因"。
 */
function describeRegisterRefusal({ by, reason }) {
  let shortReason = truncateToLength(reason, MAX_KEPT_TEXT_CHARS);
  if (by === undefined) return `refused at plugin.register: ${shortReason}`;
  return `refused by ${by}: ${shortReason}`;
}
//@ chunk-e6aww6q8.js:4050594-4050725 placement
/**
 * 在钩子链轨迹里找最后一个以指定字段值作答的插件步骤。
 */
var findAnsweringStep = (steps, field, value) =>
  steps.findLast(
    (step) =>
      step.plugin !== ENGINE &&
      (step.outcome === "returned" || step.outcome === "caught") &&
      isPlainObject_5(step.returned) &&
      step.returned[field] === value,
  );
//@ chunk-e6aww6q8.js:4050725-4050766 placement
/**
 * 拒绝的插件
 */
var refusingPlugin = (steps, refuse) => findAnsweringStep(steps, "refuse", refuse)?.plugin;
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
function shownPluginInfo(args, plugin) {
  let version = plugin?.manifest.version;
  return {
    name: args.pluginName,
    tier: args.tier,
    root: args.pluginRoot,
    ...(version !== undefined && {
      version,
    }),
    provenance: args.pluginStorageId,
    uses: usesOfScan(args.scan),
  };
}
//@ chunk-e6aww6q8.js:4051064-4051518 placement
/**
 * 运行 plugin.register 钩子链评判一个插件是否接纳；被拒绝时返回拒绝者与原因并记录日志。
 */
async function judgePluginRegister({ args, plugin, judges }) {
  let info = shownPluginInfo(args, plugin);
  let trace = EMPTY_TRACE;
  let mapped = hookMembersFor("plugin.register", undefined, {
    among: judges,
    e: info,
  }).map((member) => ({
    ...member,
    hop: undefined,
  }));
  let outcome = await reportChainFailure({
    e: info,
    handlers: [...mapped, PLUGIN_REGISTER_EVENT.core],
    site: PLUGIN_REGISTER_EVENT.site,
    trace: (nextTrace) => {
      trace = nextTrace;
    },
  });
  let logPrefix = `plugin.register: ${info.name} (${info.tier}, ${info.provenance}), judged by ${mapped.map((member) => member.name).join(", ") || "core alone"}: `;
  if (outcome.refuse === undefined) {
    logForDebugging(`${logPrefix}admitted`);
    return;
  }
  let refusal = {
    by: refusingPlugin(trace, outcome.refuse),
    reason: outcome.refuse,
  };
  logForDebugging(`${logPrefix}${describeRegisterRefusal(refusal)}`);
  return refusal;
}
//@ chunk-e6aww6q8.js:4051518-4051698 placement
/**
 * 选出评判某插件的已接纳插件：用户层插件由之前的全部插件评判，否则只由非用户层（及原生）插件评判。
 */
function registerJudges({ before, after, isNative, tier }) {
  let isUserTier = tier === "user";
  let usableBefore = isUserTier ? before : before.filter((judge) => judge.tier !== "user");
  let filtered = after.filter((judge) => (isUserTier ? judge.tier !== "user" : hasLink(judge)));
  return isNative ? usableBefore.filter(hasLink) : [...usableBefore, ...filtered];
}
//@ chunk-e6aww6q8.js:4051698-4051813 placement
var admissionOrder = (built) => [
  ...built.filter(hasLink),
  ...built.filter((mod) => !hasLink(mod) && mod.tier !== "user"),
  ...built.filter((mod) => !hasLink(mod) && mod.tier === "user"),
];
//@ chunk-e6aww6q8.js:4051813-4051861 placement
/**
 * 上报注册拒绝
 */
function reportRegisterRefusal(name, refusal) {
  if (!hasUiLogSink()) return;
  reportPluginProblem(name, describeRegisterRefusal(refusal));
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
function logRegisterRefusal(name, refusal, plugin) {
  let message = describeRegisterRefusal(refusal) + PREVIOUS_VERSION_UNLOADED;
  uiLog(name, truncateToLength(message, MAX_KEPT_TEXT_CHARS));
  if (plugin !== undefined) reportInlinePluginNotice(plugin, message);
}
//@ chunk-e6aww6q8.js:4051983-4052767 placement
/**
 * 依次让已构建的模块经过 plugin.register 评判：接纳的移出未接纳集合，拒绝的报告并丢弃；返回接纳与拒绝列表。
 */
async function admitBuiltModules(context, { built, plugins, seated = new Set(), serving = new Set() }) {
  let admittedSet = new Set();
  let refused = [];
  context.state.building = built.filter((mod) => context.state.unadmitted.has(mod.environmentId));
  context.state.admitting = [];
  try {
    for (let mod of admissionOrder(built)) {
      let index = built.indexOf(mod);
      let refusal = seated.has(mod.name)
        ? undefined
        : await judgePluginRegister({
            args: mod.args,
            plugin: plugins.get(mod.name),
            judges: registerJudges({
              before: built.slice(0, index).filter((earlier) => admittedSet.has(earlier)),
              after: built.slice(index + 1).filter((later) => admittedSet.has(later)),
              isNative: hasLink(mod),
              tier: mod.tier,
            }),
          });
      if (refusal === undefined) {
        context.state.unadmitted.delete(mod.environmentId);
        mod.shown ??= shownPluginInfo(mod.args, plugins.get(mod.name));
        admittedSet.add(mod);
        context.state.admitting = built.filter((entry) => admittedSet.has(entry));
        continue;
      }
      if (serving.has(mod.name)) logRegisterRefusal(mod.name, refusal, plugins.get(mod.name));
      else reportRegisterRefusal(mod.name, refusal);
      if (context.state.unadmitted.has(mod.environmentId)) mod.discard();
      refused.push(mod);
    }
  } finally {
    context.state.building = undefined;
  }
  return {
    admitted: built.filter((entry) => admittedSet.has(entry)),
    refused,
  };
}
//@ chunk-e6aww6q8.js:4052767-4052818 placement
/**
 * 准入期间执行
 */
function runWhileAdmitting(context, admitting, fn) {
  context.state.admitting = admitting;
  return fn();
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
