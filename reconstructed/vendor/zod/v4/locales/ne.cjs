/**
 * zod/v4/locales/ne.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:372880-379138 cjs-fingerprint
var require_ne = x(function (cjsExports, cjsModule) {
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
        unit: "\u0905\u0915\u094D\u0937\u0930",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
      file: {
        unit: "\u092C\u093E\u0907\u091F",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
      array: {
        unit: "\u0924\u0924\u094D\u0935",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
      set: {
        unit: "\u0924\u0924\u094D\u0935",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
      map: {
        unit: "\u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F\u093F",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "\u0907\u0928\u092A\u0941\u091F",
      email: "\u0907\u092E\u0947\u0932 \u0920\u0947\u0917\u093E\u0928\u093E",
      url: "URL",
      emoji: "\u0907\u092E\u094B\u091C\u0940",
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
      datetime: "ISO \u092E\u093F\u0924\u093F \u0930 \u0938\u092E\u092F",
      date: "ISO \u092E\u093F\u0924\u093F",
      time: "ISO \u0938\u092E\u092F",
      duration: "ISO \u0905\u0935\u0927\u093F",
      ipv4: "IPv4 \u0920\u0947\u0917\u093E\u0928\u093E",
      ipv6: "IPv6 \u0920\u0947\u0917\u093E\u0928\u093E",
      mac: "MAC \u0920\u0947\u0917\u093E\u0928\u093E",
      cidrv4: "IPv4 \u0926\u093E\u092F\u0930\u093E",
      cidrv6: "IPv6 \u0926\u093E\u092F\u0930\u093E",
      base64:
        "base64-\u0907\u0928\u094D\u0915\u094B\u0921 \u0917\u0930\u093F\u090F\u0915\u094B \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
      base64url:
        "base64url-\u0907\u0928\u094D\u0915\u094B\u0921 \u0917\u0930\u093F\u090F\u0915\u094B \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
      json_string: "JSON \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
      e164: "E.164 \u0928\u092E\u094D\u092C\u0930",
      credit_card:
        "\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u093E\u0930\u094D\u0921 \u0928\u092E\u094D\u092C\u0930",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "\u0907\u0928\u092A\u0941\u091F",
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
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${expected}, \u092A\u094D\u0930\u093E\u092A\u094D\u0924 ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${util.stringifyPrimitive(issue.values[0])}`;
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0935\u093F\u0915\u0932\u094D\u092A: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u092E\u093E\u0928\u0939\u0930\u0942 \u092E\u0927\u094D\u092F\u0947 \u090F\u0915 ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u0927\u0947\u0930\u0948 \u0920\u0942\u0932\u094B: ${issue.origin ?? "\u092E\u093E\u0928"} \u092E\u093E ${adj}${issue.maximum.toString()} ${sizing.unit} ${sizing.verb}`;
          return `\u0927\u0947\u0930\u0948 \u0920\u0942\u0932\u094B: ${issue.origin ?? "\u092E\u093E\u0928"} ${adj}${issue.maximum.toString()} \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u0927\u0947\u0930\u0948 \u0938\u093E\u0928\u094B: ${issue.origin} \u092E\u093E ${adj}${issue.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
          return `\u0927\u0947\u0930\u0948 \u0938\u093E\u0928\u094B: ${issue.origin} ${adj}${issue.minimum.toString()} \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${_issue.prefix}" \u092C\u093E\u091F \u0938\u0941\u0930\u0941 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
          if (_issue.format === "ends_with")
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${_issue.suffix}" \u092E\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
          if (_issue.format === "includes")
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${_issue.includes}" \u0938\u092E\u093E\u0935\u0947\u0936 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
          if (_issue.format === "regex")
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: \u0922\u093E\u0901\u091A\u093E ${_issue.pattern} \u0938\u0901\u0917 \u092E\u0947\u0932 \u0916\u093E\u0928\u0941\u092A\u0930\u094D\u091B`;
          return `\u0905\u092E\u093E\u0928\u094D\u092F ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u0902\u0916\u094D\u092F\u093E: ${issue.divisor} \u0915\u094B \u0917\u0941\u0923\u091C \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
        case "unrecognized_keys":
          return `\u0905\u092A\u0930\u093F\u091A\u093F\u0924 \u0915\u0941\u091E\u094D\u091C\u0940${issue.keys.length > 1 ? "\u0939\u0930\u0942" : ""}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0915\u0941\u091E\u094D\u091C\u0940: ${issue.origin} \u092E\u093E`;
        case "invalid_union":
          if (issue.options && Array.isArray(issue.options) && issue.options.length > 0)
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092E\u093F\u0928\u0947\u091F\u0930 \u092E\u093E\u0928: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
          return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
        case "invalid_element":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u092E\u093E\u0928: ${issue.origin} \u092E\u093E`;
        default:
          return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
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
export { require_ne };
