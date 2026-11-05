/**
 * services/daemon/ptyHostClient.ts
 *
 * 2.1.316 新增：pty 宿主客户端
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v6a0t823.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { ptyErrFile, ptyLateFile } from "./paths.js";
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

//@ chunk-v6a0t823.js:2750-2785 placement
/**
 * 匹配光标左移控制序列的正则。
 */
var ACTIVITY_POLL_MS = 2000;
var MAX_STATUS_DETAIL_CHARS = MAX_HEADLINE_LENGTH;
var CURSOR_BACK_RE = /\x1b\[\d*D/g;
//@ chunk-v6a0t823.js:2785-3564 placement
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
  function writeStatus(status, tempo) {
    let detail = truncateWithEllipsis(redactSecrets(lastLine), MAX_STATUS_DETAIL_CHARS);
    let key = `${status}|${tempo}|${detail}`;
    if (key === lastStatus) return;
    lastStatus = key;
    readJobState(jobDir, options)
      .then((jobState) =>
        jobState && !disposed
          ? writeStateAtomic(
              jobDir,
              {
                ...jobState,
                state: status,
                tempo,
                detail,
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
    feed(data) {
      let replaced = (
        hasControlSequences(data) ? stripAnsiPerLine(data.replace(CURSOR_BACK_RE, "\x00")) : data
      )
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
//@ chunk-v6a0t823.js:3693-3760 placement
/**
 * 可写缓冲检查间隔（50 毫秒）。
 */
var RECONNECT_BACKOFF_MS = [50, 100, 250, 500, 1000, 2000];
var MAX_RECONNECT_ATTEMPTS = 30;
var AUTH_RETRY_DELAY_MS = 4;
var CONNECT_TIMEOUT_MS = 1e4;
var MAX_SOCKET_WRITABLE_BYTES = 8 * MAX_FRAME_BYTES;
var WRITABLE_CHECK_INTERVAL_MS = 50;
//@ chunk-v6a0t823.js:3760-9177 placement
/**
 * 连接 pty 宿主进程，处理 utf8 流、认证要求、重连与退出。
 */
function connectPtyHost(socketPath, pid, options) {
  let { procStart, short, hostProc, auth, onAuthRequired } = options ?? {};
  let signal = createSignal();
  let signal_2 = createSignal();
  let onResume;
  let decoder = new StringDecoder("utf8");
  let socket;
  let closed = false;
  let exited = false;
  let attempts = 0;
  let authRetries = 0;
  let reconnectTimer;
  let killTimer;
  let writeStallTimer;
  let writableWatchTimer;
  let replPid = 0;
  let replProcStart;
  let onRepl;
  let replVersion;
  let helloSeen = false;
  let draining = false;
  let live = false;
  let pending = "";
  let sockMissing = false;
  let knownProcStart = procStart;
  if (knownProcStart === undefined)
    getProcessStartTimeAsync(pid, {
      skipCache: true,
    }).then((processStartTime) => {
      knownProcStart = processStartTime;
    });
  let queued = [];
  let queuedBytes = 0;
  function sendOrQueue(frame) {
    if (socket) {
      if (socket.destroyed) return false;
      if (!socket.write(frame)) {
        if (!writeStallTimer) {
          writeStallTimer = setTimeout(() => {
            writeStallTimer = undefined;
            socket?.destroy();
          }, CONNECT_TIMEOUT_MS);
          writeStallTimer.unref();
        }
        if (!writableWatchTimer && socket.writableLength > MAX_SOCKET_WRITABLE_BYTES) {
          writableWatchTimer = setTimeout(() => {
            writableWatchTimer = undefined;
            if (socket && !socket.destroyed && socket.writableLength > MAX_SOCKET_WRITABLE_BYTES) {
              clearWriteTimers();
              socket.destroy();
            }
          }, WRITABLE_CHECK_INTERVAL_MS);
          writableWatchTimer.unref();
        }
      }
      return true;
    }
    if (queuedBytes < 2 * MAX_FRAME_BYTES) {
      queued.push(frame);
      queuedBytes += frame.length;
    }
    return false;
  }
  function clearWriteTimers() {
    if (writeStallTimer) {
      clearTimeout(writeStallTimer);
      writeStallTimer = undefined;
    }
    if (writableWatchTimer) {
      clearTimeout(writableWatchTimer);
      writableWatchTimer = undefined;
    }
  }
  function finishExit(exitCode, signal_3, hostStderr) {
    if (exited) return;
    exited = true;
    closed = true;
    if (killTimer) {
      clearTimeout(killTimer);
      killTimer = undefined;
    }
    clearWriteTimers();
    socket?.destroy();
    socket = undefined;
    let tail = decoder.end();
    if (tail) signal.emit(tail);
    signal_2.emit({
      exitCode,
      signal: signal_3,
      hostStderr,
    });
  }
  function onHostCrash(via) {
    let stderrPromise = readSmallFileOrNull(ptyErrFile(socketPath), 1048576)
      .then((smallFileOrNull) => smallFileOrNull ?? "")
      .catch(() => "");
    stderrPromise.then((text) => {
      let trimmed = text.slice(0, 2000).trim();
      if (trimmed.length > 0)
        logForDebugging(`[bg-pty] host crash: ${trimmed}`, {
          level: "warn",
        });
      let errnoToken = [...trimmed.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
        (match) => !"/\\".includes(trimmed[match.index - 1] ?? "."),
      )?.[0];
      logEvent("tengu_bg_ptyhost_crash", {
        hadBreadcrumb: trimmed.length > 0,
        hadHello: helloSeen,
        via: fromEnum(via),
        short: short === undefined ? undefined : bgShort(short),
        stderr_errno: sanitizeErrnoTokenForTelemetry(errnoToken),
      });
    });
    sigtermThenKill(replPid ? [-pid, replPid] : [-pid], via !== "hung" ? undefined : knownProcStart);
    reapDetachedRepl(replPid, replProcStart);
    let wrapped = processWrapperArgv().length > 0;
    let finishWithStderr = wrapped
      ? (exitCode, signal) =>
          void stderrPromise.then(
            (text) => finishExit(exitCode, signal, firstVisibleLine(text)),
            () => finishExit(exitCode, signal),
          )
      : finishExit;
    if (hostProc) {
      let exitInfo = null;
      hostProc.exited.then(
        (code) => {
          exitInfo = {
            code,
            signal: hostProc.signalCode ?? undefined,
          };
          finishWithStderr(code, exitInfo.signal);
        },
        () => finishWithStderr(-1),
      );
      setTimeout(() => finishExit(exitInfo ? exitInfo.code : -1, exitInfo?.signal), 1000).unref();
      return;
    }
    finishWithStderr(-1);
    if (wrapped) setTimeout(finishExit, 1000, -1).unref();
  }
  function onFrame(frame) {
    if (frame.kind === DATA_FRAME_KIND) {
      if (!draining) {
        let text = decoder.write(frame.payload);
        if (live) signal.emit(text);
        else if (text.length > 0) {
          let text_2 = (pending + text).replaceAll(DAEMON_DETACH_APC, "");
          let carryLength = partialDetachSuffixLength(text_2);
          pending = carryLength > 0 ? text_2.slice(text_2.length - carryLength) : "";
          let emitText = carryLength > 0 ? text_2.slice(0, text_2.length - carryLength) : text_2;
          if (emitText.length > 0) signal.emit(emitText);
        }
      }
    } else if (frame.ctrl.t === "hello") {
      if (helloSeen) {
        draining = true;
        decoder.end();
        pending = "";
      } else unlink(ptyLateFile(socketPath)).catch(() => {});
      helloSeen = true;
      replPid = frame.ctrl.replPid;
      replVersion = frame.ctrl.version;
      replProcStart = undefined;
      if (replPid > 1 && getPlatform() !== "windows") {
        let pidValue = replPid;
        captureProcessStartTimeAsync(pidValue).then((procStartValue) => {
          if (replPid !== pidValue || exited || closed || procStartValue === undefined) return;
          replProcStart = procStartValue;
          onRepl?.(replPid, procStartValue);
        });
      }
    } else if (frame.ctrl.t === "live") {
      if (!live) {
        live = true;
        if (pending.length > 0) {
          signal.emit(pending);
          pending = "";
        }
      }
      if (draining) {
        draining = false;
        onResume?.();
      }
    } else if (frame.ctrl.t === "exit") finishExit(frame.ctrl.code, frame.ctrl.signal);
    else if (frame.ctrl.t === "ping")
      sendOrQueue(
        encodeControlFrame({
          t: "pong",
        }),
      );
    else if (frame.ctrl.t === "auth-required")
      if (auth) {
        logForDebugging(
          `[bg-pty] ${short ?? socketPath}: host rejected auth token \u2014 roster ptyAuth poisoned; input is dead until the worker is re-keyed`,
          {
            level: "warn",
          },
        );
        onAuthRequired?.();
      } else
        logForDebugging(
          `[bg-pty] ${short ?? socketPath}: host dropped input \u2014 DATA auth token missing (version skew; respawn the worker to re-key)`,
          {
            level: "warn",
          },
        );
  }
  function connect() {
    if (closed) return;
    let sock = new Socket();
    let connected = false;
    sock.on("error", (error) => {
      sockMissing = getErrnoCode(error) === "ENOENT";
      retry();
    });
    sock.once("close", () => {
      if (socket === sock) {
        socket = undefined;
        clearWriteTimers();
      }
      if (closed) return;
      if (connected && !exited) {
        try {
          process.kill(pid, 0);
          logForDebugging("[bg-pty] dropped by host; reconnecting", {
            level: "debug",
          });
          authRetries = AUTH_RETRY_DELAY_MS;
          attempts = 0;
          retry();
          return;
        } catch {}
        onHostCrash("close");
        return;
      }
      retry();
    });
    sock.once("connect", () => {
      connected = true;
      attempts = 0;
      authRetries = 0;
      socket = sock;
      sock.on("drain", clearWriteTimers);
      let errPath = ptyErrFile(socketPath);
      let readPath = `${errPath}.read`;
      rename(errPath, readPath)
        .then(() => readSmallFileOrNull(readPath, 1048576))
        .then((text) => {
          let trimmed = (text ?? "").slice(0, 2000).trim();
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
        .finally(() => unlink(readPath).catch(() => {}));
      sendOrQueue(
        encodeControlFrame({
          t: "pong",
        }),
      );
      if (auth)
        sendOrQueue(
          encodeControlFrame({
            t: "auth",
            token: auth,
          }),
        );
      for (let pendingFrame of queued.splice(0)) sendOrQueue(pendingFrame);
      queuedBytes = 0;
      let frameDecoder = createFrameDecoder(onFrame, (frameError) => {
        logForDebugging(`[bg-pty] frame error: ${frameError}`, {
          level: "warn",
        });
        sock.destroy();
      });
      sock.on("data", frameDecoder);
    });
    sock.connect(socketPath);
  }
  function retry() {
    if (closed || reconnectTimer) return;
    try {
      process.kill(pid, 0);
    } catch {
      closed = true;
      readSmallFileOrNull(ptyLateFile(socketPath), 8388608)
        .then((smallFileOrNull) => smallFileOrNull ?? "")
        .then((text) => {
          if (!helloSeen && text.length > 0) signal.emit(text.replaceAll(DAEMON_DETACH_APC, ""));
          unlink(ptyLateFile(socketPath)).catch(() => {});
          onHostCrash("connect");
        });
      return;
    }
    if (authRetries > 0 && --authRetries === 0) {
      onHostCrash("hung");
      return;
    }
    if (procStart !== undefined && sockMissing && attempts >= 3) {
      logForDebugging(
        `[bg-pty] ${socketPath}: ENOENT on adopt \u2014 sock file externally deleted; respawning`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_bg_adopt_sock_unlinked", {});
      attempts = MAX_RECONNECT_ATTEMPTS;
    }
    if (attempts >= MAX_RECONNECT_ATTEMPTS) {
      logForDebugging(`[bg-pty] ${socketPath}: ${attempts} connect attempts failed; treating host as dead`, {
        level: "warn",
      });
      let nowStart = knownProcStart && getProcessStartTime(pid);
      if (pid > 1 && (!knownProcStart || !nowStart || knownProcStart === nowStart))
        try {
          process.kill(-pid, "SIGKILL");
        } catch {
          try {
            process.kill(pid, "SIGKILL");
          } catch {}
        }
      closed = true;
      readSmallFileOrNull(ptyLateFile(socketPath), 8388608)
        .then((smallFileOrNull) => smallFileOrNull ?? "")
        .then((text) => {
          if (!helloSeen && text.length > 0) signal.emit(text.replaceAll(DAEMON_DETACH_APC, ""));
          unlink(ptyLateFile(socketPath)).catch(() => {});
          let wrapped = processWrapperArgv().length > 0;
          let finishCompat = (exitCode, signal) => {
            if (!wrapped) {
              finishExit(exitCode, signal);
              return;
            }
            readSmallFileOrNull(ptyErrFile(socketPath), 1048576).then(
              (smallFileOrNull) => finishExit(exitCode, signal, firstVisibleLine(smallFileOrNull ?? "")),
              () => finishExit(exitCode, signal),
            );
          };
          if (hostProc) {
            let exitInfo = null;
            hostProc.exited.then(
              (code) => {
                exitInfo = {
                  code,
                  signal: hostProc.signalCode ?? undefined,
                };
                finishCompat(code, exitInfo.signal);
              },
              () => finishCompat(-1),
            );
            setTimeout(() => finishExit(exitInfo ? exitInfo.code : -1, exitInfo?.signal), 1000).unref();
          } else {
            finishCompat(-1);
            if (wrapped) setTimeout(finishExit, 1000, -1).unref();
          }
        });
      return;
    }
    let backoffMs = RECONNECT_BACKOFF_MS[Math.min(attempts, RECONNECT_BACKOFF_MS.length - 1)];
    attempts++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, backoffMs);
    reconnectTimer.unref();
  }
  connect();
  return {
    pid,
    replPid: () => replPid,
    replVersion: () => replVersion,
    onRepl: (listener) => {
      onRepl = listener;
      if (replPid > 1 && replProcStart !== undefined) listener(replPid, replProcStart);
    },
    onResume: (listener) => {
      onResume = listener;
    },
    write: (data) => {
      if (exited) return;
      let buffer = Buffer.from(data, "utf8");
      let chunkBytes = MAX_FRAME_BYTES - 1;
      for (let offset = 0; offset < buffer.length; offset += chunkBytes)
        sendOrQueue(encodeDataFrame(buffer.subarray(offset, offset + chunkBytes)));
    },
    resize: (cols, rows) =>
      sendOrQueue(
        encodeControlFrame({
          t: "resize",
          cols,
          rows,
        }),
      ),
    kill: (sig) => {
      let finalSig = sig === "SIGKILL" ? "SIGKILL" : "SIGTERM";
      let sent = sendOrQueue(
        encodeControlFrame({
          t: "kill",
          sig: finalSig,
        }),
      );
      if (pid <= 1) return;
      if (getPlatform() === "windows" && finalSig === "SIGTERM" && sent) {
        if (killTimer) clearTimeout(killTimer);
        killTimer = setTimeout(
          (pidValue, finish) => {
            if (!isSameProcess(pidValue, knownProcStart)) {
              finish(-1);
              return;
            }
            try {
              process.kill(pidValue, "SIGKILL");
            } catch {
              finish(-1);
            }
          },
          5000,
          pid,
          finishExit,
        );
        killTimer.unref();
        return;
      }
      try {
        process.kill(-pid, finalSig);
      } catch {
        try {
          process.kill(pid, finalSig);
        } catch {
          finishExit(-1);
        }
      }
      reapDetachedRepl(replPid, replProcStart, finalSig);
      if (finalSig === "SIGTERM" && !exited) {
        if (killTimer) clearTimeout(killTimer);
        killTimer = setTimeout(
          (pidValue, finish) => {
            if (!isSameProcess(pidValue, knownProcStart)) {
              finish(-1);
              return;
            }
            reapDetachedRepl(replPid, replProcStart, "SIGKILL");
            try {
              process.kill(-pidValue, "SIGKILL");
            } catch {
              try {
                process.kill(pidValue, "SIGKILL");
              } catch {
                finish(-1);
              }
            }
          },
          5000,
          pid,
          finishExit,
        );
        killTimer.unref();
      }
    },
    dispose: () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      if (killTimer) {
        clearTimeout(killTimer);
        killTimer = undefined;
      }
      clearWriteTimers();
      socket?.destroy();
      socket = undefined;
    },
    onData: (listener) => ({
      dispose: signal.subscribe(listener),
    }),
    onExit: (listener) => ({
      dispose: signal_2.subscribe(listener),
    }),
  };
}
//@ chunk-v6a0t823.js:9177-9279 placement
function firstVisibleLine(text) {
  return text
    .slice(0, 2000)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => collapseWhitespace(stripAnsiPerLine(line)).length > 0);
}
//@ chunk-v6a0t823.js:9279-9400 placement
function partialDetachSuffixLength(text) {
  let min = Math.min(DAEMON_DETACH_APC.length - 1, text.length);
  for (let len = min; len > 0; len--) if (text.endsWith(DAEMON_DETACH_APC.slice(0, len))) return len;
  return 0;
}
//@ chunk-v6a0t823.js:9430-9467 placement
/**
 * rendezvous 最多重连次数（30），超过后放弃。
 */
var RENDEZVOUS_RETRY_DELAYS_MS = [100, 250, 500, 1000, 2000];
var MAX_RENDEZVOUS_ATTEMPTS = 30;
//@ chunk-v6a0t823.js:9467-10386 placement
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
    let sock = new Socket();
    let connected = false;
    sock.on("error", () => scheduleRetry());
    sock.once("close", () => {
      if (socket === sock) socket = undefined;
      if (closed) return;
      if (connected) onDisconnect();
      scheduleRetry();
    });
    sock.once("connect", () => {
      connected = true;
      attempts = 0;
      gaveUp = false;
      socket = sock;
      sock.write(
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
      readStreamLines(sock, (attempts) => {
        let gaveUp;
        try {
          gaveUp = jsonParse(attempts);
        } catch {
          return;
        }
        if (gaveUp && typeof gaveUp === "object" && "type" in gaveUp) onMessage(gaveUp);
      });
    });
    sock.connect(socketPath);
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
    let message = RENDEZVOUS_RETRY_DELAYS_MS[Math.min(attempts, RENDEZVOUS_RETRY_DELAYS_MS.length - 1)];
    attempts++;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      connect();
    }, message);
    retryTimer.unref();
  }
  connect();
  return {
    send(timer) {
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
          jsonStringify(timer) +
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
//@ chunk-v6a0t823.js:10386-10794 placement
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
//@ chunk-v6a0t823.js:10794-10846 placement
/**
 * 读 tengu_bg_revival_guard（默认开）。
 */
function isRevivalGuardEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_revival_guard", true);
}
//@ chunk-v6a0t823.js:10846-10899 placement
/**
 * 读 tengu_greedy_crane（默认开）。
 */
function isGreedyCraneEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_greedy_crane", true) !== false;
}
//@ chunk-v6a0t823.js:10899-10953 placement
/**
 * 读 tengu_cosmic_cookie（默认关）。
 */
function isCosmicCookieEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cosmic_cookie", false) === true;
}
//@ chunk-v6a0t823.js:10953-11106 placement
function applySilentPeersFlag(env) {
  if (
    readFlagWithOverride("bot_protected_tengu_merry_bear", {
      safe: true,
    })
  )
    delete env.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS;
  else env.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS = "1";
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
