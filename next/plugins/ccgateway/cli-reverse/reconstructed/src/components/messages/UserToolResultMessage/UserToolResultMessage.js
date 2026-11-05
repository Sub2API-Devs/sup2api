/**
 * components/messages/UserToolResultMessage/UserToolResultMessage.tsx
 *
 * tool_result 分派：按 is_error/拒绝/成功分别交给 UserToolErrorMessage/UserToolRejectMessage/UserToolSuccessMessage。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/UserToolResultMessage.tsx
 * pieces: chunk-wjygkcr4.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { UserToolSuccessMessage } from "./UserToolSuccessMessage.js";
import { UserToolRejectMessage } from "./UserToolRejectMessage.js";
import { UserToolErrorMessage } from "./UserToolErrorMessage.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { folderWaitRefusal, useDeferredToolResult, FolderWaitRefusalNotice } from "../AgentMessage.js";
import {
  isToolDenial,
  isUserInterruptMessage,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
} from "../../../utils/messages.js";
import { INTERRUPTED_TOOL_STATUSES, USER_REJECTED_KIND } from "../../../entrypoints/sdk/coreSchemas.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RejectedToolUseMessage } from "./RejectedToolUseMessage.js";
import { mcpRenderOverrideFor } from "../../Message.js";
import { isDetachedToolResult } from "../../../services/tools/detachedToolCalls.js";
import { GET_TASK_TOOL_TEXT, GET_TASK_TOOL_ERROR_TEXT } from "../../../remote/tools/nativeToolErrors.js";
import { Box } from "../../../ink/components/Text.js";

//@ chunk-wjygkcr4.js:227874-227913 placement
var TOOL_RESULT_MESSAGE_BY_KIND = {
  Success: UserToolSuccessMessage,
  Reject: UserToolRejectMessage,
  Error: UserToolErrorMessage,
};
//@ chunk-wjygkcr4.js:228761-231963 fingerprint (2.1.88 match: UserToolResultMessage, 0.567)
/**
 * tool_result 分派：is_error 时 UserToolErrorMessage（非 verbose 时可能按工具格式化错误），拒绝内容时 UserToolRejectMessage，否则 UserToolSuccessMessage；找不到对应 tool_use 时不渲染。
 */
function UserToolResultMessage(props) {
  let $ = useMemoCache(58);
  let {
    param,
    message,
    lookups,
    progressMessagesForMessage,
    style,
    tools,
    verbose,
    width,
    isTranscriptMode,
    toolUse,
  } = props;
  let refusalRow;
  if (
    $[0] !== isTranscriptMode ||
    $[1] !== param.content ||
    $[2] !== param.is_error ||
    $[3] !== toolUse ||
    $[4] !== verbose
  ) {
    refusalRow =
      param.is_error === true && !verbose && isTranscriptMode !== true
        ? folderWaitRefusal(toolUse.toolUse.name, param.content)
        : undefined;
    $[0] = isTranscriptMode;
    $[1] = param.content;
    $[2] = param.is_error;
    $[3] = toolUse;
    $[4] = verbose;
    $[5] = refusalRow;
  } else refusalRow = $[5];
  let isError = refusalRow;
  let toolUse_2 = isToolDenial(param.content, message, INTERRUPTED_TOOL_STATUSES);
  let isVerbose = isToolDenial(param.content, message, USER_REJECTED_KIND);
  let rowElement;
  if (toolUse_2 && typeof param.content === "string" && isUserInterruptMessage(param.content)) {
    let rejectedToolUseMessageElement;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      rejectedToolUseMessageElement = jsxProd_default(RejectedToolUseMessage, {});
      $[6] = rejectedToolUseMessageElement;
    } else rejectedToolUseMessageElement = $[6];
    rowElement = rejectedToolUseMessageElement;
  } else if (
    (isVerbose &&
      typeof param.content === "string" &&
      (param.content.startsWith(REJECT_MESSAGE) ||
        (param.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX) &&
          toolUse.tool != null &&
          mcpRenderOverrideFor(toolUse.tool, "renderToolUseRejectedMessage") !== undefined))) ||
    (toolUse_2 &&
      (param.content === INTERRUPT_MESSAGE_FOR_TOOL_USE ||
        param.content === TOOL_CALL_ENDED_FOR_DELIVERY ||
        param.content === TOOL_CALL_SESSION_ENDED ||
        param.content === TOOL_RESULT_NOT_IN_COPY ||
        param.content === AGENT_CALL_PROCESS_STOPPED))
  ) {
    const input = toolUse.toolUse.input;
    let isInterrupted;
    if ($[7] !== param.content) {
      isInterrupted =
        typeof param.content !== "string" ||
        !(
          param.content.startsWith(REJECT_MESSAGE) ||
          param.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)
        );
      $[7] = param.content;
      $[8] = isInterrupted;
    } else isInterrupted = $[8];
    let userToolRejectMessageElement;
    if (
      $[9] !== isTranscriptMode ||
      $[10] !== progressMessagesForMessage ||
      $[11] !== style ||
      $[12] !== isInterrupted ||
      $[13] !== toolUse.tool ||
      $[14] !== toolUse.toolUse.input ||
      $[15] !== tools ||
      $[16] !== verbose
    ) {
      userToolRejectMessageElement = jsxProd_default(UserToolRejectMessage, {
        input,
        progressMessagesForMessage,
        isInterrupted,
        tool: toolUse.tool,
        tools,
        style,
        verbose,
        isTranscriptMode,
      });
      $[9] = isTranscriptMode;
      $[10] = progressMessagesForMessage;
      $[11] = style;
      $[12] = isInterrupted;
      $[13] = toolUse.tool;
      $[14] = toolUse.toolUse.input;
      $[15] = tools;
      $[16] = verbose;
      $[17] = userToolRejectMessageElement;
    } else userToolRejectMessageElement = $[17];
    rowElement = userToolRejectMessageElement;
  } else if (isDetachedToolResult(toolUse.tool, message.toolUseResult)) {
    let useDeferredToolResultElement;
    if (
      $[18] !== isTranscriptMode ||
      $[19] !== lookups ||
      $[20] !== message ||
      $[21] !== param ||
      $[22] !== progressMessagesForMessage ||
      $[23] !== style ||
      $[24] !== toolUse.tool ||
      $[25] !== toolUse.toolUse.id ||
      $[26] !== toolUse.toolUse.input ||
      $[27] !== tools ||
      $[28] !== verbose ||
      $[29] !== width
    ) {
      useDeferredToolResultElement = jsxProd_default(useDeferredToolResult, {
        param,
        message,
        lookups,
        progressMessagesForMessage,
        style,
        tool: toolUse.tool,
        toolUseID: toolUse.toolUse.id,
        input: toolUse.toolUse.input,
        tools,
        verbose,
        width,
        isTranscriptMode,
        rows: TOOL_RESULT_MESSAGE_BY_KIND,
      });
      $[18] = isTranscriptMode;
      $[19] = lookups;
      $[20] = message;
      $[21] = param;
      $[22] = progressMessagesForMessage;
      $[23] = style;
      $[24] = toolUse.tool;
      $[25] = toolUse.toolUse.id;
      $[26] = toolUse.toolUse.input;
      $[27] = tools;
      $[28] = verbose;
      $[29] = width;
      $[30] = useDeferredToolResultElement;
    } else useDeferredToolResultElement = $[30];
    rowElement = useDeferredToolResultElement;
  } else if (isError !== undefined) {
    let folderWaitRefusalNoticeElement;
    if ($[31] !== isError) {
      folderWaitRefusalNoticeElement = jsxProd_default(FolderWaitRefusalNotice, {
        refusal: isError,
      });
      $[31] = isError;
      $[32] = folderWaitRefusalNoticeElement;
    } else folderWaitRefusalNoticeElement = $[32];
    rowElement = folderWaitRefusalNoticeElement;
  } else if (
    toolUse.toolUse.name === GET_TASK_TOOL_TEXT &&
    param.content === GET_TASK_TOOL_ERROR_TEXT &&
    !verbose &&
    isTranscriptMode !== true
  ) {
    return null;
  } else if (param.is_error) {
    let userToolErrorMessageElement;
    if (
      $[33] !== isTranscriptMode ||
      $[34] !== message.remoteToolDenialKind ||
      $[35] !== message.toolDenialKind ||
      $[36] !== message.toolDenialMonitorBlocked ||
      $[37] !== message.toolUseResult ||
      $[38] !== param ||
      $[39] !== progressMessagesForMessage ||
      $[40] !== toolUse.tool ||
      $[41] !== toolUse.toolUse.input ||
      $[42] !== tools ||
      $[43] !== verbose
    ) {
      userToolErrorMessageElement = jsxProd_default(UserToolErrorMessage, {
        progressMessagesForMessage,
        tool: toolUse.tool,
        tools,
        param,
        input: toolUse.toolUse.input,
        output: message.toolUseResult,
        toolDenialKind: message.toolDenialKind,
        remoteToolDenialKind: message.remoteToolDenialKind,
        toolDenialMonitorBlocked: message.toolDenialMonitorBlocked,
        verbose,
        isTranscriptMode,
      });
      $[33] = isTranscriptMode;
      $[34] = message.remoteToolDenialKind;
      $[35] = message.toolDenialKind;
      $[36] = message.toolDenialMonitorBlocked;
      $[37] = message.toolUseResult;
      $[38] = param;
      $[39] = progressMessagesForMessage;
      $[40] = toolUse.tool;
      $[41] = toolUse.toolUse.input;
      $[42] = tools;
      $[43] = verbose;
      $[44] = userToolErrorMessageElement;
    } else userToolErrorMessageElement = $[44];
    rowElement = userToolErrorMessageElement;
  } else {
    let userToolSuccessMessageElement;
    if (
      $[45] !== isTranscriptMode ||
      $[46] !== lookups ||
      $[47] !== message ||
      $[48] !== progressMessagesForMessage ||
      $[49] !== style ||
      $[50] !== toolUse.tool ||
      $[51] !== toolUse.toolUse.id ||
      $[52] !== tools ||
      $[53] !== verbose ||
      $[54] !== width
    ) {
      userToolSuccessMessageElement = jsxProd_default(UserToolSuccessMessage, {
        message,
        lookups,
        toolUseID: toolUse.toolUse.id,
        progressMessagesForMessage,
        style,
        tool: toolUse.tool,
        tools,
        verbose,
        width,
        isTranscriptMode,
      });
      $[45] = isTranscriptMode;
      $[46] = lookups;
      $[47] = message;
      $[48] = progressMessagesForMessage;
      $[49] = style;
      $[50] = toolUse.tool;
      $[51] = toolUse.toolUse.id;
      $[52] = tools;
      $[53] = verbose;
      $[54] = width;
      $[55] = userToolSuccessMessageElement;
    } else userToolSuccessMessageElement = $[55];
    rowElement = userToolSuccessMessageElement;
  }
  let boxElement;
  if ($[56] !== rowElement) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      children: rowElement,
    });
    $[56] = rowElement;
    $[57] = boxElement;
  } else boxElement = $[57];
  return boxElement;
}
export { UserToolResultMessage };
