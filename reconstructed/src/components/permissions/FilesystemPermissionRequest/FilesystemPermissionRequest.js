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
async function pathFromToolUse(toolUse, context) {
  let toolPermissionContext = GrepTool.getPath(toolUse);
  let consumed = consumeReadPermission(context, toolPermissionContext);
  if (toolUse.path) await assertGrepPathExists(toolUse.path, consumed, context);
  let searchTarget = await resolveRipgrepTarget(toolPermissionContext, consumed);
  if (searchTarget === null) return emptyGrepResult(toolUse);
  try {
    return await runGrep(searchTarget, toolUse, context);
  } finally {
    await searchTarget.close();
  }
}
export { pathFromToolUse };
