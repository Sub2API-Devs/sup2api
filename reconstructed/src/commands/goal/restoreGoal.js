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

//@ chunk-nhtqnamp.js:385-1085 placement
/**
 * 恢复会话时从转写还原 /goal 目标与 Stop hook。
 */
function restoreGoalFromTranscript(messages, setAppState, sessionHooksRegistry, i) {
  let activeGoalCondition = findActiveGoalCondition(messages);
  let r = activeGoalCondition !== null ? getGoalBlockedReason() : null;
  let n = r?.code === "hooks_held" ? null : r;
  if (n !== null)
    logFeatureSad("goal_set", n.code, {
      origin: fromEnum("restored"),
    });
  let t;
  if (activeGoalCondition === null || n !== null) {
    setAppState((o) => {
      t = o.activeGoal;
      return o.activeGoal === undefined
        ? o
        : {
            ...o,
            activeGoal: undefined,
          };
    });
    if (t !== undefined) logGoalCleared(t, "resume_swap");
    return;
  }
  sessionHooksRegistry.add(getSessionId(), "Stop", "", getValueFromInput(activeGoalCondition));
  setAppState((o) => {
    t = o.activeGoal;
    return {
      ...o,
      activeGoal: {
        condition: activeGoalCondition,
        iterations: i?.iterations ?? 0,
        setAt: i?.setAt ?? Date.now(),
        ...(i?.lastReason !== undefined && {
          lastReason: i.lastReason,
        }),
        origin: "restored",
        tokensAtStart: getTotalOutputTokens(),
      },
    };
  });
  if (t !== undefined) logGoalCleared(t, "resume_swap");
  logEvent("tengu_goal_restored_on_resume", {
    promptLength: activeGoalCondition.length,
  });
  logEvent("tengu_stop_hook_added", {
    promptLength: activeGoalCondition.length,
    via: lit("goal"),
    origin: fromEnum("restored"),
  });
}
export { restoreGoalFromTranscript };
