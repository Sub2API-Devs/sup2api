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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { useVoiceLevelIndicator } from "../../hooks/useVoiceAudioLevels.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { isXtermJs } from "../../ink/terminal.js";
import { roundToStep, toRGBColor, parseRGB } from "../Spinner/utils.js";

//@ chunk-tzghj6zv.js:20376-20429 placement
function selectVoiceMode(M) {
  return M.settings.voice?.mode ?? "hold";
}
//@ chunk-tzghj6zv.js:20429-20484 placement = SETTLED_GREY (1)
var VOICE_DIM_COLOR = {
  r: 153,
  g: 153,
  b: 153,
};
var VOICE_ACTIVE_COLOR = {
  r: 185,
  g: 185,
  b: 185,
};
var VOICE_BAR_COUNT = 2;
//@ chunk-tzghj6zv.js:20484-20928 placement
/**
 * 语音状态指示：录音中显示 REC（点按模式附"tap to send"）或"listening…"，处理中显示微光动画，空闲不显示。
 */
function VoiceStateIndicator(props) {
  let C = w(3);
  let { voiceState } = props;
  let appState = useAppState(selectVoiceMode);
  switch (voiceState) {
    case "recording": {
      if (appState === "tap") {
        let A;
        if (C[0] === MEMO_CACHE_SENTINEL) {
          A = jsxProd_default_2(Text, {
            children: [
              jsxProd_default_2(Text, {
                color: "error",
                children: [BLACK_CIRCLE, " REC"],
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 tap to send",
              }),
            ],
          });
          C[0] = A;
        } else A = C[0];
        return A;
      }
      let A;
      if (C[1] === MEMO_CACHE_SENTINEL) {
        A = jsxProd_default(Text, {
          dimColor: true,
          children: "listening\u2026",
        });
        C[1] = A;
      } else A = C[1];
      return A;
    }
    case "processing": {
      let A;
      if (C[2] === MEMO_CACHE_SENTINEL) {
        A = jsxProd_default(ProcessingShimmer, {});
        C[2] = A;
      } else A = C[2];
      return A;
    }
    case "idle": {
      return null;
    }
  }
}
//@ chunk-tzghj6zv.js:20928-21058 placement
/**
 * 语音输入的音量字符图标（按当前电平着色）。
 */
function VoiceLevelGlyph() {
  let h = w(2);
  let [, d] = useVoiceLevelIndicator();
  let x;
  if (h[0] !== d) {
    x = d
      ? jsxProd_default(Text, {
          color: d.hex,
          children: d.char,
        })
      : null;
    h[0] = d;
    h[1] = x;
  } else x = h[1];
  return x;
}
//@ chunk-tzghj6zv.js:21058-21177 placement
/**
 * 按住说话时显示的"keep holding…"提示。
 */
function KeepHoldingHint() {
  let d = w(1);
  let h;
  if (d[0] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(Text, {
      dimColor: true,
      children: "keep holding\u2026",
    });
    d[0] = h;
  } else h = d[0];
  return h;
}
//@ chunk-tzghj6zv.js:21177-21690 fingerprint = ProcessingShimmer (0.589)
function ProcessingShimmer() {
  let $ = w(8);
  let settings = useSettingsState();
  let reducedMotion = isReducedMotion(settings.prefersReducedMotion);
  let [ref, time] = useAnimationFrame(reducedMotion ? null : 50);
  if (reducedMotion) {
    let t0;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t0 = jsxProd_default(Text, {
        color: "warning",
        children: "Voice: processing\u2026",
      });
      $[0] = t0;
    } else t0 = $[0];
    return t0;
  }
  let elapsedSec = time / 1000;
  let opacity = (Math.sin((elapsedSec * Math.PI * 2) / VOICE_BAR_COUNT) + 1) / 2;
  let t0;
  if ($[1] !== opacity) {
    let V = isXtermJs() ? roundToStep(opacity) : opacity;
    t0 = toRGBColor(parseRGB(VOICE_DIM_COLOR, VOICE_ACTIVE_COLOR, V));
    $[1] = opacity;
    $[2] = t0;
  } else t0 = $[2];
  let color = t0;
  let children;
  if ($[3] !== color) {
    children = jsxProd_default(Text, {
      color,
      children: "Voice: processing\u2026",
    });
    $[3] = color;
    $[4] = children;
  } else children = $[4];
  let t2;
  if ($[5] !== ref || $[6] !== children) {
    t2 = jsxProd_default(Box, {
      ref,
      children,
    });
    $[5] = ref;
    $[6] = children;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
//@ chunk-18hwfzwa.js:787748-787830 fingerprint = VoiceIndicatorImpl (0.678)
function VoiceIndicatorImpl(t0) {
  return t0.voiceState === "recording" || t0.voiceState === "processing";
}
export { VoiceIndicatorImpl, VoiceStateIndicator, KeepHoldingHint, VoiceLevelGlyph };
