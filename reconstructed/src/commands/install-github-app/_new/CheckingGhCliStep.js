/**
 * commands/install-github-app/_new/CheckingGhCliStep.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4v9zy7gn.js (2)
 * attribution: sole-consumer-new 2
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "../../../components/permissions/WorkerBadge.js";
import { j } from "../../../../vendor/react/cjs/react.production.js";

//@ chunk-4v9zy7gn.js:27429-27555 sole-consumer-new
function CheckingGhCliStep() {
  let I = w(1),
    i;
  if (I[0] === MEMO_CACHE_SENTINEL)
    ((i = e(WorkerBadge, { message: "Checking GitHub CLI installation\u2026" })), (I[0] = i));
  else i = I[0];
  return i;
}
//@ chunk-4v9zy7gn.js:27555-27559 sole-consumer-new
j();

export { CheckingGhCliStep };
