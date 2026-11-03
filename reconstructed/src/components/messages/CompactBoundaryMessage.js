/**
 * components/messages/CompactBoundaryMessage.tsx
 *
 * 压缩边界："Conversation compacted · ctrl+o for history"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/CompactBoundaryMessage.tsx
 * pieces: chunk-ah34pb7m.js (9)
 * attribution: placement 8, fingerprint 1
 */
import { formatTokens, formatDuration } from "../../utils/format.js";
import { extractTag } from "../../utils/messages.js";
import {
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  formatExitCodeSuffix,
  BACKGROUND_COMMAND_PREFIX,
} from "../../constants/xml.js";
import { unescapeHtmlEntities } from "../../utils/confusables.js";
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import { parseRateLimitLabel } from "../rateLimit/usageCreditsOffer.js";
import { eE, Ir, classifySystemNoticeText, Zu, Cy } from "./SystemNoticeMessage.js";
import { renderTruncatedContent } from "../../utils/terminal.js";
import { Ii } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { API_ERROR_MESSAGE_PREFIX } from "../../services/api/errors.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { Se } from "../../../vendor/react/cjs/react.production.js";
import { CompactSummaryContext, historyHintSuffix } from "./GroupedToolUseContent.js";
import { ztn } from "../../hooks/useWorkspaceDiff.js";
import { getDisplayPath } from "../../utils/file.js";
import { PreCompactHookInputSchema_2 } from "../../entrypoints/sdk/coreSchemas.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { TEARDROP_ASTERISK } from "../../utils/permissions/autoModeRulesPrompt.js";
import { FilePathLink } from "../FilePathLink.js";

/**
 * 压缩边界说明（摘要了多少消息/令牌）。
 */
//@ chunk-ah34pb7m.js:51952-52444 placement
function compactBoundaryLabel(m, d, c) {
  let g =
      m.messagesSummarized !== void 0 && m.messagesSummarized > 0
        ? `${m.messagesSummarized} ${m.messagesSummarized === 1 ? "message" : "messages"} summarized`
        : m.preTokens > 0
          ? `${formatTokens(m.preTokens)} tokens summarized`
          : null,
    f = c === null ? (g ? "to see them" : "for history") : c.leadsToSummary ? "for the summary" : null;
  return {
    tone: "dim",
    text: "Compacted",
    detail: f === null ? (g ?? void 0) : g ? `${g} (${d} ${f})` : `${d} ${f}`,
    ...(c?.savedIn !== void 0 && { subLines: [`Earlier messages are saved in ${c.savedIn}`] }),
    linkify: !1,
  };
}
/**
 * 解析本地命令输出的标签内容，判定新格式或旧格式。
 */
//@ chunk-ah34pb7m.js:52444-52869 placement
function parseLocalCommandOutput(m, d) {
  let c = extractTag(m, LOCAL_COMMAND_STDOUT),
    g = extractTag(m, LOCAL_COMMAND_STDERR),
    f = c === null ? "" : unescapeHtmlEntities(c),
    h = g === null ? "" : unescapeHtmlEntities(g),
    M = f.trim() !== "" && f.trim() !== NO_CONTENT_MESSAGE,
    T = h.trim() !== "",
    trimmed = (M ? f : h).trim();
  if (trimmed === "" || parseRateLimitLabel(trimmed) !== null || eE.some((E) => trimmed.startsWith(E)))
    return { kind: "legacy" };
  let [k = "", ...b] = renderTruncatedContent(
    M
      ? `${f}
${h}`
      : h,
    { maxChars: Ir, maxLines: 1 / 0, preserveLayout: !0 },
  );
  return {
    kind: "line",
    row: {
      tone: T ? "red" : "dim",
      text: k,
      ...(d === "compact" && !M && classifySystemNoticeText(k)),
      subLines: b.length > 0 ? b : void 0,
      linkify: !1,
    },
  };
}
//@ chunk-ah34pb7m.js:52869-52968 placement
function Lr({ isBySendNow: isBySendNow }) {
  return { tone: "dim", text: "Interrupted", detail: isBySendNow ? void 0 : Ii(), linkify: !1 };
}
/**
 * 把 API 错误文本做成红色提示行：仅前缀时补"请稍后再试"，按长度截断，whole 时完整保留布局。
 */
//@ chunk-ah34pb7m.js:52968-53208 placement
function buildApiErrorRow(m, { whole: d = !1 } = {}) {
  let c =
      m === API_ERROR_MESSAGE_PREFIX ? `${API_ERROR_MESSAGE_PREFIX}: Please wait a moment and try again.` : m,
    [g = "", ...f] = renderTruncatedContent(c, {
      maxChars: Ir,
      ...(d && { maxChars: 1 / 0, maxLines: 1 / 0, preserveLayout: !0 }),
    }),
    h = splitNoticeDetail("red", g, { linkify: !d });
  return f.length > 0 ? { ...h, subLines: f } : h;
}
/**
 * 后台任务通知的一行摘要（状态、上下文、耗时、投递说明）。
 */
//@ chunk-ah34pb7m.js:53208-53711 placement
function taskNotificationSummaryLine({
  status: status,
  summary: summary,
  context: context,
  durationMs: durationMs,
  deliveryNote: deliveryNote,
  sentMessages: sentMessages,
}) {
  let filtered = [
      context,
      Number.isFinite(durationMs) && durationMs > 0 ? formatDuration(durationMs) : null,
      deliveryNote,
    ].filter((L) => L !== null),
    T = formatExitCodeSuffix(0),
    x =
      status === "completed" && summary.startsWith(BACKGROUND_COMMAND_PREFIX) && summary.endsWith(T)
        ? summary.slice(0, -T.length)
        : summary,
    [k = "", ...b] = renderTruncatedContent(sanitizeDisplayText(x)),
    E =
      sentMessages === 1
        ? "sent a message (ctrl+o)"
        : sentMessages > 1
          ? `sent ${sentMessages} messages (ctrl+o)`
          : null,
    B = E === null ? b : [...b, E];
  return {
    tone: status === "failed" ? "red" : status === "killed" ? "gold" : "dim",
    text: k,
    detail: filtered.length > 0 ? filtered.join(" \xB7 ") : void 0,
    subLines: B.length > 0 ? B : void 0,
    linkify: !1,
  };
}
/**
 * 构造钩子错误行：阻断性错误与普通错误给出不同标题，原因裁成多行附在下面（红色）。
 */
//@ chunk-ah34pb7m.js:53711-53903 placement
function buildHookErrorRow({ hookName: hookName, blocking: blocking, reason: reason }) {
  let g = renderTruncatedContent(reason, { maxLines: Zu });
  return {
    tone: "red",
    text: blocking ? `${hookName} hook returned blocking error` : `${hookName} hook error`,
    subLines: g.length > 0 ? g : void 0,
    linkify: !1,
  };
}
/**
 * 构造系统提示行：按字符上限拆出首行与后续行；文本为空时退回旧版渲染。
 */
//@ chunk-ah34pb7m.js:53903-54092 placement
function buildSystemNoticeLine(m, d, { maxChars: maxChars = Cy, linkify: linkify }) {
  let [f, ...h] = renderTruncatedContent(d, { maxChars: maxChars });
  if (f === void 0) return { kind: "legacy" };
  return { kind: "line", row: { tone: m, text: f, subLines: h.length > 0 ? h : void 0, linkify: linkify } };
}
/**
 * 把提示文本按首个 " · " 或 ": " 拆成 text 与 detail。
 */
//@ chunk-ah34pb7m.js:54092-54284 placement
function splitNoticeDetail(m, d, { linkify: linkify }) {
  let match = /.( \u00B7 |: )/s.exec(d);
  if (match === null) return { tone: m, text: d, linkify: linkify };
  return {
    tone: m,
    text: d.slice(0, match.index + 1),
    detail: d.slice(match.index + match[0].length),
    linkify: linkify,
  };
}
/**
 * 压缩边界："✻ Conversation compacted (ctrl+o for history)"，说明早先消息保存在 transcript 中。
 */
//@ chunk-ah34pb7m.js:187857-189153 fingerprint = CompactBoundaryMessage (0.436)
function CompactBoundaryMessage(m) {
  let $ = w(22),
    { message: message, transcriptV2Rows: transcriptV2Rows } = m,
    g = useIsFullscreen(),
    historyShortcut = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    h = Se(CompactSummaryContext),
    M = h !== null && h.uuid === message.uuid ? h : null,
    T = M?.summary?.savedIn,
    k;
  if ($[0] !== T)
    ((k = T === void 0 || ztn(T) ? void 0 : { file: T, shown: getDisplayPath(T) }), ($[0] = T), ($[1] = k));
  else k = $[1];
  let b = k,
    E = g && M === null;
  if (transcriptV2Rows && PreCompactHookInputSchema_2(message.compactMetadata, E)) {
    let B;
    if ($[2] !== b?.shown || $[3] !== M)
      ((B = M && { leadsToSummary: M.summary !== null, savedIn: b?.shown }),
        ($[2] = b?.shown),
        ($[3] = M),
        ($[4] = B));
    else B = $[4];
    let L;
    if ($[5] !== historyShortcut || $[6] !== message.compactMetadata || $[7] !== B)
      ((L = compactBoundaryLabel(message.compactMetadata, historyShortcut, B)),
        ($[5] = historyShortcut),
        ($[6] = message.compactMetadata),
        ($[7] = B),
        ($[8] = L));
    else L = $[8];
    let N;
    if ($[9] !== L) ((N = e(NoticeRowMessage, { row: L, addMargin: !0 })), ($[9] = L), ($[10] = N));
    else N = $[10];
    return N;
  }
  if (E) {
    return null;
  }
  let B;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((B = r(Text, { "aria-hidden": !0, children: [TEARDROP_ASTERISK, " "] })), ($[11] = B));
  else B = $[11];
  let L;
  if ($[12] !== historyShortcut || $[13] !== M)
    ((L = historyHintSuffix(M, historyShortcut)), ($[12] = historyShortcut), ($[13] = M), ($[14] = L));
  else L = $[14];
  let N;
  if ($[15] !== L)
    ((N = r(Text, { dimColor: !0, children: [B, "Conversation compacted", L] })), ($[15] = L), ($[16] = N));
  else N = $[16];
  let W;
  if ($[17] !== b)
    ((W =
      b !== void 0 &&
      e(Box, {
        paddingLeft: 2,
        children: r(Text, {
          dimColor: !0,
          children: [
            "Earlier messages are saved in",
            " ",
            e(FilePathLink, { filePath: b.file, children: b.shown }),
          ],
        }),
      })),
      ($[17] = b),
      ($[18] = W));
  else W = $[18];
  let U;
  if ($[19] !== N || $[20] !== W)
    ((U = r(Box, { flexDirection: "column", marginY: 1, children: [N, W] })),
      ($[19] = N),
      ($[20] = W),
      ($[21] = U));
  else U = $[21];
  return U;
}

export {
  splitNoticeDetail,
  buildSystemNoticeLine,
  Lr,
  buildApiErrorRow,
  taskNotificationSummaryLine,
  parseLocalCommandOutput,
  buildHookErrorRow,
  CompactBoundaryMessage,
};
