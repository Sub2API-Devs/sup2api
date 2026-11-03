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
  let toolPermissionContext = GrepTool.getPath(e);
  let s = consumeReadPermission(n, toolPermissionContext);
  if (e.path) await assertGrepPathExists(e.path, s, n);
  let searchTarget = await resolveRipgrepTarget(toolPermissionContext, s);
  if (searchTarget === null) return emptyGrepResult(e);
  try {
    return await runGrep(searchTarget, e, n);
  } finally {
    await searchTarget.close();
  }
}
export { pathFromToolUse };
