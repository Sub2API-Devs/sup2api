/**
 * utils/plistParser.ts
 *
 * 2.1.316 新增：plist XML 解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sasp5j43.js (10)
 * attribution: placement 10
 */

//@ chunk-sasp5j43.js:191-253 placement
/**
 * isPlainObjectPlist：普通对象判断（plist 解析）。
 */
function isPlainObjectPlist(value) {
  return typeof value === "object" && !Array.isArray(value);
}
//@ chunk-sasp5j43.js:253-274 placement
var PLIST_TAG_NAME_PATTERN = /^\/?[\w:.-]+/;
//@ chunk-sasp5j43.js:274-791 placement
function* tokenizePlistXml(xml) {
  let length = xml.length;
  let pos = 0;
  while (pos < length) {
    if (xml[pos] !== "<") {
      let index = xml.indexOf("<", pos);
      if (index === -1) index = length;
      yield ["", undefined, undefined, xml.slice(pos, index)];
      pos = index;
      continue;
    }
    if (xml.startsWith("<?", pos)) {
      let index = xml.indexOf("?>", pos + 2);
      if (index === -1) return;
      pos = index + 2;
      continue;
    }
    if (xml.startsWith("<!--", pos)) {
      let index = xml.indexOf("-->", pos + 4);
      if (index === -1) return;
      pos = index + 3;
      continue;
    }
    let index = xml.indexOf(">", pos + 1);
    if (index === -1) return;
    if (xml.startsWith("<!", pos)) {
      pos = index + 1;
      continue;
    }
    let sliced = xml.slice(pos + 1, index);
    let tagName = PLIST_TAG_NAME_PATTERN.exec(sliced)?.[0];
    if (tagName === undefined) return;
    yield [xml.slice(pos, index + 1), tagName, sliced.endsWith("/") ? "/" : "", undefined];
    pos = index + 1;
  }
}
//@ chunk-sasp5j43.js:791-940 placement
/**
 * 极简 plist XML 解析器入口：只接受 <plist> 根，支持 dict/array/string/integer/real/true/false/date/data。
 */
function parsePlistXml(xml) {
  let tokens = tokenizePlistXml(xml);
  let tag = nextPlistTag(tokens);
  if (!tag || tag[1] !== "plist" || tag[2] === "/") return;
  let firstTag = nextPlistTag(tokens);
  if (!firstTag) return;
  let plistValue = parsePlistValue(tokens, firstTag);
  return nextPlistTag(tokens)?.[1] === "/plist" ? plistValue : undefined;
}
//@ chunk-sasp5j43.js:940-1037 placement (2.1.88 match: returnValue, 1)
function nextPlistTag(as) {
  for (let e = as.next(); !e.done; e = as.next()) if (e.value[1] !== undefined) return e.value;
  return;
}
//@ chunk-sasp5j43.js:1037-1210 placement (2.1.88 match: returnValue, 1)
function readPlistText(tokens, openTag) {
  if (openTag[2] === "/") return "";
  let text = "";
  for (let step = tokens.next(); !step.done; step = tokens.next()) {
    let token = step.value;
    if (token[1] === `/${openTag[1]}`) return decodeXmlEntities(text);
    if (token[3] === undefined) return;
    text += token[3];
  }
  return;
}
//@ chunk-sasp5j43.js:1210-1762 placement
function parsePlistValue(tokens, tag) {
  let isClosing = tag[2] === "/";
  switch (tag[1]) {
    case "true":
    case "false":
      if (!isClosing && readPlistText(tokens, tag) === undefined) return;
      return tag[1] === "true";
    case "string":
    case "data":
    case "date":
      return readPlistText(tokens, tag);
    case "integer": {
      let trimmed = readPlistText(tokens, tag)?.trim();
      if (!trimmed) return;
      let parsedNumber = Number(trimmed);
      return Number.isNaN(parsedNumber) ? undefined : parsedNumber;
    }
    case "real": {
      let trimmed = readPlistText(tokens, tag)?.trim();
      if (!trimmed) return;
      let match = /^([+-]?)(nan|inf|infinity)$/i.exec(trimmed);
      if (match) {
        if (match[2].toLowerCase() === "nan") return NaN;
        return match[1] === "-" ? -1 / 0 : 1 / 0;
      }
      let parsedNumber = Number(trimmed);
      return Number.isNaN(parsedNumber) ? undefined : parsedNumber;
    }
    case "array":
      return isClosing ? [] : parsePlistArray(tokens);
    case "dict":
      return isClosing ? {} : parsePlistDict(tokens);
    default:
      return;
  }
}
//@ chunk-sasp5j43.js:1762-1890 placement
function parsePlistArray(tokens) {
  let items = [];
  for (;;) {
    let tag = nextPlistTag(tokens);
    if (!tag) return;
    if (tag[1] === "/array") return items;
    let plistValue = parsePlistValue(tokens, tag);
    if (plistValue === undefined) return;
    items.push(plistValue);
  }
}
//@ chunk-sasp5j43.js:1890-2099 placement
function parsePlistDict(tokens) {
  let dict = Object.create(null);
  for (;;) {
    let tag = nextPlistTag(tokens);
    if (!tag) return;
    if (tag[1] === "/dict") return dict;
    if (tag[1] !== "key") return;
    let plistText = readPlistText(tokens, tag);
    let valueTag = nextPlistTag(tokens);
    if (plistText === undefined || !valueTag) return;
    let plistValue = parsePlistValue(tokens, valueTag);
    if (plistValue === undefined) return;
    dict[plistText] = plistValue;
  }
}
//@ chunk-sasp5j43.js:2099-2446 placement
function decodeXmlEntities(text) {
  if (!text.includes("&")) return text;
  return text.replace(/&(lt|gt|amp|quot|apos|#x[0-9a-fA-F]+|#\d+);/g, (wholeMatch, entityName) => {
    switch (entityName) {
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "amp":
        return "&";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default: {
        let codePoint =
          entityName[1] === "x" ? parseInt(entityName.slice(2), 16) : parseInt(entityName.slice(1), 10);
        return codePoint <= 1114111 ? String.fromCodePoint(codePoint) : wholeMatch;
      }
    }
  });
}
export { parsePlistXml, isPlainObjectPlist };
