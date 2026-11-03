/**
 * utils/plugins/marketplaceAutoUpdate.ts
 *
 * 2.1.316 新增：市场自动更新
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { tryUnwrapTextPayload } from "./marketplaceManager.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { Zb, logMarketplaceNoticeOnce } from "./marketplaceSources.js";
import { QE } from "./pluginGates.js";
import { jsonStringify } from "../slowOperations.js";
import { SETTING_SOURCES } from "../settings/constants.js";

//@ chunk-e6aww6q8.js:4235057-4235114 placement
var dgn = "user settings, --settings and managed settings";
/**
 * 插件目录市场的 autoUpdate 设置。
 */
//@ chunk-e6aww6q8.js:4235114-4235157 placement = getAutoUpdateEnabledMarketplaces (1)
function getPluginDirectoryAutoUpdate() {
  return tryUnwrapTextPayload()[OFFICIAL_MARKETPLACE_NAME]?.autoUpdate;
}
/**
 * 取已声明市场的 autoUpdate。官方插件目录市场只采用受信设置层（getPluginDirectoryAutoUpdate）的值， 项目/本地/--add-dir 里的不同值被忽略并记一次调试日志。
 */
//@ chunk-e6aww6q8.js:4235157-4235647 placement
function getMarketplaceAutoUpdate(e, n) {
  let r = Zb(n, e)?.autoUpdate;
  if (e === OFFICIAL_MARKETPLACE_NAME && QE()) {
    let s = getPluginDirectoryAutoUpdate();
    if (r !== s)
      logMarketplaceNoticeOnce(
        `declared-auto-update:${e}:${s}:${r}`,
        `Marketplace ${jsonStringify(e)}: autoUpdate is taken only from ${dgn}, which ${s === void 0 ? "do not set it, so the default (on) applies" : `set it to ${s}`}. Ignored: ${r === void 0 ? "an entry in project or local settings that has no autoUpdate and would otherwise replace the entry that sets it" : `autoUpdate ${r} in project, local or --add-dir settings`}.`,
        "debug",
      );
    return s;
  }
  return r;
}
//@ chunk-e6aww6q8.js:4235647-4235704 placement
function v9s(e) {
  if (e === OFFICIAL_MARKETPLACE_NAME) return getPluginDirectoryAutoUpdate() !== void 0;
  return !1;
}
//@ chunk-e6aww6q8.js:4235704-4235888 placement
var SETTING_SOURCE_AUTHORITY = {
  policySettings: { kind: "operator", rank: 0 },
  flagSettings: { kind: "operator", rank: 1 },
  userSettings: { kind: "operator", rank: 2 },
  projectSettings: { kind: "repo" },
  localSettings: { kind: "repo" },
};
//@ chunk-e6aww6q8.js:4235888-4235936 placement
function ohs(e) {
  return SETTING_SOURCE_AUTHORITY[e].kind === "operator";
}
//@ chunk-e6aww6q8.js:4235936-4236023 placement
function x1n(e) {
  let n = SETTING_SOURCE_AUTHORITY[e];
  return n.kind === "operator" ? n.rank : Number.MAX_SAFE_INTEGER;
}
//@ chunk-e6aww6q8.js:4236023-4236073 placement
var sorted = SETTING_SOURCES.filter(ohs).sort((e, n) => x1n(e) - x1n(n));

export { getMarketplaceAutoUpdate, sorted, v9s, dgn };
