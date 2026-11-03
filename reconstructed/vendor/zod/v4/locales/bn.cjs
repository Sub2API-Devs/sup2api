/**
 * zod/v4/locales/bn.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:211959-218036 cjs-fingerprint
var lA = x(function (Wi, aA) {
  var AV =
      (Wi && Wi.__createBinding) ||
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
    IV =
      (Wi && Wi.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    CV =
      (Wi && Wi.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) AV(t, e, key);
        }
        return (IV(t, e), t);
      };
  Object.defineProperty(Wi, "__esModule", { value: !0 });
  Wi.default = $V;
  var mp = CV(Ee()),
    TV = () => {
      let e = {
        string: {
          unit: "\u0985\u0995\u09CD\u09B7\u09B0",
          verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
        },
        file: { unit: "\u09AC\u09BE\u0987\u099F", verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7" },
        array: {
          unit: "\u0986\u0987\u099F\u09C7\u09AE",
          verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
        },
        set: {
          unit: "\u0986\u0987\u099F\u09C7\u09AE",
          verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
        },
        map: {
          unit: "\u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF",
          verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
        },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u0987\u09A8\u09AA\u09C1\u099F",
          email: "\u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
          url: "URL",
          emoji: "\u0987\u09AE\u09CB\u099C\u09BF",
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
          datetime: "ISO \u09A4\u09BE\u09B0\u09BF\u0996 \u0993 \u09B8\u09AE\u09AF\u09BC",
          date: "ISO \u09A4\u09BE\u09B0\u09BF\u0996",
          time: "ISO \u09B8\u09AE\u09AF\u09BC",
          duration: "ISO \u09B8\u09AE\u09AF\u09BC\u0995\u09BE\u09B2",
          ipv4: "IPv4 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
          ipv6: "IPv6 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
          mac: "MAC \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
          cidrv4: "IPv4 \u09B0\u09C7\u099E\u09CD\u099C",
          cidrv6: "IPv6 \u09B0\u09C7\u099E\u09CD\u099C",
          base64:
            "base64-\u098F\u09A8\u0995\u09CB\u09A1\u09C7\u09A1 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
          base64url:
            "base64url-\u098F\u09A8\u0995\u09CB\u09A1\u09C7\u09A1 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
          json_string: "JSON \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
          e164: "E.164 \u09A8\u09AE\u09CD\u09AC\u09B0",
          credit_card:
            "\u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u0995\u09BE\u09B0\u09CD\u09A1 \u09A8\u09AE\u09CD\u09AC\u09B0",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u0987\u09A8\u09AA\u09C1\u099F",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = mp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            return `\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F: \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${s}, \u09AA\u09CD\u09B0\u09BE\u09AA\u09CD\u09A4 ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F: \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${mp.stringifyPrimitive(r.values[0])}`;
            return `\u0985\u09AC\u09C8\u09A7 \u0985\u09AA\u09B6\u09A8: ${mp.joinValues(r.values, " | ")} \u098F\u09B0 \u09AE\u09A7\u09CD\u09AF\u09C7 \u098F\u0995\u099F\u09BF \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `\u0985\u09A8\u09C7\u0995 \u09AC\u09A1\u09BC: ${r.origin ?? "\u09AE\u09BE\u09A8"} ${s}${r.maximum.toString()} ${a.unit ?? "\u098F\u09B2\u09BF\u09AE\u09C7\u09A8\u09CD\u099F"} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
            return `\u0985\u09A8\u09C7\u0995 \u09AC\u09A1\u09BC: ${r.origin ?? "\u09AE\u09BE\u09A8"} ${s}${r.maximum.toString()} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `\u0985\u09A8\u09C7\u0995 \u099B\u09CB\u099F: ${r.origin} ${s}${r.minimum.toString()} ${a.unit} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
            return `\u0985\u09A8\u09C7\u0995 \u099B\u09CB\u099F: ${r.origin} ${s}${r.minimum.toString()} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${s.prefix}" \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B6\u09C1\u09B0\u09C1 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
            if (s.format === "ends_with")
              return `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${s.suffix}" \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B6\u09C7\u09B7 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
            if (s.format === "includes")
              return `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${s.includes}" \u0985\u09A8\u09CD\u09A4\u09B0\u09CD\u09AD\u09C1\u0995\u09CD\u09A4 \u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7`;
            if (s.format === "regex")
              return `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: ${s.pattern} \u09AA\u09CD\u09AF\u09BE\u099F\u09BE\u09B0\u09CD\u09A8 \u09AE\u09BF\u09B2\u09A4\u09C7 \u09B9\u09AC\u09C7`;
            return `\u0985\u09AC\u09C8\u09A7 ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\u0985\u09AC\u09C8\u09A7 \u09A8\u09AE\u09CD\u09AC\u09B0: ${r.divisor} \u098F\u09B0 \u0997\u09C1\u09A3\u09BF\u09A4\u0995 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          case "unrecognized_keys":
            return `\u0985\u099A\u09C7\u09A8\u09BE \u0995\u09C0${r.keys.length > 1 ? "\u0997\u09C1\u09B2\u09CB" : ""}: ${mp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `${r.origin} \u098F \u0985\u09AC\u09C8\u09A7 \u0995\u09C0`;
          case "invalid_union":
            if (r.options && Array.isArray(r.options) && r.options.length > 0)
              return `\u0985\u09AC\u09C8\u09A7 \u09A1\u09BF\u09B8\u0995\u09CD\u09B0\u09BF\u09AE\u09BF\u09A8\u09C7\u099F\u09B0 \u09AE\u09BE\u09A8\u0964 \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${r.options.map((option) => `'${option}'`).join(" | ")}`;
            return "\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F";
          case "invalid_element":
            return `${r.origin} \u098F \u0985\u09AC\u09C8\u09A7 \u09AE\u09BE\u09A8`;
          default:
            return "\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F";
        }
      };
    };
  function $V() {
    return { localeError: TV() };
  }
  aA.exports = Wi.default;
});

export { lA };
