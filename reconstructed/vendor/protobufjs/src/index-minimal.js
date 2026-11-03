/**
 * protobufjs/src/index-minimal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { yHr } from "./writer.js";
import { Rr } from "./writer_buffer.js";
import { _Hr } from "./reader.js";
import { Fr } from "./reader_buffer.js";
import { QGe } from "./util/minimal.js";
import { ZPo } from "./rpc.js";
import { eIo } from "./roots.js";

//@ chunk-798ashq9.js:40749-41036 cjs-fingerprint
var tIo = x(function (Yr) {
  var B = Yr;
  B.build = "minimal";
  B.Writer = yHr();
  B.BufferWriter = Rr();
  B.Reader = _Hr();
  B.BufferReader = Fr();
  B.util = QGe();
  B.rpc = ZPo();
  B.roots = eIo();
  B.configure = Gr;
  function Gr() {
    (B.util._configure(), B.Writer._configure(B.BufferWriter), B.Reader._configure(B.BufferReader));
  }
  Gr();
});

export { tIo };
