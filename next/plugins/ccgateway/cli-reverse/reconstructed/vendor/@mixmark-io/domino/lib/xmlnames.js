/**
 * @mixmark-io/domino/lib/xmlnames.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-w04z664w.js:24885-26129 cjs-fingerprint
var require_xmlnames = __commonJS(function (cjsExports) {
  cjsExports.isValidName = isValidName;
  cjsExports.isValidQName = isValidQName;
  var simplename = /^[_:A-Za-z][-.:\w]+$/;
  var simpleqname = /^([_A-Za-z][-.\w]+|[_A-Za-z][-.\w]+:[_A-Za-z][-.\w]+)$/;
  var ncnamestartchars =
    "_A-Za-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
  var ncnamechars =
    "-._A-Za-z0-9\xB7\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0300-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
  var ncname = "[" + ncnamestartchars + "][" + ncnamechars + "]*";
  var namestartchars = ncnamestartchars + ":";
  var namechars = ncnamechars + ":";
  var name = new RegExp("^[" + namestartchars + "][" + namechars + "]*$");
  var qname = new RegExp("^(" + ncname + "|" + ncname + ":" + ncname + ")$");
  var hassurrogates = /[\uD800-\uDB7F\uDC00-\uDFFF]/;
  var surrogatechars = /[\uD800-\uDB7F\uDC00-\uDFFF]/g;
  var surrogatepairs = /[\uD800-\uDB7F][\uDC00-\uDFFF]/g;
  ncnamestartchars += "\uD800-\uDB7F\uDC00-\uDFFF";
  ncnamechars += "\uD800-\uDB7F\uDC00-\uDFFF";
  ncname = "[" + ncnamestartchars + "][" + ncnamechars + "]*";
  namestartchars = ncnamestartchars + ":";
  namechars = ncnamechars + ":";
  var surrogatename = new RegExp("^[" + namestartchars + "][" + namechars + "]*$");
  var surrogateqname = new RegExp("^(" + ncname + "|" + ncname + ":" + ncname + ")$");
  function isValidName(s) {
    if (simplename.test(s)) return true;
    if (name.test(s)) return true;
    if (!hassurrogates.test(s)) return false;
    if (!surrogatename.test(s)) return false;
    var chars = s.match(surrogatechars);
    var pairs = s.match(surrogatepairs);
    return pairs !== null && 2 * pairs.length === chars.length;
  }
  function isValidQName(s) {
    if (simpleqname.test(s)) return true;
    if (qname.test(s)) return true;
    if (!hassurrogates.test(s)) return false;
    if (!surrogateqname.test(s)) return false;
    var chars = s.match(surrogatechars);
    var pairs = s.match(surrogatepairs);
    return pairs !== null && 2 * pairs.length === chars.length;
  }
});
export { require_xmlnames };
