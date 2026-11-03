/**
 * components/messages/HighlightedThinkingText.tsx
 *
 * 思考文本渲染（关键词高亮、读屏 aria-label）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/HighlightedThinkingText.tsx
 * pieces: chunk-j64mp9kq.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Imt } from "../../context/QueuedMessageContext.js";
import { QAr } from "./UserMessageSite.js";
import { formatBriefTimestamp } from "../../utils/formatBriefTimestamp.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { CollapsedLinesDivider, UltrathinkHighlightedText } from "./CollapsedLines.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-j64mp9kq.js:2673-4795 fingerprint = HighlightedThinkingText (0.414)
function HighlightedThinkingText(t0) {
  let $ = w(34),
    {
      text: text,
      useBriefLayout: useBriefLayout,
      timestamp: timestamp,
      bodyOnly: bodyOnly,
      awaitingModel: awaitingModel,
      markLinks: markLinks,
    } = t0,
    l = bodyOnly === void 0 ? !1 : bodyOnly,
    u = awaitingModel === void 0 ? !1 : awaitingModel,
    p = Imt(),
    C = p?.isQueued ?? !1,
    m = typeof text === "object",
    x;
  if ($[0] !== text || $[1] !== m) ((x = !m && QAr(text)), ($[0] = text), ($[1] = m), ($[2] = x));
  else x = $[2];
  let h = x,
    b = p?.selectionHighlight === "on",
    R = C || u;
  if (useBriefLayout || l) {
    let D;
    if ($[3] !== timestamp)
      ((D = timestamp ? formatBriefTimestamp(timestamp) : ""), ($[3] = timestamp), ($[4] = D));
    else D = $[4];
    let q = D;
    let S = b ? "suggestion" : R ? (l ? "inactive" : "subtle") : "text";
    const T = l ? 0 : 2;
    let A;
    if ($[5] !== l || $[6] !== b || $[7] !== q || $[8] !== R)
      ((A = l
        ? null
        : r(Box, {
            flexDirection: "row",
            children: [
              b
                ? r(Text, { "aria-label": "selected:", color: "suggestion", children: [re.pointer, " "] })
                : null,
              e(Text, { color: b ? "suggestion" : R ? "subtle" : "briefLabelYou", children: "You" }),
              q ? r(Text, { dimColor: !0, children: [" ", q] }) : null,
            ],
          })),
        ($[5] = l),
        ($[6] = b),
        ($[7] = q),
        ($[8] = R),
        ($[9] = A));
    else A = $[9];
    let K;
    if (
      $[10] !== l ||
      $[11] !== markLinks ||
      $[12] !== h ||
      $[13] !== text ||
      $[14] !== S ||
      $[15] !== m ||
      $[16] !== R
    )
      ((K = m
        ? r(Fragment, {
            children: [
              e(Text, { color: S, children: text.head }),
              e(CollapsedLinesDivider, { hiddenLines: text.hiddenLines, indent: l ? 0 : 2 }),
              e(Text, { color: S, children: text.tail }),
            ],
          })
        : h
          ? e(MarkdownText_2, {
              promptMode: !0,
              color: S,
              monochrome: R,
              markLinks: markLinks,
              children: text,
            })
          : e(Text, { color: S, children: text })),
        ($[10] = l),
        ($[11] = markLinks),
        ($[12] = h),
        ($[13] = text),
        ($[14] = S),
        ($[15] = m),
        ($[16] = R),
        ($[17] = K));
    else K = $[17];
    let ie;
    if ($[18] !== T || $[19] !== A || $[20] !== K)
      ((ie = r(Box, { flexDirection: "column", paddingLeft: T, children: [A, K] })),
        ($[18] = T),
        ($[19] = A),
        ($[20] = K),
        ($[21] = ie));
    else ie = $[21];
    return ie;
  }
  let v = b ? "suggestion" : R ? "inactive" : "text",
    D;
  if ($[22] !== p?.selectionHighlight || $[23] !== b)
    ((D = e(Box, {
      flexShrink: 0,
      children:
        p?.selectionHighlight === "off"
          ? e(Text, { children: "  " })
          : r(Text, {
              "aria-label": b ? "selected:" : "you:",
              color: b ? "suggestion" : "inactive",
              children: [re.pointer, " "],
            }),
    })),
      ($[22] = p?.selectionHighlight),
      ($[23] = b),
      ($[24] = D));
  else D = $[24];
  let T;
  if ($[25] !== h || $[26] !== text || $[27] !== v || $[28] !== m || $[29] !== R)
    ((T = m
      ? r(Box, {
          flexDirection: "column",
          children: [
            e(UltrathinkHighlightedText, { text: text.head, color: v }),
            e(CollapsedLinesDivider, { hiddenLines: text.hiddenLines, indent: 3 }),
            e(UltrathinkHighlightedText, { text: text.tail, color: v }),
          ],
        })
      : h
        ? e(MarkdownText_2, { promptMode: !0, color: v, monochrome: R, children: text })
        : e(UltrathinkHighlightedText, { text: text, color: v })),
      ($[25] = h),
      ($[26] = text),
      ($[27] = v),
      ($[28] = m),
      ($[29] = R),
      ($[30] = T));
  else T = $[30];
  let A;
  if ($[31] !== D || $[32] !== T)
    ((A = r(Box, { flexDirection: "row", children: [D, T] })), ($[31] = D), ($[32] = T), ($[33] = A));
  else A = $[33];
  return A;
}

export { HighlightedThinkingText };
