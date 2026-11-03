/**
 * components/messages/InboundWhileWorkingMessage.tsx
 *
 * 2.1.316 新增：工作中收到的频道/同伴消息显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e67761vs.js (7)
 * attribution: placement 7
 */
import { CHANNEL, CHANNEL_SOURCE_OPEN } from "../../constants/xml.js";
import {
  externalSourceWarning,
  EXTERNAL_RESPONSE_HINT,
  EXTERNAL_MESSAGE_PREFIX,
} from "../../utils/contextAttachments/externalMessages.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { BACK_ARROW_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-e67761vs.js:13716-13898 placement
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
//@ chunk-e67761vs.js:13898-13966 placement
function senderAfterColon(u) {
  let index = u.lastIndexOf(":");
  return index === -1 ? u : u.slice(index + 1);
}
//@ chunk-e67761vs.js:13966-14213 placement
function parseChannelMessage(text) {
  let lead = "";
  let l = text;
  if (l.startsWith(EXTERNAL_MESSAGE_PREFIX)) {
    let index = l.indexOf(`
`);
    if (index !== -1 && l.startsWith(CHANNEL_SOURCE_OPEN, index + 1)) {
      lead = l.slice(0, index);
      l = l.slice(index + 1);
    }
  }
  let match = regExp.exec(l);
  if (!match) return null;
  let [b, i = "", c] = match;
  return {
    lead,
    rest: l,
    open: b,
    source: i,
    user: USER_ATTR_RE.exec(c ?? "")?.[1],
  };
}
//@ chunk-e67761vs.js:14213-14222 placement
var MAX_INBOUND_TEXT = 60;
//@ chunk-e67761vs.js:14222-15302 placement
/**
 * 工作中收到的外部消息（频道/同伴）在对话中的显示。
 */
function InboundWhileWorkingMessage(props) {
  let g = w(18);
  let { addMargin, param, messageId, origin, isExpanded, followsSpeakerLabel } = props;
  let { text } = param;
  let t = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let p;
  let d;
  let serverName;
  let N;
  let E;
  if (g[0] !== addMargin || g[1] !== t || g[2] !== text) {
    E = EARLY_RETURN_SENTINEL;
    U: {
      let channelMessage = parseChannelMessage(text);
      if (!channelMessage) {
        E = t
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
      d = lead;
      let D = rest.lastIndexOf(INBOUND_MESSAGE_CLOSE_TAG) + INBOUND_MESSAGE_CLOSE_TAG.length;
      if (D > INBOUND_MESSAGE_CLOSE_TAG.length - 1) {
        let sliced = rest.slice(D);
        if (INBOUND_MARKER_VARIANTS.includes(sliced)) rest = rest.slice(0, D);
      }
      let F = unescapeBasicHtmlEntities(source);
      if (
        d === `${EXTERNAL_MESSAGE_PREFIX}${F} while you were working:` ||
        d === `${EXTERNAL_MESSAGE_PREFIX}${F}:`
      )
        d = "";
      p = rest.slice(open.length);
      let ne = p.trimEnd();
      if (ne.endsWith(INBOUND_CLOSE_WITH_SPACE)) p = ne.slice(0, -INBOUND_CLOSE_WITH_SPACE.length);
      serverName = senderAfterColon(F);
      N = user ? unescapeBasicHtmlEntities(user) : undefined;
    }
    g[0] = addMargin;
    g[1] = t;
    g[2] = text;
    g[3] = p;
    g[4] = d;
    g[5] = serverName;
    g[6] = N;
    g[7] = E;
  } else {
    p = g[3];
    d = g[4];
    serverName = g[5];
    N = g[6];
    E = g[7];
  }
  if (E !== EARLY_RETURN_SENTINEL) return E;
  let userName = N;
  let M;
  if (
    g[8] !== addMargin ||
    g[9] !== p ||
    g[10] !== t ||
    g[11] !== isExpanded ||
    g[12] !== d ||
    g[13] !== messageId ||
    g[14] !== origin ||
    g[15] !== serverName ||
    g[16] !== userName
  ) {
    M = jsxProd_default(InboundMessageBody, {
      addMargin,
      messageId,
      origin,
      isExpanded,
      followsSpeakerLabel: t,
      lead: d,
      content: p,
      serverName,
      userName,
    });
    g[8] = addMargin;
    g[9] = p;
    g[10] = t;
    g[11] = isExpanded;
    g[12] = d;
    g[13] = messageId;
    g[14] = origin;
    g[15] = serverName;
    g[16] = userName;
    g[17] = M;
  } else M = g[17];
  return M;
}
//@ chunk-e67761vs.js:15302-16095 placement
function InboundMessageBody(props) {
  let d = w(19);
  let { addMargin, messageId, origin, isExpanded, followsSpeakerLabel, lead, content, serverName, userName } =
    props;
  const p = `${
    lead
      ? `${lead}
`
      : ""
  }${content}`;
  let f;
  if (d[0] !== p) {
    f = p.trim();
    d[0] = p;
    d[1] = f;
  } else f = d[1];
  let text = f;
  let E;
  if (d[2] !== serverName || d[3] !== userName) {
    E = clipTeammateText(userName ?? serverName) || serverName;
    d[2] = serverName;
    d[3] = userName;
    d[4] = E;
  } else E = d[4];
  let name = E;
  const isExpanded_2 = isExpanded || followsSpeakerLabel;
  let sender;
  if (d[5] !== name) {
    sender = {
      name,
    };
    d[5] = name;
    d[6] = sender;
  } else sender = d[6];
  let draw;
  if (d[7] !== addMargin || d[8] !== followsSpeakerLabel || d[9] !== serverName || d[10] !== userName) {
    draw = (body) =>
      jsxProd_default(ChannelMessageHeader, {
        addMargin,
        followsSpeakerLabel,
        serverName,
        userName,
        body,
      });
    d[7] = addMargin;
    d[8] = followsSpeakerLabel;
    d[9] = serverName;
    d[10] = userName;
    d[11] = draw;
  } else draw = d[11];
  let M;
  if (
    d[12] !== text ||
    d[13] !== messageId ||
    d[14] !== origin ||
    d[15] !== isExpanded_2 ||
    d[16] !== sender ||
    d[17] !== draw
  ) {
    M = {
      messageId,
      stored: origin,
      text,
      isExpanded: isExpanded_2,
      sender,
      draw,
    };
    d[12] = text;
    d[13] = messageId;
    d[14] = origin;
    d[15] = isExpanded_2;
    d[16] = sender;
    d[17] = draw;
    d[18] = M;
  } else M = d[18];
  return BriefTimestampNamespace.useUserMessageSite(M);
}
//@ chunk-e67761vs.js:16095-16796 placement
function ChannelMessageHeader(props) {
  let c = w(14);
  let { addMargin, followsSpeakerLabel, serverName, userName, body } = props;
  if (followsSpeakerLabel) {
    let o;
    if (c[0] !== body) {
      o = jsxProd_default(CollapsibleText, {
        text: body,
      });
      c[0] = body;
      c[1] = o;
    } else o = c[1];
    return o;
  }
  let o;
  if (c[2] !== body) {
    o = truncateToWidth(body.replace(/\s+/g, " "), MAX_INBOUND_TEXT);
    c[2] = body;
    c[3] = o;
  } else o = c[3];
  let t = o;
  const marginTop = addMargin ? 1 : 0;
  let p;
  if (c[4] === MEMO_CACHE_SENTINEL) {
    p = jsxProd_default(Text, {
      "aria-label": "inbound:",
      color: "suggestion",
      children: BACK_ARROW_GLYPH,
    });
    c[4] = p;
  } else p = c[4];
  const d = userName ? ` \xB7 ${userName}` : "";
  let f;
  if (c[5] !== serverName || c[6] !== d) {
    f = jsxProd_default_2(Text, {
      dimColor: true,
      children: [serverName, d, ":"],
    });
    c[5] = serverName;
    c[6] = d;
    c[7] = f;
  } else f = c[7];
  let children;
  if (c[8] !== f || c[9] !== t) {
    children = jsxProd_default_2(Text, {
      children: [p, " ", f, " ", t],
    });
    c[8] = f;
    c[9] = t;
    c[10] = children;
  } else children = c[10];
  let E;
  if (c[11] !== marginTop || c[12] !== children) {
    E = jsxProd_default(Box, {
      marginTop,
      children,
    });
    c[11] = marginTop;
    c[12] = children;
    c[13] = E;
  } else E = c[13];
  return E;
}
