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
import { join, relative, basename } from "path";
import { rename, rmdir } from "fs/promises";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getProjectDir } from "./sessionStoragePortable.js";
import { getOriginalCwd, getSessionId } from "../bootstrap/state.js";
import { getProjectKeyIfRepresentable, getProjectsDir } from "./sessionStorage.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { unwrapResult } from "./resultError.js";

//@ chunk-08s5p3av.js:3102-3334 file-local
class _resetRecordingStateForTesting {
  filePath = null;
  key = undefined;
  timestamp = 0;
  recorder = null;
  failed = false;
  setFile(filePath, timestamp, key) {
    this.filePath = filePath;
    this.key = key;
    this.timestamp = timestamp;
  }
  setFilePath(filePath, key) {
    this.filePath = filePath;
    this.key = key;
  }
  setRecorder(recorder) {
    this.recorder = recorder;
  }
  markFailed() {
    this.failed = true;
  }
}
//@ chunk-08s5p3av.js:3334-3424 layout
/**
 * 录制文件的存储命名（namespace、项目键、会话 id 与时间戳）。
 */
function recordingKey(projectKey, sessionId, timestamp) {
  return {
    namespace: "recording",
    projectKey,
    sessionId,
    stamp: String(timestamp),
  };
}
//@ chunk-08s5p3av.js:3424-3449 layout
/**
 * 按会话根保存的录制状态。
 */
var recordingStateByRoot = new SessionRootSlot(() => new _resetRecordingStateForTesting());
//@ chunk-08s5p3av.js:3449-4215 facade-exports = renameRecordingForSession (0.754)
async function renameRecordingForSession(session, storageV5) {
  let o = recordingStateByRoot.of(session);
  let oldPath = o.filePath;
  if (!oldPath || o.timestamp === 0) return;
  let projectDir = getProjectDir(getOriginalCwd());
  let key = o.key;
  let projectKey = getProjectKeyIfRepresentable(projectDir);
  if (isStorageV5Enabled() && storageV5 !== undefined && key !== undefined && projectKey !== undefined) {
    if (o.failed) return;
    let sessionId = getSessionId();
    let g = join(projectDir, sessionId, `${o.timestamp}.cast`);
    if (oldPath === g) return;
    let h = recordingKey(projectKey, sessionId, o.timestamp);
    let M = relative(projectDir, oldPath);
    let projectDir_2 = relative(projectDir, g);
    let v = async () => {
      if (o.failed) return;
      try {
        await moveSessionRecording(storageV5, key, h);
        o.setFilePath(g, h);
        logForDebugging(`[asciicast] Renamed recording: ${M} \u2192 ${projectDir_2}`);
      } catch {
        logForDebugging(`[asciicast] Failed to rename recording from ${M} to ${projectDir_2}`);
      }
    };
    await (o.recorder?.park(v) ?? v());
    return;
  }
  let newPath = join(projectDir, `${getSessionId()}-${o.timestamp}.cast`);
  if (oldPath === newPath) return;
  await o.recorder?.flush();
  let oldName = basename(oldPath);
  let newName = basename(newPath);
  try {
    await rename(oldPath, newPath);
    o.setFilePath(newPath);
    logForDebugging(`[asciicast] Renamed recording: ${oldName} \u2192 ${newName}`);
  } catch {
    logForDebugging(`[asciicast] Failed to rename recording from ${oldName} to ${newName}`);
  }
}
//@ chunk-08s5p3av.js:4215-4320 placement
async function moveSessionRecording(e, key, o) {
  unwrapResult(await e.move(key, o));
  await rmdir(join(getProjectsDir(), key.projectKey, key.sessionId)).catch(() => {});
}
export { renameRecordingForSession };
