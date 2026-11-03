/**
 * zod/v4/locales/sv.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:432414-436028 cjs-fingerprint
var ZI = x(function (Ho, KI) {
  var M2 =
      (Ho && Ho.__createBinding) ||
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
    j2 =
      (Ho && Ho.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    x2 =
      (Ho && Ho.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) M2(t, e, key);
        }
        return (j2(t, e), t);
      };
  Object.defineProperty(Ho, "__esModule", { value: !0 });
  Ho.default = N2;
  var sh = x2(Ee()),
    L2 = () => {
      let e = {
        string: { unit: "tecken", verb: "att ha" },
        file: { unit: "bytes", verb: "att ha" },
        array: { unit: "objekt", verb: "att inneh\xE5lla" },
        set: { unit: "objekt", verb: "att inneh\xE5lla" },
        map: { unit: "objekt", verb: "att inneh\xE5lla" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "regulj\xE4rt uttryck",
          email: "e-postadress",
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
          datetime: "ISO-datum och tid",
          date: "ISO-datum",
          time: "ISO-tid",
          duration: "ISO-varaktighet",
          ipv4: "IPv4-adress",
          ipv6: "IPv6-adress",
          mac: "MAC-adress",
          cidrv4: "IPv4-spektrum",
          cidrv6: "IPv6-spektrum",
          base64: "base64-kodad str\xE4ng",
          base64url: "base64url-kodad str\xE4ng",
          json_string: "JSON-str\xE4ng",
          e164: "E.164-nummer",
          credit_card: "kreditkortsnummer",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "mall-literal",
        },
        o = { nan: "NaN", number: "antal", array: "lista" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = sh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Ogiltig inmatning: f\xF6rv\xE4ntat instanceof ${r.expected}, fick ${l}`;
            return `Ogiltig inmatning: f\xF6rv\xE4ntat ${s}, fick ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Ogiltig inmatning: f\xF6rv\xE4ntat ${sh.stringifyPrimitive(r.values[0])}`;
            return `Ogiltigt val: f\xF6rv\xE4ntade en av ${sh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `F\xF6r stor(t): f\xF6rv\xE4ntade ${r.origin ?? "v\xE4rdet"} att ha ${s}${r.maximum.toString()} ${a.unit ?? "element"}`;
            return `F\xF6r stor(t): f\xF6rv\xE4ntat ${r.origin ?? "v\xE4rdet"} att ha ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `F\xF6r lite(t): f\xF6rv\xE4ntade ${r.origin ?? "v\xE4rdet"} att ha ${s}${r.minimum.toString()} ${a.unit}`;
            return `F\xF6r lite(t): f\xF6rv\xE4ntade ${r.origin ?? "v\xE4rdet"} att ha ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Ogiltig str\xE4ng: m\xE5ste b\xF6rja med "${s.prefix}"`;
            if (s.format === "ends_with") return `Ogiltig str\xE4ng: m\xE5ste sluta med "${s.suffix}"`;
            if (s.format === "includes") return `Ogiltig str\xE4ng: m\xE5ste inneh\xE5lla "${s.includes}"`;
            if (s.format === "regex") return `Ogiltig str\xE4ng: m\xE5ste matcha m\xF6nstret "${s.pattern}"`;
            return `Ogiltig(t) ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Ogiltigt tal: m\xE5ste vara en multipel av ${r.divisor}`;
          case "unrecognized_keys":
            return `${r.keys.length > 1 ? "Ok\xE4nda nycklar" : "Ok\xE4nd nyckel"}: ${sh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Ogiltig nyckel i ${r.origin ?? "v\xE4rdet"}`;
          case "invalid_union":
            return "Ogiltig input";
          case "invalid_element":
            return `Ogiltigt v\xE4rde i ${r.origin ?? "v\xE4rdet"}`;
          default:
            return "Ogiltig input";
        }
      };
    };
  function N2() {
    return { localeError: L2() };
  }
  KI.exports = Ho.default;
});

export { ZI };
