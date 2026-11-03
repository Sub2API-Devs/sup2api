/**
 * @anthropic-ai/sdk/internal/parse.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { pr } from "../core/error.mjs";
import { rr } from "./shims.mjs";
import { h4t } from "./utils/bytes.mjs";
import { Tb, wt } from "./utils/log.mjs";
import { St } from "../core/streaming.mjs";
import { releaseAbortListener } from "./request-signal.mjs";

//@ chunk-hwmsct5x.js:32502-33815 esm-layout
async function* mu(e, n) {
  if (!e.body) {
    if ((n.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative"))
      throw new pr(
        "The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api",
      );
    throw new pr("Attempted to iterate over a response with no body");
  }
  let textDecoder = new TextDecoder("utf-8", { ignoreBOM: !0 }),
    s = "",
    h = null,
    y = [],
    w = [],
    S = (E) => {
      if (E.charCodeAt(0) === 65279) E = E.slice(1);
      if (!E) {
        if (!h && !y.length) return null;
        let M = {
          event: h,
          data: y.join(`
`),
          raw: w,
        };
        return ((h = null), (y = []), (w = []), M);
      }
      w.push(E);
      let index = E.indexOf(":");
      if (index === 0) return null;
      let L = index === -1 ? E : E.slice(0, index);
      if (L !== "event" && L !== "data") return null;
      let O = index === -1 ? "" : E.slice(E.charCodeAt(index + 1) === 32 ? index + 2 : index + 1);
      if (L === "event") h = O;
      else y.push(O);
      return null;
    };
  for await (let E of rr(e.body)) {
    if (E == null) continue;
    s += textDecoder.decode(typeof E === "string" ? h4t(E) : E, { stream: !0 });
    let R = 0;
    if (!s.includes("\r")) {
      let L;
      while (
        (L = s.indexOf(
          `
`,
          R,
        )) !== -1
      ) {
        let O = S(s.slice(R, L));
        if (((R = L + 1), O)) yield O;
      }
    } else
      for (let L = 0; L < s.length; L++) {
        let O = s[L];
        if (
          O !==
            `
` &&
          O !== "\r"
        )
          continue;
        if (O === "\r" && L + 1 === s.length) break;
        let M = S(s.slice(R, L));
        if (
          O === "\r" &&
          s[L + 1] ===
            `
`
        )
          L++;
        if (((R = L + 1), M)) yield M;
      }
    s = s.slice(R);
  }
  if (((s += textDecoder.decode()), s))
    for (let E of s.replace(/\r$/, "").split(/\r\n|[\n\r]/)) {
      let R = S(E);
      if (R) yield R;
    }
}
//@ chunk-hwmsct5x.js:33815-34546 esm-fingerprint
async function Xo(e, n) {
  let {
      response: response,
      requestLogID: requestLogID,
      retryOfRequestLogID: retryOfRequestLogID,
      startTime: startTime,
    } = n,
    w = await (async () => {
      if (n.options.stream)
        return (
          Tb(e).debug("response", response.status, response.url, response.headers, response.body),
          St.fromSSEResponse(response, n.controller, e)
        );
      if (response.status === 204) return null;
      if (n.options.__binaryResponse) return response;
      let E = response.headers.get("content-type")?.split(";")[0]?.trim();
      if (E?.includes("application/json") || E?.endsWith("+json")) {
        if (response.headers.get("content-length") === "0") return;
        let body = await response.json();
        return ar(body, response);
      }
      return await response.text();
    })().finally(() => {
      if (!n.options.stream && !n.options.__binaryResponse) releaseAbortListener(n.controller);
    });
  return (
    wt(Tb(e), `[${requestLogID}] response parsed`, {
      retryOfRequestLogID: retryOfRequestLogID,
      url: response.url,
      status: response.status,
      body: w,
      durationMs: Date.now() - startTime,
    }),
    w
  );
}
//@ chunk-hwmsct5x.js:34546-34791 esm-fingerprint
function ar(e, n) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return e;
  return Object.defineProperties(e, {
    _request_id: { value: n.headers.get("request-id"), enumerable: !1 },
    _workspace_id: { value: n.headers.get("anthropic-workspace-id"), enumerable: !1 },
  });
}

export { mu, ar, Xo };
