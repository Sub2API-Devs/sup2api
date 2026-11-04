/**
 * cli/print/hostSettingsClaims.ts
 *
 * 2.1.316 新增：宿主设置认领跟踪、登录受阻消息与 SDK 钩子注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (15)
 * attribution: placement 15
 */
import { MCP_POLICY_SETTING_KEYS } from "../../services/mcp/config.js";
import {
  getFlagSettingsInline,
  getRegisteredHooks,
  clearRegisteredHooks,
  registerHookCallbacks,
} from "../../bootstrap/state.js";
import { coerceStringListSettings } from "../../utils/settings/hooksValidation.js";
import { flagInlineSettingDropped } from "../../utils/settings/settings.js";
import { getSettingsSchemaForDocument } from "../../utils/settings/types.js";
import { firstPartyNameToCanonical } from "../../utils/model/modelFallback.js";
import { isRecognizedCanonical } from "../../utils/model/canonicalModelName.js";
import { isOlderModelThan, modelSupportsAutoMode } from "../../utils/betas.js";
import {
  checkLoginAllowed,
  needsProfileVerification,
  revokeRefusedSignInToken,
  loginSettingsOutcome,
} from "../../services/oauth/refusedSignIn.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { gateBlockReasonCode } from "../../services/policyLimits/orgConfigGate.js";
import { isNoPromptHost } from "../../utils/permissions/permissionPromptHost.js";
import { isHostDisplayFeatureOn } from "../../utils/hooks/hookMessages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:510177-512319 placement
/**
 * 备用进程（spare）在未被 claim_session 前收到请求的拒绝文本：等待认领 / 认领失败需冷启动。
 */
var SDK_REQUESTS_ALLOWED_BEFORE_CLAIM = {
  claim_session: true,
  initialize: true,
  interrupt: true,
  end_session: true,
  cancel_async_message: true,
  set_permission_mode: true,
  set_model: true,
  set_max_thinking_tokens: true,
  apply_flag_settings: true,
  set_mcp_permission_mode_override: true,
  reload_plugins: true,
  reload_skills: true,
  reload_output_styles: true,
  claude_authenticate: true,
  claude_oauth_callback: true,
  claude_oauth_wait_for_completion: true,
  mcp_authenticate: true,
  mcp_oauth_callback_url: true,
  mcp_clear_auth: true,
  register_device_hooks: true,
  upload_device_hook_template: true,
  remote_tools_announce: true,
  set_chrome_browser_hints: true,
  select_chrome_browser: true,
  set_prompt_suggestions_paused: true,
  rename_session: true,
  generate_session_title: true,
  message_rated: true,
  submit_feedback: true,
  submit_survey_feedback: true,
  mcp_status: true,
  get_context_usage: true,
  get_usage: true,
  get_session_cost: true,
  list_models: true,
  get_binary_version: true,
  get_settings: true,
  get_hooks_listing: true,
  list_permission_rules: true,
  get_status: true,
  get_plan: true,
  stop_task: true,
  background_tasks: true,
  get_memory_dialog: true,
  get_skills_dialog: true,
  get_chrome_dialog: true,
  get_chrome_browsers: true,
  get_sandbox_dialog: true,
  export_conversation: true,
  set_cwd: false,
  update_settings: false,
  add_directory: false,
  register_repo_root: false,
  seed_read_state: false,
  stage_file: false,
  read_file: false,
  get_task_output: false,
  list_directory: false,
  start_shell_task: false,
  file_suggestions: false,
  get_workspace_diff: false,
  rewind_files: false,
  list_cloud_sessions: false,
  get_cloud_session: false,
  get_cloud_session_transcript: false,
  mcp_set_servers: false,
  mcp_reconnect: false,
  mcp_toggle: false,
  mcp_read_resource: false,
  mcp_call: false,
  side_question: false,
  ultrareview_launch: false,
  fork_conversation: false,
  rewind_conversation: false,
  poll_event: false,
  prefetch_attachments: false,
  send_task_message: false,
  mcp_tasks_changed: false,
  channel_enable: false,
  remote_control: false,
  set_color: false,
  turn_handoff: false,
  ui_attach: false,
  ui_detach: false,
  ui_render: false,
  ui_press: false,
  ui_input: false,
  ui_select: false,
  ui_panes: false,
  ui_pane_show: false,
  ui_pane_focus: false,
  ui_close: false,
  ui_scroll: false,
  ui_focus: false,
  ui_prompt_edit: false,
  ui_prompt_autocomplete: false,
  ui_client_module: false,
  ui_client_press: false,
  ui_message: false,
  ui_client_fault: false,
};
var SPARE_NOT_CLAIMED_TEXT =
  "not_claimed: this process is a spare waiting for claim_session; send this request after the claim";
var SPARE_CLAIM_FAILED_TEXT =
  "not_claimed: the claim of this spare failed; discard the process and start the session cold";
//@ chunk-tyg7f3ek.js:512319-512391 placement
function isAllowedBeforeClaim(subtype) {
  return typeof subtype === "string" && Object.hasOwn(SDK_REQUESTS_ALLOWED_BEFORE_CLAIM, subtype)
    ? SDK_REQUESTS_ALLOWED_BEFORE_CLAIM[subtype]
    : true;
}
//@ chunk-tyg7f3ek.js:512391-512424 placement
var FLAG_SETTINGS_PLUGIN_KEYS; // deferred: uses MCP_POLICY_SETTING_KEYS (../../services/mcp/config.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:512391", () => {
  FLAG_SETTINGS_PLUGIN_KEYS = [...MCP_POLICY_SETTING_KEYS, "enabledPlugins"];
});
//@ chunk-tyg7f3ek.js:512424-513063 placement
class FlagSettingsClaimTracker {
  latestRequestId;
  latestRefusal;
  unanswered = new Set();
  received(requestId) {
    this.latestRequestId = requestId;
    this.latestRefusal = undefined;
    this.unanswered.add(requestId);
  }
  answered(requestId, latestRefusal) {
    this.unanswered.delete(requestId);
    if (requestId === this.latestRequestId) this.latestRefusal = latestRefusal;
  }
  claimRefusal() {
    if (this.unanswered.size > 0)
      return "an earlier apply_flag_settings is still unanswered; claim again once it is answered";
    if (this.latestRefusal !== undefined) return this.latestRefusal;
    let flagSettings = getFlagSettingsInline() ?? {};
    for (let key of FLAG_SETTINGS_PLUGIN_KEYS) {
      if (!(key in flagSettings)) continue;
      let subset = {
        [key]: flagSettings[key],
      };
      coerceStringListSettings(subset);
      if (flagInlineSettingDropped(key) || !getSettingsSchemaForDocument(subset).safeParse(subset).success)
        return `the flag settings' ${key} would not be in force, because it or another key is invalid`;
    }
    return;
  }
}
//@ chunk-tyg7f3ek.js:513063-513116 placement
var MODEL_DATE_SUFFIX_RE = /-\d{8}$/;
var MODEL_WITH_1M_SUFFIX_PATTERN = /^(claude-[a-z0-9-]+)(\[1m\])?$/;
//@ chunk-tyg7f3ek.js:513116-513278 placement
function isAutoModeCapableModel(model) {
  let baseModel = MODEL_WITH_1M_SUFFIX_PATTERN.exec(model)?.[1];
  if (baseModel === undefined || baseModel.includes("-fast")) return false;
  let canonical = firstPartyNameToCanonical(baseModel);
  return (
    baseModel.replace(MODEL_DATE_SUFFIX_RE, "") === canonical &&
    isRecognizedCanonical(canonical) &&
    !isOlderModelThan(canonical, "claude-opus-4-6") &&
    modelSupportsAutoMode(model)
  );
}
//@ chunk-tyg7f3ek.js:513278-513584 placement
/**
 * SDK claude_authenticate：校验新登录的组织策略/托管设置，通过后切换凭证。
 */
async function sdkClaudeAuthenticate(err) {
  let gate = await checkLoginAllowed({
    accessToken: err.accessToken,
    newLogin: err,
    untieredLogin: needsProfileVerification(err),
    organizationName: err.profile?.organization.name ?? err.tokenAccount?.organizationName,
  });
  if (gate.ok) return;
  logFeatureBad("sdk_claude_authenticate", gateBlockReasonCode(gate.evaluation.decision));
  let revokeMessage = await revokeRefusedSignInToken(err);
  return `${loginBlockedMessage(loginSettingsOutcome(gate.evaluation))} ${revokeMessage}`;
}
//@ chunk-tyg7f3ek.js:513584-514533 placement
function loginBlockedMessage(outcome) {
  switch (outcome) {
    case "refused":
      return "Login blocked: Anthropic refused this organization's policy or managed settings for this sign-in (expired session, or the organization does not allow Claude Code for this account). Run claude auth login from a terminal for details.";
    case "not_loaded_in_launch_mode":
      return "Login blocked: Claude Code does not load an organization's managed settings in the mode this process was launched in (CLAUDE_CODE_ENTRYPOINT or a remote-session variable names a hosted surface), and the organization requires them before a session can start. A retry here cannot help; start Claude Code without that variable and sign in there.";
    case "unavailable":
      return "Login blocked: your organization's policy and managed settings could not be loaded, and the organization requires them before a session can start. Retry shortly, and check the network or proxy if it persists; run claude auth login from a terminal for details.";
  }
}
//@ chunk-tyg7f3ek.js:514533-514934 placement
/**
 * SDK 宿主在 PreModelSwitch 与 prompt 钩子期间重连时给用户的两条说明：模型未切换、提示未提交，可重试。
 */
var SDK_HOOK_RECONNECT_TEXT =
  "The SDK host reconnected before its PreToolUse hook answered, so this tool call was not executed. No one denied it; retry the same tool call.";
var SDK_PRE_MODEL_SWITCH_RECONNECT_TEXT =
  "The SDK host that registered this PreModelSwitch hook re-initialized before answering; the model was not switched. Retry the switch.";
var SDK_PROMPT_HOOK_RECONNECT_TEXT =
  "The SDK host reconnected before its prompt hook answered, so this prompt was not submitted. Send it again.";
//@ chunk-tyg7f3ek.js:514934-515537 placement
function sdkHookReconnectFallback(hookInput) {
  switch (hookInput.hook_event_name) {
    case "PreToolUse":
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: SDK_HOOK_RECONNECT_TEXT,
        },
      };
    case "PreModelSwitch":
      return {
        hookSpecificOutput: {
          hookEventName: "PreModelSwitch",
          permissionDecision: "deny",
          permissionDecisionReason: SDK_PRE_MODEL_SWITCH_RECONNECT_TEXT,
        },
      };
    case "UserPromptSubmit":
      return {
        decision: "block",
        reason: SDK_PROMPT_HOOK_RECONNECT_TEXT,
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          suppressOriginalPrompt: true,
        },
      };
    case "UserPromptExpansion":
      return {
        decision: "block",
        reason: SDK_PROMPT_HOOK_RECONNECT_TEXT,
        hookSpecificOutput: {
          hookEventName: "UserPromptExpansion",
          suppressOriginalPrompt: true,
        },
      };
    default:
      return {};
  }
}
//@ chunk-tyg7f3ek.js:515537-516032 placement
function buildSdkHookRegistrations(hooksByEvent, makeHook, options) {
  let registrations = {};
  for (let [key, value] of Object.entries(hooksByEvent)) {
    if (value.length === 0) continue;
    registrations[key] = value.map((registration) => ({
      matcher: registration.matcher ?? undefined,
      hooks: registration.hookCallbackIds.map((hookCallbackId) =>
        makeHook(hookCallbackId, registration.timeout),
      ),
      origin: "sdkHost",
      ...(options.hostOwnsStdinOrigin && {
        hostOwnsStdin: true,
      }),
    }));
  }
  let registeredHooks = getRegisteredHooks();
  if (registeredHooks) {
    let kept = {};
    let removedAny = false;
    for (let [key, value] of Object.entries(registeredHooks)) {
      let filtered = value.filter(
        (registration) => !("origin" in registration && registration.origin === "sdkHost"),
      );
      removedAny ||= filtered.length !== value.length;
      if (filtered.length > 0) kept[key] = filtered;
    }
    if (removedAny) {
      clearRegisteredHooks();
      if (Object.keys(kept).length > 0) registerHookCallbacks(kept);
    }
  }
  if (Object.keys(registrations).length > 0) registerHookCallbacks(registrations);
}
//@ chunk-tyg7f3ek.js:516032-516157 placement
function hasSdkHostHooks() {
  let registeredHooks = getRegisteredHooks();
  if (!registeredHooks) return false;
  return Object.values(registeredHooks).some((registrations) =>
    registrations.some((registration) => "origin" in registration && registration.origin === "sdkHost"),
  );
}
//@ chunk-tyg7f3ek.js:516157-516218 placement
function sdkHooksIfHostOwnsStdin(initialize, options) {
  return options.hostOwnsStdinOrigin ? initialize.hooks : undefined;
}
//@ chunk-tyg7f3ek.js:516218-516367 placement
function withHostWordedAsks(payload, options, host) {
  return options.hostOwnsStdinOrigin &&
    host.permissionPromptToolName === "stdio" &&
    !isNoPromptHost(host.permissionPrompts) &&
    isHostDisplayFeatureOn()
    ? {
        ...payload,
        host_worded_asks: true,
      }
    : payload;
}
//@ chunk-tyg7f3ek.js:516409-516479 placement
function mcpClientModule() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
export {
  isAutoModeCapableModel,
  FlagSettingsClaimTracker,
  isAllowedBeforeClaim,
  SPARE_CLAIM_FAILED_TEXT,
  SPARE_NOT_CLAIMED_TEXT,
  hasSdkHostHooks,
  withHostWordedAsks,
  sdkClaudeAuthenticate,
  sdkHooksIfHostOwnsStdin,
  sdkHookReconnectFallback,
  buildSdkHookRegistrations,
  mcpClientModule,
};
