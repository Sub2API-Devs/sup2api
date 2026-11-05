/**
 * hooks/useVoiceEnabled.ts
 *
 * 语音输入是否可用的判断 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVoiceEnabled.ts
 * pieces: chunk-7jxyna5q.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-7jxyna5q.js:378287-378349 fingerprint (2.1.88 match: useVoiceEnabled, 0.591)
function useVoiceEnabled(settings) {
  return (settings.voice?.enabled ?? settings.voiceEnabled) === true;
}
export { useVoiceEnabled };
