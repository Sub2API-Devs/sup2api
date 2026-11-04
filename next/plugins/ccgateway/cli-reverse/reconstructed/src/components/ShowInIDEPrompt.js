/**
 * components/ShowInIDEPrompt.tsx
 *
 * 在 IDE 中显示 diff 时的提示（只剩一个小函数）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ShowInIDEPrompt.tsx
 * pieces: chunk-0e8j1zzj.js (1)
 * attribution: callgraph-fingerprint 1
 */

//@ chunk-0e8j1zzj.js:25686-25753 callgraph-fingerprint (2.1.88 match: ShowInIDEPrompt, 0.18)
function ShowInIDEPrompt(t0) {
  return t0 === "yes" ? "accept" : t0 === "no" ? "reject" : undefined;
}
export { ShowInIDEPrompt };
