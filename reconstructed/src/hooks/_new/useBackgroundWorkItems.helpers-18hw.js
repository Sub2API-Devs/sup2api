/**
 * hooks/_new/useBackgroundWorkItems.helpers-18hw.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: sole-consumer-new 4
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { truncateWithEllipsis } from "../../services/sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";

//@ chunk-18hwfzwa.js:1094819-1094823 sole-consumer-new
j();
//@ chunk-18hwfzwa.js:1094823-1094827 sole-consumer-new
j();
//@ chunk-18hwfzwa.js:1094827-1094839 sole-consumer-new
var owo = 200;
//@ chunk-18hwfzwa.js:1094839-1094902 sole-consumer-new
function xC(h) {
  return truncateWithEllipsis(redactSecrets(h).replace(/\s+/g, " ").trim(), owo);
}

export { xC };
