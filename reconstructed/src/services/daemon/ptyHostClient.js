/**
 * services/daemon/ptyHostClient.ts
 *
 * 2.1.316 新增：pty 宿主客户端
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-89ebz077.js (13)
 * attribution: placement 13
 */
import { StringDecoder } from "string_decoder";
import { unlink, unlink as unlink_2, unlink as unlink_3, rename } from "fs/promises";
import { Socket, Socket as Socket_2 } from "net";
import { Hg, truncateWithEllipsis } from "../sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../teamMemorySync/secretScanner.js";
import { readJobState, writeStateAtomic } from "./jobState.js";
import { logError } from "../../utils/log.js";
import { nje } from "../../ink/wrapAnsi.js";
import { qa } from "../../utils/stripAnsi.js";
import {
  byn,
  vvt,
  encodeControlFrame,
  createFrameDecoder,
  encodeDataFrame,
} from "../../utils/framedSocket.js";
import { createSignal } from "../../utils/signal.js";
import {
  getProcessStartTimeAsync,
  sigtermThenKill,
  reapDetachedRepl,
  captureProcessStartTimeAsync,
  getProcessStartTime,
  isSameProcess,
} from "../../utils/processIdentity.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { JC, xN } from "../../utils/sandbox/userNamespace.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { bgShort } from "./roster.js";
import { sanitizeErrnoTokenForTelemetry, getErrnoCode } from "../../utils/errors.js";
import { processWrapperArgv } from "../../utils/processWrapper.js";
import { DAEMON_DETACH_APC, BG_PROTO } from "./leaseProtocol.js";
import { getPlatform } from "../../utils/platform.js";
import { Dr } from "../../utils/stringUtils.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { readStreamLines } from "../../utils/streamDestroy.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";

//@ chunk-89ebz077.js:2682-2717 placement
var Ne = 2000,
  oe = Hg,
  ct = /\x1b\[\d*D/g;
/**
 * 跟踪 pty 输出以更新后台作业状态：记录最后一行（脱敏截断），定时根据近期输出与是否停在半行判断 working/active、blocked 或 idle 并写入状态行（去重）。
 */
//@ chunk-89ebz077.js:2717-3496 placement
function createPtyActivityTracker(jobDir, options) {
  let partialLine = "",
    lastLine = "",
    atLineStart = !0,
    lastOutputAt = 0,
    lastStatus = "",
    disposed = !1;
  function writeStatus(w, E) {
    let S = truncateWithEllipsis(redactSecrets(lastLine), oe),
      R = `${w}|${E}|${S}`;
    if (R === lastStatus) return;
    ((lastStatus = R),
      readJobState(jobDir, options)
        .then((A) =>
          A && !disposed
            ? writeStateAtomic(
                jobDir,
                { ...A, state: w, tempo: E, detail: S, updatedAt: new Date().toISOString() },
                options,
              )
            : void 0,
        )
        .catch(logError));
  }
  let timer = setInterval(() => {
    if (lastOutputAt > 0 && Date.now() - lastOutputAt < Ne) writeStatus("working", "active");
    else if (!atLineStart && lastLine) writeStatus("blocked", "blocked");
    else writeStatus("working", "idle");
  }, Ne);
  return (
    timer.unref(),
    {
      feed(w) {
        let replaced = (nje(w) ? qa(w.replace(ct, "\x00")) : w)
          .replace(
            /\r\n?/g,
            `
`,
          )
          .replace(/\0+$/, "")
          .replace(
            /\0/g,
            `
`,
          );
        if (!replaced) return;
        ((lastOutputAt = Date.now()), (partialLine += replaced));
        let parts = partialLine.split(`
`);
        if (
          ((partialLine = parts.pop() ?? ""),
          (atLineStart = partialLine === ""),
          (lastLine = partialLine.trim() || parts.findLast((O) => O.trim())?.trim() || lastLine),
          partialLine.length > oe * 2)
        )
          partialLine = partialLine.slice(-oe);
        if (lastStatus.startsWith("blocked|")) writeStatus("working", "active");
      },
      dispose() {
        ((disposed = !0), clearInterval(timer));
      },
      get lastLine() {
        return truncateWithEllipsis(redactSecrets(lastLine), oe);
      },
    }
  );
}
//@ chunk-89ebz077.js:3625-3692 placement
var Me = [50, 100, 250, 500, 1000, 2000],
  xe = 30,
  ut = 4,
  ft = 1e4,
  Ue = 8 * byn,
  gt = 50;
/**
 * 连接 pty 宿主进程，处理 utf8 流、认证要求、重连与退出。
 */
//@ chunk-89ebz077.js:3692-9109 placement
function connectPtyHost(e, r, s) {
  let {
      procStart: procStart,
      short: short,
      hostProc: hostProc,
      auth: auth,
      onAuthRequired: onAuthRequired,
    } = s ?? {},
    g = createSignal(),
    f = createSignal(),
    w,
    E = new StringDecoder("utf8"),
    S,
    R = !1,
    A = !1,
    O = 0,
    G = 0,
    L,
    C,
    x,
    W,
    P = 0,
    T,
    V,
    H,
    F = !1,
    X = !1,
    ie = !1,
    Q = "",
    De = !1,
    Z = procStart;
  if (Z === void 0)
    getProcessStartTimeAsync(r, { skipCache: !0 }).then((y) => {
      Z = y;
    });
  let Pe = [],
    ge = 0;
  function ee(y) {
    if (S) {
      if (S.destroyed) return !1;
      if (!S.write(y)) {
        if (!x)
          ((x = setTimeout(() => {
            ((x = void 0), S?.destroy());
          }, ft)),
            x.unref());
        if (!W && S.writableLength > Ue)
          ((W = setTimeout(() => {
            if (((W = void 0), S && !S.destroyed && S.writableLength > Ue)) (se(), S.destroy());
          }, gt)),
            W.unref());
      }
      return !0;
    }
    if (ge < 2 * byn) (Pe.push(y), (ge += y.length));
    return !1;
  }
  function se() {
    if (x) (clearTimeout(x), (x = void 0));
    if (W) (clearTimeout(W), (W = void 0));
  }
  function K(y, D, N) {
    if (A) return;
    if (((A = !0), (R = !0), C)) (clearTimeout(C), (C = void 0));
    (se(), S?.destroy(), (S = void 0));
    let end = E.end();
    if (end) g.emit(end);
    f.emit({ exitCode: y, signal: D, hostStderr: N });
  }
  function me(y) {
    let D = readSmallFileOrNull(JC(e), 1048576)
      .then((U) => U ?? "")
      .catch(() => "");
    (D.then((U) => {
      let trimmed = U.slice(0, 2000).trim();
      if (trimmed.length > 0) logForDebugging(`[bg-pty] host crash: ${trimmed}`, { level: "warn" });
      let j = [...trimmed.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
        (Se) => !"/\\".includes(trimmed[Se.index - 1] ?? "."),
      )?.[0];
      logEvent("tengu_bg_ptyhost_crash", {
        hadBreadcrumb: trimmed.length > 0,
        hadHello: F,
        via: fromEnum(y),
        short: short === void 0 ? void 0 : bgShort(short),
        stderr_errno: sanitizeErrnoTokenForTelemetry(j),
      });
    }),
      sigtermThenKill(P ? [-r, P] : [-r], y !== "hung" ? void 0 : Z),
      reapDetachedRepl(P, T));
    let N = processWrapperArgv().length > 0,
      M = N
        ? (U, B) =>
            void D.then(
              (j) => K(U, B, firstVisibleLine(j)),
              () => K(U, B),
            )
        : K;
    if (hostProc) {
      let U = null;
      (hostProc.exited.then(
        (B) => {
          ((U = { code: B, signal: hostProc.signalCode ?? void 0 }), M(B, U.signal));
        },
        () => M(-1),
      ),
        setTimeout(() => K(U ? U.code : -1, U?.signal), 1000).unref());
      return;
    }
    if ((M(-1), N)) setTimeout(K, 1000, -1).unref();
  }
  function dt(y) {
    if (y.kind === vvt) {
      if (!X) {
        let write = E.write(y.payload);
        if (ie) g.emit(write);
        else if (write.length > 0) {
          let replaced = (Q + write).replaceAll(DAEMON_DETACH_APC, ""),
            M = partialDetachSuffixLength(replaced);
          Q = M > 0 ? replaced.slice(replaced.length - M) : "";
          let U = M > 0 ? replaced.slice(0, replaced.length - M) : replaced;
          if (U.length > 0) g.emit(U);
        }
      }
    } else if (y.ctrl.t === "hello") {
      if (F) ((X = !0), E.end(), (Q = ""));
      else unlink_3(xN(e)).catch(() => {});
      if (
        ((F = !0),
        (P = y.ctrl.replPid),
        (H = y.ctrl.version),
        (T = void 0),
        P > 1 && getPlatform() !== "windows")
      ) {
        let D = P;
        captureProcessStartTimeAsync(D).then((N) => {
          if (P !== D || A || R || N === void 0) return;
          ((T = N), V?.(P, N));
        });
      }
    } else if (y.ctrl.t === "live") {
      if (!ie) {
        if (((ie = !0), Q.length > 0)) (g.emit(Q), (Q = ""));
      }
      if (X) ((X = !1), w?.());
    } else if (y.ctrl.t === "exit") K(y.ctrl.code, y.ctrl.signal);
    else if (y.ctrl.t === "ping") ee(encodeControlFrame({ t: "pong" }));
    else if (y.ctrl.t === "auth-required")
      if (auth)
        (logForDebugging(
          `[bg-pty] ${short ?? e}: host rejected auth token \u2014 roster ptyAuth poisoned; input is dead until the worker is re-keyed`,
          { level: "warn" },
        ),
          onAuthRequired?.());
      else
        logForDebugging(
          `[bg-pty] ${short ?? e}: host dropped input \u2014 DATA auth token missing (version skew; respawn the worker to re-key)`,
          { level: "warn" },
        );
  }
  function Ie() {
    if (R) return;
    let y = new Socket(),
      D = !1;
    (y.on("error", (N) => {
      ((De = getErrnoCode(N) === "ENOENT"), _e());
    }),
      y.once("close", () => {
        if (S === y) ((S = void 0), se());
        if (R) return;
        if (D && !A) {
          try {
            (process.kill(r, 0),
              logForDebugging("[bg-pty] dropped by host; reconnecting", { level: "debug" }),
              (G = ut),
              (O = 0),
              _e());
            return;
          } catch {}
          me("close");
          return;
        }
        _e();
      }),
      y.once("connect", () => {
        ((D = !0), (O = 0), (G = 0), (S = y), y.on("drain", se));
        let N = JC(e),
          M = `${N}.read`;
        if (
          (rename(N, M)
            .then(() => readSmallFileOrNull(M, 1048576))
            .then((B) => {
              let trimmed = (B ?? "").slice(0, 2000).trim();
              if (trimmed.length > 0)
                logForDebugging(
                  `[bg-pty] pre-connect stderr:
${trimmed}`,
                  { level: "warn" },
                );
            })
            .catch(() => {})
            .finally(() => unlink_3(M).catch(() => {})),
          ee(encodeControlFrame({ t: "pong" })),
          auth)
        )
          ee(encodeControlFrame({ t: "auth", token: auth }));
        for (let B of Pe.splice(0)) ee(B);
        ge = 0;
        let U = createFrameDecoder(dt, (B) => {
          (logForDebugging(`[bg-pty] frame error: ${B}`, { level: "warn" }), y.destroy());
        });
        y.on("data", U);
      }),
      y.connect(e));
  }
  function _e() {
    if (R || L) return;
    try {
      process.kill(r, 0);
    } catch {
      ((R = !0),
        readSmallFileOrNull(xN(e), 8388608)
          .then((D) => D ?? "")
          .then((D) => {
            if (!F && D.length > 0) g.emit(D.replaceAll(DAEMON_DETACH_APC, ""));
            (unlink_3(xN(e)).catch(() => {}), me("connect"));
          }));
      return;
    }
    if (G > 0 && --G === 0) {
      me("hung");
      return;
    }
    if (procStart !== void 0 && De && O >= 3)
      (logForDebugging(`[bg-pty] ${e}: ENOENT on adopt \u2014 sock file externally deleted; respawning`, {
        level: "warn",
      }),
        logEvent("tengu_bg_adopt_sock_unlinked", {}),
        (O = xe));
    if (O >= xe) {
      logForDebugging(`[bg-pty] ${e}: ${O} connect attempts failed; treating host as dead`, {
        level: "warn",
      });
      let D = Z && getProcessStartTime(r);
      if (r > 1 && (!Z || !D || Z === D))
        try {
          process.kill(-r, "SIGKILL");
        } catch {
          try {
            process.kill(r, "SIGKILL");
          } catch {}
        }
      ((R = !0),
        readSmallFileOrNull(xN(e), 8388608)
          .then((N) => N ?? "")
          .then((N) => {
            if (!F && N.length > 0) g.emit(N.replaceAll(DAEMON_DETACH_APC, ""));
            unlink_3(xN(e)).catch(() => {});
            let M = processWrapperArgv().length > 0,
              U = (B, j) => {
                if (!M) {
                  K(B, j);
                  return;
                }
                readSmallFileOrNull(JC(e), 1048576).then(
                  (Se) => K(B, j, firstVisibleLine(Se ?? "")),
                  () => K(B, j),
                );
              };
            if (hostProc) {
              let B = null;
              (hostProc.exited.then(
                (j) => {
                  ((B = { code: j, signal: hostProc.signalCode ?? void 0 }), U(j, B.signal));
                },
                () => U(-1),
              ),
                setTimeout(() => K(B ? B.code : -1, B?.signal), 1000).unref());
            } else if ((U(-1), M)) setTimeout(K, 1000, -1).unref();
          }));
      return;
    }
    let y = Me[Math.min(O, Me.length - 1)];
    (O++,
      (L = setTimeout(() => {
        ((L = void 0), Ie());
      }, y)),
      L.unref());
  }
  return (
    Ie(),
    {
      pid: r,
      replPid: () => P,
      replVersion: () => H,
      onRepl: (y) => {
        if (((V = y), P > 1 && T !== void 0)) y(P, T);
      },
      onResume: (y) => {
        w = y;
      },
      write: (y) => {
        if (A) return;
        let buffer = Buffer.from(y, "utf8"),
          N = byn - 1;
        for (let M = 0; M < buffer.length; M += N) ee(encodeDataFrame(buffer.subarray(M, M + N)));
      },
      resize: (y, D) => ee(encodeControlFrame({ t: "resize", cols: y, rows: D })),
      kill: (y) => {
        let D = y === "SIGKILL" ? "SIGKILL" : "SIGTERM",
          N = ee(encodeControlFrame({ t: "kill", sig: D }));
        if (r <= 1) return;
        if (getPlatform() === "windows" && D === "SIGTERM" && N) {
          if (C) clearTimeout(C);
          ((C = setTimeout(
            (M, U) => {
              if (!isSameProcess(M, Z)) {
                U(-1);
                return;
              }
              try {
                process.kill(M, "SIGKILL");
              } catch {
                U(-1);
              }
            },
            5000,
            r,
            K,
          )),
            C.unref());
          return;
        }
        try {
          process.kill(-r, D);
        } catch {
          try {
            process.kill(r, D);
          } catch {
            K(-1);
          }
        }
        if ((reapDetachedRepl(P, T, D), D === "SIGTERM" && !A)) {
          if (C) clearTimeout(C);
          ((C = setTimeout(
            (M, U) => {
              if (!isSameProcess(M, Z)) {
                U(-1);
                return;
              }
              reapDetachedRepl(P, T, "SIGKILL");
              try {
                process.kill(-M, "SIGKILL");
              } catch {
                try {
                  process.kill(M, "SIGKILL");
                } catch {
                  U(-1);
                }
              }
            },
            5000,
            r,
            K,
          )),
            C.unref());
        }
      },
      dispose: () => {
        if (((R = !0), L)) (clearTimeout(L), (L = void 0));
        if (C) (clearTimeout(C), (C = void 0));
        (se(), S?.destroy(), (S = void 0));
      },
      onData: (y) => ({ dispose: g.subscribe(y) }),
      onExit: (y) => ({ dispose: f.subscribe(y) }),
    }
  );
}
//@ chunk-89ebz077.js:9109-9211 placement
function firstVisibleLine(e) {
  return e
    .slice(0, 2000)
    .split(/\r?\n/)
    .map((r) => r.trim())
    .find((r) => Dr(qa(r)).length > 0);
}
//@ chunk-89ebz077.js:9211-9332 placement
function partialDetachSuffixLength(e) {
  let min = Math.min(DAEMON_DETACH_APC.length - 1, e.length);
  for (let s = min; s > 0; s--) if (e.endsWith(DAEMON_DETACH_APC.slice(0, s))) return s;
  return 0;
}
//@ chunk-89ebz077.js:9362-9399 placement
var Ve = [100, 250, 500, 1000, 2000],
  Fe = 30;
/**
 * 以 supervisor 角色连接后台会话 rendezvous socket：握手发送 pid 与认证，逐行解析消息；断开后按退避重连，超过次数放弃并记 tengu_bg_rv_connect_exhausted。返回 send/close。
 */
//@ chunk-89ebz077.js:9399-10318 placement
function connectRendezvousSocket(socketPath, onMessage, onDisconnect, onConnect, auth) {
  let socket,
    closed = !1,
    attempts = 0,
    gaveUp = !1,
    retryTimer;
  function connect() {
    if (closed) return;
    let S = new Socket_2(),
      R = !1;
    (S.on("error", () => scheduleRetry()),
      S.once("close", () => {
        if (socket === S) socket = void 0;
        if (closed) return;
        if (R) onDisconnect();
        scheduleRetry();
      }),
      S.once("connect", () => {
        ((R = !0),
          (attempts = 0),
          (gaveUp = !1),
          (socket = S),
          S.write(
            jsonStringify({ proto: BG_PROTO, role: "supervisor", supervisorPid: process.pid, auth: auth }) +
              `
`,
          ),
          onConnect?.(),
          readStreamLines(S, (A) => {
            let O;
            try {
              O = jsonParse(A);
            } catch {
              return;
            }
            if (O && typeof O === "object" && "type" in O) onMessage(O);
          }));
      }),
      S.connect(socketPath));
  }
  function scheduleRetry() {
    if (closed || retryTimer || gaveUp) return;
    if (attempts >= Fe) {
      ((gaveUp = !0),
        logForDebugging(
          `[bg-rv] ${socketPath}: ${attempts} connect attempts failed \u2014 giving up (pid-poll is liveness backstop)`,
          { level: "warn" },
        ),
        logEvent("tengu_bg_rv_connect_exhausted", { attempts: attempts }));
      return;
    }
    let S = Ve[Math.min(attempts, Ve.length - 1)];
    (attempts++,
      (retryTimer = setTimeout(() => {
        ((retryTimer = void 0), connect());
      }, S)),
      retryTimer.unref());
  }
  return (
    connect(),
    {
      send(S) {
        if (!socket || socket.destroyed) {
          if (attempts >= Fe) ((attempts = 0), (gaveUp = !1), scheduleRetry());
          return !1;
        }
        try {
          return (
            socket.write(
              jsonStringify(S) +
                `
`,
            ),
            !0
          );
        } catch (error) {
          return (logForDebugging(`[bg-rv] send failed: ${String(error)}`), !1);
        }
      },
      close() {
        if (((closed = !0), retryTimer)) clearTimeout(retryTimer);
        (socket?.destroy(), (socket = void 0));
      },
    }
  );
}
/**
 * 会话重启相关常量：重启延时、提示时间、次数与窗口限制，以及各种重启/未重启提示文字和需要重启的退出码。
 */
//@ chunk-89ebz077.js:10318-10726 placement
var RESTART_DELAY_MS = 1e4,
  RESTART_NOTICE_MS = 3000,
  MAX_RESTARTS = 20,
  RESTART_WINDOW = 3,
  RESTART_PENDING_NOTICE = `restarting this session in ${RESTART_DELAY_MS / 1000} seconds \u2014 anything typed before then is lost`,
  RESTART_NOW_NOTICE = "restarting this session now",
  NOT_RESTARTED_IDLE = "not restarted \u2014 this session was idle (the conversation is saved)",
  NOT_RESTARTED_STOPPED = "not restarted \u2014 this session was stopped (the conversation is saved)",
  NOT_RESTARTED_NO_TRANSCRIPT = "not restarted \u2014 this session has no saved conversation to resume",
  SIGNAL_EXIT_CODES = new Set([129, 143]);
//@ chunk-89ebz077.js:10726-10778 placement
function Je() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_revival_guard", !0);
}
//@ chunk-89ebz077.js:10778-10831 placement
function Tt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_greedy_crane", !0) !== !1;
}
//@ chunk-89ebz077.js:10831-10885 placement
function Dt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cosmic_cookie", !1) === !0;
}
//@ chunk-89ebz077.js:10885-11038 placement
function applySilentPeersFlag(e) {
  if (readFlagWithOverride("bot_protected_tengu_merry_bear", { safe: !0 }))
    delete e.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS;
  else e.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS = "1";
}

export {
  connectPtyHost,
  applySilentPeersFlag,
  Tt,
  createPtyActivityTracker,
  NOT_RESTARTED_NO_TRANSCRIPT,
  Je,
  Dt,
  SIGNAL_EXIT_CODES,
  MAX_RESTARTS,
  RESTART_WINDOW,
  NOT_RESTARTED_STOPPED,
  NOT_RESTARTED_IDLE,
  RESTART_NOTICE_MS,
  RESTART_PENDING_NOTICE,
  RESTART_NOW_NOTICE,
  RESTART_DELAY_MS,
  connectRendezvousSocket,
};
