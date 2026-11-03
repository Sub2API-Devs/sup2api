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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";

//@ chunk-ah34pb7m.js:81968-82563 placement
/**
 * 队友关闭请求消息（发送方、原因、回复说明）。
 */
function ShutdownRequestMessage(content) {
  let $ = w(12);
  let { request, senderName, replyInstructions } = content;
  let f = senderName || UNKNOWN_SENDER;
  let M;
  if ($[0] !== request.reason) {
    M = capFrameBodyForDisplay(request.reason, IDLE_SUMMARY_RECEIVE_BOUND);
    $[0] = request.reason;
    $[1] = M;
  } else M = $[1];
  let T = M;
  const title = `Shutdown request from ${f}`;
  let children;
  if ($[2] !== T) {
    children =
      T &&
      jsxProd_default_2(Text, {
        children: ["Reason: ", T],
      });
    $[2] = T;
    $[3] = children;
  } else children = $[3];
  let b;
  if ($[4] !== title || $[5] !== children) {
    b = jsxProd_default(ShutdownRequestDisplay, {
      color: "warning",
      title,
      children,
    });
    $[4] = title;
    $[5] = children;
    $[6] = b;
  } else b = $[6];
  let E;
  if ($[7] !== replyInstructions) {
    E =
      replyInstructions &&
      jsxProd_default(Text, {
        dimColor: true,
        children: replyInstructions,
      });
    $[7] = replyInstructions;
    $[8] = E;
  } else E = $[8];
  let B;
  if ($[9] !== b || $[10] !== E) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginY: 1,
      children: [b, E],
    });
    $[9] = b;
    $[10] = E;
    $[11] = B;
  } else B = $[11];
  return B;
}
//@ chunk-ah34pb7m.js:82563-83141 placement
/**
 * 队友拒绝关闭的消息。
 */
function ShutdownRejectedMessage(props) {
  let $ = w(8);
  let { response, senderName } = props;
  let g = senderName || UNKNOWN_SENDER;
  let h;
  if ($[0] !== response.reason) {
    h = capFrameBodyForDisplay(response.reason, IDLE_SUMMARY_RECEIVE_BOUND);
    $[0] = response.reason;
    $[1] = h;
  } else h = $[1];
  let M = h;
  const title = `Shutdown rejected by ${g}`;
  let t2;
  if ($[2] !== M) {
    t2 = jsxProd_default(DiffFrame, {
      children: jsxProd_default_2(Text, {
        children: ["Reason: ", M],
      }),
    });
    $[2] = M;
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
  let g = index === -1 ? content : content.slice(0, index);
  let frameForDisplay = parseFrameForDisplay(ShutdownRequestMessageSchema(), g);
  if (frameForDisplay && g === content)
    return jsxProd_default(ShutdownRequestMessage, {
      request: frameForDisplay,
      senderName,
    });
  if (
    frameForDisplay &&
    capRawFrameTextForDisplay(g, senderName) === g &&
    withShutdownReplyInstructions(g, senderName) === content
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
  let $ = w(10);
  let { children, color, title } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  const borderStyle = isScreenReaderEnabled ? undefined : "round";
  const paddingX = isScreenReaderEnabled ? 0 : 1;
  const gap = title ? 1 : 0;
  let c;
  if ($[0] !== color || $[1] !== title) {
    c =
      title &&
      jsxProd_default(Text, {
        bold: true,
        color,
        children: title,
      });
    $[0] = color;
    $[1] = title;
    $[2] = c;
  } else c = $[2];
  let y;
  if (
    $[3] !== children ||
    $[4] !== color ||
    $[5] !== borderStyle ||
    $[6] !== paddingX ||
    $[7] !== gap ||
    $[8] !== c
  ) {
    y = jsxProd_default_2(Box, {
      borderStyle,
      borderColor: color,
      flexDirection: "column",
      paddingX,
      gap,
      children: [c, children],
    });
    $[3] = children;
    $[4] = color;
    $[5] = borderStyle;
    $[6] = paddingX;
    $[7] = gap;
    $[8] = c;
    $[9] = y;
  } else y = $[9];
  return y;
}
export { tryRenderShutdownMessage, ShutdownRequestDisplay, renderShutdownMessage };
