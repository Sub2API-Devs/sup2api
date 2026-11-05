/**
 * utils/sandbox/sandboxErrors.ts
 *
 * 2.1.316 新增：沙箱不可用错误
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1vxka8te.js (1), chunk-qg41pqt6.js (11)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../hostScoped.js";
import { createSignal, createLazySignal } from "../signal.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logError } from "../log.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, withTelemetryMessage, toError, getTelemetryMessage } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qg41pqt6.js:855948-855972 placement
var sandboxErrorSignalSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:855948", () => {
  sandboxErrorSignalSlot = new HostScoped(() => createSignal());
});
//@ chunk-qg41pqt6.js:855972-856011 placement
function sandboxErrorSignal() {
  return sandboxErrorSignalSlot.of(getRootSession().host);
}
//@ chunk-qg41pqt6.js:856011-856026 placement
/**
 * sandboxErrorSignalLazy：沙箱错误的惰性信号。
 */
var sandboxErrorSignalLazy; // deferred: uses sandboxErrorSignal of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qg41pqt6.js:856011", () => {
  sandboxErrorSignalLazy = createLazySignal(sandboxErrorSignal);
});
//@ chunk-qg41pqt6.js:856026-858710 placement
/**
 * 沙箱各类失败的遥测安全消息（无法包装命令、配置无法安装、清扫残留等）。
 */
var SANDBOX_TELEMETRY_MESSAGES = {
  commandNotWrapped: "sandbox: sandbox-runtime could not wrap a command",
  configChangeAtStartNotApplied: "sandbox: config change caught during initialize could not be applied",
  configNotInstalled: "sandbox: a configuration could not be installed",
  configNotRebuilt: "sandbox: the config could not be rebuilt, so the running one is kept",
  configNotRebuiltAfterCloudSession: "sandbox: the config could not be rebuilt after a cloud session",
  configNotRebuiltForPluginFolder: "sandbox: config not rebuilt for a joining plugin folder",
  deniesOnAnotherHostNotDescribed:
    "sandbox: the warning for deny entries on another computer could not be worked out",
  denyEntryHostNotJudged: "sandbox: whether a deny entry names another computer could not be worked out",
  denyListsMayBeShort:
    "Windows sandbox: the deny lists stored in sandbox-runtime may lack Claude Code's own entries; installing the full lists again",
  fileActNotJudged: "sandbox: the check before Claude Code creates or deletes a file for the sandbox threw",
  fileActVerdictNotLogged: "sandbox: logging the verdict on a file that Claude Code creates or deletes threw",
  initFailed: "sandbox: failed to initialize",
  networkRuleNotApplied: "sandbox: a network rule that the user allowed could not be saved or applied",
  oneFolderNotGranted:
    "sandbox (Windows): adding the sandbox group's permission entry on one folder failed unexpectedly",
  parentFoldersNotGranted:
    "sandbox (Windows): adding the sandbox group's permission entries on the parent folders failed unexpectedly",
  pathEntryDropped: "sandbox: a path entry from settings could not be resolved",
  pathEntryRefused: "sandbox: a path entry from settings could not be resolved, so the config was not built",
  plantedEntryLeftInPlace: "sandbox: post-command scrub left a planted entry in place",
  plantedEntryMadeUnreadable:
    "sandbox: post-command scrub set a planted entry to mode 000 in place under an unrecorded parent",
  plantedEntryUnlinked: "sandbox: post-command scrub unlinked a planted entry after the move-aside failed",
  readDeniesNotRecheckedFirst:
    "sandbox: trusted read-deny paths could not be re-checked before the first command; rebuilding the config instead",
  readDeniesNotRecheckedLater:
    "sandbox: trusted read-deny paths could not be re-checked before a command; narrowing the running config instead",
  realPathOfDenyNotFound: "sandbox: the real path of a deny entry could not be worked out",
  scrubOutcomeNotLogged: "sandbox: logging what the scrub after a command did at a path threw",
  settingsWatchNotArmed: "sandbox: the settings watch after a failed config build could not be armed",
  unclassifiedIndicatorMovedAside:
    "sandbox: post-command scrub moved aside an indicator it could not classify at config build",
};
//@ chunk-qg41pqt6.js:858710-858932 placement
function reportSandboxErrorUnderStandIn(error, code) {
  let message = SANDBOX_TELEMETRY_MESSAGES[code];
  let wrapped = isTelemetryMessageWrapped(error, message);
  if (wrapped !== undefined) {
    logError(wrapped);
    return;
  }
  try {
    logForDebugging(`[sandbox] reported under a stand-in error as "${message}": ${errorMessage(error)}`, {
      level: "error",
    });
  } catch {}
  logError(withTelemetryMessage(Error("sandbox error (details are in the debug log)"), message));
}
//@ chunk-qg41pqt6.js:858932-859092 placement
function describeUnreadableSandboxError(error, code) {
  let message = SANDBOX_TELEMETRY_MESSAGES[code];
  let wrapped = isTelemetryMessageWrapped(error, message);
  if (wrapped !== undefined) return wrapped;
  let text = "sandbox error (its message could not be read)";
  try {
    text = String(errorMessage(error));
  } catch {}
  return withTelemetryMessage(toError(text), message);
}
//@ chunk-qg41pqt6.js:859092-859126 placement
/**
 * reportSandboxTelemetryError：上报沙箱遥测错误。
 */
function reportSandboxTelemetryError(code) {
  reportSandboxErrorUnderStandIn(Error(SANDBOX_TELEMETRY_MESSAGES[code]), code);
}
//@ chunk-qg41pqt6.js:859126-859209 placement
function isTelemetryMessageWrapped(error, message) {
  try {
    let wrapped = withTelemetryMessage(toError(error), message);
    return getTelemetryMessage(wrapped) === undefined ? undefined : wrapped;
  } catch {
    return;
  }
}
//@ chunk-qg41pqt6.js:908440-908554 placement
class SandboxInitFailedError extends Error {
  telemetryMessage = SANDBOX_TELEMETRY_MESSAGES.initFailed;
  constructor(message) {
    super(message);
    this.name = "SandboxInitFailedError";
  }
}
//@ chunk-qg41pqt6.js:908554-909085 placement
class SandboxProtectionNotRenewedError extends Error {
  constructor() {
    super(
      "The sandbox could not check that Claude Code's own files are still protected, so this command was not run. Try it once more. If it fails the same way, stop and tell the user: restarting Claude Code may clear it. If it does not, CLAUDE_CODE_SANDBOX_LEAVE_DENIES_TO_SRT_WIN=1 in the environment that Claude Code is started from (a settings file cannot set it) turns this check off, but the sandbox may then fail to start on a large profile.",
    );
    this.name = "SandboxProtectionNotRenewedError";
  }
}
//@ chunk-qg41pqt6.js:909085-909175 placement
class SandboxBridgeUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "SandboxBridgeUnavailableError";
  }
}
//@ chunk-1vxka8te.js:191-234 placement
/**
 * SANDBOX_UNAVAILABLE_MESSAGE：需要沙箱但不可用的说明。
 */
var SANDBOX_UNAVAILABLE_MESSAGE = "Sandbox required but unavailable";
export {
  SANDBOX_UNAVAILABLE_MESSAGE,
  reportSandboxErrorUnderStandIn,
  SANDBOX_TELEMETRY_MESSAGES,
  sandboxErrorSignalLazy,
  describeUnreadableSandboxError,
  SandboxInitFailedError,
  SandboxBridgeUnavailableError,
  reportSandboxTelemetryError,
  SandboxProtectionNotRenewedError,
};
