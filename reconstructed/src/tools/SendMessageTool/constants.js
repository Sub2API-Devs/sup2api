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

/**
 * SendMessage 常量：工具名 "SendMessage"、ccd_session_mgmt、summary 上限 200、观测字段列表。
 */
//@ chunk-rvwp1taf.js:226-353 callgraph-witnessed = SEND_MESSAGE_TOOL_NAME (0.247)
var SENDMESSAGE = "SendMessage",
  CCD_SESSION_MGMT = "ccd_session_mgmt",
  SUMMARY_MAX_CHARS = 200,
  OBSERVABLE_INPUT_FIELDS = ["type", "recipient", "recipient_kind", "content", "request_id", "approve"];
//@ chunk-rvwp1taf.js:353-429 placement
function jcs(e) {
  return "to" in e && ("message" in e || "notify_when_idle" in e);
}
/**
 * 若 SendMessage 输入含可观察字段，返回去掉这些字段的副本。
 */
//@ chunk-rvwp1taf.js:429-547 placement
function stripObservableFields(e) {
  if (!isPlainObject(e) || !jcs(e) || !OBSERVABLE_INPUT_FIELDS.some((n) => n in e)) return;
  let o = { ...e };
  for (let n of OBSERVABLE_INPUT_FIELDS) delete o[n];
  return o;
}
//@ chunk-fj90tvf9.js:263-307 placement
function hasSendMessageTool(o) {
  return o.some((e) => toolMatchesName(e, SENDMESSAGE));
}

export {
  SENDMESSAGE,
  stripObservableFields,
  hasSendMessageTool,
  SUMMARY_MAX_CHARS,
  OBSERVABLE_INPUT_FIELDS,
  jcs,
  CCD_SESSION_MGMT,
};
