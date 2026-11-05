/**
 * @anthropic-ai/sandbox-runtime/dist/utils/shell-quote.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-qg41pqt6.js:720467-720638 esm-fingerprint
function quote(args) {
  return args
    .map((arg) => {
      if (arg === "") return "''";
      if (/^[A-Za-z0-9_./:@+,-][A-Za-z0-9_./:=@+,-]*$/.test(arg)) return arg;
      return "'" + arg.replace(/'/g, `'"'"'`) + "'";
    })
    .join(" ");
}
export { quote };
