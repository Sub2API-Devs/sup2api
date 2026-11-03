/**
 * jsonc-parser/lib/esm/impl/format.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import { K, cachedSpaces, cachedBreakLinesWithSpaces } from "./string-intern.js";
import { createScanner } from "./scanner.js";

//@ chunk-kndsyy4v.js:5455-7403 esm-fingerprint
function format(documentText, range, options) {
  let initialIndentLevel;
  let formatText;
  let formatTextStart;
  let rangeStart;
  let rangeEnd;
  if (range) {
    rangeStart = range.offset;
    rangeEnd = rangeStart + range.length;
    formatTextStart = rangeStart;
    while (formatTextStart > 0 && !isEOL(documentText, formatTextStart - 1)) formatTextStart--;
    let endOffset = rangeEnd;
    while (endOffset < documentText.length && !isEOL(documentText, endOffset)) endOffset++;
    formatText = documentText.substring(formatTextStart, endOffset);
    initialIndentLevel = computeIndentLevel(formatText, options);
  } else {
    formatText = documentText;
    initialIndentLevel = 0;
    formatTextStart = 0;
    rangeStart = 0;
    rangeEnd = documentText.length;
  }
  let eol = getEOL(options, documentText);
  let eolFastPathSupported = K.includes(eol);
  let numberLineBreaks = 0;
  let indentLevel = 0;
  let indentValue;
  if (options.insertSpaces)
    indentValue = cachedSpaces[options.tabSize || 4] ?? repeat(cachedSpaces[1], options.tabSize || 4);
  else indentValue = "\t";
  let indentType = indentValue === "\t" ? "\t" : " ";
  let scanner = createScanner(formatText, false);
  let hasError = false;
  function newLinesAndIndent() {
    if (numberLineBreaks > 1)
      return repeat(eol, numberLineBreaks) + repeat(indentValue, initialIndentLevel + indentLevel);
    let amountOfSpaces = indentValue.length * (initialIndentLevel + indentLevel);
    if (!eolFastPathSupported || amountOfSpaces > cachedBreakLinesWithSpaces[indentType][eol].length)
      return eol + repeat(indentValue, initialIndentLevel + indentLevel);
    if (amountOfSpaces <= 0) return eol;
    return cachedBreakLinesWithSpaces[indentType][eol][amountOfSpaces];
  }
  function scanNext() {
    let token = scanner.scan();
    numberLineBreaks = 0;
    while (token === 15 || token === 14) {
      if (token === 14 && options.keepLines) numberLineBreaks += 1;
      else if (token === 14) numberLineBreaks = 1;
      token = scanner.scan();
    }
    hasError = token === 16 || scanner.getTokenError() !== 0;
    return token;
  }
  let editOperations = [];
  function addEdit(text, startOffset, endOffset) {
    if (
      !hasError &&
      (!range || (startOffset < rangeEnd && endOffset > rangeStart)) &&
      documentText.substring(startOffset, endOffset) !== text
    )
      editOperations.push({
        offset: startOffset,
        length: endOffset - startOffset,
        content: text,
      });
  }
  let firstToken = scanNext();
  if (options.keepLines && numberLineBreaks > 0) addEdit(repeat(eol, numberLineBreaks), 0, 0);
  if (firstToken !== 17) {
    let firstTokenStart = scanner.getTokenOffset() + formatTextStart;
    let initialIndent =
      indentValue.length * initialIndentLevel < 20 && options.insertSpaces
        ? cachedSpaces[indentValue.length * initialIndentLevel]
        : repeat(indentValue, initialIndentLevel);
    addEdit(initialIndent, formatTextStart, firstTokenStart);
  }
  while (firstToken !== 17) {
    let firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
    let secondToken = scanNext();
    let replaceContent = "";
    let needsLineBreak = false;
    while (numberLineBreaks === 0 && (secondToken === 12 || secondToken === 13)) {
      let commentTokenStart = scanner.getTokenOffset() + formatTextStart;
      addEdit(cachedSpaces[1], firstTokenEnd, commentTokenStart);
      firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
      needsLineBreak = secondToken === 12;
      replaceContent = needsLineBreak ? newLinesAndIndent() : "";
      secondToken = scanNext();
    }
    if (secondToken === 2) {
      if (firstToken !== 1) indentLevel--;
      if ((options.keepLines && numberLineBreaks > 0) || (!options.keepLines && firstToken !== 1))
        replaceContent = newLinesAndIndent();
      else if (options.keepLines) replaceContent = cachedSpaces[1];
    } else if (secondToken === 4) {
      if (firstToken !== 3) indentLevel--;
      if ((options.keepLines && numberLineBreaks > 0) || (!options.keepLines && firstToken !== 3))
        replaceContent = newLinesAndIndent();
      else if (options.keepLines) replaceContent = cachedSpaces[1];
    } else {
      switch (firstToken) {
        case 3:
        case 1:
          indentLevel++;
          if ((options.keepLines && numberLineBreaks > 0) || !options.keepLines)
            replaceContent = newLinesAndIndent();
          else replaceContent = cachedSpaces[1];
          break;
        case 5:
          if ((options.keepLines && numberLineBreaks > 0) || !options.keepLines)
            replaceContent = newLinesAndIndent();
          else replaceContent = cachedSpaces[1];
          break;
        case 12:
          replaceContent = newLinesAndIndent();
          break;
        case 13:
          if (numberLineBreaks > 0) replaceContent = newLinesAndIndent();
          else if (!needsLineBreak) replaceContent = cachedSpaces[1];
          break;
        case 6:
          if (options.keepLines && numberLineBreaks > 0) replaceContent = newLinesAndIndent();
          else if (!needsLineBreak) replaceContent = cachedSpaces[1];
          break;
        case 10:
          if (options.keepLines && numberLineBreaks > 0) replaceContent = newLinesAndIndent();
          else if (secondToken === 6 && !needsLineBreak) replaceContent = "";
          break;
        case 7:
        case 8:
        case 9:
        case 11:
        case 2:
        case 4:
          if (options.keepLines && numberLineBreaks > 0) replaceContent = newLinesAndIndent();
          else if ((secondToken === 12 || secondToken === 13) && !needsLineBreak)
            replaceContent = cachedSpaces[1];
          else if (secondToken !== 5 && secondToken !== 17) hasError = true;
          break;
        case 16:
          hasError = true;
          break;
      }
      if (numberLineBreaks > 0 && (secondToken === 12 || secondToken === 13))
        replaceContent = newLinesAndIndent();
    }
    if (secondToken === 17)
      if (options.keepLines && numberLineBreaks > 0) replaceContent = newLinesAndIndent();
      else replaceContent = options.insertFinalNewline ? eol : "";
    let secondTokenStart = scanner.getTokenOffset() + formatTextStart;
    addEdit(replaceContent, firstTokenEnd, secondTokenStart);
    firstToken = secondToken;
  }
  return editOperations;
}
//@ chunk-kndsyy4v.js:7403-7462 esm-layout
function repeat(s_2, count) {
  let result = "";
  for (let i = 0; i < count; i++) result += s_2;
  return result;
}
//@ chunk-kndsyy4v.js:7462-7618 esm-fingerprint
function computeIndentLevel(content, options) {
  let i_2 = 0;
  let nChars = 0;
  let tabSize = options.tabSize || 4;
  while (i_2 < content.length) {
    let ch = content.charAt(i_2);
    if (ch === cachedSpaces[1]) nChars++;
    else if (ch === "\t") nChars += tabSize;
    else break;
    i_2++;
  }
  return Math.floor(nChars / tabSize);
}
//@ chunk-kndsyy4v.js:7618-7801 esm-fingerprint
function getEOL(options, text) {
  for (let i = 0; i < text.length; i++) {
    let ch = text.charAt(i);
    if (ch === "\r") {
      if (
        i + 1 < text.length &&
        text.charAt(i + 1) ===
          `
`
      )
        return `\r
`;
      return "\r";
    } else if (
      ch ===
      `
`
    )
      return `
`;
  }
  return (
    (options && options.eol) ||
    `
`
  );
}
//@ chunk-kndsyy4v.js:7801-7855 esm-fingerprint
function isEOL(text, offset) {
  return (
    `\r
`.indexOf(text.charAt(offset)) !== -1
  );
}
export { isEOL, format };
