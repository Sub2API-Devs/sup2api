/**
 * components/permissions/FilesystemPermissionRequest/FilesystemPermissionRequest.tsx
 *
 * 文件系统类工具权限：从 tool_use 输入提取路径。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilesystemPermissionRequest/FilesystemPermissionRequest.tsx
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import {
  GrepTool,
  assertGrepPathExists,
  emptyGrepResult,
  runGrep,
} from "../../../tools/GrepTool/GrepTool.js";
import { consumeReadPermission } from "../../../utils/fsSafety/atomicWriteStaging.js";
import { resolveRipgrepTarget } from "../../../utils/ripgrep.js";

//@ chunk-e6aww6q8.js:1452836-1453023 fingerprint = pathFromToolUse (0.43)
async function pathFromToolUse(e, n) {
  let path = GrepTool.getPath(e),
    s = consumeReadPermission(n, path);
  if (e.path) await assertGrepPathExists(e.path, s, n);
  let h = await resolveRipgrepTarget(path, s);
  if (h === null) return emptyGrepResult(e);
  try {
    return await runGrep(h, e, n);
  } finally {
    await h.close();
  }
}

export { pathFromToolUse };
