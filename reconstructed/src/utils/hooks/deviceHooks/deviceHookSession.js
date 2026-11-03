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
import { realpath, realpath as realpath_2 } from "fs/promises";
import { isProjectScopeTrustAccepted } from "../../config.js";
import { stageDeviceHooks, stagingFsDeps, scriptFileReaderDeps } from "../servedHooks/hookSandbox.js";
import {
  xyn,
  collectBaseReachRoots,
  dSe,
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
  M3n,
  mergeHookEnv,
  resolveOptions,
  resolveHookProgramOnPath,
  realpathAllowMissing,
  resolveProgramOnPathInReach,
} from "../hookCommandResolution.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { createHookVouching, deviceHookTimeoutMs } from "./vouching.js";
import { Yg } from "../../../remote/remoteMode.js";
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
import { XRs, shortHostname, parseDeviceHookId } from "../deviceHookId.js";
import { getSettingsFilePathForSource } from "../../settings/settings.js";
import {
  classifyControlRequestError,
  ControlRequestNotDeliveredError,
  ControlRequestTimeoutError,
} from "../../../remote/controlRequestErrors.js";
import { resolveDeviceHooksConsent, readDeviceHooksConsent, mKt, $Ne, VZs } from "./consent.js";
import { hr } from "../../invisibleChars.js";
import {
  isRemoteToolServingMuted,
  onServingMuteRecheck,
} from "../../../services/remoteTools/servingGates.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { kt, U, E, A, o } from "../../../../vendor/zod/v4/classic/schemas.js";
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

/**
 * 创建设备钩子会话：接收远程转发的钩子请求，在本机执行并回复结果。
 */
//@ chunk-mthxbav8.js:130516-132398 placement
function createDeviceHookSession({
  launchDir: launchDir,
  memory: memory,
  getTools: getTools,
  respond: respond,
  release: release,
  onLine: onLine,
  trustAccepted: trustAccepted = isProjectScopeTrustAccepted,
  isMuted: isMuted,
}) {
  let v = () => null,
    y = stageDeviceHooks(stagingFsDeps(), () => [
      ...(v()?.cloudWritableRoots ?? [launchDir]),
      ...xyn(launchDir),
    ]),
    C = registerCleanup(() => y.dispose()),
    O = projectConfigRootOr(launchDir),
    x = O;
  realpath_2(O).then(
    (P) => {
      x = P;
    },
    () => {},
  );
  let R = { ...subprocessEnv() };
  M3n(memory, legacyConfigFileOf(memory).env);
  let senderFor = memory.senderFor(launchDir),
    M = () => {
      let P = subprocessEnv();
      return mergeHookEnv({
        attached: R,
        beforeSettings: getLatchedPreSettingsEnvSnapshot(),
        ownEnv: settingsEnvInReach(senderFor, legacyConfigFileOf(memory)),
        childrenSee: (L) => Object.hasOwn(P, L),
      });
    },
    q = createHookVouching({
      memory: memory.servicerFor(launchDir),
      now: Date.now,
      setTimer: unrefTimeout,
      trustAccepted: trustAccepted,
      ...(isMuted && { isMuted: isMuted }),
      judgeSender: attestationFor,
      pin: scriptFileReaderDeps(),
      staging: y,
      run: (P, L, N) => Yg(L.launchDir, () => runDeviceHook(P, L, DEVICE_HOOK_EXECUTORS, N)),
      evaluateCondition: (P, L) => evaluateHookIfCondition(P, L, getTools(), L.cwd),
      parseTarget: (P) => {
        let L = M();
        return analyzeHookCommand(P, {
          home: resolveOptions(L),
          hookCwd: x,
          projectDir: O,
          defaultShell: defaultShellKind(),
          shellPrefix: shellPrefixOf(L),
        });
      },
      emptyTranscriptPath: () => y.placeholder("cloud-transcript.jsonl"),
      defaultTimeoutMs: deviceHookTimeoutMs,
      onLine: (P, L) => onLine({ line: P, level: L }),
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
          ...(P.attestation !== void 0 && {
            attestation_mode: fromEnum(P.attestation.mode),
            request_attestation: fromEnum(P.attestation.status),
            attestation_verdict: fromEnum(P.attestation.verdict),
          }),
        });
      },
      debug: (P) => logForDebugging(P),
      logError: logError,
      extraWritableRoots: () => xyn(launchDir),
      hostEnv: M,
      childEnvironment: (P, L) => resolveHookProgramOnPath(P, L, subprocessEnv()),
      placePath: realpathAllowMissing,
      resolveProgram: resolveProgramOnPathInReach,
      defaultShell: () => defaultShellKind(),
    }),
    T = createForwardedHookHandler({
      servicer: q,
      staging: { dispose: () => (C(), y.dispose()) },
      respond: respond,
      release: release,
      logError: (P) => {
        (logError(P), logFeatureBad("device_hooks_serve", "serve_threw"));
      },
    });
  return ((v = T.state), logForDebugging("[deviceHooks] device hook session created for this attach"), T);
}
//@ chunk-mthxbav8.js:132398-132583 placement
var DEVICE_HOOK_SERVICER_DEFAULTS = {
  stageVerifiedBytes: "always",
  unmarkedStartFolder: "private",
  repinChangedScripts: !1,
  wireLabel: "basename",
  denyUnjudgeablePaths: !1,
  runWithUntranslatedPaths: !1,
  timeoutFailsClosed: !1,
};
/**
 * 创建远程工具通告发送器，按会话状态通告/撤回本机钩子与工具。
 */
//@ chunk-mthxbav8.js:132583-136798 placement
function createRemoteToolsSender({
  launchDir: launchDir,
  memory: memory,
  cloudSessionId: cloudSessionId,
  session: session,
  sendControlRequest: sendControlRequest,
  syncRoot: syncRoot,
  servingMuted: servingMuted,
  onLine: onLine,
  storageV5: storageV5,
}) {
  let openNoFollow = scriptFileReaderDeps().openNoFollow,
    C = realpath_2(launchDir).catch(() => launchDir),
    O = projectConfigRootOr(launchDir),
    x = findGitRootUncached(launchDir),
    R = x ?? launchDir,
    senderFor = memory.senderFor(launchDir),
    M = { ...subprocessEnv() };
  M3n(memory, legacyConfigFileOf(memory).env);
  let q = () => {
    let T = subprocessEnv();
    return mergeHookEnv({
      attached: M,
      beforeSettings: getLatchedPreSettingsEnvSnapshot(),
      ownEnv: settingsEnvInReach(senderFor, legacyConfigFileOf(memory)),
      childrenSee: (P) => Object.hasOwn(T, P),
    });
  };
  return DeviceHooksRegistration({
    memory: senderFor,
    now: Date.now,
    setTimer: unrefTimeout,
    hookFlags: createAnsweredOnLatch(),
    capture: () => deviceHooksPolicyEligibility(collectDeviceHookSources()),
    buildInventory: ({
      captured: captured,
      instanceId: instanceId,
      syncRoot: syncRoot,
      reachRoots: reachRoots,
      withoutTemplates: withoutTemplates,
    }) => {
      let X = q();
      return collectDeviceHookAttestations(
        captured,
        {
          instanceId: instanceId,
          launchDir: launchDir,
          projectDir: O,
          configHome: getClaudeConfigDir(),
          ...(syncRoot !== null && { sync: { rootReal: syncRoot.real, root: syncRoot.root } }),
          inRepository: x !== null,
          ...(R !== launchDir && { repoRoot: R }),
          extraReachRoots: reachRoots,
          allowLegacyTemplateDigests: !0,
          refusedTemplateIds: [...withoutTemplates],
          optInPins: senderFor.optInPins,
          reachMemory: senderFor,
          localSettingsLocation: senderFor.localSettingsLocation,
        },
        {
          realpath: realpath_2,
          open: openNoFollow,
          home: resolveOptions(X),
          defaultShell: defaultShellKind(),
          shellPrefix: shellPrefixOf(X),
        },
      );
    },
    mintInstanceId: () => XRs(),
    displayName: shortHostname(),
    cloudSessionId: cloudSessionId,
    launchDir: launchDir,
    launchDirReal: () => C,
    realpath: realpath_2,
    projectRoot: R,
    syncRoot: async () => {
      let T = syncRoot();
      return T === null ? null : { root: T, real: await realpath_2(T).catch(() => T) };
    },
    servingMuted: servingMuted,
    commonWriteRoots: () => collectBaseReachRoots(launchDir),
    scopeWriteRoots: (T, P) => dSe(launchDir, T, P),
    scopeWriteEntries: (T) => collectSettingsWriteRoots(T, launchDir),
    scopeSettingsFile: (T) => getSettingsFilePathForSource(T) ?? null,
    sendRequest: async (T, { timeoutMs: timeoutMs, onEchoed: onEchoed }) => {
      try {
        return await sendControlRequest(T, {
          timeoutMs: timeoutMs,
          background: !0,
          ...(onEchoed && { onEchoed: onEchoed }),
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
        (logEvent("tengu_device_hooks_consent_notice", {}),
          onLine({ line: heldHooksNotice(T), level: "info" }));
      },
      isStoreInReach: (T) => mKt($Ne(), T, realpath_2),
      onUntrustedStore: (T) => {
        let P = hr($Ne());
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
    onLine: onLine,
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
          logFeatureOk("device_hooks_client_register", { forwarded: T.forwarded });
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
    lapseTelemetry: (T) => logEvent("tengu_device_hooks_lapse_line", { kind: fromEnum(T) }),
    reachPinnedTelemetry: (T) => logEvent("tengu_device_hooks_reach_pinned", { source: fromEnum(T) }),
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
function isQuietOutcome(e) {
  switch (e) {
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
      return e;
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
/**
 * 启动设备钩子转发：组合会话与发送器，并按服务静音状态切换。
 */
//@ chunk-mthxbav8.js:137567-139389 placement
function startDeviceHookForwarding(e) {
  let n = e.createSession ?? createDeviceHookSession,
    r = e.createSender ?? createRemoteToolsSender,
    s = e.isServingMuted ?? isRemoteToolServingMuted,
    u = s(),
    S = n({
      launchDir: e.launchDir,
      memory: e.memory,
      getTools: e.getTools,
      respond: (q, T) => e.manager()?.respondToForwardedHook(q, T) ?? !1,
      release: (q) => e.manager()?.releaseForwardedHook(q),
      onLine: e.onLine,
      ...(e.trustAccepted && { trustAccepted: e.trustAccepted }),
      isMuted: () => u,
    }),
    w = r({
      launchDir: e.launchDir,
      memory: e.memory,
      cloudSessionId: e.cloudSessionId,
      session: S,
      sendControlRequest: (q, T) => {
        let manager = e.manager();
        if (manager === null)
          return Promise.reject(Error("[RemoteSessionManager] Cannot send: not connected"));
        return manager.sendControlRequest(q, T);
      },
      syncRoot: e.syncRoot,
      servingMuted: u,
      onLine: e.onLine,
      storageV5: e.storageV5,
    }),
    h = (e.onServingMuteRecheck ?? onServingMuteRecheck)(() => {
      try {
        let q = s();
        if (q === u) return;
        if (q) ((u = !0), w.servingMute(!0));
        else (w.servingMute(!1), (u = !1));
      } catch (error) {
        logError(error);
      }
    }),
    registerCleanup = e.registerCleanup(() => w.unregister(UNREGISTER_TIMEOUT_MS)),
    subscribeSettingsChanges = e.subscribeSettingsChanges((q) => {
      if (SETTING_SOURCE_SET.has(q)) w.settingsChanged();
    }),
    onStoppedWhileRunning = S.onStoppedWhileRunning(() => w.requestRegistration("stopped_while_running")),
    x = (e.subscribeConsent ?? ((q) => VZs(e.memory.consentAnnounced, q)))((q) => w.consentDecided(q)),
    R = (q) => () => {
      try {
        w.requestRegistration(q);
      } catch (error) {
        logError(error);
      }
    },
    noteAttached = e.memory.noteAttached(e.launchDir),
    M = !1;
  return {
    callbacks: {
      onForwardedHookCallback: (q) => {
        S.handleForwardedHook(q);
        let T = parseDeviceHookId(q.callbackId)?.instanceId,
          { registeredInstanceId: registeredInstanceId, instanceId: instanceId } = w.snapshot();
        if (T !== void 0 && (T === registeredInstanceId || T === instanceId)) w.activity();
      },
      onForwardedHookCancelled: (q, T) => {
        S.handleCancelled(q, T);
      },
    },
    onStreamConnected: R("connected"),
    onWorkerInit: R("init"),
    onWorkerUp: R("worker_up"),
    onTurnInFlight: () => w.turnInFlight(),
    onTurnEnded: () => w.turnEnded(),
    beforeSend: () => w.ensureRegistered(),
    snapshot: () => w.snapshot(),
    dispose: () => {
      if (M) return;
      ((M = !0),
        noteAttached(),
        h(),
        subscribeSettingsChanges(),
        onStoppedWhileRunning(),
        x(),
        registerCleanup());
      let unregister = w.unregister(UNREGISTER_TIMEOUT_MS);
      w.dispose();
      let registerCleanup_2 = e.registerCleanup(() => unregister);
      (unregister.then(registerCleanup_2, registerCleanup_2), S.dispose());
    },
  };
}
//@ chunk-mthxbav8.js:139426-139992 placement
var announceResponseSchema = DoctorLazy(() =>
    kt({
      status: U(["announced", "withdrawn"]),
      passthrough_declined: U(["policy", "pending", "unavailable"])
        .optional()
        .catch(void 0),
      worker_epoch: E()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .catch(void 0),
      protocol_version: E()
        .nullable()
        .optional()
        .catch(void 0),
      ignored_tools: A(o())
        .optional()
        .catch(void 0),
      passthrough_adopted: E()
        .int()
        .nonnegative()
        .optional()
        .catch(void 0),
      worker_capabilities: A(o())
        .optional()
        .catch(void 0),
    }),
  ),
  $s = 15000,
  UNVERIFIED_SENDER = "unverified_sender",
  Ft = ["aborted", "no_answer", "post_failed", "post_lost", "replaced", "unreadable_ack"];
//@ chunk-mthxbav8.js:139992-140581 placement
function classifyAnnounceError(e) {
  if (e instanceof ControlRequestNotDeliveredError) return { kind: "failed", reason: "post_failed" };
  if (e instanceof ControlRequestTimeoutError) return { kind: "failed", reason: "no_answer" };
  if (e instanceof AbortError) return { kind: "failed", reason: "aborted" };
  let n = errorMessage(e);
  if (n.startsWith("Unsupported control request subtype")) return { kind: "unsupported" };
  if (n.startsWith("remote_tools_disabled:") || n.startsWith("invalid_announce:"))
    return { kind: "refused", reason: n };
  if (n.startsWith("remote_tools_not_ready:")) return { kind: "retry", reason: n };
  if (n.startsWith("stale_worker_epoch")) return { kind: "retry", reason: "stale_worker_epoch" };
  return { kind: "failed", reason: n };
}
//@ chunk-mthxbav8.js:140581-141993 placement
async function announceRemoteTools(e, n, r = {}) {
  primeUnattendedServingConsent();
  let abortController = new AbortController(),
    u,
    S = (y) => {
      ((u ??= y), abortController.abort());
    },
    w = "none",
    now = Date.now(),
    v = (y) => {
      if (w !== "none") {
        let now_2 = Date.now(),
          O = w === "waiting" ? now_2 : w.endedAt;
        logEvent("tengu_remote_tools_announce_waited_for_worker", {
          waited_ms: O - now,
          after_wait_ms: now_2 - O,
          outcome: fromEnum(y.kind),
          reason: fromEnumOpt(Ft.find((x) => y.kind === "failed" && x === y.reason)),
        });
      }
      return y;
    };
  try {
    let { posted: posted, response: response } = e.postControlRequest(remoteToolsAnnounceRequest(n), {
      signal: r.signal ? AbortSignal.any([r.signal, abortController.signal]) : abortController.signal,
      ...(r.timeoutMs !== void 0 && { timeoutMs: r.timeoutMs }),
      ...(r.answerExpected === !1
        ? { answerExpected: !1 }
        : {
            awaitWorkerStart: {
              onChange: (R) => {
                w = R ? "waiting" : { endedAt: Date.now() };
              },
            },
          }),
      background: !0,
      onEchoed: (R) => {
        if (R === "unverified") S({ kind: "refused", reason: UNVERIFIED_SENDER });
      },
    });
    posted
      .then(({ outcome: outcome }) =>
        outcome === "accepted" ? r.replaced?.then(() => "replaced") : "post_lost",
      )
      .then((R) => {
        if (R !== void 0 && w === "waiting") S({ kind: "failed", reason: R });
      });
    let O = await response,
      x = parseThinClientReply("remote_tools_announce", announceResponseSchema(), O);
    if (x === null) return v({ kind: "failed", reason: "unreadable_ack" });
    return v({
      kind: "announced",
      status: x.status,
      ...(x.passthrough_declined !== void 0 && { passthroughDeclined: x.passthrough_declined }),
      workerEpoch: x.worker_epoch,
      protocolVersion: x.protocol_version,
      ignoredTools: x.ignored_tools ?? [],
      ...(x.passthrough_adopted !== void 0 && { passthroughAdopted: x.passthrough_adopted }),
      ...(x.worker_capabilities !== void 0 && { workerCapabilities: x.worker_capabilities }),
    });
  } catch (error) {
    return v((error instanceof AbortError ? u : void 0) ?? classifyAnnounceError(error));
  }
}
//@ chunk-mthxbav8.js:141993-142325 placement
function remoteToolsAnnounceRequest(e) {
  return {
    subtype: "remote_tools_announce",
    instance_id: e.instance_id,
    ...(e.worker_epoch !== void 0 && { worker_epoch: e.worker_epoch }),
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
function Ls(e) {
  return e.slice(0, 200).replace(/[^\x20-\x7e]/g, "?");
}
//@ chunk-mthxbav8.js:142391-142419 placement
var Ms = 4,
  or = 2000,
  sr = 1048576;
//@ chunk-mthxbav8.js:142419-142555 placement
function trimAnnounceBody(e) {
  if (e.passthrough.length === 0 || jsonStringify(remoteToolsAnnounceRequest(e)).length <= sr)
    return { body: e, trimmed: !1 };
  return { body: { ...e, passthrough: [] }, trimmed: !0 };
}
//@ chunk-mthxbav8.js:142555-142612 placement
function Ws(e) {
  let { passthroughAdopted: passthroughAdopted, ...r } = e;
  return r;
}
//@ chunk-mthxbav8.js:142612-142684 placement
var Us = 60000,
  qs = 6,
  kn = 3600000,
  rr = 1000,
  js = 6,
  Bs = 6,
  Gs = 60000,
  Vs = 5000,
  ir = 1500;
/**
 * 带退避重试的远程工具通告循环。
 */
//@ chunk-mthxbav8.js:142684-148048 placement
function createAnnounceLoop(e) {
  let n = (K) =>
      e.backoffMs !== void 0
        ? e.backoffMs[K]
        : K < Ms
          ? fullJitterBackoffMs({ baseMs: or, attempt: K, floorMs: (or * 2 ** K) / 2 })
          : void 0,
    r =
      e.setTimer ??
      ((K, re) => {
        let ne = setTimeout(K, re);
        return { clear: () => clearTimeout(ne) };
      }),
    s = !1,
    u = null,
    S = null,
    w = 0,
    h = null,
    v = null,
    y = null,
    C = !1,
    O,
    x = null,
    R = 0,
    j = 0,
    M = [],
    q = !1,
    T = [],
    P = null,
    L = !1,
    N = [],
    F = async (K) => {
      if (X(K) || K === "reconnected") j = 0;
      if (P !== null || e.hostAsleep?.() === !0) {
        S = Q(S, K);
        return;
      }
      let session = e.session(),
        build = e.build();
      if (session === null || build === void 0 || !e.workerLive()) {
        S = Q(S, K);
        return;
      }
      let { body: body, trimmed: trimmed } = trimAnnounceBody(build);
      if (trimmed && !C)
        ((C = !0),
          logFeatureSad("remote_tools_client_announce", "passthrough_over_frame"),
          logForDebugging(
            `[remoteToolsAnnounce] the announce with this machine's ${build.passthrough.length} MCP tools is larger than the worker reads (${sr} chars); announcing without them \u2014 they are not offered to this worker`,
            { level: "warn" },
          ));
      ((S = null), D());
      let { promise: promise, resolve: resolve } = Promise.withResolvers();
      ((u = { replace: resolve, reason: K }), (O = body));
      let V = q;
      if (((q = !1), K === "returned")) M.push((e.now ?? Date.now)());
      let te = await announceRemoteTools(session, body, {
        ...(e.signal && { signal: e.signal }),
        timeoutMs: $s,
        replaced: promise,
      });
      if (((u = null), te.kind === "failed" && V)) q = !0;
      if (s) return;
      let le = trimmed && te.kind === "announced" ? Ws(te) : te,
        ue = K === "returned",
        we = le.kind === "failed" && le.reason === "no_answer",
        Se = le.kind === "refused" && le.reason === UNVERIFIED_SENDER;
      j = !ue && (we || Se) ? j + 1 : 0;
      let he =
        ue && Se
          ? { kind: "failed", reason: UNVERIFIED_SENDER }
          : we && j > 1
            ? { kind: "refused", reason: "no_answer_parked" }
            : Se && j === 1
              ? { kind: "retry", reason: UNVERIFIED_SENDER }
              : le;
      (logForDebugging(
        `[remoteToolsAnnounce] ${K}: ${he.kind}${"reason" in he ? ` (${Ls(he.reason)})` : ""}`,
      ),
        e.onOutcome?.(he, K));
      let it = ue || (K === "retry" && L);
      if (((L = ue && he.kind === "retry" && he.reason === "stale_worker_epoch"), it && !L))
        if (he.kind === "announced") logFeatureOk("rtc_return_announce");
        else if (he.kind === "failed") {
          let reason = he.reason;
          if (ue && (reason === "post_failed" || reason === "post_lost")) M.pop();
          logFeatureSad(
            "rtc_return_announce",
            [...Ft, UNVERIFIED_SENDER].find((Wt) => Wt === reason) ?? "other",
          );
        } else logFeatureSad("rtc_return_announce", he.kind);
      switch (he.kind) {
        case "announced":
          (ee(), (R = 0));
          break;
        case "refused":
        case "unsupported":
          (ee(),
            (R = 0),
            (x = he.kind === "refused" && he.reason === "no_answer_parked" ? "silence" : "refusal"));
          break;
        case "retry":
          if ((he.reason === "stale_worker_epoch" && ++R === 1) || he.reason === UNVERIFIED_SENDER)
            S ??= "retry";
          else Y();
          break;
        case "failed":
          if (!ue) Y();
          break;
      }
      let Je = S;
      if (Je !== null) {
        if (((S = null), x === null || B(Je))) ((x = null), ee(), F(Je));
      }
    },
    X = (K) => K === "worker_init" || K === "tools_changed" || K === "worker_asked",
    B = (K) => X(K) || (x === "silence" && K === "reconnected"),
    Q = (K, re) => (K !== null && X(K) && !X(re) ? K : re),
    ee = () => {
      ((w = 0), h?.clear(), (h = null));
    },
    D = () => {
      (y?.clear(), (y = null), (v = null));
    },
    G = (K, re) => {
      if (v !== null && v.ms <= re) {
        v = { reason: Q(v.reason, K), ms: v.ms };
        return;
      }
      let ne = v?.reason ?? null;
      (D(),
        (v = { reason: Q(ne, K), ms: re }),
        (y = r(() => {
          let ae = v;
          if (((y = null), (v = null), ae !== null)) z.requestAnnounce(ae.reason);
        }, re)));
    },
    Y = () => {
      let K = h === null ? n(w) : void 0;
      if (K === void 0) return;
      ((w += 1),
        (h = r(() => {
          if (((h = null), !s)) F("retry");
        }, K)));
    },
    Z = async (K) => {
      let session = e.session(),
        ne = O === void 0 ? void 0 : (e.build() ?? O),
        workerLive = e.workerLive();
      if (session === null || ne === void 0 || (!workerLive && K === void 0)) return;
      let ie =
        K === void 0
          ? ne.host
          : { ...ne.host, capabilities: [leftStateFor(K), ...(ne.host.capabilities ?? [])] };
      await announceRemoteTools(
        session,
        {
          ...ne,
          ...(!workerLive && { worker_epoch: void 0 }),
          host: ie,
          tools: [],
          passthrough: [],
          plumbing: [],
        },
        { signal: AbortSignal.timeout(ir), timeoutMs: ir, answerExpected: !1 },
      );
    },
    z = {
      requestAnnounce(K, re) {
        if (s) return;
        if (re?.coalesceMs !== void 0 && re.coalesceMs > 0) {
          G(K, re.coalesceMs);
          return;
        }
        let ne = v === null ? K : Q(v.reason, K);
        if ((D(), B(ne))) x = null;
        if (((w = 0), x !== null)) return;
        if (ne === "returned" && !q) {
          let ae = (e.now ?? Date.now)();
          M = M.filter((ce) => ce <= ae && ae - ce < kn);
          let at = M.at(-1);
          if (M.length >= qs || (at !== void 0 && ae - at < Us)) {
            logFeatureSad("rtc_return_announce", "rate_limited");
            return;
          }
        }
        if ((h?.clear(), (h = null), u)) {
          if (((S = Q(S, ne)), ne === "tools_changed")) u.replace();
          return;
        }
        F(ne);
      },
      outstanding: () => (u !== null && u.reason !== "returned") || (S !== null && S !== "returned"),
      workerLive() {
        if (s || u || S === null || x !== null) return;
        let K = S;
        ((S = null), h?.clear(), (h = null), F(K));
      },
      async withdraw(K) {
        await z.disposeKeepingWithdraw(K)();
      },
      disposeKeepingWithdraw(K) {
        if (s) return () => Promise.resolve();
        return (z.dispose(), onceExport(() => Z(K)));
      },
      sayAsleep(K) {
        let session = e.session();
        if (s || session === null || O === void 0 || !e.workerLive()) return null;
        let ne = (e.now ?? Date.now)();
        if (((T = T.filter((oe) => oe <= ne && ne - oe < kn)), q || T.length >= js))
          return (logFeatureSad("rtc_sleep_notice", q ? "already_said" : "rate_limited"), null);
        ((q = !0), T.push(ne));
        let { posted: posted, response: response } = session.postControlRequest(
          remoteToolsAnnounceRequest({
            ...O,
            worker_epoch: K,
            host: { ...O.host, capabilities: [...(O.host.capabilities ?? []), MACHINE_PRESENCE_STATES] },
          }),
          { timeoutMs: rr, answerExpected: !1, background: !0 },
        );
        response.catch(() => {});
        let ce = withDeadline(
          posted.then(({ outcome: outcome }) => {
            if (outcome === "accepted") return (logFeatureOk("rtc_sleep_notice"), !0);
            return (logFeatureSad("rtc_sleep_notice", "post_failed"), (q = !1), T.pop(), !1);
          }),
          rr,
          (oe, V) => r(oe, V).clear,
        ).then((oe) => ((P = null), z.workerLive(), oe !== !1));
        return ((P = ce), ce);
      },
      sayStillHere(K) {
        let session = e.session();
        if (
          s ||
          session === null ||
          O === void 0 ||
          q ||
          P !== null ||
          e.hostAsleep?.() === !0 ||
          !e.workerLive()
        )
          return !1;
        let ne = (e.now ?? Date.now)();
        N = N.filter((oe) => oe <= ne && ne - oe < kn);
        let at = N.at(-1);
        if (N.length >= Bs || (at !== void 0 && ne - at < Gs)) return !1;
        N.push(ne);
        let { posted: posted, response: response } = session.postControlRequest(
          remoteToolsAnnounceRequest({
            ...O,
            passthrough: [],
            worker_epoch: K,
            host: { ...O.host, capabilities: [STILL_HERE, ...(O.host.capabilities ?? [])] },
          }),
          { timeoutMs: Vs, answerExpected: !1, background: !0 },
        );
        return (
          response.catch(() => {}),
          posted.then((oe) => {
            if (oe.outcome === "accepted") {
              logFeatureOk("rtc_still_here");
              return;
            }
            if (!(oe.outcome === "failed" && (oe.cause === "network" || oe.cause === "timeout")))
              N = N.filter((te) => te !== ne);
            if (oe.outcome !== "failed" || oe.cause !== "closed")
              logFeatureSad("rtc_still_here", "post_failed");
          }),
          !0
        );
      },
      dispose() {
        ((s = !0), h?.clear(), (h = null), D());
      },
    };
  return z;
}

export { startDeviceHookForwarding, UNVERIFIED_SENDER, Ft, createAnnounceLoop };
