/**
 * @anthropic-ai/sdk/internal/parse.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { AnthropicError } from "../core/error.mjs";
import { ReadableStreamToAsyncIterable } from "./shims.mjs";
import { encodeUTF8 } from "./utils/bytes.mjs";
import { loggerFor, debugLogRequestDetails } from "./utils/log.mjs";
import { Stream } from "../core/streaming.mjs";
import { releaseAbortListener } from "./request-signal.mjs";

//@ chunk-hwmsct5x.js:32502-33815 esm-layout
async function* mu(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative")
      throw new AnthropicError(
        "The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api",
      );
    throw new AnthropicError("Attempted to iterate over a response with no body");
  }
  let textDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
  });
  let s = "";
  let h = null;
  let y = [];
  let w = [];
  let S = (E) => {
    if (E.charCodeAt(0) === 65279) E = E.slice(1);
    if (!E) {
      if (!h && !y.length) return null;
      let M = {
        event: h,
        data: y.join(`
`),
        raw: w,
      };
      h = null;
      y = [];
      w = [];
      return M;
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
  for await (let E of ReadableStreamToAsyncIterable(response.body)) {
    if (E == null) continue;
    s += textDecoder.decode(typeof E === "string" ? encodeUTF8(E) : E, {
      stream: true,
    });
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
        R = L + 1;
        if (O) yield O;
      }
    } else
      for (let j = 0; j < s.length; j++) {
        let O = s[j];
        if (
          O !==
            `
` &&
          O !== "\r"
        )
          continue;
        if (O === "\r" && j + 1 === s.length) break;
        let M = S(s.slice(R, j));
        if (
          O === "\r" &&
          s[j + 1] ===
            `
`
        )
          j++;
        R = j + 1;
        if (M) yield M;
      }
    s = s.slice(R);
  }
  s += textDecoder.decode();
  if (s)
    for (let line of s.replace(/\r$/, "").split(/\r\n|[\n\r]/)) {
      let R = S(line);
      if (R) yield R;
    }
}
//@ chunk-hwmsct5x.js:33815-34546 esm-fingerprint
async function Xo(client, props) {
  let { response, requestLogID, retryOfRequestLogID, startTime } = props;
  let w = await (async () => {
    if (props.options.stream) {
      loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
      return Stream.fromSSEResponse(response, props.controller, client);
    }
    if (response.status === 204) return null;
    if (props.options.__binaryResponse) return response;
    let trimmed = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (trimmed?.includes("application/json") || trimmed?.endsWith("+json")) {
      if (response.headers.get("content-length") === "0") return;
      let body = await response.json();
      return addResponseIDs(body, response);
    }
    return await response.text();
  })().finally(() => {
    if (!props.options.stream && !props.options.__binaryResponse) releaseAbortListener(props.controller);
  });
  debugLogRequestDetails(loggerFor(client), `[${requestLogID}] response parsed`, {
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body: w,
    durationMs: Date.now() - startTime,
  });
  return w;
}
//@ chunk-hwmsct5x.js:34546-34791 esm-fingerprint
function addResponseIDs(e, response) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return e;
  return Object.defineProperties(e, {
    _request_id: {
      value: response.headers.get("request-id"),
      enumerable: false,
    },
    _workspace_id: {
      value: response.headers.get("anthropic-workspace-id"),
      enumerable: false,
    },
  });
}
export { mu, addResponseIDs, Xo };
