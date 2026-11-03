/**
 * utils/permissions/mcpRuleMatching.ts
 *
 * 2.1.316 新增：MCP 权限规则匹配
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { isRemoteBrowserToolUnderModeFloor, isRemoteBrowserModeFloorOn } from "./remoteBrowser.js";
import {
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
  mcpInfoFromString,
} from "../../services/mcp/mcpStringUtils.js";
import { permissionRuleValueFromString, hasWildcard } from "./permissionRuleParser.js";
import { getRemoteBrowserCardRules, canonicalRuleString } from "./toolPermissionContext.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { isPlanBypass } from "./browserToolNames.js";
import { isAutoClassifierActive } from "./autoModeState.js";
import { getAllowRules, toolMatchesWholeToolRule } from "./permissions.js";
import { REMOTE_BROWSER_SERVER_NAME } from "../../services/mcp/remoteBrowserServer.js";
import { filterRestrictedAllowUpdates } from "./permissionRulePayload.js";

//@ chunk-e6aww6q8.js:933213-933603 placement
/**
 * 远程浏览器工具在模式地板下被回答后，把新加入的整工具会话 allow 规则记为远程浏览器卡片回答。
 */
function recordRemoteBrowserCardAnswers(e, n, r) {
  let session = r.alwaysAllowRules.session;
  if (session === undefined || !isRemoteBrowserToolUnderModeFloor(e)) return r;
  let h = countRuleOccurrences(n.alwaysAllowRules.session ?? []);
  let y = countRuleOccurrences(session);
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_4(e);
  let filtered = [...y.keys()].filter((key) => {
    let G = permissionRuleValueFromString(key);
    return (
      (y.get(key) ?? 0) > (h.get(key) ?? 0) &&
      G.toolName === toolNameForPermissionCheck &&
      G.ruleContent === undefined &&
      isRemoteBrowserToolName(G.toolName)
    );
  });
  if (filtered.length === 0) return r;
  return {
    ...r,
    remoteBrowserCardAnswers: {
      rules: new Set([...getRemoteBrowserCardRules(r), ...filtered.map(canonicalRuleString)]),
      list: session,
    },
  };
}
//@ chunk-e6aww6q8.js:933603-933682 placement
function countRuleOccurrences(session) {
  let n = new Map();
  for (let r of session) n.set(r, (n.get(r) ?? 0) + 1);
  return n;
}
//@ chunk-e6aww6q8.js:933682-933757 placement
function isRemoteBrowserCardRule(e, n) {
  return e.source === "session" && getRemoteBrowserCardRules(n).has(formatPermissionRule(e.ruleValue));
}
//@ chunk-e6aww6q8.js:933757-933873 placement
function isAutoAllowingMode(e, n) {
  return (
    e === "bypassPermissions" ||
    isPlanBypass(e, n.isBypassPermissionsModeAvailable) ||
    isAutoClassifierActive(e, n.servedCall === true)
  );
}
//@ chunk-e6aww6q8.js:933873-933968 placement
function isAutoAllowingAnyMode(e) {
  return (
    isAutoAllowingMode(e.mode, e) ||
    (e.modeBeforeRewrite !== undefined && isAutoAllowingMode(e.modeBeforeRewrite, e))
  );
}
//@ chunk-e6aww6q8.js:933968-934047 placement
/**
 * shouldRelyOnModeFloorForBrowser：远程浏览器工具按模式地板处理。
 */
function shouldRelyOnModeFloorForBrowser(tool, toolPermissionContext) {
  return (
    isRemoteBrowserToolUnderModeFloor(tool) &&
    (isAutoAllowingAnyMode(toolPermissionContext) ||
      !getAllowRules(toolPermissionContext).some(
        (r) => isRemoteBrowserCardRule(r, toolPermissionContext) && toolMatchesWholeToolRule(tool, r),
      ))
  );
}
//@ chunk-e6aww6q8.js:934047-934086 placement
/**
 * isRemoteBrowserToolModeFloorActive：远程浏览器工具处于模式地板。
 */
function isRemoteBrowserToolModeFloorActive(e, toolPermissionContext) {
  return isRemoteBrowserToolUnderModeFloor(e) && isAutoAllowingAnyMode(toolPermissionContext);
}
//@ chunk-e6aww6q8.js:934086-934122 placement
/**
 * isRemoteBrowserUnderModeFloor：远程浏览器工具且模式地板开启。
 */
function isRemoteBrowserUnderModeFloor(toolName) {
  return isRemoteBrowserToolName(toolName) && isRemoteBrowserModeFloorOn();
}
//@ chunk-e6aww6q8.js:934122-934198 placement = findMcpServerConnection (1)
/**
 * 判断工具名属于远程浏览器 MCP 服务器（服务器名等于 REMOTE_BROWSER，或通配匹配 mcp__<remote-browser>__）。
 */
function isRemoteBrowserToolName(e) {
  return (
    mcpInfoFromString(e)?.serverName === REMOTE_BROWSER_SERVER_NAME ||
    (hasWildcard(e) && matchesWildcardSequence(e, `mcp__${REMOTE_BROWSER_SERVER_NAME}__`))
  );
}
//@ chunk-e6aww6q8.js:934198-934371 placement
function matchesWildcardSequence(e, n) {
  let r = expandWildcardPositions(e, [0]);
  for (let s of n) {
    let h = [];
    for (let y of r)
      if (e[y] === "*") h.push(y);
      else if (e[y] === s) h.push(y + 1);
    if (h.length === 0) return false;
    r = expandWildcardPositions(e, h);
  }
  return true;
}
//@ chunk-e6aww6q8.js:934371-934467 placement
function expandWildcardPositions(e, n) {
  let r = new Set();
  for (let s of n) {
    r.add(s);
    while (e[s] === "*") {
      s++;
      r.add(s);
    }
  }
  return r;
}
//@ chunk-e6aww6q8.js:934467-934527 placement
/**
 * filterRemoteBrowserAllowUpdates：去掉远程浏览器工具的 allow 更新。
 */
function filterRemoteBrowserAllowUpdates(updatedPermissions, n) {
  let r = filterRestrictedAllowUpdates(updatedPermissions, isRemoteBrowserToolName, n);
  return r !== updatedPermissions && isRemoteBrowserModeFloorOn() ? r : updatedPermissions;
}
export {
  isRemoteBrowserToolModeFloorActive,
  shouldRelyOnModeFloorForBrowser,
  filterRemoteBrowserAllowUpdates,
  recordRemoteBrowserCardAnswers,
  isRemoteBrowserUnderModeFloor,
};
