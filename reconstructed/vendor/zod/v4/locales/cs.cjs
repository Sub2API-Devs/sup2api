/**
 * zod/v4/locales/cs.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:228564-232553 cjs-fingerprint
var hA = x(function (Qi, pA) {
  var BV =
      (Qi && Qi.__createBinding) ||
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
    HV =
      (Qi && Qi.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    KV =
      (Qi && Qi.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) BV(t, e, key);
        }
        return (HV(t, e), t);
      };
  Object.defineProperty(Qi, "__esModule", { value: !0 });
  Qi.default = VV;
  var _p = KV(Ee()),
    ZV = () => {
      let e = {
        string: { unit: "znak\u016F", verb: "m\xEDt" },
        file: { unit: "bajt\u016F", verb: "m\xEDt" },
        array: { unit: "prvk\u016F", verb: "m\xEDt" },
        set: { unit: "prvk\u016F", verb: "m\xEDt" },
        map: { unit: "prvk\u016F", verb: "m\xEDt" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "regul\xE1rn\xED v\xFDraz",
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
          datetime: "datum a \u010Das ve form\xE1tu ISO",
          date: "datum ve form\xE1tu ISO",
          time: "\u010Das ve form\xE1tu ISO",
          duration: "doba trv\xE1n\xED ISO",
          ipv4: "IPv4 adresa",
          ipv6: "IPv6 adresa",
          mac: "MAC adresa",
          cidrv4: "rozsah IPv4",
          cidrv6: "rozsah IPv6",
          base64: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64",
          base64url: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64url",
          json_string: "\u0159et\u011Bzec ve form\xE1tu JSON",
          e164: "\u010D\xEDslo E.164",
          credit_card: "\u010D\xEDslo kreditn\xED karty",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "vstup",
        },
        o = {
          nan: "NaN",
          number: "\u010D\xEDslo",
          string: "\u0159et\u011Bzec",
          function: "funkce",
          array: "pole",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = _p.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no instanceof ${r.expected}, obdr\u017Eeno ${l}`;
            return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${s}, obdr\u017Eeno ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${_p.stringifyPrimitive(r.values[0])}`;
            return `Neplatn\xE1 mo\u017Enost: o\u010Dek\xE1v\xE1na jedna z hodnot ${_p.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${r.origin ?? "hodnota"} mus\xED m\xEDt ${s}${r.maximum.toString()} ${a.unit ?? "prvk\u016F"}`;
            return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${r.origin ?? "hodnota"} mus\xED b\xFDt ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${r.origin ?? "hodnota"} mus\xED m\xEDt ${s}${r.minimum.toString()} ${a.unit ?? "prvk\u016F"}`;
            return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${r.origin ?? "hodnota"} mus\xED b\xFDt ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `Neplatn\xFD \u0159et\u011Bzec: mus\xED za\u010D\xEDnat na "${s.prefix}"`;
            if (s.format === "ends_with")
              return `Neplatn\xFD \u0159et\u011Bzec: mus\xED kon\u010Dit na "${s.suffix}"`;
            if (s.format === "includes")
              return `Neplatn\xFD \u0159et\u011Bzec: mus\xED obsahovat "${s.includes}"`;
            if (s.format === "regex")
              return `Neplatn\xFD \u0159et\u011Bzec: mus\xED odpov\xEDdat vzoru ${s.pattern}`;
            return `Neplatn\xFD form\xE1t ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Neplatn\xE9 \u010D\xEDslo: mus\xED b\xFDt n\xE1sobkem ${r.divisor}`;
          case "unrecognized_keys":
            return `Nezn\xE1m\xE9 kl\xED\u010De: ${_p.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Neplatn\xFD kl\xED\u010D v ${r.origin}`;
          case "invalid_union":
            return "Neplatn\xFD vstup";
          case "invalid_element":
            return `Neplatn\xE1 hodnota v ${r.origin}`;
          default:
            return "Neplatn\xFD vstup";
        }
      };
    };
  function VV() {
    return { localeError: ZV() };
  }
  pA.exports = Qi.default;
});

export { hA };
