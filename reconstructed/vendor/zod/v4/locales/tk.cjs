/**
 * zod/v4/locales/tk.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:458835-462239 cjs-fingerprint
var require_tk = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "simwol",
        verb: "bolmaly",
      },
      file: {
        unit: "ba\xFDt",
        verb: "bolmaly",
      },
      array: {
        unit: "elementler",
        verb: "bolmaly",
      },
      set: {
        unit: "elementler",
        verb: "bolmaly",
      },
      map: {
        unit: "elementler",
        verb: "bolmaly",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "giri\u015F",
      email: "e-po\xE7ta salgysy",
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
      datetime: "ISO sene we wagt",
      date: "ISO sene",
      time: "ISO wagt",
      duration: "ISO wagt aralygy",
      ipv4: "IPv4 salgysy",
      ipv6: "IPv6 salgysy",
      mac: "MAC salgysy",
      cidrv4: "IPv4 aralygy",
      cidrv6: "IPv6 aralygy",
      base64: "base64 bilen \u015Fifrlenen setir",
      base64url: "base64url bilen \u015Fifrlenen setir",
      json_string: "JSON setiri",
      e164: "E.164 nomeri",
      credit_card: "kredit kartyny\u0148 nomeri",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "\u015Fablon",
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
          return `N\xE4dogry baha: gara\u015Fylan ${expected} \xFDerine ${received} alyndy`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `N\xE4dogry baha: ${util.stringifyPrimitive(issue.values[0])} bolmaly`;
          return `N\xE4dogry sa\xFDlaw: a\u015Fakdakylardan biri bolmaly: ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Has uly: gara\u015Fyl\xFDan ${issue.origin ?? "baha"} ${adj} ${issue.maximum.toString()} ${sizing.unit ?? "element"}`;
          return `Has uly: gara\u015Fyl\xFDan ${issue.origin ?? "baha"} ${adj} ${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Has ki\xE7i: gara\u015Fyl\xFDan ${issue.origin} ${adj} ${issue.minimum.toString()} ${sizing.unit}`;
          return `Has ki\xE7i: gara\u015Fyl\xFDan ${issue.origin} ${adj} ${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `N\xE4dogry setir: "${_issue.prefix}" bilen ba\u015Flamaly`;
          if (_issue.format === "ends_with") return `N\xE4dogry setir: "${_issue.suffix}" bilen gutarmaly`;
          if (_issue.format === "includes") return `N\xE4dogry setir: "${_issue.includes}" saklamaly`;
          if (_issue.format === "regex") return `N\xE4dogry setir: ${_issue.pattern} nusga la\xFDyk bolmaly`;
          return `N\xE4dogry ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `N\xE4dogry san: ${issue.divisor} bilen galyndysyz b\xF6l\xFCnmeli`;
        case "unrecognized_keys":
          return `Tanalma\xFDan a\xE7ar${issue.keys.length > 1 ? "lar" : ""}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `${issue.origin} i\xE7inde n\xE4dogry a\xE7ar`;
        case "invalid_union":
          return "N\xE4dogry baha";
        case "invalid_element":
          return `${issue.origin} i\xE7inde n\xE4dogry baha`;
        default:
          return "N\xE4dogry baha";
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
export { require_tk };
