/**
 * zod/v4/locales/ro.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:413292-417097 cjs-fingerprint
var require_ro = __commonJS(function (cjsExports, cjsModule) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = default_1;
  var util = __importStar(require_util());
  var error = () => {
    let Sizable = {
      string: {
        unit: "caractere",
        verb: "s\u0103 aib\u0103",
      },
      file: {
        unit: "octe\u021Bi",
        verb: "s\u0103 aib\u0103",
      },
      array: {
        unit: "elemente",
        verb: "s\u0103 aib\u0103",
      },
      set: {
        unit: "elemente",
        verb: "s\u0103 aib\u0103",
      },
      map: {
        unit: "intr\u0103ri",
        verb: "s\u0103 aib\u0103",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "intrare",
      email: "adres\u0103 de email",
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
      datetime: "dat\u0103 \u0219i or\u0103 ISO",
      date: "dat\u0103 ISO",
      time: "or\u0103 ISO",
      duration: "durat\u0103 ISO",
      ipv4: "adres\u0103 IPv4",
      ipv6: "adres\u0103 IPv6",
      mac: "adres\u0103 MAC",
      cidrv4: "interval IPv4",
      cidrv6: "interval IPv6",
      base64: "\u0219ir codat base64",
      base64url: "\u0219ir codat base64url",
      json_string: "\u0219ir JSON",
      e164: "num\u0103r E.164",
      credit_card: "num\u0103r de card de credit",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "intrare",
    };
    let TypeDictionary = {
      nan: "NaN",
      string: "\u0219ir",
      number: "num\u0103r",
      boolean: "boolean",
      function: "func\u021Bie",
      array: "matrice",
      object: "obiect",
      undefined: "nedefinit",
      symbol: "simbol",
      bigint: "num\u0103r mare",
      void: "void",
      never: "never",
      map: "hart\u0103",
      set: "set",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          return `Intrare invalid\u0103: a\u0219teptat ${expected}, primit ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Intrare invalid\u0103: a\u0219teptat ${util.stringifyPrimitive(issue.values[0])}`;
          return `Op\u021Biune invalid\u0103: a\u0219teptat una dintre ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Prea mare: a\u0219teptat ca ${issue.origin ?? "valoarea"} ${sizing.verb} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elemente"}`;
          return `Prea mare: a\u0219teptat ca ${issue.origin ?? "valoarea"} s\u0103 fie ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Prea mic: a\u0219teptat ca ${issue.origin} ${sizing.verb} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `Prea mic: a\u0219teptat ca ${issue.origin} s\u0103 fie ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\u0218ir invalid: trebuie s\u0103 \xEEnceap\u0103 cu "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u0218ir invalid: trebuie s\u0103 se termine cu "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u0218ir invalid: trebuie s\u0103 includ\u0103 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u0218ir invalid: trebuie s\u0103 se potriveasc\u0103 cu modelul ${_issue.pattern}`;
          return `Format invalid: ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `Num\u0103r invalid: trebuie s\u0103 fie multiplu de ${issue.divisor}`;
        case "unrecognized_keys":
          return `Chei nerecunoscute: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `Cheie invalid\u0103 \xEEn ${issue.origin}`;
        case "invalid_union":
          return "Intrare invalid\u0103";
        case "invalid_element":
          return `Valoare invalid\u0103 \xEEn ${issue.origin}`;
        default:
          return "Intrare invalid\u0103";
      }
    };
  };
  function default_1() {
    return {
      localeError: error(),
    };
  }
  cjsModule.exports = cjsExports.default;
});
export { require_ro };
