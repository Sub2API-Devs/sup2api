/**
 * services/voiceKeyterms.ts
 *
 * 语音识别关键词：全局术语表与从标识符/文件名拆词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/voiceKeyterms.ts
 * pieces: chunk-a658aeqp.js (3)
 * attribution: fingerprint 2, file-local 1
 */
import { basename } from "path";

//@ chunk-a658aeqp.js:18589-18730 fingerprint = GLOBAL_KEYTERMS (1)
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
//@ chunk-a658aeqp.js:18730-18864 fingerprint = splitIdentifier (1)
function splitIdentifier(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[-_./\s]+/)
    .map((i) => i.trim())
    .filter((i) => i.length > 2 && i.length <= 20);
}
//@ chunk-a658aeqp.js:18864-18925 file-local
function fileNameWords(filePath) {
  let stem = basename(filePath).replace(/\.[^.]+$/, "");
  return splitIdentifier(stem);
}
export { splitIdentifier, GLOBAL_KEYTERMS, fileNameWords };
