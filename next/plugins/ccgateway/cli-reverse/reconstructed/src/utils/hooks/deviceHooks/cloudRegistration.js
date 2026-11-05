/**
 * utils/hooks/deviceHooks/cloudRegistration.ts
 *
 * 设备钩子向云会话注册（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { plural } from "../../stringUtils.js";
import { ControlRequestTimeoutError } from "../../../remote/controlRequestErrors.js";
import { sanitizeDisplayText } from "../../resultError.js";
import { anyPairMatches, collectStickyRoots, stickyRootsFor } from "../../settings/stickyRoots.js";
import { hasAnyHookEntries, DEVICE_HOOK_SCOPES, emptyEligibilityState } from "./eligibility.js";
import { jsonStringify } from "../../slowOperations.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { countWhere } from "../../collections.js";
import { isAbsolutePlatformPath } from "../../git.js";
import { stripInvisibleChars } from "../../invisibleChars.js";
import { RegisterDeviceHooksResponseSchema } from "../../../entrypoints/sdk/controlSchemas.js";
import { emptyConsentState, createConsentSignal } from "./consent.js";
import { createSignal } from "../../signal.js";
import { HostScoped } from "../../hostScoped.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:266615-266858 placement
var REGISTRATION_LEASE_S = 180;
var REGISTRATION_REFRESH_CHECK_MS = 3000;
var REGISTRATION_TIMEOUT_MS = 120000;
var MAX_UNTEMPLATED_HOOKS = 8;
var UNREGISTER_TIMEOUT_MS = 1500;
var RETRY_REGISTRATION_TIMEOUT_MS = 15000;
var SHORT_REGISTRATION_TIMEOUT_MS = 30000;
var REGISTRATION_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000];
var TRIGGER_DEBOUNCE_MS = 1000;
var RESYNC_DEDUPE_MS = 5000;
var RESYNC_TRIGGER_PRIORITY = {
  settings: 5,
  consent: 4,
  mute: 3,
  worker_up: 3,
  template_fallback: 3,
  stopped_while_running: 3,
  connected: 2,
  retry: 1,
  renewal: 1,
  send: 1,
  init: 0,
};
var MAX_REFUSAL_TEXT_CHARS = 120;
//@ chunk-7jxyna5q.js:266858-267092 placement
function hooksStartOutsideProjectNotice(count) {
  return `${count} ${plural(count, "hook")} ${plural(count, "starts", "start")} in an empty folder for cloud sessions. A hook in your user settings marked "cloud": "device" starts in the project instead, where the cloud session can change files.`;
}
//@ chunk-7jxyna5q.js:267092-267150 placement
class SupersededError extends Error {
  constructor() {
    super("superseded");
  }
}
//@ chunk-7jxyna5q.js:267150-267371 placement
function classifyControlRequestError(error) {
  if (error instanceof ControlRequestTimeoutError) return "timeout";
  let message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Unsupported control request subtype")) return "unsupported";
  let match = /^([a-z_]+):/.exec(message);
  return match ? match[1] : "failed";
}
//@ chunk-7jxyna5q.js:267371-267489 placement
function refusalMessageText(error) {
  let message = error instanceof Error ? error.message : String(error);
  return sanitizeDisplayText(message.replace(/^[a-z_]+:\s*/, ""), {
    maxCodeUnits: MAX_REFUSAL_TEXT_CHARS,
  });
}
//@ chunk-7jxyna5q.js:267489-271782 placement
/**
 * 设备钩子云端不可用的原因文案表（功能未开、策略限制、会话类型不支持等），含模板失败与来源说明。
 */
var DEVICE_HOOKS_UNAVAILABLE_TEXTS = {
  flag_off: "the feature is not switched on for your account in the cloud",
  policy: "a managed policy in the cloud session allows only its own hooks",
  disabled: "it is switched off in that cloud environment",
  entrypoint: "this kind of cloud session does not support it",
  not_managed_cloud_worker: "this kind of cloud session does not support it",
  hermetic: "that session is sealed off from outside input",
};
var CLOUD_HOOK_REFUSAL_TEXTS = {
  interpreter_unavailable: "its interpreter is missing in the cloud",
  install_failed: "it could not be installed there",
  event_not_allowed: "it is set on an event or matcher the cloud does not run it under",
  disabled: "cloud-run templates are off there",
  awaiting_upload: "its copy has not reached the cloud yet",
  version_mismatch: "the cloud expects a different copy of it",
  digest_mismatch: "its copy did not arrive intact",
  too_large: "its copy is too large",
  unknown_template: "this cloud session does not know that template",
};
var HOOK_SOURCE_SHORT_LABELS = {
  user: "your user settings.json",
  local: "this folder's .claude/settings.local.json",
  flag: "the --settings file",
};
var SETTINGS_SCOPE_LABELS = {
  userSettings: "your user settings.json",
  projectSettings: "this folder's .claude/settings.json",
  localSettings: "this folder's .claude/settings.local.json",
  flagSettings: "the --settings file",
  policySettings: "the managed settings file",
};
var SENDER_UNVERIFIED_TEXT =
  "Not running this machine's hooks for the cloud session: it hasn't answered and doesn't recognize this machine as a trusted device. To run them, start a session from this machine with claude --cloud.";
var REMOTE_TOOLS_KILL_SWITCH_ON_TEXT =
  "Remote tool serving was turned off by Anthropic (emergency switch). Your hooks are not offered to cloud sessions from this computer until it is turned back on.";
var REMOTE_TOOLS_KILL_SWITCH_OFF_TEXT =
  "Remote tool serving was turned back on by Anthropic. Your hooks are offered to this cloud session again.";
var CHECKOUT_DISABLE_ALL_NOTE =
  "A settings file in this checkout switches all hooks off (disableAllHooks); that holds for this terminal, but not for the cloud session \u2014 this machine's hooks are still offered to it, because the session itself could have written that file. Put disableAllHooks in your user settings to switch them off for cloud sessions too.";
var LOCAL_HOOKS_DISABLED_TEXTS = {
  policy_disable_all:
    "Hooks are switched off on this machine by an org policy (disableAllHooks); nothing from this machine is offered to the cloud session.",
  managed_only:
    "Only managed hooks run on this machine (an org policy, or safe mode); hooks from your own settings are not offered to the cloud session.",
  plugin_only:
    "This machine is restricted to plugin hooks; hooks from your settings files are not offered to the cloud session.",
  bare: "This terminal runs with hooks off (bare mode); nothing from this machine is offered to the cloud session.",
  disabled_by_settings:
    "All hooks are switched off in your user settings or --settings file (disableAllHooks); nothing from this machine is offered to the cloud session.",
  policy_unreadable:
    "This machine's managed policy could not be read, so its hook switches are unknown; nothing from this machine is offered to the cloud session until it can be.",
  untrusted_workspace:
    "This folder is not a trusted workspace; hooks from this machine are not offered to the cloud session started here.",
};
var UNTRUSTED_SOURCE_REASONS = {
  untrusted: "this folder is not marked trusted on this machine",
  repo_provenance:
    "that file is committed to the repository (or its provenance could not be read), so the cloud session's own copy is what applies",
  runtime_patch: "hooks given with --settings cannot be told apart from ones added at run time",
  served_folder:
    "the cloud session this computer serves can write that file, and nobody is at a terminal here to vouch for it",
};
var LOCAL_ONLY_REASON_LABELS = {
  after_edit: "after-edit",
  kind_unsupported: "not a command hook",
  event_runs_locally: "event not forwarded",
  event_later: "event not forwarded",
  event_low_value: "event not forwarded",
  event_container_internal: "event not forwarded",
  source_in_sync_root: "in a settings file the cloud session may change",
  sync_root_is_config_dir: "in a settings file the cloud session may change",
  unverifiable_target: "script unreadable",
  in_reach: "where the cloud session can write",
  interpreter_unvouched: "an interpreter this machine cannot vouch for",
  loads_from_reach: "loads from where the cloud session can write",
  unpinned_command: "not a single script",
  duplicate: "duplicate",
  over_cap: "over the limit",
  pattern_matcher: "a pattern matcher",
  author_skip: 'marked cloud: "skip"',
};
//@ chunk-7jxyna5q.js:271782-271911 placement
function describeCloudRefusal(table, key) {
  return (
    (Object.hasOwn(table, key) ? table[key] : undefined) ??
    `the cloud session said "${sanitizeDisplayText(key.replace(/_/g, " "), {
      maxCodeUnits: 60,
    })}"`
  );
}
//@ chunk-7jxyna5q.js:271911-272180 placement
function deviceHooksRegistrationState(entry, now) {
  switch (entry.standing.kind) {
    case "dormant":
      return entry.standing.registeredBefore ? "dormant" : "not_registered";
    case "registered":
      return entry.lapsesUnusedAt !== null && now >= entry.lapsesUnusedAt ? "dormant" : null;
    case "idle":
    case "kept_none":
    case "paused":
    case "stopped":
      return null;
  }
}
//@ chunk-7jxyna5q.js:272180-272571 placement
/**
 * 创建设备 hook 发送方的记忆状态：基线、被拒模板、选择加入的固定项等。
 */
function createDeviceHookSenderMemory() {
  return {
    baseline: null,
    baselineLocated: false,
    refusedTemplates: new Set(),
    refusedTemplatesLife: null,
    refusedTemplatesSession: null,
    optInPins: new Map(),
    standing: {
      kind: "idle",
    },
    lapsesUnusedAt: null,
    stickyRoots: new Set(),
    lastSyncRoot: null,
    knownSpellings: new Map(),
    everInReach: new Set(),
    localSettingsLocation: {
      current: null,
    },
    reachBaseline: null,
    pinnedScopes: new Set(),
    commonRoots: null,
    pinnedRoots: new Map(),
  };
}
//@ chunk-7jxyna5q.js:272571-272694 placement
function countByValue(values) {
  let counts = new Map();
  for (let value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([value, n]) => `${value} \xD7${n}`).join(", ");
}
//@ chunk-7jxyna5q.js:272694-272982 placement
async function isHookScopeInReach(roots, scopes, deps) {
  for (let scope of scopes) {
    if (scope === "local" || deps.everInReach?.has(scope)) return true;
    let settingsFile = deps.scopeSettingsFile(scope === "user" ? "userSettings" : "flagSettings");
    if (settingsFile === null) continue;
    let realPath = await deps.realpath(settingsFile).catch(() => null);
    if (
      anyPairMatches(realPath === null ? [settingsFile] : [settingsFile, realPath], roots) ||
      (realPath === null && scope === "user")
    )
      return true;
  }
  return false;
}
//@ chunk-7jxyna5q.js:272982-273669 placement
function describeDeviceHookOutcome(inventory, counts) {
  let parts = [];
  let forwardedCount = inventory.forwarded.length;
  let ignoredNote =
    counts !== undefined && counts.ignored > 0
      ? ` \u2014 the cloud session accepted ${counts.accepted} and ignored ${counts.ignored}`
      : "";
  parts.push(
    forwardedCount === 0
      ? "no hook runs on this machine for the cloud session"
      : `${forwardedCount} ${plural(forwardedCount, "hook")} ${plural(forwardedCount, "runs", "run")} on this machine when the cloud session asks (${countByValue(inventory.forwarded.map((entry) => entry.wire.event))})${ignoredNote}`,
  );
  if (inventory.held.length > 0)
    parts.push(
      `${inventory.held.length} ${plural(inventory.held.length, "stays", "stay")} local-only (${countByValue(inventory.held.map((entry) => LOCAL_ONLY_REASON_LABELS[entry.reason]))})`,
    );
  if (inventory.templates.length > 0)
    parts.push(
      `${inventory.templates.length} ${plural(inventory.templates.length, "runs", "run")} in the cloud (${inventory.templates.map((template) => template.local.templateId).join(", ")})`,
    );
  return `Hooks \u25B8 ${parts.join("; ")}.`;
}
//@ chunk-7jxyna5q.js:273669-273746 placement
/**
 * 判断捕获结果是否为"已捕获且有钩子"。
 */
function hasCapturedHooks(captured) {
  return captured.kind === "captured" && captured.sources.some((source) => hasAnyHookEntries(source.hooks));
}
//@ chunk-7jxyna5q.js:273746-273864 placement
function captureFingerprint(captured) {
  return captured.kind === "captured"
    ? jsonStringify(captured.sources.map((source) => [source.source, source.settingsFile, source.hooks]))
    : `none:${captured.reason}`;
}
//@ chunk-7jxyna5q.js:273864-297906 placement
/**
 * 把本机钩子注册到云会话并接收回调（静默、停止、捕获状态）
 */
function DeviceHooksRegistration(options) {
  options.memory.standing = options.servingMuted
    ? {
        kind: "stopped",
        reason: "muted",
      }
    : {
        kind: "idle",
      };
  options.memory.lapsesUnusedAt = null;
  if (options.memory.refusedTemplatesSession !== options.cloudSessionId) {
    options.memory.refusedTemplates.clear();
    options.memory.refusedTemplatesLife = null;
    options.memory.refusedTemplatesSession = options.cloudSessionId;
  }
  let retiredInstanceIds = new Set();
  let entry = {
    number: 0,
    instanceId: options.mintInstanceId(),
    captured: null,
    inventory: null,
    inventoryDirty: true,
  };
  let memory = options.memory;
  if (memory.baseline === null) {
    let captured = options.capture();
    memory.baseline = captured;
    if (captured.kind === "captured") {
      for (let source of captured.sources)
        if (source.settingsFile !== null)
          memory.knownSpellings.set(source.source, new Set([source.settingsFile]));
    }
  }
  let baseline = memory.baseline;
  memory.reachBaseline ??= new Map(
    SETTING_SOURCES.map((source) => [source, options.scopeWriteEntries(source)]),
  );
  let reachBaseline = memory.reachBaseline;
  memory.commonRoots ??= options.commonWriteRoots();
  let { commonRoots, stickyRoots, refusedTemplates } = memory;
  let workerEpoch = null;
  let leaseExpiresAt = null;
  let leaseS = REGISTRATION_LEASE_S;
  let templateStatuses = {};
  let uploadedTemplates = new Set();
  let templatesUnsupported = false;
  let registered = null;
  let phase = options.servingMuted ? "stopped" : "idle";
  let stoppedReason = options.servingMuted ? "muted" : undefined;
  let servingMuted = options.servingMuted;
  let muteNoted = false;
  let unmuteNoted = false;
  let inFlight = null;
  let queuedReason = null;
  let resumedAfterConsent = false;
  let renewalTimer = null;
  let renewalDue = false;
  let turnActive = false;
  let turnInFlight = false;
  let leaseUntilMs = 0;
  let holdsTemplates = false;
  let registeredBefore = false;
  let noteRegistered = (instanceId, response) => {
    leaseUntilMs = options.now() + response.lease_s * 1000;
    holdsTemplates = response.templates.length > 0;
    registeredBefore = true;
    dropHeld(instanceId);
  };
  let heldEntries = [];
  let stillHeld = (now) => heldEntries.filter((entry) => entry.withTemplates || now < entry.mayBeHeldUntil);
  let noteHeld = (instanceId, withTemplates, listenMs) => {
    let mayBeHeldUntil = options.now() + listenMs + leaseS * 1000;
    if (instanceId === registered?.instanceId) leaseUntilMs = Math.max(leaseUntilMs, mayBeHeldUntil);
    let now = options.now();
    let merged = [
      ...heldEntries.filter(
        (entry) => entry.instanceId !== instanceId && (entry.withTemplates || now < entry.mayBeHeldUntil),
      ),
      {
        instanceId,
        withTemplates:
          withTemplates ||
          heldEntries.some((entry) => entry.instanceId === instanceId && entry.withTemplates),
        mayBeHeldUntil,
      },
    ];
    heldEntries = [
      ...merged.filter((entry) => entry.withTemplates),
      ...merged.filter((entry) => !entry.withTemplates).slice(-MAX_UNTEMPLATED_HOOKS),
    ];
  };
  let dropHeld = (instanceId) => {
    heldEntries = heldEntries.filter((entry) => entry.instanceId !== instanceId);
  };
  let retryTimer = null;
  let retryAt = 0;
  let retryIndex = 0;
  let staleCount = 0;
  let seenWorkerEpoch = null;
  let lastFingerprint = null;
  let resyncQueued = false;
  let pendingUnregister = null;
  let unregistering = false;
  let { knownSpellings, everInReach } = memory;
  let templateAttempts = new Map();
  let disposed = false;
  let abortController = new AbortController();
  let toldKeys = new Set();
  let lastSummary = null;
  let consentChoice = null;
  let consentDeclined = null;
  let lastConsent = null;
  let consentNow = () => consentChoice;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let lastOutcome = null;
  let attempt = 0;
  let flagsUnanswered = false;
  let stoppedWhileRunningAt = null;
  let initBlockedUntil = 0;
  let initHeld = false;
  let lapseKeys = new Set();
  let formatClock =
    options.formatClock ??
    ((time) =>
      new Date(time).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }));
  let remedyHint = "run /hooks to change that";
  let noteDeclined = () => {
    noteOnce(
      "declined",
      `Hooks stay on this machine only \u2014 you chose not to run them for cloud sessions (${remedyHint}).`,
      "debug",
    );
    stop("declined");
  };
  let noteOnce = (key, line, level = "info") => {
    if (toldKeys.has(key)) return;
    toldKeys.add(key);
    options.onLine({
      line,
      level,
    });
  };
  let noteCheckoutDisabled = () => noteOnce("checkout-disable-all", CHECKOUT_DISABLE_ALL_NOTE, "warning");
  let noteMuted = () => {
    if (baseline === null || !hasCapturedHooks(baseline)) return;
    toldKeys.delete("unmuted");
    noteOnce("muted", REMOTE_TOOLS_KILL_SWITCH_ON_TEXT);
    unmuteNoted = true;
  };
  let noteUnmuted = () => {
    if (!unmuteNoted || consentChoice === "declined") return;
    unmuteNoted = false;
    noteOnce("unmuted", REMOTE_TOOLS_KILL_SWITCH_OFF_TEXT);
  };
  let report = (
    outcome,
    trigger,
    accepted = {
      accepted: 0,
      ignored: 0,
    },
    entry_2 = entry,
  ) => {
    let inventory = entry_2.inventory;
    lastOutcome = outcome;
    let heldByReason = {};
    for (let held of inventory?.held ?? []) heldByReason[held.reason] = (heldByReason[held.reason] ?? 0) + 1;
    options.telemetry({
      outcome,
      trigger,
      forwarded: inventory?.forwarded.length ?? 0,
      templates: inventory?.templates.length ?? 0,
      heldAfterEdit: inventory?.heldCounts.after_edit ?? 0,
      heldOther: inventory === null ? 0 : countWhere(inventory.held, (held) => held.reason !== "after_edit"),
      heldByReason,
      accepted: accepted.accepted,
      ignored: accepted.ignored,
      attempt,
      afterFlagsUnanswered: flagsUnanswered,
    });
    if (
      outcome === "registered" ||
      outcome === "unregistered" ||
      outcome === "nothing_to_offer" ||
      outcome === "no_consent" ||
      outcome === "dormant"
    )
      attempt = 0;
  };
  let clearRenewal = () => {
    renewalTimer?.clear();
    renewalTimer = null;
    renewalDue = false;
    memory.lapsesUnusedAt = null;
    turnInFlight = false;
    retryTimer?.clear();
    retryTimer = null;
  };
  let unregisterInstance = (instanceId, timeoutMs) =>
    options
      .sendRequest(
        {
          subtype: "register_device_hooks",
          instance_id: instanceId,
          display_name: options.displayName,
          ...(workerEpoch !== null && {
            worker_epoch: workerEpoch,
          }),
          hooks: [],
          templates: [],
        },
        {
          timeoutMs,
        },
      )
      .then(
        () => {},
        () => {},
      );
  let releaseAll = async (budgetMs) => {
    let current = registered;
    let now = options.now();
    let hasSent = (instanceId) => inFlight !== null && inFlight.sent && inFlight.instanceId === instanceId;
    let justSent = current !== null && hasSent(current.instanceId);
    let stillHeld_2 =
      current !== null && stillHeld(now).some((entry) => entry.instanceId === current.instanceId);
    let leaseStale =
      leaseUntilMs !== 0 && now >= leaseUntilMs && !holdsTemplates && !justSent && !stillHeld_2;
    leaseExpiresAt = null;
    registered = null;
    renewalDue = false;
    memory.lapsesUnusedAt = null;
    if (phase !== "stopped") {
      phase = "idle";
      memory.standing = {
        kind: "idle",
      };
    }
    let filtered = stillHeld(now).filter(
      (entry) => entry.instanceId !== current?.instanceId && !hasSent(entry.instanceId),
    );
    heldEntries = heldEntries.filter((entry) => hasSent(entry.instanceId));
    await Promise.all([
      ...filtered.map((entry) => unregisterInstance(entry.instanceId, budgetMs)),
      current === null || leaseStale ? undefined : unregisterInstance(current.instanceId, budgetMs),
    ]);
  };
  let stop = (reason) => {
    phase = "stopped";
    memory.standing = {
      kind: "stopped",
      reason,
    };
    stoppedReason = reason;
    clearRenewal();
    leaseExpiresAt = null;
    if (reason !== "muted") options.arm(null);
    releaseAll(UNREGISTER_TIMEOUT_MS);
  };
  let rotateInstance = () => {
    retiredInstanceIds.add(entry.instanceId);
    entry = {
      number: entry.number + 1,
      instanceId: options.mintInstanceId(),
      captured: null,
      inventory: null,
      inventoryDirty: true,
    };
  };
  let pause = (reason) => {
    leaseExpiresAt = null;
    phase = "idle";
    memory.standing = {
      kind: "paused",
    };
    renewalTimer?.clear();
    renewalTimer = null;
    retryTimer?.clear();
    retryTimer = null;
    retryIndex = 0;
    renewalDue = false;
    memory.lapsesUnusedAt = null;
    lastSummary = null;
    initBlockedUntil = options.now() + Math.max(30000, leaseS * 500);
    options.arm(null);
    noteOnce(`lapse:${reason}`, reason, "warning");
    lapseKeys.add(`lapse:${reason}`);
  };
  let armRenewal = () => {
    renewalTimer?.clear();
    renewalTimer = options.setTimer(
      () => {
        renewalTimer = null;
        if (lapseIfDue()) return;
        if (turnActive || turnInFlight) {
          requestRegistration("renewal");
          return;
        }
        renewalDue = true;
        memory.lapsesUnusedAt = leaseExpiresAt;
      },
      Math.max(30000, leaseS * 500),
    );
  };
  let checkLeaseOut = () => {
    lapseIfDue();
    turnActive = true;
    if (renewalDue && phase === "registered") {
      renewalDue = false;
      memory.lapsesUnusedAt = null;
      requestRegistration("renewal");
    } else if (memory.standing.kind === "dormant" && inFlight === null) requestRegistration("init", false);
  };
  let needsRefresh = () =>
    !turnActive &&
    !turnInFlight &&
    ((renewalDue && phase === "registered") ||
      memory.standing.kind === "dormant" ||
      (phase === "registered" && leaseExpiresAt !== null && options.now() >= leaseExpiresAt - leaseS * 500));
  let nothingHeld = () =>
    stillHeld(options.now()).length === 0 &&
    (registered === null || (leaseUntilMs !== 0 && options.now() >= leaseUntilMs && !holdsTemplates));
  let stopForNothing = () => {
    resyncQueued = true;
    memory.lapsesUnusedAt = null;
    if (memory.standing.kind === "dormant")
      memory.standing = {
        kind: "idle",
      };
    options.arm(null);
  };
  let goDormant = (trigger, entry, senderUnverified = false) => {
    report("dormant", trigger, undefined, entry);
    clearRenewal();
    retryIndex = 0;
    turnActive = false;
    leaseExpiresAt = null;
    workerEpoch = null;
    phase = "idle";
    memory.standing = {
      kind: "dormant",
      registeredBefore,
      ...(senderUnverified && {
        senderUnverified,
      }),
    };
    options.arm(null);
  };
  let lapseIfDue = (trigger = "renewal") => {
    if (
      disposed ||
      unregistering ||
      inFlight !== null ||
      (retryTimer !== null && options.now() - retryAt < Math.max(30000, leaseS * 500)) ||
      phase !== "registered" ||
      leaseExpiresAt === null ||
      options.now() < leaseExpiresAt
    )
      return false;
    goDormant(trigger);
    return true;
  };
  let retryLater = () => {
    let delayMs = REGISTRATION_RETRY_DELAYS_MS[retryIndex];
    if (delayMs === undefined) {
      retryIndex = 0;
      return false;
    }
    retryIndex += 1;
    retryTimer?.clear();
    let retryAt_2 = options.now() + delayMs;
    retryAt = retryAt_2;
    retryTimer = options.setTimer(() => {
      retryTimer = null;
      if (options.now() - retryAt_2 >= Math.max(30000, leaseS * 500)) {
        retryIndex = 0;
        if (!lapseIfDue() && phase === "idle" && !disposed && !unregistering) goDormant("retry");
        return;
      }
      requestRegistration("retry");
    }, delayMs);
    return true;
  };
  let assertCurrent = (entry_2) => {
    if (disposed || unregistering || entry_2.number !== entry.number) throw new SupersededError();
  };
  let collectRoots = async (syncRoot) => {
    let projectRootReal = await options.realpath(options.projectRoot).catch(() => options.projectRoot);
    await collectStickyRoots({
      stickyRoots,
      pinnedScopes: memory.pinnedScopes,
      pinnedRoots: memory.pinnedRoots,
      baseRoots: [
        ...stickyRootsFor({
          launchDir: options.launchDir,
          launchDirReal: await options.launchDirReal(),
          ...(syncRoot !== null && {
            syncRoot: syncRoot.root,
            syncRootReal: syncRoot.real,
          }),
        }),
        ...[options.projectRoot, projectRootReal].filter(isAbsolutePlatformPath),
      ],
      reachBaseline,
      scopeSettingsFile: options.scopeSettingsFile,
      realpath: options.realpath,
      commonRoots: () => commonRoots,
      scopeRoots: options.scopeWriteRoots,
    });
    for (let pinnedScope of memory.pinnedScopes)
      if (
        !toldKeys.has(`reach:${pinnedScope}`) &&
        jsonStringify(options.scopeWriteEntries(pinnedScope)) !==
          jsonStringify(reachBaseline.get(pinnedScope) ?? [])
      ) {
        noteOnce(
          `reach:${pinnedScope}`,
          `The places Claude may write in ${SETTINGS_SCOPE_LABELS[pinnedScope]} changed during this cloud session. Because the cloud session can write that file, this session keeps judging which of this machine's hooks it may run by what the file held when you launched \u2014 restart claude --cloud to apply your edit. If neither you nor another session on this machine changed it, the cloud session may have: check that file before relaunching, since a relaunch trusts whatever it says.`,
          "warning",
        );
        options.reachPinnedTelemetry?.(pinnedScope);
      }
    return [...stickyRoots];
  };
  let isScopeInReach = (roots, scopes) =>
    isHookScopeInReach(roots, scopes, {
      realpath: options.realpath,
      scopeSettingsFile: options.scopeSettingsFile,
      everInReach,
    });
  let pinCapturedHooks = async (captured, roots) => {
    let baseline = memory.baseline;
    if (baseline === null) return captured;
    if (captured.kind === "none") {
      if (
        captured.reason === "disabled_by_settings" &&
        baseline.kind === "captured" &&
        (await isScopeInReach(roots, captured.switchSources ?? ["user", "flag"]))
      ) {
        if (hasCapturedHooks(baseline))
          noteOnce(
            "none:settings",
            "All hooks were switched off in a settings file during this cloud session; for the cloud session this machine keeps the hooks it had when you launched \u2014 restart claude --cloud to apply the change. If you did not change it, the cloud session may have.",
            "warning",
          );
        return baseline;
      }
      return captured;
    }
    if (baseline.kind === "none" && baseline.reason === "disabled_by_settings") {
      if (hasCapturedHooks(captured))
        noteOnce(
          "none:lifted",
          "All hooks were switched off in a settings file when this cloud session started and that switch has since been removed; for the cloud session this machine keeps them off \u2014 restart claude --cloud to offer them. If you did not change it, the cloud session may have.",
          "warning",
        );
      return baseline;
    }
    let sources = baseline.kind === "captured" ? baseline.sources : [];
    let rememberSpelling = async (source, settingsFile) => {
      let spellings = knownSpellings.get(source) ?? new Set();
      if (settingsFile !== null) {
        spellings.add(settingsFile);
        await options.realpath(settingsFile).then(
          (realPath) => spellings.add(realPath),
          () => everInReach.add(source),
        );
      }
      knownSpellings.set(source, spellings);
      return [...spellings];
    };
    let currentBySource = new Map(captured.sources.map((source) => [source.source, source]));
    let keptSources = [];
    for (let source of DEVICE_HOOK_SCOPES) {
      let current = currentBySource.get(source) ?? null;
      let baselineSource = sources.find((source_2) => source_2.source === source) ?? null;
      let settingsFile = current?.settingsFile ?? baselineSource?.settingsFile ?? null;
      let spellings = await rememberSpelling(source, settingsFile);
      let inReach = everInReach.has(source) || anyPairMatches(spellings, roots);
      if (inReach) everInReach.add(source);
      if (!inReach) {
        if (current !== null) keptSources.push(current);
        continue;
      }
      let label =
        settingsFile === null ? HOOK_SOURCE_SHORT_LABELS[source] : stripInvisibleChars(settingsFile);
      if (baselineSource === null) {
        if (current !== null) {
          noteOnce(
            `appeared:${source}`,
            `A hooks file appeared at ${label} during this cloud session, where the session itself can write; it is ignored for this session.`,
            "warning",
          );
          options.sourcePinnedTelemetry?.({
            source,
            changed: false,
            appeared: true,
            vanished: false,
          });
        }
        continue;
      }
      if (current === null || jsonStringify(current.hooks) !== jsonStringify(baselineSource.hooks)) {
        noteOnce(
          `pinned:${source}`,
          source === "local"
            ? `Hooks changed in ${label}, which the cloud session can write. The change is ignored for this session. Check the file, then restart claude --cloud.`
            : `${label} changed during this cloud session. If neither you nor another session on this machine changed it, the cloud session may have: check that file before relaunching.`,
          "warning",
        );
        options.sourcePinnedTelemetry?.({
          source,
          changed: true,
          appeared: false,
          vanished: current === null,
        });
      }
      keptSources.push(baselineSource);
    }
    let keptSourceNames = new Set(keptSources.map((source) => source.source));
    return {
      ...captured,
      sources: keptSources,
      withheld: captured.withheld.filter((withheld) => !keptSourceNames.has(withheld.source)),
    };
  };
  let inventoryFor = async (entry) => {
    if (entry.inventory !== null && !entry.inventoryDirty) return entry.inventory;
    let syncRoot = await options.syncRoot();
    assertCurrent(entry);
    memory.lastSyncRoot = syncRoot;
    let reachRoots = await collectRoots(syncRoot);
    assertCurrent(entry);
    if (entry.captured === null) {
      let captured = options.capture();
      baseline = captured;
      lastFingerprint = captureFingerprint(captured);
      memory.baseline ??= captured;
      let baseline_2 = memory.baseline;
      if (!memory.baselineLocated && baseline_2.kind === "captured") {
        memory.baselineLocated = true;
        for (let source of baseline_2.sources)
          if (source.settingsFile !== null) {
            let spellings = knownSpellings.get(source.source) ?? new Set();
            spellings.add(source.settingsFile);
            await options.realpath(source.settingsFile).then(
              (realPath) => spellings.add(realPath),
              () => everInReach.add(source.source),
            );
            knownSpellings.set(source.source, spellings);
            if (anyPairMatches([...spellings], reachRoots)) everInReach.add(source.source);
          }
        assertCurrent(entry);
      }
      entry.captured = captured === memory.baseline ? captured : await pinCapturedHooks(captured, reachRoots);
      assertCurrent(entry);
    }
    let inventory = await options.buildInventory({
      captured: entry.captured,
      instanceId: entry.instanceId,
      syncRoot,
      reachRoots,
      withoutTemplates: refusedTemplates,
    });
    assertCurrent(entry);
    entry.inventory = inventory;
    let consent = await options.ensureConsent(null, abortController.signal, reachRoots);
    assertCurrent(entry);
    consentDeclined = consent === "declined";
    if (consentDeclined) return inventory;
    entry.inventoryDirty = false;
    for (let notice of inventory.notices) noteOnce(`notice:${notice}`, notice);
    let unmarkedCount =
      options.servicerDefaults.unmarkedStartFolder === "private"
        ? countWhere(
            inventory.forwarded,
            (forwarded) => forwarded.local.hook.type === "command" && forwarded.local.cloudOptIn !== true,
          )
        : 0;
    if (unmarkedCount > 0) noteOnce("start-outside-project", hooksStartOutsideProjectNotice(unmarkedCount));
    if (entry.captured.kind === "captured") {
      for (let { source, reason } of entry.captured.withheld)
        noteOnce(
          `withheld:${source}:${reason}`,
          `Hooks from ${HOOK_SOURCE_SHORT_LABELS[source]} are not offered to the cloud session: ${UNTRUSTED_SOURCE_REASONS[reason]}.`,
        );
      if (
        (entry.captured.checkoutDisablesAllHooks && hasCapturedHooks(entry.captured)) ||
        (baseline?.kind === "captured" && baseline.checkoutDisablesAllHooks && hasCapturedHooks(baseline))
      )
        noteCheckoutDisabled();
    } else noteOnce(`none:${entry.captured.reason}`, LOCAL_HOOKS_DISABLED_TEXTS[entry.captured.reason]);
    return inventory;
  };
  let armServicer = async (entry, inventory, response, launchDirReal) => {
    let cloudWritableRoots = await collectRoots(await options.syncRoot());
    assertCurrent(entry);
    if (consentChoice === "declined") return;
    options.arm({
      instanceId: entry.instanceId,
      retiredInstanceIds: new Set(retiredInstanceIds),
      displayName: options.displayName,
      cloudSessionId: options.cloudSessionId,
      inventory,
      roots: {
        containerProjectDir: response.project_dir,
        containerCwd: response.cwd,
        deviceLaunchDir: options.launchDir,
      },
      frame: {
        launchDir: options.launchDir,
        projectRoot: options.launchDir,
        cloudSessionId: options.cloudSessionId,
      },
      launchDirReal,
      cloudWritableRoots,
      ...options.servicerDefaults,
    });
  };
  let uploadTemplates = async (entry, inventory) => {
    if (templatesUnsupported) return false;
    let anyRefused = false;
    for (let template of inventory.templates) {
      let key = `${template.wire.template}:${template.wire.digest}`;
      if (uploadedTemplates.has(key)) continue;
      try {
        await options.sendRequest(
          {
            subtype: "upload_device_hook_template",
            template: template.wire.template,
            digest: template.wire.digest,
            content_base64: template.local.bytes.toString("base64"),
            ...(workerEpoch !== null && {
              worker_epoch: workerEpoch,
            }),
          },
          {
            timeoutMs:
              leaseExpiresAt === null || options.now() >= leaseExpiresAt
                ? REGISTRATION_TIMEOUT_MS
                : SHORT_REGISTRATION_TIMEOUT_MS,
          },
        );
        assertCurrent(entry);
        uploadedTemplates.add(key);
      } catch (error) {
        if (error instanceof SupersededError) throw error;
        assertCurrent(entry);
        let errorKind = classifyControlRequestError(error);
        if (errorKind === "unsupported") {
          templatesUnsupported = true;
          for (let template of inventory.templates) refusedTemplates.add(template.local.templateId);
          noteOnce(
            "template:unsupported",
            `This cloud session cannot take hook templates (${inventory.templates.map((template) => template.local.templateId).join(", ")}); they stay on this machine for it.`,
          );
          return inventory.templates.length > 0;
        }
        if (errorKind === "template_refused" || errorKind === "invalid_upload") {
          noteOnce(
            `template:${template.local.templateId}:${errorKind}`,
            `${template.local.templateId} could not be moved to the cloud (${describeCloudRefusal(CLOUD_HOOK_REFUSAL_TEXTS, refusalMessageText(error))}); it runs on this machine instead.`,
          );
          refusedTemplates.add(template.local.templateId);
          anyRefused = true;
          continue;
        }
        throw error;
      }
    }
    return anyRefused;
  };
  let register = async (entry_2, trigger, now, onEchoed) => {
    let flags = options.hookFlags();
    if (flags === "unanswered") {
      if (!flagsUnanswered) {
        flagsUnanswered = true;
        report("flag_unanswered", trigger);
      }
      return;
    }
    if (flags === "answered_off") {
      report("flag_off", trigger);
      noteOnce(
        "flag_off",
        "Hooks from this machine are not offered to this cloud session: the feature is not switched on for your account.",
        "debug",
      );
      stop("flag_off");
      return;
    }
    attempt += 1;
    let inventory = await inventoryFor(entry_2);
    if (
      inventory.forwarded.length === 0 &&
      inventory.templates.length === 0 &&
      (registered !== null || !nothingHeld())
    ) {
      report("unregistered", trigger);
      renewalTimer?.clear();
      renewalTimer = null;
      lastSummary = null;
      options.arm(null);
      await releaseAll(RETRY_REGISTRATION_TIMEOUT_MS);
      return;
    }
    if (inventory.forwarded.length === 0 && inventory.templates.length === 0 && leaseExpiresAt === null) {
      stopForNothing();
      report("nothing_to_offer", trigger);
      if (inventory.held.length > 0)
        noteOnce(
          `summary:${describeDeviceHookOutcome(inventory)}`,
          describeDeviceHookOutcome(inventory),
          "debug",
        );
      return;
    }
    resumedAfterConsent = false;
    let consent = await options.ensureConsent(
      {
        forwarded: inventory.forwarded.length,
        templateNames: inventory.templates.map((template) => template.local.templateId),
      },
      abortController.signal,
      await collectRoots(await options.syncRoot()),
    );
    assertCurrent(entry_2);
    if (consent !== "accepted") {
      if (consent !== "distrusted" || lastConsent !== "distrusted")
        report(consent === "distrusted" ? "consent_distrusted" : "no_consent", trigger);
      lastConsent = consent;
      if (consent === "declined") {
        noteDeclined();
        return;
      }
      resyncQueued = consent === "not_now";
      renewalTimer?.clear();
      renewalTimer = null;
      renewalDue = false;
      leaseExpiresAt = null;
      memory.lapsesUnusedAt = null;
      if (memory.standing.kind === "dormant")
        memory.standing = {
          kind: "idle",
        };
      lastSummary = null;
      options.arm(null);
      if (registered !== null || !nothingHeld()) await releaseAll(RETRY_REGISTRATION_TIMEOUT_MS);
      assertCurrent(entry_2);
      if (consent === "distrusted") armRenewal();
      return;
    }
    resyncQueued = false;
    lastConsent = "accepted";
    if (await uploadTemplates(entry_2, inventory)) {
      entry_2.inventoryDirty = true;
      if (registered?.instanceId === entry_2.instanceId) {
        assertCurrent(entry_2);
        rotateKeepingInventory();
        queuedReason = "template_fallback";
        throw new SupersededError();
      }
      inventory = await inventoryFor(entry_2);
    }
    let mapped = inventory.templates
      .filter((template) => !refusedTemplates.has(template.local.templateId))
      .map((template) => template.wire);
    if (inventory.forwarded.length === 0 && mapped.length === 0) {
      if (registered !== null || !nothingHeld()) {
        report("unregistered", trigger);
        renewalTimer?.clear();
        renewalTimer = null;
        lastSummary = null;
        options.arm(null);
        await releaseAll(RETRY_REGISTRATION_TIMEOUT_MS);
        return;
      }
      if (leaseExpiresAt === null) {
        stopForNothing();
        report("nothing_to_offer", trigger);
        return;
      }
    }
    assertCurrent(entry_2);
    let launchDirReal = await options.launchDirReal();
    assertCurrent(entry_2);
    let timeoutMs =
      trigger !== "retry" && (leaseExpiresAt === null || options.now() >= leaseExpiresAt)
        ? REGISTRATION_TIMEOUT_MS
        : RETRY_REGISTRATION_TIMEOUT_MS;
    if (inFlight?.instanceId === entry_2.instanceId) {
      inFlight.sent = true;
      inFlight.listenMs = timeoutMs;
      noteHeld(entry_2.instanceId, mapped.length > 0, timeoutMs);
    }
    let reply = await options.sendRequest(
      {
        subtype: "register_device_hooks",
        instance_id: entry_2.instanceId,
        display_name: options.displayName,
        lease_s: REGISTRATION_LEASE_S,
        ...(workerEpoch !== null && {
          worker_epoch: workerEpoch,
        }),
        hooks: inventory.forwarded.map((forwarded) => forwarded.wire),
        templates: mapped,
        held: {
          after_edit: inventory.heldCounts.after_edit,
          kind_unsupported: inventory.heldCounts.kind_unsupported,
          other: inventory.heldCounts.other,
        },
      },
      {
        timeoutMs,
        onEchoed,
      },
    );
    let pendingUnregister_2 =
      pendingUnregister !== null &&
      (pendingUnregister.instanceId === undefined || pendingUnregister.instanceId === entry_2.instanceId)
        ? pendingUnregister
        : null;
    if (pendingUnregister_2 !== null) {
      pendingUnregister = null;
      let parsed = RegisterDeviceHooksResponseSchema().safeParse(reply);
      registered =
        parsed.success && parsed.data.status === "registered"
          ? {
              instanceId: entry_2.instanceId,
            }
          : null;
      if (parsed.success) {
        workerEpoch = parsed.data.worker_epoch;
        dropHeld(entry_2.instanceId);
        if (parsed.data.status === "registered") noteRegistered(entry_2.instanceId, parsed.data);
      }
      await releaseAll(pendingUnregister_2.budgetMs);
      return;
    }
    if (entry_2.number !== entry.number) {
      let parsed = RegisterDeviceHooksResponseSchema().safeParse(reply);
      if (parsed.success) dropHeld(entry_2.instanceId);
      if (parsed.success && parsed.data.status === "registered") {
        registered = {
          instanceId: entry_2.instanceId,
        };
        workerEpoch = parsed.data.worker_epoch;
        noteRegistered(entry_2.instanceId, parsed.data);
      }
    }
    assertCurrent(entry_2);
    let parsed = RegisterDeviceHooksResponseSchema().safeParse(reply);
    if (!parsed.success) {
      report("invalid", trigger);
      noteOnce(
        "invalid_reply",
        "The cloud session answered the hook registration in a form this version of Claude Code cannot read (try claude update); hooks from this machine won't run for it.",
        "warning",
      );
      if (registered?.instanceId !== entry_2.instanceId) {
        dropHeld(entry_2.instanceId);
        await unregisterInstance(entry_2.instanceId, UNREGISTER_TIMEOUT_MS).catch(() => {});
      }
      stop("invalid");
      return;
    }
    let response = parsed.data;
    retryIndex = 0;
    retryTimer?.clear();
    retryTimer = null;
    if (queuedReason === "retry") queuedReason = null;
    staleCount = 0;
    initHeld = false;
    if (seenWorkerEpoch !== null && seenWorkerEpoch !== response.worker_epoch) {
      uploadedTemplates.clear();
      templateAttempts.clear();
      templatesUnsupported = false;
      if (trigger !== "init") turnInFlight = false;
    }
    let life = `${options.cloudSessionId}\x00${response.worker_epoch}`;
    if (
      memory.refusedTemplatesLife !== null &&
      memory.refusedTemplatesLife !== life &&
      refusedTemplates.size > 0
    ) {
      refusedTemplates.clear();
      entry_2.inventoryDirty = true;
    }
    memory.refusedTemplatesLife = life;
    seenWorkerEpoch = response.worker_epoch;
    workerEpoch = response.worker_epoch;
    let noteTemplateStatuses = (templates) => {
      let mappedIds = new Set(mapped.map((template) => template.template));
      let changed = false;
      for (let template of templates) {
        if (!mappedIds.has(template.template)) continue;
        if (template.status === "installed") templateAttempts.delete(template.template);
        if (template.status === "awaiting_upload") {
          let attempts = (templateAttempts.get(template.template) ?? 0) + 1;
          templateAttempts.set(template.template, attempts);
          if (attempts >= 2) {
            refusedTemplates.add(template.template);
            noteOnce(
              `fallback:${template.template}:awaiting_twice`,
              `${template.template} could not be handed to this cloud session (it kept asking for the copy); it runs on this machine instead.`,
            );
            entry_2.inventoryDirty = true;
            changed = true;
            continue;
          }
          for (let key of [...uploadedTemplates])
            if (key.startsWith(`${template.template}:`)) uploadedTemplates.delete(key);
          changed = true;
        } else if (template.status !== "installed") {
          templateAttempts.delete(template.template);
          refusedTemplates.add(template.template);
          noteOnce(
            `fallback:${template.template}:${template.status}`,
            `${template.template} cannot run in this cloud session (${describeCloudRefusal(CLOUD_HOOK_REFUSAL_TEXTS, template.status)}); it runs on this machine instead.`,
          );
          entry_2.inventoryDirty = true;
          changed = true;
        }
      }
      return changed;
    };
    if (response.status === "unregistered") {
      let hadEntries = inventory.forwarded.length + mapped.length > 0;
      dropHeld(entry_2.instanceId);
      leaseExpiresAt = null;
      renewalTimer?.clear();
      renewalTimer = null;
      renewalDue = false;
      memory.lapsesUnusedAt = null;
      phase = "idle";
      memory.standing = {
        kind: "idle",
      };
      registered = null;
      lastSummary = null;
      resyncQueued = true;
      templateStatuses = Object.fromEntries(
        (response.templates ?? []).map((template) => [template.template, template.status]),
      );
      report("unregistered", trigger);
      options.arm(null);
      if (noteTemplateStatuses(response.templates ?? [])) {
        if (entry_2.inventoryDirty) rotateKeepingInventory();
        queuedReason = "template_fallback";
      } else if (hadEntries) {
        memory.standing = {
          kind: "kept_none",
        };
        noteOnce(
          "kept_none",
          "The cloud session kept none of this machine's hooks (it ignored every entry offered); they won't run for it.",
          "warning",
        );
      }
      return;
    }
    toldKeys.delete("kept_none");
    for (let key of lapseKeys) toldKeys.delete(key);
    lapseKeys.clear();
    initBlockedUntil = 0;
    initHeld = false;
    leaseExpiresAt = options.now() + response.lease_s * 1000;
    noteRegistered(entry_2.instanceId, response);
    turnActive = false;
    renewalDue = false;
    memory.lapsesUnusedAt = null;
    leaseS = response.lease_s;
    registered = {
      instanceId: entry_2.instanceId,
    };
    templateStatuses = Object.fromEntries(
      response.templates.map((template) => [template.template, template.status]),
    );
    phase = "registered";
    memory.standing = {
      kind: "registered",
    };
    let counts = {
      accepted: response.accepted,
      ignored: response.ignored,
    };
    report("registered", trigger, counts);
    noteUnmuted();
    if (consentChoice === "declined") {
      noteDeclined();
      return;
    }
    armRenewal();
    if (!resumedAfterConsent) {
      await armServicer(entry_2, inventory, response, launchDirReal);
      if (consentNow() === "declined") {
        noteDeclined();
        return;
      }
    }
    let awaySince = response.away_since === undefined ? null : Date.parse(response.away_since);
    if (awaySince !== null && !Number.isNaN(awaySince) && stoppedWhileRunningAt === null) {
      options.onLine({
        line: `The cloud session stopped running this machine's hooks at ${formatClock(awaySince)} after two went unanswered in a row; it is asking again now.`,
        level: "warning",
      });
      options.lapseTelemetry?.("away_since");
    }
    if (stoppedWhileRunningAt !== null && stoppedWhileRunningAt <= now) stoppedWhileRunningAt = null;
    if (
      response.replaced_owner !== undefined &&
      !retiredInstanceIds.has(response.replaced_owner) &&
      response.replaced_owner !== entry_2.instanceId
    )
      noteOnce(
        `replaced:${response.replaced_owner}`,
        "This window now runs your hooks for the cloud session (another attached window did until now).",
        "debug",
      );
    let summary = describeDeviceHookOutcome(inventory, counts);
    if (summary !== lastSummary) {
      lastSummary = summary;
      options.onLine({
        line: summary,
        level: "debug",
      });
    }
    for (let template of inventory.templates)
      if (template.local.label === "legacy" && !refusedTemplates.has(template.local.templateId))
        noteOnce(
          `legacy:${template.local.templateId}`,
          `${template.local.templateId} on this machine is an older copy; the cloud runs that copy \u2014 update it for fixes.`,
        );
    if (noteTemplateStatuses(response.templates)) {
      if (entry_2.inventoryDirty) rotateKeepingInventory();
      queuedReason = "template_fallback";
    }
  };
  let rotateKeepingInventory = () => {
    retiredInstanceIds.add(entry.instanceId);
    entry = {
      number: entry.number + 1,
      instanceId: options.mintInstanceId(),
      captured: entry.captured,
      inventory: null,
      inventoryDirty: true,
    };
  };
  let requestRegistration = (trigger, allowLeaseLapse = true) => {
    if (
      trigger === "consent" &&
      consentChoice === "accepted" &&
      phase === "stopped" &&
      stoppedReason === "declined" &&
      !disposed &&
      !unregistering
    ) {
      phase = "idle";
      memory.standing = {
        kind: "idle",
      };
      stoppedReason = undefined;
      lastSummary = null;
      toldKeys.delete("declined");
      rotateInstance();
      if (servingMuted) {
        phase = "stopped";
        stoppedReason = "muted";
        memory.standing = {
          kind: "stopped",
          reason: "muted",
        };
      }
    }
    if (disposed || unregistering) return;
    if (phase === "stopped") {
      if (stoppedReason === "muted" && !muteNoted) {
        muteNoted = true;
        noteMuted();
        report("muted", trigger);
      }
      return;
    }
    if (allowLeaseLapse && (trigger === "init" || trigger === "send")) {
      lapseIfDue(trigger);
      if (trigger === "init") turnInFlight = true;
      turnActive = true;
      renewalDue = false;
      memory.lapsesUnusedAt = null;
    }
    if (trigger === "stopped_while_running" && stoppedWhileRunningAt === null) {
      stoppedWhileRunningAt = options.now();
      options.onLine({
        line: "The cloud session stopped waiting for a hook still running on this machine (deadline passed or turn interrupted) and went on without its answer; checking that its hooks are still offered.",
        level: "warning",
      });
      options.lapseTelemetry?.("withdrawn_while_running");
    }
    if (trigger === "connected" || trigger === "consent") resyncQueued = false;
    if (trigger === "worker_up") {
      if (options.now() - NEGATIVE_INFINITY < RESYNC_DEDUPE_MS) return;
      if (resyncQueued && memory.standing.kind === "kept_none") resyncQueued = false;
      if (resyncQueued) return;
      workerEpoch = null;
      initHeld = false;
      initBlockedUntil = 0;
    }
    if (trigger === "init" && initHeld) {
      initHeld = false;
      initBlockedUntil = 0;
    } else if (
      (trigger === "init" && (resyncQueued || options.now() < initBlockedUntil)) ||
      ((trigger === "init" || ((trigger === "renewal" || trigger === "connected") && !allowLeaseLapse)) &&
        leaseExpiresAt !== null &&
        options.now() < leaseExpiresAt - leaseS * 500)
    )
      return;
    if (inFlight === null) {
      if (trigger !== "retry" && lapseIfDue(trigger) && trigger === "renewal") return;
      if (trigger === "connected" && needsRefresh()) return;
      if (trigger === "settings" && needsRefresh() && nothingHeld()) return;
    }
    if (
      trigger === "send" &&
      ((leaseExpiresAt !== null && options.now() < leaseExpiresAt - leaseS * 500) ||
        inFlight?.trigger === "send")
    )
      return;
    if (trigger === "init") initBlockedUntil = 0;
    let now = options.now();
    if (inFlight !== null) {
      if (trigger === "consent") resumedAfterConsent = true;
      if (trigger === "stopped_while_running") return;
      if (trigger === "send" && queuedReason === null) return;
      if (
        trigger === "settings" ||
        trigger === "consent" ||
        inFlight.trigger !== trigger ||
        now - inFlight.at >= TRIGGER_DEBOUNCE_MS
      )
        queuedReason =
          queuedReason !== null && RESYNC_TRIGGER_PRIORITY[queuedReason] > RESYNC_TRIGGER_PRIORITY[trigger]
            ? queuedReason
            : trigger;
      return;
    }
    if (trigger === "worker_up") NEGATIVE_INFINITY = options.now();
    phase = phase === "registered" ? "registered" : "registering";
    if (entry.inventory !== null && entry.inventoryDirty && registered?.instanceId === entry.instanceId)
      rotateKeepingInventory();
    let entry_2 = entry;
    let senderUnverified = false;
    let done = register(entry_2, trigger, now, (unverified) => {
      senderUnverified = unverified === "unverified";
    })
      .catch((error) => {
        let errorKind = classifyControlRequestError(error);
        if (!(error instanceof SupersededError) && errorKind !== "timeout" && errorKind !== "failed")
          dropHeld(entry_2.instanceId);
        if (
          error instanceof SupersededError ||
          disposed ||
          unregistering ||
          entry_2.number !== entry.number
        ) {
          if (!disposed && !unregistering) report("superseded", trigger, undefined, entry_2);
          return;
        }
        if (phase === "stopped") return;
        switch (errorKind) {
          case "hook_forwarding_not_ready":
          case "timeout":
            if (
              errorKind === "timeout" &&
              (leaseExpiresAt === null || options.now() >= leaseExpiresAt) &&
              ((trigger !== "renewal" && trigger !== "retry") ||
                options.now() - now >=
                  (inFlight?.listenMs ?? REGISTRATION_TIMEOUT_MS) + Math.max(30000, leaseS * 500))
            ) {
              if (
                queuedReason !== "consent" &&
                queuedReason !== "settings" &&
                queuedReason !== "worker_up" &&
                queuedReason !== "mute"
              )
                queuedReason = null;
              goDormant(trigger, entry_2, senderUnverified);
              if (senderUnverified) noteOnce("sender_unverified", SENDER_UNVERIFIED_TEXT, "warning");
              return;
            }
            report("not_ready", trigger, undefined, entry_2);
            if (!retryLater()) {
              pause(
                "The cloud session is not answering this machine's hook registration yet (it may still be starting); hooks from this machine are paused for it and are offered again as soon as it reports in.",
              );
              initHeld = true;
              memory.standing = {
                kind: "paused",
              };
            }
            return;
          case "hook_forwarding_disabled": {
            report("disabled", trigger, undefined, entry_2);
            let reason = refusalMessageText(error);
            if (reason === "policy" || reason === "disabled")
              noteOnce(
                "disabled",
                `The cloud session stopped consulting this machine's hooks: ${describeCloudRefusal(DEVICE_HOOKS_UNAVAILABLE_TEXTS, reason)}.`,
                "warning",
              );
            else
              noteOnce(
                "disabled",
                `This cloud session won't run hooks from this machine: ${describeCloudRefusal(DEVICE_HOOKS_UNAVAILABLE_TEXTS, reason)}.`,
              );
            stop("disabled");
            return;
          }
          case "unsupported":
            report("unsupported", trigger, undefined, entry_2);
            noteOnce(
              "unsupported",
              "This cloud session was created before hooks from your machine could run for it; start a new cloud session to use them. Hooks from this machine won't run for this one.",
            );
            stop("unsupported");
            return;
          case "stale_worker_epoch":
            report("stale_epoch", trigger, undefined, entry_2);
            workerEpoch = null;
            turnInFlight = false;
            staleCount += 1;
            if (staleCount === 1) queuedReason = "retry";
            else if (!retryLater()) {
              noteOnce(
                "stale_storm",
                "The cloud session keeps calling this machine's registration out of date; hooks from this machine won't run for it. Start a new cloud session if this persists.",
                "warning",
              );
              stop("stale");
            }
            return;
          case "invalid_registration":
            report("invalid", trigger, undefined, entry_2);
            noteOnce(
              "invalid_registration",
              `The cloud session refused this machine's hook registration (it said "${refusalMessageText(error)}"); hooks from this machine won't run for it \u2014 worth a bug report.`,
              "warning",
            );
            stop("invalid");
            return;
          default:
            report("failed", trigger, undefined, entry_2);
            if (trigger === "renewal" || trigger === "retry") {
              if (!retryLater())
                pause(
                  "This machine's hook registration with the cloud session could not be renewed; hooks from this machine are paused for it until the connection recovers.",
                );
            }
        }
      })
      .finally(() => {
        if (pendingUnregister?.instanceId === entry_2.instanceId) pendingUnregister = null;
        inFlight = null;
        if (phase === "registering") phase = leaseExpiresAt === null ? "idle" : "registered";
        let queued = queuedReason;
        queuedReason = null;
        if (queued !== null && !disposed && !unregistering) requestRegistration(queued, false);
      });
    inFlight = {
      trigger,
      at: now,
      done,
      instanceId: entry_2.instanceId,
      sent: false,
      listenMs: REGISTRATION_TIMEOUT_MS,
    };
  };
  return {
    requestRegistration,
    consentDecided(choice) {
      consentChoice = choice;
      if (choice === "declined") options.arm(null);
      requestRegistration("consent");
    },
    turnInFlight() {
      lapseIfDue();
      turnInFlight = true;
      checkLeaseOut();
    },
    turnEnded() {
      turnInFlight = false;
    },
    activity() {
      checkLeaseOut();
    },
    ensureRegistered() {
      lapseIfDue("send");
      if (disposed || unregistering || memory.standing.kind !== "dormant") {
        checkLeaseOut();
        return Promise.resolve();
      }
      requestRegistration("send");
      let inFlight_2 = inFlight;
      if (inFlight_2 === null) return Promise.resolve();
      let done = inFlight_2.done.then(
        () => {},
        () => {},
      );
      return new Promise((resolve) => {
        let timer = options.setTimer(resolve, REGISTRATION_REFRESH_CHECK_MS);
        done.then(() => {
          timer.clear();
          resolve();
        });
      });
    },
    settingsChanged() {
      if (disposed || phase === "stopped") return;
      let captured = options.capture();
      baseline = captured;
      if (captured.kind === "captured" && captured.checkoutDisablesAllHooks && hasCapturedHooks(captured))
        if (consentDeclined === false && consentChoice !== "declined") noteCheckoutDisabled();
        else entry.inventoryDirty = true;
      let fingerprint = captureFingerprint(captured);
      if (lastFingerprint !== null && fingerprint === lastFingerprint) return;
      lastFingerprint = fingerprint;
      resyncQueued = false;
      rotateInstance();
      requestRegistration("settings");
    },
    servingMute(muted) {
      servingMuted = muted;
      if (disposed || unregistering) return;
      if (muted) {
        if (phase === "stopped") return;
        muteNoted = true;
        noteMuted();
        report("muted", "mute");
        if (inFlight !== null)
          if (inFlight.sent) {
            unregisterInstance(inFlight.instanceId, UNREGISTER_TIMEOUT_MS);
            pendingUnregister = {
              budgetMs: UNREGISTER_TIMEOUT_MS,
              instanceId: inFlight.instanceId,
            };
          } else rotateInstance();
        stop("muted");
        return;
      }
      if (phase !== "stopped" || stoppedReason !== "muted") return;
      options.arm(null);
      phase = "idle";
      memory.standing = {
        kind: "idle",
      };
      stoppedReason = undefined;
      muteNoted = false;
      lastSummary = null;
      toldKeys.delete("muted");
      rotateInstance();
      requestRegistration("mute");
    },
    async unregister(timeoutMs) {
      clearRenewal();
      options.arm(null);
      unregistering = true;
      queuedReason = null;
      if (inFlight !== null) {
        pendingUnregister = {
          budgetMs: timeoutMs,
        };
        let inFlight_2 = inFlight;
        await Promise.all([
          !inFlight_2.sent || registered?.instanceId === inFlight_2.instanceId
            ? Promise.resolve()
            : unregisterInstance(inFlight_2.instanceId, timeoutMs),
          releaseAll(timeoutMs),
        ]);
        return;
      }
      await releaseAll(timeoutMs);
    },
    dispose() {
      disposed = true;
      abortController.abort();
      clearRenewal();
    },
    snapshot: () => ({
      phase,
      instanceId: entry.instanceId,
      registeredInstanceId: registered?.instanceId ?? null,
      inventory: entry.inventory,
      leaseExpiresAt,
      workerEpoch,
      templateStatuses,
      lastOutcome,
      ...(stoppedReason !== undefined && {
        stoppedReason,
      }),
    }),
  };
}
//@ chunk-7jxyna5q.js:297906-298297 placement
/**
 * 创建设备 hook 注册表：按会话管理服务方、发送方与同意固定项。
 */
function createDeviceHookRegistry() {
  let servicers = new Map();
  let senders = new Map();
  let attachedCounts = new Map();
  return {
    servicerFor: (launchDir) => memoizeWith(servicers, launchDir, emptyEligibilityState),
    senderFor: (launchDir) => memoizeWith(senders, launchDir, createDeviceHookSenderMemory),
    consentPin: emptyConsentState(),
    consentAnnounced: createConsentSignal(),
    noteAttached: (launchDir) => {
      attachedCounts.set(launchDir, (attachedCounts.get(launchDir) ?? 0) + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        let left = (attachedCounts.get(launchDir) ?? 1) - 1;
        if (left > 0) attachedCounts.set(launchDir, left);
        else attachedCounts.delete(launchDir);
      };
    },
    isAttached: (launchDir) => (attachedCounts.get(launchDir) ?? 0) > 0,
    legacyConfigFile: undefined,
    legacyEnvPin: undefined,
    servedSettingsChanged: createSignal(),
  };
}
//@ chunk-7jxyna5q.js:298297-298314 placement
var deviceHooksProcessMemories; // deferred: uses createDeviceHookRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:298297", () => {
  deviceHooksProcessMemories = new HostScoped(createDeviceHookRegistry);
});
//@ chunk-7jxyna5q.js:298314-298401 placement
function memoizeWith(cache, key, create) {
  let existing = cache.get(key);
  if (existing !== undefined) return existing;
  let created = create();
  cache.set(key, created);
  return created;
}
export {
  DeviceHooksRegistration,
  UNREGISTER_TIMEOUT_MS,
  deviceHooksRegistrationState,
  hasCapturedHooks,
  isHookScopeInReach,
  deviceHooksProcessMemories,
  SENDER_UNVERIFIED_TEXT,
};
