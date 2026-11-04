/**
 * ajv-formats/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv-formats@3.0.1
 * pieces: chunk-zykv69v4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_formats_2 } from "./formats.js";
import { require_limit } from "./limit.js";
import { require_codegen_2 as require_codegen } from "../../ajv/dist/compile/codegen/index.js";

//@ chunk-zykv69v4.js:9708-10458 cjs-fingerprint
var require_ajv_formats = __commonJS(function (cjsExports, cjsModule) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var formats_1 = require_formats_2();
  var limit_1 = require_limit();
  var codegen_1 = require_codegen();
  var fullName = new codegen_1.Name("fullFormats");
  var fastName = new codegen_1.Name("fastFormats");
  var formatsPlugin = (
    ajv,
    opts = {
      keywords: true,
    },
  ) => {
    if (Array.isArray(opts)) {
      addFormats(ajv, opts, formats_1.fullFormats, fullName);
      return ajv;
    }
    let [formats, exportName] =
      opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
    let list = opts.formats || formats_1.formatNames;
    addFormats(ajv, list, formats, exportName);
    if (opts.keywords) (0, limit_1.default)(ajv);
    return ajv;
  };
  formatsPlugin.get = (name, mode = "full") => {
    let f = (mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats)[name];
    if (!f) throw Error(`Unknown format "${name}"`);
    return f;
  };
  function addFormats(ajv, list, fs, exportName) {
    var _a;
    var _b;
    if (!((_a = (_b = ajv.opts.code).formats) !== null && _a !== undefined))
      _b.formats = codegen_1._`require("ajv-formats/dist/formats").${exportName}`;
    for (let f of list) ajv.addFormat(f, fs[f]);
  }
  cjsModule.exports = cjsExports = formatsPlugin;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = formatsPlugin;
});
export { require_ajv_formats };
