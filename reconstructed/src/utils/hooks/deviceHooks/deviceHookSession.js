/**
 * utils/hooks/deviceHooks/deviceHookSession.ts
 *
 * 2.1.316 新增：设备钩子会话与远程工具通告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (16)
 * attribution: placement 16
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
import { getClaudeConfigDir } from "../../envUtils.js";
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
import { looseObject, _enum, E, array, string } from "../../../../vendor/zod/v4/classic/schemas.js";
import { AbortError, errorMessage } from "../../errors.js";
import { primeUnattendedServingConsent } from "../../../services/remoteTools/unattendedConsentStore.js";
import { parseThinClientReply } from "../../../cli/thinClient.js";
import { jsonStringify } from "../../slowOperations.js";
import { fullJitterBackoffMs, withDeadline } from "../../sleep.js";
import {
  leftStateFor,
  MACHINE_PRESENCE_STATES,
  STILL_HERE,
} from "../../../remote/tools/protocolConstants.js";
import { onceExport } from "../../../../vendor/lodash-es/once.js";

//@ chunk-mthxbav8.js:130516-132398 placement
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
  let v = () => null;
  let y = stageDeviceHooks(stagingFsDeps(), () => [
    ...(v()?.cloudWritableRoots ?? [launchDir]),
    ...settingsReachRoots(launchDir),
  ]);
  let C = registerCleanup(() => y.dispose());
  let O = projectConfigRootOr(launchDir);
  let hookCwd = O;
  realpath(O).then(
    (P) => {
      hookCwd = P;
    },
    () => {},
  );
  let attached = {
    ...subprocessEnv(),
  };
  latchLegacyPin(memory, legacyConfigFileOf(memory).env);
  let j = memory.senderFor(launchDir);
  let M = () => {
    let P = subprocessEnv();
    return mergeHookEnv_2({
      attached,
      beforeSettings: getLatchedPreSettingsEnvSnapshot(),
      ownEnv: settingsEnvInReach(j, legacyConfigFileOf(memory)),
      childrenSee: (L) => Object.hasOwn(P, L),
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
    staging: y,
    run: (P, L, N) =>
      runInRemoteCallFrameMain(L.launchDir, () => runDeviceHook(P, L, DEVICE_HOOK_EXECUTORS, N)),
    evaluateCondition: (P, L) => evaluateHookIfCondition(P, L, getTools(), L.cwd),
    parseTarget: (P) => {
      let L = M();
      return analyzeHookCommand(P, {
        home: resolveOptions(L),
        hookCwd,
        projectDir: O,
        defaultShell: defaultShellKind(),
        shellPrefix: shellPrefixOf(L),
      });
    },
    emptyTranscriptPath: () => y.placeholder("cloud-transcript.jsonl"),
    defaultTimeoutMs: deviceHookTimeoutMs,
    onLine: (line, level) =>
      onLine({
        line,
        level,
      }),
    telemetry: (P) => {
      let L = isQuietOutcome(P.outcome);
      if (L === "ok") logFeatureOk("device_hooks_serve");
      else if (L === "sad") logFeatureSad("device_hooks_serve", P.outcome);
      else if (L === "bad") logFeatureBad("device_hooks_serve", P.outcome);
      logEvent("tengu_device_hook_served", {
        event: fromEnumOpt(P.event),
        kind: fromEnumOpt(P.kind),
        outcome: fromEnum(P.outcome),
        exit_class: fromEnumOpt(P.exitClass),
        duration_ms: P.durationMs,
        translated_paths: P.translatedPaths,
        replay: P.replay,
        blocked: P.blocked,
        staged: P.staged,
        project_frame: P.projectFrame,
        repinned: P.repinned,
        waited_ms: P.waitedMs,
        ...(P.attestation !== undefined && {
          attestation_mode: fromEnum(P.attestation.mode),
          request_attestation: fromEnum(P.attestation.status),
          attestation_verdict: fromEnum(P.attestation.verdict),
        }),
      });
    },
    debug: (P) => logForDebugging(P),
    logError,
    extraWritableRoots: () => settingsReachRoots(launchDir),
    hostEnv: M,
    childEnvironment: (P, L) => resolveHookProgramOnPath(P, L, subprocessEnv()),
    placePath: realpathAllowMissing,
    resolveProgram: resolveProgramOnPathInReach,
    defaultShell: () => defaultShellKind(),
  });
  let forwardedHookHandler = createForwardedHookHandler({
    servicer,
    staging: {
      dispose: () => {
        C();
        return y.dispose();
      },
    },
    respond,
    release,
    logError: (P) => {
      logError(P);
      logFeatureBad("device_hooks_serve", "serve_threw");
    },
  });
  v = forwardedHookHandler.state;
  logForDebugging("[deviceHooks] device hook session created for this attach");
  return forwardedHookHandler;
}
//@ chunk-mthxbav8.js:132398-132583 placement
var DEVICE_HOOK_SERVICER_DEFAULTS = {
  stageVerifiedBytes: "always",
  unmarkedStartFolder: "private",
  repinChangedScripts: false,
  wireLabel: "basename",
  denyUnjudgeablePaths: false,
  runWithUntranslatedPaths: false,
  timeoutFailsClosed: false,
};
//@ chunk-mthxbav8.js:132583-136798 placement
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
  let C = realpath(launchDir).catch(() => launchDir);
  let projectDir = projectConfigRootOr(launchDir);
  let gitRootUncached = findGitRootUncached(launchDir);
  let R = gitRootUncached ?? launchDir;
  let j = memory.senderFor(launchDir);
  let attached = {
    ...subprocessEnv(),
  };
  latchLegacyPin(memory, legacyConfigFileOf(memory).env);
  let q = () => {
    let T = subprocessEnv();
    return mergeHookEnv_2({
      attached,
      beforeSettings: getLatchedPreSettingsEnvSnapshot(),
      ownEnv: settingsEnvInReach(j, legacyConfigFileOf(memory)),
      childrenSee: (P) => Object.hasOwn(T, P),
    });
  };
  return DeviceHooksRegistration({
    memory: j,
    now: Date.now,
    setTimer: unrefTimeout,
    hookFlags: createAnsweredOnLatch(),
    capture: () => deviceHooksPolicyEligibility(collectDeviceHookSources()),
    buildInventory: ({ captured, instanceId, syncRoot, reachRoots, withoutTemplates }) => {
      let X = q();
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
          ...(R !== launchDir && {
            repoRoot: R,
          }),
          extraReachRoots: reachRoots,
          allowLegacyTemplateDigests: true,
          refusedTemplateIds: [...withoutTemplates],
          optInPins: j.optInPins,
          reachMemory: j,
          localSettingsLocation: j.localSettingsLocation,
        },
        {
          realpath,
          open,
          home: resolveOptions(X),
          defaultShell: defaultShellKind(),
          shellPrefix: shellPrefixOf(X),
        },
      );
    },
    mintInstanceId: () => newDeviceInstanceId(),
    displayName: shortHostname(),
    cloudSessionId,
    launchDir,
    launchDirReal: () => C,
    realpath,
    projectRoot: R,
    syncRoot: async () => {
      let T = syncRoot();
      return T === null
        ? null
        : {
            root: T,
            real: await realpath(T).catch(() => T),
          };
    },
    servingMuted,
    commonWriteRoots: () => collectBaseReachRoots(launchDir),
    scopeWriteRoots: (T, P) => settingsReachRootsForSource(launchDir, T, P),
    scopeWriteEntries: (T) => collectSettingsWriteRoots(T, launchDir),
    scopeSettingsFile: (T) => getSettingsFilePathForSource(T) ?? null,
    sendRequest: async (T, { timeoutMs, onEchoed }) => {
      try {
        return await sendControlRequest(T, {
          timeoutMs,
          background: true,
          ...(onEchoed && {
            onEchoed,
          }),
        });
      } catch (error) {
        let F = classifyControlRequestError(error);
        if (F === "timeout" || F === "aborted")
          throw Error("timeout: no answer from the cloud worker in time");
        if (F === "disconnected" || F === "not_connected")
          throw Error("disconnected: the session stream is not connected");
        throw error;
      }
    },
    ensureConsent: resolveDeviceHooksConsent({
      deps: readDeviceHooksConsent(storageV5),
      pin: memory.consentPin,
      onNotAsked: (T) => {
        logEvent("tengu_device_hooks_consent_notice", {});
        onLine({
          line: heldHooksNotice(T),
          level: "info",
        });
      },
      isStoreInReach: (T) => probeWritability(deviceHooksConsentPath(), T, realpath),
      onUntrustedStore: (T) => {
        let P = stripInvisibleChars(deviceHooksConsentPath());
        onLine({
          line:
            T === "writable"
              ? `The saved answer about this machine's hooks is ignored here: this cloud session can itself write ${P}. Decide for it in /hooks.`
              : `The saved answer about this machine's hooks is ignored here: ${P} could not be located to check who can write it. Decide for this session in /hooks.`,
          level: "warning",
        });
      },
    }),
    arm: (T) => session.setState(T),
    onLine,
    telemetry: (T) => {
      if (T.trigger === "renewal" && T.outcome === "registered") return;
      let P = {
        held_after_edit: T.heldAfterEdit,
        held_kind_unsupported: T.heldByReason.kind_unsupported ?? 0,
        held_event_runs_locally: T.heldByReason.event_runs_locally ?? 0,
        held_event_later: T.heldByReason.event_later ?? 0,
        held_event_low_value: T.heldByReason.event_low_value ?? 0,
        held_event_container_internal: T.heldByReason.event_container_internal ?? 0,
        held_source_in_sync_root: T.heldByReason.source_in_sync_root ?? 0,
        held_sync_root_is_config_dir: T.heldByReason.sync_root_is_config_dir ?? 0,
        held_unverifiable_target: T.heldByReason.unverifiable_target ?? 0,
        held_in_reach: T.heldByReason.in_reach ?? 0,
        held_interpreter_unvouched: T.heldByReason.interpreter_unvouched ?? 0,
        held_loads_from_reach: T.heldByReason.loads_from_reach ?? 0,
        held_unpinned_command: T.heldByReason.unpinned_command ?? 0,
        held_author_skip: T.heldByReason.author_skip ?? 0,
        held_duplicate: T.heldByReason.duplicate ?? 0,
        held_over_cap: T.heldByReason.over_cap ?? 0,
        held_pattern_matcher: T.heldByReason.pattern_matcher ?? 0,
      };
      switch (
        (logEvent("tengu_device_hooks_client_register", {
          outcome: fromEnum(T.outcome),
          trigger: fromEnum(T.trigger),
          forwarded: T.forwarded,
          templates: T.templates,
          ...P,
          held_other: T.heldOther,
          accepted: T.accepted,
          ignored: T.ignored,
          attempt: T.attempt,
          after_flags_unanswered: T.afterFlagsUnanswered,
        }),
        T.outcome)
      ) {
        case "registered":
        case "unregistered":
        case "nothing_to_offer":
        case "dormant":
        case "no_consent":
        case "muted":
        case "flag_off":
          logFeatureOk("device_hooks_client_register", {
            forwarded: T.forwarded,
          });
          break;
        case "not_ready":
        case "stale_epoch":
        case "superseded":
        case "failed":
        case "consent_distrusted":
        case "flag_unanswered":
          logFeatureSad("device_hooks_client_register", T.outcome);
          break;
        default:
          logFeatureBad("device_hooks_client_register", T.outcome);
      }
    },
    lapseTelemetry: (T) =>
      logEvent("tengu_device_hooks_lapse_line", {
        kind: fromEnum(T),
      }),
    reachPinnedTelemetry: (T) =>
      logEvent("tengu_device_hooks_reach_pinned", {
        source: fromEnum(T),
      }),
    sourcePinnedTelemetry: (T) =>
      logEvent("tengu_device_hooks_source_pinned", {
        source: fromEnum(T.source),
        changed: T.changed,
        appeared: T.appeared,
        vanished: T.vanished,
      }),
    servicerDefaults: DEVICE_HOOK_SERVICER_DEFAULTS,
  });
}
//@ chunk-mthxbav8.js:136798-137468 placement
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
//@ chunk-mthxbav8.js:137468-137567 placement = SETTING_SOURCES (1)
var SETTING_SOURCE_SET = new Set([
  "userSettings",
  "localSettings",
  "flagSettings",
  "projectSettings",
  "policySettings",
]);
//@ chunk-mthxbav8.js:137567-139389 placement
/**
 * 启动设备钩子转发：组合会话与发送器，并按服务静音状态切换。
 */
function startDeviceHookForwarding(e) {
  let createSession = e.createSession ?? createDeviceHookSession;
  let createSender = e.createSender ?? createRemoteToolsSender;
  let isServingMuted = e.isServingMuted ?? isRemoteToolServingMuted;
  let u = isServingMuted();
  let session = createSession({
    launchDir: e.launchDir,
    memory: e.memory,
    getTools: e.getTools,
    respond: (q, T) => e.manager()?.respondToForwardedHook(q, T) ?? false,
    release: (q) => e.manager()?.releaseForwardedHook(q),
    onLine: e.onLine,
    ...(e.trustAccepted && {
      trustAccepted: e.trustAccepted,
    }),
    isMuted: () => u,
  });
  let sender = createSender({
    launchDir: e.launchDir,
    memory: e.memory,
    cloudSessionId: e.cloudSessionId,
    session,
    sendControlRequest: (q, T) => {
      let P = e.manager();
      if (P === null) return Promise.reject(Error("[RemoteSessionManager] Cannot send: not connected"));
      return P.sendControlRequest(q, T);
    },
    syncRoot: e.syncRoot,
    servingMuted: u,
    onLine: e.onLine,
    storageV5: e.storageV5,
  });
  let h = (e.onServingMuteRecheck ?? onServingMuteRecheck)(() => {
    try {
      let q = isServingMuted();
      if (q === u) return;
      if (q) {
        u = true;
        sender.servingMute(true);
      } else {
        sender.servingMute(false);
        u = false;
      }
    } catch (error) {
      logError(error);
    }
  });
  let v = e.registerCleanup(() => sender.unregister(UNREGISTER_TIMEOUT_MS));
  let y = e.subscribeSettingsChanges((q) => {
    if (SETTING_SOURCE_SET.has(q)) sender.settingsChanged();
  });
  let C = session.onStoppedWhileRunning(() => sender.requestRegistration("stopped_while_running"));
  let x = (e.subscribeConsent ?? ((q) => subscribeConsent(e.memory.consentAnnounced, q)))((q) =>
    sender.consentDecided(q),
  );
  let R = (q) => () => {
    try {
      sender.requestRegistration(q);
    } catch (error) {
      logError(error);
    }
  };
  let j = e.memory.noteAttached(e.launchDir);
  let M = false;
  return {
    callbacks: {
      onForwardedHookCallback: (q) => {
        session.handleForwardedHook(q);
        let instanceId = parseDeviceHookId(q.callbackId)?.instanceId;
        let { registeredInstanceId, instanceId: instanceId_2 } = sender.snapshot();
        if (instanceId !== undefined && (instanceId === registeredInstanceId || instanceId === instanceId_2))
          sender.activity();
      },
      onForwardedHookCancelled: (q, T) => {
        session.handleCancelled(q, T);
      },
    },
    onStreamConnected: R("connected"),
    onWorkerInit: R("init"),
    onWorkerUp: R("worker_up"),
    onTurnInFlight: () => sender.turnInFlight(),
    onTurnEnded: () => sender.turnEnded(),
    beforeSend: () => sender.ensureRegistered(),
    snapshot: () => sender.snapshot(),
    dispose: () => {
      if (M) return;
      M = true;
      j();
      h();
      y();
      C();
      x();
      v();
      let q = sender.unregister(UNREGISTER_TIMEOUT_MS);
      sender.dispose();
      let T = e.registerCleanup(() => q);
      q.then(T, T);
      session.dispose();
    },
  };
}
//@ chunk-mthxbav8.js:139426-139992 placement
/**
 * 远程工具通告的响应 schema、超时、未验证发送者标记与失败原因列表。
 */
var announceResponseSchema = DoctorLazy(() =>
  looseObject({
    status: _enum(["announced", "withdrawn"]),
    passthrough_declined: _enum(["policy", "pending", "unavailable"]).optional().catch(undefined),
    worker_epoch: E().int().positive().max(Number.MAX_SAFE_INTEGER).optional().catch(undefined),
    protocol_version: E().nullable().optional().catch(undefined),
    ignored_tools: array(string()).optional().catch(undefined),
    passthrough_adopted: E().int().nonnegative().optional().catch(undefined),
    worker_capabilities: array(string()).optional().catch(undefined),
  }),
);
var UNVERIFIED_SENDER = 15000;
var UNVERIFIED_SENDER_2 = "unverified_sender";
var ANNOUNCE_FAILURE_REASONS = [
  "aborted",
  "no_answer",
  "post_failed",
  "post_lost",
  "replaced",
  "unreadable_ack",
];
//@ chunk-mthxbav8.js:139992-140581 placement
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
  let n = errorMessage(error);
  if (n.startsWith("Unsupported control request subtype"))
    return {
      kind: "unsupported",
    };
  if (n.startsWith("remote_tools_disabled:") || n.startsWith("invalid_announce:"))
    return {
      kind: "refused",
      reason: n,
    };
  if (n.startsWith("remote_tools_not_ready:"))
    return {
      kind: "retry",
      reason: n,
    };
  if (n.startsWith("stale_worker_epoch"))
    return {
      kind: "retry",
      reason: "stale_worker_epoch",
    };
  return {
    kind: "failed",
    reason: n,
  };
}
//@ chunk-mthxbav8.js:140581-141993 placement
async function announceRemoteTools(e, n, r = {}) {
  primeUnattendedServingConsent();
  let abortController = new AbortController();
  let u;
  let S = (y) => {
    u ??= y;
    abortController.abort();
  };
  let w = "none";
  let now = Date.now();
  let v = (y) => {
    if (w !== "none") {
      let now_2 = Date.now();
      let O = w === "waiting" ? now_2 : w.endedAt;
      logEvent("tengu_remote_tools_announce_waited_for_worker", {
        waited_ms: O - now,
        after_wait_ms: now_2 - O,
        outcome: fromEnum(y.kind),
        reason: fromEnumOpt(ANNOUNCE_FAILURE_REASONS.find((x) => y.kind === "failed" && x === y.reason)),
      });
    }
    return y;
  };
  try {
    let { posted, response } = e.postControlRequest(remoteToolsAnnounceRequest(n), {
      signal: r.signal ? AbortSignal.any([r.signal, abortController.signal]) : abortController.signal,
      ...(r.timeoutMs !== undefined && {
        timeoutMs: r.timeoutMs,
      }),
      ...(r.answerExpected === false
        ? {
            answerExpected: false,
          }
        : {
            awaitWorkerStart: {
              onChange: (R) => {
                w = R
                  ? "waiting"
                  : {
                      endedAt: Date.now(),
                    };
              },
            },
          }),
      background: true,
      onEchoed: (R) => {
        if (R === "unverified")
          S({
            kind: "refused",
            reason: UNVERIFIED_SENDER_2,
          });
      },
    });
    posted
      .then(({ outcome }) => (outcome === "accepted" ? r.replaced?.then(() => "replaced") : "post_lost"))
      .then((R) => {
        if (R !== undefined && w === "waiting")
          S({
            kind: "failed",
            reason: R,
          });
      });
    let O = await response;
    let thinClientReply = parseThinClientReply("remote_tools_announce", announceResponseSchema(), O);
    if (thinClientReply === null)
      return v({
        kind: "failed",
        reason: "unreadable_ack",
      });
    return v({
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
    });
  } catch (error) {
    return v((error instanceof AbortError ? u : undefined) ?? classifyAnnounceError(error));
  }
}
//@ chunk-mthxbav8.js:141993-142325 placement
function remoteToolsAnnounceRequest(e) {
  return {
    subtype: "remote_tools_announce",
    instance_id: e.instance_id,
    ...(e.worker_epoch !== undefined && {
      worker_epoch: e.worker_epoch,
    }),
    host: e.host,
    tools: e.tools.map((tool) => ({
      ...tool,
      refused_input_fields: [...tool.refused_input_fields],
      protocol_versions: [...tool.protocol_versions],
    })),
    passthrough: [...e.passthrough],
    plumbing: [...e.plumbing],
  };
}
//@ chunk-mthxbav8.js:142325-142391 placement
function sanitizeShortReason(reason) {
  return reason.slice(0, 200).replace(/[^\x20-\x7e]/g, "?");
}
//@ chunk-mthxbav8.js:142391-142419 placement
var ANNOUNCE_BACKOFF_MAX_ATTEMPTS = 4;
var ANNOUNCE_BACKOFF_BASE_MS = 2000;
var MAX_ANNOUNCE_CHARS = 1048576;
//@ chunk-mthxbav8.js:142419-142555 placement
function trimAnnounceBody(e) {
  if (e.passthrough.length === 0 || jsonStringify(remoteToolsAnnounceRequest(e)).length <= MAX_ANNOUNCE_CHARS)
    return {
      body: e,
      trimmed: false,
    };
  return {
    body: {
      ...e,
      passthrough: [],
    },
    trimmed: true,
  };
}
//@ chunk-mthxbav8.js:142555-142612 placement
function dropPassthroughAdopted(e) {
  let { passthroughAdopted, ...r } = e;
  return r;
}
//@ chunk-mthxbav8.js:142612-142684 placement
var ANNOUNCE_MIN_GAP_MS = 60000;
var MAX_ANNOUNCE_ATTEMPTS = 6;
var ANNOUNCE_ATTEMPT_WINDOW_MS = 3600000;
var TEARDOWN_TIMEOUT_MS = 1000;
var MAX_WITHDRAW_ATTEMPTS = 6;
var MAX_RETRY_ATTEMPTS = 6;
var RETRY_MIN_GAP_MS = 60000;
var DEFAULT_ANNOUNCE_TIMEOUT_MS = 5000;
var START_TIMEOUT_MS = 1500;
//@ chunk-mthxbav8.js:142684-148048 placement
/**
 * 带退避重试的远程工具通告循环。
 */
function createAnnounceLoop(e) {
  let n = (K) =>
    e.backoffMs !== undefined
      ? e.backoffMs[K]
      : K < ANNOUNCE_BACKOFF_MAX_ATTEMPTS
        ? fullJitterBackoffMs({
            baseMs: ANNOUNCE_BACKOFF_BASE_MS,
            attempt: K,
            floorMs: (ANNOUNCE_BACKOFF_BASE_MS * 2 ** K) / 2,
          })
        : undefined;
  let r =
    e.setTimer ??
    ((K, re) => {
      let timer = setTimeout(K, re);
      return {
        clear: () => clearTimeout(timer),
      };
    });
  let s = false;
  let u = null;
  let S = null;
  let w = 0;
  let h = null;
  let v = null;
  let y = null;
  let C = false;
  let O;
  let x = null;
  let R = 0;
  let j = 0;
  let M = [];
  let q = false;
  let T = [];
  let P = null;
  let L = false;
  let N = [];
  let F = async (K) => {
    if (X(K) || K === "reconnected") j = 0;
    if (P !== null || e.hostAsleep?.() === true) {
      S = Q(S, K);
      return;
    }
    let re = e.session();
    let ne = e.build();
    if (re === null || ne === undefined || !e.workerLive()) {
      S = Q(S, K);
      return;
    }
    let { body, trimmed } = trimAnnounceBody(ne);
    if (trimmed && !C) {
      C = true;
      logFeatureSad("remote_tools_client_announce", "passthrough_over_frame");
      logForDebugging(
        `[remoteToolsAnnounce] the announce with this machine's ${ne.passthrough.length} MCP tools is larger than the worker reads (${MAX_ANNOUNCE_CHARS} chars); announcing without them \u2014 they are not offered to this worker`,
        {
          level: "warn",
        },
      );
    }
    S = null;
    D();
    let { promise, resolve } = Promise.withResolvers();
    u = {
      replace: resolve,
      reason: K,
    };
    O = body;
    let V = q;
    q = false;
    if (K === "returned") M.push((e.now ?? Date.now)());
    let te = await announceRemoteTools(re, body, {
      ...(e.signal && {
        signal: e.signal,
      }),
      timeoutMs: UNVERIFIED_SENDER,
      replaced: promise,
    });
    u = null;
    if (te.kind === "failed" && V) q = true;
    if (s) return;
    let le = trimmed && te.kind === "announced" ? dropPassthroughAdopted(te) : te;
    let ue = K === "returned";
    let we = le.kind === "failed" && le.reason === "no_answer";
    let Se = le.kind === "refused" && le.reason === UNVERIFIED_SENDER_2;
    j = !ue && (we || Se) ? j + 1 : 0;
    let he =
      ue && Se
        ? {
            kind: "failed",
            reason: UNVERIFIED_SENDER_2,
          }
        : we && j > 1
          ? {
              kind: "refused",
              reason: "no_answer_parked",
            }
          : Se && j === 1
            ? {
                kind: "retry",
                reason: UNVERIFIED_SENDER_2,
              }
            : le;
    logForDebugging(
      `[remoteToolsAnnounce] ${K}: ${he.kind}${"reason" in he ? ` (${sanitizeShortReason(he.reason)})` : ""}`,
    );
    e.onOutcome?.(he, K);
    let it = ue || (K === "retry" && L);
    L = ue && he.kind === "retry" && he.reason === "stale_worker_epoch";
    if (it && !L)
      if (he.kind === "announced") logFeatureOk("rtc_return_announce");
      else if (he.kind === "failed") {
        let reason = he.reason;
        if (ue && (reason === "post_failed" || reason === "post_lost")) M.pop();
        logFeatureSad(
          "rtc_return_announce",
          [...ANNOUNCE_FAILURE_REASONS, UNVERIFIED_SENDER_2].find((Wt) => Wt === reason) ?? "other",
        );
      } else logFeatureSad("rtc_return_announce", he.kind);
    switch (he.kind) {
      case "announced":
        ee();
        R = 0;
        break;
      case "refused":
      case "unsupported":
        ee();
        R = 0;
        x = he.kind === "refused" && he.reason === "no_answer_parked" ? "silence" : "refusal";
        break;
      case "retry":
        if ((he.reason === "stale_worker_epoch" && ++R === 1) || he.reason === UNVERIFIED_SENDER_2)
          S ??= "retry";
        else Y();
        break;
      case "failed":
        if (!ue) Y();
        break;
    }
    let Je = S;
    if (Je !== null) {
      S = null;
      if (x === null || B(Je)) {
        x = null;
        ee();
        F(Je);
      }
    }
  };
  let X = (K) => K === "worker_init" || K === "tools_changed" || K === "worker_asked";
  let B = (K) => X(K) || (x === "silence" && K === "reconnected");
  let Q = (reason, re) => (reason !== null && X(reason) && !X(re) ? reason : re);
  let ee = () => {
    w = 0;
    h?.clear();
    h = null;
  };
  let D = () => {
    y?.clear();
    y = null;
    v = null;
  };
  let G = (K, coalesceMs) => {
    if (v !== null && v.ms <= coalesceMs) {
      v = {
        reason: Q(v.reason, K),
        ms: v.ms,
      };
      return;
    }
    let reason = v?.reason ?? null;
    D();
    v = {
      reason: Q(reason, K),
      ms: coalesceMs,
    };
    y = r(() => {
      let ae = v;
      y = null;
      v = null;
      if (ae !== null) z.requestAnnounce(ae.reason);
    }, coalesceMs);
  };
  let Y = () => {
    let K = h === null ? n(w) : undefined;
    if (K === undefined) return;
    w += 1;
    h = r(() => {
      h = null;
      if (!s) F("retry");
    }, K);
  };
  let Z = async (K) => {
    let re = e.session();
    let ne = O === undefined ? undefined : (e.build() ?? O);
    let ae = e.workerLive();
    if (re === null || ne === undefined || (!ae && K === undefined)) return;
    let host =
      K === undefined
        ? ne.host
        : {
            ...ne.host,
            capabilities: [leftStateFor(K), ...(ne.host.capabilities ?? [])],
          };
    await announceRemoteTools(
      re,
      {
        ...ne,
        ...(!ae && {
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
  let z = {
    requestAnnounce(K, re) {
      if (s) return;
      if (re?.coalesceMs !== undefined && re.coalesceMs > 0) {
        G(K, re.coalesceMs);
        return;
      }
      let ne = v === null ? K : Q(v.reason, K);
      D();
      if (B(ne)) x = null;
      w = 0;
      if (x !== null) return;
      if (ne === "returned" && !q) {
        let ae = (e.now ?? Date.now)();
        M = M.filter((ce) => ce <= ae && ae - ce < ANNOUNCE_ATTEMPT_WINDOW_MS);
        let last = M.at(-1);
        if (M.length >= MAX_ANNOUNCE_ATTEMPTS || (last !== undefined && ae - last < ANNOUNCE_MIN_GAP_MS)) {
          logFeatureSad("rtc_return_announce", "rate_limited");
          return;
        }
      }
      h?.clear();
      h = null;
      if (u) {
        S = Q(S, ne);
        if (ne === "tools_changed") u.replace();
        return;
      }
      F(ne);
    },
    outstanding: () => (u !== null && u.reason !== "returned") || (S !== null && S !== "returned"),
    workerLive() {
      if (s || u || S === null || x !== null) return;
      let K = S;
      S = null;
      h?.clear();
      h = null;
      F(K);
    },
    async withdraw(K) {
      await z.disposeKeepingWithdraw(K)();
    },
    disposeKeepingWithdraw(K) {
      if (s) return () => Promise.resolve();
      z.dispose();
      return onceExport(() => Z(K));
    },
    sayAsleep(workerEpoch) {
      let re = e.session();
      if (s || re === null || O === undefined || !e.workerLive()) return null;
      let ne = (e.now ?? Date.now)();
      T = T.filter((oe) => oe <= ne && ne - oe < ANNOUNCE_ATTEMPT_WINDOW_MS);
      if (q || T.length >= MAX_WITHDRAW_ATTEMPTS) {
        logFeatureSad("rtc_sleep_notice", q ? "already_said" : "rate_limited");
        return null;
      }
      q = true;
      T.push(ne);
      let { posted, response } = re.postControlRequest(
        remoteToolsAnnounceRequest({
          ...O,
          worker_epoch: workerEpoch,
          host: {
            ...O.host,
            capabilities: [...(O.host.capabilities ?? []), MACHINE_PRESENCE_STATES],
          },
        }),
        {
          timeoutMs: TEARDOWN_TIMEOUT_MS,
          answerExpected: false,
          background: true,
        },
      );
      response.catch(() => {});
      let ce = withDeadline(
        posted.then(({ outcome }) => {
          if (outcome === "accepted") {
            logFeatureOk("rtc_sleep_notice");
            return true;
          }
          logFeatureSad("rtc_sleep_notice", "post_failed");
          q = false;
          T.pop();
          return false;
        }),
        TEARDOWN_TIMEOUT_MS,
        (oe, V) => r(oe, V).clear,
      ).then((oe) => {
        P = null;
        z.workerLive();
        return oe !== false;
      });
      P = ce;
      return ce;
    },
    sayStillHere(workerEpoch) {
      let re = e.session();
      if (
        s ||
        re === null ||
        O === undefined ||
        q ||
        P !== null ||
        e.hostAsleep?.() === true ||
        !e.workerLive()
      )
        return false;
      let ne = (e.now ?? Date.now)();
      N = N.filter((oe) => oe <= ne && ne - oe < ANNOUNCE_ATTEMPT_WINDOW_MS);
      let last = N.at(-1);
      if (N.length >= MAX_RETRY_ATTEMPTS || (last !== undefined && ne - last < RETRY_MIN_GAP_MS))
        return false;
      N.push(ne);
      let { posted, response } = re.postControlRequest(
        remoteToolsAnnounceRequest({
          ...O,
          passthrough: [],
          worker_epoch: workerEpoch,
          host: {
            ...O.host,
            capabilities: [STILL_HERE, ...(O.host.capabilities ?? [])],
          },
        }),
        {
          timeoutMs: DEFAULT_ANNOUNCE_TIMEOUT_MS,
          answerExpected: false,
          background: true,
        },
      );
      response.catch(() => {});
      posted.then((oe) => {
        if (oe.outcome === "accepted") {
          logFeatureOk("rtc_still_here");
          return;
        }
        if (!(oe.outcome === "failed" && (oe.cause === "network" || oe.cause === "timeout")))
          N = N.filter((te) => te !== ne);
        if (oe.outcome !== "failed" || oe.cause !== "closed") logFeatureSad("rtc_still_here", "post_failed");
      });
      return true;
    },
    dispose() {
      s = true;
      h?.clear();
      h = null;
      D();
    },
  };
  return z;
}
export { startDeviceHookForwarding, UNVERIFIED_SENDER_2, ANNOUNCE_FAILURE_REASONS, createAnnounceLoop };
