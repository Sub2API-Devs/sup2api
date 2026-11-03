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
import { FDn } from "./remoteCoworkSources.js";
import { isEnvTruthy } from "./envUtils.js";

//@ chunk-7dqf31r1.js:386-427 placement
var HOST_SKILL_CATALOG_ENV = "CLAUDE_CODE_HOST_SKILL_CATALOG";
//@ chunk-7dqf31r1.js:427-1224 placement
var ENTRYPOINT_KINDS = {
    cli: !0,
    mcp: !0,
    "sdk-cli": !0,
    "sdk-ts": !0,
    "sdk-py": !0,
    bench: !0,
    "claude-vscode": !0,
    "claude-code-github-action": !0,
    "local-agent": !0,
    local_agent: !0,
    "claude-desktop": !0,
    remote: !0,
    remote_baku: !0,
    remote_cowork: !0,
    remote_trigger: !0,
    remote_cowork_trigger: !0,
    remote_desktop: !0,
    remote_mobile: !0,
    remote_projects: !0,
    claude_in_slack: !0,
    "claude-in-slack": !0,
    "claude-in-teams": !0,
    "claude-desktop-3p": !0,
    "claude-security": !0,
    "ssh-remote": !0,
    "claude-coworker": !0,
    "claude-coworker-terminal": !0,
  },
  hwr = new Set([
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
  ]),
  Fdo = new Set(["remote_trigger", "remote_cowork_trigger"]),
  Udo = ["remote", "remote_desktop", "remote_mobile"],
  CLI = "cli";
//@ chunk-7dqf31r1.js:1224-1287 placement
function isCustomEntrypointName(e) {
  return /^(?!sdk)[a-z][a-z0-9_-]{0,31}$/.test(e);
}
//@ chunk-7dqf31r1.js:1287-1441 placement
function bridgeOwnerAccount() {
  let CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID = env.CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID;
  return CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID
    ? {
        accountUuid: CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID,
        organizationUuid: env.CLAUDE_CODE_BRIDGE_OWNER_ORG_UUID || void 0,
      }
    : void 0;
}
//@ chunk-7dqf31r1.js:1441-1475 placement
var ENTRYPOINT_KIND_SET = new Set(Object.keys(ENTRYPOINT_KINDS));
//@ chunk-7dqf31r1.js:1475-1507 placement
function _(e) {
  return ENTRYPOINT_KIND_SET.has(e);
}
//@ chunk-7dqf31r1.js:1507-1558 placement
function getEntrypointKind() {
  return validEntrypoint(env.CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:1558-1598 placement
function validEntrypoint(e) {
  return e && _(e) ? e : void 0;
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
var r = new Set(["claude-desktop", "claude-desktop-3p", "local-agent"]);
//@ chunk-7dqf31r1.js:2064-2137 placement
function isHostEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== void 0 && r.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:2137-2271 placement
function desktopEntrypointSetting() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT === "claude-desktop" || CLAUDE_CODE_ENTRYPOINT === "local-agent"
    ? env.CLAUDE_CODE_DESKTOP_APP_VERSION
    : void 0;
}
//@ chunk-7dqf31r1.js:2271-2322 placement
var S = new Set(["claude-desktop-3p", "local-agent"]);
//@ chunk-7dqf31r1.js:2322-2396 placement
function isSdkEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== void 0 && S.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:2396-2460 placement
function isHostEntrypointName(e) {
  return r.has(e === "local_agent" ? "local-agent" : e);
}
//@ chunk-7dqf31r1.js:2460-2549 placement
function isIdeOrSdkEntrypoint(e) {
  return e !== void 0 && (r.has(e) || e === "claude-vscode" || e.startsWith("sdk-"));
}
//@ chunk-7dqf31r1.js:2549-2605 placement
var DESKTOP_ENTRYPOINTS = new Set(["claude-desktop", "claude-desktop-3p"]);
//@ chunk-7dqf31r1.js:2605-2680 placement
function isDesktopTopSession() {
  let e = getSessionEntrypoint();
  return e !== void 0 && DESKTOP_ENTRYPOINTS.has(e) && !sessionShape().childSession;
}
//@ chunk-7dqf31r1.js:2680-2714 placement
function isDesktopNonClaudecode() {
  return isDesktopTopSession() && !isClaudecodeSession();
}
//@ chunk-7dqf31r1.js:2714-2738 placement
function alwaysFalseEntry() {
  return !1;
}
//@ chunk-7dqf31r1.js:2738-2792 placement
function isHostSessionEntrypoint() {
  let e = getSessionEntrypoint();
  return e !== void 0 && r.has(e);
}
//@ chunk-7dqf31r1.js:2792-2867 placement
function isAgentSdkEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== void 0 && Fdo.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:2867-3026 placement
function isProviderManagedByHost() {
  {
    let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
    return (
      env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
      env.CLAUDE_CODE_USE_GATEWAY &&
      ((CLAUDE_CODE_ENTRYPOINT !== void 0 && DESKTOP_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT)) || c())
    );
  }
  return !1;
}
//@ chunk-7dqf31r1.js:3026-3058 placement
function isHostManagedProviderSession() {
  return isProviderManagedByHost() && c();
}
//@ chunk-7dqf31r1.js:3058-3146 placement
function c() {
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
var s = new Set(FDn);
//@ chunk-7dqf31r1.js:3308-3381 placement
function isCoworkEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT !== void 0 && s.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:3381-3434 placement
function isCoworkSession() {
  let e = getSessionEntrypoint();
  return e !== void 0 && s.has(e);
}
//@ chunk-7dqf31r1.js:3434-3500 placement
function isCcsCoworkSurface() {
  let e = isCcsTenant() ? getCcrDerivedSurface() : void 0;
  return e !== void 0 && s.has(e);
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
  return CLAUDE_CODE_ENTRYPOINT !== void 0 && E.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:3782-3835 placement
var E = new Set(["claude_in_slack", "claude-in-slack"]);
//@ chunk-7dqf31r1.js:3835-3889 placement
function isChatHostSession() {
  let e = getSessionEntrypoint();
  return e !== void 0 && E.has(e);
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
  return CLAUDE_CODE_ENTRYPOINT !== void 0 && hwr.has(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:4066-4118 placement
function isRemoteEntrypoint() {
  return startsWithRemote(env.CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-7dqf31r1.js:4118-4170 placement
function startsWithRemote(e) {
  return e?.startsWith("remote") === !0;
}
//@ chunk-7dqf31r1.js:4369-4511 placement
var REMOTE_TRIGGER_ENTRYPOINTS = new Set([
  "claude_in_slack",
  "claude-in-slack",
  "claude-in-teams",
  "remote_trigger",
  "remote_cowork_trigger",
  "remote_cowork",
  "remote_baku",
]);
//@ chunk-7dqf31r1.js:4511-4635 placement
function showSettingsHint() {
  if (isEnvTruthy(env.CLAUDE_CODE_HIDE_SETTINGS_HINT)) return !1;
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return CLAUDE_CODE_ENTRYPOINT === void 0 || !REMOTE_TRIGGER_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT);
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
  Fdo,
  isHostEntrypointName,
  isCcsRemoteCowork,
  isChatHostEntrypoint,
  isClaudeInTeams,
  isCcsCoworkSurface,
  isDesktopNonClaudecode,
  alwaysFalseEntry,
  CLI,
  isCustomEntrypointName,
  startsWithRemote,
  isCoworkEntrypoint,
  isHostManagedProviderSession,
  DESKTOP_3P_ENTRYPOINT,
  isIdeOrSdkEntrypoint,
  isChatOrTeams,
  s,
  hwr,
  ENTRYPOINT_KINDS,
  DESKTOP_ENTRYPOINTS,
  entrypointSurfaceName,
  isChatHostSession,
  isLocalAgentOrCowork,
  ENTRYPOINT_KIND_SET,
  Udo,
};
