/**
 * hooks/_new/useVoiceLevelSmoother.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yj65zw1g.js (1)
 * attribution: sole-consumer-new 1
 */
import { useVoiceStore } from "../../context/voice.js";

/**
 * 音量电平平滑器。
 */
//@ chunk-yj65zw1g.js:1015-1055 sole-consumer-new
function useVoiceLevelSmoother() {
  return useVoiceStore().levelSmoother;
}

export { useVoiceLevelSmoother };
