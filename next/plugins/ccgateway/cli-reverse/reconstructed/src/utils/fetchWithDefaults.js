/**
 * utils/fetchWithDefaults.ts
 *
 * 2.1.316 新增：带默认值的 fetch。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6gs34xvs.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-6gs34xvs.js:319-475 placement
/**
 * 把 Headers、二维数组或普通对象形式的请求头转成普通对象。
 */
function headersToObject(headers) {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return {
    ...headers,
  };
}
//@ chunk-6gs34xvs.js:475-634 placement
/**
 * 包装 fetch，使每次请求合并默认 init（请求头逐项合并）。
 */
function createFetchWithDefaults(baseFetch = fetch, defaults) {
  if (!defaults) return baseFetch;
  return async (url, init) => {
    let merged = {
      ...defaults,
      ...init,
      headers: init?.headers
        ? {
            ...headersToObject(defaults.headers),
            ...headersToObject(init.headers),
          }
        : defaults.headers,
    };
    return baseFetch(url, merged);
  };
}
export { createFetchWithDefaults, headersToObject };
