/**
 * utils/userAgent.ts
 *
 * Claude Code 的 UA 片段（claude-code/<版本>）构造。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/userAgent.ts
 * pieces: chunk-9dxf3ckd.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-9dxf3ckd.js:4739-4848 fingerprint (2.1.88 match: getClaudeCodeUserAgent, 0.492)
function getClaudeCodeUserAgent(options) {
  return {
    params: {
      entrypoint: options.entrypoint,
      model: options.model,
    },
    userAgent: `claude-code/${options.ccVersion}`,
  };
}
export { getClaudeCodeUserAgent };
