/**
 * @anthropic-ai/sdk/core/middleware.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (7)
 * attribution: esm-layout 1, esm-fingerprint 6
 */
import { Kje, V7t } from "../internal/errors.mjs";
import { ef, AHn, pr } from "./error.mjs";
import { Tb, hu } from "../internal/utils/log.mjs";
import { St } from "./streaming.mjs";
import { ar } from "../internal/parse.mjs";

//@ chunk-hwmsct5x.js:34791-34810 esm-layout
var weakSet = new WeakSet();
//@ chunk-hwmsct5x.js:34810-34873 esm-fingerprint
function Vi(e) {
  return typeof e === "object" && e !== null && weakSet.has(e);
}
//@ chunk-hwmsct5x.js:34873-35039 esm-fingerprint
function bu(e) {
  let n = new Set();
  while (typeof e === "object" && e !== null && !n.has(e)) {
    if ((n.add(e), Vi(e) || Kje(e) || e instanceof ef || e instanceof AHn)) return !0;
    e = e.cause;
  }
  return !1;
}
//@ chunk-hwmsct5x.js:35039-35483 esm-fingerprint
function wrapFetchWithMiddleware(e, n, r, s) {
  return async (h, y = {}) => {
    if (n.length === 0) return e.call(void 0, h, y);
    let w = y.headers instanceof Headers ? y.headers : new Headers(y.headers),
      S = await composeMiddleware(
        e,
        n,
        r,
        s,
      )({ ...y, headers: w, url: typeof h === "string" ? h : h instanceof URL ? h.href : h.url });
    if (S.bodyUsed || S.body?.locked)
      throw new pr(
        "middleware consumed the response body; use response.clone() to inspect it, or return new Response(body, response) to consume and replace it",
      );
    return S;
  };
}
//@ chunk-hwmsct5x.js:35483-35655 esm-fingerprint
function Bh(e, n) {
  let weakMap = new WeakMap();
  return {
    options: e,
    logger: n ? Tb(n) : hu(),
    parse(s) {
      if (e?.stream && s.ok) return parseResponseBody(s, e, n);
      let h = weakMap.get(s);
      if (!h) ((h = parseResponseBody(s, e, n)), weakMap.set(s, h));
      return h;
    },
  };
}
//@ chunk-hwmsct5x.js:35655-36235 esm-fingerprint
async function parseResponseBody(e, n, r) {
  if (e.bodyUsed || e.body?.locked)
    throw new pr(
      "cannot ctx.parse() a response whose body was already consumed; call ctx.parse() instead of reading the body, or read via response.clone()",
    );
  if (n?.stream && e.ok) return St.fromSSEResponse(e.clone(), new AbortController(), r);
  if (e.status === 204) return null;
  if (n?.__binaryResponse) return e;
  let h = e.headers.get("content-type")?.split(";")[0]?.trim();
  if (h?.includes("application/json") || h?.endsWith("+json")) {
    if (e.headers.get("content-length") === "0") return;
    return ar(await e.clone().json(), e);
  }
  return await e.clone().text();
}
//@ chunk-hwmsct5x.js:36235-36448 esm-fingerprint
function composeMiddleware(e, n, r, s) {
  let h = async ({ url: url, ...S }) => {
      try {
        return await e.call(void 0, url, S);
      } catch (error) {
        let R = V7t(error);
        throw (weakSet.add(R), R);
      }
    },
    y = Bh(r, s);
  for (let w = n.length - 1; w >= 0; w--) {
    let S = n[w],
      E = h;
    h = async (R) => S(R, E, y);
  }
  return h;
}

export { wrapFetchWithMiddleware, bu, Vi };
