/**
 * utils/testNetworkGuard.ts
 *
 * 2.1.316 新增：测试运行时出网守卫。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (19)
 * attribution: placement 19
 */
import ws from "ws";
import { isEnvTruthy } from "./envUtils.js";
import { isLoopbackHost } from "./localhost.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:159541-159619 placement
class TestEgressBlockedError extends Error {
  name = "TestEgressBlockedError";
  code = "TestEgressBlocked";
}
//@ chunk-7kayq7nc.js:159619-159649 placement
var originalGlobalFetch; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ORIGINAL_WEBSOCKET;
deferInit("chunk-7kayq7nc.js:159619", () => {
  originalGlobalFetch = globalThis.fetch;
  ORIGINAL_WEBSOCKET = ws;
});
//@ chunk-7kayq7nc.js:159649-159814 placement
function requestMethodAndUrl(input, init) {
  if (input instanceof Request)
    return {
      method: (init?.method ?? input.method).toUpperCase(),
      url: input.url,
    };
  return {
    method: (init?.method ?? "GET").toUpperCase(),
    url: String(input),
  };
}
//@ chunk-7kayq7nc.js:159814-159887 placement
function isTestRealNetworkAllowed() {
  return isEnvTruthy(process.env.CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK);
}
//@ chunk-7kayq7nc.js:159887-159995 placement
function formatLiveTestRequestWarning(request, testRuntime) {
  return `[CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK] live request from a test runtime: ${request} ${testRuntime}
`;
}
//@ chunk-7kayq7nc.js:159995-160112 placement
/**
 * 测试运行时出网判定：回环地址 loopback；设了 CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK 为 opted-in；否则 refused。
 */
function classifyTestEgress(url) {
  let isLoopback;
  try {
    isLoopback = isLoopbackHost(new URL(url).hostname);
  } catch {
    isLoopback = false;
  }
  if (isLoopback) return "loopback";
  return isTestRealNetworkAllowed() ? "opted-in" : "refused";
}
//@ chunk-7kayq7nc.js:160112-160368 placement
function formatBlockedTestRequest(method, url) {
  return (
    `Blocked under test: ${method} ${url} \u2014 test runtimes must not reach the network. ` +
    "Run the file via `bun run test:file -- <path>` with this request mocked, or set CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK=1 for an intentional live probe."
  );
}
//@ chunk-7kayq7nc.js:160368-160571 placement
/**
 * axios 请求拦截器：测试运行时拒绝非回环请求（含重定向），opted-in 时在 stderr 告警。
 */
function axiosTestEgressInterceptor(options) {
  let uri = axios_default.getUri(options);
  let handler = (options.method ?? "get").toUpperCase();
  switch (classifyTestEgress(uri)) {
    case "loopback":
      return guardAxiosRedirects(options, handler);
    case "opted-in":
      process.stderr.write(formatLiveTestRequestWarning(handler, uri));
      return options;
    case "refused":
      throw new TestEgressBlockedError(formatBlockedTestRequest(handler, uri));
  }
}
//@ chunk-7kayq7nc.js:160571-160854 placement
function guardAxiosRedirects(options, handler) {
  let beforeRedirect = options.beforeRedirect;
  options.beforeRedirect = (target, response) => {
    let href = typeof target.href === "string" ? target.href : "";
    switch (classifyTestEgress(href)) {
      case "loopback":
        break;
      case "opted-in":
        process.stderr.write(formatLiveTestRequestWarning(handler, href));
        break;
      case "refused":
        process.stderr.write(`${formatBlockedTestRequest(handler, href)}
`);
        throw new TestEgressBlockedError(formatBlockedTestRequest(handler, href));
    }
    beforeRedirect?.(target, response);
  };
  return options;
}
//@ chunk-7kayq7nc.js:160909-160997 placement
function hasAxiosProxyInterceptor() {
  return (
    axios_default.interceptors.request.handlers?.some(
      (handler) => handler?.fulfilled === axiosTestEgressInterceptor,
    ) ?? false
  );
}
//@ chunk-7kayq7nc.js:160997-161020 placement
function isTestRuntime() {
  return false;
}
//@ chunk-7kayq7nc.js:161020-161042 placement
function noteExternalHttpUse() {
  return;
}
//@ chunk-7kayq7nc.js:161042-161211 placement
function guardTestFetch(fetchImpl, method, init) {
  if (fetchImpl !== originalGlobalFetch || !isTestRuntime()) return;
  switch (classifyTestEgress(init)) {
    case "loopback":
      return;
    case "opted-in":
      process.stderr.write(formatLiveTestRequestWarning(method, init));
      return;
    case "refused":
      throw new TestEgressBlockedError(formatBlockedTestRequest(method, init));
  }
}
//@ chunk-7kayq7nc.js:161211-161320 placement
function guardTestFetchRedirect(fetchImpl, method, init) {
  if (fetchImpl !== originalGlobalFetch || !isTestRuntime()) return;
  if (init.redirected && classifyTestEgress(init.url) === "refused")
    throw new TestEgressBlockedError(formatBlockedTestRequest(method, init.url));
}
//@ chunk-7kayq7nc.js:161320-161418 placement
function guardBunFetchSession(tlsFetchSession, session, init) {
  if (!isBunFetchSession(tlsFetchSession)) return;
  try {
    guardTestFetch(originalGlobalFetch, session, init);
  } catch (error) {
    if (error instanceof TestEgressBlockedError) onTestEgressBlocked?.(error);
    throw error;
  }
}
//@ chunk-7kayq7nc.js:161418-161513 placement
function isBunFetchSession(value) {
  return typeof Bun !== "undefined" && Bun.FetchSession !== undefined && value instanceof Bun.FetchSession;
}
//@ chunk-7kayq7nc.js:161513-161520 placement
var onTestEgressBlocked;
//@ chunk-7kayq7nc.js:161520-161723 placement
function guardTestWebSocket(url, webSocketImpl) {
  if (!isTestRuntime() || (webSocketImpl !== undefined && webSocketImpl !== ORIGINAL_WEBSOCKET)) return;
  switch (classifyTestEgress(url)) {
    case "loopback":
      return;
    case "opted-in":
      process.stderr.write(formatLiveTestRequestWarning("WS", url));
      return;
    case "refused": {
      let init = new TestEgressBlockedError(formatBlockedTestRequest("WS", url));
      onTestEgressBlocked?.(init);
      throw init;
    }
  }
}
//@ chunk-7kayq7nc.js:161723-161861 placement
/**
 * 包装 fetch：请求前后各做一次测试出网检查。
 */
async function testGuardedFetch(input, init, tlsSessionFetch) {
  let originalFetch = globalThis.fetch;
  let { method, url } = requestMethodAndUrl(input, init);
  guardTestFetch(originalFetch, method, url);
  let response = await (
    tlsSessionFetch && originalFetch === originalGlobalFetch ? tlsSessionFetch : originalFetch
  )(input, init);
  guardTestFetchRedirect(originalFetch, method, response);
  return response;
}
export {
  guardBunFetchSession,
  hasAxiosProxyInterceptor,
  axiosTestEgressInterceptor,
  noteExternalHttpUse,
  requestMethodAndUrl,
  guardTestFetch,
  guardTestFetchRedirect,
  guardTestWebSocket,
  testGuardedFetch,
};
