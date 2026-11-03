/**
 * zod/v4/locales/is.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:318069-321729 cjs-fingerprint
var YA = x(function (_o, WA) {
  var kG =
      (_o && _o.__createBinding) ||
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
    EG =
      (_o && _o.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    PG =
      (_o && _o.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) kG(t, e, key);
        }
        return (EG(t, e), t);
      };
  Object.defineProperty(_o, "__esModule", { value: !0 });
  _o.default = IG;
  var xp = PG(Ee()),
    AG = () => {
      let e = {
        string: { unit: "stafi", verb: "a\xF0 hafa" },
        file: { unit: "b\xE6ti", verb: "a\xF0 hafa" },
        array: { unit: "hluti", verb: "a\xF0 hafa" },
        set: { unit: "hluti", verb: "a\xF0 hafa" },
        map: { unit: "hluti", verb: "a\xF0 hafa" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "gildi",
          email: "netfang",
          url: "vefsl\xF3\xF0",
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
          datetime: "ISO dagsetning og t\xEDmi",
          date: "ISO dagsetning",
          time: "ISO t\xEDmi",
          duration: "ISO t\xEDmalengd",
          ipv4: "IPv4 address",
          ipv6: "IPv6 address",
          mac: "MAC address",
          cidrv4: "IPv4 range",
          cidrv6: "IPv6 range",
          base64: "base64-encoded strengur",
          base64url: "base64url-encoded strengur",
          json_string: "JSON strengur",
          e164: "E.164 t\xF6lugildi",
          credit_card: "kreditkortan\xFAmer",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "gildi",
        },
        o = { nan: "NaN", number: "n\xFAmer", array: "fylki" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = xp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Rangt gildi: \xDE\xFA sl\xF3st inn ${l} \xFEar sem \xE1 a\xF0 vera instanceof ${r.expected}`;
            return `Rangt gildi: \xDE\xFA sl\xF3st inn ${l} \xFEar sem \xE1 a\xF0 vera ${s}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Rangt gildi: gert r\xE1\xF0 fyrir ${xp.stringifyPrimitive(r.values[0])}`;
            return `\xD3gilt val: m\xE1 vera eitt af eftirfarandi ${xp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${r.origin ?? "gildi"} hafi ${s}${r.maximum.toString()} ${a.unit ?? "hluti"}`;
            return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${r.origin ?? "gildi"} s\xE9 ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${r.origin} hafi ${s}${r.minimum.toString()} ${a.unit}`;
            return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${r.origin} s\xE9 ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\xD3gildur strengur: ver\xF0ur a\xF0 byrja \xE1 "${s.prefix}"`;
            if (s.format === "ends_with")
              return `\xD3gildur strengur: ver\xF0ur a\xF0 enda \xE1 "${s.suffix}"`;
            if (s.format === "includes")
              return `\xD3gildur strengur: ver\xF0ur a\xF0 innihalda "${s.includes}"`;
            if (s.format === "regex")
              return `\xD3gildur strengur: ver\xF0ur a\xF0 fylgja mynstri ${s.pattern}`;
            return `Rangt ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `R\xF6ng tala: ver\xF0ur a\xF0 vera margfeldi af ${r.divisor}`;
          case "unrecognized_keys":
            return `\xD3\xFEekkt ${r.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${xp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Rangur lykill \xED ${r.origin}`;
          case "invalid_union":
            return "Rangt gildi";
          case "invalid_element":
            return `Rangt gildi \xED ${r.origin}`;
          default:
            return "Rangt gildi";
        }
      };
    };
  function IG() {
    return { localeError: AG() };
  }
  WA.exports = _o.default;
});

export { YA };
