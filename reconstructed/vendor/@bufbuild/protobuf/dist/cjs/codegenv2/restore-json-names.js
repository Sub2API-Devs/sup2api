/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/restore-json-names.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ec } from "../reflect/names.js";
import { xl } from "../reflect/unsafe.js";

//@ chunk-fq0cr76a.js:361489-361746 cjs-require-graph
var r_ = x(function (Zk) {
  Object.defineProperty(Zk, "__esModule", { value: !0 });
  Zk.restoreJsonNames = Yk;
  var qk = Ec(),
    jk = xl();
  function Yk(e) {
    for (let n of e.field) if (!jk.unsafeIsSetExplicit(n, "jsonName")) n.jsonName = qk.protoCamelCase(n.name);
    e.nestedType.forEach(Yk);
  }
});

export { r_ };
