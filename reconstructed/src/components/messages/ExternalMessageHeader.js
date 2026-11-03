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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { BACK_ARROW_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-nwq3j1yh.js:4810-4814 placement
init_react_production();
//@ chunk-nwq3j1yh.js:4814-4828 placement
var _ = 40;
var MAX_SENDER_WIDTH = 64;
//@ chunk-nwq3j1yh.js:4828-6471 placement
function ExternalMessageHeader(props) {
  let o = w(27);
  let { addMargin, wake, origin, rawText, verbose, isTranscriptMode } = props;
  let senderDisplay = typeof wake.data.sender_display === "string" ? wake.data.sender_display : "";
  let A;
  if (o[0] !== origin || o[1] !== wake) {
    A = isServerInboxDelivery(origin) && isOwnerInboxNotice(wake);
    o[0] = origin;
    o[1] = wake;
    o[2] = A;
  } else A = o[2];
  let i = A;
  let y;
  ve: {
    if (i) {
      y = "";
      break ve;
    }
    let m;
    if (o[3] !== senderDisplay) {
      m = truncateToWidth(
        truncateToLength(
          foldSenderDisplayBrackets(collapseWhitespace(sanitizeDisplayText(senderDisplay))),
          MAX_SENDER_WIDTH,
        ),
        _,
      );
      o[3] = senderDisplay;
      o[4] = m;
    } else m = o[4];
    y = m;
  }
  let B = y;
  let m;
  if (o[5] !== isTranscriptMode || o[6] !== rawText || o[7] !== verbose) {
    m = verbose || isTranscriptMode ? sanitizeDisplayText(rawText) : null;
    o[5] = isTranscriptMode;
    o[6] = rawText;
    o[7] = verbose;
    o[8] = m;
  } else m = o[8];
  let children = m;
  let z = wake.data.source === "slack" ? "Slack" : "the API";
  const h = i ? "rc_owner" : undefined;
  let G;
  if (o[9] !== h) {
    G = inboxSenderProvenanceCaption(h);
    o[9] = h;
    o[10] = G;
  } else G = o[10];
  let children_2 = `[${G}]`;
  let ee = i
    ? wake.data.source === "slack"
      ? "Your message via Slack"
      : "Your message"
    : `Message from ${bunStringWidth(B) > 0 ? B : "someone"} via ${z}`;
  let E = verbose || isTranscriptMode;
  const marginTop = addMargin ? 1 : 0;
  let I;
  if (o[11] === MEMO_CACHE_SENTINEL) {
    I = jsxProd_default(Text, {
      "aria-label": "inbound:",
      color: "suggestion",
      children: BACK_ARROW_GLYPH,
    });
    o[11] = I;
  } else I = o[11];
  let f;
  if (o[12] !== i || o[13] !== children_2) {
    f = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default_2(Text, {
        children: [
          I,
          " ",
          i
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
    o[12] = i;
    o[13] = children_2;
    o[14] = f;
  } else f = o[14];
  const children_3 = `${ee} \u2014 waiting in the session inbox`;
  let g;
  if (o[15] !== children_3) {
    g = jsxProd_default(Box, {
      flexGrow: 1,
      flexShrink: 1,
      paddingLeft: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: children_3,
      }),
    });
    o[15] = children_3;
    o[16] = g;
  } else g = o[16];
  let k;
  if (o[17] !== g || o[18] !== f) {
    k = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [f, g],
    });
    o[17] = g;
    o[18] = f;
    o[19] = k;
  } else k = o[19];
  let v;
  if (o[20] !== E || o[21] !== children) {
    v = E
      ? jsxProd_default(Box, {
          paddingLeft: 2,
          children: jsxProd_default(Text, {
            dimColor: true,
            wrap: "wrap",
            children,
          }),
        })
      : null;
    o[20] = E;
    o[21] = children;
    o[22] = v;
  } else v = o[22];
  let N;
  if (o[23] !== k || o[24] !== v || o[25] !== marginTop) {
    N = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [k, v],
    });
    o[23] = k;
    o[24] = v;
    o[25] = marginTop;
    o[26] = N;
  } else N = o[26];
  return N;
}
