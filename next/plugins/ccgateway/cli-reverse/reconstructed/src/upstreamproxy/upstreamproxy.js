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
import { PROXY_INJECTED_MARKER, inheritedByChildren } from "../utils/subprocessEnv.js";
import {
  GITHUB_HOST,
  GITHUB_SSH_PREFIXES,
  normalizeHost,
  HOST_LABEL_RE,
  isGithubDotCom,
  githubApiBase,
} from "../utils/git/githubUrl.js";
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
import {
  caCertEnvVars,
  caCertEnvVarList,
  CA_CERT_ENV_VARS_2,
  CA_CERT_ENV_VARS,
} from "../utils/settings/managedSettingsKeys.js";
import { GIT_NO_PROMPT_ENV } from "../utils/plugins/marketplaceManager.js";
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
//@ chunk-hm0ce8vc.js:54310-54413 fingerprint (2.1.88 match: SYSTEM_CA_BUNDLE, 0.658)
var SYSTEM_CA_BUNDLE = ["/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt"];
var MAX_SYSTEM_CA_BYTES = 1048576;
var MAX_CA_TOTAL_BYTES = 8388608;
//@ chunk-awy329vy.js:2175-2300 fingerprint (2.1.88 match: NO_PROXY_LIST, 0.446)
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
  activate(state, relay) {
    this.state = state;
    this.relay = relay;
    setProxyStatusUrl(`${loopbackProxyUrl(relay.port)}/__agentproxy/status`);
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
  let source;
  if (CCR_AGENT_PROXY_RELAY_MODE === AGENT_PROXY_STANDALONE_RELAY_MODE || isAgentProxyStandaloneActive()) {
    let standaloneUrl = agentProxyStandaloneProxyUrl();
    if (standaloneUrl === undefined || !isGovernedGitArmed()) {
      logForDebugging("[agent-proxy] the agent proxy standalone relay mode is set; hosted relay not started");
      return agentProxyState.state;
    }
    logForDebugging(
      "[agent-proxy] the agent proxy standalone relay mode is set; governed git goes through its forwarder, and no relay is started",
    );
    source = {
      kind: "standalone",
      proxyUrl: standaloneUrl,
    };
  } else {
    if (!env.CCR_AGENT_PROXY_ENABLED) return agentProxyState.state;
    let inToolContainer = isHttpMcpServeInvocation();
    let containerToken;
    let sessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID;
    let tokenSourceLabel = "sessionIngressAuth";
    if (inToolContainer) {
      containerToken = opts?.toolContainerToken;
      if (containerToken === undefined) {
        logForDebugging(
          "[agent-proxy] a tool container's daemon was handed no token (CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR, or agent_proxy_token with --session-tunnel); proxy disabled",
        );
        return agentProxyState.state;
      }
      sessionId = "tool-container";
      tokenSourceLabel = "the launcher";
    }
    if (!sessionId) {
      logForDebugging("[agent-proxy] CLAUDE_CODE_REMOTE_SESSION_ID unset; proxy disabled", {
        level: "warn",
      });
      logFeatureBad("agent_proxy_init", "agent_proxy_init_no_session_id");
      return agentProxyState.state;
    }
    let tokenPath = opts?.tokenPath ?? SESSION_TOKEN_PATH;
    let tokenFileResult = inToolContainer
      ? {
          existed: false,
          token: containerToken ?? null,
        }
      : await readTokenFile(tokenPath);
    let { existed, token } = tokenFileResult;
    if (!token && !inToolContainer) token = getSessionIngressAuthToken();
    if (!token) {
      logForDebugging("[agent-proxy] no session token; proxy disabled");
      logFeatureBad("agent_proxy_init", "agent_proxy_init_no_token");
      return agentProxyState.state;
    }
    logForDebugging(`[agent-proxy] token via ${existed ? tokenPath : tokenSourceLabel}`);
    disableCoreDumps((warning) =>
      logForDebugging(`[agent-proxy] ${warning}`, {
        level: "warn",
      }),
    );
    source = {
      kind: "relay",
      sessionId,
      token,
      tokenIsHandedOver: inToolContainer,
      unlinkTokenPath: existed ? tokenPath : undefined,
    };
  }
  let baseUrl = opts?.ccrBaseUrl ?? process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
  let caBundlePath =
    opts?.caBundlePath ??
    (isGovernedGitArmed()
      ? join(getClaudeConfigDir(), "ccr", "ca-bundle.crt")
      : join(homedir(), ".ccr", "ca-bundle.crt"));
  let systemCaText = opts?.systemCaPath
    ? await readFile(opts.systemCaPath, "utf8").catch(() => "")
    : await findSystemCaBundle();
  let filteredSystemCa = withoutBlockedCerts(systemCaText, "agent proxy trust") ?? "";
  let customerCa = await foldCustomerCaBundles(filteredSystemCa, caBundlePath);
  let localCa = customerCa
    ? `${filteredSystemCa}
${customerCa}`
    : filteredSystemCa;
  let envCaPem;
  if (CCR_AGENT_PROXY_CA_CERT_B64 !== undefined && isEssentialTrafficOnly())
    logForDebugging(
      "[agent-proxy] CCR_AGENT_PROXY_CA_CERT_B64 ignored: essential traffic only; fetching the CA as before",
    );
  else if (CCR_AGENT_PROXY_CA_CERT_B64 !== undefined) {
    let decodedCa = decodeCaCertEnv(CCR_AGENT_PROXY_CA_CERT_B64);
    if (decodedCa.ok) envCaPem = decodedCa.pem;
    else {
      logForDebugging(
        `[agent-proxy] CCR_AGENT_PROXY_CA_CERT_B64 ignored: ${decodedCa.reason}; fetching the CA instead`,
        {
          level: "warn",
        },
      );
      logFeatureSad("agent_proxy_init", "agent_proxy_init_ca_env_invalid");
    }
  }
  let governedGit = isGovernedGitArmed();
  let caSource = envCaPem !== undefined ? "env" : "fetch";
  let scanOptions = {
    budgetMs: opts?.pathProbeBudgetMs ?? CA_POLL_INTERVAL_MS,
    caSource,
  };
  let installedClisScan = governedGit ? undefined : sweepInstalledClis(scanOptions);
  let selectiveConfig;
  if (CCR_AGENT_PROXY_RELAY_MODE === "selective") {
    let filtered = (CCR_AGENT_PROXY_INCLUDE_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim())
      .filter((host) => host.length > 0);
    if (filtered.length > 0) {
      selectiveConfig = {
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
  let noProxyValue = NO_PROXY_LOCAL_ONLY;
  let proxyInputs = {
    runtime: agentProxyState,
    generation: agentProxyState.generation,
    route: source,
    baseUrl,
    caBundlePath,
    systemCa: systemCaText,
    localCa,
    hasSystemCa: filteredSystemCa !== "",
    governedGitTools: governedGit,
    selective: selectiveConfig,
    noProxy: CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY
      ? noProxyValue
      : selectiveConfig
        ? NO_PROXY_SELECTIVE
        : NO_PROXY_EMBEDDED,
    bundleCoversEveryHost: filteredSystemCa !== "",
    receiveGateDisabled: Boolean(CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED),
    uploadGateDisabled: Boolean(CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED),
    caWatchEnabled: Boolean(CCR_AGENT_PROXY_CA_WATCH_ENABLED),
    pathProbes: scanOptions,
    installedClisScan,
    envCa: envCaPem,
    caSource,
    opts: opts && {
      ...opts,
      toolContainerToken: undefined,
    },
  };
  recordPhase("agent_proxy_inputs_ms", performance.now() - startTime, startTime);
  let lastResult = await bringUpAgentProxy(proxyInputs, 1);
  if (source.kind === "standalone" && lastResult.outcome === "fatal")
    setAgentProxyNote(GITHUB_TLS_FAILED_TEXT);
  if (lastResult.outcome === "retry") {
    logFeatureSad("agent_proxy_init", "agent_proxy_init_ca_exhausted_retrying", {
      ca_source: fromEnum(caSource),
    });
    retryAgentProxyInBackground(proxyInputs, lastResult).catch((error) => {
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
function backgroundRetryDelayMs(attempt, maxAttempts) {
  return Math.min(getRetryDelay(attempt - 1, maxAttempts, MAX_RETRY_DELAY_MS), MAX_RETRY_DELAY_MS);
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
async function bringUpAgentProxy(plan, attempt) {
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
  } = plan;
  let recordTiming = (phaseName, phaseStart) => {
    if (attempt === 1) recordPhase(phaseName, performance.now() - phaseStart, phaseStart);
  };
  let caText;
  if (envCa !== undefined) caText = envCa;
  else {
    let startTime = performance.now();
    let result = await fetchCcrCaCert(baseUrl, {
      budgetMs: opts?.caFetchBudgetMs ?? (attempt === 1 ? 5000 : 15000),
      tries: attempt === 1 ? 3 : 1,
      viaStandaloneProxy: route.kind === "standalone",
    });
    recordTiming("agent_proxy_ca_fetch_ms", startTime);
    if (result.outcome !== "ok") return reportCaFailure(result, caSource);
    caText = result.ccrCa;
  }
  let startTime = performance.now();
  let writeResult = await writeCaBundle(localCa, caText, caBundlePath);
  if (writeResult.outcome !== "ok") {
    recordTiming("agent_proxy_trust_write_ms", startTime);
    return reportCaFailure(writeResult, caSource);
  }
  if (!governedGitTools) await writeAwsConfigOnce(opts?.awsConfigPath ?? join(homedir(), ".aws", "config"));
  recordTiming("agent_proxy_trust_write_ms", startTime);
  if (route.kind === "standalone") {
    let staleState = shouldExitAgentProxy(runtime, plan.generation);
    if (staleState)
      return staleState === "exit"
        ? {
            outcome: "stale",
          }
        : {
            outcome: "retry",
            detail: "shutdown claimed during bring-up",
            retryAfter: null,
          };
    let standaloneState = {
      enabled: true,
      caBundlePath,
      hasSystemCa,
      bundleCoversEveryHost,
      noProxy,
      selective: false,
      governedGitTools: true,
    };
    runtime.state = standaloneState;
    runtime.relay = undefined;
    let gitConfigWritten = await configureGovernedGit(
      standaloneState,
      caBundlePath,
      route,
      selective,
      pathProbes,
    );
    if (runtime.state !== standaloneState)
      return {
        outcome: "stale",
      };
    setAgentProxyGhStandin(ghStandinConfig(standaloneState));
    logForDebugging(
      `[agent-proxy] governed git routed through the agent proxy standalone forwarder (CA from ${caSource})`,
    );
    logFeatureOk("agent_proxy_init", {
      attempts: attempt,
      ca_source: fromEnum(caSource),
      standalone: true,
    });
    setAgentProxyNote(
      env.CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG && !gitConfigWritten
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
    let readmePath = agentProxyReadmePath(caBundlePath);
    let relayToken = token ?? "";
    let startTime = performance.now();
    let installedProxyPreconfiguredClis = await installedClisScan;
    let gitConfigPromise;
    let readGitConfigKeys = () =>
      (gitConfigPromise ??= readGlobalGitConfigKeys()
        .catch(() => [])
        .finally(() => {
          gitConfigPromise = undefined;
        }));
    let upstreamProxyRelay = await startUpstreamProxyRelay({
      wsUrl,
      sessionId,
      token: relayToken,
      getToken: tokenIsHandedOver ? () => relayToken : () => getSessionIngressAuthToken() || relayToken,
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
        let conflictKeys = await readGitConfigKeys();
        if (conflictKeys.length > 0)
          logForDebugging(`[agent-proxy] git config may defeat proxy routing: ${conflictKeys.join(", ")}`, {
            level: "warn",
          });
        return {
          ...runtime.state,
          ...(conflictKeys.length > 0 && {
            gitConfigConflicts: conflictKeys,
          }),
          readmePath,
          gitConfigInjection: gitConfigCountUnset(),
          gitSshRewrite: gitConfigCountUnset() && sshAuthUnset(),
        };
      },
      onFailure: recordProxyRelayEvent,
      onConnectAnswer: notePolicyRefusedHost,
    });
    let unregisterCleanup = registerCleanup(async () => upstreamProxyRelay.stop());
    let relayState = {
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
    recordTiming("agent_proxy_relay_up_ms", startTime);
    let staleState = shouldExitAgentProxy(runtime, plan.generation);
    if (staleState) {
      upstreamProxyRelay.stop();
      unregisterCleanup();
      return staleState === "exit"
        ? {
            outcome: "stale",
          }
        : {
            outcome: "retry",
            detail: "shutdown claimed during bring-up",
            retryAfter: null,
          };
    }
    runtime.activate(relayState, upstreamProxyRelay);
    if (!selective && !governedGitTools)
      setAgentProxyEndpoint({
        proxyUrl: loopbackProxyUrl(upstreamProxyRelay.port),
        gatewayCa: caText,
      });
    if (governedGitTools)
      await configureGovernedGit(
        relayState,
        caBundlePath,
        {
          kind: "relay",
          port: upstreamProxyRelay.port,
        },
        selective,
        pathProbes,
      );
    else {
      let ghShim = await installGhShim(
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
      if (ghShim) {
        relayState.ghShimDir = ghShim.shimDir;
        relayState.ghStandin = ghShim.standin;
        relayState.ghStandinEnterprise = ghShim.enterprise;
        relayState.ghStandinAnyHost = ghShim.anyHost;
        relayState.ghStandinNoJq = ghShim.noJq;
      }
    }
    if (runtime.state !== relayState)
      return {
        outcome: "stale",
      };
    upstreamProxyRelay.runStartupChecks();
    setAgentProxyGhStandin(ghStandinConfig(relayState));
    logForDebugging(`[agent-proxy] enabled on 127.0.0.1:${upstreamProxyRelay.port} (CA from ${caSource})`);
    logFeatureOk("agent_proxy_init", {
      attempts: attempt,
      ca_source: fromEnum(caSource),
    });
    setAgentProxyNote(describeProxyForPrompt(caBundlePath, undefined));
    writeFile(readmePath, buildAgentProxyReadme(upstreamProxyRelay.port, caBundlePath), "utf8")
      .then(() => {
        if (runtime.state !== relayState) return;
        setAgentProxyNote(describeProxyForPrompt(caBundlePath, readmePath));
      })
      .catch((error) => {
        logForDebugging(
          `[agent-proxy] README write failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (runtime.state !== relayState) return;
        setAgentProxyNote(describeProxyForPrompt(caBundlePath, undefined));
      });
    let recordPath = systemTrustCaPath(caBundlePath);
    let caDiffersFromRecord = false;
    if (!governedGitTools && caSource === "env") {
      let caBundleFile = await readCaBundleFile(recordPath);
      caDiffersFromRecord =
        caBundleFile.state === "read" &&
        compareCaBundles(caBundleFile.text, caText) !== "same" &&
        systemStoreHasCa(systemCa, caBundleFile.text);
    }
    let systemTrustPromise =
      governedGitTools || caDiffersFromRecord
        ? undefined
        : installCaIntoSystemTrust(plan, caText, recordPath, "start");
    let installDeferred = caDiffersFromRecord ? Promise.withResolvers() : undefined;
    let toolTrustPromise;
    let toolTrustFailed = false;
    if (opts?.toolTrust !== false && !governedGitTools)
      toolTrustPromise = configureToolTrust({
        ccrCa: caText,
        caBundlePath,
        hasSystemCa: relayState.hasSystemCa ?? false,
        stateDir: join(caBundlePath, ".."),
        systemTrust: systemTrustPromise ?? installDeferred?.promise,
        ...(opts?.toolTrust ?? {}),
      })
        .then((toolTrustResult) => {
          if (runtime.state !== relayState) return;
          carryJavaTrustStore(relayState, toolTrustResult);
          if (toolTrustResult.profileDPath) {
            let profileDPath = toolTrustResult.profileDPath;
            registerCleanup(() => unlink(profileDPath).catch(() => {}));
          }
          if (toolTrustResult.failureCodes.length > 0)
            relayState.toolTrustFailureCodes = toolTrustResult.failureCodes;
        })
        .catch((error) => {
          logForDebugging(
            `[agent-proxy] tool trust setup failed: ${error instanceof Error ? error.message : String(error)}`,
            {
              level: "warn",
            },
          );
          logFeatureSad("agent_proxy_tool_trust", "setup_threw");
          toolTrustFailed = true;
        });
    let trust = {
      ccrCa: caText,
      systemTrust: systemTrustPromise,
      toolTrust: toolTrustPromise,
      installIncomplete: false,
      installRetries: 0,
    };
    if (caWatchEnabled && !governedGitTools)
      Promise.all([systemTrustPromise, toolTrustPromise])
        .then(async ([systemTrustOutcome]) => {
          let caMatches = opts?.toolTrust === false || (await matchesAgentProxyCa(caBundlePath, caText));
          if (runtime.state === relayState && trust.ccrCa === caText)
            trust.installIncomplete =
              caDiffersFromRecord ||
              toolTrustFailed ||
              !caMatches ||
              hasTrustStoreFailure(systemTrustOutcome, relayState.toolTrustFailureCodes ?? []);
        })
        .catch(() => {});
    let embeddedEndpoint = !selective && !governedGitTools;
    let afterStart;
    if (caSource === "env")
      afterStart = reconcileAgentProxyCa(plan, relayState, caText, {
        systemTrust: systemTrustPromise,
        toolTrust: toolTrustPromise,
        installDeferred: caDiffersFromRecord,
        onInstallSettled: () => installDeferred?.resolve(),
        embeddedEndpoint,
        relayPort: upstreamProxyRelay.port,
        ...(caWatchEnabled && {
          trust,
        }),
      })
        .catch((error) => {
          logForDebugging(`[agent-proxy] CA reconcile crashed: ${errorMessage(error)}`, {
            level: "warn",
          });
          logFeatureSad("agent_proxy_ca_reconcile", "reconcile_threw");
        })
        .finally(() => installDeferred?.resolve());
    let caWatchIntervalMs = opts?.caWatchIntervalMs ?? DEFAULT_CA_WATCH_INTERVAL_MS;
    if (caWatchEnabled && !governedGitTools && caWatchIntervalMs > 0)
      watchAgentProxyCa(plan, relayState, trust, {
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
function ghStandinConfig(config) {
  return config.ghStandin
    ? proxyPromptVariant({
        enterprise: config.ghStandinEnterprise === true,
        anyHost: config.ghStandinAnyHost === true,
        noJq: config.ghStandinNoJq === true,
        runner: config.governedGitTools === true,
      })
    : undefined;
}
//@ chunk-awy329vy.js:71876-72598 placement
async function configureGovernedGit(state, caBundlePath, options, selective, budgetOptions) {
  let anyFailure = false;
  let [gitConfigWritten, ghShim] = await Promise.all([
    env.CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG
      ? writeGovernedGitConfig(options, caBundlePath).catch((error) => {
          logForDebugging(`[agent-proxy] governed git config append failed: ${errorMessage(error)}`, {
            level: "warn",
          });
          logFeatureSad("agent_proxy_tool_scoped", "git_config_append_failed");
          anyFailure = true;
          return false;
        })
      : false,
    env.CLAUDE_CODE_AGENT_PROXY_GH_SHIM
      ? installGhShim(options, caBundlePath, undefined, selective, budgetOptions).catch((error) => {
          logForDebugging(`[agent-proxy] gh shim write failed: ${errorMessage(error)}`, {
            level: "warn",
          });
          logFeatureSad("agent_proxy_tool_scoped", "gh_shim_write_failed");
          logFeatureSad("agent_proxy_gh_shim", "arm_failed");
          anyFailure = true;
          return;
        })
      : undefined,
  ]);
  if (ghShim) {
    state.ghShimDir = ghShim.shimDir;
    state.ghStandin = ghShim.standin;
    state.ghStandinEnterprise = ghShim.enterprise;
    state.ghStandinAnyHost = ghShim.anyHost;
    state.ghStandinNoJq = ghShim.noJq;
  }
  if (!anyFailure)
    logFeatureOk("agent_proxy_tool_scoped", {
      git_config: gitConfigWritten,
      gh_shim: Boolean(ghShim),
    });
  return gitConfigWritten;
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
var PLACEHOLDER_CREDENTIAL_KEYS = CREDENTIAL_PLACEHOLDER_CLIS.flatMap((cli) => Object.keys(cli.placeholders));
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
//@ chunk-awy329vy.js:73520-74962 placement (2.1.88 match: getUpstreamProxyEnv, 0.377)
/**
 * getAgentProxyEnv：代理启用时给子进程的环境变量（HTTPS_PROXY/NO_PROXY、CA 包相关变量、JAVA_TOOL_OPTIONS、gh shim 的 PATH 等）。
 */
function getAgentProxyEnv() {
  let state = getAgentProxyState().state;
  if (state.enabled && state.governedGitTools) {
    let extraEnv = {};
    if (state.ghShimDir) {
      let inheritedPath = inheritedByChildren("PATH") ?? "";
      extraEnv.PATH = inheritedPath ? `${state.ghShimDir}${delimiter}${inheritedPath}` : state.ghShimDir;
      if (state.ghStandin && inheritedPath) extraEnv.PATH = `${inheritedPath}${delimiter}${state.ghShimDir}`;
    }
    return extraEnv;
  }
  if (!state.enabled || !state.port || !state.caBundlePath) {
    if (process.env.HTTPS_PROXY && process.env.SSL_CERT_FILE) {
      let envVars = {};
      for (let key of ["HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy", ...caCertEnvVars])
        if (process.env[key]) envVars[key] = process.env[key];
      for (let envVarName of [...Object.keys(caCertEnvVarList), ...PLACEHOLDER_CREDENTIAL_KEYS]) {
        let inheritedValue = inheritedByChildren(envVarName);
        if (inheritedValue) envVars[envVarName] = inheritedValue;
      }
      return envVars;
    }
    return {};
  }
  let proxyUrl = loopbackProxyUrl(state.port);
  let envVars = {
    HTTPS_PROXY: proxyUrl,
    https_proxy: proxyUrl,
    NO_PROXY: state.noProxy,
    no_proxy: state.noProxy,
  };
  for (let envVarName of CA_CERT_ENV_VARS_2) envVars[envVarName] = state.caBundlePath;
  if (state.bundleCoversEveryHost) {
    for (let envVarName of CA_CERT_ENV_VARS) envVars[envVarName] = state.caBundlePath;
    for (let [key, value] of Object.entries(caCertEnvVarList))
      if (inheritedByChildren(key) === undefined) envVars[key] = value;
  }
  if (state.javaTrustStorePath && state.javaTrustStoreType)
    envVars.JAVA_TOOL_OPTIONS = buildJavaTrustOptions(
      state.javaTrustStorePath,
      state.javaTrustStoreType,
      readToken("JAVA_TOOL_OPTIONS"),
    );
  if (readToken("GIT_TERMINAL_PROMPT") === undefined)
    envVars.GIT_TERMINAL_PROMPT = GIT_NO_PROMPT_ENV.GIT_TERMINAL_PROMPT;
  if (readToken("GIT_ASKPASS") === undefined) envVars.GIT_ASKPASS = GIT_NO_PROMPT_ENV.GIT_ASKPASS;
  if (readToken("GCM_INTERACTIVE") === undefined) envVars.GCM_INTERACTIVE = GIT_NO_PROMPT_ENV.GCM_INTERACTIVE;
  if (gitConfigCountUnset()) {
    let gitConfigPairs = [["credential.interactive", "false"]];
    if (sshAuthUnset())
      gitConfigPairs.push(
        ...GITHUB_SSH_PREFIXES.map((sshPrefix) => [`url.https://${GITHUB_HOST}/.insteadOf`, sshPrefix]),
      );
    Object.assign(envVars, buildGitConfigEnv(undefined, gitConfigPairs));
  }
  for (let cli of CREDENTIAL_PLACEHOLDER_CLIS)
    if (!cli.realCredentialEnv.some((realCredentialVar) => inheritedByChildren(realCredentialVar)))
      Object.assign(envVars, cli.placeholders);
  if (state.ghShimDir) envVars.PATH = [readToken("PATH"), state.ghShimDir].filter(Boolean).join(delimiter);
  return envVars;
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
  let hosts = [];
  let ignoredCount = 0;
  for (let entry of CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS.split(",")) {
    let trimmed = entry.trim();
    if (trimmed === "") continue;
    let normalized = normalizeHost(trimmed);
    if (normalized === "" || normalized.length > 255 || !HOST_LABEL_RE.test(normalized)) {
      ignoredCount++;
      continue;
    }
    let host = isGithubDotCom(normalized) ? GITHUB_HOST : normalized;
    if (!hosts.includes(host)) hosts.push(host);
  }
  if (ignoredCount > 0)
    logForDebugging(
      `[agent-proxy] governed git: ignored ${ignoredCount} governed-host ${plural(ignoredCount, "entry", "entries")} that ${plural(ignoredCount, "is", "are")} not a bare hostname`,
      {
        level: "warn",
      },
    );
  return hosts;
}
//@ chunk-awy329vy.js:75764-77142 placement
/**
 * 写入受治理 git 的全局配置块（代理、CA、凭证助手）。
 */
async function writeGovernedGitConfig(state, caBundlePath) {
  let proxyUrl;
  switch (state.kind) {
    case "relay":
      proxyUrl = loopbackProxyUrl(state.port);
      break;
    case "standalone":
      proxyUrl = state.proxyUrl;
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
  if ([caBundlePath, proxyUrl].some((value) => /[\n\r"]/.test(value))) {
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
  let lines = [GIT_CONFIG_BLOCK_BEGIN];
  for (let governedGitHost of governedGitHosts) {
    lines.push(
      `[http "https://${governedGitHost}/"]`,
      `	proxy = ${proxyUrl}`,
      `	sslCAInfo = ${caBundlePath}`,
      ...(governedGitHost === GITHUB_HOST ? [] : ["\textraHeader =", "\tcookieFile ="]),
      `[credential "https://${governedGitHost}/"]`,
      ...(governedGitHost === GITHUB_HOST ? [] : ["\thelper =", `	helper = ${GIT_CREDENTIAL_QUIT_HELPER}`]),
      "\tinteractive = false",
    );
    if (governedGitHost === GITHUB_HOST && sshAuthUnset())
      lines.push(
        `[url "https://${GITHUB_HOST}/"]`,
        ...GITHUB_SSH_PREFIXES.map((sshPrefix) => `	insteadOf = ${sshPrefix}`),
      );
  }
  lines.push(GIT_CONFIG_BLOCK_END);
  let current = "";
  try {
    current = await readFile(envGitConfigGlobal, "utf8");
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let index = current.indexOf(GIT_CONFIG_BLOCK_BEGIN);
  if (index !== -1) {
    let index_2 = current.indexOf(GIT_CONFIG_BLOCK_END, index);
    current =
      index_2 !== -1
        ? current.slice(0, index) + current.slice(index_2 + GIT_CONFIG_BLOCK_END.length).replace(/^\n/, "")
        : current.slice(0, index);
  }
  let normalized =
    current.length > 0 &&
    !current.endsWith(`
`)
      ? current +
        `
`
      : current;
  await writeFileAtomic(
    envGitConfigGlobal,
    normalized +
      lines.join(`
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
async function findOnPath(name, skipDir) {
  let parts = (env.PATH ?? "").split(delimiter);
  for (let dir of parts) {
    if (!dir || dir === skipDir) continue;
    let candidatePath = join(dir, name);
    try {
      await access(candidatePath, constants.X_OK);
      if ((await stat(candidatePath)).isFile()) return candidatePath;
    } catch {}
  }
  return;
}
//@ chunk-awy329vy.js:77319-77829 placement
async function withTimeBudget(label, operation, { budgetMs, caSource }) {
  let timeoutMessage = `${label} timed out`;
  let startTime = performance.now();
  let startSample = sampleCpuAndPageFaults();
  let eventLoopLagMonitor = startEventLoopLagMonitor(LAG_SAMPLE_INTERVAL_MS);
  try {
    return {
      value: await withTimeout(operation(), budgetMs, timeoutMessage),
    };
  } catch (error) {
    let endSample = sampleCpuAndPageFaults();
    let timedOut = errorMessage(error) === timeoutMessage;
    let sanitizedErrno = sanitizeErrnoForTelemetry(error);
    return {
      failure: {
        timedOut,
        detail: timedOut ? timeoutMessage : `${label} failed (${errorMessage(error)})`,
        fields: {
          ca_source: fromEnum(caSource),
          ...(sanitizedErrno !== undefined && {
            errno: sanitizedErrno,
          }),
          elapsed_ms: Math.round(performance.now() - startTime),
          loop_lag_max_ms: Math.round(eventLoopLagMonitor.stop()),
          ...(startSample &&
            endSample && {
              cpu_delta_ms: Math.round(endSample.cpuTimeMs - startSample.cpuTimeMs),
              major_fault_delta: endSample.majorPageFaults - startSample.majorPageFaults,
            }),
        },
      },
    };
  } finally {
    eventLoopLagMonitor.stop();
  }
}
//@ chunk-awy329vy.js:77829-78185 placement
async function sweepInstalledClis(budgetOptions) {
  let found = new Set();
  let probeResult = await withTimeBudget(
    "installed-CLI PATH sweep",
    () => scanPathForExecutables(PROXIED_CLIS, found),
    budgetOptions,
  );
  if ("failure" in probeResult) {
    logForDebugging(`[agent-proxy] ${probeResult.failure.detail}; naming only the CLIs resolved so far`, {
      level: "warn",
    });
    logFeatureSad(
      "agent_proxy_init",
      probeResult.failure.timedOut ? "agent_proxy_path_probe_timeout" : "agent_proxy_path_probe_failed",
      probeResult.failure.fields,
    );
  }
  return PROXIED_CLIS.filter((cli) => found.has(cli));
}
//@ chunk-awy329vy.js:78185-78287 placement
var MAX_SHIM_BYTES = 65536;
var GH_SHIM_HEADER = `#!/bin/sh
# claude agent-proxy governed-git gh shim (auto-generated; per-session).
`;
//@ chunk-awy329vy.js:78287-78554 placement
async function readGhShim(shimPath) {
  try {
    await using handle = await open(shimPath, readOnlyNoFollowFlags());
    let handleUpTo = await readHandleUpTo(handle, MAX_SHIM_BYTES + 1);
    return handleUpTo.length > MAX_SHIM_BYTES ? "" : handleUpTo.toString("utf8");
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(
        `[agent-proxy] gh shim at ${shimPath} could not be read (${getErrnoCode(error) ?? "no error code"}); treated as not a shim`,
        {
          level: "warn",
        },
      );
    return "";
  }
}
//@ chunk-awy329vy.js:78554-78632 placement
function urlHostMatches(requestedHost, apiBase) {
  let hostname = URL.parse(githubApiBase(apiBase))?.hostname;
  return hostname !== undefined && hostMatchesSelectiveList(requestedHost, hostname);
}
//@ chunk-awy329vy.js:78632-78941 placement
async function isJqInstalled(skipDir, budgetOptions) {
  let probeResult = await withTimeBudget("jq PATH probe", () => findOnPath("jq", skipDir), budgetOptions);
  if ("failure" in probeResult) {
    logForDebugging(`[agent-proxy] ${probeResult.failure.detail}; taking jq as installed`, {
      level: "warn",
    });
    logFeatureSad(
      "agent_proxy_gh_shim",
      probeResult.failure.timedOut ? "jq_path_probe_timeout" : "jq_path_probe_failed",
      probeResult.failure.fields,
    );
    return false;
  }
  return probeResult.value === undefined;
}
//@ chunk-awy329vy.js:78941-79100 placement
function removeGhShimLater(shimPath, expectedText, removeParentDirs) {
  registerCleanup(async () => {
    if ((await readGhShim(shimPath)) !== expectedText) return;
    await unlink(shimPath).catch(() => {});
    if (removeParentDirs) {
      let parentDir = join(shimPath, "..");
      await rmdir(parentDir)
        .then(() => rmdir(join(parentDir, "..")))
        .catch(() => {});
    }
  });
}
//@ chunk-awy329vy.js:79100-82708 placement
/**
 * 为 agent 代理安装 gh 垫片（gh shim），没有 gh 时提供替身。
 */
async function installGhShim(state, caBundlePath, sessionKey, selective, budgetOptions) {
  let perSession = sessionKey !== undefined;
  let shimDir =
    sessionKey !== undefined
      ? join(caBundlePath, "..", "sessions", computeContentHash(sessionKey).slice(0, 32), "bin")
      : join(caBundlePath, "..", "bin");
  let shimPath = join(shimDir, "gh");
  let probeResult = await withTimeBudget("gh PATH probe", () => findOnPath("gh", shimDir), budgetOptions);
  if ("failure" in probeResult) {
    logForDebugging(`[agent-proxy] ${probeResult.failure.detail}; skipping gh shim`, {
      level: "warn",
    });
    if (!perSession) throw Error("gh PATH probe failed");
    logFeatureSad(
      "agent_proxy_gh_shim",
      probeResult.failure.timedOut ? "gh_path_probe_timeout" : "gh_path_probe_failed",
      probeResult.failure.fields,
    );
    return;
  }
  let ghPath = probeResult.value;
  if (ghPath && perSession) {
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
  if (!ghPath && !urlHostMatches(selective, GITHUB_HOST)) {
    logForDebugging(
      "[agent-proxy] no gh on PATH and this relay does not send GitHub API requests to the session proxy (selective mode); skipping gh shim",
    );
    logFeatureSad("agent_proxy_gh_shim", "selective_relay");
    return;
  }
  if ((env.PATH ?? "").split(delimiter).includes(shimDir)) {
    let ghShim = await readGhShim(shimPath);
    let included = ghShim.includes(` '${GH_STANDIN_FLAG}' `);
    let hasShimHeader = ghShim.startsWith(GH_SHIM_HEADER);
    let standinMode = !ghPath;
    if (standinMode ? included : hasShimHeader) {
      logForDebugging(`[agent-proxy] gh shim at ${shimPath} is the enclosing session's; left as it is`);
      logFeatureOk("agent_proxy_gh_shim", {
        standin: standinMode,
        ...(perSession && {
          hosted: true,
        }),
        inherited: true,
      });
      return {
        shimDir,
        standin: standinMode,
        enterprise: standinMode && ghShim.includes(" '--hosts="),
        anyHost: standinMode && ghShim.includes(` '${ANY_HOST_FLAG}' `),
        noJq: standinMode && (await isJqInstalled(shimDir, budgetOptions)),
      };
    }
    if (included || hasShimHeader) {
      logForDebugging(
        `[agent-proxy] gh shim at ${shimPath} is the enclosing session's, of another kind; no gh shim for this process`,
      );
      logFeatureSad("agent_proxy_gh_shim", "enclosing_shim_other_kind");
      return;
    }
  }
  let commandParts;
  if (ghPath) commandParts = [ghPath];
  else {
    let launchCommand = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    commandParts = [launchCommand.cmd, ...launchCommand.prefixArgs];
  }
  if ([caBundlePath, ...commandParts].some((part) => /['\n\r]/.test(part))) {
    logForDebugging(
      "[agent-proxy] governed git: a path or argument the gh shim would quote holds a quote or a line break; skipping gh shim",
      {
        level: "warn",
      },
    );
    logFeatureSad("agent_proxy_gh_shim", "unquotable_path");
    return;
  }
  await mkdir(shimDir, {
    recursive: true,
    mode: 448,
  });
  if (!ghPath) {
    let anyHost = perSession && selective === undefined;
    let ghesHosts = perSession
      ? []
      : getGovernedGitHosts().filter(
          (host) =>
            host !== GITHUB_HOST && !host.endsWith(GHE_HOST_SUFFIX) && urlHostMatches(selective, host),
        );
    let port;
    switch (state.kind) {
      case "relay":
        port = state.port;
        break;
      case "standalone":
        port = STANDALONE_PROXY;
        break;
    }
    let standinShimContent = describeGhStandinHosts({
      command: commandParts,
      port,
      caBundlePath,
      ghesHosts: anyHost ? ANY : ghesHosts,
    });
    await writeFileAtomic(shimPath, standinShimContent, 493);
    removeGhShimLater(shimPath, standinShimContent, perSession);
    logForDebugging(`[agent-proxy] no gh on PATH; gh stand-in shim at ${shimPath}`);
    logFeatureOk("agent_proxy_gh_shim", {
      standin: true,
      ...(perSession && {
        hosted: true,
      }),
    });
    return {
      shimDir,
      standin: true,
      enterprise: ghesHosts.length > 0,
      anyHost,
      noJq: await isJqInstalled(shimDir, budgetOptions),
    };
  }
  let standaloneCheck;
  let relayEnv;
  switch (state.kind) {
    case "relay":
      standaloneCheck = "";
      relayEnv = `HTTPS_PROXY='${loopbackProxyUrl(state.port)}' https_proxy='${loopbackProxyUrl(state.port)}' \\
`;
      break;
    case "standalone":
      standaloneCheck = buildGhProxyCheckScript();
      relayEnv = "";
      break;
  }
  let shimContent =
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
    standaloneCheck +
    `# NO_PROXY cleared: an ambient runner-host NO_PROXY covering
# github.com would make gh skip the relay and send the literal dummy
# token to the real GitHub API (hard 401).
` +
    relayEnv +
    `NO_PROXY='' no_proxy='' \\
SSL_CERT_FILE='${caBundlePath}' \\
GH_TOKEN='${PROXY_INJECTED_MARKER}' GITHUB_TOKEN='${PROXY_INJECTED_MARKER}' \\
exec '${ghPath}' "$@"
`;
  await writeFileAtomic(shimPath, shimContent, 493);
  removeGhShimLater(shimPath, shimContent, perSession);
  logForDebugging(`[agent-proxy] governed git: gh shim at ${shimPath} -> ${ghPath}`);
  logFeatureOk("agent_proxy_gh_shim", {
    standin: false,
  });
  return {
    shimDir,
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
function describeProxyForPrompt(caBundlePath, readmePath) {
  let state = getAgentProxyState().state;
  if (state.governedGitTools) {
    let readmeHint = readmePath ? `see ${readmePath} and ` : "";
    let hasStandin = state.ghStandin === true;
    let otherTrafficNote = isAgentProxyStandaloneActive()
      ? "other network traffic goes through the same proxy, and other tools that reach github.com there (curl, npm, or gh run with a GitHub token of its own) fail TLS verification: only git and gh trust that CA bundle."
      : "other network traffic uses this machine's own egress.";
    return (
      `GitHub access for git${hasStandin ? " and gh" : ""} goes through a pre-configured session proxy (CA bundle: ${caBundlePath}) via per-session git config${hasStandin ? " and a gh PATH shim" : ""}; ${otherTrafficNote} If ${hasStandin ? "git or gh fail" : "git fails"} against github.com (TLS or HTTP errors, or a transfer cut off with connection reset / unexpected disconnect), ${readmeHint}check the git config file named by $GIT_CONFIG_GLOBAL; never disable TLS verification or remove the proxy/sslCAInfo entries there.` +
      (state.ghShimDir && !hasStandin
        ? " `gh` in a Bash command is this machine's own GitHub CLI, with its own sign-in and network path."
        : "")
    );
  }
  let installedClis = (state.installedProxyPreconfiguredClis ?? []).filter(
    (cli) => !(state.ghStandin === true && cli === "gh"),
  );
  return {
    caBundlePath,
    hasReadme: readmePath !== undefined,
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
    let homeDir = homedir();
    if (homeDir && statSync(homeDir).isDirectory()) return homeDir;
    return root;
  } catch {
    return root;
  }
}
//@ chunk-awy329vy.js:84255-84538 placement
async function readGlobalGitConfigKeys() {
  let conflictKeys = new Set();
  let results = await Promise.all(
    ["--global", "--system"].map((scopeFlag) =>
      execFileNoThrowWithCwd("git", ["config", scopeFlag, "--list", "--name-only"], {
        timeout: 5000,
        preserveOutputOnError: true,
        cwd: getGitProbeCwd(),
      }),
    ),
  );
  for (let result of results) {
    if (result.code !== 0) continue;
    for (let [configKey, pattern] of GIT_CONFIG_CONFLICT_PATTERNS)
      if (pattern.test(result.stdout)) conflictKeys.add(configKey);
  }
  return [...conflictKeys];
}
//@ chunk-awy329vy.js:84538-89559 placement
/**
 * 生成写给模型/用户看的 agent 代理说明文档（本地代理地址、CA 位置、快速诊断步骤）。
 */
function buildAgentProxyReadme(port, caBundlePath) {
  let caDir = join(caBundlePath, "..");
  let proxyUrl = `http://127.0.0.1:${port}`;
  return `# Claude Code agent proxy

Outbound HTTPS from this session goes through a local proxy at ${proxyUrl}
(set via HTTPS_PROXY) which tunnels to a policy-enforcing egress proxy. TLS is
re-terminated there, so every tool must trust the CA bundle at
${caBundlePath}. The standard CA environment variables, the system trust
store (where possible), a JVM truststore, the Bazel system bazelrc, the
browser NSS store, and gsutil's boto config are already set up.

## Quick diagnosis

1. Run: curl -sS ${proxyUrl}/__agentproxy/status
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
  otherwise ${caDir}/java-truststore.p12 (password "changeit"). Confirm
  javaTrustStorePath is set in the status output before pointing a build at it
  (toolTrustFailureCodes explains why it is missing). If the image or the
  build sets its own trustStore, that one wins \u2014 import the proxy CA into it
  with
  keytool -importcert -noprompt -alias ccr-agent-proxy -file ${caDir}/agent-proxy-ca.crt -keystore <their store>
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
async function findSystemCaBundle(paths = SYSTEM_CA_BUNDLE_PATHS) {
  for (let bundlePath of paths)
    try {
      return await readFile(bundlePath, "utf8");
    } catch {}
  return "";
}
//@ chunk-awy329vy.js:89903-89918 placement
var MAX_CA_BUNDLE_BYTES_2 = 1048576;
//@ chunk-awy329vy.js:89918-90625 placement
async function foldCustomerCaBundles(systemBundle, systemBundlePath) {
  let seenPaths = new Set();
  let foldedCerts = [];
  let combined = systemBundle;
  for (let caCertEnvVar of caCertEnvVars) {
    let trimmed = process.env[caCertEnvVar]?.trim();
    if (
      !trimmed ||
      trimmed === systemBundlePath ||
      seenPaths.has(trimmed) ||
      SYSTEM_CA_BUNDLE_PATHS.includes(trimmed)
    )
      continue;
    seenPaths.add(trimmed);
    let content;
    try {
      let stats = await stat(trimmed);
      if (!stats.isFile() || stats.size > MAX_CA_BUNDLE_BYTES_2) continue;
      content = await readFile(trimmed, "utf8");
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
    let match = content.match(PEM_CERT_BLOCK_RE);
    if (!match) continue;
    let addedCount = 0;
    for (let certBlock of match) {
      if (combined.includes(certBlock)) continue;
      foldedCerts.push(certBlock);
      combined += `
${certBlock}`;
      addedCount++;
    }
    if (addedCount > 0)
      logForDebugging(
        `[agent-proxy] folded ${addedCount} customer CA cert(s) from ${caCertEnvVar} into the relay bundle`,
      );
  }
  if (foldedCerts.length === 0) return "";
  return (
    withoutBlockedCerts(
      foldedCerts.join(`
`),
      "agent proxy trust",
    ) ??
    foldedCerts.flatMap((certBlock) => withoutBlockedCerts(certBlock, "agent proxy trust") ?? []).join(`
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
function carryJavaTrustStore(state, prevState) {
  if (prevState.javaTrustStorePath && prevState.javaTrustStoreType) {
    state.javaTrustStorePath = prevState.javaTrustStorePath;
    state.javaTrustStoreType = prevState.javaTrustStoreType;
  } else if (
    state.javaTrustStorePath === prevState.retiredJavaTrustStorePath ||
    state.javaTrustStorePath === prevState.rejectedJdkStorePath
  ) {
    state.javaTrustStorePath = undefined;
    state.javaTrustStoreType = undefined;
  }
}
//@ chunk-awy329vy.js:91211-94075 placement
/**
 * 安装/刷新系统 CA 信任（处理已有证书与 -2 链接、记录安装结果）。
 */
async function installIntoSystemTrust(
  caBundleText,
  storeEntries,
  { systemCa, recordPath, timeoutMs = SYSTEM_TRUST_TIMEOUT_MS, caller },
) {
  let recordComparison = await compareBundleWithFile(recordPath, caBundleText);
  let storeHasCa = systemStoreHasCa(systemCa, caBundleText) && recordComparison !== "different";
  let recordInstall = () =>
    writeFileAtomic(recordPath, caBundleText).catch((error) => {
      logForDebugging(`[agent-proxy] could not record the system trust install: ${errorMessage(error)}`);
    });
  let failureFields = {};
  let secondCert = firstPemCertAfterDifferent(caBundleText);
  let firstCertLine = firstCertificateLine(caBundleText);
  let anyFailure = false;
  for (let { dir, name, refresh, link, direct } of storeEntries)
    try {
      let anchorPath = join(dir, name);
      let secondAnchor = link
        ? {
            path: join(dir, name.replace(/\.crt$/, "-2.crt")),
            link: link.replace(/\.pem$/, "-2.pem"),
          }
        : undefined;
      let secondAnchorRead =
        secondAnchor === undefined ? undefined : await readCaBundleFile(secondAnchor.path);
      let secondAnchorMissing = secondAnchorRead === undefined || secondAnchorRead.state === "missing";
      let oldLayout = secondAnchor !== undefined && secondCert !== undefined && secondAnchorMissing;
      let anchorRead = storeHasCa ? await readCaBundleFile(anchorPath) : undefined;
      if (anchorRead?.state === "read") {
        let comparison = compareCaBundles(anchorRead.text, caBundleText);
        if (
          secondAnchorMissing
            ? comparison === "same" && recordComparison === "same"
            : comparison !== "different" &&
              secondAnchorRead?.state === "read" &&
              compareCaBundles(secondAnchorRead.text, firstCertificateLine(anchorRead.text)) === "same"
        ) {
          logForDebugging(
            `[agent-proxy] CA already in the system trust store${comparison === "swapped" ? ", its two certificates in the other order" : ""}; install skipped`,
          );
          if (recordComparison === "swapped") await recordInstall();
          logFeatureOk("agent_proxy_system_trust", {
            reused: true,
            ...(oldLayout && {
              old_layout: true,
            }),
            ...(recordComparison === "swapped" && {
              swapped: true,
            }),
          });
          return anyFailure ? "failed" : "reused";
        }
      }
      let anchorPresent = false;
      if (direct && link && secondAnchorMissing) {
        let deadlineMs = Date.now() + timeoutMs;
        let secondAttempt = false;
        let attemptResult = await installSystemCaDirect(caBundleText, {
          anchorPath,
          link,
          layout: direct,
          recordPath,
          timeoutMs,
        });
        let javaStore = attemptResult.outcome === "installed" ? attemptResult.javaStore : undefined;
        if (attemptResult.outcome === "installed" && secondCert !== undefined && secondAnchor) {
          secondAttempt = true;
          attemptResult = await installSystemCaDirect(firstCertLine, {
            anchorPath: secondAnchor.path,
            link: secondAnchor.link,
            layout: direct,
            recordPath,
            timeoutMs: Math.max(1, deadlineMs - Date.now()),
          });
        }
        switch (attemptResult.outcome) {
          case "installed":
            await recordInstall();
            logForDebugging("[agent-proxy] CA installed to system trust directly");
            logFeatureOk("agent_proxy_system_trust", {
              reused: false,
              method: fromEnum("direct"),
              ...(javaStore && {
                java_store: fromEnum(javaStore),
              }),
              ...(secondAttempt &&
                attemptResult.javaStore && {
                  second_anchor_java_store: fromEnum(attemptResult.javaStore),
                }),
            });
            return anyFailure ? "failed" : "installed";
          case "hook_incomplete":
            logFeatureSad("agent_proxy_system_trust", "hook_incomplete");
            return "failed";
          case "abandoned": {
            let step = attemptResult.step;
            failureFields = {
              direct_failed_step: fromEnum(step),
            };
            break;
          }
          case "not_attempted": {
            let skipReason = fromEnum(attemptResult.reason);
            failureFields = secondAttempt
              ? {
                  second_anchor_direct_skipped: skipReason,
                }
              : {
                  direct_skipped: skipReason,
                };
            anchorPresent = !secondAttempt && attemptResult.reason === "anchor_present";
            break;
          }
        }
      } else if (direct && link) {
        failureFields = {
          direct_skipped: fromEnum("anchor_present"),
        };
        anchorPresent = true;
      }
      if (anchorPresent) {
        let anchorReadForFields = anchorRead ?? (await readCaBundleFile(anchorPath));
        failureFields = {
          ...failureFields,
          record_match: fromEnum(describeReadState(await readCaBundleFile(recordPath), caBundleText)),
          store_has_ca: systemStoreHasCa(systemCa, caBundleText),
          anchor_match: fromEnum(describeReadState(anchorReadForFields, caBundleText)),
          ...(secondAnchorRead && {
            second_anchor_match: fromEnum(
              describeReadState(
                secondAnchorRead,
                anchorReadForFields.state === "read"
                  ? firstCertificateLine(anchorReadForFields.text)
                  : firstCertLine,
              ),
            ),
          }),
          ...(caller && {
            caller: fromEnum(caller),
          }),
        };
      }
      await writeFile(anchorPath, caBundleText, "utf8");
      await unlink(recordPath).catch(() => {});
      if (secondAnchor && (secondCert !== undefined || !secondAnchorMissing)) {
        await writeFile(secondAnchor.path, firstCertLine, "utf8");
        await unlink(secondAnchor.link).catch(() => {});
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
          (spawnError) => resolve(spawnError ? (isENOENT(spawnError) ? 127 : 1) : 0),
        );
      });
      if (promise === 0) {
        await recordInstall();
        logForDebugging(`[agent-proxy] CA installed to system trust via ${refresh[0]}`);
        logFeatureOk("agent_proxy_system_trust", {
          reused: false,
          method: fromEnum("refresh"),
          ...failureFields,
        });
        return anyFailure ? "failed" : "installed";
      }
      anyFailure = true;
      logForDebugging(`[agent-proxy] ${refresh[0]} exited ${promise}; falling back to env-var trust`, {
        level: "warn",
      });
    } catch (error) {
      if (isENOENT(error)) continue;
      anyFailure = true;
      logForDebugging(
        `[agent-proxy] system trust install via ${dir} failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "warn",
        },
      );
    }
  if (storeEntries.length > 0) logFeatureSad("agent_proxy_system_trust", "unavailable", failureFields);
  return anyFailure ? "failed" : "no_store";
}
//@ chunk-awy329vy.js:94075-94180 placement
function describeReadState(readResult, referenceText) {
  if (readResult.state === "read") return compareCaBundles(readResult.text, referenceText);
  return readResult.state === "failed" ? "read_failed" : readResult.state;
}
//@ chunk-awy329vy.js:94180-94244 placement
function firstCertificateLine(certificateText) {
  return `${firstPemCertAfterDifferent(certificateText) ?? certificateText.match(PEM_CERT_BLOCK_RE)?.[0] ?? certificateText.trimEnd()}
`;
}
//@ chunk-awy329vy.js:94244-94299 placement
function isParsableCertificate(pem) {
  try {
    new X509Certificate(pem);
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
function validateCaBundle(bundleText) {
  if (bundleText.length > MAX_CA_RESPONSE_BYTES)
    return {
      ok: false,
      problem: "oversized",
    };
  let match = bundleText.match(PEM_CERT_BLOCK_RE);
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
  if (bundleText.replace(PEM_CERT_BLOCK_RE, "").includes("-----BEGIN"))
    return {
      ok: false,
      problem: "stray_marker",
    };
  return {
    ok: true,
    bundle: bundleText,
  };
}
//@ chunk-awy329vy.js:94937-95018 placement
/**
 * 系统信任库是否已包含给定 PEM 里的全部证书。
 */
function systemStoreHasCa(systemCa, caText) {
  let match = caText.match(PEM_CERT_BLOCK_RE);
  return match !== null && match.every((certBlock) => systemCa.includes(certBlock));
}
//@ chunk-awy329vy.js:95018-95209 fingerprint (2.1.88 match: downloadCaBundle, 0.321)
function reportCaFailure(result, caSource) {
  if (result.outcome === "retry") return result;
  logForDebugging(`[agent-proxy] ${result.detail}; proxy disabled`, {
    level: "warn",
  });
  logFeatureBad("agent_proxy_init", `agent_proxy_init_ca_${result.code}`, {
    ca_source: fromEnum(caSource),
  });
  return result;
}
//@ chunk-awy329vy.js:95209-95222 placement
/**
 * 读取 CA 文件时的大小上限（64 KiB）。
 */
var MAX_CA_FILE_READ_BYTES = 65536;
//@ chunk-awy329vy.js:95222-95547 placement
function decodeCaCertEnv(value) {
  let trimmed = value.trim();
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
async function matchesAgentProxyCa(caBundlePath, caText) {
  return (
    (await compareBundleWithFile(join(caBundlePath, "..", "agent-proxy-ca.crt"), caText)) !== "different"
  );
}
//@ chunk-awy329vy.js:95747-95809 placement
/**
 * 安装失败或有信任库未生效时返回 true。
 */
function hasTrustStoreFailure(systemTrustOutcome, failureCodes) {
  return (
    systemTrustOutcome === "failed" ||
    failureCodes.some((failureCode) => NSS_OR_JAVA_FAILURE_RE.test(failureCode))
  );
}
//@ chunk-awy329vy.js:95809-95966 placement
function installCaIntoSystemTrust(plan, caText, recordPath, caller, onSettled, systemCa = plan.systemCa) {
  return installIntoSystemTrust(caText, plan.opts?.systemTrustTargets ?? SYSTEM_TRUST_STORES, {
    systemCa,
    recordPath,
    caller,
  })
    .catch(() => "failed")
    .then((outcome) => {
      onSettled?.();
      return outcome;
    });
}
//@ chunk-awy329vy.js:95966-98306 placement
async function reconcileAgentProxyCa(
  plan,
  runtimeState,
  previousCa,
  { systemTrust, toolTrust, installDeferred, onInstallSettled, embeddedEndpoint, relayPort, trust },
) {
  let { runtime, baseUrl, localCa, caBundlePath, governedGitTools, opts } = plan;
  let recordPath = systemTrustCaPath(caBundlePath);
  let deferredInstall = installDeferred;
  let runInstall = (caText) => {
    let caller = deferredInstall ? "deferred" : "reconcile";
    deferredInstall = false;
    let installPromise = installCaIntoSystemTrust(plan, caText, recordPath, caller, onInstallSettled);
    if (trust) trust.systemTrust = installPromise;
    return installPromise;
  };
  let now = Date.now();
  let retryLogged = false;
  let fetchResult;
  for (let idx = 1; ; idx++) {
    if (idx > 1) {
      let retryableResult = fetchResult?.outcome === "retry" ? fetchResult : undefined;
      await sleep(
        opts?.retryDelayMs?.(idx) ?? backgroundRetryDelayMs(idx, retryableResult?.retryAfter ?? null),
        undefined,
        {
          unref: true,
        },
      );
    }
    if (runtime.state !== runtimeState) return;
    if (isEssentialTrafficOnly()) {
      if (deferredInstall) await runInstall(previousCa);
      return;
    }
    fetchResult = await fetchCcrCaCert(baseUrl, {
      budgetMs: opts?.caFetchBudgetMs ?? 15000,
      tries: 1,
    });
    if (fetchResult.outcome !== "retry") break;
    onInstallSettled();
    if (deferredInstall && idx >= CA_INSTALL_MAX_ATTEMPTS) {
      if (runtime.state !== runtimeState) return;
      await runInstall(previousCa);
    }
    if (!retryLogged && Date.now() - now >= (opts?.retryBadAfterMs ?? RETRY_BAD_AFTER_MS)) {
      retryLogged = true;
      logForDebugging(
        `[agent-proxy] CA reconcile: ${fetchResult.detail}; still failing after ${idx} attempts, retrying anyway`,
        {
          level: "warn",
        },
      );
      logFeatureSad("agent_proxy_ca_reconcile", "fetch_still_failing");
    }
  }
  if (runtime.state !== runtimeState || fetchResult === undefined) return;
  if (fetchResult.outcome !== "ok") {
    logForDebugging(
      `[agent-proxy] CA reconcile: ${fetchResult.detail}; the bundle keeps the environment's CA`,
      {
        level: "warn",
      },
    );
    logFeatureSad("agent_proxy_ca_reconcile", "fetch_http_error");
    if (deferredInstall) await runInstall(previousCa);
    return;
  }
  let comparison = compareCaBundles(fetchResult.ccrCa, previousCa);
  if (comparison === "same") {
    logFeatureOk("agent_proxy_ca_reconcile", {
      changed: false,
    });
    if (deferredInstall) await runInstall(previousCa);
    return;
  }
  let writeResult = await writeCaBundle(localCa, fetchResult.ccrCa, caBundlePath);
  if (writeResult.outcome !== "ok") {
    logForDebugging(
      `[agent-proxy] CA reconcile: ${writeResult.detail}; the bundle keeps the environment's CA`,
      {
        level: "warn",
      },
    );
    logFeatureSad("agent_proxy_ca_reconcile", "write_failed");
    if (deferredInstall && runtime.state === runtimeState) await runInstall(fetchResult.ccrCa);
    return;
  }
  if (trust) {
    trust.ccrCa = fetchResult.ccrCa;
    trust.systemTrust = undefined;
    trust.installIncomplete = true;
  }
  if (runtime.state !== runtimeState) return;
  logForDebugging(
    `[agent-proxy] CA reconcile: the served CA differs from the environment${comparison === "swapped" ? " (the same two certificates, in the other order)" : ""}; bundle rewritten`,
  );
  logFeatureOk("agent_proxy_ca_reconcile", {
    changed: true,
    ...(comparison === "swapped" && {
      swapped: true,
    }),
  });
  if (embeddedEndpoint)
    setAgentProxyEndpoint({
      proxyUrl: loopbackProxyUrl(relayPort),
      gatewayCa: fetchResult.ccrCa,
    });
  if (governedGitTools) return;
  await systemTrust;
  if (runtime.state !== runtimeState) return;
  let systemTrustResult = runInstall(fetchResult.ccrCa);
  await systemTrustResult;
  if (opts?.toolTrust === false || runtime.state !== runtimeState) return;
  await toolTrust;
  if (runtime.state !== runtimeState) return;
  await configureToolTrust({
    ccrCa: fetchResult.ccrCa,
    caBundlePath,
    hasSystemCa: runtimeState.hasSystemCa ?? false,
    stateDir: join(caBundlePath, ".."),
    systemTrust: systemTrustResult,
    ...(opts?.toolTrust ?? {}),
  })
    .then((toolTrustResult) => {
      if (runtime.state !== runtimeState) return;
      carryJavaTrustStore(runtimeState, toolTrustResult);
      runtimeState.toolTrustFailureCodes =
        toolTrustResult.failureCodes.length > 0 ? toolTrustResult.failureCodes : undefined;
    })
    .catch((error) => {
      logForDebugging(`[agent-proxy] CA reconcile: tool trust rebuild failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("agent_proxy_ca_reconcile", "tool_trust_rebuild_threw");
    });
}
//@ chunk-awy329vy.js:98306-99268 placement
function rebuildToolTrustOnCaChange(plan, runtimeState, trust, caText) {
  let { runtime, caBundlePath, opts } = plan;
  let recordPath = systemTrustCaPath(caBundlePath);
  let { systemTrust, toolTrust } = trust;
  let failureCodes = [];
  let toolTrustFailed = false;
  let systemTrustPromise = (async () => {
    await systemTrust;
    if (runtime.state !== runtimeState) return;
    let systemCa = opts?.systemCaPath
      ? await readFile(opts.systemCaPath, "utf8").catch(() => "")
      : await findSystemCaBundle();
    let systemTrustOutcome = await systemTrust;
    if (systemTrustOutcome === "failed" || systemTrustOutcome === undefined)
      await unlink(recordPath).catch(() => {});
    return installCaIntoSystemTrust(plan, caText, recordPath, "watch", undefined, systemCa);
  })();
  let toolTrustPromise = (async () => {
    await systemTrustPromise;
    if (opts?.toolTrust === false || runtime.state !== runtimeState) return;
    await toolTrust;
    if (runtime.state !== runtimeState) return;
    await configureToolTrust({
      ccrCa: caText,
      caBundlePath,
      hasSystemCa: runtimeState.hasSystemCa ?? false,
      stateDir: join(caBundlePath, ".."),
      systemTrust: systemTrustPromise,
      ...(opts?.toolTrust ?? {}),
    })
      .then((toolTrustResult) => {
        if (runtime.state !== runtimeState) return;
        carryJavaTrustStore(runtimeState, toolTrustResult);
        runtimeState.toolTrustFailureCodes =
          toolTrustResult.failureCodes.length > 0 ? toolTrustResult.failureCodes : undefined;
        failureCodes = toolTrustResult.failureCodes;
      })
      .catch((error) => {
        logForDebugging(`[agent-proxy] CA watch: tool trust rebuild failed: ${errorMessage(error)}`, {
          level: "warn",
        });
        toolTrustFailed = true;
      });
  })().then(async () => {
    if (runtime.state !== runtimeState) return;
    let caMatches = opts?.toolTrust === false || (await matchesAgentProxyCa(caBundlePath, caText));
    let installIncomplete =
      toolTrustFailed || !caMatches || hasTrustStoreFailure(await systemTrustPromise, failureCodes);
    if (runtime.state === runtimeState) trust.installIncomplete = installIncomplete;
  });
  trust.ccrCa = caText;
  trust.systemTrust = systemTrustPromise;
  trust.toolTrust = toolTrustPromise;
  return toolTrustPromise;
}
//@ chunk-awy329vy.js:99268-100753 placement
async function watchAgentProxyCa(
  plan,
  runtimeState,
  trust,
  { intervalMs, afterStart, embeddedEndpoint, relayPort },
) {
  let { runtime, baseUrl, localCa, caBundlePath, opts } = plan;
  await afterStart;
  let watchFailureLogged = false;
  let reportWatchFailure = (detail, failureCode) => {
    logForDebugging(`[agent-proxy] CA watch: ${detail}; checking again later`);
    if (!watchFailureLogged) {
      watchFailureLogged = true;
      logFeatureSad("agent_proxy_ca_watch", failureCode);
    }
  };
  for (;;) {
    await sleep(intervalMs, undefined, {
      unref: true,
    });
    if (runtime.state !== runtimeState || isCleanupStarted() || isEssentialTrafficOnly()) return;
    let ccrCaCert = await fetchCcrCaCert(baseUrl, {
      budgetMs: opts?.caFetchBudgetMs ?? 15000,
      tries: 1,
    });
    if (runtime.state !== runtimeState) return;
    if (ccrCaCert.outcome !== "ok") {
      reportWatchFailure(
        ccrCaCert.detail,
        ccrCaCert.outcome === "retry" ? "fetch_failed" : "fetch_http_error",
      );
      continue;
    }
    if (!parseCaBundle(ccrCaCert.ccrCa).ok) {
      reportWatchFailure("the served CA does not parse", "unparsable");
      continue;
    }
    let comparison = compareCaBundles(ccrCaCert.ccrCa, trust.ccrCa);
    if (comparison === "same") {
      watchFailureLogged = false;
      if (!trust.installIncomplete) continue;
      if (trust.installRetries >= CA_INSTALL_RETRIES) {
        logForDebugging(
          `[agent-proxy] CA watch: a trust store did not take the CA after ${CA_INSTALL_RETRIES} more tries; leaving it until the CA changes`,
          {
            level: "warn",
          },
        );
        logFeatureSad("agent_proxy_ca_watch", "install_incomplete");
        trust.installIncomplete = false;
        continue;
      }
      trust.installRetries++;
      logForDebugging("[agent-proxy] CA watch: trust stores refreshing again for the CA the bundle holds");
      await rebuildToolTrustOnCaChange(plan, runtimeState, trust, ccrCaCert.ccrCa);
      continue;
    }
    let writeResult = await writeCaBundle(localCa, ccrCaCert.ccrCa, caBundlePath);
    if (writeResult.outcome !== "ok") {
      reportWatchFailure(writeResult.detail, "write_failed");
      continue;
    }
    watchFailureLogged = false;
    trust.installRetries = 0;
    if (runtime.state !== runtimeState) return;
    logForDebugging(
      `[agent-proxy] CA watch: the served CA changed${comparison === "swapped" ? " (the same two certificates, in the other order)" : ""}; bundle rewritten, trust stores refreshing`,
    );
    logFeatureOk("agent_proxy_ca_watch", {
      changed: true,
      ...(comparison === "swapped" && {
        swapped: true,
      }),
    });
    if (embeddedEndpoint)
      setAgentProxyEndpoint({
        proxyUrl: loopbackProxyUrl(relayPort),
        gatewayCa: ccrCaCert.ccrCa,
      });
    await rebuildToolTrustOnCaChange(plan, runtimeState, trust, ccrCaCert.ccrCa);
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
async function writeAwsConfigOnce(configPath) {
  try {
    await mkdir(join(configPath, ".."), {
      recursive: true,
      mode: 448,
    });
    await writeFile(
      configPath,
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
function joinWithNewline(left, right) {
  return (
    left +
    `
` +
    right
  );
}
export {
  SYSTEM_CA_BUNDLE,
  MAX_SYSTEM_CA_BYTES,
  MAX_CA_TOTAL_BYTES,
  PLACEHOLDER_CREDENTIAL_KEYS,
  NO_PROXY_ANT_ONLY,
  NO_PROXY_COMMON,
  NO_PROXY_EMBEDDED,
  NO_PROXY_LOCAL_ONLY,
  NO_PROXY_SELECTIVE,
  SESSION_TOKEN_PATH,
  agentProxies,
  backgroundRetryDelayMs,
  decodeCaCertEnv,
  findSystemCaBundle,
  getAgentProxyEnv,
  getGhStandinDir,
  getRunningRelayForGit,
  initAgentProxy,
  installIntoSystemTrust,
  systemStoreHasCa,
  validateCaBundle,
};
