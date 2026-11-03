/**
 * @mixmark-io/domino/lib/DocumentType.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { Nn } from "./Leaf.js";
import { ra } from "./ChildNode.js";

//@ chunk-vwj6ccer.js:120094-120707 cjs-fingerprint
var ha = x(function (Xd, J0) {
  J0.exports = da;
  var zx = xe(),
    Z0 = Nn(),
    Wx = ra();
  function da(e, t, r, a) {
    (Z0.call(this),
      (this.nodeType = zx.DOCUMENT_TYPE_NODE),
      (this.ownerDocument = e || null),
      (this.name = t),
      (this.publicId = r || ""),
      (this.systemId = a || ""));
  }
  da.prototype = Object.create(Z0.prototype, {
    nodeName: {
      get: function () {
        return this.name;
      },
    },
    nodeValue: {
      get: function () {
        return null;
      },
      set: function () {},
    },
    clone: {
      value: function () {
        return new da(this.ownerDocument, this.name, this.publicId, this.systemId);
      },
    },
    isEqual: {
      value: function (t) {
        return this.name === t.name && this.publicId === t.publicId && this.systemId === t.systemId;
      },
    },
  });
  Object.defineProperties(da.prototype, Wx);
});

export { ha };
