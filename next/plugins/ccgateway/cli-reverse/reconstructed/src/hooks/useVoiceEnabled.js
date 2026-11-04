/**
 * hooks/useVoiceEnabled.ts
 *
 * 语音输入是否可用的判断 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVoiceEnabled.ts
 * pieces: chunk-s61vbvea.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-s61vbvea.js:460861-460923 fingerprint = useVoiceEnabled (0.591)
function useVoiceEnabled(settings) {
  return (settings.voice?.enabled ?? settings.voiceEnabled) === true;
}
export { useVoiceEnabled };
