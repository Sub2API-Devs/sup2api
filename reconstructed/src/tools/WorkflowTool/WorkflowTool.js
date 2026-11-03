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
import { resolve, basename, basename as basename_2 } from "path";
import { randomUUID } from "crypto";
import { openWorldJournal, worldStateOf } from "./world/worldJournal.js";
import {
  collectRunStatuses,
  RunIndex,
  describeWorldOp,
  worldOpVerbs,
  resolveWorkflowRun,
} from "./world/runRegistry.js";
import { RGe } from "../../skills/skillVisibility.js";
import { WORKFLOW_AUTHORING } from "../../skills/bundled/bundledSkillNames.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, oe, u, U } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  gx,
  loadWorkflowScriptFile,
  ZMr,
  resolveWorkflowScriptPath,
} from "../../services/workflow/scriptFile.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { stripFormatChars, truncateToLength, countCharInString } from "../../utils/stringUtils.js";
import { WORKFLOW_RUN_ID_PATTERN, WORKFLOW_TOOL_NAME } from "./constants.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { getCwd } from "../../utils/cwd.js";
import { getBundledWorkflows } from "../../services/workflows/bundledWorkflows.js";
import { din, PGe, qht, CLAUDE_WORKFLOW_NAME_ONLY } from "../../services/workflow/loadWorkflows.js";
import {
  readWorkflowJournal,
  hiddenScriptSha,
  HIDDEN_SCRIPT_RESUME_REFUSAL,
} from "../../services/workflow/journalEntries.js";
import {
  loadResumeJournal,
  oFt,
  probeWorkflowResume,
  restoredScriptFor,
  ensureResumeRestored,
  mirrorWorkflowScript,
} from "../../services/workflow/resume.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  isWorkflowsAvailable,
  isProSubscriber,
  res,
  getWorkflowsUnavailableReason,
} from "../../utils/workflows/workflowGates.js";
import { KTo } from "./prompt.js";
import { nK } from "../../utils/model/promptBundles.js";
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
import { hW } from "../../utils/agentProcessRegistry.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { generateTaskId } from "../../Task.js";
import { Iz } from "../../services/workflow/snapshots.js";
import { WGn, GGn, isBuiltInWithFlag, launchWorkflowRun } from "../../services/workflow/launch.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { ezr } from "../../commands.js";
import { promptIdForRequest } from "../../services/api/claude.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { formatOverflowHint } from "../../utils/format.js";
import { isTaskLoopSettled } from "../../tasks/taskLoopRegistry.js";

//@ chunk-y1shfdfm.js:55713-55744 placement
var Rr = 80,
  Gt = new Set(["args"]);
//@ chunk-y1shfdfm.js:55744-55835 placement
async function dt(e) {
  (await openWorldJournal(e.session, e.storageV5),
    collectRunStatuses(worldStateOf(e.session), e.toolState.get(RunIndex)));
}
//@ chunk-y1shfdfm.js:55835-55856 placement
function ge() {
  return;
}
//@ chunk-y1shfdfm.js:55856-56048 placement
function authoringSkillHint(e, r) {
  return e.name === void 0 && (e.script !== void 0 || e.scriptPath !== void 0) && RGe(r)
    ? `
Load the \`${WORKFLOW_AUTHORING}\` skill for the script reference if you have not, fix the script, and retry.`
    : "";
}
//@ chunk-y1shfdfm.js:56048-56071 placement
function ut() {
  return "";
}
//@ chunk-y1shfdfm.js:56071-59571 placement
var HIDDEN_CONTROL_CHARS_REASON =
    "script contains control characters that would be hidden in the approval dialog",
  Zt = DoctorLazy(() =>
    zodStrictObject({
      script: o()
        .max(gx)
        .refine(isAllPrintable, HIDDEN_CONTROL_CHARS_REASON)
        .optional()
        .describe(
          "Self-contained workflow script. Must begin with `export const meta = { name, description, phases }` (pure literal, no computed values) followed by the script body using agent()/parallel()/pipeline()/phase()." +
            (ge()?.SCRIPT_DESCRIPTION_V2 ?? ""),
        ),
      name: o()
        .refine((e) => stripFormatChars(e) === e, "contains control or invisible format characters")
        .optional()
        .describe(
          "Name of a predefined workflow (built-in or from .claude/workflows/). Resolves to a self-contained script.",
        ),
      description: o()
        .optional()
        .describe("Ignored \u2014 set the workflow description in the script's `meta` block."),
      title: o().optional().describe("Ignored \u2014 set the workflow title in the script's `meta` block."),
      args: oe()
        .optional()
        .describe(
          "Optional input value exposed to the script as the global `args`, verbatim. Pass arrays/objects as actual JSON values, NOT as a " +
            "JSON-encoded string \u2014 a stringified list breaks `args.filter`/" +
            "`args.map` in the script. Use for parameterized named workflows (e.g. a research question).",
        ),
      scriptPath: o()
        .refine((e) => stripFormatChars(e) === e, "contains control or invisible format characters")
        .optional()
        .describe(
          "Path to a workflow script file on disk. Every Workflow invocation persists its script under the session directory and returns the path in the tool result. To iterate, edit that file with Write/Edit and re-invoke Workflow with the same `scriptPath` instead of re-sending the full script. Takes precedence over `script` and `name`.",
        ),
      resumeFromRunId: o()
        .regex(WORKFLOW_RUN_ID_PATTERN)
        .optional()
        .describe(
          `Run ID of a prior Workflow invocation to resume from. Completed agent() calls with unchanged (prompt, opts) return their cached results instantly; only edited or new calls re-run. Same-session only. Stop the prior run first (${TASKSTOP}) before resuming.`,
        ),
      ...(ge()?.runOpFields() ?? {}),
      ...!1,
    }).refine((e) => e.script || e.name || e.scriptPath || e.runId, {
      message: "Must provide script, name, scriptPath, or runId",
    }),
  ),
  Qt = DoctorLazy(() =>
    u({
      status: U(["async_launched", "remote_launched", ...(ge() ? [ge().RUN_OP_STATUS] : [])]),
      taskId: o(),
      taskType: U(["local_workflow", "remote_agent"])
        .optional()
        .describe(
          "TaskType of the registered background task \u2014 'local_workflow' for in-process runs, 'remote_agent' when remote:true dispatches to CCR. Set on all new writes; absent only on transcripts written before this field existed.",
        ),
      workflowName: o()
        .optional()
        .describe(
          "meta.name from the workflow script \u2014 same value as task_started.workflow_name. Set on all new writes; absent only on transcripts written before this field existed.",
        ),
      runId: o()
        .optional()
        .describe(
          "Local workflow run identifier for resumeFromRunId. Absent for remote_launched (the CCR session URL is the resume handle there) and on transcripts written before this field existed.",
        ),
      summary: o().optional(),
      transcriptDir: o()
        .optional()
        .describe("Directory where subagent transcripts are written during execution"),
      scriptPath: o()
        .optional()
        .describe(
          "Path to the persisted workflow script for this invocation. Editable via Write/Edit; pass back as `scriptPath` to re-run without resending the script.",
        ),
      sessionUrl: o().optional().describe("CCR session URL when status is remote_launched"),
      warning: o()
        .optional()
        .describe(
          "Non-blocking heads-up (e.g. local git state diverges from the pushed branch the cloud session will clone)",
        ),
      error: o().optional().describe("Set if syntax check failed"),
      ...(ge()?.runOpOutputFields() ?? {}),
    }),
  );
//@ chunk-y1shfdfm.js:59571-59650 placement
class WorkflowInputError extends Error {
  constructor(e) {
    super(e);
    this.name = "WorkflowInputError";
  }
}
//@ chunk-y1shfdfm.js:59650-60381 placement
async function loadWorkflowScript(e, r, n) {
  if (e.scriptPath) {
    let s, i;
    if (e.script) ((s = e.script), (i = resolve(getCwd(), e.scriptPath)));
    else {
      let w = await loadWorkflowScriptFile(e.scriptPath, r);
      if ("error" in w) return w;
      ((s = w.script), (i = w.path));
    }
    if (getBundledWorkflows().some((w) => w.script === s || w.v2Script === s))
      return { script: s, resolvedScriptPath: i, source: "built-in", scriptMatchesDefinition: !0 };
    return { script: s, resolvedScriptPath: i };
  }
  if (e.name) {
    let s = await din(e.name, getCwd(), n);
    if (!s) {
      let joined = (await PGe(getCwd(), n)).map((w) => w.name).join(", ");
      return { error: `Workflow "${e.name}" not found. Available: ${joined || "(none)"}` };
    }
    return {
      script: e.script ?? s.script,
      source: s.source,
      scriptMatchesDefinition: e.script === void 0 || e.script === s.script,
    };
  }
  if (e.script) return { script: e.script };
  return { error: "Must provide script, name, or scriptPath" };
}
//@ chunk-y1shfdfm.js:60381-60500 placement
var RETRACTED_DISPATCH_RESULT = {
  result: !1,
  message: "Tool dispatch was retracted by a server fallback; the input may be truncated.",
  errorCode: 7,
};
//@ chunk-y1shfdfm.js:60500-60642 placement
function hiddenScriptResumeNote(e) {
  return `Run ${e} hides its script, so its script is not shown here; the resume runs only the script the run was launched with.`;
}
//@ chunk-y1shfdfm.js:60642-60757 placement
function readRunJournal(e, r, n) {
  return readWorkflowJournal(e, n.toolState, n.taskRegistry, () =>
    loadResumeJournal(e, r, n.storageV5, n.signal, n.toolState.get(oFt)),
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
      return { signal: r.signal };
    },
  };
}
//@ chunk-y1shfdfm.js:61257-61378 placement
function requireRunEngine(e) {
  if (!e.runEngine) throw Error("Workflow: launching needs the executor (call.runEngine)");
  return e.runEngine;
}
/**
 * Workflow 工具：运行确定性 JavaScript 脚本编排子代理（RunWorkflow 别名）。
 */
//@ chunk-y1shfdfm.js:61378-72084 placement
var WorkflowTool = buildTool({
  name: WORKFLOW_TOOL_NAME,
  aliases: ["RunWorkflow"],
  searchHint: "orchestrate subagents with deterministic JavaScript workflow",
  enablesCodeExecution: !0,
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  isEnabled: () => isWorkflowsAvailable(),
  async prompt(e) {
    return (
      KTo(RGe(e?.tools), nK({ model: e?.model, leanRewrite: e?.leanRewrite })) +
      workflowSizePromptLine(getGlobalConfig().workflowSizeGuideline, isProSubscriber()) +
      ut()
    );
  },
  async description(e, r) {
    return (
      KTo(RGe(r?.tools)) +
      workflowSizePromptLine(getGlobalConfig().workflowSizeGuideline, isProSubscriber()) +
      ut()
    );
  },
  get inputSchema() {
    return Zt();
  },
  get outputSchema() {
    return Qt();
  },
  coerceInput: (e) => parseWorkflowArgs(e, { apply: res() }),
  streamedInputRepairExemptKeys: () => (res() ? void 0 : Gt),
  toAutoClassifierInput(e) {
    let r = ge();
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
    let r = e ? describeWorldOp(e) : void 0;
    if (r && ge()) return `workflow ${r.runId} \xB7 ${worldOpVerbs(r) ?? "?"}`;
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
        let i = getWorkflowsUnavailableReason();
        if (i !== void 0) {
          let y = { kind: "feature_disabled", feature: "workflows", cause: i };
          if (i === "unsupported_runtime")
            return { result: !1, message: NOT_ON_BUN_MESSAGE, errorCode: 17, remedy: y };
          return i === "managed_settings"
            ? {
                result: !1,
                message: "Dynamic workflows are disabled by managed settings (`disableWorkflows`).",
                errorCode: 5,
                remedy: y,
              }
            : {
                result: !1,
                message:
                  'Dynamic workflows are not enabled for this session (org policy, launch gate, or the "Dynamic workflows" setting in /config).',
                errorCode: 6,
                remedy: y,
              };
        }
        if (typeof r.runId === "string") {
          let y = ge();
          if (!y) return { result: !1, message: "runId is not a field of this tool here.", errorCode: 9 };
          await dt(s);
          let validateRunOp = await y.validateRunOp(r, s);
          if (validateRunOp) return validateRunOp;
        }
        if (qht()) {
          let filtered = [
            r.script && "script",
            r.scriptPath && "scriptPath",
            r.resumeFromRunId && "resumeFromRunId",
            r.remote && "remote",
          ].filter((R) => Boolean(R));
          if (filtered.length > 0)
            return {
              result: !1,
              message: `This session restricts the Workflow tool to named workflows (${CLAUDE_WORKFLOW_NAME_ONLY} is set). Not allowed here: ${filtered.join(", ")}. Invoke as {name, args} only.`,
              errorCode: 8,
            };
        }
        if (r.scriptPath) {
          let y = ZMr(r.scriptPath, s);
          if (y !== null) return { result: !1, message: y, errorCode: 15 };
        }
        let w;
        if (r.resumeFromRunId) {
          let y = findWorkflowTaskByRun(r.resumeFromRunId, s);
          if (y) return { result: !1, message: y, errorCode: 3 };
          let R = await probeWorkflowResume(
            r.resumeFromRunId,
            r.scriptPath,
            s.storageV5,
            s.signal,
            s.toolState.get(oFt),
          );
          if (isServerFallbackDiscard(s.signal)) return RETRACTED_DISPATCH_RESULT;
          if (R.kind === "refused") return { result: !1, message: R.message, errorCode: 16 };
          if (r.scriptPath) w = restoredScriptFor(R, r.scriptPath);
        }
        let h = await loadWorkflowScript(r, s, s.storageV5);
        if ("error" in h && w !== void 0) h = await loadWorkflowScript({ ...r, script: w }, s, s.storageV5);
        if (isServerFallbackDiscard(s.signal)) return RETRACTED_DISPATCH_RESULT;
        if ("error" in h) {
          if (r.name && !r.scriptPath) logFeatureBad("workflow_resolve", "not_found");
          return { result: !1, message: h.error, errorCode: 1 };
        }
        if (r.name && !r.scriptPath) logFeatureOk("workflow_resolve");
        if (!isAllPrintable(h.script))
          return {
            result: !1,
            message: `${r.scriptPath ? `Workflow script file ${r.scriptPath}` : `The file of workflow "${r.name}"`} contains a control character that an approval prompt cannot show, such as an escape byte or a carriage return that is not part of a CRLF line ending. Remove it from the file and try again.`,
            errorCode: 17,
          };
        let k = parseWorkflowScript(h.script);
        if ("error" in k)
          return {
            result: !1,
            message: `Invalid workflow script: ${k.error}${authoringSkillHint(r, s.tools)}`,
            errorCode: 2,
          };
        if (r.script && usesNondeterministicTime(k.scriptBody))
          return {
            result: !1,
            message: `Workflow scripts must be deterministic: Date.now()/Math.random()/new Date() are unavailable (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.${authoringSkillHint(r, s.tools)}`,
            errorCode: 4,
          };
        return { result: !0 };
      },
      async checkPermissions(r, n) {
        let s = workflowRunContext(e, n),
          permissions = s.permissions(),
          w = describeWorldOp(r) !== void 0,
          h = r.scriptPath || w ? void 0 : r.name,
          k = (L) => (h ? getContentRulesMapForToolName(permissions, WORKFLOW_TOOL_NAME, L).get(h) : void 0),
          y = k("deny");
        if (y)
          return {
            behavior: "deny",
            message: `Workflow ${h} blocked by permission rules`,
            decisionReason: { type: "rule", rule: y },
          };
        let R = w ? describeWorldOp(r) : void 0;
        if (R && worldOpVerbs(R) === "read")
          return {
            behavior: "allow",
            updatedInput: r,
            decisionReason: { type: "other", reason: READ_ONLY_AUTO_ALLOW_REASON },
          };
        let I = r,
          x;
        if (w);
        else if (r.scriptPath) {
          let L = await loadWorkflowScriptFile(r.scriptPath, s),
            H =
              "error" in L && r.resumeFromRunId && ZMr(r.scriptPath, s) === null
                ? restoredScriptFor(
                    await probeWorkflowResume(
                      r.resumeFromRunId,
                      r.scriptPath,
                      s.storageV5,
                      s.signal,
                      s.toolState.get(oFt),
                    ),
                    r.scriptPath,
                  )
                : void 0,
            Z = r.resumeFromRunId == null ? void 0 : await readRunJournal(r.resumeFromRunId, r.scriptPath, s);
          if (Z?.kind === "refused")
            return {
              behavior: "deny",
              message: Z.reason,
              decisionReason: { type: "other", reason: "workflow resume refused" },
            };
          if (Z?.kind === "hidden" && r.resumeFromRunId != null && (H !== void 0 || !("error" in L)))
            ((I = { ...r, script: void 0 }), (x = hiddenScriptResumeNote(r.resumeFromRunId)));
          else if (H !== void 0) I = { ...r, script: H };
          else if ("error" in L)
            return {
              behavior: "deny",
              message: L.error,
              decisionReason: { type: "other", reason: "workflow scriptPath outside the readable set" },
            };
          else I = { ...r, script: L.script };
        } else if (r.name) {
          let L = await din(r.name, getCwd(), s.storageV5);
          I = { ...r, script: L?.script };
        }
        let V = (w && ge()?.RUN_OP_CONSENT_MESSAGE) || "Review dynamic workflow before running",
          G = x === void 0 ? V : `${V}. ${x}`,
          P = k("ask");
        if (P)
          return {
            behavior: "ask",
            message: G,
            updatedInput: I,
            decisionReason: { type: "rule", rule: P },
            ...(x !== void 0 && { suppressAlwaysAllowRule: !0 }),
          };
        let B = k("allow");
        if (B) return { behavior: "allow", updatedInput: I, decisionReason: { type: "rule", rule: B } };
        return {
          behavior: "ask",
          message: G,
          updatedInput: I,
          ...(x !== void 0 && { decisionReason: { type: "other", reason: x }, suppressAlwaysAllowRule: !0 }),
          ...(h && {
            suggestions: [
              {
                type: "addRules",
                rules: [{ toolName: WORKFLOW_TOOL_NAME, ruleContent: h }],
                behavior: "allow",
                destination: "localSettings",
              },
            ],
          }),
        };
      },
      async call(r, n) {
        let s = workflowRunContext(e, n),
          { parentMessage: parentMessage } = n;
        if (s.agentId !== void 0 && hW(s.agentId))
          throw (
            logFeatureBad("subagent_launch", "workflow_spawner_stop_pending"),
            new WorkflowInputError(
              "This agent has been stopped and its stop is still completing; it cannot launch workflows or act on existing runs.",
            )
          );
        if (typeof r.runId === "string") {
          let j = ge();
          if (!j) throw new WorkflowInputError("runId is not a field of this tool here.");
          await dt(s);
          let callRunOp = await j.callRunOp(r, s);
          if (callRunOp)
            return {
              data: { status: j.RUN_OP_STATUS, taskId: "", runId: callRunOp.runId, runOp: callRunOp.runOp },
            };
        }
        if (r.resumeFromRunId) {
          let j = findWorkflowTaskByRun(r.resumeFromRunId, s);
          if (j) throw new WorkflowInputError(j);
          let q = await readRunJournal(r.resumeFromRunId, r.scriptPath, s);
          if (q.kind === "refused") throw new WorkflowInputError(q.reason);
          let we = await ensureResumeRestored(
            r.resumeFromRunId,
            r.scriptPath,
            s.storageV5,
            s.signal,
            s.toolState.get(oFt),
          );
          if (we !== null) throw new WorkflowInputError(we);
        }
        let w = await loadWorkflowScript(r, s, s.storageV5);
        if ("error" in w) throw new WorkflowInputError(w.error);
        let { script: script, source: source, resolvedScriptPath: resolvedScriptPath } = w,
          R = (j) => {
            let q =
              r.resumeFromRunId == null
                ? void 0
                : hiddenScriptSha(r.resumeFromRunId, s.toolState, s.taskRegistry);
            if (q === "") throw new WorkflowInputError(HIDDEN_SCRIPT_RESUME_REFUSAL);
            if (q !== void 0 && q !== computeContentHash(j))
              throw new WorkflowInputError(
                "This workflow run hides its script, so it can only be resumed with its original script file, unedited. To run a changed script, start a new run without resumeFromRunId.",
              );
            return q;
          };
        R(script);
        let I = source === "built-in" && w.scriptMatchesDefinition === !0,
          x = parseWorkflowScript(script);
        if ("error" in x) throw new WorkflowInputError(`Invalid workflow script: ${x.error}`);
        let V = r.resumeFromRunId ?? `wf_${randomUUID().slice(0, 12)}`,
          G = generateTaskId("local_workflow"),
          description = x.meta.description,
          B = x.meta.name,
          L = compileWorkflowScript(x.scriptBody);
        if (!L.ok)
          return (
            logFeatureBad("task_local_workflow", "compile_failed"),
            {
              data: {
                status: "async_launched",
                taskId: G,
                taskType: "local_workflow",
                workflowName: B,
                runId: V,
                summary: description,
                error: `${L.error}${authoringSkillHint(r, s.tools)}`,
              },
            }
          );
        let H = Iz(V),
          Z = resolvedScriptPath ?? resolveWorkflowScriptPath(B, V, script, s.storageV5);
        mirrorWorkflowScript(V, Z, script, s.toolState.get(oFt));
        let re = r.scriptPath ? void 0 : source,
          me = r.scriptPath ? "scriptPath" : (source ?? "inline"),
          he = WGn(B, re, I),
          ae = GGn(x.meta.description, re, I);
        if (
          (logEvent("tengu_workflow_launched", {
            invocation_mode: lit(r.scriptPath ? "scriptPath" : r.name ? "named" : "inline"),
            workflow_source: fromEnum(me),
            workflow_name: he,
            workflow_description: ae,
            phase_count: x.meta.phases?.length ?? 0,
            launched_from_subagent: s.agentId != null,
            has_args: r.args != null,
            is_resume: r.resumeFromRunId != null,
            script_size_chars: script.length,
          }),
          r.resumeFromRunId == null)
        )
          resolveWorkflowRun({
            toolState: s.toolState,
            taskRegistry: s.taskRegistry,
            name: isBuiltInWithFlag(re, I) ? ezr(B) : void 0,
            runId: V,
          });
        let ee = {
            workflowRunId: V,
            script: script,
            scriptPath: Z,
            args: r.args,
            meta: x.meta,
            vmScript: L.vmScript,
            toolUseId: s.toolUseId,
            transcriptDir: H,
            telemetry: { source: me, name: he, description: ae, scriptIsVerbatimBuiltIn: I },
            invokingRequestId: parentMessage?.requestId,
            parentPromptId: promptIdForRequest(s.messages(), s.agentContext),
          },
          ke = requireRunEngine(n),
          O = (j) => ke(launchWorkflowRun, j);
        if (r.resumeFromRunId) {
          let j = findWorkflowTaskByRun(r.resumeFromRunId, s);
          if (j) throw (logFeatureBad("task_local_workflow", "resume_collision"), new WorkflowInputError(j));
        }
        let le = R(script) !== void 0;
        return (
          O({
            ...ee,
            taskId: G,
            isResume: r.resumeFromRunId != null,
            ...(le && { withholdScriptFromSdkEvents: !0 }),
          }),
          {
            data: {
              status: "async_launched",
              taskId: G,
              taskType: "local_workflow",
              workflowName: B,
              runId: V,
              summary: description,
              transcriptDir: H,
              scriptPath: Z,
            },
          }
        );
      },
    };
  },
  renderToolUseMessage(e, { verbose: r }) {
    let n = describeWorldOp(e),
      s = ge();
    if (n && s) return s.renderRunOp(n, r);
    if (e.scriptPath) {
      let i = stripFormatChars(e.scriptPath),
        w = r ? i : basename(i);
      if (!e.script) return w;
      return r
        ? `${i}
${e.script}`
        : `${w} \xB7 ${workflowScriptSummary(e.script)}`;
    }
    if (e.name) {
      let i = stripFormatChars(e.name);
      if (!e.script) return `dynamic workflow: ${i}`;
      return r
        ? `dynamic workflow: ${i}
${e.script}`
        : `dynamic workflow: ${i} \xB7 ${workflowScriptSummary(e.script)}`;
    }
    if (!e.script) return null;
    return r ? e.script : workflowScriptSummary(e.script);
  },
  mapToolResultToToolResultBlockParam(e, r) {
    if (e.error)
      return {
        tool_use_id: r,
        type: "tool_result",
        content: `Workflow script has a syntax error and was not launched:
${e.error}`,
        is_error: !0,
      };
    let n = ge()?.runOpToolResultText(e.runId, e.runOp);
    if (n) return { tool_use_id: r, type: "tool_result", content: n.content, is_error: n.isError };
    if (e.status === "remote_launched")
      return {
        tool_use_id: r,
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
        is_error: !1,
      };
    let s = e.summary
        ? `
Summary: ${e.summary}`
        : "",
      i = e.transcriptDir
        ? `
Transcript dir: ${e.transcriptDir}`
        : "",
      w = e.scriptPath
        ? `
Script file: ${e.scriptPath}
(Edit this file with Write/Edit and re-invoke Workflow with {scriptPath: "${e.scriptPath}"} to iterate without resending the script.)`
        : "",
      h =
        e.runId && e.scriptPath
          ? `
Run ID: ${e.runId}
To resume after editing the script: Workflow({scriptPath: "${e.scriptPath}", resumeFromRunId: "${e.runId}"}) \u2014 completed agents return cached results (cached results may themselves be empty \u2014 inspect journal.jsonl before assuming there is something to recover).`
          : "",
      k = (e.runId, ""),
      y = `Workflow launched in background. Task ID: ${e.taskId}${s}${i}${w}${h}${k}

You will be notified when it completes. Use /workflows to watch live progress.`;
    return { tool_use_id: r, type: "tool_result", content: y, is_error: !1 };
  },
});
//@ chunk-y1shfdfm.js:72084-72309 placement
function workflowScriptSummary(e) {
  let r = parseWorkflowScript(e);
  if (!("error" in r)) return stripFormatChars(r.meta.description);
  let n =
      e
        .split(
          `
`,
        )
        .find((k) => k.trim()) ?? truncateToLength(e, 40),
    s = bunStringWidth(n) > Rr || n.length > Rr ? truncateToLength(n, Rr - 1) + "\u2026" : n,
    i =
      countCharInString(
        e,
        `
`,
      ) + 1,
    w = formatOverflowHint(i - 1),
    h = stripFormatChars(s);
  return w ? `${h} ${w}` : h;
}
//@ chunk-y1shfdfm.js:72309-73217 placement
function findWorkflowTaskByRun(e, r) {
  for (let [s, i] of Object.entries(r.taskRegistry?.all() ?? {})) {
    if (i.type !== "local_workflow" || i.workflowRunId !== e) continue;
    if (i.status === "running")
      return `Workflow ${e} is still running (task ${s}). Stop it first with ${TASKSTOP}({taskId: "${s}"}) before resuming.`;
    if (!isTaskLoopSettled(s))
      return i.status === "paused"
        ? `Workflow ${e} is paused but its run has not exited yet (task ${s}); its agents are being stopped. Resuming now would run two copies of its agents against the same journal \u2014 wait for it to exit.`
        : `Workflow ${e} is not running but its run has not exited yet (task ${s}). Resuming now would run two copies of its agents against the same journal. Run ${TASKSTOP}({taskId: "${s}"}) on it or wait for it to exit.`;
  }
  let n = r.toolState.get(RunIndex).byId.get(e);
  if (n !== void 0 && !n.isKilled && n.isActive)
    return `Workflow ${e} is still running. Wait for it to settle, or stop it first with ${TASKSTOP}, before resuming.`;
  return;
}
