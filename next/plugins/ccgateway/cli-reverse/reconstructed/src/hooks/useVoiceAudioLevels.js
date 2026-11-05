/**
 * hooks/useVoiceAudioLevels.ts
 *
 * 2.1.316 新增：语音音量钩子。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-42wa4pww.js (1), chunk-77bb8s6j.js (1)
 * attribution: placement 2
 */
import { useVoiceStore } from "../context/voice.js";
import { useAppState, useAppState_2 } from "../state/AppState.js";
import { isReducedMotion } from "../components/Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import {
  CURSOR_BLINK_PERIOD,
  CURSOR_BLINK_ON_RATIO,
  VOICE_LEVEL_BARS,
  CURSOR_FADE_RATIO,
} from "../components/TextInput.js";
import { isXtermJs } from "../ink/terminal.js";
import { snapTo360, hueToRgb } from "../components/Spinner/utils.js";

//@ chunk-77bb8s6j.js:1015-1055 placement
/**
 * 音量电平平滑器。
 */
function useVoiceLevelSmoother() {
  return useVoiceStore().levelSmoother;
}
//@ chunk-42wa4pww.js:51058-51533 placement
/**
 * 录音时按最近音量计算电平条字符与颜色（随时间变色，静音时灰色）；减少动画或未录音时返回 null。
 */
function useVoiceLevelIndicator() {
  let prefersReducedMotion = useAppState((state) => isReducedMotion(state.settings.prefersReducedMotion));
  let voiceLevelSmoother = useVoiceLevelSmoother();
  let isRecording = useAppState_2((state) => state.voiceState) === "recording";
  let audioLevels = useAppState_2((state) => state.voiceAudioLevels);
  let isAnimated = isRecording && !prefersReducedMotion;
  let [frame, frameTimeMs] = useAnimationFrame(isAnimated ? 50 : null);
  if (!isAnimated) return [frame, null];
  let level = audioLevels.at(-1) ?? 0;
  let min = Math.min(level * CURSOR_BLINK_PERIOD, 1);
  let smoothed = voiceLevelSmoother.next(min, CURSOR_BLINK_ON_RATIO);
  let max = Math.max(
    1,
    Math.min(Math.round(smoothed * (VOICE_LEVEL_BARS.length - 1)), VOICE_LEVEL_BARS.length - 1),
  );
  let isFaded = level < CURSOR_FADE_RATIO;
  let hue = ((frameTimeMs / 1000) * 90) % 360;
  let displayHue = isXtermJs() ? snapTo360(hue) : hue;
  let {
    r: red,
    g: green,
    b: blue,
  } = isFaded
    ? {
        r: 128,
        g: 128,
        b: 128,
      }
    : hueToRgb(displayHue);
  let hex = `#${((red << 16) | (green << 8) | blue).toString(16).padStart(6, "0")}`;
  return [
    frame,
    {
      char: VOICE_LEVEL_BARS[max],
      hex,
    },
  ];
}
export { useVoiceLevelIndicator };
