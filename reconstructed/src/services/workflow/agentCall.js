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
import { gn } from "../../utils/shortHash.js";
import { jsonStringify, clone } from "../../utils/slowOperations.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { SUBAGENTHANDBACK, AGENT, TASK } from "../../tools/AgentTool/constants.js";
import {
  STRUCTUREDOUTPUT,
  MAX_SCHEMA_NODES,
  createSyntheticOutputTool,
} from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  WORKFLOW_SUBAGENT_TYPE,
  WORKFLOW_TOOL_NAME,
  WORKFLOW_JOURNAL_HOST_COPY_FLAG,
  WORKFLOW_TRANSCRIPT_SUBDIR,
} from "../../tools/WorkflowTool/constants.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { childCallKey, agentCallKey, Fo, Io } from "./journalEntries.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { xre, UNREADABLE_TOOLS_USED_BEFORE_SUMMARY } from "../../bootstrap/stateSlices.js";
import { getConversationToolsUsed, isDiskless } from "../../bootstrap/state.js";
import { Sh } from "../../constants/xml.js";
import {
  kgi,
  containsUntrustedArtifactContent,
  isSillyShoreGateOn,
} from "../../utils/messages/untrustedArtifactContent.js";
import { truncateMiddle } from "../../memdir/memoryTool.js";
import { UsageLimitWaiter, Kr, Vr, Hr } from "./usageLimitWait.js";
import { limitConcurrency } from "../../utils/concurrencyLimit.js";
import {
  createAgentWorktree,
  hasWorktreeChanges,
  removeAgentWorktree,
  unlockAgentWorktree,
} from "../../utils/worktree.js";
import { getCwd, runWithCwdOverride, RDn } from "../../utils/cwd.js";
import { getBranch, isBranchOnOrigin } from "../../utils/git.js";
import { formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { logEvent } from "../analytics/index.js";
import { resolveContextPrimaryModel, toolMatchesName } from "../../Tool.js";
import { getWorkflowSubagentModel } from "../workflows/workflowSubagentModel.js";
import { getDefaultSubagentModel, getAgentModel, getExploreAgentModel } from "../../utils/model/agent.js";
import { Qt } from "./scriptSandbox.js";
import { describeLogArg, describeThrownValue } from "../../plugins/functionHooks/vm/vmRealm.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
  getEffortValue,
} from "../../utils/permissions/toolPermissionContext.js";
import {
  CLr,
  isSchemaTooLargeToSkipReview,
  MAX_UNREVIEWED_SCHEMA_CHARS,
  AUTO_MODE_CLASSIFIER_OFF_MESSAGE,
  reviewWorkflowAgentDispatch,
  getAsyncAgentStallTimeoutMs,
  resolveAgentTools,
  Zin,
  probeAgentToolPool,
  AGr,
  adoptSubagentPublishArmsAsync,
  truncateClassifierReason,
  o7e,
  classifyHandoffIfNeeded,
} from "../../tools/AgentTool/agentToolUtils.js";
import { isEvalBuild } from "../../utils/envUtils.js";
import { getProjectsRoleTelemetry } from "../../utils/permissions/actionSummary.js";
import { isClassifierSideCallRetired } from "../../utils/permissions/serverClassifier/flags.js";
import { logError } from "../../utils/log.js";
import { iin } from "./localFileJournal.js";
import { Pf } from "../../utils/untrustedValues.js";
import { LZr, snapshotArrayAcrossVm } from "../../plugins/functionHooks/vm/boundaryCopy.js";
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
  Zr,
  withSystemPromptSuffix,
  Oi,
  structuredOutputUnjudgedWarning,
  judgeStructuredOutputVerdict,
} from "./runScript.js";
import { runAgentSpawnHooks, getDefaultSubagentEffort } from "../../tools/AgentTool/subagentSpawn.js";
import { isMainAgent, getAgentDepth } from "../../utils/agentContext.js";
import { K1r } from "../../plugins/functionHooks/eventCatalog.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  isPromptProvenanceEnabled,
  classifyWorkflowRequestSource,
  userRequestFraming,
  wCo,
  tDr,
  SCo,
  VGn,
  describeWorkflowStep,
  qGn,
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
import { bN } from "../accountMemory/memoryContext.js";
import { filterToolsByDenyRules } from "../../utils/permissions/filterToolsByDenyRules.js";
import { GlobTool } from "../../tools/GlobTool/GlobTool.js";
import { GrepTool } from "../../tools/GrepTool/GrepTool.js";
import { pnr } from "../tools/batchTools.js";
import { hasEmbeddedSearchTools } from "../../utils/embeddedTools.js";
import { mcpInfoFromString, getToolNameForPermissionCheck } from "../mcp/mcpStringUtils.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { isWebFetchAgent, webFetchHarnessNote } from "../../tools/WebFetchTool/harnessNotes.js";
import { makeSaltedName } from "../../utils/agentId.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { isBuiltInAgent } from "../../tools/AgentTool/loadAgentsDir.js";
import { Bn } from "../../utils/model/modelIds.js";
import { setMonotonicTimeout, unwrapAbortReason } from "../../utils/abortController.js";
import { MAX_STRUCTURED_OUTPUT_RETRIES, extractToolErrorExcerpt } from "../../cli/structuredOutputRetry.js";
import { Ree } from "../../utils/mcpOutputStorage.js";
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
import { fq } from "../../utils/agentListing.js";
import { Bkn, R5t } from "../../tools/AgentTool/handbackReport.js";
import { finalContextTokensFromLastResponse } from "../../cli/print.js";
import { getTokenCountFromUsage } from "../../utils/tokens.js";
import { EMPTY_USAGE } from "../api/emptyUsage.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { w7n } from "../../utils/usageLimitText.js";
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
function En(e) {
  return /^wf_[0-9a-f]{8}-[0-9a-f]{3}$/.test(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : gn(e);
}
//@ chunk-41w44bgm.js:40076-40127 placement
function yi(e) {
  return Math.min(16, Math.max(2, e - 2));
}
/**
 * 工作流 agent() 的并发与调用上限：默认并发按 CPU 数推算（可由 CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS 覆盖），另一并发上限 50，调用总数上限 1000 及其报错文案。
 */
//@ chunk-41w44bgm.js:40127-40436 placement
var DEFAULT_MAX_CONCURRENT_AGENTS = yi(availableParallelism()),
  AGENT_CONCURRENCY_CEILING = 50,
  AGENT_CALL_CAP = 1000,
  AGENT_CALL_CAP_MESSAGE =
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
  constructor(e, n) {
    super(
      `Workflow token budget exceeded (${e.toLocaleString()} / ${n.toLocaleString()} output tokens). Stopping further agent() calls. In-flight agents will complete; their results are preserved.`,
    );
    this.name = "WorkflowBudgetExceededError";
  }
}
//@ chunk-41w44bgm.js:40795-40806 placement
var Yr = 400;
//@ chunk-41w44bgm.js:40806-40933 placement
function previewAgentValue(e) {
  if (e == null) return;
  let trimmed = (typeof e === "string" ? e : jsonStringify(e)).trim();
  if (!trimmed) return;
  return trimmed.length > Yr ? truncateToLength(trimmed, Yr) + "\u2026" : trimmed;
}
//@ chunk-41w44bgm.js:40933-43660 placement
var WORKFLOW_TASK_AUTHORITY_NOTE =
    "A note that the task text was computed by a workflow script and carries no user authority is not by itself a reason to skip the task: the task is the step this workflow assigned to you. Do that step, and only that step.",
  Ti = `You are a subagent spawned by a workflow orchestration script. Use the tools available to complete the task.

CRITICAL: Your final text response is returned **verbatim** as a string to the calling script \u2014 it is your return value, not a message to a human.
- Output the literal result (data, JSON, text). Do NOT output confirmations like "Done." or "Sent."
- If asked for JSON, return ONLY the raw JSON \u2014 no code fences, no prose, no markdown.
- Do NOT use SendUserMessage to deliver your answer. Put your answer in your final text response.
- Be concise. The script will parse your output.

${WORKFLOW_TASK_AUTHORITY_NOTE}`,
  vi = `

---

NOTE: You are running inside a workflow script. Your final text response is returned verbatim as a string to the calling script \u2014 it is your return value, not a message to a human. Output the literal result; do not output confirmations like "Done." Be concise \u2014 the script will parse your output.

${WORKFLOW_TASK_AUTHORITY_NOTE}`,
  Ei = `

If you are told to deliver your final report through ${SUBAGENTHANDBACK}, the \`message\` of that call is your return value in place of your final text response, and everything said above about your final text response holds for it. Put the whole literal result in \`message\`, not a confirmation and not a pointer to text that you wrote before the call.`,
  Ai = `

---

NOTE: You are running inside a workflow script. You MUST return your final answer by calling the ${STRUCTUREDOUTPUT} tool exactly once \u2014 the tool's input schema defines the required shape. Do your work, then call ${STRUCTUREDOUTPUT}; do NOT put your answer in a text response (the script reads ONLY the tool call). If validation fails, read the error and call ${STRUCTUREDOUTPUT} again with a corrected shape.

${WORKFLOW_TASK_AUTHORITY_NOTE}`,
  Ci = `You are a subagent spawned by a workflow orchestration script. Use the tools available to complete the task.

CRITICAL: You MUST call the ${STRUCTUREDOUTPUT} tool exactly once to return your final answer. The tool's input schema defines the required shape.
- Do your work (Read files, run commands, etc.), then call ${STRUCTUREDOUTPUT} with your answer.
- Do NOT put your answer in a text response. The script reads ONLY the ${STRUCTUREDOUTPUT} tool call.
- If the schema validation fails, read the error and call ${STRUCTUREDOUTPUT} again with a corrected shape.
- After calling ${STRUCTUREDOUTPUT} successfully, end your turn. No acknowledgment needed.

${WORKFLOW_TASK_AUTHORITY_NOTE}`,
  Qn = {
    agentType: WORKFLOW_SUBAGENT_TYPE,
    whenToUse: "Internal subagent for workflow script orchestration.",
    tools: ["*"],
    disallowedTools: [BRIEF_TOOL_NAME, AGENT, WORKFLOW_TOOL_NAME],
    source: "built-in",
    baseDir: "built-in",
    getSystemPrompt: () => Ti,
  },
  Ri = { ...Qn, getSystemPrompt: () => Ci },
  Xr = 5;
//@ chunk-41w44bgm.js:43660-43848 placement
function recordStalledAgent(e, n, r) {
  (e.push(r.replyLost ? "reply lost" : (r.stalledReason ?? "stalled")),
    (n.maxContextTokens = Math.max(n.maxContextTokens, r.tokens)),
    (n.toolCalls += r.toolCalls),
    (n.durationMs += r.durationMs));
}
//@ chunk-41w44bgm.js:43848-43861 placement
var Mi = 90000;
/**
 * 工作流脚本的 agent 调用运行时（生成器状态机形式的转译代码，含预算、上限与日志）。
 */
//@ chunk-41w44bgm.js:43861-90673 placement
function createWorkflowAgentRuntime(e, n, r, h, T, y, A, L, j, he, ke, te, me, We) {
  let G = 0,
    ce = async (U) => ({ v: await U }),
    E = (U, ...ee) => U(...ee),
    s = (U) => clone(U),
    S = (U) => U,
    w = (U) => U,
    P = (U, ee) => {
      try {
        return U === null || U === void 0 ? void 0 : U[ee];
      } catch {
        return;
      }
    },
    V = { prev: "" },
    freeze = Object.freeze({ prev: "" }),
    se = new AsyncLocalStorage(),
    q = !1,
    ue = { inSlot: (U, ee) => ee(), join: () => {} };
  function Ee(U) {
    let store = se.getStore();
    if (!L || store === freeze) return ue;
    let Q = store ?? V,
      prev = Q.prev;
    Q.prev = childCallKey(prev, U, "fork");
    let Je = [];
    return {
      inSlot: (Re, Te) => {
        let it = { prev: childCallKey(prev, U, Re) };
        return ((Je[Re] = it), se.run(it, Te));
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
  let xe = readFlagWithOverride(WORKFLOW_JOURNAL_HOST_COPY_FLAG, { safe: !0 }),
    ut = !1,
    Tt = !1,
    Wt = !1,
    ye = [],
    gt = !1,
    Ut = new Map(),
    $t = new Set(),
    jt = (U, ee) => {
      let Q = Ut.get(U);
      if (Q === void 0) ((Q = new Set()), Ut.set(U, Q));
      Q.add(xre(ee));
    },
    kt = (U) => [...(Ut.get(U ?? "") ?? [])].filter((ee) => getConversationToolsUsed().has(ee)),
    $e,
    Se = (U) =>
      gt && !U.includes(Sh)
        ? `

${kgi(!0).trimEnd()}`
        : "",
    weakSet = new WeakSet();
  function Ie(U, { log: log }) {
    let Q = truncateMiddle(U);
    if ((ye.push(Q), log))
      r({ type: "progress", toolUseID: "workflow_log", data: { type: "workflow_log", message: Q } });
  }
  let tn = new UsageLimitWaiter({
      signal: e.abortController?.signal,
      log: (U) =>
        r({ type: "progress", toolUseID: "workflow_log", data: { type: "workflow_log", message: U } }),
      onChange: (U) => me?.(U),
      storageV5: e.storageV5,
    }),
    zt = limitConcurrency(1, createAgentWorktree),
    An;
  function Cn() {
    return (
      (An ??= (async () => {
        let U = getCwd(),
          ee = await getBranch(U);
        if (ee === "HEAD") return;
        if (await isBranchOnOrigin(ee, U)) return ee;
        r({
          type: "progress",
          toolUseID: "workflow_log",
          data: {
            type: "workflow_log",
            message: `local branch '${ee}' is not pushed to origin; remote agents will run against the repository's default branch.`,
          },
        });
        return;
      })()),
      An
    );
  }
  let kn = new Set();
  function fn(U) {
    return (ee, Q) => {
      let Le = `${U}\x00${ee}\x00${Q}`;
      if (kn.has(Le)) return;
      (kn.add(Le),
        r({
          type: "progress",
          toolUseID: "workflow_log",
          data: { type: "workflow_log", message: `[${U}] ${formatModelRestrictedNotice(ee, Q)}` },
        }));
    };
  }
  function Kt() {
    if (G < AGENT_CALL_CAP) return;
    if (!ut) ((ut = !0), logEvent("tengu_workflow_agent_cap_exceeded", { agentCount: G }));
    throw new WorkflowAgentCapError();
  }
  function yn() {
    if (A?.total == null || A.total <= 0) return;
    let turnSpent = A.getTurnSpent();
    if (turnSpent < A.total) return;
    if (!Tt)
      ((Tt = !0),
        logEvent("tengu_workflow_budget_cap_exceeded", { spent: turnSpent, budget: A.total, agentCount: G }));
    throw new WorkflowBudgetExceededError(turnSpent, A.total);
  }
  let ks = 0,
    no,
    Ko = new Map(),
    Y = {
      ...e,
      options: { ...e.options, mainLoopModel: resolveContextPrimaryModel(e.options) },
      isBackgroundAgent: !0,
      setAppState: () => {},
      setToolPermissionContext: () => {},
      setSessionToolPermissionContext: e.setSessionToolPermissionContext,
    };
  function Rn(U) {
    if (U) return U;
    let ee = getWorkflowSubagentModel();
    if (ee !== void 0) return ee;
    let Q = getDefaultSubagentModel();
    return Q !== "inherit" ? Q : Y.options.mainLoopModel;
  }
  function Go(U, ee) {
    let Q = truncateMiddle(U),
      Le = Ko.get(Q);
    if (Le == null) ((Le = { index: ++ks, kind: ee, announced: !1, title: Q }), Ko.set(Q, Le));
    return Le;
  }
  function ys(U, ee) {
    return Go(U, ee).index;
  }
  function Mn(U) {
    let ee = Go(U);
    if (!ee.announced)
      ((ee.announced = !0),
        r({
          type: "progress",
          toolUseID: `workflow_phase_${ee.index}`,
          data: { type: "workflow_phase", index: ee.index, title: ee.title, kind: ee.kind },
        }));
    return ee.index;
  }
  for (let U of y ?? []) Mn(U);
  let bs = Qt((U) => {
      ((no = describeLogArg(U)), Mn(no));
    }),
    qo = env.CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS ?? DEFAULT_MAX_CONCURRENT_AGENTS;
  if (env.CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS !== void 0)
    logForDebugging(`workflow: concurrent agent gate = ${qo} (CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS)`);
  let Ss = limitConcurrency(qo, vs),
    _s = limitConcurrency(AGENT_CONCURRENCY_CEILING, As);
  async function On({
    idx: idx,
    promptStr: promptStr,
    label: label,
    ownPhaseTitle: ownPhaseTitle,
    ownPhaseIndex: ownPhaseIndex,
    opts: opts,
    queuedAt: queuedAt,
    provenanceOn: provenanceOn,
  }) {
    let Ne = getToolPermissionContext(Y);
    if (Ne.mode !== "auto") return !1;
    let Me, ze;
    if (opts?.schema != null) {
      let at = [],
        et = new Set(),
        lt = MAX_SCHEMA_NODES,
        Be = 0;
      try {
        let json = JSON.stringify(opts.schema, function (ve, Xe) {
          if (--lt < 0) throw Error("output schema expansion exceeds the node budget");
          let Ke = typeof Xe === "bigint" ? Xe.toString() : Xe;
          if (((Be += ve.length + (typeof Ke === "string" ? Ke.length : 0)), Be > CLr))
            throw Error("output schema too large to classify");
          if (Ke !== null && typeof Ke === "object") {
            while (at.length > 0 && at.at(-1) !== this) et.delete(at.pop());
            if (et.has(Ke)) return "[Circular]";
            (at.push(Ke), et.add(Ke));
          }
          return Ke;
        });
        if (json !== void 0 && json.length > CLr)
          throw ((Be = json.length), Error("output schema too large to classify"));
        Me = json || void 0;
      } catch {
        ze =
          Be > CLr
            ? "output schema too large for the safety classifier"
            : "output schema could not be serialized for the safety classifier";
      }
    }
    let st = isSchemaTooLargeToSkipReview(Me);
    if (provenanceOn && !st && ze === void 0) return !1;
    let ie = (at) => (
        logEvent("tengu_auto_mode_decision", {
          decision: fromEnum("blocked"),
          toolName: fromEnum(TASK),
          inProtectedNamespace: isEvalBuild(),
          ...getProjectsRoleTelemetry(e),
          isHandoff: !1,
        }),
        { reason: at, unreviewed: !0 }
      ),
      St =
        ze ??
        (provenanceOn
          ? isClassifierSideCallRetired("workflow_schema")
            ? `output schema is over ${MAX_UNREVIEWED_SCHEMA_CHARS} characters, too large to pass unreviewed in auto mode, so this agent was not started; shorten the schema`
            : void 0
          : isClassifierSideCallRetired("workflow_prompt")
            ? AUTO_MODE_CLASSIFIER_OFF_MESSAGE
            : void 0),
      Ce = St
        ? ie(St)
        : await reviewWorkflowAgentDispatch({
            prompt: promptStr,
            schemaJson: Me,
            agentType: opts?.agentType != null ? String(opts.agentType) : void 0,
            parentMessages: e.messages,
            inheritedVerifiedHumanTurns: e.inheritedVerifiedHumanTurns,
            parentTools: e.options.tools,
            rootToolSurface: e.rootToolSurface,
            toolPermissionContext: Ne,
            abortSignal: Y.abortController.signal,
            dispatchAgentId: e.agentId,
            storageV5: e.storageV5,
            credentials: e.credentials,
          }).catch((at) => {
            if (!Y.abortController?.signal.aborted) logError(at);
            if (!st || Y.abortController?.signal.aborted) return null;
            return ie("classifier error; output schema too large to pass unreviewed");
          });
    if (Y.abortController?.signal.aborted) throw Error("Workflow aborted");
    if (!Ce) return !1;
    let ct = Ce.unreviewed
      ? `[${label}] blocked: ${Ce.reason}`
      : `[${label}] blocked by safety classifier: ${Ce.reason}`;
    return (
      Ie(ct, { log: !1 }),
      r({
        type: "progress",
        toolUseID: `workflow_agent_${idx}_blocked`,
        data: {
          type: "workflow_agent",
          index: idx,
          label: label,
          phaseIndex: ownPhaseIndex,
          phaseTitle: ownPhaseTitle,
          agentType: opts?.agentType != null ? String(opts.agentType) : void 0,
          isolation: opts?.isolation === "worktree" || opts?.isolation === "remote" ? opts.isolation : void 0,
          model: Rn(opts?.model),
          state: "error",
          blocked: !0,
          error: ct,
          queuedAt: queuedAt,
          promptPreview: previewAgentValue(promptStr),
          lastProgressAt: Date.now(),
        },
      }),
      !0
    );
  }
  let weakMap = new WeakMap(),
    Ts = Qt(async (U, ee, Q, Le, Je) => {
      let agentContext = e.agentContext,
        Te = Q instanceof AbortSignal ? Q : void 0,
        it = Je instanceof AbortSignal ? Je : void 0,
        store = se.getStore(),
        Me = store ?? V,
        ze = Le instanceof iin || store === freeze,
        st;
      if (ee !== null && typeof ee === "object" && !Pf(ee)) {
        let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(ee, "schema"),
          He =
            ownPropertyDescriptor && "value" in ownPropertyDescriptor ? ownPropertyDescriptor.value : void 0;
        if (He !== null && typeof He === "object") st = He;
      }
      let ie = LZr(S(ee));
      if (ie && st !== void 0) {
        let oe = weakMap.get(st);
        if (oe === void 0) ((oe = LZr(S(st))), weakMap.set(st, oe));
        ie.schema = oe;
      }
      let St =
        getWorkflowSubagentModel() !== void 0
          ? "CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL is set"
          : env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE
            ? "CLAUDE_CODE_SUBAGENT_MODEL_FORCE is on"
            : void 0;
      if (ie?.model !== void 0 && St !== void 0)
        (logForDebugging(`Workflow agent model "${ie.model}" ignored: ${St}`), (ie.model = void 0));
      if (Y.abortController?.signal.aborted) return new Promise(() => {});
      try {
        (Kt(), yn());
        let oe = ie?.disallowedTools;
        if (oe !== void 0) {
          if (!Array.isArray(oe) || oe.some((Qe) => typeof Qe !== "string" || Qe === "" || Qe !== Qe.trim()))
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "agent() opts.disallowedTools must be an array of non-empty tool-name strings (e.g. ['Bash', 'Write']); got " +
                (Array.isArray(oe)
                  ? "an array with non-string, empty, or whitespace-padded entries"
                  : typeof oe) +
                ". Refusing the spawn rather than running it un-narrowed.",
              "agent() opts.disallowedTools malformed \u2014 spawn refused",
            );
          if (ie !== void 0) ie.disallowedTools = oe.length === 0 ? void 0 : uniq(oe).sort();
        }
        let He = ie?.bashCommandClamp;
        if (He !== void 0) {
          if (!Array.isArray(He) || He.some((pt) => typeof pt !== "string" || pt === "" || pt !== pt.trim()))
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "agent() opts.bashCommandClamp must be an array of non-empty strings; got " +
                (Array.isArray(He)
                  ? "an array with non-string, empty, or whitespace-padded entries"
                  : typeof He) +
                ". Refusing the spawn rather than running it un-clamped.",
              "agent() bashCommandClamp malformed \u2014 spawn refused",
            );
          let Qe = He.length === 0 ? void 0 : uniq(He).sort();
          for (let pt of Qe ?? []) {
            let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(pt);
            if (
              toolName !== BASH_TOOL_NAME ||
              ruleContent === void 0 ||
              ruleContent === "" ||
              ruleContent !== ruleContent.trim()
            )
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `agent() opts.bashCommandClamp entry '${pt}' must be a '${BASH_TOOL_NAME}(<command or prefix>)' permission rule (tool name case-sensitive, non-empty content with no leading/trailing whitespace inside the parens); it parses to tool '${toolName}'` +
                  (ruleContent === void 0 || ruleContent === ""
                    ? " with no rule content"
                    : ruleContent !== ruleContent.trim()
                      ? " with whitespace-padded rule content"
                      : "") +
                  ". Refusing the spawn rather than running it with an inert clamp entry.",
                "agent() opts.bashCommandClamp inert entry \u2014 spawn refused",
              );
          }
          if (ie !== void 0) ie.bashCommandClamp = Qe;
        }
      } catch (error) {
        throw (await sleep(0), error);
      }
      let Ce = ++G,
        ct = describeLogArg(U),
        at =
          ie?.label != null
            ? String(ie.label).replace(/\s+/g, " ").trim()
            : We
              ? `agent ${Ce}`
              : truncateToLength(ct, 60).replace(/\s+/g, " ").trim(),
        et = ie?.phase != null ? String(ie.phase) : no,
        lt = et != null ? Mn(et) : void 0,
        Be = ie?.stallMs != null ? Number(ie.stallMs) : getAsyncAgentStallTimeoutMs(),
        Et = previewAgentValue(ct),
        ve,
        Xe,
        Ke = !1;
      if (L && !ze) {
        ((ve = agentCallKey(ct, ie, Me.prev)), (Me.prev = ve));
        let oe = q ? void 0 : j?.results.get(ve);
        if (oe !== void 0) {
          if (j?.replaced.has(ve)) Me.prev = Fo(ve, typeof oe.agentId === "string" ? oe.agentId : "");
          if (oe.foreignArtifactContent) gt = !0;
          if (Array.isArray(oe.toolsUsed)) {
            for (let pt of oe.toolsUsed)
              if (typeof pt === "string")
                $t.add(getConversationToolsUsed().has(pt) ? pt : UNREADABLE_TOOLS_USED_BEFORE_SUMMARY);
          }
          return (
            r({
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
                cached: !0,
                resultPreview: previewAgentValue(oe.result),
                promptPreview: Et,
              },
            }),
            s(oe.result)
          );
        }
        let He = j?.started.get(ve);
        if (!(!q && He !== void 0 && He.length > 0 && !j?.failed.has(ve) && !j?.demoted.has(ve))) q = !0;
        if (
          ((Ke = j !== void 0 && (j.results.has(ve) || j.demoted.has(ve) || j.failed.has(ve))),
          He && He.length > 0)
        )
          logEvent("tengu_workflow_journal_started_hit_respawn", { attempts: He.length });
      }
      let cn = !1,
        nn = (oe) => {
          if (((cn = !0), (Xe = oe), !L || ve === void 0)) return;
          L.append({ type: "started", key: ve, agentId: oe, ...Zr(at, et) }).catch((He) =>
            logForDebugging(`workflow journal started-append failed: ${He}`, { level: "warn" }),
          );
        },
        At = async () => {
          if (!L || !ve || Y.abortController?.signal.aborted || it?.aborted) return;
          await L.append({ type: "failed", key: ve, agentId: Xe ?? "" }).catch((oe) =>
            logForDebugging(`workflow journal failed-append failed: ${oe}`, { level: "warn" }),
          );
        },
        Bt = async (oe) => {
          if (oe === null) await At();
          if (L && ve && oe !== null) {
            let He = oe;
            if (xe)
              try {
                He = LZr(S(oe));
              } catch (error) {
                return (
                  logForDebugging(
                    `workflow journal: did not save an agent() result, so a resumed run will re-run from this call: ${describeThrownValue(error).msg}`,
                    { level: "warn" },
                  ),
                  await At(),
                  oe
                );
              }
            else if (typeof oe === "object") return (await At(), oe);
            if (
              (await L.append({
                type: "result",
                key: ve,
                agentId: Xe ?? "",
                result: He,
                ...(gt && { foreignArtifactContent: !0 }),
                ...(kt(Xe).length > 0 && { toolsUsed: kt(Xe) }),
              }).catch((Qe) =>
                logForDebugging(`workflow journal result-append failed: ${Qe}`, { level: "warn" }),
              ),
              Ke && Me.prev === ve)
            )
              Me.prev = Fo(ve, Xe ?? "");
          }
          return oe;
        },
        now = Date.now(),
        Gt = () =>
          r({
            type: "progress",
            toolUseID: `workflow_agent_${Ce}_queued`,
            data: {
              type: "workflow_agent",
              index: Ce,
              label: at,
              phaseIndex: lt,
              phaseTitle: et,
              agentType: ie?.agentType != null ? String(ie.agentType) : void 0,
              isolation: ie?.isolation === "worktree" || ie?.isolation === "remote" ? ie.isolation : void 0,
              model: Rn(ie?.model),
              state: "start",
              queuedAt: now,
              promptPreview: Et,
              lastProgressAt: now,
            },
          }),
        Vt = (oe) => {
          if (cn || Y.abortController?.signal.aborted) return;
          r({
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
              error: oe instanceof Error ? oe.message : String(oe),
              queuedAt: now,
              promptPreview: Et,
              lastProgressAt: Date.now(),
            },
          });
        };
      if (ie?.isolation === "remote")
        throw Error("agent({isolation:'remote'}) is not available in this build");
      Gt();
      try {
        return await Bt(await Ss(Ce, ct, at, et, lt, Be, ie, nn, now, agentContext, Te));
      } catch (error) {
        if ((Vt(error), await At(), Y.abortController?.signal.aborted)) return new Promise(() => {});
        throw error;
      }
    });
  async function Zo({
    idx: idx,
    promptStr: promptStr,
    label: label,
    agent: agent,
    model: model,
    permissionMode: permissionMode,
    evalSignal: evalSignal,
  }) {
    let agentContext = e.agentContext,
      Ne = typeof model === "string" ? model : void 0,
      Me = await runAgentSpawnHooks(
        {
          tool_use_id: e.toolUseId ?? "",
          prompt: We ? "(withheld: this workflow run does not share its script)" : promptStr,
          description: label,
          agent: agent,
          agents: [],
          model: Ne,
          parentModel: getMainLoopModel_2(Y),
          parentAgentId: isMainAgent(agentContext) ? void 0 : agentContext?.agentId,
          permissionMode: permissionMode,
          background: !1,
          fork: !1,
          name: void 0,
          cwd: void 0,
          workflow: Object.freeze({ runId: h ?? "", agentIndex: idx }),
          signal: AbortSignal.any([Y.abortController?.signal, evalSignal].filter((st) => st !== void 0)),
          origin: Y.hookOrigin,
        },
        K1r,
      ).catch((st) => {
        if (evalSignal?.aborted) return;
        throw st;
      }),
      ze = Y.abortController?.signal.aborted === !0;
    if (ze || Me === void 0 || evalSignal?.aborted) {
      if ((Me?.starting?.[Symbol.dispose](), ze)) throw Error("Workflow aborted");
      return null;
    }
    if (Me.deny !== void 0) {
      if (!Wt) ((Wt = !0), logFeatureBad("subagent_launch", "workflow_spawn_denied_by_hook"));
      throw (
        await sleep(0),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Workflow agent spawn denied by a plugin: ${Me.deny}`,
          "Workflow agent spawn denied by a plugin",
        )
      );
    }
    return {
      starting: Me.starting,
      prompt: We ? promptStr : Me.spawn.prompt,
      model: Me.spawn.model === Ne || env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE ? model : Me.spawn.model,
      isRewritten: Me.isRewritten,
    };
  }
  async function vs(U, ee, Q, Le, Je, Re, Te, it, Ne, Me, ze) {
    if ((await tn.whenClear(), Y.abortController?.signal.aborted)) throw Error("Workflow aborted");
    if (ze?.aborted) return null;
    let st = Zr(Q, Le);
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
        queuedAt: Ne,
        provenanceOn: ie,
      })
    )
      return null;
    let St;
    if (Te?.agentType != null) {
      let R = String(Te.agentType),
        activeAgents = Y.options.agentDefinitions.activeAgents,
        we = getToolPermissionContext(Y),
        ge = await filterDispatchableAgents(activeAgents, we, AGENT),
        found = ge.find((Ae) => Ae.agentType === R);
      if (!found) {
        let found = activeAgents.find((yt) => yt.agentType === R),
          nt = found ? findDenyRuleWithContent(we, AGENT, R) : null;
        if (nt)
          throw Error(
            `agent({agentType}): '${R}' is denied by permission rule '${AGENT}(${R})' from ${nt.source}.`,
          );
        if (found && isAgentToolPoolDenied(found, we))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `agent({agentType}): ${agentToolPoolDeniedMessage(R)}`,
            "workflow agent(): agent type unavailable, tool pool denied",
          );
        throw Error(
          `agent({agentType}): agent type '${R}' not found. Available agents: ${ge.map((yt) => yt.agentType).join(", ")}`,
        );
      }
      let re = [...(found.disallowedTools ?? []), ...(Qn.disallowedTools ?? [])],
        Ze = Te.schema ? Ai : vi,
        qe =
          Te.schema && !parseWildcardAgentTypes(found.tools)
            ? [...(found.tools ?? []), STRUCTUREDOUTPUT]
            : found.tools;
      St = { ...withSystemPromptSuffix(found, Ze), disallowedTools: re, tools: qe };
    }
    let Ce;
    if (Te?.schema) {
      let R = createSyntheticOutputTool(Te.schema);
      if ("error" in R || R.unsatisfiable) await sleep(0);
      if ("error" in R)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `agent({schema}) received an invalid JSON Schema: ${R.error}`,
          "Workflow agent({schema}) invalid JSON Schema",
        );
      if (R.unsatisfiable) {
        let Pe = `agent({schema}) received an unusable JSON Schema \u2014 ${checkSchemaSatisfiable(R.unsatisfiable)}`,
          { message: message } = R.unsatisfiable;
        if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_workflow_schema_lint_enforce", !0))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${Pe}: ${message}. The subagent was not started \u2014 fix the schema and call agent() again.`,
            "Workflow agent({schema}) unsatisfiable JSON Schema",
          );
        if (!weakSet.has(R))
          (weakSet.add(R),
            r({
              type: "progress",
              toolUseID: "workflow_log",
              data: { type: "workflow_log", message: `[${Q}] warning: ${Pe}: ${message}` },
            }));
      }
      Ce = R.tool;
    }
    let ct = St ?? (Ce ? Ri : Qn),
      at = parseEffortValue(Te?.effort) ?? getDefaultSubagentEffort(ct, Y.permissionLayers),
      et = at !== void 0 ? { ...ct, effort: at } : ct,
      lt = Te?.disallowedTools,
      Be = Te?.bashCommandClamp,
      ve =
        (lt !== void 0 && lt.length > 0) || (Be !== void 0 && Be.length > 0)
          ? {
              ...et,
              disallowedTools: [
                ...(et.disallowedTools ?? []),
                ...(lt ?? []),
                REPL_TOOL_NAME,
                ...(Be !== void 0 && Be.length > 0 ? ["mcp__*", POWERSHELL_TOOL_NAME] : []),
              ],
            }
          : et;
    await waitForCoordinatorSubagentMcpServers(() => Y.getAppState().mcp);
    let appState = Y.getAppState(),
      Ke = getToolPermissionContext(Y),
      filtered = Y.options.tools.filter(isMcpTool),
      assembleToolPool = Y.options.toolCatalog.assembleToolPool(
        Ke,
        excludeCoordinatorCommsMcpTools(appState.mcp.tools.concat(filtered)),
        { skipReplFilter: !0, machineMcpTools: bridgeToolsOf(Y) },
      ),
      At = (R) => resolveAgentTools(ve, R, !1, !1, !1, getAgentDepth(Me) + 1, bN(Y).mode),
      Bt = (R) => {
        let filtered = filterToolsByDenyRules(
          [GlobTool, GrepTool, ...pnr([GrepTool.name, GlobTool.name])],
          Ke,
        ).filter((we) => !R.some((ge) => toolMatchesName(ge, we.name)));
        return filtered.length > 0 ? [...R, ...filtered] : R;
      },
      dt = assembleToolPool;
    if (lt !== void 0 && lt.length > 0) {
      if (
        hasEmbeddedSearchTools() &&
        !At(dt).resolvedTools.some((resolvedTool) => toolMatchesName(resolvedTool, BASH_TOOL_NAME))
      )
        dt = Bt(dt);
      let R = Zin(ve.mcpServers),
        Pe = (we) => {
          if (we.length === 0) return;
          let ge = `mcp__${we}`,
            pe = probeAgentToolPool(ge, dt, R);
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
      for (let we of lt) {
        let ge = buildDisallowedToolsFilter([we]);
        if (dt.some((Ae) => ge.isToolDisallowed(Ae))) continue;
        let { toolName: toolName } = permissionRuleValueFromString(we);
        if (toolName !== toolName.trim() || /[\s()]/.test(toolName.trim()))
          throw (
            await sleep(0),
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${we}' parses to tool name '${toolName}', which can never match a tool \u2014 check ` +
                "for a space before the rule parens or an unbalanced paren. Refusing the spawn rather than running it un-narrowed.",
              "agent() opts.disallowedTools unparseable entry \u2014 spawn refused",
            )
          );
        {
          let Ae = /^mcp__/i.test(toolName) ? mcpInfoFromString(`mcp__${toolName.slice(5)}`) : null;
          if (/^mcp__/i.test(toolName) && Ae === null)
            throw (
              await sleep(0),
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `agent() opts.disallowedTools entry '${we}' cannot match ` +
                  "any tool \u2014 its server segment is empty, so it names no " +
                  "server. Use 'mcp__<server>' to deny one server's tools ('mcp__<server>__<tool>' for one tool), or 'mcp__*' to deny every MCP server's tools. Refusing the spawn rather than running it un-narrowed.",
                "agent() opts.disallowedTools empty mcp server segment \u2014 spawn refused",
              )
            );
          if (Ae !== null && Ae.serverName.includes("*") && Ae.serverName !== "*") {
            let nt = Pe(Ae.serverName.replace(/\*+/g, ""));
            throw (
              await sleep(0),
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `agent() opts.disallowedTools entry '${we}' cannot match ` +
                  "any tool \u2014 server names take no wildcard. Use " +
                  (nt !== void 0 ? `'${nt}' for that server's tools, or ` : "") +
                  "'mcp__*' for every MCP server's tools. Refusing the spawn rather than running it un-narrowed.",
                "agent() opts.disallowedTools wildcard mcp server \u2014 spawn refused",
              )
            );
          }
          if (Ae !== null && Ae.toolName !== void 0 && Ae.toolName !== "*" && Ae.toolName.includes("*")) {
            let nt = Pe(Ae.serverName);
            throw (
              await sleep(0),
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `agent() opts.disallowedTools entry '${we}' cannot match ` +
                  "any tool \u2014 tool names take no wildcard. " +
                  (nt !== void 0
                    ? `Use '${nt}' to deny all of that server's tools, or enumerate exact tool names. `
                    : "Enumerate exact tool names, or use 'mcp__*' to deny every MCP server's tools. ") +
                  "Refusing the spawn rather than running it un-narrowed.",
                "agent() opts.disallowedTools wildcard mcp tool \u2014 spawn refused",
              )
            );
          }
        }
        if (toolName.includes("*") && mcpInfoFromString(toolName) === null && !/^mcp__/i.test(toolName))
          throw (
            await sleep(0),
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${we}' cannot match ` +
                "any tool \u2014 '*' is not a deny wildcard outside mcp__ server " +
                "specs. " +
                (toolName.toLowerCase().startsWith("skill__")
                  ? `Use '${SKILL}' to deny every skill. `
                  : "Enumerate the tools to deny (e.g. ['Bash', 'Write']), or use 'mcp__*' to deny every MCP server's tools. ") +
                "Refusing the spawn rather than running it un-narrowed.",
              "agent() opts.disallowedTools wildcard-bearing entry \u2014 spawn refused",
            )
          );
        if (toolName === SKILL) continue;
        if (Ce !== void 0 && toolName === STRUCTUREDOUTPUT) continue;
        let lower = toolName.toLowerCase(),
          Ze =
            dt
              .flatMap((Ae) => [Ae.name, getToolNameForPermissionCheck(Ae)])
              .find((Ae) => Ae.toLowerCase() === lower) ??
            (lower === SKILL.toLowerCase() ? SKILL : void 0) ??
            (Ce !== void 0 && lower === STRUCTUREDOUTPUT.toLowerCase() ? STRUCTUREDOUTPUT : void 0),
          qe = probeAgentToolPool(toolName, dt, R);
        if (qe?.kind === "declared-server") {
          let Ae = mcpInfoFromString(toolName);
          if (!(!qe.verifiable && Ze !== void 0 && mcpInfoFromString(Ze)?.serverName === Ae?.serverName)) {
            logForDebugging(
              `workflow agent(): disallowedTools mcp entry '${toolName}' covers this agent's declared frontmatter MCP server '${qe.declaredSpelling}' \u2014 those tools connect at ` +
                "spawn, after this check, and the deny is applied to them then" +
                (qe.verifiable ? "" : " (a full tool-name entry cannot be verified here)"),
            );
            continue;
          }
        }
        if (Ze !== void 0)
          throw (
            await sleep(0),
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `agent() opts.disallowedTools entry '${we}'` +
                (toolName !== we ? ` (parsed tool name '${toolName}')` : "") +
                ` does not match any tool, but '${Ze}' exists \u2014 ` +
                "tool names are case-sensitive. Refusing the spawn rather than running it with this deny silently dropped.",
              "agent() opts.disallowedTools case-mismatched entry \u2014 spawn refused",
            )
          );
        if (qe !== null) {
          if (qe.kind === "pool-server") continue;
          if (qe.kind === "slip")
            throw (
              await sleep(0),
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `agent() opts.disallowedTools entry '${we}'` +
                  (toolName !== we ? ` (parsed tool name '${toolName}')` : "") +
                  ` cannot match as written, but '${qe.correctedSpelling}' would \u2014 deny entries ` +
                  "must match the normalized server spelling exactly, mcp__ prefix and case included. Refusing the spawn rather than running it with this deny silently dropped.",
                "agent() opts.disallowedTools mismatched mcp entry \u2014 spawn refused",
              )
            );
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
    if (Ce !== void 0 && buildDisallowedToolsFilter(ve.disallowedTools).isToolDisallowed(Ce))
      throw (
        await sleep(0),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `agent() schema mode needs the ${STRUCTUREDOUTPUT} tool, ` +
            "but the spawn's merged disallowedTools deny it \u2014 refusing the " +
            "spawn instead of running an agent that cannot return its structured output.",
          "agent() schema mode with StructuredOutput denied \u2014 spawn refused",
        )
      );
    if (Be !== void 0 && Be.length > 0 && hasEmbeddedSearchTools()) dt = Bt(dt);
    if (Be !== void 0 && Be.length > 0) {
      let toolAliases = getToolPermissionContext(Y).toolAliases,
        toolAliases_2 = Y.options.toolAliases,
        found = [BASH_TOOL_NAME, MONITOR, POWERSHELL_TOOL_NAME].find(
          (ge) => toolAliases?.[ge] !== void 0 || toolAliases_2?.[ge] !== void 0,
        );
      if (found !== void 0)
        throw (
          await sleep(0),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `agent() opts.bashCommandClamp cannot bind in this session: the host remaps ${found} via toolAliases, so exec ` +
              "dispatch runs the alias target's permission path instead \u2014 " +
              "the clamp cannot be guaranteed to apply on that surface. Refusing the spawn rather than running it un-clamped.",
            "agent() bashCommandClamp under a shell toolAlias \u2014 spawn refused",
          )
        );
    }
    if (
      Be !== void 0 &&
      Be.length > 0 &&
      !At(dt).resolvedTools.some((resolvedTool) => toolMatchesName(resolvedTool, BASH_TOOL_NAME))
    )
      throw (
        await sleep(0),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `agent() opts.bashCommandClamp can bind nothing: the spawned agent's resolved tool pool has no ${BASH_TOOL_NAME} (removed by this spawn's disallowedTools, the agent definition's denies, or absent from the session pool). A clamp on a Bash-less agent ` +
            "means the commands it was meant to keep are unavailable \u2014 " +
            "refusing the spawn rather than running a blind agent. Drop the clamp or the Bash deny.",
          "agent() bashCommandClamp with no Bash in resolved pool \u2014 spawn refused",
        )
      );
    let Gt = dt,
      Vt = Ce ? [...Gt.filter((R) => !toolMatchesName(R, STRUCTUREDOUTPUT)), Ce] : Gt,
      oe = await Zo({
        idx: U,
        promptStr: ee,
        label: Q,
        agent: ve,
        model: Te?.model,
        permissionMode: Ke.mode,
        evalSignal: ze,
      });
    if (oe === null) return null;
    using starting = oe.starting;
    let { prompt: prompt, model: model, isRewritten: isRewritten } = oe;
    if (
      prompt !== ee &&
      (await On({
        idx: U,
        promptStr: prompt,
        label: Q,
        ownPhaseTitle: Le,
        ownPhaseIndex: Je,
        opts: Te,
        queuedAt: Ne,
        provenanceOn: ie,
      }))
    )
      return null;
    let tt = getAgentModel(
        getExploreAgentModel(ve, Y.options.mainLoopModel),
        Y.options.mainLoopModel,
        model,
        Ke.mode,
        void 0,
        { inWorkflowRun: h !== void 0 },
      ),
      er = Ke.mode === "auto",
      wt = Ce === void 0 && Kr(Ke.mode),
      ft = Ce !== void 0 && Io(Ke.mode),
      Yt = null;
    if (Te?.isolation === "worktree" && isWebFetchAgent(ve))
      logForDebugging(
        "[web-fetch agent] isolation:'worktree' ignored; the built-in web-fetch agent always runs as a local agent",
      );
    else if (Te?.isolation === "worktree") {
      let R = h ? `${h}-${U}` : `wf-${U}`;
      Yt = await zt(R, { storageV5: Y.storageV5, credentials: Y.credentials });
    }
    let oo = Yt?.worktreePath,
      ro = ie ? classifyWorkflowRequestSource(e.messages, e.agentId) : null,
      so = ro?.kind === "relay" ? userRequestFraming(ro) : null,
      nr = `${!ie ? prompt : ro?.kind === "automated" ? wCo(prompt) : tDr(prompt)}${Se(prompt)}`,
      xn = Yt
        ? `${nr}

---
You are running in an isolated git worktree at \`${SCo(Yt.worktreePath)}\` (a separate working copy of the repo). Changes you make here do NOT affect the main working directory (\`${SCo(getCwd())}\`) or other agents. Work normally \u2014 the worktree will be cleaned up automatically if you made no changes, or preserved for review if you did.`
        : nr,
      _t = 0,
      ht = 0,
      Nt = 0,
      now = Date.now(),
      rr = previewAgentValue(prompt),
      joined = [
        tt ?? "",
        String(ve.effort ?? getEffortValue(Y) ?? ""),
        ve.agentType,
        Vt.map((R) => R.name).join(","),
        Te?.schema ? jsonStringify(Te.schema) : "",
        oo ?? getCwd(),
      ].join(`
`),
      io;
    async function xs(R, Pe, we, ge, pe) {
      let re = makeSaltedName();
      (it(re), starting.started({ agentId: re, model: tt }));
      let Ze = {
          agentId: re,
          parentAgentId: isMainAgent(Me) ? void 0 : Me?.agentId,
          depth: getAgentDepth(Me) + 1,
          parentSessionId: getParentSessionId(),
          agentType: "subagent",
          subagentName: ve.agentType,
          workflowRunId: h,
          workflowName: he,
          workflowWaitsOutUsageLimit: (Z) => tn.wouldWait(Z),
          isAsync: !1,
          isBuiltIn: isBuiltInAgent(ve),
          isBackgroundAgent: !0,
          invokingRequestId: ke,
          invocationKind: "spawn",
          invocationEmitted: !1,
          parentPromptId: te,
        },
        qe = `workflow_agent_${U}_${re}`,
        Ae,
        nt,
        yt,
        lo = new Map(),
        Ps = new Map(),
        dr,
        fr = tt,
        cr = tt ? Bn(tt) : void 0,
        Ht = (Z, Ue) =>
          r({
            type: "progress",
            toolUseID: qe,
            data: {
              type: "workflow_agent",
              index: U,
              label: we,
              phaseIndex: Je,
              phaseTitle: Le,
              agentId: re,
              agentType: St?.agentType,
              isolation: Yt ? "worktree" : void 0,
              model: tt,
              fallbackModel: dr,
              state: Z,
              startedAt: now,
              queuedAt: Ne,
              attempt: ge,
              lastAttemptReason: pe === "rate_limited" ? "throttled" : pe,
              lastToolName: Ae,
              lastToolSummary: nt,
              promptPreview: rr,
              promptFramed: ie,
              lastProgressAt: Date.now(),
              ...Ue,
            },
          }),
        abortController = new AbortController(),
        uo = Y.abortController?.signal,
        pr = () => abortController.abort(new DOMException("workflow-abort", "AbortError"));
      if ((uo?.addEventListener("abort", pr), uo?.aborted))
        abortController.abort(new DOMException("workflow-abort", "AbortError"));
      let fo = () => abortController.abort(new DOMException("user-skip", "AbortError"));
      if ((ze?.addEventListener("abort", fo), ze?.aborted)) fo();
      let mn,
        mr = 0,
        min = Math.min(Re * 0.1, 1000),
        co = () => {
          if ((mn?.clear(), Re > 0))
            mn = setMonotonicTimeout(Oi.bind(void 0, abortController), Re, R.host.clock, { unref: !1 });
        },
        Sn = new Set(),
        Is = VGn(),
        gr = () => {
          if (Sn.size === 0 && mn === void 0) co();
        },
        wr = () => {
          if (Sn.size > 0) return;
          let now = Date.now();
          if (now - mr < min) return;
          ((mr = now), co());
        },
        In = {
          ...Y,
          abortController: abortController,
          ...(Be !== void 0 &&
            Be.length > 0 && {
              permissionLayers: [...(Y.permissionLayers ?? []), { kind: "bash_command_clamp", rules: Be }],
            }),
        };
      (AGr({ toolUseContext: In }, isRewritten),
        Ht("start", _t || ht ? { tokens: _t, toolCalls: ht } : void 0),
        co());
      let hr,
        Ge,
        po = new Map(),
        mo,
        go = !1,
        wo = new Map(),
        ho = !1,
        sn = er ? [] : void 0,
        Ln = (Z) => {
          if (Z) gt = !0;
        };
      Ln(Pe.includes(Sh) || (so?.includes(Sh) ?? !1));
      let Lt,
        Dt = 0,
        bt = 0,
        Qi = (Z, Ue = !0) => {
          let Ot = () => !1,
            le = (Xt) => [...((Xt === void 0 ? void 0 : lo.get(Xt)?.values()) ?? [])],
            xt = (Xt) => le(Xt).some((Ns) => Ot(Ns.phase)),
            Tr = (Xt) => le(Xt).length > 0,
            Eo =
              (Z !== void 0 && xt(Z) ? Z : void 0) ??
              [...lo.keys()].findLast(xt) ??
              (Z !== void 0 && Tr(Z) ? Z : void 0) ??
              [...lo.keys()].findLast(Tr),
            Ao = Eo === void 0 ? [...Ps.entries()].at(-1) : void 0,
            vr = le(Eo),
            Vn = vr.findLast((Xt) => Ot(Xt.phase)) ?? vr.at(-1),
            Tn =
              Vn !== void 0
                ? { id: Eo, name: Vn.name, summary: describeWorkflowStep(Vn.input, Vn.name) || void 0 }
                : Ao !== void 0
                  ? { id: Ao[0], ...Ao[1] }
                  : void 0;
          if (((yt = Tn?.id), Tn?.name === Ae && Tn?.summary === nt)) return;
          if (((Ae = Tn?.name), (nt = Tn?.summary), Ue))
            Ht("progress", { tokens: _t + Dt, toolCalls: ht + bt });
        },
        ln = 0,
        _n = 0,
        wn,
        Dn,
        kr = new Set(),
        $n = new Map(),
        ko,
        yo = 0,
        bo = 0,
        yr = env.MAX_STRUCTURED_OUTPUT_RETRIES ?? MAX_STRUCTURED_OUTPUT_RETRIES,
        now_2 = Date.now(),
        Nn = isWebFetchAgent(ve) ? Ree() : void 0;
      try {
        (T?.(re, abortController),
          await runWithCwdOverride(Ze, async () => {
            for await (let Z of runAgent({
              agentDefinition: wt ? withSystemPromptSuffix(ve, Ei) : ve,
              turnPrompt: Pe,
              promptMessages:
                so === null
                  ? [createUserMessage({ content: Pe })]
                  : [createUserMessage({ content: so }), createUserMessage({ content: Pe })],
              toolUseContext: In,
              session: R,
              canUseTool: n,
              isAsync: !1,
              querySource: getQuerySourceForAgent(ve.agentType, isBuiltInAgent(ve)),
              spawnedBySkill: Y.options.spawnedBySkill ?? Y.options.activeSkill,
              spawnedByForkedSkill: Y.options.spawnedByForkedSkill,
              availableTools: Vt,
              requiresStructuredOutput: Ce !== void 0,
              structuredOutputIsHandback: ft,
              ...(wt && {
                handbackOptIn: !0,
                handbackTool: createSubagentHandbackTool(re, (Ue) => {
                  if (Ge === void 0) return ((Ge = Ue), !0);
                  if (
                    (Ge.review === null && Ue.review !== null) ||
                    (Ge.review === void 0 && Ue.review?.kind === "flagged")
                  )
                    Ge = { ...Ge, review: Ue.review, noVerdict: Ue.noVerdict };
                  return !1;
                }),
                callerDeliveredReport: () =>
                  Ge === void 0
                    ? void 0
                    : [
                        ...(Ge.review ? [Ge.review.warning] : []),
                        ...(Ge.noVerdict ? [structuredOutputUnjudgedWarning(Ge.noVerdict).warning] : []),
                        sanitizeSubagentOutput(Ge.message).sanitized,
                      ].join(`

`),
              }),
              transcriptSubdir: h ? `${WORKFLOW_TRANSCRIPT_SUBDIR}/${h}` : void 0,
              spawnedByWorkflowRunId: h,
              description: st.label,
              workflowPhase: st.phase,
              override: { agentId: re, agentContext: Ze },
              persistedToolResultFiles: Nn,
              model: model,
              onModelRestricted: fn(Q),
              onQueryProgress: wr,
              worktreePath: oo,
            })) {
              if (Z.type === "attachment" && Z.attachment.type === "structured_output") {
                ((Lt = Z.attachment.data), (ko = Z.attachment.toolUseID));
                continue;
              }
              if (Z.type === "attachment") Ln(containsUntrustedArtifactContent(Z));
              if (Z.type === "api_metrics") {
                if (Z.event.type === "start") io?.responded();
                continue;
              }
              if (Z.type === "query_model_change") {
                fr = Z.toModel;
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
                (sn?.push(Z), Ln(containsUntrustedArtifactContent(Z)));
                let Ue = [];
                if (Array.isArray(Z.message.content))
                  for (let le of Z.message.content) {
                    if (le.type !== "tool_result") continue;
                    let xt = wo.get(le.tool_use_id);
                    if ((wo.delete(le.tool_use_id), xt !== void 0 && !Ue.includes(xt))) Ue.push(xt);
                  }
                for (let le of fq([...Ue, Z])) jt(re, le);
                let content = Z.message.content;
                if (Array.isArray(content)) {
                  for (let le of content)
                    if (typeof le === "object" && le?.type === "tool_result") {
                      if (
                        (Sn.delete(le.tool_use_id),
                        qGn(Is, le.tool_use_id, Z.isVirtual === !0, le.is_error === !0),
                        kr.delete(le.tool_use_id) && le.is_error)
                      )
                        (_n++, (Dn = extractToolErrorExcerpt(le.content) ?? Dn));
                    }
                  if ((gr(), _n > 0 && _n >= yr && Lt === void 0)) {
                    let le = Dn === void 0 ? "" : ` \u2014 last StructuredOutput error: ${Dn}`;
                    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      `agent({schema}): StructuredOutput retry cap (${yr}) exceeded \u2014 ` +
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
                  (logForDebugging(
                    `workflow agent [${we}] ended with "${extractTextContent_2(Z.message.content, " ")}"; treating it as a stall`,
                    { level: "warn" },
                  ),
                    (ho = !0));
                  let dOMException = new DOMException("stalled", "AbortError");
                  throw (abortController.abort(dOMException), dOMException);
                }
                if (((hr = Z), !Z.isApiErrorMessage && Z.message.id !== mo))
                  ((mo = Z.message.id), (go = !1), yo++);
                for (let le of Z.message.content) {
                  if (le.type === "tool_use") wo.set(le.id, Z);
                  if (le.type === "tool_use" && le.name === SUBAGENTHANDBACK && Bkn(re) === !0)
                    po.set(le.id, Z.message.id);
                  else if (
                    le.type === "tool_use" ||
                    le.type === "server_tool_use" ||
                    le.type === "mcp_tool_use"
                  ) {
                    if (((go = !0), le.type !== "tool_use" || le.name !== STRUCTUREDOUTPUT)) bo = yo;
                  }
                }
                (sn?.push(Z), Ln(containsUntrustedArtifactContent(Z)));
                for (let le of Z.message.content)
                  if (le.type === "tool_use" || le.type === "server_tool_use")
                    jt(re, canonicalToolName(le.name.trim()));
                if (!Z.isApiErrorMessage) {
                  io?.responded();
                  let le =
                    Z.isUnmetered === !0 ? void 0 : finalContextTokensFromLastResponse(Z.message.usage);
                  if (le) Dt = getTokenCountFromUsage(le);
                  let model = Z.message.model;
                  if (model && cr && isForeignModelMessage(Z, cr)) dr = model;
                }
                let Ue = 0,
                  Ot = 0;
                for (let le of Z.message.content) {
                  if (le.type !== "tool_use") continue;
                  let xt = !1;
                  if ((Ue++, xt)) Ot++;
                  if (
                    (Sn.add(le.id),
                    (Ae = le.name),
                    (nt = describeWorkflowStep(le.input, le.name) || void 0),
                    (yt = le.id),
                    le.name === STRUCTUREDOUTPUT)
                  ) {
                    if ((ln++, (wn = le.input), kr.add(le.id), ft && !$n.has(le.id)))
                      $n.set(le.id, { response: Z, written: clone(le.input), responseNumber: yo });
                    if (Lt !== void 0 && ln > 2) {
                      abortController.abort("stalled");
                      break;
                    }
                  }
                }
                if (((bt += Ue - Ot), Ue > 0)) (mn?.clear(), (mn = void 0));
                else wr();
                Ht("progress", { tokens: _t + Dt, toolCalls: ht + bt });
              }
            }
          }));
      } catch (error) {
        let Ue = abortController.signal.aborted ? unwrapAbortReason(abortController.signal.reason) : void 0;
        if (Ue === "stalled" || Ue === "user-retry") {
          if (Ue === "stalled" && Lt !== void 0) {
            let Ot = Date.now() - now_2;
            return (
              Ht("done", {
                tokens: _t + Dt,
                toolCalls: ht + bt,
                durationMs: Nt + Ot,
                resultPreview: previewAgentValue(Lt),
              }),
              adoptSubagentPublishArmsAsync(re, In),
              {
                structured: Lt,
                text: "",
                agentMessages: sn,
                toolReportReview: ft
                  ? await judgeStructuredOutputVerdict({
                      calls: $n,
                      deliveredId: ko,
                      delivered: Lt,
                      lastOtherToolCallAt: bo,
                      context: Y,
                    })
                  : void 0,
                tokens: Dt,
                toolCalls: bt,
                stalled: !1,
                skipped: !1,
                durationMs: Ot,
                stopReason: void 0,
                outputTokens: void 0,
                structuredOutputAttempts: ln,
                lastStructuredOutputInput: wn,
              }
            );
          }
          return (
            Ht("error", {
              error:
                Ue === "stalled"
                  ? ho
                    ? "reply lost \u2014 the response stream went silent and Claude Code gave up waiting for it"
                    : `stalled \u2014 no progress for ${Re}ms`
                  : "retry requested by user",
              tokens: _t + Dt,
              toolCalls: ht + bt,
              durationMs: Nt + (Date.now() - now_2),
            }),
            {
              structured: void 0,
              text: "",
              agentMessages: sn,
              tokens: Dt,
              toolCalls: bt,
              stalled: !0,
              stalledReason: Ue,
              replyLost: Ue === "stalled" && ho,
              skipped: !1,
              durationMs: Date.now() - now_2,
              stopReason: void 0,
              outputTokens: void 0,
              structuredOutputAttempts: ln,
              lastStructuredOutputInput: wn,
            }
          );
        }
        if (Ue === "user-skip")
          return (
            Ht("error", {
              error: "skipped by user",
              skipped: !0,
              tokens: _t + Dt,
              toolCalls: ht + bt,
              durationMs: Nt + (Date.now() - now_2),
            }),
            {
              structured: void 0,
              text: "",
              agentMessages: sn,
              tokens: Dt,
              toolCalls: bt,
              stalled: !1,
              skipped: !0,
              durationMs: Date.now() - now_2,
              stopReason: void 0,
              outputTokens: void 0,
              structuredOutputAttempts: ln,
              lastStructuredOutputInput: wn,
            }
          );
        throw (
          Ht("error", {
            error: error instanceof Error ? error.message : String(error),
            tokens: _t + Dt,
            toolCalls: ht + bt,
            durationMs: Nt + (Date.now() - now_2),
          }),
          error
        );
      } finally {
        (mn?.clear(),
          uo?.removeEventListener("abort", pr),
          ze?.removeEventListener("abort", fo),
          T?.(re, null));
      }
      let Mt = hr,
        So =
          Ge?.message ??
          (Mt
            ? extractTextContent_2(
                Mt.message.content,
                `
`,
              )
            : ""),
        _o = Mt?.isApiErrorMessage === !0 && Ge === void 0,
        br = Ge?.toolUseId === void 0 ? void 0 : po.get(Ge.toolUseId),
        Ls = Boolean(br) && br === mo && !go;
      if (Bkn(re) && !_o)
        if (Ge === void 0)
          logFeatureSad(
            "workflow_handback_tool",
            po.size > 0 ? "handback_call_refused" : So === "" ? "no_final_text" : "plain_text_ending",
          );
        else logFeatureOk("workflow_handback_tool", { flagged: Ge.review?.kind === "flagged" });
      let qt;
      if (_o) qt = truncateClassifierReason(sanitizeSubagentOutput(So, { prependMarker: !1 }).sanitized);
      else if (((qt = sanitizeSubagentOutput(So).sanitized), Nn))
        qt = `${qt}

${webFetchHarnessNote(Nn)}`;
      let To = Mt?.message.usage,
        Sr = To && typeof To.output_tokens === "number" ? To.output_tokens : void 0,
        jn = Date.now() - now_2,
        $s = Mt?.isUnmetered === !0 ? void 0 : Mt?.message.usage,
        vo = Dt || getTokenCountFromUsage(finalContextTokensFromLastResponse($s) ?? EMPTY_USAGE),
        _r = _t + vo;
      if (!o7e(Mt) || Ge !== void 0) adoptSubagentPublishArmsAsync(re, In);
      if (Mt !== void 0 && _o) {
        let Z = qt || "API error",
          Ue =
            Mt.error === "rate_limit"
              ? { kind: "rate_limit", text: Z, model: fr, quotaLimits: Mt.quotaLimits }
              : { kind: "other", text: Z };
        return (
          Ht("error", { error: Z, tokens: _r, toolCalls: ht + bt, durationMs: Nt + jn }),
          {
            structured: Lt,
            text: qt,
            agentMessages: sn,
            apiError: Ue,
            tokens: vo,
            toolCalls: bt,
            stalled: !1,
            skipped: !1,
            durationMs: jn,
            stopReason: Mt.message.stop_reason,
            outputTokens: Sr,
            structuredOutputAttempts: ln,
            lastStructuredOutputInput: wn,
          }
        );
      }
      return (
        Ht("done", {
          tokens: _r,
          toolCalls: ht + bt,
          durationMs: Nt + jn,
          resultPreview: previewAgentValue(Ce ? Lt : qt),
        }),
        {
          structured: Lt,
          text: qt,
          agentMessages: sn,
          toolReportReview:
            Ge !== void 0
              ? Ge.review === null && !Ls
                ? void 0
                : Ge.review
              : ft
                ? await judgeStructuredOutputVerdict({
                    calls: $n,
                    deliveredId: ko,
                    delivered: Lt,
                    lastOtherToolCallAt: bo,
                    context: Y,
                  })
                : void 0,
          ...(Ge?.noVerdict !== void 0 && {
            toolReportUnjudged: structuredOutputUnjudgedWarning(Ge.noVerdict),
          }),
          ...(Ge !== void 0 && { toolReportAgentId: re }),
          tokens: vo,
          toolCalls: bt,
          stalled: !1,
          skipped: !1,
          durationMs: jn,
          stopReason: Mt?.message.stop_reason,
          outputTokens: Sr,
          structuredOutputAttempts: ln,
          lastStructuredOutputInput: wn,
          webFetchSavedFiles: Nn,
        }
      );
    }
    let sr = 0;
    function Pn(R, Pe, we, ge) {
      let withProject = Y.session.withProject({ cwd: oo });
      return RDn(xo(withProject).cwd, () => xs(withProject, R, Pe, we + sr, ge));
    }
    let Wn;
    async function ao(R, Pe) {
      function we(pe, re) {
        r({
          type: "progress",
          toolUseID: `workflow_agent_${U}_queued`,
          data: {
            type: "workflow_agent",
            index: U,
            label: Q,
            phaseIndex: Je,
            phaseTitle: Le,
            agentType: St?.agentType,
            isolation: Yt ? "worktree" : void 0,
            model: tt,
            queuedAt: Date.now(),
            tokens: _t + pe.tokens,
            toolCalls: ht + pe.toolCalls,
            promptPreview: rr,
            promptFramed: ie,
            lastProgressAt: Date.now(),
            ...re,
          },
        });
      }
      let ge = R;
      while (ge.apiError?.kind === "rate_limit") {
        let text = ge.apiError.text,
          joined = tn.join(ge.apiError.quotaLimits);
        if (joined.outcome === "declined") return ((Wn = joined.failureNote), ge);
        if (joined.outcome === "aborted") throw Error("Workflow aborted");
        we(ge, { state: "start" });
        let ended = await joined.ended;
        if (ended === "aborted") throw Error("Workflow aborted");
        if (ended === "revoked")
          return (
            (Wn = "usage-limit wait turned off"),
            we(ge, { state: "error", error: text, durationMs: Nt + ge.durationMs }),
            ge
          );
        if (ze?.aborted) return ge;
        ((_t += ge.tokens),
          (ht += ge.toolCalls),
          (Nt += ge.durationMs),
          (now = Date.now()),
          sr++,
          (ge = await ir(() => Pn(xn, `${Q}${w7n}`, Pe, "rate_limited"))));
      }
      return ge;
    }
    async function ir(R) {
      let enter = await Vr().enter(joined, { capMs: Hr(), signal: Y.abortController?.signal });
      if (((io = enter), enter.waitedMs > 0))
        logForDebugging(
          `workflow agent [${Q}] held ${enter.waitedMs}ms for a same-prefix sibling's first response (prompt-cache warm-up)`,
        );
      try {
        return await R();
      } finally {
        enter.done();
      }
    }
    let ar,
      It = [],
      bn = { maxContextTokens: 0, toolCalls: 0, durationMs: 0 },
      lr = 0,
      pn,
      ur = !1;
    try {
      let R = await ir(() => Pn(xn, Q, 1));
      R = await ao(R, 1);
      let Pe = (re) =>
          !re.stalled &&
          !re.skipped &&
          re.stopReason == null &&
          re.structured === void 0 &&
          (re.outputTokens ?? 1 / 0) < 50 &&
          re.durationMs > Math.min(Re * 0.5, Mi),
        we = Pe(R);
      if (we) {
        if (
          (r({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message:
                `[${Q}] throttled response (no stop_reason, ${R.outputTokens ?? "?"} output tokens in ${Math.round(R.durationMs / 1000)}s) \u2014 ` +
                "sleeping 45s before retry",
            },
          }),
          await sleep(45000, Y.abortController?.signal, { throwOnAbort: !0 }),
          (_t += R.tokens),
          (ht += R.toolCalls),
          (Nt += R.durationMs),
          (R = await ao(await Pn(xn, `${Q} (throttle-retry)`, 2, "throttled"), 2)),
          Pe(R))
        )
          r({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${Q}] throttle-retry also degraded \u2014 ` + "giving up on throttle backoff",
            },
          });
      }
      for (let re = 1; R.stalled && !we && re <= Xr; re++) {
        if ((recordStalledAgent(It, bn, R), Y.abortController?.signal.aborted))
          throw Error("Workflow aborted");
        lr++;
        let Ze = R.stalledReason ?? "stalled",
          qe =
            Ze === "user-retry"
              ? "retry requested by user"
              : R.replyLost
                ? "lost its reply (Claude Code gave up waiting on a silent response stream)"
                : "stalled (no progress)",
          Ae = "";
        if (Ze === "stalled" && R.structuredOutputAttempts > 0 && R.structured === void 0) {
          let nt = jsonStringify(R.lastStructuredOutputInput),
            yt = nt.length > 300 ? truncateToLength(nt, 300) + "\u2026" : nt;
          Ae = ` \u2014 ${R.structuredOutputAttempts} StructuredOutput validation ${plural(R.structuredOutputAttempts, "failure")} (last input: ${yt})`;
        }
        (r({
          type: "progress",
          toolUseID: "workflow_log",
          data: {
            type: "workflow_log",
            message: `[stall] agent "${Q}" ${qe} after ${Math.round(R.durationMs / 1000)}s${Ae} \u2014 retrying (${re}/${Xr})`,
          },
        }),
          (_t += R.tokens),
          (ht += R.toolCalls),
          (Nt += R.durationMs),
          (R = await ao(await Pn(xn, `${Q} (retry ${re})`, re + 1, Ze), re + 1)));
      }
      if (R.stalled) recordStalledAgent(It, bn, R);
      if (
        ((pn = R.skipped
          ? "skipped"
          : R.stalled
            ? we
              ? "stalled_after_throttle"
              : "retries_exhausted"
            : R.apiError
              ? "api_error"
              : "completed"),
        R.skipped)
      )
        return null;
      if (R.stalled) {
        let re = It.length,
          all = It.every((yt) => yt === "user-retry"),
          all_2 = It.every((yt) => yt === "stalled"),
          all_3 = It.every((yt) => yt === "reply lost"),
          nt =
            R.stalledReason !== "user-retry" && R.structuredOutputAttempts > 0 && R.structured === void 0
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
        ar = { model: R.apiError.model, limits: R.apiError.quotaLimits };
      if (R.apiError) {
        let re =
          Wn === void 0 || R.apiError.kind !== "rate_limit"
            ? `[${Q}] failed: ${R.apiError.text}`
            : `[${Q}] failed: ${Wn}: ${R.apiError.text}`;
        return (Ie(re, { log: !0 }), null);
      }
      let ge =
          Ce && R.structured !== void 0
            ? sanitizeStructuredOutput(R.structured, { reservedKeys: ["webFetchSavedFiles"] })
            : void 0,
        pe = getToolPermissionContext(Y);
      if (pe.mode === "auto" || R.toolReportReview || R.toolReportUnjudged) {
        let re = await classifyHandoffIfNeeded({
            child: Ce ? "workflow_object" : "workflow_text",
            childAgentId: void 0,
            checkpoint: !1,
            handback:
              R.toolReportReview === void 0 ? void 0 : R.toolReportReview === null ? "send" : "flagged",
            agentMessages: R.agentMessages ?? [],
            inheritedVerifiedHumanTurns: buildVerifiedHumanTurns(Y),
            tools: Vt,
            rootToolSurface: e.rootToolSurface,
            toolPermissionContext: pe,
            abortSignal: Y.abortController.signal,
            agentType: agentTypeForAnalyticsFromDefinition(ve),
            totalToolUseCount: ht + R.toolCalls,
            finalResultText: Ce ? (ge !== void 0 ? jsonStringify(ge.value) : void 0) : R.text,
            agentId: Y.agentId,
            storageV5: Y.storageV5,
            credentials: Y.credentials,
          }).catch((Ae) => {
            if (Y.abortController.signal.aborted) return R.toolReportUnjudged ?? null;
            return (
              logError(Ae),
              { warning: buildSubagentClassifierUnavailableNote(""), kind: "unavailable" }
            );
          }),
          Ze = re === null ? pe.mode !== "auto" : re.kind === "unavailable",
          qe = R.toolReportReview ?? (Ze ? (R.toolReportUnjudged ?? re) : re);
        if (qe && qe.kind !== "unavailable" && R.toolReportAgentId !== void 0) R5t(R.toolReportAgentId);
        if (qe) {
          if (Ce) {
            let Ae = `[${Q}] ${qe.warning}`;
            Ie(Ae, { log: !0 });
          } else if (
            ((R.text = `${qe.warning}

${R.text}`),
            qe.kind !== "unavailable")
          ) {
            let Ae = `[${Q}] ${qe.warning}`;
            Ie(Ae, { log: !0 });
          }
        }
      }
      if (Ce) {
        if (ge === void 0)
          throw Error(
            "agent({schema}): subagent completed without calling StructuredOutput (after in-conversation nudge)",
          );
        let re = ge.value;
        if (ge.droppedReservedKeys > 0)
          r({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${Q}] Dropped a "webFetchSavedFiles" key the agent put in its structured output \u2014 that key is reserved for the harness's own record of files ${WEBFETCH} saved, and the agent cannot supply it.`,
            },
          });
        if (ge.reportable.length > 0)
          r({
            type: "progress",
            toolUseID: "workflow_log",
            data: {
              type: "workflow_log",
              message: `[${Q}] ${flaggedOutputNotice(ge.reportable)} (Matched in the string values or key names of the agent's structured output; neutralized there in place.)`,
            },
          });
        if (R.webFetchSavedFiles) {
          let Ze = isPlainObject(re);
          if (
            (r({
              type: "progress",
              toolUseID: "workflow_log",
              data: {
                type: "workflow_log",
                message: `[${Q}] ${webFetchHarnessNote(R.webFetchSavedFiles)}${Ze ? "" : " (The agent's structured result is not an object, so this record is not attached to it as webFetchSavedFiles \u2014 this log line is its only carrier.)"}`,
              },
            }),
            Ze)
          )
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
      throw ((ur = !0), error);
    } finally {
      if ((($e = ar), Yt)) {
        let {
          worktreePath: worktreePath,
          worktreeBranch: worktreeBranch,
          headCommit: headCommit,
          gitRoot: gitRoot,
          hookBased: hookBased,
        } = Yt;
        try {
          if (!hookBased && headCommit && !(await hasWorktreeChanges(worktreePath, headCommit)))
            await removeAgentWorktree(worktreePath, worktreeBranch, gitRoot, !1, "workflow_tool");
          else if (gitRoot) await unlockAgentWorktree(worktreePath, gitRoot);
        } catch {}
      }
      if (It.length > 0)
        try {
          let R = Y.abortController?.signal,
            Pe = !ur
              ? (pn ?? "error")
              : pn === "retries_exhausted" || pn === "stalled_after_throttle"
                ? pn
                : R?.aborted
                  ? unwrapAbortReason(R.reason) === "background"
                    ? "backgrounded"
                    : "aborted"
                  : pn === "completed"
                    ? "failed_after_rerun"
                    : "error",
            we = isDiskless() ? void 0 : connectionSetupFacts();
          logEvent("tengu_workflow_agent_stall_retries", {
            workflow_run_id: h === void 0 ? void 0 : En(h),
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
  async function As(U, ee, Q, Le, Je, Re, Te, it) {
    let Ne = Y.abortController?.signal;
    if (Ne?.aborted) throw Error("Workflow aborted");
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
        queuedAt: Te,
        provenanceOn: Me,
      })
    )
      return null;
    let ze = await Zo({
      idx: U,
      promptStr: ee,
      label: Q,
      agent: Qn,
      model: Re.model,
      permissionMode: getToolPermissionContext(Y).mode,
      evalSignal: void 0,
    });
    if (ze === null) return null;
    using starting = ze.starting;
    let { prompt: prompt, model: model } = ze;
    if (
      prompt !== ee &&
      (await On({
        idx: U,
        promptStr: prompt,
        label: Q,
        ownPhaseTitle: Le,
        ownPhaseIndex: Je,
        opts: Re,
        queuedAt: Te,
        provenanceOn: Me,
      }))
    )
      return null;
    let Ce = makeSaltedName(),
      now = Date.now(),
      at = previewAgentValue(prompt),
      et,
      lt = (Xe, Ke) =>
        r({
          type: "progress",
          toolUseID: `workflow_agent_${U}_${Ce}`,
          data: {
            type: "workflow_agent",
            index: U,
            label: Q,
            phaseIndex: Je,
            phaseTitle: Le,
            agentId: Ce,
            isolation: "remote",
            remoteSessionId: et,
            state: Xe,
            startedAt: now,
            queuedAt: Te,
            promptPreview: at,
            lastProgressAt: Date.now(),
            ...Ke,
          },
        }),
      abortController = new AbortController(),
      Et = () => abortController.abort(new DOMException("workflow-abort", "AbortError"));
    if ((Ne?.addEventListener("abort", Et), Ne?.aborted))
      abortController.abort(new DOMException("workflow-abort", "AbortError"));
    (lt("start"), it(Ce));
    let ve;
    try {
      T?.(Ce, abortController);
      let Xe = getToolPermissionContext(Y),
        { proactivityLevel: proactivityLevel } = Y.getAppState(),
        cn = cycleAllTeammateModes(Xe.mode, proactivityLevel, hasLeftProactivityBaseline(Xe)),
        nn =
          model || getWorkflowSubagentModel() !== void 0 || getDefaultSubagentModel() !== "inherit"
            ? getAgentModel(void 0, Y.options.mainLoopModel, model, Xe.mode, fn(Q), {
                inWorkflowRun: h !== void 0,
              })
            : void 0,
        At = Me ? classifyWorkflowRequestSource(e.messages, e.agentId) : null,
        Bt = At?.kind === "relay" ? userRequestFraming(At) : null;
      if (prompt.includes(Sh) || (Bt?.includes(Sh) ?? !1)) gt = !0;
      let dt =
          (!Me
            ? prompt
            : At?.kind === "automated"
              ? wCo(prompt)
              : (Bt !== null
                  ? Bt +
                    `

`
                  : "") + tDr(prompt)) + Se(prompt),
        Gt = await teleportToRemote({
          initialMessage: dt,
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
      ((et = Gt.id), starting.started({ agentId: Ce, model: nn ?? getMainLoopModel() }), lt("progress"));
      let {
          text: text,
          structuredOutput: structuredOutput,
          resultSubtype: resultSubtype,
          usage: usage,
          modelUsage: modelUsage,
          toolCalls: toolCalls,
        } = await awaitRemoteSessionResult(et, abortController.signal, Y.credentials),
        sanitized = sanitizeSubagentOutput(text).sanitized;
      if (text.includes(Sh)) gt = !0;
      for (let [wt, ft] of Object.entries(modelUsage ?? {}))
        addToTotalSessionCost(
          ft.costUSD,
          {
            ...EMPTY_USAGE,
            input_tokens: ft.inputTokens,
            output_tokens: ft.outputTokens,
            output_tokens_details: { thinking_tokens: ft.thinkingTokens ?? 0 },
            cache_read_input_tokens: ft.cacheReadInputTokens,
            cache_creation_input_tokens: ft.cacheCreationInputTokens,
            cache_creation: {
              ephemeral_5m_input_tokens: ft.cacheCreationEphemeral5mInputTokens ?? 0,
              ephemeral_1h_input_tokens: ft.cacheCreationEphemeral1hInputTokens ?? 0,
            },
            server_tool_use: { web_search_requests: ft.webSearchRequests, web_fetch_requests: 0 },
          },
          wt,
        );
      if (Re.schema && structuredOutput === void 0) {
        let wt =
          resultSubtype === "error_max_structured_output_retries"
            ? "the cloud agent called StructuredOutput but no attempt produced a surviving valid output (failed schema validation, or retracted by a model fallback)"
            : resultSubtype && resultSubtype !== "success"
              ? `the cloud agent turn ended with result subtype '${resultSubtype}'`
              : "the cloud agent never called the StructuredOutput tool";
        throw Error(`agent({isolation:'remote', schema}) completed without structured output: ${wt}.`);
      }
      if (
        (lt("done", {
          tokens: usage ? getTokenCountFromUsage(usage) : 0,
          toolCalls: toolCalls,
          durationMs: Date.now() - now,
          resultPreview: previewAgentValue(Re.schema ? structuredOutput : sanitized),
        }),
        Re.schema)
      )
        return s(structuredOutput);
      if (getToolPermissionContext(Y).mode === "auto" && sanitized) {
        let wt = await classifyHandoffIfNeeded({
          child: "workflow_remote",
          childAgentId: void 0,
          checkpoint: !1,
          agentMessages: [],
          inheritedVerifiedHumanTurns: buildVerifiedHumanTurns(Y),
          tools: e.options.tools,
          rootToolSurface: e.rootToolSurface,
          toolPermissionContext: getToolPermissionContext(Y),
          abortSignal: abortController.signal,
          agentType: lit(WORKFLOW_SUBAGENT_TYPE),
          totalToolUseCount: toolCalls,
          finalResultText: sanitized,
          agentId: Y.agentId,
          storageV5: Y.storageV5,
          credentials: Y.credentials,
        }).catch((ft) => {
          if (abortController.signal.aborted) return null;
          return (logError(ft), { warning: buildSubagentClassifierUnavailableNote(""), kind: "unavailable" });
        });
        if (wt) {
          if (wt.kind !== "unavailable") {
            let ft = `[${Q}] ${wt.warning}`;
            Ie(ft, { log: !0 });
          }
          return `${wt.warning}

${sanitized}`;
        }
      }
      return sanitized;
    } catch (error) {
      if (et) archiveRemoteSession(et).catch(() => {});
      if (unwrapAbortReason(abortController.signal.reason) === "user-skip")
        return (lt("error", { error: "skipped by user", skipped: !0, durationMs: Date.now() - now }), null);
      throw (
        lt("error", {
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - now,
        }),
        error
      );
    } finally {
      (Ne?.removeEventListener("abort", Et), T?.(Ce, null));
    }
  }
  let Cs = Qt(async (U) => {
      if (Y.abortController?.signal.aborted) return new Promise(() => {});
      let ee = Ee("parallel");
      if ((await sleep(0), !Array.isArray(U))) throw TypeError("parallel() expects an array of functions");
      let Q = snapshotArrayAcrossVm(w(U));
      if (Q.length === 0) return s([]);
      (Kt(), yn());
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
      let Je = 0,
        mapped = settled.map((Te, it) => {
          if (Te.status === "fulfilled") return Te.value.v;
          let { name: Ne, msg: msg } = describeThrownValue(Te.reason);
          if (Ne === "WorkflowBudgetExceededError") return (Je++, null);
          let ze = `parallel[${it}] failed: ${msg}`;
          return (Ie(ze, { log: !0 }), null);
        });
      if (Je > 0) ye.push(`parallel: ${Je} ${plural(Je, "slot")} dropped \u2014 token budget exceeded`);
      return s(mapped);
    }),
    Rs = Qt(async (U, ...ee) => {
      if (Y.abortController?.signal.aborted) return new Promise(() => {});
      let Q = Ee("pipeline");
      if ((await sleep(0), !Array.isArray(U)))
        throw TypeError("pipeline() expects an array as the first argument");
      let Le = snapshotArrayAcrossVm(w(U)),
        Je = snapshotArrayAcrossVm(ee);
      if (Le.length === 0) return s([]);
      (Kt(), yn());
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
      let Te = 0,
        mapped = settled.map((Ne, Me) => {
          if (Ne.status === "fulfilled") return Ne.value.v;
          let { name: ze, msg: msg } = describeThrownValue(Ne.reason);
          if (ze === "WorkflowBudgetExceededError") return (Te++, null);
          let ie = `pipeline[${Me}] failed: ${msg}`;
          return (Ie(ie, { log: !0 }), null);
        });
      if (Te > 0) ye.push(`pipeline: ${Te} ${plural(Te, "slot")} dropped \u2014 token budget exceeded`);
      return s(mapped);
    }),
    Ms = Qt((U) => {
      r({
        type: "progress",
        toolUseID: "workflow_log",
        data: { type: "workflow_log", message: describeLogArg(U) },
      });
    });
  return {
    agent: Ts,
    parallel: Cs,
    pipeline: Rs,
    log: Ms,
    phase: bs,
    resolvePhase: Mn,
    reservePhase: ys,
    recordFailure: (U) => Ie(U, { log: !1 }),
    getAgentCount: () => G,
    getFailures: () => ye,
    getForeignArtifactContent: () => gt,
    getToolsUsed: () => (isSillyShoreGateOn() ? uniq([...[...Ut.keys()].flatMap(kt), ...$t]) : []),
    takeUsageLimitDenial: () => {
      let U = $e;
      return (($e = void 0), U);
    },
    bindVMAwait: (U) => {
      ((ce = U.settle), (E = U.call), (s = U.clone), (S = U.sanitize), (w = U.snapshot), (P = U.getProp));
    },
    sanitizeVMValue: (U) => S(U),
    getVMProp: (U, ee) => P(U, ee),
    withLanesInert: (U) => se.run(freeze, U),
  };
}

export { createWorkflowAgentRuntime, En };
