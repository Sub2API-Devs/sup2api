/**
 * components/messages/UserToolResultMessage/UserToolErrorMessage.tsx
 *
 * 工具错误结果：调用工具的 renderToolUseErrorMessage，非 verbose 时截断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/UserToolErrorMessage.tsx
 * pieces: chunk-ah34pb7m.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../MessageResponse.js";
import { Text, Link, Box } from "../../../ink/components/Text.js";
import { plural } from "../../../utils/stringUtils.js";
import { Byline } from "../../design-system/Byline.js";
import { a5 } from "../../FreezeWhenOffscreen.js";
import { useHasAutoModeDenialFor } from "../../Spinner/spinnerStatus.js";
import {
  extractClassifierDenialReason,
  AUTO_MODE_PREFIX,
  isToolDenial,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
  PLAN_REJECTION_PREFIX,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
} from "../../../utils/messages.js";
import { qa } from "../../../utils/stripAnsi.js";
import { BULLET_OPERATOR } from "../../../utils/permissions/autoModeRulesPrompt.js";
import { wt } from "../../../remote/remoteMode.js";
import {
  DenialReasonQuote,
  isAutoModeBlockedResult,
  isAutoModeUnavailableResult,
} from "../teamMemCollapsed.js";
import { rs } from "../../../state/AppState.js";
import { Ige, INTERRUPTED_TOOL_STATUSES } from "../../../entrypoints/sdk/coreSchemas.js";
import { RejectedToolUseMessage } from "./RejectedToolUseMessage.js";
import { RejectedPlanMessage } from "./RejectedPlanMessage.js";
import { CtrlOToExpand } from "../../CtrlOToExpand.js";
import { Cf } from "../../../bridge/deviceRegistration.js";
import { mcpRenderOverrideFor } from "../../Message.js";
import { filterToolProgressMessages } from "../../../Tool.js";
import { FallbackToolUseErrorMessage } from "../../FallbackToolUseErrorMessage.js";

//@ chunk-ah34pb7m.js:152699-152842 placement
function ToolUseRejectedLine() {
  let m = w(1),
    d;
  if (m[0] === MEMO_CACHE_SENTINEL)
    ((d = e(MessageResponse, {
      height: 1,
      children: e(Text, { dimColor: !0, children: "Tool use rejected" }),
    })),
      (m[0] = d));
  else d = m[0];
  return d;
}
//@ chunk-ah34pb7m.js:152842-152896 placement
function FL(X) {
  return X.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:152896-152986 placement
function Pa(m, d) {
  return (m === "automode-unavailable" || m === "automode-parsing-error") && d !== !0;
}
/**
 * "N actions not run" 行。
 */
//@ chunk-ah34pb7m.js:152986-153361 placement
function NotRunLine(m) {
  let c = w(7),
    { callCount: callCount } = m,
    g;
  if (c[0] !== callCount)
    ((g = callCount === void 0 ? "Not run" : `${callCount} ${plural(callCount, "action")} not run`),
      (c[0] = callCount),
      (c[1] = g));
  else g = c[1];
  let f;
  if (c[2] !== g) ((f = e(Text, { children: g })), (c[2] = g), (c[3] = f));
  else f = c[3];
  let h;
  if (c[4] === MEMO_CACHE_SENTINEL)
    ((h = e(Text, { children: "auto mode's check had no usable answer" })), (c[4] = h));
  else h = c[4];
  let M;
  if (c[5] !== f) ((M = r(Byline, { children: [f, h] })), (c[5] = f), (c[6] = M));
  else M = c[6];
  return M;
}
/**
 * 被 auto mode 拦截的工具调用说明（含文档链接、/permissions）。
 */
//@ chunk-ah34pb7m.js:153361-154230 placement
function AutoModeBlockedMessage(m) {
  let g = w(16),
    { toolUseId: toolUseId, content: content } = m,
    f;
  if (g[0] !== toolUseId) ((f = [toolUseId]), (g[0] = toolUseId), (g[1] = f));
  else f = g[1];
  let [h, M] = a5(useHasAutoModeDenialFor(f)),
    T;
  if (g[2] === MEMO_CACHE_SENTINEL)
    ((T = e(Link, { url: "https://code.claude.com/docs/s/claude-code-auto-mode" })), (g[2] = T));
  else T = g[2];
  let x = T,
    k;
  if (g[3] !== content) ((k = extractClassifierDenialReason(qa(content))), (g[3] = content), (g[4] = k));
  else k = g[4];
  let b = k,
    E;
  if (g[5] === MEMO_CACHE_SENTINEL)
    ((E = r(Text, { "aria-hidden": !0, children: [BULLET_OPERATOR, " "] })), (g[5] = E));
  else E = g[5];
  let B;
  if (g[6] !== M)
    ((B =
      !wt() &&
      M &&
      r(Fragment, {
        children: [
          "/permissions to review ",
          r(Text, { "aria-hidden": !0, children: [BULLET_OPERATOR, " "] }),
        ],
      })),
      (g[6] = M),
      (g[7] = B));
  else B = g[7];
  let L;
  if (g[8] !== B)
    ((L = r(Text, { dimColor: !0, children: ["Blocked by auto mode ", E, B, "see ", x] })),
      (g[8] = B),
      (g[9] = L));
  else L = g[9];
  let N;
  if (g[10] !== b)
    ((N = b && e(DenialReasonQuote, { label: AUTO_MODE_PREFIX, reason: b })), (g[10] = b), (g[11] = N));
  else N = g[11];
  let W;
  if (g[12] !== L || g[13] !== N || g[14] !== h)
    ((W = e(MessageResponse, { children: r(Box, { ref: h, flexDirection: "column", children: [L, N] }) })),
      (g[12] = L),
      (g[13] = N),
      (g[14] = h),
      (g[15] = W));
  else W = g[15];
  return W;
}
//@ chunk-ah34pb7m.js:154230-156010 fingerprint = UserToolErrorMessage (0.405)
function UserToolErrorMessage(t0) {
  let $ = w(23),
    {
      progressMessagesForMessage: progressMessagesForMessage,
      tool: tool,
      tools: tools,
      param: param,
      input: input,
      output: output,
      toolDenialKind: toolDenialKind,
      remoteToolDenialKind: remoteToolDenialKind,
      toolDenialMonitorBlocked: toolDenialMonitorBlocked,
      verbose: verbose,
      isTranscriptMode: isTranscriptMode,
    } = t0,
    B = rs(FL),
    L = { toolDenialKind: toolDenialKind, remoteToolDenialKind: remoteToolDenialKind },
    N = isToolDenial(param.content, L, Ige);
  if (
    isToolDenial(param.content, L, INTERRUPTED_TOOL_STATUSES) &&
    typeof param.content === "string" &&
    (param.content.includes(INTERRUPT_MESSAGE_FOR_TOOL_USE) ||
      param.content.includes(TOOL_CALL_ENDED_FOR_DELIVERY) ||
      param.content.includes(TOOL_CALL_SESSION_ENDED) ||
      param.content.includes(TOOL_RESULT_NOT_IN_COPY) ||
      param.content.includes(AGENT_CALL_PROCESS_STOPPED))
  ) {
    let U;
    if ($[0] === MEMO_CACHE_SENTINEL) ((U = e(RejectedToolUseMessage, {})), ($[0] = U));
    else U = $[0];
    return U;
  }
  if (N && typeof param.content === "string" && param.content.startsWith(PLAN_REJECTION_PREFIX)) {
    let U;
    if ($[1] !== param.content)
      ((U = param.content.substring(PLAN_REJECTION_PREFIX.length)), ($[1] = param.content), ($[2] = U));
    else U = $[2];
    let planContent = U;
    let V;
    if ($[3] !== planContent)
      ((V = e(RejectedPlanMessage, { plan: planContent })), ($[3] = planContent), ($[4] = V));
    else V = $[4];
    return V;
  }
  if (N && typeof param.content === "string" && param.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)) {
    let U;
    if ($[5] === MEMO_CACHE_SENTINEL) ((U = e(ToolUseRejectedLine, {})), ($[5] = U));
    else U = $[5];
    return U;
  }
  if (typeof param.content === "string" && isAutoModeBlockedResult(param.content, L)) {
    let U;
    if ($[6] !== param.content || $[7] !== param.tool_use_id)
      ((U = e(AutoModeBlockedMessage, { toolUseId: param.tool_use_id, content: param.content })),
        ($[6] = param.content),
        ($[7] = param.tool_use_id),
        ($[8] = U));
    else U = $[8];
    return U;
  }
  if (
    (Pa(toolDenialKind, toolDenialMonitorBlocked) || isAutoModeUnavailableResult(param.content, L)) &&
    !verbose &&
    isTranscriptMode !== !0
  ) {
    let U;
    if ($[9] === MEMO_CACHE_SENTINEL) ((U = e(NotRunLine, {})), ($[9] = U));
    else U = $[9];
    let V;
    if ($[10] === MEMO_CACHE_SENTINEL)
      ((V = e(MessageResponse, {
        children: r(Text, { dimColor: !0, wrap: "wrap", children: [U, " ", e(CtrlOToExpand, {})] }),
      })),
        ($[10] = V));
    else V = $[10];
    return V;
  }
  let U;
  if (
    $[11] !== B ||
    $[12] !== input ||
    $[13] !== isTranscriptMode ||
    $[14] !== output ||
    $[15] !== param.content ||
    $[16] !== progressMessagesForMessage ||
    $[17] !== remoteToolDenialKind ||
    $[18] !== tool ||
    $[19] !== toolDenialKind ||
    $[20] !== tools ||
    $[21] !== verbose
  ) {
    let Y = tool && !Cf(input) ? mcpRenderOverrideFor(tool, "renderToolUseErrorMessage") : void 0;
    U =
      Y?.(param.content, {
        progressMessagesForMessage: filterToolProgressMessages(progressMessagesForMessage),
        tools: tools,
        verbose: verbose,
        isTranscriptMode: isTranscriptMode,
        input: input,
        output: output,
        activeAgents: B,
        toolDenialKind: toolDenialKind ?? remoteToolDenialKind,
      }) ?? e(FallbackToolUseErrorMessage, { result: param.content, verbose: verbose });
    (($[11] = B),
      ($[12] = input),
      ($[13] = isTranscriptMode),
      ($[14] = output),
      ($[15] = param.content),
      ($[16] = progressMessagesForMessage),
      ($[17] = remoteToolDenialKind),
      ($[18] = tool),
      ($[19] = toolDenialKind),
      ($[20] = tools),
      ($[21] = verbose),
      ($[22] = U));
  } else U = $[22];
  return U;
}

export { UserToolErrorMessage, Pa, NotRunLine };
