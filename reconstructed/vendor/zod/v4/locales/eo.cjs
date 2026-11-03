/**
 * zod/v4/locales/eo.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:250760-254311 cjs-fingerprint
var SA = x(function (io, OA) {
  var pq =
      (io && io.__createBinding) ||
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
    hq =
      (io && io.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    mq =
      (io && io.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) pq(t, e, key);
        }
        return (hq(t, e), t);
      };
  Object.defineProperty(io, "__esModule", { value: !0 });
  io.default = yq;
  var Sp = mq(Ee()),
    gq = () => {
      let e = {
        string: { unit: "karaktrojn", verb: "havi" },
        file: { unit: "bajtojn", verb: "havi" },
        array: { unit: "elementojn", verb: "havi" },
        set: { unit: "elementojn", verb: "havi" },
        map: { unit: "elementojn", verb: "havi" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "enigo",
          email: "retadreso",
          url: "URL",
          emoji: "emo\u011Dio",
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
          datetime: "ISO-datotempo",
          date: "ISO-dato",
          time: "ISO-tempo",
          duration: "ISO-da\u016Dro",
          ipv4: "IPv4-adreso",
          ipv6: "IPv6-adreso",
          mac: "MAC-adreso",
          cidrv4: "IPv4-rango",
          cidrv6: "IPv6-rango",
          base64: "64-ume kodita karaktraro",
          base64url: "URL-64-ume kodita karaktraro",
          json_string: "JSON-karaktraro",
          e164: "E.164-nombro",
          credit_card: "kreditkarta numero",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "enigo",
        },
        o = { nan: "NaN", number: "nombro", array: "tabelo", null: "senvalora" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Sp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Nevalida enigo: atendi\u011Dis instanceof ${r.expected}, ricevi\u011Dis ${l}`;
            return `Nevalida enigo: atendi\u011Dis ${s}, ricevi\u011Dis ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Nevalida enigo: atendi\u011Dis ${Sp.stringifyPrimitive(r.values[0])}`;
            return `Nevalida opcio: atendi\u011Dis unu el ${Sp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Tro granda: atendi\u011Dis ke ${r.origin ?? "valoro"} havu ${s}${r.maximum.toString()} ${a.unit ?? "elementojn"}`;
            return `Tro granda: atendi\u011Dis ke ${r.origin ?? "valoro"} havu ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Tro malgranda: atendi\u011Dis ke ${r.origin} havu ${s}${r.minimum.toString()} ${a.unit}`;
            return `Tro malgranda: atendi\u011Dis ke ${r.origin} estu ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `Nevalida karaktraro: devas komenci\u011Di per "${s.prefix}"`;
            if (s.format === "ends_with") return `Nevalida karaktraro: devas fini\u011Di per "${s.suffix}"`;
            if (s.format === "includes") return `Nevalida karaktraro: devas inkluzivi "${s.includes}"`;
            if (s.format === "regex") return `Nevalida karaktraro: devas kongrui kun la modelo ${s.pattern}`;
            return `Nevalida ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Nevalida nombro: devas esti oblo de ${r.divisor}`;
          case "unrecognized_keys":
            return `Nekonata${r.keys.length > 1 ? "j" : ""} \u015Dlosilo${r.keys.length > 1 ? "j" : ""}: ${Sp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Nevalida \u015Dlosilo en ${r.origin}`;
          case "invalid_union":
            return "Nevalida enigo";
          case "invalid_element":
            return `Nevalida valoro en ${r.origin}`;
          default:
            return "Nevalida enigo";
        }
      };
    };
  function yq() {
    return { localeError: gq() };
  }
  OA.exports = io.default;
});

export { SA };
