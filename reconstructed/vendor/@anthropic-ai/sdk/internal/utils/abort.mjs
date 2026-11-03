/**
 * @anthropic-ai/sdk/internal/utils/abort.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-hwmsct5x.js:55405-55572 esm-fingerprint
function qt(e, n) {
  if (!e) return () => {};
  if (e.aborted) return (n.abort(), () => {});
  let r = () => n.abort();
  return (e.addEventListener("abort", r), () => e.removeEventListener("abort", r));
}

export { qt };
