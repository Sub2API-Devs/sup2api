/**
 * upstreamproxy/proxyFetch.ts
 *
 * 2.1.316 新增。经代理的 fetch。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1p1fwh3h.js (2)
 * attribution: placement 2
 */
import { isStandaloneExecutable } from "../utils/slowOperations.js";
import { getTLSFetchSession } from "../utils/mtls.js";

//@ chunk-1p1fwh3h.js:264-412 placement
function createTlsSessionFetch(s, e, o) {
  let n = isStandaloneExecutable() ? getTLSFetchSession(s, o) : undefined;
  if (!n) return;
  let { tls, ...t } = e ?? {};
  let d = e?.proxy === undefined && e?.unix === undefined ? t : e;
  return (i) => n.fetch(i, d);
}
//@ chunk-1p1fwh3h.js:412-514 placement
function proxyAwareFetch(s, e, ownConnectionPool) {
  let n =
    e.proxy === undefined && ownConnectionPool?.() ? createTlsSessionFetch("ccr", e, undefined) : undefined;
  return n ? n(s) : fetch(s, e);
}
export { proxyAwareFetch, createTlsSessionFetch };
