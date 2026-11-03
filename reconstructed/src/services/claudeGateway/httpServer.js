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
var Is = { "Cache-Control": "no-store", Pragma: "no-cache" },
  yve = 500,
  V1 = 5000;
/**
 * OAuth 风格错误响应 {error, error_description}。
 */
//@ chunk-1ny7cxrt.js:1520327-1520432 placement
function oauthErrorResponse(e, t = 400, n) {
  return Response.json({ error: e, ...(n && { error_description: n }) }, { status: t, headers: Is });
}
//@ chunk-1ny7cxrt.js:1520432-1520492 placement
function Zd() {
  return new Response("not found", { status: 404 });
}
/**
 * User-Agent 是否来自宿主入口的 Claude Code 客户端。
 */
//@ chunk-1ny7cxrt.js:1520492-1520628 placement
function isHostEntrypointClient(e) {
  let t = /^claude-(?:cli|code)\/\S+ \(([^)]*)\)/.exec(e ?? "")?.[1];
  return t !== void 0 && t.split(",").some((n) => isHostEntrypointName(n.trim()));
}
//@ chunk-1ny7cxrt.js:1520628-1520720 placement
function q1(e, t) {
  return e !== null ? { cri: !0, org: e.org, act: e.act?.sub ?? null, upstream_kind: t } : {};
}
/**
 * 网关需要原生二进制（Bun），否则报错。
 */
//@ chunk-1ny7cxrt.js:1520720-1520868 placement
function assertNativeBinary() {
  if (typeof Bun > "u")
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
/**
 * 补上安全响应头（HTTPS 时加 HSTS）。
 */
//@ chunk-1ny7cxrt.js:1521013-1521245 placement
function withSecurityHeaders(e, t) {
  for (let [n, o] of Object.entries(SECURITY_HEADERS)) if (!e.headers.has(n)) e.headers.set(n, o);
  if (t && !e.headers.has("Strict-Transport-Security"))
    e.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return e;
}
//@ chunk-1ny7cxrt.js:1521245-1521471 placement
var X_CLIENT_REQUEST_ID = "x-client-request-id",
  X_REQUEST_ID = "x-request-id",
  tO = /^[A-Za-z0-9._-]{1,64}$/,
  W1 = [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "::1/128",
    "fc00::/7",
  ],
  Y1 = /connect|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i;
/**
 * 启动时连接 Postgres 失败最多重试 3 次（间隔 2 秒）。
 */
//@ chunk-1ny7cxrt.js:1521471-1521692 placement
async function retryPostgresConnect(e) {
  for (let t = 1; ; t++)
    try {
      return await e();
    } catch (error) {
      let o = errorMessage(error);
      if (t === 3 || !Y1.test(o)) throw error;
      (gatewayLog(
        "warn",
        `could not connect to Postgres at boot, attempt ${t} of 3: ${o}. Trying again in 2s`,
      ),
        await sleep(2000));
    }
}

export {
  assertNativeBinary,
  W1,
  retryPostgresConnect,
  Y1,
  V1,
  yve,
  Zd,
  oauthErrorResponse,
  Is,
  isHostEntrypointClient,
  q1,
  tO,
  X_CLIENT_REQUEST_ID,
  X_REQUEST_ID,
  withSecurityHeaders,
};
