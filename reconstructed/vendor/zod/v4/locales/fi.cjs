/**
 * zod/v4/locales/fi.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:264670-268418 cjs-fingerprint
var CA = x(function (ao, IA) {
  var Iq =
      (ao && ao.__createBinding) ||
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
    Cq =
      (ao && ao.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    Tq =
      (ao && ao.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) Iq(t, e, key);
        }
        return (Cq(t, e), t);
      };
  Object.defineProperty(ao, "__esModule", { value: !0 });
  ao.default = Rq;
  var Pp = Tq(Ee()),
    $q = () => {
      let e = {
        string: { unit: "merkki\xE4", subject: "merkkijonon" },
        file: { unit: "tavua", subject: "tiedoston" },
        array: { unit: "alkiota", subject: "listan" },
        set: { unit: "alkiota", subject: "joukon" },
        map: { unit: "alkiota", subject: "kuvauksen" },
        number: { unit: "", subject: "luvun" },
        bigint: { unit: "", subject: "suuren kokonaisluvun" },
        int: { unit: "", subject: "kokonaisluvun" },
        date: { unit: "", subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "s\xE4\xE4nn\xF6llinen lauseke",
          email: "s\xE4hk\xF6postiosoite",
          url: "URL-osoite",
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
          datetime: "ISO-aikaleima",
          date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4",
          time: "ISO-aika",
          duration: "ISO-kesto",
          ipv4: "IPv4-osoite",
          ipv6: "IPv6-osoite",
          mac: "MAC-osoite",
          cidrv4: "IPv4-alue",
          cidrv6: "IPv6-alue",
          base64: "base64-koodattu merkkijono",
          base64url: "base64url-koodattu merkkijono",
          json_string: "JSON-merkkijono",
          e164: "E.164-luku",
          credit_card: "luottokortin numero",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "templaattimerkkijono",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Pp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Virheellinen tyyppi: odotettiin instanceof ${r.expected}, oli ${l}`;
            return `Virheellinen tyyppi: odotettiin ${s}, oli ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Virheellinen sy\xF6te: t\xE4ytyy olla ${Pp.stringifyPrimitive(r.values[0])}`;
            return `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${Pp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Liian suuri: ${a.subject} t\xE4ytyy olla ${s}${r.maximum.toString()} ${a.unit}`.trim();
            return `Liian suuri: arvon t\xE4ytyy olla ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Liian pieni: ${a.subject} t\xE4ytyy olla ${s}${r.minimum.toString()} ${a.unit}`.trim();
            return `Liian pieni: arvon t\xE4ytyy olla ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${s.prefix}"`;
            if (s.format === "ends_with") return `Virheellinen sy\xF6te: t\xE4ytyy loppua "${s.suffix}"`;
            if (s.format === "includes")
              return `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${s.includes}"`;
            if (s.format === "regex")
              return `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${s.pattern}`;
            return `Virheellinen ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Virheellinen luku: t\xE4ytyy olla luvun ${r.divisor} monikerta`;
          case "unrecognized_keys":
            return `${r.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${Pp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return "Virheellinen avain tietueessa";
          case "invalid_union":
            return "Virheellinen unioni";
          case "invalid_element":
            return "Virheellinen arvo joukossa";
          default:
            return "Virheellinen sy\xF6te";
        }
      };
    };
  function Rq() {
    return { localeError: $q() };
  }
  IA.exports = ao.default;
});

export { CA };
