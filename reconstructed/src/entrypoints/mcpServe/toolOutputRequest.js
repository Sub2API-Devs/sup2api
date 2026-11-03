/**
 * entrypoints/mcpServe/toolOutputRequest.ts
 *
 * 2.1.316 新增。回答 mcp serve 的工具输出对象请求：协商版本、核对拒绝规则摘要、执行工具并编码输出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e3wfm0b3.js (33)
 * attribution: placement 33
 */
import { randomUUID } from "crypto";
import { nk } from "../../utils/subprocessEnvLoader.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import {
  ANTHROPIC_RETURNTOOLOUTPUT,
  Kfo,
  Gfo,
  r0n,
  LTs,
  parseReturnOutputRequest,
  jvr,
  DTs,
  OTs,
} from "../../services/remoteTools/returnToolOutput.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { rangeToAnnounce } from "../mcp/toolHostInterface.js";
import {
  Jje,
  Zde,
  strippedPrivilegeFieldsNote,
  parseServeModeInput,
  serveModeDefaultAppState,
} from "./serveModeInput.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { readCallerAsks, CALLER_ASKS_KEY, settlePlainCallAsk } from "./plainCallAsk.js";
import { addSessionWorkingDirectories } from "../../utils/permissions/PermissionUpdate.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { findToolByName } from "../../Tool.js";
import {
  sanitizeToolNameForAnalytics,
  getUnknownToolAnalyticsName,
} from "../../services/analytics/metadata.js";
import { buildRemoteToolCallResult } from "../../remote/tools/callResults.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../../remote/tools/protocolConstants.js";
import { servedTarget, encodeServedOutput } from "../../remote/tools/serve/servedOutput.js";
import { clipText } from "../../remote/tools/protocolSchemas.js";
import { formatZodValidationError, formatToolErrorMessage } from "../../utils/toolErrors.js";
import {
  checkRuleBasedPermissions,
  PERMISSION_CHECK_CRASHED_REASON,
  carriesAskRuleIntent,
  findSafetyCheckReason,
  flaggedPartMessage,
  hasPermissionsToUseTool,
} from "../../utils/permissions/permissions.js";
import { isAutoModeDenyCircuitBreaker, isBypassImmuneCircuitBreaker } from "../../types/permissions.js";
import { buildDangerousRemovalDenial, createAssistantMessage } from "../../utils/messages.js";
import { startPermissionRound, takePermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { LKe, classifyToolErrorCode } from "../../services/tools/toolExecution.js";
import { toError, withTelemetryMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { TOOL_HOST_INTERFACE_FEATURES } from "../../remote/tools/protocolNegotiation.js";
import { formatFileSize } from "../../utils/format.js";
import { MAX_PERSISTED_OUTPUT_BYTES } from "../../utils/task/diskOutput.js";
import { outputFilterHint } from "../../tools/shared/textSearchTools.js";
import { getMaxOutputLength } from "../../utils/shell/outputLimits.js";
import { Vhr } from "../../constants/outputLimits.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { truncateMiddle } from "../../memdir/memoryTool.js";

//@ chunk-e3wfm0b3.js:1351-1413 placement
function w() {
  return nk.CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT === !0;
}
//@ chunk-e3wfm0b3.js:1413-1462 placement
var b = new Set([
    BASH_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    GREP_TOOL_NAME,
    GLOB_TOOL_NAME,
  ]),
  x = 12582912;
//@ chunk-e3wfm0b3.js:1462-1530 placement
function toolOutputServerCapabilities(e, t) {
  let n = buildAnnouncedCapability(e, t);
  return n && { experimental: { [ANTHROPIC_RETURNTOOLOUTPUT]: n } };
}
//@ chunk-e3wfm0b3.js:1530-1778 placement
function buildAnnouncedCapability(e, t) {
  if (!w() || t === void 0) return;
  let n = C(e(), t);
  if (!Kfo(n.deny_rules)) {
    logFeatureBad("mcp_serve_tool_output", "deny_rules_over_bounds");
    return;
  }
  let o = Gfo() ? rangeToAnnounce() : void 0;
  return { ...n, ...(o !== void 0 && { tools: [...n.tools, ...Jje, MONITOR], tool_host_interface: o }) };
}
//@ chunk-e3wfm0b3.js:1778-1843 placement
function bringsToolHostPermissionRequest(e) {
  if (!I()) return !1;
  return r0n(isPlainObject(e) ? e[ANTHROPIC_RETURNTOOLOUTPUT] : void 0);
}
//@ chunk-e3wfm0b3.js:1843-1874 placement
function I() {
  return w() && Gfo();
}
//@ chunk-e3wfm0b3.js:1874-1954 placement
function C(e, t) {
  return LTs({ tools: E(e), denyRules: t.alwaysDenyRules.cliArg ?? [] });
}
/**
 * 回答 mcp serve 的工具输出对象请求：协商版本、核对拒绝规则摘要、执行工具并编码输出。
 */
//@ chunk-e3wfm0b3.js:1954-3012 placement
async function answerToolOutputRequest({
  name: e,
  args: args,
  meta: meta,
  tools: tools,
  launchPermissionContext: launchPermissionContext,
  newCall: newCall,
  startHeartbeat: startHeartbeat,
}) {
  let a = parseReturnOutputRequest(meta);
  if (a.kind === "absent") return;
  let i =
    readCallerAsks(meta).kind === "absent"
      ? checkToolOutputRequest(a, e, tools, launchPermissionContext)
      : p(
          "invalid_request",
          `${e} was not run: a call that carries _meta["${CALLER_ASKS_KEY}"] is answered only as a plain call. Call it without asking for its output object.`,
          "carries_asks_key",
        );
  if ("refusal" in i)
    return (
      logFeatureSad("mcp_serve_tool_output", i.reason, { tool: toolNameForAnalytics(e) }),
      refusedResult(i.refusal)
    );
  let { toolUseContext: toolUseContext, release: release } = newCall();
  try {
    let d = await runToolForOutput(
      i.tool,
      args,
      buildServedToolUseContext(toolUseContext, addSessionWorkingDirectories(i.launchPermissionContext)),
      startHeartbeat,
    );
    if (!toolUseContext.abortController.signal.aborted) {
      let O = toolNameForAnalytics(i.tool.name);
      if ("unsent" in d) logFeatureBad("mcp_serve_tool_output", d.unsent, { tool: O });
      else if (d.objection === "crashed_check")
        logFeatureBad("mcp_serve_tool_output", d.objection, { tool: O });
      else if (d.objection !== void 0) logFeatureSad("mcp_serve_tool_output", d.objection, { tool: O });
      else
        logFeatureOk("mcp_serve_tool_output", {
          tool: O,
          answer: fromEnum(d.answer),
          safety_ask_skipped: d.wasSafetyAskSkipped === !0,
          ...(d.wasOutputCut && { output_cut: !0 }),
          ...(d.diffLeftOut && { diff_left_out: fromEnum(d.diffLeftOut) }),
        });
    }
    return d.result;
  } finally {
    release();
  }
}
/**
 * 检查输出对象请求（协议版本、规则摘要等）
 */
//@ chunk-e3wfm0b3.js:3012-4881 placement
function checkToolOutputRequest(e, t, n, o) {
  if (!w())
    return p(
      "unsupported_protocol",
      `${t} was not run: this server is not set up to return output objects (CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT is not on). Call it without asking for its output object.`,
    );
  if (o === void 0)
    return p(
      "unsupported_protocol",
      `${t} was not run: this server holds no permission rules (CLAUDE_CODE_MCP_SERVE_SETTINGS was unset or empty when it started), and it returns output objects only for calls it can judge. Call it without asking for its output object.`,
      "no_launch_rules",
    );
  let { deny_rules: deny_rules } = C(n, o);
  if (!Kfo(deny_rules))
    return p(
      "unsupported_protocol",
      `${t} was not run: this server was launched with more or longer deny rules than it can advertise, so it returns no output objects. Call it without asking for its output object.`,
      "deny_rules_over_bounds",
    );
  if (e.kind === "malformed")
    return p(
      "invalid_request",
      `${t} was not run: _meta["${ANTHROPIC_RETURNTOOLOUTPUT}"] must be exactly { versions, deny_rules_digest }. versions: up to 64 whole numbers. deny_rules_digest: the SHA-256 of JSON.stringify(deny_rules), for the deny_rules this server advertises, as 64 lower-case hex characters.`,
    );
  if (e.kind === "no_shared_version")
    return p(
      "unsupported_protocol",
      `${t} was not run: this server returns output objects only in version ${jvr.join(", ")}, and the request lists ${e.versions.join(", ") || "none"}.`,
    );
  if (e.denyRulesDigest !== DTs(deny_rules))
    return p(
      "unsupported_protocol",
      `${t} was not run: the request's deny_rules_digest is not that of the deny_rules this server advertises. Reconnect and read them again.`,
      "deny_rules_digest_mismatch",
    );
  let r = findToolByName(n, t);
  if (r === void 0) return p("not_served", `${t} was not run: this server has no tool by that name.`);
  return b.has(t)
    ? { tool: r, launchPermissionContext: o }
    : p(
        "not_served",
        `${t} was not run: the tools this server answers with an output object are ${E(n).join(", ") || "none"}. Call it without asking for its output object.`,
      );
}
//@ chunk-e3wfm0b3.js:4881-4913 placement
function isAnsweredWithOutput(e) {
  return b.has(e);
}
//@ chunk-e3wfm0b3.js:4913-4975 placement
function E(e) {
  return e.map((t) => t.name).filter((t) => b.has(t));
}
//@ chunk-e3wfm0b3.js:4975-5032 placement
function toolNameForAnalytics(e) {
  return b.has(e) || Jje.has(e) ? sanitizeToolNameForAnalytics(e) : getUnknownToolAnalyticsName(e);
}
//@ chunk-e3wfm0b3.js:5032-5135 placement
function refusedResult(e) {
  return buildRemoteToolCallResult({
    envelope: { v: REMOTE_TOOL_PROTOCOL_VERSION, outcome: "refused", target: servedTarget(), ...e },
    content: clipText(e.message),
  });
}
//@ chunk-e3wfm0b3.js:5135-5315 placement
function acknowledgedResult(e) {
  return buildRemoteToolCallResult({
    envelope: { v: REMOTE_TOOL_PROTOCOL_VERSION, outcome: "acknowledged", target: servedTarget(), ask_id: e },
    content: "Nothing was run: the permission question was answered with a no, or taken back.",
  });
}
//@ chunk-e3wfm0b3.js:5315-5379 placement
function p(e, t, n = e) {
  return { refusal: { code: e, message: t }, reason: n };
}
/**
 * 校验并执行工具，返回输出对象
 */
//@ chunk-e3wfm0b3.js:5379-5762 placement
async function runToolForOutput(e, t, n, o) {
  let s = { ...t },
    filtered = Zde.filter((h) => h in s),
    u = filtered.length > 0 ? [strippedPrivilegeFieldsNote(filtered)] : [],
    a = await validateToolCallInput(e, s, n);
  if ("rejection" in a)
    return {
      result: completedError(a.rejection, objectionToAnswer(a.objection), u),
      answer: "not_run",
      objection: a.objection,
    };
  let i = await ranTool(e, a.input, n, o);
  return {
    ...("failure" in i
      ? { result: completedError(i.failure, "ran", u), answer: "tool_failed" }
      : outputAnswer(e, i.data, u)),
    wasSafetyAskSkipped: a.wasSafetyAskSkipped,
  };
}
/**
 * 检查工具启用与输入校验
 */
//@ chunk-e3wfm0b3.js:5762-6217 placement
async function validateToolCallInput(e, t, n) {
  try {
    if (!e.isEnabled()) return { rejection: `Tool ${e.name} is not enabled` };
    let o = parseServeModeInput(e, t);
    if (!o.success)
      return { rejection: `InputValidationError: ${formatZodValidationError(e.name, o.error)}` };
    let s = await e.validateInput?.(o.data, n);
    if (s !== void 0 && !s.result)
      return { rejection: s.message, ...(s.deniedByPermissionRule === !0 && { objection: "deny_rule" }) };
    let r = await runSafetyCheck(e, o.data, n);
    return "rejection" in r ? r : { input: o.data, ...r };
  } catch (error) {
    return (logUnexpectedThrow(e, error), { rejection: formatToolErrorMessage(error) });
  }
}
/**
 * 为远端调用构造工具上下文（标记来自其他机器、挂起沙箱自动允许）
 */
//@ chunk-e3wfm0b3.js:6217-6391 placement
function buildServedToolUseContext(e, t) {
  let n = { ...serveModeDefaultAppState(), toolPermissionContext: { ...t, sandboxAutoAllowSuspended: !0 } };
  return { ...e, inputFromAnotherMachine: !0, toolUseId: `toolu_${randomUUID()}`, getAppState: () => n };
}
/**
 * 运行工具权限检查并处理崩溃
 */
//@ chunk-e3wfm0b3.js:6391-7523 placement
async function runSafetyCheck(e, t, n) {
  let o = await checkRuleBasedPermissions(e, t, n, { crashIsObjection: !0 }).catch((u) => {
    if (n.abortController.signal.aborted) throw u;
    return (logUnexpectedThrow(e, u), "crashed");
  });
  if (o === null) return { wasSafetyAskSkipped: !1 };
  if (
    o === "crashed" ||
    (o.decisionReason?.type === "other" && o.decisionReason.reason === PERMISSION_CHECK_CRASHED_REASON)
  )
    return {
      rejection: `${e.name} was not run: the permission rules could not be evaluated for this call (internal error).`,
      objection: "crashed_check",
    };
  if (o.behavior === "deny") return { rejection: o.message, objection: "deny_rule" };
  if (carriesAskRuleIntent(o))
    return {
      rejection: `${e.name} was not run: a permission rule says to ask a person before a call like this one, and a call that runs in this environment cannot ask. Retrying won't help while that rule is in effect.`,
      objection: "ask_rule",
    };
  let s = findSafetyCheckReason(o.decisionReason, isAutoModeDenyCircuitBreaker);
  if (s !== void 0)
    return { rejection: buildDangerousRemovalDenial(flaggedPartMessage(o, s)), objection: "circuit_breaker" };
  let r = findSafetyCheckReason(o.decisionReason, isBypassImmuneCircuitBreaker) !== void 0;
  return !r && findSafetyCheckReason(o.decisionReason) !== void 0
    ? { wasSafetyAskSkipped: !0, ask: o }
    : {
        rejection: `${e.name} was not run: ${o.message} A call that runs in this environment cannot put that to a person. Retrying won't help.`,
        objection: r ? "circuit_breaker" : "other_ask",
      };
}
//@ chunk-e3wfm0b3.js:7523-8323 placement
async function checkPlainCall(e, t, n, o, s) {
  if (o === void 0) return { toolUseContext: n };
  let r = { ...buildServedToolUseContext(n, o), inputFromAnotherMachine: n.inputFromAnotherMachine },
    { toolUseId: toolUseId } = r,
    a =
      toolUseId === void 0
        ? void 0
        : { toolUseId: toolUseId, opened: startPermissionRound(r, toolUseId, e.name) },
    i = await runSafetyCheck(e, t, { ...r, permissionPhase: void 0, permissionRound: a?.opened }).catch(
      (y) => {
        if (a) takePermissionRecord(r, a.toolUseId, a.opened);
        throw y;
      },
    ),
    h = (a && takePermissionRecord(r, a.toolUseId, a.opened)) ?? {};
  if (!("rejection" in i)) {
    let y = await settlePlainCallAsk(s, e, t, r.session, i.ask);
    if (y !== "run" && y !== "as_without_the_key") return y;
    return (
      logFeatureOk(
        "mcp_serve_plain_call",
        y === "run"
          ? { safety_ask_skipped: !1, caller_attested: !0 }
          : { safety_ask_skipped: i.wasSafetyAskSkipped },
      ),
      { toolUseContext: { ...r, permissionPhase: h } }
    );
  }
  if (i.objection === "crashed_check") logFeatureBad("mcp_serve_plain_call", i.objection);
  else logFeatureSad("mcp_serve_plain_call", i.objection);
  return { rejection: i.rejection };
}
/**
 * 权限异议映射为回答类别
 */
//@ chunk-e3wfm0b3.js:8323-8529 placement
function objectionToAnswer(e) {
  switch (e) {
    case void 0:
      return "validation_failed";
    case "ask_rule":
    case "circuit_breaker":
    case "other_ask":
      return "ask_refused_no_surface";
    case "deny_rule":
    case "crashed_check":
      return "denied_by_rule";
  }
}
//@ chunk-e3wfm0b3.js:8529-8759 placement
async function ranTool(e, t, n, o, s = hasPermissionsToUseTool, r = !1, u = !1) {
  using a = o();
  try {
    return await e.call(t, n, s, createAssistantMessage({ content: [] }), void 0, {
      gitDiffRead: !0,
      ...(r && { callerLogsSharedEvents: r }),
      ...(u && { smallResultAsked: u }),
    });
  } catch (error) {
    return (logUnexpectedThrow(e, error), { failure: formatToolErrorMessage(error) });
  }
}
//@ chunk-e3wfm0b3.js:8759-8889 placement
function logUnexpectedThrow(e, t) {
  if (LKe(t) || classifyToolErrorCode(t).isSad) return;
  let n = toError(t);
  logError("telemetryMessage" in n ? n : withTelemetryMessage(n, `mcp server tool '${e.name}' threw`));
}
//@ chunk-e3wfm0b3.js:8889-9337 placement
function outputAnswer(e, t, n, o) {
  try {
    let s = buildOutputVariants(e, t, o);
    for (let [r, { output: u, ...a }] of s.entries())
      try {
        let i = encodeServedOutput(
          `${e.name} ran. Its output is in this answer's structured content.`,
          u,
          !1,
          n,
        );
        if (Buffer.byteLength(jsonStringify(i), "utf8") <= x)
          return {
            ...a,
            result: i,
            answer: "output",
            ...(hasPersistedBashOutput(e, t) && { wasOutputCut: !0 }),
          };
      } catch (error) {
        if (r === s.length - 1) throw error;
        k(e, error, " in one form, so a smaller one is tried");
      }
    return unsentResult(e, "result_too_large", n);
  } catch (error) {
    return (k(e, error, ""), unsentResult(e, "result_unbuildable", n));
  }
}
//@ chunk-e3wfm0b3.js:9337-9429 placement
function k(e, t, n) {
  logError(withTelemetryMessage(toError(t), `mcp server tool '${e.name}' output could not be encoded${n}`));
}
/**
 * 生成工具输出对象的若干裁剪版本
 */
//@ chunk-e3wfm0b3.js:9429-10018 placement
function buildOutputVariants(e, t, n) {
  if (e.name === FILE_WRITE_TOOL_NAME && isPlainObject(t))
    return withDiffLeftOutVariants(t, [{ output: toolOutputForWire(e, t) }]);
  if (e.name !== FILE_EDIT_TOOL_NAME || !isPlainObject(t)) return [{ output: toolOutputForWire(e, t) }];
  let o = { ...t, originalFile: null };
  if (typeof t.originalFile !== "string" || n === void 0) return withDiffLeftOutVariants(t, [{ output: o }]);
  if (n.isSubagent)
    return withDiffLeftOutVariants(t, [{ output: o, originalFileLeftOutReason: "for_subagent" }]);
  if (n.sessionVersion < TOOL_HOST_INTERFACE_FEATURES.editOriginalFile)
    return withDiffLeftOutVariants(t, [{ output: o, originalFileLeftOutReason: "older_session" }]);
  return withDiffLeftOutVariants(
    t,
    Buffer.byteLength(t.originalFile, "utf8") > OTs
      ? [{ output: o, originalFileLeftOutReason: "over_limit" }]
      : [{ output: t }, { output: o, originalFileLeftOutReason: "answer_too_large" }],
  );
}
/**
 * 加上去掉 gitDiff 的变体
 */
//@ chunk-e3wfm0b3.js:10018-10258 placement
function withDiffLeftOutVariants(e, t) {
  let n =
    e.gitDiff === void 0
      ? []
      : t.map((o) => ({ ...o, output: P(o.output, { gitDiff: void 0 }), diffLeftOut: "git_diff" }));
  return [
    ...t,
    ...n,
    {
      ...t.at(-1),
      output: { ...e, gitDiff: void 0, structuredPatch: [], originalFile: null },
      diffLeftOut: "all",
    },
  ];
}
/**
 * 输出对象转可发送形式（截断说明）
 */
//@ chunk-e3wfm0b3.js:10258-10922 placement
function toolOutputForWire(e, t) {
  if (hasPersistedBashOutput(e, t)) {
    let persistedOutputSize = t.persistedOutputSize,
      o =
        typeof persistedOutputSize === "number"
          ? `the command printed ${formatFileSize(persistedOutputSize)}; `
          : "",
      s =
        typeof persistedOutputSize === "number" && persistedOutputSize >= MAX_PERSISTED_OUTPUT_BYTES
          ? `The first ${formatFileSize(MAX_PERSISTED_OUTPUT_BYTES)} of the command's output are`
          : "The command's whole output is",
      r = `(output truncated: ${o}only the start was returned, and a saved copy of this result holds only that start. ${s} in the file ${t.persistedOutputPath}. If the file is gone, run the command again with ${outputFilterHint(e.name)}, if that is safe.)
`,
      u = Math.max(getMaxOutputLength(), Vhr) - r.length;
    return { ...t, stdout: `${r}${truncateToLength(t.stdout, u)}` };
  }
  switch (e.name) {
    case FILE_WRITE_TOOL_NAME:
      return e.stripForStorage?.(t) ?? t;
    case NOTEBOOK_EDIT_TOOL_NAME:
      return P(t, { original_file: "", updated_file: "" });
    default:
      return t;
  }
}
//@ chunk-e3wfm0b3.js:10922-11040 placement
function hasPersistedBashOutput(e, t) {
  return (
    e.name === BASH_TOOL_NAME &&
    isPlainObject(t) &&
    typeof t.stdout === "string" &&
    Boolean(t.persistedOutputPath) &&
    t.isImage !== !0
  );
}
//@ chunk-e3wfm0b3.js:11040-11083 placement
function P(e, t) {
  return isPlainObject(e) ? { ...e, ...t } : e;
}
/**
 * 结果无法回传时的说明
 */
//@ chunk-e3wfm0b3.js:11083-11235 placement
function unsentResult(e, t, n) {
  return {
    result: failedResult(
      `${e.name} ran, but its result could not be sent back. Check what it changed before running it again.`,
      n,
    ),
    unsent: t,
  };
}
//@ chunk-e3wfm0b3.js:11235-11379 placement
function failedResult(e, t) {
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      target: servedTarget(),
      code: "internal_error",
      message: e,
      ...(t.length > 0 && { notes: t }),
    },
    content: e,
  });
}
//@ chunk-e3wfm0b3.js:11379-11544 placement
function completedError(e, t, n) {
  let o = truncateMiddle(e);
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      target: servedTarget(),
      is_error: !0,
      content: o,
      disposition: t,
      ...(n.length > 0 && { notes: n }),
    },
    content: o,
  });
}

export {
  completedError,
  bringsToolHostPermissionRequest,
  toolNameForAnalytics,
  acknowledgedResult,
  buildAnnouncedCapability,
  refusedResult,
  isAnsweredWithOutput,
  logUnexpectedThrow,
  failedResult,
  ranTool,
  outputAnswer,
};
