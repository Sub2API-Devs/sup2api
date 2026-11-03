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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { isServerInboxDelivery, isOwnerInboxNotice } from "../../utils/externalEventWake.js";
import { truncateToWidth } from "../../utils/format.js";
import { truncateToLength, Dr } from "../../utils/stringUtils.js";
import { foldSenderDisplayBrackets, inboxSenderProvenanceCaption } from "../../bridge/sessionInbox.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { p1e } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-nwq3j1yh.js:4810-4814 placement
j();
//@ chunk-nwq3j1yh.js:4814-4828 placement
var _ = 40,
  C = 64;
//@ chunk-nwq3j1yh.js:4828-6471 placement
function ExternalMessageHeader(X) {
  let o = w(27),
    {
      addMargin: addMargin,
      wake: wake,
      origin: origin,
      rawText: rawText,
      verbose: verbose,
      isTranscriptMode: isTranscriptMode,
    } = X,
    b = typeof wake.data.sender_display === "string" ? wake.data.sender_display : "",
    A;
  if (o[0] !== origin || o[1] !== wake)
    ((A = isServerInboxDelivery(origin) && isOwnerInboxNotice(wake)),
      (o[0] = origin),
      (o[1] = wake),
      (o[2] = A));
  else A = o[2];
  let i = A,
    y;
  ve: {
    if (i) {
      y = "";
      break ve;
    }
    let m;
    if (o[3] !== b)
      ((m = truncateToWidth(truncateToLength(foldSenderDisplayBrackets(Dr(sanitizeDisplayText(b))), C), _)),
        (o[3] = b),
        (o[4] = m));
    else m = o[4];
    y = m;
  }
  let B = y,
    m;
  if (o[5] !== isTranscriptMode || o[6] !== rawText || o[7] !== verbose)
    ((m = verbose || isTranscriptMode ? sanitizeDisplayText(rawText) : null),
      (o[5] = isTranscriptMode),
      (o[6] = rawText),
      (o[7] = verbose),
      (o[8] = m));
  else m = o[8];
  let O = m,
    z = wake.data.source === "slack" ? "Slack" : "the API";
  const h = i ? "rc_owner" : void 0;
  let G;
  if (o[9] !== h) ((G = inboxSenderProvenanceCaption(h)), (o[9] = h), (o[10] = G));
  else G = o[10];
  let c = `[${G}]`,
    ee = i
      ? wake.data.source === "slack"
        ? "Your message via Slack"
        : "Your message"
      : `Message from ${bunStringWidth(B) > 0 ? B : "someone"} via ${z}`,
    E = verbose || isTranscriptMode;
  const P = addMargin ? 1 : 0;
  let I;
  if (o[11] === MEMO_CACHE_SENTINEL)
    ((I = e(Text, { "aria-label": "inbound:", color: "suggestion", children: p1e })), (o[11] = I));
  else I = o[11];
  let f;
  if (o[12] !== i || o[13] !== c)
    ((f = e(Box, {
      flexShrink: 0,
      children: r(Text, {
        children: [
          I,
          " ",
          i ? e(Text, { color: "permission", children: c }) : e(Text, { dimColor: !0, children: c }),
        ],
      }),
    })),
      (o[12] = i),
      (o[13] = c),
      (o[14] = f));
  else f = o[14];
  const R = `${ee} \u2014 waiting in the session inbox`;
  let g;
  if (o[15] !== R)
    ((g = e(Box, {
      flexGrow: 1,
      flexShrink: 1,
      paddingLeft: 1,
      children: e(Text, { dimColor: !0, wrap: "wrap", children: R }),
    })),
      (o[15] = R),
      (o[16] = g));
  else g = o[16];
  let k;
  if (o[17] !== g || o[18] !== f)
    ((k = r(Box, { flexDirection: "row", children: [f, g] })), (o[17] = g), (o[18] = f), (o[19] = k));
  else k = o[19];
  let v;
  if (o[20] !== E || o[21] !== O)
    ((v = E
      ? e(Box, { paddingLeft: 2, children: e(Text, { dimColor: !0, wrap: "wrap", children: O }) })
      : null),
      (o[20] = E),
      (o[21] = O),
      (o[22] = v));
  else v = o[22];
  let N;
  if (o[23] !== k || o[24] !== v || o[25] !== P)
    ((N = r(Box, { flexDirection: "column", marginTop: P, children: [k, v] })),
      (o[23] = k),
      (o[24] = v),
      (o[25] = P),
      (o[26] = N));
  else N = o[26];
  return N;
}
