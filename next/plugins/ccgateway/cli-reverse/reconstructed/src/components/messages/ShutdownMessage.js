/**
 * components/messages/ShutdownMessage.tsx
 *
 * 队友关停请求消息显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/ShutdownMessage.tsx
 * pieces: chunk-ah34pb7m.js (3), chunk-bwbq4xvm.js (1), chunk-kf9b436m.js (1)
 * attribution: placement 3, fingerprint 2
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  UNKNOWN_SENDER,
  capFrameBodyForDisplay,
  IDLE_SUMMARY_RECEIVE_BOUND,
  parseFrameForDisplay,
  ShutdownRequestMessageSchema,
  capRawFrameTextForDisplay,
  withShutdownReplyInstructions,
  ShutdownApprovedMessageSchema,
  ShutdownRejectedMessageSchema,
} from "../../utils/teammateMailbox.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:760324-760384 fingerprint = tryRenderShutdownMessage (0.663)
function tryRenderShutdownMessage(request, originator, response) {
  return {
    request,
    originator,
    response,
  };
}
//@ chunk-kf9b436m.js:303-739 fingerprint = ShutdownRequestDisplay (0.704)
function ShutdownRequestDisplay(props) {
  let $ = useMemoCache(10);
  let { children, color, title } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  const borderStyle = isScreenReaderEnabled ? undefined : "round";
  const paddingX = isScreenReaderEnabled ? 0 : 1;
  const gap = title ? 1 : 0;
  let titleElement;
  if ($[0] !== color || $[1] !== title) {
    titleElement =
      title &&
      jsxProd_default(Text, {
        bold: true,
        color,
        children: title,
      });
    $[0] = color;
    $[1] = title;
    $[2] = titleElement;
  } else titleElement = $[2];
  let dialogBox;
  if (
    $[3] !== children ||
    $[4] !== color ||
    $[5] !== borderStyle ||
    $[6] !== paddingX ||
    $[7] !== gap ||
    $[8] !== titleElement
  ) {
    dialogBox = jsxProd_default_2(Box, {
      borderStyle,
      borderColor: color,
      flexDirection: "column",
      paddingX,
      gap,
      children: [titleElement, children],
    });
    $[3] = children;
    $[4] = color;
    $[5] = borderStyle;
    $[6] = paddingX;
    $[7] = gap;
    $[8] = titleElement;
    $[9] = dialogBox;
  } else dialogBox = $[9];
  return dialogBox;
}
//@ chunk-ah34pb7m.js:81968-82563 placement
/**
 * 队友关闭请求消息（发送方、原因、回复说明）。
 */
function ShutdownRequestMessage(content) {
  let $ = useMemoCache(12);
  let { request, senderName, replyInstructions } = content;
  let sender = senderName || UNKNOWN_SENDER;
  let reasonText;
  if ($[0] !== request.reason) {
    reasonText = capFrameBodyForDisplay(request.reason, IDLE_SUMMARY_RECEIVE_BOUND);
    $[0] = request.reason;
    $[1] = reasonText;
  } else reasonText = $[1];
  let cappedReason = reasonText;
  const title = `Shutdown request from ${sender}`;
  let children;
  if ($[2] !== cappedReason) {
    children =
      cappedReason &&
      jsxProd_default_2(Text, {
        children: ["Reason: ", cappedReason],
      });
    $[2] = cappedReason;
    $[3] = children;
  } else children = $[3];
  let shutdownRequestDisplayElement;
  if ($[4] !== title || $[5] !== children) {
    shutdownRequestDisplayElement = jsxProd_default(ShutdownRequestDisplay, {
      color: "warning",
      title,
      children,
    });
    $[4] = title;
    $[5] = children;
    $[6] = shutdownRequestDisplayElement;
  } else shutdownRequestDisplayElement = $[6];
  let replyElement;
  if ($[7] !== replyInstructions) {
    replyElement =
      replyInstructions &&
      jsxProd_default(Text, {
        dimColor: true,
        children: replyInstructions,
      });
    $[7] = replyInstructions;
    $[8] = replyElement;
  } else replyElement = $[8];
  let boxElement;
  if ($[9] !== shutdownRequestDisplayElement || $[10] !== replyElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginY: 1,
      children: [shutdownRequestDisplayElement, replyElement],
    });
    $[9] = shutdownRequestDisplayElement;
    $[10] = replyElement;
    $[11] = boxElement;
  } else boxElement = $[11];
  return boxElement;
}
//@ chunk-ah34pb7m.js:82563-83141 placement
/**
 * 队友拒绝关闭的消息。
 */
function ShutdownRejectedMessage(props) {
  let $ = useMemoCache(8);
  let { response, senderName } = props;
  let sender = senderName || UNKNOWN_SENDER;
  let reasonText;
  if ($[0] !== response.reason) {
    reasonText = capFrameBodyForDisplay(response.reason, IDLE_SUMMARY_RECEIVE_BOUND);
    $[0] = response.reason;
    $[1] = reasonText;
  } else reasonText = $[1];
  let cappedRejectReason = reasonText;
  const title = `Shutdown rejected by ${sender}`;
  let t2;
  if ($[2] !== cappedRejectReason) {
    t2 = jsxProd_default(DiffFrame, {
      children: jsxProd_default_2(Text, {
        children: ["Reason: ", cappedRejectReason],
      }),
    });
    $[2] = cappedRejectReason;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default(Text, {
      dimColor: true,
      children: "Teammate is continuing to work. You may request shutdown again later.",
    });
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== title || $[6] !== t2) {
    t4 = jsxProd_default(Box, {
      flexDirection: "column",
      marginY: 1,
      children: jsxProd_default_2(ShutdownRequestDisplay, {
        color: "subtle",
        title,
        children: [t2, t3],
      }),
    });
    $[5] = title;
    $[6] = t2;
    $[7] = t4;
  } else t4 = $[7];
  return t4;
}
//@ chunk-ah34pb7m.js:83141-83471 placement = tryRenderPlanApprovalMessage (0.786)
/**
 * 解析文本是否为关闭请求/拒绝，返回对应组件。
 */
function renderShutdownMessage(content, senderName) {
  let index = content.indexOf(`

`);
  let body = index === -1 ? content : content.slice(0, index);
  let frameForDisplay = parseFrameForDisplay(ShutdownRequestMessageSchema(), body);
  if (frameForDisplay && body === content)
    return jsxProd_default(ShutdownRequestMessage, {
      request: frameForDisplay,
      senderName,
    });
  if (
    frameForDisplay &&
    capRawFrameTextForDisplay(body, senderName) === body &&
    withShutdownReplyInstructions(body, senderName) === content
  )
    return jsxProd_default(ShutdownRequestMessage, {
      request: frameForDisplay,
      senderName,
      replyInstructions: content.slice(index + 2),
    });
  if (parseFrameForDisplay(ShutdownApprovedMessageSchema(), content)) return null;
  let response = parseFrameForDisplay(ShutdownRejectedMessageSchema(), content);
  if (response)
    return jsxProd_default(ShutdownRejectedMessage, {
      response,
      senderName,
    });
  return null;
}
export { tryRenderShutdownMessage, ShutdownRequestDisplay, renderShutdownMessage };
