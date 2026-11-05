/**
 * @anthropic-ai/bedrock-sdk/AWS_restJson1.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (1)
 * attribution: esm-layout 1
 */

//@ chunk-b8zxeazh.js:6808-6863 esm-layout
var tryParseJson = (body) => {
  try {
    return JSON.parse(body);
  } catch (error) {
    return;
  }
};
export { tryParseJson };
