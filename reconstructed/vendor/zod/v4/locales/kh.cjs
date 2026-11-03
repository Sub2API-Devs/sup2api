/**
 * zod/v4/locales/kh.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (2)
 * attribution: cjs-fingerprint 2
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_km } from "./km.cjs";
import { require_uk } from "./uk.cjs";

//@ chunk-1ny7cxrt.js:345460-345707 cjs-fingerprint
var require_kh = x(function (cjsExports, cjsModule) {
  var __importDefault =
    (cjsExports && cjsExports.__importDefault) ||
    function (mod) {
      return mod && mod.__esModule
        ? mod
        : {
            default: mod,
          };
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = default_1;
  var km_js_1 = __importDefault(require_km());
  function default_1() {
    return (0, km_js_1.default)();
  }
  cjsModule.exports = cjsExports.default;
});
//@ chunk-1ny7cxrt.js:473491-473738 cjs-fingerprint
var require_kh_2 = x(function (cjsExports, cjsModule) {
  var __importDefault =
    (cjsExports && cjsExports.__importDefault) ||
    function (mod) {
      return mod && mod.__esModule
        ? mod
        : {
            default: mod,
          };
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = default_1;
  var km_js_1 = __importDefault(require_uk());
  function default_1() {
    return (0, km_js_1.default)();
  }
  cjsModule.exports = cjsExports.default;
});
export { require_kh, require_kh_2 };
