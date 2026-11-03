/**
 * components/messages/UserCrossSessionMessage.tsx
 *
 * 2.1.316 新增：跨会话消息的显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e766yyad.js (8)
 * attribution: placement 8
 */
import {
  PEER_MESSAGE_PREFIXES,
  PEER_MESSAGE_SUFFIXES,
  HOST_MESSAGE_SUFFIXES,
} from "../../utils/crossSessionMessages.js";
import { Hb } from "../../utils/swarm/teammateIds.js";
import { stripInvisibleChars } from "../../utils/sanitization.js";
import { qa } from "../../utils/stripAnsi.js";
import { sPn } from "../../utils/peerMessageHeaders.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Wj } from "./transcriptModeContext.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { a9 } from "../../utils/formatBriefTimestamp.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { CtrlOToExpandHint } from "../CtrlOToExpand.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { toInkColor } from "../../utils/ink.js";
import { Text, Box } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { parseAddress } from "../../utils/peerAddress.js";

//@ chunk-e766yyad.js:686-728 placement
var k = "</cross-session-message>",
  PEER = "peer";
//@ chunk-e766yyad.js:728-946 placement
function parseCrossSessionSender(i) {
  let found = PEER_MESSAGE_PREFIXES.find((d) => i.startsWith(d)),
    l = (found ? i.slice(found.length) : i).match(/^<cross-session-message\b([^>]*)>/)?.[1] ?? "",
    g = l.match(/\bfrom="([^"]+)"/)?.[1],
    c = l.match(/\bfrom-name="([^"]+)"/)?.[1];
  return J(c, g);
}
//@ chunk-e766yyad.js:946-995 placement
function J(i, a) {
  return (i && Hb(i)) || (a && Hb(shortPeerAddressLabel(a))) || PEER;
}
/**
 * 去掉跨会话消息的前缀、外层 cross-session-message 标签与已知的尾随说明，得到正文。
 */
//@ chunk-e766yyad.js:995-1295 placement
function stripCrossSessionWrapper(i, a) {
  let o = i,
    found = PEER_MESSAGE_PREFIXES.find((c) => o.startsWith(c));
  if (found) o = o.slice(found.length);
  let g = o.lastIndexOf(k) + k.length;
  if (g > k.length - 1) {
    let sliced = o.slice(g);
    if (PEER_MESSAGE_SUFFIXES.includes(sliced) || (a && HOST_MESSAGE_SUFFIXES.includes(sliced)))
      o = o.slice(0, g);
  }
  return o.replace(/^<cross-session-message[^>]*>\n/, "").replace(/\n<\/cross-session-message>$/, "");
}
//@ chunk-e766yyad.js:1295-1438 placement
function crossSessionPreviewHidesBody(i, a) {
  let o = stripCrossSessionWrapper(i, a),
    trimmed = stripInvisibleChars(qa(o.replace(/\p{Cs}/gu, "\u200B")), " ", { keepEmojiJoiners: !0 })
      .replace(/\s+/g, " ")
      .trim();
  return sPn(o) !== trimmed;
}
//@ chunk-e766yyad.js:1438-2381 placement
function UserCrossSessionMessage(i) {
  let m = w(22),
    {
      addMargin: addMargin,
      param: param,
      hostInjected: hostInjected,
      verbose: verbose,
      isTranscriptMode: isTranscriptMode,
      messageId: messageId,
      origin: origin,
      followsSpeakerLabel: followsSpeakerLabel,
    } = i,
    { text: text } = param,
    u = followsSpeakerLabel === void 0 ? !1 : followsSpeakerLabel,
    y = Wj(verbose, isTranscriptMode),
    x;
  if (m[0] !== text) ((x = parseCrossSessionSender(text)), (m[0] = text), (m[1] = x));
  else x = m[1];
  let b = x,
    W;
  if (m[2] !== origin)
    ((W = origin?.kind === "peer" && origin.plugin !== void 0 ? Hb(origin.plugin) : ""),
      (m[2] = origin),
      (m[3] = W));
  else W = m[3];
  let E = W;
  const _ = hostInjected === !0;
  let h;
  if (m[4] !== _ || m[5] !== text)
    ((h = stripCrossSessionWrapper(text, _)), (m[4] = _), (m[5] = text), (m[6] = h));
  else h = m[6];
  const O = y || u;
  let P;
  if (m[7] !== b) ((P = { name: b }), (m[7] = b), (m[8] = P));
  else P = m[8];
  let M;
  if (m[9] !== addMargin || m[10] !== b || m[11] !== y || m[12] !== u || m[13] !== E)
    ((M = (oe) =>
      e(CrossSessionMessageBody, {
        addMargin: addMargin,
        displayName: b,
        senderPlugin: E,
        expanded: y,
        followsSpeakerLabel: u,
        body: oe,
      })),
      (m[9] = addMargin),
      (m[10] = b),
      (m[11] = y),
      (m[12] = u),
      (m[13] = E),
      (m[14] = M));
  else M = m[14];
  let F;
  if (m[15] !== messageId || m[16] !== origin || m[17] !== h || m[18] !== O || m[19] !== P || m[20] !== M)
    ((F = { messageId: messageId, stored: origin, text: h, isExpanded: O, sender: P, draw: M }),
      (m[15] = messageId),
      (m[16] = origin),
      (m[17] = h),
      (m[18] = O),
      (m[19] = P),
      (m[20] = M),
      (m[21] = F));
  else F = m[21];
  return a9.useUserMessageSite(F);
}
/**
 * 跨会话消息正文：紧跟说话人标签时直接显示可折叠文本；未展开时显示 ctrl+o 展开提示；展开时显示"@ 发送者 <插件>"与正文。
 */
//@ chunk-e766yyad.js:2381-3364 placement
function CrossSessionMessageBody(i) {
  let t = w(19),
    {
      addMargin: addMargin,
      displayName: displayName,
      senderPlugin: senderPlugin,
      expanded: expanded,
      followsSpeakerLabel: followsSpeakerLabel,
      body: body,
    } = i;
  if (followsSpeakerLabel) {
    let p;
    if (t[0] !== body) ((p = e(CollapsibleText, { text: body })), (t[0] = body), (t[1] = p));
    else p = t[1];
    return p;
  }
  if (!expanded) {
    let p;
    if (t[2] !== addMargin || t[3] !== body || t[4] !== displayName)
      ((p = e(CtrlOToExpandHint, {
        displayName: displayName,
        addMargin: addMargin,
        fallbackLabel: PEER,
        body: body,
      })),
        (t[2] = addMargin),
        (t[3] = body),
        (t[4] = displayName),
        (t[5] = p));
    else p = t[5];
    return p;
  }
  const p = addMargin ? 1 : 0;
  let f;
  if (t[6] === MEMO_CACHE_SENTINEL) ((f = toInkColor(void 0)), (t[6] = f));
  else f = t[6];
  let u;
  if (t[7] !== senderPlugin)
    ((u = senderPlugin ? r(Text, { dimColor: !0, children: [" <", senderPlugin, " plugin", ">"] }) : null),
      (t[7] = senderPlugin),
      (t[8] = u));
  else u = t[8];
  let y;
  if (t[9] === MEMO_CACHE_SENTINEL) ((y = e(Text, { "aria-hidden": !0, children: re.pointer })), (t[9] = y));
  else y = t[9];
  let m;
  if (t[10] !== displayName || t[11] !== u)
    ((m = r(Text, { color: f, children: ["@ ", displayName, u, y] })),
      (t[10] = displayName),
      (t[11] = u),
      (t[12] = m));
  else m = t[12];
  let x;
  if (t[13] !== body)
    ((x = e(Box, { paddingLeft: 2, children: e(MarkdownText_2, { stripPromptTags: !1, children: body }) })),
      (t[13] = body),
      (t[14] = x));
  else x = t[14];
  let b;
  if (t[15] !== p || t[16] !== m || t[17] !== x)
    ((b = r(Box, { flexDirection: "column", marginTop: p, width: "100%", children: [m, x] })),
      (t[15] = p),
      (t[16] = m),
      (t[17] = x),
      (t[18] = b));
  else b = t[18];
  return b;
}
//@ chunk-e766yyad.js:3364-3581 placement
function shortPeerAddressLabel(i) {
  let { scheme: scheme, target: target } = parseAddress(i);
  switch (scheme) {
    case "uds":
      return target
        .slice(Math.max(target.lastIndexOf("/"), target.lastIndexOf("\\")) + 1)
        .replace(/\.sock$/, "");
    case "bridge":
      return "(untitled)";
    case "did":
    case "other":
      return i;
  }
}

export { crossSessionPreviewHidesBody };
