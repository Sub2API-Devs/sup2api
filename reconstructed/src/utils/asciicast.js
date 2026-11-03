/**
 * utils/asciicast.ts
 *
 * asciicast 录屏文件：按会话重命名录像。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/asciicast.ts
 * pieces: chunk-08s5p3av.js (5)
 * attribution: file-local 1, layout 2, facade-exports 1, placement 1
 */
import { join, join as join_2, relative, basename } from "path";
import { rename, rmdir } from "fs/promises";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getProjectDir } from "./sessionStoragePortable.js";
import { getOriginalCwd, getSessionId } from "../bootstrap/state.js";
import { getProjectKeyIfRepresentable, getProjectsDir } from "./sessionStorage.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { PDi } from "./resultError.js";

//@ chunk-08s5p3av.js:3102-3334 file-local
class _resetRecordingStateForTesting {
  filePath = null;
  key = void 0;
  timestamp = 0;
  recorder = null;
  failed = !1;
  setFile(e, r, o) {
    ((this.filePath = e), (this.key = o), (this.timestamp = r));
  }
  setFilePath(e, r) {
    ((this.filePath = e), (this.key = r));
  }
  setRecorder(e) {
    this.recorder = e;
  }
  markFailed() {
    this.failed = !0;
  }
}
//@ chunk-08s5p3av.js:3334-3424 layout
function ye(e, r, o) {
  return { namespace: "recording", projectKey: e, sessionId: r, stamp: String(o) };
}
//@ chunk-08s5p3av.js:3424-3449 layout
var Se = new SessionRootSlot(() => new _resetRecordingStateForTesting());
//@ chunk-08s5p3av.js:3449-4215 facade-exports = renameRecordingForSession (0.754)
async function renameRecordingForSession(e, r) {
  let of = Se.of(e),
    oldPath = of.filePath;
  if (!oldPath || of.timestamp === 0) return;
  let s = getProjectDir(getOriginalCwd()),
    key = of.key,
    d = getProjectKeyIfRepresentable(s);
  if (isStorageV5Enabled() && r !== void 0 && key !== void 0 && d !== void 0) {
    if (of.failed) return;
    let w = getSessionId(),
      g = join(s, w, `${of.timestamp}.cast`);
    if (oldPath === g) return;
    let h = ye(d, w, of.timestamp),
      M = relative(s, oldPath),
      projectDir = relative(s, g),
      v = async () => {
        if (of.failed) return;
        try {
          (await moveSessionRecording(r, key, h),
            of.setFilePath(g, h),
            logForDebugging(`[asciicast] Renamed recording: ${M} \u2192 ${projectDir}`));
        } catch {
          logForDebugging(`[asciicast] Failed to rename recording from ${M} to ${projectDir}`);
        }
      };
    await (of.recorder?.park(v) ?? v());
    return;
  }
  let newPath = join(s, `${getSessionId()}-${of.timestamp}.cast`);
  if (oldPath === newPath) return;
  await of.recorder?.flush();
  let oldName = basename(oldPath),
    newName = basename(newPath);
  try {
    (await rename(oldPath, newPath),
      of.setFilePath(newPath),
      logForDebugging(`[asciicast] Renamed recording: ${oldName} \u2192 ${newName}`));
  } catch {
    logForDebugging(`[asciicast] Failed to rename recording from ${oldName} to ${newName}`);
  }
}
//@ chunk-08s5p3av.js:4215-4320 placement
async function moveSessionRecording(e, r, o) {
  (PDi(await e.move(r, o)), await rmdir(join(getProjectsDir(), r.projectKey, r.sessionId)).catch(() => {}));
}

export { renameRecordingForSession };
