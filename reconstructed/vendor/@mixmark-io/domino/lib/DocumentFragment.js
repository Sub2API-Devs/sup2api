/**
 * @mixmark-io/domino/lib/DocumentFragment.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { yt } from "./NodeList.js";
import { Qr } from "./ContainerNode.js";
import { Ft } from "./Element.js";
import { ta } from "./select.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:65458-66492 cjs-fingerprint
var kn = x(function (Sd, $s) {
  $s.exports = Dn;
  var ix = xe(),
    sx = yt(),
    Qs = Qr(),
    sa = Ft(),
    cx = ta(),
    Ys = ee();
  function Dn(e) {
    (Qs.call(this), (this.nodeType = ix.DOCUMENT_FRAGMENT_NODE), (this.ownerDocument = e));
  }
  Dn.prototype = Object.create(Qs.prototype, {
    nodeName: { value: "#document-fragment" },
    nodeValue: {
      get: function () {
        return null;
      },
      set: function () {},
    },
    textContent: Object.getOwnPropertyDescriptor(sa.prototype, "textContent"),
    innerText: Object.getOwnPropertyDescriptor(sa.prototype, "innerText"),
    querySelector: {
      value: function (e) {
        var querySelectorAll = this.querySelectorAll(e);
        return querySelectorAll.length ? querySelectorAll[0] : null;
      },
    },
    querySelectorAll: {
      value: function (e) {
        var create = Object.create(this);
        ((create.isHTML = !0),
          (create.getElementsByTagName = sa.prototype.getElementsByTagName),
          (create.nextElement = Object.getOwnPropertyDescriptor(sa.prototype, "firstElementChild").get));
        var r = cx(e, create);
        return r.item ? r : new sx(r);
      },
    },
    clone: {
      value: function () {
        return new Dn(this.ownerDocument);
      },
    },
    isEqual: {
      value: function (t) {
        return !0;
      },
    },
    innerHTML: {
      get: function () {
        return this.serialize();
      },
      set: Ys.nyi,
    },
    outerHTML: {
      get: function () {
        return this.serialize();
      },
      set: Ys.nyi,
    },
  });
});

export { kn };
