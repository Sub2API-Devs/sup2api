/**
 * utils/background/envCarry.ts
 *
 * 2.1.316 新增。后台会话携带的环境变量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s1nkafe4.js (18)
 * attribution: placement 18
 */
import { createHash } from "crypto";
import { identity } from "../identity.js";
import { isHostEntrypointName, HOST_SKILL_CATALOG_ENV } from "../entrypointKinds.js";
import { isEnvTruthy } from "../envUtils.js";
import { BG_DISPATCHER_IDENTITY_ENV_VARS } from "../subprocessEnv.js";
import { PROVIDER_ENDPOINT_COMPANION_VARS } from "../managedEnvConstants.js";
import { BACKGROUND_ALLOWED_ENV_NAMES } from "../../cli/forwardedFlags.js";
import { pickByHelper } from "../git/gitSafeEnv.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s1nkafe4.js:487-565 placement
/**
 * 携带提示词哈希的版本号（1）。
 */
var CLAUDE_BG_CARRIED_PROMPTS_SHA256; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_CARRIED_PROMPTS_VARIANT;
var carriedPromptHashes;
deferInit("chunk-s1nkafe4.js:487", () => {
  CLAUDE_BG_CARRIED_PROMPTS_SHA256 = "CLAUDE_BG_CARRIED_PROMPTS_SHA256";
  MAX_CARRIED_PROMPTS_VARIANT = 1;
  carriedPromptHashes = identity(new Map(), (_) => _.clear());
});
//@ chunk-s1nkafe4.js:565-624 placement
/**
 * 计算字符串的 sha256 十六进制摘要。
 */
function sha256Hex(_) {
  return createHash("sha256").update(_).digest("hex");
}
//@ chunk-s1nkafe4.js:624-658 placement
/**
 * 记录某会话路径携带的提示词哈希。
 */
function setCarriedPromptHash(jobId, prompts) {
  carriedPromptHashes.set(jobId, sha256Hex(prompts));
}
//@ chunk-s1nkafe4.js:658-726 placement
/**
 * 给后台会话的环境变量对象附加提示词哈希。
 */
function attachCarriedPromptHash(jobId, bridgeReattachEnv) {
  let hash = carriedPromptHashes.get(jobId);
  return hash === undefined
    ? bridgeReattachEnv
    : {
        ...bridgeReattachEnv,
        [CLAUDE_BG_CARRIED_PROMPTS_SHA256]: hash,
      };
}
//@ chunk-s1nkafe4.js:726-754 placement
/**
 * 删除某会话路径的提示词哈希记录。
 */
function dropCarriedPromptHash(jobDir) {
  carriedPromptHashes.delete(jobDir);
}
//@ chunk-s1nkafe4.js:754-824 placement
/**
 * 需要从后台会话环境里去掉的客户端入口名。
 */
var CLIENT_ENTRYPOINT_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s1nkafe4.js:754", () => {
  CLIENT_ENTRYPOINT_NAMES = new Set(["claude-vscode", "claude-desktop", "claude-desktop-3p"]);
});
//@ chunk-s1nkafe4.js:824-1019 placement
function stripInternalEntrypoint(_) {
  let CLAUDE_CODE_ENTRYPOINT = _.CLAUDE_CODE_ENTRYPOINT;
  if (CLAUDE_CODE_ENTRYPOINT !== undefined && CLIENT_ENTRYPOINT_NAMES.has(CLAUDE_CODE_ENTRYPOINT)) {
    delete _.CLAUDE_CODE_ENTRYPOINT;
    if (isHostEntrypointName(CLAUDE_CODE_ENTRYPOINT) && !isEnvTruthy(_.CLAUDE_CODE_HOST_SHORT_TEMP_DIRS))
      _.CLAUDE_CODE_HOST_SHORT_TEMP_DIRS = "0";
  }
}
//@ chunk-s1nkafe4.js:1019-1136 placement
var SAFE_MODE_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_MODE_ENV_KEYS;
deferInit("chunk-s1nkafe4.js:1019", () => {
  SAFE_MODE_ENV_VARS = ["CLAUDE_CODE_SAFE_MODE", "CLAUDE_CODE_SIMPLE", "CLAUDE_CODE_RESTRICTED"];
  SAFE_MODE_ENV_KEYS = new Set(SAFE_MODE_ENV_VARS.map((_) => _.toUpperCase()));
});
//@ chunk-s1nkafe4.js:1136-1218 placement
/**
 * 删除安全模式相关的环境变量。
 */
function stripSafeModeEnvKeys(_) {
  for (let key of Object.keys(_)) if (SAFE_MODE_ENV_KEYS.has(key.toUpperCase())) delete _[key];
}
//@ chunk-s1nkafe4.js:1218-4961 placement
/**
 * 后台会话需要携带的环境变量名单。
 */
var BG_CARRIED_ENV_KEYS_2; // deferred: uses SAFE_MODE_ENV_VARS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s1nkafe4.js:1218", () => {
  BG_CARRIED_ENV_KEYS_2 = [
    ...SAFE_MODE_ENV_VARS,
    "CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG",
    "CLAUDE_CODE_PERSONAL_CONFIG_FIX",
    "CLAUDE_CODE_PERSONAL_HOOKS_OFF",
    "CLAUDE_BG_POST_CLEAR_RESPAWN",
    "CLAUDE_CODE_RESUME_INTERRUPTED_TURN",
    "CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS",
    "CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS",
    "CLAUDE_CODE_RESUME_PROMPT",
    "CLAUDE_CODE_RESUME_REASON",
    "CLAUDE_CODE_SESSION_BEGAN_AS_COPY",
    "CLAUDE_CODE_QUESTION_PREVIEW_FORMAT",
    "CLAUDE_CODE_QUESTION_EXTENDED",
    "CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS",
    "CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES",
    "CLAUDE_CODE_REMOTE_MCP_CONFIG",
    "CLAUDE_CODE_WARN_DISK_FREE_GIB",
    "CLAUDE_CODE_WARN_MEMORY_FREE_GIB",
    "CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY",
    "CLAUDE_CODE_MCP_APPS_HOST",
    "CLAUDE_CODE_UPFRONT_TOOLS",
    "CLAUDE_CODE_ATTACHMENTS_BY_PATH",
    "CLAUDE_CODE_SLEEP_COMPACT",
    "CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS",
    "CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS",
    "CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD",
    "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS",
    "CLAUDE_CODE_PROGRAM_USE_CASE_ID",
    "CLAUDE_CODE_HOST_WORKTREE",
    "CLAUDE_CODE_HOST_WORKTREE_FENCE",
    "CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH",
    "CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH",
    "CLAUDE_CODE_SDK_READS_SESSION_STATE",
    "CLAUDE_CODE_SDK_READS_STARTUP_MARKS",
    "GITHUB_ACTIONS",
    "CLAUDECODE",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_BRIDGE_SESSION_ID",
    "CLAUDE_CODE_CHILD_SESSION",
    "CLAUDE_CODE_SESSION_ATTENDED",
    "CLAUDE_CODE_CHROME_MCP_ORG_DENIED",
    "CLAUDE_CHROME_TAB_GROUP_KEY",
    HOST_SKILL_CATALOG_ENV,
    "CLAUDE_CODE_EXECPATH",
    "CLAUDE_CODE_COWORK_FRAME_ARTIFACTS",
    "CLAUDE_CODE_HOST_SCHEDULED_RUN",
    "CLAUDE_CODE_ARTIFACT_SHARE",
    "CLAUDE_CODE_ARTIFACT_VERSIONS",
    "CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP",
    "CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST",
    "CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED",
    "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
    "CLAUDE_CODE_SKILL_PROPOSALS",
    "CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT",
    "CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT",
    "CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS",
    "CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT",
    "CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT",
    "CLAUDE_RUNNER_UPDATE_BIN",
    "CLAUDE_CODE_EVAL_INTERVIEW_SESSION",
    "CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR",
    "CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH",
    "CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES",
    "CLAUDE_CODE_EVAL_CONFINED",
    "CLAUDE_BG_RV_AUTH",
    "CLAUDE_BG_PTY_AUTH",
    "CLAUDE_BG_SOCKET_TOKENS_PATH",
    "CLAUDE_BG_ISOLATION",
    "CLAUDE_CODE_RESUME_SOURCE_ALIVE",
    "CLAUDE_BG_SESSION_PERMISSION_RULES",
    "CLAUDE_BG_MEMORY_TOGGLED_OFF",
    "CLAUDE_BG_AUTO_MEMORY_OFF",
    "CLAUDE_BG_GATEWAY_WITHHELD",
    "CLAUDE_BG_WORKSPACE_TRUSTED",
    CLAUDE_BG_CARRIED_PROMPTS_SHA256,
    "CLAUDE_CODE_COORDINATOR_MODE",
    "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN",
    "CLAUDE_AX_SCREEN_READER",
    "CLAUDE_CODE_SKIP_PROMPT_HISTORY",
    "ANTHROPIC_MODEL",
    "CLAUDE_CODE_PLUGIN_DIRS",
    "TERM_PROGRAM",
    "TERM_PROGRAM_VERSION",
    "__CFBundleIdentifier",
    "KITTY_WINDOW_ID",
    "WT_SESSION",
    "KONSOLE_VERSION",
    "VTE_VERSION",
    "ZED_TERM",
    "ZELLIJ",
    "TMUX",
    "TMUX_PANE",
    "CLAUDE_CODE_TMUX_SESSION",
    "CLAUDE_CODE_TMUX_PREFIX",
    "CLAUDE_CODE_TMUX_PREFIX_CONFLICTS",
    "STY",
    "CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE",
    "CLAUDE_CODE_RELAUNCH_HOME_TRUST",
    "CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS",
    "CLAUDE_RELAUNCH_SESSION_ADD_DIRS",
    "CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE",
    "CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL",
    "CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED",
    "CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON",
    "LC_TERMINAL",
    "SSH_CONNECTION",
    "SSH_CLIENT",
    "SSH_TTY",
    "COLORFGBG",
    "CURSOR_TRACE_ID",
    "GIT_ASKPASS",
    "SSH_ASKPASS",
    "SSH_ASKPASS_REQUIRE",
    "VSCODE_GIT_ASKPASS_MAIN",
    "VSCODE_GIT_ASKPASS_NODE",
    "VSCODE_GIT_ASKPASS_EXTRA_ARGS",
    "VSCODE_GIT_IPC_HANDLE",
    "TERMINAL_EMULATOR",
    "ITERM_SESSION_ID",
    "GNOME_TERMINAL_SERVICE",
    "XTERM_VERSION",
    "ALACRITTY_LOG",
    "TILIX_ID",
    "TERMINATOR_UUID",
    "ConEmuANSI",
    "ConEmuPID",
    "ConEmuTask",
    "MSYSTEM",
    "CLAUDE_CODE_SSE_PORT",
    "FORCE_CODE_TERMINAL",
  ];
});
//@ chunk-s1nkafe4.js:4961-5043 placement
/**
 * 删除 cowork 宿主相关的环境变量。
 */
function stripCoworkHostEnvKeys(_) {
  for (let key of Object.keys(_)) if (COWORK_HOST_ENV_KEYS.has(key.toUpperCase())) delete _[key];
}
//@ chunk-s1nkafe4.js:5043-5511 placement
/**
 * 沙箱标记、桥接重连等后台会话需要特殊处理的环境变量列表。
 */
var SANDBOX_ENV_VARS; // deferred: uses BG_DISPATCHER_IDENTITY_ENV_VARS (../subprocessEnv.js) of its import cycle while loading; runs once the cycle is complete
var SANDBOX_ENV_KEYS;
var BRIDGE_REATTACH_ENV_VARS;
var BG_INTERNAL_ENV_KEYS;
var BG_CARRIED_INTERNAL_ENV_KEYS;
var BG_SCRUBBED_ENV_VARS;
var BG_SCRUBBED_ENV_KEYS;
deferInit("chunk-s1nkafe4.js:5043", () => {
  SANDBOX_ENV_VARS = ["CLAUDE_CODE_SANDBOXED"];
  SANDBOX_ENV_KEYS = new Set(SANDBOX_ENV_VARS);
  BRIDGE_REATTACH_ENV_VARS = [
    "CLAUDE_BRIDGE_REATTACH_SESSION",
    "CLAUDE_BRIDGE_REATTACH_SEQ",
    "CLAUDE_BRIDGE_REATTACH_GROUPING",
    "CLAUDE_BRIDGE_REATTACH_OWNER_ACCT",
    "CLAUDE_BRIDGE_REATTACH_OWNER_ORG",
    "CLAUDE_BRIDGE_REATTACH_NO_BACKFILL",
    "CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY",
  ];
  BG_INTERNAL_ENV_KEYS = new Set([
    ...BRIDGE_REATTACH_ENV_VARS,
    ...BG_DISPATCHER_IDENTITY_ENV_VARS,
    CLAUDE_BG_CARRIED_PROMPTS_SHA256,
  ]);
  BG_CARRIED_INTERNAL_ENV_KEYS = new Set([...BG_INTERNAL_ENV_KEYS, "CLAUDE_BG_WORKSPACE_TRUSTED"]);
  BG_SCRUBBED_ENV_VARS = [
    ...BG_DISPATCHER_IDENTITY_ENV_VARS,
    "CLAUDE_BG_WORKSPACE_TRUSTED",
    CLAUDE_BG_CARRIED_PROMPTS_SHA256,
    "CLAUDE_BRIDGE_REATTACH_SESSION",
  ];
  BG_SCRUBBED_ENV_KEYS = new Set(BG_SCRUBBED_ENV_VARS);
});
//@ chunk-s1nkafe4.js:5511-5593 placement
/**
 * 删除后台会话需要擦除的环境变量。
 */
function stripBgScrubbedEnvKeys(env) {
  for (let key of Object.keys(env)) if (BG_SCRUBBED_ENV_KEYS.has(key.toUpperCase())) delete env[key];
}
//@ chunk-s1nkafe4.js:5593-5719 placement
function carrySandboxEnv(env, sourceEnv) {
  for (let key of Object.keys(env)) if (SANDBOX_ENV_KEYS.has(key.toUpperCase())) delete env[key];
  for (let envName of SANDBOX_ENV_VARS) {
    let value = sourceEnv[envName];
    if (value) env[envName] = value;
  }
}
//@ chunk-s1nkafe4.js:5719-6515 placement
/**
 * 后台会话需要携带的环境变量键集合。
 */
var BG_PASSTHROUGH_ENV_VARS; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (../managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
var BG_CARRIED_ENV_ALLOWLIST;
var BG_CARRIED_ENV_KEYS;
deferInit("chunk-s1nkafe4.js:5719", () => {
  BG_PASSTHROUGH_ENV_VARS = [
    "PATH",
    "CLAUDE_CODE_EXTRA_BODY",
    "CLAUDE_CODE_AUTO_MODE_MODEL",
    "CLAUDE_CODE_HOST_CREDS_FILE",
    "CLAUDE_CODE_PERSONAL_CONFIG_FIX",
    ...PROVIDER_ENDPOINT_COMPANION_VARS,
  ];
  BG_CARRIED_ENV_ALLOWLIST = new Set([
    ...BACKGROUND_ALLOWED_ENV_NAMES,
    ...BG_PASSTHROUGH_ENV_VARS,
    "CLAUDE_CODE_DISABLE_PROACTIVITY",
    "CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG",
    "CLAUDE_CODE_AUTO_MODE_SERVER",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS",
    "CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS",
    "CLAUDE_CODE_DISABLE_FILE_MENTIONS",
    "CLAUDE_CODE_DISABLE_MCP_TASKS",
    "CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES",
    "CLAUDE_CODE_HOST_SHORT_TEMP_DIRS",
    "CLAUDE_CODE_AUTO_MODE_TIER",
    "CLAUDE_BG_ISOLATION",
    "CLAUDE_BG_SESSION_PERMISSION_RULES",
    "CLAUDE_BG_MEMORY_TOGGLED_OFF",
    "CLAUDE_BG_AUTO_MEMORY_OFF",
    "CLAUDE_BG_GATEWAY_WITHHELD",
    "CLAUDE_CODE_RESUME_SOURCE_ALIVE",
    "CLAUDE_CODE_PLUGIN_DIRS",
  ]);
  BG_CARRIED_ENV_KEYS = new Set(
    [...BG_CARRIED_ENV_ALLOWLIST].filter((_) => !BG_PASSTHROUGH_ENV_VARS.includes(_)),
  );
});
//@ chunk-s1nkafe4.js:6515-6562 placement
/**
 * 只保留允许名单里的环境变量。
 */
function pickAllowedEnv(object, allowedKeys) {
  return pickByHelper(object, (key, propName) => allowedKeys.has(propName));
}
//@ chunk-s1nkafe4.js:6562-6653 placement
/**
 * 把需要原样携带的内部环境变量复制到目标环境。
 */
function copyCarriedInternalEnv(bgSessionEnv, sourceEnv) {
  if (sourceEnv === undefined) return;
  for (let [key, value] of Object.entries(sourceEnv))
    if (BG_CARRIED_INTERNAL_ENV_KEYS.has(key)) bgSessionEnv[key] = value;
}
//@ chunk-s1nkafe4.js:6653-8134 placement
var COWORK_HOST_ENV_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s1nkafe4.js:6653", () => {
  COWORK_HOST_ENV_KEYS = new Set([
    "CLAUDE_CODE_PROGRAM_USE_CASE_ID",
    "CLAUDE_CODE_COWORK_FRAME_ARTIFACTS",
    "CLAUDE_CODE_HOST_SCHEDULED_RUN",
    "CLAUDE_CODE_ARTIFACT_SHARE",
    "CLAUDE_CODE_ARTIFACT_VERSIONS",
    "CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP",
    "CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST",
    "CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT",
    "CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT",
    "CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS",
    "CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT",
    "CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT",
    "CLAUDE_CODE_QUESTION_EXTENDED",
    "CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS",
    "CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES",
    "CLAUDE_CODE_REMOTE_MCP_CONFIG",
    "CLAUDE_CODE_WARN_DISK_FREE_GIB",
    "CLAUDE_CODE_WARN_MEMORY_FREE_GIB",
    "CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY",
    "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS",
    "CLAUDE_CODE_MCP_APPS_HOST",
    "CLAUDE_CODE_UPFRONT_TOOLS",
    "CLAUDE_CODE_ATTACHMENTS_BY_PATH",
    "CLAUDE_CODE_SLEEP_COMPACT",
    "CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS",
    "CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS",
    "CLAUDE_CHROME_TAB_GROUP_KEY",
    HOST_SKILL_CATALOG_ENV,
    ...[],
    ...[],
    "CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD",
    "CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH",
    "CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH",
    "CLAUDE_CODE_SDK_READS_SESSION_STATE",
    "CLAUDE_CODE_SDK_READS_STARTUP_MARKS",
    "CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR",
    "CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH",
    "CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES",
    "CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED",
    "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
    "CLAUDE_RUNNER_UPDATE_BIN",
  ]);
});
export {
  BG_CARRIED_ENV_KEYS_2,
  stripCoworkHostEnvKeys,
  stripInternalEntrypoint,
  stripSafeModeEnvKeys,
  stripBgScrubbedEnvKeys,
  setCarriedPromptHash,
  CLAUDE_BG_CARRIED_PROMPTS_SHA256,
  sha256Hex,
  MAX_CARRIED_PROMPTS_VARIANT,
  attachCarriedPromptHash,
  dropCarriedPromptHash,
  pickAllowedEnv,
  BG_CARRIED_ENV_ALLOWLIST,
  BG_INTERNAL_ENV_KEYS,
  carrySandboxEnv,
  SANDBOX_ENV_VARS,
  copyCarriedInternalEnv,
  BG_CARRIED_ENV_KEYS,
  BG_PASSTHROUGH_ENV_VARS,
};
