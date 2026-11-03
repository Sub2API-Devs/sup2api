/**
 * zod/v4/locales/ko.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:352814-357387 cjs-fingerprint
var cI = x(function (ko, lI) {
  var rW =
      (ko && ko.__createBinding) ||
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
    iW =
      (ko && ko.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    oW =
      (ko && ko.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) rW(t, e, key);
        }
        return (iW(t, e), t);
      };
  Object.defineProperty(ko, "__esModule", { value: !0 });
  ko.default = aW;
  var Bp = oW(Ee()),
    sW = () => {
      let e = {
        string: { unit: "\uBB38\uC790", verb: "to have" },
        file: { unit: "\uBC14\uC774\uD2B8", verb: "to have" },
        array: { unit: "\uAC1C", verb: "to have" },
        set: { unit: "\uAC1C", verb: "to have" },
        map: { unit: "\uAC1C", verb: "to have" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\uC785\uB825",
          email: "\uC774\uBA54\uC77C \uC8FC\uC18C",
          url: "URL",
          emoji: "\uC774\uBAA8\uC9C0",
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
          datetime: "ISO \uB0A0\uC9DC\uC2DC\uAC04",
          date: "ISO \uB0A0\uC9DC",
          time: "ISO \uC2DC\uAC04",
          duration: "ISO \uAE30\uAC04",
          ipv4: "IPv4 \uC8FC\uC18C",
          ipv6: "IPv6 \uC8FC\uC18C",
          mac: "MAC \uC8FC\uC18C",
          cidrv4: "IPv4 \uBC94\uC704",
          cidrv6: "IPv6 \uBC94\uC704",
          base64: "base64 \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
          base64url: "base64url \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
          json_string: "JSON \uBB38\uC790\uC5F4",
          e164: "E.164 \uBC88\uD638",
          credit_card: "\uC2E0\uC6A9\uCE74\uB4DC \uBC88\uD638",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\uC785\uB825",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Bp.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 instanceof ${r.expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${l}\uC785\uB2C8\uB2E4`;
            return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 ${s}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${l}\uC785\uB2C8\uB2E4`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\uC798\uBABB\uB41C \uC785\uB825: \uAC12\uC740 ${Bp.stringifyPrimitive(r.values[0])} \uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`;
            return `\uC798\uBABB\uB41C \uC635\uC158: ${Bp.joinValues(r.values, "\uB610\uB294 ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
          case "too_big": {
            let s = r.inclusive ? "\uC774\uD558" : "\uBBF8\uB9CC",
              a =
                s === "\uBBF8\uB9CC"
                  ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4"
                  : "\uC5EC\uC57C \uD569\uB2C8\uB2E4",
              l = t(r.origin),
              c = l?.unit ?? "\uC694\uC18C";
            if (l)
              return `${r.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${r.maximum.toString()}${c} ${s}${a}`;
            return `${r.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${r.maximum.toString()} ${s}${a}`;
          }
          case "too_small": {
            let s = r.inclusive ? "\uC774\uC0C1" : "\uCD08\uACFC",
              a =
                s === "\uC774\uC0C1"
                  ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4"
                  : "\uC5EC\uC57C \uD569\uB2C8\uB2E4",
              l = t(r.origin),
              c = l?.unit ?? "\uC694\uC18C";
            if (l)
              return `${r.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${r.minimum.toString()}${c} ${s}${a}`;
            return `${r.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${r.minimum.toString()} ${s}${a}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${s.prefix}"(\uC73C)\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4`;
            if (s.format === "ends_with")
              return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${s.suffix}"(\uC73C)\uB85C \uB05D\uB098\uC57C \uD569\uB2C8\uB2E4`;
            if (s.format === "includes")
              return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${s.includes}"\uC744(\uB97C) \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4`;
            if (s.format === "regex")
              return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: \uC815\uADDC\uC2DD ${s.pattern} \uD328\uD134\uACFC \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4`;
            return `\uC798\uBABB\uB41C ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\uC798\uBABB\uB41C \uC22B\uC790: ${r.divisor}\uC758 \uBC30\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
          case "unrecognized_keys":
            return `\uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD0A4: ${Bp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `\uC798\uBABB\uB41C \uD0A4: ${r.origin}`;
          case "invalid_union":
            return "\uC798\uBABB\uB41C \uC785\uB825";
          case "invalid_element":
            return `\uC798\uBABB\uB41C \uAC12: ${r.origin}`;
          default:
            return "\uC798\uBABB\uB41C \uC785\uB825";
        }
      };
    };
  function aW() {
    return { localeError: sW() };
  }
  lI.exports = ko.default;
});

export { cI };
