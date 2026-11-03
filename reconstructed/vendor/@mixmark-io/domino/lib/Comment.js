/**
 * @mixmark-io/domino/lib/Comment.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { lr } from "./CharacterData.js";

//@ chunk-vwj6ccer.js:64873-65458 cjs-fingerprint
var Cn = x(function (wd, Ks) {
  Ks.exports = An;
  var nx = xe(),
    Xs = lr();
  function An(e, t) {
    (Xs.call(this), (this.nodeType = nx.COMMENT_NODE), (this.ownerDocument = e), (this._data = t));
  }
  var fr = {
    get: function () {
      return this._data;
    },
    set: function (e) {
      if (e === null || e === void 0) e = "";
      else e = String(e);
      if (((this._data = e), this.rooted)) this.ownerDocument.mutateValue(this);
    },
  };
  An.prototype = Object.create(Xs.prototype, {
    nodeName: { value: "#comment" },
    nodeValue: fr,
    textContent: fr,
    innerText: fr,
    data: {
      get: fr.get,
      set: function (e) {
        fr.set.call(this, e === null ? "" : String(e));
      },
    },
    clone: {
      value: function () {
        return new An(this.ownerDocument, this._data);
      },
    },
  });
});

export { Cn };
