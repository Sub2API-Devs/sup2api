/**
 * @mixmark-io/domino/lib/UIEvent.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Lt } from "./Event.js";

//@ chunk-vwj6ccer.js:1261-1526 cjs-fingerprint
var za = x(function (td, Ri) {
  var Mi = Lt();
  Ri.exports = Ga;
  function Ga() {
    (Mi.call(this), (this.view = null), (this.detail = 0));
  }
  Ga.prototype = Object.create(Mi.prototype, {
    constructor: { value: Ga },
    initUIEvent: {
      value: function (e, t, r, a, s) {
        (this.initEvent(e, t, r), (this.view = a), (this.detail = s));
      },
    },
  });
});

export { za };
