/**
 * services/mcp/hostedWorkerTrust.ts
 *
 * 2.1.316 新增：托管 worker 信任。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0er4bhms.js (2)
 * attribution: placement 2
 */
import { isDeepStrictEqual } from "util";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import { proxyAwareFetch } from "../../upstreamproxy/proxyFetch.js";

//@ chunk-0er4bhms.js:378-468 placement
function YDo() {
  return (
    env.CLAUDE_CODE_CCR_OWN_CONNECTION_POOL || getFeatureValue_CACHED_MAY_BE_STALE("tengu_reactive_quilt", !1)
  );
}
/**
 * 托管 worker 中 MCP 请求的 fetch：TLS 设置与当前一致时走主机专用通道；否则只保留与当前 CA 列表的交集，交集为空时拒绝发送并提示重连。
 */
//@ chunk-0er4bhms.js:468-1042 placement
async function hostedWorkerFetch(url, init = {}) {
  if (init.proxy !== void 0 || sessionHostKind() !== "hosted_worker" || !YDo())
    return fetch(String(url), init);
  let currentTls = getTLSFetchOptions(void 0).tls;
  if (isDeepStrictEqual(init.tls, currentTls)) return proxyAwareFetch(String(url), init, () => !0);
  let allowedCas = new Set([currentTls?.ca ?? []].flat()),
    sharedCas = [init.tls?.ca ?? []].flat().filter((s) => allowedCas.has(s));
  if (sharedCas.length === 0)
    throw Error(
      "MCP request not sent: its list of trusted CA certificates has nothing in common with the one Claude Code uses now, most likely because Claude Code's TLS settings changed after the server connected. Reconnect the server to use the new settings.",
    );
  return fetch(String(url), { ...init, tls: { ...currentTls, ca: sharedCas } });
}

export { hostedWorkerFetch, YDo };
