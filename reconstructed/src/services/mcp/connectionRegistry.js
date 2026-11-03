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
import { ir, connectToServer_2 } from "./client.js";
import { mcpGateError } from "./mcpToggleMessages.js";
import { wkt } from "./redactMcpErrors.js";
import { ht } from "./cliOwnedClients.js";
import { withDeadline } from "../../utils/sleep.js";
import { oa } from "../../types/ids.js";
import { fd } from "./mcpAccountKey.js";
import { isSameConnectedClient } from "./toolSchemaValidation.js";
import { deleteDiscoveryCache } from "./discoveryCache.js";
import { ElicitRequestSchema } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";

/**
 * 为 v1 客户端安装发现缓存所需的解析器：协议时代解析器固定返回 legacy，若尚未设置账号解析器则装上默认的。旧版/自动名 isLegacyProtocolEra 与行为不符。（v1）
 */
//@ chunk-z1n5m6nf.js:85309-85372 placement
function isLegacyProtocolEra() {
  if ((primeDiscoveryCacheFlag(), setEraResolver(() => "legacy"), hasAccountResolver())) return;
  setAccountResolver(oauthAccountIdentity);
}
//@ chunk-z1n5m6nf.js:85372-85409 placement
function Po() {
  if (getEnsureConnectedClient()) return;
  setEnsureConnectedClient(connectMcpServer);
}
//@ chunk-z1n5m6nf.js:85409-85505 placement
function So_2(e, r) {
  try {
    CACHED_ADOPT_SIGNAL.emit(e, r);
  } catch (error) {
    logMCPDebug(e, `cached-row adopt subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-z1n5m6nf.js:85505-85741 placement
function recordCachedDialFailureV1(e, r) {
  if (r) logFeatureSad("mcp_discovery_cache", "lazy_dial_failed");
  getConnectionCache().settledCachedDialFailures.set(ir(e.name, e.config), { failure: e, ownStrike: r });
  try {
    CACHED_DIAL_FAILED_SIGNAL.emit(e, r);
  } catch (error) {
    logMCPDebug(e.name, `cached-row dial-failed subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-z1n5m6nf.js:85741-85837 placement
function ql(e, r) {
  let settledCachedDialFailures = getConnectionCache().settledCachedDialFailures,
    s = ir(e, r),
    h = settledCachedDialFailures.get(s);
  return (settledCachedDialFailures.delete(s), h);
}
//@ chunk-z1n5m6nf.js:85837-85931 placement
async function zl(e, r) {
  let n = connectToServer_2.cache?.get?.(ir(e, r));
  return n !== void 0 && (await pt(n)) === void 0;
}
//@ chunk-z1n5m6nf.js:85931-86185 placement
function refuseCachedRowV1(e, r, n) {
  let s = ir(e, r);
  if (getConnectionCache().refusedCachedRows.has(s)) return;
  if ((getConnectionCache().refusedCachedRows.add(s), n === "policy")) Vt(e, r).catch(() => {});
  recordCachedDialFailureV1(
    {
      name: e,
      type: "failed",
      config: r,
      ...(n === "policy" ? mcpGateError("managed-policy", e, r) : { error: wkt, errorCode: "DISABLED" }),
    },
    !1,
  );
}
/**
 * 判断服务器是否有已连接且没有正在后台刷新的连接（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:86185-86352 placement
async function hasLiveConnection_2(e, r) {
  let n = ir(e, r),
    s = getConnectionCache().connections.get(n);
  if (!s) return !1;
  if ((await pt(s))?.type !== "connected") return !1;
  return !ht().swrRefreshDialsInFlight.has(s);
}
/**
 * 服务时清除失败的连接记忆（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:86352-86547 placement
async function evictStaleFailedConnectMemoForServe(e, r) {
  let n = ir(e, r),
    s = getConnectionCache().connections.get(n);
  if (!s) return;
  let h = await pt(s);
  if (h === void 0 || h.type === "connected") return;
  if (getConnectionCache().connections.get(n) === s) getConnectionCache().connections.delete(n);
}
//@ chunk-z1n5m6nf.js:86547-86603 placement
async function pt(e) {
  return withDeadline(
    e.catch(() => {
      return;
    }),
    0,
  );
}
//@ chunk-z1n5m6nf.js:86603-86688 placement
async function Er(e, r) {
  let n = connectToServer_2.cache?.get?.(ir(e, r));
  return n === void 0 ? void 0 : pt(n);
}
//@ chunk-z1n5m6nf.js:86688-86849 placement
function clearConnectionCachesV1(e) {
  (getConnectionCache().connections.delete(e),
    getConnectionCache().toolLists.delete(e),
    getConnectionCache().resourceLists.delete(e),
    getConnectionCache().resourceTemplateLists.delete(e),
    getConnectionCache().commandLists.delete(e));
}
/**
 * 清除服务器的连接缓存，有活动调用时保留连接（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:86849-87228 placement
async function clearServerCache_4(e, r, n) {
  isLegacyProtocolEra();
  let s = ir(e, r),
    h = getConnectionCache().connections.get(s);
  if (h) {
    let y = await pt(h);
    if (y === void 0) disposeServerConnectionDetached(e, r, h);
    else if (y.type === "connected") {
      if (
        n !== void 0 &&
        getConnectionCache().connections.get(s) === h &&
        oa(y.client).transport !== void 0 &&
        (y.transportErrorState?.activeCallWatchdogs.size ?? 0) > 0
      ) {
        n.connection = y;
        return;
      }
      await detachAndCloseConnection_2(y);
    }
    let S = getConnectionCache().connections.get(s);
    if (S !== void 0 && S !== h) return;
  }
  clearConnectionCachesV1(s);
}
/**
 * 解除连接的 onclose 并关闭连接，必要时清理连接记忆（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:87228-87435 placement
function detachAndCloseConnection_2(e) {
  if (((oa(e.client).onclose = void 0), fd())) {
    let r = ir(e.name, e.config),
      n = connectToServer_2.cache?.get?.(r);
    if (n !== void 0)
      pt(n).then((s) => {
        if (isSameConnectedClient(s, e) && connectToServer_2.cache?.get?.(r) === n)
          clearConnectionCachesV1(r);
      });
  }
  return e.cleanup().catch(() => {});
}
/**
 * 在后台丢弃服务器连接并关闭（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:87435-87630 placement
function disposeServerConnectionDetached(e, r, n) {
  isLegacyProtocolEra();
  let s = ir(e, r),
    h = getConnectionCache().connections.get(s);
  if (n !== void 0 && h !== n) return;
  if (h) ht().supersededDials.add(h);
  if ((clearConnectionCachesV1(s), h))
    h.then(
      (y) => {
        if (y.type !== "connected") return;
        detachAndCloseConnection_2(y);
      },
      () => {},
    );
}
//@ chunk-z1n5m6nf.js:87630-87673 placement
async function Vt(e, r) {
  (isLegacyProtocolEra(), await deleteDiscoveryCache(e, r));
}
/**
 * 丢弃已结束且未连接的连接记忆（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:87673-87941 placement
async function discardMemoizedConnectResult(e, r) {
  let n = ir(e, r);
  if (!fd()) return (getConnectionCache().connections.delete(n), !0);
  let s = getConnectionCache().connections.get(n);
  if (s !== void 0) {
    let h = await pt(s);
    if (h === void 0 || h.type === "connected") return !1;
    if (getConnectionCache().connections.get(n) !== s) return !1;
  }
  return (getConnectionCache().connections.delete(n), !0);
}
/**
 * 清除服务器的资源与资源模板列表缓存（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:87941-88048 placement
function invalidateMcpResourceListCaches(e) {
  let r = ir(e.name, e.config);
  (getConnectionCache().resourceLists.delete(r), getConnectionCache().resourceTemplateLists.delete(r));
}
//@ chunk-z1n5m6nf.js:88048-88103 placement
function Gl(e, r) {
  oa(e.client).setRequestHandler(ElicitRequestSchema, r);
}

export {
  Po,
  Vt,
  clearServerCache_4,
  detachAndCloseConnection_2,
  isLegacyProtocolEra,
  hasLiveConnection_2,
  refuseCachedRowV1,
  So_2,
  recordCachedDialFailureV1,
  pt,
  Er,
  evictStaleFailedConnectMemoForServe,
};
