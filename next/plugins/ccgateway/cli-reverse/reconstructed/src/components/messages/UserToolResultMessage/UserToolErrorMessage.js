/**
 * components/messages/UserToolResultMessage/UserToolErrorMessage.tsx
 *
 * 工具错误结果：调用工具的 renderToolUseErrorMessage，非 verbose 时截断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/UserToolErrorMessage.tsx
 * pieces: chunk-wjygkcr4.js (6)
 * attribution: placement 5, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../MessageResponse.js";
import { Text, Link, Box } from "../../../ink/components/Text.js";
import { plural } from "../../../utils/stringUtils.js";
import {
  NO_USABLE_ANSWER_TEXT,
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
import { Byline } from "../../design-system/Byline.js";
import { useFrozenValue } from "../../FreezeWhenOffscreen.js";
import { useHasAutoModeDenialFor } from "../../Spinner/spinnerStatus.js";
import { stripAnsiPerLine } from "../../../utils/stripAnsi.js";
import { BULLET_OPERATOR } from "../../../constants/figures.js";
import { isRemoteSessionAvailable } from "../../../remote/remoteMode.js";
import {
  DenialReasonQuote,
  isAutoModeBlockedResult,
  isAutoModeUnavailableResult,
} from "../teamMemCollapsed.js";
import { useAppStateSlice } from "../../../state/AppState.js";
import { USER_REJECTED_KIND, INTERRUPTED_TOOL_STATUSES } from "../../../entrypoints/sdk/coreSchemas.js";
import { RejectedToolUseMessage } from "./RejectedToolUseMessage.js";
import { RejectedPlanMessage } from "./RejectedPlanMessage.js";
import { CtrlOToExpand } from "../../CtrlOToExpand.js";
import { hasHostField } from "../../../bridge/deviceRegistration.js";
import { mcpRenderOverrideFor } from "../../Message.js";
import { filterToolProgressMessages } from "../../../Tool.js";
import { FallbackToolUseErrorMessage } from "../../FallbackToolUseErrorMessage.js";

//@ chunk-wjygkcr4.js:154369-154512 placement
function ToolUseRejectedLine() {
  let $ = useMemoCache(1);
  let errorElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    errorElement = jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Tool use rejected",
      }),
    });
    $[0] = errorElement;
  } else errorElement = $[0];
  return errorElement;
}
//@ chunk-wjygkcr4.js:154512-154568 placement
function selectActiveAgents_3(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-wjygkcr4.js:154568-154658 placement
function isAutoModeUnavailableKind(toolDenialKind, toolDenialMonitorBlocked) {
  return (
    (toolDenialKind === "automode-unavailable" || toolDenialKind === "automode-parsing-error") &&
    toolDenialMonitorBlocked !== true
  );
}
//@ chunk-wjygkcr4.js:154658-154996 placement
/**
 * "N actions not run" 行。
 */
function NotRunLine(props) {
  let $ = useMemoCache(7);
  let { callCount } = props;
  let children;
  if ($[0] !== callCount) {
    children = callCount === undefined ? "Not run" : `${callCount} ${plural(callCount, "action")} not run`;
    $[0] = callCount;
    $[1] = children;
  } else children = $[1];
  let childrenText;
  if ($[2] !== children) {
    childrenText = jsxProd_default(Text, {
      children,
    });
    $[2] = children;
    $[3] = childrenText;
  } else childrenText = $[3];
  let noAnswerText;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    noAnswerText = jsxProd_default(Text, {
      children: NO_USABLE_ANSWER_TEXT,
    });
    $[4] = noAnswerText;
  } else noAnswerText = $[4];
  let bylineElement;
  if ($[5] !== childrenText) {
    bylineElement = jsxProd_default_2(Byline, {
      children: [childrenText, noAnswerText],
    });
    $[5] = childrenText;
    $[6] = bylineElement;
  } else bylineElement = $[6];
  return bylineElement;
}
//@ chunk-wjygkcr4.js:154996-155866 placement
/**
 * 被 auto mode 拦截的工具调用说明（含文档链接、/permissions）。
 */
function AutoModeBlockedMessage(props) {
  let $ = useMemoCache(16);
  let { toolUseId, content } = props;
  let toolUseIds;
  if ($[0] !== toolUseId) {
    toolUseIds = [toolUseId];
    $[0] = toolUseId;
    $[1] = toolUseIds;
  } else toolUseIds = $[1];
  let [rowElement, hasDenial] = useFrozenValue(useHasAutoModeDenialFor(toolUseIds));
  let linkElement;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    linkElement = jsxProd_default(Link, {
      url: "https://code.claude.com/docs/s/claude-code-auto-mode",
    });
    $[2] = linkElement;
  } else linkElement = $[2];
  let messageElement = linkElement;
  let denialReason;
  if ($[3] !== content) {
    denialReason = extractClassifierDenialReason(stripAnsiPerLine(content));
    $[3] = content;
    $[4] = denialReason;
  } else denialReason = $[4];
  let containerElement = denialReason;
  let bulletElement;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    bulletElement = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [BULLET_OPERATOR, " "],
    });
    $[5] = bulletElement;
  } else bulletElement = $[5];
  let statusIcon;
  if ($[6] !== hasDenial) {
    statusIcon =
      !isRemoteSessionAvailable() &&
      hasDenial &&
      jsxProd_default_2(Fragment, {
        children: [
          "/permissions to review ",
          jsxProd_default_2(Text, {
            "aria-hidden": true,
            children: [BULLET_OPERATOR, " "],
          }),
        ],
      });
    $[6] = hasDenial;
    $[7] = statusIcon;
  } else statusIcon = $[7];
  let labelElement;
  if ($[8] !== statusIcon) {
    labelElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Blocked by auto mode ", bulletElement, statusIcon, "see ", messageElement],
    });
    $[8] = statusIcon;
    $[9] = labelElement;
  } else labelElement = $[9];
  let errorContainer;
  if ($[10] !== containerElement) {
    errorContainer =
      containerElement &&
      jsxProd_default(DenialReasonQuote, {
        label: AUTO_MODE_PREFIX,
        reason: containerElement,
      });
    $[10] = containerElement;
    $[11] = errorContainer;
  } else errorContainer = $[11];
  let messageResponseElement;
  if ($[12] !== labelElement || $[13] !== errorContainer || $[14] !== rowElement) {
    messageResponseElement = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        ref: rowElement,
        flexDirection: "column",
        children: [labelElement, errorContainer],
      }),
    });
    $[12] = labelElement;
    $[13] = errorContainer;
    $[14] = rowElement;
    $[15] = messageResponseElement;
  } else messageResponseElement = $[15];
  return messageResponseElement;
}
//@ chunk-wjygkcr4.js:155866-157646 fingerprint (2.1.88 match: UserToolErrorMessage, 0.416)
function UserToolErrorMessage(props) {
  let $ = useMemoCache(23);
  let {
    progressMessagesForMessage,
    tool,
    tools,
    param,
    input,
    output,
    toolDenialKind,
    remoteToolDenialKind,
    toolDenialMonitorBlocked,
    verbose,
    isTranscriptMode,
  } = props;
  let activeAgents = useAppStateSlice(selectActiveAgents_3);
  let kinds = {
    toolDenialKind,
    remoteToolDenialKind,
  };
  let isDenial = isToolDenial(param.content, kinds, USER_REJECTED_KIND);
  if (
    isToolDenial(param.content, kinds, INTERRUPTED_TOOL_STATUSES) &&
    typeof param.content === "string" &&
    (param.content.includes(INTERRUPT_MESSAGE_FOR_TOOL_USE) ||
      param.content.includes(TOOL_CALL_ENDED_FOR_DELIVERY) ||
      param.content.includes(TOOL_CALL_SESSION_ENDED) ||
      param.content.includes(TOOL_RESULT_NOT_IN_COPY) ||
      param.content.includes(AGENT_CALL_PROCESS_STOPPED))
  ) {
    let t1;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(RejectedToolUseMessage, {});
      $[0] = t1;
    } else t1 = $[0];
    return t1;
  }
  if (isDenial && typeof param.content === "string" && param.content.startsWith(PLAN_REJECTION_PREFIX)) {
    let t1;
    if ($[1] !== param.content) {
      t1 = param.content.substring(PLAN_REJECTION_PREFIX.length);
      $[1] = param.content;
      $[2] = t1;
    } else t1 = $[2];
    let planContent = t1;
    let t2;
    if ($[3] !== planContent) {
      t2 = jsxProd_default(RejectedPlanMessage, {
        plan: planContent,
      });
      $[3] = planContent;
      $[4] = t2;
    } else t2 = $[4];
    return t2;
  }
  if (
    isDenial &&
    typeof param.content === "string" &&
    param.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)
  ) {
    let t1;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(ToolUseRejectedLine, {});
      $[5] = t1;
    } else t1 = $[5];
    return t1;
  }
  if (typeof param.content === "string" && isAutoModeBlockedResult(param.content, kinds)) {
    let autoModeBlockedMessageElement;
    if ($[6] !== param.content || $[7] !== param.tool_use_id) {
      autoModeBlockedMessageElement = jsxProd_default(AutoModeBlockedMessage, {
        toolUseId: param.tool_use_id,
        content: param.content,
      });
      $[6] = param.content;
      $[7] = param.tool_use_id;
      $[8] = autoModeBlockedMessageElement;
    } else autoModeBlockedMessageElement = $[8];
    return autoModeBlockedMessageElement;
  }
  if (
    (isAutoModeUnavailableKind(toolDenialKind, toolDenialMonitorBlocked) ||
      isAutoModeUnavailableResult(param.content, kinds)) &&
    !verbose &&
    isTranscriptMode !== true
  ) {
    let notRunLineElement;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      notRunLineElement = jsxProd_default(NotRunLine, {});
      $[9] = notRunLineElement;
    } else notRunLineElement = $[9];
    let messageResponseElement;
    if ($[10] === MEMO_CACHE_SENTINEL) {
      messageResponseElement = jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "wrap",
          children: [notRunLineElement, " ", jsxProd_default(CtrlOToExpand, {})],
        }),
      });
      $[10] = messageResponseElement;
    } else messageResponseElement = $[10];
    return messageResponseElement;
  }
  let isInterrupted;
  if (
    $[11] !== activeAgents ||
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
    let message =
      tool && !hasHostField(input) ? mcpRenderOverrideFor(tool, "renderToolUseErrorMessage") : undefined;
    isInterrupted =
      message?.(param.content, {
        progressMessagesForMessage: filterToolProgressMessages(progressMessagesForMessage),
        tools,
        verbose,
        isTranscriptMode,
        input,
        output,
        activeAgents,
        toolDenialKind: toolDenialKind ?? remoteToolDenialKind,
      }) ??
      jsxProd_default(FallbackToolUseErrorMessage, {
        result: param.content,
        verbose,
      });
    $[11] = activeAgents;
    $[12] = input;
    $[13] = isTranscriptMode;
    $[14] = output;
    $[15] = param.content;
    $[16] = progressMessagesForMessage;
    $[17] = remoteToolDenialKind;
    $[18] = tool;
    $[19] = toolDenialKind;
    $[20] = tools;
    $[21] = verbose;
    $[22] = isInterrupted;
  } else isInterrupted = $[22];
  return isInterrupted;
}
export { UserToolErrorMessage, isAutoModeUnavailableKind, NotRunLine };
