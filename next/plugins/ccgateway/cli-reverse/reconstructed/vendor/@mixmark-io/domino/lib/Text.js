/**
 * @mixmark-io/domino/lib/Text.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";
import { require_Node } from "./Node.js";
import { require_CharacterData } from "./CharacterData.js";

//@ chunk-w04z664w.js:63701-64873 cjs-fingerprint
var require_Text = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Text;
  var utils = require_utils();
  var Node = require_Node();
  var CharacterData = require_CharacterData();
  function Text(doc, data) {
    CharacterData.call(this);
    this.nodeType = Node.TEXT_NODE;
    this.ownerDocument = doc;
    this._data = data;
    this._index = undefined;
  }
  var nodeValue = {
    get: function () {
      return this._data;
    },
    set: function (v) {
      if (v === null || v === undefined) v = "";
      else v = String(v);
      if (v === this._data) return;
      this._data = v;
      if (this.rooted) this.ownerDocument.mutateValue(this);
      if (this.parentNode && this.parentNode._textchangehook) this.parentNode._textchangehook(this);
    },
  };
  Text.prototype = Object.create(CharacterData.prototype, {
    nodeName: {
      value: "#text",
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
    splitText: {
      value: function (offset) {
        if (offset > this._data.length || offset < 0) utils.IndexSizeError();
        var newdata = this._data.substring(offset);
        var newnode = this.ownerDocument.createTextNode(newdata);
        this.data = this.data.substring(0, offset);
        var parent = this.parentNode;
        if (parent !== null) parent.insertBefore(newnode, this.nextSibling);
        return newnode;
      },
    },
    wholeText: {
      get: function () {
        var result = this.textContent;
        for (var next = this.nextSibling; next; next = next.nextSibling) {
          if (next.nodeType !== Node.TEXT_NODE) break;
          result += next.textContent;
        }
        return result;
      },
    },
    replaceWholeText: {
      value: utils.nyi,
    },
    clone: {
      value: function () {
        return new Text(this.ownerDocument, this._data);
      },
    },
  });
});
export { require_Text };
