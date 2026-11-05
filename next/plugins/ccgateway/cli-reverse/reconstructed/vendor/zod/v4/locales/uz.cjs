/**
 * zod/v4/locales/uz.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:481181-484847 cjs-fingerprint
var require_uz = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "belgi",
        verb: "bo\u2018lishi kerak",
      },
      file: {
        unit: "bayt",
        verb: "bo\u2018lishi kerak",
      },
      array: {
        unit: "element",
        verb: "bo\u2018lishi kerak",
      },
      set: {
        unit: "element",
        verb: "bo\u2018lishi kerak",
      },
      map: {
        unit: "yozuv",
        verb: "bo\u2018lishi kerak",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "kirish",
      email: "elektron pochta manzili",
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
      datetime: "ISO sana va vaqti",
      date: "ISO sana",
      time: "ISO vaqt",
      duration: "ISO davomiylik",
      ipv4: "IPv4 manzil",
      ipv6: "IPv6 manzil",
      mac: "MAC manzil",
      cidrv4: "IPv4 diapazon",
      cidrv6: "IPv6 diapazon",
      base64: "base64 kodlangan satr",
      base64url: "base64url kodlangan satr",
      json_string: "JSON satr",
      e164: "E.164 raqam",
      credit_card: "kredit karta raqami",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "kirish",
    };
    let TypeDictionary = {
      nan: "NaN",
      number: "raqam",
      array: "massiv",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `Noto\u2018g\u2018ri kirish: kutilgan instanceof ${issue.expected}, qabul qilingan ${received}`;
          return `Noto\u2018g\u2018ri kirish: kutilgan ${expected}, qabul qilingan ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Noto\u2018g\u2018ri kirish: kutilgan ${util.stringifyPrimitive(issue.values[0])}`;
          return `Noto\u2018g\u2018ri variant: quyidagilardan biri kutilgan ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Juda katta: kutilgan ${issue.origin ?? "qiymat"} ${adj}${issue.maximum.toString()} ${sizing.unit} ${sizing.verb}`;
          return `Juda katta: kutilgan ${issue.origin ?? "qiymat"} ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Juda kichik: kutilgan ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
          return `Juda kichik: kutilgan ${issue.origin} ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `Noto\u2018g\u2018ri satr: "${_issue.prefix}" bilan boshlanishi kerak`;
          if (_issue.format === "ends_with")
            return `Noto\u2018g\u2018ri satr: "${_issue.suffix}" bilan tugashi kerak`;
          if (_issue.format === "includes")
            return `Noto\u2018g\u2018ri satr: "${_issue.includes}" ni o\u2018z ichiga olishi kerak`;
          if (_issue.format === "regex")
            return `Noto\u2018g\u2018ri satr: ${_issue.pattern} shabloniga mos kelishi kerak`;
          return `Noto\u2018g\u2018ri ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `Noto\u2018g\u2018ri raqam: ${issue.divisor} ning karralisi bo\u2018lishi kerak`;
        case "unrecognized_keys":
          return `Noma\u2019lum kalit${issue.keys.length > 1 ? "lar" : ""}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `${issue.origin} dagi kalit noto\u2018g\u2018ri`;
        case "invalid_union":
          return "Noto\u2018g\u2018ri kirish";
        case "invalid_element":
          return `${issue.origin} da noto\u2018g\u2018ri qiymat`;
        default:
          return "Noto\u2018g\u2018ri kirish";
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
export { require_uz };
