/**
 * @smithy/shared-ini-file-loader/dist-cjs/getSSOTokenFilepath.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-a1ttyqdw.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { m } from "./getHomeDir.js";

//@ chunk-a1ttyqdw.js:666-951 cjs-fingerprint
var _ = x(function (R) {
  Object.defineProperty(R, "__esModule", { value: !0 });
  R.getSSOTokenFilepath = void 0;
  var y = importMetaRequire("crypto"),
    C = importMetaRequire("path"),
    H = m(),
    Z = (e) => {
      let digest = y.createHash("sha1").update(e).digest("hex");
      return C.join(H.getHomeDir(), ".aws", "sso", "cache", `${digest}.json`);
    };
  R.getSSOTokenFilepath = Z;
});

export { _ };
