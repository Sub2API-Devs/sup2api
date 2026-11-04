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
function restoreGoalFromTranscript(messages, setAppState, sessionHooksRegistry, hooks) {
  let activeGoalCondition = findActiveGoalCondition(messages);
  let blocked = activeGoalCondition !== null ? getGoalBlockedReason() : null;
  let reason = blocked?.code === "hooks_held" ? null : blocked;
  if (reason !== null)
    logFeatureSad("goal_set", reason.code, {
      origin: fromEnum("restored"),
    });
  let restored;
  if (activeGoalCondition === null || reason !== null) {
    setAppState((state) => {
      restored = state.activeGoal;
      return state.activeGoal === undefined
        ? state
        : {
            ...state,
            activeGoal: undefined,
          };
    });
    if (restored !== undefined) logGoalCleared(restored, "resume_swap");
    return;
  }
  sessionHooksRegistry.add(getSessionId(), "Stop", "", getValueFromInput(activeGoalCondition));
  setAppState((state) => {
    restored = state.activeGoal;
    return {
      ...state,
      activeGoal: {
        condition: activeGoalCondition,
        iterations: hooks?.iterations ?? 0,
        setAt: hooks?.setAt ?? Date.now(),
        ...(hooks?.lastReason !== undefined && {
          lastReason: hooks.lastReason,
        }),
        origin: "restored",
        tokensAtStart: getTotalOutputTokens(),
      },
    };
  });
  if (restored !== undefined) logGoalCleared(restored, "resume_swap");
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
