/**
 * services/voice/audioCapture.ts
 *
 * 2.1.316 新增。语音输入的音频采集。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vh7n44r5.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "../../utils/identity.js";
import { require_audio_capture_node } from "../../../vendor/private-unresolved/audio-capture.node.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { isRunningFromTsSource } from "../../utils/slowOperations.js";
import { importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-vh7n44r5.js:3789-3894 placement
/**
 * 已加载的原生音频采集模块实例（懒加载缓存）。
 */
var audioCaptureLoadAttempted = identity(
  {
    settled: false,
    embeddedTried: false,
    module: null,
  },
  (state) => {
    state.settled = false;
    state.embeddedTried = false;
    state.module = null;
  },
);
//@ chunk-vh7n44r5.js:3894-4414 placement
/**
 * 懒加载原生音频采集模块（只加载一次）：先尝试内置模块，失败后按平台架构（linux 含 musl）在 vendor/audio-capture 等候选路径中查找 audio-capture.node。
 */
function loadAudioCaptureModule() {
  if (audioCaptureLoadAttempted.settled) return audioCaptureLoadAttempted.module;
  let platform = "linux";
  if (platform !== "darwin" && platform !== "linux" && platform !== "win32") {
    audioCaptureLoadAttempted.settled = true;
    return null;
  }
  if (!audioCaptureLoadAttempted.embeddedTried)
    try {
      audioCaptureLoadAttempted.module = require_audio_capture_node();
      audioCaptureLoadAttempted.settled = true;
      return audioCaptureLoadAttempted.module;
    } catch {}
  audioCaptureLoadAttempted.embeddedTried = true;
  if (
    readFlagWithOverride("tengu_composed_quilt", {
      safe: true,
    }) &&
    !isRunningFromTsSource()
  )
    return null;
  audioCaptureLoadAttempted.settled = true;
  let platformDir = `x64-${platform}`;
  let flattened = (platform === "linux" ? [platformDir, `${platformDir}-musl`] : [platformDir]).flatMap(
    (variantDir) => [
      `./vendor/audio-capture/${variantDir}/audio-capture.node`,
      `../audio-capture/${variantDir}/audio-capture.node`,
    ],
  );
  for (let modulePath of flattened)
    try {
      audioCaptureLoadAttempted.module = importMetaRequire(modulePath);
      return audioCaptureLoadAttempted.module;
    } catch {}
  return null;
}
//@ chunk-vh7n44r5.js:4414-4445 placement
/**
 * 是否可加载原生音频采集模块。
 */
function isAudioCaptureAvailable() {
  return loadAudioCaptureModule() !== null;
}
//@ chunk-vh7n44r5.js:4445-4515 placement
/**
 * 开始录音（模块不可用时返回 false）。
 */
function startAudioRecording(sampleRate, channels) {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return false;
  return audioCaptureModule.startRecording(sampleRate, channels);
}
//@ chunk-vh7n44r5.js:4515-4569 placement
/**
 * 停止录音。
 */
function stopAudioRecording() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return;
  audioCaptureModule.stopRecording();
}
//@ chunk-vh7n44r5.js:4569-4630 placement
/**
 * 是否正在录音。
 */
function isAudioRecording() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return false;
  return audioCaptureModule.isRecording();
}
//@ chunk-vh7n44r5.js:4630-4699 placement
/**
 * 开始播放（模块不可用时返回 false）。
 */
function startAudioPlayback(sampleRate, channels) {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return false;
  return audioCaptureModule.startPlayback(sampleRate, channels);
}
//@ chunk-vh7n44r5.js:4699-4759 placement
/**
 * 写入播放数据。
 */
function writeAudioPlaybackData(data) {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return;
  audioCaptureModule.writePlaybackData(data);
}
//@ chunk-vh7n44r5.js:4759-4812 placement
/**
 * 停止播放。
 */
function stopAudioPlayback() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return;
  audioCaptureModule.stopPlayback();
}
//@ chunk-vh7n44r5.js:4812-4871 placement
/**
 * 是否正在播放。
 */
function isAudioPlaying() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule) return false;
  return audioCaptureModule.isPlaying();
}
//@ chunk-vh7n44r5.js:4871-4984 placement
function microphoneAuthorizationStatus() {
  let audioCaptureModule = loadAudioCaptureModule();
  if (!audioCaptureModule || !audioCaptureModule.microphoneAuthorizationStatus) return 0;
  return audioCaptureModule.microphoneAuthorizationStatus();
}
export {
  isAudioCaptureAvailable,
  isAudioPlaying,
  isAudioRecording,
  microphoneAuthorizationStatus,
  startAudioPlayback,
  startAudioRecording,
  stopAudioPlayback,
  stopAudioRecording,
  writeAudioPlaybackData,
};
