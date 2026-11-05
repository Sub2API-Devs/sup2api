/**
 * @smithy/util-stream/dist-cjs/checksum/createChecksumStream.browser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { base64Module } from "../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { require_stream_type_check } from "../stream-type-check.js";
import { require_ChecksumStream_browser } from "./ChecksumStream.browser.js";

//@ chunk-1fkvp0h1.js:2027-2964 cjs-fingerprint
var require_createChecksumStream_browser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createChecksumStream = undefined;
  var util_base64_1 = base64Module();
  var stream_type_check_1 = require_stream_type_check();
  var ChecksumStream_browser_1 = require_ChecksumStream_browser();
  var createChecksumStream = ({
    expectedChecksum,
    checksum,
    source,
    checksumSourceLocation,
    base64Encoder,
  }) => {
    if (!stream_type_check_1.isReadableStream(source))
      throw Error(
        `@smithy/util-stream: unsupported source type ${source?.constructor?.name ?? source} in ChecksumStream.`,
      );
    let encoder = base64Encoder ?? util_base64_1.toBase64;
    if (typeof TransformStream !== "function")
      throw Error(
        "@smithy/util-stream: unable to instantiate ChecksumStream because API unavailable: ReadableStream/TransformStream.",
      );
    let transform = new TransformStream({
      start() {},
      async transform(chunk, controller) {
        checksum.update(chunk);
        controller.enqueue(chunk);
      },
      async flush(controller) {
        let digest = await checksum.digest();
        let received = encoder(digest);
        if (expectedChecksum !== received) {
          let error = Error(
            `Checksum mismatch: expected "${expectedChecksum}" but received "${received}" in response header "${checksumSourceLocation}".`,
          );
          controller.error(error);
        } else controller.terminate();
      },
    });
    source.pipeThrough(transform);
    let readable = transform.readable;
    Object.setPrototypeOf(readable, ChecksumStream_browser_1.ChecksumStream.prototype);
    return readable;
  };
  cjsExports.createChecksumStream = createChecksumStream;
});
export { require_createChecksumStream_browser };
