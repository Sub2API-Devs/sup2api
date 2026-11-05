/**
 * entrypoints/selfHostedRunner/runnerConfig.ts
 *
 * 2.1.316 新增：runner 参数解析、工作单声明与 spawn 钩子解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h7hgs1mf.js (8)
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

//@ chunk-h7hgs1mf.js:20917-24614 placement
/**
 * 解析 self-hosted runner 的命令行与 SELF_HOSTED_RUNNER_* 环境变量（API 地址、钩子目录、健康端口、并发、排空时间等）。
 */
function parseRunnerArgs(argv) {
  let config = {
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
  let connectorHost;
  let connectorId;
  let provider = "ghe";
  let providerExplicit = false;
  let caFile;
  let hostRewrite;
  for (let j = 0; j < argv.length; j++) {
    let flag = argv[j];
    let value = argv[j + 1];
    switch (flag) {
      case "--api-url":
        if (value) {
          config.apiUrl = value;
          j++;
        }
        break;
      case "--pool-secret-file":
      case "--environment-secret-file":
        if (flag === "--pool-secret-file")
          console.error("[runner:warn] --pool-secret-file is deprecated; use --environment-secret-file");
        if (value) {
          config.poolSecretFile = value;
          j++;
        }
        break;
      case "--hooks-dir":
        if (value) {
          config.hooksDir = resolve(value);
          j++;
        }
        break;
      case "--health-port":
        if (value) {
          let intLoose = parseIntLoose(value);
          if (Number.isNaN(intLoose) || intLoose < 0 || intLoose > 65535)
            throw Error(`--health-port must be an integer in [0, 65535] (0 disables), got: ${value}`);
          config.healthPort = intLoose;
          j++;
        }
        break;
      case "--hook-concurrency":
        if (value) {
          let intLoose = parseIntLoose(value);
          if (Number.isNaN(intLoose) || intLoose < 1 || intLoose > 100)
            throw Error(`--hook-concurrency must be an integer in [1, 100], got: ${value}`);
          config.hookConcurrency = intLoose;
          j++;
        }
        break;
      case "--hook-timeout":
        if (value) {
          let seconds = Number(value);
          if (!Number.isFinite(seconds) || seconds <= 0)
            throw Error(`--hook-timeout must be a positive number of seconds, got: ${value}`);
          config.hookTimeoutMs = seconds * 1000;
          j++;
        }
        break;
      case "--expected-spawn-seconds":
        if (value) {
          let seconds = parseInt(value, 10);
          if (Number.isNaN(seconds) || seconds < 10 || seconds > 3600 || String(seconds) !== value.trim())
            throw Error(`--expected-spawn-seconds must be an integer in [10, 3600], got: ${value}`);
          config.expectedSpawnSeconds = seconds;
          j++;
        }
        break;
      case "--min-idle":
        if (value) {
          let idleCount = parseInt(value, 10);
          if (
            Number.isNaN(idleCount) ||
            idleCount < 0 ||
            idleCount > 200 ||
            String(idleCount) !== value.trim()
          )
            throw Error("--min-idle must be an integer in [0, 200]");
          config.minIdle = idleCount;
          j++;
        }
        break;
      case "--scm-connector-host":
        if (!value) throw Error("--scm-connector-host requires HOST[:PORT]");
        connectorHost = parseScmConnectorHost(value);
        j++;
        break;
      case "--scm-connector-id": {
        if (!value) throw Error("--scm-connector-id requires an integer");
        let connectorIdValue = parseInt(value, 10);
        if (
          Number.isNaN(connectorIdValue) ||
          connectorIdValue < 1 ||
          String(connectorIdValue) !== value.trim()
        )
          throw Error("--scm-connector-id must be a positive integer");
        connectorId = connectorIdValue;
        j++;
        break;
      }
      case "--scm-connector-provider":
        if (!value) throw Error("--scm-connector-provider requires a value");
        if (!/^[a-z0-9-]{1,32}$/.test(value))
          throw Error("--scm-connector-provider must match ^[a-z0-9-]{1,32}$");
        provider = value;
        providerExplicit = true;
        j++;
        break;
      case "--scm-connector-ca-file":
        if (!value) throw Error("--scm-connector-ca-file requires a path");
        caFile = value;
        j++;
        break;
      case "--scm-connector-host-rewrite":
        if (!value) throw Error("--scm-connector-host-rewrite requires <from>=<to_host:to_port>");
        hostRewrite = parseScmHostRewrite(value);
        j++;
        break;
      case "--debug-dir":
        if (value) {
          config.debugDir = value;
          j++;
        }
        break;
      case "--shutdown-drain-sec":
        if (value) {
          config.shutdownDrainMs = parseShutdownDrainSec(value) * 1000;
          j++;
        }
        break;
      case "--log-level":
        if (value) {
          config.logLevel = value;
          j++;
        }
        break;
      case "--agent-proxy-url": {
        let agentProxyUrl = argv[++j];
        if (agentProxyUrl === undefined || agentProxyUrl.trim() === "" || agentProxyUrl.startsWith("--"))
          throw Error("--agent-proxy-url requires your proxy's https:// URL");
        checkRunnerAgentProxyStandaloneUrl(agentProxyUrl, "--agent-proxy-url");
        env.set("SELF_HOSTED_RUNNER_AGENT_PROXY_URL", agentProxyUrl);
        break;
      }
      default:
        if (flag?.startsWith("--")) throw Error(`unknown flag ${flag}`);
        break;
    }
  }
  if (connectorHost !== undefined) {
    if (connectorId === undefined)
      throw Error("--scm-connector-id is required when --scm-connector-host is set");
    config.scmConnector = {
      host: connectorHost.host,
      port: connectorHost.port,
      provider,
      connectorId,
      caFile,
      hostRewrite,
    };
  } else if (
    connectorId !== undefined ||
    providerExplicit ||
    caFile !== undefined ||
    hostRewrite !== undefined
  )
    throw Error(
      "--scm-connector-id / --scm-connector-provider / --scm-connector-ca-file / --scm-connector-host-rewrite require --scm-connector-host",
    );
  if (config.hookTimeoutMs + ORCHESTRATOR_DEBUG_LIMITS >= config.expectedSpawnSeconds * 1000)
    throw Error(
      `--hook-timeout (${config.hookTimeoutMs / 1000}s) + ${ORCHESTRATOR_DEBUG_LIMITS / 1000}s SIGKILL grace must be less than --expected-spawn-seconds (${config.expectedSpawnSeconds}s) \u2014 otherwise an HA replica ` +
        "re-claims the lease while this hook is still running and both spawn a runner",
    );
  return config;
}
//@ chunk-h7hgs1mf.js:24614-24784 placement
function parsePortArg(raw, fallback, envName) {
  if (raw === undefined || raw === "") return fallback;
  let intLoose = parseIntLoose(raw);
  if (Number.isNaN(intLoose) || intLoose < 0 || intLoose > 65535)
    throw Error(`${envName} must be an integer in [0, 65535], got: "${raw}"`);
  return intLoose;
}
//@ chunk-h7hgs1mf.js:24784-24990 placement
function parseShutdownDrainSec(raw) {
  let seconds = parseInt(raw, 10);
  if (
    Number.isNaN(seconds) ||
    seconds < 0 ||
    seconds > MAX_CONNECTION_SECONDS ||
    String(seconds) !== raw.trim()
  )
    throw Error(
      "--shutdown-drain-sec must be a whole number of seconds from 0 to 3600 (0 turns the drain off)",
    );
  return seconds;
}
//@ chunk-h7hgs1mf.js:24990-25550 placement
async function resolveSpawnRunnerHook(hooksDir) {
  if (!hooksDir)
    throw Error(
      "orchestrator requires --hooks-dir (or SELF_HOSTED_RUNNER_HOOKS_DIR) \u2014 no spawn-runner hook directory configured",
    );
  let hookPath = join(hooksDir, "spawn-runner");
  let stats;
  try {
    stats = await withBoundedTimeout(stat(hookPath), 5000, `stat ${hookPath}`);
  } catch (error) {
    throw Error(
      `spawn-runner hook not found at ${hookPath} \u2014 the orchestrator cannot start without it (${errorMessage(error)})`,
    );
  }
  if (!stats.isFile()) throw Error(`spawn-runner hook at ${hookPath} is not a regular file`);
  try {
    await withBoundedTimeout(access(hookPath, constants.X_OK), 5000, `access ${hookPath}`);
  } catch {
    throw Error(`spawn-runner hook at ${hookPath} is not executable (chmod +x ${hookPath})`);
  }
  return hookPath;
}
//@ chunk-h7hgs1mf.js:25550-25837 placement
function poolIdFromSecret(secret) {
  let replaced = secret.replace(/^sk-ant-[a-z]+-/, "");
  let payload = decodeJwtPayload(replaced);
  let poolId = payload !== null && typeof payload === "object" ? payload["ccr:pool_id"] : undefined;
  if (typeof poolId !== "string" || poolId === "")
    throw Error(
      "environment secret is missing the ccr:pool_id claim \u2014 cannot derive the environment ID for spawn-hint polling",
    );
  return poolId;
}
//@ chunk-h7hgs1mf.js:25837-26005 placement
function workOrderNumberOf(attempt) {
  if (attempt === undefined || attempt === null) return 0;
  if (typeof attempt === "number") return attempt;
  if (typeof attempt === "string") return /^(0|[1-9]\d{0,14})$/.test(attempt) ? Number(attempt) : attempt;
  return String(attempt);
}
//@ chunk-h7hgs1mf.js:26005-26853 placement
function workOrderClaims(workOrder, serverTime) {
  let payload = decodeJwtPayload(workOrder.work_order_jwt);
  let claims = payload !== null && typeof payload === "object" ? payload : {};
  let textClaim = (name) => (typeof claims[name] === "string" ? claims[name] : "");
  let aud = claims.aud;
  let audience = Array.isArray(aud)
    ? (aud.find((candidate) => typeof candidate === "string") ?? "")
    : typeof aud === "string"
      ? aud
      : "";
  let poolId = textClaim("ccr:pool_id") || (audience.startsWith("ccpool_") ? audience : "");
  let mapped = (workOrder.sources ?? []).map((source) => ({
    url: source.url ?? "",
    revision: source.revision ?? "",
  }));
  return {
    jti: workOrder.jti || textClaim("jti"),
    session_id: workOrder.session_uuid ?? "",
    attempt: workOrderNumberOf(workOrder.attempt),
    spawn_reason: typeof workOrder.spawn_reason === "string" ? workOrder.spawn_reason : "",
    pool_id: poolId,
    account_id: textClaim("ccr:spawn_account_id") || textClaim("account_id"),
    account_email: textClaim("ccr:spawn_account_email") || textClaim("account_email"),
    server_time: serverTime ?? "",
    repo_sources: mapped,
    primary_repo_url: mapped[0]?.url ?? "",
    primary_repo_revision: mapped[0]?.revision ?? "",
    correlation_id: typeof workOrder.correlation_id === "string" ? workOrder.correlation_id : "",
    client_platform: typeof workOrder.client_platform === "string" ? workOrder.client_platform : "",
  };
}
//@ chunk-h7hgs1mf.js:26853-26961 placement
function ageMs(timestamp, now = Date.now()) {
  if (!timestamp) return null;
  let timestamp_2 = Date.parse(timestamp);
  if (Number.isNaN(timestamp_2)) return null;
  return now - timestamp_2;
}
export { ageMs, workOrderClaims, parseRunnerArgs, resolveSpawnRunnerHook, poolIdFromSecret };
