/**
 * utils/hooks/deviceHooks/deviceHookSession.ts
 *
 * 2.1.316 新增：设备钩子会话与远程工具通告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4z1ntdgk.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { realpath } from "fs/promises";
import { isProjectScopeTrustAccepted } from "../../config.js";
import { stageDeviceHooks, stagingFsDeps, scriptFileReaderDeps } from "../servedHooks/hookSandbox.js";
import {
  settingsReachRoots,
  collectBaseReachRoots,
  settingsReachRootsForSource,
  collectSettingsWriteRoots,
} from "../../git/builderGit/sandboxReach.js";
import { registerCleanup } from "../../cleanupRegistry.js";
import {
  projectConfigRootOr,
  legacyConfigFileOf,
  settingsEnvInReach,
  unrefTimeout,
  attestationFor,
  shellPrefixOf,
  createForwardedHookHandler,
  collectDeviceHookAttestations,
  heldHooksNotice,
} from "./commandReach.js";
import { subprocessEnv } from "../../subprocessEnv.js";
import {
  latchLegacyPin,
  mergeHookEnv_2,
  resolveOptions,
  resolveHookProgramOnPath,
  realpathAllowMissing,
  resolveProgramOnPathInReach,
} from "../hookCommandResolution.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { createHookVouching, deviceHookTimeoutMs } from "./vouching.js";
import { runInRemoteCallFrameMain } from "../../../remote/remoteMode.js";
import { runDeviceHook, DEVICE_HOOK_EXECUTORS, createAnsweredOnLatch } from "./runDeviceHook.js";
import { evaluateHookIfCondition } from "../../hooks.js";
import { analyzeHookCommand } from "../hookCommandAnalysis.js";
import { defaultShellKind } from "../../shell/shellToolUtils.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnumOpt, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../debug.js";
import { logError } from "../../log.js";
import { findGitRootUncached } from "../../git.js";
import { DeviceHooksRegistration, UNREGISTER_TIMEOUT_MS } from "./cloudRegistration.js";
import { deviceHooksPolicyEligibility, collectDeviceHookSources } from "./eligibility.js";
import { getClaudeConfigDir } from "../../markdownConfigLoader.js";
import { newDeviceInstanceId, shortHostname, parseDeviceHookId } from "../deviceHookId.js";
import { getSettingsFilePathForSource } from "../../settings/settings.js";
import {
  classifyControlRequestError,
  ControlRequestNotDeliveredError,
  ControlRequestTimeoutError,
} from "../../../remote/controlRequestErrors.js";
import {
  resolveDeviceHooksConsent,
  readDeviceHooksConsent,
  probeWritability,
  deviceHooksConsentPath,
  subscribeConsent,
} from "./consent.js";
import { stripInvisibleChars } from "../../invisibleChars.js";
import {
  isRemoteToolServingMuted,
  onServingMuteRecheck,
} from "../../../services/remoteTools/servingGates.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  looseObject,
  _enum,
  numberSchema,
  array,
  stringSchema,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import {
  interfaceFitOf,
  leftStateFor,
  MACHINE_PRESENCE_STATES,
  STILL_HERE,
} from "../../../remote/tools/protocolConstants.js";
import { AbortError, errorMessage } from "../../errors.js";
import { primeUnattendedServingConsent } from "../../../services/remoteTools/unattendedConsentStore.js";
import { parseThinClientReply } from "../../../cli/thinClient.js";
import { jsonStringify } from "../../slowOperations.js";
import { fullJitterBackoffMs, withDeadline } from "../../sleep.js";
import { onceExport } from "../../../../vendor/lodash-es/once.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4z1ntdgk.js:143263-145145 placement
/**
 * 创建设备钩子会话：接收远程转发的钩子请求，在本机执行并回复结果。
 */
function createDeviceHookSession({
  launchDir,
  memory,
  getTools,
  respond,
  release,
  onLine,
  trustAccepted = isProjectScopeTrustAccepted,
  isMuted,
}) {
  let handlerState = () => null;
  let staging = stageDeviceHooks(stagingFsDeps(), () => [
    ...(handlerState()?.cloudWritableRoots ?? [launchDir]),
    ...settingsReachRoots(launchDir),
  ]);
  let disposeStaging = registerCleanup(() => staging.dispose());
  let projectDir = projectConfigRootOr(launchDir);
  let hookCwd = projectDir;
  realpath(projectDir).then(
    (realPath) => {
      hookCwd = realPath;
    },
    () => {},
  );
  let attached = {
    ...subprocessEnv(),
  };
  latchLegacyPin(memory, legacyConfigFileOf(memory).env);
  let sender = memory.senderFor(launchDir);
  let hostEnv = () => {
    let processEnv = subprocessEnv();
    return mergeHookEnv_2({
      attached,
      beforeSettings: getLatchedPreSettingsEnvSnapshot(),
      ownEnv: settingsEnvInReach(sender, legacyConfigFileOf(memory)),
      childrenSee: (name) => Object.hasOwn(processEnv, name),
    });
  };
  let servicer = createHookVouching({
    memory: memory.servicerFor(launchDir),
    now: Date.now,
    setTimer: unrefTimeout,
    trustAccepted,
    ...(isMuted && {
      isMuted,
    }),
    judgeSender: attestationFor,
    pin: scriptFileReaderDeps(),
    staging,
    run: (request, runOptions, signal) =>
      runInRemoteCallFrameMain(runOptions.launchDir, () =>
        runDeviceHook(request, runOptions, DEVICE_HOOK_EXECUTORS, signal),
      ),
    evaluateCondition: (condition, runOptions) =>
      evaluateHookIfCondition(condition, runOptions, getTools(), runOptions.cwd),
    parseTarget: (command) => {
      let env = hostEnv();
      return analyzeHookCommand(command, {
        home: resolveOptions(env),
        hookCwd,
        projectDir,
        defaultShell: defaultShellKind(),
        shellPrefix: shellPrefixOf(env),
      });
    },
    emptyTranscriptPath: () => staging.placeholder("cloud-transcript.jsonl"),
    defaultTimeoutMs: deviceHookTimeoutMs,
    onLine: (line, level) =>
      onLine({
        line,
        level,
      }),
    telemetry: (report) => {
      let level = isQuietOutcome(report.outcome);
      if (level === "ok") logFeatureOk("device_hooks_serve");
      else if (level === "sad") logFeatureSad("device_hooks_serve", report.outcome);
      else if (level === "bad") logFeatureBad("device_hooks_serve", report.outcome);
      logEvent("tengu_device_hook_served", {
        event: fromEnumOpt(report.event),
        kind: fromEnumOpt(report.kind),
        outcome: fromEnum(report.outcome),
        exit_class: fromEnumOpt(report.exitClass),
        duration_ms: report.durationMs,
        translated_paths: report.translatedPaths,
        replay: report.replay,
        blocked: report.blocked,
        staged: report.staged,
        project_frame: report.projectFrame,
        repinned: report.repinned,
        waited_ms: report.waitedMs,
        ...(report.attestation !== undefined && {
          attestation_mode: fromEnum(report.attestation.mode),
          request_attestation: fromEnum(report.attestation.status),
          attestation_verdict: fromEnum(report.attestation.verdict),
        }),
      });
    },
    debug: (message) => logForDebugging(message),
    logError,
    extraWritableRoots: () => settingsReachRoots(launchDir),
    hostEnv,
    childEnvironment: (program, options) => resolveHookProgramOnPath(program, options, subprocessEnv()),
    placePath: realpathAllowMissing,
    resolveProgram: resolveProgramOnPathInReach,
    defaultShell: () => defaultShellKind(),
  });
  let forwardedHookHandler = createForwardedHookHandler({
    servicer,
    staging: {
      dispose: () => {
        disposeStaging();
        return staging.dispose();
      },
    },
    respond,
    release,
    logError: (error) => {
      logError(error);
      logFeatureBad("device_hooks_serve", "serve_threw");
    },
  });
  handlerState = forwardedHookHandler.state;
  logForDebugging("[deviceHooks] device hook session created for this attach");
  return forwardedHookHandler;
}
//@ chunk-4z1ntdgk.js:145145-145330 placement
var DEVICE_HOOK_SERVICER_DEFAULTS = {
  stageVerifiedBytes: "always",
  unmarkedStartFolder: "private",
  repinChangedScripts: false,
  wireLabel: "basename",
  denyUnjudgeablePaths: false,
  runWithUntranslatedPaths: false,
  timeoutFailsClosed: false,
};
//@ chunk-4z1ntdgk.js:145330-149545 placement
/**
 * 创建远程工具通告发送器，按会话状态通告/撤回本机钩子与工具。
 */
function createRemoteToolsSender({
  launchDir,
  memory,
  cloudSessionId,
  session,
  sendControlRequest,
  syncRoot,
  servingMuted,
  onLine,
  storageV5,
}) {
  let open = scriptFileReaderDeps().openNoFollow;
  let launchDirReal = realpath(launchDir).catch(() => launchDir);
  let projectDir = projectConfigRootOr(launchDir);
  let gitRootUncached = findGitRootUncached(launchDir);
  let projectRoot = gitRootUncached ?? launchDir;
  let sender = memory.senderFor(launchDir);
  let attached = {
    ...subprocessEnv(),
  };
  latchLegacyPin(memory, legacyConfigFileOf(memory).env);
  let hostEnv = () => {
    let processEnv = subprocessEnv();
    return mergeHookEnv_2({
      attached,
      beforeSettings: getLatchedPreSettingsEnvSnapshot(),
      ownEnv: settingsEnvInReach(sender, legacyConfigFileOf(memory)),
      childrenSee: (name) => Object.hasOwn(processEnv, name),
    });
  };
  return DeviceHooksRegistration({
    memory: sender,
    now: Date.now,
    setTimer: unrefTimeout,
    hookFlags: createAnsweredOnLatch(),
    capture: () => deviceHooksPolicyEligibility(collectDeviceHookSources()),
    buildInventory: ({ captured, instanceId, syncRoot, reachRoots, withoutTemplates }) => {
      let env = hostEnv();
      return collectDeviceHookAttestations(
        captured,
        {
          instanceId,
          launchDir,
          projectDir,
          configHome: getClaudeConfigDir(),
          ...(syncRoot !== null && {
            sync: {
              rootReal: syncRoot.real,
              root: syncRoot.root,
            },
          }),
          inRepository: gitRootUncached !== null,
          ...(projectRoot !== launchDir && {
            repoRoot: projectRoot,
          }),
          extraReachRoots: reachRoots,
          allowLegacyTemplateDigests: true,
          refusedTemplateIds: [...withoutTemplates],
          optInPins: sender.optInPins,
          reachMemory: sender,
          localSettingsLocation: sender.localSettingsLocation,
        },
        {
          realpath,
          open,
          home: resolveOptions(env),
          defaultShell: defaultShellKind(),
          shellPrefix: shellPrefixOf(env),
        },
      );
    },
    mintInstanceId: () => newDeviceInstanceId(),
    displayName: shortHostname(),
    cloudSessionId,
    launchDir,
    launchDirReal: () => launchDirReal,
    realpath,
    projectRoot,
    syncRoot: async () => {
      let root = syncRoot();
      return root === null
        ? null
        : {
            root,
            real: await realpath(root).catch(() => root),
          };
    },
    servingMuted,
    commonWriteRoots: () => collectBaseReachRoots(launchDir),
    scopeWriteRoots: (source, scope) => settingsReachRootsForSource(launchDir, source, scope),
    scopeWriteEntries: (source) => collectSettingsWriteRoots(source, launchDir),
    scopeSettingsFile: (source) => getSettingsFilePathForSource(source) ?? null,
    sendRequest: async (request, { timeoutMs, onEchoed }) => {
      try {
        return await sendControlRequest(request, {
          timeoutMs,
          background: true,
          ...(onEchoed && {
            onEchoed,
          }),
        });
      } catch (error) {
        let errorKind = classifyControlRequestError(error);
        if (errorKind === "timeout" || errorKind === "aborted")
          throw Error("timeout: no answer from the cloud worker in time");
        if (errorKind === "disconnected" || errorKind === "not_connected")
          throw Error("disconnected: the session stream is not connected");
        throw error;
      }
    },
    ensureConsent: resolveDeviceHooksConsent({
      deps: readDeviceHooksConsent(storageV5),
      pin: memory.consentPin,
      onNotAsked: (details) => {
        logEvent("tengu_device_hooks_consent_notice", {});
        onLine({
          line: heldHooksNotice(details),
          level: "info",
        });
      },
      isStoreInReach: (probe) => probeWritability(deviceHooksConsentPath(), probe, realpath),
      onUntrustedStore: (verdict) => {
        let shownPath = stripInvisibleChars(deviceHooksConsentPath());
        onLine({
          line:
            verdict === "writable"
              ? `The saved answer about this machine's hooks is ignored here: this cloud session can itself write ${shownPath}. Decide for it in /hooks.`
              : `The saved answer about this machine's hooks is ignored here: ${shownPath} could not be located to check who can write it. Decide for this session in /hooks.`,
          level: "warning",
        });
      },
    }),
    arm: (state) => session.setState(state),
    onLine,
    telemetry: (report) => {
      if (report.trigger === "renewal" && report.outcome === "registered") return;
      let counters = {
        held_after_edit: report.heldAfterEdit,
        held_kind_unsupported: report.heldByReason.kind_unsupported ?? 0,
        held_event_runs_locally: report.heldByReason.event_runs_locally ?? 0,
        held_event_later: report.heldByReason.event_later ?? 0,
        held_event_low_value: report.heldByReason.event_low_value ?? 0,
        held_event_container_internal: report.heldByReason.event_container_internal ?? 0,
        held_source_in_sync_root: report.heldByReason.source_in_sync_root ?? 0,
        held_sync_root_is_config_dir: report.heldByReason.sync_root_is_config_dir ?? 0,
        held_unverifiable_target: report.heldByReason.unverifiable_target ?? 0,
        held_in_reach: report.heldByReason.in_reach ?? 0,
        held_interpreter_unvouched: report.heldByReason.interpreter_unvouched ?? 0,
        held_loads_from_reach: report.heldByReason.loads_from_reach ?? 0,
        held_unpinned_command: report.heldByReason.unpinned_command ?? 0,
        held_author_skip: report.heldByReason.author_skip ?? 0,
        held_duplicate: report.heldByReason.duplicate ?? 0,
        held_over_cap: report.heldByReason.over_cap ?? 0,
        held_pattern_matcher: report.heldByReason.pattern_matcher ?? 0,
      };
      switch (
        (logEvent("tengu_device_hooks_client_register", {
          outcome: fromEnum(report.outcome),
          trigger: fromEnum(report.trigger),
          forwarded: report.forwarded,
          templates: report.templates,
          ...counters,
          held_other: report.heldOther,
          accepted: report.accepted,
          ignored: report.ignored,
          attempt: report.attempt,
          after_flags_unanswered: report.afterFlagsUnanswered,
        }),
        report.outcome)
      ) {
        case "registered":
        case "unregistered":
        case "nothing_to_offer":
        case "dormant":
        case "no_consent":
        case "muted":
        case "flag_off":
          logFeatureOk("device_hooks_client_register", {
            forwarded: report.forwarded,
          });
          break;
        case "not_ready":
        case "stale_epoch":
        case "superseded":
        case "failed":
        case "consent_distrusted":
        case "flag_unanswered":
          logFeatureSad("device_hooks_client_register", report.outcome);
          break;
        default:
          logFeatureBad("device_hooks_client_register", report.outcome);
      }
    },
    lapseTelemetry: (kind) =>
      logEvent("tengu_device_hooks_lapse_line", {
        kind: fromEnum(kind),
      }),
    reachPinnedTelemetry: (source) =>
      logEvent("tengu_device_hooks_reach_pinned", {
        source: fromEnum(source),
      }),
    sourcePinnedTelemetry: (change) =>
      logEvent("tengu_device_hooks_source_pinned", {
        source: fromEnum(change.source),
        changed: change.changed,
        appeared: change.appeared,
        vanished: change.vanished,
      }),
    servicerDefaults: DEVICE_HOOK_SERVICER_DEFAULTS,
  });
}
//@ chunk-4z1ntdgk.js:149545-150215 placement
function isQuietOutcome(outcome) {
  switch (outcome) {
    case "answered":
    case "event_mismatch":
    case "condition_false":
    case "cancelled":
    case "muted":
      return "ok";
    case "not_mine":
    case "cached":
    case "withdrawn_replay":
    case "same_invocation":
      return null;
    case "unknown_id":
    case "replay_mismatch":
    case "event_name_mismatch":
    case "input_too_large":
    case "overloaded":
    case "stale":
    case "invalid_input":
    case "unsupported_kind":
    case "no_roots":
    case "untrusted":
    case "in_reach_refused":
    case "pin_refused":
    case "pin_changed":
    case "pin_unreadable":
    case "untranslated_skipped":
    case "condition_error":
    case "no_slot":
    case "too_late":
    case "run_error":
    case "unattested":
      return "sad";
    case "staging_failed":
    case "decide_error":
      return "bad";
    default:
      return outcome;
  }
}
//@ chunk-4z1ntdgk.js:150215-150314 placement (2.1.88 match: SETTING_SOURCES, 1)
var SETTING_SOURCE_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4z1ntdgk.js:150215", () => {
  SETTING_SOURCE_SET = new Set([
    "userSettings",
    "localSettings",
    "flagSettings",
    "projectSettings",
    "policySettings",
  ]);
});
//@ chunk-4z1ntdgk.js:150314-152136 placement
/**
 * 启动设备钩子转发：组合会话与发送器，并按服务静音状态切换。
 */
function startDeviceHookForwarding(options) {
  let createSession = options.createSession ?? createDeviceHookSession;
  let createSender = options.createSender ?? createRemoteToolsSender;
  let isServingMuted = options.isServingMuted ?? isRemoteToolServingMuted;
  let servingMuted = isServingMuted();
  let session = createSession({
    launchDir: options.launchDir,
    memory: options.memory,
    getTools: options.getTools,
    respond: (requestId, answer) => options.manager()?.respondToForwardedHook(requestId, answer) ?? false,
    release: (requestId) => options.manager()?.releaseForwardedHook(requestId),
    onLine: options.onLine,
    ...(options.trustAccepted && {
      trustAccepted: options.trustAccepted,
    }),
    isMuted: () => servingMuted,
  });
  let sender = createSender({
    launchDir: options.launchDir,
    memory: options.memory,
    cloudSessionId: options.cloudSessionId,
    session,
    sendControlRequest: (request, options_2) => {
      let manager = options.manager();
      if (manager === null) return Promise.reject(Error("[RemoteSessionManager] Cannot send: not connected"));
      return manager.sendControlRequest(request, options_2);
    },
    syncRoot: options.syncRoot,
    servingMuted,
    onLine: options.onLine,
    storageV5: options.storageV5,
  });
  let muteUnsubscribe = (options.onServingMuteRecheck ?? onServingMuteRecheck)(() => {
    try {
      let mutedNow = isServingMuted();
      if (mutedNow === servingMuted) return;
      if (mutedNow) {
        servingMuted = true;
        sender.servingMute(true);
      } else {
        sender.servingMute(false);
        servingMuted = false;
      }
    } catch (error) {
      logError(error);
    }
  });
  let unregisterCleanup = options.registerCleanup(() => sender.unregister(UNREGISTER_TIMEOUT_MS));
  let settingsUnsubscribe = options.subscribeSettingsChanges((source) => {
    if (SETTING_SOURCE_SET.has(source)) sender.settingsChanged();
  });
  let stoppedUnsubscribe = session.onStoppedWhileRunning(() =>
    sender.requestRegistration("stopped_while_running"),
  );
  let consentUnsubscribe = (
    options.subscribeConsent ?? ((handler) => subscribeConsent(options.memory.consentAnnounced, handler))
  )((accepted) => sender.consentDecided(accepted));
  let reason = (reason) => () => {
    try {
      sender.requestRegistration(reason);
    } catch (error) {
      logError(error);
    }
  };
  let detachMemory = options.memory.noteAttached(options.launchDir);
  let disposed = false;
  return {
    callbacks: {
      onForwardedHookCallback: (callback) => {
        session.handleForwardedHook(callback);
        let instanceId = parseDeviceHookId(callback.callbackId)?.instanceId;
        let { registeredInstanceId, instanceId: instanceId_2 } = sender.snapshot();
        if (instanceId !== undefined && (instanceId === registeredInstanceId || instanceId === instanceId_2))
          sender.activity();
      },
      onForwardedHookCancelled: (requestId, origin) => {
        session.handleCancelled(requestId, origin);
      },
    },
    onStreamConnected: reason("connected"),
    onWorkerInit: reason("init"),
    onWorkerUp: reason("worker_up"),
    onTurnInFlight: () => sender.turnInFlight(),
    onTurnEnded: () => sender.turnEnded(),
    beforeSend: () => sender.ensureRegistered(),
    snapshot: () => sender.snapshot(),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      detachMemory();
      muteUnsubscribe();
      settingsUnsubscribe();
      stoppedUnsubscribe();
      consentUnsubscribe();
      unregisterCleanup();
      let unregistered = sender.unregister(UNREGISTER_TIMEOUT_MS);
      sender.dispose();
      let settle = options.registerCleanup(() => unregistered);
      unregistered.then(settle, settle);
      session.dispose();
    },
  };
}
//@ chunk-4z1ntdgk.js:152173-152790 placement
/**
 * 远程工具通告的响应 schema、超时、未验证发送者标记与失败原因列表。
 */
var announceResponseSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var UNVERIFIED_SENDER;
var UNVERIFIED_SENDER_2;
var ANNOUNCE_FAILURE_REASONS;
deferInit("chunk-4z1ntdgk.js:152173", () => {
  announceResponseSchema = DoctorLazy(() =>
    looseObject({
      status: _enum(["announced", "withdrawn"]),
      passthrough_declined: _enum(["policy", "pending", "unavailable"]).optional().catch(undefined),
      worker_epoch: numberSchema().int().positive().max(Number.MAX_SAFE_INTEGER).optional().catch(undefined),
      protocol_version: numberSchema().nullable().optional().catch(undefined),
      ignored_tools: array(stringSchema()).optional().catch(undefined),
      passthrough_adopted: numberSchema().int().nonnegative().optional().catch(undefined),
      worker_capabilities: array(stringSchema()).optional().catch(undefined),
      tool_host_interface: unknown().optional().transform(interfaceFitOf),
    }),
  );
  UNVERIFIED_SENDER = 15000;
  UNVERIFIED_SENDER_2 = "unverified_sender";
  ANNOUNCE_FAILURE_REASONS = [
    "aborted",
    "no_answer",
    "post_failed",
    "post_lost",
    "replaced",
    "unreadable_ack",
  ];
});
//@ chunk-4z1ntdgk.js:152790-153379 placement
function classifyAnnounceError(error) {
  if (error instanceof ControlRequestNotDeliveredError)
    return {
      kind: "failed",
      reason: "post_failed",
    };
  if (error instanceof ControlRequestTimeoutError)
    return {
      kind: "failed",
      reason: "no_answer",
    };
  if (error instanceof AbortError)
    return {
      kind: "failed",
      reason: "aborted",
    };
  let message = errorMessage(error);
  if (message.startsWith("Unsupported control request subtype"))
    return {
      kind: "unsupported",
    };
  if (message.startsWith("remote_tools_disabled:") || message.startsWith("invalid_announce:"))
    return {
      kind: "refused",
      reason: message,
    };
  if (message.startsWith("remote_tools_not_ready:"))
    return {
      kind: "retry",
      reason: message,
    };
  if (message.startsWith("stale_worker_epoch"))
    return {
      kind: "retry",
      reason: "stale_worker_epoch",
    };
  return {
    kind: "failed",
    reason: message,
  };
}
//@ chunk-4z1ntdgk.js:153379-154872 placement
async function announceRemoteTools(send, body, options = {}) {
  primeUnattendedServingConsent();
  let abortController = new AbortController();
  let abortResult;
  let recordAbort = (result) => {
    abortResult ??= result;
    abortController.abort();
  };
  let waitState = "none";
  let now = Date.now();
  let runTelemetry = (result) => {
    if (waitState !== "none") {
      let now_2 = Date.now();
      let waitedUntil = waitState === "waiting" ? now_2 : waitState.endedAt;
      logEvent("tengu_remote_tools_announce_waited_for_worker", {
        waited_ms: waitedUntil - now,
        after_wait_ms: now_2 - waitedUntil,
        outcome: fromEnum(result.kind),
        reason: fromEnumOpt(
          ANNOUNCE_FAILURE_REASONS.find((reason) => result.kind === "failed" && reason === result.reason),
        ),
      });
    }
    return result;
  };
  try {
    let { posted, response } = send.postControlRequest(remoteToolsAnnounceRequest(body), {
      signal: options.signal
        ? AbortSignal.any([options.signal, abortController.signal])
        : abortController.signal,
      ...(options.timeoutMs !== undefined && {
        timeoutMs: options.timeoutMs,
      }),
      ...(options.answerExpected === false
        ? {
            answerExpected: false,
          }
        : {
            awaitWorkerStart: {
              onChange: (waiting) => {
                waitState = waiting
                  ? "waiting"
                  : {
                      endedAt: Date.now(),
                    };
              },
            },
          }),
      background: true,
      onEchoed: (echoState) => {
        if (echoState === "unverified")
          recordAbort({
            kind: "refused",
            reason: UNVERIFIED_SENDER_2,
          });
      },
    });
    posted
      .then(({ outcome }) =>
        outcome === "accepted" ? options.replaced?.then(() => "replaced") : "post_lost",
      )
      .then((postOutcome) => {
        if (postOutcome !== undefined && waitState === "waiting")
          recordAbort({
            kind: "failed",
            reason: postOutcome,
          });
      });
    let reply = await response;
    let thinClientReply = parseThinClientReply("remote_tools_announce", announceResponseSchema(), reply);
    if (thinClientReply === null)
      return runTelemetry({
        kind: "failed",
        reason: "unreadable_ack",
      });
    return runTelemetry({
      kind: "announced",
      status: thinClientReply.status,
      ...(thinClientReply.passthrough_declined !== undefined && {
        passthroughDeclined: thinClientReply.passthrough_declined,
      }),
      workerEpoch: thinClientReply.worker_epoch,
      protocolVersion: thinClientReply.protocol_version,
      ignoredTools: thinClientReply.ignored_tools ?? [],
      ...(thinClientReply.passthrough_adopted !== undefined && {
        passthroughAdopted: thinClientReply.passthrough_adopted,
      }),
      ...(thinClientReply.worker_capabilities !== undefined && {
        workerCapabilities: thinClientReply.worker_capabilities,
      }),
      ...(thinClientReply.tool_host_interface.kind !== "none" && {
        sessionInterface: thinClientReply.tool_host_interface,
      }),
    });
  } catch (error) {
    return runTelemetry(
      (error instanceof AbortError ? abortResult : undefined) ?? classifyAnnounceError(error),
    );
  }
}
//@ chunk-4z1ntdgk.js:154872-155204 placement
function remoteToolsAnnounceRequest(body) {
  return {
    subtype: "remote_tools_announce",
    instance_id: body.instance_id,
    ...(body.worker_epoch !== undefined && {
      worker_epoch: body.worker_epoch,
    }),
    host: body.host,
    tools: body.tools.map((tool) => ({
      ...tool,
      refused_input_fields: [...tool.refused_input_fields],
      protocol_versions: [...tool.protocol_versions],
    })),
    passthrough: [...body.passthrough],
    plumbing: [...body.plumbing],
  };
}
//@ chunk-4z1ntdgk.js:155204-155270 placement
function sanitizeShortReason(reason) {
  return reason.slice(0, 200).replace(/[^\x20-\x7e]/g, "?");
}
//@ chunk-4z1ntdgk.js:155270-155298 placement
var ANNOUNCE_BACKOFF_MAX_ATTEMPTS = 4;
var ANNOUNCE_BACKOFF_BASE_MS = 2000;
var MAX_ANNOUNCE_CHARS = 1048576;
//@ chunk-4z1ntdgk.js:155298-155434 placement
function trimAnnounceBody(body) {
  if (
    body.passthrough.length === 0 ||
    jsonStringify(remoteToolsAnnounceRequest(body)).length <= MAX_ANNOUNCE_CHARS
  )
    return {
      body,
      trimmed: false,
    };
  return {
    body: {
      ...body,
      passthrough: [],
    },
    trimmed: true,
  };
}
//@ chunk-4z1ntdgk.js:155434-155491 placement
function dropPassthroughAdopted(result) {
  let { passthroughAdopted, ...rest } = result;
  return rest;
}
//@ chunk-4z1ntdgk.js:155491-155563 placement
var ANNOUNCE_MIN_GAP_MS = 60000;
var MAX_ANNOUNCE_ATTEMPTS = 6;
var ANNOUNCE_ATTEMPT_WINDOW_MS = 3600000;
var TEARDOWN_TIMEOUT_MS = 1000;
var MAX_WITHDRAW_ATTEMPTS = 6;
var MAX_RETRY_ATTEMPTS = 6;
var RETRY_MIN_GAP_MS = 60000;
var DEFAULT_ANNOUNCE_TIMEOUT_MS = 5000;
var START_TIMEOUT_MS = 1500;
//@ chunk-4z1ntdgk.js:155563-160931 placement
/**
 * 带退避重试的远程工具通告循环。
 */
function createAnnounceLoop(options) {
  let backoffFor = (attempt) =>
    options.backoffMs !== undefined
      ? options.backoffMs[attempt]
      : attempt < ANNOUNCE_BACKOFF_MAX_ATTEMPTS
        ? fullJitterBackoffMs({
            baseMs: ANNOUNCE_BACKOFF_BASE_MS,
            attempt,
            floorMs: (ANNOUNCE_BACKOFF_BASE_MS * 2 ** attempt) / 2,
          })
        : undefined;
  let setTimer =
    options.setTimer ??
    ((callback, delayMs) => {
      let timer = setTimeout(callback, delayMs);
      return {
        clear: () => clearTimeout(timer),
      };
    });
  let disposed = false;
  let inFlight = null;
  let pendingReason = null;
  let attempt = 0;
  let retryTimer = null;
  let coalesced = null;
  let coalesceTimer = null;
  let notedOversize = false;
  let lastBody;
  let holdKind = null;
  let staleRetries = 0;
  let unansweredTries = 0;
  let returnTries = [];
  let refusedBefore = false;
  let sleepTries = [];
  let asleep = null;
  let wasStaleReturn = false;
  let stillHereTries = [];
  let announce = async (reason) => {
    if (reason_2(reason) || reason === "reconnected") unansweredTries = 0;
    if (asleep !== null || options.hostAsleep?.() === true) {
      pendingReason = reason_4(pendingReason, reason);
      return;
    }
    let session = options.session();
    let built = options.build();
    if (session === null || built === undefined || !options.workerLive()) {
      pendingReason = reason_4(pendingReason, reason);
      return;
    }
    let { body, trimmed } = trimAnnounceBody(built);
    if (trimmed && !notedOversize) {
      notedOversize = true;
      logFeatureSad("remote_tools_client_announce", "passthrough_over_frame");
      logForDebugging(
        `[remoteToolsAnnounce] the announce with this machine's ${built.passthrough.length} MCP tools is larger than the worker reads (${MAX_ANNOUNCE_CHARS} chars); announcing without them \u2014 they are not offered to this worker`,
        {
          level: "warn",
        },
      );
    }
    pendingReason = null;
    clearCoalesce();
    let { promise, resolve } = Promise.withResolvers();
    inFlight = {
      replace: resolve,
      reason,
    };
    lastBody = body;
    let refusedBeforeRun = refusedBefore;
    refusedBefore = false;
    if (reason === "returned") returnTries.push((options.now ?? Date.now)());
    let result = await announceRemoteTools(session, body, {
      ...(options.signal && {
        signal: options.signal,
      }),
      timeoutMs: UNVERIFIED_SENDER,
      replaced: promise,
    });
    inFlight = null;
    if (result.kind === "failed" && refusedBeforeRun) refusedBefore = true;
    if (disposed) return;
    let reported = trimmed && result.kind === "announced" ? dropPassthroughAdopted(result) : result;
    let isReturned = reason === "returned";
    let noAnswer = reported.kind === "failed" && reported.reason === "no_answer";
    let unverified = reported.kind === "refused" && reported.reason === UNVERIFIED_SENDER_2;
    unansweredTries = !isReturned && (noAnswer || unverified) ? unansweredTries + 1 : 0;
    let outcome =
      isReturned && unverified
        ? {
            kind: "failed",
            reason: UNVERIFIED_SENDER_2,
          }
        : noAnswer && unansweredTries > 1
          ? {
              kind: "refused",
              reason: "no_answer_parked",
            }
          : unverified && unansweredTries === 1
            ? {
                kind: "retry",
                reason: UNVERIFIED_SENDER_2,
              }
            : reported;
    logForDebugging(
      `[remoteToolsAnnounce] ${reason}: ${outcome.kind}${"reason" in outcome ? ` (${sanitizeShortReason(outcome.reason)})` : ""}`,
    );
    options.onOutcome?.(outcome, reason);
    let isReturn = isReturned || (reason === "retry" && wasStaleReturn);
    wasStaleReturn = isReturned && outcome.kind === "retry" && outcome.reason === "stale_worker_epoch";
    if (isReturn && !wasStaleReturn)
      if (outcome.kind === "announced") logFeatureOk("rtc_return_announce");
      else if (outcome.kind === "failed") {
        let reason = outcome.reason;
        if (isReturned && (reason === "post_failed" || reason === "post_lost")) returnTries.pop();
        logFeatureSad(
          "rtc_return_announce",
          [...ANNOUNCE_FAILURE_REASONS, UNVERIFIED_SENDER_2].find((reason_2) => reason_2 === reason) ??
            "other",
        );
      } else logFeatureSad("rtc_return_announce", outcome.kind);
    switch (outcome.kind) {
      case "announced":
        clearRetry();
        staleRetries = 0;
        break;
      case "refused":
      case "unsupported":
        clearRetry();
        staleRetries = 0;
        holdKind =
          outcome.kind === "refused" && outcome.reason === "no_answer_parked" ? "silence" : "refusal";
        break;
      case "retry":
        if (
          (outcome.reason === "stale_worker_epoch" && ++staleRetries === 1) ||
          outcome.reason === UNVERIFIED_SENDER_2
        )
          pendingReason ??= "retry";
        else armRetry();
        break;
      case "failed":
        if (!isReturned) armRetry();
        break;
    }
    let queued = pendingReason;
    if (queued !== null) {
      pendingReason = null;
      if (holdKind === null || reason_3(queued)) {
        holdKind = null;
        clearRetry();
        announce(queued);
      }
    }
  };
  let reason_2 = (reason) =>
    reason === "worker_init" || reason === "tools_changed" || reason === "worker_asked";
  let reason_3 = (reason) => reason_2(reason) || (holdKind === "silence" && reason === "reconnected");
  let reason_4 = (pendingReason, reason) =>
    pendingReason !== null && reason_2(pendingReason) && !reason_2(reason) ? pendingReason : reason;
  let clearRetry = () => {
    attempt = 0;
    retryTimer?.clear();
    retryTimer = null;
  };
  let clearCoalesce = () => {
    coalesceTimer?.clear();
    coalesceTimer = null;
    coalesced = null;
  };
  let reason_5 = (coalesceMs, coalesceMs_2) => {
    if (coalesced !== null && coalesced.ms <= coalesceMs_2) {
      coalesced = {
        reason: reason_4(coalesced.reason, coalesceMs),
        ms: coalesced.ms,
      };
      return;
    }
    let reason = coalesced?.reason ?? null;
    clearCoalesce();
    coalesced = {
      reason: reason_4(reason, coalesceMs),
      ms: coalesceMs_2,
    };
    coalesceTimer = setTimer(() => {
      let coalesced_2 = coalesced;
      coalesceTimer = null;
      coalesced = null;
      if (coalesced_2 !== null) loop.requestAnnounce(coalesced_2.reason);
    }, coalesceMs_2);
  };
  let armRetry = () => {
    let delayMs = retryTimer === null ? backoffFor(attempt) : undefined;
    if (delayMs === undefined) return;
    attempt += 1;
    retryTimer = setTimer(() => {
      retryTimer = null;
      if (!disposed) announce("retry");
    }, delayMs);
  };
  let withdrawNow = async (leftState) => {
    let session = options.session();
    let body = lastBody === undefined ? undefined : (options.build() ?? lastBody);
    let workerLive = options.workerLive();
    if (session === null || body === undefined || (!workerLive && leftState === undefined)) return;
    let host =
      leftState === undefined
        ? body.host
        : {
            ...body.host,
            capabilities: [leftStateFor(leftState), ...(body.host.capabilities ?? [])],
          };
    await announceRemoteTools(
      session,
      {
        ...body,
        ...(!workerLive && {
          worker_epoch: undefined,
        }),
        host,
        tools: [],
        passthrough: [],
        plumbing: [],
      },
      {
        signal: AbortSignal.timeout(START_TIMEOUT_MS),
        timeoutMs: START_TIMEOUT_MS,
        answerExpected: false,
      },
    );
  };
  let loop = {
    requestAnnounce(reason, options_2) {
      if (disposed) return;
      if (options_2?.coalesceMs !== undefined && options_2.coalesceMs > 0) {
        reason_5(reason, options_2.coalesceMs);
        return;
      }
      let mergedReason = coalesced === null ? reason : reason_4(coalesced.reason, reason);
      clearCoalesce();
      if (reason_3(mergedReason)) holdKind = null;
      attempt = 0;
      if (holdKind !== null) return;
      if (mergedReason === "returned" && !refusedBefore) {
        let now = (options.now ?? Date.now)();
        returnTries = returnTries.filter((at) => at <= now && now - at < ANNOUNCE_ATTEMPT_WINDOW_MS);
        let last = returnTries.at(-1);
        if (
          returnTries.length >= MAX_ANNOUNCE_ATTEMPTS ||
          (last !== undefined && now - last < ANNOUNCE_MIN_GAP_MS)
        ) {
          logFeatureSad("rtc_return_announce", "rate_limited");
          return;
        }
      }
      retryTimer?.clear();
      retryTimer = null;
      if (inFlight) {
        pendingReason = reason_4(pendingReason, mergedReason);
        if (mergedReason === "tools_changed") inFlight.replace();
        return;
      }
      announce(mergedReason);
    },
    outstanding: () =>
      (inFlight !== null && inFlight.reason !== "returned") ||
      (pendingReason !== null && pendingReason !== "returned"),
    workerLive() {
      if (disposed || inFlight || pendingReason === null || holdKind !== null) return;
      let reason = pendingReason;
      pendingReason = null;
      retryTimer?.clear();
      retryTimer = null;
      announce(reason);
    },
    async withdraw(leftState) {
      await loop.disposeKeepingWithdraw(leftState)();
    },
    disposeKeepingWithdraw(leftState) {
      if (disposed) return () => Promise.resolve();
      loop.dispose();
      return onceExport(() => withdrawNow(leftState));
    },
    sayAsleep(workerEpoch) {
      let session = options.session();
      if (disposed || session === null || lastBody === undefined || !options.workerLive()) return null;
      let now = (options.now ?? Date.now)();
      sleepTries = sleepTries.filter((at) => at <= now && now - at < ANNOUNCE_ATTEMPT_WINDOW_MS);
      if (refusedBefore || sleepTries.length >= MAX_WITHDRAW_ATTEMPTS) {
        logFeatureSad("rtc_sleep_notice", refusedBefore ? "already_said" : "rate_limited");
        return null;
      }
      refusedBefore = true;
      sleepTries.push(now);
      let { posted, response } = session.postControlRequest(
        remoteToolsAnnounceRequest({
          ...lastBody,
          worker_epoch: workerEpoch,
          host: {
            ...lastBody.host,
            capabilities: [...(lastBody.host.capabilities ?? []), MACHINE_PRESENCE_STATES],
          },
        }),
        {
          timeoutMs: TEARDOWN_TIMEOUT_MS,
          answerExpected: false,
          background: true,
        },
      );
      response.catch(() => {});
      let settled = withDeadline(
        posted.then(({ outcome }) => {
          if (outcome === "accepted") {
            logFeatureOk("rtc_sleep_notice");
            return true;
          }
          logFeatureSad("rtc_sleep_notice", "post_failed");
          refusedBefore = false;
          sleepTries.pop();
          return false;
        }),
        TEARDOWN_TIMEOUT_MS,
        (callback, delayMs) => setTimer(callback, delayMs).clear,
      ).then((ok) => {
        asleep = null;
        loop.workerLive();
        return ok !== false;
      });
      asleep = settled;
      return settled;
    },
    sayStillHere(workerEpoch) {
      let session = options.session();
      if (
        disposed ||
        session === null ||
        lastBody === undefined ||
        refusedBefore ||
        asleep !== null ||
        options.hostAsleep?.() === true ||
        !options.workerLive()
      )
        return false;
      let now = (options.now ?? Date.now)();
      stillHereTries = stillHereTries.filter((at) => at <= now && now - at < ANNOUNCE_ATTEMPT_WINDOW_MS);
      let last = stillHereTries.at(-1);
      if (
        stillHereTries.length >= MAX_RETRY_ATTEMPTS ||
        (last !== undefined && now - last < RETRY_MIN_GAP_MS)
      )
        return false;
      stillHereTries.push(now);
      let { posted, response } = session.postControlRequest(
        remoteToolsAnnounceRequest({
          ...lastBody,
          passthrough: [],
          worker_epoch: workerEpoch,
          host: {
            ...lastBody.host,
            capabilities: [STILL_HERE, ...(lastBody.host.capabilities ?? [])],
          },
        }),
        {
          timeoutMs: DEFAULT_ANNOUNCE_TIMEOUT_MS,
          answerExpected: false,
          background: true,
        },
      );
      response.catch(() => {});
      posted.then((posted) => {
        if (posted.outcome === "accepted") {
          logFeatureOk("rtc_still_here");
          return;
        }
        if (!(posted.outcome === "failed" && (posted.cause === "network" || posted.cause === "timeout")))
          stillHereTries = stillHereTries.filter((at) => at !== now);
        if (posted.outcome !== "failed" || posted.cause !== "closed")
          logFeatureSad("rtc_still_here", "post_failed");
      });
      return true;
    },
    dispose() {
      disposed = true;
      retryTimer?.clear();
      retryTimer = null;
      clearCoalesce();
    },
  };
  return loop;
}
export { ANNOUNCE_FAILURE_REASONS, UNVERIFIED_SENDER_2, createAnnounceLoop, startDeviceHookForwarding };
