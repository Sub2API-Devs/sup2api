/**
 * utils/bash/heredocLexing.ts
 *
 * bash 命令的 heredoc/引号/注释逐字节词法与 tree-sitter 区间比对，判断命令是否需要特殊读取（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CONTROL_CHAR_RE as CONTROL_CHAR_RE_2, LONE_SURROGATE_RE, UNICODE_WHITESPACE_RE } from "./ast.js";
import { getParserModule } from "./bashParser.js";
import { setsEqual } from "../collections.js";
import { logError } from "../log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3110636-3110788 placement
var CHAR_TAB = 9;
var CHAR_LF = 10;
var CHAR_SPACE = 32;
var CHAR_DQUOTE = 34;
var CHAR_HASH = 35;
var CHAR_DOLLAR = 36;
var CHAR_AMP = 38;
var CHAR_SQUOTE = 39;
var CHAR_LPAREN = 40;
var CHAR_RPAREN = 41;
var CHAR_PLUS = 43;
var CHAR_MINUS = 45;
var CHAR_SEMI = 59;
var CHAR_LT = 60;
var CHAR_EQ = 61;
var CHAR_GT = 62;
var CHAR_LBRACKET = 91;
var CHAR_BACKSLASH = 92;
var CHAR_RBRACKET = 93;
var CHAR_BACKTICK = 96;
var CHAR_LBRACE = 123;
var CHAR_RBRACE = 125;
//@ chunk-5xgkngpb.js:3110788-3110903 placement
function createLexerState() {
  return {
    substitutions: new Set(),
    quotes: new Set(),
    comments: new Set(),
    heredocs: new Set(),
    heredocLines: new Set(),
  };
}
//@ chunk-5xgkngpb.js:3110903-3110945 placement
var DOLLAR_SUBSTITUTION_RE = /\$\$[({['"$`]/;
var DOUBLE_SUBST_RE = /\$\$[({[$`]/;
//@ chunk-5xgkngpb.js:3110945-3111017 placement
function isIdentChar(code) {
  return code !== undefined && ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95);
}
//@ chunk-5xgkngpb.js:3111017-3111064 placement
function isDigit(code) {
  return code !== undefined && code >= 48 && code <= 57;
}
//@ chunk-5xgkngpb.js:3111064-3111104 placement
function isBlank(code) {
  return code === CHAR_SPACE || code === CHAR_TAB;
}
//@ chunk-5xgkngpb.js:3111104-3111230 placement
var NAME_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUBSTITUTION_NAME_CHARS;
var OPERATOR_CHARS;
deferInit("chunk-5xgkngpb.js:3111104", () => {
  NAME_CHARS = new Set(Buffer.from("-,.:^!"));
  SUBSTITUTION_NAME_CHARS = new Set(Buffer.from(".+,:@%/=-"));
  OPERATOR_CHARS = new Set(Buffer.from(" \t+-*/%<>=!&|^~?:,;"));
});
//@ chunk-5xgkngpb.js:3111230-3111361 placement
function skipArithmeticSubstitution(code, pos) {
  let cursor = pos;
  while (
    isIdentChar(code[cursor]) ||
    isDigit(code[cursor]) ||
    OPERATOR_CHARS.has(code[cursor]) ||
    (code[cursor] === CHAR_DOLLAR && isIdentChar(code[cursor + 1]))
  )
    cursor++;
  return code[cursor] === CHAR_RPAREN && code[cursor + 1] === CHAR_RPAREN ? cursor + 2 : -1;
}
//@ chunk-5xgkngpb.js:3111361-3111439 placement
var DOLLAR_SPECIAL_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TOKEN_BOUNDARY_CHARS;
deferInit("chunk-5xgkngpb.js:3111361", () => {
  DOLLAR_SPECIAL_CHARS = new Set(Buffer.from("?!#@*-"));
  TOKEN_BOUNDARY_CHARS = new Set(
    Buffer.from(` 	
;|&()<>`),
  );
});
//@ chunk-5xgkngpb.js:3111439-3115911 placement
/**
 * bash 命令的 heredoc/引号/注释逐字节词法器：产出各片段区间，遇到看不懂的结构返回 null。
 */
function scanCommandReading(code) {
  let reading = createLexerState();
  let stack = [];
  let substitutionDepth = 0;
  let quoteDepth = 0;
  let pendingHeredocs = [];
  let inHeredoc = false;
  let atTokenStart = true;
  let prevKind = "other";
  let sawBrace = false;
  let sawDollarInSingleQuotes = false;
  let sawBraceOutsideQuotes = false;
  let sawSubstitutionOutsideQuotes = false;
  let pos = 0;
  while (pos <= code.length) {
    let last = stack.at(-1);
    if (last === undefined && (atTokenStart || pos === code.length)) {
      if ((sawBrace && sawDollarInSingleQuotes) || (sawBraceOutsideQuotes && sawSubstitutionOutsideQuotes))
        return null;
      sawBrace = false;
      sawDollarInSingleQuotes = false;
      sawBraceOutsideQuotes = false;
      sawSubstitutionOutsideQuotes = false;
    }
    if (inHeredoc && last === undefined) {
      let heredoc = pendingHeredocs.shift();
      if (heredoc === undefined) {
        inHeredoc = false;
        continue;
      }
      let lineStart = pos;
      let lineEnd = pos;
      for (;;) {
        if (lineStart >= code.length) return null;
        lineEnd = code.indexOf(CHAR_LF, lineStart);
        if (lineEnd === -1) lineEnd = code.length;
        let contentStart = lineStart;
        while (heredoc.stripsTabs && code[contentStart] === CHAR_TAB) contentStart++;
        if (
          lineEnd - contentStart === heredoc.endWord.length &&
          heredoc.endWord.every((expected, offset) => expected === code[contentStart + offset])
        )
          break;
        if (!heredoc.quoted && code[lineEnd - 1] === CHAR_BACKSLASH) return null;
        lineStart = lineEnd + 1;
      }
      reading.heredocLines.add(pos + ":" + lineStart + ":" + lineEnd);
      let min = Math.min(lineEnd + 1, code.length);
      if (heredoc.quoted || lineStart === pos) pos = min;
      else
        stack.push({
          kind: "body",
          end: lineStart,
          resume: min,
        });
      continue;
    }
    if (stack[0]?.kind === "body" && pos === stack[0].end) {
      if (stack.length > 1) return null;
      pos = stack[0].resume;
      stack.pop();
      atTokenStart = true;
      inHeredoc = true;
      continue;
    }
    let ch = code[pos];
    if (ch === undefined) break;
    let nextCh = code[pos + 1];
    let inString = last?.kind === "string" || last?.kind === "body";
    if (ch === CHAR_LF && pendingHeredocs.length > 0 && last !== undefined && stack[0]?.kind !== "body")
      return null;
    if (ch === CHAR_BACKTICK) return null;
    sawBrace ||= ch === CHAR_LBRACE;
    if (ch === CHAR_BACKSLASH) {
      if (nextCh === undefined) return null;
      if (nextCh === CHAR_LF) {
        if (!isBlank(code[pos - 1]) || (substitutionDepth > 0 && inString)) return null;
        pos += 2;
        continue;
      }
      atTokenStart = false;
      prevKind = "other";
      pos += 2;
      continue;
    }
    if (ch === CHAR_DOLLAR) {
      atTokenStart = false;
      prevKind = "other";
      if (nextCh === CHAR_LPAREN) {
        let substitutionEnd = code[pos + 2] === CHAR_LPAREN ? skipArithmeticSubstitution(code, pos + 3) : -1;
        if (substitutionEnd !== -1) {
          reading.substitutions.add(pos + ":" + substitutionEnd);
          pos = substitutionEnd;
          continue;
        }
        stack.push({
          kind: "substitution",
          start: pos,
          open: 1,
        });
        substitutionDepth++;
        atTokenStart = true;
        pos += 2;
        continue;
      }
      if (nextCh === CHAR_LBRACE) {
        let innerCursor = pos + 2;
        while (innerCursor < code.length && code[innerCursor] !== CHAR_RBRACE) {
          let innerCh = code[innerCursor];
          if (
            innerCh === CHAR_BACKSLASH ||
            innerCh === CHAR_SQUOTE ||
            innerCh === CHAR_DQUOTE ||
            innerCh === CHAR_BACKTICK ||
            (innerCh === CHAR_DOLLAR &&
              !isIdentChar(code[innerCursor + 1]) &&
              !isDigit(code[innerCursor + 1])) ||
            innerCh === CHAR_LPAREN ||
            innerCh === CHAR_RPAREN ||
            innerCh === CHAR_LBRACE ||
            innerCh === CHAR_LF ||
            (isBlank(innerCh) && substitutionDepth > 0)
          )
            return null;
          innerCursor++;
        }
        if (innerCursor >= code.length || innerCursor === pos + 2) return null;
        pos = innerCursor + 1;
        continue;
      }
      if (nextCh === CHAR_DOLLAR) {
        let afterDollar = code[pos + 2];
        if (
          afterDollar === CHAR_LPAREN ||
          afterDollar === CHAR_LBRACE ||
          afterDollar === CHAR_LBRACKET ||
          afterDollar === CHAR_DOLLAR ||
          afterDollar === CHAR_BACKTICK ||
          (!inString && (afterDollar === CHAR_SQUOTE || afterDollar === CHAR_DQUOTE))
        )
          return null;
        pos += 2;
        continue;
      }
      if (nextCh === CHAR_SQUOTE && last === undefined) {
        let quoteCursor = pos + 2;
        while (quoteCursor < code.length && code[quoteCursor] !== CHAR_SQUOTE) {
          if (code[quoteCursor] === CHAR_LF && pendingHeredocs.length > 0) return null;
          sawBrace ||= code[quoteCursor] === CHAR_LBRACE || code[quoteCursor] === CHAR_BACKSLASH;
          quoteCursor += code[quoteCursor] === CHAR_BACKSLASH ? 2 : 1;
        }
        if (quoteCursor >= code.length) return null;
        reading.quotes.add(pos + ":" + (quoteCursor + 1));
        pos = quoteCursor + 1;
        continue;
      }
      if (nextCh === CHAR_LBRACKET || nextCh === CHAR_SQUOTE) return null;
      if (nextCh === CHAR_DQUOTE && last?.kind !== "string") return null;
      if (isIdentChar(nextCh)) {
        pos += 2;
        while (isIdentChar(code[pos]) || isDigit(code[pos])) pos++;
        continue;
      }
      if (isDigit(nextCh) || DOLLAR_SPECIAL_CHARS.has(nextCh)) {
        pos += 2;
        continue;
      }
      if (!inString && substitutionDepth > 0) return null;
      pos++;
      continue;
    }
    if (inString) {
      if (ch === CHAR_DQUOTE && last.kind === "string") {
        reading.quotes.add(last.start + ":" + (pos + 1));
        stack.pop();
        quoteDepth--;
      }
      pos++;
      continue;
    }
    sawBraceOutsideQuotes ||= ch === CHAR_LBRACE;
    if (ch === CHAR_SQUOTE) {
      let index = code.indexOf(CHAR_SQUOTE, pos + 1);
      if (index === -1) return null;
      for (let idx = pos + 1; idx < index; idx++) {
        if (code[idx] === CHAR_LF && pendingHeredocs.length > 0) return null;
        sawBrace ||= code[idx] === CHAR_LBRACE;
        sawDollarInSingleQuotes ||= code[idx] === CHAR_DQUOTE && quoteDepth > 0;
      }
      atTokenStart = false;
      prevKind = "other";
      reading.quotes.add(pos + ":" + (index + 1));
      pos = index + 1;
      continue;
    }
    if (ch === CHAR_DQUOTE) {
      sawDollarInSingleQuotes ||= quoteDepth > 0;
      stack.push({
        kind: "string",
        start: pos,
      });
      quoteDepth++;
      atTokenStart = false;
      prevKind = "other";
      pos++;
      continue;
    }
    if (ch === CHAR_HASH) {
      if (last !== undefined) {
        if (atTokenStart || isBlank(code[pos - 1]) || code[pos - 1] === CHAR_LF) return null;
      } else if (atTokenStart) {
        if (code[pos - 1] === CHAR_LPAREN || code[pos - 1] === CHAR_RPAREN) return null;
        let index = code.indexOf(CHAR_LF, pos);
        if (index === -1) index = code.length;
        reading.comments.add(pos + ":" + index);
        pos = index;
        continue;
      }
      prevKind = "other";
      pos++;
      continue;
    }
    if ((ch === CHAR_LT || ch === CHAR_GT) && nextCh === CHAR_LPAREN) {
      stack.push({
        kind: "substitution",
        start: pos,
        open: 1,
      });
      substitutionDepth++;
      sawSubstitutionOutsideQuotes = true;
      atTokenStart = true;
      pos += 2;
      continue;
    }
    if (ch === CHAR_LT && nextCh === CHAR_LT) {
      if (code[pos + 2] === CHAR_LT) pos += 3;
      else {
        if (last !== undefined) return null;
        let heredocCursor = pos + 2;
        let stripsTabs = code[heredocCursor] === CHAR_MINUS;
        if (stripsTabs) heredocCursor++;
        while (isBlank(code[heredocCursor])) heredocCursor++;
        let wordStart = heredocCursor;
        let quoteCh = code[heredocCursor];
        let quoted = quoteCh === CHAR_SQUOTE || quoteCh === CHAR_DQUOTE || quoteCh === CHAR_BACKSLASH;
        if (quoted) heredocCursor++;
        let heredocWordStart = heredocCursor;
        while (
          isIdentChar(code[heredocCursor]) ||
          isDigit(code[heredocCursor]) ||
          SUBSTITUTION_NAME_CHARS.has(code[heredocCursor])
        )
          heredocCursor++;
        let chunk = code.subarray(heredocWordStart, heredocCursor);
        if (quoteCh === CHAR_SQUOTE || quoteCh === CHAR_DQUOTE) {
          if (code[heredocCursor] !== quoteCh) return null;
          heredocCursor++;
        }
        if (
          chunk.length === 0 ||
          (code[heredocCursor] !== undefined && !TOKEN_BOUNDARY_CHARS.has(code[heredocCursor])) ||
          ((code[heredocCursor] === CHAR_LT || code[heredocCursor] === CHAR_GT) &&
            code[heredocCursor + 1] === CHAR_LPAREN)
        )
          return null;
        pendingHeredocs.push({
          endWord: chunk,
          stripsTabs,
          quoted,
        });
        reading.heredocs.add(pos + ":" + wordStart + ":" + heredocCursor);
        atTokenStart = false;
        prevKind = "other";
        pos = heredocCursor;
        continue;
      }
      atTokenStart = true;
      continue;
    }
    if (ch === CHAR_LPAREN) {
      if (!atTokenStart && prevKind === "assignment") {
        let assignCursor = pos + 1;
        while (
          isIdentChar(code[assignCursor]) ||
          isDigit(code[assignCursor]) ||
          isBlank(code[assignCursor]) ||
          SUBSTITUTION_NAME_CHARS.has(code[assignCursor])
        )
          assignCursor++;
        if (
          code[assignCursor] !== CHAR_RPAREN ||
          (code[assignCursor + 1] !== undefined && !TOKEN_BOUNDARY_CHARS.has(code[assignCursor + 1]))
        )
          return null;
        prevKind = "other";
        pos = assignCursor + 1;
        continue;
      }
      if (!atTokenStart && !(prevKind === "name" && nextCh === CHAR_RPAREN)) return null;
      if (last !== undefined) last.open++;
      else if (nextCh === CHAR_LPAREN) {
        let substitutionEnd = skipArithmeticSubstitution(code, pos + 2);
        if (substitutionEnd === -1) return null;
        atTokenStart = false;
        prevKind = "other";
        pos = substitutionEnd;
        continue;
      }
      atTokenStart = true;
      pos++;
      continue;
    }
    if (ch === CHAR_RPAREN) {
      if (last !== undefined && --last.open === 0) {
        reading.substitutions.add(last.start + ":" + (pos + 1));
        stack.pop();
        substitutionDepth--;
        atTokenStart = false;
        prevKind = "other";
      } else atTokenStart = true;
      pos++;
      continue;
    }
    if (ch === CHAR_LBRACKET && prevKind === "name" && !atTokenStart) {
      let nameCursor = pos + 1;
      while (isIdentChar(code[nameCursor]) || isDigit(code[nameCursor]) || NAME_CHARS.has(code[nameCursor]))
        nameCursor++;
      if (code[nameCursor] !== CHAR_RBRACKET) return null;
      prevKind = "other";
      pos = nameCursor + 1;
      continue;
    }
    if (TOKEN_BOUNDARY_CHARS.has(ch)) {
      if (ch === CHAR_SEMI && nextCh === CHAR_AMP) return null;
      atTokenStart = true;
      inHeredoc ||= ch === CHAR_LF && last === undefined && pendingHeredocs.length > 0;
    } else {
      let isNameChar = isIdentChar(ch) || ch >= 128 || (isDigit(ch) && !atTokenStart);
      if (atTokenStart || prevKind === "name")
        prevKind = isNameChar
          ? "name"
          : !atTokenStart && (ch === CHAR_EQ || (ch === CHAR_PLUS && nextCh === CHAR_EQ))
            ? "assignment"
            : "other";
      else if (!(prevKind === "assignment" && code[pos - 1] === CHAR_PLUS)) prevKind = "other";
      atTokenStart = false;
    }
    pos++;
  }
  return stack.length === 0 && pendingHeredocs.length === 0 ? reading : null;
}
//@ chunk-5xgkngpb.js:3115911-3116052 placement
var STRING_NODE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUBSTITUTION_NODE_TYPES;
deferInit("chunk-5xgkngpb.js:3115911", () => {
  STRING_NODE_TYPES = new Set(["string", "raw_string", "ansi_c_string"]);
  SUBSTITUTION_NODE_TYPES = new Set(["command_substitution", "process_substitution", "arithmetic_expansion"]);
});
//@ chunk-5xgkngpb.js:3116052-3116932 placement
/**
 * 遍历 tree-sitter AST，记录引号、注释、heredoc 与替换的区间，记录不了的位置把 whole 置 false。
 */
function collectReadingFromTree(node, insideSubstitution, result) {
  if (
    node.type === "ERROR" ||
    (node.children.length === 0 && node.startIndex === node.endIndex && !node.type.startsWith("heredoc_"))
  )
    result.whole = false;
  if (node.type === "comment") result.reading.comments.add(node.startIndex + ":" + node.endIndex);
  if (STRING_NODE_TYPES.has(node.type)) result.reading.quotes.add(node.startIndex + ":" + node.endIndex);
  if (node.type === "heredoc_redirect") {
    let found = node.children.find((child) => child.type === "<<" || child.type === "<<-");
    let found_2 = node.children.find((child) => child.type === "heredoc_start");
    let found_3 = node.children.find((child) => child.type === "heredoc_body");
    let found_4 = node.children.find((child) => child.type === "heredoc_end");
    if (found === undefined || found_2 === undefined || found_3 === undefined || found_4 === undefined)
      result.whole = false;
    else {
      result.reading.heredocs.add(found.startIndex + ":" + found_2.startIndex + ":" + found_2.endIndex);
      result.reading.heredocLines.add(found_3.startIndex + ":" + found_3.endIndex + ":" + found_4.endIndex);
      result.joinedBody ||=
        insideSubstitution &&
        /\\\n/.test(
          found_3.text +
            `
`,
        );
    }
  }
  let isSubstitution = SUBSTITUTION_NODE_TYPES.has(node.type);
  if (isSubstitution) result.reading.substitutions.add(node.startIndex + ":" + node.endIndex);
  for (let child of node.children)
    collectReadingFromTree(child, insideSubstitution || isSubstitution, result);
}
//@ chunk-5xgkngpb.js:3116932-3117585 placement
/**
 * 命令是否需要特殊读取：比较 tree-sitter 与词法器结果是否一致，返回 4/5 分级，简单命令返回 null。
 */
function classifyCommandReliability(normalizedCommand) {
  let replaced = normalizedCommand.replaceAll("\\\n", "");
  if (
    !/[$`([]|;&/.test(replaced) &&
    !CONTROL_CHAR_RE_2.test(normalizedCommand) &&
    !normalizedCommand.endsWith("\\")
  )
    return null;
  let treeReading = {
    reading: createLexerState(),
    joinedBody: false,
    whole: true,
  };
  try {
    let tree = getParserModule().parse(normalizedCommand);
    if (tree === null) treeReading.whole = false;
    else collectReadingFromTree(tree, false, treeReading);
    let scanReading = treeReading.whole ? scanCommandReading(Buffer.from(normalizedCommand, "utf8")) : null;
    if (
      scanReading !== null &&
      !CONTROL_CHAR_RE_2.test(normalizedCommand) &&
      !LONE_SURROGATE_RE.test(normalizedCommand) &&
      !UNICODE_WHITESPACE_RE.test(normalizedCommand) &&
      setsEqual(scanReading.substitutions, treeReading.reading.substitutions) &&
      setsEqual(scanReading.quotes, treeReading.reading.quotes) &&
      setsEqual(scanReading.comments, treeReading.reading.comments) &&
      setsEqual(scanReading.heredocs, treeReading.reading.heredocs) &&
      setsEqual(scanReading.heredocLines, treeReading.reading.heredocLines) &&
      !DOUBLE_SUBST_RE.test(replaced)
    )
      return null;
  } catch (error) {
    logError(error);
    treeReading.whole = false;
  }
  return DOLLAR_SUBSTITUTION_RE.test(replaced) ||
    (treeReading.whole
      ? treeReading.joinedBody
      : normalizedCommand.includes("<<") && normalizedCommand.includes("\\\n"))
    ? 5
    : 4;
}
export { classifyCommandReliability };
