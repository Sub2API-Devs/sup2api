/**
 * @smithy/util-stream/dist-cjs/getAwsChunkedEncodingStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:5983-6573 cjs-fingerprint
var require_getAwsChunkedEncodingStream = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getAwsChunkedEncodingStream = undefined;
  var stream_1 = importMetaRequire("stream");
  var getAwsChunkedEncodingStream = (readableStream, options) => {
    let { base64Encoder, bodyLengthChecker, checksumAlgorithmFn, checksumLocationName, streamHasher } =
      options;
    let checksumRequired =
      base64Encoder !== undefined &&
      checksumAlgorithmFn !== undefined &&
      checksumLocationName !== undefined &&
      streamHasher !== undefined;
    let digest = checksumRequired ? streamHasher(checksumAlgorithmFn, readableStream) : undefined;
    let awsChunkedEncodingStream = new stream_1.Readable({
      read: () => {},
    });
    readableStream.on("data", (data) => {
      let length = bodyLengthChecker(data) || 0;
      awsChunkedEncodingStream.push(`${length.toString(16)}\r
`);
      awsChunkedEncodingStream.push(data);
      awsChunkedEncodingStream.push(`\r
`);
    });
    readableStream.on("end", async () => {
      awsChunkedEncodingStream.push(`0\r
`);
      if (checksumRequired) {
        let checksum = base64Encoder(await digest);
        awsChunkedEncodingStream.push(`${checksumLocationName}:${checksum}\r
`);
        awsChunkedEncodingStream.push(`\r
`);
      }
      awsChunkedEncodingStream.push(null);
    });
    return awsChunkedEncodingStream;
  };
  cjsExports.getAwsChunkedEncodingStream = getAwsChunkedEncodingStream;
});
export { require_getAwsChunkedEncodingStream };
