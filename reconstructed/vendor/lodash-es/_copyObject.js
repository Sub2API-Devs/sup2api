/**
 * lodash-es/_copyObject.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */
import { Ohe, Dut } from "../../src/utils/git/gitSafeEnv.js";

/**
 * lodash copyObject
 */
//@ chunk-dcmhvw5a.js:3654-3830 placement
function copyObject(e, n, r, s) {
  var a = !r;
  r || (r = {});
  var c = -1,
    g = n.length;
  while (++c < g) {
    var m = n[c],
      f = s ? s(r[m], e[m], m, r, e) : void 0;
    if (f === void 0) f = e[m];
    if (a) Ohe(r, m, f);
    else Dut(r, m, f);
  }
  return r;
}

export { copyObject };
