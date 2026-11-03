/**
 * zod/v4/locales/it.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:321729-325215 cjs-fingerprint
var XA = x(function (bo, JA) {
  var CG =
      (bo && bo.__createBinding) ||
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
    TG =
      (bo && bo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    $G =
      (bo && bo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) CG(t, e, key);
        }
        return (TG(t, e), t);
      };
  Object.defineProperty(bo, "__esModule", { value: !0 });
  bo.default = DG;
  var Lp = $G(Ee()),
    RG = () => {
      let e = {
        string: { unit: "caratteri", verb: "avere" },
        file: { unit: "byte", verb: "avere" },
        array: { unit: "elementi", verb: "avere" },
        set: { unit: "elementi", verb: "avere" },
        map: { unit: "elementi", verb: "avere" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "input",
          email: "indirizzo email",
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
          datetime: "data e ora ISO",
          date: "data ISO",
          time: "ora ISO",
          duration: "durata ISO",
          ipv4: "indirizzo IPv4",
          ipv6: "indirizzo IPv6",
          mac: "indirizzo MAC",
          cidrv4: "intervallo IPv4",
          cidrv6: "intervallo IPv6",
          base64: "stringa codificata in base64",
          base64url: "URL codificata in base64",
          json_string: "stringa JSON",
          e164: "numero E.164",
          credit_card: "numero di carta di credito",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "input",
        },
        o = { nan: "NaN", number: "numero", array: "vettore" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Lp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Input non valido: atteso instanceof ${r.expected}, ricevuto ${l}`;
            return `Input non valido: atteso ${s}, ricevuto ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Input non valido: atteso ${Lp.stringifyPrimitive(r.values[0])}`;
            return `Opzione non valida: atteso uno tra ${Lp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Troppo grande: ${r.origin ?? "valore"} deve avere ${s}${r.maximum.toString()} ${a.unit ?? "elementi"}`;
            return `Troppo grande: ${r.origin ?? "valore"} deve essere ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a) return `Troppo piccolo: ${r.origin} deve avere ${s}${r.minimum.toString()} ${a.unit}`;
            return `Troppo piccolo: ${r.origin} deve essere ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Stringa non valida: deve iniziare con "${s.prefix}"`;
            if (s.format === "ends_with") return `Stringa non valida: deve terminare con "${s.suffix}"`;
            if (s.format === "includes") return `Stringa non valida: deve includere "${s.includes}"`;
            if (s.format === "regex") return `Stringa non valida: deve corrispondere al pattern ${s.pattern}`;
            return `Input non valido: ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Numero non valido: deve essere un multiplo di ${r.divisor}`;
          case "unrecognized_keys":
            return `Chiav${r.keys.length > 1 ? "i" : "e"} non riconosciut${r.keys.length > 1 ? "e" : "a"}: ${Lp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Chiave non valida in ${r.origin}`;
          case "invalid_union":
            return "Input non valido";
          case "invalid_element":
            return `Valore non valido in ${r.origin}`;
          default:
            return "Input non valido";
        }
      };
    };
  function DG() {
    return { localeError: RG() };
  }
  JA.exports = bo.default;
});

export { XA };
