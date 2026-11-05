/**
 * components/messages/UserTaskNotificationMessage.tsx
 *
 * 2.1.316 新增。渲染任务完成与监控事件的 task-notification 消息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wjygkcr4.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { parseTaskResultOrNull } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { extractTag } from "../../utils/messages.js";
import {
  SUMMARY,
  STATUS,
  TASK_ID,
  TASK_TYPE,
  TOOL_USE_ID,
  MONITOR_EVENT_PREFIX,
} from "../../constants/xml.js";
import { unescapeHtmlEntities } from "../../utils/confusables.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  parseTeammateResultBlock,
  monitorEventCacheStore,
  fitMonitorEventText,
} from "./TeammateResultMessage.js";
import { BriefTimestampNamespace } from "../../utils/formatBriefTimestamp.js";
import { noticeSystemLines } from "../SlashCommandLink.js";
import { useContext } from "../../../vendor/react/cjs/react.production.js";
import { formatDuration, formatNumber } from "../../utils/format.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { taskNotificationSummaryLine } from "./CompactBoundaryMessage.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { capIdFrameField, IDLE_ID_FIELD_RECEIVE_BOUND } from "../../utils/teammateMailbox.js";

//@ chunk-wjygkcr4.js:100942-100951 placement
var NOTIFICATION_INDENT = 2;
//@ chunk-wjygkcr4.js:100951-101086 placement (2.1.88 match: getStatusColor, 1)
function getStatusColor(status) {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "killed":
      return "warning";
    default:
      return "text";
  }
}
//@ chunk-wjygkcr4.js:101086-101192 placement (2.1.88 match: _temp, 1)
function completedTaskResultText(taskDelivery) {
  let taskResultOrNull = parseTaskResultOrNull(taskDelivery);
  return taskResultOrNull?.status === "completed"
    ? taskResultOrNull.result.content.map((block) => block.text).join(`
`)
    : "";
}
//@ chunk-wjygkcr4.js:101192-101725 placement (2.1.88 match: renderToolUseErrorMessage, 0.161)
/**
 * 某消息组件（taskDelivery/origin 参数），误配为 NotebookEdit 的错误渲染；归属疑似错误。
 */
function renderToolUseErrorMessage_5(props) {
  let $ = useMemoCache(11);
  let { addMargin, param, taskDelivery, messageId, origin, verbose, isExpanded } = props;
  let { text } = param;
  let isVerbose = verbose === undefined ? false : verbose;
  let isExpanded_2 = isExpanded === undefined ? isVerbose : isExpanded;
  let summaryTag;
  if ($[0] !== text) {
    let tag = extractTag(text, SUMMARY);
    summaryTag = tag === null ? null : unescapeHtmlEntities(tag);
    $[0] = text;
    $[1] = summaryTag;
  } else summaryTag = $[1];
  let summary = summaryTag;
  if (!summary) {
    return null;
  }
  let taskNotificationMessageElement;
  if (
    $[2] !== addMargin ||
    $[3] !== isExpanded_2 ||
    $[4] !== messageId ||
    $[5] !== origin ||
    $[6] !== summary ||
    $[7] !== taskDelivery ||
    $[8] !== text ||
    $[9] !== isVerbose
  ) {
    taskNotificationMessageElement = jsxProd_default(TaskNotificationMessage, {
      addMargin,
      text,
      summary,
      taskDelivery,
      messageId,
      origin,
      verbose: isVerbose,
      isExpanded: isExpanded_2,
    });
    $[2] = addMargin;
    $[3] = isExpanded_2;
    $[4] = messageId;
    $[5] = origin;
    $[6] = summary;
    $[7] = taskDelivery;
    $[8] = text;
    $[9] = isVerbose;
    $[10] = taskNotificationMessageElement;
  } else taskNotificationMessageElement = $[10];
  return taskNotificationMessageElement;
}
//@ chunk-wjygkcr4.js:101725-103495 placement
/**
 * 任务完成通知消息
 */
function TaskNotificationMessage(props) {
  let $ = useMemoCache(49);
  let { addMargin, text, summary, taskDelivery, messageId, origin, verbose, isExpanded } = props;
  let statusTag;
  if ($[0] !== text) {
    statusTag = extractTag(text, STATUS);
    $[0] = text;
    $[1] = statusTag;
  } else statusTag = $[1];
  let status = statusTag;
  let durationRaw;
  if ($[2] !== text) {
    durationRaw = extractTag(text, "duration_ms");
    $[2] = text;
    $[3] = durationRaw;
  } else durationRaw = $[3];
  let durationMs = Number(durationRaw);
  let taskIdRaw;
  if ($[4] !== text) {
    taskIdRaw = readTagText(text, TASK_ID);
    $[4] = text;
    $[5] = taskIdRaw;
  } else taskIdRaw = $[5];
  let taskId = taskIdRaw;
  let statusRaw;
  if ($[6] !== text) {
    statusRaw = readTagText(text, STATUS);
    $[6] = text;
    $[7] = statusRaw;
  } else statusRaw = $[7];
  let statusText = statusRaw;
  let typeRaw;
  if ($[8] !== text) {
    typeRaw = readTagText(text, TASK_TYPE);
    $[8] = text;
    $[9] = typeRaw;
  } else typeRaw = $[9];
  let taskType = typeRaw;
  let toolUseIdRaw;
  if ($[10] !== text) {
    toolUseIdRaw = readTagText(text, TOOL_USE_ID);
    $[10] = text;
    $[11] = toolUseIdRaw;
  } else toolUseIdRaw = $[11];
  let toolUseId = toolUseIdRaw;
  let taskIdPart;
  if ($[12] !== taskId) {
    taskIdPart = taskId !== undefined && {
      id: taskId,
    };
    $[12] = taskId;
    $[13] = taskIdPart;
  } else taskIdPart = $[13];
  let statusPart;
  if ($[14] !== statusText) {
    statusPart = statusText !== undefined && {
      status: statusText,
    };
    $[14] = statusText;
    $[15] = statusPart;
  } else statusPart = $[15];
  let typePart;
  if ($[16] !== taskType) {
    typePart = taskType !== undefined && {
      type: taskType,
    };
    $[16] = taskType;
    $[17] = typePart;
  } else typePart = $[17];
  let toolUseIdPart;
  if ($[18] !== toolUseId) {
    toolUseIdPart = toolUseId !== undefined && {
      toolUseId,
    };
    $[18] = toolUseId;
    $[19] = toolUseIdPart;
  } else toolUseIdPart = $[19];
  let durationPart;
  if ($[20] !== durationMs) {
    durationPart = Number.isFinite(durationMs) &&
      durationMs > 0 && {
        durationMs,
      };
    $[20] = durationMs;
    $[21] = durationPart;
  } else durationPart = $[21];
  let task;
  if (
    $[22] !== toolUseIdPart ||
    $[23] !== durationPart ||
    $[24] !== taskIdPart ||
    $[25] !== statusPart ||
    $[26] !== typePart
  ) {
    task = {
      ...taskIdPart,
      ...statusPart,
      ...typePart,
      ...toolUseIdPart,
      ...durationPart,
    };
    $[22] = toolUseIdPart;
    $[23] = durationPart;
    $[24] = taskIdPart;
    $[25] = statusPart;
    $[26] = typePart;
    $[27] = task;
  } else task = $[27];
  let task_2 = task;
  let monitorEvent;
  if ($[28] !== origin || $[29] !== text) {
    monitorEvent = parseTeammateResultBlock(text, origin);
    $[28] = origin;
    $[29] = text;
    $[30] = monitorEvent;
  } else monitorEvent = $[30];
  let monitorEvent_2 = monitorEvent;
  let draw;
  if (
    $[31] !== addMargin ||
    $[32] !== durationMs ||
    $[33] !== isExpanded ||
    $[34] !== messageId ||
    $[35] !== monitorEvent_2 ||
    $[36] !== status ||
    $[37] !== summary ||
    $[38] !== taskDelivery ||
    $[39] !== text ||
    $[40] !== verbose
  ) {
    draw = (summaryText) =>
      jsxProd_default(MonitorNotificationMessage, {
        addMargin,
        text,
        summary: summaryText,
        monitorEvent: summaryText === summary ? monitorEvent_2 : null,
        status,
        durationMs,
        taskDelivery,
        messageId,
        verbose,
        isExpanded,
      });
    $[31] = addMargin;
    $[32] = durationMs;
    $[33] = isExpanded;
    $[34] = messageId;
    $[35] = monitorEvent_2;
    $[36] = status;
    $[37] = summary;
    $[38] = taskDelivery;
    $[39] = text;
    $[40] = verbose;
    $[41] = draw;
  } else draw = $[41];
  let siteProps;
  if (
    $[42] !== isExpanded ||
    $[43] !== messageId ||
    $[44] !== origin ||
    $[45] !== summary ||
    $[46] !== draw ||
    $[47] !== task_2
  ) {
    siteProps = {
      messageId,
      stored: origin,
      text: summary,
      isExpanded,
      task: task_2,
      draw,
    };
    $[42] = isExpanded;
    $[43] = messageId;
    $[44] = origin;
    $[45] = summary;
    $[46] = draw;
    $[47] = task_2;
    $[48] = siteProps;
  } else siteProps = $[48];
  return BriefTimestampNamespace.useUserMessageSite(siteProps);
}
//@ chunk-wjygkcr4.js:103495-105344 placement
/**
 * 监控任务通知消息
 */
function MonitorNotificationMessage(props) {
  let $ = useMemoCache(32);
  let { addMargin, summary, monitorEvent, status, durationMs, taskDelivery, messageId, verbose, isExpanded } =
    props;
  let transcriptRows = noticeSystemLines(verbose);
  let sentMessages = useContext(monitorEventCacheStore).get(messageId) ?? 0;
  let statusColor;
  if ($[0] !== status) {
    statusColor = getStatusColor(status);
    $[0] = status;
    $[1] = statusColor;
  } else statusColor = $[1];
  let statusColor_2 = statusColor;
  let color = false && statusColor_2 === "text" ? "planMode" : statusColor_2;
  let durationText;
  if ($[2] !== durationMs) {
    durationText =
      Number.isFinite(durationMs) && durationMs > 0 ? ` \xB7 ${formatDuration(durationMs)}` : null;
    $[2] = durationMs;
    $[3] = durationText;
  } else durationText = $[3];
  let durationText_2 = durationText;
  let hasDelivery =
    taskDelivery !== undefined && getTaskRunState().bashTaskDeliveryOutcomes.get(messageId) !== "no_host";
  let deliveredText = hasDelivery ? completedTaskResultText(taskDelivery) : "";
  let deliveryNote = hasDelivery
    ? `delivered to Claude as a ${GET_TASK_TOOL_TEXT} result${deliveredText ? ` (${formatNumber(deliveredText.length)} chars)` : ""}`
    : null;
  let deliverySuffix = deliveryNote === null ? null : ` \xB7 ${deliveryNote}`;
  if (monitorEvent !== null && !isExpanded) {
    let eventRow;
    if (
      $[4] !== addMargin ||
      $[5] !== color ||
      $[6] !== monitorEvent ||
      $[7] !== status ||
      $[8] !== transcriptRows
    ) {
      eventRow = jsxProd_default(MonitorEventRow, {
        addMargin,
        monitorEvent,
        status,
        color,
        transcriptV2Rows: transcriptRows,
      });
      $[4] = addMargin;
      $[5] = color;
      $[6] = monitorEvent;
      $[7] = status;
      $[8] = transcriptRows;
      $[9] = eventRow;
    } else eventRow = $[9];
    return eventRow;
  }
  if (transcriptRows) {
    return jsxProd_default(NoticeRowMessage, {
      row: taskNotificationSummaryLine({
        status,
        summary,
        context: null,
        durationMs,
        deliveryNote,
        sentMessages,
      }),
      addMargin,
    });
  }
  const BoxComponent = Box;
  const marginTop = addMargin ? 1 : 0;
  const flexDirection = "column";
  let statusDot;
  if ($[10] !== color) {
    statusDot = jsxProd_default(Text, {
      "aria-hidden": true,
      color,
      children: false ? figures_default.pointer : BLACK_CIRCLE,
    });
    $[10] = color;
    $[11] = statusDot;
  } else statusDot = $[11];
  let summaryText;
  if ($[12] !== summary) {
    summaryText = collapseWhitespace(sanitizeDisplayText(summary));
    $[12] = summary;
    $[13] = summaryText;
  } else summaryText = $[13];
  let durationNode;
  if ($[14] !== durationText_2) {
    durationNode =
      durationText_2 &&
      jsxProd_default(Text, {
        dimColor: true,
        children: durationText_2,
      });
    $[14] = durationText_2;
    $[15] = durationNode;
  } else durationNode = $[15];
  let deliveryNode;
  if ($[16] !== deliverySuffix) {
    deliveryNode =
      deliverySuffix &&
      jsxProd_default(Text, {
        dimColor: true,
        children: deliverySuffix,
      });
    $[16] = deliverySuffix;
    $[17] = deliveryNode;
  } else deliveryNode = $[17];
  let lineText;
  if ($[18] !== statusDot || $[19] !== summaryText || $[20] !== durationNode || $[21] !== deliveryNode) {
    lineText = jsxProd_default_2(Text, {
      children: [statusDot, " ", summaryText, durationNode, deliveryNode],
    });
    $[18] = statusDot;
    $[19] = summaryText;
    $[20] = durationNode;
    $[21] = deliveryNode;
    $[22] = lineText;
  } else lineText = $[22];
  const deliveredDetail =
    verbose && deliveredText
      ? jsxProd_default(Box, {
          paddingLeft: 2,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: sanitizeDisplayText(deliveredText),
          }),
        })
      : null;
  let expandedBody;
  if ($[23] !== isExpanded || $[24] !== monitorEvent) {
    expandedBody =
      isExpanded && monitorEvent !== null
        ? jsxProd_default(Box, {
            paddingLeft: 2,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: monitorEvent.body,
            }),
          })
        : null;
    $[23] = isExpanded;
    $[24] = monitorEvent;
    $[25] = expandedBody;
  } else expandedBody = $[25];
  let content;
  if (
    $[26] !== BoxComponent ||
    $[27] !== deliveredDetail ||
    $[28] !== expandedBody ||
    $[29] !== marginTop ||
    $[30] !== lineText
  ) {
    content = jsxProd_default_2(BoxComponent, {
      marginTop,
      flexDirection,
      children: [lineText, deliveredDetail, expandedBody],
    });
    $[26] = BoxComponent;
    $[27] = deliveredDetail;
    $[28] = expandedBody;
    $[29] = marginTop;
    $[30] = lineText;
    $[31] = content;
  } else content = $[31];
  return content;
}
//@ chunk-wjygkcr4.js:105344-106254 placement
/**
 * 监控事件行
 */
function MonitorEventRow(props) {
  let $ = useMemoCache(19);
  let { addMargin, monitorEvent, status, color, transcriptV2Rows } = props;
  let { columns } = useTerminalSize();
  let description;
  let headline;
  let noticeRowMessageElement;
  if (
    $[0] !== addMargin ||
    $[1] !== columns ||
    $[2] !== monitorEvent ||
    $[3] !== status ||
    $[4] !== transcriptV2Rows
  ) {
    noticeRowMessageElement = EARLY_RETURN_SENTINEL;
    N: {
      ({ headline, description } = fitMonitorEventText(monitorEvent, columns - NOTIFICATION_INDENT));
      if (transcriptV2Rows) {
        noticeRowMessageElement = jsxProd_default(NoticeRowMessage, {
          row: taskNotificationSummaryLine({
            status,
            summary: `${MONITOR_EVENT_PREFIX} ${headline}`,
            context: description,
            durationMs: 0,
            deliveryNote: null,
            sentMessages: 0,
          }),
          addMargin,
        });
        break N;
      }
    }
    $[0] = addMargin;
    $[1] = columns;
    $[2] = monitorEvent;
    $[3] = status;
    $[4] = transcriptV2Rows;
    $[5] = description;
    $[6] = headline;
    $[7] = noticeRowMessageElement;
  } else {
    description = $[5];
    headline = $[6];
    noticeRowMessageElement = $[7];
  }
  if (noticeRowMessageElement !== EARLY_RETURN_SENTINEL) return noticeRowMessageElement;
  const marginTop = addMargin ? 1 : 0;
  let textElement;
  if ($[8] !== color) {
    textElement = jsxProd_default(Text, {
      "aria-hidden": true,
      color,
      children: BLACK_CIRCLE,
    });
    $[8] = color;
    $[9] = textElement;
  } else textElement = $[9];
  let descriptionSuffix;
  if ($[10] !== description) {
    descriptionSuffix =
      description !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        children: ` \xB7 ${description}`,
      });
    $[10] = description;
    $[11] = descriptionSuffix;
  } else descriptionSuffix = $[11];
  let children;
  if ($[12] !== headline || $[13] !== textElement || $[14] !== descriptionSuffix) {
    children = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [textElement, " ", MONITOR_EVENT_PREFIX, " ", headline, descriptionSuffix],
    });
    $[12] = headline;
    $[13] = textElement;
    $[14] = descriptionSuffix;
    $[15] = children;
  } else children = $[15];
  let boxElement;
  if ($[16] !== marginTop || $[17] !== children) {
    boxElement = jsxProd_default(Box, {
      marginTop,
      children,
    });
    $[16] = marginTop;
    $[17] = children;
    $[18] = boxElement;
  } else boxElement = $[18];
  return boxElement;
}
//@ chunk-wjygkcr4.js:106254-106331 placement
function readTagText(text, tagName) {
  let tag = extractTag(text, tagName);
  let field = tag === null ? "" : capIdFrameField(tag, IDLE_ID_FIELD_RECEIVE_BOUND);
  return field === "" ? undefined : field;
}
export { renderToolUseErrorMessage_5 };
