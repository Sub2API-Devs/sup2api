/**
 * services/workflows/remoteWorkflow.ts
 *
 * 2.1.316 新增：远程工作流启动。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-74vrtgsp.js (10)
 * attribution: placement 10
 */
import { randomUUID } from "crypto";
import { truncateToLength } from "../../utils/stringUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { fQr, _cr, Scr } from "../../utils/workflows/workflowGates.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import {
  getEveryMachineAdminTierSettings,
  isMachineAdminDocumentUnreadable,
} from "../../utils/settings/settings.js";
import { isReviewSession } from "../../utils/sessionAccessToken.js";
import { aar, gx, resolveWorkflowScriptPath } from "../workflow/scriptFile.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { parseWorkflowScript } from "./workflowScriptMeta.js";
import { usesNondeterministicTime, compileWorkflowScript } from "../workflow/scriptSandbox.js";
import { generateTaskId } from "../../Task.js";
import { WGn, GGn, launchWorkflowRun } from "../workflow/launch.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { evaluateAskingNoHost } from "../../utils/permissions/permissions.js";
import { Iz } from "../workflow/snapshots.js";

//@ chunk-74vrtgsp.js:839-856 placement
var l = 1e5,
  A = 4000;
//@ chunk-74vrtgsp.js:856-1041 placement
function sanitizeResultText(e) {
  let replaced = e
    .replace(/[\r\n\v\f\x1c\x1d\x1e\u0085\u2028\u2029]+/g, " ")
    .replaceAll("remote-workflow:", "remote-workflow;");
  if (replaced.length > A) replaced = `${truncateToLength(replaced, A)}\u2026[truncated]`;
  return replaced;
}
//@ chunk-74vrtgsp.js:1041-1105 placement
function oin(e, t) {
  return `remote-workflow: error[${e}]: ${sanitizeResultText(t)}`;
}
/**
 * 同上，另外转义 U+0085（NEL），用于 stream-json 输出。
 */
//@ chunk-74vrtgsp.js:1105-1248 placement = escapeJsLineTerminators (0.785)
function escapeJsLineTerminators(json) {
  let t = jsonStringify(json);
  return t === void 0
    ? void 0
    : t.replaceAll("\x85", "\\u0085").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}
//@ chunk-74vrtgsp.js:1248-1392 placement
function workflowsDisabledAtStartup() {
  let e = getLatchedPreSettingsEnvSnapshot();
  if (e === void 0) return fQr();
  return Object.keys(e).some((t) => t.toUpperCase() === "CLAUDE_CODE_DISABLE_WORKFLOWS" && isEnvTruthy(e[t]));
}
//@ chunk-74vrtgsp.js:1392-1552 placement
function adminDisabledWorkflows() {
  return getEveryMachineAdminTierSettings().some(
    (e) =>
      e.disableWorkflows === !0 ||
      Object.entries(e.env ?? {}).some(
        ([t, f]) => t.toUpperCase() === "CLAUDE_CODE_DISABLE_WORKFLOWS" && isEnvTruthy(f),
      ),
  );
}
/**
 * 代码审查因机器托管设置关闭工作流（或设置无法读取）而未运行时的提示文本。
 */
//@ chunk-74vrtgsp.js:1552-1958 placement
var ADMIN_DISABLED_REVIEW_TEXT =
    "Code review did not run: workflows are turned off in this machine's managed settings (`disableWorkflows`, or `CLAUDE_CODE_DISABLE_WORKFLOWS` in its `env` block). Ask this machine's administrator to allow it.",
  ADMIN_SETTINGS_UNREADABLE_TEXT =
    "Code review did not run: this machine's managed settings could not be read, so whether its administrator turned workflows off is not known. Ask this machine's administrator to fix them.";
//@ chunk-74vrtgsp.js:1958-2007 placement
function C() {
  if (adminDisabledWorkflows()) return ADMIN_DISABLED_REVIEW_TEXT;
  return isMachineAdminDocumentUnreadable() ? ADMIN_SETTINGS_UNREADABLE_TEXT : null;
}
/**
 * 判断工作流在本会话是否被禁止：启动时的环境变量、disableWorkflows 设置、组织策略，以及审查会话的托管设置；返回原因或 null。
 */
//@ chunk-74vrtgsp.js:2007-2715 placement
function workflowPolicyRefusal(opts) {
  if (workflowsDisabledAtStartup())
    return "dynamic workflows are disabled for this session (the environment variable `CLAUDE_CODE_DISABLE_WORKFLOWS` was set when Claude Code started).";
  let serverAuthored = opts?.serverAuthoredCarrier === !0;
  if (serverAuthored && opts?.eventSessionOrigin === "review") return C();
  if (_cr())
    return fQr()
      ? "dynamic workflows are disabled for this session (the environment variable `CLAUDE_CODE_DISABLE_WORKFLOWS`, set after Claude Code started, for example by a settings `env` block)."
      : "dynamic workflows are disabled for this session (the `disableWorkflows` setting).";
  if (serverAuthored && opts?.eventSessionOrigin === void 0 && isReviewSession()) return C();
  if (!Scr()) return "dynamic workflows are disabled for this session (org policy `allow_workflows`).";
  return null;
}
/**
 * 执行远程下发的工作流脚本：依次检查策略、脚本大小、控制字符、元数据解析、非确定性调用与编译，启动本地工作流运行并等待结束；完成时把结果序列化成一行 remote-workflow 结果（过长时逐级省略失败信息与结果），失败、被中止或状态异常时返回带层级的失败行。
 */
//@ chunk-74vrtgsp.js:2715-5650 placement
async function runRemoteWorkflow({
  script: script,
  args: args,
  telemetrySource: telemetrySource,
  serverAuthoredCarrier: serverAuthoredCarrier = !1,
  eventSessionOrigin: eventSessionOrigin,
  context: context,
}) {
  let fail = (s, r) => ({ ok: !1, layer: s, line: oin(s, r) }),
    policyRefusal = workflowPolicyRefusal({
      serverAuthoredCarrier: serverAuthoredCarrier,
      eventSessionOrigin: eventSessionOrigin,
    });
  if (policyRefusal) return fail("policy-gate", policyRefusal);
  let maxScriptBytes = serverAuthoredCarrier ? aar : gx;
  if (script.length > maxScriptBytes)
    return fail("script-too-large", `workflow script exceeds ${maxScriptBytes} bytes.`);
  if (!isAllPrintable(script))
    return fail("control-chars", "workflow script contains disallowed control characters.");
  let parsed = parseWorkflowScript(script, { maxBytes: maxScriptBytes });
  if ("error" in parsed) return fail("meta-parse", `invalid workflow script: ${parsed.error}`);
  if (usesNondeterministicTime(parsed.scriptBody))
    return fail(
      "nondeterminism",
      "workflow scripts must be deterministic: Date.now()/Math.random()/new Date() are unavailable (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.",
    );
  let compiled = compileWorkflowScript(parsed.scriptBody);
  if (!compiled.ok) return fail("compile", `workflow script compile failed: ${compiled.error}`);
  let runId = `wf_${randomUUID().slice(0, 12)}`,
    taskId = generateTaskId("local_workflow"),
    scriptPath = resolveWorkflowScriptPath(parsed.meta.name, runId, script, context.storageV5),
    telemetryName = WGn(parsed.meta.name, void 0, !1),
    telemetryDescription = GGn(parsed.meta.description, void 0, !1);
  logEvent("tengu_workflow_launched", {
    invocation_mode: fromEnum(telemetrySource),
    workflow_source: fromEnum(telemetrySource),
    phase_count: parsed.meta.phases?.length ?? 0,
    launched_from_subagent: !1,
    has_args: args != null,
    is_resume: !1,
    script_size_chars: script.length,
  });
  let settled = await new Promise((s) => {
    launchWorkflowRun({
      taskId: taskId,
      workflowRunId: runId,
      script: script,
      scriptPath: scriptPath,
      args: args,
      meta: parsed.meta,
      vmScript: compiled.vmScript,
      toolUseContext: context,
      canUseTool: context.canUseTool ?? evaluateAskingNoHost,
      toolUseId: void 0,
      transcriptDir: Iz(runId),
      telemetry: {
        source: telemetrySource,
        name: telemetryName,
        description: telemetryDescription,
        scriptIsVerbatimBuiltIn: !1,
      },
      isResume: !1,
      onSettled: s,
      suppressCompletionNotification: !0,
      withholdScriptFromSdkEvents: serverAuthoredCarrier,
    });
  });
  switch (settled.status) {
    case "completed": {
      let s = {
          status: "completed",
          workflowName: parsed.meta.name,
          runId: runId,
          agentCount: settled.agentCount,
          durationMs: settled.durationMs,
          failures: settled.failures,
          result: settled.result,
        },
        r = escapeJsLineTerminators(s);
      if (r === void 0 || r.length > l) {
        let E = r === void 0 ? "not serializable" : `${r.length} chars exceeds ${l}`,
          mapped = settled.failures
            .slice(0, 20)
            .map((h) => (h.length > 500 ? `${truncateToLength(h, 500)}\u2026[truncated]` : h));
        if (settled.failures.length > mapped.length)
          mapped.push(`\u2026and ${settled.failures.length - mapped.length} more failures omitted`);
        if (((r = escapeJsLineTerminators({ ...s, failures: mapped })), r === void 0 || r.length > l))
          r = escapeJsLineTerminators({
            ...s,
            failures: [
              `<${settled.failures.length} failures omitted: diagnostics never outrank the result payload>`,
            ],
          });
        if (r === void 0 || r.length > l)
          r = escapeJsLineTerminators({ ...s, failures: mapped, result: `<result omitted: ${E}>` });
        if (r === void 0 || r.length > l)
          r =
            escapeJsLineTerminators({
              status: "completed",
              workflowName: truncateToLength(String(parsed.meta.name), 200),
              runId: runId,
              agentCount: settled.agentCount,
              durationMs: settled.durationMs,
              failures: [`<${settled.failures.length} failures omitted: fallback exceeded ${l}>`],
              result: `<result omitted: ${E}>`,
            }) ?? '{"status":"completed"}';
      }
      return { ok: !0, line: `remote-workflow: ${r}`, workflowName: parsed.meta.name };
    }
    case "failed":
      return fail(
        "workflow-failed",
        `workflow failed after ${settled.durationMs}ms (${settled.agentCount} agents): ${settled.error}`,
      );
    case "killed":
      return fail("killed", "workflow was aborted before completion.");
    case "adopted":
    case "unknown":
      return fail("unexpected-state", `workflow ended in unexpected state '${settled.status}'.`);
  }
}

export { runRemoteWorkflow, oin, workflowPolicyRefusal };
