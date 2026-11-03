/**
 * components/PromptInput/VoiceIndicator.tsx
 *
 * 语音输入状态指示（录音中/处理中微光）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/VoiceIndicator.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-tzghj6zv.js (6)
 * attribution: fingerprint 2, placement 5
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { useVoiceLevelIndicator } from "../../hooks/useVoiceAudioLevels.js";
import { qd } from "../../hooks/useSettings.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { isXtermJs } from "../../ink/terminal.js";
import { roundToStep, toRGBColor, parseRGB } from "../Spinner/utils.js";

//@ chunk-tzghj6zv.js:20376-20429 placement
function si(M) {
  return M.settings.voice?.mode ?? "hold";
}
//@ chunk-tzghj6zv.js:20429-20484 placement = SETTLED_GREY (1)
var Sn = { r: 153, g: 153, b: 153 },
  wn = { r: 185, g: 185, b: 185 },
  Cn = 2;
/**
 * 语音状态指示：录音中显示 REC（点按模式附"tap to send"）或"listening…"，处理中显示微光动画，空闲不显示。
 */
//@ chunk-tzghj6zv.js:20484-20928 placement
function VoiceStateIndicator(d) {
  let C = w(3),
    { voiceState: voiceState } = d,
    x = useAppState(si);
  switch (voiceState) {
    case "recording": {
      if (x === "tap") {
        let A;
        if (C[0] === MEMO_CACHE_SENTINEL)
          ((A = r(Text, {
            children: [
              r(Text, { color: "error", children: [BLACK_CIRCLE, " REC"] }),
              e(Text, { dimColor: !0, children: " \xB7 tap to send" }),
            ],
          })),
            (C[0] = A));
        else A = C[0];
        return A;
      }
      let A;
      if (C[1] === MEMO_CACHE_SENTINEL)
        ((A = e(Text, { dimColor: !0, children: "listening\u2026" })), (C[1] = A));
      else A = C[1];
      return A;
    }
    case "processing": {
      let A;
      if (C[2] === MEMO_CACHE_SENTINEL) ((A = e(ProcessingShimmer, {})), (C[2] = A));
      else A = C[2];
      return A;
    }
    case "idle": {
      return null;
    }
  }
}
/**
 * 语音输入的音量字符图标（按当前电平着色）。
 */
//@ chunk-tzghj6zv.js:20928-21058 placement
function VoiceLevelGlyph() {
  let h = w(2),
    [, d] = useVoiceLevelIndicator(),
    x;
  if (h[0] !== d) ((x = d ? e(Text, { color: d.hex, children: d.char }) : null), (h[0] = d), (h[1] = x));
  else x = h[1];
  return x;
}
/**
 * 按住说话时显示的"keep holding…"提示。
 */
//@ chunk-tzghj6zv.js:21058-21177 placement
function KeepHoldingHint() {
  let d = w(1),
    h;
  if (d[0] === MEMO_CACHE_SENTINEL)
    ((h = e(Text, { dimColor: !0, children: "keep holding\u2026" })), (d[0] = h));
  else h = d[0];
  return h;
}
//@ chunk-tzghj6zv.js:21177-21690 fingerprint = ProcessingShimmer (0.589)
function ProcessingShimmer() {
  let $ = w(8),
    settings = qd(),
    h = isReducedMotion(settings.prefersReducedMotion),
    [x, C] = useAnimationFrame(h ? null : 50);
  if (h) {
    let M;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((M = e(Text, { color: "warning", children: "Voice: processing\u2026" })), ($[0] = M));
    else M = $[0];
    return M;
  }
  let O = C / 1000,
    I = (Math.sin((O * Math.PI * 2) / Cn) + 1) / 2,
    M;
  if ($[1] !== I) {
    let V = isXtermJs() ? roundToStep(I) : I;
    M = toRGBColor(parseRGB(Sn, wn, V));
    (($[1] = I), ($[2] = M));
  } else M = $[2];
  let color = M,
    N;
  if ($[3] !== color)
    ((N = e(Text, { color: color, children: "Voice: processing\u2026" })), ($[3] = color), ($[4] = N));
  else N = $[4];
  let B;
  if ($[5] !== x || $[6] !== N) ((B = e(Box, { ref: x, children: N })), ($[5] = x), ($[6] = N), ($[7] = B));
  else B = $[7];
  return B;
}
//@ chunk-18hwfzwa.js:787748-787830 fingerprint = VoiceIndicatorImpl (0.678)
function VoiceIndicatorImpl(t0) {
  return t0.voiceState === "recording" || t0.voiceState === "processing";
}

export { VoiceIndicatorImpl, VoiceStateIndicator, KeepHoldingHint, VoiceLevelGlyph };
