/**
 * zod/v4/locales/pt-BR.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:408011-412923 cjs-fingerprint
var require_pt_BR = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "caracteres",
      },
      file: {
        unit: "bytes",
      },
      array: {
        unit: "elementos",
      },
      set: {
        unit: "elementos",
      },
      map: {
        unit: "entradas",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "a entrada",
      email: "o endere\xE7o de e-mail",
      url: "o URL",
      emoji: "o emoji",
      uuid: "o UUID",
      uuidv4: "o UUIDv4",
      uuidv6: "o UUIDv6",
      nanoid: "o nanoid",
      guid: "o GUID",
      cuid: "o cuid",
      cuid2: "o cuid2",
      ulid: "o ULID",
      xid: "o XID",
      ksuid: "o KSUID",
      datetime: "a data e hora ISO",
      date: "a data ISO",
      time: "a hora ISO",
      duration: "a dura\xE7\xE3o ISO",
      ipv4: "o endere\xE7o IPv4",
      ipv6: "o endere\xE7o IPv6",
      mac: "o endere\xE7o MAC",
      cidrv4: "a faixa de endere\xE7os IPv4",
      cidrv6: "a faixa de endere\xE7os IPv6",
      base64: "o texto codificado em base64",
      base64url: "o texto codificado em base64url",
      json_string: "o texto JSON",
      e164: "o n\xFAmero E.164",
      credit_card: "o n\xFAmero de cart\xE3o de cr\xE9dito",
      iban: "o IBAN",
      jwt: "o JWT",
      template_literal: "a entrada",
    };
    let Gender = {
      masculine: {
        definite: "o",
        indefinite: "um",
      },
      feminine: {
        definite: "a",
        indefinite: "uma",
      },
    };
    let TypeDictionary = {
      string: {
        name: "texto",
        articles: Gender.masculine,
      },
      number: {
        name: "n\xFAmero",
        articles: Gender.masculine,
      },
      int: {
        name: "n\xFAmero inteiro",
        articles: Gender.masculine,
      },
      boolean: {
        name: "valor booleano",
        articles: Gender.masculine,
      },
      bigint: {
        name: "n\xFAmero bigint",
        articles: Gender.masculine,
      },
      symbol: {
        name: "s\xEDmbolo",
        articles: Gender.masculine,
      },
      undefined: {
        name: 'valor "undefined"',
        articles: Gender.masculine,
      },
      null: {
        name: 'valor "nulo"',
        articles: Gender.masculine,
      },
      never: {
        name: 'valor "never"',
        articles: Gender.masculine,
      },
      void: {
        name: 'valor "void"',
        articles: Gender.masculine,
      },
      date: {
        name: "data",
        articles: Gender.feminine,
      },
      array: {
        name: "vetor",
        articles: Gender.masculine,
      },
      object: {
        name: "objeto",
        articles: Gender.masculine,
      },
      tuple: {
        name: "tupla",
        articles: Gender.feminine,
      },
      record: {
        name: "registro",
        articles: Gender.masculine,
      },
      map: {
        name: "mapa",
        articles: Gender.masculine,
      },
      set: {
        name: "conjunto",
        articles: Gender.masculine,
      },
      file: {
        name: "arquivo",
        articles: Gender.masculine,
      },
      nonoptional: {
        name: "valor n\xE3o opcional",
        articles: Gender.masculine,
      },
      nan: {
        name: 'valor "NaN"',
        articles: Gender.masculine,
      },
      function: {
        name: "fun\xE7\xE3o",
        articles: Gender.feminine,
      },
    };
    function translateOriginWithArticle(type, articleType) {
      let translatedValue = TypeDictionary[type] ?? {
        name: `valor "${type}"`,
        articles: Gender.masculine,
      };
      return `${translatedValue.articles[articleType]} ${translatedValue.name}`;
    }
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expected = translateOriginWithArticle(issue.expected, "indefinite");
          let receivedType = util.parsedType(issue.input);
          let received = translateOriginWithArticle(receivedType, "indefinite");
          return `Entrada inv\xE1lida: esperava ${expected}, recebeu ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Entrada inv\xE1lida: esperava ${util.stringifyPrimitive(issue.values[0])}`;
          return `Op\xE7\xE3o inv\xE1lida: esperava uma das seguintes op\xE7\xF5es: ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Grande demais: esperava que ${translateOriginWithArticle(issue.origin, "definite")} tivesse ${adj} ${issue.maximum.toString()} ${sizing.unit ?? "elementos"}`;
          return `Grande demais: esperava que ${translateOriginWithArticle(issue.origin, "definite")} fosse ${adj} ${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Pequeno demais: esperava que ${translateOriginWithArticle(issue.origin, "definite")} tivesse ${adj} ${issue.minimum.toString()} ${sizing.unit ?? "elementos"}`;
          return `Pequeno demais: esperava que ${translateOriginWithArticle(issue.origin, "definite")} fosse ${adj} ${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `Texto inv\xE1lido: deve come\xE7ar com "${_issue.prefix}"`;
          if (_issue.format === "ends_with") return `Texto inv\xE1lido: deve terminar com "${_issue.suffix}"`;
          if (_issue.format === "includes") return `Texto inv\xE1lido: deve incluir "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${_issue.pattern}`;
          return `Formato d${FormatDictionary[_issue.format] ?? issue.format} inv\xE1lido`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${issue.divisor}`;
        case "unrecognized_keys": {
          let plural = issue.keys.length > 1 ? "s" : "";
          return `Chave${plural} inv\xE1lida${plural}: ${util.joinValues(issue.keys, ", ")}`;
        }
        case "invalid_key":
          return `Entrada inv\xE1lida n${translateOriginWithArticle(issue.origin, "definite")}`;
        case "invalid_union":
          if (issue.options && Array.isArray(issue.options) && issue.options.length > 0)
            return `Valor de discrimina\xE7\xE3o inv\xE1lido. Esperava ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
          return "Entrada inv\xE1lida";
        case "invalid_element":
          return `Entrada inv\xE1lida n${translateOriginWithArticle(issue.origin, "definite")}`;
        default:
          return "Entrada inv\xE1lida";
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
export { require_pt_BR };
