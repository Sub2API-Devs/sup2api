/**
 * fast-xml-parser/lib/fxp.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: fast-xml-parser@5.5.8..5.5.9
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-3p78mpxm.js:26640-73699 cjs-fingerprint
var require_fxp = __commonJS(function (cjsExports, cjsModule) {
  (() => {
    var __webpack_require__ = {
      d: (webpackRequire, definition) => {
        for (var key in definition)
          if (__webpack_require__.o(definition, key) && !__webpack_require__.o(webpackRequire, key))
            Object.defineProperty(webpackRequire, key, {
              enumerable: true,
              get: definition[key],
            });
      },
      o: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop),
      r: (webpackModule) => {
        if (typeof Symbol !== "undefined" && Symbol.toStringTag)
          Object.defineProperty(webpackModule, Symbol.toStringTag, {
            value: "Module",
          });
        Object.defineProperty(webpackModule, "__esModule", {
          value: true,
        });
      },
    };
    var webpackExports = {};
    __webpack_require__.r(webpackExports);
    __webpack_require__.d(webpackExports, {
      XMLBuilder: () => XMLBuilder,
      XMLParser: () => XMLParser,
      XMLValidator: () => XMLValidator,
    });
    let nameStartChar =
      ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
    let regexName = new RegExp(
      "^[" + nameStartChar + "][" + nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$",
    );
    function getAllMatches(string, regex) {
      let matches = [];
      let match = regex.exec(string);
      for (; match;) {
        let allmatches = [];
        allmatches.startIndex = regex.lastIndex - match[0].length;
        let len = match.length;
        for (let index = 0; index < len; index++) allmatches.push(match[index]);
        matches.push(allmatches);
        match = regex.exec(string);
      }
      return matches;
    }
    let isName = function (string) {
      return regexName.exec(string) != null;
    };
    let DANGEROUS_PROPERTY_NAMES = [
      "hasOwnProperty",
      "toString",
      "valueOf",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
    ];
    let criticalProperties = ["__proto__", "constructor", "prototype"];
    let defaultOptions = {
      allowBooleanAttributes: false,
      unpairedTags: [],
    };
    function validate(xmlData, options) {
      options = Object.assign({}, defaultOptions, options);
      let tags = [];
      let tagFound = false;
      let reachedRoot = false;
      if (xmlData[0] === "\uFEFF") xmlData = xmlData.substr(1);
      for (let i = 0; i < xmlData.length; i++)
        if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
          i += 2;
          i = readPI(xmlData, i);
          if (i.err) return i;
        } else {
          if (xmlData[i] !== "<") {
            if (isWhiteSpace(xmlData[i])) continue;
            return getErrorObject(
              "InvalidChar",
              "char '" + xmlData[i] + "' is not expected.",
              getLineNumberForPosition(xmlData, i),
            );
          }
          {
            let tagStartPos = i;
            i++;
            if (xmlData[i] === "!") {
              i = readCommentAndCDATA(xmlData, i);
              continue;
            }
            {
              let closingTag = false;
              if (xmlData[i] === "/") {
                closingTag = true;
                i++;
              }
              let tagName = "";
              for (
                ;
                i < xmlData.length &&
                xmlData[i] !== ">" &&
                xmlData[i] !== " " &&
                xmlData[i] !== "\t" &&
                xmlData[i] !==
                  `
` &&
                xmlData[i] !== "\r";
                i++
              )
                tagName += xmlData[i];
              tagName = tagName.trim();
              if (tagName[tagName.length - 1] === "/") {
                tagName = tagName.substring(0, tagName.length - 1);
                i--;
              }
              if (!validateTagName(tagName)) {
                let error;
                error =
                  tagName.trim().length === 0
                    ? "Invalid space after '<'."
                    : "Tag '" + tagName + "' is an invalid name.";
                return getErrorObject("InvalidTag", error, getLineNumberForPosition(xmlData, i));
              }
              let result = readAttributeStr(xmlData, i);
              if (result === false)
                return getErrorObject(
                  "InvalidAttr",
                  "Attributes for '" + tagName + "' have open quote.",
                  getLineNumberForPosition(xmlData, i),
                );
              let attrStr = result.value;
              i = result.index;
              if (attrStr[attrStr.length - 1] === "/") {
                let attrStrStart = i - attrStr.length;
                attrStr = attrStr.substring(0, attrStr.length - 1);
                let isValid = validateAttributeString(attrStr, options);
                if (isValid !== true)
                  return getErrorObject(
                    isValid.err.code,
                    isValid.err.msg,
                    getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line),
                  );
                tagFound = true;
              } else if (closingTag) {
                if (!result.tagClosed)
                  return getErrorObject(
                    "InvalidTag",
                    "Closing tag '" + tagName + "' doesn't have proper closing.",
                    getLineNumberForPosition(xmlData, i),
                  );
                if (attrStr.trim().length > 0)
                  return getErrorObject(
                    "InvalidTag",
                    "Closing tag '" + tagName + "' can't have attributes or invalid starting.",
                    getLineNumberForPosition(xmlData, tagStartPos),
                  );
                if (tags.length === 0)
                  return getErrorObject(
                    "InvalidTag",
                    "Closing tag '" + tagName + "' has not been opened.",
                    getLineNumberForPosition(xmlData, tagStartPos),
                  );
                {
                  let otg = tags.pop();
                  if (tagName !== otg.tagName) {
                    let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
                    return getErrorObject(
                      "InvalidTag",
                      "Expected closing tag '" +
                        otg.tagName +
                        "' (opened in line " +
                        openPos.line +
                        ", col " +
                        openPos.col +
                        ") instead of closing tag '" +
                        tagName +
                        "'.",
                      getLineNumberForPosition(xmlData, tagStartPos),
                    );
                  }
                  if (tags.length == 0) reachedRoot = true;
                }
              } else {
                let isValid = validateAttributeString(attrStr, options);
                if (isValid !== true)
                  return getErrorObject(
                    isValid.err.code,
                    isValid.err.msg,
                    getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line),
                  );
                if (reachedRoot === true)
                  return getErrorObject(
                    "InvalidXml",
                    "Multiple possible root nodes found.",
                    getLineNumberForPosition(xmlData, i),
                  );
                if (!(options.unpairedTags.indexOf(tagName) !== -1))
                  tags.push({
                    tagName,
                    tagStartPos,
                  });
                tagFound = true;
              }
              for (i++; i < xmlData.length; i++)
                if (xmlData[i] === "<") {
                  if (xmlData[i + 1] === "!") {
                    i++;
                    i = readCommentAndCDATA(xmlData, i);
                    continue;
                  }
                  if (xmlData[i + 1] !== "?") break;
                  i = readPI(xmlData, ++i);
                  if (i.err) return i;
                } else if (xmlData[i] === "&") {
                  let afterAmp = validateAmpersand(xmlData, i);
                  if (afterAmp == -1)
                    return getErrorObject(
                      "InvalidChar",
                      "char '&' is not expected.",
                      getLineNumberForPosition(xmlData, i),
                    );
                  i = afterAmp;
                } else if (reachedRoot === true && !isWhiteSpace(xmlData[i]))
                  return getErrorObject(
                    "InvalidXml",
                    "Extra text at the end",
                    getLineNumberForPosition(xmlData, i),
                  );
              if (xmlData[i] === "<") i--;
            }
          }
        }
      return tagFound
        ? tags.length == 1
          ? getErrorObject(
              "InvalidTag",
              "Unclosed tag '" + tags[0].tagName + "'.",
              getLineNumberForPosition(xmlData, tags[0].tagStartPos),
            )
          : !(tags.length > 0) ||
            getErrorObject(
              "InvalidXml",
              "Invalid '" +
                JSON.stringify(
                  tags.map((t) => t.tagName),
                  null,
                  4,
                ).replace(/\r?\n/g, "") +
                "' found.",
              {
                line: 1,
                col: 1,
              },
            )
        : getErrorObject("InvalidXml", "Start tag expected.", 1);
    }
    function isWhiteSpace(char) {
      return (
        char === " " ||
        char === "\t" ||
        char ===
          `
` ||
        char === "\r"
      );
    }
    function readPI(xmlData, scanPos) {
      let start = scanPos;
      for (; scanPos < xmlData.length; scanPos++)
        if (xmlData[scanPos] == "?" || xmlData[scanPos] == " ") {
          let tagname = xmlData.substr(start, scanPos - start);
          if (scanPos > 5 && tagname === "xml")
            return getErrorObject(
              "InvalidXml",
              "XML declaration allowed only at the start of the document.",
              getLineNumberForPosition(xmlData, scanPos),
            );
          if (xmlData[scanPos] == "?" && xmlData[scanPos + 1] == ">") {
            scanPos++;
            break;
          }
          continue;
        }
      return scanPos;
    }
    function readCommentAndCDATA(xmlData, scanPos) {
      if (xmlData.length > scanPos + 5 && xmlData[scanPos + 1] === "-" && xmlData[scanPos + 2] === "-") {
        for (scanPos += 3; scanPos < xmlData.length; scanPos++)
          if (xmlData[scanPos] === "-" && xmlData[scanPos + 1] === "-" && xmlData[scanPos + 2] === ">") {
            scanPos += 2;
            break;
          }
      } else if (
        xmlData.length > scanPos + 8 &&
        xmlData[scanPos + 1] === "D" &&
        xmlData[scanPos + 2] === "O" &&
        xmlData[scanPos + 3] === "C" &&
        xmlData[scanPos + 4] === "T" &&
        xmlData[scanPos + 5] === "Y" &&
        xmlData[scanPos + 6] === "P" &&
        xmlData[scanPos + 7] === "E"
      ) {
        let angleBracketsCount = 1;
        for (scanPos += 8; scanPos < xmlData.length; scanPos++)
          if (xmlData[scanPos] === "<") angleBracketsCount++;
          else if (xmlData[scanPos] === ">" && (angleBracketsCount--, angleBracketsCount === 0)) break;
      } else if (
        xmlData.length > scanPos + 9 &&
        xmlData[scanPos + 1] === "[" &&
        xmlData[scanPos + 2] === "C" &&
        xmlData[scanPos + 3] === "D" &&
        xmlData[scanPos + 4] === "A" &&
        xmlData[scanPos + 5] === "T" &&
        xmlData[scanPos + 6] === "A" &&
        xmlData[scanPos + 7] === "["
      ) {
        for (scanPos += 8; scanPos < xmlData.length; scanPos++)
          if (xmlData[scanPos] === "]" && xmlData[scanPos + 1] === "]" && xmlData[scanPos + 2] === ">") {
            scanPos += 2;
            break;
          }
      }
      return scanPos;
    }
    let doubleQuote = '"';
    let singleQuote = "'";
    function readAttributeStr(xmlData, scanPos) {
      let attrStr = "";
      let startChar = "";
      let tagClosed = false;
      for (; scanPos < xmlData.length; scanPos++) {
        if (xmlData[scanPos] === doubleQuote || xmlData[scanPos] === singleQuote) {
          if (startChar === "") startChar = xmlData[scanPos];
          else if (!(startChar !== xmlData[scanPos])) startChar = "";
        } else if (xmlData[scanPos] === ">" && startChar === "") {
          tagClosed = true;
          break;
        }
        attrStr += xmlData[scanPos];
      }
      return (
        startChar === "" && {
          value: attrStr,
          index: scanPos,
          tagClosed,
        }
      );
    }
    let validAttrStrRegxp = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
    function validateAttributeString(attrStr, options) {
      let matches = getAllMatches(attrStr, validAttrStrRegxp);
      let attrNames = {};
      for (let i = 0; i < matches.length; i++) {
        if (matches[i][1].length === 0)
          return getErrorObject(
            "InvalidAttr",
            "Attribute '" + matches[i][2] + "' has no space in starting.",
            getPositionFromMatch(matches[i]),
          );
        if (matches[i][3] !== undefined && matches[i][4] === undefined)
          return getErrorObject(
            "InvalidAttr",
            "Attribute '" + matches[i][2] + "' is without value.",
            getPositionFromMatch(matches[i]),
          );
        if (matches[i][3] === undefined && !options.allowBooleanAttributes)
          return getErrorObject(
            "InvalidAttr",
            "boolean attribute '" + matches[i][2] + "' is not allowed.",
            getPositionFromMatch(matches[i]),
          );
        let attrName = matches[i][2];
        if (!validateAttrName(attrName))
          return getErrorObject(
            "InvalidAttr",
            "Attribute '" + attrName + "' is an invalid name.",
            getPositionFromMatch(matches[i]),
          );
        if (Object.prototype.hasOwnProperty.call(attrNames, attrName))
          return getErrorObject(
            "InvalidAttr",
            "Attribute '" + attrName + "' is repeated.",
            getPositionFromMatch(matches[i]),
          );
        attrNames[attrName] = 1;
      }
      return true;
    }
    function validateAmpersand(xmlData, scanPos) {
      if (xmlData[++scanPos] === ";") return -1;
      if (xmlData[scanPos] === "#")
        return (function (xmlData, i) {
          let re = /\d/;
          for (xmlData[i] === "x" && (i++, (re = /[\da-fA-F]/)); i < xmlData.length; i++) {
            if (xmlData[i] === ";") return i;
            if (!xmlData[i].match(re)) break;
          }
          return -1;
        })(xmlData, ++scanPos);
      let count = 0;
      for (; scanPos < xmlData.length; scanPos++, count++)
        if (!(xmlData[scanPos].match(/\w/) && count < 20)) {
          if (xmlData[scanPos] === ";") break;
          return -1;
        }
      return scanPos;
    }
    function getErrorObject(code, message, lineNumber) {
      return {
        err: {
          code,
          msg: message,
          line: lineNumber.line || lineNumber,
          col: lineNumber.col,
        },
      };
    }
    function validateAttrName(attrName) {
      return isName(attrName);
    }
    function validateTagName(tagname) {
      return isName(tagname);
    }
    function getLineNumberForPosition(xmlData, index) {
      let lines = xmlData.substring(0, index).split(/\r?\n/);
      return {
        line: lines.length,
        col: lines[lines.length - 1].length + 1,
      };
    }
    function getPositionFromMatch(match) {
      return match.startIndex + match[1].length;
    }
    let defaultOnDangerousProperty = (name) => (DANGEROUS_PROPERTY_NAMES.includes(name) ? "__" + name : name);
    let defaultOptions_2 = {
      preserveOrder: false,
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      textNodeName: "#text",
      ignoreAttributes: true,
      removeNSPrefix: false,
      allowBooleanAttributes: false,
      parseTagValue: true,
      parseAttributeValue: false,
      trimValues: true,
      cdataPropName: false,
      numberParseOptions: {
        hex: true,
        leadingZeros: true,
        eNotation: true,
      },
      tagValueProcessor: function (tagName, val) {
        return val;
      },
      attributeValueProcessor: function (attrName, val) {
        return val;
      },
      stopNodes: [],
      alwaysCreateTextNode: false,
      isArray: () => false,
      commentPropName: false,
      unpairedTags: [],
      processEntities: true,
      htmlEntities: false,
      ignoreDeclaration: false,
      ignorePiTags: false,
      transformTagName: false,
      transformAttributeName: false,
      updateTag: function (tagName, jPath, attrs) {
        return tagName;
      },
      captureMetaData: false,
      maxNestedTags: 100,
      strictReservedNames: true,
      jPath: true,
      onDangerousProperty: defaultOnDangerousProperty,
    };
    function validatePropertyName(propertyName, optionName) {
      if (typeof propertyName != "string") return;
      let normalized = propertyName.toLowerCase();
      if (DANGEROUS_PROPERTY_NAMES.some((dangerous) => normalized === dangerous.toLowerCase()))
        throw Error(
          `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`,
        );
      if (criticalProperties.some((dangerous) => normalized === dangerous.toLowerCase()))
        throw Error(
          `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`,
        );
    }
    function normalizeProcessEntities(value) {
      return typeof value == "boolean"
        ? {
            enabled: value,
            maxEntitySize: 1e4,
            maxExpansionDepth: 10,
            maxTotalExpansions: 1000,
            maxExpandedLength: 1e5,
            maxEntityCount: 100,
            allowedTags: null,
            tagFilter: null,
          }
        : typeof value == "object" && value !== null
          ? {
              enabled: value.enabled !== false,
              maxEntitySize: Math.max(1, value.maxEntitySize ?? 1e4),
              maxExpansionDepth: Math.max(1, value.maxExpansionDepth ?? 10),
              maxTotalExpansions: Math.max(1, value.maxTotalExpansions ?? 1000),
              maxExpandedLength: Math.max(1, value.maxExpandedLength ?? 1e5),
              maxEntityCount: Math.max(1, value.maxEntityCount ?? 100),
              allowedTags: value.allowedTags ?? null,
              tagFilter: value.tagFilter ?? null,
            }
          : normalizeProcessEntities(true);
    }
    let buildOptions = function (options) {
      let built = Object.assign({}, defaultOptions_2, options);
      let _propertyNameOptions = [
        {
          value: built.attributeNamePrefix,
          name: "attributeNamePrefix",
        },
        {
          value: built.attributesGroupName,
          name: "attributesGroupName",
        },
        {
          value: built.textNodeName,
          name: "textNodeName",
        },
        {
          value: built.cdataPropName,
          name: "cdataPropName",
        },
        {
          value: built.commentPropName,
          name: "commentPropName",
        },
      ];
      for (let { value, name: optionName } of _propertyNameOptions)
        if (value) validatePropertyName(value, optionName);
      if (built.onDangerousProperty === null) built.onDangerousProperty = defaultOnDangerousProperty;
      built.processEntities = normalizeProcessEntities(built.processEntities);
      if (built.stopNodes && Array.isArray(built.stopNodes))
        built.stopNodes = built.stopNodes.map((node) =>
          typeof node == "string" && node.startsWith("*.") ? ".." + node.substring(2) : node,
        );
      return built;
    };
    let METADATA_SYMBOL;
    METADATA_SYMBOL = typeof Symbol != "function" ? "@@xmlMetadata" : Symbol("XML Node Metadata");
    class XmlNode {
      constructor(tagname) {
        this.tagname = tagname;
        this.child = [];
        this[":@"] = Object.create(null);
      }
      add(key, val) {
        if (key === "__proto__") key = "#__proto__";
        this.child.push({
          [key]: val,
        });
      }
      addChild(node, startIndex) {
        if (node.tagname === "__proto__") node.tagname = "#__proto__";
        if (node[":@"] && Object.keys(node[":@"]).length > 0)
          this.child.push({
            [node.tagname]: node.child,
            ":@": node[":@"],
          });
        else
          this.child.push({
            [node.tagname]: node.child,
          });
        if (startIndex !== undefined)
          this.child[this.child.length - 1][METADATA_SYMBOL] = {
            startIndex,
          };
      }
      static getMetaDataSymbol() {
        return METADATA_SYMBOL;
      }
    }
    class DocTypeReader {
      constructor(options) {
        this.suppressValidationErr = !options;
        this.options = options;
      }
      readDocType(xmlData, scanPos) {
        let entities = Object.create(null);
        let entityCount = 0;
        if (
          xmlData[scanPos + 3] !== "O" ||
          xmlData[scanPos + 4] !== "C" ||
          xmlData[scanPos + 5] !== "T" ||
          xmlData[scanPos + 6] !== "Y" ||
          xmlData[scanPos + 7] !== "P" ||
          xmlData[scanPos + 8] !== "E"
        )
          throw Error("Invalid Tag instead of DOCTYPE");
        {
          scanPos += 9;
          let angleBracketsCount = 1;
          let hasBody = false;
          let comment = false;
          let exp = "";
          for (; scanPos < xmlData.length; scanPos++)
            if (xmlData[scanPos] !== "<" || comment) {
              if (xmlData[scanPos] === ">") {
                if (comment) {
                  if (xmlData[scanPos - 1] === "-" && xmlData[scanPos - 2] === "-") {
                    comment = false;
                    angleBracketsCount--;
                  }
                } else angleBracketsCount--;
                if (angleBracketsCount === 0) break;
              } else if (xmlData[scanPos] === "[") hasBody = true;
              else exp += xmlData[scanPos];
            } else {
              if (hasBody && hasSeq(xmlData, "!ENTITY", scanPos)) {
                let entityName;
                let val;
                scanPos += 7;
                [entityName, val, scanPos] = this.readEntityExp(
                  xmlData,
                  scanPos + 1,
                  this.suppressValidationErr,
                );
                if (val.indexOf("&") === -1) {
                  if (
                    this.options.enabled !== false &&
                    this.options.maxEntityCount != null &&
                    entityCount >= this.options.maxEntityCount
                  )
                    throw Error(
                      `Entity count (${entityCount + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`,
                    );
                  let escaped = entityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  entities[entityName] = {
                    regx: RegExp(`&${escaped};`, "g"),
                    val,
                  };
                  entityCount++;
                }
              } else if (hasBody && hasSeq(xmlData, "!ELEMENT", scanPos)) {
                scanPos += 8;
                let { index } = this.readElementExp(xmlData, scanPos + 1);
                scanPos = index;
              } else if (hasBody && hasSeq(xmlData, "!ATTLIST", scanPos)) scanPos += 8;
              else if (hasBody && hasSeq(xmlData, "!NOTATION", scanPos)) {
                scanPos += 9;
                let { index } = this.readNotationExp(xmlData, scanPos + 1, this.suppressValidationErr);
                scanPos = index;
              } else {
                if (!hasSeq(xmlData, "!--", scanPos)) throw Error("Invalid DOCTYPE");
                comment = true;
              }
              angleBracketsCount++;
              exp = "";
            }
          if (angleBracketsCount !== 0) throw Error("Unclosed DOCTYPE");
        }
        return {
          entities,
          i: scanPos,
        };
      }
      readEntityExp(xmlData, scanPos) {
        let startIndex = (scanPos = skipWhitespace(xmlData, scanPos));
        for (
          ;
          scanPos < xmlData.length &&
          !/\s/.test(xmlData[scanPos]) &&
          xmlData[scanPos] !== '"' &&
          xmlData[scanPos] !== "'";
        )
          scanPos++;
        let entityName = xmlData.substring(startIndex, scanPos);
        validateEntityName(entityName);
        scanPos = skipWhitespace(xmlData, scanPos);
        if (!this.suppressValidationErr) {
          if (xmlData.substring(scanPos, scanPos + 6).toUpperCase() === "SYSTEM")
            throw Error("External entities are not supported");
          if (xmlData[scanPos] === "%") throw Error("Parameter entities are not supported");
        }
        let entityValue = "";
        [scanPos, entityValue] = this.readIdentifierVal(xmlData, scanPos, "entity");
        if (
          this.options.enabled !== false &&
          this.options.maxEntitySize != null &&
          entityValue.length > this.options.maxEntitySize
        )
          throw Error(
            `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`,
          );
        return [entityName, entityValue, --scanPos];
      }
      readNotationExp(xmlData, scanPos) {
        let startIndex = (scanPos = skipWhitespace(xmlData, scanPos));
        for (; scanPos < xmlData.length && !/\s/.test(xmlData[scanPos]);) scanPos++;
        let notationName = xmlData.substring(startIndex, scanPos);
        if (!this.suppressValidationErr) validateEntityName(notationName);
        scanPos = skipWhitespace(xmlData, scanPos);
        let identifierType = xmlData.substring(scanPos, scanPos + 6).toUpperCase();
        if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC")
          throw Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
        scanPos += identifierType.length;
        scanPos = skipWhitespace(xmlData, scanPos);
        let publicIdentifier = null;
        let systemIdentifier = null;
        if (identifierType === "PUBLIC") {
          [scanPos, publicIdentifier] = this.readIdentifierVal(xmlData, scanPos, "publicIdentifier");
          if (!(xmlData[(scanPos = skipWhitespace(xmlData, scanPos))] !== '"' && xmlData[scanPos] !== "'"))
            [scanPos, systemIdentifier] = this.readIdentifierVal(xmlData, scanPos, "systemIdentifier");
        } else if (
          identifierType === "SYSTEM" &&
          (([scanPos, systemIdentifier] = this.readIdentifierVal(xmlData, scanPos, "systemIdentifier")),
          !this.suppressValidationErr && !systemIdentifier)
        )
          throw Error("Missing mandatory system identifier for SYSTEM notation");
        return {
          notationName,
          publicIdentifier,
          systemIdentifier,
          index: --scanPos,
        };
      }
      readIdentifierVal(xmlData, scanPos, type) {
        let identifierVal = "";
        let startChar = xmlData[scanPos];
        if (startChar !== '"' && startChar !== "'")
          throw Error(`Expected quoted string, found "${startChar}"`);
        let startIndex = ++scanPos;
        for (; scanPos < xmlData.length && xmlData[scanPos] !== startChar;) scanPos++;
        identifierVal = xmlData.substring(startIndex, scanPos);
        if (xmlData[scanPos] !== startChar) throw Error(`Unterminated ${type} value`);
        return [++scanPos, identifierVal];
      }
      readElementExp(xmlData, scanPos) {
        let startIndex = (scanPos = skipWhitespace(xmlData, scanPos));
        for (; scanPos < xmlData.length && !/\s/.test(xmlData[scanPos]);) scanPos++;
        let elementName = xmlData.substring(startIndex, scanPos);
        if (!this.suppressValidationErr && !isName(elementName))
          throw Error(`Invalid element name: "${elementName}"`);
        let contentModel = "";
        if (xmlData[(scanPos = skipWhitespace(xmlData, scanPos))] === "E" && hasSeq(xmlData, "MPTY", scanPos))
          scanPos += 4;
        else if (xmlData[scanPos] === "A" && hasSeq(xmlData, "NY", scanPos)) scanPos += 2;
        else if (xmlData[scanPos] === "(") {
          let contentModelChars = ++scanPos;
          for (; scanPos < xmlData.length && xmlData[scanPos] !== ")";) scanPos++;
          contentModel = xmlData.substring(contentModelChars, scanPos);
          if (xmlData[scanPos] !== ")") throw Error("Unterminated content model");
        } else if (!this.suppressValidationErr)
          throw Error(`Invalid Element Expression, found "${xmlData[scanPos]}"`);
        return {
          elementName,
          contentModel: contentModel.trim(),
          index: scanPos,
        };
      }
      readAttlistExp(xmlData, scanPos) {
        let startIndex = (scanPos = skipWhitespace(xmlData, scanPos));
        for (; scanPos < xmlData.length && !/\s/.test(xmlData[scanPos]);) scanPos++;
        let elementName = xmlData.substring(startIndex, scanPos);
        for (
          validateEntityName(elementName), startIndex = scanPos = skipWhitespace(xmlData, scanPos);
          scanPos < xmlData.length && !/\s/.test(xmlData[scanPos]);
        )
          scanPos++;
        let attributeName = xmlData.substring(startIndex, scanPos);
        if (!validateEntityName(attributeName)) throw Error(`Invalid attribute name: "${attributeName}"`);
        scanPos = skipWhitespace(xmlData, scanPos);
        let attributeType = "";
        if (xmlData.substring(scanPos, scanPos + 8).toUpperCase() === "NOTATION") {
          attributeType = "NOTATION";
          if (xmlData[(scanPos = skipWhitespace(xmlData, (scanPos += 8)))] !== "(")
            throw Error(`Expected '(', found "${xmlData[scanPos]}"`);
          scanPos++;
          let allowedNotations = [];
          for (; scanPos < xmlData.length && xmlData[scanPos] !== ")";) {
            let notationStartIndex = scanPos;
            for (; scanPos < xmlData.length && xmlData[scanPos] !== "|" && xmlData[scanPos] !== ")";)
              scanPos++;
            let notation = xmlData.substring(notationStartIndex, scanPos);
            notation = notation.trim();
            if (!validateEntityName(notation)) throw Error(`Invalid notation name: "${notation}"`);
            allowedNotations.push(notation);
            if (xmlData[scanPos] === "|") {
              scanPos++;
              scanPos = skipWhitespace(xmlData, scanPos);
            }
          }
          if (xmlData[scanPos] !== ")") throw Error("Unterminated list of notations");
          scanPos++;
          attributeType += " (" + allowedNotations.join("|") + ")";
        } else {
          let startIndex = scanPos;
          for (; scanPos < xmlData.length && !/\s/.test(xmlData[scanPos]);) scanPos++;
          attributeType += xmlData.substring(startIndex, scanPos);
          let attributeTypes = [
            "CDATA",
            "ID",
            "IDREF",
            "IDREFS",
            "ENTITY",
            "ENTITIES",
            "NMTOKEN",
            "NMTOKENS",
          ];
          if (!this.suppressValidationErr && !attributeTypes.includes(attributeType.toUpperCase()))
            throw Error(`Invalid attribute type: "${attributeType}"`);
        }
        scanPos = skipWhitespace(xmlData, scanPos);
        let defaultValue = "";
        if (xmlData.substring(scanPos, scanPos + 8).toUpperCase() === "#REQUIRED") {
          defaultValue = "#REQUIRED";
          scanPos += 8;
        } else if (xmlData.substring(scanPos, scanPos + 7).toUpperCase() === "#IMPLIED") {
          defaultValue = "#IMPLIED";
          scanPos += 7;
        } else [scanPos, defaultValue] = this.readIdentifierVal(xmlData, scanPos, "ATTLIST");
        return {
          elementName,
          attributeName,
          attributeType,
          defaultValue,
          index: scanPos,
        };
      }
    }
    let skipWhitespace = (data, index) => {
      for (; index < data.length && /\s/.test(data[index]);) index++;
      return index;
    };
    function hasSeq(data, seq, i) {
      for (let j = 0; j < seq.length; j++) if (seq[j] !== data[i + j + 1]) return false;
      return true;
    }
    function validateEntityName(name) {
      if (isName(name)) return name;
      throw Error(`Invalid entity name ${name}`);
    }
    let hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
    let numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
    let consider = {
      hex: true,
      leadingZeros: true,
      decimalPoint: ".",
      eNotation: true,
      infinity: "original",
    };
    let eNotationRegx = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
    let MUTATING_METHODS = new Set(["push", "pop", "reset", "updateCurrent", "restore"]);
    class Matcher {
      constructor(options = {}) {
        this.separator = options.separator || ".";
        this.path = [];
        this.siblingStacks = [];
      }
      push(tagName, attrValues = null, namespace = null) {
        if (this.path.length > 0) this.path[this.path.length - 1].values = undefined;
        let currentLevel = this.path.length;
        if (!this.siblingStacks[currentLevel]) this.siblingStacks[currentLevel] = new Map();
        let siblings = this.siblingStacks[currentLevel];
        let siblingKey = namespace ? `${namespace}:${tagName}` : tagName;
        let counter = siblings.get(siblingKey) || 0;
        let position = 0;
        for (let count of siblings.values()) position += count;
        siblings.set(siblingKey, counter + 1);
        let node = {
          tag: tagName,
          position,
          counter,
        };
        if (namespace != null) node.namespace = namespace;
        if (attrValues != null) node.values = attrValues;
        this.path.push(node);
      }
      pop() {
        if (this.path.length === 0) return;
        let node = this.path.pop();
        if (this.siblingStacks.length > this.path.length + 1)
          this.siblingStacks.length = this.path.length + 1;
        return node;
      }
      updateCurrent(attrValues) {
        if (this.path.length > 0) {
          let current = this.path[this.path.length - 1];
          if (attrValues != null) current.values = attrValues;
        }
      }
      getCurrentTag() {
        return this.path.length > 0 ? this.path[this.path.length - 1].tag : undefined;
      }
      getCurrentNamespace() {
        return this.path.length > 0 ? this.path[this.path.length - 1].namespace : undefined;
      }
      getAttrValue(attrName) {
        if (this.path.length === 0) return;
        return this.path[this.path.length - 1].values?.[attrName];
      }
      hasAttr(attrName) {
        if (this.path.length === 0) return false;
        let current = this.path[this.path.length - 1];
        return current.values !== undefined && attrName in current.values;
      }
      getPosition() {
        return this.path.length === 0 ? -1 : (this.path[this.path.length - 1].position ?? 0);
      }
      getCounter() {
        return this.path.length === 0 ? -1 : (this.path[this.path.length - 1].counter ?? 0);
      }
      getIndex() {
        return this.getPosition();
      }
      getDepth() {
        return this.path.length;
      }
      toString(separator, includeNamespace = true) {
        let sep = separator || this.separator;
        return this.path
          .map((n) => (includeNamespace && n.namespace ? `${n.namespace}:${n.tag}` : n.tag))
          .join(sep);
      }
      toArray() {
        return this.path.map((node) => node.tag);
      }
      reset() {
        this.path = [];
        this.siblingStacks = [];
      }
      matches(expression) {
        let segments = expression.segments;
        return (
          segments.length !== 0 &&
          (expression.hasDeepWildcard() ? this._matchWithDeepWildcard(segments) : this._matchSimple(segments))
        );
      }
      _matchSimple(segments) {
        if (this.path.length !== segments.length) return false;
        for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
          let segment = segments[segmentIndex];
          let node = this.path[segmentIndex];
          let isCurrentNode = segmentIndex === this.path.length - 1;
          if (!this._matchSegment(segment, node, isCurrentNode)) return false;
        }
        return true;
      }
      _matchWithDeepWildcard(segments) {
        let pathIdx = this.path.length - 1;
        let segIdx = segments.length - 1;
        for (; segIdx >= 0 && pathIdx >= 0;) {
          let segment = segments[segIdx];
          if (segment.type === "deep-wildcard") {
            segIdx--;
            if (segIdx < 0) return true;
            let nextSeg = segments[segIdx];
            let found = false;
            for (let i = pathIdx; i >= 0; i--) {
              let isCurrentNode = i === this.path.length - 1;
              if (this._matchSegment(nextSeg, this.path[i], isCurrentNode)) {
                pathIdx = i - 1;
                segIdx--;
                found = true;
                break;
              }
            }
            if (!found) return false;
          } else {
            let isCurrentNode = pathIdx === this.path.length - 1;
            if (!this._matchSegment(segment, this.path[pathIdx], isCurrentNode)) return false;
            pathIdx--;
            segIdx--;
          }
        }
        return segIdx < 0;
      }
      _matchSegment(segment, node, isCurrentNode) {
        if (segment.tag !== "*" && segment.tag !== node.tag) return false;
        if (
          segment.namespace !== undefined &&
          segment.namespace !== "*" &&
          segment.namespace !== node.namespace
        )
          return false;
        if (segment.attrName !== undefined) {
          if (!isCurrentNode) return false;
          if (!node.values || !(segment.attrName in node.values)) return false;
          if (segment.attrValue !== undefined) {
            let actualValue = node.values[segment.attrName];
            if (String(actualValue) !== String(segment.attrValue)) return false;
          }
        }
        if (segment.position !== undefined) {
          if (!isCurrentNode) return false;
          let counter = node.counter ?? 0;
          if (segment.position === "first" && counter !== 0) return false;
          if (segment.position === "odd" && counter % 2 != 1) return false;
          if (segment.position === "even" && counter % 2 != 0) return false;
          if (segment.position === "nth" && counter !== segment.positionValue) return false;
        }
        return true;
      }
      snapshot() {
        return {
          path: this.path.map((node) => ({
            ...node,
          })),
          siblingStacks: this.siblingStacks.map((map) => new Map(map)),
        };
      }
      restore(snapshot) {
        this.path = snapshot.path.map((node) => ({
          ...node,
        }));
        this.siblingStacks = snapshot.siblingStacks.map((map) => new Map(map));
      }
      readOnly() {
        return new Proxy(this, {
          get(target, prop, receiver) {
            if (MUTATING_METHODS.has(prop))
              return () => {
                throw TypeError(
                  `Cannot call '${prop}' on a read-only Matcher. Obtain a writable instance to mutate state.`,
                );
              };
            let value = Reflect.get(target, prop, receiver);
            return prop === "path" || prop === "siblingStacks"
              ? Object.freeze(
                  Array.isArray(value)
                    ? value.map((item) =>
                        item instanceof Map
                          ? Object.freeze(new Map(item))
                          : Object.freeze({
                              ...item,
                            }),
                      )
                    : value,
                )
              : typeof value == "function"
                ? value.bind(target)
                : value;
          },
          set(_target, prop) {
            throw TypeError(`Cannot set property '${String(prop)}' on a read-only Matcher.`);
          },
          deleteProperty(_target, prop) {
            throw TypeError(`Cannot delete property '${String(prop)}' from a read-only Matcher.`);
          },
        });
      }
    }
    class Expression {
      constructor(pattern, options = {}) {
        this.pattern = pattern;
        this.separator = options.separator || ".";
        this.segments = this._parse(pattern);
        this._hasDeepWildcard = this.segments.some((seg) => seg.type === "deep-wildcard");
        this._hasAttributeCondition = this.segments.some((seg) => seg.attrName !== undefined);
        this._hasPositionSelector = this.segments.some((seg) => seg.position !== undefined);
      }
      _parse(pattern) {
        let segments = [];
        let i = 0;
        let currentPart = "";
        for (; i < pattern.length;)
          if (pattern[i] === this.separator) {
            if (i + 1 < pattern.length && pattern[i + 1] === this.separator) {
              if (currentPart.trim()) {
                segments.push(this._parseSegment(currentPart.trim()));
                currentPart = "";
              }
              segments.push({
                type: "deep-wildcard",
              });
              i += 2;
            } else {
              if (currentPart.trim()) segments.push(this._parseSegment(currentPart.trim()));
              currentPart = "";
              i++;
            }
          } else {
            currentPart += pattern[i];
            i++;
          }
        if (currentPart.trim()) segments.push(this._parseSegment(currentPart.trim()));
        return segments;
      }
      _parseSegment(part) {
        let segment = {
          type: "tag",
        };
        let bracketContent = null;
        let withoutBrackets = part;
        let bracketMatch = part.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);
        if (bracketMatch && ((withoutBrackets = bracketMatch[1] + bracketMatch[3]), bracketMatch[2])) {
          let content = bracketMatch[2].slice(1, -1);
          if (content) bracketContent = content;
        }
        let namespace;
        let tag;
        let tagAndPosition = withoutBrackets;
        if (withoutBrackets.includes("::")) {
          let nsIndex = withoutBrackets.indexOf("::");
          namespace = withoutBrackets.substring(0, nsIndex).trim();
          tagAndPosition = withoutBrackets.substring(nsIndex + 2).trim();
          if (!namespace) throw Error(`Invalid namespace in pattern: ${part}`);
        }
        let positionMatch = null;
        if (tagAndPosition.includes(":")) {
          let colonIndex = tagAndPosition.lastIndexOf(":");
          let tagPart = tagAndPosition.substring(0, colonIndex).trim();
          let posPart = tagAndPosition.substring(colonIndex + 1).trim();
          if (["first", "last", "odd", "even"].includes(posPart) || /^nth\(\d+\)$/.test(posPart)) {
            tag = tagPart;
            positionMatch = posPart;
          } else tag = tagAndPosition;
        } else tag = tagAndPosition;
        if (!tag) throw Error(`Invalid segment pattern: ${part}`);
        segment.tag = tag;
        if (namespace) segment.namespace = namespace;
        if (bracketContent)
          if (bracketContent.includes("=")) {
            let eqIndex = bracketContent.indexOf("=");
            segment.attrName = bracketContent.substring(0, eqIndex).trim();
            segment.attrValue = bracketContent.substring(eqIndex + 1).trim();
          } else segment.attrName = bracketContent.trim();
        if (positionMatch) {
          let nthMatch = positionMatch.match(/^nth\((\d+)\)$/);
          if (nthMatch) {
            segment.position = "nth";
            segment.positionValue = parseInt(nthMatch[1], 10);
          } else segment.position = positionMatch;
        }
        return segment;
      }
      get length() {
        return this.segments.length;
      }
      hasDeepWildcard() {
        return this._hasDeepWildcard;
      }
      hasAttributeCondition() {
        return this._hasAttributeCondition;
      }
      hasPositionSelector() {
        return this._hasPositionSelector;
      }
      toString() {
        return this.pattern;
      }
    }
    function extractRawAttributes(prefixedAttrs, options) {
      if (!prefixedAttrs) return {};
      let attrs = options.attributesGroupName ? prefixedAttrs[options.attributesGroupName] : prefixedAttrs;
      if (!attrs) return {};
      let rawAttrs = {};
      for (let key in attrs)
        if (key.startsWith(options.attributeNamePrefix))
          rawAttrs[key.substring(options.attributeNamePrefix.length)] = attrs[key];
        else rawAttrs[key] = attrs[key];
      return rawAttrs;
    }
    function extractNamespace(rawTagName) {
      if (!rawTagName || typeof rawTagName != "string") return;
      let colonIndex = rawTagName.indexOf(":");
      if (colonIndex !== -1 && colonIndex > 0) {
        let ns = rawTagName.substring(0, colonIndex);
        if (ns !== "xmlns") return ns;
      }
    }
    class OrderedObjParser {
      constructor(options) {
        var ignoreAttributes;
        this.options = options;
        this.currentNode = null;
        this.tagsNodeStack = [];
        this.docTypeEntities = {};
        this.lastEntities = {
          apos: {
            regex: /&(apos|#39|#x27);/g,
            val: "'",
          },
          gt: {
            regex: /&(gt|#62|#x3E);/g,
            val: ">",
          },
          lt: {
            regex: /&(lt|#60|#x3C);/g,
            val: "<",
          },
          quot: {
            regex: /&(quot|#34|#x22);/g,
            val: '"',
          },
        };
        this.ampEntity = {
          regex: /&(amp|#38|#x26);/g,
          val: "&",
        };
        this.htmlEntities = {
          space: {
            regex: /&(nbsp|#160);/g,
            val: " ",
          },
          cent: {
            regex: /&(cent|#162);/g,
            val: "\xA2",
          },
          pound: {
            regex: /&(pound|#163);/g,
            val: "\xA3",
          },
          yen: {
            regex: /&(yen|#165);/g,
            val: "\xA5",
          },
          euro: {
            regex: /&(euro|#8364);/g,
            val: "\u20AC",
          },
          copyright: {
            regex: /&(copy|#169);/g,
            val: "\xA9",
          },
          reg: {
            regex: /&(reg|#174);/g,
            val: "\xAE",
          },
          inr: {
            regex: /&(inr|#8377);/g,
            val: "\u20B9",
          },
          num_dec: {
            regex: /&#([0-9]{1,7});/g,
            val: (_, str) => fromCodePoint(str, 10, "&#"),
          },
          num_hex: {
            regex: /&#x([0-9a-fA-F]{1,6});/g,
            val: (_, str) => fromCodePoint(str, 16, "&#x"),
          },
        };
        this.addExternalEntities = addExternalEntities;
        this.parseXml = parseXml;
        this.parseTextData = parseTextData;
        this.resolveNameSpace = resolveNameSpace;
        this.buildAttributesMap = buildAttributesMap;
        this.isItStopNode = isItStopNode;
        this.replaceEntitiesValue = replaceEntitiesValue;
        this.readStopNodeData = readStopNodeData;
        this.saveTextToParentTag = saveTextToParentTag;
        this.addChild = addChild;
        this.ignoreAttributesFn =
          typeof (ignoreAttributes = this.options.ignoreAttributes) == "function"
            ? ignoreAttributes
            : Array.isArray(ignoreAttributes)
              ? (attrName) => {
                  for (let pattern of ignoreAttributes) {
                    if (typeof pattern == "string" && attrName === pattern) return true;
                    if (pattern instanceof RegExp && pattern.test(attrName)) return true;
                  }
                }
              : () => false;
        this.entityExpansionCount = 0;
        this.currentExpandedLength = 0;
        this.matcher = new Matcher();
        this.readonlyMatcher = this.matcher.readOnly();
        this.isCurrentNodeStopNode = false;
        if (this.options.stopNodes && this.options.stopNodes.length > 0) {
          this.stopNodeExpressions = [];
          for (let i = 0; i < this.options.stopNodes.length; i++) {
            let stopNodeExp = this.options.stopNodes[i];
            if (typeof stopNodeExp == "string") this.stopNodeExpressions.push(new Expression(stopNodeExp));
            else if (stopNodeExp instanceof Expression) this.stopNodeExpressions.push(stopNodeExp);
          }
        }
      }
    }
    function addExternalEntities(externalEntities) {
      let entKeys = Object.keys(externalEntities);
      for (let i = 0; i < entKeys.length; i++) {
        let ent = entKeys[i];
        let escaped = ent.replace(/[.\-+*:]/g, "\\.");
        this.lastEntities[ent] = {
          regex: new RegExp("&" + escaped + ";", "g"),
          val: externalEntities[ent],
        };
      }
    }
    function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
      if (val !== undefined && (this.options.trimValues && !dontTrim && (val = val.trim()), val.length > 0)) {
        if (!escapeEntities) val = this.replaceEntitiesValue(val, tagName, jPath);
        let jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
        let newval = this.options.tagValueProcessor(tagName, val, jPathOrMatcher, hasAttributes, isLeafNode);
        return newval == null
          ? val
          : typeof newval != typeof val || newval !== val
            ? newval
            : this.options.trimValues || val.trim() === val
              ? parseValue(val, this.options.parseTagValue, this.options.numberParseOptions)
              : val;
      }
    }
    function resolveNameSpace(tagname) {
      if (this.options.removeNSPrefix) {
        let tags = tagname.split(":");
        let prefix = tagname.charAt(0) === "/" ? "/" : "";
        if (tags[0] === "xmlns") return "";
        if (tags.length === 2) tagname = prefix + tags[1];
      }
      return tagname;
    }
    let attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
    function buildAttributesMap(attrStr, jPath, tagName) {
      if (this.options.ignoreAttributes !== true && typeof attrStr == "string") {
        let matches = getAllMatches(attrStr, attrsRegx);
        let len = matches.length;
        let attrs = {};
        let rawAttrsForMatcher = {};
        for (let i = 0; i < len; i++) {
          let attrName = this.resolveNameSpace(matches[i][1]);
          let oldVal = matches[i][4];
          if (attrName.length && oldVal !== undefined) {
            let parsedVal = oldVal;
            if (this.options.trimValues) parsedVal = parsedVal.trim();
            parsedVal = this.replaceEntitiesValue(parsedVal, tagName, this.readonlyMatcher);
            rawAttrsForMatcher[attrName] = parsedVal;
          }
        }
        if (Object.keys(rawAttrsForMatcher).length > 0 && typeof jPath == "object" && jPath.updateCurrent)
          jPath.updateCurrent(rawAttrsForMatcher);
        for (let i = 0; i < len; i++) {
          let attrName = this.resolveNameSpace(matches[i][1]);
          let jPathStr = this.options.jPath ? jPath.toString() : this.readonlyMatcher;
          if (this.ignoreAttributesFn(attrName, jPathStr)) continue;
          let oldVal = matches[i][4];
          let aName = this.options.attributeNamePrefix + attrName;
          if (attrName.length) {
            if (this.options.transformAttributeName) aName = this.options.transformAttributeName(aName);
            aName = sanitizeName(aName, this.options);
            if (oldVal !== undefined) {
              if (this.options.trimValues) oldVal = oldVal.trim();
              oldVal = this.replaceEntitiesValue(oldVal, tagName, this.readonlyMatcher);
              let jPathOrMatcher = this.options.jPath ? jPath.toString() : this.readonlyMatcher;
              let newVal = this.options.attributeValueProcessor(attrName, oldVal, jPathOrMatcher);
              attrs[aName] =
                newVal == null
                  ? oldVal
                  : typeof newVal != typeof oldVal || newVal !== oldVal
                    ? newVal
                    : parseValue(oldVal, this.options.parseAttributeValue, this.options.numberParseOptions);
            } else if (this.options.allowBooleanAttributes) attrs[aName] = true;
          }
        }
        if (!Object.keys(attrs).length) return;
        if (this.options.attributesGroupName) {
          let attrCollection = {};
          attrCollection[this.options.attributesGroupName] = attrs;
          return attrCollection;
        }
        return attrs;
      }
    }
    let parseXml = function (xmlData) {
      xmlData = xmlData.replace(
        /\r\n?/g,
        `
`,
      );
      let xmlObj = new XmlNode("!xml");
      let currentNode = xmlObj;
      let textData = "";
      this.matcher.reset();
      this.entityExpansionCount = 0;
      this.currentExpandedLength = 0;
      let docTypeReader = new DocTypeReader(this.options.processEntities);
      for (let i = 0; i < xmlData.length; i++)
        if (xmlData[i] === "<") {
          if (xmlData[i + 1] === "/") {
            let closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
            let tagName = xmlData.substring(i + 2, closeIndex).trim();
            if (this.options.removeNSPrefix) {
              let colonIndex = tagName.indexOf(":");
              if (colonIndex !== -1) tagName = tagName.substr(colonIndex + 1);
            }
            tagName = transformTagName(this.options.transformTagName, tagName, "", this.options).tagName;
            if (currentNode) textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
            let lastTagName = this.matcher.getCurrentTag();
            if (tagName && this.options.unpairedTags.indexOf(tagName) !== -1)
              throw Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
            if (lastTagName && this.options.unpairedTags.indexOf(lastTagName) !== -1) {
              this.matcher.pop();
              this.tagsNodeStack.pop();
            }
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
            currentNode = this.tagsNodeStack.pop();
            textData = "";
            i = closeIndex;
          } else if (xmlData[i + 1] === "?") {
            let tagData = readTagExp(xmlData, i, false, "?>");
            if (!tagData) throw Error("Pi Tag is not closed.");
            textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
            if ((this.options.ignoreDeclaration && tagData.tagName === "?xml") || this.options.ignorePiTags);
            else {
              let childNode = new XmlNode(tagData.tagName);
              childNode.add(this.options.textNodeName, "");
              if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent)
                childNode[":@"] = this.buildAttributesMap(tagData.tagExp, this.matcher, tagData.tagName);
              this.addChild(currentNode, childNode, this.readonlyMatcher, i);
            }
            i = tagData.closeIndex + 1;
          } else if (xmlData.substr(i + 1, 3) === "!--") {
            let endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
            if (this.options.commentPropName) {
              let comment = xmlData.substring(i + 4, endIndex - 2);
              textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
              currentNode.add(this.options.commentPropName, [
                {
                  [this.options.textNodeName]: comment,
                },
              ]);
            }
            i = endIndex;
          } else if (xmlData.substr(i + 1, 2) === "!D") {
            let result = docTypeReader.readDocType(xmlData, i);
            this.docTypeEntities = result.entities;
            i = result.i;
          } else if (xmlData.substr(i + 1, 2) === "![") {
            let closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
            let tagExp = xmlData.substring(i + 9, closeIndex);
            textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
            let val = this.parseTextData(
              tagExp,
              currentNode.tagname,
              this.readonlyMatcher,
              true,
              false,
              true,
              true,
            );
            if (val == null) val = "";
            if (this.options.cdataPropName)
              currentNode.add(this.options.cdataPropName, [
                {
                  [this.options.textNodeName]: tagExp,
                },
              ]);
            else currentNode.add(this.options.textNodeName, val);
            i = closeIndex + 2;
          } else {
            let tagExp = readTagExp(xmlData, i, this.options.removeNSPrefix);
            if (!tagExp) {
              let context = xmlData.substring(Math.max(0, i - 50), Math.min(xmlData.length, i + 50));
              throw Error(`readTagExp returned undefined at position ${i}. Context: "${context}"`);
            }
            let { tagName, rawTagName, tagExp: tagExp_2, attrExpPresent, closeIndex } = tagExp;
            ({ tagName, tagExp: tagExp_2 } = transformTagName(
              this.options.transformTagName,
              tagName,
              tagExp_2,
              this.options,
            ));
            if (
              this.options.strictReservedNames &&
              (tagName === this.options.commentPropName ||
                tagName === this.options.cdataPropName ||
                tagName === this.options.textNodeName ||
                tagName === this.options.attributesGroupName)
            )
              throw Error(`Invalid tag name: ${tagName}`);
            if (currentNode && textData && currentNode.tagname !== "!xml")
              textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher, false);
            let lastTag = currentNode;
            if (lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1) {
              currentNode = this.tagsNodeStack.pop();
              this.matcher.pop();
            }
            let isSelfClosing = false;
            if (tagExp_2.length > 0 && tagExp_2.lastIndexOf("/") === tagExp_2.length - 1) {
              isSelfClosing = true;
              if (tagName[tagName.length - 1] === "/") {
                tagName = tagName.substr(0, tagName.length - 1);
                tagExp_2 = tagName;
              } else tagExp_2 = tagExp_2.substr(0, tagExp_2.length - 1);
              attrExpPresent = tagName !== tagExp_2;
            }
            let namespace;
            let prefixedAttrs = null;
            let newObj = {};
            namespace = extractNamespace(rawTagName);
            if (tagName !== xmlObj.tagname) this.matcher.push(tagName, {}, namespace);
            if (tagName !== tagExp_2 && attrExpPresent) {
              prefixedAttrs = this.buildAttributesMap(tagExp_2, this.matcher, tagName);
              if (prefixedAttrs) newObj = extractRawAttributes(prefixedAttrs, this.options);
            }
            if (tagName !== xmlObj.tagname)
              this.isCurrentNodeStopNode = this.isItStopNode(this.stopNodeExpressions, this.matcher);
            let startIndex = i;
            if (this.isCurrentNodeStopNode) {
              let tagContent = "";
              if (isSelfClosing) i = tagExp.closeIndex;
              else if (this.options.unpairedTags.indexOf(tagName) !== -1) i = tagExp.closeIndex;
              else {
                let result = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
                if (!result) throw Error(`Unexpected end of ${rawTagName}`);
                i = result.i;
                tagContent = result.tagContent;
              }
              let childNode = new XmlNode(tagName);
              if (prefixedAttrs) childNode[":@"] = prefixedAttrs;
              childNode.add(this.options.textNodeName, tagContent);
              this.matcher.pop();
              this.isCurrentNodeStopNode = false;
              this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            } else {
              if (isSelfClosing) {
                ({ tagName, tagExp: tagExp_2 } = transformTagName(
                  this.options.transformTagName,
                  tagName,
                  tagExp_2,
                  this.options,
                ));
                let childNode = new XmlNode(tagName);
                if (prefixedAttrs) childNode[":@"] = prefixedAttrs;
                this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
                this.matcher.pop();
                this.isCurrentNodeStopNode = false;
              } else {
                if (this.options.unpairedTags.indexOf(tagName) !== -1) {
                  let childNode = new XmlNode(tagName);
                  if (prefixedAttrs) childNode[":@"] = prefixedAttrs;
                  this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
                  this.matcher.pop();
                  this.isCurrentNodeStopNode = false;
                  i = tagExp.closeIndex;
                  continue;
                }
                {
                  let childNode = new XmlNode(tagName);
                  if (this.tagsNodeStack.length > this.options.maxNestedTags)
                    throw Error("Maximum nested tags exceeded");
                  this.tagsNodeStack.push(currentNode);
                  if (prefixedAttrs) childNode[":@"] = prefixedAttrs;
                  this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
                  currentNode = childNode;
                }
              }
              textData = "";
              i = closeIndex;
            }
          }
        } else textData += xmlData[i];
      return xmlObj.child;
    };
    function addChild(currentNode, childNode, matcher, startIndex) {
      if (!this.options.captureMetaData) startIndex = undefined;
      let jPathOrMatcher = this.options.jPath ? matcher.toString() : matcher;
      let result = this.options.updateTag(childNode.tagname, jPathOrMatcher, childNode[":@"]);
      if (!(result === false)) {
        if (typeof result == "string") {
          childNode.tagname = result;
          currentNode.addChild(childNode, startIndex);
        } else currentNode.addChild(childNode, startIndex);
      }
    }
    function replaceEntitiesValue(val, tagName, jPath) {
      let entityConfig = this.options.processEntities;
      if (!entityConfig || !entityConfig.enabled) return val;
      if (entityConfig.allowedTags) {
        let jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
        if (
          !(Array.isArray(entityConfig.allowedTags)
            ? entityConfig.allowedTags.includes(tagName)
            : entityConfig.allowedTags(tagName, jPathOrMatcher))
        )
          return val;
      }
      if (entityConfig.tagFilter) {
        let jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
        if (!entityConfig.tagFilter(tagName, jPathOrMatcher)) return val;
      }
      for (let key of Object.keys(this.docTypeEntities)) {
        let entity = this.docTypeEntities[key];
        let matches = val.match(entity.regx);
        if (matches) {
          this.entityExpansionCount += matches.length;
          if (entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions)
            throw Error(
              `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`,
            );
          let lengthBefore = val.length;
          val = val.replace(entity.regx, entity.val);
          if (
            entityConfig.maxExpandedLength &&
            ((this.currentExpandedLength += val.length - lengthBefore),
            this.currentExpandedLength > entityConfig.maxExpandedLength)
          )
            throw Error(
              `Total expanded content size exceeded: ${this.currentExpandedLength} > ${entityConfig.maxExpandedLength}`,
            );
        }
      }
      for (let key of Object.keys(this.lastEntities)) {
        let entity = this.lastEntities[key];
        let matches = val.match(entity.regex);
        if (
          matches &&
          ((this.entityExpansionCount += matches.length),
          entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions)
        )
          throw Error(
            `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`,
          );
        val = val.replace(entity.regex, entity.val);
      }
      if (val.indexOf("&") === -1) return val;
      if (this.options.htmlEntities)
        for (let key of Object.keys(this.htmlEntities)) {
          let entity = this.htmlEntities[key];
          let matches = val.match(entity.regex);
          if (
            matches &&
            ((this.entityExpansionCount += matches.length),
            entityConfig.maxTotalExpansions && this.entityExpansionCount > entityConfig.maxTotalExpansions)
          )
            throw Error(
              `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${entityConfig.maxTotalExpansions}`,
            );
          val = val.replace(entity.regex, entity.val);
        }
      return val.replace(this.ampEntity.regex, this.ampEntity.val);
    }
    function saveTextToParentTag(textData, parentNode, matcher, isLeafNode) {
      if (textData) {
        if (isLeafNode === undefined) isLeafNode = parentNode.child.length === 0;
        if (
          (textData = this.parseTextData(
            textData,
            parentNode.tagname,
            matcher,
            false,
            !!parentNode[":@"] && Object.keys(parentNode[":@"]).length !== 0,
            isLeafNode,
          )) !== undefined &&
          textData !== ""
        )
          parentNode.add(this.options.textNodeName, textData);
        textData = "";
      }
      return textData;
    }
    function isItStopNode(stopNodeExpressions, matcher) {
      if (!stopNodeExpressions || stopNodeExpressions.length === 0) return false;
      for (let i = 0; i < stopNodeExpressions.length; i++)
        if (matcher.matches(stopNodeExpressions[i])) return true;
      return false;
    }
    function findClosingIndex(xmlData, str, i, errMsg) {
      let closingIndex = xmlData.indexOf(str, i);
      if (closingIndex === -1) throw Error(errMsg);
      return closingIndex + str.length - 1;
    }
    function readTagExp(xmlData, startIndex, removeNSPrefix, closingChar = ">") {
      let result = (function (xmlData, i, closingChar = ">") {
        let attrBoundary;
        let tagExp = "";
        for (let index = i; index < xmlData.length; index++) {
          let ch = xmlData[index];
          if (attrBoundary) {
            if (ch === attrBoundary) attrBoundary = "";
          } else if (ch === '"' || ch === "'") attrBoundary = ch;
          else if (ch === closingChar[0]) {
            if (!closingChar[1])
              return {
                data: tagExp,
                index,
              };
            if (xmlData[index + 1] === closingChar[1])
              return {
                data: tagExp,
                index,
              };
          } else if (ch === "\t") ch = " ";
          tagExp += ch;
        }
      })(xmlData, startIndex + 1, closingChar);
      if (!result) return;
      let { data: tagExp, index } = result;
      let separatorIndex = tagExp.search(/\s/);
      let tagName = tagExp;
      let attrExpPresent = true;
      if (separatorIndex !== -1) {
        tagName = tagExp.substring(0, separatorIndex);
        tagExp = tagExp.substring(separatorIndex + 1).trimStart();
      }
      let rawTagName = tagName;
      if (removeNSPrefix) {
        let colonIndex = tagName.indexOf(":");
        if (colonIndex !== -1) {
          tagName = tagName.substr(colonIndex + 1);
          attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
        }
      }
      return {
        tagName,
        tagExp,
        closeIndex: index,
        attrExpPresent,
        rawTagName,
      };
    }
    function readStopNodeData(xmlData, tagName, i) {
      let startIndex = i;
      let openTagCount = 1;
      for (; i < xmlData.length; i++)
        if (xmlData[i] === "<")
          if (xmlData[i + 1] === "/") {
            let closeIndex = findClosingIndex(xmlData, ">", i, `${tagName} is not closed`);
            if (
              xmlData.substring(i + 2, closeIndex).trim() === tagName &&
              (openTagCount--, openTagCount === 0)
            )
              return {
                tagContent: xmlData.substring(startIndex, i),
                i: closeIndex,
              };
            i = closeIndex;
          } else if (xmlData[i + 1] === "?")
            i = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
          else if (xmlData.substr(i + 1, 3) === "!--")
            i = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
          else if (xmlData.substr(i + 1, 2) === "![")
            i = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
          else {
            let tagData = readTagExp(xmlData, i, ">");
            if (tagData) {
              if (
                (tagData && tagData.tagName) === tagName &&
                tagData.tagExp[tagData.tagExp.length - 1] !== "/"
              )
                openTagCount++;
              i = tagData.closeIndex;
            }
          }
    }
    function parseValue(val, shouldParse, options) {
      if (shouldParse && typeof val == "string") {
        let trimmed = val.trim();
        return (
          trimmed === "true" ||
          (trimmed !== "false" &&
            (function (str, options = {}) {
              options = Object.assign({}, consider, options);
              if (!str || typeof str != "string") return str;
              let trimmedStr = str.trim();
              if (options.skipLike !== undefined && options.skipLike.test(trimmedStr)) return str;
              if (str === "0") return 0;
              if (options.hex && hexRegex.test(trimmedStr))
                return (function (numStr) {
                  if (parseInt) return parseInt(numStr, 16);
                  if (Number.parseInt) return Number.parseInt(numStr, 16);
                  if (window && window.parseInt) return window.parseInt(numStr, 16);
                  throw Error("parseInt, Number.parseInt, window.parseInt are not supported");
                })(trimmedStr);
              if (isFinite(trimmedStr)) {
                if (trimmedStr.includes("e") || trimmedStr.includes("E"))
                  return (function (str, trimmedStr, options) {
                    if (!options.eNotation) return str;
                    let notation = trimmedStr.match(eNotationRegx);
                    if (notation) {
                      let sign = notation[1] || "";
                      let eChar = notation[3].indexOf("e") === -1 ? "E" : "e";
                      let leadingZeros = notation[2];
                      let eAdjacentToLeadingZeros = sign
                        ? str[leadingZeros.length + 1] === eChar
                        : str[leadingZeros.length] === eChar;
                      return leadingZeros.length > 1 && eAdjacentToLeadingZeros
                        ? str
                        : (leadingZeros.length !== 1 ||
                              (!notation[3].startsWith(`.${eChar}`) && notation[3][0] !== eChar)) &&
                            leadingZeros.length > 0
                          ? options.leadingZeros && !eAdjacentToLeadingZeros
                            ? ((trimmedStr = (notation[1] || "") + notation[3]), Number(trimmedStr))
                            : str
                          : Number(trimmedStr);
                    }
                    return str;
                  })(str, trimmedStr, options);
                {
                  let match = numRegex.exec(trimmedStr);
                  if (match) {
                    let sign = match[1] || "";
                    let leadingZeros = match[2];
                    let numTrimmedByZeros =
                      (numStr = match[3]) && numStr.indexOf(".") !== -1
                        ? ((numStr = numStr.replace(/0+$/, "")) === "."
                            ? (numStr = "0")
                            : numStr[0] === "."
                              ? (numStr = "0" + numStr)
                              : numStr[numStr.length - 1] === "." &&
                                (numStr = numStr.substring(0, numStr.length - 1)),
                          numStr)
                        : numStr;
                    let decimalAdjacentToLeadingZeros = sign
                      ? str[leadingZeros.length + 1] === "."
                      : str[leadingZeros.length] === ".";
                    if (
                      !options.leadingZeros &&
                      (leadingZeros.length > 1 ||
                        (leadingZeros.length === 1 && !decimalAdjacentToLeadingZeros))
                    )
                      return str;
                    {
                      let num = Number(trimmedStr);
                      let parsedStr = String(num);
                      if (num === 0) return num;
                      if (parsedStr.search(/[eE]/) !== -1) return options.eNotation ? num : str;
                      if (trimmedStr.indexOf(".") !== -1)
                        return parsedStr === "0" ||
                          parsedStr === numTrimmedByZeros ||
                          parsedStr === `${sign}${numTrimmedByZeros}`
                          ? num
                          : str;
                      let n = leadingZeros ? numTrimmedByZeros : trimmedStr;
                      return leadingZeros
                        ? n === parsedStr || sign + n === parsedStr
                          ? num
                          : str
                        : n === parsedStr || n === sign + parsedStr
                          ? num
                          : str;
                    }
                  }
                  return str;
                }
              }
              var numStr;
              return (function (str, num, options) {
                let isPositive = num === 1 / 0;
                switch (options.infinity.toLowerCase()) {
                  case "null":
                    return null;
                  case "infinity":
                    return num;
                  case "string":
                    return isPositive ? "Infinity" : "-Infinity";
                  default:
                    return str;
                }
              })(str, Number(trimmedStr), options);
            })(val, options))
        );
      }
      return val !== undefined ? val : "";
    }
    function fromCodePoint(str, base, prefix) {
      let codePoint = Number.parseInt(str, base);
      return codePoint >= 0 && codePoint <= 1114111 ? String.fromCodePoint(codePoint) : prefix + str + ";";
    }
    function transformTagName(fn, tagName, tagExp, options) {
      if (fn) {
        let newTagName = fn(tagName);
        if (tagExp === tagName) tagExp = newTagName;
        tagName = newTagName;
      }
      return {
        tagName: (tagName = sanitizeName(tagName, options)),
        tagExp,
      };
    }
    function sanitizeName(name, options) {
      if (criticalProperties.includes(name))
        throw Error(
          `[SECURITY] Invalid name: "${name}" is a reserved JavaScript keyword that could cause prototype pollution`,
        );
      return DANGEROUS_PROPERTY_NAMES.includes(name) ? options.onDangerousProperty(name) : name;
    }
    let METADATA_SYMBOL_2 = XmlNode.getMetaDataSymbol();
    function stripAttributePrefix(attrs, prefix) {
      if (!attrs || typeof attrs != "object") return {};
      if (!prefix) return attrs;
      let rawAttrs = {};
      for (let key in attrs)
        if (key.startsWith(prefix)) rawAttrs[key.substring(prefix.length)] = attrs[key];
        else rawAttrs[key] = attrs[key];
      return rawAttrs;
    }
    function prettify(node, options, matcher, readonlyMatcher) {
      return compress(node, options, matcher, readonlyMatcher);
    }
    function compress(arr, options, matcher, readonlyMatcher) {
      let text;
      let compressedObj = {};
      for (let i = 0; i < arr.length; i++) {
        let tagObj = arr[i];
        let property = propName(tagObj);
        if (property !== undefined && property !== options.textNodeName) {
          let rawAttrs = stripAttributePrefix(tagObj[":@"] || {}, options.attributeNamePrefix);
          matcher.push(property, rawAttrs);
        }
        if (property === options.textNodeName) {
          if (text === undefined) text = tagObj[property];
          else text += "" + tagObj[property];
        } else {
          if (property === undefined) continue;
          if (tagObj[property]) {
            let val = compress(tagObj[property], options, matcher, readonlyMatcher);
            let isLeaf = isLeafTag(val, options);
            if (tagObj[":@"]) assignAttributes(val, tagObj[":@"], readonlyMatcher, options);
            else if (
              Object.keys(val).length !== 1 ||
              val[options.textNodeName] === undefined ||
              options.alwaysCreateTextNode
            ) {
              if (Object.keys(val).length === 0) {
                if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
                else val = "";
              }
            } else val = val[options.textNodeName];
            if (tagObj[METADATA_SYMBOL_2] !== undefined && typeof val == "object" && val !== null)
              val[METADATA_SYMBOL_2] = tagObj[METADATA_SYMBOL_2];
            if (
              compressedObj[property] !== undefined &&
              Object.prototype.hasOwnProperty.call(compressedObj, property)
            ) {
              if (!Array.isArray(compressedObj[property]))
                compressedObj[property] = [compressedObj[property]];
              compressedObj[property].push(val);
            } else {
              let jPathOrMatcher = options.jPath ? readonlyMatcher.toString() : readonlyMatcher;
              if (options.isArray(property, jPathOrMatcher, isLeaf)) compressedObj[property] = [val];
              else compressedObj[property] = val;
            }
            if (property !== undefined && property !== options.textNodeName) matcher.pop();
          }
        }
      }
      if (typeof text == "string") {
        if (text.length > 0) compressedObj[options.textNodeName] = text;
      } else if (text !== undefined) compressedObj[options.textNodeName] = text;
      return compressedObj;
    }
    function propName(obj) {
      let keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (key !== ":@") return key;
      }
    }
    function assignAttributes(obj, attrMap, readonlyMatcher, options) {
      if (attrMap) {
        let keys = Object.keys(attrMap);
        let len = keys.length;
        for (let i = 0; i < len; i++) {
          let atrrName = keys[i];
          let rawAttrName = atrrName.startsWith(options.attributeNamePrefix)
            ? atrrName.substring(options.attributeNamePrefix.length)
            : atrrName;
          let jPathOrMatcher = options.jPath
            ? readonlyMatcher.toString() + "." + rawAttrName
            : readonlyMatcher;
          if (options.isArray(atrrName, jPathOrMatcher, true, true)) obj[atrrName] = [attrMap[atrrName]];
          else obj[atrrName] = attrMap[atrrName];
        }
      }
    }
    function isLeafTag(obj, options) {
      let { textNodeName } = options;
      let keysLength = Object.keys(obj).length;
      return (
        keysLength === 0 ||
        !(
          keysLength !== 1 ||
          (!obj[textNodeName] && typeof obj[textNodeName] != "boolean" && obj[textNodeName] !== 0)
        )
      );
    }
    class XMLParser {
      constructor(options) {
        this.externalEntities = {};
        this.options = buildOptions(options);
      }
      parse(xmlData, validationOption) {
        if (typeof xmlData != "string" && xmlData.toString) xmlData = xmlData.toString();
        else if (typeof xmlData != "string") throw Error("XML data is accepted in String or Bytes[] form.");
        if (validationOption) {
          if (validationOption === true) validationOption = {};
          let result = validate(xmlData, validationOption);
          if (result !== true) throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
        }
        let orderedObjParser = new OrderedObjParser(this.options);
        orderedObjParser.addExternalEntities(this.externalEntities);
        let orderedResult = orderedObjParser.parseXml(xmlData);
        return this.options.preserveOrder || orderedResult === undefined
          ? orderedResult
          : prettify(orderedResult, this.options, orderedObjParser.matcher, orderedObjParser.readonlyMatcher);
      }
      addEntity(key, value) {
        if (value.indexOf("&") !== -1) throw Error("Entity value can't have '&'");
        if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1)
          throw Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
        if (value === "&") throw Error("An entity with value '&' is not permitted");
        this.externalEntities[key] = value;
      }
      static getMetaDataSymbol() {
        return XmlNode.getMetaDataSymbol();
      }
    }
    function toXml(jArray, options) {
      let indentation = "";
      if (options.format && options.indentBy.length > 0)
        indentation = `
`;
      let stopNodeExpressions = [];
      if (options.stopNodes && Array.isArray(options.stopNodes))
        for (let i = 0; i < options.stopNodes.length; i++) {
          let node = options.stopNodes[i];
          if (typeof node == "string") stopNodeExpressions.push(new Expression(node));
          else if (node instanceof Expression) stopNodeExpressions.push(node);
        }
      return arrToStr(jArray, options, indentation, new Matcher(), stopNodeExpressions);
    }
    function arrToStr(arr, options, indentation, matcher, stopNodeExpressions) {
      let xmlStr = "";
      let isPreviousElementTag = false;
      if (options.maxNestedTags && matcher.getDepth() > options.maxNestedTags)
        throw Error("Maximum nested tags exceeded");
      if (!Array.isArray(arr)) {
        if (arr != null) {
          let text = arr.toString();
          text = replaceEntitiesValue_2(text, options);
          return text;
        }
        return "";
      }
      for (let i = 0; i < arr.length; i++) {
        let tagObj = arr[i];
        let tagName = propName_2(tagObj);
        if (tagName === undefined) continue;
        let attrValues = extractAttributeValues(tagObj[":@"], options);
        matcher.push(tagName, attrValues);
        let isStopNode = checkStopNode(matcher, stopNodeExpressions);
        if (tagName === options.textNodeName) {
          let tagText = tagObj[tagName];
          if (!isStopNode) {
            tagText = options.tagValueProcessor(tagName, tagText);
            tagText = replaceEntitiesValue_2(tagText, options);
          }
          if (isPreviousElementTag) xmlStr += indentation;
          xmlStr += tagText;
          isPreviousElementTag = false;
          matcher.pop();
          continue;
        }
        if (tagName === options.cdataPropName) {
          if (isPreviousElementTag) xmlStr += indentation;
          xmlStr += `<![CDATA[${tagObj[tagName][0][options.textNodeName]}]]>`;
          isPreviousElementTag = false;
          matcher.pop();
          continue;
        }
        if (tagName === options.commentPropName) {
          xmlStr += indentation + `<!--${tagObj[tagName][0][options.textNodeName]}-->`;
          isPreviousElementTag = true;
          matcher.pop();
          continue;
        }
        if (tagName[0] === "?") {
          let attStr = attr_to_str(tagObj[":@"], options, isStopNode);
          let tempInd = tagName === "?xml" ? "" : indentation;
          let piTextNodeName = tagObj[tagName][0][options.textNodeName];
          piTextNodeName = piTextNodeName.length !== 0 ? " " + piTextNodeName : "";
          xmlStr += tempInd + `<${tagName}${piTextNodeName}${attStr}?>`;
          isPreviousElementTag = true;
          matcher.pop();
          continue;
        }
        let newIdentation = indentation;
        if (newIdentation !== "") newIdentation += options.indentBy;
        let tagStart = indentation + `<${tagName}${attr_to_str(tagObj[":@"], options, isStopNode)}`;
        let tagValue;
        tagValue = isStopNode
          ? getRawContent(tagObj[tagName], options)
          : arrToStr(tagObj[tagName], options, newIdentation, matcher, stopNodeExpressions);
        if (options.unpairedTags.indexOf(tagName) !== -1) {
          if (options.suppressUnpairedNode) xmlStr += tagStart + ">";
          else xmlStr += tagStart + "/>";
        } else if ((tagValue && tagValue.length !== 0) || !options.suppressEmptyNode) {
          if (tagValue && tagValue.endsWith(">"))
            xmlStr += tagStart + `>${tagValue}${indentation}</${tagName}>`;
          else {
            xmlStr += tagStart + ">";
            if (tagValue && indentation !== "" && (tagValue.includes("/>") || tagValue.includes("</")))
              xmlStr += indentation + options.indentBy + tagValue + indentation;
            else xmlStr += tagValue;
            xmlStr += `</${tagName}>`;
          }
        } else xmlStr += tagStart + "/>";
        isPreviousElementTag = true;
        matcher.pop();
      }
      return xmlStr;
    }
    function extractAttributeValues(attrMap, options) {
      if (!attrMap || options.ignoreAttributes) return null;
      let attrValues = {};
      let hasAttrs = false;
      for (let attr in attrMap)
        if (Object.prototype.hasOwnProperty.call(attrMap, attr)) {
          attrValues[
            attr.startsWith(options.attributeNamePrefix)
              ? attr.substr(options.attributeNamePrefix.length)
              : attr
          ] = attrMap[attr];
          hasAttrs = true;
        }
      return hasAttrs ? attrValues : null;
    }
    function getRawContent(arr, options) {
      if (!Array.isArray(arr)) return arr != null ? arr.toString() : "";
      let content = "";
      for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        let tagName = propName_2(item);
        if (tagName === options.textNodeName) content += item[tagName];
        else if (tagName === options.cdataPropName) content += item[tagName][0][options.textNodeName];
        else if (tagName === options.commentPropName) content += item[tagName][0][options.textNodeName];
        else {
          if (tagName && tagName[0] === "?") continue;
          if (tagName) {
            let attStr = attr_to_str_raw(item[":@"], options);
            let nestedContent = getRawContent(item[tagName], options);
            if (nestedContent && nestedContent.length !== 0)
              content += `<${tagName}${attStr}>${nestedContent}</${tagName}>`;
            else content += `<${tagName}${attStr}/>`;
          }
        }
      }
      return content;
    }
    function attr_to_str_raw(attrMap, options) {
      let attrStr = "";
      if (attrMap && !options.ignoreAttributes)
        for (let attr in attrMap) {
          if (!Object.prototype.hasOwnProperty.call(attrMap, attr)) continue;
          let attrVal = attrMap[attr];
          if (attrVal === true && options.suppressBooleanAttributes)
            attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}`;
          else attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}="${attrVal}"`;
        }
      return attrStr;
    }
    function propName_2(obj) {
      let keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (Object.prototype.hasOwnProperty.call(obj, key) && key !== ":@") return key;
      }
    }
    function attr_to_str(attrMap, options, isStopNode) {
      let attrStr = "";
      if (attrMap && !options.ignoreAttributes)
        for (let attr in attrMap) {
          if (!Object.prototype.hasOwnProperty.call(attrMap, attr)) continue;
          let attrVal;
          if (isStopNode) attrVal = attrMap[attr];
          else {
            attrVal = options.attributeValueProcessor(attr, attrMap[attr]);
            attrVal = replaceEntitiesValue_2(attrVal, options);
          }
          if (attrVal === true && options.suppressBooleanAttributes)
            attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}`;
          else attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}="${attrVal}"`;
        }
      return attrStr;
    }
    function checkStopNode(matcher, stopNodeExpressions) {
      if (!stopNodeExpressions || stopNodeExpressions.length === 0) return false;
      for (let i = 0; i < stopNodeExpressions.length; i++)
        if (matcher.matches(stopNodeExpressions[i])) return true;
      return false;
    }
    function replaceEntitiesValue_2(textValue, options) {
      if (textValue && textValue.length > 0 && options.processEntities)
        for (let i = 0; i < options.entities.length; i++) {
          let entity = options.entities[i];
          textValue = textValue.replace(entity.regex, entity.val);
        }
      return textValue;
    }
    let defaultOptions_3 = {
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      textNodeName: "#text",
      ignoreAttributes: true,
      cdataPropName: false,
      format: false,
      indentBy: "  ",
      suppressEmptyNode: false,
      suppressUnpairedNode: true,
      suppressBooleanAttributes: true,
      tagValueProcessor: function (key, a) {
        return a;
      },
      attributeValueProcessor: function (attrName, a) {
        return a;
      },
      preserveOrder: false,
      commentPropName: false,
      unpairedTags: [],
      entities: [
        {
          regex: new RegExp("&", "g"),
          val: "&amp;",
        },
        {
          regex: new RegExp(">", "g"),
          val: "&gt;",
        },
        {
          regex: new RegExp("<", "g"),
          val: "&lt;",
        },
        {
          regex: new RegExp("'", "g"),
          val: "&apos;",
        },
        {
          regex: new RegExp('"', "g"),
          val: "&quot;",
        },
      ],
      processEntities: true,
      stopNodes: [],
      oneListGroup: false,
      maxNestedTags: 100,
      jPath: true,
    };
    function Builder(options) {
      this.options = Object.assign({}, defaultOptions_3, options);
      if (this.options.stopNodes && Array.isArray(this.options.stopNodes))
        this.options.stopNodes = this.options.stopNodes.map((node) =>
          typeof node == "string" && node.startsWith("*.") ? ".." + node.substring(2) : node,
        );
      this.stopNodeExpressions = [];
      if (this.options.stopNodes && Array.isArray(this.options.stopNodes))
        for (let i = 0; i < this.options.stopNodes.length; i++) {
          let node = this.options.stopNodes[i];
          if (typeof node == "string") this.stopNodeExpressions.push(new Expression(node));
          else if (node instanceof Expression) this.stopNodeExpressions.push(node);
        }
      var ignoreAttributes;
      if (this.options.ignoreAttributes === true || this.options.attributesGroupName)
        this.isAttribute = function () {
          return false;
        };
      else {
        this.ignoreAttributesFn =
          typeof (ignoreAttributes = this.options.ignoreAttributes) == "function"
            ? ignoreAttributes
            : Array.isArray(ignoreAttributes)
              ? (attrName) => {
                  for (let pattern of ignoreAttributes) {
                    if (typeof pattern == "string" && attrName === pattern) return true;
                    if (pattern instanceof RegExp && pattern.test(attrName)) return true;
                  }
                }
              : () => false;
        this.attrPrefixLen = this.options.attributeNamePrefix.length;
        this.isAttribute = isAttribute;
      }
      this.processTextOrObjNode = processTextOrObjNode;
      if (this.options.format) {
        this.indentate = indentate;
        this.tagEndChar = `>
`;
        this.newLine = `
`;
      } else {
        this.indentate = function () {
          return "";
        };
        this.tagEndChar = ">";
        this.newLine = "";
      }
    }
    function processTextOrObjNode(object, key, level, matcher) {
      let attrValues = this.extractAttributes(object);
      matcher.push(key, attrValues);
      if (this.checkStopNode(matcher)) {
        let rawContent = this.buildRawContent(object);
        let attrStr = this.buildAttributesForStopNode(object);
        matcher.pop();
        return this.buildObjectNode(rawContent, key, attrStr, level);
      }
      let result = this.j2x(object, level + 1, matcher);
      matcher.pop();
      return object[this.options.textNodeName] !== undefined && Object.keys(object).length === 1
        ? this.buildTextValNode(object[this.options.textNodeName], key, result.attrStr, level, matcher)
        : this.buildObjectNode(result.val, key, result.attrStr, level);
    }
    function indentate(level) {
      return this.options.indentBy.repeat(level);
    }
    function isAttribute(name) {
      return (
        !(!name.startsWith(this.options.attributeNamePrefix) || name === this.options.textNodeName) &&
        name.substr(this.attrPrefixLen)
      );
    }
    Builder.prototype.build = function (jObj) {
      if (this.options.preserveOrder) return toXml(jObj, this.options);
      {
        if (Array.isArray(jObj) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1)
          jObj = {
            [this.options.arrayNodeName]: jObj,
          };
        let matcher = new Matcher();
        return this.j2x(jObj, 0, matcher).val;
      }
    };
    Builder.prototype.j2x = function (jObj, level, matcher) {
      let attrStr = "";
      let val = "";
      if (this.options.maxNestedTags && matcher.getDepth() >= this.options.maxNestedTags)
        throw Error("Maximum nested tags exceeded");
      let jPath = this.options.jPath ? matcher.toString() : matcher;
      let isCurrentStopNode = this.checkStopNode(matcher);
      for (let key in jObj)
        if (Object.prototype.hasOwnProperty.call(jObj, key))
          if (jObj[key] === undefined) {
            if (this.isAttribute(key)) val += "";
          } else if (jObj[key] === null) {
            if (this.isAttribute(key) || key === this.options.cdataPropName) val += "";
            else if (key[0] === "?") val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
            else val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
          } else if (jObj[key] instanceof Date)
            val += this.buildTextValNode(jObj[key], key, "", level, matcher);
          else if (typeof jObj[key] != "object") {
            let attr = this.isAttribute(key);
            if (attr && !this.ignoreAttributesFn(attr, jPath))
              attrStr += this.buildAttrPairStr(attr, "" + jObj[key], isCurrentStopNode);
            else if (!attr)
              if (key === this.options.textNodeName) {
                let newval = this.options.tagValueProcessor(key, "" + jObj[key]);
                val += this.replaceEntitiesValue(newval);
              } else {
                matcher.push(key);
                let isStopNode = this.checkStopNode(matcher);
                matcher.pop();
                if (isStopNode) {
                  let textValue = "" + jObj[key];
                  val +=
                    textValue === ""
                      ? this.indentate(level) + "<" + key + this.closeTag(key) + this.tagEndChar
                      : this.indentate(level) + "<" + key + ">" + textValue + "</" + key + this.tagEndChar;
                } else val += this.buildTextValNode(jObj[key], key, "", level, matcher);
              }
          } else if (Array.isArray(jObj[key])) {
            let arrLen = jObj[key].length;
            let listTagVal = "";
            let listTagAttr = "";
            for (let j = 0; j < arrLen; j++) {
              let item = jObj[key][j];
              if (item === undefined);
              else if (item === null) {
                if (key[0] === "?") val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
                else val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
              } else if (typeof item == "object") {
                if (this.options.oneListGroup) {
                  matcher.push(key);
                  let result = this.j2x(item, level + 1, matcher);
                  matcher.pop();
                  listTagVal += result.val;
                  if (
                    this.options.attributesGroupName &&
                    item.hasOwnProperty(this.options.attributesGroupName)
                  )
                    listTagAttr += result.attrStr;
                } else listTagVal += this.processTextOrObjNode(item, key, level, matcher);
              } else if (this.options.oneListGroup) {
                let textValue = this.options.tagValueProcessor(key, item);
                textValue = this.replaceEntitiesValue(textValue);
                listTagVal += textValue;
              } else {
                matcher.push(key);
                let isStopNode = this.checkStopNode(matcher);
                matcher.pop();
                if (isStopNode) {
                  let textValue = "" + item;
                  listTagVal +=
                    textValue === ""
                      ? this.indentate(level) + "<" + key + this.closeTag(key) + this.tagEndChar
                      : this.indentate(level) + "<" + key + ">" + textValue + "</" + key + this.tagEndChar;
                } else listTagVal += this.buildTextValNode(item, key, "", level, matcher);
              }
            }
            if (this.options.oneListGroup)
              listTagVal = this.buildObjectNode(listTagVal, key, listTagAttr, level);
            val += listTagVal;
          } else if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
            let Ks = Object.keys(jObj[key]);
            let L = Ks.length;
            for (let j = 0; j < L; j++)
              attrStr += this.buildAttrPairStr(Ks[j], "" + jObj[key][Ks[j]], isCurrentStopNode);
          } else val += this.processTextOrObjNode(jObj[key], key, level, matcher);
      return {
        attrStr,
        val,
      };
    };
    Builder.prototype.buildAttrPairStr = function (attrName, val, isStopNode) {
      if (!isStopNode) {
        val = this.options.attributeValueProcessor(attrName, "" + val);
        val = this.replaceEntitiesValue(val);
      }
      return this.options.suppressBooleanAttributes && val === "true"
        ? " " + attrName
        : " " + attrName + '="' + val + '"';
    };
    Builder.prototype.extractAttributes = function (obj) {
      if (!obj || typeof obj != "object") return null;
      let attrValues = {};
      let hasAttrs = false;
      if (this.options.attributesGroupName && obj[this.options.attributesGroupName]) {
        let attrGroup = obj[this.options.attributesGroupName];
        for (let attrKey in attrGroup)
          if (Object.prototype.hasOwnProperty.call(attrGroup, attrKey)) {
            attrValues[
              attrKey.startsWith(this.options.attributeNamePrefix)
                ? attrKey.substring(this.options.attributeNamePrefix.length)
                : attrKey
            ] = attrGroup[attrKey];
            hasAttrs = true;
          }
      } else
        for (let key in obj) {
          if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
          let attr = this.isAttribute(key);
          if (attr) {
            attrValues[attr] = obj[key];
            hasAttrs = true;
          }
        }
      return hasAttrs ? attrValues : null;
    };
    Builder.prototype.buildRawContent = function (obj) {
      if (typeof obj == "string") return obj;
      if (typeof obj != "object" || obj === null) return String(obj);
      if (obj[this.options.textNodeName] !== undefined) return obj[this.options.textNodeName];
      let content = "";
      for (let key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        if (this.isAttribute(key)) continue;
        if (this.options.attributesGroupName && key === this.options.attributesGroupName) continue;
        let value = obj[key];
        if (key === this.options.textNodeName) content += value;
        else if (Array.isArray(value)) {
          for (let item of value)
            if (typeof item == "string" || typeof item == "number") content += `<${key}>${item}</${key}>`;
            else if (typeof item == "object" && item !== null) {
              let nestedContent = this.buildRawContent(item);
              let nestedAttrs = this.buildAttributesForStopNode(item);
              content +=
                nestedContent === ""
                  ? `<${key}${nestedAttrs}/>`
                  : `<${key}${nestedAttrs}>${nestedContent}</${key}>`;
            }
        } else if (typeof value == "object" && value !== null) {
          let nestedContent = this.buildRawContent(value);
          let nestedAttrs = this.buildAttributesForStopNode(value);
          content +=
            nestedContent === ""
              ? `<${key}${nestedAttrs}/>`
              : `<${key}${nestedAttrs}>${nestedContent}</${key}>`;
        } else content += `<${key}>${value}</${key}>`;
      }
      return content;
    };
    Builder.prototype.buildAttributesForStopNode = function (obj) {
      if (!obj || typeof obj != "object") return "";
      let attrStr = "";
      if (this.options.attributesGroupName && obj[this.options.attributesGroupName]) {
        let attrGroup = obj[this.options.attributesGroupName];
        for (let attrKey in attrGroup) {
          if (!Object.prototype.hasOwnProperty.call(attrGroup, attrKey)) continue;
          let cleanKey = attrKey.startsWith(this.options.attributeNamePrefix)
            ? attrKey.substring(this.options.attributeNamePrefix.length)
            : attrKey;
          let val = attrGroup[attrKey];
          if (val === true && this.options.suppressBooleanAttributes) attrStr += " " + cleanKey;
          else attrStr += " " + cleanKey + '="' + val + '"';
        }
      } else
        for (let key in obj) {
          if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
          let attr = this.isAttribute(key);
          if (attr) {
            let val = obj[key];
            if (val === true && this.options.suppressBooleanAttributes) attrStr += " " + attr;
            else attrStr += " " + attr + '="' + val + '"';
          }
        }
      return attrStr;
    };
    Builder.prototype.buildObjectNode = function (val, key, attrStr, level) {
      if (val === "")
        return key[0] === "?"
          ? this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar
          : this.indentate(level) + "<" + key + attrStr + this.closeTag(key) + this.tagEndChar;
      {
        let tagEndExp = "</" + key + this.tagEndChar;
        let piClosingChar = "";
        if (key[0] === "?") {
          piClosingChar = "?";
          tagEndExp = "";
        }
        return (!attrStr && attrStr !== "") || val.indexOf("<") !== -1
          ? this.options.commentPropName !== false &&
            key === this.options.commentPropName &&
            piClosingChar.length === 0
            ? this.indentate(level) + `<!--${val}-->` + this.newLine
            : this.indentate(level) +
              "<" +
              key +
              attrStr +
              piClosingChar +
              this.tagEndChar +
              val +
              this.indentate(level) +
              tagEndExp
          : this.indentate(level) + "<" + key + attrStr + piClosingChar + ">" + val + tagEndExp;
      }
    };
    Builder.prototype.closeTag = function (key) {
      let closeTag = "";
      if (this.options.unpairedTags.indexOf(key) !== -1) {
        if (!this.options.suppressUnpairedNode) closeTag = "/";
      } else closeTag = this.options.suppressEmptyNode ? "/" : `></${key}`;
      return closeTag;
    };
    Builder.prototype.checkStopNode = function (matcher) {
      if (!this.stopNodeExpressions || this.stopNodeExpressions.length === 0) return false;
      for (let expressionIndex = 0; expressionIndex < this.stopNodeExpressions.length; expressionIndex++)
        if (matcher.matches(this.stopNodeExpressions[expressionIndex])) return true;
      return false;
    };
    Builder.prototype.buildTextValNode = function (val, key, attrStr, level, matcher) {
      if (this.options.cdataPropName !== false && key === this.options.cdataPropName)
        return this.indentate(level) + `<![CDATA[${val}]]>` + this.newLine;
      if (this.options.commentPropName !== false && key === this.options.commentPropName)
        return this.indentate(level) + `<!--${val}-->` + this.newLine;
      if (key[0] === "?") return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
      {
        let textValue = this.options.tagValueProcessor(key, val);
        textValue = this.replaceEntitiesValue(textValue);
        return textValue === ""
          ? this.indentate(level) + "<" + key + attrStr + this.closeTag(key) + this.tagEndChar
          : this.indentate(level) + "<" + key + attrStr + ">" + textValue + "</" + key + this.tagEndChar;
      }
    };
    Builder.prototype.replaceEntitiesValue = function (textValue) {
      if (textValue && textValue.length > 0 && this.options.processEntities)
        for (let entityIndex = 0; entityIndex < this.options.entities.length; entityIndex++) {
          let entity = this.options.entities[entityIndex];
          textValue = textValue.replace(entity.regex, entity.val);
        }
      return textValue;
    };
    let XMLBuilder = Builder;
    let XMLValidator = {
      validate,
    };
    cjsModule.exports = webpackExports;
  })();
});
export { require_fxp };
