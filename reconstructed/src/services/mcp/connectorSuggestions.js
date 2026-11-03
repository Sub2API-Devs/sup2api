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
import { kt, o, u, A, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { apiClient } from "../routines/routinesApi.js";
import { isPolicyAllowed, policyDenyKind, policyDeniedReason } from "../policyLimits/policyVerdicts.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { WIt } from "./firstPartyServerIds.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * 连接器建议接口的结果 schema（连接器条目、是否需要选择加入、消息）。
 */
//@ chunk-g18v745f.js:492-617 placement
var connectorResultSchema = DoctorLazy(() => kt({ name: o().optional() })),
  connectorResponseSchema = DoctorLazy(() =>
    u({ results: A(connectorResultSchema()), opt_in_required: M().optional(), message: o().nullish() }),
  );
//@ chunk-g18v745f.js:617-681 placement
function bLe(e) {
  return !Array.isArray(e) && e.opt_in_required === !0;
}
//@ chunk-g18v745f.js:681-776 placement
class ConnectorRegistryUnavailableError extends Error {
  constructor(e) {
    super(e);
    this.name = "ConnectorRegistryUnavailableError";
  }
}
//@ chunk-g18v745f.js:776-967 placement
var CONNECTOR_REQUEST_TIMEOUT_MS = 15000,
  CONNECTOR_SEARCH_PATH = "/api/oauth/organizations/:orgUUID/mcp/connectors/search",
  CONNECTOR_SUGGEST_PATH = "/api/oauth/organizations/:orgUUID/mcp/connectors/suggest",
  CONNECTOR_LIST_PATH = "/api/oauth/organizations/:orgUUID/mcp/connectors/list";
/**
 * 调用 claude.ai 组织连接器接口（search/suggest/list）：未登录或路由不可用、HTTP 错误、响应格式不对时抛错；需要用户开启时返回 opt_in_required 与提示。
 */
//@ chunk-g18v745f.js:967-1666 placement
async function postConnectorRoute(path, body, signal, credentials) {
  let response = await apiClient.post(path, body, {
    auth: "teleport-org",
    timeout: CONNECTOR_REQUEST_TIMEOUT_MS,
    signal: signal,
    credentials: credentials,
  });
  if (!response.ok)
    throw Error(
      response.reason === "no-auth"
        ? "Not authenticated with a claude.ai account."
        : `connector route unavailable: ${response.reason}`,
    );
  if (response.status >= 400) {
    let safeParse = u({ error: u({ type: o(), message: o() }) }).safeParse(response.data);
    throw Error(
      safeParse.success
        ? `connector route ${response.status} ${safeParse.data.error.type}: ${safeParse.data.error.message}`
        : `connector route ${response.status}`,
    );
  }
  let safeParse = connectorResponseSchema().safeParse(response.data);
  if (!safeParse.success) throw Error("malformed connector response");
  if (safeParse.data.opt_in_required)
    return {
      opt_in_required: !0,
      message: safeParse.data.message ?? "Enable connector suggestions in your Claude settings to use this.",
    };
  return safeParse.data.results;
}
/**
 * 检查组织策略是否允许连接器搜索/查询，不允许时记录原因并抛出不可用错误。
 */
//@ chunk-g18v745f.js:1666-2127 placement
function assertConnectorSuggestAllowed(e) {
  if (isPolicyAllowed("allow_connector_suggest")) return;
  let n = policyDenyKind("allow_connector_suggest"),
    r = e === "search" ? "Connector search" : "Connector lookup";
  throw (
    logFeatureBad(
      e === "search" ? "connector_suggest_search" : "connector_suggest_lookup",
      n === "org_denied"
        ? "policy_denied"
        : n === "unregistered"
          ? "policy_mirror_unregistered"
          : n === "route_missing"
            ? "policy_route_missing"
            : "policy_cache_miss",
    ),
    new ConnectorRegistryUnavailableError(
      policyDeniedReason("allow_connector_suggest", r, "is") ??
        `${r} is unavailable right now; please try again.`,
    )
  );
}
/**
 * 按关键词搜索连接器注册表（含自定义连接器）。
 */
//@ chunk-g18v745f.js:2127-2267 placement
async function searchConnectors(e, n, r) {
  assertConnectorSuggestAllowed("search");
  let a = await postConnectorRoute(CONNECTOR_SEARCH_PATH, { keywords: e, include_custom: !0 }, n, r);
  if (!bLe(a)) logFeatureOk("connector_suggest_search");
  return a;
}
/**
 * 按 uuid 查询连接器。
 */
//@ chunk-g18v745f.js:2267-2386 placement
async function lookupConnectors(e, n, r) {
  assertConnectorSuggestAllowed("lookup");
  let a = await postConnectorRoute(CONNECTOR_SUGGEST_PATH, { uuids: e }, n, r);
  if (!bLe(a)) logFeatureOk("connector_suggest_lookup");
  return a;
}
/**
 * 标记连接器是否已在当前会话中启用（按已配置服务器的服务器 id 匹配）。
 */
//@ chunk-g18v745f.js:2386-2758 placement
function markEnabledInChat(e, n, r) {
  let a = WIt.peek(r)?.read?.(),
    i = new Set();
  for (let s of n) {
    if (s.type === "disabled") continue;
    let config = s.config,
      f = ("headers" in config ? config.headers?.["X-MCP-Server-ID"] : void 0) ?? a?.[s.name];
    if (f) i.add(f.toLowerCase());
  }
  return e.map((s) => {
    let c = typeof s.installedServerId === "string" ? s.installedServerId : void 0;
    return { ...s, enabledInChat: c !== void 0 && i.has(c.toLowerCase()) };
  });
}
//@ chunk-g18v745f.js:2758-2854 placement
async function PHs(e, n) {
  let r = await postConnectorRoute(CONNECTOR_LIST_PATH, {}, e, n);
  if (!bLe(r)) logFeatureOk("connector_suggest_list");
  return r;
}
/**
 * 记录连接器搜索/查询/列表请求失败的日志与特性状态。
 */
//@ chunk-g18v745f.js:2854-3057 placement
function logConnectorFetchFailure(e, n) {
  (logForDebugging(`[connector-suggest] ${e} failed: ${errorMessage(n)}`, { level: "error" }),
    logFeatureBad(
      e === "search"
        ? "connector_suggest_search"
        : e === "lookup"
          ? "connector_suggest_lookup"
          : "connector_suggest_list",
      "fetch_failed",
    ));
}

export {
  connectorResultSchema,
  searchConnectors,
  bLe,
  markEnabledInChat,
  ConnectorRegistryUnavailableError,
  logConnectorFetchFailure,
  lookupConnectors,
  PHs,
};
