/**
 * zod/v4/locales/ota.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:389912-393613 cjs-fingerprint
var require_ota = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "harf",
        verb: "olmal\u0131d\u0131r",
      },
      file: {
        unit: "bayt",
        verb: "olmal\u0131d\u0131r",
      },
      array: {
        unit: "unsur",
        verb: "olmal\u0131d\u0131r",
      },
      set: {
        unit: "unsur",
        verb: "olmal\u0131d\u0131r",
      },
      map: {
        unit: "unsur",
        verb: "olmal\u0131d\u0131r",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "giren",
      email: "epostag\xE2h",
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
      datetime: "ISO heng\xE2m\u0131",
      date: "ISO tarihi",
      time: "ISO zaman\u0131",
      duration: "ISO m\xFCddeti",
      ipv4: "IPv4 ni\u015F\xE2n\u0131",
      ipv6: "IPv6 ni\u015F\xE2n\u0131",
      mac: "MAC ni\u015F\xE2n\u0131",
      cidrv4: "IPv4 menzili",
      cidrv6: "IPv6 menzili",
      base64: "base64-\u015Fifreli metin",
      base64url: "base64url-\u015Fifreli metin",
      json_string: "JSON metin",
      e164: "E.164 say\u0131s\u0131",
      credit_card: "i'tib\xE2r kart\u0131 numaras\u0131",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "giren",
    };
    let TypeDictionary = {
      nan: "NaN",
      number: "numara",
      array: "saf",
      null: "gayb",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `F\xE2sit giren: umulan instanceof ${issue.expected}, al\u0131nan ${received}`;
          return `F\xE2sit giren: umulan ${expected}, al\u0131nan ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `F\xE2sit giren: umulan ${util.stringifyPrimitive(issue.values[0])}`;
          return `F\xE2sit tercih: m\xFBteberler ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Fazla b\xFCy\xFCk: ${issue.origin ?? "value"}, ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmal\u0131yd\u0131.`;
          return `Fazla b\xFCy\xFCk: ${issue.origin ?? "value"}, ${adj}${issue.maximum.toString()} olmal\u0131yd\u0131.`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Fazla k\xFC\xE7\xFCk: ${issue.origin}, ${adj}${issue.minimum.toString()} ${sizing.unit} sahip olmal\u0131yd\u0131.`;
          return `Fazla k\xFC\xE7\xFCk: ${issue.origin}, ${adj}${issue.minimum.toString()} olmal\u0131yd\u0131.`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `F\xE2sit metin: "${_issue.prefix}" ile ba\u015Flamal\u0131.`;
          if (_issue.format === "ends_with") return `F\xE2sit metin: "${_issue.suffix}" ile bitmeli.`;
          if (_issue.format === "includes") return `F\xE2sit metin: "${_issue.includes}" ihtiv\xE2 etmeli.`;
          if (_issue.format === "regex")
            return `F\xE2sit metin: ${_issue.pattern} nak\u015F\u0131na uymal\u0131.`;
          return `F\xE2sit ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `F\xE2sit say\u0131: ${issue.divisor} kat\u0131 olmal\u0131yd\u0131.`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar ${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `${issue.origin} i\xE7in tan\u0131nmayan anahtar var.`;
        case "invalid_union":
          return "Giren tan\u0131namad\u0131.";
        case "invalid_element":
          return `${issue.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
        default:
          return "K\u0131ymet tan\u0131namad\u0131.";
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
export { require_ota };
