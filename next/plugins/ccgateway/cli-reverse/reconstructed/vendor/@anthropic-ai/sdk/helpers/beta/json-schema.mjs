/**
 * @anthropic-ai/sdk/helpers/beta/json-schema.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2cw52qnf.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-2cw52qnf.js:512-796 esm-fingerprint
function betaTool(options) {
  if (options.inputSchema.type !== "object")
    throw Error(
      `JSON schema for tool "${options.name}" must be an object, but got ${options.inputSchema.type}`,
    );
  return {
    type: "custom",
    name: options.name,
    input_schema: options.inputSchema,
    description: options.description,
    run: options.run,
    parse: (content) => content,
    ...(options.close
      ? {
          close: options.close,
        }
      : {}),
  };
}
export { betaTool };
