/**
 * cli/print/resumeMcpTasks.ts
 *
 * 2.1.316 新增：恢复时处理 MCP 任务的结束通知与迟到通知
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (12)
 * attribution: placement 12
 */
import { normalizeMessages } from "../../utils/messages.js";
import { MAX_LIST_ITEMS } from "../../bridge/controlRequests.js";
import { logEvent } from "../../services/analytics/index.js";
import { isMcpTasksEnabled } from "../../services/mcp/mcpTaskWorker.js";
import { logForDebugging } from "../../utils/debug.js";
import { getSessionId, mainAgentId } from "../../bootstrap/state.js";
import { kb, enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import {
  getMcpTaskProjectDir,
  listMcpTaskOutcomes,
  deleteMcpTaskMetadata,
  rcn,
  ncn,
} from "../../services/mcp/mcpTasks.js";
import { Jzs, UYn, qLo, getTaskNotificationRunId } from "../../tasks/McpTask/mcpTaskEndings.js";
import { Wfn, q4s, g8n } from "../../services/mcp/taskDelivery.js";
import { getMaxMcpOutputChars } from "../../utils/mcpValidation.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { Uv } from "../../services/compact/keptTools.js";
import { logError } from "../../utils/log.js";
import { isTaskIdOfType } from "../../Task.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";

/**
 * 判断某条消息是否被另一条声明 supersedesUuids 的消息取代（按 uuid 或规范化后的 uuid）。
 */
//@ chunk-0sfjpx19.js:76977-77132 placement
function supersedesMessage(e, n) {
  let supersedesUuids = e.supersedesUuids;
  if (supersedesUuids === void 0 || supersedesUuids.length === 0) return !1;
  if (supersedesUuids.includes(n.uuid)) return !0;
  return normalizeMessages([n]).some((s) => supersedesUuids.includes(s.uuid));
}
//@ chunk-0sfjpx19.js:77132-77373 placement
function logBridgeDialogKindsDeclared(e, n, r, s) {
  let size = e.size;
  for (let y of n) {
    if (e.size >= MAX_LIST_ITEMS) break;
    e.add(y);
  }
  if (r === "restored" || e.size === size) return;
  (logEvent("tengu_repl_bridge_dialog_kinds_declared", {
    kind_count: e.size,
    has_refusal_fallback: e.has("refusal_fallback_prompt"),
  }),
    s());
}
//@ chunk-0sfjpx19.js:77373-77382 placement
var ko = 8;
//@ chunk-0sfjpx19.js:77382-77547 placement
async function loadMcpTaskModule({ sessionId: sessionId, conversation: conversation, ...r }) {
  if (!isMcpTasksEnabled()) return;
  (await deliverMcpTaskEndings(sessionId, conversation, r),
    await require("./chunk-asne9cp8.js").mcpTaskWatcherModule().restoreMcpTasks(r));
}
/**
 * 列出并投递上次进程期间结束的 MCP 任务通知（列不出时等下次恢复）。
 */
//@ chunk-0sfjpx19.js:77547-79140 placement
async function deliverMcpTaskEndings(e, n, { taskRegistry: taskRegistry, storageV5: storageV5 }) {
  let h = (y) => (_) => logForDebugging(`MCP task endings: ${y}: ${String(_)}`, { level: "warn" });
  try {
    if (getSessionId() !== e) return;
    kb(isMcpTaskNotification);
    let y = getMcpTaskProjectDir(),
      filtered = (
        (await listMcpTaskOutcomes(storageV5).catch(
          h("could not be listed, so they wait for the next resume"),
        )) ?? []
      ).filter((N) => N.sessionId === e);
    if (filtered.length === 0) return;
    let k = taskNotificationRunKeys(n),
      w = [],
      S = 0;
    for (let N of filtered) {
      let registryId = N.registryId;
      if (
        (await deleteMcpTaskMetadata(registryId, storageV5, e, y).catch(
          h(`could not delete the resume record of ended task ${registryId}`),
        ),
        k.has(`${registryId} ${N.runId}`))
      )
        (Jzs(registryId),
          await rcn(registryId, storageV5, e, y).then(
            () => {
              (Wfn(N.code), S++);
            },
            h(`could not delete the saved ending of task ${registryId}`),
          ));
      else if (taskRegistry.get(registryId) === void 0) w.push(N);
    }
    w.sort((N, G) => G.endedAt - N.endedAt);
    let T = [],
      D = getMaxMcpOutputChars(),
      E = w.length;
    for (let N of w) {
      let G = formatLateNotificationPreamble(N);
      if (G !== void 0) {
        if (((D -= G.length), T.length === ko || (T.length > 0 && D < 0))) break;
        T.push({ ending: N, value: G });
      }
      E--;
    }
    if (getSessionId() !== e) return;
    for (let [N, { ending: G, value: R }] of T.reverse().entries()) {
      let { registryId: registryId, runId: runId, toolUseId: toolUseId, code: code } = G;
      (q4s(),
        UYn(
          registryId,
          { sessionId: e, runId: runId, toolUseId: toolUseId },
          (Q) =>
            void rcn(registryId, storageV5, e, ncn(e, y)).then(
              () => (Q ? Wfn : g8n)(code),
              h(`could not delete the saved ending of task ${registryId}`),
            ),
        ));
      let te = buildMcpToolName(G.serverName, G.toolName);
      (Uv(te),
        enqueuePendingNotification({
          value:
            E > 0 && N === T.length - 1
              ? `${R} ${E} older saved notification(s) of finished tasks are not shown here; at most ${ko} arrive each time this session is resumed.`
              : R,
          toolsUsed: [te],
          mode: "task-notification",
          skipAttachments: !0,
          priority: "next",
          agentId: mainAgentId(),
          taskId: registryId,
          runId: runId,
          passive: !0,
          unlogged: !0,
        }));
    }
    logForDebugging(
      `MCP task endings: ${filtered.length} saved, ${S} already in the conversation and deleted, ${T.length} queued for the next turn, ${filtered.length - S - T.length} passed over`,
    );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0sfjpx19.js:79140-79268 placement
function isMcpTaskNotification(e) {
  return (
    e.mode === "task-notification" &&
    e.passive === !0 &&
    e.unlogged === !0 &&
    e.taskId !== void 0 &&
    isTaskIdOfType("mcp_task", e.taskId)
  );
}
//@ chunk-0sfjpx19.js:79268-79601 placement
function formatLateNotificationPreamble(e) {
  try {
    let { buildSep2663EndingNotice: buildSep2663EndingNotice } = require("./chunk-g25jqyhb.js");
    return `${buildSep2663EndingNotice(e)}
This notification was written at ${new Date(e.endedAt).toISOString()}. It is delivered now because this session was resumed and its conversation does not contain it. If you have already seen it, ignore this copy.`;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-0sfjpx19.js:79601-79706 placement
function taskNotificationRunKeys(e) {
  let n = new Set();
  for (let r of e) {
    let s = qLo(r);
    if (s !== void 0) n.add(`${s} ${getTaskNotificationRunId(r)}`);
  }
  return n;
}
//@ chunk-0sfjpx19.js:79743-79776 placement
var _s = 7200000,
  LLt = new Set([BRIEF_TOOL_NAME]);
//@ chunk-0sfjpx19.js:79776-79810 placement
function dt(e) {
  return /\S/.test(e);
}
/**
 * 判断流事件是否为内容为标记文本的 text_delta。
 */
//@ chunk-0sfjpx19.js:79810-79911 placement
function isMarkerTextDelta(e) {
  return e.type === "content_block_delta" && e.delta.type === "text_delta" && dt(e.delta.text);
}
//@ chunk-0sfjpx19.js:79911-79975 placement
function So(e) {
  return !e.isApiErrorMessage && e.message.model !== SYNTHETIC_MODEL;
}

export {
  So,
  dt,
  _s,
  LLt,
  loadMcpTaskModule,
  supersedesMessage,
  logBridgeDialogKindsDeclared,
  isMarkerTextDelta,
};
