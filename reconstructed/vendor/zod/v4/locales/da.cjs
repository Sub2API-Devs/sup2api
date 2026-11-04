/**
 * zod/v4/locales/da.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:232553-236116 cjs-fingerprint
var require_da = __commonJS(function (cjsExports, cjsModule) {
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
        verb: "havde",
      },
      file: {
        unit: "bytes",
        verb: "havde",
      },
      array: {
        unit: "elementer",
        verb: "indeholdt",
      },
      set: {
        unit: "elementer",
        verb: "indeholdt",
      },
      map: {
        unit: "elementer",
        verb: "indeholdt",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "input",
      email: "e-mailadresse",
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
      datetime: "ISO dato- og klokkesl\xE6t",
      date: "ISO-dato",
      time: "ISO-klokkesl\xE6t",
      duration: "ISO-varighed",
      ipv4: "IPv4-adresse",
      ipv6: "IPv6-adresse",
      mac: "MAC-adresse",
      cidrv4: "IPv4-spektrum",
      cidrv6: "IPv6-spektrum",
      base64: "base64-kodet streng",
      base64url: "base64url-kodet streng",
      json_string: "JSON-streng",
      e164: "E.164-nummer",
      credit_card: "kreditkortnummer",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "input",
    };
    let TypeDictionary = {
      nan: "NaN",
      string: "streng",
      number: "tal",
      boolean: "boolean",
      array: "liste",
      object: "objekt",
      set: "s\xE6t",
      file: "fil",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `Ugyldigt input: forventede instanceof ${issue.expected}, fik ${received}`;
          return `Ugyldigt input: forventede ${expected}, fik ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Ugyldig v\xE6rdi: forventede ${util.stringifyPrimitive(issue.values[0])}`;
          return `Ugyldigt valg: forventede en af f\xF8lgende ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          let origin = TypeDictionary[issue.origin] ?? issue.origin;
          if (sizing)
            return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue.maximum.toString()} ${sizing.unit ?? "elementer"}`;
          return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          let origin = TypeDictionary[issue.origin] ?? issue.origin;
          if (sizing)
            return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue.minimum.toString()} ${sizing.unit}`;
          return `For lille: forventede ${origin} havde ${adj} ${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with") return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
          if (_issue.format === "ends_with") return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
          if (_issue.format === "includes") return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
          if (_issue.format === "regex") return `Ugyldig streng: skal matche m\xF8nsteret ${_issue.pattern}`;
          return `Ugyldig ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `Ugyldigt tal: skal v\xE6re deleligt med ${issue.divisor}`;
        case "unrecognized_keys":
          return `${issue.keys.length > 1 ? "Ukendte n\xF8gler" : "Ukendt n\xF8gle"}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8gle i ${issue.origin}`;
        case "invalid_union":
          return "Ugyldigt input: matcher ingen af de tilladte typer";
        case "invalid_element":
          return `Ugyldig v\xE6rdi i ${issue.origin}`;
        default:
          return "Ugyldigt input";
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
export { require_da };
