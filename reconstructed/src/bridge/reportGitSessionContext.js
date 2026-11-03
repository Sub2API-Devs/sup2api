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
function reportGitSessionContext(e) {
  if (e.branchDropped && e.warnMessage) {
    if (
      (logEvent("tengu_bridge_outcome_branch_dropped", { reason: fromEnum(e.branchDropped) }),
      logForDebugging(e.warnMessage, { level: "warn" }),
      e.branchDropped === "no_evidence")
    )
      console.warn(e.warnMessage);
  }
  if (e.revisionGuessUsed) logEvent("tengu_bridge_revision_guess_used", {});
}

export { reportGitSessionContext };
