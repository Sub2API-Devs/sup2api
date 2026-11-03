/**
 * @bufbuild/cel/dist/cjs/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Yy } from "../../../cel-spec/dist/cjs/gen/cel/expr/syntax_pb.js";
import { AU } from "./parser.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";

//@ chunk-fq0cr76a.js:597305-597494 cjs-fingerprint
var rv = x(function (NU) {
  Object.defineProperty(NU, "__esModule", { value: !0 });
  NU.parse = Ooe;
  var CU = Yy(),
    RU = AU(),
    IU = li();
  function Ooe(e) {
    return IU.create(CU.ParsedExprSchema, { expr: RU.parse(e) });
  }
});

export { rv };
