/**
 * @anthropic-ai/sdk/lib/credentials/identity-token.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (2)
 * attribution: esm-fingerprint 2
 */
import { pr } from "../../core/error.mjs";

//@ chunk-3wydcdvj.js:8059-8395 esm-fingerprint
function P(e) {
  if (!e) throw new pr("Identity token file path is empty");
  return async () => {
    let { fs: fs } = await import("./chunk-a60jm9e8.js"),
      r;
    try {
      r = await fs.promises.readFile(e, "utf-8");
    } catch (error) {
      throw new pr(`Failed to read identity token file at ${e}: ${error}`);
    }
    let trimmed = r.trim();
    if (!trimmed) throw new pr(`Identity token file at ${e} is empty`);
    return trimmed;
  };
}
//@ chunk-3wydcdvj.js:8395-8473 esm-fingerprint
function V(e) {
  if (!e) throw new pr("Identity token value is empty");
  return () => e;
}

export { P, V };
