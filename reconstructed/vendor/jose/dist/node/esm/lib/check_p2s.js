/**
 * jose/dist/node/esm/lib/check_p2s.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __esm } from "../../../../../../runtime/bun-runtime.js";
import { init_base64url } from "../../../browser/runtime/base64url.js";
import { init_buffer_utils } from "../../../webapi/lib/buffer_utils.js";
import { noop } from "./invalid_key_input.js";
import { noopInit, init_is_key_like } from "../../../browser/runtime/is_key_like.js";
import { JWEInvalid } from "../../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:11375-11412 esm-layout
var init_check_p2s = __esm(() => {
  init_base64url();
  init_buffer_utils();
  noop();
  noopInit();
  init_is_key_like();
});
//@ chunk-2tyrgda4.js:11412-11526 esm-fingerprint
function checkP2s(p2s) {
  if (!(p2s instanceof Uint8Array) || p2s.length < 8)
    throw new JWEInvalid("PBES2 Salt Input must be 8 or more octets");
}
export { checkP2s, init_check_p2s };
