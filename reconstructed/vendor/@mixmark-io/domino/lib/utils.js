/**
 * @mixmark-io/domino/lib/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Wr } from "./DOMException.js";
import { Xr } from "./config.js";

//@ chunk-vwj6ccer.js:5355-7704 cjs-fingerprint
var ee = x(function (wu) {
  var J = Wr(),
    ae = J,
    isApiWritable = Xr().isApiWritable;
  wu.NAMESPACE = {
    HTML: "http://www.w3.org/1999/xhtml",
    XML: "http://www.w3.org/XML/1998/namespace",
    XMLNS: "http://www.w3.org/2000/xmlns/",
    MATHML: "http://www.w3.org/1998/Math/MathML",
    SVG: "http://www.w3.org/2000/svg",
    XLINK: "http://www.w3.org/1999/xlink",
  };
  wu.IndexSizeError = function () {
    throw new J(ae.INDEX_SIZE_ERR);
  };
  wu.HierarchyRequestError = function () {
    throw new J(ae.HIERARCHY_REQUEST_ERR);
  };
  wu.WrongDocumentError = function () {
    throw new J(ae.WRONG_DOCUMENT_ERR);
  };
  wu.InvalidCharacterError = function () {
    throw new J(ae.INVALID_CHARACTER_ERR);
  };
  wu.NoModificationAllowedError = function () {
    throw new J(ae.NO_MODIFICATION_ALLOWED_ERR);
  };
  wu.NotFoundError = function () {
    throw new J(ae.NOT_FOUND_ERR);
  };
  wu.NotSupportedError = function () {
    throw new J(ae.NOT_SUPPORTED_ERR);
  };
  wu.InvalidStateError = function () {
    throw new J(ae.INVALID_STATE_ERR);
  };
  wu.SyntaxError = function () {
    throw new J(ae.SYNTAX_ERR);
  };
  wu.InvalidModificationError = function () {
    throw new J(ae.INVALID_MODIFICATION_ERR);
  };
  wu.NamespaceError = function () {
    throw new J(ae.NAMESPACE_ERR);
  };
  wu.InvalidAccessError = function () {
    throw new J(ae.INVALID_ACCESS_ERR);
  };
  wu.TypeMismatchError = function () {
    throw new J(ae.TYPE_MISMATCH_ERR);
  };
  wu.SecurityError = function () {
    throw new J(ae.SECURITY_ERR);
  };
  wu.NetworkError = function () {
    throw new J(ae.NETWORK_ERR);
  };
  wu.AbortError = function () {
    throw new J(ae.ABORT_ERR);
  };
  wu.UrlMismatchError = function () {
    throw new J(ae.URL_MISMATCH_ERR);
  };
  wu.QuotaExceededError = function () {
    throw new J(ae.QUOTA_EXCEEDED_ERR);
  };
  wu.TimeoutError = function () {
    throw new J(ae.TIMEOUT_ERR);
  };
  wu.InvalidNodeTypeError = function () {
    throw new J(ae.INVALID_NODE_TYPE_ERR);
  };
  wu.DataCloneError = function () {
    throw new J(ae.DATA_CLONE_ERR);
  };
  wu.nyi = function () {
    throw Error("NotYetImplemented");
  };
  wu.shouldOverride = function () {
    throw Error("Abstract function; should be overriding in subclass.");
  };
  wu.assert = function (e, t) {
    if (!e)
      throw Error(
        "Assertion failed: " +
          (t || "") +
          `
` +
          Error().stack,
      );
  };
  wu.expose = function (e, t) {
    for (var key in e) Object.defineProperty(t.prototype, key, { value: e[key], writable: isApiWritable });
  };
  wu.merge = function (e, t) {
    for (var key in t) e[key] = t[key];
  };
  wu.documentOrder = function (e, t) {
    return 3 - (e.compareDocumentPosition(t) & 6);
  };
  wu.toASCIILowerCase = function (e) {
    return e.replace(/[A-Z]+/g, function (t) {
      return t.toLowerCase();
    });
  };
  wu.toASCIIUpperCase = function (e) {
    return e.replace(/[a-z]+/g, function (t) {
      return t.toUpperCase();
    });
  };
});

export { ee };
