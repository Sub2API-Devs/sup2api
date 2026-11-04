/**
 * utils/userAgent.ts
 *
 * Claude Code 的 UA 片段（claude-code/<版本>）构造。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/userAgent.ts
 * pieces: chunk-mz6f608r.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-mz6f608r.js:4378-4487 fingerprint (2.1.88 match: getClaudeCodeUserAgent, 0.492)
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
