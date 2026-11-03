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
  se,
  SAFE_GIT_CONFIG_ARGS,
  Kt,
  mHe,
  SKIP_WATCHDOG_SUBCOMMANDS,
  GIT_WATCHDOG_MS,
  qe,
  resolveServerProgressCap,
  PROGRESS_LOG_INTERVAL_MS,
  parseGitProgress,
  noteServerProgress,
  Be,
  Nt,
  isProgressAdvance,
  RECEIVING_OBJECTS,
  shouldLogProgress,
  STDERR_TAIL_CHARS,
  NO_DATA_WARN_MS,
  gitStderrSummary,
  ae,
} from "./fetchErrors.js";
import { DUt } from "./proxyTrust.js";
import { remoteProxyArgs, credentialHelperArgs, uMo, SHR_GIT_PROXY_TOKEN } from "./gitCredentials.js";
import { redactGitArg, hoistFatalLines, redactToken } from "./tokenRedact.js";
import { GIT_NO_PROMPT_ENV } from "../../utils/plugins/marketplaceManager.js";
import { createTimeoutSignal } from "./repoSources.js";
import { Nd } from "../../utils/toolCgroup.js";

//@ chunk-t3sg9e26.js:27339-27377 placement
var hn = new Set(["fetch", "ls-remote"]);
//@ chunk-t3sg9e26.js:27377-27501 placement
function gitSubcommandOf(e) {
  for (let n = 0; n < e.length; n++) {
    if (e[n] === "-c" || e[n] === "--git-dir" || e[n] === "-C") {
      n++;
      continue;
    }
    return e[n];
  }
  return;
}
/**
 * 运行 git 子进程（代理、进度超时、无数据检测）
 */
//@ chunk-t3sg9e26.js:27501-32452 placement
async function runGit(e, n, t, r, s = se, o) {
  let a = e.getAuthToken !== void 0,
    c = gitSubcommandOf(t),
    d = c !== void 0 && hn.has(c),
    u = a && d ? e.getAuthToken() : void 0,
    h = r?.GIT_ALLOW_PROTOCOL === "none",
    y = [
      ...SAFE_GIT_CONFIG_ARGS,
      ...DUt(e.gitEnvironment?.commandScopeEntries ?? []),
      ...(h ? Kt : []),
      "-c",
      "http.proxyAuthMethod=basic",
      ...(a && d ? remoteProxyArgs(e.gitURL) : []),
      ...(u ? credentialHelperArgs(e.gitURL) : []),
      ...(e.governedMount && d ? uMo : []),
      ...t,
    ],
    f = u ?? e.token,
    mapped = y.map((B) => redactGitArg(B, e.authURL, e.gitURL, f));
  e.onDebug(`[byoc:git] git ${mapped.join(" ")} (dir=${n || "."})`);
  let b = !d || a || Boolean(e.token),
    P = {
      ...process.env,
      ...r,
      ...e.gitEnvironment?.envOverrides,
      ...(u ? { [SHR_GIT_PROXY_TOKEN]: u } : void 0),
      CLAUDE_CODE_SESSION_ACCESS_TOKEN: void 0,
      ...(a ? { GIT_CONFIG_GLOBAL: "/dev/null" } : void 0),
      ...(b ? { GIT_CONFIG: void 0 } : void 0),
      GIT_TERMINAL_PROMPT: "0",
      GCM_INTERACTIVE: GIT_NO_PROMPT_ENV.GCM_INTERACTIVE,
      LC_ALL: "C",
      GIT_PROGRESS_DELAY: "0",
      ...mHe,
      ...(e.authURL.startsWith("file://") && { GIT_ALLOW_PROTOCOL: `file:${mHe.GIT_ALLOW_PROTOCOL}` }),
      GIT_SSH_COMMAND: `${process.env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
      ...(h && { GIT_ALLOW_PROTOCOL: "none", GIT_SSH_COMMAND: "false" }),
    };
  if (b) {
    for (let B of Object.keys(P)) if (B.toUpperCase() === "GIT_CONFIG") P[B] = void 0;
  }
  let { signal: signal, dispose: dispose } = createTimeoutSignal(e.signal, s),
    E = c !== void 0 && SKIP_WATCHDOG_SUBCOMMANDS.has(c) ? GIT_WATCHDOG_MS : (e.watchdog?.silenceMs ?? qe),
    l,
    T,
    now = Date.now(),
    z = e.watchdog?.preTransferCapMs ?? resolveServerProgressCap().capMs,
    k,
    N = new Set(),
    O,
    Q = !1,
    Te = { active: !1 },
    now_2 = Date.now();
  try {
    return await new Promise((x, W) => {
      let F = spawn("git", y, {
          cwd: n || void 0,
          windowsHide: !0,
          ...Nd("helper"),
          env: P,
          stdio: ["ignore", "pipe", "pipe"],
        }),
        le = 10485760,
        K = 8192,
        ee = 0,
        M = [],
        D = "",
        ue = !1,
        L = 0,
        te = -1,
        Ie,
        Se = (w) => {
          if (typeof w === "object" && "unref" in w) w.unref();
          return w;
        },
        X = !1,
        ve,
        Ne = (w) => {
          if (l === void 0) l = w;
          (F.kill("SIGTERM"),
            (ve ??= Se(
              setTimeout(() => {
                if (X) return;
                (F.kill("SIGKILL"),
                  (l = "escalated"),
                  (X = !0),
                  W(
                    Object.assign(Error("git did not exit after SIGTERM"), {
                      stdout: Buffer.concat(M).toString("utf8"),
                      stderr: D,
                    }),
                  ));
              }, PROGRESS_LOG_INTERVAL_MS),
            )));
        },
        fe = (w = E) => Se(setTimeout((I) => I("silence"), w, Ne)),
        Y = fe();
      (F.stdout.on("data", (w) => {
        if (ee < 10485760) (M.push(w), (ee += w.length));
        else if (o) o.stdoutTruncated = !0;
      }),
        F.stderr.on("data", (w) => {
          let str = w.toString("utf8"),
            j = D + str;
          if (j.length > 8192) Q = !0;
          D = j.slice(-8192);
          let ge = parseGitProgress(str, ue),
            { display: display, client: client, server: server } = ge;
          if (str.length > 0) ue = !/[\r\n]$/.test(str);
          if (o !== void 0) {
            if ((noteServerProgress(Te, ge, Date.now()), Te.active)) o.sawRemoteActivity = !0;
          }
          if (client) {
            if (o !== void 0) o.sawClientProgress = !0;
            if (E < Be && Nt(client)) ((E = Be), clearTimeout(Y), (Y = fe()));
            if (isProgressAdvance(T, client)) ((now = Date.now()), clearTimeout(Y), (Y = fe()));
            if (
              ((T = client),
              o !== void 0 &&
                client.bytes !== void 0 &&
                client.label === RECEIVING_OBJECTS &&
                client.bytes > (o.transferBytes ?? -1))
            )
              o.transferBytes = client.bytes;
          } else if (server !== void 0 && T === void 0) {
            if (shouldLogProgress(k, N, server)) {
              k = server;
              let he = now_2 + z - Date.now();
              if (z > 0 && he > 0) {
                if (((O = Date.now()), clearTimeout(Y), (Y = fe(Math.min(E, he))), o !== void 0))
                  o.sawServerProgress = !0;
              }
            }
            N.add(server.label);
          }
          if (display) {
            if (display.label !== Ie) ((Ie = display.label), (te = -1));
            let floored = Math.floor(display.pct / 10),
              Fe = Date.now() - L;
            if (Fe >= STDERR_TAIL_CHARS && (Fe >= NO_DATA_WARN_MS || floored > Math.floor(te / 10))) {
              ((L = Date.now()), (te = display.pct));
              try {
                (e.onDebug(`[byoc:git] ${c ?? "git"}: ${display.raw}`), e.onProgress?.(c ?? "git", display));
              } catch {}
            }
          }
        }));
      let Pe = () => {
        if (e.signal?.aborted)
          (F.kill("SIGTERM"),
            (ve ??= Se(
              setTimeout(() => {
                if (X) return;
                (F.kill("SIGKILL"), (X = !0));
                let w = Error("The operation was aborted");
                ((w.name = "AbortError"), W(Object.assign(w, { stderr: D })));
              }, PROGRESS_LOG_INTERVAL_MS),
            )));
        else Ne("hard-cap");
      };
      if (signal.aborted) Pe();
      else signal.addEventListener("abort", Pe, { once: !0 });
      let Ge;
      (F.on("error", (w) => {
        Ge = w;
      }),
        F.on("close", (w, I) => {
          if (X) return;
          if (
            ((X = !0),
            clearTimeout(Y),
            clearTimeout(ve),
            signal.removeEventListener("abort", Pe),
            o !== void 0)
          )
            ((o.exitCode = w), (o.wroteStderr = D.length > 0));
          let str = Buffer.concat(M).toString("utf8");
          if (e.signal?.aborted && l === void 0) {
            let U = Error("The operation was aborted");
            return (
              (U.name = "AbortError"),
              W(Object.assign(U, { stdout: str, stderr: D, code: w, signal: I }))
            );
          }
          if (Ge) return W(Object.assign(Ge, { stdout: str, stderr: D }));
          if (w === 0) return x(str);
          let ge = Error(I !== null ? `git exited on signal ${I}` : `git exited with code ${w}`);
          W(Object.assign(ge, { stdout: str, stderr: D, code: w, signal: I }));
        }));
    });
  } catch (error) {
    let x = error;
    if (l !== void 0) {
      let le = T ? ` at ${T.label} ${T.pct}%${T.total ? ` (${T.done}/${T.total})` : ""}` : "",
        now_3 = Date.now(),
        ee = now_3 - now,
        M = "",
        D = `no forward progress for ${ee}ms (budget ${E}ms)${le}`;
      if (T === void 0 && k !== void 0 && O !== void 0) {
        let L = k,
          te =
            L.done !== void 0
              ? L.pct > 0
                ? ` ${L.pct}% (${L.done}${L.total !== void 0 ? `/${L.total}` : ""})`
                : ` ${L.done}`
              : ` ${L.pct}%`;
        ((M = ` \u2014 no pack data received; server-side progress last advanced ${now_3 - O}ms ago at ${L.label}${te}`),
          (D =
            now_3 - now_2 >= z
              ? `pre-transfer cap ${z}ms reached with no client-side progress${M}`
              : `no client-side progress for ${now_3 - now_2}ms and server-side progress stopped advancing (budget ${E}ms)${M}`));
      }
      let ue =
        l === "silence"
          ? D
          : l === "hard-cap"
            ? `hard cap ${s}ms after ${now_3 - now_2}ms${le}${M}`
            : `did not exit within ${PROGRESS_LOG_INTERVAL_MS}ms of SIGTERM (D-state? \u2014 last forward ${ee}ms ago)${le}`;
      e.onDebug(
        `[runner:stuck] git ${mapped.join(" ")} (dir=${n || "."}) \u2014 ${ue} \u2014 killing subprocess`,
      );
    }
    let W =
        x.stderr !== void 0 && x.stderr.length > 0
          ? gitStderrSummary(x.stderr, Q, e.authURL, f)
          : hoistFatalLines(redactToken(x.stdout || x.message || "", e.authURL, f)).slice(0, ae),
      F = l !== void 0 ? ` (watchdog: ${l})` : "";
    throw Error(`git ${c ?? "?"} failed${F}: ${W}`);
  } finally {
    if (o !== void 0 && l !== void 0) o.killReason = l;
    dispose();
  }
}

export { runGit };
