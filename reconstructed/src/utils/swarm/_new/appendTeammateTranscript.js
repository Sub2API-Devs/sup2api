/**
 * utils/swarm/_new/appendTeammateTranscript.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-phrnybk8.js (1)
 * attribution: sole-consumer-new 1
 */
import { appendBounded } from "../../../tasks/taskKinds.js";

//@ chunk-phrnybk8.js:411-533 sole-consumer-new
function appendTeammateTranscript(e, a, s) {
  if (s.get(e)?.status !== "running") return;
  s.updateTranscript(e, (n) => ({ ...n, messages: appendBounded(n.messages, a) }));
}

export { appendTeammateTranscript };
