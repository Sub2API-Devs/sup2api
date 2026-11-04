/**
 * zod/v4/locales/fr.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:268418-272423 cjs-fingerprint
var require_fr = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "caract\xE8res",
        verb: "avoir",
      },
      file: {
        unit: "octets",
        verb: "avoir",
      },
      array: {
        unit: "\xE9l\xE9ments",
        verb: "avoir",
      },
      set: {
        unit: "\xE9l\xE9ments",
        verb: "avoir",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "expression r\xE9guli\xE8re",
      email: "adresse e-mail",
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
      datetime: "date et heure ISO",
      date: "date ISO",
      time: "heure ISO",
      duration: "dur\xE9e ISO",
      ipv4: "adresse IPv4",
      ipv6: "adresse IPv6",
      mac: "adresse MAC",
      cidrv4: "plage IPv4",
      cidrv6: "plage IPv6",
      base64: "cha\xEEne de caract\xE8res encod\xE9e en base64",
      base64url: "cha\xEEne de caract\xE8res encod\xE9e en base64url",
      json_string: "cha\xEEne de caract\xE8res JSON",
      e164: "num\xE9ro au format E.164",
      credit_card: "num\xE9ro de carte de cr\xE9dit",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "entr\xE9e",
    };
    let TypeDictionary = {
      string: "cha\xEEne de caract\xE8res",
      number: "nombre",
      int: "entier",
      boolean: "bool\xE9en",
      bigint: "grand entier",
      symbol: "symbole",
      undefined: "ind\xE9fini",
      null: "null",
      never: "jamais",
      void: "vide",
      date: "date",
      array: "tableau",
      object: "objet",
      tuple: "tuple",
      record: "record",
      map: "map",
      set: "ensemble",
      file: "fichier",
      nonoptional: "non optionnel",
      nan: "NaN",
      function: "fonction",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = TypeDictionary[issue.expected] ?? issue.expected;
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `Entr\xE9e invalide : instance de ${issue.expected} attendu, ${received} re\xE7u`;
          return `Entr\xE9e invalide : ${expected} attendu, ${received} re\xE7u`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Entr\xE9e invalide : ${util.stringifyPrimitive(issue.values[0])} attendu`;
          return `Option invalide : une valeur parmi ${util.joinValues(issue.values, "|")} attendue`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Trop grand : ${TypeDictionary[issue.origin] ?? "valeur"} doit ${sizing.verb} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "\xE9l\xE9ment(s)"}`;
          return `Trop grand : ${TypeDictionary[issue.origin] ?? "valeur"} doit \xEAtre ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Trop petit : ${TypeDictionary[issue.origin] ?? "valeur"} doit ${sizing.verb} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `Trop petit : ${TypeDictionary[issue.origin] ?? "valeur"} doit \xEAtre ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `Cha\xEEne de caract\xE8res invalide : doit commencer par "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Cha\xEEne de caract\xE8res invalide : doit se terminer par "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Cha\xEEne de caract\xE8res invalide : doit inclure "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Cha\xEEne de caract\xE8res invalide : doit correspondre au motif ${_issue.pattern}`;
          return `${FormatDictionary[_issue.format] ?? issue.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${issue.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${issue.keys.length > 1 ? "s" : ""} non reconnue${issue.keys.length > 1 ? "s" : ""} : ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${issue.origin}`;
        case "invalid_union":
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${issue.origin}`;
        default:
          return "Entr\xE9e invalide";
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
export { require_fr };
