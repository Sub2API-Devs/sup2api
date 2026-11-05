/**
 * jose/dist/browser/runtime/zlib.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (1)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { JOSENotSupported_3 } from "../../webapi/lib/content_encryption.js";

//@ chunk-pd6th42n.js:8874-9302 esm-fingerprint
var inflate = async () => {
  throw new JOSENotSupported_3(
    'JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `inflateRaw` decrypt option to provide Inflate Raw implementation.',
  );
};
var deflate = async () => {
  throw new JOSENotSupported_3(
    'JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `deflateRaw` encrypt option to provide Deflate Raw implementation.',
  );
};
export { inflate, deflate };
