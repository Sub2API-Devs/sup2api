/**
 * jose/dist/browser/runtime/zlib.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (1)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { JOSENotSupported } from "../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:8874-9302 esm-fingerprint
var inflate = async () => {
  throw new JOSENotSupported(
    'JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `inflateRaw` decrypt option to provide Inflate Raw implementation.',
  );
};
var deflate = async () => {
  throw new JOSENotSupported(
    'JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `deflateRaw` encrypt option to provide Deflate Raw implementation.',
  );
};
export { inflate, deflate };
