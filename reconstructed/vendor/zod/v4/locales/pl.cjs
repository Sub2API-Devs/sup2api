/**
 * zod/v4/locales/pl.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:398907-403079 cjs-fingerprint
var TI = x(function (jo, CI) {
  var QW =
      (jo && jo.__createBinding) ||
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
    e2 =
      (jo && jo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    t2 =
      (jo && jo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) QW(t, e, key);
        }
        return (e2(t, e), t);
      };
  Object.defineProperty(jo, "__esModule", { value: !0 });
  jo.default = r2;
  var Xp = t2(Ee()),
    n2 = () => {
      let e = {
        string: { unit: "znak\xF3w", verb: "mie\u0107" },
        file: { unit: "bajt\xF3w", verb: "mie\u0107" },
        array: { unit: "element\xF3w", verb: "mie\u0107" },
        set: { unit: "element\xF3w", verb: "mie\u0107" },
        map: { unit: "element\xF3w", verb: "mie\u0107" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "wyra\u017Cenie",
          email: "adres email",
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
          datetime: "data i godzina w formacie ISO",
          date: "data w formacie ISO",
          time: "godzina w formacie ISO",
          duration: "czas trwania ISO",
          ipv4: "adres IPv4",
          ipv6: "adres IPv6",
          mac: "adres MAC",
          cidrv4: "zakres IPv4",
          cidrv6: "zakres IPv6",
          base64: "ci\u0105g znak\xF3w zakodowany w formacie base64",
          base64url: "ci\u0105g znak\xF3w zakodowany w formacie base64url",
          json_string: "ci\u0105g znak\xF3w w formacie JSON",
          e164: "liczba E.164",
          credit_card: "numer karty kredytowej",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "wej\u015Bcie",
        },
        o = { nan: "NaN", number: "liczba", array: "tablica" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Xp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano instanceof ${r.expected}, otrzymano ${l}`;
            return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${s}, otrzymano ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${Xp.stringifyPrimitive(r.values[0])}`;
            return `Nieprawid\u0142owa opcja: oczekiwano jednej z warto\u015Bci ${Xp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Za du\u017Ca warto\u015B\u0107: oczekiwano, \u017Ce ${r.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${s}${r.maximum.toString()} ${a.unit ?? "element\xF3w"}`;
            return `Zbyt du\u017C(y/a/e): oczekiwano, \u017Ce ${r.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Za ma\u0142a warto\u015B\u0107: oczekiwano, \u017Ce ${r.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${s}${r.minimum.toString()} ${a.unit ?? "element\xF3w"}`;
            return `Zbyt ma\u0142(y/a/e): oczekiwano, \u017Ce ${r.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zaczyna\u0107 si\u0119 od "${s.prefix}"`;
            if (s.format === "ends_with")
              return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi ko\u0144czy\u0107 si\u0119 na "${s.suffix}"`;
            if (s.format === "includes")
              return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zawiera\u0107 "${s.includes}"`;
            if (s.format === "regex")
              return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi odpowiada\u0107 wzorcowi ${s.pattern}`;
            return `Nieprawid\u0142ow(y/a/e) ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Nieprawid\u0142owa liczba: musi by\u0107 wielokrotno\u015Bci\u0105 ${r.divisor}`;
          case "unrecognized_keys":
            return `Nierozpoznane klucze${r.keys.length > 1 ? "s" : ""}: ${Xp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Nieprawid\u0142owy klucz w ${r.origin}`;
          case "invalid_union":
            return "Nieprawid\u0142owe dane wej\u015Bciowe";
          case "invalid_element":
            return `Nieprawid\u0142owa warto\u015B\u0107 w ${r.origin}`;
          default:
            return "Nieprawid\u0142owe dane wej\u015Bciowe";
        }
      };
    };
  function r2() {
    return { localeError: n2() };
  }
  CI.exports = jo.default;
});

export { TI };
