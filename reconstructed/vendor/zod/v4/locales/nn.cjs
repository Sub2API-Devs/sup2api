/**
 * zod/v4/locales/nn.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:382650-386088 cjs-fingerprint
var require_nn = x(function (cjsExports, cjsModule) {
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
        unit: "teikn",
        verb: "\xE5 ha",
      },
      file: {
        unit: "bytes",
        verb: "\xE5 ha",
      },
      array: {
        unit: "element",
        verb: "\xE5 innehalde",
      },
      set: {
        unit: "element",
        verb: "\xE5 innehalde",
      },
      map: {
        unit: "element",
        verb: "\xE5 innehalde",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "input",
      email: "e-postadresse",
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
      datetime: "ISO dato- og klokkeslett",
      date: "ISO-dato",
      time: "ISO-klokkeslett",
      duration: "ISO-varigheit",
      ipv4: "IPv4-adresse",
      ipv6: "IPv6-adresse",
      mac: "MAC-adresse",
      cidrv4: "IPv4-spekter",
      cidrv6: "IPv6-spekter",
      base64: "base64-enkoda streng",
      base64url: "base64url-enkoda streng",
      json_string: "JSON-streng",
      e164: "E.164-nummer",
      credit_card: "kredittkortnummer",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "input",
    };
    let TypeDictionary = {
      nan: "NaN",
      number: "tal",
      array: "liste",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `Ugyldig input: forventa instanceof ${issue.expected}, fekk ${received}`;
          return `Ugyldig input: forventa ${expected}, fekk ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Ugyldig verdi: forventa ${util.stringifyPrimitive(issue.values[0])}`;
          return `Ugyldig val: forventa eitt av ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `For stor(t): forventa ${issue.origin ?? "value"} til \xE5 ha ${adj}${issue.maximum.toString()} ${sizing.unit ?? "element"}`;
          return `For stor(t): forventa ${issue.origin ?? "value"} til \xE5 ha ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `For lite(n): forventa ${issue.origin} til \xE5 ha ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `For lite(n): forventa ${issue.origin} til \xE5 ha ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with") return `Ugyldig streng: m\xE5 starte med "${_issue.prefix}"`;
          if (_issue.format === "ends_with") return `Ugyldig streng: m\xE5 slutte med "${_issue.suffix}"`;
          if (_issue.format === "includes") return `Ugyldig streng: m\xE5 innehalde "${_issue.includes}"`;
          if (_issue.format === "regex") return `Ugyldig streng: m\xE5 matche m\xF8nsteret ${_issue.pattern}`;
          return `Ugyldig ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `Ugyldig tal: m\xE5 vere eit multiplum av ${issue.divisor}`;
        case "unrecognized_keys":
          return `${issue.keys.length > 1 ? "Ukjende n\xF8klar" : "Ukjend n\xF8kkel"}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8kkel i ${issue.origin}`;
        case "invalid_union":
          return "Ugyldig input";
        case "invalid_element":
          return `Ugyldig verdi i ${issue.origin}`;
        default:
          return "Ugyldig input";
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
export { require_nn };
