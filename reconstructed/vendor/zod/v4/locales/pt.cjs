/**
 * zod/v4/locales/pt.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:403079-408011 cjs-fingerprint
var RI = x(function (xo, $I) {
  var i2 =
      (xo && xo.__createBinding) ||
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
    o2 =
      (xo && xo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    s2 =
      (xo && xo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) i2(t, e, key);
        }
        return (o2(t, e), t);
      };
  Object.defineProperty(xo, "__esModule", { value: !0 });
  xo.default = l2;
  var eh = s2(Ee()),
    a2 = () => {
      let e = {
        string: { unit: "caracteres" },
        file: { unit: "bytes" },
        array: { unit: "elementos" },
        set: { unit: "elementos" },
        map: { unit: "entradas" },
      };
      function t(a) {
        return e[a] ?? null;
      }
      let n = {
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
          cidrv4: "o intervalo de endere\xE7os IPv4",
          cidrv6: "o intervalo de endere\xE7os IPv6",
          base64: "o texto codificado em base64",
          base64url: "o texto codificado em base64url",
          json_string: "o texto JSON",
          e164: "o n\xFAmero E.164",
          credit_card: "o n\xFAmero de cart\xE3o de cr\xE9dito",
          iban: "o IBAN",
          jwt: "o JWT",
          template_literal: "a entrada",
        },
        o = {
          masculine: { definite: "o", indefinite: "um" },
          feminine: { definite: "a", indefinite: "uma" },
        },
        r = {
          string: { name: "texto", articles: o.masculine },
          number: { name: "n\xFAmero", articles: o.masculine },
          int: { name: "n\xFAmero inteiro", articles: o.masculine },
          boolean: { name: "valor booleano", articles: o.masculine },
          bigint: { name: "n\xFAmero bigint", articles: o.masculine },
          symbol: { name: "s\xEDmbolo", articles: o.masculine },
          undefined: { name: 'valor "undefined"', articles: o.masculine },
          null: { name: 'valor "nulo"', articles: o.masculine },
          never: { name: 'valor "never"', articles: o.masculine },
          void: { name: 'valor "void"', articles: o.masculine },
          date: { name: "data", articles: o.feminine },
          array: { name: "vetor", articles: o.masculine },
          object: { name: "objeto", articles: o.masculine },
          tuple: { name: "tuplo", articles: o.masculine },
          record: { name: "registo", articles: o.masculine },
          map: { name: "mapa", articles: o.masculine },
          set: { name: "conjunto", articles: o.masculine },
          file: { name: "ficheiro", articles: o.masculine },
          nonoptional: { name: "valor n\xE3o opcional", articles: o.masculine },
          nan: { name: 'valor "NaN"', articles: o.masculine },
          function: { name: "fun\xE7\xE3o", articles: o.feminine },
        };
      function s(a, l) {
        let c = r[a] ?? { name: `valor "${a}"`, articles: o.masculine };
        return `${c.articles[l]} ${c.name}`;
      }
      return (a) => {
        switch (a.code) {
          case "invalid_type": {
            let l = s(a.expected, "indefinite"),
              parsedType = eh.parsedType(a.input),
              u = s(parsedType, "indefinite");
            return `Entrada inv\xE1lida: esperava ${l}, recebeu ${u}`;
          }
          case "invalid_value":
            if (a.values.length === 1)
              return `Entrada inv\xE1lida: esperava ${eh.stringifyPrimitive(a.values[0])}`;
            return `Op\xE7\xE3o inv\xE1lida: esperava uma das seguintes op\xE7\xF5es: ${eh.joinValues(a.values, "|")}`;
          case "too_big": {
            let l = a.inclusive ? "<=" : "<",
              c = t(a.origin);
            if (c)
              return `Demasiado grande: esperava que ${s(a.origin, "definite")} tivesse ${l} ${a.maximum.toString()} ${c.unit ?? "elementos"}`;
            return `Demasiado grande: esperava que ${s(a.origin, "definite")} fosse ${l} ${a.maximum.toString()}`;
          }
          case "too_small": {
            let l = a.inclusive ? ">=" : ">",
              c = t(a.origin);
            if (c)
              return `Demasiado pequeno: esperava que ${s(a.origin, "definite")} tivesse ${l} ${a.minimum.toString()} ${c.unit ?? "elementos"}`;
            return `Demasiado pequeno: esperava que ${s(a.origin, "definite")} fosse ${l} ${a.minimum.toString()}`;
          }
          case "invalid_format": {
            let l = a;
            if (l.format === "starts_with") return `Texto inv\xE1lido: deve come\xE7ar por "${l.prefix}"`;
            if (l.format === "ends_with") return `Texto inv\xE1lido: deve terminar em "${l.suffix}"`;
            if (l.format === "includes") return `Texto inv\xE1lido: deve incluir "${l.includes}"`;
            if (l.format === "regex") return `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${l.pattern}`;
            return `Formato d${n[l.format] ?? a.format} inv\xE1lido`;
          }
          case "not_multiple_of":
            return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${a.divisor}`;
          case "unrecognized_keys": {
            let l = a.keys.length > 1 ? "s" : "";
            return `Chave${l} inv\xE1lida${l}: ${eh.joinValues(a.keys, ", ")}`;
          }
          case "invalid_key":
            return `Entrada inv\xE1lida n${s(a.origin, "definite")}`;
          case "invalid_union":
            if (a.options && Array.isArray(a.options) && a.options.length > 0)
              return `Valor de discrimina\xE7\xE3o inv\xE1lido. Esperava ${a.options.map((option) => `'${option}'`).join(" | ")}`;
            return "Entrada inv\xE1lida";
          case "invalid_element":
            return `Entrada inv\xE1lida n${s(a.origin, "definite")}`;
          default:
            return "Entrada inv\xE1lida";
        }
      };
    };
  function l2() {
    return { localeError: a2() };
  }
  $I.exports = xo.default;
});

export { RI };
