/**
 * hooks/useTeammateViewAutoExit.ts
 *
 * 被查看的队友任务结束后自动退出队友视图。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTeammateViewAutoExit.ts
 * pieces: chunk-wrq65rh8.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-wrq65rh8.js:7275-7437 fingerprint (2.1.88 match: useTeammateViewAutoExit, 0.626)
function useTeammateViewAutoExit(status) {
  switch (status) {
    case "pending":
    case "running":
    case "paused":
      return "working";
    case "completed":
    case "failed":
      return "completed";
    case "killed":
      return "cancelled";
  }
}
export { useTeammateViewAutoExit };
