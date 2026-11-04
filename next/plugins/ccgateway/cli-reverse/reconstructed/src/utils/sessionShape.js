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
  COWORK_ENTRYPOINTS,
  isCoworkSession,
  HEADLESS_HOST_ENTRYPOINTS,
  isDesktopNonClaudecode,
} from "./entrypointKinds.js";
import { env, isSpawnedByServer } from "./env.js";
import { REMOTE_COWORK_SOURCE_KINDS } from "./remoteCoworkSources.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7dqf31r1.js:4729-6138 placement
/**
 * 会话形态：入口类型、是否交互、子会话、远程控制、桌面相关开关等启动信息。
 */
class SessionShape {
  entrypoint = undefined;
  interactive = false;
  spawnedByAttendedSession = undefined;
  childSession = false;
  hasRemoteSessionOrContainerId = false;
  claudecode = false;
  coworkFrameArtifacts = false;
  hostScheduledRun = false;
  desktopSkillSwitches = false;
  desktopConnectorNames = false;
  hostUnattendedGrant = undefined;
  chromeTabGroupKey = undefined;
  hostAssignedGroup = undefined;
  hostGuest = undefined;
  hostTestVm = undefined;
  hostSkillCatalog = undefined;
  desktopSkillsPluginDir = undefined;
  remoteControlOwnerDeclared = false;
  remoteRelayMark = undefined;
  setEntrypoint(entrypoint) {
    this.entrypoint = entrypoint;
  }
  setInteractive(interactive) {
    this.interactive = interactive;
  }
  setSpawnedByAttendedSession(spawnedByAttendedSession) {
    this.spawnedByAttendedSession = spawnedByAttendedSession;
  }
  setChildSession(childSession) {
    this.childSession = childSession;
  }
  setHasRemoteSessionOrContainerId(hasRemoteSessionOrContainerId) {
    this.hasRemoteSessionOrContainerId = hasRemoteSessionOrContainerId;
  }
  setClaudecode(claudecode) {
    this.claudecode = claudecode;
  }
  setCoworkFrameArtifacts(coworkFrameArtifacts) {
    this.coworkFrameArtifacts = coworkFrameArtifacts;
  }
  setHostScheduledRun(hostScheduledRun) {
    this.hostScheduledRun = hostScheduledRun;
  }
  setDesktopSkillSwitches(desktopSkillSwitches) {
    this.desktopSkillSwitches = desktopSkillSwitches;
  }
  setDesktopConnectorNames(desktopConnectorNames) {
    this.desktopConnectorNames = desktopConnectorNames;
  }
  setHostUnattendedGrant(hostUnattendedGrant) {
    this.hostUnattendedGrant = hostUnattendedGrant;
  }
  setChromeTabGroupKey(chromeTabGroupKey) {
    this.chromeTabGroupKey = chromeTabGroupKey;
  }
  setHostSkillCatalog(hostSkillCatalog) {
    this.hostSkillCatalog = hostSkillCatalog;
  }
  setDesktopSkillsPluginDir(desktopSkillsPluginDir) {
    this.desktopSkillsPluginDir = desktopSkillsPluginDir;
  }
  setRemoteControlOwnerDeclared(remoteControlOwnerDeclared) {
    this.remoteControlOwnerDeclared = remoteControlOwnerDeclared;
  }
  setRemoteRelayMark(flag) {
    this.remoteRelayMark = this.remoteRelayMark === true || flag;
  }
  setHostGuest(hostGuest) {
    this.hostGuest = hostGuest;
  }
  setHostTestVm(hostTestVm) {
    this.hostTestVm = hostTestVm;
  }
  setHostAssignedGroup(hostAssignedGroup) {
    this.hostAssignedGroup = hostAssignedGroup;
  }
}
//@ chunk-7dqf31r1.js:6138-6161 placement
var sessionShapeSlot; // deferred: uses SessionShape of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7dqf31r1.js:6138", () => {
  sessionShapeSlot = new HostScoped(() => new SessionShape());
});
//@ chunk-7dqf31r1.js:6161-6196 placement
function sessionShape() {
  return sessionShapeSlot.of(getRootSession().host);
}
//@ chunk-7dqf31r1.js:6196-6232 placement
function getSessionEntrypoint() {
  return sessionShape().entrypoint;
}
//@ chunk-7dqf31r1.js:6232-6550 placement
/**
 * NON_TERMINAL_ENTRYPOINTS：非终端入口点集合。
 */
var NON_TERMINAL_ENTRYPOINTS_2; // deferred: uses startsWithRemote (./entrypointKinds.js) of its import cycle while loading; runs once the cycle is complete
var NON_TERMINAL_ENTRYPOINTS;
deferInit("chunk-7dqf31r1.js:6232", () => {
  NON_TERMINAL_ENTRYPOINTS_2 = new Set([
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
  ]);
  NON_TERMINAL_ENTRYPOINTS = new Set([...NON_TERMINAL_ENTRYPOINTS_2].filter(startsWithRemote));
});
//@ chunk-7dqf31r1.js:6550-6770 placement (2.1.88 match: envSessionKind, 0.758)
function envSessionKind() {
  let k = env.CLAUDE_CODE_SESSION_KIND;
  if (k === "bg" || k === "daemon" || k === "daemon-worker" || getTeammateAgentId() !== undefined)
    return false;
  let shape = sessionShape();
  if (shape.interactive) return true;
  return (
    !shape.childSession && shape.entrypoint !== undefined && NON_TERMINAL_ENTRYPOINTS_2.has(shape.entrypoint)
  );
}
//@ chunk-7dqf31r1.js:6770-6826 placement
function isSpawnedByAttendedSession() {
  return sessionShape().spawnedByAttendedSession === true;
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
  let shape = sessionShape();
  return (
    isLocalAgentSession() ||
    (shape.entrypoint !== undefined && COWORK_ENTRYPOINTS.has(shape.entrypoint) && !shape.childSession)
  );
}
//@ chunk-7dqf31r1.js:7009-7043 placement
function isCoworkWithRemote() {
  return isCoworkSession() && hasRemoteSessionOrControl();
}
//@ chunk-7dqf31r1.js:7043-7144 placement
var REMOTE_ENTRYPOINTS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7dqf31r1.js:7043", () => {
  REMOTE_ENTRYPOINTS_2 = new Set([
    ...REMOTE_COWORK_SOURCE_KINDS,
    "remote",
    "remote_desktop",
    "remote_mobile",
    "remote_projects",
    "remote_trigger",
  ]);
});
//@ chunk-7dqf31r1.js:7144-7310 placement
function hasRemoteSessionOrControl() {
  let shape = sessionShape();
  return (
    shape.entrypoint !== undefined &&
    REMOTE_ENTRYPOINTS_2.has(shape.entrypoint) &&
    shape.hasRemoteSessionOrContainerId &&
    !shape.childSession &&
    env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined
  );
}
//@ chunk-7dqf31r1.js:7310-7419 placement
function isLocalAgentSession() {
  let shape = sessionShape();
  return (shape.entrypoint === "local-agent" || shape.entrypoint === "local_agent") && !shape.childSession;
}
//@ chunk-7dqf31r1.js:7419-7509 placement
var REMOTE_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7dqf31r1.js:7419", () => {
  REMOTE_ENTRYPOINTS = new Set([
    "remote",
    "remote_projects",
    "remote_desktop",
    "remote_mobile",
    "ssh-remote",
  ]);
});
//@ chunk-7dqf31r1.js:7509-7616 placement
function isDesktopTopNonClaudecode() {
  let shape = sessionShape();
  return (
    shape.entrypoint !== undefined &&
    REMOTE_ENTRYPOINTS.has(shape.entrypoint) &&
    !shape.childSession &&
    !shape.claudecode
  );
}
//@ chunk-7dqf31r1.js:7616-7748 placement
function isRemoteRelayed() {
  let shape = sessionShape();
  return (
    shape.remoteRelayMark !== false ||
    shape.entrypoint === "ssh-remote" ||
    env.CLAUDE_CODE_ENTRYPOINT === "ssh-remote" ||
    isSpawnedByServer()
  );
}
//@ chunk-7dqf31r1.js:7748-7859 placement
function isHeadlessHostSession() {
  let { entrypoint, interactive } = sessionShape();
  return (
    entrypoint !== undefined &&
    !interactive &&
    (HEADLESS_HOST_ENTRYPOINTS.has(entrypoint) || entrypoint.startsWith("remote"))
  );
}
//@ chunk-7dqf31r1.js:7859-7892 placement
function isVsCodeOrDesktop() {
  return isVsCodeTopSession() || isDesktopNonClaudecode();
}
//@ chunk-7dqf31r1.js:7892-7986 placement
function isVsCodeTopSession() {
  let shape = sessionShape();
  return shape.entrypoint === "claude-vscode" && !shape.childSession && !shape.claudecode;
}
//@ chunk-7dqf31r1.js:7986-8054 placement
function isPlainNonInteractive(nonInteractive = getIsNonInteractiveSession()) {
  let topHost = isTopHostSession() && !sessionShape().claudecode;
  return nonInteractive && !topHost && !isVsCodeTopSession();
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
  NON_TERMINAL_ENTRYPOINTS,
  hasRemoteSessionOrControl,
  isSpawnedByAttendedSession,
  isRemoteRelayed,
};
