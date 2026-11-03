/**
 * zod/v4/locales/he.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:282390-293096 cjs-fingerprint
var LA = x(function (fo, xA) {
  var Gq =
      (fo && fo.__createBinding) ||
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
    Wq =
      (fo && fo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    Yq =
      (fo && fo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) Gq(t, e, key);
        }
        return (Wq(t, e), t);
      };
  Object.defineProperty(fo, "__esModule", { value: !0 });
  fo.default = Xq;
  var Tp = Yq(Ee()),
    Jq = () => {
      let e = {
          string: { label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA", gender: "f" },
          number: { label: "\u05DE\u05E1\u05E4\u05E8", gender: "m" },
          boolean: { label: "\u05E2\u05E8\u05DA \u05D1\u05D5\u05DC\u05D9\u05D0\u05E0\u05D9", gender: "m" },
          bigint: { label: "BigInt", gender: "m" },
          date: { label: "\u05EA\u05D0\u05E8\u05D9\u05DA", gender: "m" },
          array: { label: "\u05DE\u05E2\u05E8\u05DA", gender: "m" },
          object: { label: "\u05D0\u05D5\u05D1\u05D9\u05D9\u05E7\u05D8", gender: "m" },
          null: { label: "\u05E2\u05E8\u05DA \u05E8\u05D9\u05E7 (null)", gender: "m" },
          undefined: {
            label: "\u05E2\u05E8\u05DA \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8 (undefined)",
            gender: "m",
          },
          symbol: { label: "\u05E1\u05D9\u05DE\u05D1\u05D5\u05DC (Symbol)", gender: "m" },
          function: { label: "\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4", gender: "f" },
          map: { label: "\u05DE\u05E4\u05D4 (Map)", gender: "f" },
          set: { label: "\u05E7\u05D1\u05D5\u05E6\u05D4 (Set)", gender: "f" },
          file: { label: "\u05E7\u05D5\u05D1\u05E5", gender: "m" },
          promise: { label: "Promise", gender: "m" },
          NaN: { label: "NaN", gender: "m" },
          unknown: { label: "\u05E2\u05E8\u05DA \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2", gender: "m" },
          value: { label: "\u05E2\u05E8\u05DA", gender: "m" },
        },
        t = {
          string: {
            unit: "\u05EA\u05D5\u05D5\u05D9\u05DD",
            shortLabel: "\u05E7\u05E6\u05E8",
            longLabel: "\u05D0\u05E8\u05D5\u05DA",
          },
          file: {
            unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD",
            shortLabel: "\u05E7\u05D8\u05DF",
            longLabel: "\u05D2\u05D3\u05D5\u05DC",
          },
          array: {
            unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD",
            shortLabel: "\u05E7\u05D8\u05DF",
            longLabel: "\u05D2\u05D3\u05D5\u05DC",
          },
          set: {
            unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD",
            shortLabel: "\u05E7\u05D8\u05DF",
            longLabel: "\u05D2\u05D3\u05D5\u05DC",
          },
          number: { unit: "", shortLabel: "\u05E7\u05D8\u05DF", longLabel: "\u05D2\u05D3\u05D5\u05DC" },
        },
        n = (u) => (u ? e[u] : void 0),
        o = (u) => {
          let f = n(u);
          if (f) return f.label;
          return u ?? e.unknown.label;
        },
        r = (u) => `\u05D4${o(u)}`,
        s = (u) =>
          (n(u)?.gender ?? "m") === "f"
            ? "\u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05D9\u05D5\u05EA"
            : "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA",
        a = (u) => {
          if (!u) return null;
          return t[u] ?? null;
        },
        l = {
          regex: { label: "\u05E7\u05DC\u05D8", gender: "m" },
          email: {
            label: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
            gender: "f",
          },
          url: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA", gender: "f" },
          emoji: { label: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9", gender: "m" },
          uuid: { label: "UUID", gender: "m" },
          uuidv4: { label: "UUIDv4", gender: "m" },
          uuidv6: { label: "UUIDv6", gender: "m" },
          nanoid: { label: "nanoid", gender: "m" },
          guid: { label: "GUID", gender: "m" },
          cuid: { label: "cuid", gender: "m" },
          cuid2: { label: "cuid2", gender: "m" },
          ulid: { label: "ULID", gender: "m" },
          xid: { label: "XID", gender: "m" },
          ksuid: { label: "KSUID", gender: "m" },
          datetime: { label: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO", gender: "m" },
          date: { label: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO", gender: "m" },
          time: { label: "\u05D6\u05DE\u05DF ISO", gender: "m" },
          duration: { label: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO", gender: "m" },
          ipv4: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4", gender: "f" },
          ipv6: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6", gender: "f" },
          mac: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA MAC", gender: "f" },
          cidrv4: { label: "\u05D8\u05D5\u05D5\u05D7 IPv4", gender: "m" },
          cidrv6: { label: "\u05D8\u05D5\u05D5\u05D7 IPv6", gender: "m" },
          base64: {
            label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64",
            gender: "f",
          },
          base64url: {
            label:
              "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA",
            gender: "f",
          },
          json_string: { label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON", gender: "f" },
          e164: { label: "\u05DE\u05E1\u05E4\u05E8 E.164", gender: "m" },
          credit_card: {
            label: "\u05DE\u05E1\u05E4\u05E8 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D0\u05E9\u05E8\u05D0\u05D9",
            gender: "m",
          },
          iban: { label: "IBAN", gender: "m" },
          jwt: { label: "JWT", gender: "m" },
          template_literal: { label: "\u05E7\u05DC\u05D8", gender: "m" },
          ends_with: { label: "\u05E7\u05DC\u05D8", gender: "m" },
          includes: { label: "\u05E7\u05DC\u05D8", gender: "m" },
          lowercase: { label: "\u05E7\u05DC\u05D8", gender: "m" },
          starts_with: { label: "\u05E7\u05DC\u05D8", gender: "m" },
          uppercase: { label: "\u05E7\u05DC\u05D8", gender: "m" },
        },
        c = { nan: "NaN" };
      return (u) => {
        switch (u.code) {
          case "invalid_type": {
            let expected = u.expected,
              h = c[expected ?? ""] ?? o(expected),
              parsedType = Tp.parsedType(u.input),
              y = c[parsedType] ?? e[parsedType]?.label ?? parsedType;
            if (/^[A-Z]/.test(u.expected))
              return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA instanceof ${u.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${y}`;
            return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${h}, \u05D4\u05EA\u05E7\u05D1\u05DC ${y}`;
          }
          case "invalid_value": {
            if (u.values.length === 1)
              return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05E2\u05E8\u05DA \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA ${Tp.stringifyPrimitive(u.values[0])}`;
            let mapped = u.values.map((y) => Tp.stringifyPrimitive(y));
            if (u.values.length === 2)
              return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05DF ${mapped[0]} \u05D0\u05D5 ${mapped[1]}`;
            let h = mapped[mapped.length - 1];
            return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05DF ${mapped.slice(0, -1).join(", ")} \u05D0\u05D5 ${h}`;
          }
          case "too_big": {
            let f = a(u.origin),
              h = r(u.origin ?? "value");
            if (u.origin === "string")
              return `${f?.longLabel ?? "\u05D0\u05E8\u05D5\u05DA"} \u05DE\u05D3\u05D9: ${h} \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05DB\u05D9\u05DC ${u.maximum.toString()} ${f?.unit ?? ""} ${u.inclusive ? "\u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA" : "\u05DC\u05DB\u05DC \u05D4\u05D9\u05D5\u05EA\u05E8"}`.trim();
            if (u.origin === "number") {
              let b = u.inclusive
                ? `\u05E7\u05D8\u05DF \u05D0\u05D5 \u05E9\u05D5\u05D5\u05D4 \u05DC-${u.maximum}`
                : `\u05E7\u05D8\u05DF \u05DE-${u.maximum}`;
              return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${h} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${b}`;
            }
            if (u.origin === "array" || u.origin === "set") {
              let b = u.origin === "set" ? "\u05E6\u05E8\u05D9\u05DB\u05D4" : "\u05E6\u05E8\u05D9\u05DA",
                w = u.inclusive
                  ? `${u.maximum} ${f?.unit ?? ""} \u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA`
                  : `\u05E4\u05D7\u05D5\u05EA \u05DE-${u.maximum} ${f?.unit ?? ""}`;
              return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${h} ${b} \u05DC\u05D4\u05DB\u05D9\u05DC ${w}`.trim();
            }
            let m = u.inclusive ? "<=" : "<",
              y = s(u.origin ?? "value");
            if (f?.unit)
              return `${f.longLabel} \u05DE\u05D3\u05D9: ${h} ${y} ${m}${u.maximum.toString()} ${f.unit}`;
            return `${f?.longLabel ?? "\u05D2\u05D3\u05D5\u05DC"} \u05DE\u05D3\u05D9: ${h} ${y} ${m}${u.maximum.toString()}`;
          }
          case "too_small": {
            let f = a(u.origin),
              h = r(u.origin ?? "value");
            if (u.origin === "string")
              return `${f?.shortLabel ?? "\u05E7\u05E6\u05E8"} \u05DE\u05D3\u05D9: ${h} \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05DB\u05D9\u05DC ${u.minimum.toString()} ${f?.unit ?? ""} ${u.inclusive ? "\u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8" : "\u05DC\u05E4\u05D7\u05D5\u05EA"}`.trim();
            if (u.origin === "number") {
              let b = u.inclusive
                ? `\u05D2\u05D3\u05D5\u05DC \u05D0\u05D5 \u05E9\u05D5\u05D5\u05D4 \u05DC-${u.minimum}`
                : `\u05D2\u05D3\u05D5\u05DC \u05DE-${u.minimum}`;
              return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${h} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${b}`;
            }
            if (u.origin === "array" || u.origin === "set") {
              let b = u.origin === "set" ? "\u05E6\u05E8\u05D9\u05DB\u05D4" : "\u05E6\u05E8\u05D9\u05DA";
              if (u.minimum === 1 && u.inclusive) {
                let S =
                  u.origin === "set"
                    ? "\u05DC\u05E4\u05D7\u05D5\u05EA \u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3"
                    : "\u05DC\u05E4\u05D7\u05D5\u05EA \u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3";
                return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${h} ${b} \u05DC\u05D4\u05DB\u05D9\u05DC ${S}`;
              }
              let w = u.inclusive
                ? `${u.minimum} ${f?.unit ?? ""} \u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8`
                : `\u05D9\u05D5\u05EA\u05E8 \u05DE-${u.minimum} ${f?.unit ?? ""}`;
              return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${h} ${b} \u05DC\u05D4\u05DB\u05D9\u05DC ${w}`.trim();
            }
            let m = u.inclusive ? ">=" : ">",
              y = s(u.origin ?? "value");
            if (f?.unit)
              return `${f.shortLabel} \u05DE\u05D3\u05D9: ${h} ${y} ${m}${u.minimum.toString()} ${f.unit}`;
            return `${f?.shortLabel ?? "\u05E7\u05D8\u05DF"} \u05DE\u05D3\u05D9: ${h} ${y} ${m}${u.minimum.toString()}`;
          }
          case "invalid_format": {
            let f = u;
            if (f.format === "starts_with")
              return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1 "${f.prefix}"`;
            if (f.format === "ends_with")
              return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${f.suffix}"`;
            if (f.format === "includes")
              return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${f.includes}"`;
            if (f.format === "regex")
              return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${f.pattern}`;
            let h = l[f.format],
              m = h?.label ?? f.format,
              b = (h?.gender ?? "m") === "f" ? "\u05EA\u05E7\u05D9\u05E0\u05D4" : "\u05EA\u05E7\u05D9\u05DF";
            return `${m} \u05DC\u05D0 ${b}`;
          }
          case "not_multiple_of":
            return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${u.divisor}`;
          case "unrecognized_keys":
            return `\u05DE\u05E4\u05EA\u05D7${u.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${u.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${Tp.joinValues(u.keys, ", ")}`;
          case "invalid_key":
            return "\u05E9\u05D3\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1\u05D0\u05D5\u05D1\u05D9\u05D9\u05E7\u05D8";
          case "invalid_union":
            return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
          case "invalid_element":
            return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${r(u.origin ?? "array")}`;
          default:
            return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
        }
      };
    };
  function Xq() {
    return { localeError: Jq() };
  }
  xA.exports = fo.default;
});

export { LA };
