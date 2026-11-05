/**
 * @mixmark-io/domino/lib/impl.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";
import { require_CSSStyleDeclaration } from "./CSSStyleDeclaration.js";
import { require_CharacterData } from "./CharacterData.js";
import { require_Comment } from "./Comment.js";
import { require_DOMException } from "./DOMException.js";
import { require_DOMImplementation } from "./DOMImplementation.js";
import { require_DOMTokenList } from "./DOMTokenList.js";
import { require_Document } from "./Document.js";
import { require_DocumentFragment } from "./DocumentFragment.js";
import { require_DocumentType } from "./DocumentType.js";
import { require_Element } from "./Element.js";
import { require_HTMLParser } from "./HTMLParser.js";
import { require_NamedNodeMap } from "./NamedNodeMap.js";
import { require_Node } from "./Node.js";
import { require_NodeList } from "./NodeList.js";
import { require_NodeFilter } from "./NodeFilter.js";
import { require_ProcessingInstruction } from "./ProcessingInstruction.js";
import { require_Text } from "./Text.js";
import { require_Window } from "./Window.js";
import { require_events } from "./events.js";
import { require_htmlelts } from "./htmlelts.js";
import { require_svg } from "./svg.js";

//@ chunk-w04z664w.js:235889-236322 cjs-fingerprint
var require_impl = __commonJS(function (cjsExports, cjsModule) {
  var utils = require_utils();
  cjsExports = cjsModule.exports = {
    CSSStyleDeclaration: require_CSSStyleDeclaration(),
    CharacterData: require_CharacterData(),
    Comment: require_Comment(),
    DOMException: require_DOMException(),
    DOMImplementation: require_DOMImplementation(),
    DOMTokenList: require_DOMTokenList(),
    Document: require_Document(),
    DocumentFragment: require_DocumentFragment(),
    DocumentType: require_DocumentType(),
    Element: require_Element(),
    HTMLParser: require_HTMLParser(),
    NamedNodeMap: require_NamedNodeMap(),
    Node: require_Node(),
    NodeList: require_NodeList(),
    NodeFilter: require_NodeFilter(),
    ProcessingInstruction: require_ProcessingInstruction(),
    Text: require_Text(),
    Window: require_Window(),
  };
  utils.merge(cjsExports, require_events());
  utils.merge(cjsExports, require_htmlelts().elements);
  utils.merge(cjsExports, require_svg().elements);
});
export { require_impl };
