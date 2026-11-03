/**
 * jose/dist/node/esm/lib/cek.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { Wt } from "../../../webapi/lib/signing.js";
import { Fe, f } from "../../../webapi/lib/content_encryption.js";
import { W } from "../../../webapi/lib/buffer_utils.js";
import { L } from "./invalid_key_input.js";
import { He } from "../../../browser/runtime/rsaes.js";
import { O, M } from "../../../browser/runtime/is_key_like.js";

//@ chunk-2tyrgda4.js:13748-13796 esm-layout
var Ye = Xa(() => {
  Wt();
  Fe();
  W();
  L();
  He();
  O();
  M();
});
//@ chunk-2tyrgda4.js:13796-14034 esm-fingerprint
function ie(e) {
  switch (e) {
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
      throw new f(`Unsupported JWE Algorithm: ${e}`);
  }
}

export { ie, Ye };
