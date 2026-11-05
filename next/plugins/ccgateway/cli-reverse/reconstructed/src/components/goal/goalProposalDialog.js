/**
 * components/goal/goalProposalDialog.ts
 *
 * 2.1.316 新增：目标提议对话框定义（goal_proposal：条件 → 是否批准）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ta4kkk9s.js (1)
 * attribution: placement 1
 */
import { withHideWhile } from "../dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ta4kkk9s.js:301-476 placement
/**
 * 目标提议对话框定义（goal_proposal：条件 → 是否批准）。
 */
var GOAL_PROPOSAL_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ta4kkk9s.js:301", () => {
  GOAL_PROPOSAL_DIALOG = withHideWhile({
    kind: "goal_proposal",
    payload: DoctorLazy(() =>
      objectSchema({
        condition: stringSchema(),
      }),
    ),
    result: DoctorLazy(() =>
      objectSchema({
        approved: booleanSchema(),
        explicit: booleanSchema().optional(),
      }),
    ),
    default: {
      approved: false,
    },
    hideWhile: ["panel", "draft"],
  });
});
export { GOAL_PROPOSAL_DIALOG };
