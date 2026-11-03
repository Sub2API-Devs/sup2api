/**
 * hooks/useTeammateViewAutoExit.ts
 *
 * 被查看的队友任务结束后自动退出队友视图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTeammateViewAutoExit.ts
 * pieces: chunk-fym4r1th.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-fym4r1th.js:6681-6843 fingerprint = useTeammateViewAutoExit (0.626)
function useTeammateViewAutoExit(e) {
  switch (e) {
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
