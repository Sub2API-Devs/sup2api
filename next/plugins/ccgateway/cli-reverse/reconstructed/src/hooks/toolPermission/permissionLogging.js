/**
 * hooks/toolPermission/permissionLogging.ts
 *
 * 权限决策日志：批准/拒绝事件（config/classifier/hook/user）、代码编辑工具属性、OTEL tool_decision。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/toolPermission/permissionLogging.ts
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 2, fingerprint 7, file-local 1, layout 5
 */
import {
  extractMcpToolDetails,
  isMcpServerLoggableInAnalytics,
  mcpToolAnalyticsFields,
  sanitizeToolNameForAnalytics,
  extractToolInputDetailsForAnalytics,
  toolSourceMetadata,
} from "../../services/analytics/metadata.js";
import { logError } from "../../utils/log.js";
import { resolveMcpConnectionForTool } from "../../services/mcp/mcpStringUtils.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { safeOrigin } from "../../services/mcp/ccrMcpUrls.js";
import { getLoggingSafeMcpBaseUrl } from "../../services/mcp/utils.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { languageForFilePath } from "../../utils/highlight/pluginLanguages.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  getDestructiveTargetCategory,
  classifyDestructiveTargetScope,
  classifyGitDestructiveTarget,
} from "../../tools/BashTool/destructiveTargets.js";
import { getPowerShellDestructiveCategory } from "../../tools/PowerShellTool/destructiveCommandWarning.js";
import { getCwdOrNull } from "../../utils/cwd.js";
import { logEvent } from "../../services/analytics/index.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isSubagentContext } from "../../utils/agentContext.js";
import { supportsPersistence as supportsPersistence_2 } from "../../utils/permissions/PermissionUpdate.js";
import { getClassifierVerdictAnalyticsFields } from "../../utils/classifierApprovals.js";
import { getCodeEditToolDecisionCounter } from "../../bootstrap/state.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";

//@ chunk-e6aww6q8.js:993627-993733 placement
/**
 * 生成权限日志的 MCP 工具字段（非 MCP 工具返回空；出错记录日志并返回空）。
 */
function mcpToolLogFields(tool, mcpClients) {
  if (!tool.isMcp || extractMcpToolDetails(tool.name) === undefined) return {};
  try {
    return describeMcpToolForLog(tool, mcpClients);
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-e6aww6q8.js:993733-994061 placement
/**
 * 生成权限日志中的 MCP 工具字段：服务器类型、可记录的基础 URL、readOnlyHint，以及（服务器可记录时）工具名细节。
 */
function describeMcpToolForLog(tool, mcpClients) {
  let { connection, ambiguous } = resolveMcpConnectionForTool(tool.name, mcpClients);
  let connectedClient = connection && isConnectedOrCached(connection) ? connection : undefined;
  let serverType = connectedClient ? (connectedClient.config.type ?? "stdio") : undefined;
  let serverBaseUrl = connectedClient
    ? safeOrigin(getLoggingSafeMcpBaseUrl(connectedClient.config))
    : undefined;
  let isLoggable =
    !ambiguous &&
    isMcpServerLoggableInAnalytics(
      extractMcpToolDetails(tool.name)?.serverName ?? "",
      connectedClient?.config,
    );
  return {
    ...(serverType && {
      mcpServerType: fromEnum(serverType),
    }),
    ...(serverBaseUrl && {
      mcpServerBaseUrl: serverBaseUrl,
    }),
    ...(tool.readOnlyHint !== undefined && {
      readOnlyHint: tool.readOnlyHint,
    }),
    ...mcpToolAnalyticsFields(tool.name, isLoggable),
  };
}
//@ chunk-e6aww6q8.js:3760835-3760875 fingerprint (2.1.88 match: CODE_EDITING_TOOLS, 1)
var CODE_EDITING_TOOLS = ["Edit", "Write", "NotebookEdit"];
//@ chunk-e6aww6q8.js:3760875-3760914 file-local
function isCodeEditingTool(toolName) {
  return CODE_EDITING_TOOLS.includes(toolName);
}
//@ chunk-e6aww6q8.js:3760914-3761121 fingerprint (2.1.88 match: buildCodeEditToolAttributes, 1)
async function buildCodeEditToolAttributes(tool, input, decision, source) {
  let language;
  if (tool.getPath && input) {
    let parseResult = tool.inputSchema.safeParse(input);
    if (parseResult.success) {
      let filePath = tool.getPath(parseResult.data);
      if (filePath) language = await languageForFilePath(filePath);
    }
  }
  return {
    decision,
    source,
    tool_name: tool.name,
    ...(language && {
      language,
    }),
  };
}
//@ chunk-e6aww6q8.js:3761121-3761383 fingerprint (2.1.88 match: sourceToString, 1)
function sourceToString(source) {
  if (source.type === "classifier") return "classifier";
  switch (source.type) {
    case "hook":
      return "hook";
    case "user":
      return source.permanent ? "user_permanent" : "user_temporary";
    case "user_abort":
      return "user_abort";
    case "user_reject":
      return "user_reject";
    default:
      return "unknown";
  }
}
//@ chunk-e6aww6q8.js:3761704-3761889 fingerprint (2.1.88 match: baseMetadata, 0.921)
function baseMetadata(tool, messageId, waitMs, mcpClients) {
  return {
    messageID: sanitizeMarkName(messageId),
    isMcp: tool.isMcp ?? false,
    toolName: sanitizeToolNameForAnalytics(tool.name),
    ...mcpToolLogFields(tool, mcpClients),
    sandboxEnabled: SandboxManager.isSandboxingEnabled(),
    ...(waitMs !== undefined && {
      waiting_for_user_permission_ms: waitMs,
    }),
  };
}
//@ chunk-e6aww6q8.js:3761889-3762233 layout
/**
 * Bash/PowerShell 命令的破坏性分类遥测字段：破坏类别、目标范围、git 破坏目标与权限模式。
 */
function destructiveCommandFields(tool, input, permissionMode) {
  let isBash = tool.name === BASH_TOOL_NAME;
  if (!isBash && tool.name !== POWERSHELL_TOOL_NAME) return;
  if (
    input === null ||
    typeof input !== "object" ||
    !("command" in input) ||
    typeof input.command !== "string"
  )
    return;
  let category = isBash
    ? getDestructiveTargetCategory(input.command)
    : getPowerShellDestructiveCategory(input.command);
  return {
    destructive_category: fromEnum(category ?? "none"),
    destructive_target_scope: fromEnum(
      classifyDestructiveTargetScope(input.command, getCwdOrNull(), category),
    ),
    git_destructive_target: fromEnum(classifyGitDestructiveTarget(input.command, category)),
    permission_mode: fromEnum(permissionMode),
  };
}
//@ chunk-e6aww6q8.js:3762233-3762841 fingerprint (2.1.88 match: logApprovalEvent, 0.825)
function logApprovalEvent(tool, messageId, source, waitMs, extraFields, mcpClients, promptFields) {
  if (source === "config") {
    logEvent("tengu_tool_use_granted_in_config", {
      ...baseMetadata(tool, messageId, undefined, mcpClients),
      ...extraFields,
      ...promptFields,
    });
    logFeatureOk("permission_auto_approve_config");
    return;
  }
  if (source.type === "classifier") {
    logEvent("tengu_tool_use_granted_by_classifier", {
      ...baseMetadata(tool, messageId, waitMs, mcpClients),
      ...extraFields,
    });
    return;
  }
  switch (source.type) {
    case "user":
      logEvent(
        source.permanent
          ? "tengu_tool_use_granted_in_prompt_permanent"
          : "tengu_tool_use_granted_in_prompt_temporary",
        {
          ...baseMetadata(tool, messageId, waitMs, mcpClients),
          ...extraFields,
          ...promptFields,
        },
      );
      logFeatureOk("permission_user_grant");
      break;
    case "hook":
      logEvent("tengu_tool_use_granted_by_permission_hook", {
        ...baseMetadata(tool, messageId, waitMs, mcpClients),
        ...extraFields,
        ...promptFields,
        permanent: source.permanent,
      });
      logFeatureOk("permission_auto_approve_hook");
      break;
    default:
      break;
  }
}
//@ chunk-e6aww6q8.js:3762841-3763211 fingerprint (2.1.88 match: logRejectionEvent, 0.763)
function logRejectionEvent(tool, messageId, source, waitMs, extraFields, mcpClients, promptFields) {
  if (source === "config") {
    logEvent("tengu_tool_use_denied_in_config", {
      ...baseMetadata(tool, messageId, undefined, mcpClients),
      ...extraFields,
    });
    logFeatureOk("permission_auto_deny_config");
    return;
  }
  logEvent("tengu_tool_use_rejected_in_prompt", {
    ...baseMetadata(tool, messageId, waitMs, mcpClients),
    ...extraFields,
    ...promptFields,
    ...(source.type === "hook"
      ? {
          isHook: true,
        }
      : {
          hasFeedback: source.type === "user_reject" ? source.hasFeedback : false,
        }),
  });
  logFeatureOk(source.type === "hook" ? "permission_auto_deny_hook" : "permission_user_deny");
}
//@ chunk-e6aww6q8.js:3763211-3763279 layout
function sdkPermissionPromptFields(toolUseID) {
  return {
    toolUseID: sanitizeMarkName(toolUseID),
    promptSurface: lit_2("sdk_host"),
  };
}
//@ chunk-e6aww6q8.js:3763279-3763572 layout
/**
 * 记录 tengu_tool_use_show_permission_request 事件：工具基础元数据、决策原因类型、权限模式、发起 agent 类型等。
 */
function logPermissionRequestShown(logContext, type) {
  let { tool, messageId, toolUseID, permissionMode, agentContext } = logContext;
  try {
    logEvent("tengu_tool_use_show_permission_request", {
      ...baseMetadata(tool, messageId, undefined, logContext.mcpClients),
      decisionReasonType: fromEnumOpt(type),
      permissionMode: fromEnum(permissionMode),
      originAgentType: fromEnum(
        isSubagentContext(agentContext) && agentContext.isMainSession ? "main" : agentContext.agentType,
      ),
      ...sdkPermissionPromptFields(toolUseID),
    });
  } catch {}
}
//@ chunk-e6aww6q8.js:3763572-3764214 layout
/**
 * 把权限结果（宿主回答、回合中止、hook、复查）映射为 {decision, source}，宿主允许时判断是否为永久规则。
 */
function permissionOutcomeSource(outcome, appliedAllowUpdates) {
  switch (outcome.kind) {
    case "host_answer": {
      let { answer } = outcome;
      if (answer.behavior === "allow")
        return {
          decision: "accept",
          source: {
            type: "user",
            permanent:
              answer.decisionClassification !== undefined
                ? answer.decisionClassification === "user_permanent"
                : (appliedAllowUpdates(answer.updatedPermissions) ?? []).some((update) =>
                    supportsPersistence_2(update.destination),
                  ),
          },
        };
      return {
        decision: "reject",
        source: {
          type: "user_reject",
          hasFeedback: answer.interrupt !== true,
        },
      };
    }
    case "turn_aborted":
      return {
        decision: "reject",
        source: {
          type: "user_abort",
        },
      };
    case "hook":
      return outcome.behavior === "allow"
        ? {
            decision: "accept",
            source: {
              type: "hook",
              permanent: outcome.permanent,
            },
          }
        : {
            decision: "reject",
            source: {
              type: "hook",
            },
          };
    case "recheck":
      return {
        decision: "accept",
        source: "config",
      };
  }
}
//@ chunk-e6aww6q8.js:3764214-3764485 layout
/**
 * 记录权限决定事件：计算等待时长与来源，按接受/拒绝分别记批准或拒绝事件。
 */
function logPermissionDecision(logContext, outcome, shownAtMs) {
  let { tool, input, messageId, toolUseID, permissionMode } = logContext;
  try {
    let waitMs = Date.now() - shownAtMs;
    let destructiveFields = destructiveCommandFields(tool, input, permissionMode);
    let promptFields = sdkPermissionPromptFields(toolUseID);
    let outcomeSource = permissionOutcomeSource(outcome, logContext.appliedAllowUpdates);
    if (outcomeSource.decision === "accept")
      logApprovalEvent(
        tool,
        messageId,
        outcomeSource.source,
        waitMs,
        destructiveFields,
        logContext.mcpClients,
        promptFields,
      );
    else
      logRejectionEvent(
        tool,
        messageId,
        outcomeSource.source,
        waitMs,
        destructiveFields,
        logContext.mcpClients,
        promptFields,
      );
  } catch {}
}
//@ chunk-e6aww6q8.js:3764485-3765505 fingerprint (2.1.88 match: logPermissionDecision, 0.585)
/**
 * 记录一次权限决策：批准/拒绝事件、来源（config/classifier/hook/user_permanent/user_temporary/user_abort）、OTEL tool_decision。
 */
function logPermissionDecision_2(ctx, args, permissionPromptStartTimeMs) {
  let { tool, input, toolUseContext, messageId, requestId, toolUseID, permissionMode } = ctx;
  let { decision, source } = args;
  let waiting_for_user_permission_ms =
    permissionPromptStartTimeMs !== undefined ? Date.now() - permissionPromptStartTimeMs : undefined;
  let destructiveFields = destructiveCommandFields(tool, input, permissionMode);
  let mcpClients = toolUseContext.options.mcpClients;
  if (args.decision === "accept")
    logApprovalEvent(
      tool,
      messageId,
      args.source,
      waiting_for_user_permission_ms,
      destructiveFields,
      mcpClients,
    );
  else
    logRejectionEvent(
      tool,
      messageId,
      args.source,
      waiting_for_user_permission_ms,
      destructiveFields,
      mcpClients,
    );
  let sourceString = source === "config" ? "config" : sourceToString(source);
  let grantScope =
    args.decision === "accept" && args.source !== "config" && args.source.type === "user"
      ? (args.scope ?? (args.source.permanent ? "always" : "once"))
      : undefined;
  let verdictFields =
    source === "config" ? getClassifierVerdictAnalyticsFields(decision, args.decisionReason) : undefined;
  if (isCodeEditingTool(tool.name))
    buildCodeEditToolAttributes(tool, input, decision, sourceString).then((attributes) =>
      getCodeEditToolDecisionCounter()?.add(1, attributes),
    );
  toolUseContext.toolDecisions.set(toolUseID, {
    source: sourceString,
    decision,
    timestamp: Date.now(),
    ...(args.decision === "accept" &&
      args.surface !== undefined && {
        surface: args.surface,
      }),
    ...(grantScope !== undefined &&
      grantScope !== "always" && {
        grantScope,
      }),
  });
  let toolInputDetailsForAnalytics = extractToolInputDetailsForAnalytics(tool.name, input, tool.mcpInfo);
  logOTelEvent(
    "tool_decision",
    {
      decision,
      source: sourceString,
      tool_name: sanitizeToolNameForAnalytics(tool.name),
      tool_use_id: toolUseID,
      ...toolSourceMetadata(tool.mcpInfo),
      ...(Object.keys(toolInputDetailsForAnalytics).length > 0 && {
        tool_parameters: jsonStringify(toolInputDetailsForAnalytics),
      }),
      ...verdictFields,
      permission_mode: toExternalPermissionMode(
        (args.decision === "accept" && args.modeAtRecheck) || permissionMode,
      ),
      ...(requestId && {
        request_id: requestId,
      }),
    },
    toolUseContext.agentContext,
  );
}
export {
  mcpToolLogFields,
  logPermissionRequestShown,
  logPermissionDecision,
  isCodeEditingTool,
  buildCodeEditToolAttributes,
  logPermissionDecision_2,
};
