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
import { deferInit } from "../../runtime/deferred-init.js";

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
var recordingStateByRoot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-08s5p3av.js:3424", () => {
  recordingStateByRoot = new SessionRootSlot(() => new _resetRecordingStateForTesting());
});
//@ chunk-08s5p3av.js:3449-4215 facade-exports (2.1.88 match: renameRecordingForSession, 0.754)
async function renameRecordingForSession(session, storage) {
  let recordingState = recordingStateByRoot.of(session);
  let oldPath = recordingState.filePath;
  if (!oldPath || recordingState.timestamp === 0) return;
  let projectDir = getProjectDir(getOriginalCwd());
  let key = recordingState.key;
  let projectKey = getProjectKeyIfRepresentable(projectDir);
  if (isStorageV5Enabled() && storage !== undefined && key !== undefined && projectKey !== undefined) {
    if (recordingState.failed) return;
    let sessionId = getSessionId();
    let nextPath = join(projectDir, sessionId, `${recordingState.timestamp}.cast`);
    if (oldPath === nextPath) return;
    let nextStorageKey = recordingKey(projectKey, sessionId, recordingState.timestamp);
    let oldRelativePath = relative(projectDir, oldPath);
    let projectDir_2 = relative(projectDir, nextPath);
    let doRename = async () => {
      if (recordingState.failed) return;
      try {
        await moveSessionRecording(storage, key, nextStorageKey);
        recordingState.setFilePath(nextPath, nextStorageKey);
        logForDebugging(`[asciicast] Renamed recording: ${oldRelativePath} \u2192 ${projectDir_2}`);
      } catch {
        logForDebugging(`[asciicast] Failed to rename recording from ${oldRelativePath} to ${projectDir_2}`);
      }
    };
    await (recordingState.recorder?.park(doRename) ?? doRename());
    return;
  }
  let newPath = join(projectDir, `${getSessionId()}-${recordingState.timestamp}.cast`);
  if (oldPath === newPath) return;
  await recordingState.recorder?.flush();
  let oldName = basename(oldPath);
  let newName = basename(newPath);
  try {
    await rename(oldPath, newPath);
    recordingState.setFilePath(newPath);
    logForDebugging(`[asciicast] Renamed recording: ${oldName} \u2192 ${newName}`);
  } catch {
    logForDebugging(`[asciicast] Failed to rename recording from ${oldName} to ${newName}`);
  }
}
//@ chunk-08s5p3av.js:4215-4320 placement
async function moveSessionRecording(storage, key, nextKey) {
  unwrapResult(await storage.move(key, nextKey));
  await rmdir(join(getProjectsDir(), key.projectKey, key.sessionId)).catch(() => {});
}
export { renameRecordingForSession };
