/**
 * commands/goal/restoreGoal.ts
 *
 * 2.1.316 新增。恢复会话时从转写还原 /goal 目标与 Stop hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nhtqnamp.js (1)
 * attribution: placement 1
 */
import { findActiveGoalCondition, getGoalBlockedReason, logGoalCleared, getValueFromInput } from "./goal.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { getSessionId, getTotalOutputTokens } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";

/**
 * 恢复会话时从转写还原 /goal 目标与 Stop hook。
 */
//@ chunk-nhtqnamp.js:385-1085 placement
function restoreGoalFromTranscript(l, s, d, i) {
  let e = findActiveGoalCondition(l),
    r = e !== null ? getGoalBlockedReason() : null,
    n = r?.code === "hooks_held" ? null : r;
  if (n !== null) logFeatureSad("goal_set", n.code, { origin: fromEnum("restored") });
  let t;
  if (e === null || n !== null) {
    if (
      (s((o) => ((t = o.activeGoal), o.activeGoal === void 0 ? o : { ...o, activeGoal: void 0 })),
      t !== void 0)
    )
      logGoalCleared(t, "resume_swap");
    return;
  }
  if (
    (d.add(getSessionId(), "Stop", "", getValueFromInput(e)),
    s(
      (o) => (
        (t = o.activeGoal),
        {
          ...o,
          activeGoal: {
            condition: e,
            iterations: i?.iterations ?? 0,
            setAt: i?.setAt ?? Date.now(),
            ...(i?.lastReason !== void 0 && { lastReason: i.lastReason }),
            origin: "restored",
            tokensAtStart: getTotalOutputTokens(),
          },
        }
      ),
    ),
    t !== void 0)
  )
    logGoalCleared(t, "resume_swap");
  (logEvent("tengu_goal_restored_on_resume", { promptLength: e.length }),
    logEvent("tengu_stop_hook_added", {
      promptLength: e.length,
      via: lit("goal"),
      origin: fromEnum("restored"),
    }));
}

export { restoreGoalFromTranscript };
