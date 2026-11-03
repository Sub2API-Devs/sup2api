/**
 * zod/v4/locales/nl.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:379138-382650 cjs-fingerprint
var vI = x(function (Co, bI) {
  var IW =
      (Co && Co.__createBinding) ||
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
    CW =
      (Co && Co.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    TW =
      (Co && Co.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) IW(t, e, key);
        }
        return (CW(t, e), t);
      };
  Object.defineProperty(Co, "__esModule", { value: !0 });
  Co.default = RW;
  var qp = TW(Ee()),
    $W = () => {
      let e = {
        string: { unit: "tekens", verb: "heeft" },
        file: { unit: "bytes", verb: "heeft" },
        array: { unit: "elementen", verb: "heeft" },
        set: { unit: "elementen", verb: "heeft" },
        map: { unit: "elementen", verb: "heeft" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "invoer",
          email: "emailadres",
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
          datetime: "ISO datum en tijd",
          date: "ISO datum",
          time: "ISO tijd",
          duration: "ISO duur",
          ipv4: "IPv4-adres",
          ipv6: "IPv6-adres",
          mac: "MAC-adres",
          cidrv4: "IPv4-bereik",
          cidrv6: "IPv6-bereik",
          base64: "base64-gecodeerde tekst",
          base64url: "base64 URL-gecodeerde tekst",
          json_string: "JSON string",
          e164: "E.164-nummer",
          credit_card: "creditcardnummer",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "invoer",
        },
        o = { nan: "NaN", number: "getal" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = qp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Ongeldige invoer: verwacht instanceof ${r.expected}, ontving ${l}`;
            return `Ongeldige invoer: verwacht ${s}, ontving ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Ongeldige invoer: verwacht ${qp.stringifyPrimitive(r.values[0])}`;
            return `Ongeldige optie: verwacht \xE9\xE9n van ${qp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin),
              l = r.origin === "date" ? "laat" : r.origin === "string" ? "lang" : "groot";
            if (a)
              return `Te ${l}: verwacht dat ${r.origin ?? "waarde"} ${s}${r.maximum.toString()} ${a.unit ?? "elementen"} ${a.verb}`;
            return `Te ${l}: verwacht dat ${r.origin ?? "waarde"} ${s}${r.maximum.toString()} is`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin),
              l = r.origin === "date" ? "vroeg" : r.origin === "string" ? "kort" : "klein";
            if (a) return `Te ${l}: verwacht dat ${r.origin} ${s}${r.minimum.toString()} ${a.unit} ${a.verb}`;
            return `Te ${l}: verwacht dat ${r.origin} ${s}${r.minimum.toString()} is`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Ongeldige tekst: moet met "${s.prefix}" beginnen`;
            if (s.format === "ends_with") return `Ongeldige tekst: moet op "${s.suffix}" eindigen`;
            if (s.format === "includes") return `Ongeldige tekst: moet "${s.includes}" bevatten`;
            if (s.format === "regex") return `Ongeldige tekst: moet overeenkomen met patroon ${s.pattern}`;
            return `Ongeldig: ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Ongeldig getal: moet een veelvoud van ${r.divisor} zijn`;
          case "unrecognized_keys":
            return `Onbekende key${r.keys.length > 1 ? "s" : ""}: ${qp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Ongeldige key in ${r.origin}`;
          case "invalid_union":
            return "Ongeldige invoer";
          case "invalid_element":
            return `Ongeldige waarde in ${r.origin}`;
          default:
            return "Ongeldige invoer";
        }
      };
    };
  function RW() {
    return { localeError: $W() };
  }
  bI.exports = Co.default;
});

export { vI };
