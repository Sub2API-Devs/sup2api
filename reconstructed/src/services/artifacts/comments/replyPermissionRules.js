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
function ODr() {
  return isVsCodeTopSession() || isDesktopNonClaudecode() ? "userSettings" : "session";
}
//@ chunk-9tgt55am.js:11956-11978 placement
var ACTION_REPLY = "action:reply";
//@ chunk-9tgt55am.js:11978-12027 placement
function Ezn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_plover", !1);
}
/**
 * 在 Artifact 工具的 allow 规则里找允许 reply 动作的规则（功能开启、非 plan 模式且没有 deny/ask 规则命中时）。
 */
//@ chunk-9tgt55am.js:12027-12229 placement
function findReplyAllowRule(e, t, n) {
  if (!Ezn() || e.mode === "plan" || t.parsed === null || hasReplyDenyOrAsk(e, { ...t, parsed: t.parsed }, n))
    return null;
  for (let [a, r] of getContentRulesMapForToolName(e, ARTIFACT_TOOL_NAME, "allow")) {
    let s = parseActionRuleContent(a);
    if (s !== null && matchWildcard(s, "reply")) return r;
  }
  return null;
}
/**
 * 判断是否有 deny 或 ask 规则命中本次评论回复（按动作通配或按 artifact URL 匹配）。
 */
//@ chunk-9tgt55am.js:12229-12499 placement
function hasReplyDenyOrAsk(e, t, n) {
  let { parsed: parsed } = t,
    r = (s) => {
      if (!yi.some((y) => toolMatchesRule(e, y, s))) return !1;
      let ruleContent = s.ruleValue.ruleContent;
      if (ruleContent === void 0) return !0;
      let h = parseActionRuleContent(ruleContent);
      if (h !== null) return n.some((y) => matchWildcard(h, y));
      return getServerUrl(new Map([[ruleContent, s]]), parsed, t.rawUrl) !== null;
    };
  return getDenyRules(e).some(r) || getAskRules(e).some(r);
}
//@ chunk-9tgt55am.js:12499-12552 placement
var yi = [
  { name: ARTIFACT_TOOL_NAME },
  { name: ARTIFACT_COMMENTS_TOOL_NAME, familyParentToolName: ARTIFACT_TOOL_NAME },
];
//@ chunk-9tgt55am.js:12552-12691 placement
function parseActionRuleContent(e) {
  let index = e.indexOf(":");
  if (index <= 0) return null;
  let trimmed = e.slice(0, index).trim(),
    trimmed_2 = e.slice(index + 1).trim();
  return trimmed === "action" && trimmed_2 !== "" ? trimmed_2 : null;
}
//@ chunk-9tgt55am.js:12691-12809 placement = getDenyRuleForAgent (1)
function isArtifactActionRule(e) {
  return (
    e.ruleValue.toolName === ARTIFACT_TOOL_NAME &&
    e.ruleValue.ruleContent !== void 0 &&
    parseActionRuleContent(e.ruleValue.ruleContent) !== null
  );
}
/**
 * Artifact 工具"回复"动作的 allow 规则建议，destination 由 ODr() 决定。
 */
//@ chunk-9tgt55am.js:12809-12920 placement = buildSuggestions (0.854)
function buildArtifactReplyAllowSuggestion() {
  return {
    type: "addRules",
    rules: [{ toolName: ARTIFACT_TOOL_NAME, ruleContent: ACTION_REPLY }],
    behavior: "allow",
    destination: ODr(),
  };
}
//@ chunk-9tgt55am.js:12920-12976 placement
var xRo = "Claude: activated",
  MDr = "Claude: NOT activated";

export {
  ODr,
  findReplyAllowRule,
  Ezn,
  hasReplyDenyOrAsk,
  xRo,
  MDr,
  buildArtifactReplyAllowSuggestion,
  isArtifactActionRule,
};
