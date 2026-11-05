/**
 * entrypoints/selfHostedRunner/spawnHints.ts
 *
 * 2.1.316 新增：执行 spawn-runner 钩子并校验 spawn hint
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h7hgs1mf.js (1)
 * attribution: placement 1
 */
import { spawn } from "child_process";
import { unlink } from "fs/promises";
import { validateRunnerLabel } from "../../selfHostedRunner/serverAutoMode.js";
import {
  hasControlChars,
  writeWorkOrderFile,
  ORCHESTRATOR_DEBUG_LIMITS,
  DEBUG_LOG_CHUNK_BYTES,
  DEBUG_LOG_MAX_BYTES,
  DEBUG_LOG_FLUSH_MS,
  writeDebugArtifacts,
} from "./orchestratorDebugDir.js";
import { isGitRemoteUrl } from "../../selfHostedRunner/git/repoSources.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { sanitizeMetricLabel, UNKNOWN, escapeMetricValue } from "./metrics.js";
import { normalizeSpawnReason } from "./runId.js";
import { connectorScopedAgentId } from "../../skills/bundled/scheduleRemoteAgents.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { moveKeeperPid } from "../../utils/toolCgroup.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";

//@ chunk-h7hgs1mf.js:5980-12853 placement
/**
 * 校验 spawn-hint 声明（jti、session_id、仓库源、关联 id 等），写入工作单文件并执行 spawn-runner 钩子，记录输出。
 */
async function runSpawnRunnerHook(hint) {
  validateRunnerLabel(hint.claims.jti, "spawn-hint jti");
  if (hint.claims.session_id) validateRunnerLabel(hint.claims.session_id, "spawn-hint session_id");
  if (hint.claims.pool_id) validateRunnerLabel(hint.claims.pool_id, "spawn-hint environment_id");
  if (hint.claims.account_id) validateRunnerLabel(hint.claims.account_id, "spawn-hint account_id");
  if (hasControlChars(hint.claims.account_email)) throw Error("spawn-hint account_email: control character");
  for (let repoSource of hint.claims.repo_sources) {
    if (repoSource.url && (!isGitRemoteUrl(repoSource.url) || hasControlChars(repoSource.url)))
      throw Error("spawn-hint repo_sources: unsafe git URL");
    if (repoSource.revision && !isSafeRefName(repoSource.revision))
      throw Error("spawn-hint repo_sources: unsafe revision");
  }
  if (
    hasControlChars(hint.claims.correlation_id) ||
    hint.claims.correlation_id.startsWith("-") ||
    /\s/.test(hint.claims.correlation_id)
  )
    throw Error("spawn-hint correlation_id: unsafe value");
  if (hasControlChars(hint.claims.server_time)) throw Error("spawn-hint server_time: unsafe value");
  if (
    typeof hint.claims.attempt !== "number" ||
    !Number.isInteger(hint.claims.attempt) ||
    hint.claims.attempt < 0
  )
    throw Error("spawn-hint attempt: unsafe value");
  let platformLabel = sanitizeMetricLabel(hint.claims.client_platform);
  if (hint.claims.client_platform && hint.claims.client_platform !== UNKNOWN && platformLabel === undefined) {
    let platformEscaped = escapeMetricValue(hint.claims.client_platform);
    hint.onDebug(
      `[runner:orchestrator] spawn-hint client_platform rejected by the env-export gate (CLAUDE_RUNNER_CLIENT_PLATFORM left unset): "${platformEscaped}" (len=${hint.claims.client_platform.length})`,
    );
    hint.claims = {
      ...hint.claims,
      client_platform: platformEscaped,
    };
  }
  let spawnReason = normalizeSpawnReason(hint.claims.spawn_reason);
  if (hint.claims.spawn_reason && spawnReason === undefined) {
    let escapedSpawnReason = escapeMetricValue(hint.claims.spawn_reason);
    hint.onDebug(
      `[runner:orchestrator] spawn-hint spawn_reason rejected by the env-export gate (CLAUDE_RUNNER_SPAWN_REASON left unset): "${escapedSpawnReason}" (len=${hint.claims.spawn_reason.length})`,
    );
    hint.claims = {
      ...hint.claims,
      spawn_reason: escapedSpawnReason,
    };
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(hint.jwt))
    throw Error("spawn-hint work_order_jwt: unsafe character (not base64url + dot)");
  let now = Date.now();
  let workOrderFile = await writeWorkOrderFile(`work-order-${hint.claims.jti}`, hint.jwt);
  hint.onDebug(`[runner:orchestrator] spawn-runner jti=${hint.claims.jti} workOrderFile=${workOrderFile}`);
  let env = {
    ...process.env,
    SELF_HOSTED_RUNNER_POOL_SECRET: undefined,
    SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: undefined,
    CLAUDE_RUNNER_WORK_ORDER_FILE: workOrderFile,
    CLAUDE_RUNNER_ORDER_ID: hint.claims.jti,
    CLAUDE_RUNNER_SESSION_ID:
      connectorScopedAgentId("session", hint.claims.session_id) ?? hint.claims.session_id,
    CLAUDE_RUNNER_SESSION_UUID: hint.claims.session_id,
    CLAUDE_RUNNER_ATTEMPT: String(hint.claims.attempt),
    CLAUDE_RUNNER_SPAWN_REASON: spawnReason,
    CLAUDE_RUNNER_POOL_ID: hint.claims.pool_id,
    CLAUDE_RUNNER_ACCOUNT_EMAIL: hint.claims.account_email,
    CLAUDE_RUNNER_ACCOUNT_ID: hint.claims.account_id,
    CLAUDE_RUNNER_ORDER_SERVER_TIME: hint.claims.server_time,
    CLAUDE_RUNNER_PRIMARY_REPO_URL: hint.claims.primary_repo_url,
    CLAUDE_RUNNER_PRIMARY_REPO_REVISION: hint.claims.primary_repo_revision,
    CLAUDE_RUNNER_REPO_SOURCES:
      hint.claims.repo_sources.length > 0 ? jsonStringify(hint.claims.repo_sources) : "",
    CLAUDE_RUNNER_CORRELATION_ID: hint.claims.correlation_id,
    CLAUDE_RUNNER_CLIENT_PLATFORM: platformLabel,
  };
  let stderrTail = "";
  let timedOut = false;
  let exitCode = null;
  let execError = false;
  try {
    await new Promise((resolve) => {
      let child;
      try {
        child = spawn(hint.hookPath, [], {
          cwd: undefined,
          env,
          stdio: ["ignore", "pipe", "pipe"],
          detached: true,
          windowsHide: true,
        });
        moveKeeperPid(child.pid);
      } catch (error) {
        execError = true;
        stderrTail = `spawn-runner hook exec failed: ${errorMessage(error)}`;
        resolve();
        return;
      }
      let onAbort = () => {};
      let killTimer;
      let abortKillTimer;
      let giveUpTimer;
      let flushTimer;
      let sigkillGraceMs = hint.sigkillGraceMs ?? ORCHESTRATOR_DEBUG_LIMITS;
      let isKilled = false;
      let tailLimit = 65536;
      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      let stdoutBuffer = "";
      let stderrBuffer = "";
      let isSettled = false;
      let afterExitBytes = 0;
      let skipFirstStdoutLine = false;
      let skipFirstStderrLine = false;
      let isOverLimit = () => isSettled && afterExitBytes > DEBUG_LOG_CHUNK_BYTES;
      let consumeLines = (chunk, isStderr) => {
        let lines = chunk.split(`
`);
        let rest = lines.pop() ?? "";
        for (let line of lines) {
          let replaced = redactSecretsInText(line).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
          if (isSettled) {
            afterExitBytes += Buffer.byteLength(replaced) + 1;
            hint.onStatus(
              isOverLimit()
                ? `[runner:orchestrator] spawn-runner jti=${hint.claims.jti}: a process the hook left running has written more than ${DEBUG_LOG_CHUNK_BYTES / 1024} KB since the hook exited; its further output is not logged.`
                : `[runner:hook:spawn-runner:after-exit jti=${hint.claims.jti}] ${replaced}`,
            );
            if (isOverLimit()) return "";
            continue;
          }
          hint.onStatus(`[runner:hook:spawn-runner] ${replaced}`);
          if (isStderr)
            stderrTail = (
              stderrTail +
              replaced +
              `
`
            ).slice(-DEBUG_LOG_MAX_BYTES);
        }
        return rest;
      };
      child.stdout?.on("data", (chunk) => {
        if (isOverLimit()) return;
        let text = chunk;
        if (skipFirstStdoutLine) {
          let index = text.indexOf(`
`);
          if (index < 0) return;
          skipFirstStdoutLine = false;
          text = text.slice(index + 1);
        }
        stdoutBuffer = consumeLines(stdoutBuffer + text, false);
        if (stdoutBuffer.length > tailLimit) stdoutBuffer = stdoutBuffer.slice(-tailLimit);
      });
      child.stderr?.on("data", (chunk) => {
        if (isOverLimit()) return;
        let text = chunk;
        if (skipFirstStderrLine) {
          let index = text.indexOf(`
`);
          if (index < 0) return;
          skipFirstStderrLine = false;
          text = text.slice(index + 1);
        }
        stderrBuffer = consumeLines(stderrBuffer + text, true);
        if (stderrBuffer.length > tailLimit) stderrBuffer = stderrBuffer.slice(-tailLimit);
      });
      let onReadError = (error) =>
        hint.onDebug(
          `[runner:orchestrator] spawn-runner jti=${hint.claims.jti} output read failed: ${errorMessage(error)}`,
        );
      child.stdout?.on("error", onReadError);
      child.stderr?.on("error", onReadError);
      let settle = (isError) => {
        if (isSettled) return;
        clearTimeout(timer);
        clearTimeout(flushTimer);
        clearTimeout(killTimer);
        clearTimeout(abortKillTimer);
        clearTimeout(giveUpTimer);
        hint.signal?.removeEventListener("abort", onAbort);
        for (let [name, stream, buffer] of [
          ["stdout", child.stdout, stdoutBuffer],
          ["stderr", child.stderr, stderrBuffer],
        ]) {
          if (!buffer) continue;
          if (isError || stream?.readableEnded) {
            consumeLines(
              buffer +
                `
`,
              name === "stderr",
            );
            continue;
          }
          let moreNote = buffer.length >= tailLimit ? " or more" : "";
          hint.onStatus(
            `[runner:hook:spawn-runner] (The last ${buffer.length}${moreNote} characters written to ${name} are not shown: they did not end in a newline, and a process still has ${name} open, so the line may be incomplete. End each message the hook writes with a newline.)`,
          );
          if (name === "stdout") skipFirstStdoutLine = true;
          else skipFirstStderrLine = true;
        }
        stdoutBuffer = "";
        stderrBuffer = "";
        isSettled = true;
        let hasExited = child.exitCode !== null || child.signalCode !== null;
        if (!isError && hasExited)
          hint.onStatus(
            `[runner:orchestrator] spawn-runner jti=${hint.claims.jti} exited, but a process it started still has the hook's stdout or stderr open. Up to ${DEBUG_LOG_CHUNK_BYTES / 1024} KB more of that output is logged as [runner:hook:spawn-runner:after-exit jti=${hint.claims.jti}]. Send a runner's output to a file: once the orchestrator exits, writes there fail.`,
          );
        if (!isError) {
          for (let stream of [child.stdout, child.stderr])
            if (stream && "unref" in stream && typeof stream.unref === "function") stream.unref();
        }
        resolve();
      };
      let waitForExit = (timeoutMs) => {
        let spawnedChild = !isKilled;
        isKilled = true;
        hint.onStatus(
          spawnedChild
            ? `${timeoutMs}, sending SIGTERM to process tree`
            : `${timeoutMs}; its process tree was already sent SIGTERM, so it is not sent another`,
        );
        if (spawnedChild && child.pid !== undefined) killProcessGroup(child.pid, "SIGTERM");
      };
      let timer = setTimeout(
        (doSpawn, jti, timeoutMs, status, settle_, graceMs, logLine) => {
          timedOut = true;
          logLine(`[runner:orchestrator] spawn-runner jti=${jti} timed out after ${timeoutMs}ms`);
          killTimer = setTimeout(
            (child__, jti_, timeoutMs_, status_, graceMs_) => {
              if (child__.pid !== undefined) killProcessGroup(child__.pid, "SIGKILL");
              giveUpTimer = setTimeout(
                (child___, jti__, status__, settle__, graceMs__) => {
                  if (child___.exitCode === null && child___.signalCode === null)
                    status__(
                      `[runner:orchestrator] spawn-runner jti=${jti__} did not exit after SIGKILL within ${graceMs__}ms (likely D-state); abandoning child and resolving as timed out`,
                    );
                  settle__(false);
                },
                graceMs_,
                child__,
                jti_,
                timeoutMs_,
                status_,
                graceMs_,
              );
            },
            graceMs,
            doSpawn,
            jti,
            status,
            settle_,
            graceMs,
          );
        },
        hint.timeoutMs,
        child,
        hint.claims.jti,
        hint.timeoutMs,
        hint.onStatus,
        settle,
        sigkillGraceMs,
        waitForExit,
      );
      onAbort = () => {
        waitForExit(`[runner:orchestrator] spawn-runner jti=${hint.claims.jti} aborted by shutdown`);
        abortKillTimer = setTimeout(
          (pid) => {
            if (pid !== undefined) killProcessGroup(pid, "SIGKILL");
          },
          sigkillGraceMs,
          child.pid,
        );
        abortKillTimer.unref();
      };
      hint.signal?.addEventListener("abort", onAbort, {
        once: true,
      });
      if (hint.signal?.aborted) onAbort();
      child.on("error", (error) => {
        if (isSettled) return;
        clearTimeout(killTimer);
        clearTimeout(abortKillTimer);
        execError = true;
        stderrTail = isENOENT(error)
          ? "spawn-runner hook missing (ENOENT)"
          : `spawn-runner hook exec failed: ${errorMessage(error)}`;
        settle(true);
      });
      child.once("exit", (code, signalName) => {
        if (isSettled) return;
        exitCode = code;
        if (isKilled || signalName !== null) return;
        clearTimeout(timer);
        hint.signal?.removeEventListener("abort", onAbort);
        flushTimer = setTimeout(
          (settle_) => {
            flushTimer = setTimeout((settle__) => settle__(false), 0, settle_);
          },
          DEBUG_LOG_FLUSH_MS,
          settle,
        );
      });
      child.once("close", (code_) => {
        if (!isSettled) exitCode ??= code_;
        settle(true);
      });
    });
  } finally {
    await unlink(workOrderFile).catch((error) =>
      hint.onDebug(`[runner:orchestrator] failed to delete ${workOrderFile}: ${errorMessage(error)}`),
    );
  }
  if (timedOut && !stderrTail) stderrTail = `spawn-runner hook timed out after ${hint.timeoutMs}ms`;
  if (hint.debugDir)
    await writeDebugArtifacts(hint.debugDir, hint.claims, hint.jwt, stderrTail, hint.onDebug);
  return {
    ok: exitCode === 0 && !timedOut && !execError,
    exitCode,
    timedOut,
    execError,
    stderrTail,
    durationMs: Date.now() - now,
  };
}
export { runSpawnRunnerHook };
