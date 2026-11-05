/**
 * services/artifacts/comments/replyPermissionRules.ts
 *
 * 2.1.316 新增：评论回复的权限规则匹配
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c0pq6qyx.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isVsCodeTopSession } from "../../../utils/sessionShape.js";
import { isDesktopNonClaudecode } from "../../../utils/entrypointKinds.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import {
  getContentRulesMapForToolName,
  toolMatchesRule,
  deniedBashRules,
  askedBashRules,
} from "../../../utils/permissions/permissions.js";
import { ARTIFACT_TOOL_NAME, ARTIFACT_COMMENTS_TOOL_NAME } from "../../../tools/ArtifactTool/constants.js";
import { matchWildcard } from "../../../utils/permissions/permissionRuleParser.js";
import { getServerUrl } from "../../../tools/ArtifactTool/permissions/ruleTarget.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-c0pq6qyx.js:12012-12070 placement
/**
 * 导出函数 `permissionRuleDestination`：返回 isVsCodeTopSession() || isDesktopNonClaudecode() ? "userSettings" : "session"。
 */
function permissionRuleDestination() {
  return isVsCodeTopSession() || isDesktopNonClaudecode() ? "userSettings" : "session";
}
//@ chunk-c0pq6qyx.js:12070-12092 placement
var ACTION_REPLY = "action:reply";
//@ chunk-c0pq6qyx.js:12092-12141 placement
/**
 * 导出函数 `isReplyRuleGateOn`：返回 getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_plover", !1)。
 */
function isReplyRuleGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_plover", false);
}
//@ chunk-c0pq6qyx.js:12141-12343 placement
/**
 * 在 Artifact 工具的 allow 规则里找允许 reply 动作的规则（功能开启、非 plan 模式且没有 deny/ask 规则命中时）。
 */
function findReplyAllowRule(toolPermissionContext, request, replyActions) {
  if (
    !isReplyRuleGateOn() ||
    toolPermissionContext.mode === "plan" ||
    request.parsed === null ||
    hasReplyDenyOrAsk(
      toolPermissionContext,
      {
        ...request,
        parsed: request.parsed,
      },
      replyActions,
    )
  )
    return null;
  for (let [ruleContent, rule] of getContentRulesMapForToolName(
    toolPermissionContext,
    ARTIFACT_TOOL_NAME,
    "allow",
  )) {
    let actionRuleContent = parseActionRuleContent(ruleContent);
    if (actionRuleContent !== null && matchWildcard(actionRuleContent, "reply")) return rule;
  }
  return null;
}
//@ chunk-c0pq6qyx.js:12343-12613 placement
/**
 * 判断是否有 deny 或 ask 规则命中本次评论回复（按动作通配或按 artifact URL 匹配）。
 */
function hasReplyDenyOrAsk(toolPermissionContext, request, replyActions) {
  let { parsed } = request;
  let matchesDenyOrAsk = (rule) => {
    if (!ARTIFACT_TOOL_RULE_TARGETS.some((target) => toolMatchesRule(toolPermissionContext, target, rule)))
      return false;
    let ruleContent = rule.ruleValue.ruleContent;
    if (ruleContent === undefined) return true;
    let actionRuleContent = parseActionRuleContent(ruleContent);
    if (actionRuleContent !== null)
      return replyActions.some((action) => matchWildcard(actionRuleContent, action));
    return getServerUrl(new Map([[ruleContent, rule]]), parsed, request.rawUrl) !== null;
  };
  return (
    deniedBashRules(toolPermissionContext).some(matchesDenyOrAsk) ||
    askedBashRules(toolPermissionContext).some(matchesDenyOrAsk)
  );
}
//@ chunk-c0pq6qyx.js:12613-12666 placement
var ARTIFACT_TOOL_RULE_TARGETS; // deferred: uses ARTIFACT_TOOL_NAME (../../../tools/ArtifactTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c0pq6qyx.js:12613", () => {
  ARTIFACT_TOOL_RULE_TARGETS = [
    {
      name: ARTIFACT_TOOL_NAME,
    },
    {
      name: ARTIFACT_COMMENTS_TOOL_NAME,
      familyParentToolName: ARTIFACT_TOOL_NAME,
    },
  ];
});
//@ chunk-c0pq6qyx.js:12666-12805 placement
function parseActionRuleContent(ruleContent) {
  let index = ruleContent.indexOf(":");
  if (index <= 0) return null;
  let trimmed = ruleContent.slice(0, index).trim();
  let trimmed_2 = ruleContent.slice(index + 1).trim();
  return trimmed === "action" && trimmed_2 !== "" ? trimmed_2 : null;
}
//@ chunk-c0pq6qyx.js:12805-12923 placement (2.1.88 match: getDenyRuleForAgent, 1)
function isArtifactActionRule(rule) {
  return (
    rule.ruleValue.toolName === ARTIFACT_TOOL_NAME &&
    rule.ruleValue.ruleContent !== undefined &&
    parseActionRuleContent(rule.ruleValue.ruleContent) !== null
  );
}
//@ chunk-c0pq6qyx.js:12923-13034 placement (2.1.88 match: buildSuggestions, 0.853)
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
//@ chunk-c0pq6qyx.js:13034-13090 placement
/**
 * 导出常量或表 `ACTIVATED_LABEL`：值为 "Claude: activated", MDr = "Claude: NOT activated"; export { ODr, findReplyAllowRule, Ezn, hasReplyDenyOrAsk, xRo, MDr, …。
 */
var ACTIVATED_LABEL = "Claude: activated";
var NOT_ACTIVATED_LABEL = "Claude: NOT activated";
export {
  ACTIVATED_LABEL,
  NOT_ACTIVATED_LABEL,
  isArtifactActionRule,
  permissionRuleDestination,
  findReplyAllowRule,
  isReplyRuleGateOn,
  hasReplyDenyOrAsk,
  buildArtifactReplyAllowSuggestion,
};
