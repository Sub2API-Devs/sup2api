/**
 * @bufbuild/protobuf/dist/commonjs/reflect/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { op } from "../../cjs/reflect/error.js";
import { Ec } from "../../cjs/reflect/names.js";
import { Ux } from "../../cjs/reflect/nested-types.js";
import { Po } from "../../cjs/reflect/reflect.js";
import { Ik } from "./reflect-types.js";
import { El } from "./scalar.js";
import { Dk } from "./path.js";
import { Uu } from "../../cjs/reflect/guard.js";

//@ chunk-fq0cr76a.js:358179-359141 cjs-fingerprint
var ba = x(function (os) {
  var VY =
      (os && os.__createBinding) ||
      (Object.create
        ? function (e, n, r, s) {
            if (s === void 0) s = r;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(n, r);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !n.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return n[r];
                },
              };
            Object.defineProperty(e, s, ownPropertyDescriptor);
          }
        : function (e, n, r, s) {
            if (s === void 0) s = r;
            e[s] = n[r];
          }),
    _c =
      (os && os.__exportStar) ||
      function (e, n) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(n, key)) VY(n, e, key);
      };
  Object.defineProperty(os, "__esModule", { value: !0 });
  os.isReflectMessage = os.isReflectMap = os.isReflectList = void 0;
  _c(op(), os);
  _c(Ec(), os);
  _c(Ux(), os);
  _c(Po(), os);
  _c(Ik(), os);
  _c(El(), os);
  _c(Dk(), os);
  var Qx = Uu();
  Object.defineProperty(os, "isReflectList", {
    enumerable: !0,
    get: function () {
      return Qx.isReflectList;
    },
  });
  Object.defineProperty(os, "isReflectMap", {
    enumerable: !0,
    get: function () {
      return Qx.isReflectMap;
    },
  });
  Object.defineProperty(os, "isReflectMessage", {
    enumerable: !0,
    get: function () {
      return Qx.isReflectMessage;
    },
  });
});

export { ba };
