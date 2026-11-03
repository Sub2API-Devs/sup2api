/**
 * zod/v4/locales/sl.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:428867-432414 cjs-fingerprint
var HI = x(function (Bo, BI) {
  var C2 =
      (Bo && Bo.__createBinding) ||
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
    T2 =
      (Bo && Bo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    $2 =
      (Bo && Bo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) C2(t, e, key);
        }
        return (T2(t, e), t);
      };
  Object.defineProperty(Bo, "__esModule", { value: !0 });
  Bo.default = D2;
  var oh = $2(Ee()),
    R2 = () => {
      let e = {
        string: { unit: "znakov", verb: "imeti" },
        file: { unit: "bajtov", verb: "imeti" },
        array: { unit: "elementov", verb: "imeti" },
        set: { unit: "elementov", verb: "imeti" },
        map: { unit: "elementov", verb: "imeti" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "vnos",
          email: "e-po\u0161tni naslov",
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
          datetime: "ISO datum in \u010Das",
          date: "ISO datum",
          time: "ISO \u010Das",
          duration: "ISO trajanje",
          ipv4: "IPv4 naslov",
          ipv6: "IPv6 naslov",
          mac: "MAC naslov",
          cidrv4: "obseg IPv4",
          cidrv6: "obseg IPv6",
          base64: "base64 kodiran niz",
          base64url: "base64url kodiran niz",
          json_string: "JSON niz",
          e164: "E.164 \u0161tevilka",
          credit_card: "\u0161tevilka kreditne kartice",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "vnos",
        },
        o = { nan: "NaN", number: "\u0161tevilo", array: "tabela" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = oh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Neveljaven vnos: pri\u010Dakovano instanceof ${r.expected}, prejeto ${l}`;
            return `Neveljaven vnos: pri\u010Dakovano ${s}, prejeto ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Neveljaven vnos: pri\u010Dakovano ${oh.stringifyPrimitive(r.values[0])}`;
            return `Neveljavna mo\u017Enost: pri\u010Dakovano eno izmed ${oh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Preveliko: pri\u010Dakovano, da bo ${r.origin ?? "vrednost"} imelo ${s}${r.maximum.toString()} ${a.unit ?? "elementov"}`;
            return `Preveliko: pri\u010Dakovano, da bo ${r.origin ?? "vrednost"} ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Premajhno: pri\u010Dakovano, da bo ${r.origin} imelo ${s}${r.minimum.toString()} ${a.unit}`;
            return `Premajhno: pri\u010Dakovano, da bo ${r.origin} ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Neveljaven niz: mora se za\u010Deti z "${s.prefix}"`;
            if (s.format === "ends_with") return `Neveljaven niz: mora se kon\u010Dati z "${s.suffix}"`;
            if (s.format === "includes") return `Neveljaven niz: mora vsebovati "${s.includes}"`;
            if (s.format === "regex") return `Neveljaven niz: mora ustrezati vzorcu ${s.pattern}`;
            return `Neveljaven ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Neveljavno \u0161tevilo: mora biti ve\u010Dkratnik ${r.divisor}`;
          case "unrecognized_keys":
            return `Neprepoznan${r.keys.length > 1 ? "i klju\u010Di" : " klju\u010D"}: ${oh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Neveljaven klju\u010D v ${r.origin}`;
          case "invalid_union":
            return "Neveljaven vnos";
          case "invalid_element":
            return `Neveljavna vrednost v ${r.origin}`;
          default:
            return "Neveljaven vnos";
        }
      };
    };
  function D2() {
    return { localeError: R2() };
  }
  BI.exports = Bo.default;
});

export { HI };
