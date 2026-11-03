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
import { pickRowFields, CONFIG_DESCRIBE_EVENT } from "./coreHandlers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { createSignal } from "../../utils/signal.js";
import { loadConfigRowHandles } from "./apiDispatch.js";
import { UI_ENV_SITE_RULES, checkConfigValueType } from "./sites/siteRules.js";
import { errorMessage } from "../../utils/errors.js";
import { HooksError } from "./hooksErrors.js";

//@ chunk-e6aww6q8.js:3718367-3718466 placement = getShellConfigImpl (0.668)
/**
 * 把配置项转成 config.describe 用的描述对象（与 Shell 无关，切分误归）。
 */
var toConfigDescribeItem = (e) => ({
  key: e.key,
  label: e.label,
  description: e.description,
  isHidden: false,
  provider: e.provider,
});
//@ chunk-e6aww6q8.js:3718466-3718483 placement
/**
 * 配置行描述缓存
 */
var configDescribeCache = createDescribeCache(pickRowFields);
//@ chunk-e6aww6q8.js:3718483-3718547 placement
/**
 * 合并 label/description
 */
var withRowLabels = (e, n) => ({
  ...e,
  label: n.label,
  description: n.description,
});
//@ chunk-e6aww6q8.js:3718547-3718775 placement
async function describeConfigRow(e, n) {
  let configDescribeItem = toConfigDescribeItem(e);
  let s = () =>
    NO_CORE_AT_CHAIN_BOTTOM("config.describe", {
      core: {
        "config.describe": CONFIG_DESCRIBE_EVENT.core,
      },
      origin: n,
    })(configDescribeItem);
  let h = await (n ? s() : configDescribeCache.of(configDescribeItem, s));
  let S = h.label === e.label && h.description === e.description ? e : withRowLabels(e, h);
  return h.isHidden ? undefined : S;
}
//@ chunk-e6aww6q8.js:3718775-3718862 placement
/**
 * 有钩子时改写配置行
 */
function describeConfigRowIfHooked(e, n) {
  return hasModuleHookingSite("config.describe", {
    key: e.key,
  })
    ? describeConfigRow(e, n)
    : Promise.resolve(e);
}
//@ chunk-e6aww6q8.js:3718862-3719015 placement
async function describeConfigRows(e, n) {
  let filtered = (await Promise.all(e.map((h) => describeConfigRowIfHooked(h, n)))).filter(
    (h) => h !== undefined,
  );
  return filtered.length === e.length && filtered.every((h, y) => h === e[y]) ? e : filtered;
}
//@ chunk-e6aww6q8.js:3719015-3719121 placement
/**
 * /config 行变化计数器：bump 递增并通知订阅者。
 */
var CONFIG_ROWS_VERSION = (() => {
  let e = 0;
  let signal = createSignal();
  return {
    get: () => e,
    subscribe: (r) => signal.subscribe(r),
    bump: () => {
      e += 1;
      signal.emit();
    },
  };
})();
//@ chunk-e6aww6q8.js:3719121-3719186 placement
/**
 * 配置钩子释放时递增版本
 */
function onConfigHookReleased(turnHeld) {
  configDescribeCache.forget();
  if (turnHeld !== "config.describe") CONFIG_ROWS_VERSION.bump();
}
//@ chunk-e6aww6q8.js:3719186-3719280 placement
/**
 * 描述配置行列表
 */
var describeConfigRowsList = async (plugin, origin = [plugin]) => [
  ...(await describeConfigRows(
    Array.from(await loadConfigRowHandles(plugin, "$.config.list"), (r) => r.row),
    origin,
  )),
];
//@ chunk-e6aww6q8.js:3719280-3719305 placement
/**
 * config.set 站点规则
 */
var CONFIG_SET_SITE_RULES = UI_ENV_SITE_RULES["config.set"];
//@ chunk-e6aww6q8.js:3719305-3719651 placement
/**
 * 按配置项类型（布尔、选项、字符串、数字、列表）校验要写入的值，返回问题说明。
 */
function checkConfigValue(row, n) {
  let options = row.options ?? [];
  let s = typeof n === "string" && options.includes(n);
  switch (row.kind) {
    case "boolean":
      return typeof n === "boolean" ? undefined : "takes true or false";
    case "choice":
      return s ? undefined : `takes one of: ${options.join(", ")}`;
    case "text":
      return typeof n === "string" ? undefined : "takes a text";
    case "number":
      return Number.isFinite(n) ? undefined : "takes a number";
  }
}
//@ chunk-e6aww6q8.js:3719651-3719823 placement
var createConfigSetCore = (e) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (n) => {
    let r = e.lockReason ?? checkConfigValue(e.row, n.value) ?? (await e.write(n.value));
    return r === undefined
      ? {
          value: n.value,
        }
      : {
          deny: r,
        };
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
/**
 * config.set 是否有钩子
 */
var isConfigSetHooked = () => hasModuleHookingSite("config.set");
//@ chunk-e6aww6q8.js:3719958-3719999 placement
var P8n = Object.freeze({
  kind: "composer",
});
//@ chunk-e6aww6q8.js:3719999-3720180 placement
/**
 * 经 config.set 钩子链设置一个 /config 行的值（核心处理器负责锁定检查、类型检查与写入），失败时返回 deny。
 */
async function dispatchConfigSet(e) {
  try {
    return await NO_CORE_AT_CHAIN_BOTTOM("config.set", {
      core: {
        "config.set": createConfigSetCore(e),
      },
      origin: e.hookOrigin,
      signal: e.signal,
    })(toConfigSetEvent(e));
  } catch (error) {
    return {
      deny: `config.set failed: ${errorMessage(error)}`,
    };
  }
}
//@ chunk-e6aww6q8.js:3720180-3720453 placement
async function configSetForPlugin(e, plugin, hookOrigin = [plugin]) {
  let found = (await loadConfigRowHandles(plugin, "$.config.set")).find((h) => h.row.key === e.key);
  if (!found)
    throw new HooksError(
      `${plugin}: $.config.set: no /config row with key ${e.key} ($.config.list names them)`,
    );
  return dispatchConfigSet({
    ...found,
    value: e.value,
    origin: {
      kind: "plugin",
      name: plugin,
    },
    hookOrigin,
  });
}
//@ chunk-e6aww6q8.js:3720453-3720619 placement
/**
 * $.config.set 表项：参数 {key, value}，按 key 找到 /config 行后经 config.set 设置。
 */
var CONFIG_SET_API = {
  check: (e) =>
    typeof e?.key === "string" && e.key !== ""
      ? checkConfigValueType(e.value)
      : "takes { key, value } (the key as $.config.list names it)",
  run: (e, n) => configSetForPlugin(e, n.plugin, n.origin),
};
//@ chunk-e6aww6q8.js:3720619-3720668 placement
/**
 * 先等待再 yield*
 */
async function* afterThenYield(e, n) {
  await e;
  return yield* n();
}
export {
  isConfigSetHooked,
  CONFIG_ROWS_VERSION,
  CONFIG_SET_SITE_RULES,
  afterThenYield,
  describeConfigRowsList,
  CONFIG_SET_API,
  onConfigHookReleased,
  P8n,
  dispatchConfigSet,
  describeConfigRowIfHooked,
};
