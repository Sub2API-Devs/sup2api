/**
 * zod/v4/locales/gu.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:275954-282390 cjs-fingerprint
var jA = x(function (uo, MA) {
  var Hq =
      (uo && uo.__createBinding) ||
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
    Kq =
      (uo && uo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    Zq =
      (uo && uo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) Hq(t, e, key);
        }
        return (Kq(t, e), t);
      };
  Object.defineProperty(uo, "__esModule", { value: !0 });
  uo.default = qq;
  var Cp = Zq(Ee()),
    Vq = () => {
      let e = {
        string: {
          unit: "\u0A85\u0A95\u0ACD\u0AB7\u0AB0",
          verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F",
        },
        file: { unit: "\u0AAC\u0ABE\u0AAF\u0A9F", verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F" },
        array: {
          unit: "\u0A86\u0A87\u0A9F\u0AAE",
          verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F",
        },
        set: { unit: "\u0A86\u0A87\u0A9F\u0AAE", verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F" },
        map: {
          unit: "\u0A8F\u0AA8\u0ACD\u0A9F\u0ACD\u0AB0\u0AC0",
          verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F",
        },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u0A87\u0AA8\u0AAA\u0AC1\u0A9F",
          email: "\u0A88\u0AAE\u0AC7\u0A87\u0AB2 \u0A8F\u0AA1\u0ACD\u0AB0\u0AC7\u0AB8",
          url: "URL",
          emoji: "\u0A87\u0AAE\u0ACB\u0A9C\u0AC0",
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
          datetime: "ISO \u0AA4\u0ABE\u0AB0\u0AC0\u0A96 \u0A85\u0AA8\u0AC7 \u0AB8\u0AAE\u0AAF",
          date: "ISO \u0AA4\u0ABE\u0AB0\u0AC0\u0A96",
          time: "ISO \u0AB8\u0AAE\u0AAF",
          duration: "ISO \u0A85\u0AB5\u0AA7\u0ABF",
          ipv4: "IPv4 \u0A8F\u0AA1\u0ACD\u0AB0\u0AC7\u0AB8",
          ipv6: "IPv6 \u0A8F\u0AA1\u0ACD\u0AB0\u0AC7\u0AB8",
          mac: "MAC \u0A8F\u0AA1\u0ACD\u0AB0\u0AC7\u0AB8",
          cidrv4: "IPv4 \u0AB6\u0ACD\u0AB0\u0AC7\u0AA3\u0AC0",
          cidrv6: "IPv6 \u0AB6\u0ACD\u0AB0\u0AC7\u0AA3\u0AC0",
          base64:
            "base64-\u0A8F\u0AA8\u0ACD\u0A95\u0ACB\u0AA1\u0AC7\u0AA1 \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97",
          base64url:
            "base64url-\u0A8F\u0AA8\u0ACD\u0A95\u0ACB\u0AA1\u0AC7\u0AA1 \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97",
          json_string: "JSON \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97",
          e164: "E.164 \u0AA8\u0A82\u0AAC\u0AB0",
          credit_card:
            "\u0A95\u0ACD\u0AB0\u0AC7\u0AA1\u0ABF\u0A9F \u0A95\u0ABE\u0AB0\u0ACD\u0AA1 \u0AA8\u0A82\u0AAC\u0AB0",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u0A87\u0AA8\u0AAA\u0AC1\u0A9F",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Cp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A87\u0AA8\u0AAA\u0AC1\u0A9F: \u0A85\u0AAA\u0AC7\u0A95\u0ACD\u0AB7\u0ABF\u0AA4 ${s}, \u0AAA\u0ACD\u0AB0\u0ABE\u0AAA\u0ACD\u0AA4 ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A87\u0AA8\u0AAA\u0AC1\u0A9F: \u0A85\u0AAA\u0AC7\u0A95\u0ACD\u0AB7\u0ABF\u0AA4 ${Cp.stringifyPrimitive(r.values[0])}`;
            return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB5\u0ABF\u0A95\u0AB2\u0ACD\u0AAA: ${Cp.joinValues(r.values, " | ")} \u0AAE\u0ABE\u0AA7\u0ACD\u0AAF\u0AAE\u0AA5\u0AC0 \u0A8F\u0A95 \u0A85\u0AAA\u0AC7\u0A95\u0ACD\u0AB7\u0ABF\u0AA4`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `\u0A96\u0AC2\u0AAC \u0AAE\u0ACB\u0A9F\u0AC1\u0A82: ${r.origin ?? "\u0AAE\u0AC2\u0AB2\u0ACD\u0AAF"} ${s}${r.maximum.toString()} ${a.unit ?? "\u0A8F\u0AB2\u0ABF\u0AAE\u0AC7\u0AA8\u0ACD\u0A9F"} \u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F`;
            return `\u0A96\u0AC2\u0AAC \u0AAE\u0ACB\u0A9F\u0AC1\u0A82: ${r.origin ?? "\u0AAE\u0AC2\u0AB2\u0ACD\u0AAF"} ${s}${r.maximum.toString()} \u0AB9\u0ACB\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `\u0A96\u0AC2\u0AAC \u0AA8\u0ABE\u0AA8\u0AC1\u0A82: ${r.origin} ${s}${r.minimum.toString()} ${a.unit} \u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F`;
            return `\u0A96\u0AC2\u0AAC \u0AA8\u0ABE\u0AA8\u0AC1\u0A82: ${r.origin} ${s}${r.minimum.toString()} \u0AB9\u0ACB\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97: "${s.prefix}" \u0AA5\u0AC0 \u0AB6\u0AB0\u0AC2 \u0AA5\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`;
            if (s.format === "ends_with")
              return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97: "${s.suffix}" \u0AAA\u0AB0 \u0AB8\u0AAE\u0ABE\u0AAA\u0ACD\u0AA4 \u0AA5\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`;
            if (s.format === "includes")
              return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97: "${s.includes}" \u0AB6\u0ABE\u0AAE\u0AC7\u0AB2 \u0AB9\u0ACB\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`;
            if (s.format === "regex")
              return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97: \u0AAA\u0AC7\u0A9F\u0AB0\u0ACD\u0AA8 ${s.pattern} \u0AB8\u0ABE\u0AA5\u0AC7 \u0AAE\u0AC7\u0AB3 \u0A96\u0ABE\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`;
            return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AA8\u0A82\u0AAC\u0AB0: ${r.divisor} \u0AA8\u0ACB \u0A97\u0AC1\u0AA3\u0ABE\u0A82\u0A95 \u0AB9\u0ACB\u0AB5\u0ACB \u0A9C\u0ACB\u0A88\u0A8F`;
          case "unrecognized_keys":
            return `\u0A93\u0AB3\u0A96\u0AC0 \u0AB6\u0A95\u0ABE\u0AA4\u0ABE \u0AA8\u0AB9\u0AC0\u0A82 \u0AA4\u0AC7 \u0A95\u0AC0${r.keys.length > 1 ? "\u0A93" : ""}: ${Cp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `${r.origin} \u0AAE\u0ABE\u0A82 \u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A95\u0AC0`;
          case "invalid_union":
            if (r.options && Array.isArray(r.options) && r.options.length > 0)
              return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AA1\u0ABF\u0AB8\u0ACD\u0A95\u0ACD\u0AB0\u0ABF\u0AAE\u0ABF\u0AA8\u0AC7\u0A9F\u0AB0 \u0AAE\u0AC2\u0AB2\u0ACD\u0AAF. \u0A85\u0AAA\u0AC7\u0A95\u0ACD\u0AB7\u0ABF\u0AA4 ${r.options.map((option) => `'${option}'`).join(" | ")}`;
            return "\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A87\u0AA8\u0AAA\u0AC1\u0A9F";
          case "invalid_element":
            return `${r.origin} \u0AAE\u0ABE\u0A82 \u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AAE\u0AC2\u0AB2\u0ACD\u0AAF`;
          default:
            return "\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A87\u0AA8\u0AAA\u0AC1\u0A9F";
        }
      };
    };
  function qq() {
    return { localeError: Vq() };
  }
  MA.exports = uo.default;
});

export { jA };
