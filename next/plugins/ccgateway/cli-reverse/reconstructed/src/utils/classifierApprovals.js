/**
 * utils/classifierApprovals.ts
 *
 * auto 模式分类器的“检查中”标记与分类结论遥测字段。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/classifierApprovals.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { currentTurnSlot, turnFinishedSignal } from "../plugins/functionHooks/personHold.js";
import { classifierDenyKind } from "../types/permissions.js";
import { sanitizeRuleCategory } from "./permissions/permissions.js";
import { isToolDetailsLoggingEnabled } from "../services/analytics/metadata.js";

//@ chunk-5xgkngpb.js:791293-791331 fingerprint (2.1.88 match: setClassifierChecking, 0.642)
/**
 * 标记某个 tool_use 正在被分类器检查（写入 $0 集合并通知 vWe 订阅者刷新 UI）。
 */
function setClassifierChecking(toolUseID) {
  currentTurnSlot.bind(toolUseID);
  turnFinishedSignal.emit();
}
//@ chunk-5xgkngpb.js:3857167-3857488 fingerprint (2.1.88 match: setYoloClassifierApproval, 0.392)
/**
 * 由 auto-mode 分类器的 decisionReason 生成遥测字段 {classifier_verdict, classifier_category?}；用户接受时只在分类器本已放行时报 allow；类别仅在允许记录工具细节时附带。
 */
function getClassifierVerdictAnalyticsFields(decision, decisionReason) {
  if (decisionReason?.type !== "classifier" || decisionReason.classifier !== "auto-mode") return;
  if (decision === "accept")
    return decisionReason.classifierAllowed === true
      ? {
          classifier_verdict: "allow",
        }
      : undefined;
  let verdict = classifierDenyKind(decisionReason);
  if (verdict !== "block")
    return {
      classifier_verdict: verdict,
    };
  let category = sanitizeRuleCategory(decisionReason.category);
  return {
    classifier_verdict: "block",
    ...(category !== undefined &&
      isToolDetailsLoggingEnabled() && {
        classifier_category: category,
      }),
  };
}
export { getClassifierVerdictAnalyticsFields, setClassifierChecking };
