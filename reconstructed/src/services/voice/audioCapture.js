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
var a = null,
  i = !1;
/**
 * 懒加载原生音频采集模块（只加载一次）：先尝试内置模块，失败后按平台架构（linux 含 musl）在 vendor/audio-capture 等候选路径中查找 audio-capture.node。
 */
//@ chunk-vztqnp39.js:280-624 placement
function loadAudioCaptureModule() {
  if (i) return a;
  i = !0;
  let t = "linux";
  if (t !== "darwin" && t !== "linux" && t !== "win32") return null;
  try {
    return ((a = srs()), a);
  } catch {}
  let o = `x64-${t}`,
    flattened = (t === "linux" ? [o, `${o}-musl`] : [o]).flatMap((n) => [
      `./vendor/audio-capture/${n}/audio-capture.node`,
      `../audio-capture/${n}/audio-capture.node`,
    ]);
  for (let n of flattened)
    try {
      return ((a = importMetaRequire(n)), a);
    } catch {}
  return null;
}
//@ chunk-vztqnp39.js:624-655 placement
function c() {
  return loadAudioCaptureModule() !== null;
}
//@ chunk-vztqnp39.js:655-725 placement
function l(t, o) {
  let e = loadAudioCaptureModule();
  if (!e) return !1;
  return e.startRecording(t, o);
}
//@ chunk-vztqnp39.js:725-779 placement
function s() {
  let t = loadAudioCaptureModule();
  if (!t) return;
  t.stopRecording();
}
//@ chunk-vztqnp39.js:779-840 placement
function d() {
  let t = loadAudioCaptureModule();
  if (!t) return !1;
  return t.isRecording();
}
//@ chunk-vztqnp39.js:840-909 placement
function p(t, o) {
  let e = loadAudioCaptureModule();
  if (!e) return !1;
  return e.startPlayback(t, o);
}
//@ chunk-vztqnp39.js:909-969 placement
function f(t) {
  let o = loadAudioCaptureModule();
  if (!o) return;
  o.writePlaybackData(t);
}
//@ chunk-vztqnp39.js:969-1022 placement
function m() {
  let t = loadAudioCaptureModule();
  if (!t) return;
  t.stopPlayback();
}
//@ chunk-vztqnp39.js:1022-1081 placement
function b() {
  let t = loadAudioCaptureModule();
  if (!t) return !1;
  return t.isPlaying();
}
//@ chunk-vztqnp39.js:1081-1194 placement
function microphoneAuthorizationStatus() {
  let t = loadAudioCaptureModule();
  if (!t || !t.microphoneAuthorizationStatus) return 0;
  return t.microphoneAuthorizationStatus();
}
