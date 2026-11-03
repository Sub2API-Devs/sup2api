/**
 * hooks/useVoiceAudioLevels.ts
 *
 * 2.1.316 新增：语音音量钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7p2hc4jn.js (1), chunk-yj65zw1g.js (1)
 * attribution: placement 2
 */
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
import { useVoiceStore } from "../context/voice.js";

//@ chunk-7p2hc4jn.js:51058-51533 placement
/**
 * 录音时按最近音量计算电平条字符与颜色（随时间变色，静音时灰色）；减少动画或未录音时返回 null。
 */
function useVoiceLevelIndicator() {
  let e = useAppState((K) => isReducedMotion(K.settings.prefersReducedMotion));
  let voiceLevelSmoother = useVoiceLevelSmoother();
  let n = useAppState_2((K) => K.voiceState) === "recording";
  let s = useAppState_2((K) => K.voiceAudioLevels);
  let o = n && !e;
  let [u, d] = useAnimationFrame(o ? 50 : null);
  if (!o) return [u, null];
  let h = s.at(-1) ?? 0;
  let min = Math.min(h * CURSOR_BLINK_PERIOD, 1);
  let T = voiceLevelSmoother.next(min, CURSOR_BLINK_ON_RATIO);
  let max = Math.max(1, Math.min(Math.round(T * (VOICE_LEVEL_BARS.length - 1)), VOICE_LEVEL_BARS.length - 1));
  let A = h < CURSOR_FADE_RATIO;
  let F = ((d / 1000) * 90) % 360;
  let se = isXtermJs() ? snapTo360(F) : F;
  let {
    r: Z,
    g: ee,
    b: fe,
  } = A
    ? {
        r: 128,
        g: 128,
        b: 128,
      }
    : hueToRgb(se);
  let hex = `#${((Z << 16) | (ee << 8) | fe).toString(16).padStart(6, "0")}`;
  return [
    u,
    {
      char: VOICE_LEVEL_BARS[max],
      hex,
    },
  ];
}
//@ chunk-yj65zw1g.js:1015-1055 placement
/**
 * 音量电平平滑器。
 */
function useVoiceLevelSmoother() {
  return useVoiceStore().levelSmoother;
}
export { useVoiceLevelIndicator };
