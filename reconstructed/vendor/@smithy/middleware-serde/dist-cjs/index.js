/**
 * @smithy/middleware-serde/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/middleware-serde@4.2.6..4.2.12
 * pieces: chunk-83tv5s1x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Kg } from "../../protocol-http/dist-cjs/index.js";

//@ chunk-83tv5s1x.js:339-2070 cjs-fingerprint
var Yns = x(function (B) {
  var N = Kg(),
    g = (e, r) => (t, i) => async (n) => {
      let { response: response } = await t(n);
      try {
        let s = await r(response, e);
        return { response: response, output: s };
      } catch (error) {
        if (
          (Object.defineProperty(error, "$response", {
            value: response,
            enumerable: !1,
            writable: !1,
            configurable: !1,
          }),
          !("$metadata" in error))
        ) {
          try {
            error.message += `
  Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.`;
          } catch (error) {
            if (!i.logger || i.logger?.constructor?.name === "NoOpLogger")
              console.warn(
                "Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.",
              );
            else
              i.logger?.warn?.(
                "Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.",
              );
          }
          if (typeof error.$responseBodyText < "u") {
            if (error.$response) error.$response.body = error.$responseBodyText;
          }
          try {
            if (N.HttpResponse.isInstance(response)) {
              let { headers: headers = {} } = response,
                entries = Object.entries(headers);
              error.$metadata = {
                httpStatusCode: response.statusCode,
                requestId: m(/^x-[\w-]+-request-?id$/, entries),
                extendedRequestId: m(/^x-[\w-]+-id-2$/, entries),
                cfId: m(/^x-[\w-]+-cf-id$/, entries),
              };
            }
          } catch (error) {}
        }
        throw error;
      }
    },
    m = (e, r) => (r.find(([t]) => t.match(e)) || [void 0, void 0])[1],
    S = (e, r) => (t, i) => async (n) => {
      let o = e,
        s = i.endpointV2?.url && o.urlParser ? async () => o.urlParser(i.endpointV2.url) : o.endpoint;
      if (!s) throw Error("No valid endpoint provider available.");
      let c = await r(n.input, { ...e, endpoint: s });
      return t({ ...n, request: c });
    },
    A = { name: "deserializerMiddleware", step: "deserialize", tags: ["DESERIALIZER"], override: !0 },
    v = { name: "serializerMiddleware", step: "serialize", tags: ["SERIALIZER"], override: !0 };
  function j(e, r, t) {
    return {
      applyToStack: (i) => {
        (i.add(g(e, t), A), i.add(S(e, r), v));
      },
    };
  }
  B.deserializerMiddleware = g;
  B.deserializerMiddlewareOption = A;
  B.getSerdePlugin = j;
  B.serializerMiddleware = S;
  B.serializerMiddlewareOption = v;
});

export { Yns };
