/**
 * utils/swarm/planApprovalWake.ts
 *
 * 2.1.316 新增：计划批准唤醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-phrnybk8.js (2)
 * attribution: placement 2
 */
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import {
  injectUserMessageToTeammate,
  findTeammateTaskByAgentId,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { MG } from "./teammateIds.js";

//@ chunk-phrnybk8.js:874-1123 placement
function exitTeammatePlanMode(e, a) {
  let s = a.get(e);
  if (!isInProcessTeammateTask(s) || !s.awaitingPlanApproval) return;
  (a.update(e, (n) => ({ ...n, awaitingPlanApproval: !1, pendingPlanApproval: void 0 })),
    injectUserMessageToTeammate(e, "The person moved you out of plan mode. Continue your work.", a, {
      kind: "task-notification",
    }));
}
//@ chunk-phrnybk8.js:1123-1209 placement
function rTo(e, a, s) {
  let n = findTeammateTaskByAgentId(MG(a, s), e);
  if (n?.status === "running") n.retryWake?.emit();
}

export { exitTeammatePlanMode, rTo };
