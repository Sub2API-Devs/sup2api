/**
 * services/homeSeed/announce.ts
 *
 * 2.1.316 新增：home seed 公告与提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9x09krra.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { safeErrorName } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { joined, joined_6, joined_5 } from "../../utils/teleport/seedPaths.js";
import { parseHomeReadyRow, encodeHomeReadyRow } from "../../daemon/homeReady.js";
import { decodeHomePack } from "./homePack.js";
import {
  planHomeSeedApply,
  permissionsSchema,
  toStringArray,
  mergeRuleLists,
  MAX_RENDERED_SETTINGS_BYTES,
  renderSidecarPlan,
} from "./homeSidecar.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { classifyRowError } from "./destination.js";

//@ chunk-9x09krra.js:17333-17547 placement
var HOLD_MAX_MS = 300000;
var VERDICT_WAIT_MAX_MS = 60000;
var REQUEST_ATTEMPTS = 3;
var REQUEST_RETRY_DELAY_MS = 500;
var ANNOUNCE_POLL_MS = 2000;
var PERMISSIONS_FROM_ANY_PACK = true;
var ANNOUNCED_RULE_RE = /^[A-Za-z][A-Za-z0-9_*-]{0,127}(?:\([A-Za-z0-9 ._\-/:*~@+=,]{1,64}\))?$/;
var MAX_ANNOUNCED_RULES = 200;
var RESTORED_WITHOUT_ANNOUNCEMENT = "restored-without-announcement";
var INITIAL_ANNOUNCEMENT = {
  etag: "",
  beforeFirstCommand: true,
  ordinal: 0.5,
};
//@ chunk-9x09krra.js:17547-17611 placement
/**
 * 调用 enabledNow 判断是否当下启用（出错视为否）。
 */
function isEnabledNow(host) {
  try {
    return host.enabledNow?.() === true;
  } catch {
    return false;
  }
}
//@ chunk-9x09krra.js:17611-17705 placement
/**
 * 微任务里调用回调，出错时记诊断（不带 PII）。
 */
function runGuarded(fn, arg, eventName) {
  if (arg === undefined) return;
  queueMicrotask(() => {
    try {
      fn(arg);
    } catch {
      logForDiagnosticsNoPII("error", eventName, {});
    }
  });
}
//@ chunk-9x09krra.js:17705-33905 placement
/**
 * home seed 应用过程的用户提示状态机（外来文件替换、恢复提示、询问等）。
 */
function createHomeSeedAnnouncer(options, deps) {
  let verdict;
  let deaf = false;
  let deafReason;
  let stopped = false;
  let appliedListeners = new Set();
  let restoreListeners = new Set();
  let lastAppliedEvent;
  let lastRestoreEvent;
  let discardLogged = false;
  let lastAppliedGeneration = 0;
  let runCount = 0;
  let enabled = false;
  let enabledResolved = false;
  let latestAnnouncement;
  let runningAnnouncement;
  let runInFlight = false;
  let lastHandledOrdinal = 0;
  let readyWriteState;
  let restoredEtag;
  let readyWritePending = false;
  let sidecarSnapshot;
  let keepsForeignFiles = options.foreignFiles !== "replaced";
  let sidecarReadPromise;
  let readyEtag;
  let verdictsSubscribing = false;
  let firstAskSeen = false;
  let recoveryArmed = false;
  let announcementDecided = !deps.epochGt1;
  let provisionalRecovery = deps.epochGt1 && isEnabledNow(deps);
  let restoreStarted = false;
  let settingsGoneRetryArmed = false;
  let restoreFailureReason;
  let pendingRestoreResult;
  let runningAfterAnnounce = false;
  let sidecarState;
  let sidecarCountedAsAbsent = false;
  let sidecarReadStarted = false;
  let holdReleaseCallbacks = new Set();
  let notifyHoldWaiters = () => {
    for (let callback of [...holdReleaseCallbacks]) callback();
  };
  let goDeaf = (reason) => {
    if (!deaf) {
      deafReason = reason;
      if (latestAnnouncement !== undefined || runningAnnouncement !== undefined) logDiscarded();
    }
    deaf = true;
    latestAnnouncement = undefined;
    runningAnnouncement = undefined;
    if (recoveryArmed && !restoreStarted) recordFailure("lane_unavailable", 0, deps.now(), false);
    recoveryArmed = false;
    provisionalRecovery = false;
    announcementDecided = true;
    notifyHoldWaiters();
  };
  let logDiscarded = () => {
    if (!discardLogged) {
      discardLogged = true;
      logForDiagnosticsNoPII("info", "home_seed_announcement_discarded", {
        reason: deafReason ?? "stopped",
      });
    }
  };
  let latestPendingAnnouncement = () => {
    let filtered = [
      latestAnnouncement,
      runningAnnouncement,
      recoveryArmed || provisionalRecovery ? INITIAL_ANNOUNCEMENT : undefined,
    ].filter((candidate) => candidate !== undefined);
    return filtered.length === 0
      ? undefined
      : filtered.reduce((acc, best) => (best.ordinal > acc.ordinal ? best : acc));
  };
  function onAnnouncement(announcement) {
    if (deaf || stopped) {
      logDiscarded();
      return;
    }
    if (announcement.etag === latestAnnouncement?.etag || announcement.etag === runningAnnouncement?.etag)
      return;
    if (announcement.etag === restoredEtag) {
      if (sidecarSnapshot !== undefined && readyWriteState === undefined)
        readyWriteState = {
          etag: announcement.etag,
          ready: encodeRestoredReadyRow(sidecarSnapshot),
          readyWritten: false,
        };
      if (readyWriteState !== undefined && !readyWriteState.readyWritten)
        if (runInFlight || !enabled || verdict !== "served") readyWritePending = true;
        else writeReadyFromSidecar();
      return;
    }
    if (readyWriteState !== undefined && announcement.etag === readyWriteState.etag) {
      if (!readyWriteState.readyWritten)
        if (runInFlight) readyWritePending = true;
        else writeReadyFromSidecar();
      return;
    }
    latestAnnouncement = announcement;
    if (deps.epochGt1 && !sidecarReadStarted) {
      sidecarReadStarted = true;
      let startedAt = deps.now();
      sidecarReadPromise ??= deps.readSidecar(options.configHome).catch(() => null);
      sidecarReadPromise.then((sidecar) => {
        adoptSidecarApplied(sidecar, startedAt);
      });
    }
    if (verdict === "served") runApply(false);
  }
  function adoptSidecarApplied(sidecar, startedAt) {
    if (
      sidecar === null ||
      sidecar.packEtag === undefined ||
      sidecar.packEtag === RESTORED_WITHOUT_ANNOUNCEMENT ||
      latestAnnouncement?.etag !== sidecar.packEtag ||
      readyWriteState !== undefined ||
      restoredEtag !== undefined
    )
      return;
    restoredEtag = sidecar.packEtag;
    sidecarSnapshot = sidecar;
    latestAnnouncement = undefined;
    disarmRecovery();
    reportApplyTelemetry("already_applied", "none", null, sidecar.generation, startedAt);
    notifyHoldWaiters();
  }
  function onVerdict(nextVerdict, hadVerdict) {
    if (deaf || stopped) return;
    verdict = nextVerdict;
    if (nextVerdict === "served") {
      if (latestAnnouncement !== undefined) runApply(!hadVerdict);
      else if (readyWritePending) resumePendingWork();
      else {
        startRecovery(!hadVerdict);
        maybeCheckSettingsGone(hadVerdict);
      }
      return;
    }
    goDeaf(nextVerdict === "off" ? "verdict_off" : "verdict_refused");
  }
  function armProvisionalRecovery() {
    if (!announcementDecided && enabled && sidecarState === "absent" && !deaf && !stopped) {
      announcementDecided = true;
      recoveryArmed = true;
      provisionalRecovery = false;
    }
  }
  function startRecovery(probeFirst = false) {
    armProvisionalRecovery();
    if (!recoveryArmed || verdict !== "served" || runInFlight || deaf || stopped) return;
    runInFlight = true;
    restoreStarted = true;
    let startedAt = deps.now();
    runRecovery(!probeFirst, startedAt)
      .catch((error) => {
        logForDiagnosticsNoPII("error", "home_seed_recovery_threw", {
          name: safeErrorName(error),
        });
        reportRecoveryTelemetry("threw", 0, startedAt);
      })
      .finally(() => {
        runInFlight = false;
        recoveryArmed = false;
        notifyHoldWaiters();
        resumePendingWork();
        if (runningAnnouncement === undefined || firstAskSeen) flushRestoreResult();
      });
  }
  async function runRecovery(probeFirst, startedAt) {
    runCount++;
    if (probeFirst) {
      let row = await deps.getRow(joined);
      if (isGateClosed(startedAt)) return;
      if (row.kind !== "ok" && row.kind !== "not_found") {
        let failureKind = classifyRowFailure(row);
        if (failureKind === "refused" || failureKind === "rejected") goDeaf("probe_refused");
        recordFailure(
          failureKind === "auth" ? "auth_failed" : "request_failed",
          0,
          startedAt,
          failureKind === "auth",
        );
        return;
      }
    }
    let row = await deps.getRow(joined_6);
    if (isGateClosed(startedAt)) return;
    if (row.kind !== "ok") {
      if (row.kind === "not_found") recordFailure("no_ready_row", 0, startedAt, false);
      else {
        let failureKind = classifyRowFailure(row);
        if (failureKind === "refused") goDeaf("ready_refused");
        recordFailure(
          failureKind === "auth" ? "auth_failed" : "request_failed",
          0,
          startedAt,
          failureKind === "auth",
        );
      }
      return;
    }
    let homeReadyRow = parseHomeReadyRow(row.buf);
    if (!homeReadyRow.ok) {
      recordFailure("ready_unreadable", 0, startedAt, true);
      return;
    }
    let generation = homeReadyRow.ready.generation;
    let row_2 = await deps.getRow(joined_5);
    if (isGateClosed(startedAt)) return;
    if (row_2.kind !== "ok") {
      let failureKind = row_2.kind === "not_found" ? "not_found" : classifyRowFailure(row_2);
      if (failureKind === "refused") goDeaf("pack_refused");
      recordFailure(
        failureKind === "not_found"
          ? "pack_absent"
          : failureKind === "auth"
            ? "auth_failed"
            : "request_failed",
        generation,
        startedAt,
        true,
      );
      return;
    }
    let decodedPack = decodeHomePack(row_2.buf);
    if (!decodedPack.ok) {
      logForDiagnosticsNoPII("warn", "home_seed_bad_pack", {
        reason: decodedPack.reason,
      });
      recordFailure("pack_unreadable", generation, startedAt, true);
      return;
    }
    if (decodedPack.pack.generation !== generation) {
      recordFailure("generation_mismatch", generation, startedAt, true);
      return;
    }
    let applyPlan = planHomeSeedApply({
      pack: decodedPack.pack,
      packEtag: RESTORED_WITHOUT_ANNOUNCEMENT,
      refused: decodedPack.refused,
      sidecar: null,
      lastAppliedGeneration: 0,
      permissionsAdmissible: false,
      onlyClaudeMd: options.onlyClaudeMd === true,
    });
    if (applyPlan.kind === "stale_generation") {
      recordFailure("generation_mismatch", generation, startedAt, true);
      return;
    }
    if (decodedPack.refused.settings !== "none") {
      recordFailure("settings_refused", generation, startedAt, true);
      return;
    }
    let announcableRules = collectAnnouncableRules(applyPlan.plan, decodedPack.pack.settings);
    if (announcableRules.deny.length === 0 && announcableRules.ask.length === 0) {
      if (announcableRules.dropped > 0)
        recordFailure("rules_unverifiable", generation, startedAt, true, announcableRules.dropped);
      else recordFailure("no_rules", generation, startedAt, false);
      return;
    }
    if (options.settingsPath === undefined) {
      recordFailure("no_rules", generation, startedAt, false);
      return;
    }
    let standingSettings = await deps.readStandingSettings(options.settingsPath).catch(() => ({
      kind: "unusable",
    }));
    if (isGateClosed(startedAt)) return;
    let mergedPlan =
      standingSettings.kind === "unusable"
        ? null
        : mergeRulesIntoPlan(applyPlan.plan, announcableRules, standingSettings);
    if (mergedPlan === null) {
      recordFailure("settings_unusable", generation, startedAt, true);
      return;
    }
    let applyReport = await deps.execute(mergedPlan, options, deps.applyDeps());
    let beforeFirstAsk = !firstAskSeen;
    if (applyReport.outcome === "config_home_unsafe" || applyReport.outcome === "flag_off") {
      reportApplyTelemetry(applyReport.outcome, "recovery", applyReport, applyReport.generation, startedAt);
      recordFailure("nothing_applied", generation, startedAt, false);
      return;
    }
    if (!applyReport.settingsWritten) {
      reportApplyTelemetry(applyReport.outcome, "recovery", applyReport, applyReport.generation, startedAt);
      recordFailure("nothing_applied", generation, startedAt, true);
      return;
    }
    try {
      deps.afterApply(
        applyReport,
        {
          beforeFirstAsk,
          applied: summarizeApplied(mergedPlan, applyReport),
        },
        false,
      );
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_after_apply_threw", {});
    }
    pendingRestoreResult = {
      kind: "restored",
      denyRules: announcableRules.deny.length,
      askRules: announcableRules.ask.length,
      droppedRules: announcableRules.dropped,
      beforeFirstAsk,
      duringHold: holdReleaseCallbacks.size > 0,
      keepsForeignFiles,
    };
    reportApplyTelemetry(applyReport.outcome, "recovery", applyReport, applyReport.generation, startedAt);
    reportRecoveryTelemetry("restored", generation, startedAt, announcableRules.dropped);
  }
  function collectAnnouncableRules(plan, settings) {
    let permissions = plan.settings?.document.permissions;
    let filterRules = (rules) =>
      (rules ?? []).filter((rule) => ANNOUNCED_RULE_RE.test(rule)).slice(0, MAX_ANNOUNCED_RULES);
    let denyRules = filterRules(permissions?.deny);
    let askRules = filterRules(permissions?.ask);
    let parsedPermissions = permissionsSchema().safeParse(settings?.permissions);
    let countRules = (ruleKind) =>
      parsedPermissions.success
        ? normalizeCaseForComparison_2(toStringArray(parsedPermissions.data[ruleKind])).length
        : 0;
    let dropped = Math.max(0, countRules("deny") + countRules("ask") - denyRules.length - askRules.length);
    return {
      deny: denyRules,
      ask: askRules,
      dropped,
    };
  }
  function mergeRulesIntoPlan(plan, rules, standingRow) {
    let standingSettings = standingRow.kind === "object" ? standingRow.value : {};
    let permissionsResult = permissionsSchema().safeParse(standingSettings.permissions);
    if (
      standingSettings.permissions !== undefined &&
      standingSettings.permissions !== null &&
      !permissionsResult.success
    )
      return null;
    let permissions = permissionsResult.success ? permissionsResult.data : {};
    let denyRules = mergeRuleLists(toStringArray(permissions.deny), rules.deny);
    let askRules = mergeRuleLists(toStringArray(permissions.ask), rules.ask);
    let nextDocument = {
      ...standingSettings,
      permissions: {
        ...permissions,
        ...(denyRules.length > 0 && {
          deny: denyRules,
        }),
        ...(askRules.length > 0 && {
          ask: askRules,
        }),
      },
    };
    let rendered =
      jsonStringify(nextDocument, null, 2) +
      `
`;
    if (Buffer.byteLength(rendered) > MAX_RENDERED_SETTINGS_BYTES) return null;
    return {
      ...plan,
      writes: [],
      removals: [],
      counts: {
        ...plan.counts,
        refilteredCredentialFiles: 0,
      },
      restoreRecord: true,
      settings: {
        document: {
          permissions: {
            ...(rules.deny.length > 0 && {
              deny: [...rules.deny],
            }),
            ...(rules.ask.length > 0 && {
              ask: [...rules.ask],
            }),
          },
        },
        rendered,
        sha256: computeContentHash(rendered),
      },
    };
  }
  function classifyRowFailure(row) {
    let failureKind = classifyRowError(row);
    logForDiagnosticsNoPII("warn", "home_seed_lane_request_failed", {
      outcome: failureKind,
      kind: row.errorKind,
      status: row.status ?? 0,
    });
    return failureKind;
  }
  function isGateClosed(startedAt) {
    if (deaf || stopped) {
      reportRecoveryTelemetry("gate_closed", 0, startedAt);
      return true;
    }
    return false;
  }
  function disarmRecovery() {
    if (recoveryArmed) {
      recoveryArmed = false;
      reportRecoveryTelemetry("superseded", 0, deps.now());
    }
    announcementDecided = true;
    provisionalRecovery = false;
  }
  function recordFailure(outcome, generation, startedAt, reportable, dropped = 0) {
    recoveryArmed = false;
    reportRecoveryTelemetry(outcome, generation, startedAt, dropped);
    if (reportable && isNotRestoredReason(outcome))
      pendingRestoreResult = {
        kind: "not_restored",
        reason: outcome,
        keepsForeignFiles,
      };
  }
  function flushRestoreResult() {
    let restoreResult = pendingRestoreResult;
    pendingRestoreResult = undefined;
    if (restoreResult !== undefined) dispatchApplyResult(restoreResult);
  }
  let hasPendingAnnouncement = () =>
    latestAnnouncement !== undefined ||
    runningAnnouncement !== undefined ||
    readyWriteState !== undefined ||
    restoredEtag !== undefined;
  function maybeCheckSettingsGone(probeFirst = true) {
    if (
      !settingsGoneRetryArmed ||
      !firstAskSeen ||
      verdict !== "served" ||
      deaf ||
      stopped ||
      hasPendingAnnouncement()
    )
      return;
    settingsGoneRetryArmed = false;
    let startedAt = deps.now();
    runSettingsGoneCheck(probeFirst, startedAt).catch((error) => {
      logForDiagnosticsNoPII("error", "home_seed_recovery_threw", {
        name: safeErrorName(error),
      });
      reportRecoveryTelemetry("threw", 0, startedAt);
    });
  }
  async function runSettingsGoneCheck(probeFirst, startedAt) {
    let onFailure = (row) => {
      recordFailure(
        classifyRowFailure(row) === "auth" ? "auth_failed" : "request_failed",
        0,
        startedAt,
        false,
      );
      settingsGoneRetryArmed = true;
    };
    if (probeFirst) {
      let row = await deps.getRow(joined);
      if (isGateClosed(startedAt)) return;
      if (row.kind !== "ok" && row.kind !== "not_found") {
        onFailure(row);
        return;
      }
    }
    let row = await deps.getRow(joined_6);
    if (isGateClosed(startedAt)) return;
    if (hasPendingAnnouncement()) {
      settingsGoneRetryArmed = true;
      return;
    }
    if (row.kind === "not_found") {
      recordFailure("no_ready_row", 0, startedAt, false);
      return;
    }
    if (row.kind !== "ok") {
      onFailure(row);
      return;
    }
    recordFailure("settings_gone", 0, startedAt, true);
    flushRestoreResult();
  }
  function isNotRestoredReason(reason) {
    return (
      reason === "ready_unreadable" ||
      reason === "rules_unverifiable" ||
      reason === "settings_refused" ||
      reason === "auth_failed" ||
      reason === "pack_absent" ||
      reason === "pack_unreadable" ||
      reason === "generation_mismatch" ||
      reason === "request_failed" ||
      reason === "settings_unusable" ||
      reason === "nothing_applied" ||
      reason === "settings_gone"
    );
  }
  function reportRecoveryTelemetry(outcome, generation, startedAt, rulesDropped = 0) {
    try {
      deps.telemetry.recovery({
        outcome,
        generation,
        durationMs: deps.now() - startedAt,
        rulesDropped,
        afterAnnouncedRun: runningAfterAnnounce,
        sidecarCountedAsAbsent,
      });
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_telemetry_threw", {});
    }
  }
  function dispatchApplyResult(result) {
    let callListeners = (listeners, payload, logEventName) => {
      for (let listener of listeners)
        try {
          listener(payload);
        } catch {
          logForDiagnosticsNoPII("error", logEventName, {});
        }
    };
    if (result.kind === "restored" || result.kind === "not_restored") {
      lastRestoreEvent = restoreListeners.size === 0 ? result : undefined;
      if (result.kind === "not_restored" && restoreListeners.size > 0) restoreFailureReason = result.reason;
      callListeners(restoreListeners, result, "home_seed_restore_listener_threw");
    } else {
      lastAppliedEvent = appliedListeners.size === 0 ? result : undefined;
      callListeners(appliedListeners, result, "home_seed_applied_listener_threw");
    }
  }
  function runApply(probeFirst) {
    if (!enabled || runInFlight || latestAnnouncement === undefined || deaf || stopped) return;
    if (runningAfterAnnounce && !announcementDecided) return;
    runInFlight = true;
    runApplyFromAnnouncement(probeFirst)
      .catch((error) => {
        logForDiagnosticsNoPII("error", "home_seed_run_threw", {
          name: safeErrorName(error),
        });
      })
      .finally(() => {
        runInFlight = false;
        runningAnnouncement = undefined;
        flushRestoreResult();
        notifyHoldWaiters();
        resumePendingWork();
        maybeCheckSettingsGone();
      });
  }
  function resumePendingWork() {
    startRecovery();
    if (runInFlight) return;
    if (latestAnnouncement !== undefined && verdict === "served") {
      runApply(false);
      if (runInFlight) readyWritePending = false;
      return;
    }
    if (!readyWritePending) return;
    if (readyWriteState === undefined || readyWriteState.readyWritten) {
      readyWritePending = false;
      return;
    }
    writeReadyFromSidecar();
    if (runInFlight) readyWritePending = false;
  }
  function writeReadyFromSidecar() {
    if (readyWriteState === undefined || runInFlight || deaf || stopped || !enabled || verdict !== "served")
      return;
    let state = readyWriteState;
    runInFlight = true;
    writeReadyRowWithRetry(state.ready)
      .then((ok) => {
        if (ok) state.readyWritten = true;
      })
      .catch((error) => {
        logForDiagnosticsNoPII("error", "home_seed_run_threw", {
          name: safeErrorName(error),
        });
      })
      .finally(() => {
        runInFlight = false;
        notifyHoldWaiters();
        resumePendingWork();
      });
  }
  async function runApplyFromAnnouncement(probeFirst) {
    let startedAt = deps.now();
    let announcement = latestAnnouncement;
    if (announcement === undefined) return;
    latestAnnouncement = undefined;
    if (readyWriteState !== undefined && announcement.etag === readyWriteState.etag) {
      if (!readyWriteState.readyWritten)
        readyWriteState.readyWritten = await writeReadyRowWithRetry(readyWriteState.ready);
      return;
    }
    if (announcement.etag === restoredEtag) return;
    runningAnnouncement = announcement;
    runningAfterAnnounce = true;
    runCount++;
    if (deps.epochGt1 && readyWriteState === undefined && restoredEtag === undefined) {
      let sidecarState = await (sidecarReadPromise ?? deps.readSidecar(options.configHome));
      if (
        sidecarState?.packEtag === announcement.etag &&
        announcement.etag !== RESTORED_WITHOUT_ANNOUNCEMENT
      ) {
        restoredEtag = announcement.etag;
        sidecarSnapshot = sidecarState;
        disarmRecovery();
        reportApplyTelemetry("already_applied", "none", null, sidecarState.generation, startedAt);
        return;
      }
    }
    let probeLabel = "verdict_wake";
    if (!probeFirst) {
      let laneResult = await readRowWithRetry(joined);
      if (laneResult.kind === "deaf") return;
      probeLabel = probeKindToLabel(laneResult.kind);
      if (laneResult.kind === "refused" || laneResult.kind === "rejected") {
        reportApplyTelemetry("refused_lane", probeLabel, null, 0, startedAt);
        goDeaf("probe_refused");
        return;
      }
      if (laneResult.kind === "auth" || laneResult.kind === "transport") {
        reportApplyTelemetry(
          laneResult.kind === "auth" ? "auth_skipped" : "transport_failed",
          probeLabel,
          null,
          0,
          startedAt,
        );
        return;
      }
    }
    let packRow = await readRowWithRetry(joined_5);
    switch (packRow.kind) {
      case "deaf":
        return;
      case "refused":
        reportApplyTelemetry("refused_lane", probeLabel, null, 0, startedAt);
        goDeaf("pack_refused");
        return;
      case "rejected":
        reportApplyTelemetry("request_rejected", probeLabel, null, 0, startedAt);
        return;
      case "auth":
      case "transport":
        reportApplyTelemetry(
          packRow.kind === "auth" ? "auth_skipped" : "transport_failed",
          probeLabel,
          null,
          0,
          startedAt,
        );
        return;
      case "not_found":
        reportApplyTelemetry("pack_absent", probeLabel, null, 0, startedAt);
        return;
      case "ok":
        break;
    }
    let last = deps.announcements.remembered().findLast((remembered) => remembered.etag === packRow.etag);
    if (last === undefined) {
      reportApplyTelemetry("unannounced_row", probeLabel, null, 0, startedAt);
      return;
    }
    let decodedPack = decodeHomePack(packRow.buf);
    if (!decodedPack.ok) {
      logForDiagnosticsNoPII("warn", "home_seed_bad_pack", {
        reason: decodedPack.reason,
      });
      reportApplyTelemetry("bad_pack", probeLabel, null, 0, startedAt);
      return;
    }
    let applyPlan = planHomeSeedApply({
      pack: decodedPack.pack,
      packEtag: packRow.etag,
      refused: decodedPack.refused,
      sidecar: await deps.readSidecar(options.configHome),
      lastAppliedGeneration,
      permissionsAdmissible:
        deps.limits.permissionsFromAnyAnnouncedPack || (last.beforeFirstCommand && !deps.epochGt1),
      onlyClaudeMd: options.onlyClaudeMd === true,
    });
    if (applyPlan.kind === "stale_generation") {
      reportApplyTelemetry("stale_generation", probeLabel, null, applyPlan.generation, startedAt);
      return;
    }
    let announcableRules =
      options.foreignFiles !== "replaced" && options.onlyClaudeMd !== true
        ? collectAnnouncableRules(applyPlan.plan, decodedPack.pack.settings)
        : null;
    let planWithRestrictions =
      announcableRules === null
        ? applyPlan.plan
        : {
            ...applyPlan.plan,
            restrictingSettings: {
              plan:
                announcableRules.deny.length === 0 && announcableRules.ask.length === 0
                  ? null
                  : renderSidecarPlan({
                      permissions: {
                        ...(announcableRules.deny.length > 0 && {
                          deny: [...announcableRules.deny],
                        }),
                        ...(announcableRules.ask.length > 0 && {
                          ask: [...announcableRules.ask],
                        }),
                      },
                    }),
              rulesLeftOut: announcableRules.dropped,
            },
          };
    let applyReport = await deps.execute(planWithRestrictions, options, deps.applyDeps());
    let appliedBeforeFirstAsk = !firstAskSeen;
    if (applyReport.outcome === "config_home_unsafe" || applyReport.outcome === "flag_off") {
      reportApplyTelemetry(applyReport.outcome, probeLabel, applyReport, applyReport.generation, startedAt);
      return;
    }
    lastAppliedGeneration = applyReport.generation;
    let appliedEvents = {
      beforeFirstAsk: appliedBeforeFirstAsk,
      applied: summarizeApplied(planWithRestrictions, applyReport),
    };
    try {
      deps.afterApply(applyReport, appliedEvents, appliedBeforeFirstAsk && !deps.epochGt1);
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_after_apply_threw", {});
    }
    disarmRecovery();
    let noticeSuperseded =
      applyReport.settingsWritten && (pendingRestoreResult ?? lastRestoreEvent) !== undefined;
    if (noticeSuperseded) {
      pendingRestoreResult = undefined;
      lastRestoreEvent = undefined;
    }
    flushRestoreResult();
    let duringHold = holdReleaseCallbacks.size > 0;
    let outputStyleCheck = await checkOutputStyle(planWithRestrictions, applyReport);
    let answersNotRestored =
      restoreFailureReason !== undefined &&
      (restoreFailureReason === "settings_gone" || applyReport.settingsWritten);
    dispatchApplyResult({
      ...appliedEvents,
      outcome: applyReport.outcome,
      generation: applyReport.generation,
      duringHold: duringHold || holdReleaseCallbacks.size > 0,
      outputStyleMissing: outputStyleCheck === "unresolved",
      answersNotRestored,
    });
    if (answersNotRestored && applyReport.outcome === "applied") restoreFailureReason = undefined;
    reportApplyTelemetry(applyReport.outcome, probeLabel, applyReport, applyReport.generation, startedAt, {
      appliedBeforeFirstAsk,
      outputStyleCheck,
      restoreNoticeSuperseded: noticeSuperseded,
      answersNotRestored,
    });
    let appliedReadyRow = encodeAppliedReadyRow(applyReport, appliedBeforeFirstAsk);
    let readyWriteState2 = {
      etag: packRow.etag,
      ready: appliedReadyRow,
      readyWritten: false,
    };
    readyWriteState = readyWriteState2;
    runningAnnouncement = undefined;
    notifyHoldWaiters();
    readyWriteState2.readyWritten = await writeReadyRowWithRetry(appliedReadyRow);
  }
  function appliedSettingsDocument(plan, report) {
    if (!report.settingsWritten) return;
    return (report.settingsKeptForeign ? plan.restrictingSettings?.plan : plan.settings)?.document;
  }
  function summarizeApplied(plan, report) {
    let settingsDocument = appliedSettingsDocument(plan, report);
    let permissions = settingsDocument?.permissions;
    return {
      claudeMd: report.appliedByKind.claude_md > 0,
      rules: report.appliedByKind.rule,
      outputStyles: report.appliedByKind.output_style,
      permissionRules:
        (permissions?.allow?.length ?? 0) +
        (permissions?.deny?.length ?? 0) +
        (permissions?.ask?.length ?? 0),
      settingsKeys: Object.keys(settingsDocument ?? {}).filter((key) => key !== "permissions"),
      settingsNotWritten: report.settingsAttempted && !report.settingsWritten && !report.settingsKeptForeign,
      settingsRefused: report.settingsRefused !== "none" && !report.settingsKeptForeign,
      settingsKeptForeign: report.settingsKeptForeign,
      credentialRestrictionsLeftOut: report.refilteredCredentialRestrictions,
      rulesLeftOut: Math.max(0, report.rulesLeftOut - report.refilteredCredentialRestrictions),
      credentialFilesLeftOut: report.filesRefused.credential,
      filesKeptForeign: report.filesRefused.keptForeign,
      filesNotApplied:
        Object.values(report.filesRefused).reduce((acc, count) => acc + count, 0) -
        report.filesRefused.credential -
        report.filesRefused.keptForeign +
        report.filesFailed,
      filesRemoved: report.filesRemoved,
      settingsRemoved: report.settingsRemoved,
      removalsFailed: report.removalsFailed,
      settingsRemoveFailed: report.settingsRemoveFailed,
    };
  }
  async function checkOutputStyle(plan, report) {
    let outputStyle = appliedSettingsDocument(plan, report)?.outputStyle;
    let outputStyleAvailable = deps.outputStyleAvailable;
    if (outputStyle === undefined || outputStyleAvailable === undefined) return "not_asked";
    let promise = await new Promise((resolve) => {
      let timer = deps.setTimer(() => resolve("ask_capped"), ANNOUNCE_POLL_MS);
      Promise.resolve()
        .then(() => outputStyleAvailable(outputStyle))
        .then(
          (available) => (available ? "available" : "unresolved"),
          () => "ask_failed",
        )
        .then((result) => {
          timer();
          resolve(result);
        });
    });
    if (promise === "unresolved") logForDiagnosticsNoPII("info", "home_seed_output_style_unresolved", {});
    return promise;
  }
  function probeKindToLabel(kind) {
    switch (kind) {
      case "ok":
        return "found";
      case "not_found":
        return "absent";
      case "refused":
      case "rejected":
        return "refused";
      case "auth":
      case "transport":
        return kind;
    }
  }
  function reportApplyTelemetry(
    outcome,
    probe,
    report,
    generation,
    startedAt,
    extraFields = {
      appliedBeforeFirstAsk: !firstAskSeen,
      outputStyleCheck: "not_asked",
      restoreNoticeSuperseded: false,
      answersNotRestored: false,
    },
  ) {
    try {
      deps.telemetry.apply({
        outcome,
        probe,
        report,
        generation,
        epochGt1: deps.epochGt1,
        durationMs: deps.now() - startedAt,
        ...extraFields,
      });
    } catch {
      logForDiagnosticsNoPII("error", "home_seed_telemetry_threw", {});
    }
  }
  async function readRowWithRetry(key) {
    let requestRetryDelayMs = deps.limits.requestRetryDelayMs;
    for (let j = 1; ; j++) {
      if (deaf || stopped)
        return {
          kind: "deaf",
        };
      let row = await deps.getRow(key);
      if (row.kind === "ok")
        return {
          kind: "ok",
          buf: row.buf,
          etag: row.content_sha256,
        };
      if (row.kind === "not_found")
        return {
          kind: "not_found",
        };
      let failureKind = classifyRowError(row);
      if (failureKind !== "transport" || j >= deps.limits.requestAttempts) {
        logForDiagnosticsNoPII("warn", "home_seed_lane_request_failed", {
          outcome: failureKind,
          kind: row.errorKind,
          status: row.status ?? 0,
        });
        return {
          kind: failureKind,
        };
      }
      await deps.sleep(requestRetryDelayMs);
      requestRetryDelayMs *= 2;
    }
  }
  async function writeReadyRowWithRetry(row) {
    let requestRetryDelayMs = deps.limits.requestRetryDelayMs;
    let sawConflict = false;
    for (let j = 1; ; j++) {
      if (deaf || stopped) return false;
      let putResult = await deps.putRow(joined_6, row, readyEtag);
      if (putResult.kind === "ok") {
        readyEtag = putResult.content_sha256;
        return true;
      }
      if (putResult.kind === "conflict" && !sawConflict) {
        sawConflict = true;
        if (deaf || stopped) return false;
        let row = await deps.getRow(joined_6);
        readyEtag = row.kind === "ok" ? row.content_sha256 : undefined;
        continue;
      }
      if (
        !(putResult.kind === "error" && classifyRowError(putResult) === "transport") ||
        j >= deps.limits.requestAttempts
      ) {
        logForDiagnosticsNoPII("warn", "home_seed_ready_put_failed", {
          kind: putResult.kind,
          ...(putResult.kind === "error" && {
            errorKind: putResult.errorKind,
            status: putResult.status ?? 0,
          }),
        });
        return false;
      }
      await deps.sleep(requestRetryDelayMs);
      requestRetryDelayMs *= 2;
    }
  }
  function encodeRestoredReadyRow(snapshot) {
    return encodeHomeReadyRow({
      generation: snapshot.generation,
      appliedBeforeFirstAsk: false,
      outcome: "applied",
      filesApplied: snapshot.entries.length,
      filesRefused: 0,
      settingsWritten: snapshot.settingsSha256 !== null,
      replacedForeign: 0,
      writtenAtMs: deps.now(),
    });
  }
  function encodeAppliedReadyRow(report, appliedBeforeFirstAsk) {
    return encodeHomeReadyRow({
      generation: report.generation,
      appliedBeforeFirstAsk,
      outcome: report.outcome === "applied" ? "applied" : "partial",
      filesApplied: report.filesApplied,
      filesRefused:
        Object.values(report.filesRefused).reduce((acc, count) => acc + count, 0) + report.filesFailed,
      settingsWritten: report.settingsWritten && report.settingsAttempted,
      replacedForeign: report.filesReplacedForeign + (report.replacedExistingSettings === "foreign" ? 1 : 0),
      writtenAtMs: deps.now(),
    });
  }
  function holdBeforeTurn(signal) {
    let startedAt = deps.now();
    let firstAsk = !firstAskSeen;
    let pendingAnnouncement = () => {
      let candidate = deaf || stopped ? undefined : latestPendingAnnouncement();
      return candidate !== undefined && candidate.ordinal > lastHandledOrdinal ? candidate : undefined;
    };
    if (pendingAnnouncement() === undefined || deps.limits.holdMaxMs <= 0) {
      firstAskSeen = true;
      maybeCheckSettingsGone();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let released = false;
      let verdictWaitMs = 0;
      let verdictResolved = verdict !== undefined && enabledResolved;
      let cleanupFns = [];
      let release = (outcome) => {
        if (released) return;
        released = true;
        for (let cleanup of cleanupFns) cleanup();
        holdReleaseCallbacks.delete(onVerdictChange);
        if (outcome !== "released" && outcome !== "gate_off")
          lastHandledOrdinal = Math.max(lastHandledOrdinal, latestPendingAnnouncement()?.ordinal ?? 0);
        firstAskSeen = true;
        maybeCheckSettingsGone();
        resolve();
        try {
          deps.telemetry.hold({
            outcome,
            waitedMs: deps.now() - startedAt,
            verdictWaitMs,
            firstAsk,
          });
        } catch {
          logForDiagnosticsNoPII("error", "home_seed_telemetry_threw", {});
        }
      };
      let onVerdictChange = () => {
        if (!verdictResolved && verdict !== undefined && enabledResolved) {
          verdictResolved = true;
          verdictWaitMs = deps.now() - startedAt;
          clearVerdictTimer();
        }
        if (deaf || stopped) release("gate_off");
        else if (pendingAnnouncement() === undefined) release("released");
      };
      let clearVerdictTimer = () => {};
      if (signal.aborted) {
        release("interrupted");
        return;
      }
      holdReleaseCallbacks.add(onVerdictChange);
      cleanupFns.push(deps.setTimer(() => release("timeout"), deps.limits.holdMaxMs));
      if (!verdictResolved) {
        clearVerdictTimer = deps.setTimer(() => {
          verdictWaitMs = deps.now() - startedAt;
          if (verdict === undefined) release("verdict_timeout");
          else if (!enabledResolved) release("flag_timeout");
        }, deps.limits.verdictWaitMaxMs);
        cleanupFns.push(() => clearVerdictTimer());
      }
      let onAbort = () => release("interrupted");
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
      cleanupFns.push(() => signal.removeEventListener("abort", onAbort));
    });
  }
  let enabledPromise;
  try {
    enabledPromise = deps.enabled();
  } catch {
    enabledPromise = Promise.resolve(false);
  }
  let restoreBlockedByFlag = false;
  let checkRestoreGate = () => {
    if (restoreBlockedByFlag && sidecarState === "absent") {
      restoreBlockedByFlag = false;
      reportRecoveryTelemetry("restore_gate_off", 0, deps.now());
      settingsGoneRetryArmed = true;
      maybeCheckSettingsGone();
    }
  };
  enabledPromise
    .then(
      (flagValue) => {
        enabledResolved = true;
        if (flagValue === true || flagValue === "announced_only") {
          enabled = true;
          restoreBlockedByFlag = deps.epochGt1 && flagValue !== true;
          announcementDecided ||= flagValue !== true;
          checkRestoreGate();
          provisionalRecovery = !announcementDecided;
          refreshSidecarState();
          armProvisionalRecovery();
          if (latestAnnouncement !== undefined && verdict === "served") runApply(false);
          else if (readyWritePending) resumePendingWork();
          else startRecovery();
          return;
        }
        goDeaf("flag_off");
      },
      () => {
        enabledResolved = true;
        goDeaf("flag_off");
      },
    )
    .finally(notifyHoldWaiters);
  let sidecarRefreshStarted = false;
  let refreshSidecarState = () => {
    if (sidecarRefreshStarted || !deps.epochGt1) return;
    sidecarRefreshStarted = true;
    deps
      .sidecarState(options.configHome)
      .then(async (state) => {
        sidecarCountedAsAbsent =
          state === "valid" &&
          options.foreignFiles !== "replaced" &&
          (await deps.readSidecar(options.configHome))?.settingsSha256 === null;
        return sidecarCountedAsAbsent ? "absent" : state;
      })
      .catch(() => "invalid")
      .then((state) => {
        sidecarState = state;
        checkRestoreGate();
        if (state !== "absent") {
          if (state === "invalid" && (!announcementDecided || restoreBlockedByFlag))
            reportRecoveryTelemetry("sidecar_invalid", 0, deps.now());
          announcementDecided = true;
          provisionalRecovery = false;
        }
        resumePendingWork();
        notifyHoldWaiters();
      });
  };
  if (provisionalRecovery) refreshSidecarState();
  for (let remembered of deps.announcements.remembered()) onAnnouncement(remembered);
  let unsubscribeAnnouncements = deps.announcements.subscribe((announcement) => {
    queueMicrotask(() => {
      onAnnouncement(announcement);
      notifyHoldWaiters();
    });
  });
  let unsubscribeVerdicts = () => {};
  verdictsSubscribing = true;
  try {
    unsubscribeVerdicts = deps.verdicts.subscribe((verdictValue) => {
      let hadVerdict = verdictsSubscribing;
      queueMicrotask(() => {
        onVerdict(verdictValue, hadVerdict);
        notifyHoldWaiters();
      });
    });
  } catch {
    logForDiagnosticsNoPII("error", "home_seed_verdict_subscribe_threw", {});
  } finally {
    verdictsSubscribing = false;
  }
  return {
    beforeTurn: (signal) => holdBeforeTurn(signal).then(flushRestoreResult),
    state: () => ({
      verdict,
      deaf,
      deafReason,
      lastAppliedGeneration,
      pending: latestPendingAnnouncement() !== undefined || runInFlight || !announcementDecided,
      runs: runCount,
      restore: restoreStarted
        ? runInFlight && recoveryArmed
          ? "running"
          : "done"
        : recoveryArmed
          ? "armed"
          : provisionalRecovery
            ? "provisional"
            : announcementDecided
              ? "done"
              : "none",
    }),
    onApplied: (listener) => {
      appliedListeners.add(listener);
      runGuarded(listener, lastAppliedEvent, "home_seed_applied_listener_threw");
      lastAppliedEvent = undefined;
      return () => appliedListeners.delete(listener);
    },
    onRestore: (listener) => {
      restoreListeners.add(listener);
      runGuarded(
        (result) => {
          if (result.kind === "not_restored") restoreFailureReason = result.reason;
          listener(result);
        },
        lastRestoreEvent,
        "home_seed_restore_listener_threw",
      );
      lastRestoreEvent = undefined;
      return () => restoreListeners.delete(listener);
    },
    stop: () => {
      stopped = true;
      unsubscribeAnnouncements();
      unsubscribeVerdicts();
      goDeaf("stopped");
    },
  };
}
export {
  HOLD_MAX_MS,
  VERDICT_WAIT_MAX_MS,
  createHomeSeedAnnouncer,
  REQUEST_ATTEMPTS,
  REQUEST_RETRY_DELAY_MS,
  PERMISSIONS_FROM_ANY_PACK,
};
