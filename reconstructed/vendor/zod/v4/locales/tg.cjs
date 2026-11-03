/**
 * zod/v4/locales/tg.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:443954-451038 cjs-fingerprint
var WI = x(function (Zo, GI) {
  var K2 =
      (Zo && Zo.__createBinding) ||
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
    Z2 =
      (Zo && Zo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    V2 =
      (Zo && Zo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) K2(t, e, key);
        }
        return (Z2(t, e), t);
      };
  Object.defineProperty(Zo, "__esModule", { value: !0 });
  Zo.default = G2;
  var lh = V2(Ee()),
    q2 = () => {
      let e = {
        string: {
          unit: "\u0430\u043B\u043E\u043C\u0430\u0442",
          verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
        },
        file: {
          unit: "\u0431\u0430\u0439\u0442",
          verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
        },
        array: {
          unit: "\u0443\u043D\u0441\u0443\u0440",
          verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
        },
        set: {
          unit: "\u0443\u043D\u0441\u0443\u0440",
          verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
        },
        map: {
          unit: "\u0441\u0430\u0431\u0442",
          verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
        },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u0432\u0443\u0440\u0443\u0434",
          email: "\u0441\u0443\u0440\u043E\u0493\u0430\u0438 email",
          url: "URL",
          emoji: "\u044D\u043C\u043E\u04B7\u0438",
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
          datetime: "\u0441\u0430\u043D\u0430\u0432\u0443 \u0432\u0430\u049B\u0442\u0438 ISO",
          date: "\u0441\u0430\u043D\u0430\u0438 ISO",
          time: "\u0432\u0430\u049B\u0442\u0438 ISO",
          duration: "\u0434\u0430\u0432\u043E\u043C\u043D\u043E\u043A\u0438\u0438 ISO",
          ipv4: "\u0441\u0443\u0440\u043E\u0493\u0430\u0438 IPv4",
          ipv6: "\u0441\u0443\u0440\u043E\u0493\u0430\u0438 IPv6",
          mac: "\u0441\u0443\u0440\u043E\u0493\u0430\u0438 MAC",
          cidrv4: "\u043C\u0430\u04B3\u0434\u0443\u0434\u0430\u0438 IPv4",
          cidrv6: "\u043C\u0430\u04B3\u0434\u0443\u0434\u0430\u0438 IPv6",
          base64:
            "\u0441\u0430\u0442\u0440\u0438 \u0434\u0430\u0440 \u0444\u043E\u0440\u043C\u0430\u0442\u0438 base64",
          base64url:
            "\u0441\u0430\u0442\u0440\u0438 \u0434\u0430\u0440 \u0444\u043E\u0440\u043C\u0430\u0442\u0438 base64url",
          json_string: "\u0441\u0430\u0442\u0440\u0438 JSON",
          e164: "\u0440\u0430\u049B\u0430\u043C\u0438 E.164",
          credit_card:
            "\u0440\u0430\u049B\u0430\u043C\u0438 \u043A\u043E\u0440\u0442\u0438 \u043A\u0440\u0435\u0434\u0438\u0442\u04E3",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u0432\u0443\u0440\u0443\u0434",
        },
        o = {
          nan: "NaN",
          number: "\u0440\u0430\u049B\u0430\u043C",
          string: "\u0441\u0430\u0442\u0440",
          array: "\u043C\u0430\u0441\u0441\u0438\u0432",
          object: "\u043E\u0431\u044A\u0435\u043A\u0442",
          date: "\u0441\u0430\u043D\u0430",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = lh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            return `\u0412\u0443\u0440\u0443\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: ${s} \u0438\u043D\u0442\u0438\u0437\u043E\u0440 \u043C\u0435\u0440\u0430\u0444\u0442, ${l} \u0433\u0438\u0440\u0438\u0444\u0442\u0430 \u0448\u0443\u0434`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u0412\u0443\u0440\u0443\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: ${lh.stringifyPrimitive(r.values[0])} \u0438\u043D\u0442\u0438\u0437\u043E\u0440 \u043C\u0435\u0440\u0430\u0444\u0442`;
            return `\u0418\u043D\u0442\u0438\u0445\u043E\u0431\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u044F\u043A\u0435 \u0430\u0437 ${lh.joinValues(r.values, "|")} \u0438\u043D\u0442\u0438\u0437\u043E\u0440 \u043C\u0435\u0440\u0430\u0444\u0442`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `\u0425\u0435\u043B\u0435 \u043A\u0430\u043B\u043E\u043D: ${r.origin ?? "\u049B\u0438\u043C\u0430\u0442"} \u0431\u043E\u044F\u0434 ${s}${r.maximum.toString()} ${a.unit} ${a.verb}`;
            return `\u0425\u0435\u043B\u0435 \u043A\u0430\u043B\u043E\u043D: ${r.origin ?? "\u049B\u0438\u043C\u0430\u0442"} \u0431\u043E\u044F\u0434 ${s}${r.maximum.toString()} \u0431\u043E\u0448\u0430\u0434`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `\u0425\u0435\u043B\u0435 \u0445\u0443\u0440\u0434: ${r.origin} \u0431\u043E\u044F\u0434 ${s}${r.minimum.toString()} ${a.unit} ${a.verb}`;
            return `\u0425\u0435\u043B\u0435 \u0445\u0443\u0440\u0434: ${r.origin} \u0431\u043E\u044F\u0434 ${s}${r.minimum.toString()} \u0431\u043E\u0448\u0430\u0434`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u0421\u0430\u0442\u0440\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 \u0431\u043E "${s.prefix}" \u043E\u0493\u043E\u0437 \u0448\u0430\u0432\u0430\u0434`;
            if (s.format === "ends_with")
              return `\u0421\u0430\u0442\u0440\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 \u0431\u043E "${s.suffix}" \u0430\u043D\u04B7\u043E\u043C \u0451\u0431\u0430\u0434`;
            if (s.format === "includes")
              return `\u0421\u0430\u0442\u0440\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 "${s.includes}"-\u0440\u043E \u0434\u0430\u0440 \u0431\u0430\u0440 \u0433\u0438\u0440\u0430\u0434`;
            if (s.format === "regex")
              return `\u0421\u0430\u0442\u0440\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 \u0431\u0430 \u043D\u0430\u043C\u0443\u043D\u0430\u0438 ${s.pattern} \u043C\u0443\u0432\u043E\u0444\u0438\u049B\u0430\u0442 \u043A\u0443\u043D\u0430\u0434`;
            return `${n[s.format] ?? r.format}-\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442`;
          }
          case "not_multiple_of":
            return `\u0420\u0430\u049B\u0430\u043C\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 \u0431\u0430 ${r.divisor} \u0431\u0435 \u0431\u0430\u049B\u0438\u044F \u0442\u0430\u049B\u0441\u0438\u043C \u0448\u0430\u0432\u0430\u0434`;
          case "unrecognized_keys":
            return `\u041A\u0430\u043B\u0438\u0434${r.keys.length > 1 ? "\u04B3\u043E\u0438" : "\u0438"} \u043D\u043E\u043C\u0430\u044A\u043B\u0443\u043C: ${lh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `\u041A\u0430\u043B\u0438\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442 \u0434\u0430\u0440 ${r.origin}`;
          case "invalid_union":
            if (r.options && Array.isArray(r.options) && r.options.length > 0)
              return `\u049A\u0438\u043C\u0430\u0442\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442\u0438 \u0434\u0438\u0441\u043A\u0440\u0438\u043C\u0438\u043D\u0430\u0442\u043E\u0440: ${r.options.map((option) => `'${option}'`).join(" | ")} \u0438\u043D\u0442\u0438\u0437\u043E\u0440 \u043C\u0435\u0440\u0430\u0444\u0442`;
            return "\u0412\u0443\u0440\u0443\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442";
          case "invalid_element":
            return `\u049A\u0438\u043C\u0430\u0442\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442 \u0434\u0430\u0440 ${r.origin}`;
          default:
            return "\u0412\u0443\u0440\u0443\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442";
        }
      };
    };
  function G2() {
    return { localeError: q2() };
  }
  GI.exports = Zo.default;
});

export { WI };
