/**
 * zod/v4/locales/hi.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:293465-300019 cjs-fingerprint
var require_hi = __commonJS(function (cjsExports, cjsModule) {
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
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
      file: {
        unit: "\u092C\u093E\u0907\u091F\u094D\u0938",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
      array: {
        unit: "\u0924\u0924\u094D\u0935",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
      set: {
        unit: "\u0924\u0924\u094D\u0935",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
      map: {
        unit: "\u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F\u093F\u092F\u093E\u0901",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "\u0907\u0928\u092A\u0941\u091F",
      email: "\u0908\u092E\u0947\u0932 \u092A\u0924\u093E",
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
      datetime: "ISO \u0924\u093F\u0925\u093F \u0914\u0930 \u0938\u092E\u092F",
      date: "ISO \u0924\u093F\u0925\u093F",
      time: "ISO \u0938\u092E\u092F",
      duration: "ISO \u0905\u0935\u0927\u093F",
      ipv4: "IPv4 \u092A\u0924\u093E",
      ipv6: "IPv6 \u092A\u0924\u093E",
      mac: "MAC \u092A\u0924\u093E",
      cidrv4: "IPv4 \u0936\u094D\u0930\u0947\u0923\u0940",
      cidrv6: "IPv6 \u0936\u094D\u0930\u0947\u0923\u0940",
      base64:
        "Base64-\u090F\u0928\u094D\u0915\u094B\u0921\u0947\u0921 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
      base64url:
        "Base64URL-\u090F\u0928\u094D\u0915\u094B\u0921\u0947\u0921 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
      json_string: "JSON \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
      e164: "E.164 \u0938\u0902\u0916\u094D\u092F\u093E",
      credit_card:
        "\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u093E\u0930\u094D\u0921 \u0938\u0902\u0916\u094D\u092F\u093E",
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
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0935\u093F\u0915\u0932\u094D\u092A: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u092E\u093E\u0928\u094B\u0902 \u092E\u0947\u0902 \u0938\u0947 \u090F\u0915 ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u092C\u0939\u0941\u0924 \u092C\u0921\u093C\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${issue.origin ?? "\u092E\u093E\u0928"} \u092E\u0947\u0902 ${adj}${issue.maximum} ${sizing.unit} \u0939\u094B\u0902`;
          return `\u092C\u0939\u0941\u0924 \u092C\u0921\u093C\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${issue.origin ?? "\u092E\u093E\u0928"} ${adj}${issue.maximum} \u0939\u094B`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u092C\u0939\u0941\u0924 \u091B\u094B\u091F\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${issue.origin} \u092E\u0947\u0902 ${adj}${issue.minimum} ${sizing.unit} \u0939\u094B\u0902`;
          return `\u092C\u0939\u0941\u0924 \u091B\u094B\u091F\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${issue.origin} ${adj}${issue.minimum} \u0939\u094B`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: "${_issue.prefix}" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
          if (_issue.format === "ends_with")
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: "${_issue.suffix}" \u092A\u0930 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
          if (_issue.format === "includes")
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: \u0907\u0938\u092E\u0947\u0902 "${_issue.includes}" \u0936\u093E\u092E\u093F\u0932 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
          if (_issue.format === "regex")
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: \u092A\u0948\u091F\u0930\u094D\u0928 ${_issue.pattern} \u0938\u0947 \u092E\u0947\u0932 \u0916\u093E\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
          return `\u0905\u092E\u093E\u0928\u094D\u092F ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u0902\u0916\u094D\u092F\u093E: \u092F\u0939 ${issue.divisor} \u0915\u093E \u0917\u0941\u0923\u091C \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
        case "unrecognized_keys":
          return `\u0905\u092A\u0930\u093F\u091A\u093F\u0924 \u0915\u0941\u0902\u091C\u0940${issue.keys.length > 1 ? "\u092F\u093E\u0901" : ""}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0915\u0941\u0902\u091C\u0940: ${issue.origin} \u092E\u0947\u0902`;
        case "invalid_union":
          if (issue.options && Array.isArray(issue.options) && issue.options.length > 0)
            return `\u0905\u092E\u093E\u0928\u094D\u092F \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092E\u093F\u0928\u0947\u091F\u0930 \u092E\u093E\u0928: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
          return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
        case "invalid_element":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u092E\u093E\u0928: ${issue.origin} \u092E\u0947\u0902`;
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
export { require_hi };
