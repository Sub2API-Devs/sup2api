/**
 * components/PromptInput/VoiceIndicator.tsx
 *
 * 语音输入状态指示（录音中/处理中微光）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/VoiceIndicator.tsx
 * pieces: chunk-18rrbwq1.js (6), chunk-czq1j3j2.js (1)
 * attribution: placement 5, fingerprint 2
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { useVoiceLevelIndicator } from "../../hooks/useVoiceAudioLevels.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { isXtermJs } from "../../ink/terminal.js";
import { roundToStep, toRGBColor, interpolateColor } from "../Spinner/utils.js";

//@ chunk-18rrbwq1.js:20387-20440 placement
function selectVoiceMode(state) {
  return state.settings.voice?.mode ?? "hold";
}
//@ chunk-18rrbwq1.js:20440-20495 placement (2.1.88 match: SETTLED_GREY, 1)
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
//@ chunk-18rrbwq1.js:20495-20939 placement
/**
 * 语音状态指示：录音中显示 REC（点按模式附"tap to send"）或"listening…"，处理中显示微光动画，空闲不显示。
 */
function VoiceStateIndicator(props) {
  let $ = useMemoCache(3);
  let { voiceState } = props;
  let appState = useAppState(selectVoiceMode);
  switch (voiceState) {
    case "recording": {
      if (appState === "tap") {
        let recordingText;
        if ($[0] === MEMO_CACHE_SENTINEL) {
          recordingText = jsxProd_default_2(Text, {
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
          $[0] = recordingText;
        } else recordingText = $[0];
        return recordingText;
      }
      let listeningText;
      if ($[1] === MEMO_CACHE_SENTINEL) {
        listeningText = jsxProd_default(Text, {
          dimColor: true,
          children: "listening\u2026",
        });
        $[1] = listeningText;
      } else listeningText = $[1];
      return listeningText;
    }
    case "processing": {
      let children;
      if ($[2] === MEMO_CACHE_SENTINEL) {
        children = jsxProd_default(ProcessingShimmer, {});
        $[2] = children;
      } else children = $[2];
      return children;
    }
    case "idle": {
      return null;
    }
  }
}
//@ chunk-18rrbwq1.js:20939-21069 placement
/**
 * 语音输入的音量字符图标（按当前电平着色）。
 */
function VoiceLevelGlyph() {
  let $ = useMemoCache(2);
  let [, level] = useVoiceLevelIndicator();
  let glyphElement;
  if ($[0] !== level) {
    glyphElement = level
      ? jsxProd_default(Text, {
          color: level.hex,
          children: level.char,
        })
      : null;
    $[0] = level;
    $[1] = glyphElement;
  } else glyphElement = $[1];
  return glyphElement;
}
//@ chunk-18rrbwq1.js:21069-21188 placement
/**
 * 按住说话时显示的"keep holding…"提示。
 */
function KeepHoldingHint() {
  let $ = useMemoCache(1);
  let hintElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    hintElement = jsxProd_default(Text, {
      dimColor: true,
      children: "keep holding\u2026",
    });
    $[0] = hintElement;
  } else hintElement = $[0];
  return hintElement;
}
//@ chunk-18rrbwq1.js:21188-21701 fingerprint (2.1.88 match: ProcessingShimmer, 0.589)
function ProcessingShimmer() {
  let $ = useMemoCache(8);
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
    let reducedMotion = isXtermJs() ? roundToStep(opacity) : opacity;
    t0 = toRGBColor(interpolateColor(VOICE_DIM_COLOR, VOICE_ACTIVE_COLOR, reducedMotion));
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
//@ chunk-czq1j3j2.js:820367-820449 fingerprint (2.1.88 match: VoiceIndicatorImpl, 0.679)
function VoiceIndicatorImpl(t0) {
  return t0.voiceState === "recording" || t0.voiceState === "processing";
}
export { KeepHoldingHint, VoiceStateIndicator, VoiceLevelGlyph, VoiceIndicatorImpl };
