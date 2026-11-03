/**
 * zod/v4/locales/no.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:386088-389543 cjs-fingerprint
var kI = x(function ($o, SI) {
  var NW =
      ($o && $o.__createBinding) ||
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
    UW =
      ($o && $o.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    zW =
      ($o && $o.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) NW(t, e, key);
        }
        return (UW(t, e), t);
      };
  Object.defineProperty($o, "__esModule", { value: !0 });
  $o.default = BW;
  var Wp = zW(Ee()),
    FW = () => {
      let e = {
        string: { unit: "tegn", verb: "\xE5 ha" },
        file: { unit: "bytes", verb: "\xE5 ha" },
        array: { unit: "elementer", verb: "\xE5 inneholde" },
        set: { unit: "elementer", verb: "\xE5 inneholde" },
        map: { unit: "elementer", verb: "\xE5 inneholde" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "input",
          email: "e-postadresse",
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
          datetime: "ISO dato- og klokkeslett",
          date: "ISO-dato",
          time: "ISO-klokkeslett",
          duration: "ISO-varighet",
          ipv4: "IPv4-adresse",
          ipv6: "IPv6-adresse",
          mac: "MAC-adresse",
          cidrv4: "IPv4-spekter",
          cidrv6: "IPv6-spekter",
          base64: "base64-enkodet streng",
          base64url: "base64url-enkodet streng",
          json_string: "JSON-streng",
          e164: "E.164-nummer",
          credit_card: "kredittkortnummer",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "input",
        },
        o = { nan: "NaN", number: "tall", array: "liste" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Wp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Ugyldig input: forventet instanceof ${r.expected}, fikk ${l}`;
            return `Ugyldig input: forventet ${s}, fikk ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Ugyldig verdi: forventet ${Wp.stringifyPrimitive(r.values[0])}`;
            return `Ugyldig valg: forventet en av ${Wp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `For stor(t): forventet ${r.origin ?? "value"} til \xE5 ha ${s}${r.maximum.toString()} ${a.unit ?? "elementer"}`;
            return `For stor(t): forventet ${r.origin ?? "value"} til \xE5 ha ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `For lite(n): forventet ${r.origin} til \xE5 ha ${s}${r.minimum.toString()} ${a.unit}`;
            return `For lite(n): forventet ${r.origin} til \xE5 ha ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Ugyldig streng: m\xE5 starte med "${s.prefix}"`;
            if (s.format === "ends_with") return `Ugyldig streng: m\xE5 ende med "${s.suffix}"`;
            if (s.format === "includes") return `Ugyldig streng: m\xE5 inneholde "${s.includes}"`;
            if (s.format === "regex") return `Ugyldig streng: m\xE5 matche m\xF8nsteret ${s.pattern}`;
            return `Ugyldig ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${r.divisor}`;
          case "unrecognized_keys":
            return `${r.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${Wp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Ugyldig n\xF8kkel i ${r.origin}`;
          case "invalid_union":
            return "Ugyldig input";
          case "invalid_element":
            return `Ugyldig verdi i ${r.origin}`;
          default:
            return "Ugyldig input";
        }
      };
    };
  function BW() {
    return { localeError: FW() };
  }
  SI.exports = $o.default;
});

export { kI };
