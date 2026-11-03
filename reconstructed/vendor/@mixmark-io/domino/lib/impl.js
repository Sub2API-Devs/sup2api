/**
 * @mixmark-io/domino/lib/impl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ee } from "./utils.js";
import { oa } from "./CSSStyleDeclaration.js";
import { lr } from "./CharacterData.js";
import { Cn } from "./Comment.js";
import { Wr } from "./DOMException.js";
import { Er } from "./DOMImplementation.js";
import { xn } from "./DOMTokenList.js";
import { fa } from "./Document.js";
import { kn } from "./DocumentFragment.js";
import { ha } from "./DocumentType.js";
import { Ft } from "./Element.js";
import { va } from "./HTMLParser.js";
import { gn } from "./NamedNodeMap.js";
import { xe } from "./Node.js";
import { yt } from "./NodeList.js";
import { hr } from "./NodeFilter.js";
import { Mn } from "./ProcessingInstruction.js";
import { Sn } from "./Text.js";
import { ii } from "./Window.js";
import { Un } from "./events.js";
import { la } from "./htmlelts.js";
import { Xn } from "./svg.js";

//@ chunk-vwj6ccer.js:235889-236322 cjs-fingerprint
var ni = x(function (_r, Rc) {
  var ai = ee();
  _r = Rc.exports = {
    CSSStyleDeclaration: oa(),
    CharacterData: lr(),
    Comment: Cn(),
    DOMException: Wr(),
    DOMImplementation: Er(),
    DOMTokenList: xn(),
    Document: fa(),
    DocumentFragment: kn(),
    DocumentType: ha(),
    Element: Ft(),
    HTMLParser: va(),
    NamedNodeMap: gn(),
    Node: xe(),
    NodeList: yt(),
    NodeFilter: hr(),
    ProcessingInstruction: Mn(),
    Text: Sn(),
    Window: ii(),
  };
  ai.merge(_r, Un());
  ai.merge(_r, la().elements);
  ai.merge(_r, Xn().elements);
});

export { ni };
