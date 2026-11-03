/**
 * tools/AgentTool/agentContainerResume.ts
 *
 * 2.1.316 新增：容器重启后续接被中断的代理调用（CutOffAgentCallError）、代理预算说明与流式输出开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0tkmvwy0.js (7)
 * attribution: placement 7
 */
import { WebFetchDispatchApprovals } from "./agentSpawnPermissions.js";
import {
  isResumedInlineRunError,
  resumedInlineRunHadPriorForeignContent,
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
  Gpn,
  resolveTotalTokensReminderMode,
  getCalmMochiScope,
} from "../../utils/attachments/totalTokensReminder.js";
import { env } from "../../utils/env.js";
import { uLr } from "./subagentSpawn.js";
import { getMainLoopEffortState } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";

/**
 * 该 tool_use 是否登记为免审 web-fetch 派发（之后 runAgent 以 dontAsk 运行）。
 */
//@ chunk-0tkmvwy0.js:7955-8039 placement
function isUnreviewedWebFetchDispatch({ toolUseId: toolUseId, toolState: toolState }) {
  return toolUseId !== void 0 && toolState.get(WebFetchDispatchApprovals).take(toolUseId, []) === !0;
}
/**
 * CutOffAgentCallError：容器重启后旧的 Agent 调用无法恢复。
 */
//@ chunk-0tkmvwy0.js:8039-8120 placement
class CutOffAgentCallError extends Error {
  constructor(n) {
    super(n);
    this.name = "CutOffAgentCallError";
  }
}
/**
 * 容器重启恢复登记表：toolUseId → {agentId, resume}，Agent 调用重放时取出并恢复。
 */
//@ chunk-0tkmvwy0.js:8120-8309 placement
class ResumedAgentCallRegistry {
  #e = new Map();
  adopt(n, e, s) {
    this.#e.set(n, { agentId: e, resume: s });
  }
  take(n) {
    let e = n === void 0 ? void 0 : this.#e.get(n);
    if (n !== void 0 && e !== void 0) this.#e.set(n, { ...e, resume: void 0 });
    return e;
  }
}
/**
 * 容器重启后处理被截断的 Agent 调用：调用 resume，按结果返回 completed 报告、async_launched，或抛 CutOffAgentCallError。
 */
//@ chunk-0tkmvwy0.js:8309-10369 placement
async function resolveResumedAgentCall({ agentId: agentId, resume: resume }, s) {
  if (resume === void 0)
    throw new CutOffAgentCallError(
      `This call stood for agent ${agentId}, which stopped when the container was restarted. This call does not resume it and launched nothing. Send agent ${agentId} a message, or launch a new agent, if you still need the work.`,
    );
  let f;
  try {
    f = await resume(s);
  } catch (error) {
    if (s.abortController.signal.aborted) throw error;
    if (isResumedInlineRunError(error)) {
      let I = `The container was restarted and agent ${agentId} was resumed. ${isAbortError(error) ? `Agent ${agentId} was stopped before it finished` : `Agent ${agentId} failed while running: ${errorMessage(error)}`}`,
        Y = s.taskRegistry.get(agentId);
      if (!isLocalAgent(Y)) throw new CutOffAgentCallError(I);
      let C = s.taskRegistry.getTranscript(agentId)?.messages ?? [],
        we;
      try {
        we = recoverFromSyncAgentError(toError(error), C);
      } catch (error_2) {
        if (error_2 !== error) logError(error_2);
        throw new CutOffAgentCallError(I);
      }
      return {
        status: "completed",
        report: await buildAgentHandback(
          finalizeAgentTool(
            we.history.filter((be) => be.type !== "assistant" || !be.isApiErrorMessage),
            agentId,
            {
              prompt: Y.prompt,
              resolvedAgentModel: Y.model ?? "",
              startTime: Y.startTime,
              agentType: Y.agentType,
              callerCanContinueAgents: Y.ownerCanContinueAgents,
              persistedToolResultFiles: Y.webFetchSavedFiles,
              priorForeignArtifactContent: resumedInlineRunHadPriorForeignContent(error),
              isBuiltInAgent: !1,
              isAsync: !0,
              agentDepth: Y.spawnDepth ?? 1,
            },
            { suppressTelemetry: !0, handback: resumedInlineRunHandback(error, agentId) },
          ),
          {
            agentId: agentId,
            agentMessages: C,
            agentType: agentTypeForAnalytics_GATE_EVALUATED(Y.agentType, !1),
            child: "agent",
            cutoffNote: partialResultPreamble(I),
            tools: resumedInlineRunReviewTools(error, agentId) ?? s.options.tools,
            toolUseContext: s,
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
  if (f.deniedByPlugin !== void 0)
    throw new CutOffAgentCallError(
      `Agent ${agentId} stopped when the container was restarted and was not resumed: ${f.deniedByPlugin}`,
    );
  if (f.movedRunEnded !== void 0)
    return {
      status: "async_launched",
      agentId: agentId,
      description: f.description,
      outputFile: f.outputFile ?? "",
    };
  let y = s.taskRegistry.get(agentId),
    _ = isLocalAgent(y) ? y.result : void 0;
  if (_ === void 0)
    throw new CutOffAgentCallError(
      f.alreadyCompleted
        ? `Agent ${agentId} had finished when the container was restarted, but its report was lost with the restart. It was not run again. Send it a message to ask for its report.`
        : `Agent ${agentId} was resumed after the container was restarted and ended without a report.`,
    );
  return { status: "completed", report: prependHarnessNote(_, s) };
}
/**
 * restoreTransientForRemap：重映射结果时保留 canContinueAgent（任一为 false 即 false）。
 */
//@ chunk-0tkmvwy0.js:10369-10674 placement
function restoreCanContinueAgent(previousResult, nextResult) {
  if (
    previousResult === null ||
    typeof previousResult !== "object" ||
    nextResult === null ||
    typeof nextResult !== "object" ||
    nextResult.status === "remote_launched"
  )
    return nextResult;
  let s = !1;
  switch (previousResult.status) {
    case "completed":
    case "async_launched":
      s = previousResult.canContinueAgent;
      break;
    case "remote_launched":
      break;
  }
  return { ...nextResult, canContinueAgent: s === !1 || nextResult.canContinueAgent === !1 ? !1 : s };
}
/**
 * 子代理 token 预算说明的三种措辞（none/forks/all）。
 */
//@ chunk-0tkmvwy0.js:10674-11077 placement
var SUBAGENT_BUDGET_NOTES = {
  none: "Each fresh agent you launch has a budget of {N} tokens, counting the context it starts with.",
  forks:
    "Each agent you launch has a budget of {N} tokens. For a fork, the budget does not count the context it starts with.",
  all: "Each agent you launch has a budget of {N} tokens. The budget does not count the context the agent starts with: its system prompt, its tools, and your prompt to it.",
};
/**
 * 子代理 token 预算说明（tengu_streamed_bumblebee 开关、CLAUDE_CODE_STREAMED_BUMBLEBEE[_TEXT]），拼入 Agent 工具提示词；coordinator 模式不加。
 */
//@ chunk-0tkmvwy0.js:11077-11509 placement
function getSubagentBudgetNote(querySource) {
  if (isCoordinatorMode_2() || isAutoModeQuerySource(querySource)) return;
  if (Gpn("tengu_streamed_bumblebee", env.CLAUDE_CODE_STREAMED_BUMBLEBEE) !== !0) return;
  let e = resolveTotalTokensReminderMode(uLr(getMainLoopEffortState()), void 0);
  if (e === void 0) return;
  let s = Gpn("tengu_streamed_bumblebee_text", env.CLAUDE_CODE_STREAMED_BUMBLEBEE_TEXT),
    f = typeof s === "string" && s.trim() !== "",
    y = f ? s.trim() : SUBAGENT_BUDGET_NOTES[getCalmMochiScope()];
  return (
    logEvent("tengu_streamed_bumblebee_applied", { budget: e, isConfiguredWording: f }),
    y.replaceAll("{N}", e.toLocaleString("en-US"))
  );
}

export {
  ResumedAgentCallRegistry,
  resolveResumedAgentCall,
  isUnreviewedWebFetchDispatch,
  getSubagentBudgetNote,
  restoreCanContinueAgent,
};
