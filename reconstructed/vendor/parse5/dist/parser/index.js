/**
 * parse5/dist/parser/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (133)
 * attribution: esm-fingerprint 133
 */
import { u, x, ge, H } from "../common/html.js";
import { L } from "../tree-adapters/default.js";
import { Tokenizer, TokenizerMode } from "../tokenizer/index.js";
import { le, p } from "./formatting-element-list.js";
import { he } from "./open-element-stack.js";
import { c, E, O, g } from "../../lib/common/html.js";
import { f, z } from "../common/token.js";
import { Ke, fe, te, me, qe, Xe } from "../common/foreign-content.js";
import { o } from "../../lib/common/error-codes.js";
import { s, m } from "../common/unicode.js";
import { Ge, Qe } from "../common/doctype.js";

//@ chunk-6ja29j2n.js:132780-132808 esm-fingerprint
var HIDDEN = "hidden",
  jt = 8,
  Jt = 3,
  i;
//@ chunk-6ja29j2n.js:132808-133610 esm-fingerprint
(function (e) {
  ((e[(e.INITIAL = 0)] = "INITIAL"),
    (e[(e.BEFORE_HTML = 1)] = "BEFORE_HTML"),
    (e[(e.BEFORE_HEAD = 2)] = "BEFORE_HEAD"),
    (e[(e.IN_HEAD = 3)] = "IN_HEAD"),
    (e[(e.IN_HEAD_NO_SCRIPT = 4)] = "IN_HEAD_NO_SCRIPT"),
    (e[(e.AFTER_HEAD = 5)] = "AFTER_HEAD"),
    (e[(e.IN_BODY = 6)] = "IN_BODY"),
    (e[(e.TEXT = 7)] = "TEXT"),
    (e[(e.IN_TABLE = 8)] = "IN_TABLE"),
    (e[(e.IN_TABLE_TEXT = 9)] = "IN_TABLE_TEXT"),
    (e[(e.IN_CAPTION = 10)] = "IN_CAPTION"),
    (e[(e.IN_COLUMN_GROUP = 11)] = "IN_COLUMN_GROUP"),
    (e[(e.IN_TABLE_BODY = 12)] = "IN_TABLE_BODY"),
    (e[(e.IN_ROW = 13)] = "IN_ROW"),
    (e[(e.IN_CELL = 14)] = "IN_CELL"),
    (e[(e.IN_SELECT = 15)] = "IN_SELECT"),
    (e[(e.IN_SELECT_IN_TABLE = 16)] = "IN_SELECT_IN_TABLE"),
    (e[(e.IN_TEMPLATE = 17)] = "IN_TEMPLATE"),
    (e[(e.AFTER_BODY = 18)] = "AFTER_BODY"),
    (e[(e.IN_FRAMESET = 19)] = "IN_FRAMESET"),
    (e[(e.AFTER_FRAMESET = 20)] = "AFTER_FRAMESET"),
    (e[(e.AFTER_AFTER_BODY = 21)] = "AFTER_AFTER_BODY"),
    (e[(e.AFTER_AFTER_FRAMESET = 22)] = "AFTER_AFTER_FRAMESET"));
})(i || (i = {}));
//@ chunk-6ja29j2n.js:133610-133827 esm-fingerprint
var $t = { startLine: -1, startCol: -1, startOffset: -1, endLine: -1, endCol: -1, endOffset: -1 },
  $e = new Set([u.TABLE, u.TBODY, u.TFOOT, u.THEAD, u.TR]),
  ze = { scriptingEnabled: !0, sourceCodeLocationInfo: !1, treeAdapter: L, onParseError: null };
//@ chunk-6ja29j2n.js:133827-150244 esm-fingerprint
class re {
  constructor(e, t, a = null, n = null) {
    if (
      ((this.fragmentContext = a),
      (this.scriptHandler = n),
      (this.currentToken = null),
      (this.stopped = !1),
      (this.insertionMode = i.INITIAL),
      (this.originalInsertionMode = i.INITIAL),
      (this.headElement = null),
      (this.formElement = null),
      (this.currentNotInHTML = !1),
      (this.tmplInsertionModeStack = []),
      (this.pendingCharacterTokens = []),
      (this.hasNonWhitespacePendingCharacterToken = !1),
      (this.framesetOk = !0),
      (this.skipNextNewLine = !1),
      (this.fosterParentingEnabled = !1),
      (this.options = { ...ze, ...e }),
      (this.treeAdapter = this.options.treeAdapter),
      (this.onParseError = this.options.onParseError),
      this.onParseError)
    )
      this.options.sourceCodeLocationInfo = !0;
    ((this.document = t !== null && t !== void 0 ? t : this.treeAdapter.createDocument()),
      (this.tokenizer = new Tokenizer(this.options, this)),
      (this.activeFormattingElements = new le(this.treeAdapter)),
      (this.fragmentContextID = a ? x(this.treeAdapter.getTagName(a)) : u.UNKNOWN),
      this._setContextModes(a !== null && a !== void 0 ? a : this.document, this.fragmentContextID),
      (this.openElements = new he(this.document, this.treeAdapter, this)));
  }
  static parse(e, t) {
    let a = new this(t);
    return (a.tokenizer.write(e, !0), a.document);
  }
  static getFragmentParser(e, t) {
    let a = { ...ze, ...t };
    (e !== null && e !== void 0) || (e = a.treeAdapter.createElement(c.TEMPLATE, E.HTML, []));
    let element = a.treeAdapter.createElement("documentmock", E.HTML, []),
      d = new this(a, element, e);
    if (d.fragmentContextID === u.TEMPLATE) d.tmplInsertionModeStack.unshift(i.IN_TEMPLATE);
    return (
      d._initTokenizerForFragmentParsing(),
      d._insertFakeRootElement(),
      d._resetInsertionMode(),
      d._findFormInFragmentContext(),
      d
    );
  }
  getFragment() {
    let firstChild = this.treeAdapter.getFirstChild(this.document),
      documentFragment = this.treeAdapter.createDocumentFragment();
    return (this._adoptNodes(firstChild, documentFragment), documentFragment);
  }
  _err(e, t, a) {
    var n;
    if (!this.onParseError) return;
    let d = (n = e.location) !== null && n !== void 0 ? n : $t,
      h = {
        code: t,
        startLine: d.startLine,
        startCol: d.startCol,
        startOffset: d.startOffset,
        endLine: a ? d.startLine : d.endLine,
        endCol: a ? d.startCol : d.endCol,
        endOffset: a ? d.startOffset : d.endOffset,
      };
    this.onParseError(h);
  }
  onItemPush(e, t, a) {
    var n, d;
    if (
      ((d = (n = this.treeAdapter).onItemPush) === null || d === void 0 || d.call(n, e),
      a && this.openElements.stackTop > 0)
    )
      this._setContextModes(e, t);
  }
  onItemPop(e, t) {
    var a, n;
    if (this.options.sourceCodeLocationInfo) this._setEndLocation(e, this.currentToken);
    if (
      ((n = (a = this.treeAdapter).onItemPop) === null ||
        n === void 0 ||
        n.call(a, e, this.openElements.current),
      t)
    ) {
      let d, h;
      if (this.openElements.stackTop === 0 && this.fragmentContext)
        ((d = this.fragmentContext), (h = this.fragmentContextID));
      else ({ current: d, currentTagId: h } = this.openElements);
      this._setContextModes(d, h);
    }
  }
  _setContextModes(e, t) {
    let a = e === this.document || this.treeAdapter.getNamespaceURI(e) === E.HTML;
    ((this.currentNotInHTML = !a), (this.tokenizer.inForeignNode = !a && !this._isIntegrationPoint(t, e)));
  }
  _switchToTextParsing(e, t) {
    (this._insertElement(e, E.HTML),
      (this.tokenizer.state = t),
      (this.originalInsertionMode = this.insertionMode),
      (this.insertionMode = i.TEXT));
  }
  switchToPlaintextParsing() {
    ((this.insertionMode = i.TEXT),
      (this.originalInsertionMode = i.IN_BODY),
      (this.tokenizer.state = TokenizerMode.PLAINTEXT));
  }
  _getAdjustedCurrentElement() {
    return this.openElements.stackTop === 0 && this.fragmentContext
      ? this.fragmentContext
      : this.openElements.current;
  }
  _findFormInFragmentContext() {
    let fragmentContext = this.fragmentContext;
    while (fragmentContext) {
      if (this.treeAdapter.getTagName(fragmentContext) === c.FORM) {
        this.formElement = fragmentContext;
        break;
      }
      fragmentContext = this.treeAdapter.getParentNode(fragmentContext);
    }
  }
  _initTokenizerForFragmentParsing() {
    if (!this.fragmentContext || this.treeAdapter.getNamespaceURI(this.fragmentContext) !== E.HTML) return;
    switch (this.fragmentContextID) {
      case u.TITLE:
      case u.TEXTAREA: {
        this.tokenizer.state = TokenizerMode.RCDATA;
        break;
      }
      case u.STYLE:
      case u.XMP:
      case u.IFRAME:
      case u.NOEMBED:
      case u.NOFRAMES:
      case u.NOSCRIPT: {
        this.tokenizer.state = TokenizerMode.RAWTEXT;
        break;
      }
      case u.SCRIPT: {
        this.tokenizer.state = TokenizerMode.SCRIPT_DATA;
        break;
      }
      case u.PLAINTEXT: {
        this.tokenizer.state = TokenizerMode.PLAINTEXT;
        break;
      }
      default:
    }
  }
  _setDocumentType(e) {
    let t = e.name || "",
      a = e.publicId || "",
      n = e.systemId || "";
    if ((this.treeAdapter.setDocumentType(this.document, t, a, n), e.location)) {
      let found = this.treeAdapter
        .getChildNodes(this.document)
        .find((l) => this.treeAdapter.isDocumentTypeNode(l));
      if (found) this.treeAdapter.setNodeSourceCodeLocation(found, e.location);
    }
  }
  _attachElementToTree(e, t) {
    if (this.options.sourceCodeLocationInfo) {
      let a = t && { ...t, startTag: t };
      this.treeAdapter.setNodeSourceCodeLocation(e, a);
    }
    if (this._shouldFosterParentOnInsertion()) this._fosterParentElement(e);
    else {
      let currentTmplContentOrNode = this.openElements.currentTmplContentOrNode;
      this.treeAdapter.appendChild(currentTmplContentOrNode, e);
    }
  }
  _appendElement(e, t) {
    let element = this.treeAdapter.createElement(e.tagName, t, e.attrs);
    this._attachElementToTree(element, e.location);
  }
  _insertElement(e, t) {
    let element = this.treeAdapter.createElement(e.tagName, t, e.attrs);
    (this._attachElementToTree(element, e.location), this.openElements.push(element, e.tagID));
  }
  _insertFakeElement(e, t) {
    let element = this.treeAdapter.createElement(e, E.HTML, []);
    (this._attachElementToTree(element, null), this.openElements.push(element, t));
  }
  _insertTemplate(e) {
    let element = this.treeAdapter.createElement(e.tagName, E.HTML, e.attrs),
      documentFragment = this.treeAdapter.createDocumentFragment();
    if (
      (this.treeAdapter.setTemplateContent(element, documentFragment),
      this._attachElementToTree(element, e.location),
      this.openElements.push(element, e.tagID),
      this.options.sourceCodeLocationInfo)
    )
      this.treeAdapter.setNodeSourceCodeLocation(documentFragment, null);
  }
  _insertFakeRootElement() {
    let element = this.treeAdapter.createElement(c.HTML, E.HTML, []);
    if (this.options.sourceCodeLocationInfo) this.treeAdapter.setNodeSourceCodeLocation(element, null);
    (this.treeAdapter.appendChild(this.openElements.current, element),
      this.openElements.push(element, u.HTML));
  }
  _appendCommentNode(e, t) {
    let commentNode = this.treeAdapter.createCommentNode(e.data);
    if ((this.treeAdapter.appendChild(t, commentNode), this.options.sourceCodeLocationInfo))
      this.treeAdapter.setNodeSourceCodeLocation(commentNode, e.location);
  }
  _insertCharacters(e) {
    let t, a;
    if (this._shouldFosterParentOnInsertion())
      if ((({ parent: t, beforeElement: a } = this._findFosterParentingLocation()), a))
        this.treeAdapter.insertTextBefore(t, e.chars, a);
      else this.treeAdapter.insertText(t, e.chars);
    else ((t = this.openElements.currentTmplContentOrNode), this.treeAdapter.insertText(t, e.chars));
    if (!e.location) return;
    let childNodes = this.treeAdapter.getChildNodes(t),
      d = a ? childNodes.lastIndexOf(a) : childNodes.length,
      h = childNodes[d - 1];
    if (this.treeAdapter.getNodeSourceCodeLocation(h)) {
      let { endLine: endLine, endCol: endCol, endOffset: endOffset } = e.location;
      this.treeAdapter.updateNodeSourceCodeLocation(h, {
        endLine: endLine,
        endCol: endCol,
        endOffset: endOffset,
      });
    } else if (this.options.sourceCodeLocationInfo) this.treeAdapter.setNodeSourceCodeLocation(h, e.location);
  }
  _adoptNodes(e, t) {
    for (
      let firstChild = this.treeAdapter.getFirstChild(e);
      firstChild;
      firstChild = this.treeAdapter.getFirstChild(e)
    )
      (this.treeAdapter.detachNode(firstChild), this.treeAdapter.appendChild(t, firstChild));
  }
  _setEndLocation(e, t) {
    if (this.treeAdapter.getNodeSourceCodeLocation(e) && t.location) {
      let location = t.location,
        tagName = this.treeAdapter.getTagName(e),
        d =
          t.type === f.END_TAG && tagName === t.tagName
            ? {
                endTag: { ...location },
                endLine: location.endLine,
                endCol: location.endCol,
                endOffset: location.endOffset,
              }
            : { endLine: location.startLine, endCol: location.startCol, endOffset: location.startOffset };
      this.treeAdapter.updateNodeSourceCodeLocation(e, d);
    }
  }
  shouldProcessStartTagTokenInForeignContent(e) {
    if (!this.currentNotInHTML) return !1;
    let t, a;
    if (this.openElements.stackTop === 0 && this.fragmentContext)
      ((t = this.fragmentContext), (a = this.fragmentContextID));
    else ({ current: t, currentTagId: a } = this.openElements);
    if (
      e.tagID === u.SVG &&
      this.treeAdapter.getTagName(t) === c.ANNOTATION_XML &&
      this.treeAdapter.getNamespaceURI(t) === E.MATHML
    )
      return !1;
    return (
      this.tokenizer.inForeignNode ||
      ((e.tagID === u.MGLYPH || e.tagID === u.MALIGNMARK) && !this._isIntegrationPoint(a, t, E.HTML))
    );
  }
  _processToken(e) {
    switch (e.type) {
      case f.CHARACTER: {
        this.onCharacter(e);
        break;
      }
      case f.NULL_CHARACTER: {
        this.onNullCharacter(e);
        break;
      }
      case f.COMMENT: {
        this.onComment(e);
        break;
      }
      case f.DOCTYPE: {
        this.onDoctype(e);
        break;
      }
      case f.START_TAG: {
        this._processStartTag(e);
        break;
      }
      case f.END_TAG: {
        this.onEndTag(e);
        break;
      }
      case f.EOF: {
        this.onEof(e);
        break;
      }
      case f.WHITESPACE_CHARACTER: {
        this.onWhitespaceCharacter(e);
        break;
      }
    }
  }
  _isIntegrationPoint(e, t, a) {
    let namespaceURI = this.treeAdapter.getNamespaceURI(t),
      attrList = this.treeAdapter.getAttrList(t);
    return Ke(e, namespaceURI, attrList, a);
  }
  _reconstructActiveFormattingElements() {
    let e = this.activeFormattingElements.entries.length;
    if (e) {
      let index = this.activeFormattingElements.entries.findIndex(
          (entry) => entry.type === p.Marker || this.openElements.contains(entry.element),
        ),
        a = index < 0 ? e - 1 : index - 1;
      for (let n = a; n >= 0; n--) {
        let d = this.activeFormattingElements.entries[n];
        (this._insertElement(d.token, this.treeAdapter.getNamespaceURI(d.element)),
          (d.element = this.openElements.current));
      }
    }
  }
  _closeTableCell() {
    (this.openElements.generateImpliedEndTags(),
      this.openElements.popUntilTableCellPopped(),
      this.activeFormattingElements.clearToLastMarker(),
      (this.insertionMode = i.IN_ROW));
  }
  _closePElement() {
    (this.openElements.generateImpliedEndTagsWithExclusion(u.P),
      this.openElements.popUntilTagNamePopped(u.P));
  }
  _resetInsertionMode() {
    for (let stackTop = this.openElements.stackTop; stackTop >= 0; stackTop--)
      switch (
        stackTop === 0 && this.fragmentContext ? this.fragmentContextID : this.openElements.tagIDs[stackTop]
      ) {
        case u.TR: {
          this.insertionMode = i.IN_ROW;
          return;
        }
        case u.TBODY:
        case u.THEAD:
        case u.TFOOT: {
          this.insertionMode = i.IN_TABLE_BODY;
          return;
        }
        case u.CAPTION: {
          this.insertionMode = i.IN_CAPTION;
          return;
        }
        case u.COLGROUP: {
          this.insertionMode = i.IN_COLUMN_GROUP;
          return;
        }
        case u.TABLE: {
          this.insertionMode = i.IN_TABLE;
          return;
        }
        case u.BODY: {
          this.insertionMode = i.IN_BODY;
          return;
        }
        case u.FRAMESET: {
          this.insertionMode = i.IN_FRAMESET;
          return;
        }
        case u.SELECT: {
          this._resetInsertionModeForSelect(stackTop);
          return;
        }
        case u.TEMPLATE: {
          this.insertionMode = this.tmplInsertionModeStack[0];
          return;
        }
        case u.HTML: {
          this.insertionMode = this.headElement ? i.AFTER_HEAD : i.BEFORE_HEAD;
          return;
        }
        case u.TD:
        case u.TH: {
          if (stackTop > 0) {
            this.insertionMode = i.IN_CELL;
            return;
          }
          break;
        }
        case u.HEAD: {
          if (stackTop > 0) {
            this.insertionMode = i.IN_HEAD;
            return;
          }
          break;
        }
      }
    this.insertionMode = i.IN_BODY;
  }
  _resetInsertionModeForSelect(e) {
    if (e > 0)
      for (let t = e - 1; t > 0; t--) {
        let a = this.openElements.tagIDs[t];
        if (a === u.TEMPLATE) break;
        else if (a === u.TABLE) {
          this.insertionMode = i.IN_SELECT_IN_TABLE;
          return;
        }
      }
    this.insertionMode = i.IN_SELECT;
  }
  _isElementCausesFosterParenting(e) {
    return $e.has(e);
  }
  _shouldFosterParentOnInsertion() {
    return (
      this.fosterParentingEnabled && this._isElementCausesFosterParenting(this.openElements.currentTagId)
    );
  }
  _findFosterParentingLocation() {
    for (let stackTop = this.openElements.stackTop; stackTop >= 0; stackTop--) {
      let t = this.openElements.items[stackTop];
      switch (this.openElements.tagIDs[stackTop]) {
        case u.TEMPLATE: {
          if (this.treeAdapter.getNamespaceURI(t) === E.HTML)
            return { parent: this.treeAdapter.getTemplateContent(t), beforeElement: null };
          break;
        }
        case u.TABLE: {
          let parentNode = this.treeAdapter.getParentNode(t);
          if (parentNode) return { parent: parentNode, beforeElement: t };
          return { parent: this.openElements.items[stackTop - 1], beforeElement: null };
        }
        default:
      }
    }
    return { parent: this.openElements.items[0], beforeElement: null };
  }
  _fosterParentElement(e) {
    let _findFosterParentingLocation = this._findFosterParentingLocation();
    if (_findFosterParentingLocation.beforeElement)
      this.treeAdapter.insertBefore(
        _findFosterParentingLocation.parent,
        e,
        _findFosterParentingLocation.beforeElement,
      );
    else this.treeAdapter.appendChild(_findFosterParentingLocation.parent, e);
  }
  _isSpecialElement(e, t) {
    let namespaceURI = this.treeAdapter.getNamespaceURI(e);
    return ge[namespaceURI].has(t);
  }
  onCharacter(e) {
    if (((this.skipNextNewLine = !1), this.tokenizer.inForeignNode)) {
      Da(this, e);
      return;
    }
    switch (this.insertionMode) {
      case i.INITIAL: {
        F(this, e);
        break;
      }
      case i.BEFORE_HTML: {
        w(this, e);
        break;
      }
      case i.BEFORE_HEAD: {
        Y(this, e);
        break;
      }
      case i.IN_HEAD: {
        v(this, e);
        break;
      }
      case i.IN_HEAD_NO_SCRIPT: {
        Q(this, e);
        break;
      }
      case i.AFTER_HEAD: {
        G(this, e);
        break;
      }
      case i.IN_BODY:
      case i.IN_CAPTION:
      case i.IN_CELL:
      case i.IN_TEMPLATE: {
        et(this, e);
        break;
      }
      case i.TEXT:
      case i.IN_SELECT:
      case i.IN_SELECT_IN_TABLE: {
        this._insertCharacters(e);
        break;
      }
      case i.IN_TABLE:
      case i.IN_TABLE_BODY:
      case i.IN_ROW: {
        _e(this, e);
        break;
      }
      case i.IN_TABLE_TEXT: {
        it(this, e);
        break;
      }
      case i.IN_COLUMN_GROUP: {
        ae(this, e);
        break;
      }
      case i.AFTER_BODY: {
        se(this, e);
        break;
      }
      case i.AFTER_AFTER_BODY: {
        ue(this, e);
        break;
      }
      default:
    }
  }
  onNullCharacter(e) {
    if (((this.skipNextNewLine = !1), this.tokenizer.inForeignNode)) {
      Ra(this, e);
      return;
    }
    switch (this.insertionMode) {
      case i.INITIAL: {
        F(this, e);
        break;
      }
      case i.BEFORE_HTML: {
        w(this, e);
        break;
      }
      case i.BEFORE_HEAD: {
        Y(this, e);
        break;
      }
      case i.IN_HEAD: {
        v(this, e);
        break;
      }
      case i.IN_HEAD_NO_SCRIPT: {
        Q(this, e);
        break;
      }
      case i.AFTER_HEAD: {
        G(this, e);
        break;
      }
      case i.TEXT: {
        this._insertCharacters(e);
        break;
      }
      case i.IN_TABLE:
      case i.IN_TABLE_BODY:
      case i.IN_ROW: {
        _e(this, e);
        break;
      }
      case i.IN_COLUMN_GROUP: {
        ae(this, e);
        break;
      }
      case i.AFTER_BODY: {
        se(this, e);
        break;
      }
      case i.AFTER_AFTER_BODY: {
        ue(this, e);
        break;
      }
      default:
    }
  }
  onComment(e) {
    if (((this.skipNextNewLine = !1), this.currentNotInHTML)) {
      be(this, e);
      return;
    }
    switch (this.insertionMode) {
      case i.INITIAL:
      case i.BEFORE_HTML:
      case i.BEFORE_HEAD:
      case i.IN_HEAD:
      case i.IN_HEAD_NO_SCRIPT:
      case i.AFTER_HEAD:
      case i.IN_BODY:
      case i.IN_TABLE:
      case i.IN_CAPTION:
      case i.IN_COLUMN_GROUP:
      case i.IN_TABLE_BODY:
      case i.IN_ROW:
      case i.IN_CELL:
      case i.IN_SELECT:
      case i.IN_SELECT_IN_TABLE:
      case i.IN_TEMPLATE:
      case i.IN_FRAMESET:
      case i.AFTER_FRAMESET: {
        be(this, e);
        break;
      }
      case i.IN_TABLE_TEXT: {
        y(this, e);
        break;
      }
      case i.AFTER_BODY: {
        ru(this, e);
        break;
      }
      case i.AFTER_AFTER_BODY:
      case i.AFTER_AFTER_FRAMESET: {
        iu(this, e);
        break;
      }
      default:
    }
  }
  onDoctype(e) {
    switch (((this.skipNextNewLine = !1), this.insertionMode)) {
      case i.INITIAL: {
        nu(this, e);
        break;
      }
      case i.BEFORE_HEAD:
      case i.IN_HEAD:
      case i.IN_HEAD_NO_SCRIPT:
      case i.AFTER_HEAD: {
        this._err(e, o.misplacedDoctype);
        break;
      }
      case i.IN_TABLE_TEXT: {
        y(this, e);
        break;
      }
      default:
    }
  }
  onStartTag(e) {
    if (
      ((this.skipNextNewLine = !1),
      (this.currentToken = e),
      this._processStartTag(e),
      e.selfClosing && !e.ackSelfClosing)
    )
      this._err(e, o.nonVoidHtmlElementStartTagWithTrailingSolidus);
  }
  _processStartTag(e) {
    if (this.shouldProcessStartTagTokenInForeignContent(e)) ga(this, e);
    else this._startTagOutsideForeignContent(e);
  }
  _startTagOutsideForeignContent(e) {
    switch (this.insertionMode) {
      case i.INITIAL: {
        F(this, e);
        break;
      }
      case i.BEFORE_HTML: {
        cu(this, e);
        break;
      }
      case i.BEFORE_HEAD: {
        du(this, e);
        break;
      }
      case i.IN_HEAD: {
        R(this, e);
        break;
      }
      case i.IN_HEAD_NO_SCRIPT: {
        hu(this, e);
        break;
      }
      case i.AFTER_HEAD: {
        fu(this, e);
        break;
      }
      case i.IN_BODY: {
        I(this, e);
        break;
      }
      case i.IN_TABLE: {
        k(this, e);
        break;
      }
      case i.IN_TABLE_TEXT: {
        y(this, e);
        break;
      }
      case i.IN_CAPTION: {
        Ea(this, e);
        break;
      }
      case i.IN_COLUMN_GROUP: {
        Ce(this, e);
        break;
      }
      case i.IN_TABLE_BODY: {
        ce(this, e);
        break;
      }
      case i.IN_ROW: {
        oe(this, e);
        break;
      }
      case i.IN_CELL: {
        la(this, e);
        break;
      }
      case i.IN_SELECT: {
        ot(this, e);
        break;
      }
      case i.IN_SELECT_IN_TABLE: {
        ma(this, e);
        break;
      }
      case i.IN_TEMPLATE: {
        ba(this, e);
        break;
      }
      case i.AFTER_BODY: {
        Na(this, e);
        break;
      }
      case i.IN_FRAMESET: {
        Ia(this, e);
        break;
      }
      case i.AFTER_FRAMESET: {
        Oa(this, e);
        break;
      }
      case i.AFTER_AFTER_BODY: {
        pa(this, e);
        break;
      }
      case i.AFTER_AFTER_FRAMESET: {
        La(this, e);
        break;
      }
      default:
    }
  }
  onEndTag(e) {
    if (((this.skipNextNewLine = !1), (this.currentToken = e), this.currentNotInHTML)) Pa(this, e);
    else this._endTagOutsideForeignContent(e);
  }
  _endTagOutsideForeignContent(e) {
    switch (this.insertionMode) {
      case i.INITIAL: {
        F(this, e);
        break;
      }
      case i.BEFORE_HTML: {
        ou(this, e);
        break;
      }
      case i.BEFORE_HEAD: {
        Eu(this, e);
        break;
      }
      case i.IN_HEAD: {
        Tu(this, e);
        break;
      }
      case i.IN_HEAD_NO_SCRIPT: {
        lu(this, e);
        break;
      }
      case i.AFTER_HEAD: {
        mu(this, e);
        break;
      }
      case i.IN_BODY: {
        ne(this, e);
        break;
      }
      case i.TEXT: {
        ta(this, e);
        break;
      }
      case i.IN_TABLE: {
        W(this, e);
        break;
      }
      case i.IN_TABLE_TEXT: {
        y(this, e);
        break;
      }
      case i.IN_CAPTION: {
        Ta(this, e);
        break;
      }
      case i.IN_COLUMN_GROUP: {
        ha(this, e);
        break;
      }
      case i.IN_TABLE_BODY: {
        Ae(this, e);
        break;
      }
      case i.IN_ROW: {
        ct(this, e);
        break;
      }
      case i.IN_CELL: {
        fa(this, e);
        break;
      }
      case i.IN_SELECT: {
        dt(this, e);
        break;
      }
      case i.IN_SELECT_IN_TABLE: {
        _a(this, e);
        break;
      }
      case i.IN_TEMPLATE: {
        Aa(this, e);
        break;
      }
      case i.AFTER_BODY: {
        Tt(this, e);
        break;
      }
      case i.IN_FRAMESET: {
        Ca(this, e);
        break;
      }
      case i.AFTER_FRAMESET: {
        Sa(this, e);
        break;
      }
      case i.AFTER_AFTER_BODY: {
        ue(this, e);
        break;
      }
      default:
    }
  }
  onEof(e) {
    switch (this.insertionMode) {
      case i.INITIAL: {
        F(this, e);
        break;
      }
      case i.BEFORE_HTML: {
        w(this, e);
        break;
      }
      case i.BEFORE_HEAD: {
        Y(this, e);
        break;
      }
      case i.IN_HEAD: {
        v(this, e);
        break;
      }
      case i.IN_HEAD_NO_SCRIPT: {
        Q(this, e);
        break;
      }
      case i.AFTER_HEAD: {
        G(this, e);
        break;
      }
      case i.IN_BODY:
      case i.IN_TABLE:
      case i.IN_CAPTION:
      case i.IN_COLUMN_GROUP:
      case i.IN_TABLE_BODY:
      case i.IN_ROW:
      case i.IN_CELL:
      case i.IN_SELECT:
      case i.IN_SELECT_IN_TABLE: {
        st(this, e);
        break;
      }
      case i.TEXT: {
        ua(this, e);
        break;
      }
      case i.IN_TABLE_TEXT: {
        y(this, e);
        break;
      }
      case i.IN_TEMPLATE: {
        Et(this, e);
        break;
      }
      case i.AFTER_BODY:
      case i.IN_FRAMESET:
      case i.AFTER_FRAMESET:
      case i.AFTER_AFTER_BODY:
      case i.AFTER_AFTER_FRAMESET: {
        Ie(this, e);
        break;
      }
      default:
    }
  }
  onWhitespaceCharacter(e) {
    if (this.skipNextNewLine) {
      if (((this.skipNextNewLine = !1), e.chars.charCodeAt(0) === s.LINE_FEED)) {
        if (e.chars.length === 1) return;
        e.chars = e.chars.substr(1);
      }
    }
    if (this.tokenizer.inForeignNode) {
      this._insertCharacters(e);
      return;
    }
    switch (this.insertionMode) {
      case i.IN_HEAD:
      case i.IN_HEAD_NO_SCRIPT:
      case i.AFTER_HEAD:
      case i.TEXT:
      case i.IN_COLUMN_GROUP:
      case i.IN_SELECT:
      case i.IN_SELECT_IN_TABLE:
      case i.IN_FRAMESET:
      case i.AFTER_FRAMESET: {
        this._insertCharacters(e);
        break;
      }
      case i.IN_BODY:
      case i.IN_CAPTION:
      case i.IN_CELL:
      case i.IN_TEMPLATE:
      case i.AFTER_BODY:
      case i.AFTER_AFTER_BODY:
      case i.AFTER_AFTER_FRAMESET: {
        Ze(this, e);
        break;
      }
      case i.IN_TABLE:
      case i.IN_TABLE_BODY:
      case i.IN_ROW: {
        _e(this, e);
        break;
      }
      case i.IN_TABLE_TEXT: {
        rt(this, e);
        break;
      }
      default:
    }
  }
}
//@ chunk-6ja29j2n.js:150244-150506 esm-fingerprint
function Zt(e, t) {
  let elementEntryInScopeWithTagName = e.activeFormattingElements.getElementEntryInScopeWithTagName(
    t.tagName,
  );
  if (elementEntryInScopeWithTagName) {
    if (!e.openElements.contains(elementEntryInScopeWithTagName.element))
      (e.activeFormattingElements.removeEntry(elementEntryInScopeWithTagName),
        (elementEntryInScopeWithTagName = null));
    else if (!e.openElements.hasInScope(t.tagID)) elementEntryInScopeWithTagName = null;
  } else at(e, t);
  return elementEntryInScopeWithTagName;
}
//@ chunk-6ja29j2n.js:150506-150780 esm-fingerprint
function eu(e, t) {
  let a = null,
    stackTop = e.openElements.stackTop;
  for (; stackTop >= 0; stackTop--) {
    let d = e.openElements.items[stackTop];
    if (d === t.element) break;
    if (e._isSpecialElement(d, e.openElements.tagIDs[stackTop])) a = d;
  }
  if (!a)
    (e.openElements.shortenToLength(stackTop < 0 ? 0 : stackTop), e.activeFormattingElements.removeEntry(t));
  return a;
}
//@ chunk-6ja29j2n.js:150780-151194 esm-fingerprint
function tu(e, t, a) {
  let n = t,
    commonAncestor = e.openElements.getCommonAncestor(t);
  for (let h = 0, l = commonAncestor; l !== a; h++, l = commonAncestor) {
    commonAncestor = e.openElements.getCommonAncestor(l);
    let elementEntry = e.activeFormattingElements.getElementEntry(l),
      b = elementEntry && h >= Jt;
    if (!elementEntry || b) {
      if (b) e.activeFormattingElements.removeEntry(elementEntry);
      e.openElements.remove(l);
    } else {
      if (((l = uu(e, elementEntry)), n === t)) e.activeFormattingElements.bookmark = elementEntry;
      (e.treeAdapter.detachNode(n), e.treeAdapter.appendChild(l, n), (n = l));
    }
  }
  return n;
}
//@ chunk-6ja29j2n.js:151194-151378 esm-fingerprint
function uu(e, t) {
  let namespaceURI = e.treeAdapter.getNamespaceURI(t.element),
    element = e.treeAdapter.createElement(t.token.tagName, namespaceURI, t.token.attrs);
  return (e.openElements.replace(t.element, element), (t.element = element), element);
}
//@ chunk-6ja29j2n.js:151378-151648 esm-fingerprint
function au(e, t, a) {
  let tagName = e.treeAdapter.getTagName(t),
    d = x(tagName);
  if (e._isElementCausesFosterParenting(d)) e._fosterParentElement(a);
  else {
    let namespaceURI = e.treeAdapter.getNamespaceURI(t);
    if (d === u.TEMPLATE && namespaceURI === E.HTML) t = e.treeAdapter.getTemplateContent(t);
    e.treeAdapter.appendChild(t, a);
  }
}
//@ chunk-6ja29j2n.js:151648-152001 esm-fingerprint
function su(e, t, a) {
  let namespaceURI = e.treeAdapter.getNamespaceURI(a.element),
    { token: token } = a,
    element = e.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
  (e._adoptNodes(t, element),
    e.treeAdapter.appendChild(t, element),
    e.activeFormattingElements.insertElementAfterBookmark(element, token),
    e.activeFormattingElements.removeEntry(a),
    e.openElements.remove(a.element),
    e.openElements.insertAfter(t, element, token.tagID));
}
//@ chunk-6ja29j2n.js:152001-152254 esm-fingerprint
function Ne(e, t) {
  for (let a = 0; a < jt; a++) {
    let n = Zt(e, t);
    if (!n) break;
    let d = eu(e, n);
    if (!d) break;
    e.activeFormattingElements.bookmark = n;
    let h = tu(e, d, n.element),
      commonAncestor = e.openElements.getCommonAncestor(n.element);
    if ((e.treeAdapter.detachNode(h), commonAncestor)) au(e, commonAncestor, h);
    su(e, d, n);
  }
}
//@ chunk-6ja29j2n.js:152254-152335 esm-fingerprint
function be(e, t) {
  e._appendCommentNode(t, e.openElements.currentTmplContentOrNode);
}
//@ chunk-6ja29j2n.js:152335-152400 esm-fingerprint
function ru(e, t) {
  e._appendCommentNode(t, e.openElements.items[0]);
}
//@ chunk-6ja29j2n.js:152400-152452 esm-fingerprint
function iu(e, t) {
  e._appendCommentNode(t, e.document);
}
//@ chunk-6ja29j2n.js:152452-152928 esm-fingerprint
function Ie(e, t) {
  if (((e.stopped = !0), t.location)) {
    let a = e.fragmentContext ? 0 : 2;
    for (let stackTop = e.openElements.stackTop; stackTop >= a; stackTop--)
      e._setEndLocation(e.openElements.items[stackTop], t);
    if (!e.fragmentContext && e.openElements.stackTop >= 0) {
      let n = e.openElements.items[0],
        nodeSourceCodeLocation = e.treeAdapter.getNodeSourceCodeLocation(n);
      if (nodeSourceCodeLocation && !nodeSourceCodeLocation.endTag) {
        if ((e._setEndLocation(n, t), e.openElements.stackTop >= 1)) {
          let h = e.openElements.items[1],
            nodeSourceCodeLocation = e.treeAdapter.getNodeSourceCodeLocation(h);
          if (nodeSourceCodeLocation && !nodeSourceCodeLocation.endTag) e._setEndLocation(h, t);
        }
      }
    }
  }
}
//@ chunk-6ja29j2n.js:152928-153119 esm-fingerprint
function nu(e, t) {
  e._setDocumentType(t);
  let a = t.forceQuirks ? O.QUIRKS : Ge(t);
  if (!Qe(t)) e._err(t, o.nonConformingDoctype);
  (e.treeAdapter.setDocumentMode(e.document, a), (e.insertionMode = i.BEFORE_HTML));
}
//@ chunk-6ja29j2n.js:153119-153265 esm-fingerprint
function F(e, t) {
  (e._err(t, o.missingDoctype, !0),
    e.treeAdapter.setDocumentMode(e.document, O.QUIRKS),
    (e.insertionMode = i.BEFORE_HTML),
    e._processToken(t));
}
//@ chunk-6ja29j2n.js:153265-153371 esm-fingerprint
function cu(e, t) {
  if (t.tagID === u.HTML) (e._insertElement(t, E.HTML), (e.insertionMode = i.BEFORE_HEAD));
  else w(e, t);
}
//@ chunk-6ja29j2n.js:153371-153457 esm-fingerprint
function ou(e, t) {
  let tagID = t.tagID;
  if (tagID === u.HTML || tagID === u.HEAD || tagID === u.BODY || tagID === u.BR) w(e, t);
}
//@ chunk-6ja29j2n.js:153457-153549 esm-fingerprint
function w(e, t) {
  (e._insertFakeRootElement(), (e.insertionMode = i.BEFORE_HEAD), e._processToken(t));
}
//@ chunk-6ja29j2n.js:153549-153733 esm-fingerprint
function du(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.HEAD: {
      (e._insertElement(t, E.HTML), (e.headElement = e.openElements.current), (e.insertionMode = i.IN_HEAD));
      break;
    }
    default:
      Y(e, t);
  }
}
//@ chunk-6ja29j2n.js:153733-153869 esm-fingerprint
function Eu(e, t) {
  let tagID = t.tagID;
  if (tagID === u.HEAD || tagID === u.BODY || tagID === u.HTML || tagID === u.BR) Y(e, t);
  else e._err(t, o.endTagWithoutMatchingOpenElement);
}
//@ chunk-6ja29j2n.js:153869-154003 esm-fingerprint
function Y(e, t) {
  (e._insertFakeElement(c.HEAD, u.HEAD),
    (e.headElement = e.openElements.current),
    (e.insertionMode = i.IN_HEAD),
    e._processToken(t));
}
//@ chunk-6ja29j2n.js:154003-154790 esm-fingerprint
function R(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.BASE:
    case u.BASEFONT:
    case u.BGSOUND:
    case u.LINK:
    case u.META: {
      (e._appendElement(t, E.HTML), (t.ackSelfClosing = !0));
      break;
    }
    case u.TITLE: {
      e._switchToTextParsing(t, TokenizerMode.RCDATA);
      break;
    }
    case u.NOSCRIPT: {
      if (e.options.scriptingEnabled) e._switchToTextParsing(t, TokenizerMode.RAWTEXT);
      else (e._insertElement(t, E.HTML), (e.insertionMode = i.IN_HEAD_NO_SCRIPT));
      break;
    }
    case u.NOFRAMES:
    case u.STYLE: {
      e._switchToTextParsing(t, TokenizerMode.RAWTEXT);
      break;
    }
    case u.SCRIPT: {
      e._switchToTextParsing(t, TokenizerMode.SCRIPT_DATA);
      break;
    }
    case u.TEMPLATE: {
      (e._insertTemplate(t),
        e.activeFormattingElements.insertMarker(),
        (e.framesetOk = !1),
        (e.insertionMode = i.IN_TEMPLATE),
        e.tmplInsertionModeStack.unshift(i.IN_TEMPLATE));
      break;
    }
    case u.HEAD: {
      e._err(t, o.misplacedStartTagForHeadElement);
      break;
    }
    default:
      v(e, t);
  }
}
//@ chunk-6ja29j2n.js:154790-155024 esm-fingerprint
function Tu(e, t) {
  switch (t.tagID) {
    case u.HEAD: {
      (e.openElements.pop(), (e.insertionMode = i.AFTER_HEAD));
      break;
    }
    case u.BODY:
    case u.BR:
    case u.HTML: {
      v(e, t);
      break;
    }
    case u.TEMPLATE: {
      B(e, t);
      break;
    }
    default:
      e._err(t, o.endTagWithoutMatchingOpenElement);
  }
}
//@ chunk-6ja29j2n.js:155024-155418 esm-fingerprint
function B(e, t) {
  if (e.openElements.tmplCount > 0) {
    if ((e.openElements.generateImpliedEndTagsThoroughly(), e.openElements.currentTagId !== u.TEMPLATE))
      e._err(t, o.closingOfElementWithOpenChildElements);
    (e.openElements.popUntilTagNamePopped(u.TEMPLATE),
      e.activeFormattingElements.clearToLastMarker(),
      e.tmplInsertionModeStack.shift(),
      e._resetInsertionMode());
  } else e._err(t, o.endTagWithoutMatchingOpenElement);
}
//@ chunk-6ja29j2n.js:155418-155503 esm-fingerprint
function v(e, t) {
  (e.openElements.pop(), (e.insertionMode = i.AFTER_HEAD), e._processToken(t));
}
//@ chunk-6ja29j2n.js:155503-155744 esm-fingerprint
function hu(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.BASEFONT:
    case u.BGSOUND:
    case u.HEAD:
    case u.LINK:
    case u.META:
    case u.NOFRAMES:
    case u.STYLE: {
      R(e, t);
      break;
    }
    case u.NOSCRIPT: {
      e._err(t, o.nestedNoscriptInHead);
      break;
    }
    default:
      Q(e, t);
  }
}
//@ chunk-6ja29j2n.js:155744-155925 esm-fingerprint
function lu(e, t) {
  switch (t.tagID) {
    case u.NOSCRIPT: {
      (e.openElements.pop(), (e.insertionMode = i.IN_HEAD));
      break;
    }
    case u.BR: {
      Q(e, t);
      break;
    }
    default:
      e._err(t, o.endTagWithoutMatchingOpenElement);
  }
}
//@ chunk-6ja29j2n.js:155925-156103 esm-fingerprint
function Q(e, t) {
  let a = t.type === f.EOF ? o.openElementsLeftAfterEof : o.disallowedContentInNoscriptInHead;
  (e._err(t, a), e.openElements.pop(), (e.insertionMode = i.IN_HEAD), e._processToken(t));
}
//@ chunk-6ja29j2n.js:156103-156679 esm-fingerprint
function fu(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.BODY: {
      (e._insertElement(t, E.HTML), (e.framesetOk = !1), (e.insertionMode = i.IN_BODY));
      break;
    }
    case u.FRAMESET: {
      (e._insertElement(t, E.HTML), (e.insertionMode = i.IN_FRAMESET));
      break;
    }
    case u.BASE:
    case u.BASEFONT:
    case u.BGSOUND:
    case u.LINK:
    case u.META:
    case u.NOFRAMES:
    case u.SCRIPT:
    case u.STYLE:
    case u.TEMPLATE:
    case u.TITLE: {
      (e._err(t, o.abandonedHeadElementChild),
        e.openElements.push(e.headElement, u.HEAD),
        R(e, t),
        e.openElements.remove(e.headElement));
      break;
    }
    case u.HEAD: {
      e._err(t, o.misplacedStartTagForHeadElement);
      break;
    }
    default:
      G(e, t);
  }
}
//@ chunk-6ja29j2n.js:156679-156844 esm-fingerprint
function mu(e, t) {
  switch (t.tagID) {
    case u.BODY:
    case u.HTML:
    case u.BR: {
      G(e, t);
      break;
    }
    case u.TEMPLATE: {
      B(e, t);
      break;
    }
    default:
      e._err(t, o.endTagWithoutMatchingOpenElement);
  }
}
//@ chunk-6ja29j2n.js:156844-156930 esm-fingerprint
function G(e, t) {
  (e._insertFakeElement(c.BODY, u.BODY), (e.insertionMode = i.IN_BODY), ie(e, t));
}
//@ chunk-6ja29j2n.js:156930-157164 esm-fingerprint
function ie(e, t) {
  switch (t.type) {
    case f.CHARACTER: {
      et(e, t);
      break;
    }
    case f.WHITESPACE_CHARACTER: {
      Ze(e, t);
      break;
    }
    case f.COMMENT: {
      be(e, t);
      break;
    }
    case f.START_TAG: {
      I(e, t);
      break;
    }
    case f.END_TAG: {
      ne(e, t);
      break;
    }
    case f.EOF: {
      st(e, t);
      break;
    }
    default:
  }
}
//@ chunk-6ja29j2n.js:157164-157245 esm-fingerprint
function Ze(e, t) {
  (e._reconstructActiveFormattingElements(), e._insertCharacters(t));
}
//@ chunk-6ja29j2n.js:157245-157342 esm-fingerprint
function et(e, t) {
  (e._reconstructActiveFormattingElements(), e._insertCharacters(t), (e.framesetOk = !1));
}
//@ chunk-6ja29j2n.js:157342-157454 esm-fingerprint
function _u(e, t) {
  if (e.openElements.tmplCount === 0) e.treeAdapter.adoptAttributes(e.openElements.items[0], t.attrs);
}
//@ chunk-6ja29j2n.js:157454-157619 esm-fingerprint
function bu(e, t) {
  let tryPeekProperlyNestedBodyElement = e.openElements.tryPeekProperlyNestedBodyElement();
  if (tryPeekProperlyNestedBodyElement && e.openElements.tmplCount === 0)
    ((e.framesetOk = !1), e.treeAdapter.adoptAttributes(tryPeekProperlyNestedBodyElement, t.attrs));
}
//@ chunk-6ja29j2n.js:157619-157835 esm-fingerprint
function Au(e, t) {
  let tryPeekProperlyNestedBodyElement = e.openElements.tryPeekProperlyNestedBodyElement();
  if (e.framesetOk && tryPeekProperlyNestedBodyElement)
    (e.treeAdapter.detachNode(tryPeekProperlyNestedBodyElement),
      e.openElements.popAllUpToHtmlElement(),
      e._insertElement(t, E.HTML),
      (e.insertionMode = i.IN_FRAMESET));
}
//@ chunk-6ja29j2n.js:157835-157938 esm-fingerprint
function Nu(e, t) {
  if (e.openElements.hasInButtonScope(u.P)) e._closePElement();
  e._insertElement(t, E.HTML);
}
//@ chunk-6ja29j2n.js:157938-158100 esm-fingerprint
function Iu(e, t) {
  if (e.openElements.hasInButtonScope(u.P)) e._closePElement();
  if (H.has(e.openElements.currentTagId)) e.openElements.pop();
  e._insertElement(t, E.HTML);
}
//@ chunk-6ja29j2n.js:158100-158240 esm-fingerprint
function Cu(e, t) {
  if (e.openElements.hasInButtonScope(u.P)) e._closePElement();
  (e._insertElement(t, E.HTML), (e.skipNextNewLine = !0), (e.framesetOk = !1));
}
//@ chunk-6ja29j2n.js:158240-158442 esm-fingerprint
function Ou(e, t) {
  let a = e.openElements.tmplCount > 0;
  if (!e.formElement || a) {
    if (e.openElements.hasInButtonScope(u.P)) e._closePElement();
    if ((e._insertElement(t, E.HTML), !a)) e.formElement = e.openElements.current;
  }
}
//@ chunk-6ja29j2n.js:158442-158908 esm-fingerprint
function Su(e, t) {
  e.framesetOk = !1;
  let tagID = t.tagID;
  for (let stackTop = e.openElements.stackTop; stackTop >= 0; stackTop--) {
    let d = e.openElements.tagIDs[stackTop];
    if (
      (tagID === u.LI && d === u.LI) ||
      ((tagID === u.DD || tagID === u.DT) && (d === u.DD || d === u.DT))
    ) {
      (e.openElements.generateImpliedEndTagsWithExclusion(d), e.openElements.popUntilTagNamePopped(d));
      break;
    }
    if (d !== u.ADDRESS && d !== u.DIV && d !== u.P && e._isSpecialElement(e.openElements.items[stackTop], d))
      break;
  }
  if (e.openElements.hasInButtonScope(u.P)) e._closePElement();
  e._insertElement(t, E.HTML);
}
//@ chunk-6ja29j2n.js:158908-159042 esm-fingerprint
function pu(e, t) {
  if (e.openElements.hasInButtonScope(u.P)) e._closePElement();
  (e._insertElement(t, E.HTML), (e.tokenizer.state = TokenizerMode.PLAINTEXT));
}
//@ chunk-6ja29j2n.js:159042-159269 esm-fingerprint
function Lu(e, t) {
  if (e.openElements.hasInScope(u.BUTTON))
    (e.openElements.generateImpliedEndTags(), e.openElements.popUntilTagNamePopped(u.BUTTON));
  (e._reconstructActiveFormattingElements(), e._insertElement(t, E.HTML), (e.framesetOk = !1));
}
//@ chunk-6ja29j2n.js:159269-159579 esm-fingerprint
function Ru(e, t) {
  let elementEntryInScopeWithTagName = e.activeFormattingElements.getElementEntryInScopeWithTagName(c.A);
  if (elementEntryInScopeWithTagName)
    (Ne(e, t),
      e.openElements.remove(elementEntryInScopeWithTagName.element),
      e.activeFormattingElements.removeEntry(elementEntryInScopeWithTagName));
  (e._reconstructActiveFormattingElements(),
    e._insertElement(t, E.HTML),
    e.activeFormattingElements.pushElement(e.openElements.current, t));
}
//@ chunk-6ja29j2n.js:159579-159729 esm-fingerprint
function Du(e, t) {
  (e._reconstructActiveFormattingElements(),
    e._insertElement(t, E.HTML),
    e.activeFormattingElements.pushElement(e.openElements.current, t));
}
//@ chunk-6ja29j2n.js:159729-159965 esm-fingerprint
function gu(e, t) {
  if ((e._reconstructActiveFormattingElements(), e.openElements.hasInScope(u.NOBR)))
    (Ne(e, t), e._reconstructActiveFormattingElements());
  (e._insertElement(t, E.HTML), e.activeFormattingElements.pushElement(e.openElements.current, t));
}
//@ chunk-6ja29j2n.js:159965-160108 esm-fingerprint
function Pu(e, t) {
  (e._reconstructActiveFormattingElements(),
    e._insertElement(t, E.HTML),
    e.activeFormattingElements.insertMarker(),
    (e.framesetOk = !1));
}
//@ chunk-6ja29j2n.js:160108-160308 esm-fingerprint
function Mu(e, t) {
  if (e.treeAdapter.getDocumentMode(e.document) !== O.QUIRKS && e.openElements.hasInButtonScope(u.P))
    e._closePElement();
  (e._insertElement(t, E.HTML), (e.framesetOk = !1), (e.insertionMode = i.IN_TABLE));
}
//@ chunk-6ja29j2n.js:160308-160429 esm-fingerprint
function tt(e, t) {
  (e._reconstructActiveFormattingElements(),
    e._appendElement(t, E.HTML),
    (e.framesetOk = !1),
    (t.ackSelfClosing = !0));
}
//@ chunk-6ja29j2n.js:160429-160499 esm-fingerprint
function ut(e) {
  let t = z(e, g.TYPE);
  return t != null && t.toLowerCase() === HIDDEN;
}
//@ chunk-6ja29j2n.js:160499-160630 esm-fingerprint
function xu(e, t) {
  if ((e._reconstructActiveFormattingElements(), e._appendElement(t, E.HTML), !ut(t))) e.framesetOk = !1;
  t.ackSelfClosing = !0;
}
//@ chunk-6ja29j2n.js:160630-160694 esm-fingerprint
function Bu(e, t) {
  (e._appendElement(t, E.HTML), (t.ackSelfClosing = !0));
}
//@ chunk-6ja29j2n.js:160694-160833 esm-fingerprint
function ku(e, t) {
  if (e.openElements.hasInButtonScope(u.P)) e._closePElement();
  (e._appendElement(t, E.HTML), (e.framesetOk = !1), (t.ackSelfClosing = !0));
}
//@ chunk-6ja29j2n.js:160833-160888 esm-fingerprint
function Hu(e, t) {
  ((t.tagName = c.IMG), (t.tagID = u.IMG), tt(e, t));
}
//@ chunk-6ja29j2n.js:160888-161060 esm-fingerprint
function Uu(e, t) {
  (e._insertElement(t, E.HTML),
    (e.skipNextNewLine = !0),
    (e.tokenizer.state = TokenizerMode.RCDATA),
    (e.originalInsertionMode = e.insertionMode),
    (e.framesetOk = !1),
    (e.insertionMode = i.TEXT));
}
//@ chunk-6ja29j2n.js:161060-161230 esm-fingerprint
function Fu(e, t) {
  if (e.openElements.hasInButtonScope(u.P)) e._closePElement();
  (e._reconstructActiveFormattingElements(),
    (e.framesetOk = !1),
    e._switchToTextParsing(t, TokenizerMode.RAWTEXT));
}
//@ chunk-6ja29j2n.js:161230-161300 esm-fingerprint
function yu(e, t) {
  ((e.framesetOk = !1), e._switchToTextParsing(t, TokenizerMode.RAWTEXT));
}
//@ chunk-6ja29j2n.js:161300-161354 esm-fingerprint
function je(e, t) {
  e._switchToTextParsing(t, TokenizerMode.RAWTEXT);
}
//@ chunk-6ja29j2n.js:161354-161657 esm-fingerprint
function wu(e, t) {
  (e._reconstructActiveFormattingElements(),
    e._insertElement(t, E.HTML),
    (e.framesetOk = !1),
    (e.insertionMode =
      e.insertionMode === i.IN_TABLE ||
      e.insertionMode === i.IN_CAPTION ||
      e.insertionMode === i.IN_TABLE_BODY ||
      e.insertionMode === i.IN_ROW ||
      e.insertionMode === i.IN_CELL
        ? i.IN_SELECT_IN_TABLE
        : i.IN_SELECT));
}
//@ chunk-6ja29j2n.js:161657-161805 esm-fingerprint
function Yu(e, t) {
  if (e.openElements.currentTagId === u.OPTION) e.openElements.pop();
  (e._reconstructActiveFormattingElements(), e._insertElement(t, E.HTML));
}
//@ chunk-6ja29j2n.js:161805-161926 esm-fingerprint
function vu(e, t) {
  if (e.openElements.hasInScope(u.RUBY)) e.openElements.generateImpliedEndTags();
  e._insertElement(t, E.HTML);
}
//@ chunk-6ja29j2n.js:161926-162065 esm-fingerprint
function Qu(e, t) {
  if (e.openElements.hasInScope(u.RUBY)) e.openElements.generateImpliedEndTagsWithExclusion(u.RTC);
  e._insertElement(t, E.HTML);
}
//@ chunk-6ja29j2n.js:162065-162235 esm-fingerprint
function Gu(e, t) {
  if ((e._reconstructActiveFormattingElements(), fe(t), te(t), t.selfClosing)) e._appendElement(t, E.MATHML);
  else e._insertElement(t, E.MATHML);
  t.ackSelfClosing = !0;
}
//@ chunk-6ja29j2n.js:162235-162399 esm-fingerprint
function Wu(e, t) {
  if ((e._reconstructActiveFormattingElements(), me(t), te(t), t.selfClosing)) e._appendElement(t, E.SVG);
  else e._insertElement(t, E.SVG);
  t.ackSelfClosing = !0;
}
//@ chunk-6ja29j2n.js:162399-162484 esm-fingerprint
function Je(e, t) {
  (e._reconstructActiveFormattingElements(), e._insertElement(t, E.HTML));
}
//@ chunk-6ja29j2n.js:162484-164405 esm-fingerprint
function I(e, t) {
  switch (t.tagID) {
    case u.I:
    case u.S:
    case u.B:
    case u.U:
    case u.EM:
    case u.TT:
    case u.BIG:
    case u.CODE:
    case u.FONT:
    case u.SMALL:
    case u.STRIKE:
    case u.STRONG: {
      Du(e, t);
      break;
    }
    case u.A: {
      Ru(e, t);
      break;
    }
    case u.H1:
    case u.H2:
    case u.H3:
    case u.H4:
    case u.H5:
    case u.H6: {
      Iu(e, t);
      break;
    }
    case u.P:
    case u.DL:
    case u.OL:
    case u.UL:
    case u.DIV:
    case u.DIR:
    case u.NAV:
    case u.MAIN:
    case u.MENU:
    case u.ASIDE:
    case u.CENTER:
    case u.FIGURE:
    case u.FOOTER:
    case u.HEADER:
    case u.HGROUP:
    case u.DIALOG:
    case u.DETAILS:
    case u.ADDRESS:
    case u.ARTICLE:
    case u.SEARCH:
    case u.SECTION:
    case u.SUMMARY:
    case u.FIELDSET:
    case u.BLOCKQUOTE:
    case u.FIGCAPTION: {
      Nu(e, t);
      break;
    }
    case u.LI:
    case u.DD:
    case u.DT: {
      Su(e, t);
      break;
    }
    case u.BR:
    case u.IMG:
    case u.WBR:
    case u.AREA:
    case u.EMBED:
    case u.KEYGEN: {
      tt(e, t);
      break;
    }
    case u.HR: {
      ku(e, t);
      break;
    }
    case u.RB:
    case u.RTC: {
      vu(e, t);
      break;
    }
    case u.RT:
    case u.RP: {
      Qu(e, t);
      break;
    }
    case u.PRE:
    case u.LISTING: {
      Cu(e, t);
      break;
    }
    case u.XMP: {
      Fu(e, t);
      break;
    }
    case u.SVG: {
      Wu(e, t);
      break;
    }
    case u.HTML: {
      _u(e, t);
      break;
    }
    case u.BASE:
    case u.LINK:
    case u.META:
    case u.STYLE:
    case u.TITLE:
    case u.SCRIPT:
    case u.BGSOUND:
    case u.BASEFONT:
    case u.TEMPLATE: {
      R(e, t);
      break;
    }
    case u.BODY: {
      bu(e, t);
      break;
    }
    case u.FORM: {
      Ou(e, t);
      break;
    }
    case u.NOBR: {
      gu(e, t);
      break;
    }
    case u.MATH: {
      Gu(e, t);
      break;
    }
    case u.TABLE: {
      Mu(e, t);
      break;
    }
    case u.INPUT: {
      xu(e, t);
      break;
    }
    case u.PARAM:
    case u.TRACK:
    case u.SOURCE: {
      Bu(e, t);
      break;
    }
    case u.IMAGE: {
      Hu(e, t);
      break;
    }
    case u.BUTTON: {
      Lu(e, t);
      break;
    }
    case u.APPLET:
    case u.OBJECT:
    case u.MARQUEE: {
      Pu(e, t);
      break;
    }
    case u.IFRAME: {
      yu(e, t);
      break;
    }
    case u.SELECT: {
      wu(e, t);
      break;
    }
    case u.OPTION:
    case u.OPTGROUP: {
      Yu(e, t);
      break;
    }
    case u.NOEMBED:
    case u.NOFRAMES: {
      je(e, t);
      break;
    }
    case u.FRAMESET: {
      Au(e, t);
      break;
    }
    case u.TEXTAREA: {
      Uu(e, t);
      break;
    }
    case u.NOSCRIPT: {
      if (e.options.scriptingEnabled) je(e, t);
      else Je(e, t);
      break;
    }
    case u.PLAINTEXT: {
      pu(e, t);
      break;
    }
    case u.COL:
    case u.TH:
    case u.TD:
    case u.TR:
    case u.HEAD:
    case u.FRAME:
    case u.TBODY:
    case u.TFOOT:
    case u.THEAD:
    case u.CAPTION:
    case u.COLGROUP:
      break;
    default:
      Je(e, t);
  }
}
//@ chunk-6ja29j2n.js:164405-164612 esm-fingerprint
function qu(e, t) {
  if (e.openElements.hasInScope(u.BODY)) {
    if (((e.insertionMode = i.AFTER_BODY), e.options.sourceCodeLocationInfo)) {
      let tryPeekProperlyNestedBodyElement = e.openElements.tryPeekProperlyNestedBodyElement();
      if (tryPeekProperlyNestedBodyElement) e._setEndLocation(tryPeekProperlyNestedBodyElement, t);
    }
  }
}
//@ chunk-6ja29j2n.js:164612-164703 esm-fingerprint
function Xu(e, t) {
  if (e.openElements.hasInScope(u.BODY)) ((e.insertionMode = i.AFTER_BODY), Tt(e, t));
}
//@ chunk-6ja29j2n.js:164703-164846 esm-fingerprint
function Ku(e, t) {
  let tagID = t.tagID;
  if (e.openElements.hasInScope(tagID))
    (e.openElements.generateImpliedEndTags(), e.openElements.popUntilTagNamePopped(tagID));
}
//@ chunk-6ja29j2n.js:164846-165109 esm-fingerprint
function Vu(e) {
  let t = e.openElements.tmplCount > 0,
    { formElement: formElement } = e;
  if (!t) e.formElement = null;
  if ((formElement || t) && e.openElements.hasInScope(u.FORM)) {
    if ((e.openElements.generateImpliedEndTags(), t)) e.openElements.popUntilTagNamePopped(u.FORM);
    else if (formElement) e.openElements.remove(formElement);
  }
}
//@ chunk-6ja29j2n.js:165109-165214 esm-fingerprint
function zu(e) {
  if (!e.openElements.hasInButtonScope(u.P)) e._insertFakeElement(c.P, u.P);
  e._closePElement();
}
//@ chunk-6ja29j2n.js:165214-165372 esm-fingerprint
function ju(e) {
  if (e.openElements.hasInListItemScope(u.LI))
    (e.openElements.generateImpliedEndTagsWithExclusion(u.LI), e.openElements.popUntilTagNamePopped(u.LI));
}
//@ chunk-6ja29j2n.js:165372-165529 esm-fingerprint
function Ju(e, t) {
  let tagID = t.tagID;
  if (e.openElements.hasInScope(tagID))
    (e.openElements.generateImpliedEndTagsWithExclusion(tagID), e.openElements.popUntilTagNamePopped(tagID));
}
//@ chunk-6ja29j2n.js:165529-165675 esm-fingerprint
function $u(e) {
  if (e.openElements.hasNumberedHeaderInScope())
    (e.openElements.generateImpliedEndTags(), e.openElements.popUntilNumberedHeaderPopped());
}
//@ chunk-6ja29j2n.js:165675-165865 esm-fingerprint
function Zu(e, t) {
  let tagID = t.tagID;
  if (e.openElements.hasInScope(tagID))
    (e.openElements.generateImpliedEndTags(),
      e.openElements.popUntilTagNamePopped(tagID),
      e.activeFormattingElements.clearToLastMarker());
}
//@ chunk-6ja29j2n.js:165865-165990 esm-fingerprint
function ea(e) {
  (e._reconstructActiveFormattingElements(),
    e._insertFakeElement(c.BR, u.BR),
    e.openElements.pop(),
    (e.framesetOk = !1));
}
//@ chunk-6ja29j2n.js:165990-166351 esm-fingerprint
function at(e, t) {
  let { tagName: tagName, tagID: tagID } = t;
  for (let stackTop = e.openElements.stackTop; stackTop > 0; stackTop--) {
    let h = e.openElements.items[stackTop],
      l = e.openElements.tagIDs[stackTop];
    if (tagID === l && (tagID !== u.UNKNOWN || e.treeAdapter.getTagName(h) === tagName)) {
      if ((e.openElements.generateImpliedEndTagsWithExclusion(tagID), e.openElements.stackTop >= stackTop))
        e.openElements.shortenToLength(stackTop);
      break;
    }
    if (e._isSpecialElement(h, l)) break;
  }
}
//@ chunk-6ja29j2n.js:166351-167292 esm-fingerprint
function ne(e, t) {
  switch (t.tagID) {
    case u.A:
    case u.B:
    case u.I:
    case u.S:
    case u.U:
    case u.EM:
    case u.TT:
    case u.BIG:
    case u.CODE:
    case u.FONT:
    case u.NOBR:
    case u.SMALL:
    case u.STRIKE:
    case u.STRONG: {
      Ne(e, t);
      break;
    }
    case u.P: {
      zu(e);
      break;
    }
    case u.DL:
    case u.UL:
    case u.OL:
    case u.DIR:
    case u.DIV:
    case u.NAV:
    case u.PRE:
    case u.MAIN:
    case u.MENU:
    case u.ASIDE:
    case u.BUTTON:
    case u.CENTER:
    case u.FIGURE:
    case u.FOOTER:
    case u.HEADER:
    case u.HGROUP:
    case u.DIALOG:
    case u.ADDRESS:
    case u.ARTICLE:
    case u.DETAILS:
    case u.SEARCH:
    case u.SECTION:
    case u.SUMMARY:
    case u.LISTING:
    case u.FIELDSET:
    case u.BLOCKQUOTE:
    case u.FIGCAPTION: {
      Ku(e, t);
      break;
    }
    case u.LI: {
      ju(e);
      break;
    }
    case u.DD:
    case u.DT: {
      Ju(e, t);
      break;
    }
    case u.H1:
    case u.H2:
    case u.H3:
    case u.H4:
    case u.H5:
    case u.H6: {
      $u(e);
      break;
    }
    case u.BR: {
      ea(e);
      break;
    }
    case u.BODY: {
      qu(e, t);
      break;
    }
    case u.HTML: {
      Xu(e, t);
      break;
    }
    case u.FORM: {
      Vu(e);
      break;
    }
    case u.APPLET:
    case u.OBJECT:
    case u.MARQUEE: {
      Zu(e, t);
      break;
    }
    case u.TEMPLATE: {
      B(e, t);
      break;
    }
    default:
      at(e, t);
  }
}
//@ chunk-6ja29j2n.js:167292-167367 esm-fingerprint
function st(e, t) {
  if (e.tmplInsertionModeStack.length > 0) Et(e, t);
  else Ie(e, t);
}
//@ chunk-6ja29j2n.js:167367-167546 esm-fingerprint
function ta(e, t) {
  var a;
  if (t.tagID === u.SCRIPT)
    (a = e.scriptHandler) === null || a === void 0 || a.call(e, e.openElements.current);
  (e.openElements.pop(), (e.insertionMode = e.originalInsertionMode));
}
//@ chunk-6ja29j2n.js:167546-167682 esm-fingerprint
function ua(e, t) {
  (e._err(t, o.eofInElementThatCanContainOnlyText),
    e.openElements.pop(),
    (e.insertionMode = e.originalInsertionMode),
    e.onEof(t));
}
//@ chunk-6ja29j2n.js:167682-167990 esm-fingerprint
function _e(e, t) {
  if ($e.has(e.openElements.currentTagId))
    switch (
      ((e.pendingCharacterTokens.length = 0),
      (e.hasNonWhitespacePendingCharacterToken = !1),
      (e.originalInsertionMode = e.insertionMode),
      (e.insertionMode = i.IN_TABLE_TEXT),
      t.type)
    ) {
      case f.CHARACTER: {
        it(e, t);
        break;
      }
      case f.WHITESPACE_CHARACTER: {
        rt(e, t);
        break;
      }
    }
  else q(e, t);
}
//@ chunk-6ja29j2n.js:167990-168146 esm-fingerprint
function aa(e, t) {
  (e.openElements.clearBackToTableContext(),
    e.activeFormattingElements.insertMarker(),
    e._insertElement(t, E.HTML),
    (e.insertionMode = i.IN_CAPTION));
}
//@ chunk-6ja29j2n.js:168146-168265 esm-fingerprint
function sa(e, t) {
  (e.openElements.clearBackToTableContext(),
    e._insertElement(t, E.HTML),
    (e.insertionMode = i.IN_COLUMN_GROUP));
}
//@ chunk-6ja29j2n.js:168265-168409 esm-fingerprint
function ra(e, t) {
  (e.openElements.clearBackToTableContext(),
    e._insertFakeElement(c.COLGROUP, u.COLGROUP),
    (e.insertionMode = i.IN_COLUMN_GROUP),
    Ce(e, t));
}
//@ chunk-6ja29j2n.js:168409-168526 esm-fingerprint
function ia(e, t) {
  (e.openElements.clearBackToTableContext(),
    e._insertElement(t, E.HTML),
    (e.insertionMode = i.IN_TABLE_BODY));
}
//@ chunk-6ja29j2n.js:168526-168662 esm-fingerprint
function na(e, t) {
  (e.openElements.clearBackToTableContext(),
    e._insertFakeElement(c.TBODY, u.TBODY),
    (e.insertionMode = i.IN_TABLE_BODY),
    ce(e, t));
}
//@ chunk-6ja29j2n.js:168662-168814 esm-fingerprint
function ca(e, t) {
  if (e.openElements.hasInTableScope(u.TABLE))
    (e.openElements.popUntilTagNamePopped(u.TABLE), e._resetInsertionMode(), e._processStartTag(t));
}
//@ chunk-6ja29j2n.js:168814-168899 esm-fingerprint
function oa(e, t) {
  if (ut(t)) e._appendElement(t, E.HTML);
  else q(e, t);
  t.ackSelfClosing = !0;
}
//@ chunk-6ja29j2n.js:168899-169049 esm-fingerprint
function da(e, t) {
  if (!e.formElement && e.openElements.tmplCount === 0)
    (e._insertElement(t, E.HTML), (e.formElement = e.openElements.current), e.openElements.pop());
}
//@ chunk-6ja29j2n.js:169049-169423 esm-fingerprint
function k(e, t) {
  switch (t.tagID) {
    case u.TD:
    case u.TH:
    case u.TR: {
      na(e, t);
      break;
    }
    case u.STYLE:
    case u.SCRIPT:
    case u.TEMPLATE: {
      R(e, t);
      break;
    }
    case u.COL: {
      ra(e, t);
      break;
    }
    case u.FORM: {
      da(e, t);
      break;
    }
    case u.TABLE: {
      ca(e, t);
      break;
    }
    case u.TBODY:
    case u.TFOOT:
    case u.THEAD: {
      ia(e, t);
      break;
    }
    case u.INPUT: {
      oa(e, t);
      break;
    }
    case u.CAPTION: {
      aa(e, t);
      break;
    }
    case u.COLGROUP: {
      sa(e, t);
      break;
    }
    default:
      q(e, t);
  }
}
//@ chunk-6ja29j2n.js:169423-169775 esm-fingerprint
function W(e, t) {
  switch (t.tagID) {
    case u.TABLE: {
      if (e.openElements.hasInTableScope(u.TABLE))
        (e.openElements.popUntilTagNamePopped(u.TABLE), e._resetInsertionMode());
      break;
    }
    case u.TEMPLATE: {
      B(e, t);
      break;
    }
    case u.BODY:
    case u.CAPTION:
    case u.COL:
    case u.COLGROUP:
    case u.HTML:
    case u.TBODY:
    case u.TD:
    case u.TFOOT:
    case u.TH:
    case u.THEAD:
    case u.TR:
      break;
    default:
      q(e, t);
  }
}
//@ chunk-6ja29j2n.js:169775-169885 esm-fingerprint
function q(e, t) {
  let fosterParentingEnabled = e.fosterParentingEnabled;
  ((e.fosterParentingEnabled = !0), ie(e, t), (e.fosterParentingEnabled = fosterParentingEnabled));
}
//@ chunk-6ja29j2n.js:169885-169935 esm-fingerprint
function rt(e, t) {
  e.pendingCharacterTokens.push(t);
}
//@ chunk-6ja29j2n.js:169935-170028 esm-fingerprint
function it(e, t) {
  (e.pendingCharacterTokens.push(t), (e.hasNonWhitespacePendingCharacterToken = !0));
}
//@ chunk-6ja29j2n.js:170028-170327 esm-fingerprint
function y(e, t) {
  let a = 0;
  if (e.hasNonWhitespacePendingCharacterToken)
    for (; a < e.pendingCharacterTokens.length; a++) q(e, e.pendingCharacterTokens[a]);
  else for (; a < e.pendingCharacterTokens.length; a++) e._insertCharacters(e.pendingCharacterTokens[a]);
  ((e.insertionMode = e.originalInsertionMode), e._processToken(t));
}
//@ chunk-6ja29j2n.js:170327-170411 esm-fingerprint
var nt = new Set([u.CAPTION, u.COL, u.COLGROUP, u.TBODY, u.TD, u.TFOOT, u.TH, u.THEAD, u.TR]);
//@ chunk-6ja29j2n.js:170411-170682 esm-fingerprint
function Ea(e, t) {
  let tagID = t.tagID;
  if (nt.has(tagID)) {
    if (e.openElements.hasInTableScope(u.CAPTION))
      (e.openElements.generateImpliedEndTags(),
        e.openElements.popUntilTagNamePopped(u.CAPTION),
        e.activeFormattingElements.clearToLastMarker(),
        (e.insertionMode = i.IN_TABLE),
        k(e, t));
  } else I(e, t);
}
//@ chunk-6ja29j2n.js:170682-171131 esm-fingerprint
function Ta(e, t) {
  let tagID = t.tagID;
  switch (tagID) {
    case u.CAPTION:
    case u.TABLE: {
      if (e.openElements.hasInTableScope(u.CAPTION)) {
        if (
          (e.openElements.generateImpliedEndTags(),
          e.openElements.popUntilTagNamePopped(u.CAPTION),
          e.activeFormattingElements.clearToLastMarker(),
          (e.insertionMode = i.IN_TABLE),
          tagID === u.TABLE)
        )
          W(e, t);
      }
      break;
    }
    case u.BODY:
    case u.COL:
    case u.COLGROUP:
    case u.HTML:
    case u.TBODY:
    case u.TD:
    case u.TFOOT:
    case u.TH:
    case u.THEAD:
    case u.TR:
      break;
    default:
      ne(e, t);
  }
}
//@ chunk-6ja29j2n.js:171131-171302 esm-fingerprint
function Ce(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.COL: {
      (e._appendElement(t, E.HTML), (t.ackSelfClosing = !0));
      break;
    }
    case u.TEMPLATE: {
      R(e, t);
      break;
    }
    default:
      ae(e, t);
  }
}
//@ chunk-6ja29j2n.js:171302-171514 esm-fingerprint
function ha(e, t) {
  switch (t.tagID) {
    case u.COLGROUP: {
      if (e.openElements.currentTagId === u.COLGROUP) (e.openElements.pop(), (e.insertionMode = i.IN_TABLE));
      break;
    }
    case u.TEMPLATE: {
      B(e, t);
      break;
    }
    case u.COL:
      break;
    default:
      ae(e, t);
  }
}
//@ chunk-6ja29j2n.js:171514-171642 esm-fingerprint
function ae(e, t) {
  if (e.openElements.currentTagId === u.COLGROUP)
    (e.openElements.pop(), (e.insertionMode = i.IN_TABLE), e._processToken(t));
}
//@ chunk-6ja29j2n.js:171642-172182 esm-fingerprint
function ce(e, t) {
  switch (t.tagID) {
    case u.TR: {
      (e.openElements.clearBackToTableBodyContext(),
        e._insertElement(t, E.HTML),
        (e.insertionMode = i.IN_ROW));
      break;
    }
    case u.TH:
    case u.TD: {
      (e.openElements.clearBackToTableBodyContext(),
        e._insertFakeElement(c.TR, u.TR),
        (e.insertionMode = i.IN_ROW),
        oe(e, t));
      break;
    }
    case u.CAPTION:
    case u.COL:
    case u.COLGROUP:
    case u.TBODY:
    case u.TFOOT:
    case u.THEAD: {
      if (e.openElements.hasTableBodyContextInTableScope())
        (e.openElements.clearBackToTableBodyContext(),
          e.openElements.pop(),
          (e.insertionMode = i.IN_TABLE),
          k(e, t));
      break;
    }
    default:
      k(e, t);
  }
}
//@ chunk-6ja29j2n.js:172182-172695 esm-fingerprint
function Ae(e, t) {
  let tagID = t.tagID;
  switch (t.tagID) {
    case u.TBODY:
    case u.TFOOT:
    case u.THEAD: {
      if (e.openElements.hasInTableScope(tagID))
        (e.openElements.clearBackToTableBodyContext(), e.openElements.pop(), (e.insertionMode = i.IN_TABLE));
      break;
    }
    case u.TABLE: {
      if (e.openElements.hasTableBodyContextInTableScope())
        (e.openElements.clearBackToTableBodyContext(),
          e.openElements.pop(),
          (e.insertionMode = i.IN_TABLE),
          W(e, t));
      break;
    }
    case u.BODY:
    case u.CAPTION:
    case u.COL:
    case u.COLGROUP:
    case u.HTML:
    case u.TD:
    case u.TH:
    case u.TR:
      break;
    default:
      W(e, t);
  }
}
//@ chunk-6ja29j2n.js:172695-173153 esm-fingerprint
function oe(e, t) {
  switch (t.tagID) {
    case u.TH:
    case u.TD: {
      (e.openElements.clearBackToTableRowContext(),
        e._insertElement(t, E.HTML),
        (e.insertionMode = i.IN_CELL),
        e.activeFormattingElements.insertMarker());
      break;
    }
    case u.CAPTION:
    case u.COL:
    case u.COLGROUP:
    case u.TBODY:
    case u.TFOOT:
    case u.THEAD:
    case u.TR: {
      if (e.openElements.hasInTableScope(u.TR))
        (e.openElements.clearBackToTableRowContext(),
          e.openElements.pop(),
          (e.insertionMode = i.IN_TABLE_BODY),
          ce(e, t));
      break;
    }
    default:
      k(e, t);
  }
}
//@ chunk-6ja29j2n.js:173153-173845 esm-fingerprint
function ct(e, t) {
  switch (t.tagID) {
    case u.TR: {
      if (e.openElements.hasInTableScope(u.TR))
        (e.openElements.clearBackToTableRowContext(),
          e.openElements.pop(),
          (e.insertionMode = i.IN_TABLE_BODY));
      break;
    }
    case u.TABLE: {
      if (e.openElements.hasInTableScope(u.TR))
        (e.openElements.clearBackToTableRowContext(),
          e.openElements.pop(),
          (e.insertionMode = i.IN_TABLE_BODY),
          Ae(e, t));
      break;
    }
    case u.TBODY:
    case u.TFOOT:
    case u.THEAD: {
      if (e.openElements.hasInTableScope(t.tagID) || e.openElements.hasInTableScope(u.TR))
        (e.openElements.clearBackToTableRowContext(),
          e.openElements.pop(),
          (e.insertionMode = i.IN_TABLE_BODY),
          Ae(e, t));
      break;
    }
    case u.BODY:
    case u.CAPTION:
    case u.COL:
    case u.COLGROUP:
    case u.HTML:
    case u.TD:
    case u.TH:
      break;
    default:
      W(e, t);
  }
}
//@ chunk-6ja29j2n.js:173845-174008 esm-fingerprint
function la(e, t) {
  let tagID = t.tagID;
  if (nt.has(tagID)) {
    if (e.openElements.hasInTableScope(u.TD) || e.openElements.hasInTableScope(u.TH))
      (e._closeTableCell(), oe(e, t));
  } else I(e, t);
}
//@ chunk-6ja29j2n.js:174008-174488 esm-fingerprint
function fa(e, t) {
  let tagID = t.tagID;
  switch (tagID) {
    case u.TD:
    case u.TH: {
      if (e.openElements.hasInTableScope(tagID))
        (e.openElements.generateImpliedEndTags(),
          e.openElements.popUntilTagNamePopped(tagID),
          e.activeFormattingElements.clearToLastMarker(),
          (e.insertionMode = i.IN_ROW));
      break;
    }
    case u.TABLE:
    case u.TBODY:
    case u.TFOOT:
    case u.THEAD:
    case u.TR: {
      if (e.openElements.hasInTableScope(tagID)) (e._closeTableCell(), ct(e, t));
      break;
    }
    case u.BODY:
    case u.CAPTION:
    case u.COL:
    case u.COLGROUP:
    case u.HTML:
      break;
    default:
      ne(e, t);
  }
}
//@ chunk-6ja29j2n.js:174488-175307 esm-fingerprint
function ot(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.OPTION: {
      if (e.openElements.currentTagId === u.OPTION) e.openElements.pop();
      e._insertElement(t, E.HTML);
      break;
    }
    case u.OPTGROUP: {
      if (e.openElements.currentTagId === u.OPTION) e.openElements.pop();
      if (e.openElements.currentTagId === u.OPTGROUP) e.openElements.pop();
      e._insertElement(t, E.HTML);
      break;
    }
    case u.HR: {
      if (e.openElements.currentTagId === u.OPTION) e.openElements.pop();
      if (e.openElements.currentTagId === u.OPTGROUP) e.openElements.pop();
      (e._appendElement(t, E.HTML), (t.ackSelfClosing = !0));
      break;
    }
    case u.INPUT:
    case u.KEYGEN:
    case u.TEXTAREA:
    case u.SELECT: {
      if (e.openElements.hasInSelectScope(u.SELECT)) {
        if ((e.openElements.popUntilTagNamePopped(u.SELECT), e._resetInsertionMode(), t.tagID !== u.SELECT))
          e._processStartTag(t);
      }
      break;
    }
    case u.SCRIPT:
    case u.TEMPLATE: {
      R(e, t);
      break;
    }
    default:
  }
}
//@ chunk-6ja29j2n.js:175307-175842 esm-fingerprint
function dt(e, t) {
  switch (t.tagID) {
    case u.OPTGROUP: {
      if (
        e.openElements.stackTop > 0 &&
        e.openElements.currentTagId === u.OPTION &&
        e.openElements.tagIDs[e.openElements.stackTop - 1] === u.OPTGROUP
      )
        e.openElements.pop();
      if (e.openElements.currentTagId === u.OPTGROUP) e.openElements.pop();
      break;
    }
    case u.OPTION: {
      if (e.openElements.currentTagId === u.OPTION) e.openElements.pop();
      break;
    }
    case u.SELECT: {
      if (e.openElements.hasInSelectScope(u.SELECT))
        (e.openElements.popUntilTagNamePopped(u.SELECT), e._resetInsertionMode());
      break;
    }
    case u.TEMPLATE: {
      B(e, t);
      break;
    }
    default:
  }
}
//@ chunk-6ja29j2n.js:175842-176078 esm-fingerprint
function ma(e, t) {
  let tagID = t.tagID;
  if (
    tagID === u.CAPTION ||
    tagID === u.TABLE ||
    tagID === u.TBODY ||
    tagID === u.TFOOT ||
    tagID === u.THEAD ||
    tagID === u.TR ||
    tagID === u.TD ||
    tagID === u.TH
  )
    (e.openElements.popUntilTagNamePopped(u.SELECT), e._resetInsertionMode(), e._processStartTag(t));
  else ot(e, t);
}
//@ chunk-6ja29j2n.js:176078-176344 esm-fingerprint
function _a(e, t) {
  let tagID = t.tagID;
  if (
    tagID === u.CAPTION ||
    tagID === u.TABLE ||
    tagID === u.TBODY ||
    tagID === u.TFOOT ||
    tagID === u.THEAD ||
    tagID === u.TR ||
    tagID === u.TD ||
    tagID === u.TH
  ) {
    if (e.openElements.hasInTableScope(tagID))
      (e.openElements.popUntilTagNamePopped(u.SELECT), e._resetInsertionMode(), e.onEndTag(t));
  } else dt(e, t);
}
//@ chunk-6ja29j2n.js:176344-177064 esm-fingerprint
function ba(e, t) {
  switch (t.tagID) {
    case u.BASE:
    case u.BASEFONT:
    case u.BGSOUND:
    case u.LINK:
    case u.META:
    case u.NOFRAMES:
    case u.SCRIPT:
    case u.STYLE:
    case u.TEMPLATE:
    case u.TITLE: {
      R(e, t);
      break;
    }
    case u.CAPTION:
    case u.COLGROUP:
    case u.TBODY:
    case u.TFOOT:
    case u.THEAD: {
      ((e.tmplInsertionModeStack[0] = i.IN_TABLE), (e.insertionMode = i.IN_TABLE), k(e, t));
      break;
    }
    case u.COL: {
      ((e.tmplInsertionModeStack[0] = i.IN_COLUMN_GROUP), (e.insertionMode = i.IN_COLUMN_GROUP), Ce(e, t));
      break;
    }
    case u.TR: {
      ((e.tmplInsertionModeStack[0] = i.IN_TABLE_BODY), (e.insertionMode = i.IN_TABLE_BODY), ce(e, t));
      break;
    }
    case u.TD:
    case u.TH: {
      ((e.tmplInsertionModeStack[0] = i.IN_ROW), (e.insertionMode = i.IN_ROW), oe(e, t));
      break;
    }
    default:
      ((e.tmplInsertionModeStack[0] = i.IN_BODY), (e.insertionMode = i.IN_BODY), I(e, t));
  }
}
//@ chunk-6ja29j2n.js:177064-177112 esm-fingerprint
function Aa(e, t) {
  if (t.tagID === u.TEMPLATE) B(e, t);
}
//@ chunk-6ja29j2n.js:177112-177336 esm-fingerprint
function Et(e, t) {
  if (e.openElements.tmplCount > 0)
    (e.openElements.popUntilTagNamePopped(u.TEMPLATE),
      e.activeFormattingElements.clearToLastMarker(),
      e.tmplInsertionModeStack.shift(),
      e._resetInsertionMode(),
      e.onEof(t));
  else Ie(e, t);
}
//@ chunk-6ja29j2n.js:177336-177393 esm-fingerprint
function Na(e, t) {
  if (t.tagID === u.HTML) I(e, t);
  else se(e, t);
}
//@ chunk-6ja29j2n.js:177393-177769 esm-fingerprint
function Tt(e, t) {
  var a;
  if (t.tagID === u.HTML) {
    if (!e.fragmentContext) e.insertionMode = i.AFTER_AFTER_BODY;
    if (e.options.sourceCodeLocationInfo && e.openElements.tagIDs[0] === u.HTML) {
      e._setEndLocation(e.openElements.items[0], t);
      let n = e.openElements.items[1];
      if (
        n &&
        !((a = e.treeAdapter.getNodeSourceCodeLocation(n)) === null || a === void 0 ? void 0 : a.endTag)
      )
        e._setEndLocation(n, t);
    }
  } else se(e, t);
}
//@ chunk-6ja29j2n.js:177769-177820 esm-fingerprint
function se(e, t) {
  ((e.insertionMode = i.IN_BODY), ie(e, t));
}
//@ chunk-6ja29j2n.js:177820-178036 esm-fingerprint
function Ia(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.FRAMESET: {
      e._insertElement(t, E.HTML);
      break;
    }
    case u.FRAME: {
      (e._appendElement(t, E.HTML), (t.ackSelfClosing = !0));
      break;
    }
    case u.NOFRAMES: {
      R(e, t);
      break;
    }
    default:
  }
}
//@ chunk-6ja29j2n.js:178036-178241 esm-fingerprint
function Ca(e, t) {
  if (t.tagID === u.FRAMESET && !e.openElements.isRootHtmlElementCurrent()) {
    if ((e.openElements.pop(), !e.fragmentContext && e.openElements.currentTagId !== u.FRAMESET))
      e.insertionMode = i.AFTER_FRAMESET;
  }
}
//@ chunk-6ja29j2n.js:178241-178340 esm-fingerprint
function Oa(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.NOFRAMES: {
      R(e, t);
      break;
    }
    default:
  }
}
//@ chunk-6ja29j2n.js:178340-178416 esm-fingerprint
function Sa(e, t) {
  if (t.tagID === u.HTML) e.insertionMode = i.AFTER_AFTER_FRAMESET;
}
//@ chunk-6ja29j2n.js:178416-178473 esm-fingerprint
function pa(e, t) {
  if (t.tagID === u.HTML) I(e, t);
  else ue(e, t);
}
//@ chunk-6ja29j2n.js:178473-178524 esm-fingerprint
function ue(e, t) {
  ((e.insertionMode = i.IN_BODY), ie(e, t));
}
//@ chunk-6ja29j2n.js:178524-178623 esm-fingerprint
function La(e, t) {
  switch (t.tagID) {
    case u.HTML: {
      I(e, t);
      break;
    }
    case u.NOFRAMES: {
      R(e, t);
      break;
    }
    default:
  }
}
//@ chunk-6ja29j2n.js:178623-178673 esm-fingerprint
function Ra(e, t) {
  ((t.chars = m), e._insertCharacters(t));
}
//@ chunk-6ja29j2n.js:178673-178729 esm-fingerprint
function Da(e, t) {
  (e._insertCharacters(t), (e.framesetOk = !1));
}
//@ chunk-6ja29j2n.js:178729-178910 esm-fingerprint
function ht(e) {
  while (
    e.treeAdapter.getNamespaceURI(e.openElements.current) !== E.HTML &&
    !e._isIntegrationPoint(e.openElements.currentTagId, e.openElements.current)
  )
    e.openElements.pop();
}
//@ chunk-6ja29j2n.js:178910-179200 esm-fingerprint
function ga(e, t) {
  if (qe(t)) (ht(e), e._startTagOutsideForeignContent(t));
  else {
    let _getAdjustedCurrentElement = e._getAdjustedCurrentElement(),
      namespaceURI = e.treeAdapter.getNamespaceURI(_getAdjustedCurrentElement);
    if (namespaceURI === E.MATHML) fe(t);
    else if (namespaceURI === E.SVG) (Xe(t), me(t));
    if ((te(t), t.selfClosing)) e._appendElement(t, namespaceURI);
    else e._insertElement(t, namespaceURI);
    t.ackSelfClosing = !0;
  }
}
//@ chunk-6ja29j2n.js:179200-179577 esm-fingerprint
function Pa(e, t) {
  if (t.tagID === u.P || t.tagID === u.BR) {
    (ht(e), e._endTagOutsideForeignContent(t));
    return;
  }
  for (let stackTop = e.openElements.stackTop; stackTop > 0; stackTop--) {
    let n = e.openElements.items[stackTop];
    if (e.treeAdapter.getNamespaceURI(n) === E.HTML) {
      e._endTagOutsideForeignContent(t);
      break;
    }
    let tagName = e.treeAdapter.getTagName(n);
    if (tagName.toLowerCase() === t.tagName) {
      ((t.tagName = tagName), e.openElements.shortenToLength(stackTop));
      break;
    }
  }
}

export { re };
