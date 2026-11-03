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
import { unlink, rename } from "fs/promises";
import { Socket } from "net";
import { MAX_HEADLINE_LENGTH, truncateWithEllipsis } from "../sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../teamMemorySync/secretScanner.js";
import { readJobState, writeStateAtomic } from "./jobState.js";
import { logError } from "../../utils/log.js";
import { hasControlSequences } from "../../ink/wrapAnsi.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import {
  MAX_FRAME_BYTES,
  DATA_FRAME_KIND,
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
import { ptyErrFile, ptyLateFile } from "../../utils/sandbox/userNamespace.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { bgShort } from "./roster.js";
import { sanitizeErrnoTokenForTelemetry, getErrnoCode } from "../../utils/errors.js";
import { processWrapperArgv } from "../../utils/processWrapper.js";
import { DAEMON_DETACH_APC, BG_PROTO } from "./leaseProtocol.js";
import { getPlatform } from "../../utils/platform.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { readStreamLines } from "../../utils/streamDestroy.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";

//@ chunk-89ebz077.js:2682-2717 placement
/**
 * 匹配光标左移控制序列的正则。
 */
var ACTIVITY_POLL_MS = 2000;
var MAX_STATUS_DETAIL_CHARS = MAX_HEADLINE_LENGTH;
var CURSOR_BACK_RE = /\x1b\[\d*D/g;
//@ chunk-89ebz077.js:2717-3496 placement
/**
 * 跟踪 pty 输出以更新后台作业状态：记录最后一行（脱敏截断），定时根据近期输出与是否停在半行判断 working/active、blocked 或 idle 并写入状态行（去重）。
 */
function createPtyActivityTracker(jobDir, options) {
  let partialLine = "";
  let lastLine = "";
  let atLineStart = true;
  let lastOutputAt = 0;
  let lastStatus = "";
  let disposed = false;
  function writeStatus(w, E) {
    let S = truncateWithEllipsis(redactSecrets(lastLine), MAX_STATUS_DETAIL_CHARS);
    let R = `${w}|${E}|${S}`;
    if (R === lastStatus) return;
    lastStatus = R;
    readJobState(jobDir, options)
      .then((jobState) =>
        jobState && !disposed
          ? writeStateAtomic(
              jobDir,
              {
                ...jobState,
                state: w,
                tempo: E,
                detail: S,
                updatedAt: new Date().toISOString(),
              },
              options,
            )
          : undefined,
      )
      .catch(logError);
  }
  let timer = setInterval(() => {
    if (lastOutputAt > 0 && Date.now() - lastOutputAt < ACTIVITY_POLL_MS) writeStatus("working", "active");
    else if (!atLineStart && lastLine) writeStatus("blocked", "blocked");
    else writeStatus("working", "idle");
  }, ACTIVITY_POLL_MS);
  timer.unref();
  return {
    feed(w) {
      let replaced = (hasControlSequences(w) ? stripAnsiPerLine(w.replace(CURSOR_BACK_RE, "\x00")) : w)
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
      lastOutputAt = Date.now();
      partialLine += replaced;
      let lines = partialLine.split(`
`);
      partialLine = lines.pop() ?? "";
      atLineStart = partialLine === "";
      lastLine = partialLine.trim() || lines.findLast((line) => line.trim())?.trim() || lastLine;
      if (partialLine.length > MAX_STATUS_DETAIL_CHARS * 2)
        partialLine = partialLine.slice(-MAX_STATUS_DETAIL_CHARS);
      if (lastStatus.startsWith("blocked|")) writeStatus("working", "active");
    },
    dispose() {
      disposed = true;
      clearInterval(timer);
    },
    get lastLine() {
      return truncateWithEllipsis(redactSecrets(lastLine), MAX_STATUS_DETAIL_CHARS);
    },
  };
}
//@ chunk-89ebz077.js:3625-3692 placement
/**
 * 可写缓冲检查间隔（50 毫秒）。
 */
var RECONNECT_BACKOFF_MS = [50, 100, 250, 500, 1000, 2000];
var MAX_RECONNECT_ATTEMPTS = 30;
var AUTH_RETRY_DELAY_MS = 4;
var CONNECT_TIMEOUT_MS = 1e4;
var MAX_SOCKET_WRITABLE_BYTES = 8 * MAX_FRAME_BYTES;
var WRITABLE_CHECK_INTERVAL_MS = 50;
//@ chunk-89ebz077.js:3692-9109 placement
/**
 * 连接 pty 宿主进程，处理 utf8 流、认证要求、重连与退出。
 */
function connectPtyHost(e, pid, s) {
  let { procStart, short, hostProc, auth, onAuthRequired } = s ?? {};
  let signal = createSignal();
  let signal_2 = createSignal();
  let w;
  let E = new StringDecoder("utf8");
  let S;
  let R = false;
  let A = false;
  let O = 0;
  let G = 0;
  let L;
  let C;
  let x;
  let W;
  let P = 0;
  let T;
  let V;
  let H;
  let F = false;
  let X = false;
  let ie = false;
  let Q = "";
  let De = false;
  let Z = procStart;
  if (Z === undefined)
    getProcessStartTimeAsync(pid, {
      skipCache: true,
    }).then((processStartTime) => {
      Z = processStartTime;
    });
  let Pe = [];
  let ge = 0;
  function ee(y) {
    if (S) {
      if (S.destroyed) return false;
      if (!S.write(y)) {
        if (!x) {
          x = setTimeout(() => {
            x = undefined;
            S?.destroy();
          }, CONNECT_TIMEOUT_MS);
          x.unref();
        }
        if (!W && S.writableLength > MAX_SOCKET_WRITABLE_BYTES) {
          W = setTimeout(() => {
            W = undefined;
            if (S && !S.destroyed && S.writableLength > MAX_SOCKET_WRITABLE_BYTES) {
              se();
              S.destroy();
            }
          }, WRITABLE_CHECK_INTERVAL_MS);
          W.unref();
        }
      }
      return true;
    }
    if (ge < 2 * MAX_FRAME_BYTES) {
      Pe.push(y);
      ge += y.length;
    }
    return false;
  }
  function se() {
    if (x) {
      clearTimeout(x);
      x = undefined;
    }
    if (W) {
      clearTimeout(W);
      W = undefined;
    }
  }
  function K(exitCode, signal_3, hostStderr) {
    if (A) return;
    A = true;
    R = true;
    if (C) {
      clearTimeout(C);
      C = undefined;
    }
    se();
    S?.destroy();
    S = undefined;
    let M = E.end();
    if (M) signal.emit(M);
    signal_2.emit({
      exitCode,
      signal: signal_3,
      hostStderr,
    });
  }
  function me(y) {
    let D = readSmallFileOrNull(ptyErrFile(e), 1048576)
      .then((smallFileOrNull) => smallFileOrNull ?? "")
      .catch(() => "");
    D.then((U) => {
      let trimmed = U.slice(0, 2000).trim();
      if (trimmed.length > 0)
        logForDebugging(`[bg-pty] host crash: ${trimmed}`, {
          level: "warn",
        });
      let j = [...trimmed.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
        (Se) => !"/\\".includes(trimmed[Se.index - 1] ?? "."),
      )?.[0];
      logEvent("tengu_bg_ptyhost_crash", {
        hadBreadcrumb: trimmed.length > 0,
        hadHello: F,
        via: fromEnum(y),
        short: short === undefined ? undefined : bgShort(short),
        stderr_errno: sanitizeErrnoTokenForTelemetry(j),
      });
    });
    sigtermThenKill(P ? [-pid, P] : [-pid], y !== "hung" ? undefined : Z);
    reapDetachedRepl(P, T);
    let N = processWrapperArgv().length > 0;
    let M = N
      ? (U, B) =>
          void D.then(
            (j) => K(U, B, firstVisibleLine(j)),
            () => K(U, B),
          )
      : K;
    if (hostProc) {
      let U = null;
      hostProc.exited.then(
        (B) => {
          U = {
            code: B,
            signal: hostProc.signalCode ?? undefined,
          };
          M(B, U.signal);
        },
        () => M(-1),
      );
      setTimeout(() => K(U ? U.code : -1, U?.signal), 1000).unref();
      return;
    }
    M(-1);
    if (N) setTimeout(K, 1000, -1).unref();
  }
  function dt(y) {
    if (y.kind === DATA_FRAME_KIND) {
      if (!X) {
        let D = E.write(y.payload);
        if (ie) signal.emit(D);
        else if (D.length > 0) {
          let replaced = (Q + D).replaceAll(DAEMON_DETACH_APC, "");
          let M = partialDetachSuffixLength(replaced);
          Q = M > 0 ? replaced.slice(replaced.length - M) : "";
          let U = M > 0 ? replaced.slice(0, replaced.length - M) : replaced;
          if (U.length > 0) signal.emit(U);
        }
      }
    } else if (y.ctrl.t === "hello") {
      if (F) {
        X = true;
        E.end();
        Q = "";
      } else unlink(ptyLateFile(e)).catch(() => {});
      F = true;
      P = y.ctrl.replPid;
      H = y.ctrl.version;
      T = undefined;
      if (P > 1 && getPlatform() !== "windows") {
        let D = P;
        captureProcessStartTimeAsync(D).then((N) => {
          if (P !== D || A || R || N === undefined) return;
          T = N;
          V?.(P, N);
        });
      }
    } else if (y.ctrl.t === "live") {
      if (!ie) {
        ie = true;
        if (Q.length > 0) {
          signal.emit(Q);
          Q = "";
        }
      }
      if (X) {
        X = false;
        w?.();
      }
    } else if (y.ctrl.t === "exit") K(y.ctrl.code, y.ctrl.signal);
    else if (y.ctrl.t === "ping")
      ee(
        encodeControlFrame({
          t: "pong",
        }),
      );
    else if (y.ctrl.t === "auth-required")
      if (auth) {
        logForDebugging(
          `[bg-pty] ${short ?? e}: host rejected auth token \u2014 roster ptyAuth poisoned; input is dead until the worker is re-keyed`,
          {
            level: "warn",
          },
        );
        onAuthRequired?.();
      } else
        logForDebugging(
          `[bg-pty] ${short ?? e}: host dropped input \u2014 DATA auth token missing (version skew; respawn the worker to re-key)`,
          {
            level: "warn",
          },
        );
  }
  function Ie() {
    if (R) return;
    let y = new Socket();
    let D = false;
    y.on("error", (N) => {
      De = getErrnoCode(N) === "ENOENT";
      _e();
    });
    y.once("close", () => {
      if (S === y) {
        S = undefined;
        se();
      }
      if (R) return;
      if (D && !A) {
        try {
          process.kill(pid, 0);
          logForDebugging("[bg-pty] dropped by host; reconnecting", {
            level: "debug",
          });
          G = AUTH_RETRY_DELAY_MS;
          O = 0;
          _e();
          return;
        } catch {}
        me("close");
        return;
      }
      _e();
    });
    y.once("connect", () => {
      D = true;
      O = 0;
      G = 0;
      S = y;
      y.on("drain", se);
      let N = ptyErrFile(e);
      let M = `${N}.read`;
      rename(N, M)
        .then(() => readSmallFileOrNull(M, 1048576))
        .then((B) => {
          let trimmed = (B ?? "").slice(0, 2000).trim();
          if (trimmed.length > 0)
            logForDebugging(
              `[bg-pty] pre-connect stderr:
${trimmed}`,
              {
                level: "warn",
              },
            );
        })
        .catch(() => {})
        .finally(() => unlink(M).catch(() => {}));
      ee(
        encodeControlFrame({
          t: "pong",
        }),
      );
      if (auth)
        ee(
          encodeControlFrame({
            t: "auth",
            token: auth,
          }),
        );
      for (let B of Pe.splice(0)) ee(B);
      ge = 0;
      let frameDecoder = createFrameDecoder(dt, (B) => {
        logForDebugging(`[bg-pty] frame error: ${B}`, {
          level: "warn",
        });
        y.destroy();
      });
      y.on("data", frameDecoder);
    });
    y.connect(e);
  }
  function _e() {
    if (R || L) return;
    try {
      process.kill(pid, 0);
    } catch {
      R = true;
      readSmallFileOrNull(ptyLateFile(e), 8388608)
        .then((smallFileOrNull) => smallFileOrNull ?? "")
        .then((D) => {
          if (!F && D.length > 0) signal.emit(D.replaceAll(DAEMON_DETACH_APC, ""));
          unlink(ptyLateFile(e)).catch(() => {});
          me("connect");
        });
      return;
    }
    if (G > 0 && --G === 0) {
      me("hung");
      return;
    }
    if (procStart !== undefined && De && O >= 3) {
      logForDebugging(`[bg-pty] ${e}: ENOENT on adopt \u2014 sock file externally deleted; respawning`, {
        level: "warn",
      });
      logEvent("tengu_bg_adopt_sock_unlinked", {});
      O = MAX_RECONNECT_ATTEMPTS;
    }
    if (O >= MAX_RECONNECT_ATTEMPTS) {
      logForDebugging(`[bg-pty] ${e}: ${O} connect attempts failed; treating host as dead`, {
        level: "warn",
      });
      let D = Z && getProcessStartTime(pid);
      if (pid > 1 && (!Z || !D || Z === D))
        try {
          process.kill(-pid, "SIGKILL");
        } catch {
          try {
            process.kill(pid, "SIGKILL");
          } catch {}
        }
      R = true;
      readSmallFileOrNull(ptyLateFile(e), 8388608)
        .then((smallFileOrNull) => smallFileOrNull ?? "")
        .then((N) => {
          if (!F && N.length > 0) signal.emit(N.replaceAll(DAEMON_DETACH_APC, ""));
          unlink(ptyLateFile(e)).catch(() => {});
          let M = processWrapperArgv().length > 0;
          let U = (B, signal) => {
            if (!M) {
              K(B, signal);
              return;
            }
            readSmallFileOrNull(ptyErrFile(e), 1048576).then(
              (smallFileOrNull) => K(B, signal, firstVisibleLine(smallFileOrNull ?? "")),
              () => K(B, signal),
            );
          };
          if (hostProc) {
            let B = null;
            hostProc.exited.then(
              (j) => {
                B = {
                  code: j,
                  signal: hostProc.signalCode ?? undefined,
                };
                U(j, B.signal);
              },
              () => U(-1),
            );
            setTimeout(() => K(B ? B.code : -1, B?.signal), 1000).unref();
          } else {
            U(-1);
            if (M) setTimeout(K, 1000, -1).unref();
          }
        });
      return;
    }
    let y = RECONNECT_BACKOFF_MS[Math.min(O, RECONNECT_BACKOFF_MS.length - 1)];
    O++;
    L = setTimeout(() => {
      L = undefined;
      Ie();
    }, y);
    L.unref();
  }
  Ie();
  return {
    pid,
    replPid: () => P,
    replVersion: () => H,
    onRepl: (y) => {
      V = y;
      if (P > 1 && T !== undefined) y(P, T);
    },
    onResume: (y) => {
      w = y;
    },
    write: (y) => {
      if (A) return;
      let buffer = Buffer.from(y, "utf8");
      let N = MAX_FRAME_BYTES - 1;
      for (let M = 0; M < buffer.length; M += N) ee(encodeDataFrame(buffer.subarray(M, M + N)));
    },
    resize: (cols, rows) =>
      ee(
        encodeControlFrame({
          t: "resize",
          cols,
          rows,
        }),
      ),
    kill: (y) => {
      let D = y === "SIGKILL" ? "SIGKILL" : "SIGTERM";
      let N = ee(
        encodeControlFrame({
          t: "kill",
          sig: D,
        }),
      );
      if (pid <= 1) return;
      if (getPlatform() === "windows" && D === "SIGTERM" && N) {
        if (C) clearTimeout(C);
        C = setTimeout(
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
          pid,
          K,
        );
        C.unref();
        return;
      }
      try {
        process.kill(-pid, D);
      } catch {
        try {
          process.kill(pid, D);
        } catch {
          K(-1);
        }
      }
      reapDetachedRepl(P, T, D);
      if (D === "SIGTERM" && !A) {
        if (C) clearTimeout(C);
        C = setTimeout(
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
          pid,
          K,
        );
        C.unref();
      }
    },
    dispose: () => {
      R = true;
      if (L) {
        clearTimeout(L);
        L = undefined;
      }
      if (C) {
        clearTimeout(C);
        C = undefined;
      }
      se();
      S?.destroy();
      S = undefined;
    },
    onData: (y) => ({
      dispose: signal.subscribe(y),
    }),
    onExit: (y) => ({
      dispose: signal_2.subscribe(y),
    }),
  };
}
//@ chunk-89ebz077.js:9109-9211 placement
function firstVisibleLine(e) {
  return e
    .slice(0, 2000)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((r) => collapseWhitespace(stripAnsiPerLine(r)).length > 0);
}
//@ chunk-89ebz077.js:9211-9332 placement
function partialDetachSuffixLength(e) {
  let min = Math.min(DAEMON_DETACH_APC.length - 1, e.length);
  for (let s = min; s > 0; s--) if (e.endsWith(DAEMON_DETACH_APC.slice(0, s))) return s;
  return 0;
}
//@ chunk-89ebz077.js:9362-9399 placement
/**
 * rendezvous 最多重连次数（30），超过后放弃。
 */
var RENDEZVOUS_RETRY_DELAYS_MS = [100, 250, 500, 1000, 2000];
var MAX_RENDEZVOUS_ATTEMPTS = 30;
//@ chunk-89ebz077.js:9399-10318 placement
/**
 * 以 supervisor 角色连接后台会话 rendezvous socket：握手发送 pid 与认证，逐行解析消息；断开后按退避重连，超过次数放弃并记 tengu_bg_rv_connect_exhausted。返回 send/close。
 */
function connectRendezvousSocket(socketPath, onMessage, onDisconnect, onConnect, auth) {
  let socket;
  let closed = false;
  let attempts = 0;
  let gaveUp = false;
  let retryTimer;
  function connect() {
    if (closed) return;
    let S = new Socket();
    let R = false;
    S.on("error", () => scheduleRetry());
    S.once("close", () => {
      if (socket === S) socket = undefined;
      if (closed) return;
      if (R) onDisconnect();
      scheduleRetry();
    });
    S.once("connect", () => {
      R = true;
      attempts = 0;
      gaveUp = false;
      socket = S;
      S.write(
        jsonStringify({
          proto: BG_PROTO,
          role: "supervisor",
          supervisorPid: process.pid,
          auth,
        }) +
          `
`,
      );
      onConnect?.();
      readStreamLines(S, (A) => {
        let O;
        try {
          O = jsonParse(A);
        } catch {
          return;
        }
        if (O && typeof O === "object" && "type" in O) onMessage(O);
      });
    });
    S.connect(socketPath);
  }
  function scheduleRetry() {
    if (closed || retryTimer || gaveUp) return;
    if (attempts >= MAX_RENDEZVOUS_ATTEMPTS) {
      gaveUp = true;
      logForDebugging(
        `[bg-rv] ${socketPath}: ${attempts} connect attempts failed \u2014 giving up (pid-poll is liveness backstop)`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_bg_rv_connect_exhausted", {
        attempts,
      });
      return;
    }
    let S = RENDEZVOUS_RETRY_DELAYS_MS[Math.min(attempts, RENDEZVOUS_RETRY_DELAYS_MS.length - 1)];
    attempts++;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      connect();
    }, S);
    retryTimer.unref();
  }
  connect();
  return {
    send(S) {
      if (!socket || socket.destroyed) {
        if (attempts >= MAX_RENDEZVOUS_ATTEMPTS) {
          attempts = 0;
          gaveUp = false;
          scheduleRetry();
        }
        return false;
      }
      try {
        socket.write(
          jsonStringify(S) +
            `
`,
        );
        return true;
      } catch (error) {
        logForDebugging(`[bg-rv] send failed: ${String(error)}`);
        return false;
      }
    },
    close() {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.destroy();
      socket = undefined;
    },
  };
}
//@ chunk-89ebz077.js:10318-10726 placement
/**
 * 会话重启相关常量：重启延时、提示时间、次数与窗口限制，以及各种重启/未重启提示文字和需要重启的退出码。
 */
var RESTART_DELAY_MS = 1e4;
var RESTART_NOTICE_MS = 3000;
var MAX_RESTARTS = 20;
var RESTART_WINDOW = 3;
var RESTART_PENDING_NOTICE = `restarting this session in ${RESTART_DELAY_MS / 1000} seconds \u2014 anything typed before then is lost`;
var RESTART_NOW_NOTICE = "restarting this session now";
var NOT_RESTARTED_IDLE = "not restarted \u2014 this session was idle (the conversation is saved)";
var NOT_RESTARTED_STOPPED = "not restarted \u2014 this session was stopped (the conversation is saved)";
var NOT_RESTARTED_NO_TRANSCRIPT = "not restarted \u2014 this session has no saved conversation to resume";
var SIGNAL_EXIT_CODES = new Set([129, 143]);
//@ chunk-89ebz077.js:10726-10778 placement
/**
 * 读 tengu_bg_revival_guard（默认开）。
 */
function isRevivalGuardEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_revival_guard", true);
}
//@ chunk-89ebz077.js:10778-10831 placement
/**
 * 读 tengu_greedy_crane（默认开）。
 */
function isGreedyCraneEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_greedy_crane", true) !== false;
}
//@ chunk-89ebz077.js:10831-10885 placement
/**
 * 读 tengu_cosmic_cookie（默认关）。
 */
function isCosmicCookieEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cosmic_cookie", false) === true;
}
//@ chunk-89ebz077.js:10885-11038 placement
function applySilentPeersFlag(e) {
  if (
    readFlagWithOverride("bot_protected_tengu_merry_bear", {
      safe: true,
    })
  )
    delete e.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS;
  else e.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS = "1";
}
export {
  connectPtyHost,
  applySilentPeersFlag,
  isGreedyCraneEnabled,
  createPtyActivityTracker,
  NOT_RESTARTED_NO_TRANSCRIPT,
  isRevivalGuardEnabled,
  isCosmicCookieEnabled,
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
