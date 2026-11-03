/**
 * @mixmark-io/domino/lib/DocumentType.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_Leaf } from "./Leaf.js";
import { require_ChildNode } from "./ChildNode.js";

//@ chunk-vwj6ccer.js:120094-120707 cjs-fingerprint
var require_DocumentType = x(function (cjsExports, cjsModule) {
  cjsModule.exports = DocumentType;
  var Node = require_Node();
  var Leaf = require_Leaf();
  var ChildNode = require_ChildNode();
  function DocumentType(ownerDocument, name, publicId, systemId) {
    Leaf.call(this);
    this.nodeType = Node.DOCUMENT_TYPE_NODE;
    this.ownerDocument = ownerDocument || null;
    this.name = name;
    this.publicId = publicId || "";
    this.systemId = systemId || "";
  }
  DocumentType.prototype = Object.create(Leaf.prototype, {
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
        return new DocumentType(this.ownerDocument, this.name, this.publicId, this.systemId);
      },
    },
    isEqual: {
      value: function (n) {
        return this.name === n.name && this.publicId === n.publicId && this.systemId === n.systemId;
      },
    },
  });
  Object.defineProperties(DocumentType.prototype, ChildNode);
});
export { require_DocumentType };
