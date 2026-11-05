/**
 * utils/sessionShape.ts
 *
 * 2.1.316 新增：会话形态（入口、交互、子会话等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9ys74nhz.js (31)
 * attribution: placement 30, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-9ys74nhz.js:4739-6233 placement
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
  hostManagedRunnerChild = false;
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
  setHostManagedRunnerChild(hostManagedRunnerChild) {
    this.hostManagedRunnerChild = hostManagedRunnerChild;
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
//@ chunk-9ys74nhz.js:6233-6256 placement
var sessionShapeSlot; // deferred: uses SessionShape of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-9ys74nhz.js:6233", () => {
  sessionShapeSlot = new HostScoped(() => new SessionShape());
});
//@ chunk-9ys74nhz.js:6256-6291 placement
function sessionShape() {
  return sessionShapeSlot.of(getRootSession().host);
}
//@ chunk-9ys74nhz.js:6291-6327 placement
function getSessionEntrypoint() {
  return sessionShape().entrypoint;
}
//@ chunk-9ys74nhz.js:6327-6645 placement
/**
 * NON_TERMINAL_ENTRYPOINTS：非终端入口点集合。
 */
var NON_TERMINAL_ENTRYPOINTS_2; // deferred: uses startsWithRemote (./entrypointKinds.js) of its import cycle while loading; runs once the cycle is complete
var NON_TERMINAL_ENTRYPOINTS;
deferInit("chunk-9ys74nhz.js:6327", () => {
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
//@ chunk-9ys74nhz.js:6645-6865 placement (2.1.88 match: envSessionKind, 0.759)
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
//@ chunk-9ys74nhz.js:6865-6921 placement
function isSpawnedByAttendedSession() {
  return sessionShape().spawnedByAttendedSession === true;
}
//@ chunk-9ys74nhz.js:6921-6959 placement
function isChildSession() {
  return sessionShape().childSession;
}
//@ chunk-9ys74nhz.js:6959-7005 placement
function isTopHostSession() {
  return isHostSessionEntrypoint() && !sessionShape().childSession;
}
//@ chunk-9ys74nhz.js:7005-7104 placement
function isLocalAgentTopSession() {
  let shape = sessionShape();
  return (
    isLocalAgentSession() ||
    (shape.entrypoint !== undefined && COWORK_ENTRYPOINTS.has(shape.entrypoint) && !shape.childSession)
  );
}
//@ chunk-9ys74nhz.js:7104-7138 placement
function isCoworkWithRemote() {
  return isCoworkSession() && hasRemoteSessionOrControl();
}
//@ chunk-9ys74nhz.js:7138-7239 placement
var REMOTE_ENTRYPOINTS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9ys74nhz.js:7138", () => {
  REMOTE_ENTRYPOINTS_2 = new Set([
    ...REMOTE_COWORK_SOURCE_KINDS,
    "remote",
    "remote_desktop",
    "remote_mobile",
    "remote_projects",
    "remote_trigger",
  ]);
});
//@ chunk-9ys74nhz.js:7239-7405 placement
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
//@ chunk-9ys74nhz.js:7405-7514 placement
function isLocalAgentSession() {
  let shape = sessionShape();
  return (shape.entrypoint === "local-agent" || shape.entrypoint === "local_agent") && !shape.childSession;
}
//@ chunk-9ys74nhz.js:7514-7604 placement
var REMOTE_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9ys74nhz.js:7514", () => {
  REMOTE_ENTRYPOINTS = new Set([
    "remote",
    "remote_projects",
    "remote_desktop",
    "remote_mobile",
    "ssh-remote",
  ]);
});
//@ chunk-9ys74nhz.js:7604-7711 placement
function isDesktopTopNonClaudecode() {
  let shape = sessionShape();
  return (
    shape.entrypoint !== undefined &&
    REMOTE_ENTRYPOINTS.has(shape.entrypoint) &&
    !shape.childSession &&
    !shape.claudecode
  );
}
//@ chunk-9ys74nhz.js:7711-7843 placement
function isRemoteRelayed() {
  let shape = sessionShape();
  return (
    shape.remoteRelayMark !== false ||
    shape.entrypoint === "ssh-remote" ||
    env.CLAUDE_CODE_ENTRYPOINT === "ssh-remote" ||
    isSpawnedByServer()
  );
}
//@ chunk-9ys74nhz.js:7843-7954 placement
function isHeadlessHostSession() {
  let { entrypoint, interactive } = sessionShape();
  return (
    entrypoint !== undefined &&
    !interactive &&
    (HEADLESS_HOST_ENTRYPOINTS.has(entrypoint) || entrypoint.startsWith("remote"))
  );
}
//@ chunk-9ys74nhz.js:7954-7987 placement
function isVsCodeOrDesktop() {
  return isVsCodeTopSession() || isDesktopNonClaudecode();
}
//@ chunk-9ys74nhz.js:7987-8081 placement
function isVsCodeTopSession() {
  let shape = sessionShape();
  return shape.entrypoint === "claude-vscode" && !shape.childSession && !shape.claudecode;
}
//@ chunk-9ys74nhz.js:8081-8229 layout
function isSdkOwnedHostedTurn() {
  let shape = sessionShape();
  return (
    (shape.entrypoint === "sdk-ts" || shape.entrypoint === "sdk-py" || shape.entrypoint === "sdk-cli") &&
    !shape.childSession &&
    !shape.claudecode &&
    !isRemoteRelayed()
  );
}
//@ chunk-9ys74nhz.js:8229-8297 placement
function isPlainNonInteractive(nonInteractive = getIsNonInteractiveSession()) {
  let topHost = isTopHostSession() && !sessionShape().claudecode;
  return nonInteractive && !topHost && !isVsCodeTopSession();
}
//@ chunk-9ys74nhz.js:8297-8333 placement
function isClaudecodeSession() {
  return sessionShape().claudecode;
}
//@ chunk-9ys74nhz.js:8333-8380 placement
function coworkFrameArtifacts() {
  return sessionShape().coworkFrameArtifacts;
}
//@ chunk-9ys74nhz.js:8380-8423 placement
function hostScheduledRun() {
  return sessionShape().hostScheduledRun;
}
//@ chunk-9ys74nhz.js:8423-8470 placement
function desktopSkillSwitches() {
  return sessionShape().desktopSkillSwitches;
}
//@ chunk-9ys74nhz.js:8470-8518 placement
function desktopConnectorNames() {
  return sessionShape().desktopConnectorNames;
}
//@ chunk-9ys74nhz.js:8518-8564 placement
function hostUnattendedGrant() {
  return sessionShape().hostUnattendedGrant;
}
//@ chunk-9ys74nhz.js:8564-8608 placement
function chromeTabGroupKey() {
  return sessionShape().chromeTabGroupKey;
}
//@ chunk-9ys74nhz.js:8608-8651 placement
function hostSkillCatalog() {
  return sessionShape().hostSkillCatalog;
}
//@ chunk-9ys74nhz.js:8651-8700 placement
function desktopSkillsPluginDir() {
  return sessionShape().desktopSkillsPluginDir;
}
export {
  isTopHostSession,
  getSessionEntrypoint,
  isVsCodeTopSession,
  isVsCodeOrDesktop,
  isClaudecodeSession,
  coworkFrameArtifacts,
  isLocalAgentTopSession,
  envSessionKind,
  hostScheduledRun,
  desktopSkillsPluginDir,
  isChildSession,
  sessionShape,
  isCoworkWithRemote,
  isPlainNonInteractive,
  hostSkillCatalog,
  isSdkOwnedHostedTurn,
  chromeTabGroupKey,
  isDesktopTopNonClaudecode,
  isHeadlessHostSession,
  desktopSkillSwitches,
  isSpawnedByAttendedSession,
  isLocalAgentSession,
  desktopConnectorNames,
  hostUnattendedGrant,
  hasRemoteSessionOrControl,
  isRemoteRelayed,
  NON_TERMINAL_ENTRYPOINTS,
};
