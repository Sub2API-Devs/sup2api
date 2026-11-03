/**
 * protobufjs/src/index-light.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_index_minimal as tIo } from "./index-minimal.js";
import { Ka } from "./encoder.js";
import { qa } from "./decoder.js";
import { za } from "./verifier.js";
import { ja } from "./converter.js";
import { Kt } from "./object.js";
import { zr } from "./namespace.js";
import { xs } from "./root.js";
import { nt } from "./enum.js";
import { Ps } from "./type.js";
import { Yt } from "./field.js";
import { Sr } from "./oneof.js";
import { Ts } from "./mapfield.js";
import { bs } from "./service.js";
import { Rs } from "./method.js";
import { Os } from "./message.js";
import { Ga } from "./wrappers.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:129796-130453 cjs-fingerprint
var Wd = x(function (cjsExports, cjsModule) {
  var protobuf = (cjsModule.exports = tIo());
  protobuf.build = "light";
  function load(filename, root, callback) {
    if (typeof root === "function") {
      callback = root;
      root = new protobuf.Root();
    } else if (!root) root = new protobuf.Root();
    return root.load(filename, callback);
  }
  protobuf.load = load;
  function loadSync(filename, root) {
    if (!root) root = new protobuf.Root();
    return root.loadSync(filename);
  }
  protobuf.loadSync = loadSync;
  protobuf.encoder = Ka();
  protobuf.decoder = qa();
  protobuf.verifier = za();
  protobuf.converter = ja();
  protobuf.ReflectionObject = Kt();
  protobuf.Namespace = zr();
  protobuf.Root = xs();
  protobuf.Enum = nt();
  protobuf.Type = Ps();
  protobuf.Field = Yt();
  protobuf.OneOf = Sr();
  protobuf.MapField = Ts();
  protobuf.Service = bs();
  protobuf.Method = Rs();
  protobuf.Message = Os();
  protobuf.wrappers = Ga();
  protobuf.types = Cr();
  protobuf.util = de();
  protobuf.ReflectionObject._configure(protobuf.Root);
  protobuf.Namespace._configure(protobuf.Type, protobuf.Service, protobuf.Enum);
  protobuf.Root._configure(protobuf.Type);
  protobuf.Field._configure(protobuf.Type);
});
export { Wd };
