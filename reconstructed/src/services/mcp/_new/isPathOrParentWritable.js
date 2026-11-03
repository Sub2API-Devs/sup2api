/**
 * services/mcp/_new/isPathOrParentWritable.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: sole-consumer-new 1
 */
import { dirname, dirname as dirname_2 } from "path";
import { isPosixPlatform } from "../../../utils/tmuxSocket.js";
import { Ap } from "../../../utils/settings/managedPath.js";

//@ chunk-dcmhvw5a.js:426947-427191 sole-consumer-new
function* isPathOrParentWritable(e) {
  try {
    if (typeof e === "string" || !("real" in e) || !isPosixPlatform()) return "unknown";
    let n = yield* Ap(e.real);
    if (n === "yes") return "yes";
    let r = yield* Ap(dirname_2(e.real));
    if (r === "yes") return "yes";
    return n === "no" && r === "no" ? "no" : "unknown";
  } catch {
    return "unknown";
  }
}

export { isPathOrParentWritable };
