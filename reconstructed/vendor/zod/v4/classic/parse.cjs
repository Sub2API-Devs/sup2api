/**
 * zod/v4/classic/parse.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "../core/index.cjs";
import { ib } from "./errors.cjs";

//@ chunk-1ny7cxrt.js:593194-595236 cjs-fingerprint
var ob = x(function (wt) {
  var AX =
      (wt && wt.__createBinding) ||
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
    IX =
      (wt && wt.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    CX =
      (wt && wt.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) AX(t, e, key);
        }
        return (IX(t, e), t);
      };
  Object.defineProperty(wt, "__esModule", { value: !0 });
  wt.safeDecodeAsync =
    wt.safeEncodeAsync =
    wt.safeDecode =
    wt.safeEncode =
    wt.decodeAsync =
    wt.encodeAsync =
    wt.decode =
    wt.encode =
    wt.validateAsync =
    wt.validate =
    wt.safeParseAsync =
    wt.safeParse =
    wt.parseAsync =
    wt.parse =
      void 0;
  var bi = CX(Wr()),
    _n = ib();
  wt.parse = bi._parse(_n.ZodRealError);
  wt.parseAsync = bi._parseAsync(_n.ZodRealError);
  wt.safeParse = bi._safeParse(_n.ZodRealError);
  wt.safeParseAsync = bi._safeParseAsync(_n.ZodRealError);
  var mT = Wr();
  Object.defineProperty(wt, "validate", {
    enumerable: !0,
    get: function () {
      return mT.validate;
    },
  });
  Object.defineProperty(wt, "validateAsync", {
    enumerable: !0,
    get: function () {
      return mT.validateAsync;
    },
  });
  wt.encode = bi._encode(_n.ZodRealError);
  wt.decode = bi._decode(_n.ZodRealError);
  wt.encodeAsync = bi._encodeAsync(_n.ZodRealError);
  wt.decodeAsync = bi._decodeAsync(_n.ZodRealError);
  wt.safeEncode = bi._safeEncode(_n.ZodRealError);
  wt.safeDecode = bi._safeDecode(_n.ZodRealError);
  wt.safeEncodeAsync = bi._safeEncodeAsync(_n.ZodRealError);
  wt.safeDecodeAsync = bi._safeDecodeAsync(_n.ZodRealError);
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(wt);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(wt, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(wt, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(wt);
  })();
});

export { ob };
