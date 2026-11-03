/**
 * zod/v4/locales/es.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:254311-258328 cjs-fingerprint
var EA = x(function (oo, kA) {
  var _q =
      (oo && oo.__createBinding) ||
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
    bq =
      (oo && oo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    vq =
      (oo && oo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) _q(t, e, key);
        }
        return (bq(t, e), t);
      };
  Object.defineProperty(oo, "__esModule", { value: !0 });
  oo.default = Oq;
  var kp = vq(Ee()),
    wq = () => {
      let e = {
        string: { unit: "caracteres", verb: "tener" },
        file: { unit: "bytes", verb: "tener" },
        array: { unit: "elementos", verb: "tener" },
        set: { unit: "elementos", verb: "tener" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "entrada",
          email: "direcci\xF3n de correo electr\xF3nico",
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
          datetime: "fecha y hora ISO",
          date: "fecha ISO",
          time: "hora ISO",
          duration: "duraci\xF3n ISO",
          ipv4: "direcci\xF3n IPv4",
          ipv6: "direcci\xF3n IPv6",
          mac: "direcci\xF3n MAC",
          cidrv4: "rango IPv4",
          cidrv6: "rango IPv6",
          base64: "cadena codificada en base64",
          base64url: "URL codificada en base64",
          json_string: "cadena JSON",
          e164: "n\xFAmero E.164",
          credit_card: "n\xFAmero de tarjeta de cr\xE9dito",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "entrada",
        },
        o = {
          nan: "NaN",
          string: "texto",
          number: "n\xFAmero",
          boolean: "booleano",
          array: "arreglo",
          object: "objeto",
          set: "conjunto",
          file: "archivo",
          date: "fecha",
          bigint: "n\xFAmero grande",
          symbol: "s\xEDmbolo",
          undefined: "indefinido",
          null: "nulo",
          function: "funci\xF3n",
          map: "mapa",
          record: "registro",
          tuple: "tupla",
          enum: "enumeraci\xF3n",
          union: "uni\xF3n",
          literal: "literal",
          promise: "promesa",
          void: "vac\xEDo",
          never: "nunca",
          unknown: "desconocido",
          any: "cualquiera",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = kp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Entrada inv\xE1lida: se esperaba instanceof ${r.expected}, recibido ${l}`;
            return `Entrada inv\xE1lida: se esperaba ${s}, recibido ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Entrada inv\xE1lida: se esperaba ${kp.stringifyPrimitive(r.values[0])}`;
            return `Opci\xF3n inv\xE1lida: se esperaba una de ${kp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin),
              l = o[r.origin] ?? r.origin;
            if (a)
              return `Demasiado grande: se esperaba que ${l ?? "valor"} tuviera ${s}${r.maximum.toString()} ${a.unit ?? "elementos"}`;
            return `Demasiado grande: se esperaba que ${l ?? "valor"} fuera ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin),
              l = o[r.origin] ?? r.origin;
            if (a)
              return `Demasiado peque\xF1o: se esperaba que ${l} tuviera ${s}${r.minimum.toString()} ${a.unit}`;
            return `Demasiado peque\xF1o: se esperaba que ${l} fuera ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `Cadena inv\xE1lida: debe comenzar con "${s.prefix}"`;
            if (s.format === "ends_with") return `Cadena inv\xE1lida: debe terminar en "${s.suffix}"`;
            if (s.format === "includes") return `Cadena inv\xE1lida: debe incluir "${s.includes}"`;
            if (s.format === "regex")
              return `Cadena inv\xE1lida: debe coincidir con el patr\xF3n ${s.pattern}`;
            return `Inv\xE1lido ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `N\xFAmero inv\xE1lido: debe ser m\xFAltiplo de ${r.divisor}`;
          case "unrecognized_keys":
            return `Llave${r.keys.length > 1 ? "s" : ""} desconocida${r.keys.length > 1 ? "s" : ""}: ${kp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Llave inv\xE1lida en ${o[r.origin] ?? r.origin}`;
          case "invalid_union":
            return "Entrada inv\xE1lida";
          case "invalid_element":
            return `Valor inv\xE1lido en ${o[r.origin] ?? r.origin}`;
          default:
            return "Entrada inv\xE1lida";
        }
      };
    };
  function Oq() {
    return { localeError: wq() };
  }
  kA.exports = oo.default;
});

export { EA };
