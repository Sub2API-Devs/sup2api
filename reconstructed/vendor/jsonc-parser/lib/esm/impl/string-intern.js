/**
 * jsonc-parser/lib/esm/impl/string-intern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-kndsyy4v.js:5028-5078 esm-fingerprint
var cachedSpaces = Array(20)
  .fill(0)
  .map((_, index) => " ".repeat(index));
//@ chunk-kndsyy4v.js:5078-5455 esm-fingerprint
var cachedBreakLinesWithSpaces = {
  " ": {
    "\n": Array(200)
      .fill(0)
      .map(
        (_, index) =>
          `
` + " ".repeat(index),
      ),
    "\r": Array(200)
      .fill(0)
      .map((_, index) => "\r" + " ".repeat(index)),
    "\r\n": Array(200)
      .fill(0)
      .map(
        (_, index) =>
          `\r
` + " ".repeat(index),
      ),
  },
  "\t": {
    "\n": Array(200)
      .fill(0)
      .map(
        (_, index) =>
          `
` + "\t".repeat(index),
      ),
    "\r": Array(200)
      .fill(0)
      .map((_, index) => "\r" + "\t".repeat(index)),
    "\r\n": Array(200)
      .fill(0)
      .map(
        (_, index) =>
          `\r
` + "\t".repeat(index),
      ),
  },
};
var K = [
  `
`,
  "\r",
  `\r
`,
];
export { K, cachedSpaces, cachedBreakLinesWithSpaces };
