/**
 * bridge/reportGitSessionContext.ts
 *
 * 2.1.316 新增：向桥报告 git 会话上下文。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (1)
 * attribution: placement 1
 */
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-f25sswmp.js:25602-25881 placement
function reportGitSessionContext(report) {
  if (report.branchDropped && report.warnMessage) {
    logEvent("tengu_bridge_outcome_branch_dropped", {
      reason: fromEnum(report.branchDropped),
    });
    logForDebugging(report.warnMessage, {
      level: "warn",
    });
    if (report.branchDropped === "no_evidence") console.warn(report.warnMessage);
  }
  if (report.revisionGuessUsed) logEvent("tengu_bridge_revision_guess_used", {});
}
export { reportGitSessionContext };
