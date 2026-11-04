/**
 * services/workflow/agentCall.ts
 *
 * 2.1.316 新增：工作流脚本中的 agent 调用（含上限与预算）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (11)
 * attribution: placement 11
 */
import { availableParallelism } from "os";
import { AsyncLocalStorage } from "async_hooks";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  fromEnum,
  agentTypeForAnalyticsFromDefinition,
  fromEnumOpt,
  lit,
} from "../analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
import { jsonStringify, clone } from "../../utils/slowOperations.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { SUBAGENTHANDBACK, AGENT, TASK } from "../../tools/AgentTool/constants.js";
import {
  STRUCTUREDOUTPUT,
  MAX_SCHEMA_NODES_2,
  createSyntheticOutputTool,
} from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  WORKFLOW_SUBAGENT_TYPE,
  WORKFLOW_TOOL_NAME,
  WORKFLOW_JOURNAL_HOST_COPY_FLAG,
  WORKFLOW_TRANSCRIPT_SUBDIR,
} from "../../tools/WorkflowTool/constants.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import {
  childCallKey,
  agentCallKey,
  hashReplacedContent,
  isArbiterStructuredOutputReviewOn,
} from "./journalEntries.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { readableToolName, UNREADABLE_TOOLS_USED_BEFORE_SUMMARY } from "../../bootstrap/stateSlices.js";
import { getConversationToolsUsed, isDiskless } from "../../bootstrap/state.js";
import { ARTIFACT_CONTENT_AUTHORED_TAG } from "../../constants/xml.js";
import {
  relayedWorkflowPreamble,
  containsUntrustedArtifactContent,
  isSillyShoreGateOn,
} from "../../utils/messages/untrustedArtifactContent.js";
import { truncateMiddle } from "../../memdir/memoryTool.js";
import {
  UsageLimitWaiter,
  isSerializedArbiter,
  currentWarmupGate,
  prefixStaggerMs,
} from "./usageLimitWait.js";
import { limitConcurrency } from "../../utils/concurrencyLimit.js";
import {
  createAgentWorktree,
  hasWorktreeChanges,
  removeAgentWorktree,
  unlockAgentWorktree,
} from "../../utils/worktree.js";
import { getCwd, runWithCwdOverride, resolveFromCwd } from "../../utils/cwd.js";
import { getBranch, isBranchOnOrigin } from "../../utils/git.js";
import { formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { logEvent } from "../analytics/index.js";
import { resolveContextPrimaryModel, toolMatchesName } from "../../Tool.js";
import { getWorkflowSubagentModel } from "../workflows/workflowSubagentModel.js";
import { getDefaultSubagentModel, getAgentModel, getExploreAgentModel } from "../../utils/model/agent.js";
import { sealPrototype } from "./scriptSandbox.js";
import { describeLogArg, describeThrownValue } from "../../plugins/functionHooks/vm/vmRealm.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
  getEffortValue,
} from "../../utils/permissions/toolPermissionContext.js";
import {
  MAX_UNREVIEWED_SCHEMA_CHARS,
  isSchemaTooLargeToSkipReview,
  MAX_UNREVIEWED_SCHEMA_CHARS_2,
  AUTO_MODE_CLASSIFIER_OFF_MESSAGE,
  reviewWorkflowAgentDispatch,
  getAsyncAgentStallTimeoutMs,
  resolveAgentTools,
  flattenToolNameList,
  probeAgentToolPool,
  rebaseHookOriginForAgent,
  adoptSubagentPublishArmsAsync,
  truncateClassifierReason,
  isApiErrorDisplayMessage,
  classifyHandoffIfNeeded,
} from "../../tools/AgentTool/agentToolUtils.js";
import { isEvalBuild } from "../../utils/envUtils.js";
import { getProjectsRoleTelemetry } from "../../utils/permissions/actionSummary.js";
import { isClassifierSideCallRetired } from "../../utils/permissions/serverClassifier/flags.js";
import { logError } from "../../utils/log.js";
import { WorkflowJournalStub } from "./localFileJournal.js";
import { isUntrustedObject } from "../../utils/untrustedValues.js";
import { hostCopy, snapshotArrayAcrossVm } from "../../plugins/functionHooks/vm/boundaryCopy.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { uniq, count } from "../../utils/collections.js";
import {
  permissionRuleValueFromString,
  canonicalToolName,
} from "../../utils/permissions/permissionRuleParser.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { sleep } from "../../utils/sleep.js";
import {
  truncateProgressFields,
  withSystemPromptSuffix,
  abortStalled,
  structuredOutputUnjudgedWarning,
  judgeStructuredOutputVerdict,
} from "./runScript.js";
import { runAgentSpawnHooks, getDefaultSubagentEffort } from "../../tools/AgentTool/subagentSpawn.js";
import { isMainAgent, getAgentDepth } from "../../utils/agentContext.js";
import { eventCallersFor } from "../../plugins/functionHooks/eventCatalog.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  isPromptProvenanceEnabled,
  classifyWorkflowRequestSource,
  userRequestFraming,
  automatedTriggerFramingWithContext,
  withHarnessFraming,
  flattenForFraming,
  emptyWorkflowToolUseTracker,
  describeWorkflowStep,
  settleWorkflowToolUse,
} from "../workflows/harnessFraming.js";
import {
  filterDispatchableAgents,
  findDenyRuleWithContent,
  isAgentToolPoolDenied,
  agentToolPoolDeniedMessage,
  parseWildcardAgentTypes,
  buildDisallowedToolsFilter,
  hasLeftProactivityBaseline,
} from "../../utils/permissions/permissions.js";
import { checkSchemaSatisfiable } from "../../tools/SyntheticOutputTool/schemaCheck.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { parseEffortValue } from "../../utils/effort.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  waitForCoordinatorSubagentMcpServers,
  excludeCoordinatorCommsMcpTools,
} from "../../coordinator/coordinatorMcpServers.js";
import { isMcpTool } from "../mcp/utils.js";
import { bridgeToolsOf } from "../../bridge/bridgePermissionResponse.js";
import { memoryModeForSession } from "../accountMemory/memoryContext.js";
import { filterToolsByDenyRules } from "../../utils/permissions/filterToolsByDenyRules.js";
import { GlobTool } from "../../tools/GlobTool/GlobTool.js";
import { GrepTool } from "../../tools/GrepTool/GrepTool.js";
import { enabledToolsForAliases } from "../tools/batchTools.js";
import { hasEmbeddedSearchTools } from "../../utils/embeddedTools.js";
import { mcpInfoFromString, getToolNameForPermissionCheck } from "../mcp/mcpStringUtils.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { isWebFetchAgent, webFetchHarnessNote } from "../../tools/WebFetchTool/harnessNotes.js";
import { makeSaltedName } from "../../utils/agentId.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { isBuiltInAgent } from "../../tools/AgentTool/loadAgentsDir.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { setMonotonicTimeout, unwrapAbortReason } from "../../utils/abortController.js";
import { MAX_STRUCTURED_OUTPUT_RETRIES, extractToolErrorExcerpt } from "../../cli/structuredOutputRetry.js";
import { defaultToolResultsStorage } from "../../utils/mcpOutputStorage.js";
import { runAgent } from "../../tools/AgentTool/runAgent.js";
import {
  createUserMessage,
  extractTextContent_2,
  isForeignModelMessage,
  buildSubagentClassifierUnavailableNote,
} from "../../utils/messages.js";
import { getQuerySourceForAgent } from "../../utils/promptCategory.js";
import { createSubagentHandbackTool } from "./reportTool.js";
import {
  sanitizeSubagentOutput,
  sanitizeStructuredOutput,
  flaggedOutputNotice,
} from "../../utils/subagentOutputScan.js";
import { toolsUsedForSummary } from "../../utils/agentListing.js";
import { agentContract, flagAgentContract } from "../../tools/AgentTool/handbackReport.js";
import { finalContextTokensFromLastResponse } from "../../cli/print.js";
import { getTokenCountFromUsage } from "../../utils/tokens.js";
import { EMPTY_USAGE } from "../api/emptyUsage.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { USAGE_LIMIT_SUFFIX } from "../../utils/usageLimitText.js";
import { buildVerifiedHumanTurns } from "../../utils/messages/apiNormalization.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { connectionSetupFacts } from "../api/responseDiagnostics.js";
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
import { teleportToRemote, awaitRemoteSessionResult } from "../../utils/teleport.js";
import { WORKFLOW_REMOTE_AGENT } from "../../bridge/sessionOrigins.js";
import { resolveProactivityOptions } from "../../utils/proactivityLevel.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { addToTotalSessionCost } from "../../cost-tracker.js";
import { archiveRemoteSession } from "../../utils/teleport/api.js";
import { deferInit, beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ./runScript.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/services/workflow/runScript.js");
//@ chunk-41w44bgm.js:40004-40076 placement
/**
 * 合法的工作流运行 id 原样写入遥测，否则走兜底清洗。
 */
function sanitizeWorkflowRunId(runId) {
  return /^wf_[0-9a-f]{8}-[0-9a-f]{3}$/.test(runId)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(runId)
    : shortHash(runId);
}
//@ chunk-41w44bgm.js:40076-40127 placement
/**
 * 按 CPU 数推算默认并发（限制在 2–16）。
 */
function defaultAgentConcurrency(parallelSlots) {
  return Math.min(16, Math.max(2, parallelSlots - 2));
}
//@ chunk-41w44bgm.js:40127-40436 placement
/**
 * 工作流 agent() 的并发与调用上限：默认并发按 CPU 数推算（可由 CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS 覆盖），另一并发上限 50，调用总数上限 1000 及其报错文案。
 */
var DEFAULT_MAX_CONCURRENT_AGENTS; // deferred: uses defaultAgentConcurrency of its import cycle while loading; runs once the cycle is complete
var AGENT_CONCURRENCY_CEILING;
var AGENT_CALL_CAP;
var AGENT_CALL_CAP_MESSAGE;
deferInit("chunk-41w44bgm.js:40127", () => {
  DEFAULT_MAX_CONCURRENT_AGENTS = defaultAgentConcurrency(availableParallelism());
  AGENT_CONCURRENCY_CEILING = 50;
  AGENT_CALL_CAP = 1000;
  AGENT_CALL_CAP_MESSAGE =
    `Workflow agent() call cap reached (${AGENT_CALL_CAP}). This usually means a loop using budget.remaining() never terminates because ` +
    "no token budget was set \u2014 remaining() returns Infinity when budget.total is null. " +
    "Add a hard iteration cap to the loop, or pass a token budget.";
});
//@ chunk-41w44bgm.js:40436-40518 placement
class WorkflowAgentCapError extends Error {
  constructor() {
    super(AGENT_CALL_CAP_MESSAGE);
    this.name = "WorkflowAgentCapError";
  }
}
//@ chunk-41w44bgm.js:40518-40795 placement
class WorkflowBudgetExceededError extends Error {
  constructor(used, total) {
    super(
      `Workflow token budget exceeded (${used.toLocaleString()} / ${total.toLocaleString()} output tokens). Stopping further agent() calls. In-flight agents will complete; their results are preserved.`,
    );
    this.name = "WorkflowBudgetExceededError";
  }
}
//@ chunk-41w44bgm.js:40795-40806 placement
var MAX_PREVIEW_VALUE_CHARS = 400;
//@ chunk-41w44bgm.js:40806-40933 placement
function previewAgentValue(value) {
  if (value == null) return;
  let trimmed = (typeof value === "string" ? value : jsonStringify(value)).trim();
  if (!trimmed) return;
  return trimmed.length > MAX_PREVIEW_VALUE_CHARS
    ? truncateToLength(trimmed, MAX_PREVIEW_VALUE_CHARS) + "\u2026"
    : trimmed;
}
//@ chunk-41w44bgm.js:40933-43660 placement
/**
 * 工作流 agent() 的并发与调用上限，以及调用上限的报错文案。
 */
var WORKFLOW_TASK_AUTHORITY_NOTE =
  "A note that the task text was computed by a workflow script and carries no user authority is not by itself a reason to skip the task: the task is the step this workflow assigned to you. Do that step, and only that step.";
var WORKFLOW_SUBAGENT_SYSTEM_PROMPT = `You are a subagent spawned by a workflow orchestration script. Use the tools available to complete the task.

CRITICAL: Your final text response is returned **verbatim** as a string to the calling script \u2014 it is your return value, not a message to a human.
- Output the literal result (data, JSON, text). Do NOT output confirmations like "Done." or "Sent."
- If asked for JSON, return ONLY the raw JSON \u2014 no code fences, no prose, no markdown.
- Do NOT use SendUserMessage to deliver your answer. Put your answer in your final text response.
- Be concise. The script will parse your output.

${WORKFLOW_TASK_AUTHORITY_NOTE}`;
var WORKFLOW_SUBAGENT_VERBATIM_NOTE = `

---

NOTE: You are running inside a workflow script. Your final text response is returned verbatim as a string to the calling script \u2014 it is your return value, not a message to a human. Output the literal result; do not output confirmations like "Done." Be concise \u2014 the script will parse your output.

${WORKFLOW_TASK_AUTHORITY_NOTE}`;
var WORKFLOW_HANDBACK_NOTE = `

If you are told to deliver your final report through ${SUBAGENTHANDBACK}, the \`message\` of that call is your return value in place of your final text response, and everything said above about your final text response holds for it. Put the whole literal result in \`message\`, not a confirmation and not a pointer to text that you wrote before the call.`;
var WORKFLOW_STRUCTURED_OUTPUT_NOTE = `

---

NOTE: You are running inside a workflow script. You MUST return your final answer by calling the ${STRUCTUREDOUTPUT} tool exactly once \u2014 the tool's input schema defines the required shape. Do your work, then call ${STRUCTUREDOUTPUT}; do NOT put your answer in a text response (the script reads ONLY the tool call). If validation fails, read the error and call ${STRUCTUREDOUTPUT} again with a corrected shape.

${WORKFLOW_TASK_AUTHORITY_NOTE}`;
var WORKFLOW_STRUCTURED_OUTPUT_SYSTEM_PROMPT = `You are a subagent spawned by a workflow orchestration script. Use the tools available to complete the task.

CRITICAL: You MUST call the ${STRUCTUREDOUTPUT} tool exactly once to return your final answer. The tool's input schema defines the required shape.
- Do your work (Read files, run commands, etc.), then call ${STRUCTUREDOUTPUT} with your answer.
- Do NOT put your answer in a text response. The script reads ONLY the ${STRUCTUREDOUTPUT} tool call.
- If the schema validation fails, read the error and call ${STRUCTUREDOUTPUT} again with a corrected shape.
- After calling ${STRUCTUREDOUTPUT} successfully, end your turn. No acknowledgment needed.

${WORKFLOW_TASK_AUTHORITY_NOTE}`;
var WORKFLOW_SUBAGENT_DEFINITION = {
  agentType: WORKFLOW_SUBAGENT_TYPE,
  whenToUse: "Internal subagent for workflow script orchestration.",
  tools: ["*"],
  disallowedTools: [BRIEF_TOOL_NAME, AGENT, WORKFLOW_TOOL_NAME],
  source: "built-in",
  baseDir: "built-in",
  getSystemPrompt: () => WORKFLOW_SUBAGENT_SYSTEM_PROMPT,
};
var WORKFLOW_STRUCTURED_SUBAGENT_DEFINITION = {
  ...WORKFLOW_SUBAGENT_DEFINITION,
  getSystemPrompt: () => WORKFLOW_STRUCTURED_OUTPUT_SYSTEM_PROMPT,
};
var MAX_STALLED_AGENT_RETRIES = 5;
//@ chunk-41w44bgm.js:43660-43848 placement
function recordStalledAgent(reasons, totals, stalled) {
  reasons.push(stalled.replyLost ? "reply lost" : (stalled.stalledReason ?? "stalled"));
  totals.maxContextTokens = Math.max(totals.maxContextTokens, stalled.tokens);
  totals.toolCalls += stalled.toolCalls;
  totals.durationMs += stalled.durationMs;
}
//@ chunk-41w44bgm.js:43848-43861 placement
/**
 * 卡死判定的时长上限。
 */
var MAX_AGENT_DURATION_WATCHDOG_MS = 90000;
//@ chunk-41w44bgm.js:43861-90673 placement
/**
 * 工作流脚本的 agent 调用运行时（生成器状态机形式的转译代码，含预算、上限与日志）。
 */
function createWorkflowAgentRuntime(
  context,
  canUseTool,
  emitProgress,
  toolUseId,
  description,
  initialPhases,
  budget,
  journal,
  resumeCache,
  workflowName,
  invokingRequestId,
  parentPromptId,
  onUsageLimitChange,
  numberedLabels,
) {
  let agentCount = 0;
  let awaitValue = async (promise) => ({
    v: await promise,
  });
  let callFn = (fn, ...args) => fn(...args);
  let copyValue = (value) => clone(value);
  let hostCopyFn = (value) => value;
  let passthrough = (value) => value;
  let safeGet = (target, key) => {
    try {
      return target === null || target === undefined ? undefined : target[key];
    } catch {
      return;
    }
  };
  let rootCallKey = {
    prev: "",
  };
  let frozenRootCallKey = Object.freeze({
    prev: "",
  });
  let callKeyStorage = new AsyncLocalStorage();
  let journalHitSeen = false;
  let noopSlot = {
    inSlot: (slot, callback) => callback(),
    join: () => {},
  };
  function createCallKeyScope(toolUseId) {
    let store = callKeyStorage.getStore();
    if (!journal || store === frozenRootCallKey) return noopSlot;
    let current = store ?? rootCallKey;
    let prev = current.prev;
    current.prev = childCallKey(prev, toolUseId, "fork");
    let slotKeys = [];
    return {
      inSlot: (slotIndex, fn) => {
        let slotState = {
          prev: childCallKey(prev, toolUseId, slotIndex),
        };
        slotKeys[slotIndex] = slotState;
        return callKeyStorage.run(slotState, fn);
      },
      join: () => {
        current.prev = childCallKey(
          current.prev,
          toolUseId,
          Array.from(slotKeys, (slotState) => slotState?.prev ?? ""),
        );
      },
    };
  }
  let flagWithOverride = readFlagWithOverride(WORKFLOW_JOURNAL_HOST_COPY_FLAG, {
    safe: true,
  });
  let capWarned = false;
  let budgetWarned = false;
  let limitWaitersWarned = false;
  let logLines = [];
  let foreignArtifactSeen = false;
  let toolsUsedByAgent = new Map();
  let usedConversationTools = new Set();
  let recordAgentTool = (agentId, toolName) => {
    let tools = toolsUsedByAgent.get(agentId);
    if (tools === undefined) {
      tools = new Set();
      toolsUsedByAgent.set(agentId, tools);
    }
    tools.add(readableToolName(toolName));
  };
  let toolsUsedFor = (agentId) =>
    [...(toolsUsedByAgent.get(agentId ?? "") ?? [])].filter((toolName) =>
      getConversationToolsUsed().has(toolName),
    );
  let remoteBlockGate;
  let preambleFor = (prompt) =>
    foreignArtifactSeen && !prompt.includes(ARTIFACT_CONTENT_AUTHORED_TAG)
      ? `

${relayedWorkflowPreamble(true).trimEnd()}`
      : "";
  let weakSet = new WeakSet();
  function logLine(message, { log }) {
    let truncated = truncateMiddle(message);
    logLines.push(truncated);
    if (log)
      emitProgress({
        type: "progress",
        toolUseID: "workflow_log",
        data: {
          type: "workflow_log",
          message: truncated,
        },
      });
  }
  let limitWaiter = new UsageLimitWaiter({
    signal: context.abortController?.signal,
    log: (message) =>
      emitProgress({
        type: "progress",
        toolUseID: "workflow_log",
        data: {
          type: "workflow_log",
          message,
        },
      }),
    onChange: (state) => onUsageLimitChange?.(state),
    storageV5: context.storageV5,
  });
  let worktreeGate = limitConcurrency(1, createAgentWorktree);
  let branchCheckPromise;
  function ensureBranchPushed() {
    branchCheckPromise ??= (async () => {
      let cwd = getCwd();
      let branch = await getBranch(cwd);
      if (branch === "HEAD") return;
      if (await isBranchOnOrigin(branch, cwd)) return branch;
      emitProgress({
        type: "progress",
        toolUseID: "workflow_log",
        data: {
          type: "workflow_log",
          message: `local branch '${branch}' is not pushed to origin; remote agents will run against the repository's default branch.`,
        },
      });
      return;
    })();
    return branchCheckPromise;
  }
  let warnedModelNotices = new Set();
  function makeModelNotice(tag) {
    return (model, reason) => {
      let noticeKey = `${tag}\x00${model}\x00${reason}`;
      if (warnedModelNotices.has(noticeKey)) return;
      warnedModelNotices.add(noticeKey);
      emitProgress({
        type: "progress",
        toolUseID: "workflow_log",
        data: {
          type: "workflow_log",
          message: `[${tag}] ${formatModelRestrictedNotice(model, reason)}`,
        },
      });
    };
  }
  function enforceAgentCap() {
    if (agentCount < AGENT_CALL_CAP) return;
    if (!capWarned) {
      capWarned = true;
      logEvent("tengu_workflow_agent_cap_exceeded", {
        agentCount,
      });
    }
    throw new WorkflowAgentCapError();
  }
  function enforceBudget() {
    if (budget?.total == null || budget.total <= 0) return;
    let used = budget.getTurnSpent();
    if (used < budget.total) return;
    if (!budgetWarned) {
      budgetWarned = true;
      logEvent("tengu_workflow_budget_cap_exceeded", {
        spent: used,
        budget: budget.total,
        agentCount,
      });
    }
    throw new WorkflowBudgetExceededError(used, budget.total);
  }
  let phaseSeq = 0;
  let currentPhaseTitle;
  let phases = new Map();
  let agentContext = {
    ...context,
    options: {
      ...context.options,
      mainLoopModel: resolveContextPrimaryModel(context.options),
    },
    isBackgroundAgent: true,
    setAppState: () => {},
    setToolPermissionContext: () => {},
    setSessionToolPermissionContext: context.setSessionToolPermissionContext,
  };
  function resolveAgentModel(model) {
    if (model) return model;
    let workflowSubagentModel = getWorkflowSubagentModel();
    if (workflowSubagentModel !== undefined) return workflowSubagentModel;
    let defaultSubagentModel = getDefaultSubagentModel();
    return defaultSubagentModel !== "inherit" ? defaultSubagentModel : agentContext.options.mainLoopModel;
  }
  function phaseEntryFor(title, kind) {
    let truncatedTitle = truncateMiddle(title);
    let entry = phases.get(truncatedTitle);
    if (entry == null) {
      entry = {
        index: ++phaseSeq,
        kind,
        announced: false,
        title: truncatedTitle,
      };
      phases.set(truncatedTitle, entry);
    }
    return entry;
  }
  function phaseIndexOf(title, kind) {
    return phaseEntryFor(title, kind).index;
  }
  function announcePhase(title) {
    let entry = phaseEntryFor(title);
    if (!entry.announced) {
      entry.announced = true;
      emitProgress({
        type: "progress",
        toolUseID: `workflow_phase_${entry.index}`,
        data: {
          type: "workflow_phase",
          index: entry.index,
          title: entry.title,
          kind: entry.kind,
        },
      });
    }
    return entry.index;
  }
  for (let title of initialPhases ?? []) announcePhase(title);
  let phase = sealPrototype((phase) => {
    currentPhaseTitle = describeLogArg(phase);
    announcePhase(currentPhaseTitle);
  });
  let maxConcurrentAgents = env.CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS ?? DEFAULT_MAX_CONCURRENT_AGENTS;
  if (env.CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS !== undefined)
    logForDebugging(
      `workflow: concurrent agent gate = ${maxConcurrentAgents} (CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS)`,
    );
  let agentGate = limitConcurrency(maxConcurrentAgents, queueEntry);
  let ceilingGate = limitConcurrency(AGENT_CONCURRENCY_CEILING, runAgentTask);
  async function reviewGateBlocks({
    idx,
    promptStr,
    label,
    ownPhaseTitle,
    ownPhaseIndex,
    opts,
    queuedAt,
    provenanceOn,
  }) {
    let toolPermissionContext = getToolPermissionContext(agentContext);
    if (toolPermissionContext.mode !== "auto") return false;
    let messages;
    let schemaJson;
    if (opts?.schema != null) {
      let ancestors = [];
      let seenObjs = new Set();
      let nodeBudget = MAX_SCHEMA_NODES_2;
      let charCount = 0;
      try {
        let json = JSON.stringify(opts.schema, function (replacerKey, replacerValue) {
          if (--nodeBudget < 0) throw Error("output schema expansion exceeds the node budget");
          let normalizedValue = typeof replacerValue === "bigint" ? replacerValue.toString() : replacerValue;
          charCount +=
            replacerKey.length + (typeof normalizedValue === "string" ? normalizedValue.length : 0);
          if (charCount > MAX_UNREVIEWED_SCHEMA_CHARS) throw Error("output schema too large to classify");
          if (normalizedValue !== null && typeof normalizedValue === "object") {
            while (ancestors.length > 0 && ancestors.at(-1) !== this) seenObjs.delete(ancestors.pop());
            if (seenObjs.has(normalizedValue)) return "[Circular]";
            ancestors.push(normalizedValue);
            seenObjs.add(normalizedValue);
          }
          return normalizedValue;
        });
        if (json !== undefined && json.length > MAX_UNREVIEWED_SCHEMA_CHARS) {
          charCount = json.length;
          throw Error("output schema too large to classify");
        }
        messages = json || undefined;
      } catch {
        schemaJson =
          charCount > MAX_UNREVIEWED_SCHEMA_CHARS
            ? "output schema too large for the safety classifier"
            : "output schema could not be serialized for the safety classifier";
      }
    }
    let schemaTooLarge = isSchemaTooLargeToSkipReview(messages);
    if (provenanceOn && !schemaTooLarge && schemaJson === undefined) return false;
    let blockedResult = (reason) => {
      logEvent("tengu_auto_mode_decision", {
        decision: fromEnum("blocked"),
        toolName: fromEnum(TASK),
        inProtectedNamespace: isEvalBuild(),
        ...getProjectsRoleTelemetry(context),
        isHandoff: false,
      });
      return {
        reason,
        unreviewed: true,
      };
    };
    let reason =
      schemaJson ??
      (provenanceOn
        ? isClassifierSideCallRetired("workflow_schema")
          ? `output schema is over ${MAX_UNREVIEWED_SCHEMA_CHARS_2} characters, too large to pass unreviewed in auto mode, so this agent was not started; shorten the schema`
          : undefined
        : isClassifierSideCallRetired("workflow_prompt")
          ? AUTO_MODE_CLASSIFIER_OFF_MESSAGE
          : undefined);
    let reviewResult = reason
      ? blockedResult(reason)
      : await reviewWorkflowAgentDispatch({
          prompt: promptStr,
          schemaJson: messages,
          agentType: opts?.agentType != null ? String(opts.agentType) : undefined,
          parentMessages: context.messages,
          inheritedVerifiedHumanTurns: context.inheritedVerifiedHumanTurns,
          parentTools: context.options.tools,
          rootToolSurface: context.rootToolSurface,
          toolPermissionContext,
          abortSignal: agentContext.abortController.signal,
          dispatchAgentId: context.agentId,
          storageV5: context.storageV5,
          credentials: context.credentials,
        }).catch((error) => {
          if (!agentContext.abortController?.signal.aborted) logError(error);
          if (!schemaTooLarge || agentContext.abortController?.signal.aborted) return null;
          return blockedResult("classifier error; output schema too large to pass unreviewed");
        });
    if (agentContext.abortController?.signal.aborted) throw Error("Workflow aborted");
    if (!reviewResult) return false;
    let blockedMessage = reviewResult.unreviewed
      ? `[${label}] blocked: ${reviewResult.reason}`
      : `[${label}] blocked by safety classifier: ${reviewResult.reason}`;
    logLine(blockedMessage, {
      log: false,
    });
    emitProgress({
      type: "progress",
      toolUseID: `workflow_agent_${idx}_blocked`,
      data: {
        type: "workflow_agent",
        index: idx,
        label,
        phaseIndex: ownPhaseIndex,
        phaseTitle: ownPhaseTitle,
        agentType: opts?.agentType != null ? String(opts.agentType) : undefined,
        isolation:
          opts?.isolation === "worktree" || opts?.isolation === "remote" ? opts.isolation : undefined,
        model: resolveAgentModel(opts?.model),
        state: "error",
        blocked: true,
        error: blockedMessage,
        queuedAt,
        promptPreview: previewAgentValue(promptStr),
        lastProgressAt: Date.now(),
      },
    });
    return true;
  }
  let weakMap = new WeakMap();
  let agent = sealPrototype(async (optsInput, signalA, maybeAbortHandlers, thirdArg, maybeSignalB) => {
    let agentContext_2 = context.agentContext;
    let abortSignal = maybeAbortHandlers instanceof AbortSignal ? maybeAbortHandlers : undefined;
    let secondSignal = maybeSignalB instanceof AbortSignal ? maybeSignalB : undefined;
    let callKeyStore = callKeyStorage.getStore();
    let callKeyState = callKeyStore ?? rootCallKey;
    let suppressJournal = thirdArg instanceof WorkflowJournalStub || callKeyStore === frozenRootCallKey;
    let schemaObj;
    if (signalA !== null && typeof signalA === "object" && !isUntrustedObject(signalA)) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(signalA, "schema");
      let schemaDescriptor =
        ownPropertyDescriptor && "value" in ownPropertyDescriptor ? ownPropertyDescriptor.value : undefined;
      if (schemaDescriptor !== null && typeof schemaDescriptor === "object") schemaObj = schemaDescriptor;
    }
    let opts = hostCopy(hostCopyFn(signalA));
    if (opts && schemaObj !== undefined) {
      let cachedSchemaCopy = weakMap.get(schemaObj);
      if (cachedSchemaCopy === undefined) {
        cachedSchemaCopy = hostCopy(hostCopyFn(schemaObj));
        weakMap.set(schemaObj, cachedSchemaCopy);
      }
      opts.schema = cachedSchemaCopy;
    }
    let forcedModelReason =
      getWorkflowSubagentModel() !== undefined
        ? "CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL is set"
        : env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE
          ? "CLAUDE_CODE_SUBAGENT_MODEL_FORCE is on"
          : undefined;
    if (opts?.model !== undefined && forcedModelReason !== undefined) {
      logForDebugging(`Workflow agent model "${opts.model}" ignored: ${forcedModelReason}`);
      opts.model = undefined;
    }
    if (agentContext.abortController?.signal.aborted) return new Promise(() => {});
    try {
      enforceAgentCap();
      enforceBudget();
      let disallowedTools = opts?.disallowedTools;
      if (disallowedTools !== undefined) {
        if (
          !Array.isArray(disallowedTools) ||
          disallowedTools.some(
            (disallowedTool) =>
              typeof disallowedTool !== "string" ||
              disallowedTool === "" ||
              disallowedTool !== disallowedTool.trim(),
          )
        )
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "agent() opts.disallowedTools must be an array of non-empty tool-name strings (e.g. ['Bash', 'Write']); got " +
              (Array.isArray(disallowedTools)
                ? "an array with non-string, empty, or whitespace-padded entries"
                : typeof disallowedTools) +
              ". Refusing the spawn rather than running it un-narrowed.",
            "agent() opts.disallowedTools malformed \u2014 spawn refused",
          );
        if (opts !== undefined)
          opts.disallowedTools = disallowedTools.length === 0 ? undefined : uniq(disallowedTools).sort();
      }
      let bashCommandClamp = opts?.bashCommandClamp;
      if (bashCommandClamp !== undefined) {
        if (
          !Array.isArray(bashCommandClamp) ||
          bashCommandClamp.some(
            (clampEntry) =>
              typeof clampEntry !== "string" || clampEntry === "" || clampEntry !== clampEntry.trim(),
          )
        )
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "agent() opts.bashCommandClamp must be an array of non-empty strings; got " +
              (Array.isArray(bashCommandClamp)
                ? "an array with non-string, empty, or whitespace-padded entries"
                : typeof bashCommandClamp) +
              ". Refusing the spawn rather than running it un-clamped.",
            "agent() bashCommandClamp malformed \u2014 spawn refused",
          );
        let clampRules = bashCommandClamp.length === 0 ? undefined : uniq(bashCommandClamp).sort();
        for (let clampRule of clampRules ?? []) {
          let { toolName, ruleContent } = permissionRuleValueFromString(clampRule);
          if (
            toolName !== BASH_TOOL_NAME ||
            ruleContent === undefined ||
            ruleContent === "" ||
            ruleContent !== ruleContent.trim()
          )
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.bashCommandClamp entry '${clampRule}' must be a '${BASH_TOOL_NAME}(<command or prefix>)' permission rule (tool name case-sensitive, non-empty content with no leading/trailing whitespace inside the parens); it parses to tool '${toolName}'` +
                (ruleContent === undefined || ruleContent === ""
                  ? " with no rule content"
                  : ruleContent !== ruleContent.trim()
                    ? " with whitespace-padded rule content"
                    : "") +
                ". Refusing the spawn rather than running it with an inert clamp entry.",
              "agent() opts.bashCommandClamp inert entry \u2014 spawn refused",
            );
        }
        if (opts !== undefined) opts.bashCommandClamp = clampRules;
      }
    } catch (error) {
      await sleep(0);
      throw error;
    }
    let agentIndex = ++agentCount;
    let promptText = describeLogArg(optsInput);
    let label =
      opts?.label != null
        ? String(opts.label).replace(/\s+/g, " ").trim()
        : numberedLabels
          ? `agent ${agentIndex}`
          : truncateToLength(promptText, 60).replace(/\s+/g, " ").trim();
    let phaseTitle = opts?.phase != null ? String(opts.phase) : currentPhaseTitle;
    let phaseIndex = phaseTitle != null ? announcePhase(phaseTitle) : undefined;
    let stallMs = opts?.stallMs != null ? Number(opts.stallMs) : getAsyncAgentStallTimeoutMs();
    let promptPreview = previewAgentValue(promptText);
    let callKey;
    let agentId;
    let respawnHint = false;
    if (journal && !suppressJournal) {
      callKey = agentCallKey(promptText, opts, callKeyState.prev);
      callKeyState.prev = callKey;
      let cachedResult = journalHitSeen ? undefined : resumeCache?.results.get(callKey);
      if (cachedResult !== undefined) {
        if (resumeCache?.replaced.has(callKey))
          callKeyState.prev = hashReplacedContent(
            callKey,
            typeof cachedResult.agentId === "string" ? cachedResult.agentId : "",
          );
        if (cachedResult.foreignArtifactContent) foreignArtifactSeen = true;
        if (Array.isArray(cachedResult.toolsUsed)) {
          for (let toolName of cachedResult.toolsUsed)
            if (typeof toolName === "string")
              usedConversationTools.add(
                getConversationToolsUsed().has(toolName) ? toolName : UNREADABLE_TOOLS_USED_BEFORE_SUMMARY,
              );
        }
        emitProgress({
          type: "progress",
          toolUseID: `workflow_agent_${agentIndex}_cached`,
          data: {
            type: "workflow_agent",
            index: agentIndex,
            label,
            phaseIndex,
            phaseTitle,
            agentId: cachedResult.agentId,
            model: resolveAgentModel(opts?.model),
            state: "done",
            startedAt: Date.now(),
            lastProgressAt: Date.now(),
            cached: true,
            resultPreview: previewAgentValue(cachedResult.result),
            promptPreview,
          },
        });
        return copyValue(cachedResult.result);
      }
      let startedAttempts = resumeCache?.started.get(callKey);
      if (!(
        !journalHitSeen &&
        startedAttempts !== undefined &&
        startedAttempts.length > 0 &&
        !resumeCache?.failed.has(callKey) &&
        !resumeCache?.demoted.has(callKey)
      ))
        journalHitSeen = true;
      respawnHint =
        resumeCache !== undefined &&
        (resumeCache.results.has(callKey) ||
          resumeCache.demoted.has(callKey) ||
          resumeCache.failed.has(callKey));
      if (startedAttempts && startedAttempts.length > 0)
        logEvent("tengu_workflow_journal_started_hit_respawn", {
          attempts: startedAttempts.length,
        });
    }
    let started = false;
    let onAgentStarted = (newAgentId) => {
      started = true;
      agentId = newAgentId;
      if (!journal || callKey === undefined) return;
      journal
        .append({
          type: "started",
          key: callKey,
          agentId: newAgentId,
          ...truncateProgressFields(label, phaseTitle),
        })
        .catch((error) =>
          logForDebugging(`workflow journal started-append failed: ${error}`, {
            level: "warn",
          }),
        );
    };
    let markFailed = async () => {
      if (!journal || !callKey || agentContext.abortController?.signal.aborted || secondSignal?.aborted)
        return;
      await journal
        .append({
          type: "failed",
          key: callKey,
          agentId: agentId ?? "",
        })
        .catch((error) =>
          logForDebugging(`workflow journal failed-append failed: ${error}`, {
            level: "warn",
          }),
        );
    };
    let finishAgent = async (result) => {
      if (result === null) await markFailed();
      if (journal && callKey && result !== null) {
        let result_2 = result;
        if (flagWithOverride)
          try {
            result_2 = hostCopy(hostCopyFn(result));
          } catch (error) {
            logForDebugging(
              `workflow journal: did not save an agent() result, so a resumed run will re-run from this call: ${describeThrownValue(error).msg}`,
              {
                level: "warn",
              },
            );
            await markFailed();
            return result;
          }
        else if (typeof result === "object") {
          await markFailed();
          return result;
        }
        await journal
          .append({
            type: "result",
            key: callKey,
            agentId: agentId ?? "",
            result: result_2,
            ...(foreignArtifactSeen && {
              foreignArtifactContent: true,
            }),
            ...(toolsUsedFor(agentId).length > 0 && {
              toolsUsed: toolsUsedFor(agentId),
            }),
          })
          .catch((error) =>
            logForDebugging(`workflow journal result-append failed: ${error}`, {
              level: "warn",
            }),
          );
        if (respawnHint && callKeyState.prev === callKey)
          callKeyState.prev = hashReplacedContent(callKey, agentId ?? "");
      }
      return result;
    };
    let now = Date.now();
    let emitQueued = () =>
      emitProgress({
        type: "progress",
        toolUseID: `workflow_agent_${agentIndex}_queued`,
        data: {
          type: "workflow_agent",
          index: agentIndex,
          label,
          phaseIndex,
          phaseTitle,
          agentType: opts?.agentType != null ? String(opts.agentType) : undefined,
          isolation:
            opts?.isolation === "worktree" || opts?.isolation === "remote" ? opts.isolation : undefined,
          model: resolveAgentModel(opts?.model),
          state: "start",
          queuedAt: now,
          promptPreview,
          lastProgressAt: now,
        },
      });
    let onQueuedAbort = (error) => {
      if (started || agentContext.abortController?.signal.aborted) return;
      emitProgress({
        type: "progress",
        toolUseID: `workflow_agent_${agentIndex}_queued`,
        data: {
          type: "workflow_agent",
          index: agentIndex,
          label,
          phaseIndex,
          phaseTitle,
          model: resolveAgentModel(opts?.model),
          state: "error",
          error: error instanceof Error ? error.message : String(error),
          queuedAt: now,
          promptPreview,
          lastProgressAt: Date.now(),
        },
      });
    };
    if (opts?.isolation === "remote")
      throw Error("agent({isolation:'remote'}) is not available in this build");
    emitQueued();
    try {
      return await finishAgent(
        await agentGate(
          agentIndex,
          promptText,
          label,
          phaseTitle,
          phaseIndex,
          stallMs,
          opts,
          onAgentStarted,
          now,
          agentContext_2,
          abortSignal,
        ),
      );
    } catch (error) {
      onQueuedAbort(error);
      await markFailed();
      if (agentContext.abortController?.signal.aborted) return new Promise(() => {});
      throw error;
    }
  });
  async function spawnAgentWithHooks({ idx, promptStr, label, agent, model, permissionMode, evalSignal }) {
    let agentContext_2 = context.agentContext;
    let modelOverrideArg = typeof model === "string" ? model : undefined;
    let spawnHookResult = await runAgentSpawnHooks(
      {
        tool_use_id: context.toolUseId ?? "",
        prompt: numberedLabels ? "(withheld: this workflow run does not share its script)" : promptStr,
        description: label,
        agent,
        agents: [],
        model: modelOverrideArg,
        parentModel: getMainLoopModel_2(agentContext),
        parentAgentId: isMainAgent(agentContext_2) ? undefined : agentContext_2?.agentId,
        permissionMode,
        background: false,
        fork: false,
        name: undefined,
        cwd: undefined,
        workflow: Object.freeze({
          runId: toolUseId ?? "",
          agentIndex: idx,
        }),
        signal: AbortSignal.any(
          [agentContext.abortController?.signal, evalSignal].filter((signal) => signal !== undefined),
        ),
        origin: agentContext.hookOrigin,
      },
      eventCallersFor,
    ).catch((error) => {
      if (evalSignal?.aborted) return;
      throw error;
    });
    let aborted = agentContext.abortController?.signal.aborted === true;
    if (aborted || spawnHookResult === undefined || evalSignal?.aborted) {
      spawnHookResult?.starting?.[Symbol.dispose]();
      if (aborted) throw Error("Workflow aborted");
      return null;
    }
    if (spawnHookResult.deny !== undefined) {
      if (!limitWaitersWarned) {
        limitWaitersWarned = true;
        logFeatureBad("subagent_launch", "workflow_spawn_denied_by_hook");
      }
      await sleep(0);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Workflow agent spawn denied by a plugin: ${spawnHookResult.deny}`,
        "Workflow agent spawn denied by a plugin",
      );
    }
    return {
      starting: spawnHookResult.starting,
      prompt: numberedLabels ? promptStr : spawnHookResult.spawn.prompt,
      model:
        spawnHookResult.spawn.model === modelOverrideArg || env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE
          ? model
          : spawnHookResult.spawn.model,
      isRewritten: spawnHookResult.isRewritten,
    };
  }
  async function queueEntry(
    idx,
    promptStr,
    label,
    ownPhaseTitle,
    ownPhaseIndex,
    opts,
    queuedAt,
    provenanceOn,
    queuedAt_2,
    gate,
    slot,
  ) {
    await limitWaiter.whenClear();
    if (agentContext.abortController?.signal.aborted) throw Error("Workflow aborted");
    if (slot?.aborted) return null;
    let progressFields = truncateProgressFields(label, ownPhaseTitle);
    enforceBudget();
    let provenanceEnabled = isPromptProvenanceEnabled();
    if (
      await reviewGateBlocks({
        idx,
        promptStr,
        label,
        ownPhaseTitle,
        ownPhaseIndex,
        opts: queuedAt,
        queuedAt: queuedAt_2,
        provenanceOn: provenanceEnabled,
      })
    )
      return null;
    let requestedAgentType;
    if (queuedAt?.agentType != null) {
      let agentType = String(queuedAt.agentType);
      let activeAgents = agentContext.options.agentDefinitions.activeAgents;
      let toolPermissionContext = getToolPermissionContext(agentContext);
      let dispatchable = await filterDispatchableAgents(activeAgents, toolPermissionContext, AGENT);
      let agent = dispatchable.find((agent) => agent.agentType === agentType);
      if (!agent) {
        let agent = activeAgents.find((activeAgent) => activeAgent.agentType === agentType);
        let denyRule = agent ? findDenyRuleWithContent(toolPermissionContext, AGENT, agentType) : null;
        if (denyRule)
          throw Error(
            `agent({agentType}): '${agentType}' is denied by permission rule '${AGENT}(${agentType})' from ${denyRule.source}.`,
          );
        if (agent && isAgentToolPoolDenied(agent, toolPermissionContext))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `agent({agentType}): ${agentToolPoolDeniedMessage(agentType)}`,
            "workflow agent(): agent type unavailable, tool pool denied",
          );
        throw Error(
          `agent({agentType}): agent type '${agentType}' not found. Available agents: ${dispatchable.map((type) => type.agentType).join(", ")}`,
        );
      }
      let disallowedTools = [
        ...(agent.disallowedTools ?? []),
        ...(WORKFLOW_SUBAGENT_DEFINITION.disallowedTools ?? []),
      ];
      let schemaNote = queuedAt.schema ? WORKFLOW_STRUCTURED_OUTPUT_NOTE : WORKFLOW_SUBAGENT_VERBATIM_NOTE;
      let tools =
        queuedAt.schema && !parseWildcardAgentTypes(agent.tools)
          ? [...(agent.tools ?? []), STRUCTUREDOUTPUT]
          : agent.tools;
      requestedAgentType = {
        ...withSystemPromptSuffix(agent, schemaNote),
        disallowedTools,
        tools,
      };
    }
    let syntheticOutput;
    if (queuedAt?.schema) {
      let syntheticOutputTool = createSyntheticOutputTool(queuedAt.schema);
      if ("error" in syntheticOutputTool || syntheticOutputTool.unsatisfiable) await sleep(0);
      if ("error" in syntheticOutputTool)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `agent({schema}) received an invalid JSON Schema: ${syntheticOutputTool.error}`,
          "Workflow agent({schema}) invalid JSON Schema",
        );
      if (syntheticOutputTool.unsatisfiable) {
        let schemaProblem = `agent({schema}) received an unusable JSON Schema \u2014 ${checkSchemaSatisfiable(syntheticOutputTool.unsatisfiable)}`;
        let { message } = syntheticOutputTool.unsatisfiable;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_workflow_schema_lint_enforce", true))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${schemaProblem}: ${message}. The subagent was not started \u2014 fix the schema and call agent() again.`,
            "Workflow agent({schema}) unsatisfiable JSON Schema",
          );
        if (!weakSet.has(syntheticOutputTool)) {
          weakSet.add(syntheticOutputTool);
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${label}] warning: ${schemaProblem}: ${message}`,
            },
          });
        }
      }
      syntheticOutput = syntheticOutputTool.tool;
    }
    let agentOpts =
      requestedAgentType ??
      (syntheticOutput ? WORKFLOW_STRUCTURED_SUBAGENT_DEFINITION : WORKFLOW_SUBAGENT_DEFINITION);
    let effort =
      parseEffortValue(queuedAt?.effort) ??
      getDefaultSubagentEffort(agentOpts, agentContext.permissionLayers);
    let agentOptsWithEffort =
      effort !== undefined
        ? {
            ...agentOpts,
            effort,
          }
        : agentOpts;
    let disallowedTools = queuedAt?.disallowedTools;
    let bashCommandClamp = queuedAt?.bashCommandClamp;
    let mcpServers =
      (disallowedTools !== undefined && disallowedTools.length > 0) ||
      (bashCommandClamp !== undefined && bashCommandClamp.length > 0)
        ? {
            ...agentOptsWithEffort,
            disallowedTools: [
              ...(agentOptsWithEffort.disallowedTools ?? []),
              ...(disallowedTools ?? []),
              REPL_TOOL_NAME,
              ...(bashCommandClamp !== undefined && bashCommandClamp.length > 0
                ? ["mcp__*", POWERSHELL_TOOL_NAME]
                : []),
            ],
          }
        : agentOptsWithEffort;
    await waitForCoordinatorSubagentMcpServers(() => agentContext.getAppState().mcp);
    let appState = agentContext.getAppState();
    let toolPermissionContext = getToolPermissionContext(agentContext);
    let filtered = agentContext.options.tools.filter(isMcpTool);
    let toolPool = agentContext.options.toolCatalog.assembleToolPool(
      toolPermissionContext,
      excludeCoordinatorCommsMcpTools(appState.mcp.tools.concat(filtered)),
      {
        skipReplFilter: true,
        machineMcpTools: bridgeToolsOf(agentContext),
      },
    );
    let deniedToolNames = (name) =>
      resolveAgentTools(
        mcpServers,
        name,
        false,
        false,
        false,
        getAgentDepth(gate) + 1,
        memoryModeForSession(agentContext).mode,
      );
    let removeDenied = (deniedName) => {
      let filtered = filterToolsByDenyRules(
        [GlobTool, GrepTool, ...enabledToolsForAliases([GrepTool.name, GlobTool.name])],
        toolPermissionContext,
      ).filter((tool) => !deniedName.some((deniedName) => toolMatchesName(deniedName, tool.name)));
      return filtered.length > 0 ? [...deniedName, ...filtered] : deniedName;
    };
    let filteredPool = toolPool;
    if (disallowedTools !== undefined && disallowedTools.length > 0) {
      if (
        hasEmbeddedSearchTools() &&
        !deniedToolNames(filteredPool).resolvedTools.some((resolvedTool) =>
          toolMatchesName(resolvedTool, BASH_TOOL_NAME),
        )
      )
        filteredPool = removeDenied(filteredPool);
      let mcpNames = flattenToolNameList(mcpServers.mcpServers);
      let probeServer = (serverName) => {
        if (serverName.length === 0) return;
        let mcpToolName = `mcp__${serverName}`;
        let probeResult = probeAgentToolPool(mcpToolName, filteredPool, mcpNames);
        if (probeResult === null) return;
        switch (probeResult.kind) {
          case "pool-server":
          case "declared-server":
            return mcpToolName;
          case "slip":
            return probeResult.correctedSpelling;
          case "unmatched":
            return;
        }
      };
      for (let disallowedTool of disallowedTools) {
        let disallowedToolsFilter = buildDisallowedToolsFilter([disallowedTool]);
        if (filteredPool.some((tool) => disallowedToolsFilter.isToolDisallowed(tool))) continue;
        let { toolName } = permissionRuleValueFromString(disallowedTool);
        if (toolName !== toolName.trim() || /[\s()]/.test(toolName.trim())) {
          await sleep(0);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `agent() opts.disallowedTools entry '${disallowedTool}' parses to tool name '${toolName}', which can never match a tool \u2014 check ` +
              "for a space before the rule parens or an unbalanced paren. Refusing the spawn rather than running it un-narrowed.",
            "agent() opts.disallowedTools unparseable entry \u2014 spawn refused",
          );
        }
        {
          let mcpInfo = /^mcp__/i.test(toolName) ? mcpInfoFromString(`mcp__${toolName.slice(5)}`) : null;
          if (/^mcp__/i.test(toolName) && mcpInfo === null) {
            await sleep(0);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${disallowedTool}' cannot match ` +
                "any tool \u2014 its server segment is empty, so it names no " +
                "server. Use 'mcp__<server>' to deny one server's tools ('mcp__<server>__<tool>' for one tool), or 'mcp__*' to deny every MCP server's tools. Refusing the spawn rather than running it un-narrowed.",
              "agent() opts.disallowedTools empty mcp server segment \u2014 spawn refused",
            );
          }
          if (mcpInfo !== null && mcpInfo.serverName.includes("*") && mcpInfo.serverName !== "*") {
            let probe = probeServer(mcpInfo.serverName.replace(/\*+/g, ""));
            await sleep(0);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${disallowedTool}' cannot match ` +
                "any tool \u2014 server names take no wildcard. Use " +
                (probe !== undefined ? `'${probe}' for that server's tools, or ` : "") +
                "'mcp__*' for every MCP server's tools. Refusing the spawn rather than running it un-narrowed.",
              "agent() opts.disallowedTools wildcard mcp server \u2014 spawn refused",
            );
          }
          if (
            mcpInfo !== null &&
            mcpInfo.toolName !== undefined &&
            mcpInfo.toolName !== "*" &&
            mcpInfo.toolName.includes("*")
          ) {
            let probe = probeServer(mcpInfo.serverName);
            await sleep(0);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${disallowedTool}' cannot match ` +
                "any tool \u2014 tool names take no wildcard. " +
                (probe !== undefined
                  ? `Use '${probe}' to deny all of that server's tools, or enumerate exact tool names. `
                  : "Enumerate exact tool names, or use 'mcp__*' to deny every MCP server's tools. ") +
                "Refusing the spawn rather than running it un-narrowed.",
              "agent() opts.disallowedTools wildcard mcp tool \u2014 spawn refused",
            );
          }
        }
        if (toolName.includes("*") && mcpInfoFromString(toolName) === null && !/^mcp__/i.test(toolName)) {
          await sleep(0);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `agent() opts.disallowedTools entry '${disallowedTool}' cannot match ` +
              "any tool \u2014 '*' is not a deny wildcard outside mcp__ server " +
              "specs. " +
              (toolName.toLowerCase().startsWith("skill__")
                ? `Use '${SKILL}' to deny every skill. `
                : "Enumerate the tools to deny (e.g. ['Bash', 'Write']), or use 'mcp__*' to deny every MCP server's tools. ") +
              "Refusing the spawn rather than running it un-narrowed.",
            "agent() opts.disallowedTools wildcard-bearing entry \u2014 spawn refused",
          );
        }
        if (toolName === SKILL) continue;
        if (syntheticOutput !== undefined && toolName === STRUCTUREDOUTPUT) continue;
        let lower = toolName.toLowerCase();
        let toolNames =
          filteredPool
            .flatMap((tool) => [tool.name, getToolNameForPermissionCheck(tool)])
            .find((tool) => tool.toLowerCase() === lower) ??
          (lower === SKILL.toLowerCase() ? SKILL : undefined) ??
          (syntheticOutput !== undefined && lower === STRUCTUREDOUTPUT.toLowerCase()
            ? STRUCTUREDOUTPUT
            : undefined);
        let probeResult = probeAgentToolPool(toolName, filteredPool, mcpNames);
        if (probeResult?.kind === "declared-server") {
          let mcpInfo = mcpInfoFromString(toolName);
          if (!(
            !probeResult.verifiable &&
            toolNames !== undefined &&
            mcpInfoFromString(toolNames)?.serverName === mcpInfo?.serverName
          )) {
            logForDebugging(
              `workflow agent(): disallowedTools mcp entry '${toolName}' covers this agent's declared frontmatter MCP server '${probeResult.declaredSpelling}' \u2014 those tools connect at ` +
                "spawn, after this check, and the deny is applied to them then" +
                (probeResult.verifiable ? "" : " (a full tool-name entry cannot be verified here)"),
            );
            continue;
          }
        }
        if (toolNames !== undefined) {
          await sleep(0);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `agent() opts.disallowedTools entry '${disallowedTool}'` +
              (toolName !== disallowedTool ? ` (parsed tool name '${toolName}')` : "") +
              ` does not match any tool, but '${toolNames}' exists \u2014 ` +
              "tool names are case-sensitive. Refusing the spawn rather than running it with this deny silently dropped.",
            "agent() opts.disallowedTools case-mismatched entry \u2014 spawn refused",
          );
        }
        if (probeResult !== null) {
          if (probeResult.kind === "pool-server") continue;
          if (probeResult.kind === "slip") {
            await sleep(0);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${disallowedTool}'` +
                (toolName !== disallowedTool ? ` (parsed tool name '${toolName}')` : "") +
                ` cannot match as written, but '${probeResult.correctedSpelling}' would \u2014 deny entries ` +
                "must match the normalized server spelling exactly, mcp__ prefix and case included. Refusing the spawn rather than running it with this deny silently dropped.",
              "agent() opts.disallowedTools mismatched mcp entry \u2014 spawn refused",
            );
          }
          logForDebugging(
            `workflow agent(): disallowedTools mcp entry '${toolName}' ` +
              "matches no tool in this session's pool \u2014 the deny is a " +
              "no-op here",
          );
          continue;
        }
        logForDebugging(
          `workflow agent(): disallowedTools entry '${toolName}' matches no ` +
            "tool in this session's pool \u2014 the deny is a no-op here",
        );
      }
    }
    if (
      syntheticOutput !== undefined &&
      buildDisallowedToolsFilter(mcpServers.disallowedTools).isToolDisallowed(syntheticOutput)
    ) {
      await sleep(0);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent() schema mode needs the ${STRUCTUREDOUTPUT} tool, ` +
          "but the spawn's merged disallowedTools deny it \u2014 refusing the " +
          "spawn instead of running an agent that cannot return its structured output.",
        "agent() schema mode with StructuredOutput denied \u2014 spawn refused",
      );
    }
    if (bashCommandClamp !== undefined && bashCommandClamp.length > 0 && hasEmbeddedSearchTools())
      filteredPool = removeDenied(filteredPool);
    if (bashCommandClamp !== undefined && bashCommandClamp.length > 0) {
      let toolAliases = getToolPermissionContext(agentContext).toolAliases;
      let toolAliases_2 = agentContext.options.toolAliases;
      let found = [BASH_TOOL_NAME, MONITOR, POWERSHELL_TOOL_NAME].find(
        (aliasKey) => toolAliases?.[aliasKey] !== undefined || toolAliases_2?.[aliasKey] !== undefined,
      );
      if (found !== undefined) {
        await sleep(0);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `agent() opts.bashCommandClamp cannot bind in this session: the host remaps ${found} via toolAliases, so exec ` +
            "dispatch runs the alias target's permission path instead \u2014 " +
            "the clamp cannot be guaranteed to apply on that surface. Refusing the spawn rather than running it un-clamped.",
          "agent() bashCommandClamp under a shell toolAlias \u2014 spawn refused",
        );
      }
    }
    if (
      bashCommandClamp !== undefined &&
      bashCommandClamp.length > 0 &&
      !deniedToolNames(filteredPool).resolvedTools.some((resolvedTool) =>
        toolMatchesName(resolvedTool, BASH_TOOL_NAME),
      )
    ) {
      await sleep(0);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent() opts.bashCommandClamp can bind nothing: the spawned agent's resolved tool pool has no ${BASH_TOOL_NAME} (removed by this spawn's disallowedTools, the agent definition's denies, or absent from the session pool). A clamp on a Bash-less agent ` +
          "means the commands it was meant to keep are unavailable \u2014 " +
          "refusing the spawn rather than running a blind agent. Drop the clamp or the Bash deny.",
        "agent() bashCommandClamp with no Bash in resolved pool \u2014 spawn refused",
      );
    }
    let agentTools = filteredPool;
    let structuredOutputTool = syntheticOutput
      ? [...agentTools.filter((tool) => !toolMatchesName(tool, STRUCTUREDOUTPUT)), syntheticOutput]
      : agentTools;
    let spawnResult = await spawnAgentWithHooks({
      idx,
      promptStr,
      label,
      agent: mcpServers,
      model: queuedAt?.model,
      permissionMode: toolPermissionContext.mode,
      evalSignal: slot,
    });
    if (spawnResult === null) return null;
    using starting = spawnResult.starting;
    let { prompt, model, isRewritten } = spawnResult;
    if (
      prompt !== promptStr &&
      (await reviewGateBlocks({
        idx,
        promptStr: prompt,
        label,
        ownPhaseTitle,
        ownPhaseIndex,
        opts: queuedAt,
        queuedAt: queuedAt_2,
        provenanceOn: provenanceEnabled,
      }))
    )
      return null;
    let agentModel = getAgentModel(
      getExploreAgentModel(mcpServers, agentContext.options.mainLoopModel),
      agentContext.options.mainLoopModel,
      model,
      toolPermissionContext.mode,
      undefined,
      {
        inWorkflowRun: toolUseId !== undefined,
      },
    );
    let isAutoMode = toolPermissionContext.mode === "auto";
    let isArbiterMode = syntheticOutput === undefined && isSerializedArbiter(toolPermissionContext.mode);
    let structuredOutputReview =
      syntheticOutput !== undefined && isArbiterStructuredOutputReviewOn(toolPermissionContext.mode);
    let ownerKey = null;
    if (queuedAt?.isolation === "worktree" && isWebFetchAgent(mcpServers))
      logForDebugging(
        "[web-fetch agent] isolation:'worktree' ignored; the built-in web-fetch agent always runs as a local agent",
      );
    else if (queuedAt?.isolation === "worktree") {
      let callKeyLabel = toolUseId ? `${toolUseId}-${idx}` : `wf-${idx}`;
      ownerKey = await worktreeGate(callKeyLabel, {
        storageV5: agentContext.storageV5,
        credentials: agentContext.credentials,
      });
    }
    let worktreePath = ownerKey?.worktreePath;
    let requestSource = provenanceEnabled
      ? classifyWorkflowRequestSource(context.messages, context.agentId)
      : null;
    let framing = requestSource?.kind === "relay" ? userRequestFraming(requestSource) : null;
    let framedPrompt = `${!provenanceEnabled ? prompt : requestSource?.kind === "automated" ? automatedTriggerFramingWithContext(prompt) : withHarnessFraming(prompt)}${preambleFor(prompt)}`;
    let ownerPath = ownerKey
      ? `${framedPrompt}

---
You are running in an isolated git worktree at \`${flattenForFraming(ownerKey.worktreePath)}\` (a separate working copy of the repo). Changes you make here do NOT affect the main working directory (\`${flattenForFraming(getCwd())}\`) or other agents. Work normally \u2014 the worktree will be cleaned up automatically if you made no changes, or preserved for review if you did.`
      : framedPrompt;
    let retryCount = 0;
    let backgroundCount = 0;
    let otherCount = 0;
    let startedAt = Date.now();
    let promptPreview = previewAgentValue(prompt);
    let joined = [
      agentModel ?? "",
      String(mcpServers.effort ?? getEffortValue(agentContext) ?? ""),
      mcpServers.agentType,
      structuredOutputTool.map((toolNameList) => toolNameList.name).join(","),
      queuedAt?.schema ? jsonStringify(queuedAt.schema) : "",
      worktreePath ?? getCwd(),
    ].join(`
`);
    let step;
    async function runAgentAttempt(agentOptions, signal, abortSignal, attempt, attemptNumber) {
      let agentId = makeSaltedName();
      provenanceOn(agentId);
      starting.started({
        agentId,
        model: agentModel,
      });
      let agentProgress = {
        agentId,
        parentAgentId: isMainAgent(gate) ? undefined : gate?.agentId,
        depth: getAgentDepth(gate) + 1,
        parentSessionId: getParentSessionId(),
        agentType: "subagent",
        subagentName: mcpServers.agentType,
        workflowRunId: toolUseId,
        workflowName,
        workflowWaitsOutUsageLimit: (model) => limitWaiter.wouldWait(model),
        isAsync: false,
        isBuiltIn: isBuiltInAgent(mcpServers),
        isBackgroundAgent: true,
        invokingRequestId,
        invocationKind: "spawn",
        invocationEmitted: false,
        parentPromptId,
      };
      let toolUseID = `workflow_agent_${idx}_${agentId}`;
      let modelOverride;
      let permissionMode;
      let progressData;
      let firstSeenAt = new Map();
      let lastProgressAt = new Map();
      let fallbackModel;
      let model_2 = agentModel;
      let agentModelName = agentModel ? stripAnyVersatileSuffix(agentModel) : undefined;
      let onState = (state, newState) =>
        emitProgress({
          type: "progress",
          toolUseID,
          data: {
            type: "workflow_agent",
            index: idx,
            label: abortSignal,
            phaseIndex: ownPhaseIndex,
            phaseTitle: ownPhaseTitle,
            agentId,
            agentType: requestedAgentType?.agentType,
            isolation: ownerKey ? "worktree" : undefined,
            model: agentModel,
            fallbackModel,
            state,
            startedAt,
            queuedAt: queuedAt_2,
            attempt,
            lastAttemptReason: attemptNumber === "rate_limited" ? "throttled" : attemptNumber,
            lastToolName: modelOverride,
            lastToolSummary: permissionMode,
            promptPreview,
            promptFramed: provenanceEnabled,
            lastProgressAt: Date.now(),
            ...newState,
          },
        });
      let abortController = new AbortController();
      let signal_2 = agentContext.abortController?.signal;
      let abortWorkflow = () => abortController.abort(new DOMException("workflow-abort", "AbortError"));
      signal_2?.addEventListener("abort", abortWorkflow);
      if (signal_2?.aborted) abortController.abort(new DOMException("workflow-abort", "AbortError"));
      let skipAgent = () => abortController.abort(new DOMException("user-skip", "AbortError"));
      slot?.addEventListener("abort", skipAgent);
      if (slot?.aborted) skipAgent();
      let lastAgentResult;
      let skippedCount = 0;
      let min = Math.min(opts * 0.1, 1000);
      let onAbort = () => {
        lastAgentResult?.clear();
        if (opts > 0)
          lastAgentResult = setMonotonicTimeout(
            abortStalled.bind(undefined, abortController),
            opts,
            agentOptions.host.clock,
            {
              unref: false,
            },
          );
      };
      let announcedPhases = new Set();
      let toolUseTracker = emptyWorkflowToolUseTracker();
      let onPhase = () => {
        if (announcedPhases.size === 0 && lastAgentResult === undefined) onAbort();
      };
      let onLog = () => {
        if (announcedPhases.size > 0) return;
        let now = Date.now();
        if (now - skippedCount < min) return;
        skippedCount = now;
        onAbort();
      };
      let logFn = {
        ...agentContext,
        abortController,
        ...(bashCommandClamp !== undefined &&
          bashCommandClamp.length > 0 && {
            permissionLayers: [
              ...(agentContext.permissionLayers ?? []),
              {
                kind: "bash_command_clamp",
                rules: bashCommandClamp,
              },
            ],
          }),
      };
      rebaseHookOriginForAgent(
        {
          toolUseContext: logFn,
        },
        isRewritten,
      );
      onState(
        "start",
        retryCount || backgroundCount
          ? {
              tokens: retryCount,
              toolCalls: backgroundCount,
            }
          : undefined,
      );
      onAbort();
      let lastAgentEntry;
      let agentStart;
      let callKeyCache = new Map();
      let currentResult;
      let journalHitUsed = false;
      let callKeyState = new Map();
      let journalSuppressed = false;
      let blockedAgents = isAutoMode ? [] : undefined;
      let onAgentResult = (result) => {
        if (result) foreignArtifactSeen = true;
      };
      onAgentResult(
        signal.includes(ARTIFACT_CONTENT_AUTHORED_TAG) ||
          (framing?.includes(ARTIFACT_CONTENT_AUTHORED_TAG) ?? false),
      );
      let nextIdx;
      let agentSeq = 0;
      let toolCallsDelta = 0;
      let reportProgress = (preferredPhase, shouldEmit = true) => {
        let isHiddenPhase = () => false;
        let entriesForPhase = (phaseTitle) => [
          ...((phaseTitle === undefined ? undefined : firstSeenAt.get(phaseTitle)?.values()) ?? []),
        ];
        let hasVisibleEntry = (phaseTitle) =>
          entriesForPhase(phaseTitle).some((entry) => isHiddenPhase(entry.phase));
        let hasAnyEntry = (phaseTitle) => entriesForPhase(phaseTitle).length > 0;
        let phaseTitle =
          (preferredPhase !== undefined && hasVisibleEntry(preferredPhase) ? preferredPhase : undefined) ??
          [...firstSeenAt.keys()].findLast(hasVisibleEntry) ??
          (preferredPhase !== undefined && hasAnyEntry(preferredPhase) ? preferredPhase : undefined) ??
          [...firstSeenAt.keys()].findLast(hasAnyEntry);
        let lastProgressEntry = phaseTitle === undefined ? [...lastProgressAt.entries()].at(-1) : undefined;
        let phaseEntries = entriesForPhase(phaseTitle);
        let visibleEntry =
          phaseEntries.findLast((entry) => isHiddenPhase(entry.phase)) ?? phaseEntries.at(-1);
        let progress =
          visibleEntry !== undefined
            ? {
                id: phaseTitle,
                name: visibleEntry.name,
                summary: describeWorkflowStep(visibleEntry.input, visibleEntry.name) || undefined,
              }
            : lastProgressEntry !== undefined
              ? {
                  id: lastProgressEntry[0],
                  ...lastProgressEntry[1],
                }
              : undefined;
        progressData = progress?.id;
        if (progress?.name === modelOverride && progress?.summary === permissionMode) return;
        modelOverride = progress?.name;
        permissionMode = progress?.summary;
        if (shouldEmit)
          onState("progress", {
            tokens: retryCount + agentSeq,
            toolCalls: backgroundCount + toolCallsDelta,
          });
      };
      let structuredOutputCalls = 0;
      let structuredOutputFailures = 0;
      let lastStructuredOutputInput;
      let lastStructuredOutputError;
      let structuredOutputIds = new Set();
      let structuredOutputReviewRecords = new Map();
      let deliveredId;
      let responseNumber = 0;
      let lastOtherToolCallAt = 0;
      let MAX_STRUCTURED_OUTPUT_RETRIES_2 =
        env.MAX_STRUCTURED_OUTPUT_RETRIES ?? MAX_STRUCTURED_OUTPUT_RETRIES;
      let now = Date.now();
      let webFetchSavedFiles = isWebFetchAgent(mcpServers) ? defaultToolResultsStorage() : undefined;
      try {
        description?.(agentId, abortController);
        await runWithCwdOverride(agentProgress, async () => {
          for await (let record of runAgent({
            agentDefinition: isArbiterMode
              ? withSystemPromptSuffix(mcpServers, WORKFLOW_HANDBACK_NOTE)
              : mcpServers,
            turnPrompt: signal,
            promptMessages:
              framing === null
                ? [
                    createUserMessage({
                      content: signal,
                    }),
                  ]
                : [
                    createUserMessage({
                      content: framing,
                    }),
                    createUserMessage({
                      content: signal,
                    }),
                  ],
            toolUseContext: logFn,
            session: agentOptions,
            canUseTool,
            isAsync: false,
            querySource: getQuerySourceForAgent(mcpServers.agentType, isBuiltInAgent(mcpServers)),
            spawnedBySkill: agentContext.options.spawnedBySkill ?? agentContext.options.activeSkill,
            spawnedByForkedSkill: agentContext.options.spawnedByForkedSkill,
            availableTools: structuredOutputTool,
            requiresStructuredOutput: syntheticOutput !== undefined,
            structuredOutputIsHandback: structuredOutputReview,
            ...(isArbiterMode && {
              handbackOptIn: true,
              handbackTool: createSubagentHandbackTool(agentId, (handback) => {
                if (agentStart === undefined) {
                  agentStart = handback;
                  return true;
                }
                if (
                  (agentStart.review === null && handback.review !== null) ||
                  (agentStart.review === undefined && handback.review?.kind === "flagged")
                )
                  agentStart = {
                    ...agentStart,
                    review: handback.review,
                    noVerdict: handback.noVerdict,
                  };
                return false;
              }),
              callerDeliveredReport: () =>
                agentStart === undefined
                  ? undefined
                  : [
                      ...(agentStart.review ? [agentStart.review.warning] : []),
                      ...(agentStart.noVerdict
                        ? [structuredOutputUnjudgedWarning(agentStart.noVerdict).warning]
                        : []),
                      sanitizeSubagentOutput(agentStart.message).sanitized,
                    ].join(`

`),
            }),
            transcriptSubdir: toolUseId ? `${WORKFLOW_TRANSCRIPT_SUBDIR}/${toolUseId}` : undefined,
            spawnedByWorkflowRunId: toolUseId,
            description: progressFields.label,
            workflowPhase: progressFields.phase,
            override: {
              agentId,
              agentContext: agentProgress,
            },
            persistedToolResultFiles: webFetchSavedFiles,
            model,
            onModelRestricted: makeModelNotice(label),
            onQueryProgress: onLog,
            worktreePath,
          })) {
            if (record.type === "attachment" && record.attachment.type === "structured_output") {
              nextIdx = record.attachment.data;
              deliveredId = record.attachment.toolUseID;
              continue;
            }
            if (record.type === "attachment") onAgentResult(containsUntrustedArtifactContent(record));
            if (record.type === "api_metrics") {
              if (record.event.type === "start") step?.responded();
              continue;
            }
            if (record.type === "query_model_change") {
              model_2 = record.toModel;
              continue;
            }
            if (record.type === "set_in_progress_tool_use_ids") {
              if (record.op.action === "remove") {
                for (let id of record.op.ids) announcedPhases.delete(id);
                onPhase();
              }
              continue;
            }
            if (record.type === "user") {
              blockedAgents?.push(record);
              onAgentResult(containsUntrustedArtifactContent(record));
              let handbackRecords = [];
              if (Array.isArray(record.message.content))
                for (let block of record.message.content) {
                  if (block.type !== "tool_result") continue;
                  let record = callKeyState.get(block.tool_use_id);
                  callKeyState.delete(block.tool_use_id);
                  if (record !== undefined && !handbackRecords.includes(record)) handbackRecords.push(record);
                }
              for (let toolName of toolsUsedForSummary([...handbackRecords, record]))
                recordAgentTool(agentId, toolName);
              let content = record.message.content;
              if (Array.isArray(content)) {
                for (let block of content)
                  if (typeof block === "object" && block?.type === "tool_result") {
                    announcedPhases.delete(block.tool_use_id);
                    settleWorkflowToolUse(
                      toolUseTracker,
                      block.tool_use_id,
                      record.isVirtual === true,
                      block.is_error === true,
                    );
                    if (structuredOutputIds.delete(block.tool_use_id) && block.is_error) {
                      structuredOutputFailures++;
                      lastStructuredOutputError =
                        extractToolErrorExcerpt(block.content) ?? lastStructuredOutputError;
                    }
                  }
                onPhase();
                if (
                  structuredOutputFailures > 0 &&
                  structuredOutputFailures >= MAX_STRUCTURED_OUTPUT_RETRIES_2 &&
                  nextIdx === undefined
                ) {
                  let errorNote =
                    lastStructuredOutputError === undefined
                      ? ""
                      : ` \u2014 last StructuredOutput error: ${lastStructuredOutputError}`;
                  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `agent({schema}): StructuredOutput retry cap (${MAX_STRUCTURED_OUTPUT_RETRIES_2}) exceeded \u2014 ` +
                      `${structuredOutputFailures} failed ${plural(structuredOutputFailures, "call")} with no valid output` +
                      errorNote,
                    "Workflow agent({schema}) StructuredOutput retry cap exceeded",
                  );
                }
              }
              continue;
            }
            if (record.type === "assistant") {
              if (record.streamWatchdogGaveUp) {
                logForDebugging(
                  `workflow agent [${abortSignal}] ended with "${extractTextContent_2(record.message.content, " ")}"; treating it as a stall`,
                  {
                    level: "warn",
                  },
                );
                journalSuppressed = true;
                let dOMException = new DOMException("stalled", "AbortError");
                abortController.abort(dOMException);
                throw dOMException;
              }
              lastAgentEntry = record;
              if (!record.isApiErrorMessage && record.message.id !== currentResult) {
                currentResult = record.message.id;
                journalHitUsed = false;
                responseNumber++;
              }
              for (let block of record.message.content) {
                if (block.type === "tool_use") callKeyState.set(block.id, record);
                if (
                  block.type === "tool_use" &&
                  block.name === SUBAGENTHANDBACK &&
                  agentContract(agentId) === true
                )
                  callKeyCache.set(block.id, record.message.id);
                else if (
                  block.type === "tool_use" ||
                  block.type === "server_tool_use" ||
                  block.type === "mcp_tool_use"
                ) {
                  journalHitUsed = true;
                  if (block.type !== "tool_use" || block.name !== STRUCTUREDOUTPUT)
                    lastOtherToolCallAt = responseNumber;
                }
              }
              blockedAgents?.push(record);
              onAgentResult(containsUntrustedArtifactContent(record));
              for (let block of record.message.content)
                if (block.type === "tool_use" || block.type === "server_tool_use")
                  recordAgentTool(agentId, canonicalToolName(block.name.trim()));
              if (!record.isApiErrorMessage) {
                step?.responded();
                let usage =
                  record.isUnmetered === true
                    ? undefined
                    : finalContextTokensFromLastResponse(record.message.usage);
                if (usage) agentSeq = getTokenCountFromUsage(usage);
                let model = record.message.model;
                if (model && agentModelName && isForeignModelMessage(record, agentModelName))
                  fallbackModel = model;
              }
              let toolUseCount = 0;
              let skippedToolUseCount = 0;
              for (let block of record.message.content) {
                if (block.type !== "tool_use") continue;
                let isSkipped = false;
                toolUseCount++;
                if (isSkipped) skippedToolUseCount++;
                announcedPhases.add(block.id);
                modelOverride = block.name;
                permissionMode = describeWorkflowStep(block.input, block.name) || undefined;
                progressData = block.id;
                if (block.name === STRUCTUREDOUTPUT) {
                  structuredOutputCalls++;
                  lastStructuredOutputInput = block.input;
                  structuredOutputIds.add(block.id);
                  if (structuredOutputReview && !structuredOutputReviewRecords.has(block.id))
                    structuredOutputReviewRecords.set(block.id, {
                      response: record,
                      written: clone(block.input),
                      responseNumber,
                    });
                  if (nextIdx !== undefined && structuredOutputCalls > 2) {
                    abortController.abort("stalled");
                    break;
                  }
                }
              }
              toolCallsDelta += toolUseCount - skippedToolUseCount;
              if (toolUseCount > 0) {
                lastAgentResult?.clear();
                lastAgentResult = undefined;
              } else onLog();
              onState("progress", {
                tokens: retryCount + agentSeq,
                toolCalls: backgroundCount + toolCallsDelta,
              });
            }
          }
        });
      } catch (error) {
        let abortReason = abortController.signal.aborted
          ? unwrapAbortReason(abortController.signal.reason)
          : undefined;
        if (abortReason === "stalled" || abortReason === "user-retry") {
          if (abortReason === "stalled" && nextIdx !== undefined) {
            let stalledElapsedMs = Date.now() - now;
            onState("done", {
              tokens: retryCount + agentSeq,
              toolCalls: backgroundCount + toolCallsDelta,
              durationMs: otherCount + stalledElapsedMs,
              resultPreview: previewAgentValue(nextIdx),
            });
            adoptSubagentPublishArmsAsync(agentId, logFn);
            return {
              structured: nextIdx,
              text: "",
              agentMessages: blockedAgents,
              toolReportReview: structuredOutputReview
                ? await judgeStructuredOutputVerdict({
                    calls: structuredOutputReviewRecords,
                    deliveredId,
                    delivered: nextIdx,
                    lastOtherToolCallAt,
                    context: agentContext,
                  })
                : undefined,
              tokens: agentSeq,
              toolCalls: toolCallsDelta,
              stalled: false,
              skipped: false,
              durationMs: stalledElapsedMs,
              stopReason: undefined,
              outputTokens: undefined,
              structuredOutputAttempts: structuredOutputCalls,
              lastStructuredOutputInput,
            };
          }
          onState("error", {
            error:
              abortReason === "stalled"
                ? journalSuppressed
                  ? "reply lost \u2014 the response stream went silent and Claude Code gave up waiting for it"
                  : `stalled \u2014 no progress for ${opts}ms`
                : "retry requested by user",
            tokens: retryCount + agentSeq,
            toolCalls: backgroundCount + toolCallsDelta,
            durationMs: otherCount + (Date.now() - now),
          });
          return {
            structured: undefined,
            text: "",
            agentMessages: blockedAgents,
            tokens: agentSeq,
            toolCalls: toolCallsDelta,
            stalled: true,
            stalledReason: abortReason,
            replyLost: abortReason === "stalled" && journalSuppressed,
            skipped: false,
            durationMs: Date.now() - now,
            stopReason: undefined,
            outputTokens: undefined,
            structuredOutputAttempts: structuredOutputCalls,
            lastStructuredOutputInput,
          };
        }
        if (abortReason === "user-skip") {
          onState("error", {
            error: "skipped by user",
            skipped: true,
            tokens: retryCount + agentSeq,
            toolCalls: backgroundCount + toolCallsDelta,
            durationMs: otherCount + (Date.now() - now),
          });
          return {
            structured: undefined,
            text: "",
            agentMessages: blockedAgents,
            tokens: agentSeq,
            toolCalls: toolCallsDelta,
            stalled: false,
            skipped: true,
            durationMs: Date.now() - now,
            stopReason: undefined,
            outputTokens: undefined,
            structuredOutputAttempts: structuredOutputCalls,
            lastStructuredOutputInput,
          };
        }
        onState("error", {
          error: error instanceof Error ? error.message : String(error),
          tokens: retryCount + agentSeq,
          toolCalls: backgroundCount + toolCallsDelta,
          durationMs: otherCount + (Date.now() - now),
        });
        throw error;
      } finally {
        lastAgentResult?.clear();
        signal_2?.removeEventListener("abort", abortWorkflow);
        slot?.removeEventListener("abort", skipAgent);
        description?.(agentId, null);
      }
      let lastEntry = lastAgentEntry;
      let finalText =
        agentStart?.message ??
        (lastEntry
          ? extractTextContent_2(
              lastEntry.message.content,
              `
`,
            )
          : "");
      let endedWithApiError = lastEntry?.isApiErrorMessage === true && agentStart === undefined;
      let handbackResponseId =
        agentStart?.toolUseId === undefined ? undefined : callKeyCache.get(agentStart.toolUseId);
      let handbackUsedInLastResponse =
        Boolean(handbackResponseId) && handbackResponseId === currentResult && !journalHitUsed;
      if (agentContract(agentId) && !endedWithApiError)
        if (agentStart === undefined)
          logFeatureSad(
            "workflow_handback_tool",
            callKeyCache.size > 0
              ? "handback_call_refused"
              : finalText === ""
                ? "no_final_text"
                : "plain_text_ending",
          );
        else
          logFeatureOk("workflow_handback_tool", {
            flagged: agentStart.review?.kind === "flagged",
          });
      let outputText;
      if (endedWithApiError)
        outputText = truncateClassifierReason(
          sanitizeSubagentOutput(finalText, {
            prependMarker: false,
          }).sanitized,
        );
      else {
        outputText = sanitizeSubagentOutput(finalText).sanitized;
        if (webFetchSavedFiles)
          outputText = `${outputText}

${webFetchHarnessNote(webFetchSavedFiles)}`;
      }
      let usage = lastEntry?.message.usage;
      let outputTokens = usage && typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;
      let elapsedMs = Date.now() - now;
      let usage_2 = lastEntry?.isUnmetered === true ? undefined : lastEntry?.message.usage;
      let agentTokens =
        agentSeq || getTokenCountFromUsage(finalContextTokensFromLastResponse(usage_2) ?? EMPTY_USAGE);
      let tokens = retryCount + agentTokens;
      if (!isApiErrorDisplayMessage(lastEntry) || agentStart !== undefined)
        adoptSubagentPublishArmsAsync(agentId, logFn);
      if (lastEntry !== undefined && endedWithApiError) {
        let errorText = outputText || "API error";
        let apiError =
          lastEntry.error === "rate_limit"
            ? {
                kind: "rate_limit",
                text: errorText,
                model: model_2,
                quotaLimits: lastEntry.quotaLimits,
              }
            : {
                kind: "other",
                text: errorText,
              };
        onState("error", {
          error: errorText,
          tokens,
          toolCalls: backgroundCount + toolCallsDelta,
          durationMs: otherCount + elapsedMs,
        });
        return {
          structured: nextIdx,
          text: outputText,
          agentMessages: blockedAgents,
          apiError,
          tokens: agentTokens,
          toolCalls: toolCallsDelta,
          stalled: false,
          skipped: false,
          durationMs: elapsedMs,
          stopReason: lastEntry.message.stop_reason,
          outputTokens,
          structuredOutputAttempts: structuredOutputCalls,
          lastStructuredOutputInput,
        };
      }
      onState("done", {
        tokens,
        toolCalls: backgroundCount + toolCallsDelta,
        durationMs: otherCount + elapsedMs,
        resultPreview: previewAgentValue(syntheticOutput ? nextIdx : outputText),
      });
      return {
        structured: nextIdx,
        text: outputText,
        agentMessages: blockedAgents,
        toolReportReview:
          agentStart !== undefined
            ? agentStart.review === null && !handbackUsedInLastResponse
              ? undefined
              : agentStart.review
            : structuredOutputReview
              ? await judgeStructuredOutputVerdict({
                  calls: structuredOutputReviewRecords,
                  deliveredId,
                  delivered: nextIdx,
                  lastOtherToolCallAt,
                  context: agentContext,
                })
              : undefined,
        ...(agentStart?.noVerdict !== undefined && {
          toolReportUnjudged: structuredOutputUnjudgedWarning(agentStart.noVerdict),
        }),
        ...(agentStart !== undefined && {
          toolReportAgentId: agentId,
        }),
        tokens: agentTokens,
        toolCalls: toolCallsDelta,
        stalled: false,
        skipped: false,
        durationMs: elapsedMs,
        stopReason: lastEntry?.message.stop_reason,
        outputTokens,
        structuredOutputAttempts: structuredOutputCalls,
        lastStructuredOutputInput,
        webFetchSavedFiles,
      };
    }
    let rateLimitRetries = 0;
    function runAttemptInWorktree(ownerPath, attemptLabel, baseAttemptNumber, attemptKind) {
      let projectSession = agentContext.session.withProject({
        cwd: worktreePath,
      });
      return resolveFromCwd(getSessionProject(projectSession).cwd, () =>
        runAgentAttempt(
          projectSession,
          ownerPath,
          attemptLabel,
          baseAttemptNumber + rateLimitRetries,
          attemptKind,
        ),
      );
    }
    let limitFailureNote;
    async function waitOutRateLimit(result, attemptLabel) {
      function reportQueued(result, extra) {
        emitProgress({
          type: "progress",
          toolUseID: `workflow_agent_${idx}_queued`,
          data: {
            type: "workflow_agent",
            index: idx,
            label,
            phaseIndex: ownPhaseIndex,
            phaseTitle: ownPhaseTitle,
            agentType: requestedAgentType?.agentType,
            isolation: ownerKey ? "worktree" : undefined,
            model: agentModel,
            queuedAt: Date.now(),
            tokens: retryCount + result.tokens,
            toolCalls: backgroundCount + result.toolCalls,
            promptPreview,
            promptFramed: provenanceEnabled,
            lastProgressAt: Date.now(),
            ...extra,
          },
        });
      }
      let current = result;
      while (current.apiError?.kind === "rate_limit") {
        let error = current.apiError.text;
        let joined = limitWaiter.join(current.apiError.quotaLimits);
        if (joined.outcome === "declined") {
          limitFailureNote = joined.failureNote;
          return current;
        }
        if (joined.outcome === "aborted") throw Error("Workflow aborted");
        reportQueued(current, {
          state: "start",
        });
        let ended = await joined.ended;
        if (ended === "aborted") throw Error("Workflow aborted");
        if (ended === "revoked") {
          limitFailureNote = "usage-limit wait turned off";
          reportQueued(current, {
            state: "error",
            error,
            durationMs: otherCount + current.durationMs,
          });
          return current;
        }
        if (slot?.aborted) return current;
        retryCount += current.tokens;
        backgroundCount += current.toolCalls;
        otherCount += current.durationMs;
        startedAt = Date.now();
        rateLimitRetries++;
        current = await withWarmupGate(() =>
          runAttemptInWorktree(ownerPath, `${label}${USAGE_LIMIT_SUFFIX}`, attemptLabel, "rate_limited"),
        );
      }
      return current;
    }
    async function withWarmupGate(fn) {
      let gate = await currentWarmupGate().enter(joined, {
        capMs: prefixStaggerMs(),
        signal: agentContext.abortController?.signal,
      });
      step = gate;
      if (gate.waitedMs > 0)
        logForDebugging(
          `workflow agent [${label}] held ${gate.waitedMs}ms for a same-prefix sibling's first response (prompt-cache warm-up)`,
        );
      try {
        return await fn();
      } finally {
        gate.done();
      }
    }
    let rateLimitDenial;
    let stallReasons = [];
    let lostTotals = {
      maxContextTokens: 0,
      toolCalls: 0,
      durationMs: 0,
    };
    let restartCount = 0;
    let outcome;
    let threw = false;
    try {
      let current = await withWarmupGate(() => runAttemptInWorktree(ownerPath, label, 1));
      current = await waitOutRateLimit(current, 1);
      let isDegradedResponse = (result) =>
        !result.stalled &&
        !result.skipped &&
        result.stopReason == null &&
        result.structured === undefined &&
        (result.outputTokens ?? 1 / 0) < 50 &&
        result.durationMs > Math.min(opts * 0.5, MAX_AGENT_DURATION_WATCHDOG_MS);
      let wasDegraded = isDegradedResponse(current);
      if (wasDegraded) {
        emitProgress({
          type: "progress",
          toolUseID: "workflow_log",
          data: {
            type: "workflow_log",
            message:
              `[${label}] throttled response (no stop_reason, ${current.outputTokens ?? "?"} output tokens in ${Math.round(current.durationMs / 1000)}s) \u2014 ` +
              "sleeping 45s before retry",
          },
        });
        await sleep(45000, agentContext.abortController?.signal, {
          throwOnAbort: true,
        });
        retryCount += current.tokens;
        backgroundCount += current.toolCalls;
        otherCount += current.durationMs;
        current = await waitOutRateLimit(
          await runAttemptInWorktree(ownerPath, `${label} (throttle-retry)`, 2, "throttled"),
          2,
        );
        if (isDegradedResponse(current))
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${label}] throttle-retry also degraded \u2014 ` + "giving up on throttle backoff",
            },
          });
      }
      for (let idx = 1; current.stalled && !wasDegraded && idx <= MAX_STALLED_AGENT_RETRIES; idx++) {
        recordStalledAgent(stallReasons, lostTotals, current);
        if (agentContext.abortController?.signal.aborted) throw Error("Workflow aborted");
        restartCount++;
        let stalledReason = current.stalledReason ?? "stalled";
        let stallText =
          stalledReason === "user-retry"
            ? "retry requested by user"
            : current.replyLost
              ? "lost its reply (Claude Code gave up waiting on a silent response stream)"
              : "stalled (no progress)";
        let extraNote = "";
        if (
          stalledReason === "stalled" &&
          current.structuredOutputAttempts > 0 &&
          current.structured === undefined
        ) {
          let inputJson = jsonStringify(current.lastStructuredOutputInput);
          let shortInput = inputJson.length > 300 ? truncateToLength(inputJson, 300) + "\u2026" : inputJson;
          extraNote = ` \u2014 ${current.structuredOutputAttempts} StructuredOutput validation ${plural(current.structuredOutputAttempts, "failure")} (last input: ${shortInput})`;
        }
        emitProgress({
          type: "progress",
          toolUseID: "workflow_log",
          data: {
            type: "workflow_log",
            message: `[stall] agent "${label}" ${stallText} after ${Math.round(current.durationMs / 1000)}s${extraNote} \u2014 retrying (${idx}/${MAX_STALLED_AGENT_RETRIES})`,
          },
        });
        retryCount += current.tokens;
        backgroundCount += current.toolCalls;
        otherCount += current.durationMs;
        current = await waitOutRateLimit(
          await runAttemptInWorktree(ownerPath, `${label} (retry ${idx})`, idx + 1, stalledReason),
          idx + 1,
        );
      }
      if (current.stalled) recordStalledAgent(stallReasons, lostTotals, current);
      outcome = current.skipped
        ? "skipped"
        : current.stalled
          ? wasDegraded
            ? "stalled_after_throttle"
            : "retries_exhausted"
          : current.apiError
            ? "api_error"
            : "completed";
      if (current.skipped) return null;
      if (current.stalled) {
        let attemptCount = stallReasons.length;
        let all = stallReasons.every((reason) => reason === "user-retry");
        let all_2 = stallReasons.every((reason) => reason === "stalled");
        let all_3 = stallReasons.every((reason) => reason === "reply lost");
        let structuredNote =
          current.stalledReason !== "user-retry" &&
          current.structuredOutputAttempts > 0 &&
          current.structured === undefined
            ? ` \u2014 ${current.structuredOutputAttempts} StructuredOutput validation ${plural(current.structuredOutputAttempts, "failure")} on the last attempt`
            : "";
        throw Error(
          all
            ? `agent abandoned: user requested retry on all ${attemptCount} attempts`
            : all_2
              ? `agent stalled on all ${attemptCount} attempts (no progress for ${opts}ms each)${structuredNote}`
              : all_3
                ? `agent lost its reply on all ${attemptCount} attempts (Claude Code gave up waiting on a silent response stream each time)${structuredNote}`
                : `agent abandoned after ${attemptCount} attempts (${stallReasons.join(" \u2192 ")})${structuredNote}`,
        );
      }
      if (current.apiError?.kind === "rate_limit" && current.apiError.quotaLimits)
        rateLimitDenial = {
          model: current.apiError.model,
          limits: current.apiError.quotaLimits,
        };
      if (current.apiError) {
        let failureLine =
          limitFailureNote === undefined || current.apiError.kind !== "rate_limit"
            ? `[${label}] failed: ${current.apiError.text}`
            : `[${label}] failed: ${limitFailureNote}: ${current.apiError.text}`;
        logLine(failureLine, {
          log: true,
        });
        return null;
      }
      let structuredResult =
        syntheticOutput && current.structured !== undefined
          ? sanitizeStructuredOutput(current.structured, {
              reservedKeys: ["webFetchSavedFiles"],
            })
          : undefined;
      let toolPermissionContext = getToolPermissionContext(agentContext);
      if (toolPermissionContext.mode === "auto" || current.toolReportReview || current.toolReportUnjudged) {
        let verdict = await classifyHandoffIfNeeded({
          child: syntheticOutput ? "workflow_object" : "workflow_text",
          childAgentId: undefined,
          checkpoint: false,
          handback:
            current.toolReportReview === undefined
              ? undefined
              : current.toolReportReview === null
                ? "send"
                : "flagged",
          agentMessages: current.agentMessages ?? [],
          inheritedVerifiedHumanTurns: buildVerifiedHumanTurns(agentContext),
          tools: structuredOutputTool,
          rootToolSurface: context.rootToolSurface,
          toolPermissionContext,
          abortSignal: agentContext.abortController.signal,
          agentType: agentTypeForAnalyticsFromDefinition(mcpServers),
          totalToolUseCount: backgroundCount + current.toolCalls,
          finalResultText: syntheticOutput
            ? structuredResult !== undefined
              ? jsonStringify(structuredResult.value)
              : undefined
            : current.text,
          agentId: agentContext.agentId,
          storageV5: agentContext.storageV5,
          credentials: agentContext.credentials,
        }).catch((error) => {
          if (agentContext.abortController.signal.aborted) return current.toolReportUnjudged ?? null;
          logError(error);
          return {
            warning: buildSubagentClassifierUnavailableNote(""),
            kind: "unavailable",
          };
        });
        let isUnavailable =
          verdict === null ? toolPermissionContext.mode !== "auto" : verdict.kind === "unavailable";
        let review =
          current.toolReportReview ?? (isUnavailable ? (current.toolReportUnjudged ?? verdict) : verdict);
        if (review && review.kind !== "unavailable" && current.toolReportAgentId !== undefined)
          flagAgentContract(current.toolReportAgentId);
        if (review) {
          if (syntheticOutput) {
            let line = `[${label}] ${review.warning}`;
            logLine(line, {
              log: true,
            });
          } else {
            current.text = `${review.warning}

${current.text}`;
            if (review.kind !== "unavailable") {
              let line = `[${label}] ${review.warning}`;
              logLine(line, {
                log: true,
              });
            }
          }
        }
      }
      if (syntheticOutput) {
        if (structuredResult === undefined)
          throw Error(
            "agent({schema}): subagent completed without calling StructuredOutput (after in-conversation nudge)",
          );
        let structured = structuredResult.value;
        if (structuredResult.droppedReservedKeys > 0)
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${label}] Dropped a "webFetchSavedFiles" key the agent put in its structured output \u2014 that key is reserved for the harness's own record of files ${WEBFETCH} saved, and the agent cannot supply it.`,
            },
          });
        if (structuredResult.reportable.length > 0)
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${label}] ${flaggedOutputNotice(structuredResult.reportable)} (Matched in the string values or key names of the agent's structured output; neutralized there in place.)`,
            },
          });
        if (current.webFetchSavedFiles) {
          let isObject = isPlainObject(structured);
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${label}] ${webFetchHarnessNote(current.webFetchSavedFiles)}${isObject ? "" : " (The agent's structured result is not an object, so this record is not attached to it as webFetchSavedFiles \u2014 this log line is its only carrier.)"}`,
            },
          });
          if (isObject)
            return copyValue({
              ...structured,
              webFetchSavedFiles: {
                dirs: [...current.webFetchSavedFiles.dirs],
                paths: [...current.webFetchSavedFiles.paths],
              },
            });
        }
        return copyValue(structured);
      }
      return current.text;
    } catch (error) {
      threw = true;
      throw error;
    } finally {
      remoteBlockGate = rateLimitDenial;
      if (ownerKey) {
        let { worktreePath, worktreeBranch, headCommit, gitRoot, hookBased } = ownerKey;
        try {
          if (!hookBased && headCommit && !(await hasWorktreeChanges(worktreePath, headCommit)))
            await removeAgentWorktree(worktreePath, worktreeBranch, gitRoot, false, "workflow_tool");
          else if (gitRoot) await unlockAgentWorktree(worktreePath, gitRoot);
        } catch {}
      }
      if (stallReasons.length > 0)
        try {
          let signal = agentContext.abortController?.signal;
          let finalOutcome = !threw
            ? (outcome ?? "error")
            : outcome === "retries_exhausted" || outcome === "stalled_after_throttle"
              ? outcome
              : signal?.aborted
                ? unwrapAbortReason(signal.reason) === "background"
                  ? "backgrounded"
                  : "aborted"
                : outcome === "completed"
                  ? "failed_after_rerun"
                  : "error";
          let connectionFacts = isDiskless() ? undefined : connectionSetupFacts();
          logEvent("tengu_workflow_agent_stall_retries", {
            workflow_run_id: toolUseId === undefined ? undefined : sanitizeWorkflowRunId(toolUseId),
            agent_type: agentTypeForAnalyticsFromDefinition(mcpServers),
            restarts: restartCount,
            stalled_attempts: count(stallReasons, (reason) => reason === "stalled"),
            reply_lost_attempts: count(stallReasons, (reason) => reason === "reply lost"),
            user_retry_attempts: count(stallReasons, (reason) => reason === "user-retry"),
            outcome: fromEnum(finalOutcome),
            max_lost_context_tokens: lostTotals.maxContextTokens,
            lost_tool_calls: lostTotals.toolCalls,
            lost_duration_ms: lostTotals.durationMs,
            stall_window_ms: opts,
            api_provider: fromEnumOpt(connectionFacts?.provider),
            base_url: fromEnumOpt(connectionFacts?.base_url),
            base_url_gateway: fromEnumOpt(connectionFacts?.base_url_gateway),
            https_proxy: connectionFacts?.https_proxy,
          });
        } catch (error) {
          logForDebugging(`tengu_workflow_agent_stall_retries was not sent: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
    }
  }
  function normalizeProactivity(mode) {
    if (mode === "bubble") return;
    if (mode === "bypassPermissions") return "auto";
    return mode;
  }
  async function runAgentTask(idx, promptStr, label, phaseTitle, phaseIndex, opts, queuedAt, onAgentStarted) {
    let signal = agentContext.abortController?.signal;
    if (signal?.aborted) throw Error("Workflow aborted");
    enforceBudget();
    let provenanceOn = isPromptProvenanceEnabled();
    if (
      await reviewGateBlocks({
        idx,
        promptStr,
        label,
        ownPhaseTitle: phaseTitle,
        ownPhaseIndex: phaseIndex,
        opts,
        queuedAt,
        provenanceOn,
      })
    )
      return null;
    let spawnOutcome = await spawnAgentWithHooks({
      idx,
      promptStr,
      label,
      agent: WORKFLOW_SUBAGENT_DEFINITION,
      model: opts.model,
      permissionMode: getToolPermissionContext(agentContext).mode,
      evalSignal: undefined,
    });
    if (spawnOutcome === null) return null;
    using starting = spawnOutcome.starting;
    let { prompt, model } = spawnOutcome;
    if (
      prompt !== promptStr &&
      (await reviewGateBlocks({
        idx,
        promptStr: prompt,
        label,
        ownPhaseTitle: phaseTitle,
        ownPhaseIndex: phaseIndex,
        opts,
        queuedAt,
        provenanceOn,
      }))
    )
      return null;
    let saltedName = makeSaltedName();
    let now = Date.now();
    let promptPreview = previewAgentValue(prompt);
    let remoteSessionId;
    let emitRemoteProgress = (state, extra) =>
      emitProgress({
        type: "progress",
        toolUseID: `workflow_agent_${idx}_${saltedName}`,
        data: {
          type: "workflow_agent",
          index: idx,
          label,
          phaseIndex,
          phaseTitle,
          agentId: saltedName,
          isolation: "remote",
          remoteSessionId,
          state,
          startedAt: now,
          queuedAt,
          promptPreview,
          lastProgressAt: Date.now(),
          ...extra,
        },
      });
    let abortController = new AbortController();
    let abortWorkflow = () => abortController.abort(new DOMException("workflow-abort", "AbortError"));
    signal?.addEventListener("abort", abortWorkflow);
    if (signal?.aborted) abortController.abort(new DOMException("workflow-abort", "AbortError"));
    emitRemoteProgress("start");
    onAgentStarted(saltedName);
    let creationFailure;
    try {
      description?.(saltedName, abortController);
      let toolPermissionContext = getToolPermissionContext(agentContext);
      let { proactivityLevel } = agentContext.getAppState();
      let proactivityMode = cycleAllTeammateModes(
        toolPermissionContext.mode,
        proactivityLevel,
        hasLeftProactivityBaseline(toolPermissionContext),
      );
      let agentModel =
        model || getWorkflowSubagentModel() !== undefined || getDefaultSubagentModel() !== "inherit"
          ? getAgentModel(
              undefined,
              agentContext.options.mainLoopModel,
              model,
              toolPermissionContext.mode,
              makeModelNotice(label),
              {
                inWorkflowRun: toolUseId !== undefined,
              },
            )
          : undefined;
      let requestSource = provenanceOn
        ? classifyWorkflowRequestSource(context.messages, context.agentId)
        : null;
      let requestFraming = requestSource?.kind === "relay" ? userRequestFraming(requestSource) : null;
      if (
        prompt.includes(ARTIFACT_CONTENT_AUTHORED_TAG) ||
        (requestFraming?.includes(ARTIFACT_CONTENT_AUTHORED_TAG) ?? false)
      )
        foreignArtifactSeen = true;
      let initialMessage =
        (!provenanceOn
          ? prompt
          : requestSource?.kind === "automated"
            ? automatedTriggerFramingWithContext(prompt)
            : (requestFraming !== null
                ? requestFraming +
                  `

`
                : "") + withHarnessFraming(prompt)) + preambleFor(prompt);
      let remoteSession = await teleportToRemote({
        initialMessage,
        source: "workflow_remote_agent",
        tags: [WORKFLOW_REMOTE_AGENT],
        description: label,
        branchName: await ensureBranchPushed(),
        ...resolveProactivityOptions(normalizeProactivity(proactivityMode), proactivityLevel),
        model: agentModel,
        signal: abortController.signal,
        onBundleFail: (reason) => {
          creationFailure = reason;
        },
        onCreateFail: (reason) => {
          creationFailure = reason;
        },
        storageV5: agentContext.storageV5,
        credentials: agentContext.credentials,
      });
      if (!remoteSession) throw Error(creationFailure ?? "Failed to create cloud session");
      remoteSessionId = remoteSession.id;
      starting.started({
        agentId: saltedName,
        model: agentModel ?? getMainLoopModel(),
      });
      emitRemoteProgress("progress");
      let { text, structuredOutput, resultSubtype, usage, modelUsage, toolCalls } =
        await awaitRemoteSessionResult(remoteSessionId, abortController.signal, agentContext.credentials);
      let sanitized = sanitizeSubagentOutput(text).sanitized;
      if (text.includes(ARTIFACT_CONTENT_AUTHORED_TAG)) foreignArtifactSeen = true;
      for (let [key, value] of Object.entries(modelUsage ?? {}))
        addToTotalSessionCost(
          value.costUSD,
          {
            ...EMPTY_USAGE,
            input_tokens: value.inputTokens,
            output_tokens: value.outputTokens,
            output_tokens_details: {
              thinking_tokens: value.thinkingTokens ?? 0,
            },
            cache_read_input_tokens: value.cacheReadInputTokens,
            cache_creation_input_tokens: value.cacheCreationInputTokens,
            cache_creation: {
              ephemeral_5m_input_tokens: value.cacheCreationEphemeral5mInputTokens ?? 0,
              ephemeral_1h_input_tokens: value.cacheCreationEphemeral1hInputTokens ?? 0,
            },
            server_tool_use: {
              web_search_requests: value.webSearchRequests,
              web_fetch_requests: 0,
            },
          },
          key,
        );
      if (opts.schema && structuredOutput === undefined) {
        let missingOutputReason =
          resultSubtype === "error_max_structured_output_retries"
            ? "the cloud agent called StructuredOutput but no attempt produced a surviving valid output (failed schema validation, or retracted by a model fallback)"
            : resultSubtype && resultSubtype !== "success"
              ? `the cloud agent turn ended with result subtype '${resultSubtype}'`
              : "the cloud agent never called the StructuredOutput tool";
        throw Error(
          `agent({isolation:'remote', schema}) completed without structured output: ${missingOutputReason}.`,
        );
      }
      emitRemoteProgress("done", {
        tokens: usage ? getTokenCountFromUsage(usage) : 0,
        toolCalls,
        durationMs: Date.now() - now,
        resultPreview: previewAgentValue(opts.schema ? structuredOutput : sanitized),
      });
      if (opts.schema) return copyValue(structuredOutput);
      if (getToolPermissionContext(agentContext).mode === "auto" && sanitized) {
        let review = await classifyHandoffIfNeeded({
          child: "workflow_remote",
          childAgentId: undefined,
          checkpoint: false,
          agentMessages: [],
          inheritedVerifiedHumanTurns: buildVerifiedHumanTurns(agentContext),
          tools: context.options.tools,
          rootToolSurface: context.rootToolSurface,
          toolPermissionContext: getToolPermissionContext(agentContext),
          abortSignal: abortController.signal,
          agentType: lit(WORKFLOW_SUBAGENT_TYPE),
          totalToolUseCount: toolCalls,
          finalResultText: sanitized,
          agentId: agentContext.agentId,
          storageV5: agentContext.storageV5,
          credentials: agentContext.credentials,
        }).catch((error) => {
          if (abortController.signal.aborted) return null;
          logError(error);
          return {
            warning: buildSubagentClassifierUnavailableNote(""),
            kind: "unavailable",
          };
        });
        if (review) {
          if (review.kind !== "unavailable") {
            let line = `[${label}] ${review.warning}`;
            logLine(line, {
              log: true,
            });
          }
          return `${review.warning}

${sanitized}`;
        }
      }
      return sanitized;
    } catch (error) {
      if (remoteSessionId) archiveRemoteSession(remoteSessionId).catch(() => {});
      if (unwrapAbortReason(abortController.signal.reason) === "user-skip") {
        emitRemoteProgress("error", {
          error: "skipped by user",
          skipped: true,
          durationMs: Date.now() - now,
        });
        return null;
      }
      emitRemoteProgress("error", {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - now,
      });
      throw error;
    } finally {
      signal?.removeEventListener("abort", abortWorkflow);
      description?.(saltedName, null);
    }
  }
  let parallel = sealPrototype(async (fns) => {
    if (agentContext.abortController?.signal.aborted) return new Promise(() => {});
    let callKeyScope = createCallKeyScope("parallel");
    await sleep(0);
    if (!Array.isArray(fns)) throw TypeError("parallel() expects an array of functions");
    let fnSnapshot = snapshotArrayAcrossVm(passthrough(fns));
    if (fnSnapshot.length === 0) return copyValue([]);
    enforceAgentCap();
    enforceBudget();
    for (let fn of fnSnapshot)
      if (typeof fn !== "function")
        throw TypeError(
          "parallel() expects an array of functions, not promises. Wrap each call: () => agent(...)",
        );
    let settled = await Promise.allSettled(
      fnSnapshot.map((fn, index) => {
        try {
          return callKeyScope.inSlot(index, () => awaitValue(callFn(fn)));
        } catch (error) {
          return Promise.reject(error);
        }
      }),
    );
    callKeyScope.join();
    let droppedCount = 0;
    let mapped = settled.map((settled, index) => {
      if (settled.status === "fulfilled") return settled.value.v;
      let { name, msg } = describeThrownValue(settled.reason);
      if (name === "WorkflowBudgetExceededError") {
        droppedCount++;
        return null;
      }
      let failureLine = `parallel[${index}] failed: ${msg}`;
      logLine(failureLine, {
        log: true,
      });
      return null;
    });
    if (droppedCount > 0)
      logLines.push(
        `parallel: ${droppedCount} ${plural(droppedCount, "slot")} dropped \u2014 token budget exceeded`,
      );
    return copyValue(mapped);
  });
  let pipeline = sealPrototype(async (items, ...stages) => {
    if (agentContext.abortController?.signal.aborted) return new Promise(() => {});
    let callKeyScope = createCallKeyScope("pipeline");
    await sleep(0);
    if (!Array.isArray(items)) throw TypeError("pipeline() expects an array as the first argument");
    let itemSnapshot = snapshotArrayAcrossVm(passthrough(items));
    let stageSnapshot = snapshotArrayAcrossVm(stages);
    if (itemSnapshot.length === 0) return copyValue([]);
    enforceAgentCap();
    enforceBudget();
    for (let stage of stageSnapshot)
      if (typeof stage !== "function")
        throw TypeError("pipeline() stages must be functions: pipeline(items, item => ..., result => ...)");
    let settled = await Promise.allSettled(
      itemSnapshot.map((item, index) =>
        callKeyScope.inSlot(index, async () => {
          let itemValue = await awaitValue(item);
          for (let stage of stageSnapshot) {
            if (itemValue.v === null) break;
            itemValue = await awaitValue(callFn(stage, itemValue.v, item, index));
          }
          return itemValue;
        }),
      ),
    );
    callKeyScope.join();
    let droppedCount = 0;
    let mapped = settled.map((settled, index) => {
      if (settled.status === "fulfilled") return settled.value.v;
      let { name, msg } = describeThrownValue(settled.reason);
      if (name === "WorkflowBudgetExceededError") {
        droppedCount++;
        return null;
      }
      let failureLine = `pipeline[${index}] failed: ${msg}`;
      logLine(failureLine, {
        log: true,
      });
      return null;
    });
    if (droppedCount > 0)
      logLines.push(
        `pipeline: ${droppedCount} ${plural(droppedCount, "slot")} dropped \u2014 token budget exceeded`,
      );
    return copyValue(mapped);
  });
  let log = sealPrototype((value) => {
    emitProgress({
      type: "progress",
      toolUseID: "workflow_log",
      data: {
        type: "workflow_log",
        message: describeLogArg(value),
      },
    });
  });
  return {
    agent,
    parallel,
    pipeline,
    log,
    phase,
    resolvePhase: announcePhase,
    reservePhase: phaseIndexOf,
    recordFailure: (message) =>
      logLine(message, {
        log: false,
      }),
    getAgentCount: () => agentCount,
    getFailures: () => logLines,
    getForeignArtifactContent: () => foreignArtifactSeen,
    getToolsUsed: () =>
      isSillyShoreGateOn()
        ? uniq([...[...toolsUsedByAgent.keys()].flatMap(toolsUsedFor), ...usedConversationTools])
        : [],
    takeUsageLimitDenial: () => {
      let denial = remoteBlockGate;
      remoteBlockGate = undefined;
      return denial;
    },
    bindVMAwait: (vms) => {
      awaitValue = vms.settle;
      callFn = vms.call;
      copyValue = vms.clone;
      hostCopyFn = vms.sanitize;
      passthrough = vms.snapshot;
      safeGet = vms.getProp;
    },
    sanitizeVMValue: (value) => hostCopyFn(value),
    getVMProp: (target, key) => safeGet(target, key),
    withLanesInert: (fn) => callKeyStorage.run(frozenRootCallKey, fn),
  };
}
export { createWorkflowAgentRuntime, sanitizeWorkflowRunId };
