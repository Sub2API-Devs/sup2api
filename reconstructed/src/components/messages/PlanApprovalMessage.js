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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  let $ = w(12);
  let { request, senderName } = props;
  let g = senderName || UNKNOWN_SENDER;
  let h;
  if ($[0] !== request.planFilePath) {
    h = capIdFrameField(request.planFilePath, IDLE_ID_FIELD_RECEIVE_BOUND);
    $[0] = request.planFilePath;
    $[1] = h;
  } else h = $[1];
  let M = h;
  let T;
  if ($[2] !== request.planContent) {
    T = capFrameBodyForDisplay(request.planContent, PLAN_CONTENT_DISPLAY_BOUND);
    $[2] = request.planContent;
    $[3] = T;
  } else T = $[3];
  let children = T;
  const title = `Plan Approval Request from ${g}`;
  let b;
  if ($[4] !== children) {
    b = jsxProd_default(DiffFrame, {
      children: jsxProd_default(MarkdownText_2, {
        stripPromptTags: false,
        children,
      }),
    });
    $[4] = children;
    $[5] = b;
  } else b = $[5];
  let E;
  if ($[6] !== M) {
    E = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Plan file: ", M],
    });
    $[6] = M;
    $[7] = E;
  } else E = $[7];
  let B;
  if ($[8] !== title || $[9] !== b || $[10] !== E) {
    B = jsxProd_default(Box, {
      flexDirection: "column",
      marginY: 1,
      children: jsxProd_default_2(ShutdownRequestDisplay, {
        color: "planMode",
        title,
        children: [b, E],
      }),
    });
    $[8] = title;
    $[9] = b;
    $[10] = E;
    $[11] = B;
  } else B = $[11];
  return B;
}
//@ chunk-ah34pb7m.js:85037-86383 callgraph-fingerprint = PlanApprovalResponseDisplay (0.272)
function PlanApprovalResponseDisplay(props) {
  let $ = w(20);
  let { response, senderName } = props;
  let f;
  if ($[0] !== response.feedback) {
    f = capFrameBodyForDisplay(response.feedback, IDLE_RESULT_MAX_LENGTH);
    $[0] = response.feedback;
    $[1] = f;
  } else f = $[1];
  let h = f;
  let M = senderName || UNKNOWN_SENDER;
  if (response.approved) {
    let T;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      T = jsxProd_default(Text, {
        "aria-hidden": true,
        children: "\u2713 ",
      });
      $[2] = T;
    } else T = $[2];
    let title;
    if ($[3] !== M) {
      title = jsxProd_default_2(Text, {
        children: [T, "Plan Approved by ", M],
      });
      $[3] = M;
      $[4] = title;
    } else title = $[4];
    let k;
    if ($[5] !== h) {
      k =
        h &&
        jsxProd_default(DiffFrame, {
          children: jsxProd_default_2(Text, {
            children: ["Feedback: ", h],
          }),
        });
      $[5] = h;
      $[6] = k;
    } else k = $[6];
    let b;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      b = jsxProd_default(Text, {
        children: "You can now proceed with implementation. Your plan mode restrictions have been lifted.",
      });
      $[7] = b;
    } else b = $[7];
    let E;
    if ($[8] !== title || $[9] !== k) {
      E = jsxProd_default(Box, {
        flexDirection: "column",
        marginY: 1,
        children: jsxProd_default_2(ShutdownRequestDisplay, {
          color: "success",
          title,
          children: [k, b],
        }),
      });
      $[8] = title;
      $[9] = k;
      $[10] = E;
    } else E = $[10];
    return E;
  }
  let T;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default(Text, {
      "aria-hidden": true,
      children: "\u2717 ",
    });
    $[11] = T;
  } else T = $[11];
  let title;
  if ($[12] !== M) {
    title = jsxProd_default_2(Text, {
      children: [T, "Plan Rejected by ", M],
    });
    $[12] = M;
    $[13] = title;
  } else title = $[13];
  let k;
  if ($[14] !== h) {
    k =
      h &&
      jsxProd_default(DiffFrame, {
        children: jsxProd_default_2(Text, {
          children: ["Feedback: ", h],
        }),
      });
    $[14] = h;
    $[15] = k;
  } else k = $[15];
  let b;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    b = jsxProd_default(Text, {
      dimColor: true,
      children: "Please revise your plan based on the feedback and call ExitPlanMode again.",
    });
    $[16] = b;
  } else b = $[16];
  let E;
  if ($[17] !== title || $[18] !== k) {
    E = jsxProd_default(Box, {
      flexDirection: "column",
      marginY: 1,
      children: jsxProd_default_2(ShutdownRequestDisplay, {
        color: "error",
        title,
        children: [k, b],
      }),
    });
    $[17] = title;
    $[18] = k;
    $[19] = E;
  } else E = $[19];
  return E;
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
