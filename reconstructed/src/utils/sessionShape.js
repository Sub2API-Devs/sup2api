/**
 * utils/sessionShape.ts
 *
 * 2.1.316 新增：会话形态（入口、交互、子会话等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7dqf31r1.js (30)
 * attribution: placement 30
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getTeammateAgentId, getIsNonInteractiveSession } from "../bootstrap/state.js";
import {
  startsWithRemote,
  isHostSessionEntrypoint,
  s,
  isCoworkSession,
  hwr,
  isDesktopNonClaudecode,
} from "./entrypointKinds.js";
import { env, isSpawnedByServer } from "./env.js";
import { FDn } from "./remoteCoworkSources.js";

/**
 * 会话形态：入口类型、是否交互、子会话、远程控制、桌面相关开关等启动信息。
 */
//@ chunk-7dqf31r1.js:4729-6138 placement
class SessionShape {
  entrypoint = void 0;
  interactive = !1;
  spawnedByAttendedSession = void 0;
  childSession = !1;
  hasRemoteSessionOrContainerId = !1;
  claudecode = !1;
  coworkFrameArtifacts = !1;
  hostScheduledRun = !1;
  desktopSkillSwitches = !1;
  desktopConnectorNames = !1;
  hostUnattendedGrant = void 0;
  chromeTabGroupKey = void 0;
  hostAssignedGroup = void 0;
  hostGuest = void 0;
  hostTestVm = void 0;
  hostSkillCatalog = void 0;
  desktopSkillsPluginDir = void 0;
  remoteControlOwnerDeclared = !1;
  remoteRelayMark = void 0;
  setEntrypoint(e) {
    this.entrypoint = e;
  }
  setInteractive(e) {
    this.interactive = e;
  }
  setSpawnedByAttendedSession(e) {
    this.spawnedByAttendedSession = e;
  }
  setChildSession(e) {
    this.childSession = e;
  }
  setHasRemoteSessionOrContainerId(e) {
    this.hasRemoteSessionOrContainerId = e;
  }
  setClaudecode(e) {
    this.claudecode = e;
  }
  setCoworkFrameArtifacts(e) {
    this.coworkFrameArtifacts = e;
  }
  setHostScheduledRun(e) {
    this.hostScheduledRun = e;
  }
  setDesktopSkillSwitches(e) {
    this.desktopSkillSwitches = e;
  }
  setDesktopConnectorNames(e) {
    this.desktopConnectorNames = e;
  }
  setHostUnattendedGrant(e) {
    this.hostUnattendedGrant = e;
  }
  setChromeTabGroupKey(e) {
    this.chromeTabGroupKey = e;
  }
  setHostSkillCatalog(e) {
    this.hostSkillCatalog = e;
  }
  setDesktopSkillsPluginDir(e) {
    this.desktopSkillsPluginDir = e;
  }
  setRemoteControlOwnerDeclared(e) {
    this.remoteControlOwnerDeclared = e;
  }
  setRemoteRelayMark(e) {
    this.remoteRelayMark = this.remoteRelayMark === !0 || e;
  }
  setHostGuest(e) {
    this.hostGuest = e;
  }
  setHostTestVm(e) {
    this.hostTestVm = e;
  }
  setHostAssignedGroup(e) {
    this.hostAssignedGroup = e;
  }
}
//@ chunk-7dqf31r1.js:6138-6161 placement
var C = new HostScoped(() => new SessionShape());
//@ chunk-7dqf31r1.js:6161-6196 placement
function sessionShape() {
  return C.of(getRootSession().host);
}
//@ chunk-7dqf31r1.js:6196-6232 placement
function getSessionEntrypoint() {
  return sessionShape().entrypoint;
}
//@ chunk-7dqf31r1.js:6232-6550 placement
var NON_TERMINAL_ENTRYPOINTS = new Set([
    "claude-vscode",
    "claude-desktop",
    "claude-desktop-3p",
    "local-agent",
    "local_agent",
    "remote",
    "remote_desktop",
    "remote_mobile",
    "remote_projects",
    "remote_cowork",
    "ssh-remote",
    "claude-in-slack",
    "claude_in_slack",
    "claude-in-teams",
    "claude-coworker",
    "claude-coworker-terminal",
  ]),
  BMi = new Set([...NON_TERMINAL_ENTRYPOINTS].filter(startsWithRemote));
//@ chunk-7dqf31r1.js:6550-6770 placement = envSessionKind (0.758)
function envSessionKind() {
  let CLAUDE_CODE_SESSION_KIND = env.CLAUDE_CODE_SESSION_KIND;
  if (
    CLAUDE_CODE_SESSION_KIND === "bg" ||
    CLAUDE_CODE_SESSION_KIND === "daemon" ||
    CLAUDE_CODE_SESSION_KIND === "daemon-worker" ||
    getTeammateAgentId() !== void 0
  )
    return !1;
  let t = sessionShape();
  if (t.interactive) return !0;
  return !t.childSession && t.entrypoint !== void 0 && NON_TERMINAL_ENTRYPOINTS.has(t.entrypoint);
}
//@ chunk-7dqf31r1.js:6770-6826 placement
function isSpawnedByAttendedSession() {
  return sessionShape().spawnedByAttendedSession === !0;
}
//@ chunk-7dqf31r1.js:6826-6864 placement
function isChildSession() {
  return sessionShape().childSession;
}
//@ chunk-7dqf31r1.js:6864-6910 placement
function isTopHostSession() {
  return isHostSessionEntrypoint() && !sessionShape().childSession;
}
//@ chunk-7dqf31r1.js:6910-7009 placement
function isLocalAgentTopSession() {
  let e = sessionShape();
  return isLocalAgentSession() || (e.entrypoint !== void 0 && s.has(e.entrypoint) && !e.childSession);
}
//@ chunk-7dqf31r1.js:7009-7043 placement
function isCoworkWithRemote() {
  return isCoworkSession() && hasRemoteSessionOrControl();
}
//@ chunk-7dqf31r1.js:7043-7144 placement
var REMOTE_ENTRYPOINTS = new Set([
  ...FDn,
  "remote",
  "remote_desktop",
  "remote_mobile",
  "remote_projects",
  "remote_trigger",
]);
//@ chunk-7dqf31r1.js:7144-7310 placement
function hasRemoteSessionOrControl() {
  let e = sessionShape();
  return (
    e.entrypoint !== void 0 &&
    REMOTE_ENTRYPOINTS.has(e.entrypoint) &&
    e.hasRemoteSessionOrContainerId &&
    !e.childSession &&
    env.CLAUDE_CODE_ENVIRONMENT_KIND === void 0
  );
}
//@ chunk-7dqf31r1.js:7310-7419 placement
function isLocalAgentSession() {
  let e = sessionShape();
  return (e.entrypoint === "local-agent" || e.entrypoint === "local_agent") && !e.childSession;
}
//@ chunk-7dqf31r1.js:7419-7509 placement
var T = new Set(["remote", "remote_projects", "remote_desktop", "remote_mobile", "ssh-remote"]);
//@ chunk-7dqf31r1.js:7509-7616 placement
function isDesktopTopNonClaudecode() {
  let e = sessionShape();
  return e.entrypoint !== void 0 && T.has(e.entrypoint) && !e.childSession && !e.claudecode;
}
//@ chunk-7dqf31r1.js:7616-7748 placement
function isRemoteRelayed() {
  let e = sessionShape();
  return (
    e.remoteRelayMark !== !1 ||
    e.entrypoint === "ssh-remote" ||
    env.CLAUDE_CODE_ENTRYPOINT === "ssh-remote" ||
    isSpawnedByServer()
  );
}
//@ chunk-7dqf31r1.js:7748-7859 placement
function isHeadlessHostSession() {
  let { entrypoint: entrypoint, interactive: interactive } = sessionShape();
  return entrypoint !== void 0 && !interactive && (hwr.has(entrypoint) || entrypoint.startsWith("remote"));
}
//@ chunk-7dqf31r1.js:7859-7892 placement
function isVsCodeOrDesktop() {
  return isVsCodeTopSession() || isDesktopNonClaudecode();
}
//@ chunk-7dqf31r1.js:7892-7986 placement
function isVsCodeTopSession() {
  let e = sessionShape();
  return e.entrypoint === "claude-vscode" && !e.childSession && !e.claudecode;
}
//@ chunk-7dqf31r1.js:7986-8054 placement
function isPlainNonInteractive(e = getIsNonInteractiveSession()) {
  let t = isTopHostSession() && !sessionShape().claudecode;
  return e && !t && !isVsCodeTopSession();
}
//@ chunk-7dqf31r1.js:8054-8090 placement
function isClaudecodeSession() {
  return sessionShape().claudecode;
}
//@ chunk-7dqf31r1.js:8090-8137 placement
function coworkFrameArtifacts() {
  return sessionShape().coworkFrameArtifacts;
}
//@ chunk-7dqf31r1.js:8137-8179 placement
function hostScheduledRun() {
  return sessionShape().hostScheduledRun;
}
//@ chunk-7dqf31r1.js:8179-8226 placement
function desktopSkillSwitches() {
  return sessionShape().desktopSkillSwitches;
}
//@ chunk-7dqf31r1.js:8226-8274 placement
function desktopConnectorNames() {
  return sessionShape().desktopConnectorNames;
}
//@ chunk-7dqf31r1.js:8274-8320 placement
function hostUnattendedGrant() {
  return sessionShape().hostUnattendedGrant;
}
//@ chunk-7dqf31r1.js:8320-8364 placement
function chromeTabGroupKey() {
  return sessionShape().chromeTabGroupKey;
}
//@ chunk-7dqf31r1.js:8364-8407 placement
function hostSkillCatalog() {
  return sessionShape().hostSkillCatalog;
}
//@ chunk-7dqf31r1.js:8407-8456 placement
function desktopSkillsPluginDir() {
  return sessionShape().desktopSkillsPluginDir;
}

export {
  getSessionEntrypoint,
  isTopHostSession,
  isClaudecodeSession,
  coworkFrameArtifacts,
  isLocalAgentTopSession,
  isVsCodeTopSession,
  sessionShape,
  isCoworkWithRemote,
  isVsCodeOrDesktop,
  isChildSession,
  hostScheduledRun,
  isPlainNonInteractive,
  chromeTabGroupKey,
  isLocalAgentSession,
  desktopSkillsPluginDir,
  isHeadlessHostSession,
  envSessionKind,
  desktopConnectorNames,
  hostUnattendedGrant,
  hostSkillCatalog,
  desktopSkillSwitches,
  isDesktopTopNonClaudecode,
  BMi,
  hasRemoteSessionOrControl,
  isSpawnedByAttendedSession,
  isRemoteRelayed,
};
