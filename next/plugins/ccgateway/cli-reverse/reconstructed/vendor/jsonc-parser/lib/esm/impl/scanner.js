/**
 * jsonc-parser/lib/esm/impl/scanner.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-aj4djjd6.js (6)
 * attribution: esm-fingerprint 2, esm-layout 4
 */

//@ chunk-aj4djjd6.js:481-3493 esm-fingerprint
function createScanner(text, ignoreTrivia = false) {
  let len = text.length;
  let pos = 0;
  let value = "";
  let tokenOffset = 0;
  let token = 16;
  let lineNumber = 0;
  let lineStartOffset = 0;
  let tokenLineStartOffset = 0;
  let prevTokenLineStartOffset = 0;
  let scanError = 0;
  function scanHexDigits(count, exact) {
    let digits = 0;
    let value = 0;
    while (digits < count || !exact) {
      let ch = text.charCodeAt(pos);
      if (ch >= 48 && ch <= 57) value = value * 16 + ch - 48;
      else if (ch >= 65 && ch <= 70) value = value * 16 + ch - 65 + 10;
      else if (ch >= 97 && ch <= 102) value = value * 16 + ch - 97 + 10;
      else break;
      pos++;
      digits++;
    }
    if (digits < count) value = -1;
    return value;
  }
  function setPosition(newPosition) {
    pos = newPosition;
    value = "";
    tokenOffset = 0;
    token = 16;
    scanError = 0;
  }
  function scanNumber() {
    let start = pos;
    if (text.charCodeAt(pos) === 48) pos++;
    else {
      pos++;
      while (pos < text.length && isDigit(text.charCodeAt(pos))) pos++;
    }
    if (pos < text.length && text.charCodeAt(pos) === 46) {
      pos++;
      if (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit(text.charCodeAt(pos))) pos++;
      } else {
        scanError = 3;
        return text.substring(start, pos);
      }
    }
    let end = pos;
    if (pos < text.length && (text.charCodeAt(pos) === 69 || text.charCodeAt(pos) === 101)) {
      pos++;
      if ((pos < text.length && text.charCodeAt(pos) === 43) || text.charCodeAt(pos) === 45) pos++;
      if (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit(text.charCodeAt(pos))) pos++;
        end = pos;
      } else scanError = 3;
    }
    return text.substring(start, end);
  }
  function scanString() {
    let result = "";
    let start = pos;
    while (true) {
      if (pos >= len) {
        result += text.substring(start, pos);
        scanError = 2;
        break;
      }
      let ch = text.charCodeAt(pos);
      if (ch === 34) {
        result += text.substring(start, pos);
        pos++;
        break;
      }
      if (ch === 92) {
        result += text.substring(start, pos);
        pos++;
        if (pos >= len) {
          scanError = 2;
          break;
        }
        switch (text.charCodeAt(pos++)) {
          case 34:
            result += '"';
            break;
          case 92:
            result += "\\";
            break;
          case 47:
            result += "/";
            break;
          case 98:
            result += "\b";
            break;
          case 102:
            result += "\f";
            break;
          case 110:
            result += `
`;
            break;
          case 114:
            result += "\r";
            break;
          case 116:
            result += "\t";
            break;
          case 117:
            let ch3 = scanHexDigits(4, true);
            if (ch3 >= 0) result += String.fromCharCode(ch3);
            else scanError = 4;
            break;
          default:
            scanError = 5;
        }
        start = pos;
        continue;
      }
      if (ch >= 0 && ch <= 31)
        if (isLineBreak(ch)) {
          result += text.substring(start, pos);
          scanError = 2;
          break;
        } else scanError = 6;
      pos++;
    }
    return result;
  }
  function scanNext() {
    value = "";
    scanError = 0;
    tokenOffset = pos;
    lineStartOffset = lineNumber;
    prevTokenLineStartOffset = tokenLineStartOffset;
    if (pos >= len) {
      tokenOffset = len;
      return (token = 17);
    }
    let code = text.charCodeAt(pos);
    if (isWhiteSpace(code)) {
      do {
        pos++;
        value += String.fromCharCode(code);
        code = text.charCodeAt(pos);
      } while (isWhiteSpace(code));
      return (token = 15);
    }
    if (isLineBreak(code)) {
      pos++;
      value += String.fromCharCode(code);
      if (code === 13 && text.charCodeAt(pos) === 10) {
        pos++;
        value += `
`;
      }
      lineNumber++;
      tokenLineStartOffset = pos;
      return (token = 14);
    }
    switch (code) {
      case 123:
        pos++;
        return (token = 1);
      case 125:
        pos++;
        return (token = 2);
      case 91:
        pos++;
        return (token = 3);
      case 93:
        pos++;
        return (token = 4);
      case 58:
        pos++;
        return (token = 6);
      case 44:
        pos++;
        return (token = 5);
      case 34:
        pos++;
        value = scanString();
        return (token = 10);
      case 47:
        let start = pos - 1;
        if (text.charCodeAt(pos + 1) === 47) {
          pos += 2;
          while (pos < len) {
            if (isLineBreak(text.charCodeAt(pos))) break;
            pos++;
          }
          value = text.substring(start, pos);
          return (token = 12);
        }
        if (text.charCodeAt(pos + 1) === 42) {
          pos += 2;
          let safeLength = len - 1;
          let commentClosed = false;
          while (pos < safeLength) {
            let ch = text.charCodeAt(pos);
            if (ch === 42 && text.charCodeAt(pos + 1) === 47) {
              pos += 2;
              commentClosed = true;
              break;
            }
            pos++;
            if (isLineBreak(ch)) {
              if (ch === 13 && text.charCodeAt(pos) === 10) pos++;
              lineNumber++;
              tokenLineStartOffset = pos;
            }
          }
          if (!commentClosed) {
            pos++;
            scanError = 1;
          }
          value = text.substring(start, pos);
          return (token = 13);
        }
        value += String.fromCharCode(code);
        pos++;
        return (token = 16);
      case 45:
        value += String.fromCharCode(code);
        pos++;
        if (pos === len || !isDigit(text.charCodeAt(pos))) return (token = 16);
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        value += scanNumber();
        return (token = 11);
      default:
        while (pos < len && isUnknownContentCharacter(code)) {
          pos++;
          code = text.charCodeAt(pos);
        }
        if (tokenOffset !== pos) {
          switch (((value = text.substring(tokenOffset, pos)), value)) {
            case "true":
              return (token = 8);
            case "false":
              return (token = 9);
            case "null":
              return (token = 7);
          }
          return (token = 16);
        }
        value += String.fromCharCode(code);
        pos++;
        return (token = 16);
    }
  }
  function isUnknownContentCharacter(code) {
    if (isWhiteSpace(code) || isLineBreak(code)) return false;
    switch (code) {
      case 125:
      case 93:
      case 123:
      case 91:
      case 34:
      case 58:
      case 44:
      case 47:
        return false;
    }
    return true;
  }
  function scanNextNonTrivia() {
    let result;
    do result = scanNext();
    while (result >= 12 && result <= 15);
    return result;
  }
  return {
    setPosition,
    getPosition: () => pos,
    scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
    getToken: () => token,
    getTokenValue: () => value,
    getTokenOffset: () => tokenOffset,
    getTokenLength: () => pos - tokenOffset,
    getTokenStartLine: () => lineStartOffset,
    getTokenStartCharacter: () => tokenOffset - prevTokenLineStartOffset,
    getTokenError: () => scanError,
  };
}
//@ chunk-aj4djjd6.js:3493-3528 esm-layout
function isWhiteSpace(ch) {
  return ch === 32 || ch === 9;
}
//@ chunk-aj4djjd6.js:3528-3564 esm-layout
function isLineBreak(ch) {
  return ch === 10 || ch === 13;
}
//@ chunk-aj4djjd6.js:3564-3598 esm-layout
function isDigit(ch) {
  return ch >= 48 && ch <= 57;
}
//@ chunk-aj4djjd6.js:3598-3604 esm-layout
var CharacterCodes;
//@ chunk-aj4djjd6.js:3604-5028 esm-fingerprint
(function (CharacterCodes) {
  CharacterCodes[(CharacterCodes.lineFeed = 10)] = "lineFeed";
  CharacterCodes[(CharacterCodes.carriageReturn = 13)] = "carriageReturn";
  CharacterCodes[(CharacterCodes.space = 32)] = "space";
  CharacterCodes[(CharacterCodes._0 = 48)] = "_0";
  CharacterCodes[(CharacterCodes._1 = 49)] = "_1";
  CharacterCodes[(CharacterCodes._2 = 50)] = "_2";
  CharacterCodes[(CharacterCodes._3 = 51)] = "_3";
  CharacterCodes[(CharacterCodes._4 = 52)] = "_4";
  CharacterCodes[(CharacterCodes._5 = 53)] = "_5";
  CharacterCodes[(CharacterCodes._6 = 54)] = "_6";
  CharacterCodes[(CharacterCodes._7 = 55)] = "_7";
  CharacterCodes[(CharacterCodes._8 = 56)] = "_8";
  CharacterCodes[(CharacterCodes._9 = 57)] = "_9";
  CharacterCodes[(CharacterCodes.a = 97)] = "a";
  CharacterCodes[(CharacterCodes.b = 98)] = "b";
  CharacterCodes[(CharacterCodes.c = 99)] = "c";
  CharacterCodes[(CharacterCodes.d = 100)] = "d";
  CharacterCodes[(CharacterCodes.e = 101)] = "e";
  CharacterCodes[(CharacterCodes.f = 102)] = "f";
  CharacterCodes[(CharacterCodes.g = 103)] = "g";
  CharacterCodes[(CharacterCodes.h = 104)] = "h";
  CharacterCodes[(CharacterCodes.i = 105)] = "i";
  CharacterCodes[(CharacterCodes.j = 106)] = "j";
  CharacterCodes[(CharacterCodes.k = 107)] = "k";
  CharacterCodes[(CharacterCodes.l = 108)] = "l";
  CharacterCodes[(CharacterCodes.m = 109)] = "m";
  CharacterCodes[(CharacterCodes.n = 110)] = "n";
  CharacterCodes[(CharacterCodes.o = 111)] = "o";
  CharacterCodes[(CharacterCodes.p = 112)] = "p";
  CharacterCodes[(CharacterCodes.q = 113)] = "q";
  CharacterCodes[(CharacterCodes.r = 114)] = "r";
  CharacterCodes[(CharacterCodes.s = 115)] = "s";
  CharacterCodes[(CharacterCodes.t = 116)] = "t";
  CharacterCodes[(CharacterCodes.u = 117)] = "u";
  CharacterCodes[(CharacterCodes.v = 118)] = "v";
  CharacterCodes[(CharacterCodes.w = 119)] = "w";
  CharacterCodes[(CharacterCodes.x = 120)] = "x";
  CharacterCodes[(CharacterCodes.y = 121)] = "y";
  CharacterCodes[(CharacterCodes.z = 122)] = "z";
  CharacterCodes[(CharacterCodes.A = 65)] = "A";
  CharacterCodes[(CharacterCodes.B = 66)] = "B";
  CharacterCodes[(CharacterCodes.C = 67)] = "C";
  CharacterCodes[(CharacterCodes.D = 68)] = "D";
  CharacterCodes[(CharacterCodes.E = 69)] = "E";
  CharacterCodes[(CharacterCodes.F = 70)] = "F";
  CharacterCodes[(CharacterCodes.G = 71)] = "G";
  CharacterCodes[(CharacterCodes.H = 72)] = "H";
  CharacterCodes[(CharacterCodes.I = 73)] = "I";
  CharacterCodes[(CharacterCodes.J = 74)] = "J";
  CharacterCodes[(CharacterCodes.K = 75)] = "K";
  CharacterCodes[(CharacterCodes.L = 76)] = "L";
  CharacterCodes[(CharacterCodes.M = 77)] = "M";
  CharacterCodes[(CharacterCodes.N = 78)] = "N";
  CharacterCodes[(CharacterCodes.O = 79)] = "O";
  CharacterCodes[(CharacterCodes.P = 80)] = "P";
  CharacterCodes[(CharacterCodes.Q = 81)] = "Q";
  CharacterCodes[(CharacterCodes.R = 82)] = "R";
  CharacterCodes[(CharacterCodes.S = 83)] = "S";
  CharacterCodes[(CharacterCodes.T = 84)] = "T";
  CharacterCodes[(CharacterCodes.U = 85)] = "U";
  CharacterCodes[(CharacterCodes.V = 86)] = "V";
  CharacterCodes[(CharacterCodes.W = 87)] = "W";
  CharacterCodes[(CharacterCodes.X = 88)] = "X";
  CharacterCodes[(CharacterCodes.Y = 89)] = "Y";
  CharacterCodes[(CharacterCodes.Z = 90)] = "Z";
  CharacterCodes[(CharacterCodes.asterisk = 42)] = "asterisk";
  CharacterCodes[(CharacterCodes.backslash = 92)] = "backslash";
  CharacterCodes[(CharacterCodes.closeBrace = 125)] = "closeBrace";
  CharacterCodes[(CharacterCodes.closeBracket = 93)] = "closeBracket";
  CharacterCodes[(CharacterCodes.colon = 58)] = "colon";
  CharacterCodes[(CharacterCodes.comma = 44)] = "comma";
  CharacterCodes[(CharacterCodes.dot = 46)] = "dot";
  CharacterCodes[(CharacterCodes.doubleQuote = 34)] = "doubleQuote";
  CharacterCodes[(CharacterCodes.minus = 45)] = "minus";
  CharacterCodes[(CharacterCodes.openBrace = 123)] = "openBrace";
  CharacterCodes[(CharacterCodes.openBracket = 91)] = "openBracket";
  CharacterCodes[(CharacterCodes.plus = 43)] = "plus";
  CharacterCodes[(CharacterCodes.slash = 47)] = "slash";
  CharacterCodes[(CharacterCodes.formFeed = 12)] = "formFeed";
  CharacterCodes[(CharacterCodes.tab = 9)] = "tab";
})(CharacterCodes || (CharacterCodes = {}));
export { createScanner };
