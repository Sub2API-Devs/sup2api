/**
 * tools/WorkflowTool/WorkflowTool.ts
 *
 * 2.1.316 新增：Workflow 工具（运行确定性 JS 脚本编排子代理）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y1shfdfm.js (16)
 * attribution: placement 16
 */
import { resolve, basename } from "path";
import { randomUUID } from "crypto";
import { openWorldJournal, worldStateOf } from "./world/worldJournal.js";
import {
  collectRunStatuses,
  RunIndex,
  describeWorldOp,
  worldOpVerbs,
  resolveWorkflowRun,
} from "./world/runRegistry.js";
import { isWorkflowAuthoringSkillVisible } from "../../skills/skillVisibility.js";
import { WORKFLOW_AUTHORING } from "../../skills/bundled/bundledSkillNames.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, unknown, u, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MAX_SCRIPT_FILE_BYTES,
  loadWorkflowScriptFile,
  scriptPathRefusal,
  resolveWorkflowScriptPath,
} from "../../services/workflow/scriptFile.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { stripFormatChars, truncateToLength, countCharInString } from "../../utils/stringUtils.js";
import { WORKFLOW_RUN_ID_PATTERN, WORKFLOW_TOOL_NAME } from "./constants.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { getCwd } from "../../utils/cwd.js";
import { getBundledWorkflows } from "../../services/workflows/bundledWorkflows.js";
import {
  findWorkflowByName,
  allWorkflowsForHost,
  workflowNameOnlyEnv,
  CLAUDE_WORKFLOW_NAME_ONLY,
} from "../../services/workflow/loadWorkflows.js";
import {
  readWorkflowJournal,
  hiddenScriptSha,
  HIDDEN_SCRIPT_RESUME_REFUSAL,
} from "../../services/workflow/journalEntries.js";
import {
  loadResumeJournal,
  WorkflowResumeState,
  probeWorkflowResume,
  restoredScriptFor,
  ensureResumeRestored,
  mirrorWorkflowScript,
} from "../../services/workflow/resume.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  isWorkflowsAvailable,
  isProSubscriber,
  isWorkflowToolEnabled,
  getWorkflowsUnavailableReason,
} from "../../utils/workflows/workflowGates.js";
import { workflowToolDescription } from "./prompt.js";
import { leanRewriteOf } from "../../utils/model/promptBundles.js";
import { workflowSizePromptLine } from "../../utils/workflowSizeGuideline.js";
import { getGlobalConfig } from "../../utils/config.js";
import { parseWorkflowArgs } from "./world/worldStore.js";
import { isServerFallbackDiscard } from "../../utils/abortController.js";
import {
  NOT_ON_BUN_MESSAGE,
  usesNondeterministicTime,
  compileWorkflowScript,
} from "../../services/workflow/scriptSandbox.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { getContentRulesMapForToolName } from "../../utils/permissions/permissions.js";
import { READ_ONLY_AUTO_ALLOW_REASON } from "../../types/permissions.js";
import { isAgentStopPending } from "../../utils/agentProcessRegistry.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { generateTaskId } from "../../Task.js";
import { subagentWorkflowDir } from "../../services/workflow/snapshots.js";
import {
  agentNameForTelemetry,
  agentLabelForTelemetry,
  isBuiltInWithFlag,
  launchWorkflowRun,
} from "../../services/workflow/launch.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { workerOnlySkillName } from "../../commands.js";
import { promptIdForRequest } from "../../services/api/claude.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { formatOverflowHint } from "../../utils/format.js";
import { isTaskLoopSettled } from "../../tasks/taskLoopRegistry.js";

//@ chunk-y1shfdfm.js:55713-55744 placement
/**
 * 工作流标题/描述的最大显示宽度（80）。
 */
var MAX_WORKFLOW_TITLE_CHARS = 80;
var STREAM_INPUT_EXEMPT_KEYS = new Set(["args"]);
//@ chunk-y1shfdfm.js:55744-55835 placement
/**
 * 打开工作流 world 日志并收集运行状态。
 */
async function reopenWorldJournal(e) {
  await openWorldJournal(e.session, e.storageV5);
  collectRunStatuses(worldStateOf(e.session), e.toolState.get(RunIndex));
}
//@ chunk-y1shfdfm.js:55835-55856 placement
/**
 * 工作流脚本扩展（当前未提供，恒 undefined）。
 */
function workflowScriptExtension() {
  return;
}
//@ chunk-y1shfdfm.js:55856-56048 placement
function authoringSkillHint(e, tools) {
  return e.name === undefined &&
    (e.script !== undefined || e.scriptPath !== undefined) &&
    isWorkflowAuthoringSkillVisible(tools)
    ? `
Load the \`${WORKFLOW_AUTHORING}\` skill for the script reference if you have not, fix the script, and retry.`
    : "";
}
//@ chunk-y1shfdfm.js:56048-56071 placement
/**
 * 返回空串的提示后缀。
 */
function emptyPromptSuffix() {
  return "";
}
//@ chunk-y1shfdfm.js:56071-59571 placement
/**
 * Workflow 工具的输入 schema（script/args 等）。
 */
var HIDDEN_CONTROL_CHARS_REASON =
  "script contains control characters that would be hidden in the approval dialog";
var workflowInputSchema = DoctorLazy(() =>
  zodStrictObject({
    script: string()
      .max(MAX_SCRIPT_FILE_BYTES)
      .refine(isAllPrintable, HIDDEN_CONTROL_CHARS_REASON)
      .optional()
      .describe(
        "Self-contained workflow script. Must begin with `export const meta = { name, description, phases }` (pure literal, no computed values) followed by the script body using agent()/parallel()/pipeline()/phase()." +
          (workflowScriptExtension()?.SCRIPT_DESCRIPTION_V2 ?? ""),
      ),
    name: string()
      .refine((e) => stripFormatChars(e) === e, "contains control or invisible format characters")
      .optional()
      .describe(
        "Name of a predefined workflow (built-in or from .claude/workflows/). Resolves to a self-contained script.",
      ),
    description: string()
      .optional()
      .describe("Ignored \u2014 set the workflow description in the script's `meta` block."),
    title: string()
      .optional()
      .describe("Ignored \u2014 set the workflow title in the script's `meta` block."),
    args: unknown()
      .optional()
      .describe(
        "Optional input value exposed to the script as the global `args`, verbatim. Pass arrays/objects as actual JSON values, NOT as a " +
          "JSON-encoded string \u2014 a stringified list breaks `args.filter`/" +
          "`args.map` in the script. Use for parameterized named workflows (e.g. a research question).",
      ),
    scriptPath: string()
      .refine((e) => stripFormatChars(e) === e, "contains control or invisible format characters")
      .optional()
      .describe(
        "Path to a workflow script file on disk. Every Workflow invocation persists its script under the session directory and returns the path in the tool result. To iterate, edit that file with Write/Edit and re-invoke Workflow with the same `scriptPath` instead of re-sending the full script. Takes precedence over `script` and `name`.",
      ),
    resumeFromRunId: string()
      .regex(WORKFLOW_RUN_ID_PATTERN)
      .optional()
      .describe(
        `Run ID of a prior Workflow invocation to resume from. Completed agent() calls with unchanged (prompt, opts) return their cached results instantly; only edited or new calls re-run. Same-session only. Stop the prior run first (${TASKSTOP}) before resuming.`,
      ),
    ...(workflowScriptExtension()?.runOpFields() ?? {}),
    ...false,
  }).refine((e) => e.script || e.name || e.scriptPath || e.runId, {
    message: "Must provide script, name, scriptPath, or runId",
  }),
);
var workflowOutputSchema = DoctorLazy(() =>
  u({
    status: _enum([
      "async_launched",
      "remote_launched",
      ...(workflowScriptExtension() ? [workflowScriptExtension().RUN_OP_STATUS] : []),
    ]),
    taskId: string(),
    taskType: _enum(["local_workflow", "remote_agent"])
      .optional()
      .describe(
        "TaskType of the registered background task \u2014 'local_workflow' for in-process runs, 'remote_agent' when remote:true dispatches to CCR. Set on all new writes; absent only on transcripts written before this field existed.",
      ),
    workflowName: string()
      .optional()
      .describe(
        "meta.name from the workflow script \u2014 same value as task_started.workflow_name. Set on all new writes; absent only on transcripts written before this field existed.",
      ),
    runId: string()
      .optional()
      .describe(
        "Local workflow run identifier for resumeFromRunId. Absent for remote_launched (the CCR session URL is the resume handle there) and on transcripts written before this field existed.",
      ),
    summary: string().optional(),
    transcriptDir: string()
      .optional()
      .describe("Directory where subagent transcripts are written during execution"),
    scriptPath: string()
      .optional()
      .describe(
        "Path to the persisted workflow script for this invocation. Editable via Write/Edit; pass back as `scriptPath` to re-run without resending the script.",
      ),
    sessionUrl: string().optional().describe("CCR session URL when status is remote_launched"),
    warning: string()
      .optional()
      .describe(
        "Non-blocking heads-up (e.g. local git state diverges from the pushed branch the cloud session will clone)",
      ),
    error: string().optional().describe("Set if syntax check failed"),
    ...(workflowScriptExtension()?.runOpOutputFields() ?? {}),
  }),
);
//@ chunk-y1shfdfm.js:59571-59650 placement
class WorkflowInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkflowInputError";
  }
}
//@ chunk-y1shfdfm.js:59650-60381 placement
async function loadWorkflowScript(e, permissionContext, storageV5) {
  if (e.scriptPath) {
    let s;
    let i;
    if (e.script) {
      s = e.script;
      i = resolve(getCwd(), e.scriptPath);
    } else {
      let workflowScriptFile = await loadWorkflowScriptFile(e.scriptPath, permissionContext);
      if ("error" in workflowScriptFile) return workflowScriptFile;
      s = workflowScriptFile.script;
      i = workflowScriptFile.path;
    }
    if (getBundledWorkflows().some((w) => w.script === s || w.v2Script === s))
      return {
        script: s,
        resolvedScriptPath: i,
        source: "built-in",
        scriptMatchesDefinition: true,
      };
    return {
      script: s,
      resolvedScriptPath: i,
    };
  }
  if (e.name) {
    let workflowByName = await findWorkflowByName(e.name, getCwd(), storageV5);
    if (!workflowByName) {
      let joined = (await allWorkflowsForHost(getCwd(), storageV5)).map((w) => w.name).join(", ");
      return {
        error: `Workflow "${e.name}" not found. Available: ${joined || "(none)"}`,
      };
    }
    return {
      script: e.script ?? workflowByName.script,
      source: workflowByName.source,
      scriptMatchesDefinition: e.script === undefined || e.script === workflowByName.script,
    };
  }
  if (e.script)
    return {
      script: e.script,
    };
  return {
    error: "Must provide script, name, or scriptPath",
  };
}
//@ chunk-y1shfdfm.js:60381-60500 placement
var RETRACTED_DISPATCH_RESULT = {
  result: false,
  message: "Tool dispatch was retracted by a server fallback; the input may be truncated.",
  errorCode: 7,
};
//@ chunk-y1shfdfm.js:60500-60642 placement
function hiddenScriptResumeNote(resumeFromRunId) {
  return `Run ${resumeFromRunId} hides its script, so its script is not shown here; the resume runs only the script the run was launched with.`;
}
//@ chunk-y1shfdfm.js:60642-60757 placement
function readRunJournal(resumeFromRunId, scriptPath, n) {
  return readWorkflowJournal(resumeFromRunId, n.toolState, n.taskRegistry, () =>
    loadResumeJournal(
      resumeFromRunId,
      scriptPath,
      n.storageV5,
      n.signal,
      n.toolState.get(WorkflowResumeState),
    ),
  );
}
//@ chunk-y1shfdfm.js:60757-61257 placement
function workflowRunContext(e, r) {
  return {
    get session() {
      return e.session;
    },
    get storageV5() {
      return e.storageV5;
    },
    get credentials() {
      return e.credentials;
    },
    get agentId() {
      return e.agentId;
    },
    get agentContext() {
      return e.agentContext;
    },
    get taskRegistry() {
      return e.taskRegistry;
    },
    get toolState() {
      return e.toolState;
    },
    get tools() {
      return e.tools;
    },
    get messages() {
      return e.messages;
    },
    get permissions() {
      return e.permissions;
    },
    get toolUseId() {
      return r.toolUseId;
    },
    get signal() {
      return r.signal;
    },
    get abortController() {
      return {
        signal: r.signal,
      };
    },
  };
}
//@ chunk-y1shfdfm.js:61257-61378 placement
function requireRunEngine(e) {
  if (!e.runEngine) throw Error("Workflow: launching needs the executor (call.runEngine)");
  return e.runEngine;
}
//@ chunk-y1shfdfm.js:61378-72084 placement
/**
 * Workflow 工具：运行确定性 JavaScript 脚本编排子代理（RunWorkflow 别名）。
 */
var WorkflowTool = buildTool({
  name: WORKFLOW_TOOL_NAME,
  aliases: ["RunWorkflow"],
  searchHint: "orchestrate subagents with deterministic JavaScript workflow",
  enablesCodeExecution: true,
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  isEnabled: () => isWorkflowsAvailable(),
  async prompt(e) {
    return (
      workflowToolDescription(
        isWorkflowAuthoringSkillVisible(e?.tools),
        leanRewriteOf({
          model: e?.model,
          leanRewrite: e?.leanRewrite,
        }),
      ) +
      workflowSizePromptLine(getGlobalConfig().workflowSizeGuideline, isProSubscriber()) +
      emptyPromptSuffix()
    );
  },
  async description(e, r) {
    return (
      workflowToolDescription(isWorkflowAuthoringSkillVisible(r?.tools)) +
      workflowSizePromptLine(getGlobalConfig().workflowSizeGuideline, isProSubscriber()) +
      emptyPromptSuffix()
    );
  },
  get inputSchema() {
    return workflowInputSchema();
  },
  get outputSchema() {
    return workflowOutputSchema();
  },
  coerceInput: (e) =>
    parseWorkflowArgs(e, {
      apply: isWorkflowToolEnabled(),
    }),
  streamedInputRepairExemptKeys: () => (isWorkflowToolEnabled() ? undefined : STREAM_INPUT_EXEMPT_KEYS),
  toAutoClassifierInput(e) {
    let r = workflowScriptExtension();
    if (r && typeof e.runId === "string") return r.runOpClassifierInput(e);
    if (e.script && e.scriptPath)
      return `${e.script}

scriptPath: ${e.scriptPath}`;
    if (e.script && e.name)
      return `${e.script}

name: ${e.name}`;
    return e.script || e.scriptPath || e.name || "";
  },
  userFacingName() {
    return "Workflow";
  },
  getToolUseSummary(e) {
    let r = e ? describeWorldOp(e) : undefined;
    if (r && workflowScriptExtension()) return `workflow ${r.runId} \xB7 ${worldOpVerbs(r) ?? "?"}`;
    if (e?.scriptPath) {
      let n = basename(stripFormatChars(e.scriptPath));
      return e.script ? `${n} \xB7 ${workflowScriptSummary(e.script)}` : n;
    }
    if (e?.name)
      return e.script
        ? `dynamic workflow: ${stripFormatChars(e.name)} \xB7 ${workflowScriptSummary(e.script)}`
        : `dynamic workflow: ${stripFormatChars(e.name)}`;
    if (!e?.script) return null;
    return workflowScriptSummary(e.script);
  },
  create(e) {
    return {
      async validateInput(r, n) {
        let s = workflowRunContext(e, n);
        if (isServerFallbackDiscard(s.signal)) return RETRACTED_DISPATCH_RESULT;
        let workflowsUnavailableReason = getWorkflowsUnavailableReason();
        if (workflowsUnavailableReason !== undefined) {
          let remedy = {
            kind: "feature_disabled",
            feature: "workflows",
            cause: workflowsUnavailableReason,
          };
          if (workflowsUnavailableReason === "unsupported_runtime")
            return {
              result: false,
              message: NOT_ON_BUN_MESSAGE,
              errorCode: 17,
              remedy,
            };
          return workflowsUnavailableReason === "managed_settings"
            ? {
                result: false,
                message: "Dynamic workflows are disabled by managed settings (`disableWorkflows`).",
                errorCode: 5,
                remedy,
              }
            : {
                result: false,
                message:
                  'Dynamic workflows are not enabled for this session (org policy, launch gate, or the "Dynamic workflows" setting in /config).',
                errorCode: 6,
                remedy,
              };
        }
        if (typeof r.runId === "string") {
          let y = workflowScriptExtension();
          if (!y)
            return {
              result: false,
              message: "runId is not a field of this tool here.",
              errorCode: 9,
            };
          await reopenWorldJournal(s);
          let R = await y.validateRunOp(r, s);
          if (R) return R;
        }
        if (workflowNameOnlyEnv()) {
          let filtered = [
            r.script && "script",
            r.scriptPath && "scriptPath",
            r.resumeFromRunId && "resumeFromRunId",
            r.remote && "remote",
          ].filter((R) => Boolean(R));
          if (filtered.length > 0)
            return {
              result: false,
              message: `This session restricts the Workflow tool to named workflows (${CLAUDE_WORKFLOW_NAME_ONLY} is set). Not allowed here: ${filtered.join(", ")}. Invoke as {name, args} only.`,
              errorCode: 8,
            };
        }
        if (r.scriptPath) {
          let y = scriptPathRefusal(r.scriptPath, s);
          if (y !== null)
            return {
              result: false,
              message: y,
              errorCode: 15,
            };
        }
        let w;
        if (r.resumeFromRunId) {
          let workflowTaskByRun = findWorkflowTaskByRun(r.resumeFromRunId, s);
          if (workflowTaskByRun)
            return {
              result: false,
              message: workflowTaskByRun,
              errorCode: 3,
            };
          let R = await probeWorkflowResume(
            r.resumeFromRunId,
            r.scriptPath,
            s.storageV5,
            s.signal,
            s.toolState.get(WorkflowResumeState),
          );
          if (isServerFallbackDiscard(s.signal)) return RETRACTED_DISPATCH_RESULT;
          if (R.kind === "refused")
            return {
              result: false,
              message: R.message,
              errorCode: 16,
            };
          if (r.scriptPath) w = restoredScriptFor(R, r.scriptPath);
        }
        let workflowScript = await loadWorkflowScript(r, s, s.storageV5);
        if ("error" in workflowScript && w !== undefined)
          workflowScript = await loadWorkflowScript(
            {
              ...r,
              script: w,
            },
            s,
            s.storageV5,
          );
        if (isServerFallbackDiscard(s.signal)) return RETRACTED_DISPATCH_RESULT;
        if ("error" in workflowScript) {
          if (r.name && !r.scriptPath) logFeatureBad("workflow_resolve", "not_found");
          return {
            result: false,
            message: workflowScript.error,
            errorCode: 1,
          };
        }
        if (r.name && !r.scriptPath) logFeatureOk("workflow_resolve");
        if (!isAllPrintable(workflowScript.script))
          return {
            result: false,
            message: `${r.scriptPath ? `Workflow script file ${r.scriptPath}` : `The file of workflow "${r.name}"`} contains a control character that an approval prompt cannot show, such as an escape byte or a carriage return that is not part of a CRLF line ending. Remove it from the file and try again.`,
            errorCode: 17,
          };
        let workflowScript_2 = parseWorkflowScript(workflowScript.script);
        if ("error" in workflowScript_2)
          return {
            result: false,
            message: `Invalid workflow script: ${workflowScript_2.error}${authoringSkillHint(r, s.tools)}`,
            errorCode: 2,
          };
        if (r.script && usesNondeterministicTime(workflowScript_2.scriptBody))
          return {
            result: false,
            message: `Workflow scripts must be deterministic: Date.now()/Math.random()/new Date() are unavailable (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.${authoringSkillHint(r, s.tools)}`,
            errorCode: 4,
          };
        return {
          result: true,
        };
      },
      async checkPermissions(r, n) {
        let permissionContext = workflowRunContext(e, n);
        let i = permissionContext.permissions();
        let w = describeWorldOp(r) !== undefined;
        let h = r.scriptPath || w ? undefined : r.name;
        let k = (L) => (h ? getContentRulesMapForToolName(i, WORKFLOW_TOOL_NAME, L).get(h) : undefined);
        let y = k("deny");
        if (y)
          return {
            behavior: "deny",
            message: `Workflow ${h} blocked by permission rules`,
            decisionReason: {
              type: "rule",
              rule: y,
            },
          };
        let R = w ? describeWorldOp(r) : undefined;
        if (R && worldOpVerbs(R) === "read")
          return {
            behavior: "allow",
            updatedInput: r,
            decisionReason: {
              type: "other",
              reason: READ_ONLY_AUTO_ALLOW_REASON,
            },
          };
        let I = r;
        let x;
        if (w);
        else if (r.scriptPath) {
          let workflowScriptFile = await loadWorkflowScriptFile(r.scriptPath, permissionContext);
          let H =
            "error" in workflowScriptFile &&
            r.resumeFromRunId &&
            scriptPathRefusal(r.scriptPath, permissionContext) === null
              ? restoredScriptFor(
                  await probeWorkflowResume(
                    r.resumeFromRunId,
                    r.scriptPath,
                    permissionContext.storageV5,
                    permissionContext.signal,
                    permissionContext.toolState.get(WorkflowResumeState),
                  ),
                  r.scriptPath,
                )
              : undefined;
          let Z =
            r.resumeFromRunId == null
              ? undefined
              : await readRunJournal(r.resumeFromRunId, r.scriptPath, permissionContext);
          if (Z?.kind === "refused")
            return {
              behavior: "deny",
              message: Z.reason,
              decisionReason: {
                type: "other",
                reason: "workflow resume refused",
              },
            };
          if (
            Z?.kind === "hidden" &&
            r.resumeFromRunId != null &&
            (H !== undefined || !("error" in workflowScriptFile))
          ) {
            I = {
              ...r,
              script: undefined,
            };
            x = hiddenScriptResumeNote(r.resumeFromRunId);
          } else if (H !== undefined)
            I = {
              ...r,
              script: H,
            };
          else if ("error" in workflowScriptFile)
            return {
              behavior: "deny",
              message: workflowScriptFile.error,
              decisionReason: {
                type: "other",
                reason: "workflow scriptPath outside the readable set",
              },
            };
          else
            I = {
              ...r,
              script: workflowScriptFile.script,
            };
        } else if (r.name) {
          let workflowByName = await findWorkflowByName(r.name, getCwd(), permissionContext.storageV5);
          I = {
            ...r,
            script: workflowByName?.script,
          };
        }
        let V =
          (w && workflowScriptExtension()?.RUN_OP_CONSENT_MESSAGE) ||
          "Review dynamic workflow before running";
        let message = x === undefined ? V : `${V}. ${x}`;
        let P = k("ask");
        if (P)
          return {
            behavior: "ask",
            message,
            updatedInput: I,
            decisionReason: {
              type: "rule",
              rule: P,
            },
            ...(x !== undefined && {
              suppressAlwaysAllowRule: true,
            }),
          };
        let B = k("allow");
        if (B)
          return {
            behavior: "allow",
            updatedInput: I,
            decisionReason: {
              type: "rule",
              rule: B,
            },
          };
        return {
          behavior: "ask",
          message,
          updatedInput: I,
          ...(x !== undefined && {
            decisionReason: {
              type: "other",
              reason: x,
            },
            suppressAlwaysAllowRule: true,
          }),
          ...(h && {
            suggestions: [
              {
                type: "addRules",
                rules: [
                  {
                    toolName: WORKFLOW_TOOL_NAME,
                    ruleContent: h,
                  },
                ],
                behavior: "allow",
                destination: "localSettings",
              },
            ],
          }),
        };
      },
      async call(r, n) {
        let s = workflowRunContext(e, n);
        let { parentMessage } = n;
        if (s.agentId !== undefined && isAgentStopPending(s.agentId)) {
          logFeatureBad("subagent_launch", "workflow_spawner_stop_pending");
          throw new WorkflowInputError(
            "This agent has been stopped and its stop is still completing; it cannot launch workflows or act on existing runs.",
          );
        }
        if (typeof r.runId === "string") {
          let j = workflowScriptExtension();
          if (!j) throw new WorkflowInputError("runId is not a field of this tool here.");
          await reopenWorldJournal(s);
          let q = await j.callRunOp(r, s);
          if (q)
            return {
              data: {
                status: j.RUN_OP_STATUS,
                taskId: "",
                runId: q.runId,
                runOp: q.runOp,
              },
            };
        }
        if (r.resumeFromRunId) {
          let workflowTaskByRun = findWorkflowTaskByRun(r.resumeFromRunId, s);
          if (workflowTaskByRun) throw new WorkflowInputError(workflowTaskByRun);
          let runJournal = await readRunJournal(r.resumeFromRunId, r.scriptPath, s);
          if (runJournal.kind === "refused") throw new WorkflowInputError(runJournal.reason);
          let resumeRestored = await ensureResumeRestored(
            r.resumeFromRunId,
            r.scriptPath,
            s.storageV5,
            s.signal,
            s.toolState.get(WorkflowResumeState),
          );
          if (resumeRestored !== null) throw new WorkflowInputError(resumeRestored);
        }
        let workflowScript = await loadWorkflowScript(r, s, s.storageV5);
        if ("error" in workflowScript) throw new WorkflowInputError(workflowScript.error);
        let { script, source, resolvedScriptPath } = workflowScript;
        let R = (script) => {
          let q =
            r.resumeFromRunId == null
              ? undefined
              : hiddenScriptSha(r.resumeFromRunId, s.toolState, s.taskRegistry);
          if (q === "") throw new WorkflowInputError(HIDDEN_SCRIPT_RESUME_REFUSAL);
          if (q !== undefined && q !== computeContentHash(script))
            throw new WorkflowInputError(
              "This workflow run hides its script, so it can only be resumed with its original script file, unedited. To run a changed script, start a new run without resumeFromRunId.",
            );
          return q;
        };
        R(script);
        let I = source === "built-in" && workflowScript.scriptMatchesDefinition === true;
        let workflowScript_2 = parseWorkflowScript(script);
        if ("error" in workflowScript_2)
          throw new WorkflowInputError(`Invalid workflow script: ${workflowScript_2.error}`);
        let V = r.resumeFromRunId ?? `wf_${randomUUID().slice(0, 12)}`;
        let taskId = generateTaskId("local_workflow");
        let summary = workflowScript_2.meta.description;
        let B = workflowScript_2.meta.name;
        let L = compileWorkflowScript(workflowScript_2.scriptBody);
        if (!L.ok) {
          logFeatureBad("task_local_workflow", "compile_failed");
          return {
            data: {
              status: "async_launched",
              taskId,
              taskType: "local_workflow",
              workflowName: B,
              runId: V,
              summary,
              error: `${L.error}${authoringSkillHint(r, s.tools)}`,
            },
          };
        }
        let transcriptDir = subagentWorkflowDir(V);
        let Z = resolvedScriptPath ?? resolveWorkflowScriptPath(B, V, script, s.storageV5);
        mirrorWorkflowScript(V, Z, script, s.toolState.get(WorkflowResumeState));
        let re = r.scriptPath ? undefined : source;
        let me = r.scriptPath ? "scriptPath" : (source ?? "inline");
        let he = agentNameForTelemetry(B, re, I);
        let ae = agentLabelForTelemetry(workflowScript_2.meta.description, re, I);
        logEvent("tengu_workflow_launched", {
          invocation_mode: lit(r.scriptPath ? "scriptPath" : r.name ? "named" : "inline"),
          workflow_source: fromEnum(me),
          workflow_name: he,
          workflow_description: ae,
          phase_count: workflowScript_2.meta.phases?.length ?? 0,
          launched_from_subagent: s.agentId != null,
          has_args: r.args != null,
          is_resume: r.resumeFromRunId != null,
          script_size_chars: script.length,
        });
        if (r.resumeFromRunId == null)
          resolveWorkflowRun({
            toolState: s.toolState,
            taskRegistry: s.taskRegistry,
            name: isBuiltInWithFlag(re, I) ? workerOnlySkillName(B) : undefined,
            runId: V,
          });
        let ee = {
          workflowRunId: V,
          script,
          scriptPath: Z,
          args: r.args,
          meta: workflowScript_2.meta,
          vmScript: L.vmScript,
          toolUseId: s.toolUseId,
          transcriptDir,
          telemetry: {
            source: me,
            name: he,
            description: ae,
            scriptIsVerbatimBuiltIn: I,
          },
          invokingRequestId: parentMessage?.requestId,
          parentPromptId: promptIdForRequest(s.messages(), s.agentContext),
        };
        let ke = requireRunEngine(n);
        let O = (j) => ke(launchWorkflowRun, j);
        if (r.resumeFromRunId) {
          let workflowTaskByRun = findWorkflowTaskByRun(r.resumeFromRunId, s);
          if (workflowTaskByRun) {
            logFeatureBad("task_local_workflow", "resume_collision");
            throw new WorkflowInputError(workflowTaskByRun);
          }
        }
        let le = R(script) !== undefined;
        O({
          ...ee,
          taskId,
          isResume: r.resumeFromRunId != null,
          ...(le && {
            withholdScriptFromSdkEvents: true,
          }),
        });
        return {
          data: {
            status: "async_launched",
            taskId,
            taskType: "local_workflow",
            workflowName: B,
            runId: V,
            summary,
            transcriptDir,
            scriptPath: Z,
          },
        };
      },
    };
  },
  renderToolUseMessage(e, { verbose }) {
    let n = describeWorldOp(e);
    let s = workflowScriptExtension();
    if (n && s) return s.renderRunOp(n, verbose);
    if (e.scriptPath) {
      let i = stripFormatChars(e.scriptPath);
      let w = verbose ? i : basename(i);
      if (!e.script) return w;
      return verbose
        ? `${i}
${e.script}`
        : `${w} \xB7 ${workflowScriptSummary(e.script)}`;
    }
    if (e.name) {
      let i = stripFormatChars(e.name);
      if (!e.script) return `dynamic workflow: ${i}`;
      return verbose
        ? `dynamic workflow: ${i}
${e.script}`
        : `dynamic workflow: ${i} \xB7 ${workflowScriptSummary(e.script)}`;
    }
    if (!e.script) return null;
    return verbose ? e.script : workflowScriptSummary(e.script);
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    if (e.error)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `Workflow script has a syntax error and was not launched:
${e.error}`,
        is_error: true,
      };
    let n = workflowScriptExtension()?.runOpToolResultText(e.runId, e.runOp);
    if (n)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: n.content,
        is_error: n.isError,
      };
    if (e.status === "remote_launched")
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content:
          `Workflow launched in a remote CCR session. Task ID: ${e.taskId}
Session: ${e.sessionUrl}
` +
          (e.summary
            ? `Summary: ${e.summary}
`
            : "") +
          (e.warning
            ? `Warning: ${e.warning}
`
            : "") +
          `
The workflow runs against a fresh clone of the pushed branch; phase progress is visible at the session URL, not in /workflows. You will be notified when it completes.`,
        is_error: false,
      };
    let s = e.summary
      ? `
Summary: ${e.summary}`
      : "";
    let i = e.transcriptDir
      ? `
Transcript dir: ${e.transcriptDir}`
      : "";
    let w = e.scriptPath
      ? `
Script file: ${e.scriptPath}
(Edit this file with Write/Edit and re-invoke Workflow with {scriptPath: "${e.scriptPath}"} to iterate without resending the script.)`
      : "";
    let h =
      e.runId && e.scriptPath
        ? `
Run ID: ${e.runId}
To resume after editing the script: Workflow({scriptPath: "${e.scriptPath}", resumeFromRunId: "${e.runId}"}) \u2014 completed agents return cached results (cached results may themselves be empty \u2014 inspect journal.jsonl before assuming there is something to recover).`
        : "";
    let k = (e.runId, "");
    let content = `Workflow launched in background. Task ID: ${e.taskId}${s}${i}${w}${h}${k}

You will be notified when it completes. Use /workflows to watch live progress.`;
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content,
      is_error: false,
    };
  },
});
//@ chunk-y1shfdfm.js:72084-72309 placement
function workflowScriptSummary(script) {
  let workflowScript = parseWorkflowScript(script);
  if (!("error" in workflowScript)) return stripFormatChars(workflowScript.meta.description);
  let n =
    script
      .split(
        `
`,
      )
      .find((line) => line.trim()) ?? truncateToLength(script, 40);
  let s =
    bunStringWidth(n) > MAX_WORKFLOW_TITLE_CHARS || n.length > MAX_WORKFLOW_TITLE_CHARS
      ? truncateToLength(n, MAX_WORKFLOW_TITLE_CHARS - 1) + "\u2026"
      : n;
  let i =
    countCharInString(
      script,
      `
`,
    ) + 1;
  let w = formatOverflowHint(i - 1);
  let h = stripFormatChars(s);
  return w ? `${h} ${w}` : h;
}
//@ chunk-y1shfdfm.js:72309-73217 placement
function findWorkflowTaskByRun(resumeFromRunId, r) {
  for (let [key, value] of Object.entries(r.taskRegistry?.all() ?? {})) {
    if (value.type !== "local_workflow" || value.workflowRunId !== resumeFromRunId) continue;
    if (value.status === "running")
      return `Workflow ${resumeFromRunId} is still running (task ${key}). Stop it first with ${TASKSTOP}({taskId: "${key}"}) before resuming.`;
    if (!isTaskLoopSettled(key))
      return value.status === "paused"
        ? `Workflow ${resumeFromRunId} is paused but its run has not exited yet (task ${key}); its agents are being stopped. Resuming now would run two copies of its agents against the same journal \u2014 wait for it to exit.`
        : `Workflow ${resumeFromRunId} is not running but its run has not exited yet (task ${key}). Resuming now would run two copies of its agents against the same journal. Run ${TASKSTOP}({taskId: "${key}"}) on it or wait for it to exit.`;
  }
  let n = r.toolState.get(RunIndex).byId.get(resumeFromRunId);
  if (n !== undefined && !n.isKilled && n.isActive)
    return `Workflow ${resumeFromRunId} is still running. Wait for it to settle, or stop it first with ${TASKSTOP}, before resuming.`;
  return;
}
