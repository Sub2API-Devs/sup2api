/**
 * @mixmark-io/domino/lib/DOMException.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:2402-5284 cjs-fingerprint
var Wr = x(function (ad, Hi) {
  Hi.exports = zr;
  var Jo = 1,
    eu = 3,
    tu = 4,
    ru = 5,
    au = 7,
    nu = 8,
    iu = 9,
    su = 11,
    cu = 12,
    ou = 13,
    uu = 14,
    lu = 15,
    xu = 17,
    fu = 18,
    du = 19,
    hu = 20,
    pu = 21,
    mu = 22,
    gu = 23,
    bu = 24,
    Eu = 25,
    _u = [
      null,
      "INDEX_SIZE_ERR",
      null,
      "HIERARCHY_REQUEST_ERR",
      "WRONG_DOCUMENT_ERR",
      "INVALID_CHARACTER_ERR",
      null,
      "NO_MODIFICATION_ALLOWED_ERR",
      "NOT_FOUND_ERR",
      "NOT_SUPPORTED_ERR",
      "INUSE_ATTRIBUTE_ERR",
      "INVALID_STATE_ERR",
      "SYNTAX_ERR",
      "INVALID_MODIFICATION_ERR",
      "NAMESPACE_ERR",
      "INVALID_ACCESS_ERR",
      null,
      "TYPE_MISMATCH_ERR",
      "SECURITY_ERR",
      "NETWORK_ERR",
      "ABORT_ERR",
      "URL_MISMATCH_ERR",
      "QUOTA_EXCEEDED_ERR",
      "TIMEOUT_ERR",
      "INVALID_NODE_TYPE_ERR",
      "DATA_CLONE_ERR",
    ],
    vu = [
      null,
      "INDEX_SIZE_ERR (1): the index is not in the allowed range",
      null,
      "HIERARCHY_REQUEST_ERR (3): the operation would yield an incorrect nodes model",
      "WRONG_DOCUMENT_ERR (4): the object is in the wrong Document, a call to importNode is required",
      "INVALID_CHARACTER_ERR (5): the string contains invalid characters",
      null,
      "NO_MODIFICATION_ALLOWED_ERR (7): the object can not be modified",
      "NOT_FOUND_ERR (8): the object can not be found here",
      "NOT_SUPPORTED_ERR (9): this operation is not supported",
      "INUSE_ATTRIBUTE_ERR (10): setAttributeNode called on owned Attribute",
      "INVALID_STATE_ERR (11): the object is in an invalid state",
      "SYNTAX_ERR (12): the string did not match the expected pattern",
      "INVALID_MODIFICATION_ERR (13): the object can not be modified in this way",
      "NAMESPACE_ERR (14): the operation is not allowed by Namespaces in XML",
      "INVALID_ACCESS_ERR (15): the object does not support the operation or argument",
      null,
      "TYPE_MISMATCH_ERR (17): the type of the object does not match the expected type",
      "SECURITY_ERR (18): the operation is insecure",
      "NETWORK_ERR (19): a network error occurred",
      "ABORT_ERR (20): the user aborted an operation",
      "URL_MISMATCH_ERR (21): the given URL does not match another URL",
      "QUOTA_EXCEEDED_ERR (22): the quota has been exceeded",
      "TIMEOUT_ERR (23): a timeout occurred",
      "INVALID_NODE_TYPE_ERR (24): the supplied node is invalid or has an invalid ancestor for this operation",
      "DATA_CLONE_ERR (25): the object can not be cloned.",
    ],
    qi = {
      INDEX_SIZE_ERR: Jo,
      DOMSTRING_SIZE_ERR: 2,
      HIERARCHY_REQUEST_ERR: eu,
      WRONG_DOCUMENT_ERR: tu,
      INVALID_CHARACTER_ERR: ru,
      NO_DATA_ALLOWED_ERR: 6,
      NO_MODIFICATION_ALLOWED_ERR: au,
      NOT_FOUND_ERR: nu,
      NOT_SUPPORTED_ERR: iu,
      INUSE_ATTRIBUTE_ERR: 10,
      INVALID_STATE_ERR: su,
      SYNTAX_ERR: cu,
      INVALID_MODIFICATION_ERR: ou,
      NAMESPACE_ERR: uu,
      INVALID_ACCESS_ERR: lu,
      VALIDATION_ERR: 16,
      TYPE_MISMATCH_ERR: xu,
      SECURITY_ERR: fu,
      NETWORK_ERR: du,
      ABORT_ERR: hu,
      URL_MISMATCH_ERR: pu,
      QUOTA_EXCEEDED_ERR: mu,
      TIMEOUT_ERR: gu,
      INVALID_NODE_TYPE_ERR: bu,
      DATA_CLONE_ERR: Eu,
    };
  function zr(e) {
    (Error.call(this),
      Error.captureStackTrace(this, this.constructor),
      (this.code = e),
      (this.message = vu[e]),
      (this.name = _u[e]));
  }
  zr.prototype.__proto__ = Error.prototype;
  for (rr in qi)
    ((Gr = { value: qi[rr] }),
      Object.defineProperty(zr, rr, Gr),
      Object.defineProperty(zr.prototype, rr, Gr));
  var Gr, rr;
});

export { Wr };
