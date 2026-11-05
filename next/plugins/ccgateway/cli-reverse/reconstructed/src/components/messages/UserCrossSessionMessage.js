/**
 * components/messages/UserCrossSessionMessage.tsx
 *
 * 2.1.316 新增：跨会话消息的显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qe4ze26w.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-qe4ze26w.js:686-728 placement
var CROSS_SESSION_CLOSE_TAG = "</cross-session-message>";
var PEER = "peer";
//@ chunk-qe4ze26w.js:728-946 placement
function parseCrossSessionSender(text) {
  let found = PEER_MESSAGE_PREFIXES.find((prefix) => text.startsWith(prefix));
  let attrs = (found ? text.slice(found.length) : text).match(/^<cross-session-message\b([^>]*)>/)?.[1] ?? "";
  let peer = attrs.match(/\bfrom="([^"]+)"/)?.[1];
  let displayName = attrs.match(/\bfrom-name="([^"]+)"/)?.[1];
  return hasCrossSessionBody(displayName, peer);
}
//@ chunk-qe4ze26w.js:946-995 placement
function hasCrossSessionBody(displayName, peer) {
  return (
    (displayName && clipTeammateText(displayName)) ||
    (peer && clipTeammateText(shortPeerAddressLabel(peer))) ||
    PEER
  );
}
//@ chunk-qe4ze26w.js:995-1295 placement
/**
 * 去掉跨会话消息的前缀、外层 cross-session-message 标签与已知的尾随说明，得到正文。
 */
function stripCrossSessionWrapper(text, hostInjected) {
  let rest = text;
  let found = PEER_MESSAGE_PREFIXES.find((prefix) => rest.startsWith(prefix));
  if (found) rest = rest.slice(found.length);
  let closeEnd = rest.lastIndexOf(CROSS_SESSION_CLOSE_TAG) + CROSS_SESSION_CLOSE_TAG.length;
  if (closeEnd > CROSS_SESSION_CLOSE_TAG.length - 1) {
    let sliced = rest.slice(closeEnd);
    if (PEER_MESSAGE_SUFFIXES.includes(sliced) || (hostInjected && HOST_MESSAGE_SUFFIXES.includes(sliced)))
      rest = rest.slice(0, closeEnd);
  }
  return rest.replace(/^<cross-session-message[^>]*>\n/, "").replace(/\n<\/cross-session-message>$/, "");
}
//@ chunk-qe4ze26w.js:1295-1438 placement
function crossSessionPreviewHidesBody(text, hostInjected) {
  let stripped = stripCrossSessionWrapper(text, hostInjected);
  let trimmed = stripInvisibleChars(stripAnsiPerLine(stripped.replace(/\p{Cs}/gu, "\u200B")), " ", {
    keepEmojiJoiners: true,
  })
    .replace(/\s+/g, " ")
    .trim();
  return firstLineOfPeerBody(stripped) !== trimmed;
}
//@ chunk-qe4ze26w.js:1438-2381 placement
function UserCrossSessionMessage(props) {
  let $ = useMemoCache(22);
  let { addMargin, param, hostInjected, verbose, isTranscriptMode, messageId, origin, followsSpeakerLabel } =
    props;
  let { text } = param;
  let followsLabelFlag = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let transcriptMode = resolveTranscriptMode(verbose, isTranscriptMode);
  let sender;
  if ($[0] !== text) {
    sender = parseCrossSessionSender(text);
    $[0] = text;
    $[1] = sender;
  } else sender = $[1];
  let senderNameValue = sender;
  let pluginName;
  if ($[2] !== origin) {
    pluginName =
      origin?.kind === "peer" && origin.plugin !== undefined ? clipTeammateText(origin.plugin) : "";
    $[2] = origin;
    $[3] = pluginName;
  } else pluginName = $[3];
  let senderPlugin = pluginName;
  const suffix = hostInjected === true;
  let text_2;
  if ($[4] !== suffix || $[5] !== text) {
    text_2 = stripCrossSessionWrapper(text, suffix);
    $[4] = suffix;
    $[5] = text;
    $[6] = text_2;
  } else text_2 = $[6];
  const isExpanded = transcriptMode || followsLabelFlag;
  let sender_2;
  if ($[7] !== senderNameValue) {
    sender_2 = {
      name: senderNameValue,
    };
    $[7] = senderNameValue;
    $[8] = sender_2;
  } else sender_2 = $[8];
  let draw;
  if (
    $[9] !== addMargin ||
    $[10] !== senderNameValue ||
    $[11] !== transcriptMode ||
    $[12] !== followsLabelFlag ||
    $[13] !== senderPlugin
  ) {
    draw = (body) =>
      jsxProd_default(CrossSessionMessageBody, {
        addMargin,
        displayName: senderNameValue,
        senderPlugin,
        expanded: transcriptMode,
        followsSpeakerLabel: followsLabelFlag,
        body,
      });
    $[9] = addMargin;
    $[10] = senderNameValue;
    $[11] = transcriptMode;
    $[12] = followsLabelFlag;
    $[13] = senderPlugin;
    $[14] = draw;
  } else draw = $[14];
  let bodyElement;
  if (
    $[15] !== messageId ||
    $[16] !== origin ||
    $[17] !== text_2 ||
    $[18] !== isExpanded ||
    $[19] !== sender_2 ||
    $[20] !== draw
  ) {
    bodyElement = {
      messageId,
      stored: origin,
      text: text_2,
      isExpanded,
      sender: sender_2,
      draw,
    };
    $[15] = messageId;
    $[16] = origin;
    $[17] = text_2;
    $[18] = isExpanded;
    $[19] = sender_2;
    $[20] = draw;
    $[21] = bodyElement;
  } else bodyElement = $[21];
  return BriefTimestampNamespace.useUserMessageSite(bodyElement);
}
//@ chunk-qe4ze26w.js:2381-3364 placement
/**
 * 跨会话消息正文：紧跟说话人标签时直接显示可折叠文本；未展开时显示 ctrl+o 展开提示；展开时显示"@ 发送者 <插件>"与正文。
 */
function CrossSessionMessageBody(props) {
  let $ = useMemoCache(19);
  let { addMargin, displayName, senderPlugin, expanded, followsSpeakerLabel, body } = props;
  if (followsSpeakerLabel) {
    let collapsibleTextElement;
    if ($[0] !== body) {
      collapsibleTextElement = jsxProd_default(CollapsibleText, {
        text: body,
      });
      $[0] = body;
      $[1] = collapsibleTextElement;
    } else collapsibleTextElement = $[1];
    return collapsibleTextElement;
  }
  if (!expanded) {
    let ctrlOToExpandHintElement;
    if ($[2] !== addMargin || $[3] !== body || $[4] !== displayName) {
      ctrlOToExpandHintElement = jsxProd_default(CtrlOToExpandHint, {
        displayName,
        addMargin,
        fallbackLabel: PEER,
        body,
      });
      $[2] = addMargin;
      $[3] = body;
      $[4] = displayName;
      $[5] = ctrlOToExpandHintElement;
    } else ctrlOToExpandHintElement = $[5];
    return ctrlOToExpandHintElement;
  }
  const marginTop = addMargin ? 1 : 0;
  let color;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    color = toInkColor(undefined);
    $[6] = color;
  } else color = $[6];
  let pluginBadge;
  if ($[7] !== senderPlugin) {
    pluginBadge = senderPlugin
      ? jsxProd_default_2(Text, {
          dimColor: true,
          children: [" <", senderPlugin, " plugin", ">"],
        })
      : null;
    $[7] = senderPlugin;
    $[8] = pluginBadge;
  } else pluginBadge = $[8];
  let headerElement;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    headerElement = jsxProd_default(Text, {
      "aria-hidden": true,
      children: figures_default.pointer,
    });
    $[9] = headerElement;
  } else headerElement = $[9];
  let bodyElement;
  if ($[10] !== displayName || $[11] !== pluginBadge) {
    bodyElement = jsxProd_default_2(Text, {
      color,
      children: ["@ ", displayName, pluginBadge, headerElement],
    });
    $[10] = displayName;
    $[11] = pluginBadge;
    $[12] = bodyElement;
  } else bodyElement = $[12];
  let contentElement;
  if ($[13] !== body) {
    contentElement = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(MarkdownText_2, {
        stripPromptTags: false,
        children: body,
      }),
    });
    $[13] = body;
    $[14] = contentElement;
  } else contentElement = $[14];
  let containerElement;
  if ($[15] !== marginTop || $[16] !== bodyElement || $[17] !== contentElement) {
    containerElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children: [bodyElement, contentElement],
    });
    $[15] = marginTop;
    $[16] = bodyElement;
    $[17] = contentElement;
    $[18] = containerElement;
  } else containerElement = $[18];
  return containerElement;
}
//@ chunk-qe4ze26w.js:3364-3581 placement
function shortPeerAddressLabel(address) {
  let { scheme, target } = parseAddress(address);
  switch (scheme) {
    case "uds":
      return target
        .slice(Math.max(target.lastIndexOf("/"), target.lastIndexOf("\\")) + 1)
        .replace(/\.sock$/, "");
    case "bridge":
      return "(untitled)";
    case "did":
    case "other":
      return address;
  }
}
export { crossSessionPreviewHidesBody, UserCrossSessionMessage };
