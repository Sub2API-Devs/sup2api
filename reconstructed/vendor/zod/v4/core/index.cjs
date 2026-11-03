/**
 * zod/v4/core/index.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Xs } from "./core.cjs";
import { A_ } from "./parse.cjs";
import { E_ } from "./errors.cjs";
import { Bl } from "./schemas.cjs";
import { F_ } from "./memoizer.cjs";
import { ep } from "./checks.cjs";
import { M_ } from "./versions.cjs";
import { Ee } from "./util.cjs";
import { Ul } from "./regexes.cjs";
import { Z_ } from "../locales/index.cjs";
import { Ju } from "./registries.cjs";
import { tp } from "./doc.cjs";
import { MC } from "./compile.cjs";
import { NC } from "./api.cjs";
import { td } from "./to-json-schema.cjs";
import { nd } from "./json-schema-processors.cjs";
import { sT } from "./json-schema-generator.cjs";
import { aT } from "./json-schema.cjs";

//@ chunk-1ny7cxrt.js:585984-587814 cjs-fingerprint
var Wr = x(function (vt) {
  var lT =
      (vt && vt.__createBinding) ||
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
    vX =
      (vt && vt.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    _i =
      (vt && vt.__exportStar) ||
      function (e, t) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(t, key)) lT(t, e, key);
      },
    Ph =
      (vt && vt.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) lT(t, e, key);
        }
        return (vX(t, e), t);
      };
  Object.defineProperty(vt, "__esModule", { value: !0 });
  vt.JSONSchema =
    vt.JSONSchemaGenerator =
    vt.toJSONSchema =
    vt.locales =
    vt.regexes =
    vt.toZod =
    vt.util =
      void 0;
  _i(Xs(), vt);
  _i(A_(), vt);
  _i(E_(), vt);
  _i(Bl(), vt);
  _i(F_(), vt);
  _i(ep(), vt);
  _i(M_(), vt);
  vt.util = Ph(Ee());
  var wX = Ee();
  Object.defineProperty(vt, "toZod", {
    enumerable: !0,
    get: function () {
      return wX.toZod;
    },
  });
  vt.regexes = Ph(Ul());
  vt.locales = Ph(Z_());
  _i(Ju(), vt);
  _i(tp(), vt);
  _i(MC(), vt);
  _i(NC(), vt);
  _i(td(), vt);
  var OX = nd();
  Object.defineProperty(vt, "toJSONSchema", {
    enumerable: !0,
    get: function () {
      return OX.toJSONSchema;
    },
  });
  var SX = sT();
  Object.defineProperty(vt, "JSONSchemaGenerator", {
    enumerable: !0,
    get: function () {
      return SX.JSONSchemaGenerator;
    },
  });
  vt.JSONSchema = Ph(aT());
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(vt);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(vt, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(vt, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(vt);
  })();
});

export { Wr };
