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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { useContext } from "../../../vendor/react/cjs/react.production.js";
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
import { TEARDROP_ASTERISK } from "../../constants/figures.js";
import { FilePathLink } from "../FilePathLink.js";

//@ chunk-ah34pb7m.js:51952-52444 placement
/**
 * 压缩边界说明（摘要了多少消息/令牌）。
 */
function compactBoundaryLabel(compactMetadata, historyShortcut, historyTarget) {
  let summaryText =
    compactMetadata.messagesSummarized !== undefined && compactMetadata.messagesSummarized > 0
      ? `${compactMetadata.messagesSummarized} ${compactMetadata.messagesSummarized === 1 ? "message" : "messages"} summarized`
      : compactMetadata.preTokens > 0
        ? `${formatTokens(compactMetadata.preTokens)} tokens summarized`
        : null;
  let whereShortcutLeads =
    historyTarget === null
      ? summaryText
        ? "to see them"
        : "for history"
      : historyTarget.leadsToSummary
        ? "for the summary"
        : null;
  return {
    tone: "dim",
    text: "Compacted",
    detail:
      whereShortcutLeads === null
        ? (summaryText ?? undefined)
        : summaryText
          ? `${summaryText} (${historyShortcut} ${whereShortcutLeads})`
          : `${historyShortcut} ${whereShortcutLeads}`,
    ...(historyTarget?.savedIn !== undefined && {
      subLines: [`Earlier messages are saved in ${historyTarget.savedIn}`],
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
  let stdoutText = tag === null ? "" : unescapeHtmlEntities(tag);
  let stderrText = tag_2 === null ? "" : unescapeHtmlEntities(tag_2);
  let hasStdout = stdoutText.trim() !== "" && stdoutText.trim() !== NO_CONTENT_MESSAGE;
  let hasStderr = stderrText.trim() !== "";
  let label = (hasStdout ? stdoutText : stderrText).trim();
  if (
    label === "" ||
    parseRateLimitLabel(label) !== null ||
    SYSTEM_NOTICE_PREFIXES.some((prefix) => label.startsWith(prefix))
  )
    return {
      kind: "legacy",
    };
  let [firstRow = "", ...subRows] = renderTruncatedContent(
    hasStdout
      ? `${stdoutText}
${stderrText}`
      : stderrText,
    {
      maxChars: SCHEDULED_TEXT_MAX_LENGTH,
      maxLines: 1 / 0,
      preserveLayout: true,
    },
  );
  return {
    kind: "line",
    row: {
      tone: hasStderr ? "red" : "dim",
      text: firstRow,
      ...(command === "compact" && !hasStdout && classifySystemNoticeText(firstRow)),
      subLines: subRows.length > 0 ? subRows : undefined,
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
function buildApiErrorRow(text, { whole = false } = {}) {
  let displayText =
    text === API_ERROR_MESSAGE_PREFIX
      ? `${API_ERROR_MESSAGE_PREFIX}: Please wait a moment and try again.`
      : text;
  let [firstRow = "", ...subRows] = renderTruncatedContent(displayText, {
    maxChars: SCHEDULED_TEXT_MAX_LENGTH,
    ...(whole && {
      maxChars: 1 / 0,
      maxLines: 1 / 0,
      preserveLayout: true,
    }),
  });
  let row = splitNoticeDetail("red", firstRow, {
    linkify: !whole,
  });
  return subRows.length > 0
    ? {
        ...row,
        subLines: subRows,
      }
    : row;
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
  ].filter((part) => part !== null);
  let exitCodeSuffix = formatExitCodeSuffix(0);
  let cleanedSummary =
    status === "completed" &&
    summary.startsWith(BACKGROUND_COMMAND_PREFIX) &&
    summary.endsWith(exitCodeSuffix)
      ? summary.slice(0, -exitCodeSuffix.length)
      : summary;
  let [firstRow = "", ...subRows] = renderTruncatedContent(sanitizeDisplayText(cleanedSummary));
  let sentNote =
    sentMessages === 1
      ? "sent a message (ctrl+o)"
      : sentMessages > 1
        ? `sent ${sentMessages} messages (ctrl+o)`
        : null;
  let mergedSubRows = sentNote === null ? subRows : [...subRows, sentNote];
  return {
    tone: status === "failed" ? "red" : status === "killed" ? "gold" : "dim",
    text: firstRow,
    detail: filtered.length > 0 ? filtered.join(" \xB7 ") : undefined,
    subLines: mergedSubRows.length > 0 ? mergedSubRows : undefined,
    linkify: false,
  };
}
//@ chunk-ah34pb7m.js:53711-53903 placement
/**
 * 构造钩子错误行：阻断性错误与普通错误给出不同标题，原因裁成多行附在下面（红色）。
 */
function buildHookErrorRow({ hookName, blocking, reason }) {
  let reasonLines = renderTruncatedContent(reason, {
    maxLines: HOOK_FEEDBACK_MAX_LINES,
  });
  return {
    tone: "red",
    text: blocking ? `${hookName} hook returned blocking error` : `${hookName} hook error`,
    subLines: reasonLines.length > 0 ? reasonLines : undefined,
    linkify: false,
  };
}
//@ chunk-ah34pb7m.js:53903-54092 placement
/**
 * 构造系统提示行：按字符上限拆出首行与后续行；文本为空时退回旧版渲染。
 */
function buildSystemNoticeLine(tone, content, { maxChars = HOOK_FEEDBACK_MAX_WIDTH, linkify }) {
  let [firstRow, ...subRowLines] = renderTruncatedContent(content, {
    maxChars,
  });
  if (firstRow === undefined)
    return {
      kind: "legacy",
    };
  return {
    kind: "line",
    row: {
      tone,
      text: firstRow,
      subLines: subRowLines.length > 0 ? subRowLines : undefined,
      linkify,
    },
  };
}
//@ chunk-ah34pb7m.js:54092-54284 placement
/**
 * 把提示文本按首个 " · " 或 ": " 拆成 text 与 detail。
 */
function splitNoticeDetail(tone, noticeText, { linkify }) {
  let match = /.( \u00B7 |: )/s.exec(noticeText);
  if (match === null)
    return {
      tone,
      text: noticeText,
      linkify,
    };
  return {
    tone,
    text: noticeText.slice(0, match.index + 1),
    detail: noticeText.slice(match.index + match[0].length),
    linkify,
  };
}
//@ chunk-ah34pb7m.js:187857-189153 fingerprint (2.1.88 match: CompactBoundaryMessage, 0.436)
/**
 * 压缩边界："✻ Conversation compacted (ctrl+o for history)"，说明早先消息保存在 transcript 中。
 */
function CompactBoundaryMessage(props) {
  let $ = useMemoCache(22);
  let { message, transcriptV2Rows } = props;
  let isFullscreen = useIsFullscreen();
  let historyShortcut = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let summaryContext = useContext(CompactSummaryContext);
  let matchingSummary =
    summaryContext !== null && summaryContext.uuid === message.uuid ? summaryContext : null;
  let savedIn = matchingSummary?.summary?.savedIn;
  let savedFile;
  if ($[0] !== savedIn) {
    savedFile =
      savedIn === undefined || filePathToUrl(savedIn)
        ? undefined
        : {
            file: savedIn,
            shown: getDisplayPath(savedIn),
          };
    $[0] = savedIn;
    $[1] = savedFile;
  } else savedFile = $[1];
  let savedFileInfo = savedFile;
  let isTranscriptRow = isFullscreen && matchingSummary === null;
  if (transcriptV2Rows && PreCompactHookInputSchema_2(message.compactMetadata, isTranscriptRow)) {
    let summaryInfo;
    if ($[2] !== savedFileInfo?.shown || $[3] !== matchingSummary) {
      summaryInfo = matchingSummary && {
        leadsToSummary: matchingSummary.summary !== null,
        savedIn: savedFileInfo?.shown,
      };
      $[2] = savedFileInfo?.shown;
      $[3] = matchingSummary;
      $[4] = summaryInfo;
    } else summaryInfo = $[4];
    let row;
    if ($[5] !== historyShortcut || $[6] !== message.compactMetadata || $[7] !== summaryInfo) {
      row = compactBoundaryLabel(message.compactMetadata, historyShortcut, summaryInfo);
      $[5] = historyShortcut;
      $[6] = message.compactMetadata;
      $[7] = summaryInfo;
      $[8] = row;
    } else row = $[8];
    let noticeRowMessageElement;
    if ($[9] !== row) {
      noticeRowMessageElement = jsxProd_default(NoticeRowMessage, {
        row,
        addMargin: true,
      });
      $[9] = row;
      $[10] = noticeRowMessageElement;
    } else noticeRowMessageElement = $[10];
    return noticeRowMessageElement;
  }
  if (isTranscriptRow) {
    return null;
  }
  let marker;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    marker = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [TEARDROP_ASTERISK, " "],
    });
    $[11] = marker;
  } else marker = $[11];
  let hintSuffix;
  if ($[12] !== historyShortcut || $[13] !== matchingSummary) {
    hintSuffix = historyHintSuffix(matchingSummary, historyShortcut);
    $[12] = historyShortcut;
    $[13] = matchingSummary;
    $[14] = hintSuffix;
  } else hintSuffix = $[14];
  let labelText;
  if ($[15] !== hintSuffix) {
    labelText = jsxProd_default_2(Text, {
      dimColor: true,
      children: [marker, "Conversation compacted", hintSuffix],
    });
    $[15] = hintSuffix;
    $[16] = labelText;
  } else labelText = $[16];
  let savedFileHint;
  if ($[17] !== savedFileInfo) {
    savedFileHint =
      savedFileInfo !== undefined &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "Earlier messages are saved in",
            " ",
            jsxProd_default(FilePathLink, {
              filePath: savedFileInfo.file,
              children: savedFileInfo.shown,
            }),
          ],
        }),
      });
    $[17] = savedFileInfo;
    $[18] = savedFileHint;
  } else savedFileHint = $[18];
  let boxElement;
  if ($[19] !== labelText || $[20] !== savedFileHint) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginY: 1,
      children: [labelText, savedFileHint],
    });
    $[19] = labelText;
    $[20] = savedFileHint;
    $[21] = boxElement;
  } else boxElement = $[21];
  return boxElement;
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
