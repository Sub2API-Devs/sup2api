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
import { recursiveLobsterOn } from "../../utils/plugins/mcpPluginIntegration.js";
import { isDcrRejection } from "./sdkAuth.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
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
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-etrfk54v.js:630-716 placement
/**
 * 表示“组织会自动连接”的资格原因集合。
 */
var CONNECTOR_AUTO_CONNECT_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-etrfk54v.js:630", () => {
  CONNECTOR_AUTO_CONNECT_REASONS = new Set([
    "id_jag_with_auto_connect",
    "auto_connect",
    "auth_allows_auto_connect",
  ]);
});
//@ chunk-etrfk54v.js:716-2222 placement
/**
 * 对新添加的 sse/http MCP 服务器检查是否应改用 claude.ai 连接器，并给出建议。
 */
async function adviseMcpRegistration(error, serverName, config, site) {
  if (
    !recursiveLobsterOn() ||
    (config.type !== "sse" && config.type !== "http") ||
    !(await isDcrRejection(error, serverName, config))
  )
    return;
  let cliOwnedState = getCliOwnedState();
  let claudeAiConfigsFetch = needsClientRegistration(
    serverName,
    {
      ...config,
      redialToRelearnRegistration: undefined,
    },
    await readMcpOAuthStore(),
  )
    ? cliOwnedState.claudeAiConfigsFetch
    : null;
  let { listed, connectorNames, connectors } = matchingConnectorsFor(
    claudeAiConfigsFetch === null ? {} : await claudeAiConfigsFetch,
    config,
  );
  let advice;
  switch (config.scope) {
    case "local":
    case "user":
    case "project":
      advice = {
        kind: "register-app",
        fixer: "you",
      };
      break;
    case "enterprise":
    case "managed":
      advice = {
        kind: "register-app",
        fixer: "administrator",
      };
      break;
    case "dynamic":
    case "agent":
    case "claudeai":
      advice = {
        kind: "register-app",
        fixer: isPluginServerConfig(config) ? "plugin-author" : "configurer",
      };
      break;
  }
  let [firstConnector] = connectors;
  if (connectors.some((connector) => connector.ineligibleReason === "connected"))
    advice = {
      kind: "connected",
      connectorNames,
    };
  else if (
    connectors.some((connector) => CONNECTOR_AUTO_CONNECT_REASONS.has(connector.ineligibleReason ?? ""))
  )
    advice = {
      kind: "organization-connects",
    };
  else if (firstConnector !== undefined)
    advice = {
      kind: "connect",
      connectorNames,
      url:
        (connectors.length === 1 && firstConnector.ineligibleReason
          ? claudeAiConnectorAuthUrl(firstConnector)
          : null) ?? getConnectorsSettingsUrl(),
    };
  else if (
    !listed &&
    claudeAiConfigsFetch !== null &&
    cliOwnedState.claudeAiConnectorListSettledSeq === cliOwnedState.claudeAiConnectorListFetchSeq
  ) {
    if (
      cliOwnedState.officialUrls === undefined &&
      (site === "mcp_login" || cliOwnedState.officialUrlsFetchAwaitsLookup)
    )
      await fetchOfficialMcpUrlsOnce();
    await cliOwnedState.officialUrlsFetch;
    let url = getLoggingSafeMcpBaseUrl(config);
    if (url !== undefined && isOfficialMcpUrl(url))
      switch (getSubscriptionType()) {
        case "pro":
        case "max":
          advice = {
            kind: "connect",
            url: getConnectorsSettingsUrl(),
            connectorNames,
          };
          break;
        case "team":
        case "enterprise":
          advice = {
            kind: "ask-admin",
          };
          break;
        case null:
          break;
      }
  }
  let logFields = {
    advice: fromEnum(advice.kind),
    site: fromEnum(site),
  };
  switch (advice.kind) {
    case "connected":
    case "connect":
    case "organization-connects":
      await logFeatureOkAsync("mcp_registration_advice", logFields);
      break;
    case "ask-admin":
    case "register-app":
      await logFeatureSadAsync("mcp_registration_advice", "no_route_known", logFields);
      break;
  }
  return advice;
}
//@ chunk-etrfk54v.js:2222-2844 placement
async function findMatchingConnector(config, startedAt, { storageV5, credentials }) {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.claudeAiConnectorListStatus !== "settled")
    return logHandoffOutcome("list_unavailable", startedAt);
  let claudeAiConfigsFetch = cliOwnedState.claudeAiConfigsFetch;
  clearClaudeAiConfigsFetch();
  let { connectorNames, connectors } = matchingConnectorsFor(
    await fetchClaudeAiConfigsOnce(credentials),
    config,
  );
  if (cliOwnedState.claudeAiConnectorListSettledSeq !== cliOwnedState.claudeAiConnectorListFetchSeq) {
    cliOwnedState.claudeAiConfigsFetch ??= claudeAiConfigsFetch;
    return logHandoffOutcome("list_unavailable", startedAt);
  }
  let any = connectors.some((connector) => connector.ineligibleReason === "connected");
  if (!any && connectors.every((connector) => connector.eligible === false))
    return logHandoffOutcome("not_connected", startedAt);
  let clientModule = require("./emitTripwireEvent.lazy.js").mcpClientModule();
  for (let connectorName of connectorNames)
    await clientModule.removeMcpAuthCacheEntry(connectorName, storageV5);
  return logHandoffOutcome(any ? "connected" : "state_unknown", startedAt);
}
//@ chunk-etrfk54v.js:2844-4437 placement
function registrationAdviceText(advice) {
  switch (advice.kind) {
    case "connected":
      return "This service doesn't accept sign-ins from Claude Code. It's already connected through your claude.ai account, and its tools load as a claude.ai connector. If they're missing, restart Claude Code.";
    case "connect":
      return "This service doesn't accept sign-ins from Claude Code. Connect it on claude.ai to use it here.";
    case "organization-connects":
      return "This service doesn't accept sign-ins from Claude Code. Your organization connects it for you on claude.ai. If its tools are missing, ask your admin.";
    case "ask-admin":
      return "This service doesn't accept sign-ins from Claude Code. No claude.ai connector for it is available to you. Your organization's Owner or admin can add one or give you access.";
    case "register-app":
      switch (advice.fixer) {
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
function logHandoffOutcome(outcome, startedAt) {
  let fields = {
    waited_ms: Date.now() - startedAt,
  };
  switch (outcome) {
    case "connected":
    case "not_connected":
      logFeatureOk("mcp_claudeai_handoff", {
        ...fields,
        outcome: fromEnum(outcome),
      });
      break;
    case "state_unknown":
    case "list_unavailable":
      logFeatureSad("mcp_claudeai_handoff", outcome, fields);
      break;
  }
  return outcome;
}
//@ chunk-etrfk54v.js:4670-4909 placement
function matchingConnectorsFor(configs, config) {
  let mcpServerSignature = getMcpServerSignature(config);
  let sameSignature = pickByHelper(
    configs,
    (candidate) => mcpServerSignature !== null && getMcpServerSignature(candidate) === mcpServerSignature,
  );
  let allowed = pickByHelper(
    filterMcpServersByPolicy(sameSignature).allowed,
    (value, name) => !isMcpServerDisabled(name),
  );
  return {
    listed: Object.keys(sameSignature).length > 0,
    connectorNames: Object.keys(allowed),
    connectors: Object.values(allowed).flatMap((config) =>
      config.type === "claudeai-proxy" ? [config] : [],
    ),
  };
}
export { adviseMcpRegistration, registrationAdviceText, findMatchingConnector };
