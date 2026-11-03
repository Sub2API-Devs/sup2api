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
  ue,
  Fe,
  qe,
  writeDebugArtifacts,
} from "./orchestratorDebugDir.js";
import { isGitRemoteUrl } from "../../selfHostedRunner/git/repoSources.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { sanitizeMetricLabel, UNKNOWN, escapeMetricValue } from "./metrics.js";
import { zbr } from "../../skills/bundled/scheduleRemoteAgents.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { moveKeeperPid } from "../../utils/toolCgroup.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";

/**
 * 校验 spawn-hint 声明（jti、session_id、仓库源、关联 id 等），写入工作单文件并执行 spawn-runner 钩子，记录输出。
 */
//@ chunk-2cbdmxy9.js:5544-12023 placement
async function runSpawnRunnerHook(e) {
  if ((validateRunnerLabel(e.claims.jti, "spawn-hint jti"), e.claims.session_id))
    validateRunnerLabel(e.claims.session_id, "spawn-hint session_id");
  if (e.claims.pool_id) validateRunnerLabel(e.claims.pool_id, "spawn-hint environment_id");
  if (e.claims.account_id) validateRunnerLabel(e.claims.account_id, "spawn-hint account_id");
  if (hasControlChars(e.claims.account_email)) throw Error("spawn-hint account_email: control character");
  for (let repo_source of e.claims.repo_sources) {
    if (repo_source.url && (!isGitRemoteUrl(repo_source.url) || hasControlChars(repo_source.url)))
      throw Error("spawn-hint repo_sources: unsafe git URL");
    if (repo_source.revision && !isSafeRefName(repo_source.revision))
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
  if (e.claims.client_platform && e.claims.client_platform !== UNKNOWN && t === void 0) {
    let S = escapeMetricValue(e.claims.client_platform);
    (e.onDebug(
      `[runner:orchestrator] spawn-hint client_platform rejected by the env-export gate (CLAUDE_RUNNER_CLIENT_PLATFORM left unset): "${S}" (len=${e.claims.client_platform.length})`,
    ),
      (e.claims = { ...e.claims, client_platform: S }));
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(e.jwt))
    throw Error("spawn-hint work_order_jwt: unsafe character (not base64url + dot)");
  let now = Date.now(),
    n = await writeWorkOrderFile(`work-order-${e.claims.jti}`, e.jwt);
  e.onDebug(`[runner:orchestrator] spawn-runner jti=${e.claims.jti} workOrderFile=${n}`);
  let h = {
      ...process.env,
      SELF_HOSTED_RUNNER_POOL_SECRET: void 0,
      SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: void 0,
      CLAUDE_RUNNER_WORK_ORDER_FILE: n,
      CLAUDE_RUNNER_ORDER_ID: e.claims.jti,
      CLAUDE_RUNNER_SESSION_ID: zbr("session", e.claims.session_id) ?? e.claims.session_id,
      CLAUDE_RUNNER_SESSION_UUID: e.claims.session_id,
      CLAUDE_RUNNER_ATTEMPT: String(e.claims.attempt),
      CLAUDE_RUNNER_POOL_ID: e.claims.pool_id,
      CLAUDE_RUNNER_ACCOUNT_EMAIL: e.claims.account_email,
      CLAUDE_RUNNER_ACCOUNT_ID: e.claims.account_id,
      CLAUDE_RUNNER_ORDER_SERVER_TIME: e.claims.server_time,
      CLAUDE_RUNNER_PRIMARY_REPO_URL: e.claims.primary_repo_url,
      CLAUDE_RUNNER_PRIMARY_REPO_REVISION: e.claims.primary_repo_revision,
      CLAUDE_RUNNER_REPO_SOURCES:
        e.claims.repo_sources.length > 0 ? jsonStringify(e.claims.repo_sources) : "",
      CLAUDE_RUNNER_CORRELATION_ID: e.claims.correlation_id,
      CLAUDE_RUNNER_CLIENT_PLATFORM: t,
    },
    o = "",
    l = !1,
    g = null,
    c = !1;
  try {
    await new Promise((S) => {
      let s;
      try {
        ((s = spawn(e.hookPath, [], {
          cwd: void 0,
          env: h,
          stdio: ["ignore", "pipe", "pipe"],
          detached: !0,
          windowsHide: !0,
        })),
          moveKeeperPid(s.pid));
      } catch (error) {
        ((c = !0), (o = `spawn-runner hook exec failed: ${errorMessage(error)}`), S());
        return;
      }
      let u = () => {},
        U,
        j,
        H,
        W,
        T = e.sigkillGraceMs ?? ORCHESTRATOR_DEBUG_LIMITS,
        D = !1,
        w = 65536;
      (s.stdout?.setEncoding("utf8"), s.stderr?.setEncoding("utf8"));
      let x = "",
        O = "",
        I = !1,
        G = 0,
        L = !1,
        B = !1,
        q = () => I && G > ue,
        b = (f, N) => {
          let parts = f.split(`
`),
            R = parts.pop() ?? "";
          for (let k of parts) {
            let replaced = redactSecretsInText(k).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
            if (I) {
              if (
                ((G += Buffer.byteLength(replaced) + 1),
                e.onStatus(
                  q()
                    ? `[runner:orchestrator] spawn-runner jti=${e.claims.jti}: a process the hook left running has written more than ${ue / 1024} KB since the hook exited; its further output is not logged.`
                    : `[runner:hook:spawn-runner:after-exit jti=${e.claims.jti}] ${replaced}`,
                ),
                q())
              )
                return "";
              continue;
            }
            if ((e.onStatus(`[runner:hook:spawn-runner] ${replaced}`), N))
              o = (
                o +
                replaced +
                `
`
              ).slice(-Fe);
          }
          return R;
        };
      (s.stdout?.on("data", (f) => {
        if (q()) return;
        let N = f;
        if (L) {
          let index = N.indexOf(`
`);
          if (index < 0) return;
          ((L = !1), (N = N.slice(index + 1)));
        }
        if (((x = b(x + N, !1)), x.length > w)) x = x.slice(-w);
      }),
        s.stderr?.on("data", (f) => {
          if (q()) return;
          let N = f;
          if (B) {
            let index = N.indexOf(`
`);
            if (index < 0) return;
            ((B = !1), (N = N.slice(index + 1)));
          }
          if (((O = b(O + N, !0)), O.length > w)) O = O.slice(-w);
        }));
      let K = (f) =>
        e.onDebug(
          `[runner:orchestrator] spawn-runner jti=${e.claims.jti} output read failed: ${errorMessage(f)}`,
        );
      (s.stdout?.on("error", K), s.stderr?.on("error", K));
      let m = (f) => {
          if (I) return;
          (clearTimeout(a),
            clearTimeout(W),
            clearTimeout(U),
            clearTimeout(j),
            clearTimeout(H),
            e.signal?.removeEventListener("abort", u));
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
            if (
              (e.onStatus(
                `[runner:hook:spawn-runner] (The last ${k.length}${E} characters written to ${p} are not shown: they did not end in a newline, and a process still has ${p} open, so the line may be incomplete. End each message the hook writes with a newline.)`,
              ),
              p === "stdout")
            )
              L = !0;
            else B = !0;
          }
          ((x = ""), (O = ""), (I = !0));
          let N = s.exitCode !== null || s.signalCode !== null;
          if (!f && N)
            e.onStatus(
              `[runner:orchestrator] spawn-runner jti=${e.claims.jti} exited, but a process it started still has the hook's stdout or stderr open. Up to ${ue / 1024} KB more of that output is logged as [runner:hook:spawn-runner:after-exit jti=${e.claims.jti}]. Send a runner's output to a file: once the orchestrator exits, writes there fail.`,
            );
          if (!f) {
            for (let p of [s.stdout, s.stderr])
              if (p && "unref" in p && typeof p.unref === "function") p.unref();
          }
          S();
        },
        a = setTimeout(
          (f, N, p, R, k, E) => {
            if (
              ((l = !0),
              (D = !0),
              R(
                `[runner:orchestrator] spawn-runner jti=${N} timed out after ${p}ms, sending SIGTERM to process tree`,
              ),
              f.pid !== void 0)
            )
              killProcessGroup(f.pid, "SIGTERM");
            U = setTimeout(
              (F, Q, P, y, A) => {
                if (F.pid !== void 0) killProcessGroup(F.pid, "SIGKILL");
                H = setTimeout(
                  (C, V, X, ie, ee) => {
                    if (C.exitCode === null && C.signalCode === null)
                      X(
                        `[runner:orchestrator] spawn-runner jti=${V} did not exit after SIGKILL within ${ee}ms (likely D-state); abandoning child and resolving as timed out`,
                      );
                    ie(!1);
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
          T,
        );
      if (
        ((u = () => {
          if (
            ((D = !0),
            e.onStatus(
              `[runner:orchestrator] spawn-runner jti=${e.claims.jti} aborted by shutdown, sending SIGTERM to process tree`,
            ),
            s.pid !== void 0)
          )
            killProcessGroup(s.pid, "SIGTERM");
          ((j = setTimeout(
            (f) => {
              if (f !== void 0) killProcessGroup(f, "SIGKILL");
            },
            T,
            s.pid,
          )),
            j.unref());
        }),
        e.signal?.addEventListener("abort", u, { once: !0 }),
        e.signal?.aborted)
      )
        u();
      (s.on("error", (f) => {
        if (I) return;
        (clearTimeout(U),
          clearTimeout(j),
          (c = !0),
          (o = isENOENT(f)
            ? "spawn-runner hook missing (ENOENT)"
            : `spawn-runner hook exec failed: ${errorMessage(f)}`),
          m(!0));
      }),
        s.once("exit", (f, N) => {
          if (I) return;
          if (((g = f), D || N !== null)) return;
          (clearTimeout(a),
            e.signal?.removeEventListener("abort", u),
            (W = setTimeout(
              (p) => {
                W = setTimeout((R) => R(!1), 0, p);
              },
              qe,
              m,
            )));
        }),
        s.once("close", (f) => {
          if (!I) g ??= f;
          m(!0);
        }));
    });
  } finally {
    await unlink(n).catch((S) =>
      e.onDebug(`[runner:orchestrator] failed to delete ${n}: ${errorMessage(S)}`),
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
