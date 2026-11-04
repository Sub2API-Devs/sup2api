/**
 * services/claudeGateway/httpServer.ts
 *
 * 2.1.316 新增：网关 HTTP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (10)
 * attribution: placement 10
 */
import { isHostEntrypointName } from "../../utils/entrypointKinds.js";
import { errorMessage } from "../../utils/errors.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-1ny7cxrt.js:1520257-1520327 placement
/**
 * 连接 Postgres 重试的间隔毫秒数（5000）。
 */
var NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};
var PG_RETRY_MAX_ATTEMPTS = 500;
var PG_RETRY_INTERVAL_MS = 5000;
//@ chunk-1ny7cxrt.js:1520327-1520432 placement
/**
 * OAuth 风格错误响应 {error, error_description}。
 */
function oauthErrorResponse(error, status = 400, description) {
  return Response.json(
    {
      error,
      ...(description && {
        error_description: description,
      }),
    },
    {
      status,
      headers: NO_STORE_HEADERS,
    },
  );
}
//@ chunk-1ny7cxrt.js:1520432-1520492 placement
/**
 * 返回 404 not found 的响应。
 */
function notFoundResponse() {
  return new Response("not found", {
    status: 404,
  });
}
//@ chunk-1ny7cxrt.js:1520492-1520628 placement
/**
 * User-Agent 是否来自宿主入口的 Claude Code 客户端。
 */
function isHostEntrypointClient(userAgent) {
  let hostEntrypoint = /^claude-(?:cli|code)\/\S+ \(([^)]*)\)/.exec(userAgent ?? "")?.[1];
  return (
    hostEntrypoint !== undefined &&
    hostEntrypoint.split(",").some((name) => isHostEntrypointName(name.trim()))
  );
}
//@ chunk-1ny7cxrt.js:1520628-1520720 placement
/**
 * 由 CRI 令牌声明构造的运维字段（cri、org、act、upstream_kind）。
 */
function criIdentityFields(criClaims, upstreamKind) {
  return criClaims !== null
    ? {
        cri: true,
        org: criClaims.org,
        act: criClaims.act?.sub ?? null,
        upstream_kind: upstreamKind,
      }
    : {};
}
//@ chunk-1ny7cxrt.js:1520720-1520868 placement
/**
 * 网关需要原生二进制（Bun），否则报错。
 */
function assertNativeBinary() {
  if (typeof Bun === "undefined")
    throw Error(
      "claude gateway requires the native binary. Install via https://claude.ai/install.sh instead of npm.",
    );
}
//@ chunk-1ny7cxrt.js:1520868-1521013 placement
var SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
};
//@ chunk-1ny7cxrt.js:1521013-1521245 placement
/**
 * 补上安全响应头（HTTPS 时加 HSTS）。
 */
function withSecurityHeaders(response, secure) {
  for (let [key, value] of Object.entries(SECURITY_HEADERS))
    if (!response.headers.has(key)) response.headers.set(key, value);
  if (secure && !response.headers.has("Strict-Transport-Security"))
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}
//@ chunk-1ny7cxrt.js:1521245-1521471 placement
/**
 * 识别 Postgres 连接被拒/超时类错误的文案正则。
 */
var X_CLIENT_REQUEST_ID = "x-client-request-id";
var X_REQUEST_ID = "x-request-id";
var REQUEST_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
var PRIVATE_NETWORK_RANGES = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "::1/128",
  "fc00::/7",
];
var PG_CONNECT_REFUSED_RE = /connect|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i;
//@ chunk-1ny7cxrt.js:1521471-1521692 placement
/**
 * 启动时连接 Postgres 失败最多重试 3 次（间隔 2 秒）。
 */
async function retryPostgresConnect(connectFn) {
  for (let j = 1; ; j++)
    try {
      return await connectFn();
    } catch (error) {
      let message = errorMessage(error);
      if (j === 3 || !PG_CONNECT_REFUSED_RE.test(message)) throw error;
      gatewayLog(
        "warn",
        `could not connect to Postgres at boot, attempt ${j} of 3: ${message}. Trying again in 2s`,
      );
      await sleep(2000);
    }
}
export {
  assertNativeBinary,
  PRIVATE_NETWORK_RANGES,
  retryPostgresConnect,
  PG_CONNECT_REFUSED_RE,
  PG_RETRY_INTERVAL_MS,
  PG_RETRY_MAX_ATTEMPTS,
  notFoundResponse,
  oauthErrorResponse,
  NO_STORE_HEADERS,
  isHostEntrypointClient,
  criIdentityFields,
  REQUEST_ID_RE,
  X_CLIENT_REQUEST_ID,
  X_REQUEST_ID,
  withSecurityHeaders,
};
