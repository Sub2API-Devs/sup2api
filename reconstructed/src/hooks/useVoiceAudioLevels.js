/**
 * hooks/useVoiceAudioLevels.ts
 *
 * 2.1.316 新增：语音音量钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7p2hc4jn.js (1)
 * attribution: placement 1
 */
import { useAppState, useAppState_2 } from "../state/AppState.js";
import { isReducedMotion } from "../components/Spinner/spinnerFlags.js";
import { useVoiceLevelSmoother } from "./_new/useVoiceLevelSmoother.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import { kr, Lr, VOICE_LEVEL_BARS, _r } from "../components/TextInput.js";
import { isXtermJs } from "../ink/terminal.js";
import { Jnn, hueToRgb } from "../components/Spinner/utils.js";

/**
 * 录音时按最近音量计算电平条字符与颜色（随时间变色，静音时灰色）；减少动画或未录音时返回 null。
 */
//@ chunk-7p2hc4jn.js:51058-51533 placement
function useVoiceLevelIndicator() {
  let e = useAppState((K) => isReducedMotion(K.settings.prefersReducedMotion)),
    r = useVoiceLevelSmoother(),
    n = useAppState_2((K) => K.voiceState) === "recording",
    s = useAppState_2((K) => K.voiceAudioLevels),
    o = n && !e,
    [u, d] = useAnimationFrame(o ? 50 : null);
  if (!o) return [u, null];
  let h = s.at(-1) ?? 0,
    min = Math.min(h * kr, 1),
    T = r.next(min, Lr),
    max = Math.max(1, Math.min(Math.round(T * (VOICE_LEVEL_BARS.length - 1)), VOICE_LEVEL_BARS.length - 1)),
    A = h < _r,
    F = ((d / 1000) * 90) % 360,
    se = isXtermJs() ? Jnn(F) : F,
    { r: Z, g: ee, b: fe } = A ? { r: 128, g: 128, b: 128 } : hueToRgb(se),
    H = `#${((Z << 16) | (ee << 8) | fe).toString(16).padStart(6, "0")}`;
  return [u, { char: VOICE_LEVEL_BARS[max], hex: H }];
}

export { useVoiceLevelIndicator };
