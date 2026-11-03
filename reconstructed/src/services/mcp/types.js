/**
 * services/mcp/types.ts
 *
 * 并入已有模块：MCP 服务器配置 schema（stdio、sse、http 等）；托管设置中的 MCP 服务器 schema（只允许 http/sse URL）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/types.ts
 * pieces: chunk-21ppfwx8.js (1), chunk-5aas12zq.js (2), chunk-dcmhvw5a.js (17), chunk-x8dej8aq.js (1)
 * attribution: fingerprint 5, affinity 1, layout 1, placement 14
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { U, T, E, u, o, A, pe, M, oe, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPrototypeKey, SERVER_NAME_RULE_MESSAGE } from "../../schemas/hookEntryValidation.js";
import { Ove } from "./envExpansion.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { MCP_SETTINGS_SCOPES, getMcpConfigsByScope } from "./config.js";
import { shouldShowDisableAutoConnectDialog } from "../../components/IdeAutoConnectDialog.js";
import { j$o, djt } from "../../utils/plugins/pluginSettingsSources.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { hasStoredOAuthToken } from "../../utils/auth.js";

/**
 * ConfigScopeSchema：MCP 配置作用域枚举 local/user/project/dynamic/enterprise/claudeai/managed/agent；MANAGED_CONFIG_SCOPES = enterprise、managed。
 */
//@ chunk-dcmhvw5a.js:65746-65872 fingerprint = ConfigScopeSchema (0.885)
var ConfigScopeSchema = DoctorLazy(() =>
    U(["local", "user", "project", "dynamic", "enterprise", "claudeai", "managed", "agent"]),
  ),
  MANAGED_CONFIG_SCOPES = ["enterprise", "managed"];
/**
 * isManagedConfigScope：作用域是 enterprise 或 managed。
 */
//@ chunk-dcmhvw5a.js:65872-65910 layout
function isManagedConfigScope(e) {
  return MANAGED_CONFIG_SCOPES.includes(e);
}
/**
 * TransportSchema：stdio/sse/sse-ide/http/ws/sdk。
 */
//@ chunk-dcmhvw5a.js:65910-65971 fingerprint = TransportSchema (0.945)
var TransportSchema = DoctorLazy(() => U(["stdio", "sse", "sse-ide", "http", "ws", "sdk"]));
/**
 * 是否为 sdk/IDE 类型的 MCP 服务器。
 */
//@ chunk-dcmhvw5a.js:65971-66033 placement
function isIdeOrSdkType(e) {
  return e === "sdk" || e === "sse-ide" || e === "ws-ide";
}
//@ chunk-dcmhvw5a.js:66033-66059 placement
var SERVER_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
//@ chunk-dcmhvw5a.js:66059-66114 placement
function isValidServerId(e) {
  return typeof e === "string" && SERVER_ID_PATTERN.test(e);
}
//@ chunk-dcmhvw5a.js:66114-66336 placement
var ServerRoleSchema = DoctorLazy(() =>
    T("comms")
      .optional()
      .catch(void 0),
  ),
  PositiveIntSchema = DoctorLazy(() => E().int().positive()),
  MAX_REQUEST_TIMEOUT_MS = 300000,
  RequestTimeoutHintSchema = DoctorLazy(() =>
    E()
      .int()
      .positive()
      .optional()
      .catch(void 0)
      .describe("@internal CCR backend wire hint; folded into timeout at parse."),
  );
//@ chunk-dcmhvw5a.js:66336-66451 placement
function foldRequestTimeout({ request_timeout_ms: request_timeout_ms, ...n }) {
  return {
    ...n,
    ...(n.timeout === void 0 &&
      request_timeout_ms !== void 0 && { timeout: Math.min(request_timeout_ms, MAX_REQUEST_TIMEOUT_MS) }),
  };
}
/**
 * MCP 服务器配置 schema（stdio、sse、http 等）。
 */
//@ chunk-dcmhvw5a.js:66451-68467 placement
var McpStdioServerConfigSchema = DoctorLazy(() =>
    u({
      type: T("stdio").optional(),
      command: o().min(1, "Command cannot be empty"),
      args: A(o()).default([]),
      env: pe(o(), o()).optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: M().optional(),
      bareElicitationCapability: M().optional(),
      role: ServerRoleSchema(),
    }),
  ),
  BooleanSchema = DoctorLazy(() => M()),
  MAX_URL_LENGTH = 65536,
  UrlStringSchema = () =>
    o().refine((e) => e.length <= MAX_URL_LENGTH, { abort: !0, message: "url is too long" }),
  MAX_METADATA_URL_LENGTH = 4096,
  McpOAuthConfigSchema = DoctorLazy(() =>
    u({
      clientId: o().optional(),
      callbackPort: E().int().positive().optional(),
      authServerMetadataUrl: o()
        .refine((e) => e.length <= MAX_METADATA_URL_LENGTH, {
          abort: !0,
          message: "authServerMetadataUrl is too long",
        })
        .url()
        .startsWith("https://", { message: "authServerMetadataUrl must use https://" })
        .optional(),
      scopes: o().min(1).optional(),
      xaa: BooleanSchema().optional(),
    }),
  ),
  McpToolPolicySchema = DoctorLazy(() =>
    u({ name: o(), permission_policy: U(["always_allow", "always_ask", "always_deny"]).optional() }),
  ),
  McpSSEServerConfigSchema = DoctorLazy(() =>
    u({
      type: T("sse"),
      url: UrlStringSchema(),
      headers: pe(o(), o()).optional(),
      headersHelper: o().optional(),
      oauth: McpOAuthConfigSchema().optional(),
      timeout: PositiveIntSchema().optional(),
      request_timeout_ms: RequestTimeoutHintSchema(),
      tools: A(McpToolPolicySchema()).optional(),
      alwaysLoad: M().optional(),
      bareElicitationCapability: M().optional(),
      discoveryCache: M().optional(),
      role: ServerRoleSchema(),
      toolPermissions: pe(o(), ToolPermissionValueSchema()).optional(),
    }).transform(foldRequestTimeout),
  ),
  McpSSEIDEServerConfigSchema = DoctorLazy(() =>
    u({
      type: T("sse-ide"),
      url: UrlStringSchema(),
      ideName: o(),
      ideRunningInWindows: M().optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: M().optional(),
      role: ServerRoleSchema(),
    }),
  ),
  McpWebSocketIDEServerConfigSchema = DoctorLazy(() =>
    u({
      type: T("ws-ide"),
      url: UrlStringSchema(),
      ideName: o(),
      authToken: o().optional(),
      ideRunningInWindows: M().optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: M().optional(),
      role: ServerRoleSchema(),
    }),
  ),
  McpHTTPServerConfigSchema = DoctorLazy(() =>
    u({
      type: U(["http", "streamable-http"]).transform(() => "http"),
      url: UrlStringSchema(),
      headers: pe(o(), o()).optional(),
      headersHelper: o().optional(),
      oauth: McpOAuthConfigSchema().optional(),
      timeout: PositiveIntSchema().optional(),
      request_timeout_ms: RequestTimeoutHintSchema(),
      tools: A(McpToolPolicySchema()).optional(),
      alwaysLoad: M().optional(),
      bareElicitationCapability: M().optional(),
      discoveryCache: M().optional(),
      role: ServerRoleSchema(),
      toolPermissions: pe(o(), ToolPermissionValueSchema()).optional(),
    }).transform(foldRequestTimeout),
  ),
  MANAGED_FORBIDDEN_FIELDS = ["command", "args", "env", "headersHelper"],
  MANAGED_ALLOWED_TYPES = new Set(["http", "streamable-http", "sse"]),
  CONTROL_CHAR_PATTERN = /[\p{Cc}\p{Cf}\u2028\u2029]/u,
  $_ = /[\p{Cc}\p{Cf}\u2028\u2029]/gu;
//@ chunk-dcmhvw5a.js:68467-68559 placement
function isValidServerName(e) {
  return /^[A-Za-z0-9_-]+$/.test(e) && !isPrototypeKey(e) && e !== "constructor" && e !== "prototype";
}
//@ chunk-dcmhvw5a.js:68559-68657 placement
function isHttpsUrl(e) {
  try {
    let n = new URL(e);
    return n.protocol === "https:" && n.hostname !== "";
  } catch {
    return !1;
  }
}
//@ chunk-dcmhvw5a.js:68657-68942 placement
function flattenEntries(e, n = "", r = 0) {
  if (typeof e === "string") return [[n, e, !1]];
  if (r > 4 || e === null || typeof e !== "object") return [];
  return Object.entries(e).flatMap(([s, a]) => {
    let replaced = s.replace($_, (m) => `\\u${m.codePointAt(0).toString(16).padStart(4, "0")}`),
      g = n ? `${n}.${replaced}` : replaced;
    return [[g, s, !0], ...flattenEntries(a, g, r + 1)];
  });
}
/**
 * 托管设置中的 MCP 服务器 schema（只允许 http/sse URL）。
 */
//@ chunk-dcmhvw5a.js:68942-70193 placement
var ManagedMcpServerSchema = DoctorLazy(() =>
    pe(o(), oe())
      .check((e) => {
        let n = (s, a) => {
          e.issues.push({ code: "custom", path: s, message: a, input: e.value });
        };
        for (let s of MANAGED_FORBIDDEN_FIELDS)
          if (Object.hasOwn(e.value, s))
            n(
              [s],
              `"${s}" is not allowed in managed settings: only http/sse URL servers can be delivered this way, and a managed settings document must not name a program to run`,
            );
        if (!MANAGED_ALLOWED_TYPES.has(e.value.type))
          n(["type"], 'managed settings can only deliver "http" or "sse" servers');
        let url = e.value.url;
        if (typeof url === "string" && !isHttpsUrl(url))
          n(["url"], "managed settings servers must use a valid https:// url");
        for (let [s, a, c] of flattenEntries(e.value))
          if (CONTROL_CHAR_PATTERN.test(a))
            n(
              s.split("."),
              "contains control or invisible format characters (in a key or a value); a managed settings document must not be able to print escape sequences",
            );
          else if (!c && Ove(a))
            n(
              s.split("."),
              "${VAR} references are not expanded in managed settings; use a literal value (a managed settings document must not read the user's environment)",
            );
      })
      .pipe(Ue([McpHTTPServerConfigSchema(), McpSSEServerConfigSchema()])),
  ),
  MANAGED_MCP_SERVERS_SHAPE_MESSAGE = `"managedMcpServers" must be an object keyed by server name (the .mcp.json mcpServers shape; Claude Desktop's array form of its same-named key is not accepted here: use the server name as the key and "type" instead of "transport"). No managed MCP servers are installed from it until it is fixed.`;
/**
 * 解析托管 MCP 服务器表，报告无效项。
 */
//@ chunk-dcmhvw5a.js:70193-70577 placement
function parseManagedMcpServers(e, n) {
  if (e === void 0) return;
  if (e === null || typeof e !== "object" || Array.isArray(e)) {
    n("", MANAGED_MCP_SERVERS_SHAPE_MESSAGE);
    return;
  }
  let create = Object.create(null);
  for (let [s, a] of Object.entries(e)) {
    if (!isValidServerName(s)) {
      n("<invalid name>", SERVER_NAME_RULE_MESSAGE);
      continue;
    }
    let safeParse = ManagedMcpServerSchema().safeParse(a);
    if (safeParse.success) {
      create[s] = safeParse.data;
      continue;
    }
    let g = safeParse.error.issues[0];
    n(s, g ? [g.path.join("."), g.message].filter(Boolean).join(": ") : "failed validation");
  }
  return create;
}
/**
 * ws/sdk 服务器配置 schema。
 */
//@ chunk-dcmhvw5a.js:70577-71595 placement
var McpWebSocketServerConfigSchema = DoctorLazy(() =>
    u({
      type: T("ws"),
      url: UrlStringSchema(),
      headers: pe(o(), o()).optional(),
      headersHelper: o().optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: M().optional(),
      bareElicitationCapability: M().optional(),
      role: ServerRoleSchema(),
    }),
  ),
  McpSdkServerConfigSchema = DoctorLazy(() =>
    u({
      type: T("sdk"),
      name: o(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: M().optional(),
      disableAutoBackground: M()
        .optional()
        .catch(void 0),
      tools: A(McpToolPolicySchema())
        .optional()
        .catch(void 0),
      connectorId: o()
        .min(1)
        .optional()
        .catch(void 0),
    }),
  ),
  ToolPermissionValueSchema = DoctorLazy(() => U(["allow", "ask", "blocked"])),
  McpClaudeAIProxyServerConfigSchema = DoctorLazy(() =>
    u({
      type: T("claudeai-proxy"),
      url: UrlStringSchema(),
      id: o().regex(SERVER_ID_PATTERN),
      displayName: o().optional(),
      iconUrl: o().optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: M().optional(),
      toolPermissions: pe(o(), ToolPermissionValueSchema()).optional(),
      stateless: M().optional(),
      cachedInitResponse: pe(o(), oe()).nullish(),
      discoverSupport: U(["supported", "legacy", "unknown"])
        .optional()
        .catch(void 0),
      cachedDiscoverResponse: pe(o(), oe()).nullish(),
      eligible: M().nullish(),
      ineligibleReason: o().nullish(),
      enterpriseManaged: M().optional(),
    }),
  ),
  McpServerConfigSchema = DoctorLazy(() =>
    Ue([
      McpStdioServerConfigSchema(),
      McpSSEServerConfigSchema(),
      McpSSEIDEServerConfigSchema(),
      McpWebSocketIDEServerConfigSchema(),
      McpHTTPServerConfigSchema(),
      McpWebSocketServerConfigSchema(),
      McpSdkServerConfigSchema(),
      McpClaudeAIProxyServerConfigSchema(),
    ]),
  );
/**
 * 生成工具的 mcpInfo。
 */
//@ chunk-dcmhvw5a.js:71595-71693 placement
function getMcpInfoFromConnection(e) {
  return { serverName: e.name, scope: e.config.scope, pluginSource: e.config.pluginSource };
}
/**
 * 配置是否来自插件。
 */
//@ chunk-dcmhvw5a.js:71693-71740 placement
function isPluginServerConfig(e) {
  return e?.pluginSource !== void 0;
}
//@ chunk-5aas12zq.js:41509-41600 affinity
function isPositiveSafeInteger(e) {
  return typeof e === "number" && Number.isInteger(e) && e > 0 && e < 9223372036854776000;
}
/**
 * isValidMcpOAuthConfig：clientId、callbackPort、authServerMetadataUrl（须 https）、scopes、xaa 的形状校验。
 */
//@ chunk-5aas12zq.js:41600-41940 fingerprint = McpOAuthConfigSchema (0.468)
function isValidMcpOAuthConfig(e) {
  if (!isPlainObject(e)) return !1;
  let authServerMetadataUrl = e.authServerMetadataUrl;
  return (
    (e.clientId === void 0 || typeof e.clientId === "string") &&
    (e.callbackPort === void 0 || isPositiveSafeInteger(e.callbackPort)) &&
    (authServerMetadataUrl === void 0 ||
      (typeof authServerMetadataUrl === "string" && /^https:\/\/[^/?#]/.test(authServerMetadataUrl))) &&
    (e.scopes === void 0 || (typeof e.scopes === "string" && e.scopes !== "")) &&
    (e.xaa === void 0 || typeof e.xaa === "boolean")
  );
}
/**
 * hasHeadersHelper：配置带非空 headersHelper。
 */
//@ chunk-21ppfwx8.js:22724-22803 fingerprint = McpWebSocketServerConfigSchema (0.375)
function hasHeadersHelper(e) {
  return typeof e.headersHelper === "string" && e.headersHelper !== "";
}
/**
 * mightHaveMcpServers：任一作用域有服务器、需要显示自动连接对话框、插件可能提供 MCP 或插件加载出错时返回 true（宁可多判），用于决定是否初始化 MCP。
 */
//@ chunk-x8dej8aq.js:1829-2251 fingerprint = McpJsonConfigSchema (0.407)
async function mightHaveMcpServers(r) {
  for (let n of MCP_SETTINGS_SCOPES)
    if (Object.keys(getMcpConfigsByScope(n, { expandVars: !1 }).servers).length > 0) return !0;
  if (shouldShowDisableAutoConnectDialog()) return !0;
  try {
    for (let { record: record } of j$o(djt()))
      for (let [a, i] of Object.entries(record ?? {}))
        if ((i === !0 || Array.isArray(i)) && !isBuiltinPluginId(a)) return !0;
    let { enabled: enabled, errors: errors } = await loadAllPluginsCacheOnly(r);
    if (errors.length > 0) return !0;
    for (let e of enabled)
      if (!e.isBuiltin || (e.mcpServers !== void 0 && Object.keys(e.mcpServers).length > 0)) return !0;
  } catch {
    return !0;
  }
  return hasStoredOAuthToken();
}

export {
  isIdeOrSdkType,
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpSdkServerConfigSchema,
  McpClaudeAIProxyServerConfigSchema,
  isManagedConfigScope,
  isValidServerId,
  McpServerConfigSchema,
  MANAGED_CONFIG_SCOPES,
  ToolPermissionValueSchema,
  isPluginServerConfig,
  ConfigScopeSchema,
  getMcpInfoFromConnection,
  hasHeadersHelper,
  isPositiveSafeInteger,
  isValidMcpOAuthConfig,
  isValidServerName,
  ManagedMcpServerSchema,
  MANAGED_MCP_SERVERS_SHAPE_MESSAGE,
  parseManagedMcpServers,
  mightHaveMcpServers,
  foldRequestTimeout,
};
