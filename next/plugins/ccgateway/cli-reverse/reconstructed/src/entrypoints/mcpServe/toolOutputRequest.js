/**
 * entrypoints/mcpServe/toolOutputRequest.ts
 *
 * 2.1.316 新增。回答 mcp serve 的工具输出对象请求：协商版本、核对拒绝规则摘要、执行工具并编码输出。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8y2857ke.js (33)
 * attribution: placement 33
 */
import { randomUUID } from "crypto";
import { toolServerEnvAccessor } from "../../utils/subprocessEnvLoader.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
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

//@ chunk-8y2857ke.js:1382-1444 placement
function isToolOutputEnvOn() {
  return toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT === true;
}
//@ chunk-8y2857ke.js:1444-1493 placement
var OUTPUT_CAPABLE_TOOLS = new Set([
  BASH_TOOL_NAME,
  READ,
  EDIT,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  GREP_TOOL_NAME,
  GLOB_TOOL_NAME,
]);
var MAX_TOOL_OUTPUT_BYTES = 12582912;
//@ chunk-8y2857ke.js:1493-1561 placement
function toolOutputServerCapabilities(getTools, launchPermissionContext) {
  let announcedCapability = buildAnnouncedCapability(getTools, launchPermissionContext);
  return (
    announcedCapability && {
      experimental: {
        [ANTHROPIC_RETURNTOOLOUTPUT]: announcedCapability,
      },
    }
  );
}
//@ chunk-8y2857ke.js:1561-1809 placement
function buildAnnouncedCapability(getTools, launchPermissionContext) {
  if (!isToolOutputEnvOn() || launchPermissionContext === undefined) return;
  let classification = classifyToolsForOutput(getTools(), launchPermissionContext);
  if (!validateDenyRules(classification.deny_rules)) {
    logFeatureBad("mcp_serve_tool_output", "deny_rules_over_bounds");
    return;
  }
  let interfaceRange = isReturnOutputSupported() ? rangeToAnnounce() : undefined;
  return {
    ...classification,
    ...(interfaceRange !== undefined && {
      tools: [...classification.tools, ...SERVE_MODE_KEYS, MONITOR],
      tool_host_interface: interfaceRange,
    }),
  };
}
//@ chunk-8y2857ke.js:1809-1874 placement
function bringsToolHostPermissionRequest(meta) {
  if (!isToolOutputRequested()) return false;
  return hasToolHostInterface(isPlainObject(meta) ? meta[ANTHROPIC_RETURNTOOLOUTPUT] : undefined);
}
//@ chunk-8y2857ke.js:1874-1905 placement
function isToolOutputRequested() {
  return isToolOutputEnvOn() && isReturnOutputSupported();
}
//@ chunk-8y2857ke.js:1905-1985 placement
function classifyToolsForOutput(tools, launchPermissionContext) {
  return buildReturnToolOutputPayload({
    tools: outputCapableToolNames(tools),
    denyRules: launchPermissionContext.alwaysDenyRules.cliArg ?? [],
  });
}
//@ chunk-8y2857ke.js:1985-3043 placement
/**
 * 回答 mcp serve 的工具输出对象请求：协商版本、核对拒绝规则摘要、执行工具并编码输出。
 */
async function answerToolOutputRequest({
  name,
  args,
  meta,
  tools,
  launchPermissionContext,
  newCall,
  startHeartbeat,
}) {
  let returnOutputRequest = parseReturnOutputRequest(meta);
  if (returnOutputRequest.kind === "absent") return;
  let checked =
    readCallerAsks(meta).kind === "absent"
      ? checkToolOutputRequest(returnOutputRequest, name, tools, launchPermissionContext)
      : refusalResult(
          "invalid_request",
          `${name} was not run: a call that carries _meta["${CALLER_ASKS_KEY}"] is answered only as a plain call. Call it without asking for its output object.`,
          "carries_asks_key",
        );
  if ("refusal" in checked) {
    logFeatureSad("mcp_serve_tool_output", checked.reason, {
      tool: toolNameForAnalytics(name),
    });
    return refusedResult(checked.refusal);
  }
  let { toolUseContext, release } = newCall();
  try {
    let result = await runToolForOutput(
      checked.tool,
      args,
      buildServedToolUseContext(
        toolUseContext,
        addSessionWorkingDirectories(checked.launchPermissionContext),
      ),
      startHeartbeat,
    );
    if (!toolUseContext.abortController.signal.aborted) {
      let tool = toolNameForAnalytics(checked.tool.name);
      if ("unsent" in result)
        logFeatureBad("mcp_serve_tool_output", result.unsent, {
          tool,
        });
      else if (result.objection === "crashed_check")
        logFeatureBad("mcp_serve_tool_output", result.objection, {
          tool,
        });
      else if (result.objection !== undefined)
        logFeatureSad("mcp_serve_tool_output", result.objection, {
          tool,
        });
      else
        logFeatureOk("mcp_serve_tool_output", {
          tool,
          answer: fromEnum(result.answer),
          safety_ask_skipped: result.wasSafetyAskSkipped === true,
          ...(result.wasOutputCut && {
            output_cut: true,
          }),
          ...(result.diffLeftOut && {
            diff_left_out: fromEnum(result.diffLeftOut),
          }),
        });
    }
    return result.result;
  } finally {
    release();
  }
}
//@ chunk-8y2857ke.js:3043-4912 placement
/**
 * 检查输出对象请求（协议版本、规则摘要等）
 */
function checkToolOutputRequest(returnOutputRequest, name, tools, launchPermissionContext) {
  if (!isToolOutputEnvOn())
    return refusalResult(
      "unsupported_protocol",
      `${name} was not run: this server is not set up to return output objects (CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT is not on). Call it without asking for its output object.`,
    );
  if (launchPermissionContext === undefined)
    return refusalResult(
      "unsupported_protocol",
      `${name} was not run: this server holds no permission rules (CLAUDE_CODE_MCP_SERVE_SETTINGS was unset or empty when it started), and it returns output objects only for calls it can judge. Call it without asking for its output object.`,
      "no_launch_rules",
    );
  let { deny_rules: denyRules } = classifyToolsForOutput(tools, launchPermissionContext);
  if (!validateDenyRules(denyRules))
    return refusalResult(
      "unsupported_protocol",
      `${name} was not run: this server was launched with more or longer deny rules than it can advertise, so it returns no output objects. Call it without asking for its output object.`,
      "deny_rules_over_bounds",
    );
  if (returnOutputRequest.kind === "malformed")
    return refusalResult(
      "invalid_request",
      `${name} was not run: _meta["${ANTHROPIC_RETURNTOOLOUTPUT}"] must be exactly { versions, deny_rules_digest }. versions: up to 64 whole numbers. deny_rules_digest: the SHA-256 of JSON.stringify(deny_rules), for the deny_rules this server advertises, as 64 lower-case hex characters.`,
    );
  if (returnOutputRequest.kind === "no_shared_version")
    return refusalResult(
      "unsupported_protocol",
      `${name} was not run: this server returns output objects only in version ${SUPPORTED_RETURN_OUTPUT_VERSIONS.join(", ")}, and the request lists ${returnOutputRequest.versions.join(", ") || "none"}.`,
    );
  if (returnOutputRequest.denyRulesDigest !== hashJsonSha256(denyRules))
    return refusalResult(
      "unsupported_protocol",
      `${name} was not run: the request's deny_rules_digest is not that of the deny_rules this server advertises. Reconnect and read them again.`,
      "deny_rules_digest_mismatch",
    );
  let toolByName = findToolByName(tools, name);
  if (toolByName === undefined)
    return refusalResult("not_served", `${name} was not run: this server has no tool by that name.`);
  return OUTPUT_CAPABLE_TOOLS.has(name)
    ? {
        tool: toolByName,
        launchPermissionContext,
      }
    : refusalResult(
        "not_served",
        `${name} was not run: the tools this server answers with an output object are ${outputCapableToolNames(tools).join(", ") || "none"}. Call it without asking for its output object.`,
      );
}
//@ chunk-8y2857ke.js:4912-4944 placement
function isAnsweredWithOutput(toolName) {
  return OUTPUT_CAPABLE_TOOLS.has(toolName);
}
//@ chunk-8y2857ke.js:4944-5006 placement
function outputCapableToolNames(tools) {
  return tools.map((tool) => tool.name).filter((toolName) => OUTPUT_CAPABLE_TOOLS.has(toolName));
}
//@ chunk-8y2857ke.js:5006-5063 placement
function toolNameForAnalytics(name) {
  return OUTPUT_CAPABLE_TOOLS.has(name) || SERVE_MODE_KEYS.has(name)
    ? sanitizeToolNameForAnalytics(name)
    : getUnknownToolAnalyticsName(name);
}
//@ chunk-8y2857ke.js:5063-5166 placement
function refusedResult(refusal) {
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      target: servedTarget(),
      ...refusal,
    },
    content: clipText(refusal.message),
  });
}
//@ chunk-8y2857ke.js:5166-5346 placement
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
//@ chunk-8y2857ke.js:5346-5410 placement
function refusalResult(code, message, reason = code) {
  return {
    refusal: {
      code,
      message,
    },
    reason,
  };
}
//@ chunk-8y2857ke.js:5410-5793 placement
/**
 * 校验并执行工具，返回输出对象
 */
async function runToolForOutput(tool, args, toolUseContext, startHeartbeat) {
  let input = {
    ...args,
  };
  let fields = SERVE_MODE_VALUE.filter((field) => field in input);
  let notes = fields.length > 0 ? [strippedPrivilegeFieldsNote(fields)] : [];
  let validated = await validateToolCallInput(tool, input, toolUseContext);
  if ("rejection" in validated)
    return {
      result: completedError(validated.rejection, objectionToAnswer(validated.objection), notes),
      answer: "not_run",
      objection: validated.objection,
    };
  let ran = await ranTool(tool, validated.input, toolUseContext, startHeartbeat);
  return {
    ...("failure" in ran
      ? {
          result: completedError(ran.failure, "ran", notes),
          answer: "tool_failed",
        }
      : outputAnswer(tool, ran.data, notes)),
    wasSafetyAskSkipped: validated.wasSafetyAskSkipped,
  };
}
//@ chunk-8y2857ke.js:5793-6247 placement
/**
 * 检查工具启用与输入校验
 */
async function validateToolCallInput(tool, args, toolUseContext) {
  try {
    if (!tool.isEnabled())
      return {
        rejection: `Tool ${tool.name} is not enabled`,
      };
    let serveModeInput = parseServeModeInput(tool, args);
    if (!serveModeInput.success)
      return {
        rejection: `InputValidationError: ${formatZodValidationError(tool.name, serveModeInput.error)}`,
      };
    let inputResult = await tool.validateInput?.(serveModeInput.data, toolUseContext);
    if (inputResult !== undefined && !inputResult.result)
      return {
        rejection: inputResult.message,
        ...(inputResult.deniedByPermissionRule === true && {
          objection: "deny_rule",
        }),
      };
    let safety = await runSafetyCheck(tool, serveModeInput.data, toolUseContext);
    return "rejection" in safety
      ? safety
      : {
          input: serveModeInput.data,
          ...safety,
        };
  } catch (error) {
    logUnexpectedThrow(tool, error);
    return {
      rejection: formatToolErrorMessage(error),
    };
  }
}
//@ chunk-8y2857ke.js:6247-6421 placement
/**
 * 为远端调用构造工具上下文（标记来自其他机器、挂起沙箱自动允许）
 */
function buildServedToolUseContext(toolUseContext, permissionContext) {
  let appState = {
    ...serveModeDefaultAppState(),
    toolPermissionContext: {
      ...permissionContext,
      sandboxAutoAllowSuspended: true,
    },
  };
  return {
    ...toolUseContext,
    inputFromAnotherMachine: true,
    toolUseId: `toolu_${randomUUID()}`,
    getAppState: () => appState,
  };
}
//@ chunk-8y2857ke.js:6421-7553 placement
/**
 * 运行工具权限检查并处理崩溃
 */
async function runSafetyCheck(tool, input, toolUseContext) {
  let result = await checkRuleBasedPermissions(tool, input, toolUseContext, {
    crashIsObjection: true,
  }).catch((error) => {
    if (toolUseContext.abortController.signal.aborted) throw error;
    logUnexpectedThrow(tool, error);
    return "crashed";
  });
  if (result === null)
    return {
      wasSafetyAskSkipped: false,
    };
  if (
    result === "crashed" ||
    (result.decisionReason?.type === "other" &&
      result.decisionReason.reason === PERMISSION_CHECK_CRASHED_REASON)
  )
    return {
      rejection: `${tool.name} was not run: the permission rules could not be evaluated for this call (internal error).`,
      objection: "crashed_check",
    };
  if (result.behavior === "deny")
    return {
      rejection: result.message,
      objection: "deny_rule",
    };
  if (carriesAskRuleIntent(result))
    return {
      rejection: `${tool.name} was not run: a permission rule says to ask a person before a call like this one, and a call that runs in this environment cannot ask. Retrying won't help while that rule is in effect.`,
      objection: "ask_rule",
    };
  let safetyReason = findSafetyCheckReason(result.decisionReason, isAutoModeDenyCircuitBreaker);
  if (safetyReason !== undefined)
    return {
      rejection: buildDangerousRemovalDenial(flaggedPartMessage(result, safetyReason)),
      objection: "circuit_breaker",
    };
  let isImmune = findSafetyCheckReason(result.decisionReason, isBypassImmuneCircuitBreaker) !== undefined;
  return !isImmune && findSafetyCheckReason(result.decisionReason) !== undefined
    ? {
        wasSafetyAskSkipped: true,
        ask: result,
      }
    : {
        rejection: `${tool.name} was not run: ${result.message} A call that runs in this environment cannot put that to a person. Retrying won't help.`,
        objection: isImmune ? "circuit_breaker" : "other_ask",
      };
}
//@ chunk-8y2857ke.js:7553-8353 placement
async function checkPlainCall(tool, args, toolUseContext, launchPermissionContext, session) {
  if (launchPermissionContext === undefined)
    return {
      toolUseContext,
    };
  let callContext = {
    ...buildServedToolUseContext(toolUseContext, launchPermissionContext),
    inputFromAnotherMachine: toolUseContext.inputFromAnotherMachine,
  };
  let { toolUseId } = callContext;
  let permissionRoundInfo =
    toolUseId === undefined
      ? undefined
      : {
          toolUseId,
          opened: startPermissionRound(callContext, toolUseId, tool.name),
        };
  let safety = await runSafetyCheck(tool, args, {
    ...callContext,
    permissionPhase: undefined,
    permissionRound: permissionRoundInfo?.opened,
  }).catch((error) => {
    if (permissionRoundInfo)
      takePermissionRecord(callContext, permissionRoundInfo.toolUseId, permissionRoundInfo.opened);
    throw error;
  });
  let permissionPhase =
    (permissionRoundInfo &&
      takePermissionRecord(callContext, permissionRoundInfo.toolUseId, permissionRoundInfo.opened)) ??
    {};
  if (!("rejection" in safety)) {
    let decision = await settlePlainCallAsk(session, tool, args, callContext.session, safety.ask);
    if (decision !== "run" && decision !== "as_without_the_key") return decision;
    logFeatureOk(
      "mcp_serve_plain_call",
      decision === "run"
        ? {
            safety_ask_skipped: false,
            caller_attested: true,
          }
        : {
            safety_ask_skipped: safety.wasSafetyAskSkipped,
          },
    );
    return {
      toolUseContext: {
        ...callContext,
        permissionPhase,
      },
    };
  }
  if (safety.objection === "crashed_check") logFeatureBad("mcp_serve_plain_call", safety.objection);
  else logFeatureSad("mcp_serve_plain_call", safety.objection);
  return {
    rejection: safety.rejection,
  };
}
//@ chunk-8y2857ke.js:8353-8559 placement
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
//@ chunk-8y2857ke.js:8559-8788 placement
async function ranTool(
  tool,
  input,
  toolUseContext,
  startHeartbeat,
  denyNestedPermissionAsk = hasPermissionsToUseTool,
  callerLogsSharedEvents = false,
  smallResultAsked = false,
) {
  using heartbeatScope = startHeartbeat();
  try {
    return await tool.call(
      input,
      toolUseContext,
      denyNestedPermissionAsk,
      createAssistantMessage({
        content: [],
      }),
      undefined,
      {
        gitDiffRead: true,
        ...(callerLogsSharedEvents && {
          callerLogsSharedEvents,
        }),
        ...(smallResultAsked && {
          smallResultAsked,
        }),
      },
    );
  } catch (error) {
    logUnexpectedThrow(tool, error);
    return {
      failure: formatToolErrorMessage(error),
    };
  }
}
//@ chunk-8y2857ke.js:8788-8918 placement
function logUnexpectedThrow(tool, error) {
  if (isAbortOrCancelError(error) || classifyToolErrorCode(error).isSad) return;
  let error_2 = toError(error);
  logError(
    "telemetryMessage" in error_2
      ? error_2
      : withTelemetryMessage(error_2, `mcp server tool '${tool.name}' threw`),
  );
}
//@ chunk-8y2857ke.js:8918-9366 placement
function outputAnswer(tool, output, notes, interfaceInfo) {
  try {
    let outputVariants = buildOutputVariants(tool, output, interfaceInfo);
    for (let [index, { output: output_2, ...variantRest }] of outputVariants.entries())
      try {
        let encoded = encodeServedOutput(
          `${tool.name} ran. Its output is in this answer's structured content.`,
          output_2,
          false,
          notes,
        );
        if (Buffer.byteLength(jsonStringify(encoded), "utf8") <= MAX_TOOL_OUTPUT_BYTES)
          return {
            ...variantRest,
            result: encoded,
            answer: "output",
            ...(hasPersistedBashOutput(tool, output) && {
              wasOutputCut: true,
            }),
          };
      } catch (error) {
        if (index === outputVariants.length - 1) throw error;
        logEncodeFailure(tool, error, " in one form, so a smaller one is tried");
      }
    return unsentResult(tool, "result_too_large", notes);
  } catch (error) {
    logEncodeFailure(tool, error, "");
    return unsentResult(tool, "result_unbuildable", notes);
  }
}
//@ chunk-8y2857ke.js:9366-9458 placement
function logEncodeFailure(tool, error, suffix) {
  logError(
    withTelemetryMessage(
      toError(error),
      `mcp server tool '${tool.name}' output could not be encoded${suffix}`,
    ),
  );
}
//@ chunk-8y2857ke.js:9458-10047 placement
/**
 * 生成工具输出对象的若干裁剪版本
 */
function buildOutputVariants(tool, output, interfaceInfo) {
  if (tool.name === FILE_WRITE_TOOL_NAME && isPlainObject(output))
    return withDiffLeftOutVariants(output, [
      {
        output: toolOutputForWire(tool, output),
      },
    ]);
  if (tool.name !== EDIT || !isPlainObject(output))
    return [
      {
        output: toolOutputForWire(tool, output),
      },
    ];
  let output_2 = {
    ...output,
    originalFile: null,
  };
  if (typeof output.originalFile !== "string" || interfaceInfo === undefined)
    return withDiffLeftOutVariants(output, [
      {
        output: output_2,
      },
    ]);
  if (interfaceInfo.isSubagent)
    return withDiffLeftOutVariants(output, [
      {
        output: output_2,
        originalFileLeftOutReason: "for_subagent",
      },
    ]);
  if (interfaceInfo.sessionVersion < TOOL_HOST_INTERFACE_FEATURES.editOriginalFile)
    return withDiffLeftOutVariants(output, [
      {
        output: output_2,
        originalFileLeftOutReason: "older_session",
      },
    ]);
  return withDiffLeftOutVariants(
    output,
    Buffer.byteLength(output.originalFile, "utf8") > MAX_RETURNED_OUTPUT_BYTES
      ? [
          {
            output: output_2,
            originalFileLeftOutReason: "over_limit",
          },
        ]
      : [
          {
            output,
          },
          {
            output: output_2,
            originalFileLeftOutReason: "answer_too_large",
          },
        ],
  );
}
//@ chunk-8y2857ke.js:10047-10287 placement
/**
 * 加上去掉 gitDiff 的变体
 */
function withDiffLeftOutVariants(output, variants) {
  let withoutDiff =
    output.gitDiff === undefined
      ? []
      : variants.map((variant) => ({
          ...variant,
          output: mergeIfObject(variant.output, {
            gitDiff: undefined,
          }),
          diffLeftOut: "git_diff",
        }));
  return [
    ...variants,
    ...withoutDiff,
    {
      ...variants.at(-1),
      output: {
        ...output,
        gitDiff: undefined,
        structuredPatch: [],
        originalFile: null,
      },
      diffLeftOut: "all",
    },
  ];
}
//@ chunk-8y2857ke.js:10287-10950 placement
/**
 * 输出对象转可发送形式（截断说明）
 */
function toolOutputForWire(tool, output) {
  if (hasPersistedBashOutput(tool, output)) {
    let persistedOutputSize = output.persistedOutputSize;
    let sizeNote =
      typeof persistedOutputSize === "number"
        ? `the command printed ${formatFileSize(persistedOutputSize)}; `
        : "";
    let whereNote =
      typeof persistedOutputSize === "number" && persistedOutputSize >= MAX_PERSISTED_OUTPUT_BYTES
        ? `The first ${formatFileSize(MAX_PERSISTED_OUTPUT_BYTES)} of the command's output are`
        : "The command's whole output is";
    let prefix = `(output truncated: ${sizeNote}only the start was returned, and a saved copy of this result holds only that start. ${whereNote} in the file ${output.persistedOutputPath}. If the file is gone, run the command again with ${outputFilterHint(tool.name)}, if that is safe.)
`;
    let keepLength = Math.max(getMaxOutputLength(), MIN_MAX_OUTPUT_LENGTH) - prefix.length;
    return {
      ...output,
      stdout: `${prefix}${truncateToLength(output.stdout, keepLength)}`,
    };
  }
  switch (tool.name) {
    case FILE_WRITE_TOOL_NAME:
      return tool.stripForStorage?.(output) ?? output;
    case NOTEBOOK_EDIT_TOOL_NAME:
      return mergeIfObject(output, {
        original_file: "",
        updated_file: "",
      });
    default:
      return output;
  }
}
//@ chunk-8y2857ke.js:10950-11068 placement
function hasPersistedBashOutput(tool, output) {
  return (
    tool.name === BASH_TOOL_NAME &&
    isPlainObject(output) &&
    typeof output.stdout === "string" &&
    Boolean(output.persistedOutputPath) &&
    output.isImage !== true
  );
}
//@ chunk-8y2857ke.js:11068-11111 placement
function mergeIfObject(base, patch) {
  return isPlainObject(base)
    ? {
        ...base,
        ...patch,
      }
    : base;
}
//@ chunk-8y2857ke.js:11111-11263 placement
/**
 * 结果无法回传时的说明
 */
function unsentResult(tool, unsent, notes) {
  return {
    result: failedResult(
      `${tool.name} ran, but its result could not be sent back. Check what it changed before running it again.`,
      notes,
    ),
    unsent,
  };
}
//@ chunk-8y2857ke.js:11263-11407 placement
function failedResult(message, notes) {
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      target: servedTarget(),
      code: "internal_error",
      message,
      ...(notes.length > 0 && {
        notes,
      }),
    },
    content: message,
  });
}
//@ chunk-8y2857ke.js:11407-11572 placement
function completedError(message, disposition, notes) {
  let content = truncateMiddle(message);
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      target: servedTarget(),
      is_error: true,
      content,
      disposition,
      ...(notes.length > 0 && {
        notes,
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
  answerToolOutputRequest,
  checkPlainCall,
  toolOutputServerCapabilities,
};
