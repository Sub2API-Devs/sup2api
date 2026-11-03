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
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";

/**
 * 队友关闭请求消息（发送方、原因、回复说明）。
 */
//@ chunk-ah34pb7m.js:81968-82563 placement
function ShutdownRequestMessage(content) {
  let $ = w(12),
    { request: request, senderName: senderName, replyInstructions: replyInstructions } = content,
    f = senderName || UNKNOWN_SENDER,
    M;
  if ($[0] !== request.reason)
    ((M = capFrameBodyForDisplay(request.reason, IDLE_SUMMARY_RECEIVE_BOUND)),
      ($[0] = request.reason),
      ($[1] = M));
  else M = $[1];
  let T = M;
  const x = `Shutdown request from ${f}`;
  let k;
  if ($[2] !== T) ((k = T && r(Text, { children: ["Reason: ", T] })), ($[2] = T), ($[3] = k));
  else k = $[3];
  let b;
  if ($[4] !== x || $[5] !== k)
    ((b = e(ShutdownRequestDisplay, { color: "warning", title: x, children: k })),
      ($[4] = x),
      ($[5] = k),
      ($[6] = b));
  else b = $[6];
  let E;
  if ($[7] !== replyInstructions)
    ((E = replyInstructions && e(Text, { dimColor: !0, children: replyInstructions })),
      ($[7] = replyInstructions),
      ($[8] = E));
  else E = $[8];
  let B;
  if ($[9] !== b || $[10] !== E)
    ((B = r(Box, { flexDirection: "column", marginY: 1, children: [b, E] })),
      ($[9] = b),
      ($[10] = E),
      ($[11] = B));
  else B = $[11];
  return B;
}
/**
 * 队友拒绝关闭的消息。
 */
//@ chunk-ah34pb7m.js:82563-83141 placement
function ShutdownRejectedMessage(t0) {
  let f = w(8),
    { response: response, senderName: senderName } = t0,
    g = senderName || UNKNOWN_SENDER,
    h;
  if (f[0] !== response.reason)
    ((h = capFrameBodyForDisplay(response.reason, IDLE_SUMMARY_RECEIVE_BOUND)),
      (f[0] = response.reason),
      (f[1] = h));
  else h = f[1];
  let M = h;
  const T = `Shutdown rejected by ${g}`;
  let x;
  if (f[2] !== M)
    ((x = e(DiffFrame, { children: r(Text, { children: ["Reason: ", M] }) })), (f[2] = M), (f[3] = x));
  else x = f[3];
  let k;
  if (f[4] === MEMO_CACHE_SENTINEL)
    ((k = e(Text, {
      dimColor: !0,
      children: "Teammate is continuing to work. You may request shutdown again later.",
    })),
      (f[4] = k));
  else k = f[4];
  let b;
  if (f[5] !== T || f[6] !== x)
    ((b = e(Box, {
      flexDirection: "column",
      marginY: 1,
      children: r(ShutdownRequestDisplay, { color: "subtle", title: T, children: [x, k] }),
    })),
      (f[5] = T),
      (f[6] = x),
      (f[7] = b));
  else b = f[7];
  return b;
}
/**
 * 解析文本是否为关闭请求/拒绝，返回对应组件。
 */
//@ chunk-ah34pb7m.js:83141-83471 placement = tryRenderPlanApprovalMessage (0.786)
function renderShutdownMessage(content, senderName) {
  let index = content.indexOf(`

`),
    g = index === -1 ? content : content.slice(0, index),
    f = parseFrameForDisplay(ShutdownRequestMessageSchema(), g);
  if (f && g === content) return e(ShutdownRequestMessage, { request: f, senderName: senderName });
  if (
    f &&
    capRawFrameTextForDisplay(g, senderName) === g &&
    withShutdownReplyInstructions(g, senderName) === content
  )
    return e(ShutdownRequestMessage, {
      request: f,
      senderName: senderName,
      replyInstructions: content.slice(index + 2),
    });
  if (parseFrameForDisplay(ShutdownApprovedMessageSchema(), content)) return null;
  let h = parseFrameForDisplay(ShutdownRejectedMessageSchema(), content);
  if (h) return e(ShutdownRejectedMessage, { response: h, senderName: senderName });
  return null;
}
//@ chunk-bwbq4xvm.js:760324-760384 fingerprint = tryRenderShutdownMessage (0.663)
function tryRenderShutdownMessage(e, s, n) {
  return { request: e, originator: s, response: n };
}
//@ chunk-kf9b436m.js:303-739 fingerprint = ShutdownRequestDisplay (0.704)
function ShutdownRequestDisplay(t0) {
  let $ = w(10),
    { children: children, color: color, title: title } = t0,
    f = useIsScreenReaderEnabled();
  const l = f ? void 0 : "round",
    m = f ? 0 : 1,
    a = title ? 1 : 0;
  let c;
  if ($[0] !== color || $[1] !== title)
    ((c = title && e(Text, { bold: !0, color: color, children: title })),
      ($[0] = color),
      ($[1] = title),
      ($[2] = c));
  else c = $[2];
  let y;
  if ($[3] !== children || $[4] !== color || $[5] !== l || $[6] !== m || $[7] !== a || $[8] !== c)
    ((y = r(Box, {
      borderStyle: l,
      borderColor: color,
      flexDirection: "column",
      paddingX: m,
      gap: a,
      children: [c, children],
    })),
      ($[3] = children),
      ($[4] = color),
      ($[5] = l),
      ($[6] = m),
      ($[7] = a),
      ($[8] = c),
      ($[9] = y));
  else y = $[9];
  return y;
}

export { tryRenderShutdownMessage, ShutdownRequestDisplay, renderShutdownMessage };
