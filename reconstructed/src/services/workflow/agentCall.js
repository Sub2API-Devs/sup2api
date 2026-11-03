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

//@ chunk-41w44bgm.js:40004-40076 placement
/**
 * 合法的工作流运行 id 原样写入遥测，否则走兜底清洗。
 */
function sanitizeWorkflowRunId(workflowRunId) {
  return /^wf_[0-9a-f]{8}-[0-9a-f]{3}$/.test(workflowRunId)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(workflowRunId)
    : shortHash(workflowRunId);
}
//@ chunk-41w44bgm.js:40076-40127 placement
/**
 * 按 CPU 数推算默认并发（限制在 2–16）。
 */
function defaultAgentConcurrency(e) {
  return Math.min(16, Math.max(2, e - 2));
}
//@ chunk-41w44bgm.js:40127-40436 placement
/**
 * 工作流 agent() 的并发与调用上限：默认并发按 CPU 数推算（可由 CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS 覆盖），另一并发上限 50，调用总数上限 1000 及其报错文案。
 */
var DEFAULT_MAX_CONCURRENT_AGENTS = defaultAgentConcurrency(availableParallelism());
var AGENT_CONCURRENCY_CEILING = 50;
var AGENT_CALL_CAP = 1000;
var AGENT_CALL_CAP_MESSAGE =
  `Workflow agent() call cap reached (${AGENT_CALL_CAP}). This usually means a loop using budget.remaining() never terminates because ` +
  "no token budget was set \u2014 remaining() returns Infinity when budget.total is null. " +
  "Add a hard iteration cap to the loop, or pass a token budget.";
//@ chunk-41w44bgm.js:40436-40518 placement
class WorkflowAgentCapError extends Error {
  constructor() {
    super(AGENT_CALL_CAP_MESSAGE);
    this.name = "WorkflowAgentCapError";
  }
}
//@ chunk-41w44bgm.js:40518-40795 placement
class WorkflowBudgetExceededError extends Error {
  constructor(e, total) {
    super(
      `Workflow token budget exceeded (${e.toLocaleString()} / ${total.toLocaleString()} output tokens). Stopping further agent() calls. In-flight agents will complete; their results are preserved.`,
    );
    this.name = "WorkflowBudgetExceededError";
  }
}
//@ chunk-41w44bgm.js:40795-40806 placement
var MAX_PREVIEW_VALUE_CHARS = 400;
//@ chunk-41w44bgm.js:40806-40933 placement
function previewAgentValue(e) {
  if (e == null) return;
  let trimmed = (typeof e === "string" ? e : jsonStringify(e)).trim();
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
function recordStalledAgent(e, n, r) {
  e.push(r.replyLost ? "reply lost" : (r.stalledReason ?? "stalled"));
  n.maxContextTokens = Math.max(n.maxContextTokens, r.tokens);
  n.toolCalls += r.toolCalls;
  n.durationMs += r.durationMs;
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
  h,
  T,
  y,
  A,
  L,
  j,
  workflowName,
  invokingRequestId,
  parentPromptId,
  me,
  We,
) {
  let G = 0;
  let ce = async (U) => ({
    v: await U,
  });
  let E = (U, ...ee) => U(...ee);
  let s = (U) => clone(U);
  let S = (U) => U;
  let w = (U) => U;
  let P = (U, ee) => {
    try {
      return U === null || U === undefined ? undefined : U[ee];
    } catch {
      return;
    }
  };
  let V = {
    prev: "",
  };
  let N = Object.freeze({
    prev: "",
  });
  let se = new AsyncLocalStorage();
  let q = false;
  let ue = {
    inSlot: (U, ee) => ee(),
    join: () => {},
  };
  function Ee(U) {
    let ee = se.getStore();
    if (!L || ee === N) return ue;
    let Q = ee ?? V;
    let prev = Q.prev;
    Q.prev = childCallKey(prev, U, "fork");
    let Je = [];
    return {
      inSlot: (Re, Te) => {
        let it = {
          prev: childCallKey(prev, U, Re),
        };
        Je[Re] = it;
        return se.run(it, Te);
      },
      join: () => {
        Q.prev = childCallKey(
          Q.prev,
          U,
          Array.from(Je, (Re) => Re?.prev ?? ""),
        );
      },
    };
  }
  let flagWithOverride = readFlagWithOverride(WORKFLOW_JOURNAL_HOST_COPY_FLAG, {
    safe: true,
  });
  let ut = false;
  let Tt = false;
  let Wt = false;
  let ye = [];
  let gt = false;
  let Ut = new Map();
  let $t = new Set();
  let jt = (U, ee) => {
    let Q = Ut.get(U);
    if (Q === undefined) {
      Q = new Set();
      Ut.set(U, Q);
    }
    Q.add(readableToolName(ee));
  };
  let kt = (U) => [...(Ut.get(U ?? "") ?? [])].filter((ee) => getConversationToolsUsed().has(ee));
  let $e;
  let Se = (prompt) =>
    gt && !prompt.includes(ARTIFACT_CONTENT_AUTHORED_TAG)
      ? `

${relayedWorkflowPreamble(true).trimEnd()}`
      : "";
  let weakSet = new WeakSet();
  function Ie(U, { log }) {
    let Q = truncateMiddle(U);
    ye.push(Q);
    if (log)
      emitProgress({
        type: "progress",
        toolUseID: "workflow_log",
        data: {
          type: "workflow_log",
          message: Q,
        },
      });
  }
  let tn = new UsageLimitWaiter({
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
    onChange: (U) => me?.(U),
    storageV5: context.storageV5,
  });
  let zt = limitConcurrency(1, createAgentWorktree);
  let An;
  function Cn() {
    An ??= (async () => {
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
    return An;
  }
  let kn = new Set();
  function fn(U) {
    return (ee, Q) => {
      let Le = `${U}\x00${ee}\x00${Q}`;
      if (kn.has(Le)) return;
      kn.add(Le);
      emitProgress({
        type: "progress",
        toolUseID: "workflow_log",
        data: {
          type: "workflow_log",
          message: `[${U}] ${formatModelRestrictedNotice(ee, Q)}`,
        },
      });
    };
  }
  function Kt() {
    if (G < AGENT_CALL_CAP) return;
    if (!ut) {
      ut = true;
      logEvent("tengu_workflow_agent_cap_exceeded", {
        agentCount: G,
      });
    }
    throw new WorkflowAgentCapError();
  }
  function yn() {
    if (A?.total == null || A.total <= 0) return;
    let turnSpent = A.getTurnSpent();
    if (turnSpent < A.total) return;
    if (!Tt) {
      Tt = true;
      logEvent("tengu_workflow_budget_cap_exceeded", {
        spent: turnSpent,
        budget: A.total,
        agentCount: G,
      });
    }
    throw new WorkflowBudgetExceededError(turnSpent, A.total);
  }
  let ks = 0;
  let no;
  let Ko = new Map();
  let Y = {
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
  function Rn(model) {
    if (model) return model;
    let workflowSubagentModel = getWorkflowSubagentModel();
    if (workflowSubagentModel !== undefined) return workflowSubagentModel;
    let defaultSubagentModel = getDefaultSubagentModel();
    return defaultSubagentModel !== "inherit" ? defaultSubagentModel : Y.options.mainLoopModel;
  }
  function Go(U, kind) {
    let Q = truncateMiddle(U);
    let Le = Ko.get(Q);
    if (Le == null) {
      Le = {
        index: ++ks,
        kind,
        announced: false,
        title: Q,
      };
      Ko.set(Q, Le);
    }
    return Le;
  }
  function ys(U, kind) {
    return Go(U, kind).index;
  }
  function Mn(U) {
    let ee = Go(U);
    if (!ee.announced) {
      ee.announced = true;
      emitProgress({
        type: "progress",
        toolUseID: `workflow_phase_${ee.index}`,
        data: {
          type: "workflow_phase",
          index: ee.index,
          title: ee.title,
          kind: ee.kind,
        },
      });
    }
    return ee.index;
  }
  for (let U of y ?? []) Mn(U);
  let phase = sealPrototype((U) => {
    no = describeLogArg(U);
    Mn(no);
  });
  let qo = env.CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS ?? DEFAULT_MAX_CONCURRENT_AGENTS;
  if (env.CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS !== undefined)
    logForDebugging(`workflow: concurrent agent gate = ${qo} (CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS)`);
  let Ss = limitConcurrency(qo, vs);
  let _s = limitConcurrency(AGENT_CONCURRENCY_CEILING, As);
  async function On({ idx, promptStr, label, ownPhaseTitle, ownPhaseIndex, opts, queuedAt, provenanceOn }) {
    let toolPermissionContext = getToolPermissionContext(Y);
    if (toolPermissionContext.mode !== "auto") return false;
    let messages;
    let ze;
    if (opts?.schema != null) {
      let at = [];
      let et = new Set();
      let lt = MAX_SCHEMA_NODES_2;
      let Be = 0;
      try {
        let json = JSON.stringify(opts.schema, function (ve, Xe) {
          if (--lt < 0) throw Error("output schema expansion exceeds the node budget");
          let Ke = typeof Xe === "bigint" ? Xe.toString() : Xe;
          Be += ve.length + (typeof Ke === "string" ? Ke.length : 0);
          if (Be > MAX_UNREVIEWED_SCHEMA_CHARS) throw Error("output schema too large to classify");
          if (Ke !== null && typeof Ke === "object") {
            while (at.length > 0 && at.at(-1) !== this) et.delete(at.pop());
            if (et.has(Ke)) return "[Circular]";
            at.push(Ke);
            et.add(Ke);
          }
          return Ke;
        });
        if (json !== undefined && json.length > MAX_UNREVIEWED_SCHEMA_CHARS) {
          Be = json.length;
          throw Error("output schema too large to classify");
        }
        messages = json || undefined;
      } catch {
        ze =
          Be > MAX_UNREVIEWED_SCHEMA_CHARS
            ? "output schema too large for the safety classifier"
            : "output schema could not be serialized for the safety classifier";
      }
    }
    let st = isSchemaTooLargeToSkipReview(messages);
    if (provenanceOn && !st && ze === undefined) return false;
    let ie = (reason) => {
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
      ze ??
      (provenanceOn
        ? isClassifierSideCallRetired("workflow_schema")
          ? `output schema is over ${MAX_UNREVIEWED_SCHEMA_CHARS_2} characters, too large to pass unreviewed in auto mode, so this agent was not started; shorten the schema`
          : undefined
        : isClassifierSideCallRetired("workflow_prompt")
          ? AUTO_MODE_CLASSIFIER_OFF_MESSAGE
          : undefined);
    let Ce = reason
      ? ie(reason)
      : await reviewWorkflowAgentDispatch({
          prompt: promptStr,
          schemaJson: messages,
          agentType: opts?.agentType != null ? String(opts.agentType) : undefined,
          parentMessages: context.messages,
          inheritedVerifiedHumanTurns: context.inheritedVerifiedHumanTurns,
          parentTools: context.options.tools,
          rootToolSurface: context.rootToolSurface,
          toolPermissionContext,
          abortSignal: Y.abortController.signal,
          dispatchAgentId: context.agentId,
          storageV5: context.storageV5,
          credentials: context.credentials,
        }).catch((error) => {
          if (!Y.abortController?.signal.aborted) logError(error);
          if (!st || Y.abortController?.signal.aborted) return null;
          return ie("classifier error; output schema too large to pass unreviewed");
        });
    if (Y.abortController?.signal.aborted) throw Error("Workflow aborted");
    if (!Ce) return false;
    let ct = Ce.unreviewed
      ? `[${label}] blocked: ${Ce.reason}`
      : `[${label}] blocked by safety classifier: ${Ce.reason}`;
    Ie(ct, {
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
        model: Rn(opts?.model),
        state: "error",
        blocked: true,
        error: ct,
        queuedAt,
        promptPreview: previewAgentValue(promptStr),
        lastProgressAt: Date.now(),
      },
    });
    return true;
  }
  let weakMap = new WeakMap();
  let agent = sealPrototype(async (U, ee, Q, Le, Je) => {
    let agentContext = context.agentContext;
    let Te = Q instanceof AbortSignal ? Q : undefined;
    let it = Je instanceof AbortSignal ? Je : undefined;
    let Ne = se.getStore();
    let Me = Ne ?? V;
    let ze = Le instanceof WorkflowJournalStub || Ne === N;
    let st;
    if (ee !== null && typeof ee === "object" && !isUntrustedObject(ee)) {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(ee, "schema");
      let He =
        ownPropertyDescriptor && "value" in ownPropertyDescriptor ? ownPropertyDescriptor.value : undefined;
      if (He !== null && typeof He === "object") st = He;
    }
    let ie = hostCopy(S(ee));
    if (ie && st !== undefined) {
      let oe = weakMap.get(st);
      if (oe === undefined) {
        oe = hostCopy(S(st));
        weakMap.set(st, oe);
      }
      ie.schema = oe;
    }
    let St =
      getWorkflowSubagentModel() !== undefined
        ? "CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL is set"
        : env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE
          ? "CLAUDE_CODE_SUBAGENT_MODEL_FORCE is on"
          : undefined;
    if (ie?.model !== undefined && St !== undefined) {
      logForDebugging(`Workflow agent model "${ie.model}" ignored: ${St}`);
      ie.model = undefined;
    }
    if (Y.abortController?.signal.aborted) return new Promise(() => {});
    try {
      Kt();
      yn();
      let disallowedTools = ie?.disallowedTools;
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
        if (ie !== undefined)
          ie.disallowedTools = disallowedTools.length === 0 ? undefined : uniq(disallowedTools).sort();
      }
      let bashCommandClamp = ie?.bashCommandClamp;
      if (bashCommandClamp !== undefined) {
        if (
          !Array.isArray(bashCommandClamp) ||
          bashCommandClamp.some((pt) => typeof pt !== "string" || pt === "" || pt !== pt.trim())
        )
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            "agent() opts.bashCommandClamp must be an array of non-empty strings; got " +
              (Array.isArray(bashCommandClamp)
                ? "an array with non-string, empty, or whitespace-padded entries"
                : typeof bashCommandClamp) +
              ". Refusing the spawn rather than running it un-clamped.",
            "agent() bashCommandClamp malformed \u2014 spawn refused",
          );
        let Qe = bashCommandClamp.length === 0 ? undefined : uniq(bashCommandClamp).sort();
        for (let pt of Qe ?? []) {
          let { toolName, ruleContent } = permissionRuleValueFromString(pt);
          if (
            toolName !== BASH_TOOL_NAME ||
            ruleContent === undefined ||
            ruleContent === "" ||
            ruleContent !== ruleContent.trim()
          )
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.bashCommandClamp entry '${pt}' must be a '${BASH_TOOL_NAME}(<command or prefix>)' permission rule (tool name case-sensitive, non-empty content with no leading/trailing whitespace inside the parens); it parses to tool '${toolName}'` +
                (ruleContent === undefined || ruleContent === ""
                  ? " with no rule content"
                  : ruleContent !== ruleContent.trim()
                    ? " with whitespace-padded rule content"
                    : "") +
                ". Refusing the spawn rather than running it with an inert clamp entry.",
              "agent() opts.bashCommandClamp inert entry \u2014 spawn refused",
            );
        }
        if (ie !== undefined) ie.bashCommandClamp = Qe;
      }
    } catch (error) {
      await sleep(0);
      throw error;
    }
    let Ce = ++G;
    let ct = describeLogArg(U);
    let at =
      ie?.label != null
        ? String(ie.label).replace(/\s+/g, " ").trim()
        : We
          ? `agent ${Ce}`
          : truncateToLength(ct, 60).replace(/\s+/g, " ").trim();
    let et = ie?.phase != null ? String(ie.phase) : no;
    let lt = et != null ? Mn(et) : undefined;
    let Be = ie?.stallMs != null ? Number(ie.stallMs) : getAsyncAgentStallTimeoutMs();
    let promptPreview = previewAgentValue(ct);
    let ve;
    let Xe;
    let Ke = false;
    if (L && !ze) {
      ve = agentCallKey(ct, ie, Me.prev);
      Me.prev = ve;
      let oe = q ? undefined : j?.results.get(ve);
      if (oe !== undefined) {
        if (j?.replaced.has(ve))
          Me.prev = hashReplacedContent(ve, typeof oe.agentId === "string" ? oe.agentId : "");
        if (oe.foreignArtifactContent) gt = true;
        if (Array.isArray(oe.toolsUsed)) {
          for (let pt of oe.toolsUsed)
            if (typeof pt === "string")
              $t.add(getConversationToolsUsed().has(pt) ? pt : UNREADABLE_TOOLS_USED_BEFORE_SUMMARY);
        }
        emitProgress({
          type: "progress",
          toolUseID: `workflow_agent_${Ce}_cached`,
          data: {
            type: "workflow_agent",
            index: Ce,
            label: at,
            phaseIndex: lt,
            phaseTitle: et,
            agentId: oe.agentId,
            model: Rn(ie?.model),
            state: "done",
            startedAt: Date.now(),
            lastProgressAt: Date.now(),
            cached: true,
            resultPreview: previewAgentValue(oe.result),
            promptPreview,
          },
        });
        return s(oe.result);
      }
      let He = j?.started.get(ve);
      if (!(!q && He !== undefined && He.length > 0 && !j?.failed.has(ve) && !j?.demoted.has(ve))) q = true;
      Ke = j !== undefined && (j.results.has(ve) || j.demoted.has(ve) || j.failed.has(ve));
      if (He && He.length > 0)
        logEvent("tengu_workflow_journal_started_hit_respawn", {
          attempts: He.length,
        });
    }
    let cn = false;
    let nn = (oe) => {
      cn = true;
      Xe = oe;
      if (!L || ve === undefined) return;
      L.append({
        type: "started",
        key: ve,
        agentId: oe,
        ...truncateProgressFields(at, et),
      }).catch((error) =>
        logForDebugging(`workflow journal started-append failed: ${error}`, {
          level: "warn",
        }),
      );
    };
    let At = async () => {
      if (!L || !ve || Y.abortController?.signal.aborted || it?.aborted) return;
      await L.append({
        type: "failed",
        key: ve,
        agentId: Xe ?? "",
      }).catch((error) =>
        logForDebugging(`workflow journal failed-append failed: ${error}`, {
          level: "warn",
        }),
      );
    };
    let Bt = async (oe) => {
      if (oe === null) await At();
      if (L && ve && oe !== null) {
        let result = oe;
        if (flagWithOverride)
          try {
            result = hostCopy(S(oe));
          } catch (error) {
            logForDebugging(
              `workflow journal: did not save an agent() result, so a resumed run will re-run from this call: ${describeThrownValue(error).msg}`,
              {
                level: "warn",
              },
            );
            await At();
            return oe;
          }
        else if (typeof oe === "object") {
          await At();
          return oe;
        }
        await L.append({
          type: "result",
          key: ve,
          agentId: Xe ?? "",
          result,
          ...(gt && {
            foreignArtifactContent: true,
          }),
          ...(kt(Xe).length > 0 && {
            toolsUsed: kt(Xe),
          }),
        }).catch((error) =>
          logForDebugging(`workflow journal result-append failed: ${error}`, {
            level: "warn",
          }),
        );
        if (Ke && Me.prev === ve) Me.prev = hashReplacedContent(ve, Xe ?? "");
      }
      return oe;
    };
    let now = Date.now();
    let Gt = () =>
      emitProgress({
        type: "progress",
        toolUseID: `workflow_agent_${Ce}_queued`,
        data: {
          type: "workflow_agent",
          index: Ce,
          label: at,
          phaseIndex: lt,
          phaseTitle: et,
          agentType: ie?.agentType != null ? String(ie.agentType) : undefined,
          isolation: ie?.isolation === "worktree" || ie?.isolation === "remote" ? ie.isolation : undefined,
          model: Rn(ie?.model),
          state: "start",
          queuedAt: now,
          promptPreview,
          lastProgressAt: now,
        },
      });
    let Vt = (error) => {
      if (cn || Y.abortController?.signal.aborted) return;
      emitProgress({
        type: "progress",
        toolUseID: `workflow_agent_${Ce}_queued`,
        data: {
          type: "workflow_agent",
          index: Ce,
          label: at,
          phaseIndex: lt,
          phaseTitle: et,
          model: Rn(ie?.model),
          state: "error",
          error: error instanceof Error ? error.message : String(error),
          queuedAt: now,
          promptPreview,
          lastProgressAt: Date.now(),
        },
      });
    };
    if (ie?.isolation === "remote") throw Error("agent({isolation:'remote'}) is not available in this build");
    Gt();
    try {
      return await Bt(await Ss(Ce, ct, at, et, lt, Be, ie, nn, now, agentContext, Te));
    } catch (error) {
      Vt(error);
      await At();
      if (Y.abortController?.signal.aborted) return new Promise(() => {});
      throw error;
    }
  });
  async function Zo({ idx, promptStr, label, agent, model, permissionMode, evalSignal }) {
    let agentContext = context.agentContext;
    let Ne = typeof model === "string" ? model : undefined;
    let Me = await runAgentSpawnHooks(
      {
        tool_use_id: context.toolUseId ?? "",
        prompt: We ? "(withheld: this workflow run does not share its script)" : promptStr,
        description: label,
        agent,
        agents: [],
        model: Ne,
        parentModel: getMainLoopModel_2(Y),
        parentAgentId: isMainAgent(agentContext) ? undefined : agentContext?.agentId,
        permissionMode,
        background: false,
        fork: false,
        name: undefined,
        cwd: undefined,
        workflow: Object.freeze({
          runId: h ?? "",
          agentIndex: idx,
        }),
        signal: AbortSignal.any([Y.abortController?.signal, evalSignal].filter((st) => st !== undefined)),
        origin: Y.hookOrigin,
      },
      eventCallersFor,
    ).catch((error) => {
      if (evalSignal?.aborted) return;
      throw error;
    });
    let ze = Y.abortController?.signal.aborted === true;
    if (ze || Me === undefined || evalSignal?.aborted) {
      Me?.starting?.[Symbol.dispose]();
      if (ze) throw Error("Workflow aborted");
      return null;
    }
    if (Me.deny !== undefined) {
      if (!Wt) {
        Wt = true;
        logFeatureBad("subagent_launch", "workflow_spawn_denied_by_hook");
      }
      await sleep(0);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Workflow agent spawn denied by a plugin: ${Me.deny}`,
        "Workflow agent spawn denied by a plugin",
      );
    }
    return {
      starting: Me.starting,
      prompt: We ? promptStr : Me.spawn.prompt,
      model: Me.spawn.model === Ne || env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE ? model : Me.spawn.model,
      isRewritten: Me.isRewritten,
    };
  }
  async function vs(U, ee, Q, Le, Je, Re, Te, it, queuedAt, Me, ze) {
    await tn.whenClear();
    if (Y.abortController?.signal.aborted) throw Error("Workflow aborted");
    if (ze?.aborted) return null;
    let st = truncateProgressFields(Q, Le);
    yn();
    let ie = isPromptProvenanceEnabled();
    if (
      await On({
        idx: U,
        promptStr: ee,
        label: Q,
        ownPhaseTitle: Le,
        ownPhaseIndex: Je,
        opts: Te,
        queuedAt,
        provenanceOn: ie,
      })
    )
      return null;
    let St;
    if (Te?.agentType != null) {
      let R = String(Te.agentType);
      let activeAgents = Y.options.agentDefinitions.activeAgents;
      let toolPermissionContext = getToolPermissionContext(Y);
      let ge = await filterDispatchableAgents(activeAgents, toolPermissionContext, AGENT);
      let found = ge.find((Ae) => Ae.agentType === R);
      if (!found) {
        let found = activeAgents.find((activeAgent) => activeAgent.agentType === R);
        let nt = found ? findDenyRuleWithContent(toolPermissionContext, AGENT, R) : null;
        if (nt)
          throw Error(
            `agent({agentType}): '${R}' is denied by permission rule '${AGENT}(${R})' from ${nt.source}.`,
          );
        if (found && isAgentToolPoolDenied(found, toolPermissionContext))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `agent({agentType}): ${agentToolPoolDeniedMessage(R)}`,
            "workflow agent(): agent type unavailable, tool pool denied",
          );
        throw Error(
          `agent({agentType}): agent type '${R}' not found. Available agents: ${ge.map((yt) => yt.agentType).join(", ")}`,
        );
      }
      let disallowedTools = [
        ...(found.disallowedTools ?? []),
        ...(WORKFLOW_SUBAGENT_DEFINITION.disallowedTools ?? []),
      ];
      let Ze = Te.schema ? WORKFLOW_STRUCTURED_OUTPUT_NOTE : WORKFLOW_SUBAGENT_VERBATIM_NOTE;
      let tools =
        Te.schema && !parseWildcardAgentTypes(found.tools)
          ? [...(found.tools ?? []), STRUCTUREDOUTPUT]
          : found.tools;
      St = {
        ...withSystemPromptSuffix(found, Ze),
        disallowedTools,
        tools,
      };
    }
    let Ce;
    if (Te?.schema) {
      let syntheticOutputTool = createSyntheticOutputTool(Te.schema);
      if ("error" in syntheticOutputTool || syntheticOutputTool.unsatisfiable) await sleep(0);
      if ("error" in syntheticOutputTool)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `agent({schema}) received an invalid JSON Schema: ${syntheticOutputTool.error}`,
          "Workflow agent({schema}) invalid JSON Schema",
        );
      if (syntheticOutputTool.unsatisfiable) {
        let Pe = `agent({schema}) received an unusable JSON Schema \u2014 ${checkSchemaSatisfiable(syntheticOutputTool.unsatisfiable)}`;
        let { message } = syntheticOutputTool.unsatisfiable;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_workflow_schema_lint_enforce", true))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${Pe}: ${message}. The subagent was not started \u2014 fix the schema and call agent() again.`,
            "Workflow agent({schema}) unsatisfiable JSON Schema",
          );
        if (!weakSet.has(syntheticOutputTool)) {
          weakSet.add(syntheticOutputTool);
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${Q}] warning: ${Pe}: ${message}`,
            },
          });
        }
      }
      Ce = syntheticOutputTool.tool;
    }
    let ct = St ?? (Ce ? WORKFLOW_STRUCTURED_SUBAGENT_DEFINITION : WORKFLOW_SUBAGENT_DEFINITION);
    let at = parseEffortValue(Te?.effort) ?? getDefaultSubagentEffort(ct, Y.permissionLayers);
    let et =
      at !== undefined
        ? {
            ...ct,
            effort: at,
          }
        : ct;
    let disallowedTools = Te?.disallowedTools;
    let bashCommandClamp = Te?.bashCommandClamp;
    let ve =
      (disallowedTools !== undefined && disallowedTools.length > 0) ||
      (bashCommandClamp !== undefined && bashCommandClamp.length > 0)
        ? {
            ...et,
            disallowedTools: [
              ...(et.disallowedTools ?? []),
              ...(disallowedTools ?? []),
              REPL_TOOL_NAME,
              ...(bashCommandClamp !== undefined && bashCommandClamp.length > 0
                ? ["mcp__*", POWERSHELL_TOOL_NAME]
                : []),
            ],
          }
        : et;
    await waitForCoordinatorSubagentMcpServers(() => Y.getAppState().mcp);
    let appState = Y.getAppState();
    let toolPermissionContext = getToolPermissionContext(Y);
    let filtered = Y.options.tools.filter(isMcpTool);
    let nn = Y.options.toolCatalog.assembleToolPool(
      toolPermissionContext,
      excludeCoordinatorCommsMcpTools(appState.mcp.tools.concat(filtered)),
      {
        skipReplFilter: true,
        machineMcpTools: bridgeToolsOf(Y),
      },
    );
    let At = (R) =>
      resolveAgentTools(ve, R, false, false, false, getAgentDepth(Me) + 1, memoryModeForSession(Y).mode);
    let Bt = (R) => {
      let filtered = filterToolsByDenyRules(
        [GlobTool, GrepTool, ...enabledToolsForAliases([GrepTool.name, GlobTool.name])],
        toolPermissionContext,
      ).filter((we) => !R.some((ge) => toolMatchesName(ge, we.name)));
      return filtered.length > 0 ? [...R, ...filtered] : R;
    };
    let dt = nn;
    if (disallowedTools !== undefined && disallowedTools.length > 0) {
      if (
        hasEmbeddedSearchTools() &&
        !At(dt).resolvedTools.some((resolvedTool) => toolMatchesName(resolvedTool, BASH_TOOL_NAME))
      )
        dt = Bt(dt);
      let R = flattenToolNameList(ve.mcpServers);
      let Pe = (we) => {
        if (we.length === 0) return;
        let ge = `mcp__${we}`;
        let pe = probeAgentToolPool(ge, dt, R);
        if (pe === null) return;
        switch (pe.kind) {
          case "pool-server":
          case "declared-server":
            return ge;
          case "slip":
            return pe.correctedSpelling;
          case "unmatched":
            return;
        }
      };
      for (let disallowedTool of disallowedTools) {
        let disallowedToolsFilter = buildDisallowedToolsFilter([disallowedTool]);
        if (dt.some((Ae) => disallowedToolsFilter.isToolDisallowed(Ae))) continue;
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
          let Ae = /^mcp__/i.test(toolName) ? mcpInfoFromString(`mcp__${toolName.slice(5)}`) : null;
          if (/^mcp__/i.test(toolName) && Ae === null) {
            await sleep(0);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${disallowedTool}' cannot match ` +
                "any tool \u2014 its server segment is empty, so it names no " +
                "server. Use 'mcp__<server>' to deny one server's tools ('mcp__<server>__<tool>' for one tool), or 'mcp__*' to deny every MCP server's tools. Refusing the spawn rather than running it un-narrowed.",
              "agent() opts.disallowedTools empty mcp server segment \u2014 spawn refused",
            );
          }
          if (Ae !== null && Ae.serverName.includes("*") && Ae.serverName !== "*") {
            let nt = Pe(Ae.serverName.replace(/\*+/g, ""));
            await sleep(0);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${disallowedTool}' cannot match ` +
                "any tool \u2014 server names take no wildcard. Use " +
                (nt !== undefined ? `'${nt}' for that server's tools, or ` : "") +
                "'mcp__*' for every MCP server's tools. Refusing the spawn rather than running it un-narrowed.",
              "agent() opts.disallowedTools wildcard mcp server \u2014 spawn refused",
            );
          }
          if (Ae !== null && Ae.toolName !== undefined && Ae.toolName !== "*" && Ae.toolName.includes("*")) {
            let nt = Pe(Ae.serverName);
            await sleep(0);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${disallowedTool}' cannot match ` +
                "any tool \u2014 tool names take no wildcard. " +
                (nt !== undefined
                  ? `Use '${nt}' to deny all of that server's tools, or enumerate exact tool names. `
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
        if (Ce !== undefined && toolName === STRUCTUREDOUTPUT) continue;
        let lower = toolName.toLowerCase();
        let Ze =
          dt
            .flatMap((Ae) => [Ae.name, getToolNameForPermissionCheck(Ae)])
            .find((Ae) => Ae.toLowerCase() === lower) ??
          (lower === SKILL.toLowerCase() ? SKILL : undefined) ??
          (Ce !== undefined && lower === STRUCTUREDOUTPUT.toLowerCase() ? STRUCTUREDOUTPUT : undefined);
        let qe = probeAgentToolPool(toolName, dt, R);
        if (qe?.kind === "declared-server") {
          let Ae = mcpInfoFromString(toolName);
          if (!(!qe.verifiable && Ze !== undefined && mcpInfoFromString(Ze)?.serverName === Ae?.serverName)) {
            logForDebugging(
              `workflow agent(): disallowedTools mcp entry '${toolName}' covers this agent's declared frontmatter MCP server '${qe.declaredSpelling}' \u2014 those tools connect at ` +
                "spawn, after this check, and the deny is applied to them then" +
                (qe.verifiable ? "" : " (a full tool-name entry cannot be verified here)"),
            );
            continue;
          }
        }
        if (Ze !== undefined) {
          await sleep(0);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `agent() opts.disallowedTools entry '${disallowedTool}'` +
              (toolName !== disallowedTool ? ` (parsed tool name '${toolName}')` : "") +
              ` does not match any tool, but '${Ze}' exists \u2014 ` +
              "tool names are case-sensitive. Refusing the spawn rather than running it with this deny silently dropped.",
            "agent() opts.disallowedTools case-mismatched entry \u2014 spawn refused",
          );
        }
        if (qe !== null) {
          if (qe.kind === "pool-server") continue;
          if (qe.kind === "slip") {
            await sleep(0);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${disallowedTool}'` +
                (toolName !== disallowedTool ? ` (parsed tool name '${toolName}')` : "") +
                ` cannot match as written, but '${qe.correctedSpelling}' would \u2014 deny entries ` +
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
    if (Ce !== undefined && buildDisallowedToolsFilter(ve.disallowedTools).isToolDisallowed(Ce)) {
      await sleep(0);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent() schema mode needs the ${STRUCTUREDOUTPUT} tool, ` +
          "but the spawn's merged disallowedTools deny it \u2014 refusing the " +
          "spawn instead of running an agent that cannot return its structured output.",
        "agent() schema mode with StructuredOutput denied \u2014 spawn refused",
      );
    }
    if (bashCommandClamp !== undefined && bashCommandClamp.length > 0 && hasEmbeddedSearchTools())
      dt = Bt(dt);
    if (bashCommandClamp !== undefined && bashCommandClamp.length > 0) {
      let toolAliases = getToolPermissionContext(Y).toolAliases;
      let toolAliases_2 = Y.options.toolAliases;
      let found = [BASH_TOOL_NAME, MONITOR, POWERSHELL_TOOL_NAME].find(
        (ge) => toolAliases?.[ge] !== undefined || toolAliases_2?.[ge] !== undefined,
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
      !At(dt).resolvedTools.some((resolvedTool) => toolMatchesName(resolvedTool, BASH_TOOL_NAME))
    ) {
      await sleep(0);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `agent() opts.bashCommandClamp can bind nothing: the spawned agent's resolved tool pool has no ${BASH_TOOL_NAME} (removed by this spawn's disallowedTools, the agent definition's denies, or absent from the session pool). A clamp on a Bash-less agent ` +
          "means the commands it was meant to keep are unavailable \u2014 " +
          "refusing the spawn rather than running a blind agent. Drop the clamp or the Bash deny.",
        "agent() bashCommandClamp with no Bash in resolved pool \u2014 spawn refused",
      );
    }
    let Gt = dt;
    let Vt = Ce ? [...Gt.filter((R) => !toolMatchesName(R, STRUCTUREDOUTPUT)), Ce] : Gt;
    let oe = await Zo({
      idx: U,
      promptStr: ee,
      label: Q,
      agent: ve,
      model: Te?.model,
      permissionMode: toolPermissionContext.mode,
      evalSignal: ze,
    });
    if (oe === null) return null;
    using starting = oe.starting;
    let { prompt, model, isRewritten } = oe;
    if (
      prompt !== ee &&
      (await On({
        idx: U,
        promptStr: prompt,
        label: Q,
        ownPhaseTitle: Le,
        ownPhaseIndex: Je,
        opts: Te,
        queuedAt,
        provenanceOn: ie,
      }))
    )
      return null;
    let agentModel = getAgentModel(
      getExploreAgentModel(ve, Y.options.mainLoopModel),
      Y.options.mainLoopModel,
      model,
      toolPermissionContext.mode,
      undefined,
      {
        inWorkflowRun: h !== undefined,
      },
    );
    let er = toolPermissionContext.mode === "auto";
    let wt = Ce === undefined && isSerializedArbiter(toolPermissionContext.mode);
    let ft = Ce !== undefined && isArbiterStructuredOutputReviewOn(toolPermissionContext.mode);
    let Yt = null;
    if (Te?.isolation === "worktree" && isWebFetchAgent(ve))
      logForDebugging(
        "[web-fetch agent] isolation:'worktree' ignored; the built-in web-fetch agent always runs as a local agent",
      );
    else if (Te?.isolation === "worktree") {
      let R = h ? `${h}-${U}` : `wf-${U}`;
      Yt = await zt(R, {
        storageV5: Y.storageV5,
        credentials: Y.credentials,
      });
    }
    let worktreePath = Yt?.worktreePath;
    let ro = ie ? classifyWorkflowRequestSource(context.messages, context.agentId) : null;
    let so = ro?.kind === "relay" ? userRequestFraming(ro) : null;
    let nr = `${!ie ? prompt : ro?.kind === "automated" ? automatedTriggerFramingWithContext(prompt) : withHarnessFraming(prompt)}${Se(prompt)}`;
    let xn = Yt
      ? `${nr}

---
You are running in an isolated git worktree at \`${flattenForFraming(Yt.worktreePath)}\` (a separate working copy of the repo). Changes you make here do NOT affect the main working directory (\`${flattenForFraming(getCwd())}\`) or other agents. Work normally \u2014 the worktree will be cleaned up automatically if you made no changes, or preserved for review if you did.`
      : nr;
    let _t = 0;
    let ht = 0;
    let Nt = 0;
    let startedAt = Date.now();
    let promptPreview = previewAgentValue(prompt);
    let joined = [
      agentModel ?? "",
      String(ve.effort ?? getEffortValue(Y) ?? ""),
      ve.agentType,
      Vt.map((R) => R.name).join(","),
      Te?.schema ? jsonStringify(Te.schema) : "",
      worktreePath ?? getCwd(),
    ].join(`
`);
    let io;
    async function xs(R, Pe, we, attempt, pe) {
      let agentId = makeSaltedName();
      it(agentId);
      starting.started({
        agentId,
        model: agentModel,
      });
      let Ze = {
        agentId,
        parentAgentId: isMainAgent(Me) ? undefined : Me?.agentId,
        depth: getAgentDepth(Me) + 1,
        parentSessionId: getParentSessionId(),
        agentType: "subagent",
        subagentName: ve.agentType,
        workflowRunId: h,
        workflowName,
        workflowWaitsOutUsageLimit: (Z) => tn.wouldWait(Z),
        isAsync: false,
        isBuiltIn: isBuiltInAgent(ve),
        isBackgroundAgent: true,
        invokingRequestId,
        invocationKind: "spawn",
        invocationEmitted: false,
        parentPromptId,
      };
      let toolUseID = `workflow_agent_${U}_${agentId}`;
      let Ae;
      let nt;
      let yt;
      let lo = new Map();
      let Ps = new Map();
      let fallbackModel;
      let model_2 = agentModel;
      let cr = agentModel ? stripAnyVersatileSuffix(agentModel) : undefined;
      let Ht = (state, Ue) =>
        emitProgress({
          type: "progress",
          toolUseID,
          data: {
            type: "workflow_agent",
            index: U,
            label: we,
            phaseIndex: Je,
            phaseTitle: Le,
            agentId,
            agentType: St?.agentType,
            isolation: Yt ? "worktree" : undefined,
            model: agentModel,
            fallbackModel,
            state,
            startedAt,
            queuedAt,
            attempt,
            lastAttemptReason: pe === "rate_limited" ? "throttled" : pe,
            lastToolName: Ae,
            lastToolSummary: nt,
            promptPreview,
            promptFramed: ie,
            lastProgressAt: Date.now(),
            ...Ue,
          },
        });
      let abortController = new AbortController();
      let signal = Y.abortController?.signal;
      let pr = () => abortController.abort(new DOMException("workflow-abort", "AbortError"));
      signal?.addEventListener("abort", pr);
      if (signal?.aborted) abortController.abort(new DOMException("workflow-abort", "AbortError"));
      let fo = () => abortController.abort(new DOMException("user-skip", "AbortError"));
      ze?.addEventListener("abort", fo);
      if (ze?.aborted) fo();
      let mn;
      let mr = 0;
      let min = Math.min(Re * 0.1, 1000);
      let co = () => {
        mn?.clear();
        if (Re > 0)
          mn = setMonotonicTimeout(abortStalled.bind(undefined, abortController), Re, R.host.clock, {
            unref: false,
          });
      };
      let Sn = new Set();
      let Is = emptyWorkflowToolUseTracker();
      let gr = () => {
        if (Sn.size === 0 && mn === undefined) co();
      };
      let wr = () => {
        if (Sn.size > 0) return;
        let now = Date.now();
        if (now - mr < min) return;
        mr = now;
        co();
      };
      let In = {
        ...Y,
        abortController,
        ...(bashCommandClamp !== undefined &&
          bashCommandClamp.length > 0 && {
            permissionLayers: [
              ...(Y.permissionLayers ?? []),
              {
                kind: "bash_command_clamp",
                rules: bashCommandClamp,
              },
            ],
          }),
      };
      rebaseHookOriginForAgent(
        {
          toolUseContext: In,
        },
        isRewritten,
      );
      Ht(
        "start",
        _t || ht
          ? {
              tokens: _t,
              toolCalls: ht,
            }
          : undefined,
      );
      co();
      let hr;
      let Ge;
      let po = new Map();
      let mo;
      let go = false;
      let wo = new Map();
      let ho = false;
      let sn = er ? [] : undefined;
      let Ln = (Z) => {
        if (Z) gt = true;
      };
      Ln(
        Pe.includes(ARTIFACT_CONTENT_AUTHORED_TAG) || (so?.includes(ARTIFACT_CONTENT_AUTHORED_TAG) ?? false),
      );
      let Lt;
      let Dt = 0;
      let bt = 0;
      let Qi = (Z, Ue = true) => {
        let Ot = () => false;
        let le = (Xt) => [...((Xt === undefined ? undefined : lo.get(Xt)?.values()) ?? [])];
        let xt = (Xt) => le(Xt).some((Ns) => Ot(Ns.phase));
        let Tr = (Xt) => le(Xt).length > 0;
        let Eo =
          (Z !== undefined && xt(Z) ? Z : undefined) ??
          [...lo.keys()].findLast(xt) ??
          (Z !== undefined && Tr(Z) ? Z : undefined) ??
          [...lo.keys()].findLast(Tr);
        let Ao = Eo === undefined ? [...Ps.entries()].at(-1) : undefined;
        let vr = le(Eo);
        let Vn = vr.findLast((Xt) => Ot(Xt.phase)) ?? vr.at(-1);
        let Tn =
          Vn !== undefined
            ? {
                id: Eo,
                name: Vn.name,
                summary: describeWorkflowStep(Vn.input, Vn.name) || undefined,
              }
            : Ao !== undefined
              ? {
                  id: Ao[0],
                  ...Ao[1],
                }
              : undefined;
        yt = Tn?.id;
        if (Tn?.name === Ae && Tn?.summary === nt) return;
        Ae = Tn?.name;
        nt = Tn?.summary;
        if (Ue)
          Ht("progress", {
            tokens: _t + Dt,
            toolCalls: ht + bt,
          });
      };
      let ln = 0;
      let _n = 0;
      let lastStructuredOutputInput;
      let Dn;
      let kr = new Set();
      let $n = new Map();
      let deliveredId;
      let yo = 0;
      let lastOtherToolCallAt = 0;
      let MAX_STRUCTURED_OUTPUT_RETRIES_2 =
        env.MAX_STRUCTURED_OUTPUT_RETRIES ?? MAX_STRUCTURED_OUTPUT_RETRIES;
      let now = Date.now();
      let Nn = isWebFetchAgent(ve) ? defaultToolResultsStorage() : undefined;
      try {
        T?.(agentId, abortController);
        await runWithCwdOverride(Ze, async () => {
          for await (let Z of runAgent({
            agentDefinition: wt ? withSystemPromptSuffix(ve, WORKFLOW_HANDBACK_NOTE) : ve,
            turnPrompt: Pe,
            promptMessages:
              so === null
                ? [
                    createUserMessage({
                      content: Pe,
                    }),
                  ]
                : [
                    createUserMessage({
                      content: so,
                    }),
                    createUserMessage({
                      content: Pe,
                    }),
                  ],
            toolUseContext: In,
            session: R,
            canUseTool,
            isAsync: false,
            querySource: getQuerySourceForAgent(ve.agentType, isBuiltInAgent(ve)),
            spawnedBySkill: Y.options.spawnedBySkill ?? Y.options.activeSkill,
            spawnedByForkedSkill: Y.options.spawnedByForkedSkill,
            availableTools: Vt,
            requiresStructuredOutput: Ce !== undefined,
            structuredOutputIsHandback: ft,
            ...(wt && {
              handbackOptIn: true,
              handbackTool: createSubagentHandbackTool(agentId, (Ue) => {
                if (Ge === undefined) {
                  Ge = Ue;
                  return true;
                }
                if (
                  (Ge.review === null && Ue.review !== null) ||
                  (Ge.review === undefined && Ue.review?.kind === "flagged")
                )
                  Ge = {
                    ...Ge,
                    review: Ue.review,
                    noVerdict: Ue.noVerdict,
                  };
                return false;
              }),
              callerDeliveredReport: () =>
                Ge === undefined
                  ? undefined
                  : [
                      ...(Ge.review ? [Ge.review.warning] : []),
                      ...(Ge.noVerdict ? [structuredOutputUnjudgedWarning(Ge.noVerdict).warning] : []),
                      sanitizeSubagentOutput(Ge.message).sanitized,
                    ].join(`

`),
            }),
            transcriptSubdir: h ? `${WORKFLOW_TRANSCRIPT_SUBDIR}/${h}` : undefined,
            spawnedByWorkflowRunId: h,
            description: st.label,
            workflowPhase: st.phase,
            override: {
              agentId,
              agentContext: Ze,
            },
            persistedToolResultFiles: Nn,
            model,
            onModelRestricted: fn(Q),
            onQueryProgress: wr,
            worktreePath,
          })) {
            if (Z.type === "attachment" && Z.attachment.type === "structured_output") {
              Lt = Z.attachment.data;
              deliveredId = Z.attachment.toolUseID;
              continue;
            }
            if (Z.type === "attachment") Ln(containsUntrustedArtifactContent(Z));
            if (Z.type === "api_metrics") {
              if (Z.event.type === "start") io?.responded();
              continue;
            }
            if (Z.type === "query_model_change") {
              model_2 = Z.toModel;
              continue;
            }
            if (Z.type === "set_in_progress_tool_use_ids") {
              if (Z.op.action === "remove") {
                for (let id of Z.op.ids) Sn.delete(id);
                gr();
              }
              continue;
            }
            if (Z.type === "user") {
              sn?.push(Z);
              Ln(containsUntrustedArtifactContent(Z));
              let Ue = [];
              if (Array.isArray(Z.message.content))
                for (let le of Z.message.content) {
                  if (le.type !== "tool_result") continue;
                  let xt = wo.get(le.tool_use_id);
                  wo.delete(le.tool_use_id);
                  if (xt !== undefined && !Ue.includes(xt)) Ue.push(xt);
                }
              for (let le of toolsUsedForSummary([...Ue, Z])) jt(agentId, le);
              let content = Z.message.content;
              if (Array.isArray(content)) {
                for (let le of content)
                  if (typeof le === "object" && le?.type === "tool_result") {
                    Sn.delete(le.tool_use_id);
                    settleWorkflowToolUse(Is, le.tool_use_id, Z.isVirtual === true, le.is_error === true);
                    if (kr.delete(le.tool_use_id) && le.is_error) {
                      _n++;
                      Dn = extractToolErrorExcerpt(le.content) ?? Dn;
                    }
                  }
                gr();
                if (_n > 0 && _n >= MAX_STRUCTURED_OUTPUT_RETRIES_2 && Lt === undefined) {
                  let le = Dn === undefined ? "" : ` \u2014 last StructuredOutput error: ${Dn}`;
                  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `agent({schema}): StructuredOutput retry cap (${MAX_STRUCTURED_OUTPUT_RETRIES_2}) exceeded \u2014 ` +
                      `${_n} failed ${plural(_n, "call")} with no valid output` +
                      le,
                    "Workflow agent({schema}) StructuredOutput retry cap exceeded",
                  );
                }
              }
              continue;
            }
            if (Z.type === "assistant") {
              if (Z.streamWatchdogGaveUp) {
                logForDebugging(
                  `workflow agent [${we}] ended with "${extractTextContent_2(Z.message.content, " ")}"; treating it as a stall`,
                  {
                    level: "warn",
                  },
                );
                ho = true;
                let dOMException = new DOMException("stalled", "AbortError");
                abortController.abort(dOMException);
                throw dOMException;
              }
              hr = Z;
              if (!Z.isApiErrorMessage && Z.message.id !== mo) {
                mo = Z.message.id;
                go = false;
                yo++;
              }
              for (let le of Z.message.content) {
                if (le.type === "tool_use") wo.set(le.id, Z);
                if (le.type === "tool_use" && le.name === SUBAGENTHANDBACK && agentContract(agentId) === true)
                  po.set(le.id, Z.message.id);
                else if (
                  le.type === "tool_use" ||
                  le.type === "server_tool_use" ||
                  le.type === "mcp_tool_use"
                ) {
                  go = true;
                  if (le.type !== "tool_use" || le.name !== STRUCTUREDOUTPUT) lastOtherToolCallAt = yo;
                }
              }
              sn?.push(Z);
              Ln(containsUntrustedArtifactContent(Z));
              for (let le of Z.message.content)
                if (le.type === "tool_use" || le.type === "server_tool_use")
                  jt(agentId, canonicalToolName(le.name.trim()));
              if (!Z.isApiErrorMessage) {
                io?.responded();
                let usage =
                  Z.isUnmetered === true ? undefined : finalContextTokensFromLastResponse(Z.message.usage);
                if (usage) Dt = getTokenCountFromUsage(usage);
                let model = Z.message.model;
                if (model && cr && isForeignModelMessage(Z, cr)) fallbackModel = model;
              }
              let Ue = 0;
              let Ot = 0;
              for (let le of Z.message.content) {
                if (le.type !== "tool_use") continue;
                let xt = false;
                Ue++;
                if (xt) Ot++;
                Sn.add(le.id);
                Ae = le.name;
                nt = describeWorkflowStep(le.input, le.name) || undefined;
                yt = le.id;
                if (le.name === STRUCTUREDOUTPUT) {
                  ln++;
                  lastStructuredOutputInput = le.input;
                  kr.add(le.id);
                  if (ft && !$n.has(le.id))
                    $n.set(le.id, {
                      response: Z,
                      written: clone(le.input),
                      responseNumber: yo,
                    });
                  if (Lt !== undefined && ln > 2) {
                    abortController.abort("stalled");
                    break;
                  }
                }
              }
              bt += Ue - Ot;
              if (Ue > 0) {
                mn?.clear();
                mn = undefined;
              } else wr();
              Ht("progress", {
                tokens: _t + Dt,
                toolCalls: ht + bt,
              });
            }
          }
        });
      } catch (error) {
        let Ue = abortController.signal.aborted
          ? unwrapAbortReason(abortController.signal.reason)
          : undefined;
        if (Ue === "stalled" || Ue === "user-retry") {
          if (Ue === "stalled" && Lt !== undefined) {
            let Ot = Date.now() - now;
            Ht("done", {
              tokens: _t + Dt,
              toolCalls: ht + bt,
              durationMs: Nt + Ot,
              resultPreview: previewAgentValue(Lt),
            });
            adoptSubagentPublishArmsAsync(agentId, In);
            return {
              structured: Lt,
              text: "",
              agentMessages: sn,
              toolReportReview: ft
                ? await judgeStructuredOutputVerdict({
                    calls: $n,
                    deliveredId,
                    delivered: Lt,
                    lastOtherToolCallAt,
                    context: Y,
                  })
                : undefined,
              tokens: Dt,
              toolCalls: bt,
              stalled: false,
              skipped: false,
              durationMs: Ot,
              stopReason: undefined,
              outputTokens: undefined,
              structuredOutputAttempts: ln,
              lastStructuredOutputInput,
            };
          }
          Ht("error", {
            error:
              Ue === "stalled"
                ? ho
                  ? "reply lost \u2014 the response stream went silent and Claude Code gave up waiting for it"
                  : `stalled \u2014 no progress for ${Re}ms`
                : "retry requested by user",
            tokens: _t + Dt,
            toolCalls: ht + bt,
            durationMs: Nt + (Date.now() - now),
          });
          return {
            structured: undefined,
            text: "",
            agentMessages: sn,
            tokens: Dt,
            toolCalls: bt,
            stalled: true,
            stalledReason: Ue,
            replyLost: Ue === "stalled" && ho,
            skipped: false,
            durationMs: Date.now() - now,
            stopReason: undefined,
            outputTokens: undefined,
            structuredOutputAttempts: ln,
            lastStructuredOutputInput,
          };
        }
        if (Ue === "user-skip") {
          Ht("error", {
            error: "skipped by user",
            skipped: true,
            tokens: _t + Dt,
            toolCalls: ht + bt,
            durationMs: Nt + (Date.now() - now),
          });
          return {
            structured: undefined,
            text: "",
            agentMessages: sn,
            tokens: Dt,
            toolCalls: bt,
            stalled: false,
            skipped: true,
            durationMs: Date.now() - now,
            stopReason: undefined,
            outputTokens: undefined,
            structuredOutputAttempts: ln,
            lastStructuredOutputInput,
          };
        }
        Ht("error", {
          error: error instanceof Error ? error.message : String(error),
          tokens: _t + Dt,
          toolCalls: ht + bt,
          durationMs: Nt + (Date.now() - now),
        });
        throw error;
      } finally {
        mn?.clear();
        signal?.removeEventListener("abort", pr);
        ze?.removeEventListener("abort", fo);
        T?.(agentId, null);
      }
      let Mt = hr;
      let So =
        Ge?.message ??
        (Mt
          ? extractTextContent_2(
              Mt.message.content,
              `
`,
            )
          : "");
      let _o = Mt?.isApiErrorMessage === true && Ge === undefined;
      let br = Ge?.toolUseId === undefined ? undefined : po.get(Ge.toolUseId);
      let Ls = Boolean(br) && br === mo && !go;
      if (agentContract(agentId) && !_o)
        if (Ge === undefined)
          logFeatureSad(
            "workflow_handback_tool",
            po.size > 0 ? "handback_call_refused" : So === "" ? "no_final_text" : "plain_text_ending",
          );
        else
          logFeatureOk("workflow_handback_tool", {
            flagged: Ge.review?.kind === "flagged",
          });
      let qt;
      if (_o)
        qt = truncateClassifierReason(
          sanitizeSubagentOutput(So, {
            prependMarker: false,
          }).sanitized,
        );
      else {
        qt = sanitizeSubagentOutput(So).sanitized;
        if (Nn)
          qt = `${qt}

${webFetchHarnessNote(Nn)}`;
      }
      let usage = Mt?.message.usage;
      let outputTokens = usage && typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;
      let jn = Date.now() - now;
      let usage_2 = Mt?.isUnmetered === true ? undefined : Mt?.message.usage;
      let vo = Dt || getTokenCountFromUsage(finalContextTokensFromLastResponse(usage_2) ?? EMPTY_USAGE);
      let tokens = _t + vo;
      if (!isApiErrorDisplayMessage(Mt) || Ge !== undefined) adoptSubagentPublishArmsAsync(agentId, In);
      if (Mt !== undefined && _o) {
        let Z = qt || "API error";
        let apiError =
          Mt.error === "rate_limit"
            ? {
                kind: "rate_limit",
                text: Z,
                model: model_2,
                quotaLimits: Mt.quotaLimits,
              }
            : {
                kind: "other",
                text: Z,
              };
        Ht("error", {
          error: Z,
          tokens,
          toolCalls: ht + bt,
          durationMs: Nt + jn,
        });
        return {
          structured: Lt,
          text: qt,
          agentMessages: sn,
          apiError,
          tokens: vo,
          toolCalls: bt,
          stalled: false,
          skipped: false,
          durationMs: jn,
          stopReason: Mt.message.stop_reason,
          outputTokens,
          structuredOutputAttempts: ln,
          lastStructuredOutputInput,
        };
      }
      Ht("done", {
        tokens,
        toolCalls: ht + bt,
        durationMs: Nt + jn,
        resultPreview: previewAgentValue(Ce ? Lt : qt),
      });
      return {
        structured: Lt,
        text: qt,
        agentMessages: sn,
        toolReportReview:
          Ge !== undefined
            ? Ge.review === null && !Ls
              ? undefined
              : Ge.review
            : ft
              ? await judgeStructuredOutputVerdict({
                  calls: $n,
                  deliveredId,
                  delivered: Lt,
                  lastOtherToolCallAt,
                  context: Y,
                })
              : undefined,
        ...(Ge?.noVerdict !== undefined && {
          toolReportUnjudged: structuredOutputUnjudgedWarning(Ge.noVerdict),
        }),
        ...(Ge !== undefined && {
          toolReportAgentId: agentId,
        }),
        tokens: vo,
        toolCalls: bt,
        stalled: false,
        skipped: false,
        durationMs: jn,
        stopReason: Mt?.message.stop_reason,
        outputTokens,
        structuredOutputAttempts: ln,
        lastStructuredOutputInput,
        webFetchSavedFiles: Nn,
      };
    }
    let sr = 0;
    function Pn(R, Pe, we, ge) {
      let pe = Y.session.withProject({
        cwd: worktreePath,
      });
      return resolveFromCwd(getSessionProject(pe).cwd, () => xs(pe, R, Pe, we + sr, ge));
    }
    let Wn;
    async function ao(R, Pe) {
      function we(pe, re) {
        emitProgress({
          type: "progress",
          toolUseID: `workflow_agent_${U}_queued`,
          data: {
            type: "workflow_agent",
            index: U,
            label: Q,
            phaseIndex: Je,
            phaseTitle: Le,
            agentType: St?.agentType,
            isolation: Yt ? "worktree" : undefined,
            model: agentModel,
            queuedAt: Date.now(),
            tokens: _t + pe.tokens,
            toolCalls: ht + pe.toolCalls,
            promptPreview,
            promptFramed: ie,
            lastProgressAt: Date.now(),
            ...re,
          },
        });
      }
      let ge = R;
      while (ge.apiError?.kind === "rate_limit") {
        let error = ge.apiError.text;
        let joined = tn.join(ge.apiError.quotaLimits);
        if (joined.outcome === "declined") {
          Wn = joined.failureNote;
          return ge;
        }
        if (joined.outcome === "aborted") throw Error("Workflow aborted");
        we(ge, {
          state: "start",
        });
        let ended = await joined.ended;
        if (ended === "aborted") throw Error("Workflow aborted");
        if (ended === "revoked") {
          Wn = "usage-limit wait turned off";
          we(ge, {
            state: "error",
            error,
            durationMs: Nt + ge.durationMs,
          });
          return ge;
        }
        if (ze?.aborted) return ge;
        _t += ge.tokens;
        ht += ge.toolCalls;
        Nt += ge.durationMs;
        startedAt = Date.now();
        sr++;
        ge = await ir(() => Pn(xn, `${Q}${USAGE_LIMIT_SUFFIX}`, Pe, "rate_limited"));
      }
      return ge;
    }
    async function ir(R) {
      let Pe = await currentWarmupGate().enter(joined, {
        capMs: prefixStaggerMs(),
        signal: Y.abortController?.signal,
      });
      io = Pe;
      if (Pe.waitedMs > 0)
        logForDebugging(
          `workflow agent [${Q}] held ${Pe.waitedMs}ms for a same-prefix sibling's first response (prompt-cache warm-up)`,
        );
      try {
        return await R();
      } finally {
        Pe.done();
      }
    }
    let ar;
    let It = [];
    let bn = {
      maxContextTokens: 0,
      toolCalls: 0,
      durationMs: 0,
    };
    let lr = 0;
    let pn;
    let ur = false;
    try {
      let R = await ir(() => Pn(xn, Q, 1));
      R = await ao(R, 1);
      let Pe = (re) =>
        !re.stalled &&
        !re.skipped &&
        re.stopReason == null &&
        re.structured === undefined &&
        (re.outputTokens ?? 1 / 0) < 50 &&
        re.durationMs > Math.min(Re * 0.5, MAX_AGENT_DURATION_WATCHDOG_MS);
      let we = Pe(R);
      if (we) {
        emitProgress({
          type: "progress",
          toolUseID: "workflow_log",
          data: {
            type: "workflow_log",
            message:
              `[${Q}] throttled response (no stop_reason, ${R.outputTokens ?? "?"} output tokens in ${Math.round(R.durationMs / 1000)}s) \u2014 ` +
              "sleeping 45s before retry",
          },
        });
        await sleep(45000, Y.abortController?.signal, {
          throwOnAbort: true,
        });
        _t += R.tokens;
        ht += R.toolCalls;
        Nt += R.durationMs;
        R = await ao(await Pn(xn, `${Q} (throttle-retry)`, 2, "throttled"), 2);
        if (Pe(R))
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${Q}] throttle-retry also degraded \u2014 ` + "giving up on throttle backoff",
            },
          });
      }
      for (let idx = 1; R.stalled && !we && idx <= MAX_STALLED_AGENT_RETRIES; idx++) {
        recordStalledAgent(It, bn, R);
        if (Y.abortController?.signal.aborted) throw Error("Workflow aborted");
        lr++;
        let stalledReason = R.stalledReason ?? "stalled";
        let qe =
          stalledReason === "user-retry"
            ? "retry requested by user"
            : R.replyLost
              ? "lost its reply (Claude Code gave up waiting on a silent response stream)"
              : "stalled (no progress)";
        let Ae = "";
        if (stalledReason === "stalled" && R.structuredOutputAttempts > 0 && R.structured === undefined) {
          let nt = jsonStringify(R.lastStructuredOutputInput);
          let yt = nt.length > 300 ? truncateToLength(nt, 300) + "\u2026" : nt;
          Ae = ` \u2014 ${R.structuredOutputAttempts} StructuredOutput validation ${plural(R.structuredOutputAttempts, "failure")} (last input: ${yt})`;
        }
        emitProgress({
          type: "progress",
          toolUseID: "workflow_log",
          data: {
            type: "workflow_log",
            message: `[stall] agent "${Q}" ${qe} after ${Math.round(R.durationMs / 1000)}s${Ae} \u2014 retrying (${idx}/${MAX_STALLED_AGENT_RETRIES})`,
          },
        });
        _t += R.tokens;
        ht += R.toolCalls;
        Nt += R.durationMs;
        R = await ao(await Pn(xn, `${Q} (retry ${idx})`, idx + 1, stalledReason), idx + 1);
      }
      if (R.stalled) recordStalledAgent(It, bn, R);
      pn = R.skipped
        ? "skipped"
        : R.stalled
          ? we
            ? "stalled_after_throttle"
            : "retries_exhausted"
          : R.apiError
            ? "api_error"
            : "completed";
      if (R.skipped) return null;
      if (R.stalled) {
        let re = It.length;
        let all = It.every((yt) => yt === "user-retry");
        let all_2 = It.every((yt) => yt === "stalled");
        let all_3 = It.every((yt) => yt === "reply lost");
        let nt =
          R.stalledReason !== "user-retry" && R.structuredOutputAttempts > 0 && R.structured === undefined
            ? ` \u2014 ${R.structuredOutputAttempts} StructuredOutput validation ${plural(R.structuredOutputAttempts, "failure")} on the last attempt`
            : "";
        throw Error(
          all
            ? `agent abandoned: user requested retry on all ${re} attempts`
            : all_2
              ? `agent stalled on all ${re} attempts (no progress for ${Re}ms each)${nt}`
              : all_3
                ? `agent lost its reply on all ${re} attempts (Claude Code gave up waiting on a silent response stream each time)${nt}`
                : `agent abandoned after ${re} attempts (${It.join(" \u2192 ")})${nt}`,
        );
      }
      if (R.apiError?.kind === "rate_limit" && R.apiError.quotaLimits)
        ar = {
          model: R.apiError.model,
          limits: R.apiError.quotaLimits,
        };
      if (R.apiError) {
        let re =
          Wn === undefined || R.apiError.kind !== "rate_limit"
            ? `[${Q}] failed: ${R.apiError.text}`
            : `[${Q}] failed: ${Wn}: ${R.apiError.text}`;
        Ie(re, {
          log: true,
        });
        return null;
      }
      let ge =
        Ce && R.structured !== undefined
          ? sanitizeStructuredOutput(R.structured, {
              reservedKeys: ["webFetchSavedFiles"],
            })
          : undefined;
      let toolPermissionContext = getToolPermissionContext(Y);
      if (toolPermissionContext.mode === "auto" || R.toolReportReview || R.toolReportUnjudged) {
        let re = await classifyHandoffIfNeeded({
          child: Ce ? "workflow_object" : "workflow_text",
          childAgentId: undefined,
          checkpoint: false,
          handback:
            R.toolReportReview === undefined ? undefined : R.toolReportReview === null ? "send" : "flagged",
          agentMessages: R.agentMessages ?? [],
          inheritedVerifiedHumanTurns: buildVerifiedHumanTurns(Y),
          tools: Vt,
          rootToolSurface: context.rootToolSurface,
          toolPermissionContext,
          abortSignal: Y.abortController.signal,
          agentType: agentTypeForAnalyticsFromDefinition(ve),
          totalToolUseCount: ht + R.toolCalls,
          finalResultText: Ce ? (ge !== undefined ? jsonStringify(ge.value) : undefined) : R.text,
          agentId: Y.agentId,
          storageV5: Y.storageV5,
          credentials: Y.credentials,
        }).catch((error) => {
          if (Y.abortController.signal.aborted) return R.toolReportUnjudged ?? null;
          logError(error);
          return {
            warning: buildSubagentClassifierUnavailableNote(""),
            kind: "unavailable",
          };
        });
        let Ze = re === null ? toolPermissionContext.mode !== "auto" : re.kind === "unavailable";
        let qe = R.toolReportReview ?? (Ze ? (R.toolReportUnjudged ?? re) : re);
        if (qe && qe.kind !== "unavailable" && R.toolReportAgentId !== undefined)
          flagAgentContract(R.toolReportAgentId);
        if (qe) {
          if (Ce) {
            let Ae = `[${Q}] ${qe.warning}`;
            Ie(Ae, {
              log: true,
            });
          } else {
            R.text = `${qe.warning}

${R.text}`;
            if (qe.kind !== "unavailable") {
              let Ae = `[${Q}] ${qe.warning}`;
              Ie(Ae, {
                log: true,
              });
            }
          }
        }
      }
      if (Ce) {
        if (ge === undefined)
          throw Error(
            "agent({schema}): subagent completed without calling StructuredOutput (after in-conversation nudge)",
          );
        let re = ge.value;
        if (ge.droppedReservedKeys > 0)
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${Q}] Dropped a "webFetchSavedFiles" key the agent put in its structured output \u2014 that key is reserved for the harness's own record of files ${WEBFETCH} saved, and the agent cannot supply it.`,
            },
          });
        if (ge.reportable.length > 0)
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${Q}] ${flaggedOutputNotice(ge.reportable)} (Matched in the string values or key names of the agent's structured output; neutralized there in place.)`,
            },
          });
        if (R.webFetchSavedFiles) {
          let Ze = isPlainObject(re);
          emitProgress({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${Q}] ${webFetchHarnessNote(R.webFetchSavedFiles)}${Ze ? "" : " (The agent's structured result is not an object, so this record is not attached to it as webFetchSavedFiles \u2014 this log line is its only carrier.)"}`,
            },
          });
          if (Ze)
            return s({
              ...re,
              webFetchSavedFiles: {
                dirs: [...R.webFetchSavedFiles.dirs],
                paths: [...R.webFetchSavedFiles.paths],
              },
            });
        }
        return s(re);
      }
      return R.text;
    } catch (error) {
      ur = true;
      throw error;
    } finally {
      $e = ar;
      if (Yt) {
        let { worktreePath, worktreeBranch, headCommit, gitRoot, hookBased } = Yt;
        try {
          if (!hookBased && headCommit && !(await hasWorktreeChanges(worktreePath, headCommit)))
            await removeAgentWorktree(worktreePath, worktreeBranch, gitRoot, false, "workflow_tool");
          else if (gitRoot) await unlockAgentWorktree(worktreePath, gitRoot);
        } catch {}
      }
      if (It.length > 0)
        try {
          let signal = Y.abortController?.signal;
          let Pe = !ur
            ? (pn ?? "error")
            : pn === "retries_exhausted" || pn === "stalled_after_throttle"
              ? pn
              : signal?.aborted
                ? unwrapAbortReason(signal.reason) === "background"
                  ? "backgrounded"
                  : "aborted"
                : pn === "completed"
                  ? "failed_after_rerun"
                  : "error";
          let we = isDiskless() ? undefined : connectionSetupFacts();
          logEvent("tengu_workflow_agent_stall_retries", {
            workflow_run_id: h === undefined ? undefined : sanitizeWorkflowRunId(h),
            agent_type: agentTypeForAnalyticsFromDefinition(ve),
            restarts: lr,
            stalled_attempts: count(It, (ge) => ge === "stalled"),
            reply_lost_attempts: count(It, (ge) => ge === "reply lost"),
            user_retry_attempts: count(It, (ge) => ge === "user-retry"),
            outcome: fromEnum(Pe),
            max_lost_context_tokens: bn.maxContextTokens,
            lost_tool_calls: bn.toolCalls,
            lost_duration_ms: bn.durationMs,
            stall_window_ms: Re,
            api_provider: fromEnumOpt(we?.provider),
            base_url: fromEnumOpt(we?.base_url),
            base_url_gateway: fromEnumOpt(we?.base_url_gateway),
            https_proxy: we?.https_proxy,
          });
        } catch (error) {
          logForDebugging(`tengu_workflow_agent_stall_retries was not sent: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
    }
  }
  function Es(U) {
    if (U === "bubble") return;
    if (U === "bypassPermissions") return "auto";
    return U;
  }
  async function As(U, ee, Q, Le, Je, Re, queuedAt, it) {
    let signal = Y.abortController?.signal;
    if (signal?.aborted) throw Error("Workflow aborted");
    yn();
    let Me = isPromptProvenanceEnabled();
    if (
      await On({
        idx: U,
        promptStr: ee,
        label: Q,
        ownPhaseTitle: Le,
        ownPhaseIndex: Je,
        opts: Re,
        queuedAt,
        provenanceOn: Me,
      })
    )
      return null;
    let ze = await Zo({
      idx: U,
      promptStr: ee,
      label: Q,
      agent: WORKFLOW_SUBAGENT_DEFINITION,
      model: Re.model,
      permissionMode: getToolPermissionContext(Y).mode,
      evalSignal: undefined,
    });
    if (ze === null) return null;
    using starting = ze.starting;
    let { prompt, model } = ze;
    if (
      prompt !== ee &&
      (await On({
        idx: U,
        promptStr: prompt,
        label: Q,
        ownPhaseTitle: Le,
        ownPhaseIndex: Je,
        opts: Re,
        queuedAt,
        provenanceOn: Me,
      }))
    )
      return null;
    let saltedName = makeSaltedName();
    let now = Date.now();
    let promptPreview = previewAgentValue(prompt);
    let et;
    let lt = (state, Ke) =>
      emitProgress({
        type: "progress",
        toolUseID: `workflow_agent_${U}_${saltedName}`,
        data: {
          type: "workflow_agent",
          index: U,
          label: Q,
          phaseIndex: Je,
          phaseTitle: Le,
          agentId: saltedName,
          isolation: "remote",
          remoteSessionId: et,
          state,
          startedAt: now,
          queuedAt,
          promptPreview,
          lastProgressAt: Date.now(),
          ...Ke,
        },
      });
    let abortController = new AbortController();
    let Et = () => abortController.abort(new DOMException("workflow-abort", "AbortError"));
    signal?.addEventListener("abort", Et);
    if (signal?.aborted) abortController.abort(new DOMException("workflow-abort", "AbortError"));
    lt("start");
    it(saltedName);
    let ve;
    try {
      T?.(saltedName, abortController);
      let toolPermissionContext = getToolPermissionContext(Y);
      let { proactivityLevel } = Y.getAppState();
      let cn = cycleAllTeammateModes(
        toolPermissionContext.mode,
        proactivityLevel,
        hasLeftProactivityBaseline(toolPermissionContext),
      );
      let nn =
        model || getWorkflowSubagentModel() !== undefined || getDefaultSubagentModel() !== "inherit"
          ? getAgentModel(undefined, Y.options.mainLoopModel, model, toolPermissionContext.mode, fn(Q), {
              inWorkflowRun: h !== undefined,
            })
          : undefined;
      let At = Me ? classifyWorkflowRequestSource(context.messages, context.agentId) : null;
      let Bt = At?.kind === "relay" ? userRequestFraming(At) : null;
      if (
        prompt.includes(ARTIFACT_CONTENT_AUTHORED_TAG) ||
        (Bt?.includes(ARTIFACT_CONTENT_AUTHORED_TAG) ?? false)
      )
        gt = true;
      let initialMessage =
        (!Me
          ? prompt
          : At?.kind === "automated"
            ? automatedTriggerFramingWithContext(prompt)
            : (Bt !== null
                ? Bt +
                  `

`
                : "") + withHarnessFraming(prompt)) + Se(prompt);
      let Gt = await teleportToRemote({
        initialMessage,
        source: "workflow_remote_agent",
        tags: [WORKFLOW_REMOTE_AGENT],
        description: Q,
        branchName: await Cn(),
        ...resolveProactivityOptions(Es(cn), proactivityLevel),
        model: nn,
        signal: abortController.signal,
        onBundleFail: (wt) => {
          ve = wt;
        },
        onCreateFail: (wt) => {
          ve = wt;
        },
        storageV5: Y.storageV5,
        credentials: Y.credentials,
      });
      if (!Gt) throw Error(ve ?? "Failed to create cloud session");
      et = Gt.id;
      starting.started({
        agentId: saltedName,
        model: nn ?? getMainLoopModel(),
      });
      lt("progress");
      let { text, structuredOutput, resultSubtype, usage, modelUsage, toolCalls } =
        await awaitRemoteSessionResult(et, abortController.signal, Y.credentials);
      let sanitized = sanitizeSubagentOutput(text).sanitized;
      if (text.includes(ARTIFACT_CONTENT_AUTHORED_TAG)) gt = true;
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
      if (Re.schema && structuredOutput === undefined) {
        let wt =
          resultSubtype === "error_max_structured_output_retries"
            ? "the cloud agent called StructuredOutput but no attempt produced a surviving valid output (failed schema validation, or retracted by a model fallback)"
            : resultSubtype && resultSubtype !== "success"
              ? `the cloud agent turn ended with result subtype '${resultSubtype}'`
              : "the cloud agent never called the StructuredOutput tool";
        throw Error(`agent({isolation:'remote', schema}) completed without structured output: ${wt}.`);
      }
      lt("done", {
        tokens: usage ? getTokenCountFromUsage(usage) : 0,
        toolCalls,
        durationMs: Date.now() - now,
        resultPreview: previewAgentValue(Re.schema ? structuredOutput : sanitized),
      });
      if (Re.schema) return s(structuredOutput);
      if (getToolPermissionContext(Y).mode === "auto" && sanitized) {
        let wt = await classifyHandoffIfNeeded({
          child: "workflow_remote",
          childAgentId: undefined,
          checkpoint: false,
          agentMessages: [],
          inheritedVerifiedHumanTurns: buildVerifiedHumanTurns(Y),
          tools: context.options.tools,
          rootToolSurface: context.rootToolSurface,
          toolPermissionContext: getToolPermissionContext(Y),
          abortSignal: abortController.signal,
          agentType: lit(WORKFLOW_SUBAGENT_TYPE),
          totalToolUseCount: toolCalls,
          finalResultText: sanitized,
          agentId: Y.agentId,
          storageV5: Y.storageV5,
          credentials: Y.credentials,
        }).catch((error) => {
          if (abortController.signal.aborted) return null;
          logError(error);
          return {
            warning: buildSubagentClassifierUnavailableNote(""),
            kind: "unavailable",
          };
        });
        if (wt) {
          if (wt.kind !== "unavailable") {
            let ft = `[${Q}] ${wt.warning}`;
            Ie(ft, {
              log: true,
            });
          }
          return `${wt.warning}

${sanitized}`;
        }
      }
      return sanitized;
    } catch (error) {
      if (et) archiveRemoteSession(et).catch(() => {});
      if (unwrapAbortReason(abortController.signal.reason) === "user-skip") {
        lt("error", {
          error: "skipped by user",
          skipped: true,
          durationMs: Date.now() - now,
        });
        return null;
      }
      lt("error", {
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - now,
      });
      throw error;
    } finally {
      signal?.removeEventListener("abort", Et);
      T?.(saltedName, null);
    }
  }
  let parallel = sealPrototype(async (U) => {
    if (Y.abortController?.signal.aborted) return new Promise(() => {});
    let ee = Ee("parallel");
    await sleep(0);
    if (!Array.isArray(U)) throw TypeError("parallel() expects an array of functions");
    let Q = snapshotArrayAcrossVm(w(U));
    if (Q.length === 0) return s([]);
    Kt();
    yn();
    for (let Te of Q)
      if (typeof Te !== "function")
        throw TypeError(
          "parallel() expects an array of functions, not promises. Wrap each call: () => agent(...)",
        );
    let settled = await Promise.allSettled(
      Q.map((Te, it) => {
        try {
          return ee.inSlot(it, () => ce(E(Te)));
        } catch (error) {
          return Promise.reject(error);
        }
      }),
    );
    ee.join();
    let Je = 0;
    let mapped = settled.map((Te, it) => {
      if (Te.status === "fulfilled") return Te.value.v;
      let { name: Ne, msg } = describeThrownValue(Te.reason);
      if (Ne === "WorkflowBudgetExceededError") {
        Je++;
        return null;
      }
      let ze = `parallel[${it}] failed: ${msg}`;
      Ie(ze, {
        log: true,
      });
      return null;
    });
    if (Je > 0) ye.push(`parallel: ${Je} ${plural(Je, "slot")} dropped \u2014 token budget exceeded`);
    return s(mapped);
  });
  let pipeline = sealPrototype(async (U, ...ee) => {
    if (Y.abortController?.signal.aborted) return new Promise(() => {});
    let Q = Ee("pipeline");
    await sleep(0);
    if (!Array.isArray(U)) throw TypeError("pipeline() expects an array as the first argument");
    let Le = snapshotArrayAcrossVm(w(U));
    let Je = snapshotArrayAcrossVm(ee);
    if (Le.length === 0) return s([]);
    Kt();
    yn();
    for (let Ne of Je)
      if (typeof Ne !== "function")
        throw TypeError("pipeline() stages must be functions: pipeline(items, item => ..., result => ...)");
    let settled = await Promise.allSettled(
      Le.map((Ne, Me) =>
        Q.inSlot(Me, async () => {
          let ze = await ce(Ne);
          for (let st of Je) {
            if (ze.v === null) break;
            ze = await ce(E(st, ze.v, Ne, Me));
          }
          return ze;
        }),
      ),
    );
    Q.join();
    let Te = 0;
    let mapped = settled.map((Ne, Me) => {
      if (Ne.status === "fulfilled") return Ne.value.v;
      let { name: ze, msg } = describeThrownValue(Ne.reason);
      if (ze === "WorkflowBudgetExceededError") {
        Te++;
        return null;
      }
      let ie = `pipeline[${Me}] failed: ${msg}`;
      Ie(ie, {
        log: true,
      });
      return null;
    });
    if (Te > 0) ye.push(`pipeline: ${Te} ${plural(Te, "slot")} dropped \u2014 token budget exceeded`);
    return s(mapped);
  });
  let log = sealPrototype((U) => {
    emitProgress({
      type: "progress",
      toolUseID: "workflow_log",
      data: {
        type: "workflow_log",
        message: describeLogArg(U),
      },
    });
  });
  return {
    agent,
    parallel,
    pipeline,
    log,
    phase,
    resolvePhase: Mn,
    reservePhase: ys,
    recordFailure: (U) =>
      Ie(U, {
        log: false,
      }),
    getAgentCount: () => G,
    getFailures: () => ye,
    getForeignArtifactContent: () => gt,
    getToolsUsed: () => (isSillyShoreGateOn() ? uniq([...[...Ut.keys()].flatMap(kt), ...$t]) : []),
    takeUsageLimitDenial: () => {
      let U = $e;
      $e = undefined;
      return U;
    },
    bindVMAwait: (U) => {
      ce = U.settle;
      E = U.call;
      s = U.clone;
      S = U.sanitize;
      w = U.snapshot;
      P = U.getProp;
    },
    sanitizeVMValue: (U) => S(U),
    getVMProp: (U, ee) => P(U, ee),
    withLanesInert: (U) => se.run(N, U),
  };
}
export { createWorkflowAgentRuntime, sanitizeWorkflowRunId };
