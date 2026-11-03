/**
 * zod/v4/locales/ne.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:372880-379138 cjs-fingerprint
var _I = x(function (Io, yI) {
  var SW =
      (Io && Io.__createBinding) ||
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
    kW =
      (Io && Io.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    EW =
      (Io && Io.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) SW(t, e, key);
        }
        return (kW(t, e), t);
      };
  Object.defineProperty(Io, "__esModule", { value: !0 });
  Io.default = AW;
  var Vp = EW(Ee()),
    PW = () => {
      let e = {
        string: {
          unit: "\u0905\u0915\u094D\u0937\u0930",
          verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
        },
        file: { unit: "\u092C\u093E\u0907\u091F", verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B" },
        array: { unit: "\u0924\u0924\u094D\u0935", verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B" },
        set: { unit: "\u0924\u0924\u094D\u0935", verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B" },
        map: {
          unit: "\u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F\u093F",
          verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
        },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u0907\u0928\u092A\u0941\u091F",
          email: "\u0907\u092E\u0947\u0932 \u0920\u0947\u0917\u093E\u0928\u093E",
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
          datetime: "ISO \u092E\u093F\u0924\u093F \u0930 \u0938\u092E\u092F",
          date: "ISO \u092E\u093F\u0924\u093F",
          time: "ISO \u0938\u092E\u092F",
          duration: "ISO \u0905\u0935\u0927\u093F",
          ipv4: "IPv4 \u0920\u0947\u0917\u093E\u0928\u093E",
          ipv6: "IPv6 \u0920\u0947\u0917\u093E\u0928\u093E",
          mac: "MAC \u0920\u0947\u0917\u093E\u0928\u093E",
          cidrv4: "IPv4 \u0926\u093E\u092F\u0930\u093E",
          cidrv6: "IPv6 \u0926\u093E\u092F\u0930\u093E",
          base64:
            "base64-\u0907\u0928\u094D\u0915\u094B\u0921 \u0917\u0930\u093F\u090F\u0915\u094B \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
          base64url:
            "base64url-\u0907\u0928\u094D\u0915\u094B\u0921 \u0917\u0930\u093F\u090F\u0915\u094B \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
          json_string: "JSON \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
          e164: "E.164 \u0928\u092E\u094D\u092C\u0930",
          credit_card:
            "\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u093E\u0930\u094D\u0921 \u0928\u092E\u094D\u092C\u0930",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u0907\u0928\u092A\u0941\u091F",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Vp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${s}, \u092A\u094D\u0930\u093E\u092A\u094D\u0924 ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${Vp.stringifyPrimitive(r.values[0])}`;
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0935\u093F\u0915\u0932\u094D\u092A: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u092E\u093E\u0928\u0939\u0930\u0942 \u092E\u0927\u094D\u092F\u0947 \u090F\u0915 ${Vp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `\u0927\u0947\u0930\u0948 \u0920\u0942\u0932\u094B: ${r.origin ?? "\u092E\u093E\u0928"} \u092E\u093E ${s}${r.maximum.toString()} ${a.unit} ${a.verb}`;
            return `\u0927\u0947\u0930\u0948 \u0920\u0942\u0932\u094B: ${r.origin ?? "\u092E\u093E\u0928"} ${s}${r.maximum.toString()} \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `\u0927\u0947\u0930\u0948 \u0938\u093E\u0928\u094B: ${r.origin} \u092E\u093E ${s}${r.minimum.toString()} ${a.unit} ${a.verb}`;
            return `\u0927\u0947\u0930\u0948 \u0938\u093E\u0928\u094B: ${r.origin} ${s}${r.minimum.toString()} \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${s.prefix}" \u092C\u093E\u091F \u0938\u0941\u0930\u0941 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
            if (s.format === "ends_with")
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${s.suffix}" \u092E\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
            if (s.format === "includes")
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${s.includes}" \u0938\u092E\u093E\u0935\u0947\u0936 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
            if (s.format === "regex")
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: \u0922\u093E\u0901\u091A\u093E ${s.pattern} \u0938\u0901\u0917 \u092E\u0947\u0932 \u0916\u093E\u0928\u0941\u092A\u0930\u094D\u091B`;
            return `\u0905\u092E\u093E\u0928\u094D\u092F ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u0902\u0916\u094D\u092F\u093E: ${r.divisor} \u0915\u094B \u0917\u0941\u0923\u091C \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
          case "unrecognized_keys":
            return `\u0905\u092A\u0930\u093F\u091A\u093F\u0924 \u0915\u0941\u091E\u094D\u091C\u0940${r.keys.length > 1 ? "\u0939\u0930\u0942" : ""}: ${Vp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0915\u0941\u091E\u094D\u091C\u0940: ${r.origin} \u092E\u093E`;
          case "invalid_union":
            if (r.options && Array.isArray(r.options) && r.options.length > 0)
              return `\u0905\u092E\u093E\u0928\u094D\u092F \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092E\u093F\u0928\u0947\u091F\u0930 \u092E\u093E\u0928: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${r.options.map((option) => `'${option}'`).join(" | ")}`;
            return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
          case "invalid_element":
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u092E\u093E\u0928: ${r.origin} \u092E\u093E`;
          default:
            return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
        }
      };
    };
  function AW() {
    return { localeError: PW() };
  }
  yI.exports = Io.default;
});

export { _I };
