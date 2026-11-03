/**
 * cli/permissionModeFlags.ts
 *
 * --permission-mode 参数解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y82h9qcm.js (7)
 * attribution: placement 7
 */
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { syncRespawnFlag, readJobState, invalidateJobStateCache } from "../services/daemon/jobState.js";
import { logError } from "../utils/log.js";
import { env } from "../utils/env.js";

//@ chunk-y82h9qcm.js:373-407 placement
var INHERIT_PERMISSION_MODE_FLAG = "--inherit-permission-mode";
//@ chunk-y82h9qcm.js:407-457 placement
function isInheritPermissionModeFlag(e) {
  return e === INHERIT_PERMISSION_MODE_FLAG || e.startsWith(`${INHERIT_PERMISSION_MODE_FLAG}=`);
}
//@ chunk-y82h9qcm.js:457-470 placement
class InheritedPermissionModeState {
  mode;
}
//@ chunk-y82h9qcm.js:470-493 placement
var INHERITED_PERMISSION_MODE_SLOT = new HostScoped(() => new InheritedPermissionModeState());
//@ chunk-y82h9qcm.js:493-528 placement
function inheritedPermissionMode() {
  return INHERITED_PERMISSION_MODE_SLOT.of(getRootSession().host);
}
//@ chunk-y82h9qcm.js:528-678 placement
/**
 * 继承 --permission-mode 时写入当前模式并同步重启参数。
 */
function applyInheritedPermissionModeFlag({ inheritPermissionModeCli, resolvedMode, storageV5 }) {
  if (!inheritPermissionModeCli) return;
  inheritedPermissionMode().mode = resolvedMode;
  syncRespawnFlag(
    "--permission-mode",
    [INHERIT_PERMISSION_MODE_FLAG],
    resolvedMode,
    undefined,
    storageV5,
  ).catch((error) => logError(error));
}
//@ chunk-y82h9qcm.js:678-1073 placement
async function parsePermissionModeFlag(storageV5) {
  let n = inheritedPermissionMode();
  let mode = n.mode;
  if (mode === undefined) return;
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") {
    n.mode = undefined;
    return;
  }
  let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
  if (!jobState?.respawnFlags) return;
  if (!jobState.respawnFlags.some(isInheritPermissionModeFlag)) {
    n.mode = undefined;
    return;
  }
  await syncRespawnFlag(
    "--permission-mode",
    [INHERIT_PERMISSION_MODE_FLAG],
    mode,
    undefined,
    storageV5,
    undefined,
    (p) => p.some(isInheritPermissionModeFlag),
  );
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let jobState_2 = await readJobState(CLAUDE_JOB_DIR, storageV5);
  if (jobState_2?.respawnFlags && !jobState_2.respawnFlags.some(isInheritPermissionModeFlag))
    n.mode = undefined;
}
export { applyInheritedPermissionModeFlag, parsePermissionModeFlag };
