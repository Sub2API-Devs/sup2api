/**
 * picomatch/lib/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";
import { require_utils } from "./utils.js";

//@ chunk-fq0cr76a.js:302511-317963 cjs-fingerprint
var require_parse = x(function (cjsExports, cjsModule) {
  var constants = require_constants();
  var utils = require_utils();
  var { MAX_LENGTH, POSIX_REGEX_SOURCE, REGEX_NON_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_BACKREF, REPLACEMENTS } =
    constants;
  var expandRange = (args, options) => {
    if (typeof options.expandRange === "function") return options.expandRange(...args, options);
    args.sort();
    let value = `[${args.join("-")}]`;
    try {
      new RegExp(value);
    } catch (ex) {
      return args.map((v) => utils.escapeRegex(v)).join("..");
    }
    return value;
  };
  var syntaxError = (type, char) =>
    `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
  var iN = (input) => {
    let parts = [];
    let bracket = 0;
    let paren = 0;
    let quote = 0;
    let value = "";
    let escaped = false;
    for (let ch of input) {
      if (escaped === true) {
        value += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        value += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        quote = quote === 1 ? 0 : 1;
        value += ch;
        continue;
      }
      if (quote === 0) {
        if (ch === "[") bracket++;
        else if (ch === "]" && bracket > 0) bracket--;
        else if (bracket === 0) {
          if (ch === "(") paren++;
          else if (ch === ")" && paren > 0) paren--;
          else if (ch === "|" && paren === 0) {
            parts.push(value);
            value = "";
            continue;
          }
        }
      }
      value += ch;
    }
    parts.push(value);
    return parts;
  };
  var isPlainBranch = (branch) => {
    let escaped = false;
    for (let ch of branch) {
      if (escaped === true) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (/[?*+@!()[\]{}]/.test(ch)) return false;
    }
    return true;
  };
  var oN = (branch) => {
    let value = branch.trim();
    let changed = true;
    while (changed === true) {
      changed = false;
      if (/^@\([^\\()[\]{}|]+\)$/.test(value)) {
        value = value.slice(2, -1);
        changed = true;
      }
    }
    if (!isPlainBranch(value)) return;
    return value.replace(/\\(.)/g, "$1");
  };
  var hasRepeatedCharPrefixOverlap = (branches) => {
    let values = branches.map(oN).filter(Boolean);
    for (let i = 0; i < values.length; i++)
      for (let j = i + 1; j < values.length; j++) {
        let a = values[i];
        let b_2 = values[j];
        let char = a[0];
        if (!char || a !== char.repeat(a.length) || b_2 !== char.repeat(b_2.length)) continue;
        if (a === b_2 || a.startsWith(b_2) || b_2.startsWith(a)) return true;
      }
    return false;
  };
  var parseRepeatedExtglob = (pattern, requireEnd = true) => {
    if ((pattern[0] !== "+" && pattern[0] !== "*") || pattern[1] !== "(") return;
    let bracket = 0;
    let paren = 0;
    let quote = 0;
    let escaped = false;
    for (let i = 1; i < pattern.length; i++) {
      let ch = pattern[i];
      if (escaped === true) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        quote = quote === 1 ? 0 : 1;
        continue;
      }
      if (quote === 1) continue;
      if (ch === "[") {
        bracket++;
        continue;
      }
      if (ch === "]" && bracket > 0) {
        bracket--;
        continue;
      }
      if (bracket > 0) continue;
      if (ch === "(") {
        paren++;
        continue;
      }
      if (ch === ")") {
        paren--;
        if (paren === 0) {
          if (requireEnd === true && i !== pattern.length - 1) return;
          return {
            type: pattern[0],
            body: pattern.slice(2, i),
            end: i,
          };
        }
      }
    }
  };
  var getStarExtglobSequenceChars = (branch) => {
    let n = 0;
    let r = [];
    while (n < branch.length) {
      let repeatedExtglob = parseRepeatedExtglob(branch.slice(n), false);
      if (!repeatedExtglob || repeatedExtglob.type !== "*") return;
      let mapped = iN(repeatedExtglob.body).map((S) => S.trim());
      if (mapped.length !== 1) return;
      let b = oN(mapped[0]);
      if (!b || b.length !== 1) return;
      r.push(b);
      n += repeatedExtglob.end + 1;
    }
    if (r.length < 1) return;
    return `${r.length === 1 ? utils.escapeRegex(r[0]) : `[${r.map((ch) => utils.escapeRegex(ch)).join("")}]`}*`;
  };
  var buildCharClassStar = (pattern) => {
    let depth = 0;
    let value = pattern.trim();
    let match = parseRepeatedExtglob(value);
    while (match) {
      depth++;
      value = match.body.trim();
      match = parseRepeatedExtglob(value);
    }
    return depth;
  };
  var analyzeRepeatedExtglob = (body, options) => {
    if (options.maxExtglobRecursion === false)
      return {
        risky: false,
      };
    let r =
      typeof options.maxExtglobRecursion === "number"
        ? options.maxExtglobRecursion
        : constants.DEFAULT_MAX_EXTGLOB_RECURSION;
    let branches = iN(body).map((branch) => branch.trim());
    if (branches.length > 1) {
      if (
        branches.some((branch) => branch === "") ||
        branches.some((branch) => /^[*?]+$/.test(branch)) ||
        hasRepeatedCharPrefixOverlap(branches)
      )
        return {
          risky: true,
        };
    }
    for (let branch of branches) {
      let starExtglobSequenceChars = getStarExtglobSequenceChars(branch);
      if (starExtglobSequenceChars)
        return {
          risky: true,
          safeOutput: starExtglobSequenceChars,
        };
      if (buildCharClassStar(branch) > r)
        return {
          risky: true,
        };
    }
    return {
      risky: false,
    };
  };
  var parse = (input, options) => {
    if (typeof input !== "string") throw TypeError("Expected a string");
    input = REPLACEMENTS[input] || input;
    let opts = {
      ...options,
    };
    let max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
    let len = input.length;
    if (len > max) throw SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
    let bos = {
      type: "bos",
      value: "",
      output: opts.prepend || "",
    };
    let tokens = [bos];
    let capture = opts.capture ? "" : "?:";
    let PLATFORM_CHARS = constants.globChars(opts.windows);
    let EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
    let {
      DOT_LITERAL,
      PLUS_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOT_SLASH,
      NO_DOTS_SLASH,
      QMARK,
      QMARK_NO_DOT,
      STAR,
      START_ANCHOR,
    } = PLATFORM_CHARS;
    let globstar = (opts) => `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
    let nodot = opts.dot ? "" : NO_DOT;
    let qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
    let star = opts.bash === true ? globstar(opts) : STAR;
    if (opts.capture) star = `(${star})`;
    if (typeof opts.noext === "boolean") opts.noextglob = opts.noext;
    let state = {
      input,
      index: -1,
      start: 0,
      dot: opts.dot === true,
      consumed: "",
      output: "",
      prefix: "",
      backtrack: false,
      negated: false,
      brackets: 0,
      braces: 0,
      parens: 0,
      quotes: 0,
      globstar: false,
      tokens,
    };
    input = utils.removePrefix(input, state);
    len = input.length;
    let extglobs = [];
    let braces = [];
    let stack = [];
    let prev = bos;
    let value;
    let eos = () => state.index === len - 1;
    let peek = (state.peek = (n = 1) => input[state.index + n]);
    let advance = (state.advance = () => input[++state.index] || "");
    let remaining = () => input.slice(state.index + 1);
    let consume = (value = "", num = 0) => {
      state.consumed += value;
      state.index += num;
    };
    let append = (token) => {
      state.output += token.output != null ? token.output : token.value;
      consume(token.value);
    };
    let negate = () => {
      let count = 1;
      while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
        advance();
        state.start++;
        count++;
      }
      if (count % 2 === 0) return false;
      state.negated = true;
      state.start++;
      return true;
    };
    let increment = (type) => {
      state[type]++;
      stack.push(type);
    };
    let decrement = (type) => {
      state[type]--;
      stack.pop();
    };
    let push = (tok) => {
      if (prev.type === "globstar") {
        let isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
        let isExtglob =
          tok.extglob === true || (extglobs.length && (tok.type === "pipe" || tok.type === "paren"));
        if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
          state.output = state.output.slice(0, -prev.output.length);
          prev.type = "star";
          prev.value = "*";
          prev.output = star;
          state.output += prev.output;
        }
      }
      if (extglobs.length && tok.type !== "paren") extglobs[extglobs.length - 1].inner += tok.value;
      if (tok.value || tok.output) append(tok);
      if (prev && prev.type === "text" && tok.type === "text") {
        prev.output = (prev.output || prev.value) + tok.value;
        prev.value += tok.value;
        return;
      }
      tok.prev = prev;
      tokens.push(tok);
      prev = tok;
    };
    let extglobOpen = (type, value) => {
      let token = {
        ...EXTGLOB_CHARS[value],
        conditions: 1,
        inner: "",
      };
      token.prev = prev;
      token.parens = state.parens;
      token.output = state.output;
      token.startIndex = state.index;
      token.tokensIndex = tokens.length;
      let output = (opts.capture ? "(" : "") + token.open;
      increment("parens");
      push({
        type,
        value,
        output: state.output ? "" : ONE_CHAR,
      });
      push({
        type: "paren",
        extglob: true,
        value: advance(),
        output,
      });
      extglobs.push(token);
    };
    let extglobClose = (token) => {
      let literal = input.slice(token.startIndex, state.index + 1);
      let body = input.slice(token.startIndex + 2, state.index);
      let analysis = analyzeRepeatedExtglob(body, opts);
      if ((token.type === "plus" || token.type === "star") && analysis.risky) {
        let safeOutput = analysis.safeOutput
          ? (token.output ? "" : ONE_CHAR) + (opts.capture ? `(${analysis.safeOutput})` : analysis.safeOutput)
          : undefined;
        let open = tokens[token.tokensIndex];
        open.type = "text";
        open.value = literal;
        open.output = safeOutput || utils.escapeRegex(literal);
        for (let i = token.tokensIndex + 1; i < tokens.length; i++) {
          tokens[i].value = "";
          tokens[i].output = "";
          delete tokens[i].suffix;
        }
        state.output = token.output + open.output;
        state.backtrack = true;
        push({
          type: "paren",
          extglob: true,
          value,
          output: "",
        });
        decrement("parens");
        return;
      }
      let output = token.close + (opts.capture ? ")" : "");
      let rest;
      if (token.type === "negate") {
        let extglobStar = star;
        if (token.inner && token.inner.length > 1 && token.inner.includes("/")) extglobStar = globstar(opts);
        if (extglobStar !== star || eos() || /^\)+$/.test(remaining()))
          output = token.close = `)$))${extglobStar}`;
        if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
          let expression = parse(rest, {
            ...options,
            fastpaths: false,
          }).output;
          output = token.close = `)${expression})${extglobStar})`;
        }
        if (token.prev.type === "bos") state.negatedExtglob = true;
      }
      push({
        type: "paren",
        extglob: true,
        value,
        output,
      });
      decrement("parens");
    };
    if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
      let backslashes = false;
      let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
        if (first === "\\") {
          backslashes = true;
          return m;
        }
        if (first === "?") {
          if (esc) return esc + first + (rest ? QMARK.repeat(rest.length) : "");
          if (index === 0) return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
          return QMARK.repeat(chars.length);
        }
        if (first === ".") return DOT_LITERAL.repeat(chars.length);
        if (first === "*") {
          if (esc) return esc + first + (rest ? star : "");
          return star;
        }
        return esc ? m : `\\${m}`;
      });
      if (backslashes === true)
        if (opts.unescape === true) output = output.replace(/\\/g, "");
        else output = output.replace(/\\+/g, (m) => (m.length % 2 === 0 ? "\\\\" : m ? "\\" : ""));
      if (output === input && opts.contains === true) {
        state.output = input;
        return state;
      }
      state.output = utils.wrapOutput(output, state, options);
      return state;
    }
    while (!eos()) {
      value = advance();
      if (value === "\x00") continue;
      if (value === "\\") {
        let next = peek();
        if (next === "/" && opts.bash !== true) continue;
        if (next === "." || next === ";") continue;
        if (!next) {
          value += "\\";
          push({
            type: "text",
            value,
          });
          continue;
        }
        let match = /^\\+/.exec(remaining());
        let slashes = 0;
        if (match && match[0].length > 2) {
          slashes = match[0].length;
          state.index += slashes;
          if (slashes % 2 !== 0) value += "\\";
        }
        if (opts.unescape === true) value = advance();
        else value += advance();
        if (state.brackets === 0) {
          push({
            type: "text",
            value,
          });
          continue;
        }
      }
      if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
        if (opts.posix !== false && value === ":") {
          let inner = prev.value.slice(1);
          if (inner.includes("[")) {
            prev.posix = true;
            if (inner.includes(":")) {
              let idx = prev.value.lastIndexOf("[");
              let pre = prev.value.slice(0, idx);
              let rest = prev.value.slice(idx + 2);
              let posix = POSIX_REGEX_SOURCE[rest];
              if (posix) {
                prev.value = pre + posix;
                state.backtrack = true;
                advance();
                if (!bos.output && tokens.indexOf(prev) === 1) bos.output = ONE_CHAR;
                continue;
              }
            }
          }
        }
        if ((value === "[" && peek() !== ":") || (value === "-" && peek() === "]")) value = `\\${value}`;
        if (value === "]" && (prev.value === "[" || prev.value === "[^")) value = `\\${value}`;
        if (opts.posix === true && value === "!" && prev.value === "[") value = "^";
        prev.value += value;
        append({
          value,
        });
        continue;
      }
      if (state.quotes === 1 && value !== '"') {
        value = utils.escapeRegex(value);
        prev.value += value;
        append({
          value,
        });
        continue;
      }
      if (value === '"') {
        state.quotes = state.quotes === 1 ? 0 : 1;
        if (opts.keepQuotes === true)
          push({
            type: "text",
            value,
          });
        continue;
      }
      if (value === "(") {
        increment("parens");
        push({
          type: "paren",
          value,
        });
        continue;
      }
      if (value === ")") {
        if (state.parens === 0 && opts.strictBrackets === true)
          throw SyntaxError(syntaxError("opening", "("));
        let extglob = extglobs[extglobs.length - 1];
        if (extglob && state.parens === extglob.parens + 1) {
          extglobClose(extglobs.pop());
          continue;
        }
        push({
          type: "paren",
          value,
          output: state.parens ? ")" : "\\)",
        });
        decrement("parens");
        continue;
      }
      if (value === "[") {
        if (opts.nobracket === true || !remaining().includes("]")) {
          if (opts.nobracket !== true && opts.strictBrackets === true)
            throw SyntaxError(syntaxError("closing", "]"));
          value = `\\${value}`;
        } else increment("brackets");
        push({
          type: "bracket",
          value,
        });
        continue;
      }
      if (value === "]") {
        if (opts.nobracket === true || (prev && prev.type === "bracket" && prev.value.length === 1)) {
          push({
            type: "text",
            value,
            output: `\\${value}`,
          });
          continue;
        }
        if (state.brackets === 0) {
          if (opts.strictBrackets === true) throw SyntaxError(syntaxError("opening", "["));
          push({
            type: "text",
            value,
            output: `\\${value}`,
          });
          continue;
        }
        decrement("brackets");
        let prevValue = prev.value.slice(1);
        if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) value = `/${value}`;
        prev.value += value;
        append({
          value,
        });
        if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) continue;
        let escaped = utils.escapeRegex(prev.value);
        state.output = state.output.slice(0, -prev.value.length);
        if (opts.literalBrackets === true) {
          state.output += escaped;
          prev.value = escaped;
          continue;
        }
        prev.value = `(${capture}${escaped}|${prev.value})`;
        state.output += prev.value;
        continue;
      }
      if (value === "{" && opts.nobrace !== true) {
        increment("braces");
        let open = {
          type: "brace",
          value,
          output: "(",
          outputIndex: state.output.length,
          tokensIndex: state.tokens.length,
        };
        braces.push(open);
        push(open);
        continue;
      }
      if (value === "}") {
        let brace = braces[braces.length - 1];
        if (opts.nobrace === true || !brace) {
          push({
            type: "text",
            value,
            output: value,
          });
          continue;
        }
        let output = ")";
        if (brace.dots === true) {
          let arr = tokens.slice();
          let range = [];
          for (let i = arr.length - 1; i >= 0; i--) {
            tokens.pop();
            if (arr[i].type === "brace") break;
            if (arr[i].type !== "dots") range.unshift(arr[i].value);
          }
          output = expandRange(range, opts);
          state.backtrack = true;
        }
        if (brace.comma !== true && brace.dots !== true) {
          let out = state.output.slice(0, brace.outputIndex);
          let toks = state.tokens.slice(brace.tokensIndex);
          brace.value = brace.output = "\\{";
          value = output = "\\}";
          state.output = out;
          for (let t of toks) state.output += t.output || t.value;
        }
        push({
          type: "brace",
          value,
          output,
        });
        decrement("braces");
        braces.pop();
        continue;
      }
      if (value === "|") {
        if (extglobs.length > 0) extglobs[extglobs.length - 1].conditions++;
        push({
          type: "text",
          value,
        });
        continue;
      }
      if (value === ",") {
        let output = value;
        let brace = braces[braces.length - 1];
        if (brace && stack[stack.length - 1] === "braces") {
          brace.comma = true;
          output = "|";
        }
        push({
          type: "comma",
          value,
          output,
        });
        continue;
      }
      if (value === "/") {
        if (prev.type === "dot" && state.index === state.start + 1) {
          state.start = state.index + 1;
          state.consumed = "";
          state.output = "";
          tokens.pop();
          prev = bos;
          continue;
        }
        push({
          type: "slash",
          value,
          output: SLASH_LITERAL,
        });
        continue;
      }
      if (value === ".") {
        if (state.braces > 0 && prev.type === "dot") {
          if (prev.value === ".") prev.output = DOT_LITERAL;
          let brace = braces[braces.length - 1];
          prev.type = "dots";
          prev.output += value;
          prev.value += value;
          brace.dots = true;
          continue;
        }
        if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
          push({
            type: "text",
            value,
            output: DOT_LITERAL,
          });
          continue;
        }
        push({
          type: "dot",
          value,
          output: DOT_LITERAL,
        });
        continue;
      }
      if (value === "?") {
        if (!(prev && prev.value === "(") && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          extglobOpen("qmark", value);
          continue;
        }
        if (prev && prev.type === "paren") {
          let next = peek();
          let output = value;
          if (
            (prev.value === "(" && !/[!=<:]/.test(next)) ||
            (next === "<" && !/<([!=]|\w+>)/.test(remaining()))
          )
            output = `\\${value}`;
          push({
            type: "text",
            value,
            output,
          });
          continue;
        }
        if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
          push({
            type: "qmark",
            value,
            output: QMARK_NO_DOT,
          });
          continue;
        }
        push({
          type: "qmark",
          value,
          output: QMARK,
        });
        continue;
      }
      if (value === "!") {
        if (opts.noextglob !== true && peek() === "(") {
          if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
            extglobOpen("negate", value);
            continue;
          }
        }
        if (opts.nonegate !== true && state.index === 0) {
          negate();
          continue;
        }
      }
      if (value === "+") {
        if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          extglobOpen("plus", value);
          continue;
        }
        if ((prev && prev.value === "(") || opts.regex === false) {
          push({
            type: "plus",
            value,
            output: PLUS_LITERAL,
          });
          continue;
        }
        if (
          (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace")) ||
          state.parens > 0
        ) {
          push({
            type: "plus",
            value,
          });
          continue;
        }
        push({
          type: "plus",
          value: PLUS_LITERAL,
        });
        continue;
      }
      if (value === "@") {
        if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          push({
            type: "at",
            extglob: true,
            value,
            output: "",
          });
          continue;
        }
        push({
          type: "text",
          value,
        });
        continue;
      }
      if (value !== "*") {
        if (value === "$" || value === "^") value = `\\${value}`;
        let match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
        if (match) {
          value += match[0];
          state.index += match[0].length;
        }
        push({
          type: "text",
          value,
        });
        continue;
      }
      if (prev && (prev.type === "globstar" || prev.star === true)) {
        prev.type = "star";
        prev.star = true;
        prev.value += value;
        prev.output = star;
        state.backtrack = true;
        state.globstar = true;
        consume(value);
        continue;
      }
      let rest = remaining();
      if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
        extglobOpen("star", value);
        continue;
      }
      if (prev.type === "star") {
        if (opts.noglobstar === true) {
          consume(value);
          continue;
        }
        let prior = prev.prev;
        let before = prior.prev;
        let isStart = prior.type === "slash" || prior.type === "bos";
        let afterStar = before && (before.type === "star" || before.type === "globstar");
        if (opts.bash === true && (!isStart || (rest[0] && rest[0] !== "/"))) {
          push({
            type: "star",
            value,
            output: "",
          });
          continue;
        }
        let isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
        let isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
        if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
          push({
            type: "star",
            value,
            output: "",
          });
          continue;
        }
        while (rest.slice(0, 3) === "/**") {
          let after = input[state.index + 4];
          if (after && after !== "/") break;
          rest = rest.slice(3);
          consume("/**", 3);
        }
        if (prior.type === "bos" && eos()) {
          prev.type = "globstar";
          prev.value += value;
          prev.output = globstar(opts);
          state.output = prev.output;
          state.globstar = true;
          consume(value);
          continue;
        }
        if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
          state.output = state.output.slice(0, -(prior.output + prev.output).length);
          prior.output = `(?:${prior.output}`;
          prev.type = "globstar";
          prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
          prev.value += value;
          state.globstar = true;
          state.output += prior.output + prev.output;
          consume(value);
          continue;
        }
        if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
          let end = rest[1] !== undefined ? "|$" : "";
          state.output = state.output.slice(0, -(prior.output + prev.output).length);
          prior.output = `(?:${prior.output}`;
          prev.type = "globstar";
          prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
          prev.value += value;
          state.output += prior.output + prev.output;
          state.globstar = true;
          consume(value + advance());
          push({
            type: "slash",
            value: "/",
            output: "",
          });
          continue;
        }
        if (prior.type === "bos" && rest[0] === "/") {
          prev.type = "globstar";
          prev.value += value;
          prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
          state.output = prev.output;
          state.globstar = true;
          consume(value + advance());
          push({
            type: "slash",
            value: "/",
            output: "",
          });
          continue;
        }
        state.output = state.output.slice(0, -prev.output.length);
        prev.type = "globstar";
        prev.output = globstar(opts);
        prev.value += value;
        state.output += prev.output;
        state.globstar = true;
        consume(value);
        continue;
      }
      let token = {
        type: "star",
        value,
        output: star,
      };
      if (opts.bash === true) {
        token.output = ".*?";
        if (prev.type === "bos" || prev.type === "slash") token.output = nodot + token.output;
        push(token);
        continue;
      }
      if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
        token.output = value;
        push(token);
        continue;
      }
      if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
        if (prev.type === "dot") {
          state.output += NO_DOT_SLASH;
          prev.output += NO_DOT_SLASH;
        } else if (opts.dot === true) {
          state.output += NO_DOTS_SLASH;
          prev.output += NO_DOTS_SLASH;
        } else {
          state.output += nodot;
          prev.output += nodot;
        }
        if (peek() !== "*") {
          state.output += ONE_CHAR;
          prev.output += ONE_CHAR;
        }
      }
      push(token);
    }
    while (state.brackets > 0) {
      if (opts.strictBrackets === true) throw SyntaxError(syntaxError("closing", "]"));
      state.output = utils.escapeLast(state.output, "[");
      decrement("brackets");
    }
    while (state.parens > 0) {
      if (opts.strictBrackets === true) throw SyntaxError(syntaxError("closing", ")"));
      state.output = utils.escapeLast(state.output, "(");
      decrement("parens");
    }
    while (state.braces > 0) {
      if (opts.strictBrackets === true) throw SyntaxError(syntaxError("closing", "}"));
      state.output = utils.escapeLast(state.output, "{");
      decrement("braces");
    }
    if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket"))
      push({
        type: "maybe_slash",
        value: "",
        output: `${SLASH_LITERAL}?`,
      });
    if (state.backtrack === true) {
      state.output = "";
      for (let token of state.tokens) {
        state.output += token.output != null ? token.output : token.value;
        if (token.suffix) state.output += token.suffix;
      }
    }
    return state;
  };
  parse.fastpaths = (input, options) => {
    let opts = {
      ...options,
    };
    let max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
    let len = input.length;
    if (len > max) throw SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
    input = REPLACEMENTS[input] || input;
    let {
      DOT_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOTS,
      NO_DOTS_SLASH,
      STAR,
      START_ANCHOR,
    } = constants.globChars(opts.windows);
    let nodot = opts.dot ? NO_DOTS : NO_DOT;
    let slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
    let capture = opts.capture ? "" : "?:";
    let state = {
      negated: false,
      prefix: "",
    };
    let star = opts.bash === true ? ".*?" : STAR;
    if (opts.capture) star = `(${star})`;
    let globstar = (opts) => {
      if (opts.noglobstar === true) return star;
      return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
    };
    let create = (str) => {
      switch (str) {
        case "*":
          return `${nodot}${ONE_CHAR}${star}`;
        case ".*":
          return `${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "*.*":
          return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "*/*":
          return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
        case "**":
          return nodot + globstar(opts);
        case "**/*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
        case "**/*.*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "**/.*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
        default: {
          let match = /^(.*?)\.(\w+)$/.exec(str);
          if (!match) return;
          let source = create(match[1]);
          if (!source) return;
          return source + DOT_LITERAL + match[2];
        }
      }
    };
    let output = utils.removePrefix(input, state);
    let source = create(output);
    if (source && opts.strictSlashes !== true) source += `${SLASH_LITERAL}?`;
    return source;
  };
  cjsModule.exports = parse;
});
export { require_parse };
