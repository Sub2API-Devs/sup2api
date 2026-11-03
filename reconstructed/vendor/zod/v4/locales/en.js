/**
 * zod/v4/locales/en.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (2)
 * attribution: esm-fingerprint 2
 */
import { IIi, nhs, Zgs } from "../core/util.js";

//@ chunk-7vp249v4.js:47724-50437 esm-fingerprint
var Ns = () => {
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
  let r = {
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
    n = { nan: "NaN" };
  function i(s, c) {
    if (s === "number" && typeof c === "number" && !Number.isFinite(c)) return String(c);
    return n[s] ?? s;
  }
  return (s) => {
    switch (s.code) {
      case "invalid_type": {
        let c = i(s.expected),
          a = IIi(s.input),
          l = i(a, s.input);
        return `Invalid input: expected ${c}, received ${l}`;
      }
      case "invalid_value":
        if (s.values.length === 1) return `Invalid input: expected ${nhs(s.values[0])}`;
        return `Invalid option: expected one of ${Zgs(s.values, "|")}`;
      case "too_big": {
        let c = s.exact ? "exactly " : s.inclusive ? "<=" : "<",
          a = t(s.origin);
        if (a)
          return `Too big: expected ${s.origin ?? "value"} to have ${c}${s.maximum.toString()} ${a.unit ?? "elements"}`;
        return `Too big: expected ${s.origin ?? "value"} to be ${c}${s.maximum.toString()}`;
      }
      case "too_small": {
        let c = s.exact ? "exactly " : s.inclusive ? ">=" : ">",
          a = t(s.origin);
        if (a) return `Too small: expected ${s.origin} to have ${c}${s.minimum.toString()} ${a.unit}`;
        return `Too small: expected ${s.origin} to be ${c}${s.minimum.toString()}`;
      }
      case "invalid_format": {
        let c = s;
        if (c.format === "starts_with") return `Invalid string: must start with "${c.prefix}"`;
        if (c.format === "ends_with") return `Invalid string: must end with "${c.suffix}"`;
        if (c.format === "includes") return `Invalid string: must include "${c.includes}"`;
        if (c.format === "regex") return `Invalid string: must match pattern ${c.pattern}`;
        return `Invalid ${r[c.format] ?? s.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${s.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${s.keys.length > 1 ? "s" : ""}: ${Zgs(s.keys, ", ")}`;
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
//@ chunk-7vp249v4.js:50437-50476 esm-fingerprint
function qe() {
  return { localeError: Ns() };
}

export { qe };
