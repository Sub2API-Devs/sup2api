/**
 * cli/transports/WorkerStateUploader.ts
 *
 * 把 worker 状态（元数据/外部状态）合并节流后上传到 CCR
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/WorkerStateUploader.ts
 * pieces: chunk-qyz2x025.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-qyz2x025.js:16033-16252 fingerprint (2.1.88 match: coalescePatches, 1)
function coalescePatches(base, overlay) {
  let merged = {
    ...base,
  };
  for (let [key, value] of Object.entries(overlay))
    if (
      (key === "external_metadata" || key === "internal_metadata") &&
      merged[key] &&
      typeof merged[key] === "object" &&
      typeof value === "object" &&
      value !== null
    )
      merged[key] = {
        ...merged[key],
        ...value,
      };
    else merged[key] = value;
  return merged;
}
export { coalescePatches };
