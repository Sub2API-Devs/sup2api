/**
 * services/claudeGateway/versionInfo.ts
 *
 * 2.1.316 新增：网关版本信息
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { forwardedRequestParts, STRIPPED_RESPONSE_HEADERS } from "./proxyRequest.js";
import { copyHeadersInto, setUserIdentityHeaders } from "./messagesHandler.js";
import { fetchWithAbortTimeout, stripResponseHeaders, withUpstreamRequestIds } from "./upstreamErrors.js";
import { ssrfSafeFetch } from "./ssrfGuard.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";

//@ chunk-1hnjmk23.js:1371661-1373107 placement
/**
 * 原样转发请求到 HTTP 上游：过滤头、User-Agent 加 cc-gateway/版本、身份与认证头，带超时；回写过滤后的响应与上游请求 id。
 */
async function forwardRawRequest(request, pathname, body, upstream, ttfbMs, identity) {
  let requestParts = forwardedRequestParts(request);
  let targetUrl = `${upstream.baseUrl.replace(/\/$/, "")}${pathname}${requestParts.search}`;
  let headers = requestParts.headers;
  let VERSION =
    typeof {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    } !== "undefined"
      ? {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      : "unknown";
  let userAgent = headers.get("user-agent");
  headers.set("user-agent", userAgent ? `${userAgent} cc-gateway/${VERSION}` : `cc-gateway/${VERSION}`);
  copyHeadersInto(headers, upstream);
  setUserIdentityHeaders(headers, upstream, identity);
  await upstream.applyAuth(headers);
  let upstreamResponse = await fetchWithAbortTimeout(
    upstream.fetch ?? ssrfSafeFetch,
    targetUrl,
    {
      method: request.method,
      headers,
      body,
      duplex: "half",
      ...getProxyFetchOptions({
        url: targetUrl,
      }),
      timeout: false,
    },
    request.signal,
    ttfbMs,
  );
  let response = new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: stripResponseHeaders(upstreamResponse.headers, STRIPPED_RESPONSE_HEADERS),
  });
  return withUpstreamRequestIds(response, upstreamResponse.headers);
}
export { forwardRawRequest };
