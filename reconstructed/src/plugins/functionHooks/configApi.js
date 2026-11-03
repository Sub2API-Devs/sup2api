/**
 * plugins/functionHooks/configApi.ts
 *
 * 2.1.316 新增：插件 $.config.set 接口与 config.set 事件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { createDescribeCache } from "./commandApi.js";
import { xle, B1 } from "./coreHandlers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { createSignal } from "../../utils/signal.js";
import { loadConfigRowHandles } from "./apiDispatch.js";
import { UI_ENV_SITE_RULES, checkConfigValueType } from "./sites/siteRules.js";
import { errorMessage } from "../../utils/errors.js";
import { HooksError } from "./hooksErrors.js";

/**
 * 把配置项转成 config.describe 用的描述对象（与 Shell 无关，切分误归）。
 */
//@ chunk-e6aww6q8.js:3718367-3718466 placement = getShellConfigImpl (0.668)
var toConfigDescribeItem = (e) => ({
  key: e.key,
  label: e.label,
  description: e.description,
  isHidden: !1,
  provider: e.provider,
});
//@ chunk-e6aww6q8.js:3718466-3718483 placement
var $xe = createDescribeCache(xle);
//@ chunk-e6aww6q8.js:3718483-3718547 placement
var _In = (e, n) => ({ ...e, label: n.label, description: n.description });
//@ chunk-e6aww6q8.js:3718547-3718775 placement
async function describeConfigRow(e, n) {
  let r = toConfigDescribeItem(e),
    s = () =>
      NO_CORE_AT_CHAIN_BOTTOM("config.describe", { core: { "config.describe": B1.core }, origin: n })(r),
    h = await (n ? s() : $xe.of(r, s)),
    S = h.label === e.label && h.description === e.description ? e : _In(e, h);
  return h.isHidden ? void 0 : S;
}
//@ chunk-e6aww6q8.js:3718775-3718862 placement
function pGr(e, n) {
  return hasModuleHookingSite("config.describe", { key: e.key })
    ? describeConfigRow(e, n)
    : Promise.resolve(e);
}
//@ chunk-e6aww6q8.js:3718862-3719015 placement
async function describeConfigRows(e, n) {
  let filtered = (await Promise.all(e.map((h) => pGr(h, n)))).filter((h) => h !== void 0);
  return filtered.length === e.length && filtered.every((h, y) => h === e[y]) ? e : filtered;
}
/**
 * /config 行变化计数器：bump 递增并通知订阅者。
 */
//@ chunk-e6aww6q8.js:3719015-3719121 placement
var CONFIG_ROWS_VERSION = (() => {
  let e = 0,
    n = createSignal();
  return {
    get: () => e,
    subscribe: (r) => n.subscribe(r),
    bump: () => {
      ((e += 1), n.emit());
    },
  };
})();
//@ chunk-e6aww6q8.js:3719121-3719186 placement
function bIn(e) {
  if (($xe.forget(), e !== "config.describe")) CONFIG_ROWS_VERSION.bump();
}
//@ chunk-e6aww6q8.js:3719186-3719280 placement
var vFr = async (e, n = [e]) => [
  ...(await describeConfigRows(
    Array.from(await loadConfigRowHandles(e, "$.config.list"), (r) => r.row),
    n,
  )),
];
//@ chunk-e6aww6q8.js:3719280-3719305 placement
var EFr = UI_ENV_SITE_RULES["config.set"];
/**
 * 按配置项类型（布尔、选项、字符串、数字、列表）校验要写入的值，返回问题说明。
 */
//@ chunk-e6aww6q8.js:3719305-3719651 placement
function checkConfigValue(e, n) {
  let r = e.options ?? [],
    s = typeof n === "string" && r.includes(n);
  switch (e.kind) {
    case "boolean":
      return typeof n === "boolean" ? void 0 : "takes true or false";
    case "choice":
      return s ? void 0 : `takes one of: ${r.join(", ")}`;
    case "text":
      return typeof n === "string" ? void 0 : "takes a text";
    case "number":
      return Number.isFinite(n) ? void 0 : "takes a number";
  }
}
//@ chunk-e6aww6q8.js:3719651-3719823 placement
var createConfigSetCore = (e) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  run: async (n) => {
    let r = e.lockReason ?? checkConfigValue(e.row, n.value) ?? (await e.write(n.value));
    return r === void 0 ? { value: n.value } : { deny: r };
  },
});
//@ chunk-e6aww6q8.js:3719823-3719929 placement
var toConfigSetEvent = (e) => ({
  key: e.row.key,
  value: e.value,
  previous: e.row.value,
  provider: e.row.provider,
  origin: e.origin,
});
//@ chunk-e6aww6q8.js:3719929-3719958 placement
var Qfn = () => hasModuleHookingSite("config.set");
//@ chunk-e6aww6q8.js:3719958-3719999 placement
var freeze_17 = Object.freeze({ kind: "composer" });
/**
 * 经 config.set 钩子链设置一个 /config 行的值（核心处理器负责锁定检查、类型检查与写入），失败时返回 deny。
 */
//@ chunk-e6aww6q8.js:3719999-3720180 placement
async function dispatchConfigSet(e) {
  try {
    return await NO_CORE_AT_CHAIN_BOTTOM("config.set", {
      core: { "config.set": createConfigSetCore(e) },
      origin: e.hookOrigin,
      signal: e.signal,
    })(toConfigSetEvent(e));
  } catch (error) {
    return { deny: `config.set failed: ${errorMessage(error)}` };
  }
}
//@ chunk-e6aww6q8.js:3720180-3720453 placement
async function configSetForPlugin(e, n, r = [n]) {
  let found = (await loadConfigRowHandles(n, "$.config.set")).find((h) => h.row.key === e.key);
  if (!found)
    throw new HooksError(`${n}: $.config.set: no /config row with key ${e.key} ($.config.list names them)`);
  return dispatchConfigSet({ ...found, value: e.value, origin: { kind: "plugin", name: n }, hookOrigin: r });
}
/**
 * $.config.set 表项：参数 {key, value}，按 key 找到 /config 行后经 config.set 设置。
 */
//@ chunk-e6aww6q8.js:3720453-3720619 placement
var CONFIG_SET_API = {
  check: (e) =>
    typeof e?.key === "string" && e.key !== ""
      ? checkConfigValueType(e.value)
      : "takes { key, value } (the key as $.config.list names it)",
  run: (e, n) => configSetForPlugin(e, n.plugin, n.origin),
};
//@ chunk-e6aww6q8.js:3720619-3720668 placement
async function* AIn(e, n) {
  return (await e, yield* n());
}

export { Qfn, CONFIG_ROWS_VERSION, EFr, AIn, vFr, CONFIG_SET_API, bIn, freeze_17, dispatchConfigSet, pGr };
