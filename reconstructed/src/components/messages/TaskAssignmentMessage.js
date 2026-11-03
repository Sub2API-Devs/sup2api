/**
 * components/messages/TaskAssignmentMessage.tsx
 *
 * 任务分配消息（"Task #N assigned by …"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/TaskAssignmentMessage.tsx
 * pieces: chunk-ah34pb7m.js (5), chunk-aqdf5t3e.js (1)
 * attribution: fingerprint 3, placement 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-ah34pb7m.js:83471-84268 fingerprint = TaskAssignmentDisplay (0.488)
function TaskAssignmentDisplay(props) {
  let $ = w(16);
  let { assignment, senderName } = props;
  let f;
  if ($[0] !== assignment.taskId) {
    f = capIdFrameField(assignment.taskId, IDLE_ID_FIELD_RECEIVE_BOUND);
    $[0] = assignment.taskId;
    $[1] = f;
  } else f = $[1];
  let h = f;
  const M = senderName || UNKNOWN_SENDER;
  let T;
  if ($[2] !== M) {
    T = capIdFrameField(M, IDLE_ID_FIELD_RECEIVE_BOUND);
    $[2] = M;
    $[3] = T;
  } else T = $[3];
  let x = T;
  let k;
  if ($[4] !== assignment.subject) {
    k = capIdFrameField(assignment.subject, IDLE_SUMMARY_RECEIVE_BOUND);
    $[4] = assignment.subject;
    $[5] = k;
  } else k = $[5];
  let b = k;
  let E;
  if ($[6] !== assignment.description) {
    E = capFrameBodyForDisplay(assignment.description, IDLE_RESULT_MAX_LENGTH);
    $[6] = assignment.description;
    $[7] = E;
  } else E = $[7];
  let B = E;
  const title = `Task #${h} assigned by ${x}`;
  let N;
  if ($[8] !== b) {
    N =
      b &&
      jsxProd_default(Text, {
        bold: true,
        children: b,
      });
    $[8] = b;
    $[9] = N;
  } else N = $[9];
  let W;
  if ($[10] !== B) {
    W =
      B &&
      jsxProd_default(Text, {
        dimColor: true,
        children: B,
      });
    $[10] = B;
    $[11] = W;
  } else W = $[11];
  let U;
  if ($[12] !== title || $[13] !== N || $[14] !== W) {
    U = jsxProd_default(Box, {
      flexDirection: "column",
      marginY: 1,
      children: jsxProd_default_2(ShutdownRequestDisplay, {
        color: "cyan_FOR_SUBAGENTS_ONLY",
        title,
        children: [N, W],
      }),
    });
    $[12] = title;
    $[13] = N;
    $[14] = W;
    $[15] = U;
  } else U = $[15];
  return U;
}
//@ chunk-ah34pb7m.js:84268-84356 fingerprint = tryRenderTaskAssignmentMessage (0.717)
function tryRenderTaskAssignmentMessage(content, senderName) {
  let assignment = isTaskAssignment(content);
  if (assignment)
    return jsxProd_default(TaskAssignmentDisplay, {
      assignment,
      senderName,
    });
  return null;
}
//@ chunk-ah34pb7m.js:86535-86798 placement
function renderTeammateTerminated(m, d) {
  let frameForDisplay = parseFrameForDisplay(TeammateTerminatedMessageSchema(), m);
  if (!frameForDisplay) return null;
  let g = capFrameBodyForDisplay(frameForDisplay.message, IDLE_RESULT_MAX_LENGTH);
  if (!g.trim()) return null;
  return jsxProd_default(Box, {
    flexDirection: "column",
    marginY: 1,
    children: jsxProd_default(ShutdownRequestDisplay, {
      color: "subtle",
      title: `Teammate terminated (from ${d || UNKNOWN_SENDER})`,
      children: jsxProd_default(Text, {
        wrap: "wrap",
        children: g,
      }),
    }),
  });
}
//@ chunk-ah34pb7m.js:86798-86857 placement
function renderTaskRelatedMessage(content, senderName) {
  return (
    tryRenderPlanApprovalMessage(content, senderName) ??
    renderShutdownMessage(content, senderName) ??
    tryRenderTaskAssignmentMessage(content, senderName) ??
    renderTeammateTerminated(content, senderName)
  );
}
//@ chunk-ah34pb7m.js:86857-87716 placement
/**
 * 任务分配消息（@队友、任务编号与主题）。
 */
function TaskAssignmentMessage(props) {
  let M = w(18);
  let { displayName, inkColor, summary, taskId, taskSubject } = props;
  let T;
  if (M[0] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default(Text, {
      "aria-hidden": true,
      children: figures_default.pointer,
    });
    M[0] = T;
  } else T = M[0];
  let x;
  if (M[1] !== displayName || M[2] !== inkColor) {
    x = jsxProd_default_2(Text, {
      color: inkColor,
      children: ["@ ", displayName, T],
    });
    M[1] = displayName;
    M[2] = inkColor;
    M[3] = x;
  } else x = M[3];
  let k;
  if (M[4] !== summary) {
    k =
      summary.trim() &&
      jsxProd_default_2(Text, {
        children: [" ", summary],
      });
    M[4] = summary;
    M[5] = k;
  } else k = M[5];
  let b;
  if (M[6] !== x || M[7] !== k) {
    b = jsxProd_default_2(Box, {
      children: [x, k],
    });
    M[6] = x;
    M[7] = k;
    M[8] = b;
  } else b = M[8];
  let E;
  if (M[9] === MEMO_CACHE_SENTINEL) {
    E = jsxProd_default(StatusIcon, {
      status: "success",
    });
    M[9] = E;
  } else E = M[9];
  let B;
  if (M[10] !== taskSubject) {
    B =
      taskSubject &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" (", taskSubject, ")"],
      });
    M[10] = taskSubject;
    M[11] = B;
  } else B = M[11];
  let L;
  if (M[12] !== B || M[13] !== taskId) {
    L = jsxProd_default_2(MessageResponse, {
      children: [
        E,
        jsxProd_default_2(Text, {
          children: [" ", "Completed task #", taskId, B],
        }),
      ],
    });
    M[12] = B;
    M[13] = taskId;
    M[14] = L;
  } else L = M[14];
  let N;
  if (M[15] !== b || M[16] !== L) {
    N = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [b, L],
    });
    M[15] = b;
    M[16] = L;
    M[17] = N;
  } else N = M[17];
  return N;
}
//@ chunk-aqdf5t3e.js:29576-29636 fingerprint = getTaskAssignmentSummary (0.446)
function getTaskAssignmentSummary(e, n, slug, taskId) {
  if (e.supervisors.get(slug) === n) n.taskId = taskId;
}
export { renderTaskRelatedMessage, TaskAssignmentMessage, getTaskAssignmentSummary };
