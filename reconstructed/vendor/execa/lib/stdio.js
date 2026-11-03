/**
 * execa/lib/stdio.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-m4p5zn6n.js:15759-16262 esm-fingerprint
var ie = ["stdin", "stdout", "stderr"],
  Ur = (e) => ie.some((n) => e[n] !== void 0),
  Yt = (e) => {
    if (!e) return;
    let { stdio: stdio } = e;
    if (stdio === void 0) return ie.map((o) => e[o]);
    if (Ur(e))
      throw Error(
        `It's not possible to provide \`stdio\` in combination with one of ${ie.map((o) => `\`${o}\``).join(", ")}`,
      );
    if (typeof stdio === "string") return stdio;
    if (!Array.isArray(stdio))
      throw TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio}\``);
    let max = Math.max(stdio.length, ie.length);
    return Array.from({ length: max }, (o, s) => stdio[s]);
  };

export { Yt };
