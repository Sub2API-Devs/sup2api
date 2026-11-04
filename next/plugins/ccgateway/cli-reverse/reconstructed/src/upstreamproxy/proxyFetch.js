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
function createTlsSessionFetch(sessionName, options, sessionKey) {
  let session = isStandaloneExecutable() ? getTLSFetchSession(sessionName, sessionKey) : undefined;
  if (!session) return;
  let { tls, ...optionsWithoutTls } = options ?? {};
  let fetchOptions =
    options?.proxy === undefined && options?.unix === undefined ? optionsWithoutTls : options;
  return (input) => session.fetch(input, fetchOptions);
}
//@ chunk-1p1fwh3h.js:412-514 placement
function proxyAwareFetch(input, options, ownConnectionPool) {
  let sessionFetch =
    options.proxy === undefined && ownConnectionPool?.()
      ? createTlsSessionFetch("ccr", options, undefined)
      : undefined;
  return sessionFetch ? sessionFetch(input) : fetch(input, options);
}
export { proxyAwareFetch, createTlsSessionFetch };
