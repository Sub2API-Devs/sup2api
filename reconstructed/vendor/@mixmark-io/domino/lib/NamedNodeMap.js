/**
 * @mixmark-io/domino/lib/NamedNodeMap.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:44606-45299 cjs-fingerprint
var gn = x(function (_d, Ds) {
  Ds.exports = Cs;
  var qt = ee();
  function Cs(e) {
    this.element = e;
  }
  Object.defineProperties(Cs.prototype, {
    length: { get: qt.shouldOverride },
    item: { value: qt.shouldOverride },
    getNamedItem: {
      value: function (t) {
        return this.element.getAttributeNode(t);
      },
    },
    getNamedItemNS: {
      value: function (t, r) {
        return this.element.getAttributeNodeNS(t, r);
      },
    },
    setNamedItem: { value: qt.nyi },
    setNamedItemNS: { value: qt.nyi },
    removeNamedItem: {
      value: function (t) {
        var attributeNode = this.element.getAttributeNode(t);
        if (attributeNode) return (this.element.removeAttribute(t), attributeNode);
        qt.NotFoundError();
      },
    },
    removeNamedItemNS: {
      value: function (t, r) {
        var attributeNodeNS = this.element.getAttributeNodeNS(t, r);
        if (attributeNodeNS) return (this.element.removeAttributeNS(t, r), attributeNodeNS);
        qt.NotFoundError();
      },
    },
  });
});

export { gn };
