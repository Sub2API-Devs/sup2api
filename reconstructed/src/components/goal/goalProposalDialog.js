/**
 * components/goal/goalProposalDialog.ts
 *
 * 2.1.316 新增：目标提议对话框定义（goal_proposal：条件 → 是否批准）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vbbsbs4g.js (1)
 * attribution: placement 1
 */
import { withHideWhile } from "../dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, M } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-vbbsbs4g.js:301-476 placement
/**
 * 目标提议对话框定义（goal_proposal：条件 → 是否批准）。
 */
var GOAL_PROPOSAL_DIALOG = withHideWhile({
  kind: "goal_proposal",
  payload: DoctorLazy(() =>
    u({
      condition: string(),
    }),
  ),
  result: DoctorLazy(() =>
    u({
      approved: M(),
      explicit: M().optional(),
    }),
  ),
  default: {
    approved: false,
  },
  hideWhile: ["panel", "draft"],
});
export { GOAL_PROPOSAL_DIALOG };
