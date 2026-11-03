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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ShutdownRequestDisplay, renderShutdownMessage } from "./ShutdownMessage.js";
import { tryRenderPlanApprovalMessage } from "./PlanApprovalMessage.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-ah34pb7m.js:83471-84268 fingerprint = TaskAssignmentDisplay (0.488)
function TaskAssignmentDisplay(t0) {
  let $ = w(16),
    { assignment: assignment, senderName: senderName } = t0,
    f;
  if ($[0] !== assignment.taskId)
    ((f = capIdFrameField(assignment.taskId, IDLE_ID_FIELD_RECEIVE_BOUND)),
      ($[0] = assignment.taskId),
      ($[1] = f));
  else f = $[1];
  let h = f;
  const M = senderName || UNKNOWN_SENDER;
  let T;
  if ($[2] !== M) ((T = capIdFrameField(M, IDLE_ID_FIELD_RECEIVE_BOUND)), ($[2] = M), ($[3] = T));
  else T = $[3];
  let x = T,
    k;
  if ($[4] !== assignment.subject)
    ((k = capIdFrameField(assignment.subject, IDLE_SUMMARY_RECEIVE_BOUND)),
      ($[4] = assignment.subject),
      ($[5] = k));
  else k = $[5];
  let b = k,
    E;
  if ($[6] !== assignment.description)
    ((E = capFrameBodyForDisplay(assignment.description, IDLE_RESULT_MAX_LENGTH)),
      ($[6] = assignment.description),
      ($[7] = E));
  else E = $[7];
  let B = E;
  const L = `Task #${h} assigned by ${x}`;
  let N;
  if ($[8] !== b) ((N = b && e(Text, { bold: !0, children: b })), ($[8] = b), ($[9] = N));
  else N = $[9];
  let W;
  if ($[10] !== B) ((W = B && e(Text, { dimColor: !0, children: B })), ($[10] = B), ($[11] = W));
  else W = $[11];
  let U;
  if ($[12] !== L || $[13] !== N || $[14] !== W)
    ((U = e(Box, {
      flexDirection: "column",
      marginY: 1,
      children: r(ShutdownRequestDisplay, { color: "cyan_FOR_SUBAGENTS_ONLY", title: L, children: [N, W] }),
    })),
      ($[12] = L),
      ($[13] = N),
      ($[14] = W),
      ($[15] = U));
  else U = $[15];
  return U;
}
//@ chunk-ah34pb7m.js:84268-84356 fingerprint = tryRenderTaskAssignmentMessage (0.717)
function tryRenderTaskAssignmentMessage(m, d) {
  let assignment = isTaskAssignment(m);
  if (assignment) return e(TaskAssignmentDisplay, { assignment: assignment, senderName: d });
  return null;
}
//@ chunk-ah34pb7m.js:86535-86798 placement
function renderTeammateTerminated(m, d) {
  let c = parseFrameForDisplay(TeammateTerminatedMessageSchema(), m);
  if (!c) return null;
  let g = capFrameBodyForDisplay(c.message, IDLE_RESULT_MAX_LENGTH);
  if (!g.trim()) return null;
  return e(Box, {
    flexDirection: "column",
    marginY: 1,
    children: e(ShutdownRequestDisplay, {
      color: "subtle",
      title: `Teammate terminated (from ${d || UNKNOWN_SENDER})`,
      children: e(Text, { wrap: "wrap", children: g }),
    }),
  });
}
//@ chunk-ah34pb7m.js:86798-86857 placement
function Gr(m, d) {
  return (
    tryRenderPlanApprovalMessage(m, d) ??
    renderShutdownMessage(m, d) ??
    tryRenderTaskAssignmentMessage(m, d) ??
    renderTeammateTerminated(m, d)
  );
}
/**
 * 任务分配消息（@队友、任务编号与主题）。
 */
//@ chunk-ah34pb7m.js:86857-87716 placement
function TaskAssignmentMessage(m) {
  let M = w(18),
    {
      displayName: displayName,
      inkColor: inkColor,
      summary: summary,
      taskId: taskId,
      taskSubject: taskSubject,
    } = m,
    T;
  if (M[0] === MEMO_CACHE_SENTINEL) ((T = e(Text, { "aria-hidden": !0, children: re.pointer })), (M[0] = T));
  else T = M[0];
  let x;
  if (M[1] !== displayName || M[2] !== inkColor)
    ((x = r(Text, { color: inkColor, children: ["@ ", displayName, T] })),
      (M[1] = displayName),
      (M[2] = inkColor),
      (M[3] = x));
  else x = M[3];
  let k;
  if (M[4] !== summary)
    ((k = summary.trim() && r(Text, { children: [" ", summary] })), (M[4] = summary), (M[5] = k));
  else k = M[5];
  let b;
  if (M[6] !== x || M[7] !== k) ((b = r(Box, { children: [x, k] })), (M[6] = x), (M[7] = k), (M[8] = b));
  else b = M[8];
  let E;
  if (M[9] === MEMO_CACHE_SENTINEL) ((E = e(StatusIcon, { status: "success" })), (M[9] = E));
  else E = M[9];
  let B;
  if (M[10] !== taskSubject)
    ((B = taskSubject && r(Text, { dimColor: !0, children: [" (", taskSubject, ")"] })),
      (M[10] = taskSubject),
      (M[11] = B));
  else B = M[11];
  let L;
  if (M[12] !== B || M[13] !== taskId)
    ((L = r(MessageResponse, { children: [E, r(Text, { children: [" ", "Completed task #", taskId, B] })] })),
      (M[12] = B),
      (M[13] = taskId),
      (M[14] = L));
  else L = M[14];
  let N;
  if (M[15] !== b || M[16] !== L)
    ((N = r(Box, { flexDirection: "column", marginTop: 1, children: [b, L] })),
      (M[15] = b),
      (M[16] = L),
      (M[17] = N));
  else N = M[17];
  return N;
}
//@ chunk-aqdf5t3e.js:29576-29636 fingerprint = getTaskAssignmentSummary (0.446)
function getTaskAssignmentSummary(e, n, r, s) {
  if (e.supervisors.get(r) === n) n.taskId = s;
}

export { Gr, TaskAssignmentMessage, getTaskAssignmentSummary };
