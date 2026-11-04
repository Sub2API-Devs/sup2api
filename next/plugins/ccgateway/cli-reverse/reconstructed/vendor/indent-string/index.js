/**
 * indent-string/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: indent-string@5.0.0
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-bzr73sfg.js:287550-288084 esm-fingerprint
function indentString(input, count = 1, options = {}) {
  let { indent = " ", includeEmptyLines = false } = options;
  if (typeof input !== "string")
    throw TypeError(`Expected \`input\` to be a \`string\`, got \`${typeof input}\``);
  if (typeof count !== "number")
    throw TypeError(`Expected \`count\` to be a \`number\`, got \`${typeof count}\``);
  if (count < 0) throw RangeError(`Expected \`count\` to be at least 0, got \`${count}\``);
  if (typeof indent !== "string")
    throw TypeError(`Expected \`options.indent\` to be a \`string\`, got \`${typeof indent}\``);
  if (count === 0) return input;
  let regex = includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
  return input.replace(regex, indent.repeat(count));
}
export { indentString };
