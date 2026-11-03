/**
 * utils/testNetworkGuard.ts
 *
 * 2.1.316 新增：测试运行时出网守卫。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (19)
 * attribution: placement 19
 */
import ws from "ws";
import { isEnvTruthy } from "./envUtils.js";
import { isLoopbackHost } from "./localhost.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";

//@ chunk-bwbq4xvm.js:160292-160370 placement
class TestEgressBlockedError extends Error {
  name = "TestEgressBlockedError";
  code = "TestEgressBlocked";
}
//@ chunk-bwbq4xvm.js:160370-160400 placement
var originalGlobalFetch = globalThis.fetch;
var ORIGINAL_WEBSOCKET = ws;
//@ chunk-bwbq4xvm.js:160400-160565 placement
function requestMethodAndUrl(e, init) {
  if (e instanceof Request)
    return {
      method: (init?.method ?? e.method).toUpperCase(),
      url: e.url,
    };
  return {
    method: (init?.method ?? "GET").toUpperCase(),
    url: String(e),
  };
}
//@ chunk-bwbq4xvm.js:160565-160638 placement
function isTestRealNetworkAllowed() {
  return isEnvTruthy(process.env.CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK);
}
//@ chunk-bwbq4xvm.js:160638-160746 placement
function formatLiveTestRequestWarning(e, s) {
  return `[CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK] live request from a test runtime: ${e} ${s}
`;
}
//@ chunk-bwbq4xvm.js:160746-160863 placement
/**
 * 测试运行时出网判定：回环地址 loopback；设了 CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK 为 opted-in；否则 refused。
 */
function classifyTestEgress(e) {
  let s;
  try {
    s = isLoopbackHost(new URL(e).hostname);
  } catch {
    s = false;
  }
  if (s) return "loopback";
  return isTestRealNetworkAllowed() ? "opted-in" : "refused";
}
//@ chunk-bwbq4xvm.js:160863-161119 placement
function formatBlockedTestRequest(e, s) {
  return (
    `Blocked under test: ${e} ${s} \u2014 test runtimes must not reach the network. ` +
    "Run the file via `bun run test:file -- <path>` with this request mocked, or set CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK=1 for an intentional live probe."
  );
}
//@ chunk-bwbq4xvm.js:161119-161322 placement
/**
 * axios 请求拦截器：测试运行时拒绝非回环请求（含重定向），opted-in 时在 stderr 告警。
 */
function axiosTestEgressInterceptor(e) {
  let uri = axios_default.getUri(e);
  let upper = (e.method ?? "get").toUpperCase();
  switch (classifyTestEgress(uri)) {
    case "loopback":
      return guardAxiosRedirects(e, upper);
    case "opted-in":
      process.stderr.write(formatLiveTestRequestWarning(upper, uri));
      return e;
    case "refused":
      throw new TestEgressBlockedError(formatBlockedTestRequest(upper, uri));
  }
}
//@ chunk-bwbq4xvm.js:161322-161605 placement
function guardAxiosRedirects(e, s) {
  let beforeRedirect = e.beforeRedirect;
  e.beforeRedirect = (r, a) => {
    let href = typeof r.href === "string" ? r.href : "";
    switch (classifyTestEgress(href)) {
      case "loopback":
        break;
      case "opted-in":
        process.stderr.write(formatLiveTestRequestWarning(s, href));
        break;
      case "refused":
        process.stderr.write(`${formatBlockedTestRequest(s, href)}
`);
        throw new TestEgressBlockedError(formatBlockedTestRequest(s, href));
    }
    beforeRedirect?.(r, a);
  };
  return e;
}
//@ chunk-bwbq4xvm.js:161660-161748 placement
function hasAxiosProxyInterceptor() {
  return (
    axios_default.interceptors.request.handlers?.some(
      (handler) => handler?.fulfilled === axiosTestEgressInterceptor,
    ) ?? false
  );
}
//@ chunk-bwbq4xvm.js:161748-161771 placement
function isTestRuntime() {
  return false;
}
//@ chunk-bwbq4xvm.js:161771-161793 placement
function noteExternalHttpUse() {
  return;
}
//@ chunk-bwbq4xvm.js:161793-161962 placement
function guardTestFetch(e, method, n) {
  if (e !== originalGlobalFetch || !isTestRuntime()) return;
  switch (classifyTestEgress(n)) {
    case "loopback":
      return;
    case "opted-in":
      process.stderr.write(formatLiveTestRequestWarning(method, n));
      return;
    case "refused":
      throw new TestEgressBlockedError(formatBlockedTestRequest(method, n));
  }
}
//@ chunk-bwbq4xvm.js:161962-162071 placement
function guardTestFetchRedirect(e, method, n) {
  if (e !== originalGlobalFetch || !isTestRuntime()) return;
  if (n.redirected && classifyTestEgress(n.url) === "refused")
    throw new TestEgressBlockedError(formatBlockedTestRequest(method, n.url));
}
//@ chunk-bwbq4xvm.js:162071-162169 placement
function guardBunFetchSession(tlsFetchSession, s, endpoint) {
  if (!isBunFetchSession(tlsFetchSession)) return;
  try {
    guardTestFetch(originalGlobalFetch, s, endpoint);
  } catch (error) {
    if (error instanceof TestEgressBlockedError) onTestEgressBlocked?.(error);
    throw error;
  }
}
//@ chunk-bwbq4xvm.js:162169-162264 placement
function isBunFetchSession(e) {
  return typeof Bun !== "undefined" && Bun.FetchSession !== undefined && e instanceof Bun.FetchSession;
}
//@ chunk-bwbq4xvm.js:162264-162271 placement
var onTestEgressBlocked;
//@ chunk-bwbq4xvm.js:162271-162474 placement
function guardTestWebSocket(url, s) {
  if (!isTestRuntime() || (s !== undefined && s !== ORIGINAL_WEBSOCKET)) return;
  switch (classifyTestEgress(url)) {
    case "loopback":
      return;
    case "opted-in":
      process.stderr.write(formatLiveTestRequestWarning("WS", url));
      return;
    case "refused": {
      let n = new TestEgressBlockedError(formatBlockedTestRequest("WS", url));
      onTestEgressBlocked?.(n);
      throw n;
    }
  }
}
//@ chunk-bwbq4xvm.js:162474-162612 placement
/**
 * 包装 fetch：请求前后各做一次测试出网检查。
 */
async function testGuardedFetch(e, s, tlsSessionFetch) {
  let r = globalThis.fetch;
  let { method, url } = requestMethodAndUrl(e, s);
  guardTestFetch(r, method, url);
  let h = await (tlsSessionFetch && r === originalGlobalFetch ? tlsSessionFetch : r)(e, s);
  guardTestFetchRedirect(r, method, h);
  return h;
}
export {
  hasAxiosProxyInterceptor,
  axiosTestEgressInterceptor,
  guardBunFetchSession,
  noteExternalHttpUse,
  guardTestWebSocket,
  requestMethodAndUrl,
  guardTestFetch,
  guardTestFetchRedirect,
  testGuardedFetch,
};
