/**
 * zod/v4/locales/sk.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:424915-428867 cjs-fingerprint
var FI = x(function (Fo, zI) {
  var k2 =
      (Fo && Fo.__createBinding) ||
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
    E2 =
      (Fo && Fo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    P2 =
      (Fo && Fo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) k2(t, e, key);
        }
        return (E2(t, e), t);
      };
  Object.defineProperty(Fo, "__esModule", { value: !0 });
  Fo.default = I2;
  var ih = P2(Ee()),
    A2 = () => {
      let e = {
        string: { unit: "znakov", verb: "ma\u0165" },
        file: { unit: "bajtov", verb: "ma\u0165" },
        array: { unit: "prvkov", verb: "ma\u0165" },
        set: { unit: "prvkov", verb: "ma\u0165" },
        map: { unit: "polo\u017Eiek", verb: "ma\u0165" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "regul\xE1rny v\xFDraz",
          email: "e-mailov\xE1 adresa",
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
          datetime: "d\xE1tum a \u010Das vo form\xE1te ISO",
          date: "d\xE1tum vo form\xE1te ISO",
          time: "\u010Das vo form\xE1te ISO",
          duration: "doba trvania ISO",
          ipv4: "IPv4 adresa",
          ipv6: "IPv6 adresa",
          mac: "MAC adresa",
          cidrv4: "rozsah IPv4",
          cidrv6: "rozsah IPv6",
          base64: "re\u0165azec zak\xF3dovan\xFD vo form\xE1te base64",
          base64url: "re\u0165azec zak\xF3dovan\xFD vo form\xE1te base64url",
          json_string: "re\u0165azec vo form\xE1te JSON",
          e164: "\u010D\xEDslo E.164",
          credit_card: "\u010D\xEDslo kreditnej karty",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "vstup",
        },
        o = {
          nan: "NaN",
          number: "\u010D\xEDslo",
          string: "re\u0165azec",
          function: "funkcia",
          array: "pole",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = ih.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 instanceof ${r.expected}, obdr\u017Ean\xE9 ${l}`;
            return `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 ${s}, obdr\u017Ean\xE9 ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 ${ih.stringifyPrimitive(r.values[0])}`;
            return `Neplatn\xFD vstup: o\u010Dak\xE1van\xE1 jedna z hodn\xF4t ${ih.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Hodnota je pr\xEDli\u0161 ve\u013Ek\xE1: ${r.origin ?? "hodnota"} mus\xED ma\u0165 ${s}${r.maximum.toString()} ${a.unit ?? "prvkov"}`;
            return `Hodnota je pr\xEDli\u0161 ve\u013Ek\xE1: ${r.origin ?? "hodnota"} mus\xED by\u0165 ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Hodnota je pr\xEDli\u0161 mal\xE1: ${r.origin ?? "hodnota"} mus\xED ma\u0165 ${s}${r.minimum.toString()} ${a.unit ?? "prvkov"}`;
            return `Hodnota je pr\xEDli\u0161 mal\xE1: ${r.origin ?? "hodnota"} mus\xED by\u0165 ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `Neplatn\xFD re\u0165azec: mus\xED za\u010D\xEDna\u0165 na "${s.prefix}"`;
            if (s.format === "ends_with")
              return `Neplatn\xFD re\u0165azec: mus\xED kon\u010Di\u0165 na "${s.suffix}"`;
            if (s.format === "includes")
              return `Neplatn\xFD re\u0165azec: mus\xED obsahova\u0165 "${s.includes}"`;
            if (s.format === "regex")
              return `Neplatn\xFD re\u0165azec: mus\xED zodpoveda\u0165 vzoru ${s.pattern}`;
            return `Neplatn\xFD form\xE1t ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Neplatn\xE9 \u010D\xEDslo: mus\xED by\u0165 n\xE1sobkom ${r.divisor}`;
          case "unrecognized_keys":
            return `Nezn\xE1me kl\xFA\u010De: ${ih.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Neplatn\xFD kl\xFA\u010D v ${r.origin}`;
          case "invalid_union":
            return "Neplatn\xFD vstup";
          case "invalid_element":
            return `Neplatn\xE1 hodnota v ${r.origin}`;
          default:
            return "Neplatn\xFD vstup";
        }
      };
    };
  function I2() {
    return { localeError: A2() };
  }
  zI.exports = Fo.default;
});

export { FI };
