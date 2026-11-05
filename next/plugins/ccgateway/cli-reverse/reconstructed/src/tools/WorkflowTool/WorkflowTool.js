/**
 * tools/WorkflowTool/WorkflowTool.ts
 *
 * 2.1.316 新增：Workflow 工具（运行确定性 JS 脚本编排子代理）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kgbsr4tm.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import {
  zodStrictObject,
  stringSchema,
  unknown,
  objectSchema,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
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

//@ chunk-kgbsr4tm.js:57377-57408 placement
/**
 * 工作流标题/描述的最大显示宽度（80）。
 */
var MAX_WORKFLOW_TITLE_CHARS = 80;
var STREAM_INPUT_EXEMPT_KEYS = new Set(["args"]);
//@ chunk-kgbsr4tm.js:57408-57499 placement
/**
 * 打开工作流 world 日志并收集运行状态。
 */
async function reopenWorldJournal(runContext) {
  await openWorldJournal(runContext.session, runContext.storageV5);
  collectRunStatuses(worldStateOf(runContext.session), runContext.toolState.get(RunIndex));
}
//@ chunk-kgbsr4tm.js:57499-57520 placement
/**
 * 工作流脚本扩展（当前未提供，恒 undefined）。
 */
function workflowScriptExtension() {
  return;
}
//@ chunk-kgbsr4tm.js:57520-57712 placement
function authoringSkillHint(input, tools) {
  return input.name === undefined &&
    (input.script !== undefined || input.scriptPath !== undefined) &&
    isWorkflowAuthoringSkillVisible(tools)
    ? `
Load the \`${WORKFLOW_AUTHORING}\` skill for the script reference if you have not, fix the script, and retry.`
    : "";
}
//@ chunk-kgbsr4tm.js:57712-57735 placement
/**
 * 返回空串的提示后缀。
 */
function emptyPromptSuffix() {
  return "";
}
//@ chunk-kgbsr4tm.js:57735-61235 placement
/**
 * Workflow 工具的输入 schema（script/args 等）。
 */
var HIDDEN_CONTROL_CHARS_REASON =
  "script contains control characters that would be hidden in the approval dialog";
var workflowInputSchema = DoctorLazy(() =>
  zodStrictObject({
    script: stringSchema()
      .max(MAX_SCRIPT_FILE_BYTES)
      .refine(isAllPrintable, HIDDEN_CONTROL_CHARS_REASON)
      .optional()
      .describe(
        "Self-contained workflow script. Must begin with `export const meta = { name, description, phases }` (pure literal, no computed values) followed by the script body using agent()/parallel()/pipeline()/phase()." +
          (workflowScriptExtension()?.SCRIPT_DESCRIPTION_V2 ?? ""),
      ),
    name: stringSchema()
      .refine(
        (nameValue) => stripFormatChars(nameValue) === nameValue,
        "contains control or invisible format characters",
      )
      .optional()
      .describe(
        "Name of a predefined workflow (built-in or from .claude/workflows/). Resolves to a self-contained script.",
      ),
    description: stringSchema()
      .optional()
      .describe("Ignored \u2014 set the workflow description in the script's `meta` block."),
    title: stringSchema()
      .optional()
      .describe("Ignored \u2014 set the workflow title in the script's `meta` block."),
    args: unknown()
      .optional()
      .describe(
        "Optional input value exposed to the script as the global `args`, verbatim. Pass arrays/objects as actual JSON values, NOT as a " +
          "JSON-encoded string \u2014 a stringified list breaks `args.filter`/" +
          "`args.map` in the script. Use for parameterized named workflows (e.g. a research question).",
      ),
    scriptPath: stringSchema()
      .refine(
        (pathValue) => stripFormatChars(pathValue) === pathValue,
        "contains control or invisible format characters",
      )
      .optional()
      .describe(
        "Path to a workflow script file on disk. Every Workflow invocation persists its script under the session directory and returns the path in the tool result. To iterate, edit that file with Write/Edit and re-invoke Workflow with the same `scriptPath` instead of re-sending the full script. Takes precedence over `script` and `name`.",
      ),
    resumeFromRunId: stringSchema()
      .regex(WORKFLOW_RUN_ID_PATTERN)
      .optional()
      .describe(
        `Run ID of a prior Workflow invocation to resume from. Completed agent() calls with unchanged (prompt, opts) return their cached results instantly; only edited or new calls re-run. Same-session only. Stop the prior run first (${TASKSTOP}) before resuming.`,
      ),
    ...(workflowScriptExtension()?.runOpFields() ?? {}),
    ...false,
  }).refine((input) => input.script || input.name || input.scriptPath || input.runId, {
    message: "Must provide script, name, scriptPath, or runId",
  }),
);
var workflowOutputSchema = DoctorLazy(() =>
  objectSchema({
    status: _enum([
      "async_launched",
      "remote_launched",
      ...(workflowScriptExtension() ? [workflowScriptExtension().RUN_OP_STATUS] : []),
    ]),
    taskId: stringSchema(),
    taskType: _enum(["local_workflow", "remote_agent"])
      .optional()
      .describe(
        "TaskType of the registered background task \u2014 'local_workflow' for in-process runs, 'remote_agent' when remote:true dispatches to CCR. Set on all new writes; absent only on transcripts written before this field existed.",
      ),
    workflowName: stringSchema()
      .optional()
      .describe(
        "meta.name from the workflow script \u2014 same value as task_started.workflow_name. Set on all new writes; absent only on transcripts written before this field existed.",
      ),
    runId: stringSchema()
      .optional()
      .describe(
        "Local workflow run identifier for resumeFromRunId. Absent for remote_launched (the CCR session URL is the resume handle there) and on transcripts written before this field existed.",
      ),
    summary: stringSchema().optional(),
    transcriptDir: stringSchema()
      .optional()
      .describe("Directory where subagent transcripts are written during execution"),
    scriptPath: stringSchema()
      .optional()
      .describe(
        "Path to the persisted workflow script for this invocation. Editable via Write/Edit; pass back as `scriptPath` to re-run without resending the script.",
      ),
    sessionUrl: stringSchema().optional().describe("CCR session URL when status is remote_launched"),
    warning: stringSchema()
      .optional()
      .describe(
        "Non-blocking heads-up (e.g. local git state diverges from the pushed branch the cloud session will clone)",
      ),
    error: stringSchema().optional().describe("Set if syntax check failed"),
    ...(workflowScriptExtension()?.runOpOutputFields() ?? {}),
  }),
);
//@ chunk-kgbsr4tm.js:61235-61314 placement
class WorkflowInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkflowInputError";
  }
}
//@ chunk-kgbsr4tm.js:61314-62045 placement
async function loadWorkflowScript(input, runContext, storageV5) {
  if (input.scriptPath) {
    let script;
    let resolvedPath;
    if (input.script) {
      script = input.script;
      resolvedPath = resolve(getCwd(), input.scriptPath);
    } else {
      let workflowScriptFile = await loadWorkflowScriptFile(input.scriptPath, runContext);
      if ("error" in workflowScriptFile) return workflowScriptFile;
      script = workflowScriptFile.script;
      resolvedPath = workflowScriptFile.path;
    }
    if (getBundledWorkflows().some((bundled) => bundled.script === script || bundled.v2Script === script))
      return {
        script,
        resolvedScriptPath: resolvedPath,
        source: "built-in",
        scriptMatchesDefinition: true,
      };
    return {
      script,
      resolvedScriptPath: resolvedPath,
    };
  }
  if (input.name) {
    let workflowByName = await findWorkflowByName(input.name, getCwd(), storageV5);
    if (!workflowByName) {
      let joined = (await allWorkflowsForHost(getCwd(), storageV5))
        .map((workflow) => workflow.name)
        .join(", ");
      return {
        error: `Workflow "${input.name}" not found. Available: ${joined || "(none)"}`,
      };
    }
    return {
      script: input.script ?? workflowByName.script,
      source: workflowByName.source,
      scriptMatchesDefinition: input.script === undefined || input.script === workflowByName.script,
    };
  }
  if (input.script)
    return {
      script: input.script,
    };
  return {
    error: "Must provide script, name, or scriptPath",
  };
}
//@ chunk-kgbsr4tm.js:62045-62164 placement
var RETRACTED_DISPATCH_RESULT = {
  result: false,
  message: "Tool dispatch was retracted by a server fallback; the input may be truncated.",
  errorCode: 7,
};
//@ chunk-kgbsr4tm.js:62164-62306 placement
function hiddenScriptResumeNote(resumeFromRunId) {
  return `Run ${resumeFromRunId} hides its script, so its script is not shown here; the resume runs only the script the run was launched with.`;
}
//@ chunk-kgbsr4tm.js:62306-62421 placement
function readRunJournal(resumeFromRunId, scriptPath, runContext) {
  return readWorkflowJournal(resumeFromRunId, runContext.toolState, runContext.taskRegistry, () =>
    loadResumeJournal(
      resumeFromRunId,
      scriptPath,
      runContext.storageV5,
      runContext.signal,
      runContext.toolState.get(WorkflowResumeState),
    ),
  );
}
//@ chunk-kgbsr4tm.js:62421-63029 placement
function workflowRunContext(baseContext, callOptions) {
  let context = {
    get session() {
      return baseContext.session;
    },
    get storageV5() {
      return baseContext.storageV5;
    },
    get credentials() {
      return baseContext.credentials;
    },
    get agentId() {
      return baseContext.agentId;
    },
    get agentContext() {
      return baseContext.agentContext;
    },
    get taskRegistry() {
      return baseContext.taskRegistry;
    },
    get toolState() {
      return baseContext.toolState;
    },
    get tools() {
      return baseContext.tools;
    },
    get messages() {
      return baseContext.messages;
    },
    get permissions() {
      return baseContext.permissions;
    },
    get toolUseId() {
      return callOptions.toolUseId;
    },
    get signal() {
      return callOptions.signal;
    },
    get abortController() {
      return {
        signal: callOptions.signal,
      };
    },
  };
  if (codeModeAccepted())
    Object.defineProperty(context, "primitiveToolGrant", {
      get: () => baseContext.primitiveToolGrant,
      enumerable: true,
    });
  return context;
}
//@ chunk-kgbsr4tm.js:63029-63150 placement
function requireRunEngine(runContext) {
  if (!runContext.runEngine) throw Error("Workflow: launching needs the executor (call.runEngine)");
  return runContext.runEngine;
}
//@ chunk-kgbsr4tm.js:63150-73856 placement
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
  async prompt(options) {
    return (
      workflowToolDescription(
        isWorkflowAuthoringSkillVisible(options?.tools),
        leanRewriteOf({
          model: options?.model,
          leanRewrite: options?.leanRewrite,
        }),
      ) +
      workflowSizePromptLine(getGlobalConfig().workflowSizeGuideline, isProSubscriber()) +
      emptyPromptSuffix()
    );
  },
  async description(input, ctx) {
    return (
      workflowToolDescription(isWorkflowAuthoringSkillVisible(ctx?.tools)) +
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
  coerceInput: (rawInput) =>
    parseWorkflowArgs(rawInput, {
      apply: isWorkflowToolEnabled(),
    }),
  streamedInputRepairExemptKeys: () => (isWorkflowToolEnabled() ? undefined : STREAM_INPUT_EXEMPT_KEYS),
  toAutoClassifierInput(input) {
    let scriptExtension = workflowScriptExtension();
    if (scriptExtension && typeof input.runId === "string")
      return scriptExtension.runOpClassifierInput(input);
    if (input.script && input.scriptPath)
      return `${input.script}

scriptPath: ${input.scriptPath}`;
    if (input.script && input.name)
      return `${input.script}

name: ${input.name}`;
    return input.script || input.scriptPath || input.name || "";
  },
  userFacingName() {
    return "Workflow";
  },
  getToolUseSummary(input) {
    let worldOp = input ? describeWorldOp(input) : undefined;
    if (worldOp && workflowScriptExtension())
      return `workflow ${worldOp.runId} \xB7 ${worldOpVerbs(worldOp) ?? "?"}`;
    if (input?.scriptPath) {
      let baseName = basename(stripFormatChars(input.scriptPath));
      return input.script ? `${baseName} \xB7 ${workflowScriptSummary(input.script)}` : baseName;
    }
    if (input?.name)
      return input.script
        ? `dynamic workflow: ${stripFormatChars(input.name)} \xB7 ${workflowScriptSummary(input.script)}`
        : `dynamic workflow: ${stripFormatChars(input.name)}`;
    if (!input?.script) return null;
    return workflowScriptSummary(input.script);
  },
  create(toolContext) {
    return {
      async validateInput(input, callOptions) {
        let runContext = workflowRunContext(toolContext, callOptions);
        if (isServerFallbackDiscard(runContext.signal)) return RETRACTED_DISPATCH_RESULT;
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
        if (typeof input.runId === "string") {
          let scriptExtension = workflowScriptExtension();
          if (!scriptExtension)
            return {
              result: false,
              message: "runId is not a field of this tool here.",
              errorCode: 9,
            };
          await reopenWorldJournal(runContext);
          let validation = await scriptExtension.validateRunOp(input, runContext);
          if (validation) return validation;
        }
        if (workflowNameOnlyEnv()) {
          let filtered = [
            input.script && "script",
            input.scriptPath && "scriptPath",
            input.resumeFromRunId && "resumeFromRunId",
            input.remote && "remote",
          ].filter((flag) => Boolean(flag));
          if (filtered.length > 0)
            return {
              result: false,
              message: `This session restricts the Workflow tool to named workflows (${CLAUDE_WORKFLOW_NAME_ONLY} is set). Not allowed here: ${filtered.join(", ")}. Invoke as {name, args} only.`,
              errorCode: 8,
            };
        }
        if (input.scriptPath) {
          let pathRefusal = scriptPathRefusal(input.scriptPath, runContext);
          if (pathRefusal !== null)
            return {
              result: false,
              message: pathRefusal,
              errorCode: 15,
            };
        }
        let label;
        if (input.resumeFromRunId) {
          let workflowTaskByRun = findWorkflowTaskByRun(input.resumeFromRunId, runContext);
          if (workflowTaskByRun)
            return {
              result: false,
              message: workflowTaskByRun,
              errorCode: 3,
            };
          let resumeProbe = await probeWorkflowResume(
            input.resumeFromRunId,
            input.scriptPath,
            runContext.storageV5,
            runContext.signal,
            runContext.toolState.get(WorkflowResumeState),
          );
          if (isServerFallbackDiscard(runContext.signal)) return RETRACTED_DISPATCH_RESULT;
          if (resumeProbe.kind === "refused")
            return {
              result: false,
              message: resumeProbe.message,
              errorCode: 16,
            };
          if (input.scriptPath) label = restoredScriptFor(resumeProbe, input.scriptPath);
        }
        let workflowScript = await loadWorkflowScript(input, runContext, runContext.storageV5);
        if ("error" in workflowScript && label !== undefined)
          workflowScript = await loadWorkflowScript(
            {
              ...input,
              script: label,
            },
            runContext,
            runContext.storageV5,
          );
        if (isServerFallbackDiscard(runContext.signal)) return RETRACTED_DISPATCH_RESULT;
        if ("error" in workflowScript) {
          if (input.name && !input.scriptPath) logFeatureBad("workflow_resolve", "not_found");
          return {
            result: false,
            message: workflowScript.error,
            errorCode: 1,
          };
        }
        if (input.name && !input.scriptPath) logFeatureOk("workflow_resolve");
        if (!isAllPrintable(workflowScript.script))
          return {
            result: false,
            message: `${input.scriptPath ? `Workflow script file ${input.scriptPath}` : `The file of workflow "${input.name}"`} contains a control character that an approval prompt cannot show, such as an escape byte or a carriage return that is not part of a CRLF line ending. Remove it from the file and try again.`,
            errorCode: 17,
          };
        let workflowScript_2 = parseWorkflowScript(workflowScript.script);
        if ("error" in workflowScript_2)
          return {
            result: false,
            message: `Invalid workflow script: ${workflowScript_2.error}${authoringSkillHint(input, runContext.tools)}`,
            errorCode: 2,
          };
        if (input.script && usesNondeterministicTime(workflowScript_2.scriptBody))
          return {
            result: false,
            message: `Workflow scripts must be deterministic: Date.now()/Math.random()/new Date() are unavailable (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.${authoringSkillHint(input, runContext.tools)}`,
            errorCode: 4,
          };
        return {
          result: true,
        };
      },
      async checkPermissions(input, callOptions) {
        let workflowContext = workflowRunContext(toolContext, callOptions);
        let permissionState = workflowContext.permissions();
        let isWorldOp = describeWorldOp(input) !== undefined;
        let ruleName = input.scriptPath || isWorldOp ? undefined : input.name;
        let ruleFor = (behavior) =>
          ruleName
            ? getContentRulesMapForToolName(permissionState, WORKFLOW_TOOL_NAME, behavior).get(ruleName)
            : undefined;
        let denyRule = ruleFor("deny");
        if (denyRule)
          return {
            behavior: "deny",
            message: `Workflow ${ruleName} blocked by permission rules`,
            decisionReason: {
              type: "rule",
              rule: denyRule,
            },
          };
        let worldOp = isWorldOp ? describeWorldOp(input) : undefined;
        if (worldOp && worldOpVerbs(worldOp) === "read")
          return {
            behavior: "allow",
            updatedInput: input,
            decisionReason: {
              type: "other",
              reason: READ_ONLY_AUTO_ALLOW_REASON,
            },
          };
        let effectiveInput = input;
        let hiddenNote;
        if (isWorldOp);
        else if (input.scriptPath) {
          let workflowScriptFile = await loadWorkflowScriptFile(input.scriptPath, workflowContext);
          let restoredScript =
            "error" in workflowScriptFile &&
            input.resumeFromRunId &&
            scriptPathRefusal(input.scriptPath, workflowContext) === null
              ? restoredScriptFor(
                  await probeWorkflowResume(
                    input.resumeFromRunId,
                    input.scriptPath,
                    workflowContext.storageV5,
                    workflowContext.signal,
                    workflowContext.toolState.get(WorkflowResumeState),
                  ),
                  input.scriptPath,
                )
              : undefined;
          let journal =
            input.resumeFromRunId == null
              ? undefined
              : await readRunJournal(input.resumeFromRunId, input.scriptPath, workflowContext);
          if (journal?.kind === "refused")
            return {
              behavior: "deny",
              message: journal.reason,
              decisionReason: {
                type: "other",
                reason: "workflow resume refused",
              },
            };
          if (
            journal?.kind === "hidden" &&
            input.resumeFromRunId != null &&
            (restoredScript !== undefined || !("error" in workflowScriptFile))
          ) {
            effectiveInput = {
              ...input,
              script: undefined,
            };
            hiddenNote = hiddenScriptResumeNote(input.resumeFromRunId);
          } else if (restoredScript !== undefined)
            effectiveInput = {
              ...input,
              script: restoredScript,
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
            effectiveInput = {
              ...input,
              script: workflowScriptFile.script,
            };
        } else if (input.name) {
          let workflowByName = await findWorkflowByName(input.name, getCwd(), workflowContext.storageV5);
          effectiveInput = {
            ...input,
            script: workflowByName?.script,
          };
        }
        let consentMessage =
          (isWorldOp && workflowScriptExtension()?.RUN_OP_CONSENT_MESSAGE) ||
          "Review dynamic workflow before running";
        let message = hiddenNote === undefined ? consentMessage : `${consentMessage}. ${hiddenNote}`;
        let askRule = ruleFor("ask");
        if (askRule)
          return {
            behavior: "ask",
            message,
            updatedInput: effectiveInput,
            decisionReason: {
              type: "rule",
              rule: askRule,
            },
            ...(hiddenNote !== undefined && {
              suppressAlwaysAllowRule: true,
            }),
          };
        let allowRule = ruleFor("allow");
        if (allowRule)
          return {
            behavior: "allow",
            updatedInput: effectiveInput,
            decisionReason: {
              type: "rule",
              rule: allowRule,
            },
          };
        return {
          behavior: "ask",
          message,
          updatedInput: effectiveInput,
          ...(hiddenNote !== undefined && {
            decisionReason: {
              type: "other",
              reason: hiddenNote,
            },
            suppressAlwaysAllowRule: true,
          }),
          ...(ruleName && {
            suggestions: [
              {
                type: "addRules",
                rules: [
                  {
                    toolName: WORKFLOW_TOOL_NAME,
                    ruleContent: ruleName,
                  },
                ],
                behavior: "allow",
                destination: "localSettings",
              },
            ],
          }),
        };
      },
      async call(input, callOptions) {
        let runContext = workflowRunContext(toolContext, callOptions);
        let { parentMessage } = callOptions;
        if (runContext.agentId !== undefined && isAgentStopPending(runContext.agentId)) {
          logFeatureBad("subagent_launch", "workflow_spawner_stop_pending");
          throw new WorkflowInputError(
            "This agent has been stopped and its stop is still completing; it cannot launch workflows or act on existing runs.",
          );
        }
        if (typeof input.runId === "string") {
          let scriptExtension = workflowScriptExtension();
          if (!scriptExtension) throw new WorkflowInputError("runId is not a field of this tool here.");
          await reopenWorldJournal(runContext);
          let runOpResult = await scriptExtension.callRunOp(input, runContext);
          if (runOpResult)
            return {
              data: {
                status: scriptExtension.RUN_OP_STATUS,
                taskId: "",
                runId: runOpResult.runId,
                runOp: runOpResult.runOp,
              },
            };
        }
        if (input.resumeFromRunId) {
          let workflowTaskByRun = findWorkflowTaskByRun(input.resumeFromRunId, runContext);
          if (workflowTaskByRun) throw new WorkflowInputError(workflowTaskByRun);
          let runJournal = await readRunJournal(input.resumeFromRunId, input.scriptPath, runContext);
          if (runJournal.kind === "refused") throw new WorkflowInputError(runJournal.reason);
          let resumeRestored = await ensureResumeRestored(
            input.resumeFromRunId,
            input.scriptPath,
            runContext.storageV5,
            runContext.signal,
            runContext.toolState.get(WorkflowResumeState),
          );
          if (resumeRestored !== null) throw new WorkflowInputError(resumeRestored);
        }
        let workflowScript = await loadWorkflowScript(input, runContext, runContext.storageV5);
        if ("error" in workflowScript) throw new WorkflowInputError(workflowScript.error);
        let { script, source, resolvedScriptPath } = workflowScript;
        let assertScriptAllowed = (script) => {
          let hiddenSha =
            input.resumeFromRunId == null
              ? undefined
              : hiddenScriptSha(input.resumeFromRunId, runContext.toolState, runContext.taskRegistry);
          if (hiddenSha === "") throw new WorkflowInputError(HIDDEN_SCRIPT_RESUME_REFUSAL);
          if (hiddenSha !== undefined && hiddenSha !== computeContentHash(script))
            throw new WorkflowInputError(
              "This workflow run hides its script, so it can only be resumed with its original script file, unedited. To run a changed script, start a new run without resumeFromRunId.",
            );
          return hiddenSha;
        };
        assertScriptAllowed(script);
        let isVerbatimBuiltIn = source === "built-in" && workflowScript.scriptMatchesDefinition === true;
        let workflowScript_2 = parseWorkflowScript(script);
        if ("error" in workflowScript_2)
          throw new WorkflowInputError(`Invalid workflow script: ${workflowScript_2.error}`);
        let runId = input.resumeFromRunId ?? `wf_${randomUUID().slice(0, 12)}`;
        let taskId = generateTaskId("local_workflow");
        let summary = workflowScript_2.meta.description;
        let workflowName = workflowScript_2.meta.name;
        let compiled = compileWorkflowScript(workflowScript_2.scriptBody);
        if (!compiled.ok) {
          logFeatureBad("task_local_workflow", "compile_failed");
          return {
            data: {
              status: "async_launched",
              taskId,
              taskType: "local_workflow",
              workflowName,
              runId,
              summary,
              error: `${compiled.error}${authoringSkillHint(input, runContext.tools)}`,
            },
          };
        }
        let transcriptDir = subagentWorkflowDir(runId);
        let scriptFilePath =
          resolvedScriptPath ?? resolveWorkflowScriptPath(workflowName, runId, script, runContext.storageV5);
        mirrorWorkflowScript(runId, scriptFilePath, script, runContext.toolState.get(WorkflowResumeState));
        let sourceKind = input.scriptPath ? undefined : source;
        let invocationMode = input.scriptPath ? "scriptPath" : (source ?? "inline");
        let telemetryName = agentNameForTelemetry(workflowName, sourceKind, isVerbatimBuiltIn);
        let telemetryDescription = agentLabelForTelemetry(
          workflowScript_2.meta.description,
          sourceKind,
          isVerbatimBuiltIn,
        );
        logEvent("tengu_workflow_launched", {
          invocation_mode: lit(input.scriptPath ? "scriptPath" : input.name ? "named" : "inline"),
          workflow_source: fromEnum(invocationMode),
          workflow_name: telemetryName,
          workflow_description: telemetryDescription,
          phase_count: workflowScript_2.meta.phases?.length ?? 0,
          launched_from_subagent: runContext.agentId != null,
          has_args: input.args != null,
          is_resume: input.resumeFromRunId != null,
          script_size_chars: script.length,
        });
        if (input.resumeFromRunId == null)
          resolveWorkflowRun({
            toolState: runContext.toolState,
            taskRegistry: runContext.taskRegistry,
            name: isBuiltInWithFlag(sourceKind, isVerbatimBuiltIn)
              ? workerOnlySkillName(workflowName)
              : undefined,
            runId,
          });
        let launchRequest = {
          workflowRunId: runId,
          script,
          scriptPath: scriptFilePath,
          args: input.args,
          meta: workflowScript_2.meta,
          vmScript: compiled.vmScript,
          toolUseId: runContext.toolUseId,
          transcriptDir,
          telemetry: {
            source: invocationMode,
            name: telemetryName,
            description: telemetryDescription,
            scriptIsVerbatimBuiltIn: isVerbatimBuiltIn,
          },
          invokingRequestId: parentMessage?.requestId,
          parentPromptId: promptIdForRequest(runContext.messages(), runContext.agentContext),
        };
        let runEngine = requireRunEngine(callOptions);
        let launchRun = (launchArgs) => runEngine(launchWorkflowRun, launchArgs);
        if (input.resumeFromRunId) {
          let workflowTaskByRun = findWorkflowTaskByRun(input.resumeFromRunId, runContext);
          if (workflowTaskByRun) {
            logFeatureBad("task_local_workflow", "resume_collision");
            throw new WorkflowInputError(workflowTaskByRun);
          }
        }
        let hasHiddenSha = assertScriptAllowed(script) !== undefined;
        launchRun({
          ...launchRequest,
          taskId,
          isResume: input.resumeFromRunId != null,
          ...(hasHiddenSha && {
            withholdScriptFromSdkEvents: true,
          }),
        });
        return {
          data: {
            status: "async_launched",
            taskId,
            taskType: "local_workflow",
            workflowName,
            runId,
            summary,
            transcriptDir,
            scriptPath: scriptFilePath,
          },
        };
      },
    };
  },
  renderToolUseMessage(input, { verbose }) {
    let worldOp = describeWorldOp(input);
    let scriptExtension = workflowScriptExtension();
    if (worldOp && scriptExtension) return scriptExtension.renderRunOp(worldOp, verbose);
    if (input.scriptPath) {
      let scriptPathText = stripFormatChars(input.scriptPath);
      let displayPath = verbose ? scriptPathText : basename(scriptPathText);
      if (!input.script) return displayPath;
      return verbose
        ? `${scriptPathText}
${input.script}`
        : `${displayPath} \xB7 ${workflowScriptSummary(input.script)}`;
    }
    if (input.name) {
      let nameText = stripFormatChars(input.name);
      if (!input.script) return `dynamic workflow: ${nameText}`;
      return verbose
        ? `dynamic workflow: ${nameText}
${input.script}`
        : `dynamic workflow: ${nameText} \xB7 ${workflowScriptSummary(input.script)}`;
    }
    if (!input.script) return null;
    return verbose ? input.script : workflowScriptSummary(input.script);
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    if (result.error)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `Workflow script has a syntax error and was not launched:
${result.error}`,
        is_error: true,
      };
    let runOpText = workflowScriptExtension()?.runOpToolResultText(result.runId, result.runOp);
    if (runOpText)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: runOpText.content,
        is_error: runOpText.isError,
      };
    if (result.status === "remote_launched")
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content:
          `Workflow launched in a remote CCR session. Task ID: ${result.taskId}
Session: ${result.sessionUrl}
` +
          (result.summary
            ? `Summary: ${result.summary}
`
            : "") +
          (result.warning
            ? `Warning: ${result.warning}
`
            : "") +
          `
The workflow runs against a fresh clone of the pushed branch; phase progress is visible at the session URL, not in /workflows. You will be notified when it completes.`,
        is_error: false,
      };
    let summaryLine = result.summary
      ? `
Summary: ${result.summary}`
      : "";
    let transcriptLine = result.transcriptDir
      ? `
Transcript dir: ${result.transcriptDir}`
      : "";
    let scriptLine = result.scriptPath
      ? `
Script file: ${result.scriptPath}
(Edit this file with Write/Edit and re-invoke Workflow with {scriptPath: "${result.scriptPath}"} to iterate without resending the script.)`
      : "";
    let resumeLine =
      result.runId && result.scriptPath
        ? `
Run ID: ${result.runId}
To resume after editing the script: Workflow({scriptPath: "${result.scriptPath}", resumeFromRunId: "${result.runId}"}) \u2014 completed agents return cached results (cached results may themselves be empty \u2014 inspect journal.jsonl before assuming there is something to recover).`
        : "";
    let extraLine = (result.runId, "");
    let content = `Workflow launched in background. Task ID: ${result.taskId}${summaryLine}${transcriptLine}${scriptLine}${resumeLine}${extraLine}

You will be notified when it completes. Use /workflows to watch live progress.`;
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content,
      is_error: false,
    };
  },
});
//@ chunk-kgbsr4tm.js:73856-74079 placement
function workflowScriptSummary(script) {
  let workflowScript = parseWorkflowScript(script);
  if (!("error" in workflowScript)) return stripFormatChars(workflowScript.meta.description);
  let firstLine =
    script
      .split(
        `
`,
      )
      .find((line) => line.trim()) ?? truncateToLength(script, 40);
  let title =
    bunStringWidth(firstLine) > MAX_WORKFLOW_TITLE_CHARS || firstLine.length > MAX_WORKFLOW_TITLE_CHARS
      ? truncateToLength(firstLine, MAX_WORKFLOW_TITLE_CHARS - 1) + "\u2026"
      : firstLine;
  let lineCount =
    countCharInString(
      script,
      `
`,
    ) + 1;
  let overflowHint = formatOverflowHint(lineCount - 1);
  let cleanTitle = stripFormatChars(title);
  return overflowHint ? `${cleanTitle} ${overflowHint}` : cleanTitle;
}
//@ chunk-kgbsr4tm.js:74079-74987 placement
function findWorkflowTaskByRun(resumeFromRunId, toolContext) {
  for (let [key, value] of Object.entries(toolContext.taskRegistry?.all() ?? {})) {
    if (value.type !== "local_workflow" || value.workflowRunId !== resumeFromRunId) continue;
    if (value.status === "running")
      return `Workflow ${resumeFromRunId} is still running (task ${key}). Stop it first with ${TASKSTOP}({taskId: "${key}"}) before resuming.`;
    if (!isTaskLoopSettled(key))
      return value.status === "paused"
        ? `Workflow ${resumeFromRunId} is paused but its run has not exited yet (task ${key}); its agents are being stopped. Resuming now would run two copies of its agents against the same journal \u2014 wait for it to exit.`
        : `Workflow ${resumeFromRunId} is not running but its run has not exited yet (task ${key}). Resuming now would run two copies of its agents against the same journal. Run ${TASKSTOP}({taskId: "${key}"}) on it or wait for it to exit.`;
  }
  let runEntry = toolContext.toolState.get(RunIndex).byId.get(resumeFromRunId);
  if (runEntry !== undefined && !runEntry.isKilled && runEntry.isActive)
    return `Workflow ${resumeFromRunId} is still running. Wait for it to settle, or stop it first with ${TASKSTOP}, before resuming.`;
  return;
}
export { WorkflowTool };
