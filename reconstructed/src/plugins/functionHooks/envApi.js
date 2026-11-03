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
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { kSi } from "./eventPatterns.js";
import { OTn } from "../../utils/managedEnvSafety.js";
import { Oxi, snapshotHostEnvVar } from "../../utils/plugins/securityDefaultPlugin.js";
import { exitIfServeHelperMisconfigured } from "../../cli/headlessCloud/attachServe.js";
import { GN } from "./apiDispatch.js";
import { originPlugin } from "./hooksWorkerClient.js";
import { isOfficialMarketplaceRef, IJ } from "../../utils/plugins/marketplaceNames.js";
import { BPe } from "../../utils/plugins/managedPlugins.js";
import { logForDebugging } from "../../utils/debug.js";
import { recordPersonsEnvValue, personsSettingsEnvKeeps } from "../../utils/managedEnvApply.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { HooksError } from "./hooksErrors.js";
import { cSi } from "./api/operations.js";
import { checkFlagValueArgs } from "./panes.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:3721548-3721625 placement
function Bxe(e) {
  let n = isPlainObject_4(e) ? e.name : void 0;
  return typeof n === "string" ? n : void 0;
}
//@ chunk-e6aww6q8.js:3721625-3722167 placement
function envGetForPlugin(e, n, r) {
  if (!kSi(n)) return;
  let s = Bxe(r),
    h = n === "env.get";
  if (s === void 0) return `it carries no variable name a $.${n}("<name>") call passes`;
  let y = isPlainObject_4(r) ? r.value : void 0;
  if (!h && OTn(s, typeof y === "string" ? y : void 0))
    return `only the environment Claude Code starts with, or Claude Code itself, sets ${s} (host rule)`;
  let S = (h ? e.env?.reads : e.env?.writes) ?? [];
  return S.includes(s)
    ? void 0
    : `its hooks module does not name ${s} in a $.${n}("<name>") call (host rule; the scan lists ${h ? "reads" : "writes"} of ${S.length === 0 ? "nothing" : S.join(", ")})`;
}
/**
 * $.env.get 核心：读取进程环境变量（USER_TYPE 固定为 external）。
 */
//@ chunk-e6aww6q8.js:3722167-3722293 placement
function envGetCore(e) {
  let r = e.name === "USER_TYPE" ? "external" : process.env[e.name];
  return Promise.resolve(r === void 0 ? void 0 : String(r));
}
/**
 * 校验 $.env.set 参数：变量名非空且不含 = 或 NUL，值为字符串或 undefined（不含 NUL）。
 */
//@ chunk-e6aww6q8.js:3722293-3722702 placement
function checkEnvSetArgs(e) {
  let n = Bxe(e);
  if (!(n !== void 0 && n !== "" && !n.includes("=") && !n.includes("\x00")))
    return `takes a variable name on a plain object (got ${n === void 0 ? typeof e?.name : JSON.stringify(n)})`;
  let s = isPlainObject_4(e) ? e.value : void 0;
  if (s !== void 0 && typeof s !== "string")
    return `takes a string value, or undefined to unset (got ${typeof s})`;
  return s !== void 0 && s.includes("\x00") ? "takes a value with no NUL byte in it" : void 0;
}
//@ chunk-e6aww6q8.js:3722702-3722871 placement
function applyEnvSet(e, n, r) {
  let s = n ? Oxi(e.name) : snapshotHostEnvVar(e.name, r);
  if (e.value === void 0) delete process.env[e.name];
  else process.env[e.name] = e.value;
  return (s(), exitIfServeHelperMisconfigured(), Promise.resolve());
}
//@ chunk-e6aww6q8.js:3722871-3723043 placement
var envCallChainArgs = (e, n) => [
  GN(e, n),
  ...(n.callers ?? []).map((r) => e.environmentArgs.get(r)),
  ...n.origin
    .map(originPlugin)
    .filter((r) => r !== n.plugin)
    .map((r) => (r === void 0 ? void 0 : e.knownArgs.get(r))),
];
//@ chunk-e6aww6q8.js:3723043-3723122 placement
function OIn(e, n) {
  return envCallChainArgs(e, n).some((r) => r === void 0 || !isOfficialMarketplaceRef(r.pluginStorageId));
}
//@ chunk-e6aww6q8.js:3723122-3723265 placement
function isEnvValueRewrittenByThirdParty(e, n) {
  try {
    return (
      n !== void 0 &&
      n.sent.value !== e.value &&
      n.hooked().some((r) => r === void 0 || !isOfficialMarketplaceRef(r.args.pluginStorageId))
    );
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:3723265-3723390 placement
function isEnvChainTrusted(e, n) {
  try {
    return envCallChainArgs(e, n).every(
      (r) => r !== void 0 && (isOfficialMarketplaceRef(r.pluginStorageId) || BPe(r.pluginStorageId)),
    );
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:3723390-3723543 placement
function soleEnvCallerId(e, n) {
  try {
    let [r, ...s] = envCallChainArgs(e, n);
    return r !== void 0 && s.every((h) => h?.pluginStorageId === r.pluginStorageId)
      ? r.pluginStorageId
      : void 0;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3723543-3723801 placement
var ENV_UNTRUSTED_CALLER_TEXT = (e) =>
  `${e} is unchanged: a plugin that is not built in, or one with no load on record, stands behind this call, and in a session that takes its settings from its organization such a call can set only the variables a person's own settings file could`;
//@ chunk-e6aww6q8.js:3723801-3723877 placement
function mrt(e, n) {
  return (logForDebugging(`${e}: $.env.set: ${n}`, { level: "warn" }), { deny: n });
}
//@ chunk-e6aww6q8.js:3723877-3724015 placement
var ENV_HOST_ONLY_TEXT = (e) =>
  `${e} is unchanged: only the environment Claude Code starts with, or Claude Code itself, may give it this value (host rule)`;
//@ chunk-e6aww6q8.js:3724015-3724095 placement
async function $In(e, n, r, s) {
  if (n) recordPersonsEnvValue(e.name, e.value);
  return (await applyEnvSet(e, r, s), {});
}
/**
 * 环境变量值未生效的说明：钩子改写了值，而链中有非内置或无加载记录的插件。
 */
//@ chunk-e6aww6q8.js:3724095-3724403 placement
var ENV_REWRITTEN_BY_UNTRUSTED_TEXT = (e) =>
  `${e} is unchanged: a hook changed the value on its way and a plugin that is not built in, or one with no load on record, is among the hooks of this call, and in a session that takes its settings from its organization such a plugin can set only the variables a person's own settings file could`;
/**
 * $.env.set 表项：宿主专有变量拒绝；组织托管设置下，非内置或无加载记录的插件（或其改写的值）只能设置个人设置文件允许的变量。
 */
//@ chunk-e6aww6q8.js:3724403-3724661 placement
var ENV_SET_API = (e) => ({
  check: checkEnvSetArgs,
  run: async (n, r, s) => {
    if (OTn(n.name, n.value)) return mrt(r.plugin, ENV_HOST_ONLY_TEXT(n.name));
    let h = IJ(),
      y = isEnvValueRewrittenByThirdParty(n, s),
      S = h && y,
      w = S || (h && OIn(e, r));
    return w && !personsSettingsEnvKeeps(n.name, n.value ?? "")
      ? mrt(r.plugin, (S ? ENV_REWRITTEN_BY_UNTRUSTED_TEXT : ENV_UNTRUSTED_CALLER_TEXT)(n.name))
      : $In(n, w, !y && isEnvChainTrusted(e, r), y ? void 0 : soleEnvCallerId(e, r));
  },
});
/**
 * 取发起调用的 hooks 模块环境参数；模块已重载或移除时拒绝并记遥测。
 */
//@ chunk-e6aww6q8.js:3724661-3724957 placement
function requireCallingEnvironment(e, n, { op: op, feature: feature }) {
  let h = n.environmentId === void 0 ? void 0 : e.environmentArgs.get(n.environmentId);
  if (h === void 0)
    throw (
      logFeatureBad(feature, "module_no_longer_loaded"),
      new HooksError(
        `${n.plugin}: $.${op} refused: the hooks module that made the call is no longer loaded (it was reloaded or removed)`,
      )
    );
  return h;
}
/**
 * $.flag.value 表项：读取特性开关值（构建无开关表时拒绝）。
 */
//@ chunk-e6aww6q8.js:3724957-3725095 placement
var FLAG_VALUE_API = {
  check: (e) => (cSi() ? checkFlagValueArgs(e) : "reads a feature flag, which this build has no table of"),
  run: (e) => Promise.resolve(getFeatureValue_CACHED_MAY_BE_STALE(e.name, e.fallback)),
};
//@ chunk-e6aww6q8.js:3725095-3725125 placement
var WIn = (e) => Object.freeze(e);

export {
  WIn,
  FLAG_VALUE_API,
  requireCallingEnvironment,
  checkEnvSetArgs,
  envGetCore,
  ENV_SET_API,
  envGetForPlugin,
};
