/**
 * zod/v4/locales/tr.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:462239-465889 cjs-fingerprint
var nC = x(function (Go, eC) {
  var o3 =
      (Go && Go.__createBinding) ||
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
    s3 =
      (Go && Go.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    a3 =
      (Go && Go.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) o3(t, e, key);
        }
        return (s3(t, e), t);
      };
  Object.defineProperty(Go, "__esModule", { value: !0 });
  Go.default = c3;
  var dh = a3(Ee()),
    l3 = () => {
      let e = {
        string: { unit: "karakter", verb: "olmal\u0131" },
        file: { unit: "bayt", verb: "olmal\u0131" },
        array: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
        set: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
        map: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "girdi",
          email: "e-posta adresi",
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
          datetime: "ISO tarih ve saat",
          date: "ISO tarih",
          time: "ISO saat",
          duration: "ISO s\xFCre",
          ipv4: "IPv4 adresi",
          ipv6: "IPv6 adresi",
          mac: "MAC adresi",
          cidrv4: "IPv4 aral\u0131\u011F\u0131",
          cidrv6: "IPv6 aral\u0131\u011F\u0131",
          base64: "base64 ile \u015Fifrelenmi\u015F metin",
          base64url: "base64url ile \u015Fifrelenmi\u015F metin",
          json_string: "JSON dizesi",
          e164: "E.164 say\u0131s\u0131",
          credit_card: "kredi kart\u0131 numaras\u0131",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u015Eablon dizesi",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = dh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Ge\xE7ersiz de\u011Fer: beklenen instanceof ${r.expected}, al\u0131nan ${l}`;
            return `Ge\xE7ersiz de\u011Fer: beklenen ${s}, al\u0131nan ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Ge\xE7ersiz de\u011Fer: beklenen ${dh.stringifyPrimitive(r.values[0])}`;
            return `Ge\xE7ersiz se\xE7enek: a\u015Fa\u011F\u0131dakilerden biri olmal\u0131: ${dh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `\xC7ok b\xFCy\xFCk: beklenen ${r.origin ?? "de\u011Fer"} ${s}${r.maximum.toString()} ${a.unit ?? "\xF6\u011Fe"}`;
            return `\xC7ok b\xFCy\xFCk: beklenen ${r.origin ?? "de\u011Fer"} ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a) return `\xC7ok k\xFC\xE7\xFCk: beklenen ${r.origin} ${s}${r.minimum.toString()} ${a.unit}`;
            return `\xC7ok k\xFC\xE7\xFCk: beklenen ${r.origin} ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Ge\xE7ersiz metin: "${s.prefix}" ile ba\u015Flamal\u0131`;
            if (s.format === "ends_with") return `Ge\xE7ersiz metin: "${s.suffix}" ile bitmeli`;
            if (s.format === "includes") return `Ge\xE7ersiz metin: "${s.includes}" i\xE7ermeli`;
            if (s.format === "regex") return `Ge\xE7ersiz metin: ${s.pattern} desenine uymal\u0131`;
            return `Ge\xE7ersiz ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Ge\xE7ersiz say\u0131: ${r.divisor} ile tam b\xF6l\xFCnebilmeli`;
          case "unrecognized_keys":
            return `Tan\u0131nmayan anahtar${r.keys.length > 1 ? "lar" : ""}: ${dh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `${r.origin} i\xE7inde ge\xE7ersiz anahtar`;
          case "invalid_union":
            return "Ge\xE7ersiz de\u011Fer";
          case "invalid_element":
            return `${r.origin} i\xE7inde ge\xE7ersiz de\u011Fer`;
          default:
            return "Ge\xE7ersiz de\u011Fer";
        }
      };
    };
  function c3() {
    return { localeError: l3() };
  }
  eC.exports = Go.default;
});

export { nC };
