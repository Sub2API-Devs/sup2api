/**
 * @mixmark-io/domino/lib/ContainerNode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_NodeList } from "./NodeList.js";

//@ chunk-vwj6ccer.js:23770-24885 cjs-fingerprint
var require_ContainerNode = x(function (cjsExports, cjsModule) {
  cjsModule.exports = ContainerNode;
  var Node = require_Node();
  var NodeList = require_NodeList();
  function ContainerNode() {
    Node.call(this);
    this._firstChild = this._childNodes = null;
  }
  ContainerNode.prototype = Object.create(Node.prototype, {
    hasChildNodes: {
      value: function () {
        if (this._childNodes) return this._childNodes.length > 0;
        return this._firstChild !== null;
      },
    },
    childNodes: {
      get: function () {
        this._ensureChildNodes();
        return this._childNodes;
      },
    },
    firstChild: {
      get: function () {
        if (this._childNodes) return this._childNodes.length === 0 ? null : this._childNodes[0];
        return this._firstChild;
      },
    },
    lastChild: {
      get: function () {
        var kids = this._childNodes;
        var first;
        if (kids) return kids.length === 0 ? null : kids[kids.length - 1];
        first = this._firstChild;
        if (first === null) return null;
        return first._previousSibling;
      },
    },
    _ensureChildNodes: {
      value: function () {
        if (this._childNodes) return;
        var first = this._firstChild;
        var kid = first;
        var childNodes = (this._childNodes = new NodeList());
        if (first)
          do {
            childNodes.push(kid);
            kid = kid._nextSibling;
          } while (kid !== first);
        this._firstChild = null;
      },
    },
    removeChildren: {
      value: function () {
        var root = this.rooted ? this.ownerDocument : null;
        var next = this.firstChild;
        var kid;
        while (next !== null) {
          kid = next;
          next = kid.nextSibling;
          if (root) root.mutateRemove(kid);
          kid.parentNode = null;
        }
        if (this._childNodes) this._childNodes.length = 0;
        else this._firstChild = null;
        this.modify();
      },
    },
  });
});
export { require_ContainerNode };
