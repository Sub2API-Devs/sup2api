/**
 * services/mcp/mcpRegistrationAdvice.ts
 *
 * 2.1.316 新增：添加 MCP 服务器时建议改用 claude.ai 连接器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-etrfk54v.js (6)
 * attribution: placement 6
 */
import { aBr } from "../../utils/plugins/mcpPluginIntegration.js";
import { isDcrRejection } from "./sdkAuth.js";
import { ht } from "./cliOwnedClients.js";
import { needsClientRegistration } from "./registrationStatus.js";
import { readMcpOAuthStore } from "./credentialStoreRead.js";
import { isPluginServerConfig } from "./types.js";
import {
  claudeAiConnectorAuthUrl,
  getConnectorsSettingsUrl,
  clearClaudeAiConfigsFetch,
  fetchClaudeAiConfigsOnce,
} from "./claudeai.js";
import { fetchOfficialMcpUrlsOnce, isOfficialMcpUrl } from "../routines/routinesApi.js";
import { getLoggingSafeMcpBaseUrl } from "./utils.js";
import { getSubscriptionType } from "../../utils/auth.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  logFeatureOkAsync,
  logFeatureSadAsync,
  logFeatureOk,
  logFeatureSad,
} from "../analytics/featureTelemetry.js";
import { getMcpServerSignature, filterMcpServersByPolicy, isMcpServerDisabled } from "./config.js";
import { Do } from "../../utils/git/gitSafeEnv.js";

//@ chunk-etrfk54v.js:630-716 placement
var k = new Set(["id_jag_with_auto_connect", "auto_connect", "auth_allows_auto_connect"]);
/**
 * 对新添加的 sse/http MCP 服务器检查是否应改用 claude.ai 连接器，并给出建议。
 */
//@ chunk-etrfk54v.js:716-2222 placement
async function adviseMcpRegistration(t, r, e, s) {
  if (!aBr() || (e.type !== "sse" && e.type !== "http") || !(await isDcrRejection(t, r, e))) return;
  let n = ht(),
    a = needsClientRegistration(r, { ...e, redialToRelearnRegistration: void 0 }, await readMcpOAuthStore())
      ? n.claudeAiConfigsFetch
      : null,
    {
      listed: listed,
      connectorNames: connectorNames,
      connectors: connectors,
    } = matchingConnectorsFor(a === null ? {} : await a, e),
    i;
  switch (e.scope) {
    case "local":
    case "user":
    case "project":
      i = { kind: "register-app", fixer: "you" };
      break;
    case "enterprise":
    case "managed":
      i = { kind: "register-app", fixer: "administrator" };
      break;
    case "dynamic":
    case "agent":
    case "claudeai":
      i = { kind: "register-app", fixer: isPluginServerConfig(e) ? "plugin-author" : "configurer" };
      break;
  }
  let [o] = connectors;
  if (connectors.some((u) => u.ineligibleReason === "connected"))
    i = { kind: "connected", connectorNames: connectorNames };
  else if (connectors.some((u) => k.has(u.ineligibleReason ?? ""))) i = { kind: "organization-connects" };
  else if (o !== void 0)
    i = {
      kind: "connect",
      connectorNames: connectorNames,
      url:
        (connectors.length === 1 && o.ineligibleReason ? claudeAiConnectorAuthUrl(o) : null) ??
        getConnectorsSettingsUrl(),
    };
  else if (!listed && a !== null && n.claudeAiConnectorListSettledSeq === n.claudeAiConnectorListFetchSeq) {
    if (n.officialUrls === void 0 && (s === "mcp_login" || n.officialUrlsFetchAwaitsLookup))
      await fetchOfficialMcpUrlsOnce();
    await n.officialUrlsFetch;
    let u = getLoggingSafeMcpBaseUrl(e);
    if (u !== void 0 && isOfficialMcpUrl(u))
      switch (getSubscriptionType()) {
        case "pro":
        case "max":
          i = { kind: "connect", url: getConnectorsSettingsUrl(), connectorNames: connectorNames };
          break;
        case "team":
        case "enterprise":
          i = { kind: "ask-admin" };
          break;
        case null:
          break;
      }
  }
  let h = { advice: fromEnum(i.kind), site: fromEnum(s) };
  switch (i.kind) {
    case "connected":
    case "connect":
    case "organization-connects":
      await logFeatureOkAsync("mcp_registration_advice", h);
      break;
    case "ask-admin":
    case "register-app":
      await logFeatureSadAsync("mcp_registration_advice", "no_route_known", h);
      break;
  }
  return i;
}
//@ chunk-etrfk54v.js:2222-2844 placement
async function findMatchingConnector(t, r, { storageV5: storageV5, credentials: credentials }) {
  let n = ht();
  if (n.claudeAiConnectorListStatus !== "settled") return logHandoffOutcome("list_unavailable", r);
  let claudeAiConfigsFetch = n.claudeAiConfigsFetch;
  clearClaudeAiConfigsFetch();
  let { connectorNames: connectorNames, connectors: connectors } = matchingConnectorsFor(
    await fetchClaudeAiConfigsOnce(credentials),
    t,
  );
  if (n.claudeAiConnectorListSettledSeq !== n.claudeAiConnectorListFetchSeq)
    return ((n.claudeAiConfigsFetch ??= claudeAiConfigsFetch), logHandoffOutcome("list_unavailable", r));
  let any = connectors.some((o) => o.ineligibleReason === "connected");
  if (!any && connectors.every((o) => o.eligible === !1)) return logHandoffOutcome("not_connected", r);
  let mcpClientModule = require("./chunk-asne9cp8.js").mcpClientModule();
  for (let o of connectorNames) await mcpClientModule.removeMcpAuthCacheEntry(o, storageV5);
  return logHandoffOutcome(any ? "connected" : "state_unknown", r);
}
//@ chunk-etrfk54v.js:2844-4437 placement
function registrationAdviceText(t) {
  switch (t.kind) {
    case "connected":
      return "This service doesn't accept sign-ins from Claude Code. It's already connected through your claude.ai account, and its tools load as a claude.ai connector. If they're missing, restart Claude Code.";
    case "connect":
      return "This service doesn't accept sign-ins from Claude Code. Connect it on claude.ai to use it here.";
    case "organization-connects":
      return "This service doesn't accept sign-ins from Claude Code. Your organization connects it for you on claude.ai. If its tools are missing, ask your admin.";
    case "ask-admin":
      return "This service doesn't accept sign-ins from Claude Code. No claude.ai connector for it is available to you. Your organization's Owner or admin can add one or give you access.";
    case "register-app":
      switch (t.fixer) {
        case "you":
          return "This service doesn't accept sign-ins from Claude Code. To fix that, register an app with the service (redirect URL http://localhost:<port>/callback), then remove this server and add it again with the same options plus --client-id <id>, --callback-port <port> and, if the service issues a secret, --client-secret.";
        case "plugin-author":
          return "This service doesn't accept sign-ins from Claude Code. The plugin's author can fix that by registering an app with the service.";
        case "administrator":
          return "This service doesn't accept sign-ins from Claude Code. Your administrator can fix that by registering an app with the service.";
        case "configurer":
          return "This service doesn't accept sign-ins from Claude Code. Whoever configured this server can fix that by registering an app with the service.";
      }
  }
}
//@ chunk-etrfk54v.js:4437-4670 placement
function logHandoffOutcome(t, r) {
  let e = { waited_ms: Date.now() - r };
  switch (t) {
    case "connected":
    case "not_connected":
      logFeatureOk("mcp_claudeai_handoff", { ...e, outcome: fromEnum(t) });
      break;
    case "state_unknown":
    case "list_unavailable":
      logFeatureSad("mcp_claudeai_handoff", t, e);
      break;
  }
  return t;
}
//@ chunk-etrfk54v.js:4670-4909 placement
function matchingConnectorsFor(t, r) {
  let e = getMcpServerSignature(r),
    s = Do(t, (a) => e !== null && getMcpServerSignature(a) === e),
    n = Do(filterMcpServersByPolicy(s).allowed, (a, p) => !isMcpServerDisabled(p));
  return {
    listed: Object.keys(s).length > 0,
    connectorNames: Object.keys(n),
    connectors: Object.values(n).flatMap((a) => (a.type === "claudeai-proxy" ? [a] : [])),
  };
}

export { adviseMcpRegistration, registrationAdviceText, findMatchingConnector };
