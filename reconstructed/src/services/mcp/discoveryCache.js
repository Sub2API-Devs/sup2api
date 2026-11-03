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
import { u, literal, string, E, _enum, array } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-0qyh5wah.js:3003-3089 placement
/**
 * 缓存版本前缀 "v2:"。
 */
var DISCOVERY_CACHE_KEY_BYTES = 32;
var IV_BYTES = 12;
var AUTH_TAG_BYTES = 16;
var CACHE_VERSION_PREFIX = "v2:";
var buffer = Buffer.from("mcp-dc", "utf8");
var KEY_B64_RE = /^[A-Za-z0-9+/]{43}=$/;
//@ chunk-0qyh5wah.js:3089-3207 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  if (typeof buffer !== "string" || !KEY_B64_RE.test(buffer)) return;
  let buffer_2 = Buffer.from(buffer, "base64");
  return buffer_2.length === DISCOVERY_CACHE_KEY_BYTES ? buffer_2 : undefined;
}
//@ chunk-0qyh5wah.js:3207-3537 placement
async function getMcpDiscoveryCacheKey() {
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED) return;
  let r = encodeCacheKey(secureStorageForMcp?.mcpDiscoveryCacheKey);
  if (r) return r;
  let mcpDiscoveryCacheKey = randomBytes(DISCOVERY_CACHE_KEY_BYTES).toString("base64");
  let s = false;
  try {
    s = (
      await getSecureStorage().mutate((y) =>
        base64URLEncode(y.mcpDiscoveryCacheKey)
          ? y
          : {
              ...y,
              mcpDiscoveryCacheKey,
            },
      )
    ).success;
  } catch {
    s = false;
  }
  if (!s) return;
  let secureStorageForMcp_2 = await readSecureStorageForMcp();
  if (secureStorageForMcp_2 === READ_FAILED) return;
  return encodeCacheKey(secureStorageForMcp_2?.mcpDiscoveryCacheKey);
}
//@ chunk-0qyh5wah.js:3537-3565 placement
function encodeCacheKey(buffer) {
  return base64URLEncode(buffer);
}
//@ chunk-0qyh5wah.js:3565-3904 placement
function buildDiscoveryCacheAad(e, r, fingerprint) {
  if (!Number.isInteger(e) || e < 0 || e > 255)
    throw Error("discovery-cache seal: schema version must fit one byte");
  let mapped = [r, fingerprint].map((y) => Buffer.from(y, "utf8"));
  let c = Buffer.allocUnsafe(buffer.length + 1 + mapped.reduce((acc, l) => acc + 4 + l.length, 0));
  let a = buffer.copy(c, 0);
  a = c.writeUInt8(e, a);
  for (let y of mapped) {
    a = c.writeUInt32BE(y.length, a);
    a += y.copy(c, a);
  }
  return c;
}
//@ chunk-0qyh5wah.js:3904-4136 placement
function sealDiscoveryCacheEntry(e, serialized) {
  let n = randomBytes(IV_BYTES);
  let cipheriv = createCipheriv("aes-256-gcm", e.key, n, {
    authTagLength: AUTH_TAG_BYTES,
  });
  cipheriv.setAAD(e.aad);
  let buffer = Buffer.concat([cipheriv.update(serialized, "utf8"), cipheriv.final()]);
  let authTag = cipheriv.getAuthTag();
  return (
    CACHE_VERSION_PREFIX +
    hashCacheKeyId(e.cacheKey) +
    ":" +
    Buffer.concat([n, buffer, authTag]).toString("base64url")
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
var CACHE_KEY_ID_BYTES = 16;
var Pe = Math.ceil((CACHE_KEY_ID_BYTES * 4) / 3);
var regExp = new RegExp(`^[A-Za-z0-9_-]{${Pe}}$`);
var BASE64URL_CHARS_RE = /^[A-Za-z0-9_-]*$/;
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
var CACHE_FILE_MODE = 384;
var CACHE_DIR_MODE = 448;
var discoveryEntrySchema = DoctorLazy(() => {
  let e = require("./chunk-asne9cp8.js").mcpClientModule().discoveryWireSchemas();
  return u({
    v: literal(CACHE_ENTRY_VERSION),
    serverName: string(),
    cacheKey: string(),
    savedAt: E(),
    toolsSavedAt: E().optional(),
    consecutiveRefreshFailures: E().int().nonnegative(),
    serverInfo: e.implementation.optional(),
    negotiatedEra: _enum(PROTOCOL_ERAS).optional(),
    capabilities: e.serverCapabilities,
    tools: array(e.tool),
    commands: array(e.prompt),
    resources: array(e.resource),
    templates: array(e.resourceTemplate).optional(),
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
function isDiscoveryCacheEligible(e) {
  return discoveryCacheExclusion(e) === undefined;
}
//@ chunk-0qyh5wah.js:7175-7224 placement
/**
 * 判断原因是否属于已知的缓存排除原因。
 */
function isKnownExclusionReason(e) {
  return CACHE_EXCLUSION_PROPS.some((r) => r.reason === e);
}
//@ chunk-0qyh5wah.js:7224-7470 placement
var CACHE_EXCLUSION_PROPS = [
  {
    prop: "discoveryCache",
    reason: "opt-out",
    excludes: (e) => e === false,
    normalize: (e) => (e === false ? false : undefined),
    valueDomain: [undefined, false],
  },
  {
    prop: "headersHelper",
    reason: "headers-helper",
    excludes: (e) => Boolean(e),
    normalize: (e) => (e ? e : undefined),
    valueDomain: [undefined],
  },
];
//@ chunk-0qyh5wah.js:7470-7615 placement
function normalizeExclusionProps(e) {
  let r = {
    ...e,
  };
  for (let { prop, normalize } of CACHE_EXCLUSION_PROPS) {
    if (!(prop in r)) continue;
    let c = normalize(r[prop]);
    if (c === undefined) delete r[prop];
    else r[prop] = c;
  }
  return r;
}
//@ chunk-0qyh5wah.js:7615-7816 placement
function hasEnvReferenceInUrlOrHeaders(e) {
  let r = e;
  if (typeof r.url === "string" && containsEnvRef(r.url)) return true;
  if (r.headers && typeof r.headers === "object") {
    for (let header of Object.values(r.headers))
      if (typeof header === "string" && containsEnvRef(header)) return true;
  }
  return false;
}
//@ chunk-0qyh5wah.js:7816-7932 placement
var DISCOVERY_CACHE_ENV_OVERRIDES = [
  "MCP_DISCOVERY_CACHE_TTL_S",
  "MCP_DISCOVERY_CACHE_MAX_STALE_S",
  "MCP_DISCOVERY_CACHE_STRIKES",
];
var NON_CACHEABLE_SERVER_NAMES = [VISUALIZE, MEMORY, CLAUDE_ARTIFACTS];
//@ chunk-0qyh5wah.js:7932-7995 placement
/**
 * 判断环境变量是否由设置提供（用于禁用缓存）。
 */
function hasSettingsSourcedOverride(e) {
  let r = process.env[e];
  return r !== undefined && isSettingsSourcedEnvValue(e, r);
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
  let y = [parsed.mcpServerId, serverId];
  let l = [`cse_${sessionBody}`, `session_${sessionBody}`];
  return !(
    isKnownProxyEndpointUrl(config.url) ||
    y.some((h) => RESERVED_SERVER_IDS_WITH_DOCS.includes(h)) ||
    [...reservedMcpServerNames(), ...NON_CACHEABLE_SERVER_NAMES].some((h) =>
      l.some((v) => y.includes(derivedServerId(v, h))),
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
  let r = discoveryCacheOffReason();
  if (r !== undefined) return r;
  if (identityChangedThisProcess()) return "identity-changed";
  if (config.type !== "http" && config.type !== "sse") return "transport";
  if (isCliOwnedConfig(config) || hasCliOwnedBearer(config)) return "cli-owned";
  if (hasEnvReferenceInUrlOrHeaders(config)) return "env-placeholder";
  if (isFirstPartyMcpUrl(config.url) && !configHasAuthorizationHeader(config)) return "ambient-credential";
  if (isSameOriginAsCcr(config.url)) {
    if (!isCacheableCcrSessionServer(config)) return "ambient-credential";
  } else if (isCacheEnabledHere()) return "ambient-credential";
  let n = config;
  for (let { prop, reason, excludes } of CACHE_EXCLUSION_PROPS) if (excludes(n[prop])) return reason;
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
async function canFingerprint(e, r) {
  if (!isDiscoveryCacheEligible(r)) return false;
  return (await refreshTokenFingerprint(e, r)).kind !== "degenerate";
}
//@ chunk-0qyh5wah.js:9419-9705 placement
async function refreshTokenFingerprint(e, r) {
  if (r.type !== "http" && r.type !== "sse")
    return {
      kind: "none",
    };
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED)
    return {
      kind: "degenerate",
    };
  let s = secureStorageForMcp?.mcpOAuth?.[getServerKey(e, r)];
  if (!s)
    return {
      kind: "none",
    };
  let refreshToken = s.refreshToken;
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
async function grantTokenFor(e, r) {
  if (r.type !== "http" && r.type !== "sse") return "grant:none";
  let n = await refreshTokenFingerprint(e, r);
  switch (n.kind) {
    case "none":
      return "grant:none";
    case "resolved":
      return `grant:${n.hash}`;
    case "degenerate":
      return;
  }
}
//@ chunk-0qyh5wah.js:9911-10183 placement
async function identityFingerprint(e, r) {
  let mcpIdentitySnapshot = getMcpIdentitySnapshot();
  if (mcpIdentitySnapshot.kind === "unwired" || mcpIdentitySnapshot.kind === "incomplete") return;
  let s = await grantTokenFor(e, r);
  if (s === undefined) return;
  let c = [mcpIdentitySnapshot.token];
  if (r.type === "http" || r.type === "sse") c.push(s);
  return {
    fingerprint: createHash("sha256").update(c.join("\x00")).digest("hex"),
    grantToken: s,
  };
}
//@ chunk-0qyh5wah.js:10183-10848 placement
function discoveryCacheKey(e, fingerprint, n, s) {
  let joined = [
    e,
    fingerprint,
    `era:${n}`,
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
    ...(s ? ["offer:io.modelcontextprotocol/ui"] : []),
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
function clearDiscoveryPathMemo(e) {
  let r = `${e}-`;
  let filePathMemo = getDiscoveryCacheStore().filePathMemo;
  for (let key of filePathMemo.keys()) {
    if (!key.startsWith(r)) continue;
    if (CACHE_FILE_PREFIX_RE.test(key.slice(r.length))) filePathMemo.delete(key);
  }
}
//@ chunk-0qyh5wah.js:11017-11052 placement
/**
 * 生成缓存路径记忆的键。
 */
function cacheMemoKey(e, r) {
  return serverCacheKey(e, normalizeExclusionProps(r));
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
async function cacheGrantLeg(e, r) {
  if (!isDiscoveryCacheOn()) return;
  try {
    return (await resolveDiscoveryCachePath(e, r))?.legToken;
  } catch {
    return;
  }
}
//@ chunk-0qyh5wah.js:11190-11668 placement
/**
 * 计算某服务器发现缓存文件的路径与密钥材料（缓存键、身份指纹、协议代、UI 开关、授权令牌、AAD），结果按组合键记忆，解析失败时移除记忆。
 */
async function resolveDiscoveryCachePath(e, r) {
  let n = cacheMemoKey(e, r);
  let s = currentEra();
  let c = isMcpAppsHost();
  let a = currentIdentityToken();
  let y = `${n}\x00${a}\x00era:${s}\x00ui:${c}`;
  let filePathMemo = getDiscoveryCacheStore().filePathMemo;
  let h = filePathMemo.get(y);
  if (h) return h;
  let v = (async () => {
    let S = await identityFingerprint(e, r);
    if (S === undefined) return;
    return {
      path: join(discoveryCacheDir(), discoveryCacheKey(n, S.fingerprint, s, c)),
      grantToken: S.grantToken,
      fingerprint: S.fingerprint,
      cacheKey: n,
      aad: buildDiscoveryCacheAad(CACHE_ENTRY_VERSION, n, S.fingerprint),
      legToken: `${S.grantToken}\x00era:${s}\x00${a}`,
    };
  })();
  filePathMemo.set(y, v);
  let w = () => {
    if (filePathMemo.get(y) === v) filePathMemo.delete(y);
  };
  v.then((S) => {
    if (S === undefined) w();
  }, w);
  return v;
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
function cacheSpaceKey(e) {
  return STORAGE_SPACES.userConfigDir("mcp-discovery-cache", [basename(e)]);
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
function newestTimestamp(e) {
  return Math.max(e.savedAt, e.toolsSavedAt ?? 0);
}
//@ chunk-0qyh5wah.js:11937-12075 placement
class RefusedDiscoveryEntryError extends Error {
  entryPath;
  reason;
  constructor(entryPath, reason, n) {
    super(n);
    this.entryPath = entryPath;
    this.reason = reason;
    this.name = "RefusedDiscoveryEntryError";
  }
}
//@ chunk-0qyh5wah.js:12075-12204 placement
class OversizeDiscoveryEntryError extends RefusedDiscoveryEntryError {
  constructor(e) {
    super(e, "oversize", "discovery-cache: oversize entry");
    this.name = "OversizeDiscoveryEntryError";
  }
}
//@ chunk-0qyh5wah.js:12204-12342 placement
class SymlinkedDiscoveryEntryError extends RefusedDiscoveryEntryError {
  constructor(e) {
    super(e, "symlink", "discovery-cache: symlinked entry refused");
    this.name = "SymlinkedDiscoveryEntryError";
  }
}
//@ chunk-0qyh5wah.js:12342-12487 placement
class NonRegularDiscoveryEntryError extends RefusedDiscoveryEntryError {
  constructor(e) {
    super(e, "non-regular", "discovery-cache: non-regular entry refused");
    this.name = "NonRegularDiscoveryEntryError";
  }
}
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
async function readDiscoveryEntryText(path, storageV5) {
  let readGateForTest = getDiscoveryCacheStore().readGateForTest;
  if (readGateForTest) await readGateForTest;
  if (storageV5) return readDiscoveryEntryFromStorage(storageV5, path);
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0) {
      let stats = await getStorage().lstat(path);
      if (stats === undefined) return;
      if (stats.isSymbolicLink) throw new SymlinkedDiscoveryEntryError(path);
      if (!stats.isFile) throw new NonRegularDiscoveryEntryError(path);
    }
    let s;
    try {
      s = await getStorage().readTail(path, MAX_ENTRY_BYTES + 1, {
        noFollow: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ELOOP") throw new SymlinkedDiscoveryEntryError(path);
      if (errnoCode === "ENXIO") throw new NonRegularDiscoveryEntryError(path);
      throw error;
    }
    if (s.length > MAX_ENTRY_BYTES) throw new OversizeDiscoveryEntryError(path);
    return s.toString("utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
}
//@ chunk-0qyh5wah.js:12964-13366 placement
/**
 * 从存储 V5 读取发现缓存条目（拒绝符号链接、非普通文件与超大条目）。
 */
async function readDiscoveryEntryFromStorage(e, r) {
  let key = cacheSpaceKey(r);
  let s = await e.read(
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
  if (!s.ok) {
    let a = "cause" in s.error ? getErrnoCode(s.error.cause) : undefined;
    if (a === "ELOOP") throw new SymlinkedDiscoveryEntryError(r);
    if (a === "ENXIO") throw new NonRegularDiscoveryEntryError(r);
    throw Error("discovery-cache: read failed", {
      cause: s.error,
    });
  }
  let c = s.value.items[0];
  if (!c.found) return;
  if (c.totalBytes > MAX_ENTRY_BYTES) throw new OversizeDiscoveryEntryError(r);
  return Buffer.from(c.value).toString("utf8");
}
//@ chunk-0qyh5wah.js:13366-13563 placement
async function writeDiscoveryEntryText(entryPath, sealed, storageV5) {
  if (storageV5) {
    let c = await storageV5.write(cacheSpaceKey(entryPath), sealed);
    if (!c.ok)
      throw Error("discovery-cache: write failed", {
        cause: c.error,
      });
    return;
  }
  let storage = getStorage();
  await storage.mkdir(discoveryCacheDir(), CACHE_DIR_MODE);
  await storage.atomicWrite(entryPath, sealed, CACHE_FILE_MODE);
}
//@ chunk-0qyh5wah.js:13563-13975 placement
/**
 * 列出发现缓存目录中的文件名（本地文件系统或存储 V5 分页列出）。
 */
async function listDiscoveryCacheFiles(storageV5) {
  if (!storageV5) return getStorage().list(discoveryCacheDir());
  let r = [];
  let n;
  do {
    let s = await storageV5.listEntries(CACHE_SPACE, {
      skipKeyStats: true,
      skipScopeStats: true,
      ...(n !== undefined && {
        cursor: n,
      }),
    });
    if (!s.ok)
      throw Error("discovery-cache: list failed", {
        cause: s.error,
      });
    for (let item of s.value.items)
      if (item.kind === "key" && item.key.namespace === "userConfigDir") {
        let a = item.key.relPath[0];
        if (a !== undefined && item.key.relPath.length === 1) r.push(a);
      }
    n = s.value.cursor;
  } while (n);
  return r;
}
//@ chunk-0qyh5wah.js:13975-14160 placement
async function deleteDiscoveryEntry(path, storageV5) {
  if (storageV5) {
    let n = await storageV5.delete(cacheSpaceKey(path));
    if (!n.ok)
      throw Error("discovery-cache: delete failed", {
        cause: n.error,
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
async function readDiscoveryCache(e, r, n = Date.now()) {
  let s = discoveryCacheExclusion(r);
  if (s !== undefined && !isKnownExclusionReason(s))
    return {
      kind: "miss",
      reason: s === "transport" ? "transport" : "disabled",
    };
  if (s !== undefined) {
    registerDiscoveryFlush();
    let D = cacheKeyVariants(e, r);
    let M = sortedJoin(D);
    let admissionPurgedKeySets = getDiscoveryCacheStore().admissionPurgedKeySets;
    if (!admissionPurgedKeySets.has(M)) {
      admissionPurgedKeySets.add(M);
      purgeServerEntries_2(e, r, D).then((Ne) => {
        if (!Ne) admissionPurgedKeySets.delete(M);
      });
    }
    logMCPDebug(e, `discovery-cache: ${s} \u2014 purging this server's cache-key family, serving miss`);
    return {
      kind: "miss",
      reason: "disabled",
    };
  }
  let c;
  try {
    c = await resolveDiscoveryCachePath(e, r);
  } catch (error) {
    logMCPDebug(e, `discovery-cache: fingerprint failed: ${error}`);
    return {
      kind: "miss",
      reason: "no-fingerprint",
    };
  }
  if (c === undefined)
    return {
      kind: "miss",
      reason: "no-fingerprint",
    };
  let path = c.path;
  let y = () => {
    deleteEntryAndBump(path, e, undefined).catch(() => {});
  };
  let l = () => {
    y();
    logFeatureBad("mcp_discovery_cache", "corrupt_entry");
    return {
      kind: "miss",
      reason: "corrupt",
    };
  };
  let h;
  try {
    h = await readDiscoveryEntryText(path, getStorageV5());
  } catch (error) {
    if (isRefusedEntryError(error)) {
      logMCPDebug(e, `discovery-cache: ${error.reason} entry, deleting`);
      return l();
    }
    logMCPDebug(e, `discovery-cache: read failed: ${error}`);
    return {
      kind: "miss",
      reason: "absent",
    };
  }
  if (h === undefined)
    return {
      kind: "miss",
      reason: "absent",
    };
  let sealedEntry = await openSealedEntry(h, c, e, () => deleteEntryAndBump(path, e, undefined));
  if (sealedEntry.miss) {
    if (sealedEntry.miss === "unsealed")
      if (sealedEntry.cause === "v1") logFeatureSad("mcp_discovery_cache", "unsealed_v1");
      else logFeatureBad("mcp_discovery_cache", `unsealed_${sealedEntry.cause}`);
    return {
      kind: "miss",
      reason: sealedEntry.miss,
    };
  }
  let w = discoveryEntrySchema().safeParse(safeParseJSON(sealedEntry.plaintext, false));
  if (!w.success) {
    logMCPDebug(e, "discovery-cache: corrupt entry, deleting");
    return l();
  }
  let S = w.data;
  if (S.cacheKey !== cacheMemoKey(e, r)) {
    logMCPDebug(e, "discovery-cache: entry keyed for another server, deleting");
    return l();
  }
  if (S.consecutiveRefreshFailures >= getMaxStrikes()) {
    y();
    return {
      kind: "miss",
      reason: "strike-threshold",
    };
  }
  let maxStaleMs = getMaxStaleMs();
  if (newestTimestamp(S) - n > maxStaleMs) {
    y();
    return {
      kind: "miss",
      reason: "expired",
    };
  }
  let max = Math.max(0, n - S.savedAt);
  if (max >= maxStaleMs) {
    y();
    return {
      kind: "miss",
      reason: "expired",
    };
  }
  if (max < getCacheTtlMs() && !(S.capabilities.tools && S.tools.length === 0))
    return {
      kind: "fresh",
      entry: S,
      ageMs: max,
    };
  return {
    kind: "stale",
    entry: S,
    ageMs: max,
  };
}
//@ chunk-0qyh5wah.js:15931-16042 placement
function serializeDiscoveryWrite(e, r, n) {
  return getDiscoveryCacheStore()
    .serializeWrite(e, n)
    .catch((error) => {
      logMCPDebug(r, `discovery-cache: write op failed: ${error}`);
    });
}
//@ chunk-0qyh5wah.js:16042-16105 placement
/**
 * 取某缓存键的删除代号。
 */
function deleteGeneration(e) {
  return getDiscoveryCacheStore().deleteGenerationByCacheKey.get(e) ?? 0;
}
//@ chunk-0qyh5wah.js:16105-16166 placement
/**
 * 递增某缓存键的删除代号。
 */
function bumpDeleteGeneration(e) {
  getDiscoveryCacheStore().deleteGenerationByCacheKey.set(e, deleteGeneration(e) + 1);
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
  let c = secureStorageForMcp?.mcpOAuth?.[serverKey];
  let a = [];
  if (typeof c?.accessToken === "string") a.push(c.accessToken);
  if (typeof c?.refreshToken === "string") a.push(c.refreshToken);
  if (typeof c?.clientSecret === "string") a.push(c.clientSecret);
  let clientSecret = secureStorageForMcp?.mcpOAuthClientConfig?.[serverKey]?.clientSecret;
  if (typeof clientSecret === "string") a.push(clientSecret);
  return a;
}
//@ chunk-0qyh5wah.js:16586-16708 placement
var SECRET_KEY_REGEX = /auth|token|key|secret|cookie|session|sig|pass|cred|bearer/i;
var AUTH_SCHEME_PREFIX_REGEX = /^\s*[A-Za-z][A-Za-z0-9!#$%&'*+.^_`|~-]*\s+(?=\S)/;
//@ chunk-0qyh5wah.js:16708-16915 placement
function forEachSecretValue(e, r, n) {
  if (typeof r !== "string" || !SECRET_KEY_REGEX.test(e)) return;
  n(r.trim());
  n(r.replace(AUTH_SCHEME_PREFIX_REGEX, "").trim());
  if (/^cookie$/i.test(e))
    for (let s of r.split(";")) {
      let index = s.indexOf("=");
      n((index === -1 ? s : s.slice(index + 1)).trim());
    }
}
//@ chunk-0qyh5wah.js:16915-17164 placement
/**
 * 记录连接时额外呈现的请求头中的秘密片段，供发现缓存检查。
 */
function recordPresentedHeaderSecrets(headers, r) {
  let presentedCredentialLog = getPresentedCredentialLog();
  if (presentedCredentialLog.recordingOff()) return;
  let s = new Map();
  for (let [key, value] of Object.entries(headers ?? {})) s.set(key.toLowerCase(), value);
  for (let [key, value] of Object.entries(r)) {
    if (s.get(key.toLowerCase()) === value) continue;
    forEachSecretValue(key, value, (y) => {
      if (y.length >= MIN_SECRET_LENGTH) presentedCredentialLog.record(y);
    });
  }
}
//@ chunk-0qyh5wah.js:17164-17181 placement
/**
 * 扫描秘密时的成本上限（256 Mi）。
 */
var MAX_SCAN_COST = 268435456;
//@ chunk-0qyh5wah.js:17181-17312 placement
function secretEncodings(e) {
  let r = [e];
  let sliced = jsonStringifyRaw(e).slice(1, -1);
  if (sliced !== e) r.push(sliced);
  try {
    let encoded = encodeURIComponent(e);
    if (encoded !== e) r.push(encoded);
  } catch {}
  return r;
}
//@ chunk-0qyh5wah.js:17312-18047 placement
/**
 * 写入发现缓存前检查条目是否带有密钥材料：收集配置头、URL 查询参数与用户信息、OAuth 令牌、本进程出示过的凭据，按原文/JSON 转义/URL 编码比对；日志不完整或扫描预算超出也拒绝。
 */
function findSecretMaterial(serialized, config, extraSecrets = []) {
  let cfg = config;
  let secrets = new Set();
  let addSecret = (l) => {
    if (l !== undefined && l.length >= MIN_SECRET_LENGTH) secrets.add(l);
  };
  for (let [key, value] of Object.entries(cfg.headers ?? {})) forEachSecretValue(key, value, addSecret);
  try {
    let l = typeof cfg.url === "string" ? new URL(cfg.url) : undefined;
    for (let [h, v] of l?.searchParams.entries() ?? [])
      if (SECRET_KEY_REGEX.test(h)) for (let w of secretEncodings(v)) addSecret(w);
    for (let h of l?.search.replace(/^\?/, "").split("&") ?? []) {
      let index = h.indexOf("=");
      if (index > 0 && SECRET_KEY_REGEX.test(h.slice(0, index))) addSecret(h.slice(index + 1));
    }
    for (let h of l ? [l.password, l.username] : [])
      if (h) {
        addSecret(h);
        try {
          addSecret(decodeURIComponent(h));
        } catch {}
      }
  } catch {}
  for (let extraSecret of extraSecrets) addSecret(extraSecret);
  let y = getPresentedCredentialLog().snapshot();
  if (!y.complete) return "presented-log-incomplete";
  for (let atom of y.atoms) addSecret(atom);
  if (secrets.size * serialized.length > MAX_SCAN_COST) return "scan-budget";
  for (let secret of secrets)
    for (let h of secretEncodings(secret)) if (serialized.includes(h)) return "material";
  return;
}
//@ chunk-0qyh5wah.js:18047-18108 placement
/**
 * 生成解密句柄（key、cacheKey、aad）。
 */
function sealHandle(key, r) {
  return {
    key,
    cacheKey: r.cacheKey,
    aad: r.aad,
  };
}
//@ chunk-0qyh5wah.js:18108-18570 placement
/**
 * 解封发现缓存条目：密钥不可用时关闭缓存，解封失败时删除该条目并返回未命中原因。
 */
async function openSealedEntry(sealed, r, n, s) {
  let key = await getMcpDiscoveryCacheKey();
  if (key === undefined) {
    logMCPDebug(
      n,
      "Discovery cache: sealing key unavailable (secure storage unreadable) \u2014 cache off for this process",
    );
    latchCacheOff();
    return {
      miss: "key-unavailable",
    };
  }
  let discoverySeal = openDiscoverySeal(sealHandle(key, r), sealed);
  if (discoverySeal.ok)
    return {
      plaintext: discoverySeal.plaintext,
    };
  logMCPDebug(n, `Discovery cache: entry did not open (${discoverySeal.reason}) \u2014 discarded`);
  try {
    await s();
  } catch (error) {
    logMCPDebug(n, `discovery-cache: reap after failed open skipped ${error}`);
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
async function writeDiscoveryEntry(e) {
  let { path: entryPath, serverName, config, cacheKey, entry, context: entry_2, label } = e;
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
  if (deleteGeneration(cacheKey) !== e.capturedDeleteGeneration) {
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
  let S = discoveryEntrySchema().safeParse(entry);
  if (!S.success) {
    logMCPDebug(serverName, `Discovery cache ${label} refused: entry failed schema validation`);
    return {
      verdict: "terminal",
      code: "schema",
    };
  }
  let serialized = jsonStringifyRaw(S.data);
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
async function deleteEntryAndBump(e, r, n) {
  if (n !== undefined) bumpDeleteGeneration(n);
  await serializeDiscoveryWrite(e, r, () => deleteDiscoveryEntry(e, getStorageV5()));
}
//@ chunk-0qyh5wah.js:21646-21736 placement = withTimeout (0.805)
async function withTimeout(e, r) {
  await Promise.race([
    e.then(
      () => {},
      () => {},
    ),
    sleep(r, undefined, {
      unref: true,
    }),
  ]);
}
//@ chunk-0qyh5wah.js:21736-21782 placement
async function flushDiscoveryCache(e, r = 1500) {
  registerDiscoveryFlush();
  await withTimeout(e, r);
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
async function writeDiscoveryCache(name, config, n, s) {
  let c = s.now ?? Date.now();
  let a = cacheMemoKey(name, config);
  let capturedDeleteGeneration = deleteGeneration(a);
  if (!isCurrentIdentityEpoch(s.identityEpoch)) return "superseded";
  if (s.grantLeg === undefined) return "superseded";
  if (!isDiscoveryCacheEligible(config)) return "superseded";
  registerDiscoveryFlush();
  let l;
  try {
    l = await resolveDiscoveryCachePath(name, config);
  } catch {
    return logDiscoveryWriteVerdict({
      verdict: "transient",
      code: "transient",
    });
  }
  if (l === undefined) return "superseded";
  if (l.legToken !== s.grantLeg) {
    logMCPDebug(
      name,
      "Discovery cache write refused: grant changed since this round was fetched (stale grant)",
    );
    return logDiscoveryWriteVerdict({
      verdict: "superseded",
      code: "stale_grant",
    });
  }
  let path = l.path;
  let entry = {
    v: CACHE_ENTRY_VERSION,
    serverName: name,
    cacheKey: a,
    savedAt: c,
    consecutiveRefreshFailures: 0,
    ...(n.serverInfo && {
      serverInfo: n.serverInfo,
    }),
    ...(n.negotiatedEra !== undefined && {
      negotiatedEra: n.negotiatedEra,
    }),
    capabilities: n.capabilities,
    tools: n.tools,
    commands: n.commands,
    resources: n.resources,
    templates: n.templates,
  };
  let w = path;
  let S;
  await serializeDiscoveryWrite(w, name, async () => {
    if (!(await canFingerprint(name, config))) return;
    let sealed;
    try {
      sealed = await readDiscoveryEntryText(w, getStorageV5());
    } catch (error) {
      if (!isRefusedEntryError(error)) {
        logMCPDebug(
          name,
          `Discovery cache write deferred: existing entry unreadable (${errorMessage(error)})`,
        );
        S = {
          verdict: "transient",
          code: "transient",
        };
        return;
      }
      sealed = undefined;
    }
    if (sealed !== undefined) {
      let key = await getMcpDiscoveryCacheKey();
      let D = key && l ? openDiscoverySeal(sealHandle(key, l), sealed) : undefined;
      let M = D?.ok ? discoveryEntrySchema().safeParse(safeParseJSON(D.plaintext, false)) : undefined;
      if (M?.success && newestTimestamp(M.data) > c) {
        S = {
          verdict: "superseded",
          code: "fresher_on_disk",
        };
        return;
      }
    }
    S = await writeDiscoveryEntry({
      path: w,
      serverName: name,
      config,
      cacheKey: a,
      entry,
      context: s,
      capturedDeleteGeneration,
      label: "write",
    });
  });
  return S ? logDiscoveryWriteVerdict(S) : "superseded";
}
//@ chunk-0qyh5wah.js:23223-23497 placement
async function readExistingEntry(e, r) {
  let path = e.path;
  let s;
  try {
    s = await readDiscoveryEntryText(path, getStorageV5());
  } catch (error) {
    if (isRefusedEntryError(error)) {
      await deleteDiscoveryEntry(path, getStorageV5());
      return;
    }
    throw error;
  }
  if (s === undefined) return;
  let sealedEntry = await openSealedEntry(s, e, r, () => deleteDiscoveryEntry(path, getStorageV5()));
  if (sealedEntry.miss) return;
  let a = discoveryEntrySchema().safeParse(safeParseJSON(sealedEntry.plaintext, false));
  if (!a.success) {
    await deleteDiscoveryEntry(path, getStorageV5());
    return;
  }
  return a.data;
}
//@ chunk-0qyh5wah.js:23497-24285 placement
async function mergeDiscoveryTools(name, config, tools, s) {
  if (!isCurrentIdentityEpoch(s.identityEpoch)) return;
  if (s.grantLeg === undefined) return;
  let c = cacheMemoKey(name, config);
  let capturedDeleteGeneration = deleteGeneration(c);
  registerDiscoveryFlush();
  if (!isDiscoveryCacheEligible(config)) return;
  let y;
  try {
    y = await resolveDiscoveryCachePath(name, config);
  } catch {
    logDiscoveryWriteVerdict({
      verdict: "transient",
      code: "transient",
    });
    return;
  }
  if (y === undefined) return;
  if (y.legToken !== s.grantLeg) {
    logMCPDebug(
      name,
      "Discovery cache tools merge refused: grant changed since this refresh was fetched (stale grant)",
    );
    logDiscoveryWriteVerdict({
      verdict: "superseded",
      code: "stale_grant",
    });
    return;
  }
  let path = y.path;
  await serializeDiscoveryWrite(path, name, async () => {
    let existingEntry = await readExistingEntry(y, name);
    if (!existingEntry) return;
    if (newestTimestamp(existingEntry) > s.fetchedAt) {
      logDiscoveryWriteVerdict({
        verdict: "superseded",
        code: "fresher_on_disk",
      });
      return;
    }
    let entry = {
      ...existingEntry,
      tools,
      ...(Number.isFinite(s.fetchedAt) &&
        s.fetchedAt > existingEntry.savedAt && {
          toolsSavedAt: s.fetchedAt,
        }),
    };
    logDiscoveryWriteVerdict(
      await writeDiscoveryEntry({
        path,
        serverName: name,
        config,
        cacheKey: c,
        entry,
        context: s,
        capturedDeleteGeneration,
        label: "tools merge",
      }),
    );
  });
}
//@ chunk-0qyh5wah.js:24285-25321 placement
async function recordRefreshFailureStrike(e, r, n) {
  if (!isCurrentIdentityEpoch(n.identityEpoch)) return;
  if (n.grantLeg === undefined) return;
  let s = cacheMemoKey(e, r);
  let capturedDeleteGeneration = deleteGeneration(s);
  registerDiscoveryFlush();
  if (!isDiscoveryCacheEligible(r)) return;
  let a;
  try {
    a = await resolveDiscoveryCachePath(e, r);
  } catch {
    return;
  }
  if (a === undefined) return;
  if (a.legToken !== n.grantLeg) {
    logMCPDebug(
      e,
      "Discovery cache refresh-failure strike refused: grant changed since this refresh was fetched (stale grant)",
    );
    return;
  }
  let path = a.path;
  await serializeDiscoveryWrite(path, e, async () => {
    let existingEntry = await readExistingEntry(a, e);
    if (!existingEntry) return;
    if (!isCurrentIdentityEpoch(n.identityEpoch)) {
      logMCPDebug(
        e,
        "Discovery cache refresh-failure strike refused: identity changed since this refresh was fetched (stale epoch)",
      );
      return;
    }
    let h;
    try {
      h = await resolveDiscoveryCachePath(e, r);
    } catch {
      return;
    }
    if (h === undefined || h.path !== path || h.legToken !== n.grantLeg) {
      logMCPDebug(
        e,
        "Discovery cache refresh-failure strike refused: grant changed since this refresh was fetched (stale grant)",
      );
      return;
    }
    let v = {
      ...existingEntry,
      consecutiveRefreshFailures: existingEntry.consecutiveRefreshFailures + 1,
    };
    if (v.consecutiveRefreshFailures >= getMaxStrikes()) {
      bumpDeleteGeneration(s);
      await deleteDiscoveryEntry(path, getStorageV5());
      return;
    }
    await writeDiscoveryEntry({
      path,
      serverName: e,
      config: r,
      cacheKey: s,
      entry: v,
      context: n,
      capturedDeleteGeneration,
      label: "refresh-failure strike",
    });
  });
}
//@ chunk-0qyh5wah.js:25321-25517 placement
/**
 * 懒拨号失败后为该服务器在发现缓存中记一次刷新失败。
 */
function strikeAfterLazyDialFailure(e, config) {
  (async () => {
    let identityEpoch_2 = identityEpoch();
    await recordRefreshFailureStrike(e, config, {
      identityEpoch: identityEpoch_2,
      grantLeg: await cacheGrantLeg(e, config),
    });
  })().catch((error) =>
    logForDebugging(
      `discovery-cache: strike after failed lazy dial of "${e}" did not land: ${errorMessage(error)}`,
    ),
  );
}
//@ chunk-0qyh5wah.js:25517-25929 placement
/**
 * 扫描发现缓存目录，删除属于给定缓存键或无法读取/解析的条目。
 */
async function purgeEntriesByCacheKey(e, r) {
  for (let c of r) bumpDeleteGeneration(c);
  let n = new Set([...r].map(hashCacheKeyId));
  let s = await listDiscoveryCacheFiles(getStorageV5());
  for (let c of s) {
    if (!c.endsWith(".json")) continue;
    let a = join(discoveryCacheDir(), c);
    try {
      let y;
      try {
        y = await readDiscoveryEntryText(a, getStorageV5());
      } catch (error) {
        if (isRefusedEntryError(error)) {
          await deleteEntryAndBump(a, e, undefined);
          continue;
        }
        throw error;
      }
      if (y === undefined) continue;
      let l = headerDigest(y);
      if (l === undefined) {
        await deleteEntryAndBump(a, e, undefined);
        continue;
      }
      if (n.has(l)) await deleteEntryAndBump(a, e, undefined);
    } catch (error) {
      logMCPDebug(e, `discovery-cache: purge scan skipped ${error}`);
    }
  }
}
//@ chunk-0qyh5wah.js:25929-25982 placement
/**
 * 按缓存键删除该服务器的所有条目变体。
 */
async function purgeServerEntries(e, r) {
  await purgeEntriesByCacheKey(e, new Set([cacheMemoKey(e, r)]));
}
//@ chunk-0qyh5wah.js:25982-26286 placement
/**
 * 删除某服务器在发现缓存中的所有条目变体（无法取得指纹时退而扫描删除）。
 */
function purgeServerEntries_2(e, r, n) {
  let s = discoveryCacheDir();
  let c = false;
  return serializeDiscoveryWrite(s, e, async () => {
    let a;
    try {
      a = (await resolveDiscoveryCachePath(e, r))?.fingerprint;
    } catch {
      a = undefined;
    }
    if (a === undefined) {
      await purgeEntriesByCacheKey(e, n);
      c = true;
      return;
    }
    let y = [];
    for (let l of n) {
      let h = l;
      for (let v of PROTOCOL_ERAS)
        for (let w of [false, true]) {
          y.push(deleteEntryAndBump(join(s, discoveryCacheKey(l, a, v, w)), e, h));
          h = undefined;
        }
    }
    await Promise.all(y);
    c = true;
  }).then(() => c);
}
//@ chunk-0qyh5wah.js:26286-26640 placement
/**
 * 枚举服务器配置在各可变属性取值下的缓存键集合。
 */
function cacheKeyVariants(e, r) {
  let n = normalizeExclusionProps(r);
  let mapped = CACHE_EXCLUSION_PROPS.map(({ prop, normalize, valueDomain }) => {
    let v = new Set(valueDomain.map((S) => normalize(S)));
    let w = n[prop];
    if (w !== undefined) v.add(w);
    return {
      prop,
      states: [...v],
    };
  });
  let c = new Set();
  let a = (y, l) => {
    if (y === mapped.length) {
      c.add(serverCacheKey(e, l));
      return;
    }
    let { prop, states } = mapped[y];
    for (let state of states) {
      let S = {
        ...l,
      };
      if (state === undefined) delete S[prop];
      else S[prop] = state;
      a(y + 1, S);
    }
  };
  a(0, {
    ...n,
  });
  return c;
}
//@ chunk-0qyh5wah.js:26640-26685 placement
/**
 * 排序后拼接成字符串。
 */
function sortedJoin(e) {
  return [...e].sort().join(`
`);
}
//@ chunk-0qyh5wah.js:26685-27095 placement
async function deleteDiscoveryCache(e, r) {
  if (r.type !== "http" && r.type !== "sse") return;
  if (!isDiscoveryCacheUsable()) return;
  registerDiscoveryFlush();
  bumpDeleteGeneration(cacheMemoKey(e, r));
  try {
    let discoveryCachePath = await resolveDiscoveryCachePath(e, r);
    if (discoveryCachePath === undefined) {
      await purgeServerEntries(e, r);
      return;
    }
    let s = cacheMemoKey(e, r);
    let c = discoveryCacheDir();
    let a = new Set(
      PROTOCOL_ERAS.flatMap((l) =>
        [false, true].map((h) => join(c, discoveryCacheKey(s, discoveryCachePath.fingerprint, l, h))),
      ),
    );
    let y = [deleteEntryAndBump(discoveryCachePath.path, e, s)];
    for (let l of a) if (l !== discoveryCachePath.path) y.push(deleteEntryAndBump(l, e, undefined));
    await Promise.all(y);
    await purgeServerEntries(e, r);
  } catch (error) {
    logMCPDebug(e, `discovery-cache: delete failed: ${error}`);
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
      onCompromised: (s) =>
        logMCPDebug(serverName, `discovery-cache: refresh lock compromised, skipping refresh: ${s}`),
    });
  } catch (error) {
    let c = error instanceof Error ? error.message : String(error);
    if (error?.code === "ELOCKED" || c.includes("already being held")) {
      logMCPDebug(serverName, "discovery-cache: refresh lock held elsewhere, skipping");
      return;
    }
    logMCPDebug(serverName, `discovery-cache: lock error, proceeding: ${c}`);
    return async () => {};
  }
}
export {
  CACHE_VERSION_PREFIX,
  Pe,
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
