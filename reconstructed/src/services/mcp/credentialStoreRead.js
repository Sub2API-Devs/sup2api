/**
 * services/mcp/credentialStoreRead.ts
 *
 * 2.1.316 新增：MCP 凭据存储读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cyj440je.js (6)
 * attribution: placement 6
 */
import { getSecureStorage, primarySecureStoreKind } from "../../utils/secureStorage/index.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getKeychainCacheState } from "../../utils/secureStorage/macOsKeychainHelpers.js";
import { getServerKey } from "./auth.js";
import { needsClientRegistration } from "./registrationStatus.js";
import { logMCPDebug } from "../../utils/log.js";
import { McpCredentialStoreUnavailableError } from "./client.js";

/**
 * 读取 MCP OAuth 令牌存储（可指定存储实例，读取失败返回 undefined）。
 */
//@ chunk-cyj440je.js:6430-6557 placement
async function readMcpOAuthStore(e) {
  if (e === void 0) return (await getSecureStorage().readAsync())?.mcpOAuth;
  let r = await readSecureStorageForMcp(e);
  return r === READ_FAILED ? void 0 : r?.mcpOAuth;
}
//@ chunk-cyj440je.js:6557-6738 placement
var FAILED_READ_RETRY_MS = 1000,
  EMPTY_READ_CACHE_MS = 30000,
  credentialReadState = new HostScoped(() => ({
    inFlight: null,
    verdict: void 0,
    settledAt: 0,
    seenPopulated: !1,
    generation: 0,
    keychainOnly: { inFlight: null, verdict: void 0, settledAt: 0, cacheGeneration: 0 },
  }));
//@ chunk-cyj440je.js:6738-6799 placement
function w(e) {
  return e !== READ_FAILED && (!e || Object.keys(e).length === 0);
}
/**
 * 为 MCP 读取安全存储：带服务器挑战信息时，凭据缺失且在非交互的钥匙串环境下会再做一次严格读取（读到太晚则让本次请求失败以便下次带上）；普通读取在内容为空时用严格读取复核，结果按失败/为空分别短暂缓存。
 */
//@ chunk-cyj440je.js:6799-8093 placement
async function readSecureStorageForMcp(challenge) {
  let storage = getSecureStorage();
  if (challenge !== void 0) {
    let keychainOnly = credentialReadState.of(getRootSession().host).keychainOnly,
      v =
        keychainOnly.verdict === "answered" &&
        keychainOnly.cacheGeneration === getKeychainCacheState().generation &&
        Date.now() - keychainOnly.settledAt < EMPTY_READ_CACHE_MS,
      u = await readSecureStorageForMcp(),
      readAsyncStrict = storage.readAsyncStrict;
    if (u === READ_FAILED || !readAsyncStrict || v) return u;
    let { serverName: serverName, serverConfig: serverConfig } = challenge,
      m = getServerKey(serverName, serverConfig),
      R = u?.mcpOAuth?.[m];
    if (
      R?.accessToken ||
      R?.refreshToken ||
      (!challenge.challenged && !needsClientRegistration(serverName, serverConfig, u?.mcpOAuth)) ||
      !getIsNonInteractiveSession() ||
      primarySecureStoreKind() !== "keychain"
    )
      return u;
    if (keychainOnly.verdict === "failed" && Date.now() - keychainOnly.settledAt < FAILED_READ_RETRY_MS)
      return READ_FAILED;
    let generation = getKeychainCacheState().generation;
    keychainOnly.inFlight ??= readAsyncStrict
      .call(storage, void 0, { inaccessibleAs: "failure" })
      .then(
        (y) => (
          (keychainOnly.verdict = y === READ_FAILED ? "failed" : "answered"),
          (keychainOnly.settledAt = Date.now()),
          (keychainOnly.cacheGeneration = generation),
          y
        ),
      )
      .finally(() => {
        keychainOnly.inFlight = null;
      });
    let inFlight = await keychainOnly.inFlight;
    if (inFlight === READ_FAILED || !challenge.challenged) return inFlight ?? u;
    let M = inFlight?.mcpOAuth?.[m];
    if (!M?.accessToken && !M?.refreshToken) return inFlight ?? u;
    throw (
      logMCPDebug(
        serverName,
        "Stored credentials turned up only after the server challenged a request sent without them; failing that request so the next one sends them",
      ),
      new McpCredentialStoreUnavailableError(serverName, "read-too-late")
    );
  }
  let data = await storage.readAsync(),
    readState = credentialReadState.of(getRootSession().host),
    readAsyncStrict = storage.readAsyncStrict;
  if (!w(data)) return (b(readState), data);
  if (!readAsyncStrict) return data;
  let sinceSettled = Date.now() - readState.settledAt;
  if (readState.verdict === "failed" && sinceSettled < FAILED_READ_RETRY_MS)
    return readState.seenPopulated ? READ_FAILED : data;
  if (readState.verdict === "empty" && sinceSettled < EMPTY_READ_CACHE_MS) return data;
  readState.inFlight ??= settleStrictRead(readState, () => readAsyncStrict.call(storage));
  let inFlight = await readState.inFlight;
  return inFlight === READ_FAILED && !readState.seenPopulated ? data : inFlight;
}
//@ chunk-cyj440je.js:8093-8181 placement
function b(e) {
  if (((e.seenPopulated = !0), e.generation++, e.verdict === "empty")) e.verdict = void 0;
}
//@ chunk-cyj440je.js:8181-8407 placement
async function settleStrictRead(e, r) {
  try {
    let generation = e.generation,
      n = await r();
    if (n !== READ_FAILED && !w(n)) ((e.verdict = void 0), b(e));
    else if (generation !== e.generation) return n;
    else e.verdict = n === READ_FAILED ? "failed" : "empty";
    return ((e.settledAt = Date.now()), n);
  } finally {
    e.inFlight = null;
  }
}

export { readMcpOAuthStore, readSecureStorageForMcp };
