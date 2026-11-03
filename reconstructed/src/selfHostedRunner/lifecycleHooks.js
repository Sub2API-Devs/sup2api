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
import { constants } from "fs";
import { spawn } from "child_process";
import { withBoundedTimeout } from "../utils/boundedTimeout.js";
import { ALTERNATE_REFS_COMMAND } from "../utils/gitSafeExec.js";
import {
  PROCESS_COMMAND_TIMEOUT_MS,
  snapshotProcessTree,
  MAX_PROCESS_TABLE_ENTRIES,
  killProcessTree,
  countLiveProcesses,
} from "./processTable.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, isENOENT } from "../utils/errors.js";
import { decodeTaggedUuid } from "../services/mcp/serverIdentity.js";
import { sanitizeMetricLabel } from "../entrypoints/selfHostedRunner/metrics.js";
import { redactSecretsInText } from "../utils/redactSecrets.js";
import { cgroupSpawnOptions } from "../utils/toolCgroup.js";
import { takeLastChars } from "../utils/stringUtils.js";
import { formatDelay } from "../bridge/bridgeMain.js";
import { sleep } from "../utils/sleep.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-3nztfxrw.js:40006-40018 placement
var FILESYSTEM_CHECK_TIMEOUT_MS = 5000;
//@ chunk-3nztfxrw.js:40018-40243 placement
function hookEnvironment() {
  return {
    ...process.env,
    SELF_HOSTED_RUNNER_POOL_SECRET: undefined,
    SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: undefined,
    SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND: undefined,
    SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE: undefined,
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
    if (!(await withBoundedTimeout(stat(r), FILESYSTEM_CHECK_TIMEOUT_MS, `stat ${r}`)).isFile()) return null;
    await withBoundedTimeout(access(r, constants.X_OK), FILESYSTEM_CHECK_TIMEOUT_MS, `access ${r}`);
    return r;
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
  ["core.alternateRefsCommand", ALTERNATE_REFS_COMMAND],
  ["core.attributesFile", "/dev/null"],
];
var LIFECYCLE_HOOK_GIT_ENV = {
  GIT_PROXY_COMMAND: "",
  GIT_ALLOW_PROTOCOL: "https:http:ssh",
  GIT_EDITOR: ":",
  GIT_SEQUENCE_EDITOR: ":",
  GIT_SSH_COMMAND: "ssh",
};
//@ chunk-3nztfxrw.js:41934-42196 placement
function withLifecycleHookGitEnv(e = hookEnvironment()) {
  let n;
  for (let [key, value] of Object.entries(LIFECYCLE_HOOK_GIT_ENV)) {
    if (e[key] !== undefined) continue;
    n ??= {
      ...e,
    };
    n[key] =
      key === "GIT_SSH_COMMAND" && e.GIT_SSH !== undefined ? `'${e.GIT_SSH.replace(/'/g, "'\\''")}'` : value;
  }
  if (lifecycleHookAskpassSource(e) === "handedOn") {
    n ??= {
      ...e,
    };
    n.GIT_ASKPASS = e.SSH_ASKPASS;
  }
  return n ?? e;
}
//@ chunk-3nztfxrw.js:42196-42317 placement
function lifecycleHookAskpassSource(e = hookEnvironment()) {
  if (e.GIT_ASKPASS !== undefined || envHasGitConfigKey("core.askPass", e)) return "own";
  return e.SSH_ASKPASS ? "handedOn" : "none";
}
//@ chunk-3nztfxrw.js:42317-42328 placement
var MAX_GIT_CONFIG_PAIRS = 256;
//@ chunk-3nztfxrw.js:42328-42658 placement
function operatorGitConfigPairStatus(e = hookEnvironment()) {
  let match = /^\s*\+?(\d+)$/.exec(e.GIT_CONFIG_COUNT ?? "");
  let r = match ? parseInt(match[1], 10) : 0;
  if (!Number.isSafeInteger(r) || r === 0)
    return {
      count: 0,
      announced: 0,
    };
  if (r > MAX_GIT_CONFIG_PAIRS)
    return {
      count: 0,
      discarded: "too-many",
      announced: r,
    };
  if (e[`GIT_CONFIG_KEY_${r - 1}`] === undefined)
    return {
      count: 0,
      discarded: "sparse",
      announced: r,
    };
  return {
    count: r,
    announced: r,
  };
}
//@ chunk-3nztfxrw.js:42658-42693 placement
function countOperatorGitConfigPairs(e) {
  return operatorGitConfigPairStatus(e).count;
}
//@ chunk-3nztfxrw.js:42693-42836 placement
function envHasGitConfigKey(e, n = hookEnvironment()) {
  let r = countOperatorGitConfigPairs(n);
  let lower = e.toLowerCase();
  for (let i = 0; i < r; i++) if ((n[`GIT_CONFIG_KEY_${i}`] ?? "").toLowerCase() === lower) return true;
  return false;
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
  let m = countOperatorGitConfigPairs(e);
  let a = {
    ...e,
  };
  let t = n.length;
  for (let i = 0; i < m; i++) {
    delete a[`GIT_CONFIG_KEY_${i}`];
    delete a[`GIT_CONFIG_VALUE_${i}`];
  }
  for (let i = 0; i < m; i++) {
    let s = e[`GIT_CONFIG_KEY_${i}`];
    let c = e[`GIT_CONFIG_VALUE_${i}`];
    if (s !== undefined) a[`GIT_CONFIG_KEY_${t + i}`] = s;
    if (c !== undefined) a[`GIT_CONFIG_VALUE_${t + i}`] = c;
  }
  n.forEach(([i, s], c) => {
    a[`GIT_CONFIG_KEY_${c}`] = i;
    a[`GIT_CONFIG_VALUE_${c}`] = s;
  });
  a.GIT_CONFIG_COUNT = String(t + m);
  if (r?.legacyParams) {
    let i = (l) => `'${l.replace(/'/g, "'\\''")}'`;
    let mapped = n.map(([l, b]) => i(`${l}=${b}`));
    let c = [];
    for (let idx = 0; idx < m; idx++) {
      let b = e[`GIT_CONFIG_KEY_${idx}`];
      if (b !== undefined) c.push(i(`${b}=${e[`GIT_CONFIG_VALUE_${idx}`] ?? ""}`));
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
function mergeCommandScopes(gitConfigPins, gitEnvironment, gitConfigLegacyParams) {
  let commandScopeEntries = gitEnvironment?.commandScopeEntries ?? [];
  let a =
    gitConfigLegacyParams && commandScopeEntries.some(([t]) => t.includes("=")) ? [] : commandScopeEntries;
  return [...(gitConfigPins ?? []), ...a];
}
//@ chunk-3nztfxrw.js:43881-44131 placement
/**
 * hook 进程的生命周期常量：残留输出窗口 1 s、SIGKILL 期限 5 s、进程快照 500 ms、清理宽限等，以及残留输出的提示文案。
 */
var LINGERING_OUTPUT_MS = 1000;
var HOOK_CLEANUP_GRACE_MS = 1500;
var SIGKILL_AFTER_MS = 5000;
var PROCESS_SNAPSHOT_TIMEOUT_MS = 500;
var HOOK_OUTPUT_SETTLE_MS = PROCESS_SNAPSHOT_TIMEOUT_MS + PROCESS_COMMAND_TIMEOUT_MS;
var POST_HOOK_SLEEP_MS = 100;
var LINGERING_OUTPUT_ADVICE =
  "a hook should `exec` or `wait` for its long-running commands, stop a command's child processes too if it stops that command early, and start a daemon with its output redirected: >/dev/null 2>&1";
//@ chunk-3nztfxrw.js:44131-44221 placement
function exitDescription(e) {
  return e.signalCode !== null ? `signal ${e.signalCode}` : `status ${e.exitCode}`;
}
//@ chunk-3nztfxrw.js:44221-44430 placement
function lingeringOutputMessage(e) {
  return `hook exited (${exitDescription(e)}) but a process it started still holds its output pipes; not waiting for them to close. The runner has not stopped that process, and it may still be running (${LINGERING_OUTPUT_ADVICE})`;
}
//@ chunk-3nztfxrw.js:44564-44676 placement
class CheckoutHookFailedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  exitCode;
  constructor(message, exitCode, r) {
    super(message, r);
    this.name = "CheckoutHookFailedError";
    this.exitCode = exitCode;
  }
}
//@ chunk-3nztfxrw.js:44676-44785 placement
class CheckoutHookTimedOutError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(e, "checkout hook timed out");
    this.name = "CheckoutHookTimedOutError";
  }
}
//@ chunk-3nztfxrw.js:44785-51492 placement
/**
 * 自托管 runner 的 checkout 生命周期钩子：带预算运行并记录日志
 */
async function runCheckoutHook(e) {
  let r = {
    ...hookEnvironment(),
    ...e.gitEnvironment?.envOverrides,
    ...false,
    CLAUDE_RUNNER_SESSION_ID: e.sessionId.replace(/^cse_/, "session_"),
    CLAUDE_RUNNER_SESSION_UUID: decodeTaggedUuid(e.sessionId),
    CLAUDE_RUNNER_REPO_URL: e.repoUrl,
    CLAUDE_RUNNER_REPO_REF: e.repoRef ?? "",
    CLAUDE_RUNNER_CHECKOUT_PATH: e.checkoutPath,
    CLAUDE_RUNNER_API_BASE_URL: e.apiBaseUrl,
    CLAUDE_RUNNER_GIT_MOUNT_URL: e.gitMountUrl,
    CLAUDE_RUNNER_CLIENT_PLATFORM: sanitizeMetricLabel(e.clientPlatform),
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: e.sessionAccessToken,
  };
  let m = (b) => {
    try {
      e.onStatus(b);
    } catch {}
  };
  let a = (b) => {
    try {
      e.onDebug(b);
    } catch {}
  };
  m(`[runner:hook] checkout ${redactSecretsInText(e.repoUrl)} -> ${e.checkoutPath} (via ${e.hookPath})`);
  let t = [];
  let i = (b) => {
    try {
      e.onStderrLine?.(b);
    } catch {}
  };
  let s = false;
  let c = false;
  await new Promise((resolve, reject) => {
    let S = spawn(e.hookPath, [], {
      cwd: e.cwd,
      env: gitConfigEnvArgs(
        e.gitConfigPins?.length ? withLifecycleHookGitEnv(r) : r,
        mergeCommandScopes(e.gitConfigPins, e.gitEnvironment, e.gitConfigLegacyParams),
        {
          legacyParams: e.gitConfigLegacyParams,
        },
      ),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...cgroupSpawnOptions("hooks"),
    });
    let T = false;
    let N = [];
    let D = () => {
      for (let P of N.splice(0)) clearTimeout(P);
    };
    let R = "";
    let A = "";
    let F = (P, x) => {
      let lines = P.split(`
`);
      let U = lines.pop() ?? "";
      for (let line of lines) {
        let ee = redactSecretsInText(line);
        a(`[runner:hook:checkout] ${ee}`);
        if (x) {
          t.push(
            ee +
              `
`,
          );
          i(ee);
        }
      }
      if (x) {
        let reduced = t.reduce((acc, le) => acc + le.length, 0);
        while (reduced > 4096 && t.length > 1) reduced -= t.shift().length;
      }
      return U;
    };
    S.stdout.on("data", (P) => {
      R += P.toString();
      R = F(R, false);
    });
    S.stderr.on("data", (P) => {
      A += P.toString();
      A = F(A, true);
    });
    let K = (exitCode, x) => {
      if (T) return;
      T = true;
      D();
      e.signal?.removeEventListener("abort", oe);
      if (x !== undefined) {
        m(`[runner:hook:checkout] ${x}`);
        S.stdout.destroy();
        S.stderr.destroy();
      }
      if (R) a(`[runner:hook:checkout] ${redactSecretsInText(R)}`);
      if (A) {
        let U = redactSecretsInText(A);
        a(`[runner:hook:checkout] ${U}`);
        t.push(U);
        i(U);
      }
      let G = takeLastChars(t.join(""), 4096);
      if (c) {
        if (G.trim() !== "") {
          let U = redactSecretsInText(G);
          m(
            `[runner:hook:checkout] the hook's last output before the time limit: ${U.length > HOOK_CLEANUP_GRACE_MS ? "\u2026" : ""}${takeLastChars(
              U,
              HOOK_CLEANUP_GRACE_MS,
            )
              .trimEnd()
              .replace(/\s*[\r\n]+\s*/g, " | ")
              .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, " ")}`,
          );
        }
        reject(
          new CheckoutHookTimedOutError(
            `checkout hook timed out after ${formatDelay(e.timeoutMs ?? 0)} (the runner's --checkout-hook-timeout-min limit)`,
          ),
        );
      } else if (s) reject(Error("checkout hook aborted"));
      else if (exitCode === 0) resolve();
      else {
        let message = `checkout hook failed (exit ${exitCode}): ${G}`;
        reject(
          exitCode === null
            ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                message,
                "checkout hook killed by signal",
              )
            : new CheckoutHookFailedError(message, exitCode, `exited with status ${exitCode}`),
        );
      }
    };
    let X = false;
    let V = false;
    let q = false;
    let ae = false;
    let Z = () => S.exitCode === null && S.signalCode === null;
    let ne;
    let h = false;
    let y = async (P, x) => {
      let pid = S.pid;
      let U = [];
      let Y = false;
      if (pid !== undefined && Z()) {
        let Ne = snapshotProcessTree(
          {
            pid,
            alive: true,
            token: undefined,
          },
          PROCESS_SNAPSHOT_TIMEOUT_MS,
        );
        ne = Promise.all([ne, Ne]).then(([_e, pe]) =>
          _e === undefined || pe === undefined
            ? (_e ?? pe)
            : {
                ...pe,
                pinned: new Map([..._e.pinned, ...pe.pinned]),
              },
        );
        let ue = await Ne;
        Y = Z() && S.kill(P);
        V ||= Y;
        a(
          Y
            ? `[runner:hook:checkout] ${x}, sending ${P} to the hook's process tree (pid=${pid})`
            : `[runner:hook:checkout] ${x}, but the hook process could no longer be sent ${P}; what it started still is, as far as it was listed`,
        );
        if (ue === undefined) U.push(`the process table could not be read before ${P}`);
        else {
          if (ue.unpinned > 0) U.push(`${ue.unpinned} could not be identified`);
          if (ue.truncated) U.push(`it had more than ${MAX_PROCESS_TABLE_ENTRIES} processes`);
          if (ue.degraded) U.push("`ps` failed part-way");
        }
      }
      let ee = await ne;
      if (ee === undefined) {
        if (U.length > 0 && P === "SIGTERM")
          m(
            `[runner:hook:checkout] could not read the process table (is /proc mounted? on macOS, is \`ps\` on PATH?), so ${Y ? "only the hook process was sent SIGTERM" : "nothing was sent SIGTERM"}; programs the hook started, such as git, may still be running and writing to ${e.checkoutPath}`,
          );
        return;
      }
      let { pids, incomplete } = await killProcessTree(ee, P);
      if (U.length > 0)
        m(`[runner:hook:checkout] may not have stopped everything the hook started: ${U.join("; ")}`);
      if (P === "SIGTERM") return;
      if (pids > 0)
        m(
          `[runner:hook:checkout] ${pids} program(s) the hook started were still running ${formatDelay(SIGKILL_AFTER_MS)} after SIGTERM and were sent SIGKILL`,
        );
      if (incomplete)
        m(
          "[runner:hook:checkout] could not check which of the hook's programs were still running; some may be",
        );
    };
    let v = (P, x) => y(P, x).catch(() => {});
    let L = (P) => {
      N.push(setTimeout((x, G, U) => x(G, lingeringOutputMessage(U)), LINGERING_OUTPUT_MS, K, P, S));
    };
    let M = () => {
      if (!V && !Z() && !q) {
        ae = true;
        return;
      }
      let P = Z();
      if (P) S.unref();
      K(
        S.exitCode,
        P
          ? "hook process did not exit after SIGTERM and then SIGKILL (it may be stuck on a disk or network mount); abandoning it, and not waiting for its output pipes to close"
          : h
            ? `hook exited (${exitDescription(S)}) but programs it started may still be running, and may still write to ${e.checkoutPath}; giving up on them`
            : lingeringOutputMessage(S),
      );
    };
    let H = () => {
      if (!T) N.push(setTimeout((P) => P(), LINGERING_OUTPUT_MS, M));
    };
    let Q = (P) => {
      if (X || T) return;
      if (!Z()) {
        m(
          `[runner:hook:checkout] ${P}, but the hook has already exited and there is nothing left to stop; still waiting for its output pipes to close, which a process it started may hold, and the slot stays held until then (${LINGERING_OUTPUT_ADVICE})`,
        );
        return;
      }
      X = true;
      v("SIGTERM", P);
      N.push(
        setTimeout(
          (x, G) => void x("SIGKILL", "still running after SIGTERM").then(G),
          SIGKILL_AFTER_MS,
          v,
          H,
        ),
        setTimeout((x) => x(), SIGKILL_AFTER_MS + HOOK_OUTPUT_SETTLE_MS + LINGERING_OUTPUT_MS, M),
      );
    };
    let oe = () => {
      s = true;
      Q("abort received");
    };
    if (e.signal?.aborted) oe();
    else
      e.signal?.addEventListener("abort", oe, {
        once: true,
      });
    if (e.timeoutMs !== undefined && e.timeoutMs > 0)
      N.push(
        setTimeout(
          (ms) => {
            if (T || s) return;
            if (!Z()) return;
            c = true;
            m(
              `[runner:hook:checkout] timed out after ${formatDelay(ms)} (--checkout-hook-timeout-min) \u2014 stopping the hook and failing this session's setup`,
            );
            Q(`timed out after ${formatDelay(ms)}`);
          },
          Math.min(e.timeoutMs, 2147483647),
          e.timeoutMs,
        ),
      );
    S.on("error", (P) => {
      if (T) return;
      T = true;
      D();
      e.signal?.removeEventListener("abort", oe);
      reject(P);
    });
    let pn;
    let Oe = () =>
      (pn ??= (async () => {
        while (!T) {
          let P = await ne;
          if (P === undefined) return;
          let { live, incomplete } = await countLiveProcesses(P);
          h = live > 0 || incomplete;
          if (!h) return;
          await sleep(POST_HOOK_SLEEP_MS);
        }
      })());
    S.on("exit", (P) => {
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
                `[runner:hook:checkout] hook exited (${exitDescription(G)}) but a process it started still holds its output pipes. ${U() ? "The slot is not freed" : G.exitCode === 0 ? "The session does not start" : "The hook's failure is not reported"} until that process ends or closes them. The time limit (--checkout-hook-timeout-min) does not end this wait: it stops only a hook that is still running (${LINGERING_OUTPUT_ADVICE})`,
              );
            },
            LINGERING_OUTPUT_MS,
            m,
            S,
            () => s || c,
          ),
        );
      });
    });
    S.on("close", (P) => {
      q = true;
      Oe().then(() => K(P));
      if (ae) H();
    });
  });
  let l;
  try {
    l = await withBoundedTimeout(stat(e.checkoutPath), FILESYSTEM_CHECK_TIMEOUT_MS, `stat ${e.checkoutPath}`);
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
      await withBoundedTimeout(
        stat(join(e.checkoutPath, ".git")),
        FILESYSTEM_CHECK_TIMEOUT_MS,
        `stat ${e.checkoutPath}/.git`,
      );
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
var IN_FLIGHT_COUNT_MAX = 2000;
//@ chunk-3nztfxrw.js:51504-51581 placement = useCounter (0.533)
/**
 * 在途计数（increment/decrement）。旧版名 useCounter 为错配。
 */
class InFlightCounter {
  inFlight = 0;
  increment() {
    this.inFlight++;
  }
  decrement() {
    this.inFlight--;
  }
}
//@ chunk-3nztfxrw.js:51581-51606 placement
/**
 * 按 host 存放 InFlightCounter 的槽。
 */
var inFlightCounterSlot = new HostScoped(() => new InFlightCounter());
//@ chunk-3nztfxrw.js:51606-51643 placement
function inFlightCounter() {
  return inFlightCounterSlot.of(getRootSession().host);
}
//@ chunk-3nztfxrw.js:51643-51679 placement
function postSessionHooksRunning() {
  return inFlightCounter().inFlight;
}
//@ chunk-3nztfxrw.js:51679-54245 placement
/**
 * 会话结束后的 post-session 钩子，带时间预算
 */
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
  let now = Date.now();
  let m = () => {};
  let promise = new Promise((resolve) => {
    m = resolve;
  });
  let t = spawn(e.hookPath, [], {
    cwd: e.cwd,
    env: gitConfigEnvArgs(
      e.gitConfigPins?.length ? withLifecycleHookGitEnv(n) : n,
      mergeCommandScopes(e.gitConfigPins, e.gitEnvironment, e.gitConfigLegacyParams),
      {
        legacyParams: e.gitConfigLegacyParams,
      },
    ),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    ...cgroupSpawnOptions("hooks"),
    detached: true,
  });
  let i = inFlightCounter();
  i.increment();
  let s = false;
  let c = false;
  let l = [];
  let b = () => {
    if (s) return;
    s = true;
    i.decrement();
    for (let R of l) clearTimeout(R);
    m();
  };
  let w = (R) => {
    let pid = t.pid;
    if (pid === undefined) {
      t.kill(R);
      return;
    }
    if (pid <= 1) return;
    try {
      process.kill(-pid, R);
    } catch {
      t.kill(R);
    }
  };
  let timeoutMs = e.timeoutMs > 0 ? e.timeoutMs : 1;
  l.push(
    setTimeout(
      (R, A, F, K) => {
        if (A.exitCode !== null || A.signalCode !== null) return;
        c = true;
        R(
          `[runner:hook:post-session] timed out after ${F}ms, sending SIGTERM to the hook's process group (pgid=${A.pid})`,
        );
        K("SIGTERM");
      },
      timeoutMs,
      e.onDebug,
      t,
      timeoutMs,
      w,
    ),
    setTimeout(
      (R, A, F) => {
        if (!c) return;
        R(
          `[runner:hook:post-session] still running after SIGTERM, sending SIGKILL to the hook's process group (pgid=${A.pid})`,
        );
        F("SIGKILL");
      },
      Math.min(timeoutMs + IN_FLIGHT_COUNT_MAX, 2147483647),
      e.onDebug,
      t,
      w,
    ),
    setTimeout(
      (R, A, F) => {
        R(
          `[runner:hook:post-session] resolved without 'close' (${Date.now() - F}ms, grandchild likely holding stdio pipes; ignored)`,
        );
        A();
      },
      Math.min(timeoutMs + IN_FLIGHT_COUNT_MAX + 1000, 2147483647),
      e.onStatus,
      b,
      now,
    ),
  );
  let T = "";
  let N = "";
  let D = (R) => {
    let lines = R.split(`
`);
    let F = lines.pop() ?? "";
    for (let line of lines) e.onDebug(`[runner:hook:post-session] ${redactSecretsInText(line)}`);
    return F;
  };
  t.stdout.on("data", (R) => {
    T += R.toString();
    T = D(T);
  });
  t.stderr.on("data", (R) => {
    N += R.toString();
    N = D(N);
  });
  t.on("error", (R) => {
    e.onStatus(
      `[runner:hook:post-session] spawn error (ignored): ${redactSecretsInText(R instanceof Error ? R.message : String(R))}`,
    );
    b();
  });
  t.on("close", (R) => {
    if (T) e.onDebug(`[runner:hook:post-session] ${redactSecretsInText(T)}`);
    if (N) e.onDebug(`[runner:hook:post-session] ${redactSecretsInText(N)}`);
    let A = Date.now() - now;
    if (c) e.onStatus(`[runner:hook:post-session] killed after timeout (${A}ms, ignored)`);
    else if (R !== 0) e.onStatus(`[runner:hook:post-session] exited ${R ?? "via signal"} (${A}ms, ignored)`);
    else e.onStatus(`[runner:hook:post-session] done (exit 0, ${A}ms)`);
    b();
  });
  return promise;
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
