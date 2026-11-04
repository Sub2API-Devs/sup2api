/**
 * @mixmark-io/domino/lib/DOMImplementation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Document } from "./Document.js";
import { require_DocumentType } from "./DocumentType.js";
import { require_HTMLParser } from "./HTMLParser.js";
import { require_utils } from "./utils.js";
import { require_xmlnames } from "./xmlnames.js";

//@ chunk-vwj6ccer.js:233747-234995 cjs-fingerprint
var require_DOMImplementation = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = DOMImplementation;
  var Document = require_Document();
  var DocumentType = require_DocumentType();
  var HTMLParser = require_HTMLParser();
  var utils = require_utils();
  var xml = require_xmlnames();
  function DOMImplementation(contextObject) {
    this.contextObject = contextObject;
  }
  var supportedFeatures = {
    xml: {
      "": true,
      "1.0": true,
      "2.0": true,
    },
    core: {
      "": true,
      "2.0": true,
    },
    html: {
      "": true,
      "1.0": true,
      "2.0": true,
    },
    xhtml: {
      "": true,
      "1.0": true,
      "2.0": true,
    },
  };
  DOMImplementation.prototype = {
    hasFeature: function (feature, version) {
      var f = supportedFeatures[(feature || "").toLowerCase()];
      return (f && f[version || ""]) || false;
    },
    createDocumentType: function (qualifiedName, publicId, systemId) {
      if (!xml.isValidQName(qualifiedName)) utils.InvalidCharacterError();
      return new DocumentType(this.contextObject, qualifiedName, publicId, systemId);
    },
    createDocument: function (namespace, qualifiedName, doctype) {
      var d = new Document(false, null);
      var e;
      if (qualifiedName) e = d.createElementNS(namespace, qualifiedName);
      else e = null;
      if (doctype) d.appendChild(doctype);
      if (e) d.appendChild(e);
      if (namespace === utils.NAMESPACE.HTML) d._contentType = "application/xhtml+xml";
      else if (namespace === utils.NAMESPACE.SVG) d._contentType = "image/svg+xml";
      else d._contentType = "application/xml";
      return d;
    },
    createHTMLDocument: function (titleText) {
      var d = new Document(true, null);
      d.appendChild(new DocumentType(d, "html"));
      var html = d.createElement("html");
      d.appendChild(html);
      var head = d.createElement("head");
      html.appendChild(head);
      if (titleText !== undefined) {
        var title = d.createElement("title");
        head.appendChild(title);
        title.appendChild(d.createTextNode(titleText));
      }
      html.appendChild(d.createElement("body"));
      d.modclock = 1;
      return d;
    },
    mozSetOutputMutationHandler: function (doc, handler) {
      doc.mutationHandler = handler;
    },
    mozGetInputMutationHandler: function (doc) {
      utils.nyi();
    },
    mozHTMLParser: HTMLParser,
  };
});
export { require_DOMImplementation };
