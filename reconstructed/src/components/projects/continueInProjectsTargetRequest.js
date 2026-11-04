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
  objectSchema,
  _enum,
  stringSchema,
  array,
  numberSchema,
  booleanSchema,
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
  objectSchema({
    sends: _enum(["message", "brief"]),
    newProjectName: stringSchema(),
    projects: array(
      objectSchema({
        id: stringSchema(),
        name: stringSchema(),
        lastMessageAtMs: numberSchema().nullable(),
      }),
    ).max(TARGET_PROJECT_ROWS_MAX),
    truncated: booleanSchema(),
    listError: stringSchema().optional(),
  }),
);
var TargetChoiceSchema = DoctorLazy(() =>
  discriminatedUnion("choice", [
    objectSchema({
      choice: literal("new"),
    }),
    objectSchema({
      choice: literal("existing"),
      projectId: stringSchema(),
    }),
    objectSchema({
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
