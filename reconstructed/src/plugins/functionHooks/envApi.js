/**
 * plugins/functionHooks/envApi.ts
 *
 * 2.1.316 新增：插件 $.env.get/set 接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { isEnvApiCall } from "./eventPatterns.js";
import { isHostOnlyEnvKey } from "../../utils/managedEnvSafety.js";
import { forgetEnvWriteRestorer, snapshotHostEnvVar } from "../../utils/plugins/securityDefaultPlugin.js";
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

//@ chunk-e6aww6q8.js:3721548-3721625 placement
/**
 * 取 $.env 参数里的名字
 */
function envApiName(e) {
  let n = isPlainObject_5(e) ? e.name : undefined;
  return typeof n === "string" ? n : undefined;
}
//@ chunk-e6aww6q8.js:3721625-3722167 placement
function envGetForPlugin(scan, n, r) {
  if (!isEnvApiCall(n)) return;
  let s = envApiName(r);
  let h = n === "env.get";
  if (s === undefined) return `it carries no variable name a $.${n}("<name>") call passes`;
  let y = isPlainObject_5(r) ? r.value : undefined;
  if (!h && isHostOnlyEnvKey(s, typeof y === "string" ? y : undefined))
    return `only the environment Claude Code starts with, or Claude Code itself, sets ${s} (host rule)`;
  let S = (h ? scan.env?.reads : scan.env?.writes) ?? [];
  return S.includes(s)
    ? undefined
    : `its hooks module does not name ${s} in a $.${n}("<name>") call (host rule; the scan lists ${h ? "reads" : "writes"} of ${S.length === 0 ? "nothing" : S.join(", ")})`;
}
//@ chunk-e6aww6q8.js:3722167-3722293 placement
/**
 * $.env.get 核心：读取进程环境变量（USER_TYPE 固定为 external）。
 */
function envGetCore(e) {
  let r = e.name === "USER_TYPE" ? "external" : process.env[e.name];
  return Promise.resolve(r === undefined ? undefined : String(r));
}
//@ chunk-e6aww6q8.js:3722293-3722702 placement
/**
 * 校验 $.env.set 参数：变量名非空且不含 = 或 NUL，值为字符串或 undefined（不含 NUL）。
 */
function checkEnvSetArgs(e) {
  let n = envApiName(e);
  if (!(n !== undefined && n !== "" && !n.includes("=") && !n.includes("\x00")))
    return `takes a variable name on a plain object (got ${n === undefined ? typeof e?.name : JSON.stringify(n)})`;
  let s = isPlainObject_5(e) ? e.value : undefined;
  if (s !== undefined && typeof s !== "string")
    return `takes a string value, or undefined to unset (got ${typeof s})`;
  return s !== undefined && s.includes("\x00") ? "takes a value with no NUL byte in it" : undefined;
}
//@ chunk-e6aww6q8.js:3722702-3722871 placement
function applyEnvSet(e, n, writer) {
  let s = n ? forgetEnvWriteRestorer(e.name) : snapshotHostEnvVar(e.name, writer);
  if (e.value === undefined) delete process.env[e.name];
  else process.env[e.name] = e.value;
  s();
  exitIfServeHelperMisconfigured();
  return Promise.resolve();
}
//@ chunk-e6aww6q8.js:3722871-3723043 placement
var envCallChainArgs = (e, n) => [
  admittedArgs(e, n),
  ...(n.callers ?? []).map((r) => e.environmentArgs.get(r)),
  ...n.origin
    .map(originPlugin)
    .filter((r) => r !== n.plugin)
    .map((r) => (r === undefined ? undefined : e.knownArgs.get(r))),
];
//@ chunk-e6aww6q8.js:3723043-3723122 placement
/**
 * 链里有非官方插件
 */
function hasUntrustedEnvCaller(e, n) {
  return envCallChainArgs(e, n).some((r) => r === undefined || !isOfficialMarketplaceRef(r.pluginStorageId));
}
//@ chunk-e6aww6q8.js:3723122-3723265 placement
function isEnvValueRewrittenByThirdParty(e, n) {
  try {
    return (
      n !== undefined &&
      n.sent.value !== e.value &&
      n.hooked().some((r) => r === undefined || !isOfficialMarketplaceRef(r.args.pluginStorageId))
    );
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:3723265-3723390 placement
function isEnvChainTrusted(e, n) {
  try {
    return envCallChainArgs(e, n).every(
      (r) =>
        r !== undefined &&
        (isOfficialMarketplaceRef(r.pluginStorageId) || isVouchedPolicyPluginId(r.pluginStorageId)),
    );
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:3723390-3723543 placement
function soleEnvCallerId(e, n) {
  try {
    let [r, ...s] = envCallChainArgs(e, n);
    return r !== undefined && s.every((h) => h?.pluginStorageId === r.pluginStorageId)
      ? r.pluginStorageId
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3723543-3723801 placement
var ENV_UNTRUSTED_CALLER_TEXT = (e) =>
  `${e} is unchanged: a plugin that is not built in, or one with no load on record, stands behind this call, and in a session that takes its settings from its organization such a call can set only the variables a person's own settings file could`;
//@ chunk-e6aww6q8.js:3723801-3723877 placement
/**
 * 拒绝并记录
 */
function denyEnvSet(plugin, n) {
  logForDebugging(`${plugin}: $.env.set: ${n}`, {
    level: "warn",
  });
  return {
    deny: n,
  };
}
//@ chunk-e6aww6q8.js:3723877-3724015 placement
var ENV_HOST_ONLY_TEXT = (name) =>
  `${name} is unchanged: only the environment Claude Code starts with, or Claude Code itself, may give it this value (host rule)`;
//@ chunk-e6aww6q8.js:3724015-3724095 placement
/**
 * 记录并应用环境变量
 */
async function applyEnvSetWithRecord(e, n, r, s) {
  if (n) recordPersonsEnvValue(e.name, e.value);
  await applyEnvSet(e, r, s);
  return {};
}
//@ chunk-e6aww6q8.js:3724095-3724403 placement
/**
 * 环境变量值未生效的说明：钩子改写了值，而链中有非内置或无加载记录的插件。
 */
var ENV_REWRITTEN_BY_UNTRUSTED_TEXT = (e) =>
  `${e} is unchanged: a hook changed the value on its way and a plugin that is not built in, or one with no load on record, is among the hooks of this call, and in a session that takes its settings from its organization such a plugin can set only the variables a person's own settings file could`;
//@ chunk-e6aww6q8.js:3724403-3724661 placement
/**
 * $.env.set 表项：宿主专有变量拒绝；组织托管设置下，非内置或无加载记录的插件（或其改写的值）只能设置个人设置文件允许的变量。
 */
var ENV_SET_API = (e) => ({
  check: checkEnvSetArgs,
  run: async (n, r, s) => {
    if (isHostOnlyEnvKey(n.name, n.value)) return denyEnvSet(r.plugin, ENV_HOST_ONLY_TEXT(n.name));
    let h = managedMarketplaceAnswerFlag();
    let y = isEnvValueRewrittenByThirdParty(n, s);
    let S = h && y;
    let w = S || (h && hasUntrustedEnvCaller(e, r));
    return w && !personsSettingsEnvKeeps(n.name, n.value ?? "")
      ? denyEnvSet(r.plugin, (S ? ENV_REWRITTEN_BY_UNTRUSTED_TEXT : ENV_UNTRUSTED_CALLER_TEXT)(n.name))
      : applyEnvSetWithRecord(n, w, !y && isEnvChainTrusted(e, r), y ? undefined : soleEnvCallerId(e, r));
  },
});
//@ chunk-e6aww6q8.js:3724661-3724957 placement
/**
 * 取发起调用的 hooks 模块环境参数；模块已重载或移除时拒绝并记遥测。
 */
function requireCallingEnvironment(e, n, { op, feature }) {
  let h = n.environmentId === undefined ? undefined : e.environmentArgs.get(n.environmentId);
  if (h === undefined) {
    logFeatureBad(feature, "module_no_longer_loaded");
    throw new HooksError(
      `${n.plugin}: $.${op} refused: the hooks module that made the call is no longer loaded (it was reloaded or removed)`,
    );
  }
  return h;
}
//@ chunk-e6aww6q8.js:3724957-3725095 placement
/**
 * $.flag.value 表项：读取特性开关值（构建无开关表时拒绝）。
 */
var FLAG_VALUE_API = {
  check: (e) =>
    alwaysFalse() ? checkFlagValueArgs(e) : "reads a feature flag, which this build has no table of",
  run: (e) => Promise.resolve(getFeatureValue_CACHED_MAY_BE_STALE(e.name, e.fallback)),
};
//@ chunk-e6aww6q8.js:3725095-3725125 placement
/**
 * 冻结对象
 */
var freezeObject = (e) => Object.freeze(e);
export {
  freezeObject,
  FLAG_VALUE_API,
  requireCallingEnvironment,
  checkEnvSetArgs,
  envGetCore,
  ENV_SET_API,
  envGetForPlugin,
};
