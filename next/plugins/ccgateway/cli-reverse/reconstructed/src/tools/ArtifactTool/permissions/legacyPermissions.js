/**
 * tools/ArtifactTool/permissions/legacyPermissions.ts
 *
 * 2.1.316 新增：旧版权限兼容
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s321jzex.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { findUrlContentRule } from "./ruleTarget.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { formatRuleForDisplay } from "./artifactPermissionRules.js";
import { CONSENT_ASK_TAG } from "./consentStamps.js";

//@ chunk-s321jzex.js:20461-20563 placement
/**
 * 旧版权限检查中查找匹配的 url 内容 ask 规则（可先改写输入）。
 */
function legacyAskRule(context, input, ruleTargetInput) {
  let ruleInput =
    ruleTargetInput !== undefined && typeof input === "object" && input !== null
      ? ruleTargetInput(input, context)
      : input;
  return findUrlContentRule(getToolPermissionContext(context), ruleInput, "ask");
}
//@ chunk-s321jzex.js:20563-21236 placement
/**
 * 旧版 Artifact 权限检查：先查 url 内容 deny 规则（拒绝），再调用基础检查，未拒绝时查 ask 规则决定是否询问。
 */
function legacyCheckPermissions(
  toolName,
  baseCheck,
  input,
  rawInput,
  context,
  rewriteInput,
  preset = {
    deny: null,
    ask: () => null,
  },
) {
  let permissionContext = getToolPermissionContext(context);
  let ruleInput =
    rewriteInput !== undefined && typeof input === "object" && input !== null
      ? rewriteInput(input, context)
      : input;
  let denyRule = preset.deny ?? findUrlContentRule(permissionContext, ruleInput, "deny");
  if (denyRule)
    return {
      behavior: "deny",
      message: `Permission to use ${toolName} has been denied by your rule ${formatRuleForDisplay(denyRule)}.`,
      decisionReason: {
        type: "rule",
        rule: denyRule,
      },
    };
  let baseResult = baseCheck();
  let askRule =
    baseResult?.behavior === "deny"
      ? null
      : (preset.ask() ?? findUrlContentRule(permissionContext, ruleInput, "ask"));
  if (!askRule) return baseResult;
  return baseResult?.behavior === "ask"
    ? {
        ...baseResult,
        matchedAskRule: baseResult.matchedAskRule ?? askRule,
      }
    : {
        behavior: "ask",
        message: `Your ask rule ${formatRuleForDisplay(askRule)} covers this call, and its full permission check could not complete \u2014 approving covers only this call.`,
        updatedInput: {
          ...rawInput,
          [CONSENT_ASK_TAG]: false,
        },
        suppressAlwaysAllowRule: true,
        decisionReason: {
          type: "rule",
          rule: askRule,
        },
      };
}
//@ chunk-s321jzex.js:21236-21302 placement
/**
 * 取输入里的 action 字段（非字符串返回 undefined）。
 */
function actionNameOf(input) {
  let action = input?.action;
  return typeof action === "string" ? action : undefined;
}
//@ chunk-s321jzex.js:21302-21435 placement (2.1.88 match: getUpdatedInputOrFallback, 1)
function mapUpdatedInput(permissionResult, fallback) {
  if (
    permissionResult === undefined ||
    !("updatedInput" in permissionResult) ||
    permissionResult.updatedInput === undefined
  )
    return permissionResult;
  return {
    ...permissionResult,
    updatedInput: fallback(permissionResult.updatedInput),
  };
}
export { mapUpdatedInput, legacyCheckPermissions, legacyAskRule, actionNameOf };
