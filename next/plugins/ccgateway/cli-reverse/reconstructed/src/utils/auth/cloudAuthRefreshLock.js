/**
 * utils/auth/cloudAuthRefreshLock.ts
 *
 * 2.1.316 新增：获取认证刷新锁（持有者记录、接管、报告）；等待他人刷新完成或自己执行等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (48)
 * attribution: placement 48
 */
import { lstat, unlink, rmdir, rename, open } from "fs/promises";
import { randomUUID } from "crypto";
import { setTimeout as PU } from "timers/promises";
import { constants } from "fs";
import { win32 } from "path";
import { env } from "../env.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  _enum,
  numberSchema,
  stringSchema,
  literal,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isDisklessSession } from "../disklessSession.js";
import { logForDebugging } from "../debug.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getOperationLockPaths } from "../swarm/permissionSync.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isTerminalShutdown } from "../terminalShutdown.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { errorMessage, getErrnoCode } from "../errors.js";
import { releaseLockQuietly, lock } from "../lockfile.js";
import { AwsAuthStatusManager } from "../awsAuthStatusManager.js";
import { getFsImplementation } from "../fsOperations.js";
import { getProjectDirsUpToHome } from "../secureStorage/macOsKeychainHelpers.js";
import { sleep } from "../sleep.js";
import {
  ownProcStartAsync,
  isProbeablePid,
  isProcessProvablyGone,
  isExitedProcessAsync,
  getProcessStartTimeAsync,
  provenSameProcessAsync,
  looksLikeFullHostProcessTable,
} from "../processIdentity.js";
import { ownPidDomain } from "../pidSpace.js";
import { listDescendantProcesses } from "./lockHolderLiveness.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { readHandleBounded } from "../fsSafety/boundOpen.js";
import { unwrapAbortReason } from "../abortController.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:332002-332238 placement
var REFRESH_LOCK_FILES = {
  gcpAuthRefresh: ".gcp_auth_refresh",
  awsAuthRefresh: ".aws_auth_refresh",
};
var REFRESH_LOCK_ENV_KEYS = {
  gcpAuthRefresh: () => [env.CLOUDSDK_CONFIG, env.CLOUDSDK_ACTIVE_CONFIG_NAME],
  awsAuthRefresh: () => [env.AWS_PROFILE, env.AWS_CONFIG_FILE, env.AWS_SHARED_CREDENTIALS_FILE],
};
//@ chunk-exfmq47h.js:332238-332264 placement
/**
 * 原样调用传入的函数（占位读取器）。
 */
function identityReader(readEnv) {
  return readEnv();
}
//@ chunk-exfmq47h.js:332264-332442 placement
var MAX_OUTCOME_RECORD_BYTES = 256;
var MAX_HOLDER_RECORD_BYTES = 4096;
var MAX_TAKEOVER_RECORD_BYTES = 4096;
var MAX_LOCK_ATTEMPTS = 3;
var TAKEOVER_AFTER_WAIT_MS = 60000;
var HANDOVER_TIMEOUT_MS = 5000;
var HOLDER_POLL_MS = 1000;
var SIGN_IN_SETTLE_MS = HANDOVER_TIMEOUT_MS;
var LOCK_UPDATE_MS = 5000;
var UNPROVEN_STALE_MS = 2 * LOCK_UPDATE_MS;
var STALE_HOLDER_MS = 60000;
var MAX_ELAPSED_STEP_MS = 5000;
var SIGN_IN_PROBE_INTERVAL_MS = 3000;
var RELEASE_RETRY_DELAYS_MS = [100, 250, 500];
var MAX_HOLDER_COMMANDS = 16;
var WATCH_BACKOFF_MS = [250, 250, 500, 2000, 7000];
var WATCH_BACKOFF_CAP_MS = 30000;
var MAX_HOLDER_WAIT_MS = 180000;
var MAX_LISTED_PIDS = 3;
//@ chunk-exfmq47h.js:332442-332636 placement
function signInStillRunningText(setting) {
  return `Another Claude Code process is running your ${setting} command. Finish signing in where that session started it, or stop this request and send it again to sign in here instead.`;
}
//@ chunk-exfmq47h.js:332636-333264 placement
/**
 * 之前会话的云认证登录仍在运行时的提示。
 */
function signInStillRunningMessage(setting, pids) {
  if (pids.length === 0)
    return `A Claude Code session closed before its ${setting} sign-in finished, and that sign-in is still running. If its browser tab is still open, finish signing in there. If not, end its ${setting} command, and this request signs in here.`;
  let joined = pids.slice(0, MAX_LISTED_PIDS).join(", ");
  let pidList =
    pids.length === 1 ? `PID ${joined}` : `PIDs ${joined}${pids.length > MAX_LISTED_PIDS ? " and more" : ""}`;
  let processesText = pids.length === 1 ? "that process" : "those processes";
  return `A Claude Code session closed before its ${setting} sign-in finished, and that sign-in is still running (${pidList}). If its browser tab is still open, finish signing in there. If not, end ${processesText}, and this request signs in here.`;
}
//@ chunk-exfmq47h.js:333264-333746 placement
/**
 * 云认证刷新结果的 schema（outcome、finishedAt、directory）。
 */
var RefreshOutcomeSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var refreshOutcomeSchema;
var refreshHolderSchema;
var refreshRecordSchema;
var refreshTakeoverSchema;
deferInit("chunk-exfmq47h.js:333264", () => {
  RefreshOutcomeSchema = DoctorLazy(() =>
    objectSchema({
      outcome: _enum(["ok", "failed"]),
      finishedAt: numberSchema(),
      directory: stringSchema().max(64).optional(),
    }),
  );
  refreshOutcomeSchema = DoctorLazy(() =>
    objectSchema({
      pid: numberSchema().int().positive(),
      procStart: stringSchema().max(64).optional(),
      pidDomain: stringSchema().max(512),
    }),
  );
  refreshHolderSchema = DoctorLazy(() =>
    objectSchema({
      pid: numberSchema().int().positive(),
      procStart: stringSchema().min(1).max(64),
    }),
  );
  refreshRecordSchema = DoctorLazy(() =>
    refreshOutcomeSchema().extend({
      lockIno: numberSchema(),
      lockBirthtimeMs: numberSchema().positive(),
      released: literal(true).optional(),
      commands: array(refreshHolderSchema()).max(MAX_HOLDER_COMMANDS).optional(),
    }),
  );
  refreshTakeoverSchema = DoctorLazy(() =>
    refreshOutcomeSchema().extend({
      nonce: stringSchema().min(1).max(64),
      lockIno: numberSchema(),
      lockBirthtimeMs: numberSchema().positive(),
    }),
  );
});
//@ chunk-exfmq47h.js:333746-334015 placement
class CloudAuthRefreshRuns {
  runs = new Map();
  userWaits = () => false;
  isWaiting() {
    for (let run of this.runs.values()) if (run.control.waiting && !run.cancel.signal.aborted) return true;
    return false;
  }
  askTakeover() {
    for (let run of this.runs.values())
      if (run.control.waiting && !run.cancel.signal.aborted) run.control.takeoverAsked = true;
  }
}
//@ chunk-exfmq47h.js:334015-334805 placement
/**
 * 带文件锁执行 AWS/GCP 认证刷新命令（单飞、接管、重探测）。
 */
async function runCloudAuthRefresh({
  setting,
  command,
  readEnvAsCommandStarts = identityReader,
  probedAt,
  singleFlight,
  signal,
  takeover,
  reprobe,
  refresh,
}) {
  if (isDisklessSession()) {
    logForDebugging(`Skipping ${setting} in a claude-code-server session`);
    logFeatureBad("auth_refresh_lock", "diskless");
    return false;
  }
  if (!isAuthRefreshLockEnabled()) return (await refresh(new AbortController().signal, () => {})) === "ok";
  if (signal?.aborted) return false;
  let operationLockPaths = getOperationLockPaths(setting, command, readEnvAsCommandStarts);
  let { runs } = singleFlight;
  let existingRun = runs.get(operationLockPaths.lockfilePath);
  if (existingRun === undefined || existingRun.cancel.signal.aborted) {
    let abortController = new AbortController();
    let control = {
      takeoverAsked: takeover,
      userWaits: () => singleFlight.userWaits(),
      waiting: false,
    };
    let run = {
      result: awaitOrRunRefresh({
        setting,
        paths: operationLockPaths,
        probedAt,
        signal: abortController.signal,
        control,
        reprobe,
        refresh,
      }),
      waiters: 0,
      cancel: abortController,
      control,
    };
    let onSettled = () => {
      if (runs.get(operationLockPaths.lockfilePath) === run) runs.delete(operationLockPaths.lockfilePath);
    };
    run.result.then(onSettled, onSettled);
    runs.set(operationLockPaths.lockfilePath, run);
    existingRun = run;
  } else if (takeover) existingRun.control.takeoverAsked = true;
  return joinRefreshRun(existingRun, signal);
}
//@ chunk-exfmq47h.js:334805-335092 placement
function joinRefreshRun(run, signal) {
  run.waiters++;
  if (signal === undefined) return run.result;
  return new Promise((resolve, reject) => {
    let onAbort = () => {
      if (--run.waiters === 0) run.cancel.abort();
      resolve(false);
    };
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    run.result.then(
      (result) => {
        signal.removeEventListener("abort", onAbort);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}
//@ chunk-exfmq47h.js:335092-335185 placement
/**
 * 别人持锁刷新时返回其刷新结果。
 */
function heldOutcomeOrUndefined(refreshOutcome, handover) {
  return refreshOutcome?.directory !== undefined && handover.heldSince.has(refreshOutcome.directory)
    ? refreshOutcome.outcome
    : undefined;
}
//@ chunk-exfmq47h.js:335185-337541 placement
/**
 * 等待他人刷新完成或自己执行。
 */
async function awaitOrRunRefresh({ setting, paths, probedAt, signal, control, reprobe, refresh }) {
  let { outcomePath, requestPath, holderPath } = paths;
  let handover;
  for (;;) {
    let report = {
      compromised: false,
      takeover: undefined,
    };
    let refreshLock = await acquireRefreshLock({
      setting,
      paths,
      signal,
      control,
      handover,
      reprobe,
      report,
    });
    let { waited } = refreshLock;
    let now = Date.now();
    let release = refreshLock.kind === "held" ? refreshLock.release : undefined;
    let decision = lit("ran");
    try {
      if (refreshLock.kind === "reused") {
        decision = lit("reused");
        return true;
      }
      if (refreshLock.kind === "taker_failed") {
        decision = lit("adopted_failure");
        return false;
      }
      if (refreshLock.kind === "aborted" || signal.aborted) {
        decision = lit("aborted");
        return false;
      }
      let abortController = new AbortController();
      let abortController_2 = new AbortController();
      let holderWatcher = holderTreeWatcher({
        holderPath,
        holding: refreshLock.kind === "held" ? refreshLock.holding : undefined,
        stop: abortController_2.signal,
      });
      let besideOrphan = refreshLock.kind === "held" ? refreshLock.besideOrphan : undefined;
      let signInWatcher =
        refreshLock.kind === "held"
          ? watchRefreshHolder({
              requestPath,
              lock: refreshLock.lock,
              reprobe,
              signedInElsewhere: async () => {
                if (besideOrphan !== undefined)
                  return !(await hasLiveHolderProcess(besideOrphan, {
                    unreadableIsLive: true,
                  }));
                let refreshOutcome = await readRefreshOutcome(outcomePath);
                return refreshOutcome?.outcome === "ok" && refreshOutcome.finishedAt > now;
              },
              stop: abortController_2.signal,
            }).then((signInResult) => {
              if (signInResult !== undefined) abortController.abort();
              return signInResult;
            })
          : Promise.resolve(undefined);
      let outcome;
      let handoverResult;
      try {
        let reprobeOnce = () =>
          Promise.race([
            reprobe(),
            new Promise((resolve) =>
              abortController.signal.addEventListener("abort", () => resolve("unknown"), {
                once: true,
              }),
            ),
          ]);
        let refreshOutcome = await readRefreshOutcome(outcomePath);
        let finishedAfterProbe = refreshOutcome !== undefined && refreshOutcome.finishedAt > probedAt;
        if (
          handover !== undefined &&
          !handover.signInHere &&
          heldOutcomeOrUndefined(refreshOutcome, handover) === "failed"
        ) {
          decision = lit("adopted_failure");
          return false;
        }
        if (waited || finishedAfterProbe || handover !== undefined) {
          let probeValidity = await reprobeOnce();
          if (
            probeValidity === "valid" ||
            (probeValidity === "unknown" && finishedAfterProbe && refreshOutcome.outcome === "ok")
          ) {
            decision = lit("reused");
            return true;
          }
        }
        if (signal.aborted) {
          decision = lit("aborted");
          return false;
        }
        if (besideOrphan !== undefined) report.takeover = "beside_orphan";
        outcome = abortController.signal.aborted
          ? "interrupted"
          : await refresh(abortController.signal, holderWatcher.spawned);
        abortController_2.abort();
        handoverResult = await signInWatcher;
      } finally {
        abortController_2.abort();
        await holderWatcher.done();
      }
      if (outcome !== "ok" && handoverResult === "handed_over" && refreshLock.kind === "held") {
        decision = lit("handed_over");
        handover = {
          directory: directoryStamp(refreshLock.lock),
          heldSince: new Set(),
          signInHere: false,
        };
        control.takeoverAsked = false;
        continue;
      }
      if (outcome !== "ok" && handoverResult === "signed_in") {
        decision = lit("ran_signed_in");
        outcome = "ok";
      } else if (outcome === "interrupted" || (outcome === "failed" && isTerminalShutdown())) {
        decision = lit("ran_interrupted");
        return false;
      }
      let outcomeRecord = {
        outcome,
        finishedAt: Date.now(),
        ...(refreshLock.kind === "held" &&
          refreshLock.lock.birthtimeMs > 0 && {
            directory: directoryStamp(refreshLock.lock),
          }),
      };
      await writeFileAtomic(outcomePath, jsonStringify(outcomeRecord)).catch((error) =>
        logForDebugging(`auth refresh outcome record not written: ${errorMessage(error)}`, {
          level: "warn",
        }),
      );
      return outcome === "ok";
    } finally {
      await releaseLockQuietly(release, `${setting} lock release`);
      let telemetryFields = {
        setting: fromEnum(setting),
        waited,
        decision,
        ...(report.takeover !== undefined && {
          takeover: fromEnum(report.takeover),
        }),
      };
      let sadReason =
        (refreshLock.kind === "unlocked" ? refreshLock.reason : undefined) ??
        (report.compromised ? "lock_compromised" : undefined);
      if (sadReason === undefined) logFeatureOk("auth_refresh_lock", telemetryFields);
      else logFeatureSad("auth_refresh_lock", sadReason, telemetryFields);
    }
  }
}
//@ chunk-exfmq47h.js:337541-337602 placement
/**
 * 是否启用认证刷新锁（未设置禁用变量）。
 */
function isAuthRefreshLockEnabled() {
  return !env.CLAUDE_CODE_DISABLE_AUTH_REFRESH_LOCK;
}
//@ chunk-exfmq47h.js:338013-342670 placement
/**
 * 获取认证刷新锁（持有者记录、接管、报告）。
 */
async function acquireRefreshLock({
  setting,
  paths: { lockfilePath, holderPath, requestPath, outcomePath },
  signal,
  control,
  handover,
  reprobe,
  report,
}) {
  let instance = AwsAuthStatusManager.getInstance();
  let waited = false;
  let waitingText = {
    text: undefined,
  };
  let lockErrorCount = 0;
  await getFsImplementation()
    .mkdir(getProjectDirsUpToHome())
    .catch(() => {});
  let waiterClock = {
    last: Date.now(),
    elapsed: 0,
  };
  let probeState = {
    nextAt: SIGN_IN_PROBE_INTERVAL_MS,
    running: false,
    valid: 0,
  };
  let holderState;
  let holderStale = false;
  let lastAccountedElapsed = 0;
  let lastKnownHolder;
  let takeoverAskedFor = new Set();
  let takeoverRequest;
  let signInSettleSince;
  let runningHolder;
  let previousRunningHolder;
  try {
    for (;;) {
      if (signal.aborted)
        return {
          kind: "aborted",
          waited,
        };
      let elapsedMs = accumulateWaitedMs(waiterClock);
      let deltaMs = elapsedMs - lastAccountedElapsed;
      lastAccountedElapsed = elapsedMs;
      let handoverOutcome;
      if (handover !== undefined && !handover.signInHere) {
        if (control.takeoverAsked) handover.signInHere = true;
        else {
          handoverOutcome = heldOutcomeOrUndefined(await readRefreshOutcome(outcomePath), handover);
          if (handoverOutcome === "failed")
            return {
              kind: "taker_failed",
              waited,
            };
        }
      }
      if (runningHolder !== undefined) {
        holderStale = false;
        if (probeState.valid > 0)
          return {
            kind: "reused",
            waited: true,
          };
        let takeoverAsked = control.takeoverAsked;
        if (takeoverAsked || elapsedMs - runningHolder.since >= MAX_HOLDER_WAIT_MS) {
          logForDebugging(
            `${setting} lock: done waiting on the refresh command its gone holder left running (${takeoverAsked ? "asked to sign in here" : `waited ${MAX_HOLDER_WAIT_MS / 60000} min`})`,
            {
              level: "warn",
            },
          );
          if (takeoverAsked && handover !== undefined) handover.signInHere = true;
          control.takeoverAsked = false;
          previousRunningHolder = runningHolder;
          runningHolder = undefined;
        } else if (await hasLiveHolderProcess(runningHolder.holder)) {
          probeSignedIn(probeState, reprobe, elapsedMs);
          await sleep(1000 + Math.random() * 1000, signal);
          continue;
        } else runningHolder = undefined;
      }
      if (handover !== undefined && !handover.signInHere) {
        let lockStat = await lstat(lockfilePath).catch(() => {
          return;
        });
        if (lockStat === undefined || directoryStamp(lockStat) === handover.directory) {
          signInSettleSince ??= elapsedMs;
          if (handoverOutcome !== "ok" && elapsedMs - signInSettleSince < SIGN_IN_SETTLE_MS) {
            await sleep(200 + Math.random() * 200, signal);
            continue;
          }
        } else {
          signInSettleSince = undefined;
          trackHeldDirectory(handover, lockStat);
        }
      }
      let lockAttempt = await lock(lockfilePath, {
        lockfilePath,
        realpath: false,
        stale: holderStale ? STALE_HOLDER_MS : 1 / 0,
        update: LOCK_UPDATE_MS,
        onCompromised: (error) => {
          report.compromised = true;
          logForDebugging(`${setting} lock compromised: ${error.message}`, {
            level: "error",
          });
        },
      }).then(
        (release) => ({
          release,
          err: undefined,
        }),
        (err) => ({
          release: undefined,
          err,
        }),
      );
      if (lockAttempt.release !== undefined) {
        let { release } = lockAttempt;
        if (takeoverRequest !== undefined) report.takeover = "answered";
        try {
          let holderRecord = await readHolderRecord(holderPath);
          let holderFromRecord =
            holderRecord.kind === "record"
              ? holderRecord.record
              : holderRecord.kind === "failed"
                ? lastKnownHolder
                : undefined;
          if (
            holderFromRecord !== undefined &&
            holderFromRecord.released !== true &&
            pidStamp(holderFromRecord) !== previousRunningHolder?.process &&
            (await holderLiveness(holderFromRecord)) === "gone" &&
            (await hasLiveHolderProcess(holderFromRecord))
          ) {
            await releaseLockQuietly(release, `${setting} lock release`);
            waited = true;
            let holderProcess = pidStamp(holderFromRecord);
            runningHolder = {
              holder: holderFromRecord,
              process: holderProcess,
              since: holderState?.process === holderProcess ? holderState.holderSince : elapsedMs,
            };
            await showWaitingForSignIn(setting, control, waitingText, holderFromRecord);
            continue;
          }
          if (control.takeoverAsked && handover !== undefined) handover.signInHere = true;
          control.takeoverAsked = false;
          let lockStat = await lstat(lockfilePath);
          let holding = await writeHolderRecord(lockStat, holderPath).catch((error) => {
            logForDebugging(`auth refresh holder record not built: ${errorMessage(error)}`, {
              level: "warn",
            });
            return;
          });
          return {
            kind: "held",
            release: () =>
              releaseRefreshLock({
                setting,
                release,
                lockfilePath,
                holderPath,
                holding,
              }),
            lock: lockStat,
            holding,
            besideOrphan: previousRunningHolder?.holder,
            waited,
          };
        } catch (error) {
          await releaseLockQuietly(release, `${setting} lock release`);
          logForDebugging(
            `${setting} lock released after an error (${errorMessage(error)}); running without it`,
            {
              level: "warn",
            },
          );
          return {
            kind: "unlocked",
            reason: "lock_unavailable",
            waited,
          };
        }
      }
      let { err } = lockAttempt;
      let errnoCode = getErrnoCode(err);
      if (errnoCode !== "ELOCKED") {
        if (
          errnoCode === "EACCES" ||
          errnoCode === "EROFS" ||
          errnoCode === "ENOTDIR" ||
          errnoCode === "ENOENT" ||
          ++lockErrorCount >= MAX_LOCK_ATTEMPTS
        ) {
          logForDebugging(
            `${setting} lock unavailable (${errorMessage(err)}); running without waiting for other Claude Code processes`,
            {
              level: "warn",
            },
          );
          return {
            kind: "unlocked",
            reason: "lock_unavailable",
            waited,
          };
        }
        await sleep(1000 + Math.random() * 1000, signal);
        continue;
      }
      waited = true;
      lockErrorCount = 0;
      if (probeState.valid > 0)
        return {
          kind: "reused",
          waited: true,
        };
      let lockStat = await lstat(lockfilePath).catch(() => {
        return;
      });
      if (lockStat === undefined) {
        if (takeoverRequest !== undefined) {
          report.takeover = "answered";
          await consumeTakeoverIfMatching(requestPath, takeoverRequest.nonce);
          takeoverRequest = undefined;
        }
        await sleep(50, signal);
        continue;
      }
      if (handover !== undefined) trackHeldDirectory(handover, lockStat);
      let holderRecord = await readHolderRecord(holderPath);
      let record =
        holderRecord.kind === "record" && isSameLock(holderRecord.record, lockStat)
          ? holderRecord.record
          : undefined;
      if (record !== undefined) lastKnownHolder = record;
      let holder =
        record ??
        (holderRecord.kind === "failed" &&
        lastKnownHolder !== undefined &&
        isSameLock(lastKnownHolder, lockStat)
          ? lastKnownHolder
          : undefined);
      let holderLivenessState = await lockHolderState(holder, lockStat);
      let staleReason =
        record === undefined && holderLivenessState !== "live" && holderLivenessState !== "orphaned"
          ? "unproven"
          : holderLivenessState;
      holderState = trackHolder(holderState, lockStat, holder, elapsedMs);
      holderStale = staleReason !== "live";
      if (control.userWaits() && holderState.holderSince < elapsedMs)
        holderState = {
          ...holderState,
          userWaitedMs: holderState.userWaitedMs + deltaMs,
        };
      if (takeoverRequest !== undefined) {
        if (takeoverRequest.directory !== directoryStamp(lockStat)) {
          report.takeover = "answered";
          await consumeTakeoverIfMatching(requestPath, takeoverRequest.nonce);
          takeoverRequest = undefined;
        } else if (!takeoverAskedFor.has(holderState.process)) {
          takeoverAskedFor.add(holderState.process);
          takeoverRequest = {
            ...takeoverRequest,
            sentAt: elapsedMs,
          };
        }
      }
      let sinceTouchMs = elapsedMs - holderState.touchedAt;
      let staleHolderKind =
        staleReason === "orphaned" ||
        (staleReason === "live" && sinceTouchMs < STALE_HOLDER_MS) ||
        (staleReason === "unproven" && sinceTouchMs < UNPROVEN_STALE_MS)
          ? undefined
          : staleReason;
      if (staleHolderKind !== undefined && (await claimLockFile(lockfilePath, lockStat))) {
        logForDebugging(`${setting} lock ${STALE_LOCK_REASONS[staleHolderKind]}; taking it`, {
          level: "warn",
        });
        continue;
      }
      if (takeoverRequest !== undefined && elapsedMs - takeoverRequest.sentAt >= HANDOVER_TIMEOUT_MS) {
        logForDebugging(
          `${setting} lock holder did not hand over within ${HANDOVER_TIMEOUT_MS / 1000} s; waiting for it to finish`,
          {
            level: "warn",
          },
        );
        report.takeover = "unanswered";
        await consumeTakeoverIfMatching(requestPath, takeoverRequest.nonce);
        takeoverRequest = undefined;
      }
      if (staleReason === "orphaned" && holder !== undefined) {
        if (holderState.process === previousRunningHolder?.process) {
          if (!(await claimLockFile(lockfilePath, lockStat)))
            await sleep(1000 + Math.random() * 1000, signal);
        } else {
          if (takeoverRequest !== undefined) {
            await consumeTakeoverIfMatching(requestPath, takeoverRequest.nonce);
            takeoverRequest = undefined;
          }
          runningHolder = {
            holder,
            process: holderState.process,
            since: holderState.holderSince,
          };
          await showWaitingForSignIn(setting, control, waitingText, holder);
        }
        continue;
      }
      if (
        control.takeoverAsked &&
        (takeoverRequest !== undefined || takeoverAskedFor.has(holderState.process))
      )
        control.takeoverAsked = false;
      if (
        takeoverRequest === undefined &&
        !takeoverAskedFor.has(holderState.process) &&
        (control.takeoverAsked ||
          (handover === undefined && holderState.userWaitedMs >= TAKEOVER_AFTER_WAIT_MS))
      ) {
        takeoverAskedFor.add(holderState.process);
        if (handover !== undefined) handover.signInHere = true;
        control.takeoverAsked = false;
        let nonce = await writeTakeoverRequest(requestPath, lockStat);
        if (nonce === undefined) report.takeover = "unanswered";
        else {
          logForDebugging(`${setting} lock: asked its holder to hand the sign-in over`);
          takeoverRequest = {
            nonce,
            directory: directoryStamp(lockStat),
            sentAt: elapsedMs,
          };
        }
      }
      showWaitingText(control, waitingText, signInStillRunningText(setting));
      probeSignedIn(probeState, reprobe, elapsedMs);
      await sleep(
        takeoverRequest === undefined ? 1000 + Math.random() * 1000 : 200 + Math.random() * 200,
        signal,
      );
    }
  } finally {
    control.waiting = false;
    if (takeoverRequest !== undefined) await consumeTakeoverIfMatching(requestPath, takeoverRequest.nonce);
    if (waitingText.text !== undefined) instance.endAuthentication(true);
  }
}
//@ chunk-exfmq47h.js:342670-342894 placement
var STALE_LOCK_REASONS = {
  released: "holder released it without removing its directory",
  gone: "holder is gone",
  live: `holder has not touched it for ${STALE_HOLDER_MS / 1000} s`,
  unproven: `has no live holder on record and has not been touched for ${UNPROVEN_STALE_MS / 1000} s`,
};
//@ chunk-exfmq47h.js:342894-343018 placement
function showWaitingText(control, waitingText, text) {
  if (waitingText.text === text) return;
  control.waiting = true;
  let instance = AwsAuthStatusManager.getInstance();
  instance.startAuthentication();
  waitingText.text = text;
  instance.addOutput(text);
}
//@ chunk-exfmq47h.js:343018-343092 placement
/**
 * 显示“等待登录完成”的提示与仍存活的进程列表。
 */
async function showWaitingForSignIn(setting, control, waitingText, holder) {
  let pids = await liveHolderCommandPids(holder, {
    limit: MAX_LISTED_PIDS + 1,
  });
  showWaitingText(control, waitingText, signInStillRunningMessage(setting, pids));
}
//@ chunk-exfmq47h.js:343092-343266 placement
function probeSignedIn(probeState, reprobe, elapsedMs) {
  if (probeState.running || elapsedMs < probeState.nextAt) return;
  probeState.running = true;
  probeState.nextAt = elapsedMs + SIGN_IN_PROBE_INTERVAL_MS;
  (async () => reprobe())()
    .catch(() => "unknown")
    .then((validity) => {
      probeState.running = false;
      probeState.valid = validity === "valid" ? probeState.valid + 1 : 0;
    });
}
//@ chunk-exfmq47h.js:343266-343976 placement
/**
 * 等待期间监视持有者（存活、交接、已登录）。
 */
async function watchRefreshHolder({ requestPath, lock, reprobe, signedInElsewhere, stop }) {
  let waiterClock = {
    last: Date.now(),
    elapsed: 0,
  };
  let probeState = {
    nextAt: SIGN_IN_PROBE_INTERVAL_MS,
    running: false,
    valid: 0,
  };
  let signedInProbe = {
    nextAt: 0,
    running: false,
    signedIn: false,
  };
  try {
    for (;;) {
      await sleep(HOLDER_POLL_MS, stop);
      if (stop.aborted) return;
      let elapsedMs = accumulateWaitedMs(waiterClock);
      let takeoverRequest = lock.birthtimeMs > 0 ? await isFileReadDenied(requestPath) : undefined;
      if (takeoverRequest !== undefined) {
        let liveness = await holderLiveness(takeoverRequest);
        if (liveness === "gone") await consumeTakeoverIfMatching(requestPath, takeoverRequest.nonce);
        else if (
          liveness === "live" &&
          takeoverRequest.lockIno === lock.ino &&
          takeoverRequest.lockBirthtimeMs === lock.birthtimeMs
        )
          return "handed_over";
      }
      if (probeState.valid >= 2) {
        if (signedInProbe.signedIn) return "signed_in";
        if (!signedInProbe.running && elapsedMs >= signedInProbe.nextAt) {
          signedInProbe.running = true;
          signedInProbe.nextAt = elapsedMs + SIGN_IN_PROBE_INTERVAL_MS;
          signedInElsewhere()
            .catch(() => false)
            .then((signedIn) => {
              signedInProbe.running = false;
              signedInProbe.signedIn = signedIn;
            });
        }
      }
      probeSignedIn(probeState, reprobe, elapsedMs);
    }
  } catch (error) {
    logForDebugging(`auth refresh lock: stopped watching for takeover requests: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-exfmq47h.js:343976-344229 placement
async function writeTakeoverRequest(requestPath, lockStat) {
  if (!(lockStat.birthtimeMs > 0)) return;
  try {
    let record = {
      ...(await ownProcessRecord()),
      nonce: randomUUID(),
      lockIno: lockStat.ino,
      lockBirthtimeMs: lockStat.birthtimeMs,
    };
    await writeFileAtomic(requestPath, jsonStringify(record));
    return record.nonce;
  } catch (error) {
    logForDebugging(`auth refresh takeover request not written: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-exfmq47h.js:344229-344306 placement
/**
 * 接管记录与锁匹配时删除该接管文件。
 */
async function consumeTakeoverIfMatching(requestPath, nonce) {
  if ((await isFileReadDenied(requestPath))?.nonce === nonce) await unlink(requestPath).catch(() => {});
}
//@ chunk-exfmq47h.js:344306-344409 placement
function accumulateWaitedMs(clock) {
  let now = Date.now();
  clock.elapsed += Math.min(Math.max(now - clock.last, 0), MAX_ELAPSED_STEP_MS);
  clock.last = now;
  return clock.elapsed;
}
//@ chunk-exfmq47h.js:344409-344684 placement
function trackHolder(previous, lockStat, holder, elapsedMs) {
  let dirStamp = directoryStamp(lockStat);
  let processStamp = holder !== undefined && isSameLock(holder, lockStat) ? pidStamp(holder) : undefined;
  let holderKey = `${dirStamp}:${processStamp ?? ""}`;
  if (previous?.holder !== holderKey)
    return {
      holder: holderKey,
      process: processStamp ?? `directory:${dirStamp}`,
      holderSince: elapsedMs,
      mtimeMs: lockStat.mtimeMs,
      touchedAt: elapsedMs,
      userWaitedMs: 0,
    };
  return previous.mtimeMs === lockStat.mtimeMs
    ? previous
    : {
        ...previous,
        mtimeMs: lockStat.mtimeMs,
        touchedAt: elapsedMs,
      };
}
//@ chunk-exfmq47h.js:344684-344733 placement
/**
 * 目录标识（inode 与创建时间）。
 */
function directoryStamp(lockStat) {
  return `${lockStat.ino}:${lockStat.birthtimeMs}`;
}
//@ chunk-exfmq47h.js:344733-344800 placement
/**
 * 记录别人持有过的目录标识。
 */
function trackHeldDirectory(handover, lockStat) {
  let dirStamp = directoryStamp(lockStat);
  if (dirStamp !== handover.directory) handover.heldSince.add(dirStamp);
}
//@ chunk-exfmq47h.js:344800-344851 placement
/**
 * 进程标识（pid 与启动时间）。
 */
function pidStamp(record) {
  return `${record.pid}:${record.procStart ?? ""}`;
}
//@ chunk-exfmq47h.js:344851-344962 placement
async function ownProcessRecord() {
  let procStart = await ownProcStartAsync();
  return {
    pid: process.pid,
    ...(procStart !== undefined && {
      procStart,
    }),
    pidDomain: await ownPidDomain(),
  };
}
//@ chunk-exfmq47h.js:344962-345110 placement
async function writeHolderRecord(lockStat, holderPath) {
  if (!(lockStat.birthtimeMs > 0)) return;
  let record = {
    ...(await ownProcessRecord()),
    lockIno: lockStat.ino,
    lockBirthtimeMs: lockStat.birthtimeMs,
  };
  return (await writeRecordFile(holderPath, record)) ? record : undefined;
}
//@ chunk-exfmq47h.js:345110-345252 placement
async function writeRecordFile(holderPath, record) {
  try {
    await writeFileAtomic(holderPath, jsonStringify(record));
    return true;
  } catch (error) {
    logForDebugging(`auth refresh holder record not written: ${errorMessage(error)}`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-exfmq47h.js:345252-345895 placement
/**
 * 释放认证刷新锁。
 */
async function releaseRefreshLock({ setting, release, lockfilePath, holderPath, holding }) {
  await removeOwnHolderRecord({
    lockfilePath,
    holderPath,
    holding,
  });
  let releaseError = await release().then(
    () => {
      return;
    },
    (error) => error,
  );
  let errnoCode = releaseError === undefined ? undefined : getErrnoCode(releaseError);
  if (errnoCode === "ERELEASED" || errnoCode === "ENOTACQUIRED") {
    let lockStat = await lstat(lockfilePath).catch(() => {
      return;
    });
    if (holding === undefined || lockStat === undefined || !isSameLock(holding, lockStat)) throw releaseError;
    let removeError = await rmdir(lockfilePath).then(
      () => {
        return;
      },
      (error) => error,
    );
    if (removeError === undefined || getErrnoCode(removeError) === "ENOENT") return;
  }
  if (releaseError === undefined) return;
  let staleOutcome = await removeStaleLock({
    lockfilePath,
    holderPath,
    holding,
  });
  if (staleOutcome !== "removed")
    logForDebugging(
      `${setting} lock directory could not be removed (${errorMessage(releaseError)}); ${staleOutcome === "marked" ? "marked released for the next process" : "not marked released"}`,
      {
        level: "warn",
      },
    );
}
//@ chunk-exfmq47h.js:345895-346211 placement
/**
 * 移除失效锁文件。
 */
async function removeStaleLock({ lockfilePath, holderPath, holding }) {
  let marked =
    holding !== undefined &&
    (await isHoldingSameLock(lockfilePath, holding)) &&
    (await writeRecordFile(holderPath, {
      ...holding,
      released: true,
    }));
  for (let delayMs of RELEASE_RETRY_DELAYS_MS) {
    await sleep(delayMs);
    try {
      let lockStat = await lstat(lockfilePath);
      if (holding !== undefined && !isSameLock(holding, lockStat)) return "removed";
      await rmdir(lockfilePath);
      return "removed";
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return "removed";
    }
  }
  return marked ? "marked" : "unmarked";
}
//@ chunk-exfmq47h.js:346211-346299 placement
/**
 * 判断目录是否仍持有同一把锁。
 */
async function isHoldingSameLock(lockfilePath, holding) {
  let lockStat = await lstat(lockfilePath).catch(() => {
    return;
  });
  return lockStat !== undefined && isSameLock(holding, lockStat);
}
//@ chunk-exfmq47h.js:346299-346555 placement
async function removeOwnHolderRecord({ lockfilePath, holderPath, holding }) {
  if (holding === undefined || !(await isHoldingSameLock(lockfilePath, holding))) return;
  let holderRecord = await readHolderRecord(holderPath);
  let record = holderRecord.kind === "record" ? holderRecord.record : undefined;
  if (
    record?.pid === holding.pid &&
    record.lockIno === holding.lockIno &&
    record.lockBirthtimeMs === holding.lockBirthtimeMs
  )
    await unlink(holderPath).catch(() => {});
}
//@ chunk-exfmq47h.js:346555-346873 placement
/**
 * 原子认领锁文件。
 */
async function claimLockFile(lockfilePath, lockStat) {
  let claimPath = `${lockfilePath}.${randomUUID()}.claim`;
  try {
    let current = await lstat(lockfilePath);
    if (!isSameLockDir(current, lockStat)) return false;
    await rename(lockfilePath, claimPath);
  } catch {
    return false;
  }
  let claimedStat = await lstat(claimPath).catch(() => {
    return;
  });
  if (claimedStat === undefined || !isSameLockDir(claimedStat, lockStat)) {
    await rename(claimPath, lockfilePath).catch(() => {});
    return false;
  }
  await rmdir(claimPath).catch((error) => {
    logForDebugging(`auth refresh lock left at ${claimPath}: ${errorMessage(error)}`, {
      level: "warn",
    });
  });
  return true;
}
//@ chunk-exfmq47h.js:346873-346982 placement
function isSameLockDir(left, right) {
  return (
    left.isDirectory() &&
    left.ino === right.ino &&
    left.birthtimeMs === right.birthtimeMs &&
    left.mtimeMs === right.mtimeMs
  );
}
//@ chunk-exfmq47h.js:346982-347059 placement
/**
 * 判断两个锁记录是否指向同一个锁文件。
 */
function isSameLock(record, lockStat) {
  return record.lockIno === lockStat.ino && record.lockBirthtimeMs === lockStat.birthtimeMs;
}
//@ chunk-exfmq47h.js:347059-347221 placement
async function lockHolderState(record, lockStat) {
  if (record === undefined || !isSameLock(record, lockStat)) return "unproven";
  if (record.released === true) return "released";
  let liveness = await holderLiveness(record);
  return liveness === "gone" && (await hasLiveHolderProcess(record)) ? "orphaned" : liveness;
}
//@ chunk-exfmq47h.js:347221-347291 placement
/**
 * 判断锁的持有进程是否仍存活。
 */
async function hasLiveHolderProcess(holder, options = {}) {
  return (
    (
      await liveHolderCommandPids(holder, {
        limit: 1,
        ...options,
      })
    ).length > 0
  );
}
//@ chunk-exfmq47h.js:347291-347554 placement
async function liveHolderCommandPids({ commands = [] }, { limit, unreadableIsLive = false }) {
  let pids = [];
  for (let { pid, procStart } of commands) {
    if (pids.length >= limit) break;
    if (
      !isProbeablePid(pid) ||
      pid === process.pid ||
      isProcessProvablyGone(pid) ||
      (await isExitedProcessAsync(pid))
    )
      continue;
    let processStartTime = await getProcessStartTimeAsync(pid, {
      skipCache: true,
    });
    if (processStartTime === procStart || (processStartTime === undefined && unreadableIsLive))
      pids.push(pid);
  }
  return pids;
}
//@ chunk-exfmq47h.js:347554-347715 placement
function holderTreeWatcher({ holderPath, holding, stop }) {
  let watcherPromise;
  return {
    spawned: (root) => {
      if (holding !== undefined && watcherPromise === undefined)
        watcherPromise = watchHolderProcesses({
          root,
          holderPath,
          holding,
          stop,
        });
    },
    done: async () => watcherPromise,
  };
}
//@ chunk-exfmq47h.js:347715-348271 placement
/**
 * 监视持有者进程树。
 */
async function watchHolderProcesses({ root, holderPath, holding, stop }) {
  let commands = new Map();
  try {
    for (let j = 0; !stop.aborted && isProbeablePid(root); j++) {
      let startTime = performance.now();
      let pids = [root, ...(await listDescendantProcesses(root))];
      let addedNewProcess = false;
      for (let pid of pids)
        if (commands.size < MAX_HOLDER_COMMANDS && isProbeablePid(pid) && !commands.has(pid)) {
          let processStartTime = await getProcessStartTimeAsync(pid, {
            skipCache: true,
          });
          if (processStartTime !== undefined) {
            commands.set(pid, processStartTime);
            addedNewProcess = true;
          }
        }
      if (addedNewProcess && !stop.aborted)
        await writeRecordFile(holderPath, {
          ...holding,
          commands: [...commands].map(([pid, procStart]) => ({
            pid,
            procStart,
          })),
        });
      if (isProcessProvablyGone(root)) return;
      await PU(
        Math.max(WATCH_BACKOFF_MS[j] ?? WATCH_BACKOFF_CAP_MS, performance.now() - startTime),
        undefined,
        {
          signal: stop,
        },
      ).catch(() => {});
    }
  } catch (error) {
    logForDebugging(`auth refresh lock: stopped recording the refresh command: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-exfmq47h.js:348271-348601 placement
/**
 * 判断锁持有者进程是否存活。
 */
async function holderLiveness({ pid, procStart, pidDomain }) {
  if (
    pidDomain !==
    (await ownPidDomain().catch(() => {
      return;
    }))
  )
    return "unproven";
  if (pid === process.pid) {
    let ownStart = await ownProcStartAsync();
    return procStart !== undefined && ownStart !== undefined && procStart !== ownStart ? "gone" : "live";
  }
  if (!isProbeablePid(pid)) return "unproven";
  if (!(
    isProcessProvablyGone(pid) ||
    (await isExitedProcessAsync(pid)) ||
    (procStart !== undefined && (await provenSameProcessAsync(pid, procStart)) === false)
  ))
    return "live";
  return (await looksLikeFullHostProcessTable()) ? "gone" : "unproven";
}
//@ chunk-exfmq47h.js:348601-348764 placement
async function readHolderRecord(holderPath) {
  let boundedJson = await readBoundedJson(holderPath, MAX_HOLDER_RECORD_BYTES);
  if (boundedJson.kind !== "read") return boundedJson;
  let parseResult = refreshRecordSchema().safeParse(boundedJson.value);
  return parseResult.success
    ? {
        kind: "record",
        record: parseResult.data,
      }
    : {
        kind: "absent",
      };
}
//@ chunk-exfmq47h.js:348764-348886 placement (2.1.88 match: isFileReadDenied, 1)
async function isFileReadDenied(path) {
  let boundedJson = await readBoundedJson(path, MAX_TAKEOVER_RECORD_BYTES);
  let parseResult = refreshTakeoverSchema().safeParse(
    boundedJson.kind === "read" ? boundedJson.value : undefined,
  );
  return parseResult.success ? parseResult.data : undefined;
}
//@ chunk-exfmq47h.js:348886-349042 placement
async function readRefreshOutcome(outcomePath) {
  let boundedJson = await readBoundedJson(outcomePath, MAX_OUTCOME_RECORD_BYTES);
  let parseResult = RefreshOutcomeSchema().safeParse(
    boundedJson.kind === "read" ? boundedJson.value : undefined,
  );
  if (!parseResult.success || parseResult.data.finishedAt > Date.now()) return;
  return parseResult.data;
}
//@ chunk-exfmq47h.js:349042-349313 placement
async function readBoundedJson(path, maxBytes) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
    let { bytes, overLimit } = await readHandleBounded(handle, maxBytes);
    return overLimit
      ? {
          kind: "absent",
        }
      : {
          kind: "read",
          value: jsonParse(bytes.toString("utf8")),
        };
  } catch (error) {
    return {
      kind: getErrnoCode(error) === "ENOENT" ? "absent" : "failed",
    };
  } finally {
    await handle?.close().catch(() => {
      return;
    });
  }
}
//@ chunk-exfmq47h.js:349313-349508 placement
function splitCommandWords(command, isNested = false) {
  return (command.match(/(?:"[^"]*"|'[^']*'|[^\s"'])+/g) ?? []).flatMap((word) => {
    let command = word.replace(/^(["'])([\s\S]*)\1$/, "$2");
    return !isNested && command !== word && /\s/.test(command) && !win32.isAbsolute(command)
      ? splitCommandWords(command, true)
      : [word];
  });
}
//@ chunk-exfmq47h.js:349508-350990 placement
/**
 * 刷新控制器（停止信号、用户等待、接管）。
 */
class RefreshController {
  withStop = 0;
  withoutStop = 0;
  userTurns = 0;
  stop = new AbortController();
  stoppedWhileWaiting = false;
  takeoverForNextRun;
  singleFlight;
  constructor(singleFlight) {
    this.singleFlight = singleFlight;
    singleFlight.userWaits = () => this.userTurns > 0;
  }
  get signal() {
    return this.stop.signal;
  }
  hasCallers() {
    return this.withStop + this.withoutStop > 0;
  }
  takeTakeover() {
    let hadTakeover = this.takeoverForNextRun !== undefined;
    this.takeoverForNextRun = undefined;
    return hadTakeover;
  }
  clearTakeover() {
    this.stoppedWhileWaiting = false;
    this.takeoverForNextRun = undefined;
  }
  noteStop() {
    if (!this.singleFlight.isWaiting()) return;
    this.stoppedWhileWaiting = true;
  }
  wait(run, { signal, userTurn }, fallbackValue) {
    if (!isAuthRefreshLockEnabled()) return run();
    if (signal?.aborted) return Promise.resolve(fallbackValue);
    let isUserTurn = userTurn && signal !== undefined;
    let takeoverSymbol;
    if (isUserTurn && this.stoppedWhileWaiting) {
      this.stoppedWhileWaiting = false;
      if (this.singleFlight.isWaiting()) this.singleFlight.askTakeover();
      else {
        takeoverSymbol = Symbol("takeover");
        this.takeoverForNextRun = takeoverSymbol;
      }
    }
    let resultPromise = run();
    if (signal === undefined) {
      this.withoutStop++;
      let releaseWithoutStop = () => {
        this.withoutStop--;
      };
      resultPromise.then(releaseWithoutStop, releaseWithoutStop);
      return resultPromise;
    }
    this.withStop++;
    if (isUserTurn) this.userTurns++;
    return new Promise((resolve, reject) => {
      let settled = false;
      let finish = () => {
        if (settled) return false;
        settled = true;
        this.withStop--;
        if (isUserTurn) this.userTurns--;
        if (takeoverSymbol !== undefined && this.takeoverForNextRun === takeoverSymbol)
          this.takeoverForNextRun = undefined;
        signal.removeEventListener("abort", onAbort);
        return true;
      };
      let onAbort = () => {
        if (!finish()) return;
        let abortReason = unwrapAbortReason(signal.reason);
        if (
          isUserTurn &&
          (abortReason === "user-cancel" || abortReason === "remote-cancel" || abortReason === "interrupt")
        )
          this.noteStop();
        if (this.withStop === 0 && this.withoutStop === 0) {
          this.stop.abort();
          this.stop = new AbortController();
        }
        resolve(fallbackValue);
      };
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
      resultPromise.then(
        (value) => {
          if (finish()) resolve(value);
        },
        (error) => {
          if (finish()) reject(error);
        },
      );
    });
  }
}
//@ chunk-exfmq47h.js:350990-351065 placement
/**
 * 刷新锁环境读取器的占位状态类。
 */
class refreshLockEnvReader {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
export {
  identityReader,
  splitCommandWords,
  REFRESH_LOCK_ENV_KEYS,
  REFRESH_LOCK_FILES,
  CloudAuthRefreshRuns,
  RefreshController,
  runCloudAuthRefresh,
  isAuthRefreshLockEnabled,
  refreshLockEnvReader,
};
