/**
 * components/ShowInIDEPrompt.tsx
 *
 * 在 IDE 中显示 diff 时的提示（只剩一个小函数）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ShowInIDEPrompt.tsx
 * pieces: chunk-8prszgkd.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-8prszgkd.js:34820-34887 callgraph-fingerprint (2.1.88 match: ShowInIDEPrompt, 0.179)
function ShowInIDEPrompt(t0) {
  return t0 === "yes" ? "accept" : t0 === "no" ? "reject" : undefined;
}
export { ShowInIDEPrompt };
