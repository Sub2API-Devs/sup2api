/**
 * zod/v4/locales/tk.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:458835-462239 cjs-fingerprint
var QI = x(function (qo, XI) {
  var e3 =
      (qo && qo.__createBinding) ||
      (Object.create
        ? function (e, t, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, t, n, o) {
            if (o === void 0) o = n;
            e[o] = t[n];
          }),
    t3 =
      (qo && qo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    n3 =
      (qo && qo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) e3(t, e, key);
        }
        return (t3(t, e), t);
      };
  Object.defineProperty(qo, "__esModule", { value: !0 });
  qo.default = i3;
  var uh = n3(Ee()),
    r3 = () => {
      let e = {
        string: { unit: "simwol", verb: "bolmaly" },
        file: { unit: "ba\xFDt", verb: "bolmaly" },
        array: { unit: "elementler", verb: "bolmaly" },
        set: { unit: "elementler", verb: "bolmaly" },
        map: { unit: "elementler", verb: "bolmaly" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
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
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = uh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            return `N\xE4dogry baha: gara\u015Fylan ${s} \xFDerine ${l} alyndy`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `N\xE4dogry baha: ${uh.stringifyPrimitive(r.values[0])} bolmaly`;
            return `N\xE4dogry sa\xFDlaw: a\u015Fakdakylardan biri bolmaly: ${uh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Has uly: gara\u015Fyl\xFDan ${r.origin ?? "baha"} ${s} ${r.maximum.toString()} ${a.unit ?? "element"}`;
            return `Has uly: gara\u015Fyl\xFDan ${r.origin ?? "baha"} ${s} ${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Has ki\xE7i: gara\u015Fyl\xFDan ${r.origin} ${s} ${r.minimum.toString()} ${a.unit}`;
            return `Has ki\xE7i: gara\u015Fyl\xFDan ${r.origin} ${s} ${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `N\xE4dogry setir: "${s.prefix}" bilen ba\u015Flamaly`;
            if (s.format === "ends_with") return `N\xE4dogry setir: "${s.suffix}" bilen gutarmaly`;
            if (s.format === "includes") return `N\xE4dogry setir: "${s.includes}" saklamaly`;
            if (s.format === "regex") return `N\xE4dogry setir: ${s.pattern} nusga la\xFDyk bolmaly`;
            return `N\xE4dogry ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `N\xE4dogry san: ${r.divisor} bilen galyndysyz b\xF6l\xFCnmeli`;
          case "unrecognized_keys":
            return `Tanalma\xFDan a\xE7ar${r.keys.length > 1 ? "lar" : ""}: ${uh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `${r.origin} i\xE7inde n\xE4dogry a\xE7ar`;
          case "invalid_union":
            return "N\xE4dogry baha";
          case "invalid_element":
            return `${r.origin} i\xE7inde n\xE4dogry baha`;
          default:
            return "N\xE4dogry baha";
        }
      };
    };
  function i3() {
    return { localeError: r3() };
  }
  XI.exports = qo.default;
});

export { QI };
