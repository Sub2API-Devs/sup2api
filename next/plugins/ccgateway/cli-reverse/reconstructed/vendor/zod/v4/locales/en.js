/**
 * zod/v4/locales/en.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-m4y44r15.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { parsedType, stringifyPrimitive, joinValues } from "../core/util.js";

//@ chunk-m4y44r15.js:47724-50437 esm-fingerprint
var error = () => {
  let Sizable = {
    string: {
      unit: "characters",
      verb: "to have",
    },
    file: {
      unit: "bytes",
      verb: "to have",
    },
    array: {
      unit: "items",
      verb: "to have",
    },
    set: {
      unit: "items",
      verb: "to have",
    },
    map: {
      unit: "entries",
      verb: "to have",
    },
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  let FormatDictionary = {
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
  };
  let TypeDictionary = {
    nan: "NaN",
  };
  function getTypeName(type, input) {
    if (type === "number" && typeof input === "number" && !Number.isFinite(input)) return String(input);
    return TypeDictionary[type] ?? type;
  }
  return (issue) => {
    switch (issue.code) {
      case "invalid_type": {
        let expected = getTypeName(issue.expected);
        let receivedType = parsedType(issue.input);
        let received = getTypeName(receivedType, issue.input);
        return `Invalid input: expected ${expected}, received ${received}`;
      }
      case "invalid_value":
        if (issue.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue.values, "|")}`;
      case "too_big": {
        let adj = issue.exact ? "exactly " : issue.inclusive ? "<=" : "<";
        let sizing = getSizing(issue.origin);
        if (sizing)
          return `Too big: expected ${issue.origin ?? "value"} to have ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue.origin ?? "value"} to be ${adj}${issue.maximum.toString()}`;
      }
      case "too_small": {
        let adj = issue.exact ? "exactly " : issue.inclusive ? ">=" : ">";
        let sizing = getSizing(issue.origin);
        if (sizing)
          return `Too small: expected ${issue.origin} to have ${adj}${issue.minimum.toString()} ${sizing.unit}`;
        return `Too small: expected ${issue.origin} to be ${adj}${issue.minimum.toString()}`;
      }
      case "invalid_format": {
        let _issue = issue;
        if (_issue.format === "starts_with") return `Invalid string: must start with "${_issue.prefix}"`;
        if (_issue.format === "ends_with") return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes") return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex") return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue.keys.length > 1 ? "s" : ""}: ${joinValues(issue.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue.origin}`;
      case "invalid_union":
        if (issue.options && Array.isArray(issue.options) && issue.options.length > 0)
          return `Invalid discriminator value. Expected ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
        if (issue.inclusive === false) return "Invalid input: more than one option matched";
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue.origin}`;
      default:
        return "Invalid input";
    }
  };
};
//@ chunk-m4y44r15.js:50437-50476 esm-fingerprint
function defaultLocale() {
  return {
    localeError: error(),
  };
}
export { defaultLocale };
