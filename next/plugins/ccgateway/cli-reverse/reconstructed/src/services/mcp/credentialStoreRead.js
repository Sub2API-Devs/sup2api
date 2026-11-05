/**
 * services/mcp/credentialStoreRead.ts
 *
 * 2.1.316 新增：MCP 凭据存储读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmy4vc7c.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmy4vc7c.js:6808-6935 placement
/**
 * 读取 MCP OAuth 令牌存储（可指定存储实例，读取失败返回 undefined）。
 */
async function readMcpOAuthStore(challenge) {
  if (challenge === undefined) return (await getSecureStorage().readAsync())?.mcpOAuth;
  let secureStorageForMcp = await readSecureStorageForMcp(challenge);
  return secureStorageForMcp === READ_FAILED ? undefined : secureStorageForMcp?.mcpOAuth;
}
//@ chunk-fmy4vc7c.js:6935-7116 placement
var FAILED_READ_RETRY_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_READ_CACHE_MS;
var credentialReadState;
deferInit("chunk-fmy4vc7c.js:6935", () => {
  FAILED_READ_RETRY_MS = 1000;
  EMPTY_READ_CACHE_MS = 30000;
  credentialReadState = new HostScoped(() => ({
    inFlight: null,
    verdict: undefined,
    settledAt: 0,
    seenPopulated: false,
    generation: 0,
    keychainOnly: {
      inFlight: null,
      verdict: undefined,
      settledAt: 0,
      cacheGeneration: 0,
    },
  }));
});
//@ chunk-fmy4vc7c.js:7116-7177 placement
/**
 * 判断读取结果是否为空（区别于 READ_FAILED）。
 */
function isEmptyRead(data) {
  return data !== READ_FAILED && (!data || Object.keys(data).length === 0);
}
//@ chunk-fmy4vc7c.js:7177-8472 placement
/**
 * 为 MCP 读取安全存储：带服务器挑战信息时，凭据缺失且在非交互的钥匙串环境下会再做一次严格读取（读到太晚则让本次请求失败以便下次带上）；普通读取在内容为空时用严格读取复核，结果按失败/为空分别短暂缓存。
 */
async function readSecureStorageForMcp(challenge) {
  let storage = getSecureStorage();
  if (challenge !== undefined) {
    let keychainOnly = credentialReadState.of(getRootSession().host).keychainOnly;
    let recentEmptyVerdict =
      keychainOnly.verdict === "answered" &&
      keychainOnly.cacheGeneration === getKeychainCacheState().generation &&
      Date.now() - keychainOnly.settledAt < EMPTY_READ_CACHE_MS;
    let secureStorageForMcp = await readSecureStorageForMcp();
    let readAsyncStrict = storage.readAsyncStrict;
    if (secureStorageForMcp === READ_FAILED || !readAsyncStrict || recentEmptyVerdict)
      return secureStorageForMcp;
    let { serverName, serverConfig } = challenge;
    let serverKey = getServerKey(serverName, serverConfig);
    let storedAuth = secureStorageForMcp?.mcpOAuth?.[serverKey];
    if (
      storedAuth?.accessToken ||
      storedAuth?.refreshToken ||
      (!challenge.challenged &&
        !needsClientRegistration(serverName, serverConfig, secureStorageForMcp?.mcpOAuth)) ||
      !getIsNonInteractiveSession() ||
      primarySecureStoreKind() !== "keychain"
    )
      return secureStorageForMcp;
    if (keychainOnly.verdict === "failed" && Date.now() - keychainOnly.settledAt < FAILED_READ_RETRY_MS)
      return READ_FAILED;
    let cacheGeneration = getKeychainCacheState().generation;
    keychainOnly.inFlight ??= readAsyncStrict
      .call(storage, undefined, {
        inaccessibleAs: "failure",
      })
      .then((strictResult) => {
        keychainOnly.verdict = strictResult === READ_FAILED ? "failed" : "answered";
        keychainOnly.settledAt = Date.now();
        keychainOnly.cacheGeneration = cacheGeneration;
        return strictResult;
      })
      .finally(() => {
        keychainOnly.inFlight = null;
      });
    let inFlight = await keychainOnly.inFlight;
    if (inFlight === READ_FAILED || !challenge.challenged) return inFlight ?? secureStorageForMcp;
    let lateAuth = inFlight?.mcpOAuth?.[serverKey];
    if (!lateAuth?.accessToken && !lateAuth?.refreshToken) return inFlight ?? secureStorageForMcp;
    logMCPDebug(
      serverName,
      "Stored credentials turned up only after the server challenged a request sent without them; failing that request so the next one sends them",
    );
    throw new McpCredentialStoreUnavailableError(serverName, "read-too-late");
  }
  let data = await storage.readAsync();
  let readState = credentialReadState.of(getRootSession().host);
  let readAsyncStrict = storage.readAsyncStrict;
  if (!isEmptyRead(data)) {
    markPopulated(readState);
    return data;
  }
  if (!readAsyncStrict) return data;
  let sinceSettled = Date.now() - readState.settledAt;
  if (readState.verdict === "failed" && sinceSettled < FAILED_READ_RETRY_MS)
    return readState.seenPopulated ? READ_FAILED : data;
  if (readState.verdict === "empty" && sinceSettled < EMPTY_READ_CACHE_MS) return data;
  readState.inFlight ??= settleStrictRead(readState, () => readAsyncStrict.call(storage));
  let inFlight = await readState.inFlight;
  return inFlight === READ_FAILED && !readState.seenPopulated ? data : inFlight;
}
//@ chunk-fmy4vc7c.js:8472-8560 placement
/**
 * 标记读取状态见过内容并递增代号。
 */
function markPopulated(readState) {
  readState.seenPopulated = true;
  readState.generation++;
  if (readState.verdict === "empty") readState.verdict = undefined;
}
//@ chunk-fmy4vc7c.js:8560-8786 placement
async function settleStrictRead(readState, strictReader) {
  try {
    let generation = readState.generation;
    let result = await strictReader();
    if (result !== READ_FAILED && !isEmptyRead(result)) {
      readState.verdict = undefined;
      markPopulated(readState);
    } else if (generation !== readState.generation) return result;
    else readState.verdict = result === READ_FAILED ? "failed" : "empty";
    readState.settledAt = Date.now();
    return result;
  } finally {
    readState.inFlight = null;
  }
}
export { readMcpOAuthStore, readSecureStorageForMcp };
