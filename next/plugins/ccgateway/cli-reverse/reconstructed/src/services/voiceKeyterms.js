/**
 * services/voiceKeyterms.ts
 *
 * 语音识别关键词：全局术语表与从标识符/文件名拆词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/voiceKeyterms.ts
 * pieces: chunk-1vwpwerm.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-1vwpwerm.js:18916-19057 fingerprint (2.1.88 match: GLOBAL_KEYTERMS, 1)
var GLOBAL_KEYTERMS = [
  "MCP",
  "symlink",
  "grep",
  "regex",
  "localhost",
  "codebase",
  "TypeScript",
  "JSON",
  "OAuth",
  "webhook",
  "gRPC",
  "dotfiles",
  "subagent",
  "worktree",
];
//@ chunk-1vwpwerm.js:19057-19191 fingerprint (2.1.88 match: splitIdentifier, 1)
function splitIdentifier(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[-_./\s]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && word.length <= 20);
}
export { splitIdentifier, GLOBAL_KEYTERMS };
