/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/own-files.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { fileURLToPath } from "url";
import * as pathModule_2 from "path";
import "path";
import "path";
import "path";
import "path";
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import { pathSpellingVariants, normalizePathForSandbox, isAtOrUnder } from "./sandbox-utils.js";

//@ chunk-qg41pqt6.js:819326-819738 esm-fingerprint
function ownInstallWarning(allowedWritePaths, moduleFile = fileURLToPath(import.meta.url)) {
  let root = pathModule_2.dirname(moduleFile);
  while (!fsModule_2.existsSync(pathModule_2.join(root, "package.json"))) {
    if (root === pathModule_2.dirname(root)) return;
    root = pathModule_2.dirname(root);
  }
  if (!root.split(pathModule_2.sep).includes("node_modules")) return;
  let writable = allowedWritePaths.flatMap((allowed) =>
    pathSpellingVariants(normalizePathForSandbox(allowed)),
  );
  return pathSpellingVariants(root).some((form) => writable.some((allowed) => isAtOrUnder(form, allowed)))
    ? `sandbox-runtime is installed in ${root}, where a sandboxed command can write it - install it outside the allowed write paths`
    : undefined;
}
export { ownInstallWarning };
