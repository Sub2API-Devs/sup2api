/**
 * components/messages/UserTaskNotificationMessage.tsx
 *
 * 2.1.316 新增。渲染任务完成与监控事件的 task-notification 消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (8)
 * attribution: placement 8
 */
import { FSe } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { parseTeammateResultBlock, xtn, fitMonitorEventText } from "./TeammateResultMessage.js";
import { a9 } from "../../utils/formatBriefTimestamp.js";
import { noticeSystemLines } from "../SlashCommandLink.js";
import { Se } from "../../../vendor/react/cjs/react.production.js";
import { formatDuration, formatNumber } from "../../utils/format.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { taskNotificationSummaryLine } from "./CompactBoundaryMessage.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { Dr } from "../../utils/stringUtils.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { capIdFrameField, IDLE_ID_FIELD_RECEIVE_BOUND } from "../../utils/teammateMailbox.js";

//@ chunk-ah34pb7m.js:99135-99144 placement
var NOTIFICATION_INDENT = 2;
//@ chunk-ah34pb7m.js:99144-99279 placement = getStatusColor (1)
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
//@ chunk-ah34pb7m.js:99279-99385 placement = _temp (1)
function completedTaskResultText(m) {
  let d = FSe(m);
  return d?.status === "completed"
    ? d.result.content.map((c) => c.text).join(`
`)
    : "";
}
/**
 * 某消息组件（taskDelivery/origin 参数），误配为 NotebookEdit 的错误渲染；归属疑似错误。
 */
//@ chunk-ah34pb7m.js:99385-99918 placement = renderToolUseErrorMessage (0.161)
function renderToolUseErrorMessage_5(m) {
  let E = w(11),
    {
      addMargin: addMargin,
      param: param,
      taskDelivery: taskDelivery,
      messageId: messageId,
      origin: origin,
      verbose: verbose,
      isExpanded: isExpanded,
    } = m,
    { text: text } = param,
    k = verbose === void 0 ? !1 : verbose,
    b = isExpanded === void 0 ? k : isExpanded,
    B;
  if (E[0] !== text) {
    let L = extractTag(text, SUMMARY);
    B = L === null ? null : unescapeHtmlEntities(L);
    ((E[0] = text), (E[1] = B));
  } else B = E[1];
  let N = B;
  if (!N) {
    return null;
  }
  let W;
  if (
    E[2] !== addMargin ||
    E[3] !== b ||
    E[4] !== messageId ||
    E[5] !== origin ||
    E[6] !== N ||
    E[7] !== taskDelivery ||
    E[8] !== text ||
    E[9] !== k
  )
    ((W = e(TaskNotificationMessage, {
      addMargin: addMargin,
      text: text,
      summary: N,
      taskDelivery: taskDelivery,
      messageId: messageId,
      origin: origin,
      verbose: k,
      isExpanded: b,
    })),
      (E[2] = addMargin),
      (E[3] = b),
      (E[4] = messageId),
      (E[5] = origin),
      (E[6] = N),
      (E[7] = taskDelivery),
      (E[8] = text),
      (E[9] = k),
      (E[10] = W));
  else W = E[10];
  return W;
}
/**
 * 任务完成通知消息
 */
//@ chunk-ah34pb7m.js:99918-101686 placement
function TaskNotificationMessage(m) {
  let k = w(49),
    {
      addMargin: addMargin,
      text: text,
      summary: summary,
      taskDelivery: taskDelivery,
      messageId: messageId,
      origin: origin,
      verbose: verbose,
      isExpanded: isExpanded,
    } = m,
    b;
  if (k[0] !== text) ((b = extractTag(text, STATUS)), (k[0] = text), (k[1] = b));
  else b = k[1];
  let E = b,
    B;
  if (k[2] !== text) ((B = extractTag(text, "duration_ms")), (k[2] = text), (k[3] = B));
  else B = k[3];
  let L = Number(B),
    N;
  if (k[4] !== text) ((N = readTagText(text, TASK_ID)), (k[4] = text), (k[5] = N));
  else N = k[5];
  let W = N,
    U;
  if (k[6] !== text) ((U = readTagText(text, STATUS)), (k[6] = text), (k[7] = U));
  else U = k[7];
  let K = U,
    V;
  if (k[8] !== text) ((V = readTagText(text, TASK_TYPE)), (k[8] = text), (k[9] = V));
  else V = k[9];
  let Y = V,
    X;
  if (k[10] !== text) ((X = readTagText(text, TOOL_USE_ID)), (k[10] = text), (k[11] = X));
  else X = k[11];
  let z = X,
    ee;
  if (k[12] !== W) ((ee = W !== void 0 && { id: W }), (k[12] = W), (k[13] = ee));
  else ee = k[13];
  let le;
  if (k[14] !== K) ((le = K !== void 0 && { status: K }), (k[14] = K), (k[15] = le));
  else le = k[15];
  let ge;
  if (k[16] !== Y) ((ge = Y !== void 0 && { type: Y }), (k[16] = Y), (k[17] = ge));
  else ge = k[17];
  let ae;
  if (k[18] !== z) ((ae = z !== void 0 && { toolUseId: z }), (k[18] = z), (k[19] = ae));
  else ae = k[19];
  let pe;
  if (k[20] !== L) ((pe = Number.isFinite(L) && L > 0 && { durationMs: L }), (k[20] = L), (k[21] = pe));
  else pe = k[21];
  let te;
  if (k[22] !== ae || k[23] !== pe || k[24] !== ee || k[25] !== le || k[26] !== ge)
    ((te = { ...ee, ...le, ...ge, ...ae, ...pe }),
      (k[22] = ae),
      (k[23] = pe),
      (k[24] = ee),
      (k[25] = le),
      (k[26] = ge),
      (k[27] = te));
  else te = k[27];
  let de = te,
    ue;
  if (k[28] !== origin || k[29] !== text)
    ((ue = parseTeammateResultBlock(text, origin)), (k[28] = origin), (k[29] = text), (k[30] = ue));
  else ue = k[30];
  let J = ue,
    se;
  if (
    k[31] !== addMargin ||
    k[32] !== L ||
    k[33] !== isExpanded ||
    k[34] !== messageId ||
    k[35] !== J ||
    k[36] !== E ||
    k[37] !== summary ||
    k[38] !== taskDelivery ||
    k[39] !== text ||
    k[40] !== verbose
  )
    ((se = (ye) =>
      e(MonitorNotificationMessage, {
        addMargin: addMargin,
        text: text,
        summary: ye,
        monitorEvent: ye === summary ? J : null,
        status: E,
        durationMs: L,
        taskDelivery: taskDelivery,
        messageId: messageId,
        verbose: verbose,
        isExpanded: isExpanded,
      })),
      (k[31] = addMargin),
      (k[32] = L),
      (k[33] = isExpanded),
      (k[34] = messageId),
      (k[35] = J),
      (k[36] = E),
      (k[37] = summary),
      (k[38] = taskDelivery),
      (k[39] = text),
      (k[40] = verbose),
      (k[41] = se));
  else se = k[41];
  let Te;
  if (
    k[42] !== isExpanded ||
    k[43] !== messageId ||
    k[44] !== origin ||
    k[45] !== summary ||
    k[46] !== se ||
    k[47] !== de
  )
    ((Te = {
      messageId: messageId,
      stored: origin,
      text: summary,
      isExpanded: isExpanded,
      task: de,
      draw: se,
    }),
      (k[42] = isExpanded),
      (k[43] = messageId),
      (k[44] = origin),
      (k[45] = summary),
      (k[46] = se),
      (k[47] = de),
      (k[48] = Te));
  else Te = k[48];
  return a9.useUserMessageSite(Te);
}
/**
 * 监控任务通知消息
 */
//@ chunk-ah34pb7m.js:101686-103536 placement
function MonitorNotificationMessage(m) {
  let B = w(32),
    {
      addMargin: addMargin,
      summary: summary,
      monitorEvent: monitorEvent,
      status: status,
      durationMs: durationMs,
      taskDelivery: taskDelivery,
      messageId: messageId,
      verbose: verbose,
      isExpanded: isExpanded,
    } = m,
    b = noticeSystemLines(verbose),
    E = Se(xtn).get(messageId) ?? 0,
    L;
  if (B[0] !== status) ((L = getStatusColor(status)), (B[0] = status), (B[1] = L));
  else L = B[1];
  let N = L,
    W = !1 && N === "text" ? "planMode" : N,
    U;
  if (B[2] !== durationMs)
    ((U = Number.isFinite(durationMs) && durationMs > 0 ? ` \xB7 ${formatDuration(durationMs)}` : null),
      (B[2] = durationMs),
      (B[3] = U));
  else U = B[3];
  let K = U,
    V = taskDelivery !== void 0 && getTaskRunState().bashTaskDeliveryOutcomes.get(messageId) !== "no_host",
    Y = V ? completedTaskResultText(taskDelivery) : "",
    X = V
      ? `delivered to Claude as a ${GET_TASK_TOOL_TEXT} result${Y ? ` (${formatNumber(Y.length)} chars)` : ""}`
      : null,
    z = X === null ? null : ` \xB7 ${X}`;
  if (monitorEvent !== null && !isExpanded) {
    let ee;
    if (B[4] !== addMargin || B[5] !== W || B[6] !== monitorEvent || B[7] !== status || B[8] !== b)
      ((ee = e(MonitorEventRow, {
        addMargin: addMargin,
        monitorEvent: monitorEvent,
        status: status,
        color: W,
        transcriptV2Rows: b,
      })),
        (B[4] = addMargin),
        (B[5] = W),
        (B[6] = monitorEvent),
        (B[7] = status),
        (B[8] = b),
        (B[9] = ee));
    else ee = B[9];
    return ee;
  }
  if (b) {
    return e(NoticeRowMessage, {
      row: taskNotificationSummaryLine({
        status: status,
        summary: summary,
        context: null,
        durationMs: durationMs,
        deliveryNote: X,
        sentMessages: E,
      }),
      addMargin: addMargin,
    });
  }
  const le = Box,
    ee = addMargin ? 1 : 0,
    ge = "column";
  let ae;
  if (B[10] !== W)
    ((ae = e(Text, { "aria-hidden": !0, color: W, children: !1 ? re.pointer : BLACK_CIRCLE })),
      (B[10] = W),
      (B[11] = ae));
  else ae = B[11];
  let pe;
  if (B[12] !== summary) ((pe = Dr(sanitizeDisplayText(summary))), (B[12] = summary), (B[13] = pe));
  else pe = B[13];
  let te;
  if (B[14] !== K) ((te = K && e(Text, { dimColor: !0, children: K })), (B[14] = K), (B[15] = te));
  else te = B[15];
  let de;
  if (B[16] !== z) ((de = z && e(Text, { dimColor: !0, children: z })), (B[16] = z), (B[17] = de));
  else de = B[17];
  let ue;
  if (B[18] !== ae || B[19] !== pe || B[20] !== te || B[21] !== de)
    ((ue = r(Text, { children: [ae, " ", pe, te, de] })),
      (B[18] = ae),
      (B[19] = pe),
      (B[20] = te),
      (B[21] = de),
      (B[22] = ue));
  else ue = B[22];
  const J =
    verbose && Y
      ? e(Box, { paddingLeft: 2, children: e(Text, { dimColor: !0, children: sanitizeDisplayText(Y) }) })
      : null;
  let se;
  if (B[23] !== isExpanded || B[24] !== monitorEvent)
    ((se =
      isExpanded && monitorEvent !== null
        ? e(Box, { paddingLeft: 2, children: e(Text, { dimColor: !0, children: monitorEvent.body }) })
        : null),
      (B[23] = isExpanded),
      (B[24] = monitorEvent),
      (B[25] = se));
  else se = B[25];
  let ye;
  if (B[26] !== le || B[27] !== J || B[28] !== se || B[29] !== ee || B[30] !== ue)
    ((ye = r(le, { marginTop: ee, flexDirection: ge, children: [ue, J, se] })),
      (B[26] = le),
      (B[27] = J),
      (B[28] = se),
      (B[29] = ee),
      (B[30] = ue),
      (B[31] = ye));
  else ye = B[31];
  return ye;
}
/**
 * 监控事件行
 */
//@ chunk-ah34pb7m.js:103536-104446 placement
function MonitorEventRow(m) {
  let T = w(19),
    {
      addMargin: addMargin,
      monitorEvent: monitorEvent,
      status: status,
      color: color,
      transcriptV2Rows: transcriptV2Rows,
    } = m,
    { columns: columns } = useTerminalSize(),
    x,
    k,
    b;
  if (
    T[0] !== addMargin ||
    T[1] !== columns ||
    T[2] !== monitorEvent ||
    T[3] !== status ||
    T[4] !== transcriptV2Rows
  ) {
    b = EARLY_RETURN_SENTINEL;
    E: {
      ({ headline: k, description: x } = fitMonitorEventText(monitorEvent, columns - NOTIFICATION_INDENT));
      if (transcriptV2Rows) {
        b = e(NoticeRowMessage, {
          row: taskNotificationSummaryLine({
            status: status,
            summary: `${MONITOR_EVENT_PREFIX} ${k}`,
            context: x,
            durationMs: 0,
            deliveryNote: null,
            sentMessages: 0,
          }),
          addMargin: addMargin,
        });
        break E;
      }
    }
    ((T[0] = addMargin),
      (T[1] = columns),
      (T[2] = monitorEvent),
      (T[3] = status),
      (T[4] = transcriptV2Rows),
      (T[5] = x),
      (T[6] = k),
      (T[7] = b));
  } else ((x = T[5]), (k = T[6]), (b = T[7]));
  if (b !== EARLY_RETURN_SENTINEL) return b;
  const B = addMargin ? 1 : 0;
  let L;
  if (T[8] !== color)
    ((L = e(Text, { "aria-hidden": !0, color: color, children: BLACK_CIRCLE })), (T[8] = color), (T[9] = L));
  else L = T[9];
  let N;
  if (T[10] !== x)
    ((N = x !== null && e(Text, { dimColor: !0, children: ` \xB7 ${x}` })), (T[10] = x), (T[11] = N));
  else N = T[11];
  let W;
  if (T[12] !== k || T[13] !== L || T[14] !== N)
    ((W = r(Text, { wrap: "truncate-end", children: [L, " ", MONITOR_EVENT_PREFIX, " ", k, N] })),
      (T[12] = k),
      (T[13] = L),
      (T[14] = N),
      (T[15] = W));
  else W = T[15];
  let U;
  if (T[16] !== B || T[17] !== W)
    ((U = e(Box, { marginTop: B, children: W })), (T[16] = B), (T[17] = W), (T[18] = U));
  else U = T[18];
  return U;
}
//@ chunk-ah34pb7m.js:104446-104523 placement
function readTagText(m, d) {
  let c = extractTag(m, d),
    g = c === null ? "" : capIdFrameField(c, IDLE_ID_FIELD_RECEIVE_BOUND);
  return g === "" ? void 0 : g;
}

export { renderToolUseErrorMessage_5 };
