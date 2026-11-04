/**
 * services/mcp/connectorSuggestions.ts
 *
 * 2.1.316 新增：MCP 连接器建议
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g18v745f.js (11)
 * attribution: placement 11
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  looseObject,
  stringSchema,
  objectSchema,
  array,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { apiClient } from "../routines/routinesApi.js";
import { isPolicyAllowed, policyDenyKind, policyDeniedReason } from "../policyLimits/policyVerdicts.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { officeBridgeState } from "./firstPartyServerIds.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-g18v745f.js:492-617 placement
/**
 * 连接器建议接口的结果 schema（连接器条目、是否需要选择加入、消息）。
 */
var connectorResultSchema = DoctorLazy(() =>
  looseObject({
    name: stringSchema().optional(),
  }),
);
var connectorResponseSchema = DoctorLazy(() =>
  objectSchema({
    results: array(connectorResultSchema()),
    opt_in_required: booleanSchema().optional(),
    message: stringSchema().nullish(),
  }),
);
//@ chunk-g18v745f.js:617-681 placement
/**
 * 判断响应是否要求用户先自行选择（opt_in_required）。
 */
function isOptInRequired(response) {
  return !Array.isArray(response) && response.opt_in_required === true;
}
//@ chunk-g18v745f.js:681-776 placement
class ConnectorRegistryUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConnectorRegistryUnavailableError";
  }
}
//@ chunk-g18v745f.js:776-967 placement
var CONNECTOR_REQUEST_TIMEOUT_MS = 15000;
var CONNECTOR_SEARCH_PATH = "/api/oauth/organizations/:orgUUID/mcp/connectors/search";
var CONNECTOR_SUGGEST_PATH = "/api/oauth/organizations/:orgUUID/mcp/connectors/suggest";
var CONNECTOR_LIST_PATH = "/api/oauth/organizations/:orgUUID/mcp/connectors/list";
//@ chunk-g18v745f.js:967-1666 placement
/**
 * 调用 claude.ai 组织连接器接口（search/suggest/list）：未登录或路由不可用、HTTP 错误、响应格式不对时抛错；需要用户开启时返回 opt_in_required 与提示。
 */
async function postConnectorRoute(path, body, signal, credentials) {
  let response = await apiClient.post(path, body, {
    auth: "teleport-org",
    timeout: CONNECTOR_REQUEST_TIMEOUT_MS,
    signal,
    credentials,
  });
  if (!response.ok)
    throw Error(
      response.reason === "no-auth"
        ? "Not authenticated with a claude.ai account."
        : `connector route unavailable: ${response.reason}`,
    );
  if (response.status >= 400) {
    let errorBody = objectSchema({
      error: objectSchema({
        type: stringSchema(),
        message: stringSchema(),
      }),
    }).safeParse(response.data);
    throw Error(
      errorBody.success
        ? `connector route ${response.status} ${errorBody.data.error.type}: ${errorBody.data.error.message}`
        : `connector route ${response.status}`,
    );
  }
  let parsed = connectorResponseSchema().safeParse(response.data);
  if (!parsed.success) throw Error("malformed connector response");
  if (parsed.data.opt_in_required)
    return {
      opt_in_required: true,
      message: parsed.data.message ?? "Enable connector suggestions in your Claude settings to use this.",
    };
  return parsed.data.results;
}
//@ chunk-g18v745f.js:1666-2127 placement
/**
 * 检查组织策略是否允许连接器搜索/查询，不允许时记录原因并抛出不可用错误。
 */
function assertConnectorSuggestAllowed(kind) {
  if (isPolicyAllowed("allow_connector_suggest")) return;
  let denyKind = policyDenyKind("allow_connector_suggest");
  let featureLabel = kind === "search" ? "Connector search" : "Connector lookup";
  logFeatureBad(
    kind === "search" ? "connector_suggest_search" : "connector_suggest_lookup",
    denyKind === "org_denied"
      ? "policy_denied"
      : denyKind === "unregistered"
        ? "policy_mirror_unregistered"
        : denyKind === "route_missing"
          ? "policy_route_missing"
          : "policy_cache_miss",
  );
  throw new ConnectorRegistryUnavailableError(
    policyDeniedReason("allow_connector_suggest", featureLabel, "is") ??
      `${featureLabel} is unavailable right now; please try again.`,
  );
}
//@ chunk-g18v745f.js:2127-2267 placement
/**
 * 按关键词搜索连接器注册表（含自定义连接器）。
 */
async function searchConnectors(keywords, signal, credentials) {
  assertConnectorSuggestAllowed("search");
  let result = await postConnectorRoute(
    CONNECTOR_SEARCH_PATH,
    {
      keywords,
      include_custom: true,
    },
    signal,
    credentials,
  );
  if (!isOptInRequired(result)) logFeatureOk("connector_suggest_search");
  return result;
}
//@ chunk-g18v745f.js:2267-2386 placement
/**
 * 按 uuid 查询连接器。
 */
async function lookupConnectors(uuids, signal, credentials) {
  assertConnectorSuggestAllowed("lookup");
  let result = await postConnectorRoute(
    CONNECTOR_SUGGEST_PATH,
    {
      uuids,
    },
    signal,
    credentials,
  );
  if (!isOptInRequired(result)) logFeatureOk("connector_suggest_lookup");
  return result;
}
//@ chunk-g18v745f.js:2386-2758 placement
/**
 * 标记连接器是否已在当前会话中启用（按已配置服务器的服务器 id 匹配）。
 */
function markEnabledInChat(suggestions, clients, session) {
  let bridgeState = officeBridgeState.peek(session)?.read?.();
  let enabledIds = new Set();
  for (let client of clients) {
    if (client.type === "disabled") continue;
    let config = client.config;
    let serverId =
      ("headers" in config ? config.headers?.["X-MCP-Server-ID"] : undefined) ?? bridgeState?.[client.name];
    if (serverId) enabledIds.add(serverId.toLowerCase());
  }
  return suggestions.map((suggestion) => {
    let installedServerId =
      typeof suggestion.installedServerId === "string" ? suggestion.installedServerId : undefined;
    return {
      ...suggestion,
      enabledInChat: installedServerId !== undefined && enabledIds.has(installedServerId.toLowerCase()),
    };
  });
}
//@ chunk-g18v745f.js:2758-2854 placement
/**
 * 列出可建议的连接器。
 */
async function listConnectorSuggestions(signal, credentials) {
  let result = await postConnectorRoute(CONNECTOR_LIST_PATH, {}, signal, credentials);
  if (!isOptInRequired(result)) logFeatureOk("connector_suggest_list");
  return result;
}
//@ chunk-g18v745f.js:2854-3057 placement
/**
 * 记录连接器搜索/查询/列表请求失败的日志与特性状态。
 */
function logConnectorFetchFailure(kind, error) {
  logForDebugging(`[connector-suggest] ${kind} failed: ${errorMessage(error)}`, {
    level: "error",
  });
  logFeatureBad(
    kind === "search"
      ? "connector_suggest_search"
      : kind === "lookup"
        ? "connector_suggest_lookup"
        : "connector_suggest_list",
    "fetch_failed",
  );
}
export {
  connectorResultSchema,
  searchConnectors,
  isOptInRequired,
  markEnabledInChat,
  ConnectorRegistryUnavailableError,
  logConnectorFetchFailure,
  lookupConnectors,
  listConnectorSuggestions,
};
