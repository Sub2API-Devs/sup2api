/**
 * zod/v4/locales/hr.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:300019-303734 cjs-fingerprint
var require_hr = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "znakova",
        verb: "imati",
      },
      file: {
        unit: "bajtova",
        verb: "imati",
      },
      array: {
        unit: "stavki",
        verb: "imati",
      },
      set: {
        unit: "stavki",
        verb: "imati",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "unos",
      email: "email adresa",
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
      datetime: "ISO datum i vrijeme",
      date: "ISO datum",
      time: "ISO vrijeme",
      duration: "ISO trajanje",
      ipv4: "IPv4 adresa",
      ipv6: "IPv6 adresa",
      mac: "MAC adresa",
      cidrv4: "IPv4 raspon",
      cidrv6: "IPv6 raspon",
      base64: "base64 kodirani tekst",
      base64url: "base64url kodirani tekst",
      json_string: "JSON tekst",
      e164: "E.164 broj",
      credit_card: "broj kreditne kartice",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "unos",
    };
    let TypeDictionary = {
      nan: "NaN",
      string: "tekst",
      number: "broj",
      boolean: "boolean",
      array: "niz",
      object: "objekt",
      set: "skup",
      file: "datoteka",
      date: "datum",
      bigint: "bigint",
      symbol: "simbol",
      undefined: "undefined",
      null: "null",
      function: "funkcija",
      map: "mapa",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `Neispravan unos: o\u010Dekuje se instanceof ${issue.expected}, a primljeno je ${received}`;
          return `Neispravan unos: o\u010Dekuje se ${expected}, a primljeno je ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Neispravna vrijednost: o\u010Dekivano ${util.stringifyPrimitive(issue.values[0])}`;
          return `Neispravna opcija: o\u010Dekivano jedno od ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          let origin = TypeDictionary[issue.origin] ?? issue.origin;
          if (sizing)
            return `Preveliko: o\u010Dekivano da ${origin ?? "vrijednost"} ima ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elemenata"}`;
          return `Preveliko: o\u010Dekivano da ${origin ?? "vrijednost"} bude ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          let origin = TypeDictionary[issue.origin] ?? issue.origin;
          if (sizing)
            return `Premalo: o\u010Dekivano da ${origin} ima ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `Premalo: o\u010Dekivano da ${origin} bude ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `Neispravan tekst: mora zapo\u010Dinjati s "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Neispravan tekst: mora zavr\u0161avati s "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Neispravan tekst: mora sadr\u017Eavati "${_issue.includes}"`;
          if (_issue.format === "regex") return `Neispravan tekst: mora odgovarati uzorku ${_issue.pattern}`;
          return `Neispravna ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `Neispravan broj: mora biti vi\u0161ekratnik od ${issue.divisor}`;
        case "unrecognized_keys":
          return `Neprepoznat${issue.keys.length > 1 ? "i klju\u010Devi" : " klju\u010D"}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `Neispravan klju\u010D u ${TypeDictionary[issue.origin] ?? issue.origin}`;
        case "invalid_union":
          return "Neispravan unos";
        case "invalid_element":
          return `Neispravna vrijednost u ${TypeDictionary[issue.origin] ?? issue.origin}`;
        default:
          return "Neispravan unos";
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
export { require_hr };
