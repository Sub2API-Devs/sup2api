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
import {
  isWorkflowsEnvDisabled,
  isWorkflowsConfiguredOff,
  isWorkflowsPolicyAllowed,
} from "../../utils/workflows/workflowGates.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import {
  getEveryMachineAdminTierSettings,
  isMachineAdminDocumentUnreadable,
} from "../../utils/settings/settings.js";
import { isReviewSession } from "../../utils/sessionAccessToken.js";
import {
  MAX_SCRIPT_BUNDLE_BYTES,
  MAX_SCRIPT_FILE_BYTES,
  resolveWorkflowScriptPath,
} from "../workflow/scriptFile.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { parseWorkflowScript } from "./workflowScriptMeta.js";
import { usesNondeterministicTime, compileWorkflowScript } from "../workflow/scriptSandbox.js";
import { generateTaskId } from "../../Task.js";
import { agentNameForTelemetry, agentLabelForTelemetry, launchWorkflowRun } from "../workflow/launch.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { evaluateAskingNoHost } from "../../utils/permissions/permissions.js";
import { subagentWorkflowDir } from "../workflow/snapshots.js";

//@ chunk-74vrtgsp.js:839-856 placement
/**
 * 远程工作流结果的长度上限：序列化上限与文本截断长度。
 */
var REMOTE_WORKFLOW_SERIALIZED_MAX_CHARS = 1e5;
var REMOTE_WORKFLOW_TEXT_TRUNCATE_CHARS = 4000;
//@ chunk-74vrtgsp.js:856-1041 placement
function sanitizeResultText(e) {
  let replaced = e
    .replace(/[\r\n\v\f\x1c\x1d\x1e\u0085\u2028\u2029]+/g, " ")
    .replaceAll("remote-workflow:", "remote-workflow;");
  if (replaced.length > REMOTE_WORKFLOW_TEXT_TRUNCATE_CHARS)
    replaced = `${truncateToLength(replaced, REMOTE_WORKFLOW_TEXT_TRUNCATE_CHARS)}\u2026[truncated]`;
  return replaced;
}
//@ chunk-74vrtgsp.js:1041-1105 placement
/**
 * 生成一行 remote-workflow 错误结果（层名 + 清洗后的信息）。
 */
function remoteWorkflowErrorLine(e, t) {
  return `remote-workflow: error[${e}]: ${sanitizeResultText(t)}`;
}
//@ chunk-74vrtgsp.js:1105-1248 placement = escapeJsLineTerminators (0.785)
/**
 * 同上，另外转义 U+0085（NEL），用于 stream-json 输出。
 */
function escapeJsLineTerminators(json) {
  let t = jsonStringify(json);
  return t === undefined
    ? undefined
    : t.replaceAll("\x85", "\\u0085").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}
//@ chunk-74vrtgsp.js:1248-1392 placement
function workflowsDisabledAtStartup() {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (latchedPreSettingsEnvSnapshot === undefined) return isWorkflowsEnvDisabled();
  return Object.keys(latchedPreSettingsEnvSnapshot).some(
    (key) =>
      key.toUpperCase() === "CLAUDE_CODE_DISABLE_WORKFLOWS" &&
      isEnvTruthy(latchedPreSettingsEnvSnapshot[key]),
  );
}
//@ chunk-74vrtgsp.js:1392-1552 placement
function adminDisabledWorkflows() {
  return getEveryMachineAdminTierSettings().some(
    (e) =>
      e.disableWorkflows === true ||
      Object.entries(e.env ?? {}).some(
        ([key, value]) => key.toUpperCase() === "CLAUDE_CODE_DISABLE_WORKFLOWS" && isEnvTruthy(value),
      ),
  );
}
//@ chunk-74vrtgsp.js:1552-1958 placement
/**
 * 代码审查因机器托管设置关闭工作流（或设置无法读取）而未运行时的提示文本。
 */
var ADMIN_DISABLED_REVIEW_TEXT =
  "Code review did not run: workflows are turned off in this machine's managed settings (`disableWorkflows`, or `CLAUDE_CODE_DISABLE_WORKFLOWS` in its `env` block). Ask this machine's administrator to allow it.";
var ADMIN_SETTINGS_UNREADABLE_TEXT =
  "Code review did not run: this machine's managed settings could not be read, so whether its administrator turned workflows off is not known. Ask this machine's administrator to fix them.";
//@ chunk-74vrtgsp.js:1958-2007 placement
/**
 * 审查会话因托管设置关闭工作流或设置不可读时的说明文案。
 */
function reviewWorkflowRefusalText() {
  if (adminDisabledWorkflows()) return ADMIN_DISABLED_REVIEW_TEXT;
  return isMachineAdminDocumentUnreadable() ? ADMIN_SETTINGS_UNREADABLE_TEXT : null;
}
//@ chunk-74vrtgsp.js:2007-2715 placement
/**
 * 判断工作流在本会话是否被禁止：启动时的环境变量、disableWorkflows 设置、组织策略，以及审查会话的托管设置；返回原因或 null。
 */
function workflowPolicyRefusal(opts) {
  if (workflowsDisabledAtStartup())
    return "dynamic workflows are disabled for this session (the environment variable `CLAUDE_CODE_DISABLE_WORKFLOWS` was set when Claude Code started).";
  let serverAuthored = opts?.serverAuthoredCarrier === true;
  if (serverAuthored && opts?.eventSessionOrigin === "review") return reviewWorkflowRefusalText();
  if (isWorkflowsConfiguredOff())
    return isWorkflowsEnvDisabled()
      ? "dynamic workflows are disabled for this session (the environment variable `CLAUDE_CODE_DISABLE_WORKFLOWS`, set after Claude Code started, for example by a settings `env` block)."
      : "dynamic workflows are disabled for this session (the `disableWorkflows` setting).";
  if (serverAuthored && opts?.eventSessionOrigin === undefined && isReviewSession())
    return reviewWorkflowRefusalText();
  if (!isWorkflowsPolicyAllowed())
    return "dynamic workflows are disabled for this session (org policy `allow_workflows`).";
  return null;
}
//@ chunk-74vrtgsp.js:2715-5650 placement
/**
 * 执行远程下发的工作流脚本：依次检查策略、脚本大小、控制字符、元数据解析、非确定性调用与编译，启动本地工作流运行并等待结束；完成时把结果序列化成一行 remote-workflow 结果（过长时逐级省略失败信息与结果），失败、被中止或状态异常时返回带层级的失败行。
 */
async function runRemoteWorkflow({
  script,
  args,
  telemetrySource,
  serverAuthoredCarrier = false,
  eventSessionOrigin,
  context,
}) {
  let fail = (s, policyRefusal) => ({
    ok: false,
    layer: s,
    line: remoteWorkflowErrorLine(s, policyRefusal),
  });
  let policyRefusal = workflowPolicyRefusal({
    serverAuthoredCarrier,
    eventSessionOrigin,
  });
  if (policyRefusal) return fail("policy-gate", policyRefusal);
  let maxScriptBytes = serverAuthoredCarrier ? MAX_SCRIPT_BUNDLE_BYTES : MAX_SCRIPT_FILE_BYTES;
  if (script.length > maxScriptBytes)
    return fail("script-too-large", `workflow script exceeds ${maxScriptBytes} bytes.`);
  if (!isAllPrintable(script))
    return fail("control-chars", "workflow script contains disallowed control characters.");
  let parsed = parseWorkflowScript(script, {
    maxBytes: maxScriptBytes,
  });
  if ("error" in parsed) return fail("meta-parse", `invalid workflow script: ${parsed.error}`);
  if (usesNondeterministicTime(parsed.scriptBody))
    return fail(
      "nondeterminism",
      "workflow scripts must be deterministic: Date.now()/Math.random()/new Date() are unavailable (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.",
    );
  let compiled = compileWorkflowScript(parsed.scriptBody);
  if (!compiled.ok) return fail("compile", `workflow script compile failed: ${compiled.error}`);
  let runId = `wf_${randomUUID().slice(0, 12)}`;
  let taskId = generateTaskId("local_workflow");
  let scriptPath = resolveWorkflowScriptPath(parsed.meta.name, runId, script, context.storageV5);
  let telemetryName = agentNameForTelemetry(parsed.meta.name, undefined, false);
  let telemetryDescription = agentLabelForTelemetry(parsed.meta.description, undefined, false);
  logEvent("tengu_workflow_launched", {
    invocation_mode: fromEnum(telemetrySource),
    workflow_source: fromEnum(telemetrySource),
    phase_count: parsed.meta.phases?.length ?? 0,
    launched_from_subagent: false,
    has_args: args != null,
    is_resume: false,
    script_size_chars: script.length,
  });
  let settled = await new Promise((resolve) => {
    launchWorkflowRun({
      taskId,
      workflowRunId: runId,
      script,
      scriptPath,
      args,
      meta: parsed.meta,
      vmScript: compiled.vmScript,
      toolUseContext: context,
      canUseTool: context.canUseTool ?? evaluateAskingNoHost,
      toolUseId: undefined,
      transcriptDir: subagentWorkflowDir(runId),
      telemetry: {
        source: telemetrySource,
        name: telemetryName,
        description: telemetryDescription,
        scriptIsVerbatimBuiltIn: false,
      },
      isResume: false,
      onSettled: resolve,
      suppressCompletionNotification: true,
      withholdScriptFromSdkEvents: serverAuthoredCarrier,
    });
  });
  switch (settled.status) {
    case "completed": {
      let json = {
        status: "completed",
        workflowName: parsed.meta.name,
        runId,
        agentCount: settled.agentCount,
        durationMs: settled.durationMs,
        failures: settled.failures,
        result: settled.result,
      };
      let r = escapeJsLineTerminators(json);
      if (r === undefined || r.length > REMOTE_WORKFLOW_SERIALIZED_MAX_CHARS) {
        let E =
          r === undefined
            ? "not serializable"
            : `${r.length} chars exceeds ${REMOTE_WORKFLOW_SERIALIZED_MAX_CHARS}`;
        let mapped = settled.failures
          .slice(0, 20)
          .map((failure) =>
            failure.length > 500 ? `${truncateToLength(failure, 500)}\u2026[truncated]` : failure,
          );
        if (settled.failures.length > mapped.length)
          mapped.push(`\u2026and ${settled.failures.length - mapped.length} more failures omitted`);
        r = escapeJsLineTerminators({
          ...json,
          failures: mapped,
        });
        if (r === undefined || r.length > REMOTE_WORKFLOW_SERIALIZED_MAX_CHARS)
          r = escapeJsLineTerminators({
            ...json,
            failures: [
              `<${settled.failures.length} failures omitted: diagnostics never outrank the result payload>`,
            ],
          });
        if (r === undefined || r.length > REMOTE_WORKFLOW_SERIALIZED_MAX_CHARS)
          r = escapeJsLineTerminators({
            ...json,
            failures: mapped,
            result: `<result omitted: ${E}>`,
          });
        if (r === undefined || r.length > REMOTE_WORKFLOW_SERIALIZED_MAX_CHARS)
          r =
            escapeJsLineTerminators({
              status: "completed",
              workflowName: truncateToLength(String(parsed.meta.name), 200),
              runId,
              agentCount: settled.agentCount,
              durationMs: settled.durationMs,
              failures: [
                `<${settled.failures.length} failures omitted: fallback exceeded ${REMOTE_WORKFLOW_SERIALIZED_MAX_CHARS}>`,
              ],
              result: `<result omitted: ${E}>`,
            }) ?? '{"status":"completed"}';
      }
      return {
        ok: true,
        line: `remote-workflow: ${r}`,
        workflowName: parsed.meta.name,
      };
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
export { runRemoteWorkflow, remoteWorkflowErrorLine, workflowPolicyRefusal };
