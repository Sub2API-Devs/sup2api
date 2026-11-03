/**
 * services/voice/audioCapture.ts
 *
 * 2.1.316 新增。语音输入的音频采集。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vztqnp39.js (11)
 * attribution: placement 11
 */
import { srs } from "../../../vendor/private-unresolved/audio-capture.node.js";
import { importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-vztqnp39.js:264-280 placement
/**
 * 已加载的原生音频采集模块实例（懒加载缓存）。
 */
var audioCaptureModuleCache = null;
var audioCaptureLoadAttempted = false;
//@ chunk-vztqnp39.js:280-624 placement
/**
 * 懒加载原生音频采集模块（只加载一次）：先尝试内置模块，失败后按平台架构（linux 含 musl）在 vendor/audio-capture 等候选路径中查找 audio-capture.node。
 */
function loadAudioCaptureModule() {
  if (audioCaptureLoadAttempted) return audioCaptureModuleCache;
  audioCaptureLoadAttempted = true;
  let t = "linux";
  if (t !== "darwin" && t !== "linux" && t !== "win32") return null;
  try {
    audioCaptureModuleCache = srs();
    return audioCaptureModuleCache;
  } catch {}
  let o = `x64-${t}`;
  let flattened = (t === "linux" ? [o, `${o}-musl`] : [o]).flatMap((n) => [
    `./vendor/audio-capture/${n}/audio-capture.node`,
    `../audio-capture/${n}/audio-capture.node`,
  ]);
  for (let n of flattened)
    try {
      audioCaptureModuleCache = importMetaRequire(n);
      return audioCaptureModuleCache;
    } catch {}
  return null;
}
//@ chunk-vztqnp39.js:624-655 placement
/**
 * 是否可加载原生音频采集模块。
 */
function isAudioCaptureAvailable() {
  return loadAudioCaptureModule() !== null;
}
//@ chunk-vztqnp39.js:655-725 placement
/**
 * 开始录音（模块不可用时返回 false）。
 */
function startAudioRecording(t, o) {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return false;
  return audioCaptureModule.startRecording(t, o);
}
//@ chunk-vztqnp39.js:725-779 placement
/**
 * 停止录音。
 */
function stopAudioRecording() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return;
  audioCaptureModule.stopRecording();
}
//@ chunk-vztqnp39.js:779-840 placement
/**
 * 是否正在录音。
 */
function isAudioRecording() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return false;
  return audioCaptureModule.isRecording();
}
//@ chunk-vztqnp39.js:840-909 placement
/**
 * 开始播放（模块不可用时返回 false）。
 */
function startAudioPlayback(t, o) {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return false;
  return audioCaptureModule.startPlayback(t, o);
}
//@ chunk-vztqnp39.js:909-969 placement
/**
 * 写入播放数据。
 */
function writeAudioPlaybackData(t) {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return;
  audioCaptureModule.writePlaybackData(t);
}
//@ chunk-vztqnp39.js:969-1022 placement
/**
 * 停止播放。
 */
function stopAudioPlayback() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return;
  audioCaptureModule.stopPlayback();
}
//@ chunk-vztqnp39.js:1022-1081 placement
/**
 * 是否正在播放。
 */
function isAudioPlaying() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return false;
  return audioCaptureModule.isPlaying();
}
//@ chunk-vztqnp39.js:1081-1194 placement
function microphoneAuthorizationStatus() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule || !audioCaptureModule.microphoneAuthorizationStatus) return 0;
  return audioCaptureModule.microphoneAuthorizationStatus();
}
