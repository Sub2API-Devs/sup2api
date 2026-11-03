/**
 * utils/auth/cloudAuthRefreshLock.ts
 *
 * 2.1.316 新增：获取认证刷新锁（持有者记录、接管、报告）；等待他人刷新完成或自己执行等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (48)
 * attribution: placement 48
 */
import { lstat, unlink, rmdir, rename, open } from "fs/promises";
import { randomUUID } from "crypto";
import { setTimeout as VL } from "timers/promises";
import { constants } from "fs";
import { win32 } from "path";
import { env } from "../env.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, _enum, E, string, literal, array } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-aepeg2w5.js:321530-321766 placement
var REFRESH_LOCK_FILES = {
  gcpAuthRefresh: ".gcp_auth_refresh",
  awsAuthRefresh: ".aws_auth_refresh",
};
var REFRESH_LOCK_ENV_KEYS = {
  gcpAuthRefresh: () => [env.CLOUDSDK_CONFIG, env.CLOUDSDK_ACTIVE_CONFIG_NAME],
  awsAuthRefresh: () => [env.AWS_PROFILE, env.AWS_CONFIG_FILE, env.AWS_SHARED_CREDENTIALS_FILE],
};
//@ chunk-aepeg2w5.js:321766-321792 placement
/**
 * 原样调用传入的函数（占位读取器）。
 */
function identityReader(e) {
  return e();
}
//@ chunk-aepeg2w5.js:321792-321970 placement
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
//@ chunk-aepeg2w5.js:321970-322164 placement
function signInStillRunningText(setting) {
  return `Another Claude Code process is running your ${setting} command. Finish signing in where that session started it, or stop this request and send it again to sign in here instead.`;
}
//@ chunk-aepeg2w5.js:322164-322792 placement
/**
 * 之前会话的云认证登录仍在运行时的提示。
 */
function signInStillRunningMessage(e, n) {
  if (n.length === 0)
    return `A Claude Code session closed before its ${e} sign-in finished, and that sign-in is still running. If its browser tab is still open, finish signing in there. If not, end its ${e} command, and this request signs in here.`;
  let joined = n.slice(0, MAX_LISTED_PIDS).join(", ");
  let y = n.length === 1 ? `PID ${joined}` : `PIDs ${joined}${n.length > MAX_LISTED_PIDS ? " and more" : ""}`;
  let S = n.length === 1 ? "that process" : "those processes";
  return `A Claude Code session closed before its ${e} sign-in finished, and that sign-in is still running (${y}). If its browser tab is still open, finish signing in there. If not, end ${S}, and this request signs in here.`;
}
//@ chunk-aepeg2w5.js:322792-323274 placement
/**
 * 云认证刷新结果的 schema（outcome、finishedAt、directory）。
 */
var RefreshOutcomeSchema = DoctorLazy(() =>
  u({
    outcome: _enum(["ok", "failed"]),
    finishedAt: E(),
    directory: string().max(64).optional(),
  }),
);
var refreshOutcomeSchema = DoctorLazy(() =>
  u({
    pid: E().int().positive(),
    procStart: string().max(64).optional(),
    pidDomain: string().max(512),
  }),
);
var refreshHolderSchema = DoctorLazy(() =>
  u({
    pid: E().int().positive(),
    procStart: string().min(1).max(64),
  }),
);
var refreshRecordSchema = DoctorLazy(() =>
  refreshOutcomeSchema().extend({
    lockIno: E(),
    lockBirthtimeMs: E().positive(),
    released: literal(true).optional(),
    commands: array(refreshHolderSchema()).max(MAX_HOLDER_COMMANDS).optional(),
  }),
);
var refreshTakeoverSchema = DoctorLazy(() =>
  refreshOutcomeSchema().extend({
    nonce: string().min(1).max(64),
    lockIno: E(),
    lockBirthtimeMs: E().positive(),
  }),
);
//@ chunk-aepeg2w5.js:323274-323543 placement
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
//@ chunk-aepeg2w5.js:323543-324333 placement
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
  let F = runs.get(operationLockPaths.lockfilePath);
  if (F === undefined || F.cancel.signal.aborted) {
    let abortController = new AbortController();
    let control = {
      takeoverAsked: takeover,
      userWaits: () => singleFlight.userWaits(),
      waiting: false,
    };
    let j = {
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
    let ee = () => {
      if (runs.get(operationLockPaths.lockfilePath) === j) runs.delete(operationLockPaths.lockfilePath);
    };
    j.result.then(ee, ee);
    runs.set(operationLockPaths.lockfilePath, j);
    F = j;
  } else if (takeover) F.control.takeoverAsked = true;
  return joinRefreshRun(F, signal);
}
//@ chunk-aepeg2w5.js:324333-324620 placement
function joinRefreshRun(e, signal) {
  e.waiters++;
  if (signal === undefined) return e.result;
  return new Promise((resolve, reject) => {
    let h = () => {
      if (--e.waiters === 0) e.cancel.abort();
      resolve(false);
    };
    signal.addEventListener("abort", h, {
      once: true,
    });
    e.result.then(
      (y) => {
        signal.removeEventListener("abort", h);
        resolve(y);
      },
      (error) => {
        signal.removeEventListener("abort", h);
        reject(error);
      },
    );
  });
}
//@ chunk-aepeg2w5.js:324620-324713 placement
/**
 * 别人持锁刷新时返回其刷新结果。
 */
function heldOutcomeOrUndefined(refreshOutcome, n) {
  return refreshOutcome?.directory !== undefined && n.heldSince.has(refreshOutcome.directory)
    ? refreshOutcome.outcome
    : undefined;
}
//@ chunk-aepeg2w5.js:324713-327065 placement
/**
 * 等待他人刷新完成或自己执行。
 */
async function awaitOrRunRefresh({ setting, paths, probedAt, signal, control, reprobe, refresh }) {
  let { outcomePath, requestPath, holderPath } = paths;
  let P;
  for (;;) {
    let F = {
      compromised: false,
      takeover: undefined,
    };
    let refreshLock = await acquireRefreshLock({
      setting,
      paths,
      signal,
      control,
      handover: P,
      reprobe,
      report: F,
    });
    let { waited } = refreshLock;
    let now = Date.now();
    let release = refreshLock.kind === "held" ? refreshLock.release : undefined;
    let q = lit("ran");
    try {
      if (refreshLock.kind === "reused") {
        q = lit("reused");
        return true;
      }
      if (refreshLock.kind === "taker_failed") {
        q = lit("adopted_failure");
        return false;
      }
      if (refreshLock.kind === "aborted" || signal.aborted) {
        q = lit("aborted");
        return false;
      }
      let abortController = new AbortController();
      let abortController_2 = new AbortController();
      let se = holderTreeWatcher({
        holderPath,
        holding: refreshLock.kind === "held" ? refreshLock.holding : undefined,
        stop: abortController_2.signal,
      });
      let besideOrphan = refreshLock.kind === "held" ? refreshLock.besideOrphan : undefined;
      let ae =
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
            }).then((fe) => {
              if (fe !== undefined) abortController.abort();
              return fe;
            })
          : Promise.resolve(undefined);
      let ie;
      let Z;
      try {
        let fe = () =>
          Promise.race([
            reprobe(),
            new Promise((resolve) =>
              abortController.signal.addEventListener("abort", () => resolve("unknown"), {
                once: true,
              }),
            ),
          ]);
        let refreshOutcome = await readRefreshOutcome(outcomePath);
        let Me = refreshOutcome !== undefined && refreshOutcome.finishedAt > probedAt;
        if (P !== undefined && !P.signInHere && heldOutcomeOrUndefined(refreshOutcome, P) === "failed") {
          q = lit("adopted_failure");
          return false;
        }
        if (waited || Me || P !== undefined) {
          let xe = await fe();
          if (xe === "valid" || (xe === "unknown" && Me && refreshOutcome.outcome === "ok")) {
            q = lit("reused");
            return true;
          }
        }
        if (signal.aborted) {
          q = lit("aborted");
          return false;
        }
        if (besideOrphan !== undefined) F.takeover = "beside_orphan";
        ie = abortController.signal.aborted
          ? "interrupted"
          : await refresh(abortController.signal, se.spawned);
        abortController_2.abort();
        Z = await ae;
      } finally {
        abortController_2.abort();
        await se.done();
      }
      if (ie !== "ok" && Z === "handed_over" && refreshLock.kind === "held") {
        q = lit("handed_over");
        P = {
          directory: directoryStamp(refreshLock.lock),
          heldSince: new Set(),
          signInHere: false,
        };
        control.takeoverAsked = false;
        continue;
      }
      if (ie !== "ok" && Z === "signed_in") {
        q = lit("ran_signed_in");
        ie = "ok";
      } else if (ie === "interrupted" || (ie === "failed" && isTerminalShutdown())) {
        q = lit("ran_interrupted");
        return false;
      }
      let ce = {
        outcome: ie,
        finishedAt: Date.now(),
        ...(refreshLock.kind === "held" &&
          refreshLock.lock.birthtimeMs > 0 && {
            directory: directoryStamp(refreshLock.lock),
          }),
      };
      await writeFileAtomic(outcomePath, jsonStringify(ce)).catch((error) =>
        logForDebugging(`auth refresh outcome record not written: ${errorMessage(error)}`, {
          level: "warn",
        }),
      );
      return ie === "ok";
    } finally {
      await releaseLockQuietly(release, `${setting} lock release`);
      let Q = {
        setting: fromEnum(setting),
        waited,
        decision: q,
        ...(F.takeover !== undefined && {
          takeover: fromEnum(F.takeover),
        }),
      };
      let re =
        (refreshLock.kind === "unlocked" ? refreshLock.reason : undefined) ??
        (F.compromised ? "lock_compromised" : undefined);
      if (re === undefined) logFeatureOk("auth_refresh_lock", Q);
      else logFeatureSad("auth_refresh_lock", re, Q);
    }
  }
}
//@ chunk-aepeg2w5.js:327065-327126 placement
/**
 * 是否启用认证刷新锁（未设置禁用变量）。
 */
function isAuthRefreshLockEnabled() {
  return !env.CLAUDE_CODE_DISABLE_AUTH_REFRESH_LOCK;
}
//@ chunk-aepeg2w5.js:327537-332185 placement
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
  let F = false;
  let L = {
    text: undefined,
  };
  let G = 0;
  await getFsImplementation()
    .mkdir(getProjectDirsUpToHome())
    .catch(() => {});
  let j = {
    last: Date.now(),
    elapsed: 0,
  };
  let ee = {
    nextAt: SIGN_IN_PROBE_INTERVAL_MS,
    running: false,
    valid: 0,
  };
  let q;
  let Q = false;
  let re = 0;
  let se;
  let Se = new Set();
  let ae;
  let ie;
  let Z;
  let ce;
  try {
    for (;;) {
      if (signal.aborted)
        return {
          kind: "aborted",
          waited: F,
        };
      let fe = accumulateWaitedMs(j);
      let Ae = fe - re;
      re = fe;
      let Me;
      if (handover !== undefined && !handover.signInHere) {
        if (control.takeoverAsked) handover.signInHere = true;
        else {
          Me = heldOutcomeOrUndefined(await readRefreshOutcome(outcomePath), handover);
          if (Me === "failed")
            return {
              kind: "taker_failed",
              waited: F,
            };
        }
      }
      if (Z !== undefined) {
        Q = false;
        if (ee.valid > 0)
          return {
            kind: "reused",
            waited: true,
          };
        let takeoverAsked = control.takeoverAsked;
        if (takeoverAsked || fe - Z.since >= MAX_HOLDER_WAIT_MS) {
          logForDebugging(
            `${setting} lock: done waiting on the refresh command its gone holder left running (${takeoverAsked ? "asked to sign in here" : `waited ${MAX_HOLDER_WAIT_MS / 60000} min`})`,
            {
              level: "warn",
            },
          );
          if (takeoverAsked && handover !== undefined) handover.signInHere = true;
          control.takeoverAsked = false;
          ce = Z;
          Z = undefined;
        } else if (await hasLiveHolderProcess(Z.holder)) {
          probeSignedIn(ee, reprobe, fe);
          await sleep(1000 + Math.random() * 1000, signal);
          continue;
        } else Z = undefined;
      }
      if (handover !== undefined && !handover.signInHere) {
        let Ke = await lstat(lockfilePath).catch(() => {
          return;
        });
        if (Ke === undefined || directoryStamp(Ke) === handover.directory) {
          ie ??= fe;
          if (Me !== "ok" && fe - ie < SIGN_IN_SETTLE_MS) {
            await sleep(200 + Math.random() * 200, signal);
            continue;
          }
        } else {
          ie = undefined;
          trackHeldDirectory(handover, Ke);
        }
      }
      let xe = await lock(lockfilePath, {
        lockfilePath,
        realpath: false,
        stale: Q ? STALE_HOLDER_MS : 1 / 0,
        update: LOCK_UPDATE_MS,
        onCompromised: (Ke) => {
          report.compromised = true;
          logForDebugging(`${setting} lock compromised: ${Ke.message}`, {
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
      if (xe.release !== undefined) {
        let { release } = xe;
        if (ae !== undefined) report.takeover = "answered";
        try {
          let holderRecord = await readHolderRecord(holderPath);
          let qt =
            holderRecord.kind === "record"
              ? holderRecord.record
              : holderRecord.kind === "failed"
                ? se
                : undefined;
          if (
            qt !== undefined &&
            qt.released !== true &&
            pidStamp(qt) !== ce?.process &&
            (await holderLiveness(qt)) === "gone" &&
            (await hasLiveHolderProcess(qt))
          ) {
            await releaseLockQuietly(release, `${setting} lock release`);
            F = true;
            let Cs = pidStamp(qt);
            Z = {
              holder: qt,
              process: Cs,
              since: q?.process === Cs ? q.holderSince : fe,
            };
            await showWaitingForSignIn(setting, control, L, qt);
            continue;
          }
          if (control.takeoverAsked && handover !== undefined) handover.signInHere = true;
          control.takeoverAsked = false;
          let a_ = await lstat(lockfilePath);
          let holding = await writeHolderRecord(a_, holderPath).catch((error) => {
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
            lock: a_,
            holding,
            besideOrphan: ce?.holder,
            waited: F,
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
            waited: F,
          };
        }
      }
      let { err } = xe;
      let errnoCode = getErrnoCode(err);
      if (errnoCode !== "ELOCKED") {
        if (
          errnoCode === "EACCES" ||
          errnoCode === "EROFS" ||
          errnoCode === "ENOTDIR" ||
          errnoCode === "ENOENT" ||
          ++G >= MAX_LOCK_ATTEMPTS
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
            waited: F,
          };
        }
        await sleep(1000 + Math.random() * 1000, signal);
        continue;
      }
      F = true;
      G = 0;
      if (ee.valid > 0)
        return {
          kind: "reused",
          waited: true,
        };
      let Ue = await lstat(lockfilePath).catch(() => {
        return;
      });
      if (Ue === undefined) {
        if (ae !== undefined) {
          report.takeover = "answered";
          await consumeTakeoverIfMatching(requestPath, ae.nonce);
          ae = undefined;
        }
        await sleep(50, signal);
        continue;
      }
      if (handover !== undefined) trackHeldDirectory(handover, Ue);
      let holderRecord = await readHolderRecord(holderPath);
      let record =
        holderRecord.kind === "record" && isSameLock(holderRecord.record, Ue)
          ? holderRecord.record
          : undefined;
      if (record !== undefined) se = record;
      let Wt =
        record ?? (holderRecord.kind === "failed" && se !== undefined && isSameLock(se, Ue) ? se : undefined);
      let un = await lockHolderState(Wt, Ue);
      let gt = record === undefined && un !== "live" && un !== "orphaned" ? "unproven" : un;
      q = trackHolder(q, Ue, Wt, fe);
      Q = gt !== "live";
      if (control.userWaits() && q.holderSince < fe)
        q = {
          ...q,
          userWaitedMs: q.userWaitedMs + Ae,
        };
      if (ae !== undefined) {
        if (ae.directory !== directoryStamp(Ue)) {
          report.takeover = "answered";
          await consumeTakeoverIfMatching(requestPath, ae.nonce);
          ae = undefined;
        } else if (!Se.has(q.process)) {
          Se.add(q.process);
          ae = {
            ...ae,
            sentAt: fe,
          };
        }
      }
      let yr = fe - q.touchedAt;
      let Yo =
        gt === "orphaned" ||
        (gt === "live" && yr < STALE_HOLDER_MS) ||
        (gt === "unproven" && yr < UNPROVEN_STALE_MS)
          ? undefined
          : gt;
      if (Yo !== undefined && (await claimLockFile(lockfilePath, Ue))) {
        logForDebugging(`${setting} lock ${STALE_LOCK_REASONS[Yo]}; taking it`, {
          level: "warn",
        });
        continue;
      }
      if (ae !== undefined && fe - ae.sentAt >= HANDOVER_TIMEOUT_MS) {
        logForDebugging(
          `${setting} lock holder did not hand over within ${HANDOVER_TIMEOUT_MS / 1000} s; waiting for it to finish`,
          {
            level: "warn",
          },
        );
        report.takeover = "unanswered";
        await consumeTakeoverIfMatching(requestPath, ae.nonce);
        ae = undefined;
      }
      if (gt === "orphaned" && Wt !== undefined) {
        if (q.process === ce?.process) {
          if (!(await claimLockFile(lockfilePath, Ue))) await sleep(1000 + Math.random() * 1000, signal);
        } else {
          if (ae !== undefined) {
            await consumeTakeoverIfMatching(requestPath, ae.nonce);
            ae = undefined;
          }
          Z = {
            holder: Wt,
            process: q.process,
            since: q.holderSince,
          };
          await showWaitingForSignIn(setting, control, L, Wt);
        }
        continue;
      }
      if (control.takeoverAsked && (ae !== undefined || Se.has(q.process))) control.takeoverAsked = false;
      if (
        ae === undefined &&
        !Se.has(q.process) &&
        (control.takeoverAsked || (handover === undefined && q.userWaitedMs >= TAKEOVER_AFTER_WAIT_MS))
      ) {
        Se.add(q.process);
        if (handover !== undefined) handover.signInHere = true;
        control.takeoverAsked = false;
        let Ke = await writeTakeoverRequest(requestPath, Ue);
        if (Ke === undefined) report.takeover = "unanswered";
        else {
          logForDebugging(`${setting} lock: asked its holder to hand the sign-in over`);
          ae = {
            nonce: Ke,
            directory: directoryStamp(Ue),
            sentAt: fe,
          };
        }
      }
      showWaitingText(control, L, signInStillRunningText(setting));
      probeSignedIn(ee, reprobe, fe);
      await sleep(ae === undefined ? 1000 + Math.random() * 1000 : 200 + Math.random() * 200, signal);
    }
  } finally {
    control.waiting = false;
    if (ae !== undefined) await consumeTakeoverIfMatching(requestPath, ae.nonce);
    if (L.text !== undefined) instance.endAuthentication(true);
  }
}
//@ chunk-aepeg2w5.js:332185-332409 placement
var STALE_LOCK_REASONS = {
  released: "holder released it without removing its directory",
  gone: "holder is gone",
  live: `holder has not touched it for ${STALE_HOLDER_MS / 1000} s`,
  unproven: `has no live holder on record and has not been touched for ${UNPROVEN_STALE_MS / 1000} s`,
};
//@ chunk-aepeg2w5.js:332409-332533 placement
function showWaitingText(e, n, r) {
  if (n.text === r) return;
  e.waiting = true;
  let instance = AwsAuthStatusManager.getInstance();
  instance.startAuthentication();
  n.text = r;
  instance.addOutput(r);
}
//@ chunk-aepeg2w5.js:332533-332607 placement
/**
 * 显示“等待登录完成”的提示与仍存活的进程列表。
 */
async function showWaitingForSignIn(setting, control, r, s) {
  let h = await liveHolderCommandPids(s, {
    limit: MAX_LISTED_PIDS + 1,
  });
  showWaitingText(control, r, signInStillRunningMessage(setting, h));
}
//@ chunk-aepeg2w5.js:332607-332781 placement
function probeSignedIn(e, reprobe, r) {
  if (e.running || r < e.nextAt) return;
  e.running = true;
  e.nextAt = r + SIGN_IN_PROBE_INTERVAL_MS;
  (async () => reprobe())()
    .catch(() => "unknown")
    .then((s) => {
      e.running = false;
      e.valid = s === "valid" ? e.valid + 1 : 0;
    });
}
//@ chunk-aepeg2w5.js:332781-333491 placement
/**
 * 等待期间监视持有者（存活、交接、已登录）。
 */
async function watchRefreshHolder({ requestPath, lock, reprobe, signedInElsewhere, stop }) {
  let y = {
    last: Date.now(),
    elapsed: 0,
  };
  let S = {
    nextAt: SIGN_IN_PROBE_INTERVAL_MS,
    running: false,
    valid: 0,
  };
  let w = {
    nextAt: 0,
    running: false,
    signedIn: false,
  };
  try {
    for (;;) {
      await sleep(HOLDER_POLL_MS, stop);
      if (stop.aborted) return;
      let R = accumulateWaitedMs(y);
      let x = lock.birthtimeMs > 0 ? await isFileReadDenied(requestPath) : undefined;
      if (x !== undefined) {
        let P = await holderLiveness(x);
        if (P === "gone") await consumeTakeoverIfMatching(requestPath, x.nonce);
        else if (P === "live" && x.lockIno === lock.ino && x.lockBirthtimeMs === lock.birthtimeMs)
          return "handed_over";
      }
      if (S.valid >= 2) {
        if (w.signedIn) return "signed_in";
        if (!w.running && R >= w.nextAt) {
          w.running = true;
          w.nextAt = R + SIGN_IN_PROBE_INTERVAL_MS;
          signedInElsewhere()
            .catch(() => false)
            .then((signedIn) => {
              w.running = false;
              w.signedIn = signedIn;
            });
        }
      }
      probeSignedIn(S, reprobe, R);
    }
  } catch (error) {
    logForDebugging(`auth refresh lock: stopped watching for takeover requests: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-aepeg2w5.js:333491-333744 placement
async function writeTakeoverRequest(requestPath, n) {
  if (!(n.birthtimeMs > 0)) return;
  try {
    let r = {
      ...(await ownProcessRecord()),
      nonce: randomUUID(),
      lockIno: n.ino,
      lockBirthtimeMs: n.birthtimeMs,
    };
    await writeFileAtomic(requestPath, jsonStringify(r));
    return r.nonce;
  } catch (error) {
    logForDebugging(`auth refresh takeover request not written: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-aepeg2w5.js:333744-333821 placement
/**
 * 接管记录与锁匹配时删除该接管文件。
 */
async function consumeTakeoverIfMatching(requestPath, nonce) {
  if ((await isFileReadDenied(requestPath))?.nonce === nonce) await unlink(requestPath).catch(() => {});
}
//@ chunk-aepeg2w5.js:333821-333924 placement
function accumulateWaitedMs(e) {
  let now = Date.now();
  e.elapsed += Math.min(Math.max(now - e.last, 0), MAX_ELAPSED_STEP_MS);
  e.last = now;
  return e.elapsed;
}
//@ chunk-aepeg2w5.js:333924-334199 placement
function trackHolder(e, n, r, s) {
  let h = directoryStamp(n);
  let y = r !== undefined && isSameLock(r, n) ? pidStamp(r) : undefined;
  let S = `${h}:${y ?? ""}`;
  if (e?.holder !== S)
    return {
      holder: S,
      process: y ?? `directory:${h}`,
      holderSince: s,
      mtimeMs: n.mtimeMs,
      touchedAt: s,
      userWaitedMs: 0,
    };
  return e.mtimeMs === n.mtimeMs
    ? e
    : {
        ...e,
        mtimeMs: n.mtimeMs,
        touchedAt: s,
      };
}
//@ chunk-aepeg2w5.js:334199-334248 placement
/**
 * 目录标识（inode 与创建时间）。
 */
function directoryStamp(e) {
  return `${e.ino}:${e.birthtimeMs}`;
}
//@ chunk-aepeg2w5.js:334248-334315 placement
/**
 * 记录别人持有过的目录标识。
 */
function trackHeldDirectory(handover, n) {
  let r = directoryStamp(n);
  if (r !== handover.directory) handover.heldSince.add(r);
}
//@ chunk-aepeg2w5.js:334315-334366 placement
/**
 * 进程标识（pid 与启动时间）。
 */
function pidStamp(e) {
  return `${e.pid}:${e.procStart ?? ""}`;
}
//@ chunk-aepeg2w5.js:334366-334477 placement
async function ownProcessRecord() {
  let e = await ownProcStartAsync();
  return {
    pid: process.pid,
    ...(e !== undefined && {
      procStart: e,
    }),
    pidDomain: await ownPidDomain(),
  };
}
//@ chunk-aepeg2w5.js:334477-334625 placement
async function writeHolderRecord(e, holderPath) {
  if (!(e.birthtimeMs > 0)) return;
  let r = {
    ...(await ownProcessRecord()),
    lockIno: e.ino,
    lockBirthtimeMs: e.birthtimeMs,
  };
  return (await writeRecordFile(holderPath, r)) ? r : undefined;
}
//@ chunk-aepeg2w5.js:334625-334767 placement
async function writeRecordFile(holderPath, n) {
  try {
    await writeFileAtomic(holderPath, jsonStringify(n));
    return true;
  } catch (error) {
    logForDebugging(`auth refresh holder record not written: ${errorMessage(error)}`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-aepeg2w5.js:334767-335410 placement
/**
 * 释放认证刷新锁。
 */
async function releaseRefreshLock({ setting, release, lockfilePath, holderPath, holding }) {
  await removeOwnHolderRecord({
    lockfilePath,
    holderPath,
    holding,
  });
  let y = await release().then(
    () => {
      return;
    },
    (error) => error,
  );
  let S = y === undefined ? undefined : getErrnoCode(y);
  if (S === "ERELEASED" || S === "ENOTACQUIRED") {
    let R = await lstat(lockfilePath).catch(() => {
      return;
    });
    if (holding === undefined || R === undefined || !isSameLock(holding, R)) throw y;
    let x = await rmdir(lockfilePath).then(
      () => {
        return;
      },
      (error) => error,
    );
    if (x === undefined || getErrnoCode(x) === "ENOENT") return;
  }
  if (y === undefined) return;
  let w = await removeStaleLock({
    lockfilePath,
    holderPath,
    holding,
  });
  if (w !== "removed")
    logForDebugging(
      `${setting} lock directory could not be removed (${errorMessage(y)}); ${w === "marked" ? "marked released for the next process" : "not marked released"}`,
      {
        level: "warn",
      },
    );
}
//@ chunk-aepeg2w5.js:335410-335726 placement
/**
 * 移除失效锁文件。
 */
async function removeStaleLock({ lockfilePath, holderPath, holding }) {
  let s =
    holding !== undefined &&
    (await isHoldingSameLock(lockfilePath, holding)) &&
    (await writeRecordFile(holderPath, {
      ...holding,
      released: true,
    }));
  for (let h of RELEASE_RETRY_DELAYS_MS) {
    await sleep(h);
    try {
      let y = await lstat(lockfilePath);
      if (holding !== undefined && !isSameLock(holding, y)) return "removed";
      await rmdir(lockfilePath);
      return "removed";
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return "removed";
    }
  }
  return s ? "marked" : "unmarked";
}
//@ chunk-aepeg2w5.js:335726-335814 placement
/**
 * 判断目录是否仍持有同一把锁。
 */
async function isHoldingSameLock(lockfilePath, holding) {
  let r = await lstat(lockfilePath).catch(() => {
    return;
  });
  return r !== undefined && isSameLock(holding, r);
}
//@ chunk-aepeg2w5.js:335814-336070 placement
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
//@ chunk-aepeg2w5.js:336070-336388 placement
/**
 * 原子认领锁文件。
 */
async function claimLockFile(lockfilePath, n) {
  let r = `${lockfilePath}.${randomUUID()}.claim`;
  try {
    let h = await lstat(lockfilePath);
    if (!isSameLockDir(h, n)) return false;
    await rename(lockfilePath, r);
  } catch {
    return false;
  }
  let s = await lstat(r).catch(() => {
    return;
  });
  if (s === undefined || !isSameLockDir(s, n)) {
    await rename(r, lockfilePath).catch(() => {});
    return false;
  }
  await rmdir(r).catch((error) => {
    logForDebugging(`auth refresh lock left at ${r}: ${errorMessage(error)}`, {
      level: "warn",
    });
  });
  return true;
}
//@ chunk-aepeg2w5.js:336388-336497 placement
function isSameLockDir(e, n) {
  return e.isDirectory() && e.ino === n.ino && e.birthtimeMs === n.birthtimeMs && e.mtimeMs === n.mtimeMs;
}
//@ chunk-aepeg2w5.js:336497-336574 placement
/**
 * 判断两个锁记录是否指向同一个锁文件。
 */
function isSameLock(e, n) {
  return e.lockIno === n.ino && e.lockBirthtimeMs === n.birthtimeMs;
}
//@ chunk-aepeg2w5.js:336574-336736 placement
async function lockHolderState(e, n) {
  if (e === undefined || !isSameLock(e, n)) return "unproven";
  if (e.released === true) return "released";
  let r = await holderLiveness(e);
  return r === "gone" && (await hasLiveHolderProcess(e)) ? "orphaned" : r;
}
//@ chunk-aepeg2w5.js:336736-336806 placement
/**
 * 判断锁的持有进程是否仍存活。
 */
async function hasLiveHolderProcess(e, n = {}) {
  return (
    (
      await liveHolderCommandPids(e, {
        limit: 1,
        ...n,
      })
    ).length > 0
  );
}
//@ chunk-aepeg2w5.js:336806-337069 placement
async function liveHolderCommandPids({ commands = [] }, { limit, unreadableIsLive = false }) {
  let s = [];
  for (let { pid, procStart } of commands) {
    if (s.length >= limit) break;
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
    if (processStartTime === procStart || (processStartTime === undefined && unreadableIsLive)) s.push(pid);
  }
  return s;
}
//@ chunk-aepeg2w5.js:337069-337230 placement
function holderTreeWatcher({ holderPath, holding, stop }) {
  let s;
  return {
    spawned: (root) => {
      if (holding !== undefined && s === undefined)
        s = watchHolderProcesses({
          root,
          holderPath,
          holding,
          stop,
        });
    },
    done: async () => s,
  };
}
//@ chunk-aepeg2w5.js:337230-337786 placement
/**
 * 监视持有者进程树。
 */
async function watchHolderProcesses({ root, holderPath, holding, stop }) {
  let h = new Map();
  try {
    for (let j = 0; !stop.aborted && isProbeablePid(root); j++) {
      let startTime = performance.now();
      let w = [root, ...(await listDescendantProcesses(root))];
      let R = false;
      for (let x of w)
        if (h.size < MAX_HOLDER_COMMANDS && isProbeablePid(x) && !h.has(x)) {
          let processStartTime = await getProcessStartTimeAsync(x, {
            skipCache: true,
          });
          if (processStartTime !== undefined) {
            h.set(x, processStartTime);
            R = true;
          }
        }
      if (R && !stop.aborted)
        await writeRecordFile(holderPath, {
          ...holding,
          commands: [...h].map(([x, P]) => ({
            pid: x,
            procStart: P,
          })),
        });
      if (isProcessProvablyGone(root)) return;
      await VL(
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
//@ chunk-aepeg2w5.js:337786-338116 placement
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
    let h = await ownProcStartAsync();
    return procStart !== undefined && h !== undefined && procStart !== h ? "gone" : "live";
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
//@ chunk-aepeg2w5.js:338116-338279 placement
async function readHolderRecord(holderPath) {
  let boundedJson = await readBoundedJson(holderPath, MAX_HOLDER_RECORD_BYTES);
  if (boundedJson.kind !== "read") return boundedJson;
  let r = refreshRecordSchema().safeParse(boundedJson.value);
  return r.success
    ? {
        kind: "record",
        record: r.data,
      }
    : {
        kind: "absent",
      };
}
//@ chunk-aepeg2w5.js:338279-338401 placement = isFileReadDenied (1)
async function isFileReadDenied(e) {
  let boundedJson = await readBoundedJson(e, MAX_TAKEOVER_RECORD_BYTES);
  let r = refreshTakeoverSchema().safeParse(boundedJson.kind === "read" ? boundedJson.value : undefined);
  return r.success ? r.data : undefined;
}
//@ chunk-aepeg2w5.js:338401-338557 placement
async function readRefreshOutcome(outcomePath) {
  let boundedJson = await readBoundedJson(outcomePath, MAX_OUTCOME_RECORD_BYTES);
  let r = RefreshOutcomeSchema().safeParse(boundedJson.kind === "read" ? boundedJson.value : undefined);
  if (!r.success || r.data.finishedAt > Date.now()) return;
  return r.data;
}
//@ chunk-aepeg2w5.js:338557-338828 placement
async function readBoundedJson(e, n) {
  let r;
  try {
    r = await open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
    let { bytes, overLimit } = await readHandleBounded(r, n);
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
    await r?.close().catch(() => {
      return;
    });
  }
}
//@ chunk-aepeg2w5.js:338828-339023 placement
function splitCommandWords(e, n = false) {
  return (e.match(/(?:"[^"]*"|'[^']*'|[^\s"'])+/g) ?? []).flatMap((r) => {
    let replaced = r.replace(/^(["'])([\s\S]*)\1$/, "$2");
    return !n && replaced !== r && /\s/.test(replaced) && !win32.isAbsolute(replaced)
      ? splitCommandWords(replaced, true)
      : [r];
  });
}
//@ chunk-aepeg2w5.js:339023-340505 placement
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
    let e = this.takeoverForNextRun !== undefined;
    this.takeoverForNextRun = undefined;
    return e;
  }
  clearTakeover() {
    this.stoppedWhileWaiting = false;
    this.takeoverForNextRun = undefined;
  }
  noteStop() {
    if (!this.singleFlight.isWaiting()) return;
    this.stoppedWhileWaiting = true;
  }
  wait(e, { signal, userTurn }, s) {
    if (!isAuthRefreshLockEnabled()) return e();
    if (signal?.aborted) return Promise.resolve(s);
    let h = userTurn && signal !== undefined;
    let y;
    if (h && this.stoppedWhileWaiting) {
      this.stoppedWhileWaiting = false;
      if (this.singleFlight.isWaiting()) this.singleFlight.askTakeover();
      else {
        y = Symbol("takeover");
        this.takeoverForNextRun = y;
      }
    }
    let S = e();
    if (signal === undefined) {
      this.withoutStop++;
      let w = () => {
        this.withoutStop--;
      };
      S.then(w, w);
      return S;
    }
    this.withStop++;
    if (h) this.userTurns++;
    return new Promise((resolve, reject) => {
      let x = false;
      let P = () => {
        if (x) return false;
        x = true;
        this.withStop--;
        if (h) this.userTurns--;
        if (y !== undefined && this.takeoverForNextRun === y) this.takeoverForNextRun = undefined;
        signal.removeEventListener("abort", F);
        return true;
      };
      let F = () => {
        if (!P()) return;
        let L = unwrapAbortReason(signal.reason);
        if (h && (L === "user-cancel" || L === "remote-cancel" || L === "interrupt")) this.noteStop();
        if (this.withStop === 0 && this.withoutStop === 0) {
          this.stop.abort();
          this.stop = new AbortController();
        }
        resolve(s);
      };
      signal.addEventListener("abort", F, {
        once: true,
      });
      S.then(
        (L) => {
          if (P()) resolve(L);
        },
        (error) => {
          if (P()) reject(error);
        },
      );
    });
  }
}
//@ chunk-aepeg2w5.js:340505-340580 placement
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
  CloudAuthRefreshRuns,
  RefreshController,
  runCloudAuthRefresh,
  isAuthRefreshLockEnabled,
  identityReader,
  splitCommandWords,
  REFRESH_LOCK_ENV_KEYS,
  REFRESH_LOCK_FILES,
  refreshLockEnvReader,
};
