/**
 * utils/entrypointKinds.ts
 *
 * 2.1.316 新增：入口类型（CLAUDE_CODE_ENTRYPOINT）表与各类入口判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7dqf31r1.js (47)
 * attribution: placement 47
 */
import { env } from "./env.js";
import {
  getSessionEntrypoint,
  sessionShape,
  isClaudecodeSession,
  isLocalAgentTopSession,
  isCoworkWithRemote,
} from "./sessionShape.js";
import { isCcsTenant, getCcrDerivedSurface } from "../bootstrap/state.js";
import { REMOTE_COWORK_SOURCE_KINDS } from "./remoteCoworkSources.js";
import { isEnvTruthy } from "./envUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7dqf31r1.js:386-427 placement
var HOST_SKILL_CATALOG_ENV = "CLAUDE_CODE_HOST_SKILL_CATALOG";
//@ chunk-7dqf31r1.js:427-1224 placement
/**
 * 归为“无头宿主”的远程入口集合（remote、remote_cowork、claude-in-slack 等）。
 */
var ENTRYPOINT_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HEADLESS_HOST_ENTRYPOINTS;
var REMOTE_TRIGGER_ENTRYPOINTS_SET;
var REMOTE_ENTRYPOINT_NAMES;
var CLI_ENTRYPOINT;
deferInit("chunk-7dqf31r1.js:427", () => {
  ENTRYPOINT_KINDS = {
    cli: true,
    mcp: true,
    "sdk-cli": true,
    "sdk-ts": true,
    "sdk-py": true,
    bench: true,
    "claude-vscode": true,
    "claude-code-github-action": true,
    "local-agent": true,
    local_agent: true,
    "claude-desktop": true,
    remote: true,
    remote_baku: true,
    remote_cowork: true,
    remote_trigger: true,
    remote_cowork_trigger: true,
    remote_desktop: true,
    remote_mobile: true,
    remote_projects: true,
    claude_in_slack: true,
    "claude-in-slack": true,
    "claude-in-teams": true,
    "claude-desktop-3p": true,
    "claude-security": true,
    "ssh-remote": true,
    "claude-coworker": true,
    "claude-coworker-terminal": true,
  };
  HEADLESS_HOST_ENTRYPOINTS = new Set([
    "remote",
    "remote_baku",
    "remote_cowork",
    "remote_trigger",
    "remote_cowork_trigger",
    "remote_desktop",
    "remote_mobile",
    "remote_projects",
    "claude_in_slack",
    "claude-in-slack",
    "claude-in-teams",
  ]);
  REMOTE_TRIGGER_ENTRYPOINTS_SET = new Set(["remote_trigger", "remote_cowork_trigger"]);
  REMOTE_ENTRYPOINT_NAMES = ["remote", "remote_desktop", "remote_mobile"];
  CLI_ENTRYPOINT = "cli";
});
//@ chunk-7dqf31r1.js:1224-1287 placement
function isCustomEntrypointName(name) {
  return /^(?!sdk)[a-z][a-z0-9_-]{0,31}$/.test(name);
}
//@ chunk-7dqf31r1.js:1287-1441 placement
function bridgeOwnerAccount() {
  let CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID = env.CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID;
  return CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID
    ? {
        accountUuid: CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID,
        organizationUuid: env.CLAUDE_CODE_BRIDGE_OWNER_ORG_UUID || undefined,
      }
    : undefined;
}
//@ chunk-7dqf31r1.js:1441-1475 placement
var ENTRYPOINT_KIND_SET; // deferred: uses ENTRYPOINT_KINDS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7dqf31r1.js:1441", () => {
  ENTRYPOINT_KIND_SET = new Set(Object.keys(ENTRYPOINT_KINDS));
});
//@ chunk-7dqf31r1.js:1475-1507 placement
function _(entrypoint) {
  return ENTRYPOINT_KIND_SET.has(entrypoint);
}
//@ chunk-7dqf31r1.js:1507-1558 placement
function getEntrypointKind() {
  return validEntrypoint(env.CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:1558-1598 placement
function validEntrypoint(entrypoint) {
  return entrypoint && _(entrypoint) ? entrypoint : undefined;
}
//@ chunk-7dqf31r1.js:1598-1996 placement
function entrypointSurfaceName() {
  switch (getEntrypointKind()) {
    case "claude-desktop":
    case "claude-desktop-3p":
    case "remote_desktop":
      return "Claude Desktop";
    case "remote_mobile":
      return "Mobile";
    case "local-agent":
    case "remote_cowork":
      return "Cowork";
    case "claude_in_slack":
    case "claude-in-slack":
      return "Claude Tag in Slack";
    case "claude-in-teams":
      return "Claude Tag in Teams";
    case "claude-code-github-action":
      return "GitHub Actions";
    default:
      return;
  }
}
//@ chunk-7dqf31r1.js:1996-2064 placement
/**
 * 视为宿主入口的入口名集合（claude-desktop、claude-desktop-3p、local-agent）。
 */
var HOST_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7dqf31r1.js:1996", () => {
  HOST_ENTRYPOINTS = new Set(["claude-desktop", "claude-desktop-3p", "local-agent"]);
});
//@ chunk-7dqf31r1.js:2064-2137 placement
function isHostEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== undefined && HOST_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:2137-2271 placement
function desktopEntrypointSetting() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT === "claude-desktop" || CLAUDE_CODE_ENTRYPOINT === "local-agent"
    ? env.CLAUDE_CODE_DESKTOP_APP_VERSION
    : undefined;
}
//@ chunk-7dqf31r1.js:2271-2322 placement
/**
 * 视为 SDK 入口的入口名集合（claude-desktop-3p、local-agent）。
 */
var SDK_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7dqf31r1.js:2271", () => {
  SDK_ENTRYPOINTS = new Set(["claude-desktop-3p", "local-agent"]);
});
//@ chunk-7dqf31r1.js:2322-2396 placement
function isSdkEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== undefined && SDK_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:2396-2460 placement
function isHostEntrypointName(entrypoint) {
  return HOST_ENTRYPOINTS.has(entrypoint === "local_agent" ? "local-agent" : entrypoint);
}
//@ chunk-7dqf31r1.js:2460-2549 placement
function isIdeOrSdkEntrypoint(entrypoint) {
  return (
    entrypoint !== undefined &&
    (HOST_ENTRYPOINTS.has(entrypoint) || entrypoint === "claude-vscode" || entrypoint.startsWith("sdk-"))
  );
}
//@ chunk-7dqf31r1.js:2549-2605 placement
var DESKTOP_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7dqf31r1.js:2549", () => {
  DESKTOP_ENTRYPOINTS = new Set(["claude-desktop", "claude-desktop-3p"]);
});
//@ chunk-7dqf31r1.js:2605-2680 placement
function isDesktopTopSession() {
  let sessionEntrypoint = getSessionEntrypoint();
  return (
    sessionEntrypoint !== undefined &&
    DESKTOP_ENTRYPOINTS.has(sessionEntrypoint) &&
    !sessionShape().childSession
  );
}
//@ chunk-7dqf31r1.js:2680-2714 placement
function isDesktopNonClaudecode() {
  return isDesktopTopSession() && !isClaudecodeSession();
}
//@ chunk-7dqf31r1.js:2714-2738 placement
function alwaysFalseEntry() {
  return false;
}
//@ chunk-7dqf31r1.js:2738-2792 placement
function isHostSessionEntrypoint() {
  let sessionEntrypoint = getSessionEntrypoint();
  return sessionEntrypoint !== undefined && HOST_ENTRYPOINTS.has(sessionEntrypoint);
}
//@ chunk-7dqf31r1.js:2792-2867 placement
function isAgentSdkEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== undefined && REMOTE_TRIGGER_ENTRYPOINTS_SET.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:2867-3026 placement
function isProviderManagedByHost() {
  {
    let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
    return (
      env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
      env.CLAUDE_CODE_USE_GATEWAY &&
      ((CLAUDE_CODE_ENTRYPOINT !== undefined && DESKTOP_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT)) ||
        hasHostGatewayLineage())
    );
  }
  return false;
}
//@ chunk-7dqf31r1.js:3026-3058 placement
function isHostManagedProviderSession() {
  return isProviderManagedByHost() && hasHostGatewayLineage();
}
//@ chunk-7dqf31r1.js:3058-3146 placement
/**
 * 是否为宿主网关谱系（设了谱系且有宿主凭据文件）。
 */
function hasHostGatewayLineage() {
  return env.CLAUDE_CODE_HOST_GATEWAY_LINEAGE && !!env.CLAUDE_CODE_HOST_CREDS_FILE;
}
//@ chunk-7dqf31r1.js:3146-3174 placement
var DESKTOP_3P_ENTRYPOINT = "claude-desktop-3p";
//@ chunk-7dqf31r1.js:3174-3238 placement
function isRemoteCowork() {
  return env.CLAUDE_CODE_ENTRYPOINT === "remote_cowork";
}
//@ chunk-7dqf31r1.js:3238-3289 placement
function isCcsRemoteCowork() {
  return isCcsTenant() && getCcrDerivedSurface() === "remote_cowork";
}
//@ chunk-7dqf31r1.js:3289-3308 placement
/**
 * Cowork 相关入口名集合（来自 remoteCoworkSources）。
 */
var COWORK_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7dqf31r1.js:3289", () => {
  COWORK_ENTRYPOINTS = new Set(REMOTE_COWORK_SOURCE_KINDS);
});
//@ chunk-7dqf31r1.js:3308-3381 placement
function isCoworkEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== undefined && COWORK_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:3381-3434 placement
function isCoworkSession() {
  let sessionEntrypoint = getSessionEntrypoint();
  return sessionEntrypoint !== undefined && COWORK_ENTRYPOINTS.has(sessionEntrypoint);
}
//@ chunk-7dqf31r1.js:3434-3500 placement
function isCcsCoworkSurface() {
  let surface = isCcsTenant() ? getCcrDerivedSurface() : undefined;
  return surface !== undefined && COWORK_ENTRYPOINTS.has(surface);
}
//@ chunk-7dqf31r1.js:3500-3532 placement
function isCoworkAny() {
  return isCoworkSession() || isCcsCoworkSurface();
}
//@ chunk-7dqf31r1.js:3532-3566 placement
function isLocalAgentOrCowork() {
  return isLocalAgentTopSession() || isCcsCoworkSurface();
}
//@ chunk-7dqf31r1.js:3566-3635 placement
function isClaudeAiChatOrigin() {
  return env.CLAUDE_CODE_SESSION_ORIGIN === "claude_ai_chat";
}
//@ chunk-7dqf31r1.js:3635-3667 placement
function isClaudeAiChatCowork() {
  return isClaudeAiChatOrigin() && isCoworkAny();
}
//@ chunk-7dqf31r1.js:3667-3709 placement
function isClaudeAiChatRemote() {
  return isClaudeAiChatOrigin() && (isCcsCoworkSurface() || isCoworkWithRemote());
}
//@ chunk-7dqf31r1.js:3709-3782 placement
function isChatHostEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== undefined && CHAT_HOST_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:3782-3835 placement
/**
 * 聊天宿主入口（claude_in_slack、claude-in-slack）。
 */
var CHAT_HOST_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7dqf31r1.js:3782", () => {
  CHAT_HOST_ENTRYPOINTS = new Set(["claude_in_slack", "claude-in-slack"]);
});
//@ chunk-7dqf31r1.js:3835-3889 placement
function isChatHostSession() {
  let sessionEntrypoint = getSessionEntrypoint();
  return sessionEntrypoint !== undefined && CHAT_HOST_ENTRYPOINTS.has(sessionEntrypoint);
}
//@ chunk-7dqf31r1.js:3889-3956 placement
function isClaudeInTeams() {
  return env.CLAUDE_CODE_ENTRYPOINT === "claude-in-teams";
}
//@ chunk-7dqf31r1.js:3956-3990 placement
function isChatOrTeams() {
  return isChatHostEntrypoint() || isClaudeInTeams();
}
//@ chunk-7dqf31r1.js:3990-4066 placement
function isHeadlessHostEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== undefined && HEADLESS_HOST_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:4066-4118 placement
function isRemoteEntrypoint() {
  return startsWithRemote(env.CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:4118-4170 placement
function startsWithRemote(entrypoint) {
  return entrypoint?.startsWith("remote") === true;
}
//@ chunk-7dqf31r1.js:4369-4511 placement
var REMOTE_TRIGGER_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7dqf31r1.js:4369", () => {
  REMOTE_TRIGGER_ENTRYPOINTS = new Set([
    "claude_in_slack",
    "claude-in-slack",
    "claude-in-teams",
    "remote_trigger",
    "remote_cowork_trigger",
    "remote_cowork",
    "remote_baku",
  ]);
});
//@ chunk-7dqf31r1.js:4511-4635 placement
function showSettingsHint() {
  if (isEnvTruthy(env.CLAUDE_CODE_HIDE_SETTINGS_HINT)) return false;
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT === undefined || !REMOTE_TRIGGER_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT);
}
export {
  validEntrypoint,
  getEntrypointKind,
  isHeadlessHostEntrypoint,
  isRemoteEntrypoint,
  isCoworkSession,
  isCoworkAny,
  isHostEntrypoint,
  showSettingsHint,
  isClaudeAiChatCowork,
  isSdkEntrypoint,
  isClaudeAiChatRemote,
  isAgentSdkEntrypoint,
  HOST_SKILL_CATALOG_ENV,
  isHostSessionEntrypoint,
  isProviderManagedByHost,
  isClaudeAiChatOrigin,
  isDesktopTopSession,
  isRemoteCowork,
  bridgeOwnerAccount,
  desktopEntrypointSetting,
  REMOTE_TRIGGER_ENTRYPOINTS_SET,
  isHostEntrypointName,
  isCcsRemoteCowork,
  isChatHostEntrypoint,
  isClaudeInTeams,
  isCcsCoworkSurface,
  isDesktopNonClaudecode,
  alwaysFalseEntry,
  CLI_ENTRYPOINT,
  isCustomEntrypointName,
  startsWithRemote,
  isCoworkEntrypoint,
  isHostManagedProviderSession,
  DESKTOP_3P_ENTRYPOINT,
  isIdeOrSdkEntrypoint,
  isChatOrTeams,
  COWORK_ENTRYPOINTS,
  HEADLESS_HOST_ENTRYPOINTS,
  ENTRYPOINT_KINDS,
  DESKTOP_ENTRYPOINTS,
  entrypointSurfaceName,
  isChatHostSession,
  isLocalAgentOrCowork,
  ENTRYPOINT_KIND_SET,
  REMOTE_ENTRYPOINT_NAMES,
};
