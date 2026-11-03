/**
 * zod/v4/locales/id.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:314570-318069 cjs-fingerprint
var GA = x(function (yo, qA) {
  var bG =
      (yo && yo.__createBinding) ||
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
    vG =
      (yo && yo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    wG =
      (yo && yo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) bG(t, e, key);
        }
        return (vG(t, e), t);
      };
  Object.defineProperty(yo, "__esModule", { value: !0 });
  yo.default = SG;
  var jp = wG(Ee()),
    OG = () => {
      let e = {
        string: { unit: "karakter", verb: "memiliki" },
        file: { unit: "byte", verb: "memiliki" },
        array: { unit: "item", verb: "memiliki" },
        set: { unit: "item", verb: "memiliki" },
        map: { unit: "item", verb: "memiliki" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "input",
          email: "alamat email",
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
          datetime: "tanggal dan waktu format ISO",
          date: "tanggal format ISO",
          time: "jam format ISO",
          duration: "durasi format ISO",
          ipv4: "alamat IPv4",
          ipv6: "alamat IPv6",
          mac: "alamat MAC",
          cidrv4: "rentang alamat IPv4",
          cidrv6: "rentang alamat IPv6",
          base64: "string dengan enkode base64",
          base64url: "string dengan enkode base64url",
          json_string: "string JSON",
          e164: "angka E.164",
          credit_card: "nomor kartu kredit",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "input",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = jp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Input tidak valid: diharapkan instanceof ${r.expected}, diterima ${l}`;
            return `Input tidak valid: diharapkan ${s}, diterima ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Input tidak valid: diharapkan ${jp.stringifyPrimitive(r.values[0])}`;
            return `Pilihan tidak valid: diharapkan salah satu dari ${jp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Terlalu besar: diharapkan ${r.origin ?? "value"} memiliki ${s}${r.maximum.toString()} ${a.unit ?? "elemen"}`;
            return `Terlalu besar: diharapkan ${r.origin ?? "value"} menjadi ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Terlalu kecil: diharapkan ${r.origin} memiliki ${s}${r.minimum.toString()} ${a.unit}`;
            return `Terlalu kecil: diharapkan ${r.origin} menjadi ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `String tidak valid: harus dimulai dengan "${s.prefix}"`;
            if (s.format === "ends_with") return `String tidak valid: harus berakhir dengan "${s.suffix}"`;
            if (s.format === "includes") return `String tidak valid: harus menyertakan "${s.includes}"`;
            if (s.format === "regex") return `String tidak valid: harus sesuai pola ${s.pattern}`;
            return `${n[s.format] ?? r.format} tidak valid`;
          }
          case "not_multiple_of":
            return `Angka tidak valid: harus kelipatan dari ${r.divisor}`;
          case "unrecognized_keys":
            return `Kunci tidak dikenali ${r.keys.length > 1 ? "s" : ""}: ${jp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Kunci tidak valid di ${r.origin}`;
          case "invalid_union":
            return "Input tidak valid";
          case "invalid_element":
            return `Nilai tidak valid di ${r.origin}`;
          default:
            return "Input tidak valid";
        }
      };
    };
  function SG() {
    return { localeError: OG() };
  }
  qA.exports = yo.default;
});

export { GA };
