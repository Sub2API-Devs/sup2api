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
import { ye } from "../../utils/startupMarks.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  XCe,
  classifyDestructiveTargetScope,
  classifyGitDestructiveTarget,
} from "../../tools/BashTool/destructiveTargets.js";
import { WSt } from "../../tools/PowerShellTool/destructiveCommandWarning.js";
import { gl } from "../../utils/cwd.js";
import { logEvent } from "../../services/analytics/index.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isSubagentContext } from "../../utils/agentContext.js";
import { supportsPersistence as supportsPersistence_2 } from "../../utils/permissions/PermissionUpdate.js";
import { getClassifierVerdictAnalyticsFields } from "../../utils/classifierApprovals.js";
import { getCodeEditToolDecisionCounter } from "../../bootstrap/state.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";

/**
 * 生成权限日志的 MCP 工具字段（非 MCP 工具返回空；出错记录日志并返回空）。
 */
//@ chunk-e6aww6q8.js:993627-993733 placement
function mcpToolLogFields(e, n) {
  if (!e.isMcp || extractMcpToolDetails(e.name) === void 0) return {};
  try {
    return describeMcpToolForLog(e, n);
  } catch (error) {
    return (logError(error), {});
  }
}
/**
 * 生成权限日志中的 MCP 工具字段：服务器类型、可记录的基础 URL、readOnlyHint，以及（服务器可记录时）工具名细节。
 */
//@ chunk-e6aww6q8.js:993733-994061 placement
function describeMcpToolForLog(e, n) {
  let { connection: connection, ambiguous: ambiguous } = resolveMcpConnectionForTool(e.name, n),
    h = connection && isConnectedOrCached(connection) ? connection : void 0,
    y = h ? (h.config.type ?? "stdio") : void 0,
    S = h ? safeOrigin(getLoggingSafeMcpBaseUrl(h.config)) : void 0,
    w =
      !ambiguous &&
      isMcpServerLoggableInAnalytics(extractMcpToolDetails(e.name)?.serverName ?? "", h?.config);
  return {
    ...(y && { mcpServerType: fromEnum(y) }),
    ...(S && { mcpServerBaseUrl: S }),
    ...(e.readOnlyHint !== void 0 && { readOnlyHint: e.readOnlyHint }),
    ...mcpToolAnalyticsFields(e.name, w),
  };
}
//@ chunk-e6aww6q8.js:3760835-3760875 fingerprint = CODE_EDITING_TOOLS (1)
var CODE_EDITING_TOOLS = ["Edit", "Write", "NotebookEdit"];
//@ chunk-e6aww6q8.js:3760875-3760914 file-local
function isCodeEditingTool(toolName) {
  return CODE_EDITING_TOOLS.includes(toolName);
}
//@ chunk-e6aww6q8.js:3760914-3761121 fingerprint = buildCodeEditToolAttributes (1)
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
    decision: decision,
    source: source,
    tool_name: tool.name,
    ...(language && { language: language }),
  };
}
//@ chunk-e6aww6q8.js:3761121-3761383 fingerprint = sourceToString (1)
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
//@ chunk-e6aww6q8.js:3761704-3761889 fingerprint = baseMetadata (0.921)
function baseMetadata(e, n, r, s) {
  return {
    messageID: ye(n),
    isMcp: e.isMcp ?? !1,
    toolName: sanitizeToolNameForAnalytics(e.name),
    ...mcpToolLogFields(e, s),
    sandboxEnabled: SandboxManager.isSandboxingEnabled(),
    ...(r !== void 0 && { waiting_for_user_permission_ms: r }),
  };
}
/**
 * Bash/PowerShell 命令的破坏性分类遥测字段：破坏类别、目标范围、git 破坏目标与权限模式。
 */
//@ chunk-e6aww6q8.js:3761889-3762233 layout
function destructiveCommandFields(e, n, r) {
  let s = e.name === BASH_TOOL_NAME;
  if (!s && e.name !== POWERSHELL_TOOL_NAME) return;
  if (n === null || typeof n !== "object" || !("command" in n) || typeof n.command !== "string") return;
  let h = s ? XCe(n.command) : WSt(n.command);
  return {
    destructive_category: fromEnum(h ?? "none"),
    destructive_target_scope: fromEnum(classifyDestructiveTargetScope(n.command, gl(), h)),
    git_destructive_target: fromEnum(classifyGitDestructiveTarget(n.command, h)),
    permission_mode: fromEnum(r),
  };
}
//@ chunk-e6aww6q8.js:3762233-3762841 fingerprint = logApprovalEvent (0.825)
function logApprovalEvent(e, n, r, s, h, y, S) {
  if (r === "config") {
    (logEvent("tengu_tool_use_granted_in_config", { ...baseMetadata(e, n, void 0, y), ...h, ...S }),
      logFeatureOk("permission_auto_approve_config"));
    return;
  }
  if (r.type === "classifier") {
    logEvent("tengu_tool_use_granted_by_classifier", { ...baseMetadata(e, n, s, y), ...h });
    return;
  }
  switch (r.type) {
    case "user":
      (logEvent(
        r.permanent
          ? "tengu_tool_use_granted_in_prompt_permanent"
          : "tengu_tool_use_granted_in_prompt_temporary",
        { ...baseMetadata(e, n, s, y), ...h, ...S },
      ),
        logFeatureOk("permission_user_grant"));
      break;
    case "hook":
      (logEvent("tengu_tool_use_granted_by_permission_hook", {
        ...baseMetadata(e, n, s, y),
        ...h,
        ...S,
        permanent: r.permanent,
      }),
        logFeatureOk("permission_auto_approve_hook"));
      break;
    default:
      break;
  }
}
//@ chunk-e6aww6q8.js:3762841-3763211 fingerprint = logRejectionEvent (0.763)
function logRejectionEvent(e, n, r, s, h, y, S) {
  if (r === "config") {
    (logEvent("tengu_tool_use_denied_in_config", { ...baseMetadata(e, n, void 0, y), ...h }),
      logFeatureOk("permission_auto_deny_config"));
    return;
  }
  (logEvent("tengu_tool_use_rejected_in_prompt", {
    ...baseMetadata(e, n, s, y),
    ...h,
    ...S,
    ...(r.type === "hook" ? { isHook: !0 } : { hasFeedback: r.type === "user_reject" ? r.hasFeedback : !1 }),
  }),
    logFeatureOk(r.type === "hook" ? "permission_auto_deny_hook" : "permission_user_deny"));
}
//@ chunk-e6aww6q8.js:3763211-3763279 layout
function iNn(e) {
  return { toolUseID: ye(e), promptSurface: lit_2("sdk_host") };
}
/**
 * 记录 tengu_tool_use_show_permission_request 事件：工具基础元数据、决策原因类型、权限模式、发起 agent 类型等。
 */
//@ chunk-e6aww6q8.js:3763279-3763572 layout
function logPermissionRequestShown(e, n) {
  let {
    tool: tool,
    messageId: messageId,
    toolUseID: toolUseID,
    permissionMode: permissionMode,
    agentContext: agentContext,
  } = e;
  try {
    logEvent("tengu_tool_use_show_permission_request", {
      ...baseMetadata(tool, messageId, void 0, e.mcpClients),
      decisionReasonType: fromEnumOpt(n),
      permissionMode: fromEnum(permissionMode),
      originAgentType: fromEnum(
        isSubagentContext(agentContext) && agentContext.isMainSession ? "main" : agentContext.agentType,
      ),
      ...iNn(toolUseID),
    });
  } catch {}
}
/**
 * 把权限结果（宿主回答、回合中止、hook、复查）映射为 {decision, source}，宿主允许时判断是否为永久规则。
 */
//@ chunk-e6aww6q8.js:3763572-3764214 layout
function permissionOutcomeSource(e, n) {
  switch (e.kind) {
    case "host_answer": {
      let { answer: answer } = e;
      if (answer.behavior === "allow")
        return {
          decision: "accept",
          source: {
            type: "user",
            permanent:
              answer.decisionClassification !== void 0
                ? answer.decisionClassification === "user_permanent"
                : (n(answer.updatedPermissions) ?? []).some((h) => supportsPersistence_2(h.destination)),
          },
        };
      return { decision: "reject", source: { type: "user_reject", hasFeedback: answer.interrupt !== !0 } };
    }
    case "turn_aborted":
      return { decision: "reject", source: { type: "user_abort" } };
    case "hook":
      return e.behavior === "allow"
        ? { decision: "accept", source: { type: "hook", permanent: e.permanent } }
        : { decision: "reject", source: { type: "hook" } };
    case "recheck":
      return { decision: "accept", source: "config" };
  }
}
/**
 * 记录权限决定事件：计算等待时长与来源，按接受/拒绝分别记批准或拒绝事件。
 */
//@ chunk-e6aww6q8.js:3764214-3764485 layout
function logPermissionDecision(e, n, r) {
  let {
    tool: tool,
    input: input,
    messageId: messageId,
    toolUseID: toolUseID,
    permissionMode: permissionMode,
  } = e;
  try {
    let L = Date.now() - r,
      G = destructiveCommandFields(tool, input, permissionMode),
      q = iNn(toolUseID),
      Z = permissionOutcomeSource(n, e.appliedAllowUpdates);
    if (Z.decision === "accept") logApprovalEvent(tool, messageId, Z.source, L, G, e.mcpClients, q);
    else logRejectionEvent(tool, messageId, Z.source, L, G, e.mcpClients, q);
  } catch {}
}
/**
 * 记录一次权限决策：批准/拒绝事件、来源（config/classifier/hook/user_permanent/user_temporary/user_abort）、OTEL tool_decision。
 */
//@ chunk-e6aww6q8.js:3764485-3765505 fingerprint = logPermissionDecision (0.585)
function logPermissionDecision_2(ctx, args, permissionPromptStartTimeMs) {
  let {
      tool: tool,
      input: input,
      toolUseContext: toolUseContext,
      messageId: messageId,
      requestId: requestId,
      toolUseID: toolUseID,
      permissionMode: permissionMode,
    } = ctx,
    { decision: decision, source: source } = args,
    Se = permissionPromptStartTimeMs !== void 0 ? Date.now() - permissionPromptStartTimeMs : void 0,
    ke = destructiveCommandFields(tool, input, permissionMode),
    mcpClients = toolUseContext.options.mcpClients;
  if (args.decision === "accept") logApprovalEvent(tool, messageId, args.source, Se, ke, mcpClients);
  else logRejectionEvent(tool, messageId, args.source, Se, ke, mcpClients);
  let Ee = source === "config" ? "config" : sourceToString(source),
    Ae =
      args.decision === "accept" && args.source !== "config" && args.source.type === "user"
        ? (args.scope ?? (args.source.permanent ? "always" : "once"))
        : void 0,
    Ie = source === "config" ? getClassifierVerdictAnalyticsFields(decision, args.decisionReason) : void 0;
  if (isCodeEditingTool(tool.name))
    buildCodeEditToolAttributes(tool, input, decision, Ee).then((attributes) =>
      getCodeEditToolDecisionCounter()?.add(1, attributes),
    );
  toolUseContext.toolDecisions.set(toolUseID, {
    source: Ee,
    decision: decision,
    timestamp: Date.now(),
    ...(args.decision === "accept" && args.surface !== void 0 && { surface: args.surface }),
    ...(Ae !== void 0 && Ae !== "always" && { grantScope: Ae }),
  });
  let Me = extractToolInputDetailsForAnalytics(tool.name, input, tool.mcpInfo);
  logOTelEvent(
    "tool_decision",
    {
      decision: decision,
      source: Ee,
      tool_name: sanitizeToolNameForAnalytics(tool.name),
      tool_use_id: toolUseID,
      ...toolSourceMetadata(tool.mcpInfo),
      ...(Object.keys(Me).length > 0 && { tool_parameters: jsonStringify(Me) }),
      ...Ie,
      permission_mode: toExternalPermissionMode(
        (args.decision === "accept" && args.modeAtRecheck) || permissionMode,
      ),
      ...(requestId && { request_id: requestId }),
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
