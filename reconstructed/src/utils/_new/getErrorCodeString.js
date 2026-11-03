/**
 * utils/_new/getErrorCodeString.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-24t3dkzb.js (1)
 * attribution: sole-consumer-new 1
 */

//@ chunk-24t3dkzb.js:4838-4916 sole-consumer-new = isConnectionError (1)
function getErrorCodeString(err) {
  return err && typeof err === "object" && "code" in err ? String(err.code) : void 0;
}

export { getErrorCodeString };
