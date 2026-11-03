/**
 * services/mcp/stepUpAuth.ts
 *
 * 2.1.316 新增：MCP 服务器 step-up 重新授权：对话选项、尝试次数与结果文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (19)
 * attribution: placement 19
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

//@ chunk-8t8n4kdh.js:37526-37639 placement
/**
 * 主机名格式的正则。
 */
var TENGU_GLEAMING_CREEK = "tengu_gleaming_creek";
var RESTRICT_ALL_HOSTS = {
  mode: "all",
};
var RESTRICT_NO_HOSTS = {
  mode: "allow",
  hosts: new Set(),
};
var HOSTNAME_RE = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/;
//@ chunk-8t8n4kdh.js:37639-37863 placement
function normalizePolicyHost(e) {
  if (typeof e !== "string" || /[\s/:@?#\\[\]%]/.test(e.trim())) return;
  let replaced = e.trim().replace(/\.$/, "");
  let hostname = URL.canParse(`https://${replaced}/`) ? new URL(`https://${replaced}/`).hostname : undefined;
  return hostname !== undefined && HOSTNAME_RE.test(hostname) ? hostname : undefined;
}
//@ chunk-8t8n4kdh.js:37863-38265 placement
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
  let s = typeof mode === "string" ? mode.trim().toLowerCase() : undefined;
  if (s === "all") return RESTRICT_ALL_HOSTS;
  if ((s === "allow" || s === "deny") && Array.isArray(hosts)) {
    let mapped = hosts.map(normalizePolicyHost);
    if (mapped.every((y) => y !== undefined))
      return {
        mode: s,
        hosts: new Set(mapped),
      };
  }
  return RESTRICT_NO_HOSTS;
}
//@ chunk-8t8n4kdh.js:38265-38401 placement
function urlHostname(url) {
  if (!URL.canParse(url)) return;
  let n = new URL(url);
  return ["http:", "https:", "ws:", "wss:"].includes(n.protocol) ? n.hostname : undefined;
}
//@ chunk-8t8n4kdh.js:38401-38563 placement
function hasPlainAuthority(e) {
  let n = e?.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i)?.[1];
  return e !== null && n !== undefined && n !== "" && !n.includes("@") && !/[\\\u0000-\u001f\u007f]/.test(e);
}
//@ chunk-8t8n4kdh.js:38563-38973 placement
/**
 * 取 MCP 配置实际访问的远程主机（claude.ai 连接器、直连地址或经 CCR 代理的目标），不合法时返回 undefined。
 */
function remoteHostOf(e) {
  let n;
  if (e.type === "claudeai-proxy")
    n = e.scope === "claudeai" && hasPlainAuthority(e.url) ? urlHostname(e.url) : undefined;
  else if (e.type === "http" || e.type === "sse" || e.type === "ws") {
    if (!isSameOriginAsCcr(e.url)) n = urlHostname(e.url);
    else if (
      e.scope === "dynamic" &&
      !isPluginServerConfig(e) &&
      CCR_SESSION_MCP_PATH.test(new URL(e.url).pathname) &&
      hasUniqueQueryParams(e.url, ["mcp_url"]) &&
      hasPlainAuthority(new URL(e.url).searchParams.get("mcp_url"))
    )
      n = ccrProxyTargetHost(e.url);
  }
  let replaced = n?.toLowerCase().replace(/\.$/, "");
  return replaced && HOSTNAME_RE.test(replaced) ? replaced : undefined;
}
//@ chunk-8t8n4kdh.js:38973-39242 placement
/**
 * shouldRestrictRemoteHost：CCR 云会话中按 GrowthBook tengu_gleaming_creek 的 allow/deny 主机列表限制远程 MCP 服务器。
 */
function shouldRestrictRemoteHost(e) {
  {
    let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
    if (
      env.CLAUDE_CODE_REMOTE !== true ||
      (CLAUDE_CODE_ENVIRONMENT_KIND !== undefined && CLAUDE_CODE_ENVIRONMENT_KIND !== "anthropic_cloud") ||
      isCcsTenant()
    )
      return false;
    let r = remoteHostPolicy();
    if (r.mode === "all") return false;
    let s = remoteHostOf(e);
    if (s === undefined) return true;
    return r.mode === "allow" ? !r.hosts.has(s) : r.hosts.has(s);
  }
  return false;
}
//@ chunk-8t8n4kdh.js:39242-39265 placement
/**
 * 按宿主保存的步进授权状态。
 */
var stepUpStateSlot = new HostScoped(() => ({}));
//@ chunk-8t8n4kdh.js:39265-39302 placement
/**
 * 取当前宿主的步进授权状态。
 */
function getStepUpState() {
  return stepUpStateSlot.of(getRootSession().host);
}
//@ chunk-8t8n4kdh.js:39302-39339 placement
/**
 * 创建步进授权的对话框。
 */
function makeStepUpDialog(name) {
  return getStepUpState().make?.(name);
}
//@ chunk-8t8n4kdh.js:39339-39398 placement
function isStepUpAuthDialogEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_step_up_auth_dialog", true);
}
//@ chunk-8t8n4kdh.js:39398-39516 placement
function scopesInclude(scopes, n) {
  let r = new Set(scopes.split(" ").filter(Boolean));
  return n
    .split(" ")
    .filter(Boolean)
    .every((s) => r.has(s));
}
//@ chunk-8t8n4kdh.js:39516-39645 placement
function grantedScopesCover(config, requestedScope) {
  let scopes = config.oauth?.scopes;
  if (!Boolean(scopes || config.oauth?.authServerMetadataUrl)) return true;
  if (!requestedScope || !scopes) return false;
  return scopesInclude(scopes, requestedScope);
}
//@ chunk-8t8n4kdh.js:39645-39713 placement
/**
 * 规范化 scope 列表（排序去重）。
 */
function normalizeScopeList(e) {
  return e.split(" ").filter(Boolean).sort().join(" ");
}
//@ chunk-8t8n4kdh.js:39713-39795 placement
/**
 * 该服务器的这组 scope 是否已耗尽重试。
 */
function isStepUpExhausted(name, config, requestedScope) {
  return (
    getCliOwnedState()
      .stepUpReauthExhausted.get(getServerKey(name, config))
      ?.has(normalizeScopeList(requestedScope)) ?? false
  );
}
//@ chunk-8t8n4kdh.js:39795-39987 placement
function markStepUpExhausted(name, config, r, requestedScope) {
  let h = normalizeScopeList(r);
  let stepUpReauthExhausted = getCliOwnedState().stepUpReauthExhausted;
  let serverKey = getServerKey(name, config);
  let w = stepUpReauthExhausted.get(serverKey) ?? new Set();
  if (normalizeScopeList(requestedScope) !== h || w.has(h)) return;
  logFeatureSad("mcp_step_up_reauth", "rechallenged_after_reauth");
  stepUpReauthExhausted.set(serverKey, w.add(h));
}
//@ chunk-8t8n4kdh.js:39987-40393 placement
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
//@ chunk-8t8n4kdh.js:40393-40565 placement
function stepUpResultMessage(content, name, r) {
  let s = `Re-authenticated MCP server "${normalizeServerNameShort(name)}" (scope: "${normalizeMcpServerName(r, undefined, "none")}")`;
  return typeof content === "string"
    ? `${s}

${content}`
    : [
        {
          type: "text",
          text: s,
        },
        ...(content ?? []),
      ];
}
//@ chunk-8t8n4kdh.js:40565-43097 placement
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
  let ce = stepUpReauthFlights.get(serverKey);
  if (ce !== undefined) return ce;
  let Q = (async () => {
    let ie = identityEpoch();
    let ge = () =>
      identityEpoch() === ie &&
      isPermitted(serverName, config) &&
      toolUseContext
        .getMcp()
        .clients.some(
          (client) =>
            client.name === serverName &&
            client.config.type === "http" &&
            getServerKey(client.name, client.config) === serverKey,
        );
    let Ie = normalizeMcpServerName(requestedScope, undefined, "none");
    if (Ie !== requestedScope) {
      logFeatureSad("mcp_step_up_reauth", "scope_not_displayable");
      return "declined";
    }
    let G = await confirmWithUser({
      canUseTool,
      toolUseContext,
      source: "mcp_step_up_reauth",
      header: "MCP",
      question: `MCP server "${normalizeServerNameShort(serverName)}" needs additional permissions for this tool (it asked for the scope "${Ie}"). Re-authenticate now?`,
      choices: STEP_UP_DIALOG_OPTIONS,
    });
    if (G.kind !== "chose" || G.value !== "reauthenticate") {
      logFeatureSad(
        "mcp_step_up_reauth",
        G.kind === "unanswered" ? G.reason : G.kind === "chose" ? "declined" : G.kind,
      );
      return "declined";
    }
    if (!ge()) {
      logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_consent");
      return "failed";
    }
    try {
      await performOAuthFlow(
        serverName,
        config,
        (Pe) => {
          logMCPDebug(serverName, `Step-up re-auth authorization URL: ${redactUrlSecrets(Pe)}`);
          let ke = `Opening your browser to re-authenticate MCP server "${normalizeServerNameShort(serverName)}".`;
          let nt = sanitizeRelayUrl(Pe) === Pe;
          toolUseContext.appendSystemMessage?.({
            ...createInformationalSystemMessage(
              nt
                ? `${ke} If it doesn't open, use this link to the server's sign-in page: ${Pe}`
                : `${ke} If it doesn't open, run /mcp to sign back in; its sign-in screen shows the link.`,
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
    if (!ge()) {
      logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_flow");
      return "failed";
    }
    if (toolUseContext.session.mcpSessionWiring.connections() === undefined) {
      logFeatureBad("mcp_step_up_reauth", "no_connections_owner");
      return "failed";
    }
    try {
      let Pe = await reconnect(serverName, config);
      if (identityEpoch() !== ie) {
        logFeatureBad("mcp_step_up_reauth", "identity_changed");
        return "failed";
      }
      let ke = toolUseContext.session.mcpSessionWiring.connections();
      if (!ge() || ke === undefined) {
        await discard(serverName, config).catch((error) =>
          logMCPDebug(serverName, `Orphan cleanup failed: ${describeConnectError(error, config)}`),
        );
        ke?.markReconnectDiscarded(serverName, config);
        logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_reconnect");
        return "failed";
      }
      if (ke.adoptServer(serverName, Pe) !== "adopted") {
        await discard(serverName, config).catch((error) =>
          logMCPDebug(serverName, `Orphan cleanup failed: ${describeConnectError(error, config)}`),
        );
        logFeatureBad("mcp_step_up_reauth", "adopt_refused");
        return "failed";
      }
      if (Pe.client.type !== "connected") {
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
  stepUpReauthFlights.set(serverKey, Q);
  return Q;
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
};
