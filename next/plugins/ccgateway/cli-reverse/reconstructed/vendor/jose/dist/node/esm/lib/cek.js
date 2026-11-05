/**
 * jose/dist/node/esm/lib/cek.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __esm } from "../../../../../../runtime/bun-runtime.js";
import { init_signing } from "../../../webapi/lib/signing.js";
import { init_content_encryption_6, JOSENotSupported_3 } from "../../../webapi/lib/content_encryption.js";
import { init_buffer_utils } from "../../../webapi/lib/buffer_utils.js";
import { noop } from "./invalid_key_input.js";
import { checkIvLengthFn } from "../../../browser/runtime/rsaes.js";
import { noopInit, init_is_key_like } from "../../../browser/runtime/is_key_like.js";

//@ chunk-pd6th42n.js:13748-13796 esm-layout
var init_cek = __esm(() => {
  init_signing();
  init_content_encryption_6();
  init_buffer_utils();
  noop();
  checkIvLengthFn();
  noopInit();
  init_is_key_like();
});
//@ chunk-pd6th42n.js:13796-14034 esm-fingerprint
function bitLength(alg) {
  switch (alg) {
    case "A128GCM":
      return 128;
    case "A192GCM":
      return 192;
    case "A256GCM":
    case "A128CBC-HS256":
      return 256;
    case "A192CBC-HS384":
      return 384;
    case "A256CBC-HS512":
      return 512;
    default:
      throw new JOSENotSupported_3(`Unsupported JWE Algorithm: ${alg}`);
  }
}
export { init_cek, bitLength };
