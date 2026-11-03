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
import { clipTeammateText } from "../../utils/swarm/teammateIds.js";
import { stripInvisibleChars } from "../../utils/sanitization.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { firstLineOfPeerBody } from "../../utils/peerMessageHeaders.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { resolveTranscriptMode } from "./transcriptModeContext.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BriefTimestampNamespace } from "../../utils/formatBriefTimestamp.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { CtrlOToExpandHint } from "../CtrlOToExpand.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { toInkColor } from "../../utils/ink.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { parseAddress } from "../../utils/peerAddress.js";

//@ chunk-e766yyad.js:686-728 placement
var CROSS_SESSION_CLOSE_TAG = "</cross-session-message>";
var PEER = "peer";
//@ chunk-e766yyad.js:728-946 placement
function parseCrossSessionSender(text) {
  let found = PEER_MESSAGE_PREFIXES.find((d) => text.startsWith(d));
  let l = (found ? text.slice(found.length) : text).match(/^<cross-session-message\b([^>]*)>/)?.[1] ?? "";
  let g = l.match(/\bfrom="([^"]+)"/)?.[1];
  let c = l.match(/\bfrom-name="([^"]+)"/)?.[1];
  return hasCrossSessionBody(c, g);
}
//@ chunk-e766yyad.js:946-995 placement
function hasCrossSessionBody(i, a) {
  return (i && clipTeammateText(i)) || (a && clipTeammateText(shortPeerAddressLabel(a))) || PEER;
}
//@ chunk-e766yyad.js:995-1295 placement
/**
 * 去掉跨会话消息的前缀、外层 cross-session-message 标签与已知的尾随说明，得到正文。
 */
function stripCrossSessionWrapper(i, a) {
  let o = i;
  let found = PEER_MESSAGE_PREFIXES.find((c) => o.startsWith(c));
  if (found) o = o.slice(found.length);
  let g = o.lastIndexOf(CROSS_SESSION_CLOSE_TAG) + CROSS_SESSION_CLOSE_TAG.length;
  if (g > CROSS_SESSION_CLOSE_TAG.length - 1) {
    let sliced = o.slice(g);
    if (PEER_MESSAGE_SUFFIXES.includes(sliced) || (a && HOST_MESSAGE_SUFFIXES.includes(sliced)))
      o = o.slice(0, g);
  }
  return o.replace(/^<cross-session-message[^>]*>\n/, "").replace(/\n<\/cross-session-message>$/, "");
}
//@ chunk-e766yyad.js:1295-1438 placement
function crossSessionPreviewHidesBody(i, a) {
  let o = stripCrossSessionWrapper(i, a);
  let trimmed = stripInvisibleChars(stripAnsiPerLine(o.replace(/\p{Cs}/gu, "\u200B")), " ", {
    keepEmojiJoiners: true,
  })
    .replace(/\s+/g, " ")
    .trim();
  return firstLineOfPeerBody(o) !== trimmed;
}
//@ chunk-e766yyad.js:1438-2381 placement
function UserCrossSessionMessage(props) {
  let m = w(22);
  let { addMargin, param, hostInjected, verbose, isTranscriptMode, messageId, origin, followsSpeakerLabel } =
    props;
  let { text } = param;
  let u = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let transcriptMode = resolveTranscriptMode(verbose, isTranscriptMode);
  let x;
  if (m[0] !== text) {
    x = parseCrossSessionSender(text);
    m[0] = text;
    m[1] = x;
  } else x = m[1];
  let b = x;
  let W;
  if (m[2] !== origin) {
    W = origin?.kind === "peer" && origin.plugin !== undefined ? clipTeammateText(origin.plugin) : "";
    m[2] = origin;
    m[3] = W;
  } else W = m[3];
  let senderPlugin = W;
  const _ = hostInjected === true;
  let text_2;
  if (m[4] !== _ || m[5] !== text) {
    text_2 = stripCrossSessionWrapper(text, _);
    m[4] = _;
    m[5] = text;
    m[6] = text_2;
  } else text_2 = m[6];
  const isExpanded = transcriptMode || u;
  let sender;
  if (m[7] !== b) {
    sender = {
      name: b,
    };
    m[7] = b;
    m[8] = sender;
  } else sender = m[8];
  let draw;
  if (
    m[9] !== addMargin ||
    m[10] !== b ||
    m[11] !== transcriptMode ||
    m[12] !== u ||
    m[13] !== senderPlugin
  ) {
    draw = (body) =>
      jsxProd_default(CrossSessionMessageBody, {
        addMargin,
        displayName: b,
        senderPlugin,
        expanded: transcriptMode,
        followsSpeakerLabel: u,
        body,
      });
    m[9] = addMargin;
    m[10] = b;
    m[11] = transcriptMode;
    m[12] = u;
    m[13] = senderPlugin;
    m[14] = draw;
  } else draw = m[14];
  let F;
  if (
    m[15] !== messageId ||
    m[16] !== origin ||
    m[17] !== text_2 ||
    m[18] !== isExpanded ||
    m[19] !== sender ||
    m[20] !== draw
  ) {
    F = {
      messageId,
      stored: origin,
      text: text_2,
      isExpanded,
      sender,
      draw,
    };
    m[15] = messageId;
    m[16] = origin;
    m[17] = text_2;
    m[18] = isExpanded;
    m[19] = sender;
    m[20] = draw;
    m[21] = F;
  } else F = m[21];
  return BriefTimestampNamespace.useUserMessageSite(F);
}
//@ chunk-e766yyad.js:2381-3364 placement
/**
 * 跨会话消息正文：紧跟说话人标签时直接显示可折叠文本；未展开时显示 ctrl+o 展开提示；展开时显示"@ 发送者 <插件>"与正文。
 */
function CrossSessionMessageBody(props) {
  let t = w(19);
  let { addMargin, displayName, senderPlugin, expanded, followsSpeakerLabel, body } = props;
  if (followsSpeakerLabel) {
    let p;
    if (t[0] !== body) {
      p = jsxProd_default(CollapsibleText, {
        text: body,
      });
      t[0] = body;
      t[1] = p;
    } else p = t[1];
    return p;
  }
  if (!expanded) {
    let p;
    if (t[2] !== addMargin || t[3] !== body || t[4] !== displayName) {
      p = jsxProd_default(CtrlOToExpandHint, {
        displayName,
        addMargin,
        fallbackLabel: PEER,
        body,
      });
      t[2] = addMargin;
      t[3] = body;
      t[4] = displayName;
      t[5] = p;
    } else p = t[5];
    return p;
  }
  const marginTop = addMargin ? 1 : 0;
  let color;
  if (t[6] === MEMO_CACHE_SENTINEL) {
    color = toInkColor(undefined);
    t[6] = color;
  } else color = t[6];
  let u;
  if (t[7] !== senderPlugin) {
    u = senderPlugin
      ? jsxProd_default_2(Text, {
          dimColor: true,
          children: [" <", senderPlugin, " plugin", ">"],
        })
      : null;
    t[7] = senderPlugin;
    t[8] = u;
  } else u = t[8];
  let y;
  if (t[9] === MEMO_CACHE_SENTINEL) {
    y = jsxProd_default(Text, {
      "aria-hidden": true,
      children: figures_default.pointer,
    });
    t[9] = y;
  } else y = t[9];
  let m;
  if (t[10] !== displayName || t[11] !== u) {
    m = jsxProd_default_2(Text, {
      color,
      children: ["@ ", displayName, u, y],
    });
    t[10] = displayName;
    t[11] = u;
    t[12] = m;
  } else m = t[12];
  let x;
  if (t[13] !== body) {
    x = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(MarkdownText_2, {
        stripPromptTags: false,
        children: body,
      }),
    });
    t[13] = body;
    t[14] = x;
  } else x = t[14];
  let b;
  if (t[15] !== marginTop || t[16] !== m || t[17] !== x) {
    b = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children: [m, x],
    });
    t[15] = marginTop;
    t[16] = m;
    t[17] = x;
    t[18] = b;
  } else b = t[18];
  return b;
}
//@ chunk-e766yyad.js:3364-3581 placement
function shortPeerAddressLabel(i) {
  let { scheme, target } = parseAddress(i);
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
