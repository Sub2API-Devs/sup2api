/**
 * selfHostedRunner/lifecycleHooks.ts
 *
 * 自托管 runner checkout/post-session 生命周期钩子（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3nztfxrw.js (26)
 * attribution: placement 26
 */
import { join } from "path";
import { stat, access } from "fs/promises";
import { constants, constants as constants_2 } from "fs";
import { spawn } from "child_process";
import { withBoundedTimeout } from "../utils/boundedTimeout.js";
import { HMt } from "../utils/gitSafeExec.js";
import { fe, snapshotProcessTree, ve, killProcessTree, countLiveProcesses } from "./processTable.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, isENOENT } from "../utils/errors.js";
import { decodeTaggedUuid } from "../services/mcp/serverIdentity.js";
import { sanitizeMetricLabel } from "../entrypoints/selfHostedRunner/metrics.js";
import { redactSecretsInText } from "../utils/redactSecrets.js";
import { Nd } from "../utils/toolCgroup.js";
import { takeLastChars } from "../utils/stringUtils.js";
import { formatDelay } from "../bridge/bridgeMain.js";
import { sleep } from "../utils/sleep.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-3nztfxrw.js:40006-40018 placement
var me = 5000;
//@ chunk-3nztfxrw.js:40018-40243 placement
function hookEnvironment() {
  return {
    ...process.env,
    SELF_HOSTED_RUNNER_POOL_SECRET: void 0,
    SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: void 0,
    SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND: void 0,
    SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE: void 0,
  };
}
//@ chunk-3nztfxrw.js:40243-41196 placement
function assertLifecycleHooksSupported(e, n = "linux") {
  if (n !== "win32") return;
  switch (e) {
    case "--hooks-dir":
      throw Error(
        "--hooks-dir is not supported on Windows: lifecycle hooks currently require a Linux or macOS host, because they are POSIX executables that the runner spawns directly (no shell, no .cmd/.ps1/.exe resolution). Run the runner on a Linux or macOS host to use hooks, or drop --hooks-dir / SELF_HOSTED_RUNNER_HOOKS_DIR to use the built-in checkout and command behavior. See docs/self-hosted-runners-guide.md \xA7 Lifecycle hooks.",
      );
    case "orchestrator mode":
      throw Error(
        "orchestrator mode is not supported on Windows: it is driven by the spawn-runner lifecycle hook, and lifecycle hooks currently require a Linux or macOS host because they are POSIX executables spawned directly (no shell, no .cmd/.ps1/.exe resolution). Run the orchestrator on a Linux or macOS host; the runners it provisions are unaffected. See docs/self-hosted-runners-guide.md \xA7 Lifecycle hooks.",
      );
  }
}
//@ chunk-3nztfxrw.js:41196-41383 placement
async function findHook(e, n) {
  if (!e) return null;
  let r = join(e, n);
  try {
    if (!(await withBoundedTimeout(stat(r), me, `stat ${r}`)).isFile()) return null;
    return (await withBoundedTimeout(access(r, constants_2.X_OK), me, `access ${r}`), r);
  } catch {
    return null;
  }
}
//@ chunk-3nztfxrw.js:41383-41934 placement
var LIFECYCLE_HOOK_GIT_NEUTRAL_PINS = [
    ["core.fsmonitor", ""],
    ["core.askPass", ""],
    ["log.showSignature", "false"],
    ["tag.forceSignAnnotated", "false"],
    ["init.templateDir", ""],
    ["gpg.ssh.defaultKeyCommand", ""],
    ["push.gpgSign", "false"],
    ["protocol.ext.allow", "never"],
    ["protocol.fd.allow", "never"],
    ["protocol.git.allow", "never"],
    ["protocol.file.allow", "user"],
    ["merge.verifySignatures", "false"],
    ["core.alternateRefsCommand", HMt],
    ["core.attributesFile", "/dev/null"],
  ],
  LIFECYCLE_HOOK_GIT_ENV = {
    GIT_PROXY_COMMAND: "",
    GIT_ALLOW_PROTOCOL: "https:http:ssh",
    GIT_EDITOR: ":",
    GIT_SEQUENCE_EDITOR: ":",
    GIT_SSH_COMMAND: "ssh",
  };
//@ chunk-3nztfxrw.js:41934-42196 placement
function withLifecycleHookGitEnv(e = hookEnvironment()) {
  let n;
  for (let [r, m] of Object.entries(LIFECYCLE_HOOK_GIT_ENV)) {
    if (e[r] !== void 0) continue;
    ((n ??= { ...e }),
      (n[r] = r === "GIT_SSH_COMMAND" && e.GIT_SSH !== void 0 ? `'${e.GIT_SSH.replace(/'/g, "'\\''")}'` : m));
  }
  if (lifecycleHookAskpassSource(e) === "handedOn") ((n ??= { ...e }), (n.GIT_ASKPASS = e.SSH_ASKPASS));
  return n ?? e;
}
//@ chunk-3nztfxrw.js:42196-42317 placement
function lifecycleHookAskpassSource(e = hookEnvironment()) {
  if (e.GIT_ASKPASS !== void 0 || envHasGitConfigKey("core.askPass", e)) return "own";
  return e.SSH_ASKPASS ? "handedOn" : "none";
}
//@ chunk-3nztfxrw.js:42317-42328 placement
var Xn = 256;
//@ chunk-3nztfxrw.js:42328-42658 placement
function operatorGitConfigPairStatus(e = hookEnvironment()) {
  let match = /^\s*\+?(\d+)$/.exec(e.GIT_CONFIG_COUNT ?? ""),
    r = match ? parseInt(match[1], 10) : 0;
  if (!Number.isSafeInteger(r) || r === 0) return { count: 0, announced: 0 };
  if (r > Xn) return { count: 0, discarded: "too-many", announced: r };
  if (e[`GIT_CONFIG_KEY_${r - 1}`] === void 0) return { count: 0, discarded: "sparse", announced: r };
  return { count: r, announced: r };
}
//@ chunk-3nztfxrw.js:42658-42693 placement
function sn(e) {
  return operatorGitConfigPairStatus(e).count;
}
//@ chunk-3nztfxrw.js:42693-42836 placement
function envHasGitConfigKey(e, n = hookEnvironment()) {
  let r = sn(n),
    lower = e.toLowerCase();
  for (let a = 0; a < r; a++) if ((n[`GIT_CONFIG_KEY_${a}`] ?? "").toLowerCase() === lower) return !0;
  return !1;
}
//@ chunk-3nztfxrw.js:42836-42997 placement
function lifecycleHookGpgProgramPins(e, n) {
  let r = [
    ["gpg.program", e.gpg],
    ["gpg.openpgp.program", e.gpg],
    ["gpg.x509.program", e.gpgsm],
  ];
  if (n) r.push(["gpg.ssh.program", e.sshKeygen]);
  return r;
}
//@ chunk-3nztfxrw.js:42997-43766 placement
function gitConfigEnvArgs(e, n, r) {
  if (!n?.length) return e;
  let m = sn(e),
    a = { ...e },
    t = n.length;
  for (let i = 0; i < m; i++) (delete a[`GIT_CONFIG_KEY_${i}`], delete a[`GIT_CONFIG_VALUE_${i}`]);
  for (let i = 0; i < m; i++) {
    let s = e[`GIT_CONFIG_KEY_${i}`],
      c = e[`GIT_CONFIG_VALUE_${i}`];
    if (s !== void 0) a[`GIT_CONFIG_KEY_${t + i}`] = s;
    if (c !== void 0) a[`GIT_CONFIG_VALUE_${t + i}`] = c;
  }
  if (
    (n.forEach(([i, s], c) => {
      ((a[`GIT_CONFIG_KEY_${c}`] = i), (a[`GIT_CONFIG_VALUE_${c}`] = s));
    }),
    (a.GIT_CONFIG_COUNT = String(t + m)),
    r?.legacyParams)
  ) {
    let i = (l) => `'${l.replace(/'/g, "'\\''")}'`,
      mapped = n.map(([l, b]) => i(`${l}=${b}`)),
      c = [];
    for (let l = 0; l < m; l++) {
      let b = e[`GIT_CONFIG_KEY_${l}`];
      if (b !== void 0) c.push(i(`${b}=${e[`GIT_CONFIG_VALUE_${l}`] ?? ""}`));
    }
    a.GIT_CONFIG_PARAMETERS = [
      ...mapped,
      ...c,
      ...(e.GIT_CONFIG_PARAMETERS ? [e.GIT_CONFIG_PARAMETERS] : []),
    ].join(" ");
  }
  return a;
}
//@ chunk-3nztfxrw.js:43766-43881 placement
function mergeCommandScopes(e, n, r) {
  let m = n?.commandScopeEntries ?? [],
    a = r && m.some(([t]) => t.includes("=")) ? [] : m;
  return [...(e ?? []), ...a];
}
//@ chunk-3nztfxrw.js:43881-44131 placement
var he = 1000,
  en = 1500,
  Te = 5000,
  dn = 500,
  Jn = dn + fe,
  Zn = 100,
  $e =
    "a hook should `exec` or `wait` for its long-running commands, stop a command's child processes too if it stops that command early, and start a daemon with its output redirected: >/dev/null 2>&1";
//@ chunk-3nztfxrw.js:44131-44221 placement
function Ae(e) {
  return e.signalCode !== null ? `signal ${e.signalCode}` : `status ${e.exitCode}`;
}
//@ chunk-3nztfxrw.js:44221-44430 placement
function lingeringOutputMessage(e) {
  return `hook exited (${Ae(e)}) but a process it started still holds its output pipes; not waiting for them to close. The runner has not stopped that process, and it may still be running (${$e})`;
}
//@ chunk-3nztfxrw.js:44564-44676 placement
class CheckoutHookFailedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  exitCode;
  constructor(e, n, r) {
    super(e, r);
    ((this.name = "CheckoutHookFailedError"), (this.exitCode = n));
  }
}
//@ chunk-3nztfxrw.js:44676-44785 placement
class CheckoutHookTimedOutError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(e, "checkout hook timed out");
    this.name = "CheckoutHookTimedOutError";
  }
}
/**
 * 自托管 runner 的 checkout 生命周期钩子：带预算运行并记录日志
 */
//@ chunk-3nztfxrw.js:44785-51492 placement
async function runCheckoutHook(e) {
  let r = {
      ...hookEnvironment(),
      ...e.gitEnvironment?.envOverrides,
      ...!1,
      CLAUDE_RUNNER_SESSION_ID: e.sessionId.replace(/^cse_/, "session_"),
      CLAUDE_RUNNER_SESSION_UUID: decodeTaggedUuid(e.sessionId),
      CLAUDE_RUNNER_REPO_URL: e.repoUrl,
      CLAUDE_RUNNER_REPO_REF: e.repoRef ?? "",
      CLAUDE_RUNNER_CHECKOUT_PATH: e.checkoutPath,
      CLAUDE_RUNNER_API_BASE_URL: e.apiBaseUrl,
      CLAUDE_RUNNER_GIT_MOUNT_URL: e.gitMountUrl,
      CLAUDE_RUNNER_CLIENT_PLATFORM: sanitizeMetricLabel(e.clientPlatform),
      CLAUDE_CODE_SESSION_ACCESS_TOKEN: e.sessionAccessToken,
    },
    m = (b) => {
      try {
        e.onStatus(b);
      } catch {}
    },
    a = (b) => {
      try {
        e.onDebug(b);
      } catch {}
    };
  m(`[runner:hook] checkout ${redactSecretsInText(e.repoUrl)} -> ${e.checkoutPath} (via ${e.hookPath})`);
  let t = [],
    i = (b) => {
      try {
        e.onStderrLine?.(b);
      } catch {}
    },
    s = !1,
    c = !1;
  await new Promise((b, w) => {
    let S = spawn(e.hookPath, [], {
        cwd: e.cwd,
        env: gitConfigEnvArgs(
          e.gitConfigPins?.length ? withLifecycleHookGitEnv(r) : r,
          mergeCommandScopes(e.gitConfigPins, e.gitEnvironment, e.gitConfigLegacyParams),
          { legacyParams: e.gitConfigLegacyParams },
        ),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: !0,
        ...Nd("hooks"),
      }),
      T = !1,
      N = [],
      D = () => {
        for (let P of N.splice(0)) clearTimeout(P);
      },
      R = "",
      A = "",
      F = (P, x) => {
        let parts = P.split(`
`),
          U = parts.pop() ?? "";
        for (let Y of parts) {
          let ee = redactSecretsInText(Y);
          if ((a(`[runner:hook:checkout] ${ee}`), x))
            (t.push(
              ee +
                `
`,
            ),
              i(ee));
        }
        if (x) {
          let reduced = t.reduce((ee, le) => ee + le.length, 0);
          while (reduced > 4096 && t.length > 1) reduced -= t.shift().length;
        }
        return U;
      };
    (S.stdout.on("data", (P) => {
      ((R += P.toString()), (R = F(R, !1)));
    }),
      S.stderr.on("data", (P) => {
        ((A += P.toString()), (A = F(A, !0)));
      }));
    let K = (P, x) => {
        if (T) return;
        if (((T = !0), D(), e.signal?.removeEventListener("abort", oe), x !== void 0))
          (m(`[runner:hook:checkout] ${x}`), S.stdout.destroy(), S.stderr.destroy());
        if (R) a(`[runner:hook:checkout] ${redactSecretsInText(R)}`);
        if (A) {
          let U = redactSecretsInText(A);
          (a(`[runner:hook:checkout] ${U}`), t.push(U), i(U));
        }
        let G = takeLastChars(t.join(""), 4096);
        if (c) {
          if (G.trim() !== "") {
            let U = redactSecretsInText(G);
            m(
              `[runner:hook:checkout] the hook's last output before the time limit: ${U.length > en ? "\u2026" : ""}${takeLastChars(
                U,
                en,
              )
                .trimEnd()
                .replace(/\s*[\r\n]+\s*/g, " | ")
                .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, " ")}`,
            );
          }
          w(
            new CheckoutHookTimedOutError(
              `checkout hook timed out after ${formatDelay(e.timeoutMs ?? 0)} (the runner's --checkout-hook-timeout-min limit)`,
            ),
          );
        } else if (s) w(Error("checkout hook aborted"));
        else if (P === 0) b();
        else {
          let Y = `checkout hook failed (exit ${P}): ${G}`;
          w(
            P === null
              ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  Y,
                  "checkout hook killed by signal",
                )
              : new CheckoutHookFailedError(Y, P, `exited with status ${P}`),
          );
        }
      },
      X = !1,
      V = !1,
      q = !1,
      ae = !1,
      Z = () => S.exitCode === null && S.signalCode === null,
      ne,
      h = !1,
      y = async (P, x) => {
        let pid = S.pid,
          U = [],
          Y = !1;
        if (pid !== void 0 && Z()) {
          let Ne = snapshotProcessTree({ pid: pid, alive: !0, token: void 0 }, dn);
          ne = Promise.all([ne, Ne]).then(([_e, pe]) =>
            _e === void 0 || pe === void 0
              ? (_e ?? pe)
              : { ...pe, pinned: new Map([..._e.pinned, ...pe.pinned]) },
          );
          let ue = await Ne;
          if (
            ((Y = Z() && S.kill(P)),
            (V ||= Y),
            a(
              Y
                ? `[runner:hook:checkout] ${x}, sending ${P} to the hook's process tree (pid=${pid})`
                : `[runner:hook:checkout] ${x}, but the hook process could no longer be sent ${P}; what it started still is, as far as it was listed`,
            ),
            ue === void 0)
          )
            U.push(`the process table could not be read before ${P}`);
          else {
            if (ue.unpinned > 0) U.push(`${ue.unpinned} could not be identified`);
            if (ue.truncated) U.push(`it had more than ${ve} processes`);
            if (ue.degraded) U.push("`ps` failed part-way");
          }
        }
        let ee = await ne;
        if (ee === void 0) {
          if (U.length > 0 && P === "SIGTERM")
            m(
              `[runner:hook:checkout] could not read the process table (is /proc mounted? on macOS, is \`ps\` on PATH?), so ${Y ? "only the hook process was sent SIGTERM" : "nothing was sent SIGTERM"}; programs the hook started, such as git, may still be running and writing to ${e.checkoutPath}`,
            );
          return;
        }
        let { pids: pids, incomplete: incomplete } = await killProcessTree(ee, P);
        if (U.length > 0)
          m(`[runner:hook:checkout] may not have stopped everything the hook started: ${U.join("; ")}`);
        if (P === "SIGTERM") return;
        if (pids > 0)
          m(
            `[runner:hook:checkout] ${pids} program(s) the hook started were still running ${formatDelay(Te)} after SIGTERM and were sent SIGKILL`,
          );
        if (incomplete)
          m(
            "[runner:hook:checkout] could not check which of the hook's programs were still running; some may be",
          );
      },
      v = (P, x) => y(P, x).catch(() => {}),
      L = (P) => {
        N.push(setTimeout((x, G, U) => x(G, lingeringOutputMessage(U)), he, K, P, S));
      },
      M = () => {
        if (!V && !Z() && !q) {
          ae = !0;
          return;
        }
        let P = Z();
        if (P) S.unref();
        K(
          S.exitCode,
          P
            ? "hook process did not exit after SIGTERM and then SIGKILL (it may be stuck on a disk or network mount); abandoning it, and not waiting for its output pipes to close"
            : h
              ? `hook exited (${Ae(S)}) but programs it started may still be running, and may still write to ${e.checkoutPath}; giving up on them`
              : lingeringOutputMessage(S),
        );
      },
      H = () => {
        if (!T) N.push(setTimeout((P) => P(), he, M));
      },
      Q = (P) => {
        if (X || T) return;
        if (!Z()) {
          m(
            `[runner:hook:checkout] ${P}, but the hook has already exited and there is nothing left to stop; still waiting for its output pipes to close, which a process it started may hold, and the slot stays held until then (${$e})`,
          );
          return;
        }
        ((X = !0),
          v("SIGTERM", P),
          N.push(
            setTimeout((x, G) => void x("SIGKILL", "still running after SIGTERM").then(G), Te, v, H),
            setTimeout((x) => x(), Te + Jn + he, M),
          ));
      },
      oe = () => {
        ((s = !0), Q("abort received"));
      };
    if (e.signal?.aborted) oe();
    else e.signal?.addEventListener("abort", oe, { once: !0 });
    if (e.timeoutMs !== void 0 && e.timeoutMs > 0)
      N.push(
        setTimeout(
          (P) => {
            if (T || s) return;
            if (!Z()) return;
            ((c = !0),
              m(
                `[runner:hook:checkout] timed out after ${formatDelay(P)} (--checkout-hook-timeout-min) \u2014 stopping the hook and failing this session's setup`,
              ),
              Q(`timed out after ${formatDelay(P)}`));
          },
          Math.min(e.timeoutMs, 2147483647),
          e.timeoutMs,
        ),
      );
    S.on("error", (P) => {
      if (T) return;
      ((T = !0), D(), e.signal?.removeEventListener("abort", oe), w(P));
    });
    let pn,
      Oe = () =>
        (pn ??= (async () => {
          while (!T) {
            let P = await ne;
            if (P === void 0) return;
            let { live: live, incomplete: incomplete } = await countLiveProcesses(P);
            if (((h = live > 0 || incomplete), !h)) return;
            await sleep(Zn);
          }
        })());
    (S.on("exit", (P) => {
      Oe().then(() => {
        if (T) return;
        if (V) {
          L(P);
          return;
        }
        N.push(
          setTimeout(
            (x, G, U) => {
              x(
                `[runner:hook:checkout] hook exited (${Ae(G)}) but a process it started still holds its output pipes. ${U() ? "The slot is not freed" : G.exitCode === 0 ? "The session does not start" : "The hook's failure is not reported"} until that process ends or closes them. The time limit (--checkout-hook-timeout-min) does not end this wait: it stops only a hook that is still running (${$e})`,
              );
            },
            he,
            m,
            S,
            () => s || c,
          ),
        );
      });
    }),
      S.on("close", (P) => {
        if (((q = !0), Oe().then(() => K(P)), ae)) H();
      }));
  });
  let l;
  try {
    l = await withBoundedTimeout(stat(e.checkoutPath), me, `stat ${e.checkoutPath}`);
  } catch (error) {
    if (isENOENT(error))
      throw new CheckoutHookFailedError(
        `checkout hook exited 0 but ${e.checkoutPath} does not exist`,
        0,
        "exited 0 but did not create the checkout directory",
      );
    throw error;
  }
  if (!l.isDirectory())
    throw new CheckoutHookFailedError(
      `checkout hook exited 0 but ${e.checkoutPath} is not a directory`,
      0,
      "exited 0 but the checkout path is not a directory",
    );
  if (process.env.CLAUDE_RUNNER_SKIP_GIT_VERIFY !== "1")
    try {
      await withBoundedTimeout(stat(join(e.checkoutPath, ".git")), me, `stat ${e.checkoutPath}/.git`);
    } catch (error) {
      if (isENOENT(error))
        throw new CheckoutHookFailedError(
          `checkout hook succeeded but ${e.checkoutPath}/.git is missing (for non-git SCMs, set CLAUDE_RUNNER_SKIP_GIT_VERIFY=1 in the runner's environment)`,
          0,
          "exited 0 but left no .git in the checkout directory",
        );
      throw error;
    }
}
//@ chunk-3nztfxrw.js:51492-51504 placement
var tn = 2000;
/**
 * 在途计数（increment/decrement）。旧版名 useCounter 为错配。
 */
//@ chunk-3nztfxrw.js:51504-51581 placement = useCounter (0.533)
class InFlightCounter {
  inFlight = 0;
  increment() {
    this.inFlight++;
  }
  decrement() {
    this.inFlight--;
  }
}
/**
 * 按 host 存放 InFlightCounter 的槽。
 */
//@ chunk-3nztfxrw.js:51581-51606 placement
var inFlightCounterSlot = new HostScoped(() => new InFlightCounter());
//@ chunk-3nztfxrw.js:51606-51643 placement
function ln() {
  return inFlightCounterSlot.of(getRootSession().host);
}
//@ chunk-3nztfxrw.js:51643-51679 placement
function postSessionHooksRunning() {
  return ln().inFlight;
}
/**
 * 会话结束后的 post-session 钩子，带时间预算
 */
//@ chunk-3nztfxrw.js:51679-54245 placement
async function runPostSessionHook(e) {
  let n = {
    ...hookEnvironment(),
    ...e.gitEnvironment?.envOverrides,
    CLAUDE_RUNNER_SESSION_ID: e.sessionId.replace(/^cse_/, "session_"),
    CLAUDE_RUNNER_SESSION_UUID: decodeTaggedUuid(e.sessionId),
    CLAUDE_RUNNER_EXIT_REASON: e.exitReason,
    CLAUDE_RUNNER_DEBUG_LOG_PATH: e.debugLogPath,
    CLAUDE_RUNNER_WORKSPACE_PATHS: e.workspacePaths.join(":"),
    CLAUDE_RUNNER_API_BASE_URL: e.apiBaseUrl,
    CLAUDE_RUNNER_CLIENT_PLATFORM: sanitizeMetricLabel(e.clientPlatform),
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: e.sessionAccessToken,
  };
  e.onStatus(
    `[runner:hook] post-session hook starting (session exit: ${e.exitReason}, budget ${e.timeoutMs}ms, via ${e.hookPath})`,
  );
  let now = Date.now(),
    m = () => {},
    promise = new Promise((R) => {
      m = R;
    }),
    t = spawn(e.hookPath, [], {
      cwd: e.cwd,
      env: gitConfigEnvArgs(
        e.gitConfigPins?.length ? withLifecycleHookGitEnv(n) : n,
        mergeCommandScopes(e.gitConfigPins, e.gitEnvironment, e.gitConfigLegacyParams),
        { legacyParams: e.gitConfigLegacyParams },
      ),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: !0,
      ...Nd("hooks"),
      detached: !0,
    }),
    i = ln();
  i.increment();
  let s = !1,
    c = !1,
    l = [],
    b = () => {
      if (s) return;
      ((s = !0), i.decrement());
      for (let R of l) clearTimeout(R);
      m();
    },
    w = (R) => {
      let pid = t.pid;
      if (pid === void 0) {
        t.kill(R);
        return;
      }
      if (pid <= 1) return;
      try {
        process.kill(-pid, R);
      } catch {
        t.kill(R);
      }
    },
    S = e.timeoutMs > 0 ? e.timeoutMs : 1;
  l.push(
    setTimeout(
      (R, A, F, K) => {
        if (A.exitCode !== null || A.signalCode !== null) return;
        ((c = !0),
          R(
            `[runner:hook:post-session] timed out after ${F}ms, sending SIGTERM to the hook's process group (pgid=${A.pid})`,
          ),
          K("SIGTERM"));
      },
      S,
      e.onDebug,
      t,
      S,
      w,
    ),
    setTimeout(
      (R, A, F) => {
        if (!c) return;
        (R(
          `[runner:hook:post-session] still running after SIGTERM, sending SIGKILL to the hook's process group (pgid=${A.pid})`,
        ),
          F("SIGKILL"));
      },
      Math.min(S + tn, 2147483647),
      e.onDebug,
      t,
      w,
    ),
    setTimeout(
      (R, A, F) => {
        (R(
          `[runner:hook:post-session] resolved without 'close' (${Date.now() - F}ms, grandchild likely holding stdio pipes; ignored)`,
        ),
          A());
      },
      Math.min(S + tn + 1000, 2147483647),
      e.onStatus,
      b,
      now,
    ),
  );
  let T = "",
    N = "",
    D = (R) => {
      let parts = R.split(`
`),
        F = parts.pop() ?? "";
      for (let K of parts) e.onDebug(`[runner:hook:post-session] ${redactSecretsInText(K)}`);
      return F;
    };
  return (
    t.stdout.on("data", (R) => {
      ((T += R.toString()), (T = D(T)));
    }),
    t.stderr.on("data", (R) => {
      ((N += R.toString()), (N = D(N)));
    }),
    t.on("error", (R) => {
      (e.onStatus(
        `[runner:hook:post-session] spawn error (ignored): ${redactSecretsInText(R instanceof Error ? R.message : String(R))}`,
      ),
        b());
    }),
    t.on("close", (R) => {
      if (T) e.onDebug(`[runner:hook:post-session] ${redactSecretsInText(T)}`);
      if (N) e.onDebug(`[runner:hook:post-session] ${redactSecretsInText(N)}`);
      let A = Date.now() - now;
      if (c) e.onStatus(`[runner:hook:post-session] killed after timeout (${A}ms, ignored)`);
      else if (R !== 0)
        e.onStatus(`[runner:hook:post-session] exited ${R ?? "via signal"} (${A}ms, ignored)`);
      else e.onStatus(`[runner:hook:post-session] done (exit 0, ${A}ms)`);
      b();
    }),
    promise
  );
}

export {
  assertLifecycleHooksSupported,
  findHook,
  runCheckoutHook,
  CheckoutHookFailedError,
  CheckoutHookTimedOutError,
  runPostSessionHook,
  LIFECYCLE_HOOK_GIT_NEUTRAL_PINS,
  lifecycleHookGpgProgramPins,
  postSessionHooksRunning,
};
