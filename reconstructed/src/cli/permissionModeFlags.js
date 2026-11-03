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
var s = "--inherit-permission-mode";
//@ chunk-y82h9qcm.js:407-457 placement
function t(e) {
  return e === s || e.startsWith(`${s}=`);
}
//@ chunk-y82h9qcm.js:457-470 placement
class m {
  mode;
}
//@ chunk-y82h9qcm.js:470-493 placement
var u = new HostScoped(() => new m());
//@ chunk-y82h9qcm.js:493-528 placement
function f() {
  return u.of(getRootSession().host);
}
/**
 * 继承 --permission-mode 时写入当前模式并同步重启参数。
 */
//@ chunk-y82h9qcm.js:528-678 placement
function applyInheritedPermissionModeFlag({
  inheritPermissionModeCli: inheritPermissionModeCli,
  resolvedMode: resolvedMode,
  storageV5: storageV5,
}) {
  if (!inheritPermissionModeCli) return;
  ((f().mode = resolvedMode),
    syncRespawnFlag("--permission-mode", [s], resolvedMode, void 0, storageV5).catch((o) => logError(o)));
}
//@ chunk-y82h9qcm.js:678-1073 placement
async function parsePermissionModeFlag(e) {
  let n = f(),
    mode = n.mode;
  if (mode === void 0) return;
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") {
    n.mode = void 0;
    return;
  }
  let d = await readJobState(CLAUDE_JOB_DIR, e);
  if (!d?.respawnFlags) return;
  if (!d.respawnFlags.some(t)) {
    n.mode = void 0;
    return;
  }
  (await syncRespawnFlag("--permission-mode", [s], mode, void 0, e, void 0, (p) => p.some(t)),
    invalidateJobStateCache(CLAUDE_JOB_DIR));
  let a = await readJobState(CLAUDE_JOB_DIR, e);
  if (a?.respawnFlags && !a.respawnFlags.some(t)) n.mode = void 0;
}

export { applyInheritedPermissionModeFlag, parsePermissionModeFlag };
