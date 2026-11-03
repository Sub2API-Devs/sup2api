/**
 * jsonc-parser/lib/esm/impl/string-intern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-kndsyy4v.js:5028-5078 esm-fingerprint
var mapped = Array(20)
  .fill(0)
  .map((e, s) => " ".repeat(s));
//@ chunk-kndsyy4v.js:5078-5455 esm-fingerprint
var H = {
    " ": {
      "\n": Array(200)
        .fill(0)
        .map(
          (e, s) =>
            `
` + " ".repeat(s),
        ),
      "\r": Array(200)
        .fill(0)
        .map((e, s) => "\r" + " ".repeat(s)),
      "\r\n": Array(200)
        .fill(0)
        .map(
          (e, s) =>
            `\r
` + " ".repeat(s),
        ),
    },
    "\t": {
      "\n": Array(200)
        .fill(0)
        .map(
          (e, s) =>
            `
` + "\t".repeat(s),
        ),
      "\r": Array(200)
        .fill(0)
        .map((e, s) => "\r" + "\t".repeat(s)),
      "\r\n": Array(200)
        .fill(0)
        .map(
          (e, s) =>
            `\r
` + "\t".repeat(s),
        ),
    },
  },
  K = [
    `
`,
    "\r",
    `\r
`,
  ];

export { K, mapped, H };
