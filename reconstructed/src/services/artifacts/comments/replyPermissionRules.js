/**
 * services/artifacts/comments/replyPermissionRules.ts
 *
 * 2.1.316 新增：评论回复的权限规则匹配
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (10)
 * attribution: placement 10
 */
import { isVsCodeTopSession } from "../../../utils/sessionShape.js";
import { isDesktopNonClaudecode } from "../../../utils/entrypointKinds.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import {
  getContentRulesMapForToolName,
  toolMatchesRule,
  getDenyRules,
  getAskRules,
} from "../../../utils/permissions/permissions.js";
import { ARTIFACT_TOOL_NAME, ARTIFACT_COMMENTS_TOOL_NAME } from "../../../tools/ArtifactTool/constants.js";
import { matchWildcard } from "../../../utils/permissions/permissionRuleParser.js";
import { getServerUrl } from "../../../tools/ArtifactTool/permissions/ruleTarget.js";

//@ chunk-9tgt55am.js:11898-11956 placement
/**
 * 导出函数 `permissionRuleDestination`：返回 isVsCodeTopSession() || isDesktopNonClaudecode() ? "userSettings" : "session"。
 */
function permissionRuleDestination() {
  return isVsCodeTopSession() || isDesktopNonClaudecode() ? "userSettings" : "session";
}
//@ chunk-9tgt55am.js:11956-11978 placement
var ACTION_REPLY = "action:reply";
//@ chunk-9tgt55am.js:11978-12027 placement
/**
 * 导出函数 `isReplyRuleGateOn`：返回 getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_plover", !1)。
 */
function isReplyRuleGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_plover", false);
}
//@ chunk-9tgt55am.js:12027-12229 placement
/**
 * 在 Artifact 工具的 allow 规则里找允许 reply 动作的规则（功能开启、非 plan 模式且没有 deny/ask 规则命中时）。
 */
function findReplyAllowRule(toolPermissionContext, t, n) {
  if (
    !isReplyRuleGateOn() ||
    toolPermissionContext.mode === "plan" ||
    t.parsed === null ||
    hasReplyDenyOrAsk(
      toolPermissionContext,
      {
        ...t,
        parsed: t.parsed,
      },
      n,
    )
  )
    return null;
  for (let [a, r] of getContentRulesMapForToolName(toolPermissionContext, ARTIFACT_TOOL_NAME, "allow")) {
    let actionRuleContent = parseActionRuleContent(a);
    if (actionRuleContent !== null && matchWildcard(actionRuleContent, "reply")) return r;
  }
  return null;
}
//@ chunk-9tgt55am.js:12229-12499 placement
/**
 * 判断是否有 deny 或 ask 规则命中本次评论回复（按动作通配或按 artifact URL 匹配）。
 */
function hasReplyDenyOrAsk(e, t, n) {
  let { parsed } = t;
  let r = (s) => {
    if (!ARTIFACT_TOOL_RULE_TARGETS.some((y) => toolMatchesRule(e, y, s))) return false;
    let ruleContent = s.ruleValue.ruleContent;
    if (ruleContent === undefined) return true;
    let actionRuleContent = parseActionRuleContent(ruleContent);
    if (actionRuleContent !== null) return n.some((y) => matchWildcard(actionRuleContent, y));
    return getServerUrl(new Map([[ruleContent, s]]), parsed, t.rawUrl) !== null;
  };
  return getDenyRules(e).some(r) || getAskRules(e).some(r);
}
//@ chunk-9tgt55am.js:12499-12552 placement
var ARTIFACT_TOOL_RULE_TARGETS = [
  {
    name: ARTIFACT_TOOL_NAME,
  },
  {
    name: ARTIFACT_COMMENTS_TOOL_NAME,
    familyParentToolName: ARTIFACT_TOOL_NAME,
  },
];
//@ chunk-9tgt55am.js:12552-12691 placement
function parseActionRuleContent(ruleContent) {
  let index = ruleContent.indexOf(":");
  if (index <= 0) return null;
  let trimmed = ruleContent.slice(0, index).trim();
  let trimmed_2 = ruleContent.slice(index + 1).trim();
  return trimmed === "action" && trimmed_2 !== "" ? trimmed_2 : null;
}
//@ chunk-9tgt55am.js:12691-12809 placement = getDenyRuleForAgent (1)
function isArtifactActionRule(rule) {
  return (
    rule.ruleValue.toolName === ARTIFACT_TOOL_NAME &&
    rule.ruleValue.ruleContent !== undefined &&
    parseActionRuleContent(rule.ruleValue.ruleContent) !== null
  );
}
//@ chunk-9tgt55am.js:12809-12920 placement = buildSuggestions (0.854)
/**
 * Artifact 工具"回复"动作的 allow 规则建议，destination 由 ODr() 决定。
 */
function buildArtifactReplyAllowSuggestion() {
  return {
    type: "addRules",
    rules: [
      {
        toolName: ARTIFACT_TOOL_NAME,
        ruleContent: ACTION_REPLY,
      },
    ],
    behavior: "allow",
    destination: permissionRuleDestination(),
  };
}
//@ chunk-9tgt55am.js:12920-12976 placement
/**
 * 导出常量或表 `ACTIVATED_LABEL`：值为 "Claude: activated", MDr = "Claude: NOT activated"; export { ODr, findReplyAllowRule, Ezn, hasReplyDenyOrAsk, xRo, MDr, …。
 */
var ACTIVATED_LABEL = "Claude: activated";
var NOT_ACTIVATED_LABEL = "Claude: NOT activated";
export {
  permissionRuleDestination,
  findReplyAllowRule,
  isReplyRuleGateOn,
  hasReplyDenyOrAsk,
  ACTIVATED_LABEL,
  NOT_ACTIVATED_LABEL,
  buildArtifactReplyAllowSuggestion,
  isArtifactActionRule,
};
