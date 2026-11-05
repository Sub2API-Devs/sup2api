/**
 * zod/v4/locales/zh-CN.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:489077-493123 cjs-fingerprint
var require_zh_CN = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "\u5B57\u7B26",
        verb: "\u5305\u542B",
      },
      file: {
        unit: "\u5B57\u8282",
        verb: "\u5305\u542B",
      },
      array: {
        unit: "\u9879",
        verb: "\u5305\u542B",
      },
      set: {
        unit: "\u9879",
        verb: "\u5305\u542B",
      },
      map: {
        unit: "\u9879",
        verb: "\u5305\u542B",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "\u8F93\u5165",
      email: "\u7535\u5B50\u90AE\u4EF6",
      url: "URL",
      emoji: "\u8868\u60C5\u7B26\u53F7",
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
      datetime: "ISO\u65E5\u671F\u65F6\u95F4",
      date: "ISO\u65E5\u671F",
      time: "ISO\u65F6\u95F4",
      duration: "ISO\u65F6\u957F",
      ipv4: "IPv4\u5730\u5740",
      ipv6: "IPv6\u5730\u5740",
      mac: "MAC\u5730\u5740",
      cidrv4: "IPv4\u7F51\u6BB5",
      cidrv6: "IPv6\u7F51\u6BB5",
      base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32",
      base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32",
      json_string: "JSON\u5B57\u7B26\u4E32",
      e164: "E.164\u53F7\u7801",
      credit_card: "\u4FE1\u7528\u5361\u53F7",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "\u8F93\u5165",
    };
    let TypeDictionary = {
      nan: "NaN",
      number: "\u6570\u5B57",
      array: "\u6570\u7EC4",
      null: "\u7A7A\u503C(null)",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B instanceof ${issue.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${received}`;
          return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${util.stringifyPrimitive(issue.values[0])}`;
          return `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${issue.origin ?? "\u503C"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "\u4E2A\u5143\u7D20"}`;
          return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${issue.origin ?? "\u503C"} ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue.origin} ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.prefix}" \u5F00\u5934`;
          if (_issue.format === "ends_with")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.suffix}" \u7ED3\u5C3E`;
          if (_issue.format === "includes")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${_issue.pattern}`;
          return `\u65E0\u6548${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${issue.divisor} \u7684\u500D\u6570`;
        case "unrecognized_keys":
          return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `${issue.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
        case "invalid_union":
          return "\u65E0\u6548\u8F93\u5165";
        case "invalid_element":
          return `${issue.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
        default:
          return "\u65E0\u6548\u8F93\u5165";
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
export { require_zh_CN };
