/**
 * utils/pluginActivity.ts
 *
 * 2.1.316 新增：插件活动
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5xgkngpb.js:887381-887433 placement
var PLUGIN_ACTIVITY_KINDS = ["hook", "skill", "subagent", "command", "mcp"];
//@ chunk-5xgkngpb.js:887433-887472 placement
/**
 * isPluginActivityKind：是否为插件活动种类。
 */
function isPluginActivityKind(trigger) {
  return PLUGIN_ACTIVITY_KINDS.includes(trigger);
}
//@ chunk-5xgkngpb.js:887472-887491 placement
var LABEL_RESERVED_WIDTH = 30;
var MAX_ACTIVITY_NAME_LENGTH = 200;
//@ chunk-5xgkngpb.js:887491-887567 placement
/**
 * formatActivityLabel：生成活动标签。
 */
function formatActivityLabel(pluginId, reservedWidth) {
  let printableName = stripCombiningRepeated(printablePluginName(pluginId));
  let truncatedName = truncateToLength(printableName, MAX_ACTIVITY_NAME_LENGTH);
  return truncateToWidth(truncatedName, Math.max(LABEL_RESERVED_WIDTH - reservedWidth, 1));
}
//@ chunk-5xgkngpb.js:887567-888011 placement
/**
 * 插件活动标签（技能、命令、工作流、代理、钩子）。
 */
function activityLabel({ kind, name }) {
  switch (kind) {
    case "skill":
      return `${formatActivityLabel(name, bunStringWidth(" skill"))} skill`;
    case "command": {
      let reservedWidth = bunStringWidth("/") + bunStringWidth(" command");
      return `/${formatActivityLabel(name, reservedWidth)} command`;
    }
    case "workflow": {
      let reservedWidth = bunStringWidth("/") + bunStringWidth(" workflow");
      return `/${formatActivityLabel(name, reservedWidth)} workflow`;
    }
    case "agent":
      return `${formatActivityLabel(name, bunStringWidth(" agent"))} agent`;
    case "hook":
      return `${formatActivityLabel(name, bunStringWidth(" hook"))} hook`;
    case "mcp-server": {
      let serverName = parsePluginServerName(name)?.serverName ?? name;
      let mcpServerName = " MCP server";
      return `${formatActivityLabel(serverName, bunStringWidth(" MCP server"))} MCP server`;
    }
  }
}
//@ chunk-5xgkngpb.js:888011-888075 placement
function stripActivityPrefix(text, prefix) {
  return prefix && text.startsWith(prefix) ? text.slice(prefix.length) : text;
}
//@ chunk-5xgkngpb.js:888075-888304 placement
/**
 * 命令或技能的活动描述。
 */
function commandActivity(command, name) {
  let prefix =
    command.kind === "workflow" ? `${name}:` : command.name.slice(0, command.name.lastIndexOf(":") + 1);
  let displayedName = command.userFacingName?.() ?? command.name;
  let name_2 = stripActivityPrefix(displayedName, prefix);
  return {
    kind: command.kind === "workflow" ? "workflow" : command.loadedFrom === "plugin" ? "skill" : "command",
    name: name_2,
  };
}
//@ chunk-5xgkngpb.js:888304-888321 placement
/**
 * MAX_ACTIVITY_FEATURE_KEYS：活动特性键上限；MAX_RECENT_ACTIVITY：最近活动保留条数（同一声明共 2 个绑定）。
 */
var MAX_ACTIVITY_FEATURE_KEYS = 64;
var MAX_RECENT_ACTIVITY = 6;
//@ chunk-5xgkngpb.js:888321-888380 placement
function activityKey(pluginName, marketplace) {
  return `${pluginName}\x00${(marketplace ?? "").toLowerCase()}`;
}
//@ chunk-5xgkngpb.js:888380-888924 placement
/**
 * 记录插件活动（钩子、MCP）。
 */
function recordPluginActivity(pluginId, trigger, activity) {
  let pluginRegistry = getPluginRegistry();
  let { name: pluginName, marketplace } = parsePluginIdentifier(pluginId);
  if (activity.kind !== "hook" && !isOfficialOrBuiltinMarketplace(marketplace)) {
    let label = activityLabel(activity);
    let featureKey = activityKey(pluginName, marketplace);
    let filtered = (pluginRegistry.pluginActivityFeatures.get(featureKey) ?? []).filter(
      (candidateLabel) => candidateLabel !== label,
    );
    filtered.push(label);
    pluginRegistry.pluginActivityFeatures.set(featureKey, filtered.slice(-MAX_RECENT_ACTIVITY));
  }
  if (
    (trigger === "hook" || trigger === "mcp") &&
    pluginRegistry.recentActivity.some(
      (entry) => entry.trigger === trigger && entry.name === pluginName && entry.marketplace === marketplace,
    )
  )
    return;
  pluginRegistry.recentActivity.push({
    name: pluginName,
    marketplace,
    trigger,
    ts: Date.now(),
  });
  if (pluginRegistry.recentActivity.length > MAX_ACTIVITY_FEATURE_KEYS)
    pluginRegistry.recentActivity = pluginRegistry.recentActivity.slice(-MAX_ACTIVITY_FEATURE_KEYS);
  logForDebugging(`pluginActivity: recorded ${trigger} for ${pluginName}`, {
    level: "verbose",
  });
}
//@ chunk-5xgkngpb.js:888924-888995 placement
/**
 * activityFeaturesFor：取某活动的特性列表。
 */
function activityFeaturesFor(pluginName, marketplace) {
  return getPluginRegistry().pluginActivityFeatures.get(activityKey(pluginName, marketplace)) ?? [];
}
//@ chunk-5xgkngpb.js:888995-889090 placement
/**
 * drainRecentActivity：取出并清空最近活动。
 */
function drainRecentActivity(since) {
  let pluginRegistry = getPluginRegistry();
  let filtered = pluginRegistry.recentActivity.filter((entry) => entry.ts > since);
  pluginRegistry.recentActivity = [];
  return filtered;
}
export {
  recordPluginActivity,
  commandActivity,
  formatActivityLabel,
  MAX_RECENT_ACTIVITY,
  isPluginActivityKind,
  activityFeaturesFor,
  drainRecentActivity,
};
