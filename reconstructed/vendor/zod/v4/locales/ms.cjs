/**
 * zod/v4/locales/ms.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:369475-372880 cjs-fingerprint
var gI = x(function (Ao, mI) {
  var _W =
      (Ao && Ao.__createBinding) ||
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
    bW =
      (Ao && Ao.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    vW =
      (Ao && Ao.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) _W(t, e, key);
        }
        return (bW(t, e), t);
      };
  Object.defineProperty(Ao, "__esModule", { value: !0 });
  Ao.default = OW;
  var Zp = vW(Ee()),
    wW = () => {
      let e = {
        string: { unit: "aksara", verb: "mempunyai" },
        file: { unit: "bait", verb: "mempunyai" },
        array: { unit: "elemen", verb: "mempunyai" },
        set: { unit: "elemen", verb: "mempunyai" },
        map: { unit: "elemen", verb: "mempunyai" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "input",
          email: "alamat e-mel",
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
          datetime: "tarikh masa ISO",
          date: "tarikh ISO",
          time: "masa ISO",
          duration: "tempoh ISO",
          ipv4: "alamat IPv4",
          ipv6: "alamat IPv6",
          mac: "alamat MAC",
          cidrv4: "julat IPv4",
          cidrv6: "julat IPv6",
          base64: "string dikodkan base64",
          base64url: "string dikodkan base64url",
          json_string: "string JSON",
          e164: "nombor E.164",
          credit_card: "nombor kad kredit",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "input",
        },
        o = { nan: "NaN", number: "nombor" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Zp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `Input tidak sah: dijangka instanceof ${r.expected}, diterima ${l}`;
            return `Input tidak sah: dijangka ${s}, diterima ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `Input tidak sah: dijangka ${Zp.stringifyPrimitive(r.values[0])}`;
            return `Pilihan tidak sah: dijangka salah satu daripada ${Zp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `Terlalu besar: dijangka ${r.origin ?? "nilai"} ${a.verb} ${s}${r.maximum.toString()} ${a.unit ?? "elemen"}`;
            return `Terlalu besar: dijangka ${r.origin ?? "nilai"} adalah ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `Terlalu kecil: dijangka ${r.origin} ${a.verb} ${s}${r.minimum.toString()} ${a.unit}`;
            return `Terlalu kecil: dijangka ${r.origin} adalah ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with") return `String tidak sah: mesti bermula dengan "${s.prefix}"`;
            if (s.format === "ends_with") return `String tidak sah: mesti berakhir dengan "${s.suffix}"`;
            if (s.format === "includes") return `String tidak sah: mesti mengandungi "${s.includes}"`;
            if (s.format === "regex") return `String tidak sah: mesti sepadan dengan corak ${s.pattern}`;
            return `${n[s.format] ?? r.format} tidak sah`;
          }
          case "not_multiple_of":
            return `Nombor tidak sah: perlu gandaan ${r.divisor}`;
          case "unrecognized_keys":
            return `Kunci tidak dikenali: ${Zp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `Kunci tidak sah dalam ${r.origin}`;
          case "invalid_union":
            return "Input tidak sah";
          case "invalid_element":
            return `Nilai tidak sah dalam ${r.origin}`;
          default:
            return "Input tidak sah";
        }
      };
    };
  function OW() {
    return { localeError: wW() };
  }
  mI.exports = Ao.default;
});

export { gI };
