/**
 * components/messages/ExternalMessageHeader.tsx
 *
 * 2.1.316 新增：外部来源消息的标题行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nwq3j1yh.js (3)
 * attribution: placement 3
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { isServerInboxDelivery, isOwnerInboxNotice } from "../../utils/externalEventWake.js";
import { truncateToWidth } from "../../utils/format.js";
import { truncateToLength, collapseWhitespace } from "../../utils/stringUtils.js";
import { foldSenderDisplayBrackets, inboxSenderProvenanceCaption } from "../../bridge/sessionInbox.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BACK_ARROW_GLYPH } from "../../constants/figures.js";

//@ chunk-nwq3j1yh.js:4810-4814 placement
init_react_production();
//@ chunk-nwq3j1yh.js:4814-4828 placement
var _ = 40;
var MAX_SENDER_WIDTH = 64;
//@ chunk-nwq3j1yh.js:4828-6471 placement
function ExternalMessageHeader(props) {
  let $ = useMemoCache(27);
  let { addMargin, wake, origin, rawText, verbose, isTranscriptMode } = props;
  let senderDisplay = typeof wake.data.sender_display === "string" ? wake.data.sender_display : "";
  let isOwnerInbox;
  if ($[0] !== origin || $[1] !== wake) {
    isOwnerInbox = isServerInboxDelivery(origin) && isOwnerInboxNotice(wake);
    $[0] = origin;
    $[1] = wake;
    $[2] = isOwnerInbox;
  } else isOwnerInbox = $[2];
  let isOwnerInbox_2 = isOwnerInbox;
  let senderText;
  ve: {
    if (isOwnerInbox_2) {
      senderText = "";
      break ve;
    }
    let senderDisplayText;
    if ($[3] !== senderDisplay) {
      senderDisplayText = truncateToWidth(
        truncateToLength(
          foldSenderDisplayBrackets(collapseWhitespace(sanitizeDisplayText(senderDisplay))),
          MAX_SENDER_WIDTH,
        ),
        _,
      );
      $[3] = senderDisplay;
      $[4] = senderDisplayText;
    } else senderDisplayText = $[4];
    senderText = senderDisplayText;
  }
  let senderText_2 = senderText;
  let rawBody;
  if ($[5] !== isTranscriptMode || $[6] !== rawText || $[7] !== verbose) {
    rawBody = verbose || isTranscriptMode ? sanitizeDisplayText(rawText) : null;
    $[5] = isTranscriptMode;
    $[6] = rawText;
    $[7] = verbose;
    $[8] = rawBody;
  } else rawBody = $[8];
  let children = rawBody;
  let sourceLabel = wake.data.source === "slack" ? "Slack" : "the API";
  const provenanceKind = isOwnerInbox_2 ? "rc_owner" : undefined;
  let provenanceCaption;
  if ($[9] !== provenanceKind) {
    provenanceCaption = inboxSenderProvenanceCaption(provenanceKind);
    $[9] = provenanceKind;
    $[10] = provenanceCaption;
  } else provenanceCaption = $[10];
  let children_2 = `[${provenanceCaption}]`;
  let headerText = isOwnerInbox_2
    ? wake.data.source === "slack"
      ? "Your message via Slack"
      : "Your message"
    : `Message from ${bunStringWidth(senderText_2) > 0 ? senderText_2 : "someone"} via ${sourceLabel}`;
  let showBody = verbose || isTranscriptMode;
  const marginTop = addMargin ? 1 : 0;
  let arrowGlyph;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    arrowGlyph = jsxProd_default(Text, {
      "aria-label": "inbound:",
      color: "suggestion",
      children: BACK_ARROW_GLYPH,
    });
    $[11] = arrowGlyph;
  } else arrowGlyph = $[11];
  let provenanceNode;
  if ($[12] !== isOwnerInbox_2 || $[13] !== children_2) {
    provenanceNode = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default_2(Text, {
        children: [
          arrowGlyph,
          " ",
          isOwnerInbox_2
            ? jsxProd_default(Text, {
                color: "permission",
                children: children_2,
              })
            : jsxProd_default(Text, {
                dimColor: true,
                children: children_2,
              }),
        ],
      }),
    });
    $[12] = isOwnerInbox_2;
    $[13] = children_2;
    $[14] = provenanceNode;
  } else provenanceNode = $[14];
  const children_3 = `${headerText} \u2014 waiting in the session inbox`;
  let headerBox;
  if ($[15] !== children_3) {
    headerBox = jsxProd_default(Box, {
      flexGrow: 1,
      flexShrink: 1,
      paddingLeft: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: children_3,
      }),
    });
    $[15] = children_3;
    $[16] = headerBox;
  } else headerBox = $[16];
  let row;
  if ($[17] !== headerBox || $[18] !== provenanceNode) {
    row = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [provenanceNode, headerBox],
    });
    $[17] = headerBox;
    $[18] = provenanceNode;
    $[19] = row;
  } else row = $[19];
  let bodyBox;
  if ($[20] !== showBody || $[21] !== children) {
    bodyBox = showBody
      ? jsxProd_default(Box, {
          paddingLeft: 2,
          children: jsxProd_default(Text, {
            dimColor: true,
            wrap: "wrap",
            children,
          }),
        })
      : null;
    $[20] = showBody;
    $[21] = children;
    $[22] = bodyBox;
  } else bodyBox = $[22];
  let header;
  if ($[23] !== row || $[24] !== bodyBox || $[25] !== marginTop) {
    header = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [row, bodyBox],
    });
    $[23] = row;
    $[24] = bodyBox;
    $[25] = marginTop;
    $[26] = header;
  } else header = $[26];
  return header;
}
export { ExternalMessageHeader };
