/**
 * @smithy/shared-ini-file-loader/dist-cjs/getHomeDir.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-a1ttyqdw.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-a1ttyqdw.js:266-666 cjs-fingerprint
var m = x(function (D) {
  Object.defineProperty(D, "__esModule", { value: !0 });
  D.getHomeDir = void 0;
  var b = importMetaRequire("os"),
    v = importMetaRequire("path"),
    h = {},
    Q = () => {
      if (process && process.geteuid) return `${process.geteuid()}`;
      return "DEFAULT";
    },
    Y = () => {
      let {
        HOME: HOME,
        USERPROFILE: USERPROFILE,
        HOMEPATH: HOMEPATH,
        HOMEDRIVE: HOMEDRIVE = `C:${v.sep}`,
      } = process.env;
      if (HOME) return HOME;
      if (USERPROFILE) return USERPROFILE;
      if (HOMEPATH) return `${HOMEDRIVE}${HOMEPATH}`;
      let n = Q();
      if (!h[n]) h[n] = b.homedir();
      return h[n];
    };
  D.getHomeDir = Y;
});

export { m };
