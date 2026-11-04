/**
 * tools/SendMessageTool/constants.ts
 *
 * SendMessage 工具名、summary 长度上限与观测字段常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SendMessageTool/constants.ts
 * pieces: chunk-fj90tvf9.js (1), chunk-rvwp1taf.js (3)
 * attribution: placement 3, callgraph-witnessed 1
 */
import { isPlainObject } from "../../utils/isPlainObject.js";
import { toolMatchesName } from "../../Tool.js";

//@ chunk-rvwp1taf.js:226-353 callgraph-witnessed (2.1.88 match: SEND_MESSAGE_TOOL_NAME, 0.247)
/**
 * SendMessage 常量：工具名 "SendMessage"、ccd_session_mgmt、summary 上限 200、观测字段列表。
 */
var SENDMESSAGE = "SendMessage";
var CCD_SESSION_MGMT = "ccd_session_mgmt";
var SUMMARY_MAX_CHARS = 200;
var OBSERVABLE_INPUT_FIELDS = ["type", "recipient", "recipient_kind", "content", "request_id", "approve"];
//@ chunk-rvwp1taf.js:353-429 placement
/**
 * 判断 SendMessage 输入是否具备“收件人 + 消息或空闲订阅”的形状（用于剥离可观察字段）。
 */
function hasSendMessageShape(input) {
  return "to" in input && ("message" in input || "notify_when_idle" in input);
}
//@ chunk-rvwp1taf.js:429-547 placement
/**
 * 若 SendMessage 输入含可观察字段，返回去掉这些字段的副本。
 */
function stripObservableFields(value) {
  if (
    !isPlainObject(value) ||
    !hasSendMessageShape(value) ||
    !OBSERVABLE_INPUT_FIELDS.some((field) => field in value)
  )
    return;
  let copy = {
    ...value,
  };
  for (let field of OBSERVABLE_INPUT_FIELDS) delete copy[field];
  return copy;
}
//@ chunk-fj90tvf9.js:263-307 placement
function hasSendMessageTool(tools) {
  return tools.some((tool) => toolMatchesName(tool, SENDMESSAGE));
}
export {
  SENDMESSAGE,
  stripObservableFields,
  hasSendMessageTool,
  CCD_SESSION_MGMT,
  SUMMARY_MAX_CHARS,
  OBSERVABLE_INPUT_FIELDS,
  hasSendMessageShape,
};
