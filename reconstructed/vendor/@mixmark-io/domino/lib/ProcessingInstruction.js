/**
 * @mixmark-io/domino/lib/ProcessingInstruction.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { lr } from "./CharacterData.js";

//@ chunk-vwj6ccer.js:66492-67219 cjs-fingerprint
var Mn = x(function (Ad, Js) {
  Js.exports = Ln;
  var ox = xe(),
    Zs = lr();
  function Ln(e, t, r) {
    (Zs.call(this),
      (this.nodeType = ox.PROCESSING_INSTRUCTION_NODE),
      (this.ownerDocument = e),
      (this.target = t),
      (this._data = r));
  }
  var dr = {
    get: function () {
      return this._data;
    },
    set: function (e) {
      if (e === null || e === void 0) e = "";
      else e = String(e);
      if (((this._data = e), this.rooted)) this.ownerDocument.mutateValue(this);
    },
  };
  Ln.prototype = Object.create(Zs.prototype, {
    nodeName: {
      get: function () {
        return this.target;
      },
    },
    nodeValue: dr,
    textContent: dr,
    innerText: dr,
    data: {
      get: dr.get,
      set: function (e) {
        dr.set.call(this, e === null ? "" : String(e));
      },
    },
    clone: {
      value: function () {
        return new Ln(this.ownerDocument, this.target, this._data);
      },
    },
    isEqual: {
      value: function (t) {
        return this.target === t.target && this._data === t._data;
      },
    },
  });
});

export { Mn };
