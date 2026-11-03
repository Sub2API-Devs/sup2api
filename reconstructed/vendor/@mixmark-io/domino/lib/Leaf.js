/**
 * @mixmark-io/domino/lib/Leaf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { yt } from "./NodeList.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:62055-62721 cjs-fingerprint
var Nn = x(function (Td, Bs) {
  Bs.exports = Fs;
  var qs = xe(),
    ex = yt(),
    Hs = ee(),
    { HierarchyRequestError: HierarchyRequestError, NotFoundError: NotFoundError } = Hs;
  function Fs() {
    qs.call(this);
  }
  Fs.prototype = Object.create(qs.prototype, {
    hasChildNodes: {
      value: function () {
        return !1;
      },
    },
    firstChild: { value: null },
    lastChild: { value: null },
    insertBefore: {
      value: function (e, t) {
        if (!e.nodeType) throw TypeError("not a node");
        HierarchyRequestError();
      },
    },
    replaceChild: {
      value: function (e, t) {
        if (!e.nodeType) throw TypeError("not a node");
        HierarchyRequestError();
      },
    },
    removeChild: {
      value: function (e) {
        if (!e.nodeType) throw TypeError("not a node");
        NotFoundError();
      },
    },
    removeChildren: { value: function () {} },
    childNodes: {
      get: function () {
        if (!this._childNodes) this._childNodes = new ex();
        return this._childNodes;
      },
    },
  });
});

export { Nn };
