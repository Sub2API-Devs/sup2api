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
import {
  SYSTEM_NOTICE_PREFIXES,
  SCHEDULED_TEXT_MAX_LENGTH,
  classifySystemNoticeText,
  HOOK_FEEDBACK_MAX_LINES,
  HOOK_FEEDBACK_MAX_WIDTH,
} from "./SystemNoticeMessage.js";
import { renderTruncatedContent } from "../../utils/terminal.js";
import { REJECTED_FEEDBACK_PLACEHOLDER } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { API_ERROR_MESSAGE_PREFIX } from "../../services/api/errors.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { Se } from "../../../vendor/react/cjs/react.production.js";
import { CompactSummaryContext, historyHintSuffix } from "./GroupedToolUseContent.js";
import { filePathToUrl } from "../../hooks/useWorkspaceDiff.js";
import { getDisplayPath } from "../../utils/file.js";
import { PreCompactHookInputSchema_2 } from "../../entrypoints/sdk/coreSchemas.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { TEARDROP_ASTERISK } from "../../utils/permissions/autoModeRulesPrompt.js";
import { FilePathLink } from "../FilePathLink.js";

//@ chunk-ah34pb7m.js:51952-52444 placement
/**
 * 压缩边界说明（摘要了多少消息/令牌）。
 */
function compactBoundaryLabel(compactMetadata, historyShortcut, c) {
  let g =
    compactMetadata.messagesSummarized !== undefined && compactMetadata.messagesSummarized > 0
      ? `${compactMetadata.messagesSummarized} ${compactMetadata.messagesSummarized === 1 ? "message" : "messages"} summarized`
      : compactMetadata.preTokens > 0
        ? `${formatTokens(compactMetadata.preTokens)} tokens summarized`
        : null;
  let f = c === null ? (g ? "to see them" : "for history") : c.leadsToSummary ? "for the summary" : null;
  return {
    tone: "dim",
    text: "Compacted",
    detail: f === null ? (g ?? undefined) : g ? `${g} (${historyShortcut} ${f})` : `${historyShortcut} ${f}`,
    ...(c?.savedIn !== undefined && {
      subLines: [`Earlier messages are saved in ${c.savedIn}`],
    }),
    linkify: false,
  };
}
//@ chunk-ah34pb7m.js:52444-52869 placement
/**
 * 解析本地命令输出的标签内容，判定新格式或旧格式。
 */
function parseLocalCommandOutput(content, command) {
  let tag = extractTag(content, LOCAL_COMMAND_STDOUT);
  let tag_2 = extractTag(content, LOCAL_COMMAND_STDERR);
  let f = tag === null ? "" : unescapeHtmlEntities(tag);
  let h = tag_2 === null ? "" : unescapeHtmlEntities(tag_2);
  let M = f.trim() !== "" && f.trim() !== NO_CONTENT_MESSAGE;
  let T = h.trim() !== "";
  let trimmed = (M ? f : h).trim();
  if (
    trimmed === "" ||
    parseRateLimitLabel(trimmed) !== null ||
    SYSTEM_NOTICE_PREFIXES.some((E) => trimmed.startsWith(E))
  )
    return {
      kind: "legacy",
    };
  let [k = "", ...b] = renderTruncatedContent(
    M
      ? `${f}
${h}`
      : h,
    {
      maxChars: SCHEDULED_TEXT_MAX_LENGTH,
      maxLines: 1 / 0,
      preserveLayout: true,
    },
  );
  return {
    kind: "line",
    row: {
      tone: T ? "red" : "dim",
      text: k,
      ...(command === "compact" && !M && classifySystemNoticeText(k)),
      subLines: b.length > 0 ? b : undefined,
      linkify: false,
    },
  };
}
//@ chunk-ah34pb7m.js:52869-52968 placement
function interruptedRow({ isBySendNow }) {
  return {
    tone: "dim",
    text: "Interrupted",
    detail: isBySendNow ? undefined : REJECTED_FEEDBACK_PLACEHOLDER(),
    linkify: false,
  };
}
//@ chunk-ah34pb7m.js:52968-53208 placement
/**
 * 把 API 错误文本做成红色提示行：仅前缀时补"请稍后再试"，按长度截断，whole 时完整保留布局。
 */
function buildApiErrorRow(text, { whole: d = false } = {}) {
  let c =
    text === API_ERROR_MESSAGE_PREFIX
      ? `${API_ERROR_MESSAGE_PREFIX}: Please wait a moment and try again.`
      : text;
  let [g = "", ...f] = renderTruncatedContent(c, {
    maxChars: SCHEDULED_TEXT_MAX_LENGTH,
    ...(d && {
      maxChars: 1 / 0,
      maxLines: 1 / 0,
      preserveLayout: true,
    }),
  });
  let h = splitNoticeDetail("red", g, {
    linkify: !d,
  });
  return f.length > 0
    ? {
        ...h,
        subLines: f,
      }
    : h;
}
//@ chunk-ah34pb7m.js:53208-53711 placement
/**
 * 后台任务通知的一行摘要（状态、上下文、耗时、投递说明）。
 */
function taskNotificationSummaryLine({ status, summary, context, durationMs, deliveryNote, sentMessages }) {
  let filtered = [
    context,
    Number.isFinite(durationMs) && durationMs > 0 ? formatDuration(durationMs) : null,
    deliveryNote,
  ].filter((L) => L !== null);
  let T = formatExitCodeSuffix(0);
  let x =
    status === "completed" && summary.startsWith(BACKGROUND_COMMAND_PREFIX) && summary.endsWith(T)
      ? summary.slice(0, -T.length)
      : summary;
  let [k = "", ...b] = renderTruncatedContent(sanitizeDisplayText(x));
  let E =
    sentMessages === 1
      ? "sent a message (ctrl+o)"
      : sentMessages > 1
        ? `sent ${sentMessages} messages (ctrl+o)`
        : null;
  let B = E === null ? b : [...b, E];
  return {
    tone: status === "failed" ? "red" : status === "killed" ? "gold" : "dim",
    text: k,
    detail: filtered.length > 0 ? filtered.join(" \xB7 ") : undefined,
    subLines: B.length > 0 ? B : undefined,
    linkify: false,
  };
}
//@ chunk-ah34pb7m.js:53711-53903 placement
/**
 * 构造钩子错误行：阻断性错误与普通错误给出不同标题，原因裁成多行附在下面（红色）。
 */
function buildHookErrorRow({ hookName, blocking, reason }) {
  let g = renderTruncatedContent(reason, {
    maxLines: HOOK_FEEDBACK_MAX_LINES,
  });
  return {
    tone: "red",
    text: blocking ? `${hookName} hook returned blocking error` : `${hookName} hook error`,
    subLines: g.length > 0 ? g : undefined,
    linkify: false,
  };
}
//@ chunk-ah34pb7m.js:53903-54092 placement
/**
 * 构造系统提示行：按字符上限拆出首行与后续行；文本为空时退回旧版渲染。
 */
function buildSystemNoticeLine(tone, content, { maxChars = HOOK_FEEDBACK_MAX_WIDTH, linkify }) {
  let [f, ...h] = renderTruncatedContent(content, {
    maxChars,
  });
  if (f === undefined)
    return {
      kind: "legacy",
    };
  return {
    kind: "line",
    row: {
      tone,
      text: f,
      subLines: h.length > 0 ? h : undefined,
      linkify,
    },
  };
}
//@ chunk-ah34pb7m.js:54092-54284 placement
/**
 * 把提示文本按首个 " · " 或 ": " 拆成 text 与 detail。
 */
function splitNoticeDetail(tone, d, { linkify }) {
  let match = /.( \u00B7 |: )/s.exec(d);
  if (match === null)
    return {
      tone,
      text: d,
      linkify,
    };
  return {
    tone,
    text: d.slice(0, match.index + 1),
    detail: d.slice(match.index + match[0].length),
    linkify,
  };
}
//@ chunk-ah34pb7m.js:187857-189153 fingerprint = CompactBoundaryMessage (0.436)
/**
 * 压缩边界："✻ Conversation compacted (ctrl+o for history)"，说明早先消息保存在 transcript 中。
 */
function CompactBoundaryMessage(props) {
  let $ = w(22);
  let { message, transcriptV2Rows } = props;
  let isFullscreen = useIsFullscreen();
  let historyShortcut = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let h = Se(CompactSummaryContext);
  let M = h !== null && h.uuid === message.uuid ? h : null;
  let savedIn = M?.summary?.savedIn;
  let k;
  if ($[0] !== savedIn) {
    k =
      savedIn === undefined || filePathToUrl(savedIn)
        ? undefined
        : {
            file: savedIn,
            shown: getDisplayPath(savedIn),
          };
    $[0] = savedIn;
    $[1] = k;
  } else k = $[1];
  let b = k;
  let E = isFullscreen && M === null;
  if (transcriptV2Rows && PreCompactHookInputSchema_2(message.compactMetadata, E)) {
    let B;
    if ($[2] !== b?.shown || $[3] !== M) {
      B = M && {
        leadsToSummary: M.summary !== null,
        savedIn: b?.shown,
      };
      $[2] = b?.shown;
      $[3] = M;
      $[4] = B;
    } else B = $[4];
    let row;
    if ($[5] !== historyShortcut || $[6] !== message.compactMetadata || $[7] !== B) {
      row = compactBoundaryLabel(message.compactMetadata, historyShortcut, B);
      $[5] = historyShortcut;
      $[6] = message.compactMetadata;
      $[7] = B;
      $[8] = row;
    } else row = $[8];
    let N;
    if ($[9] !== row) {
      N = jsxProd_default(NoticeRowMessage, {
        row,
        addMargin: true,
      });
      $[9] = row;
      $[10] = N;
    } else N = $[10];
    return N;
  }
  if (E) {
    return null;
  }
  let B;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    B = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [TEARDROP_ASTERISK, " "],
    });
    $[11] = B;
  } else B = $[11];
  let L;
  if ($[12] !== historyShortcut || $[13] !== M) {
    L = historyHintSuffix(M, historyShortcut);
    $[12] = historyShortcut;
    $[13] = M;
    $[14] = L;
  } else L = $[14];
  let N;
  if ($[15] !== L) {
    N = jsxProd_default_2(Text, {
      dimColor: true,
      children: [B, "Conversation compacted", L],
    });
    $[15] = L;
    $[16] = N;
  } else N = $[16];
  let W;
  if ($[17] !== b) {
    W =
      b !== undefined &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "Earlier messages are saved in",
            " ",
            jsxProd_default(FilePathLink, {
              filePath: b.file,
              children: b.shown,
            }),
          ],
        }),
      });
    $[17] = b;
    $[18] = W;
  } else W = $[18];
  let U;
  if ($[19] !== N || $[20] !== W) {
    U = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginY: 1,
      children: [N, W],
    });
    $[19] = N;
    $[20] = W;
    $[21] = U;
  } else U = $[21];
  return U;
}
export {
  splitNoticeDetail,
  buildSystemNoticeLine,
  interruptedRow,
  buildApiErrorRow,
  buildHookErrorRow,
  taskNotificationSummaryLine,
  parseLocalCommandOutput,
  CompactBoundaryMessage,
};
