/**
 * zod/v4/locales/he.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_util } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:282390-293096 cjs-fingerprint
var require_he = x(function (cjsExports, cjsModule) {
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
    let TypeNames = {
      string: {
        label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA",
        gender: "f",
      },
      number: {
        label: "\u05DE\u05E1\u05E4\u05E8",
        gender: "m",
      },
      boolean: {
        label: "\u05E2\u05E8\u05DA \u05D1\u05D5\u05DC\u05D9\u05D0\u05E0\u05D9",
        gender: "m",
      },
      bigint: {
        label: "BigInt",
        gender: "m",
      },
      date: {
        label: "\u05EA\u05D0\u05E8\u05D9\u05DA",
        gender: "m",
      },
      array: {
        label: "\u05DE\u05E2\u05E8\u05DA",
        gender: "m",
      },
      object: {
        label: "\u05D0\u05D5\u05D1\u05D9\u05D9\u05E7\u05D8",
        gender: "m",
      },
      null: {
        label: "\u05E2\u05E8\u05DA \u05E8\u05D9\u05E7 (null)",
        gender: "m",
      },
      undefined: {
        label: "\u05E2\u05E8\u05DA \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8 (undefined)",
        gender: "m",
      },
      symbol: {
        label: "\u05E1\u05D9\u05DE\u05D1\u05D5\u05DC (Symbol)",
        gender: "m",
      },
      function: {
        label: "\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4",
        gender: "f",
      },
      map: {
        label: "\u05DE\u05E4\u05D4 (Map)",
        gender: "f",
      },
      set: {
        label: "\u05E7\u05D1\u05D5\u05E6\u05D4 (Set)",
        gender: "f",
      },
      file: {
        label: "\u05E7\u05D5\u05D1\u05E5",
        gender: "m",
      },
      promise: {
        label: "Promise",
        gender: "m",
      },
      NaN: {
        label: "NaN",
        gender: "m",
      },
      unknown: {
        label: "\u05E2\u05E8\u05DA \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2",
        gender: "m",
      },
      value: {
        label: "\u05E2\u05E8\u05DA",
        gender: "m",
      },
    };
    let Sizable = {
      string: {
        unit: "\u05EA\u05D5\u05D5\u05D9\u05DD",
        shortLabel: "\u05E7\u05E6\u05E8",
        longLabel: "\u05D0\u05E8\u05D5\u05DA",
      },
      file: {
        unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD",
        shortLabel: "\u05E7\u05D8\u05DF",
        longLabel: "\u05D2\u05D3\u05D5\u05DC",
      },
      array: {
        unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD",
        shortLabel: "\u05E7\u05D8\u05DF",
        longLabel: "\u05D2\u05D3\u05D5\u05DC",
      },
      set: {
        unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD",
        shortLabel: "\u05E7\u05D8\u05DF",
        longLabel: "\u05D2\u05D3\u05D5\u05DC",
      },
      number: {
        unit: "",
        shortLabel: "\u05E7\u05D8\u05DF",
        longLabel: "\u05D2\u05D3\u05D5\u05DC",
      },
    };
    let typeEntry = (t) => (t ? TypeNames[t] : undefined);
    let typeLabel = (t) => {
      let e = typeEntry(t);
      if (e) return e.label;
      return t ?? TypeNames.unknown.label;
    };
    let withDefinite = (t) => `\u05D4${typeLabel(t)}`;
    let verbFor = (u) =>
      (typeEntry(u)?.gender ?? "m") === "f"
        ? "\u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05D9\u05D5\u05EA"
        : "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA";
    let getSizing = (origin) => {
      if (!origin) return null;
      return Sizable[origin] ?? null;
    };
    let FormatDictionary = {
      regex: {
        label: "\u05E7\u05DC\u05D8",
        gender: "m",
      },
      email: {
        label: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
        gender: "f",
      },
      url: {
        label: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA",
        gender: "f",
      },
      emoji: {
        label: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9",
        gender: "m",
      },
      uuid: {
        label: "UUID",
        gender: "m",
      },
      uuidv4: {
        label: "UUIDv4",
        gender: "m",
      },
      uuidv6: {
        label: "UUIDv6",
        gender: "m",
      },
      nanoid: {
        label: "nanoid",
        gender: "m",
      },
      guid: {
        label: "GUID",
        gender: "m",
      },
      cuid: {
        label: "cuid",
        gender: "m",
      },
      cuid2: {
        label: "cuid2",
        gender: "m",
      },
      ulid: {
        label: "ULID",
        gender: "m",
      },
      xid: {
        label: "XID",
        gender: "m",
      },
      ksuid: {
        label: "KSUID",
        gender: "m",
      },
      datetime: {
        label: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO",
        gender: "m",
      },
      date: {
        label: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO",
        gender: "m",
      },
      time: {
        label: "\u05D6\u05DE\u05DF ISO",
        gender: "m",
      },
      duration: {
        label: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO",
        gender: "m",
      },
      ipv4: {
        label: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4",
        gender: "f",
      },
      ipv6: {
        label: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6",
        gender: "f",
      },
      mac: {
        label: "\u05DB\u05EA\u05D5\u05D1\u05EA MAC",
        gender: "f",
      },
      cidrv4: {
        label: "\u05D8\u05D5\u05D5\u05D7 IPv4",
        gender: "m",
      },
      cidrv6: {
        label: "\u05D8\u05D5\u05D5\u05D7 IPv6",
        gender: "m",
      },
      base64: {
        label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64",
        gender: "f",
      },
      base64url: {
        label:
          "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA",
        gender: "f",
      },
      json_string: {
        label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON",
        gender: "f",
      },
      e164: {
        label: "\u05DE\u05E1\u05E4\u05E8 E.164",
        gender: "m",
      },
      credit_card: {
        label: "\u05DE\u05E1\u05E4\u05E8 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D0\u05E9\u05E8\u05D0\u05D9",
        gender: "m",
      },
      iban: {
        label: "IBAN",
        gender: "m",
      },
      jwt: {
        label: "JWT",
        gender: "m",
      },
      template_literal: {
        label: "\u05E7\u05DC\u05D8",
        gender: "m",
      },
      ends_with: {
        label: "\u05E7\u05DC\u05D8",
        gender: "m",
      },
      includes: {
        label: "\u05E7\u05DC\u05D8",
        gender: "m",
      },
      lowercase: {
        label: "\u05E7\u05DC\u05D8",
        gender: "m",
      },
      starts_with: {
        label: "\u05E7\u05DC\u05D8",
        gender: "m",
      },
      uppercase: {
        label: "\u05E7\u05DC\u05D8",
        gender: "m",
      },
    };
    let TypeDictionary = {
      nan: "NaN",
    };
    return (issue) => {
      switch (issue.code) {
        case "invalid_type": {
          let expectedKey = issue.expected;
          let expected = TypeDictionary[expectedKey ?? ""] ?? typeLabel(expectedKey);
          let receivedType = util.parsedType(issue.input);
          let received = TypeDictionary[receivedType] ?? TypeNames[receivedType]?.label ?? receivedType;
          if (/^[A-Z]/.test(issue.expected))
            return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA instanceof ${issue.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${received}`;
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${received}`;
        }
        case "invalid_value": {
          if (issue.values.length === 1)
            return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05E2\u05E8\u05DA \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA ${util.stringifyPrimitive(issue.values[0])}`;
          let stringified = issue.values.map((v) => util.stringifyPrimitive(v));
          if (issue.values.length === 2)
            return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05DF ${stringified[0]} \u05D0\u05D5 ${stringified[1]}`;
          let lastValue = stringified[stringified.length - 1];
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05DF ${stringified.slice(0, -1).join(", ")} \u05D0\u05D5 ${lastValue}`;
        }
        case "too_big": {
          let sizing = getSizing(issue.origin);
          let subject = withDefinite(issue.origin ?? "value");
          if (issue.origin === "string")
            return `${sizing?.longLabel ?? "\u05D0\u05E8\u05D5\u05DA"} \u05DE\u05D3\u05D9: ${subject} \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05DB\u05D9\u05DC ${issue.maximum.toString()} ${sizing?.unit ?? ""} ${issue.inclusive ? "\u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA" : "\u05DC\u05DB\u05DC \u05D4\u05D9\u05D5\u05EA\u05E8"}`.trim();
          if (issue.origin === "number") {
            let comparison = issue.inclusive
              ? `\u05E7\u05D8\u05DF \u05D0\u05D5 \u05E9\u05D5\u05D5\u05D4 \u05DC-${issue.maximum}`
              : `\u05E7\u05D8\u05DF \u05DE-${issue.maximum}`;
            return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${subject} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${comparison}`;
          }
          if (issue.origin === "array" || issue.origin === "set") {
            let verb = issue.origin === "set" ? "\u05E6\u05E8\u05D9\u05DB\u05D4" : "\u05E6\u05E8\u05D9\u05DA";
            let comparison = issue.inclusive
              ? `${issue.maximum} ${sizing?.unit ?? ""} \u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA`
              : `\u05E4\u05D7\u05D5\u05EA \u05DE-${issue.maximum} ${sizing?.unit ?? ""}`;
            return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${subject} ${verb} \u05DC\u05D4\u05DB\u05D9\u05DC ${comparison}`.trim();
          }
          let adj = issue.inclusive ? "<=" : "<";
          let be = verbFor(issue.origin ?? "value");
          if (sizing?.unit)
            return `${sizing.longLabel} \u05DE\u05D3\u05D9: ${subject} ${be} ${adj}${issue.maximum.toString()} ${sizing.unit}`;
          return `${sizing?.longLabel ?? "\u05D2\u05D3\u05D5\u05DC"} \u05DE\u05D3\u05D9: ${subject} ${be} ${adj}${issue.maximum.toString()}`;
        }
        case "too_small": {
          let sizing = getSizing(issue.origin);
          let subject = withDefinite(issue.origin ?? "value");
          if (issue.origin === "string")
            return `${sizing?.shortLabel ?? "\u05E7\u05E6\u05E8"} \u05DE\u05D3\u05D9: ${subject} \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05DB\u05D9\u05DC ${issue.minimum.toString()} ${sizing?.unit ?? ""} ${issue.inclusive ? "\u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8" : "\u05DC\u05E4\u05D7\u05D5\u05EA"}`.trim();
          if (issue.origin === "number") {
            let comparison = issue.inclusive
              ? `\u05D2\u05D3\u05D5\u05DC \u05D0\u05D5 \u05E9\u05D5\u05D5\u05D4 \u05DC-${issue.minimum}`
              : `\u05D2\u05D3\u05D5\u05DC \u05DE-${issue.minimum}`;
            return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${subject} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${comparison}`;
          }
          if (issue.origin === "array" || issue.origin === "set") {
            let verb = issue.origin === "set" ? "\u05E6\u05E8\u05D9\u05DB\u05D4" : "\u05E6\u05E8\u05D9\u05DA";
            if (issue.minimum === 1 && issue.inclusive) {
              let singularPhrase =
                issue.origin === "set"
                  ? "\u05DC\u05E4\u05D7\u05D5\u05EA \u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3"
                  : "\u05DC\u05E4\u05D7\u05D5\u05EA \u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3";
              return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${subject} ${verb} \u05DC\u05D4\u05DB\u05D9\u05DC ${singularPhrase}`;
            }
            let comparison = issue.inclusive
              ? `${issue.minimum} ${sizing?.unit ?? ""} \u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8`
              : `\u05D9\u05D5\u05EA\u05E8 \u05DE-${issue.minimum} ${sizing?.unit ?? ""}`;
            return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${subject} ${verb} \u05DC\u05D4\u05DB\u05D9\u05DC ${comparison}`.trim();
          }
          let adj = issue.inclusive ? ">=" : ">";
          let be = verbFor(issue.origin ?? "value");
          if (sizing?.unit)
            return `${sizing.shortLabel} \u05DE\u05D3\u05D9: ${subject} ${be} ${adj}${issue.minimum.toString()} ${sizing.unit}`;
          return `${sizing?.shortLabel ?? "\u05E7\u05D8\u05DF"} \u05DE\u05D3\u05D9: ${subject} ${be} ${adj}${issue.minimum.toString()}`;
        }
        case "invalid_format": {
          let _issue = issue;
          if (_issue.format === "starts_with")
            return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${_issue.pattern}`;
          let nounEntry = FormatDictionary[_issue.format];
          let noun = nounEntry?.label ?? _issue.format;
          let b =
            (nounEntry?.gender ?? "m") === "f"
              ? "\u05EA\u05E7\u05D9\u05E0\u05D4"
              : "\u05EA\u05E7\u05D9\u05DF";
          return `${noun} \u05DC\u05D0 ${b}`;
        }
        case "not_multiple_of":
          return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${issue.divisor}`;
        case "unrecognized_keys":
          return `\u05DE\u05E4\u05EA\u05D7${issue.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${issue.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${util.joinValues(issue.keys, ", ")}`;
        case "invalid_key":
          return "\u05E9\u05D3\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1\u05D0\u05D5\u05D1\u05D9\u05D9\u05E7\u05D8";
        case "invalid_union":
          return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
        case "invalid_element":
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${withDefinite(issue.origin ?? "array")}`;
        default:
          return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
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
export { require_he };
