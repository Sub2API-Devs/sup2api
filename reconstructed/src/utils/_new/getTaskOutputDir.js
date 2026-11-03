/**
 * utils/_new/getTaskOutputDir.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-23fm9f0d.js (1)
 * attribution: sole-consumer-new 1
 */
import { cleanupOldFilesInDirectory } from "../cleanup.js";

//@ chunk-23fm9f0d.js:22969-23001 sole-consumer-new = getTaskOutputDir (1)
function getTaskOutputDir() {
  return cleanupOldFilesInDirectory("tasks");
}

export { getTaskOutputDir };
