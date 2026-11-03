/**
 * commands/voice/index.ts
 *
 * /voice 命令对象（[hold|tap|off]，仅 claude-ai）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/voice/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { Vvt } from "../../voice/voiceModeEnabled.js";

/**
 * /voice 命令对象（local）；描述：Toggle voice mode；availability ["claude-ai"]；isHidden: {return!Vvt()}；实现 chunk-vrdyygyr.js 的 D。
 */
//@ chunk-e6aww6q8.js:1733174-1733401 fingerprint = voice (0.775)
var voiceCommandDefinition = {
    type: "local",
    name: "voice",
    description: "Toggle voice mode",
    argumentHint: "[hold|tap|off]",
    availability: ["claude-ai"],
    get isHidden() {
      return !Vvt();
    },
    supportsNonInteractive: !1,
    load: () => import("./chunk-vrdyygyr.js"),
  },
  voiceCommand = voiceCommandDefinition;

export { voiceCommand };
