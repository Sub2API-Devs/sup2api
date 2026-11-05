/**
 * jose/dist/browser/runtime/is_key_like.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isCryptoKey, init_buffer_utils } from "../../webapi/lib/buffer_utils.js";
import { __esm } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pd6th42n.js:7442-7455 esm-layout
var noopInit = () => {};
//@ chunk-pd6th42n.js:7455-7474 esm-layout
var isKeyLike = (key) => isCryptoKey(key);
var keyObjectTypes;
//@ chunk-pd6th42n.js:7474-7510 esm-fingerprint
var init_is_key_like = __esm(() => {
  init_buffer_utils();
  keyObjectTypes = ["CryptoKey"];
});
export { noopInit, init_is_key_like, keyObjectTypes, isKeyLike };
