/**
 * lodash-es/_createAssigner.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */
import { fd, hio } from "../../src/utils/settings/settingsSourceTrust.js";

//@ chunk-dcmhvw5a.js:143711-143963 placement
function createAssigner(e) {
  return fd(function (n, r) {
    var s = -1,
      a = r.length,
      c = a > 1 ? r[a - 1] : void 0,
      g = a > 2 ? r[2] : void 0;
    if (((c = e.length > 3 && typeof c == "function" ? (a--, c) : void 0), g && hio(r[0], r[1], g)))
      ((c = a < 3 ? void 0 : c), (a = 1));
    n = Object(n);
    while (++s < a) {
      var m = r[s];
      if (m) e(n, m, s, c);
    }
    return n;
  });
}

export { createAssigner };
