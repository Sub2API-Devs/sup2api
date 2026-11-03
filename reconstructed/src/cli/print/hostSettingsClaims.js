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
import { Z_e } from "../../utils/permissions/permissionPromptHost.js";
import { _Fo } from "../../utils/hooks/hookMessages.js";

//@ chunk-tyg7f3ek.js:510177-512319 placement
var SDK_REQUESTS_ALLOWED_BEFORE_CLAIM = {
    claim_session: !0,
    initialize: !0,
    interrupt: !0,
    end_session: !0,
    cancel_async_message: !0,
    set_permission_mode: !0,
    set_model: !0,
    set_max_thinking_tokens: !0,
    apply_flag_settings: !0,
    set_mcp_permission_mode_override: !0,
    reload_plugins: !0,
    reload_skills: !0,
    reload_output_styles: !0,
    claude_authenticate: !0,
    claude_oauth_callback: !0,
    claude_oauth_wait_for_completion: !0,
    mcp_authenticate: !0,
    mcp_oauth_callback_url: !0,
    mcp_clear_auth: !0,
    register_device_hooks: !0,
    upload_device_hook_template: !0,
    remote_tools_announce: !0,
    set_chrome_browser_hints: !0,
    select_chrome_browser: !0,
    set_prompt_suggestions_paused: !0,
    rename_session: !0,
    generate_session_title: !0,
    message_rated: !0,
    submit_feedback: !0,
    submit_survey_feedback: !0,
    mcp_status: !0,
    get_context_usage: !0,
    get_usage: !0,
    get_session_cost: !0,
    list_models: !0,
    get_binary_version: !0,
    get_settings: !0,
    get_hooks_listing: !0,
    list_permission_rules: !0,
    get_status: !0,
    get_plan: !0,
    stop_task: !0,
    background_tasks: !0,
    get_memory_dialog: !0,
    get_skills_dialog: !0,
    get_chrome_dialog: !0,
    get_chrome_browsers: !0,
    get_sandbox_dialog: !0,
    export_conversation: !0,
    set_cwd: !1,
    update_settings: !1,
    add_directory: !1,
    register_repo_root: !1,
    seed_read_state: !1,
    stage_file: !1,
    read_file: !1,
    get_task_output: !1,
    list_directory: !1,
    start_shell_task: !1,
    file_suggestions: !1,
    get_workspace_diff: !1,
    rewind_files: !1,
    list_cloud_sessions: !1,
    get_cloud_session: !1,
    get_cloud_session_transcript: !1,
    mcp_set_servers: !1,
    mcp_reconnect: !1,
    mcp_toggle: !1,
    mcp_read_resource: !1,
    mcp_call: !1,
    side_question: !1,
    ultrareview_launch: !1,
    fork_conversation: !1,
    rewind_conversation: !1,
    poll_event: !1,
    prefetch_attachments: !1,
    send_task_message: !1,
    mcp_tasks_changed: !1,
    channel_enable: !1,
    remote_control: !1,
    set_color: !1,
    turn_handoff: !1,
    ui_attach: !1,
    ui_detach: !1,
    ui_render: !1,
    ui_press: !1,
    ui_input: !1,
    ui_select: !1,
    ui_panes: !1,
    ui_pane_show: !1,
    ui_pane_focus: !1,
    ui_close: !1,
    ui_scroll: !1,
    ui_focus: !1,
    ui_prompt_edit: !1,
    ui_prompt_autocomplete: !1,
    ui_client_module: !1,
    ui_client_press: !1,
    ui_message: !1,
    ui_client_fault: !1,
  },
  hO = "not_claimed: this process is a spare waiting for claim_session; send this request after the claim",
  _O = "not_claimed: the claim of this spare failed; discard the process and start the session cold";
//@ chunk-tyg7f3ek.js:512319-512391 placement
function isAllowedBeforeClaim(e) {
  return typeof e === "string" && Object.hasOwn(SDK_REQUESTS_ALLOWED_BEFORE_CLAIM, e)
    ? SDK_REQUESTS_ALLOWED_BEFORE_CLAIM[e]
    : !0;
}
//@ chunk-tyg7f3ek.js:512391-512424 placement
var FLAG_SETTINGS_PLUGIN_KEYS = [...MCP_POLICY_SETTING_KEYS, "enabledPlugins"];
//@ chunk-tyg7f3ek.js:512424-513063 placement
class FlagSettingsClaimTracker {
  latestRequestId;
  latestRefusal;
  unanswered = new Set();
  received(e) {
    ((this.latestRequestId = e), (this.latestRefusal = void 0), this.unanswered.add(e));
  }
  answered(e, n) {
    if ((this.unanswered.delete(e), e === this.latestRequestId)) this.latestRefusal = n;
  }
  claimRefusal() {
    if (this.unanswered.size > 0)
      return "an earlier apply_flag_settings is still unanswered; claim again once it is answered";
    if (this.latestRefusal !== void 0) return this.latestRefusal;
    let e = getFlagSettingsInline() ?? {};
    for (let n of FLAG_SETTINGS_PLUGIN_KEYS) {
      if (!(n in e)) continue;
      let r = { [n]: e[n] };
      if (
        (coerceStringListSettings(r),
        flagInlineSettingDropped(n) || !getSettingsSchemaForDocument(r).safeParse(r).success)
      )
        return `the flag settings' ${n} would not be in force, because it or another key is invalid`;
    }
    return;
  }
}
//@ chunk-tyg7f3ek.js:513063-513116 placement
var MODEL_DATE_SUFFIX_RE = /-\d{8}$/,
  z$ = /^(claude-[a-z0-9-]+)(\[1m\])?$/;
//@ chunk-tyg7f3ek.js:513116-513278 placement
function isAutoModeCapableModel(e) {
  let n = z$.exec(e)?.[1];
  if (n === void 0 || n.includes("-fast")) return !1;
  let r = firstPartyNameToCanonical(n);
  return (
    n.replace(MODEL_DATE_SUFFIX_RE, "") === r &&
    isRecognizedCanonical(r) &&
    !isOlderModelThan(r, "claude-opus-4-6") &&
    modelSupportsAutoMode(e)
  );
}
/**
 * SDK claude_authenticate：校验新登录的组织策略/托管设置，通过后切换凭证。
 */
//@ chunk-tyg7f3ek.js:513278-513584 placement
async function sdkClaudeAuthenticate(e) {
  let n = await checkLoginAllowed({
    accessToken: e.accessToken,
    newLogin: e,
    untieredLogin: needsProfileVerification(e),
    organizationName: e.profile?.organization.name ?? e.tokenAccount?.organizationName,
  });
  if (n.ok) return;
  logFeatureBad("sdk_claude_authenticate", gateBlockReasonCode(n.evaluation.decision));
  let r = await revokeRefusedSignInToken(e);
  return `${loginBlockedMessage(loginSettingsOutcome(n.evaluation))} ${r}`;
}
//@ chunk-tyg7f3ek.js:513584-514533 placement
function loginBlockedMessage(e) {
  switch (e) {
    case "refused":
      return "Login blocked: Anthropic refused this organization's policy or managed settings for this sign-in (expired session, or the organization does not allow Claude Code for this account). Run claude auth login from a terminal for details.";
    case "not_loaded_in_launch_mode":
      return "Login blocked: Claude Code does not load an organization's managed settings in the mode this process was launched in (CLAUDE_CODE_ENTRYPOINT or a remote-session variable names a hosted surface), and the organization requires them before a session can start. A retry here cannot help; start Claude Code without that variable and sign in there.";
    case "unavailable":
      return "Login blocked: your organization's policy and managed settings could not be loaded, and the organization requires them before a session can start. Retry shortly, and check the network or proxy if it persists; run claude auth login from a terminal for details.";
  }
}
//@ chunk-tyg7f3ek.js:514533-514934 placement
var SDK_HOOK_RECONNECT_TEXT =
    "The SDK host reconnected before its PreToolUse hook answered, so this tool call was not executed. No one denied it; retry the same tool call.",
  Z$ =
    "The SDK host that registered this PreModelSwitch hook re-initialized before answering; the model was not switched. Retry the switch.",
  wO =
    "The SDK host reconnected before its prompt hook answered, so this prompt was not submitted. Send it again.";
//@ chunk-tyg7f3ek.js:514934-515537 placement
function sdkHookReconnectFallback(e) {
  switch (e.hook_event_name) {
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
          permissionDecisionReason: Z$,
        },
      };
    case "UserPromptSubmit":
      return {
        decision: "block",
        reason: wO,
        hookSpecificOutput: { hookEventName: "UserPromptSubmit", suppressOriginalPrompt: !0 },
      };
    case "UserPromptExpansion":
      return {
        decision: "block",
        reason: wO,
        hookSpecificOutput: { hookEventName: "UserPromptExpansion", suppressOriginalPrompt: !0 },
      };
    default:
      return {};
  }
}
//@ chunk-tyg7f3ek.js:515537-516032 placement
function buildSdkHookRegistrations(e, n, r) {
  let s = {};
  for (let [y, S] of Object.entries(e)) {
    if (S.length === 0) continue;
    s[y] = S.map((R) => ({
      matcher: R.matcher ?? void 0,
      hooks: R.hookCallbackIds.map((hookCallbackId) => n(hookCallbackId, R.timeout)),
      origin: "sdkHost",
      ...(r.hostOwnsStdinOrigin && { hostOwnsStdin: !0 }),
    }));
  }
  let h = getRegisteredHooks();
  if (h) {
    let y = {},
      S = !1;
    for (let [R, w] of Object.entries(h)) {
      let filtered = w.filter((L) => !("origin" in L && L.origin === "sdkHost"));
      if (((S ||= filtered.length !== w.length), filtered.length > 0)) y[R] = filtered;
    }
    if (S) {
      if ((clearRegisteredHooks(), Object.keys(y).length > 0)) registerHookCallbacks(y);
    }
  }
  if (Object.keys(s).length > 0) registerHookCallbacks(s);
}
//@ chunk-tyg7f3ek.js:516032-516157 placement
function hasSdkHostHooks() {
  let e = getRegisteredHooks();
  if (!e) return !1;
  return Object.values(e).some((n) => n.some((r) => "origin" in r && r.origin === "sdkHost"));
}
//@ chunk-tyg7f3ek.js:516157-516218 placement
function sdkHooksIfHostOwnsStdin(e, n) {
  return n.hostOwnsStdinOrigin ? e.hooks : void 0;
}
//@ chunk-tyg7f3ek.js:516218-516367 placement
function withHostWordedAsks(e, n, r) {
  return n.hostOwnsStdinOrigin && r.permissionPromptToolName === "stdio" && !Z_e(r.permissionPrompts) && _Fo()
    ? { ...e, host_worded_asks: !0 }
    : e;
}
//@ chunk-tyg7f3ek.js:516409-516479 placement
function mcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}

export {
  isAutoModeCapableModel,
  FlagSettingsClaimTracker,
  isAllowedBeforeClaim,
  _O,
  hO,
  hasSdkHostHooks,
  withHostWordedAsks,
  sdkClaudeAuthenticate,
  sdkHooksIfHostOwnsStdin,
  sdkHookReconnectFallback,
  buildSdkHookRegistrations,
  mcpClientModule,
};
