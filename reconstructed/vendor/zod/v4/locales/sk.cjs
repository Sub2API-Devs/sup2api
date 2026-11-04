/**
 * zod/v4/locales/sk.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:424915-428867 cjs-fingerprint
var require_sk = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "znakov",
        verb: "ma\u0165",
      },
      file: {
        unit: "bajtov",
        verb: "ma\u0165",
      },
      array: {
        unit: "prvkov",
        verb: "ma\u0165",
      },
      set: {
        unit: "prvkov",
        verb: "ma\u0165",
      },
      map: {
        unit: "polo\u017Eiek",
        verb: "ma\u0165",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "regul\xE1rny v\xFDraz",
      email: "e-mailov\xE1 adresa",
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
      datetime: "d\xE1tum a \u010Das vo form\xE1te ISO",
      date: "d\xE1tum vo form\xE1te ISO",
      time: "\u010Das vo form\xE1te ISO",
      duration: "doba trvania ISO",
      ipv4: "IPv4 adresa",
      ipv6: "IPv6 adresa",
      mac: "MAC adresa",
      cidrv4: "rozsah IPv4",
      cidrv6: "rozsah IPv6",
      base64: "re\u0165azec zak\xF3dovan\xFD vo form\xE1te base64",
      base64url: "re\u0165azec zak\xF3dovan\xFD vo form\xE1te base64url",
      json_string: "re\u0165azec vo form\xE1te JSON",
      e164: "\u010D\xEDslo E.164",
      credit_card: "\u010D\xEDslo kreditnej karty",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "vstup",
    };
    let TypeDictionary = {
      nan: "NaN",
      number: "\u010D\xEDslo",
      string: "re\u0165azec",
      function: "funkcia",
      array: "pole",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 instanceof ${issue.expected}, obdr\u017Ean\xE9 ${received}`;
          return `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 ${expected}, obdr\u017Ean\xE9 ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 ${util.stringifyPrimitive(issue.values[0])}`;
          return `Neplatn\xFD vstup: o\u010Dak\xE1van\xE1 jedna z hodn\xF4t ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Hodnota je pr\xEDli\u0161 ve\u013Ek\xE1: ${issue.origin ?? "hodnota"} mus\xED ma\u0165 ${adj}${issue.maximum.toString()} ${sizing.unit ?? "prvkov"}`;
          return `Hodnota je pr\xEDli\u0161 ve\u013Ek\xE1: ${issue.origin ?? "hodnota"} mus\xED by\u0165 ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Hodnota je pr\xEDli\u0161 mal\xE1: ${issue.origin ?? "hodnota"} mus\xED ma\u0165 ${adj}${issue.minimum.toString()} ${sizing.unit ?? "prvkov"}`;
          return `Hodnota je pr\xEDli\u0161 mal\xE1: ${issue.origin ?? "hodnota"} mus\xED by\u0165 ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `Neplatn\xFD re\u0165azec: mus\xED za\u010D\xEDna\u0165 na "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Neplatn\xFD re\u0165azec: mus\xED kon\u010Di\u0165 na "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Neplatn\xFD re\u0165azec: mus\xED obsahova\u0165 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Neplatn\xFD re\u0165azec: mus\xED zodpoveda\u0165 vzoru ${_issue.pattern}`;
          return `Neplatn\xFD form\xE1t ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `Neplatn\xE9 \u010D\xEDslo: mus\xED by\u0165 n\xE1sobkom ${issue.divisor}`;
        case "unrecognized_keys":
          return `Nezn\xE1me kl\xFA\u010De: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `Neplatn\xFD kl\xFA\u010D v ${issue.origin}`;
        case "invalid_union":
          return "Neplatn\xFD vstup";
        case "invalid_element":
          return `Neplatn\xE1 hodnota v ${issue.origin}`;
        default:
          return "Neplatn\xFD vstup";
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
export { require_sk };
