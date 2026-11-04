/**
 * components/messages/TeammateResultMessage.tsx
 *
 * 2.1.316 新增：队友结束消息（完成/失败/中断、摘要、结果）；队友私信/最后消息显示等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (12)
 * attribution: placement 12
 */
import {
  capFrameFieldForDisplay,
  capFailureReasonForDisplay,
  capReceivedIdleResult,
  capIdFrameField,
  IDLE_SUMMARY_RECEIVE_BOUND,
  IDLE_ID_FIELD_RECEIVE_BOUND,
  stripFrameControlChars,
} from "../../utils/teammateMailbox.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import {
  init_react_production,
  useContext,
  createContext,
} from "../../../vendor/react/cjs/react.production.js";
import { artifactRoomViewNotificationHeader } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { expandContextSignal } from "./expandContext.js";
import { useSessionOrUndefined } from "../../context/session.js";
import { detachedCallSlots } from "../../services/tools/detachedToolCalls.js";
import { extractTag } from "../../utils/messages.js";
import {
  TOOL_USE_ID,
  SUMMARY,
  MONITOR_EVENT_QUOTED_PREFIX,
  EVENT,
  MONITOR_EVENT_PREFIX,
} from "../../constants/xml.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { escapeControlChars, truncateWithCount } from "../../utils/stringUtils.js";
import { unescapeHtmlEntities } from "../../utils/confusables.js";
import { ToolResultInline } from "./AssistantToolUseMessage.js";
import { processQueuedCommands_3 } from "../../utils/queuedCommandDisplay.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth } from "../../utils/format.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ah34pb7m.js:95673-95736 placement
function truncateFrameField(value) {
  let capped = capFrameFieldForDisplay(value);
  return capped === value.trim() ? capped : `${capped}\u2026`;
}
//@ chunk-ah34pb7m.js:95736-97547 placement
/**
 * 队友结束消息（完成/失败/中断、摘要、结果）。
 */
function TeammateResultMessage(props) {
  let $ = useMemoCache(39);
  let { displayName, inkColor, idleReason, failureReason, summary, completedTaskId, result, expanded } =
    props;
  let color = idleReason === "failed" ? "error" : idleReason === "interrupted" ? "warning" : "success";
  let verb =
    idleReason === "failed" ? "failed" : idleReason === "interrupted" ? "was interrupted" : "finished";
  let cappedFailure;
  if ($[0] !== failureReason) {
    cappedFailure = capFailureReasonForDisplay(failureReason);
    $[0] = failureReason;
    $[1] = cappedFailure;
  } else cappedFailure = $[1];
  let failureText = cappedFailure;
  let cappedResult;
  if ($[2] !== idleReason || $[3] !== result) {
    cappedResult = result ? capReceivedIdleResult(result, idleReason !== "failed") : "";
    $[2] = idleReason;
    $[3] = result;
    $[4] = cappedResult;
  } else cappedResult = $[4];
  let resultText = cappedResult;
  let cappedSummary;
  if ($[5] !== summary) {
    cappedSummary = summary ? capIdFrameField(summary, IDLE_SUMMARY_RECEIVE_BOUND) : "";
    $[5] = summary;
    $[6] = cappedSummary;
  } else cappedSummary = $[6];
  let summaryText = cappedSummary;
  let cappedTaskId;
  if ($[7] !== completedTaskId) {
    cappedTaskId = completedTaskId ? capIdFrameField(completedTaskId, IDLE_ID_FIELD_RECEIVE_BOUND) : "";
    $[7] = completedTaskId;
    $[8] = cappedTaskId;
  } else cappedTaskId = $[8];
  let taskIdText = cappedTaskId;
  let truncatedResult;
  if ($[9] !== resultText || $[10] !== expanded) {
    truncatedResult = !expanded && resultText ? truncateFrameField(resultText) : "";
    $[9] = resultText;
    $[10] = expanded;
    $[11] = truncatedResult;
  } else truncatedResult = $[11];
  let truncatedResult_2 = truncatedResult;
  let statusDot;
  if ($[12] !== color) {
    statusDot = jsxProd_default(Text, {
      "aria-hidden": true,
      color,
      children: BLACK_CIRCLE,
    });
    $[12] = color;
    $[13] = statusDot;
  } else statusDot = $[13];
  let nameText;
  if ($[14] !== displayName || $[15] !== inkColor) {
    nameText = jsxProd_default_2(Text, {
      color: inkColor,
      bold: true,
      children: ["@", displayName],
    });
    $[14] = displayName;
    $[15] = inkColor;
    $[16] = nameText;
  } else nameText = $[16];
  let failureSuffix;
  if ($[17] !== failureText) {
    failureSuffix =
      failureText &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [": ", failureText],
      });
    $[17] = failureText;
    $[18] = failureSuffix;
  } else failureSuffix = $[18];
  let taskSuffix;
  if ($[19] !== taskIdText || $[20] !== expanded) {
    taskSuffix =
      expanded && taskIdText
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [" (task #", taskIdText, ")"],
          })
        : null;
    $[19] = taskIdText;
    $[20] = expanded;
    $[21] = taskSuffix;
  } else taskSuffix = $[21];
  let headerLine;
  if (
    $[22] !== verb ||
    $[23] !== statusDot ||
    $[24] !== nameText ||
    $[25] !== failureSuffix ||
    $[26] !== taskSuffix
  ) {
    headerLine = jsxProd_default_2(Text, {
      children: [statusDot, " ", "Teammate", " ", nameText, " ", verb, failureSuffix, taskSuffix],
    });
    $[22] = verb;
    $[23] = statusDot;
    $[24] = nameText;
    $[25] = failureSuffix;
    $[26] = taskSuffix;
    $[27] = headerLine;
  } else headerLine = $[27];
  let lastDmRow;
  if ($[28] !== summaryText || $[29] !== expanded) {
    lastDmRow =
      expanded && summaryText
        ? jsxProd_default(Box, {
            paddingLeft: 2,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: ["Last DM: ", summaryText],
            }),
          })
        : null;
    $[28] = summaryText;
    $[29] = expanded;
    $[30] = lastDmRow;
  } else lastDmRow = $[30];
  let resultRow;
  if ($[31] !== resultText || $[32] !== expanded || $[33] !== truncatedResult_2) {
    resultRow =
      expanded && resultText
        ? jsxProd_default(Box, {
            paddingLeft: 2,
            children: jsxProd_default(MarkdownText_2, {
              stripPromptTags: false,
              children: resultText,
            }),
          })
        : truncatedResult_2
          ? jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: truncatedResult_2,
              }),
            })
          : null;
    $[31] = resultText;
    $[32] = expanded;
    $[33] = truncatedResult_2;
    $[34] = resultRow;
  } else resultRow = $[34];
  let content;
  if ($[35] !== headerLine || $[36] !== lastDmRow || $[37] !== resultRow) {
    content = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [headerLine, lastDmRow, resultRow],
    });
    $[35] = headerLine;
    $[36] = lastDmRow;
    $[37] = resultRow;
    $[38] = content;
  } else content = $[38];
  return content;
}
//@ chunk-ah34pb7m.js:97547-97551 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:97547", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:97551-97593 placement
function isArtifactRoomViewNotification(text) {
  return text.startsWith(artifactRoomViewNotificationHeader());
}
//@ chunk-ah34pb7m.js:97593-97597 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:97593", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:97597-98468 placement
/**
 * 队友私信/最后消息显示。
 */
function TeammateDmMessage(props) {
  let $ = useMemoCache(15);
  let { addMargin, text, verbose } = props;
  let expandContext = useContext(expandContextSignal);
  let sessionOrUndefined = useSessionOrUndefined();
  let detachedStore;
  if ($[0] !== sessionOrUndefined) {
    detachedStore = sessionOrUndefined ? detachedCallSlots.of(sessionOrUndefined) : null;
    $[0] = sessionOrUndefined;
    $[1] = detachedStore;
  } else detachedStore = $[1];
  let detachedSlot = detachedStore;
  let toolUseId;
  if ($[2] !== text) {
    toolUseId = extractTag(text, TOOL_USE_ID);
    $[2] = text;
    $[3] = toolUseId;
  } else toolUseId = $[3];
  let resultState = toolUseId;
  let resultElement;
  if ($[4] !== resultState) {
    resultElement = (bodyElement) => (resultState === null ? undefined : bodyElement.get(resultState));
    $[4] = resultState;
    $[5] = resultElement;
  } else resultElement = $[5];
  let storeSelector = useStoreSelector(detachedSlot, resultElement);
  if (storeSelector === undefined) {
    let boxElement;
    if ($[6] !== addMargin || $[7] !== text || $[8] !== verbose) {
      let containerElement = verbose ? extractTag(text, "result") : null;
      let textElement;
      if ($[10] === MEMO_CACHE_SENTINEL) {
        textElement = jsxProd_default(Text, {
          dimColor: true,
          children: "An earlier tool call's result arrived here",
        });
        $[10] = textElement;
      } else textElement = $[10];
      boxElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: addMargin ? 1 : 0,
        children: [
          textElement,
          containerElement !== null &&
            jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: escapeControlChars(unescapeHtmlEntities(containerElement)).trim(),
              }),
            }),
        ],
      });
      $[6] = addMargin;
      $[7] = text;
      $[8] = verbose;
      $[9] = boxElement;
    } else boxElement = $[9];
    return boxElement;
  }
  if (expandContext || storeSelector.status === "running" || storeSelector.paintedInPlace) {
    return null;
  }
  let toolResultInlineElement;
  if ($[11] !== addMargin || $[12] !== storeSelector || $[13] !== verbose) {
    toolResultInlineElement = jsxProd_default(ToolResultInline, {
      addMargin,
      call: storeSelector,
      verbose,
    });
    $[11] = addMargin;
    $[12] = storeSelector;
    $[13] = verbose;
    $[14] = toolResultInlineElement;
  } else toolResultInlineElement = $[14];
  return toolResultInlineElement;
}
//@ chunk-ah34pb7m.js:98468-98472 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:98468", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:98472-98476 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:98472", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:98476-98504 placement
/**
 * 导出值：同一声明里的多个绑定：monitorEventCache（monitor 事件解析缓存）；monitorEventCacheStore（monitor 事件缓存的 hook 槽）。
 */
var monitorEventCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var monitorEventCacheStore;
deferInit("chunk-ah34pb7m.js:98476", () => {
  monitorEventCache = new Map();
  monitorEventCacheStore = createContext(monitorEventCache);
});
//@ chunk-ah34pb7m.js:98504-98541 placement = SEP_WIDTH (1)
var MONITOR_FIELD_MAX_LENGTH = 500;
var MONITOR_BODY_MAX_LENGTH = 4000;
var MONITOR_DESCRIPTION_MIN_WIDTH = 12;
var MONITOR_HEADLINE_SEPARATOR = " \xB7 ";
//@ chunk-ah34pb7m.js:98541-98978 placement
/**
 * 从文本中解析队友结果标签块。
 */
function parseTeammateResultBlock(text, origin) {
  let processed = processQueuedCommands_3(text, origin);
  let summaryTag = processed === null ? null : extractTag(processed, SUMMARY);
  if (processed === null || summaryTag === null || summaryTag.includes("<")) return null;
  let summaryText = unescapeHtmlEntities(summaryTag);
  if (
    !summaryText.startsWith(MONITOR_EVENT_QUOTED_PREFIX) ||
    !summaryText.endsWith('"') ||
    summaryText.length <= MONITOR_EVENT_QUOTED_PREFIX.length
  )
    return null;
  let tag = extractTag(processed, EVENT);
  if (tag === null || tag.includes("<")) return null;
  let trimmed = stripFrameControlChars(stripAnsiPerLine(unescapeHtmlEntities(tag))).trim();
  let headline = "";
  for (let line of trimmed.split(`
`)) {
    headline = capIdFrameField(line, MONITOR_FIELD_MAX_LENGTH);
    if (headline !== "") break;
  }
  if (headline === "") return null;
  return {
    description: capIdFrameField(
      summaryText.slice(MONITOR_EVENT_QUOTED_PREFIX.length, -1),
      MONITOR_FIELD_MAX_LENGTH,
    ),
    headline,
    body: stripFrameControlChars(truncateWithCount(trimmed, MONITOR_BODY_MAX_LENGTH)),
  };
}
//@ chunk-ah34pb7m.js:98978-99135 placement
/**
 * 按可用宽度截断 monitor 事件的标题与描述；剩余宽度不够时不显示描述。
 */
function fitMonitorEventText({ headline, description }, width) {
  let max = Math.max(1, width - bunStringWidth(MONITOR_EVENT_PREFIX) - 1);
  let headlineText = truncateToWidth(headline, max);
  let descriptionWidth = max - bunStringWidth(headlineText) - bunStringWidth(MONITOR_HEADLINE_SEPARATOR);
  return {
    headline: headlineText,
    description:
      description !== "" && descriptionWidth >= MONITOR_DESCRIPTION_MIN_WIDTH
        ? truncateToWidth(description, descriptionWidth)
        : null,
  };
}
export {
  monitorEventCache,
  monitorEventCacheStore,
  TeammateResultMessage,
  parseTeammateResultBlock,
  fitMonitorEventText,
  isArtifactRoomViewNotification,
  TeammateDmMessage,
};
