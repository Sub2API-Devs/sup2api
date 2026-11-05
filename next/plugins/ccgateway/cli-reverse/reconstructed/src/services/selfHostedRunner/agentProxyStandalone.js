/**
 * services/selfHostedRunner/agentProxyStandalone.ts
 *
 * 2.1.316 新增：自托管 runner 的独立代理中继模式：读取会话隧道配置并启动中继，或给出拒绝原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-80gbjtkg.js (24)
 * attribution: placement 24
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getCACertificates, loadExtraCACerts } from "../../utils/caCerts.js";
import { getMTLSConfig, loadMTLSClientMaterial } from "../../utils/mtls.js";
import { startEgressProxy, ProxyAuthorizationMintError } from "./egressProxy.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  getErrnoCode,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { proxyEnvForSubprocess } from "../../utils/subprocessEnv.js";
import { isEnvDefinedFalsy } from "../../utils/envUtils.js";
import { getPlatform } from "../../utils/platform.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { clearProxyCache, configureGlobalAgents } from "../../utils/proxy.js";

//@ chunk-80gbjtkg.js:19974-20106 placement
var AGENT_PROXY_STANDALONE_RELAY_MODE = "agent_proxy_standalone";
var joined = ["localhost", "127.0.0.1", "::1", "127.0.0.0/8", "0.0.0.0/8", "::", "host.docker.internal"].join(
  ",",
);
//@ chunk-80gbjtkg.js:20106-20132 placement
class relayForwarderSlot {
  forwarder = undefined;
}
//@ chunk-80gbjtkg.js:20132-20157 placement
/**
 * 按 host 保存的独立 agent 代理转发器状态。
 */
var agentProxyForwarderSlots = new HostScoped(() => new relayForwarderSlot());
//@ chunk-80gbjtkg.js:20157-20194 placement
/**
 * 取当前 host 的中继转发器状态（是否在跑、URL）。
 */
function currentRelayForwarder() {
  return agentProxyForwarderSlots.of(getRootSession().host);
}
//@ chunk-80gbjtkg.js:20194-20240 placement
function isAgentProxyStandaloneActive() {
  return currentRelayForwarder().forwarder !== undefined;
}
//@ chunk-80gbjtkg.js:20240-20282 placement
function agentProxyStandaloneProxyUrl() {
  return currentRelayForwarder().forwarder?.url;
}
//@ chunk-80gbjtkg.js:20282-22849 placement
async function startAgentProxyStandaloneRelay() {
  if (env.CCR_AGENT_PROXY_RELAY_MODE !== AGENT_PROXY_STANDALONE_RELAY_MODE)
    return {
      kind: "off",
    };
  let SELF_HOSTED_RUNNER_AGENT_PROXY_URL = env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL;
  env.unset("CCR_AGENT_PROXY_RELAY_MODE");
  env.unset("SELF_HOSTED_RUNNER_AGENT_PROXY_URL");
  env.unset("CCR_AGENT_PROXY_ENABLED");
  env.unset("AGENT_PROXY_URL");
  env.unset("AGENT_PROXY_AUTH_TOKEN");
  env.unset("CCR_AGENT_PROXY_CA_CERT_B64");
  if (env.CLAUDE_CODE_ENVIRONMENT_KIND !== "byoc") {
    logFeatureBad("agent_proxy_standalone", "not_byoc");
    return {
      kind: "failed",
      cause: "environment",
      message:
        "This session was asked to send its traffic through your self-hosted agent proxy, which only a self-hosted runner's session can do. Claude Code does not start rather than connect directly.",
    };
  }
  let agentProxyUrl = parseAgentProxyUrl(SELF_HOSTED_RUNNER_AGENT_PROXY_URL);
  if (!agentProxyUrl.ok) {
    logFeatureBad("agent_proxy_standalone", `url_${agentProxyUrl.code}`);
    return {
      kind: "failed",
      cause: "url",
      message: agentProxyUrl.message,
    };
  }
  let sessionTunnelAuth = await readSessionTunnelAuth();
  let sessionId = sessionTunnelAuth?.sessionId;
  if (!sessionTunnelAuth || !sessionId || sessionId.includes(":")) {
    logFeatureBad("agent_proxy_standalone", "no_session_id");
    return {
      kind: "failed",
      cause: "session",
      message: `${PROXY_AUTH_FAILED_TEXT}: this session has no usable session id.`,
    };
  }
  if (!sessionTunnelAuth.token()) {
    logFeatureBad("agent_proxy_standalone", "no_token");
    return {
      kind: "failed",
      cause: "session",
      message: `${PROXY_AUTH_FAILED_TEXT}: this session has no session token.`,
    };
  }
  await reloadCertsIfChanged();
  let caSnapshot = caEnvSnapshot();
  let caCertificates = getCACertificates();
  let clientCertSnapshot = envSnapshot(CLIENT_CERT_ENV_VARS);
  let mtlsConfig = getMTLSConfig();
  let pendingCertRefresh;
  let forwarder;
  try {
    forwarder = await startEgressProxy({
      upstreamProxyUrl: agentProxyUrl.url.href,
      minter: {
        async mint() {
          let token = sessionTunnelAuth.token();
          if (!token) throw new ProxyAuthorizationMintError("the session token is not available");
          return `Basic ${Buffer.from(`${sessionId}:${token}`).toString("base64")}`;
        },
      },
      upstreamTls: () => {
        let caCertificatesCopy = caEnvSnapshot() === caSnapshot ? getCACertificates() : caCertificates;
        let mtlsConfigCopy =
          envSnapshot(CLIENT_CERT_ENV_VARS) === clientCertSnapshot ? getMTLSConfig() : mtlsConfig;
        return {
          ...(mtlsConfigCopy && {
            cert: mtlsConfigCopy.cert,
            key: mtlsConfigCopy.key,
            passphrase: mtlsConfigCopy.passphrase,
          }),
          ...(caCertificatesCopy && {
            ca: caCertificatesCopy,
          }),
          rejectUnauthorized: true,
        };
      },
      onUpstreamFailure: () => {
        pendingCertRefresh ??= refreshProxyIfCertsChanged().finally(() => {
          pendingCertRefresh = undefined;
        });
        return pendingCertRefresh;
      },
      logLabel: "agent-proxy-standalone",
      unrefListener: true,
      connectOnly: true,
      onStatus: (statusMessage) =>
        logForDebugging(statusMessage, {
          level: "warn",
        }),
      onDebug: (debugMessage) => logForDebugging(debugMessage),
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    logFeatureBad("agent_proxy_standalone", "listener_failed");
    logForDebugging(`[agent-proxy-standalone] forwarder failed to start: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      kind: "failed",
      cause: "listener",
      message: `Claude Code could not start its local forwarder to the proxy named by SELF_HOSTED_RUNNER_AGENT_PROXY_URL${errnoCode ? ` (${errnoCode})` : ""}, and does not start without it. Start a new session; if this keeps happening, check that the runner container allows listening on 127.0.0.1.`,
    };
  }
  currentRelayForwarder().forwarder = forwarder;
  for (let proxyEnvName of PROXY_ENV_NAMES) env.set(proxyEnvName, forwarder.url);
  env.set("NO_PROXY", joined);
  env.set("no_proxy", joined);
  for (let [key, value] of Object.entries(proxyEnvForSubprocess(process.env)))
    if (key !== "CLOUDSDK_PROXY_PASSWORD") process.env[key] = value;
  env.set("CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER", false);
  logForDebugging(
    `[agent-proxy-standalone] routing through ${agentProxyUrl.url.protocol}//${agentProxyUrl.url.host} via 127.0.0.1:${forwarder.port}`,
  );
  logFeatureOk("agent_proxy_standalone");
  return {
    kind: "on",
    port: forwarder.port,
  };
}
//@ chunk-80gbjtkg.js:22849-22887 placement
function isStandaloneRelayMode(relayMode) {
  return relayMode?.trim() === AGENT_PROXY_STANDALONE_RELAY_MODE;
}
//@ chunk-80gbjtkg.js:22887-22952 placement
var RUNNER_AGENT_PROXY_URL_SETTING = "--agent-proxy-url / SELF_HOSTED_RUNNER_AGENT_PROXY_URL";
//@ chunk-80gbjtkg.js:22952-22995 placement
function runnerUsesAgentProxyStandalone(relayMode, runnerProxyUrl) {
  return isStandaloneRelayMode(relayMode) || runnerProxyUrl !== undefined;
}
//@ chunk-80gbjtkg.js:22995-23088 placement
var AGENT_PROXY_TOGGLE_ENV_VARS = [
  "CCR_AGENT_PROXY_ENABLED",
  "CCR_EGRESS_GATEWAY_ENABLED",
  "CCR_UPSTREAM_PROXY_ENABLED",
];
//@ chunk-80gbjtkg.js:23088-23372 placement
function hostedRelayReason(serverEnv) {
  if (serverEnv === undefined) return "no_server_config";
  let trimmed = serverEnv.CCR_AGENT_PROXY_RELAY_MODE?.trim();
  if (trimmed === "selective" || trimmed === "all") return "hosted_relay";
  if (trimmed && trimmed !== "off" && trimmed !== AGENT_PROXY_STANDALONE_RELAY_MODE)
    return "unknown_relay_mode";
  if (
    AGENT_PROXY_TOGGLE_ENV_VARS.some((envName) => {
      let trimmed = serverEnv[envName]?.trim();
      return !!trimmed && !isEnvDefinedFalsy(trimmed);
    })
  )
    return "hosted_relay";
  return;
}
//@ chunk-80gbjtkg.js:23372-27069 placement
function agentProxyStandaloneRefusal(request) {
  let hasRunnerProxyUrl = request.runnerProxyUrl !== undefined;
  if (!runnerUsesAgentProxyStandalone(request.serverEnv?.CCR_AGENT_PROXY_RELAY_MODE, request.runnerProxyUrl))
    return;
  let hostedReason = hasRunnerProxyUrl ? hostedRelayReason(request.serverEnv) : undefined;
  if (hostedReason !== undefined) {
    logFeatureBad("agent_proxy_standalone", hostedReason);
    let relayDescription =
      hostedReason === "hosted_relay"
        ? "This environment sends sessions through Anthropic's relay"
        : hostedReason === "unknown_relay_mode"
          ? "This environment names a relay mode this runner does not recognize"
          : "The server sent no session config to check the relay mode against";
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Session ${request.sessionId}: ${relayDescription}, so a runner started with ${request.runnerProxySetting} can't run it. Remove ${request.runnerProxySetting} from this runner, or change the environment's relay mode`,
      "runner started with an agent proxy URL refuses a session on the hosted relay, with an unknown relay mode, or without a config",
    );
  }
  switch (request.governedGit) {
    case "off":
      break;
    case "legacy":
      logFeatureBad("agent_proxy_standalone", "governed_git");
      return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        hasRunnerProxyUrl
          ? `Session ${request.sessionId} uses Anthropic-managed git (governed git), which this runner refuses: it routes every session through the proxy that ${request.runnerProxySetting} names, and only the self-hosted runner can send governed git through that proxy. Run this pool's Anthropic-managed git sessions on a self-hosted runner, or on a runner started without a proxy URL`
          : `Session ${request.sessionId} asks for Anthropic-managed git (governed git) and for routing through your self-hosted agent proxy, which this runner cannot combine: only the self-hosted runner can send governed git through that proxy. Run this pool's sessions on a self-hosted runner, or turn off one of the two for the pool`,
        "session pairs governed git with the agent_proxy_standalone relay mode on a runner that cannot route it",
      );
    case "on": {
      if (request.gitConfigArmed !== true) {
        logFeatureBad("agent_proxy_standalone", "governed_git_no_git_config");
        return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${request.sessionId} uses Anthropic-managed git (governed git) through your self-hosted agent proxy without its git setup, which this runner refuses: without it, git would not trust the proxy's route to GitHub`,
          "runner refuses a governed-git block without its git config arm in the agent_proxy_standalone relay mode",
        );
      }
      if (getPlatform() === "windows") {
        logFeatureBad("agent_proxy_standalone", "governed_git_windows");
        return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${request.sessionId} uses Anthropic-managed git (governed git) through your self-hosted agent proxy, which this runner refuses on Windows: the session's git config would hold the credential for the proxy's local forwarder, and Windows does not keep that file private to the runner's user. Run this pool's Anthropic-managed git sessions on a Linux or macOS runner`,
          "runner refuses governed git in the agent_proxy_standalone relay mode on Windows",
        );
      }
      break;
    }
    default:
      request.governedGit;
  }
  if (request.egressListener) {
    logFeatureBad("agent_proxy_standalone", "runner_egress_listener");
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      hasRunnerProxyUrl
        ? `Session ${request.sessionId} routes through the proxy that ${request.runnerProxySetting} names, which this runner cannot combine with its --proxy-authorization-command / --proxy-authorization-file egress listener: the session would reach that proxy without the listener. Start this runner with only one of ${request.runnerProxySetting} and --proxy-authorization-command / --proxy-authorization-file`
        : `Session ${request.sessionId} routes through your self-hosted agent proxy, as the pool's relay mode asks, which this runner cannot combine with its --proxy-authorization-command / --proxy-authorization-file egress listener: the session would reach that proxy without the listener. Run this pool's sessions on a runner started with ${request.runnerProxySetting} and without --proxy-authorization-command / --proxy-authorization-file, or change the pool's relay mode`,
      "session uses the agent_proxy_standalone relay mode on a runner with a --proxy-authorization-* egress listener",
    );
  }
  return;
}
//@ chunk-80gbjtkg.js:27069-27119 placement
function childRelayEnvValue(relayMode, runnerProxyUrl) {
  return runnerProxyUrl !== undefined ? AGENT_PROXY_STANDALONE_RELAY_MODE : relayMode?.trim();
}
//@ chunk-80gbjtkg.js:27119-27381 placement
function checkRunnerAgentProxyStandaloneUrl(rawUrl, envName) {
  if (rawUrl === undefined) return;
  let agentProxyUrl = parseAgentProxyUrl(rawUrl, {
    name: envName,
    failureSuffix: `Set ${envName} to your proxy's https:// URL (for example https://proxy.internal:3128) and restart the runner.`,
  });
  if (!agentProxyUrl.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      agentProxyUrl.message,
      "runner agent proxy URL is unusable",
    );
  return agentProxyUrl.url;
}
//@ chunk-80gbjtkg.js:27381-27569 placement
function agentProxyStandaloneRunnerEnv(env) {
  return {
    AGENT_PROXY_URL: undefined,
    AGENT_PROXY_AUTH_TOKEN: undefined,
    CCR_AGENT_PROXY_CA_CERT_B64: undefined,
    CCR_AGENT_PROXY_ENABLED: undefined,
    ...Object.fromEntries(TLS_ENV_VARS.map((envName) => [envName, env[envName]])),
  };
}
//@ chunk-80gbjtkg.js:27569-27853 placement
var CA_ENV_VARS = [
  "NODE_EXTRA_CA_CERTS",
  "CLAUDE_CODE_CERT_STORE",
  "CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP",
  "CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
];
var CLIENT_CERT_ENV_VARS = [
  "CLAUDE_CODE_CLIENT_CERT",
  "CLAUDE_CODE_CLIENT_KEY",
  "CLAUDE_CODE_CLIENT_KEY_PASSPHRASE",
];
var TLS_ENV_VARS = [...CA_ENV_VARS, ...CLIENT_CERT_ENV_VARS];
//@ chunk-80gbjtkg.js:27853-28180 placement
/**
 * 读取会话隧道认证（HTTP MCP 服务时从 stdin 信封，否则从环境）：会话 id 与令牌获取函数。
 */
async function readSessionTunnelAuth() {
  if (isHttpMcpServeInvocation()) {
    let [{ peekSessionTunnelInput }, { parseSessionTunnelEnvelope }] = await Promise.all([
      import("../../entrypoints/sessionTunnelInput.js"),
      import("../../cli/handlers/EX_CONFIG.lazy.js"),
    ]);
    let envelope = parseSessionTunnelEnvelope(peekSessionTunnelInput());
    if (envelope === undefined) return;
    let sessionToken = envelope.session_token;
    return {
      sessionId: envelope.session_id,
      token: () => sessionToken,
    };
  }
  return {
    sessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    token: getSessionIngressAuthToken,
  };
}
//@ chunk-80gbjtkg.js:28180-28222 placement
function envSnapshot(envNames) {
  return jsonStringify(envNames.map((envName) => env[envName]));
}
//@ chunk-80gbjtkg.js:28222-28291 placement
function caEnvSnapshot() {
  return `${envSnapshot(CA_ENV_VARS)}${Boolean(env.CLAUDE_CODE_CLIENT_CERT)}`;
}
//@ chunk-80gbjtkg.js:28291-28372 placement
async function reloadCertsIfChanged() {
  let [extraCACerts, mtlsClientMaterial] = await Promise.all([loadExtraCACerts(), loadMTLSClientMaterial()]);
  return extraCACerts || mtlsClientMaterial.changed;
}
//@ chunk-80gbjtkg.js:28372-28416 placement
async function refreshProxyIfCertsChanged() {
  if (await reloadCertsIfChanged()) {
    clearProxyCache();
    configureGlobalAgents();
  }
}
//@ chunk-80gbjtkg.js:28416-28904 placement
/**
 * 代理相关环境变量名，以及代理地址无法认证时的错误与补救说明。
 */
var PROXY_ENV_NAMES = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"];
var PROXY_AUTH_FAILED_TEXT =
  "Claude Code cannot authenticate to the proxy named by SELF_HOSTED_RUNNER_AGENT_PROXY_URL, and does not start without it";
var PROXY_URL_REMEDY =
  "Start the runner with --agent-proxy-url set to your proxy's https:// URL (for example https://proxy.internal:3128), or set SELF_HOSTED_RUNNER_AGENT_PROXY_URL in its environment, and start a new session. Claude Code does not start without it rather than connect directly.";
//@ chunk-80gbjtkg.js:28904-29892 placement
/**
 * 校验自托管 runner 的代理地址：必须存在、可解析、是带主机的 https URL、不含用户名密码，否则返回带补救说明的错误。
 */
function parseAgentProxyUrl(
  value,
  options = {
    name: "SELF_HOSTED_RUNNER_AGENT_PROXY_URL",
    failureSuffix: PROXY_URL_REMEDY,
  },
) {
  let { name: envName, failureSuffix } = options;
  let trimmed = value?.trim();
  if (!trimmed)
    return {
      ok: false,
      code: "missing",
      message: `This session's runner pool sends its traffic through your own proxy, but ${envName} is not set. ${failureSuffix}`,
    };
  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return {
      ok: false,
      code: "unparsable",
      message: `${envName} cannot be parsed as a URL. ${failureSuffix}`,
    };
  }
  if ((parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") || !parsedUrl.host)
    return {
      ok: false,
      code: "scheme",
      message: `${envName} must be an https:// URL with a host. ${failureSuffix}`,
    };
  if (parsedUrl.protocol === "http:")
    return {
      ok: false,
      code: "plaintext",
      message: `${envName} must use https://, also for a proxy on this machine: Claude Code sends this session's credentials to it and checks the proxy's certificate against the CAs the runner container trusts. ${failureSuffix}`,
    };
  if (parsedUrl.username || parsedUrl.password)
    return {
      ok: false,
      code: "credentials",
      message: `${envName} must not include a user name or password, because Claude Code signs in to the proxy with this session's own credentials. ${failureSuffix}`,
    };
  return {
    ok: true,
    url: parsedUrl,
  };
}
export {
  AGENT_PROXY_STANDALONE_RELAY_MODE,
  isAgentProxyStandaloneActive,
  agentProxyStandaloneProxyUrl,
  agentProxyStandaloneRefusal,
  RUNNER_AGENT_PROXY_URL_SETTING,
  runnerUsesAgentProxyStandalone,
  childRelayEnvValue,
  agentProxyStandaloneRunnerEnv,
  checkRunnerAgentProxyStandaloneUrl,
  startAgentProxyStandaloneRelay,
};
