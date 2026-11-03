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
import {
  _enum,
  literal,
  E,
  u,
  string,
  array,
  record,
  M,
  unknown,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isPrototypeKey, SERVER_NAME_RULE_MESSAGE } from "../../schemas/hookEntryValidation.js";
import { containsEnvRef } from "./envExpansion.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { MCP_SETTINGS_SCOPES, getMcpConfigsByScope } from "./config.js";
import { shouldShowDisableAutoConnectDialog } from "../../components/IdeAutoConnectDialog.js";
import {
  withAddDirPlugins,
  enabledPluginRecordsBySource,
} from "../../utils/plugins/pluginSettingsSources.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { hasStoredOAuthToken } from "../../utils/auth.js";

//@ chunk-dcmhvw5a.js:65746-65872 fingerprint = ConfigScopeSchema (0.885)
/**
 * ConfigScopeSchema：MCP 配置作用域枚举 local/user/project/dynamic/enterprise/claudeai/managed/agent；MANAGED_CONFIG_SCOPES = enterprise、managed。
 */
var ConfigScopeSchema = DoctorLazy(() =>
  _enum(["local", "user", "project", "dynamic", "enterprise", "claudeai", "managed", "agent"]),
);
var MANAGED_CONFIG_SCOPES = ["enterprise", "managed"];
//@ chunk-dcmhvw5a.js:65872-65910 layout
/**
 * isManagedConfigScope：作用域是 enterprise 或 managed。
 */
function isManagedConfigScope(scope) {
  return MANAGED_CONFIG_SCOPES.includes(scope);
}
//@ chunk-dcmhvw5a.js:65910-65971 fingerprint = TransportSchema (0.945)
/**
 * TransportSchema：stdio/sse/sse-ide/http/ws/sdk。
 */
var TransportSchema = DoctorLazy(() => _enum(["stdio", "sse", "sse-ide", "http", "ws", "sdk"]));
//@ chunk-dcmhvw5a.js:65971-66033 placement
/**
 * 是否为 sdk/IDE 类型的 MCP 服务器。
 */
function isIdeOrSdkType(e) {
  return e === "sdk" || e === "sse-ide" || e === "ws-ide";
}
//@ chunk-dcmhvw5a.js:66033-66059 placement
var SERVER_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
//@ chunk-dcmhvw5a.js:66059-66114 placement
function isValidServerId(id) {
  return typeof id === "string" && SERVER_ID_PATTERN.test(id);
}
//@ chunk-dcmhvw5a.js:66114-66336 placement
var ServerRoleSchema = DoctorLazy(() => literal("comms").optional().catch(undefined));
var PositiveIntSchema = DoctorLazy(() => E().int().positive());
var MAX_REQUEST_TIMEOUT_MS = 300000;
var RequestTimeoutHintSchema = DoctorLazy(() =>
  E()
    .int()
    .positive()
    .optional()
    .catch(undefined)
    .describe("@internal CCR backend wire hint; folded into timeout at parse."),
);
//@ chunk-dcmhvw5a.js:66336-66451 placement
function foldRequestTimeout({ request_timeout_ms: requestTimeoutMs, ...n }) {
  return {
    ...n,
    ...(n.timeout === undefined &&
      requestTimeoutMs !== undefined && {
        timeout: Math.min(requestTimeoutMs, MAX_REQUEST_TIMEOUT_MS),
      }),
  };
}
//@ chunk-dcmhvw5a.js:66451-68467 placement
/**
 * 匹配控制字符的正则（转义用）。
 */
var McpStdioServerConfigSchema = DoctorLazy(() =>
  u({
    type: literal("stdio").optional(),
    command: string().min(1, "Command cannot be empty"),
    args: array(string()).default([]),
    env: record(string(), string()).optional(),
    timeout: PositiveIntSchema().optional(),
    alwaysLoad: M().optional(),
    bareElicitationCapability: M().optional(),
    role: ServerRoleSchema(),
  }),
);
var BooleanSchema = DoctorLazy(() => M());
var MAX_URL_LENGTH = 65536;
var UrlStringSchema = () =>
  string().refine((e) => e.length <= MAX_URL_LENGTH, {
    abort: true,
    message: "url is too long",
  });
var MAX_METADATA_URL_LENGTH = 4096;
var McpOAuthConfigSchema = DoctorLazy(() =>
  u({
    clientId: string().optional(),
    callbackPort: E().int().positive().optional(),
    authServerMetadataUrl: string()
      .refine((e) => e.length <= MAX_METADATA_URL_LENGTH, {
        abort: true,
        message: "authServerMetadataUrl is too long",
      })
      .url()
      .startsWith("https://", {
        message: "authServerMetadataUrl must use https://",
      })
      .optional(),
    scopes: string().min(1).optional(),
    xaa: BooleanSchema().optional(),
  }),
);
var McpToolPolicySchema = DoctorLazy(() =>
  u({
    name: string(),
    permission_policy: _enum(["always_allow", "always_ask", "always_deny"]).optional(),
  }),
);
var McpSSEServerConfigSchema = DoctorLazy(() =>
  u({
    type: literal("sse"),
    url: UrlStringSchema(),
    headers: record(string(), string()).optional(),
    headersHelper: string().optional(),
    oauth: McpOAuthConfigSchema().optional(),
    timeout: PositiveIntSchema().optional(),
    request_timeout_ms: RequestTimeoutHintSchema(),
    tools: array(McpToolPolicySchema()).optional(),
    alwaysLoad: M().optional(),
    bareElicitationCapability: M().optional(),
    discoveryCache: M().optional(),
    role: ServerRoleSchema(),
    toolPermissions: record(string(), ToolPermissionValueSchema()).optional(),
  }).transform(foldRequestTimeout),
);
var McpSSEIDEServerConfigSchema = DoctorLazy(() =>
  u({
    type: literal("sse-ide"),
    url: UrlStringSchema(),
    ideName: string(),
    ideRunningInWindows: M().optional(),
    timeout: PositiveIntSchema().optional(),
    alwaysLoad: M().optional(),
    role: ServerRoleSchema(),
  }),
);
var McpWebSocketIDEServerConfigSchema = DoctorLazy(() =>
  u({
    type: literal("ws-ide"),
    url: UrlStringSchema(),
    ideName: string(),
    authToken: string().optional(),
    ideRunningInWindows: M().optional(),
    timeout: PositiveIntSchema().optional(),
    alwaysLoad: M().optional(),
    role: ServerRoleSchema(),
  }),
);
var McpHTTPServerConfigSchema = DoctorLazy(() =>
  u({
    type: _enum(["http", "streamable-http"]).transform(() => "http"),
    url: UrlStringSchema(),
    headers: record(string(), string()).optional(),
    headersHelper: string().optional(),
    oauth: McpOAuthConfigSchema().optional(),
    timeout: PositiveIntSchema().optional(),
    request_timeout_ms: RequestTimeoutHintSchema(),
    tools: array(McpToolPolicySchema()).optional(),
    alwaysLoad: M().optional(),
    bareElicitationCapability: M().optional(),
    discoveryCache: M().optional(),
    role: ServerRoleSchema(),
    toolPermissions: record(string(), ToolPermissionValueSchema()).optional(),
  }).transform(foldRequestTimeout),
);
var MANAGED_FORBIDDEN_FIELDS = ["command", "args", "env", "headersHelper"];
var MANAGED_ALLOWED_TYPES = new Set(["http", "streamable-http", "sse"]);
var CONTROL_CHAR_PATTERN = /[\p{Cc}\p{Cf}\u2028\u2029]/u;
var CONTROL_CHAR_ESCAPE_RE = /[\p{Cc}\p{Cf}\u2028\u2029]/gu;
//@ chunk-dcmhvw5a.js:68467-68559 placement
function isValidServerName(e) {
  return /^[A-Za-z0-9_-]+$/.test(e) && !isPrototypeKey(e) && e !== "constructor" && e !== "prototype";
}
//@ chunk-dcmhvw5a.js:68559-68657 placement
function isHttpsUrl(url) {
  try {
    let n = new URL(url);
    return n.protocol === "https:" && n.hostname !== "";
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:68657-68942 placement
function flattenEntries(e, n = "", r = 0) {
  if (typeof e === "string") return [[n, e, false]];
  if (r > 4 || e === null || typeof e !== "object") return [];
  return Object.entries(e).flatMap(([key, value]) => {
    let replaced = key.replace(
      CONTROL_CHAR_ESCAPE_RE,
      (m) => `\\u${m.codePointAt(0).toString(16).padStart(4, "0")}`,
    );
    let g = n ? `${n}.${replaced}` : replaced;
    return [[g, key, true], ...flattenEntries(value, g, r + 1)];
  });
}
//@ chunk-dcmhvw5a.js:68942-70193 placement
/**
 * 托管设置中的 MCP 服务器 schema（只允许 http/sse URL）。
 */
var ManagedMcpServerSchema = DoctorLazy(() =>
  record(string(), unknown())
    .check((e) => {
      let n = (path, message) => {
        e.issues.push({
          code: "custom",
          path,
          message,
          input: e.value,
        });
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
        else if (!c && containsEnvRef(a))
          n(
            s.split("."),
            "${VAR} references are not expanded in managed settings; use a literal value (a managed settings document must not read the user's environment)",
          );
    })
    .pipe(union([McpHTTPServerConfigSchema(), McpSSEServerConfigSchema()])),
);
var MANAGED_MCP_SERVERS_SHAPE_MESSAGE = `"managedMcpServers" must be an object keyed by server name (the .mcp.json mcpServers shape; Claude Desktop's array form of its same-named key is not accepted here: use the server name as the key and "type" instead of "transport"). No managed MCP servers are installed from it until it is fixed.`;
//@ chunk-dcmhvw5a.js:70193-70577 placement
/**
 * 解析托管 MCP 服务器表，报告无效项。
 */
function parseManagedMcpServers(e, n) {
  if (e === undefined) return;
  if (e === null || typeof e !== "object" || Array.isArray(e)) {
    n("", MANAGED_MCP_SERVERS_SHAPE_MESSAGE);
    return;
  }
  let r = Object.create(null);
  for (let [key, value] of Object.entries(e)) {
    if (!isValidServerName(key)) {
      n("<invalid name>", SERVER_NAME_RULE_MESSAGE);
      continue;
    }
    let c = ManagedMcpServerSchema().safeParse(value);
    if (c.success) {
      r[key] = c.data;
      continue;
    }
    let g = c.error.issues[0];
    n(key, g ? [g.path.join("."), g.message].filter(Boolean).join(": ") : "failed validation");
  }
  return r;
}
//@ chunk-dcmhvw5a.js:70577-71595 placement
/**
 * ws/sdk 服务器配置 schema。
 */
var McpWebSocketServerConfigSchema = DoctorLazy(() =>
  u({
    type: literal("ws"),
    url: UrlStringSchema(),
    headers: record(string(), string()).optional(),
    headersHelper: string().optional(),
    timeout: PositiveIntSchema().optional(),
    alwaysLoad: M().optional(),
    bareElicitationCapability: M().optional(),
    role: ServerRoleSchema(),
  }),
);
var McpSdkServerConfigSchema = DoctorLazy(() =>
  u({
    type: literal("sdk"),
    name: string(),
    timeout: PositiveIntSchema().optional(),
    alwaysLoad: M().optional(),
    disableAutoBackground: M().optional().catch(undefined),
    tools: array(McpToolPolicySchema()).optional().catch(undefined),
    connectorId: string().min(1).optional().catch(undefined),
  }),
);
var ToolPermissionValueSchema = DoctorLazy(() => _enum(["allow", "ask", "blocked"]));
var McpClaudeAIProxyServerConfigSchema = DoctorLazy(() =>
  u({
    type: literal("claudeai-proxy"),
    url: UrlStringSchema(),
    id: string().regex(SERVER_ID_PATTERN),
    displayName: string().optional(),
    iconUrl: string().optional(),
    timeout: PositiveIntSchema().optional(),
    alwaysLoad: M().optional(),
    toolPermissions: record(string(), ToolPermissionValueSchema()).optional(),
    stateless: M().optional(),
    cachedInitResponse: record(string(), unknown()).nullish(),
    discoverSupport: _enum(["supported", "legacy", "unknown"]).optional().catch(undefined),
    cachedDiscoverResponse: record(string(), unknown()).nullish(),
    eligible: M().nullish(),
    ineligibleReason: string().nullish(),
    enterpriseManaged: M().optional(),
  }),
);
var McpServerConfigSchema = DoctorLazy(() =>
  union([
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
//@ chunk-dcmhvw5a.js:71595-71693 placement
/**
 * 生成工具的 mcpInfo。
 */
function getMcpInfoFromConnection(e) {
  return {
    serverName: e.name,
    scope: e.config.scope,
    pluginSource: e.config.pluginSource,
  };
}
//@ chunk-dcmhvw5a.js:71693-71740 placement
/**
 * 配置是否来自插件。
 */
function isPluginServerConfig(e) {
  return e?.pluginSource !== undefined;
}
//@ chunk-5aas12zq.js:41509-41600 affinity
function isPositiveSafeInteger(e) {
  return typeof e === "number" && Number.isInteger(e) && e > 0 && e < 9223372036854776000;
}
//@ chunk-5aas12zq.js:41600-41940 fingerprint = McpOAuthConfigSchema (0.468)
/**
 * isValidMcpOAuthConfig：clientId、callbackPort、authServerMetadataUrl（须 https）、scopes、xaa 的形状校验。
 */
function isValidMcpOAuthConfig(oauth) {
  if (!isPlainObject(oauth)) return false;
  let authServerMetadataUrl = oauth.authServerMetadataUrl;
  return (
    (oauth.clientId === undefined || typeof oauth.clientId === "string") &&
    (oauth.callbackPort === undefined || isPositiveSafeInteger(oauth.callbackPort)) &&
    (authServerMetadataUrl === undefined ||
      (typeof authServerMetadataUrl === "string" && /^https:\/\/[^/?#]/.test(authServerMetadataUrl))) &&
    (oauth.scopes === undefined || (typeof oauth.scopes === "string" && oauth.scopes !== "")) &&
    (oauth.xaa === undefined || typeof oauth.xaa === "boolean")
  );
}
//@ chunk-21ppfwx8.js:22724-22803 fingerprint = McpWebSocketServerConfigSchema (0.375)
/**
 * hasHeadersHelper：配置带非空 headersHelper。
 */
function hasHeadersHelper(e) {
  return typeof e.headersHelper === "string" && e.headersHelper !== "";
}
//@ chunk-x8dej8aq.js:1829-2251 fingerprint = McpJsonConfigSchema (0.407)
/**
 * mightHaveMcpServers：任一作用域有服务器、需要显示自动连接对话框、插件可能提供 MCP 或插件加载出错时返回 true（宁可多判），用于决定是否初始化 MCP。
 */
async function mightHaveMcpServers(storageV5) {
  for (let n of MCP_SETTINGS_SCOPES)
    if (
      Object.keys(
        getMcpConfigsByScope(n, {
          expandVars: false,
        }).servers,
      ).length > 0
    )
      return true;
  if (shouldShowDisableAutoConnectDialog()) return true;
  try {
    for (let { record } of withAddDirPlugins(enabledPluginRecordsBySource()))
      for (let [key, value] of Object.entries(record ?? {}))
        if ((value === true || Array.isArray(value)) && !isBuiltinPluginId(key)) return true;
    let { enabled, errors } = await loadAllPluginsCacheOnly(storageV5);
    if (errors.length > 0) return true;
    for (let e of enabled)
      if (!e.isBuiltin || (e.mcpServers !== undefined && Object.keys(e.mcpServers).length > 0)) return true;
  } catch {
    return true;
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
