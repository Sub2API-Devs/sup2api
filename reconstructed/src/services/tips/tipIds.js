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

/**
 * 内置提示（tip）的 id 列表。
 */
//@ chunk-jv3bzw2x.js:265-844 placement
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
function u(t) {
  return BUILT_IN_TIP_IDS.includes(t);
}
/**
 * 记录提示已展示：本次启动序号写入 tipsHistory、累计展示次数加一，可记下由哪个命令触发；同一次启动重复调用不重复计数。
 */
//@ chunk-jv3bzw2x.js:879-1193 placement
function recordTipShown(t, o, n) {
  let numStartups = getGlobalConfig().numStartups;
  saveGlobalConfig((e) => {
    let s = e.tipsHistory ?? {};
    if (s[t] === numStartups) return e;
    let r = e.tipLifetimeShownCounts ?? {};
    return {
      ...e,
      tipsHistory: { ...s, [t]: numStartups },
      tipLifetimeShownCounts: { ...r, [t]: (r[t] ?? 0) + 1 },
      ...(n !== void 0 && {
        tipsHistoryByCommand: { ...e.tipsHistoryByCommand, [n]: { tipId: t, numStartups: numStartups } },
      }),
    };
  }, o);
}
//@ chunk-jv3bzw2x.js:1193-1203 placement
var g = 100;
/**
 * 若某命令是由提示引导执行的，返回打点字段：via_tip、距提示展示过了几次启动（封顶）以及（内置提示的）tip_id。
 */
//@ chunk-jv3bzw2x.js:1203-1441 placement
function getTipAttribution(t) {
  let o = getGlobalConfig(),
    n = o.tipsHistoryByCommand?.[t];
  if (typeof n !== "object" || n === null) return {};
  let i = o.numStartups - n.numStartups;
  if (!(i >= 0)) return {};
  return { via_tip: !0, tip_launches_ago: Math.min(i, g), ...(u(n.tipId) && { tip_id: fromEnum(n.tipId) }) };
}
//@ chunk-jv3bzw2x.js:1441-1500 placement
function Soe(t) {
  return getGlobalConfig().tipLifetimeShownCounts?.[t] ?? 0;
}
//@ chunk-jv3bzw2x.js:1500-1564 placement
function _1s(t) {
  return getGlobalConfig().pluginSuggestionShownCounts?.[t] ?? 0;
}
//@ chunk-jv3bzw2x.js:1651-1723 placement
function b1s(t) {
  return getGlobalConfig().pluginSuggestionDiscoverShownCounts?.[t] ?? 0;
}
/**
 * 记录插件建议在发现页已展示（每个插件计数加一，全部已展示过时不再写）。
 */
//@ chunk-jv3bzw2x.js:1723-1959 placement
function recordPluginSuggestionShown(t, o) {
  if (t.length === 0) return;
  saveGlobalConfig((n) => {
    let i = n.pluginSuggestionDiscoverShownCounts ?? {};
    if (t.every((s) => (i[s] ?? 0) > 0)) return n;
    let e = { ...i };
    for (let s of t) e[s] = (e[s] ?? 0) + 1;
    return { ...n, pluginSuggestionDiscoverShownCounts: e };
  }, o);
}

export { Soe, recordTipShown, getTipAttribution, _1s, b1s, recordPluginSuggestionShown };
