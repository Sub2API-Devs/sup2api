/**
 * @mixmark-io/domino/lib/ProcessingInstruction.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_CharacterData } from "./CharacterData.js";

//@ chunk-vwj6ccer.js:66492-67219 cjs-fingerprint
var require_ProcessingInstruction = x(function (cjsExports, cjsModule) {
  cjsModule.exports = ProcessingInstruction;
  var Node = require_Node();
  var CharacterData = require_CharacterData();
  function ProcessingInstruction(doc, target, data) {
    CharacterData.call(this);
    this.nodeType = Node.PROCESSING_INSTRUCTION_NODE;
    this.ownerDocument = doc;
    this.target = target;
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
  ProcessingInstruction.prototype = Object.create(CharacterData.prototype, {
    nodeName: {
      get: function () {
        return this.target;
      },
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
        return new ProcessingInstruction(this.ownerDocument, this.target, this._data);
      },
    },
    isEqual: {
      value: function (n) {
        return this.target === n.target && this._data === n._data;
      },
    },
  });
});
export { require_ProcessingInstruction };
