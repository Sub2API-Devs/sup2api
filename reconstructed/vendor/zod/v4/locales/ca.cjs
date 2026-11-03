/**
 * zod/v4/locales/ca.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:218036-221638 cjs-fingerprint
var uA = x(function (Yi, cA) {
  var RV =
      (Yi && Yi.__createBinding) ||
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
    DV =
      (Yi && Yi.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    MV =
      (Yi && Yi.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) RV(t, e, key);
        }
        return (DV(t, e), t);
      };
  Object.defineProperty(Yi, "__esModule", { value: !0 });
  Yi.default = xV;
  var gp = MV(Ee()),
    jV = () => {
      let e = {
        string: { unit: "car\xE0cters", verb: "contenir" },
        file: { unit: "bytes", verb: "contenir" },
        array: { unit: "elements", verb: "contenir" },
        set: { unit: "elements", verb: "contenir" },
        map: { unit: "elements", verb: "contenir" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "entrada",
          email: "adre\xE7a electr\xF2nica",
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
          datetime: "data i hora ISO",
          date: "data ISO",
          time: "hora ISO",
          duration: "durada ISO",
          ipv4: "adre\xE7a IPv4",
          ipv6: "adre\xE7a IPv6",
          mac: "adre\xE7a MAC",
          cidrv4: "rang IPv4",
          cidrv6: "rang IPv6",
          base64: "cadena codificada en base64",
          base64url: "cadena codificada en base64url",
          json_string: "cadena JSON",
          e164: "n\xFAmero E.164",
          credit_card: "n\xFAmero de targeta de cr\xE8dit",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "entrada",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = gp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Tipus inv\xE0lid: s'esperava instanceof ${r.expected}, s'ha rebut ${l}`;
            return `Tipus inv\xE0lid: s'esperava ${s}, s'ha rebut ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Valor inv\xE0lid: s'esperava ${gp.stringifyPrimitive(r.values[0])}`;
            return `Opci\xF3 inv\xE0lida: s'esperava una de ${gp.joinValues(r.values, " o ")}`;
          case "too_big": {
            let s = r.inclusive ? "com a m\xE0xim" : "menys de",
              a = t(r.origin);
            if (a)
              return `Massa gran: s'esperava que ${r.origin ?? "el valor"} contingu\xE9s ${s} ${r.maximum.toString()} ${a.unit ?? "elements"}`;
            return `Massa gran: s'esperava que ${r.origin ?? "el valor"} fos ${s} ${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? "com a m\xEDnim" : "m\xE9s de",
              a = t(r.origin);
            if (a)
              return `Massa petit: s'esperava que ${r.origin} contingu\xE9s ${s} ${r.minimum.toString()} ${a.unit}`;
            return `Massa petit: s'esperava que ${r.origin} fos ${s} ${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Format inv\xE0lid: ha de comen\xE7ar amb "${s.prefix}"`;
            if (s.format === "ends_with") return `Format inv\xE0lid: ha d'acabar amb "${s.suffix}"`;
            if (s.format === "includes") return `Format inv\xE0lid: ha d'incloure "${s.includes}"`;
            if (s.format === "regex")
              return `Format inv\xE0lid: ha de coincidir amb el patr\xF3 ${s.pattern}`;
            return `Format inv\xE0lid per a ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `N\xFAmero inv\xE0lid: ha de ser m\xFAltiple de ${r.divisor}`;
          case "unrecognized_keys":
            return `Clau${r.keys.length > 1 ? "s" : ""} no reconeguda${r.keys.length > 1 ? "s" : ""}: ${gp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Clau inv\xE0lida a ${r.origin}`;
          case "invalid_union":
            return "Entrada inv\xE0lida";
          case "invalid_element":
            return `Element inv\xE0lid a ${r.origin}`;
          default:
            return "Entrada inv\xE0lida";
        }
      };
    };
  function xV() {
    return { localeError: jV() };
  }
  cA.exports = Yi.default;
});

export { uA };
