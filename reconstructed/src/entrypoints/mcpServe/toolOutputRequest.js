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
import { toolServerEnvAccessor } from "../../utils/subprocessEnvLoader.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import {
  ANTHROPIC_RETURNTOOLOUTPUT,
  validateDenyRules,
  isReturnOutputSupported,
  hasToolHostInterface,
  buildReturnToolOutputPayload,
  parseReturnOutputRequest,
  SUPPORTED_RETURN_OUTPUT_VERSIONS,
  hashJsonSha256,
  MAX_RETURNED_OUTPUT_BYTES,
} from "../../services/remoteTools/returnToolOutput.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { rangeToAnnounce } from "../mcp/toolHostInterface.js";
import {
  SERVE_MODE_KEYS,
  SERVE_MODE_VALUE,
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
import { isAbortOrCancelError, classifyToolErrorCode } from "../../services/tools/toolExecution.js";
import { toError, withTelemetryMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { TOOL_HOST_INTERFACE_FEATURES } from "../../remote/tools/protocolNegotiation.js";
import { formatFileSize } from "../../utils/format.js";
import { MAX_PERSISTED_OUTPUT_BYTES } from "../../utils/task/diskOutput.js";
import { outputFilterHint } from "../../tools/shared/textSearchTools.js";
import { getMaxOutputLength } from "../../utils/shell/outputLimits.js";
import { MIN_MAX_OUTPUT_LENGTH } from "../../constants/outputLimits.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { truncateMiddle } from "../../memdir/memoryTool.js";

//@ chunk-e3wfm0b3.js:1351-1413 placement
function isToolOutputEnvOn() {
  return toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT === true;
}
//@ chunk-e3wfm0b3.js:1413-1462 placement
var OUTPUT_CAPABLE_TOOLS = new Set([
  BASH_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  GREP_TOOL_NAME,
  GLOB_TOOL_NAME,
]);
var MAX_TOOL_OUTPUT_BYTES = 12582912;
//@ chunk-e3wfm0b3.js:1462-1530 placement
function toolOutputServerCapabilities(e, t) {
  let announcedCapability = buildAnnouncedCapability(e, t);
  return (
    announcedCapability && {
      experimental: {
        [ANTHROPIC_RETURNTOOLOUTPUT]: announcedCapability,
      },
    }
  );
}
//@ chunk-e3wfm0b3.js:1530-1778 placement
function buildAnnouncedCapability(e, t) {
  if (!isToolOutputEnvOn() || t === undefined) return;
  let n = classifyToolsForOutput(e(), t);
  if (!validateDenyRules(n.deny_rules)) {
    logFeatureBad("mcp_serve_tool_output", "deny_rules_over_bounds");
    return;
  }
  let o = isReturnOutputSupported() ? rangeToAnnounce() : undefined;
  return {
    ...n,
    ...(o !== undefined && {
      tools: [...n.tools, ...SERVE_MODE_KEYS, MONITOR],
      tool_host_interface: o,
    }),
  };
}
//@ chunk-e3wfm0b3.js:1778-1843 placement
function bringsToolHostPermissionRequest(meta) {
  if (!isToolOutputRequested()) return false;
  return hasToolHostInterface(isPlainObject(meta) ? meta[ANTHROPIC_RETURNTOOLOUTPUT] : undefined);
}
//@ chunk-e3wfm0b3.js:1843-1874 placement
function isToolOutputRequested() {
  return isToolOutputEnvOn() && isReturnOutputSupported();
}
//@ chunk-e3wfm0b3.js:1874-1954 placement
function classifyToolsForOutput(e, t) {
  return buildReturnToolOutputPayload({
    tools: outputCapableToolNames(e),
    denyRules: t.alwaysDenyRules.cliArg ?? [],
  });
}
//@ chunk-e3wfm0b3.js:1954-3012 placement
/**
 * 回答 mcp serve 的工具输出对象请求：协商版本、核对拒绝规则摘要、执行工具并编码输出。
 */
async function answerToolOutputRequest({
  name: e,
  args,
  meta,
  tools,
  launchPermissionContext,
  newCall,
  startHeartbeat,
}) {
  let returnOutputRequest = parseReturnOutputRequest(meta);
  if (returnOutputRequest.kind === "absent") return;
  let i =
    readCallerAsks(meta).kind === "absent"
      ? checkToolOutputRequest(returnOutputRequest, e, tools, launchPermissionContext)
      : refusalResult(
          "invalid_request",
          `${e} was not run: a call that carries _meta["${CALLER_ASKS_KEY}"] is answered only as a plain call. Call it without asking for its output object.`,
          "carries_asks_key",
        );
  if ("refusal" in i) {
    logFeatureSad("mcp_serve_tool_output", i.reason, {
      tool: toolNameForAnalytics(e),
    });
    return refusedResult(i.refusal);
  }
  let { toolUseContext, release } = newCall();
  try {
    let d = await runToolForOutput(
      i.tool,
      args,
      buildServedToolUseContext(toolUseContext, addSessionWorkingDirectories(i.launchPermissionContext)),
      startHeartbeat,
    );
    if (!toolUseContext.abortController.signal.aborted) {
      let tool = toolNameForAnalytics(i.tool.name);
      if ("unsent" in d)
        logFeatureBad("mcp_serve_tool_output", d.unsent, {
          tool,
        });
      else if (d.objection === "crashed_check")
        logFeatureBad("mcp_serve_tool_output", d.objection, {
          tool,
        });
      else if (d.objection !== undefined)
        logFeatureSad("mcp_serve_tool_output", d.objection, {
          tool,
        });
      else
        logFeatureOk("mcp_serve_tool_output", {
          tool,
          answer: fromEnum(d.answer),
          safety_ask_skipped: d.wasSafetyAskSkipped === true,
          ...(d.wasOutputCut && {
            output_cut: true,
          }),
          ...(d.diffLeftOut && {
            diff_left_out: fromEnum(d.diffLeftOut),
          }),
        });
    }
    return d.result;
  } finally {
    release();
  }
}
//@ chunk-e3wfm0b3.js:3012-4881 placement
/**
 * 检查输出对象请求（协议版本、规则摘要等）
 */
function checkToolOutputRequest(returnOutputRequest, t, tools, launchPermissionContext) {
  if (!isToolOutputEnvOn())
    return refusalResult(
      "unsupported_protocol",
      `${t} was not run: this server is not set up to return output objects (CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT is not on). Call it without asking for its output object.`,
    );
  if (launchPermissionContext === undefined)
    return refusalResult(
      "unsupported_protocol",
      `${t} was not run: this server holds no permission rules (CLAUDE_CODE_MCP_SERVE_SETTINGS was unset or empty when it started), and it returns output objects only for calls it can judge. Call it without asking for its output object.`,
      "no_launch_rules",
    );
  let { deny_rules: denyRules } = classifyToolsForOutput(tools, launchPermissionContext);
  if (!validateDenyRules(denyRules))
    return refusalResult(
      "unsupported_protocol",
      `${t} was not run: this server was launched with more or longer deny rules than it can advertise, so it returns no output objects. Call it without asking for its output object.`,
      "deny_rules_over_bounds",
    );
  if (returnOutputRequest.kind === "malformed")
    return refusalResult(
      "invalid_request",
      `${t} was not run: _meta["${ANTHROPIC_RETURNTOOLOUTPUT}"] must be exactly { versions, deny_rules_digest }. versions: up to 64 whole numbers. deny_rules_digest: the SHA-256 of JSON.stringify(deny_rules), for the deny_rules this server advertises, as 64 lower-case hex characters.`,
    );
  if (returnOutputRequest.kind === "no_shared_version")
    return refusalResult(
      "unsupported_protocol",
      `${t} was not run: this server returns output objects only in version ${SUPPORTED_RETURN_OUTPUT_VERSIONS.join(", ")}, and the request lists ${returnOutputRequest.versions.join(", ") || "none"}.`,
    );
  if (returnOutputRequest.denyRulesDigest !== hashJsonSha256(denyRules))
    return refusalResult(
      "unsupported_protocol",
      `${t} was not run: the request's deny_rules_digest is not that of the deny_rules this server advertises. Reconnect and read them again.`,
      "deny_rules_digest_mismatch",
    );
  let toolByName = findToolByName(tools, t);
  if (toolByName === undefined)
    return refusalResult("not_served", `${t} was not run: this server has no tool by that name.`);
  return OUTPUT_CAPABLE_TOOLS.has(t)
    ? {
        tool: toolByName,
        launchPermissionContext,
      }
    : refusalResult(
        "not_served",
        `${t} was not run: the tools this server answers with an output object are ${outputCapableToolNames(tools).join(", ") || "none"}. Call it without asking for its output object.`,
      );
}
//@ chunk-e3wfm0b3.js:4881-4913 placement
function isAnsweredWithOutput(e) {
  return OUTPUT_CAPABLE_TOOLS.has(e);
}
//@ chunk-e3wfm0b3.js:4913-4975 placement
function outputCapableToolNames(e) {
  return e.map((t) => t.name).filter((t) => OUTPUT_CAPABLE_TOOLS.has(t));
}
//@ chunk-e3wfm0b3.js:4975-5032 placement
function toolNameForAnalytics(name) {
  return OUTPUT_CAPABLE_TOOLS.has(name) || SERVE_MODE_KEYS.has(name)
    ? sanitizeToolNameForAnalytics(name)
    : getUnknownToolAnalyticsName(name);
}
//@ chunk-e3wfm0b3.js:5032-5135 placement
function refusedResult(e) {
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      target: servedTarget(),
      ...e,
    },
    content: clipText(e.message),
  });
}
//@ chunk-e3wfm0b3.js:5135-5315 placement
function acknowledgedResult(askId) {
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "acknowledged",
      target: servedTarget(),
      ask_id: askId,
    },
    content: "Nothing was run: the permission question was answered with a no, or taken back.",
  });
}
//@ chunk-e3wfm0b3.js:5315-5379 placement
function refusalResult(e, message, reason = e) {
  return {
    refusal: {
      code: e,
      message,
    },
    reason,
  };
}
//@ chunk-e3wfm0b3.js:5379-5762 placement
/**
 * 校验并执行工具，返回输出对象
 */
async function runToolForOutput(tool, t, servedToolUseContext, startHeartbeat) {
  let s = {
    ...t,
  };
  let filtered = SERVE_MODE_VALUE.filter((h) => h in s);
  let u = filtered.length > 0 ? [strippedPrivilegeFieldsNote(filtered)] : [];
  let a = await validateToolCallInput(tool, s, servedToolUseContext);
  if ("rejection" in a)
    return {
      result: completedError(a.rejection, objectionToAnswer(a.objection), u),
      answer: "not_run",
      objection: a.objection,
    };
  let i = await ranTool(tool, a.input, servedToolUseContext, startHeartbeat);
  return {
    ...("failure" in i
      ? {
          result: completedError(i.failure, "ran", u),
          answer: "tool_failed",
        }
      : outputAnswer(tool, i.data, u)),
    wasSafetyAskSkipped: a.wasSafetyAskSkipped,
  };
}
//@ chunk-e3wfm0b3.js:5762-6217 placement
/**
 * 检查工具启用与输入校验
 */
async function validateToolCallInput(e, t, n) {
  try {
    if (!e.isEnabled())
      return {
        rejection: `Tool ${e.name} is not enabled`,
      };
    let serveModeInput = parseServeModeInput(e, t);
    if (!serveModeInput.success)
      return {
        rejection: `InputValidationError: ${formatZodValidationError(e.name, serveModeInput.error)}`,
      };
    let s = await e.validateInput?.(serveModeInput.data, n);
    if (s !== undefined && !s.result)
      return {
        rejection: s.message,
        ...(s.deniedByPermissionRule === true && {
          objection: "deny_rule",
        }),
      };
    let r = await runSafetyCheck(e, serveModeInput.data, n);
    return "rejection" in r
      ? r
      : {
          input: serveModeInput.data,
          ...r,
        };
  } catch (error) {
    logUnexpectedThrow(e, error);
    return {
      rejection: formatToolErrorMessage(error),
    };
  }
}
//@ chunk-e3wfm0b3.js:6217-6391 placement
/**
 * 为远端调用构造工具上下文（标记来自其他机器、挂起沙箱自动允许）
 */
function buildServedToolUseContext(e, t) {
  let n = {
    ...serveModeDefaultAppState(),
    toolPermissionContext: {
      ...t,
      sandboxAutoAllowSuspended: true,
    },
  };
  return {
    ...e,
    inputFromAnotherMachine: true,
    toolUseId: `toolu_${randomUUID()}`,
    getAppState: () => n,
  };
}
//@ chunk-e3wfm0b3.js:6391-7523 placement
/**
 * 运行工具权限检查并处理崩溃
 */
async function runSafetyCheck(e, t, n) {
  let o = await checkRuleBasedPermissions(e, t, n, {
    crashIsObjection: true,
  }).catch((error) => {
    if (n.abortController.signal.aborted) throw error;
    logUnexpectedThrow(e, error);
    return "crashed";
  });
  if (o === null)
    return {
      wasSafetyAskSkipped: false,
    };
  if (
    o === "crashed" ||
    (o.decisionReason?.type === "other" && o.decisionReason.reason === PERMISSION_CHECK_CRASHED_REASON)
  )
    return {
      rejection: `${e.name} was not run: the permission rules could not be evaluated for this call (internal error).`,
      objection: "crashed_check",
    };
  if (o.behavior === "deny")
    return {
      rejection: o.message,
      objection: "deny_rule",
    };
  if (carriesAskRuleIntent(o))
    return {
      rejection: `${e.name} was not run: a permission rule says to ask a person before a call like this one, and a call that runs in this environment cannot ask. Retrying won't help while that rule is in effect.`,
      objection: "ask_rule",
    };
  let safetyCheckReason = findSafetyCheckReason(o.decisionReason, isAutoModeDenyCircuitBreaker);
  if (safetyCheckReason !== undefined)
    return {
      rejection: buildDangerousRemovalDenial(flaggedPartMessage(o, safetyCheckReason)),
      objection: "circuit_breaker",
    };
  let r = findSafetyCheckReason(o.decisionReason, isBypassImmuneCircuitBreaker) !== undefined;
  return !r && findSafetyCheckReason(o.decisionReason) !== undefined
    ? {
        wasSafetyAskSkipped: true,
        ask: o,
      }
    : {
        rejection: `${e.name} was not run: ${o.message} A call that runs in this environment cannot put that to a person. Retrying won't help.`,
        objection: r ? "circuit_breaker" : "other_ask",
      };
}
//@ chunk-e3wfm0b3.js:7523-8323 placement
async function checkPlainCall(e, t, n, o, s) {
  if (o === undefined)
    return {
      toolUseContext: n,
    };
  let r = {
    ...buildServedToolUseContext(n, o),
    inputFromAnotherMachine: n.inputFromAnotherMachine,
  };
  let { toolUseId } = r;
  let a =
    toolUseId === undefined
      ? undefined
      : {
          toolUseId,
          opened: startPermissionRound(r, toolUseId, e.name),
        };
  let i = await runSafetyCheck(e, t, {
    ...r,
    permissionPhase: undefined,
    permissionRound: a?.opened,
  }).catch((error) => {
    if (a) takePermissionRecord(r, a.toolUseId, a.opened);
    throw error;
  });
  let permissionPhase = (a && takePermissionRecord(r, a.toolUseId, a.opened)) ?? {};
  if (!("rejection" in i)) {
    let y = await settlePlainCallAsk(s, e, t, r.session, i.ask);
    if (y !== "run" && y !== "as_without_the_key") return y;
    logFeatureOk(
      "mcp_serve_plain_call",
      y === "run"
        ? {
            safety_ask_skipped: false,
            caller_attested: true,
          }
        : {
            safety_ask_skipped: i.wasSafetyAskSkipped,
          },
    );
    return {
      toolUseContext: {
        ...r,
        permissionPhase,
      },
    };
  }
  if (i.objection === "crashed_check") logFeatureBad("mcp_serve_plain_call", i.objection);
  else logFeatureSad("mcp_serve_plain_call", i.objection);
  return {
    rejection: i.rejection,
  };
}
//@ chunk-e3wfm0b3.js:8323-8529 placement
/**
 * 权限异议映射为回答类别
 */
function objectionToAnswer(objection) {
  switch (objection) {
    case undefined:
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
async function ranTool(e, t, n, o, denyNestedPermissionAsk = hasPermissionsToUseTool, r = false, u = false) {
  using a = o();
  try {
    return await e.call(
      t,
      n,
      denyNestedPermissionAsk,
      createAssistantMessage({
        content: [],
      }),
      undefined,
      {
        gitDiffRead: true,
        ...(r && {
          callerLogsSharedEvents: r,
        }),
        ...(u && {
          smallResultAsked: u,
        }),
      },
    );
  } catch (error) {
    logUnexpectedThrow(e, error);
    return {
      failure: formatToolErrorMessage(error),
    };
  }
}
//@ chunk-e3wfm0b3.js:8759-8889 placement
function logUnexpectedThrow(e, error) {
  if (isAbortOrCancelError(error) || classifyToolErrorCode(error).isSad) return;
  let error_2 = toError(error);
  logError(
    "telemetryMessage" in error_2
      ? error_2
      : withTelemetryMessage(error_2, `mcp server tool '${e.name}' threw`),
  );
}
//@ chunk-e3wfm0b3.js:8889-9337 placement
function outputAnswer(e, t, n, o) {
  try {
    let outputVariants = buildOutputVariants(e, t, o);
    for (let [r, { output, ...a }] of outputVariants.entries())
      try {
        let i = encodeServedOutput(
          `${e.name} ran. Its output is in this answer's structured content.`,
          output,
          false,
          n,
        );
        if (Buffer.byteLength(jsonStringify(i), "utf8") <= MAX_TOOL_OUTPUT_BYTES)
          return {
            ...a,
            result: i,
            answer: "output",
            ...(hasPersistedBashOutput(e, t) && {
              wasOutputCut: true,
            }),
          };
      } catch (error) {
        if (r === outputVariants.length - 1) throw error;
        logEncodeFailure(e, error, " in one form, so a smaller one is tried");
      }
    return unsentResult(e, "result_too_large", n);
  } catch (error) {
    logEncodeFailure(e, error, "");
    return unsentResult(e, "result_unbuildable", n);
  }
}
//@ chunk-e3wfm0b3.js:9337-9429 placement
function logEncodeFailure(e, error, n) {
  logError(
    withTelemetryMessage(toError(error), `mcp server tool '${e.name}' output could not be encoded${n}`),
  );
}
//@ chunk-e3wfm0b3.js:9429-10018 placement
/**
 * 生成工具输出对象的若干裁剪版本
 */
function buildOutputVariants(e, t, n) {
  if (e.name === FILE_WRITE_TOOL_NAME && isPlainObject(t))
    return withDiffLeftOutVariants(t, [
      {
        output: toolOutputForWire(e, t),
      },
    ]);
  if (e.name !== FILE_EDIT_TOOL_NAME || !isPlainObject(t))
    return [
      {
        output: toolOutputForWire(e, t),
      },
    ];
  let output = {
    ...t,
    originalFile: null,
  };
  if (typeof t.originalFile !== "string" || n === undefined)
    return withDiffLeftOutVariants(t, [
      {
        output,
      },
    ]);
  if (n.isSubagent)
    return withDiffLeftOutVariants(t, [
      {
        output,
        originalFileLeftOutReason: "for_subagent",
      },
    ]);
  if (n.sessionVersion < TOOL_HOST_INTERFACE_FEATURES.editOriginalFile)
    return withDiffLeftOutVariants(t, [
      {
        output,
        originalFileLeftOutReason: "older_session",
      },
    ]);
  return withDiffLeftOutVariants(
    t,
    Buffer.byteLength(t.originalFile, "utf8") > MAX_RETURNED_OUTPUT_BYTES
      ? [
          {
            output,
            originalFileLeftOutReason: "over_limit",
          },
        ]
      : [
          {
            output: t,
          },
          {
            output,
            originalFileLeftOutReason: "answer_too_large",
          },
        ],
  );
}
//@ chunk-e3wfm0b3.js:10018-10258 placement
/**
 * 加上去掉 gitDiff 的变体
 */
function withDiffLeftOutVariants(e, t) {
  let n =
    e.gitDiff === undefined
      ? []
      : t.map((o) => ({
          ...o,
          output: mergeIfObject(o.output, {
            gitDiff: undefined,
          }),
          diffLeftOut: "git_diff",
        }));
  return [
    ...t,
    ...n,
    {
      ...t.at(-1),
      output: {
        ...e,
        gitDiff: undefined,
        structuredPatch: [],
        originalFile: null,
      },
      diffLeftOut: "all",
    },
  ];
}
//@ chunk-e3wfm0b3.js:10258-10922 placement
/**
 * 输出对象转可发送形式（截断说明）
 */
function toolOutputForWire(e, t) {
  if (hasPersistedBashOutput(e, t)) {
    let persistedOutputSize = t.persistedOutputSize;
    let o =
      typeof persistedOutputSize === "number"
        ? `the command printed ${formatFileSize(persistedOutputSize)}; `
        : "";
    let s =
      typeof persistedOutputSize === "number" && persistedOutputSize >= MAX_PERSISTED_OUTPUT_BYTES
        ? `The first ${formatFileSize(MAX_PERSISTED_OUTPUT_BYTES)} of the command's output are`
        : "The command's whole output is";
    let r = `(output truncated: ${o}only the start was returned, and a saved copy of this result holds only that start. ${s} in the file ${t.persistedOutputPath}. If the file is gone, run the command again with ${outputFilterHint(e.name)}, if that is safe.)
`;
    let u = Math.max(getMaxOutputLength(), MIN_MAX_OUTPUT_LENGTH) - r.length;
    return {
      ...t,
      stdout: `${r}${truncateToLength(t.stdout, u)}`,
    };
  }
  switch (e.name) {
    case FILE_WRITE_TOOL_NAME:
      return e.stripForStorage?.(t) ?? t;
    case NOTEBOOK_EDIT_TOOL_NAME:
      return mergeIfObject(t, {
        original_file: "",
        updated_file: "",
      });
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
    t.isImage !== true
  );
}
//@ chunk-e3wfm0b3.js:11040-11083 placement
function mergeIfObject(e, t) {
  return isPlainObject(e)
    ? {
        ...e,
        ...t,
      }
    : e;
}
//@ chunk-e3wfm0b3.js:11083-11235 placement
/**
 * 结果无法回传时的说明
 */
function unsentResult(e, unsent, n) {
  return {
    result: failedResult(
      `${e.name} ran, but its result could not be sent back. Check what it changed before running it again.`,
      n,
    ),
    unsent,
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
      ...(t.length > 0 && {
        notes: t,
      }),
    },
    content: e,
  });
}
//@ chunk-e3wfm0b3.js:11379-11544 placement
function completedError(e, disposition, n) {
  let content = truncateMiddle(e);
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      target: servedTarget(),
      is_error: true,
      content,
      disposition,
      ...(n.length > 0 && {
        notes: n,
      }),
    },
    content,
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
