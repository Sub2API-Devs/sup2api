/**
 * utils/classifierApprovals.ts
 *
 * auto 模式分类器的“检查中”标记与分类结论遥测字段。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/classifierApprovals.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: fingerprint 2
 */
import { $0, vWe } from "../plugins/functionHooks/personHold.js";
import { classifierDenyKind } from "../types/permissions.js";
import { AL } from "./permissions/permissions.js";
import { isToolDetailsLoggingEnabled } from "../services/analytics/metadata.js";

/**
 * 标记某个 tool_use 正在被分类器检查（写入 $0 集合并通知 vWe 订阅者刷新 UI）。
 */
//@ chunk-e6aww6q8.js:780189-780227 fingerprint = setClassifierChecking (0.643)
function setClassifierChecking(toolUseID) {
  ($0.bind(toolUseID), vWe.emit());
}
/**
 * 由 auto-mode 分类器的 decisionReason 生成遥测字段 {classifier_verdict, classifier_category?}；用户接受时只在分类器本已放行时报 allow；类别仅在允许记录工具细节时附带。
 */
//@ chunk-e6aww6q8.js:3761383-3761704 fingerprint = setYoloClassifierApproval (0.39)
function getClassifierVerdictAnalyticsFields(decision, decisionReason) {
  if (decisionReason?.type !== "classifier" || decisionReason.classifier !== "auto-mode") return;
  if (decision === "accept")
    return decisionReason.classifierAllowed === !0 ? { classifier_verdict: "allow" } : void 0;
  let verdict = classifierDenyKind(decisionReason);
  if (verdict !== "block") return { classifier_verdict: verdict };
  let category = AL(decisionReason.category);
  return {
    classifier_verdict: "block",
    ...(category !== void 0 && isToolDetailsLoggingEnabled() && { classifier_category: category }),
  };
}

export { setClassifierChecking, getClassifierVerdictAnalyticsFields };
