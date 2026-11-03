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
import { randomBytes, createCipheriv, createHash, createHash as createHash_2 } from "crypto";
import { join, basename } from "path";
import { readSecureStorageForMcp } from "./credentialStoreRead.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { env } from "../../utils/env.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, E, U, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { f1r, discoveryCacheOffReason, getDiscoveryCacheStore, fd, OFo, IM, I4s } from "./mcpAccountKey.js";
import { Ove } from "./envExpansion.js";
import { VISUALIZE, MEMORY, CLAUDE_ARTIFACTS, derivedServerId } from "./firstPartyServerIds.js";
import { isSettingsSourcedEnvValue } from "../../utils/managedEnvApply.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { isPluginServerConfig } from "./types.js";
import { ccrSessionIdFromMcpUrl, Tso, isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { sessionIdBody, isSelfAddressableSessionId } from "../../bridge/sessionIdCompat.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { iJ, X_MCP_SERVER_ORIGIN, X_CCR_OWNER_SLACK_USER_ID } from "./fileReference/fileReferencePolicy.js";
import { isKnownProxyEndpointUrl } from "../../tools/WebFetchTool/utils.js";
import { cyr } from "./remoteBrowserServer.js";
import { reservedMcpServerNames } from "./builtinServerNames.js";
import {
  identityChangedThisProcess,
  getMcpIdentitySnapshot,
  isCurrentIdentityEpoch,
  identityEpoch,
} from "./identityChange.js";
import { Zl, hasCliOwnedBearer } from "./cliOwnedClients.js";
import { isFirstPartyMcpUrl, configHasAuthorizationHeader, getServerKey } from "./auth.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { ir } from "./client.js";
import { currentEra, vt, Ny, openDiscoverySeal, xe } from "./discoveryIdentity.js";
import { DSn } from "./mcpClientCapabilities.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { ws } from "../../utils/fsFlags.js";
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
var DISCOVERY_CACHE_KEY_BYTES = 32,
  Z = 12,
  K = 16,
  V2 = "v2:",
  buffer = Buffer.from("mcp-dc", "utf8"),
  ct = /^[A-Za-z0-9+/]{43}=$/;
//@ chunk-0qyh5wah.js:3089-3207 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  if (typeof buffer !== "string" || !ct.test(buffer)) return;
  let buffer_2 = Buffer.from(buffer, "base64");
  return buffer_2.length === DISCOVERY_CACHE_KEY_BYTES ? buffer_2 : void 0;
}
//@ chunk-0qyh5wah.js:3207-3537 placement
async function getMcpDiscoveryCacheKey() {
  let e = await readSecureStorageForMcp();
  if (e === READ_FAILED) return;
  let r = encodeCacheKey(e?.mcpDiscoveryCacheKey);
  if (r) return r;
  let str = randomBytes(DISCOVERY_CACHE_KEY_BYTES).toString("base64"),
    s = !1;
  try {
    s = (
      await getSecureStorage().mutate((y) =>
        base64URLEncode(y.mcpDiscoveryCacheKey) ? y : { ...y, mcpDiscoveryCacheKey: str },
      )
    ).success;
  } catch {
    s = !1;
  }
  if (!s) return;
  let c = await readSecureStorageForMcp();
  if (c === READ_FAILED) return;
  return encodeCacheKey(c?.mcpDiscoveryCacheKey);
}
//@ chunk-0qyh5wah.js:3537-3565 placement
function encodeCacheKey(e) {
  return base64URLEncode(e);
}
//@ chunk-0qyh5wah.js:3565-3904 placement
function buildDiscoveryCacheAad(e, r, n) {
  if (!Number.isInteger(e) || e < 0 || e > 255)
    throw Error("discovery-cache seal: schema version must fit one byte");
  let mapped = [r, n].map((y) => Buffer.from(y, "utf8")),
    allocUnsafe = Buffer.allocUnsafe(buffer.length + 1 + mapped.reduce((y, l) => y + 4 + l.length, 0)),
    copy = buffer.copy(allocUnsafe, 0);
  copy = allocUnsafe.writeUInt8(e, copy);
  for (let y of mapped)
    ((copy = allocUnsafe.writeUInt32BE(y.length, copy)), (copy += y.copy(allocUnsafe, copy)));
  return allocUnsafe;
}
//@ chunk-0qyh5wah.js:3904-4136 placement
function sealDiscoveryCacheEntry(e, r) {
  let n = randomBytes(Z),
    s = createCipheriv("aes-256-gcm", e.key, n, { authTagLength: K });
  s.setAAD(e.aad);
  let buffer = Buffer.concat([s.update(r, "utf8"), s.final()]),
    authTag = s.getAuthTag();
  return V2 + hashCacheKeyId(e.cacheKey) + ":" + Buffer.concat([n, buffer, authTag]).toString("base64url");
}
//@ chunk-0qyh5wah.js:4136-4233 placement
function hashCacheKeyId(e) {
  return createHash_2("sha256")
    .update(e, "utf8")
    .digest()
    .subarray(0, CACHE_KEY_ID_BYTES)
    .toString("base64url");
}
//@ chunk-0qyh5wah.js:4233-4326 placement
var CACHE_KEY_ID_BYTES = 16,
  ceil = Math.ceil((CACHE_KEY_ID_BYTES * 4) / 3),
  regExp = new RegExp(`^[A-Za-z0-9_-]{${ceil}}$`),
  dt = /^[A-Za-z0-9_-]*$/;
//@ chunk-0qyh5wah.js:6392-6432 placement
var pe = 1,
  mt = 900,
  St = 14400,
  Et = 604800,
  wt = 1;
//@ chunk-0qyh5wah.js:6432-6501 placement
function Be() {
  let MCP_DISCOVERY_CACHE_STRIKES = env.MCP_DISCOVERY_CACHE_STRIKES;
  return MCP_DISCOVERY_CACHE_STRIKES && MCP_DISCOVERY_CACHE_STRIKES > 0 ? MCP_DISCOVERY_CACHE_STRIKES : wt;
}
/**
 * 发现缓存条目的 zod 结构：版本、服务器名、缓存键、保存时间、连续刷新失败次数、serverInfo、协商的协议代、capabilities 与 tools/prompts/resources/templates。
 */
//@ chunk-0qyh5wah.js:6501-6957 placement
var CACHE_FILE_MODE = 384,
  CACHE_DIR_MODE = 448,
  discoveryEntrySchema = DoctorLazy(() => {
    let discoveryWireSchemas = require("./chunk-asne9cp8.js").mcpClientModule().discoveryWireSchemas();
    return u({
      v: T(pe),
      serverName: o(),
      cacheKey: o(),
      savedAt: E(),
      toolsSavedAt: E().optional(),
      consecutiveRefreshFailures: E().int().nonnegative(),
      serverInfo: discoveryWireSchemas.implementation.optional(),
      negotiatedEra: U(f1r).optional(),
      capabilities: discoveryWireSchemas.serverCapabilities,
      tools: A(discoveryWireSchemas.tool),
      commands: A(discoveryWireSchemas.prompt),
      resources: A(discoveryWireSchemas.resource),
      templates: A(discoveryWireSchemas.resourceTemplate).optional(),
    });
  });
//@ chunk-0qyh5wah.js:6957-7046 placement
function Dt() {
  let MCP_DISCOVERY_CACHE_TTL_S = env.MCP_DISCOVERY_CACHE_TTL_S;
  return Math.min(
    (MCP_DISCOVERY_CACHE_TTL_S && MCP_DISCOVERY_CACHE_TTL_S > 0 ? MCP_DISCOVERY_CACHE_TTL_S : mt) * 1000,
    Ke(),
  );
}
//@ chunk-0qyh5wah.js:7046-7137 placement
function Ke() {
  let MCP_DISCOVERY_CACHE_MAX_STALE_S = env.MCP_DISCOVERY_CACHE_MAX_STALE_S;
  return (
    Math.min(
      MCP_DISCOVERY_CACHE_MAX_STALE_S && MCP_DISCOVERY_CACHE_MAX_STALE_S > 0
        ? MCP_DISCOVERY_CACHE_MAX_STALE_S
        : St,
      Et,
    ) * 1000
  );
}
//@ chunk-0qyh5wah.js:7137-7175 placement
function isDiscoveryCacheEligible(e) {
  return discoveryCacheExclusion(e) === void 0;
}
//@ chunk-0qyh5wah.js:7175-7224 placement
function kt(e) {
  return CACHE_EXCLUSION_PROPS.some((r) => r.reason === e);
}
//@ chunk-0qyh5wah.js:7224-7470 placement
var CACHE_EXCLUSION_PROPS = [
  {
    prop: "discoveryCache",
    reason: "opt-out",
    excludes: (e) => e === !1,
    normalize: (e) => (e === !1 ? !1 : void 0),
    valueDomain: [void 0, !1],
  },
  {
    prop: "headersHelper",
    reason: "headers-helper",
    excludes: (e) => Boolean(e),
    normalize: (e) => (e ? e : void 0),
    valueDomain: [void 0],
  },
];
//@ chunk-0qyh5wah.js:7470-7615 placement
function normalizeExclusionProps(e) {
  let r = { ...e };
  for (let { prop: prop, normalize: normalize } of CACHE_EXCLUSION_PROPS) {
    if (!(prop in r)) continue;
    let c = normalize(r[prop]);
    if (c === void 0) delete r[prop];
    else r[prop] = c;
  }
  return r;
}
//@ chunk-0qyh5wah.js:7615-7816 placement
function hasEnvReferenceInUrlOrHeaders(e) {
  let r = e;
  if (typeof r.url === "string" && Ove(r.url)) return !0;
  if (r.headers && typeof r.headers === "object") {
    for (let n of Object.values(r.headers)) if (typeof n === "string" && Ove(n)) return !0;
  }
  return !1;
}
//@ chunk-0qyh5wah.js:7816-7932 placement
var DISCOVERY_CACHE_ENV_OVERRIDES = [
    "MCP_DISCOVERY_CACHE_TTL_S",
    "MCP_DISCOVERY_CACHE_MAX_STALE_S",
    "MCP_DISCOVERY_CACHE_STRIKES",
  ],
  NON_CACHEABLE_SERVER_NAMES = [VISUALIZE, MEMORY, CLAUDE_ARTIFACTS];
//@ chunk-0qyh5wah.js:7932-7995 placement
function ze(e) {
  let r = process.env[e];
  return r !== void 0 && isSettingsSourcedEnvValue(e, r);
}
//@ chunk-0qyh5wah.js:7995-8077 placement
function Ue() {
  return mn() && env.MCP_DISCOVERY_CACHE === !0 && !ze("MCP_DISCOVERY_CACHE");
}
/**
 * 判断一个动态 http MCP 服务器是否可走发现缓存：必须是本会话自己的 CCR 会话 MCP 地址，带唯一且匹配的 x-mcp-server-id、来源为 directory/custom、非 Slack 归属，且不是已知代理端点或保留的内置服务器。
 */
//@ chunk-0qyh5wah.js:8077-8827 placement
function isCacheableCcrSessionServer(config) {
  if (
    !Ue() ||
    DISCOVERY_CACHE_ENV_OVERRIDES.some(ze) ||
    config.type !== "http" ||
    config.scope !== "dynamic" ||
    config.agentSource !== void 0 ||
    isPluginServerConfig(config)
  )
    return !1;
  let parsed = ccrSessionIdFromMcpUrl(config.url);
  if (parsed === null) return !1;
  let sessionBody = sessionIdBody(parsed.sessionSegment);
  if (
    !isSelfAddressableSessionId(parsed.sessionSegment) ||
    !startupCcrEnv.ownCcrSessionIds.some((ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === sessionBody)
  )
    return !1;
  let serverIdHeaders = iJ(config.headers, "x-mcp-server-id"),
    serverId = serverIdHeaders[0];
  if (
    serverIdHeaders.length !== 1 ||
    serverId === void 0 ||
    !Tso.test(serverId) ||
    parsed.toolboxMcpServerId !== serverId ||
    parsed.mcpServerId === serverId
  )
    return !1;
  let originHeaders = iJ(config.headers, X_MCP_SERVER_ORIGIN);
  if (originHeaders.length !== 1 || (originHeaders[0] !== "directory" && originHeaders[0] !== "custom"))
    return !1;
  if (
    iJ(config.headers, X_CCR_OWNER_SLACK_USER_ID).length > 0 ||
    !parsed.upstreamUrl ||
    /^ccr-owner-resolved:/i.test(parsed.upstreamUrl)
  )
    return !1;
  let y = [parsed.mcpServerId, serverId],
    l = [`cse_${sessionBody}`, `session_${sessionBody}`];
  return !(
    isKnownProxyEndpointUrl(config.url) ||
    y.some((h) => cyr.includes(h)) ||
    [...reservedMcpServerNames(), ...NON_CACHEABLE_SERVER_NAMES].some((h) =>
      l.some((v) => y.includes(derivedServerId(v, h))),
    )
  );
}
//@ chunk-0qyh5wah.js:8827-8865 placement
function cZe(e) {
  return isDiscoveryCacheEligible(e) && !isCacheableCcrSessionServer(e);
}
//@ chunk-0qyh5wah.js:8865-9284 placement
function discoveryCacheExclusion(e) {
  let r = discoveryCacheOffReason();
  if (r !== void 0) return r;
  if (identityChangedThisProcess()) return "identity-changed";
  if (e.type !== "http" && e.type !== "sse") return "transport";
  if (Zl(e) || hasCliOwnedBearer(e)) return "cli-owned";
  if (hasEnvReferenceInUrlOrHeaders(e)) return "env-placeholder";
  if (isFirstPartyMcpUrl(e.url) && !configHasAuthorizationHeader(e)) return "ambient-credential";
  if (isSameOriginAsCcr(e.url)) {
    if (!isCacheableCcrSessionServer(e)) return "ambient-credential";
  } else if (Ue()) return "ambient-credential";
  let n = e;
  for (let { prop: prop, reason: reason, excludes: excludes } of CACHE_EXCLUSION_PROPS)
    if (excludes(n[prop])) return reason;
  return;
}
//@ chunk-0qyh5wah.js:9284-9334 placement
function O() {
  return join(getClaudeConfigDir(), "mcp-discovery-cache");
}
//@ chunk-0qyh5wah.js:9334-9419 placement
async function At(e, r) {
  if (!isDiscoveryCacheEligible(r)) return !1;
  return (await refreshTokenFingerprint(e, r)).kind !== "degenerate";
}
//@ chunk-0qyh5wah.js:9419-9705 placement
async function refreshTokenFingerprint(e, r) {
  if (r.type !== "http" && r.type !== "sse") return { kind: "none" };
  let n = await readSecureStorageForMcp();
  if (n === READ_FAILED) return { kind: "degenerate" };
  let s = n?.mcpOAuth?.[getServerKey(e, r)];
  if (!s) return { kind: "none" };
  let refreshToken = s.refreshToken;
  if (!refreshToken) return { kind: "degenerate" };
  return { kind: "resolved", hash: computeContentHash(refreshToken).slice(0, 16) };
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
  let n = getMcpIdentitySnapshot();
  if (n.kind === "unwired" || n.kind === "incomplete") return;
  let s = await grantTokenFor(e, r);
  if (s === void 0) return;
  let c = [n.token];
  if (r.type === "http" || r.type === "sse") c.push(s);
  return { fingerprint: createHash("sha256").update(c.join("\x00")).digest("hex"), grantToken: s };
}
//@ chunk-0qyh5wah.js:10183-10848 placement
function discoveryCacheKey(e, r, n, s) {
  let joined = [
    e,
    r,
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
var Tt = /^[0-9a-f]{16}\0/;
/**
 * 清除某服务器在发现缓存路径记忆中的条目。
 */
//@ chunk-0qyh5wah.js:10873-11017 placement
function clearDiscoveryPathMemo(e) {
  let r = `${e}-`,
    filePathMemo = getDiscoveryCacheStore().filePathMemo;
  for (let s of filePathMemo.keys()) {
    if (!s.startsWith(r)) continue;
    if (Tt.test(s.slice(r.length))) filePathMemo.delete(s);
  }
}
//@ chunk-0qyh5wah.js:11017-11052 placement
function x(e, r) {
  return ir(e, normalizeExclusionProps(r));
}
//@ chunk-0qyh5wah.js:11052-11102 placement
async function It(e, r) {
  return (await resolveDiscoveryCachePath(e, r))?.path;
}
//@ chunk-0qyh5wah.js:11102-11190 placement
async function oq(e, r) {
  if (!fd()) return;
  try {
    return (await resolveDiscoveryCachePath(e, r))?.legToken;
  } catch {
    return;
  }
}
/**
 * 计算某服务器发现缓存文件的路径与密钥材料（缓存键、身份指纹、协议代、UI 开关、授权令牌、AAD），结果按组合键记忆，解析失败时移除记忆。
 */
//@ chunk-0qyh5wah.js:11190-11668 placement
async function resolveDiscoveryCachePath(e, r) {
  let n = x(e, r),
    s = currentEra(),
    c = DSn(),
    a = vt(),
    y = `${n}\x00${a}\x00era:${s}\x00ui:${c}`,
    filePathMemo = getDiscoveryCacheStore().filePathMemo,
    h = filePathMemo.get(y);
  if (h) return h;
  let v = (async () => {
    let S = await identityFingerprint(e, r);
    if (S === void 0) return;
    return {
      path: join(O(), discoveryCacheKey(n, S.fingerprint, s, c)),
      grantToken: S.grantToken,
      fingerprint: S.fingerprint,
      cacheKey: n,
      aad: buildDiscoveryCacheAad(pe, n, S.fingerprint),
      legToken: `${S.grantToken}\x00era:${s}\x00${a}`,
    };
  })();
  filePathMemo.set(y, v);
  let w = () => {
    if (filePathMemo.get(y) === v) filePathMemo.delete(y);
  };
  return (
    v.then((S) => {
      if (S === void 0) w();
    }, w),
    v
  );
}
//@ chunk-0qyh5wah.js:11668-11701 placement
function L() {
  return getDiscoveryCacheStore().storage;
}
//@ chunk-0qyh5wah.js:11701-11736 placement
function R() {
  return getDiscoveryCacheStore().storageV5;
}
//@ chunk-0qyh5wah.js:11736-11806 placement
function he(e) {
  return STORAGE_SPACES.userConfigDir("mcp-discovery-cache", [basename(e)]);
}
//@ chunk-0qyh5wah.js:11806-11877 placement
var Ot = { namespace: "userConfigDir", dir: "mcp-discovery-cache" },
  F = 8388608;
//@ chunk-0qyh5wah.js:11877-11937 placement
function ge(e) {
  return Math.max(e.savedAt, e.toolsSavedAt ?? 0);
}
//@ chunk-0qyh5wah.js:11937-12075 placement
class RefusedDiscoveryEntryError extends Error {
  entryPath;
  reason;
  constructor(e, r, n) {
    super(n);
    this.entryPath = e;
    this.reason = r;
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
function oe(e) {
  return e instanceof RefusedDiscoveryEntryError;
}
/**
 * 读取发现缓存条目文本：拒绝符号链接、非普通文件与超大文件，不存在时返回 undefined。
 */
//@ chunk-0qyh5wah.js:12524-12964 placement
async function readDiscoveryEntryText(e, r) {
  let readGateForTest = getDiscoveryCacheStore().readGateForTest;
  if (readGateForTest) await readGateForTest;
  if (r) return readDiscoveryEntryFromStorage(r, e);
  try {
    if (ws === 0) {
      let stats = await L().lstat(e);
      if (stats === void 0) return;
      if (stats.isSymbolicLink) throw new SymlinkedDiscoveryEntryError(e);
      if (!stats.isFile) throw new NonRegularDiscoveryEntryError(e);
    }
    let s;
    try {
      s = await L().readTail(e, F + 1, { noFollow: !0 });
    } catch (error) {
      let a = getErrnoCode(error);
      if (a === "ELOOP") throw new SymlinkedDiscoveryEntryError(e);
      if (a === "ENXIO") throw new NonRegularDiscoveryEntryError(e);
      throw error;
    }
    if (s.length > F) throw new OversizeDiscoveryEntryError(e);
    return s.toString("utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
}
/**
 * 从存储 V5 读取发现缓存条目（拒绝符号链接、非普通文件与超大条目）。
 */
//@ chunk-0qyh5wah.js:12964-13366 placement
async function readDiscoveryEntryFromStorage(e, r) {
  let n = he(r),
    read = await e.read([{ key: n, offset: 0, length: F + 1 }], { symlinks: "refuse" });
  if (!read.ok) {
    let a = "cause" in read.error ? getErrnoCode(read.error.cause) : void 0;
    if (a === "ELOOP") throw new SymlinkedDiscoveryEntryError(r);
    if (a === "ENXIO") throw new NonRegularDiscoveryEntryError(r);
    throw Error("discovery-cache: read failed", { cause: read.error });
  }
  let c = read.value.items[0];
  if (!c.found) return;
  if (c.totalBytes > F) throw new OversizeDiscoveryEntryError(r);
  return Buffer.from(c.value).toString("utf8");
}
//@ chunk-0qyh5wah.js:13366-13563 placement
async function writeDiscoveryEntryText(e, r, n) {
  if (n) {
    let write = await n.write(he(e), r);
    if (!write.ok) throw Error("discovery-cache: write failed", { cause: write.error });
    return;
  }
  let s = L();
  (await s.mkdir(O(), CACHE_DIR_MODE), await s.atomicWrite(e, r, CACHE_FILE_MODE));
}
/**
 * 列出发现缓存目录中的文件名（本地文件系统或存储 V5 分页列出）。
 */
//@ chunk-0qyh5wah.js:13563-13975 placement
async function listDiscoveryCacheFiles(e) {
  if (!e) return L().list(O());
  let r = [],
    n;
  do {
    let listEntries = await e.listEntries(Ot, {
      skipKeyStats: !0,
      skipScopeStats: !0,
      ...(n !== void 0 && { cursor: n }),
    });
    if (!listEntries.ok) throw Error("discovery-cache: list failed", { cause: listEntries.error });
    for (let item of listEntries.value.items)
      if (item.kind === "key" && item.key.namespace === "userConfigDir") {
        let a = item.key.relPath[0];
        if (a !== void 0 && item.key.relPath.length === 1) r.push(a);
      }
    n = listEntries.value.cursor;
  } while (n);
  return r;
}
//@ chunk-0qyh5wah.js:13975-14160 placement
async function deleteDiscoveryEntry(e, r) {
  if (r) {
    let n = await r.delete(he(e));
    if (!n.ok) throw Error("discovery-cache: delete failed", { cause: n.error });
    return;
  }
  try {
    await L().delete(e);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
/**
 * 读取 MCP 服务器发现缓存（加密存储的 initialize/tools 列表结果）：校验身份代际、授权指纹与过期，命中则省去握手；异常时清掉该服务器的缓存族。
 */
//@ chunk-0qyh5wah.js:14160-15931 placement
async function readDiscoveryCache(e, r, n = Date.now()) {
  let s = discoveryCacheExclusion(r);
  if (s !== void 0 && !kt(s)) return { kind: "miss", reason: s === "transport" ? "transport" : "disabled" };
  if (s !== void 0) {
    registerDiscoveryFlush();
    let D = cacheKeyVariants(e, r),
      M = Yt(D),
      admissionPurgedKeySets = getDiscoveryCacheStore().admissionPurgedKeySets;
    if (!admissionPurgedKeySets.has(M))
      (admissionPurgedKeySets.add(M),
        purgeServerEntries(e, r, D).then((Ne) => {
          if (!Ne) admissionPurgedKeySets.delete(M);
        }));
    return (
      logMCPDebug(e, `discovery-cache: ${s} \u2014 purging this server's cache-key family, serving miss`),
      { kind: "miss", reason: "disabled" }
    );
  }
  let c;
  try {
    c = await resolveDiscoveryCachePath(e, r);
  } catch (error) {
    return (
      logMCPDebug(e, `discovery-cache: fingerprint failed: ${error}`),
      { kind: "miss", reason: "no-fingerprint" }
    );
  }
  if (c === void 0) return { kind: "miss", reason: "no-fingerprint" };
  let path = c.path,
    y = () => {
      P(path, e, void 0).catch(() => {});
    },
    l = () => (
      y(),
      logFeatureBad("mcp_discovery_cache", "corrupt_entry"),
      { kind: "miss", reason: "corrupt" }
    ),
    h;
  try {
    h = await readDiscoveryEntryText(path, R());
  } catch (error) {
    if (oe(error)) return (logMCPDebug(e, `discovery-cache: ${error.reason} entry, deleting`), l());
    return (logMCPDebug(e, `discovery-cache: read failed: ${error}`), { kind: "miss", reason: "absent" });
  }
  if (h === void 0) return { kind: "miss", reason: "absent" };
  let v = await openSealedEntry(h, c, e, () => P(path, e, void 0));
  if (v.miss) {
    if (v.miss === "unsealed")
      if (v.cause === "v1") logFeatureSad("mcp_discovery_cache", "unsealed_v1");
      else logFeatureBad("mcp_discovery_cache", `unsealed_${v.cause}`);
    return { kind: "miss", reason: v.miss };
  }
  let safeParse = discoveryEntrySchema().safeParse(safeParseJSON(v.plaintext, !1));
  if (!safeParse.success) return (logMCPDebug(e, "discovery-cache: corrupt entry, deleting"), l());
  let S = safeParse.data;
  if (S.cacheKey !== x(e, r))
    return (logMCPDebug(e, "discovery-cache: entry keyed for another server, deleting"), l());
  if (S.consecutiveRefreshFailures >= Be()) return (y(), { kind: "miss", reason: "strike-threshold" });
  let _ = Ke();
  if (ge(S) - n > _) return (y(), { kind: "miss", reason: "expired" });
  let max = Math.max(0, n - S.savedAt);
  if (max >= _) return (y(), { kind: "miss", reason: "expired" });
  if (max < Dt() && !(S.capabilities.tools && S.tools.length === 0))
    return { kind: "fresh", entry: S, ageMs: max };
  return { kind: "stale", entry: S, ageMs: max };
}
//@ chunk-0qyh5wah.js:15931-16042 placement
function serializeDiscoveryWrite(e, r, n) {
  return getDiscoveryCacheStore()
    .serializeWrite(e, n)
    .catch((s) => {
      logMCPDebug(r, `discovery-cache: write op failed: ${s}`);
    });
}
//@ chunk-0qyh5wah.js:16042-16105 placement
function q(e) {
  return getDiscoveryCacheStore().deleteGenerationByCacheKey.get(e) ?? 0;
}
//@ chunk-0qyh5wah.js:16105-16166 placement
function ae(e) {
  getDiscoveryCacheStore().deleteGenerationByCacheKey.set(e, q(e) + 1);
}
//@ chunk-0qyh5wah.js:16166-16175 placement
var Xe = 8;
/**
 * 收集某 MCP 服务器的 OAuth 秘密（访问令牌、刷新令牌、客户端密钥），用于确认缓存内容不含秘密。
 */
//@ chunk-0qyh5wah.js:16175-16586 placement
async function oauthSecretsFor(e, r) {
  if (r.type !== "http" && r.type !== "sse") return [];
  let n = await readSecureStorageForMcp();
  if (n === READ_FAILED) return READ_FAILED;
  let s = getServerKey(e, r),
    c = n?.mcpOAuth?.[s],
    a = [];
  if (typeof c?.accessToken === "string") a.push(c.accessToken);
  if (typeof c?.refreshToken === "string") a.push(c.refreshToken);
  if (typeof c?.clientSecret === "string") a.push(c.clientSecret);
  let y = n?.mcpOAuthClientConfig?.[s]?.clientSecret;
  if (typeof y === "string") a.push(y);
  return a;
}
//@ chunk-0qyh5wah.js:16586-16708 placement
var SECRET_KEY_REGEX = /auth|token|key|secret|cookie|session|sig|pass|cred|bearer/i,
  AUTH_SCHEME_PREFIX_REGEX = /^\s*[A-Za-z][A-Za-z0-9!#$%&'*+.^_`|~-]*\s+(?=\S)/;
//@ chunk-0qyh5wah.js:16708-16915 placement
function forEachSecretValue(e, r, n) {
  if (typeof r !== "string" || !SECRET_KEY_REGEX.test(e)) return;
  if ((n(r.trim()), n(r.replace(AUTH_SCHEME_PREFIX_REGEX, "").trim()), /^cookie$/i.test(e)))
    for (let s of r.split(";")) {
      let index = s.indexOf("=");
      n((index === -1 ? s : s.slice(index + 1)).trim());
    }
}
/**
 * 记录连接时额外呈现的请求头中的秘密片段，供发现缓存检查。
 */
//@ chunk-0qyh5wah.js:16915-17164 placement
function recordPresentedHeaderSecrets(e, r) {
  let n = Ny();
  if (n.recordingOff()) return;
  let s = new Map();
  for (let [c, a] of Object.entries(e ?? {})) s.set(c.toLowerCase(), a);
  for (let [c, a] of Object.entries(r)) {
    if (s.get(c.toLowerCase()) === a) continue;
    forEachSecretValue(c, a, (y) => {
      if (y.length >= Xe) n.record(y);
    });
  }
}
//@ chunk-0qyh5wah.js:17164-17181 placement
var Kt = 268435456;
//@ chunk-0qyh5wah.js:17181-17312 placement
function secretEncodings(e) {
  let r = [e],
    sliced = jsonStringifyRaw(e).slice(1, -1);
  if (sliced !== e) r.push(sliced);
  try {
    let s = encodeURIComponent(e);
    if (s !== e) r.push(s);
  } catch {}
  return r;
}
/**
 * 写入发现缓存前检查条目是否带有密钥材料：收集配置头、URL 查询参数与用户信息、OAuth 令牌、本进程出示过的凭据，按原文/JSON 转义/URL 编码比对；日志不完整或扫描预算超出也拒绝。
 */
//@ chunk-0qyh5wah.js:17312-18047 placement
function findSecretMaterial(serialized, config, extraSecrets = []) {
  let cfg = config,
    secrets = new Set(),
    addSecret = (l) => {
      if (l !== void 0 && l.length >= Xe) secrets.add(l);
    };
  for (let [l, h] of Object.entries(cfg.headers ?? {})) forEachSecretValue(l, h, addSecret);
  try {
    let l = typeof cfg.url === "string" ? new URL(cfg.url) : void 0;
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
  for (let l of extraSecrets) addSecret(l);
  let snapshot = Ny().snapshot();
  if (!snapshot.complete) return "presented-log-incomplete";
  for (let atom of snapshot.atoms) addSecret(atom);
  if (secrets.size * serialized.length > Kt) return "scan-budget";
  for (let l of secrets) for (let h of secretEncodings(l)) if (serialized.includes(h)) return "material";
  return;
}
//@ chunk-0qyh5wah.js:18047-18108 placement
function me(e, r) {
  return { key: e, cacheKey: r.cacheKey, aad: r.aad };
}
/**
 * 解封发现缓存条目：密钥不可用时关闭缓存，解封失败时删除该条目并返回未命中原因。
 */
//@ chunk-0qyh5wah.js:18108-18570 placement
async function openSealedEntry(e, r, n, s) {
  let c = await getMcpDiscoveryCacheKey();
  if (c === void 0)
    return (
      logMCPDebug(
        n,
        "Discovery cache: sealing key unavailable (secure storage unreadable) \u2014 cache off for this process",
      ),
      OFo(),
      { miss: "key-unavailable" }
    );
  let a = openDiscoverySeal(me(c, r), e);
  if (a.ok) return { plaintext: a.plaintext };
  logMCPDebug(n, `Discovery cache: entry did not open (${a.reason}) \u2014 discarded`);
  try {
    await s();
  } catch (error) {
    logMCPDebug(n, `discovery-cache: reap after failed open skipped ${error}`);
  }
  return { miss: "unsealed", cause: a.reason };
}
//@ chunk-0qyh5wah.js:18570-18734 placement
function logDiscoveryWriteVerdict({ verdict: verdict, code: code }) {
  if (verdict === "written") logFeatureOk("mcp_discovery_cache");
  else if (verdict === "terminal") logFeatureBad("mcp_discovery_cache", code);
  else logFeatureSad("mcp_discovery_cache", code);
  return verdict;
}
/**
 * 写一条发现缓存（加密）：依次检查缓存未被关闭、未被删除、身份纪元与授权未变、密钥可用、条目符合结构且不超限、不含密钥材料，然后加密写盘；返回 written/transient/terminal/superseded 判定。
 */
//@ chunk-0qyh5wah.js:18734-21576 placement
async function writeDiscoveryEntry(e) {
  let {
    path: entryPath,
    serverName: serverName,
    config: config,
    cacheKey: cacheKey,
    entry: entry,
    context: entry_2,
    label: label,
  } = e;
  if (discoveryCacheOffReason() !== void 0)
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: the cache turned off since this round started`,
      ),
      { verdict: "superseded", code: "disabled" }
    );
  if (q(cacheKey) !== e.capturedDeleteGeneration)
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: entry deleted since this round started (tombstone)`,
      ),
      { verdict: "superseded", code: "tombstone" }
    );
  if (!isCurrentIdentityEpoch(entry_2.identityEpoch))
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: identity changed since this round was fetched (stale epoch)`,
      ),
      { verdict: "superseded", code: "stale_epoch" }
    );
  let sealKey = await getMcpDiscoveryCacheKey();
  if (sealKey === void 0)
    return (
      OFo(),
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: sealing key unavailable (secure storage unreadable) \u2014 cache off for this process`,
      ),
      { verdict: "superseded", code: "key_unavailable" }
    );
  let oauthSecrets;
  try {
    oauthSecrets = await oauthSecretsFor(serverName, config);
  } catch {
    oauthSecrets = READ_FAILED;
  }
  if (oauthSecrets === READ_FAILED)
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: OAuth token store unreadable (cannot verify no secrets on disk)`,
      ),
      { verdict: "transient", code: "transient" }
    );
  let pathInfo;
  try {
    pathInfo = await resolveDiscoveryCachePath(serverName, config);
  } catch {
    return { verdict: "transient", code: "transient" };
  }
  if (pathInfo === void 0 || pathInfo.path !== entryPath || pathInfo.legToken !== entry_2.grantLeg)
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: grant or era changed since this round was fetched (stale leg)`,
      ),
      { verdict: "superseded", code: "stale_grant" }
    );
  let safeParse = discoveryEntrySchema().safeParse(entry);
  if (!safeParse.success)
    return (
      logMCPDebug(serverName, `Discovery cache ${label} refused: entry failed schema validation`),
      { verdict: "terminal", code: "schema" }
    );
  let serialized = jsonStringifyRaw(safeParse.data);
  if (Buffer.byteLength(serialized, "utf8") > F)
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: serialized entry exceeds DISCOVERY_ENTRY_MAX_BYTES`,
      ),
      { verdict: "terminal", code: "oversize" }
    );
  if (discoveryCacheOffReason() !== void 0)
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: the cache turned off since this round started`,
      ),
      { verdict: "superseded", code: "disabled" }
    );
  let secretProblem = findSecretMaterial(serialized, config, oauthSecrets);
  if (secretProblem !== void 0) {
    if (Ny().takeOverflowNotice())
      logMCPDebug(
        serverName,
        "Discovery cache: presented-credential log is full \u2014 cache writes are refused for the rest of this process",
      );
    if (secretProblem === "scan-budget")
      return (
        logMCPDebug(
          serverName,
          `Discovery cache ${label} refused: secret-material scan exceeds its work budget (materials \xD7 entry size) \u2014 not scanned, not written`,
        ),
        { verdict: "terminal", code: "scan_budget" }
      );
    if (secretProblem === "presented-log-incomplete")
      return (
        logMCPDebug(
          serverName,
          `Discovery cache ${label} refused: presented-credential log incomplete (cannot verify no secrets on disk)`,
        ),
        { verdict: "terminal", code: "presented_log_incomplete" }
      );
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: entry would carry presented secret material`,
      ),
      { verdict: "terminal", code: "secret_material" }
    );
  }
  let sealed = sealDiscoveryCacheEntry(me(sealKey, pathInfo), serialized);
  if (Buffer.byteLength(sealed, "utf8") > F)
    return (
      logMCPDebug(
        serverName,
        `Discovery cache ${label} refused: sealed entry exceeds DISCOVERY_ENTRY_MAX_BYTES`,
      ),
      { verdict: "terminal", code: "oversize" }
    );
  try {
    await writeDiscoveryEntryText(entryPath, sealed, R());
  } catch (error) {
    return (
      logMCPDebug(serverName, `Discovery cache ${label} refused: disk write failed (${errorMessage(error)})`),
      { verdict: "transient", code: "transient" }
    );
  }
  return { verdict: "written", code: "written" };
}
//@ chunk-0qyh5wah.js:21576-21646 placement
async function P(e, r, n) {
  if (n !== void 0) ae(n);
  await serializeDiscoveryWrite(e, r, () => deleteDiscoveryEntry(e, R()));
}
//@ chunk-0qyh5wah.js:21646-21736 placement = withTimeout (0.805)
async function withTimeout(e, r) {
  await Promise.race([
    e.then(
      () => {},
      () => {},
    ),
    sleep(r, void 0, { unref: !0 }),
  ]);
}
//@ chunk-0qyh5wah.js:21736-21782 placement
async function flushDiscoveryCache(e, r = 1500) {
  (registerDiscoveryFlush(), await withTimeout(e, r));
}
//@ chunk-0qyh5wah.js:21782-21883 placement
function registerDiscoveryFlush() {
  if (!IM()) return;
  let e = getDiscoveryCacheStore();
  if (e.flushCleanup) return;
  e.flushCleanup = registerCleanup(() => e.drain(I4s));
}
//@ chunk-0qyh5wah.js:21883-23223 placement
async function writeDiscoveryCache(e, r, n, s) {
  let c = s.now ?? Date.now(),
    a = x(e, r),
    y = q(a);
  if (!isCurrentIdentityEpoch(s.identityEpoch)) return "superseded";
  if (s.grantLeg === void 0) return "superseded";
  if (!isDiscoveryCacheEligible(r)) return "superseded";
  registerDiscoveryFlush();
  let l;
  try {
    l = await resolveDiscoveryCachePath(e, r);
  } catch {
    return logDiscoveryWriteVerdict({ verdict: "transient", code: "transient" });
  }
  if (l === void 0) return "superseded";
  if (l.legToken !== s.grantLeg)
    return (
      logMCPDebug(
        e,
        "Discovery cache write refused: grant changed since this round was fetched (stale grant)",
      ),
      logDiscoveryWriteVerdict({ verdict: "superseded", code: "stale_grant" })
    );
  let path = l.path,
    v = {
      v: pe,
      serverName: e,
      cacheKey: a,
      savedAt: c,
      consecutiveRefreshFailures: 0,
      ...(n.serverInfo && { serverInfo: n.serverInfo }),
      ...(n.negotiatedEra !== void 0 && { negotiatedEra: n.negotiatedEra }),
      capabilities: n.capabilities,
      tools: n.tools,
      commands: n.commands,
      resources: n.resources,
      templates: n.templates,
    },
    w = path,
    S;
  return (
    await serializeDiscoveryWrite(w, e, async () => {
      if (!(await At(e, r))) return;
      let _;
      try {
        _ = await readDiscoveryEntryText(w, R());
      } catch (error) {
        if (!oe(error)) {
          (logMCPDebug(
            e,
            `Discovery cache write deferred: existing entry unreadable (${errorMessage(error)})`,
          ),
            (S = { verdict: "transient", code: "transient" }));
          return;
        }
        _ = void 0;
      }
      if (_ !== void 0) {
        let C = await getMcpDiscoveryCacheKey(),
          D = C && l ? openDiscoverySeal(me(C, l), _) : void 0,
          M = D?.ok ? discoveryEntrySchema().safeParse(safeParseJSON(D.plaintext, !1)) : void 0;
        if (M?.success && ge(M.data) > c) {
          S = { verdict: "superseded", code: "fresher_on_disk" };
          return;
        }
      }
      S = await writeDiscoveryEntry({
        path: w,
        serverName: e,
        config: r,
        cacheKey: a,
        entry: v,
        context: s,
        capturedDeleteGeneration: y,
        label: "write",
      });
    }),
    S ? logDiscoveryWriteVerdict(S) : "superseded"
  );
}
//@ chunk-0qyh5wah.js:23223-23497 placement
async function readExistingEntry(e, r) {
  let path = e.path,
    s;
  try {
    s = await readDiscoveryEntryText(path, R());
  } catch (error) {
    if (oe(error)) {
      await deleteDiscoveryEntry(path, R());
      return;
    }
    throw error;
  }
  if (s === void 0) return;
  let c = await openSealedEntry(s, e, r, () => deleteDiscoveryEntry(path, R()));
  if (c.miss) return;
  let safeParse = discoveryEntrySchema().safeParse(safeParseJSON(c.plaintext, !1));
  if (!safeParse.success) {
    await deleteDiscoveryEntry(path, R());
    return;
  }
  return safeParse.data;
}
//@ chunk-0qyh5wah.js:23497-24285 placement
async function mergeDiscoveryTools(e, r, n, s) {
  if (!isCurrentIdentityEpoch(s.identityEpoch)) return;
  if (s.grantLeg === void 0) return;
  let c = x(e, r),
    a = q(c);
  if ((registerDiscoveryFlush(), !isDiscoveryCacheEligible(r))) return;
  let y;
  try {
    y = await resolveDiscoveryCachePath(e, r);
  } catch {
    logDiscoveryWriteVerdict({ verdict: "transient", code: "transient" });
    return;
  }
  if (y === void 0) return;
  if (y.legToken !== s.grantLeg) {
    (logMCPDebug(
      e,
      "Discovery cache tools merge refused: grant changed since this refresh was fetched (stale grant)",
    ),
      logDiscoveryWriteVerdict({ verdict: "superseded", code: "stale_grant" }));
    return;
  }
  let path = y.path;
  await serializeDiscoveryWrite(path, e, async () => {
    let h = await readExistingEntry(y, e);
    if (!h) return;
    if (ge(h) > s.fetchedAt) {
      logDiscoveryWriteVerdict({ verdict: "superseded", code: "fresher_on_disk" });
      return;
    }
    let v = {
      ...h,
      tools: n,
      ...(Number.isFinite(s.fetchedAt) && s.fetchedAt > h.savedAt && { toolsSavedAt: s.fetchedAt }),
    };
    logDiscoveryWriteVerdict(
      await writeDiscoveryEntry({
        path: path,
        serverName: e,
        config: r,
        cacheKey: c,
        entry: v,
        context: s,
        capturedDeleteGeneration: a,
        label: "tools merge",
      }),
    );
  });
}
//@ chunk-0qyh5wah.js:24285-25321 placement
async function recordRefreshFailureStrike(e, r, n) {
  if (!isCurrentIdentityEpoch(n.identityEpoch)) return;
  if (n.grantLeg === void 0) return;
  let s = x(e, r),
    c = q(s);
  if ((registerDiscoveryFlush(), !isDiscoveryCacheEligible(r))) return;
  let a;
  try {
    a = await resolveDiscoveryCachePath(e, r);
  } catch {
    return;
  }
  if (a === void 0) return;
  if (a.legToken !== n.grantLeg) {
    logMCPDebug(
      e,
      "Discovery cache refresh-failure strike refused: grant changed since this refresh was fetched (stale grant)",
    );
    return;
  }
  let path = a.path;
  await serializeDiscoveryWrite(path, e, async () => {
    let l = await readExistingEntry(a, e);
    if (!l) return;
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
    if (h === void 0 || h.path !== path || h.legToken !== n.grantLeg) {
      logMCPDebug(
        e,
        "Discovery cache refresh-failure strike refused: grant changed since this refresh was fetched (stale grant)",
      );
      return;
    }
    let v = { ...l, consecutiveRefreshFailures: l.consecutiveRefreshFailures + 1 };
    if (v.consecutiveRefreshFailures >= Be()) {
      (ae(s), await deleteDiscoveryEntry(path, R()));
      return;
    }
    await writeDiscoveryEntry({
      path: path,
      serverName: e,
      config: r,
      cacheKey: s,
      entry: v,
      context: n,
      capturedDeleteGeneration: c,
      label: "refresh-failure strike",
    });
  });
}
/**
 * 懒拨号失败后为该服务器在发现缓存中记一次刷新失败。
 */
//@ chunk-0qyh5wah.js:25321-25517 placement
function strikeAfterLazyDialFailure(e, r) {
  (async () => {
    let n = identityEpoch();
    await recordRefreshFailureStrike(e, r, { identityEpoch: n, grantLeg: await oq(e, r) });
  })().catch((n) =>
    logForDebugging(
      `discovery-cache: strike after failed lazy dial of "${e}" did not land: ${errorMessage(n)}`,
    ),
  );
}
/**
 * 扫描发现缓存目录，删除属于给定缓存键或无法读取/解析的条目。
 */
//@ chunk-0qyh5wah.js:25517-25929 placement
async function purgeEntriesByCacheKey(e, r) {
  for (let c of r) ae(c);
  let n = new Set([...r].map(hashCacheKeyId)),
    s = await listDiscoveryCacheFiles(R());
  for (let c of s) {
    if (!c.endsWith(".json")) continue;
    let a = join(O(), c);
    try {
      let y;
      try {
        y = await readDiscoveryEntryText(a, R());
      } catch (error) {
        if (oe(error)) {
          await P(a, e, void 0);
          continue;
        }
        throw error;
      }
      if (y === void 0) continue;
      let l = xe(y);
      if (l === void 0) {
        await P(a, e, void 0);
        continue;
      }
      if (n.has(l)) await P(a, e, void 0);
    } catch (error) {
      logMCPDebug(e, `discovery-cache: purge scan skipped ${error}`);
    }
  }
}
//@ chunk-0qyh5wah.js:25929-25982 placement
async function Le(e, r) {
  await purgeEntriesByCacheKey(e, new Set([x(e, r)]));
}
/**
 * 删除某服务器在发现缓存中的所有条目变体（无法取得指纹时退而扫描删除）。
 */
//@ chunk-0qyh5wah.js:25982-26286 placement
function purgeServerEntries(e, r, n) {
  let s = O(),
    c = !1;
  return serializeDiscoveryWrite(s, e, async () => {
    let a;
    try {
      a = (await resolveDiscoveryCachePath(e, r))?.fingerprint;
    } catch {
      a = void 0;
    }
    if (a === void 0) {
      (await purgeEntriesByCacheKey(e, n), (c = !0));
      return;
    }
    let y = [];
    for (let l of n) {
      let h = l;
      for (let v of f1r)
        for (let w of [!1, !0]) (y.push(P(join(s, discoveryCacheKey(l, a, v, w)), e, h)), (h = void 0));
    }
    (await Promise.all(y), (c = !0));
  }).then(() => c);
}
/**
 * 枚举服务器配置在各可变属性取值下的缓存键集合。
 */
//@ chunk-0qyh5wah.js:26286-26640 placement
function cacheKeyVariants(e, r) {
  let n = normalizeExclusionProps(r),
    mapped = CACHE_EXCLUSION_PROPS.map(({ prop: prop, normalize: normalize, valueDomain: valueDomain }) => {
      let v = new Set(valueDomain.map((S) => normalize(S))),
        w = n[prop];
      if (w !== void 0) v.add(w);
      return { prop: prop, states: [...v] };
    }),
    c = new Set(),
    a = (y, l) => {
      if (y === mapped.length) {
        c.add(ir(e, l));
        return;
      }
      let { prop: prop, states: states } = mapped[y];
      for (let w of states) {
        let S = { ...l };
        if (w === void 0) delete S[prop];
        else S[prop] = w;
        a(y + 1, S);
      }
    };
  return (a(0, { ...n }), c);
}
//@ chunk-0qyh5wah.js:26640-26685 placement
function Yt(e) {
  return [...e].sort().join(`
`);
}
//@ chunk-0qyh5wah.js:26685-27095 placement
async function deleteDiscoveryCache(e, r) {
  if (r.type !== "http" && r.type !== "sse") return;
  if (!IM()) return;
  (registerDiscoveryFlush(), ae(x(e, r)));
  try {
    let n = await resolveDiscoveryCachePath(e, r);
    if (n === void 0) {
      await Le(e, r);
      return;
    }
    let s = x(e, r),
      c = O(),
      a = new Set(
        f1r.flatMap((l) => [!1, !0].map((h) => join(c, discoveryCacheKey(s, n.fingerprint, l, h)))),
      ),
      y = [P(n.path, e, s)];
    for (let l of a) if (l !== n.path) y.push(P(l, e, void 0));
    (await Promise.all(y), await Le(e, r));
  } catch (error) {
    logMCPDebug(e, `discovery-cache: delete failed: ${error}`);
  }
}
/**
 * 获取发现缓存刷新锁：已被其他进程持有时返回 undefined（跳过刷新），出错时返回空释放函数继续执行。
 */
//@ chunk-0qyh5wah.js:27095-27635 placement
async function acquireDiscoveryRefreshLock(serverName, config) {
  let lockPath;
  try {
    lockPath = await It(serverName, config);
  } catch {
    return async () => {};
  }
  if (lockPath === void 0) return async () => {};
  try {
    return (
      await L().mkdir(O(), CACHE_DIR_MODE),
      await lock(lockPath, {
        realpath: !1,
        retries: 0,
        stale: 60000,
        onCompromised: (s) =>
          logMCPDebug(serverName, `discovery-cache: refresh lock compromised, skipping refresh: ${s}`),
      })
    );
  } catch (error) {
    let c = error instanceof Error ? error.message : String(error);
    if (error?.code === "ELOCKED" || c.includes("already being held")) {
      logMCPDebug(serverName, "discovery-cache: refresh lock held elsewhere, skipping");
      return;
    }
    return (logMCPDebug(serverName, `discovery-cache: lock error, proceeding: ${c}`), async () => {});
  }
}

export {
  V2,
  ceil,
  regExp,
  dt,
  hashCacheKeyId,
  Z,
  K,
  recordPresentedHeaderSecrets,
  flushDiscoveryCache,
  deleteDiscoveryCache,
  clearDiscoveryPathMemo,
  writeDiscoveryCache,
  mergeDiscoveryTools,
  isDiscoveryCacheEligible,
  cZe,
  oq,
  readDiscoveryCache,
  recordRefreshFailureStrike,
  acquireDiscoveryRefreshLock,
  strikeAfterLazyDialFailure,
};
