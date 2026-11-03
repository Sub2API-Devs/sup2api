/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/enum.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:378397-378745 cjs-require-graph
var require_enum = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.enumDesc = enumDesc;
  cjsExports.tsEnum = tsEnum;
  function enumDesc(file, path, ...paths) {
    if (paths.length == 0) return file.enums[path];
    let e = paths.pop();
    return paths.reduce((acc, cur) => acc.nestedMessages[cur], file.messages[path]).nestedEnums[e];
  }
  function tsEnum(desc) {
    let enumObject = {};
    for (let value of desc.values) {
      enumObject[value.localName] = value.number;
      enumObject[value.number] = value.localName;
    }
    return enumObject;
  }
});
export { require_enum };
