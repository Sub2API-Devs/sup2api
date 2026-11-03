/**
 * components/projects/continueInProjectsTargetRequest.ts
 *
 * 2.1.316 新增。选择"发送到项目"目标项目的对话框请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ktgzv6n7.js (3)
 * attribution: placement 3
 */
import { formatRelativeTimeAgo } from "../../utils/format.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  _enum,
  string,
  array,
  E,
  M,
  discriminatedUnion,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { withHideWhile } from "../dialogs/dialogRequests.js";

//@ chunk-ktgzv6n7.js:348-360 placement
var TARGET_PROJECT_ROWS_MAX = 200;
//@ chunk-ktgzv6n7.js:360-448 placement
function lastActiveLabel(lastMessageAtMs, now) {
  return lastMessageAtMs === null
    ? "no messages yet"
    : `active ${formatRelativeTimeAgo(new Date(lastMessageAtMs), {
        now,
      })}`;
}
//@ chunk-ktgzv6n7.js:448-838 placement
/**
 * 选择"发送到项目"目标项目的对话框请求。
 */
var continueInProjectsTargetSchemas = DoctorLazy(() =>
  u({
    sends: _enum(["message", "brief"]),
    newProjectName: string(),
    projects: array(
      u({
        id: string(),
        name: string(),
        lastMessageAtMs: E().nullable(),
      }),
    ).max(TARGET_PROJECT_ROWS_MAX),
    truncated: M(),
    listError: string().optional(),
  }),
);
var TargetChoiceSchema = DoctorLazy(() =>
  discriminatedUnion("choice", [
    u({
      choice: literal("new"),
    }),
    u({
      choice: literal("existing"),
      projectId: string(),
    }),
    u({
      choice: literal("cancel"),
    }),
  ]),
);
var continueInProjectsTargetDialog = withHideWhile({
  kind: "continue_in_projects_target",
  payload: continueInProjectsTargetSchemas,
  result: TargetChoiceSchema,
  default: {
    choice: "cancel",
  },
  hideWhile: [],
});
export { TARGET_PROJECT_ROWS_MAX, continueInProjectsTargetDialog, lastActiveLabel };
