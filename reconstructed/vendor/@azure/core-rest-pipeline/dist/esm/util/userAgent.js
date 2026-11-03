/**
 * @azure/core-rest-pipeline/dist/esm/util/userAgent.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Kl, Vl } from "./userAgentPlatform.js";
import { jo } from "../constants.js";

//@ chunk-mrx6y2r5.js:55486-55579 esm-layout
function _p(e) {
  let t = [];
  for (let [r, n] of e) {
    let o = n ? `${r}/${n}` : r;
    t.push(o);
  }
  return t.join(" ");
}
//@ chunk-mrx6y2r5.js:55579-55605 esm-layout
function Yl() {
  return Kl();
}
//@ chunk-mrx6y2r5.js:55605-55718 esm-fingerprint
async function Yo(e) {
  let t = new Map();
  (t.set("core-rest-pipeline", jo), await Vl(t));
  let r = _p(t);
  return e ? `${e} ${r}` : r;
}

export { Yl, Yo };
