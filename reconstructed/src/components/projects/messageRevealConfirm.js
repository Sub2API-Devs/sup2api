/**
 * components/projects/messageRevealConfirm.ts
 *
 * 2.1.316 新增。发送到项目前的确认对话框请求（continue_in_projects_message）：新建项目或发送前提示用户内容将被看到。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0q2rgdq2.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, M, discriminatedUnion, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { withHideWhile } from "../dialogs/dialogRequests.js";

//@ chunk-0q2rgdq2.js:306-423 placement
function messageTitle(projectName, t) {
  return t
    ? `Create the project \u201C${projectName}\u201D and send this message?`
    : `Send this message to ${projectName}?`;
}
//@ chunk-0q2rgdq2.js:423-691 placement
/**
 * 发送到项目前的确认对话框请求（continue_in_projects_message）：新建项目或发送前提示用户内容将被看到。
 */
var MESSAGE_REVEAL_NOTICE = "Choose Send again to confirm.";
var RevealConfirmPayloadSchema = DoctorLazy(() =>
  u({
    projectName: string(),
    creates: M(),
    message: string(),
  }),
);
var RevealConfirmChoiceSchema = DoctorLazy(() =>
  discriminatedUnion("choice", [
    u({
      choice: literal("send"),
    }),
    u({
      choice: literal("cancel"),
    }),
  ]),
);
var continueInProjectsMessageDialog = withHideWhile({
  kind: "continue_in_projects_message",
  payload: RevealConfirmPayloadSchema,
  result: RevealConfirmChoiceSchema,
  default: {
    choice: "cancel",
  },
  hideWhile: [],
});
export { messageTitle, MESSAGE_REVEAL_NOTICE };
