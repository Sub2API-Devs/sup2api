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
import { getExecExitPath } from "../../services/daemon/paths.js";
import { writeAndPublishSync } from "../../utils/atomicPublishWrite.js";
import { ptyLateFile, ptyErrFile } from "../../utils/sandbox/userNamespace.js";

//@ chunk-jx4rgw65.js:1337-1360 placement
var MAX_PTY_WRITE_BUFFER_BYTES = 1048576;
var DEFAULT_SILENT_PEER_TIMEOUT_MS = 5000;
//@ chunk-jx4rgw65.js:1360-7291 placement
/**
 * 后台 PTY 宿主主函数：解析 argv、启动子进程、转发 resize/信号、处理连接（约 6 KB）。
 */
async function runBgPtyHost(o) {
  let index = o.indexOf("--");
  let included = o.includes("--bg-spare", index + 1);
  if (!included) await detectHomebrew();
  env.unset("CLAUDE_PTY_HOST_NO_STABLE_PATH");
  if (index < 3 || index === o.length - 1)
    return failPtyHost(undefined, "bad argv: --bg-pty-host <sock> <cols> <rows> -- <file> [args...]");
  let s = o[0];
  process.on("uncaughtException", (e) => failPtyHost(s, `uncaught: ${e?.stack ?? String(e)}`));
  process.on("unhandledRejection", (e) => failPtyHost(s, `unhandledRejection: ${e?.stack ?? String(e)}`));
  let d = Number(o[1]) || 200;
  let S = Number(o[2]) || 50;
  let h = o[index + 1];
  let sliced = o.slice(index + 2);
  let a = process.env.CLAUDE_PTY_HOST_EXEC === "1";
  delete process.env.CLAUDE_PTY_HOST_EXEC;
  let envClaudeBgPtyAuth = process.env.CLAUDE_BG_PTY_AUTH;
  delete process.env.CLAUDE_BG_PTY_AUTH;
  let envClaudeBgSocketTokensPath = process.env.CLAUDE_BG_SOCKET_TOKENS_PATH;
  if (envClaudeBgSocketTokensPath) {
    let sessionAuthFile = await readSessionAuthFile(envClaudeBgSocketTokensPath);
    if (sessionAuthFile?.ptyAuth) envClaudeBgPtyAuth = sessionAuthFile.ptyAuth;
    else if (!envClaudeBgPtyAuth) await appendPtyHostLog(s, "tokens-file unreadable; DATA gate fail-open");
    if (a) {
      delete process.env.CLAUDE_BG_SOCKET_TOKENS_PATH;
      await unlink(envClaudeBgSocketTokensPath).catch(() => {});
    }
  }
  let X = env.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS === "1";
  if (a) env.unset("CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS");
  let V = X || (!envClaudeBgPtyAuth && !envClaudeBgSocketTokensPath);
  let CLAUDE_BG_SILENT_PEER_TIMEOUT_MS =
    env.CLAUDE_BG_SILENT_PEER_TIMEOUT_MS || DEFAULT_SILENT_PEER_TIMEOUT_MS;
  if (getPlatform() !== "windows")
    try {
      setPriority(0, Math.min(getPriority(0) + 5, 19));
    } catch {}
  let outputBuffer = createOutputBuffer(MAX_CONTROL_FRAME_BYTES);
  let u = new Set();
  let weakMap = new WeakMap();
  let weakSet = new WeakSet();
  let weakSet_2 = new WeakSet();
  let m = false;
  let O;
  let P = false;
  let U = false;
  let ppid = process.ppid;
  let M = 0;
  let v = null;
  let W = appendPtyLog(process.env.CLAUDE_PTY_RECORD, d, S);
  function Y(e) {
    for (let r of u) {
      if (r.destroyed) {
        u.delete(r);
        continue;
      }
      if (r.writableLength > MAX_PTY_WRITE_BUFFER_BYTES) {
        r.destroy();
        u.delete(r);
        continue;
      }
      r.write(e);
    }
  }
  let handle;
  let child;
  try {
    handle = new Bun.Terminal({
      cols: d,
      rows: S,
      data(e, r) {
        U = true;
        let buffer = Buffer.from(r);
        outputBuffer.push(buffer);
        W?.write(buffer);
        if (u.size) Y(encodeDataFrame(buffer));
      },
    });
    child = Bun.spawn([h, ...sliced], {
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
    failPtyHost(s, `spawn failed: ${String(error)}`);
  }
  function w(e, r) {
    if (!e.destroyed) e.write(r);
  }
  function q(ctrl) {
    switch (ctrl.t) {
      case "resize": {
        let r = Number(ctrl.cols);
        let c = Number(ctrl.rows);
        if (r > 0 && r <= SOCKET_IDLE_TIMEOUT_MS && c > 0 && c <= SOCKET_IDLE_TIMEOUT_MS && !m && !P) {
          handle.resize(r, c);
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
          P = killChildWithSignal(signal, child, handle) || P;
        } catch {}
        if (signal === "SIGTERM")
          setTimeout(() => {
            if (!m)
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
  await unlink(s).catch(() => {});
  let server = createServer((e) => {
    e.on("error", () => e.destroy());
    e.once("close", () => u.delete(e));
    let r = false;
    let c = false;
    function E() {
      if (r || e.destroyed) return;
      r = true;
      c = m;
      e.setTimeout(0);
      w(
        e,
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
      for (let chunk of outputBuffer.chunks) w(e, encodeDataFrame(chunk));
      w(
        e,
        encodeControlFrame({
          t: "live",
        }),
      );
      u.add(e);
      M = 0;
      weakMap.set(e, {
        armed: false,
        missed: 0,
      });
      w(
        e,
        encodeControlFrame({
          t: "ping",
        }),
      );
      if (m) {
        w(
          e,
          encodeControlFrame({
            t: "exit",
            code: R,
            signal,
          }),
        );
        e.end();
        O?.();
      }
    }
    if (V) {
      E();
      if (m) return;
    } else e.setTimeout(CLAUDE_BG_SILENT_PEER_TIMEOUT_MS, () => e.destroy());
    let frameDecoder = createFrameDecoder(
      (l) => {
        if (!r) E();
        if (c) return;
        if (l.kind === DATA_FRAME_KIND) {
          if (envClaudeBgPtyAuth && !weakSet.has(e)) {
            if (!weakSet_2.has(e)) {
              weakSet_2.add(e);
              w(
                e,
                encodeControlFrame({
                  t: "auth-required",
                }),
              );
            }
            return;
          }
          if (!m && !P) {
            handle.write(l.payload);
            if (a && getPlatform() !== "windows") {
              let T = l.payload.includes(3) ? "SIGINT" : l.payload.includes(28) ? "SIGQUIT" : null;
              if (T) {
                v = T;
                try {
                  process.kill(-process.pid, T);
                } catch {}
                setImmediate(() => {
                  v = null;
                });
              }
            }
          }
        } else if (l.kind === CONTROL_FRAME_KIND)
          if (l.ctrl.t === "pong") {
            let T = weakMap.get(e);
            if (T) {
              T.armed = true;
              T.missed = 0;
            }
          } else if (l.ctrl.t === "auth") {
            if (timingSafeEqualStrings(l.ctrl.token, envClaudeBgPtyAuth)) weakSet.add(e);
          } else q(l.ctrl);
      },
      () => e.destroy(),
    );
    e.on("data", frameDecoder);
  });
  server.on("error", (e) => {
    try {
      child.kill("SIGTERM");
    } catch {}
    failPtyHost(s, `server error: ${String(e)}`);
  });
  server.listen(s);
  server.unref();
  let A;
  let C;
  if (getPlatform() !== "windows") {
    let e = parseNumberWithSeparators(process.env.CLAUDE_PTY_HEARTBEAT_MS) || 60000;
    let r = 3;
    C = setInterval(() => {
      if (m) return;
      for (let y of u) {
        let l = weakMap.get(y);
        if (!l?.armed) continue;
        l.missed++;
        if (l.missed >= 3) {
          y.destroy();
          u.delete(y);
        } else
          w(
            y,
            encodeControlFrame({
              t: "ping",
            }),
          );
      }
    }, e);
    C.unref();
    let c = parseNumberWithSeparators(process.env.CLAUDE_PTY_ORPHAN_CHECK_MS) || 2000;
    let E = 30;
    A = setInterval(() => {
      if (m) return;
      if (process.ppid === ppid || u.size > 0) {
        M = 0;
        return;
      }
      if (++M < E) return;
      clearInterval(A);
      clearInterval(C);
      appendPtyHostLog(s, `orphan watchdog: ppid ${ppid}\u2192${process.ppid}, no client for ${E * c}ms`);
      setBgExitCause("ptyhost_orphan_watchdog");
      try {
        child.kill("SIGTERM");
      } catch {}
      setTimeout(() => {
        if (!m)
          try {
            child.kill("SIGKILL");
          } catch {}
      }, 5000).unref();
    }, c);
    A.unref();
  }
  for (let e of ["SIGTERM", "SIGINT", "SIGHUP"])
    process.on(e, () => {
      if (v === e) return;
      try {
        child.kill(e === "SIGHUP" ? "SIGTERM" : e);
      } catch {}
    });
  if (a && getPlatform() !== "windows")
    process.on("SIGQUIT", () => {
      if (v === "SIGQUIT") return;
      try {
        child.kill("SIGQUIT");
      } catch {}
    });
  let R = 0;
  R = await child.exited;
  let F = 0;
  for (let idx = 0; idx < 20; idx++) {
    U = false;
    await sleep(5);
    if (U) F = 0;
    else if (++F >= 2) break;
  }
  let signal = child.signalCode ?? undefined;
  m = true;
  if (a)
    try {
      let execExitPath = getExecExitPath(s);
      let chunk = Buffer.concat(outputBuffer.chunks).subarray(-4096);
      let c = 0;
      while (c < 3 && c < chunk.length && (chunk[c] & 192) === 128) c++;
      let tail = chunk.subarray(c).toString("utf8");
      writeAndPublishSync(
        execExitPath,
        JSON.stringify({
          code: R,
          signal,
          tail,
        }),
        384,
      );
    } catch {}
  if (A) clearInterval(A);
  if (C) clearInterval(C);
  if (!P) handle.close();
  W?.close();
  if (a && getPlatform() !== "windows") {
    v = "SIGHUP";
    try {
      process.kill(-process.pid, "SIGHUP");
    } catch {}
  }
  Y(
    encodeControlFrame({
      t: "exit",
      code: R,
      signal,
    }),
  );
  if (u.size === 0) {
    let promise = new Promise((resolve) => {
      O = resolve;
    });
    await waitWithGrace(
      promise,
      a ? () => writeFile(ptyLateFile(s), Buffer.concat(outputBuffer.chunks)) : undefined,
    );
  }
  for (let e of u) e.end();
  await Promise.race([
    new Promise((resolve) => server.close(() => resolve())),
    sleep(2000, undefined, {
      unref: true,
    }),
  ]);
  if (getPlatform() !== "windows") await unlink(s).catch(() => {});
  process.exit(R);
}
//@ chunk-jx4rgw65.js:7291-7408 placement
async function waitWithGrace(promise, t, n = 5000) {
  let s = (t ? t().catch(() => {}) : Promise.resolve()).then(() => sleep(n));
  await Promise.race([promise, s]);
}
//@ chunk-jx4rgw65.js:7501-7858 placement
function createOutputBuffer(o) {
  let t = [];
  let n = 0;
  let s = 0;
  function d() {
    if (n > 0) {
      t = t.slice(n);
      n = 0;
    }
  }
  return {
    get chunks() {
      d();
      return t;
    },
    push(S) {
      t.push(S);
      s += S.length;
      while (s > o && t.length - n > 1) {
        s -= t[n++].length;
        for (let h = 0; h < 3;) {
          let p = t[n];
          let a = 0;
          while (h + a < 3 && a < p.length && (p[a] & 192) === 128) a++;
          if (a > 0) {
            t[n] = p.subarray(a);
            s -= a;
            h += a;
          }
          if (t[n].length > 0 || t.length - n === 1) break;
          n++;
        }
      }
      if (n >= t.length - n) d();
    },
  };
}
//@ chunk-jx4rgw65.js:7858-8289 placement
function appendPtyLog(o, t, n) {
  if (!o) return;
  let s = process.hrtime.bigint();
  let d;
  try {
    d = createWriteStream(o, {
      flags: "w",
    });
  } catch {
    return;
  }
  d.on("error", () => {
    d?.destroy();
    d = undefined;
  });
  let S = Buffer.allocUnsafe(8);
  S.writeUInt32BE(t, 0);
  S.writeUInt32BE(n, 4);
  d.write(S);
  return {
    write(h) {
      if (!d) return;
      let p = Buffer.allocUnsafe(8 + h.length);
      let a = Number((process.hrtime.bigint() - s) / 1000n);
      p.writeUInt32BE(a >>> 0, 0);
      p.writeUInt32BE(h.length, 4);
      h.copy(p, 8);
      d.write(p);
    },
    close() {
      d?.end();
    },
  };
}
//@ chunk-jx4rgw65.js:8289-8413 placement
async function appendPtyHostLog(o, t) {
  try {
    let n = ptyErrFile(o);
    await mkdir(dirname(n), {
      recursive: true,
    });
    await appendFile(
      n,
      `${new Date().toISOString()} ${t}
`,
    );
  } catch {}
}
//@ chunk-jx4rgw65.js:8413-8538 placement
function failPtyHost(o, t) {
  if (o)
    try {
      let n = ptyErrFile(o);
      mkdirSync(dirname(n), {
        recursive: true,
      });
      appendFileSync(
        n,
        `${new Date().toISOString()} ${t}
`,
      );
    } catch {}
  process.exit(1);
}
