/**
 * zod/v4/locales/fr.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:268418-272423 cjs-fingerprint
var $A = x(function (lo, TA) {
  var Dq =
      (lo && lo.__createBinding) ||
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
    Mq =
      (lo && lo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    jq =
      (lo && lo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) Dq(t, e, key);
        }
        return (Mq(t, e), t);
      };
  Object.defineProperty(lo, "__esModule", { value: !0 });
  lo.default = Lq;
  var Ap = jq(Ee()),
    xq = () => {
      let e = {
        string: { unit: "caract\xE8res", verb: "avoir" },
        file: { unit: "octets", verb: "avoir" },
        array: { unit: "\xE9l\xE9ments", verb: "avoir" },
        set: { unit: "\xE9l\xE9ments", verb: "avoir" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "expression r\xE9guli\xE8re",
          email: "adresse e-mail",
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
          datetime: "date et heure ISO",
          date: "date ISO",
          time: "heure ISO",
          duration: "dur\xE9e ISO",
          ipv4: "adresse IPv4",
          ipv6: "adresse IPv6",
          mac: "adresse MAC",
          cidrv4: "plage IPv4",
          cidrv6: "plage IPv6",
          base64: "cha\xEEne de caract\xE8res encod\xE9e en base64",
          base64url: "cha\xEEne de caract\xE8res encod\xE9e en base64url",
          json_string: "cha\xEEne de caract\xE8res JSON",
          e164: "num\xE9ro au format E.164",
          credit_card: "num\xE9ro de carte de cr\xE9dit",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "entr\xE9e",
        },
        o = {
          string: "cha\xEEne de caract\xE8res",
          number: "nombre",
          int: "entier",
          boolean: "bool\xE9en",
          bigint: "grand entier",
          symbol: "symbole",
          undefined: "ind\xE9fini",
          null: "null",
          never: "jamais",
          void: "vide",
          date: "date",
          array: "tableau",
          object: "objet",
          tuple: "tuple",
          record: "record",
          map: "map",
          set: "ensemble",
          file: "fichier",
          nonoptional: "non optionnel",
          nan: "NaN",
          function: "fonction",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Ap.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Entr\xE9e invalide : instance de ${r.expected} attendu, ${l} re\xE7u`;
            return `Entr\xE9e invalide : ${s} attendu, ${l} re\xE7u`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Entr\xE9e invalide : ${Ap.stringifyPrimitive(r.values[0])} attendu`;
            return `Option invalide : une valeur parmi ${Ap.joinValues(r.values, "|")} attendue`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Trop grand : ${o[r.origin] ?? "valeur"} doit ${a.verb} ${s}${r.maximum.toString()} ${a.unit ?? "\xE9l\xE9ment(s)"}`;
            return `Trop grand : ${o[r.origin] ?? "valeur"} doit \xEAtre ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Trop petit : ${o[r.origin] ?? "valeur"} doit ${a.verb} ${s}${r.minimum.toString()} ${a.unit}`;
            return `Trop petit : ${o[r.origin] ?? "valeur"} doit \xEAtre ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `Cha\xEEne de caract\xE8res invalide : doit commencer par "${s.prefix}"`;
            if (s.format === "ends_with")
              return `Cha\xEEne de caract\xE8res invalide : doit se terminer par "${s.suffix}"`;
            if (s.format === "includes")
              return `Cha\xEEne de caract\xE8res invalide : doit inclure "${s.includes}"`;
            if (s.format === "regex")
              return `Cha\xEEne de caract\xE8res invalide : doit correspondre au motif ${s.pattern}`;
            return `${n[s.format] ?? r.format} invalide`;
          }
          case "not_multiple_of":
            return `Nombre invalide : doit \xEAtre un multiple de ${r.divisor}`;
          case "unrecognized_keys":
            return `Cl\xE9${r.keys.length > 1 ? "s" : ""} non reconnue${r.keys.length > 1 ? "s" : ""} : ${Ap.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Cl\xE9 invalide dans ${r.origin}`;
          case "invalid_union":
            return "Entr\xE9e invalide";
          case "invalid_element":
            return `Valeur invalide dans ${r.origin}`;
          default:
            return "Entr\xE9e invalide";
        }
      };
    };
  function Lq() {
    return { localeError: xq() };
  }
  TA.exports = lo.default;
});

export { $A };
