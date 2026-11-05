/**
 * @aws-sdk/xml-builder/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/xml-builder@3.921.0..3.972.5
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_xml_parser } from "./xml-parser.js";

//@ chunk-3p78mpxm.js:74087-75638 cjs-fingerprint
var require_xml_builder = __commonJS(function (cjsExports) {
  var xmlParser = require_xml_parser();
  function escapeAttribute(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeElement(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r/g, "&#x0D;")
      .replace(/\n/g, "&#x0A;")
      .replace(/\u0085/g, "&#x85;")
      .replace(/\u2028/, "&#x2028;");
  }
  class XmlText {
    value;
    constructor(value) {
      this.value = value;
    }
    toString() {
      return escapeElement("" + this.value);
    }
  }
  class XmlNode {
    name;
    children;
    attributes = {};
    static of(name, childText, withName) {
      let node = new XmlNode(name);
      if (childText !== undefined) node.addChildNode(new XmlText(childText));
      if (withName !== undefined) node.withName(withName);
      return node;
    }
    constructor(name, children = []) {
      this.name = name;
      this.children = children;
    }
    withName(name) {
      this.name = name;
      return this;
    }
    addAttribute(name, value) {
      this.attributes[name] = value;
      return this;
    }
    addChildNode(child) {
      this.children.push(child);
      return this;
    }
    removeAttribute(name) {
      delete this.attributes[name];
      return this;
    }
    n(name) {
      this.name = name;
      return this;
    }
    c(child) {
      this.children.push(child);
      return this;
    }
    a(name, value) {
      if (value != null) this.attributes[name] = value;
      return this;
    }
    cc(input, field, withName = field) {
      if (input[field] != null) {
        let node = XmlNode.of(field, input[field]).withName(withName);
        this.c(node);
      }
    }
    l(input, listName, memberName, value) {
      if (input[listName] != null)
        value().map((node) => {
          node.withName(memberName);
          this.c(node);
        });
    }
    lc(input, listName, memberName, valueProvider) {
      if (input[listName] != null) {
        let nodes = valueProvider();
        let containerNode = new XmlNode(memberName);
        nodes.map((node) => {
          containerNode.c(node);
        });
        this.c(containerNode);
      }
    }
    toString() {
      let hasChildren = Boolean(this.children.length);
      let xmlText = `<${this.name}`;
      let attributes = this.attributes;
      for (let attributeName of Object.keys(attributes)) {
        let attribute = attributes[attributeName];
        if (attribute != null) xmlText += ` ${attributeName}="${escapeAttribute("" + attribute)}"`;
      }
      return (xmlText += !hasChildren
        ? "/>"
        : `>${this.children.map((c) => c.toString()).join("")}</${this.name}>`);
    }
  }
  Object.defineProperty(cjsExports, "parseXML", {
    enumerable: true,
    get: function () {
      return xmlParser.parseXML;
    },
  });
  cjsExports.XmlNode = XmlNode;
  cjsExports.XmlText = XmlText;
});
export { require_xml_builder };
