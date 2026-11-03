/**
 * json-bigint/lib/stringify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-bigint@1.0.0
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Ir } from "../../bignumber.js/bignumber.js";

//@ chunk-na3pph4p.js:37695-39504 cjs-fingerprint
var nn = x(function (qd, sn) {
  var tn = Ir(),
    rn = qd;
  (function () {
    function e(k) {
      return k < 10 ? "0" + k : k;
    }
    var t =
        /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      r =
        /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      s,
      n,
      a = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", '"': '\\"', "\\": "\\\\" },
      h;
    function g(k) {
      return (
        (r.lastIndex = 0),
        r.test(k)
          ? '"' +
            k.replace(r, function (T) {
              var j = a[T];
              return typeof j === "string" ? j : "\\u" + ("0000" + T.charCodeAt(0).toString(16)).slice(-4);
            }) +
            '"'
          : '"' + k + '"'
      );
    }
    function E(k, T) {
      var j,
        I,
        Y,
        K,
        S = s,
        P,
        O = T[k],
        G = O != null && (O instanceof tn || tn.isBigNumber(O));
      if (O && typeof O === "object" && typeof O.toJSON === "function") O = O.toJSON(k);
      if (typeof h === "function") O = h.call(T, k, O);
      switch (typeof O) {
        case "string":
          if (G) return O;
          else return g(O);
        case "number":
          return isFinite(O) ? String(O) : "null";
        case "boolean":
        case "null":
        case "bigint":
          return String(O);
        case "object":
          if (!O) return "null";
          if (((s += n), (P = []), Object.prototype.toString.apply(O) === "[object Array]")) {
            K = O.length;
            for (j = 0; j < K; j += 1) P[j] = E(j, O) || "null";
            return (
              (Y =
                P.length === 0
                  ? "[]"
                  : s
                    ? `[
` +
                      s +
                      P.join(
                        `,
` + s,
                      ) +
                      `
` +
                      S +
                      "]"
                    : "[" + P.join(",") + "]"),
              (s = S),
              Y
            );
          }
          if (h && typeof h === "object") {
            K = h.length;
            for (j = 0; j < K; j += 1)
              if (typeof h[j] === "string") {
                if (((I = h[j]), (Y = E(I, O)), Y)) P.push(g(I) + (s ? ": " : ":") + Y);
              }
          } else
            Object.keys(O).forEach(function (Z) {
              var ie = E(Z, O);
              if (ie) P.push(g(Z) + (s ? ": " : ":") + ie);
            });
          return (
            (Y =
              P.length === 0
                ? "{}"
                : s
                  ? `{
` +
                    s +
                    P.join(
                      `,
` + s,
                    ) +
                    `
` +
                    S +
                    "}"
                  : "{" + P.join(",") + "}"),
            (s = S),
            Y
          );
      }
    }
    if (typeof rn.stringify !== "function")
      rn.stringify = function (k, T, j) {
        var I;
        if (((s = ""), (n = ""), typeof j === "number")) for (I = 0; I < j; I += 1) n += " ";
        else if (typeof j === "string") n = j;
        if (
          ((h = T), T && typeof T !== "function" && (typeof T !== "object" || typeof T.length !== "number"))
        )
          throw Error("JSON.stringify");
        return E("", { "": k });
      };
  })();
});

export { nn };
