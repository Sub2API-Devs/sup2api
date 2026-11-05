/**
 * zod/v4/locales/is.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:318438-322098 cjs-fingerprint
var require_is = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "stafi",
        verb: "a\xF0 hafa",
      },
      file: {
        unit: "b\xE6ti",
        verb: "a\xF0 hafa",
      },
      array: {
        unit: "hluti",
        verb: "a\xF0 hafa",
      },
      set: {
        unit: "hluti",
        verb: "a\xF0 hafa",
      },
      map: {
        unit: "hluti",
        verb: "a\xF0 hafa",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "gildi",
      email: "netfang",
      url: "vefsl\xF3\xF0",
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
      datetime: "ISO dagsetning og t\xEDmi",
      date: "ISO dagsetning",
      time: "ISO t\xEDmi",
      duration: "ISO t\xEDmalengd",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      mac: "MAC address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded strengur",
      base64url: "base64url-encoded strengur",
      json_string: "JSON strengur",
      e164: "E.164 t\xF6lugildi",
      credit_card: "kreditkortan\xFAmer",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "gildi",
    };
    let TypeDictionary = {
      nan: "NaN",
      number: "n\xFAmer",
      array: "fylki",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `Rangt gildi: \xDE\xFA sl\xF3st inn ${received} \xFEar sem \xE1 a\xF0 vera instanceof ${issue.expected}`;
          return `Rangt gildi: \xDE\xFA sl\xF3st inn ${received} \xFEar sem \xE1 a\xF0 vera ${expected}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Rangt gildi: gert r\xE1\xF0 fyrir ${util.stringifyPrimitive(issue.values[0])}`;
          return `\xD3gilt val: m\xE1 vera eitt af eftirfarandi ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${issue.origin ?? "gildi"} hafi ${adj}${issue.maximum.toString()} ${sizing.unit ?? "hluti"}`;
          return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${issue.origin ?? "gildi"} s\xE9 ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue.origin} hafi ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue.origin} s\xE9 ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 byrja \xE1 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 enda \xE1 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 innihalda "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 fylgja mynstri ${_issue.pattern}`;
          return `Rangt ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `R\xF6ng tala: ver\xF0ur a\xF0 vera margfeldi af ${issue.divisor}`;
        case "unrecognized_keys":
          return `\xD3\xFEekkt ${issue.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `Rangur lykill \xED ${issue.origin}`;
        case "invalid_union":
          return "Rangt gildi";
        case "invalid_element":
          return `Rangt gildi \xED ${issue.origin}`;
        default:
          return "Rangt gildi";
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
export { require_is };
