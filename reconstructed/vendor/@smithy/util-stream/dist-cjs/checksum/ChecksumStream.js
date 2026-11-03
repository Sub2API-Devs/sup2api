/**
 * @smithy/util-stream/dist-cjs/checksum/ChecksumStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { base64Module } from "../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";

//@ chunk-wjd9n4jx.js:425-1456 cjs-fingerprint
var me = x(function (Ue) {
  Object.defineProperty(Ue, "__esModule", { value: !0 });
  Ue.ChecksumStream = void 0;
  var De = base64Module(),
    qe = importMetaRequire("stream");
  class je extends qe.Duplex {
    expectedChecksum;
    checksumSourceLocation;
    checksum;
    source;
    base64Encoder;
    constructor({
      expectedChecksum: e,
      checksum: t,
      source: r,
      checksumSourceLocation: s,
      base64Encoder: n,
    }) {
      super();
      if (typeof r.pipe === "function") this.source = r;
      else
        throw Error(
          `@smithy/util-stream: unsupported source type ${r?.constructor?.name ?? r} in ChecksumStream.`,
        );
      ((this.base64Encoder = n ?? De.toBase64),
        (this.expectedChecksum = e),
        (this.checksum = t),
        (this.checksumSourceLocation = s),
        this.source.pipe(this));
    }
    _read(e) {}
    _write(e, t, r) {
      try {
        (this.checksum.update(e), this.push(e));
      } catch (error) {
        return r(error);
      }
      return r();
    }
    async _final(e) {
      try {
        let digest = await this.checksum.digest(),
          base64Encoder = this.base64Encoder(digest);
        if (this.expectedChecksum !== base64Encoder)
          return e(
            Error(
              `Checksum mismatch: expected "${this.expectedChecksum}" but received "${base64Encoder}" in response header "${this.checksumSourceLocation}".`,
            ),
          );
      } catch (error) {
        return e(error);
      }
      return (this.push(null), e());
    }
  }
  Ue.ChecksumStream = je;
});

export { me };
