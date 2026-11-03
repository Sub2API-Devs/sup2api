/**
 * @mixmark-io/domino/lib/MouseEvent.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { za } from "./UIEvent.js";

//@ chunk-vwj6ccer.js:1526-2402 cjs-fingerprint
var Xa = x(function (rd, Oi) {
  var Ii = za();
  Oi.exports = Wa;
  function Wa() {
    (Ii.call(this),
      (this.screenX = this.screenY = this.clientX = this.clientY = 0),
      (this.ctrlKey = this.altKey = this.shiftKey = this.metaKey = !1),
      (this.button = 0),
      (this.buttons = 1),
      (this.relatedTarget = null));
  }
  Wa.prototype = Object.create(Ii.prototype, {
    constructor: { value: Wa },
    initMouseEvent: {
      value: function (e, t, r, a, s, c, d, g, m, v, T, ne, se, l, be) {
        switch (
          (this.initEvent(e, t, r, a, s),
          (this.screenX = c),
          (this.screenY = d),
          (this.clientX = g),
          (this.clientY = m),
          (this.ctrlKey = v),
          (this.altKey = T),
          (this.shiftKey = ne),
          (this.metaKey = se),
          (this.button = l),
          l)
        ) {
          case 0:
            this.buttons = 1;
            break;
          case 1:
            this.buttons = 4;
            break;
          case 2:
            this.buttons = 2;
            break;
          default:
            this.buttons = 0;
            break;
        }
        this.relatedTarget = be;
      },
    },
    getModifierState: {
      value: function (e) {
        switch (e) {
          case "Alt":
            return this.altKey;
          case "Control":
            return this.ctrlKey;
          case "Shift":
            return this.shiftKey;
          case "Meta":
            return this.metaKey;
          default:
            return !1;
        }
      },
    },
  });
});

export { Xa };
