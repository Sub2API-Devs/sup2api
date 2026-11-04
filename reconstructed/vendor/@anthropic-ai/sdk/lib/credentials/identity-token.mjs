/**
 * @anthropic-ai/sdk/lib/credentials/identity-token.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (2)
 * attribution: esm-fingerprint 2
 */
import { AnthropicError } from "../../core/error.mjs";

//@ chunk-3wydcdvj.js:8059-8395 esm-fingerprint
function identityTokenFromFile(path) {
  if (!path) throw new AnthropicError("Identity token file path is empty");
  return async () => {
    let { fs } = await import("../../../../../src/child_process.lazy.js");
    let content;
    try {
      content = await fs.promises.readFile(path, "utf-8");
    } catch (err) {
      throw new AnthropicError(`Failed to read identity token file at ${path}: ${err}`);
    }
    let token = content.trim();
    if (!token) throw new AnthropicError(`Identity token file at ${path} is empty`);
    return token;
  };
}
//@ chunk-3wydcdvj.js:8395-8473 esm-fingerprint
function identityTokenFromValue(token) {
  if (!token) throw new AnthropicError("Identity token value is empty");
  return () => token;
}
export { identityTokenFromFile, identityTokenFromValue };
