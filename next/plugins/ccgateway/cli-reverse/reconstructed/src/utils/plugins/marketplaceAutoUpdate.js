/**
 * utils/plugins/marketplaceAutoUpdate.ts
 *
 * 2.1.316 新增：市场自动更新
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { tryUnwrapTextPayload } from "./marketplaceManager.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { ownPropertyOrUndefined, logMarketplaceNoticeOnce } from "./marketplaceSources.js";
import { isPluginDirectoryModeOn } from "./pluginGates.js";
import { jsonStringify } from "../slowOperations.js";
import { SETTING_SOURCES } from "../settings/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4341490-4341547 placement
/**
 * AUTOUPDATE_SETTING_SOURCES_TEXT：autoUpdate 有效的设置源说明。
 */
var AUTOUPDATE_SETTING_SOURCES_TEXT = "user settings, --settings and managed settings";
//@ chunk-5xgkngpb.js:4341547-4341590 placement (2.1.88 match: getAutoUpdateEnabledMarketplaces, 1)
/**
 * 插件目录市场的 autoUpdate 设置。
 */
function getPluginDirectoryAutoUpdate() {
  return tryUnwrapTextPayload()[OFFICIAL_MARKETPLACE_NAME]?.autoUpdate;
}
//@ chunk-5xgkngpb.js:4341590-4342080 placement
/**
 * 取已声明市场的 autoUpdate。官方插件目录市场只采用受信设置层（getPluginDirectoryAutoUpdate）的值， 项目/本地/--add-dir 里的不同值被忽略并记一次调试日志。
 */
function getMarketplaceAutoUpdate(name, declaredMarketplaces) {
  let autoUpdate = ownPropertyOrUndefined(declaredMarketplaces, name)?.autoUpdate;
  if (name === OFFICIAL_MARKETPLACE_NAME && isPluginDirectoryModeOn()) {
    let pluginDirectoryAutoUpdate = getPluginDirectoryAutoUpdate();
    if (autoUpdate !== pluginDirectoryAutoUpdate)
      logMarketplaceNoticeOnce(
        `declared-auto-update:${name}:${pluginDirectoryAutoUpdate}:${autoUpdate}`,
        `Marketplace ${jsonStringify(name)}: autoUpdate is taken only from ${AUTOUPDATE_SETTING_SOURCES_TEXT}, which ${pluginDirectoryAutoUpdate === undefined ? "do not set it, so the default (on) applies" : `set it to ${pluginDirectoryAutoUpdate}`}. Ignored: ${autoUpdate === undefined ? "an entry in project or local settings that has no autoUpdate and would otherwise replace the entry that sets it" : `autoUpdate ${autoUpdate} in project, local or --add-dir settings`}.`,
        "debug",
      );
    return pluginDirectoryAutoUpdate;
  }
  return autoUpdate;
}
//@ chunk-5xgkngpb.js:4342080-4342137 placement
/**
 * hasDirectoryAutoUpdate：插件目录市场是否设置了 autoUpdate。
 */
function hasDirectoryAutoUpdate(name) {
  if (name === OFFICIAL_MARKETPLACE_NAME) return getPluginDirectoryAutoUpdate() !== undefined;
  return false;
}
//@ chunk-5xgkngpb.js:4342137-4342321 placement
var SETTING_SOURCE_AUTHORITY = {
  policySettings: {
    kind: "operator",
    rank: 0,
  },
  flagSettings: {
    kind: "operator",
    rank: 1,
  },
  userSettings: {
    kind: "operator",
    rank: 2,
  },
  projectSettings: {
    kind: "repo",
  },
  localSettings: {
    kind: "repo",
  },
};
//@ chunk-5xgkngpb.js:4342321-4342369 placement
function isOperatorSettingSource(source) {
  return SETTING_SOURCE_AUTHORITY[source].kind === "operator";
}
//@ chunk-5xgkngpb.js:4342369-4342456 placement
function settingSourceRank(source) {
  let authority = SETTING_SOURCE_AUTHORITY[source];
  return authority.kind === "operator" ? authority.rank : Number.MAX_SAFE_INTEGER;
}
//@ chunk-5xgkngpb.js:4342456-4342506 placement
var sorted; // deferred: uses SETTING_SOURCES (../settings/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4342456", () => {
  sorted = SETTING_SOURCES.filter(isOperatorSettingSource).sort(
    (left, right) => settingSourceRank(left) - settingSourceRank(right),
  );
});
export { sorted, getMarketplaceAutoUpdate, hasDirectoryAutoUpdate, AUTOUPDATE_SETTING_SOURCES_TEXT };
