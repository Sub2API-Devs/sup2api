/**
 * @anthropic-ai/sdk/lib/tools/ToolError.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-vn3g7zt8.js:61066-61281 esm-fingerprint
var ToolError = (() => {
  class ToolError extends Error {
    constructor(content) {
      let message =
        typeof content === "string"
          ? content
          : content
              .map((block) => {
                if (block.type === "text") return block.text;
                return `[${block.type}]`;
              })
              .join(" ");
      super(message);
      this.name = "ToolError";
      this.content = content;
    }
  }
  return ToolError;
})();
export { ToolError };
