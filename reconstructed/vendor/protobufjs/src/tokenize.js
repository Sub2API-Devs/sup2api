/**
 * protobufjs/src/tokenize.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:130453-132937 cjs-fingerprint
var ao = x(function (cjsExports, cjsModule) {
  cjsModule.exports = tokenize;
  var delimRe = /[\s{}=;:[\],'"()<>]/g;
  var stringDoubleRe = /(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g;
  var stringSingleRe = /(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g;
  var setCommentRe = /^ *[*/]+ */;
  var setCommentAltRe = /^\s*\*?\/*/;
  var setCommentSplitRe = /\n/g;
  var whitespaceRe = /\s/;
  var unescapeRe = /\\(.?)/g;
  var unescapeMap = {
    0: "\x00",
    r: "\r",
    n: `
`,
    t: "\t",
  };
  function jd(str) {
    return str.replace(unescapeRe, function ($0, $1) {
      switch ($1) {
        case "\\":
        case "":
          return $1;
        default:
          return unescapeMap[$1] || "";
      }
    });
  }
  tokenize.unescape = jd;
  function tokenize(source, alternateCommentMode) {
    source = source.toString();
    var offset = 0;
    var length = source.length;
    var line = 1;
    var lastCommentLine = 0;
    var comments = {};
    var stack = [];
    var stringDelim = null;
    function illegal(subject) {
      return Error("illegal " + subject + " (line " + line + ")");
    }
    function readString() {
      var re = stringDelim === "'" ? stringSingleRe : stringDoubleRe;
      re.lastIndex = offset - 1;
      var match = re.exec(source);
      if (!match) throw illegal("string");
      offset = re.lastIndex;
      push(stringDelim);
      stringDelim = null;
      return jd(match[1]);
    }
    function charAt(pos) {
      return source.charAt(pos);
    }
    function setComment(start, end, isLeading) {
      var comment = {
        type: source.charAt(start++),
        lineEmpty: false,
        leading: isLeading,
      };
      var lookback;
      if (alternateCommentMode) lookback = 2;
      else lookback = 3;
      var commentOffset = start - lookback;
      var c;
      do
        if (
          --commentOffset < 0 ||
          (c = source.charAt(commentOffset)) ===
            `
`
        ) {
          comment.lineEmpty = true;
          break;
        }
      while (c === " " || c === "\t");
      var lines = source.substring(start, end).split(setCommentSplitRe);
      for (var i = 0; i < lines.length; ++i)
        lines[i] = lines[i].replace(alternateCommentMode ? setCommentAltRe : setCommentRe, "").trim();
      comment.text = lines
        .join(
          `
`,
        )
        .trim();
      comments[line] = comment;
      lastCommentLine = line;
    }
    function isDoubleSlashCommentLine(startOffset) {
      var endOffset = findEndOfLine(startOffset);
      var lineText = source.substring(startOffset, endOffset);
      var isComment = /^\s*\/\//.test(lineText);
      return isComment;
    }
    function findEndOfLine(cursor) {
      var endOffset = cursor;
      while (
        endOffset < length &&
        charAt(endOffset) !==
          `
`
      )
        endOffset++;
      return endOffset;
    }
    function next() {
      if (stack.length > 0) return stack.shift();
      if (stringDelim) return readString();
      var repeat;
      var prev;
      var curr;
      var start;
      var isDoc;
      var isLeadingComment = offset === 0;
      do {
        if (offset === length) return null;
        repeat = false;
        while (whitespaceRe.test((curr = charAt(offset)))) {
          if (
            curr ===
            `
`
          ) {
            isLeadingComment = true;
            ++line;
          }
          if (++offset === length) return null;
        }
        if (charAt(offset) === "/") {
          if (++offset === length) throw illegal("comment");
          if (charAt(offset) === "/") {
            if (!alternateCommentMode) {
              isDoc = charAt((start = offset + 1)) === "/";
              while (
                charAt(++offset) !==
                `
`
              )
                if (offset === length) return null;
              ++offset;
              if (isDoc) {
                setComment(start, offset - 1, isLeadingComment);
                isLeadingComment = true;
              }
              ++line;
              repeat = true;
            } else {
              start = offset;
              isDoc = false;
              if (isDoubleSlashCommentLine(offset - 1)) {
                isDoc = true;
                do {
                  offset = findEndOfLine(offset);
                  if (offset === length) break;
                  offset++;
                  if (!isLeadingComment) break;
                } while (isDoubleSlashCommentLine(offset));
              } else offset = Math.min(length, findEndOfLine(offset) + 1);
              if (isDoc) {
                setComment(start, offset, isLeadingComment);
                isLeadingComment = true;
              }
              line++;
              repeat = true;
            }
          } else if ((curr = charAt(offset)) === "*") {
            start = offset + 1;
            isDoc = alternateCommentMode || charAt(start) === "*";
            do {
              if (
                curr ===
                `
`
              )
                ++line;
              if (++offset === length) throw illegal("comment");
              prev = curr;
              curr = charAt(offset);
            } while (prev !== "*" || curr !== "/");
            ++offset;
            if (isDoc) {
              setComment(start, offset - 2, isLeadingComment);
              isLeadingComment = true;
            }
            repeat = true;
          } else return "/";
        }
      } while (repeat);
      var end = offset;
      delimRe.lastIndex = 0;
      var delim = delimRe.test(charAt(end++));
      if (!delim) while (end < length && !delimRe.test(charAt(end))) ++end;
      var token = source.substring(offset, (offset = end));
      if (token === '"' || token === "'") stringDelim = token;
      return token;
    }
    function push(token) {
      stack.push(token);
    }
    function peek() {
      if (!stack.length) {
        var token = next();
        if (token === null) return null;
        push(token);
      }
      return stack[0];
    }
    function skip(expected, optional) {
      var actual = peek();
      var equals = actual === expected;
      if (equals) {
        next();
        return true;
      }
      if (!optional) throw illegal("token '" + actual + "', '" + expected + "' expected");
      return false;
    }
    function cmnt(trailingLine) {
      var ret = null;
      var comment;
      if (trailingLine === undefined) {
        comment = comments[line - 1];
        delete comments[line - 1];
        if (comment && (alternateCommentMode || comment.type === "*" || comment.lineEmpty))
          ret = comment.leading ? comment.text : null;
      } else {
        if (lastCommentLine < trailingLine) peek();
        comment = comments[trailingLine];
        delete comments[trailingLine];
        if (comment && !comment.lineEmpty && (alternateCommentMode || comment.type === "/"))
          ret = comment.leading ? null : comment.text;
      }
      return ret;
    }
    return Object.defineProperty(
      {
        next,
        peek,
        push,
        skip,
        cmnt,
      },
      "line",
      {
        get: function () {
          return line;
        },
      },
    );
  }
});
export { ao };
