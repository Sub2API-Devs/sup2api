/**
 * zod/v4/locales/hu.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:303365-307168 cjs-fingerprint
var HA = x(function (mo, BA) {
  var cG =
      (mo && mo.__createBinding) ||
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
    uG =
      (mo && mo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    dG =
      (mo && mo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) cG(t, e, key);
        }
        return (uG(t, e), t);
      };
  Object.defineProperty(mo, "__esModule", { value: !0 });
  mo.default = pG;
  var Dp = dG(Ee()),
    fG = () => {
      let e = {
        string: { unit: "karakter", verb: "legyen" },
        file: { unit: "byte", verb: "legyen" },
        array: { unit: "elem", verb: "legyen" },
        set: { unit: "elem", verb: "legyen" },
        map: { unit: "elem", verb: "legyen" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "bemenet",
          email: "email c\xEDm",
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
          datetime: "ISO id\u0151b\xE9lyeg",
          date: "ISO d\xE1tum",
          time: "ISO id\u0151",
          duration: "ISO id\u0151intervallum",
          ipv4: "IPv4 c\xEDm",
          ipv6: "IPv6 c\xEDm",
          mac: "MAC c\xEDm",
          cidrv4: "IPv4 tartom\xE1ny",
          cidrv6: "IPv6 tartom\xE1ny",
          base64: "base64-k\xF3dolt string",
          base64url: "base64url-k\xF3dolt string",
          json_string: "JSON string",
          e164: "E.164 sz\xE1m",
          credit_card: "hitelk\xE1rtyasz\xE1m",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "bemenet",
        },
        o = { nan: "NaN", number: "sz\xE1m", array: "t\xF6mb" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Dp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k instanceof ${r.expected}, a kapott \xE9rt\xE9k ${l}`;
            return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${s}, a kapott \xE9rt\xE9k ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${Dp.stringifyPrimitive(r.values[0])}`;
            return `\xC9rv\xE9nytelen opci\xF3: valamelyik \xE9rt\xE9k v\xE1rt ${Dp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `T\xFAl nagy: ${r.origin ?? "\xE9rt\xE9k"} m\xE9rete t\xFAl nagy ${s}${r.maximum.toString()} ${a.unit ?? "elem"}`;
            return `T\xFAl nagy: a bemeneti \xE9rt\xE9k ${r.origin ?? "\xE9rt\xE9k"} t\xFAl nagy: ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${r.origin} m\xE9rete t\xFAl kicsi ${s}${r.minimum.toString()} ${a.unit}`;
            return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${r.origin} t\xFAl kicsi ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\xC9rv\xE9nytelen string: "${s.prefix}" \xE9rt\xE9kkel kell kezd\u0151dnie`;
            if (s.format === "ends_with")
              return `\xC9rv\xE9nytelen string: "${s.suffix}" \xE9rt\xE9kkel kell v\xE9gz\u0151dnie`;
            if (s.format === "includes")
              return `\xC9rv\xE9nytelen string: "${s.includes}" \xE9rt\xE9ket kell tartalmaznia`;
            if (s.format === "regex")
              return `\xC9rv\xE9nytelen string: ${s.pattern} mint\xE1nak kell megfelelnie`;
            return `\xC9rv\xE9nytelen ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\xC9rv\xE9nytelen sz\xE1m: ${r.divisor} t\xF6bbsz\xF6r\xF6s\xE9nek kell lennie`;
          case "unrecognized_keys":
            return `Ismeretlen kulcs${r.keys.length > 1 ? "s" : ""}: ${Dp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `\xC9rv\xE9nytelen kulcs ${r.origin}`;
          case "invalid_union":
            return "\xC9rv\xE9nytelen bemenet";
          case "invalid_element":
            return `\xC9rv\xE9nytelen \xE9rt\xE9k: ${r.origin}`;
          default:
            return "\xC9rv\xE9nytelen bemenet";
        }
      };
    };
  function pG() {
    return { localeError: fG() };
  }
  BA.exports = mo.default;
});

export { HA };
