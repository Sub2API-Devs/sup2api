/**
 * parse5/dist/parser/open-element-stack.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (2)
 * attribution: esm-fingerprint 2
 */
import { u, H } from "../common/html.js";
import { E } from "../../lib/common/html.js";

//@ chunk-6ja29j2n.js:117020-117587 esm-fingerprint
var Ue = new Set([u.DD, u.DT, u.LI, u.OPTGROUP, u.OPTION, u.P, u.RB, u.RP, u.RT, u.RTC]),
  Be = new Set([...Ue, u.CAPTION, u.COLGROUP, u.TBODY, u.TD, u.TFOOT, u.TH, u.THEAD, u.TR]),
  ee = new Set([u.APPLET, u.CAPTION, u.HTML, u.MARQUEE, u.OBJECT, u.TABLE, u.TD, u.TEMPLATE, u.TH]),
  gt = new Set([...ee, u.OL, u.UL]),
  Pt = new Set([...ee, u.BUTTON]),
  ke = new Set([u.ANNOTATION_XML, u.MI, u.MN, u.MO, u.MS, u.MTEXT]),
  He = new Set([u.DESC, u.FOREIGN_OBJECT, u.TITLE]),
  Mt = new Set([u.TR, u.TEMPLATE, u.HTML]),
  xt = new Set([u.TBODY, u.TFOOT, u.THEAD, u.TEMPLATE, u.HTML]),
  Bt = new Set([u.TABLE, u.TEMPLATE, u.HTML]),
  kt = new Set([u.TD, u.TH]);
//@ chunk-6ja29j2n.js:117587-122132 esm-fingerprint
class he {
  get currentTmplContentOrNode() {
    return this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : this.current;
  }
  constructor(e, t, a) {
    ((this.treeAdapter = t),
      (this.handler = a),
      (this.items = []),
      (this.tagIDs = []),
      (this.stackTop = -1),
      (this.tmplCount = 0),
      (this.currentTagId = u.UNKNOWN),
      (this.current = e));
  }
  _indexOf(e) {
    return this.items.lastIndexOf(e, this.stackTop);
  }
  _isInTemplate() {
    return this.currentTagId === u.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === E.HTML;
  }
  _updateCurrentElement() {
    ((this.current = this.items[this.stackTop]), (this.currentTagId = this.tagIDs[this.stackTop]));
  }
  push(e, t) {
    if (
      (this.stackTop++,
      (this.items[this.stackTop] = e),
      (this.current = e),
      (this.tagIDs[this.stackTop] = t),
      (this.currentTagId = t),
      this._isInTemplate())
    )
      this.tmplCount++;
    this.handler.onItemPush(e, t, !0);
  }
  pop() {
    let e = this.current;
    if (this.tmplCount > 0 && this._isInTemplate()) this.tmplCount--;
    (this.stackTop--, this._updateCurrentElement(), this.handler.onItemPop(e, !0));
  }
  replace(e, t) {
    let _indexOf = this._indexOf(e);
    if (((this.items[_indexOf] = t), _indexOf === this.stackTop)) this.current = t;
  }
  insertAfter(e, t, a) {
    let n = this._indexOf(e) + 1;
    if ((this.items.splice(n, 0, t), this.tagIDs.splice(n, 0, a), this.stackTop++, n === this.stackTop))
      this._updateCurrentElement();
    this.handler.onItemPush(this.current, this.currentTagId, n === this.stackTop);
  }
  popUntilTagNamePopped(e) {
    let t = this.stackTop + 1;
    do t = this.tagIDs.lastIndexOf(e, t - 1);
    while (t > 0 && this.treeAdapter.getNamespaceURI(this.items[t]) !== E.HTML);
    this.shortenToLength(t < 0 ? 0 : t);
  }
  shortenToLength(e) {
    while (this.stackTop >= e) {
      let t = this.current;
      if (this.tmplCount > 0 && this._isInTemplate()) this.tmplCount -= 1;
      (this.stackTop--, this._updateCurrentElement(), this.handler.onItemPop(t, this.stackTop < e));
    }
  }
  popUntilElementPopped(e) {
    let _indexOf = this._indexOf(e);
    this.shortenToLength(_indexOf < 0 ? 0 : _indexOf);
  }
  popUntilPopped(e, t) {
    let _indexOfTagNames = this._indexOfTagNames(e, t);
    this.shortenToLength(_indexOfTagNames < 0 ? 0 : _indexOfTagNames);
  }
  popUntilNumberedHeaderPopped() {
    this.popUntilPopped(H, E.HTML);
  }
  popUntilTableCellPopped() {
    this.popUntilPopped(kt, E.HTML);
  }
  popAllUpToHtmlElement() {
    ((this.tmplCount = 0), this.shortenToLength(1));
  }
  _indexOfTagNames(e, t) {
    for (let stackTop = this.stackTop; stackTop >= 0; stackTop--)
      if (e.has(this.tagIDs[stackTop]) && this.treeAdapter.getNamespaceURI(this.items[stackTop]) === t)
        return stackTop;
    return -1;
  }
  clearBackTo(e, t) {
    let _indexOfTagNames = this._indexOfTagNames(e, t);
    this.shortenToLength(_indexOfTagNames + 1);
  }
  clearBackToTableContext() {
    this.clearBackTo(Bt, E.HTML);
  }
  clearBackToTableBodyContext() {
    this.clearBackTo(xt, E.HTML);
  }
  clearBackToTableRowContext() {
    this.clearBackTo(Mt, E.HTML);
  }
  remove(e) {
    let _indexOf = this._indexOf(e);
    if (_indexOf >= 0)
      if (_indexOf === this.stackTop) this.pop();
      else
        (this.items.splice(_indexOf, 1),
          this.tagIDs.splice(_indexOf, 1),
          this.stackTop--,
          this._updateCurrentElement(),
          this.handler.onItemPop(e, !1));
  }
  tryPeekProperlyNestedBodyElement() {
    return this.stackTop >= 1 && this.tagIDs[1] === u.BODY ? this.items[1] : null;
  }
  contains(e) {
    return this._indexOf(e) > -1;
  }
  getCommonAncestor(e) {
    let t = this._indexOf(e) - 1;
    return t >= 0 ? this.items[t] : null;
  }
  isRootHtmlElementCurrent() {
    return this.stackTop === 0 && this.tagIDs[0] === u.HTML;
  }
  hasInDynamicScope(e, t) {
    for (let stackTop = this.stackTop; stackTop >= 0; stackTop--) {
      let n = this.tagIDs[stackTop];
      switch (this.treeAdapter.getNamespaceURI(this.items[stackTop])) {
        case E.HTML: {
          if (n === e) return !0;
          if (t.has(n)) return !1;
          break;
        }
        case E.SVG: {
          if (He.has(n)) return !1;
          break;
        }
        case E.MATHML: {
          if (ke.has(n)) return !1;
          break;
        }
      }
    }
    return !0;
  }
  hasInScope(e) {
    return this.hasInDynamicScope(e, ee);
  }
  hasInListItemScope(e) {
    return this.hasInDynamicScope(e, gt);
  }
  hasInButtonScope(e) {
    return this.hasInDynamicScope(e, Pt);
  }
  hasNumberedHeaderInScope() {
    for (let stackTop = this.stackTop; stackTop >= 0; stackTop--) {
      let t = this.tagIDs[stackTop];
      switch (this.treeAdapter.getNamespaceURI(this.items[stackTop])) {
        case E.HTML: {
          if (H.has(t)) return !0;
          if (ee.has(t)) return !1;
          break;
        }
        case E.SVG: {
          if (He.has(t)) return !1;
          break;
        }
        case E.MATHML: {
          if (ke.has(t)) return !1;
          break;
        }
      }
    }
    return !0;
  }
  hasInTableScope(e) {
    for (let stackTop = this.stackTop; stackTop >= 0; stackTop--) {
      if (this.treeAdapter.getNamespaceURI(this.items[stackTop]) !== E.HTML) continue;
      switch (this.tagIDs[stackTop]) {
        case e:
          return !0;
        case u.TABLE:
        case u.HTML:
          return !1;
      }
    }
    return !0;
  }
  hasTableBodyContextInTableScope() {
    for (let stackTop = this.stackTop; stackTop >= 0; stackTop--) {
      if (this.treeAdapter.getNamespaceURI(this.items[stackTop]) !== E.HTML) continue;
      switch (this.tagIDs[stackTop]) {
        case u.TBODY:
        case u.THEAD:
        case u.TFOOT:
          return !0;
        case u.TABLE:
        case u.HTML:
          return !1;
      }
    }
    return !0;
  }
  hasInSelectScope(e) {
    for (let stackTop = this.stackTop; stackTop >= 0; stackTop--) {
      if (this.treeAdapter.getNamespaceURI(this.items[stackTop]) !== E.HTML) continue;
      switch (this.tagIDs[stackTop]) {
        case e:
          return !0;
        case u.OPTION:
        case u.OPTGROUP:
          break;
        default:
          return !1;
      }
    }
    return !0;
  }
  generateImpliedEndTags() {
    while (Ue.has(this.currentTagId)) this.pop();
  }
  generateImpliedEndTagsThoroughly() {
    while (Be.has(this.currentTagId)) this.pop();
  }
  generateImpliedEndTagsWithExclusion(e) {
    while (this.currentTagId !== e && Be.has(this.currentTagId)) this.pop();
  }
}

export { he };
