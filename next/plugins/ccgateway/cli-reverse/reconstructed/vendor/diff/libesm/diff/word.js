/**
 * diff/libesm/diff/word.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-9dtasr5y.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Diff } from "../../libcjs/diff/base.js";
import {
  segment,
  leadingAndTrailingWs,
  longestCommonPrefix,
  replaceSuffix,
  stripPrefixOnce,
  longestCommonSuffix,
  replacePrefix,
  stripSuffixOnce,
  leadingWs,
  trailingWs,
  maximumOverlap,
} from "../../libcjs/util/string.js";

//@ chunk-9dtasr5y.js:4740-4907 esm-fingerprint
var extendedWordChars =
  "a-zA-Z0-9_\\u{AD}\\u{C0}-\\u{D6}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}";
var tokenizeIncludingWhitespace = new RegExp(`[${extendedWordChars}]+|\\s+|[^${extendedWordChars}]`, "ug");
//@ chunk-9dtasr5y.js:4907-5764 esm-fingerprint
class WordDiff extends Diff {
  equals(left, right, options) {
    if (options.ignoreCase) {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }
    return left.trim() === right.trim();
  }
  tokenize(value, options = {}) {
    let parts;
    if (options.intlSegmenter) {
      let segmenter = options.intlSegmenter;
      if (segmenter.resolvedOptions().granularity != "word")
        throw Error('The segmenter passed must have a granularity of "word"');
      parts = segment(value, segmenter);
    } else parts = value.match(tokenizeIncludingWhitespace) || [];
    let tokens = [];
    let prevPart = null;
    parts.forEach((part) => {
      if (/\s/.test(part)) {
        if (prevPart == null) tokens.push(part);
        else tokens.push(tokens.pop() + part);
      } else if (prevPart != null && /\s/.test(prevPart)) {
        if (tokens[tokens.length - 1] == prevPart) tokens.push(tokens.pop() + part);
        else tokens.push(prevPart + part);
      } else tokens.push(part);
      prevPart = part;
    });
    return tokens;
  }
  join(tokens) {
    return tokens
      .map((token, i) => {
        if (i == 0) return token;
        else return token.replace(/^\s+/, "");
      })
      .join("");
  }
  postProcess(changes, options) {
    if (!changes || options.oneChangePerToken) return changes;
    let lastKeep = null;
    let insertion = null;
    let deletion = null;
    changes.forEach((change) => {
      if (change.added) insertion = change;
      else if (change.removed) deletion = change;
      else {
        if (insertion || deletion)
          dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, change, options.intlSegmenter);
        lastKeep = change;
        insertion = null;
        deletion = null;
      }
    });
    if (insertion || deletion)
      dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, null, options.intlSegmenter);
    return changes;
  }
}
//@ chunk-9dtasr5y.js:5764-5776 esm-layout
var wordDiff = new WordDiff();
//@ chunk-9dtasr5y.js:5776-6496 esm-fingerprint
function dedupeWhitespaceInChangeObjects(startKeep, deletion, insertion, endKeep, segmenter) {
  if (deletion && insertion) {
    let [oldWsPrefix, oldWsSuffix] = leadingAndTrailingWs(deletion.value, segmenter);
    let [newWsPrefix, newWsSuffix] = leadingAndTrailingWs(insertion.value, segmenter);
    if (startKeep) {
      let commonWsPrefix = longestCommonPrefix(oldWsPrefix, newWsPrefix);
      startKeep.value = replaceSuffix(startKeep.value, newWsPrefix, commonWsPrefix);
      deletion.value = stripPrefixOnce(deletion.value, commonWsPrefix);
      insertion.value = stripPrefixOnce(insertion.value, commonWsPrefix);
    }
    if (endKeep) {
      let commonWsSuffix = longestCommonSuffix(oldWsSuffix, newWsSuffix);
      endKeep.value = replacePrefix(endKeep.value, newWsSuffix, commonWsSuffix);
      deletion.value = stripSuffixOnce(deletion.value, commonWsSuffix);
      insertion.value = stripSuffixOnce(insertion.value, commonWsSuffix);
    }
  } else if (insertion) {
    if (startKeep) {
      let ws = leadingWs(insertion.value, segmenter);
      insertion.value = insertion.value.substring(ws.length);
    }
    if (endKeep) {
      let ws = leadingWs(endKeep.value, segmenter);
      endKeep.value = endKeep.value.substring(ws.length);
    }
  } else if (startKeep && endKeep) {
    let newWsFull = leadingWs(endKeep.value, segmenter);
    let [delWsStart, delWsEnd] = leadingAndTrailingWs(deletion.value, segmenter);
    let newWsStart = longestCommonPrefix(newWsFull, delWsStart);
    deletion.value = stripPrefixOnce(deletion.value, newWsStart);
    let newWsEnd = longestCommonSuffix(stripPrefixOnce(newWsFull, newWsStart), delWsEnd);
    deletion.value = stripSuffixOnce(deletion.value, newWsEnd);
    endKeep.value = replacePrefix(endKeep.value, newWsFull, newWsEnd);
    startKeep.value = replaceSuffix(
      startKeep.value,
      newWsFull,
      newWsFull.slice(0, newWsFull.length - newWsEnd.length),
    );
  } else if (endKeep) {
    let endKeepWsPrefix = leadingWs(endKeep.value, segmenter);
    let deletionWsSuffix = trailingWs(deletion.value, segmenter);
    let overlap = maximumOverlap(deletionWsSuffix, endKeepWsPrefix);
    deletion.value = stripSuffixOnce(deletion.value, overlap);
  } else if (startKeep) {
    let startKeepWsSuffix = trailingWs(startKeep.value, segmenter);
    let deletionWsPrefix = leadingWs(deletion.value, segmenter);
    let overlap = maximumOverlap(startKeepWsSuffix, deletionWsPrefix);
    deletion.value = stripPrefixOnce(deletion.value, overlap);
  }
}
//@ chunk-9dtasr5y.js:6496-6614 esm-fingerprint
class WordsWithSpaceDiff extends Diff {
  tokenize(value) {
    let regex = new RegExp(`(\\r?\\n)|[${extendedWordChars}]+|[^\\S\\n\\r]+|[^${extendedWordChars}]`, "ug");
    return value.match(regex) || [];
  }
}
export { WordsWithSpaceDiff };
