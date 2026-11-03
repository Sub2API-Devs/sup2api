/**
 * services/claudeGateway/versionInfo.ts
 *
 * 2.1.316 新增：网关版本信息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: placement 1
 */
import { f_, STRIPPED_RESPONSE_HEADERS } from "./proxyRequest.js";
import { wE, setUserIdentityHeaders } from "./messagesHandler.js";
import { fetchWithAbortTimeout, stripResponseHeaders, withUpstreamRequestIds } from "./upstreamErrors.js";
import { ssrfSafeFetch } from "./ssrfGuard.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";

/**
 * 原样转发请求到 HTTP 上游：过滤头、User-Agent 加 cc-gateway/版本、身份与认证头，带超时；回写过滤后的响应与上游请求 id。
 */
//@ chunk-1ny7cxrt.js:1369882-1371328 placement
async function forwardRawRequest(e, t, n, o, r, s) {
  let a = f_(e),
    l = `${o.baseUrl.replace(/\/$/, "")}${t}${a.search}`,
    headers = a.headers,
    u =
      typeof {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      } < "u"
        ? {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
        : "unknown",
    f = headers.get("user-agent");
  (headers.set("user-agent", f ? `${f} cc-gateway/${u}` : `cc-gateway/${u}`),
    wE(headers, o),
    setUserIdentityHeaders(headers, o, s),
    await o.applyAuth(headers));
  let h = await fetchWithAbortTimeout(
      o.fetch ?? ssrfSafeFetch,
      l,
      {
        method: e.method,
        headers: headers,
        body: n,
        duplex: "half",
        ...getProxyFetchOptions({ url: l }),
        timeout: !1,
      },
      e.signal,
      r,
    ),
    response = new Response(h.body, {
      status: h.status,
      statusText: h.statusText,
      headers: stripResponseHeaders(h.headers, STRIPPED_RESPONSE_HEADERS),
    });
  return withUpstreamRequestIds(response, h.headers);
}

export { forwardRawRequest };
