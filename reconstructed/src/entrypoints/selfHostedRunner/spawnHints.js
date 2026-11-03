/**
 * entrypoints/selfHostedRunner/spawnHints.ts
 *
 * 2.1.316 新增：执行 spawn-runner 钩子并校验 spawn hint
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2cbdmxy9.js (1)
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
import { connectorScopedAgentId } from "../../skills/bundled/scheduleRemoteAgents.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { moveKeeperPid } from "../../utils/toolCgroup.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";

//@ chunk-2cbdmxy9.js:5544-12023 placement
/**
 * 校验 spawn-hint 声明（jti、session_id、仓库源、关联 id 等），写入工作单文件并执行 spawn-runner 钩子，记录输出。
 */
async function runSpawnRunnerHook(e) {
  validateRunnerLabel(e.claims.jti, "spawn-hint jti");
  if (e.claims.session_id) validateRunnerLabel(e.claims.session_id, "spawn-hint session_id");
  if (e.claims.pool_id) validateRunnerLabel(e.claims.pool_id, "spawn-hint environment_id");
  if (e.claims.account_id) validateRunnerLabel(e.claims.account_id, "spawn-hint account_id");
  if (hasControlChars(e.claims.account_email)) throw Error("spawn-hint account_email: control character");
  for (let repoSource of e.claims.repo_sources) {
    if (repoSource.url && (!isGitRemoteUrl(repoSource.url) || hasControlChars(repoSource.url)))
      throw Error("spawn-hint repo_sources: unsafe git URL");
    if (repoSource.revision && !isSafeRefName(repoSource.revision))
      throw Error("spawn-hint repo_sources: unsafe revision");
  }
  if (
    hasControlChars(e.claims.correlation_id) ||
    e.claims.correlation_id.startsWith("-") ||
    /\s/.test(e.claims.correlation_id)
  )
    throw Error("spawn-hint correlation_id: unsafe value");
  if (hasControlChars(e.claims.server_time)) throw Error("spawn-hint server_time: unsafe value");
  if (typeof e.claims.attempt !== "number" || !Number.isInteger(e.claims.attempt) || e.claims.attempt < 0)
    throw Error("spawn-hint attempt: unsafe value");
  let t = sanitizeMetricLabel(e.claims.client_platform);
  if (e.claims.client_platform && e.claims.client_platform !== UNKNOWN && t === undefined) {
    let S = escapeMetricValue(e.claims.client_platform);
    e.onDebug(
      `[runner:orchestrator] spawn-hint client_platform rejected by the env-export gate (CLAUDE_RUNNER_CLIENT_PLATFORM left unset): "${S}" (len=${e.claims.client_platform.length})`,
    );
    e.claims = {
      ...e.claims,
      client_platform: S,
    };
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(e.jwt))
    throw Error("spawn-hint work_order_jwt: unsafe character (not base64url + dot)");
  let now = Date.now();
  let n = await writeWorkOrderFile(`work-order-${e.claims.jti}`, e.jwt);
  e.onDebug(`[runner:orchestrator] spawn-runner jti=${e.claims.jti} workOrderFile=${n}`);
  let env = {
    ...process.env,
    SELF_HOSTED_RUNNER_POOL_SECRET: undefined,
    SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: undefined,
    CLAUDE_RUNNER_WORK_ORDER_FILE: n,
    CLAUDE_RUNNER_ORDER_ID: e.claims.jti,
    CLAUDE_RUNNER_SESSION_ID: connectorScopedAgentId("session", e.claims.session_id) ?? e.claims.session_id,
    CLAUDE_RUNNER_SESSION_UUID: e.claims.session_id,
    CLAUDE_RUNNER_ATTEMPT: String(e.claims.attempt),
    CLAUDE_RUNNER_POOL_ID: e.claims.pool_id,
    CLAUDE_RUNNER_ACCOUNT_EMAIL: e.claims.account_email,
    CLAUDE_RUNNER_ACCOUNT_ID: e.claims.account_id,
    CLAUDE_RUNNER_ORDER_SERVER_TIME: e.claims.server_time,
    CLAUDE_RUNNER_PRIMARY_REPO_URL: e.claims.primary_repo_url,
    CLAUDE_RUNNER_PRIMARY_REPO_REVISION: e.claims.primary_repo_revision,
    CLAUDE_RUNNER_REPO_SOURCES: e.claims.repo_sources.length > 0 ? jsonStringify(e.claims.repo_sources) : "",
    CLAUDE_RUNNER_CORRELATION_ID: e.claims.correlation_id,
    CLAUDE_RUNNER_CLIENT_PLATFORM: t,
  };
  let o = "";
  let l = false;
  let g = null;
  let c = false;
  try {
    await new Promise((resolve) => {
      let s;
      try {
        s = spawn(e.hookPath, [], {
          cwd: undefined,
          env,
          stdio: ["ignore", "pipe", "pipe"],
          detached: true,
          windowsHide: true,
        });
        moveKeeperPid(s.pid);
      } catch (error) {
        c = true;
        o = `spawn-runner hook exec failed: ${errorMessage(error)}`;
        resolve();
        return;
      }
      let u = () => {};
      let U;
      let j;
      let H;
      let W;
      let sigkillGraceMs = e.sigkillGraceMs ?? ORCHESTRATOR_DEBUG_LIMITS;
      let D = false;
      let w = 65536;
      s.stdout?.setEncoding("utf8");
      s.stderr?.setEncoding("utf8");
      let x = "";
      let O = "";
      let I = false;
      let G = 0;
      let L = false;
      let B = false;
      let q = () => I && G > DEBUG_LOG_CHUNK_BYTES;
      let b = (f, N) => {
        let lines = f.split(`
`);
        let R = lines.pop() ?? "";
        for (let line of lines) {
          let replaced = redactSecretsInText(line).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
          if (I) {
            G += Buffer.byteLength(replaced) + 1;
            e.onStatus(
              q()
                ? `[runner:orchestrator] spawn-runner jti=${e.claims.jti}: a process the hook left running has written more than ${DEBUG_LOG_CHUNK_BYTES / 1024} KB since the hook exited; its further output is not logged.`
                : `[runner:hook:spawn-runner:after-exit jti=${e.claims.jti}] ${replaced}`,
            );
            if (q()) return "";
            continue;
          }
          e.onStatus(`[runner:hook:spawn-runner] ${replaced}`);
          if (N)
            o = (
              o +
              replaced +
              `
`
            ).slice(-DEBUG_LOG_MAX_BYTES);
        }
        return R;
      };
      s.stdout?.on("data", (f) => {
        if (q()) return;
        let N = f;
        if (L) {
          let index = N.indexOf(`
`);
          if (index < 0) return;
          L = false;
          N = N.slice(index + 1);
        }
        x = b(x + N, false);
        if (x.length > w) x = x.slice(-w);
      });
      s.stderr?.on("data", (f) => {
        if (q()) return;
        let N = f;
        if (B) {
          let index = N.indexOf(`
`);
          if (index < 0) return;
          B = false;
          N = N.slice(index + 1);
        }
        O = b(O + N, true);
        if (O.length > w) O = O.slice(-w);
      });
      let K = (f) =>
        e.onDebug(
          `[runner:orchestrator] spawn-runner jti=${e.claims.jti} output read failed: ${errorMessage(f)}`,
        );
      s.stdout?.on("error", K);
      s.stderr?.on("error", K);
      let m = (f) => {
        if (I) return;
        clearTimeout(timer);
        clearTimeout(W);
        clearTimeout(U);
        clearTimeout(j);
        clearTimeout(H);
        e.signal?.removeEventListener("abort", u);
        for (let [p, R, k] of [
          ["stdout", s.stdout, x],
          ["stderr", s.stderr, O],
        ]) {
          if (!k) continue;
          if (f || R?.readableEnded) {
            b(
              k +
                `
`,
              p === "stderr",
            );
            continue;
          }
          let E = k.length >= w ? " or more" : "";
          e.onStatus(
            `[runner:hook:spawn-runner] (The last ${k.length}${E} characters written to ${p} are not shown: they did not end in a newline, and a process still has ${p} open, so the line may be incomplete. End each message the hook writes with a newline.)`,
          );
          if (p === "stdout") L = true;
          else B = true;
        }
        x = "";
        O = "";
        I = true;
        let N = s.exitCode !== null || s.signalCode !== null;
        if (!f && N)
          e.onStatus(
            `[runner:orchestrator] spawn-runner jti=${e.claims.jti} exited, but a process it started still has the hook's stdout or stderr open. Up to ${DEBUG_LOG_CHUNK_BYTES / 1024} KB more of that output is logged as [runner:hook:spawn-runner:after-exit jti=${e.claims.jti}]. Send a runner's output to a file: once the orchestrator exits, writes there fail.`,
          );
        if (!f) {
          for (let p of [s.stdout, s.stderr])
            if (p && "unref" in p && typeof p.unref === "function") p.unref();
        }
        resolve();
      };
      let timer = setTimeout(
        (f, N, p, R, k, E) => {
          l = true;
          D = true;
          R(
            `[runner:orchestrator] spawn-runner jti=${N} timed out after ${p}ms, sending SIGTERM to process tree`,
          );
          if (f.pid !== undefined) killProcessGroup(f.pid, "SIGTERM");
          U = setTimeout(
            (F, Q, P, y, A) => {
              if (F.pid !== undefined) killProcessGroup(F.pid, "SIGKILL");
              H = setTimeout(
                (C, V, X, ie, ee) => {
                  if (C.exitCode === null && C.signalCode === null)
                    X(
                      `[runner:orchestrator] spawn-runner jti=${V} did not exit after SIGKILL within ${ee}ms (likely D-state); abandoning child and resolving as timed out`,
                    );
                  ie(false);
                },
                A,
                F,
                Q,
                P,
                y,
                A,
              );
            },
            E,
            f,
            N,
            R,
            k,
            E,
          );
        },
        e.timeoutMs,
        s,
        e.claims.jti,
        e.timeoutMs,
        e.onStatus,
        m,
        sigkillGraceMs,
      );
      u = () => {
        D = true;
        e.onStatus(
          `[runner:orchestrator] spawn-runner jti=${e.claims.jti} aborted by shutdown, sending SIGTERM to process tree`,
        );
        if (s.pid !== undefined) killProcessGroup(s.pid, "SIGTERM");
        j = setTimeout(
          (f) => {
            if (f !== undefined) killProcessGroup(f, "SIGKILL");
          },
          sigkillGraceMs,
          s.pid,
        );
        j.unref();
      };
      e.signal?.addEventListener("abort", u, {
        once: true,
      });
      if (e.signal?.aborted) u();
      s.on("error", (f) => {
        if (I) return;
        clearTimeout(U);
        clearTimeout(j);
        c = true;
        o = isENOENT(f)
          ? "spawn-runner hook missing (ENOENT)"
          : `spawn-runner hook exec failed: ${errorMessage(f)}`;
        m(true);
      });
      s.once("exit", (f, N) => {
        if (I) return;
        g = f;
        if (D || N !== null) return;
        clearTimeout(timer);
        e.signal?.removeEventListener("abort", u);
        W = setTimeout(
          (p) => {
            W = setTimeout((R) => R(false), 0, p);
          },
          DEBUG_LOG_FLUSH_MS,
          m,
        );
      });
      s.once("close", (f) => {
        if (!I) g ??= f;
        m(true);
      });
    });
  } finally {
    await unlink(n).catch((error) =>
      e.onDebug(`[runner:orchestrator] failed to delete ${n}: ${errorMessage(error)}`),
    );
  }
  if (l && !o) o = `spawn-runner hook timed out after ${e.timeoutMs}ms`;
  if (e.debugDir) await writeDebugArtifacts(e.debugDir, e.claims, e.jwt, o, e.onDebug);
  return {
    ok: g === 0 && !l && !c,
    exitCode: g,
    timedOut: l,
    execError: c,
    stderrTail: o,
    durationMs: Date.now() - now,
  };
}
export { runSpawnRunnerHook };
