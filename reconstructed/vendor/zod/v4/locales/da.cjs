/**
 * zod/v4/locales/da.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:232553-236116 cjs-fingerprint
var gA = x(function (eo, mA) {
  var qV =
      (eo && eo.__createBinding) ||
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
    GV =
      (eo && eo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    WV =
      (eo && eo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) qV(t, e, key);
        }
        return (GV(t, e), t);
      };
  Object.defineProperty(eo, "__esModule", { value: !0 });
  eo.default = JV;
  var bp = WV(Ee()),
    YV = () => {
      let e = {
        string: { unit: "tegn", verb: "havde" },
        file: { unit: "bytes", verb: "havde" },
        array: { unit: "elementer", verb: "indeholdt" },
        set: { unit: "elementer", verb: "indeholdt" },
        map: { unit: "elementer", verb: "indeholdt" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
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
        },
        o = {
          nan: "NaN",
          string: "streng",
          number: "tal",
          boolean: "boolean",
          array: "liste",
          object: "objekt",
          set: "s\xE6t",
          file: "fil",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = bp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Ugyldigt input: forventede instanceof ${r.expected}, fik ${l}`;
            return `Ugyldigt input: forventede ${s}, fik ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Ugyldig v\xE6rdi: forventede ${bp.stringifyPrimitive(r.values[0])}`;
            return `Ugyldigt valg: forventede en af f\xF8lgende ${bp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin),
              l = o[r.origin] ?? r.origin;
            if (a)
              return `For stor: forventede ${l ?? "value"} ${a.verb} ${s} ${r.maximum.toString()} ${a.unit ?? "elementer"}`;
            return `For stor: forventede ${l ?? "value"} havde ${s} ${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin),
              l = o[r.origin] ?? r.origin;
            if (a) return `For lille: forventede ${l} ${a.verb} ${s} ${r.minimum.toString()} ${a.unit}`;
            return `For lille: forventede ${l} havde ${s} ${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Ugyldig streng: skal starte med "${s.prefix}"`;
            if (s.format === "ends_with") return `Ugyldig streng: skal ende med "${s.suffix}"`;
            if (s.format === "includes") return `Ugyldig streng: skal indeholde "${s.includes}"`;
            if (s.format === "regex") return `Ugyldig streng: skal matche m\xF8nsteret ${s.pattern}`;
            return `Ugyldig ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `Ugyldigt tal: skal v\xE6re deleligt med ${r.divisor}`;
          case "unrecognized_keys":
            return `${r.keys.length > 1 ? "Ukendte n\xF8gler" : "Ukendt n\xF8gle"}: ${bp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Ugyldig n\xF8gle i ${r.origin}`;
          case "invalid_union":
            return "Ugyldigt input: matcher ingen af de tilladte typer";
          case "invalid_element":
            return `Ugyldig v\xE6rdi i ${r.origin}`;
          default:
            return "Ugyldigt input";
        }
      };
    };
  function JV() {
    return { localeError: YV() };
  }
  mA.exports = eo.default;
});

export { gA };
