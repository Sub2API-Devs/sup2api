/**
 * @anthropic-ai/sandbox-runtime/dist/utils/ripgrep.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (2)
 * attribution: esm-fingerprint 2
 */
import { spawn, spawn as spawn_2, spawn as spawn_3, spawn as spawn_4, spawn as spawn_5 } from "child_process";
import { text } from "stream/consumers";

//@ chunk-fq0cr76a.js:719230-719654 esm-fingerprint
async function LR(e, n, r, s = { command: "rg" }) {
  let { command: command, args: args = [], argv0: argv0 } = s,
    S = spawn_2(command, [...args, ...e, n], { argv0: argv0, signal: r, timeout: 1e4, windowsHide: !0 }),
    [w, R, D] = await Promise.all([
      text(S.stdout),
      text(S.stderr),
      new Promise((O, L) => {
        (S.on("close", O), S.on("error", L));
      }),
    ]);
  if (D === 0)
    return w
      .trim()
      .split(
        `
`,
      )
      .filter(Boolean);
  if (D === 1) return [];
  throw new RipgrepError(
    `ripgrep failed with exit code ${D}: ${R}`,
    w
      .split(
        `
`,
      )
      .slice(0, -1)
      .filter(Boolean),
    R,
  );
}
//@ chunk-fq0cr76a.js:719654-719759 esm-fingerprint
class RipgrepError extends Error {
  constructor(e, n, r) {
    super(e);
    ((this.listed = n), (this.stderr = r), (this.name = "RipgrepError"));
  }
}

export { LR, RipgrepError };
