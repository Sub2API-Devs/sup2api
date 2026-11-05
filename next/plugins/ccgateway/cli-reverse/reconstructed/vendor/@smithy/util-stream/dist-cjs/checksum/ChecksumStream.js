/**
 * @smithy/util-stream/dist-cjs/checksum/ChecksumStream.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { base64Module } from "../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";

//@ chunk-1fkvp0h1.js:425-1456 cjs-fingerprint
var require_ChecksumStream = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ChecksumStream = undefined;
  var util_base64_1 = base64Module();
  var stream_1 = importMetaRequire("stream");
  class ChecksumStream extends stream_1.Duplex {
    expectedChecksum;
    checksumSourceLocation;
    checksum;
    source;
    base64Encoder;
    constructor({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder }) {
      super();
      if (typeof source.pipe === "function") this.source = source;
      else
        throw Error(
          `@smithy/util-stream: unsupported source type ${source?.constructor?.name ?? source} in ChecksumStream.`,
        );
      this.base64Encoder = base64Encoder ?? util_base64_1.toBase64;
      this.expectedChecksum = expectedChecksum;
      this.checksum = checksum;
      this.checksumSourceLocation = checksumSourceLocation;
      this.source.pipe(this);
    }
    _read(size) {}
    _write(chunk, encoding, callback) {
      try {
        this.checksum.update(chunk);
        this.push(chunk);
      } catch (e) {
        return callback(e);
      }
      return callback();
    }
    async _final(callback) {
      try {
        let digest = await this.checksum.digest();
        let received = this.base64Encoder(digest);
        if (this.expectedChecksum !== received)
          return callback(
            Error(
              `Checksum mismatch: expected "${this.expectedChecksum}" but received "${received}" in response header "${this.checksumSourceLocation}".`,
            ),
          );
      } catch (e) {
        return callback(e);
      }
      this.push(null);
      return callback();
    }
  }
  cjsExports.ChecksumStream = ChecksumStream;
});
export { require_ChecksumStream };
