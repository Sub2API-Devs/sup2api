/**
 * tools/ObserverReportTool/ObserverReportTool.ts
 *
 * 2.1.316 新增：ObserverReport 工具：观察者代理把报告送回被观察的代理，长报告落盘。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0m7em5b4.js (15)
 * attribution: placement 15
 */
import { randomUUID } from "crypto";
import {
  runAgentSpawnHooks,
  SUBAGENT_REPORT_INSTRUCTIONS,
  t2n,
  n2n,
  Zzn,
  UNREVIEWED_REPORT_WARNING,
} from "../AgentTool/subagentSpawn.js";
import { K1r } from "../../plugins/functionHooks/eventCatalog.js";
import { isDiskless, mainAgentId } from "../../bootstrap/state.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, M, zodStrictObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SUBAGENTHANDBACK, AGENT, GCt } from "../AgentTool/constants.js";
import { O9n } from "../../utils/permissions/permissions.js";
import { R5t, Wdr, QJr, A5t, parseHandbackReport, C5t, Gdr, Nwe } from "../AgentTool/handbackReport.js";
import { y1r } from "../AgentTool/agentEffort.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { Hb } from "../../utils/swarm/teammateIds.js";
import { Mr } from "../../utils/agentId.js";
import { sanitizeSubagentOutput } from "../../utils/subagentOutputScan.js";
import { lIt, xBe } from "../../utils/sessionPeers.js";
import { lXn, queueAgentMessage } from "../../tasks/LocalAgentTask/childWork.js";
import { fq } from "../../utils/agentListing.js";
import { PCe, holdQueuedInput } from "../../plugins/functionHooks/inputHold.js";
import { useTeammateLifecycleNotification } from "../../hooks/notifs/useTeammateShutdownNotification.js";
import { sendMessageToAgent } from "../../tasks/LocalAgentTask/pendingMessages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  buildUnreviewedSubagentWarning,
  buildSubagentClassifierUnavailableNote,
} from "../../utils/messages.js";
import {
  getPersistenceThreshold,
  persistToolResult,
  toolResultsDirFor,
  isPersistError,
  W5o,
  buildTruncatedInlineResult,
  buildPersistedOutputMessage,
} from "../../utils/toolResultStorage.js";
import { findArmedPairingByObserver } from "../../services/agentObserver/agentObserver.js";
import { keepaliveReasons } from "../../tasks/taskKinds.js";
import { FLAG_IDLE_WINDOW } from "../../tasks/LocalAgentTask/keepalive.js";
import { enqueueCommand } from "../../utils/messageQueueManager.js";
import { WORKFLOW_TOOL_NAME } from "../WorkflowTool/constants.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../ScheduleWakeupTool/prompt.js";
import { MONITOR } from "../MonitorTool/constants.js";
import { CRON_CREATE_TOOL_NAME } from "../ScheduleCronTool/prompt.js";
import { POLL } from "../PollTool/prompt.js";

//@ chunk-0m7em5b4.js:3368-3392 placement
var launchAgentsWithHooks = (e) => runAgentSpawnHooks(e, K1r);
//@ chunk-0m7em5b4.js:3392-3475 placement
var NO_OWN_WORKDIR_MESSAGE = "a working directory of its own is unavailable in a session without a disk";
//@ chunk-0m7em5b4.js:3475-3624 placement
function parseAgentIdArg(e) {
  if (e === void 0 || e === null) return;
  if (typeof e !== "string" || e.trim() === "") return "cwd must be a string holding a path";
  return isDiskless() ? NO_OWN_WORKDIR_MESSAGE : void 0;
}
//@ chunk-0m7em5b4.js:3820-4006 placement
function reportSenderIdentity(e, h, w) {
  if (h !== void 0) return { from: h, displayName: h };
  if (isInProcessTeammateTask(w)) return { from: w.identity.agentName, displayName: w.identity.agentName };
  return { from: e, displayName: isLocalAgent(w) ? w.agentType : e };
}
//@ chunk-0m7em5b4.js:4006-4121 placement
var observerReportInputSchema = DoctorLazy(() =>
    u({ message: o().describe("Your full report for your caller") }),
  ),
  observerReportOutputSchema = DoctorLazy(() => u({ success: M(), message: o() }));
/**
 * 为观察者报告工具构建调用上下文：以 getter 代理会话、存储、代理 id、任务注册表、生命周期、消息队列与消息等字段。
 */
//@ chunk-0m7em5b4.js:4121-4576 placement
function createReportContext(e, h) {
  return {
    get session() {
      return e.session;
    },
    get storageV5() {
      return e.storageV5;
    },
    get agentId() {
      return e.agentId;
    },
    get taskRegistry() {
      return e.taskRegistry;
    },
    get agentLifecycle() {
      return e.agentLifecycle;
    },
    get messageQueue() {
      return e.messageQueue;
    },
    get messages() {
      return e.messages;
    },
    get hookCaller() {
      return e.hookCaller;
    },
    get hookServesModel() {
      return e.hookServesModel;
    },
    get pluginUnnamed() {
      return e.pluginUnnamed;
    },
    get toolUseId() {
      return h.toolUseId;
    },
  };
}
/**
 * ObserverReport 工具（2.1.316 新增）：观察者代理把最终报告送回其报告目标（被观察的代理），超长报告先落盘再给路径。
 */
//@ chunk-0m7em5b4.js:4576-7501 placement
var ObserverReportTool = buildTool({
  name: SUBAGENTHANDBACK,
  searchHint: "deliver your final report to the agent that spawned you",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  alwaysLoad: !0,
  userFacingName() {
    return SUBAGENTHANDBACK;
  },
  get inputSchema() {
    return observerReportInputSchema();
  },
  get outputSchema() {
    return observerReportOutputSchema();
  },
  isReadOnly() {
    return !1;
  },
  classifierOnly() {
    return { onBlock: "flag" };
  },
  async description() {
    return SUBAGENT_REPORT_INSTRUCTIONS;
  },
  async prompt() {
    return t2n;
  },
  toAutoClassifierInput(e) {
    return `${n2n}: ${e.message}`;
  },
  create(e) {
    return {
      async validateInput(h) {
        if (h.message.trim().length === 0)
          return { result: !1, message: "message must not be empty", errorCode: 9 };
        return { result: !0 };
      },
      async call(h, w) {
        let A = createReportContext(e, w),
          agentId = A.agentId,
          P = O9n(A.toolUseId),
          E = P !== void 0 && P.kind !== "unavailable";
        if (E && agentId !== void 0) R5t(agentId);
        let O = getHandbackTarget(A);
        if (agentId === void 0 || O === void 0)
          return {
            data: {
              success: !1,
              message: `Nothing was sent: ${SUBAGENTHANDBACK} is not active for this agent. Write your report as plain text instead.`,
            },
          };
        let F = {
          data: {
            success: !1,
            message: `Nothing was sent: your report was already delivered (${SUBAGENTHANDBACK} delivers one report). ${y1r() ? "Stop now." : `Use ${SENDMESSAGE} for anything further, then stop.`}`,
          },
        };
        if (Wdr(agentId, O.recipient) !== void 0) return F;
        let j = Er(A, agentId),
          Z = Hb(
            reportSenderIdentity(agentId, A.agentLifecycle.nameOf(Mr(agentId)), A.taskRegistry.get(agentId))
              .displayName,
          ),
          sanitized = sanitizeSubagentOutput(h.message).sanitized,
          ke = QJr(await spillLongReport(sanitized, A)),
          Q = P === void 0 ? void 0 : describeReportBlock(P),
          Me =
            Q === void 0
              ? ke
              : `${A5t(Q)}
${ke}`,
          Pe = lIt(Me),
          V = parseHandbackReport(Pe),
          Ee = {
            kind: "peer",
            from: j,
            senderTaskId: agentId,
            ...(Z && { name: Z }),
            body: Pe,
            handback: !0,
            ...(A.hookCaller !== void 0 && !A.hookServesModel && { plugin: A.hookCaller }),
            ...(E && { flagged: !0 }),
            ...(V?.note !== void 0 && { handbackNote: V.note }),
            ...(V !== void 0 && { handbackReportText: V.report }),
          },
          Fe = A.taskRegistry.get(agentId),
          oe =
            isLocalAgent(Fe) && Fe.isBackgrounded && !lXn(O.recipient, A.taskRegistry)
              ? mainAgentId()
              : O.recipient;
        if (oe !== O.recipient) A.taskRegistry.update(agentId, (re) => ({ ...re, handbackRecipient: oe }));
        if (Wdr(agentId, oe) !== void 0) return F;
        let Ce = xBe(j, Me),
          W = fq(A.messages()),
          Be = W.length > 0 ? { toolsUsed: W } : {};
        if (oe === mainAgentId()) {
          let re = () =>
            A.messageQueue.enqueueReportingAdmission({
              mode: "prompt",
              agentId: mainAgentId(),
              value: Ce,
              priority: "next",
              origin: Ee,
              skipSlashCommands: !0,
              isMeta: !0,
              skipAttachments: !0,
              ...Be,
            });
          if (PCe(A)) {
            C5t({ sender: agentId, recipient: oe, senderName: j, flagged: E });
            let pe = () => {
              if (PCe(A)) return holdQueuedInput(pe);
              let ie = Gdr(agentId);
              if ((re(), !ie)) Nwe(agentId);
            };
            holdQueuedInput(pe);
          } else if (!re().admitted)
            return {
              data: {
                success: !1,
                message: "Nothing was sent: the main conversation did not accept the message.",
              },
            };
        } else {
          if (!useTeammateLifecycleNotification(A.taskRegistry.get(O.recipient)))
            return {
              data: {
                success: !1,
                message: "Nothing was sent: the agent that spawned you is no longer running.",
              },
            };
          sendMessageToAgent(O.recipient, Ce, A.taskRegistry, { origin: Ee, isMeta: !0, ...Be });
        }
        return (
          A.taskRegistry.update(agentId, (re) => ({
            ...re,
            handbackReport: {
              text: lIt(sanitizeSubagentOutput(h.message, { prependMarker: !1 }).sanitized),
              ...(Q !== void 0 && { warning: lIt(Q) }),
            },
          })),
          {
            data: { success: !0, message: "Report delivered to your caller." },
            ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_purring_pine", !0) && { endsTurn: !0 }),
          }
        );
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, h) {
    return { tool_use_id: h, type: "tool_result", content: [{ type: "text", text: jsonStringify(e) }] };
  },
  renderToolUseMessage() {
    return null;
  },
});
//@ chunk-0m7em5b4.js:7501-7683 placement
function describeReportBlock(e) {
  switch (e.kind) {
    case "blocked":
      return Zzn(e.reason);
    case "refused":
      return e.switchedOff ? buildUnreviewedSubagentWarning("report") : UNREVIEWED_REPORT_WARNING;
    case "unavailable":
      return buildSubagentClassifierUnavailableNote(e.model, e.httpStatus, e.errorKind);
  }
}
//@ chunk-0m7em5b4.js:7683-7909 placement
async function spillLongReport(e, h) {
  let w = getPersistenceThreshold(AGENT, GCt);
  if (e.length <= w) return e;
  let A = await persistToolResult(
    e,
    h.toolUseId ?? `${SUBAGENTHANDBACK}-${randomUUID()}`,
    toolResultsDirFor(h.session),
    h.storageV5,
  );
  if (isPersistError(A)) {
    if (W5o(h.session) !== void 0) return buildTruncatedInlineResult(e, w)?.message ?? e;
    return e;
  }
  return buildPersistedOutputMessage(A);
}
//@ chunk-0m7em5b4.js:7909-8099 placement
function getHandbackTarget(e) {
  if (e.agentId === void 0) return;
  let h = e.taskRegistry.get(e.agentId);
  if (!isLocalAgent(h) || h.handbackContract !== !0 || h.handbackRecipient === void 0) return;
  return { recipient: h.handbackRecipient };
}
//@ chunk-0m7em5b4.js:8099-8157 placement
function Er(e, h) {
  return e.agentLifecycle.nameOf(Mr(h)) ?? h;
}
//@ chunk-0m7em5b4.js:8188-8212 placement
var OBSERVERREPORT = "ObserverReport";
//@ chunk-0m7em5b4.js:8212-9170 placement
var OBSERVER_REPORT_DESCRIPTION =
    "Send a report to your report target \u2014 the agent you observe, or the coordinating agent that spawned the worker you observe. The target is resolved from your observer pairing \u2014 there is no recipient to name. Use this only when you have something genuinely useful: a mistake about to compound, a missed constraint, prior art the observed agent should see. The expected steady state is silence \u2014 if nothing warrants action, end your turn without calling this.",
  Ft =
    "Send a report to your report target \u2014 the agent you observe, or the coordinating agent that spawned the worker you observe. The target is resolved from your observer pairing \u2014 there is no recipient to name. Use this only when you have something genuinely useful: a mistake about to compound, a missed constraint, prior art the observed agent should see. The expected steady state is silence \u2014 if nothing warrants action, end your turn without calling this.";
//@ chunk-0m7em5b4.js:9170-10922 placement
var ObserverReportInputSchema = DoctorLazy(() =>
    zodStrictObject({
      report: o().min(1).describe("The report to deliver to your report target. Be concise and specific."),
    }),
  ),
  Ct = buildTool({
    name: OBSERVERREPORT,
    backgrounding: "never",
    maxResultSizeChars: 1000,
    async description() {
      return OBSERVER_REPORT_DESCRIPTION;
    },
    async prompt() {
      return Ft;
    },
    get inputSchema() {
      return ObserverReportInputSchema();
    },
    isReadOnly() {
      return !1;
    },
    isEnabled() {
      return !0;
    },
    create(e) {
      return {
        async checkPermissions(h) {
          return { behavior: "allow", updatedInput: h };
        },
        async call(h) {
          let agentId = e.agentId;
          if (agentId === void 0)
            return {
              data: {
                success: !1,
                message:
                  "ObserverReport is only available to an observer agent; the main session does not have an observed pairing.",
              },
            };
          let A = findArmedPairingByObserver(e.session, agentId);
          if (!A)
            return {
              data: {
                success: !1,
                message:
                  "Your observer pairing is not armed (stopped, retired, or never installed). The report was not delivered.",
              },
            };
          let {
            reportTargetTaskId: reportTargetTaskId,
            reportTargetName: reportTargetName,
            viaWorkerName: viaWorkerName,
          } = A;
          if (reportTargetTaskId !== void 0) {
            let r = e.taskRegistry.get(reportTargetTaskId);
            if (!(
              isLocalAgent(r) &&
              (r.status === "running" ||
                (r.status === "completed" && [...keepaliveReasons(r)].some((Q) => Q !== FLAG_IDLE_WINDOW)))
            ))
              return {
                data: {
                  success: !1,
                  message: `The report target (${reportTargetName}) is not running. The report was not delivered.`,
                },
              };
          }
          let O = `observer:${A.observerAgentType}`,
            F =
              A.observedTaskId === void 0 ? `"${viaWorkerName}"` : `"${viaWorkerName}" [${A.observedTaskId}]`,
            j = xBe(
              O,
              viaWorkerName === void 0
                ? h.report
                : `(observing worker ${F})
${h.report}`,
            ),
            Z = { kind: "observer", from: O, senderTaskId: agentId };
          if ((A.reportOrigins.add(Z), reportTargetTaskId === void 0))
            enqueueCommand({
              mode: "prompt",
              agentId: mainAgentId(),
              value: j,
              priority: "next",
              origin: Z,
              skipSlashCommands: !0,
              isMeta: !0,
              skipAttachments: !0,
            });
          else queueAgentMessage(reportTargetTaskId, j, e.taskRegistry, { origin: Z, isMeta: !0 });
          return {
            data: {
              success: !0,
              message: `Report queued for ${reportTargetTaskId === void 0 ? "the main conversation" : reportTargetName}.`,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, h) {
      return { type: "tool_result", tool_use_id: h, content: e.message, is_error: !e.success };
    },
    renderToolUseMessage(e) {
      return `report: ${e.report}`;
    },
  });
//@ chunk-0m7em5b4.js:10922-10958 placement
var OBSERVER_EXCLUDED_TOOLS = [
  SENDMESSAGE,
  SUBAGENTHANDBACK,
  OBSERVERREPORT,
  AGENT,
  WORKFLOW_TOOL_NAME,
  SCHEDULE_WAKEUP_TOOL_NAME,
  MONITOR,
  CRON_CREATE_TOOL_NAME,
  POLL,
];

export {
  parseAgentIdArg,
  OBSERVER_EXCLUDED_TOOLS,
  Ct,
  launchAgentsWithHooks,
  NO_OWN_WORKDIR_MESSAGE,
  ObserverReportTool,
  reportSenderIdentity,
};
