/**
 * zod/v4/locales/ro.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:412923-416728 cjs-fingerprint
var xI = x(function (Uo, jI) {
  var h2 =
      (Uo && Uo.__createBinding) ||
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
    m2 =
      (Uo && Uo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    g2 =
      (Uo && Uo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) h2(t, e, key);
        }
        return (m2(t, e), t);
      };
  Object.defineProperty(Uo, "__esModule", { value: !0 });
  Uo.default = _2;
  var nh = g2(Ee()),
    y2 = () => {
      let e = {
        string: { unit: "caractere", verb: "s\u0103 aib\u0103" },
        file: { unit: "octe\u021Bi", verb: "s\u0103 aib\u0103" },
        array: { unit: "elemente", verb: "s\u0103 aib\u0103" },
        set: { unit: "elemente", verb: "s\u0103 aib\u0103" },
        map: { unit: "intr\u0103ri", verb: "s\u0103 aib\u0103" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "intrare",
          email: "adres\u0103 de email",
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
          datetime: "dat\u0103 \u0219i or\u0103 ISO",
          date: "dat\u0103 ISO",
          time: "or\u0103 ISO",
          duration: "durat\u0103 ISO",
          ipv4: "adres\u0103 IPv4",
          ipv6: "adres\u0103 IPv6",
          mac: "adres\u0103 MAC",
          cidrv4: "interval IPv4",
          cidrv6: "interval IPv6",
          base64: "\u0219ir codat base64",
          base64url: "\u0219ir codat base64url",
          json_string: "\u0219ir JSON",
          e164: "num\u0103r E.164",
          credit_card: "num\u0103r de card de credit",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "intrare",
        },
        o = {
          nan: "NaN",
          string: "\u0219ir",
          number: "num\u0103r",
          boolean: "boolean",
          function: "func\u021Bie",
          array: "matrice",
          object: "obiect",
          undefined: "nedefinit",
          symbol: "simbol",
          bigint: "num\u0103r mare",
          void: "void",
          never: "never",
          map: "hart\u0103",
          set: "set",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = nh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            return `Intrare invalid\u0103: a\u0219teptat ${s}, primit ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Intrare invalid\u0103: a\u0219teptat ${nh.stringifyPrimitive(r.values[0])}`;
            return `Op\u021Biune invalid\u0103: a\u0219teptat una dintre ${nh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Prea mare: a\u0219teptat ca ${r.origin ?? "valoarea"} ${a.verb} ${s}${r.maximum.toString()} ${a.unit ?? "elemente"}`;
            return `Prea mare: a\u0219teptat ca ${r.origin ?? "valoarea"} s\u0103 fie ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Prea mic: a\u0219teptat ca ${r.origin} ${a.verb} ${s}${r.minimum.toString()} ${a.unit}`;
            return `Prea mic: a\u0219teptat ca ${r.origin} s\u0103 fie ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u0218ir invalid: trebuie s\u0103 \xEEnceap\u0103 cu "${s.prefix}"`;
            if (s.format === "ends_with")
              return `\u0218ir invalid: trebuie s\u0103 se termine cu "${s.suffix}"`;
            if (s.format === "includes")
              return `\u0218ir invalid: trebuie s\u0103 includ\u0103 "${s.includes}"`;
            if (s.format === "regex")
              return `\u0218ir invalid: trebuie s\u0103 se potriveasc\u0103 cu modelul ${s.pattern}`;
            return `Format invalid: ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Num\u0103r invalid: trebuie s\u0103 fie multiplu de ${r.divisor}`;
          case "unrecognized_keys":
            return `Chei nerecunoscute: ${nh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Cheie invalid\u0103 \xEEn ${r.origin}`;
          case "invalid_union":
            return "Intrare invalid\u0103";
          case "invalid_element":
            return `Valoare invalid\u0103 \xEEn ${r.origin}`;
          default:
            return "Intrare invalid\u0103";
        }
      };
    };
  function _2() {
    return { localeError: y2() };
  }
  jI.exports = Uo.default;
});

export { xI };
