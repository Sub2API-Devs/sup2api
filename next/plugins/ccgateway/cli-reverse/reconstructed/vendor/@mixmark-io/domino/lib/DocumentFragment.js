/**
 * @mixmark-io/domino/lib/DocumentFragment.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_NodeList } from "./NodeList.js";
import { require_ContainerNode } from "./ContainerNode.js";
import { require_Element } from "./Element.js";
import { require_select } from "./select.js";
import { require_utils } from "./utils.js";

//@ chunk-w04z664w.js:65458-66492 cjs-fingerprint
var require_DocumentFragment = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = DocumentFragment;
  var Node = require_Node();
  var NodeList = require_NodeList();
  var ContainerNode = require_ContainerNode();
  var Element = require_Element();
  var select = require_select();
  var utils = require_utils();
  function DocumentFragment(doc) {
    ContainerNode.call(this);
    this.nodeType = Node.DOCUMENT_FRAGMENT_NODE;
    this.ownerDocument = doc;
  }
  DocumentFragment.prototype = Object.create(ContainerNode.prototype, {
    nodeName: {
      value: "#document-fragment",
    },
    nodeValue: {
      get: function () {
        return null;
      },
      set: function () {},
    },
    textContent: Object.getOwnPropertyDescriptor(Element.prototype, "textContent"),
    innerText: Object.getOwnPropertyDescriptor(Element.prototype, "innerText"),
    querySelector: {
      value: function (selector) {
        var nodes = this.querySelectorAll(selector);
        return nodes.length ? nodes[0] : null;
      },
    },
    querySelectorAll: {
      value: function (selector) {
        var context = Object.create(this);
        context.isHTML = true;
        context.getElementsByTagName = Element.prototype.getElementsByTagName;
        context.nextElement = Object.getOwnPropertyDescriptor(Element.prototype, "firstElementChild").get;
        var nodes = select(selector, context);
        return nodes.item ? nodes : new NodeList(nodes);
      },
    },
    clone: {
      value: function () {
        return new DocumentFragment(this.ownerDocument);
      },
    },
    isEqual: {
      value: function (n) {
        return true;
      },
    },
    innerHTML: {
      get: function () {
        return this.serialize();
      },
      set: utils.nyi,
    },
    outerHTML: {
      get: function () {
        return this.serialize();
      },
      set: utils.nyi,
    },
  });
});
export { require_DocumentFragment };
