/**
 * entrypoints/selfHostedRunner/runnerConfig.ts
 *
 * 2.1.316 新增：runner 参数解析、工作单声明与 spawn 钩子解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2cbdmxy9.js (8)
 * attribution: placement 8
 */
import { resolve, join } from "path";
import { stat, access } from "fs/promises";
import { constants } from "fs";
import {
  RUNNER_DEFAULTS,
  DEFAULT_LISTEN_PORT,
  MAX_CONNECT_ATTEMPTS,
  HANDSHAKE_TIMEOUT_MS,
  MAX_IDLE_SECONDS,
  parseScmConnectorHost,
  parseScmHostRewrite,
  MAX_CONNECTION_SECONDS,
} from "./scmConnector.js";
import { parseIntLoose } from "../../utils/envUtils.js";
import { checkRunnerAgentProxyStandaloneUrl } from "../../services/selfHostedRunner/agentProxyStandalone.js";
import { env } from "../../utils/env.js";
import { ORCHESTRATOR_DEBUG_LIMITS } from "./orchestratorDebugDir.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { errorMessage } from "../../utils/errors.js";
import { decodeJwtPayload } from "../../bridge/jwtUtils.js";

//@ chunk-2cbdmxy9.js:20087-23784 placement
/**
 * 解析 self-hosted runner 的命令行与 SELF_HOSTED_RUNNER_* 环境变量（API 地址、钩子目录、健康端口、并发、排空时间等）。
 */
function parseRunnerArgs(e) {
  let t = {
    apiUrl: RUNNER_DEFAULTS,
    hooksDir: process.env.SELF_HOSTED_RUNNER_HOOKS_DIR
      ? resolve(process.env.SELF_HOSTED_RUNNER_HOOKS_DIR)
      : undefined,
    healthPort: parsePortArg(
      process.env.SELF_HOSTED_RUNNER_HEALTH_PORT,
      DEFAULT_LISTEN_PORT,
      "SELF_HOSTED_RUNNER_HEALTH_PORT",
    ),
    hookConcurrency: MAX_CONNECT_ATTEMPTS,
    hookTimeoutMs: HANDSHAKE_TIMEOUT_MS,
    expectedSpawnSeconds: MAX_IDLE_SECONDS,
    minIdle: 0,
    debugDir: process.env.SELF_HOSTED_RUNNER_DEBUG_DIR,
    logLevel: "info",
    shutdownDrainMs: 0,
  };
  let r;
  let n;
  let provider = "ghe";
  let o = false;
  let l;
  let g;
  for (let j = 0; j < e.length; j++) {
    let S = e[j];
    let s = e[j + 1];
    switch (S) {
      case "--api-url":
        if (s) {
          t.apiUrl = s;
          j++;
        }
        break;
      case "--pool-secret-file":
      case "--environment-secret-file":
        if (S === "--pool-secret-file")
          console.error("[runner:warn] --pool-secret-file is deprecated; use --environment-secret-file");
        if (s) {
          t.poolSecretFile = s;
          j++;
        }
        break;
      case "--hooks-dir":
        if (s) {
          t.hooksDir = resolve(s);
          j++;
        }
        break;
      case "--health-port":
        if (s) {
          let intLoose = parseIntLoose(s);
          if (Number.isNaN(intLoose) || intLoose < 0 || intLoose > 65535)
            throw Error(`--health-port must be an integer in [0, 65535] (0 disables), got: ${s}`);
          t.healthPort = intLoose;
          j++;
        }
        break;
      case "--hook-concurrency":
        if (s) {
          let intLoose = parseIntLoose(s);
          if (Number.isNaN(intLoose) || intLoose < 1 || intLoose > 100)
            throw Error(`--hook-concurrency must be an integer in [1, 100], got: ${s}`);
          t.hookConcurrency = intLoose;
          j++;
        }
        break;
      case "--hook-timeout":
        if (s) {
          let u = Number(s);
          if (!Number.isFinite(u) || u <= 0)
            throw Error(`--hook-timeout must be a positive number of seconds, got: ${s}`);
          t.hookTimeoutMs = u * 1000;
          j++;
        }
        break;
      case "--expected-spawn-seconds":
        if (s) {
          let u = parseInt(s, 10);
          if (Number.isNaN(u) || u < 10 || u > 3600 || String(u) !== s.trim())
            throw Error(`--expected-spawn-seconds must be an integer in [10, 3600], got: ${s}`);
          t.expectedSpawnSeconds = u;
          j++;
        }
        break;
      case "--min-idle":
        if (s) {
          let u = parseInt(s, 10);
          if (Number.isNaN(u) || u < 0 || u > 200 || String(u) !== s.trim())
            throw Error("--min-idle must be an integer in [0, 200]");
          t.minIdle = u;
          j++;
        }
        break;
      case "--scm-connector-host":
        if (!s) throw Error("--scm-connector-host requires HOST[:PORT]");
        r = parseScmConnectorHost(s);
        j++;
        break;
      case "--scm-connector-id": {
        if (!s) throw Error("--scm-connector-id requires an integer");
        let u = parseInt(s, 10);
        if (Number.isNaN(u) || u < 1 || String(u) !== s.trim())
          throw Error("--scm-connector-id must be a positive integer");
        n = u;
        j++;
        break;
      }
      case "--scm-connector-provider":
        if (!s) throw Error("--scm-connector-provider requires a value");
        if (!/^[a-z0-9-]{1,32}$/.test(s))
          throw Error("--scm-connector-provider must match ^[a-z0-9-]{1,32}$");
        provider = s;
        o = true;
        j++;
        break;
      case "--scm-connector-ca-file":
        if (!s) throw Error("--scm-connector-ca-file requires a path");
        l = s;
        j++;
        break;
      case "--scm-connector-host-rewrite":
        if (!s) throw Error("--scm-connector-host-rewrite requires <from>=<to_host:to_port>");
        g = parseScmHostRewrite(s);
        j++;
        break;
      case "--debug-dir":
        if (s) {
          t.debugDir = s;
          j++;
        }
        break;
      case "--shutdown-drain-sec":
        if (s) {
          t.shutdownDrainMs = parseShutdownDrainSec(s) * 1000;
          j++;
        }
        break;
      case "--log-level":
        if (s) {
          t.logLevel = s;
          j++;
        }
        break;
      case "--agent-proxy-url": {
        let u = e[++j];
        if (u === undefined || u.trim() === "" || u.startsWith("--"))
          throw Error("--agent-proxy-url requires your proxy's https:// URL");
        checkRunnerAgentProxyStandaloneUrl(u, "--agent-proxy-url");
        env.set("SELF_HOSTED_RUNNER_AGENT_PROXY_URL", u);
        break;
      }
      default:
        if (S?.startsWith("--")) throw Error(`unknown flag ${S}`);
        break;
    }
  }
  if (r !== undefined) {
    if (n === undefined) throw Error("--scm-connector-id is required when --scm-connector-host is set");
    t.scmConnector = {
      host: r.host,
      port: r.port,
      provider,
      connectorId: n,
      caFile: l,
      hostRewrite: g,
    };
  } else if (n !== undefined || o || l !== undefined || g !== undefined)
    throw Error(
      "--scm-connector-id / --scm-connector-provider / --scm-connector-ca-file / --scm-connector-host-rewrite require --scm-connector-host",
    );
  if (t.hookTimeoutMs + ORCHESTRATOR_DEBUG_LIMITS >= t.expectedSpawnSeconds * 1000)
    throw Error(
      `--hook-timeout (${t.hookTimeoutMs / 1000}s) + ${ORCHESTRATOR_DEBUG_LIMITS / 1000}s SIGKILL grace must be less than --expected-spawn-seconds (${t.expectedSpawnSeconds}s) \u2014 otherwise an HA replica ` +
        "re-claims the lease while this hook is still running and both spawn a runner",
    );
  return t;
}
//@ chunk-2cbdmxy9.js:23784-23954 placement
function parsePortArg(e, t, r) {
  if (e === undefined || e === "") return t;
  let intLoose = parseIntLoose(e);
  if (Number.isNaN(intLoose) || intLoose < 0 || intLoose > 65535)
    throw Error(`${r} must be an integer in [0, 65535], got: "${e}"`);
  return intLoose;
}
//@ chunk-2cbdmxy9.js:23954-24160 placement
function parseShutdownDrainSec(e) {
  let t = parseInt(e, 10);
  if (Number.isNaN(t) || t < 0 || t > MAX_CONNECTION_SECONDS || String(t) !== e.trim())
    throw Error(
      "--shutdown-drain-sec must be a whole number of seconds from 0 to 3600 (0 turns the drain off)",
    );
  return t;
}
//@ chunk-2cbdmxy9.js:24160-24720 placement
async function resolveSpawnRunnerHook(hooksDir) {
  if (!hooksDir)
    throw Error(
      "orchestrator requires --hooks-dir (or SELF_HOSTED_RUNNER_HOOKS_DIR) \u2014 no spawn-runner hook directory configured",
    );
  let t = join(hooksDir, "spawn-runner");
  let r;
  try {
    r = await withBoundedTimeout(stat(t), 5000, `stat ${t}`);
  } catch (error) {
    throw Error(
      `spawn-runner hook not found at ${t} \u2014 the orchestrator cannot start without it (${errorMessage(error)})`,
    );
  }
  if (!r.isFile()) throw Error(`spawn-runner hook at ${t} is not a regular file`);
  try {
    await withBoundedTimeout(access(t, constants.X_OK), 5000, `access ${t}`);
  } catch {
    throw Error(`spawn-runner hook at ${t} is not executable (chmod +x ${t})`);
  }
  return t;
}
//@ chunk-2cbdmxy9.js:24720-25007 placement
function poolIdFromSecret(e) {
  let replaced = e.replace(/^sk-ant-[a-z]+-/, "");
  let r = decodeJwtPayload(replaced);
  let n = r !== null && typeof r === "object" ? r["ccr:pool_id"] : undefined;
  if (typeof n !== "string" || n === "")
    throw Error(
      "environment secret is missing the ccr:pool_id claim \u2014 cannot derive the environment ID for spawn-hint polling",
    );
  return n;
}
//@ chunk-2cbdmxy9.js:25007-25175 placement
function workOrderNumberOf(attempt) {
  if (attempt === undefined || attempt === null) return 0;
  if (typeof attempt === "number") return attempt;
  if (typeof attempt === "string") return /^(0|[1-9]\d{0,14})$/.test(attempt) ? Number(attempt) : attempt;
  return String(attempt);
}
//@ chunk-2cbdmxy9.js:25175-25959 placement
function workOrderClaims(e, t) {
  let r = decodeJwtPayload(e.work_order_jwt);
  let n = r !== null && typeof r === "object" ? r : {};
  let h = (S) => (typeof n[S] === "string" ? n[S] : "");
  let aud = n.aud;
  let l = Array.isArray(aud)
    ? (aud.find((S) => typeof S === "string") ?? "")
    : typeof aud === "string"
      ? aud
      : "";
  let poolId = h("ccr:pool_id") || (l.startsWith("ccpool_") ? l : "");
  let mapped = (e.sources ?? []).map((S) => ({
    url: S.url ?? "",
    revision: S.revision ?? "",
  }));
  return {
    jti: e.jti || h("jti"),
    session_id: e.session_uuid ?? "",
    attempt: workOrderNumberOf(e.attempt),
    pool_id: poolId,
    account_id: h("ccr:spawn_account_id") || h("account_id"),
    account_email: h("ccr:spawn_account_email") || h("account_email"),
    server_time: t ?? "",
    repo_sources: mapped,
    primary_repo_url: mapped[0]?.url ?? "",
    primary_repo_revision: mapped[0]?.revision ?? "",
    correlation_id: typeof e.correlation_id === "string" ? e.correlation_id : "",
    client_platform: typeof e.client_platform === "string" ? e.client_platform : "",
  };
}
//@ chunk-2cbdmxy9.js:25959-26067 placement
function ageMs(e, t = Date.now()) {
  if (!e) return null;
  let timestamp = Date.parse(e);
  if (Number.isNaN(timestamp)) return null;
  return t - timestamp;
}
export { ageMs, workOrderClaims, parseRunnerArgs, resolveSpawnRunnerHook, poolIdFromSecret };
