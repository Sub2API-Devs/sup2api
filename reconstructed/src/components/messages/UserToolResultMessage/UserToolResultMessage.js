/**
 * components/messages/UserToolResultMessage/UserToolResultMessage.tsx
 *
 * tool_result 分派：按 is_error/拒绝/成功分别交给 UserToolErrorMessage/UserToolRejectMessage/UserToolSuccessMessage。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/UserToolResultMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { ph, useDeferredToolResult, FolderWaitRefusalNotice } from "../AgentMessage.js";
import {
  isToolDenial,
  uPn,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
} from "../../../utils/messages.js";
import { INTERRUPTED_TOOL_STATUSES, Ige } from "../../../entrypoints/sdk/coreSchemas.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RejectedToolUseMessage } from "./RejectedToolUseMessage.js";
import { mcpRenderOverrideFor } from "../../Message.js";
import { UserToolRejectMessage } from "./UserToolRejectMessage.js";
import { isDetachedToolResult } from "../../../services/tools/detachedToolCalls.js";
import { c_ } from "./_new/UserToolResultMessage.helpers-ah34.js";
import { GET_TASK_TOOL_TEXT, d7o } from "../../../remote/tools/nativeToolErrors.js";
import { UserToolErrorMessage } from "./UserToolErrorMessage.js";
import { UserToolSuccessMessage } from "./UserToolSuccessMessage.js";
import { Box } from "../../../ink/components/Text.js";

/**
 * tool_result 分派：is_error 时 UserToolErrorMessage（非 verbose 时可能按工具格式化错误），拒绝内容时 UserToolRejectMessage，否则 UserToolSuccessMessage；找不到对应 tool_use 时不渲染。
 */
//@ chunk-ah34pb7m.js:221816-225018 fingerprint = UserToolResultMessage (0.567)
function UserToolResultMessage(t0) {
  let $ = w(58),
    {
      param: param,
      message: message,
      lookups: lookups,
      progressMessagesForMessage: progressMessagesForMessage,
      style: style,
      tools: tools,
      verbose: verbose,
      width: width,
      isTranscriptMode: isTranscriptMode,
      toolUse: toolUse,
    } = t0,
    B;
  if (
    $[0] !== isTranscriptMode ||
    $[1] !== param.content ||
    $[2] !== param.is_error ||
    $[3] !== toolUse ||
    $[4] !== verbose
  )
    ((B =
      param.is_error === !0 && !verbose && isTranscriptMode !== !0
        ? ph(toolUse.toolUse.name, param.content)
        : void 0),
      ($[0] = isTranscriptMode),
      ($[1] = param.content),
      ($[2] = param.is_error),
      ($[3] = toolUse),
      ($[4] = verbose),
      ($[5] = B));
  else B = $[5];
  let L = B,
    toolUse_2 = isToolDenial(param.content, message, INTERRUPTED_TOOL_STATUSES),
    W = isToolDenial(param.content, message, Ige),
    U;
  if (toolUse_2 && typeof param.content === "string" && uPn(param.content)) {
    let K;
    if ($[6] === MEMO_CACHE_SENTINEL) ((K = e(RejectedToolUseMessage, {})), ($[6] = K));
    else K = $[6];
    U = K;
  } else if (
    (W &&
      typeof param.content === "string" &&
      (param.content.startsWith(REJECT_MESSAGE) ||
        (param.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX) &&
          toolUse.tool != null &&
          mcpRenderOverrideFor(toolUse.tool, "renderToolUseRejectedMessage") !== void 0))) ||
    (toolUse_2 &&
      (param.content === INTERRUPT_MESSAGE_FOR_TOOL_USE ||
        param.content === TOOL_CALL_ENDED_FOR_DELIVERY ||
        param.content === TOOL_CALL_SESSION_ENDED ||
        param.content === TOOL_RESULT_NOT_IN_COPY ||
        param.content === AGENT_CALL_PROCESS_STOPPED))
  ) {
    const t1 = toolUse.toolUse.input;
    let V;
    if ($[7] !== param.content)
      ((V =
        typeof param.content !== "string" ||
        !(
          param.content.startsWith(REJECT_MESSAGE) ||
          param.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)
        )),
        ($[7] = param.content),
        ($[8] = V));
    else V = $[8];
    let Y;
    if (
      $[9] !== isTranscriptMode ||
      $[10] !== progressMessagesForMessage ||
      $[11] !== style ||
      $[12] !== V ||
      $[13] !== toolUse.tool ||
      $[14] !== toolUse.toolUse.input ||
      $[15] !== tools ||
      $[16] !== verbose
    )
      ((Y = e(UserToolRejectMessage, {
        input: t1,
        progressMessagesForMessage: progressMessagesForMessage,
        isInterrupted: V,
        tool: toolUse.tool,
        tools: tools,
        style: style,
        verbose: verbose,
        isTranscriptMode: isTranscriptMode,
      })),
        ($[9] = isTranscriptMode),
        ($[10] = progressMessagesForMessage),
        ($[11] = style),
        ($[12] = V),
        ($[13] = toolUse.tool),
        ($[14] = toolUse.toolUse.input),
        ($[15] = tools),
        ($[16] = verbose),
        ($[17] = Y));
    else Y = $[17];
    U = Y;
  } else if (isDetachedToolResult(toolUse.tool, message.toolUseResult)) {
    let K;
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
    )
      ((K = e(useDeferredToolResult, {
        param: param,
        message: message,
        lookups: lookups,
        progressMessagesForMessage: progressMessagesForMessage,
        style: style,
        tool: toolUse.tool,
        toolUseID: toolUse.toolUse.id,
        input: toolUse.toolUse.input,
        tools: tools,
        verbose: verbose,
        width: width,
        isTranscriptMode: isTranscriptMode,
        rows: c_,
      })),
        ($[18] = isTranscriptMode),
        ($[19] = lookups),
        ($[20] = message),
        ($[21] = param),
        ($[22] = progressMessagesForMessage),
        ($[23] = style),
        ($[24] = toolUse.tool),
        ($[25] = toolUse.toolUse.id),
        ($[26] = toolUse.toolUse.input),
        ($[27] = tools),
        ($[28] = verbose),
        ($[29] = width),
        ($[30] = K));
    else K = $[30];
    U = K;
  } else if (L !== void 0) {
    let K;
    if ($[31] !== L) ((K = e(FolderWaitRefusalNotice, { refusal: L })), ($[31] = L), ($[32] = K));
    else K = $[32];
    U = K;
  } else if (
    toolUse.toolUse.name === GET_TASK_TOOL_TEXT &&
    param.content === d7o &&
    !verbose &&
    isTranscriptMode !== !0
  ) {
    return null;
  } else if (param.is_error) {
    let K;
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
    )
      ((K = e(UserToolErrorMessage, {
        progressMessagesForMessage: progressMessagesForMessage,
        tool: toolUse.tool,
        tools: tools,
        param: param,
        input: toolUse.toolUse.input,
        output: message.toolUseResult,
        toolDenialKind: message.toolDenialKind,
        remoteToolDenialKind: message.remoteToolDenialKind,
        toolDenialMonitorBlocked: message.toolDenialMonitorBlocked,
        verbose: verbose,
        isTranscriptMode: isTranscriptMode,
      })),
        ($[33] = isTranscriptMode),
        ($[34] = message.remoteToolDenialKind),
        ($[35] = message.toolDenialKind),
        ($[36] = message.toolDenialMonitorBlocked),
        ($[37] = message.toolUseResult),
        ($[38] = param),
        ($[39] = progressMessagesForMessage),
        ($[40] = toolUse.tool),
        ($[41] = toolUse.toolUse.input),
        ($[42] = tools),
        ($[43] = verbose),
        ($[44] = K));
    else K = $[44];
    U = K;
  } else {
    let K;
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
    )
      ((K = e(UserToolSuccessMessage, {
        message: message,
        lookups: lookups,
        toolUseID: toolUse.toolUse.id,
        progressMessagesForMessage: progressMessagesForMessage,
        style: style,
        tool: toolUse.tool,
        tools: tools,
        verbose: verbose,
        width: width,
        isTranscriptMode: isTranscriptMode,
      })),
        ($[45] = isTranscriptMode),
        ($[46] = lookups),
        ($[47] = message),
        ($[48] = progressMessagesForMessage),
        ($[49] = style),
        ($[50] = toolUse.tool),
        ($[51] = toolUse.toolUse.id),
        ($[52] = tools),
        ($[53] = verbose),
        ($[54] = width),
        ($[55] = K));
    else K = $[55];
    U = K;
  }
  let K;
  if ($[56] !== U) ((K = e(Box, { flexDirection: "column", children: U })), ($[56] = U), ($[57] = K));
  else K = $[57];
  return K;
}

export { UserToolResultMessage };
