/**
 * utils/messages/systemInit.ts
 *
 * 构造 SDK/stream-json 的 system/init 消息（cwd、session_id、tools、mcp_servers、model、permissionMode、slash_commands、agents、skills、plugins 等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/messages/systemInit.ts
 * pieces: chunk-gr407tas.js (20)
 * attribution: placement 19, fingerprint 1
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { findCapabilityValue } from "../model/promptBundles.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { env } from "../env.js";
import { getMainLoopModel } from "../model/model.js";
import { getCachedClientData } from "../config.js";
import { stripCombiningRepeated } from "../sanitization.js";
import { Yn } from "../stripAnsi.js";
import { truncateToWidth } from "../format.js";
import { truncateToLength } from "../stringUtils.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { uC } from "../remoteEnvironment.js";
import { toolMatchesName } from "../../Tool.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { getPlatform } from "../platform.js";
import { uf } from "../../tools/AgentTool/backgroundGates.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { cleanOptionalText } from "../settings/marketplaceSettingsAliases.js";
import { isPolicyVerdictAbsent } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { logError } from "../log.js";
import { getSettings_DEPRECATED } from "../settings/settings.js";
import { isAutoMemoryEnabled, getAutoMemPath } from "../../memdir/paths.js";
import { a4, getMemoryDirNfc } from "../../memdir/teamMemPaths.js";
import { getSessionId, getSdkBetas, getOriginalCwdOrNull, getToolsMachine } from "../../bootstrap/state.js";
import { gl } from "../cwd.js";
import { getApiKeySourceSafe } from "../auth.js";
import { DEFAULT } from "../../constants/outputStyles.js";
import { isFirstPartyTelemetryBlocked } from "../hostEnvironment.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { isScratchpadEnabled, getScratchpadDir } from "../permissions/filesystem.js";
import { isViolinWoodEnabledCached } from "../../services/analytics/violinGates.js";
import { getResolvedPowerShellPath } from "../shell/powershellDetection.js";
import { Kgt } from "../../services/mcp/config.js";
import { toExternalPermissionMode } from "../permissions/PermissionMode.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { Br, logStartupTiming, dyi } from "../startupTiming.js";

//@ chunk-gr407tas.js:1360-1407 placement
var c = 6,
  _ = 32,
  f = DoctorLazy(() => u({ text: o().optional() }));
//@ chunk-gr407tas.js:1407-1538 placement
function parseFooterIndicator(e) {
  let safeParse = f().safeParse(e);
  if (!safeParse.success || safeParse.data.text === void 0) return null;
  let a = m(safeParse.data.text);
  return a.length > 0 ? a : null;
}
/**
 * 决定 SDK 底栏指示文字：依次取环境变量、按模型配置的 footer_indicator_<模型> 开关，最后取服务端客户端数据里的设置。
 */
//@ chunk-gr407tas.js:1538-1676 placement
function resolveFooterIndicator(e, r, a) {
  let s = findCapabilityValue("footer_indicator_", getCanonicalName(r), r);
  for (let n of [e, s])
    if (n !== void 0) {
      let t = m(n);
      if (t.length > 0) return t;
    }
  return parseFooterIndicator(a);
}
/**
 * 取 SDK 底栏指示文字（解析结果为 null 时不返回）。
 */
//@ chunk-gr407tas.js:1676-1793 placement
function getFooterIndicator() {
  let e = resolveFooterIndicator(
    env.CLAUDE_CODE_FOOTER_INDICATOR,
    getMainLoopModel(),
    getCachedClientData()?.footer_indicator,
  );
  return e === null ? void 0 : { text: e };
}
//@ chunk-gr407tas.js:1793-1887 placement
function m(e) {
  let trimmed = stripCombiningRepeated(Yn(e))
    .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
    .trim();
  return truncateToWidth(truncateToLength(trimmed, _), c);
}
//@ chunk-gr407tas.js:1887-1922 placement
function fon(e) {
  return e === AGENT ? TASK : e;
}
//@ chunk-gr407tas.js:1922-2219 placement
var INTERRUPT_RECEIPT_V1 = "interrupt_receipt_v1",
  MSG_LIFECYCLE_V1 = "msg_lifecycle_v1",
  REQUEST_MARKER_LISTS_V1 = "request_marker_lists_v1",
  LIFECYCLE_WAKEUP_SOURCE_V1 = "lifecycle_wakeup_source_v1",
  INTERRUPT_CANCEL_QUEUED_V1 = "interrupt_cancel_queued_v1",
  INTERRUPT_REQUEUE_TAKEN_V1 = "interrupt_requeue_taken_v1",
  INTERRUPT_SEND_NOW_V1 = "interrupt_send_now_v1",
  BACKGROUND_TASKS_MOVES_BASH_V1 = "background_tasks_moves_bash_v1",
  TASK_LIST_RESTORE_V1 = "task_list_restore_v1",
  TASK_LIST_RESTORED_V1 = "task_list_restored_v1";
//@ chunk-gr407tas.js:2219-2345 placement
var MCP_READ_RESOURCE_V1 = "mcp_read_resource_v1",
  READ_FILE_AS_WRITTEN_V1 = "read_file_as_written_v1",
  MCP_TOOL_UI_META_V1 = "mcp_tool_ui_meta_v1",
  MCP_CALL_RESULT_NOT_FOR_MODEL_V1 = "mcp_call_result_not_for_model_v1";
//@ chunk-gr407tas.js:2345-2414 placement
function ejn(e) {
  return !e.redactsWhatItPersists && !e.isRemoteTransport;
}
//@ chunk-gr407tas.js:2414-2444 placement
var START_SHELL_TASK_V1 = "start_shell_task_v1";
/**
 * 判断是否提示安装 Linux 沙箱：Linux 下有 Bash 工具、沙箱未就绪且开关开启。
 */
//@ chunk-gr407tas.js:2444-2544 placement
function shouldOfferLinuxSandboxHint(e) {
  return (
    uC() &&
    e.some((r) => toolMatchesName(r, BASH_TOOL_NAME)) &&
    getPlatform() === "linux" &&
    !uf() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_lathe", !0)
  );
}
//@ chunk-gr407tas.js:2544-2651 placement
var UI_SURFACE_V1 = "ui_surface_v1",
  PROMPTS_SCREENED_V1 = "prompts_screened_v1",
  UI_HOOKED_V1 = "ui_hooked_v1",
  ASK_USER_QUESTION_UNANSWERED_V1 = "ask_user_question_unanswered_v1";
//@ chunk-gr407tas.js:2651-2675 placement
function CLs() {
  return [];
}
//@ chunk-gr407tas.js:2675-2707 placement
var RLs = [
  INTERRUPT_RECEIPT_V1,
  INTERRUPT_CANCEL_QUEUED_V1,
  INTERRUPT_SEND_NOW_V1,
  INTERRUPT_REQUEUE_TAKEN_V1,
  MSG_LIFECYCLE_V1,
  REQUEST_MARKER_LISTS_V1,
  ASK_USER_QUESTION_UNANSWERED_V1,
];
/**
 * 把插件信息转为 system/init 中的插件条目（名称、路径、来源与版本）。
 */
//@ chunk-gr407tas.js:2707-2819 placement
function toPluginInitInfo(e) {
  let r = cleanOptionalText(e.manifest.version);
  return { name: e.name, path: e.path, source: e.source, ...(r && { version: r }) };
}
//@ chunk-gr407tas.js:2819-2888 placement
function njn() {
  try {
    return isPolicyVerdictAbsent() || hasComplianceTaint("hipaa");
  } catch (error) {
    return (logError(error), !0);
  }
}
/**
 * 构造 SDK system/init 消息的会话字段：cwd、会话 id、API key 来源、beta、输出样式、遥测/反馈开关、记忆路径、scratchpad、原始 cwd、消息套接字、worker 纪元、PowerShell 路径与底栏指示。
 */
//@ chunk-gr407tas.js:2888-3439 placement
function buildSystemInitFields() {
  let e = getSettings_DEPRECATED(),
    r;
  if (isAutoMemoryEnabled()) {
    if (((r = { auto: getAutoMemPath() }), a4())) r.team = getMemoryDirNfc();
  }
  let a;
  a = require("./chunk-cgamr0t5.js").getUdsMessagingSocketPath();
  let s = getSessionId();
  return {
    cwd: gl() ?? "",
    sessionId: s,
    apiKeySource: getApiKeySourceSafe(),
    betas: getSdkBetas(),
    outputStyle: e?.outputStyle ?? DEFAULT,
    analyticsDisabled: isFirstPartyTelemetryBlocked(),
    productFeedbackDisabled: !isPolicyAllowed("allow_product_feedback"),
    memoryPaths: r,
    scratchpadPath: isScratchpadEnabled() ? (getScratchpadDir(s) ?? void 0) : void 0,
    originalCwd: njn() ? void 0 : (getOriginalCwdOrNull() ?? void 0),
    messagingSocketPath: a,
    workerEpoch: isViolinWoodEnabledCached() ? env.CLAUDE_CODE_WORKER_EPOCH : void 0,
    powerShellPath: getPlatform() === "windows" ? getResolvedPowerShellPath() : void 0,
    footerIndicator: getFooterIndicator(),
  };
}
/**
 * 构造远程工具机场景下的 system/init 会话字段：cwd 取工具机目录，本地专属字段（记忆路径、scratchpad、套接字等）置空。
 */
//@ chunk-gr407tas.js:3439-3839 placement
function buildRemoteSystemInitFields() {
  let e = buildSystemInitFields();
  return {
    cwd: getToolsMachine()?.directory?.path ?? "",
    sessionId: e.sessionId,
    apiKeySource: e.apiKeySource,
    betas: void 0,
    outputStyle: e.outputStyle,
    analyticsDisabled: e.analyticsDisabled,
    productFeedbackDisabled: e.productFeedbackDisabled,
    memoryPaths: void 0,
    scratchpadPath: void 0,
    originalCwd: void 0,
    messagingSocketPath: void 0,
    workerEpoch: e.workerEpoch,
    powerShellPath: void 0,
    footerIndicator: void 0,
  };
}
/**
 * buildSystemInitMessage：SDK 首条 system/init 消息，列出工具、MCP 服务器状态（含失败的）、可调用的终端命令、模型、权限模式、代理/技能/插件、fast mode 与能力等。
 */
//@ chunk-gr407tas.js:3839-6391 fingerprint = buildSystemInitMessage (0.368)
function buildSystemInitMessage(inputs) {
  let r = new Set(inputs.mcpClients.map((mcpClient) => mcpClient.name)),
    filtered = inputs.mcpServerErrors.filter((mcpServerError) => !r.has(mcpServerError.name)),
    mapped = inputs.commands
      .filter((command) => command.userInvocable !== !1 && command.terminalOriented === !0)
      .map((t) => t.name),
    n = {
      type: "system",
      subtype: "init",
      cwd: inputs.cwd,
      session_id: inputs.sessionId,
      tools: inputs.tools.map((tool) => fon(tool.name)),
      mcp_servers: inputs.mcpClients.map((mcpClient) => ({
        name: mcpClient.name,
        status: Kgt(mcpClient.type),
        ...(mcpClient.source !== void 0 && { source: mcpClient.source }),
      })),
      model: inputs.model,
      permissionMode: toExternalPermissionMode(inputs.permissionMode),
      slash_commands: inputs.commands
        .filter((tool) => tool.userInvocable !== !1)
        .map((client) => client.name),
      ...(mapped.length > 0 && { terminal_slash_commands: mapped }),
      apiKeySource: inputs.apiKeySource,
      betas: inputs.betas,
      claude_code_version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      output_style: inputs.outputStyle,
      agents: inputs.agents.map((agent) => agent.agentType),
      skills: Ji(inputs.skills, "name")
        .filter((t) => t.userInvocable !== !1)
        .map((agent) => agent.name),
      plugins: inputs.plugins.map(toPluginInitInfo),
      ...(inputs.pluginErrors.length > 0 && {
        plugin_errors: inputs.pluginErrors.map((pluginError) => ({ ...pluginError })),
      }),
      ...(inputs.pluginWarnings.length > 0 && {
        plugin_warnings: inputs.pluginWarnings.map((skill) => ({ ...skill })),
      }),
      ...(inputs.capabilities && { capabilities: [...inputs.capabilities] }),
      ...(filtered.length > 0 && { mcp_server_errors: filtered.map((plugin) => ({ ...plugin })) }),
      analytics_disabled: inputs.analyticsDisabled,
      product_feedback_disabled: inputs.productFeedbackDisabled,
      uuid: randomUUID(),
    };
  if (inputs.memoryPaths) n.memory_paths = { ...inputs.memoryPaths };
  if (inputs.scratchpadPath !== void 0) n.scratchpad_path = inputs.scratchpadPath;
  if (inputs.originalCwd !== void 0) n.original_cwd = inputs.originalCwd;
  if (inputs.additionalDirectories !== void 0) n.additional_directories = [...inputs.additionalDirectories];
  if (inputs.workerEpoch !== void 0 && inputs.workerEpoch >= 1) n.worker_epoch = inputs.workerEpoch;
  if (inputs.messagingSocketPath !== void 0) n.messaging_socket_path = inputs.messagingSocketPath;
  if (
    ((n.fast_mode_state = inputs.fastModeState),
    (n.fast_mode_disabled_reason = inputs.fastModeDisabledReason),
    inputs.footerIndicator)
  )
    n.footer_indicator = { ...inputs.footerIndicator };
  if (inputs.effort !== void 0) n.effort = inputs.effort;
  if (inputs.perTurnEffortActive !== void 0) n.per_turn_effort_active = inputs.perTurnEffortActive;
  if (inputs.ultrathinkAvailable !== void 0) n.ultrathink_available = inputs.ultrathinkAvailable;
  if (inputs.viewMode !== void 0) n.view_mode = inputs.viewMode;
  if (inputs.powerShellPath !== void 0) n.powershell_path = inputs.powerShellPath;
  return n;
}
/**
 * 记录 system/init 发出耗时与首次初始化打点，并附上启动计时信息。
 */
//@ chunk-gr407tas.js:6391-6504 placement
function recordInitTiming(e, r) {
  (Br("init_emit_ms", performance.now() - r, r), logStartupTiming("first_init"));
  let a = dyi();
  if (a) e.startup_timing = a;
}

export {
  BACKGROUND_TASKS_MOVES_BASH_V1,
  INTERRUPT_SEND_NOW_V1,
  buildSystemInitMessage,
  buildRemoteSystemInitFields,
  ASK_USER_QUESTION_UNANSWERED_V1,
  resolveFooterIndicator,
  shouldOfferLinuxSandboxHint,
  toPluginInitInfo,
  ejn,
  getFooterIndicator,
  MCP_CALL_RESULT_NOT_FOR_MODEL_V1,
  START_SHELL_TASK_V1,
  fon,
  njn,
  buildSystemInitFields,
  RLs,
  LIFECYCLE_WAKEUP_SOURCE_V1,
  TASK_LIST_RESTORE_V1,
  TASK_LIST_RESTORED_V1,
  MCP_READ_RESOURCE_V1,
  MCP_TOOL_UI_META_V1,
  READ_FILE_AS_WRITTEN_V1,
  CLs,
  recordInitTiming,
  UI_SURFACE_V1,
  PROMPTS_SCREENED_V1,
  UI_HOOKED_V1,
  INTERRUPT_RECEIPT_V1,
  MSG_LIFECYCLE_V1,
};
