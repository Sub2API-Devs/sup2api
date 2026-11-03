/**
 * commands/session/session.tsx
 *
 * 并入已有模块：/session 界面：显示会话浏览器链接与二维码（远程模式）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/session/session.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-3rb87ry3.js (10), chunk-7mtn3rbz.js (5)
 * attribution: fingerprint 2, placement 11, sole-consumer 3
 */
import { j, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL, Re } from "../../../runtime/bun-runtime.js";
import { nd } from "../../utils/stableEmptyObject.js";
import { toString, create } from "../../../vendor/qrcode/lib/server.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { wt, _C } from "../../remote/remoteMode.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Pane } from "../../components/design-system/Pane.js";
import { Sbo } from "../../../vendor/qrcode/lib/renderer/utf8.js";
import { isReplBridgeActive } from "../../bootstrap/state.js";
import { isRemoteControlOfferable } from "../../bridge/bridgeGates.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";

//@ chunk-3rb87ry3.js:5244-5248 placement
j();
//@ chunk-3rb87ry3.js:5248-5290 placement = _temp (1)
function V(s) {
  return s.remoteSessionUrl;
}
//@ chunk-3rb87ry3.js:5290-5324 placement
function H(line) {
  return line.length > 0;
}
//@ chunk-3rb87ry3.js:5324-5370 placement
function W(ie) {
  return ie
    .split(
      `
`,
    )
    .filter(H);
}
//@ chunk-3rb87ry3.js:5370-5433 placement
function Y(ne) {
  return (logForDebugging(`QR code generation failed: ${ne}`), []);
}
//@ chunk-3rb87ry3.js:5433-5476 placement
function K(b, x) {
  return e(Text, { children: b }, x);
}
/**
 * /session 界面：显示会话浏览器链接与二维码（远程模式）。
 */
//@ chunk-3rb87ry3.js:5476-7356 placement
function SessionQrDialog(g) {
  let o = w(25),
    { onDone: onDone } = g,
    i = useAppState(V),
    m = useIsScreenReaderEnabled(),
    h;
  if (o[0] === MEMO_CACHE_SENTINEL) ((h = nd(!1)), (o[0] = h));
  else h = o[0];
  let b = h,
    x;
  if (o[1] !== i)
    ((x = i ? toString(i, { type: "utf8", errorCorrectionLevel: "L", margin: 0 }).then(W).catch(Y) : null),
      (o[1] = i),
      (o[2] = x));
  else x = o[2];
  let C = x,
    B;
  if (o[3] === MEMO_CACHE_SENTINEL) ((B = { context: "Confirmation" }), (o[3] = B));
  else B = o[3];
  useKeybinding("confirm:no", onDone, B);
  let a = useGlobalExitKeybindings(onDone);
  if (!i) {
    let u;
    if (o[4] === MEMO_CACHE_SENTINEL)
      ((u = wt()
        ? e(Text, {
            children: _C("fanout")
              ? "This session's browser link isn't available from this view."
              : "This session is connected directly and has no browser link \u2014 only sessions started with `claude --cloud` can be opened in the browser.",
          })
        : e(Text, {
            color: "warning",
            children: "Not in remote mode. Start with `claude --cloud` to use this command.",
          })),
        (o[4] = u));
    else u = o[4];
    let l;
    if (o[5] !== a.keyName || o[6] !== a.pending)
      ((l = a.pending
        ? `Press ${a.keyName} again to close`
        : e(KeyboardShortcutHint, { chord: "escape", action: "close", ...b })),
        (o[5] = a.keyName),
        (o[6] = a.pending),
        (o[7] = l));
    else l = o[7];
    let c;
    if (o[8] !== l)
      ((c = r(CloudSessionPane, {
        isRedesign: !1,
        children: [u, e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, italic: !1, children: l }) })],
      })),
        (o[8] = l),
        (o[9] = c));
    else c = o[9];
    return c;
  }
  let u;
  if (o[10] === MEMO_CACHE_SENTINEL)
    ((u = e(Text, { dimColor: !0, children: "Open in browser: " })), (o[10] = u));
  else u = o[10];
  let l;
  if (o[11] !== i)
    ((l = r(Box, { children: [u, e(Text, { color: "ide", children: i })] })), (o[11] = i), (o[12] = l));
  else l = o[12];
  let c;
  if (o[13] !== a.keyName || o[14] !== a.pending)
    ((c = a.pending
      ? `Press ${a.keyName} again to cancel`
      : e(KeyboardShortcutHint, { chord: "escape", action: "cancel", parens: !0, ...b })),
      (o[13] = a.keyName),
      (o[14] = a.pending),
      (o[15] = c));
  else c = o[15];
  let D;
  if (o[16] !== c)
    ((D = e(Box, { marginBottom: 1, children: e(Text, { dimColor: !0, italic: !1, children: c }) })),
      (o[16] = c),
      (o[17] = D));
  else D = o[17];
  let P;
  if (o[18] !== m || o[19] !== C)
    ((P =
      !m &&
      C &&
      e(fo, {
        fallback: e(Text, { dimColor: !0, children: "Generating QR code\u2026" }),
        children: e(SessionQrCode, { qrLinesPromise: C }),
      })),
      (o[18] = m),
      (o[19] = C),
      (o[20] = P));
  else P = o[20];
  let v;
  if (o[21] !== l || o[22] !== D || o[23] !== P)
    ((v = r(CloudSessionPane, { isRedesign: !1, children: [l, D, P] })),
      (o[21] = l),
      (o[22] = D),
      (o[23] = P),
      (o[24] = v));
  else v = o[24];
  return v;
}
//@ chunk-3rb87ry3.js:7356-7580 placement
function CloudSessionPane(g) {
  let i = w(3),
    { children: children } = g,
    m;
  if (i[0] === MEMO_CACHE_SENTINEL)
    ((m = e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: "Cloud session" }) })),
      (i[0] = m));
  else m = i[0];
  let o;
  if (i[1] !== children) ((o = r(Pane, { children: [m, children] })), (i[1] = children), (i[2] = o));
  else o = i[2];
  return o;
}
//@ chunk-3rb87ry3.js:7580-7791 placement
function SessionQrCode(g) {
  let m = w(4),
    { qrLinesPromise: qrLinesPromise } = g,
    i = Qr(qrLinesPromise);
  if (i.length === 0) {
    return null;
  }
  let o;
  if (m[0] !== i) ((o = i.map(K)), (m[0] = i), (m[1] = o));
  else o = m[1];
  let h;
  if (m[2] !== o) ((h = e(Fragment, { children: o })), (m[2] = o), (m[3] = h));
  else h = m[3];
  return h;
}
/**
 * /session 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-3rb87ry3.js:7791-7824 placement
var call = async (onDone) => e(SessionQrDialog, { onDone: onDone });
//@ chunk-7mtn3rbz.js:5404-5422 sole-consumer
var _ = Re(Sbo(), 1);
//@ chunk-7mtn3rbz.js:5422-5465 sole-consumer
function G(V, z) {
  return e(Text, { children: V }, z);
}
//@ chunk-7mtn3rbz.js:5465-5675 sole-consumer
var CLAUDE_MOBILE_APP_URL = "https://claude.ai/mobile?entrypoint=claude_code_cli",
  CLAUDE_AI_MOBILE = "claude.ai/mobile",
  GET_MOBILE_APP_LABEL = "Get the Claude app on your phone",
  MOBILE_APP_QR_LINES = _.render(create(CLAUDE_MOBILE_APP_URL, { errorCorrectionLevel: "L" }), { margin: 2 })
    .split(
      `
`,
    )
    .filter((a) => a.length > 0);
//@ chunk-7mtn3rbz.js:5675-7261 fingerprint = SessionInfo (0.309)
function SessionInfo(t0) {
  let o = w(25),
    { onDone: onDone } = t0,
    t = useIsScreenReaderEnabled(),
    K;
  if (o[0] === MEMO_CACHE_SENTINEL)
    ((K = isReplBridgeActive()
      ? e(Text, { dimColor: !0, children: "Find this session in the Code tab of the Claude app" })
      : isRemoteControlOfferable()
        ? r(Text, {
            dimColor: !0,
            children: [
              "Then run ",
              e(Text, { color: "suggestion", children: "/rc" }),
              " to continue this session from your phone",
            ],
          })
        : null),
      (o[0] = K));
  else K = o[0];
  let P = K,
    T;
  if (o[1] === MEMO_CACHE_SENTINEL) ((T = { context: "Confirmation" }), (o[1] = T));
  else T = o[1];
  useKeybinding("confirm:no", onDone, T);
  let remoteSessionUrl = useGlobalExitKeybindings(onDone),
    B;
  if (o[2] !== onDone)
    ((B = function l(d) {
      if (d.key === "q" && !d.ctrl && !d.meta) (d.preventDefault(), onDone());
    }),
      (o[2] = onDone),
      (o[3] = B));
  else B = o[3];
  let l = B,
    O;
  if (o[4] === MEMO_CACHE_SENTINEL)
    ((O = e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: GET_MOBILE_APP_LABEL }) })),
      (o[4] = O));
  else O = o[4];
  const L = t ? "Visit on your phone: " : "Scan the QR code, or visit ";
  let p;
  if (o[5] !== L) ((p = e(Text, { dimColor: !0, children: L })), (o[5] = L), (o[6] = p));
  else p = o[6];
  let N;
  if (o[7] === MEMO_CACHE_SENTINEL)
    ((N = e(Link, {
      url: CLAUDE_MOBILE_APP_URL,
      children: e(Text, { color: "ide", children: CLAUDE_AI_MOBILE }),
    })),
      (o[7] = N));
  else N = o[7];
  let f;
  if (o[8] !== p) ((f = r(Box, { children: [p, N] })), (o[8] = p), (o[9] = f));
  else f = o[9];
  let C;
  if (o[10] !== remoteSessionUrl.keyName || o[11] !== remoteSessionUrl.pending)
    ((C = remoteSessionUrl.pending
      ? `Press ${remoteSessionUrl.keyName} again to close`
      : e(KeyboardShortcutHint, { chord: "escape", action: "close", ...nd(!1) })),
      (o[10] = remoteSessionUrl.keyName),
      (o[11] = remoteSessionUrl.pending),
      (o[12] = C));
  else C = o[12];
  let u;
  if (o[13] !== C)
    ((u = e(Box, { marginBottom: 1, children: e(Text, { dimColor: !0, italic: !1, children: C }) })),
      (o[13] = C),
      (o[14] = u));
  else u = o[14];
  let y;
  if (o[15] !== t) ((y = !t && MOBILE_APP_QR_LINES.map(G)), (o[15] = t), (o[16] = y));
  else y = o[16];
  let D;
  if (o[17] !== t) ((D = P && e(Box, { marginTop: t ? 1 : 0, children: P })), (o[17] = t), (o[18] = D));
  else D = o[18];
  let Q;
  if (o[19] !== l || o[20] !== u || o[21] !== y || o[22] !== D || o[23] !== f) {
    let I = r(FocusColumn, { onKeyDown: l, children: [O, f, u, y, D] });
    Q = e(Pane, { children: I });
    ((o[19] = l), (o[20] = u), (o[21] = y), (o[22] = D), (o[23] = f), (o[24] = Q));
  } else Q = o[24];
  return Q;
}
/**
 * /mobile 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-7mtn3rbz.js:7261-7305 placement
async function le(onDone) {
  return e(SessionInfo, { onDone: onDone });
}
//@ chunk-18hwfzwa.js:795165-795209 fingerprint = _temp (1)
function A7t(s) {
  return s.remoteSessionUrl;
}

export { A7t };
