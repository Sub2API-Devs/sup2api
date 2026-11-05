/**
 * services/mcp/stepUpAuth.ts
 *
 * 2.1.316 新增：MCP 服务器 step-up 重新授权：对话选项、尝试次数与结果文案。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sywnjtqb.js (12), chunk-wvdswywk.js (7)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isSameOriginAsCcr, CCR_SESSION_MCP_PATH, ccrProxyTargetHost } from "./ccrMcpUrls.js";
import { isPluginServerConfig } from "./types.js";
import { hasUniqueQueryParams } from "../analytics/metadata.js";
import { env } from "../../utils/env.js";
import { isCcsTenant, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { getServerKey, describeConnectError } from "./auth.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { normalizeServerNameShort, normalizeMcpServerName } from "../api/deferredToolsState.js";
import { identityEpoch } from "./identityChange.js";
import { confirmWithUser } from "../../utils/permissions/confirmWithUser.js";
import { logMCPDebug } from "../../utils/log.js";
import { redactUrlSecrets } from "../../utils/urlRedaction.js";
import { sanitizeRelayUrl } from "../../utils/sanitization.js";
import { createInformationalSystemMessage } from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wvdswywk.js:528-637 placement
/**
 * 主机名格式的正则。
 */
var TENGU_GLEAMING_CREEK; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RESTRICT_ALL_HOSTS;
var RESTRICT_NO_HOSTS;
var HOSTNAME_RE;
deferInit("chunk-wvdswywk.js:528", () => {
  TENGU_GLEAMING_CREEK = "tengu_gleaming_creek";
  RESTRICT_ALL_HOSTS = {
    mode: "all",
  };
  RESTRICT_NO_HOSTS = {
    mode: "allow",
    hosts: new Set(),
  };
  HOSTNAME_RE = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/;
});
//@ chunk-wvdswywk.js:637-859 placement
function normalizePolicyHost(host) {
  if (typeof host !== "string" || /[\s/:@?#\\[\]%]/.test(host.trim())) return;
  let replaced = host.trim().replace(/\.$/, "");
  let hostname = URL.canParse(`https://${replaced}/`) ? new URL(`https://${replaced}/`).hostname : undefined;
  return hostname !== undefined && HOSTNAME_RE.test(hostname) ? hostname : undefined;
}
//@ chunk-wvdswywk.js:859-1253 placement
/**
 * 读取远程 MCP 主机限制策略：all、allow 或 deny 主机列表，格式错误时采用默认限制。
 */
function remoteHostPolicy() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLEAMING_CREEK, null);
  if (featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined)
    return RESTRICT_ALL_HOSTS;
  if (typeof featureValue_CACHED_MAY_BE_STALE !== "object" || Array.isArray(featureValue_CACHED_MAY_BE_STALE))
    return RESTRICT_NO_HOSTS;
  let { mode, hosts } = featureValue_CACHED_MAY_BE_STALE;
  if (mode === undefined && Object.keys(featureValue_CACHED_MAY_BE_STALE).length === 0)
    return RESTRICT_ALL_HOSTS;
  let mode_2 = typeof mode === "string" ? mode.trim().toLowerCase() : undefined;
  if (mode_2 === "all") return RESTRICT_ALL_HOSTS;
  if ((mode_2 === "allow" || mode_2 === "deny") && Array.isArray(hosts)) {
    let mapped = hosts.map(normalizePolicyHost);
    if (mapped.every((normalized) => normalized !== undefined))
      return {
        mode: mode_2,
        hosts: new Set(mapped),
      };
  }
  return RESTRICT_NO_HOSTS;
}
//@ chunk-wvdswywk.js:1253-1388 placement
function urlHostname(url) {
  if (!URL.canParse(url)) return;
  let url_2 = new URL(url);
  return ["http:", "https:", "ws:", "wss:"].includes(url_2.protocol) ? url_2.hostname : undefined;
}
//@ chunk-wvdswywk.js:1388-1549 placement
function hasPlainAuthority(url) {
  let authority = url?.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i)?.[1];
  return (
    url !== null &&
    authority !== undefined &&
    authority !== "" &&
    !authority.includes("@") &&
    !/[\\\u0000-\u001f\u007f]/.test(url)
  );
}
//@ chunk-wvdswywk.js:1549-1953 placement
/**
 * 取 MCP 配置实际访问的远程主机（claude.ai 连接器、直连地址或经 CCR 代理的目标），不合法时返回 undefined。
 */
function remoteHostOf(config) {
  let host;
  if (config.type === "claudeai-proxy")
    host = config.scope === "claudeai" && hasPlainAuthority(config.url) ? urlHostname(config.url) : undefined;
  else if (config.type === "http" || config.type === "sse" || config.type === "ws") {
    if (!isSameOriginAsCcr(config.url)) host = urlHostname(config.url);
    else if (
      config.scope === "dynamic" &&
      !isPluginServerConfig(config) &&
      CCR_SESSION_MCP_PATH.test(new URL(config.url).pathname) &&
      hasUniqueQueryParams(config.url, ["mcp_url"]) &&
      hasPlainAuthority(new URL(config.url).searchParams.get("mcp_url"))
    )
      host = ccrProxyTargetHost(config.url);
  }
  let replaced = host?.toLowerCase().replace(/\.$/, "");
  return replaced && HOSTNAME_RE.test(replaced) ? replaced : undefined;
}
//@ chunk-wvdswywk.js:1953-2221 placement
/**
 * shouldRestrictRemoteHost：CCR 云会话中按 GrowthBook tengu_gleaming_creek 的 allow/deny 主机列表限制远程 MCP 服务器。
 */
function shouldRestrictRemoteHost(config) {
  {
    let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
    if (
      env.CLAUDE_CODE_REMOTE !== true ||
      (CLAUDE_CODE_ENVIRONMENT_KIND !== undefined && CLAUDE_CODE_ENVIRONMENT_KIND !== "anthropic_cloud") ||
      isCcsTenant()
    )
      return false;
    let policy = remoteHostPolicy();
    if (policy.mode === "all") return false;
    let host = remoteHostOf(config);
    if (host === undefined) return true;
    return policy.mode === "allow" ? !policy.hosts.has(host) : policy.hosts.has(host);
  }
  return false;
}
//@ chunk-sywnjtqb.js:39263-39286 placement
/**
 * 按宿主保存的步进授权状态。
 */
var stepUpStateSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sywnjtqb.js:39263", () => {
  stepUpStateSlot = new HostScoped(() => ({}));
});
//@ chunk-sywnjtqb.js:39286-39323 placement
/**
 * 取当前宿主的步进授权状态。
 */
function getStepUpState() {
  return stepUpStateSlot.of(getRootSession().host);
}
//@ chunk-sywnjtqb.js:39323-39360 placement
/**
 * 创建步进授权的对话框。
 */
function makeStepUpDialog(name) {
  return getStepUpState().make?.(name);
}
//@ chunk-sywnjtqb.js:39360-39419 placement
function isStepUpAuthDialogEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_step_up_auth_dialog", true);
}
//@ chunk-sywnjtqb.js:39419-39537 placement
function scopesInclude(scopes, needed) {
  let granted = new Set(scopes.split(" ").filter(Boolean));
  return needed
    .split(" ")
    .filter(Boolean)
    .every((scope) => granted.has(scope));
}
//@ chunk-sywnjtqb.js:39537-39666 placement
function grantedScopesCover(config, needed) {
  let scopes = config.oauth?.scopes;
  if (!Boolean(scopes || config.oauth?.authServerMetadataUrl)) return true;
  if (!needed || !scopes) return false;
  return scopesInclude(scopes, needed);
}
//@ chunk-sywnjtqb.js:39666-39734 placement
/**
 * 规范化 scope 列表（排序去重）。
 */
function normalizeScopeList(scopes) {
  return scopes.split(" ").filter(Boolean).sort().join(" ");
}
//@ chunk-sywnjtqb.js:39734-39816 placement
/**
 * 该服务器的这组 scope 是否已耗尽重试。
 */
function isStepUpExhausted(name, config, scopes) {
  return (
    getCliOwnedState()
      .stepUpReauthExhausted.get(getServerKey(name, config))
      ?.has(normalizeScopeList(scopes)) ?? false
  );
}
//@ chunk-sywnjtqb.js:39816-40008 placement
function markStepUpExhausted(name, config, grantedScope, scopes) {
  let normalizedGranted = normalizeScopeList(grantedScope);
  let stepUpReauthExhausted = getCliOwnedState().stepUpReauthExhausted;
  let serverKey = getServerKey(name, config);
  let exhaustedScopes = stepUpReauthExhausted.get(serverKey) ?? new Set();
  if (normalizeScopeList(scopes) !== normalizedGranted || exhaustedScopes.has(normalizedGranted)) return;
  logFeatureSad("mcp_step_up_reauth", "rechallenged_after_reauth");
  stepUpReauthExhausted.set(serverKey, exhaustedScopes.add(normalizedGranted));
}
//@ chunk-sywnjtqb.js:40008-40414 placement
var STEP_UP_DIALOG_OPTIONS = [
  {
    value: "reauthenticate",
    label: "Re-authenticate in browser",
    description:
      "Signs this server out until you finish authorizing in the browser (for the scope above plus what it already has); if you do not finish, run /mcp to sign back in. The tool call is retried once afterwards",
  },
  {
    value: "not_now",
    label: "Not now",
    description: "The tool call fails with the permission error; other tools keep working",
  },
];
//@ chunk-sywnjtqb.js:40414-40586 placement
function stepUpResultMessage(content, name, scope) {
  let header = `Re-authenticated MCP server "${normalizeServerNameShort(name)}" (scope: "${normalizeMcpServerName(scope, undefined, "none")}")`;
  return typeof content === "string"
    ? `${header}

${content}`
    : [
        {
          type: "text",
          text: header,
        },
        ...(content ?? []),
      ];
}
//@ chunk-sywnjtqb.js:40586-43115 placement
/**
 * runStepUpReauth：工具调用遇到 insufficient_scope（step-up）时询问用户是否重新授权，执行 OAuth、重连并接管新连接，同一服务器并发只跑一次。
 */
function runStepUpReauth({
  serverName,
  config,
  requestedScope,
  canUseTool,
  toolUseContext,
  signal,
  performOAuthFlow,
  reconnect,
  discard,
  isPermitted,
}) {
  let stepUpReauthFlights = getCliOwnedState().stepUpReauthFlights;
  let serverKey = getServerKey(serverName, config);
  let inFlight = stepUpReauthFlights.get(serverKey);
  if (inFlight !== undefined) return inFlight;
  let flow = (async () => {
    let epochAtStart = identityEpoch();
    let stillAvailable = () =>
      identityEpoch() === epochAtStart &&
      isPermitted(serverName, config) &&
      toolUseContext
        .getMcp()
        .clients.some(
          (client) =>
            client.name === serverName &&
            client.config.type === "http" &&
            getServerKey(client.name, client.config) === serverKey,
        );
    let scopeLabel = normalizeMcpServerName(requestedScope, undefined, "none");
    if (scopeLabel !== requestedScope) {
      logFeatureSad("mcp_step_up_reauth", "scope_not_displayable");
      return "declined";
    }
    let answer = await confirmWithUser({
      canUseTool,
      toolUseContext,
      source: "mcp_step_up_reauth",
      header: "MCP",
      question: `MCP server "${normalizeServerNameShort(serverName)}" needs additional permissions for this tool (it asked for the scope "${scopeLabel}"). Re-authenticate now?`,
      choices: STEP_UP_DIALOG_OPTIONS,
    });
    if (answer.kind !== "chose" || answer.value !== "reauthenticate") {
      logFeatureSad(
        "mcp_step_up_reauth",
        answer.kind === "unanswered" ? answer.reason : answer.kind === "chose" ? "declined" : answer.kind,
      );
      return "declined";
    }
    if (!stillAvailable()) {
      logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_consent");
      return "failed";
    }
    try {
      await performOAuthFlow(
        serverName,
        config,
        (authorizationUrl) => {
          logMCPDebug(serverName, `Step-up re-auth authorization URL: ${redactUrlSecrets(authorizationUrl)}`);
          let openingText = `Opening your browser to re-authenticate MCP server "${normalizeServerNameShort(serverName)}".`;
          let linkSafe = sanitizeRelayUrl(authorizationUrl) === authorizationUrl;
          toolUseContext.appendSystemMessage?.({
            ...createInformationalSystemMessage(
              linkSafe
                ? `${openingText} If it doesn't open, use this link to the server's sign-in page: ${authorizationUrl}`
                : `${openingText} If it doesn't open, run /mcp to sign back in; its sign-in screen shows the link.`,
              "suggestion",
            ),
            persist: false,
          });
        },
        signal,
      );
    } catch (error) {
      logMCPDebug(serverName, `Step-up re-auth flow failed: ${describeConnectError(error, config)}`);
      if (signal.aborted) logFeatureSad("mcp_step_up_reauth", "cancelled");
      else logFeatureBad("mcp_step_up_reauth", "flow_failed");
      return "failed";
    }
    if (!stillAvailable()) {
      logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_flow");
      return "failed";
    }
    if (toolUseContext.session.mcpSessionWiring.connections() === undefined) {
      logFeatureBad("mcp_step_up_reauth", "no_connections_owner");
      return "failed";
    }
    try {
      let connection = await reconnect(serverName, config);
      if (identityEpoch() !== epochAtStart) {
        logFeatureBad("mcp_step_up_reauth", "identity_changed");
        return "failed";
      }
      let connections = toolUseContext.session.mcpSessionWiring.connections();
      if (!stillAvailable() || connections === undefined) {
        await discard(serverName, config).catch((error) =>
          logMCPDebug(serverName, `Orphan cleanup failed: ${describeConnectError(error, config)}`),
        );
        connections?.markReconnectDiscarded(serverName, config);
        logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_reconnect");
        return "failed";
      }
      if (connections.adoptServer(serverName, connection) !== "adopted") {
        await discard(serverName, config).catch((error) =>
          logMCPDebug(serverName, `Orphan cleanup failed: ${describeConnectError(error, config)}`),
        );
        logFeatureBad("mcp_step_up_reauth", "adopt_refused");
        return "failed";
      }
      if (connection.client.type !== "connected") {
        logFeatureBad("mcp_step_up_reauth", "reconnect_not_connected");
        return "failed";
      }
    } catch (error) {
      logMCPDebug(serverName, `Step-up re-auth reconnect failed: ${describeConnectError(error, config)}`);
      logFeatureBad("mcp_step_up_reauth", "reconnect_failed");
      return "failed";
    }
    logFeatureOk("mcp_step_up_reauth");
    return "reauthenticated";
  })().finally(() => {
    stepUpReauthFlights.delete(serverKey);
  });
  stepUpReauthFlights.set(serverKey, flow);
  return flow;
}
export {
  shouldRestrictRemoteHost,
  makeStepUpDialog,
  stepUpResultMessage,
  markStepUpExhausted,
  isStepUpAuthDialogEnabled,
  grantedScopesCover,
  isStepUpExhausted,
  runStepUpReauth,
  hasPlainAuthority,
};
