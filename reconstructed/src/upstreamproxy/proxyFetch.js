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
  let n = isStandaloneExecutable() ? getTLSFetchSession(s, o) : void 0;
  if (!n) return;
  let { tls: tls, ...t } = e ?? {},
    d = e?.proxy === void 0 && e?.unix === void 0 ? t : e;
  return (i) => n.fetch(i, d);
}
//@ chunk-1p1fwh3h.js:412-514 placement
function proxyAwareFetch(s, e, o) {
  let n = e.proxy === void 0 && o?.() ? createTlsSessionFetch("ccr", e, void 0) : void 0;
  return n ? n(s) : fetch(s, e);
}

export { proxyAwareFetch, createTlsSessionFetch };
