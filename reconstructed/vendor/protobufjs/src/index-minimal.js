/**
 * protobufjs/src/index-minimal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_writer } from "./writer.js";
import { require_writer_buffer } from "./writer_buffer.js";
import { require_reader } from "./reader.js";
import { require_reader_buffer } from "./reader_buffer.js";
import { require_minimal } from "./util/minimal.js";
import { require_rpc } from "./rpc.js";
import { require_roots } from "./roots.js";

//@ chunk-798ashq9.js:40749-41036 cjs-fingerprint
var require_index_minimal = x(function (cjsExports) {
  var protobuf = cjsExports;
  protobuf.build = "minimal";
  protobuf.Writer = require_writer();
  protobuf.BufferWriter = require_writer_buffer();
  protobuf.Reader = require_reader();
  protobuf.BufferReader = require_reader_buffer();
  protobuf.util = require_minimal();
  protobuf.rpc = require_rpc();
  protobuf.roots = require_roots();
  protobuf.configure = configure;
  function configure() {
    protobuf.util._configure();
    protobuf.Writer._configure(protobuf.BufferWriter);
    protobuf.Reader._configure(protobuf.BufferReader);
  }
  configure();
});
export { require_index_minimal };
