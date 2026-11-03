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
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../MessageResponse.js";
import { Text, Link, Box } from "../../../ink/components/Text.js";
import { plural } from "../../../utils/stringUtils.js";
import { Byline } from "../../design-system/Byline.js";
import { useFrozenValue } from "../../FreezeWhenOffscreen.js";
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
import { stripAnsiPerLine } from "../../../utils/stripAnsi.js";
import { BULLET_OPERATOR } from "../../../utils/permissions/autoModeRulesPrompt.js";
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

//@ chunk-ah34pb7m.js:152699-152842 placement
function ToolUseRejectedLine() {
  let m = w(1);
  let d;
  if (m[0] === MEMO_CACHE_SENTINEL) {
    d = jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "Tool use rejected",
      }),
    });
    m[0] = d;
  } else d = m[0];
  return d;
}
//@ chunk-ah34pb7m.js:152842-152896 placement
function selectActiveAgents_3(X) {
  return X.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:152896-152986 placement
function isAutoModeUnavailableKind(toolDenialKind, toolDenialMonitorBlocked) {
  return (
    (toolDenialKind === "automode-unavailable" || toolDenialKind === "automode-parsing-error") &&
    toolDenialMonitorBlocked !== true
  );
}
//@ chunk-ah34pb7m.js:152986-153361 placement
/**
 * "N actions not run" 行。
 */
function NotRunLine(props) {
  let c = w(7);
  let { callCount } = props;
  let children;
  if (c[0] !== callCount) {
    children = callCount === undefined ? "Not run" : `${callCount} ${plural(callCount, "action")} not run`;
    c[0] = callCount;
    c[1] = children;
  } else children = c[1];
  let f;
  if (c[2] !== children) {
    f = jsxProd_default(Text, {
      children,
    });
    c[2] = children;
    c[3] = f;
  } else f = c[3];
  let h;
  if (c[4] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(Text, {
      children: "auto mode's check had no usable answer",
    });
    c[4] = h;
  } else h = c[4];
  let M;
  if (c[5] !== f) {
    M = jsxProd_default_2(Byline, {
      children: [f, h],
    });
    c[5] = f;
    c[6] = M;
  } else M = c[6];
  return M;
}
//@ chunk-ah34pb7m.js:153361-154230 placement
/**
 * 被 auto mode 拦截的工具调用说明（含文档链接、/permissions）。
 */
function AutoModeBlockedMessage(props) {
  let g = w(16);
  let { toolUseId, content } = props;
  let f;
  if (g[0] !== toolUseId) {
    f = [toolUseId];
    g[0] = toolUseId;
    g[1] = f;
  } else f = g[1];
  let [h, M] = useFrozenValue(useHasAutoModeDenialFor(f));
  let T;
  if (g[2] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default(Link, {
      url: "https://code.claude.com/docs/s/claude-code-auto-mode",
    });
    g[2] = T;
  } else T = g[2];
  let x = T;
  let k;
  if (g[3] !== content) {
    k = extractClassifierDenialReason(stripAnsiPerLine(content));
    g[3] = content;
    g[4] = k;
  } else k = g[4];
  let b = k;
  let E;
  if (g[5] === MEMO_CACHE_SENTINEL) {
    E = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [BULLET_OPERATOR, " "],
    });
    g[5] = E;
  } else E = g[5];
  let B;
  if (g[6] !== M) {
    B =
      !isRemoteSessionAvailable() &&
      M &&
      jsxProd_default_2(Fragment, {
        children: [
          "/permissions to review ",
          jsxProd_default_2(Text, {
            "aria-hidden": true,
            children: [BULLET_OPERATOR, " "],
          }),
        ],
      });
    g[6] = M;
    g[7] = B;
  } else B = g[7];
  let L;
  if (g[8] !== B) {
    L = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Blocked by auto mode ", E, B, "see ", x],
    });
    g[8] = B;
    g[9] = L;
  } else L = g[9];
  let N;
  if (g[10] !== b) {
    N =
      b &&
      jsxProd_default(DenialReasonQuote, {
        label: AUTO_MODE_PREFIX,
        reason: b,
      });
    g[10] = b;
    g[11] = N;
  } else N = g[11];
  let W;
  if (g[12] !== L || g[13] !== N || g[14] !== h) {
    W = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        ref: h,
        flexDirection: "column",
        children: [L, N],
      }),
    });
    g[12] = L;
    g[13] = N;
    g[14] = h;
    g[15] = W;
  } else W = g[15];
  return W;
}
//@ chunk-ah34pb7m.js:154230-156010 fingerprint = UserToolErrorMessage (0.405)
function UserToolErrorMessage(props) {
  let $ = w(23);
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
  let L = {
    toolDenialKind,
    remoteToolDenialKind,
  };
  let N = isToolDenial(param.content, L, USER_REJECTED_KIND);
  if (
    isToolDenial(param.content, L, INTERRUPTED_TOOL_STATUSES) &&
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
  if (N && typeof param.content === "string" && param.content.startsWith(PLAN_REJECTION_PREFIX)) {
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
  if (N && typeof param.content === "string" && param.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)) {
    let t1;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(ToolUseRejectedLine, {});
      $[5] = t1;
    } else t1 = $[5];
    return t1;
  }
  if (typeof param.content === "string" && isAutoModeBlockedResult(param.content, L)) {
    let U;
    if ($[6] !== param.content || $[7] !== param.tool_use_id) {
      U = jsxProd_default(AutoModeBlockedMessage, {
        toolUseId: param.tool_use_id,
        content: param.content,
      });
      $[6] = param.content;
      $[7] = param.tool_use_id;
      $[8] = U;
    } else U = $[8];
    return U;
  }
  if (
    (isAutoModeUnavailableKind(toolDenialKind, toolDenialMonitorBlocked) ||
      isAutoModeUnavailableResult(param.content, L)) &&
    !verbose &&
    isTranscriptMode !== true
  ) {
    let U;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      U = jsxProd_default(NotRunLine, {});
      $[9] = U;
    } else U = $[9];
    let V;
    if ($[10] === MEMO_CACHE_SENTINEL) {
      V = jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "wrap",
          children: [U, " ", jsxProd_default(CtrlOToExpand, {})],
        }),
      });
      $[10] = V;
    } else V = $[10];
    return V;
  }
  let U;
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
    let Y =
      tool && !hasHostField(input) ? mcpRenderOverrideFor(tool, "renderToolUseErrorMessage") : undefined;
    U =
      Y?.(param.content, {
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
    $[22] = U;
  } else U = $[22];
  return U;
}
export { UserToolErrorMessage, isAutoModeUnavailableKind, NotRunLine };
