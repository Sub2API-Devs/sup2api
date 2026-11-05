/**
 * services/settingsSync/types.ts
 *
 * 设置同步的条目键（~/.claude/CLAUDE.md、~/.claude/rules/ 等）与提示文本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/settingsSync/types.ts
 * pieces: chunk-dzt5bmy4.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-dzt5bmy4.js:18176-18303 fingerprint (2.1.88 match: SYNC_KEYS, 0.365)
function SYNC_KEYS(filePath) {
  let match = /[\\/]\.claude[\\/]rules[\\/]([^\\/]+)$/.exec(filePath);
  return match ? `~/.claude/rules/${match[1]}` : "~/.claude/CLAUDE.md";
}
export { SYNC_KEYS };
