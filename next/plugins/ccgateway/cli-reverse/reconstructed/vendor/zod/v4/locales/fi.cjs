/**
 * zod/v4/locales/fi.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1hnjmk23.js:265039-268787 cjs-fingerprint
var require_fi = __commonJS(function (cjsExports, cjsModule) {
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
        unit: "merkki\xE4",
        subject: "merkkijonon",
      },
      file: {
        unit: "tavua",
        subject: "tiedoston",
      },
      array: {
        unit: "alkiota",
        subject: "listan",
      },
      set: {
        unit: "alkiota",
        subject: "joukon",
      },
      map: {
        unit: "alkiota",
        subject: "kuvauksen",
      },
      number: {
        unit: "",
        subject: "luvun",
      },
      bigint: {
        unit: "",
        subject: "suuren kokonaisluvun",
      },
      int: {
        unit: "",
        subject: "kokonaisluvun",
      },
      date: {
        unit: "",
        subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n",
      },
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    let FormatDictionary = {
      regex: "s\xE4\xE4nn\xF6llinen lauseke",
      email: "s\xE4hk\xF6postiosoite",
      url: "URL-osoite",
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
      datetime: "ISO-aikaleima",
      date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4",
      time: "ISO-aika",
      duration: "ISO-kesto",
      ipv4: "IPv4-osoite",
      ipv6: "IPv6-osoite",
      mac: "MAC-osoite",
      cidrv4: "IPv4-alue",
      cidrv6: "IPv6-alue",
      base64: "base64-koodattu merkkijono",
      base64url: "base64url-koodattu merkkijono",
      json_string: "JSON-merkkijono",
      e164: "E.164-luku",
      credit_card: "luottokortin numero",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "templaattimerkkijono",
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
          if (/^[A-Z]/.test(issue.expected))
            return `Virheellinen tyyppi: odotettiin instanceof ${issue.expected}, oli ${received}`;
          return `Virheellinen tyyppi: odotettiin ${expected}, oli ${received}`;
        }
        case "invalid_value":
          if (issue.values.length === 1)
            return `Virheellinen sy\xF6te: t\xE4ytyy olla ${util.stringifyPrimitive(issue.values[0])}`;
          return `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${util.joinValues(issue.values, "|")}`;
        case "too_big": {
          let adj = issue.inclusive ? "<=" : "<";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Liian suuri: ${sizing.subject} t\xE4ytyy olla ${adj}${issue.maximum.toString()} ${sizing.unit}`.trim();
          return `Liian suuri: arvon t\xE4ytyy olla ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let adj = issue.inclusive ? ">=" : ">";
          let sizing = getSizing(issue.origin);
          if (sizing)
            return `Liian pieni: ${sizing.subject} t\xE4ytyy olla ${adj}${issue.minimum.toString()} ${sizing.unit}`.trim();
          return `Liian pieni: arvon t\xE4ytyy olla ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Virheellinen sy\xF6te: t\xE4ytyy loppua "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${_issue.pattern}`;
          return `Virheellinen ${FormatDictionary[_issue.format] ?? issue.format}`;
        }
        case "not_multiple_of":
          return `Virheellinen luku: t\xE4ytyy olla luvun ${issue.divisor} monikerta`;
        case "unrecognized_keys":
          return `${issue.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return "Virheellinen avain tietueessa";
        case "invalid_union":
          return "Virheellinen unioni";
        case "invalid_element":
          return "Virheellinen arvo joukossa";
        default:
          return "Virheellinen sy\xF6te";
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
export { require_fi };
