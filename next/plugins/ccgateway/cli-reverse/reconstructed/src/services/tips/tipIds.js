/**
 * services/tips/tipIds.ts
 *
 * 2.1.316 新增：提示 id。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv3bzw2x.js (9)
 * attribution: placement 9
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { fromEnum } from "../analytics/safeMetadata.js";

//@ chunk-jv3bzw2x.js:265-844 placement
/**
 * 内置提示（tip）的 id 列表。
 */
var BUILT_IN_TIP_IDS = [
  "c4e-ultrareview",
  "claude-design-command",
  "content-link-long-sessions",
  "default-permission-mode-config",
  "desktop-app",
  "desktop-contextual",
  "desktop-ios-simulator",
  "desktop-shortcut",
  "explanatory-output-style",
  "focus-view",
  "frontend-design-plugin",
  "ide-upsell-external-terminal",
  "install-github-app",
  "install-slack-app",
  "install-slack-app-mcp",
  "memory-command",
  "no-flicker",
  "permissions",
  "plugin-disuse-review",
  "status-line",
  "team-onboarding-share",
  "voice-mode",
  "web-setup-github",
  "workflow-size-prompting",
  "workflow-size-prompting-ambient",
  "you-should-know-plugin",
  ...[],
];
//@ chunk-jv3bzw2x.js:844-879 placement
/**
 * 判断 id 是否属于内置提示 id 列表。
 */
function isBuiltInTipId(tipId) {
  return BUILT_IN_TIP_IDS.includes(tipId);
}
//@ chunk-jv3bzw2x.js:879-1193 placement
/**
 * 记录提示已展示：本次启动序号写入 tipsHistory、累计展示次数加一，可记下由哪个命令触发；同一次启动重复调用不重复计数。
 */
function recordTipShown(tipId, storageV5, advertisedCommand) {
  let numStartups = getGlobalConfig().numStartups;
  saveGlobalConfig((config) => {
    let tipsHistory = config.tipsHistory ?? {};
    if (tipsHistory[tipId] === numStartups) return config;
    let tipLifetimeShownCounts = config.tipLifetimeShownCounts ?? {};
    return {
      ...config,
      tipsHistory: {
        ...tipsHistory,
        [tipId]: numStartups,
      },
      tipLifetimeShownCounts: {
        ...tipLifetimeShownCounts,
        [tipId]: (tipLifetimeShownCounts[tipId] ?? 0) + 1,
      },
      ...(advertisedCommand !== undefined && {
        tipsHistoryByCommand: {
          ...config.tipsHistoryByCommand,
          [advertisedCommand]: {
            tipId,
            numStartups,
          },
        },
      }),
    };
  }, storageV5);
}
//@ chunk-jv3bzw2x.js:1193-1203 placement
var MAX_LAUNCHES_AGO = 100;
//@ chunk-jv3bzw2x.js:1203-1441 placement
/**
 * 若某命令是由提示引导执行的，返回打点字段：via_tip、距提示展示过了几次启动（封顶）以及（内置提示的）tip_id。
 */
function getTipAttribution(name) {
  let globalConfig = getGlobalConfig();
  let attribution = globalConfig.tipsHistoryByCommand?.[name];
  if (typeof attribution !== "object" || attribution === null) return {};
  let launchesAgo = globalConfig.numStartups - attribution.numStartups;
  if (!(launchesAgo >= 0)) return {};
  return {
    via_tip: true,
    tip_launches_ago: Math.min(launchesAgo, MAX_LAUNCHES_AGO),
    ...(isBuiltInTipId(attribution.tipId) && {
      tip_id: fromEnum(attribution.tipId),
    }),
  };
}
//@ chunk-jv3bzw2x.js:1441-1500 placement
/**
 * 读取某提示在全局配置里的累计展示次数。
 */
function tipLifetimeShownCount(tipId) {
  return getGlobalConfig().tipLifetimeShownCounts?.[tipId] ?? 0;
}
//@ chunk-jv3bzw2x.js:1500-1564 placement
/**
 * 读取某插件建议的累计展示次数。
 */
function pluginSuggestionShownCount(pluginId) {
  return getGlobalConfig().pluginSuggestionShownCounts?.[pluginId] ?? 0;
}
//@ chunk-jv3bzw2x.js:1651-1723 placement
/**
 * 读取某插件建议在发现页的累计展示次数。
 */
function pluginSuggestionDiscoverShownCount(pluginId) {
  return getGlobalConfig().pluginSuggestionDiscoverShownCounts?.[pluginId] ?? 0;
}
//@ chunk-jv3bzw2x.js:1723-1959 placement
/**
 * 记录插件建议在发现页已展示（每个插件计数加一，全部已展示过时不再写）。
 */
function recordPluginSuggestionShown(pluginIds, storageV5) {
  if (pluginIds.length === 0) return;
  saveGlobalConfig((config) => {
    let pluginSuggestionDiscoverShownCounts = config.pluginSuggestionDiscoverShownCounts ?? {};
    if (pluginIds.every((pluginId) => (pluginSuggestionDiscoverShownCounts[pluginId] ?? 0) > 0))
      return config;
    let counts = {
      ...pluginSuggestionDiscoverShownCounts,
    };
    for (let pluginId of pluginIds) counts[pluginId] = (counts[pluginId] ?? 0) + 1;
    return {
      ...config,
      pluginSuggestionDiscoverShownCounts: counts,
    };
  }, storageV5);
}
export {
  tipLifetimeShownCount,
  recordTipShown,
  getTipAttribution,
  pluginSuggestionShownCount,
  pluginSuggestionDiscoverShownCount,
  recordPluginSuggestionShown,
};
