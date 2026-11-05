/**
 * @anthropic-ai/sdk/core/middleware.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (7)
 * attribution: esm-layout 1, esm-fingerprint 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbortError_2, castToError } from "../internal/errors.mjs";
import { APIConnectionError, RetryableError, AnthropicError } from "./error.mjs";
import { loggerFor, defaultLogger } from "../internal/utils/log.mjs";
import { Stream } from "./streaming.mjs";
import { addResponseIDs } from "../internal/parse.mjs";

//@ chunk-vn3g7zt8.js:35162-35181 esm-layout
var fetchOriginErrors = new WeakSet();
//@ chunk-vn3g7zt8.js:35181-35244 esm-fingerprint
function isFetchOriginError(err) {
  return typeof err === "object" && err !== null && fetchOriginErrors.has(err);
}
//@ chunk-vn3g7zt8.js:35244-35410 esm-fingerprint
function isRetryableError(err) {
  let seen = new Set();
  while (typeof err === "object" && err !== null && !seen.has(err)) {
    seen.add(err);
    if (
      isFetchOriginError(err) ||
      isAbortError_2(err) ||
      err instanceof APIConnectionError ||
      err instanceof RetryableError
    )
      return true;
    err = err.cause;
  }
  return false;
}
//@ chunk-vn3g7zt8.js:35410-35854 esm-fingerprint
function wrapFetchWithMiddleware(fetchFn, middleware, options, client) {
  return async (url, init = {}) => {
    if (middleware.length === 0) return fetchFn.call(undefined, url, init);
    let headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
    let response = await composeMiddleware(
      fetchFn,
      middleware,
      options,
      client,
    )({
      ...init,
      headers,
      url: typeof url === "string" ? url : url instanceof URL ? url.href : url.url,
    });
    if (response.bodyUsed || response.body?.locked)
      throw new AnthropicError(
        "middleware consumed the response body; use response.clone() to inspect it, or return new Response(body, response) to consume and replace it",
      );
    return response;
  };
}
//@ chunk-vn3g7zt8.js:35854-36026 esm-fingerprint
function createMiddlewareContext(options, client) {
  let cache = new WeakMap();
  return {
    options,
    logger: client ? loggerFor(client) : defaultLogger(),
    parse(response) {
      if (options?.stream && response.ok) return parseResponseBody(response, options, client);
      let parsed = cache.get(response);
      if (!parsed) {
        parsed = parseResponseBody(response, options, client);
        cache.set(response, parsed);
      }
      return parsed;
    },
  };
}
//@ chunk-vn3g7zt8.js:36026-36606 esm-fingerprint
async function parseResponseBody(response, options, client) {
  if (response.bodyUsed || response.body?.locked)
    throw new AnthropicError(
      "cannot ctx.parse() a response whose body was already consumed; call ctx.parse() instead of reading the body, or read via response.clone()",
    );
  if (options?.stream && response.ok)
    return Stream.fromSSEResponse(response.clone(), new AbortController(), client);
  if (response.status === 204) return null;
  if (options?.__binaryResponse) return response;
  let mediaType = response.headers.get("content-type")?.split(";")[0]?.trim();
  if (mediaType?.includes("application/json") || mediaType?.endsWith("+json")) {
    if (response.headers.get("content-length") === "0") return;
    return addResponseIDs(await response.clone().json(), response);
  }
  return await response.clone().text();
}
//@ chunk-vn3g7zt8.js:36606-36819 esm-fingerprint
function composeMiddleware(fetchFn, middleware, options, client) {
  let next = async ({ url, ...init }) => {
    try {
      return await fetchFn.call(undefined, url, init);
    } catch (err) {
      let error = castToError(err);
      fetchOriginErrors.add(error);
      throw error;
    }
  };
  let ctx = createMiddlewareContext(options, client);
  for (let i = middleware.length - 1; i >= 0; i--) {
    let mw = middleware[i];
    let nextInner = next;
    next = async (request) => mw(request, nextInner, ctx);
  }
  return next;
}
export { wrapFetchWithMiddleware, isRetryableError, isFetchOriginError };
