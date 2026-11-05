/**
 * parse5/dist/tree-adapters/default.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-p9ac6cnb.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DOCUMENT_MODE } from "../../lib/common/html.js";

//@ chunk-p9ac6cnb.js:123774-126135 esm-fingerprint
var defaultTreeAdapter = {
  createDocument() {
    return {
      nodeName: "#document",
      mode: DOCUMENT_MODE.NO_QUIRKS,
      childNodes: [],
    };
  },
  createDocumentFragment() {
    return {
      nodeName: "#document-fragment",
      childNodes: [],
    };
  },
  createElement(tagName, namespaceURI, attrs) {
    return {
      nodeName: tagName,
      tagName,
      attrs,
      namespaceURI,
      childNodes: [],
      parentNode: null,
    };
  },
  createCommentNode(data) {
    return {
      nodeName: "#comment",
      data,
      parentNode: null,
    };
  },
  createTextNode(value) {
    return {
      nodeName: "#text",
      value,
      parentNode: null,
    };
  },
  appendChild(parentNode, newNode) {
    parentNode.childNodes.push(newNode);
    newNode.parentNode = parentNode;
  },
  insertBefore(parentNode, newNode, referenceNode) {
    let insertionIdx = parentNode.childNodes.indexOf(referenceNode);
    parentNode.childNodes.splice(insertionIdx, 0, newNode);
    newNode.parentNode = parentNode;
  },
  setTemplateContent(templateElement, contentElement) {
    templateElement.content = contentElement;
  },
  getTemplateContent(templateElement) {
    return templateElement.content;
  },
  setDocumentType(documentNode, name, publicId, systemId) {
    let doctypeNode = documentNode.childNodes.find((node) => node.nodeName === "#documentType");
    if (doctypeNode) {
      doctypeNode.name = name;
      doctypeNode.publicId = publicId;
      doctypeNode.systemId = systemId;
    } else {
      let node = {
        nodeName: "#documentType",
        name,
        publicId,
        systemId,
        parentNode: null,
      };
      defaultTreeAdapter.appendChild(documentNode, node);
    }
  },
  setDocumentMode(documentNode, mode) {
    documentNode.mode = mode;
  },
  getDocumentMode(documentNode) {
    return documentNode.mode;
  },
  detachNode(node) {
    if (node.parentNode) {
      let idx = node.parentNode.childNodes.indexOf(node);
      node.parentNode.childNodes.splice(idx, 1);
      node.parentNode = null;
    }
  },
  insertText(parentNode, text) {
    if (parentNode.childNodes.length > 0) {
      let prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];
      if (defaultTreeAdapter.isTextNode(prevNode)) {
        prevNode.value += text;
        return;
      }
    }
    defaultTreeAdapter.appendChild(parentNode, defaultTreeAdapter.createTextNode(text));
  },
  insertTextBefore(parentNode, text, referenceNode) {
    let prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];
    if (prevNode && defaultTreeAdapter.isTextNode(prevNode)) prevNode.value += text;
    else defaultTreeAdapter.insertBefore(parentNode, defaultTreeAdapter.createTextNode(text), referenceNode);
  },
  adoptAttributes(recipient, attrs) {
    let recipientAttrsMap = new Set(recipient.attrs.map((attr) => attr.name));
    for (let j = 0; j < attrs.length; j++)
      if (!recipientAttrsMap.has(attrs[j].name)) recipient.attrs.push(attrs[j]);
  },
  getFirstChild(node) {
    return node.childNodes[0];
  },
  getChildNodes(node) {
    return node.childNodes;
  },
  getParentNode(node) {
    return node.parentNode;
  },
  getAttrList(element) {
    return element.attrs;
  },
  getTagName(element) {
    return element.tagName;
  },
  getNamespaceURI(element) {
    return element.namespaceURI;
  },
  getTextNodeContent(textNode) {
    return textNode.value;
  },
  getCommentNodeContent(commentNode) {
    return commentNode.data;
  },
  getDocumentTypeNodeName(doctypeNode) {
    return doctypeNode.name;
  },
  getDocumentTypeNodePublicId(doctypeNode) {
    return doctypeNode.publicId;
  },
  getDocumentTypeNodeSystemId(doctypeNode) {
    return doctypeNode.systemId;
  },
  isTextNode(node) {
    return node.nodeName === "#text";
  },
  isCommentNode(node) {
    return node.nodeName === "#comment";
  },
  isDocumentTypeNode(node) {
    return node.nodeName === "#documentType";
  },
  isElementNode(node) {
    return Object.prototype.hasOwnProperty.call(node, "tagName");
  },
  setNodeSourceCodeLocation(node, location) {
    node.sourceCodeLocation = location;
  },
  getNodeSourceCodeLocation(node) {
    return node.sourceCodeLocation;
  },
  updateNodeSourceCodeLocation(node, endLocation) {
    node.sourceCodeLocation = {
      ...node.sourceCodeLocation,
      ...endLocation,
    };
  },
};
export { defaultTreeAdapter };
