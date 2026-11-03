/**
 * @anthropic-ai/sandbox-runtime/dist/utils/shell-quote.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-fq0cr76a.js:718785-718956 esm-fingerprint
function zee(e) {
  return e
    .map((n) => {
      if (n === "") return "''";
      if (/^[A-Za-z0-9_./:@+,-][A-Za-z0-9_./:=@+,-]*$/.test(n)) return n;
      return "'" + n.replace(/'/g, `'"'"'`) + "'";
    })
    .join(" ");
}

export { zee };
