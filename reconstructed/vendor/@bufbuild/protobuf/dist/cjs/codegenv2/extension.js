/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/extension.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:426472-426713 cjs-require-graph
var require_extension = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.extDesc = extDesc;
  function extDesc(file, path, ...paths) {
    if (paths.length == 0) return file.extensions[path];
    let e = paths.pop();
    return paths.reduce((acc, cur) => acc.nestedMessages[cur], file.messages[path]).nestedExtensions[e];
  }
});
export { require_extension };
