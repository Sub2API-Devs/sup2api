/**
 * utils/_new/oauth401DedupByHost.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */
import { HostScoped } from "../hostScoped.js";
import { OAuth401Deduper } from "../auth.js";

//@ chunk-e6aww6q8.js:2297458-2297485 sole-consumer-new
var oauth401DedupByHost = new HostScoped(() => new OAuth401Deduper());

export { oauth401DedupByHost };
