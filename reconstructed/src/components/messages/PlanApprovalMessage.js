/**
 * components/messages/PlanApprovalMessage.tsx
 *
 * 队友计划审批请求/响应的显示（Plan Approval Request / Plan Approved / 反馈）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/PlanApprovalMessage.tsx
 * pieces: chunk-ah34pb7m.js (3)
 * attribution: fingerprint 2, callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  UNKNOWN_SENDER,
  capIdFrameField,
  IDLE_ID_FIELD_RECEIVE_BOUND,
  capFrameBodyForDisplay,
  PLAN_CONTENT_DISPLAY_BOUND,
  IDLE_RESULT_MAX_LENGTH,
  parseFrameForDisplay,
  PlanApprovalRequestMessageSchema,
  PlanApprovalResponseMessageSchema,
} from "../../utils/teammateMailbox.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ShutdownRequestDisplay } from "./ShutdownMessage.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-ah34pb7m.js:84356-85037 fingerprint = PlanApprovalRequestDisplay (0.377)
function PlanApprovalRequestDisplay(props) {
  let $ = useMemoCache(12);
  let { request, senderName } = props;
  let sender = senderName || UNKNOWN_SENDER;
  let filePath;
  if ($[0] !== request.planFilePath) {
    filePath = capIdFrameField(request.planFilePath, IDLE_ID_FIELD_RECEIVE_BOUND);
    $[0] = request.planFilePath;
    $[1] = filePath;
  } else filePath = $[1];
  let cappedFilePath = filePath;
  let planBody;
  if ($[2] !== request.planContent) {
    planBody = capFrameBodyForDisplay(request.planContent, PLAN_CONTENT_DISPLAY_BOUND);
    $[2] = request.planContent;
    $[3] = planBody;
  } else planBody = $[3];
  let children = planBody;
  const title = `Plan Approval Request from ${sender}`;
  let diffFrameElement;
  if ($[4] !== children) {
    diffFrameElement = jsxProd_default(DiffFrame, {
      children: jsxProd_default(MarkdownText_2, {
        stripPromptTags: false,
        children,
      }),
    });
    $[4] = children;
    $[5] = diffFrameElement;
  } else diffFrameElement = $[5];
  let textElement;
  if ($[6] !== cappedFilePath) {
    textElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Plan file: ", cappedFilePath],
    });
    $[6] = cappedFilePath;
    $[7] = textElement;
  } else textElement = $[7];
  let boxElement;
  if ($[8] !== title || $[9] !== diffFrameElement || $[10] !== textElement) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      marginY: 1,
      children: jsxProd_default_2(ShutdownRequestDisplay, {
        color: "planMode",
        title,
        children: [diffFrameElement, textElement],
      }),
    });
    $[8] = title;
    $[9] = diffFrameElement;
    $[10] = textElement;
    $[11] = boxElement;
  } else boxElement = $[11];
  return boxElement;
}
//@ chunk-ah34pb7m.js:85037-86383 callgraph-fingerprint = PlanApprovalResponseDisplay (0.272)
function PlanApprovalResponseDisplay(props) {
  let $ = useMemoCache(20);
  let { response, senderName } = props;
  let feedbackText;
  if ($[0] !== response.feedback) {
    feedbackText = capFrameBodyForDisplay(response.feedback, IDLE_RESULT_MAX_LENGTH);
    $[0] = response.feedback;
    $[1] = feedbackText;
  } else feedbackText = $[1];
  let cappedFeedback = feedbackText;
  let sender = senderName || UNKNOWN_SENDER;
  if (response.approved) {
    let checkMark;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      checkMark = jsxProd_default(Text, {
        "aria-hidden": true,
        children: "\u2713 ",
      });
      $[2] = checkMark;
    } else checkMark = $[2];
    let title;
    if ($[3] !== sender) {
      title = jsxProd_default_2(Text, {
        children: [checkMark, "Plan Approved by ", sender],
      });
      $[3] = sender;
      $[4] = title;
    } else title = $[4];
    let feedbackText;
    if ($[5] !== cappedFeedback) {
      feedbackText =
        cappedFeedback &&
        jsxProd_default(DiffFrame, {
          children: jsxProd_default_2(Text, {
            children: ["Feedback: ", cappedFeedback],
          }),
        });
      $[5] = cappedFeedback;
      $[6] = feedbackText;
    } else feedbackText = $[6];
    let proceedText;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      proceedText = jsxProd_default(Text, {
        children: "You can now proceed with implementation. Your plan mode restrictions have been lifted.",
      });
      $[7] = proceedText;
    } else proceedText = $[7];
    let approvedBox;
    if ($[8] !== title || $[9] !== feedbackText) {
      approvedBox = jsxProd_default(Box, {
        flexDirection: "column",
        marginY: 1,
        children: jsxProd_default_2(ShutdownRequestDisplay, {
          color: "success",
          title,
          children: [feedbackText, proceedText],
        }),
      });
      $[8] = title;
      $[9] = feedbackText;
      $[10] = approvedBox;
    } else approvedBox = $[10];
    return approvedBox;
  }
  let crossMark;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    crossMark = jsxProd_default(Text, {
      "aria-hidden": true,
      children: "\u2717 ",
    });
    $[11] = crossMark;
  } else crossMark = $[11];
  let title;
  if ($[12] !== sender) {
    title = jsxProd_default_2(Text, {
      children: [crossMark, "Plan Rejected by ", sender],
    });
    $[12] = sender;
    $[13] = title;
  } else title = $[13];
  let feedbackElement;
  if ($[14] !== cappedFeedback) {
    feedbackElement =
      cappedFeedback &&
      jsxProd_default(DiffFrame, {
        children: jsxProd_default_2(Text, {
          children: ["Feedback: ", cappedFeedback],
        }),
      });
    $[14] = cappedFeedback;
    $[15] = feedbackElement;
  } else feedbackElement = $[15];
  let reviseText;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    reviseText = jsxProd_default(Text, {
      dimColor: true,
      children: "Please revise your plan based on the feedback and call ExitPlanMode again.",
    });
    $[16] = reviseText;
  } else reviseText = $[16];
  let rejectedBox;
  if ($[17] !== title || $[18] !== feedbackElement) {
    rejectedBox = jsxProd_default(Box, {
      flexDirection: "column",
      marginY: 1,
      children: jsxProd_default_2(ShutdownRequestDisplay, {
        color: "error",
        title,
        children: [feedbackElement, reviseText],
      }),
    });
    $[17] = title;
    $[18] = feedbackElement;
    $[19] = rejectedBox;
  } else rejectedBox = $[19];
  return rejectedBox;
}
//@ chunk-ah34pb7m.js:86383-86535 fingerprint = tryRenderPlanApprovalMessage (1)
function tryRenderPlanApprovalMessage(content, senderName) {
  let request = parseFrameForDisplay(PlanApprovalRequestMessageSchema(), content);
  if (request)
    return jsxProd_default(PlanApprovalRequestDisplay, {
      request,
      senderName,
    });
  let response = parseFrameForDisplay(PlanApprovalResponseMessageSchema(), content);
  if (response)
    return jsxProd_default(PlanApprovalResponseDisplay, {
      response,
      senderName,
    });
  return null;
}
export { tryRenderPlanApprovalMessage };
