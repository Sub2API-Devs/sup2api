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
  SUBAGENT_HANDBACK_INSTRUCTIONS,
  SUBAGENT_HANDBACK_DESCRIPTION,
  blockedReportWarning,
  UNREVIEWED_REPORT_WARNING,
} from "../AgentTool/subagentSpawn.js";
import { eventCallersFor } from "../../plugins/functionHooks/eventCatalog.js";
import { isDiskless, mainAgentId } from "../../bootstrap/state.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, M, zodStrictObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SUBAGENTHANDBACK, AGENT, MAX_AGENT_OUTPUT_TOKENS } from "../AgentTool/constants.js";
import { takeClassifierBlock } from "../../utils/permissions/permissions.js";
import {
  flagAgentContract,
  handbackForRecipient,
  handbackReportText,
  indentLines,
  parseHandbackReport,
  noteHandback,
  hasHandbackFrom,
  forgetHandback,
} from "../AgentTool/handbackReport.js";
import { isSendMessageUnavailable } from "../AgentTool/agentEffort.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { clipTeammateText } from "../../utils/swarm/teammateIds.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { sanitizeSubagentOutput } from "../../utils/subagentOutputScan.js";
import { normalizeAgentMessageBody, agentMessageTag } from "../../utils/sessionPeers.js";
import { shouldNotifyTeammateLifecycle, queueAgentMessage } from "../../tasks/LocalAgentTask/childWork.js";
import { toolsUsedForSummary } from "../../utils/agentListing.js";
import { shouldHoldForPlugin, holdQueuedInput } from "../../plugins/functionHooks/inputHold.js";
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
  toolResultsDirFor_2,
  isPersistError,
  toolResultStore,
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
var launchAgentsWithHooks = (request) => runAgentSpawnHooks(request, eventCallersFor);
//@ chunk-0m7em5b4.js:3392-3475 placement
var NO_OWN_WORKDIR_MESSAGE = "a working directory of its own is unavailable in a session without a disk";
//@ chunk-0m7em5b4.js:3475-3624 placement
function parseAgentIdArg(e) {
  if (e === undefined || e === null) return;
  if (typeof e !== "string" || e.trim() === "") return "cwd must be a string holding a path";
  return isDiskless() ? NO_OWN_WORKDIR_MESSAGE : undefined;
}
//@ chunk-0m7em5b4.js:3820-4006 placement
function reportSenderIdentity(e, h, w) {
  if (h !== undefined)
    return {
      from: h,
      displayName: h,
    };
  if (isInProcessTeammateTask(w))
    return {
      from: w.identity.agentName,
      displayName: w.identity.agentName,
    };
  return {
    from: e,
    displayName: isLocalAgent(w) ? w.agentType : e,
  };
}
//@ chunk-0m7em5b4.js:4006-4121 placement
var observerReportInputSchema = DoctorLazy(() =>
  u({
    message: string().describe("Your full report for your caller"),
  }),
);
var observerReportOutputSchema = DoctorLazy(() =>
  u({
    success: M(),
    message: string(),
  }),
);
//@ chunk-0m7em5b4.js:4121-4576 placement
/**
 * 为观察者报告工具构建调用上下文：以 getter 代理会话、存储、代理 id、任务注册表、生命周期、消息队列与消息等字段。
 */
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
//@ chunk-0m7em5b4.js:4576-7501 placement
/**
 * ObserverReport 工具（2.1.316 新增）：观察者代理把最终报告送回其报告目标（被观察的代理），超长报告先落盘再给路径。
 */
var ObserverReportTool = buildTool({
  name: SUBAGENTHANDBACK,
  searchHint: "deliver your final report to the agent that spawned you",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  alwaysLoad: true,
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
    return false;
  },
  classifierOnly() {
    return {
      onBlock: "flag",
    };
  },
  async description() {
    return SUBAGENT_REPORT_INSTRUCTIONS;
  },
  async prompt() {
    return SUBAGENT_HANDBACK_INSTRUCTIONS;
  },
  toAutoClassifierInput(e) {
    return `${SUBAGENT_HANDBACK_DESCRIPTION}: ${e.message}`;
  },
  create(e) {
    return {
      async validateInput(h) {
        if (h.message.trim().length === 0)
          return {
            result: false,
            message: "message must not be empty",
            errorCode: 9,
          };
        return {
          result: true,
        };
      },
      async call(h, w) {
        let reportContext = createReportContext(e, w);
        let agentId = reportContext.agentId;
        let P = takeClassifierBlock(reportContext.toolUseId);
        let E = P !== undefined && P.kind !== "unavailable";
        if (E && agentId !== undefined) flagAgentContract(agentId);
        let handbackTarget = getHandbackTarget(reportContext);
        if (agentId === undefined || handbackTarget === undefined)
          return {
            data: {
              success: false,
              message: `Nothing was sent: ${SUBAGENTHANDBACK} is not active for this agent. Write your report as plain text instead.`,
            },
          };
        let F = {
          data: {
            success: false,
            message: `Nothing was sent: your report was already delivered (${SUBAGENTHANDBACK} delivers one report). ${isSendMessageUnavailable() ? "Stop now." : `Use ${SENDMESSAGE} for anything further, then stop.`}`,
          },
        };
        if (handbackForRecipient(agentId, handbackTarget.recipient) !== undefined) return F;
        let j = agentDisplayName(reportContext, agentId);
        let Z = clipTeammateText(
          reportSenderIdentity(
            agentId,
            reportContext.agentLifecycle.nameOf(identityAgentId2(agentId)),
            reportContext.taskRegistry.get(agentId),
          ).displayName,
        );
        let sanitized = sanitizeSubagentOutput(h.message).sanitized;
        let ke = handbackReportText(await spillLongReport(sanitized, reportContext));
        let Q = P === undefined ? undefined : describeReportBlock(P);
        let Me =
          Q === undefined
            ? ke
            : `${indentLines(Q)}
${ke}`;
        let Pe = normalizeAgentMessageBody(Me);
        let handbackReport = parseHandbackReport(Pe);
        let origin = {
          kind: "peer",
          from: j,
          senderTaskId: agentId,
          ...(Z && {
            name: Z,
          }),
          body: Pe,
          handback: true,
          ...(reportContext.hookCaller !== undefined &&
            !reportContext.hookServesModel && {
              plugin: reportContext.hookCaller,
            }),
          ...(E && {
            flagged: true,
          }),
          ...(handbackReport?.note !== undefined && {
            handbackNote: handbackReport.note,
          }),
          ...(handbackReport !== undefined && {
            handbackReportText: handbackReport.report,
          }),
        };
        let Fe = reportContext.taskRegistry.get(agentId);
        let oe =
          isLocalAgent(Fe) &&
          Fe.isBackgrounded &&
          !shouldNotifyTeammateLifecycle(handbackTarget.recipient, reportContext.taskRegistry)
            ? mainAgentId()
            : handbackTarget.recipient;
        if (oe !== handbackTarget.recipient)
          reportContext.taskRegistry.update(agentId, (re) => ({
            ...re,
            handbackRecipient: oe,
          }));
        if (handbackForRecipient(agentId, oe) !== undefined) return F;
        let Ce = agentMessageTag(j, Me);
        let W = toolsUsedForSummary(reportContext.messages());
        let Be =
          W.length > 0
            ? {
                toolsUsed: W,
              }
            : {};
        if (oe === mainAgentId()) {
          let re = () =>
            reportContext.messageQueue.enqueueReportingAdmission({
              mode: "prompt",
              agentId: mainAgentId(),
              value: Ce,
              priority: "next",
              origin,
              skipSlashCommands: true,
              isMeta: true,
              skipAttachments: true,
              ...Be,
            });
          if (shouldHoldForPlugin(reportContext)) {
            noteHandback({
              sender: agentId,
              recipient: oe,
              senderName: j,
              flagged: E,
            });
            let pe = () => {
              if (shouldHoldForPlugin(reportContext)) return holdQueuedInput(pe);
              let ie = hasHandbackFrom(agentId);
              re();
              if (!ie) forgetHandback(agentId);
            };
            holdQueuedInput(pe);
          } else if (!re().admitted)
            return {
              data: {
                success: false,
                message: "Nothing was sent: the main conversation did not accept the message.",
              },
            };
        } else {
          if (!useTeammateLifecycleNotification(reportContext.taskRegistry.get(handbackTarget.recipient)))
            return {
              data: {
                success: false,
                message: "Nothing was sent: the agent that spawned you is no longer running.",
              },
            };
          sendMessageToAgent(handbackTarget.recipient, Ce, reportContext.taskRegistry, {
            origin,
            isMeta: true,
            ...Be,
          });
        }
        reportContext.taskRegistry.update(agentId, (re) => ({
          ...re,
          handbackReport: {
            text: normalizeAgentMessageBody(
              sanitizeSubagentOutput(h.message, {
                prependMarker: false,
              }).sanitized,
            ),
            ...(Q !== undefined && {
              warning: normalizeAgentMessageBody(Q),
            }),
          },
        }));
        return {
          data: {
            success: true,
            message: "Report delivered to your caller.",
          },
          ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_purring_pine", true) && {
            endsTurn: true,
          }),
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: [
        {
          type: "text",
          text: jsonStringify(e),
        },
      ],
    };
  },
  renderToolUseMessage() {
    return null;
  },
});
//@ chunk-0m7em5b4.js:7501-7683 placement
function describeReportBlock(e) {
  switch (e.kind) {
    case "blocked":
      return blockedReportWarning(e.reason);
    case "refused":
      return e.switchedOff ? buildUnreviewedSubagentWarning("report") : UNREVIEWED_REPORT_WARNING;
    case "unavailable":
      return buildSubagentClassifierUnavailableNote(e.model, e.httpStatus, e.errorKind);
  }
}
//@ chunk-0m7em5b4.js:7683-7909 placement
async function spillLongReport(sanitized, reportContext) {
  let persistenceThreshold = getPersistenceThreshold(AGENT, MAX_AGENT_OUTPUT_TOKENS);
  if (sanitized.length <= persistenceThreshold) return sanitized;
  let A = await persistToolResult(
    sanitized,
    reportContext.toolUseId ?? `${SUBAGENTHANDBACK}-${randomUUID()}`,
    toolResultsDirFor_2(reportContext.session),
    reportContext.storageV5,
  );
  if (isPersistError(A)) {
    if (toolResultStore(reportContext.session) !== undefined)
      return buildTruncatedInlineResult(sanitized, persistenceThreshold)?.message ?? sanitized;
    return sanitized;
  }
  return buildPersistedOutputMessage(A);
}
//@ chunk-0m7em5b4.js:7909-8099 placement
function getHandbackTarget(reportContext) {
  if (reportContext.agentId === undefined) return;
  let h = reportContext.taskRegistry.get(reportContext.agentId);
  if (!isLocalAgent(h) || h.handbackContract !== true || h.handbackRecipient === undefined) return;
  return {
    recipient: h.handbackRecipient,
  };
}
//@ chunk-0m7em5b4.js:8099-8157 placement
/**
 * 取 agent 的展示名：agent 生命周期登记的名字优先，取不到时用 id。
 */
function agentDisplayName(reportContext, agentId) {
  return reportContext.agentLifecycle.nameOf(identityAgentId2(agentId)) ?? agentId;
}
//@ chunk-0m7em5b4.js:8188-8212 placement
var OBSERVERREPORT = "ObserverReport";
//@ chunk-0m7em5b4.js:8212-9170 placement
/**
 * ObserverReport 工具的提示词文本。
 */
var OBSERVER_REPORT_DESCRIPTION =
  "Send a report to your report target \u2014 the agent you observe, or the coordinating agent that spawned the worker you observe. The target is resolved from your observer pairing \u2014 there is no recipient to name. Use this only when you have something genuinely useful: a mistake about to compound, a missed constraint, prior art the observed agent should see. The expected steady state is silence \u2014 if nothing warrants action, end your turn without calling this.";
var OBSERVER_REPORT_PROMPT =
  "Send a report to your report target \u2014 the agent you observe, or the coordinating agent that spawned the worker you observe. The target is resolved from your observer pairing \u2014 there is no recipient to name. Use this only when you have something genuinely useful: a mistake about to compound, a missed constraint, prior art the observed agent should see. The expected steady state is silence \u2014 if nothing warrants action, end your turn without calling this.";
//@ chunk-0m7em5b4.js:9170-10922 placement
/**
 * ObserverReport 工具配置对象（report 入参、提示与结果大小上限）。
 */
var ObserverReportInputSchema = DoctorLazy(() =>
  zodStrictObject({
    report: string().min(1).describe("The report to deliver to your report target. Be concise and specific."),
  }),
);
var observerReportTool = buildTool({
  name: OBSERVERREPORT,
  backgrounding: "never",
  maxResultSizeChars: 1000,
  async description() {
    return OBSERVER_REPORT_DESCRIPTION;
  },
  async prompt() {
    return OBSERVER_REPORT_PROMPT;
  },
  get inputSchema() {
    return ObserverReportInputSchema();
  },
  isReadOnly() {
    return false;
  },
  isEnabled() {
    return true;
  },
  create(e) {
    return {
      async checkPermissions(updatedInput) {
        return {
          behavior: "allow",
          updatedInput,
        };
      },
      async call(h) {
        let agentId = e.agentId;
        if (agentId === undefined)
          return {
            data: {
              success: false,
              message:
                "ObserverReport is only available to an observer agent; the main session does not have an observed pairing.",
            },
          };
        let armedPairingByObserver = findArmedPairingByObserver(e.session, agentId);
        if (!armedPairingByObserver)
          return {
            data: {
              success: false,
              message:
                "Your observer pairing is not armed (stopped, retired, or never installed). The report was not delivered.",
            },
          };
        let { reportTargetTaskId, reportTargetName, viaWorkerName } = armedPairingByObserver;
        if (reportTargetTaskId !== undefined) {
          let r = e.taskRegistry.get(reportTargetTaskId);
          if (!(
            isLocalAgent(r) &&
            (r.status === "running" ||
              (r.status === "completed" && [...keepaliveReasons(r)].some((Q) => Q !== FLAG_IDLE_WINDOW)))
          ))
            return {
              data: {
                success: false,
                message: `The report target (${reportTargetName}) is not running. The report was not delivered.`,
              },
            };
        }
        let O = `observer:${armedPairingByObserver.observerAgentType}`;
        let F =
          armedPairingByObserver.observedTaskId === undefined
            ? `"${viaWorkerName}"`
            : `"${viaWorkerName}" [${armedPairingByObserver.observedTaskId}]`;
        let text = agentMessageTag(
          O,
          viaWorkerName === undefined
            ? h.report
            : `(observing worker ${F})
${h.report}`,
        );
        let Z = {
          kind: "observer",
          from: O,
          senderTaskId: agentId,
        };
        armedPairingByObserver.reportOrigins.add(Z);
        if (reportTargetTaskId === undefined)
          enqueueCommand({
            mode: "prompt",
            agentId: mainAgentId(),
            value: text,
            priority: "next",
            origin: Z,
            skipSlashCommands: true,
            isMeta: true,
            skipAttachments: true,
          });
        else
          queueAgentMessage(reportTargetTaskId, text, e.taskRegistry, {
            origin: Z,
            isMeta: true,
          });
        return {
          data: {
            success: true,
            message: `Report queued for ${reportTargetTaskId === undefined ? "the main conversation" : reportTargetName}.`,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      type: "tool_result",
      tool_use_id: toolUseId,
      content: e.message,
      is_error: !e.success,
    };
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
  observerReportTool,
  launchAgentsWithHooks,
  NO_OWN_WORKDIR_MESSAGE,
  ObserverReportTool,
  reportSenderIdentity,
};
