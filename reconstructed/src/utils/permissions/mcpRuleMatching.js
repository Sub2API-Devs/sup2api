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
import { getRemoteBrowserCardRules, j7o } from "./toolPermissionContext.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { isPlanBypass } from "./browserToolNames.js";
import { isAutoClassifierActive } from "./autoModeState.js";
import { getAllowRules, toolMatchesWholeToolRule } from "./permissions.js";
import { REMOTE_BROWSER_SERVER_NAME } from "../../services/mcp/remoteBrowserServer.js";
import { filterRestrictedAllowUpdates } from "./permissionRulePayload.js";

/**
 * 远程浏览器工具在模式地板下被回答后，把新加入的整工具会话 allow 规则记为远程浏览器卡片回答。
 */
//@ chunk-e6aww6q8.js:933213-933603 placement
function recordRemoteBrowserCardAnswers(e, n, r) {
  let session = r.alwaysAllowRules.session;
  if (session === void 0 || !isRemoteBrowserToolUnderModeFloor(e)) return r;
  let h = dUt(n.alwaysAllowRules.session ?? []),
    y = dUt(session),
    S = getToolNameForPermissionCheck_4(e),
    filtered = [...y.keys()].filter((L) => {
      let G = permissionRuleValueFromString(L);
      return (
        (y.get(L) ?? 0) > (h.get(L) ?? 0) &&
        G.toolName === S &&
        G.ruleContent === void 0 &&
        isRemoteBrowserToolName(G.toolName)
      );
    });
  if (filtered.length === 0) return r;
  return {
    ...r,
    remoteBrowserCardAnswers: {
      rules: new Set([...getRemoteBrowserCardRules(r), ...filtered.map(j7o)]),
      list: session,
    },
  };
}
//@ chunk-e6aww6q8.js:933603-933682 placement
function dUt(e) {
  let n = new Map();
  for (let r of e) n.set(r, (n.get(r) ?? 0) + 1);
  return n;
}
//@ chunk-e6aww6q8.js:933682-933757 placement
function XAo(e, n) {
  return e.source === "session" && getRemoteBrowserCardRules(n).has(formatPermissionRule(e.ruleValue));
}
//@ chunk-e6aww6q8.js:933757-933873 placement
function isAutoAllowingMode(e, n) {
  return (
    e === "bypassPermissions" ||
    isPlanBypass(e, n.isBypassPermissionsModeAvailable) ||
    isAutoClassifierActive(e, n.servedCall === !0)
  );
}
//@ chunk-e6aww6q8.js:933873-933968 placement
function fUt(e) {
  return (
    isAutoAllowingMode(e.mode, e) ||
    (e.modeBeforeRewrite !== void 0 && isAutoAllowingMode(e.modeBeforeRewrite, e))
  );
}
//@ chunk-e6aww6q8.js:933968-934047 placement
function pUt(e, n) {
  return (
    isRemoteBrowserToolUnderModeFloor(e) &&
    (fUt(n) || !getAllowRules(n).some((r) => XAo(r, n) && toolMatchesWholeToolRule(e, r)))
  );
}
//@ chunk-e6aww6q8.js:934047-934086 placement
function B1e(e, n) {
  return isRemoteBrowserToolUnderModeFloor(e) && fUt(n);
}
//@ chunk-e6aww6q8.js:934086-934122 placement
function a4s(e) {
  return isRemoteBrowserToolName(e) && isRemoteBrowserModeFloorOn();
}
/**
 * 判断工具名属于远程浏览器 MCP 服务器（服务器名等于 REMOTE_BROWSER，或通配匹配 mcp__<remote-browser>__）。
 */
//@ chunk-e6aww6q8.js:934122-934198 placement = findMcpServerConnection (1)
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
    if (h.length === 0) return !1;
    r = expandWildcardPositions(e, h);
  }
  return !0;
}
//@ chunk-e6aww6q8.js:934371-934467 placement
function expandWildcardPositions(e, n) {
  let r = new Set();
  for (let s of n) {
    r.add(s);
    while (e[s] === "*") (s++, r.add(s));
  }
  return r;
}
//@ chunk-e6aww6q8.js:934467-934527 placement
function mUt(e, n) {
  let r = filterRestrictedAllowUpdates(e, isRemoteBrowserToolName, n);
  return r !== e && isRemoteBrowserModeFloorOn() ? r : e;
}

export { B1e, pUt, mUt, recordRemoteBrowserCardAnswers, a4s };
