/**
 * diff/libesm/patch/create.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-9dtasr5y.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { diffLines } from "../diff/line.js";

//@ chunk-9dtasr5y.js:9181-10494 esm-fingerprint
function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  let optionsObj;
  if (!options) optionsObj = {};
  else if (typeof options === "function")
    optionsObj = {
      callback: options,
    };
  else optionsObj = options;
  if (typeof optionsObj.context === "undefined") optionsObj.context = 4;
  let context = optionsObj.context;
  if (optionsObj.newlineIsToken)
    throw Error(
      "newlineIsToken may not be used with patch-generation functions, only with diffing functions",
    );
  if (!optionsObj.callback) return diffLinesResultToPatch(diffLines(oldStr, newStr, optionsObj));
  else {
    let { callback } = optionsObj;
    diffLines(
      oldStr,
      newStr,
      Object.assign(Object.assign({}, optionsObj), {
        callback: (diff) => {
          let patch = diffLinesResultToPatch(diff);
          callback(patch);
        },
      }),
    );
  }
  function diffLinesResultToPatch(diff) {
    if (!diff) return;
    diff.push({
      value: "",
      lines: [],
    });
    function contextLines(lines) {
      return lines.map(function (entry) {
        return " " + entry;
      });
    }
    let hunks = [];
    let oldRangeStart = 0;
    let newRangeStart = 0;
    let curRange = [];
    let oldLine = 1;
    let newLine = 1;
    for (let i = 0; i < diff.length; i++) {
      let current = diff[i];
      let lines = current.lines || splitLines(current.value);
      current.lines = lines;
      if (current.added || current.removed) {
        if (!oldRangeStart) {
          let prev = diff[i - 1];
          oldRangeStart = oldLine;
          newRangeStart = newLine;
          if (prev) {
            curRange = context > 0 ? contextLines(prev.lines.slice(-context)) : [];
            oldRangeStart -= curRange.length;
            newRangeStart -= curRange.length;
          }
        }
        for (let line of lines) curRange.push((current.added ? "+" : "-") + line);
        if (current.added) newLine += lines.length;
        else oldLine += lines.length;
      } else {
        if (oldRangeStart)
          if (lines.length <= context * 2 && i < diff.length - 2)
            for (let line of contextLines(lines)) curRange.push(line);
          else {
            let contextSize = Math.min(lines.length, context);
            for (let line of contextLines(lines.slice(0, contextSize))) curRange.push(line);
            let hunk = {
              oldStart: oldRangeStart,
              oldLines: oldLine - oldRangeStart + contextSize,
              newStart: newRangeStart,
              newLines: newLine - newRangeStart + contextSize,
              lines: curRange,
            };
            hunks.push(hunk);
            oldRangeStart = 0;
            newRangeStart = 0;
            curRange = [];
          }
        oldLine += lines.length;
        newLine += lines.length;
      }
    }
    for (let hunk of hunks)
      for (let i = 0; i < hunk.lines.length; i++)
        if (
          hunk.lines[i].endsWith(`
`)
        )
          hunk.lines[i] = hunk.lines[i].slice(0, -1);
        else {
          hunk.lines.splice(i + 1, 0, "\\ No newline at end of file");
          i++;
        }
    return {
      oldFileName,
      newFileName,
      oldHeader,
      newHeader,
      hunks,
    };
  }
}
//@ chunk-9dtasr5y.js:10494-10616 esm-fingerprint
function splitLines(text) {
  let hasTrailingNl = text.endsWith(`
`);
  let result = text
    .split(
      `
`,
    )
    .map(
      (line) =>
        line +
        `
`,
    );
  if (hasTrailingNl) result.pop();
  else result.push(result.pop().slice(0, -1));
  return result;
}
export { structuredPatch };
