/**
 * components/permissions/FileWritePermissionRequest/FileWritePermissionRequest.tsx
 *
 * Write 权限请求的 IDE diff 支持描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FileWritePermissionRequest/FileWritePermissionRequest.tsx
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: fingerprint 1
 */
import { ripgrepStatus } from "../../../utils/ripgrep.js";

//@ chunk-fq0cr76a.js:878544-878582 fingerprint = ideDiffSupport (0.531)
function ideDiffSupport() {
  return ripgrepStatus().getConfig();
}
export { ideDiffSupport };
