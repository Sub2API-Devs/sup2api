/**
 * @anthropic-ai/sdk/lib/tools/ToolError.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-hwmsct5x.js:60695-60910 esm-fingerprint
var ch = (() => {
  class ToolError extends Error {
    constructor(n) {
      let r =
        typeof n === "string"
          ? n
          : n
              .map((s) => {
                if (s.type === "text") return s.text;
                return `[${s.type}]`;
              })
              .join(" ");
      super(r);
      ((this.name = "ToolError"), (this.content = n));
    }
  }
  return ToolError;
})();

export { ch };
