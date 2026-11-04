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
function assertLifecycleHooksSupported(feature, platform = "linux") {
  if (platform !== "win32") return;
  switch (feature) {
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
async function findHook(hooksDir, name) {
  if (!hooksDir) return null;
  let path = join(hooksDir, name);
  try {
    if (!(await withBoundedTimeout(stat(path), FILESYSTEM_CHECK_TIMEOUT_MS, `stat ${path}`)).isFile())
      return null;
    await withBoundedTimeout(access(path, constants.X_OK), FILESYSTEM_CHECK_TIMEOUT_MS, `access ${path}`);
    return path;
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
function withLifecycleHookGitEnv(envVars = hookEnvironment()) {
  let copy;
  for (let [key, value] of Object.entries(LIFECYCLE_HOOK_GIT_ENV)) {
    if (envVars[key] !== undefined) continue;
    copy ??= {
      ...envVars,
    };
    copy[key] =
      key === "GIT_SSH_COMMAND" && envVars.GIT_SSH !== undefined
        ? `'${envVars.GIT_SSH.replace(/'/g, "'\\''")}'`
        : value;
  }
  if (lifecycleHookAskpassSource(envVars) === "handedOn") {
    copy ??= {
      ...envVars,
    };
    copy.GIT_ASKPASS = envVars.SSH_ASKPASS;
  }
  return copy ?? envVars;
}
//@ chunk-3nztfxrw.js:42196-42317 placement
function lifecycleHookAskpassSource(envVars = hookEnvironment()) {
  if (envVars.GIT_ASKPASS !== undefined || envHasGitConfigKey("core.askPass", envVars)) return "own";
  return envVars.SSH_ASKPASS ? "handedOn" : "none";
}
//@ chunk-3nztfxrw.js:42317-42328 placement
var MAX_GIT_CONFIG_PAIRS = 256;
//@ chunk-3nztfxrw.js:42328-42658 placement
function operatorGitConfigPairStatus(envVars = hookEnvironment()) {
  let match = /^\s*\+?(\d+)$/.exec(envVars.GIT_CONFIG_COUNT ?? "");
  let count = match ? parseInt(match[1], 10) : 0;
  if (!Number.isSafeInteger(count) || count === 0)
    return {
      count: 0,
      announced: 0,
    };
  if (count > MAX_GIT_CONFIG_PAIRS)
    return {
      count: 0,
      discarded: "too-many",
      announced: count,
    };
  if (envVars[`GIT_CONFIG_KEY_${count - 1}`] === undefined)
    return {
      count: 0,
      discarded: "sparse",
      announced: count,
    };
  return {
    count,
    announced: count,
  };
}
//@ chunk-3nztfxrw.js:42658-42693 placement
function countOperatorGitConfigPairs(envVars) {
  return operatorGitConfigPairStatus(envVars).count;
}
//@ chunk-3nztfxrw.js:42693-42836 placement
function envHasGitConfigKey(key, envVars = hookEnvironment()) {
  let count = countOperatorGitConfigPairs(envVars);
  let lower = key.toLowerCase();
  for (let i = 0; i < count; i++)
    if ((envVars[`GIT_CONFIG_KEY_${i}`] ?? "").toLowerCase() === lower) return true;
  return false;
}
//@ chunk-3nztfxrw.js:42836-42997 placement
function lifecycleHookGpgProgramPins(paths, withSsh) {
  let pairs = [
    ["gpg.program", paths.gpg],
    ["gpg.openpgp.program", paths.gpg],
    ["gpg.x509.program", paths.gpgsm],
  ];
  if (withSsh) pairs.push(["gpg.ssh.program", paths.sshKeygen]);
  return pairs;
}
//@ chunk-3nztfxrw.js:42997-43766 placement
function gitConfigEnvArgs(envVars, pairs, legacy) {
  if (!pairs?.length) return envVars;
  let existing = countOperatorGitConfigPairs(envVars);
  let next = {
    ...envVars,
  };
  let added = pairs.length;
  for (let index = 0; index < existing; index++) {
    delete next[`GIT_CONFIG_KEY_${index}`];
    delete next[`GIT_CONFIG_VALUE_${index}`];
  }
  for (let index = 0; index < existing; index++) {
    let key = envVars[`GIT_CONFIG_KEY_${index}`];
    let value = envVars[`GIT_CONFIG_VALUE_${index}`];
    if (key !== undefined) next[`GIT_CONFIG_KEY_${added + index}`] = key;
    if (value !== undefined) next[`GIT_CONFIG_VALUE_${added + index}`] = value;
  }
  pairs.forEach(([key, value], index) => {
    next[`GIT_CONFIG_KEY_${index}`] = key;
    next[`GIT_CONFIG_VALUE_${index}`] = value;
  });
  next.GIT_CONFIG_COUNT = String(added + existing);
  if (legacy?.legacyParams) {
    let shellQuote = (text) => `'${text.replace(/'/g, "'\\''")}'`;
    let mapped = pairs.map(([key, value]) => shellQuote(`${key}=${value}`));
    let extraArgs = [];
    for (let idx = 0; idx < existing; idx++) {
      let key = envVars[`GIT_CONFIG_KEY_${idx}`];
      if (key !== undefined) extraArgs.push(shellQuote(`${key}=${envVars[`GIT_CONFIG_VALUE_${idx}`] ?? ""}`));
    }
    next.GIT_CONFIG_PARAMETERS = [
      ...mapped,
      ...extraArgs,
      ...(envVars.GIT_CONFIG_PARAMETERS ? [envVars.GIT_CONFIG_PARAMETERS] : []),
    ].join(" ");
  }
  return next;
}
//@ chunk-3nztfxrw.js:43766-43881 placement
function mergeCommandScopes(gitConfigPins, gitEnvironment, gitConfigLegacyParams) {
  let commandScopeEntries = gitEnvironment?.commandScopeEntries ?? [];
  let entries =
    gitConfigLegacyParams && commandScopeEntries.some(([entry]) => entry.includes("="))
      ? []
      : commandScopeEntries;
  return [...(gitConfigPins ?? []), ...entries];
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
function exitDescription(child) {
  return child.signalCode !== null ? `signal ${child.signalCode}` : `status ${child.exitCode}`;
}
//@ chunk-3nztfxrw.js:44221-44430 placement
function lingeringOutputMessage(child) {
  return `hook exited (${exitDescription(child)}) but a process it started still holds its output pipes; not waiting for them to close. The runner has not stopped that process, and it may still be running (${LINGERING_OUTPUT_ADVICE})`;
}
//@ chunk-3nztfxrw.js:44564-44676 placement
class CheckoutHookFailedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  exitCode;
  constructor(message, exitCode, safeMessage) {
    super(message, safeMessage);
    this.name = "CheckoutHookFailedError";
    this.exitCode = exitCode;
  }
}
//@ chunk-3nztfxrw.js:44676-44785 placement
class CheckoutHookTimedOutError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(safeMessage) {
    super(safeMessage, "checkout hook timed out");
    this.name = "CheckoutHookTimedOutError";
  }
}
//@ chunk-3nztfxrw.js:44785-51492 placement
/**
 * 自托管 runner 的 checkout 生命周期钩子：带预算运行并记录日志
 */
async function runCheckoutHook(options) {
  let envVars = {
    ...hookEnvironment(),
    ...options.gitEnvironment?.envOverrides,
    ...false,
    CLAUDE_RUNNER_SESSION_ID: options.sessionId.replace(/^cse_/, "session_"),
    CLAUDE_RUNNER_SESSION_UUID: decodeTaggedUuid(options.sessionId),
    CLAUDE_RUNNER_REPO_URL: options.repoUrl,
    CLAUDE_RUNNER_REPO_REF: options.repoRef ?? "",
    CLAUDE_RUNNER_CHECKOUT_PATH: options.checkoutPath,
    CLAUDE_RUNNER_API_BASE_URL: options.apiBaseUrl,
    CLAUDE_RUNNER_GIT_MOUNT_URL: options.gitMountUrl,
    CLAUDE_RUNNER_CLIENT_PLATFORM: sanitizeMetricLabel(options.clientPlatform),
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: options.sessionAccessToken,
  };
  let reportStatus = (text) => {
    try {
      options.onStatus(text);
    } catch {}
  };
  let debug = (text) => {
    try {
      options.onDebug(text);
    } catch {}
  };
  reportStatus(
    `[runner:hook] checkout ${redactSecretsInText(options.repoUrl)} -> ${options.checkoutPath} (via ${options.hookPath})`,
  );
  let tailLines = [];
  let emitStderrLine = (line) => {
    try {
      options.onStderrLine?.(line);
    } catch {}
  };
  let aborted = false;
  let timedOut = false;
  await new Promise((resolve, reject) => {
    let child = spawn(options.hookPath, [], {
      cwd: options.cwd,
      env: gitConfigEnvArgs(
        options.gitConfigPins?.length ? withLifecycleHookGitEnv(envVars) : envVars,
        mergeCommandScopes(options.gitConfigPins, options.gitEnvironment, options.gitConfigLegacyParams),
        {
          legacyParams: options.gitConfigLegacyParams,
        },
      ),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...cgroupSpawnOptions("hooks"),
    });
    let settled = false;
    let timers = [];
    let clearTimers = () => {
      for (let timer of timers.splice(0)) clearTimeout(timer);
    };
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let consumeChunk = (buffer, fromStderr) => {
      let lines = buffer.split(`
`);
      let partial = lines.pop() ?? "";
      for (let line of lines) {
        let redacted = redactSecretsInText(line);
        debug(`[runner:hook:checkout] ${redacted}`);
        if (fromStderr) {
          tailLines.push(
            redacted +
              `
`,
          );
          emitStderrLine(redacted);
        }
      }
      if (fromStderr) {
        let reduced = tailLines.reduce((acc, line) => acc + line.length, 0);
        while (reduced > 4096 && tailLines.length > 1) reduced -= tailLines.shift().length;
      }
      return partial;
    };
    child.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
      stdoutBuffer = consumeChunk(stdoutBuffer, false);
    });
    child.stderr.on("data", (data) => {
      stderrBuffer += data.toString();
      stderrBuffer = consumeChunk(stderrBuffer, true);
    });
    let finishOnce = (exitCode, signalName) => {
      if (settled) return;
      settled = true;
      clearTimers();
      options.signal?.removeEventListener("abort", onAbort);
      if (signalName !== undefined) {
        reportStatus(`[runner:hook:checkout] ${signalName}`);
        child.stdout.destroy();
        child.stderr.destroy();
      }
      if (stdoutBuffer) debug(`[runner:hook:checkout] ${redactSecretsInText(stdoutBuffer)}`);
      if (stderrBuffer) {
        let redactedStderr = redactSecretsInText(stderrBuffer);
        debug(`[runner:hook:checkout] ${redactedStderr}`);
        tailLines.push(redactedStderr);
        emitStderrLine(redactedStderr);
      }
      let tail = takeLastChars(tailLines.join(""), 4096);
      if (timedOut) {
        if (tail.trim() !== "") {
          let redactedTail = redactSecretsInText(tail);
          reportStatus(
            `[runner:hook:checkout] the hook's last output before the time limit: ${redactedTail.length > HOOK_CLEANUP_GRACE_MS ? "\u2026" : ""}${takeLastChars(
              redactedTail,
              HOOK_CLEANUP_GRACE_MS,
            )
              .trimEnd()
              .replace(/\s*[\r\n]+\s*/g, " | ")
              .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, " ")}`,
          );
        }
        reject(
          new CheckoutHookTimedOutError(
            `checkout hook timed out after ${formatDelay(options.timeoutMs ?? 0)} (the runner's --checkout-hook-timeout-min limit)`,
          ),
        );
      } else if (aborted) reject(Error("checkout hook aborted"));
      else if (exitCode === 0) resolve();
      else {
        let message = `checkout hook failed (exit ${exitCode}): ${tail}`;
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
    let stopping = false;
    let killed = false;
    let closed = false;
    let waitingLingering = false;
    let isAlive = () => child.exitCode === null && child.signalCode === null;
    let processSnapshot;
    let lingeringProcs = false;
    let signalTree = async (signalName, reason) => {
      let pid = child.pid;
      let gaps = [];
      let signalled = false;
      if (pid !== undefined && isAlive()) {
        let snapshotPromise = snapshotProcessTree(
          {
            pid,
            alive: true,
            token: undefined,
          },
          PROCESS_SNAPSHOT_TIMEOUT_MS,
        );
        processSnapshot = Promise.all([processSnapshot, snapshotPromise]).then(
          ([previousSnapshot, snapshot]) =>
            previousSnapshot === undefined || snapshot === undefined
              ? (previousSnapshot ?? snapshot)
              : {
                  ...snapshot,
                  pinned: new Map([...previousSnapshot.pinned, ...snapshot.pinned]),
                },
        );
        let snapshotResult = await snapshotPromise;
        signalled = isAlive() && child.kill(signalName);
        killed ||= signalled;
        debug(
          signalled
            ? `[runner:hook:checkout] ${reason}, sending ${signalName} to the hook's process tree (pid=${pid})`
            : `[runner:hook:checkout] ${reason}, but the hook process could no longer be sent ${signalName}; what it started still is, as far as it was listed`,
        );
        if (snapshotResult === undefined)
          gaps.push(`the process table could not be read before ${signalName}`);
        else {
          if (snapshotResult.unpinned > 0) gaps.push(`${snapshotResult.unpinned} could not be identified`);
          if (snapshotResult.truncated) gaps.push(`it had more than ${MAX_PROCESS_TABLE_ENTRIES} processes`);
          if (snapshotResult.degraded) gaps.push("`ps` failed part-way");
        }
      }
      let snapshot = await processSnapshot;
      if (snapshot === undefined) {
        if (gaps.length > 0 && signalName === "SIGTERM")
          reportStatus(
            `[runner:hook:checkout] could not read the process table (is /proc mounted? on macOS, is \`ps\` on PATH?), so ${signalled ? "only the hook process was sent SIGTERM" : "nothing was sent SIGTERM"}; programs the hook started, such as git, may still be running and writing to ${options.checkoutPath}`,
          );
        return;
      }
      let { pids, incomplete } = await killProcessTree(snapshot, signalName);
      if (gaps.length > 0)
        reportStatus(
          `[runner:hook:checkout] may not have stopped everything the hook started: ${gaps.join("; ")}`,
        );
      if (signalName === "SIGTERM") return;
      if (pids > 0)
        reportStatus(
          `[runner:hook:checkout] ${pids} program(s) the hook started were still running ${formatDelay(SIGKILL_AFTER_MS)} after SIGTERM and were sent SIGKILL`,
        );
      if (incomplete)
        reportStatus(
          "[runner:hook:checkout] could not check which of the hook's programs were still running; some may be",
        );
    };
    let signalTreeQuietly = (signalName, reason) => signalTree(signalName, reason).catch(() => {});
    let scheduleLingeringReport = (exitCode) => {
      timers.push(
        setTimeout(
          (finish, code, child) => finish(code, lingeringOutputMessage(child)),
          LINGERING_OUTPUT_MS,
          finishOnce,
          exitCode,
          child,
        ),
      );
    };
    let abandon = () => {
      if (!killed && !isAlive() && !closed) {
        waitingLingering = true;
        return;
      }
      let alive = isAlive();
      if (alive) child.unref();
      finishOnce(
        child.exitCode,
        alive
          ? "hook process did not exit after SIGTERM and then SIGKILL (it may be stuck on a disk or network mount); abandoning it, and not waiting for its output pipes to close"
          : lingeringProcs
            ? `hook exited (${exitDescription(child)}) but programs it started may still be running, and may still write to ${options.checkoutPath}; giving up on them`
            : lingeringOutputMessage(child),
      );
    };
    let afterLingering = () => {
      if (!settled) timers.push(setTimeout((call) => call(), LINGERING_OUTPUT_MS, abandon));
    };
    let stopHook = (reason) => {
      if (stopping || settled) return;
      if (!isAlive()) {
        reportStatus(
          `[runner:hook:checkout] ${reason}, but the hook has already exited and there is nothing left to stop; still waiting for its output pipes to close, which a process it started may hold, and the slot stays held until then (${LINGERING_OUTPUT_ADVICE})`,
        );
        return;
      }
      stopping = true;
      signalTreeQuietly("SIGTERM", reason);
      timers.push(
        setTimeout(
          (signalTree, next) => void signalTree("SIGKILL", "still running after SIGTERM").then(next),
          SIGKILL_AFTER_MS,
          signalTreeQuietly,
          afterLingering,
        ),
        setTimeout((call) => call(), SIGKILL_AFTER_MS + HOOK_OUTPUT_SETTLE_MS + LINGERING_OUTPUT_MS, abandon),
      );
    };
    let onAbort = () => {
      aborted = true;
      stopHook("abort received");
    };
    if (options.signal?.aborted) onAbort();
    else
      options.signal?.addEventListener("abort", onAbort, {
        once: true,
      });
    if (options.timeoutMs !== undefined && options.timeoutMs > 0)
      timers.push(
        setTimeout(
          (ms) => {
            if (settled || aborted) return;
            if (!isAlive()) return;
            timedOut = true;
            reportStatus(
              `[runner:hook:checkout] timed out after ${formatDelay(ms)} (--checkout-hook-timeout-min) \u2014 stopping the hook and failing this session's setup`,
            );
            stopHook(`timed out after ${formatDelay(ms)}`);
          },
          Math.min(options.timeoutMs, 2147483647),
          options.timeoutMs,
        ),
      );
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimers();
      options.signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    let drainPromise;
    let waitForProcs = () =>
      (drainPromise ??= (async () => {
        while (!settled) {
          let snapshot = await processSnapshot;
          if (snapshot === undefined) return;
          let { live, incomplete } = await countLiveProcesses(snapshot);
          lingeringProcs = live > 0 || incomplete;
          if (!lingeringProcs) return;
          await sleep(POST_HOOK_SLEEP_MS);
        }
      })());
    child.on("exit", (code) => {
      waitForProcs().then(() => {
        if (settled) return;
        if (killed) {
          scheduleLingeringReport(code);
          return;
        }
        timers.push(
          setTimeout(
            (report, child, isStopping) => {
              report(
                `[runner:hook:checkout] hook exited (${exitDescription(child)}) but a process it started still holds its output pipes. ${isStopping() ? "The slot is not freed" : child.exitCode === 0 ? "The session does not start" : "The hook's failure is not reported"} until that process ends or closes them. The time limit (--checkout-hook-timeout-min) does not end this wait: it stops only a hook that is still running (${LINGERING_OUTPUT_ADVICE})`,
              );
            },
            LINGERING_OUTPUT_MS,
            reportStatus,
            child,
            () => aborted || timedOut,
          ),
        );
      });
    });
    child.on("close", (code) => {
      closed = true;
      waitForProcs().then(() => finishOnce(code));
      if (waitingLingering) afterLingering();
    });
  });
  let checkoutStat;
  try {
    checkoutStat = await withBoundedTimeout(
      stat(options.checkoutPath),
      FILESYSTEM_CHECK_TIMEOUT_MS,
      `stat ${options.checkoutPath}`,
    );
  } catch (error) {
    if (isENOENT(error))
      throw new CheckoutHookFailedError(
        `checkout hook exited 0 but ${options.checkoutPath} does not exist`,
        0,
        "exited 0 but did not create the checkout directory",
      );
    throw error;
  }
  if (!checkoutStat.isDirectory())
    throw new CheckoutHookFailedError(
      `checkout hook exited 0 but ${options.checkoutPath} is not a directory`,
      0,
      "exited 0 but the checkout path is not a directory",
    );
  if (process.env.CLAUDE_RUNNER_SKIP_GIT_VERIFY !== "1")
    try {
      await withBoundedTimeout(
        stat(join(options.checkoutPath, ".git")),
        FILESYSTEM_CHECK_TIMEOUT_MS,
        `stat ${options.checkoutPath}/.git`,
      );
    } catch (error) {
      if (isENOENT(error))
        throw new CheckoutHookFailedError(
          `checkout hook succeeded but ${options.checkoutPath}/.git is missing (for non-git SCMs, set CLAUDE_RUNNER_SKIP_GIT_VERIFY=1 in the runner's environment)`,
          0,
          "exited 0 but left no .git in the checkout directory",
        );
      throw error;
    }
}
//@ chunk-3nztfxrw.js:51492-51504 placement
var IN_FLIGHT_COUNT_MAX = 2000;
//@ chunk-3nztfxrw.js:51504-51581 placement (2.1.88 match: useCounter, 0.533)
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
async function runPostSessionHook(options) {
  let envVars = {
    ...hookEnvironment(),
    ...options.gitEnvironment?.envOverrides,
    CLAUDE_RUNNER_SESSION_ID: options.sessionId.replace(/^cse_/, "session_"),
    CLAUDE_RUNNER_SESSION_UUID: decodeTaggedUuid(options.sessionId),
    CLAUDE_RUNNER_EXIT_REASON: options.exitReason,
    CLAUDE_RUNNER_DEBUG_LOG_PATH: options.debugLogPath,
    CLAUDE_RUNNER_WORKSPACE_PATHS: options.workspacePaths.join(":"),
    CLAUDE_RUNNER_API_BASE_URL: options.apiBaseUrl,
    CLAUDE_RUNNER_CLIENT_PLATFORM: sanitizeMetricLabel(options.clientPlatform),
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: options.sessionAccessToken,
  };
  options.onStatus(
    `[runner:hook] post-session hook starting (session exit: ${options.exitReason}, budget ${options.timeoutMs}ms, via ${options.hookPath})`,
  );
  let now = Date.now();
  let resolveDone = () => {};
  let promise = new Promise((resolve) => {
    resolveDone = resolve;
  });
  let child = spawn(options.hookPath, [], {
    cwd: options.cwd,
    env: gitConfigEnvArgs(
      options.gitConfigPins?.length ? withLifecycleHookGitEnv(envVars) : envVars,
      mergeCommandScopes(options.gitConfigPins, options.gitEnvironment, options.gitConfigLegacyParams),
      {
        legacyParams: options.gitConfigLegacyParams,
      },
    ),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    ...cgroupSpawnOptions("hooks"),
    detached: true,
  });
  let inflight = inFlightCounter();
  inflight.increment();
  let finished = false;
  let timedOut = false;
  let timers = [];
  let finishOnce = () => {
    if (finished) return;
    finished = true;
    inflight.decrement();
    for (let timer of timers) clearTimeout(timer);
    resolveDone();
  };
  let signalGroup = (signalName) => {
    let pid = child.pid;
    if (pid === undefined) {
      child.kill(signalName);
      return;
    }
    if (pid <= 1) return;
    try {
      process.kill(-pid, signalName);
    } catch {
      child.kill(signalName);
    }
  };
  let timeoutMs = options.timeoutMs > 0 ? options.timeoutMs : 1;
  timers.push(
    setTimeout(
      (debug, child, budgetMs, signalGroup) => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        timedOut = true;
        debug(
          `[runner:hook:post-session] timed out after ${budgetMs}ms, sending SIGTERM to the hook's process group (pgid=${child.pid})`,
        );
        signalGroup("SIGTERM");
      },
      timeoutMs,
      options.onDebug,
      child,
      timeoutMs,
      signalGroup,
    ),
    setTimeout(
      (debug, child, signalGroup) => {
        if (!timedOut) return;
        debug(
          `[runner:hook:post-session] still running after SIGTERM, sending SIGKILL to the hook's process group (pgid=${child.pid})`,
        );
        signalGroup("SIGKILL");
      },
      Math.min(timeoutMs + IN_FLIGHT_COUNT_MAX, 2147483647),
      options.onDebug,
      child,
      signalGroup,
    ),
    setTimeout(
      (reportStatus, finishOnce, startedAt) => {
        reportStatus(
          `[runner:hook:post-session] resolved without 'close' (${Date.now() - startedAt}ms, grandchild likely holding stdio pipes; ignored)`,
        );
        finishOnce();
      },
      Math.min(timeoutMs + IN_FLIGHT_COUNT_MAX + 1000, 2147483647),
      options.onStatus,
      finishOnce,
      now,
    ),
  );
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let consumeChunk = (buffer) => {
    let lines = buffer.split(`
`);
    let partial = lines.pop() ?? "";
    for (let line of lines) options.onDebug(`[runner:hook:post-session] ${redactSecretsInText(line)}`);
    return partial;
  };
  child.stdout.on("data", (data) => {
    stdoutBuffer += data.toString();
    stdoutBuffer = consumeChunk(stdoutBuffer);
  });
  child.stderr.on("data", (data) => {
    stderrBuffer += data.toString();
    stderrBuffer = consumeChunk(stderrBuffer);
  });
  child.on("error", (error) => {
    options.onStatus(
      `[runner:hook:post-session] spawn error (ignored): ${redactSecretsInText(error instanceof Error ? error.message : String(error))}`,
    );
    finishOnce();
  });
  child.on("close", (exitCode) => {
    if (stdoutBuffer) options.onDebug(`[runner:hook:post-session] ${redactSecretsInText(stdoutBuffer)}`);
    if (stderrBuffer) options.onDebug(`[runner:hook:post-session] ${redactSecretsInText(stderrBuffer)}`);
    let elapsedMs = Date.now() - now;
    if (timedOut)
      options.onStatus(`[runner:hook:post-session] killed after timeout (${elapsedMs}ms, ignored)`);
    else if (exitCode !== 0)
      options.onStatus(
        `[runner:hook:post-session] exited ${exitCode ?? "via signal"} (${elapsedMs}ms, ignored)`,
      );
    else options.onStatus(`[runner:hook:post-session] done (exit 0, ${elapsedMs}ms)`);
    finishOnce();
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
  LIFECYCLE_HOOK_GIT_ENV,
  envHasGitConfigKey,
  lifecycleHookAskpassSource,
  operatorGitConfigPairStatus,
  withLifecycleHookGitEnv,
};
