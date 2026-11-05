/**
 * tools/AgentTool/agentContainerResume.ts
 *
 * 2.1.316 新增：容器重启后续接被中断的代理调用（CutOffAgentCallError）、代理预算说明与流式输出开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tmsx2mh0.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { WebFetchDispatchApprovals } from "./agentSpawnPermissions.js";
import {
  isResumedInlineRunError,
  resumedInlineRunPriorCarriedMarkers,
  resumedInlineRunHandback,
  resumedInlineRunReviewTools,
  ResumeAgentStateError,
} from "./resumeAgent.js";
import { isAbortError, errorMessage, toError } from "../../utils/errors.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import {
  recoverFromSyncAgentError,
  buildAgentHandback,
  finalizeAgentTool,
  partialResultPreamble,
  prependHarnessNote,
} from "./agentToolUtils.js";
import { logError } from "../../utils/log.js";
import { agentTypeForAnalytics_GATE_EVALUATED } from "../../services/analytics/safeMetadata.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { isAutoModeQuerySource } from "../../services/api/requestHeaders.js";
import {
  getClientOrDefaultValue,
  resolveTotalTokensReminderMode,
  getCalmMochiScope,
} from "../../utils/attachments/totalTokensReminder.js";
import { env } from "../../utils/env.js";
import { effortLevelForModel } from "./subagentSpawn.js";
import { getMainLoopEffortState } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-tmsx2mh0.js:15894-15978 placement
/**
 * 该 tool_use 是否登记为免审 web-fetch 派发（之后 runAgent 以 dontAsk 运行）。
 */
function isUnreviewedWebFetchDispatch({ toolUseId, toolState }) {
  return toolUseId !== undefined && toolState.get(WebFetchDispatchApprovals).take(toolUseId, []) === true;
}
//@ chunk-tmsx2mh0.js:15978-16059 placement
/**
 * CutOffAgentCallError：容器重启后旧的 Agent 调用无法恢复。
 */
class CutOffAgentCallError extends Error {
  constructor(message) {
    super(message);
    this.name = "CutOffAgentCallError";
  }
}
//@ chunk-tmsx2mh0.js:16059-16248 placement
/**
 * 容器重启恢复登记表：toolUseId → {agentId, resume}，Agent 调用重放时取出并恢复。
 */
class ResumedAgentCallRegistry {
  #e = new Map();
  adopt(toolUseId, agentId, resume) {
    this.#e.set(toolUseId, {
      agentId,
      resume,
    });
  }
  take(toolUseId) {
    let entry = toolUseId === undefined ? undefined : this.#e.get(toolUseId);
    if (toolUseId !== undefined && entry !== undefined)
      this.#e.set(toolUseId, {
        ...entry,
        resume: undefined,
      });
    return entry;
  }
}
//@ chunk-tmsx2mh0.js:16248-18294 placement
/**
 * 容器重启后处理被截断的 Agent 调用：调用 resume，按结果返回 completed 报告、async_launched，或抛 CutOffAgentCallError。
 */
async function resolveResumedAgentCall({ agentId, resume }, toolUseContext) {
  if (resume === undefined)
    throw new CutOffAgentCallError(
      `This call stood for agent ${agentId}, which stopped when the container was restarted. This call does not resume it and launched nothing. Send agent ${agentId} a message, or launch a new agent, if you still need the work.`,
    );
  let resumeOutcome;
  try {
    resumeOutcome = await resume(toolUseContext);
  } catch (error) {
    if (toolUseContext.abortController.signal.aborted) throw error;
    if (isResumedInlineRunError(error)) {
      let cutOffMessage = `The container was restarted and agent ${agentId} was resumed. ${isAbortError(error) ? `Agent ${agentId} was stopped before it finished` : `Agent ${agentId} failed while running: ${errorMessage(error)}`}`;
      let agentTask = toolUseContext.taskRegistry.get(agentId);
      if (!isLocalAgent(agentTask)) throw new CutOffAgentCallError(cutOffMessage);
      let messages = toolUseContext.taskRegistry.getTranscript(agentId)?.messages ?? [];
      let recoveredRun;
      try {
        recoveredRun = recoverFromSyncAgentError(toError(error), messages);
      } catch (error_2) {
        if (error_2 !== error) logError(error_2);
        throw new CutOffAgentCallError(cutOffMessage);
      }
      return {
        status: "completed",
        report: await buildAgentHandback(
          finalizeAgentTool(
            recoveredRun.history.filter(
              (message) => message.type !== "assistant" || !message.isApiErrorMessage,
            ),
            agentId,
            {
              prompt: agentTask.prompt,
              resolvedAgentModel: agentTask.model ?? "",
              startTime: agentTask.startTime,
              agentType: agentTask.agentType,
              callerCanContinueAgents: agentTask.ownerCanContinueAgents,
              persistedToolResultFiles: agentTask.webFetchSavedFiles,
              priorCarriedMarkers: resumedInlineRunPriorCarriedMarkers(error),
              isBuiltInAgent: false,
              isAsync: true,
              agentDepth: agentTask.spawnDepth ?? 1,
            },
            {
              suppressTelemetry: true,
              handback: resumedInlineRunHandback(error, agentId),
            },
          ),
          {
            agentId,
            agentMessages: messages,
            agentType: agentTypeForAnalytics_GATE_EVALUATED(agentTask.agentType, false),
            child: "agent",
            cutoffNote: partialResultPreamble(cutOffMessage),
            tools: resumedInlineRunReviewTools(error, agentId) ?? toolUseContext.options.tools,
            toolUseContext,
          },
        ),
      };
    }
    if (error instanceof ResumeAgentStateError)
      throw new CutOffAgentCallError(
        `Agent ${agentId} stopped when the container was restarted and was not resumed: ${error.message}`,
      );
    throw error;
  }
  if (resumeOutcome.deniedByPlugin !== undefined)
    throw new CutOffAgentCallError(
      `Agent ${agentId} stopped when the container was restarted and was not resumed: ${resumeOutcome.deniedByPlugin}`,
    );
  if (resumeOutcome.movedRunEnded !== undefined)
    return {
      status: "async_launched",
      agentId,
      description: resumeOutcome.description,
      outputFile: resumeOutcome.outputFile ?? "",
    };
  let agentTask = toolUseContext.taskRegistry.get(agentId);
  let agentResult = isLocalAgent(agentTask) ? agentTask.result : undefined;
  if (agentResult === undefined)
    throw new CutOffAgentCallError(
      resumeOutcome.alreadyCompleted
        ? `Agent ${agentId} had finished when the container was restarted, but its report was lost with the restart. It was not run again. Send it a message to ask for its report.`
        : `Agent ${agentId} was resumed after the container was restarted and ended without a report.`,
    );
  return {
    status: "completed",
    report: prependHarnessNote(agentResult, toolUseContext),
  };
}
//@ chunk-tmsx2mh0.js:18294-18599 placement
/**
 * restoreTransientForRemap：重映射结果时保留 canContinueAgent（任一为 false 即 false）。
 */
function restoreCanContinueAgent(previousResult, nextResult) {
  if (
    previousResult === null ||
    typeof previousResult !== "object" ||
    nextResult === null ||
    typeof nextResult !== "object" ||
    nextResult.status === "remote_launched"
  )
    return nextResult;
  let canContinueAgent = false;
  switch (previousResult.status) {
    case "completed":
    case "async_launched":
      canContinueAgent = previousResult.canContinueAgent;
      break;
    case "remote_launched":
      break;
  }
  return {
    ...nextResult,
    canContinueAgent:
      canContinueAgent === false || nextResult.canContinueAgent === false ? false : canContinueAgent,
  };
}
//@ chunk-tmsx2mh0.js:18599-19002 placement
/**
 * 子代理 token 预算说明的三种措辞（none/forks/all）。
 */
var SUBAGENT_BUDGET_NOTES = {
  none: "Each fresh agent you launch has a budget of {N} tokens, counting the context it starts with.",
  forks:
    "Each agent you launch has a budget of {N} tokens. For a fork, the budget does not count the context it starts with.",
  all: "Each agent you launch has a budget of {N} tokens. The budget does not count the context the agent starts with: its system prompt, its tools, and your prompt to it.",
};
//@ chunk-tmsx2mh0.js:19002-19434 placement
/**
 * 子代理 token 预算说明（tengu_streamed_bumblebee 开关、CLAUDE_CODE_STREAMED_BUMBLEBEE[_TEXT]），拼入 Agent 工具提示词；coordinator 模式不加。
 */
function getSubagentBudgetNote(querySource) {
  if (isCoordinatorMode_2() || isAutoModeQuerySource(querySource)) return;
  if (getClientOrDefaultValue("tengu_streamed_bumblebee", env.CLAUDE_CODE_STREAMED_BUMBLEBEE) !== true)
    return;
  let totalTokensReminderMode = resolveTotalTokensReminderMode(
    effortLevelForModel(getMainLoopEffortState()),
    undefined,
  );
  if (totalTokensReminderMode === undefined) return;
  let clientOrDefaultValue = getClientOrDefaultValue(
    "tengu_streamed_bumblebee_text",
    env.CLAUDE_CODE_STREAMED_BUMBLEBEE_TEXT,
  );
  let hasConfiguredWording = typeof clientOrDefaultValue === "string" && clientOrDefaultValue.trim() !== "";
  let template = hasConfiguredWording
    ? clientOrDefaultValue.trim()
    : SUBAGENT_BUDGET_NOTES[getCalmMochiScope()];
  logEvent("tengu_streamed_bumblebee_applied", {
    budget: totalTokensReminderMode,
    isConfiguredWording: hasConfiguredWording,
  });
  return template.replaceAll("{N}", totalTokensReminderMode.toLocaleString("en-US"));
}
export {
  ResumedAgentCallRegistry,
  resolveResumedAgentCall,
  isUnreviewedWebFetchDispatch,
  getSubagentBudgetNote,
  restoreCanContinueAgent,
};
