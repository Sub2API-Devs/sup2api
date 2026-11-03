/**
 * selfHostedRunner/git/fetchRun.ts
 *
 * BYOC 运行 git 子进程（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (3)
 * attribution: placement 3
 */
import { spawn } from "child_process";
import {
  MAX_SERVER_PROGRESS_CAP_MS,
  SAFE_GIT_CONFIG_ARGS,
  SAFE_GIT_EXTRA_ARGS,
  SAFE_GIT_ENV,
  SKIP_WATCHDOG_SUBCOMMANDS,
  GIT_WATCHDOG_MS,
  MIN_SERVER_PROGRESS_CAP_MS,
  resolveServerProgressCap,
  PROGRESS_LOG_INTERVAL_MS,
  parseGitProgress,
  noteServerProgress,
  DELTA_COMPLETE_SILENCE_MS,
  isDeltasComplete,
  isProgressAdvance,
  RECEIVING_OBJECTS,
  shouldLogProgress,
  STDERR_TAIL_CHARS,
  NO_DATA_WARN_MS,
  gitStderrSummary,
  MAX_GIT_OUTPUT_TAIL_CHARS,
} from "./fetchErrors.js";
import { gitConfigPairs } from "./proxyTrust.js";
import {
  remoteProxyArgs,
  credentialHelperArgs,
  LFS_NO_LOCKVERIFY_ARGS,
  SHR_GIT_PROXY_TOKEN,
} from "./gitCredentials.js";
import { redactGitArg, hoistFatalLines, redactToken } from "./tokenRedact.js";
import { GIT_NO_PROMPT_ENV } from "../../utils/plugins/marketplaceManager.js";
import { createTimeoutSignal } from "./repoSources.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";

//@ chunk-t3sg9e26.js:27339-27377 placement
var WATCHDOG_SUBCOMMAND_SET = new Set(["fetch", "ls-remote"]);
//@ chunk-t3sg9e26.js:27377-27501 placement
function gitSubcommandOf(e) {
  for (let j = 0; j < e.length; j++) {
    if (e[j] === "-c" || e[j] === "--git-dir" || e[j] === "-C") {
      j++;
      continue;
    }
    return e[j];
  }
  return;
}
//@ chunk-t3sg9e26.js:27501-32452 placement
/**
 * 运行 git 子进程（代理、进度超时、无数据检测）
 */
async function runGit(e, repoPath, t, r, s = MAX_SERVER_PROGRESS_CAP_MS, o) {
  let a = e.getAuthToken !== undefined;
  let c = gitSubcommandOf(t);
  let d = c !== undefined && WATCHDOG_SUBCOMMAND_SET.has(c);
  let u = a && d ? e.getAuthToken() : undefined;
  let h = r?.GIT_ALLOW_PROTOCOL === "none";
  let y = [
    ...SAFE_GIT_CONFIG_ARGS,
    ...gitConfigPairs(e.gitEnvironment?.commandScopeEntries ?? []),
    ...(h ? SAFE_GIT_EXTRA_ARGS : []),
    "-c",
    "http.proxyAuthMethod=basic",
    ...(a && d ? remoteProxyArgs(e.gitURL) : []),
    ...(u ? credentialHelperArgs(e.gitURL) : []),
    ...(e.governedMount && d ? LFS_NO_LOCKVERIFY_ARGS : []),
    ...t,
  ];
  let f = u ?? e.token;
  let mapped = y.map((B) => redactGitArg(B, e.authURL, e.gitURL, f));
  e.onDebug(`[byoc:git] git ${mapped.join(" ")} (dir=${repoPath || "."})`);
  let b = !d || a || Boolean(e.token);
  let P = {
    ...process.env,
    ...r,
    ...e.gitEnvironment?.envOverrides,
    ...(u
      ? {
          [SHR_GIT_PROXY_TOKEN]: u,
        }
      : undefined),
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
    ...(a
      ? {
          GIT_CONFIG_GLOBAL: "/dev/null",
        }
      : undefined),
    ...(b
      ? {
          GIT_CONFIG: undefined,
        }
      : undefined),
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: GIT_NO_PROMPT_ENV.GCM_INTERACTIVE,
    LC_ALL: "C",
    GIT_PROGRESS_DELAY: "0",
    ...SAFE_GIT_ENV,
    ...(e.authURL.startsWith("file://") && {
      GIT_ALLOW_PROTOCOL: `file:${SAFE_GIT_ENV.GIT_ALLOW_PROTOCOL}`,
    }),
    GIT_SSH_COMMAND: `${process.env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
    ...(h && {
      GIT_ALLOW_PROTOCOL: "none",
      GIT_SSH_COMMAND: "false",
    }),
  };
  if (b) {
    for (let key of Object.keys(P)) if (key.toUpperCase() === "GIT_CONFIG") P[key] = undefined;
  }
  let { signal, dispose } = createTimeoutSignal(e.signal, s);
  let E =
    c !== undefined && SKIP_WATCHDOG_SUBCOMMANDS.has(c)
      ? GIT_WATCHDOG_MS
      : (e.watchdog?.silenceMs ?? MIN_SERVER_PROGRESS_CAP_MS);
  let l;
  let T;
  let now = Date.now();
  let z = e.watchdog?.preTransferCapMs ?? resolveServerProgressCap().capMs;
  let k;
  let N = new Set();
  let O;
  let Q = false;
  let Te = {
    active: false,
  };
  let now_2 = Date.now();
  try {
    return await new Promise((resolve, reject) => {
      let F = spawn("git", y, {
        cwd: repoPath || undefined,
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
        env: P,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let le = 10485760;
      let K = 8192;
      let ee = 0;
      let M = [];
      let D = "";
      let skipFirstLine = false;
      let L = 0;
      let te = -1;
      let Ie;
      let Se = (w) => {
        if (typeof w === "object" && "unref" in w) w.unref();
        return w;
      };
      let X = false;
      let ve;
      let Ne = (w) => {
        if (l === undefined) l = w;
        F.kill("SIGTERM");
        ve ??= Se(
          setTimeout(() => {
            if (X) return;
            F.kill("SIGKILL");
            l = "escalated";
            X = true;
            reject(
              Object.assign(Error("git did not exit after SIGTERM"), {
                stdout: Buffer.concat(M).toString("utf8"),
                stderr: D,
              }),
            );
          }, PROGRESS_LOG_INTERVAL_MS),
        );
      };
      let fe = (w = E) => Se(setTimeout((I) => I("silence"), w, Ne));
      let Y = fe();
      F.stdout.on("data", (w) => {
        if (ee < 10485760) {
          M.push(w);
          ee += w.length;
        } else if (o) o.stdoutTruncated = true;
      });
      F.stderr.on("data", (w) => {
        let chunk = w.toString("utf8");
        let j = D + chunk;
        if (j.length > 8192) Q = true;
        D = j.slice(-8192);
        let gitProgress = parseGitProgress(chunk, skipFirstLine);
        let { display, client, server } = gitProgress;
        if (chunk.length > 0) skipFirstLine = !/[\r\n]$/.test(chunk);
        if (o !== undefined) {
          noteServerProgress(Te, gitProgress, Date.now());
          if (Te.active) o.sawRemoteActivity = true;
        }
        if (client) {
          if (o !== undefined) o.sawClientProgress = true;
          if (E < DELTA_COMPLETE_SILENCE_MS && isDeltasComplete(client)) {
            E = DELTA_COMPLETE_SILENCE_MS;
            clearTimeout(Y);
            Y = fe();
          }
          if (isProgressAdvance(T, client)) {
            now = Date.now();
            clearTimeout(Y);
            Y = fe();
          }
          T = client;
          if (
            o !== undefined &&
            client.bytes !== undefined &&
            client.label === RECEIVING_OBJECTS &&
            client.bytes > (o.transferBytes ?? -1)
          )
            o.transferBytes = client.bytes;
        } else if (server !== undefined && T === undefined) {
          if (shouldLogProgress(k, N, server)) {
            k = server;
            let he = now_2 + z - Date.now();
            if (z > 0 && he > 0) {
              O = Date.now();
              clearTimeout(Y);
              Y = fe(Math.min(E, he));
              if (o !== undefined) o.sawServerProgress = true;
            }
          }
          N.add(server.label);
        }
        if (display) {
          if (display.label !== Ie) {
            Ie = display.label;
            te = -1;
          }
          let floored = Math.floor(display.pct / 10);
          let Fe = Date.now() - L;
          if (Fe >= STDERR_TAIL_CHARS && (Fe >= NO_DATA_WARN_MS || floored > Math.floor(te / 10))) {
            L = Date.now();
            te = display.pct;
            try {
              e.onDebug(`[byoc:git] ${c ?? "git"}: ${display.raw}`);
              e.onProgress?.(c ?? "git", display);
            } catch {}
          }
        }
      });
      let Pe = () => {
        if (e.signal?.aborted) {
          F.kill("SIGTERM");
          ve ??= Se(
            setTimeout(() => {
              if (X) return;
              F.kill("SIGKILL");
              X = true;
              let w = Error("The operation was aborted");
              w.name = "AbortError";
              reject(
                Object.assign(w, {
                  stderr: D,
                }),
              );
            }, PROGRESS_LOG_INTERVAL_MS),
          );
        } else Ne("hard-cap");
      };
      if (signal.aborted) Pe();
      else
        signal.addEventListener("abort", Pe, {
          once: true,
        });
      let Ge;
      F.on("error", (w) => {
        Ge = w;
      });
      F.on("close", (w, I) => {
        if (X) return;
        X = true;
        clearTimeout(Y);
        clearTimeout(ve);
        signal.removeEventListener("abort", Pe);
        if (o !== undefined) {
          o.exitCode = w;
          o.wroteStderr = D.length > 0;
        }
        let str = Buffer.concat(M).toString("utf8");
        if (e.signal?.aborted && l === undefined) {
          let U = Error("The operation was aborted");
          U.name = "AbortError";
          return reject(
            Object.assign(U, {
              stdout: str,
              stderr: D,
              code: w,
              signal: I,
            }),
          );
        }
        if (Ge)
          return reject(
            Object.assign(Ge, {
              stdout: str,
              stderr: D,
            }),
          );
        if (w === 0) return resolve(str);
        let ge = Error(I !== null ? `git exited on signal ${I}` : `git exited with code ${w}`);
        reject(
          Object.assign(ge, {
            stdout: str,
            stderr: D,
            code: w,
            signal: I,
          }),
        );
      });
    });
  } catch (error) {
    let x = error;
    if (l !== undefined) {
      let le = T ? ` at ${T.label} ${T.pct}%${T.total ? ` (${T.done}/${T.total})` : ""}` : "";
      let now_3 = Date.now();
      let ee = now_3 - now;
      let M = "";
      let D = `no forward progress for ${ee}ms (budget ${E}ms)${le}`;
      if (T === undefined && k !== undefined && O !== undefined) {
        let L = k;
        let te =
          L.done !== undefined
            ? L.pct > 0
              ? ` ${L.pct}% (${L.done}${L.total !== undefined ? `/${L.total}` : ""})`
              : ` ${L.done}`
            : ` ${L.pct}%`;
        M = ` \u2014 no pack data received; server-side progress last advanced ${now_3 - O}ms ago at ${L.label}${te}`;
        D =
          now_3 - now_2 >= z
            ? `pre-transfer cap ${z}ms reached with no client-side progress${M}`
            : `no client-side progress for ${now_3 - now_2}ms and server-side progress stopped advancing (budget ${E}ms)${M}`;
      }
      let ue =
        l === "silence"
          ? D
          : l === "hard-cap"
            ? `hard cap ${s}ms after ${now_3 - now_2}ms${le}${M}`
            : `did not exit within ${PROGRESS_LOG_INTERVAL_MS}ms of SIGTERM (D-state? \u2014 last forward ${ee}ms ago)${le}`;
      e.onDebug(
        `[runner:stuck] git ${mapped.join(" ")} (dir=${repoPath || "."}) \u2014 ${ue} \u2014 killing subprocess`,
      );
    }
    let W =
      x.stderr !== undefined && x.stderr.length > 0
        ? gitStderrSummary(x.stderr, Q, e.authURL, f)
        : hoistFatalLines(redactToken(x.stdout || x.message || "", e.authURL, f)).slice(
            0,
            MAX_GIT_OUTPUT_TAIL_CHARS,
          );
    let F = l !== undefined ? ` (watchdog: ${l})` : "";
    throw Error(`git ${c ?? "?"} failed${F}: ${W}`);
  } finally {
    if (o !== undefined && l !== undefined) o.killReason = l;
    dispose();
  }
}
export { runGit };
