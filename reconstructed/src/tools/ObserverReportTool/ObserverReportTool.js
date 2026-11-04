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
import {
  objectSchema,
  stringSchema,
  booleanSchema,
  zodStrictObject,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0m7em5b4.js:3368-3392 placement
var launchAgentsWithHooks = (request) => runAgentSpawnHooks(request, eventCallersFor);
//@ chunk-0m7em5b4.js:3392-3475 placement
var NO_OWN_WORKDIR_MESSAGE = "a working directory of its own is unavailable in a session without a disk";
//@ chunk-0m7em5b4.js:3475-3624 placement
function parseAgentIdArg(cwdArg) {
  if (cwdArg === undefined || cwdArg === null) return;
  if (typeof cwdArg !== "string" || cwdArg.trim() === "") return "cwd must be a string holding a path";
  return isDiskless() ? NO_OWN_WORKDIR_MESSAGE : undefined;
}
//@ chunk-0m7em5b4.js:3820-4006 placement
function reportSenderIdentity(agentId, agentName, task) {
  if (agentName !== undefined)
    return {
      from: agentName,
      displayName: agentName,
    };
  if (isInProcessTeammateTask(task))
    return {
      from: task.identity.agentName,
      displayName: task.identity.agentName,
    };
  return {
    from: agentId,
    displayName: isLocalAgent(task) ? task.agentType : agentId,
  };
}
//@ chunk-0m7em5b4.js:4006-4121 placement
var observerReportInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var observerReportOutputSchema;
deferInit("chunk-0m7em5b4.js:4006", () => {
  observerReportInputSchema = DoctorLazy(() =>
    objectSchema({
      message: stringSchema().describe("Your full report for your caller"),
    }),
  );
  observerReportOutputSchema = DoctorLazy(() =>
    objectSchema({
      success: booleanSchema(),
      message: stringSchema(),
    }),
  );
});
//@ chunk-0m7em5b4.js:4121-4576 placement
/**
 * 为观察者报告工具构建调用上下文：以 getter 代理会话、存储、代理 id、任务注册表、生命周期、消息队列与消息等字段。
 */
function createReportContext(baseContext, callOptions) {
  return {
    get session() {
      return baseContext.session;
    },
    get storageV5() {
      return baseContext.storageV5;
    },
    get agentId() {
      return baseContext.agentId;
    },
    get taskRegistry() {
      return baseContext.taskRegistry;
    },
    get agentLifecycle() {
      return baseContext.agentLifecycle;
    },
    get messageQueue() {
      return baseContext.messageQueue;
    },
    get messages() {
      return baseContext.messages;
    },
    get hookCaller() {
      return baseContext.hookCaller;
    },
    get hookServesModel() {
      return baseContext.hookServesModel;
    },
    get pluginUnnamed() {
      return baseContext.pluginUnnamed;
    },
    get toolUseId() {
      return callOptions.toolUseId;
    },
  };
}
//@ chunk-0m7em5b4.js:4576-7501 placement
/**
 * ObserverReport 工具（2.1.316 新增）：观察者代理把最终报告送回其报告目标（被观察的代理），超长报告先落盘再给路径。
 */
var ObserverReportTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0m7em5b4.js:4576", () => {
  ObserverReportTool = buildTool({
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
    toAutoClassifierInput(input) {
      return `${SUBAGENT_HANDBACK_DESCRIPTION}: ${input.message}`;
    },
    create(toolContext) {
      return {
        async validateInput(input) {
          if (input.message.trim().length === 0)
            return {
              result: false,
              message: "message must not be empty",
              errorCode: 9,
            };
          return {
            result: true,
          };
        },
        async call(input, callOptions) {
          let reportContext = createReportContext(toolContext, callOptions);
          let agentId = reportContext.agentId;
          let classifierBlock = takeClassifierBlock(reportContext.toolUseId);
          let isFlagged = classifierBlock !== undefined && classifierBlock.kind !== "unavailable";
          if (isFlagged && agentId !== undefined) flagAgentContract(agentId);
          let handbackTarget = getHandbackTarget(reportContext);
          if (agentId === undefined || handbackTarget === undefined)
            return {
              data: {
                success: false,
                message: `Nothing was sent: ${SUBAGENTHANDBACK} is not active for this agent. Write your report as plain text instead.`,
              },
            };
          let refusedResult = {
            data: {
              success: false,
              message: `Nothing was sent: your report was already delivered (${SUBAGENTHANDBACK} delivers one report). ${isSendMessageUnavailable() ? "Stop now." : `Use ${SENDMESSAGE} for anything further, then stop.`}`,
            },
          };
          if (handbackForRecipient(agentId, handbackTarget.recipient) !== undefined) return refusedResult;
          let senderName = agentDisplayName(reportContext, agentId);
          let shortSenderName = clipTeammateText(
            reportSenderIdentity(
              agentId,
              reportContext.agentLifecycle.nameOf(identityAgentId2(agentId)),
              reportContext.taskRegistry.get(agentId),
            ).displayName,
          );
          let sanitized = sanitizeSubagentOutput(input.message).sanitized;
          let reportBody = handbackReportText(await spillLongReport(sanitized, reportContext));
          let warningText = classifierBlock === undefined ? undefined : describeReportBlock(classifierBlock);
          let reportWithWarning =
            warningText === undefined
              ? reportBody
              : `${indentLines(warningText)}
${reportBody}`;
          let normalizedBody = normalizeAgentMessageBody(reportWithWarning);
          let handbackReport = parseHandbackReport(normalizedBody);
          let origin = {
            kind: "peer",
            from: senderName,
            senderTaskId: agentId,
            ...(shortSenderName && {
              name: shortSenderName,
            }),
            body: normalizedBody,
            handback: true,
            ...(reportContext.hookCaller !== undefined &&
              !reportContext.hookServesModel && {
                plugin: reportContext.hookCaller,
              }),
            ...(isFlagged && {
              flagged: true,
            }),
            ...(handbackReport?.note !== undefined && {
              handbackNote: handbackReport.note,
            }),
            ...(handbackReport !== undefined && {
              handbackReportText: handbackReport.report,
            }),
          };
          let senderTask = reportContext.taskRegistry.get(agentId);
          let recipient =
            isLocalAgent(senderTask) &&
            senderTask.isBackgrounded &&
            !shouldNotifyTeammateLifecycle(handbackTarget.recipient, reportContext.taskRegistry)
              ? mainAgentId()
              : handbackTarget.recipient;
          if (recipient !== handbackTarget.recipient)
            reportContext.taskRegistry.update(agentId, (task) => ({
              ...task,
              handbackRecipient: recipient,
            }));
          if (handbackForRecipient(agentId, recipient) !== undefined) return refusedResult;
          let taggedMessage = agentMessageTag(senderName, reportWithWarning);
          let toolsUsed = toolsUsedForSummary(reportContext.messages());
          let toolsUsedMeta =
            toolsUsed.length > 0
              ? {
                  toolsUsed,
                }
              : {};
          if (recipient === mainAgentId()) {
            let enqueue = () =>
              reportContext.messageQueue.enqueueReportingAdmission({
                mode: "prompt",
                agentId: mainAgentId(),
                value: taggedMessage,
                priority: "next",
                origin,
                skipSlashCommands: true,
                isMeta: true,
                skipAttachments: true,
                ...toolsUsedMeta,
              });
            if (shouldHoldForPlugin(reportContext)) {
              noteHandback({
                sender: agentId,
                recipient,
                senderName,
                flagged: isFlagged,
              });
              let deliverWhenReleased = () => {
                if (shouldHoldForPlugin(reportContext)) return holdQueuedInput(deliverWhenReleased);
                let hadHandback = hasHandbackFrom(agentId);
                enqueue();
                if (!hadHandback) forgetHandback(agentId);
              };
              holdQueuedInput(deliverWhenReleased);
            } else if (!enqueue().admitted)
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
            sendMessageToAgent(handbackTarget.recipient, taggedMessage, reportContext.taskRegistry, {
              origin,
              isMeta: true,
              ...toolsUsedMeta,
            });
          }
          reportContext.taskRegistry.update(agentId, (task) => ({
            ...task,
            handbackReport: {
              text: normalizeAgentMessageBody(
                sanitizeSubagentOutput(input.message, {
                  prependMarker: false,
                }).sanitized,
              ),
              ...(warningText !== undefined && {
                warning: normalizeAgentMessageBody(warningText),
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
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: [
          {
            type: "text",
            text: jsonStringify(result),
          },
        ],
      };
    },
    renderToolUseMessage() {
      return null;
    },
  });
});
//@ chunk-0m7em5b4.js:7501-7683 placement
function describeReportBlock(block) {
  switch (block.kind) {
    case "blocked":
      return blockedReportWarning(block.reason);
    case "refused":
      return block.switchedOff ? buildUnreviewedSubagentWarning("report") : UNREVIEWED_REPORT_WARNING;
    case "unavailable":
      return buildSubagentClassifierUnavailableNote(block.model, block.httpStatus, block.errorKind);
  }
}
//@ chunk-0m7em5b4.js:7683-7909 placement
async function spillLongReport(content, reportContext) {
  let maxChars = getPersistenceThreshold(AGENT, MAX_AGENT_OUTPUT_TOKENS);
  if (content.length <= maxChars) return content;
  let persisted = await persistToolResult(
    content,
    reportContext.toolUseId ?? `${SUBAGENTHANDBACK}-${randomUUID()}`,
    toolResultsDirFor_2(reportContext.session),
    reportContext.storageV5,
  );
  if (isPersistError(persisted)) {
    if (toolResultStore(reportContext.session) !== undefined)
      return buildTruncatedInlineResult(content, maxChars)?.message ?? content;
    return content;
  }
  return buildPersistedOutputMessage(persisted);
}
//@ chunk-0m7em5b4.js:7909-8099 placement
function getHandbackTarget(reportContext) {
  if (reportContext.agentId === undefined) return;
  let task = reportContext.taskRegistry.get(reportContext.agentId);
  if (!isLocalAgent(task) || task.handbackContract !== true || task.handbackRecipient === undefined) return;
  return {
    recipient: task.handbackRecipient,
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
var ObserverReportInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var observerReportTool;
deferInit("chunk-0m7em5b4.js:9170", () => {
  ObserverReportInputSchema = DoctorLazy(() =>
    zodStrictObject({
      report: stringSchema()
        .min(1)
        .describe("The report to deliver to your report target. Be concise and specific."),
    }),
  );
  observerReportTool = buildTool({
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
    create(toolContext) {
      return {
        async checkPermissions(updatedInput) {
          return {
            behavior: "allow",
            updatedInput,
          };
        },
        async call(input) {
          let agentId = toolContext.agentId;
          if (agentId === undefined)
            return {
              data: {
                success: false,
                message:
                  "ObserverReport is only available to an observer agent; the main session does not have an observed pairing.",
              },
            };
          let armedPairingByObserver = findArmedPairingByObserver(toolContext.session, agentId);
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
            let task = toolContext.taskRegistry.get(reportTargetTaskId);
            if (!(
              isLocalAgent(task) &&
              (task.status === "running" ||
                (task.status === "completed" &&
                  [...keepaliveReasons(task)].some(
                    (keepaliveReason) => keepaliveReason !== FLAG_IDLE_WINDOW,
                  )))
            ))
              return {
                data: {
                  success: false,
                  message: `The report target (${reportTargetName}) is not running. The report was not delivered.`,
                },
              };
          }
          let senderAgentTag = `observer:${armedPairingByObserver.observerAgentType}`;
          let workerLabel =
            armedPairingByObserver.observedTaskId === undefined
              ? `"${viaWorkerName}"`
              : `"${viaWorkerName}" [${armedPairingByObserver.observedTaskId}]`;
          let text = agentMessageTag(
            senderAgentTag,
            viaWorkerName === undefined
              ? input.report
              : `(observing worker ${workerLabel})
${input.report}`,
          );
          let origin = {
            kind: "observer",
            from: senderAgentTag,
            senderTaskId: agentId,
          };
          armedPairingByObserver.reportOrigins.add(origin);
          if (reportTargetTaskId === undefined)
            enqueueCommand({
              mode: "prompt",
              agentId: mainAgentId(),
              value: text,
              priority: "next",
              origin,
              skipSlashCommands: true,
              isMeta: true,
              skipAttachments: true,
            });
          else
            queueAgentMessage(reportTargetTaskId, text, toolContext.taskRegistry, {
              origin,
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
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      return {
        type: "tool_result",
        tool_use_id: toolUseId,
        content: result.message,
        is_error: !result.success,
      };
    },
    renderToolUseMessage(input) {
      return `report: ${input.report}`;
    },
  });
});
//@ chunk-0m7em5b4.js:10922-10958 placement
var OBSERVER_EXCLUDED_TOOLS; // deferred: uses SENDMESSAGE (../SendMessageTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0m7em5b4.js:10922", () => {
  OBSERVER_EXCLUDED_TOOLS = [
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
});
export {
  parseAgentIdArg,
  OBSERVER_EXCLUDED_TOOLS,
  observerReportTool,
  launchAgentsWithHooks,
  NO_OWN_WORKDIR_MESSAGE,
  ObserverReportTool,
  reportSenderIdentity,
};
