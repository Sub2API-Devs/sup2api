/**
 * zod/v4/locales/hi.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:293096-299650 cjs-fingerprint
var UA = x(function (po, NA) {
  var Qq =
      (po && po.__createBinding) ||
      (Object.create
        ? function (e, t, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, t, n, o) {
            if (o === void 0) o = n;
            e[o] = t[n];
          }),
    eG =
      (po && po.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    tG =
      (po && po.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) Qq(t, e, key);
        }
        return (eG(t, e), t);
      };
  Object.defineProperty(po, "__esModule", { value: !0 });
  po.default = rG;
  var $p = tG(Ee()),
    nG = () => {
      let e = {
        string: {
          unit: "\u0905\u0915\u094D\u0937\u0930",
          verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
        },
        file: {
          unit: "\u092C\u093E\u0907\u091F\u094D\u0938",
          verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
        },
        array: {
          unit: "\u0924\u0924\u094D\u0935",
          verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
        },
        set: {
          unit: "\u0924\u0924\u094D\u0935",
          verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
        },
        map: {
          unit: "\u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F\u093F\u092F\u093E\u0901",
          verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
        },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u0907\u0928\u092A\u0941\u091F",
          email: "\u0908\u092E\u0947\u0932 \u092A\u0924\u093E",
          url: "URL",
          emoji: "\u0907\u092E\u094B\u091C\u0940",
          uuid: "UUID",
          uuidv4: "UUIDv4",
          uuidv6: "UUIDv6",
          nanoid: "nanoid",
          guid: "GUID",
          cuid: "cuid",
          cuid2: "cuid2",
          ulid: "ULID",
          xid: "XID",
          ksuid: "KSUID",
          datetime: "ISO \u0924\u093F\u0925\u093F \u0914\u0930 \u0938\u092E\u092F",
          date: "ISO \u0924\u093F\u0925\u093F",
          time: "ISO \u0938\u092E\u092F",
          duration: "ISO \u0905\u0935\u0927\u093F",
          ipv4: "IPv4 \u092A\u0924\u093E",
          ipv6: "IPv6 \u092A\u0924\u093E",
          mac: "MAC \u092A\u0924\u093E",
          cidrv4: "IPv4 \u0936\u094D\u0930\u0947\u0923\u0940",
          cidrv6: "IPv6 \u0936\u094D\u0930\u0947\u0923\u0940",
          base64:
            "Base64-\u090F\u0928\u094D\u0915\u094B\u0921\u0947\u0921 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
          base64url:
            "Base64URL-\u090F\u0928\u094D\u0915\u094B\u0921\u0947\u0921 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
          json_string: "JSON \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
          e164: "E.164 \u0938\u0902\u0916\u094D\u092F\u093E",
          credit_card:
            "\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u093E\u0930\u094D\u0921 \u0938\u0902\u0916\u094D\u092F\u093E",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u0907\u0928\u092A\u0941\u091F",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = $p.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${s}, \u092A\u094D\u0930\u093E\u092A\u094D\u0924 ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${$p.stringifyPrimitive(r.values[0])}`;
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0935\u093F\u0915\u0932\u094D\u092A: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u092E\u093E\u0928\u094B\u0902 \u092E\u0947\u0902 \u0938\u0947 \u090F\u0915 ${$p.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `\u092C\u0939\u0941\u0924 \u092C\u0921\u093C\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${r.origin ?? "\u092E\u093E\u0928"} \u092E\u0947\u0902 ${s}${r.maximum} ${a.unit} \u0939\u094B\u0902`;
            return `\u092C\u0939\u0941\u0924 \u092C\u0921\u093C\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${r.origin ?? "\u092E\u093E\u0928"} ${s}${r.maximum} \u0939\u094B`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `\u092C\u0939\u0941\u0924 \u091B\u094B\u091F\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${r.origin} \u092E\u0947\u0902 ${s}${r.minimum} ${a.unit} \u0939\u094B\u0902`;
            return `\u092C\u0939\u0941\u0924 \u091B\u094B\u091F\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${r.origin} ${s}${r.minimum} \u0939\u094B`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: "${s.prefix}" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
            if (s.format === "ends_with")
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: "${s.suffix}" \u092A\u0930 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
            if (s.format === "includes")
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: \u0907\u0938\u092E\u0947\u0902 "${s.includes}" \u0936\u093E\u092E\u093F\u0932 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
            if (s.format === "regex")
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: \u092A\u0948\u091F\u0930\u094D\u0928 ${s.pattern} \u0938\u0947 \u092E\u0947\u0932 \u0916\u093E\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
            return `\u0905\u092E\u093E\u0928\u094D\u092F ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u0902\u0916\u094D\u092F\u093E: \u092F\u0939 ${r.divisor} \u0915\u093E \u0917\u0941\u0923\u091C \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
          case "unrecognized_keys":
            return `\u0905\u092A\u0930\u093F\u091A\u093F\u0924 \u0915\u0941\u0902\u091C\u0940${r.keys.length > 1 ? "\u092F\u093E\u0901" : ""}: ${$p.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0915\u0941\u0902\u091C\u0940: ${r.origin} \u092E\u0947\u0902`;
          case "invalid_union":
            if (r.options && Array.isArray(r.options) && r.options.length > 0)
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092E\u093F\u0928\u0947\u091F\u0930 \u092E\u093E\u0928: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${r.options.map((option) => `'${option}'`).join(" | ")}`;
            return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
          case "invalid_element":
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u092E\u093E\u0928: ${r.origin} \u092E\u0947\u0902`;
          default:
            return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
        }
      };
    };
  function rG() {
    return { localeError: nG() };
  }
  NA.exports = po.default;
});

export { UA };
