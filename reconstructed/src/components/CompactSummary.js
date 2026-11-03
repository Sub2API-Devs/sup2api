/**
 * components/CompactSummary.tsx
 *
 * 压缩摘要消息："Summarized conversation"，transcript 模式下可展开摘要正文。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CompactSummary.tsx
 * pieces: chunk-ah34pb7m.js (5)
 * attribution: placement 4, fingerprint 1
 */
import { j } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "./pluginUi/render/actionKeys.js";
import { rewriteToolsUsedSummaryTag } from "../utils/messages/untrustedArtifactContent.js";
import { getUserMessageText } from "../utils/messages.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { BLACK_CIRCLE } from "../utils/permissions/autoModeRulesPrompt.js";
import { MessageResponse } from "./MessageResponse.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";

//@ chunk-ah34pb7m.js:37715-37719 placement
j();
//@ chunk-ah34pb7m.js:37719-37745 placement
function LU() {
  return null;
}
/**
 * 为消息（uuid/id/plugin）注册 "Placed" 渲染钩子的动作键输入。
 */
//@ chunk-ah34pb7m.js:37745-38008 placement
function usePlacedActionKeys(m) {
  let f = w(5),
    { uuid: uuid, id: id, plugin: plugin } = m.message,
    h,
    M;
  if (f[0] !== id || f[1] !== plugin || f[2] !== uuid)
    ((h = () => ({ requestId: uuid, props: { id: id, plugin: plugin } })),
      (M = [uuid, id, plugin]),
      (f[0] = id),
      (f[1] = plugin),
      (f[2] = uuid),
      (f[3] = h),
      (f[4] = M));
  else ((h = f[3]), (M = f[4]));
  return actionKeysNamespace.useRenderHook(actionKeysNamespace.useRenderInput("Placed", h, M), LU);
}
/**
 * 处理压缩摘要文本用于显示。
 */
//@ chunk-ah34pb7m.js:38008-38044 placement
function renderCompactSummaryText(m, d) {
  return ((m = rewriteToolsUsedSummaryTag(m)), m);
}
//@ chunk-ah34pb7m.js:38044-39964 fingerprint = CompactSummary (0.75)
function CompactSummary(t0) {
  let $ = w(24),
    { message: message, screen: screen } = t0,
    isTranscriptMode = screen === "transcript",
    h;
  if ($[0] !== message)
    ((h = renderCompactSummaryText(getUserMessageText(message) || "", message.modelOnlyText)),
      ($[0] = message),
      ($[1] = h));
  else h = $[1];
  let textContent = h,
    metadata = message.summarizeMetadata;
  if (metadata) {
    let x;
    if ($[2] === MEMO_CACHE_SENTINEL)
      ((x = e(Box, {
        minWidth: 2,
        children: e(Text, { "aria-hidden": !0, color: "text", children: BLACK_CIRCLE }),
      })),
        ($[2] = x));
    else x = $[2];
    let k;
    if ($[3] === MEMO_CACHE_SENTINEL)
      ((k = e(Text, { bold: !0, children: "Summarized conversation" })), ($[3] = k));
    else k = $[3];
    let b;
    if ($[4] !== isTranscriptMode || $[5] !== metadata)
      ((b =
        !isTranscriptMode &&
        e(MessageResponse, {
          children: r(Box, {
            flexDirection: "column",
            children: [
              r(Text, {
                dimColor: !0,
                children: [
                  "Summarized ",
                  metadata.messagesSummarized,
                  " messages",
                  " ",
                  metadata.direction === "up_to" ? "up to this point" : "from this point",
                ],
              }),
              metadata.userContext &&
                r(Text, { dimColor: !0, children: ["Context: ", "\u201C", metadata.userContext, "\u201D"] }),
              e(Text, {
                dimColor: !0,
                children: e(ConfigurableShortcutHint, {
                  action: "app:toggleTranscript",
                  context: "Global",
                  fallback: "ctrl+o",
                  description: "expand history",
                  parens: !0,
                }),
              }),
            ],
          }),
        })),
        ($[4] = isTranscriptMode),
        ($[5] = metadata),
        ($[6] = b));
    else b = $[6];
    let E;
    if ($[7] !== isTranscriptMode || $[8] !== textContent)
      ((E = isTranscriptMode && e(MessageResponse, { children: e(Text, { children: textContent }) })),
        ($[7] = isTranscriptMode),
        ($[8] = textContent),
        ($[9] = E));
    else E = $[9];
    let B;
    if ($[10] !== b || $[11] !== E)
      ((B = e(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: r(Box, {
          flexDirection: "row",
          children: [x, r(Box, { flexDirection: "column", children: [k, b, E] })],
        }),
      })),
        ($[10] = b),
        ($[11] = E),
        ($[12] = B));
    else B = $[12];
    return B;
  }
  let x;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((x = e(Box, {
      minWidth: 2,
      children: e(Text, { "aria-hidden": !0, color: "text", children: BLACK_CIRCLE }),
    })),
      ($[13] = x));
  else x = $[13];
  let k;
  if ($[14] !== isTranscriptMode)
    ((k =
      !isTranscriptMode &&
      r(Text, {
        dimColor: !0,
        children: [
          " ",
          e(ConfigurableShortcutHint, {
            action: "app:toggleTranscript",
            context: "Global",
            fallback: "ctrl+o",
            description: "expand",
            parens: !0,
          }),
        ],
      })),
      ($[14] = isTranscriptMode),
      ($[15] = k));
  else k = $[15];
  let b;
  if ($[16] !== k)
    ((b = r(Box, {
      flexDirection: "row",
      children: [
        x,
        e(Box, {
          flexDirection: "column",
          children: r(Text, { bold: !0, children: ["Compact summary", k] }),
        }),
      ],
    })),
      ($[16] = k),
      ($[17] = b));
  else b = $[17];
  let E;
  if ($[18] !== isTranscriptMode || $[19] !== textContent)
    ((E = isTranscriptMode && e(MessageResponse, { children: e(Text, { children: textContent }) })),
      ($[18] = isTranscriptMode),
      ($[19] = textContent),
      ($[20] = E));
  else E = $[20];
  let B;
  if ($[21] !== b || $[22] !== E)
    ((B = r(Box, { flexDirection: "column", marginTop: 1, children: [b, E] })),
      ($[21] = b),
      ($[22] = E),
      ($[23] = B));
  else B = $[23];
  return B;
}

export { renderCompactSummaryText, usePlacedActionKeys, CompactSummary };
