/**
 * zod/v4/locales/hr.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:299650-303365 cjs-fingerprint
var FA = x(function (ho, zA) {
  var iG =
      (ho && ho.__createBinding) ||
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
    oG =
      (ho && ho.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    sG =
      (ho && ho.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) iG(t, e, key);
        }
        return (oG(t, e), t);
      };
  Object.defineProperty(ho, "__esModule", { value: !0 });
  ho.default = lG;
  var Rp = sG(Ee()),
    aG = () => {
      let e = {
        string: { unit: "znakova", verb: "imati" },
        file: { unit: "bajtova", verb: "imati" },
        array: { unit: "stavki", verb: "imati" },
        set: { unit: "stavki", verb: "imati" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "unos",
          email: "email adresa",
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
          datetime: "ISO datum i vrijeme",
          date: "ISO datum",
          time: "ISO vrijeme",
          duration: "ISO trajanje",
          ipv4: "IPv4 adresa",
          ipv6: "IPv6 adresa",
          mac: "MAC adresa",
          cidrv4: "IPv4 raspon",
          cidrv6: "IPv6 raspon",
          base64: "base64 kodirani tekst",
          base64url: "base64url kodirani tekst",
          json_string: "JSON tekst",
          e164: "E.164 broj",
          credit_card: "broj kreditne kartice",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "unos",
        },
        o = {
          nan: "NaN",
          string: "tekst",
          number: "broj",
          boolean: "boolean",
          array: "niz",
          object: "objekt",
          set: "skup",
          file: "datoteka",
          date: "datum",
          bigint: "bigint",
          symbol: "simbol",
          undefined: "undefined",
          null: "null",
          function: "funkcija",
          map: "mapa",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Rp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Neispravan unos: o\u010Dekuje se instanceof ${r.expected}, a primljeno je ${l}`;
            return `Neispravan unos: o\u010Dekuje se ${s}, a primljeno je ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Neispravna vrijednost: o\u010Dekivano ${Rp.stringifyPrimitive(r.values[0])}`;
            return `Neispravna opcija: o\u010Dekivano jedno od ${Rp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin),
              l = o[r.origin] ?? r.origin;
            if (a)
              return `Preveliko: o\u010Dekivano da ${l ?? "vrijednost"} ima ${s}${r.maximum.toString()} ${a.unit ?? "elemenata"}`;
            return `Preveliko: o\u010Dekivano da ${l ?? "vrijednost"} bude ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin),
              l = o[r.origin] ?? r.origin;
            if (a) return `Premalo: o\u010Dekivano da ${l} ima ${s}${r.minimum.toString()} ${a.unit}`;
            return `Premalo: o\u010Dekivano da ${l} bude ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Neispravan tekst: mora zapo\u010Dinjati s "${s.prefix}"`;
            if (s.format === "ends_with") return `Neispravan tekst: mora zavr\u0161avati s "${s.suffix}"`;
            if (s.format === "includes") return `Neispravan tekst: mora sadr\u017Eavati "${s.includes}"`;
            if (s.format === "regex") return `Neispravan tekst: mora odgovarati uzorku ${s.pattern}`;
            return `Neispravna ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Neispravan broj: mora biti vi\u0161ekratnik od ${r.divisor}`;
          case "unrecognized_keys":
            return `Neprepoznat${r.keys.length > 1 ? "i klju\u010Devi" : " klju\u010D"}: ${Rp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Neispravan klju\u010D u ${o[r.origin] ?? r.origin}`;
          case "invalid_union":
            return "Neispravan unos";
          case "invalid_element":
            return `Neispravna vrijednost u ${o[r.origin] ?? r.origin}`;
          default:
            return "Neispravan unos";
        }
      };
    };
  function lG() {
    return { localeError: aG() };
  }
  zA.exports = ho.default;
});

export { FA };
