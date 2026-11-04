/**
 * services/mcp/discoveryCache.ts
 *
 * 2.1.316 新增：MCP 服务器发现缓存：加密保存 initialize/tools 结果，按身份代际与授权指纹校验，失败计数与清理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0qyh5wah.js (83)
 * attribution: placement 83
 */
import { randomBytes, createCipheriv, createHash } from "crypto";
import { join, basename } from "path";
import { readSecureStorageForMcp } from "./credentialStoreRead.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { env } from "../../utils/env.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  numberSchema,
  _enum,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  PROTOCOL_ERAS,
  discoveryCacheOffReason,
  getDiscoveryCacheStore,
  isDiscoveryCacheOn,
  latchCacheOff,
  isDiscoveryCacheUsable,
  ACCOUNT_RESOLVE_TIMEOUT_MS,
} from "./mcpAccountKey.js";
import { containsEnvRef } from "./envExpansion.js";
import { VISUALIZE, MEMORY, CLAUDE_ARTIFACTS, derivedServerId } from "./firstPartyServerIds.js";
import { isSettingsSourcedEnvValue } from "../../utils/managedEnvApply.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isPluginServerConfig } from "./types.js";
import { ccrSessionIdFromMcpUrl, UUID_RE, isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { sessionIdBody, isSelfAddressableSessionId } from "../../bridge/sessionIdCompat.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import {
  headerValues,
  X_MCP_SERVER_ORIGIN,
  X_CCR_OWNER_SLACK_USER_ID,
} from "./fileReference/fileReferencePolicy.js";
import { isKnownProxyEndpointUrl } from "../../tools/WebFetchTool/utils.js";
import { RESERVED_SERVER_IDS_WITH_DOCS } from "./remoteBrowserServer.js";
import { reservedMcpServerNames } from "./builtinServerNames.js";
import {
  identityChangedThisProcess,
  getMcpIdentitySnapshot,
  isCurrentIdentityEpoch,
  identityEpoch,
} from "./identityChange.js";
import { isCliOwnedConfig, hasCliOwnedBearer } from "./cliOwnedClients.js";
import { isFirstPartyMcpUrl, configHasAuthorizationHeader, getServerKey } from "./auth.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { serverCacheKey } from "./client.js";
import {
  currentEra,
  currentIdentityToken,
  getPresentedCredentialLog,
  openDiscoverySeal,
  headerDigest,
} from "./discoveryIdentity.js";
import { isMcpAppsHost } from "./mcpClientCapabilities.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { getErrnoCode, isENOENT, errorMessage } from "../../utils/errors.js";
import { logMCPDebug } from "../../utils/log.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { safeParseJSON } from "../../utils/json.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { sleep } from "../../utils/sleep.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logForDebugging } from "../../utils/debug.js";
import { lock } from "../../utils/lockfile.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0qyh5wah.js:3003-3089 placement
/**
 * 缓存版本前缀 "v2:"。
 */
var DISCOVERY_CACHE_KEY_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var IV_BYTES;
var AUTH_TAG_BYTES;
var CACHE_VERSION_PREFIX;
var buffer;
var KEY_B64_RE;
deferInit("chunk-0qyh5wah.js:3003", () => {
  DISCOVERY_CACHE_KEY_BYTES = 32;
  IV_BYTES = 12;
  AUTH_TAG_BYTES = 16;
  CACHE_VERSION_PREFIX = "v2:";
  buffer = Buffer.from("mcp-dc", "utf8");
  KEY_B64_RE = /^[A-Za-z0-9+/]{43}=$/;
});
//@ chunk-0qyh5wah.js:3089-3207 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(buffer) {
  if (typeof buffer !== "string" || !KEY_B64_RE.test(buffer)) return;
  let buffer_2 = Buffer.from(buffer, "base64");
  return buffer_2.length === DISCOVERY_CACHE_KEY_BYTES ? buffer_2 : undefined;
}
//@ chunk-0qyh5wah.js:3207-3537 placement
async function getMcpDiscoveryCacheKey() {
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED) return;
  let encodedKey = encodeCacheKey(secureStorageForMcp?.mcpDiscoveryCacheKey);
  if (encodedKey) return encodedKey;
  let mcpDiscoveryCacheKey = randomBytes(DISCOVERY_CACHE_KEY_BYTES).toString("base64");
  let mutated = false;
  try {
    mutated = (
      await getSecureStorage().mutate((secureStorage) =>
        base64URLEncode(secureStorage.mcpDiscoveryCacheKey)
          ? secureStorage
          : {
              ...secureStorage,
              mcpDiscoveryCacheKey,
            },
      )
    ).success;
  } catch {
    mutated = false;
  }
  if (!mutated) return;
  let secureStorageForMcp_2 = await readSecureStorageForMcp();
  if (secureStorageForMcp_2 === READ_FAILED) return;
  return encodeCacheKey(secureStorageForMcp_2?.mcpDiscoveryCacheKey);
}
//@ chunk-0qyh5wah.js:3537-3565 placement
function encodeCacheKey(buffer) {
  return base64URLEncode(buffer);
}
//@ chunk-0qyh5wah.js:3565-3904 placement
function buildDiscoveryCacheAad(schemaVersion, cacheKey, fingerprint) {
  if (!Number.isInteger(schemaVersion) || schemaVersion < 0 || schemaVersion > 255)
    throw Error("discovery-cache seal: schema version must fit one byte");
  let mapped = [cacheKey, fingerprint].map((part) => Buffer.from(part, "utf8"));
  let aad = Buffer.allocUnsafe(buffer.length + 1 + mapped.reduce((acc, part) => acc + 4 + part.length, 0));
  let offset = buffer.copy(aad, 0);
  offset = aad.writeUInt8(schemaVersion, offset);
  for (let part of mapped) {
    offset = aad.writeUInt32BE(part.length, offset);
    offset += part.copy(aad, offset);
  }
  return aad;
}
//@ chunk-0qyh5wah.js:3904-4136 placement
function sealDiscoveryCacheEntry(sealParams, serialized) {
  let iv = randomBytes(IV_BYTES);
  let cipheriv = createCipheriv("aes-256-gcm", sealParams.key, iv, {
    authTagLength: AUTH_TAG_BYTES,
  });
  cipheriv.setAAD(sealParams.aad);
  let buffer = Buffer.concat([cipheriv.update(serialized, "utf8"), cipheriv.final()]);
  let authTag = cipheriv.getAuthTag();
  return (
    CACHE_VERSION_PREFIX +
    hashCacheKeyId(sealParams.cacheKey) +
    ":" +
    Buffer.concat([iv, buffer, authTag]).toString("base64url")
  );
}
//@ chunk-0qyh5wah.js:4136-4233 placement
function hashCacheKeyId(cacheKey) {
  return createHash("sha256")
    .update(cacheKey, "utf8")
    .digest()
    .subarray(0, CACHE_KEY_ID_BYTES)
    .toString("base64url");
}
//@ chunk-0qyh5wah.js:4233-4326 placement
/**
 * base64url 字符的正则。
 */
var CACHE_KEY_ID_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CACHE_KEY_ID_CHARS;
var regExp;
var BASE64URL_CHARS_RE;
deferInit("chunk-0qyh5wah.js:4233", () => {
  CACHE_KEY_ID_BYTES = 16;
  CACHE_KEY_ID_CHARS = Math.ceil((CACHE_KEY_ID_BYTES * 4) / 3);
  regExp = new RegExp(`^[A-Za-z0-9_-]{${CACHE_KEY_ID_CHARS}}$`);
  BASE64URL_CHARS_RE = /^[A-Za-z0-9_-]*$/;
});
//@ chunk-0qyh5wah.js:6392-6432 placement
/**
 * 默认的连续刷新失败阈值（1）。
 */
var CACHE_ENTRY_VERSION = 1;
var DEFAULT_TTL_S = 900;
var DEFAULT_MAX_STALE_S = 14400;
var MAX_MAX_STALE_S = 604800;
var DEFAULT_STRIKES = 1;
//@ chunk-0qyh5wah.js:6432-6501 placement
/**
 * 取连续刷新失败阈值（环境变量可覆盖）。
 */
function getMaxStrikes() {
  let MCP_DISCOVERY_CACHE_STRIKES = env.MCP_DISCOVERY_CACHE_STRIKES;
  return MCP_DISCOVERY_CACHE_STRIKES && MCP_DISCOVERY_CACHE_STRIKES > 0
    ? MCP_DISCOVERY_CACHE_STRIKES
    : DEFAULT_STRIKES;
}
//@ chunk-0qyh5wah.js:6501-6957 placement
/**
 * 发现缓存条目的 zod 结构：版本、服务器名、缓存键、保存时间、连续刷新失败次数、serverInfo、协商的协议代、capabilities 与 tools/prompts/resources/templates。
 */
var CACHE_FILE_MODE; // deferred: loads other modules while loading; runs once its import cycle is complete
var CACHE_DIR_MODE;
var discoveryEntrySchema;
deferInit("chunk-0qyh5wah.js:6501", () => {
  CACHE_FILE_MODE = 384;
  CACHE_DIR_MODE = 448;
  discoveryEntrySchema = DoctorLazy(() => {
    let wireSchemas = require("./emitTripwireEvent.lazy.js").mcpClientModule().discoveryWireSchemas();
    return objectSchema({
      v: literal(CACHE_ENTRY_VERSION),
      serverName: stringSchema(),
      cacheKey: stringSchema(),
      savedAt: numberSchema(),
      toolsSavedAt: numberSchema().optional(),
      consecutiveRefreshFailures: numberSchema().int().nonnegative(),
      serverInfo: wireSchemas.implementation.optional(),
      negotiatedEra: _enum(PROTOCOL_ERAS).optional(),
      capabilities: wireSchemas.serverCapabilities,
      tools: array(wireSchemas.tool),
      commands: array(wireSchemas.prompt),
      resources: array(wireSchemas.resource),
      templates: array(wireSchemas.resourceTemplate).optional(),
    });
  });
});
//@ chunk-0qyh5wah.js:6957-7046 placement
/**
 * 取缓存 TTL（毫秒，写入与上限取小）。
 */
function getCacheTtlMs() {
  let MCP_DISCOVERY_CACHE_TTL_S = env.MCP_DISCOVERY_CACHE_TTL_S;
  return Math.min(
    (MCP_DISCOVERY_CACHE_TTL_S && MCP_DISCOVERY_CACHE_TTL_S > 0 ? MCP_DISCOVERY_CACHE_TTL_S : DEFAULT_TTL_S) *
      1000,
    getMaxStaleMs(),
  );
}
//@ chunk-0qyh5wah.js:7046-7137 placement
/**
 * 取缓存最大陈旧时长（毫秒）。
 */
function getMaxStaleMs() {
  let MCP_DISCOVERY_CACHE_MAX_STALE_S = env.MCP_DISCOVERY_CACHE_MAX_STALE_S;
  return (
    Math.min(
      MCP_DISCOVERY_CACHE_MAX_STALE_S && MCP_DISCOVERY_CACHE_MAX_STALE_S > 0
        ? MCP_DISCOVERY_CACHE_MAX_STALE_S
        : DEFAULT_MAX_STALE_S,
      MAX_MAX_STALE_S,
    ) * 1000
  );
}
//@ chunk-0qyh5wah.js:7137-7175 placement
function isDiscoveryCacheEligible(config) {
  return discoveryCacheExclusion(config) === undefined;
}
//@ chunk-0qyh5wah.js:7175-7224 placement
/**
 * 判断原因是否属于已知的缓存排除原因。
 */
function isKnownExclusionReason(reason) {
  return CACHE_EXCLUSION_PROPS.some((prop) => prop.reason === reason);
}
//@ chunk-0qyh5wah.js:7224-7470 placement
var CACHE_EXCLUSION_PROPS = [
  {
    prop: "discoveryCache",
    reason: "opt-out",
    excludes: (value) => value === false,
    normalize: (value) => (value === false ? false : undefined),
    valueDomain: [undefined, false],
  },
  {
    prop: "headersHelper",
    reason: "headers-helper",
    excludes: (value) => Boolean(value),
    normalize: (value) => (value ? value : undefined),
    valueDomain: [undefined],
  },
];
//@ chunk-0qyh5wah.js:7470-7615 placement
function normalizeExclusionProps(config) {
  let normalized = {
    ...config,
  };
  for (let { prop, normalize } of CACHE_EXCLUSION_PROPS) {
    if (!(prop in normalized)) continue;
    let normalizedValue = normalize(normalized[prop]);
    if (normalizedValue === undefined) delete normalized[prop];
    else normalized[prop] = normalizedValue;
  }
  return normalized;
}
//@ chunk-0qyh5wah.js:7615-7816 placement
function hasEnvReferenceInUrlOrHeaders(config) {
  let serverConfig = config;
  if (typeof serverConfig.url === "string" && containsEnvRef(serverConfig.url)) return true;
  if (serverConfig.headers && typeof serverConfig.headers === "object") {
    for (let header of Object.values(serverConfig.headers))
      if (typeof header === "string" && containsEnvRef(header)) return true;
  }
  return false;
}
//@ chunk-0qyh5wah.js:7816-7932 placement
var DISCOVERY_CACHE_ENV_OVERRIDES; // deferred: uses CLAUDE_AI (./firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var NON_CACHEABLE_SERVER_NAMES;
deferInit("chunk-0qyh5wah.js:7816", () => {
  DISCOVERY_CACHE_ENV_OVERRIDES = [
    "MCP_DISCOVERY_CACHE_TTL_S",
    "MCP_DISCOVERY_CACHE_MAX_STALE_S",
    "MCP_DISCOVERY_CACHE_STRIKES",
  ];
  NON_CACHEABLE_SERVER_NAMES = [VISUALIZE, MEMORY, CLAUDE_ARTIFACTS];
});
//@ chunk-0qyh5wah.js:7932-7995 placement
/**
 * 判断环境变量是否由设置提供（用于禁用缓存）。
 */
function hasSettingsSourcedOverride(envName) {
  let value = process.env[envName];
  return value !== undefined && isSettingsSourcedEnvValue(envName, value);
}
//@ chunk-0qyh5wah.js:7995-8077 placement
/**
 * 发现缓存功能是否可用。
 */
function isCacheEnabledHere() {
  return (
    isRemoteManagedEnvironment() &&
    env.MCP_DISCOVERY_CACHE === true &&
    !hasSettingsSourcedOverride("MCP_DISCOVERY_CACHE")
  );
}
//@ chunk-0qyh5wah.js:8077-8827 placement
/**
 * 判断一个动态 http MCP 服务器是否可走发现缓存：必须是本会话自己的 CCR 会话 MCP 地址，带唯一且匹配的 x-mcp-server-id、来源为 directory/custom、非 Slack 归属，且不是已知代理端点或保留的内置服务器。
 */
function isCacheableCcrSessionServer(config) {
  if (
    !isCacheEnabledHere() ||
    DISCOVERY_CACHE_ENV_OVERRIDES.some(hasSettingsSourcedOverride) ||
    config.type !== "http" ||
    config.scope !== "dynamic" ||
    config.agentSource !== undefined ||
    isPluginServerConfig(config)
  )
    return false;
  let parsed = ccrSessionIdFromMcpUrl(config.url);
  if (parsed === null) return false;
  let sessionBody = sessionIdBody(parsed.sessionSegment);
  if (
    !isSelfAddressableSessionId(parsed.sessionSegment) ||
    !startupCcrEnv.ownCcrSessionIds.some((ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === sessionBody)
  )
    return false;
  let serverIdHeaders = headerValues(config.headers, "x-mcp-server-id");
  let serverId = serverIdHeaders[0];
  if (
    serverIdHeaders.length !== 1 ||
    serverId === undefined ||
    !UUID_RE.test(serverId) ||
    parsed.toolboxMcpServerId !== serverId ||
    parsed.mcpServerId === serverId
  )
    return false;
  let originHeaders = headerValues(config.headers, X_MCP_SERVER_ORIGIN);
  if (originHeaders.length !== 1 || (originHeaders[0] !== "directory" && originHeaders[0] !== "custom"))
    return false;
  if (
    headerValues(config.headers, X_CCR_OWNER_SLACK_USER_ID).length > 0 ||
    !parsed.upstreamUrl ||
    /^ccr-owner-resolved:/i.test(parsed.upstreamUrl)
  )
    return false;
  let serverIds = [parsed.mcpServerId, serverId];
  let sessionPrefixes = [`cse_${sessionBody}`, `session_${sessionBody}`];
  return !(
    isKnownProxyEndpointUrl(config.url) ||
    serverIds.some((serverId) => RESERVED_SERVER_IDS_WITH_DOCS.includes(serverId)) ||
    [...reservedMcpServerNames(), ...NON_CACHEABLE_SERVER_NAMES].some((reservedName) =>
      sessionPrefixes.some((prefix) => serverIds.includes(derivedServerId(prefix, reservedName))),
    )
  );
}
//@ chunk-0qyh5wah.js:8827-8865 placement
/**
 * 该服务器是否可被缓存。
 */
function isCacheableServer(config) {
  return isDiscoveryCacheEligible(config) && !isCacheableCcrSessionServer(config);
}
//@ chunk-0qyh5wah.js:8865-9284 placement
function discoveryCacheExclusion(config) {
  let offReason = discoveryCacheOffReason();
  if (offReason !== undefined) return offReason;
  if (identityChangedThisProcess()) return "identity-changed";
  if (config.type !== "http" && config.type !== "sse") return "transport";
  if (isCliOwnedConfig(config) || hasCliOwnedBearer(config)) return "cli-owned";
  if (hasEnvReferenceInUrlOrHeaders(config)) return "env-placeholder";
  if (isFirstPartyMcpUrl(config.url) && !configHasAuthorizationHeader(config)) return "ambient-credential";
  if (isSameOriginAsCcr(config.url)) {
    if (!isCacheableCcrSessionServer(config)) return "ambient-credential";
  } else if (isCacheEnabledHere()) return "ambient-credential";
  let exclusionTarget = config;
  for (let { prop, reason, excludes } of CACHE_EXCLUSION_PROPS)
    if (excludes(exclusionTarget[prop])) return reason;
  return;
}
//@ chunk-0qyh5wah.js:9284-9334 placement
/**
 * 发现缓存目录路径。
 */
function discoveryCacheDir() {
  return join(getClaudeConfigDir(), "mcp-discovery-cache");
}
//@ chunk-0qyh5wah.js:9334-9419 placement
/**
 * 是否能拿到该服务器的刷新令牌指纹。
 */
async function canFingerprint(serverName, config) {
  if (!isDiscoveryCacheEligible(config)) return false;
  return (await refreshTokenFingerprint(serverName, config)).kind !== "degenerate";
}
//@ chunk-0qyh5wah.js:9419-9705 placement
async function refreshTokenFingerprint(serverName, config) {
  if (config.type !== "http" && config.type !== "sse")
    return {
      kind: "none",
    };
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED)
    return {
      kind: "degenerate",
    };
  let authEntry = secureStorageForMcp?.mcpOAuth?.[getServerKey(serverName, config)];
  if (!authEntry)
    return {
      kind: "none",
    };
  let refreshToken = authEntry.refreshToken;
  if (!refreshToken)
    return {
      kind: "degenerate",
    };
  return {
    kind: "resolved",
    hash: computeContentHash(refreshToken).slice(0, 16),
  };
}
//@ chunk-0qyh5wah.js:9705-9911 placement
async function grantTokenFor(serverName, config) {
  if (config.type !== "http" && config.type !== "sse") return "grant:none";
  let fingerprint = await refreshTokenFingerprint(serverName, config);
  switch (fingerprint.kind) {
    case "none":
      return "grant:none";
    case "resolved":
      return `grant:${fingerprint.hash}`;
    case "degenerate":
      return;
  }
}
//@ chunk-0qyh5wah.js:9911-10183 placement
async function identityFingerprint(serverName, config) {
  let mcpIdentitySnapshot = getMcpIdentitySnapshot();
  if (mcpIdentitySnapshot.kind === "unwired" || mcpIdentitySnapshot.kind === "incomplete") return;
  let grantToken = await grantTokenFor(serverName, config);
  if (grantToken === undefined) return;
  let parts = [mcpIdentitySnapshot.token];
  if (config.type === "http" || config.type === "sse") parts.push(grantToken);
  return {
    fingerprint: createHash("sha256").update(parts.join("\x00")).digest("hex"),
    grantToken,
  };
}
//@ chunk-0qyh5wah.js:10183-10848 placement
function discoveryCacheKey(cacheKey, fingerprint, era, uiCapable) {
  let joined = [
    cacheKey,
    fingerprint,
    `era:${era}`,
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION ?? "unknown",
    ...(uiCapable ? ["offer:io.modelcontextprotocol/ui"] : []),
  ].join("\x00");
  return `${createHash("sha256").update(joined).digest("hex").slice(0, 32)}.json`;
}
//@ chunk-0qyh5wah.js:10848-10873 placement
/**
 * 匹配缓存文件名前缀的正则（16 位十六进制加 NUL）。
 */
var CACHE_FILE_PREFIX_RE = /^[0-9a-f]{16}\0/;
//@ chunk-0qyh5wah.js:10873-11017 placement
/**
 * 清除某服务器在发现缓存路径记忆中的条目。
 */
function clearDiscoveryPathMemo(serverName) {
  let prefix = `${serverName}-`;
  let filePathMemo = getDiscoveryCacheStore().filePathMemo;
  for (let key of filePathMemo.keys()) {
    if (!key.startsWith(prefix)) continue;
    if (CACHE_FILE_PREFIX_RE.test(key.slice(prefix.length))) filePathMemo.delete(key);
  }
}
//@ chunk-0qyh5wah.js:11017-11052 placement
/**
 * 生成缓存路径记忆的键。
 */
function cacheMemoKey(serverName, config) {
  return serverCacheKey(serverName, normalizeExclusionProps(config));
}
//@ chunk-0qyh5wah.js:11052-11102 placement
/**
 * 取缓存文件路径。
 */
async function cacheFilePath(serverName, config) {
  return (await resolveDiscoveryCachePath(serverName, config))?.path;
}
//@ chunk-0qyh5wah.js:11102-11190 placement
/**
 * 取缓存条目的授权 leg 令牌。
 */
async function cacheGrantLeg(serverName, config) {
  if (!isDiscoveryCacheOn()) return;
  try {
    return (await resolveDiscoveryCachePath(serverName, config))?.legToken;
  } catch {
    return;
  }
}
//@ chunk-0qyh5wah.js:11190-11668 placement
/**
 * 计算某服务器发现缓存文件的路径与密钥材料（缓存键、身份指纹、协议代、UI 开关、授权令牌、AAD），结果按组合键记忆，解析失败时移除记忆。
 */
async function resolveDiscoveryCachePath(serverName, config) {
  let cacheKey = cacheMemoKey(serverName, config);
  let era = currentEra();
  let uiCapable = isMcpAppsHost();
  let identityToken = currentIdentityToken();
  let memoKey = `${cacheKey}\x00${identityToken}\x00era:${era}\x00ui:${uiCapable}`;
  let filePathMemo = getDiscoveryCacheStore().filePathMemo;
  let memoized = filePathMemo.get(memoKey);
  if (memoized) return memoized;
  let pending = (async () => {
    let identity = await identityFingerprint(serverName, config);
    if (identity === undefined) return;
    return {
      path: join(discoveryCacheDir(), discoveryCacheKey(cacheKey, identity.fingerprint, era, uiCapable)),
      grantToken: identity.grantToken,
      fingerprint: identity.fingerprint,
      cacheKey,
      aad: buildDiscoveryCacheAad(CACHE_ENTRY_VERSION, cacheKey, identity.fingerprint),
      legToken: `${identity.grantToken}\x00era:${era}\x00${identityToken}`,
    };
  })();
  filePathMemo.set(memoKey, pending);
  let evictMemo = () => {
    if (filePathMemo.get(memoKey) === pending) filePathMemo.delete(memoKey);
  };
  pending.then((resolved) => {
    if (resolved === undefined) evictMemo();
  }, evictMemo);
  return pending;
}
//@ chunk-0qyh5wah.js:11668-11701 placement
/**
 * 发现缓存用的存储实现。
 */
function getStorage() {
  return getDiscoveryCacheStore().storage;
}
//@ chunk-0qyh5wah.js:11701-11736 placement
/**
 * 发现缓存用的 v5 存储。
 */
function getStorageV5() {
  return getDiscoveryCacheStore().storageV5;
}
//@ chunk-0qyh5wah.js:11736-11806 placement
/**
 * 缓存文件的存储空间键。
 */
function cacheSpaceKey(cachePath) {
  return STORAGE_SPACES.userConfigDir("mcp-discovery-cache", [basename(cachePath)]);
}
//@ chunk-0qyh5wah.js:11806-11877 placement
/**
 * 单个缓存条目的最大字节数（8 MiB）。
 */
var CACHE_SPACE = {
  namespace: "userConfigDir",
  dir: "mcp-discovery-cache",
};
var MAX_ENTRY_BYTES = 8388608;
//@ chunk-0qyh5wah.js:11877-11937 placement
/**
 * 条目最近一次保存时间。
 */
function newestTimestamp(entry) {
  return Math.max(entry.savedAt, entry.toolsSavedAt ?? 0);
}
//@ chunk-0qyh5wah.js:11937-12075 placement
class RefusedDiscoveryEntryError extends Error {
  entryPath;
  reason;
  constructor(entryPath, reason, message) {
    super(message);
    this.entryPath = entryPath;
    this.reason = reason;
    this.name = "RefusedDiscoveryEntryError";
  }
}
//@ chunk-0qyh5wah.js:12075-12204 placement
let OversizeDiscoveryEntryError; // deferred: uses RefusedDiscoveryEntryError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0qyh5wah.js:12075", () => {
  OversizeDiscoveryEntryError = class OversizeDiscoveryEntryError extends RefusedDiscoveryEntryError {
    constructor(entryPath) {
      super(entryPath, "oversize", "discovery-cache: oversize entry");
      this.name = "OversizeDiscoveryEntryError";
    }
  };
});
//@ chunk-0qyh5wah.js:12204-12342 placement
let SymlinkedDiscoveryEntryError; // deferred: uses RefusedDiscoveryEntryError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0qyh5wah.js:12204", () => {
  SymlinkedDiscoveryEntryError = class SymlinkedDiscoveryEntryError extends RefusedDiscoveryEntryError {
    constructor(entryPath) {
      super(entryPath, "symlink", "discovery-cache: symlinked entry refused");
      this.name = "SymlinkedDiscoveryEntryError";
    }
  };
});
//@ chunk-0qyh5wah.js:12342-12487 placement
let NonRegularDiscoveryEntryError; // deferred: uses RefusedDiscoveryEntryError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0qyh5wah.js:12342", () => {
  NonRegularDiscoveryEntryError = class NonRegularDiscoveryEntryError extends RefusedDiscoveryEntryError {
    constructor(entryPath) {
      super(entryPath, "non-regular", "discovery-cache: non-regular entry refused");
      this.name = "NonRegularDiscoveryEntryError";
    }
  };
});
//@ chunk-0qyh5wah.js:12487-12524 placement
/**
 * 判断错误是否为拒绝读取的条目。
 */
function isRefusedEntryError(error) {
  return error instanceof RefusedDiscoveryEntryError;
}
//@ chunk-0qyh5wah.js:12524-12964 placement
/**
 * 读取发现缓存条目文本：拒绝符号链接、非普通文件与超大文件，不存在时返回 undefined。
 */
async function readDiscoveryEntryText(entryPath, storageV5) {
  let readGateForTest = getDiscoveryCacheStore().readGateForTest;
  if (readGateForTest) await readGateForTest;
  if (storageV5) return readDiscoveryEntryFromStorage(storageV5, entryPath);
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0) {
      let stats = await getStorage().lstat(entryPath);
      if (stats === undefined) return;
      if (stats.isSymbolicLink) throw new SymlinkedDiscoveryEntryError(entryPath);
      if (!stats.isFile) throw new NonRegularDiscoveryEntryError(entryPath);
    }
    let buffer;
    try {
      buffer = await getStorage().readTail(entryPath, MAX_ENTRY_BYTES + 1, {
        noFollow: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ELOOP") throw new SymlinkedDiscoveryEntryError(entryPath);
      if (errnoCode === "ENXIO") throw new NonRegularDiscoveryEntryError(entryPath);
      throw error;
    }
    if (buffer.length > MAX_ENTRY_BYTES) throw new OversizeDiscoveryEntryError(entryPath);
    return buffer.toString("utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
}
//@ chunk-0qyh5wah.js:12964-13366 placement
/**
 * 从存储 V5 读取发现缓存条目（拒绝符号链接、非普通文件与超大条目）。
 */
async function readDiscoveryEntryFromStorage(storageV5, entryPath) {
  let key = cacheSpaceKey(entryPath);
  let readResult = await storageV5.read(
    [
      {
        key,
        offset: 0,
        length: MAX_ENTRY_BYTES + 1,
      },
    ],
    {
      symlinks: "refuse",
    },
  );
  if (!readResult.ok) {
    let errnoCode = "cause" in readResult.error ? getErrnoCode(readResult.error.cause) : undefined;
    if (errnoCode === "ELOOP") throw new SymlinkedDiscoveryEntryError(entryPath);
    if (errnoCode === "ENXIO") throw new NonRegularDiscoveryEntryError(entryPath);
    throw Error("discovery-cache: read failed", {
      cause: readResult.error,
    });
  }
  let item = readResult.value.items[0];
  if (!item.found) return;
  if (item.totalBytes > MAX_ENTRY_BYTES) throw new OversizeDiscoveryEntryError(entryPath);
  return Buffer.from(item.value).toString("utf8");
}
//@ chunk-0qyh5wah.js:13366-13563 placement
async function writeDiscoveryEntryText(cachePath, sealed, storageV5) {
  if (storageV5) {
    let writeResult = await storageV5.write(cacheSpaceKey(cachePath), sealed);
    if (!writeResult.ok)
      throw Error("discovery-cache: write failed", {
        cause: writeResult.error,
      });
    return;
  }
  let storage = getStorage();
  await storage.mkdir(discoveryCacheDir(), CACHE_DIR_MODE);
  await storage.atomicWrite(cachePath, sealed, CACHE_FILE_MODE);
}
//@ chunk-0qyh5wah.js:13563-13975 placement
/**
 * 列出发现缓存目录中的文件名（本地文件系统或存储 V5 分页列出）。
 */
async function listDiscoveryCacheFiles(storageV5) {
  if (!storageV5) return getStorage().list(discoveryCacheDir());
  let names = [];
  let cursor;
  do {
    let page = await storageV5.listEntries(CACHE_SPACE, {
      skipKeyStats: true,
      skipScopeStats: true,
      ...(cursor !== undefined && {
        cursor,
      }),
    });
    if (!page.ok)
      throw Error("discovery-cache: list failed", {
        cause: page.error,
      });
    for (let item of page.value.items)
      if (item.kind === "key" && item.key.namespace === "userConfigDir") {
        let name = item.key.relPath[0];
        if (name !== undefined && item.key.relPath.length === 1) names.push(name);
      }
    cursor = page.value.cursor;
  } while (cursor);
  return names;
}
//@ chunk-0qyh5wah.js:13975-14160 placement
async function deleteDiscoveryEntry(path, storageV5) {
  if (storageV5) {
    let deleteResult = await storageV5.delete(cacheSpaceKey(path));
    if (!deleteResult.ok)
      throw Error("discovery-cache: delete failed", {
        cause: deleteResult.error,
      });
    return;
  }
  try {
    await getStorage().delete(path);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-0qyh5wah.js:14160-15931 placement
/**
 * 读取 MCP 服务器发现缓存（加密存储的 initialize/tools 列表结果）：校验身份代际、授权指纹与过期，命中则省去握手；异常时清掉该服务器的缓存族。
 */
async function readDiscoveryCache(serverName, config, now = Date.now()) {
  let exclusion = discoveryCacheExclusion(config);
  if (exclusion !== undefined && !isKnownExclusionReason(exclusion))
    return {
      kind: "miss",
      reason: exclusion === "transport" ? "transport" : "disabled",
    };
  if (exclusion !== undefined) {
    registerDiscoveryFlush();
    let cacheKeys = cacheKeyVariants(serverName, config);
    let keySet = sortedJoin(cacheKeys);
    let admissionPurgedKeySets = getDiscoveryCacheStore().admissionPurgedKeySets;
    if (!admissionPurgedKeySets.has(keySet)) {
      admissionPurgedKeySets.add(keySet);
      purgeServerEntries_2(serverName, config, cacheKeys).then((purged) => {
        if (!purged) admissionPurgedKeySets.delete(keySet);
      });
    }
    logMCPDebug(
      serverName,
      `discovery-cache: ${exclusion} \u2014 purging this server's cache-key family, serving miss`,
    );
    return {
      kind: "miss",
      reason: "disabled",
    };
  }
  let cachePath;
  try {
    cachePath = await resolveDiscoveryCachePath(serverName, config);
  } catch (error) {
    logMCPDebug(serverName, `discovery-cache: fingerprint failed: ${error}`);
    return {
      kind: "miss",
      reason: "no-fingerprint",
    };
  }
  if (cachePath === undefined)
    return {
      kind: "miss",
      reason: "no-fingerprint",
    };
  let path = cachePath.path;
  let deleteEntry = () => {
    deleteEntryAndBump(path, serverName, undefined).catch(() => {});
  };
  let missCorrupt = () => {
    deleteEntry();
    logFeatureBad("mcp_discovery_cache", "corrupt_entry");
    return {
      kind: "miss",
      reason: "corrupt",
    };
  };
  let rawText;
  try {
    rawText = await readDiscoveryEntryText(path, getStorageV5());
  } catch (error) {
    if (isRefusedEntryError(error)) {
      logMCPDebug(serverName, `discovery-cache: ${error.reason} entry, deleting`);
      return missCorrupt();
    }
    logMCPDebug(serverName, `discovery-cache: read failed: ${error}`);
    return {
      kind: "miss",
      reason: "absent",
    };
  }
  if (rawText === undefined)
    return {
      kind: "miss",
      reason: "absent",
    };
  let sealedEntry = await openSealedEntry(rawText, cachePath, serverName, () =>
    deleteEntryAndBump(path, serverName, undefined),
  );
  if (sealedEntry.miss) {
    if (sealedEntry.miss === "unsealed")
      if (sealedEntry.cause === "v1") logFeatureSad("mcp_discovery_cache", "unsealed_v1");
      else logFeatureBad("mcp_discovery_cache", `unsealed_${sealedEntry.cause}`);
    return {
      kind: "miss",
      reason: sealedEntry.miss,
    };
  }
  let parseResult = discoveryEntrySchema().safeParse(safeParseJSON(sealedEntry.plaintext, false));
  if (!parseResult.success) {
    logMCPDebug(serverName, "discovery-cache: corrupt entry, deleting");
    return missCorrupt();
  }
  let entry = parseResult.data;
  if (entry.cacheKey !== cacheMemoKey(serverName, config)) {
    logMCPDebug(serverName, "discovery-cache: entry keyed for another server, deleting");
    return missCorrupt();
  }
  if (entry.consecutiveRefreshFailures >= getMaxStrikes()) {
    deleteEntry();
    return {
      kind: "miss",
      reason: "strike-threshold",
    };
  }
  let maxStaleMs = getMaxStaleMs();
  if (newestTimestamp(entry) - now > maxStaleMs) {
    deleteEntry();
    return {
      kind: "miss",
      reason: "expired",
    };
  }
  let max = Math.max(0, now - entry.savedAt);
  if (max >= maxStaleMs) {
    deleteEntry();
    return {
      kind: "miss",
      reason: "expired",
    };
  }
  if (max < getCacheTtlMs() && !(entry.capabilities.tools && entry.tools.length === 0))
    return {
      kind: "fresh",
      entry,
      ageMs: max,
    };
  return {
    kind: "stale",
    entry,
    ageMs: max,
  };
}
//@ chunk-0qyh5wah.js:15931-16042 placement
function serializeDiscoveryWrite(cacheKey, serverName, operation) {
  return getDiscoveryCacheStore()
    .serializeWrite(cacheKey, operation)
    .catch((error) => {
      logMCPDebug(serverName, `discovery-cache: write op failed: ${error}`);
    });
}
//@ chunk-0qyh5wah.js:16042-16105 placement
/**
 * 取某缓存键的删除代号。
 */
function deleteGeneration(cacheKey) {
  return getDiscoveryCacheStore().deleteGenerationByCacheKey.get(cacheKey) ?? 0;
}
//@ chunk-0qyh5wah.js:16105-16166 placement
/**
 * 递增某缓存键的删除代号。
 */
function bumpDeleteGeneration(cacheKey) {
  getDiscoveryCacheStore().deleteGenerationByCacheKey.set(cacheKey, deleteGeneration(cacheKey) + 1);
}
//@ chunk-0qyh5wah.js:16166-16175 placement
/**
 * 视为秘密的最短长度（8）。
 */
var MIN_SECRET_LENGTH = 8;
//@ chunk-0qyh5wah.js:16175-16586 placement
/**
 * 收集某 MCP 服务器的 OAuth 秘密（访问令牌、刷新令牌、客户端密钥），用于确认缓存内容不含秘密。
 */
async function oauthSecretsFor(serverName, config) {
  if (config.type !== "http" && config.type !== "sse") return [];
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED) return READ_FAILED;
  let serverKey = getServerKey(serverName, config);
  let authEntry = secureStorageForMcp?.mcpOAuth?.[serverKey];
  let secrets = [];
  if (typeof authEntry?.accessToken === "string") secrets.push(authEntry.accessToken);
  if (typeof authEntry?.refreshToken === "string") secrets.push(authEntry.refreshToken);
  if (typeof authEntry?.clientSecret === "string") secrets.push(authEntry.clientSecret);
  let clientSecret = secureStorageForMcp?.mcpOAuthClientConfig?.[serverKey]?.clientSecret;
  if (typeof clientSecret === "string") secrets.push(clientSecret);
  return secrets;
}
//@ chunk-0qyh5wah.js:16586-16708 placement
var SECRET_KEY_REGEX = /auth|token|key|secret|cookie|session|sig|pass|cred|bearer/i;
var AUTH_SCHEME_PREFIX_REGEX = /^\s*[A-Za-z][A-Za-z0-9!#$%&'*+.^_`|~-]*\s+(?=\S)/;
//@ chunk-0qyh5wah.js:16708-16915 placement
function forEachSecretValue(headerName, headerValue, record) {
  if (typeof headerValue !== "string" || !SECRET_KEY_REGEX.test(headerName)) return;
  record(headerValue.trim());
  record(headerValue.replace(AUTH_SCHEME_PREFIX_REGEX, "").trim());
  if (/^cookie$/i.test(headerName))
    for (let cookie of headerValue.split(";")) {
      let index = cookie.indexOf("=");
      record((index === -1 ? cookie : cookie.slice(index + 1)).trim());
    }
}
//@ chunk-0qyh5wah.js:16915-17164 placement
/**
 * 记录连接时额外呈现的请求头中的秘密片段，供发现缓存检查。
 */
function recordPresentedHeaderSecrets(headers, headers_2) {
  let presentedCredentialLog = getPresentedCredentialLog();
  if (presentedCredentialLog.recordingOff()) return;
  let configured = new Map();
  for (let [key, value] of Object.entries(headers ?? {})) configured.set(key.toLowerCase(), value);
  for (let [key, value] of Object.entries(headers_2)) {
    if (configured.get(key.toLowerCase()) === value) continue;
    forEachSecretValue(key, value, (secret) => {
      if (secret.length >= MIN_SECRET_LENGTH) presentedCredentialLog.record(secret);
    });
  }
}
//@ chunk-0qyh5wah.js:17164-17181 placement
/**
 * 扫描秘密时的成本上限（256 Mi）。
 */
var MAX_SCAN_COST = 268435456;
//@ chunk-0qyh5wah.js:17181-17312 placement
function secretEncodings(secret) {
  let variants = [secret];
  let sliced = jsonStringifyRaw(secret).slice(1, -1);
  if (sliced !== secret) variants.push(sliced);
  try {
    let encoded = encodeURIComponent(secret);
    if (encoded !== secret) variants.push(encoded);
  } catch {}
  return variants;
}
//@ chunk-0qyh5wah.js:17312-18047 placement
/**
 * 写入发现缓存前检查条目是否带有密钥材料：收集配置头、URL 查询参数与用户信息、OAuth 令牌、本进程出示过的凭据，按原文/JSON 转义/URL 编码比对；日志不完整或扫描预算超出也拒绝。
 */
function findSecretMaterial(serialized, config, extraSecrets = []) {
  let cfg = config;
  let secrets = new Set();
  let addSecret = (secret) => {
    if (secret !== undefined && secret.length >= MIN_SECRET_LENGTH) secrets.add(secret);
  };
  for (let [key, value] of Object.entries(cfg.headers ?? {})) forEachSecretValue(key, value, addSecret);
  try {
    let url = typeof cfg.url === "string" ? new URL(cfg.url) : undefined;
    for (let [paramName, paramValue] of url?.searchParams.entries() ?? [])
      if (SECRET_KEY_REGEX.test(paramName))
        for (let variant of secretEncodings(paramValue)) addSecret(variant);
    for (let pair of url?.search.replace(/^\?/, "").split("&") ?? []) {
      let index = pair.indexOf("=");
      if (index > 0 && SECRET_KEY_REGEX.test(pair.slice(0, index))) addSecret(pair.slice(index + 1));
    }
    for (let credentialPart of url ? [url.password, url.username] : [])
      if (credentialPart) {
        addSecret(credentialPart);
        try {
          addSecret(decodeURIComponent(credentialPart));
        } catch {}
      }
  } catch {}
  for (let extraSecret of extraSecrets) addSecret(extraSecret);
  let presented = getPresentedCredentialLog().snapshot();
  if (!presented.complete) return "presented-log-incomplete";
  for (let atom of presented.atoms) addSecret(atom);
  if (secrets.size * serialized.length > MAX_SCAN_COST) return "scan-budget";
  for (let secret of secrets)
    for (let candidate of secretEncodings(secret)) if (serialized.includes(candidate)) return "material";
  return;
}
//@ chunk-0qyh5wah.js:18047-18108 placement
/**
 * 生成解密句柄（key、cacheKey、aad）。
 */
function sealHandle(key, cachePath) {
  return {
    key,
    cacheKey: cachePath.cacheKey,
    aad: cachePath.aad,
  };
}
//@ chunk-0qyh5wah.js:18108-18570 placement
/**
 * 解封发现缓存条目：密钥不可用时关闭缓存，解封失败时删除该条目并返回未命中原因。
 */
async function openSealedEntry(sealed, cachePath, serverName, reapEntry) {
  let key = await getMcpDiscoveryCacheKey();
  if (key === undefined) {
    logMCPDebug(
      serverName,
      "Discovery cache: sealing key unavailable (secure storage unreadable) \u2014 cache off for this process",
    );
    latchCacheOff();
    return {
      miss: "key-unavailable",
    };
  }
  let discoverySeal = openDiscoverySeal(sealHandle(key, cachePath), sealed);
  if (discoverySeal.ok)
    return {
      plaintext: discoverySeal.plaintext,
    };
  logMCPDebug(serverName, `Discovery cache: entry did not open (${discoverySeal.reason}) \u2014 discarded`);
  try {
    await reapEntry();
  } catch (error) {
    logMCPDebug(serverName, `discovery-cache: reap after failed open skipped ${error}`);
  }
  return {
    miss: "unsealed",
    cause: discoverySeal.reason,
  };
}
//@ chunk-0qyh5wah.js:18570-18734 placement
function logDiscoveryWriteVerdict({ verdict, code }) {
  if (verdict === "written") logFeatureOk("mcp_discovery_cache");
  else if (verdict === "terminal") logFeatureBad("mcp_discovery_cache", code);
  else logFeatureSad("mcp_discovery_cache", code);
  return verdict;
}
//@ chunk-0qyh5wah.js:18734-21576 placement
/**
 * 写一条发现缓存（加密）：依次检查缓存未被关闭、未被删除、身份纪元与授权未变、密钥可用、条目符合结构且不超限、不含密钥材料，然后加密写盘；返回 written/transient/terminal/superseded 判定。
 */
async function writeDiscoveryEntry(params) {
  let { path: entryPath, serverName, config, cacheKey, entry, context: entry_2, label } = params;
  if (discoveryCacheOffReason() !== undefined) {
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: the cache turned off since this round started`,
    );
    return {
      verdict: "superseded",
      code: "disabled",
    };
  }
  if (deleteGeneration(cacheKey) !== params.capturedDeleteGeneration) {
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: entry deleted since this round started (tombstone)`,
    );
    return {
      verdict: "superseded",
      code: "tombstone",
    };
  }
  if (!isCurrentIdentityEpoch(entry_2.identityEpoch)) {
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: identity changed since this round was fetched (stale epoch)`,
    );
    return {
      verdict: "superseded",
      code: "stale_epoch",
    };
  }
  let sealKey = await getMcpDiscoveryCacheKey();
  if (sealKey === undefined) {
    latchCacheOff();
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: sealing key unavailable (secure storage unreadable) \u2014 cache off for this process`,
    );
    return {
      verdict: "superseded",
      code: "key_unavailable",
    };
  }
  let oauthSecrets;
  try {
    oauthSecrets = await oauthSecretsFor(serverName, config);
  } catch {
    oauthSecrets = READ_FAILED;
  }
  if (oauthSecrets === READ_FAILED) {
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: OAuth token store unreadable (cannot verify no secrets on disk)`,
    );
    return {
      verdict: "transient",
      code: "transient",
    };
  }
  let pathInfo;
  try {
    pathInfo = await resolveDiscoveryCachePath(serverName, config);
  } catch {
    return {
      verdict: "transient",
      code: "transient",
    };
  }
  if (pathInfo === undefined || pathInfo.path !== entryPath || pathInfo.legToken !== entry_2.grantLeg) {
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: grant or era changed since this round was fetched (stale leg)`,
    );
    return {
      verdict: "superseded",
      code: "stale_grant",
    };
  }
  let operation = discoveryEntrySchema().safeParse(entry);
  if (!operation.success) {
    logMCPDebug(serverName, `Discovery cache ${label} refused: entry failed schema validation`);
    return {
      verdict: "terminal",
      code: "schema",
    };
  }
  let serialized = jsonStringifyRaw(operation.data);
  if (Buffer.byteLength(serialized, "utf8") > MAX_ENTRY_BYTES) {
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: serialized entry exceeds DISCOVERY_ENTRY_MAX_BYTES`,
    );
    return {
      verdict: "terminal",
      code: "oversize",
    };
  }
  if (discoveryCacheOffReason() !== undefined) {
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: the cache turned off since this round started`,
    );
    return {
      verdict: "superseded",
      code: "disabled",
    };
  }
  let secretProblem = findSecretMaterial(serialized, config, oauthSecrets);
  if (secretProblem !== undefined) {
    if (getPresentedCredentialLog().takeOverflowNotice())
      logMCPDebug(
        serverName,
        "Discovery cache: presented-credential log is full \u2014 cache writes are refused for the rest of this process",
      );
    if (secretProblem === "scan-budget") {
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: secret-material scan exceeds its work budget (materials \xD7 entry size) \u2014 not scanned, not written`,
      );
      return {
        verdict: "terminal",
        code: "scan_budget",
      };
    }
    if (secretProblem === "presented-log-incomplete") {
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: presented-credential log incomplete (cannot verify no secrets on disk)`,
      );
      return {
        verdict: "terminal",
        code: "presented_log_incomplete",
      };
    }
    logMCPDebug(serverName, `Discovery cache ${label} refused: entry would carry presented secret material`);
    return {
      verdict: "terminal",
      code: "secret_material",
    };
  }
  let sealed = sealDiscoveryCacheEntry(sealHandle(sealKey, pathInfo), serialized);
  if (Buffer.byteLength(sealed, "utf8") > MAX_ENTRY_BYTES) {
    logMCPDebug(
      serverName,
      `Discovery cache ${label} refused: sealed entry exceeds DISCOVERY_ENTRY_MAX_BYTES`,
    );
    return {
      verdict: "terminal",
      code: "oversize",
    };
  }
  try {
    await writeDiscoveryEntryText(entryPath, sealed, getStorageV5());
  } catch (error) {
    logMCPDebug(serverName, `Discovery cache ${label} refused: disk write failed (${errorMessage(error)})`);
    return {
      verdict: "transient",
      code: "transient",
    };
  }
  return {
    verdict: "written",
    code: "written",
  };
}
//@ chunk-0qyh5wah.js:21576-21646 placement
/**
 * 删除条目并递增删除代号。
 */
async function deleteEntryAndBump(path, serverName, cacheKey) {
  if (cacheKey !== undefined) bumpDeleteGeneration(cacheKey);
  await serializeDiscoveryWrite(path, serverName, () => deleteDiscoveryEntry(path, getStorageV5()));
}
//@ chunk-0qyh5wah.js:21646-21736 placement (2.1.88 match: withTimeout, 0.805)
async function withTimeout(promise, timeoutMs) {
  await Promise.race([
    promise.then(
      () => {},
      () => {},
    ),
    sleep(timeoutMs, undefined, {
      unref: true,
    }),
  ]);
}
//@ chunk-0qyh5wah.js:21736-21782 placement
async function flushDiscoveryCache(flushPromise, timeoutMs = 1500) {
  registerDiscoveryFlush();
  await withTimeout(flushPromise, timeoutMs);
}
//@ chunk-0qyh5wah.js:21782-21883 placement
function registerDiscoveryFlush() {
  if (!isDiscoveryCacheUsable()) return;
  let discoveryCacheStore = getDiscoveryCacheStore();
  if (discoveryCacheStore.flushCleanup) return;
  discoveryCacheStore.flushCleanup = registerCleanup(() =>
    discoveryCacheStore.drain(ACCOUNT_RESOLVE_TIMEOUT_MS),
  );
}
//@ chunk-0qyh5wah.js:21883-23223 placement
async function writeDiscoveryCache(serverName, config, listing, options) {
  let now = options.now ?? Date.now();
  let cacheKey = cacheMemoKey(serverName, config);
  let capturedDeleteGeneration = deleteGeneration(cacheKey);
  if (!isCurrentIdentityEpoch(options.identityEpoch)) return "superseded";
  if (options.grantLeg === undefined) return "superseded";
  if (!isDiscoveryCacheEligible(config)) return "superseded";
  registerDiscoveryFlush();
  let cachePath;
  try {
    cachePath = await resolveDiscoveryCachePath(serverName, config);
  } catch {
    return logDiscoveryWriteVerdict({
      verdict: "transient",
      code: "transient",
    });
  }
  if (cachePath === undefined) return "superseded";
  if (cachePath.legToken !== options.grantLeg) {
    logMCPDebug(
      serverName,
      "Discovery cache write refused: grant changed since this round was fetched (stale grant)",
    );
    return logDiscoveryWriteVerdict({
      verdict: "superseded",
      code: "stale_grant",
    });
  }
  let path = cachePath.path;
  let entry = {
    v: CACHE_ENTRY_VERSION,
    serverName,
    cacheKey,
    savedAt: now,
    consecutiveRefreshFailures: 0,
    ...(listing.serverInfo && {
      serverInfo: listing.serverInfo,
    }),
    ...(listing.negotiatedEra !== undefined && {
      negotiatedEra: listing.negotiatedEra,
    }),
    capabilities: listing.capabilities,
    tools: listing.tools,
    commands: listing.commands,
    resources: listing.resources,
    templates: listing.templates,
  };
  let path_2 = path;
  let verdict;
  await serializeDiscoveryWrite(path_2, serverName, async () => {
    if (!(await canFingerprint(serverName, config))) return;
    let sealed;
    try {
      sealed = await readDiscoveryEntryText(path_2, getStorageV5());
    } catch (error) {
      if (!isRefusedEntryError(error)) {
        logMCPDebug(
          serverName,
          `Discovery cache write deferred: existing entry unreadable (${errorMessage(error)})`,
        );
        verdict = {
          verdict: "transient",
          code: "transient",
        };
        return;
      }
      sealed = undefined;
    }
    if (sealed !== undefined) {
      let key = await getMcpDiscoveryCacheKey();
      let opened = key && cachePath ? openDiscoverySeal(sealHandle(key, cachePath), sealed) : undefined;
      let parseResult = opened?.ok
        ? discoveryEntrySchema().safeParse(safeParseJSON(opened.plaintext, false))
        : undefined;
      if (parseResult?.success && newestTimestamp(parseResult.data) > now) {
        verdict = {
          verdict: "superseded",
          code: "fresher_on_disk",
        };
        return;
      }
    }
    verdict = await writeDiscoveryEntry({
      path: path_2,
      serverName,
      config,
      cacheKey,
      entry,
      context: options,
      capturedDeleteGeneration,
      label: "write",
    });
  });
  return verdict ? logDiscoveryWriteVerdict(verdict) : "superseded";
}
//@ chunk-0qyh5wah.js:23223-23497 placement
async function readExistingEntry(cachePath, serverName) {
  let path = cachePath.path;
  let rawText;
  try {
    rawText = await readDiscoveryEntryText(path, getStorageV5());
  } catch (error) {
    if (isRefusedEntryError(error)) {
      await deleteDiscoveryEntry(path, getStorageV5());
      return;
    }
    throw error;
  }
  if (rawText === undefined) return;
  let sealedEntry = await openSealedEntry(rawText, cachePath, serverName, () =>
    deleteDiscoveryEntry(path, getStorageV5()),
  );
  if (sealedEntry.miss) return;
  let parseResult = discoveryEntrySchema().safeParse(safeParseJSON(sealedEntry.plaintext, false));
  if (!parseResult.success) {
    await deleteDiscoveryEntry(path, getStorageV5());
    return;
  }
  return parseResult.data;
}
//@ chunk-0qyh5wah.js:23497-24285 placement
async function mergeDiscoveryTools(serverName, config, tools, options) {
  if (!isCurrentIdentityEpoch(options.identityEpoch)) return;
  if (options.grantLeg === undefined) return;
  let cacheKey = cacheMemoKey(serverName, config);
  let capturedDeleteGeneration = deleteGeneration(cacheKey);
  registerDiscoveryFlush();
  if (!isDiscoveryCacheEligible(config)) return;
  let cachePath;
  try {
    cachePath = await resolveDiscoveryCachePath(serverName, config);
  } catch {
    logDiscoveryWriteVerdict({
      verdict: "transient",
      code: "transient",
    });
    return;
  }
  if (cachePath === undefined) return;
  if (cachePath.legToken !== options.grantLeg) {
    logMCPDebug(
      serverName,
      "Discovery cache tools merge refused: grant changed since this refresh was fetched (stale grant)",
    );
    logDiscoveryWriteVerdict({
      verdict: "superseded",
      code: "stale_grant",
    });
    return;
  }
  let path = cachePath.path;
  await serializeDiscoveryWrite(path, serverName, async () => {
    let entry = await readExistingEntry(cachePath, serverName);
    if (!entry) return;
    if (newestTimestamp(entry) > options.fetchedAt) {
      logDiscoveryWriteVerdict({
        verdict: "superseded",
        code: "fresher_on_disk",
      });
      return;
    }
    let entry_2 = {
      ...entry,
      tools,
      ...(Number.isFinite(options.fetchedAt) &&
        options.fetchedAt > entry.savedAt && {
          toolsSavedAt: options.fetchedAt,
        }),
    };
    logDiscoveryWriteVerdict(
      await writeDiscoveryEntry({
        path,
        serverName,
        config,
        cacheKey,
        entry: entry_2,
        context: options,
        capturedDeleteGeneration,
        label: "tools merge",
      }),
    );
  });
}
//@ chunk-0qyh5wah.js:24285-25321 placement
async function recordRefreshFailureStrike(serverName, config, options) {
  if (!isCurrentIdentityEpoch(options.identityEpoch)) return;
  if (options.grantLeg === undefined) return;
  let cacheKey = cacheMemoKey(serverName, config);
  let capturedDeleteGeneration = deleteGeneration(cacheKey);
  registerDiscoveryFlush();
  if (!isDiscoveryCacheEligible(config)) return;
  let cachePath;
  try {
    cachePath = await resolveDiscoveryCachePath(serverName, config);
  } catch {
    return;
  }
  if (cachePath === undefined) return;
  if (cachePath.legToken !== options.grantLeg) {
    logMCPDebug(
      serverName,
      "Discovery cache refresh-failure strike refused: grant changed since this refresh was fetched (stale grant)",
    );
    return;
  }
  let path = cachePath.path;
  await serializeDiscoveryWrite(path, serverName, async () => {
    let existingEntry = await readExistingEntry(cachePath, serverName);
    if (!existingEntry) return;
    if (!isCurrentIdentityEpoch(options.identityEpoch)) {
      logMCPDebug(
        serverName,
        "Discovery cache refresh-failure strike refused: identity changed since this refresh was fetched (stale epoch)",
      );
      return;
    }
    let recheckPath;
    try {
      recheckPath = await resolveDiscoveryCachePath(serverName, config);
    } catch {
      return;
    }
    if (recheckPath === undefined || recheckPath.path !== path || recheckPath.legToken !== options.grantLeg) {
      logMCPDebug(
        serverName,
        "Discovery cache refresh-failure strike refused: grant changed since this refresh was fetched (stale grant)",
      );
      return;
    }
    let updatedEntry = {
      ...existingEntry,
      consecutiveRefreshFailures: existingEntry.consecutiveRefreshFailures + 1,
    };
    if (updatedEntry.consecutiveRefreshFailures >= getMaxStrikes()) {
      bumpDeleteGeneration(cacheKey);
      await deleteDiscoveryEntry(path, getStorageV5());
      return;
    }
    await writeDiscoveryEntry({
      path,
      serverName,
      config,
      cacheKey,
      entry: updatedEntry,
      context: options,
      capturedDeleteGeneration,
      label: "refresh-failure strike",
    });
  });
}
//@ chunk-0qyh5wah.js:25321-25517 placement
/**
 * 懒拨号失败后为该服务器在发现缓存中记一次刷新失败。
 */
function strikeAfterLazyDialFailure(serverName, config) {
  (async () => {
    let identityEpoch_2 = identityEpoch();
    await recordRefreshFailureStrike(serverName, config, {
      identityEpoch: identityEpoch_2,
      grantLeg: await cacheGrantLeg(serverName, config),
    });
  })().catch((error) =>
    logForDebugging(
      `discovery-cache: strike after failed lazy dial of "${serverName}" did not land: ${errorMessage(error)}`,
    ),
  );
}
//@ chunk-0qyh5wah.js:25517-25929 placement
/**
 * 扫描发现缓存目录，删除属于给定缓存键或无法读取/解析的条目。
 */
async function purgeEntriesByCacheKey(serverName, cacheKeys) {
  for (let cacheKey of cacheKeys) bumpDeleteGeneration(cacheKey);
  let targetIds = new Set([...cacheKeys].map(hashCacheKeyId));
  let files = await listDiscoveryCacheFiles(getStorageV5());
  for (let fileName of files) {
    if (!fileName.endsWith(".json")) continue;
    let filePath = join(discoveryCacheDir(), fileName);
    try {
      let rawText;
      try {
        rawText = await readDiscoveryEntryText(filePath, getStorageV5());
      } catch (error) {
        if (isRefusedEntryError(error)) {
          await deleteEntryAndBump(filePath, serverName, undefined);
          continue;
        }
        throw error;
      }
      if (rawText === undefined) continue;
      let keyId = headerDigest(rawText);
      if (keyId === undefined) {
        await deleteEntryAndBump(filePath, serverName, undefined);
        continue;
      }
      if (targetIds.has(keyId)) await deleteEntryAndBump(filePath, serverName, undefined);
    } catch (error) {
      logMCPDebug(serverName, `discovery-cache: purge scan skipped ${error}`);
    }
  }
}
//@ chunk-0qyh5wah.js:25929-25982 placement
/**
 * 按缓存键删除该服务器的所有条目变体。
 */
async function purgeServerEntries(serverName, config) {
  await purgeEntriesByCacheKey(serverName, new Set([cacheMemoKey(serverName, config)]));
}
//@ chunk-0qyh5wah.js:25982-26286 placement
/**
 * 删除某服务器在发现缓存中的所有条目变体（无法取得指纹时退而扫描删除）。
 */
function purgeServerEntries_2(serverName, config, cacheKeys) {
  let cacheDir = discoveryCacheDir();
  let done = false;
  return serializeDiscoveryWrite(cacheDir, serverName, async () => {
    let fingerprint;
    try {
      fingerprint = (await resolveDiscoveryCachePath(serverName, config))?.fingerprint;
    } catch {
      fingerprint = undefined;
    }
    if (fingerprint === undefined) {
      await purgeEntriesByCacheKey(serverName, cacheKeys);
      done = true;
      return;
    }
    let pending = [];
    for (let cacheKey of cacheKeys) {
      let firstKey = cacheKey;
      for (let era of PROTOCOL_ERAS)
        for (let uiCapable of [false, true]) {
          pending.push(
            deleteEntryAndBump(
              join(cacheDir, discoveryCacheKey(cacheKey, fingerprint, era, uiCapable)),
              serverName,
              firstKey,
            ),
          );
          firstKey = undefined;
        }
    }
    await Promise.all(pending);
    done = true;
  }).then(() => done);
}
//@ chunk-0qyh5wah.js:26286-26640 placement
/**
 * 枚举服务器配置在各可变属性取值下的缓存键集合。
 */
function cacheKeyVariants(serverName, config) {
  let normalized = normalizeExclusionProps(config);
  let mapped = CACHE_EXCLUSION_PROPS.map(({ prop, normalize, valueDomain }) => {
    let states = new Set(valueDomain.map((value) => normalize(value)));
    let current = normalized[prop];
    if (current !== undefined) states.add(current);
    return {
      prop,
      states: [...states],
    };
  });
  let keys = new Set();
  let walk = (index, candidate) => {
    if (index === mapped.length) {
      keys.add(serverCacheKey(serverName, candidate));
      return;
    }
    let { prop, states } = mapped[index];
    for (let state of states) {
      let next = {
        ...candidate,
      };
      if (state === undefined) delete next[prop];
      else next[prop] = state;
      walk(index + 1, next);
    }
  };
  walk(0, {
    ...normalized,
  });
  return keys;
}
//@ chunk-0qyh5wah.js:26640-26685 placement
/**
 * 排序后拼接成字符串。
 */
function sortedJoin(values) {
  return [...values].sort().join(`
`);
}
//@ chunk-0qyh5wah.js:26685-27095 placement
async function deleteDiscoveryCache(serverName, config) {
  if (config.type !== "http" && config.type !== "sse") return;
  if (!isDiscoveryCacheUsable()) return;
  registerDiscoveryFlush();
  bumpDeleteGeneration(cacheMemoKey(serverName, config));
  try {
    let discoveryCachePath = await resolveDiscoveryCachePath(serverName, config);
    if (discoveryCachePath === undefined) {
      await purgeServerEntries(serverName, config);
      return;
    }
    let cacheKey = cacheMemoKey(serverName, config);
    let cacheDir = discoveryCacheDir();
    let otherPaths = new Set(
      PROTOCOL_ERAS.flatMap((era) =>
        [false, true].map((uiCapable) =>
          join(cacheDir, discoveryCacheKey(cacheKey, discoveryCachePath.fingerprint, era, uiCapable)),
        ),
      ),
    );
    let pending = [deleteEntryAndBump(discoveryCachePath.path, serverName, cacheKey)];
    for (let path of otherPaths)
      if (path !== discoveryCachePath.path) pending.push(deleteEntryAndBump(path, serverName, undefined));
    await Promise.all(pending);
    await purgeServerEntries(serverName, config);
  } catch (error) {
    logMCPDebug(serverName, `discovery-cache: delete failed: ${error}`);
  }
}
//@ chunk-0qyh5wah.js:27095-27635 placement
/**
 * 获取发现缓存刷新锁：已被其他进程持有时返回 undefined（跳过刷新），出错时返回空释放函数继续执行。
 */
async function acquireDiscoveryRefreshLock(serverName, config) {
  let lockPath;
  try {
    lockPath = await cacheFilePath(serverName, config);
  } catch {
    return async () => {};
  }
  if (lockPath === undefined) return async () => {};
  try {
    await getStorage().mkdir(discoveryCacheDir(), CACHE_DIR_MODE);
    return await lock(lockPath, {
      realpath: false,
      retries: 0,
      stale: 60000,
      onCompromised: (error) =>
        logMCPDebug(serverName, `discovery-cache: refresh lock compromised, skipping refresh: ${error}`),
    });
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    if (error?.code === "ELOCKED" || errorMessage.includes("already being held")) {
      logMCPDebug(serverName, "discovery-cache: refresh lock held elsewhere, skipping");
      return;
    }
    logMCPDebug(serverName, `discovery-cache: lock error, proceeding: ${errorMessage}`);
    return async () => {};
  }
}
export {
  CACHE_VERSION_PREFIX,
  CACHE_KEY_ID_CHARS,
  regExp,
  BASE64URL_CHARS_RE,
  hashCacheKeyId,
  IV_BYTES,
  AUTH_TAG_BYTES,
  recordPresentedHeaderSecrets,
  flushDiscoveryCache,
  deleteDiscoveryCache,
  clearDiscoveryPathMemo,
  writeDiscoveryCache,
  mergeDiscoveryTools,
  isDiscoveryCacheEligible,
  isCacheableServer,
  cacheGrantLeg,
  readDiscoveryCache,
  recordRefreshFailureStrike,
  acquireDiscoveryRefreshLock,
  strikeAfterLazyDialFailure,
};
