/**
 * parse5/dist/parser/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-p9ac6cnb.js (133)
 * attribution: esm-fingerprint 133
 */
import { TAG_ID, getTagID, SPECIAL_ELEMENTS, HEADING_ELEMENTS } from "../common/html.js";
import { defaultTreeAdapter } from "../tree-adapters/default.js";
import { Tokenizer, TokenizerMode } from "../tokenizer/index.js";
import { FormattingElementList, EntryType } from "./formatting-element-list.js";
import { OpenElementStack } from "./open-element-stack.js";
import { TAG_NAMES, NAMESPACES, DOCUMENT_MODE, ATTRS } from "../../lib/common/html.js";
import { TokenType, getTokenAttr } from "../common/token.js";
import {
  isIntegrationPoint,
  adjustTokenMathMLAttrs,
  adjustTokenXMLAttrs,
  adjustTokenSVGAttrs,
  causesExit,
  adjustTokenSVGTagName,
} from "../common/foreign-content.js";
import { errors } from "../../lib/common/error-codes.js";
import { CODE_POINTS, REPLACEMENT_CHARACTER } from "../common/unicode.js";
import { getDocumentMode, isConforming } from "../common/doctype.js";

//@ chunk-p9ac6cnb.js:132780-132808 esm-fingerprint
var HIDDEN_INPUT_TYPE = "hidden";
var AA_OUTER_LOOP_ITER = 8;
var AA_INNER_LOOP_ITER = 3;
var InsertionMode;
//@ chunk-p9ac6cnb.js:132808-133610 esm-fingerprint
(function (InsertionMode) {
  InsertionMode[(InsertionMode.INITIAL = 0)] = "INITIAL";
  InsertionMode[(InsertionMode.BEFORE_HTML = 1)] = "BEFORE_HTML";
  InsertionMode[(InsertionMode.BEFORE_HEAD = 2)] = "BEFORE_HEAD";
  InsertionMode[(InsertionMode.IN_HEAD = 3)] = "IN_HEAD";
  InsertionMode[(InsertionMode.IN_HEAD_NO_SCRIPT = 4)] = "IN_HEAD_NO_SCRIPT";
  InsertionMode[(InsertionMode.AFTER_HEAD = 5)] = "AFTER_HEAD";
  InsertionMode[(InsertionMode.IN_BODY = 6)] = "IN_BODY";
  InsertionMode[(InsertionMode.TEXT = 7)] = "TEXT";
  InsertionMode[(InsertionMode.IN_TABLE = 8)] = "IN_TABLE";
  InsertionMode[(InsertionMode.IN_TABLE_TEXT = 9)] = "IN_TABLE_TEXT";
  InsertionMode[(InsertionMode.IN_CAPTION = 10)] = "IN_CAPTION";
  InsertionMode[(InsertionMode.IN_COLUMN_GROUP = 11)] = "IN_COLUMN_GROUP";
  InsertionMode[(InsertionMode.IN_TABLE_BODY = 12)] = "IN_TABLE_BODY";
  InsertionMode[(InsertionMode.IN_ROW = 13)] = "IN_ROW";
  InsertionMode[(InsertionMode.IN_CELL = 14)] = "IN_CELL";
  InsertionMode[(InsertionMode.IN_SELECT = 15)] = "IN_SELECT";
  InsertionMode[(InsertionMode.IN_SELECT_IN_TABLE = 16)] = "IN_SELECT_IN_TABLE";
  InsertionMode[(InsertionMode.IN_TEMPLATE = 17)] = "IN_TEMPLATE";
  InsertionMode[(InsertionMode.AFTER_BODY = 18)] = "AFTER_BODY";
  InsertionMode[(InsertionMode.IN_FRAMESET = 19)] = "IN_FRAMESET";
  InsertionMode[(InsertionMode.AFTER_FRAMESET = 20)] = "AFTER_FRAMESET";
  InsertionMode[(InsertionMode.AFTER_AFTER_BODY = 21)] = "AFTER_AFTER_BODY";
  InsertionMode[(InsertionMode.AFTER_AFTER_FRAMESET = 22)] = "AFTER_AFTER_FRAMESET";
})(InsertionMode || (InsertionMode = {}));
//@ chunk-p9ac6cnb.js:133610-133827 esm-fingerprint
var BASE_LOC = {
  startLine: -1,
  startCol: -1,
  startOffset: -1,
  endLine: -1,
  endCol: -1,
  endOffset: -1,
};
var TABLE_STRUCTURE_TAGS = new Set([TAG_ID.TABLE, TAG_ID.TBODY, TAG_ID.TFOOT, TAG_ID.THEAD, TAG_ID.TR]);
var defaultParserOptions = {
  scriptingEnabled: true,
  sourceCodeLocationInfo: false,
  treeAdapter: defaultTreeAdapter,
  onParseError: null,
};
//@ chunk-p9ac6cnb.js:133827-150244 esm-fingerprint
class Parser {
  constructor(options, documentNode, fragmentContext = null, scriptHandler = null) {
    this.fragmentContext = fragmentContext;
    this.scriptHandler = scriptHandler;
    this.currentToken = null;
    this.stopped = false;
    this.insertionMode = InsertionMode.INITIAL;
    this.originalInsertionMode = InsertionMode.INITIAL;
    this.headElement = null;
    this.formElement = null;
    this.currentNotInHTML = false;
    this.tmplInsertionModeStack = [];
    this.pendingCharacterTokens = [];
    this.hasNonWhitespacePendingCharacterToken = false;
    this.framesetOk = true;
    this.skipNextNewLine = false;
    this.fosterParentingEnabled = false;
    this.options = {
      ...defaultParserOptions,
      ...options,
    };
    this.treeAdapter = this.options.treeAdapter;
    this.onParseError = this.options.onParseError;
    if (this.onParseError) this.options.sourceCodeLocationInfo = true;
    this.document =
      documentNode !== null && documentNode !== undefined ? documentNode : this.treeAdapter.createDocument();
    this.tokenizer = new Tokenizer(this.options, this);
    this.activeFormattingElements = new FormattingElementList(this.treeAdapter);
    this.fragmentContextID = fragmentContext
      ? getTagID(this.treeAdapter.getTagName(fragmentContext))
      : TAG_ID.UNKNOWN;
    this._setContextModes(
      fragmentContext !== null && fragmentContext !== undefined ? fragmentContext : this.document,
      this.fragmentContextID,
    );
    this.openElements = new OpenElementStack(this.document, this.treeAdapter, this);
  }
  static parse(html, options) {
    let parser = new this(options);
    parser.tokenizer.write(html, true);
    return parser.document;
  }
  static getFragmentParser(fragmentContext, options) {
    let opts = {
      ...defaultParserOptions,
      ...options,
    };
    if (!(fragmentContext !== null && fragmentContext !== undefined))
      fragmentContext = opts.treeAdapter.createElement(TAG_NAMES.TEMPLATE, NAMESPACES.HTML, []);
    let documentMock = opts.treeAdapter.createElement("documentmock", NAMESPACES.HTML, []);
    let parser = new this(opts, documentMock, fragmentContext);
    if (parser.fragmentContextID === TAG_ID.TEMPLATE)
      parser.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
    parser._initTokenizerForFragmentParsing();
    parser._insertFakeRootElement();
    parser._resetInsertionMode();
    parser._findFormInFragmentContext();
    return parser;
  }
  getFragment() {
    let rootElement = this.treeAdapter.getFirstChild(this.document);
    let fragment = this.treeAdapter.createDocumentFragment();
    this._adoptNodes(rootElement, fragment);
    return fragment;
  }
  _err(token, code, beforeToken) {
    var _a;
    if (!this.onParseError) return;
    let loc = (_a = token.location) !== null && _a !== undefined ? _a : BASE_LOC;
    let err = {
      code,
      startLine: loc.startLine,
      startCol: loc.startCol,
      startOffset: loc.startOffset,
      endLine: beforeToken ? loc.startLine : loc.endLine,
      endCol: beforeToken ? loc.startCol : loc.endCol,
      endOffset: beforeToken ? loc.startOffset : loc.endOffset,
    };
    this.onParseError(err);
  }
  onItemPush(node, tid, isTop) {
    var _a;
    var _b;
    if (!((_b = (_a = this.treeAdapter).onItemPush) === null || _b === undefined)) _b.call(_a, node);
    if (isTop && this.openElements.stackTop > 0) this._setContextModes(node, tid);
  }
  onItemPop(node, isTop) {
    var _a;
    var _b;
    if (this.options.sourceCodeLocationInfo) this._setEndLocation(node, this.currentToken);
    if (!((_b = (_a = this.treeAdapter).onItemPop) === null || _b === undefined))
      _b.call(_a, node, this.openElements.current);
    if (isTop) {
      let current;
      let currentTagId;
      if (this.openElements.stackTop === 0 && this.fragmentContext) {
        current = this.fragmentContext;
        currentTagId = this.fragmentContextID;
      } else ({ current, currentTagId } = this.openElements);
      this._setContextModes(current, currentTagId);
    }
  }
  _setContextModes(current, tid) {
    let isHTML = current === this.document || this.treeAdapter.getNamespaceURI(current) === NAMESPACES.HTML;
    this.currentNotInHTML = !isHTML;
    this.tokenizer.inForeignNode = !isHTML && !this._isIntegrationPoint(tid, current);
  }
  _switchToTextParsing(currentToken, nextTokenizerState) {
    this._insertElement(currentToken, NAMESPACES.HTML);
    this.tokenizer.state = nextTokenizerState;
    this.originalInsertionMode = this.insertionMode;
    this.insertionMode = InsertionMode.TEXT;
  }
  switchToPlaintextParsing() {
    this.insertionMode = InsertionMode.TEXT;
    this.originalInsertionMode = InsertionMode.IN_BODY;
    this.tokenizer.state = TokenizerMode.PLAINTEXT;
  }
  _getAdjustedCurrentElement() {
    return this.openElements.stackTop === 0 && this.fragmentContext
      ? this.fragmentContext
      : this.openElements.current;
  }
  _findFormInFragmentContext() {
    let node = this.fragmentContext;
    while (node) {
      if (this.treeAdapter.getTagName(node) === TAG_NAMES.FORM) {
        this.formElement = node;
        break;
      }
      node = this.treeAdapter.getParentNode(node);
    }
  }
  _initTokenizerForFragmentParsing() {
    if (!this.fragmentContext || this.treeAdapter.getNamespaceURI(this.fragmentContext) !== NAMESPACES.HTML)
      return;
    switch (this.fragmentContextID) {
      case TAG_ID.TITLE:
      case TAG_ID.TEXTAREA: {
        this.tokenizer.state = TokenizerMode.RCDATA;
        break;
      }
      case TAG_ID.STYLE:
      case TAG_ID.XMP:
      case TAG_ID.IFRAME:
      case TAG_ID.NOEMBED:
      case TAG_ID.NOFRAMES:
      case TAG_ID.NOSCRIPT: {
        this.tokenizer.state = TokenizerMode.RAWTEXT;
        break;
      }
      case TAG_ID.SCRIPT: {
        this.tokenizer.state = TokenizerMode.SCRIPT_DATA;
        break;
      }
      case TAG_ID.PLAINTEXT: {
        this.tokenizer.state = TokenizerMode.PLAINTEXT;
        break;
      }
      default:
    }
  }
  _setDocumentType(token) {
    let name = token.name || "";
    let publicId = token.publicId || "";
    let systemId = token.systemId || "";
    this.treeAdapter.setDocumentType(this.document, name, publicId, systemId);
    if (token.location) {
      let docTypeNode = this.treeAdapter
        .getChildNodes(this.document)
        .find((node) => this.treeAdapter.isDocumentTypeNode(node));
      if (docTypeNode) this.treeAdapter.setNodeSourceCodeLocation(docTypeNode, token.location);
    }
  }
  _attachElementToTree(element, location) {
    if (this.options.sourceCodeLocationInfo) {
      let loc = location && {
        ...location,
        startTag: location,
      };
      this.treeAdapter.setNodeSourceCodeLocation(element, loc);
    }
    if (this._shouldFosterParentOnInsertion()) this._fosterParentElement(element);
    else {
      let parent = this.openElements.currentTmplContentOrNode;
      this.treeAdapter.appendChild(parent, element);
    }
  }
  _appendElement(token, namespaceURI) {
    let element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
    this._attachElementToTree(element, token.location);
  }
  _insertElement(token, namespaceURI) {
    let element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
    this._attachElementToTree(element, token.location);
    this.openElements.push(element, token.tagID);
  }
  _insertFakeElement(tagName, tagID) {
    let element = this.treeAdapter.createElement(tagName, NAMESPACES.HTML, []);
    this._attachElementToTree(element, null);
    this.openElements.push(element, tagID);
  }
  _insertTemplate(token) {
    let tmpl = this.treeAdapter.createElement(token.tagName, NAMESPACES.HTML, token.attrs);
    let content = this.treeAdapter.createDocumentFragment();
    this.treeAdapter.setTemplateContent(tmpl, content);
    this._attachElementToTree(tmpl, token.location);
    this.openElements.push(tmpl, token.tagID);
    if (this.options.sourceCodeLocationInfo) this.treeAdapter.setNodeSourceCodeLocation(content, null);
  }
  _insertFakeRootElement() {
    let element = this.treeAdapter.createElement(TAG_NAMES.HTML, NAMESPACES.HTML, []);
    if (this.options.sourceCodeLocationInfo) this.treeAdapter.setNodeSourceCodeLocation(element, null);
    this.treeAdapter.appendChild(this.openElements.current, element);
    this.openElements.push(element, TAG_ID.HTML);
  }
  _appendCommentNode(token, parent) {
    let commentNode = this.treeAdapter.createCommentNode(token.data);
    this.treeAdapter.appendChild(parent, commentNode);
    if (this.options.sourceCodeLocationInfo)
      this.treeAdapter.setNodeSourceCodeLocation(commentNode, token.location);
  }
  _insertCharacters(token) {
    let parent;
    let beforeElement;
    if (this._shouldFosterParentOnInsertion()) {
      ({ parent, beforeElement } = this._findFosterParentingLocation());
      if (beforeElement) this.treeAdapter.insertTextBefore(parent, token.chars, beforeElement);
      else this.treeAdapter.insertText(parent, token.chars);
    } else {
      parent = this.openElements.currentTmplContentOrNode;
      this.treeAdapter.insertText(parent, token.chars);
    }
    if (!token.location) return;
    let siblings = this.treeAdapter.getChildNodes(parent);
    let textNodeIdx = beforeElement ? siblings.lastIndexOf(beforeElement) : siblings.length;
    let textNode = siblings[textNodeIdx - 1];
    if (this.treeAdapter.getNodeSourceCodeLocation(textNode)) {
      let { endLine, endCol, endOffset } = token.location;
      this.treeAdapter.updateNodeSourceCodeLocation(textNode, {
        endLine,
        endCol,
        endOffset,
      });
    } else if (this.options.sourceCodeLocationInfo)
      this.treeAdapter.setNodeSourceCodeLocation(textNode, token.location);
  }
  _adoptNodes(donor, recipient) {
    for (
      let child = this.treeAdapter.getFirstChild(donor);
      child;
      child = this.treeAdapter.getFirstChild(donor)
    ) {
      this.treeAdapter.detachNode(child);
      this.treeAdapter.appendChild(recipient, child);
    }
  }
  _setEndLocation(element, closingToken) {
    if (this.treeAdapter.getNodeSourceCodeLocation(element) && closingToken.location) {
      let ctLoc = closingToken.location;
      let tn = this.treeAdapter.getTagName(element);
      let endLoc =
        closingToken.type === TokenType.END_TAG && tn === closingToken.tagName
          ? {
              endTag: {
                ...ctLoc,
              },
              endLine: ctLoc.endLine,
              endCol: ctLoc.endCol,
              endOffset: ctLoc.endOffset,
            }
          : {
              endLine: ctLoc.startLine,
              endCol: ctLoc.startCol,
              endOffset: ctLoc.startOffset,
            };
      this.treeAdapter.updateNodeSourceCodeLocation(element, endLoc);
    }
  }
  shouldProcessStartTagTokenInForeignContent(token) {
    if (!this.currentNotInHTML) return false;
    let current;
    let currentTagId;
    if (this.openElements.stackTop === 0 && this.fragmentContext) {
      current = this.fragmentContext;
      currentTagId = this.fragmentContextID;
    } else ({ current, currentTagId } = this.openElements);
    if (
      token.tagID === TAG_ID.SVG &&
      this.treeAdapter.getTagName(current) === TAG_NAMES.ANNOTATION_XML &&
      this.treeAdapter.getNamespaceURI(current) === NAMESPACES.MATHML
    )
      return false;
    return (
      this.tokenizer.inForeignNode ||
      ((token.tagID === TAG_ID.MGLYPH || token.tagID === TAG_ID.MALIGNMARK) &&
        !this._isIntegrationPoint(currentTagId, current, NAMESPACES.HTML))
    );
  }
  _processToken(token) {
    switch (token.type) {
      case TokenType.CHARACTER: {
        this.onCharacter(token);
        break;
      }
      case TokenType.NULL_CHARACTER: {
        this.onNullCharacter(token);
        break;
      }
      case TokenType.COMMENT: {
        this.onComment(token);
        break;
      }
      case TokenType.DOCTYPE: {
        this.onDoctype(token);
        break;
      }
      case TokenType.START_TAG: {
        this._processStartTag(token);
        break;
      }
      case TokenType.END_TAG: {
        this.onEndTag(token);
        break;
      }
      case TokenType.EOF: {
        this.onEof(token);
        break;
      }
      case TokenType.WHITESPACE_CHARACTER: {
        this.onWhitespaceCharacter(token);
        break;
      }
    }
  }
  _isIntegrationPoint(tid, element, foreignNS) {
    let ns = this.treeAdapter.getNamespaceURI(element);
    let attrs = this.treeAdapter.getAttrList(element);
    return isIntegrationPoint(tid, ns, attrs, foreignNS);
  }
  _reconstructActiveFormattingElements() {
    let listLength = this.activeFormattingElements.entries.length;
    if (listLength) {
      let endIndex = this.activeFormattingElements.entries.findIndex(
        (entry) => entry.type === EntryType.Marker || this.openElements.contains(entry.element),
      );
      let unopenIdx = endIndex < 0 ? listLength - 1 : endIndex - 1;
      for (let i = unopenIdx; i >= 0; i--) {
        let entry = this.activeFormattingElements.entries[i];
        this._insertElement(entry.token, this.treeAdapter.getNamespaceURI(entry.element));
        entry.element = this.openElements.current;
      }
    }
  }
  _closeTableCell() {
    this.openElements.generateImpliedEndTags();
    this.openElements.popUntilTableCellPopped();
    this.activeFormattingElements.clearToLastMarker();
    this.insertionMode = InsertionMode.IN_ROW;
  }
  _closePElement() {
    this.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.P);
    this.openElements.popUntilTagNamePopped(TAG_ID.P);
  }
  _resetInsertionMode() {
    for (let i = this.openElements.stackTop; i >= 0; i--)
      switch (i === 0 && this.fragmentContext ? this.fragmentContextID : this.openElements.tagIDs[i]) {
        case TAG_ID.TR: {
          this.insertionMode = InsertionMode.IN_ROW;
          return;
        }
        case TAG_ID.TBODY:
        case TAG_ID.THEAD:
        case TAG_ID.TFOOT: {
          this.insertionMode = InsertionMode.IN_TABLE_BODY;
          return;
        }
        case TAG_ID.CAPTION: {
          this.insertionMode = InsertionMode.IN_CAPTION;
          return;
        }
        case TAG_ID.COLGROUP: {
          this.insertionMode = InsertionMode.IN_COLUMN_GROUP;
          return;
        }
        case TAG_ID.TABLE: {
          this.insertionMode = InsertionMode.IN_TABLE;
          return;
        }
        case TAG_ID.BODY: {
          this.insertionMode = InsertionMode.IN_BODY;
          return;
        }
        case TAG_ID.FRAMESET: {
          this.insertionMode = InsertionMode.IN_FRAMESET;
          return;
        }
        case TAG_ID.SELECT: {
          this._resetInsertionModeForSelect(i);
          return;
        }
        case TAG_ID.TEMPLATE: {
          this.insertionMode = this.tmplInsertionModeStack[0];
          return;
        }
        case TAG_ID.HTML: {
          this.insertionMode = this.headElement ? InsertionMode.AFTER_HEAD : InsertionMode.BEFORE_HEAD;
          return;
        }
        case TAG_ID.TD:
        case TAG_ID.TH: {
          if (i > 0) {
            this.insertionMode = InsertionMode.IN_CELL;
            return;
          }
          break;
        }
        case TAG_ID.HEAD: {
          if (i > 0) {
            this.insertionMode = InsertionMode.IN_HEAD;
            return;
          }
          break;
        }
      }
    this.insertionMode = InsertionMode.IN_BODY;
  }
  _resetInsertionModeForSelect(selectIdx) {
    if (selectIdx > 0)
      for (let i = selectIdx - 1; i > 0; i--) {
        let tn = this.openElements.tagIDs[i];
        if (tn === TAG_ID.TEMPLATE) break;
        else if (tn === TAG_ID.TABLE) {
          this.insertionMode = InsertionMode.IN_SELECT_IN_TABLE;
          return;
        }
      }
    this.insertionMode = InsertionMode.IN_SELECT;
  }
  _isElementCausesFosterParenting(tn) {
    return TABLE_STRUCTURE_TAGS.has(tn);
  }
  _shouldFosterParentOnInsertion() {
    return (
      this.fosterParentingEnabled && this._isElementCausesFosterParenting(this.openElements.currentTagId)
    );
  }
  _findFosterParentingLocation() {
    for (let i = this.openElements.stackTop; i >= 0; i--) {
      let openElement = this.openElements.items[i];
      switch (this.openElements.tagIDs[i]) {
        case TAG_ID.TEMPLATE: {
          if (this.treeAdapter.getNamespaceURI(openElement) === NAMESPACES.HTML)
            return {
              parent: this.treeAdapter.getTemplateContent(openElement),
              beforeElement: null,
            };
          break;
        }
        case TAG_ID.TABLE: {
          let parent = this.treeAdapter.getParentNode(openElement);
          if (parent)
            return {
              parent,
              beforeElement: openElement,
            };
          return {
            parent: this.openElements.items[i - 1],
            beforeElement: null,
          };
        }
        default:
      }
    }
    return {
      parent: this.openElements.items[0],
      beforeElement: null,
    };
  }
  _fosterParentElement(element) {
    let location = this._findFosterParentingLocation();
    if (location.beforeElement)
      this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
    else this.treeAdapter.appendChild(location.parent, element);
  }
  _isSpecialElement(element, id) {
    let ns = this.treeAdapter.getNamespaceURI(element);
    return SPECIAL_ELEMENTS[ns].has(id);
  }
  onCharacter(token) {
    this.skipNextNewLine = false;
    if (this.tokenizer.inForeignNode) {
      characterInForeignContent(this, token);
      return;
    }
    switch (this.insertionMode) {
      case InsertionMode.INITIAL: {
        tokenInInitialMode(this, token);
        break;
      }
      case InsertionMode.BEFORE_HTML: {
        tokenBeforeHtml(this, token);
        break;
      }
      case InsertionMode.BEFORE_HEAD: {
        tokenBeforeHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD: {
        tokenInHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD_NO_SCRIPT: {
        tokenInHeadNoScript(this, token);
        break;
      }
      case InsertionMode.AFTER_HEAD: {
        tokenAfterHead(this, token);
        break;
      }
      case InsertionMode.IN_BODY:
      case InsertionMode.IN_CAPTION:
      case InsertionMode.IN_CELL:
      case InsertionMode.IN_TEMPLATE: {
        characterInBody(this, token);
        break;
      }
      case InsertionMode.TEXT:
      case InsertionMode.IN_SELECT:
      case InsertionMode.IN_SELECT_IN_TABLE: {
        this._insertCharacters(token);
        break;
      }
      case InsertionMode.IN_TABLE:
      case InsertionMode.IN_TABLE_BODY:
      case InsertionMode.IN_ROW: {
        characterInTable(this, token);
        break;
      }
      case InsertionMode.IN_TABLE_TEXT: {
        characterInTableText(this, token);
        break;
      }
      case InsertionMode.IN_COLUMN_GROUP: {
        tokenInColumnGroup(this, token);
        break;
      }
      case InsertionMode.AFTER_BODY: {
        tokenAfterBody(this, token);
        break;
      }
      case InsertionMode.AFTER_AFTER_BODY: {
        tokenAfterAfterBody(this, token);
        break;
      }
      default:
    }
  }
  onNullCharacter(token) {
    this.skipNextNewLine = false;
    if (this.tokenizer.inForeignNode) {
      nullCharacterInForeignContent(this, token);
      return;
    }
    switch (this.insertionMode) {
      case InsertionMode.INITIAL: {
        tokenInInitialMode(this, token);
        break;
      }
      case InsertionMode.BEFORE_HTML: {
        tokenBeforeHtml(this, token);
        break;
      }
      case InsertionMode.BEFORE_HEAD: {
        tokenBeforeHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD: {
        tokenInHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD_NO_SCRIPT: {
        tokenInHeadNoScript(this, token);
        break;
      }
      case InsertionMode.AFTER_HEAD: {
        tokenAfterHead(this, token);
        break;
      }
      case InsertionMode.TEXT: {
        this._insertCharacters(token);
        break;
      }
      case InsertionMode.IN_TABLE:
      case InsertionMode.IN_TABLE_BODY:
      case InsertionMode.IN_ROW: {
        characterInTable(this, token);
        break;
      }
      case InsertionMode.IN_COLUMN_GROUP: {
        tokenInColumnGroup(this, token);
        break;
      }
      case InsertionMode.AFTER_BODY: {
        tokenAfterBody(this, token);
        break;
      }
      case InsertionMode.AFTER_AFTER_BODY: {
        tokenAfterAfterBody(this, token);
        break;
      }
      default:
    }
  }
  onComment(token) {
    this.skipNextNewLine = false;
    if (this.currentNotInHTML) {
      appendComment(this, token);
      return;
    }
    switch (this.insertionMode) {
      case InsertionMode.INITIAL:
      case InsertionMode.BEFORE_HTML:
      case InsertionMode.BEFORE_HEAD:
      case InsertionMode.IN_HEAD:
      case InsertionMode.IN_HEAD_NO_SCRIPT:
      case InsertionMode.AFTER_HEAD:
      case InsertionMode.IN_BODY:
      case InsertionMode.IN_TABLE:
      case InsertionMode.IN_CAPTION:
      case InsertionMode.IN_COLUMN_GROUP:
      case InsertionMode.IN_TABLE_BODY:
      case InsertionMode.IN_ROW:
      case InsertionMode.IN_CELL:
      case InsertionMode.IN_SELECT:
      case InsertionMode.IN_SELECT_IN_TABLE:
      case InsertionMode.IN_TEMPLATE:
      case InsertionMode.IN_FRAMESET:
      case InsertionMode.AFTER_FRAMESET: {
        appendComment(this, token);
        break;
      }
      case InsertionMode.IN_TABLE_TEXT: {
        tokenInTableText(this, token);
        break;
      }
      case InsertionMode.AFTER_BODY: {
        appendCommentToRootHtmlElement(this, token);
        break;
      }
      case InsertionMode.AFTER_AFTER_BODY:
      case InsertionMode.AFTER_AFTER_FRAMESET: {
        appendCommentToDocument(this, token);
        break;
      }
      default:
    }
  }
  onDoctype(token) {
    switch (((this.skipNextNewLine = false), this.insertionMode)) {
      case InsertionMode.INITIAL: {
        doctypeInInitialMode(this, token);
        break;
      }
      case InsertionMode.BEFORE_HEAD:
      case InsertionMode.IN_HEAD:
      case InsertionMode.IN_HEAD_NO_SCRIPT:
      case InsertionMode.AFTER_HEAD: {
        this._err(token, errors.misplacedDoctype);
        break;
      }
      case InsertionMode.IN_TABLE_TEXT: {
        tokenInTableText(this, token);
        break;
      }
      default:
    }
  }
  onStartTag(token) {
    this.skipNextNewLine = false;
    this.currentToken = token;
    this._processStartTag(token);
    if (token.selfClosing && !token.ackSelfClosing)
      this._err(token, errors.nonVoidHtmlElementStartTagWithTrailingSolidus);
  }
  _processStartTag(token) {
    if (this.shouldProcessStartTagTokenInForeignContent(token)) startTagInForeignContent(this, token);
    else this._startTagOutsideForeignContent(token);
  }
  _startTagOutsideForeignContent(token) {
    switch (this.insertionMode) {
      case InsertionMode.INITIAL: {
        tokenInInitialMode(this, token);
        break;
      }
      case InsertionMode.BEFORE_HTML: {
        startTagBeforeHtml(this, token);
        break;
      }
      case InsertionMode.BEFORE_HEAD: {
        startTagBeforeHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD: {
        startTagInHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD_NO_SCRIPT: {
        startTagInHeadNoScript(this, token);
        break;
      }
      case InsertionMode.AFTER_HEAD: {
        startTagAfterHead(this, token);
        break;
      }
      case InsertionMode.IN_BODY: {
        startTagInBody(this, token);
        break;
      }
      case InsertionMode.IN_TABLE: {
        startTagInTable(this, token);
        break;
      }
      case InsertionMode.IN_TABLE_TEXT: {
        tokenInTableText(this, token);
        break;
      }
      case InsertionMode.IN_CAPTION: {
        startTagInCaption(this, token);
        break;
      }
      case InsertionMode.IN_COLUMN_GROUP: {
        startTagInColumnGroup(this, token);
        break;
      }
      case InsertionMode.IN_TABLE_BODY: {
        startTagInTableBody(this, token);
        break;
      }
      case InsertionMode.IN_ROW: {
        startTagInRow(this, token);
        break;
      }
      case InsertionMode.IN_CELL: {
        startTagInCell(this, token);
        break;
      }
      case InsertionMode.IN_SELECT: {
        startTagInSelect(this, token);
        break;
      }
      case InsertionMode.IN_SELECT_IN_TABLE: {
        startTagInSelectInTable(this, token);
        break;
      }
      case InsertionMode.IN_TEMPLATE: {
        startTagInTemplate(this, token);
        break;
      }
      case InsertionMode.AFTER_BODY: {
        startTagAfterBody(this, token);
        break;
      }
      case InsertionMode.IN_FRAMESET: {
        startTagInFrameset(this, token);
        break;
      }
      case InsertionMode.AFTER_FRAMESET: {
        startTagAfterFrameset(this, token);
        break;
      }
      case InsertionMode.AFTER_AFTER_BODY: {
        startTagAfterAfterBody(this, token);
        break;
      }
      case InsertionMode.AFTER_AFTER_FRAMESET: {
        startTagAfterAfterFrameset(this, token);
        break;
      }
      default:
    }
  }
  onEndTag(token) {
    this.skipNextNewLine = false;
    this.currentToken = token;
    if (this.currentNotInHTML) endTagInForeignContent(this, token);
    else this._endTagOutsideForeignContent(token);
  }
  _endTagOutsideForeignContent(token) {
    switch (this.insertionMode) {
      case InsertionMode.INITIAL: {
        tokenInInitialMode(this, token);
        break;
      }
      case InsertionMode.BEFORE_HTML: {
        endTagBeforeHtml(this, token);
        break;
      }
      case InsertionMode.BEFORE_HEAD: {
        endTagBeforeHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD: {
        endTagInHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD_NO_SCRIPT: {
        endTagInHeadNoScript(this, token);
        break;
      }
      case InsertionMode.AFTER_HEAD: {
        endTagAfterHead(this, token);
        break;
      }
      case InsertionMode.IN_BODY: {
        endTagInBody(this, token);
        break;
      }
      case InsertionMode.TEXT: {
        endTagInText(this, token);
        break;
      }
      case InsertionMode.IN_TABLE: {
        endTagInTable(this, token);
        break;
      }
      case InsertionMode.IN_TABLE_TEXT: {
        tokenInTableText(this, token);
        break;
      }
      case InsertionMode.IN_CAPTION: {
        endTagInCaption(this, token);
        break;
      }
      case InsertionMode.IN_COLUMN_GROUP: {
        endTagInColumnGroup(this, token);
        break;
      }
      case InsertionMode.IN_TABLE_BODY: {
        endTagInTableBody(this, token);
        break;
      }
      case InsertionMode.IN_ROW: {
        endTagInRow(this, token);
        break;
      }
      case InsertionMode.IN_CELL: {
        endTagInCell(this, token);
        break;
      }
      case InsertionMode.IN_SELECT: {
        endTagInSelect(this, token);
        break;
      }
      case InsertionMode.IN_SELECT_IN_TABLE: {
        endTagInSelectInTable(this, token);
        break;
      }
      case InsertionMode.IN_TEMPLATE: {
        endTagInTemplate(this, token);
        break;
      }
      case InsertionMode.AFTER_BODY: {
        endTagAfterBody(this, token);
        break;
      }
      case InsertionMode.IN_FRAMESET: {
        endTagInFrameset(this, token);
        break;
      }
      case InsertionMode.AFTER_FRAMESET: {
        endTagAfterFrameset(this, token);
        break;
      }
      case InsertionMode.AFTER_AFTER_BODY: {
        tokenAfterAfterBody(this, token);
        break;
      }
      default:
    }
  }
  onEof(token) {
    switch (this.insertionMode) {
      case InsertionMode.INITIAL: {
        tokenInInitialMode(this, token);
        break;
      }
      case InsertionMode.BEFORE_HTML: {
        tokenBeforeHtml(this, token);
        break;
      }
      case InsertionMode.BEFORE_HEAD: {
        tokenBeforeHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD: {
        tokenInHead(this, token);
        break;
      }
      case InsertionMode.IN_HEAD_NO_SCRIPT: {
        tokenInHeadNoScript(this, token);
        break;
      }
      case InsertionMode.AFTER_HEAD: {
        tokenAfterHead(this, token);
        break;
      }
      case InsertionMode.IN_BODY:
      case InsertionMode.IN_TABLE:
      case InsertionMode.IN_CAPTION:
      case InsertionMode.IN_COLUMN_GROUP:
      case InsertionMode.IN_TABLE_BODY:
      case InsertionMode.IN_ROW:
      case InsertionMode.IN_CELL:
      case InsertionMode.IN_SELECT:
      case InsertionMode.IN_SELECT_IN_TABLE: {
        eofInBody(this, token);
        break;
      }
      case InsertionMode.TEXT: {
        eofInText(this, token);
        break;
      }
      case InsertionMode.IN_TABLE_TEXT: {
        tokenInTableText(this, token);
        break;
      }
      case InsertionMode.IN_TEMPLATE: {
        eofInTemplate(this, token);
        break;
      }
      case InsertionMode.AFTER_BODY:
      case InsertionMode.IN_FRAMESET:
      case InsertionMode.AFTER_FRAMESET:
      case InsertionMode.AFTER_AFTER_BODY:
      case InsertionMode.AFTER_AFTER_FRAMESET: {
        stopParsing(this, token);
        break;
      }
      default:
    }
  }
  onWhitespaceCharacter(token) {
    if (this.skipNextNewLine) {
      this.skipNextNewLine = false;
      if (token.chars.charCodeAt(0) === CODE_POINTS.LINE_FEED) {
        if (token.chars.length === 1) return;
        token.chars = token.chars.substr(1);
      }
    }
    if (this.tokenizer.inForeignNode) {
      this._insertCharacters(token);
      return;
    }
    switch (this.insertionMode) {
      case InsertionMode.IN_HEAD:
      case InsertionMode.IN_HEAD_NO_SCRIPT:
      case InsertionMode.AFTER_HEAD:
      case InsertionMode.TEXT:
      case InsertionMode.IN_COLUMN_GROUP:
      case InsertionMode.IN_SELECT:
      case InsertionMode.IN_SELECT_IN_TABLE:
      case InsertionMode.IN_FRAMESET:
      case InsertionMode.AFTER_FRAMESET: {
        this._insertCharacters(token);
        break;
      }
      case InsertionMode.IN_BODY:
      case InsertionMode.IN_CAPTION:
      case InsertionMode.IN_CELL:
      case InsertionMode.IN_TEMPLATE:
      case InsertionMode.AFTER_BODY:
      case InsertionMode.AFTER_AFTER_BODY:
      case InsertionMode.AFTER_AFTER_FRAMESET: {
        whitespaceCharacterInBody(this, token);
        break;
      }
      case InsertionMode.IN_TABLE:
      case InsertionMode.IN_TABLE_BODY:
      case InsertionMode.IN_ROW: {
        characterInTable(this, token);
        break;
      }
      case InsertionMode.IN_TABLE_TEXT: {
        whitespaceCharacterInTableText(this, token);
        break;
      }
      default:
    }
  }
}
//@ chunk-p9ac6cnb.js:150244-150506 esm-fingerprint
function aaObtainFormattingElementEntry(p, token) {
  let formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);
  if (formattingElementEntry) {
    if (!p.openElements.contains(formattingElementEntry.element)) {
      p.activeFormattingElements.removeEntry(formattingElementEntry);
      formattingElementEntry = null;
    } else if (!p.openElements.hasInScope(token.tagID)) formattingElementEntry = null;
  } else genericEndTagInBody(p, token);
  return formattingElementEntry;
}
//@ chunk-p9ac6cnb.js:150506-150780 esm-fingerprint
function aaObtainFurthestBlock(p, formattingElementEntry) {
  let furthestBlock = null;
  let idx = p.openElements.stackTop;
  for (; idx >= 0; idx--) {
    let element = p.openElements.items[idx];
    if (element === formattingElementEntry.element) break;
    if (p._isSpecialElement(element, p.openElements.tagIDs[idx])) furthestBlock = element;
  }
  if (!furthestBlock) {
    p.openElements.shortenToLength(idx < 0 ? 0 : idx);
    p.activeFormattingElements.removeEntry(formattingElementEntry);
  }
  return furthestBlock;
}
//@ chunk-p9ac6cnb.js:150780-151194 esm-fingerprint
function aaInnerLoop(p, furthestBlock, formattingElement) {
  let lastElement = furthestBlock;
  let nextElement = p.openElements.getCommonAncestor(furthestBlock);
  for (let i = 0, element = nextElement; element !== formattingElement; i++, element = nextElement) {
    nextElement = p.openElements.getCommonAncestor(element);
    let elementEntry = p.activeFormattingElements.getElementEntry(element);
    let counterOverflow = elementEntry && i >= AA_INNER_LOOP_ITER;
    if (!elementEntry || counterOverflow) {
      if (counterOverflow) p.activeFormattingElements.removeEntry(elementEntry);
      p.openElements.remove(element);
    } else {
      element = aaRecreateElementFromEntry(p, elementEntry);
      if (lastElement === furthestBlock) p.activeFormattingElements.bookmark = elementEntry;
      p.treeAdapter.detachNode(lastElement);
      p.treeAdapter.appendChild(element, lastElement);
      lastElement = element;
    }
  }
  return lastElement;
}
//@ chunk-p9ac6cnb.js:151194-151378 esm-fingerprint
function aaRecreateElementFromEntry(p, elementEntry) {
  let ns = p.treeAdapter.getNamespaceURI(elementEntry.element);
  let newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);
  p.openElements.replace(elementEntry.element, newElement);
  elementEntry.element = newElement;
  return newElement;
}
//@ chunk-p9ac6cnb.js:151378-151648 esm-fingerprint
function aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement) {
  let tn = p.treeAdapter.getTagName(commonAncestor);
  let tid = getTagID(tn);
  if (p._isElementCausesFosterParenting(tid)) p._fosterParentElement(lastElement);
  else {
    let ns = p.treeAdapter.getNamespaceURI(commonAncestor);
    if (tid === TAG_ID.TEMPLATE && ns === NAMESPACES.HTML)
      commonAncestor = p.treeAdapter.getTemplateContent(commonAncestor);
    p.treeAdapter.appendChild(commonAncestor, lastElement);
  }
}
//@ chunk-p9ac6cnb.js:151648-152001 esm-fingerprint
function aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry) {
  let ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element);
  let { token } = formattingElementEntry;
  let newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);
  p._adoptNodes(furthestBlock, newElement);
  p.treeAdapter.appendChild(furthestBlock, newElement);
  p.activeFormattingElements.insertElementAfterBookmark(newElement, token);
  p.activeFormattingElements.removeEntry(formattingElementEntry);
  p.openElements.remove(formattingElementEntry.element);
  p.openElements.insertAfter(furthestBlock, newElement, token.tagID);
}
//@ chunk-p9ac6cnb.js:152001-152254 esm-fingerprint
function callAdoptionAgency(p, token) {
  for (let i = 0; i < AA_OUTER_LOOP_ITER; i++) {
    let formattingElementEntry = aaObtainFormattingElementEntry(p, token);
    if (!formattingElementEntry) break;
    let furthestBlock = aaObtainFurthestBlock(p, formattingElementEntry);
    if (!furthestBlock) break;
    p.activeFormattingElements.bookmark = formattingElementEntry;
    let lastElement = aaInnerLoop(p, furthestBlock, formattingElementEntry.element);
    let commonAncestor = p.openElements.getCommonAncestor(formattingElementEntry.element);
    p.treeAdapter.detachNode(lastElement);
    if (commonAncestor) aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
    aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
  }
}
//@ chunk-p9ac6cnb.js:152254-152335 esm-fingerprint
function appendComment(p, token) {
  p._appendCommentNode(token, p.openElements.currentTmplContentOrNode);
}
//@ chunk-p9ac6cnb.js:152335-152400 esm-fingerprint
function appendCommentToRootHtmlElement(p, token) {
  p._appendCommentNode(token, p.openElements.items[0]);
}
//@ chunk-p9ac6cnb.js:152400-152452 esm-fingerprint
function appendCommentToDocument(p, token) {
  p._appendCommentNode(token, p.document);
}
//@ chunk-p9ac6cnb.js:152452-152928 esm-fingerprint
function stopParsing(p, token) {
  p.stopped = true;
  if (token.location) {
    let target = p.fragmentContext ? 0 : 2;
    for (let i = p.openElements.stackTop; i >= target; i--) p._setEndLocation(p.openElements.items[i], token);
    if (!p.fragmentContext && p.openElements.stackTop >= 0) {
      let htmlElement = p.openElements.items[0];
      let htmlLocation = p.treeAdapter.getNodeSourceCodeLocation(htmlElement);
      if (htmlLocation && !htmlLocation.endTag) {
        p._setEndLocation(htmlElement, token);
        if (p.openElements.stackTop >= 1) {
          let bodyElement = p.openElements.items[1];
          let bodyLocation = p.treeAdapter.getNodeSourceCodeLocation(bodyElement);
          if (bodyLocation && !bodyLocation.endTag) p._setEndLocation(bodyElement, token);
        }
      }
    }
  }
}
//@ chunk-p9ac6cnb.js:152928-153119 esm-fingerprint
function doctypeInInitialMode(p, token) {
  p._setDocumentType(token);
  let mode = token.forceQuirks ? DOCUMENT_MODE.QUIRKS : getDocumentMode(token);
  if (!isConforming(token)) p._err(token, errors.nonConformingDoctype);
  p.treeAdapter.setDocumentMode(p.document, mode);
  p.insertionMode = InsertionMode.BEFORE_HTML;
}
//@ chunk-p9ac6cnb.js:153119-153265 esm-fingerprint
function tokenInInitialMode(p, token) {
  p._err(token, errors.missingDoctype, true);
  p.treeAdapter.setDocumentMode(p.document, DOCUMENT_MODE.QUIRKS);
  p.insertionMode = InsertionMode.BEFORE_HTML;
  p._processToken(token);
}
//@ chunk-p9ac6cnb.js:153265-153371 esm-fingerprint
function startTagBeforeHtml(p, token) {
  if (token.tagID === TAG_ID.HTML) {
    p._insertElement(token, NAMESPACES.HTML);
    p.insertionMode = InsertionMode.BEFORE_HEAD;
  } else tokenBeforeHtml(p, token);
}
//@ chunk-p9ac6cnb.js:153371-153457 esm-fingerprint
function endTagBeforeHtml(p, token) {
  let tn = token.tagID;
  if (tn === TAG_ID.HTML || tn === TAG_ID.HEAD || tn === TAG_ID.BODY || tn === TAG_ID.BR)
    tokenBeforeHtml(p, token);
}
//@ chunk-p9ac6cnb.js:153457-153549 esm-fingerprint
function tokenBeforeHtml(p, token) {
  p._insertFakeRootElement();
  p.insertionMode = InsertionMode.BEFORE_HEAD;
  p._processToken(token);
}
//@ chunk-p9ac6cnb.js:153549-153733 esm-fingerprint
function startTagBeforeHead(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.HEAD: {
      p._insertElement(token, NAMESPACES.HTML);
      p.headElement = p.openElements.current;
      p.insertionMode = InsertionMode.IN_HEAD;
      break;
    }
    default:
      tokenBeforeHead(p, token);
  }
}
//@ chunk-p9ac6cnb.js:153733-153869 esm-fingerprint
function endTagBeforeHead(p, token) {
  let tn = token.tagID;
  if (tn === TAG_ID.HEAD || tn === TAG_ID.BODY || tn === TAG_ID.HTML || tn === TAG_ID.BR)
    tokenBeforeHead(p, token);
  else p._err(token, errors.endTagWithoutMatchingOpenElement);
}
//@ chunk-p9ac6cnb.js:153869-154003 esm-fingerprint
function tokenBeforeHead(p, token) {
  p._insertFakeElement(TAG_NAMES.HEAD, TAG_ID.HEAD);
  p.headElement = p.openElements.current;
  p.insertionMode = InsertionMode.IN_HEAD;
  p._processToken(token);
}
//@ chunk-p9ac6cnb.js:154003-154790 esm-fingerprint
function startTagInHead(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.BASE:
    case TAG_ID.BASEFONT:
    case TAG_ID.BGSOUND:
    case TAG_ID.LINK:
    case TAG_ID.META: {
      p._appendElement(token, NAMESPACES.HTML);
      token.ackSelfClosing = true;
      break;
    }
    case TAG_ID.TITLE: {
      p._switchToTextParsing(token, TokenizerMode.RCDATA);
      break;
    }
    case TAG_ID.NOSCRIPT: {
      if (p.options.scriptingEnabled) p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
      else {
        p._insertElement(token, NAMESPACES.HTML);
        p.insertionMode = InsertionMode.IN_HEAD_NO_SCRIPT;
      }
      break;
    }
    case TAG_ID.NOFRAMES:
    case TAG_ID.STYLE: {
      p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
      break;
    }
    case TAG_ID.SCRIPT: {
      p._switchToTextParsing(token, TokenizerMode.SCRIPT_DATA);
      break;
    }
    case TAG_ID.TEMPLATE: {
      p._insertTemplate(token);
      p.activeFormattingElements.insertMarker();
      p.framesetOk = false;
      p.insertionMode = InsertionMode.IN_TEMPLATE;
      p.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
      break;
    }
    case TAG_ID.HEAD: {
      p._err(token, errors.misplacedStartTagForHeadElement);
      break;
    }
    default:
      tokenInHead(p, token);
  }
}
//@ chunk-p9ac6cnb.js:154790-155024 esm-fingerprint
function endTagInHead(p, token) {
  switch (token.tagID) {
    case TAG_ID.HEAD: {
      p.openElements.pop();
      p.insertionMode = InsertionMode.AFTER_HEAD;
      break;
    }
    case TAG_ID.BODY:
    case TAG_ID.BR:
    case TAG_ID.HTML: {
      tokenInHead(p, token);
      break;
    }
    case TAG_ID.TEMPLATE: {
      templateEndTagInHead(p, token);
      break;
    }
    default:
      p._err(token, errors.endTagWithoutMatchingOpenElement);
  }
}
//@ chunk-p9ac6cnb.js:155024-155418 esm-fingerprint
function templateEndTagInHead(p, token) {
  if (p.openElements.tmplCount > 0) {
    p.openElements.generateImpliedEndTagsThoroughly();
    if (p.openElements.currentTagId !== TAG_ID.TEMPLATE)
      p._err(token, errors.closingOfElementWithOpenChildElements);
    p.openElements.popUntilTagNamePopped(TAG_ID.TEMPLATE);
    p.activeFormattingElements.clearToLastMarker();
    p.tmplInsertionModeStack.shift();
    p._resetInsertionMode();
  } else p._err(token, errors.endTagWithoutMatchingOpenElement);
}
//@ chunk-p9ac6cnb.js:155418-155503 esm-fingerprint
function tokenInHead(p, token) {
  p.openElements.pop();
  p.insertionMode = InsertionMode.AFTER_HEAD;
  p._processToken(token);
}
//@ chunk-p9ac6cnb.js:155503-155744 esm-fingerprint
function startTagInHeadNoScript(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.BASEFONT:
    case TAG_ID.BGSOUND:
    case TAG_ID.HEAD:
    case TAG_ID.LINK:
    case TAG_ID.META:
    case TAG_ID.NOFRAMES:
    case TAG_ID.STYLE: {
      startTagInHead(p, token);
      break;
    }
    case TAG_ID.NOSCRIPT: {
      p._err(token, errors.nestedNoscriptInHead);
      break;
    }
    default:
      tokenInHeadNoScript(p, token);
  }
}
//@ chunk-p9ac6cnb.js:155744-155925 esm-fingerprint
function endTagInHeadNoScript(p, token) {
  switch (token.tagID) {
    case TAG_ID.NOSCRIPT: {
      p.openElements.pop();
      p.insertionMode = InsertionMode.IN_HEAD;
      break;
    }
    case TAG_ID.BR: {
      tokenInHeadNoScript(p, token);
      break;
    }
    default:
      p._err(token, errors.endTagWithoutMatchingOpenElement);
  }
}
//@ chunk-p9ac6cnb.js:155925-156103 esm-fingerprint
function tokenInHeadNoScript(p, token) {
  let errCode =
    token.type === TokenType.EOF ? errors.openElementsLeftAfterEof : errors.disallowedContentInNoscriptInHead;
  p._err(token, errCode);
  p.openElements.pop();
  p.insertionMode = InsertionMode.IN_HEAD;
  p._processToken(token);
}
//@ chunk-p9ac6cnb.js:156103-156679 esm-fingerprint
function startTagAfterHead(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.BODY: {
      p._insertElement(token, NAMESPACES.HTML);
      p.framesetOk = false;
      p.insertionMode = InsertionMode.IN_BODY;
      break;
    }
    case TAG_ID.FRAMESET: {
      p._insertElement(token, NAMESPACES.HTML);
      p.insertionMode = InsertionMode.IN_FRAMESET;
      break;
    }
    case TAG_ID.BASE:
    case TAG_ID.BASEFONT:
    case TAG_ID.BGSOUND:
    case TAG_ID.LINK:
    case TAG_ID.META:
    case TAG_ID.NOFRAMES:
    case TAG_ID.SCRIPT:
    case TAG_ID.STYLE:
    case TAG_ID.TEMPLATE:
    case TAG_ID.TITLE: {
      p._err(token, errors.abandonedHeadElementChild);
      p.openElements.push(p.headElement, TAG_ID.HEAD);
      startTagInHead(p, token);
      p.openElements.remove(p.headElement);
      break;
    }
    case TAG_ID.HEAD: {
      p._err(token, errors.misplacedStartTagForHeadElement);
      break;
    }
    default:
      tokenAfterHead(p, token);
  }
}
//@ chunk-p9ac6cnb.js:156679-156844 esm-fingerprint
function endTagAfterHead(p, token) {
  switch (token.tagID) {
    case TAG_ID.BODY:
    case TAG_ID.HTML:
    case TAG_ID.BR: {
      tokenAfterHead(p, token);
      break;
    }
    case TAG_ID.TEMPLATE: {
      templateEndTagInHead(p, token);
      break;
    }
    default:
      p._err(token, errors.endTagWithoutMatchingOpenElement);
  }
}
//@ chunk-p9ac6cnb.js:156844-156930 esm-fingerprint
function tokenAfterHead(p, token) {
  p._insertFakeElement(TAG_NAMES.BODY, TAG_ID.BODY);
  p.insertionMode = InsertionMode.IN_BODY;
  modeInBody(p, token);
}
//@ chunk-p9ac6cnb.js:156930-157164 esm-fingerprint
function modeInBody(p, token) {
  switch (token.type) {
    case TokenType.CHARACTER: {
      characterInBody(p, token);
      break;
    }
    case TokenType.WHITESPACE_CHARACTER: {
      whitespaceCharacterInBody(p, token);
      break;
    }
    case TokenType.COMMENT: {
      appendComment(p, token);
      break;
    }
    case TokenType.START_TAG: {
      startTagInBody(p, token);
      break;
    }
    case TokenType.END_TAG: {
      endTagInBody(p, token);
      break;
    }
    case TokenType.EOF: {
      eofInBody(p, token);
      break;
    }
    default:
  }
}
//@ chunk-p9ac6cnb.js:157164-157245 esm-fingerprint
function whitespaceCharacterInBody(p, token) {
  p._reconstructActiveFormattingElements();
  p._insertCharacters(token);
}
//@ chunk-p9ac6cnb.js:157245-157342 esm-fingerprint
function characterInBody(p, token) {
  p._reconstructActiveFormattingElements();
  p._insertCharacters(token);
  p.framesetOk = false;
}
//@ chunk-p9ac6cnb.js:157342-157454 esm-fingerprint
function htmlStartTagInBody(p, token) {
  if (p.openElements.tmplCount === 0) p.treeAdapter.adoptAttributes(p.openElements.items[0], token.attrs);
}
//@ chunk-p9ac6cnb.js:157454-157619 esm-fingerprint
function bodyStartTagInBody(p, token) {
  let bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
  if (bodyElement && p.openElements.tmplCount === 0) {
    p.framesetOk = false;
    p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
  }
}
//@ chunk-p9ac6cnb.js:157619-157835 esm-fingerprint
function framesetStartTagInBody(p, token) {
  let bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
  if (p.framesetOk && bodyElement) {
    p.treeAdapter.detachNode(bodyElement);
    p.openElements.popAllUpToHtmlElement();
    p._insertElement(token, NAMESPACES.HTML);
    p.insertionMode = InsertionMode.IN_FRAMESET;
  }
}
//@ chunk-p9ac6cnb.js:157835-157938 esm-fingerprint
function addressStartTagInBody(p, token) {
  if (p.openElements.hasInButtonScope(TAG_ID.P)) p._closePElement();
  p._insertElement(token, NAMESPACES.HTML);
}
//@ chunk-p9ac6cnb.js:157938-158100 esm-fingerprint
function numberedHeaderStartTagInBody(p, token) {
  if (p.openElements.hasInButtonScope(TAG_ID.P)) p._closePElement();
  if (HEADING_ELEMENTS.has(p.openElements.currentTagId)) p.openElements.pop();
  p._insertElement(token, NAMESPACES.HTML);
}
//@ chunk-p9ac6cnb.js:158100-158240 esm-fingerprint
function preStartTagInBody(p, token) {
  if (p.openElements.hasInButtonScope(TAG_ID.P)) p._closePElement();
  p._insertElement(token, NAMESPACES.HTML);
  p.skipNextNewLine = true;
  p.framesetOk = false;
}
//@ chunk-p9ac6cnb.js:158240-158442 esm-fingerprint
function formStartTagInBody(p, token) {
  let inTemplate = p.openElements.tmplCount > 0;
  if (!p.formElement || inTemplate) {
    if (p.openElements.hasInButtonScope(TAG_ID.P)) p._closePElement();
    p._insertElement(token, NAMESPACES.HTML);
    if (!inTemplate) p.formElement = p.openElements.current;
  }
}
//@ chunk-p9ac6cnb.js:158442-158908 esm-fingerprint
function listItemStartTagInBody(p, token) {
  p.framesetOk = false;
  let tn = token.tagID;
  for (let i = p.openElements.stackTop; i >= 0; i--) {
    let elementId = p.openElements.tagIDs[i];
    if (
      (tn === TAG_ID.LI && elementId === TAG_ID.LI) ||
      ((tn === TAG_ID.DD || tn === TAG_ID.DT) && (elementId === TAG_ID.DD || elementId === TAG_ID.DT))
    ) {
      p.openElements.generateImpliedEndTagsWithExclusion(elementId);
      p.openElements.popUntilTagNamePopped(elementId);
      break;
    }
    if (
      elementId !== TAG_ID.ADDRESS &&
      elementId !== TAG_ID.DIV &&
      elementId !== TAG_ID.P &&
      p._isSpecialElement(p.openElements.items[i], elementId)
    )
      break;
  }
  if (p.openElements.hasInButtonScope(TAG_ID.P)) p._closePElement();
  p._insertElement(token, NAMESPACES.HTML);
}
//@ chunk-p9ac6cnb.js:158908-159042 esm-fingerprint
function plaintextStartTagInBody(p, token) {
  if (p.openElements.hasInButtonScope(TAG_ID.P)) p._closePElement();
  p._insertElement(token, NAMESPACES.HTML);
  p.tokenizer.state = TokenizerMode.PLAINTEXT;
}
//@ chunk-p9ac6cnb.js:159042-159269 esm-fingerprint
function buttonStartTagInBody(p, token) {
  if (p.openElements.hasInScope(TAG_ID.BUTTON)) {
    p.openElements.generateImpliedEndTags();
    p.openElements.popUntilTagNamePopped(TAG_ID.BUTTON);
  }
  p._reconstructActiveFormattingElements();
  p._insertElement(token, NAMESPACES.HTML);
  p.framesetOk = false;
}
//@ chunk-p9ac6cnb.js:159269-159579 esm-fingerprint
function aStartTagInBody(p, token) {
  let activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(TAG_NAMES.A);
  if (activeElementEntry) {
    callAdoptionAgency(p, token);
    p.openElements.remove(activeElementEntry.element);
    p.activeFormattingElements.removeEntry(activeElementEntry);
  }
  p._reconstructActiveFormattingElements();
  p._insertElement(token, NAMESPACES.HTML);
  p.activeFormattingElements.pushElement(p.openElements.current, token);
}
//@ chunk-p9ac6cnb.js:159579-159729 esm-fingerprint
function bStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  p._insertElement(token, NAMESPACES.HTML);
  p.activeFormattingElements.pushElement(p.openElements.current, token);
}
//@ chunk-p9ac6cnb.js:159729-159965 esm-fingerprint
function nobrStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  if (p.openElements.hasInScope(TAG_ID.NOBR)) {
    callAdoptionAgency(p, token);
    p._reconstructActiveFormattingElements();
  }
  p._insertElement(token, NAMESPACES.HTML);
  p.activeFormattingElements.pushElement(p.openElements.current, token);
}
//@ chunk-p9ac6cnb.js:159965-160108 esm-fingerprint
function appletStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  p._insertElement(token, NAMESPACES.HTML);
  p.activeFormattingElements.insertMarker();
  p.framesetOk = false;
}
//@ chunk-p9ac6cnb.js:160108-160308 esm-fingerprint
function tableStartTagInBody(p, token) {
  if (
    p.treeAdapter.getDocumentMode(p.document) !== DOCUMENT_MODE.QUIRKS &&
    p.openElements.hasInButtonScope(TAG_ID.P)
  )
    p._closePElement();
  p._insertElement(token, NAMESPACES.HTML);
  p.framesetOk = false;
  p.insertionMode = InsertionMode.IN_TABLE;
}
//@ chunk-p9ac6cnb.js:160308-160429 esm-fingerprint
function areaStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  p._appendElement(token, NAMESPACES.HTML);
  p.framesetOk = false;
  token.ackSelfClosing = true;
}
//@ chunk-p9ac6cnb.js:160429-160499 esm-fingerprint
function isHiddenInput(token) {
  let inputType = getTokenAttr(token, ATTRS.TYPE);
  return inputType != null && inputType.toLowerCase() === HIDDEN_INPUT_TYPE;
}
//@ chunk-p9ac6cnb.js:160499-160630 esm-fingerprint
function inputStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  p._appendElement(token, NAMESPACES.HTML);
  if (!isHiddenInput(token)) p.framesetOk = false;
  token.ackSelfClosing = true;
}
//@ chunk-p9ac6cnb.js:160630-160694 esm-fingerprint
function paramStartTagInBody(p, token) {
  p._appendElement(token, NAMESPACES.HTML);
  token.ackSelfClosing = true;
}
//@ chunk-p9ac6cnb.js:160694-160833 esm-fingerprint
function hrStartTagInBody(p, token) {
  if (p.openElements.hasInButtonScope(TAG_ID.P)) p._closePElement();
  p._appendElement(token, NAMESPACES.HTML);
  p.framesetOk = false;
  token.ackSelfClosing = true;
}
//@ chunk-p9ac6cnb.js:160833-160888 esm-fingerprint
function imageStartTagInBody(p, token) {
  token.tagName = TAG_NAMES.IMG;
  token.tagID = TAG_ID.IMG;
  areaStartTagInBody(p, token);
}
//@ chunk-p9ac6cnb.js:160888-161060 esm-fingerprint
function textareaStartTagInBody(p, token) {
  p._insertElement(token, NAMESPACES.HTML);
  p.skipNextNewLine = true;
  p.tokenizer.state = TokenizerMode.RCDATA;
  p.originalInsertionMode = p.insertionMode;
  p.framesetOk = false;
  p.insertionMode = InsertionMode.TEXT;
}
//@ chunk-p9ac6cnb.js:161060-161230 esm-fingerprint
function xmpStartTagInBody(p, token) {
  if (p.openElements.hasInButtonScope(TAG_ID.P)) p._closePElement();
  p._reconstructActiveFormattingElements();
  p.framesetOk = false;
  p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}
//@ chunk-p9ac6cnb.js:161230-161300 esm-fingerprint
function iframeStartTagInBody(p, token) {
  p.framesetOk = false;
  p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}
//@ chunk-p9ac6cnb.js:161300-161354 esm-fingerprint
function rawTextStartTagInBody(p, token) {
  p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
}
//@ chunk-p9ac6cnb.js:161354-161657 esm-fingerprint
function selectStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  p._insertElement(token, NAMESPACES.HTML);
  p.framesetOk = false;
  p.insertionMode =
    p.insertionMode === InsertionMode.IN_TABLE ||
    p.insertionMode === InsertionMode.IN_CAPTION ||
    p.insertionMode === InsertionMode.IN_TABLE_BODY ||
    p.insertionMode === InsertionMode.IN_ROW ||
    p.insertionMode === InsertionMode.IN_CELL
      ? InsertionMode.IN_SELECT_IN_TABLE
      : InsertionMode.IN_SELECT;
}
//@ chunk-p9ac6cnb.js:161657-161805 esm-fingerprint
function optgroupStartTagInBody(p, token) {
  if (p.openElements.currentTagId === TAG_ID.OPTION) p.openElements.pop();
  p._reconstructActiveFormattingElements();
  p._insertElement(token, NAMESPACES.HTML);
}
//@ chunk-p9ac6cnb.js:161805-161926 esm-fingerprint
function rbStartTagInBody(p, token) {
  if (p.openElements.hasInScope(TAG_ID.RUBY)) p.openElements.generateImpliedEndTags();
  p._insertElement(token, NAMESPACES.HTML);
}
//@ chunk-p9ac6cnb.js:161926-162065 esm-fingerprint
function rtStartTagInBody(p, token) {
  if (p.openElements.hasInScope(TAG_ID.RUBY)) p.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.RTC);
  p._insertElement(token, NAMESPACES.HTML);
}
//@ chunk-p9ac6cnb.js:162065-162235 esm-fingerprint
function mathStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  adjustTokenMathMLAttrs(token);
  adjustTokenXMLAttrs(token);
  if (token.selfClosing) p._appendElement(token, NAMESPACES.MATHML);
  else p._insertElement(token, NAMESPACES.MATHML);
  token.ackSelfClosing = true;
}
//@ chunk-p9ac6cnb.js:162235-162399 esm-fingerprint
function svgStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  adjustTokenSVGAttrs(token);
  adjustTokenXMLAttrs(token);
  if (token.selfClosing) p._appendElement(token, NAMESPACES.SVG);
  else p._insertElement(token, NAMESPACES.SVG);
  token.ackSelfClosing = true;
}
//@ chunk-p9ac6cnb.js:162399-162484 esm-fingerprint
function genericStartTagInBody(p, token) {
  p._reconstructActiveFormattingElements();
  p._insertElement(token, NAMESPACES.HTML);
}
//@ chunk-p9ac6cnb.js:162484-164405 esm-fingerprint
function startTagInBody(p, token) {
  switch (token.tagID) {
    case TAG_ID.I:
    case TAG_ID.S:
    case TAG_ID.B:
    case TAG_ID.U:
    case TAG_ID.EM:
    case TAG_ID.TT:
    case TAG_ID.BIG:
    case TAG_ID.CODE:
    case TAG_ID.FONT:
    case TAG_ID.SMALL:
    case TAG_ID.STRIKE:
    case TAG_ID.STRONG: {
      bStartTagInBody(p, token);
      break;
    }
    case TAG_ID.A: {
      aStartTagInBody(p, token);
      break;
    }
    case TAG_ID.H1:
    case TAG_ID.H2:
    case TAG_ID.H3:
    case TAG_ID.H4:
    case TAG_ID.H5:
    case TAG_ID.H6: {
      numberedHeaderStartTagInBody(p, token);
      break;
    }
    case TAG_ID.P:
    case TAG_ID.DL:
    case TAG_ID.OL:
    case TAG_ID.UL:
    case TAG_ID.DIV:
    case TAG_ID.DIR:
    case TAG_ID.NAV:
    case TAG_ID.MAIN:
    case TAG_ID.MENU:
    case TAG_ID.ASIDE:
    case TAG_ID.CENTER:
    case TAG_ID.FIGURE:
    case TAG_ID.FOOTER:
    case TAG_ID.HEADER:
    case TAG_ID.HGROUP:
    case TAG_ID.DIALOG:
    case TAG_ID.DETAILS:
    case TAG_ID.ADDRESS:
    case TAG_ID.ARTICLE:
    case TAG_ID.SEARCH:
    case TAG_ID.SECTION:
    case TAG_ID.SUMMARY:
    case TAG_ID.FIELDSET:
    case TAG_ID.BLOCKQUOTE:
    case TAG_ID.FIGCAPTION: {
      addressStartTagInBody(p, token);
      break;
    }
    case TAG_ID.LI:
    case TAG_ID.DD:
    case TAG_ID.DT: {
      listItemStartTagInBody(p, token);
      break;
    }
    case TAG_ID.BR:
    case TAG_ID.IMG:
    case TAG_ID.WBR:
    case TAG_ID.AREA:
    case TAG_ID.EMBED:
    case TAG_ID.KEYGEN: {
      areaStartTagInBody(p, token);
      break;
    }
    case TAG_ID.HR: {
      hrStartTagInBody(p, token);
      break;
    }
    case TAG_ID.RB:
    case TAG_ID.RTC: {
      rbStartTagInBody(p, token);
      break;
    }
    case TAG_ID.RT:
    case TAG_ID.RP: {
      rtStartTagInBody(p, token);
      break;
    }
    case TAG_ID.PRE:
    case TAG_ID.LISTING: {
      preStartTagInBody(p, token);
      break;
    }
    case TAG_ID.XMP: {
      xmpStartTagInBody(p, token);
      break;
    }
    case TAG_ID.SVG: {
      svgStartTagInBody(p, token);
      break;
    }
    case TAG_ID.HTML: {
      htmlStartTagInBody(p, token);
      break;
    }
    case TAG_ID.BASE:
    case TAG_ID.LINK:
    case TAG_ID.META:
    case TAG_ID.STYLE:
    case TAG_ID.TITLE:
    case TAG_ID.SCRIPT:
    case TAG_ID.BGSOUND:
    case TAG_ID.BASEFONT:
    case TAG_ID.TEMPLATE: {
      startTagInHead(p, token);
      break;
    }
    case TAG_ID.BODY: {
      bodyStartTagInBody(p, token);
      break;
    }
    case TAG_ID.FORM: {
      formStartTagInBody(p, token);
      break;
    }
    case TAG_ID.NOBR: {
      nobrStartTagInBody(p, token);
      break;
    }
    case TAG_ID.MATH: {
      mathStartTagInBody(p, token);
      break;
    }
    case TAG_ID.TABLE: {
      tableStartTagInBody(p, token);
      break;
    }
    case TAG_ID.INPUT: {
      inputStartTagInBody(p, token);
      break;
    }
    case TAG_ID.PARAM:
    case TAG_ID.TRACK:
    case TAG_ID.SOURCE: {
      paramStartTagInBody(p, token);
      break;
    }
    case TAG_ID.IMAGE: {
      imageStartTagInBody(p, token);
      break;
    }
    case TAG_ID.BUTTON: {
      buttonStartTagInBody(p, token);
      break;
    }
    case TAG_ID.APPLET:
    case TAG_ID.OBJECT:
    case TAG_ID.MARQUEE: {
      appletStartTagInBody(p, token);
      break;
    }
    case TAG_ID.IFRAME: {
      iframeStartTagInBody(p, token);
      break;
    }
    case TAG_ID.SELECT: {
      selectStartTagInBody(p, token);
      break;
    }
    case TAG_ID.OPTION:
    case TAG_ID.OPTGROUP: {
      optgroupStartTagInBody(p, token);
      break;
    }
    case TAG_ID.NOEMBED:
    case TAG_ID.NOFRAMES: {
      rawTextStartTagInBody(p, token);
      break;
    }
    case TAG_ID.FRAMESET: {
      framesetStartTagInBody(p, token);
      break;
    }
    case TAG_ID.TEXTAREA: {
      textareaStartTagInBody(p, token);
      break;
    }
    case TAG_ID.NOSCRIPT: {
      if (p.options.scriptingEnabled) rawTextStartTagInBody(p, token);
      else genericStartTagInBody(p, token);
      break;
    }
    case TAG_ID.PLAINTEXT: {
      plaintextStartTagInBody(p, token);
      break;
    }
    case TAG_ID.COL:
    case TAG_ID.TH:
    case TAG_ID.TD:
    case TAG_ID.TR:
    case TAG_ID.HEAD:
    case TAG_ID.FRAME:
    case TAG_ID.TBODY:
    case TAG_ID.TFOOT:
    case TAG_ID.THEAD:
    case TAG_ID.CAPTION:
    case TAG_ID.COLGROUP:
      break;
    default:
      genericStartTagInBody(p, token);
  }
}
//@ chunk-p9ac6cnb.js:164405-164612 esm-fingerprint
function bodyEndTagInBody(p, token) {
  if (p.openElements.hasInScope(TAG_ID.BODY)) {
    p.insertionMode = InsertionMode.AFTER_BODY;
    if (p.options.sourceCodeLocationInfo) {
      let bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
      if (bodyElement) p._setEndLocation(bodyElement, token);
    }
  }
}
//@ chunk-p9ac6cnb.js:164612-164703 esm-fingerprint
function htmlEndTagInBody(p, token) {
  if (p.openElements.hasInScope(TAG_ID.BODY)) {
    p.insertionMode = InsertionMode.AFTER_BODY;
    endTagAfterBody(p, token);
  }
}
//@ chunk-p9ac6cnb.js:164703-164846 esm-fingerprint
function addressEndTagInBody(p, token) {
  let tn = token.tagID;
  if (p.openElements.hasInScope(tn)) {
    p.openElements.generateImpliedEndTags();
    p.openElements.popUntilTagNamePopped(tn);
  }
}
//@ chunk-p9ac6cnb.js:164846-165109 esm-fingerprint
function formEndTagInBody(p) {
  let inTemplate = p.openElements.tmplCount > 0;
  let { formElement } = p;
  if (!inTemplate) p.formElement = null;
  if ((formElement || inTemplate) && p.openElements.hasInScope(TAG_ID.FORM)) {
    p.openElements.generateImpliedEndTags();
    if (inTemplate) p.openElements.popUntilTagNamePopped(TAG_ID.FORM);
    else if (formElement) p.openElements.remove(formElement);
  }
}
//@ chunk-p9ac6cnb.js:165109-165214 esm-fingerprint
function pEndTagInBody(p) {
  if (!p.openElements.hasInButtonScope(TAG_ID.P)) p._insertFakeElement(TAG_NAMES.P, TAG_ID.P);
  p._closePElement();
}
//@ chunk-p9ac6cnb.js:165214-165372 esm-fingerprint
function liEndTagInBody(p) {
  if (p.openElements.hasInListItemScope(TAG_ID.LI)) {
    p.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.LI);
    p.openElements.popUntilTagNamePopped(TAG_ID.LI);
  }
}
//@ chunk-p9ac6cnb.js:165372-165529 esm-fingerprint
function ddEndTagInBody(p, token) {
  let tn = token.tagID;
  if (p.openElements.hasInScope(tn)) {
    p.openElements.generateImpliedEndTagsWithExclusion(tn);
    p.openElements.popUntilTagNamePopped(tn);
  }
}
//@ chunk-p9ac6cnb.js:165529-165675 esm-fingerprint
function numberedHeaderEndTagInBody(p) {
  if (p.openElements.hasNumberedHeaderInScope()) {
    p.openElements.generateImpliedEndTags();
    p.openElements.popUntilNumberedHeaderPopped();
  }
}
//@ chunk-p9ac6cnb.js:165675-165865 esm-fingerprint
function appletEndTagInBody(p, token) {
  let tn = token.tagID;
  if (p.openElements.hasInScope(tn)) {
    p.openElements.generateImpliedEndTags();
    p.openElements.popUntilTagNamePopped(tn);
    p.activeFormattingElements.clearToLastMarker();
  }
}
//@ chunk-p9ac6cnb.js:165865-165990 esm-fingerprint
function brEndTagInBody(p) {
  p._reconstructActiveFormattingElements();
  p._insertFakeElement(TAG_NAMES.BR, TAG_ID.BR);
  p.openElements.pop();
  p.framesetOk = false;
}
//@ chunk-p9ac6cnb.js:165990-166351 esm-fingerprint
function genericEndTagInBody(p, token) {
  let { tagName, tagID: tid } = token;
  for (let i = p.openElements.stackTop; i > 0; i--) {
    let element = p.openElements.items[i];
    let elementId = p.openElements.tagIDs[i];
    if (tid === elementId && (tid !== TAG_ID.UNKNOWN || p.treeAdapter.getTagName(element) === tagName)) {
      p.openElements.generateImpliedEndTagsWithExclusion(tid);
      if (p.openElements.stackTop >= i) p.openElements.shortenToLength(i);
      break;
    }
    if (p._isSpecialElement(element, elementId)) break;
  }
}
//@ chunk-p9ac6cnb.js:166351-167292 esm-fingerprint
function endTagInBody(p, token) {
  switch (token.tagID) {
    case TAG_ID.A:
    case TAG_ID.B:
    case TAG_ID.I:
    case TAG_ID.S:
    case TAG_ID.U:
    case TAG_ID.EM:
    case TAG_ID.TT:
    case TAG_ID.BIG:
    case TAG_ID.CODE:
    case TAG_ID.FONT:
    case TAG_ID.NOBR:
    case TAG_ID.SMALL:
    case TAG_ID.STRIKE:
    case TAG_ID.STRONG: {
      callAdoptionAgency(p, token);
      break;
    }
    case TAG_ID.P: {
      pEndTagInBody(p);
      break;
    }
    case TAG_ID.DL:
    case TAG_ID.UL:
    case TAG_ID.OL:
    case TAG_ID.DIR:
    case TAG_ID.DIV:
    case TAG_ID.NAV:
    case TAG_ID.PRE:
    case TAG_ID.MAIN:
    case TAG_ID.MENU:
    case TAG_ID.ASIDE:
    case TAG_ID.BUTTON:
    case TAG_ID.CENTER:
    case TAG_ID.FIGURE:
    case TAG_ID.FOOTER:
    case TAG_ID.HEADER:
    case TAG_ID.HGROUP:
    case TAG_ID.DIALOG:
    case TAG_ID.ADDRESS:
    case TAG_ID.ARTICLE:
    case TAG_ID.DETAILS:
    case TAG_ID.SEARCH:
    case TAG_ID.SECTION:
    case TAG_ID.SUMMARY:
    case TAG_ID.LISTING:
    case TAG_ID.FIELDSET:
    case TAG_ID.BLOCKQUOTE:
    case TAG_ID.FIGCAPTION: {
      addressEndTagInBody(p, token);
      break;
    }
    case TAG_ID.LI: {
      liEndTagInBody(p);
      break;
    }
    case TAG_ID.DD:
    case TAG_ID.DT: {
      ddEndTagInBody(p, token);
      break;
    }
    case TAG_ID.H1:
    case TAG_ID.H2:
    case TAG_ID.H3:
    case TAG_ID.H4:
    case TAG_ID.H5:
    case TAG_ID.H6: {
      numberedHeaderEndTagInBody(p);
      break;
    }
    case TAG_ID.BR: {
      brEndTagInBody(p);
      break;
    }
    case TAG_ID.BODY: {
      bodyEndTagInBody(p, token);
      break;
    }
    case TAG_ID.HTML: {
      htmlEndTagInBody(p, token);
      break;
    }
    case TAG_ID.FORM: {
      formEndTagInBody(p);
      break;
    }
    case TAG_ID.APPLET:
    case TAG_ID.OBJECT:
    case TAG_ID.MARQUEE: {
      appletEndTagInBody(p, token);
      break;
    }
    case TAG_ID.TEMPLATE: {
      templateEndTagInHead(p, token);
      break;
    }
    default:
      genericEndTagInBody(p, token);
  }
}
//@ chunk-p9ac6cnb.js:167292-167367 esm-fingerprint
function eofInBody(p, token) {
  if (p.tmplInsertionModeStack.length > 0) eofInTemplate(p, token);
  else stopParsing(p, token);
}
//@ chunk-p9ac6cnb.js:167367-167546 esm-fingerprint
function endTagInText(p, token) {
  var _a;
  if (token.tagID === TAG_ID.SCRIPT) {
    if (!((_a = p.scriptHandler) === null || _a === undefined)) _a.call(p, p.openElements.current);
  }
  p.openElements.pop();
  p.insertionMode = p.originalInsertionMode;
}
//@ chunk-p9ac6cnb.js:167546-167682 esm-fingerprint
function eofInText(p, token) {
  p._err(token, errors.eofInElementThatCanContainOnlyText);
  p.openElements.pop();
  p.insertionMode = p.originalInsertionMode;
  p.onEof(token);
}
//@ chunk-p9ac6cnb.js:167682-167990 esm-fingerprint
function characterInTable(p, token) {
  if (TABLE_STRUCTURE_TAGS.has(p.openElements.currentTagId))
    switch (
      ((p.pendingCharacterTokens.length = 0),
      (p.hasNonWhitespacePendingCharacterToken = false),
      (p.originalInsertionMode = p.insertionMode),
      (p.insertionMode = InsertionMode.IN_TABLE_TEXT),
      token.type)
    ) {
      case TokenType.CHARACTER: {
        characterInTableText(p, token);
        break;
      }
      case TokenType.WHITESPACE_CHARACTER: {
        whitespaceCharacterInTableText(p, token);
        break;
      }
    }
  else tokenInTable(p, token);
}
//@ chunk-p9ac6cnb.js:167990-168146 esm-fingerprint
function captionStartTagInTable(p, token) {
  p.openElements.clearBackToTableContext();
  p.activeFormattingElements.insertMarker();
  p._insertElement(token, NAMESPACES.HTML);
  p.insertionMode = InsertionMode.IN_CAPTION;
}
//@ chunk-p9ac6cnb.js:168146-168265 esm-fingerprint
function colgroupStartTagInTable(p, token) {
  p.openElements.clearBackToTableContext();
  p._insertElement(token, NAMESPACES.HTML);
  p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
}
//@ chunk-p9ac6cnb.js:168265-168409 esm-fingerprint
function colStartTagInTable(p, token) {
  p.openElements.clearBackToTableContext();
  p._insertFakeElement(TAG_NAMES.COLGROUP, TAG_ID.COLGROUP);
  p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
  startTagInColumnGroup(p, token);
}
//@ chunk-p9ac6cnb.js:168409-168526 esm-fingerprint
function tbodyStartTagInTable(p, token) {
  p.openElements.clearBackToTableContext();
  p._insertElement(token, NAMESPACES.HTML);
  p.insertionMode = InsertionMode.IN_TABLE_BODY;
}
//@ chunk-p9ac6cnb.js:168526-168662 esm-fingerprint
function tdStartTagInTable(p, token) {
  p.openElements.clearBackToTableContext();
  p._insertFakeElement(TAG_NAMES.TBODY, TAG_ID.TBODY);
  p.insertionMode = InsertionMode.IN_TABLE_BODY;
  startTagInTableBody(p, token);
}
//@ chunk-p9ac6cnb.js:168662-168814 esm-fingerprint
function tableStartTagInTable(p, token) {
  if (p.openElements.hasInTableScope(TAG_ID.TABLE)) {
    p.openElements.popUntilTagNamePopped(TAG_ID.TABLE);
    p._resetInsertionMode();
    p._processStartTag(token);
  }
}
//@ chunk-p9ac6cnb.js:168814-168899 esm-fingerprint
function inputStartTagInTable(p, token) {
  if (isHiddenInput(token)) p._appendElement(token, NAMESPACES.HTML);
  else tokenInTable(p, token);
  token.ackSelfClosing = true;
}
//@ chunk-p9ac6cnb.js:168899-169049 esm-fingerprint
function formStartTagInTable(p, token) {
  if (!p.formElement && p.openElements.tmplCount === 0) {
    p._insertElement(token, NAMESPACES.HTML);
    p.formElement = p.openElements.current;
    p.openElements.pop();
  }
}
//@ chunk-p9ac6cnb.js:169049-169423 esm-fingerprint
function startTagInTable(p, token) {
  switch (token.tagID) {
    case TAG_ID.TD:
    case TAG_ID.TH:
    case TAG_ID.TR: {
      tdStartTagInTable(p, token);
      break;
    }
    case TAG_ID.STYLE:
    case TAG_ID.SCRIPT:
    case TAG_ID.TEMPLATE: {
      startTagInHead(p, token);
      break;
    }
    case TAG_ID.COL: {
      colStartTagInTable(p, token);
      break;
    }
    case TAG_ID.FORM: {
      formStartTagInTable(p, token);
      break;
    }
    case TAG_ID.TABLE: {
      tableStartTagInTable(p, token);
      break;
    }
    case TAG_ID.TBODY:
    case TAG_ID.TFOOT:
    case TAG_ID.THEAD: {
      tbodyStartTagInTable(p, token);
      break;
    }
    case TAG_ID.INPUT: {
      inputStartTagInTable(p, token);
      break;
    }
    case TAG_ID.CAPTION: {
      captionStartTagInTable(p, token);
      break;
    }
    case TAG_ID.COLGROUP: {
      colgroupStartTagInTable(p, token);
      break;
    }
    default:
      tokenInTable(p, token);
  }
}
//@ chunk-p9ac6cnb.js:169423-169775 esm-fingerprint
function endTagInTable(p, token) {
  switch (token.tagID) {
    case TAG_ID.TABLE: {
      if (p.openElements.hasInTableScope(TAG_ID.TABLE)) {
        p.openElements.popUntilTagNamePopped(TAG_ID.TABLE);
        p._resetInsertionMode();
      }
      break;
    }
    case TAG_ID.TEMPLATE: {
      templateEndTagInHead(p, token);
      break;
    }
    case TAG_ID.BODY:
    case TAG_ID.CAPTION:
    case TAG_ID.COL:
    case TAG_ID.COLGROUP:
    case TAG_ID.HTML:
    case TAG_ID.TBODY:
    case TAG_ID.TD:
    case TAG_ID.TFOOT:
    case TAG_ID.TH:
    case TAG_ID.THEAD:
    case TAG_ID.TR:
      break;
    default:
      tokenInTable(p, token);
  }
}
//@ chunk-p9ac6cnb.js:169775-169885 esm-fingerprint
function tokenInTable(p, token) {
  let savedFosterParentingState = p.fosterParentingEnabled;
  p.fosterParentingEnabled = true;
  modeInBody(p, token);
  p.fosterParentingEnabled = savedFosterParentingState;
}
//@ chunk-p9ac6cnb.js:169885-169935 esm-fingerprint
function whitespaceCharacterInTableText(p, token) {
  p.pendingCharacterTokens.push(token);
}
//@ chunk-p9ac6cnb.js:169935-170028 esm-fingerprint
function characterInTableText(p, token) {
  p.pendingCharacterTokens.push(token);
  p.hasNonWhitespacePendingCharacterToken = true;
}
//@ chunk-p9ac6cnb.js:170028-170327 esm-fingerprint
function tokenInTableText(p, token) {
  let i = 0;
  if (p.hasNonWhitespacePendingCharacterToken)
    for (; i < p.pendingCharacterTokens.length; i++) tokenInTable(p, p.pendingCharacterTokens[i]);
  else for (; i < p.pendingCharacterTokens.length; i++) p._insertCharacters(p.pendingCharacterTokens[i]);
  p.insertionMode = p.originalInsertionMode;
  p._processToken(token);
}
//@ chunk-p9ac6cnb.js:170327-170411 esm-fingerprint
var TABLE_VOID_ELEMENTS = new Set([
  TAG_ID.CAPTION,
  TAG_ID.COL,
  TAG_ID.COLGROUP,
  TAG_ID.TBODY,
  TAG_ID.TD,
  TAG_ID.TFOOT,
  TAG_ID.TH,
  TAG_ID.THEAD,
  TAG_ID.TR,
]);
//@ chunk-p9ac6cnb.js:170411-170682 esm-fingerprint
function startTagInCaption(p, token) {
  let tn = token.tagID;
  if (TABLE_VOID_ELEMENTS.has(tn)) {
    if (p.openElements.hasInTableScope(TAG_ID.CAPTION)) {
      p.openElements.generateImpliedEndTags();
      p.openElements.popUntilTagNamePopped(TAG_ID.CAPTION);
      p.activeFormattingElements.clearToLastMarker();
      p.insertionMode = InsertionMode.IN_TABLE;
      startTagInTable(p, token);
    }
  } else startTagInBody(p, token);
}
//@ chunk-p9ac6cnb.js:170682-171131 esm-fingerprint
function endTagInCaption(p, token) {
  let tn = token.tagID;
  switch (tn) {
    case TAG_ID.CAPTION:
    case TAG_ID.TABLE: {
      if (p.openElements.hasInTableScope(TAG_ID.CAPTION)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(TAG_ID.CAPTION);
        p.activeFormattingElements.clearToLastMarker();
        p.insertionMode = InsertionMode.IN_TABLE;
        if (tn === TAG_ID.TABLE) endTagInTable(p, token);
      }
      break;
    }
    case TAG_ID.BODY:
    case TAG_ID.COL:
    case TAG_ID.COLGROUP:
    case TAG_ID.HTML:
    case TAG_ID.TBODY:
    case TAG_ID.TD:
    case TAG_ID.TFOOT:
    case TAG_ID.TH:
    case TAG_ID.THEAD:
    case TAG_ID.TR:
      break;
    default:
      endTagInBody(p, token);
  }
}
//@ chunk-p9ac6cnb.js:171131-171302 esm-fingerprint
function startTagInColumnGroup(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.COL: {
      p._appendElement(token, NAMESPACES.HTML);
      token.ackSelfClosing = true;
      break;
    }
    case TAG_ID.TEMPLATE: {
      startTagInHead(p, token);
      break;
    }
    default:
      tokenInColumnGroup(p, token);
  }
}
//@ chunk-p9ac6cnb.js:171302-171514 esm-fingerprint
function endTagInColumnGroup(p, token) {
  switch (token.tagID) {
    case TAG_ID.COLGROUP: {
      if (p.openElements.currentTagId === TAG_ID.COLGROUP) {
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE;
      }
      break;
    }
    case TAG_ID.TEMPLATE: {
      templateEndTagInHead(p, token);
      break;
    }
    case TAG_ID.COL:
      break;
    default:
      tokenInColumnGroup(p, token);
  }
}
//@ chunk-p9ac6cnb.js:171514-171642 esm-fingerprint
function tokenInColumnGroup(p, token) {
  if (p.openElements.currentTagId === TAG_ID.COLGROUP) {
    p.openElements.pop();
    p.insertionMode = InsertionMode.IN_TABLE;
    p._processToken(token);
  }
}
//@ chunk-p9ac6cnb.js:171642-172182 esm-fingerprint
function startTagInTableBody(p, token) {
  switch (token.tagID) {
    case TAG_ID.TR: {
      p.openElements.clearBackToTableBodyContext();
      p._insertElement(token, NAMESPACES.HTML);
      p.insertionMode = InsertionMode.IN_ROW;
      break;
    }
    case TAG_ID.TH:
    case TAG_ID.TD: {
      p.openElements.clearBackToTableBodyContext();
      p._insertFakeElement(TAG_NAMES.TR, TAG_ID.TR);
      p.insertionMode = InsertionMode.IN_ROW;
      startTagInRow(p, token);
      break;
    }
    case TAG_ID.CAPTION:
    case TAG_ID.COL:
    case TAG_ID.COLGROUP:
    case TAG_ID.TBODY:
    case TAG_ID.TFOOT:
    case TAG_ID.THEAD: {
      if (p.openElements.hasTableBodyContextInTableScope()) {
        p.openElements.clearBackToTableBodyContext();
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE;
        startTagInTable(p, token);
      }
      break;
    }
    default:
      startTagInTable(p, token);
  }
}
//@ chunk-p9ac6cnb.js:172182-172695 esm-fingerprint
function endTagInTableBody(p, token) {
  let tn = token.tagID;
  switch (token.tagID) {
    case TAG_ID.TBODY:
    case TAG_ID.TFOOT:
    case TAG_ID.THEAD: {
      if (p.openElements.hasInTableScope(tn)) {
        p.openElements.clearBackToTableBodyContext();
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE;
      }
      break;
    }
    case TAG_ID.TABLE: {
      if (p.openElements.hasTableBodyContextInTableScope()) {
        p.openElements.clearBackToTableBodyContext();
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE;
        endTagInTable(p, token);
      }
      break;
    }
    case TAG_ID.BODY:
    case TAG_ID.CAPTION:
    case TAG_ID.COL:
    case TAG_ID.COLGROUP:
    case TAG_ID.HTML:
    case TAG_ID.TD:
    case TAG_ID.TH:
    case TAG_ID.TR:
      break;
    default:
      endTagInTable(p, token);
  }
}
//@ chunk-p9ac6cnb.js:172695-173153 esm-fingerprint
function startTagInRow(p, token) {
  switch (token.tagID) {
    case TAG_ID.TH:
    case TAG_ID.TD: {
      p.openElements.clearBackToTableRowContext();
      p._insertElement(token, NAMESPACES.HTML);
      p.insertionMode = InsertionMode.IN_CELL;
      p.activeFormattingElements.insertMarker();
      break;
    }
    case TAG_ID.CAPTION:
    case TAG_ID.COL:
    case TAG_ID.COLGROUP:
    case TAG_ID.TBODY:
    case TAG_ID.TFOOT:
    case TAG_ID.THEAD:
    case TAG_ID.TR: {
      if (p.openElements.hasInTableScope(TAG_ID.TR)) {
        p.openElements.clearBackToTableRowContext();
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE_BODY;
        startTagInTableBody(p, token);
      }
      break;
    }
    default:
      startTagInTable(p, token);
  }
}
//@ chunk-p9ac6cnb.js:173153-173845 esm-fingerprint
function endTagInRow(p, token) {
  switch (token.tagID) {
    case TAG_ID.TR: {
      if (p.openElements.hasInTableScope(TAG_ID.TR)) {
        p.openElements.clearBackToTableRowContext();
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE_BODY;
      }
      break;
    }
    case TAG_ID.TABLE: {
      if (p.openElements.hasInTableScope(TAG_ID.TR)) {
        p.openElements.clearBackToTableRowContext();
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE_BODY;
        endTagInTableBody(p, token);
      }
      break;
    }
    case TAG_ID.TBODY:
    case TAG_ID.TFOOT:
    case TAG_ID.THEAD: {
      if (p.openElements.hasInTableScope(token.tagID) || p.openElements.hasInTableScope(TAG_ID.TR)) {
        p.openElements.clearBackToTableRowContext();
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_TABLE_BODY;
        endTagInTableBody(p, token);
      }
      break;
    }
    case TAG_ID.BODY:
    case TAG_ID.CAPTION:
    case TAG_ID.COL:
    case TAG_ID.COLGROUP:
    case TAG_ID.HTML:
    case TAG_ID.TD:
    case TAG_ID.TH:
      break;
    default:
      endTagInTable(p, token);
  }
}
//@ chunk-p9ac6cnb.js:173845-174008 esm-fingerprint
function startTagInCell(p, token) {
  let tn = token.tagID;
  if (TABLE_VOID_ELEMENTS.has(tn)) {
    if (p.openElements.hasInTableScope(TAG_ID.TD) || p.openElements.hasInTableScope(TAG_ID.TH)) {
      p._closeTableCell();
      startTagInRow(p, token);
    }
  } else startTagInBody(p, token);
}
//@ chunk-p9ac6cnb.js:174008-174488 esm-fingerprint
function endTagInCell(p, token) {
  let tn = token.tagID;
  switch (tn) {
    case TAG_ID.TD:
    case TAG_ID.TH: {
      if (p.openElements.hasInTableScope(tn)) {
        p.openElements.generateImpliedEndTags();
        p.openElements.popUntilTagNamePopped(tn);
        p.activeFormattingElements.clearToLastMarker();
        p.insertionMode = InsertionMode.IN_ROW;
      }
      break;
    }
    case TAG_ID.TABLE:
    case TAG_ID.TBODY:
    case TAG_ID.TFOOT:
    case TAG_ID.THEAD:
    case TAG_ID.TR: {
      if (p.openElements.hasInTableScope(tn)) {
        p._closeTableCell();
        endTagInRow(p, token);
      }
      break;
    }
    case TAG_ID.BODY:
    case TAG_ID.CAPTION:
    case TAG_ID.COL:
    case TAG_ID.COLGROUP:
    case TAG_ID.HTML:
      break;
    default:
      endTagInBody(p, token);
  }
}
//@ chunk-p9ac6cnb.js:174488-175307 esm-fingerprint
function startTagInSelect(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.OPTION: {
      if (p.openElements.currentTagId === TAG_ID.OPTION) p.openElements.pop();
      p._insertElement(token, NAMESPACES.HTML);
      break;
    }
    case TAG_ID.OPTGROUP: {
      if (p.openElements.currentTagId === TAG_ID.OPTION) p.openElements.pop();
      if (p.openElements.currentTagId === TAG_ID.OPTGROUP) p.openElements.pop();
      p._insertElement(token, NAMESPACES.HTML);
      break;
    }
    case TAG_ID.HR: {
      if (p.openElements.currentTagId === TAG_ID.OPTION) p.openElements.pop();
      if (p.openElements.currentTagId === TAG_ID.OPTGROUP) p.openElements.pop();
      p._appendElement(token, NAMESPACES.HTML);
      token.ackSelfClosing = true;
      break;
    }
    case TAG_ID.INPUT:
    case TAG_ID.KEYGEN:
    case TAG_ID.TEXTAREA:
    case TAG_ID.SELECT: {
      if (p.openElements.hasInSelectScope(TAG_ID.SELECT)) {
        p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
        p._resetInsertionMode();
        if (token.tagID !== TAG_ID.SELECT) p._processStartTag(token);
      }
      break;
    }
    case TAG_ID.SCRIPT:
    case TAG_ID.TEMPLATE: {
      startTagInHead(p, token);
      break;
    }
    default:
  }
}
//@ chunk-p9ac6cnb.js:175307-175842 esm-fingerprint
function endTagInSelect(p, token) {
  switch (token.tagID) {
    case TAG_ID.OPTGROUP: {
      if (
        p.openElements.stackTop > 0 &&
        p.openElements.currentTagId === TAG_ID.OPTION &&
        p.openElements.tagIDs[p.openElements.stackTop - 1] === TAG_ID.OPTGROUP
      )
        p.openElements.pop();
      if (p.openElements.currentTagId === TAG_ID.OPTGROUP) p.openElements.pop();
      break;
    }
    case TAG_ID.OPTION: {
      if (p.openElements.currentTagId === TAG_ID.OPTION) p.openElements.pop();
      break;
    }
    case TAG_ID.SELECT: {
      if (p.openElements.hasInSelectScope(TAG_ID.SELECT)) {
        p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
        p._resetInsertionMode();
      }
      break;
    }
    case TAG_ID.TEMPLATE: {
      templateEndTagInHead(p, token);
      break;
    }
    default:
  }
}
//@ chunk-p9ac6cnb.js:175842-176078 esm-fingerprint
function startTagInSelectInTable(p, token) {
  let tn = token.tagID;
  if (
    tn === TAG_ID.CAPTION ||
    tn === TAG_ID.TABLE ||
    tn === TAG_ID.TBODY ||
    tn === TAG_ID.TFOOT ||
    tn === TAG_ID.THEAD ||
    tn === TAG_ID.TR ||
    tn === TAG_ID.TD ||
    tn === TAG_ID.TH
  ) {
    p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
    p._resetInsertionMode();
    p._processStartTag(token);
  } else startTagInSelect(p, token);
}
//@ chunk-p9ac6cnb.js:176078-176344 esm-fingerprint
function endTagInSelectInTable(p, token) {
  let tn = token.tagID;
  if (
    tn === TAG_ID.CAPTION ||
    tn === TAG_ID.TABLE ||
    tn === TAG_ID.TBODY ||
    tn === TAG_ID.TFOOT ||
    tn === TAG_ID.THEAD ||
    tn === TAG_ID.TR ||
    tn === TAG_ID.TD ||
    tn === TAG_ID.TH
  ) {
    if (p.openElements.hasInTableScope(tn)) {
      p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
      p._resetInsertionMode();
      p.onEndTag(token);
    }
  } else endTagInSelect(p, token);
}
//@ chunk-p9ac6cnb.js:176344-177064 esm-fingerprint
function startTagInTemplate(p, token) {
  switch (token.tagID) {
    case TAG_ID.BASE:
    case TAG_ID.BASEFONT:
    case TAG_ID.BGSOUND:
    case TAG_ID.LINK:
    case TAG_ID.META:
    case TAG_ID.NOFRAMES:
    case TAG_ID.SCRIPT:
    case TAG_ID.STYLE:
    case TAG_ID.TEMPLATE:
    case TAG_ID.TITLE: {
      startTagInHead(p, token);
      break;
    }
    case TAG_ID.CAPTION:
    case TAG_ID.COLGROUP:
    case TAG_ID.TBODY:
    case TAG_ID.TFOOT:
    case TAG_ID.THEAD: {
      p.tmplInsertionModeStack[0] = InsertionMode.IN_TABLE;
      p.insertionMode = InsertionMode.IN_TABLE;
      startTagInTable(p, token);
      break;
    }
    case TAG_ID.COL: {
      p.tmplInsertionModeStack[0] = InsertionMode.IN_COLUMN_GROUP;
      p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
      startTagInColumnGroup(p, token);
      break;
    }
    case TAG_ID.TR: {
      p.tmplInsertionModeStack[0] = InsertionMode.IN_TABLE_BODY;
      p.insertionMode = InsertionMode.IN_TABLE_BODY;
      startTagInTableBody(p, token);
      break;
    }
    case TAG_ID.TD:
    case TAG_ID.TH: {
      p.tmplInsertionModeStack[0] = InsertionMode.IN_ROW;
      p.insertionMode = InsertionMode.IN_ROW;
      startTagInRow(p, token);
      break;
    }
    default:
      p.tmplInsertionModeStack[0] = InsertionMode.IN_BODY;
      p.insertionMode = InsertionMode.IN_BODY;
      startTagInBody(p, token);
  }
}
//@ chunk-p9ac6cnb.js:177064-177112 esm-fingerprint
function endTagInTemplate(p, token) {
  if (token.tagID === TAG_ID.TEMPLATE) templateEndTagInHead(p, token);
}
//@ chunk-p9ac6cnb.js:177112-177336 esm-fingerprint
function eofInTemplate(p, token) {
  if (p.openElements.tmplCount > 0) {
    p.openElements.popUntilTagNamePopped(TAG_ID.TEMPLATE);
    p.activeFormattingElements.clearToLastMarker();
    p.tmplInsertionModeStack.shift();
    p._resetInsertionMode();
    p.onEof(token);
  } else stopParsing(p, token);
}
//@ chunk-p9ac6cnb.js:177336-177393 esm-fingerprint
function startTagAfterBody(p, token) {
  if (token.tagID === TAG_ID.HTML) startTagInBody(p, token);
  else tokenAfterBody(p, token);
}
//@ chunk-p9ac6cnb.js:177393-177769 esm-fingerprint
function endTagAfterBody(p, token) {
  var _a;
  if (token.tagID === TAG_ID.HTML) {
    if (!p.fragmentContext) p.insertionMode = InsertionMode.AFTER_AFTER_BODY;
    if (p.options.sourceCodeLocationInfo && p.openElements.tagIDs[0] === TAG_ID.HTML) {
      p._setEndLocation(p.openElements.items[0], token);
      let bodyElement = p.openElements.items[1];
      if (
        bodyElement &&
        !((_a = p.treeAdapter.getNodeSourceCodeLocation(bodyElement)) === null || _a === undefined
          ? undefined
          : _a.endTag)
      )
        p._setEndLocation(bodyElement, token);
    }
  } else tokenAfterBody(p, token);
}
//@ chunk-p9ac6cnb.js:177769-177820 esm-fingerprint
function tokenAfterBody(p, token) {
  p.insertionMode = InsertionMode.IN_BODY;
  modeInBody(p, token);
}
//@ chunk-p9ac6cnb.js:177820-178036 esm-fingerprint
function startTagInFrameset(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.FRAMESET: {
      p._insertElement(token, NAMESPACES.HTML);
      break;
    }
    case TAG_ID.FRAME: {
      p._appendElement(token, NAMESPACES.HTML);
      token.ackSelfClosing = true;
      break;
    }
    case TAG_ID.NOFRAMES: {
      startTagInHead(p, token);
      break;
    }
    default:
  }
}
//@ chunk-p9ac6cnb.js:178036-178241 esm-fingerprint
function endTagInFrameset(p, token) {
  if (token.tagID === TAG_ID.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
    p.openElements.pop();
    if (!p.fragmentContext && p.openElements.currentTagId !== TAG_ID.FRAMESET)
      p.insertionMode = InsertionMode.AFTER_FRAMESET;
  }
}
//@ chunk-p9ac6cnb.js:178241-178340 esm-fingerprint
function startTagAfterFrameset(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.NOFRAMES: {
      startTagInHead(p, token);
      break;
    }
    default:
  }
}
//@ chunk-p9ac6cnb.js:178340-178416 esm-fingerprint
function endTagAfterFrameset(p, token) {
  if (token.tagID === TAG_ID.HTML) p.insertionMode = InsertionMode.AFTER_AFTER_FRAMESET;
}
//@ chunk-p9ac6cnb.js:178416-178473 esm-fingerprint
function startTagAfterAfterBody(p, token) {
  if (token.tagID === TAG_ID.HTML) startTagInBody(p, token);
  else tokenAfterAfterBody(p, token);
}
//@ chunk-p9ac6cnb.js:178473-178524 esm-fingerprint
function tokenAfterAfterBody(p, token) {
  p.insertionMode = InsertionMode.IN_BODY;
  modeInBody(p, token);
}
//@ chunk-p9ac6cnb.js:178524-178623 esm-fingerprint
function startTagAfterAfterFrameset(p, token) {
  switch (token.tagID) {
    case TAG_ID.HTML: {
      startTagInBody(p, token);
      break;
    }
    case TAG_ID.NOFRAMES: {
      startTagInHead(p, token);
      break;
    }
    default:
  }
}
//@ chunk-p9ac6cnb.js:178623-178673 esm-fingerprint
function nullCharacterInForeignContent(p, token) {
  token.chars = REPLACEMENT_CHARACTER;
  p._insertCharacters(token);
}
//@ chunk-p9ac6cnb.js:178673-178729 esm-fingerprint
function characterInForeignContent(p, token) {
  p._insertCharacters(token);
  p.framesetOk = false;
}
//@ chunk-p9ac6cnb.js:178729-178910 esm-fingerprint
function popUntilHtmlOrIntegrationPoint(p) {
  while (
    p.treeAdapter.getNamespaceURI(p.openElements.current) !== NAMESPACES.HTML &&
    !p._isIntegrationPoint(p.openElements.currentTagId, p.openElements.current)
  )
    p.openElements.pop();
}
//@ chunk-p9ac6cnb.js:178910-179200 esm-fingerprint
function startTagInForeignContent(p, token) {
  if (causesExit(token)) {
    popUntilHtmlOrIntegrationPoint(p);
    p._startTagOutsideForeignContent(token);
  } else {
    let current = p._getAdjustedCurrentElement();
    let currentNs = p.treeAdapter.getNamespaceURI(current);
    if (currentNs === NAMESPACES.MATHML) adjustTokenMathMLAttrs(token);
    else if (currentNs === NAMESPACES.SVG) {
      adjustTokenSVGTagName(token);
      adjustTokenSVGAttrs(token);
    }
    adjustTokenXMLAttrs(token);
    if (token.selfClosing) p._appendElement(token, currentNs);
    else p._insertElement(token, currentNs);
    token.ackSelfClosing = true;
  }
}
//@ chunk-p9ac6cnb.js:179200-179577 esm-fingerprint
function endTagInForeignContent(p, token) {
  if (token.tagID === TAG_ID.P || token.tagID === TAG_ID.BR) {
    popUntilHtmlOrIntegrationPoint(p);
    p._endTagOutsideForeignContent(token);
    return;
  }
  for (let i = p.openElements.stackTop; i > 0; i--) {
    let element = p.openElements.items[i];
    if (p.treeAdapter.getNamespaceURI(element) === NAMESPACES.HTML) {
      p._endTagOutsideForeignContent(token);
      break;
    }
    let tagName = p.treeAdapter.getTagName(element);
    if (tagName.toLowerCase() === token.tagName) {
      token.tagName = tagName;
      p.openElements.shortenToLength(i);
      break;
    }
  }
}
export { Parser };
