/**
 * @anthropic-ai/sdk/helpers/beta/json-schema.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2cw52qnf.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-2cw52qnf.js:512-796 esm-fingerprint
function R(r) {
  if (r.inputSchema.type !== "object")
    throw Error(`JSON schema for tool "${r.name}" must be an object, but got ${r.inputSchema.type}`);
  return {
    type: "custom",
    name: r.name,
    input_schema: r.inputSchema,
    description: r.description,
    run: r.run,
    parse: (e) => e,
    ...(r.close ? { close: r.close } : {}),
  };
}

export { R };
