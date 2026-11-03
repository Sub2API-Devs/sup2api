/**
 * parse5/dist/tree-adapters/default.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (1)
 * attribution: esm-fingerprint 1
 */
import { O } from "../../lib/common/html.js";

//@ chunk-6ja29j2n.js:123774-126135 esm-fingerprint
var L = {
  createDocument() {
    return { nodeName: "#document", mode: O.NO_QUIRKS, childNodes: [] };
  },
  createDocumentFragment() {
    return { nodeName: "#document-fragment", childNodes: [] };
  },
  createElement(e, t, a) {
    return { nodeName: e, tagName: e, attrs: a, namespaceURI: t, childNodes: [], parentNode: null };
  },
  createCommentNode(e) {
    return { nodeName: "#comment", data: e, parentNode: null };
  },
  createTextNode(e) {
    return { nodeName: "#text", value: e, parentNode: null };
  },
  appendChild(e, t) {
    (e.childNodes.push(t), (t.parentNode = e));
  },
  insertBefore(e, t, a) {
    let index = e.childNodes.indexOf(a);
    (e.childNodes.splice(index, 0, t), (t.parentNode = e));
  },
  setTemplateContent(e, t) {
    e.content = t;
  },
  getTemplateContent(e) {
    return e.content;
  },
  setDocumentType(e, t, a, n) {
    let found = e.childNodes.find((childNode) => childNode.nodeName === "#documentType");
    if (found) ((found.name = t), (found.publicId = a), (found.systemId = n));
    else {
      let h = { nodeName: "#documentType", name: t, publicId: a, systemId: n, parentNode: null };
      L.appendChild(e, h);
    }
  },
  setDocumentMode(e, t) {
    e.mode = t;
  },
  getDocumentMode(e) {
    return e.mode;
  },
  detachNode(e) {
    if (e.parentNode) {
      let index = e.parentNode.childNodes.indexOf(e);
      (e.parentNode.childNodes.splice(index, 1), (e.parentNode = null));
    }
  },
  insertText(e, t) {
    if (e.childNodes.length > 0) {
      let a = e.childNodes[e.childNodes.length - 1];
      if (L.isTextNode(a)) {
        a.value += t;
        return;
      }
    }
    L.appendChild(e, L.createTextNode(t));
  },
  insertTextBefore(e, t, a) {
    let n = e.childNodes[e.childNodes.indexOf(a) - 1];
    if (n && L.isTextNode(n)) n.value += t;
    else L.insertBefore(e, L.createTextNode(t), a);
  },
  adoptAttributes(e, t) {
    let a = new Set(e.attrs.map((attr) => attr.name));
    for (let n = 0; n < t.length; n++) if (!a.has(t[n].name)) e.attrs.push(t[n]);
  },
  getFirstChild(e) {
    return e.childNodes[0];
  },
  getChildNodes(e) {
    return e.childNodes;
  },
  getParentNode(e) {
    return e.parentNode;
  },
  getAttrList(e) {
    return e.attrs;
  },
  getTagName(e) {
    return e.tagName;
  },
  getNamespaceURI(e) {
    return e.namespaceURI;
  },
  getTextNodeContent(e) {
    return e.value;
  },
  getCommentNodeContent(e) {
    return e.data;
  },
  getDocumentTypeNodeName(e) {
    return e.name;
  },
  getDocumentTypeNodePublicId(e) {
    return e.publicId;
  },
  getDocumentTypeNodeSystemId(e) {
    return e.systemId;
  },
  isTextNode(e) {
    return e.nodeName === "#text";
  },
  isCommentNode(e) {
    return e.nodeName === "#comment";
  },
  isDocumentTypeNode(e) {
    return e.nodeName === "#documentType";
  },
  isElementNode(e) {
    return Object.prototype.hasOwnProperty.call(e, "tagName");
  },
  setNodeSourceCodeLocation(e, t) {
    e.sourceCodeLocation = t;
  },
  getNodeSourceCodeLocation(e) {
    return e.sourceCodeLocation;
  },
  updateNodeSourceCodeLocation(e, t) {
    e.sourceCodeLocation = { ...e.sourceCodeLocation, ...t };
  },
};

export { L };
