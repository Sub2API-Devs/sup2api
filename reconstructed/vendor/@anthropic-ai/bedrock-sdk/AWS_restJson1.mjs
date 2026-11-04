/**
 * @anthropic-ai/bedrock-sdk/AWS_restJson1.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (1)
 * attribution: esm-layout 1
 */

//@ chunk-h87x8cg3.js:6808-6863 esm-layout
var tryParseJson = (body) => {
  try {
    return JSON.parse(body);
  } catch (error) {
    return;
  }
};
export { tryParseJson };
