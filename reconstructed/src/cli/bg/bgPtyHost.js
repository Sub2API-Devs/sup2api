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
  _yn,
  encodeDataFrame,
  RNe,
  encodeControlFrame,
  createFrameDecoder,
  vvt,
  MZn,
} from "../../utils/framedSocket.js";
import { killChildWithSignal } from "../../services/voice.js";
import { parseNumberWithSeparators } from "../../utils/envUtils.js";
import { setBgExitCause } from "../../utils/bgExitSidecars.js";
import { sleep } from "../../utils/sleep.js";
import { getExecExitPath } from "../../services/daemon/paths.js";
import { writeAndPublishSync } from "../../utils/atomicPublishWrite.js";
import { xN, JC } from "../../utils/sandbox/userNamespace.js";

//@ chunk-jx4rgw65.js:1337-1360 placement
var ae = 1048576,
  le = 5000;
/**
 * 后台 PTY 宿主主函数：解析 argv、启动子进程、转发 resize/信号、处理连接（约 6 KB）。
 */
//@ chunk-jx4rgw65.js:1360-7291 placement
async function runBgPtyHost(o) {
  let index = o.indexOf("--"),
    included = o.includes("--bg-spare", index + 1);
  if (!included) await detectHomebrew();
  if ((env.unset("CLAUDE_PTY_HOST_NO_STABLE_PATH"), index < 3 || index === o.length - 1))
    return failPtyHost(void 0, "bad argv: --bg-pty-host <sock> <cols> <rows> -- <file> [args...]");
  let s = o[0];
  (process.on("uncaughtException", (e) => failPtyHost(s, `uncaught: ${e?.stack ?? String(e)}`)),
    process.on("unhandledRejection", (e) => failPtyHost(s, `unhandledRejection: ${e?.stack ?? String(e)}`)));
  let d = Number(o[1]) || 200,
    S = Number(o[2]) || 50,
    h = o[index + 1],
    sliced = o.slice(index + 2),
    a = process.env.CLAUDE_PTY_HOST_EXEC === "1";
  delete process.env.CLAUDE_PTY_HOST_EXEC;
  let envClaudeBgPtyAuth = process.env.CLAUDE_BG_PTY_AUTH;
  delete process.env.CLAUDE_BG_PTY_AUTH;
  let envClaudeBgSocketTokensPath = process.env.CLAUDE_BG_SOCKET_TOKENS_PATH;
  if (envClaudeBgSocketTokensPath) {
    let e = await readSessionAuthFile(envClaudeBgSocketTokensPath);
    if (e?.ptyAuth) envClaudeBgPtyAuth = e.ptyAuth;
    else if (!envClaudeBgPtyAuth) await appendPtyHostLog(s, "tokens-file unreadable; DATA gate fail-open");
    if (a)
      (delete process.env.CLAUDE_BG_SOCKET_TOKENS_PATH,
        await unlink(envClaudeBgSocketTokensPath).catch(() => {}));
  }
  let X = env.CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS === "1";
  if (a) env.unset("CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS");
  let V = X || (!envClaudeBgPtyAuth && !envClaudeBgSocketTokensPath),
    j = env.CLAUDE_BG_SILENT_PEER_TIMEOUT_MS || le;
  if (getPlatform() !== "windows")
    try {
      setPriority(0, Math.min(getPriority(0) + 5, 19));
    } catch {}
  let L = createOutputBuffer(_yn),
    u = new Set(),
    weakMap = new WeakMap(),
    weakSet = new WeakSet(),
    weakSet_2 = new WeakSet(),
    m = !1,
    O,
    P = !1,
    U = !1,
    ppid = process.ppid,
    M = 0,
    v = null,
    W = appendPtyLog(process.env.CLAUDE_PTY_RECORD, d, S);
  function Y(e) {
    for (let r of u) {
      if (r.destroyed) {
        u.delete(r);
        continue;
      }
      if (r.writableLength > ae) {
        (r.destroy(), u.delete(r));
        continue;
      }
      r.write(e);
    }
  }
  let _, f;
  try {
    ((_ = new Bun.Terminal({
      cols: d,
      rows: S,
      data(e, r) {
        U = !0;
        let buffer = Buffer.from(r);
        if ((L.push(buffer), W?.write(buffer), u.size)) Y(encodeDataFrame(buffer));
      },
    })),
      (f = Bun.spawn([h, ...sliced], {
        cwd: process.cwd(),
        env: { ...process.env, TERM: "xterm-256color" },
        terminal: _,
        windowsHide: !0,
        detached: !1,
        ...(included && { argv0: "claude bg-spare" }),
      })));
  } catch (error) {
    failPtyHost(s, `spawn failed: ${String(error)}`);
  }
  function w(e, r) {
    if (!e.destroyed) e.write(r);
  }
  function q(e) {
    switch (e.t) {
      case "resize": {
        let r = Number(e.cols),
          c = Number(e.rows);
        if (r > 0 && r <= RNe && c > 0 && c <= RNe && !m && !P) {
          if ((_.resize(r, c), getPlatform() !== "windows")) {
            try {
              process.kill(-process.pid, "SIGWINCH");
            } catch {}
            try {
              f.kill("SIGWINCH");
            } catch {}
          }
        }
        return;
      }
      case "kill": {
        let r = e.sig === "SIGKILL" ? "SIGKILL" : "SIGTERM";
        try {
          P = killChildWithSignal(r, f, _) || P;
        } catch {}
        if (r === "SIGTERM")
          setTimeout(() => {
            if (!m)
              try {
                f.kill("SIGKILL");
              } catch {}
          }, 5000).unref();
        return;
      }
      default:
        return;
    }
  }
  await unlink(s).catch(() => {});
  let k = createServer((e) => {
    (e.on("error", () => e.destroy()), e.once("close", () => u.delete(e)));
    let r = !1,
      c = !1;
    function E() {
      if (r || e.destroyed) return;
      ((r = !0),
        (c = m),
        e.setTimeout(0),
        w(
          e,
          encodeControlFrame({
            t: "hello",
            replPid: f.pid,
            version:
              typeof {
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
              } < "u"
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
                : void 0,
          }),
        ));
      for (let chunk of L.chunks) w(e, encodeDataFrame(chunk));
      if (
        (w(e, encodeControlFrame({ t: "live" })),
        u.add(e),
        (M = 0),
        weakMap.set(e, { armed: !1, missed: 0 }),
        w(e, encodeControlFrame({ t: "ping" })),
        m)
      )
        (w(e, encodeControlFrame({ t: "exit", code: R, signal: N })), e.end(), O?.());
    }
    if (V) {
      if ((E(), m)) return;
    } else e.setTimeout(j, () => e.destroy());
    let y = createFrameDecoder(
      (l) => {
        if (!r) E();
        if (c) return;
        if (l.kind === vvt) {
          if (envClaudeBgPtyAuth && !weakSet.has(e)) {
            if (!weakSet_2.has(e)) (weakSet_2.add(e), w(e, encodeControlFrame({ t: "auth-required" })));
            return;
          }
          if (!m && !P) {
            if ((_.write(l.payload), a && getPlatform() !== "windows")) {
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
        } else if (l.kind === MZn)
          if (l.ctrl.t === "pong") {
            let T = weakMap.get(e);
            if (T) ((T.armed = !0), (T.missed = 0));
          } else if (l.ctrl.t === "auth") {
            if (timingSafeEqualStrings(l.ctrl.token, envClaudeBgPtyAuth)) weakSet.add(e);
          } else q(l.ctrl);
      },
      () => e.destroy(),
    );
    e.on("data", y);
  });
  (k.on("error", (e) => {
    try {
      f.kill("SIGTERM");
    } catch {}
    failPtyHost(s, `server error: ${String(e)}`);
  }),
    k.listen(s),
    k.unref());
  let A, C;
  if (getPlatform() !== "windows") {
    let e = parseNumberWithSeparators(process.env.CLAUDE_PTY_HEARTBEAT_MS) || 60000,
      r = 3;
    ((C = setInterval(() => {
      if (m) return;
      for (let y of u) {
        let l = weakMap.get(y);
        if (!l?.armed) continue;
        if ((l.missed++, l.missed >= 3)) (y.destroy(), u.delete(y));
        else w(y, encodeControlFrame({ t: "ping" }));
      }
    }, e)),
      C.unref());
    let c = parseNumberWithSeparators(process.env.CLAUDE_PTY_ORPHAN_CHECK_MS) || 2000,
      E = 30;
    ((A = setInterval(() => {
      if (m) return;
      if (process.ppid === ppid || u.size > 0) {
        M = 0;
        return;
      }
      if (++M < E) return;
      (clearInterval(A),
        clearInterval(C),
        appendPtyHostLog(s, `orphan watchdog: ppid ${ppid}\u2192${process.ppid}, no client for ${E * c}ms`),
        setBgExitCause("ptyhost_orphan_watchdog"));
      try {
        f.kill("SIGTERM");
      } catch {}
      setTimeout(() => {
        if (!m)
          try {
            f.kill("SIGKILL");
          } catch {}
      }, 5000).unref();
    }, c)),
      A.unref());
  }
  for (let e of ["SIGTERM", "SIGINT", "SIGHUP"])
    process.on(e, () => {
      if (v === e) return;
      try {
        f.kill(e === "SIGHUP" ? "SIGTERM" : e);
      } catch {}
    });
  if (a && getPlatform() !== "windows")
    process.on("SIGQUIT", () => {
      if (v === "SIGQUIT") return;
      try {
        f.kill("SIGQUIT");
      } catch {}
    });
  let R = 0;
  R = await f.exited;
  let F = 0;
  for (let e = 0; e < 20; e++)
    if (((U = !1), await sleep(5), U)) F = 0;
    else if (++F >= 2) break;
  let N = f.signalCode ?? void 0;
  if (((m = !0), a))
    try {
      let e = getExecExitPath(s),
        chunk = Buffer.concat(L.chunks).subarray(-4096),
        c = 0;
      while (c < 3 && c < chunk.length && (chunk[c] & 192) === 128) c++;
      let str = chunk.subarray(c).toString("utf8");
      writeAndPublishSync(e, JSON.stringify({ code: R, signal: N, tail: str }), 384);
    } catch {}
  if (A) clearInterval(A);
  if (C) clearInterval(C);
  if (!P) _.close();
  if ((W?.close(), a && getPlatform() !== "windows")) {
    v = "SIGHUP";
    try {
      process.kill(-process.pid, "SIGHUP");
    } catch {}
  }
  if ((Y(encodeControlFrame({ t: "exit", code: R, signal: N })), u.size === 0)) {
    let promise = new Promise((r) => {
      O = r;
    });
    await waitWithGrace(promise, a ? () => writeFile(xN(s), Buffer.concat(L.chunks)) : void 0);
  }
  for (let e of u) e.end();
  if (
    (await Promise.race([new Promise((e) => k.close(() => e())), sleep(2000, void 0, { unref: !0 })]),
    getPlatform() !== "windows")
  )
    await unlink(s).catch(() => {});
  process.exit(R);
}
//@ chunk-jx4rgw65.js:7291-7408 placement
async function waitWithGrace(o, t, n = 5000) {
  let s = (t ? t().catch(() => {}) : Promise.resolve()).then(() => sleep(n));
  await Promise.race([o, s]);
}
//@ chunk-jx4rgw65.js:7501-7858 placement
function createOutputBuffer(o) {
  let t = [],
    n = 0,
    s = 0;
  function d() {
    if (n > 0) ((t = t.slice(n)), (n = 0));
  }
  return {
    get chunks() {
      return (d(), t);
    },
    push(S) {
      (t.push(S), (s += S.length));
      while (s > o && t.length - n > 1) {
        s -= t[n++].length;
        for (let h = 0; h < 3;) {
          let p = t[n],
            a = 0;
          while (h + a < 3 && a < p.length && (p[a] & 192) === 128) a++;
          if (a > 0) ((t[n] = p.subarray(a)), (s -= a), (h += a));
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
  let bigint = process.hrtime.bigint(),
    d;
  try {
    d = createWriteStream(o, { flags: "w" });
  } catch {
    return;
  }
  d.on("error", () => {
    (d?.destroy(), (d = void 0));
  });
  let allocUnsafe = Buffer.allocUnsafe(8);
  return (
    allocUnsafe.writeUInt32BE(t, 0),
    allocUnsafe.writeUInt32BE(n, 4),
    d.write(allocUnsafe),
    {
      write(h) {
        if (!d) return;
        let allocUnsafe = Buffer.allocUnsafe(8 + h.length),
          a = Number((process.hrtime.bigint() - bigint) / 1000n);
        (allocUnsafe.writeUInt32BE(a >>> 0, 0),
          allocUnsafe.writeUInt32BE(h.length, 4),
          h.copy(allocUnsafe, 8),
          d.write(allocUnsafe));
      },
      close() {
        d?.end();
      },
    }
  );
}
//@ chunk-jx4rgw65.js:8289-8413 placement
async function appendPtyHostLog(o, t) {
  try {
    let n = JC(o);
    (await mkdir(dirname(n), { recursive: !0 }),
      await appendFile(
        n,
        `${new Date().toISOString()} ${t}
`,
      ));
  } catch {}
}
//@ chunk-jx4rgw65.js:8413-8538 placement
function failPtyHost(o, t) {
  if (o)
    try {
      let n = JC(o);
      (mkdirSync(dirname(n), { recursive: !0 }),
        appendFileSync(
          n,
          `${new Date().toISOString()} ${t}
`,
        ));
    } catch {}
  process.exit(1);
}
