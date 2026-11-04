/**
 * cli/bg/bgPtyHost.ts
 *
 * 2.1.316 新增：--bg-pty-host：后台会话的伪终端宿主进程（转发窗口尺寸、信号、输出缓冲与日志）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jx4rgw65.js (7)
 * attribution: placement 7
 */
import { unlink, writeFile, mkdir, appendFile } from "fs/promises";
import { setPriority, getPriority } from "os";
import { createServer } from "net";
import { createWriteStream, mkdirSync, appendFileSync } from "fs";
import { dirname } from "path";
import { detectHomebrew } from "../../utils/nativeInstaller/packageManagers.js";
import { env } from "../../utils/env.js";
import { readSessionAuthFile, timingSafeEqualStrings } from "../../utils/sessionRecords.js";
import { getPlatform } from "../../utils/platform.js";
import {
  MAX_CONTROL_FRAME_BYTES,
  encodeDataFrame,
  SOCKET_IDLE_TIMEOUT_MS,
  encodeControlFrame,
  createFrameDecoder,
  DATA_FRAME_KIND,
  CONTROL_FRAME_KIND,
} from "../../utils/framedSocket.js";
import { killChildWithSignal } from "../../services/voice.js";
import { parseNumberWithSeparators } from "../../utils/envUtils.js";
import { setBgExitCause } from "../../utils/bgExitSidecars.js";
import { sleep } from "../../utils/sleep.js";
import { getExecExitPath, ptyLateFile, ptyErrFile } from "../../services/daemon/paths.js";
import { writeAndPublishSync } from "../../utils/atomicPublishWrite.js";

//@ chunk-jx4rgw65.js:1337-1360 placement
var MAX_PTY_WRITE_BUFFER_BYTES = 1048576;
var DEFAULT_SILENT_PEER_TIMEOUT_MS = 5000;
//@ chunk-jx4rgw65.js:1360-7291 placement
/**
 * 后台 PTY 宿主主函数：解析 argv、启动子进程、转发 resize/信号、处理连接（约 6 KB）。
 */
async function runBgPtyHost(argv) {
  let index = argv.indexOf("--");
  let included = argv.includes("--bg-spare", index + 1);
  if (!included) await detectHomebrew();
  env.unset("CLAUDE_PTY_HOST_NO_STABLE_PATH");
  if (index < 3 || index === argv.length - 1)
    return failPtyHost(undefined, "bad argv: --bg-pty-host <sock> <cols> <rows> -- <file> [args...]");
  let sockPath = argv[0];
  process.on("uncaughtException", (error) =>
    failPtyHost(sockPath, `uncaught: ${error?.stack ?? String(error)}`),
  );
  process.on("unhandledRejection", (reason) =>
    failPtyHost(sockPath, `unhandledRejection: ${reason?.stack ?? String(reason)}`),
  );
  let cols = Number(argv[1]) || 200;
  let rows = Number(argv[2]) || 50;
  let execPath = argv[index + 1];
  let sliced = argv.slice(index + 2);
  let isExecMode = process.env.CLAUDE_PTY_HOST_EXEC === "1";
  delete process.env.CLAUDE_PTY_HOST_EXEC;
  let envClaudeBgPtyAuth = process.env.CLAUDE_BG_PTY_AUTH;
  delete process.env.CLAUDE_BG_PTY_AUTH;
  let envClaudeBgSocketTokensPath = process.env.CLAUDE_BG_SOCKET_TOKENS_PATH;
  if (envClaudeBgSocketTokensPath) {
    let sessionAuthFile = await readSessionAuthFile(envClaudeBgSocketTokensPath);
    if (sessionAuthFile?.ptyAuth) envClaudeBgPtyAuth = sessionAuthFile.ptyAuth;
    else if (!envClaudeBgPtyAuth)
      await appendPtyHostLog(sockPath, "tokens-file unreadable; DATA gate fail-open");
    if (isExecMode) {
      delete process.env.CLAUDE_BG_SOCKET_TOKENS_PATH;
      await unlink(envClaudeBgSocketTokensPath).catch(() => {});
    }
  }
  let admitSilentPeers = env.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS === "1";
  if (isExecMode) env.unset("CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS");
  let allowsSilentPeer = admitSilentPeers || (!envClaudeBgPtyAuth && !envClaudeBgSocketTokensPath);
  let CLAUDE_BG_SILENT_PEER_TIMEOUT_MS =
    env.CLAUDE_BG_SILENT_PEER_TIMEOUT_MS || DEFAULT_SILENT_PEER_TIMEOUT_MS;
  if (getPlatform() !== "windows")
    try {
      setPriority(0, Math.min(getPriority(0) + 5, 19));
    } catch {}
  let outputBuffer = createOutputBuffer(MAX_CONTROL_FRAME_BYTES);
  let clients = new Set();
  let weakMap = new WeakMap();
  let weakSet = new WeakSet();
  let weakSet_2 = new WeakSet();
  let isExiting = false;
  let resolveLateExit;
  let didSignalChild = false;
  let sawOutput = false;
  let ppid = process.ppid;
  let orphanMisses = 0;
  let forwardedSignal = null;
  let recorder = appendPtyLog(process.env.CLAUDE_PTY_RECORD, cols, rows);
  function broadcast(chunk) {
    for (let socket of clients) {
      if (socket.destroyed) {
        clients.delete(socket);
        continue;
      }
      if (socket.writableLength > MAX_PTY_WRITE_BUFFER_BYTES) {
        socket.destroy();
        clients.delete(socket);
        continue;
      }
      socket.write(chunk);
    }
  }
  let handle;
  let child;
  try {
    handle = new Bun.Terminal({
      cols,
      rows,
      data(terminal, data) {
        sawOutput = true;
        let buffer = Buffer.from(data);
        outputBuffer.push(buffer);
        recorder?.write(buffer);
        if (clients.size) broadcast(encodeDataFrame(buffer));
      },
    });
    child = Bun.spawn([execPath, ...sliced], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: "xterm-256color",
      },
      terminal: handle,
      windowsHide: true,
      detached: false,
      ...(included && {
        argv0: "claude bg-spare",
      }),
    });
  } catch (error) {
    failPtyHost(sockPath, `spawn failed: ${String(error)}`);
  }
  function writeUnlessClosed(stream, frame) {
    if (!stream.destroyed) stream.write(frame);
  }
  function applyControl(ctrl) {
    switch (ctrl.t) {
      case "resize": {
        let width = Number(ctrl.cols);
        let height = Number(ctrl.rows);
        if (
          width > 0 &&
          width <= SOCKET_IDLE_TIMEOUT_MS &&
          height > 0 &&
          height <= SOCKET_IDLE_TIMEOUT_MS &&
          !isExiting &&
          !didSignalChild
        ) {
          handle.resize(width, height);
          if (getPlatform() !== "windows") {
            try {
              process.kill(-process.pid, "SIGWINCH");
            } catch {}
            try {
              child.kill("SIGWINCH");
            } catch {}
          }
        }
        return;
      }
      case "kill": {
        let signal = ctrl.sig === "SIGKILL" ? "SIGKILL" : "SIGTERM";
        try {
          didSignalChild = killChildWithSignal(signal, child, handle) || didSignalChild;
        } catch {}
        if (signal === "SIGTERM")
          setTimeout(() => {
            if (!isExiting)
              try {
                child.kill("SIGKILL");
              } catch {}
          }, 5000).unref();
        return;
      }
      default:
        return;
    }
  }
  await unlink(sockPath).catch(() => {});
  let server = createServer((socket) => {
    socket.on("error", () => socket.destroy());
    socket.once("close", () => clients.delete(socket));
    let isHellod = false;
    let isSnapshotted = false;
    function sendHello() {
      if (isHellod || socket.destroyed) return;
      isHellod = true;
      isSnapshotted = isExiting;
      socket.setTimeout(0);
      writeUnlessClosed(
        socket,
        encodeControlFrame({
          t: "hello",
          replPid: child.pid,
          version:
            typeof {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            } !== "undefined"
              ? {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.316",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-10-30T23:28:13Z",
                  GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION
              : undefined,
        }),
      );
      for (let chunk of outputBuffer.chunks) writeUnlessClosed(socket, encodeDataFrame(chunk));
      writeUnlessClosed(
        socket,
        encodeControlFrame({
          t: "live",
        }),
      );
      clients.add(socket);
      orphanMisses = 0;
      weakMap.set(socket, {
        armed: false,
        missed: 0,
      });
      writeUnlessClosed(
        socket,
        encodeControlFrame({
          t: "ping",
        }),
      );
      if (isExiting) {
        writeUnlessClosed(
          socket,
          encodeControlFrame({
            t: "exit",
            code: exitCode,
            signal,
          }),
        );
        socket.end();
        resolveLateExit?.();
      }
    }
    if (allowsSilentPeer) {
      sendHello();
      if (isExiting) return;
    } else socket.setTimeout(CLAUDE_BG_SILENT_PEER_TIMEOUT_MS, () => socket.destroy());
    let frameDecoder = createFrameDecoder(
      (frame) => {
        if (!isHellod) sendHello();
        if (isSnapshotted) return;
        if (frame.kind === DATA_FRAME_KIND) {
          if (envClaudeBgPtyAuth && !weakSet.has(socket)) {
            if (!weakSet_2.has(socket)) {
              weakSet_2.add(socket);
              writeUnlessClosed(
                socket,
                encodeControlFrame({
                  t: "auth-required",
                }),
              );
            }
            return;
          }
          if (!isExiting && !didSignalChild) {
            handle.write(frame.payload);
            if (isExecMode && getPlatform() !== "windows") {
              let forwarded = frame.payload.includes(3)
                ? "SIGINT"
                : frame.payload.includes(28)
                  ? "SIGQUIT"
                  : null;
              if (forwarded) {
                forwardedSignal = forwarded;
                try {
                  process.kill(-process.pid, forwarded);
                } catch {}
                setImmediate(() => {
                  forwardedSignal = null;
                });
              }
            }
          }
        } else if (frame.kind === CONTROL_FRAME_KIND)
          if (frame.ctrl.t === "pong") {
            let state = weakMap.get(socket);
            if (state) {
              state.armed = true;
              state.missed = 0;
            }
          } else if (frame.ctrl.t === "auth") {
            if (timingSafeEqualStrings(frame.ctrl.token, envClaudeBgPtyAuth)) weakSet.add(socket);
          } else applyControl(frame.ctrl);
      },
      () => socket.destroy(),
    );
    socket.on("data", frameDecoder);
  });
  server.on("error", (error) => {
    try {
      child.kill("SIGTERM");
    } catch {}
    failPtyHost(sockPath, `server error: ${String(error)}`);
  });
  server.listen(sockPath);
  server.unref();
  let orphanWatchdog;
  let heartbeat;
  if (getPlatform() !== "windows") {
    let heartbeatMs = parseNumberWithSeparators(process.env.CLAUDE_PTY_HEARTBEAT_MS) || 60000;
    let maxMissed = 3;
    heartbeat = setInterval(() => {
      if (isExiting) return;
      for (let client of clients) {
        let state = weakMap.get(client);
        if (!state?.armed) continue;
        state.missed++;
        if (state.missed >= 3) {
          client.destroy();
          clients.delete(client);
        } else
          writeUnlessClosed(
            client,
            encodeControlFrame({
              t: "ping",
            }),
          );
      }
    }, heartbeatMs);
    heartbeat.unref();
    let orphanCheckMs = parseNumberWithSeparators(process.env.CLAUDE_PTY_ORPHAN_CHECK_MS) || 2000;
    let orphanLimit = 30;
    orphanWatchdog = setInterval(() => {
      if (isExiting) return;
      if (process.ppid === ppid || clients.size > 0) {
        orphanMisses = 0;
        return;
      }
      if (++orphanMisses < orphanLimit) return;
      clearInterval(orphanWatchdog);
      clearInterval(heartbeat);
      appendPtyHostLog(
        sockPath,
        `orphan watchdog: ppid ${ppid}\u2192${process.ppid}, no client for ${orphanLimit * orphanCheckMs}ms`,
      );
      setBgExitCause("ptyhost_orphan_watchdog");
      try {
        child.kill("SIGTERM");
      } catch {}
      setTimeout(() => {
        if (!isExiting)
          try {
            child.kill("SIGKILL");
          } catch {}
      }, 5000).unref();
    }, orphanCheckMs);
    orphanWatchdog.unref();
  }
  for (let signalName of ["SIGTERM", "SIGINT", "SIGHUP"])
    process.on(signalName, () => {
      if (forwardedSignal === signalName) return;
      try {
        child.kill(signalName === "SIGHUP" ? "SIGTERM" : signalName);
      } catch {}
    });
  if (isExecMode && getPlatform() !== "windows")
    process.on("SIGQUIT", () => {
      if (forwardedSignal === "SIGQUIT") return;
      try {
        child.kill("SIGQUIT");
      } catch {}
    });
  let exitCode = 0;
  exitCode = await child.exited;
  let quietTicks = 0;
  for (let idx = 0; idx < 20; idx++) {
    sawOutput = false;
    await sleep(5);
    if (sawOutput) quietTicks = 0;
    else if (++quietTicks >= 2) break;
  }
  let signal = child.signalCode ?? undefined;
  isExiting = true;
  if (isExecMode)
    try {
      let execExitPath = getExecExitPath(sockPath);
      let chunk = Buffer.concat(outputBuffer.chunks).subarray(-4096);
      let trimmed = 0;
      while (trimmed < 3 && trimmed < chunk.length && (chunk[trimmed] & 192) === 128) trimmed++;
      let tail = chunk.subarray(trimmed).toString("utf8");
      writeAndPublishSync(
        execExitPath,
        JSON.stringify({
          code: exitCode,
          signal,
          tail,
        }),
        384,
      );
    } catch {}
  if (orphanWatchdog) clearInterval(orphanWatchdog);
  if (heartbeat) clearInterval(heartbeat);
  if (!didSignalChild) handle.close();
  recorder?.close();
  if (isExecMode && getPlatform() !== "windows") {
    forwardedSignal = "SIGHUP";
    try {
      process.kill(-process.pid, "SIGHUP");
    } catch {}
  }
  broadcast(
    encodeControlFrame({
      t: "exit",
      code: exitCode,
      signal,
    }),
  );
  if (clients.size === 0) {
    let promise = new Promise((resolve) => {
      resolveLateExit = resolve;
    });
    await waitWithGrace(
      promise,
      isExecMode ? () => writeFile(ptyLateFile(sockPath), Buffer.concat(outputBuffer.chunks)) : undefined,
    );
  }
  for (let client of clients) client.end();
  await Promise.race([
    new Promise((resolve) => server.close(() => resolve())),
    sleep(2000, undefined, {
      unref: true,
    }),
  ]);
  if (getPlatform() !== "windows") await unlink(sockPath).catch(() => {});
  process.exit(exitCode);
}
//@ chunk-jx4rgw65.js:7291-7408 placement
async function waitWithGrace(promise, grace, graceMs = 5000) {
  let graceDelay = (grace ? grace().catch(() => {}) : Promise.resolve()).then(() => sleep(graceMs));
  await Promise.race([promise, graceDelay]);
}
//@ chunk-jx4rgw65.js:7501-7858 placement
function createOutputBuffer(maxBytes) {
  let chunks = [];
  let dropFrom = 0;
  let totalBytes = 0;
  function compact() {
    if (dropFrom > 0) {
      chunks = chunks.slice(dropFrom);
      dropFrom = 0;
    }
  }
  return {
    get chunks() {
      compact();
      return chunks;
    },
    push(chunk) {
      chunks.push(chunk);
      totalBytes += chunk.length;
      while (totalBytes > maxBytes && chunks.length - dropFrom > 1) {
        totalBytes -= chunks[dropFrom++].length;
        for (let trimmed = 0; trimmed < 3;) {
          let head = chunks[dropFrom];
          let skip = 0;
          while (trimmed + skip < 3 && skip < head.length && (head[skip] & 192) === 128) skip++;
          if (skip > 0) {
            chunks[dropFrom] = head.subarray(skip);
            totalBytes -= skip;
            trimmed += skip;
          }
          if (chunks[dropFrom].length > 0 || chunks.length - dropFrom === 1) break;
          dropFrom++;
        }
      }
      if (dropFrom >= chunks.length - dropFrom) compact();
    },
  };
}
//@ chunk-jx4rgw65.js:7858-8289 placement
function appendPtyLog(logPath, cols, rows) {
  if (!logPath) return;
  let startNs = process.hrtime.bigint();
  let stream;
  try {
    stream = createWriteStream(logPath, {
      flags: "w",
    });
  } catch {
    return;
  }
  stream.on("error", () => {
    stream?.destroy();
    stream = undefined;
  });
  let header = Buffer.allocUnsafe(8);
  header.writeUInt32BE(cols, 0);
  header.writeUInt32BE(rows, 4);
  stream.write(header);
  return {
    write(chunk) {
      if (!stream) return;
      let frame = Buffer.allocUnsafe(8 + chunk.length);
      let elapsedUs = Number((process.hrtime.bigint() - startNs) / 1000n);
      frame.writeUInt32BE(elapsedUs >>> 0, 0);
      frame.writeUInt32BE(chunk.length, 4);
      chunk.copy(frame, 8);
      stream.write(frame);
    },
    close() {
      stream?.end();
    },
  };
}
//@ chunk-jx4rgw65.js:8289-8413 placement
async function appendPtyHostLog(sessionId, message) {
  try {
    let path = ptyErrFile(sessionId);
    await mkdir(dirname(path), {
      recursive: true,
    });
    await appendFile(
      path,
      `${new Date().toISOString()} ${message}
`,
    );
  } catch {}
}
//@ chunk-jx4rgw65.js:8413-8538 placement
function failPtyHost(sessionId, message) {
  if (sessionId)
    try {
      let path = ptyErrFile(sessionId);
      mkdirSync(dirname(path), {
        recursive: true,
      });
      appendFileSync(
        path,
        `${new Date().toISOString()} ${message}
`,
      );
    } catch {}
  process.exit(1);
}
export { runBgPtyHost };
