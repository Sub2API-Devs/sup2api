/**
 * components/messages/TaskAssignmentMessage.tsx
 *
 * 任务分配消息（"Task #N assigned by …"）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/TaskAssignmentMessage.tsx
 * pieces: chunk-tsrpnscb.js (1), chunk-wjygkcr4.js (5)
 * attribution: fingerprint 3, placement 3
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  capIdFrameField,
  IDLE_ID_FIELD_RECEIVE_BOUND,
  UNKNOWN_SENDER,
  IDLE_SUMMARY_RECEIVE_BOUND,
  capFrameBodyForDisplay,
  IDLE_RESULT_MAX_LENGTH,
  isTaskAssignment,
  parseFrameForDisplay,
  TeammateTerminatedMessageSchema,
} from "../../utils/teammateMailbox.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ShutdownRequestDisplay, renderShutdownMessage } from "./ShutdownMessage.js";
import { tryRenderPlanApprovalMessage } from "./PlanApprovalMessage.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-tsrpnscb.js:29671-29731 fingerprint (2.1.88 match: getTaskAssignmentSummary, 0.446)
function getTaskAssignmentSummary(state, assignment, slug, taskId) {
  if (state.supervisors.get(slug) === assignment) assignment.taskId = taskId;
}
//@ chunk-wjygkcr4.js:87454-88251 fingerprint (2.1.88 match: TaskAssignmentDisplay, 0.488)
function TaskAssignmentDisplay(props) {
  let $ = useMemoCache(16);
  let { assignment, senderName } = props;
  let taskIdField;
  if ($[0] !== assignment.taskId) {
    taskIdField = capIdFrameField(assignment.taskId, IDLE_ID_FIELD_RECEIVE_BOUND);
    $[0] = assignment.taskId;
    $[1] = taskIdField;
  } else taskIdField = $[1];
  let taskId = taskIdField;
  const sender = senderName || UNKNOWN_SENDER;
  let senderField;
  if ($[2] !== sender) {
    senderField = capIdFrameField(sender, IDLE_ID_FIELD_RECEIVE_BOUND);
    $[2] = sender;
    $[3] = senderField;
  } else senderField = $[3];
  let senderLabel = senderField;
  let subjectField;
  if ($[4] !== assignment.subject) {
    subjectField = capIdFrameField(assignment.subject, IDLE_SUMMARY_RECEIVE_BOUND);
    $[4] = assignment.subject;
    $[5] = subjectField;
  } else subjectField = $[5];
  let subject = subjectField;
  let descriptionField;
  if ($[6] !== assignment.description) {
    descriptionField = capFrameBodyForDisplay(assignment.description, IDLE_RESULT_MAX_LENGTH);
    $[6] = assignment.description;
    $[7] = descriptionField;
  } else descriptionField = $[7];
  let description = descriptionField;
  const title = `Task #${taskId} assigned by ${senderLabel}`;
  let subjectElement;
  if ($[8] !== subject) {
    subjectElement =
      subject &&
      jsxProd_default(Text, {
        bold: true,
        children: subject,
      });
    $[8] = subject;
    $[9] = subjectElement;
  } else subjectElement = $[9];
  let descriptionElement;
  if ($[10] !== description) {
    descriptionElement =
      description &&
      jsxProd_default(Text, {
        dimColor: true,
        children: description,
      });
    $[10] = description;
    $[11] = descriptionElement;
  } else descriptionElement = $[11];
  let boxElement;
  if ($[12] !== title || $[13] !== subjectElement || $[14] !== descriptionElement) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      marginY: 1,
      children: jsxProd_default_2(ShutdownRequestDisplay, {
        color: "cyan_FOR_SUBAGENTS_ONLY",
        title,
        children: [subjectElement, descriptionElement],
      }),
    });
    $[12] = title;
    $[13] = subjectElement;
    $[14] = descriptionElement;
    $[15] = boxElement;
  } else boxElement = $[15];
  return boxElement;
}
//@ chunk-wjygkcr4.js:88251-88339 fingerprint (2.1.88 match: tryRenderTaskAssignmentMessage, 0.717)
function tryRenderTaskAssignmentMessage(content, senderName) {
  let assignment = isTaskAssignment(content);
  if (assignment)
    return jsxProd_default(TaskAssignmentDisplay, {
      assignment,
      senderName,
    });
  return null;
}
//@ chunk-wjygkcr4.js:88339-88602 placement
function renderTeammateTerminated(content, key) {
  let frameForDisplay = parseFrameForDisplay(TeammateTerminatedMessageSchema(), content);
  if (!frameForDisplay) return null;
  let messageText = capFrameBodyForDisplay(frameForDisplay.message, IDLE_RESULT_MAX_LENGTH);
  if (!messageText.trim()) return null;
  return jsxProd_default(Box, {
    flexDirection: "column",
    marginY: 1,
    children: jsxProd_default(ShutdownRequestDisplay, {
      color: "subtle",
      title: `Teammate terminated (from ${key || UNKNOWN_SENDER})`,
      children: jsxProd_default(Text, {
        wrap: "wrap",
        children: messageText,
      }),
    }),
  });
}
//@ chunk-wjygkcr4.js:88602-88661 placement
function renderTaskRelatedMessage(content, displayName) {
  return (
    tryRenderPlanApprovalMessage(content, displayName) ??
    renderShutdownMessage(content, displayName) ??
    tryRenderTaskAssignmentMessage(content, displayName) ??
    renderTeammateTerminated(content, displayName)
  );
}
//@ chunk-wjygkcr4.js:88661-89520 placement
/**
 * 任务分配消息（@队友、任务编号与主题）。
 */
function TaskAssignmentMessage(props) {
  let $ = useMemoCache(18);
  let { displayName, inkColor, summary, taskId, taskSubject } = props;
  let pointerGlyph;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    pointerGlyph = jsxProd_default(Text, {
      "aria-hidden": true,
      children: figures_default.pointer,
    });
    $[0] = pointerGlyph;
  } else pointerGlyph = $[0];
  let titleElement;
  if ($[1] !== displayName || $[2] !== inkColor) {
    titleElement = jsxProd_default_2(Text, {
      color: inkColor,
      children: ["@ ", displayName, pointerGlyph],
    });
    $[1] = displayName;
    $[2] = inkColor;
    $[3] = titleElement;
  } else titleElement = $[3];
  let subjectElement;
  if ($[4] !== summary) {
    subjectElement =
      summary.trim() &&
      jsxProd_default_2(Text, {
        children: [" ", summary],
      });
    $[4] = summary;
    $[5] = subjectElement;
  } else subjectElement = $[5];
  let bodyElement;
  if ($[6] !== titleElement || $[7] !== subjectElement) {
    bodyElement = jsxProd_default_2(Box, {
      children: [titleElement, subjectElement],
    });
    $[6] = titleElement;
    $[7] = subjectElement;
    $[8] = bodyElement;
  } else bodyElement = $[8];
  let statusIconElement;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    statusIconElement = jsxProd_default(StatusIcon, {
      status: "success",
    });
    $[9] = statusIconElement;
  } else statusIconElement = $[9];
  let subjectSuffix;
  if ($[10] !== taskSubject) {
    subjectSuffix =
      taskSubject &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" (", taskSubject, ")"],
      });
    $[10] = taskSubject;
    $[11] = subjectSuffix;
  } else subjectSuffix = $[11];
  let messageResponseElement;
  if ($[12] !== subjectSuffix || $[13] !== taskId) {
    messageResponseElement = jsxProd_default_2(MessageResponse, {
      children: [
        statusIconElement,
        jsxProd_default_2(Text, {
          children: [" ", "Completed task #", taskId, subjectSuffix],
        }),
      ],
    });
    $[12] = subjectSuffix;
    $[13] = taskId;
    $[14] = messageResponseElement;
  } else messageResponseElement = $[14];
  let rowElement;
  if ($[15] !== bodyElement || $[16] !== messageResponseElement) {
    rowElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [bodyElement, messageResponseElement],
    });
    $[15] = bodyElement;
    $[16] = messageResponseElement;
    $[17] = rowElement;
  } else rowElement = $[17];
  return rowElement;
}
export { getTaskAssignmentSummary, renderTaskRelatedMessage, TaskAssignmentMessage };
