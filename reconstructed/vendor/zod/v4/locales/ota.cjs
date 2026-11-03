/**
 * zod/v4/locales/ota.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:389543-393244 cjs-fingerprint
var PI = x(function (Ro, EI) {
  var HW =
      (Ro && Ro.__createBinding) ||
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
    KW =
      (Ro && Ro.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    ZW =
      (Ro && Ro.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) HW(t, e, key);
        }
        return (KW(t, e), t);
      };
  Object.defineProperty(Ro, "__esModule", { value: !0 });
  Ro.default = qW;
  var Yp = ZW(Ee()),
    VW = () => {
      let e = {
        string: { unit: "harf", verb: "olmal\u0131d\u0131r" },
        file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
        array: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
        set: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
        map: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "giren",
          email: "epostag\xE2h",
          url: "URL",
          emoji: "emoji",
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
          datetime: "ISO heng\xE2m\u0131",
          date: "ISO tarihi",
          time: "ISO zaman\u0131",
          duration: "ISO m\xFCddeti",
          ipv4: "IPv4 ni\u015F\xE2n\u0131",
          ipv6: "IPv6 ni\u015F\xE2n\u0131",
          mac: "MAC ni\u015F\xE2n\u0131",
          cidrv4: "IPv4 menzili",
          cidrv6: "IPv6 menzili",
          base64: "base64-\u015Fifreli metin",
          base64url: "base64url-\u015Fifreli metin",
          json_string: "JSON metin",
          e164: "E.164 say\u0131s\u0131",
          credit_card: "i'tib\xE2r kart\u0131 numaras\u0131",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "giren",
        },
        o = { nan: "NaN", number: "numara", array: "saf", null: "gayb" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Yp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `F\xE2sit giren: umulan instanceof ${r.expected}, al\u0131nan ${l}`;
            return `F\xE2sit giren: umulan ${s}, al\u0131nan ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1) return `F\xE2sit giren: umulan ${Yp.stringifyPrimitive(r.values[0])}`;
            return `F\xE2sit tercih: m\xFBteberler ${Yp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Fazla b\xFCy\xFCk: ${r.origin ?? "value"}, ${s}${r.maximum.toString()} ${a.unit ?? "elements"} sahip olmal\u0131yd\u0131.`;
            return `Fazla b\xFCy\xFCk: ${r.origin ?? "value"}, ${s}${r.maximum.toString()} olmal\u0131yd\u0131.`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Fazla k\xFC\xE7\xFCk: ${r.origin}, ${s}${r.minimum.toString()} ${a.unit} sahip olmal\u0131yd\u0131.`;
            return `Fazla k\xFC\xE7\xFCk: ${r.origin}, ${s}${r.minimum.toString()} olmal\u0131yd\u0131.`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `F\xE2sit metin: "${s.prefix}" ile ba\u015Flamal\u0131.`;
            if (s.format === "ends_with") return `F\xE2sit metin: "${s.suffix}" ile bitmeli.`;
            if (s.format === "includes") return `F\xE2sit metin: "${s.includes}" ihtiv\xE2 etmeli.`;
            if (s.format === "regex") return `F\xE2sit metin: ${s.pattern} nak\u015F\u0131na uymal\u0131.`;
            return `F\xE2sit ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `F\xE2sit say\u0131: ${r.divisor} kat\u0131 olmal\u0131yd\u0131.`;
          case "unrecognized_keys":
            return `Tan\u0131nmayan anahtar ${r.keys.length > 1 ? "s" : ""}: ${Yp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `${r.origin} i\xE7in tan\u0131nmayan anahtar var.`;
          case "invalid_union":
            return "Giren tan\u0131namad\u0131.";
          case "invalid_element":
            return `${r.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
          default:
            return "K\u0131ymet tan\u0131namad\u0131.";
        }
      };
    };
  function qW() {
    return { localeError: VW() };
  }
  EI.exports = Ro.default;
});

export { PI };
