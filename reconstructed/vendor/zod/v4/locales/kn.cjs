/**
 * zod/v4/locales/kn.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:345707-352814 cjs-fingerprint
var require_kn = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "\u0C85\u0C95\u0CCD\u0CB7\u0CB0\u0C97\u0CB3\u0CC1",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
      file: {
        unit: "\u0CAC\u0CC8\u0C9F\u0CCD\u200C\u0C97\u0CB3\u0CC1",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
      array: {
        unit: "\u0CB5\u0CB8\u0CCD\u0CA4\u0CC1\u0C97\u0CB3\u0CC1",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
      set: {
        unit: "\u0CB5\u0CB8\u0CCD\u0CA4\u0CC1\u0C97\u0CB3\u0CC1",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
      map: {
        unit: "entries",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "\u0C87\u0CA8\u0CCD\u0CAA\u0CC1\u0C9F\u0CCD",
      email: "email \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8",
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
      datetime: "ISO \u0CA6\u0CBF\u0CA8\u0CBE\u0C82\u0C95\u0CA6 \u0CB8\u0CAE\u0CAF",
      date: "ISO \u0CA6\u0CBF\u0CA8\u0CBE\u0C82\u0C95",
      time: "ISO \u0CB8\u0CAE\u0CAF",
      duration: "ISO \u0C85\u0CB5\u0CA7\u0CBF",
      ipv4: "IPv4 \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8",
      ipv6: "IPv6 \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8",
      mac: "MAC \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8",
      cidrv4: "IPv4 \u0CB5\u0CCD\u0CAF\u0CBE\u0CAA\u0CCD\u0CA4\u0CBF\u0CAF",
      cidrv6: "IPv6 \u0CB5\u0CCD\u0CAF\u0CBE\u0CAA\u0CCD\u0CA4\u0CBF\u0CAF",
      base64: "base64-encoded\u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD",
      base64url: "base64url-encoded\u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD",
      json_string: "JSON\u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD",
      e164: "E.164 \u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6",
      credit_card:
        "\u0C95\u0CCD\u0CB0\u0CC6\u0CA1\u0CBF\u0C9F\u0CCD \u0C95\u0CBE\u0CB0\u0CCD\u0CA1\u0CCD \u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "\u0C87\u0CA8\u0CCD\u0CAA\u0CC1\u0C9F\u0CCD",
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
          return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C87\u0CA8\u0CCD\u200C\u0CAA\u0CC1\u0C9F\u0CCD: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${expected}, \u0CB8\u0CCD\u0CB5\u0CC0\u0C95\u0CB0\u0CBF\u0CB8\u0CBF\u0CA6\u0CA8\u0CC1 ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C87\u0CA8\u0CCD\u200C\u0CAA\u0CC1\u0C9F\u0CCD: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${util.stringifyPrimitive(issue.values[0])}`;
          return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C86\u0CAF\u0CCD\u0C95\u0CC6: \u0C87\u0CB5\u0CC1\u0C97\u0CB3\u0CB2\u0CCD\u0CB2\u0CBF \u0C92\u0C82\u0CA6\u0CA8\u0CCD\u0CA8\u0CC1 \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0CA6\u0CCA\u0CA1\u0CCD\u0CA1\u0CA6\u0CC1: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${issue.origin ?? "value"} \u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1 ${adj}${issue.maximum.toString()} ${sizing.unit ?? "\u0C85\u0C82\u0CB6\u0C97\u0CB3\u0CC1"}`;
          return `\u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0CA6\u0CCA\u0CA1\u0CCD\u0CA1\u0CA6\u0CC1: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${issue.origin ?? "value"} \u0C8E\u0C82\u0CA6\u0CC1 ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0C9A\u0CBF\u0C95\u0CCD\u0C95\u0CA6\u0CC1: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${issue.origin} \u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1 ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `\u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0C9A\u0CBF\u0C95\u0CCD\u0C95\u0CA6\u0CC1: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${issue.origin} \u0C8E\u0C82\u0CA6\u0CC1 ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6 \u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD: \u0C87\u0CA6\u0CB0\u0CCA\u0C82\u0CA6\u0CBF\u0C97\u0CC6 \u0CAA\u0CCD\u0CB0\u0CBE\u0CB0\u0C82\u0CAD\u0CBF\u0CB8\u0CAC\u0CC7\u0C95\u0CC1 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6 \u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD: \u0C87\u0CA6\u0CB0\u0CCA\u0C82\u0CA6\u0CBF\u0C97\u0CC6 \u0C95\u0CCA\u0CA8\u0CC6\u0C97\u0CCA\u0CB3\u0CCD\u0CB3\u0CAC\u0CC7\u0C95\u0CC1 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD: \u0C92\u0CB3\u0C97\u0CCA\u0C82\u0CA1\u0CBF\u0CB0\u0CAC\u0CC7\u0C95\u0CC1 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6 \u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD: \u0CAE\u0CBE\u0CA6\u0CB0\u0CBF\u0C97\u0CC6 \u0CB9\u0CCA\u0C82\u0CA6\u0CBF\u0C95\u0CC6\u0CAF\u0CBE\u0C97\u0CAC\u0CC7\u0C95\u0CC1 ${_issue.pattern}`;
          return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6: \u0CAC\u0CB9\u0CC1\u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6\u0CAF\u0CBE\u0C97\u0CBF\u0CB0\u0CAC\u0CC7\u0C95\u0CC1 ${issue.divisor}`;
        case "unrecognized_keys":
          return `\u0C97\u0CC1\u0CB0\u0CC1\u0CA4\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CA6 \u0C95\u0CC0 ${issue.keys.length > 1 ? "s" : ""}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6 \u0C95\u0CC0 \u0C87\u0CA8\u0CCD ${issue.origin}`;
        case "invalid_union":
          if (issue.options && Array.isArray(issue.options) && issue.options.length > 0)
            return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0CA4\u0CBE\u0CB0\u0CA4\u0CAE\u0CCD\u0CAF \u0CAE\u0CCC\u0CB2\u0CCD\u0CAF. \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
          return "\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C87\u0CA8\u0CCD\u200C\u0CAA\u0CC1\u0C9F\u0CCD";
        case "invalid_element":
          return `\u0CB0\u0CB2\u0CCD\u0CB2\u0CBF \u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0CAE\u0CCC\u0CB2\u0CCD\u0CAF ${issue.origin}`;
        default:
          return "\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C87\u0CA8\u0CCD\u200C\u0CAA\u0CC1\u0C9F\u0CCD";
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
export { require_kn };
