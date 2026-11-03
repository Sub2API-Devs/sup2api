/**
 * zod/v4/locales/de.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:236116-239649 cjs-fingerprint
var _A = x(function (to, yA) {
  var XV =
      (to && to.__createBinding) ||
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
    QV =
      (to && to.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    eq =
      (to && to.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) XV(t, e, key);
        }
        return (QV(t, e), t);
      };
  Object.defineProperty(to, "__esModule", { value: !0 });
  to.default = nq;
  var vp = eq(Ee()),
    tq = () => {
      let e = {
        string: { unit: "Zeichen", verb: "zu haben" },
        file: { unit: "Bytes", verb: "zu haben" },
        array: { unit: "Elemente", verb: "zu haben" },
        set: { unit: "Elemente", verb: "zu haben" },
        map: { unit: "Elemente", verb: "zu haben" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "Eingabe",
          email: "E-Mail-Adresse",
          url: "URL",
          emoji: "Emoji",
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
          datetime: "ISO-Datum und -Uhrzeit",
          date: "ISO-Datum",
          time: "ISO-Uhrzeit",
          duration: "ISO-Dauer",
          ipv4: "IPv4-Adresse",
          ipv6: "IPv6-Adresse",
          mac: "MAC-Adresse",
          cidrv4: "IPv4-Bereich",
          cidrv6: "IPv6-Bereich",
          base64: "Base64-codierter String",
          base64url: "Base64-URL-codierter String",
          json_string: "JSON-String",
          e164: "E.164-Nummer",
          credit_card: "Kreditkartennummer",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "Eingabe",
        },
        o = { nan: "NaN", number: "Zahl", array: "Array" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = vp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Ung\xFCltige Eingabe: erwartet instanceof ${r.expected}, erhalten ${l}`;
            return `Ung\xFCltige Eingabe: erwartet ${s}, erhalten ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Ung\xFCltige Eingabe: erwartet ${vp.stringifyPrimitive(r.values[0])}`;
            return `Ung\xFCltige Option: erwartet eine von ${vp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Zu gro\xDF: erwartet, dass ${r.origin ?? "Wert"} ${s}${r.maximum.toString()} ${a.unit ?? "Elemente"} hat`;
            return `Zu gro\xDF: erwartet, dass ${r.origin ?? "Wert"} ${s}${r.maximum.toString()} ist`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a) return `Zu klein: erwartet, dass ${r.origin} ${s}${r.minimum.toString()} ${a.unit} hat`;
            return `Zu klein: erwartet, dass ${r.origin} ${s}${r.minimum.toString()} ist`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Ung\xFCltiger String: muss mit "${s.prefix}" beginnen`;
            if (s.format === "ends_with") return `Ung\xFCltiger String: muss mit "${s.suffix}" enden`;
            if (s.format === "includes") return `Ung\xFCltiger String: muss "${s.includes}" enthalten`;
            if (s.format === "regex") return `Ung\xFCltiger String: muss dem Muster ${s.pattern} entsprechen`;
            return `Ung\xFCltig: ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Ung\xFCltige Zahl: muss ein Vielfaches von ${r.divisor} sein`;
          case "unrecognized_keys":
            return `${r.keys.length > 1 ? "Unbekannte Schl\xFCssel" : "Unbekannter Schl\xFCssel"}: ${vp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Ung\xFCltiger Schl\xFCssel in ${r.origin}`;
          case "invalid_union":
            return "Ung\xFCltige Eingabe";
          case "invalid_element":
            return `Ung\xFCltiger Wert in ${r.origin}`;
          default:
            return "Ung\xFCltige Eingabe";
        }
      };
    };
  function nq() {
    return { localeError: tq() };
  }
  yA.exports = to.default;
});

export { _A };
