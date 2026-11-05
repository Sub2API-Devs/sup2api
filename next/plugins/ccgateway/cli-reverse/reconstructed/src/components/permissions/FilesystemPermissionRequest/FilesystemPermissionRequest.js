/**
 * components/permissions/FilesystemPermissionRequest/FilesystemPermissionRequest.tsx
 *
 * 文件系统类工具权限：从 tool_use 输入提取路径。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilesystemPermissionRequest/FilesystemPermissionRequest.tsx
 * pieces: chunk-5xgkngpb.js (1)
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

//@ chunk-5xgkngpb.js:1453158-1453345 fingerprint (2.1.88 match: pathFromToolUse, 0.429)
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
