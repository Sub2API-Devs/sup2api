/**
 * utils/pluginActivity.ts
 *
 * 2.1.316 新增：插件活动
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { stripCombiningRepeated } from "./sanitization.js";
import { printablePluginName } from "../components/ManagedSettingsSecurityDialog/utils.js";
import { truncateToLength } from "./stringUtils.js";
import { truncateToWidth } from "./format.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { parsePluginServerName } from "./plugins/lspPluginIntegration.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { parsePluginIdentifier, isOfficialOrBuiltinMarketplace } from "./plugins/pluginIdentifier.js";
import { logForDebugging } from "./debug.js";

//@ chunk-e6aww6q8.js:876906-876958 placement
var PLUGIN_ACTIVITY_KINDS = ["hook", "skill", "subagent", "command", "mcp"];
//@ chunk-e6aww6q8.js:876958-876997 placement
/**
 * isPluginActivityKind：是否为插件活动种类。
 */
function isPluginActivityKind(trigger) {
  return PLUGIN_ACTIVITY_KINDS.includes(trigger);
}
//@ chunk-e6aww6q8.js:876997-877016 placement
var LABEL_RESERVED_WIDTH = 30;
var MAX_ACTIVITY_NAME_LENGTH = 200;
//@ chunk-e6aww6q8.js:877016-877093 placement
/**
 * formatActivityLabel：生成活动标签。
 */
function formatActivityLabel(e, n) {
  let r = stripCombiningRepeated(printablePluginName(e));
  let s = truncateToLength(r, MAX_ACTIVITY_NAME_LENGTH);
  return truncateToWidth(s, Math.max(LABEL_RESERVED_WIDTH - n, 1));
}
//@ chunk-e6aww6q8.js:877093-877537 placement
/**
 * 插件活动标签（技能、命令、工作流、代理、钩子）。
 */
function activityLabel({ kind, name: n }) {
  switch (kind) {
    case "skill":
      return `${formatActivityLabel(n, bunStringWidth(" skill"))} skill`;
    case "command": {
      let h = bunStringWidth("/") + bunStringWidth(" command");
      return `/${formatActivityLabel(n, h)} command`;
    }
    case "workflow": {
      let h = bunStringWidth("/") + bunStringWidth(" workflow");
      return `/${formatActivityLabel(n, h)} workflow`;
    }
    case "agent":
      return `${formatActivityLabel(n, bunStringWidth(" agent"))} agent`;
    case "hook":
      return `${formatActivityLabel(n, bunStringWidth(" hook"))} hook`;
    case "mcp-server": {
      let serverName = parsePluginServerName(n)?.serverName ?? n;
      let s = " MCP server";
      return `${formatActivityLabel(serverName, bunStringWidth(" MCP server"))} MCP server`;
    }
  }
}
//@ chunk-e6aww6q8.js:877537-877601 placement
function stripActivityPrefix(e, n) {
  return n && e.startsWith(n) ? e.slice(n.length) : e;
}
//@ chunk-e6aww6q8.js:877601-877830 placement
/**
 * 命令或技能的活动描述。
 */
function commandActivity(command, name) {
  let r = command.kind === "workflow" ? `${name}:` : command.name.slice(0, command.name.lastIndexOf(":") + 1);
  let s = command.userFacingName?.() ?? command.name;
  let name_2 = stripActivityPrefix(s, r);
  return {
    kind: command.kind === "workflow" ? "workflow" : command.loadedFrom === "plugin" ? "skill" : "command",
    name: name_2,
  };
}
//@ chunk-e6aww6q8.js:877830-877847 placement
/**
 * MAX_ACTIVITY_FEATURE_KEYS：活动特性键上限；MAX_RECENT_ACTIVITY：最近活动保留条数（同一声明共 2 个绑定）。
 */
var MAX_ACTIVITY_FEATURE_KEYS = 64;
var MAX_RECENT_ACTIVITY = 6;
//@ chunk-e6aww6q8.js:877847-877906 placement
function activityKey(e, n) {
  return `${e}\x00${(n ?? "").toLowerCase()}`;
}
//@ chunk-e6aww6q8.js:877906-878450 placement
/**
 * 记录插件活动（钩子、MCP）。
 */
function recordPluginActivity(e, n, r) {
  let pluginRegistry = getPluginRegistry();
  let { name: h, marketplace } = parsePluginIdentifier(e);
  if (r.kind !== "hook" && !isOfficialOrBuiltinMarketplace(marketplace)) {
    let S = activityLabel(r);
    let w = activityKey(h, marketplace);
    let filtered = (pluginRegistry.pluginActivityFeatures.get(w) ?? []).filter((q) => q !== S);
    filtered.push(S);
    pluginRegistry.pluginActivityFeatures.set(w, filtered.slice(-MAX_RECENT_ACTIVITY));
  }
  if (
    (n === "hook" || n === "mcp") &&
    pluginRegistry.recentActivity.some(
      (S) => S.trigger === n && S.name === h && S.marketplace === marketplace,
    )
  )
    return;
  pluginRegistry.recentActivity.push({
    name: h,
    marketplace,
    trigger: n,
    ts: Date.now(),
  });
  if (pluginRegistry.recentActivity.length > MAX_ACTIVITY_FEATURE_KEYS)
    pluginRegistry.recentActivity = pluginRegistry.recentActivity.slice(-MAX_ACTIVITY_FEATURE_KEYS);
  logForDebugging(`pluginActivity: recorded ${n} for ${h}`, {
    level: "verbose",
  });
}
//@ chunk-e6aww6q8.js:878450-878521 placement
/**
 * activityFeaturesFor：取某活动的特性列表。
 */
function activityFeaturesFor(name, marketplace) {
  return getPluginRegistry().pluginActivityFeatures.get(activityKey(name, marketplace)) ?? [];
}
//@ chunk-e6aww6q8.js:878521-878616 placement
/**
 * drainRecentActivity：取出并清空最近活动。
 */
function drainRecentActivity(e) {
  let pluginRegistry = getPluginRegistry();
  let filtered = pluginRegistry.recentActivity.filter((s) => s.ts > e);
  pluginRegistry.recentActivity = [];
  return filtered;
}
export {
  recordPluginActivity,
  formatActivityLabel,
  MAX_RECENT_ACTIVITY,
  isPluginActivityKind,
  activityFeaturesFor,
  drainRecentActivity,
  commandActivity,
};
