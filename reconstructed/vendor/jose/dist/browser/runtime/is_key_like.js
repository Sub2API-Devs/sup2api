/**
 * jose/dist/browser/runtime/is_key_like.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { g, init_buffer_utils } from "../../webapi/lib/buffer_utils.js";
import { Xa } from "../../../../../runtime/bun-runtime.js";

//@ chunk-2tyrgda4.js:7442-7455 esm-layout
var O = () => {};
//@ chunk-2tyrgda4.js:7455-7474 esm-layout
var Le = (key) => g(key);
var m;
//@ chunk-2tyrgda4.js:7474-7510 esm-fingerprint
var init_is_key_like = Xa(() => {
  init_buffer_utils();
  m = ["CryptoKey"];
});
export { m, O, init_is_key_like, Le };
