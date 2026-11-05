/**
 * @mixmark-io/domino/lib/NamedNodeMap.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";

//@ chunk-w04z664w.js:44606-45299 cjs-fingerprint
var require_NamedNodeMap = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = NamedNodeMap;
  var utils = require_utils();
  function NamedNodeMap(element) {
    this.element = element;
  }
  Object.defineProperties(NamedNodeMap.prototype, {
    length: {
      get: utils.shouldOverride,
    },
    item: {
      value: utils.shouldOverride,
    },
    getNamedItem: {
      value: function (qualifiedName) {
        return this.element.getAttributeNode(qualifiedName);
      },
    },
    getNamedItemNS: {
      value: function (namespace, localName) {
        return this.element.getAttributeNodeNS(namespace, localName);
      },
    },
    setNamedItem: {
      value: utils.nyi,
    },
    setNamedItemNS: {
      value: utils.nyi,
    },
    removeNamedItem: {
      value: function (qualifiedName) {
        var attr = this.element.getAttributeNode(qualifiedName);
        if (attr) {
          this.element.removeAttribute(qualifiedName);
          return attr;
        }
        utils.NotFoundError();
      },
    },
    removeNamedItemNS: {
      value: function (ns, lname) {
        var attr = this.element.getAttributeNodeNS(ns, lname);
        if (attr) {
          this.element.removeAttributeNS(ns, lname);
          return attr;
        }
        utils.NotFoundError();
      },
    },
  });
});
export { require_NamedNodeMap };
