/**
 * @mixmark-io/domino/lib/Comment.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_CharacterData } from "./CharacterData.js";

//@ chunk-vwj6ccer.js:64873-65458 cjs-fingerprint
var require_Comment = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Comment;
  var Node = require_Node();
  var CharacterData = require_CharacterData();
  function Comment(doc, data) {
    CharacterData.call(this);
    this.nodeType = Node.COMMENT_NODE;
    this.ownerDocument = doc;
    this._data = data;
  }
  var nodeValue = {
    get: function () {
      return this._data;
    },
    set: function (v) {
      if (v === null || v === undefined) v = "";
      else v = String(v);
      this._data = v;
      if (this.rooted) this.ownerDocument.mutateValue(this);
    },
  };
  Comment.prototype = Object.create(CharacterData.prototype, {
    nodeName: {
      value: "#comment",
    },
    nodeValue,
    textContent: nodeValue,
    innerText: nodeValue,
    data: {
      get: nodeValue.get,
      set: function (v) {
        nodeValue.set.call(this, v === null ? "" : String(v));
      },
    },
    clone: {
      value: function () {
        return new Comment(this.ownerDocument, this._data);
      },
    },
  });
});
export { require_Comment };
