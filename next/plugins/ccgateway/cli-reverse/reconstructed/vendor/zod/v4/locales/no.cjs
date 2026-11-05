/**
 * zod/v4/locales/no.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:386457-389912 cjs-fingerprint
var require_no = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "tegn",
        verb: "\xE5 ha",
      },
      file: {
        unit: "bytes",
        verb: "\xE5 ha",
      },
      array: {
        unit: "elementer",
        verb: "\xE5 inneholde",
      },
      set: {
        unit: "elementer",
        verb: "\xE5 inneholde",
      },
      map: {
        unit: "elementer",
        verb: "\xE5 inneholde",
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
      duration: "ISO-varighet",
      ipv4: "IPv4-adresse",
      ipv6: "IPv6-adresse",
      mac: "MAC-adresse",
      cidrv4: "IPv4-spekter",
      cidrv6: "IPv6-spekter",
      base64: "base64-enkodet streng",
      base64url: "base64url-enkodet streng",
      json_string: "JSON-streng",
      e164: "E.164-nummer",
      credit_card: "kredittkortnummer",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "input",
    };
    let TypeDictionary = {
      nan: "NaN",
      number: "tall",
      array: "liste",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `Ugyldig input: forventet instanceof ${issue.expected}, fikk ${received}`;
          return `Ugyldig input: forventet ${expected}, fikk ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Ugyldig verdi: forventet ${util.stringifyPrimitive(issue.values[0])}`;
          return `Ugyldig valg: forventet en av ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `For stor(t): forventet ${issue.origin ?? "value"} til \xE5 ha ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elementer"}`;
          return `For stor(t): forventet ${issue.origin ?? "value"} til \xE5 ha ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `For lite(n): forventet ${issue.origin} til \xE5 ha ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `For lite(n): forventet ${issue.origin} til \xE5 ha ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with") return `Ugyldig streng: m\xE5 starte med "${_issue.prefix}"`;
          if (_issue.format === "ends_with") return `Ugyldig streng: m\xE5 ende med "${_issue.suffix}"`;
          if (_issue.format === "includes") return `Ugyldig streng: m\xE5 inneholde "${_issue.includes}"`;
          if (_issue.format === "regex") return `Ugyldig streng: m\xE5 matche m\xF8nsteret ${_issue.pattern}`;
          return `Ugyldig ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${issue.divisor}`;
        case "unrecognized_keys":
          return `${issue.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${util.joinValues(issue.keys, ", ")}`;
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
export { require_no };
