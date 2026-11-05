/**
 * services/mcp/hostedWorkerTrust.ts
 *
 * 2.1.316 新增：托管 worker 信任。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6n66vx3h.js (2)
 * attribution: placement 2
 */
import { isDeepStrictEqual } from "util";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import { proxyAwareFetch } from "../../upstreamproxy/proxyFetch.js";

//@ chunk-6n66vx3h.js:378-468 placement
/**
 * 托管 worker 的专用 fetch 是否启用（环境变量或 tengu_reactive_quilt）。
 */
function isHostedWorkerFetchEnabled() {
  return (
    env.CLAUDE_CODE_CCR_OWN_CONNECTION_POOL ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_reactive_quilt", false)
  );
}
//@ chunk-6n66vx3h.js:468-1042 placement
/**
 * 托管 worker 中 MCP 请求的 fetch：TLS 设置与当前一致时走主机专用通道；否则只保留与当前 CA 列表的交集，交集为空时拒绝发送并提示重连。
 */
async function hostedWorkerFetch(url, init = {}) {
  if (init.proxy !== undefined || sessionHostKind() !== "hosted_worker" || !isHostedWorkerFetchEnabled())
    return fetch(String(url), init);
  let currentTls = getTLSFetchOptions(undefined).tls;
  if (isDeepStrictEqual(init.tls, currentTls)) return proxyAwareFetch(String(url), init, () => true);
  let allowedCas = new Set([currentTls?.ca ?? []].flat());
  let sharedCas = [init.tls?.ca ?? []].flat().filter((ca) => allowedCas.has(ca));
  if (sharedCas.length === 0)
    throw Error(
      "MCP request not sent: its list of trusted CA certificates has nothing in common with the one Claude Code uses now, most likely because Claude Code's TLS settings changed after the server connected. Reconnect the server to use the new settings.",
    );
  return fetch(String(url), {
    ...init,
    tls: {
      ...currentTls,
      ca: sharedCas,
    },
  });
}
export { hostedWorkerFetch, isHostedWorkerFetchEnabled };
