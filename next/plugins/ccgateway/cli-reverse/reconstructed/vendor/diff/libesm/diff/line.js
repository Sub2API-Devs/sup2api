/**
 * diff/libesm/diff/line.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-9dtasr5y.js (6)
 * attribution: esm-layout 2, esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { WordsWithSpaceDiff } from "./word.js";
import { Diff } from "../../libcjs/diff/base.js";

//@ chunk-9dtasr5y.js:6614-6626 esm-layout
var wordsWithSpaceDiff = new WordsWithSpaceDiff();
//@ chunk-9dtasr5y.js:6626-6667 esm-fingerprint
function diffWordsWithSpace(oldText, newText, options) {
  return wordsWithSpaceDiff.diff(oldText, newText, options);
}
//@ chunk-9dtasr5y.js:6667-7019 esm-fingerprint
class _ extends Diff {
  constructor() {
    super(...arguments);
    this.tokenize = tokenize;
  }
  equals(left, right, options) {
    if (options.ignoreWhitespace) {
      if (
        !options.newlineIsToken ||
        !left.includes(`
`)
      )
        left = left.trim();
      if (
        !options.newlineIsToken ||
        !right.includes(`
`)
      )
        right = right.trim();
    } else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
      if (
        left.endsWith(`
`)
      )
        left = left.slice(0, -1);
      if (
        right.endsWith(`
`)
      )
        right = right.slice(0, -1);
    }
    return super.equals(left, right, options);
  }
}
//@ chunk-9dtasr5y.js:7019-7031 esm-layout
var lineDiff = new _();
//@ chunk-9dtasr5y.js:7031-7072 esm-fingerprint
function diffLines(oldStr, newStr, options) {
  return lineDiff.diff(oldStr, newStr, options);
}
//@ chunk-9dtasr5y.js:7072-7298 esm-fingerprint
function tokenize(value, options) {
  if (options.stripTrailingCr)
    value = value.replace(
      /\r\n/g,
      `
`,
    );
  let retLines = [];
  let linesAndNewlines = value.split(/(\n|\r\n)/);
  if (!linesAndNewlines[linesAndNewlines.length - 1]) linesAndNewlines.pop();
  for (let i = 0; i < linesAndNewlines.length; i++) {
    let line = linesAndNewlines[i];
    if (i % 2 && !options.newlineIsToken) retLines[retLines.length - 1] += line;
    else retLines.push(line);
  }
  return retLines;
}
export { diffLines, diffWordsWithSpace };
