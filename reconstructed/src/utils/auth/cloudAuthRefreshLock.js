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
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  rmdir,
  rmdir as rmdir_2,
  rename,
  open,
} from "fs/promises";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
} from "crypto";
import { setTimeout as VL } from "timers/promises";
import { constants } from "fs";
import { win32 } from "path";
import { env } from "../env.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, U, E, o, T, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { Tv } from "../disklessSession.js";
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
import { Lf } from "./lockHolderLiveness.js";
import { ws } from "../fsFlags.js";
import { readHandleBounded } from "../fsSafety/boundOpen.js";
import { unwrapAbortReason } from "../abortController.js";

//@ chunk-aepeg2w5.js:321530-321766 placement
var REFRESH_LOCK_FILES = { gcpAuthRefresh: ".gcp_auth_refresh", awsAuthRefresh: ".aws_auth_refresh" },
  REFRESH_LOCK_ENV_KEYS = {
    gcpAuthRefresh: () => [env.CLOUDSDK_CONFIG, env.CLOUDSDK_ACTIVE_CONFIG_NAME],
    awsAuthRefresh: () => [env.AWS_PROFILE, env.AWS_CONFIG_FILE, env.AWS_SHARED_CREDENTIALS_FILE],
  };
//@ chunk-aepeg2w5.js:321766-321792 placement
function eE(e) {
  return e();
}
//@ chunk-aepeg2w5.js:321792-321970 placement
var MAX_OUTCOME_RECORD_BYTES = 256,
  MAX_HOLDER_RECORD_BYTES = 4096,
  MAX_TAKEOVER_RECORD_BYTES = 4096,
  MAX_LOCK_ATTEMPTS = 3,
  TAKEOVER_AFTER_WAIT_MS = 60000,
  HANDOVER_TIMEOUT_MS = 5000,
  HOLDER_POLL_MS = 1000,
  SIGN_IN_SETTLE_MS = HANDOVER_TIMEOUT_MS,
  LOCK_UPDATE_MS = 5000,
  UNPROVEN_STALE_MS = 2 * LOCK_UPDATE_MS,
  STALE_HOLDER_MS = 60000,
  MAX_ELAPSED_STEP_MS = 5000,
  SIGN_IN_PROBE_INTERVAL_MS = 3000,
  RELEASE_RETRY_DELAYS_MS = [100, 250, 500],
  MAX_HOLDER_COMMANDS = 16,
  WATCH_BACKOFF_MS = [250, 250, 500, 2000, 7000],
  WATCH_BACKOFF_CAP_MS = 30000,
  MAX_HOLDER_WAIT_MS = 180000,
  MAX_LISTED_PIDS = 3;
//@ chunk-aepeg2w5.js:321970-322164 placement
function signInStillRunningText(e) {
  return `Another Claude Code process is running your ${e} command. Finish signing in where that session started it, or stop this request and send it again to sign in here instead.`;
}
/**
 * 之前会话的云认证登录仍在运行时的提示。
 */
//@ chunk-aepeg2w5.js:322164-322792 placement
function signInStillRunningMessage(e, n) {
  if (n.length === 0)
    return `A Claude Code session closed before its ${e} sign-in finished, and that sign-in is still running. If its browser tab is still open, finish signing in there. If not, end its ${e} command, and this request signs in here.`;
  let joined = n.slice(0, MAX_LISTED_PIDS).join(", "),
    y = n.length === 1 ? `PID ${joined}` : `PIDs ${joined}${n.length > MAX_LISTED_PIDS ? " and more" : ""}`,
    S = n.length === 1 ? "that process" : "those processes";
  return `A Claude Code session closed before its ${e} sign-in finished, and that sign-in is still running (${y}). If its browser tab is still open, finish signing in there. If not, end ${S}, and this request signs in here.`;
}
/**
 * 认证刷新锁相关记录的 schema（结果、持有者、请求）。
 */
//@ chunk-aepeg2w5.js:322792-323274 placement
var RefreshOutcomeSchema = DoctorLazy(() =>
    u({ outcome: U(["ok", "failed"]), finishedAt: E(), directory: o().max(64).optional() }),
  ),
  oE = DoctorLazy(() =>
    u({ pid: E().int().positive(), procStart: o().max(64).optional(), pidDomain: o().max(512) }),
  ),
  dU = DoctorLazy(() => u({ pid: E().int().positive(), procStart: o().min(1).max(64) })),
  cU = DoctorLazy(() =>
    oE().extend({
      lockIno: E(),
      lockBirthtimeMs: E().positive(),
      released: T(!0).optional(),
      commands: A(dU()).max(MAX_HOLDER_COMMANDS).optional(),
    }),
  ),
  fU = DoctorLazy(() =>
    oE().extend({ nonce: o().min(1).max(64), lockIno: E(), lockBirthtimeMs: E().positive() }),
  );
//@ chunk-aepeg2w5.js:323274-323543 placement
class CloudAuthRefreshRuns {
  runs = new Map();
  userWaits = () => !1;
  isWaiting() {
    for (let e of this.runs.values()) if (e.control.waiting && !e.cancel.signal.aborted) return !0;
    return !1;
  }
  askTakeover() {
    for (let e of this.runs.values())
      if (e.control.waiting && !e.cancel.signal.aborted) e.control.takeoverAsked = !0;
  }
}
/**
 * 带文件锁执行 AWS/GCP 认证刷新命令（单飞、接管、重探测）。
 */
//@ chunk-aepeg2w5.js:323543-324333 placement
async function runCloudAuthRefresh({
  setting: setting,
  command: command,
  readEnvAsCommandStarts: readEnvAsCommandStarts = eE,
  probedAt: probedAt,
  singleFlight: singleFlight,
  signal: signal,
  takeover: takeover,
  reprobe: reprobe,
  refresh: refresh,
}) {
  if (Tv())
    return (
      logForDebugging(`Skipping ${setting} in a claude-code-server session`),
      logFeatureBad("auth_refresh_lock", "diskless"),
      !1
    );
  if (!So()) return (await refresh(new AbortController().signal, () => {})) === "ok";
  if (signal?.aborted) return !1;
  let x = getOperationLockPaths(setting, command, readEnvAsCommandStarts),
    { runs: runs } = singleFlight,
    F = runs.get(x.lockfilePath);
  if (F === void 0 || F.cancel.signal.aborted) {
    let abortController = new AbortController(),
      G = { takeoverAsked: takeover, userWaits: () => singleFlight.userWaits(), waiting: !1 },
      j = {
        result: awaitOrRunRefresh({
          setting: setting,
          paths: x,
          probedAt: probedAt,
          signal: abortController.signal,
          control: G,
          reprobe: reprobe,
          refresh: refresh,
        }),
        waiters: 0,
        cancel: abortController,
        control: G,
      },
      ee = () => {
        if (runs.get(x.lockfilePath) === j) runs.delete(x.lockfilePath);
      };
    (j.result.then(ee, ee), runs.set(x.lockfilePath, j), (F = j));
  } else if (takeover) F.control.takeoverAsked = !0;
  return joinRefreshRun(F, signal);
}
//@ chunk-aepeg2w5.js:324333-324620 placement
function joinRefreshRun(e, n) {
  if ((e.waiters++, n === void 0)) return e.result;
  return new Promise((r, s) => {
    let h = () => {
      if (--e.waiters === 0) e.cancel.abort();
      r(!1);
    };
    (n.addEventListener("abort", h, { once: !0 }),
      e.result.then(
        (y) => {
          (n.removeEventListener("abort", h), r(y));
        },
        (y) => {
          (n.removeEventListener("abort", h), s(y));
        },
      ));
  });
}
//@ chunk-aepeg2w5.js:324620-324713 placement
function iE(e, n) {
  return e?.directory !== void 0 && n.heldSince.has(e.directory) ? e.outcome : void 0;
}
/**
 * 等待他人刷新完成或自己执行。
 */
//@ chunk-aepeg2w5.js:324713-327065 placement
async function awaitOrRunRefresh({
  setting: setting,
  paths: paths,
  probedAt: probedAt,
  signal: signal,
  control: control,
  reprobe: reprobe,
  refresh: refresh,
}) {
  let { outcomePath: outcomePath, requestPath: requestPath, holderPath: holderPath } = paths,
    P;
  for (;;) {
    let F = { compromised: !1, takeover: void 0 },
      L = await acquireRefreshLock({
        setting: setting,
        paths: paths,
        signal: signal,
        control: control,
        handover: P,
        reprobe: reprobe,
        report: F,
      }),
      { waited: waited } = L,
      now = Date.now(),
      ee = L.kind === "held" ? L.release : void 0,
      q = lit("ran");
    try {
      if (L.kind === "reused") return ((q = lit("reused")), !0);
      if (L.kind === "taker_failed") return ((q = lit("adopted_failure")), !1);
      if (L.kind === "aborted" || signal.aborted) return ((q = lit("aborted")), !1);
      let abortController = new AbortController(),
        abortController_2 = new AbortController(),
        se = holderTreeWatcher({
          holderPath: holderPath,
          holding: L.kind === "held" ? L.holding : void 0,
          stop: abortController_2.signal,
        }),
        Se = L.kind === "held" ? L.besideOrphan : void 0,
        ae =
          L.kind === "held"
            ? watchRefreshHolder({
                requestPath: requestPath,
                lock: L.lock,
                reprobe: reprobe,
                signedInElsewhere: async () => {
                  if (Se !== void 0) return !(await fu(Se, { unreadableIsLive: !0 }));
                  let fe = await readRefreshOutcome(outcomePath);
                  return fe?.outcome === "ok" && fe.finishedAt > now;
                },
                stop: abortController_2.signal,
              }).then((fe) => {
                if (fe !== void 0) abortController.abort();
                return fe;
              })
            : Promise.resolve(void 0),
        ie,
        Z;
      try {
        let fe = () =>
            Promise.race([
              reprobe(),
              new Promise((xe) =>
                abortController.signal.addEventListener("abort", () => xe("unknown"), { once: !0 }),
              ),
            ]),
          Ae = await readRefreshOutcome(outcomePath),
          Me = Ae !== void 0 && Ae.finishedAt > probedAt;
        if (P !== void 0 && !P.signInHere && iE(Ae, P) === "failed")
          return ((q = lit("adopted_failure")), !1);
        if (waited || Me || P !== void 0) {
          let xe = await fe();
          if (xe === "valid" || (xe === "unknown" && Me && Ae.outcome === "ok"))
            return ((q = lit("reused")), !0);
        }
        if (signal.aborted) return ((q = lit("aborted")), !1);
        if (Se !== void 0) F.takeover = "beside_orphan";
        ((ie = abortController.signal.aborted
          ? "interrupted"
          : await refresh(abortController.signal, se.spawned)),
          abortController_2.abort(),
          (Z = await ae));
      } finally {
        (abortController_2.abort(), await se.done());
      }
      if (ie !== "ok" && Z === "handed_over" && L.kind === "held") {
        ((q = lit("handed_over")),
          (P = { directory: Or(L.lock), heldSince: new Set(), signInHere: !1 }),
          (control.takeoverAsked = !1));
        continue;
      }
      if (ie !== "ok" && Z === "signed_in") ((q = lit("ran_signed_in")), (ie = "ok"));
      else if (ie === "interrupted" || (ie === "failed" && isTerminalShutdown()))
        return ((q = lit("ran_interrupted")), !1);
      let ce = {
        outcome: ie,
        finishedAt: Date.now(),
        ...(L.kind === "held" && L.lock.birthtimeMs > 0 && { directory: Or(L.lock) }),
      };
      return (
        await writeFileAtomic(outcomePath, jsonStringify(ce)).catch((fe) =>
          logForDebugging(`auth refresh outcome record not written: ${errorMessage(fe)}`, { level: "warn" }),
        ),
        ie === "ok"
      );
    } finally {
      await releaseLockQuietly(ee, `${setting} lock release`);
      let Q = {
          setting: fromEnum(setting),
          waited: waited,
          decision: q,
          ...(F.takeover !== void 0 && { takeover: fromEnum(F.takeover) }),
        },
        re = (L.kind === "unlocked" ? L.reason : void 0) ?? (F.compromised ? "lock_compromised" : void 0);
      if (re === void 0) logFeatureOk("auth_refresh_lock", Q);
      else logFeatureSad("auth_refresh_lock", re, Q);
    }
  }
}
//@ chunk-aepeg2w5.js:327065-327126 placement
function So() {
  return !env.CLAUDE_CODE_DISABLE_AUTH_REFRESH_LOCK;
}
/**
 * 获取认证刷新锁（持有者记录、接管、报告）。
 */
//@ chunk-aepeg2w5.js:327537-332185 placement
async function acquireRefreshLock({
  setting: setting,
  paths: { lockfilePath: n, holderPath: r, requestPath: s, outcomePath: h },
  signal: signal,
  control: control,
  handover: handover,
  reprobe: reprobe,
  report: report,
}) {
  let instance = AwsAuthStatusManager.getInstance(),
    F = !1,
    L = { text: void 0 },
    G = 0;
  await getFsImplementation()
    .mkdir(getProjectDirsUpToHome())
    .catch(() => {});
  let j = { last: Date.now(), elapsed: 0 },
    ee = { nextAt: SIGN_IN_PROBE_INTERVAL_MS, running: !1, valid: 0 },
    q,
    Q = !1,
    re = 0,
    se,
    Se = new Set(),
    ae,
    ie,
    Z,
    ce;
  try {
    for (;;) {
      if (signal.aborted) return { kind: "aborted", waited: F };
      let fe = accumulateWaitedMs(j),
        Ae = fe - re;
      re = fe;
      let Me;
      if (handover !== void 0 && !handover.signInHere) {
        if (control.takeoverAsked) handover.signInHere = !0;
        else if (((Me = iE(await readRefreshOutcome(h), handover)), Me === "failed"))
          return { kind: "taker_failed", waited: F };
      }
      if (Z !== void 0) {
        if (((Q = !1), ee.valid > 0)) return { kind: "reused", waited: !0 };
        let takeoverAsked = control.takeoverAsked;
        if (takeoverAsked || fe - Z.since >= MAX_HOLDER_WAIT_MS) {
          if (
            (logForDebugging(
              `${setting} lock: done waiting on the refresh command its gone holder left running (${takeoverAsked ? "asked to sign in here" : `waited ${MAX_HOLDER_WAIT_MS / 60000} min`})`,
              { level: "warn" },
            ),
            takeoverAsked && handover !== void 0)
          )
            handover.signInHere = !0;
          ((control.takeoverAsked = !1), (ce = Z), (Z = void 0));
        } else if (await fu(Z.holder)) {
          (probeSignedIn(ee, reprobe, fe), await sleep(1000 + Math.random() * 1000, signal));
          continue;
        } else Z = void 0;
      }
      if (handover !== void 0 && !handover.signInHere) {
        let Ke = await lstat_2(n).catch(() => {
          return;
        });
        if (Ke === void 0 || Or(Ke) === handover.directory) {
          if (((ie ??= fe), Me !== "ok" && fe - ie < SIGN_IN_SETTLE_MS)) {
            await sleep(200 + Math.random() * 200, signal);
            continue;
          }
        } else ((ie = void 0), zv(handover, Ke));
      }
      let xe = await lock(n, {
        lockfilePath: n,
        realpath: !1,
        stale: Q ? STALE_HOLDER_MS : 1 / 0,
        update: LOCK_UPDATE_MS,
        onCompromised: (Ke) => {
          ((report.compromised = !0),
            logForDebugging(`${setting} lock compromised: ${Ke.message}`, { level: "error" }));
        },
      }).then(
        (Ke) => ({ release: Ke, err: void 0 }),
        (Ke) => ({ release: void 0, err: Ke }),
      );
      if (xe.release !== void 0) {
        let { release: release } = xe;
        if (ae !== void 0) report.takeover = "answered";
        try {
          let It = await readHolderRecord(r),
            qt = It.kind === "record" ? It.record : It.kind === "failed" ? se : void 0;
          if (
            qt !== void 0 &&
            qt.released !== !0 &&
            Wf(qt) !== ce?.process &&
            (await holderLiveness(qt)) === "gone" &&
            (await fu(qt))
          ) {
            (await releaseLockQuietly(release, `${setting} lock release`), (F = !0));
            let Cs = Wf(qt);
            ((Z = { holder: qt, process: Cs, since: q?.process === Cs ? q.holderSince : fe }),
              await Wv(setting, control, L, qt));
            continue;
          }
          if (control.takeoverAsked && handover !== void 0) handover.signInHere = !0;
          control.takeoverAsked = !1;
          let a_ = await lstat_2(n),
            u_ = await writeHolderRecord(a_, r).catch((Cs) => {
              logForDebugging(`auth refresh holder record not built: ${errorMessage(Cs)}`, { level: "warn" });
              return;
            });
          return {
            kind: "held",
            release: () =>
              releaseRefreshLock({
                setting: setting,
                release: release,
                lockfilePath: n,
                holderPath: r,
                holding: u_,
              }),
            lock: a_,
            holding: u_,
            besideOrphan: ce?.holder,
            waited: F,
          };
        } catch (error) {
          return (
            await releaseLockQuietly(release, `${setting} lock release`),
            logForDebugging(
              `${setting} lock released after an error (${errorMessage(error)}); running without it`,
              { level: "warn" },
            ),
            { kind: "unlocked", reason: "lock_unavailable", waited: F }
          );
        }
      }
      let { err: err } = xe,
        De = getErrnoCode(err);
      if (De !== "ELOCKED") {
        if (
          De === "EACCES" ||
          De === "EROFS" ||
          De === "ENOTDIR" ||
          De === "ENOENT" ||
          ++G >= MAX_LOCK_ATTEMPTS
        )
          return (
            logForDebugging(
              `${setting} lock unavailable (${errorMessage(err)}); running without waiting for other Claude Code processes`,
              { level: "warn" },
            ),
            { kind: "unlocked", reason: "lock_unavailable", waited: F }
          );
        await sleep(1000 + Math.random() * 1000, signal);
        continue;
      }
      if (((F = !0), (G = 0), ee.valid > 0)) return { kind: "reused", waited: !0 };
      let Ue = await lstat_2(n).catch(() => {
        return;
      });
      if (Ue === void 0) {
        if (ae !== void 0) ((report.takeover = "answered"), await yo(s, ae.nonce), (ae = void 0));
        await sleep(50, signal);
        continue;
      }
      if (handover !== void 0) zv(handover, Ue);
      let qe = await readHolderRecord(r),
        Mt = qe.kind === "record" && Mr(qe.record, Ue) ? qe.record : void 0;
      if (Mt !== void 0) se = Mt;
      let Wt = Mt ?? (qe.kind === "failed" && se !== void 0 && Mr(se, Ue) ? se : void 0),
        un = await lockHolderState(Wt, Ue),
        gt = Mt === void 0 && un !== "live" && un !== "orphaned" ? "unproven" : un;
      if (((q = trackHolder(q, Ue, Wt, fe)), (Q = gt !== "live"), control.userWaits() && q.holderSince < fe))
        q = { ...q, userWaitedMs: q.userWaitedMs + Ae };
      if (ae !== void 0) {
        if (ae.directory !== Or(Ue)) ((report.takeover = "answered"), await yo(s, ae.nonce), (ae = void 0));
        else if (!Se.has(q.process)) (Se.add(q.process), (ae = { ...ae, sentAt: fe }));
      }
      let yr = fe - q.touchedAt,
        Yo =
          gt === "orphaned" ||
          (gt === "live" && yr < STALE_HOLDER_MS) ||
          (gt === "unproven" && yr < UNPROVEN_STALE_MS)
            ? void 0
            : gt;
      if (Yo !== void 0 && (await claimLockFile(n, Ue))) {
        logForDebugging(`${setting} lock ${STALE_LOCK_REASONS[Yo]}; taking it`, { level: "warn" });
        continue;
      }
      if (ae !== void 0 && fe - ae.sentAt >= HANDOVER_TIMEOUT_MS)
        (logForDebugging(
          `${setting} lock holder did not hand over within ${HANDOVER_TIMEOUT_MS / 1000} s; waiting for it to finish`,
          { level: "warn" },
        ),
          (report.takeover = "unanswered"),
          await yo(s, ae.nonce),
          (ae = void 0));
      if (gt === "orphaned" && Wt !== void 0) {
        if (q.process === ce?.process) {
          if (!(await claimLockFile(n, Ue))) await sleep(1000 + Math.random() * 1000, signal);
        } else {
          if (ae !== void 0) (await yo(s, ae.nonce), (ae = void 0));
          ((Z = { holder: Wt, process: q.process, since: q.holderSince }), await Wv(setting, control, L, Wt));
        }
        continue;
      }
      if (control.takeoverAsked && (ae !== void 0 || Se.has(q.process))) control.takeoverAsked = !1;
      if (
        ae === void 0 &&
        !Se.has(q.process) &&
        (control.takeoverAsked || (handover === void 0 && q.userWaitedMs >= TAKEOVER_AFTER_WAIT_MS))
      ) {
        if ((Se.add(q.process), handover !== void 0)) handover.signInHere = !0;
        control.takeoverAsked = !1;
        let Ke = await writeTakeoverRequest(s, Ue);
        if (Ke === void 0) report.takeover = "unanswered";
        else
          (logForDebugging(`${setting} lock: asked its holder to hand the sign-in over`),
            (ae = { nonce: Ke, directory: Or(Ue), sentAt: fe }));
      }
      (showWaitingText(control, L, signInStillRunningText(setting)),
        probeSignedIn(ee, reprobe, fe),
        await sleep(ae === void 0 ? 1000 + Math.random() * 1000 : 200 + Math.random() * 200, signal));
    }
  } finally {
    if (((control.waiting = !1), ae !== void 0)) await yo(s, ae.nonce);
    if (L.text !== void 0) instance.endAuthentication(!0);
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
  e.waiting = !0;
  let instance = AwsAuthStatusManager.getInstance();
  (instance.startAuthentication(), (n.text = r), instance.addOutput(r));
}
//@ chunk-aepeg2w5.js:332533-332607 placement
async function Wv(e, n, r, s) {
  let h = await liveHolderCommandPids(s, { limit: MAX_LISTED_PIDS + 1 });
  showWaitingText(n, r, signInStillRunningMessage(e, h));
}
//@ chunk-aepeg2w5.js:332607-332781 placement
function probeSignedIn(e, n, r) {
  if (e.running || r < e.nextAt) return;
  ((e.running = !0),
    (e.nextAt = r + SIGN_IN_PROBE_INTERVAL_MS),
    (async () => n())()
      .catch(() => "unknown")
      .then((s) => {
        ((e.running = !1), (e.valid = s === "valid" ? e.valid + 1 : 0));
      }));
}
/**
 * 等待期间监视持有者（存活、交接、已登录）。
 */
//@ chunk-aepeg2w5.js:332781-333491 placement
async function watchRefreshHolder({
  requestPath: requestPath,
  lock: lock,
  reprobe: reprobe,
  signedInElsewhere: signedInElsewhere,
  stop: stop,
}) {
  let y = { last: Date.now(), elapsed: 0 },
    S = { nextAt: SIGN_IN_PROBE_INTERVAL_MS, running: !1, valid: 0 },
    w = { nextAt: 0, running: !1, signedIn: !1 };
  try {
    for (;;) {
      if ((await sleep(HOLDER_POLL_MS, stop), stop.aborted)) return;
      let R = accumulateWaitedMs(y),
        x = lock.birthtimeMs > 0 ? await isFileReadDenied(requestPath) : void 0;
      if (x !== void 0) {
        let P = await holderLiveness(x);
        if (P === "gone") await yo(requestPath, x.nonce);
        else if (P === "live" && x.lockIno === lock.ino && x.lockBirthtimeMs === lock.birthtimeMs)
          return "handed_over";
      }
      if (S.valid >= 2) {
        if (w.signedIn) return "signed_in";
        if (!w.running && R >= w.nextAt)
          ((w.running = !0),
            (w.nextAt = R + SIGN_IN_PROBE_INTERVAL_MS),
            signedInElsewhere()
              .catch(() => !1)
              .then((P) => {
                ((w.running = !1), (w.signedIn = P));
              }));
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
async function writeTakeoverRequest(e, n) {
  if (!(n.birthtimeMs > 0)) return;
  try {
    let r = {
      ...(await ownProcessRecord()),
      nonce: randomUUID_4(),
      lockIno: n.ino,
      lockBirthtimeMs: n.birthtimeMs,
    };
    return (await writeFileAtomic(e, jsonStringify(r)), r.nonce);
  } catch (error) {
    logForDebugging(`auth refresh takeover request not written: ${errorMessage(error)}`, { level: "warn" });
    return;
  }
}
//@ chunk-aepeg2w5.js:333744-333821 placement
async function yo(e, n) {
  if ((await isFileReadDenied(e))?.nonce === n) await unlink_2(e).catch(() => {});
}
//@ chunk-aepeg2w5.js:333821-333924 placement
function accumulateWaitedMs(e) {
  let now = Date.now();
  return ((e.elapsed += Math.min(Math.max(now - e.last, 0), MAX_ELAPSED_STEP_MS)), (e.last = now), e.elapsed);
}
//@ chunk-aepeg2w5.js:333924-334199 placement
function trackHolder(e, n, r, s) {
  let h = Or(n),
    y = r !== void 0 && Mr(r, n) ? Wf(r) : void 0,
    S = `${h}:${y ?? ""}`;
  if (e?.holder !== S)
    return {
      holder: S,
      process: y ?? `directory:${h}`,
      holderSince: s,
      mtimeMs: n.mtimeMs,
      touchedAt: s,
      userWaitedMs: 0,
    };
  return e.mtimeMs === n.mtimeMs ? e : { ...e, mtimeMs: n.mtimeMs, touchedAt: s };
}
//@ chunk-aepeg2w5.js:334199-334248 placement
function Or(e) {
  return `${e.ino}:${e.birthtimeMs}`;
}
//@ chunk-aepeg2w5.js:334248-334315 placement
function zv(e, n) {
  let r = Or(n);
  if (r !== e.directory) e.heldSince.add(r);
}
//@ chunk-aepeg2w5.js:334315-334366 placement
function Wf(e) {
  return `${e.pid}:${e.procStart ?? ""}`;
}
//@ chunk-aepeg2w5.js:334366-334477 placement
async function ownProcessRecord() {
  let e = await ownProcStartAsync();
  return { pid: process.pid, ...(e !== void 0 && { procStart: e }), pidDomain: await ownPidDomain() };
}
//@ chunk-aepeg2w5.js:334477-334625 placement
async function writeHolderRecord(e, n) {
  if (!(e.birthtimeMs > 0)) return;
  let r = { ...(await ownProcessRecord()), lockIno: e.ino, lockBirthtimeMs: e.birthtimeMs };
  return (await writeRecordFile(n, r)) ? r : void 0;
}
//@ chunk-aepeg2w5.js:334625-334767 placement
async function writeRecordFile(e, n) {
  try {
    return (await writeFileAtomic(e, jsonStringify(n)), !0);
  } catch (error) {
    return (
      logForDebugging(`auth refresh holder record not written: ${errorMessage(error)}`, { level: "warn" }),
      !1
    );
  }
}
/**
 * 释放认证刷新锁。
 */
//@ chunk-aepeg2w5.js:334767-335410 placement
async function releaseRefreshLock({
  setting: setting,
  release: release,
  lockfilePath: lockfilePath,
  holderPath: holderPath,
  holding: holding,
}) {
  await removeOwnHolderRecord({ lockfilePath: lockfilePath, holderPath: holderPath, holding: holding });
  let y = await release().then(
      () => {
        return;
      },
      (R) => R,
    ),
    S = y === void 0 ? void 0 : getErrnoCode(y);
  if (S === "ERELEASED" || S === "ENOTACQUIRED") {
    let R = await lstat_2(lockfilePath).catch(() => {
      return;
    });
    if (holding === void 0 || R === void 0 || !Mr(holding, R)) throw y;
    let x = await rmdir_2(lockfilePath).then(
      () => {
        return;
      },
      (P) => P,
    );
    if (x === void 0 || getErrnoCode(x) === "ENOENT") return;
  }
  if (y === void 0) return;
  let w = await removeStaleLock({ lockfilePath: lockfilePath, holderPath: holderPath, holding: holding });
  if (w !== "removed")
    logForDebugging(
      `${setting} lock directory could not be removed (${errorMessage(y)}); ${w === "marked" ? "marked released for the next process" : "not marked released"}`,
      { level: "warn" },
    );
}
/**
 * 移除失效锁文件。
 */
//@ chunk-aepeg2w5.js:335410-335726 placement
async function removeStaleLock({ lockfilePath: lockfilePath, holderPath: holderPath, holding: holding }) {
  let s =
    holding !== void 0 &&
    (await lE(lockfilePath, holding)) &&
    (await writeRecordFile(holderPath, { ...holding, released: !0 }));
  for (let h of RELEASE_RETRY_DELAYS_MS) {
    await sleep(h);
    try {
      let y = await lstat_2(lockfilePath);
      if (holding !== void 0 && !Mr(holding, y)) return "removed";
      return (await rmdir_2(lockfilePath), "removed");
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return "removed";
    }
  }
  return s ? "marked" : "unmarked";
}
//@ chunk-aepeg2w5.js:335726-335814 placement
async function lE(e, n) {
  let r = await lstat_2(e).catch(() => {
    return;
  });
  return r !== void 0 && Mr(n, r);
}
//@ chunk-aepeg2w5.js:335814-336070 placement
async function removeOwnHolderRecord({
  lockfilePath: lockfilePath,
  holderPath: holderPath,
  holding: holding,
}) {
  if (holding === void 0 || !(await lE(lockfilePath, holding))) return;
  let s = await readHolderRecord(holderPath),
    h = s.kind === "record" ? s.record : void 0;
  if (
    h?.pid === holding.pid &&
    h.lockIno === holding.lockIno &&
    h.lockBirthtimeMs === holding.lockBirthtimeMs
  )
    await unlink_2(holderPath).catch(() => {});
}
/**
 * 原子认领锁文件。
 */
//@ chunk-aepeg2w5.js:336070-336388 placement
async function claimLockFile(e, n) {
  let r = `${e}.${randomUUID_4()}.claim`;
  try {
    let h = await lstat_2(e);
    if (!isSameLockDir(h, n)) return !1;
    await rename(e, r);
  } catch {
    return !1;
  }
  let s = await lstat_2(r).catch(() => {
    return;
  });
  if (s === void 0 || !isSameLockDir(s, n)) return (await rename(r, e).catch(() => {}), !1);
  return (
    await rmdir_2(r).catch((h) => {
      logForDebugging(`auth refresh lock left at ${r}: ${errorMessage(h)}`, { level: "warn" });
    }),
    !0
  );
}
//@ chunk-aepeg2w5.js:336388-336497 placement
function isSameLockDir(e, n) {
  return e.isDirectory() && e.ino === n.ino && e.birthtimeMs === n.birthtimeMs && e.mtimeMs === n.mtimeMs;
}
//@ chunk-aepeg2w5.js:336497-336574 placement
function Mr(e, n) {
  return e.lockIno === n.ino && e.lockBirthtimeMs === n.birthtimeMs;
}
//@ chunk-aepeg2w5.js:336574-336736 placement
async function lockHolderState(e, n) {
  if (e === void 0 || !Mr(e, n)) return "unproven";
  if (e.released === !0) return "released";
  let r = await holderLiveness(e);
  return r === "gone" && (await fu(e)) ? "orphaned" : r;
}
//@ chunk-aepeg2w5.js:336736-336806 placement
async function fu(e, n = {}) {
  return (await liveHolderCommandPids(e, { limit: 1, ...n })).length > 0;
}
//@ chunk-aepeg2w5.js:336806-337069 placement
async function liveHolderCommandPids(
  { commands: commands = [] },
  { limit: limit, unreadableIsLive: unreadableIsLive = !1 },
) {
  let s = [];
  for (let { pid: pid, procStart: procStart } of commands) {
    if (s.length >= limit) break;
    if (
      !isProbeablePid(pid) ||
      pid === process.pid ||
      isProcessProvablyGone(pid) ||
      (await isExitedProcessAsync(pid))
    )
      continue;
    let S = await getProcessStartTimeAsync(pid, { skipCache: !0 });
    if (S === procStart || (S === void 0 && unreadableIsLive)) s.push(pid);
  }
  return s;
}
//@ chunk-aepeg2w5.js:337069-337230 placement
function holderTreeWatcher({ holderPath: holderPath, holding: holding, stop: stop }) {
  let s;
  return {
    spawned: (h) => {
      if (holding !== void 0 && s === void 0)
        s = watchHolderProcesses({ root: h, holderPath: holderPath, holding: holding, stop: stop });
    },
    done: async () => s,
  };
}
/**
 * 监视持有者进程树。
 */
//@ chunk-aepeg2w5.js:337230-337786 placement
async function watchHolderProcesses({ root: root, holderPath: holderPath, holding: holding, stop: stop }) {
  let h = new Map();
  try {
    for (let y = 0; !stop.aborted && isProbeablePid(root); y++) {
      let startTime = performance.now(),
        w = [root, ...(await Lf(root))],
        R = !1;
      for (let x of w)
        if (h.size < MAX_HOLDER_COMMANDS && isProbeablePid(x) && !h.has(x)) {
          let P = await getProcessStartTimeAsync(x, { skipCache: !0 });
          if (P !== void 0) (h.set(x, P), (R = !0));
        }
      if (R && !stop.aborted)
        await writeRecordFile(holderPath, {
          ...holding,
          commands: [...h].map(([x, P]) => ({ pid: x, procStart: P })),
        });
      if (isProcessProvablyGone(root)) return;
      await VL(Math.max(WATCH_BACKOFF_MS[y] ?? WATCH_BACKOFF_CAP_MS, performance.now() - startTime), void 0, {
        signal: stop,
      }).catch(() => {});
    }
  } catch (error) {
    logForDebugging(`auth refresh lock: stopped recording the refresh command: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
/**
 * 判断锁持有者进程是否存活。
 */
//@ chunk-aepeg2w5.js:337786-338116 placement
async function holderLiveness({ pid: pid, procStart: procStart, pidDomain: pidDomain }) {
  if (
    pidDomain !==
    (await ownPidDomain().catch(() => {
      return;
    }))
  )
    return "unproven";
  if (pid === process.pid) {
    let h = await ownProcStartAsync();
    return procStart !== void 0 && h !== void 0 && procStart !== h ? "gone" : "live";
  }
  if (!isProbeablePid(pid)) return "unproven";
  if (!(
    isProcessProvablyGone(pid) ||
    (await isExitedProcessAsync(pid)) ||
    (procStart !== void 0 && (await provenSameProcessAsync(pid, procStart)) === !1)
  ))
    return "live";
  return (await looksLikeFullHostProcessTable()) ? "gone" : "unproven";
}
//@ chunk-aepeg2w5.js:338116-338279 placement
async function readHolderRecord(e) {
  let n = await readBoundedJson(e, MAX_HOLDER_RECORD_BYTES);
  if (n.kind !== "read") return n;
  let safeParse = cU().safeParse(n.value);
  return safeParse.success ? { kind: "record", record: safeParse.data } : { kind: "absent" };
}
//@ chunk-aepeg2w5.js:338279-338401 placement = isFileReadDenied (1)
async function isFileReadDenied(e) {
  let n = await readBoundedJson(e, MAX_TAKEOVER_RECORD_BYTES),
    safeParse = fU().safeParse(n.kind === "read" ? n.value : void 0);
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-aepeg2w5.js:338401-338557 placement
async function readRefreshOutcome(e) {
  let n = await readBoundedJson(e, MAX_OUTCOME_RECORD_BYTES),
    safeParse = RefreshOutcomeSchema().safeParse(n.kind === "read" ? n.value : void 0);
  if (!safeParse.success || safeParse.data.finishedAt > Date.now()) return;
  return safeParse.data;
}
//@ chunk-aepeg2w5.js:338557-338828 placement
async function readBoundedJson(e, n) {
  let r;
  try {
    r = await open(e, constants.O_RDONLY | ws);
    let { bytes: bytes, overLimit: overLimit } = await readHandleBounded(r, n);
    return overLimit ? { kind: "absent" } : { kind: "read", value: jsonParse(bytes.toString("utf8")) };
  } catch (error) {
    return { kind: getErrnoCode(error) === "ENOENT" ? "absent" : "failed" };
  } finally {
    await r?.close().catch(() => {
      return;
    });
  }
}
//@ chunk-aepeg2w5.js:338828-339023 placement
function splitCommandWords(e, n = !1) {
  return (e.match(/(?:"[^"]*"|'[^']*'|[^\s"'])+/g) ?? []).flatMap((r) => {
    let replaced = r.replace(/^(["'])([\s\S]*)\1$/, "$2");
    return !n && replaced !== r && /\s/.test(replaced) && !win32.isAbsolute(replaced)
      ? splitCommandWords(replaced, !0)
      : [r];
  });
}
/**
 * 刷新控制器（停止信号、用户等待、接管）。
 */
//@ chunk-aepeg2w5.js:339023-340505 placement
class RefreshController {
  withStop = 0;
  withoutStop = 0;
  userTurns = 0;
  stop = new AbortController();
  stoppedWhileWaiting = !1;
  takeoverForNextRun;
  singleFlight;
  constructor(e) {
    ((this.singleFlight = e), (e.userWaits = () => this.userTurns > 0));
  }
  get signal() {
    return this.stop.signal;
  }
  hasCallers() {
    return this.withStop + this.withoutStop > 0;
  }
  takeTakeover() {
    let e = this.takeoverForNextRun !== void 0;
    return ((this.takeoverForNextRun = void 0), e);
  }
  clearTakeover() {
    ((this.stoppedWhileWaiting = !1), (this.takeoverForNextRun = void 0));
  }
  noteStop() {
    if (!this.singleFlight.isWaiting()) return;
    this.stoppedWhileWaiting = !0;
  }
  wait(e, { signal: n, userTurn: r }, s) {
    if (!So()) return e();
    if (n?.aborted) return Promise.resolve(s);
    let h = r && n !== void 0,
      y;
    if (h && this.stoppedWhileWaiting)
      if (((this.stoppedWhileWaiting = !1), this.singleFlight.isWaiting())) this.singleFlight.askTakeover();
      else ((y = Symbol("takeover")), (this.takeoverForNextRun = y));
    let S = e();
    if (n === void 0) {
      this.withoutStop++;
      let w = () => {
        this.withoutStop--;
      };
      return (S.then(w, w), S);
    }
    if ((this.withStop++, h)) this.userTurns++;
    return new Promise((w, R) => {
      let x = !1,
        P = () => {
          if (x) return !1;
          if (((x = !0), this.withStop--, h)) this.userTurns--;
          if (y !== void 0 && this.takeoverForNextRun === y) this.takeoverForNextRun = void 0;
          return (n.removeEventListener("abort", F), !0);
        },
        F = () => {
          if (!P()) return;
          let L = unwrapAbortReason(n.reason);
          if (h && (L === "user-cancel" || L === "remote-cancel" || L === "interrupt")) this.noteStop();
          if (this.withStop === 0 && this.withoutStop === 0)
            (this.stop.abort(), (this.stop = new AbortController()));
          w(s);
        };
      (n.addEventListener("abort", F, { once: !0 }),
        S.then(
          (L) => {
            if (P()) w(L);
          },
          (L) => {
            if (P()) R(L);
          },
        ));
    });
  }
}
//@ chunk-aepeg2w5.js:340505-340580 placement
class pE {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}

export {
  CloudAuthRefreshRuns,
  RefreshController,
  runCloudAuthRefresh,
  So,
  eE,
  splitCommandWords,
  REFRESH_LOCK_ENV_KEYS,
  REFRESH_LOCK_FILES,
  pE,
};
