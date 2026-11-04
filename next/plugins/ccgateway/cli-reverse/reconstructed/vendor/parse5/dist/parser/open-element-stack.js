/**
 * parse5/dist/parser/open-element-stack.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (2)
 * attribution: esm-fingerprint 2
 */
import { TAG_ID, HEADING_ELEMENTS } from "../common/html.js";
import { NAMESPACES } from "../../lib/common/html.js";

//@ chunk-6ja29j2n.js:117020-117587 esm-fingerprint
var IMPLICIT_END_TAG_REQUIRED = new Set([
  TAG_ID.DD,
  TAG_ID.DT,
  TAG_ID.LI,
  TAG_ID.OPTGROUP,
  TAG_ID.OPTION,
  TAG_ID.P,
  TAG_ID.RB,
  TAG_ID.RP,
  TAG_ID.RT,
  TAG_ID.RTC,
]);
var IMPLICIT_END_TAG_REQUIRED_THOROUGHLY = new Set([
  ...IMPLICIT_END_TAG_REQUIRED,
  TAG_ID.CAPTION,
  TAG_ID.COLGROUP,
  TAG_ID.TBODY,
  TAG_ID.TD,
  TAG_ID.TFOOT,
  TAG_ID.TH,
  TAG_ID.THEAD,
  TAG_ID.TR,
]);
var SCOPING_ELEMENTS_HTML = new Set([
  TAG_ID.APPLET,
  TAG_ID.CAPTION,
  TAG_ID.HTML,
  TAG_ID.MARQUEE,
  TAG_ID.OBJECT,
  TAG_ID.TABLE,
  TAG_ID.TD,
  TAG_ID.TEMPLATE,
  TAG_ID.TH,
]);
var SCOPING_ELEMENTS_HTML_LIST = new Set([...SCOPING_ELEMENTS_HTML, TAG_ID.OL, TAG_ID.UL]);
var SCOPING_ELEMENTS_HTML_BUTTON = new Set([...SCOPING_ELEMENTS_HTML, TAG_ID.BUTTON]);
var SCOPING_ELEMENTS_MATHML = new Set([
  TAG_ID.ANNOTATION_XML,
  TAG_ID.MI,
  TAG_ID.MN,
  TAG_ID.MO,
  TAG_ID.MS,
  TAG_ID.MTEXT,
]);
var SCOPING_ELEMENTS_SVG = new Set([TAG_ID.DESC, TAG_ID.FOREIGN_OBJECT, TAG_ID.TITLE]);
var TABLE_ROW_CONTEXT = new Set([TAG_ID.TR, TAG_ID.TEMPLATE, TAG_ID.HTML]);
var TABLE_BODY_CONTEXT = new Set([TAG_ID.TBODY, TAG_ID.TFOOT, TAG_ID.THEAD, TAG_ID.TEMPLATE, TAG_ID.HTML]);
var TABLE_CONTEXT = new Set([TAG_ID.TABLE, TAG_ID.TEMPLATE, TAG_ID.HTML]);
var TABLE_CELLS = new Set([TAG_ID.TD, TAG_ID.TH]);
//@ chunk-6ja29j2n.js:117587-122132 esm-fingerprint
class OpenElementStack {
  get currentTmplContentOrNode() {
    return this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : this.current;
  }
  constructor(documentNode, treeAdapter, handler) {
    this.treeAdapter = treeAdapter;
    this.handler = handler;
    this.items = [];
    this.tagIDs = [];
    this.stackTop = -1;
    this.tmplCount = 0;
    this.currentTagId = TAG_ID.UNKNOWN;
    this.current = documentNode;
  }
  _indexOf(element) {
    return this.items.lastIndexOf(element, this.stackTop);
  }
  _isInTemplate() {
    return (
      this.currentTagId === TAG_ID.TEMPLATE &&
      this.treeAdapter.getNamespaceURI(this.current) === NAMESPACES.HTML
    );
  }
  _updateCurrentElement() {
    this.current = this.items[this.stackTop];
    this.currentTagId = this.tagIDs[this.stackTop];
  }
  push(element, tagID) {
    this.stackTop++;
    this.items[this.stackTop] = element;
    this.current = element;
    this.tagIDs[this.stackTop] = tagID;
    this.currentTagId = tagID;
    if (this._isInTemplate()) this.tmplCount++;
    this.handler.onItemPush(element, tagID, true);
  }
  pop() {
    let popped = this.current;
    if (this.tmplCount > 0 && this._isInTemplate()) this.tmplCount--;
    this.stackTop--;
    this._updateCurrentElement();
    this.handler.onItemPop(popped, true);
  }
  replace(oldElement, newElement) {
    let idx = this._indexOf(oldElement);
    this.items[idx] = newElement;
    if (idx === this.stackTop) this.current = newElement;
  }
  insertAfter(referenceElement, newElement, newElementID) {
    let insertionIdx = this._indexOf(referenceElement) + 1;
    this.items.splice(insertionIdx, 0, newElement);
    this.tagIDs.splice(insertionIdx, 0, newElementID);
    this.stackTop++;
    if (insertionIdx === this.stackTop) this._updateCurrentElement();
    this.handler.onItemPush(this.current, this.currentTagId, insertionIdx === this.stackTop);
  }
  popUntilTagNamePopped(tagName) {
    let targetIdx = this.stackTop + 1;
    do targetIdx = this.tagIDs.lastIndexOf(tagName, targetIdx - 1);
    while (targetIdx > 0 && this.treeAdapter.getNamespaceURI(this.items[targetIdx]) !== NAMESPACES.HTML);
    this.shortenToLength(targetIdx < 0 ? 0 : targetIdx);
  }
  shortenToLength(idx) {
    while (this.stackTop >= idx) {
      let popped = this.current;
      if (this.tmplCount > 0 && this._isInTemplate()) this.tmplCount -= 1;
      this.stackTop--;
      this._updateCurrentElement();
      this.handler.onItemPop(popped, this.stackTop < idx);
    }
  }
  popUntilElementPopped(element) {
    let idx = this._indexOf(element);
    this.shortenToLength(idx < 0 ? 0 : idx);
  }
  popUntilPopped(tagNames, targetNS) {
    let idx = this._indexOfTagNames(tagNames, targetNS);
    this.shortenToLength(idx < 0 ? 0 : idx);
  }
  popUntilNumberedHeaderPopped() {
    this.popUntilPopped(HEADING_ELEMENTS, NAMESPACES.HTML);
  }
  popUntilTableCellPopped() {
    this.popUntilPopped(TABLE_CELLS, NAMESPACES.HTML);
  }
  popAllUpToHtmlElement() {
    this.tmplCount = 0;
    this.shortenToLength(1);
  }
  _indexOfTagNames(tagNames, namespace) {
    for (let i = this.stackTop; i >= 0; i--)
      if (tagNames.has(this.tagIDs[i]) && this.treeAdapter.getNamespaceURI(this.items[i]) === namespace)
        return i;
    return -1;
  }
  clearBackTo(tagNames, targetNS) {
    let idx = this._indexOfTagNames(tagNames, targetNS);
    this.shortenToLength(idx + 1);
  }
  clearBackToTableContext() {
    this.clearBackTo(TABLE_CONTEXT, NAMESPACES.HTML);
  }
  clearBackToTableBodyContext() {
    this.clearBackTo(TABLE_BODY_CONTEXT, NAMESPACES.HTML);
  }
  clearBackToTableRowContext() {
    this.clearBackTo(TABLE_ROW_CONTEXT, NAMESPACES.HTML);
  }
  remove(element) {
    let idx = this._indexOf(element);
    if (idx >= 0)
      if (idx === this.stackTop) this.pop();
      else {
        this.items.splice(idx, 1);
        this.tagIDs.splice(idx, 1);
        this.stackTop--;
        this._updateCurrentElement();
        this.handler.onItemPop(element, false);
      }
  }
  tryPeekProperlyNestedBodyElement() {
    return this.stackTop >= 1 && this.tagIDs[1] === TAG_ID.BODY ? this.items[1] : null;
  }
  contains(element) {
    return this._indexOf(element) > -1;
  }
  getCommonAncestor(element) {
    let elementIdx = this._indexOf(element) - 1;
    return elementIdx >= 0 ? this.items[elementIdx] : null;
  }
  isRootHtmlElementCurrent() {
    return this.stackTop === 0 && this.tagIDs[0] === TAG_ID.HTML;
  }
  hasInDynamicScope(tagName, htmlScope) {
    for (let i = this.stackTop; i >= 0; i--) {
      let tn = this.tagIDs[i];
      switch (this.treeAdapter.getNamespaceURI(this.items[i])) {
        case NAMESPACES.HTML: {
          if (tn === tagName) return true;
          if (htmlScope.has(tn)) return false;
          break;
        }
        case NAMESPACES.SVG: {
          if (SCOPING_ELEMENTS_SVG.has(tn)) return false;
          break;
        }
        case NAMESPACES.MATHML: {
          if (SCOPING_ELEMENTS_MATHML.has(tn)) return false;
          break;
        }
      }
    }
    return true;
  }
  hasInScope(tagName) {
    return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML);
  }
  hasInListItemScope(tagName) {
    return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML_LIST);
  }
  hasInButtonScope(tagName) {
    return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML_BUTTON);
  }
  hasNumberedHeaderInScope() {
    for (let i = this.stackTop; i >= 0; i--) {
      let tn = this.tagIDs[i];
      switch (this.treeAdapter.getNamespaceURI(this.items[i])) {
        case NAMESPACES.HTML: {
          if (HEADING_ELEMENTS.has(tn)) return true;
          if (SCOPING_ELEMENTS_HTML.has(tn)) return false;
          break;
        }
        case NAMESPACES.SVG: {
          if (SCOPING_ELEMENTS_SVG.has(tn)) return false;
          break;
        }
        case NAMESPACES.MATHML: {
          if (SCOPING_ELEMENTS_MATHML.has(tn)) return false;
          break;
        }
      }
    }
    return true;
  }
  hasInTableScope(tagName) {
    for (let i = this.stackTop; i >= 0; i--) {
      if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NAMESPACES.HTML) continue;
      switch (this.tagIDs[i]) {
        case tagName:
          return true;
        case TAG_ID.TABLE:
        case TAG_ID.HTML:
          return false;
      }
    }
    return true;
  }
  hasTableBodyContextInTableScope() {
    for (let i = this.stackTop; i >= 0; i--) {
      if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NAMESPACES.HTML) continue;
      switch (this.tagIDs[i]) {
        case TAG_ID.TBODY:
        case TAG_ID.THEAD:
        case TAG_ID.TFOOT:
          return true;
        case TAG_ID.TABLE:
        case TAG_ID.HTML:
          return false;
      }
    }
    return true;
  }
  hasInSelectScope(tagName) {
    for (let i = this.stackTop; i >= 0; i--) {
      if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NAMESPACES.HTML) continue;
      switch (this.tagIDs[i]) {
        case tagName:
          return true;
        case TAG_ID.OPTION:
        case TAG_ID.OPTGROUP:
          break;
        default:
          return false;
      }
    }
    return true;
  }
  generateImpliedEndTags() {
    while (IMPLICIT_END_TAG_REQUIRED.has(this.currentTagId)) this.pop();
  }
  generateImpliedEndTagsThoroughly() {
    while (IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) this.pop();
  }
  generateImpliedEndTagsWithExclusion(exclusionId) {
    while (this.currentTagId !== exclusionId && IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId))
      this.pop();
  }
}
export { OpenElementStack };
