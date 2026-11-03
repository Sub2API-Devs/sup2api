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
import { resolve, join, join as join_2 } from "path";
import { stat, stat as stat_2, access } from "fs/promises";
import { constants } from "fs";
import {
  RUNNER_DEFAULTS,
  ve,
  Ne,
  Oe,
  He,
  parseScmConnectorHost,
  parseScmHostRewrite,
  Et,
} from "./scmConnector.js";
import { parseIntLoose } from "../../utils/envUtils.js";
import { checkRunnerAgentProxyStandaloneUrl } from "../../services/selfHostedRunner/agentProxyStandalone.js";
import { env } from "../../utils/env.js";
import { ORCHESTRATOR_DEBUG_LIMITS } from "./orchestratorDebugDir.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { errorMessage } from "../../utils/errors.js";
import { decodeJwtPayload } from "../../bridge/jwtUtils.js";

/**
 * 解析 self-hosted runner 的命令行与 SELF_HOSTED_RUNNER_* 环境变量（API 地址、钩子目录、健康端口、并发、排空时间等）。
 */
//@ chunk-2cbdmxy9.js:20087-23784 placement
function parseRunnerArgs(e) {
  let t = {
      apiUrl: RUNNER_DEFAULTS,
      hooksDir: process.env.SELF_HOSTED_RUNNER_HOOKS_DIR
        ? resolve(process.env.SELF_HOSTED_RUNNER_HOOKS_DIR)
        : void 0,
      healthPort: parsePortArg(
        process.env.SELF_HOSTED_RUNNER_HEALTH_PORT,
        ve,
        "SELF_HOSTED_RUNNER_HEALTH_PORT",
      ),
      hookConcurrency: Ne,
      hookTimeoutMs: Oe,
      expectedSpawnSeconds: He,
      minIdle: 0,
      debugDir: process.env.SELF_HOSTED_RUNNER_DEBUG_DIR,
      logLevel: "info",
      shutdownDrainMs: 0,
    },
    r,
    n,
    h = "ghe",
    o = !1,
    l,
    g;
  for (let c = 0; c < e.length; c++) {
    let S = e[c],
      s = e[c + 1];
    switch (S) {
      case "--api-url":
        if (s) ((t.apiUrl = s), c++);
        break;
      case "--pool-secret-file":
      case "--environment-secret-file":
        if (S === "--pool-secret-file")
          console.error("[runner:warn] --pool-secret-file is deprecated; use --environment-secret-file");
        if (s) ((t.poolSecretFile = s), c++);
        break;
      case "--hooks-dir":
        if (s) ((t.hooksDir = resolve(s)), c++);
        break;
      case "--health-port":
        if (s) {
          let u = parseIntLoose(s);
          if (Number.isNaN(u) || u < 0 || u > 65535)
            throw Error(`--health-port must be an integer in [0, 65535] (0 disables), got: ${s}`);
          ((t.healthPort = u), c++);
        }
        break;
      case "--hook-concurrency":
        if (s) {
          let u = parseIntLoose(s);
          if (Number.isNaN(u) || u < 1 || u > 100)
            throw Error(`--hook-concurrency must be an integer in [1, 100], got: ${s}`);
          ((t.hookConcurrency = u), c++);
        }
        break;
      case "--hook-timeout":
        if (s) {
          let u = Number(s);
          if (!Number.isFinite(u) || u <= 0)
            throw Error(`--hook-timeout must be a positive number of seconds, got: ${s}`);
          ((t.hookTimeoutMs = u * 1000), c++);
        }
        break;
      case "--expected-spawn-seconds":
        if (s) {
          let u = parseInt(s, 10);
          if (Number.isNaN(u) || u < 10 || u > 3600 || String(u) !== s.trim())
            throw Error(`--expected-spawn-seconds must be an integer in [10, 3600], got: ${s}`);
          ((t.expectedSpawnSeconds = u), c++);
        }
        break;
      case "--min-idle":
        if (s) {
          let u = parseInt(s, 10);
          if (Number.isNaN(u) || u < 0 || u > 200 || String(u) !== s.trim())
            throw Error("--min-idle must be an integer in [0, 200]");
          ((t.minIdle = u), c++);
        }
        break;
      case "--scm-connector-host":
        if (!s) throw Error("--scm-connector-host requires HOST[:PORT]");
        ((r = parseScmConnectorHost(s)), c++);
        break;
      case "--scm-connector-id": {
        if (!s) throw Error("--scm-connector-id requires an integer");
        let u = parseInt(s, 10);
        if (Number.isNaN(u) || u < 1 || String(u) !== s.trim())
          throw Error("--scm-connector-id must be a positive integer");
        ((n = u), c++);
        break;
      }
      case "--scm-connector-provider":
        if (!s) throw Error("--scm-connector-provider requires a value");
        if (!/^[a-z0-9-]{1,32}$/.test(s))
          throw Error("--scm-connector-provider must match ^[a-z0-9-]{1,32}$");
        ((h = s), (o = !0), c++);
        break;
      case "--scm-connector-ca-file":
        if (!s) throw Error("--scm-connector-ca-file requires a path");
        ((l = s), c++);
        break;
      case "--scm-connector-host-rewrite":
        if (!s) throw Error("--scm-connector-host-rewrite requires <from>=<to_host:to_port>");
        ((g = parseScmHostRewrite(s)), c++);
        break;
      case "--debug-dir":
        if (s) ((t.debugDir = s), c++);
        break;
      case "--shutdown-drain-sec":
        if (s) ((t.shutdownDrainMs = parseShutdownDrainSec(s) * 1000), c++);
        break;
      case "--log-level":
        if (s) ((t.logLevel = s), c++);
        break;
      case "--agent-proxy-url": {
        let u = e[++c];
        if (u === void 0 || u.trim() === "" || u.startsWith("--"))
          throw Error("--agent-proxy-url requires your proxy's https:// URL");
        (checkRunnerAgentProxyStandaloneUrl(u, "--agent-proxy-url"),
          env.set("SELF_HOSTED_RUNNER_AGENT_PROXY_URL", u));
        break;
      }
      default:
        if (S?.startsWith("--")) throw Error(`unknown flag ${S}`);
        break;
    }
  }
  if (r !== void 0) {
    if (n === void 0) throw Error("--scm-connector-id is required when --scm-connector-host is set");
    t.scmConnector = { host: r.host, port: r.port, provider: h, connectorId: n, caFile: l, hostRewrite: g };
  } else if (n !== void 0 || o || l !== void 0 || g !== void 0)
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
  if (e === void 0 || e === "") return t;
  let n = parseIntLoose(e);
  if (Number.isNaN(n) || n < 0 || n > 65535)
    throw Error(`${r} must be an integer in [0, 65535], got: "${e}"`);
  return n;
}
//@ chunk-2cbdmxy9.js:23954-24160 placement
function parseShutdownDrainSec(e) {
  let t = parseInt(e, 10);
  if (Number.isNaN(t) || t < 0 || t > Et || String(t) !== e.trim())
    throw Error(
      "--shutdown-drain-sec must be a whole number of seconds from 0 to 3600 (0 turns the drain off)",
    );
  return t;
}
//@ chunk-2cbdmxy9.js:24160-24720 placement
async function resolveSpawnRunnerHook(e) {
  if (!e)
    throw Error(
      "orchestrator requires --hooks-dir (or SELF_HOSTED_RUNNER_HOOKS_DIR) \u2014 no spawn-runner hook directory configured",
    );
  let t = join(e, "spawn-runner"),
    r;
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
  let replaced = e.replace(/^sk-ant-[a-z]+-/, ""),
    r = decodeJwtPayload(replaced),
    n = r !== null && typeof r === "object" ? r["ccr:pool_id"] : void 0;
  if (typeof n !== "string" || n === "")
    throw Error(
      "environment secret is missing the ccr:pool_id claim \u2014 cannot derive the environment ID for spawn-hint polling",
    );
  return n;
}
//@ chunk-2cbdmxy9.js:25007-25175 placement
function workOrderNumberOf(e) {
  if (e === void 0 || e === null) return 0;
  if (typeof e === "number") return e;
  if (typeof e === "string") return /^(0|[1-9]\d{0,14})$/.test(e) ? Number(e) : e;
  return String(e);
}
//@ chunk-2cbdmxy9.js:25175-25959 placement
function workOrderClaims(e, t) {
  let r = decodeJwtPayload(e.work_order_jwt),
    n = r !== null && typeof r === "object" ? r : {},
    h = (S) => (typeof n[S] === "string" ? n[S] : ""),
    aud = n.aud,
    l = Array.isArray(aud)
      ? (aud.find((S) => typeof S === "string") ?? "")
      : typeof aud === "string"
        ? aud
        : "",
    g = h("ccr:pool_id") || (l.startsWith("ccpool_") ? l : ""),
    mapped = (e.sources ?? []).map((S) => ({ url: S.url ?? "", revision: S.revision ?? "" }));
  return {
    jti: e.jti || h("jti"),
    session_id: e.session_uuid ?? "",
    attempt: workOrderNumberOf(e.attempt),
    pool_id: g,
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
  let parse = Date.parse(e);
  if (Number.isNaN(parse)) return null;
  return t - parse;
}

export { ageMs, workOrderClaims, parseRunnerArgs, resolveSpawnRunnerHook, poolIdFromSecret };
