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
import { u, o, M, Ir, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { withHideWhile } from "../dialogs/dialogRequests.js";

//@ chunk-0q2rgdq2.js:306-423 placement
function messageTitle(e, t) {
  return t ? `Create the project \u201C${e}\u201D and send this message?` : `Send this message to ${e}?`;
}
/**
 * 发送到项目前的确认对话框请求（continue_in_projects_message）：新建项目或发送前提示用户内容将被看到。
 */
//@ chunk-0q2rgdq2.js:423-691 placement
var MESSAGE_REVEAL_NOTICE = "Choose Send again to confirm.",
  s = DoctorLazy(() => u({ projectName: o(), creates: M(), message: o() })),
  n = DoctorLazy(() => Ir("choice", [u({ choice: T("send") }), u({ choice: T("cancel") })])),
  continueInProjectsMessageDialog = withHideWhile({
    kind: "continue_in_projects_message",
    payload: s,
    result: n,
    default: { choice: "cancel" },
    hideWhile: [],
  });

export { messageTitle, MESSAGE_REVEAL_NOTICE };
