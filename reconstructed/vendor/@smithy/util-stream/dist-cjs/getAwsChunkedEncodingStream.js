/**
 * @smithy/util-stream/dist-cjs/getAwsChunkedEncodingStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:5983-6573 cjs-fingerprint
var xt = x(function (St) {
  Object.defineProperty(St, "__esModule", { value: !0 });
  St.getAwsChunkedEncodingStream = void 0;
  var gt = importMetaRequire("stream"),
    Wr = (e, t) => {
      let {
          base64Encoder: base64Encoder,
          bodyLengthChecker: bodyLengthChecker,
          checksumAlgorithmFn: checksumAlgorithmFn,
          checksumLocationName: checksumLocationName,
          streamHasher: streamHasher,
        } = t,
        o =
          base64Encoder !== void 0 &&
          checksumAlgorithmFn !== void 0 &&
          checksumLocationName !== void 0 &&
          streamHasher !== void 0,
        c = o ? streamHasher(checksumAlgorithmFn, e) : void 0,
        u = new gt.Readable({ read: () => {} });
      return (
        e.on("data", (h) => {
          let f = bodyLengthChecker(h) || 0;
          (u.push(`${f.toString(16)}\r
`),
            u.push(h),
            u.push(`\r
`));
        }),
        e.on("end", async () => {
          if (
            (u.push(`0\r
`),
            o)
          ) {
            let h = base64Encoder(await c);
            (u.push(`${checksumLocationName}:${h}\r
`),
              u.push(`\r
`));
          }
          u.push(null);
        }),
        u
      );
    };
  St.getAwsChunkedEncodingStream = Wr;
});

export { xt };
