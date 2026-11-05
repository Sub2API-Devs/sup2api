/**
 * services/mcp/types.ts
 *
 * 并入已有模块：MCP 服务器配置 schema（stdio、sse、http 等）；托管设置中的 MCP 服务器 schema（只允许 http/sse URL）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/types.ts
 * pieces: chunk-5hddsdew.js (1), chunk-6vxyfwtv.js (2), chunk-bym3dfgj.js (1), chunk-z20c443b.js (16)
 * attribution: fingerprint 4, affinity 1, layout 1, placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  _enum,
  literal,
  numberSchema,
  objectSchema,
  stringSchema,
  array,
  record,
  booleanSchema,
  unknown,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isPrototypeKey, SERVER_NAME_RULE_MESSAGE } from "../../schemas/hookEntryValidation.js";
import { containsEnvRef } from "./envExpansion.js";
import { MCP_SETTINGS_SCOPES, getMcpConfigsByScope } from "./config.js";
import { shouldShowDisableAutoConnectDialog } from "../../components/IdeAutoConnectDialog.js";
import {
  withAddDirPlugins,
  enabledPluginRecordsBySource,
} from "../../utils/plugins/pluginSettingsSources.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { hasStoredOAuthToken } from "../../utils/auth.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:65804-65930 fingerprint (2.1.88 match: ConfigScopeSchema, 0.885)
/**
 * ConfigScopeSchema：MCP 配置作用域枚举 local/user/project/dynamic/enterprise/claudeai/managed/agent；MANAGED_CONFIG_SCOPES = enterprise、managed。
 */
var ConfigScopeSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MANAGED_CONFIG_SCOPES;
deferInit("chunk-z20c443b.js:65804", () => {
  ConfigScopeSchema = DoctorLazy(() =>
    _enum(["local", "user", "project", "dynamic", "enterprise", "claudeai", "managed", "agent"]),
  );
  MANAGED_CONFIG_SCOPES = ["enterprise", "managed"];
});
//@ chunk-z20c443b.js:65930-65968 layout
/**
 * isManagedConfigScope：作用域是 enterprise 或 managed。
 */
function isManagedConfigScope(scope) {
  return MANAGED_CONFIG_SCOPES.includes(scope);
}
//@ chunk-z20c443b.js:65968-66030 placement
/**
 * 是否为 sdk/IDE 类型的 MCP 服务器。
 */
function isIdeOrSdkType(type) {
  return type === "sdk" || type === "sse-ide" || type === "ws-ide";
}
//@ chunk-z20c443b.js:66030-66056 placement
var SERVER_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
//@ chunk-z20c443b.js:66056-66111 placement
function isValidServerId(id) {
  return typeof id === "string" && SERVER_ID_PATTERN.test(id);
}
//@ chunk-z20c443b.js:66111-66333 placement
var ServerRoleSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PositiveIntSchema;
var MAX_REQUEST_TIMEOUT_MS;
var RequestTimeoutHintSchema;
deferInit("chunk-z20c443b.js:66111", () => {
  ServerRoleSchema = DoctorLazy(() => literal("comms").optional().catch(undefined));
  PositiveIntSchema = DoctorLazy(() => numberSchema().int().positive());
  MAX_REQUEST_TIMEOUT_MS = 300000;
  RequestTimeoutHintSchema = DoctorLazy(() =>
    numberSchema()
      .int()
      .positive()
      .optional()
      .catch(undefined)
      .describe("@internal CCR backend wire hint; folded into timeout at parse."),
  );
});
//@ chunk-z20c443b.js:66333-66448 placement
function foldRequestTimeout({ request_timeout_ms: requestTimeoutMs, ...rest }) {
  return {
    ...rest,
    ...(rest.timeout === undefined &&
      requestTimeoutMs !== undefined && {
        timeout: Math.min(requestTimeoutMs, MAX_REQUEST_TIMEOUT_MS),
      }),
  };
}
//@ chunk-z20c443b.js:66448-68546 placement
/**
 * 匹配控制字符的正则（转义用）。
 */
var McpStdioServerConfigSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BooleanSchema;
var MAX_URL_LENGTH;
var UrlStringSchema;
var MAX_METADATA_URL_LENGTH;
var McpOAuthConfigSchema;
var McpToolPolicySchema;
var McpSSEServerConfigSchema;
var McpSSEIDEServerConfigSchema;
var McpWebSocketIDEServerConfigSchema;
var McpHTTPServerConfigSchema;
var MANAGED_FORBIDDEN_FIELDS;
var MANAGED_ALLOWED_TYPES;
var CONTROL_CHAR_PATTERN;
var CONTROL_CHAR_ESCAPE_RE;
deferInit("chunk-z20c443b.js:66448", () => {
  McpStdioServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("stdio").optional(),
      command: stringSchema().min(1, "Command cannot be empty"),
      args: array(stringSchema()).default([]),
      env: record(stringSchema(), stringSchema()).optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: booleanSchema().optional(),
      bareElicitationCapability: booleanSchema().optional(),
      role: ServerRoleSchema(),
    }),
  );
  BooleanSchema = DoctorLazy(() => booleanSchema());
  MAX_URL_LENGTH = 65536;
  UrlStringSchema = () =>
    stringSchema().refine((url) => url.length <= MAX_URL_LENGTH, {
      abort: true,
      message: "url is too long",
    });
  MAX_METADATA_URL_LENGTH = 4096;
  McpOAuthConfigSchema = DoctorLazy(() =>
    objectSchema({
      clientId: stringSchema().optional(),
      callbackPort: numberSchema().int().positive().optional(),
      authServerMetadataUrl: stringSchema()
        .refine((url) => url.length <= MAX_METADATA_URL_LENGTH, {
          abort: true,
          message: "authServerMetadataUrl is too long",
        })
        .url()
        .startsWith("https://", {
          message: "authServerMetadataUrl must use https://",
        })
        .optional(),
      scopes: stringSchema().min(1).optional(),
      xaa: BooleanSchema().optional(),
    }),
  );
  McpToolPolicySchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema(),
      permission_policy: _enum(["always_allow", "always_ask", "always_deny"]).optional(),
    }),
  );
  McpSSEServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("sse"),
      url: UrlStringSchema(),
      headers: record(stringSchema(), stringSchema()).optional(),
      headersHelper: stringSchema().optional(),
      oauth: McpOAuthConfigSchema().optional(),
      timeout: PositiveIntSchema().optional(),
      request_timeout_ms: RequestTimeoutHintSchema(),
      tools: array(McpToolPolicySchema()).optional(),
      alwaysLoad: booleanSchema().optional(),
      displayName: stringSchema().optional().catch(undefined),
      bareElicitationCapability: booleanSchema().optional(),
      discoveryCache: booleanSchema().optional(),
      role: ServerRoleSchema(),
      toolPermissions: record(stringSchema(), ToolPermissionValueSchema()).optional(),
    }).transform(foldRequestTimeout),
  );
  McpSSEIDEServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("sse-ide"),
      url: UrlStringSchema(),
      ideName: stringSchema(),
      ideRunningInWindows: booleanSchema().optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: booleanSchema().optional(),
      role: ServerRoleSchema(),
    }),
  );
  McpWebSocketIDEServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("ws-ide"),
      url: UrlStringSchema(),
      ideName: stringSchema(),
      authToken: stringSchema().optional(),
      ideRunningInWindows: booleanSchema().optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: booleanSchema().optional(),
      role: ServerRoleSchema(),
    }),
  );
  McpHTTPServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: _enum(["http", "streamable-http"]).transform(() => "http"),
      url: UrlStringSchema(),
      headers: record(stringSchema(), stringSchema()).optional(),
      headersHelper: stringSchema().optional(),
      oauth: McpOAuthConfigSchema().optional(),
      timeout: PositiveIntSchema().optional(),
      request_timeout_ms: RequestTimeoutHintSchema(),
      tools: array(McpToolPolicySchema()).optional(),
      alwaysLoad: booleanSchema().optional(),
      displayName: stringSchema().optional().catch(undefined),
      bareElicitationCapability: booleanSchema().optional(),
      discoveryCache: booleanSchema().optional(),
      role: ServerRoleSchema(),
      toolPermissions: record(stringSchema(), ToolPermissionValueSchema()).optional(),
    }).transform(foldRequestTimeout),
  );
  MANAGED_FORBIDDEN_FIELDS = ["command", "args", "env", "headersHelper"];
  MANAGED_ALLOWED_TYPES = new Set(["http", "streamable-http", "sse"]);
  CONTROL_CHAR_PATTERN = /[\p{Cc}\p{Cf}\u2028\u2029]/u;
  CONTROL_CHAR_ESCAPE_RE = /[\p{Cc}\p{Cf}\u2028\u2029]/gu;
});
//@ chunk-z20c443b.js:68546-68638 placement
function isValidServerName(name) {
  return (
    /^[A-Za-z0-9_-]+$/.test(name) && !isPrototypeKey(name) && name !== "constructor" && name !== "prototype"
  );
}
//@ chunk-z20c443b.js:68638-68736 placement
function isHttpsUrl(url) {
  try {
    let parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname !== "";
  } catch {
    return false;
  }
}
//@ chunk-z20c443b.js:68736-69021 placement
function flattenEntries(value, prefix = "", depth = 0) {
  if (typeof value === "string") return [[prefix, value, false]];
  if (depth > 4 || value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, value]) => {
    let replaced = key.replace(
      CONTROL_CHAR_ESCAPE_RE,
      (char) => `\\u${char.codePointAt(0).toString(16).padStart(4, "0")}`,
    );
    let path = prefix ? `${prefix}.${replaced}` : replaced;
    return [[path, key, true], ...flattenEntries(value, path, depth + 1)];
  });
}
//@ chunk-z20c443b.js:69021-70271 placement
/**
 * 托管设置中的 MCP 服务器 schema（只允许 http/sse URL）。
 */
var ManagedMcpServerSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MANAGED_MCP_SERVERS_SHAPE_MESSAGE;
deferInit("chunk-z20c443b.js:69021", () => {
  ManagedMcpServerSchema = DoctorLazy(() =>
    record(stringSchema(), unknown())
      .check((ctx) => {
        let issue = (path, message) => {
          ctx.issues.push({
            code: "custom",
            path,
            message,
            input: ctx.value,
          });
        };
        for (let field of MANAGED_FORBIDDEN_FIELDS)
          if (Object.hasOwn(ctx.value, field))
            issue(
              [field],
              `"${field}" is not allowed in managed settings: only http/sse URL servers can be delivered this way, and a managed settings document must not name a program to run`,
            );
        if (!MANAGED_ALLOWED_TYPES.has(ctx.value.type))
          issue(["type"], 'managed settings can only deliver "http" or "sse" servers');
        let url = ctx.value.url;
        if (typeof url === "string" && !isHttpsUrl(url))
          issue(["url"], "managed settings servers must use a valid https:// url");
        for (let [path, text, isKey] of flattenEntries(ctx.value))
          if (CONTROL_CHAR_PATTERN.test(text))
            issue(
              path.split("."),
              "contains control or invisible format characters (in a key or a value); a managed settings document must not be able to print escape sequences",
            );
          else if (!isKey && containsEnvRef(text))
            issue(
              path.split("."),
              "${VAR} references are not expanded in managed settings; use a literal value (a managed settings document must not read the user's environment)",
            );
      })
      .pipe(union([McpHTTPServerConfigSchema(), McpSSEServerConfigSchema()])),
  );
  MANAGED_MCP_SERVERS_SHAPE_MESSAGE = `"managedMcpServers" must be an object keyed by server name (the .mcp.json mcpServers shape; Claude Desktop's array form of its same-named key is not accepted here: use the server name as the key and "type" instead of "transport"). No managed MCP servers are installed from it until it is fixed.`;
});
//@ chunk-z20c443b.js:70271-70655 placement
/**
 * 解析托管 MCP 服务器表，报告无效项。
 */
function parseManagedMcpServers(value, onError) {
  if (value === undefined) return;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    onError("", MANAGED_MCP_SERVERS_SHAPE_MESSAGE);
    return;
  }
  let servers = Object.create(null);
  for (let [key, value_2] of Object.entries(value)) {
    if (!isValidServerName(key)) {
      onError("<invalid name>", SERVER_NAME_RULE_MESSAGE);
      continue;
    }
    let parseResult = ManagedMcpServerSchema().safeParse(value_2);
    if (parseResult.success) {
      servers[key] = parseResult.data;
      continue;
    }
    let issue = parseResult.error.issues[0];
    onError(
      key,
      issue ? [issue.path.join("."), issue.message].filter(Boolean).join(": ") : "failed validation",
    );
  }
  return servers;
}
//@ chunk-z20c443b.js:70655-71702 placement
/**
 * ws/sdk 服务器配置 schema。
 */
var McpWebSocketServerConfigSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var McpSdkServerConfigSchema;
var ToolPermissionValueSchema;
var McpClaudeAIProxyServerConfigSchema;
var McpServerConfigSchema;
deferInit("chunk-z20c443b.js:70655", () => {
  McpWebSocketServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("ws"),
      url: UrlStringSchema(),
      headers: record(stringSchema(), stringSchema()).optional(),
      headersHelper: stringSchema().optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: booleanSchema().optional(),
      bareElicitationCapability: booleanSchema().optional(),
      role: ServerRoleSchema(),
    }),
  );
  McpSdkServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("sdk"),
      name: stringSchema(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: booleanSchema().optional(),
      disableAutoBackground: booleanSchema().optional().catch(undefined),
      tools: array(McpToolPolicySchema()).optional().catch(undefined),
      connectorId: stringSchema().min(1).optional().catch(undefined),
    }),
  );
  ToolPermissionValueSchema = DoctorLazy(() => _enum(["allow", "ask", "blocked"]));
  McpClaudeAIProxyServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("claudeai-proxy"),
      url: UrlStringSchema(),
      id: stringSchema().regex(SERVER_ID_PATTERN),
      displayName: stringSchema().optional(),
      urlReportable: booleanSchema().optional(),
      iconUrl: stringSchema().optional(),
      timeout: PositiveIntSchema().optional(),
      alwaysLoad: booleanSchema().optional(),
      toolPermissions: record(stringSchema(), ToolPermissionValueSchema()).optional(),
      stateless: booleanSchema().optional(),
      cachedInitResponse: record(stringSchema(), unknown()).nullish(),
      discoverSupport: _enum(["supported", "legacy", "unknown"]).optional().catch(undefined),
      cachedDiscoverResponse: record(stringSchema(), unknown()).nullish(),
      eligible: booleanSchema().nullish(),
      ineligibleReason: stringSchema().nullish(),
      enterpriseManaged: booleanSchema().optional(),
    }),
  );
  McpServerConfigSchema = DoctorLazy(() =>
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
});
//@ chunk-z20c443b.js:71702-71800 placement
/**
 * 生成工具的 mcpInfo。
 */
function getMcpInfoFromConnection(connection) {
  return {
    serverName: connection.name,
    scope: connection.config.scope,
    pluginSource: connection.config.pluginSource,
  };
}
//@ chunk-z20c443b.js:71800-71847 placement
/**
 * 配置是否来自插件。
 */
function isPluginServerConfig(config) {
  return config?.pluginSource !== undefined;
}
//@ chunk-5hddsdew.js:22760-22839 fingerprint (2.1.88 match: McpWebSocketServerConfigSchema, 0.375)
/**
 * hasHeadersHelper：配置带非空 headersHelper。
 */
function hasHeadersHelper(config) {
  return typeof config.headersHelper === "string" && config.headersHelper !== "";
}
//@ chunk-bym3dfgj.js:1831-2253 fingerprint (2.1.88 match: McpJsonConfigSchema, 0.407)
/**
 * mightHaveMcpServers：任一作用域有服务器、需要显示自动连接对话框、插件可能提供 MCP 或插件加载出错时返回 true（宁可多判），用于决定是否初始化 MCP。
 */
async function mightHaveMcpServers(storageV5) {
  for (let scope of MCP_SETTINGS_SCOPES)
    if (
      Object.keys(
        getMcpConfigsByScope(scope, {
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
    for (let plugin of enabled)
      if (!plugin.isBuiltin || (plugin.mcpServers !== undefined && Object.keys(plugin.mcpServers).length > 0))
        return true;
  } catch {
    return true;
  }
  return hasStoredOAuthToken();
}
//@ chunk-6vxyfwtv.js:41796-41887 affinity
function isPositiveSafeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value < 9223372036854776000;
}
//@ chunk-6vxyfwtv.js:41887-42227 fingerprint (2.1.88 match: McpOAuthConfigSchema, 0.468)
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
export {
  ToolPermissionValueSchema,
  isPluginServerConfig,
  isManagedConfigScope,
  getMcpInfoFromConnection,
  hasHeadersHelper,
  McpStdioServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpSSEServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpServerConfigSchema,
  isIdeOrSdkType,
  McpSdkServerConfigSchema,
  McpClaudeAIProxyServerConfigSchema,
  isValidServerId,
  MANAGED_CONFIG_SCOPES,
  ConfigScopeSchema,
  isPositiveSafeInteger,
  isValidMcpOAuthConfig,
  mightHaveMcpServers,
  foldRequestTimeout,
  isValidServerName,
  ManagedMcpServerSchema,
  MANAGED_MCP_SERVERS_SHAPE_MESSAGE,
  parseManagedMcpServers,
};
