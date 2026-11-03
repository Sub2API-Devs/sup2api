/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/file.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { dp } from "../wire/base64-encoding.js";
import { Rl } from "../../commonjs/wkt/gen/google/protobuf/descriptor_pb.js";
import { qg } from "../registry.js";
import { r_ } from "./restore-json-names.js";
import { Ku } from "../../commonjs/from-binary.js";

//@ chunk-fq0cr76a.js:413424-413898 cjs-require-graph
var Ds = x(function (QD) {
  Object.defineProperty(QD, "__esModule", { value: !0 });
  QD.fileDesc = wz;
  var YD = dp(),
    ZD = Rl(),
    zD = qg(),
    XD = r_(),
    JD = Ku();
  function wz(e, n) {
    var r;
    let fromBinary = JD.fromBinary(ZD.FileDescriptorProtoSchema, YD.base64Decode(e));
    return (
      fromBinary.messageType.forEach(XD.restoreJsonNames),
      (fromBinary.dependency =
        (r = n === null || n === void 0 ? void 0 : n.map((y) => y.proto.name)) !== null && r !== void 0
          ? r
          : []),
      zD
        .createFileRegistry(fromBinary, (y) =>
          n === null || n === void 0 ? void 0 : n.find((b) => b.proto.name === y),
        )
        .getFile(fromBinary.name)
    );
  }
});

export { Ds };
