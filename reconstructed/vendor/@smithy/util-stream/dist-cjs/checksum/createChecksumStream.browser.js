/**
 * @smithy/util-stream/dist-cjs/checksum/createChecksumStream.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { base64Module } from "../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { B } from "../stream-type-check.js";
import { We } from "./ChecksumStream.browser.js";

//@ chunk-wjd9n4jx.js:2027-2964 cjs-fingerprint
var Ke = x(function (Ye) {
  Object.defineProperty(Ye, "__esModule", { value: !0 });
  Ye.createChecksumStream = void 0;
  var Ve = base64Module(),
    Qe = B(),
    Ge = We(),
    Dr = ({
      expectedChecksum: expectedChecksum,
      checksum: checksum,
      source: source,
      checksumSourceLocation: checksumSourceLocation,
      base64Encoder: base64Encoder,
    }) => {
      if (!Qe.isReadableStream(source))
        throw Error(
          `@smithy/util-stream: unsupported source type ${source?.constructor?.name ?? source} in ChecksumStream.`,
        );
      let i = base64Encoder ?? Ve.toBase64;
      if (typeof TransformStream !== "function")
        throw Error(
          "@smithy/util-stream: unable to instantiate ChecksumStream because API unavailable: ReadableStream/TransformStream.",
        );
      let transformStream = new TransformStream({
        start() {},
        async transform(c, u) {
          (checksum.update(c), u.enqueue(c));
        },
        async flush(c) {
          let digest = await checksum.digest(),
            h = i(digest);
          if (expectedChecksum !== h) {
            let f = Error(
              `Checksum mismatch: expected "${expectedChecksum}" but received "${h}" in response header "${checksumSourceLocation}".`,
            );
            c.error(f);
          } else c.terminate();
        },
      });
      source.pipeThrough(transformStream);
      let readable = transformStream.readable;
      return (Object.setPrototypeOf(readable, Ge.ChecksumStream.prototype), readable);
    };
  Ye.createChecksumStream = Dr;
});

export { Ke };
