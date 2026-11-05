/**
 * protobufjs/src/index-light.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_index_minimal } from "./index-minimal.js";
import { require_encoder } from "./encoder.js";
import { require_decoder } from "./decoder.js";
import { require_verifier } from "./verifier.js";
import { require_converter } from "./converter.js";
import { require_object } from "./object.js";
import { require_namespace } from "./namespace.js";
import { require_root } from "./root.js";
import { require_enum } from "./enum.js";
import { require_type } from "./type.js";
import { require_field } from "./field.js";
import { require_oneof } from "./oneof.js";
import { require_mapfield } from "./mapfield.js";
import { require_service } from "./service.js";
import { require_method } from "./method.js";
import { require_message } from "./message.js";
import { require_wrappers } from "./wrappers.js";
import { require_types } from "./types.js";
import { require_util_2 } from "./util.js";

//@ chunk-3k21nfa0.js:129796-130453 cjs-fingerprint
var require_index_light = __commonJS(function (cjsExports, cjsModule) {
  var protobuf = (cjsModule.exports = require_index_minimal());
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
  protobuf.encoder = require_encoder();
  protobuf.decoder = require_decoder();
  protobuf.verifier = require_verifier();
  protobuf.converter = require_converter();
  protobuf.ReflectionObject = require_object();
  protobuf.Namespace = require_namespace();
  protobuf.Root = require_root();
  protobuf.Enum = require_enum();
  protobuf.Type = require_type();
  protobuf.Field = require_field();
  protobuf.OneOf = require_oneof();
  protobuf.MapField = require_mapfield();
  protobuf.Service = require_service();
  protobuf.Method = require_method();
  protobuf.Message = require_message();
  protobuf.wrappers = require_wrappers();
  protobuf.types = require_types();
  protobuf.util = require_util_2();
  protobuf.ReflectionObject._configure(protobuf.Root);
  protobuf.Namespace._configure(protobuf.Type, protobuf.Service, protobuf.Enum);
  protobuf.Root._configure(protobuf.Type);
  protobuf.Field._configure(protobuf.Type);
});
export { require_index_light };
