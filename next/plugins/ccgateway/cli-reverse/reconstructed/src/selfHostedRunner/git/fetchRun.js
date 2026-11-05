/**
 * selfHostedRunner/git/fetchRun.ts
 *
 * BYOC 运行 git 子进程（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rzkdv0c6.js (3)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rzkdv0c6.js:27340-27378 placement
var WATCHDOG_SUBCOMMAND_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rzkdv0c6.js:27340", () => {
  WATCHDOG_SUBCOMMAND_SET = new Set(["fetch", "ls-remote"]);
});
//@ chunk-rzkdv0c6.js:27378-27502 placement
function gitSubcommandOf(argv) {
  for (let j = 0; j < argv.length; j++) {
    if (argv[j] === "-c" || argv[j] === "--git-dir" || argv[j] === "-C") {
      j++;
      continue;
    }
    return argv[j];
  }
  return;
}
//@ chunk-rzkdv0c6.js:27502-32456 placement
/**
 * 运行 git 子进程（代理、进度超时、无数据检测）
 */
async function runGit(options, repoPath, args, cwd, capMs = MAX_SERVER_PROGRESS_CAP_MS, extra) {
  let hasToken = options.getAuthToken !== undefined;
  let subcommand = gitSubcommandOf(args);
  let needsProxy = subcommand !== undefined && WATCHDOG_SUBCOMMAND_SET.has(subcommand);
  let proxyToken = hasToken && needsProxy ? options.getAuthToken() : undefined;
  let protocolLocked = cwd?.GIT_ALLOW_PROTOCOL === "none";
  let gitArgs = [
    ...SAFE_GIT_CONFIG_ARGS,
    ...gitConfigPairs(options.gitEnvironment?.commandScopeEntries ?? []),
    ...(protocolLocked ? SAFE_GIT_EXTRA_ARGS : []),
    "-c",
    "http.proxyAuthMethod=basic",
    ...(hasToken && needsProxy ? remoteProxyArgs(options.gitURL) : []),
    ...(proxyToken ? credentialHelperArgs(options.gitURL) : []),
    ...(options.governedMount && needsProxy ? LFS_NO_LOCKVERIFY_ARGS : []),
    ...args,
  ];
  let authToken = proxyToken ?? options.token;
  let mapped = gitArgs.map((arg) => redactGitArg(arg, options.authURL, options.gitURL, authToken));
  options.onDebug(`[byoc:git] git ${mapped.join(" ")} (dir=${repoPath || "."})`);
  let usesProxy = !needsProxy || hasToken || Boolean(options.token);
  let childEnv = {
    ...process.env,
    ...cwd,
    ...options.gitEnvironment?.envOverrides,
    ...(proxyToken
      ? {
          [SHR_GIT_PROXY_TOKEN]: proxyToken,
        }
      : undefined),
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
    ...(hasToken
      ? {
          GIT_CONFIG_GLOBAL: "/dev/null",
        }
      : undefined),
    ...(usesProxy
      ? {
          GIT_CONFIG: undefined,
        }
      : undefined),
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: GIT_NO_PROMPT_ENV.GCM_INTERACTIVE,
    LC_ALL: "C",
    GIT_PROGRESS_DELAY: "0",
    ...SAFE_GIT_ENV,
    ...(options.authURL.startsWith("file://") && {
      GIT_ALLOW_PROTOCOL: `file:${SAFE_GIT_ENV.GIT_ALLOW_PROTOCOL}`,
    }),
    GIT_SSH_COMMAND: `${process.env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
    ...(protocolLocked && {
      GIT_ALLOW_PROTOCOL: "none",
      GIT_SSH_COMMAND: "false",
    }),
  };
  if (usesProxy) {
    for (let key of Object.keys(childEnv)) if (key.toUpperCase() === "GIT_CONFIG") childEnv[key] = undefined;
  }
  let { signal, dispose } = createTimeoutSignal(options.signal, capMs);
  let silenceBudgetMs =
    subcommand !== undefined && SKIP_WATCHDOG_SUBCOMMANDS.has(subcommand)
      ? GIT_WATCHDOG_MS
      : (options.watchdog?.silenceMs ?? MIN_SERVER_PROGRESS_CAP_MS);
  let killReason;
  let lastClientProgress;
  let now = Date.now();
  let preTransferCapMs = options.watchdog?.preTransferCapMs ?? resolveServerProgressCap().capMs;
  let lastServerProgress;
  let serverLabels = new Set();
  let serverProgressAt;
  let stderrTruncated = false;
  let serverStatus = {
    active: false,
  };
  let now_2 = Date.now();
  try {
    return await new Promise((resolve, reject) => {
      let child = spawn("git", gitArgs, {
        cwd: repoPath || undefined,
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
        env: childEnv,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdoutCapBytes = 10485760;
      let stderrTailChars = 8192;
      let stdoutBytes = 0;
      let stdoutChunks = [];
      let stderrTail = "";
      let skipFirstLine = false;
      let lastProgressLogAt = 0;
      let lastLoggedPct = -1;
      let lastDisplayLabel;
      let unrefTimer = (timer) => {
        if (typeof timer === "object" && "unref" in timer) timer.unref();
        return timer;
      };
      let settled = false;
      let killTimer;
      let onStall = (reason) => {
        if (killReason === undefined) killReason = reason;
        child.kill("SIGTERM");
        killTimer ??= unrefTimer(
          setTimeout(() => {
            if (settled) return;
            child.kill("SIGKILL");
            killReason = "escalated";
            settled = true;
            reject(
              Object.assign(Error("git did not exit after SIGTERM"), {
                stdout: Buffer.concat(stdoutChunks).toString("utf8"),
                stderr: stderrTail,
              }),
            );
          }, PROGRESS_LOG_INTERVAL_MS),
        );
      };
      let armSilenceTimer = (delayMs = silenceBudgetMs) =>
        unrefTimer(setTimeout((firedReason) => firedReason("silence"), delayMs, onStall));
      let silenceTimer = armSilenceTimer();
      child.stdout.on("data", (data) => {
        if (stdoutBytes < 10485760) {
          stdoutChunks.push(data);
          stdoutBytes += data.length;
        } else if (extra) extra.stdoutTruncated = true;
      });
      child.stderr.on("data", (data) => {
        let chunk = data.toString("utf8");
        let combined = stderrTail + chunk;
        if (combined.length > 8192) stderrTruncated = true;
        stderrTail = combined.slice(-8192);
        let gitProgress = parseGitProgress(chunk, skipFirstLine);
        let { display, client, server } = gitProgress;
        if (chunk.length > 0) skipFirstLine = !/[\r\n]$/.test(chunk);
        if (extra !== undefined) {
          noteServerProgress(serverStatus, gitProgress, Date.now());
          if (serverStatus.active) extra.sawRemoteActivity = true;
        }
        if (client) {
          if (extra !== undefined) extra.sawClientProgress = true;
          if (silenceBudgetMs < DELTA_COMPLETE_SILENCE_MS && isDeltasComplete(client)) {
            silenceBudgetMs = DELTA_COMPLETE_SILENCE_MS;
            clearTimeout(silenceTimer);
            silenceTimer = armSilenceTimer();
          }
          if (isProgressAdvance(lastClientProgress, client)) {
            now = Date.now();
            clearTimeout(silenceTimer);
            silenceTimer = armSilenceTimer();
          }
          lastClientProgress = client;
          if (
            extra !== undefined &&
            client.bytes !== undefined &&
            client.label === RECEIVING_OBJECTS &&
            client.bytes > (extra.transferBytes ?? -1)
          )
            extra.transferBytes = client.bytes;
        } else if (server !== undefined && lastClientProgress === undefined) {
          if (shouldLogProgress(lastServerProgress, serverLabels, server)) {
            lastServerProgress = server;
            let remainingPreTransferMs = now_2 + preTransferCapMs - Date.now();
            if (preTransferCapMs > 0 && remainingPreTransferMs > 0) {
              serverProgressAt = Date.now();
              clearTimeout(silenceTimer);
              silenceTimer = armSilenceTimer(Math.min(silenceBudgetMs, remainingPreTransferMs));
              if (extra !== undefined) extra.sawServerProgress = true;
            }
          }
          serverLabels.add(server.label);
        }
        if (display) {
          if (display.label !== lastDisplayLabel) {
            lastDisplayLabel = display.label;
            lastLoggedPct = -1;
          }
          let floored = Math.floor(display.pct / 10);
          let sinceLogMs = Date.now() - lastProgressLogAt;
          if (
            sinceLogMs >= STDERR_TAIL_CHARS &&
            (sinceLogMs >= NO_DATA_WARN_MS || floored > Math.floor(lastLoggedPct / 10))
          ) {
            lastProgressLogAt = Date.now();
            lastLoggedPct = display.pct;
            try {
              options.onDebug(`[byoc:git] ${subcommand ?? "git"}: ${display.raw}`);
              options.onProgress?.(subcommand ?? "git", display);
            } catch {}
          }
        }
      });
      let onAbort = () => {
        if (options.signal?.aborted) {
          child.kill("SIGTERM");
          killTimer ??= unrefTimer(
            setTimeout(() => {
              if (settled) return;
              child.kill("SIGKILL");
              settled = true;
              let abortError = Error("The operation was aborted");
              abortError.name = "AbortError";
              reject(
                Object.assign(abortError, {
                  stderr: stderrTail,
                }),
              );
            }, PROGRESS_LOG_INTERVAL_MS),
          );
        } else onStall("hard-cap");
      };
      if (signal.aborted) onAbort();
      else
        signal.addEventListener("abort", onAbort, {
          once: true,
        });
      let spawnError;
      child.on("error", (error) => {
        spawnError = error;
      });
      child.on("close", (exitCode, exitSignal) => {
        if (settled) return;
        settled = true;
        clearTimeout(silenceTimer);
        clearTimeout(killTimer);
        signal.removeEventListener("abort", onAbort);
        if (extra !== undefined) {
          extra.exitCode = exitCode;
          extra.wroteStderr = stderrTail.length > 0;
        }
        let str = Buffer.concat(stdoutChunks).toString("utf8");
        if (options.signal?.aborted && killReason === undefined) {
          let abortError = Error("The operation was aborted");
          abortError.name = "AbortError";
          return reject(
            Object.assign(abortError, {
              stdout: str,
              stderr: stderrTail,
              code: exitCode,
              signal: exitSignal,
            }),
          );
        }
        if (spawnError)
          return reject(
            Object.assign(spawnError, {
              stdout: str,
              stderr: stderrTail,
            }),
          );
        if (exitCode === 0) return resolve(str);
        let exitError = Error(
          exitSignal !== null ? `git exited on signal ${exitSignal}` : `git exited with code ${exitCode}`,
        );
        reject(
          Object.assign(exitError, {
            stdout: str,
            stderr: stderrTail,
            code: exitCode,
            signal: exitSignal,
          }),
        );
      });
    });
  } catch (error) {
    let caught = error;
    if (killReason !== undefined) {
      let progressNote = lastClientProgress
        ? ` at ${lastClientProgress.label} ${lastClientProgress.pct}%${lastClientProgress.total ? ` (${lastClientProgress.done}/${lastClientProgress.total})` : ""}`
        : "";
      let now_3 = Date.now();
      let elapsedMs = now_3 - now;
      let serverNote = "";
      let stallReason = `no forward progress for ${elapsedMs}ms (budget ${silenceBudgetMs}ms)${progressNote}`;
      if (
        lastClientProgress === undefined &&
        lastServerProgress !== undefined &&
        serverProgressAt !== undefined
      ) {
        let serverProgress = lastServerProgress;
        let serverDetail =
          serverProgress.done !== undefined
            ? serverProgress.pct > 0
              ? ` ${serverProgress.pct}% (${serverProgress.done}${serverProgress.total !== undefined ? `/${serverProgress.total}` : ""})`
              : ` ${serverProgress.done}`
            : ` ${serverProgress.pct}%`;
        serverNote = ` \u2014 no pack data received; server-side progress last advanced ${now_3 - serverProgressAt}ms ago at ${serverProgress.label}${serverDetail}`;
        stallReason =
          now_3 - now_2 >= preTransferCapMs
            ? `pre-transfer cap ${preTransferCapMs}ms reached with no client-side progress${serverNote}`
            : `no client-side progress for ${now_3 - now_2}ms and server-side progress stopped advancing (budget ${silenceBudgetMs}ms)${serverNote}`;
      }
      let killReasonText =
        killReason === "silence"
          ? stallReason
          : killReason === "hard-cap"
            ? `hard cap ${capMs}ms after ${now_3 - now_2}ms${progressNote}${serverNote}`
            : `did not exit within ${PROGRESS_LOG_INTERVAL_MS}ms of SIGTERM (D-state? \u2014 last forward ${elapsedMs}ms ago)${progressNote}`;
      options.onDebug(
        `[runner:stuck] git ${mapped.join(" ")} (dir=${repoPath || "."}) \u2014 ${killReasonText} \u2014 killing subprocess`,
      );
    }
    let detail =
      caught.stderr !== undefined && caught.stderr.length > 0
        ? gitStderrSummary(caught.stderr, stderrTruncated, options.authURL, authToken)
        : hoistFatalLines(
            redactToken(caught.stdout || caught.message || "", options.authURL, authToken),
          ).slice(0, MAX_GIT_OUTPUT_TAIL_CHARS);
    let watchdogSuffix = killReason !== undefined ? ` (watchdog: ${killReason})` : "";
    throw Error(`git ${subcommand ?? "?"} failed${watchdogSuffix}: ${detail}`);
  } finally {
    if (extra !== undefined && killReason !== undefined) extra.killReason = killReason;
    dispose();
  }
}
export { runGit };
