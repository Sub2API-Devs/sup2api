/**
 * commands/voice/index.ts
 *
 * /voice 命令对象（[hold|tap|off]，仅 claude-ai）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/voice/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
import { isVoiceModeAvailable } from "../../voice/voiceModeEnabled.js";

//@ chunk-5xgkngpb.js:1808626-1808853 fingerprint (2.1.88 match: voice, 0.775)
/**
 * /voice 命令对象（local）；描述：Toggle voice mode；availability ["claude-ai"]；isHidden: {return!Vvt()}；实现 chunk-vrdyygyr.js 的 D。
 */
var voiceCommandDefinition = {
  type: "local",
  name: "voice",
  description: "Toggle voice mode",
  argumentHint: "[hold|tap|off]",
  availability: ["claude-ai"],
  get isHidden() {
    return !isVoiceModeAvailable();
  },
  supportsNonInteractive: false,
  load: () => import("./voice.js"),
};
var voiceCommand = voiceCommandDefinition;
export { voiceCommand };
