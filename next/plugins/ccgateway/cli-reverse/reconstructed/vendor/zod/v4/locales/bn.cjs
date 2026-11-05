/**
 * zod/v4/locales/bn.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:212328-218405 cjs-fingerprint
var require_bn = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "\u0985\u0995\u09CD\u09B7\u09B0",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
      file: {
        unit: "\u09AC\u09BE\u0987\u099F",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
      array: {
        unit: "\u0986\u0987\u099F\u09C7\u09AE",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
      set: {
        unit: "\u0986\u0987\u099F\u09C7\u09AE",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
      map: {
        unit: "\u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "\u0987\u09A8\u09AA\u09C1\u099F",
      email: "\u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
      url: "URL",
      emoji: "\u0987\u09AE\u09CB\u099C\u09BF",
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
      datetime: "ISO \u09A4\u09BE\u09B0\u09BF\u0996 \u0993 \u09B8\u09AE\u09AF\u09BC",
      date: "ISO \u09A4\u09BE\u09B0\u09BF\u0996",
      time: "ISO \u09B8\u09AE\u09AF\u09BC",
      duration: "ISO \u09B8\u09AE\u09AF\u09BC\u0995\u09BE\u09B2",
      ipv4: "IPv4 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
      ipv6: "IPv6 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
      mac: "MAC \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
      cidrv4: "IPv4 \u09B0\u09C7\u099E\u09CD\u099C",
      cidrv6: "IPv6 \u09B0\u09C7\u099E\u09CD\u099C",
      base64: "base64-\u098F\u09A8\u0995\u09CB\u09A1\u09C7\u09A1 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
      base64url:
        "base64url-\u098F\u09A8\u0995\u09CB\u09A1\u09C7\u09A1 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
      json_string: "JSON \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
      e164: "E.164 \u09A8\u09AE\u09CD\u09AC\u09B0",
      credit_card:
        "\u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u0995\u09BE\u09B0\u09CD\u09A1 \u09A8\u09AE\u09CD\u09AC\u09B0",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "\u0987\u09A8\u09AA\u09C1\u099F",
    };
    let TypeDictionary = {
      nan: "NaN",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          return `\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F: \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${expected}, \u09AA\u09CD\u09B0\u09BE\u09AA\u09CD\u09A4 ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F: \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${util.stringifyPrimitive(issue.values[0])}`;
          return `\u0985\u09AC\u09C8\u09A7 \u0985\u09AA\u09B6\u09A8: ${util.joinValues(issue.values, " | ")} \u098F\u09B0 \u09AE\u09A7\u09CD\u09AF\u09C7 \u098F\u0995\u099F\u09BF \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u0985\u09A8\u09C7\u0995 \u09AC\u09A1\u09BC: ${issue.origin ?? "\u09AE\u09BE\u09A8"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "\u098F\u09B2\u09BF\u09AE\u09C7\u09A8\u09CD\u099F"} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          return `\u0985\u09A8\u09C7\u0995 \u09AC\u09A1\u09BC: ${issue.origin ?? "\u09AE\u09BE\u09A8"} ${adj}${issue.maximum.toString()} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u0985\u09A8\u09C7\u0995 \u099B\u09CB\u099F: ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          return `\u0985\u09A8\u09C7\u0995 \u099B\u09CB\u099F: ${issue.origin} ${adj}${issue.minimum.toString()} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${_issue.prefix}" \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B6\u09C1\u09B0\u09C1 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          if (_issue.format === "ends_with")
            return `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${_issue.suffix}" \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B6\u09C7\u09B7 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          if (_issue.format === "includes")
            return `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${_issue.includes}" \u0985\u09A8\u09CD\u09A4\u09B0\u09CD\u09AD\u09C1\u0995\u09CD\u09A4 \u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          if (_issue.format === "regex")
            return `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: ${_issue.pattern} \u09AA\u09CD\u09AF\u09BE\u099F\u09BE\u09B0\u09CD\u09A8 \u09AE\u09BF\u09B2\u09A4\u09C7 \u09B9\u09AC\u09C7`;
          return `\u0985\u09AC\u09C8\u09A7 ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `\u0985\u09AC\u09C8\u09A7 \u09A8\u09AE\u09CD\u09AC\u09B0: ${issue.divisor} \u098F\u09B0 \u0997\u09C1\u09A3\u09BF\u09A4\u0995 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
        case "unrecognized_keys":
          return `\u0985\u099A\u09C7\u09A8\u09BE \u0995\u09C0${issue.keys.length > 1 ? "\u0997\u09C1\u09B2\u09CB" : ""}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `${issue.origin} \u098F \u0985\u09AC\u09C8\u09A7 \u0995\u09C0`;
        case "invalid_union":
          if (issue.options && Array.isArray(issue.options) && issue.options.length > 0)
            return `\u0985\u09AC\u09C8\u09A7 \u09A1\u09BF\u09B8\u0995\u09CD\u09B0\u09BF\u09AE\u09BF\u09A8\u09C7\u099F\u09B0 \u09AE\u09BE\u09A8\u0964 \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
          return "\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F";
        case "invalid_element":
          return `${issue.origin} \u098F \u0985\u09AC\u09C8\u09A7 \u09AE\u09BE\u09A8`;
        default:
          return "\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F";
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
export { require_bn };
