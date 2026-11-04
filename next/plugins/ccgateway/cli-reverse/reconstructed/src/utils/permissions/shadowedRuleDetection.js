/**
 * utils/permissions/shadowedRuleDetection.ts
 *
 * 检测被整工具 deny/ask 规则遮蔽的不可达 allow 规则并给出修复建议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/shadowedRuleDetection.ts
 * pieces: chunk-p2qwpk2k.js (6)
 * attribution: fingerprint 5, file-last-pair 1
 */
import {
  permissionRuleSourceDisplayString,
  getAllowRules,
  getAskRules,
  getDenyRules,
} from "./permissions.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";

//@ chunk-p2qwpk2k.js:20259-20340 fingerprint (2.1.88 match: isSharedSettingSource, 1)
function isSharedSettingSource(source) {
  return source === "projectSettings" || source === "policySettings" || source === "command";
}
//@ chunk-p2qwpk2k.js:20340-20369 file-last-pair
function formatSource(source) {
  return permissionRuleSourceDisplayString(source);
}
//@ chunk-p2qwpk2k.js:20369-20640 fingerprint (2.1.88 match: generateFixSuggestion, 1)
function generateFixSuggestion(shadowType, shadowingRule, shadowedRule) {
  let shadowingSource = formatSource(shadowingRule.source);
  let shadowedSource = formatSource(shadowedRule.source);
  let toolName = shadowingRule.ruleValue.toolName;
  if (shadowType === "deny")
    return `Remove the "${toolName}" deny rule from ${shadowingSource}, or remove the specific allow rule from ${shadowedSource}`;
  return `Remove the "${toolName}" ask rule from ${shadowingSource}, or remove the specific allow rule from ${shadowedSource}`;
}
//@ chunk-p2qwpk2k.js:20640-20964 fingerprint (2.1.88 match: isAllowRuleShadowedByAskRule, 1)
/**
 * 带内容 allow 规则是否被同工具整工具 ask 规则遮蔽；沙箱自动放行时只认 projectSettings/policySettings/command 来源的 ask。
 */
function isAllowRuleShadowedByAskRule(allowRule, askRules, options) {
  let { toolName, ruleContent } = allowRule.ruleValue;
  if (ruleContent === undefined)
    return {
      shadowed: false,
    };
  let shadowingAskRule = askRules.find(
    (askRule) => askRule.ruleValue.toolName === toolName && askRule.ruleValue.ruleContent === undefined,
  );
  if (!shadowingAskRule)
    return {
      shadowed: false,
    };
  if (toolName === BASH_TOOL_NAME && options.sandboxAutoAllowEnabled) {
    if (!isSharedSettingSource(shadowingAskRule.source))
      return {
        shadowed: false,
      };
  }
  return {
    shadowed: true,
    shadowedBy: shadowingAskRule,
    shadowType: "ask",
  };
}
//@ chunk-p2qwpk2k.js:20964-21212 fingerprint (2.1.88 match: isAllowRuleShadowedByDenyRule, 1)
function isAllowRuleShadowedByDenyRule(allowRule, denyRules) {
  let { toolName, ruleContent } = allowRule.ruleValue;
  if (ruleContent === undefined)
    return {
      shadowed: false,
    };
  let shadowingDenyRule = denyRules.find(
    (denyRule) => denyRule.ruleValue.toolName === toolName && denyRule.ruleValue.ruleContent === undefined,
  );
  if (!shadowingDenyRule)
    return {
      shadowed: false,
    };
  return {
    shadowed: true,
    shadowedBy: shadowingDenyRule,
    shadowType: "deny",
  };
}
//@ chunk-p2qwpk2k.js:21212-21751 fingerprint (2.1.88 match: detectUnreachableRules, 1)
/**
 * 检测不可达的 allow 规则：带内容的 allow 规则若同工具存在整工具 deny（被拦）或整工具 ask（被遮蔽；Bash 在沙箱自动放行开启时只有共享来源的 ask 才算）则列出，附原因和修复建议。
 */
function detectUnreachableRules(context, options) {
  let unreachable = [];
  let allowRules = getAllowRules(context);
  let askRules = getAskRules(context);
  let denyRules = getDenyRules(context);
  for (let allowRule of allowRules) {
    let denyResult = isAllowRuleShadowedByDenyRule(allowRule, denyRules);
    if (denyResult.shadowed) {
      let shadowSource = formatSource(denyResult.shadowedBy.source);
      unreachable.push({
        rule: allowRule,
        reason: `Blocked by "${denyResult.shadowedBy.ruleValue.toolName}" deny rule (from ${shadowSource})`,
        shadowedBy: denyResult.shadowedBy,
        shadowType: "deny",
        fix: generateFixSuggestion("deny", denyResult.shadowedBy, allowRule),
      });
      continue;
    }
    let askResult = isAllowRuleShadowedByAskRule(allowRule, askRules, options);
    if (askResult.shadowed) {
      let shadowSource = formatSource(askResult.shadowedBy.source);
      unreachable.push({
        rule: allowRule,
        reason: `Shadowed by "${askResult.shadowedBy.ruleValue.toolName}" ask rule (from ${shadowSource})`,
        shadowedBy: askResult.shadowedBy,
        shadowType: "ask",
        fix: generateFixSuggestion("ask", askResult.shadowedBy, allowRule),
      });
    }
  }
  return unreachable;
}
export { detectUnreachableRules };
