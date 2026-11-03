/**
 * services/mcp/connectionRegistry.ts
 *
 * 2.1.316 新增。MCP 连接注册表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z1n5m6nf.js (19)
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

//@ chunk-z1n5m6nf.js:85309-85372 placement
/**
 * 为 v1 客户端安装发现缓存所需的解析器：协议时代解析器固定返回 legacy，若尚未设置账号解析器则装上默认的。旧版/自动名 isLegacyProtocolEra 与行为不符。（v1）
 */
function isLegacyProtocolEra() {
  primeDiscoveryCacheFlag();
  setEraResolver(() => "legacy");
  if (hasAccountResolver()) return;
  setAccountResolver(oauthAccountIdentity);
}
//@ chunk-z1n5m6nf.js:85372-85409 placement
/**
 * 注册 ensureConnectedClient 实现（旧副本）。
 */
function primeEnsureConnectedClient() {
  if (getEnsureConnectedClient()) return;
  setEnsureConnectedClient(connectMcpServer);
}
//@ chunk-z1n5m6nf.js:85409-85505 placement
/**
 * 发出“缓存行被采纳”的信号（旧副本）。
 */
function emitCachedAdoptSignal(e, r) {
  try {
    CACHED_ADOPT_SIGNAL.emit(e, r);
  } catch (error) {
    logMCPDebug(e, `cached-row adopt subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-z1n5m6nf.js:85505-85741 placement
function recordCachedDialFailureV1(e, r) {
  if (r) logFeatureSad("mcp_discovery_cache", "lazy_dial_failed");
  getConnectionCache().settledCachedDialFailures.set(serverCacheKey(e.name, e.config), {
    failure: e,
    ownStrike: r,
  });
  try {
    CACHED_DIAL_FAILED_SIGNAL.emit(e, r);
  } catch (error) {
    logMCPDebug(e.name, `cached-row dial-failed subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-z1n5m6nf.js:85741-85837 placement
/**
 * 取出并删除已结算的缓存拨号失败（旧副本）。
 */
function takeSettledCachedDialFailure(e, r) {
  let settledCachedDialFailures = getConnectionCache().settledCachedDialFailures;
  let s = serverCacheKey(e, r);
  let h = settledCachedDialFailures.get(s);
  settledCachedDialFailures.delete(s);
  return h;
}
//@ chunk-z1n5m6nf.js:85837-85931 placement
/**
 * 缓存失败是否已被清理（旧副本）。
 */
async function hasClearedCachedFailure(e, r) {
  let n = connectToServer_2.cache?.get?.(serverCacheKey(e, r));
  return n !== undefined && (await settleWithinDeadline(n)) === undefined;
}
//@ chunk-z1n5m6nf.js:85931-86185 placement
function refuseCachedRowV1(name, config, n) {
  let s = serverCacheKey(name, config);
  if (getConnectionCache().refusedCachedRows.has(s)) return;
  getConnectionCache().refusedCachedRows.add(s);
  if (n === "policy") clearDiscoveryForServer_2(name, config).catch(() => {});
  recordCachedDialFailureV1(
    {
      name,
      type: "failed",
      config,
      ...(n === "policy"
        ? mcpGateError("managed-policy", name, config)
        : {
            error: DISABLED_IN_MCP_REASON,
            errorCode: "DISABLED",
          }),
    },
    false,
  );
}
//@ chunk-z1n5m6nf.js:86185-86352 placement
/**
 * 判断服务器是否有已连接且没有正在后台刷新的连接（v1 副本）。
 */
async function hasLiveConnection_2(e, r) {
  let n = serverCacheKey(e, r);
  let s = getConnectionCache().connections.get(n);
  if (!s) return false;
  if ((await settleWithinDeadline(s))?.type !== "connected") return false;
  return !getCliOwnedState().swrRefreshDialsInFlight.has(s);
}
//@ chunk-z1n5m6nf.js:86352-86547 placement
/**
 * 服务时清除失败的连接记忆（v1 副本）。
 */
async function evictStaleFailedConnectMemoForServe(e, config) {
  let n = serverCacheKey(e, config);
  let s = getConnectionCache().connections.get(n);
  if (!s) return;
  let h = await settleWithinDeadline(s);
  if (h === undefined || h.type === "connected") return;
  if (getConnectionCache().connections.get(n) === s) getConnectionCache().connections.delete(n);
}
//@ chunk-z1n5m6nf.js:86547-86603 placement
/**
 * 立刻等待 promise 结算（不设时限）。
 */
async function settleWithinDeadline(e) {
  return withDeadline(
    e.catch(() => {
      return;
    }),
    0,
  );
}
//@ chunk-z1n5m6nf.js:86603-86688 placement
/**
 * 取某服务器已缓存的连接结果。
 */
async function getCachedConnectResult(name, config) {
  let n = connectToServer_2.cache?.get?.(serverCacheKey(name, config));
  return n === undefined ? undefined : settleWithinDeadline(n);
}
//@ chunk-z1n5m6nf.js:86688-86849 placement
function clearConnectionCachesV1(e) {
  getConnectionCache().connections.delete(e);
  getConnectionCache().toolLists.delete(e);
  getConnectionCache().resourceLists.delete(e);
  getConnectionCache().resourceTemplateLists.delete(e);
  getConnectionCache().commandLists.delete(e);
}
//@ chunk-z1n5m6nf.js:86849-87228 placement
/**
 * 清除服务器的连接缓存，有活动调用时保留连接（v1 副本）。
 */
async function clearServerCache_4(e, config, n) {
  isLegacyProtocolEra();
  let s = serverCacheKey(e, config);
  let h = getConnectionCache().connections.get(s);
  if (h) {
    let y = await settleWithinDeadline(h);
    if (y === undefined) disposeServerConnectionDetached(e, config, h);
    else if (y.type === "connected") {
      if (
        n !== undefined &&
        getConnectionCache().connections.get(s) === h &&
        identityId2(y.client).transport !== undefined &&
        (y.transportErrorState?.activeCallWatchdogs.size ?? 0) > 0
      ) {
        n.connection = y;
        return;
      }
      await detachAndCloseConnection_2(y);
    }
    let S = getConnectionCache().connections.get(s);
    if (S !== undefined && S !== h) return;
  }
  clearConnectionCachesV1(s);
}
//@ chunk-z1n5m6nf.js:87228-87435 placement
/**
 * 解除连接的 onclose 并关闭连接，必要时清理连接记忆（v1 副本）。
 */
function detachAndCloseConnection_2(e) {
  identityId2(e.client).onclose = undefined;
  if (isDiscoveryCacheOn()) {
    let r = serverCacheKey(e.name, e.config);
    let n = connectToServer_2.cache?.get?.(r);
    if (n !== undefined)
      settleWithinDeadline(n).then((s) => {
        if (isSameConnectedClient(s, e) && connectToServer_2.cache?.get?.(r) === n)
          clearConnectionCachesV1(r);
      });
  }
  return e.cleanup().catch(() => {});
}
//@ chunk-z1n5m6nf.js:87435-87630 placement
/**
 * 在后台丢弃服务器连接并关闭（v1 副本）。
 */
function disposeServerConnectionDetached(e, r, n) {
  isLegacyProtocolEra();
  let s = serverCacheKey(e, r);
  let h = getConnectionCache().connections.get(s);
  if (n !== undefined && h !== n) return;
  if (h) getCliOwnedState().supersededDials.add(h);
  clearConnectionCachesV1(s);
  if (h)
    h.then(
      (y) => {
        if (y.type !== "connected") return;
        detachAndCloseConnection_2(y);
      },
      () => {},
    );
}
//@ chunk-z1n5m6nf.js:87630-87673 placement
/**
 * 清理服务器缓存并删除发现缓存（旧副本）。
 */
async function clearDiscoveryForServer_2(e, r) {
  isLegacyProtocolEra();
  await deleteDiscoveryCache(e, r);
}
//@ chunk-z1n5m6nf.js:87673-87941 placement
/**
 * 丢弃已结束且未连接的连接记忆（v1 副本）。
 */
async function discardMemoizedConnectResult(e, r) {
  let n = serverCacheKey(e, r);
  if (!isDiscoveryCacheOn()) {
    getConnectionCache().connections.delete(n);
    return true;
  }
  let s = getConnectionCache().connections.get(n);
  if (s !== undefined) {
    let h = await settleWithinDeadline(s);
    if (h === undefined || h.type === "connected") return false;
    if (getConnectionCache().connections.get(n) !== s) return false;
  }
  getConnectionCache().connections.delete(n);
  return true;
}
//@ chunk-z1n5m6nf.js:87941-88048 placement
/**
 * 清除服务器的资源与资源模板列表缓存（v1 副本）。
 */
function invalidateMcpResourceListCaches(e) {
  let r = serverCacheKey(e.name, e.config);
  getConnectionCache().resourceLists.delete(r);
  getConnectionCache().resourceTemplateLists.delete(r);
}
//@ chunk-z1n5m6nf.js:88048-88103 placement
/**
 * 给客户端设置 elicitation 请求处理器。
 */
function setElicitationHandler(e, r) {
  identityId2(e.client).setRequestHandler(ElicitRequestSchema, r);
}
export {
  primeEnsureConnectedClient,
  clearDiscoveryForServer_2,
  clearServerCache_4,
  detachAndCloseConnection_2,
  isLegacyProtocolEra,
  hasLiveConnection_2,
  refuseCachedRowV1,
  emitCachedAdoptSignal,
  recordCachedDialFailureV1,
  settleWithinDeadline,
  getCachedConnectResult,
  evictStaleFailedConnectMemoForServe,
};
