/**
 * plugins/functionHooks/envApi.ts
 *
 * 2.1.316 新增：插件 $.env.get/set 接口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { isEnvApiCall } from "./eventPatterns.js";
import { isHostOnlyEnvKey } from "../../utils/managedEnvSafety.js";
import { forgetEnvWriteRestorer, snapshotHostEnvVar } from "../../utils/plugins/securityDefaultPlugin.js";
import { proxyEnvFingerprint, rebuildGlobalAgentsAfterPluginWrite } from "../../utils/proxy.js";
import { exitIfServeHelperMisconfigured } from "../../cli/headlessCloud/attachServe.js";
import { admittedArgs } from "./apiDispatch.js";
import { originPlugin } from "./hooksWorkerClient.js";
import {
  isOfficialMarketplaceRef,
  managedMarketplaceAnswerFlag,
} from "../../utils/plugins/marketplaceNames.js";
import { isVouchedPolicyPluginId } from "../../utils/plugins/managedPlugins.js";
import { logForDebugging } from "../../utils/debug.js";
import { recordPersonsEnvValue, personsSettingsEnvKeeps } from "../../utils/managedEnvApply.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { HooksError } from "./hooksErrors.js";
import { alwaysFalse } from "./api/operations.js";
import { checkFlagValueArgs } from "./panes.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-5xgkngpb.js:3817259-3817336 placement
/**
 * 取 $.env 参数里的名字
 */
function envApiName(args) {
  let name = isPlainObject_6(args) ? args.name : undefined;
  return typeof name === "string" ? name : undefined;
}
//@ chunk-5xgkngpb.js:3817336-3817878 placement
function envGetForPlugin(scan, op, args) {
  if (!isEnvApiCall(op)) return;
  let name = envApiName(args);
  let isGet = op === "env.get";
  if (name === undefined) return `it carries no variable name a $.${op}("<name>") call passes`;
  let value = isPlainObject_6(args) ? args.value : undefined;
  if (!isGet && isHostOnlyEnvKey(name, typeof value === "string" ? value : undefined))
    return `only the environment Claude Code starts with, or Claude Code itself, sets ${name} (host rule)`;
  let problem = (isGet ? scan.env?.reads : scan.env?.writes) ?? [];
  return problem.includes(name)
    ? undefined
    : `its hooks module does not name ${name} in a $.${op}("<name>") call (host rule; the scan lists ${isGet ? "reads" : "writes"} of ${problem.length === 0 ? "nothing" : problem.join(", ")})`;
}
//@ chunk-5xgkngpb.js:3817878-3818004 placement
/**
 * $.env.get 核心：读取进程环境变量（USER_TYPE 固定为 external）。
 */
function envGetCore(args) {
  let value = args.name === "USER_TYPE" ? "external" : process.env[args.name];
  return Promise.resolve(value === undefined ? undefined : String(value));
}
//@ chunk-5xgkngpb.js:3818004-3818413 placement
/**
 * 校验 $.env.set 参数：变量名非空且不含 = 或 NUL，值为字符串或 undefined（不含 NUL）。
 */
function checkEnvSetArgs(args) {
  let name = envApiName(args);
  if (!(name !== undefined && name !== "" && !name.includes("=") && !name.includes("\x00")))
    return `takes a variable name on a plain object (got ${name === undefined ? typeof args?.name : JSON.stringify(name)})`;
  let problem = isPlainObject_6(args) ? args.value : undefined;
  if (problem !== undefined && typeof problem !== "string")
    return `takes a string value, or undefined to unset (got ${typeof problem})`;
  return problem !== undefined && problem.includes("\x00")
    ? "takes a value with no NUL byte in it"
    : undefined;
}
//@ chunk-5xgkngpb.js:3818413-3818597 placement
function applyEnvSet(request, wasSet, writer) {
  let restore = wasSet ? forgetEnvWriteRestorer(request.name) : snapshotHostEnvVar(request.name, writer);
  let envFingerprint = proxyEnvFingerprint();
  if (request.value === undefined) delete process.env[request.name];
  else process.env[request.name] = request.value;
  restore();
  exitIfServeHelperMisconfigured();
  rebuildGlobalAgentsAfterPluginWrite(envFingerprint);
  return Promise.resolve();
}
//@ chunk-5xgkngpb.js:3818597-3818769 placement
var envCallChainArgs = (ctx, caller) => [
  admittedArgs(ctx, caller),
  ...(caller.callers ?? []).map((callerId) => ctx.environmentArgs.get(callerId)),
  ...caller.origin
    .map(originPlugin)
    .filter((plugin) => plugin !== caller.plugin)
    .map((secondPlugin) => (secondPlugin === undefined ? undefined : ctx.knownArgs.get(secondPlugin))),
];
//@ chunk-5xgkngpb.js:3818769-3818848 placement
/**
 * 链里有非官方插件
 */
function hasUntrustedEnvCaller(ctx, caller) {
  return envCallChainArgs(ctx, caller).some(
    (args) => args === undefined || !isOfficialMarketplaceRef(args.pluginStorageId),
  );
}
//@ chunk-5xgkngpb.js:3818848-3818991 placement
function isEnvValueRewrittenByThirdParty(request, caller) {
  try {
    return (
      caller !== undefined &&
      caller.sent.value !== request.value &&
      caller
        .hooked()
        .some((hook) => hook === undefined || !isOfficialMarketplaceRef(hook.args.pluginStorageId))
    );
  } catch {
    return true;
  }
}
//@ chunk-5xgkngpb.js:3818991-3819116 placement
function isEnvChainTrusted(ctx, caller) {
  try {
    return envCallChainArgs(ctx, caller).every(
      (args) =>
        args !== undefined &&
        (isOfficialMarketplaceRef(args.pluginStorageId) || isVouchedPolicyPluginId(args.pluginStorageId)),
    );
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:3819116-3819269 placement
function soleEnvCallerId(ctx, caller) {
  try {
    let [first, ...rest] = envCallChainArgs(ctx, caller);
    return first !== undefined && rest.every((args) => args?.pluginStorageId === first.pluginStorageId)
      ? first.pluginStorageId
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:3819269-3819527 placement
var ENV_UNTRUSTED_CALLER_TEXT = (name) =>
  `${name} is unchanged: a plugin that is not built in, or one with no load on record, stands behind this call, and in a session that takes its settings from its organization such a call can set only the variables a person's own settings file could`;
//@ chunk-5xgkngpb.js:3819527-3819603 placement
/**
 * 拒绝并记录
 */
function denyEnvSet(plugin, reason) {
  logForDebugging(`${plugin}: $.env.set: ${reason}`, {
    level: "warn",
  });
  return {
    deny: reason,
  };
}
//@ chunk-5xgkngpb.js:3819603-3819741 placement
var ENV_HOST_ONLY_TEXT = (name) =>
  `${name} is unchanged: only the environment Claude Code starts with, or Claude Code itself, may give it this value (host rule)`;
//@ chunk-5xgkngpb.js:3819741-3819821 placement
/**
 * 记录并应用环境变量
 */
async function applyEnvSetWithRecord(request, recordPerson, wasSet, writer) {
  if (recordPerson) recordPersonsEnvValue(request.name, request.value);
  await applyEnvSet(request, wasSet, writer);
  return {};
}
//@ chunk-5xgkngpb.js:3819821-3820129 placement
/**
 * 环境变量值未生效的说明：钩子改写了值，而链中有非内置或无加载记录的插件。
 */
var ENV_REWRITTEN_BY_UNTRUSTED_TEXT = (name) =>
  `${name} is unchanged: a hook changed the value on its way and a plugin that is not built in, or one with no load on record, is among the hooks of this call, and in a session that takes its settings from its organization such a plugin can set only the variables a person's own settings file could`;
//@ chunk-5xgkngpb.js:3820129-3820387 placement
/**
 * $.env.set 表项：宿主专有变量拒绝；组织托管设置下，非内置或无加载记录的插件（或其改写的值）只能设置个人设置文件允许的变量。
 */
var ENV_SET_API = (runtime) => ({
  check: checkEnvSetArgs,
  run: async (request, ctx, caller) => {
    if (isHostOnlyEnvKey(request.name, request.value))
      return denyEnvSet(ctx.plugin, ENV_HOST_ONLY_TEXT(request.name));
    let answerFlag = managedMarketplaceAnswerFlag();
    let rewrittenByThirdParty = isEnvValueRewrittenByThirdParty(request, caller);
    let isDenied = answerFlag && rewrittenByThirdParty;
    let denial = isDenied || (answerFlag && hasUntrustedEnvCaller(runtime, ctx));
    return denial && !personsSettingsEnvKeeps(request.name, request.value ?? "")
      ? denyEnvSet(
          ctx.plugin,
          (isDenied ? ENV_REWRITTEN_BY_UNTRUSTED_TEXT : ENV_UNTRUSTED_CALLER_TEXT)(request.name),
        )
      : applyEnvSetWithRecord(
          request,
          denial,
          !rewrittenByThirdParty && isEnvChainTrusted(runtime, ctx),
          rewrittenByThirdParty ? undefined : soleEnvCallerId(runtime, ctx),
        );
  },
});
//@ chunk-5xgkngpb.js:3820387-3820683 placement
/**
 * 取发起调用的 hooks 模块环境参数；模块已重载或移除时拒绝并记遥测。
 */
function requireCallingEnvironment(runtime, caller, { op, feature }) {
  let callerArgs =
    caller.environmentId === undefined ? undefined : runtime.environmentArgs.get(caller.environmentId);
  if (callerArgs === undefined) {
    logFeatureBad(feature, "module_no_longer_loaded");
    throw new HooksError(
      `${caller.plugin}: $.${op} refused: the hooks module that made the call is no longer loaded (it was reloaded or removed)`,
    );
  }
  return callerArgs;
}
//@ chunk-5xgkngpb.js:3820683-3820821 placement
/**
 * $.flag.value 表项：读取特性开关值（构建无开关表时拒绝）。
 */
var FLAG_VALUE_API = {
  check: (args) =>
    alwaysFalse() ? checkFlagValueArgs(args) : "reads a feature flag, which this build has no table of",
  run: (args) => Promise.resolve(getFeatureValue_CACHED_MAY_BE_STALE(args.name, args.fallback)),
};
//@ chunk-5xgkngpb.js:3820821-3820851 placement
/**
 * 冻结对象
 */
var freezeObject = (object) => Object.freeze(object);
export {
  freezeObject,
  FLAG_VALUE_API,
  requireCallingEnvironment,
  checkEnvSetArgs,
  envGetCore,
  ENV_SET_API,
  envGetForPlugin,
};
