/**
 * services/mcp/connectionRegistry.ts
 *
 * 2.1.316 新增。MCP 连接注册表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h44h5gdv.js (19)
 * attribution: placement 19
 */
import { primeDiscoveryCacheFlag } from "./elicitationDialogs.js";
import { setEraResolver, hasAccountResolver, setAccountResolver } from "./discoveryIdentity.js";
import { oauthAccountIdentity } from "./connectionLifecycle.js";
import { getEnsureConnectedClient, setEnsureConnectedClient } from "../../bootstrap/state.js";
import { connectMcpServer } from "./discovery.js";
import { CACHED_ADOPT_SIGNAL, CACHED_DIAL_FAILED_SIGNAL } from "./connectionFlags.js";
import { logMCPDebug } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { getConnectionCache } from "./needsAuthCache.js";
import { serverCacheKey, connectToServer_2 } from "./client.js";
import { mcpGateError } from "./mcpToggleMessages.js";
import { DISABLED_IN_MCP_REASON } from "./redactMcpErrors.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { withDeadline } from "../../utils/sleep.js";
import { identityId2 } from "../../types/ids.js";
import { isDiscoveryCacheOn } from "./mcpAccountKey.js";
import { isSameConnectedClient } from "./toolSchemaValidation.js";
import { deleteDiscoveryCache } from "./discoveryCache.js";
import { ElicitRequestSchema } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";

//@ chunk-h44h5gdv.js:86955-87018 placement
/**
 * 为 v1 客户端安装发现缓存所需的解析器：协议时代解析器固定返回 legacy，若尚未设置账号解析器则装上默认的。旧版/自动名 isLegacyProtocolEra 与行为不符。（v1）
 */
function isLegacyProtocolEra() {
  primeDiscoveryCacheFlag();
  setEraResolver(() => "legacy");
  if (hasAccountResolver()) return;
  setAccountResolver(oauthAccountIdentity);
}
//@ chunk-h44h5gdv.js:87018-87056 placement
/**
 * 注册 ensureConnectedClient 实现（旧副本）。
 */
function primeEnsureConnectedClient() {
  if (getEnsureConnectedClient()) return;
  setEnsureConnectedClient(connectMcpServer);
}
//@ chunk-h44h5gdv.js:87056-87152 placement
/**
 * 发出“缓存行被采纳”的信号（旧副本）。
 */
function emitCachedAdoptSignal(name, config) {
  try {
    CACHED_ADOPT_SIGNAL.emit(name, config);
  } catch (error) {
    logMCPDebug(name, `cached-row adopt subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-h44h5gdv.js:87152-87388 placement
function recordCachedDialFailureV1(failure, ownStrike) {
  if (ownStrike) logFeatureSad("mcp_discovery_cache", "lazy_dial_failed");
  getConnectionCache().settledCachedDialFailures.set(serverCacheKey(failure.name, failure.config), {
    failure,
    ownStrike,
  });
  try {
    CACHED_DIAL_FAILED_SIGNAL.emit(failure, ownStrike);
  } catch (error) {
    logMCPDebug(failure.name, `cached-row dial-failed subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-h44h5gdv.js:87388-87484 placement
/**
 * 取出并删除已结算的缓存拨号失败（旧副本）。
 */
function takeSettledCachedDialFailure(name, config) {
  let settledCachedDialFailures = getConnectionCache().settledCachedDialFailures;
  let cacheKey = serverCacheKey(name, config);
  let failure = settledCachedDialFailures.get(cacheKey);
  settledCachedDialFailures.delete(cacheKey);
  return failure;
}
//@ chunk-h44h5gdv.js:87484-87578 placement
/**
 * 缓存失败是否已被清理（旧副本）。
 */
async function hasClearedCachedFailure(name, config) {
  let dial = connectToServer_2.cache?.get?.(serverCacheKey(name, config));
  return dial !== undefined && (await settleDialOrUndefined(dial)) === undefined;
}
//@ chunk-h44h5gdv.js:87578-87832 placement
function refuseCachedRowV1(name, config, reason) {
  let cacheKey = serverCacheKey(name, config);
  if (getConnectionCache().refusedCachedRows.has(cacheKey)) return;
  getConnectionCache().refusedCachedRows.add(cacheKey);
  if (reason === "policy") clearDiscoveryForServer_2(name, config).catch(() => {});
  recordCachedDialFailureV1(
    {
      name,
      type: "failed",
      config,
      ...(reason === "policy"
        ? mcpGateError("managed-policy", name, config)
        : {
            error: DISABLED_IN_MCP_REASON,
            errorCode: "DISABLED",
          }),
    },
    false,
  );
}
//@ chunk-h44h5gdv.js:87832-87999 placement
/**
 * 判断服务器是否有已连接且没有正在后台刷新的连接（v1 副本）。
 */
async function hasLiveConnection_2(name, config) {
  let cacheKey = serverCacheKey(name, config);
  let dial = getConnectionCache().connections.get(cacheKey);
  if (!dial) return false;
  if ((await settleDialOrUndefined(dial))?.type !== "connected") return false;
  return !getCliOwnedState().swrRefreshDialsInFlight.has(dial);
}
//@ chunk-h44h5gdv.js:87999-88194 placement
/**
 * 服务时清除失败的连接记忆（v1 副本）。
 */
async function evictStaleFailedConnectMemoForServe(name, config) {
  let cacheKey = serverCacheKey(name, config);
  let dial = getConnectionCache().connections.get(cacheKey);
  if (!dial) return;
  let connection = await settleDialOrUndefined(dial);
  if (connection === undefined || connection.type === "connected") return;
  if (getConnectionCache().connections.get(cacheKey) === dial)
    getConnectionCache().connections.delete(cacheKey);
}
//@ chunk-h44h5gdv.js:88194-88250 placement
/**
 * 把一次 MCP 连接尝试结算成“已连接或 undefined”：超时固定 0（withDeadline(dial.catch(()=>undefined),0)），不会等待。
 */
async function settleDialOrUndefined(dial) {
  return withDeadline(
    dial.catch(() => {
      return;
    }),
    0,
  );
}
//@ chunk-h44h5gdv.js:88250-88335 placement
/**
 * 取某服务器已缓存的连接结果。
 */
async function getCachedConnectResult(name, config) {
  let dial = connectToServer_2.cache?.get?.(serverCacheKey(name, config));
  return dial === undefined ? undefined : settleDialOrUndefined(dial);
}
//@ chunk-h44h5gdv.js:88335-88496 placement
function clearConnectionCachesV1(cacheKey) {
  getConnectionCache().connections.delete(cacheKey);
  getConnectionCache().toolLists.delete(cacheKey);
  getConnectionCache().resourceLists.delete(cacheKey);
  getConnectionCache().resourceTemplateLists.delete(cacheKey);
  getConnectionCache().commandLists.delete(cacheKey);
}
//@ chunk-h44h5gdv.js:88496-88875 placement
/**
 * 清除服务器的连接缓存，有活动调用时保留连接（v1 副本）。
 */
async function clearServerCache_3(name, config, options) {
  isLegacyProtocolEra();
  let cacheKey = serverCacheKey(name, config);
  let dial = getConnectionCache().connections.get(cacheKey);
  if (dial) {
    let connection = await settleDialOrUndefined(dial);
    if (connection === undefined) disposeServerConnectionDetached(name, config, dial);
    else if (connection.type === "connected") {
      if (
        options !== undefined &&
        getConnectionCache().connections.get(cacheKey) === dial &&
        identityId2(connection.client).transport !== undefined &&
        (connection.transportErrorState?.activeCallWatchdogs.size ?? 0) > 0
      ) {
        options.connection = connection;
        return;
      }
      await detachAndCloseConnection_2(connection);
    }
    let currentDial = getConnectionCache().connections.get(cacheKey);
    if (currentDial !== undefined && currentDial !== dial) return;
  }
  clearConnectionCachesV1(cacheKey);
}
//@ chunk-h44h5gdv.js:88875-89082 placement
/**
 * 解除连接的 onclose 并关闭连接，必要时清理连接记忆（v1 副本）。
 */
function detachAndCloseConnection_2(connection) {
  identityId2(connection.client).onclose = undefined;
  if (isDiscoveryCacheOn()) {
    let cacheKey = serverCacheKey(connection.name, connection.config);
    let dial = connectToServer_2.cache?.get?.(cacheKey);
    if (dial !== undefined)
      settleDialOrUndefined(dial).then((settledDial) => {
        if (
          isSameConnectedClient(settledDial, connection) &&
          connectToServer_2.cache?.get?.(cacheKey) === dial
        )
          clearConnectionCachesV1(cacheKey);
      });
  }
  return connection.cleanup().catch(() => {});
}
//@ chunk-h44h5gdv.js:89082-89277 placement
/**
 * 在后台丢弃服务器连接并关闭（v1 副本）。
 */
function disposeServerConnectionDetached(name, config, expectedDial) {
  isLegacyProtocolEra();
  let cacheKey = serverCacheKey(name, config);
  let dial = getConnectionCache().connections.get(cacheKey);
  if (expectedDial !== undefined && dial !== expectedDial) return;
  if (dial) getCliOwnedState().supersededDials.add(dial);
  clearConnectionCachesV1(cacheKey);
  if (dial)
    dial.then(
      (connection) => {
        if (connection.type !== "connected") return;
        detachAndCloseConnection_2(connection);
      },
      () => {},
    );
}
//@ chunk-h44h5gdv.js:89277-89320 placement
/**
 * 清理服务器缓存并删除发现缓存（旧副本）。
 */
async function clearDiscoveryForServer_2(name, config) {
  isLegacyProtocolEra();
  await deleteDiscoveryCache(name, config);
}
//@ chunk-h44h5gdv.js:89320-89588 placement
/**
 * 丢弃已结束且未连接的连接记忆（v1 副本）。
 */
async function discardMemoizedConnectResult(name, config) {
  let cacheKey = serverCacheKey(name, config);
  if (!isDiscoveryCacheOn()) {
    getConnectionCache().connections.delete(cacheKey);
    return true;
  }
  let dial = getConnectionCache().connections.get(cacheKey);
  if (dial !== undefined) {
    let connection = await settleDialOrUndefined(dial);
    if (connection === undefined || connection.type === "connected") return false;
    if (getConnectionCache().connections.get(cacheKey) !== dial) return false;
  }
  getConnectionCache().connections.delete(cacheKey);
  return true;
}
//@ chunk-h44h5gdv.js:89588-89695 placement
/**
 * 清除服务器的资源与资源模板列表缓存（v1 副本）。
 */
function invalidateMcpResourceListCaches(server) {
  let cacheKey = serverCacheKey(server.name, server.config);
  getConnectionCache().resourceLists.delete(cacheKey);
  getConnectionCache().resourceTemplateLists.delete(cacheKey);
}
//@ chunk-h44h5gdv.js:89695-89750 placement
/**
 * 给客户端设置 elicitation 请求处理器。
 */
function setElicitationHandler(server, handler) {
  identityId2(server.client).setRequestHandler(ElicitRequestSchema, handler);
}
export {
  primeEnsureConnectedClient,
  clearDiscoveryForServer_2,
  clearServerCache_3,
  detachAndCloseConnection_2,
  isLegacyProtocolEra,
  hasLiveConnection_2,
  refuseCachedRowV1,
  emitCachedAdoptSignal,
  recordCachedDialFailureV1,
  settleDialOrUndefined,
  getCachedConnectResult,
  evictStaleFailedConnectMemoForServe,
  discardMemoizedConnectResult,
  disposeServerConnectionDetached,
  hasClearedCachedFailure,
  invalidateMcpResourceListCaches,
  setElicitationHandler,
  takeSettledCachedDialFailure,
};
