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
import { ht } from "./cliOwnedClients.js";
import { getServerKey, describeConnectError } from "./auth.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { uo, normalizeMcpServerName } from "../api/deferredToolsState.js";
import { identityEpoch } from "./identityChange.js";
import { confirmWithUser } from "../../utils/permissions/confirmWithUser.js";
import { logMCPDebug } from "../../utils/log.js";
import { redactUrlSecrets } from "../../utils/urlRedaction.js";
import { sanitizeRelayUrl } from "../../utils/sanitization.js";
import { createInformationalSystemMessage } from "../../utils/messages.js";

//@ chunk-8t8n4kdh.js:37526-37639 placement
var TENGU_GLEAMING_CREEK = "tengu_gleaming_creek",
  qo = { mode: "all" },
  ys = { mode: "allow", hosts: new Set() },
  Ts = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/;
//@ chunk-8t8n4kdh.js:37639-37863 placement
function normalizePolicyHost(e) {
  if (typeof e !== "string" || /[\s/:@?#\\[\]%]/.test(e.trim())) return;
  let replaced = e.trim().replace(/\.$/, ""),
    r = URL.canParse(`https://${replaced}/`) ? new URL(`https://${replaced}/`).hostname : void 0;
  return r !== void 0 && Ts.test(r) ? r : void 0;
}
/**
 * 读取远程 MCP 主机限制策略：all、allow 或 deny 主机列表，格式错误时采用默认限制。
 */
//@ chunk-8t8n4kdh.js:37863-38265 placement
function remoteHostPolicy() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLEAMING_CREEK, null);
  if (e === null || e === void 0) return qo;
  if (typeof e !== "object" || Array.isArray(e)) return ys;
  let { mode: mode, hosts: hosts } = e;
  if (mode === void 0 && Object.keys(e).length === 0) return qo;
  let s = typeof mode === "string" ? mode.trim().toLowerCase() : void 0;
  if (s === "all") return qo;
  if ((s === "allow" || s === "deny") && Array.isArray(hosts)) {
    let mapped = hosts.map(normalizePolicyHost);
    if (mapped.every((y) => y !== void 0)) return { mode: s, hosts: new Set(mapped) };
  }
  return ys;
}
//@ chunk-8t8n4kdh.js:38265-38401 placement
function urlHostname(e) {
  if (!URL.canParse(e)) return;
  let n = new URL(e);
  return ["http:", "https:", "ws:", "wss:"].includes(n.protocol) ? n.hostname : void 0;
}
//@ chunk-8t8n4kdh.js:38401-38563 placement
function hasPlainAuthority(e) {
  let n = e?.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i)?.[1];
  return e !== null && n !== void 0 && n !== "" && !n.includes("@") && !/[\\\u0000-\u001f\u007f]/.test(e);
}
/**
 * 取 MCP 配置实际访问的远程主机（claude.ai 连接器、直连地址或经 CCR 代理的目标），不合法时返回 undefined。
 */
//@ chunk-8t8n4kdh.js:38563-38973 placement
function remoteHostOf(e) {
  let n;
  if (e.type === "claudeai-proxy")
    n = e.scope === "claudeai" && hasPlainAuthority(e.url) ? urlHostname(e.url) : void 0;
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
  let r = n?.toLowerCase().replace(/\.$/, "");
  return r && Ts.test(r) ? r : void 0;
}
/**
 * shouldRestrictRemoteHost：CCR 云会话中按 GrowthBook tengu_gleaming_creek 的 allow/deny 主机列表限制远程 MCP 服务器。
 */
//@ chunk-8t8n4kdh.js:38973-39242 placement
function shouldRestrictRemoteHost(e) {
  {
    let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
    if (
      env.CLAUDE_CODE_REMOTE !== !0 ||
      (CLAUDE_CODE_ENVIRONMENT_KIND !== void 0 && CLAUDE_CODE_ENVIRONMENT_KIND !== "anthropic_cloud") ||
      isCcsTenant()
    )
      return !1;
    let r = remoteHostPolicy();
    if (r.mode === "all") return !1;
    let s = remoteHostOf(e);
    if (s === void 0) return !0;
    return r.mode === "allow" ? !r.hosts.has(s) : r.hosts.has(s);
  }
  return !1;
}
//@ chunk-8t8n4kdh.js:39242-39265 placement
var Ya = new HostScoped(() => ({}));
//@ chunk-8t8n4kdh.js:39265-39302 placement
function Ja() {
  return Ya.of(getRootSession().host);
}
//@ chunk-8t8n4kdh.js:39302-39339 placement
function Es(e) {
  return Ja().make?.(e);
}
//@ chunk-8t8n4kdh.js:39339-39398 placement
function isStepUpAuthDialogEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_step_up_auth_dialog", !0);
}
//@ chunk-8t8n4kdh.js:39398-39516 placement
function scopesInclude(e, n) {
  let r = new Set(e.split(" ").filter(Boolean));
  return n
    .split(" ")
    .filter(Boolean)
    .every((s) => r.has(s));
}
//@ chunk-8t8n4kdh.js:39516-39645 placement
function grantedScopesCover(e, n) {
  let r = e.oauth?.scopes;
  if (!Boolean(r || e.oauth?.authServerMetadataUrl)) return !0;
  if (!n || !r) return !1;
  return scopesInclude(r, n);
}
//@ chunk-8t8n4kdh.js:39645-39713 placement
function Ko(e) {
  return e.split(" ").filter(Boolean).sort().join(" ");
}
//@ chunk-8t8n4kdh.js:39713-39795 placement
function Rs(e, n, r) {
  return ht().stepUpReauthExhausted.get(getServerKey(e, n))?.has(Ko(r)) ?? !1;
}
//@ chunk-8t8n4kdh.js:39795-39987 placement
function markStepUpExhausted(e, n, r, s) {
  let h = Ko(r),
    stepUpReauthExhausted = ht().stepUpReauthExhausted,
    S = getServerKey(e, n),
    w = stepUpReauthExhausted.get(S) ?? new Set();
  if (Ko(s) !== h || w.has(h)) return;
  (logFeatureSad("mcp_step_up_reauth", "rechallenged_after_reauth"), stepUpReauthExhausted.set(S, w.add(h)));
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
function stepUpResultMessage(e, n, r) {
  let s = `Re-authenticated MCP server "${uo(n)}" (scope: "${normalizeMcpServerName(r, void 0, "none")}")`;
  return typeof e === "string"
    ? `${s}

${e}`
    : [{ type: "text", text: s }, ...(e ?? [])];
}
/**
 * runStepUpReauth：工具调用遇到 insufficient_scope（step-up）时询问用户是否重新授权，执行 OAuth、重连并接管新连接，同一服务器并发只跑一次。
 */
//@ chunk-8t8n4kdh.js:40565-43097 placement
function runStepUpReauth({
  serverName: serverName,
  config: config,
  requestedScope: requestedScope,
  canUseTool: canUseTool,
  toolUseContext: toolUseContext,
  signal: signal,
  performOAuthFlow: performOAuthFlow,
  reconnect: reconnect,
  discard: discard,
  isPermitted: isPermitted,
}) {
  let stepUpReauthFlights = ht().stepUpReauthFlights,
    R = getServerKey(serverName, config),
    ce = stepUpReauthFlights.get(R);
  if (ce !== void 0) return ce;
  let Q = (async () => {
    let ie = identityEpoch(),
      ge = () =>
        identityEpoch() === ie &&
        isPermitted(serverName, config) &&
        toolUseContext
          .getMcp()
          .clients.some(
            (client) =>
              client.name === serverName &&
              client.config.type === "http" &&
              getServerKey(client.name, client.config) === R,
          ),
      Ie = normalizeMcpServerName(requestedScope, void 0, "none");
    if (Ie !== requestedScope)
      return (logFeatureSad("mcp_step_up_reauth", "scope_not_displayable"), "declined");
    let G = await confirmWithUser({
      canUseTool: canUseTool,
      toolUseContext: toolUseContext,
      source: "mcp_step_up_reauth",
      header: "MCP",
      question: `MCP server "${uo(serverName)}" needs additional permissions for this tool (it asked for the scope "${Ie}"). Re-authenticate now?`,
      choices: STEP_UP_DIALOG_OPTIONS,
    });
    if (G.kind !== "chose" || G.value !== "reauthenticate")
      return (
        logFeatureSad(
          "mcp_step_up_reauth",
          G.kind === "unanswered" ? G.reason : G.kind === "chose" ? "declined" : G.kind,
        ),
        "declined"
      );
    if (!ge()) return (logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_consent"), "failed");
    try {
      await performOAuthFlow(
        serverName,
        config,
        (Pe) => {
          logMCPDebug(serverName, `Step-up re-auth authorization URL: ${redactUrlSecrets(Pe)}`);
          let ke = `Opening your browser to re-authenticate MCP server "${uo(serverName)}".`,
            nt = sanitizeRelayUrl(Pe) === Pe;
          toolUseContext.appendSystemMessage?.({
            ...createInformationalSystemMessage(
              nt
                ? `${ke} If it doesn't open, use this link to the server's sign-in page: ${Pe}`
                : `${ke} If it doesn't open, run /mcp to sign back in; its sign-in screen shows the link.`,
              "suggestion",
            ),
            persist: !1,
          });
        },
        signal,
      );
    } catch (error) {
      if (
        (logMCPDebug(serverName, `Step-up re-auth flow failed: ${describeConnectError(error, config)}`),
        signal.aborted)
      )
        logFeatureSad("mcp_step_up_reauth", "cancelled");
      else logFeatureBad("mcp_step_up_reauth", "flow_failed");
      return "failed";
    }
    if (!ge()) return (logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_flow"), "failed");
    if (toolUseContext.session.mcpSessionWiring.connections() === void 0)
      return (logFeatureBad("mcp_step_up_reauth", "no_connections_owner"), "failed");
    try {
      let Pe = await reconnect(serverName, config);
      if (identityEpoch() !== ie) return (logFeatureBad("mcp_step_up_reauth", "identity_changed"), "failed");
      let connections = toolUseContext.session.mcpSessionWiring.connections();
      if (!ge() || connections === void 0)
        return (
          await discard(serverName, config).catch((ee) =>
            logMCPDebug(serverName, `Orphan cleanup failed: ${describeConnectError(ee, config)}`),
          ),
          connections?.markReconnectDiscarded(serverName, config),
          logFeatureBad("mcp_step_up_reauth", "server_unavailable_after_reconnect"),
          "failed"
        );
      if (connections.adoptServer(serverName, Pe) !== "adopted")
        return (
          await discard(serverName, config).catch((ee) =>
            logMCPDebug(serverName, `Orphan cleanup failed: ${describeConnectError(ee, config)}`),
          ),
          logFeatureBad("mcp_step_up_reauth", "adopt_refused"),
          "failed"
        );
      if (Pe.client.type !== "connected")
        return (logFeatureBad("mcp_step_up_reauth", "reconnect_not_connected"), "failed");
    } catch (error) {
      return (
        logMCPDebug(serverName, `Step-up re-auth reconnect failed: ${describeConnectError(error, config)}`),
        logFeatureBad("mcp_step_up_reauth", "reconnect_failed"),
        "failed"
      );
    }
    return (logFeatureOk("mcp_step_up_reauth"), "reauthenticated");
  })().finally(() => {
    stepUpReauthFlights.delete(R);
  });
  return (stepUpReauthFlights.set(R, Q), Q);
}

export {
  shouldRestrictRemoteHost,
  Es,
  stepUpResultMessage,
  markStepUpExhausted,
  isStepUpAuthDialogEnabled,
  grantedScopesCover,
  Rs,
  runStepUpReauth,
};
