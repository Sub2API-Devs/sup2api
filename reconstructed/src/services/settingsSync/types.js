/**
 * services/settingsSync/types.ts
 *
 * 设置同步的条目键（~/.claude/CLAUDE.md、~/.claude/rules/ 等）与提示文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/settingsSync/types.ts
 * pieces: chunk-c55mbvfz.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-c55mbvfz.js:16984-17111 fingerprint = SYNC_KEYS (0.365)
function SYNC_KEYS(filePath) {
  let match = /[\\/]\.claude[\\/]rules[\\/]([^\\/]+)$/.exec(filePath);
  return match ? `~/.claude/rules/${match[1]}` : "~/.claude/CLAUDE.md";
}
export { SYNC_KEYS };
