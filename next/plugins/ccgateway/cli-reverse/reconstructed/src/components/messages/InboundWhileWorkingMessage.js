/**
 * components/messages/InboundWhileWorkingMessage.tsx
 *
 * 2.1.316 新增：工作中收到的频道/同伴消息显示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s3w8mq54.js (7)
 * attribution: placement 7
 */
import { CHANNEL, CHANNEL_SOURCE_OPEN } from "../../constants/xml.js";
import {
  externalSourceWarning,
  EXTERNAL_RESPONSE_HINT,
  EXTERNAL_MESSAGE_PREFIX,
} from "../../utils/contextAttachments/externalMessages.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { Box, Text } from "../../ink/components/Text.js";
import { unescapeBasicHtmlEntities } from "../../utils/confusables.js";
import { clipTeammateText } from "../../utils/swarm/teammateIds.js";
import { BriefTimestampNamespace } from "../../utils/formatBriefTimestamp.js";
import { truncateToWidth } from "../../utils/format.js";
import { BACK_ARROW_GLYPH } from "../../constants/figures.js";

//@ chunk-s3w8mq54.js:14864-15046 placement
var regExp = new RegExp(`^<${CHANNEL}\\s+source="([^"]*)"([^>]*)>\\n?`);
var INBOUND_MESSAGE_CLOSE_TAG = `</${CHANNEL}>`;
var INBOUND_CLOSE_WITH_SPACE = `
${INBOUND_MESSAGE_CLOSE_TAG}`;
var USER_ATTR_RE = /\buser="([^"]+)"/;
var INBOUND_MARKER_VARIANTS = [
  `

${externalSourceWarning(false)}${EXTERNAL_RESPONSE_HINT}`,
  `

${externalSourceWarning(false)}`,
  `

${externalSourceWarning(true)}${EXTERNAL_RESPONSE_HINT}`,
  `

${externalSourceWarning(true)}`,
];
//@ chunk-s3w8mq54.js:15046-15114 placement
function senderAfterColon(text) {
  let index = text.lastIndexOf(":");
  return index === -1 ? text : text.slice(index + 1);
}
//@ chunk-s3w8mq54.js:15114-15361 placement
function parseChannelMessage(text) {
  let lead = "";
  let rest = text;
  if (rest.startsWith(EXTERNAL_MESSAGE_PREFIX)) {
    let index = rest.indexOf(`
`);
    if (index !== -1 && rest.startsWith(CHANNEL_SOURCE_OPEN, index + 1)) {
      lead = rest.slice(0, index);
      rest = rest.slice(index + 1);
    }
  }
  let match = regExp.exec(rest);
  if (!match) return null;
  let [openTag, source = "", restText] = match;
  return {
    lead,
    rest,
    open: openTag,
    source,
    user: USER_ATTR_RE.exec(restText ?? "")?.[1],
  };
}
//@ chunk-s3w8mq54.js:15361-15370 placement
var MAX_INBOUND_TEXT = 60;
//@ chunk-s3w8mq54.js:15370-16450 placement
/**
 * 工作中收到的外部消息（频道/同伴）在对话中的显示。
 */
function InboundWhileWorkingMessage(props) {
  let $ = useMemoCache(18);
  let { addMargin, param, messageId, origin, isExpanded, followsSpeakerLabel } = props;
  let { text } = param;
  let followsLabel = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let joinedText;
  let notes;
  let serverName;
  let sender;
  let rowElement;
  if ($[0] !== addMargin || $[1] !== followsLabel || $[2] !== text) {
    rowElement = EARLY_RETURN_SENTINEL;
    U: {
      let channelMessage = parseChannelMessage(text);
      if (!channelMessage) {
        rowElement = followsLabel
          ? jsxProd_default(CollapsibleText, {
              text: text.trim(),
            })
          : jsxProd_default(Box, {
              marginTop: addMargin ? 1 : 0,
              children: jsxProd_default(Text, {
                children: text.trim(),
              }),
            });
        break U;
      }
      let { open, source, user } = channelMessage;
      let { lead, rest } = channelMessage;
      notes = lead;
      let iconElement = rest.lastIndexOf(INBOUND_MESSAGE_CLOSE_TAG) + INBOUND_MESSAGE_CLOSE_TAG.length;
      if (iconElement > INBOUND_MESSAGE_CLOSE_TAG.length - 1) {
        let sliced = rest.slice(iconElement);
        if (INBOUND_MARKER_VARIANTS.includes(sliced)) rest = rest.slice(0, iconElement);
      }
      let contentElement = unescapeBasicHtmlEntities(source);
      if (
        notes === `${EXTERNAL_MESSAGE_PREFIX}${contentElement} while you were working:` ||
        notes === `${EXTERNAL_MESSAGE_PREFIX}${contentElement}:`
      )
        notes = "";
      joinedText = rest.slice(open.length);
      let containerElement = joinedText.trimEnd();
      if (containerElement.endsWith(INBOUND_CLOSE_WITH_SPACE))
        joinedText = containerElement.slice(0, -INBOUND_CLOSE_WITH_SPACE.length);
      serverName = senderAfterColon(contentElement);
      sender = user ? unescapeBasicHtmlEntities(user) : undefined;
    }
    $[0] = addMargin;
    $[1] = followsLabel;
    $[2] = text;
    $[3] = joinedText;
    $[4] = notes;
    $[5] = serverName;
    $[6] = sender;
    $[7] = rowElement;
  } else {
    joinedText = $[3];
    notes = $[4];
    serverName = $[5];
    sender = $[6];
    rowElement = $[7];
  }
  if (rowElement !== EARLY_RETURN_SENTINEL) return rowElement;
  let userName = sender;
  let inboundMessageBodyElement;
  if (
    $[8] !== addMargin ||
    $[9] !== joinedText ||
    $[10] !== followsLabel ||
    $[11] !== isExpanded ||
    $[12] !== notes ||
    $[13] !== messageId ||
    $[14] !== origin ||
    $[15] !== serverName ||
    $[16] !== userName
  ) {
    inboundMessageBodyElement = jsxProd_default(InboundMessageBody, {
      addMargin,
      messageId,
      origin,
      isExpanded,
      followsSpeakerLabel: followsLabel,
      lead: notes,
      content: joinedText,
      serverName,
      userName,
    });
    $[8] = addMargin;
    $[9] = joinedText;
    $[10] = followsLabel;
    $[11] = isExpanded;
    $[12] = notes;
    $[13] = messageId;
    $[14] = origin;
    $[15] = serverName;
    $[16] = userName;
    $[17] = inboundMessageBodyElement;
  } else inboundMessageBodyElement = $[17];
  return inboundMessageBodyElement;
}
//@ chunk-s3w8mq54.js:16450-17243 placement
function InboundMessageBody(props) {
  let $ = useMemoCache(19);
  let { addMargin, messageId, origin, isExpanded, followsSpeakerLabel, lead, content, serverName, userName } =
    props;
  const joined = `${
    lead
      ? `${lead}
`
      : ""
  }${content}`;
  let trimmed;
  if ($[0] !== joined) {
    trimmed = joined.trim();
    $[0] = joined;
    $[1] = trimmed;
  } else trimmed = $[1];
  let text = trimmed;
  let senderLabel;
  if ($[2] !== serverName || $[3] !== userName) {
    senderLabel = clipTeammateText(userName ?? serverName) || serverName;
    $[2] = serverName;
    $[3] = userName;
    $[4] = senderLabel;
  } else senderLabel = $[4];
  let name = senderLabel;
  const isExpanded_2 = isExpanded || followsSpeakerLabel;
  let sender;
  if ($[5] !== name) {
    sender = {
      name,
    };
    $[5] = name;
    $[6] = sender;
  } else sender = $[6];
  let draw;
  if ($[7] !== addMargin || $[8] !== followsSpeakerLabel || $[9] !== serverName || $[10] !== userName) {
    draw = (body) =>
      jsxProd_default(ChannelMessageHeader, {
        addMargin,
        followsSpeakerLabel,
        serverName,
        userName,
        body,
      });
    $[7] = addMargin;
    $[8] = followsSpeakerLabel;
    $[9] = serverName;
    $[10] = userName;
    $[11] = draw;
  } else draw = $[11];
  let bodyElement;
  if (
    $[12] !== text ||
    $[13] !== messageId ||
    $[14] !== origin ||
    $[15] !== isExpanded_2 ||
    $[16] !== sender ||
    $[17] !== draw
  ) {
    bodyElement = {
      messageId,
      stored: origin,
      text,
      isExpanded: isExpanded_2,
      sender,
      draw,
    };
    $[12] = text;
    $[13] = messageId;
    $[14] = origin;
    $[15] = isExpanded_2;
    $[16] = sender;
    $[17] = draw;
    $[18] = bodyElement;
  } else bodyElement = $[18];
  return BriefTimestampNamespace.useUserMessageSite(bodyElement);
}
//@ chunk-s3w8mq54.js:17243-17944 placement
function ChannelMessageHeader(props) {
  let $ = useMemoCache(14);
  let { addMargin, followsSpeakerLabel, serverName, userName, body } = props;
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
  let bodyText;
  if ($[2] !== body) {
    bodyText = truncateToWidth(body.replace(/\s+/g, " "), MAX_INBOUND_TEXT);
    $[2] = body;
    $[3] = bodyText;
  } else bodyText = $[3];
  let marginTop = bodyText;
  const marginTop_2 = addMargin ? 1 : 0;
  let bodyElement;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    bodyElement = jsxProd_default(Text, {
      "aria-label": "inbound:",
      color: "suggestion",
      children: BACK_ARROW_GLYPH,
    });
    $[4] = bodyElement;
  } else bodyElement = $[4];
  const headerElement = userName ? ` \xB7 ${userName}` : "";
  let rowElement;
  if ($[5] !== serverName || $[6] !== headerElement) {
    rowElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [serverName, headerElement, ":"],
    });
    $[5] = serverName;
    $[6] = headerElement;
    $[7] = rowElement;
  } else rowElement = $[7];
  let children;
  if ($[8] !== rowElement || $[9] !== marginTop) {
    children = jsxProd_default_2(Text, {
      children: [bodyElement, " ", rowElement, " ", marginTop],
    });
    $[8] = rowElement;
    $[9] = marginTop;
    $[10] = children;
  } else children = $[10];
  let boxElement;
  if ($[11] !== marginTop_2 || $[12] !== children) {
    boxElement = jsxProd_default(Box, {
      marginTop: marginTop_2,
      children,
    });
    $[11] = marginTop_2;
    $[12] = children;
    $[13] = boxElement;
  } else boxElement = $[13];
  return boxElement;
}
export { InboundWhileWorkingMessage };
