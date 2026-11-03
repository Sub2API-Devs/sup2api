/**
 * zod/v4/locales/lt.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:357387-362750 cjs-fingerprint
var fI = x(function (Eo, dI) {
  var lW =
      (Eo && Eo.__createBinding) ||
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
    cW =
      (Eo && Eo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    uW =
      (Eo && Eo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) lW(t, e, key);
        }
        return (cW(t, e), t);
      };
  Object.defineProperty(Eo, "__esModule", { value: !0 });
  Eo.default = fW;
  var Hp = uW(Ee()),
    Yu = (e) => e.charAt(0).toUpperCase() + e.slice(1);
  function uI(e) {
    let abs = Math.abs(e),
      n = abs % 10,
      o = abs % 100;
    if ((o >= 11 && o <= 19) || n === 0) return "many";
    if (n === 1) return "one";
    return "few";
  }
  var dW = () => {
    let e = {
      string: {
        unit: { one: "simbolis", few: "simboliai", many: "simboli\u0173" },
        verb: {
          smaller: {
            inclusive: "turi b\u016Bti ne ilgesn\u0117 kaip",
            notInclusive: "turi b\u016Bti trumpesn\u0117 kaip",
          },
          bigger: {
            inclusive: "turi b\u016Bti ne trumpesn\u0117 kaip",
            notInclusive: "turi b\u016Bti ilgesn\u0117 kaip",
          },
        },
      },
      file: {
        unit: { one: "baitas", few: "baitai", many: "bait\u0173" },
        verb: {
          smaller: {
            inclusive: "turi b\u016Bti ne didesnis kaip",
            notInclusive: "turi b\u016Bti ma\u017Eesnis kaip",
          },
          bigger: {
            inclusive: "turi b\u016Bti ne ma\u017Eesnis kaip",
            notInclusive: "turi b\u016Bti didesnis kaip",
          },
        },
      },
      array: {
        unit: { one: "element\u0105", few: "elementus", many: "element\u0173" },
        verb: {
          smaller: {
            inclusive: "turi tur\u0117ti ne daugiau kaip",
            notInclusive: "turi tur\u0117ti ma\u017Eiau kaip",
          },
          bigger: {
            inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
            notInclusive: "turi tur\u0117ti daugiau kaip",
          },
        },
      },
      set: {
        unit: { one: "element\u0105", few: "elementus", many: "element\u0173" },
        verb: {
          smaller: {
            inclusive: "turi tur\u0117ti ne daugiau kaip",
            notInclusive: "turi tur\u0117ti ma\u017Eiau kaip",
          },
          bigger: {
            inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
            notInclusive: "turi tur\u0117ti daugiau kaip",
          },
        },
      },
    };
    function t(r, s, a, l) {
      let c = e[r] ?? null;
      if (c === null) return c;
      return { unit: c.unit[s], verb: c.verb[l][a ? "inclusive" : "notInclusive"] };
    }
    let n = {
        regex: "\u012Fvestis",
        email: "el. pa\u0161to adresas",
        url: "URL",
        emoji: "jaustukas",
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
        datetime: "ISO data ir laikas",
        date: "ISO data",
        time: "ISO laikas",
        duration: "ISO trukm\u0117",
        ipv4: "IPv4 adresas",
        ipv6: "IPv6 adresas",
        mac: "MAC adresas",
        cidrv4: "IPv4 tinklo prefiksas (CIDR)",
        cidrv6: "IPv6 tinklo prefiksas (CIDR)",
        base64: "base64 u\u017Ekoduota eilut\u0117",
        base64url: "base64url u\u017Ekoduota eilut\u0117",
        json_string: "JSON eilut\u0117",
        e164: "E.164 numeris",
        credit_card: "kredito kortel\u0117s numeris",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u012Fvestis",
      },
      o = {
        nan: "NaN",
        number: "skai\u010Dius",
        bigint: "sveikasis skai\u010Dius",
        string: "eilut\u0117",
        boolean: "login\u0117 reik\u0161m\u0117",
        undefined: "neapibr\u0117\u017Eta reik\u0161m\u0117",
        function: "funkcija",
        symbol: "simbolis",
        array: "masyvas",
        object: "objektas",
        null: "nulin\u0117 reik\u0161m\u0117",
      };
    return (r) => {
      switch (r.code) {
        case "invalid_type": {
          let s = o[r.expected] ?? r.expected,
            parsedType = Hp.parsedType(r.input),
            l = o[parsedType] ?? parsedType;
          if (/^[A-Z]/.test(r.expected))
            return `Gautas tipas ${l}, o tik\u0117tasi - instanceof ${r.expected}`;
          return `Gautas tipas ${l}, o tik\u0117tasi - ${s}`;
        }
        case "invalid_value":
          if (r.values.length === 1) return `Privalo b\u016Bti ${Hp.stringifyPrimitive(r.values[0])}`;
          return `Privalo b\u016Bti vienas i\u0161 ${Hp.joinValues(r.values, "|")} pasirinkim\u0173`;
        case "too_big": {
          let s = o[r.origin] ?? r.origin,
            a = t(r.origin, uI(Number(r.maximum)), r.inclusive ?? !1, "smaller");
          if (a?.verb)
            return `${Yu(s ?? r.origin ?? "reik\u0161m\u0117")} ${a.verb} ${r.maximum.toString()} ${a.unit ?? "element\u0173"}`;
          let l = r.inclusive ? "ne didesnis kaip" : "ma\u017Eesnis kaip";
          return `${Yu(s ?? r.origin ?? "reik\u0161m\u0117")} turi b\u016Bti ${l} ${r.maximum.toString()} ${a?.unit}`;
        }
        case "too_small": {
          let s = o[r.origin] ?? r.origin,
            a = t(r.origin, uI(Number(r.minimum)), r.inclusive ?? !1, "bigger");
          if (a?.verb)
            return `${Yu(s ?? r.origin ?? "reik\u0161m\u0117")} ${a.verb} ${r.minimum.toString()} ${a.unit ?? "element\u0173"}`;
          let l = r.inclusive ? "ne ma\u017Eesnis kaip" : "didesnis kaip";
          return `${Yu(s ?? r.origin ?? "reik\u0161m\u0117")} turi b\u016Bti ${l} ${r.minimum.toString()} ${a?.unit}`;
        }
        case "invalid_format": {
          let s = r;
          if (s.format === "starts_with") return `Eilut\u0117 privalo prasid\u0117ti "${s.prefix}"`;
          if (s.format === "ends_with") return `Eilut\u0117 privalo pasibaigti "${s.suffix}"`;
          if (s.format === "includes") return `Eilut\u0117 privalo \u012Ftraukti "${s.includes}"`;
          if (s.format === "regex") return `Eilut\u0117 privalo atitikti ${s.pattern}`;
          return `Neteisingas ${n[s.format] ?? r.format}`;
        }
        case "not_multiple_of":
          return `Skai\u010Dius privalo b\u016Bti ${r.divisor} kartotinis.`;
        case "unrecognized_keys":
          return `Neatpa\u017Eint${r.keys.length > 1 ? "i" : "as"} rakt${r.keys.length > 1 ? "ai" : "as"}: ${Hp.joinValues(r.keys, ", ")}`;
        case "invalid_key":
          return "Rastas klaidingas raktas";
        case "invalid_union":
          return "Klaidinga \u012Fvestis";
        case "invalid_element": {
          let s = o[r.origin] ?? r.origin;
          return `${Yu(s ?? r.origin ?? "reik\u0161m\u0117")} turi klaiding\u0105 \u012Fvest\u012F`;
        }
        default:
          return "Klaidinga \u012Fvestis";
      }
    };
  };
  function fW() {
    return { localeError: dW() };
  }
  dI.exports = Eo.default;
});

export { fI };
