/**
 * @mixmark-io/domino/lib/Text.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ee } from "./utils.js";
import { xe } from "./Node.js";
import { lr } from "./CharacterData.js";

//@ chunk-vwj6ccer.js:63701-64873 cjs-fingerprint
var Sn = x(function (Nd, Ws) {
  Ws.exports = wn;
  var js = ee(),
    Gs = xe(),
    zs = lr();
  function wn(e, t) {
    (zs.call(this),
      (this.nodeType = Gs.TEXT_NODE),
      (this.ownerDocument = e),
      (this._data = t),
      (this._index = void 0));
  }
  var xr = {
    get: function () {
      return this._data;
    },
    set: function (e) {
      if (e === null || e === void 0) e = "";
      else e = String(e);
      if (e === this._data) return;
      if (((this._data = e), this.rooted)) this.ownerDocument.mutateValue(this);
      if (this.parentNode && this.parentNode._textchangehook) this.parentNode._textchangehook(this);
    },
  };
  wn.prototype = Object.create(zs.prototype, {
    nodeName: { value: "#text" },
    nodeValue: xr,
    textContent: xr,
    innerText: xr,
    data: {
      get: xr.get,
      set: function (e) {
        xr.set.call(this, e === null ? "" : String(e));
      },
    },
    splitText: {
      value: function (t) {
        if (t > this._data.length || t < 0) js.IndexSizeError();
        var substring = this._data.substring(t),
          textNode = this.ownerDocument.createTextNode(substring);
        this.data = this.data.substring(0, t);
        var parentNode = this.parentNode;
        if (parentNode !== null) parentNode.insertBefore(textNode, this.nextSibling);
        return textNode;
      },
    },
    wholeText: {
      get: function () {
        var textContent = this.textContent;
        for (var nextSibling = this.nextSibling; nextSibling; nextSibling = nextSibling.nextSibling) {
          if (nextSibling.nodeType !== Gs.TEXT_NODE) break;
          textContent += nextSibling.textContent;
        }
        return textContent;
      },
    },
    replaceWholeText: { value: js.nyi },
    clone: {
      value: function () {
        return new wn(this.ownerDocument, this._data);
      },
    },
  });
});

export { Sn };
