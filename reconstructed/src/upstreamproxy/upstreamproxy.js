/**
 * upstreamproxy/upstreamproxy.ts
 *
 * CCR 容器上游代理初始化：读令牌文件描述符、起中继、设置 HTTPS_PROXY/NO_PROXY/CA 包与 gh 替身环境
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/upstreamproxy/upstreamproxy.ts
 * pieces: chunk-1k6d6j2b.js (1), chunk-awy329vy.js (68), chunk-hm0ce8vc.js (1)
 * attribution: placement 67, fingerprint 3
 */
import { join, delimiter, parse } from "path";
import { homedir, tmpdir } from "os";
import { readFile, writeFile, unlink, access, stat, open, rmdir, mkdir } from "fs/promises";
import { constants, statSync } from "fs";
import { execFile } from "child_process";
import { X509Certificate } from "crypto";
import {
  setProxyStatusUrl,
  startUpstreamProxyRelay,
  recordProxyRelayEvent,
  notePolicyRefusedHost,
  hostMatchesSelectiveList,
} from "./relay.js";
import {
  setAgentProxyNote,
  setAgentProxyGhStandin,
  agentProxyReadmePath,
  proxyPromptVariant,
  PROXIED_CLIS,
} from "../constants/agentProxyPrompt.js";
import { setAgentProxyEndpoint } from "../utils/agentProxy/agentProxyState.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { env, scanPathForExecutables } from "../utils/env.js";
import { isEnvTruthy, getClaudeConfigDir } from "../utils/envUtils.js";
import {
  AGENT_PROXY_STANDALONE_RELAY_MODE,
  isAgentProxyStandaloneActive,
  agentProxyStandaloneProxyUrl,
} from "../services/selfHostedRunner/agentProxyStandalone.js";
import { logForDebugging } from "../utils/debug.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getSessionIngressAuthToken } from "../utils/sessionIngressAuth.js";
import { disableCoreDumps } from "../utils/processHardening.js";
import { withoutBlockedCerts } from "../utils/caCerts.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { recordPhase } from "../utils/startupTiming.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import {
  errorMessage,
  isENOENT,
  sanitizeErrnoForTelemetry,
  isFsInaccessible,
  getErrnoCode,
} from "../utils/errors.js";
import { isCleanupStarted, registerCleanup } from "../utils/cleanupRegistry.js";
import { isShuttingDown } from "../utils/gracefulShutdown.js";
import { getRetryDelay } from "../services/api/withRetry.js";
import { sleep, withTimeout } from "../utils/sleep.js";
import { AGENT_PROXY_PATH } from "../services/ccrAgentProxy/agentProxy.js";
import { readCaBundleFile, compareCaBundles, compareBundleWithFile, parseCaBundle } from "./caBundle.js";
import { configureToolTrust, buildJavaTrustOptions, firstPemCertAfterDifferent } from "./toolTrust.js";
import { PROXY_INJECTED_MARKER, inheritedByChildren } from "../utils/subprocessEnv.js";
import {
  caCertEnvVars,
  caCertEnvVarList,
  CA_CERT_ENV_VARS_2,
  CA_CERT_ENV_VARS,
} from "../utils/settings/managedSettingsKeys.js";
import { GIT_NO_PROMPT_ENV } from "../utils/plugins/marketplaceManager.js";
import {
  GITHUB_SSH_PREFIXES,
  GITHUB_HOST,
  normalizeHost,
  HOST_LABEL_RE,
  isGithubDotCom,
  githubApiBase,
} from "../utils/git/githubUrl.js";
import { buildGitConfigEnv } from "../utils/gitSafeExec.js";
import { plural } from "../utils/stringUtils.js";
import { writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { sampleCpuAndPageFaults } from "../utils/eventLoopStallDetector.js";
import { startEventLoopLagMonitor, LAG_SAMPLE_INTERVAL_MS } from "../utils/eventLoopLag.js";
import { readOnlyNoFollowFlags } from "../utils/platformTargets.js";
import { readHandleUpTo } from "../utils/fsOperations.js";
import { computeContentHash } from "../utils/commitAttribution.js";
import {
  GH_STANDIN_FLAG,
  ANY_HOST_FLAG,
  GHE_HOST_SUFFIX,
  STANDALONE_PROXY,
  describeGhStandinHosts,
  ANY,
  buildGhProxyCheckScript,
} from "../utils/agentProxy/ghStandin.js";
import { getLaunchCommand } from "../utils/deepLink/registerProtocol.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { PEM_CERT_BLOCK_RE, getTLSFetchOptions } from "../utils/mtls.js";
import { DEBIAN_CA_PATHS, installSystemCaDirect } from "./systemTrust.js";
import { cgroupSpawnOptions } from "../utils/toolCgroup.js";
import { getProxyFetchOptions } from "../utils/proxy.js";
import { isTransientError } from "../utils/fsSafety/hardenedRead.js";

//@ chunk-awy329vy.js:2175-2300 fingerprint = NO_PROXY_LIST (0.446)
var NO_PROXY_LIST = [
  "registry.npmjs.org",
  "jsr.io",
  "npm.jsr.io",
  "pypi.org",
  "files.pythonhosted.org",
  "index.crates.io",
  "proxy.golang.org",
];
//@ chunk-awy329vy.js:60056-61021 placement
/**
 * 常见系统 CA 包的路径列表。
 */
var SESSION_TOKEN_PATH = "/run/ccr/session_token";
var SYSTEM_CA_BUNDLE_PATHS = [
  "/etc/ssl/certs/ca-certificates.crt",
  "/etc/pki/tls/certs/ca-bundle.crt",
  "/etc/ssl/cert.pem",
];
var NO_PROXY_COMMON = [
  "localhost",
  "127.0.0.1",
  "::1",
  "127.0.0.0/8",
  "0.0.0.0/8",
  "::",
  "169.254.0.0/16",
  "api.anthropic.com",
  "api-staging.anthropic.com",
  "api-pr-preview.anthropic.com",
  "mcp-proxy.anthropic.com",
  "mcp-proxy-staging.anthropic.com",
  ...NO_PROXY_LIST,
  "host.docker.internal",
];
var NO_PROXY_EMBEDDED = [
  ...NO_PROXY_COMMON,
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "100.64.0.0/10",
  ".svc.cluster.local",
  "*.svc.cluster.local",
].join(",");
var NO_PROXY_SELECTIVE = [
  "127.0.0.1",
  "localhost",
  "::1",
  "127.0.0.0/8",
  "0.0.0.0/8",
  "169.254.0.0/16",
  "host.docker.internal",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "100.64.0.0/10",
  ".svc.cluster.local",
  "*.svc.cluster.local",
].join(",");
var NO_PROXY_LOCAL_ONLY = [
  "localhost",
  "127.0.0.1",
  "::1",
  "127.0.0.0/8",
  "0.0.0.0/8",
  "::",
  "host.docker.internal",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "100.64.0.0/10",
].join(",");
var NO_PROXY_ANT_ONLY = ["169.254.0.0/16", ".svc.cluster.local", "*.svc.cluster.local"].join(",");
//@ chunk-awy329vy.js:61021-61316 placement
class AgentProxyRuntime {
  state = {
    enabled: false,
    noProxy: NO_PROXY_EMBEDDED,
  };
  relay = undefined;
  generation = 0;
  activate(state, e) {
    this.state = state;
    this.relay = e;
    setProxyStatusUrl(`${loopbackProxyUrl(e.port)}/__agentproxy/status`);
  }
  reset() {
    this.generation++;
    this.state = {
      enabled: false,
      noProxy: NO_PROXY_EMBEDDED,
    };
    setAgentProxyNote(undefined);
    setAgentProxyGhStandin(undefined);
    setAgentProxyEndpoint(undefined);
    setProxyStatusUrl(undefined);
    this.relay?.stop();
    this.relay = undefined;
  }
}
//@ chunk-awy329vy.js:61316-61342 placement
var agentProxies = new HostScoped(() => new AgentProxyRuntime());
//@ chunk-awy329vy.js:61342-61380 placement
/**
 * 取出当前宿主的 agent 代理状态。
 */
function getAgentProxyState() {
  return agentProxies.of(getRootSession().host);
}
//@ chunk-awy329vy.js:61380-65296 placement
/**
 * agent 代理初始化：读取并清除 CCR_AGENT_PROXY_* 环境变量，决定中继模式、包含主机、CA 监视等。
 */
async function initAgentProxy(opts) {
  let agentProxyState = getAgentProxyState();
  env.unset("AGENT_PROXY_URL");
  env.unset("AGENT_PROXY_AUTH_TOKEN");
  let CCR_AGENT_PROXY_RELAY_MODE = env.CCR_AGENT_PROXY_RELAY_MODE;
  let CCR_AGENT_PROXY_INCLUDE_HOSTS = env.CCR_AGENT_PROXY_INCLUDE_HOSTS;
  let CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED = env.CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED;
  let CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED = env.CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED;
  let CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY = env.CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY;
  let CCR_AGENT_PROXY_CA_WATCH_ENABLED = env.CCR_AGENT_PROXY_CA_WATCH_ENABLED;
  let CCR_AGENT_PROXY_CA_CERT_B64 = env.CCR_AGENT_PROXY_CA_CERT_B64;
  env.unset("CCR_AGENT_PROXY_RELAY_MODE");
  env.unset("CCR_AGENT_PROXY_INCLUDE_HOSTS");
  env.unset("CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED");
  env.unset("CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED");
  env.unset("CCR_AGENT_PROXY_CA_CERT_B64");
  if (!isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) return agentProxyState.state;
  let startTime = performance.now();
  let w;
  if (CCR_AGENT_PROXY_RELAY_MODE === AGENT_PROXY_STANDALONE_RELAY_MODE || isAgentProxyStandaloneActive()) {
    let D = agentProxyStandaloneProxyUrl();
    if (D === undefined || !isGovernedGitArmed()) {
      logForDebugging("[agent-proxy] the agent proxy standalone relay mode is set; hosted relay not started");
      return agentProxyState.state;
    }
    logForDebugging(
      "[agent-proxy] the agent proxy standalone relay mode is set; governed git goes through its forwarder, and no relay is started",
    );
    w = {
      kind: "standalone",
      proxyUrl: D,
    };
  } else {
    if (!env.CCR_AGENT_PROXY_ENABLED) return agentProxyState.state;
    let D = isHttpMcpServeInvocation();
    let F;
    let sessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID;
    let K = "sessionIngressAuth";
    if (D) {
      F = opts?.toolContainerToken;
      if (F === undefined) {
        logForDebugging(
          "[agent-proxy] a tool container's daemon was handed no token (CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR, or agent_proxy_token with --session-tunnel); proxy disabled",
        );
        return agentProxyState.state;
      }
      sessionId = "tool-container";
      K = "the launcher";
    }
    if (!sessionId) {
      logForDebugging("[agent-proxy] CLAUDE_CODE_REMOTE_SESSION_ID unset; proxy disabled", {
        level: "warn",
      });
      logFeatureBad("agent_proxy_init", "agent_proxy_init_no_session_id");
      return agentProxyState.state;
    }
    let tokenPath = opts?.tokenPath ?? SESSION_TOKEN_PATH;
    let le = D
      ? {
          existed: false,
          token: F ?? null,
        }
      : await readTokenFile(tokenPath);
    let { existed, token } = le;
    if (!token && !D) token = getSessionIngressAuthToken();
    if (!token) {
      logForDebugging("[agent-proxy] no session token; proxy disabled");
      logFeatureBad("agent_proxy_init", "agent_proxy_init_no_token");
      return agentProxyState.state;
    }
    logForDebugging(`[agent-proxy] token via ${existed ? tokenPath : K}`);
    disableCoreDumps((ke) =>
      logForDebugging(`[agent-proxy] ${ke}`, {
        level: "warn",
      }),
    );
    w = {
      kind: "relay",
      sessionId,
      token,
      tokenIsHandedOver: D,
      unlinkTokenPath: existed ? tokenPath : undefined,
    };
  }
  let baseUrl = opts?.ccrBaseUrl ?? process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
  let S =
    opts?.caBundlePath ??
    (isGovernedGitArmed()
      ? join(getClaudeConfigDir(), "ccr", "ca-bundle.crt")
      : join(homedir(), ".ccr", "ca-bundle.crt"));
  let x = opts?.systemCaPath
    ? await readFile(opts.systemCaPath, "utf8").catch(() => "")
    : await findSystemCaBundle();
  let b = withoutBlockedCerts(x, "agent proxy trust") ?? "";
  let C = await foldCustomerCaBundles(b, S);
  let localCa = C
    ? `${b}
${C}`
    : b;
  let P;
  if (CCR_AGENT_PROXY_CA_CERT_B64 !== undefined && isEssentialTrafficOnly())
    logForDebugging(
      "[agent-proxy] CCR_AGENT_PROXY_CA_CERT_B64 ignored: essential traffic only; fetching the CA as before",
    );
  else if (CCR_AGENT_PROXY_CA_CERT_B64 !== undefined) {
    let D = decodeCaCertEnv(CCR_AGENT_PROXY_CA_CERT_B64);
    if (D.ok) P = D.pem;
    else {
      logForDebugging(
        `[agent-proxy] CCR_AGENT_PROXY_CA_CERT_B64 ignored: ${D.reason}; fetching the CA instead`,
        {
          level: "warn",
        },
      );
      logFeatureSad("agent_proxy_init", "agent_proxy_init_ca_env_invalid");
    }
  }
  let E = isGovernedGitArmed();
  let A = P !== undefined ? "env" : "fetch";
  let M = {
    budgetMs: opts?.pathProbeBudgetMs ?? CA_POLL_INTERVAL_MS,
    caSource: A,
  };
  let installedClisScan = E ? undefined : sweepInstalledClis(M);
  let I;
  if (CCR_AGENT_PROXY_RELAY_MODE === "selective") {
    let filtered = (CCR_AGENT_PROXY_INCLUDE_HOSTS ?? "")
      .split(",")
      .map((F) => F.trim())
      .filter((F) => F.length > 0);
    if (filtered.length > 0) {
      I = {
        includeHosts: filtered,
      };
      logForDebugging(
        `[agent-proxy] selective relay: ${filtered.length} include hosts; unlisted use normal networking`,
      );
    } else {
      logForDebugging(
        "[agent-proxy] CCR_AGENT_PROXY_RELAY_MODE=selective but include-host " +
          "list is empty/unparsable \u2014 FAIL-CLOSED to tunnel-all",
        {
          level: "warn",
        },
      );
      logFeatureSad("agent_proxy_init", "agent_proxy_selective_empty_include");
    }
  }
  let Y = NO_PROXY_LOCAL_ONLY;
  let context = {
    runtime: agentProxyState,
    generation: agentProxyState.generation,
    route: w,
    baseUrl,
    caBundlePath: S,
    systemCa: x,
    localCa,
    hasSystemCa: b !== "",
    governedGitTools: E,
    selective: I,
    noProxy: CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY ? Y : I ? NO_PROXY_SELECTIVE : NO_PROXY_EMBEDDED,
    bundleCoversEveryHost: b !== "",
    receiveGateDisabled: Boolean(CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED),
    uploadGateDisabled: Boolean(CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED),
    caWatchEnabled: Boolean(CCR_AGENT_PROXY_CA_WATCH_ENABLED),
    pathProbes: M,
    installedClisScan,
    envCa: P,
    caSource: A,
    opts: opts && {
      ...opts,
      toolContainerToken: undefined,
    },
  };
  recordPhase("agent_proxy_inputs_ms", performance.now() - startTime, startTime);
  let lastResult = await bringUpAgentProxy(context, 1);
  if (w.kind === "standalone" && lastResult.outcome === "fatal") setAgentProxyNote(GITHUB_TLS_FAILED_TEXT);
  if (lastResult.outcome === "retry") {
    logFeatureSad("agent_proxy_init", "agent_proxy_init_ca_exhausted_retrying", {
      ca_source: fromEnum(A),
    });
    retryAgentProxyInBackground(context, lastResult).catch((error) => {
      logForDebugging(`[agent-proxy] retry loop crashed: ${errorMessage(error)}; proxy stays disabled`, {
        level: "warn",
      });
      logFeatureBad("agent_proxy_init", "agent_proxy_init_retry_loop_crashed");
    });
  }
  return agentProxyState.state;
}
//@ chunk-awy329vy.js:65296-65631 placement
/**
 * 代理 GitHub TLS 设置失败的说明，以及后台重试的最大间隔与判定耗尽的时长。
 */
var GITHUB_TLS_FAILED_TEXT =
  "Anthropic-managed GitHub access through this session's proxy could not be set up: git and gh fail TLS verification against github.com. Never disable TLS verification or edit the git config file named by $GIT_CONFIG_GLOBAL to get past it; tell the user that GitHub access is not available in this session.";
var MAX_RETRY_DELAY_MS = 300000;
var RETRY_BAD_AFTER_MS = 3600000;
//@ chunk-awy329vy.js:65631-65729 placement
/**
 * 代理运行代次不符、已启用或正在清理时返回 “exit”。
 */
function shouldExitAgentProxy(runtime, generation) {
  if (runtime.generation !== generation || runtime.state.enabled || isCleanupStarted()) return "exit";
  return isShuttingDown() ? "defer" : null;
}
//@ chunk-awy329vy.js:65729-65780 placement
function backgroundRetryDelayMs(n, e) {
  return Math.min(getRetryDelay(n - 1, e, MAX_RETRY_DELAY_MS), MAX_RETRY_DELAY_MS);
}
//@ chunk-awy329vy.js:65780-66461 placement
/**
 * 代理初始化失败后在后台持续重试：每次按退避等待，世代变更则退出或延后；超过时限仍失败时记一次"耗尽"遥测但继续重试，直到成功或致命错误。
 */
async function retryAgentProxyInBackground(context, lastResult) {
  let { runtime, generation, caSource, opts } = context;
  let startedAt = Date.now();
  let retryBadAfterMs = opts?.retryBadAfterMs ?? RETRY_BAD_AFTER_MS;
  let reportedExhausted = false;
  for (let attempt = 2; ; attempt++) {
    let delayMs = opts?.retryDelayMs?.(attempt) ?? backgroundRetryDelayMs(attempt, lastResult.retryAfter);
    logForDebugging(
      `[agent-proxy] ${lastResult.detail}; attempt ${attempt} in ${(delayMs / 1000).toFixed(1)}s`,
      {
        level: "warn",
      },
    );
    await sleep(delayMs, undefined, {
      unref: true,
    });
    let gate = shouldExitAgentProxy(runtime, generation);
    if (gate === "exit") return;
    if (gate === "defer") continue;
    let result = await bringUpAgentProxy(context, attempt);
    if (result.outcome !== "retry") return;
    lastResult = result;
    if (!reportedExhausted && Date.now() - startedAt >= retryBadAfterMs) {
      reportedExhausted = true;
      logForDebugging(
        `[agent-proxy] ${lastResult.detail}; still failing after ${attempt} attempts over ${Math.round((Date.now() - startedAt) / 60000)} min \u2014 counting as exhausted, retrying anyway`,
        {
          level: "warn",
        },
      );
      logFeatureBad("agent_proxy_init", "agent_proxy_init_ca_exhausted", {
        ca_source: fromEnum(caSource),
      });
    }
  }
}
//@ chunk-awy329vy.js:66461-71701 placement
/**
 * 启动 agent 代理：读取 CCR_AGENT_PROXY_* 环境变量，启动本地中继、写入 CA 信任与 git 配置。
 */
async function bringUpAgentProxy(n, e) {
  let {
    runtime,
    route,
    baseUrl,
    caBundlePath,
    systemCa,
    localCa,
    hasSystemCa,
    governedGitTools,
    selective,
    noProxy,
    bundleCoversEveryHost,
    receiveGateDisabled,
    uploadGateDisabled,
    caWatchEnabled,
    pathProbes,
    installedClisScan,
    envCa,
    caSource,
    opts,
  } = n;
  let R = (K, H) => {
    if (e === 1) recordPhase(K, performance.now() - H, H);
  };
  let I;
  if (envCa !== undefined) I = envCa;
  else {
    let startTime = performance.now();
    let ccrCaCert = await fetchCcrCaCert(baseUrl, {
      budgetMs: opts?.caFetchBudgetMs ?? (e === 1 ? 5000 : 15000),
      tries: e === 1 ? 3 : 1,
      viaStandaloneProxy: route.kind === "standalone",
    });
    R("agent_proxy_ca_fetch_ms", startTime);
    if (ccrCaCert.outcome !== "ok") return reportCaFailure(ccrCaCert, caSource);
    I = ccrCaCert.ccrCa;
  }
  let startTime = performance.now();
  let X = await writeCaBundle(localCa, I, caBundlePath);
  if (X.outcome !== "ok") {
    R("agent_proxy_trust_write_ms", startTime);
    return reportCaFailure(X, caSource);
  }
  if (!governedGitTools) await writeAwsConfigOnce(opts?.awsConfigPath ?? join(homedir(), ".aws", "config"));
  R("agent_proxy_trust_write_ms", startTime);
  if (route.kind === "standalone") {
    let K = shouldExitAgentProxy(runtime, n.generation);
    if (K)
      return K === "exit"
        ? {
            outcome: "stale",
          }
        : {
            outcome: "retry",
            detail: "shutdown claimed during bring-up",
            retryAfter: null,
          };
    let H = {
      enabled: true,
      caBundlePath,
      hasSystemCa,
      bundleCoversEveryHost,
      noProxy,
      selective: false,
      governedGitTools: true,
    };
    runtime.state = H;
    runtime.relay = undefined;
    let le = await configureGovernedGit(H, caBundlePath, route, selective, pathProbes);
    if (runtime.state !== H)
      return {
        outcome: "stale",
      };
    setAgentProxyGhStandin(ghStandinConfig(H));
    logForDebugging(
      `[agent-proxy] governed git routed through the agent proxy standalone forwarder (CA from ${caSource})`,
    );
    logFeatureOk("agent_proxy_init", {
      attempts: e,
      ca_source: fromEnum(caSource),
      standalone: true,
    });
    setAgentProxyNote(
      env.CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG && !le
        ? GITHUB_TLS_FAILED_TEXT
        : describeProxyForPrompt(caBundlePath, undefined),
    );
    return {
      outcome: "ok",
    };
  }
  let { sessionId, token, tokenIsHandedOver, unlinkTokenPath } = route;
  try {
    let wsUrl = baseUrl.replace(/^http/, "ws") + AGENT_PROXY_PATH + "/ws";
    let H = agentProxyReadmePath(caBundlePath);
    let le = token ?? "";
    let startTime = performance.now();
    let installedProxyPreconfiguredClis = await installedClisScan;
    let ke;
    let kr = () =>
      (ke ??= readGlobalGitConfigKeys()
        .catch(() => [])
        .finally(() => {
          ke = undefined;
        }));
    let upstreamProxyRelay = await startUpstreamProxyRelay({
      wsUrl,
      sessionId,
      token: le,
      getToken: tokenIsHandedOver ? () => le : () => getSessionIngressAuthToken() || le,
      selective,
      limits: {
        ...(receiveGateDisabled && {
          receiveHighWater: 1 / 0,
        }),
        ...(uploadGateDisabled && {
          sendPauseAfterPendingBytes: 1 / 0,
          sendStallTimeoutMs: 1 / 0,
        }),
      },
      statusProvider: async () => {
        let N = await kr();
        if (N.length > 0)
          logForDebugging(`[agent-proxy] git config may defeat proxy routing: ${N.join(", ")}`, {
            level: "warn",
          });
        return {
          ...runtime.state,
          ...(N.length > 0 && {
            gitConfigConflicts: N,
          }),
          readmePath: H,
          gitConfigInjection: gitConfigCountUnset(),
          gitSshRewrite: gitConfigCountUnset() && sshAuthUnset(),
        };
      },
      onFailure: recordProxyRelayEvent,
      onConnectAnswer: notePolicyRefusedHost,
    });
    let Rr = registerCleanup(async () => upstreamProxyRelay.stop());
    let G = {
      enabled: true,
      port: upstreamProxyRelay.port,
      caBundlePath,
      hasSystemCa,
      bundleCoversEveryHost,
      noProxy,
      selective: Boolean(selective),
      governedGitTools,
      installedProxyPreconfiguredClis,
    };
    R("agent_proxy_relay_up_ms", startTime);
    let Lt = shouldExitAgentProxy(runtime, n.generation);
    if (Lt) {
      upstreamProxyRelay.stop();
      Rr();
      return Lt === "exit"
        ? {
            outcome: "stale",
          }
        : {
            outcome: "retry",
            detail: "shutdown claimed during bring-up",
            retryAfter: null,
          };
    }
    runtime.activate(G, upstreamProxyRelay);
    if (!selective && !governedGitTools)
      setAgentProxyEndpoint({
        proxyUrl: loopbackProxyUrl(upstreamProxyRelay.port),
        gatewayCa: I,
      });
    if (governedGitTools)
      await configureGovernedGit(
        G,
        caBundlePath,
        {
          kind: "relay",
          port: upstreamProxyRelay.port,
        },
        selective,
        pathProbes,
      );
    else {
      let N = await installGhShim(
        {
          kind: "relay",
          port: upstreamProxyRelay.port,
        },
        caBundlePath,
        sessionId,
        selective,
        pathProbes,
      ).catch((error) => {
        logForDebugging(`[agent-proxy] gh stand-in shim write failed: ${errorMessage(error)}`, {
          level: "warn",
        });
        logFeatureSad("agent_proxy_gh_shim", "arm_failed");
        return;
      });
      if (N) {
        G.ghShimDir = N.shimDir;
        G.ghStandin = N.standin;
        G.ghStandinEnterprise = N.enterprise;
        G.ghStandinAnyHost = N.anyHost;
        G.ghStandinNoJq = N.noJq;
      }
    }
    if (runtime.state !== G)
      return {
        outcome: "stale",
      };
    upstreamProxyRelay.runStartupChecks();
    setAgentProxyGhStandin(ghStandinConfig(G));
    logForDebugging(`[agent-proxy] enabled on 127.0.0.1:${upstreamProxyRelay.port} (CA from ${caSource})`);
    logFeatureOk("agent_proxy_init", {
      attempts: e,
      ca_source: fromEnum(caSource),
    });
    setAgentProxyNote(describeProxyForPrompt(caBundlePath, undefined));
    writeFile(H, buildAgentProxyReadme(upstreamProxyRelay.port, caBundlePath), "utf8")
      .then(() => {
        if (runtime.state !== G) return;
        setAgentProxyNote(describeProxyForPrompt(caBundlePath, H));
      })
      .catch((error) => {
        logForDebugging(
          `[agent-proxy] README write failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (runtime.state !== G) return;
        setAgentProxyNote(describeProxyForPrompt(caBundlePath, undefined));
      });
    let recordPath = systemTrustCaPath(caBundlePath);
    let we = false;
    if (!governedGitTools && caSource === "env") {
      let caBundleFile = await readCaBundleFile(recordPath);
      we =
        caBundleFile.state === "read" &&
        compareCaBundles(caBundleFile.text, I) !== "same" &&
        systemStoreHasCa(systemCa, caBundleFile.text);
    }
    let Re = governedGitTools || we ? undefined : installCaIntoSystemTrust(n, I, recordPath, "start");
    let Je = we ? Promise.withResolvers() : undefined;
    let Be;
    let Ht = false;
    if (opts?.toolTrust !== false && !governedGitTools)
      Be = configureToolTrust({
        ccrCa: I,
        caBundlePath,
        hasSystemCa: G.hasSystemCa ?? false,
        stateDir: join(caBundlePath, ".."),
        systemTrust: Re ?? Je?.promise,
        ...(opts?.toolTrust ?? {}),
      })
        .then((N) => {
          if (runtime.state !== G) return;
          carryJavaTrustStore(G, N);
          if (N.profileDPath) {
            let profileDPath = N.profileDPath;
            registerCleanup(() => unlink(profileDPath).catch(() => {}));
          }
          if (N.failureCodes.length > 0) G.toolTrustFailureCodes = N.failureCodes;
        })
        .catch((error) => {
          logForDebugging(
            `[agent-proxy] tool trust setup failed: ${error instanceof Error ? error.message : String(error)}`,
            {
              level: "warn",
            },
          );
          logFeatureSad("agent_proxy_tool_trust", "setup_threw");
          Ht = true;
        });
    let De = {
      ccrCa: I,
      systemTrust: Re,
      toolTrust: Be,
      installIncomplete: false,
      installRetries: 0,
    };
    if (caWatchEnabled && !governedGitTools)
      Promise.all([Re, Be])
        .then(async ([N]) => {
          let be = opts?.toolTrust === false || (await matchesAgentProxyCa(caBundlePath, I));
          if (runtime.state === G && De.ccrCa === I)
            De.installIncomplete = we || Ht || !be || hasTrustStoreFailure(N, G.toolTrustFailureCodes ?? []);
        })
        .catch(() => {});
    let embeddedEndpoint = !selective && !governedGitTools;
    let afterStart;
    if (caSource === "env")
      afterStart = reconcileAgentProxyCa(n, G, I, {
        systemTrust: Re,
        toolTrust: Be,
        installDeferred: we,
        onInstallSettled: () => Je?.resolve(),
        embeddedEndpoint,
        relayPort: upstreamProxyRelay.port,
        ...(caWatchEnabled && {
          trust: De,
        }),
      })
        .catch((error) => {
          logForDebugging(`[agent-proxy] CA reconcile crashed: ${errorMessage(error)}`, {
            level: "warn",
          });
          logFeatureSad("agent_proxy_ca_reconcile", "reconcile_threw");
        })
        .finally(() => Je?.resolve());
    let caWatchIntervalMs = opts?.caWatchIntervalMs ?? DEFAULT_CA_WATCH_INTERVAL_MS;
    if (caWatchEnabled && !governedGitTools && caWatchIntervalMs > 0)
      watchAgentProxyCa(n, G, De, {
        intervalMs: caWatchIntervalMs,
        afterStart,
        embeddedEndpoint,
        relayPort: upstreamProxyRelay.port,
      }).catch((error) => {
        logForDebugging(`[agent-proxy] CA watch crashed: ${errorMessage(error)}`, {
          level: "warn",
        });
        logFeatureSad("agent_proxy_ca_watch", "watch_threw");
      });
    if (unlinkTokenPath)
      await unlink(unlinkTokenPath).catch(() => {
        logForDebugging("[agent-proxy] token file unlink failed", {
          level: "warn",
        });
      });
    return {
      outcome: "ok",
    };
  } catch (error) {
    logForDebugging(
      `[agent-proxy] relay start failed: ${error instanceof Error ? error.message : String(error)}; proxy disabled`,
      {
        level: "warn",
      },
    );
    logFeatureBad("agent_proxy_init", "agent_proxy_init_relay_start_failed");
    return {
      outcome: "fatal",
    };
  }
}
//@ chunk-awy329vy.js:71701-71876 placement
function ghStandinConfig(n) {
  return n.ghStandin
    ? proxyPromptVariant({
        enterprise: n.ghStandinEnterprise === true,
        anyHost: n.ghStandinAnyHost === true,
        noJq: n.ghStandinNoJq === true,
        runner: n.governedGitTools === true,
      })
    : undefined;
}
//@ chunk-awy329vy.js:71876-72598 placement
async function configureGovernedGit(n, caBundlePath, r, selective, pathProbes) {
  let h = false;
  let [l, u] = await Promise.all([
    env.CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG
      ? writeGovernedGitConfig(r, caBundlePath).catch((error) => {
          logForDebugging(`[agent-proxy] governed git config append failed: ${errorMessage(error)}`, {
            level: "warn",
          });
          logFeatureSad("agent_proxy_tool_scoped", "git_config_append_failed");
          h = true;
          return false;
        })
      : false,
    env.CLAUDE_CODE_AGENT_PROXY_GH_SHIM
      ? installGhShim(r, caBundlePath, undefined, selective, pathProbes).catch((error) => {
          logForDebugging(`[agent-proxy] gh shim write failed: ${errorMessage(error)}`, {
            level: "warn",
          });
          logFeatureSad("agent_proxy_tool_scoped", "gh_shim_write_failed");
          logFeatureSad("agent_proxy_gh_shim", "arm_failed");
          h = true;
          return;
        })
      : undefined,
  ]);
  if (u) {
    n.ghShimDir = u.shimDir;
    n.ghStandin = u.standin;
    n.ghStandinEnterprise = u.enterprise;
    n.ghStandinAnyHost = u.anyHost;
    n.ghStandinNoJq = u.noJq;
  }
  if (!h)
    logFeatureOk("agent_proxy_tool_scoped", {
      git_config: l,
      gh_shim: Boolean(u),
    });
  return l;
}
//@ chunk-awy329vy.js:72598-73271 placement
/**
 * 由代理注入凭证的命令行工具（gh、aws、gcloud/bq/gsutil）：各自的真实凭证环境变量与替换成占位标记的变量。
 */
var CREDENTIAL_PLACEHOLDER_CLIS = [
  {
    clis: ["gh"],
    realCredentialEnv: ["GH_TOKEN", "GITHUB_TOKEN"],
    placeholders: {
      GH_TOKEN: PROXY_INJECTED_MARKER,
      GITHUB_TOKEN: PROXY_INJECTED_MARKER,
    },
  },
  {
    clis: ["aws"],
    realCredentialEnv: [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_SESSION_TOKEN",
      "AWS_PROFILE",
      "AWS_SHARED_CREDENTIALS_FILE",
      "AWS_CONFIG_FILE",
      "AWS_WEB_IDENTITY_TOKEN_FILE",
      "AWS_ROLE_ARN",
      "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI",
      "AWS_CONTAINER_CREDENTIALS_FULL_URI",
    ],
    placeholders: {
      AWS_ACCESS_KEY_ID: PROXY_INJECTED_MARKER,
      AWS_SECRET_ACCESS_KEY: PROXY_INJECTED_MARKER,
    },
  },
  {
    clis: ["gcloud", "bq", "gsutil"],
    realCredentialEnv: ["CLOUDSDK_AUTH_ACCESS_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS"],
    placeholders: {
      CLOUDSDK_AUTH_ACCESS_TOKEN: PROXY_INJECTED_MARKER,
    },
  },
];
var PLACEHOLDER_CREDENTIAL_KEYS = CREDENTIAL_PLACEHOLDER_CLIS.flatMap((n) => Object.keys(n.placeholders));
var CA_POLL_INTERVAL_MS = 1000;
//@ chunk-awy329vy.js:73271-73316 placement
function readToken(path) {
  return inheritedByChildren(path)?.trim() || undefined;
}
//@ chunk-awy329vy.js:73316-73520 placement
function getRunningRelayForGit() {
  let state = getAgentProxyState().state;
  if (
    !state.enabled ||
    !state.port ||
    !state.caBundlePath ||
    state.governedGitTools ||
    !state.bundleCoversEveryHost
  )
    return null;
  return {
    proxyUrl: loopbackProxyUrl(state.port),
    noProxy: state.noProxy,
    caBundlePath: state.caBundlePath,
  };
}
//@ chunk-awy329vy.js:73520-74962 placement = getUpstreamProxyEnv (0.377)
/**
 * getAgentProxyEnv：代理启用时给子进程的环境变量（HTTPS_PROXY/NO_PROXY、CA 包相关变量、JAVA_TOOL_OPTIONS、gh shim 的 PATH 等）。
 */
function getAgentProxyEnv() {
  let state = getAgentProxyState().state;
  if (state.enabled && state.governedGitTools) {
    let o = {};
    if (state.ghShimDir) {
      let s = inheritedByChildren("PATH") ?? "";
      o.PATH = s ? `${state.ghShimDir}${delimiter}${s}` : state.ghShimDir;
      if (state.ghStandin && s) o.PATH = `${s}${delimiter}${state.ghShimDir}`;
    }
    return o;
  }
  if (!state.enabled || !state.port || !state.caBundlePath) {
    if (process.env.HTTPS_PROXY && process.env.SSL_CERT_FILE) {
      let o = {};
      for (let key of ["HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy", ...caCertEnvVars])
        if (process.env[key]) o[key] = process.env[key];
      for (let s of [...Object.keys(caCertEnvVarList), ...PLACEHOLDER_CREDENTIAL_KEYS]) {
        let h = inheritedByChildren(s);
        if (h) o[s] = h;
      }
      return o;
    }
    return {};
  }
  let e = loopbackProxyUrl(state.port);
  let r = {
    HTTPS_PROXY: e,
    https_proxy: e,
    NO_PROXY: state.noProxy,
    no_proxy: state.noProxy,
  };
  for (let o of CA_CERT_ENV_VARS_2) r[o] = state.caBundlePath;
  if (state.bundleCoversEveryHost) {
    for (let o of CA_CERT_ENV_VARS) r[o] = state.caBundlePath;
    for (let [key, value] of Object.entries(caCertEnvVarList))
      if (inheritedByChildren(key) === undefined) r[key] = value;
  }
  if (state.javaTrustStorePath && state.javaTrustStoreType)
    r.JAVA_TOOL_OPTIONS = buildJavaTrustOptions(
      state.javaTrustStorePath,
      state.javaTrustStoreType,
      readToken("JAVA_TOOL_OPTIONS"),
    );
  if (readToken("GIT_TERMINAL_PROMPT") === undefined)
    r.GIT_TERMINAL_PROMPT = GIT_NO_PROMPT_ENV.GIT_TERMINAL_PROMPT;
  if (readToken("GIT_ASKPASS") === undefined) r.GIT_ASKPASS = GIT_NO_PROMPT_ENV.GIT_ASKPASS;
  if (readToken("GCM_INTERACTIVE") === undefined) r.GCM_INTERACTIVE = GIT_NO_PROMPT_ENV.GCM_INTERACTIVE;
  if (gitConfigCountUnset()) {
    let o = [["credential.interactive", "false"]];
    if (sshAuthUnset())
      o.push(...GITHUB_SSH_PREFIXES.map((s) => [`url.https://${GITHUB_HOST}/.insteadOf`, s]));
    Object.assign(r, buildGitConfigEnv(undefined, o));
  }
  for (let o of CREDENTIAL_PLACEHOLDER_CLIS)
    if (!o.realCredentialEnv.some((h) => inheritedByChildren(h))) Object.assign(r, o.placeholders);
  if (state.ghShimDir) r.PATH = [readToken("PATH"), state.ghShimDir].filter(Boolean).join(delimiter);
  return r;
}
//@ chunk-awy329vy.js:74962-75043 placement
/**
 * 代理启用且使用 gh 替身时返回 gh shim 目录。
 */
function getGhStandinDir() {
  let state = getAgentProxyState().state;
  return state.enabled && state.ghStandin ? state.ghShimDir : undefined;
}
//@ chunk-awy329vy.js:75043-75145 placement
function isGovernedGitArmed() {
  return Boolean(env.CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG || env.CLAUDE_CODE_AGENT_PROXY_GH_SHIM);
}
//@ chunk-awy329vy.js:75145-75332 placement
var GIT_CONFIG_BLOCK_BEGIN = "# >>> claude agent-proxy governed-git (auto-generated; do not edit) >>>";
var GIT_CONFIG_BLOCK_END = "# <<< claude agent-proxy governed-git <<<";
var GIT_CREDENTIAL_QUIT_HELPER = '"!f() { case $1 in get) echo quit=true ;; esac; }; f"';
//@ chunk-awy329vy.js:75332-75764 placement
function getGovernedGitHosts() {
  let CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS = env.CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS;
  if (!CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS || CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS.trim() === "")
    return [GITHUB_HOST];
  let e = [];
  let r = 0;
  for (let o of CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS.split(",")) {
    let trimmed = o.trim();
    if (trimmed === "") continue;
    let h = normalizeHost(trimmed);
    if (h === "" || h.length > 255 || !HOST_LABEL_RE.test(h)) {
      r++;
      continue;
    }
    let l = isGithubDotCom(h) ? GITHUB_HOST : h;
    if (!e.includes(l)) e.push(l);
  }
  if (r > 0)
    logForDebugging(
      `[agent-proxy] governed git: ignored ${r} governed-host ${plural(r, "entry", "entries")} that ${plural(r, "is", "are")} not a bare hostname`,
      {
        level: "warn",
      },
    );
  return e;
}
//@ chunk-awy329vy.js:75764-77142 placement
/**
 * 写入受治理 git 的全局配置块（代理、CA、凭证助手）。
 */
async function writeGovernedGitConfig(n, e) {
  let r;
  switch (n.kind) {
    case "relay":
      r = loopbackProxyUrl(n.port);
      break;
    case "standalone":
      r = n.proxyUrl;
      break;
  }
  let envGitConfigGlobal = process.env.GIT_CONFIG_GLOBAL;
  if (!envGitConfigGlobal) {
    logForDebugging(
      "[agent-proxy] governed git config arm set but GIT_CONFIG_GLOBAL is unset; skipping (refusing to write a shared global config)",
      {
        level: "warn",
      },
    );
    return false;
  }
  if ([e, r].some((y) => /[\n\r"]/.test(y))) {
    logForDebugging(
      "[agent-proxy] governed git: the CA bundle path or the proxy URL contains a newline or quote; skipping git config arm",
      {
        level: "warn",
      },
    );
    return false;
  }
  let governedGitHosts = getGovernedGitHosts();
  if (governedGitHosts.length === 0) {
    logForDebugging(
      "[agent-proxy] governed git: the governed-host list carried no usable host; skipping git config arm",
      {
        level: "warn",
      },
    );
    return false;
  }
  let h = [GIT_CONFIG_BLOCK_BEGIN];
  for (let governedGitHost of governedGitHosts) {
    h.push(
      `[http "https://${governedGitHost}/"]`,
      `	proxy = ${r}`,
      `	sslCAInfo = ${e}`,
      ...(governedGitHost === GITHUB_HOST ? [] : ["\textraHeader =", "\tcookieFile ="]),
      `[credential "https://${governedGitHost}/"]`,
      ...(governedGitHost === GITHUB_HOST ? [] : ["\thelper =", `	helper = ${GIT_CREDENTIAL_QUIT_HELPER}`]),
      "\tinteractive = false",
    );
    if (governedGitHost === GITHUB_HOST && sshAuthUnset())
      h.push(`[url "https://${GITHUB_HOST}/"]`, ...GITHUB_SSH_PREFIXES.map((w) => `	insteadOf = ${w}`));
  }
  h.push(GIT_CONFIG_BLOCK_END);
  let l = "";
  try {
    l = await readFile(envGitConfigGlobal, "utf8");
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let index = l.indexOf(GIT_CONFIG_BLOCK_BEGIN);
  if (index !== -1) {
    let index_2 = l.indexOf(GIT_CONFIG_BLOCK_END, index);
    l =
      index_2 !== -1
        ? l.slice(0, index) + l.slice(index_2 + GIT_CONFIG_BLOCK_END.length).replace(/^\n/, "")
        : l.slice(0, index);
  }
  let p =
    l.length > 0 &&
    !l.endsWith(`
`)
      ? l +
        `
`
      : l;
  await writeFileAtomic(
    envGitConfigGlobal,
    p +
      h.join(`
`) +
      `
`,
    384,
  );
  logForDebugging(
    `[agent-proxy] governed git: relay routing for ${governedGitHosts.length} governed ${plural(governedGitHosts.length, "host")} appended to ${envGitConfigGlobal}`,
  );
  return true;
}
//@ chunk-awy329vy.js:77142-77319 placement
async function findOnPath(n, e) {
  let parts = (env.PATH ?? "").split(delimiter);
  for (let o of parts) {
    if (!o || o === e) continue;
    let s = join(o, n);
    try {
      await access(s, constants.X_OK);
      if ((await stat(s)).isFile()) return s;
    } catch {}
  }
  return;
}
//@ chunk-awy329vy.js:77319-77829 placement
async function withTimeBudget(n, e, { budgetMs, caSource }) {
  let s = `${n} timed out`;
  let startTime = performance.now();
  let l = sampleCpuAndPageFaults();
  let eventLoopLagMonitor = startEventLoopLagMonitor(LAG_SAMPLE_INTERVAL_MS);
  try {
    return {
      value: await withTimeout(e(), budgetMs, s),
    };
  } catch (error) {
    let y = sampleCpuAndPageFaults();
    let w = errorMessage(error) === s;
    let T = sanitizeErrnoForTelemetry(error);
    return {
      failure: {
        timedOut: w,
        detail: w ? s : `${n} failed (${errorMessage(error)})`,
        fields: {
          ca_source: fromEnum(caSource),
          ...(T !== undefined && {
            errno: T,
          }),
          elapsed_ms: Math.round(performance.now() - startTime),
          loop_lag_max_ms: Math.round(eventLoopLagMonitor.stop()),
          ...(l &&
            y && {
              cpu_delta_ms: Math.round(y.cpuTimeMs - l.cpuTimeMs),
              major_fault_delta: y.majorPageFaults - l.majorPageFaults,
            }),
        },
      },
    };
  } finally {
    eventLoopLagMonitor.stop();
  }
}
//@ chunk-awy329vy.js:77829-78185 placement
async function sweepInstalledClis(n) {
  let e = new Set();
  let r = await withTimeBudget("installed-CLI PATH sweep", () => scanPathForExecutables(PROXIED_CLIS, e), n);
  if ("failure" in r) {
    logForDebugging(`[agent-proxy] ${r.failure.detail}; naming only the CLIs resolved so far`, {
      level: "warn",
    });
    logFeatureSad(
      "agent_proxy_init",
      r.failure.timedOut ? "agent_proxy_path_probe_timeout" : "agent_proxy_path_probe_failed",
      r.failure.fields,
    );
  }
  return PROXIED_CLIS.filter((o) => e.has(o));
}
//@ chunk-awy329vy.js:78185-78287 placement
var MAX_SHIM_BYTES = 65536;
var GH_SHIM_HEADER = `#!/bin/sh
# claude agent-proxy governed-git gh shim (auto-generated; per-session).
`;
//@ chunk-awy329vy.js:78287-78554 placement
async function readGhShim(n) {
  try {
    await using e = await open(n, readOnlyNoFollowFlags());
    let handleUpTo = await readHandleUpTo(e, MAX_SHIM_BYTES + 1);
    return handleUpTo.length > MAX_SHIM_BYTES ? "" : handleUpTo.toString("utf8");
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(
        `[agent-proxy] gh shim at ${n} could not be read (${getErrnoCode(error) ?? "no error code"}); treated as not a shim`,
        {
          level: "warn",
        },
      );
    return "";
  }
}
//@ chunk-awy329vy.js:78554-78632 placement
function urlHostMatches(n, e) {
  let hostname = URL.parse(githubApiBase(e))?.hostname;
  return hostname !== undefined && hostMatchesSelectiveList(n, hostname);
}
//@ chunk-awy329vy.js:78632-78941 placement
async function isJqInstalled(n, e) {
  let r = await withTimeBudget("jq PATH probe", () => findOnPath("jq", n), e);
  if ("failure" in r) {
    logForDebugging(`[agent-proxy] ${r.failure.detail}; taking jq as installed`, {
      level: "warn",
    });
    logFeatureSad(
      "agent_proxy_gh_shim",
      r.failure.timedOut ? "jq_path_probe_timeout" : "jq_path_probe_failed",
      r.failure.fields,
    );
    return false;
  }
  return r.value === undefined;
}
//@ chunk-awy329vy.js:78941-79100 placement
function removeGhShimLater(n, e, r) {
  registerCleanup(async () => {
    if ((await readGhShim(n)) !== e) return;
    await unlink(n).catch(() => {});
    if (r) {
      let o = join(n, "..");
      await rmdir(o)
        .then(() => rmdir(join(o, "..")))
        .catch(() => {});
    }
  });
}
//@ chunk-awy329vy.js:79100-82708 placement
/**
 * 为 agent 代理安装 gh 垫片（gh shim），没有 gh 时提供替身。
 */
async function installGhShim(n, e, r, o, s) {
  let h = r !== undefined;
  let l =
    r !== undefined
      ? join(e, "..", "sessions", computeContentHash(r).slice(0, 32), "bin")
      : join(e, "..", "bin");
  let u = join(l, "gh");
  let p = await withTimeBudget("gh PATH probe", () => findOnPath("gh", l), s);
  if ("failure" in p) {
    logForDebugging(`[agent-proxy] ${p.failure.detail}; skipping gh shim`, {
      level: "warn",
    });
    if (!h) throw Error("gh PATH probe failed");
    logFeatureSad(
      "agent_proxy_gh_shim",
      p.failure.timedOut ? "gh_path_probe_timeout" : "gh_path_probe_failed",
      p.failure.fields,
    );
    return;
  }
  let ghPath = p.value;
  if (ghPath && h) {
    logFeatureOk("agent_proxy_gh_shim", {
      standin: false,
      hosted: true,
    });
    return;
  }
  if (!ghPath && isEssentialTrafficOnly()) {
    logForDebugging("[agent-proxy] no gh on PATH and nonessential traffic is disabled; skipping gh shim");
    logFeatureSad("agent_proxy_gh_shim", "standin_essential_traffic_only");
    return;
  }
  if (!ghPath && !urlHostMatches(o, GITHUB_HOST)) {
    logForDebugging(
      "[agent-proxy] no gh on PATH and this relay does not send GitHub API requests to the session proxy (selective mode); skipping gh shim",
    );
    logFeatureSad("agent_proxy_gh_shim", "selective_relay");
    return;
  }
  if ((env.PATH ?? "").split(delimiter).includes(l)) {
    let ghShim = await readGhShim(u);
    let included = ghShim.includes(` '${GH_STANDIN_FLAG}' `);
    let v = ghShim.startsWith(GH_SHIM_HEADER);
    let P = !ghPath;
    if (P ? included : v) {
      logForDebugging(`[agent-proxy] gh shim at ${u} is the enclosing session's; left as it is`);
      logFeatureOk("agent_proxy_gh_shim", {
        standin: P,
        ...(h && {
          hosted: true,
        }),
        inherited: true,
      });
      return {
        shimDir: l,
        standin: P,
        enterprise: P && ghShim.includes(" '--hosts="),
        anyHost: P && ghShim.includes(` '${ANY_HOST_FLAG}' `),
        noJq: P && (await isJqInstalled(l, s)),
      };
    }
    if (included || v) {
      logForDebugging(
        `[agent-proxy] gh shim at ${u} is the enclosing session's, of another kind; no gh shim for this process`,
      );
      logFeatureSad("agent_proxy_gh_shim", "enclosing_shim_other_kind");
      return;
    }
  }
  let w;
  if (ghPath) w = [ghPath];
  else {
    let launchCommand = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    w = [launchCommand.cmd, ...launchCommand.prefixArgs];
  }
  if ([e, ...w].some((b) => /['\n\r]/.test(b))) {
    logForDebugging(
      "[agent-proxy] governed git: a path or argument the gh shim would quote holds a quote or a line break; skipping gh shim",
      {
        level: "warn",
      },
    );
    logFeatureSad("agent_proxy_gh_shim", "unquotable_path");
    return;
  }
  await mkdir(l, {
    recursive: true,
    mode: 448,
  });
  if (!ghPath) {
    let b = h && o === undefined;
    let C = h
      ? []
      : getGovernedGitHosts().filter(
          (E) => E !== GITHUB_HOST && !E.endsWith(GHE_HOST_SUFFIX) && urlHostMatches(o, E),
        );
    let v;
    switch (n.kind) {
      case "relay":
        v = n.port;
        break;
      case "standalone":
        v = STANDALONE_PROXY;
        break;
    }
    let P = describeGhStandinHosts({
      command: w,
      port: v,
      caBundlePath: e,
      ghesHosts: b ? ANY : C,
    });
    await writeFileAtomic(u, P, 493);
    removeGhShimLater(u, P, h);
    logForDebugging(`[agent-proxy] no gh on PATH; gh stand-in shim at ${u}`);
    logFeatureOk("agent_proxy_gh_shim", {
      standin: true,
      ...(h && {
        hosted: true,
      }),
    });
    return {
      shimDir: l,
      standin: true,
      enterprise: C.length > 0,
      anyHost: b,
      noJq: await isJqInstalled(l, s),
    };
  }
  let T;
  let S;
  switch (n.kind) {
    case "relay":
      T = "";
      S = `HTTPS_PROXY='${loopbackProxyUrl(n.port)}' https_proxy='${loopbackProxyUrl(n.port)}' \\
`;
      break;
    case "standalone":
      T = buildGhProxyCheckScript();
      S = "";
      break;
  }
  let x =
    GH_SHIM_HEADER +
    `# Routes gh-to-github.com through the session relay ONLY when the
# invocation carries no customer credential. GHE targets (GH_HOST,
# --hostname, a -R/--repo/GH_REPO naming a non-github.com host, or a
# non-github.com origin remote in the cwd checkout) and
# real-customer-token invocations exec directly on the
# customer's own egress, so customer credentials never transit the
# relay tunnel and gh-to-GHE keeps working.
# Real customer tokens decide alone, checked first (costs nothing):
# gh sends GH_TOKEN/GITHUB_TOKEN proactively, and the GHE-scoped
# enterprise pair means gh may target a GHE host in ways the checks
` +
    `# below cannot see (e.g. a URL positional arg) \u2014 never route any of
` +
    `# them through the tunnel.
` +
    buildGhGuardScript(ghPath) +
    T +
    `# NO_PROXY cleared: an ambient runner-host NO_PROXY covering
# github.com would make gh skip the relay and send the literal dummy
# token to the real GitHub API (hard 401).
` +
    S +
    `NO_PROXY='' no_proxy='' \\
SSL_CERT_FILE='${e}' \\
GH_TOKEN='${PROXY_INJECTED_MARKER}' GITHUB_TOKEN='${PROXY_INJECTED_MARKER}' \\
exec '${ghPath}' "$@"
`;
  await writeFileAtomic(u, x, 493);
  removeGhShimLater(u, x, h);
  logForDebugging(`[agent-proxy] governed git: gh shim at ${u} -> ${ghPath}`);
  logFeatureOk("agent_proxy_gh_shim", {
    standin: false,
  });
  return {
    shimDir: l,
    standin: false,
    enterprise: false,
    anyHost: false,
    noJq: false,
  };
}
//@ chunk-awy329vy.js:82708-82761 placement
function gitConfigCountUnset() {
  return readToken("GIT_CONFIG_COUNT") === undefined;
}
//@ chunk-awy329vy.js:82761-82843 placement
function sshAuthUnset() {
  return readToken("SSH_AUTH_SOCK") === undefined && readToken("GIT_SSH_COMMAND") === undefined;
}
//@ chunk-awy329vy.js:82843-83944 placement
function describeProxyForPrompt(caBundlePath, e) {
  let state = getAgentProxyState().state;
  if (state.governedGitTools) {
    let s = e ? `see ${e} and ` : "";
    let h = state.ghStandin === true;
    let l = isAgentProxyStandaloneActive()
      ? "other network traffic goes through the same proxy, and other tools that reach github.com there (curl, npm, or gh run with a GitHub token of its own) fail TLS verification: only git and gh trust that CA bundle."
      : "other network traffic uses this machine's own egress.";
    return (
      `GitHub access for git${h ? " and gh" : ""} goes through a pre-configured session proxy (CA bundle: ${caBundlePath}) via per-session git config${h ? " and a gh PATH shim" : ""}; ${l} If ${h ? "git or gh fail" : "git fails"} against github.com (TLS or HTTP errors, or a transfer cut off with connection reset / unexpected disconnect), ${s}check the git config file named by $GIT_CONFIG_GLOBAL; never disable TLS verification or remove the proxy/sslCAInfo entries there.` +
      (state.ghShimDir && !h
        ? " `gh` in a Bash command is this machine's own GitHub CLI, with its own sign-in and network path."
        : "")
    );
  }
  let installedClis = (state.installedProxyPreconfiguredClis ?? []).filter(
    (s) => !(state.ghStandin === true && s === "gh"),
  );
  return {
    caBundlePath,
    hasReadme: e !== undefined,
    installedClis,
  };
}
//@ chunk-awy329vy.js:83944-84146 placement
var GIT_CONFIG_CONFLICT_PATTERNS = [
  ["git_http_proxy_configured", /^http\.(.+\.)?proxy$/m],
  ["git_ssl_cainfo_configured", /^http\.(.+\.)?sslcainfo$/m],
  ["git_https_to_ssh_insteadof_configured", /^url\.(git@|ssh:\/\/).*\.insteadof$/m],
];
//@ chunk-awy329vy.js:84146-84255 placement
function getGitProbeCwd() {
  let root = parse(tmpdir()).root;
  try {
    let e = homedir();
    if (e && statSync(e).isDirectory()) return e;
    return root;
  } catch {
    return root;
  }
}
//@ chunk-awy329vy.js:84255-84538 placement
async function readGlobalGitConfigKeys() {
  let n = new Set();
  let results = await Promise.all(
    ["--global", "--system"].map((r) =>
      execFileNoThrowWithCwd("git", ["config", r, "--list", "--name-only"], {
        timeout: 5000,
        preserveOutputOnError: true,
        cwd: getGitProbeCwd(),
      }),
    ),
  );
  for (let r of results) {
    if (r.code !== 0) continue;
    for (let [o, s] of GIT_CONFIG_CONFLICT_PATTERNS) if (s.test(r.stdout)) n.add(o);
  }
  return [...n];
}
//@ chunk-awy329vy.js:84538-89559 placement
/**
 * 生成写给模型/用户看的 agent 代理说明文档（本地代理地址、CA 位置、快速诊断步骤）。
 */
function buildAgentProxyReadme(port, caBundlePath) {
  let r = join(caBundlePath, "..");
  let o = `http://127.0.0.1:${port}`;
  return `# Claude Code agent proxy

Outbound HTTPS from this session goes through a local proxy at ${o}
(set via HTTPS_PROXY) which tunnels to a policy-enforcing egress proxy. TLS is
re-terminated there, so every tool must trust the CA bundle at
${caBundlePath}. The standard CA environment variables, the system trust
store (where possible), a JVM truststore, the Bazel system bazelrc, the
browser NSS store, and gsutil's boto config are already set up.

## Quick diagnosis

1. Run: curl -sS ${o}/__agentproxy/status
   It reports proxy state, which trust and git accommodations are active
   (javaTrustStorePath, toolTrustFailureCodes, gitSshRewrite,
   gitConfigConflicts), and the most recent proxy-side failures.
2. Find the failure class below and apply the matching fix; gitConfigConflicts
   codes map to the git section, toolTrustFailureCodes to the JVM section.
3. Never disable TLS verification, never unset HTTPS_PROXY, and do not retry
   policy denials (403/407) \u2014 report them instead.

## Failure classes and fixes

### "certificate verify failed" / "self-signed certificate in chain" / PKIX errors

The failing tool is not reading the pre-set CA configuration. In order:

- If the tool has a CA flag or env var, point it at ${caBundlePath}
  (examples: --cacert, SSL_CERT_FILE, NODE_EXTRA_CA_CERTS, REQUESTS_CA_BUNDLE,
  AWS_CA_BUNDLE, DENO_CERT, CARGO_HTTP_CAINFO, PIP_CERT, GIT_SSL_CAINFO,
  BUNDLE_SSL_CA_CERT, HEX_CACERTS_PATH, NIX_SSL_CERT_FILE).
- Tool config files override environment variables. If one of these sets its
  own CA or disables verification, point it at the bundle instead:
  pip.conf "cert", npm "cafile" (npm config get cafile), ~/.curlrc "cacert",
  .wgetrc "ca_certificate", conda "ssl_verify", git "http.sslCAInfo",
  gradle.properties / MAVEN_OPTS "-Djavax.net.ssl.trustStore".
- JVM tools (Maven, Gradle, plain Java): when a JDK is present,
  JAVA_TOOL_OPTIONS points JVMs at a truststore that holds the proxy CA: the
  JDK's own store if the system trust install already added the CA there,
  otherwise ${r}/java-truststore.p12 (password "changeit"). Confirm
  javaTrustStorePath is set in the status output before pointing a build at it
  (toolTrustFailureCodes explains why it is missing). If the image or the
  build sets its own trustStore, that one wins \u2014 import the proxy CA into it
  with
  keytool -importcert -noprompt -alias ccr-agent-proxy -file ${r}/agent-proxy-ca.crt -keystore <their store>
  or point the build at the ready-made one. Bazel reads the managed block in
  /etc/bazel.bazelrc rather than JAVA_TOOL_OPTIONS.

### "405 Method Not Allowed" from the proxy

The tool sent a plain-HTTP (non-CONNECT) request: usually axios older than
1.16.1 (upgrade it) or a tool configured with HTTP_PROXY (unset HTTP_PROXY for
that tool \u2014 only HTTPS_PROXY is supported).

### 403 / 407 from the proxy

Most often the destination host is not allowed for this session. Do not retry
or route around it \u2014 report the blocked host.
Note: curl hides response bodies on failed CONNECTs; the status endpoint
records the reason.

### "connection reset" / "unexpected disconnect" / "RPC failed" mid-transfer

Once a tunnel is up the proxy cannot send an error response, so a connection
it aborts (tunnel to the egress proxy lost, or an upload the tunnel stopped
accepting) reaches the tool as a bare reset. recentRelayFailures in the status
output names the host and reason; check it before concluding the remote
service refused the operation.

### Tool ignores the proxy entirely (timeouts with no proxy error)

Some clients do not read HTTPS_PROXY: Node's built-in fetch (run that command
with NODE_USE_ENV_PROXY=1 on Node >= 22.21), aiohttp (pass trust_env=True),
Ruby bundler (reads only HTTP_PROXY, which this proxy does not serve),
hand-rolled Go dialers. Prefer the tool's own proxy option where one exists.

### git

SSH-form GitHub remotes (git@github.com:...) are rewritten to HTTPS
automatically unless this session has its own SSH setup or supplies its own
GIT_CONFIG_* (see gitSshRewrite in the status output). A gitconfig that sets
http.proxy / http.<url>.proxy (even empty), its own http.sslCAInfo, or an
https-to-ssh insteadOf makes git bypass the proxy or fail verification \u2014 the
status output's gitConfigConflicts codes name which of these were detected;
adjust those keys for this session if git times out.

### docker build / docker run

Processes inside containers cannot reach 127.0.0.1:${port} and do not trust
the CA. Workarounds: run builds with --network host, copy ${caBundlePath}
into the build context and install it in an early layer, and pass proxy/CA
settings explicitly to the build.

### Not supported through the proxy (report, do not work around)

gRPC / HTTP/2-only APIs, WebSocket upgrades, client-mTLS, certificate-pinned
clients (e.g. Snowflake, ngrok), non-443 HTTPS ports, raw-TCP databases.

If a tool still cannot work through the proxy, report it so the policy or
tooling can be fixed.
`;
}
//@ chunk-awy329vy.js:89559-89817 placement
async function readTokenFile(path) {
  try {
    return {
      existed: true,
      token: (await readFile(path, "utf8")).trim() || null,
    };
  } catch (err) {
    if (isENOENT(err))
      return {
        existed: false,
        token: null,
      };
    logForDebugging(`[agent-proxy] token read failed: ${err instanceof Error ? err.message : String(err)}`, {
      level: "warn",
    });
    return {
      existed: false,
      token: null,
    };
  }
}
//@ chunk-awy329vy.js:89817-89903 placement
/**
 * 在常见路径中找系统 CA 包（/etc/ssl/certs/ca-certificates.crt 等），返回其内容。
 */
async function findSystemCaBundle(n = SYSTEM_CA_BUNDLE_PATHS) {
  for (let e of n)
    try {
      return await readFile(e, "utf8");
    } catch {}
  return "";
}
//@ chunk-awy329vy.js:89903-89918 placement
var MAX_CA_BUNDLE_BYTES_2 = 1048576;
//@ chunk-awy329vy.js:89918-90625 placement
async function foldCustomerCaBundles(n, e) {
  let r = new Set();
  let o = [];
  let s = n;
  for (let caCertEnvVar of caCertEnvVars) {
    let trimmed = process.env[caCertEnvVar]?.trim();
    if (!trimmed || trimmed === e || r.has(trimmed) || SYSTEM_CA_BUNDLE_PATHS.includes(trimmed)) continue;
    r.add(trimmed);
    let u;
    try {
      let w = await stat(trimmed);
      if (!w.isFile() || w.size > MAX_CA_BUNDLE_BYTES_2) continue;
      u = await readFile(trimmed, "utf8");
    } catch (error) {
      if (!isENOENT(error))
        logForDebugging(
          `[agent-proxy] could not read customer CA bundle from ${caCertEnvVar}: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "warn",
          },
        );
      continue;
    }
    let match = u.match(PEM_CERT_BLOCK_RE);
    if (!match) continue;
    let y = 0;
    for (let w of match) {
      if (s.includes(w)) continue;
      o.push(w);
      s += `
${w}`;
      y++;
    }
    if (y > 0)
      logForDebugging(
        `[agent-proxy] folded ${y} customer CA cert(s) from ${caCertEnvVar} into the relay bundle`,
      );
  }
  if (o.length === 0) return "";
  return (
    withoutBlockedCerts(
      o.join(`
`),
      "agent proxy trust",
    ) ??
    o.flatMap((h) => withoutBlockedCerts(h, "agent proxy trust") ?? []).join(`
`)
  );
}
//@ chunk-awy329vy.js:90625-90902 placement
var SYSTEM_TRUST_STORES = [
  {
    dir: "/usr/local/share/ca-certificates",
    name: "ccr-agent-proxy.crt",
    refresh: ["update-ca-certificates"],
    link: "/etc/ssl/certs/ccr-agent-proxy.pem",
    direct: DEBIAN_CA_PATHS,
  },
  {
    dir: "/etc/pki/ca-trust/source/anchors",
    name: "ccr-agent-proxy.crt",
    refresh: ["update-ca-trust", "extract"],
  },
];
var SYSTEM_TRUST_TIMEOUT_MS = 1e4;
//@ chunk-awy329vy.js:90902-91211 placement
function carryJavaTrustStore(n, e) {
  if (e.javaTrustStorePath && e.javaTrustStoreType) {
    n.javaTrustStorePath = e.javaTrustStorePath;
    n.javaTrustStoreType = e.javaTrustStoreType;
  } else if (
    n.javaTrustStorePath === e.retiredJavaTrustStorePath ||
    n.javaTrustStorePath === e.rejectedJdkStorePath
  ) {
    n.javaTrustStorePath = undefined;
    n.javaTrustStoreType = undefined;
  }
}
//@ chunk-awy329vy.js:91211-94075 placement
/**
 * 安装/刷新系统 CA 信任（处理已有证书与 -2 链接、记录安装结果）。
 */
async function installIntoSystemTrust(
  n,
  e,
  { systemCa, recordPath, timeoutMs = SYSTEM_TRUST_TIMEOUT_MS, caller },
) {
  let l = await compareBundleWithFile(recordPath, n);
  let u = systemStoreHasCa(systemCa, n) && l !== "different";
  let p = () =>
    writeFileAtomic(recordPath, n).catch((error) => {
      logForDebugging(`[agent-proxy] could not record the system trust install: ${errorMessage(error)}`);
    });
  let y = {};
  let w = firstPemCertAfterDifferent(n);
  let T = firstCertificateLine(n);
  let S = false;
  for (let { dir, name, refresh, link, direct } of e)
    try {
      let E = join(dir, name);
      let A = link
        ? {
            path: join(dir, name.replace(/\.crt$/, "-2.crt")),
            link: link.replace(/\.pem$/, "-2.pem"),
          }
        : undefined;
      let M = A === undefined ? undefined : await readCaBundleFile(A.path);
      let R = M === undefined || M.state === "missing";
      let I = A !== undefined && w !== undefined && R;
      let Y = u ? await readCaBundleFile(E) : undefined;
      if (Y?.state === "read") {
        let D = compareCaBundles(Y.text, n);
        if (
          R
            ? D === "same" && l === "same"
            : D !== "different" &&
              M?.state === "read" &&
              compareCaBundles(M.text, firstCertificateLine(Y.text)) === "same"
        ) {
          logForDebugging(
            `[agent-proxy] CA already in the system trust store${D === "swapped" ? ", its two certificates in the other order" : ""}; install skipped`,
          );
          if (l === "swapped") await p();
          logFeatureOk("agent_proxy_system_trust", {
            reused: true,
            ...(I && {
              old_layout: true,
            }),
            ...(l === "swapped" && {
              swapped: true,
            }),
          });
          return S ? "failed" : "reused";
        }
      }
      let X = false;
      if (direct && link && R) {
        let D = Date.now() + timeoutMs;
        let F = false;
        let V = await installSystemCaDirect(n, {
          anchorPath: E,
          link,
          layout: direct,
          recordPath,
          timeoutMs,
        });
        let javaStore = V.outcome === "installed" ? V.javaStore : undefined;
        if (V.outcome === "installed" && w !== undefined && A) {
          F = true;
          V = await installSystemCaDirect(T, {
            anchorPath: A.path,
            link: A.link,
            layout: direct,
            recordPath,
            timeoutMs: Math.max(1, D - Date.now()),
          });
        }
        switch (V.outcome) {
          case "installed":
            await p();
            logForDebugging("[agent-proxy] CA installed to system trust directly");
            logFeatureOk("agent_proxy_system_trust", {
              reused: false,
              method: fromEnum("direct"),
              ...(javaStore && {
                java_store: fromEnum(javaStore),
              }),
              ...(F &&
                V.javaStore && {
                  second_anchor_java_store: fromEnum(V.javaStore),
                }),
            });
            return S ? "failed" : "installed";
          case "hook_incomplete":
            logFeatureSad("agent_proxy_system_trust", "hook_incomplete");
            return "failed";
          case "abandoned": {
            let step = V.step;
            y = {
              direct_failed_step: fromEnum(step),
            };
            break;
          }
          case "not_attempted": {
            let H = fromEnum(V.reason);
            y = F
              ? {
                  second_anchor_direct_skipped: H,
                }
              : {
                  direct_skipped: H,
                };
            X = !F && V.reason === "anchor_present";
            break;
          }
        }
      } else if (direct && link) {
        y = {
          direct_skipped: fromEnum("anchor_present"),
        };
        X = true;
      }
      if (X) {
        let D = Y ?? (await readCaBundleFile(E));
        y = {
          ...y,
          record_match: fromEnum(describeReadState(await readCaBundleFile(recordPath), n)),
          store_has_ca: systemStoreHasCa(systemCa, n),
          anchor_match: fromEnum(describeReadState(D, n)),
          ...(M && {
            second_anchor_match: fromEnum(
              describeReadState(M, D.state === "read" ? firstCertificateLine(D.text) : T),
            ),
          }),
          ...(caller && {
            caller: fromEnum(caller),
          }),
        };
      }
      await writeFile(E, n, "utf8");
      await unlink(recordPath).catch(() => {});
      if (A && (w !== undefined || !R)) {
        await writeFile(A.path, T, "utf8");
        await unlink(A.link).catch(() => {});
      }
      if (link) await unlink(link).catch(() => {});
      let promise = await new Promise((resolve) => {
        execFile(
          refresh[0],
          refresh.slice(1),
          {
            timeout: timeoutMs,
            cwd: "/",
            windowsHide: true,
            ...cgroupSpawnOptions("helper"),
          },
          (F) => resolve(F ? (isENOENT(F) ? 127 : 1) : 0),
        );
      });
      if (promise === 0) {
        await p();
        logForDebugging(`[agent-proxy] CA installed to system trust via ${refresh[0]}`);
        logFeatureOk("agent_proxy_system_trust", {
          reused: false,
          method: fromEnum("refresh"),
          ...y,
        });
        return S ? "failed" : "installed";
      }
      S = true;
      logForDebugging(`[agent-proxy] ${refresh[0]} exited ${promise}; falling back to env-var trust`, {
        level: "warn",
      });
    } catch (error) {
      if (isENOENT(error)) continue;
      S = true;
      logForDebugging(
        `[agent-proxy] system trust install via ${dir} failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "warn",
        },
      );
    }
  if (e.length > 0) logFeatureSad("agent_proxy_system_trust", "unavailable", y);
  return S ? "failed" : "no_store";
}
//@ chunk-awy329vy.js:94075-94180 placement
function describeReadState(n, e) {
  if (n.state === "read") return compareCaBundles(n.text, e);
  return n.state === "failed" ? "read_failed" : n.state;
}
//@ chunk-awy329vy.js:94180-94244 placement
function firstCertificateLine(text) {
  return `${firstPemCertAfterDifferent(text) ?? text.match(PEM_CERT_BLOCK_RE)?.[0] ?? text.trimEnd()}
`;
}
//@ chunk-awy329vy.js:94244-94299 placement
function isParsableCertificate(n) {
  try {
    new X509Certificate(n);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-awy329vy.js:94299-94642 placement
var MAX_CA_RESPONSE_BYTES = 65536;
var CA_BUNDLE_PROBLEM_MESSAGES = {
  oversized: "ca-cert response is larger than any certificate bundle",
  no_certificate: "ca-cert response contains no certificate",
  unparseable_certificate: "ca-cert response contains a certificate that does not parse",
  stray_marker:
    "ca-cert response has PEM framing outside its certificates (truncated, or not a certificate bundle)",
};
//@ chunk-awy329vy.js:94642-94937 placement
/**
 * 校验 CA 响应：大小上限、至少一张可解析证书、无多余 PEM 标记。
 */
function validateCaBundle(n) {
  if (n.length > MAX_CA_RESPONSE_BYTES)
    return {
      ok: false,
      problem: "oversized",
    };
  let match = n.match(PEM_CERT_BLOCK_RE);
  if (!match)
    return {
      ok: false,
      problem: "no_certificate",
    };
  if (!match.every(isParsableCertificate))
    return {
      ok: false,
      problem: "unparseable_certificate",
    };
  if (n.replace(PEM_CERT_BLOCK_RE, "").includes("-----BEGIN"))
    return {
      ok: false,
      problem: "stray_marker",
    };
  return {
    ok: true,
    bundle: n,
  };
}
//@ chunk-awy329vy.js:94937-95018 placement
/**
 * 系统信任库是否已包含给定 PEM 里的全部证书。
 */
function systemStoreHasCa(systemCa, e) {
  let match = e.match(PEM_CERT_BLOCK_RE);
  return match !== null && match.every((o) => systemCa.includes(o));
}
//@ chunk-awy329vy.js:95018-95209 fingerprint = downloadCaBundle (0.321)
function reportCaFailure(n, caSource) {
  if (n.outcome === "retry") return n;
  logForDebugging(`[agent-proxy] ${n.detail}; proxy disabled`, {
    level: "warn",
  });
  logFeatureBad("agent_proxy_init", `agent_proxy_init_ca_${n.code}`, {
    ca_source: fromEnum(caSource),
  });
  return n;
}
//@ chunk-awy329vy.js:95209-95222 placement
/**
 * 读取 CA 文件时的大小上限（64 KiB）。
 */
var MAX_CA_FILE_READ_BYTES = 65536;
//@ chunk-awy329vy.js:95222-95547 placement
function decodeCaCertEnv(n) {
  let trimmed = n.trim();
  if (trimmed === "")
    return {
      ok: false,
      reason: "empty",
    };
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed))
    return {
      ok: false,
      reason: "not base64",
    };
  let buffer = Buffer.from(trimmed, "base64");
  if (buffer.length === 0 || buffer.length > MAX_CA_FILE_READ_BYTES)
    return {
      ok: false,
      reason: `decoded to ${buffer.length} bytes`,
    };
  let caBundle = parseCaBundle(buffer.toString("utf8"));
  return caBundle.ok
    ? {
        ok: true,
        pem:
          caBundle.blocks.join(`
`) +
          `
`,
      }
    : caBundle;
}
//@ chunk-awy329vy.js:95547-95572 placement
/**
 * 安装信任库时的最多尝试次数（3）。
 */
var CA_INSTALL_MAX_ATTEMPTS = 3;
var DEFAULT_CA_WATCH_INTERVAL_MS = 3600000;
var CA_INSTALL_RETRIES = 3;
//@ chunk-awy329vy.js:95572-95626 placement
/**
 * 返回系统信任 CA 包文件路径。
 */
function systemTrustCaPath(caBundlePath) {
  return join(caBundlePath, "..", "system-trust.ca.pem");
}
//@ chunk-awy329vy.js:95626-95660 placement
/**
 * 匹配 NSS 与 Java 信任库相关的失败码。
 */
var NSS_OR_JAVA_FAILURE_RE = /^(nss_|java_truststore_)/;
//@ chunk-awy329vy.js:95660-95747 placement
/**
 * 代理 CA 文件与给定内容是否一致。
 */
async function matchesAgentProxyCa(caBundlePath, e) {
  return (await compareBundleWithFile(join(caBundlePath, "..", "agent-proxy-ca.crt"), e)) !== "different";
}
//@ chunk-awy329vy.js:95747-95809 placement
/**
 * 安装失败或有信任库未生效时返回 true。
 */
function hasTrustStoreFailure(n, e) {
  return n === "failed" || e.some((r) => NSS_OR_JAVA_FAILURE_RE.test(r));
}
//@ chunk-awy329vy.js:95809-95966 placement
function installCaIntoSystemTrust(n, e, recordPath, caller, s, systemCa = n.systemCa) {
  return installIntoSystemTrust(e, n.opts?.systemTrustTargets ?? SYSTEM_TRUST_STORES, {
    systemCa,
    recordPath,
    caller,
  })
    .catch(() => "failed")
    .then((l) => {
      s?.();
      return l;
    });
}
//@ chunk-awy329vy.js:95966-98306 placement
async function reconcileAgentProxyCa(
  n,
  e,
  r,
  { systemTrust, toolTrust, installDeferred, onInstallSettled, embeddedEndpoint, relayPort, trust },
) {
  let { runtime, baseUrl, localCa, caBundlePath, governedGitTools, opts } = n;
  let recordPath = systemTrustCaPath(caBundlePath);
  let P = installDeferred;
  let E = (L) => {
    let caller = P ? "deferred" : "reconcile";
    P = false;
    let F = installCaIntoSystemTrust(n, L, recordPath, caller, onInstallSettled);
    if (trust) trust.systemTrust = F;
    return F;
  };
  let now = Date.now();
  let M = false;
  let R;
  for (let idx = 1; ; idx++) {
    if (idx > 1) {
      let D = R?.outcome === "retry" ? R : undefined;
      await sleep(
        opts?.retryDelayMs?.(idx) ?? backgroundRetryDelayMs(idx, D?.retryAfter ?? null),
        undefined,
        {
          unref: true,
        },
      );
    }
    if (runtime.state !== e) return;
    if (isEssentialTrafficOnly()) {
      if (P) await E(r);
      return;
    }
    R = await fetchCcrCaCert(baseUrl, {
      budgetMs: opts?.caFetchBudgetMs ?? 15000,
      tries: 1,
    });
    if (R.outcome !== "retry") break;
    onInstallSettled();
    if (P && idx >= CA_INSTALL_MAX_ATTEMPTS) {
      if (runtime.state !== e) return;
      await E(r);
    }
    if (!M && Date.now() - now >= (opts?.retryBadAfterMs ?? RETRY_BAD_AFTER_MS)) {
      M = true;
      logForDebugging(
        `[agent-proxy] CA reconcile: ${R.detail}; still failing after ${idx} attempts, retrying anyway`,
        {
          level: "warn",
        },
      );
      logFeatureSad("agent_proxy_ca_reconcile", "fetch_still_failing");
    }
  }
  if (runtime.state !== e || R === undefined) return;
  if (R.outcome !== "ok") {
    logForDebugging(`[agent-proxy] CA reconcile: ${R.detail}; the bundle keeps the environment's CA`, {
      level: "warn",
    });
    logFeatureSad("agent_proxy_ca_reconcile", "fetch_http_error");
    if (P) await E(r);
    return;
  }
  let I = compareCaBundles(R.ccrCa, r);
  if (I === "same") {
    logFeatureOk("agent_proxy_ca_reconcile", {
      changed: false,
    });
    if (P) await E(r);
    return;
  }
  let Y = await writeCaBundle(localCa, R.ccrCa, caBundlePath);
  if (Y.outcome !== "ok") {
    logForDebugging(`[agent-proxy] CA reconcile: ${Y.detail}; the bundle keeps the environment's CA`, {
      level: "warn",
    });
    logFeatureSad("agent_proxy_ca_reconcile", "write_failed");
    if (P && runtime.state === e) await E(R.ccrCa);
    return;
  }
  if (trust) {
    trust.ccrCa = R.ccrCa;
    trust.systemTrust = undefined;
    trust.installIncomplete = true;
  }
  if (runtime.state !== e) return;
  logForDebugging(
    `[agent-proxy] CA reconcile: the served CA differs from the environment${I === "swapped" ? " (the same two certificates, in the other order)" : ""}; bundle rewritten`,
  );
  logFeatureOk("agent_proxy_ca_reconcile", {
    changed: true,
    ...(I === "swapped" && {
      swapped: true,
    }),
  });
  if (embeddedEndpoint)
    setAgentProxyEndpoint({
      proxyUrl: loopbackProxyUrl(relayPort),
      gatewayCa: R.ccrCa,
    });
  if (governedGitTools) return;
  await systemTrust;
  if (runtime.state !== e) return;
  let X = E(R.ccrCa);
  await X;
  if (opts?.toolTrust === false || runtime.state !== e) return;
  await toolTrust;
  if (runtime.state !== e) return;
  await configureToolTrust({
    ccrCa: R.ccrCa,
    caBundlePath,
    hasSystemCa: e.hasSystemCa ?? false,
    stateDir: join(caBundlePath, ".."),
    systemTrust: X,
    ...(opts?.toolTrust ?? {}),
  })
    .then((L) => {
      if (runtime.state !== e) return;
      carryJavaTrustStore(e, L);
      e.toolTrustFailureCodes = L.failureCodes.length > 0 ? L.failureCodes : undefined;
    })
    .catch((error) => {
      logForDebugging(`[agent-proxy] CA reconcile: tool trust rebuild failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("agent_proxy_ca_reconcile", "tool_trust_rebuild_threw");
    });
}
//@ chunk-awy329vy.js:98306-99268 placement
function rebuildToolTrustOnCaChange(n, e, r, ccrCa) {
  let { runtime, caBundlePath, opts } = n;
  let recordPath = systemTrustCaPath(caBundlePath);
  let { systemTrust, toolTrust } = r;
  let w = [];
  let T = false;
  let S = (async () => {
    await systemTrust;
    if (runtime.state !== e) return;
    let systemCa = opts?.systemCaPath
      ? await readFile(opts.systemCaPath, "utf8").catch(() => "")
      : await findSystemCaBundle();
    let v = await systemTrust;
    if (v === "failed" || v === undefined) await unlink(recordPath).catch(() => {});
    return installCaIntoSystemTrust(n, ccrCa, recordPath, "watch", undefined, systemCa);
  })();
  let b = (async () => {
    await S;
    if (opts?.toolTrust === false || runtime.state !== e) return;
    await toolTrust;
    if (runtime.state !== e) return;
    await configureToolTrust({
      ccrCa,
      caBundlePath,
      hasSystemCa: e.hasSystemCa ?? false,
      stateDir: join(caBundlePath, ".."),
      systemTrust: S,
      ...(opts?.toolTrust ?? {}),
    })
      .then((C) => {
        if (runtime.state !== e) return;
        carryJavaTrustStore(e, C);
        e.toolTrustFailureCodes = C.failureCodes.length > 0 ? C.failureCodes : undefined;
        w = C.failureCodes;
      })
      .catch((error) => {
        logForDebugging(`[agent-proxy] CA watch: tool trust rebuild failed: ${errorMessage(error)}`, {
          level: "warn",
        });
        T = true;
      });
  })().then(async () => {
    if (runtime.state !== e) return;
    let C = opts?.toolTrust === false || (await matchesAgentProxyCa(caBundlePath, ccrCa));
    let installIncomplete = T || !C || hasTrustStoreFailure(await S, w);
    if (runtime.state === e) r.installIncomplete = installIncomplete;
  });
  r.ccrCa = ccrCa;
  r.systemTrust = S;
  r.toolTrust = b;
  return b;
}
//@ chunk-awy329vy.js:99268-100753 placement
async function watchAgentProxyCa(n, e, r, { intervalMs, afterStart, embeddedEndpoint, relayPort }) {
  let { runtime, baseUrl, localCa, caBundlePath, opts } = n;
  await afterStart;
  let S = false;
  let x = (detail, C) => {
    logForDebugging(`[agent-proxy] CA watch: ${detail}; checking again later`);
    if (!S) {
      S = true;
      logFeatureSad("agent_proxy_ca_watch", C);
    }
  };
  for (;;) {
    await sleep(intervalMs, undefined, {
      unref: true,
    });
    if (runtime.state !== e || isCleanupStarted() || isEssentialTrafficOnly()) return;
    let ccrCaCert = await fetchCcrCaCert(baseUrl, {
      budgetMs: opts?.caFetchBudgetMs ?? 15000,
      tries: 1,
    });
    if (runtime.state !== e) return;
    if (ccrCaCert.outcome !== "ok") {
      x(ccrCaCert.detail, ccrCaCert.outcome === "retry" ? "fetch_failed" : "fetch_http_error");
      continue;
    }
    if (!parseCaBundle(ccrCaCert.ccrCa).ok) {
      x("the served CA does not parse", "unparsable");
      continue;
    }
    let C = compareCaBundles(ccrCaCert.ccrCa, r.ccrCa);
    if (C === "same") {
      S = false;
      if (!r.installIncomplete) continue;
      if (r.installRetries >= CA_INSTALL_RETRIES) {
        logForDebugging(
          `[agent-proxy] CA watch: a trust store did not take the CA after ${CA_INSTALL_RETRIES} more tries; leaving it until the CA changes`,
          {
            level: "warn",
          },
        );
        logFeatureSad("agent_proxy_ca_watch", "install_incomplete");
        r.installIncomplete = false;
        continue;
      }
      r.installRetries++;
      logForDebugging("[agent-proxy] CA watch: trust stores refreshing again for the CA the bundle holds");
      await rebuildToolTrustOnCaChange(n, e, r, ccrCaCert.ccrCa);
      continue;
    }
    let v = await writeCaBundle(localCa, ccrCaCert.ccrCa, caBundlePath);
    if (v.outcome !== "ok") {
      x(v.detail, "write_failed");
      continue;
    }
    S = false;
    r.installRetries = 0;
    if (runtime.state !== e) return;
    logForDebugging(
      `[agent-proxy] CA watch: the served CA changed${C === "swapped" ? " (the same two certificates, in the other order)" : ""}; bundle rewritten, trust stores refreshing`,
    );
    logFeatureOk("agent_proxy_ca_watch", {
      changed: true,
      ...(C === "swapped" && {
        swapped: true,
      }),
    });
    if (embeddedEndpoint)
      setAgentProxyEndpoint({
        proxyUrl: loopbackProxyUrl(relayPort),
        gatewayCa: ccrCaCert.ccrCa,
      });
    await rebuildToolTrustOnCaChange(n, e, r, ccrCaCert.ccrCa);
  }
}
//@ chunk-awy329vy.js:100753-101403 placement
/**
 * 从会话代理取 CA 证书：在预算时间内多次尝试，5xx/408/429 或证书无效时重试，其他非 2xx 为致命错误，成功返回证书包。
 */
async function fetchCcrCaCert(baseUrl, { budgetMs, tries, viaStandaloneProxy = false }) {
  let signal = AbortSignal.timeout(budgetMs);
  let lastError = "";
  let retryAfter = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    retryAfter = null;
    try {
      let url = `${baseUrl}${AGENT_PROXY_PATH}/ca-cert`;
      let response = await fetch(url, {
        signal,
        ...(viaStandaloneProxy &&
          getProxyFetchOptions({
            url,
          })),
        ...getTLSFetchOptions(undefined),
      });
      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        lastError = `status ${response.status}`;
        retryAfter = response.headers.get("retry-after");
        continue;
      }
      if (!response.ok)
        return {
          outcome: "fatal",
          code: "http_error",
          detail: `ca-cert fetch ${response.status}`,
        };
      let validation = validateCaBundle(await response.text());
      if (!validation.ok) {
        lastError = CA_BUNDLE_PROBLEM_MESSAGES[validation.problem];
        continue;
      }
      return {
        outcome: "ok",
        ccrCa: validation.bundle,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return {
    outcome: "retry",
    detail: `ca-cert fetch exhausted (${lastError})`,
    retryAfter,
  };
}
//@ chunk-awy329vy.js:101403-101670 placement
async function writeCaBundle(localCa, ccrCa, caBundlePath) {
  try {
    await mkdir(join(caBundlePath, ".."), {
      recursive: true,
    });
    await writeFileAtomic(caBundlePath, joinWithNewline(localCa, ccrCa));
  } catch (error) {
    let detail = `ca-bundle write failed (${errorMessage(error)})`;
    if (isTransientError(error))
      return {
        outcome: "retry",
        detail,
        retryAfter: null,
      };
    return {
      outcome: "fatal",
      code: "write_failed",
      detail,
    };
  }
  return {
    outcome: "ok",
  };
}
//@ chunk-awy329vy.js:101670-101961 placement
async function writeAwsConfigOnce(n) {
  try {
    await mkdir(join(n, ".."), {
      recursive: true,
      mode: 448,
    });
    await writeFile(
      n,
      `[default]
s3 =
  payload_signing_enabled = false
`,
      {
        flag: "wx",
        mode: 384,
      },
    );
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    logForDebugging(
      `[agent-proxy] aws config write failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-awy329vy.js:101961-102006 placement
/**
 * 生成本机代理地址 http://127.0.0.1:<port>。
 */
function loopbackProxyUrl(port) {
  return `http://127.0.0.1:${port}`;
}
//@ chunk-awy329vy.js:102006-102038 placement
/**
 * 用换行连接两段文本。
 */
function joinWithNewline(n, e) {
  return (
    n +
    `
` +
    e
  );
}
//@ chunk-1k6d6j2b.js:263-2319 placement
/**
 * 生成 gh 包装脚本片段：已有用户令牌、非 github.com 主机或仓库/origin 指向其他主机时直接执行原 gh，否则继续走代理。
 */
function buildGhGuardScript(ghPath, allowInjectedToken = false) {
  return (
    (!allowInjectedToken
      ? `if [ -n "\${GH_TOKEN:-}\${GITHUB_TOKEN:-}\${GH_ENTERPRISE_TOKEN:-}\${GITHUB_ENTERPRISE_TOKEN:-}" ]; then
  exec '${ghPath}' "$@"
fi
`
      : `case "\${GH_TOKEN:-}" in ''|'${PROXY_INJECTED_MARKER}') ;; *) exec '${ghPath}' "$@" ;; esac
case "\${GITHUB_TOKEN:-}" in ''|'${PROXY_INJECTED_MARKER}') ;; *) exec '${ghPath}' "$@" ;; esac
if [ -n "\${GH_ENTERPRISE_TOKEN:-}\${GITHUB_ENTERPRISE_TOKEN:-}" ]; then
  exec '${ghPath}' "$@"
fi
`) +
    `host="\${GH_HOST:-}"
repo="\${GH_REPO:-}"
prev=''
for a in "$@"; do
  if [ "$prev" = '--hostname' ]; then host="$a"; prev=''; continue; fi
  if [ "$prev" = '--repo' ]; then repo="$a"; prev=''; continue; fi
  case "$a" in
    --hostname) prev='--hostname' ;;
    --hostname=*) host="\${a#--hostname=}" ;;
    -R|--repo) prev='--repo' ;;
    --repo=*) repo="\${a#--repo=}" ;;
    -R=*) repo="\${a#-R=}" ;;
    -R?*) repo="\${a#-R}" ;;
  esac
done
` +
    `# Hostnames are case-insensitive \u2014 normalize before every compare.
` +
    `host="$(printf %s "$host" | tr '[:upper:]' '[:lower:]')"
if [ -n "$host" ] && [ "$host" != '${GITHUB_HOST}' ]; then
  exec '${ghPath}' "$@"
fi
# A -R/--repo/GH_REPO [HOST/]OWNER/REPO (or URL) carries its own host
# and overrides the checkout. Otherwise repo-scoped commands resolve
` +
    `# their target from the checkout remote, not GH_HOST \u2014 treat a
` +
    `# non-github.com origin as a GHE signal. An EXPLICIT github.com host
# above skips the origin probe: it must not be kicked off the relay
# by the checkout heuristic.
rhost=''
if [ -n "$repo" ]; then
  case "$repo" in
    *://*) rhost="\${repo#*://}"; rhost="\${rhost%%/*}"; rhost="\${rhost##*@}"; rhost="\${rhost%%:*}" ;;
    */*/*) rhost="\${repo%%/*}" ;;
  esac
elif [ -z "$host" ]; then
  origin="$(git config --get remote.origin.url 2>/dev/null || true)"
  case "$origin" in
    *://*) rhost="\${origin#*://}"; rhost="\${rhost%%/*}"; rhost="\${rhost##*@}"; rhost="\${rhost%%:*}" ;;
    *@*:*) rhost="\${origin#*@}"; rhost="\${rhost%%:*}" ;;
  esac
fi
rhost="$(printf %s "$rhost" | tr '[:upper:]' '[:lower:]')"
if [ -n "$rhost" ] && [ "$rhost" != '${GITHUB_HOST}' ]; then
  exec '${ghPath}' "$@"
fi
`
  );
}
//@ chunk-hm0ce8vc.js:54310-54413 fingerprint = SYSTEM_CA_BUNDLE (0.658)
var SYSTEM_CA_BUNDLE = ["/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt"];
var MAX_SYSTEM_CA_BYTES = 1048576;
var MAX_CA_TOTAL_BYTES = 8388608;
export { SYSTEM_CA_BUNDLE, MAX_SYSTEM_CA_BYTES, MAX_CA_TOTAL_BYTES, PLACEHOLDER_CREDENTIAL_KEYS };
