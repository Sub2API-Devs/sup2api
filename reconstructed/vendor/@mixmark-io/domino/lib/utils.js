/**
 * @mixmark-io/domino/lib/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_DOMException } from "./DOMException.js";
import { require_config } from "./config.js";

//@ chunk-vwj6ccer.js:5355-7704 cjs-fingerprint
var require_utils = x(function (cjsExports) {
  var DOMException = require_DOMException();
  var ERR = DOMException;
  var isApiWritable = require_config().isApiWritable;
  cjsExports.NAMESPACE = {
    HTML: "http://www.w3.org/1999/xhtml",
    XML: "http://www.w3.org/XML/1998/namespace",
    XMLNS: "http://www.w3.org/2000/xmlns/",
    MATHML: "http://www.w3.org/1998/Math/MathML",
    SVG: "http://www.w3.org/2000/svg",
    XLINK: "http://www.w3.org/1999/xlink",
  };
  cjsExports.IndexSizeError = function () {
    throw new DOMException(ERR.INDEX_SIZE_ERR);
  };
  cjsExports.HierarchyRequestError = function () {
    throw new DOMException(ERR.HIERARCHY_REQUEST_ERR);
  };
  cjsExports.WrongDocumentError = function () {
    throw new DOMException(ERR.WRONG_DOCUMENT_ERR);
  };
  cjsExports.InvalidCharacterError = function () {
    throw new DOMException(ERR.INVALID_CHARACTER_ERR);
  };
  cjsExports.NoModificationAllowedError = function () {
    throw new DOMException(ERR.NO_MODIFICATION_ALLOWED_ERR);
  };
  cjsExports.NotFoundError = function () {
    throw new DOMException(ERR.NOT_FOUND_ERR);
  };
  cjsExports.NotSupportedError = function () {
    throw new DOMException(ERR.NOT_SUPPORTED_ERR);
  };
  cjsExports.InvalidStateError = function () {
    throw new DOMException(ERR.INVALID_STATE_ERR);
  };
  cjsExports.SyntaxError = function () {
    throw new DOMException(ERR.SYNTAX_ERR);
  };
  cjsExports.InvalidModificationError = function () {
    throw new DOMException(ERR.INVALID_MODIFICATION_ERR);
  };
  cjsExports.NamespaceError = function () {
    throw new DOMException(ERR.NAMESPACE_ERR);
  };
  cjsExports.InvalidAccessError = function () {
    throw new DOMException(ERR.INVALID_ACCESS_ERR);
  };
  cjsExports.TypeMismatchError = function () {
    throw new DOMException(ERR.TYPE_MISMATCH_ERR);
  };
  cjsExports.SecurityError = function () {
    throw new DOMException(ERR.SECURITY_ERR);
  };
  cjsExports.NetworkError = function () {
    throw new DOMException(ERR.NETWORK_ERR);
  };
  cjsExports.AbortError = function () {
    throw new DOMException(ERR.ABORT_ERR);
  };
  cjsExports.UrlMismatchError = function () {
    throw new DOMException(ERR.URL_MISMATCH_ERR);
  };
  cjsExports.QuotaExceededError = function () {
    throw new DOMException(ERR.QUOTA_EXCEEDED_ERR);
  };
  cjsExports.TimeoutError = function () {
    throw new DOMException(ERR.TIMEOUT_ERR);
  };
  cjsExports.InvalidNodeTypeError = function () {
    throw new DOMException(ERR.INVALID_NODE_TYPE_ERR);
  };
  cjsExports.DataCloneError = function () {
    throw new DOMException(ERR.DATA_CLONE_ERR);
  };
  cjsExports.nyi = function () {
    throw Error("NotYetImplemented");
  };
  cjsExports.shouldOverride = function () {
    throw Error("Abstract function; should be overriding in subclass.");
  };
  cjsExports.assert = function (expr, msg) {
    if (!expr)
      throw Error(
        "Assertion failed: " +
          (msg || "") +
          `
` +
          Error().stack,
      );
  };
  cjsExports.expose = function (src, c) {
    for (var n in src)
      Object.defineProperty(c.prototype, n, {
        value: src[n],
        writable: isApiWritable,
      });
  };
  cjsExports.merge = function (a, b) {
    for (var n in b) a[n] = b[n];
  };
  cjsExports.documentOrder = function (n, m) {
    return 3 - (n.compareDocumentPosition(m) & 6);
  };
  cjsExports.toASCIILowerCase = function (s) {
    return s.replace(/[A-Z]+/g, function (c) {
      return c.toLowerCase();
    });
  };
  cjsExports.toASCIIUpperCase = function (s) {
    return s.replace(/[a-z]+/g, function (c) {
      return c.toUpperCase();
    });
  };
});
export { require_utils };
