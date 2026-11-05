/**
 * components/projects/continueInProjectsComposeRequest.ts
 *
 * 发送到项目时“要说什么”的对话框请求（continue_in_projects_compose）与其文案（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0ne31j4t.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  booleanSchema,
  discriminatedUnion,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { withHideWhile } from "../dialogs/dialogRequests.js";

//@ chunk-0ne31j4t.js:306-345 placement
/**
 * 发送到项目时“要说什么”的输入提示文案。
 */
var COMPOSE_TITLE = "What should the message say?";
//@ chunk-0ne31j4t.js:345-526 placement
/**
 * 发送到项目的结果说明：新建项目时说明会以你的身份发到新项目。
 */
function composeSubtitle(payload) {
  return payload.creates
    ? `Sent as you to a new Claude Project, \u201C${payload.projectName}\u201D, after you confirm it.`
    : `Sent as you to ${payload.projectName}, after you confirm it.`;
}
//@ chunk-0ne31j4t.js:526-758 placement
/**
 * continue_in_projects_compose 对话框请求：payload 是项目名与是否新建，结果是 send/cancel。
 */
var payloadSchema = DoctorLazy(() =>
  objectSchema({
    projectName: stringSchema(),
    creates: booleanSchema(),
  }),
);
var resultSchema = DoctorLazy(() =>
  discriminatedUnion("choice", [
    objectSchema({
      choice: literal("send"),
      message: stringSchema(),
    }),
    objectSchema({
      choice: literal("cancel"),
    }),
  ]),
);
var continueInProjectsComposeDialog = withHideWhile({
  kind: "continue_in_projects_compose",
  payload: payloadSchema,
  result: resultSchema,
  default: {
    choice: "cancel",
  },
  hideWhile: [],
});
export { composeSubtitle, COMPOSE_TITLE, continueInProjectsComposeDialog };
