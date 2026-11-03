/**
 * jose/dist/node/esm/lib/check_p2s.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { v } from "../../../browser/runtime/base64url.js";
import { W } from "../../../webapi/lib/buffer_utils.js";
import { L } from "./invalid_key_input.js";
import { O, M } from "../../../browser/runtime/is_key_like.js";
import { s } from "../../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:11375-11412 esm-layout
var Ve = Xa(() => {
  v();
  W();
  L();
  O();
  M();
});
//@ chunk-2tyrgda4.js:11412-11526 esm-fingerprint
function ze(e) {
  if (!(e instanceof Uint8Array) || e.length < 8) throw new s("PBES2 Salt Input must be 8 or more octets");
}

export { ze, Ve };
