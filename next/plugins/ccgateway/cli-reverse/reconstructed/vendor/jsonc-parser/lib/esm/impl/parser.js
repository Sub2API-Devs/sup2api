/**
 * jsonc-parser/lib/esm/impl/parser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-aj4djjd6.js (7)
 * attribution: esm-layout 1, esm-fingerprint 6
 */
import { createScanner } from "./scanner.js";

//@ chunk-aj4djjd6.js:7855-7861 esm-layout
var ParseOptions;
//@ chunk-aj4djjd6.js:7861-7921 esm-fingerprint
(function (ParseOptions) {
  ParseOptions.DEFAULT = {
    allowTrailingComma: false,
  };
})(ParseOptions || (ParseOptions = {}));
//@ chunk-aj4djjd6.js:7921-8326 esm-fingerprint
function parseTree(text, path = [], options = ParseOptions.DEFAULT) {
  let currentProperty = null;
  let currentParent = [];
  let previousParents = [];
  function onValue(value) {
    if (Array.isArray(currentParent)) currentParent.push(value);
    else if (currentProperty !== null) currentParent[currentProperty] = value;
  }
  getNodeValue(
    text,
    {
      onObjectBegin: () => {
        let object = {};
        onValue(object);
        previousParents.push(currentParent);
        currentParent = object;
        currentProperty = null;
      },
      onObjectProperty: (name) => {
        currentProperty = name;
      },
      onObjectEnd: () => {
        currentParent = previousParents.pop();
      },
      onArrayBegin: () => {
        let array = [];
        onValue(array);
        previousParents.push(currentParent);
        currentParent = array;
        currentProperty = null;
      },
      onArrayEnd: () => {
        currentParent = previousParents.pop();
      },
      onLiteralValue: onValue,
      onError: (error, offset, length) => {
        path.push({
          error,
          offset,
          length,
        });
      },
    },
    options,
  );
  return currentParent[0];
}
//@ chunk-aj4djjd6.js:8326-9279 esm-fingerprint
function parseTree_2(text, errors = [], options = ParseOptions.DEFAULT) {
  let currentParent = {
    type: "array",
    offset: -1,
    length: -1,
    children: [],
    parent: undefined,
  };
  function ensurePropertyComplete(endOffset) {
    if (currentParent.type === "property") {
      currentParent.length = endOffset - currentParent.offset;
      currentParent = currentParent.parent;
    }
  }
  function onValue(valueNode) {
    currentParent.children.push(valueNode);
    return valueNode;
  }
  getNodeValue(
    text,
    {
      onObjectBegin: (offset) => {
        currentParent = onValue({
          type: "object",
          offset,
          length: -1,
          parent: currentParent,
          children: [],
        });
      },
      onObjectProperty: (name, offset, length) => {
        currentParent = onValue({
          type: "property",
          offset,
          length: -1,
          parent: currentParent,
          children: [],
        });
        currentParent.children.push({
          type: "string",
          value: name,
          offset,
          length,
          parent: currentParent,
        });
      },
      onObjectEnd: (offset, length) => {
        ensurePropertyComplete(offset + length);
        currentParent.length = offset + length - currentParent.offset;
        currentParent = currentParent.parent;
        ensurePropertyComplete(offset + length);
      },
      onArrayBegin: (offset, length) => {
        currentParent = onValue({
          type: "array",
          offset,
          length: -1,
          parent: currentParent,
          children: [],
        });
      },
      onArrayEnd: (offset, length) => {
        currentParent.length = offset + length - currentParent.offset;
        currentParent = currentParent.parent;
        ensurePropertyComplete(offset + length);
      },
      onLiteralValue: (value, offset, length) => {
        onValue({
          type: getNodeType(value),
          offset,
          length,
          parent: currentParent,
          value,
        });
        ensurePropertyComplete(offset + length);
      },
      onSeparator: (sep, offset, length) => {
        if (currentParent.type === "property") {
          if (sep === ":") currentParent.colonOffset = offset;
          else if (sep === ",") ensurePropertyComplete(offset);
        }
      },
      onError: (error, offset, length) => {
        errors.push({
          error,
          offset,
          length,
        });
      },
    },
    options,
  );
  let result = currentParent.children[0];
  if (result) delete result.parent;
  return result;
}
//@ chunk-aj4djjd6.js:9279-9682 esm-fingerprint
function findNodeAtLocation(root, path) {
  if (!root) return;
  let node = root;
  for (let segment of path)
    if (typeof segment === "string") {
      if (node.type !== "object" || !Array.isArray(node.children)) return;
      let found = false;
      for (let propertyNode of node.children)
        if (
          Array.isArray(propertyNode.children) &&
          propertyNode.children[0].value === segment &&
          propertyNode.children.length === 2
        ) {
          node = propertyNode.children[1];
          found = true;
          break;
        }
      if (!found) return;
    } else {
      let index = segment;
      if (
        node.type !== "array" ||
        index < 0 ||
        !Array.isArray(node.children) ||
        index >= node.children.length
      )
        return;
      node = node.children[index];
    }
  return node;
}
//@ chunk-aj4djjd6.js:9682-12205 esm-fingerprint
function getNodeValue(text, visitor, options = ParseOptions.DEFAULT) {
  let _scanner = createScanner(text, false);
  let _jsonPath = [];
  function toNoArgVisit(visitFunction) {
    return visitFunction
      ? () =>
          visitFunction(
            _scanner.getTokenOffset(),
            _scanner.getTokenLength(),
            _scanner.getTokenStartLine(),
            _scanner.getTokenStartCharacter(),
          )
      : () => true;
  }
  function toOneArgVisit(visitFunction) {
    return visitFunction
      ? () =>
          visitFunction(
            _scanner.getTokenOffset(),
            _scanner.getTokenLength(),
            _scanner.getTokenStartLine(),
            _scanner.getTokenStartCharacter(),
            () => _jsonPath.slice(),
          )
      : () => true;
  }
  function toOneArgVisit_2(visitFunction) {
    return visitFunction
      ? (arg) =>
          visitFunction(
            arg,
            _scanner.getTokenOffset(),
            _scanner.getTokenLength(),
            _scanner.getTokenStartLine(),
            _scanner.getTokenStartCharacter(),
          )
      : () => true;
  }
  function toOneArgVisitWithPath(visitFunction) {
    return visitFunction
      ? (toBeginVisit) =>
          visitFunction(
            toBeginVisit,
            _scanner.getTokenOffset(),
            _scanner.getTokenLength(),
            _scanner.getTokenStartLine(),
            _scanner.getTokenStartCharacter(),
            () => _jsonPath.slice(),
          )
      : () => true;
  }
  let toEndVisit = toOneArgVisit(visitor.onObjectBegin);
  let onObjectProperty = toOneArgVisitWithPath(visitor.onObjectProperty);
  let onObjectEnd = toNoArgVisit(visitor.onObjectEnd);
  let onArrayBegin = toOneArgVisit(visitor.onArrayBegin);
  let onArrayEnd = toNoArgVisit(visitor.onArrayEnd);
  let onLiteralValue = toOneArgVisitWithPath(visitor.onLiteralValue);
  let onSeparator = toOneArgVisit_2(visitor.onSeparator);
  let onComment = toNoArgVisit(visitor.onComment);
  let onError = toOneArgVisit_2(visitor.onError);
  let disallowComments = options && options.disallowComments;
  let allowTrailingComma = options && options.allowTrailingComma;
  function scanNext() {
    while (true) {
      let token = _scanner.scan();
      switch (_scanner.getTokenError()) {
        case 4:
          handleError(14);
          break;
        case 5:
          handleError(15);
          break;
        case 3:
          handleError(13);
          break;
        case 1:
          if (!disallowComments) handleError(11);
          break;
        case 2:
          handleError(12);
          break;
        case 6:
          handleError(16);
          break;
      }
      switch (token) {
        case 12:
        case 13:
          if (disallowComments) handleError(10);
          else onComment();
          break;
        case 16:
          handleError(1);
          break;
        case 15:
        case 14:
          break;
        default:
          return token;
      }
    }
  }
  function handleError(error, skipUntilAfter = [], skipUntil = []) {
    onError(error);
    if (skipUntilAfter.length + skipUntil.length > 0) {
      let token = _scanner.getToken();
      while (token !== 17) {
        if (skipUntilAfter.indexOf(token) !== -1) {
          scanNext();
          break;
        } else if (skipUntil.indexOf(token) !== -1) break;
        token = scanNext();
      }
    }
  }
  function parseString(isValue) {
    let value = _scanner.getTokenValue();
    if (isValue) onLiteralValue(value);
    else {
      onObjectProperty(value);
      _jsonPath.push(value);
    }
    scanNext();
    return true;
  }
  function parseLiteral() {
    switch (_scanner.getToken()) {
      case 11:
        let tokenValue = _scanner.getTokenValue();
        let value = Number(tokenValue);
        if (isNaN(value)) {
          handleError(2);
          value = 0;
        }
        onLiteralValue(value);
        break;
      case 7:
        onLiteralValue(null);
        break;
      case 8:
        onLiteralValue(true);
        break;
      case 9:
        onLiteralValue(false);
        break;
      default:
        return false;
    }
    scanNext();
    return true;
  }
  function parseProperty() {
    if (_scanner.getToken() !== 10) {
      handleError(3, [], [2, 5]);
      return false;
    }
    parseString(false);
    if (_scanner.getToken() === 6) {
      onSeparator(":");
      scanNext();
      if (!parseValue()) handleError(4, [], [2, 5]);
    } else handleError(5, [], [2, 5]);
    _jsonPath.pop();
    return true;
  }
  function parseObject() {
    toEndVisit();
    scanNext();
    let needsComma = false;
    while (_scanner.getToken() !== 2 && _scanner.getToken() !== 17) {
      if (_scanner.getToken() === 5) {
        if (!needsComma) handleError(4, [], []);
        onSeparator(",");
        scanNext();
        if (_scanner.getToken() === 2 && allowTrailingComma) break;
      } else if (needsComma) handleError(6, [], []);
      if (!parseProperty()) handleError(4, [], [2, 5]);
      needsComma = true;
    }
    onObjectEnd();
    if (_scanner.getToken() !== 2) handleError(7, [2], []);
    else scanNext();
    return true;
  }
  function parseArray() {
    onArrayBegin();
    scanNext();
    let isFirstElement = true;
    let needsComma = false;
    while (_scanner.getToken() !== 4 && _scanner.getToken() !== 17) {
      if (_scanner.getToken() === 5) {
        if (!needsComma) handleError(4, [], []);
        onSeparator(",");
        scanNext();
        if (_scanner.getToken() === 4 && allowTrailingComma) break;
      } else if (needsComma) handleError(6, [], []);
      if (isFirstElement) {
        _jsonPath.push(0);
        isFirstElement = false;
      } else _jsonPath[_jsonPath.length - 1]++;
      if (!parseValue()) handleError(4, [], [4, 5]);
      needsComma = true;
    }
    onArrayEnd();
    if (!isFirstElement) _jsonPath.pop();
    if (_scanner.getToken() !== 4) handleError(8, [4], []);
    else scanNext();
    return true;
  }
  function parseValue() {
    switch (_scanner.getToken()) {
      case 3:
        return parseArray();
      case 1:
        return parseObject();
      case 10:
        return parseString(true);
      default:
        return parseLiteral();
    }
  }
  scanNext();
  if (_scanner.getToken() === 17) {
    if (options.allowEmptyContent) return true;
    handleError(4, [], []);
    return false;
  }
  if (!parseValue()) {
    handleError(4, [], []);
    return false;
  }
  if (_scanner.getToken() !== 17) handleError(9, [], []);
  return true;
}
//@ chunk-aj4djjd6.js:12205-12432 esm-fingerprint
function getNodeType(value) {
  switch (typeof value) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "object": {
      if (!value) return "null";
      else if (Array.isArray(value)) return "array";
      return "object";
    }
    default:
      return "null";
  }
}
export { parseTree_2, findNodeAtLocation, parseTree };
