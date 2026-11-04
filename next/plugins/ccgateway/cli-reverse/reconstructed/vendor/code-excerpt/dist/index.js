/**
 * code-excerpt/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: code-excerpt@4.0.0
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: esm-layout 1
 */
import { convertToSpaces_default } from "../../convert-to-spaces/dist/index.js";

//@ chunk-bzr73sfg.js:224159-224554 esm-layout
var generateLineNumbers = (line, around) => {
  let lineNumbers = [];
  let min = line - around;
  let max = line + around;
  for (let lineNumber = min; lineNumber <= max; lineNumber++) lineNumbers.push(lineNumber);
  return lineNumbers;
};
var codeExcerpt = (source, line, options = {}) => {
  var _a;
  if (typeof source !== "string") throw TypeError("Source code is missing.");
  if (!line || line < 1) throw TypeError("Line number must start from `1`.");
  let lines = convertToSpaces_default(source).split(/\r?\n/);
  if (line > lines.length) return;
  return generateLineNumbers(line, (_a = options.around) !== null && _a !== undefined ? _a : 3)
    .filter((line) => lines[line - 1] !== undefined)
    .map((line) => ({
      line,
      value: lines[line - 1],
    }));
};
var codeExcerpt_default = codeExcerpt;
export { codeExcerpt_default };
