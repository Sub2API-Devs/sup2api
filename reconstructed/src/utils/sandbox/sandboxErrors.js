/**
 * utils/sandbox/sandboxErrors.ts
 *
 * 2.1.316 新增：沙箱不可用错误
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-67q125t6.js (1), chunk-fq0cr76a.js (11)
 * attribution: placement 12
 */
import { HostScoped } from "../hostScoped.js";
import { createSignal, createLazySignal } from "../signal.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logError } from "../log.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, withTelemetryMessage, toError, getTelemetryMessage } from "../errors.js";

//@ chunk-fq0cr76a.js:854253-854277 placement
var sandboxErrorSignalSlot = new HostScoped(() => createSignal());
//@ chunk-fq0cr76a.js:854277-854316 placement
function sandboxErrorSignal() {
  return sandboxErrorSignalSlot.of(getRootSession().host);
}
//@ chunk-fq0cr76a.js:854316-854331 placement
/**
 * sandboxErrorSignalLazy：沙箱错误的惰性信号。
 */
var sandboxErrorSignalLazy = createLazySignal(sandboxErrorSignal);
//@ chunk-fq0cr76a.js:854331-857015 placement
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
//@ chunk-fq0cr76a.js:857015-857237 placement
function reportSandboxErrorUnderStandIn(error, n) {
  let r = SANDBOX_TELEMETRY_MESSAGES[n];
  let s = isTelemetryMessageWrapped(error, r);
  if (s !== undefined) {
    logError(s);
    return;
  }
  try {
    logForDebugging(`[sandbox] reported under a stand-in error as "${r}": ${errorMessage(error)}`, {
      level: "error",
    });
  } catch {}
  logError(withTelemetryMessage(Error("sandbox error (details are in the debug log)"), r));
}
//@ chunk-fq0cr76a.js:857237-857397 placement
function describeUnreadableSandboxError(e, n) {
  let r = SANDBOX_TELEMETRY_MESSAGES[n];
  let s = isTelemetryMessageWrapped(e, r);
  if (s !== undefined) return s;
  let h = "sandbox error (its message could not be read)";
  try {
    h = String(errorMessage(e));
  } catch {}
  return withTelemetryMessage(toError(h), r);
}
//@ chunk-fq0cr76a.js:857397-857431 placement
/**
 * reportSandboxTelemetryError：上报沙箱遥测错误。
 */
function reportSandboxTelemetryError(e) {
  reportSandboxErrorUnderStandIn(Error(SANDBOX_TELEMETRY_MESSAGES[e]), e);
}
//@ chunk-fq0cr76a.js:857431-857514 placement
function isTelemetryMessageWrapped(e, n) {
  try {
    let r = withTelemetryMessage(toError(e), n);
    return getTelemetryMessage(r) === undefined ? undefined : r;
  } catch {
    return;
  }
}
//@ chunk-fq0cr76a.js:903620-903734 placement
class SandboxInitFailedError extends Error {
  telemetryMessage = SANDBOX_TELEMETRY_MESSAGES.initFailed;
  constructor(message) {
    super(message);
    this.name = "SandboxInitFailedError";
  }
}
//@ chunk-fq0cr76a.js:903734-904265 placement
class SandboxProtectionNotRenewedError extends Error {
  constructor() {
    super(
      "The sandbox could not check that Claude Code's own files are still protected, so this command was not run. Try it once more. If it fails the same way, stop and tell the user: restarting Claude Code may clear it. If it does not, CLAUDE_CODE_SANDBOX_LEAVE_DENIES_TO_SRT_WIN=1 in the environment that Claude Code is started from (a settings file cannot set it) turns this check off, but the sandbox may then fail to start on a large profile.",
    );
    this.name = "SandboxProtectionNotRenewedError";
  }
}
//@ chunk-fq0cr76a.js:904265-904355 placement
class SandboxBridgeUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "SandboxBridgeUnavailableError";
  }
}
//@ chunk-67q125t6.js:191-234 placement
/**
 * SANDBOX_UNAVAILABLE_MESSAGE：需要沙箱但不可用的说明。
 */
var SANDBOX_UNAVAILABLE_MESSAGE = "Sandbox required but unavailable";
export {
  reportSandboxErrorUnderStandIn,
  SANDBOX_UNAVAILABLE_MESSAGE,
  SANDBOX_TELEMETRY_MESSAGES,
  sandboxErrorSignalLazy,
  describeUnreadableSandboxError,
  SandboxInitFailedError,
  SandboxBridgeUnavailableError,
  reportSandboxTelemetryError,
  SandboxProtectionNotRenewedError,
};
