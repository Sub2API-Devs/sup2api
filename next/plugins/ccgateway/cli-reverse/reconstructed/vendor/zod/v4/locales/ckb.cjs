/**
 * zod/v4/locales/ckb.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:221638-228564 cjs-fingerprint
var require_ckb = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "\u067E\u06CC\u062A",
        verb: "\u0628\u06CE\u062A",
      },
      file: {
        unit: "\u0628\u0627\u06CC\u062A",
        verb: "\u0628\u06CE\u062A",
      },
      array: {
        unit: "\u062F\u0627\u0646\u06D5",
        verb: "\u0628\u06CE\u062A",
      },
      set: {
        unit: "\u062F\u0627\u0646\u06D5",
        verb: "\u0628\u06CE\u062A",
      },
      map: {
        unit: "\u062F\u0627\u0646\u06D5",
        verb: "\u0628\u06CE\u062A",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "regex",
      email: "\u0626\u06CC\u0645\u06D5\u06CC\u06B5",
      url: "\u0628\u06D5\u0633\u062A\u06D5\u0631 (URL)",
      emoji: "\u0626\u06CC\u0645\u06C6\u062C\u06CC",
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
      datetime: "\u0695\u06CE\u06A9\u06D5\u0648\u062A \u0648 \u06A9\u0627\u062A",
      date: "\u0695\u06CE\u06A9\u06D5\u0648\u062A",
      time: "\u06A9\u0627\u062A",
      duration: "\u0645\u0627\u0648\u06D5",
      ipv4: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC IPv4",
      ipv6: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC IPv6",
      mac: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC MAC",
      cidrv4: "\u0645\u06D5\u0648\u062F\u0627\u06CC IPv4",
      cidrv6: "\u0645\u06D5\u0648\u062F\u0627\u06CC IPv6",
      base64: "\u062F\u06D5\u0642\u06CC base64",
      base64url: "\u062F\u06D5\u0642\u06CC base64url",
      json_string: "\u062F\u06D5\u0642\u06CC JSON",
      e164: "\u0698\u0645\u0627\u0631\u06D5\u06CC E.164",
      credit_card:
        "\u0698\u0645\u0627\u0631\u06D5\u06CC \u06A9\u0627\u0631\u062A\u06CC \u06A9\u0631\u06CE\u062F\u06CC\u062A",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "\u062A\u06CE\u06A9\u0631\u062F\u06D5",
    };
    let TypeDictionary = {
      nan: "NaN",
      string: "\u0646\u0648\u0648\u0633\u06CC\u0646",
      number: "\u0698\u0645\u0627\u0631\u06D5",
      boolean: "boolean",
      array: "array",
      object: "object",
      date: "\u0695\u06CE\u06A9\u06D5\u0648\u062A",
      integer: "\u0698\u0645\u0627\u0631\u06D5",
      float: "\u0698\u0645\u0627\u0631\u06D5",
      null: "null",
      undefined: "undefined",
      function: "function",
      symbol: "symbol",
      unknown: "unknown",
      promise: "promise",
      void: "void",
      never: "never",
      map: "map",
      set: "set",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          let postfix = ["\u0627", "\u0648", "\u06C6", "\u0648\u0648", "\u06D5", "\u06CC", "\u06CE"].some(
            (p) => received.endsWith(p),
          )
            ? "\u06CC\u06D5"
            : "\u06D5";
          let isEnglish = /^[a-zA-Z]+$/.test(received);
          if (receivedType === "null" || receivedType === "undefined")
            return "\u062F\u0627\u0648\u0627\u06A9\u0631\u0627\u0648\u06D5";
          return `\u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 ${expected} \u0628\u06CE\u062A\u060C \u0628\u06D5\u06B5\u0627\u0645 ${received}${isEnglish ? "" : postfix}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `\u0628\u06D5\u0647\u0627\u06A9\u06D5 \u0646\u0627\u062F\u0631\u0648\u0648\u0633\u062A\u06D5: \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 ${util.stringifyPrimitive(issue.values[0])} \u0628\u06CE\u062A`;
          return `\u0647\u06D5\u06B5\u0628\u0698\u0627\u0631\u062F\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 \u06CC\u06D5\u06A9\u06CE\u06A9 \u0628\u06CE\u062A \u0644\u06D5 ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u0632\u06C6\u0631\u06D5\u0648\u06D5 ${issue.maximum.toString()} ${sizing.unit} ${sizing.verb}`;
          return `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u0632\u06C6\u0631\u06D5\u0648\u06D5 ${issue.maximum.toString()} \u0628\u06CE\u062A`;
        }
        case "too_small": {
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u06A9\u06D5\u0645\u06D5\u0648\u06D5 ${issue.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
          return `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u06A9\u06D5\u0645\u06D5\u0648\u06D5 ${issue.minimum.toString()} \u0628\u06CE\u062A`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u062F\u06D5\u0633\u062A\u067E\u06CE\u0628\u06A9\u0627\u062A \u0628\u06D5 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u06A9\u06C6\u062A\u0627\u06CC\u06CC\u0628\u06CE\u062A \u0628\u06D5 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 "${_issue.includes}" \u0644\u06D5\u062E\u06C6\u0628\u06AF\u0631\u06CE\u062A`;
          if (_issue.format === "regex")
            return `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0644\u06D5\u06AF\u06D5\u06B5 \u067E\u0627\u062A\u06CE\u0631\u0646\u06CC ${_issue.pattern} \u0628\u06AF\u0648\u0646\u062C\u06CE\u062A`;
          return `\u0628\u06D5\u0647\u0627\u06CC ${FormatDictionary[_issue.format] ?? issue.format} \u0646\u0627\u062F\u0631\u0648\u0633\u062A\u06D5`;
        }
        case "not_multiple_of":
          return `\u0698\u0645\u0627\u0631\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u062F\u06D5\u0628\u06CE\u062A \u0686\u06D5\u0646\u062F \u0647\u06CE\u0646\u062F\u06D5 \u0628\u06CE\u062A \u0628\u06C6 ${issue.divisor}`;
        case "unrecognized_keys":
          return `\u06A9\u0644\u06CC\u0644\u06CC \u0646\u06D5\u0646\u0627\u0633\u0631\u0627\u0648: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `\u06A9\u0644\u06CC\u0644\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A \u0644\u06D5 ${issue.origin}`;
        case "invalid_union":
          if (issue.options && Array.isArray(issue.options) && issue.options.length > 0)
            return `\u0628\u06D5\u0647\u0627\u06CC \u0646\u06D5\u0646\u0627\u0633\u0631\u0627\u0648 \u0647\u06D5\u06CC\u06D5. \u0628\u06D5\u0647\u0627\u06CC \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648: ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
          return "\u06CC\u06D5\u06A9\u06AF\u0631\u062A\u0646\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A";
        case "invalid_element":
          return `${issue.origin} \u0628\u06D5\u0647\u0627\u06A9\u06D5 \u0646\u0627\u062F\u0631\u0648\u0633\u062A\u06D5`;
        default:
          return "\u062A\u06CE\u06A9\u0631\u062F\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A";
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
export { require_ckb };
