/**
 * zod/v4/locales/vi.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:484478-488708 cjs-fingerprint
var dC = x(function (Xo, uC) {
  var I3 =
      (Xo && Xo.__createBinding) ||
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
    C3 =
      (Xo && Xo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    T3 =
      (Xo && Xo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) I3(t, e, key);
        }
        return (C3(t, e), t);
      };
  Object.defineProperty(Xo, "__esModule", { value: !0 });
  Xo.default = R3;
  var mh = T3(Ee()),
    $3 = () => {
      let e = {
        string: { unit: "k\xFD t\u1EF1", verb: "c\xF3" },
        file: { unit: "byte", verb: "c\xF3" },
        array: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
        set: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
        map: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u0111\u1EA7u v\xE0o",
          email: "\u0111\u1ECBa ch\u1EC9 email",
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
          datetime: "ng\xE0y gi\u1EDD ISO",
          date: "ng\xE0y ISO",
          time: "gi\u1EDD ISO",
          duration: "kho\u1EA3ng th\u1EDDi gian ISO",
          ipv4: "\u0111\u1ECBa ch\u1EC9 IPv4",
          ipv6: "\u0111\u1ECBa ch\u1EC9 IPv6",
          mac: "\u0111\u1ECBa ch\u1EC9 MAC",
          cidrv4: "d\u1EA3i IPv4",
          cidrv6: "d\u1EA3i IPv6",
          base64: "chu\u1ED7i m\xE3 h\xF3a base64",
          base64url: "chu\u1ED7i m\xE3 h\xF3a base64url",
          json_string: "chu\u1ED7i JSON",
          e164: "s\u1ED1 E.164",
          credit_card: "s\u1ED1 th\u1EBB t\xEDn d\u1EE5ng",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u0111\u1EA7u v\xE0o",
        },
        o = { nan: "NaN", number: "s\u1ED1", array: "m\u1EA3ng" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = mh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i instanceof ${r.expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${l}`;
            return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${s}, nh\u1EADn \u0111\u01B0\u1EE3c ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${mh.stringifyPrimitive(r.values[0])}`;
            return `T\xF9y ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i m\u1ED9t trong c\xE1c gi\xE1 tr\u1ECB ${mh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${r.origin ?? "gi\xE1 tr\u1ECB"} ${a.verb} ${s}${r.maximum.toString()} ${a.unit ?? "ph\u1EA7n t\u1EED"}`;
            return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${r.origin ?? "gi\xE1 tr\u1ECB"} ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${r.origin} ${a.verb} ${s}${r.minimum.toString()} ${a.unit}`;
            return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${r.origin} ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng "${s.prefix}"`;
            if (s.format === "ends_with")
              return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i k\u1EBFt th\xFAc b\u1EB1ng "${s.suffix}"`;
            if (s.format === "includes")
              return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i bao g\u1ED3m "${s.includes}"`;
            if (s.format === "regex")
              return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i kh\u1EDBp v\u1EDBi m\u1EABu ${s.pattern}`;
            return `${n[s.format] ?? r.format} kh\xF4ng h\u1EE3p l\u1EC7`;
          }
          case "not_multiple_of":
            return `S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i l\xE0 b\u1ED9i s\u1ED1 c\u1EE7a ${r.divisor}`;
          case "unrecognized_keys":
            return `Kh\xF3a kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng: ${mh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Kh\xF3a kh\xF4ng h\u1EE3p l\u1EC7 trong ${r.origin}`;
          case "invalid_union":
            return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
          case "invalid_element":
            return `Gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 trong ${r.origin}`;
          default:
            return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
        }
      };
    };
  function R3() {
    return { localeError: $3() };
  }
  uC.exports = Xo.default;
});

export { dC };
