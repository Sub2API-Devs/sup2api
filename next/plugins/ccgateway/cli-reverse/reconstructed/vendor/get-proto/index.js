/**
 * get-proto/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: get-proto@1.0.1
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import {
  require_Reflect_getPrototypeOf,
  require_Reflect_getPrototypeOf_2,
} from "./Reflect.getPrototypeOf.js";
import { require_get } from "../dunder-proto/get.js";

//@ chunk-ww9agm6g.js:11796-12047 cjs-fingerprint
var require_get_proto = __commonJS(function (cjsExports, cjsModule) {
  var reflectGetProto = require_Reflect_getPrototypeOf();
  var originalGetProto = require_Reflect_getPrototypeOf_2();
  var getDunderProto = require_get();
  cjsModule.exports = reflectGetProto
    ? function (O) {
        return reflectGetProto(O);
      }
    : originalGetProto
      ? function (O) {
          if (!O || (typeof O !== "object" && typeof O !== "function"))
            throw TypeError("getProto: not an object");
          return originalGetProto(O);
        }
      : getDunderProto
        ? function (O) {
            return getDunderProto(O);
          }
        : null;
});
export { require_get_proto };
