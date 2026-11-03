/**
 * components/messages/_new/AssistantToolUseMessage.helpers-ah34.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (3)
 * attribution: sole-consumer-new 3
 */
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { rs } from "../../../state/AppState.js";

//@ chunk-ah34pb7m.js:64176-64180 sole-consumer-new
j();
//@ chunk-ah34pb7m.js:64180-64207 sole-consumer-new
function Rp(m) {
  return null;
}
//@ chunk-ah34pb7m.js:64207-64280 sole-consumer-new
function kp(m) {
  return rs((d) => d.classifierApprovals.checking.has(m)) ?? !1;
}

export { kp, Rp };
