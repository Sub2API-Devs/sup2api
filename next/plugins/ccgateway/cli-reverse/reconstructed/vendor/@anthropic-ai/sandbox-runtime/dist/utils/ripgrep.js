/**
 * @anthropic-ai/sandbox-runtime/dist/utils/ripgrep.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (2)
 * attribution: esm-fingerprint 2
 */
import { spawn } from "child_process";
import { text } from "stream/consumers";

//@ chunk-fq0cr76a.js:719230-719654 esm-fingerprint
async function ripGrep(
  args,
  target,
  abortSignal,
  config = {
    command: "rg",
  },
) {
  let { command, args: commandArgs = [], argv0 } = config;
  let child = spawn(command, [...commandArgs, ...args, target], {
    argv0,
    signal: abortSignal,
    timeout: 1e4,
    windowsHide: true,
  });
  let [stdout, stderr, code] = await Promise.all([
    text(child.stdout),
    text(child.stderr),
    new Promise((resolve, reject) => {
      child.on("close", resolve);
      child.on("error", reject);
    }),
  ]);
  if (code === 0)
    return stdout
      .trim()
      .split(
        `
`,
      )
      .filter(Boolean);
  if (code === 1) return [];
  throw new RipgrepError(
    `ripgrep failed with exit code ${code}: ${stderr}`,
    stdout
      .split(
        `
`,
      )
      .slice(0, -1)
      .filter(Boolean),
    stderr,
  );
}
//@ chunk-fq0cr76a.js:719654-719759 esm-fingerprint
class RipgrepError extends Error {
  constructor(message, listed, stderr) {
    super(message);
    this.listed = listed;
    this.stderr = stderr;
    this.name = "RipgrepError";
  }
}
export { ripGrep, RipgrepError };
