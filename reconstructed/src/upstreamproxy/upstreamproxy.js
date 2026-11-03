/**
 * upstreamproxy/upstreamproxy.ts
 *
 * CCR 容器上游代理初始化：读令牌文件描述符、起中继、设置 HTTPS_PROXY/NO_PROXY/CA 包与 gh 替身环境
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/upstreamproxy/upstreamproxy.ts
 * pieces: chunk-awy329vy.js (68), chunk-hm0ce8vc.js (1)
 * attribution: fingerprint 3, placement 66
 */
import { join, join as join_2, join as join_3, join as join_4, delimiter, parse } from "path";
import { homedir, homedir as homedir_2, tmpdir } from "os";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  writeFile,
  writeFile as writeFile_2,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  access,
  stat,
  stat as stat_2,
  stat as stat_3,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  rmdir,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
} from "fs/promises";
import { constants, constants as constants_2, constants as constants_3, statSync } from "fs";
import { execFile } from "child_process";
import {
  X509Certificate,
  X509Certificate as X509Certificate_2,
  X509Certificate as X509Certificate_3,
  X509Certificate as X509Certificate_4,
} from "crypto";
import { f$o, startUpstreamProxyRelay, rVs, notePolicyRefusedHost, nt } from "./relay.js";
import { q1t, KUr, h$o, proxyPromptVariant, PROXIED_CLIS } from "../constants/agentProxyPrompt.js";
import { Mir } from "../utils/agentProxy/agentProxyState.js";
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
import { Br } from "../utils/startupTiming.js";
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
import { Dto } from "../services/ccrAgentProxy/agentProxy.js";
import { readCaBundleFile, compareCaBundles, Se, parseCaBundle } from "./caBundle.js";
import { configureToolTrust, buildJavaTrustOptions, Ee } from "./toolTrust.js";
import { PROXY_INJECTED_MARKER, inheritedByChildren } from "../utils/subprocessEnv.js";
import { Gle, wve, CA_CERT_ENV_VARS, q_r } from "../utils/settings/managedSettingsKeys.js";
import { GIT_NO_PROMPT_ENV } from "../utils/plugins/marketplaceManager.js";
import {
  Fys,
  GITHUB_HOST,
  normalizeHost,
  Nut,
  isGithubDotCom,
  githubApiBase,
} from "../utils/git/githubUrl.js";
import { buildGitConfigEnv } from "../utils/gitSafeExec.js";
import { plural } from "../utils/stringUtils.js";
import { writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { sampleCpuAndPageFaults } from "../utils/eventLoopStallDetector.js";
import { startEventLoopLagMonitor, bjn } from "../utils/eventLoopLag.js";
import { $c } from "../utils/platformTargets.js";
import { readHandleUpTo } from "../utils/fsOperations.js";
import { computeContentHash } from "../utils/commitAttribution.js";
import {
  Abi,
  ANY_HOST_FLAG,
  D5e,
  STANDALONE_PROXY,
  describeGhStandinHosts,
  ANY,
  buildGhProxyCheckScript,
} from "../utils/agentProxy/ghStandin.js";
import { getLaunchCommand } from "../utils/deepLink/registerProtocol.js";
import { buildGhGuardScript } from "./_new/buildGhGuardScript.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { PEM_CERT_BLOCK_RE, getTLSFetchOptions } from "../utils/mtls.js";
import { DEBIAN_CA_PATHS, installSystemCaDirect } from "./systemTrust.js";
import { Nd } from "../utils/toolCgroup.js";
import { getProxyFetchOptions } from "../utils/proxy.js";
import { SSr } from "../utils/fsSafety/hardenedRead.js";

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
var SESSION_TOKEN_PATH = "/run/ccr/session_token",
  yr = ["/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt", "/etc/ssl/cert.pem"],
  NO_PROXY_COMMON = [
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
  ],
  NO_PROXY_EMBEDDED = [
    ...NO_PROXY_COMMON,
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "100.64.0.0/10",
    ".svc.cluster.local",
    "*.svc.cluster.local",
  ].join(","),
  NO_PROXY_SELECTIVE = [
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
  ].join(","),
  NO_PROXY_LOCAL_ONLY = [
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
  ].join(","),
  NO_PROXY_ANT_ONLY = ["169.254.0.0/16", ".svc.cluster.local", "*.svc.cluster.local"].join(",");
//@ chunk-awy329vy.js:61021-61316 placement
class AgentProxyRuntime {
  state = { enabled: !1, noProxy: NO_PROXY_EMBEDDED };
  relay = void 0;
  generation = 0;
  activate(n, e) {
    ((this.state = n), (this.relay = e), f$o(`${ce(e.port)}/__agentproxy/status`));
  }
  reset() {
    (this.generation++,
      (this.state = { enabled: !1, noProxy: NO_PROXY_EMBEDDED }),
      q1t(void 0),
      KUr(void 0),
      Mir(void 0),
      f$o(void 0),
      this.relay?.stop(),
      (this.relay = void 0));
  }
}
//@ chunk-awy329vy.js:61316-61342 placement
var agentProxies = new HostScoped(() => new AgentProxyRuntime());
//@ chunk-awy329vy.js:61342-61380 placement
function Pe() {
  return agentProxies.of(getRootSession().host);
}
/**
 * agent 代理初始化：读取并清除 CCR_AGENT_PROXY_* 环境变量，决定中继模式、包含主机、CA 监视等。
 */
//@ chunk-awy329vy.js:61380-65296 placement
async function initAgentProxy(opts) {
  let e = Pe();
  (env.unset("AGENT_PROXY_URL"), env.unset("AGENT_PROXY_AUTH_TOKEN"));
  let CCR_AGENT_PROXY_RELAY_MODE = env.CCR_AGENT_PROXY_RELAY_MODE,
    CCR_AGENT_PROXY_INCLUDE_HOSTS = env.CCR_AGENT_PROXY_INCLUDE_HOSTS,
    CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED = env.CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED,
    CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED = env.CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED,
    CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY = env.CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY,
    CCR_AGENT_PROXY_CA_WATCH_ENABLED = env.CCR_AGENT_PROXY_CA_WATCH_ENABLED,
    CCR_AGENT_PROXY_CA_CERT_B64 = env.CCR_AGENT_PROXY_CA_CERT_B64;
  if (
    (env.unset("CCR_AGENT_PROXY_RELAY_MODE"),
    env.unset("CCR_AGENT_PROXY_INCLUDE_HOSTS"),
    env.unset("CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED"),
    env.unset("CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED"),
    env.unset("CCR_AGENT_PROXY_CA_CERT_B64"),
    !isEnvTruthy(process.env.CLAUDE_CODE_REMOTE))
  )
    return e.state;
  let startTime = performance.now(),
    w;
  if (CCR_AGENT_PROXY_RELAY_MODE === AGENT_PROXY_STANDALONE_RELAY_MODE || isAgentProxyStandaloneActive()) {
    let D = agentProxyStandaloneProxyUrl();
    if (D === void 0 || !isGovernedGitArmed())
      return (
        logForDebugging(
          "[agent-proxy] the agent proxy standalone relay mode is set; hosted relay not started",
        ),
        e.state
      );
    (logForDebugging(
      "[agent-proxy] the agent proxy standalone relay mode is set; governed git goes through its forwarder, and no relay is started",
    ),
      (w = { kind: "standalone", proxyUrl: D }));
  } else {
    if (!env.CCR_AGENT_PROXY_ENABLED) return e.state;
    let D = isHttpMcpServeInvocation(),
      F,
      sessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID,
      K = "sessionIngressAuth";
    if (D) {
      if (((F = opts?.toolContainerToken), F === void 0))
        return (
          logForDebugging(
            "[agent-proxy] a tool container's daemon was handed no token (CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR, or agent_proxy_token with --session-tunnel); proxy disabled",
          ),
          e.state
        );
      ((sessionId = "tool-container"), (K = "the launcher"));
    }
    if (!sessionId)
      return (
        logForDebugging("[agent-proxy] CLAUDE_CODE_REMOTE_SESSION_ID unset; proxy disabled", {
          level: "warn",
        }),
        logFeatureBad("agent_proxy_init", "agent_proxy_init_no_session_id"),
        e.state
      );
    let H = opts?.tokenPath ?? SESSION_TOKEN_PATH,
      le = D ? { existed: !1, token: F ?? null } : await readTokenFile(H),
      { existed: existed, token: token } = le;
    if (!token && !D) token = getSessionIngressAuthToken();
    if (!token)
      return (
        logForDebugging("[agent-proxy] no session token; proxy disabled"),
        logFeatureBad("agent_proxy_init", "agent_proxy_init_no_token"),
        e.state
      );
    (logForDebugging(`[agent-proxy] token via ${existed ? H : K}`),
      disableCoreDumps((ke) => logForDebugging(`[agent-proxy] ${ke}`, { level: "warn" })),
      (w = {
        kind: "relay",
        sessionId: sessionId,
        token: token,
        tokenIsHandedOver: D,
        unlinkTokenPath: existed ? H : void 0,
      }));
  }
  let T = opts?.ccrBaseUrl ?? process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
    S =
      opts?.caBundlePath ??
      (isGovernedGitArmed()
        ? join(getClaudeConfigDir(), "ccr", "ca-bundle.crt")
        : join(homedir(), ".ccr", "ca-bundle.crt")),
    x = opts?.systemCaPath
      ? await readFile(opts.systemCaPath, "utf8").catch(() => "")
      : await findSystemCaBundle(),
    b = withoutBlockedCerts(x, "agent proxy trust") ?? "",
    C = await foldCustomerCaBundles(b, S),
    v = C
      ? `${b}
${C}`
      : b,
    P;
  if (CCR_AGENT_PROXY_CA_CERT_B64 !== void 0 && isEssentialTrafficOnly())
    logForDebugging(
      "[agent-proxy] CCR_AGENT_PROXY_CA_CERT_B64 ignored: essential traffic only; fetching the CA as before",
    );
  else if (CCR_AGENT_PROXY_CA_CERT_B64 !== void 0) {
    let D = decodeCaCertEnv(CCR_AGENT_PROXY_CA_CERT_B64);
    if (D.ok) P = D.pem;
    else
      (logForDebugging(
        `[agent-proxy] CCR_AGENT_PROXY_CA_CERT_B64 ignored: ${D.reason}; fetching the CA instead`,
        { level: "warn" },
      ),
        logFeatureSad("agent_proxy_init", "agent_proxy_init_ca_env_invalid"));
  }
  let E = isGovernedGitArmed(),
    A = P !== void 0 ? "env" : "fetch",
    M = { budgetMs: opts?.pathProbeBudgetMs ?? CA_POLL_INTERVAL_MS, caSource: A },
    R = E ? void 0 : sweepInstalledClis(M),
    I;
  if (CCR_AGENT_PROXY_RELAY_MODE === "selective") {
    let filtered = (CCR_AGENT_PROXY_INCLUDE_HOSTS ?? "")
      .split(",")
      .map((F) => F.trim())
      .filter((F) => F.length > 0);
    if (filtered.length > 0)
      ((I = { includeHosts: filtered }),
        logForDebugging(
          `[agent-proxy] selective relay: ${filtered.length} include hosts; unlisted use normal networking`,
        ));
    else
      (logForDebugging(
        "[agent-proxy] CCR_AGENT_PROXY_RELAY_MODE=selective but include-host " +
          "list is empty/unparsable \u2014 FAIL-CLOSED to tunnel-all",
        { level: "warn" },
      ),
        logFeatureSad("agent_proxy_init", "agent_proxy_selective_empty_include"));
  }
  let Y = NO_PROXY_LOCAL_ONLY,
    X = {
      runtime: e,
      generation: e.generation,
      route: w,
      baseUrl: T,
      caBundlePath: S,
      systemCa: x,
      localCa: v,
      hasSystemCa: b !== "",
      governedGitTools: E,
      selective: I,
      noProxy: CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY ? Y : I ? NO_PROXY_SELECTIVE : NO_PROXY_EMBEDDED,
      bundleCoversEveryHost: b !== "",
      receiveGateDisabled: Boolean(CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED),
      uploadGateDisabled: Boolean(CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED),
      caWatchEnabled: Boolean(CCR_AGENT_PROXY_CA_WATCH_ENABLED),
      pathProbes: M,
      installedClisScan: R,
      envCa: P,
      caSource: A,
      opts: opts && { ...opts, toolContainerToken: void 0 },
    };
  Br("agent_proxy_inputs_ms", performance.now() - startTime, startTime);
  let L = await bringUpAgentProxy(X, 1);
  if (w.kind === "standalone" && L.outcome === "fatal") q1t(GITHUB_TLS_FAILED_TEXT);
  if (L.outcome === "retry")
    (logFeatureSad("agent_proxy_init", "agent_proxy_init_ca_exhausted_retrying", { ca_source: fromEnum(A) }),
      retryAgentProxyInBackground(X, L).catch((D) => {
        (logForDebugging(`[agent-proxy] retry loop crashed: ${errorMessage(D)}; proxy stays disabled`, {
          level: "warn",
        }),
          logFeatureBad("agent_proxy_init", "agent_proxy_init_retry_loop_crashed"));
      }));
  return e.state;
}
/**
 * 代理 GitHub TLS 设置失败的说明，以及后台重试的最大间隔与判定耗尽的时长。
 */
//@ chunk-awy329vy.js:65296-65631 placement
var GITHUB_TLS_FAILED_TEXT =
    "Anthropic-managed GitHub access through this session's proxy could not be set up: git and gh fail TLS verification against github.com. Never disable TLS verification or edit the git config file named by $GIT_CONFIG_GLOBAL to get past it; tell the user that GitHub access is not available in this session.",
  MAX_RETRY_DELAY_MS = 300000,
  RETRY_BAD_AFTER_MS = 3600000;
//@ chunk-awy329vy.js:65631-65729 placement
function Et(n, e) {
  if (n.generation !== e || n.state.enabled || isCleanupStarted()) return "exit";
  return isShuttingDown() ? "defer" : null;
}
//@ chunk-awy329vy.js:65729-65780 placement
function backgroundRetryDelayMs(n, e) {
  return Math.min(getRetryDelay(n - 1, e, MAX_RETRY_DELAY_MS), MAX_RETRY_DELAY_MS);
}
/**
 * 代理初始化失败后在后台持续重试：每次按退避等待，世代变更则退出或延后；超过时限仍失败时记一次"耗尽"遥测但继续重试，直到成功或致命错误。
 */
//@ chunk-awy329vy.js:65780-66461 placement
async function retryAgentProxyInBackground(context, lastResult) {
  let { runtime: runtime, generation: generation, caSource: caSource, opts: opts } = context,
    startedAt = Date.now(),
    u = opts?.retryBadAfterMs ?? RETRY_BAD_AFTER_MS,
    reportedExhausted = !1;
  for (let attempt = 2; ; attempt++) {
    let delayMs = opts?.retryDelayMs?.(attempt) ?? backgroundRetryDelayMs(attempt, lastResult.retryAfter);
    (logForDebugging(
      `[agent-proxy] ${lastResult.detail}; attempt ${attempt} in ${(delayMs / 1000).toFixed(1)}s`,
      { level: "warn" },
    ),
      await sleep(delayMs, void 0, { unref: !0 }));
    let gate = Et(runtime, generation);
    if (gate === "exit") return;
    if (gate === "defer") continue;
    let result = await bringUpAgentProxy(context, attempt);
    if (result.outcome !== "retry") return;
    if (((lastResult = result), !reportedExhausted && Date.now() - startedAt >= u))
      ((reportedExhausted = !0),
        logForDebugging(
          `[agent-proxy] ${lastResult.detail}; still failing after ${attempt} attempts over ${Math.round((Date.now() - startedAt) / 60000)} min \u2014 counting as exhausted, retrying anyway`,
          { level: "warn" },
        ),
        logFeatureBad("agent_proxy_init", "agent_proxy_init_ca_exhausted", {
          ca_source: fromEnum(caSource),
        }));
  }
}
/**
 * 启动 agent 代理：读取 CCR_AGENT_PROXY_* 环境变量，启动本地中继、写入 CA 信任与 git 配置。
 */
//@ chunk-awy329vy.js:66461-71701 placement
async function bringUpAgentProxy(n, e) {
  let {
      runtime: runtime,
      route: route,
      baseUrl: baseUrl,
      caBundlePath: caBundlePath,
      systemCa: systemCa,
      localCa: localCa,
      hasSystemCa: hasSystemCa,
      governedGitTools: governedGitTools,
      selective: selective,
      noProxy: noProxy,
      bundleCoversEveryHost: bundleCoversEveryHost,
      receiveGateDisabled: receiveGateDisabled,
      uploadGateDisabled: uploadGateDisabled,
      caWatchEnabled: caWatchEnabled,
      pathProbes: pathProbes,
      installedClisScan: installedClisScan,
      envCa: envCa,
      caSource: caSource,
      opts: opts,
    } = n,
    R = (K, H) => {
      if (e === 1) Br(K, performance.now() - H, H);
    },
    I;
  if (envCa !== void 0) I = envCa;
  else {
    let startTime = performance.now(),
      H = await fetchCcrCaCert(baseUrl, {
        budgetMs: opts?.caFetchBudgetMs ?? (e === 1 ? 5000 : 15000),
        tries: e === 1 ? 3 : 1,
        viaStandaloneProxy: route.kind === "standalone",
      });
    if ((R("agent_proxy_ca_fetch_ms", startTime), H.outcome !== "ok")) return reportCaFailure(H, caSource);
    I = H.ccrCa;
  }
  let startTime = performance.now(),
    X = await writeCaBundle(localCa, I, caBundlePath);
  if (X.outcome !== "ok") return (R("agent_proxy_trust_write_ms", startTime), reportCaFailure(X, caSource));
  if (!governedGitTools) await writeAwsConfigOnce(opts?.awsConfigPath ?? join(homedir(), ".aws", "config"));
  if ((R("agent_proxy_trust_write_ms", startTime), route.kind === "standalone")) {
    let K = Et(runtime, n.generation);
    if (K)
      return K === "exit"
        ? { outcome: "stale" }
        : { outcome: "retry", detail: "shutdown claimed during bring-up", retryAfter: null };
    let H = {
      enabled: !0,
      caBundlePath: caBundlePath,
      hasSystemCa: hasSystemCa,
      bundleCoversEveryHost: bundleCoversEveryHost,
      noProxy: noProxy,
      selective: !1,
      governedGitTools: !0,
    };
    ((runtime.state = H), (runtime.relay = void 0));
    let le = await configureGovernedGit(H, caBundlePath, route, selective, pathProbes);
    if (runtime.state !== H) return { outcome: "stale" };
    return (
      KUr(ghStandinConfig(H)),
      logForDebugging(
        `[agent-proxy] governed git routed through the agent proxy standalone forwarder (CA from ${caSource})`,
      ),
      logFeatureOk("agent_proxy_init", { attempts: e, ca_source: fromEnum(caSource), standalone: !0 }),
      q1t(
        env.CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG && !le
          ? GITHUB_TLS_FAILED_TEXT
          : describeProxyForPrompt(caBundlePath, void 0),
      ),
      { outcome: "ok" }
    );
  }
  let {
    sessionId: sessionId,
    token: token,
    tokenIsHandedOver: tokenIsHandedOver,
    unlinkTokenPath: unlinkTokenPath,
  } = route;
  try {
    let K = baseUrl.replace(/^http/, "ws") + Dto + "/ws",
      H = h$o(caBundlePath),
      le = token ?? "",
      startTime = performance.now(),
      he = await installedClisScan,
      ke,
      kr = () =>
        (ke ??= readGlobalGitConfigKeys()
          .catch(() => [])
          .finally(() => {
            ke = void 0;
          })),
      te = await startUpstreamProxyRelay({
        wsUrl: K,
        sessionId: sessionId,
        token: le,
        getToken: tokenIsHandedOver ? () => le : () => getSessionIngressAuthToken() || le,
        selective: selective,
        limits: {
          ...(receiveGateDisabled && { receiveHighWater: 1 / 0 }),
          ...(uploadGateDisabled && { sendPauseAfterPendingBytes: 1 / 0, sendStallTimeoutMs: 1 / 0 }),
        },
        statusProvider: async () => {
          let N = await kr();
          if (N.length > 0)
            logForDebugging(`[agent-proxy] git config may defeat proxy routing: ${N.join(", ")}`, {
              level: "warn",
            });
          return {
            ...runtime.state,
            ...(N.length > 0 && { gitConfigConflicts: N }),
            readmePath: H,
            gitConfigInjection: gitConfigCountUnset(),
            gitSshRewrite: gitConfigCountUnset() && sshAuthUnset(),
          };
        },
        onFailure: rVs,
        onConnectAnswer: notePolicyRefusedHost,
      }),
      Rr = registerCleanup(async () => te.stop()),
      G = {
        enabled: !0,
        port: te.port,
        caBundlePath: caBundlePath,
        hasSystemCa: hasSystemCa,
        bundleCoversEveryHost: bundleCoversEveryHost,
        noProxy: noProxy,
        selective: Boolean(selective),
        governedGitTools: governedGitTools,
        installedProxyPreconfiguredClis: he,
      };
    R("agent_proxy_relay_up_ms", startTime);
    let Lt = Et(runtime, n.generation);
    if (Lt)
      return (
        te.stop(),
        Rr(),
        Lt === "exit"
          ? { outcome: "stale" }
          : { outcome: "retry", detail: "shutdown claimed during bring-up", retryAfter: null }
      );
    if ((runtime.activate(G, te), !selective && !governedGitTools))
      Mir({ proxyUrl: ce(te.port), gatewayCa: I });
    if (governedGitTools)
      await configureGovernedGit(G, caBundlePath, { kind: "relay", port: te.port }, selective, pathProbes);
    else {
      let N = await installGhShim(
        { kind: "relay", port: te.port },
        caBundlePath,
        sessionId,
        selective,
        pathProbes,
      ).catch((be) => {
        (logForDebugging(`[agent-proxy] gh stand-in shim write failed: ${errorMessage(be)}`, {
          level: "warn",
        }),
          logFeatureSad("agent_proxy_gh_shim", "arm_failed"));
        return;
      });
      if (N)
        ((G.ghShimDir = N.shimDir),
          (G.ghStandin = N.standin),
          (G.ghStandinEnterprise = N.enterprise),
          (G.ghStandinAnyHost = N.anyHost),
          (G.ghStandinNoJq = N.noJq));
    }
    if (runtime.state !== G) return { outcome: "stale" };
    (te.runStartupChecks(),
      KUr(ghStandinConfig(G)),
      logForDebugging(`[agent-proxy] enabled on 127.0.0.1:${te.port} (CA from ${caSource})`),
      logFeatureOk("agent_proxy_init", { attempts: e, ca_source: fromEnum(caSource) }),
      q1t(describeProxyForPrompt(caBundlePath, void 0)),
      writeFile(H, buildAgentProxyReadme(te.port, caBundlePath), "utf8")
        .then(() => {
          if (runtime.state !== G) return;
          q1t(describeProxyForPrompt(caBundlePath, H));
        })
        .catch((N) => {
          if (
            (logForDebugging(
              `[agent-proxy] README write failed: ${N instanceof Error ? N.message : String(N)}`,
            ),
            runtime.state !== G)
          )
            return;
          q1t(describeProxyForPrompt(caBundlePath, void 0));
        }));
    let Mt = Dt(caBundlePath),
      we = !1;
    if (!governedGitTools && caSource === "env") {
      let N = await readCaBundleFile(Mt);
      we = N.state === "read" && compareCaBundles(N.text, I) !== "same" && systemStoreHasCa(systemCa, N.text);
    }
    let Re = governedGitTools || we ? void 0 : installCaIntoSystemTrust(n, I, Mt, "start"),
      Je = we ? Promise.withResolvers() : void 0,
      Be,
      Ht = !1;
    if (opts?.toolTrust !== !1 && !governedGitTools)
      Be = configureToolTrust({
        ccrCa: I,
        caBundlePath: caBundlePath,
        hasSystemCa: G.hasSystemCa ?? !1,
        stateDir: join(caBundlePath, ".."),
        systemTrust: Re ?? Je?.promise,
        ...(opts?.toolTrust ?? {}),
      })
        .then((N) => {
          if (runtime.state !== G) return;
          if ((carryJavaTrustStore(G, N), N.profileDPath)) {
            let profileDPath = N.profileDPath;
            registerCleanup(() => unlink(profileDPath).catch(() => {}));
          }
          if (N.failureCodes.length > 0) G.toolTrustFailureCodes = N.failureCodes;
        })
        .catch((N) => {
          (logForDebugging(
            `[agent-proxy] tool trust setup failed: ${N instanceof Error ? N.message : String(N)}`,
            { level: "warn" },
          ),
            logFeatureSad("agent_proxy_tool_trust", "setup_threw"),
            (Ht = !0));
        });
    let De = { ccrCa: I, systemTrust: Re, toolTrust: Be, installIncomplete: !1, installRetries: 0 };
    if (caWatchEnabled && !governedGitTools)
      Promise.all([Re, Be])
        .then(async ([N]) => {
          let be = opts?.toolTrust === !1 || (await Pr(caBundlePath, I));
          if (runtime.state === G && De.ccrCa === I)
            De.installIncomplete = we || Ht || !be || vr(N, G.toolTrustFailureCodes ?? []);
        })
        .catch(() => {});
    let Ft = !selective && !governedGitTools,
      Ut;
    if (caSource === "env")
      Ut = reconcileAgentProxyCa(n, G, I, {
        systemTrust: Re,
        toolTrust: Be,
        installDeferred: we,
        onInstallSettled: () => Je?.resolve(),
        embeddedEndpoint: Ft,
        relayPort: te.port,
        ...(caWatchEnabled && { trust: De }),
      })
        .catch((N) => {
          (logForDebugging(`[agent-proxy] CA reconcile crashed: ${errorMessage(N)}`, { level: "warn" }),
            logFeatureSad("agent_proxy_ca_reconcile", "reconcile_threw"));
        })
        .finally(() => Je?.resolve());
    let Wt = opts?.caWatchIntervalMs ?? oa;
    if (caWatchEnabled && !governedGitTools && Wt > 0)
      watchAgentProxyCa(n, G, De, {
        intervalMs: Wt,
        afterStart: Ut,
        embeddedEndpoint: Ft,
        relayPort: te.port,
      }).catch((N) => {
        (logForDebugging(`[agent-proxy] CA watch crashed: ${errorMessage(N)}`, { level: "warn" }),
          logFeatureSad("agent_proxy_ca_watch", "watch_threw"));
      });
    if (unlinkTokenPath)
      await unlink(unlinkTokenPath).catch(() => {
        logForDebugging("[agent-proxy] token file unlink failed", { level: "warn" });
      });
    return { outcome: "ok" };
  } catch (error) {
    return (
      logForDebugging(
        `[agent-proxy] relay start failed: ${error instanceof Error ? error.message : String(error)}; proxy disabled`,
        { level: "warn" },
      ),
      logFeatureBad("agent_proxy_init", "agent_proxy_init_relay_start_failed"),
      { outcome: "fatal" }
    );
  }
}
//@ chunk-awy329vy.js:71701-71876 placement
function ghStandinConfig(n) {
  return n.ghStandin
    ? proxyPromptVariant({
        enterprise: n.ghStandinEnterprise === !0,
        anyHost: n.ghStandinAnyHost === !0,
        noJq: n.ghStandinNoJq === !0,
        runner: n.governedGitTools === !0,
      })
    : void 0;
}
//@ chunk-awy329vy.js:71876-72598 placement
async function configureGovernedGit(n, e, r, o, s) {
  let h = !1,
    [l, u] = await Promise.all([
      env.CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG
        ? writeGovernedGitConfig(r, e).catch(
            (p) => (
              logForDebugging(`[agent-proxy] governed git config append failed: ${errorMessage(p)}`, {
                level: "warn",
              }),
              logFeatureSad("agent_proxy_tool_scoped", "git_config_append_failed"),
              (h = !0),
              !1
            ),
          )
        : !1,
      env.CLAUDE_CODE_AGENT_PROXY_GH_SHIM
        ? installGhShim(r, e, void 0, o, s).catch((p) => {
            (logForDebugging(`[agent-proxy] gh shim write failed: ${errorMessage(p)}`, { level: "warn" }),
              logFeatureSad("agent_proxy_tool_scoped", "gh_shim_write_failed"),
              logFeatureSad("agent_proxy_gh_shim", "arm_failed"),
              (h = !0));
            return;
          })
        : void 0,
    ]);
  if (u)
    ((n.ghShimDir = u.shimDir),
      (n.ghStandin = u.standin),
      (n.ghStandinEnterprise = u.enterprise),
      (n.ghStandinAnyHost = u.anyHost),
      (n.ghStandinNoJq = u.noJq));
  if (!h) logFeatureOk("agent_proxy_tool_scoped", { git_config: l, gh_shim: Boolean(u) });
  return l;
}
/**
 * 由代理注入凭证的命令行工具（gh、aws、gcloud/bq/gsutil）：各自的真实凭证环境变量与替换成占位标记的变量。
 */
//@ chunk-awy329vy.js:72598-73271 placement
var CREDENTIAL_PLACEHOLDER_CLIS = [
    {
      clis: ["gh"],
      realCredentialEnv: ["GH_TOKEN", "GITHUB_TOKEN"],
      placeholders: { GH_TOKEN: PROXY_INJECTED_MARKER, GITHUB_TOKEN: PROXY_INJECTED_MARKER },
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
      placeholders: { CLOUDSDK_AUTH_ACCESS_TOKEN: PROXY_INJECTED_MARKER },
    },
  ],
  PLACEHOLDER_CREDENTIAL_KEYS = CREDENTIAL_PLACEHOLDER_CLIS.flatMap((n) => Object.keys(n.placeholders)),
  CA_POLL_INTERVAL_MS = 1000;
//@ chunk-awy329vy.js:73271-73316 placement
function readToken(path) {
  return inheritedByChildren(path)?.trim() || void 0;
}
//@ chunk-awy329vy.js:73316-73520 placement
function getRunningRelayForGit() {
  let state = Pe().state;
  if (
    !state.enabled ||
    !state.port ||
    !state.caBundlePath ||
    state.governedGitTools ||
    !state.bundleCoversEveryHost
  )
    return null;
  return { proxyUrl: ce(state.port), noProxy: state.noProxy, caBundlePath: state.caBundlePath };
}
/**
 * getAgentProxyEnv：代理启用时给子进程的环境变量（HTTPS_PROXY/NO_PROXY、CA 包相关变量、JAVA_TOOL_OPTIONS、gh shim 的 PATH 等）。
 */
//@ chunk-awy329vy.js:73520-74962 placement = getUpstreamProxyEnv (0.377)
function getAgentProxyEnv() {
  let state = Pe().state;
  if (state.enabled && state.governedGitTools) {
    let o = {};
    if (state.ghShimDir) {
      let s = inheritedByChildren("PATH") ?? "";
      if (((o.PATH = s ? `${state.ghShimDir}${delimiter}${s}` : state.ghShimDir), state.ghStandin && s))
        o.PATH = `${s}${delimiter}${state.ghShimDir}`;
    }
    return o;
  }
  if (!state.enabled || !state.port || !state.caBundlePath) {
    if (process.env.HTTPS_PROXY && process.env.SSL_CERT_FILE) {
      let o = {};
      for (let key of ["HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy", ...Gle])
        if (process.env[key]) o[key] = process.env[key];
      for (let s of [...Object.keys(wve), ...PLACEHOLDER_CREDENTIAL_KEYS]) {
        let h = inheritedByChildren(s);
        if (h) o[s] = h;
      }
      return o;
    }
    return {};
  }
  let e = ce(state.port),
    r = { HTTPS_PROXY: e, https_proxy: e, NO_PROXY: state.noProxy, no_proxy: state.noProxy };
  for (let o of CA_CERT_ENV_VARS) r[o] = state.caBundlePath;
  if (state.bundleCoversEveryHost) {
    for (let o of q_r) r[o] = state.caBundlePath;
    for (let [o, s] of Object.entries(wve)) if (inheritedByChildren(o) === void 0) r[o] = s;
  }
  if (state.javaTrustStorePath && state.javaTrustStoreType)
    r.JAVA_TOOL_OPTIONS = buildJavaTrustOptions(
      state.javaTrustStorePath,
      state.javaTrustStoreType,
      readToken("JAVA_TOOL_OPTIONS"),
    );
  if (readToken("GIT_TERMINAL_PROMPT") === void 0)
    r.GIT_TERMINAL_PROMPT = GIT_NO_PROMPT_ENV.GIT_TERMINAL_PROMPT;
  if (readToken("GIT_ASKPASS") === void 0) r.GIT_ASKPASS = GIT_NO_PROMPT_ENV.GIT_ASKPASS;
  if (readToken("GCM_INTERACTIVE") === void 0) r.GCM_INTERACTIVE = GIT_NO_PROMPT_ENV.GCM_INTERACTIVE;
  if (gitConfigCountUnset()) {
    let o = [["credential.interactive", "false"]];
    if (sshAuthUnset()) o.push(...Fys.map((s) => [`url.https://${GITHUB_HOST}/.insteadOf`, s]));
    Object.assign(r, buildGitConfigEnv(void 0, o));
  }
  for (let o of CREDENTIAL_PLACEHOLDER_CLIS)
    if (!o.realCredentialEnv.some((h) => inheritedByChildren(h))) Object.assign(r, o.placeholders);
  if (state.ghShimDir) r.PATH = [readToken("PATH"), state.ghShimDir].filter(Boolean).join(delimiter);
  return r;
}
/**
 * 代理启用且使用 gh 替身时返回 gh shim 目录。
 */
//@ chunk-awy329vy.js:74962-75043 placement
function getGhStandinDir() {
  let state = Pe().state;
  return state.enabled && state.ghStandin ? state.ghShimDir : void 0;
}
//@ chunk-awy329vy.js:75043-75145 placement
function isGovernedGitArmed() {
  return Boolean(env.CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG || env.CLAUDE_CODE_AGENT_PROXY_GH_SHIM);
}
//@ chunk-awy329vy.js:75145-75332 placement
var GIT_CONFIG_BLOCK_BEGIN = "# >>> claude agent-proxy governed-git (auto-generated; do not edit) >>>",
  GIT_CONFIG_BLOCK_END = "# <<< claude agent-proxy governed-git <<<",
  GIT_CREDENTIAL_QUIT_HELPER = '"!f() { case $1 in get) echo quit=true ;; esac; }; f"';
//@ chunk-awy329vy.js:75332-75764 placement
function getGovernedGitHosts() {
  let CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS = env.CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS;
  if (!CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS || CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS.trim() === "")
    return [GITHUB_HOST];
  let e = [],
    r = 0;
  for (let o of CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS.split(",")) {
    let trimmed = o.trim();
    if (trimmed === "") continue;
    let h = normalizeHost(trimmed);
    if (h === "" || h.length > 255 || !Nut.test(h)) {
      r++;
      continue;
    }
    let l = isGithubDotCom(h) ? GITHUB_HOST : h;
    if (!e.includes(l)) e.push(l);
  }
  if (r > 0)
    logForDebugging(
      `[agent-proxy] governed git: ignored ${r} governed-host ${plural(r, "entry", "entries")} that ${plural(r, "is", "are")} not a bare hostname`,
      { level: "warn" },
    );
  return e;
}
/**
 * 写入受治理 git 的全局配置块（代理、CA、凭证助手）。
 */
//@ chunk-awy329vy.js:75764-77142 placement
async function writeGovernedGitConfig(n, e) {
  let r;
  switch (n.kind) {
    case "relay":
      r = ce(n.port);
      break;
    case "standalone":
      r = n.proxyUrl;
      break;
  }
  let envGitConfigGlobal = process.env.GIT_CONFIG_GLOBAL;
  if (!envGitConfigGlobal)
    return (
      logForDebugging(
        "[agent-proxy] governed git config arm set but GIT_CONFIG_GLOBAL is unset; skipping (refusing to write a shared global config)",
        { level: "warn" },
      ),
      !1
    );
  if ([e, r].some((y) => /[\n\r"]/.test(y)))
    return (
      logForDebugging(
        "[agent-proxy] governed git: the CA bundle path or the proxy URL contains a newline or quote; skipping git config arm",
        { level: "warn" },
      ),
      !1
    );
  let s = getGovernedGitHosts();
  if (s.length === 0)
    return (
      logForDebugging(
        "[agent-proxy] governed git: the governed-host list carried no usable host; skipping git config arm",
        { level: "warn" },
      ),
      !1
    );
  let h = [GIT_CONFIG_BLOCK_BEGIN];
  for (let y of s)
    if (
      (h.push(
        `[http "https://${y}/"]`,
        `	proxy = ${r}`,
        `	sslCAInfo = ${e}`,
        ...(y === GITHUB_HOST ? [] : ["\textraHeader =", "\tcookieFile ="]),
        `[credential "https://${y}/"]`,
        ...(y === GITHUB_HOST ? [] : ["\thelper =", `	helper = ${GIT_CREDENTIAL_QUIT_HELPER}`]),
        "\tinteractive = false",
      ),
      y === GITHUB_HOST && sshAuthUnset())
    )
      h.push(`[url "https://${GITHUB_HOST}/"]`, ...Fys.map((w) => `	insteadOf = ${w}`));
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
  return (
    await writeFileAtomic(
      envGitConfigGlobal,
      p +
        h.join(`
`) +
        `
`,
      384,
    ),
    logForDebugging(
      `[agent-proxy] governed git: relay routing for ${s.length} governed ${plural(s.length, "host")} appended to ${envGitConfigGlobal}`,
    ),
    !0
  );
}
//@ chunk-awy329vy.js:77142-77319 placement
async function findOnPath(n, e) {
  let parts = (env.PATH ?? "").split(delimiter);
  for (let o of parts) {
    if (!o || o === e) continue;
    let s = join(o, n);
    try {
      if ((await access(s, constants.X_OK), (await stat(s)).isFile())) return s;
    } catch {}
  }
  return;
}
//@ chunk-awy329vy.js:77319-77829 placement
async function withTimeBudget(n, e, { budgetMs: budgetMs, caSource: caSource }) {
  let s = `${n} timed out`,
    startTime = performance.now(),
    l = sampleCpuAndPageFaults(),
    u = startEventLoopLagMonitor(bjn);
  try {
    return { value: await withTimeout(e(), budgetMs, s) };
  } catch (error) {
    let y = sampleCpuAndPageFaults(),
      w = errorMessage(error) === s,
      T = sanitizeErrnoForTelemetry(error);
    return {
      failure: {
        timedOut: w,
        detail: w ? s : `${n} failed (${errorMessage(error)})`,
        fields: {
          ca_source: fromEnum(caSource),
          ...(T !== void 0 && { errno: T }),
          elapsed_ms: Math.round(performance.now() - startTime),
          loop_lag_max_ms: Math.round(u.stop()),
          ...(l &&
            y && {
              cpu_delta_ms: Math.round(y.cpuTimeMs - l.cpuTimeMs),
              major_fault_delta: y.majorPageFaults - l.majorPageFaults,
            }),
        },
      },
    };
  } finally {
    u.stop();
  }
}
//@ chunk-awy329vy.js:77829-78185 placement
async function sweepInstalledClis(n) {
  let e = new Set(),
    r = await withTimeBudget("installed-CLI PATH sweep", () => scanPathForExecutables(PROXIED_CLIS, e), n);
  if ("failure" in r)
    (logForDebugging(`[agent-proxy] ${r.failure.detail}; naming only the CLIs resolved so far`, {
      level: "warn",
    }),
      logFeatureSad(
        "agent_proxy_init",
        r.failure.timedOut ? "agent_proxy_path_probe_timeout" : "agent_proxy_path_probe_failed",
        r.failure.fields,
      ));
  return PROXIED_CLIS.filter((o) => e.has(o));
}
//@ chunk-awy329vy.js:78185-78287 placement
var MAX_SHIM_BYTES = 65536,
  GH_SHIM_HEADER = `#!/bin/sh
# claude agent-proxy governed-git gh shim (auto-generated; per-session).
`;
//@ chunk-awy329vy.js:78287-78554 placement
async function readGhShim(n) {
  try {
    await using e = await open(n, $c());
    let r = await readHandleUpTo(e, MAX_SHIM_BYTES + 1);
    return r.length > MAX_SHIM_BYTES ? "" : r.toString("utf8");
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(
        `[agent-proxy] gh shim at ${n} could not be read (${getErrnoCode(error) ?? "no error code"}); treated as not a shim`,
        { level: "warn" },
      );
    return "";
  }
}
//@ chunk-awy329vy.js:78554-78632 placement
function urlHostMatches(n, e) {
  let r = URL.parse(githubApiBase(e))?.hostname;
  return r !== void 0 && nt(n, r);
}
//@ chunk-awy329vy.js:78632-78941 placement
async function isJqInstalled(n, e) {
  let r = await withTimeBudget("jq PATH probe", () => findOnPath("jq", n), e);
  if ("failure" in r)
    return (
      logForDebugging(`[agent-proxy] ${r.failure.detail}; taking jq as installed`, { level: "warn" }),
      logFeatureSad(
        "agent_proxy_gh_shim",
        r.failure.timedOut ? "jq_path_probe_timeout" : "jq_path_probe_failed",
        r.failure.fields,
      ),
      !1
    );
  return r.value === void 0;
}
//@ chunk-awy329vy.js:78941-79100 placement
function removeGhShimLater(n, e, r) {
  registerCleanup(async () => {
    if ((await readGhShim(n)) !== e) return;
    if ((await unlink(n).catch(() => {}), r)) {
      let o = join(n, "..");
      await rmdir(o)
        .then(() => rmdir(join(o, "..")))
        .catch(() => {});
    }
  });
}
/**
 * 为 agent 代理安装 gh 垫片（gh shim），没有 gh 时提供替身。
 */
//@ chunk-awy329vy.js:79100-82708 placement
async function installGhShim(n, e, r, o, s) {
  let h = r !== void 0,
    l =
      r !== void 0
        ? join(e, "..", "sessions", computeContentHash(r).slice(0, 32), "bin")
        : join(e, "..", "bin"),
    u = join(l, "gh"),
    p = await withTimeBudget("gh PATH probe", () => findOnPath("gh", l), s);
  if ("failure" in p) {
    if ((logForDebugging(`[agent-proxy] ${p.failure.detail}; skipping gh shim`, { level: "warn" }), !h))
      throw Error("gh PATH probe failed");
    logFeatureSad(
      "agent_proxy_gh_shim",
      p.failure.timedOut ? "gh_path_probe_timeout" : "gh_path_probe_failed",
      p.failure.fields,
    );
    return;
  }
  let y = p.value;
  if (y && h) {
    logFeatureOk("agent_proxy_gh_shim", { standin: !1, hosted: !0 });
    return;
  }
  if (!y && isEssentialTrafficOnly()) {
    (logForDebugging("[agent-proxy] no gh on PATH and nonessential traffic is disabled; skipping gh shim"),
      logFeatureSad("agent_proxy_gh_shim", "standin_essential_traffic_only"));
    return;
  }
  if (!y && !urlHostMatches(o, GITHUB_HOST)) {
    (logForDebugging(
      "[agent-proxy] no gh on PATH and this relay does not send GitHub API requests to the session proxy (selective mode); skipping gh shim",
    ),
      logFeatureSad("agent_proxy_gh_shim", "selective_relay"));
    return;
  }
  if ((env.PATH ?? "").split(delimiter).includes(l)) {
    let b = await readGhShim(u),
      included = b.includes(` '${Abi}' `),
      startsWith = b.startsWith(GH_SHIM_HEADER),
      P = !y;
    if (P ? included : startsWith)
      return (
        logForDebugging(`[agent-proxy] gh shim at ${u} is the enclosing session's; left as it is`),
        logFeatureOk("agent_proxy_gh_shim", { standin: P, ...(h && { hosted: !0 }), inherited: !0 }),
        {
          shimDir: l,
          standin: P,
          enterprise: P && b.includes(" '--hosts="),
          anyHost: P && b.includes(` '${ANY_HOST_FLAG}' `),
          noJq: P && (await isJqInstalled(l, s)),
        }
      );
    if (included || startsWith) {
      (logForDebugging(
        `[agent-proxy] gh shim at ${u} is the enclosing session's, of another kind; no gh shim for this process`,
      ),
        logFeatureSad("agent_proxy_gh_shim", "enclosing_shim_other_kind"));
      return;
    }
  }
  let w;
  if (y) w = [y];
  else {
    let b = getLaunchCommand({ pinToCurrentBinary: !0 });
    w = [b.cmd, ...b.prefixArgs];
  }
  if ([e, ...w].some((b) => /['\n\r]/.test(b))) {
    (logForDebugging(
      "[agent-proxy] governed git: a path or argument the gh shim would quote holds a quote or a line break; skipping gh shim",
      { level: "warn" },
    ),
      logFeatureSad("agent_proxy_gh_shim", "unquotable_path"));
    return;
  }
  if ((await mkdir(l, { recursive: !0, mode: 448 }), !y)) {
    let b = h && o === void 0,
      C = h
        ? []
        : getGovernedGitHosts().filter((E) => E !== GITHUB_HOST && !E.endsWith(D5e) && urlHostMatches(o, E)),
      v;
    switch (n.kind) {
      case "relay":
        v = n.port;
        break;
      case "standalone":
        v = STANDALONE_PROXY;
        break;
    }
    let P = describeGhStandinHosts({ command: w, port: v, caBundlePath: e, ghesHosts: b ? ANY : C });
    return (
      await writeFileAtomic(u, P, 493),
      removeGhShimLater(u, P, h),
      logForDebugging(`[agent-proxy] no gh on PATH; gh stand-in shim at ${u}`),
      logFeatureOk("agent_proxy_gh_shim", { standin: !0, ...(h && { hosted: !0 }) }),
      { shimDir: l, standin: !0, enterprise: C.length > 0, anyHost: b, noJq: await isJqInstalled(l, s) }
    );
  }
  let T, S;
  switch (n.kind) {
    case "relay":
      ((T = ""),
        (S = `HTTPS_PROXY='${ce(n.port)}' https_proxy='${ce(n.port)}' \\
`));
      break;
    case "standalone":
      ((T = buildGhProxyCheckScript()), (S = ""));
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
    buildGhGuardScript(y) +
    T +
    `# NO_PROXY cleared: an ambient runner-host NO_PROXY covering
# github.com would make gh skip the relay and send the literal dummy
# token to the real GitHub API (hard 401).
` +
    S +
    `NO_PROXY='' no_proxy='' \\
SSL_CERT_FILE='${e}' \\
GH_TOKEN='${PROXY_INJECTED_MARKER}' GITHUB_TOKEN='${PROXY_INJECTED_MARKER}' \\
exec '${y}' "$@"
`;
  return (
    await writeFileAtomic(u, x, 493),
    removeGhShimLater(u, x, h),
    logForDebugging(`[agent-proxy] governed git: gh shim at ${u} -> ${y}`),
    logFeatureOk("agent_proxy_gh_shim", { standin: !1 }),
    { shimDir: l, standin: !1, enterprise: !1, anyHost: !1, noJq: !1 }
  );
}
//@ chunk-awy329vy.js:82708-82761 placement
function gitConfigCountUnset() {
  return readToken("GIT_CONFIG_COUNT") === void 0;
}
//@ chunk-awy329vy.js:82761-82843 placement
function sshAuthUnset() {
  return readToken("SSH_AUTH_SOCK") === void 0 && readToken("GIT_SSH_COMMAND") === void 0;
}
//@ chunk-awy329vy.js:82843-83944 placement
function describeProxyForPrompt(n, e) {
  let state = Pe().state;
  if (state.governedGitTools) {
    let s = e ? `see ${e} and ` : "",
      h = state.ghStandin === !0,
      l = isAgentProxyStandaloneActive()
        ? "other network traffic goes through the same proxy, and other tools that reach github.com there (curl, npm, or gh run with a GitHub token of its own) fail TLS verification: only git and gh trust that CA bundle."
        : "other network traffic uses this machine's own egress.";
    return (
      `GitHub access for git${h ? " and gh" : ""} goes through a pre-configured session proxy (CA bundle: ${n}) via per-session git config${h ? " and a gh PATH shim" : ""}; ${l} If ${h ? "git or gh fail" : "git fails"} against github.com (TLS or HTTP errors, or a transfer cut off with connection reset / unexpected disconnect), ${s}check the git config file named by $GIT_CONFIG_GLOBAL; never disable TLS verification or remove the proxy/sslCAInfo entries there.` +
      (state.ghShimDir && !h
        ? " `gh` in a Bash command is this machine's own GitHub CLI, with its own sign-in and network path."
        : "")
    );
  }
  let filtered = (state.installedProxyPreconfiguredClis ?? []).filter(
    (s) => !(state.ghStandin === !0 && s === "gh"),
  );
  return { caBundlePath: n, hasReadme: e !== void 0, installedClis: filtered };
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
  let n = new Set(),
    results = await Promise.all(
      ["--global", "--system"].map((r) =>
        execFileNoThrowWithCwd("git", ["config", r, "--list", "--name-only"], {
          timeout: 5000,
          preserveOutputOnError: !0,
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
/**
 * 生成写给模型/用户看的 agent 代理说明文档（本地代理地址、CA 位置、快速诊断步骤）。
 */
//@ chunk-awy329vy.js:84538-89559 placement
function buildAgentProxyReadme(n, e) {
  let r = join(e, ".."),
    o = `http://127.0.0.1:${n}`;
  return `# Claude Code agent proxy

Outbound HTTPS from this session goes through a local proxy at ${o}
(set via HTTPS_PROXY) which tunnels to a policy-enforcing egress proxy. TLS is
re-terminated there, so every tool must trust the CA bundle at
${e}. The standard CA environment variables, the system trust
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

- If the tool has a CA flag or env var, point it at ${e}
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

Processes inside containers cannot reach 127.0.0.1:${n} and do not trust
the CA. Workarounds: run builds with --network host, copy ${e}
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
async function readTokenFile(n) {
  try {
    return { existed: !0, token: (await readFile(n, "utf8")).trim() || null };
  } catch (error) {
    if (isENOENT(error)) return { existed: !1, token: null };
    return (
      logForDebugging(
        `[agent-proxy] token read failed: ${error instanceof Error ? error.message : String(error)}`,
        { level: "warn" },
      ),
      { existed: !1, token: null }
    );
  }
}
/**
 * 在常见路径中找系统 CA 包（/etc/ssl/certs/ca-certificates.crt 等），返回其内容。
 */
//@ chunk-awy329vy.js:89817-89903 placement
async function findSystemCaBundle(n = yr) {
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
  let r = new Set(),
    o = [],
    s = n;
  for (let h of Gle) {
    let l = process.env[h]?.trim();
    if (!l || l === e || r.has(l) || yr.includes(l)) continue;
    r.add(l);
    let u;
    try {
      let w = await stat(l);
      if (!w.isFile() || w.size > MAX_CA_BUNDLE_BYTES_2) continue;
      u = await readFile(l, "utf8");
    } catch (error) {
      if (!isENOENT(error))
        logForDebugging(
          `[agent-proxy] could not read customer CA bundle from ${h}: ${error instanceof Error ? error.message : String(error)}`,
          { level: "warn" },
        );
      continue;
    }
    let match = u.match(PEM_CERT_BLOCK_RE);
    if (!match) continue;
    let y = 0;
    for (let w of match) {
      if (s.includes(w)) continue;
      (o.push(w),
        (s += `
${w}`),
        y++);
    }
    if (y > 0)
      logForDebugging(`[agent-proxy] folded ${y} customer CA cert(s) from ${h} into the relay bundle`);
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
  ],
  SYSTEM_TRUST_TIMEOUT_MS = 1e4;
//@ chunk-awy329vy.js:90902-91211 placement
function carryJavaTrustStore(n, e) {
  if (e.javaTrustStorePath && e.javaTrustStoreType)
    ((n.javaTrustStorePath = e.javaTrustStorePath), (n.javaTrustStoreType = e.javaTrustStoreType));
  else if (
    n.javaTrustStorePath === e.retiredJavaTrustStorePath ||
    n.javaTrustStorePath === e.rejectedJdkStorePath
  )
    ((n.javaTrustStorePath = void 0), (n.javaTrustStoreType = void 0));
}
/**
 * 安装/刷新系统 CA 信任（处理已有证书与 -2 链接、记录安装结果）。
 */
//@ chunk-awy329vy.js:91211-94075 placement
async function installIntoSystemTrust(
  n,
  e,
  {
    systemCa: systemCa,
    recordPath: recordPath,
    timeoutMs: timeoutMs = SYSTEM_TRUST_TIMEOUT_MS,
    caller: caller,
  },
) {
  let l = await Se(recordPath, n),
    u = systemStoreHasCa(systemCa, n) && l !== "different",
    p = () =>
      writeFileAtomic(recordPath, n).catch((x) => {
        logForDebugging(`[agent-proxy] could not record the system trust install: ${errorMessage(x)}`);
      }),
    y = {},
    w = Ee(n),
    T = firstCertificateLine(n),
    S = !1;
  for (let { dir: dir, name: name, refresh: refresh, link: link, direct: direct } of e)
    try {
      let E = join(dir, name),
        A = link
          ? { path: join(dir, name.replace(/\.crt$/, "-2.crt")), link: link.replace(/\.pem$/, "-2.pem") }
          : void 0,
        M = A === void 0 ? void 0 : await readCaBundleFile(A.path),
        R = M === void 0 || M.state === "missing",
        I = A !== void 0 && w !== void 0 && R,
        Y = u ? await readCaBundleFile(E) : void 0;
      if (Y?.state === "read") {
        let D = compareCaBundles(Y.text, n);
        if (
          R
            ? D === "same" && l === "same"
            : D !== "different" &&
              M?.state === "read" &&
              compareCaBundles(M.text, firstCertificateLine(Y.text)) === "same"
        ) {
          if (
            (logForDebugging(
              `[agent-proxy] CA already in the system trust store${D === "swapped" ? ", its two certificates in the other order" : ""}; install skipped`,
            ),
            l === "swapped")
          )
            await p();
          return (
            logFeatureOk("agent_proxy_system_trust", {
              reused: !0,
              ...(I && { old_layout: !0 }),
              ...(l === "swapped" && { swapped: !0 }),
            }),
            S ? "failed" : "reused"
          );
        }
      }
      let X = !1;
      if (direct && link && R) {
        let D = Date.now() + timeoutMs,
          F = !1,
          V = await installSystemCaDirect(n, {
            anchorPath: E,
            link: link,
            layout: direct,
            recordPath: recordPath,
            timeoutMs: timeoutMs,
          }),
          K = V.outcome === "installed" ? V.javaStore : void 0;
        if (V.outcome === "installed" && w !== void 0 && A)
          ((F = !0),
            (V = await installSystemCaDirect(T, {
              anchorPath: A.path,
              link: A.link,
              layout: direct,
              recordPath: recordPath,
              timeoutMs: Math.max(1, D - Date.now()),
            })));
        switch (V.outcome) {
          case "installed":
            return (
              await p(),
              logForDebugging("[agent-proxy] CA installed to system trust directly"),
              logFeatureOk("agent_proxy_system_trust", {
                reused: !1,
                method: fromEnum("direct"),
                ...(K && { java_store: fromEnum(K) }),
                ...(F && V.javaStore && { second_anchor_java_store: fromEnum(V.javaStore) }),
              }),
              S ? "failed" : "installed"
            );
          case "hook_incomplete":
            return (logFeatureSad("agent_proxy_system_trust", "hook_incomplete"), "failed");
          case "abandoned": {
            let step = V.step;
            y = { direct_failed_step: fromEnum(step) };
            break;
          }
          case "not_attempted": {
            let H = fromEnum(V.reason);
            ((y = F ? { second_anchor_direct_skipped: H } : { direct_skipped: H }),
              (X = !F && V.reason === "anchor_present"));
            break;
          }
        }
      } else if (direct && link) ((y = { direct_skipped: fromEnum("anchor_present") }), (X = !0));
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
          ...(caller && { caller: fromEnum(caller) }),
        };
      }
      if (
        (await writeFile(E, n, "utf8"), await unlink(recordPath).catch(() => {}), A && (w !== void 0 || !R))
      )
        (await writeFile(A.path, T, "utf8"), await unlink(A.link).catch(() => {}));
      if (link) await unlink(link).catch(() => {});
      let promise = await new Promise((D) => {
        execFile(
          refresh[0],
          refresh.slice(1),
          { timeout: timeoutMs, cwd: "/", windowsHide: !0, ...Nd("helper") },
          (F) => D(F ? (isENOENT(F) ? 127 : 1) : 0),
        );
      });
      if (promise === 0)
        return (
          await p(),
          logForDebugging(`[agent-proxy] CA installed to system trust via ${refresh[0]}`),
          logFeatureOk("agent_proxy_system_trust", { reused: !1, method: fromEnum("refresh"), ...y }),
          S ? "failed" : "installed"
        );
      ((S = !0),
        logForDebugging(`[agent-proxy] ${refresh[0]} exited ${promise}; falling back to env-var trust`, {
          level: "warn",
        }));
    } catch (error) {
      if (isENOENT(error)) continue;
      ((S = !0),
        logForDebugging(
          `[agent-proxy] system trust install via ${dir} failed: ${error instanceof Error ? error.message : String(error)}`,
          { level: "warn" },
        ));
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
function firstCertificateLine(n) {
  return `${Ee(n) ?? n.match(PEM_CERT_BLOCK_RE)?.[0] ?? n.trimEnd()}
`;
}
//@ chunk-awy329vy.js:94244-94299 placement
function isParsableCertificate(n) {
  try {
    return (new X509Certificate(n), !0);
  } catch {
    return !1;
  }
}
//@ chunk-awy329vy.js:94299-94642 placement
var MAX_CA_RESPONSE_BYTES = 65536,
  CA_BUNDLE_PROBLEM_MESSAGES = {
    oversized: "ca-cert response is larger than any certificate bundle",
    no_certificate: "ca-cert response contains no certificate",
    unparseable_certificate: "ca-cert response contains a certificate that does not parse",
    stray_marker:
      "ca-cert response has PEM framing outside its certificates (truncated, or not a certificate bundle)",
  };
/**
 * 校验 CA 响应：大小上限、至少一张可解析证书、无多余 PEM 标记。
 */
//@ chunk-awy329vy.js:94642-94937 placement
function validateCaBundle(n) {
  if (n.length > MAX_CA_RESPONSE_BYTES) return { ok: !1, problem: "oversized" };
  let match = n.match(PEM_CERT_BLOCK_RE);
  if (!match) return { ok: !1, problem: "no_certificate" };
  if (!match.every(isParsableCertificate)) return { ok: !1, problem: "unparseable_certificate" };
  if (n.replace(PEM_CERT_BLOCK_RE, "").includes("-----BEGIN")) return { ok: !1, problem: "stray_marker" };
  return { ok: !0, bundle: n };
}
/**
 * 系统信任库是否已包含给定 PEM 里的全部证书。
 */
//@ chunk-awy329vy.js:94937-95018 placement
function systemStoreHasCa(n, e) {
  let match = e.match(PEM_CERT_BLOCK_RE);
  return match !== null && match.every((o) => n.includes(o));
}
//@ chunk-awy329vy.js:95018-95209 fingerprint = downloadCaBundle (0.321)
function reportCaFailure(n, e) {
  if (n.outcome === "retry") return n;
  return (
    logForDebugging(`[agent-proxy] ${n.detail}; proxy disabled`, { level: "warn" }),
    logFeatureBad("agent_proxy_init", `agent_proxy_init_ca_${n.code}`, { ca_source: fromEnum(e) }),
    n
  );
}
//@ chunk-awy329vy.js:95209-95222 placement
var na = 65536;
//@ chunk-awy329vy.js:95222-95547 placement
function decodeCaCertEnv(n) {
  let trimmed = n.trim();
  if (trimmed === "") return { ok: !1, reason: "empty" };
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) return { ok: !1, reason: "not base64" };
  let buffer = Buffer.from(trimmed, "base64");
  if (buffer.length === 0 || buffer.length > na)
    return { ok: !1, reason: `decoded to ${buffer.length} bytes` };
  let o = parseCaBundle(buffer.toString("utf8"));
  return o.ok
    ? {
        ok: !0,
        pem:
          o.blocks.join(`
`) +
          `
`,
      }
    : o;
}
//@ chunk-awy329vy.js:95547-95572 placement
var ra = 3,
  oa = 3600000,
  gr = 3;
//@ chunk-awy329vy.js:95572-95626 placement
function Dt(n) {
  return join(n, "..", "system-trust.ca.pem");
}
//@ chunk-awy329vy.js:95626-95660 placement
var ia = /^(nss_|java_truststore_)/;
//@ chunk-awy329vy.js:95660-95747 placement
async function Pr(n, e) {
  return (await Se(join(n, "..", "agent-proxy-ca.crt"), e)) !== "different";
}
//@ chunk-awy329vy.js:95747-95809 placement
function vr(n, e) {
  return n === "failed" || e.some((r) => ia.test(r));
}
//@ chunk-awy329vy.js:95809-95966 placement
function installCaIntoSystemTrust(n, e, r, o, s, h = n.systemCa) {
  return installIntoSystemTrust(e, n.opts?.systemTrustTargets ?? SYSTEM_TRUST_STORES, {
    systemCa: h,
    recordPath: r,
    caller: o,
  })
    .catch(() => "failed")
    .then((l) => (s?.(), l));
}
//@ chunk-awy329vy.js:95966-98306 placement
async function reconcileAgentProxyCa(
  n,
  e,
  r,
  {
    systemTrust: systemTrust,
    toolTrust: toolTrust,
    installDeferred: installDeferred,
    onInstallSettled: onInstallSettled,
    embeddedEndpoint: embeddedEndpoint,
    relayPort: relayPort,
    trust: trust,
  },
) {
  let {
      runtime: runtime,
      baseUrl: baseUrl,
      localCa: localCa,
      caBundlePath: caBundlePath,
      governedGitTools: governedGitTools,
      opts: opts,
    } = n,
    v = Dt(caBundlePath),
    P = installDeferred,
    E = (L) => {
      let D = P ? "deferred" : "reconcile";
      P = !1;
      let F = installCaIntoSystemTrust(n, L, v, D, onInstallSettled);
      if (trust) trust.systemTrust = F;
      return F;
    },
    now = Date.now(),
    M = !1,
    R;
  for (let L = 1; ; L++) {
    if (L > 1) {
      let D = R?.outcome === "retry" ? R : void 0;
      await sleep(opts?.retryDelayMs?.(L) ?? backgroundRetryDelayMs(L, D?.retryAfter ?? null), void 0, {
        unref: !0,
      });
    }
    if (runtime.state !== e) return;
    if (isEssentialTrafficOnly()) {
      if (P) await E(r);
      return;
    }
    if (
      ((R = await fetchCcrCaCert(baseUrl, { budgetMs: opts?.caFetchBudgetMs ?? 15000, tries: 1 })),
      R.outcome !== "retry")
    )
      break;
    if ((onInstallSettled(), P && L >= ra)) {
      if (runtime.state !== e) return;
      await E(r);
    }
    if (!M && Date.now() - now >= (opts?.retryBadAfterMs ?? RETRY_BAD_AFTER_MS))
      ((M = !0),
        logForDebugging(
          `[agent-proxy] CA reconcile: ${R.detail}; still failing after ${L} attempts, retrying anyway`,
          { level: "warn" },
        ),
        logFeatureSad("agent_proxy_ca_reconcile", "fetch_still_failing"));
  }
  if (runtime.state !== e || R === void 0) return;
  if (R.outcome !== "ok") {
    if (
      (logForDebugging(`[agent-proxy] CA reconcile: ${R.detail}; the bundle keeps the environment's CA`, {
        level: "warn",
      }),
      logFeatureSad("agent_proxy_ca_reconcile", "fetch_http_error"),
      P)
    )
      await E(r);
    return;
  }
  let I = compareCaBundles(R.ccrCa, r);
  if (I === "same") {
    if ((logFeatureOk("agent_proxy_ca_reconcile", { changed: !1 }), P)) await E(r);
    return;
  }
  let Y = await writeCaBundle(localCa, R.ccrCa, caBundlePath);
  if (Y.outcome !== "ok") {
    if (
      (logForDebugging(`[agent-proxy] CA reconcile: ${Y.detail}; the bundle keeps the environment's CA`, {
        level: "warn",
      }),
      logFeatureSad("agent_proxy_ca_reconcile", "write_failed"),
      P && runtime.state === e)
    )
      await E(R.ccrCa);
    return;
  }
  if (trust) ((trust.ccrCa = R.ccrCa), (trust.systemTrust = void 0), (trust.installIncomplete = !0));
  if (runtime.state !== e) return;
  if (
    (logForDebugging(
      `[agent-proxy] CA reconcile: the served CA differs from the environment${I === "swapped" ? " (the same two certificates, in the other order)" : ""}; bundle rewritten`,
    ),
    logFeatureOk("agent_proxy_ca_reconcile", { changed: !0, ...(I === "swapped" && { swapped: !0 }) }),
    embeddedEndpoint)
  )
    Mir({ proxyUrl: ce(relayPort), gatewayCa: R.ccrCa });
  if (governedGitTools) return;
  if ((await systemTrust, runtime.state !== e)) return;
  let X = E(R.ccrCa);
  if ((await X, opts?.toolTrust === !1 || runtime.state !== e)) return;
  if ((await toolTrust, runtime.state !== e)) return;
  await configureToolTrust({
    ccrCa: R.ccrCa,
    caBundlePath: caBundlePath,
    hasSystemCa: e.hasSystemCa ?? !1,
    stateDir: join(caBundlePath, ".."),
    systemTrust: X,
    ...(opts?.toolTrust ?? {}),
  })
    .then((L) => {
      if (runtime.state !== e) return;
      (carryJavaTrustStore(e, L),
        (e.toolTrustFailureCodes = L.failureCodes.length > 0 ? L.failureCodes : void 0));
    })
    .catch((L) => {
      (logForDebugging(`[agent-proxy] CA reconcile: tool trust rebuild failed: ${errorMessage(L)}`, {
        level: "warn",
      }),
        logFeatureSad("agent_proxy_ca_reconcile", "tool_trust_rebuild_threw"));
    });
}
//@ chunk-awy329vy.js:98306-99268 placement
function rebuildToolTrustOnCaChange(n, e, r, o) {
  let { runtime: runtime, caBundlePath: caBundlePath, opts: opts } = n,
    u = Dt(caBundlePath),
    { systemTrust: systemTrust, toolTrust: toolTrust } = r,
    w = [],
    T = !1,
    S = (async () => {
      if ((await systemTrust, runtime.state !== e)) return;
      let C = opts?.systemCaPath
          ? await readFile(opts.systemCaPath, "utf8").catch(() => "")
          : await findSystemCaBundle(),
        v = await systemTrust;
      if (v === "failed" || v === void 0) await unlink(u).catch(() => {});
      return installCaIntoSystemTrust(n, o, u, "watch", void 0, C);
    })(),
    b = (async () => {
      if ((await S, opts?.toolTrust === !1 || runtime.state !== e)) return;
      if ((await toolTrust, runtime.state !== e)) return;
      await configureToolTrust({
        ccrCa: o,
        caBundlePath: caBundlePath,
        hasSystemCa: e.hasSystemCa ?? !1,
        stateDir: join(caBundlePath, ".."),
        systemTrust: S,
        ...(opts?.toolTrust ?? {}),
      })
        .then((C) => {
          if (runtime.state !== e) return;
          (carryJavaTrustStore(e, C),
            (e.toolTrustFailureCodes = C.failureCodes.length > 0 ? C.failureCodes : void 0),
            (w = C.failureCodes));
        })
        .catch((C) => {
          (logForDebugging(`[agent-proxy] CA watch: tool trust rebuild failed: ${errorMessage(C)}`, {
            level: "warn",
          }),
            (T = !0));
        });
    })().then(async () => {
      if (runtime.state !== e) return;
      let C = opts?.toolTrust === !1 || (await Pr(caBundlePath, o)),
        v = T || !C || vr(await S, w);
      if (runtime.state === e) r.installIncomplete = v;
    });
  return ((r.ccrCa = o), (r.systemTrust = S), (r.toolTrust = b), b);
}
//@ chunk-awy329vy.js:99268-100753 placement
async function watchAgentProxyCa(
  n,
  e,
  r,
  {
    intervalMs: intervalMs,
    afterStart: afterStart,
    embeddedEndpoint: embeddedEndpoint,
    relayPort: relayPort,
  },
) {
  let { runtime: runtime, baseUrl: baseUrl, localCa: localCa, caBundlePath: caBundlePath, opts: opts } = n;
  await afterStart;
  let S = !1,
    x = (b, C) => {
      if ((logForDebugging(`[agent-proxy] CA watch: ${b}; checking again later`), !S))
        ((S = !0), logFeatureSad("agent_proxy_ca_watch", C));
    };
  for (;;) {
    if (
      (await sleep(intervalMs, void 0, { unref: !0 }),
      runtime.state !== e || isCleanupStarted() || isEssentialTrafficOnly())
    )
      return;
    let b = await fetchCcrCaCert(baseUrl, { budgetMs: opts?.caFetchBudgetMs ?? 15000, tries: 1 });
    if (runtime.state !== e) return;
    if (b.outcome !== "ok") {
      x(b.detail, b.outcome === "retry" ? "fetch_failed" : "fetch_http_error");
      continue;
    }
    if (!parseCaBundle(b.ccrCa).ok) {
      x("the served CA does not parse", "unparsable");
      continue;
    }
    let C = compareCaBundles(b.ccrCa, r.ccrCa);
    if (C === "same") {
      if (((S = !1), !r.installIncomplete)) continue;
      if (r.installRetries >= gr) {
        (logForDebugging(
          `[agent-proxy] CA watch: a trust store did not take the CA after ${gr} more tries; leaving it until the CA changes`,
          { level: "warn" },
        ),
          logFeatureSad("agent_proxy_ca_watch", "install_incomplete"),
          (r.installIncomplete = !1));
        continue;
      }
      (r.installRetries++,
        logForDebugging("[agent-proxy] CA watch: trust stores refreshing again for the CA the bundle holds"),
        await rebuildToolTrustOnCaChange(n, e, r, b.ccrCa));
      continue;
    }
    let v = await writeCaBundle(localCa, b.ccrCa, caBundlePath);
    if (v.outcome !== "ok") {
      x(v.detail, "write_failed");
      continue;
    }
    if (((S = !1), (r.installRetries = 0), runtime.state !== e)) return;
    if (
      (logForDebugging(
        `[agent-proxy] CA watch: the served CA changed${C === "swapped" ? " (the same two certificates, in the other order)" : ""}; bundle rewritten, trust stores refreshing`,
      ),
      logFeatureOk("agent_proxy_ca_watch", { changed: !0, ...(C === "swapped" && { swapped: !0 }) }),
      embeddedEndpoint)
    )
      Mir({ proxyUrl: ce(relayPort), gatewayCa: b.ccrCa });
    await rebuildToolTrustOnCaChange(n, e, r, b.ccrCa);
  }
}
/**
 * 从会话代理取 CA 证书：在预算时间内多次尝试，5xx/408/429 或证书无效时重试，其他非 2xx 为致命错误，成功返回证书包。
 */
//@ chunk-awy329vy.js:100753-101403 placement
async function fetchCcrCaCert(
  baseUrl,
  { budgetMs: budgetMs, tries: tries, viaStandaloneProxy: viaStandaloneProxy = !1 },
) {
  let timeout = AbortSignal.timeout(budgetMs),
    lastError = "",
    retryAfter = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    retryAfter = null;
    try {
      let url = `${baseUrl}${Dto}/ca-cert`,
        response = await fetch(url, {
          signal: timeout,
          ...(viaStandaloneProxy && getProxyFetchOptions({ url: url })),
          ...getTLSFetchOptions(void 0),
        });
      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        ((lastError = `status ${response.status}`), (retryAfter = response.headers.get("retry-after")));
        continue;
      }
      if (!response.ok)
        return { outcome: "fatal", code: "http_error", detail: `ca-cert fetch ${response.status}` };
      let validation = validateCaBundle(await response.text());
      if (!validation.ok) {
        lastError = CA_BUNDLE_PROBLEM_MESSAGES[validation.problem];
        continue;
      }
      return { outcome: "ok", ccrCa: validation.bundle };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { outcome: "retry", detail: `ca-cert fetch exhausted (${lastError})`, retryAfter: retryAfter };
}
//@ chunk-awy329vy.js:101403-101670 placement
async function writeCaBundle(n, e, r) {
  try {
    (await mkdir(join(r, ".."), { recursive: !0 }), await writeFileAtomic(r, da(n, e)));
  } catch (error) {
    let s = `ca-bundle write failed (${errorMessage(error)})`;
    if (SSr(error)) return { outcome: "retry", detail: s, retryAfter: null };
    return { outcome: "fatal", code: "write_failed", detail: s };
  }
  return { outcome: "ok" };
}
//@ chunk-awy329vy.js:101670-101961 placement
async function writeAwsConfigOnce(n) {
  try {
    (await mkdir(join(n, ".."), { recursive: !0, mode: 448 }),
      await writeFile(
        n,
        `[default]
s3 =
  payload_signing_enabled = false
`,
        { flag: "wx", mode: 384 },
      ));
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    logForDebugging(
      `[agent-proxy] aws config write failed: ${error instanceof Error ? error.message : String(error)}`,
      { level: "warn" },
    );
  }
}
//@ chunk-awy329vy.js:101961-102006 placement
function ce(n) {
  return `http://127.0.0.1:${n}`;
}
//@ chunk-awy329vy.js:102006-102038 placement
function da(n, e) {
  return (
    n +
    `
` +
    e
  );
}
//@ chunk-hm0ce8vc.js:54310-54413 fingerprint = SYSTEM_CA_BUNDLE (0.658)
var SYSTEM_CA_BUNDLE = ["/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt"],
  MAX_SYSTEM_CA_BYTES = 1048576,
  MAX_CA_TOTAL_BYTES = 8388608;

export { SYSTEM_CA_BUNDLE, MAX_SYSTEM_CA_BYTES, MAX_CA_TOTAL_BYTES, PLACEHOLDER_CREDENTIAL_KEYS };
