/**
 * json-bigint/lib/stringify.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: json-bigint@1.0.0
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_bignumber } from "../../bignumber.js/bignumber.js";

//@ chunk-e8d3a8an.js:37695-39504 cjs-fingerprint
var require_stringify = __commonJS(function (cjsExports, cjsModule) {
  var BigNumber = require_bignumber();
  var stringifyExports = cjsExports;
  (function () {
    function f(n) {
      return n < 10 ? "0" + n : n;
    }
    var cx =
      /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var escapable =
      /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var gap;
    var indent;
    var meta = {
      "\b": "\\b",
      "\t": "\\t",
      "\n": "\\n",
      "\f": "\\f",
      "\r": "\\r",
      '"': '\\"',
      "\\": "\\\\",
    };
    var rep;
    function quote(string) {
      escapable.lastIndex = 0;
      return escapable.test(string)
        ? '"' +
            string.replace(escapable, function (a) {
              var c = meta[a];
              return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) +
            '"'
        : '"' + string + '"';
    }
    function str(key, holder) {
      var i;
      var k;
      var v;
      var length;
      var mind = gap;
      var partial;
      var value = holder[key];
      var isBigNumber = value != null && (value instanceof BigNumber || BigNumber.isBigNumber(value));
      if (value && typeof value === "object" && typeof value.toJSON === "function") value = value.toJSON(key);
      if (typeof rep === "function") value = rep.call(holder, key, value);
      switch (typeof value) {
        case "string":
          if (isBigNumber) return value;
          else return quote(value);
        case "number":
          return isFinite(value) ? String(value) : "null";
        case "boolean":
        case "null":
        case "bigint":
          return String(value);
        case "object":
          if (!value) return "null";
          gap += indent;
          partial = [];
          if (Object.prototype.toString.apply(value) === "[object Array]") {
            length = value.length;
            for (i = 0; i < length; i += 1) partial[i] = str(i, value) || "null";
            v =
              partial.length === 0
                ? "[]"
                : gap
                  ? `[
` +
                    gap +
                    partial.join(
                      `,
` + gap,
                    ) +
                    `
` +
                    mind +
                    "]"
                  : "[" + partial.join(",") + "]";
            gap = mind;
            return v;
          }
          if (rep && typeof rep === "object") {
            length = rep.length;
            for (i = 0; i < length; i += 1)
              if (typeof rep[i] === "string") {
                k = rep[i];
                v = str(k, value);
                if (v) partial.push(quote(k) + (gap ? ": " : ":") + v);
              }
          } else
            Object.keys(value).forEach(function (k) {
              var v = str(k, value);
              if (v) partial.push(quote(k) + (gap ? ": " : ":") + v);
            });
          v =
            partial.length === 0
              ? "{}"
              : gap
                ? `{
` +
                  gap +
                  partial.join(
                    `,
` + gap,
                  ) +
                  `
` +
                  mind +
                  "}"
                : "{" + partial.join(",") + "}";
          gap = mind;
          return v;
      }
    }
    if (typeof stringifyExports.stringify !== "function")
      stringifyExports.stringify = function (value, replacer, space) {
        var i;
        gap = "";
        indent = "";
        if (typeof space === "number") for (i = 0; i < space; i += 1) indent += " ";
        else if (typeof space === "string") indent = space;
        rep = replacer;
        if (
          replacer &&
          typeof replacer !== "function" &&
          (typeof replacer !== "object" || typeof replacer.length !== "number")
        )
          throw Error("JSON.stringify");
        return str("", {
          "": value,
        });
      };
  })();
});
export { require_stringify };
