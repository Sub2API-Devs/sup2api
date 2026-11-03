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
function isPlainObjectPlist(e) {
  return typeof e === "object" && !Array.isArray(e);
}
//@ chunk-sasp5j43.js:253-274 placement
var PLIST_TAG_NAME_PATTERN = /^\/?[\w:.-]+/;
//@ chunk-sasp5j43.js:274-791 placement
function* tokenizePlistXml(e) {
  let t = e.length;
  let n = 0;
  while (n < t) {
    if (e[n] !== "<") {
      let index = e.indexOf("<", n);
      if (index === -1) index = t;
      yield ["", undefined, undefined, e.slice(n, index)];
      n = index;
      continue;
    }
    if (e.startsWith("<?", n)) {
      let index = e.indexOf("?>", n + 2);
      if (index === -1) return;
      n = index + 2;
      continue;
    }
    if (e.startsWith("<!--", n)) {
      let index = e.indexOf("-->", n + 4);
      if (index === -1) return;
      n = index + 3;
      continue;
    }
    let index = e.indexOf(">", n + 1);
    if (index === -1) return;
    if (e.startsWith("<!", n)) {
      n = index + 1;
      continue;
    }
    let sliced = e.slice(n + 1, index);
    let d = PLIST_TAG_NAME_PATTERN.exec(sliced)?.[0];
    if (d === undefined) return;
    yield [e.slice(n, index + 1), d, sliced.endsWith("/") ? "/" : "", undefined];
    n = index + 1;
  }
}
//@ chunk-sasp5j43.js:791-940 placement
/**
 * 极简 plist XML 解析器入口：只接受 <plist> 根，支持 dict/array/string/integer/real/true/false/date/data。
 */
function parsePlistXml(e) {
  let t = tokenizePlistXml(e);
  let n = nextPlistTag(t);
  if (!n || n[1] !== "plist" || n[2] === "/") return;
  let i = nextPlistTag(t);
  if (!i) return;
  let plistValue = parsePlistValue(t, i);
  return nextPlistTag(t)?.[1] === "/plist" ? plistValue : undefined;
}
//@ chunk-sasp5j43.js:940-1037 placement = returnValue (1)
function nextPlistTag(as) {
  for (let e = as.next(); !e.done; e = as.next()) if (e.value[1] !== undefined) return e.value;
  return;
}
//@ chunk-sasp5j43.js:1037-1210 placement = returnValue (1)
function readPlistText(e, t) {
  if (t[2] === "/") return "";
  let n = "";
  for (let i = e.next(); !i.done; i = e.next()) {
    let r = i.value;
    if (r[1] === `/${t[1]}`) return decodeXmlEntities(n);
    if (r[3] === undefined) return;
    n += r[3];
  }
  return;
}
//@ chunk-sasp5j43.js:1210-1762 placement
function parsePlistValue(e, t) {
  let n = t[2] === "/";
  switch (t[1]) {
    case "true":
    case "false":
      if (!n && readPlistText(e, t) === undefined) return;
      return t[1] === "true";
    case "string":
    case "data":
    case "date":
      return readPlistText(e, t);
    case "integer": {
      let trimmed = readPlistText(e, t)?.trim();
      if (!trimmed) return;
      let r = Number(trimmed);
      return Number.isNaN(r) ? undefined : r;
    }
    case "real": {
      let trimmed = readPlistText(e, t)?.trim();
      if (!trimmed) return;
      let match = /^([+-]?)(nan|inf|infinity)$/i.exec(trimmed);
      if (match) {
        if (match[2].toLowerCase() === "nan") return NaN;
        return match[1] === "-" ? -1 / 0 : 1 / 0;
      }
      let d = Number(trimmed);
      return Number.isNaN(d) ? undefined : d;
    }
    case "array":
      return n ? [] : parsePlistArray(e);
    case "dict":
      return n ? {} : parsePlistDict(e);
    default:
      return;
  }
}
//@ chunk-sasp5j43.js:1762-1890 placement
function parsePlistArray(e) {
  let t = [];
  for (;;) {
    let n = nextPlistTag(e);
    if (!n) return;
    if (n[1] === "/array") return t;
    let plistValue = parsePlistValue(e, n);
    if (plistValue === undefined) return;
    t.push(plistValue);
  }
}
//@ chunk-sasp5j43.js:1890-2099 placement
function parsePlistDict(e) {
  let t = Object.create(null);
  for (;;) {
    let n = nextPlistTag(e);
    if (!n) return;
    if (n[1] === "/dict") return t;
    if (n[1] !== "key") return;
    let plistText = readPlistText(e, n);
    let r = nextPlistTag(e);
    if (plistText === undefined || !r) return;
    let plistValue = parsePlistValue(e, r);
    if (plistValue === undefined) return;
    t[plistText] = plistValue;
  }
}
//@ chunk-sasp5j43.js:2099-2446 placement
function decodeXmlEntities(e) {
  if (!e.includes("&")) return e;
  return e.replace(/&(lt|gt|amp|quot|apos|#x[0-9a-fA-F]+|#\d+);/g, (t, n) => {
    switch (n) {
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
        let i = n[1] === "x" ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10);
        return i <= 1114111 ? String.fromCodePoint(i) : t;
      }
    }
  });
}
export { parsePlistXml, isPlainObjectPlist };
