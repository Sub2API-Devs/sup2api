/**
 * zod/v4/locales/en.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:247191-250760 cjs-fingerprint
var B_ = x(function (ro, wA) {
  var lq =
      (ro && ro.__createBinding) ||
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
    cq =
      (ro && ro.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    uq =
      (ro && ro.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) lq(t, e, key);
        }
        return (cq(t, e), t);
      };
  Object.defineProperty(ro, "__esModule", { value: !0 });
  ro.default = fq;
  var Op = uq(Ee()),
    dq = () => {
      let e = {
        string: { unit: "characters", verb: "to have" },
        file: { unit: "bytes", verb: "to have" },
        array: { unit: "items", verb: "to have" },
        set: { unit: "items", verb: "to have" },
        map: { unit: "entries", verb: "to have" },
      };
      function t(s) {
        return e[s] ?? null;
      }
      let n = {
          regex: "input",
          email: "email address",
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
          datetime: "ISO datetime",
          date: "ISO date",
          time: "ISO time",
          duration: "ISO duration",
          ipv4: "IPv4 address",
          ipv6: "IPv6 address",
          mac: "MAC address",
          cidrv4: "IPv4 range",
          cidrv6: "IPv6 range",
          base64: "base64-encoded string",
          base64url: "base64url-encoded string",
          json_string: "JSON string",
          e164: "E.164 number",
          credit_card: "credit card number",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "input",
        },
        o = { nan: "NaN" };
      function r(s, a) {
        if (s === "number" && typeof a === "number" && !Number.isFinite(a)) return String(a);
        return o[s] ?? s;
      }
      return (s) => {
        switch (s.code) {
          case "invalid_type": {
            let a = r(s.expected),
              parsedType = Op.parsedType(s.input),
              c = r(parsedType, s.input);
            return `Invalid input: expected ${a}, received ${c}`;
          }
          case "invalid_value":
            if (s.values.length === 1) return `Invalid input: expected ${Op.stringifyPrimitive(s.values[0])}`;
            return `Invalid option: expected one of ${Op.joinValues(s.values, "|")}`;
          case "too_big": {
            let a = s.exact ? "exactly " : s.inclusive ? "<=" : "<",
              l = t(s.origin);
            if (l)
              return `Too big: expected ${s.origin ?? "value"} to have ${a}${s.maximum.toString()} ${l.unit ?? "elements"}`;
            return `Too big: expected ${s.origin ?? "value"} to be ${a}${s.maximum.toString()}`;
          }
          case "too_small": {
            let a = s.exact ? "exactly " : s.inclusive ? ">=" : ">",
              l = t(s.origin);
            if (l) return `Too small: expected ${s.origin} to have ${a}${s.minimum.toString()} ${l.unit}`;
            return `Too small: expected ${s.origin} to be ${a}${s.minimum.toString()}`;
          }
          case "invalid_format": {
            let a = s;
            if (a.format === "starts_with") return `Invalid string: must start with "${a.prefix}"`;
            if (a.format === "ends_with") return `Invalid string: must end with "${a.suffix}"`;
            if (a.format === "includes") return `Invalid string: must include "${a.includes}"`;
            if (a.format === "regex") return `Invalid string: must match pattern ${a.pattern}`;
            return `Invalid ${n[a.format] ?? s.format}`;
          }
          case "not_multiple_of":
            return `Invalid number: must be a multiple of ${s.divisor}`;
          case "unrecognized_keys":
            return `Unrecognized key${s.keys.length > 1 ? "s" : ""}: ${Op.joinValues(s.keys, ", ")}`;
          case "invalid_key":
            return `Invalid key in ${s.origin}`;
          case "invalid_union":
            if (s.options && Array.isArray(s.options) && s.options.length > 0)
              return `Invalid discriminator value. Expected ${s.options.map((option) => `'${option}'`).join(" | ")}`;
            if (s.inclusive === !1) return "Invalid input: more than one option matched";
            return "Invalid input";
          case "invalid_element":
            return `Invalid value in ${s.origin}`;
          default:
            return "Invalid input";
        }
      };
    };
  function fq() {
    return { localeError: dq() };
  }
  wA.exports = ro.default;
});

export { B_ };
