/**
 * zod/v4/locales/uz.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:480812-484478 cjs-fingerprint
var cC = x(function (Jo, lC) {
  var S3 =
      (Jo && Jo.__createBinding) ||
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
    k3 =
      (Jo && Jo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    E3 =
      (Jo && Jo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) S3(t, e, key);
        }
        return (k3(t, e), t);
      };
  Object.defineProperty(Jo, "__esModule", { value: !0 });
  Jo.default = A3;
  var hh = E3(Ee()),
    P3 = () => {
      let e = {
        string: { unit: "belgi", verb: "bo\u2018lishi kerak" },
        file: { unit: "bayt", verb: "bo\u2018lishi kerak" },
        array: { unit: "element", verb: "bo\u2018lishi kerak" },
        set: { unit: "element", verb: "bo\u2018lishi kerak" },
        map: { unit: "yozuv", verb: "bo\u2018lishi kerak" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "kirish",
          email: "elektron pochta manzili",
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
          datetime: "ISO sana va vaqti",
          date: "ISO sana",
          time: "ISO vaqt",
          duration: "ISO davomiylik",
          ipv4: "IPv4 manzil",
          ipv6: "IPv6 manzil",
          mac: "MAC manzil",
          cidrv4: "IPv4 diapazon",
          cidrv6: "IPv6 diapazon",
          base64: "base64 kodlangan satr",
          base64url: "base64url kodlangan satr",
          json_string: "JSON satr",
          e164: "E.164 raqam",
          credit_card: "kredit karta raqami",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "kirish",
        },
        o = { nan: "NaN", number: "raqam", array: "massiv" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = hh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Noto\u2018g\u2018ri kirish: kutilgan instanceof ${r.expected}, qabul qilingan ${l}`;
            return `Noto\u2018g\u2018ri kirish: kutilgan ${s}, qabul qilingan ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Noto\u2018g\u2018ri kirish: kutilgan ${hh.stringifyPrimitive(r.values[0])}`;
            return `Noto\u2018g\u2018ri variant: quyidagilardan biri kutilgan ${hh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Juda katta: kutilgan ${r.origin ?? "qiymat"} ${s}${r.maximum.toString()} ${a.unit} ${a.verb}`;
            return `Juda katta: kutilgan ${r.origin ?? "qiymat"} ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a) return `Juda kichik: kutilgan ${r.origin} ${s}${r.minimum.toString()} ${a.unit} ${a.verb}`;
            return `Juda kichik: kutilgan ${r.origin} ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `Noto\u2018g\u2018ri satr: "${s.prefix}" bilan boshlanishi kerak`;
            if (s.format === "ends_with")
              return `Noto\u2018g\u2018ri satr: "${s.suffix}" bilan tugashi kerak`;
            if (s.format === "includes")
              return `Noto\u2018g\u2018ri satr: "${s.includes}" ni o\u2018z ichiga olishi kerak`;
            if (s.format === "regex")
              return `Noto\u2018g\u2018ri satr: ${s.pattern} shabloniga mos kelishi kerak`;
            return `Noto\u2018g\u2018ri ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Noto\u2018g\u2018ri raqam: ${r.divisor} ning karralisi bo\u2018lishi kerak`;
          case "unrecognized_keys":
            return `Noma\u2019lum kalit${r.keys.length > 1 ? "lar" : ""}: ${hh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `${r.origin} dagi kalit noto\u2018g\u2018ri`;
          case "invalid_union":
            return "Noto\u2018g\u2018ri kirish";
          case "invalid_element":
            return `${r.origin} da noto\u2018g\u2018ri qiymat`;
          default:
            return "Noto\u2018g\u2018ri kirish";
        }
      };
    };
  function A3() {
    return { localeError: P3() };
  }
  lC.exports = Jo.default;
});

export { cC };
