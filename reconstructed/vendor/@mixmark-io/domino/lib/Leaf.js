/**
 * @mixmark-io/domino/lib/Leaf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_NodeList } from "./NodeList.js";
import { require_utils } from "./utils.js";

//@ chunk-vwj6ccer.js:62055-62721 cjs-fingerprint
var require_Leaf = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Leaf;
  var Node = require_Node();
  var NodeList = require_NodeList();
  var Hs = require_utils();
  var { HierarchyRequestError, NotFoundError } = Hs;
  function Leaf() {
    Node.call(this);
  }
  Leaf.prototype = Object.create(Node.prototype, {
    hasChildNodes: {
      value: function () {
        return false;
      },
    },
    firstChild: {
      value: null,
    },
    lastChild: {
      value: null,
    },
    insertBefore: {
      value: function (node, child) {
        if (!node.nodeType) throw TypeError("not a node");
        HierarchyRequestError();
      },
    },
    replaceChild: {
      value: function (node, child) {
        if (!node.nodeType) throw TypeError("not a node");
        HierarchyRequestError();
      },
    },
    removeChild: {
      value: function (node) {
        if (!node.nodeType) throw TypeError("not a node");
        NotFoundError();
      },
    },
    removeChildren: {
      value: function () {},
    },
    childNodes: {
      get: function () {
        if (!this._childNodes) this._childNodes = new NodeList();
        return this._childNodes;
      },
    },
  });
});
export { require_Leaf };
