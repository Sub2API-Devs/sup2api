/**
 * utils/permissions/mcpRuleMatching.ts
 *
 * 2.1.316 新增：MCP 权限规则匹配
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRemoteBrowserToolUnderModeFloor, isRemoteBrowserModeFloorOn } from "./remoteBrowser.js";
import {
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
  mcpInfoFromString,
} from "../../services/mcp/mcpStringUtils.js";
import {
  parseRuleString,
  permissionRuleValueFromString as permissionRuleValueFromString_2,
  hasWildcard,
} from "./permissionRuleParser.js";
import { getRemoteBrowserCardRules, canonicalRuleString } from "./toolPermissionContext.js";
import { isPlanBypass } from "./browserToolNames.js";
import { isAutoClassifierActive } from "./autoModeState.js";
import { getAllowRules, toolMatchesWholeToolRule } from "./permissions.js";
import { REMOTE_BROWSER_SERVER_NAME } from "../../services/mcp/remoteBrowserServer.js";
import { filterRestrictedAllowUpdates } from "./permissionRulePayload.js";

//@ chunk-5xgkngpb.js:944408-944798 placement
/**
 * 远程浏览器工具在模式地板下被回答后，把新加入的整工具会话 allow 规则记为远程浏览器卡片回答。
 */
function recordRemoteBrowserCardAnswers(tool, previousContext, toolPermissionContext) {
  let session = toolPermissionContext.alwaysAllowRules.session;
  if (session === undefined || !isRemoteBrowserToolUnderModeFloor(tool)) return toolPermissionContext;
  let previousCounts = countRuleOccurrences(previousContext.alwaysAllowRules.session ?? []);
  let currentCounts = countRuleOccurrences(session);
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_4(tool);
  let filtered = [...currentCounts.keys()].filter((key) => {
    let ruleValue = parseRuleString(key);
    return (
      (currentCounts.get(key) ?? 0) > (previousCounts.get(key) ?? 0) &&
      ruleValue.toolName === toolNameForPermissionCheck &&
      ruleValue.ruleContent === undefined &&
      isRemoteBrowserToolName(ruleValue.toolName)
    );
  });
  if (filtered.length === 0) return toolPermissionContext;
  return {
    ...toolPermissionContext,
    remoteBrowserCardAnswers: {
      rules: new Set([
        ...getRemoteBrowserCardRules(toolPermissionContext),
        ...filtered.map(canonicalRuleString),
      ]),
      list: session,
    },
  };
}
//@ chunk-5xgkngpb.js:944798-944877 placement
function countRuleOccurrences(session) {
  let counts = new Map();
  for (let rule of session) counts.set(rule, (counts.get(rule) ?? 0) + 1);
  return counts;
}
//@ chunk-5xgkngpb.js:944877-944952 placement
function isRemoteBrowserCardRule(rule, toolPermissionContext) {
  return (
    rule.source === "session" &&
    getRemoteBrowserCardRules(toolPermissionContext).has(permissionRuleValueFromString_2(rule.ruleValue))
  );
}
//@ chunk-5xgkngpb.js:944952-945068 placement
function isAutoAllowingMode(mode, toolPermissionContext) {
  return (
    mode === "bypassPermissions" ||
    isPlanBypass(mode, toolPermissionContext.isBypassPermissionsModeAvailable) ||
    isAutoClassifierActive(mode, toolPermissionContext.servedCall === true)
  );
}
//@ chunk-5xgkngpb.js:945068-945163 placement
function isAutoAllowingAnyMode(toolPermissionContext) {
  return (
    isAutoAllowingMode(toolPermissionContext.mode, toolPermissionContext) ||
    (toolPermissionContext.modeBeforeRewrite !== undefined &&
      isAutoAllowingMode(toolPermissionContext.modeBeforeRewrite, toolPermissionContext))
  );
}
//@ chunk-5xgkngpb.js:945163-945242 placement
/**
 * shouldRelyOnModeFloorForBrowser：远程浏览器工具按模式地板处理。
 */
function shouldRelyOnModeFloorForBrowser(tool, toolPermissionContext) {
  return (
    isRemoteBrowserToolUnderModeFloor(tool) &&
    (isAutoAllowingAnyMode(toolPermissionContext) ||
      !getAllowRules(toolPermissionContext).some(
        (rule) =>
          isRemoteBrowserCardRule(rule, toolPermissionContext) && toolMatchesWholeToolRule(tool, rule),
      ))
  );
}
//@ chunk-5xgkngpb.js:945242-945281 placement
/**
 * isRemoteBrowserToolModeFloorActive：远程浏览器工具处于模式地板。
 */
function isRemoteBrowserToolModeFloorActive(tool, toolPermissionContext) {
  return isRemoteBrowserToolUnderModeFloor(tool) && isAutoAllowingAnyMode(toolPermissionContext);
}
//@ chunk-5xgkngpb.js:945281-945317 placement
/**
 * isRemoteBrowserUnderModeFloor：远程浏览器工具且模式地板开启。
 */
function isRemoteBrowserUnderModeFloor(toolName) {
  return isRemoteBrowserToolName(toolName) && isRemoteBrowserModeFloorOn();
}
//@ chunk-5xgkngpb.js:945317-945393 placement (2.1.88 match: findMcpServerConnection, 1)
/**
 * 判断工具名属于远程浏览器 MCP 服务器（服务器名等于 REMOTE_BROWSER，或通配匹配 mcp__<remote-browser>__）。
 */
function isRemoteBrowserToolName(toolName) {
  return (
    mcpInfoFromString(toolName)?.serverName === REMOTE_BROWSER_SERVER_NAME ||
    (hasWildcard(toolName) && matchesWildcardSequence(toolName, `mcp__${REMOTE_BROWSER_SERVER_NAME}__`))
  );
}
//@ chunk-5xgkngpb.js:945393-945566 placement
function matchesWildcardSequence(pattern, text) {
  let positions = expandWildcardPositions(pattern, [0]);
  for (let character of text) {
    let nextPositions = [];
    for (let position of positions)
      if (pattern[position] === "*") nextPositions.push(position);
      else if (pattern[position] === character) nextPositions.push(position + 1);
    if (nextPositions.length === 0) return false;
    positions = expandWildcardPositions(pattern, nextPositions);
  }
  return true;
}
//@ chunk-5xgkngpb.js:945566-945662 placement
function expandWildcardPositions(pattern, positions) {
  let expanded = new Set();
  for (let position of positions) {
    expanded.add(position);
    while (pattern[position] === "*") {
      position++;
      expanded.add(position);
    }
  }
  return expanded;
}
//@ chunk-5xgkngpb.js:945662-945722 placement
/**
 * filterRemoteBrowserAllowUpdates：去掉远程浏览器工具的 allow 更新。
 */
function filterRemoteBrowserAllowUpdates(updates, toolPermissionContext) {
  let filtered = filterRestrictedAllowUpdates(updates, isRemoteBrowserToolName, toolPermissionContext);
  return filtered !== updates && isRemoteBrowserModeFloorOn() ? filtered : updates;
}
export {
  isRemoteBrowserToolModeFloorActive,
  shouldRelyOnModeFloorForBrowser,
  recordRemoteBrowserCardAnswers,
  filterRemoteBrowserAllowUpdates,
  isRemoteBrowserUnderModeFloor,
};
