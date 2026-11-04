/**
 * utils/redaction/urlParsing.ts
 *
 * 2.1.316 新增：收集需要遮盖的 URL 区间；找出文本中的 URL 片段与主机部分等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cgr0tezp.js (24)
 * attribution: placement 24
 */
import { tryParseUrl, decodePercentEscapes } from "../resultError.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-cgr0tezp.js:43695-43772 placement
/**
 * sliceSpan：按区间切出文本与来源。
 */
function sliceSpan(span, start, end) {
  return {
    text: span.text.slice(start, end),
    origin: span.origin.slice(start, end),
  };
}
//@ chunk-cgr0tezp.js:43772-44098 placement
/**
 * 解析 URL 协议与是否已改写。
 */
function parseUrlScheme(text, { asRewritten = false } = {}) {
  let trimmed = text.trimStart();
  let match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(trimmed);
  if (match) {
    let lower = match[1]?.toLowerCase();
    if (lower === "file") return null;
    if (lower === "http" || lower === "https") {
      let parsed = tryParseUrl(trimmed);
      return parsed?.hostname
        ? {
            host: parsed.hostname,
            path: parsed.pathname,
          }
        : null;
    }
    return findHostBoundary(decodePercentRuns(trimmed.slice(match[0].length)), "/");
  }
  return findHostBoundary(asRewritten ? decodePercentRuns(trimmed) : trimmed, ":");
}
//@ chunk-cgr0tezp.js:44098-44258 placement
function findBracketAndCut(text, separator) {
  let index = text.indexOf("@[");
  let bracketAt = index === -1 ? 0 : index + 1;
  let open = text[bracketAt] === "[" ? bracketAt : -1;
  let close = open === -1 ? -1 : text.indexOf("]", open + 1);
  let cut = text.indexOf(separator, close === -1 ? 0 : close + 1);
  return {
    open,
    close,
    cut,
  };
}
//@ chunk-cgr0tezp.js:44258-44794 placement
/**
 * 找出 URL 中主机部分的边界。
 */
function findHostBoundary(text, separator) {
  let { open, close, cut } = findBracketAndCut(text, separator);
  let searchFrom = open === -1 ? 0 : open;
  let index = text.indexOf("/");
  if (separator === ":" && (cut === -1 || (index !== -1 && index < text.indexOf(":")))) return null;
  let path = cut === -1 ? "" : text.slice(separator === ":" ? cut + 1 : cut);
  if (close !== -1) {
    let sliced = text.slice(close + 1, cut === -1 ? text.length : cut);
    let beforeParen = text.slice(0, searchFrom) + text.slice(searchFrom + 1, close);
    let candidate = stripPort(sliced) !== sliced ? beforeParen : stripPort(beforeParen);
    let sliced_2 = candidate.slice(candidate.lastIndexOf("@") + 1);
    let hostname = tryParseUrl(`ssh://[${sliced_2}]/`)?.hostname;
    return sliced_2
      ? {
          host: hostname || sliced_2,
          path,
        }
      : null;
  }
  let withoutPath = cut === -1 ? text : text.slice(0, cut);
  let sliced = withoutPath.slice(withoutPath.lastIndexOf("@") + 1);
  if (sliced.startsWith("[")) return null;
  let host = separator === "/" ? sliced.replace(/:\d*$/, "") : sliced;
  return host
    ? {
        host,
        path,
      }
    : null;
}
//@ chunk-cgr0tezp.js:44794-45000 placement
function userinfoSpans(text) {
  let { text: text_2, from } = decodePercentWithMap(text);
  let { close, cut } = findBracketAndCut(text_2, "/");
  let end = cut === -1 ? text_2.length : cut;
  let spans = [];
  let collect = (start, end) => {
    let index = text_2.lastIndexOf("@", end - 1);
    if (index >= start) spans.push([from(start), from(index)]);
  };
  if (close === -1) collect(0, end);
  else {
    collect(0, close);
    collect(close + 1, end);
  }
  return spans;
}
//@ chunk-cgr0tezp.js:45000-45124 placement
/**
 * 解码连续的百分号编码（失败保留）。
 */
function decodePercentRuns(text) {
  return text.replace(/(?:%(?!00)[0-9A-Fa-f]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return decodePercentEscapes(run);
    }
  });
}
//@ chunk-cgr0tezp.js:45124-45693 placement
/**
 * 百分号解码并保留位置映射。
 */
function decodePercentWithMap(text) {
  if (!text.includes("%"))
    return {
      text,
      from: (mapping) => mapping,
    };
  let map = [];
  let out = "";
  let cursor = 0;
  for (let percentRun of text.matchAll(/(?:%(?!00)[0-9A-Fa-f]{2})+/g)) {
    for (let index = cursor; index < percentRun.index; index++) map.push(index);
    out += text.slice(cursor, percentRun.index);
    let decoded;
    let byteLengths;
    try {
      decoded = decodeURIComponent(percentRun[0]);
      byteLengths = Array.from(decoded, (char) => {
        let codePoint = char.codePointAt(0);
        return codePoint < 128 ? 1 : codePoint < 2048 ? 2 : codePoint < 65536 ? 3 : 4;
      });
    } catch {
      decoded = decodePercentEscapes(percentRun[0]);
      byteLengths = Array.from(decoded, () => 1);
    }
    let index = percentRun.index;
    let charOffset = 0;
    for (let byteLength of byteLengths) {
      let codeUnitLength = decoded.codePointAt(charOffset) > 65535 ? 2 : 1;
      for (let j = 0; j < codeUnitLength; j++) map.push(index);
      charOffset += codeUnitLength;
      index += 3 * byteLength;
    }
    out += decoded;
    cursor = percentRun.index + percentRun[0].length;
  }
  for (let index = cursor; index <= text.length; index++) map.push(index);
  return {
    text: out + text.slice(cursor),
    from: (originalIndex) => map[originalIndex],
  };
}
//@ chunk-cgr0tezp.js:45693-45871 placement
function stripPort(value) {
  let index = value.indexOf(":");
  let sliced = value.slice(index + 1);
  if (index === -1 || !/^[ \t\n\v\f\r]*[+-]?\d+$/.test(sliced)) return value;
  let port = Number.parseInt(sliced.trim(), 10);
  return port >= 0 && port < 65536 ? value.slice(0, index) : value;
}
//@ chunk-cgr0tezp.js:45871-46236 placement
/**
 * URL 扫描用的正则组。
 */
var WHITESPACE_RE = /\s/g;
var LINE_BREAK_RE = /[\n\r\u2028\u2029]/g;
var ENCODED_AT_BRACKET_RE = /(?:@|%40)(?:\[|%5B)/gi;
var ENCODED_BRACKET_START_RE = /^(?:\[|%5B)/i;
var ENCODED_BRACKET_END_RE = /\]|%5D/gi;
var WEB_SCHEME_TAIL_RE = /(?:^|[^A-Za-z0-9+.-])(?:https?|wss?|ftps?)$/i;
var SSH_SCHEME_TAIL_RE = /(?:^|[^A-Za-z0-9+.-])(?:ssh|git|git\+ssh|ssh\+git)$/i;
var URL_DELIMITER_RE = /[,;|&]/g;
var SCHEME_TOKEN_RE = /(?:^|[^A-Za-z0-9+.-])[A-Za-z][A-Za-z0-9+.-]{0,31}$/;
var USERINFO_STOP_RE = /["'`|,;&<>()[\]\\@/?#]|%40|%5B/i;
var QUOTE_RE = /["'`]/;
var TERMINATOR_RE = /[;|&\n]/g;
var LINE_SPAN_COST = 64;
var MAX_SSH_USERINFO_SCAN = 2048;
var URL_SCAN_STOP_RE = /[\s"'`]/g;
//@ chunk-cgr0tezp.js:46236-46468 placement = ghIsDangerousCallback (1)
function findSshUrlUserinfoSpans(text) {
  let spans = [];
  let stopAt = nextMatchIndex(text, URL_SCAN_STOP_RE);
  let coveredUntil = 0;
  for (let index = text.indexOf("://"); index !== -1;) {
    let authorityStart = index + 3;
    if (index >= coveredUntil && SSH_SCHEME_TAIL_RE.test(text.slice(Math.max(0, index - 8), index))) {
      coveredUntil = Math.min(stopAt(authorityStart), authorityStart + MAX_SSH_USERINFO_SCAN);
      for (let [start, end] of userinfoSpans(text.slice(authorityStart, coveredUntil)))
        spans.push([authorityStart + start, authorityStart + end]);
    }
    index = text.indexOf("://", authorityStart);
  }
  return spans;
}
//@ chunk-cgr0tezp.js:46468-46503 placement
/**
 * urlSpans：文本中的 URL 片段。
 */
function urlSpans(text) {
  return findUrlSpans(text).spans;
}
//@ chunk-cgr0tezp.js:46503-47678 placement
/**
 * 找出文本中的 URL 片段与主机部分。
 */
function findUrlSpans(text) {
  let spans = [];
  let hostParts = [];
  let whitespace = nextMatchIndex(text, WHITESPACE_RE);
  let slash = nextMatchIndex(text, /\//g);
  let encodedAtBracket = cachedRegexExec(text, ENCODED_AT_BRACKET_RE);
  let encodedBracketEnd = nextMatchIndex(text, ENCODED_BRACKET_END_RE);
  let slashAfter = nextMatchIndex(text, /\//g);
  let terminator = nextMatchIndex(text, TERMINATOR_RE);
  let pathBreak = nextMatchIndex(text, /[/?#]/g);
  let urlDelimiter = nextMatchIndex(text, URL_DELIMITER_RE);
  let atSign = nextMatchIndex(text, /@/g);
  let encodedAt = nextMatchIndex(text, /%40/gi);
  let redactedMarker = nextMatchIndex(text, /\[REDACTED|\*\*\*:\*\*\*/g);
  let colonOrPercent = nextMatchIndex(text, /[:%]/g);
  let specialChar = nextMatchIndex(text, /["'`,;|&<>{}()]/g);
  let lastAtBeforePlain = lastAtBefore(text, false);
  let lastAtBeforeEncoded = lastAtBefore(text, true);
  for (let index = text.indexOf("://"); index !== -1;) {
    let authorityStart = index + 3;
    let bracketClose;
    let index_2 = text.indexOf("://", authorityStart);
    let whitespaceAt = whitespace(authorityStart);
    let atAt = atSign(authorityStart);
    let spanEnd;
    if (WEB_SCHEME_TAIL_RE.test(text.slice(Math.max(0, index - 8), index))) {
      let min = Math.min(pathBreak(authorityStart), whitespaceAt);
      let min_2 = Math.min(urlDelimiter(authorityStart), min);
      spanEnd =
        atAt < min
          ? Math.max(lastAtBeforePlain(authorityStart, min), lastAtBeforeEncoded(atAt, min))
          : Math.max(
              lastAtBeforePlain(authorityStart, Math.min(slash(authorityStart), whitespaceAt)),
              lastAtBeforeEncoded(authorityStart, min_2),
            );
      if (spanEnd <= authorityStart) {
        let min_3 = Math.min(min, terminator(authorityStart));
        hostParts.push({
          start: authorityStart,
          fieldEnd: Math.min(min_2, min_3),
          lastEncodedAt: lastAtBeforeEncoded(authorityStart, min_3),
        });
      }
    } else {
      let min = Math.min(slash(authorityStart), whitespaceAt);
      let min_2 = Math.min(whitespaceAt, index_2 === -1 ? text.length : index_2);
      let matches = SSH_SCHEME_TAIL_RE.test(text.slice(Math.max(0, index - 8), index));
      let encodedMatch = matches ? encodedAtBracket(authorityStart) : null;
      let bracketStartMatch = matches
        ? ENCODED_BRACKET_START_RE.exec(text.slice(authorityStart, authorityStart + 3))
        : null;
      let candidates = [
        [bracketStartMatch !== null ? authorityStart + bracketStartMatch[0].length : -1, min_2],
        [
          encodedMatch !== null && encodedMatch.index < min_2
            ? encodedMatch.index + encodedMatch[0].length
            : -1,
          whitespaceAt,
        ],
      ];
      for (let [start, limit] of candidates) {
        let closeIndex = start === -1 ? whitespaceAt : encodedBracketEnd(start);
        if (closeIndex < limit) {
          bracketClose = Math.max(bracketClose ?? closeIndex, closeIndex);
          min = Math.max(min, Math.min(slashAfter(closeIndex), whitespaceAt));
        }
      }
      spanEnd = Math.max(lastAtBeforePlain(authorityStart, min), lastAtBeforeEncoded(authorityStart, min));
    }
    if (spanEnd > authorityStart)
      spans.push({
        start: authorityStart,
        end: spanEnd,
        separatorEnd: spanEnd + (text[spanEnd] === "@" ? 1 : 3),
        loginEnd: atAt <= spanEnd ? atAt : Math.min(encodedAt(authorityStart), spanEnd),
        bracketClose,
      });
    else {
      let redactedAt = redactedMarker(authorityStart);
      if (
        redactedAt > authorityStart &&
        redactedAt < Math.min(whitespaceAt, slash(authorityStart), specialChar(authorityStart)) &&
        colonOrPercent(authorityStart) < redactedAt
      )
        spans.push({
          start: authorityStart,
          end: redactedAt,
          separatorEnd: redactedAt,
          loginEnd: redactedAt,
        });
    }
    index = index_2;
  }
  return {
    spans,
    hostParts,
  };
}
//@ chunk-cgr0tezp.js:47678-49063 placement
/**
 * 收集需要遮盖的 URL 区间。
 */
function collectUrlRedactions(text, rules) {
  let { spans, hostParts } = findUrlSpans(text);
  if (spans.length === 0 && hostParts.length === 0) return [];
  let fieldBoundary = nextMatchIndex(text, /[\s"'>}|,;&`)\]]/g);
  let whitespaceAt = nextMatchIndex(text, /\s/g);
  let redactions = [];
  let merged = [];
  for (let span of spans) {
    redactions.push({
      start: span.start,
      end: span.end,
      loginEnd: span.loginEnd,
    });
    merged.push({
      ...span,
      userinfo: span,
    });
  }
  let keyValueSecrets = findKeyValueSecrets(text, rules);
  for (let hostPart of hostParts) {
    let secret = keyValueSecrets(hostPart.start)[0];
    if (
      secret &&
      secret.keyStart < hostPart.fieldEnd &&
      text.slice(hostPart.start, secret.keyStart).includes("%")
    ) {
      let end = hostPart.lastEncodedAt > secret.keyStart ? hostPart.lastEncodedAt : secret.valueStart;
      redactions.push({
        start: hostPart.start,
        end,
        loginEnd: end,
      });
      merged.push(
        end > secret.valueStart
          ? {
              start: hostPart.start,
              end,
              userinfo: {
                start: hostPart.start,
                end,
                separatorEnd: end + 3,
                loginEnd: end,
              },
            }
          : {
              start: hostPart.start,
              end,
            },
      );
    }
  }
  if (merged.length === 0) return [];
  redactions.sort((left, right) => left.start - right.start);
  let keyValueSecrets_2 = findKeyValueSecrets(text, rules);
  let redactionCursor = 0;
  for (let fromIndex = 0, secrets = keyValueSecrets_2(fromIndex); secrets[0] !== undefined;) {
    let secret;
    let valueEnd = null;
    for (let candidate of secrets) {
      valueEnd = candidate.valueEnd();
      if (valueEnd !== null) {
        secret = candidate;
        break;
      }
    }
    if (secret === undefined || valueEnd === null) {
      fromIndex = secrets[0].keyStart + 1;
      secrets = keyValueSecrets_2(fromIndex);
      continue;
    }
    while (redactionCursor < redactions.length && redactions[redactionCursor].start <= secret.keyStart)
      redactionCursor++;
    let redaction = redactions[redactionCursor];
    if (redaction !== undefined && redaction.start < valueEnd) {
      let quoteChar = text[secret.valueStart] ?? "";
      let end =
        (quoteChar === '"' || quoteChar === "'") &&
        valueEnd - 1 > secret.valueStart &&
        text[valueEnd - 1] === quoteChar
          ? Math.max(valueEnd, redaction.end)
          : whitespaceAt(Math.max(valueEnd, redaction.end, fieldBoundary(redaction.loginEnd + 1)));
      merged.push({
        start: secret.valueStart,
        end,
      });
    }
    fromIndex = valueEnd;
    secrets = keyValueSecrets_2(fromIndex);
  }
  let context = {
    nextKey: findKeyValueSecrets(text, rules),
    plainKeys: findKeyValueSecrets(text, rules),
    nextLineEnd: nextMatchIndex(text, LINE_BREAK_RE),
    span: 0,
    lineEnd: -1,
    resumeAt: 0,
    overflowEnd: quoteBoundary(text, () => context.lineEnd),
  };
  let out = [];
  for (let span of mergeSpans(merged)) {
    let last = out.at(-1);
    out.push(
      last !== undefined && span.start < last.end
        ? extendUrlSpan(
            text,
            {
              start: out.pop().start,
              end: Math.max(last.end, span.end),
            },
            context,
          )
        : extendUrlSpan(text, span, context),
    );
  }
  return out.map((span) => (span.userinfo ? span : trimUnbalancedQuote(text, span)));
}
//@ chunk-cgr0tezp.js:49063-49082 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cgr0tezp.js:49063", () => {
  weakMap = new WeakMap();
});
//@ chunk-cgr0tezp.js:49082-49287 placement
function compileSecretRegexes(rule) {
  let regexes = weakMap.get(rule);
  if (!regexes) {
    regexes = {
      word: new RegExp(rule.word, "gi"),
      notTail: new RegExp(`(?!${rule.tail})[^]`, "gi"),
      separator: new RegExp(rule.separator, "iy"),
      value: new RegExp(rule.value, "iy"),
    };
    weakMap.set(rule, regexes);
  }
  return regexes;
}
//@ chunk-cgr0tezp.js:49287-49958 placement
/**
 * 按关键词查找键值对形式的秘密。
 */
function findKeyValueSecrets(text, rules) {
  let mapped = rules.map((rule) => {
    let { word, notTail, separator, value } = compileSecretRegexes(rule);
    let wordMatches = cachedRegexExec(text, word);
    let notTailIndex = nextMatchIndex(text, notTail);
    let lastSeparatorFrom = -1;
    let separatorEnd = -1;
    let lastValueFrom = -1;
    let valueEnd = null;
    let valueEndFrom = (from) => {
      if (from !== lastValueFrom) {
        lastValueFrom = from;
        value.lastIndex = from;
        valueEnd = value.test(text) ? value.lastIndex : null;
      }
      return valueEnd;
    };
    let separatorEndFrom = (from) => {
      if (from !== lastSeparatorFrom) {
        lastSeparatorFrom = from;
        separator.lastIndex = from;
        separatorEnd = separator.test(text) ? separator.lastIndex : -1;
      }
      return separatorEnd;
    };
    let cachedFrom = -1;
    let cachedSecret = null;
    return (from) => {
      if (cachedFrom !== -1 && from >= cachedFrom && (cachedSecret === null || from <= cachedSecret.keyStart))
        return cachedSecret;
      cachedFrom = from;
      cachedSecret = null;
      for (let match = wordMatches(from); match !== null;) {
        let keyEnd = match.index + match[0].length;
        let valueStart = separatorEndFrom(rule.tail ? notTailIndex(keyEnd) : keyEnd);
        if (valueStart !== -1) {
          cachedSecret = {
            keyStart: match.index,
            valueStart,
            valueEnd: () => valueEndFrom(valueStart),
          };
          break;
        }
        match = wordMatches(match.index + 1);
      }
      return cachedSecret;
    };
  });
  return (from) => {
    let found = [];
    for (let finder of mapped) {
      let secret = finder(from);
      if (secret && (!found[0] || secret.keyStart <= found[0].keyStart))
        found = found[0] && secret.keyStart === found[0].keyStart ? [...found, secret] : [secret];
    }
    return found;
  };
}
//@ chunk-cgr0tezp.js:49958-50515 placement
/**
 * 扩展 URL 区间（包含 userinfo）。
 */
function extendUrlSpan(text, span, context) {
  if (span.userinfo && isEmailLikeSecret(text, span.userinfo, context)) return span;
  let end = span.end;
  context.resumeAt = Math.max(context.resumeAt, span.start);
  for (
    let secrets = context.nextKey(context.resumeAt);
    secrets[0] !== undefined && secrets[0].keyStart < end;
  ) {
    let keyStart = secrets[0].keyStart;
    if (keyStart > context.lineEnd) {
      let nextLineEnd = context.nextLineEnd(keyStart);
      context.span = LINE_SPAN_COST * (nextLineEnd - context.lineEnd);
      context.lineEnd = nextLineEnd;
    }
    let valueEnd = null;
    let secret = secrets[0];
    for (let candidateSecret of secrets) {
      valueEnd = candidateSecret.valueEnd();
      if (valueEnd !== null) {
        secret = candidateSecret;
        break;
      }
    }
    let valueEndIndex = valueEnd ?? secret.valueStart;
    context.span -= valueEndIndex - keyStart;
    if (context.span < 0)
      return {
        start: span.start,
        end: Math.max(end, context.overflowEnd(span.start)),
      };
    end = Math.max(end, valueEndIndex);
    context.resumeAt = secret.valueStart;
    secrets = context.nextKey(context.resumeAt);
  }
  return end === span.end
    ? span
    : {
        start: span.start,
        end,
      };
}
//@ chunk-cgr0tezp.js:50515-50799 placement
function isEmailLikeSecret(text, userinfo, context) {
  if (
    text[userinfo.end] !== "@" ||
    USERINFO_STOP_RE.test(text.slice(userinfo.start, userinfo.end)) ||
    !SCHEME_TOKEN_RE.test(text.slice(Math.max(0, userinfo.start - 36), userinfo.start - 3))
  )
    return false;
  for (
    let secrets = context.plainKeys(userinfo.start);
    secrets[0] !== undefined && secrets[0].keyStart < userinfo.end;
    secrets = context.plainKeys(secrets[0].keyStart + 1)
  )
    if (secrets.some((secret) => secret.valueStart === userinfo.end)) return false;
  return true;
}
//@ chunk-cgr0tezp.js:50799-50911 placement
function quoteBoundary(text, lineEnd) {
  let quotes = nextMatchIndex(text, /["'`]/g);
  let cachedLineEnd = -1;
  let boundary = text.length;
  return (from) => {
    if (lineEnd() !== cachedLineEnd) {
      cachedLineEnd = lineEnd();
      boundary = quotes(from) < cachedLineEnd ? text.length : cachedLineEnd;
    }
    return boundary;
  };
}
//@ chunk-cgr0tezp.js:50911-51066 placement
function trimUnbalancedQuote(text, span) {
  let lastChar = text[span.end - 1];
  if (lastChar === undefined || !QUOTE_RE.test(lastChar)) return span;
  return (text.slice(span.start, span.end).split(lastChar).length - 1) % 2 === 1
    ? {
        start: span.start,
        end: span.end - 1,
      }
    : span;
}
//@ chunk-cgr0tezp.js:51066-51275 placement
function mergeSpans(spans) {
  spans.sort((left, right) => left.start - right.start || right.end - left.end);
  let merged = [];
  for (let span of spans) {
    let last = merged.at(-1);
    if (last === undefined || span.start >= last.end) merged.push(span);
    else
      merged[merged.length - 1] = {
        start: last.start,
        end: Math.max(last.end, span.end),
      };
  }
  return merged;
}
//@ chunk-cgr0tezp.js:51275-51338 placement
function nextMatchIndex(text, pattern) {
  let exec = cachedRegexExec(text, pattern);
  return (from) => exec(from)?.index ?? text.length;
}
//@ chunk-cgr0tezp.js:51338-51459 placement
function cachedRegexExec(text, pattern) {
  let cachedFrom = -1;
  let match = null;
  return (from) => {
    if (cachedFrom === -1 || from < cachedFrom || (match !== null && from > match.index)) {
      pattern.lastIndex = from;
      match = pattern.exec(text);
      cachedFrom = from;
    }
    return match;
  };
}
//@ chunk-cgr0tezp.js:51459-51715 placement
function lastAtBefore(text, encoded) {
  let table = null;
  return (from, to) => {
    if (table === null) {
      table = new Int32Array(text.length + 1);
      let lastAt = -1;
      for (let j = 0; j <= text.length; j++) {
        if (encoded) {
          if (j >= 3 && text.startsWith("%40", j - 3)) lastAt = j - 3;
        } else if (j >= 1 && text[j - 1] === "@") lastAt = j - 1;
        table[j] = lastAt;
      }
    }
    let atIndex = table[Math.min(to, text.length)];
    return atIndex >= from ? atIndex : -1;
  };
}
export {
  collectUrlRedactions,
  findSshUrlUserinfoSpans,
  sliceSpan,
  decodePercentRuns,
  parseUrlScheme,
  urlSpans,
  WEB_SCHEME_TAIL_RE,
};
