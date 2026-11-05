/**
 * @mixmark-io/domino/lib/CharacterData.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Leaf } from "./Leaf.js";
import { require_utils } from "./utils.js";
import { require_ChildNode } from "./ChildNode.js";
import { require_NonDocumentTypeChildNode } from "./NonDocumentTypeChildNode.js";

//@ chunk-w04z664w.js:62721-63701 cjs-fingerprint
var require_CharacterData = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = CharacterData;
  var Leaf = require_Leaf();
  var utils = require_utils();
  var ChildNode = require_ChildNode();
  var NonDocumentTypeChildNode = require_NonDocumentTypeChildNode();
  function CharacterData() {
    Leaf.call(this);
  }
  CharacterData.prototype = Object.create(Leaf.prototype, {
    substringData: {
      value: function (offset, count) {
        if (arguments.length < 2) throw TypeError("Not enough arguments");
        offset = offset >>> 0;
        count = count >>> 0;
        if (offset > this.data.length || offset < 0 || count < 0) utils.IndexSizeError();
        return this.data.substring(offset, offset + count);
      },
    },
    appendData: {
      value: function (data) {
        if (arguments.length < 1) throw TypeError("Not enough arguments");
        this.data += String(data);
      },
    },
    insertData: {
      value: function (offset, data) {
        return this.replaceData(offset, 0, data);
      },
    },
    deleteData: {
      value: function (offset, count) {
        return this.replaceData(offset, count, "");
      },
    },
    replaceData: {
      value: function (offset, count, data) {
        var curtext = this.data;
        var len = curtext.length;
        offset = offset >>> 0;
        count = count >>> 0;
        data = String(data);
        if (offset > len || offset < 0) utils.IndexSizeError();
        if (offset + count > len) count = len - offset;
        var prefix = curtext.substring(0, offset);
        var suffix = curtext.substring(offset + count);
        this.data = prefix + data + suffix;
      },
    },
    isEqual: {
      value: function (n) {
        return this._data === n._data;
      },
    },
    length: {
      get: function () {
        return this.data.length;
      },
    },
  });
  Object.defineProperties(CharacterData.prototype, ChildNode);
  Object.defineProperties(CharacterData.prototype, NonDocumentTypeChildNode);
});
export { require_CharacterData };
