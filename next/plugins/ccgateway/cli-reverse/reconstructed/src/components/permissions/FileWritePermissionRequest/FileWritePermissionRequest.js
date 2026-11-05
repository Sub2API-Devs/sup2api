/**
 * components/permissions/FileWritePermissionRequest/FileWritePermissionRequest.tsx
 *
 * Write 权限请求的 IDE diff 支持描述。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FileWritePermissionRequest/FileWritePermissionRequest.tsx
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { ripgrepStatus } from "../../../utils/ripgrep.js";

//@ chunk-qg41pqt6.js:880464-880502 fingerprint (2.1.88 match: ideDiffSupport, 0.53)
function ideDiffSupport() {
  return ripgrepStatus().getConfig();
}
export { ideDiffSupport };
