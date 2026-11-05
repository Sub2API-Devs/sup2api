/**
 * commands/send-to-project/remoteControlOffRequest.ts
 *
 * Remote Control 关着时发送到项目的提示与“去打开”选择请求（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tc2kynhj.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, discriminatedUnion, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";

//@ chunk-tc2kynhj.js:302-701 placement
/**
 * Remote Control 关着时发送到项目的说明文案与 turn_on/no 选择请求。
 */
var REMOTE_CONTROL_OFF_TITLE = "Remote Control is off, so this session can\u2019t be sent";
var REMOTE_CONTROL_OFF_BODY =
  "/send-to-project needs Remote Control so a Claude Project can read this session.";
var TURN_ON_AND_SEND_LABEL = "Turn on Remote Control and send";
var payloadSchema = DoctorLazy(() => objectSchema({}));
var resultSchema = DoctorLazy(() =>
  discriminatedUnion("choice", [
    objectSchema({
      choice: literal("turn_on"),
    }),
    objectSchema({
      choice: literal("no"),
    }),
  ]),
);
var continueInProjectsRemoteControlDialog = withHideWhile({
  kind: "continue_in_projects_remote_control",
  payload: payloadSchema,
  result: resultSchema,
  default: {
    choice: "no",
  },
  hideWhile: ["panel", "draft"],
});
export {
  continueInProjectsRemoteControlDialog,
  REMOTE_CONTROL_OFF_BODY,
  TURN_ON_AND_SEND_LABEL,
  REMOTE_CONTROL_OFF_TITLE,
};
