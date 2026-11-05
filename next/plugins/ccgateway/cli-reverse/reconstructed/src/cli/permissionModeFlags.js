/**
 * cli/permissionModeFlags.ts
 *
 * --permission-mode 参数解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ygg5mbk4.js (7)
 * attribution: placement 7
 */
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { syncRespawnFlag, readJobState, invalidateJobStateCache } from "../services/daemon/jobState.js";
import { logError } from "../utils/log.js";
import { env } from "../utils/env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ygg5mbk4.js:373-407 placement
var INHERIT_PERMISSION_MODE_FLAG = "--inherit-permission-mode";
//@ chunk-ygg5mbk4.js:407-457 placement
function isInheritPermissionModeFlag(arg) {
  return arg === INHERIT_PERMISSION_MODE_FLAG || arg.startsWith(`${INHERIT_PERMISSION_MODE_FLAG}=`);
}
//@ chunk-ygg5mbk4.js:457-470 placement
class InheritedPermissionModeState {
  mode;
}
//@ chunk-ygg5mbk4.js:470-493 placement
var INHERITED_PERMISSION_MODE_SLOT; // deferred: uses InheritedPermissionModeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ygg5mbk4.js:470", () => {
  INHERITED_PERMISSION_MODE_SLOT = new HostScoped(() => new InheritedPermissionModeState());
});
//@ chunk-ygg5mbk4.js:493-528 placement
function inheritedPermissionMode() {
  return INHERITED_PERMISSION_MODE_SLOT.of(getRootSession().host);
}
//@ chunk-ygg5mbk4.js:528-678 placement
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
//@ chunk-ygg5mbk4.js:678-1073 placement
async function parsePermissionModeFlag(storageV5) {
  let state = inheritedPermissionMode();
  let mode = state.mode;
  if (mode === undefined) return;
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") {
    state.mode = undefined;
    return;
  }
  let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
  if (!jobState?.respawnFlags) return;
  if (!jobState.respawnFlags.some(isInheritPermissionModeFlag)) {
    state.mode = undefined;
    return;
  }
  await syncRespawnFlag(
    "--permission-mode",
    [INHERIT_PERMISSION_MODE_FLAG],
    mode,
    undefined,
    storageV5,
    undefined,
    (error) => error.some(isInheritPermissionModeFlag),
  );
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let jobState_2 = await readJobState(CLAUDE_JOB_DIR, storageV5);
  if (jobState_2?.respawnFlags && !jobState_2.respawnFlags.some(isInheritPermissionModeFlag))
    state.mode = undefined;
}
export { parsePermissionModeFlag, applyInheritedPermissionModeFlag };
