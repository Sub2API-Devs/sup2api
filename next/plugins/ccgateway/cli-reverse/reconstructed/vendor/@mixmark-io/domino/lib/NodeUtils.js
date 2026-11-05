/**
 * @mixmark-io/domino/lib/NodeUtils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";

//@ chunk-w04z664w.js:12056-14225 cjs-fingerprint
var require_NodeUtils = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    serializeOne,
    ɵescapeMatchingClosingTag: escapeMatchingClosingTag,
    ɵescapeClosingCommentTag: escapeClosingCommentTag,
    ɵescapeProcessingInstructionContent: escapeProcessingInstructionContent,
  };
  var utils = require_utils();
  var NAMESPACE = utils.NAMESPACE;
  var hasRawContent = {
    STYLE: true,
    SCRIPT: true,
    XMP: true,
    IFRAME: true,
    NOEMBED: true,
    NOFRAMES: true,
    PLAINTEXT: true,
  };
  var emptyElements = {
    area: true,
    base: true,
    basefont: true,
    bgsound: true,
    br: true,
    col: true,
    embed: true,
    frame: true,
    hr: true,
    img: true,
    input: true,
    keygen: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true,
  };
  var extraNewLine = {};
  var ESCAPE_REGEXP = /[&<>\u00A0]/g;
  var ESCAPE_ATTR_REGEXP = /[&"<>\u00A0]/g;
  function serializeText(s) {
    if (!ESCAPE_REGEXP.test(s)) return s;
    return s.replace(ESCAPE_REGEXP, (c) => {
      switch (c) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "\xA0":
          return "&nbsp;";
      }
    });
  }
  function escapeAttr(s) {
    if (!ESCAPE_ATTR_REGEXP.test(s)) return s;
    return s.replace(ESCAPE_ATTR_REGEXP, (c) => {
      switch (c) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case '"':
          return "&quot;";
        case "\xA0":
          return "&nbsp;";
      }
    });
  }
  function attrname(a) {
    var ns = a.namespaceURI;
    if (!ns) return a.localName;
    if (ns === NAMESPACE.XML) return "xml:" + a.localName;
    if (ns === NAMESPACE.XLINK) return "xlink:" + a.localName;
    if (ns === NAMESPACE.XMLNS)
      if (a.localName === "xmlns") return "xmlns";
      else return "xmlns:" + a.localName;
    return a.name;
  }
  function escapeMatchingClosingTag(rawText, parentTag) {
    let parentClosingTag = "</" + parentTag;
    if (!rawText.toLowerCase().includes(parentClosingTag)) return rawText;
    let result = [...rawText];
    let matches = rawText.matchAll(new RegExp(parentClosingTag, "ig"));
    for (let match of matches) result[match.index] = "&lt;";
    return result.join("");
  }
  var CLOSING_COMMENT_REGEXP = /--!?>/;
  function escapeClosingCommentTag(rawContent) {
    if (!CLOSING_COMMENT_REGEXP.test(rawContent)) return rawContent;
    return rawContent.replace(/(--\!?)>/g, "$1&gt;");
  }
  function escapeProcessingInstructionContent(rawContent) {
    return rawContent.includes(">") ? rawContent.replaceAll(">", "&gt;") : rawContent;
  }
  function serializeOne(kid, parent) {
    var s_2 = "";
    switch (kid.nodeType) {
      case 1:
        var ns = kid.namespaceURI;
        var html = ns === NAMESPACE.HTML;
        var tagname = html || ns === NAMESPACE.SVG || ns === NAMESPACE.MATHML ? kid.localName : kid.tagName;
        s_2 += "<" + tagname;
        for (var j = 0, k = kid._numattrs; j < k; j++) {
          var a = kid._attr(j);
          s_2 += " " + attrname(a);
          if (a.value !== undefined) s_2 += '="' + escapeAttr(a.value) + '"';
        }
        s_2 += ">";
        if (!(html && emptyElements[tagname])) {
          var ss = kid.serialize();
          if (hasRawContent[tagname.toUpperCase()]) ss = escapeMatchingClosingTag(ss, tagname);
          if (
            html &&
            extraNewLine[tagname] &&
            ss.charAt(0) ===
              `
`
          )
            s_2 += `
`;
          s_2 += ss;
          s_2 += "</" + tagname + ">";
        }
        break;
      case 3:
      case 4:
        var parenttag;
        if (parent.nodeType === 1 && parent.namespaceURI === NAMESPACE.HTML) parenttag = parent.tagName;
        else parenttag = "";
        if (hasRawContent[parenttag] || (parenttag === "NOSCRIPT" && parent.ownerDocument._scripting_enabled))
          s_2 += kid.data;
        else s_2 += serializeText(kid.data);
        break;
      case 8:
        s_2 += "<!--" + escapeClosingCommentTag(kid.data) + "-->";
        break;
      case 7:
        let content = escapeProcessingInstructionContent(kid.data);
        s_2 += "<?" + kid.target + " " + content + "?>";
        break;
      case 10:
        s_2 += "<!DOCTYPE " + kid.name;
        s_2 += ">";
        break;
      default:
        utils.InvalidStateError();
    }
    return s_2;
  }
});
export { require_NodeUtils };
