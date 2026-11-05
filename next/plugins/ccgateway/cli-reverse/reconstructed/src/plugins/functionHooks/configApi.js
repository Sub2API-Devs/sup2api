/**
 * plugins/functionHooks/configApi.ts
 *
 * 2.1.316 新增：插件 $.config.set 接口与 config.set 事件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3814076-3814175 placement (2.1.88 match: getShellConfigImpl, 0.668)
/**
 * 把配置项转成 config.describe 用的描述对象（与 Shell 无关，切分误归）。
 */
var toConfigDescribeItem = (row) => ({
  key: row.key,
  label: row.label,
  description: row.description,
  isHidden: false,
  provider: row.provider,
});
//@ chunk-5xgkngpb.js:3814175-3814192 placement
/**
 * 配置行描述缓存
 */
var configDescribeCache; // deferred: uses createDescribeCache (./commandApi.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3814175", () => {
  configDescribeCache = createDescribeCache(pickRowFields);
});
//@ chunk-5xgkngpb.js:3814192-3814256 placement
/**
 * 合并 label/description
 */
var withRowLabels = (row, described) => ({
  ...row,
  label: described.label,
  description: described.description,
});
//@ chunk-5xgkngpb.js:3814256-3814484 placement
async function describeConfigRow(row, plugin) {
  let configDescribeItem = toConfigDescribeItem(row);
  let bottom = () =>
    NO_CORE_AT_CHAIN_BOTTOM("config.describe", {
      core: {
        "config.describe": CONFIG_DESCRIBE_EVENT.core,
      },
      origin: plugin,
    })(configDescribeItem);
  let described = await (plugin ? bottom() : configDescribeCache.of(configDescribeItem, bottom));
  let merged =
    described.label === row.label && described.description === row.description
      ? row
      : withRowLabels(row, described);
  return described.isHidden ? undefined : merged;
}
//@ chunk-5xgkngpb.js:3814484-3814571 placement
/**
 * 有钩子时改写配置行
 */
function describeConfigRowIfHooked(row, plugin) {
  return hasModuleHookingSite("config.describe", {
    key: row.key,
  })
    ? describeConfigRow(row, plugin)
    : Promise.resolve(row);
}
//@ chunk-5xgkngpb.js:3814571-3814724 placement
async function describeConfigRows(rows, plugin) {
  let filtered = (await Promise.all(rows.map((row) => describeConfigRowIfHooked(row, plugin)))).filter(
    (row) => row !== undefined,
  );
  return filtered.length === rows.length && filtered.every((row, index) => row === rows[index])
    ? rows
    : filtered;
}
//@ chunk-5xgkngpb.js:3814724-3814830 placement
/**
 * /config 行变化计数器：bump 递增并通知订阅者。
 */
var CONFIG_ROWS_VERSION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3814724", () => {
  CONFIG_ROWS_VERSION = (() => {
    let rows = 0;
    let signal = createSignal();
    return {
      get: () => rows,
      subscribe: (plugin) => signal.subscribe(plugin),
      bump: () => {
        rows += 1;
        signal.emit();
      },
    };
  })();
});
//@ chunk-5xgkngpb.js:3814830-3814895 placement
/**
 * 配置钩子释放时递增版本
 */
function onConfigHookReleased(turnHeld) {
  configDescribeCache.forget();
  if (turnHeld !== "config.describe") CONFIG_ROWS_VERSION.bump();
}
//@ chunk-5xgkngpb.js:3814895-3814989 placement
/**
 * 描述配置行列表
 */
var describeConfigRowsList = async (pluginName, plugin = [pluginName]) => [
  ...(await describeConfigRows(
    Array.from(await loadConfigRowHandles(pluginName, "$.config.list"), (handle) => handle.row),
    plugin,
  )),
];
//@ chunk-5xgkngpb.js:3814989-3815014 placement
/**
 * config.set 站点规则
 */
var CONFIG_SET_SITE_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3814989", () => {
  CONFIG_SET_SITE_RULES = UI_ENV_SITE_RULES["config.set"];
});
//@ chunk-5xgkngpb.js:3815014-3815360 placement
/**
 * 按配置项类型（布尔、选项、字符串、数字、列表）校验要写入的值，返回问题说明。
 */
function checkConfigValue(row, value) {
  let options = row.options ?? [];
  let isValidOption = typeof value === "string" && options.includes(value);
  switch (row.kind) {
    case "boolean":
      return typeof value === "boolean" ? undefined : "takes true or false";
    case "choice":
      return isValidOption ? undefined : `takes one of: ${options.join(", ")}`;
    case "text":
      return typeof value === "string" ? undefined : "takes a text";
    case "number":
      return Number.isFinite(value) ? undefined : "takes a number";
  }
}
//@ chunk-5xgkngpb.js:3815360-3815532 placement
var createConfigSetCore = (config) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (req) => {
    let event =
      config.lockReason ?? checkConfigValue(config.row, req.value) ?? (await config.write(req.value));
    return event === undefined
      ? {
          value: req.value,
        }
      : {
          deny: event,
        };
  },
});
//@ chunk-5xgkngpb.js:3815532-3815638 placement
var toConfigSetEvent = (request) => ({
  key: request.row.key,
  value: request.value,
  previous: request.row.value,
  provider: request.row.provider,
  origin: request.origin,
});
//@ chunk-5xgkngpb.js:3815638-3815667 placement
/**
 * config.set 是否有钩子
 */
var isConfigSetHooked = () => hasModuleHookingSite("config.set");
//@ chunk-5xgkngpb.js:3815667-3815708 placement
var COMPOSER_CONFIG_ORIGIN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3815667", () => {
  COMPOSER_CONFIG_ORIGIN = Object.freeze({
    kind: "composer",
  });
});
//@ chunk-5xgkngpb.js:3815708-3815889 placement
/**
 * 经 config.set 钩子链设置一个 /config 行的值（核心处理器负责锁定检查、类型检查与写入），失败时返回 deny。
 */
async function dispatchConfigSet(request) {
  try {
    return await NO_CORE_AT_CHAIN_BOTTOM("config.set", {
      core: {
        "config.set": createConfigSetCore(request),
      },
      origin: request.hookOrigin,
      signal: request.signal,
    })(toConfigSetEvent(request));
  } catch (error) {
    return {
      deny: `config.set failed: ${errorMessage(error)}`,
    };
  }
}
//@ chunk-5xgkngpb.js:3815889-3816162 placement
async function configSetForPlugin(request, pluginName, hookOrigin = [pluginName]) {
  let found = (await loadConfigRowHandles(pluginName, "$.config.set")).find(
    (handle) => handle.row.key === request.key,
  );
  if (!found)
    throw new HooksError(
      `${pluginName}: $.config.set: no /config row with key ${request.key} ($.config.list names them)`,
    );
  return dispatchConfigSet({
    ...found,
    value: request.value,
    origin: {
      kind: "plugin",
      name: pluginName,
    },
    hookOrigin,
  });
}
//@ chunk-5xgkngpb.js:3816162-3816328 placement
/**
 * $.config.set 表项：参数 {key, value}，按 key 找到 /config 行后经 config.set 设置。
 */
var CONFIG_SET_API = {
  check: (args) =>
    typeof args?.key === "string" && args.key !== ""
      ? checkConfigValueType(args.value)
      : "takes { key, value } (the key as $.config.list names it)",
  run: (a, b) => configSetForPlugin(a, b.plugin, b.origin),
};
//@ chunk-5xgkngpb.js:3816328-3816377 placement
/**
 * 先等待再 yield*
 */
async function* afterThenYield(first, rest) {
  await first;
  return yield* rest();
}
export {
  CONFIG_SET_SITE_RULES,
  describeConfigRowsList,
  CONFIG_SET_API,
  onConfigHookReleased,
  afterThenYield,
  isConfigSetHooked,
  CONFIG_ROWS_VERSION,
  COMPOSER_CONFIG_ORIGIN,
  dispatchConfigSet,
  describeConfigRowIfHooked,
};
