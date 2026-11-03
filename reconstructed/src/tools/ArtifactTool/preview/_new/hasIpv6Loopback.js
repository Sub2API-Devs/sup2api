/**
 * tools/ArtifactTool/preview/_new/hasIpv6Loopback.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (1)
 * attribution: sole-consumer-new 1
 */
import { networkInterfaces } from "os";

//@ chunk-8wvtd8sr.js:199622-199726 sole-consumer-new
function hasIpv6Loopback() {
  try {
    return Object.values(networkInterfaces()).some((e) => e?.some((n) => n.address === "::1"));
  } catch {
    return !0;
  }
}

export { hasIpv6Loopback };
